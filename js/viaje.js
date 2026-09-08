/*
 * Viajar en el tiempo: grabar una ejecución y poder ir para atrás.
 *
 * El depurador paso a paso ya deja ver una foto del programa, pero de a una
 * y siempre hacia adelante: si la variable cambió hace tres vueltas del ciclo,
 * hay que volver a ejecutar todo y prestar más atención. Acá el programa corre
 * entero de una (tarda milisegundos) y se guarda una foto de cada paso; después
 * se arrastra una barra y se ven las fotos en cualquier orden, para adelante y
 * para atrás, como una película.
 *
 * Qué se guarda en cada paso:
 *
 *   · la línea que estaba por ejecutarse;
 *   · todas las variables vivas, copiadas (no apuntadas: el intérprete
 *     modifica las suyas, así que una foto que apunte a las de él no es una
 *     foto, es un espejo);
 *   · en qué punto de la lista de acciones de pantalla estaba.
 *
 * Lo de la pantalla es lo que hace posible rebobinar lo que se ve. En vez de
 * guardar una imagen por paso —carísimo—, se anota cada cosa que el programa
 * le pidió a la pantalla o al lienzo (imprimir esto, pintar este píxel) en una
 * lista. Para mostrar el paso N se vuelve a hacer la lista desde el principio
 * hasta donde llegaba N. Es instantáneo y ocupa nada.
 *
 * Hay dos topes, y los dos son a propósito:
 *
 *   · MAX_PASOS: un ciclo infinito grabaría hasta que se acabe la memoria.
 *     Al llegar al tope se corta y se avisa; lo grabado igual sirve, y de
 *     hecho es justo lo que hay que mirar cuando un ciclo no termina.
 *   · MAX_ELEM: de un vector de diez mil elementos se copian los primeros y
 *     se anota cuántos faltan. Nadie revisa diez mil casillas en una barra.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-viaje.js)
 *   Viaje.crearGrabadora(opts) -> { hook, alRetornar, envolverIO, cerrar, grabacion }
 *   Viaje.opsHasta(grabacion, i)      -> las acciones de pantalla hasta el paso i
 *   Viaje.cambios(grabacion, i)       -> qué variables cambiaron respecto del paso anterior
 *   Viaje.resumen(grabacion)          -> una línea de texto para mostrar
 */
(function (global) {
  'use strict';

  const MAX_PASOS = 4000;    // más que esto ya no es una película, es una condena
  const MAX_ELEM = 120;      // casillas de un vector que entran en la foto
  const MAX_HONDO = 3;       // hasta dónde se copia un dato adentro de otro

  /* Lo que el programa le pide a la pantalla y al lienzo. Todo lo que está
     acá se anota para poder rehacerlo; lo que no está (getCurpos, eof) solo
     lee, así que no hace falta. */
  const ACCIONES = ['imprimir', 'limpiar', 'setColor', 'setCurpos',
                    'pixel', 'linea', 'rect', 'circulo', 'limpiarLienzo'];

  /* --------------------------------------------------------------------
   * La foto de un valor
   * ------------------------------------------------------------------ */
  /* Una copia de verdad, no una referencia. Si esto devolviera el mismo
     vector que tiene el intérprete, todas las fotos mostrarían el estado
     final: es el error clásico de cualquier grabador de estos. */
  function copiar(v, hondo, maxElem) {
    hondo = hondo || 0;
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'number' || t === 'boolean' || t === 'string') return v;
    if (hondo >= MAX_HONDO) return '…';

    if (Array.isArray(v)) {
      const n = Math.min(v.length, maxElem);
      const copia = [];
      for (let i = 0; i < n; i++) copia.push(copiar(v[i], hondo + 1, maxElem));
      if (v.length > n) copia.mas = v.length - n;
      return copia;
    }
    /* Un objeto de ESLE2 POO: la clase, el número y los campos. */
    if (v && v.clase && v.campos) {
      const campos = {};
      for (const k of Object.keys(v.campos)) campos[k] = copiar(v.campos[k], hondo + 1, maxElem);
      return { clase: v.clase, id: v.id, campos };
    }
    /* Un registro. */
    if (v && v.c) {
      const c = {};
      for (const k of Object.keys(v.c)) c[k] = copiar(v.c[k], hondo + 1, maxElem);
      return { c };
    }
    return v;
  }

  /* Dos fotos de un valor, ¿son la misma? Se compara el texto porque son
     datos chicos y planos, y porque una comparación campo por campo acá
     costaría más código que valor. */
  const igual = (a, b) => {
    try { return JSON.stringify(a) === JSON.stringify(b); }
    catch (e) { return a === b; }
  };

  /* Las variables vivas ahora, en el mismo orden que las muestra el
     depurador: primero la subrutina donde está parado, después el programa. */
  function foto(interp, maxElem) {
    const ambitos = [];
    const marco = interp.pila && interp.pila.length ? interp.pila[interp.pila.length - 1] : null;
    const uno = (titulo, celdas) => {
      const vars = [];
      if (celdas) {
        for (const [nombre, celda] of celdas) {
          /* Las constantes del lenguaje (TRUE, FALSE, SI, NO) están en todos
             los ámbitos y no cambian nunca: mostrarlas es ruido. */
          if (celda.konst && ['TRUE', 'FALSE', 'SI', 'NO'].includes(nombre)) continue;
          vars.push({ nombre, valor: copiar(celda.v, 0, maxElem) });
        }
      }
      ambitos.push({ titulo, vars });
    };
    if (marco) uno(marco.nombreSub || 'subrutina', marco);
    uno('programa', interp.globales);
    return ambitos;
  }

  /* --------------------------------------------------------------------
   * La grabadora
   * ------------------------------------------------------------------ */
  function crearGrabadora(opciones) {
    const o = opciones || {};
    const maxPasos = o.maxPasos || MAX_PASOS;
    const maxElem = o.maxElem || MAX_ELEM;
    const control = o.control || null;

    const pasos = [];
    const ops = [];
    let motivo = null;         // por qué terminó: null = terminó solo
    let cortada = false;
    let ultimaLinea = 0;

    /* Envuelve el objeto io del IDE: deja pasar todo tal cual y de paso anota
       lo que se puede rehacer. No cambia ningún comportamiento, así que el
       programa grabado hace exactamente lo mismo que el ejecutado. */
    function envolverIO(base) {
      const io = Object.create(null);
      for (const k of Object.keys(base)) {
        const v = base[k];
        io[k] = typeof v === 'function' ? v.bind(base) : v;
      }
      for (const nombre of ACCIONES) {
        if (typeof base[nombre] !== 'function') continue;
        const original = base[nombre].bind(base);
        io[nombre] = function () {
          const args = Array.prototype.slice.call(arguments);
          ops.push({ op: nombre, args });
          return original.apply(null, args);
        };
      }
      /* Grabar es correr el programa entero de una: nada puede quedarse
         esperando. Los sonidos y las teclas se saltean, y se anota que se
         saltearon para poder decirlo. */
      if (typeof base.beep === 'function') io.beep = async () => { ops.push({ op: 'beep', args: [] }); };
      if (typeof base.leerTecla === 'function') {
        io.leerTecla = async () => { motivo = motivo || 'teclas'; return 0; };
      }
      return io;
    }

    /* Lo que el intérprete llama antes de cada sentencia. */
    async function hook(linea, interp) {
      if (cortada) return;
      if (pasos.length >= maxPasos) {
        cortada = true;
        motivo = 'tope';
        if (control && control.detener) control.detener();
        return;
      }
      ultimaLinea = linea;
      pasos.push({ linea, ambitos: foto(interp, maxElem), ops: ops.length });
    }

    /* Las fotos se sacan ANTES de cada sentencia, así que el efecto de la
       última sentencia de cada bloque no quedaría en ninguna. Por eso hay dos
       fotos más: una cuando una subrutina está por soltar su marco, y otra al
       terminar el programa. Sin ellas la película termina un instante antes
       del final —y el final es justo lo que uno fue a mirar—. */
    async function alRetornar(interp) {
      if (cortada || pasos.length >= maxPasos) return;
      pasos.push({ linea: ultimaLinea, ambitos: foto(interp, maxElem), ops: ops.length, retorno: true });
    }

    /* Se llama al terminar, con el error si lo hubo y con el intérprete si
       llegó a terminar (cuando hay error no hay intérprete que mirar). */
    function cerrar(error, interp) {
      if (error && !cortada) motivo = 'error';
      if (interp && !cortada && pasos.length < maxPasos) {
        pasos.push({ linea: ultimaLinea, ambitos: foto(interp, maxElem), ops: ops.length, fin: true });
      }
      return grabacion(error);
    }

    function grabacion(error) {
      return {
        pasos, ops,
        motivo,
        error: error ? (error.message || String(error)) : null,
        lineaError: error && error.linea ? error.linea : 0,
        cortada,
        maxPasos, maxElem
      };
    }

    return { hook, alRetornar, envolverIO, cerrar, get pasos() { return pasos; },
             get ops() { return ops; }, grabacion: () => grabacion(null) };
  }

  /* --------------------------------------------------------------------
   * Leer una grabación
   * ------------------------------------------------------------------ */

  /* Las acciones de pantalla que ya habían pasado cuando el programa estaba
     en el paso i. Rehaciéndolas desde cero se reconstruye lo que se veía. */
  function opsHasta(g, i) {
    if (!g || !g.pasos.length) return [];
    if (i >= g.pasos.length) return g.ops.slice();     // el final: todo
    const hasta = g.pasos[Math.max(0, i)].ops;
    return g.ops.slice(0, hasta);
  }

  /* Qué cambió entre el paso i-1 y el i. Es lo que hace que se entienda: no
     alcanza con ver los valores, hay que ver cuál se movió. */
  function cambios(g, i) {
    const salida = [];
    if (!g || i <= 0 || i >= g.pasos.length) return salida;
    const antes = g.pasos[i - 1].ambitos;
    const ahora = g.pasos[i].ambitos;
    for (const amb of ahora) {
      const previo = antes.find(a => a.titulo === amb.titulo);
      for (const v of amb.vars) {
        const p = previo && previo.vars.find(x => x.nombre === v.nombre);
        if (!p) salida.push({ ambito: amb.titulo, nombre: v.nombre, nueva: true });
        else if (!igual(p.valor, v.valor)) salida.push({ ambito: amb.titulo, nombre: v.nombre, nueva: false });
      }
    }
    return salida;
  }

  /* En qué pasos se movió una variable. Sirve para el «llevame a la próxima
     vez que cambia esto», que es la pregunta que uno se hace de verdad. */
  function pasosDondeCambia(g, nombre) {
    const salida = [];
    for (let i = 1; i < g.pasos.length; i++) {
      if (cambios(g, i).some(c => c.nombre === nombre)) salida.push(i);
    }
    return salida;
  }

  function resumen(g) {
    if (!g || !g.pasos.length) return 'no se grabó ningún paso';
    const n = g.pasos.length;
    let t = n + (n === 1 ? ' paso grabado' : ' pasos grabados');
    if (g.motivo === 'tope') {
      t += ` — se cortó en el tope de ${g.maxPasos}: puede que el programa no termine`;
    } else if (g.motivo === 'error') {
      t += ' — el programa cortó con un error' + (g.lineaError ? ' en la línea ' + g.lineaError : '');
    } else if (g.motivo === 'teclas') {
      t += ' — el programa espera teclas: durante la grabación se contestó con «nada»';
    }
    return t;
  }

  global.Viaje = {
    crearGrabadora, opsHasta, cambios, pasosDondeCambia, resumen,
    copiar, foto, igual, MAX_PASOS, MAX_ELEM, ACCIONES
  };
})(typeof window !== 'undefined' ? window : globalThis);

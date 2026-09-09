/*
 * Quién está usando esta máquina.
 *
 * Todo lo del alumno —el avance, lo que escribió en cada ejercicio, la racha,
 * sus ejercicios propios— vive en el navegador. En una máquina de casa está
 * perfecto. En el laboratorio de la facultad, tres alumnos usan el mismo
 * Chrome el mismo día: el segundo abre ESLE2 y ve la racha, los ejercicios y
 * el código del primero.
 *
 * No es solo confuso. Desde que se puede entregar una guía, es peor: si Ana
 * entrega desde la máquina donde antes trabajó Beto, se lleva el código de
 * Beto con su nombre encima.
 *
 * Esto no son cuentas ni contraseñas —no hay servidor, y una contraseña que
 * no protege nada enseña mal—. Es un cajón por persona: al cambiar de alumno
 * se guarda lo del que estaba y se saca lo del que viene.
 *
 * Lo que NO se cambia son las preferencias de la máquina: el tema, los
 * colores, la disposición de los paneles, el servidor de señas. Esas son del
 * aula, no de la persona, y hacer que cada alumno vuelva a acomodar los
 * paneles sería castigar al que comparte máquina.
 *
 * API (sin DOM: lo prueba test/test-perfil.js)
 *   Perfil.crear({ almacen, galletas }) -> {
 *     listar(), actual(), cambiar(nombre), crear(nombre), borrar(nombre),
 *     guardar(), hayDatos(), tamano(nombre)
 *   }
 *   Perfil.esDelAlumno(clave)   Perfil.limpiarNombre(texto)
 */
(function (global) {
  'use strict';

  const REGISTRO = 'esle2_perfiles';          // { actual, nombres: [] }
  const PREFIJO_DATOS = 'esle2_perfil_';      // + nombre
  const LARGO_MAX = 40;

  /* Las que se quedan en la máquina pase quien pase. Todo lo demás que
     empiece con «esle2» es del alumno: si mañana alguien agrega una clave y
     se olvida de esta lista, lo peor que pasa es que una preferencia se
     reinicie al cambiar de alumno. Al revés —que el código de uno quede en la
     sesión de otro— sería mucho peor. */
  const DE_LA_MAQUINA = new Set([
    'esle2_tema', 'esle2_diseno', 'esle2_senas', 'esle2_sonido',
    'esle2_presentacion', 'esle2_enfoque',
    'esle2_disposicion', 'esle2bd_disposicion', 'esle2vis_disposicion',
    'esle2_ajustar', 'esle2bd_ajustar', 'esle2poo_ajustar', 'esle2vis_ajustar',
    'esle2_flexible', 'esle2bd_flexible', 'esle2poo_flexible', 'esle2vis_flexible',
    'esle2_explorador', 'esle2poo_explorador', 'esle2vis_explorador',
    'esle2_voz', 'esle2_voz_bd', 'esle2_voz_poo', 'esle2_voz_vis'
  ]);

  /* Las cookies del avance de los tres cursos. Se nombran acá y no se leen de
     ProgresoESLE2 para que esto se pueda probar sin cargar aquel archivo. */
  const COOKIES = ['esle2_progreso', 'esle2_progreso_poo', 'esle2_progreso_vis'];

  function esDelAlumno(clave) {
    if (typeof clave !== 'string' || !clave.startsWith('esle2')) return false;
    if (clave === REGISTRO || clave.startsWith(PREFIJO_DATOS)) return false;
    return !DE_LA_MAQUINA.has(clave);
  }

  /* El nombre es una etiqueta para que el alumno se reconozca, no un usuario:
     se guarda como lo escribió y se compara sin acentos ni mayúsculas, para
     que «Ana» y «ana» no terminen siendo dos cajones distintos. */
  function limpiarNombre(texto) {
    return String(texto || '').replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX);
  }
  const comparable = t => limpiarNombre(t).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase();

  function crear(cfg) {
    const almacen = cfg.almacen;
    const galletas = cfg.galletas || { leer: () => '', grabar: () => {} };

    const leerRegistro = () => {
      try {
        const r = JSON.parse(almacen.leer(REGISTRO) || 'null');
        if (r && Array.isArray(r.nombres)) return r;
      } catch (e) { /* registro roto: se empieza de nuevo */ }
      return { actual: null, nombres: [] };
    };
    const grabarRegistro = r => almacen.escribir(REGISTRO, JSON.stringify(r));
    const ranura = nombre => PREFIJO_DATOS + comparable(nombre);

    /* ------------------------------ mover ---------------------------- */

    /* Todo lo del alumno que hay ahora en el navegador. */
    function tomar() {
      const claves = {};
      for (const k of almacen.claves()) {
        if (esDelAlumno(k)) claves[k] = almacen.leer(k);
      }
      const cookies = {};
      for (const c of COOKIES) cookies[c] = galletas.leer(c);
      return { claves, cookies, guardado: new Date().toISOString() };
    }

    /* Saca lo del alumno que estaba y pone lo del que viene. Primero borra:
       si no, lo que el anterior tenía y este no queda dando vueltas, que es
       justo el problema que esto viene a resolver. */
    function poner(datos) {
      for (const k of almacen.claves()) if (esDelAlumno(k)) almacen.borrar(k);
      for (const c of COOKIES) galletas.grabar(c, '');
      if (!datos) return;
      for (const k of Object.keys(datos.claves || {})) {
        if (esDelAlumno(k)) almacen.escribir(k, datos.claves[k]);
      }
      for (const c of COOKIES) {
        if (datos.cookies && datos.cookies[c]) galletas.grabar(c, datos.cookies[c]);
      }
    }

    const leerDatos = nombre => {
      try { return JSON.parse(almacen.leer(ranura(nombre)) || 'null'); }
      catch (e) { return null; }
    };

    /* ------------------------------ público -------------------------- */

    function guardar() {
      const r = leerRegistro();
      if (!r.actual) return false;
      almacen.escribir(ranura(r.actual), JSON.stringify(tomar()));
      return true;
    }

    function crearPerfil(nombre) {
      const limpio = limpiarNombre(nombre);
      if (!limpio) throw new Error('el perfil necesita un nombre');
      const r = leerRegistro();
      if (r.nombres.some(n => comparable(n) === comparable(limpio))) {
        throw new Error('ya hay un perfil que se llama así');
      }
      guardar();                       // lo del que estaba, a su cajón
      r.nombres.push(limpio);
      r.actual = limpio;
      grabarRegistro(r);
      /* El primero se queda con lo que ya había en la máquina: si no, el
         alumno que venía usando ESLE2 solo perdería todo al crear su perfil. */
      if (r.nombres.length > 1) poner(null);
      almacen.escribir(ranura(limpio), JSON.stringify(tomar()));
      return limpio;
    }

    function cambiar(nombre) {
      const r = leerRegistro();
      const destino = r.nombres.find(n => comparable(n) === comparable(nombre));
      if (!destino) throw new Error('no hay ningún perfil que se llame así');
      if (r.actual && comparable(r.actual) === comparable(destino)) return destino;
      guardar();
      poner(leerDatos(destino));
      r.actual = destino;
      grabarRegistro(r);
      return destino;
    }

    function borrar(nombre) {
      const r = leerRegistro();
      const cual = r.nombres.find(n => comparable(n) === comparable(nombre));
      if (!cual) throw new Error('no hay ningún perfil que se llame así');
      almacen.borrar(ranura(cual));
      r.nombres = r.nombres.filter(n => n !== cual);
      if (r.actual && comparable(r.actual) === comparable(cual)) {
        r.actual = null;
        poner(null);                   // y la máquina queda limpia
      }
      grabarRegistro(r);
      return r.nombres;
    }

    /* Si hay trabajo de alguien en el navegador sin ningún perfil abierto:
       es lo que hace falta saber para ofrecer «¿este trabajo es tuyo?». */
    function hayDatos() {
      return almacen.claves().some(k => esDelAlumno(k) && (almacen.leer(k) || '').length)
        || COOKIES.some(c => (galletas.leer(c) || '').length > 2);
    }

    /* Cuánto ocupa un perfil guardado, en caracteres. La cuota del navegador
       es de unos 5 MB para todo el sitio: con treinta alumnos en una máquina
       esto importa, y es mejor poder decirlo que fallar en silencio. */
    function tamano(nombre) {
      return (almacen.leer(ranura(nombre)) || '').length;
    }

    return {
      listar: () => leerRegistro().nombres.slice(),
      actual: () => leerRegistro().actual,
      crear: crearPerfil,
      cambiar, borrar, guardar, hayDatos, tamano
    };
  }

  global.Perfil = { crear, esDelAlumno, limpiarNombre, DE_LA_MAQUINA, COOKIES, REGISTRO };
})(typeof window !== 'undefined' ? window : globalThis);

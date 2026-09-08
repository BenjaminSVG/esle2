/*
 * Historial de versiones del programa: control de versiones, en chiquito.
 *
 * La idea es la de siempre —guardar el estado del código cada tanto para poder
 * volver— pero sin nada que instalar ni entender: el navegador va anotando
 * versiones solo, y desde el diálogo se ve qué cambió entre dos de ellas y se
 * puede volver a cualquiera.
 *
 * Se guarda una versión:
 *   · a mano, con «Guardar versión», poniéndole un nombre;
 *   · después de una ejecución que terminó bien;
 *   · cuando se resuelve un ejercicio;
 *   · **antes** de que algo pise el editor: abrir un archivo, cargar un
 *     ejemplo, empezar un ejercicio, «Nuevo» o restaurar otra versión. Ese es
 *     justamente el momento en que se pierde el trabajo, y el que hace que
 *     restaurar sea siempre reversible: nunca se pierde nada.
 *
 * Dos versiones seguidas con el mismo código no se guardan dos veces, así que
 * ejecutar diez veces sin tocar nada deja una sola entrada.
 *
 * La comparación es un diff por líneas con la subsecuencia común más larga, el
 * mismo algoritmo que usan las herramientas de verdad, escrito en veinte
 * líneas porque los programas de un curso son chicos.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-historial.js)
 *   Historial.agregar(lista, version)  -> lista nueva (o la misma si repite)
 *   Historial.diff(a, b)               -> [{ t: 'igual'|'mas'|'menos', … }]
 *   Historial.resumen(diff)            -> { mas, menos }
 *   Historial.cargar(clave) / Historial.guardar(clave, lista)
 */
(function (global) {
  'use strict';

  const MAX = 40;             // cuántas versiones se conservan
  const MAX_BYTES = 400000;   // y cuánto ocupan como mucho, todas juntas

  const TIPOS = {
    manual: 'guardada a mano',
    ejecucion: 'después de ejecutar',
    ejercicio: 'ejercicio resuelto',
    previa: 'antes de reemplazar el código',
    restauracion: 'antes de restaurar'
  };

  const lineas = t => String(t == null ? '' : t).replace(/\r/g, '').split('\n');

  /* ------------------------------ alta ------------------------------- */
  function agregar(lista, v) {
    const previas = Array.isArray(lista) ? lista : [];
    const codigo = String(v.codigo == null ? '' : v.codigo);
    /* Si el código es idéntico al de la última versión, no hay nada nuevo que
       recordar: se guardaría una fila que no aporta y empuja a las viejas. */
    if (previas.length && previas[0].codigo === codigo) return previas;

    const nueva = {
      id: String(v.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 7))),
      ts: v.ts || Date.now(),
      tipo: TIPOS[v.tipo] ? v.tipo : 'manual',
      mensaje: String(v.mensaje || '').slice(0, 80),
      codigo,
      entrada: String(v.entrada == null ? '' : v.entrada)
    };
    return podar([nueva].concat(previas));
  }

  /* Se tiran las más viejas, pero las guardadas a mano aguantan más: son las
     que el alumno eligió recordar. */
  function podar(lista, max, maxBytes) {
    max = max || MAX;
    maxBytes = maxBytes || MAX_BYTES;
    let out = lista.slice();
    const sobra = () => out.length > max ||
      out.reduce((s, v) => s + v.codigo.length + v.entrada.length + 120, 0) > maxBytes;

    while (sobra() && out.length > 1) {
      let i = -1;
      for (let k = out.length - 1; k > 0; k--) if (out[k].tipo !== 'manual') { i = k; break; }
      if (i < 0) i = out.length - 1;          // ya no quedan automáticas: cae la más vieja
      out.splice(i, 1);
    }
    return out;
  }

  /* ----------------------------- el diff ----------------------------- */
  /* Subsecuencia común más larga por líneas. */
  function diff(textoA, textoB) {
    const a = lineas(textoA), b = lineas(textoB);
    const n = a.length, m = b.length;
    const tabla = [];
    for (let i = 0; i <= n; i++) tabla.push(new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        tabla[i][j] = a[i] === b[j] ? tabla[i + 1][j + 1] + 1
                                    : Math.max(tabla[i + 1][j], tabla[i][j + 1]);

    const salida = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { salida.push({ t: 'igual', texto: a[i], a: i + 1, b: j + 1 }); i++; j++; }
      else if (tabla[i + 1][j] >= tabla[i][j + 1]) { salida.push({ t: 'menos', texto: a[i], a: i + 1, b: null }); i++; }
      else { salida.push({ t: 'mas', texto: b[j], a: null, b: j + 1 }); j++; }
    }
    while (i < n) { salida.push({ t: 'menos', texto: a[i], a: i + 1, b: null }); i++; }
    while (j < m) { salida.push({ t: 'mas', texto: b[j], a: null, b: j + 1 }); j++; }
    return salida;
  }

  function resumen(d) {
    return {
      mas: d.filter(x => x.t === 'mas').length,
      menos: d.filter(x => x.t === 'menos').length
    };
  }

  /* Solo los trozos que cambiaron, con unas pocas líneas de contexto: un
     programa de cien líneas con un cambio no se lee entero. */
  function recortar(d, contexto) {
    const c = contexto === undefined ? 3 : contexto;
    const util = new Array(d.length).fill(false);
    d.forEach((x, i) => {
      if (x.t === 'igual') return;
      for (let k = Math.max(0, i - c); k <= Math.min(d.length - 1, i + c); k++) util[k] = true;
    });
    const out = [];
    let saltando = false;
    d.forEach((x, i) => {
      if (util[i]) { out.push(x); saltando = false; }
      else if (!saltando) { out.push({ t: 'salto', texto: '…', a: null, b: null }); saltando = true; }
    });
    return out;
  }

  /* --------------------------- guardado ------------------------------ */
  function cargar(clave) {
    try {
      const x = JSON.parse(global.localStorage.getItem(clave) || '[]');
      if (!Array.isArray(x)) return [];
      return x.filter(v => v && typeof v.codigo === 'string')
              .map(v => Object.assign({ ts: 0, tipo: 'manual', mensaje: '', entrada: '' }, v));
    } catch (e) { return []; }
  }

  function guardar(clave, lista) {
    try { global.localStorage.setItem(clave, JSON.stringify(lista)); return true; }
    catch (e) { return false; }
  }

  function fecha(ts) {
    const d = new Date(ts);
    if (isNaN(d)) return '';
    const dos = n => String(n).padStart(2, '0');
    return `${dos(d.getDate())}/${dos(d.getMonth() + 1)} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
  }

  global.Historial = { agregar, podar, diff, resumen, recortar, cargar, guardar, fecha, TIPOS, MAX };
})(typeof window !== 'undefined' ? window : globalThis);

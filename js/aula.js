/*
 * Modo aula: una guía de ejercicios repartida por enlace.
 *
 * Un profesor elige qué ejercicios entran —del curso, o de los suyos con sus
 * propios casos de prueba—, les pone un título y un mensaje, y copia un
 * enlace. Quien lo abre entra al IDE con esa guía y nada más: la lista son
 * esos ejercicios, y cada uno se corrige solo, como siempre.
 *
 * La guía entera viaja adentro del enlace, después del «#». Eso quiere decir
 * que no hay servidor, no hay cuentas, no hay nada que se caiga el día del
 * parcial, y que la guía nunca sale del navegador de nadie: el fragmento de
 * una URL no se manda al servidor. Es la misma idea que ya usa Compartir para
 * un programa, con dos cosas más:
 *
 *   · los ejercicios del curso viajan como su id y no enteros, así que una
 *     guía de diez ejercicios del curso son unos pocos caracteres;
 *   · el texto va comprimido con gzip antes de codificarlo, que es lo que
 *     mantiene corto el enlace cuando el profesor escribe sus propias
 *     consignas. Si el navegador no tiene CompressionStream, se manda sin
 *     comprimir: el primer carácter dice cuál de las dos cosas es.
 *
 * Los ejercicios propios del profesor reciben un id derivado de la guía
 * («a<guía>-1»), para que el avance de una guía no se pise con el de otra ni
 * con el de los ejercicios que el alumno haya creado por su cuenta.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-aula.js)
 *   Aula.codificar(guia)            -> Promise<texto para el enlace>
 *   Aula.decodificar(texto)         -> Promise<guia | null>
 *   Aula.enlace(guia, base)         -> Promise<url>
 *   Aula.leerUrl(hash)              -> Promise<guia | null>
 *   Aula.resolver(guia, catalogo)   -> { ejercicios, faltan }
 *   Aula.problemas(guia)            -> [mensaje, …]
 *   Aula.desdeEjercicios(nombre, mensaje, lenguaje, elegidos, propios)
 */
(function (global) {
  'use strict';

  const VERSION = 1;
  const CAMPOS = ['id', 'nivel', 'titulo', 'enunciado', 'pista', 'plantilla', 'pruebas'];

  /* base64 "url-safe": sin +, / ni = para que el enlace no se rompa al pegarlo.
     Es el mismo par de funciones que usa js/compartir.js. */
  const aBase64 = bytes => {
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const deBase64 = s => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(bin, c => c.charCodeAt(0));
  };

  async function pasar(bytes, Clase, formato) {
    const flujo = new Clase(formato);
    const escritor = flujo.writable.getWriter();
    escritor.write(bytes);
    escritor.close();
    const partes = [];
    const lector = flujo.readable.getReader();
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      partes.push(value);
    }
    const total = partes.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let i = 0;
    for (const p of partes) { out.set(p, i); i += p.length; }
    return out;
  }

  /* Un número corto y estable a partir del contenido de la guía: es lo que
     hace que dos guías distintas no compartan los ids de sus ejercicios. */
  function huella(texto) {
    let h = 5381;
    for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* ------------------------------------------------------------------ */
  /* Armar y leer                                                        */
  /* ------------------------------------------------------------------ */

  /* Los ejercicios del curso entran como su id; los propios, enteros. */
  function desdeEjercicios(nombre, mensaje, lenguaje, elegidos, delCurso) {
    const delCursoIds = new Set((delCurso || []).map(e => e.id));
    return {
      v: VERSION,
      l: lenguaje || 'SLE2',
      n: String(nombre || '').trim(),
      m: String(mensaje || '').trim(),
      e: (elegidos || []).map(e => (delCursoIds.has(e.id) ? e.id : limpiar(e)))
    };
  }

  const limpiar = e => {
    const o = {};
    for (const c of CAMPOS) if (e[c] !== undefined) o[c] = e[c];
    o.pruebas = (e.pruebas || []).map(p => ({ entrada: String(p.entrada || ''), salida: String(p.salida || '') }));
    return o;
  };

  async function codificar(guia) {
    const bytes = new TextEncoder().encode(JSON.stringify(guia));
    if (typeof CompressionStream === 'function') {
      try { return 'z' + aBase64(await pasar(bytes, CompressionStream, 'gzip')); }
      catch (e) { /* sin compresión, entonces */ }
    }
    return 'p' + aBase64(bytes);
  }

  async function decodificar(texto) {
    if (typeof texto !== 'string' || texto.length < 2) return null;
    try {
      const bytes = deBase64(texto.slice(1));
      const crudo = texto[0] === 'z'
        ? await pasar(bytes, DecompressionStream, 'gzip')
        : bytes;
      const guia = JSON.parse(new TextDecoder().decode(crudo));
      return valida(guia) ? guia : null;
    } catch (e) { return null; }
  }

  function valida(g) {
    return !!g && typeof g === 'object' && g.v === VERSION
      && typeof g.n === 'string' && Array.isArray(g.e);
  }

  async function enlace(guia, base) {
    const raiz = base || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
    return raiz + '#aula=' + await codificar(guia);
  }

  async function leerUrl(hash) {
    const h = hash === undefined && typeof location !== 'undefined' ? location.hash : (hash || '');
    const m = /[#&]aula=([A-Za-z0-9\-_]+)/.exec(h);
    return m ? await decodificar(m[1]) : null;
  }

  /* ------------------------------------------------------------------ */
  /* Usarla                                                              */
  /* ------------------------------------------------------------------ */

  /* Devuelve los ejercicios de la guía ya listos para el curso, y cuáles no
     se pudieron encontrar. «faltan» no es un detalle: si el curso cambió y un
     id ya no está, es mejor decirlo que mostrar una guía a la que le falta la
     mitad sin avisar. */
  function resolver(guia, catalogo) {
    const marca = huella(JSON.stringify(guia.e) + guia.n);
    const porId = new Map((catalogo || []).map(e => [e.id, e]));
    const ejercicios = [];
    const faltan = [];
    let propio = 0;

    for (const entrada of guia.e) {
      if (typeof entrada === 'string') {
        const e = porId.get(entrada);
        if (e) ejercicios.push(e); else faltan.push(entrada);
        continue;
      }
      propio++;
      ejercicios.push(Object.assign(limpiar(entrada), {
        id: 'a' + marca + '-' + propio,
        nivel: entrada.nivel || 'facil',
        deLaGuia: true
      }));
    }
    return { ejercicios, faltan };
  }

  /* Lo que impediría repartir la guía, dicho antes de copiar el enlace. */
  function problemas(guia) {
    const malos = [];
    if (!guia.n) malos.push('la guía no tiene título');
    if (!guia.e.length) malos.push('la guía no tiene ningún ejercicio');
    guia.e.forEach((e, i) => {
      if (typeof e === 'string') return;
      const donde = 'el ejercicio ' + (i + 1) + (e.titulo ? ' («' + e.titulo + '»)' : '');
      if (!e.titulo) malos.push(donde + ' no tiene título');
      if (!e.enunciado) malos.push(donde + ' no tiene consigna');
      if (!e.pruebas || !e.pruebas.length) malos.push(donde + ' no tiene ningún caso de prueba');
    });
    return malos;
  }

  global.Aula = {
    codificar, decodificar, enlace, leerUrl, resolver, problemas,
    desdeEjercicios, huella, VERSION
  };
})(typeof window !== 'undefined' ? window : globalThis);

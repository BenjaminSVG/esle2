/*
 * Progreso portable: exportar e importar el avance de los dos cursos.
 *
 * El progreso vive en cookies de este navegador, así que se pierde al cambiar
 * de máquina o al limpiar los datos del sitio. Este módulo lo empaqueta en un
 * archivo .json que se puede guardar y volver a cargar en cualquier otro lado.
 */
(function (global) {
  'use strict';

  const COOKIES = {
    sle2: 'esle2_progreso',
    poo: 'esle2_progreso_poo',
    vis: 'esle2_progreso_vis',
    bd: 'esle2_progreso_bd'
  };
  const CURSOS = Object.keys(COOKIES);

  const leerCookie = n => {
    const p = document.cookie.split('; ').find(c => c.startsWith(n + '='));
    return p ? decodeURIComponent(p.slice(n.length + 1)) : '';
  };
  const grabarCookie = (n, v) => {
    document.cookie = `${n}=${encodeURIComponent(v)}; expires=${new Date(Date.now() + 365 * 864e5).toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  };
  const leerJSON = n => { try { return JSON.parse(leerCookie(n) || '{}'); } catch (e) { return {}; } };

  /* Los tres cursos, aunque se exporte desde una sola de las páginas. */
  function exportar() {
    const cursos = {};
    for (const c of CURSOS) cursos[c] = leerJSON(COOKIES[c]);
    return {
      formato: 'esle2-progreso',
      version: 1,
      fecha: new Date().toISOString().slice(0, 10),
      cursos
    };
  }

  function descargar() {
    const texto = JSON.stringify(exportar(), null, 2);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
    a.download = 'esle2-progreso.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /* Une lo que trae el archivo con lo que ya había: importar nunca borra. */
  function importar(texto) {
    let d;
    try { d = JSON.parse(texto); } catch (e) { throw new Error('el archivo no es un JSON válido'); }
    if (!d || d.formato !== 'esle2-progreso' || !d.cursos)
      throw new Error('no parece un archivo de progreso de ESLE2');

    /* Un archivo viejo trae solo dos cursos: los que falten quedan en cero. */
    const sumados = {};
    for (const c of CURSOS) sumados[c] = 0;
    for (const clave of CURSOS) {
      const nuevos = d.cursos[clave];
      if (!nuevos || typeof nuevos !== 'object') continue;
      const actual = leerJSON(COOKIES[clave]);
      for (const id of Object.keys(nuevos)) {
        if (!nuevos[id] || actual[id]) continue;
        actual[id] = true;
        sumados[clave]++;
      }
      grabarCookie(COOKIES[clave], JSON.stringify(actual));
    }
    return sumados;
  }

  global.ProgresoESLE2 = { exportar, descargar, importar, leerJSON, COOKIES, CURSOS };
})(window);

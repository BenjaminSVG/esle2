/*
 * Prueba de escritorio: el programa seguido a mano, en una tabla.
 *
 * Es el ejercicio clásico de la materia: se hace una tabla con una columna
 * por variable y una fila por sentencia ejecutada, y se va anotando qué vale
 * cada cosa después de cada paso. Sirve para entender por qué un programa
 * hace lo que hace sin tener que imaginarse la memoria entera.
 *
 * La grabación la hace el simulador de memoria (js/memoria.js), que ya corre
 * el programa parándose antes de cada sentencia. Acá se convierte esa tira de
 * fotos en la tabla que se dibuja en el pizarrón:
 *
 *   · una columna por variable, en el orden en que el programa las va usando
 *     —no alfabético: interesa el orden en que aparecen—;
 *   · una fila por paso, con el número de línea y el código de esa línea;
 *   · en cada celda, el valor SOLO cuando cambió. Una tabla con todos los
 *     valores repetidos en todas las filas es ilegible, y lo que se quiere
 *     ver es justamente dónde cambia cada cosa;
 *   · una columna final con lo que el programa imprimió en ese paso.
 *
 * Las variables locales de una subrutina llevan el nombre de la subrutina
 * adelante, porque dos subrutinas distintas pueden tener una «i» cada una y
 * mezclarlas en la misma columna sería mentira.
 *
 * Todo esto es cálculo puro sobre las fotos, sin tocar el DOM, así que
 * test/test-escritorio.js lo prueba en Node.
 *
 * API:
 *   Escritorio.tabla(fotos, { codigo })  -> { columnas, filas, pasos, cortada }
 *   Escritorio.aCSV(tabla)               -> texto separado por comas
 *   Escritorio.aMarkdown(tabla)          -> tabla de Markdown
 *   Escritorio.aTexto(tabla)             -> tabla en monoespaciado
 */
(function (global) {
  'use strict';

  /* Las constantes lógicas que el intérprete crea solo no son del programa. */
  const OCULTAS = new Set(['TRUE', 'FALSE', 'SI', 'NO']);

  /* El identificador lleva el nombre de la subrutina y no solo la posición
     del marco: dos llamadas seguidas a subrutinas distintas ocupan el mismo
     lugar en la pila, y sin el nombre la «i» de una y la «i» de la otra
     caerían en la misma columna. Con el nombre, dos llamadas a la MISMA
     subrutina sí comparten columna, que es lo que uno hace a mano. */
  const idDe = (marco, celda) =>
    marco.id + '|' + String(marco.titulo || '') + '::' + celda.nombre;

  /* «n» si es global; «sumar.i» si es local, para no mezclar la i de una
     subrutina con la de otra. */
  function nombreVisible(marco, celda) {
    if (marco.zona !== 'pila') return celda.nombre;
    const sub = String(marco.titulo || '').replace(/\s*\(\s*\)\s*$/, '').trim();
    return (sub ? sub + '.' : '') + celda.nombre;
  }

  function tabla(fotos, opciones) {
    const o = opciones || {};
    const lineas = typeof o.codigo === 'string'
      ? o.codigo.replace(/\r/g, '').split('\n') : (o.codigo || []);
    const codigoDe = n => (n > 0 && n <= lineas.length ? String(lineas[n - 1]).trim() : '');

    const columnas = [];
    const porId = new Map();
    const filas = [];
    let previos = new Map();          // id -> valor mostrado en la foto anterior

    for (const foto of fotos || []) {
      const ahora = new Map();
      for (const marco of foto.marcos || []) {
        for (const celda of marco.celdas || []) {
          if (OCULTAS.has(celda.nombre)) continue;
          const id = idDe(marco, celda);
          if (!porId.has(id)) {
            const col = { id, nombre: nombreVisible(marco, celda), ambito: marco.zona === 'pila' ? 'local' : 'global' };
            porId.set(id, col);
            columnas.push(col);
          }
          ahora.set(id, celda.valor);
        }
      }

      /* Solo lo que cambió respecto del paso anterior. Una variable que nace
         cuenta como cambio: su primer valor es información. */
      const valores = {};
      let cambios = 0;
      for (const [id, v] of ahora) {
        if (!previos.has(id) || previos.get(id) !== v) { valores[id] = v; cambios++; }
      }
      /* Y lo que dejó de existir se dice, porque en la prueba de escritorio a
         mano uno tacha la columna cuando la subrutina termina. */
      const liberadas = [];
      for (const id of previos.keys()) if (!ahora.has(id)) liberadas.push(id);

      filas.push({
        paso: foto.paso,
        linea: foto.linea || 0,
        codigo: codigoDe(foto.linea),
        valores,
        liberadas,
        cambios,
        salida: foto.impreso || '',
        fin: !!foto.fin
      });
      previos = ahora;
    }

    return { columnas, filas, pasos: filas.length, cortada: !!o.cortada };
  }

  /* ------------------------- exportaciones --------------------------- */
  const celda = (fila, col) => (
    Object.prototype.hasOwnProperty.call(fila.valores, col.id) ? String(fila.valores[col.id])
      : fila.liberadas.indexOf(col.id) >= 0 ? '—' : ''
  );

  const cabeceras = t => ['Paso', 'Línea', 'Sentencia']
    .concat(t.columnas.map(c => c.nombre)).concat(['Salida']);

  const filaDe = (t, f) => [String(f.paso + 1), f.linea ? String(f.linea) : '', f.fin ? '(fin)' : f.codigo]
    .concat(t.columnas.map(c => celda(f, c)))
    .concat([f.salida.replace(/\n/g, '\\n')]);

  function aCSV(t) {
    const esc = v => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    return [cabeceras(t)].concat(t.filas.map(f => filaDe(t, f)))
      .map(fila => fila.map(esc).join(',')).join('\n') + '\n';
  }

  function aMarkdown(t) {
    const esc = v => v.replace(/\|/g, '\\|');
    const cab = cabeceras(t);
    const filas = t.filas.map(f => filaDe(t, f));
    return ['| ' + cab.map(esc).join(' | ') + ' |',
      '| ' + cab.map(() => '---').join(' | ') + ' |']
      .concat(filas.map(f => '| ' + f.map(esc).join(' | ') + ' |')).join('\n') + '\n';
  }

  function aTexto(t) {
    const cab = cabeceras(t);
    const filas = [cab].concat(t.filas.map(f => filaDe(t, f)));
    const anchos = cab.map((_, i) => Math.max(...filas.map(f => (f[i] || '').length)));
    const linea = f => f.map((v, i) => String(v || '').padEnd(anchos[i])).join('  ').replace(/\s+$/, '');
    return [linea(cab), anchos.map(a => '-'.repeat(a)).join('  ')]
      .concat(filas.slice(1).map(linea)).join('\n') + '\n';
  }

  global.Escritorio = { tabla, aCSV, aMarkdown, aTexto };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Diagrama entidad-relación de la base.
 *
 * Dibuja lo que hay: una caja por tabla con sus columnas, la clave primaria
 * marcada, y una línea de cada clave foránea a la tabla a la que apunta, con
 * la patita de gallo del lado donde puede haber muchas filas.
 *
 * Es el dibujo que se pide en cualquier trabajo práctico de bases de datos, y
 * acá sale solo: no hay que volver a escribir en una herramienta aparte lo que
 * ya está escrito en el programa.
 *
 * El acomodado es a propósito simple —por capas, según quién apunta a quién—
 * porque un diagrama de una materia tiene cinco tablas, no cincuenta, y un
 * algoritmo de fuerzas daría un dibujo distinto cada vez que se abre, que es
 * justo lo que no se quiere cuando hay que entregarlo dos veces.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-diagrama-bd.js)
 *   DiagramaBD.generar(tablas) -> { svg, ancho, alto, cajas, lineas, texto }
 *   DiagramaBD.capas(tablas)   -> [[nombre, …], …]
 *
 * «tablas» es lo que devuelve SQL.tablas(base).
 */
(function (global) {
  'use strict';

  /* Medidas, en píxeles del SVG. */
  const FILA = 21;          // alto de una columna dentro de la caja
  const CABEZA = 27;        // alto de la barra con el nombre de la tabla
  const CHAR = 6.6;         // ancho aproximado de un carácter a 12px
  const MIN = 132;
  const HUECO_X = 66;       // aire entre dos cajas de la misma capa
  const HUECO_Y = 54;       // aire entre capas
  const MARGEN = 16;

  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const r = n => Math.round(n * 10) / 10;

  /* Cómo se lee una columna en la caja: la clave primaria con su llave, la
     foránea con su flecha, y el tipo a la derecha. */
  function etiqueta(c) {
    const marca = c.pk ? '🔑 ' : c.refiere ? '↗ ' : '';
    return marca + c.nombre;
  }

  function anchoCaja(t) {
    const largos = t.columnas.map(c => (etiqueta(c).length + String(c.tipo || '').length + 4) * CHAR);
    return Math.max(MIN, String(t.nombre).length * CHAR + 30, ...largos) + 18;
  }

  /* A qué tabla apunta cada columna, si la tabla existe en el dibujo. */
  function relaciones(tablas) {
    const hay = new Set(tablas.map(t => t.nombre.toLowerCase()));
    const out = [];
    for (const t of tablas)
      for (const c of t.columnas) {
        if (!c.refiere || !hay.has(c.refiere.tabla.toLowerCase())) continue;
        out.push({ desde: t.nombre, columna: c.nombre, hasta: c.refiere.tabla, hastaColumna: c.refiere.columna });
      }
    return out;
  }

  /* Capas: primero las tablas que no apuntan a nadie, después las que solo
     apuntan a las de más arriba, y así. Es el orden en que hay que crearlas,
     así que el dibujo cuenta también en qué orden se escribe el código. */
  function capas(tablas) {
    const rel = relaciones(tablas);
    const pendientes = tablas.map(t => t.nombre);
    const puestas = new Set();
    const salida = [];
    while (pendientes.length) {
      const capa = pendientes.filter(n => rel
        .filter(x => x.desde === n && x.hasta !== n)
        .every(x => puestas.has(x.hasta.toLowerCase())));
      /* Si quedó un ciclo (A apunta a B y B a A) no se puede ordenar: se
         ponen todas juntas en una capa antes que quedarse en el lugar. */
      const esta = capa.length ? capa : pendientes.slice();
      esta.forEach(n => { puestas.add(n.toLowerCase()); });
      salida.push(esta);
      for (const n of esta) pendientes.splice(pendientes.indexOf(n), 1);
    }
    return salida;
  }

  function acomodar(tablas) {
    const porNombre = new Map(tablas.map(t => [t.nombre.toLowerCase(), t]));
    const cajas = [];
    let y = MARGEN;
    let anchoTotal = 0;

    for (const capa of capas(tablas)) {
      const enCapa = capa.map(n => porNombre.get(n.toLowerCase()));
      const anchos = enCapa.map(anchoCaja);
      const total = anchos.reduce((a, b) => a + b, 0) + HUECO_X * (enCapa.length - 1);
      let x = MARGEN;
      let alto = 0;
      enCapa.forEach((t, i) => {
        const h = CABEZA + FILA * t.columnas.length + 6;
        cajas.push({ tabla: t, x, y, w: anchos[i], h });
        x += anchos[i] + HUECO_X;
        alto = Math.max(alto, h);
      });
      anchoTotal = Math.max(anchoTotal, total);
      y += alto + HUECO_Y;
    }
    return { cajas, ancho: anchoTotal + MARGEN * 2, alto: y - HUECO_Y + MARGEN };
  }

  /* El camino de una relación: sale del borde de la caja que referencia y
     entra por el borde de la referida, con un tramo horizontal en el medio
     para que dos líneas no se pisen. */
  function camino(a, b) {
    const salida = { x: a.x + a.w / 2, y: a.y };
    const entrada = { x: b.x + b.w / 2, y: b.y + b.h };
    if (a.y > b.y) {
      const medio = r((salida.y + entrada.y) / 2);
      return `M ${r(salida.x)} ${r(salida.y)} V ${medio} H ${r(entrada.x)} V ${r(entrada.y)}`;
    }
    /* La referida está debajo o al lado: se rodea por la izquierda. */
    const izq = r(Math.min(a.x, b.x) - 26);
    return `M ${r(a.x)} ${r(a.y + a.h / 2)} H ${izq} V ${r(b.y + b.h / 2)} H ${r(b.x)}`;
  }

  function generar(tablas) {
    const lista = (tablas || []).slice();
    if (!lista.length) {
      return {
        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="60" viewBox="0 0 320 60" '
          + 'role="img" aria-label="La base está vacía">'
          + '<text x="10" y="34" class="db-vacia" font-size="13">La base no tiene ninguna tabla todavía.</text></svg>',
        ancho: 320, alto: 60, cajas: [], lineas: [], texto: 'La base no tiene ninguna tabla todavía.\n'
      };
    }

    const { cajas, ancho, alto } = acomodar(lista);
    const porNombre = new Map(cajas.map(c => [c.tabla.nombre.toLowerCase(), c]));
    const lineas = relaciones(lista).map(x => ({
      ...x, d: camino(porNombre.get(x.desde.toLowerCase()), porNombre.get(x.hasta.toLowerCase()))
    }));

    const p = [];
    p.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" `
      + `viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Diagrama de la base de datos">`);
    p.push('<style>'
      + '.db-caja{fill:#fff;stroke:#3a6b8f;stroke-width:1.2}'
      + '.db-cabeza{fill:#3a6b8f}'
      + '.db-titulo{fill:#fff;font:600 12.5px "Source Sans 3",system-ui,sans-serif}'
      + '.db-col{fill:#1a1d22;font:12px "IBM Plex Mono",ui-monospace,monospace}'
      + '.db-tipo{fill:#5d6672;font:11px "IBM Plex Mono",ui-monospace,monospace}'
      + '.db-linea{fill:none;stroke:#b4763a;stroke-width:1.4}'
      + '.db-punta{fill:#b4763a}'
      + '.db-raya{stroke:#c9d2dc;stroke-width:1}'
      + '.db-vacia{fill:#5d6672;font:13px "Source Sans 3",system-ui,sans-serif}'
      + '</style>');

    /* Las líneas van primero: así las cajas quedan encima y tapan el tramo
       que entra, en vez de verse cruzada la caja. */
    for (const l of lineas) {
      p.push(`<path class="db-linea" d="${l.d}"><title>${esc(l.desde + '.' + l.columna
        + ' → ' + l.hasta + '.' + l.hastaColumna)}</title></path>`);
    }

    for (const c of cajas) {
      const t = c.tabla;
      p.push(`<g><rect class="db-caja" x="${r(c.x)}" y="${r(c.y)}" width="${r(c.w)}" height="${r(c.h)}" rx="5"/>`);
      p.push(`<path class="db-cabeza" d="M ${r(c.x)} ${r(c.y + 5)} a 5 5 0 0 1 5 -5 h ${r(c.w - 10)} `
        + `a 5 5 0 0 1 5 5 v ${r(CABEZA - 5)} h ${r(-c.w)} Z"/>`);
      p.push(`<text class="db-titulo" x="${r(c.x + 10)}" y="${r(c.y + 18)}">${esc(t.nombre)}</text>`);
      t.columnas.forEach((col, i) => {
        const yy = c.y + CABEZA + FILA * i + 15;
        if (i) p.push(`<line class="db-raya" x1="${r(c.x + 1)}" y1="${r(yy - 15)}" x2="${r(c.x + c.w - 1)}" y2="${r(yy - 15)}"/>`);
        p.push(`<text class="db-col" x="${r(c.x + 9)}" y="${r(yy)}">${esc(etiqueta(col))}</text>`);
        p.push(`<text class="db-tipo" x="${r(c.x + c.w - 9)}" y="${r(yy)}" text-anchor="end">${esc(col.tipo || '')}</text>`);
      });
      p.push('</g>');
    }
    p.push('</svg>');

    return { svg: p.join(''), ancho, alto, cajas, lineas, texto: enPalabras(lista) };
  }

  /* Lo mismo contado en palabras, que es lo que se copia al informe. */
  function enPalabras(tablas) {
    const out = [];
    for (const t of tablas) {
      out.push(t.nombre + ' (' + t.filas + ' fila(s))');
      for (const c of t.columnas) {
        const notas = [];
        if (c.pk) notas.push('clave primaria');
        if (c.unico && !c.pk) notas.push('no se repite');
        if (c.noNulo && !c.pk) notas.push('no admite NULL');
        if (c.porDefecto !== null && c.porDefecto !== undefined) notas.push('por defecto ' + c.porDefecto);
        if (c.refiere) notas.push('apunta a ' + c.refiere.tabla + '.' + c.refiere.columna);
        out.push('   ' + c.nombre + ' : ' + (c.tipo || '') + (notas.length ? '   (' + notas.join(', ') + ')' : ''));
      }
      out.push('');
    }
    const rel = relaciones(tablas);
    if (rel.length) {
      out.push('Relaciones:');
      for (const x of rel)
        out.push('   cada ' + x.desde + ' señala un ' + x.hasta
          + ' (' + x.desde + '.' + x.columna + ' → ' + x.hasta + '.' + x.hastaColumna + ')');
      out.push('');
    }
    return out.join('\n');
  }

  global.DiagramaBD = { generar, capas, relaciones, enPalabras };
})(typeof window !== 'undefined' ? window : globalThis);

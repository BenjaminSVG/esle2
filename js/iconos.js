/*
 * Los iconos de la interfaz.
 *
 * El set se diseñó primero como lámina de referencia —24 iconos monolínea,
 * trazo de 2, extremos redondeados, todos sobre una grilla de 24×24— y acá
 * está dibujado en SVG siguiendo esa lámina. Van como SVG y no como imágenes
 * por tres razones: se ven nítidos en cualquier tamaño y pantalla, toman el
 * color del texto del botón (así funcionan igual en tema claro y oscuro sin
 * duplicar nada), y todo el set pesa menos que un solo PNG.
 *
 * Cada botón dice qué icono quiere con data-ic="nombre"; este módulo se los
 * pone al cargar la página. Si un nombre no existe, el botón queda con su
 * texto y nada se rompe.
 *
 * API:  Iconos.pintar(raiz)   ·   Iconos.svg(nombre)   ·   Iconos.NOMBRES
 */
(function (global) {
  'use strict';

  /* Trazos de cada icono, sobre la caja 0 0 24 24. */
  const D = {
    /* ---------------------------- ejecución --------------------------- */
    ejecutar: '<path d="M8 5.2 19 12 8 18.8Z"/>',
    revisar: '<path d="M9 4H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/>' +
             '<rect x="9" y="2.5" width="6" height="3.5" rx="1"/>' +
             '<path d="m8.6 13.4 2.4 2.4 4.4-4.8"/>',
    detener: '<rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" stroke="none"/>',
    ventana: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17"/>' +
             '<circle cx="6.4" cy="6.8" r=".9" fill="currentColor" stroke="none"/>' +
             '<rect x="6.5" y="12" width="6" height="4" rx="1"/>',
    paso: '<path d="M4 17c.6-5.2 4.3-8.4 9.4-8.4"/><path d="m10.6 5.4 3.4 3.2-3.4 3"/>' +
          '<circle cx="17.6" cy="16.4" r="1.8" fill="currentColor" stroke="none"/>',
    continuar: '<path d="m6 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/>',
    depurar: '<path d="M12 8.5a5 5 0 0 1 5 5v1.5a5 5 0 0 1-10 0V13.5a5 5 0 0 1 5-5Z"/>' +
             '<path d="M12 9v10"/><path d="m9.4 6.6-1.6-2.2"/><path d="m14.6 6.6 1.6-2.2"/>' +
             '<path d="M7 12H4"/><path d="M20 12h-3"/><path d="m7.4 18-2.2 1.6"/><path d="m16.6 18 2.2 1.6"/>',

    /* ----------------------------- archivo ---------------------------- */
    nuevo: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M13 3l6 6v3"/>' +
           '<path d="M13 3v6h6"/><path d="M17 15v6"/><path d="M14 18h6"/>',
    abrir: '<path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h4.2l1.8 2H15a1.5 1.5 0 0 1 1.5 1.5V12"/>' +
           '<path d="M3 8.5V18a1.5 1.5 0 0 0 1.5 1.5h13.1a1.5 1.5 0 0 0 1.44-1.07l1.8-6A1.5 1.5 0 0 0 19.4 10.5H8.2a1.5 1.5 0 0 0-1.44 1.07L4.8 18"/>',
    guardar: '<path d="M5 5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z"/>' +
             '<path d="M8 3h7v5H8Z"/><path d="M13 4.5v2"/><path d="M8 21v-6h8v6"/>',
    compartir: '<circle cx="17.5" cy="6" r="2.6"/><circle cx="6.5" cy="12" r="2.6"/>' +
               '<circle cx="17.5" cy="18" r="2.6"/><path d="m8.9 10.8 6.3-3.5"/><path d="m8.9 13.2 6.3 3.5"/>',
    archivos: '<path d="M9 3h5l4 4v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/>' +
              '<path d="M14 3v4h4"/><path d="M14 21H7a2 2 0 0 1-2-2V7"/>' +
              '<path d="M10 11h4"/><path d="M10 14h4"/>',
    ejemplos: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5Z"/>' +
              '<path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5Z"/>',

    /* --------------------------- herramientas ------------------------- */
    traducir: '<path d="m8 8-4 4 4 4"/><path d="m16 8 4 4-4 4"/><path d="M10.6 12h2.8"/>',
    diagrama: '<path d="m12 3 3 3-3 3-3-3Z"/><rect x="3" y="16" width="6" height="5" rx="1"/>' +
              '<rect x="15" y="16" width="6" height="5" rx="1"/>' +
              '<path d="M9.6 7.6 6 11v5"/><path d="M14.4 7.6 18 11v5"/>',
    memoria: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><rect x="10" y="10" width="4" height="4" rx="1"/>' +
             '<path d="M10 4v3"/><path d="M14 4v3"/><path d="M10 17v3"/><path d="M14 17v3"/>' +
             '<path d="M4 10h3"/><path d="M4 14h3"/><path d="M17 10h3"/><path d="M17 14h3"/>',
    historial: '<path d="M4.2 12a7.8 7.8 0 1 1 2.4 5.6"/><path d="M4 7.5V12h4.5"/>' +
               '<path d="M12 8v4.4l3 1.8"/>',
    paneles: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M12 4.5v15"/><path d="M12 12h8.5"/>',
    /* Dos renglones enteros y un tercero que se dobla y vuelve: eso es
       ajustar el texto. */
    /* Los tres discos apilados de siempre: una base de datos. */
    base: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/>' +
          '<path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/>' +
          '<path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    /* El diagrama con un lápiz: dibujar el programa en vez de escribirlo. */
    'editar-diagrama': '<rect x="8.5" y="2.8" width="7" height="4.4" rx="1"/>' +
      '<path d="M12 7.2v3.3"/><path d="M5.5 10.5h13"/><path d="M5.5 10.5v2.6"/><path d="M18.5 10.5v2.6"/>' +
      '<rect x="2.5" y="13.1" width="6" height="4.2" rx="1"/>' +
      '<path d="m14.6 20.4 5.2-5.2 1.8 1.8-5.2 5.2-2.3.5Z"/>',
    /* Una tabla: cabecera y tres filas, que es la prueba de escritorio. */
    escritorio: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17"/>' +
                '<path d="M3.5 14h17"/><path d="M9.5 9v10.5"/>',
    /* Una regla doblada: el mismo programa medido con la vara blanda. */
    flexible: '<path d="M4 8.5c3.6 0 3.6 7 7.2 7s3.6-7 7.2-7"/><path d="M4 5v14"/>' +
              '<path d="M20 5v14"/>',
    ajustar: '<path d="M4 6h16"/><path d="M4 12h13a3 3 0 0 1 0 6h-4"/>' +
             '<path d="m15.4 15.6-2.2 2.4 2.2 2.4"/><path d="M4 18h4"/>',
    argumentos: '<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 8.5h18"/>' +
                '<path d="m7.5 12.5 2.2 2.2-2.2 2.2"/><path d="M12.5 16.9h4"/>',
    limpiar: '<path d="M4 20 9 9"/><path d="m9.5 6.5 5.6 2.6a3 3 0 0 1 1.5 4l-.6 1.3-8.6-4 .6-1.3a3 3 0 0 1 1.5-2.6Z"/>' +
             '<path d="M15.5 4.5 18 6"/><path d="M19 9.5 17 11"/><path d="M20.5 14h-2.5"/>',

    /* ------------------------------ barra ----------------------------- */
    buscar: '<circle cx="11" cy="11" r="6.5"/><path d="m15.8 15.8 4.2 4.2"/>',
    instalar: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7"/>' +
              '<path d="m8.8 11 3.2 3.2 3.2-3.2"/><path d="M10.5 18.5h3"/>',
    proyectar: '<path d="M4 4.5h16"/><rect x="5.5" y="4.5" width="13" height="9" rx="1"/>' +
               '<path d="M12 13.5v3"/><path d="m8 21 4-4.5 4 4.5"/>',
    sonido: '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5Z"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6"/>' +
            '<path d="M18 6.7a7.5 7.5 0 0 1 0 10.6"/>',
    'sonido-no': '<path d="M5 9.5h3l4-3.5v12l-4-3.5H5Z"/><path d="m16 9.5 4.5 5"/><path d="m20.5 9.5-4.5 5"/>',
    tema: '<path d="M20 14.2A8.2 8.2 0 0 1 9.8 4 8.4 8.4 0 1 0 20 14.2Z"/>',
    curso: '<path d="m2.5 8.5 9.5-4.5 9.5 4.5-9.5 4.5Z"/><path d="M6.5 10.5V16c0 1.7 2.5 3 5.5 3s5.5-1.3 5.5-3v-5.5"/>' +
           '<path d="M21.5 8.5v5"/>',
    documentacion: '<path d="M12 6.5C10.5 5 8.4 4.2 5.5 4.2A1.5 1.5 0 0 0 4 5.7v11.4a1.5 1.5 0 0 0 1.5 1.5c2.9 0 5 .8 6.5 2.3"/>' +
                   '<path d="M12 6.5c1.5-1.5 3.6-2.3 6.5-2.3A1.5 1.5 0 0 1 20 5.7v11.4a1.5 1.5 0 0 1-1.5 1.5c-2.9 0-5 .8-6.5 2.3"/>' +
                   '<path d="M12 6.5v14.4"/>',

    /* -------------------------- explorador ---------------------------- */
    documento: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9Z"/>' +
               '<path d="M13 3v6h6"/>',
    renombrar: '<path d="M4 20h4L20 8a2.1 2.1 0 0 0-3-3L5 17Z"/><path d="m14.5 6.5 3 3"/>',
    borrar: '<path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7"/>' +
            '<path d="M6.5 6.5 7.4 19a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12.5"/>' +
            '<path d="M10.5 10.5v6"/><path d="M13.5 10.5v6"/>',

    /* ------------------------------ varios ---------------------------- */
    verificar: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.2 2.6 2.6 5-5.6"/>',
    salir: '<path d="M14 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H14"/><path d="M18.5 12H10"/>' +
           '<path d="m15 8.5 3.5 3.5-3.5 3.5"/>',
    menu: '<path d="m6 9.5 6 6 6-6"/>',

    /* Una cabeza y los hombros: quién está usando la máquina. */
    perfil: '<circle cx="12" cy="8.2" r="3.7"/>' +
            '<path d="M4.5 20c.9-4 3.8-6.2 7.5-6.2s6.6 2.2 7.5 6.2"/>',
    /* Dos banderines encontrados: la batalla de código es de a dos. */
    duelo: '<path d="M6 21V4"/><path d="M6 4.5h6l-1.6 3 1.6 3H6"/>' +
           '<path d="M18 21V9"/><path d="M18 9.5h-6l1.6 3-1.6 3h6"/>',
    /* Una flecha que entra a una bandeja: bajar el progreso a un archivo. */
    exportar: '<path d="M12 3v11"/><path d="m8 10.5 4 4 4-4"/>' +
              '<path d="M4.5 16.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5"/>',
    /* La misma bandeja, con la flecha saliendo: traer un archivo de vuelta. */
    importar: '<path d="M12 14V3"/><path d="m8 6.5 4-4 4 4"/>' +
              '<path d="M4.5 16.5V19a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-2.5"/>'
  };

  const NOMBRES = Object.keys(D);

  function svg(nombre, clase) {
    if (!D[nombre]) return '';
    return `<svg class="${clase || 'ic'}" viewBox="0 0 24 24" width="18" height="18" ` +
      'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
      `stroke-linejoin="round" aria-hidden="true" focusable="false">${D[nombre]}</svg>`;
  }

  /* Le pone su icono a todo lo que lo pida y todavía no lo tenga. */
  function pintar(raiz) {
    const donde = raiz || document;
    donde.querySelectorAll('[data-ic]').forEach(el => {
      if (el.querySelector('svg.ic')) return;
      const marca = svg(el.dataset.ic);
      if (marca) el.insertAdjacentHTML('afterbegin', marca);
    });
  }

  global.Iconos = { pintar, svg, NOMBRES, D };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', () => pintar());
    else pintar();
  }
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * El diálogo del diagrama de la base: el dibujo a la izquierda y lo mismo
 * contado en palabras a la derecha, con un botón para bajar el SVG.
 *
 * Todo el trabajo lo hace js/diagrama-bd.js; acá solo se arma el DOM.
 *
 * API:  DiagramaBDUI.iniciar({ tablas })
 *         tablas() -> lo que devuelve SQL.tablas(base)
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);

  /* Baja un SVG como archivo. El dibujo lleva sus colores adentro, así que el
     archivo se abre igual en cualquier lado, no solo acá. */
  function bajar(svg, nombre) {
    const b = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function iniciar(cfg) {
    const dlg = $('#dlgDiagramaBD');
    if (!dlg) return;
    let ultimo = null;

    function abrir() {
      ultimo = global.DiagramaBD.generar(cfg.tablas());
      $('#dibujoBD').innerHTML = ultimo.svg;
      $('#palabrasBD').textContent = ultimo.texto || 'La base no tiene ninguna tabla todavía.\n';
      dlg.showModal();
    }

    $('#btnDiagramaBD').addEventListener('click', abrir);
    $('#btnCerrarDiagramaBD').addEventListener('click', () => dlg.close());
    $('#btnBajarBD').addEventListener('click', () => bajar(ultimo.svg, 'diagrama-de-la-base.svg'));
    $('#btnCopiarBD').addEventListener('click', async () => {
      const t = ultimo.texto;
      try { await navigator.clipboard.writeText(t); }
      catch (e) { prompt('Copiá la descripción:', t); }
    });
  }

  global.DiagramaBDUI = { iniciar, bajar };
})(typeof window !== 'undefined' ? window : globalThis);

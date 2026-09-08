/*
 * El diálogo del diagrama de flujo: dibujo a la izquierda y la explicación en
 * palabras a la derecha, con un selector cuando el programa tiene subrutinas
 * o clases. Todo el trabajo lo hace js/diagrama.js; acá solo se arma el DOM.
 *
 * API:  DiagramaUI.iniciar({ compilar, mostrarError })
 *         compilar()     -> AST del programa que hay en el editor
 *         mostrarError(e) -> lo que ya hace la página con los errores
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);

  /* Convierte la lista plana de pasos en listas anidadas. */
  function lista(pasos) {
    const raiz = document.createElement('ol');
    const pila = [raiz];
    for (const p of pasos) {
      while (pila.length - 1 > p.nivel) pila.pop();
      while (pila.length - 1 < p.nivel) {
        const padre = pila[pila.length - 1];
        const sub = document.createElement('ol');
        (padre.lastElementChild || padre).appendChild(sub);
        pila.push(sub);
      }
      const li = document.createElement('li');
      li.textContent = p.texto;
      pila[pila.length - 1].appendChild(li);
    }
    return raiz;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgDiagrama');
    if (!dlg) return;
    let rutinas = [], cual = 0;

    function pintar() {
      const d = rutinas[cual];
      if (!d) return;
      $('#dibujoDiagrama').innerHTML = d.svg;
      const ol = lista(d.pasos);
      ol.className = 'df-pasos';
      $('#pasosDiagrama').replaceChildren(ol);
    }

    function abrir() {
      let ast;
      try { ast = cfg.compilar(); }
      catch (e) { cfg.mostrarError(e); return; }

      rutinas = Diagrama.generar(ast);
      cual = 0;
      const sel = $('#selRutina');
      sel.replaceChildren();
      rutinas.forEach((d, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = d.titulo;
        sel.appendChild(o);
      });
      sel.parentElement.classList.toggle('oculto', rutinas.length < 2);
      pintar();
      dlg.showModal();
    }

    $('#btnDiagrama').addEventListener('click', abrir);
    $('#selRutina').addEventListener('change', ev => { cual = +ev.target.value; pintar(); });
    $('#btnCerrarDiagrama').addEventListener('click', () => dlg.close());

    $('#btnCopiarPasos').addEventListener('click', async () => {
      const t = rutinas[cual].titulo + '\n\n' + Diagrama.texto(rutinas[cual].pasos);
      try { await navigator.clipboard.writeText(t); }
      catch (e) { prompt('Copiá la explicación:', t); }
    });

    $('#btnBajarSVG').addEventListener('click', () => {
      const b = new Blob([rutinas[cual].svg], { type: 'image/svg+xml;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'diagrama.svg';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  global.DiagramaUI = { iniciar, lista };
})(typeof window !== 'undefined' ? window : globalThis);

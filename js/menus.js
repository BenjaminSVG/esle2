/*
 * Los menús de la barra de herramientas.
 *
 * Son <details> con <summary>: el navegador ya sabe abrirlos y cerrarlos con
 * el teclado y ya los anuncia como lo que son, así que no hace falta escribir
 * un menú a mano ni inventar atributos ARIA. Lo único que falta es lo que el
 * elemento no trae: que al abrir uno se cierren los otros, que se cierren al
 * tocar afuera o con Escape, y que elegir algo adentro los cierre.
 */
(function (global) {
  'use strict';

  /* «details.menu» son los del IDE clásico y de POO; «details.vs-m» los de la
     barra de menú de ESLE2 Visual. Se comportan igual, así que los maneja el
     mismo código. */
  const SELECTOR = 'details.menu, details.vs-m';
  const todos = () => Array.from(document.querySelectorAll(SELECTOR));
  const cerrarTodos = menos => todos().forEach(d => { if (d !== menos) d.open = false; });

  function iniciar() {
    const menus = todos();
    if (!menus.length) return;

    menus.forEach(d => {
      d.addEventListener('toggle', () => {
        if (!d.open) return;
        cerrarTodos(d);
        /* En el teléfono la barra se desliza de costado y recorta lo que
           sobresale, así que ahí el menú se despega y se coloca a mano
           justo debajo de su botón. */
        const s = d.querySelector('summary');
        if (s) d.style.setProperty('--menu-top', Math.round(s.getBoundingClientRect().bottom + 6) + 'px');
      });
      /* Elegir algo cierra el menú; los campos de texto y los select, no:
         ahí se está escribiendo o eligiendo, no saliendo. */
      d.addEventListener('click', ev => {
        if (ev.target.closest('.menu-campo') || ev.target.closest('summary')) return;
        if (ev.target.closest('button')) d.open = false;
      });
      d.addEventListener('change', ev => {
        if (ev.target.tagName === 'SELECT') d.open = false;
      });
    });

    document.addEventListener('click', ev => {
      if (!ev.target.closest(SELECTOR)) cerrarTodos(null);
    });
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape') return;
      const abierto = todos().find(d => d.open);
      if (!abierto) return;
      abierto.open = false;
      const s = abierto.querySelector('summary');
      if (s) s.focus();
    });
  }

  global.Menus = { iniciar, cerrarTodos };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : globalThis);

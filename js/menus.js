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

  /* Mientras hay un diálogo modal abierto, los atajos de la página de atrás no
     corresponden: quien está leyendo el historial y aprieta Escape quiere
     cerrar ese cuadro, no cortar el programa que está corriendo; y F9 no tiene
     que arrancar una ejecución que no se ve.

     Se frena acá, en la fase de captura, porque el problema es de todos los
     diálogos —son diez, en cuatro páginas— y no de uno. Solo estas cuatro
     teclas: frenar todo el teclado rompería escribir adentro del diálogo.
     Escape sigue cerrando el diálogo, que eso lo hace el navegador solo y no
     pasa por acá. */
  const TECLAS_DE_LA_PAGINA = new Set(['Escape', 'F8', 'F9', 'F10']);
  function frenarAtajosConUnDialogoAbierto() {
    document.addEventListener('keydown', ev => {
      if (!TECLAS_DE_LA_PAGINA.has(ev.key)) return;
      /* :modal es viejo pero no eterno: si el navegador no lo entiende, se da
         por modal cualquier diálogo abierto, que es el caso de todos los
         nuestros. */
      const esModal = d => { try { return d.matches(':modal'); } catch (e) { return true; } };
      if ([...document.querySelectorAll('dialog[open]')].some(esModal)) ev.stopPropagation();
    }, true);
  }

  function iniciar() {
    frenarAtajosConUnDialogoAbierto();
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

    devolverElFoco();
    document.addEventListener('keydown', ev => {
      if (ev.key !== 'Escape') return;
      const abierto = todos().find(d => d.open);
      if (!abierto) return;
      abierto.open = false;
      const s = abierto.querySelector('summary');
      if (s) s.focus();
    });
  }

  /* Casi todos los diálogos del sitio se abren desde un botón de un menú, y
     ese botón se esconde en el mismo clic: el menú se cierra. Entonces, cuando
     el diálogo se cierra, el navegador intenta devolverle el foco a un botón
     que ya no se ve, no puede, y lo deja en el <body>. Quien usa el teclado
     cierra el diálogo y aparece al principio de la página, sin ninguna
     relación con lo que estaba haciendo.

     Se arregla acá y no en cada diálogo porque el problema es del menú, no de
     los diálogos: son diez, en cuatro páginas, y todos lo tenían. */
  /* No alcanza con mirar si el elemento se ve: adentro de un <details> cerrado
     el botón sigue teniendo su lugar en la página pero no acepta el foco. La
     única forma honesta de saberlo es intentarlo y fijarse si quedó. */
  function enfocar(el) {
    if (!el || !el.isConnected) return false;
    try { el.focus(); } catch (e) { return false; }
    return document.activeElement === el;
  }

  function devolverElFoco() {
    let previo = null;
    document.addEventListener('focusin', ev => {
      const t = ev.target;
      if (t && t.closest && !t.closest('dialog')) previo = t;
    });

    /* «close» no burbujea: hay que escucharlo en la fase de captura. */
    document.addEventListener('close', ev => {
      const dlg = ev.target;
      if (!dlg || dlg.tagName !== 'DIALOG') return;
      const acomodar = () => {
        const a = document.activeElement;
        /* Si el navegador pudo devolverlo solo, o si el diálogo dejó el foco
           en otro lado a propósito, no se toca nada. */
        if (a && a !== document.body && a !== document.documentElement) return;
        if (enfocar(previo)) return;
        /* El botón quedó escondido adentro de su menú: el lugar razonable es
           el nombre del menú, que es de donde salió. */
        const menu = previo && previo.closest && previo.closest(SELECTOR);
        enfocar(menu && menu.querySelector('summary'));
      };
      /* Dos veces: el navegador hace su propio intento de devolver el foco
         después de este evento, y si le erra deja el <body>. Si se acomodara
         una sola vez, ese intento tardío pisaría lo que acabamos de poner. */
      acomodar();
      setTimeout(acomodar, 60);
    }, true);
  }

  global.Menus = { iniciar, cerrarTodos };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})(typeof window !== 'undefined' ? window : globalThis);

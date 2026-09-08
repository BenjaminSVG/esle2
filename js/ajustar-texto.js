/*
 * Ajustar texto: cortar las líneas largas al ancho del panel.
 *
 * Es el Alt + Z de Visual Studio Code. Apagado, una línea larga se sale por
 * la derecha y hay que empujar la barra horizontal para leerla; encendido, la
 * línea sigue abajo y entra entera en la pantalla. En un teléfono o en un
 * proyector eso es la diferencia entre leer el programa y no leerlo.
 *
 * Las líneas que siguen abajo arrancan a la misma altura que la original y no
 * pegadas al margen: si «imprimir (...)» está sangrado tres espacios, su
 * continuación también. Sin eso el programa se lee peor ajustado que sin
 * ajustar, que es justo lo contrario de lo que se pedía.
 *
 * El estado se guarda por editor, así que el IDE clásico, el de POO y el
 * Visual pueden tener cada uno el suyo.
 *
 * API:  AjustarTexto.iniciar({ editor, boton, clave, etiqueta })
 *         -> { encendido, poner, alternar }
 */
(function (global) {
  'use strict';

  function iniciar(cfg) {
    const editor = cfg.editor;
    const boton = cfg.boton || null;
    const clave = cfg.clave || 'esle2_ajustar';
    const texto = cfg.etiqueta || 'Ajustar texto';
    if (!editor) return null;

    /* La sangría de la línea, en píxeles, para colgar de ahí lo que siga.
       CodeMirror no lo hace solo: se calcula por línea al dibujarla. */
    function colgar(cm, linea, el) {
      const ancho = cm.defaultCharWidth();
      const sangria = CodeMirror.countColumn(linea.text, null, cm.getOption('tabSize'));
      const px = sangria * ancho;
      el.style.textIndent = '-' + px + 'px';
      el.style.paddingLeft = (4 + px) + 'px';
    }

    let encendido = false;

    function poner(v, guardar) {
      encendido = !!v;
      editor.setOption('lineWrapping', encendido);
      editor.off('renderLine', colgar);
      if (encendido) editor.on('renderLine', colgar);
      /* Sin esto las líneas ya dibujadas se quedan con la sangría vieja. */
      editor.refresh();

      if (boton) {
        boton.setAttribute('aria-pressed', String(encendido));
        const etq = boton.querySelector('.menu-etiqueta') || boton;
        etq.textContent = encendido ? texto + ' ✓' : texto;
      }
      if (guardar !== false) {
        try { localStorage.setItem(clave, encendido ? '1' : '0'); } catch (e) {}
      }
    }

    const alternar = () => poner(!encendido);

    let inicial = null;
    try { inicial = localStorage.getItem(clave); } catch (e) {}
    poner(inicial === '1', false);

    if (boton) boton.addEventListener('click', alternar);

    /* Alt + Z, el mismo atajo que en Visual Studio Code. */
    document.addEventListener('keydown', ev => {
      if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'z' || ev.key === 'Z')) {
        ev.preventDefault();
        alternar();
      }
    });

    return {
      get encendido() { return encendido; },
      poner: poner,
      alternar: alternar
    };
  }

  global.AjustarTexto = { iniciar: iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

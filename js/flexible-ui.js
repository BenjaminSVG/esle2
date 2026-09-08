/*
 * El interruptor «modo flexible» y lo que se ve en el editor.
 *
 * Toda compilación de la página pasa por acá, así que el interruptor cambia
 * de una sola vez lo que hacen Ejecutar, Revisar, Depurar, el diagrama, la
 * traducción y la prueba de escritorio. Sin este punto único habría que
 * acordarse de consultarlo en cada lugar, y tarde o temprano alguno quedaría
 * en estricto sin que se note.
 *
 * Estricto (el de siempre): al primer error, para y lo cuenta. Es el que hay
 * que usar para entregar.
 *
 * Flexible: compila igual pero anota todos los errores que encuentra, subraya
 * cada línea en el editor y deja correr el programa hasta el primero. Ver los
 * cinco errores de una vez, en vez de descubrirlos de a uno recompilando, es
 * toda la diferencia cuando se está aprendiendo.
 *
 * API:
 *   FlexibleUI.iniciar({ editor, boton, clave, estricto, Parser, extras, opciones, informar })
 *     -> { compilar, activo, poner, alternar, errores }
 */
(function (global) {
  'use strict';

  const CLASE = 'linea-mal';

  function iniciar(cfg) {
    const editor = cfg.editor;
    const boton = cfg.boton || null;
    const clave = cfg.clave || 'esle2_flexible';
    const texto = cfg.etiqueta || 'Modo flexible';
    const estricto = cfg.estricto || (f => global.SLE2.compilar(f));

    let encendido = false;
    let ultimos = [];
    let marcadas = [];

    function limpiarMarcas() {
      if (!editor) return;
      for (const l of marcadas) {
        try { editor.removeLineClass(l, 'background', CLASE); } catch (e) {}
      }
      marcadas = [];
    }

    function marcar(errores) {
      limpiarMarcas();
      if (!editor) return;
      const total = editor.lineCount();
      for (const e of errores) {
        const i = (e.linea || 0) - 1;
        if (i < 0 || i >= total) continue;
        const h = editor.addLineClass(i, 'background', CLASE);
        marcadas.push(h);
      }
    }

    function poner(v, guardar) {
      encendido = !!v;
      if (!encendido) { ultimos = []; limpiarMarcas(); }
      if (boton) {
        boton.setAttribute('aria-pressed', String(encendido));
        const etq = boton.querySelector('.menu-etiqueta') || boton;
        etq.textContent = encendido ? texto + ' ✓' : texto;
      }
      if (guardar !== false) {
        try { localStorage.setItem(clave, encendido ? '1' : '0'); } catch (e) {}
      }
    }

    /* El único compilador de la página. En estricto se comporta exactamente
       como antes —lanza el error y quien llama lo muestra—, así que ninguna
       parte de la interfaz tuvo que cambiar de forma. */
    function compilar(fuente) {
      const src = fuente === undefined ? editor.getValue() : fuente;
      if (!encendido) {
        ultimos = [];
        limpiarMarcas();
        return estricto(src);
      }

      const r = global.Flexible.compilar(src,
        { Parser: cfg.Parser, extras: cfg.extras, opciones: cfg.opciones });
      ultimos = r.errores;
      marcar(r.errores);
      if (cfg.informar) cfg.informar(r.errores, r);

      /* Ni el modo flexible puede sacar un AST de esto: se lanza el error
         como siempre para que la página lo muestre donde ya lo mostraba. */
      if (!r.ast) {
        const e = r.errores[0];
        throw new global.SLE2.SLError(e ? e.mensaje : 'el programa no se pudo compilar',
          e ? e.linea : 0, 'compilacion', e ? e.sugerencia : '');
      }
      return r.ast;
    }

    const alternar = () => { poner(!encendido); if (cfg.alCambiar) cfg.alCambiar(encendido); };

    let inicial = null;
    try { inicial = localStorage.getItem(clave); } catch (e) {}
    poner(inicial === '1', false);
    if (boton) boton.addEventListener('click', alternar);

    return {
      compilar,
      activo: () => encendido,
      poner,
      alternar,
      errores: () => ultimos.slice()
    };
  }

  global.FlexibleUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

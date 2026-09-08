/*
 * El autocompletado, enchufado a CodeMirror.
 *
 * Las sugerencias las arma js/autocompletar.js; acá se decide cuándo aparece
 * la lista, cómo se dibuja cada renglón y qué se escribe al elegir uno.
 *
 * API:  AutocompletarUI.iniciar(cm, { poo })
 */
(function (global) {
  'use strict';

  const PALABRA = /[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*$/;
  const MINIMO = 2;    // letras escritas antes de abrir la lista sola

  /* Escribe la sugerencia elegida. Las estructuras entran enteras y con la
     sangría de la línea; las subrutinas, con sus paréntesis y el cursor
     adentro si llevan argumentos. */
  function aplicar(cm, datos, item) {
    const A = global.Autocompletar;
    const sangria = /^[ \t]*/.exec(cm.getLine(datos.from.line))[0];
    let texto = item.texto;

    const plantilla = A.PLANTILLAS[item.texto];
    if (plantilla) {
      texto = plantilla.split('\n').join('\n' + sangria);
    } else if (['predefinida', 'subrutina', 'metodo'].includes(item.tipo)) {
      texto = item.texto + (/\(\s*\)/.test(item.firma) ? ' ()' : ' (' + A.MARCA + ')');
    }

    const marca = texto.indexOf(A.MARCA);
    if (marca >= 0) texto = texto.replace(A.MARCA, '');
    cm.replaceRange(texto, datos.from, datos.to, 'complete');

    if (marca >= 0) {
      const antes = texto.slice(0, marca).split('\n');
      cm.setCursor({
        line: datos.from.line + antes.length - 1,
        ch: antes.length > 1 ? antes[antes.length - 1].length : datos.from.ch + marca
      });
    }
  }

  function renglon(el, datos, item) {
    el.className += ' ac-item' + (item.corrige ? ' ac-corrige' : '');
    const f = document.createElement('span');
    f.className = 'ac-firma';
    f.textContent = item.firma;
    const t = document.createElement('span');
    t.className = 'ac-tipo';
    t.textContent = item.tipo;
    const a = document.createElement('span');
    a.className = 'ac-ayuda';
    a.textContent = item.ayuda;
    el.append(f, t, a);
  }

  function iniciar(cm, op) {
    op = op || {};
    if (!global.CodeMirror || !cm.showHint || !global.Autocompletar) return;
    const A = global.Autocompletar;

    function pistas(cm) {
      const cur = cm.getCursor();
      const hasta = cm.getLine(cur.line).slice(0, cur.ch);
      const m = PALABRA.exec(hasta);
      const prefijo = m ? m[0] : '';
      const items = A.sugerir(prefijo, {
        fuente: cm.getValue(), poo: !!op.poo, extras: op.extras, contexto: A.contexto(hasta),
        /* ESLE2 BD: las tablas se piden en el momento, no al arrancar, porque
           cambian con cada ejecución del programa. */
        sql: !!op.sql, tablas: op.tablas ? op.tablas() : null
      });
      return {
        from: global.CodeMirror.Pos(cur.line, cur.ch - prefijo.length),
        to: cur,
        list: items.map(item => ({
          text: item.texto,
          displayText: item.firma,
          render: (el, datos, self) => renglon(el, datos, item),
          hint: (cm2, datos) => aplicar(cm2, datos, item)
        }))
      };
    }

    /* La lista se cuelga dentro del <main> del editor —y no del <body>— para
       que quede adentro de una región de la página, y se le pone nombre
       accesible: es una lista de opciones y hay que poder anunciarla. */
    function abrir() {
      cm.showHint({
        hint: pistas, completeSingle: false,
        container: cm.getWrapperElement().closest('main') || undefined
      });
      requestAnimationFrame(() => {
        document.querySelectorAll('.CodeMirror-hints').forEach(ul => {
          ul.setAttribute('aria-label', 'Sugerencias para completar el código');
        });
      });
    }
    cm.addKeyMap({ 'Ctrl-Space': abrir, 'Cmd-Space': abrir });

    /* La lista se abre sola al escribir, que es de lo que se trata: no hay que
       acordarse de pulsar nada. En un comentario o dentro de una cadena, no. */
    cm.on('inputRead', (ed, ev) => {
      if (!ev.text || ev.text.length !== 1) return;
      const c = ev.text[0];
      if (!/^[A-Za-zñÑ_.]$/.test(c)) return;
      const tipo = ed.getTokenAt(ed.getCursor()).type;
      if (tipo === 'comentario' || tipo === 'cadena') return;
      if (c !== '.') {
        const cur = ed.getCursor();
        const m = PALABRA.exec(ed.getLine(cur.line).slice(0, cur.ch));
        if (!m || m[0].length < MINIMO) return;
      }
      abrir();
    });

    return { abrir };
  }

  global.AutocompletarUI = { iniciar, aplicar };
})(typeof window !== 'undefined' ? window : globalThis);

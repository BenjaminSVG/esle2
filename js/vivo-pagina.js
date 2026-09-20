/*
 * La página de una transmisión en vivo.
 *
 * Estaba escrito adentro de vivo.html. Salió a un archivo propio por la
 * CSP: con script-src 'self' y sin 'unsafe-inline', un <script> escrito
 * adentro del HTML no corre —y esa es justamente la regla que impide que
 * un texto ajeno que se cuele en la página se ejecute—.
 */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var editor = CodeMirror.fromTextArea($('#codigo'), {
    mode: 'sle2',
    theme: 'esle2',
    lineNumbers: true,
    indentUnit: 3,
    tabSize: 3,
    readOnly: true,          /* de una sola mano: acá solo se mira */
    lineWrapping: false
  });
  editor.setValue('');
  /* El área de texto que CodeMirror usa por debajo también necesita nombre:
     sin esto, el lector de pantalla anuncia «campo de texto» y nada más. */
  editor.getInputField().setAttribute('aria-label', 'Programa que se está transmitiendo');
  editor.getScrollerElement().setAttribute('tabindex', '0');
  editor.getScrollerElement().setAttribute('role', 'region');
  editor.getScrollerElement().setAttribute('aria-label', 'Programa que se está transmitiendo');

  var nombre = Vivo.leerUrl();
  var titulo = $('#vivoTitulo');
  var estado = $('#vivoEstado');

  function decir(texto, clase) {
    estado.textContent = texto;
    estado.className = 'estado' + (clase ? ' ' + clase : '');
  }

  if (!nombre) {
    titulo.textContent = 'No hay ninguna transmisión acá';
    decir('El enlace tiene que ser del tipo /live/nombre. Pedile el suyo a quien transmite.', 'error');
  } else {
    document.title = nombre + ' — transmisión en vivo de ESLE2';
    titulo.textContent = 'Transmite: ' + nombre;
    VivoUI.mirar({ editor: editor, nombre: nombre, estado: decir });
  }

  $('#btnCopiar').addEventListener('click', function () {
    var t = editor.getValue();
    if (!t) { decir('Todavía no llegó nada para copiar.'); return; }
    navigator.clipboard.writeText(t).then(
      function () { decir('Programa copiado.', 'ok'); },
      function () { decir('No se pudo copiar; seleccionalo a mano.'); });
  });

  /* Se lo lleva al IDE por el mismo camino que usa «Compartir»: el programa
     viaja adentro del «#» del enlace, sin pasar por ningún servidor y sin
     pisar lo que la persona tenga guardado en su propio IDE. */
  $('#btnAbrir').addEventListener('click', function () {
    var t = editor.getValue();
    if (!t) { decir('Todavía no llegó nada para abrir.'); return; }
    var enlace = Compartir.enlace(t, '');
    location.href = 'index.html' + enlace.slice(enlace.indexOf('#'));
  });

  /* El botón de tema ya lo ata js/tema.js. */
})();

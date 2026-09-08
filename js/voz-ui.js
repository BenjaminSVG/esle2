/*
 * La voz: escuchar el código y dictarlo.
 *
 * Dos cosas que van juntas porque son la misma idea —programar sin mirar la
 * pantalla— y que se apoyan en dos módulos puros:
 *
 *   · js/voz.js dice cómo suena una línea, y acá se la pasa al sintetizador
 *     del navegador (speechSynthesis, que no manda nada a ningún servidor);
 *   · js/dictado.js traduce una frase en español a una línea de SLE2, y acá se
 *     le da de comer lo que llega del micrófono… o lo que se escriba, que
 *     funciona igual en cualquier navegador.
 *
 * Sobre el lector: está APAGADO por omisión, a propósito. Quien usa NVDA o
 * VoiceOver ya tiene quien le lea la pantalla, y hablar encima sería escuchar
 * todo dos veces. Esto es para quien no tiene un lector instalado, o ve poco y
 * prefiere seguir el código de oído mientras lo mira.
 *
 * Sobre el micrófono: reconocer voz no existe en todos los navegadores (hoy
 * es cosa de Chrome y Edge) y donde existe, el audio se procesa en los
 * servidores del navegador. Por eso el dictado siempre se puede escribir, se
 * avisa antes de encender el micrófono, y nada se manda solo: primero se ve
 * qué entendió y recién después se inserta.
 *
 * API:  VozUI.iniciar({ editor, guardarClave, alError })
 *         -> { leerLinea, leerTodo, decir, activo }
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const hayVoz = () => typeof speechSynthesis !== 'undefined';
  const ReconocedorDeVoz = () => global.SpeechRecognition || global.webkitSpeechRecognition;

  function iniciar(cfg) {
    const editor = cfg.editor;
    const clave = cfg.guardarClave || 'esle2_voz';
    let activo = localStorage.getItem(clave) === '1';
    let ultimaLinea = -1;
    let nivelAnterior;
    let dlg = null;
    let reconocedor = null;
    let escuchando = false;

    /* ------------------------------ hablar --------------------------- */
    /* Se elige una voz en español si el sistema tiene alguna: con la voz en
       inglés, «si x es mayor que 5» es incomprensible. */
    function vozEspanola() {
      if (!hayVoz()) return null;
      const todas = speechSynthesis.getVoices();
      return todas.find(v => /^es(-|_)/i.test(v.lang)) || todas.find(v => /^es/i.test(v.lang)) || null;
    }

    function decir(texto, interrumpir) {
      if (!hayVoz() || !texto) return;
      if (interrumpir !== false) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(texto));
      const v = vozEspanola();
      if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'es-ES'; }
      u.rate = parseFloat(localStorage.getItem(clave + '_vel') || '1.05');
      speechSynthesis.speak(u);
    }

    const callar = () => { if (hayVoz()) speechSynthesis.cancel(); };

    /* ---------------------------- leer código ------------------------ */
    function leerLinea(forzar) {
      if (!editor) return;
      const n = editor.getCursor().line;
      const dicha = global.Voz.linea(editor.getLine(n) || '', n + 1, nivelAnterior);
      nivelAnterior = dicha.nivel;
      ultimaLinea = n;
      decir(dicha.texto, forzar !== false);
    }

    function leerTodo() {
      if (!editor) return;
      const t = global.Voz.texto(editor.getValue());
      decir(t ? 'Programa de ' + editor.lineCount() + ' líneas. ' + t : 'El editor está vacío.');
    }

    /* Mientras el lector está encendido, cada vez que el cursor cambia de
       renglón se dice ese renglón. Es lo que reemplaza a mirar. */
    function alMoverse() {
      if (!activo || !editor) return;
      const n = editor.getCursor().line;
      if (n === ultimaLinea) return;
      /* El nivel se recalcula desde arriba: si no, al saltar de una línea a
         otra lejana anunciaría un cambio de nivel que no existe. */
      nivelAnterior = n > 0 ? global.Voz.sangria(editor.getLine(n - 1) || '') : undefined;
      leerLinea();
    }

    function poner(v) {
      activo = !!v;
      localStorage.setItem(clave, activo ? '1' : '0');
      const b = $('#btnLeerCodigo');
      if (b) {
        b.setAttribute('aria-pressed', activo ? 'true' : 'false');
        b.classList.toggle('activo', activo);
      }
      if (activo) { ultimaLinea = -1; decir('Lector encendido. Se dice cada línea al moverte.'); }
      else callar();
    }

    /* ---------------------------- dictado ---------------------------- */
    function construirDictado() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      const conMicrofono = !!ReconocedorDeVoz();
      dlg.innerHTML = `
        <h3>Dictar código</h3>
        <p class="nota">Decí una línea en español y se escribe en SLE2. Podés
           <strong>escribirla igual</strong> si preferís, o si tu navegador no tiene micrófono para
           esto.</p>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="micro" ${conMicrofono ? '' : 'disabled'}
            title="${conMicrofono ? 'Encender el micrófono y escuchar una frase' : 'Este navegador no reconoce voz: escribí la frase'}">
            🎤 Hablar</button>
          <span class="crece"></span>
          <span class="nota" data-campo="estadoMic">${conMicrofono
    ? 'Al encenderlo, el navegador puede mandar el audio a sus servidores para entenderlo.'
    : 'Este navegador no reconoce voz. Probá con Chrome o Edge, o escribí la frase.'}</span>
        </div>

        <label>Lo que dijiste
          <input type="text" data-campo="frase" autocomplete="off"
            placeholder="si x es mayor a 5 entonces">
        </label>

        <label>Lo que se va a escribir
          <pre class="db-codigo" data-campo="previa" tabindex="0" role="region"
            aria-live="polite" aria-label="Código que se va a escribir"></pre>
        </label>

        <details class="dlg-ayuda">
          <summary>Qué se puede decir</summary>
          <table data-campo="ejemplos"><tr><th>Se dice</th><th>Se escribe</th></tr></table>
        </details>

        <div class="dlg-fila derecha">
          <button class="btn primario" data-accion="insertar" disabled>Escribirlo en el programa</button>
          <button class="btn" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const tabla = dlg.querySelector('[data-campo="ejemplos"]');
      for (const [dicho, sale] of global.Dictado.EJEMPLOS) {
        const tr = document.createElement('tr');
        const a = document.createElement('td');
        a.textContent = dicho;
        const b = document.createElement('td');
        const code = document.createElement('code');
        code.textContent = sale;
        b.appendChild(code);
        tr.append(a, b);
        tabla.appendChild(tr);
      }

      dlg.querySelector('[data-campo="frase"]').addEventListener('input', previa);
      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        if (b.dataset.accion === 'cerrar') { pararMicrofono(); dlg.close(); }
        else if (b.dataset.accion === 'micro') alternarMicrofono();
        else if (b.dataset.accion === 'insertar') insertar();
      });
      dlg.addEventListener('close', pararMicrofono);
      dlg.querySelector('[data-campo="frase"]').addEventListener('keydown', ev => {
        if (ev.key === 'Enter') { ev.preventDefault(); insertar(); }
      });
    }

    function previa() {
      const frase = dlg.querySelector('[data-campo="frase"]').value;
      const r = global.Dictado.aCodigo(frase);
      const caja = dlg.querySelector('[data-campo="previa"]');
      caja.textContent = r ? r.codigo
        : (frase.trim() ? 'No entendí «' + frase.trim() + '». Mirá los ejemplos de abajo.' : '');
      caja.dataset.ok = r ? '1' : '0';
      dlg.querySelector('[data-accion="insertar"]').disabled = !r;
      return r;
    }

    /* Escribe la línea dictada donde está el cursor, con la sangría que
       corresponde. Al terminar se dice lo que quedó: quien dictó no lo ve. */
    function insertar() {
      const r = previa();
      if (!r || !editor) return;
      const cur = editor.getCursor();
      const actual = editor.getLine(cur.line) || '';
      const sangria = /^[ \t]*/.exec(actual)[0];
      const cuerpo = r.codigo.split('\n').map((l, i) => (i ? sangria : '') + l).join('\n');
      const texto = (actual.trim() ? '\n' + sangria : '') + cuerpo + '\n' + sangria + (r.abre ? '   ' : '');

      editor.replaceRange(texto, { line: cur.line, ch: actual.length });
      editor.focus();
      dlg.querySelector('[data-campo="frase"]').value = '';
      previa();
      decir('Escribí: ' + global.Voz.frase(r.codigo.split('\n')[0]));
    }

    function alternarMicrofono() {
      if (escuchando) { pararMicrofono(); return; }
      const Rec = ReconocedorDeVoz();
      if (!Rec) return;
      reconocedor = new Rec();
      reconocedor.lang = 'es-AR';
      reconocedor.interimResults = true;
      reconocedor.continuous = false;

      const campo = dlg.querySelector('[data-campo="frase"]');
      const estado = dlg.querySelector('[data-campo="estadoMic"]');
      reconocedor.onresult = ev => {
        let t = '';
        for (const r of ev.results) t += r[0].transcript;
        campo.value = t;
        previa();
      };
      reconocedor.onerror = ev => {
        estado.textContent = ev.error === 'not-allowed'
          ? 'No diste permiso para el micrófono. Escribí la frase.'
          : 'No se pudo escuchar (' + ev.error + '). Escribí la frase.';
        pararMicrofono();
      };
      reconocedor.onend = () => { escuchando = false; pintarMicrofono(); };

      try { reconocedor.start(); escuchando = true; estado.textContent = 'Escuchando… decí una línea.'; }
      catch (e) { escuchando = false; }
      pintarMicrofono();
    }

    function pararMicrofono() {
      if (reconocedor) { try { reconocedor.stop(); } catch (e) { /* ya estaba parado */ } }
      escuchando = false;
      pintarMicrofono();
    }

    function pintarMicrofono() {
      if (!dlg) return;
      const b = dlg.querySelector('[data-accion="micro"]');
      b.textContent = escuchando ? '⏹ Parar' : '🎤 Hablar';
      b.setAttribute('aria-pressed', escuchando ? 'true' : 'false');
    }

    function abrirDictado() {
      if (!dlg) construirDictado();
      dlg.showModal();
      previa();
      dlg.querySelector('[data-campo="frase"]').focus();
    }

    /* ---------------------------- cableado --------------------------- */
    const btnLeer = $('#btnLeerCodigo');
    if (btnLeer) btnLeer.addEventListener('click', () => poner(!activo));
    const btnTodo = $('#btnLeerTodo');
    if (btnTodo) btnTodo.addEventListener('click', leerTodo);
    const btnDictar = $('#btnDictar');
    if (btnDictar) btnDictar.addEventListener('click', abrirDictado);

    if (editor) editor.on('cursorActivity', alMoverse);

    document.addEventListener('keydown', ev => {
      if (!ev.altKey || ev.ctrlKey || ev.metaKey) return;
      const k = String(ev.key).toLowerCase();
      if (k === 'l') { ev.preventDefault(); ev.shiftKey ? leerTodo() : leerLinea(); }
      else if (k === 'd') { ev.preventDefault(); abrirDictado(); }
      else if (k === 'escape') callar();
    });

    /* Las voces del sistema llegan tarde en algunos navegadores. */
    if (hayVoz() && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => { /* solo hace falta que se carguen */ };
    }

    poner(activo);
    return { leerLinea, leerTodo, decir, abrirDictado, activo: () => activo };
  }

  global.VozUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

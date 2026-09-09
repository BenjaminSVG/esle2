/*
 * Los primeros cinco minutos.
 *
 * Alguien entra por primera vez a ESLE2 y se encuentra un IDE completo: dos
 * pestañas, veinte botones, un editor, una pantalla, una entrada de datos y
 * un lienzo. Nosotros sabemos que todo eso es bueno; él ve una cabina de
 * avión y se va.
 *
 * Esto son cuatro carteles que aparecen UNA vez: el programa que ya está
 * escrito, el botón de ejecutar, dónde sale el resultado, y que hay un curso.
 * Nada más. El resto se descubre solo, que es como se descubre todo acá.
 *
 * Reglas que se cumplen a rajatabla:
 *   · no aparece si la persona ya tiene código guardado: no es su primera vez;
 *   · se puede cerrar en el primer clic y no vuelve nunca;
 *   · no tapa nada con lo que haya que interactuar, y se maneja con el teclado.
 *
 * La parte que se puede probar sin navegador (qué pasos hay y cuándo se
 * muestran) son funciones puras: las prueba test/test-bienvenida.js.
 *
 * API:  Bienvenida.hayQueMostrar({ visto, codigo })
 *       Bienvenida.pasos(lenguaje)
 *       Bienvenida.iniciar({ almacen, lenguaje })      (necesita DOM)
 */
(function (global) {
  'use strict';

  const CLAVE = 'esle2_bienvenida';

  /* Cada paso apunta a algo que ya está en la pantalla. Si el elemento no
     está —otra página, otro dialecto— el paso simplemente no se muestra: es
     preferible un recorrido de tres carteles que uno que apunta al vacío. */
  const PASOS = [
    {
      donde: '.CodeMirror',
      titulo: 'Este programa ya está escrito',
      texto: 'No tenés que escribir nada todavía. Es un programa de verdad, y funciona.'
    },
    {
      donde: '#btnEjecutar',
      titulo: 'Probalo',
      texto: 'Tocá Ejecutar —o Ctrl + Enter—. Te va a preguntar tu nombre.'
    },
    {
      donde: '#pantalla',
      titulo: 'Acá sale lo que hace tu programa',
      texto: 'Lo que el programa escribe aparece acá, y acá mismo le contestás cuando te pregunte algo.'
    },
    {
      donde: '[data-vista="curso"]',
      titulo: 'Y cuando quieras, hay un curso',
      texto: 'Cincuenta ejercicios que se corrigen solos. No hace falta ahora: primero jugá con el programa.'
    }
  ];

  /* La primera vez de verdad: nunca lo vio Y no tiene nada escrito. Lo
     segundo importa porque alguien que ya venía usando ESLE2 —o que acaba de
     abrir un programa compartido— no está empezando, y un cartel de
     bienvenida ahí es una interrupción. */
  function hayQueMostrar(estado) {
    if (!estado || estado.visto) return false;
    return !(estado.codigo && String(estado.codigo).trim().length);
  }

  function pasos(existe) {
    return PASOS.filter(p => (existe ? existe(p.donde) : true));
  }

  /* ------------------------------------------------------------------ */
  /* La parte que necesita DOM                                           */
  /* ------------------------------------------------------------------ */
  function iniciar(cfg) {
    cfg = cfg || {};
    const almacen = cfg.almacen || {
      leer: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
      escribir: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
    };
    const claveCodigo = cfg.claveCodigo || 'esle2_codigo';

    if (!hayQueMostrar({ visto: almacen.leer(CLAVE), codigo: almacen.leer(claveCodigo) })) {
      return null;
    }

    const lista = pasos(sel => document.querySelector(sel));
    if (!lista.length) return null;

    let i = 0;
    let marcado = null;

    const caja = document.createElement('div');
    caja.className = 'bienvenida';
    caja.setAttribute('role', 'dialog');
    caja.setAttribute('aria-label', 'Primeros pasos');
    caja.innerHTML = `
      <h2 data-campo="titulo"></h2>
      <p data-campo="texto"></p>
      <div class="bienvenida-pie">
        <span class="bienvenida-cuenta" data-campo="cuenta"></span>
        <span class="crece"></span>
        <button class="btn chico" data-accion="salir">Ya sé usarlo</button>
        <button class="btn chico primario" data-accion="seguir"></button>
      </div>`;
    document.body.appendChild(caja);

    const $ = c => caja.querySelector(`[data-campo="${c}"]`);
    const boton = a => caja.querySelector(`[data-accion="${a}"]`);

    function desmarcar() {
      if (marcado) marcado.classList.remove('bienvenida-mira');
      marcado = null;
    }

    function terminar() {
      desmarcar();
      caja.remove();
      almacen.escribir(CLAVE, '1');
      document.removeEventListener('keydown', teclas, true);
      /* El foco vuelve a donde estaba la persona, no al principio de todo. */
      const editor = document.querySelector('.CodeMirror textarea');
      if (editor) editor.focus();
    }

    function ubicar(destino) {
      const r = destino.getBoundingClientRect();
      const ancho = Math.min(320, window.innerWidth - 24);
      caja.style.width = ancho + 'px';
      /* Debajo del elemento si entra; si no, encima. Y siempre dentro de la
         ventana: en un teléfono los elementos quedan pegados a los bordes. */
      const alto = caja.offsetHeight || 160;
      const abajo = r.bottom + 10;
      const arriba = r.top - alto - 10;
      const y = abajo + alto < window.innerHeight ? abajo : Math.max(8, arriba);
      const x = Math.min(Math.max(8, r.left), window.innerWidth - ancho - 8);
      caja.style.top = Math.round(y) + 'px';
      caja.style.left = Math.round(x) + 'px';
    }

    function pintar() {
      const paso = lista[i];
      const destino = document.querySelector(paso.donde);
      if (!destino) { terminar(); return; }
      desmarcar();
      marcado = destino;
      destino.classList.add('bienvenida-mira');
      $('titulo').textContent = paso.titulo;
      $('texto').textContent = paso.texto;
      $('cuenta').textContent = (i + 1) + ' de ' + lista.length;
      boton('seguir').textContent = i === lista.length - 1 ? 'Listo' : 'Siguiente';
      ubicar(destino);
      boton('seguir').focus();
    }

    function teclas(ev) {
      if (ev.key === 'Escape') { ev.stopPropagation(); terminar(); }
    }

    caja.addEventListener('click', ev => {
      const b = ev.target.closest('[data-accion]');
      if (!b) return;
      if (b.dataset.accion === 'salir') { terminar(); return; }
      if (++i >= lista.length) terminar(); else pintar();
    });

    /* Escape cierra, y se atrapa antes que nadie: si no, el Escape de la
       página haría además otra cosa. */
    document.addEventListener('keydown', teclas, true);
    window.addEventListener('resize', () => { if (marcado) ubicar(marcado); });

    pintar();
    return { terminar, get paso() { return i; } };
  }

  global.Bienvenida = { iniciar, hayQueMostrar, pasos, PASOS, CLAVE };
})(typeof window !== 'undefined' ? window : globalThis);

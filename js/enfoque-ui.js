/*
 * Modo enfoque: el editor y nada más.
 *
 * Saca de la pantalla las pestañas, los menús, el progreso y la columna de la
 * derecha, y deja el programa ocupando todo. Abajo queda una barra chica con
 * lo único que hace falta: la música y la salida.
 *
 * Lo que NO hace, a propósito: esconder la pantalla del programa cuando el
 * programa está corriendo. Un modo «sin distracciones» que también esconde el
 * resultado de lo que uno acaba de ejecutar no es concentración, es un IDE
 * roto. Así que al ejecutar, la pantalla vuelve sola, y se va de nuevo en
 * cuanto se vuelve a escribir. La barra tiene un botón para fijarla, por si
 * alguien está depurando y la quiere quieta.
 *
 * La música se calcula en js/enfoque.js —no hay ningún archivo de audio— y
 * arranca solo si la persona la deja encendida. Empieza apagada la primera
 * vez: música que arranca sola sin avisar es lo peor que le podés hacer a
 * alguien que abre el sitio en una biblioteca.
 *
 * Atajo: Alt + E.
 *
 * API:  EnfoqueUI.iniciar({ editor, boton })
 */
(function (global) {
  'use strict';

  const CLAVE = 'esle2_enfoque';

  const leer = () => {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { return {}; }
  };
  const guardar = v => {
    try { localStorage.setItem(CLAVE, JSON.stringify(v)); } catch (e) { /* modo privado */ }
  };

  function iniciar(cfg) {
    cfg = cfg || {};
    const editor = cfg.editor || null;
    const guardado = leer();
    const estado = {
      activo: false,
      musica: guardado.musica === true,          // apagada salvo que se haya pedido
      volumen: typeof guardado.volumen === 'number' ? guardado.volumen : 0.45,
      fija: guardado.fija === true               // pantalla siempre a la vista
    };
    let barra = null;
    let musica = null;
    let observador = null;

    const cuerpo = () => document.body;

    /* ---------------------------- la pantalla ------------------------- */
    /* Mientras el programa corre, la columna de la derecha vuelve a la
       vista. Se detecta mirando el botón «Detener», que es el que aparece
       exactamente durante la ejecución: así este módulo no tiene que
       enterarse de nada de app.js. */
    function mirarEjecucion() {
      const btn = document.getElementById('btnDetener');
      if (!btn || observador) return;
      const revisar = () => {
        if (!estado.activo) return;
        if (!btn.classList.contains('oculto')) cuerpo().classList.add('enfoque-salida');
      };
      observador = new MutationObserver(revisar);
      observador.observe(btn, { attributes: true, attributeFilter: ['class'] });
      revisar();
    }

    /* Volver a escribir esconde la salida otra vez: el que sigue programando
       ya la leyó. Salvo que la haya fijado a mano. */
    function alEscribir() {
      if (estado.activo && !estado.fija) cuerpo().classList.remove('enfoque-salida');
    }
    if (editor && editor.on) editor.on('change', alEscribir);

    /* ------------------------------ la barra -------------------------- */
    function construirBarra() {
      if (barra) return;
      /* <aside> y no <div>: es contenido complementario con nombre propio,
         así queda adentro de una región y se puede saltar a ella. */
      barra = document.createElement('aside');
      barra.className = 'barra-enfoque';
      barra.setAttribute('aria-label', 'Modo enfoque');
      barra.innerHTML = `
        <span class="nota">Enfoque</span>
        <button class="btn mini-btn" data-accion="musica" aria-pressed="false"
                title="Música de fondo, calculada en el momento (no hay ningún archivo de audio)">♪ Música</button>
        <label class="enfoque-vol">
          <span class="visualmente-oculto">Volumen de la música</span>
          <input type="range" min="0" max="100" step="5" data-campo="volumen"
                 aria-label="Volumen de la música">
        </label>
        <button class="btn mini-btn" data-accion="fijar" aria-pressed="false"
                title="Dejar la pantalla del programa siempre a la vista">Pantalla fija</button>
        <button class="btn" data-accion="salir" title="Salir del modo enfoque (Alt + E)">Salir</button>`;
      document.body.appendChild(barra);

      const vol = barra.querySelector('[data-campo="volumen"]');
      vol.value = String(Math.round(estado.volumen * 100));
      vol.addEventListener('input', () => {
        estado.volumen = Number(vol.value) / 100;
        if (musica) musica.volumen(estado.volumen);
        guardar(estado);
      });

      barra.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        if (b.dataset.accion === 'salir') apagar();
        else if (b.dataset.accion === 'musica') alternarMusica();
        else if (b.dataset.accion === 'fijar') {
          estado.fija = !estado.fija;
          cuerpo().classList.toggle('enfoque-salida', estado.fija);
          guardar(estado);
          pintarBarra();
        }
      });
      pintarBarra();
    }

    function pintarBarra() {
      if (!barra) return;
      const m = barra.querySelector('[data-accion="musica"]');
      m.setAttribute('aria-pressed', String(estado.musica));
      m.classList.toggle('activo', estado.musica);
      const f = barra.querySelector('[data-accion="fijar"]');
      f.setAttribute('aria-pressed', String(estado.fija));
      f.classList.toggle('activo', estado.fija);
      barra.querySelector('.enfoque-vol').classList.toggle('apagada', !estado.musica);
    }

    /* ------------------------------ la música ------------------------- */
    function alternarMusica(valor) {
      estado.musica = valor === undefined ? !estado.musica : !!valor;
      guardar(estado);
      pintarBarra();
      if (!estado.musica) { if (musica) musica.parar(); return; }
      if (!musica) musica = global.Enfoque.crearMusica({ volumen: estado.volumen });
      musica.volumen(estado.volumen);
      if (!musica.arrancar() && barra) {
        /* Un navegador sin Web Audio, o con el audio bloqueado: se dice, no se
           deja el botón encendido mintiendo. */
        estado.musica = false;
        pintarBarra();
        barra.querySelector('.nota').textContent = 'Enfoque (sin audio)';
      }
    }

    /* ------------------------------ encender -------------------------- */
    function aplicar() {
      cuerpo().classList.toggle('enfoque', estado.activo);
      if (estado.activo) {
        construirBarra();
        mirarEjecucion();
        cuerpo().classList.toggle('enfoque-salida', estado.fija);
        if (estado.musica) alternarMusica(true);
      } else {
        if (musica) musica.parar();
        if (barra) { barra.remove(); barra = null; }
        cuerpo().classList.remove('enfoque-salida');
      }
      /* CodeMirror mide sus líneas al pintarse: hay que avisarle del cambio
         de tamaño o queda con el alto viejo. */
      document.querySelectorAll('.CodeMirror').forEach(c => c.CodeMirror && c.CodeMirror.refresh());
      if (cfg.boton) cfg.boton.setAttribute('aria-pressed', String(estado.activo));
      guardar(estado);
    }

    function encender() {
      if (estado.activo) return;
      estado.activo = true;
      aplicar();
      /* El foco va al programa: es lo único que queda en pantalla. */
      if (editor && editor.focus) editor.focus();
    }
    function apagar() {
      if (!estado.activo) return;
      estado.activo = false;
      aplicar();
      if (cfg.boton && cfg.boton.focus) cfg.boton.focus();
    }
    const alternar = () => (estado.activo ? apagar() : encender());

    if (cfg.boton) cfg.boton.addEventListener('click', alternar);

    document.addEventListener('keydown', ev => {
      if (ev.altKey && !ev.ctrlKey && !ev.metaKey && (ev.key === 'e' || ev.key === 'E')) {
        ev.preventDefault();
        alternar();
      }
    });

    /* El modo no se recuerda entre visitas —abrir el sitio y encontrarlo sin
       menús, sin saber por qué, es desorientador—, pero la música y el
       volumen sí: eso es una preferencia. */
    estado.activo = false;
    aplicar();

    return {
      encender, apagar, alternar,
      get activo() { return estado.activo; },
      get musica() { return estado.musica; },
      alternarMusica
    };
  }

  global.EnfoqueUI = { iniciar, CLAVE };
})(typeof window !== 'undefined' ? window : globalThis);

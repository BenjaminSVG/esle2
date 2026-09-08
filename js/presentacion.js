/*
 * Modo presentación: ESLE2 para proyectar en clase.
 *
 * Agranda el código y la pantalla, saca de en medio todo lo que no se mira
 * desde el fondo del aula (pestañas, progreso, botones secundarios) y deja una
 * barra chica para salir y para ajustar el tamaño. El tamaño elegido se
 * recuerda, porque cada proyector es distinto.
 *
 * Atajo: Ctrl + Shift + P.
 */
(function (global) {
  'use strict';

  const CLAVE = 'esle2_presentacion';
  const MIN = 1, MAX = 2.2, PASO = 0.15;

  const leer = () => {
    try { return JSON.parse(localStorage.getItem(CLAVE) || '{}'); } catch (e) { return {}; }
  };
  const guardar = v => localStorage.setItem(CLAVE, JSON.stringify(v));

  /* Un zoom válido: ni tan chico que no se note ni tan grande que no entre. */
  const acotar = z => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

  function crear() {
    const estado = Object.assign({ activo: false, zoom: 1.4 }, leer());
    let barra = null;

    function aplicar() {
      document.body.classList.toggle('presentacion', estado.activo);
      document.documentElement.style.setProperty('--zoom-pres', estado.activo ? estado.zoom : 1);
      if (estado.activo) mostrarBarra(); else if (barra) { barra.remove(); barra = null; }
      pintarZoom();
      // CodeMirror mide sus líneas al pintarse: hay que avisarle del cambio.
      document.querySelectorAll('.CodeMirror').forEach(c => c.CodeMirror && c.CodeMirror.refresh());
      const b = document.getElementById('btnProyectar');
      if (b) b.setAttribute('aria-pressed', String(estado.activo));
      guardar(estado);
    }

    function mostrarBarra() {
      if (barra) return;
      barra = document.createElement('div');
      barra.className = 'barra-proyeccion';
      barra.innerHTML = `
        <span class="nota">Proyección</span>
        <button class="btn mini-btn" data-zoom="-1" aria-label="Achicar la letra">A−</button>
        <span class="proy-zoom" aria-live="polite"></span>
        <button class="btn mini-btn" data-zoom="1" aria-label="Agrandar la letra">A+</button>
        <button class="btn" data-salir="1">Salir</button>`;
      document.body.appendChild(barra);
      barra.addEventListener('click', ev => {
        const z = ev.target.closest('[data-zoom]');
        if (z) { estado.zoom = acotar(estado.zoom + Number(z.dataset.zoom) * PASO); aplicar(); }
        if (ev.target.closest('[data-salir]')) apagar();
      });
      pintarZoom();
    }
    const pintarZoom = () => {
      const z = barra && barra.querySelector('.proy-zoom');
      if (z) z.textContent = Math.round(estado.zoom * 100) + ' %';
    };

    const encender = () => { estado.activo = true; aplicar(); pintarZoom(); };
    const apagar = () => { estado.activo = false; aplicar(); };
    const alternar = () => (estado.activo ? apagar() : encender());

    document.addEventListener('keydown', ev => {
      if (ev.ctrlKey && ev.shiftKey && (ev.key === 'P' || ev.key === 'p')) {
        ev.preventDefault();
        alternar();
      }
    });
    document.addEventListener('click', ev => {
      if (ev.target.closest('#btnProyectar')) alternar();
    });

    /* El zoom se recuerda, pero la proyección no: nadie quiere abrir el sitio
       y encontrarse la letra gigante sin saber por qué. */
    estado.activo = false;
    aplicar();

    return { encender, apagar, alternar, get activo() { return estado.activo; }, get zoom() { return estado.zoom; } };
  }

  global.Presentacion = { crear, acotar };
})(typeof window !== 'undefined' ? window : globalThis);

/* Documentación de ESLE2: índice lateral, buscador y resaltado de coincidencias. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const secciones = [...document.querySelectorAll('.doc-seccion')];
  const bloques = [...document.querySelectorAll('.doc-bloque')];
  const indice = $('#docIndice');
  const buscar = $('#docBuscar');
  const limpiar = $('#docLimpiar');
  const resultados = $('#docResultados');

  /* Texto normalizado sin tildes, manteniendo la longitud para poder resaltar. */
  const TILDES = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' };
  const plano = s => s.toLowerCase().replace(/[áéíóúüñ]/g, c => TILDES[c]);

  /* ---------------------- índice lateral ---------------------- */
  secciones.forEach(sec => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + sec.id;
    a.textContent = sec.dataset.titulo || sec.querySelector('h2').textContent;
    a.dataset.destino = sec.id;
    li.appendChild(a);
    indice.appendChild(li);
    sec._li = li;
    sec._a = a;
  });

  indice.addEventListener('click', ev => {
    const a = ev.target.closest('a');
    if (!a) return;
    ev.preventDefault();
    const sec = document.getElementById(a.dataset.destino);
    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + a.dataset.destino);
  });

  /* Marca en el índice la sección que se está leyendo. */
  const cuerpo = $('#docCuerpo');
  const observador = new IntersectionObserver(entradas => {
    entradas.forEach(e => {
      if (!e.isIntersecting) return;
      secciones.forEach(s => s._a.classList.toggle('activo', s === e.target));
    });
  }, { root: cuerpo, rootMargin: '0px 0px -75% 0px', threshold: 0 });
  secciones.forEach(s => observador.observe(s));

  /* Los ejemplos de código tienen scroll horizontal: para poder recorrerlos
     con el teclado necesitan poder recibir el foco. */
  document.querySelectorAll('.doc-cuerpo pre').forEach(p => {
    p.tabIndex = 0;   // alcanza con que reciba el foco: sin role, para no llenar la página de regiones
  });

  /* ------------------------- buscador ------------------------- */
  // Se guarda el HTML original de cada bloque para poder quitar el resaltado.
  bloques.forEach(b => { b._html = b.innerHTML; b._texto = plano(b.textContent); });
  secciones.forEach(s => { s._texto = plano((s.dataset.titulo || '') + ' ' + s.querySelector('h2').textContent + ' ' + (s.querySelector('.sub') ? s.querySelector('.sub').textContent : '')); });

  function resaltar(elem, terminos) {
    // Dentro de un SVG no se puede meter un <mark>: el texto del diagrama se deja como está.
    const paseo = document.createTreeWalker(elem, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentNode && n.parentNode.closest('svg'))
        ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodos = [];
    while (paseo.nextNode()) nodos.push(paseo.currentNode);

    nodos.forEach(nodo => {
      const texto = nodo.nodeValue;
      const base = plano(texto);
      const rangos = [];
      terminos.forEach(t => {
        let i = base.indexOf(t);
        while (i !== -1) { rangos.push([i, i + t.length]); i = base.indexOf(t, i + t.length); }
      });
      if (!rangos.length) return;

      rangos.sort((a, b) => a[0] - b[0]);
      const juntos = [];
      rangos.forEach(r => {
        const u = juntos[juntos.length - 1];
        if (u && r[0] <= u[1]) u[1] = Math.max(u[1], r[1]);
        else juntos.push(r.slice());
      });

      const frag = document.createDocumentFragment();
      let pos = 0;
      juntos.forEach(([a, b]) => {
        if (a > pos) frag.appendChild(document.createTextNode(texto.slice(pos, a)));
        const m = document.createElement('mark');
        m.textContent = texto.slice(a, b);
        frag.appendChild(m);
        pos = b;
      });
      if (pos < texto.length) frag.appendChild(document.createTextNode(texto.slice(pos)));
      nodo.parentNode.replaceChild(frag, nodo);
    });
  }

  function filtrar() {
    const consulta = plano(buscar.value.trim());
    limpiar.classList.toggle('oculto', !consulta);

    if (!consulta) {
      bloques.forEach(b => { b.innerHTML = b._html; b.classList.remove('oculto'); });
      secciones.forEach(s => { s.classList.remove('oculto'); s._li.classList.remove('oculto'); });
      resultados.textContent = '';
      return;
    }

    const terminos = consulta.split(/\s+/).filter(t => t.length > 1 || /\d/.test(t));
    if (!terminos.length) return;

    let visibles = 0, secVisibles = 0;
    secciones.forEach(sec => {
      const tituloCoincide = terminos.every(t => sec._texto.includes(t));
      let algunoVisible = false;

      [...sec.querySelectorAll('.doc-bloque')].forEach(b => {
        const coincide = tituloCoincide || terminos.every(t => b._texto.includes(t));
        b.innerHTML = b._html;
        b.classList.toggle('oculto', !coincide);
        if (coincide) { algunoVisible = true; visibles++; resaltar(b, terminos); }
      });

      sec.classList.toggle('oculto', !algunoVisible);
      sec._li.classList.toggle('oculto', !algunoVisible);
      if (algunoVisible) secVisibles++;
    });

    resultados.textContent = visibles
      ? `${visibles} apartado${visibles === 1 ? '' : 's'} en ${secVisibles} ${secVisibles === 1 ? 'sección' : 'secciones'}`
      : 'Sin resultados';
  }

  let temporizador = null;
  buscar.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(filtrar, 120);
  });
  buscar.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { buscar.value = ''; filtrar(); buscar.blur(); }
  });
  limpiar.addEventListener('click', () => { buscar.value = ''; filtrar(); buscar.focus(); });

  // Atajo: "/" lleva al buscador desde cualquier parte de la página.
  document.addEventListener('keydown', ev => {
    if (ev.key !== '/' || ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
    ev.preventDefault();
    buscar.focus();
    buscar.select();
  });

  // ?q=... o #seccion al entrar desde otra página.
  const q = new URLSearchParams(location.search).get('q');
  if (q) { buscar.value = q; filtrar(); }
  if (location.hash) {
    const sec = document.querySelector(location.hash);
    if (sec) setTimeout(() => sec.scrollIntoView({ block: 'start' }), 60);
  }
})();

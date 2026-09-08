/*
 * Buscador global (Ctrl + K).
 *
 * Un solo campo para llegar a cualquier parte del sitio: secciones de las dos
 * documentaciones, ejercicios de los dos cursos, subrutinas predefinidas y las
 * páginas sueltas. El índice lo genera tools/generar-indice.js.
 */
(function (global) {
  'use strict';

  const TILDES = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ü': 'u', 'ñ': 'n' };
  const plano = s => s.toLowerCase().replace(/[áéíóúüñ]/g, c => TILDES[c]);
  const MAX = 30;

  let caja, campo, lista, pie, abierto = false, elegido = 0, resultados = [];
  const datos = (global.ESLE2Indice || []).map(e => ({
    titulo: e[0], donde: e[1], url: e[2], extra: e[3] || '',
    busca: plano(e[0] + ' ' + e[1] + ' ' + (e[3] || ''))
  }));

  function construir() {
    caja = document.createElement('div');
    caja.className = 'paleta oculto';
    caja.innerHTML = `
      <div class="paleta-caja" role="dialog" aria-label="Buscador global">
        <input type="search" class="paleta-campo" placeholder="Buscar en todo ESLE2…"
               autocomplete="off" spellcheck="false" aria-label="Buscar en todo ESLE2">
        <ul class="paleta-lista" role="listbox"></ul>
        <p class="paleta-pie"></p>
      </div>`;
    document.body.appendChild(caja);
    campo = caja.querySelector('.paleta-campo');
    lista = caja.querySelector('.paleta-lista');
    pie = caja.querySelector('.paleta-pie');

    caja.addEventListener('mousedown', ev => { if (ev.target === caja) cerrar(); });
    campo.addEventListener('input', buscar);
    campo.addEventListener('keydown', teclas);
    lista.addEventListener('click', ev => {
      const li = ev.target.closest('li');
      if (li) ir(resultados[+li.dataset.i]);
    });
  }

  function puntaje(item, terminos) {
    let p = 0;
    for (const t of terminos) {
      const enTitulo = plano(item.titulo).indexOf(t);
      if (enTitulo === 0) p += 6;
      else if (enTitulo > 0) p += 4;
      else if (item.busca.includes(t)) p += 1;
      else return -1;                      // tienen que estar todos los términos
    }
    if (item.donde === 'Página') p += 1;
    return p;
  }

  function buscar() {
    const q = plano(campo.value.trim());
    const terminos = q.split(/\s+/).filter(Boolean);
    resultados = !terminos.length
      ? datos.slice(0, MAX)
      : datos.map(d => ({ d, p: puntaje(d, terminos) }))
        .filter(x => x.p >= 0)
        .sort((a, b) => b.p - a.p)
        .slice(0, MAX)
        .map(x => x.d);
    elegido = 0;
    pintar();
  }

  function pintar() {
    lista.innerHTML = '';
    resultados.forEach((r, i) => {
      const li = document.createElement('li');
      li.dataset.i = i;
      li.className = i === elegido ? 'sel' : '';
      li.setAttribute('role', 'option');
      const t = document.createElement('span');
      t.className = 'p-titulo';
      t.textContent = r.titulo;
      const d = document.createElement('span');
      d.className = 'p-donde';
      d.textContent = r.donde;
      li.append(t, d);
      lista.appendChild(li);
    });
    pie.textContent = resultados.length
      ? `${resultados.length} resultado${resultados.length === 1 ? '' : 's'} · ↑↓ para moverte · Enter para ir · Esc para cerrar`
      : 'Nada coincide con eso.';
    const sel = lista.querySelector('.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function teclas(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); cerrar(); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); elegido = Math.min(elegido + 1, resultados.length - 1); pintar(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); elegido = Math.max(elegido - 1, 0); pintar(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); ir(resultados[elegido]); }
  }

  function ir(r) {
    if (!r) return;
    cerrar();
    // Vercel sirve las páginas sin ".html", así que se comparan sin extensión.
    const nombre = s => (s || 'index').replace(/\.html$/, '');
    const aqui = nombre(location.pathname.split('/').pop());
    const [pagina, ancla] = r.url.split('#');
    if (nombre(pagina) === aqui) {
      // Misma página: cambiar el hash no la recarga, así que hay que avisarle.
      location.hash = ancla ? '#' + ancla : '';
      global.dispatchEvent(new HashChangeEvent('hashchange'));
    } else location.href = r.url;
  }

  function abrir() {
    if (!caja) construir();
    abierto = true;
    caja.classList.remove('oculto');
    campo.value = '';
    buscar();
    campo.focus();
  }

  function cerrar() {
    abierto = false;
    if (caja) caja.classList.add('oculto');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('btnBuscar');
    if (b) b.addEventListener('click', abrir);
  });

  document.addEventListener('keydown', ev => {
    if ((ev.ctrlKey || ev.metaKey) && (ev.key === 'k' || ev.key === 'K')) {
      ev.preventDefault();
      abierto ? cerrar() : abrir();
    }
  });

  global.BuscadorGlobal = { abrir, cerrar, get entradas() { return datos.length; } };
})(window);

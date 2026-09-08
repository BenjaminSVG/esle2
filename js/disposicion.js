/*
 * Disposición del área de trabajo: mover y redimensionar los paneles.
 *
 * El IDE tiene cuatro paneles —programa, entrada de datos, pantalla y, cuando
 * se depura, variables— repartidos en dos zonas: la principal (la columna
 * ancha de la izquierda) y la pila de la derecha. Este módulo deja:
 *
 *   · cambiar el tamaño arrastrando las barras que separan los paneles
 *     (o con las flechas del teclado, que la barra es enfocable);
 *   · mover un panel de lugar arrastrándolo del título, o con el botón ⇅
 *     del encabezado, que intercambia el panel con el siguiente.
 *
 * Todo se guarda en localStorage, así que la disposición sobrevive a la
 * recarga. Los tamaños viven en dos variables CSS (--area-cols y --col-filas)
 * en vez de en el atributo style de la grilla, para que la consulta de medios
 * de pantalla chica pueda seguir mandando: ahí abajo los paneles van uno
 * debajo del otro y las barras no se muestran.
 *
 * API:  Disposicion.iniciar(area) -> { restablecer, estado, intercambiar }
 */
(function (global) {
  'use strict';

  const CLAVE = 'esle2_disposicion';
  const GROSOR = 8;      // ancho/alto de la barra separadora, en píxeles
  const MINIMO = 60;     // ningún panel puede quedar más chico que esto
  const PASO_TECLA = 24; // cuánto mueve cada flecha del teclado

  /* La disposición original sale del propio HTML: el panel que está fuera de
     la columna es el principal, los de adentro van en su orden, y el alto de
     cada uno lo dice su atributo data-alto. Así el mismo módulo sirve en el
     IDE clásico, en el de POO y en ESLE2 Visual, que no tienen los mismos
     paneles ni la misma cantidad. */
  function porDefecto(area) {
    const columna = area.querySelector('.columna');
    const principal = Array.from(area.children).find(e => e.dataset && e.dataset.panel);
    const dentro = Array.from(columna.querySelectorAll('[data-panel]'));
    return {
      principal: principal ? principal.dataset.panel : dentro[0].dataset.panel,
      columna: dentro.map(p => p.dataset.panel),
      cols: [Number(area.dataset.cols) || 1.4, 1],
      filas: dentro.map(p => Number(p.dataset.alto) || 1)
    };
  }

  function leer(ids, area, clave) {
    let st;
    try { st = JSON.parse(localStorage.getItem(clave) || 'null'); } catch (e) { st = null; }
    const base = porDefecto(area);
    if (!st || typeof st !== 'object' || !Array.isArray(st.columna)) return base;
    /* Si lo guardado no menciona exactamente los paneles que hay ahora (por
       ejemplo porque la página cambió), se descarta y se vuelve al original. */
    const guardados = [st.principal].concat(st.columna).sort().join(',');
    if (guardados !== ids.slice().sort().join(',')) return base;
    st.cols = (st.cols || base.cols).map(Number);
    st.filas = (st.filas || base.filas).map(Number);
    if (st.cols.length !== 2 || st.filas.length !== st.columna.length) return base;
    if (st.cols.concat(st.filas).some(n => !(n > 0))) return base;
    return st;
  }

  function iniciar(area, opts) {
    const columna = area.querySelector('.columna');
    if (!columna) return null;
    const clave = (opts && opts.clave) || CLAVE;

    const P = {};
    area.querySelectorAll('[data-panel]').forEach(p => { P[p.dataset.panel] = p; });
    const ids = Object.keys(P);
    if (ids.length < 2) return null;

    let st = leer(ids, area, clave);
    let arrastrando = null;   // id del panel que se está moviendo

    const visible = id => !P[id].classList.contains('oculto');
    const guardar = () => { try { localStorage.setItem(clave, JSON.stringify(st)); } catch (e) {} };

    /* ------------------------- barras separadoras ------------------------ */
    /* `mover` recibe el desplazamiento en píxeles y reparte el espacio entre
       los dos paneles vecinos, que llegan en tam.el. */
    function nuevaBarra(vertical, mover, tam, valor) {
      const b = document.createElement('div');
      b.className = 'divisor ' + (vertical ? 'vert' : 'horiz');
      b.setAttribute('role', 'separator');
      b.setAttribute('aria-orientation', vertical ? 'vertical' : 'horizontal');
      b.tabIndex = 0;
      b.title = 'Arrastrá para cambiar el tamaño (o usá las flechas del teclado)';
      b.setAttribute('aria-label', 'Cambiar el tamaño de los paneles');
      /* Un separador que se puede enfocar necesita decir en qué posición está. */
      b.setAttribute('aria-valuemin', '10');
      b.setAttribute('aria-valuemax', '90');
      const anotar = () => b.setAttribute('aria-valuenow', String(Math.round(valor())));
      anotar();

      const medir = () => {
        tam.a = vertical ? tam.el[0].offsetWidth : tam.el[0].offsetHeight;
        tam.b = vertical ? tam.el[1].offsetWidth : tam.el[1].offsetHeight;
      };

      let desde = 0;
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault();
        desde = vertical ? ev.clientX : ev.clientY;
        medir();
        b.setPointerCapture(ev.pointerId);
        b.classList.add('activa');
      });
      b.addEventListener('pointermove', ev => {
        if (!b.hasPointerCapture(ev.pointerId)) return;
        mover((vertical ? ev.clientX : ev.clientY) - desde, tam);
        anotar();
      });
      const soltar = ev => {
        if (!b.hasPointerCapture(ev.pointerId)) return;
        b.releasePointerCapture(ev.pointerId);
        b.classList.remove('activa');
        guardar();
      };
      b.addEventListener('pointerup', soltar);
      b.addEventListener('pointercancel', soltar);

      b.addEventListener('keydown', ev => {
        const menos = vertical ? 'ArrowLeft' : 'ArrowUp';
        const mas = vertical ? 'ArrowRight' : 'ArrowDown';
        if (ev.key !== menos && ev.key !== mas) return;
        ev.preventDefault();
        medir();
        mover(ev.key === mas ? PASO_TECLA : -PASO_TECLA, tam);
        anotar();
        guardar();
      });
      return b;
    }

    /* Reparte el arrastre entre los dos vecinos y reescribe sus fracciones. */
    function repartir(d, tam, destino, i, j) {
      const total = tam.a + tam.b;
      if (total < MINIMO * 2) return;
      const a = Math.min(total - MINIMO, Math.max(MINIMO, tam.a + d));
      destino[i] = a / total;
      destino[j] = (total - a) / total;
      pintarTamanos();
    }

    /* ------------------------------ pintar ------------------------------- */
    function visiblesDeColumna() {
      return st.columna.map((id, i) => ({ id, i })).filter(x => visible(x.id));
    }

    function pintarTamanos() {
      area.style.setProperty('--area-cols', st.cols[0] + 'fr ' + GROSOR + 'px ' + st.cols[1] + 'fr');
      area.style.setProperty('--col-filas',
        visiblesDeColumna().map(x => st.filas[x.i] + 'fr').join(' ' + GROSOR + 'px '));
    }

    let pintando = false;
    function aplicar() {
      pintando = true;
      area.querySelectorAll('.divisor').forEach(d => d.remove());

      /* Orden del DOM: panel principal, barra, columna. */
      area.insertBefore(P[st.principal], columna);
      st.columna.forEach(id => columna.appendChild(P[id]));

      area.insertBefore(
        nuevaBarra(true, (d, t) => repartir(d, t, st.cols, 0, 1),
          { el: [P[st.principal], columna] },
          () => st.cols[0] / (st.cols[0] + st.cols[1]) * 100), columna);

      const vis = visiblesDeColumna();
      for (let k = 0; k < vis.length - 1; k++) {
        const a = vis[k], b = vis[k + 1];
        columna.insertBefore(
          nuevaBarra(false, (d, t) => repartir(d, t, st.filas, a.i, b.i),
            { el: [P[a.id], P[b.id]] },
            () => st.filas[a.i] / (st.filas[a.i] + st.filas[b.i]) * 100), P[b.id]);
      }

      pintarTamanos();
      guardar();
      /* CodeMirror mide su alto una sola vez: hay que avisarle que cambió. */
      global.dispatchEvent(new CustomEvent('esle2:disposicion'));
      pintando = false;
    }

    /* ------------------------------ mover -------------------------------- */
    function ranura(id) {
      return st.principal === id ? { z: 'p' } : { z: 'c', i: st.columna.indexOf(id) };
    }
    function poner(r, id) { if (r.z === 'p') st.principal = id; else st.columna[r.i] = id; }

    function intercambiar(a, b) {
      if (!a || !b || a === b || !P[a] || !P[b]) return;
      const ra = ranura(a), rb = ranura(b);
      poner(ra, b); poner(rb, a);
      aplicar();
    }

    function ordenVisible() {
      return [st.principal].concat(st.columna).filter(visible);
    }

    function prepararPanel(p) {
      const cab = p.querySelector('.panel-cab');
      if (!cab) return;
      const id = p.dataset.panel;

      cab.draggable = true;
      cab.title = 'Arrastrá este título para mover el panel de lugar';
      cab.addEventListener('dragstart', ev => {
        arrastrando = id;
        ev.dataTransfer.setData('text/plain', id);
        ev.dataTransfer.effectAllowed = 'move';
        p.classList.add('moviendo');
      });
      cab.addEventListener('dragend', () => {
        arrastrando = null;
        p.classList.remove('moviendo');
        area.querySelectorAll('.destino').forEach(x => x.classList.remove('destino'));
      });
      p.addEventListener('dragover', ev => {
        if (!arrastrando || arrastrando === id) return;
        ev.preventDefault();
        ev.dataTransfer.dropEffect = 'move';
        p.classList.add('destino');
      });
      p.addEventListener('dragleave', ev => {
        if (!p.contains(ev.relatedTarget)) p.classList.remove('destino');
      });
      p.addEventListener('drop', ev => {
        if (!arrastrando || arrastrando === id) return;
        ev.preventDefault();
        p.classList.remove('destino');
        intercambiar(arrastrando, id);
      });

      /* Con el teclado o en una pantalla táctil no hay arrastre: el botón
         intercambia el panel con el siguiente, que alcanza para acomodarlos. */
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mini-btn mover-panel';
      btn.textContent = '⇅';
      btn.title = 'Mover este panel al lugar del siguiente';
      btn.setAttribute('aria-label', 'Mover este panel al lugar del siguiente');
      btn.addEventListener('click', () => {
        const o = ordenVisible();
        const i = o.indexOf(id);
        if (i >= 0 && o.length > 1) intercambiar(id, o[(i + 1) % o.length]);
      });
      cab.appendChild(btn);
    }

    ids.forEach(id => prepararPanel(P[id]));
    aplicar();

    /* El panel de variables aparece y desaparece con el depurador: cuando eso
       pasa hay que rehacer las barras. */
    new MutationObserver(muts => {
      if (pintando) return;
      if (muts.some(m => m.target.dataset && m.target.dataset.panel)) aplicar();
    }).observe(area, { attributes: true, attributeFilter: ['class'], subtree: true });

    function restablecer() {
      st = porDefecto(area);
      aplicar();
    }
    const btn = document.getElementById('btnDisposicion');
    if (btn) btn.addEventListener('click', restablecer);

    return { restablecer, estado: () => st, intercambiar };
  }

  global.Disposicion = { iniciar, porDefecto };
})(typeof window !== 'undefined' ? window : globalThis);

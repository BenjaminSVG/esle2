/*
 * El diálogo del simulador de memoria: mapa de cajas a la izquierda, qué pasó
 * en este paso a la derecha, y una línea de tiempo abajo para ir y volver.
 *
 * Las fotos las saca js/memoria.js; acá solo se dibujan y se recorren.
 *
 * API:  MemoriaUI.iniciar({ codigo, entrada, ejecutar, mostrarError })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const MS = 800;   // cuánto dura cada paso cuando se reproduce solo

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  /* Una caja de variable. `estado` es '', 'nueva' o 'cambia'. */
  function caja(c, estado) {
    const e = nodo('div', 'mem-caja ' + estado + (c.konst ? ' konst' : ''));
    const cab = nodo('div', 'mem-cab');
    cab.append(nodo('span', 'mem-dir', c.dir),
               nodo('span', 'mem-tipo', c.tipo + ' · ' + c.bytes + ' B'));
    e.append(cab, nodo('div', 'mem-nombre', c.nombre + (c.ref ? '  (ref)' : '')));

    if (c.forma === 'vector' && c.casillas) {
      const v = nodo('div', 'mem-casillas');
      c.casillas.forEach((x, i) => {
        const cas = nodo('span', 'mem-casilla');
        cas.append(nodo('b', null, String(i + 1)), nodo('span', null, x));
        v.appendChild(cas);
      });
      e.appendChild(v);
    } else if (c.forma === 'registro' && c.campos) {
      const r = nodo('div', 'mem-campos');
      c.campos.forEach(f => {
        const fila = nodo('div', 'mem-campo');
        fila.append(nodo('i', null, f.nombre), nodo('span', null, f.valor));
        r.appendChild(fila);
      });
      e.appendChild(r);
    } else {
      e.appendChild(nodo('div', 'mem-valor', c.valor));
    }

    if (c.apunta !== null && c.apunta !== undefined)
      e.appendChild(nodo('div', 'mem-flecha', '→ objeto #' + c.apunta + ' en el montículo'));
    return e;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgMemoria');
    if (!dlg) return;

    let fotos = [], i = 0, fuente = [], reloj = null, aviso = '';

    function estadoDe(cambio, marcoId, nombre) {
      const k = marcoId + '::' + nombre;
      if (cambio.creadas.includes(k)) return 'nueva';
      if (cambio.modificadas.includes(k)) return 'cambia';
      return '';
    }

    function pintar() {
      const f = fotos[i];
      if (!f) return;
      const cambio = Memoria.cambios(fotos[i - 1], f);

      const mapa = $('#memMapa');
      mapa.replaceChildren();
      for (const m of f.marcos) {
        const z = nodo('section', 'mem-zona ' + m.zona);
        const h = nodo('h4', null, m.titulo);
        h.appendChild(nodo('span', 'mem-etiqueta', m.zona === 'pila' ? 'pila' : 'datos'));
        z.appendChild(h);
        if (!m.celdas.length) z.appendChild(nodo('p', 'nota', 'sin variables'));
        else m.celdas.forEach(c => z.appendChild(caja(c, estadoDe(cambio, m.id, c.nombre))));
        mapa.appendChild(z);
      }
      if (f.monton.length) {
        const z = nodo('section', 'mem-zona monton');
        const h = nodo('h4', null, 'Montículo (los objetos)');
        h.appendChild(nodo('span', 'mem-etiqueta', 'montículo'));
        z.appendChild(h);
        for (const o of f.monton) {
          const nueva = cambio.objetos.includes('obj::' + o.id) ? 'nueva' : '';
          z.appendChild(caja({
            nombre: o.clase + ' #' + o.id, tipo: 'objeto', bytes: o.bytes, dir: o.dir,
            forma: 'registro', campos: o.campos, valor: '', apunta: null
          }, nueva));
        }
        mapa.appendChild(z);
      }

      const narra = $('#memNarra');
      narra.replaceChildren();
      const frases = i ? Memoria.narrar(fotos[i - 1], f) : ['Arranca el programa: se reservan las cajas de las variables globales.'];
      if (!frases.length) frases.push('En este paso la memoria no cambió.');
      frases.forEach(t => narra.appendChild(nodo('li', null, t)));

      $('#memLinea').textContent = f.fin ? '—' : f.linea;
      $('#memCodigo').textContent = f.fin ? 'el programa terminó' : (fuente[f.linea - 1] || '').trim();
      $('#memTotal').textContent = `En total hay ${f.total} bytes ocupados en ${
        f.marcos.reduce((s, m) => s + m.celdas.length, 0)} caja(s).`;
      $('#memPaso').value = i;
      $('#memEtiqueta').textContent = `paso ${i + 1} de ${fotos.length}` + (aviso ? ' · ' + aviso : '');
    }

    function ir(n) {
      i = Math.max(0, Math.min(fotos.length - 1, n));
      pintar();
      if (i >= fotos.length - 1) parar();
    }

    function parar() {
      if (reloj) clearInterval(reloj);
      reloj = null;
      $('#memPlay').textContent = '▶';
      $('#memPlay').title = 'Reproducir';
    }

    function reproducir() {
      if (reloj) return parar();
      if (i >= fotos.length - 1) i = 0;
      reloj = setInterval(() => ir(i + 1), MS);
      $('#memPlay').textContent = '❚❚';
      $('#memPlay').title = 'Pausar';
    }

    async function abrir() {
      const codigo = cfg.codigo();
      try { (cfg.compilar || (() => {}))(codigo); }
      catch (e) { cfg.mostrarError(e); return; }

      const r = await Memoria.grabar(codigo, {
        entrada: cfg.entrada(), ejecutar: cfg.ejecutar, maxPasos: 400
      });
      if (!r.fotos.length) { cfg.mostrarError(r.error || new Error('el programa no ejecutó ninguna sentencia')); return; }

      fotos = r.fotos;
      fuente = codigo.split('\n');
      aviso = r.cortado ? 'se grabaron los primeros 400 pasos'
            : r.error ? 'el programa cortó con un error: ' + r.error.message : '';
      $('#memAviso').textContent = aviso;
      $('#memAviso').classList.toggle('oculto', !aviso);
      $('#memPaso').max = fotos.length - 1;
      parar();
      ir(0);
      dlg.showModal();
    }

    $('#btnMemoria').addEventListener('click', abrir);
    $('#memInicio').addEventListener('click', () => { parar(); ir(0); });
    $('#memFin').addEventListener('click', () => { parar(); ir(fotos.length - 1); });
    $('#memAtras').addEventListener('click', () => { parar(); ir(i - 1); });
    $('#memAdelante').addEventListener('click', () => { parar(); ir(i + 1); });
    $('#memPlay').addEventListener('click', reproducir);
    $('#memPaso').addEventListener('input', ev => { parar(); ir(+ev.target.value); });
    $('#btnCerrarMemoria').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', parar);
  }

  global.MemoriaUI = { iniciar, caja };
})(typeof window !== 'undefined' ? window : globalThis);

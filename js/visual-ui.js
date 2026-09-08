/*
 * ESLE2 Visual — la página: editor a la izquierda del diseño, cuadro de
 * herramientas, árbol de controles, propiedades y salida.
 *
 * Acá viven dos cosas:
 *
 *   1. `guiDOM`: el backend visual de verdad. js/sle2vis.js no sabe nada de
 *      HTML; le pide a un backend «creá un botón acá» y este lo dibuja con
 *      elementos reales del navegador. El mismo programa corre en las pruebas
 *      con un backend de mentira, y por eso el lenguaje se puede verificar sin
 *      abrir una pantalla.
 *
 *   2. La página en sí: pestañas Código / Diseño, el cuadro de herramientas
 *      que pega el código del control que se elija, el árbol de lo que se
 *      creó, las propiedades del control seleccionado y la ventana de salida.
 *
 * El código es la fuente de la verdad: no hay un diseñador que reescriba el
 * programa por atrás. Las propiedades se pueden tocar para probar, y lo dicen:
 * lo que se cambia ahí vale hasta la próxima ejecución.
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const rgb = c => `rgb(${c.r}, ${c.g}, ${c.b})`;

  /* ------------------------------------------------------------------ */
  /* El backend visual: controles de verdad en el navegador              */
  /* ------------------------------------------------------------------ */
  function guiDOM(cfg) {
    const marco = cfg.marco;         // la «ventana» donde van los controles
    const titulo = cfg.titulo;       // su barra de título
    const cuerpo = cfg.cuerpo;       // el área cliente
    const controles = new Map();     // id -> { tipo, el, props, dibujo }

    function limpiar() {
      controles.clear();
      cuerpo.replaceChildren();
      cuerpo.style.width = '';
      cuerpo.style.height = '';
    }

    const g = {
      limpiar,
      controles,
      posRaton: { x: 0, y: 0 },

      ventana(p) {
        if (p.titulo !== undefined) titulo.textContent = p.titulo;
        if (p.ancho) cuerpo.style.width = p.ancho + 'px';
        if (p.alto) cuerpo.style.height = p.alto + 'px';
        marco.classList.remove('oculto');
        if (cfg.alCambiar) cfg.alCambiar();
      },

      crear(id, tipo, p) {
        const el = crearElemento(tipo, p, id);
        el.style.left = p.x + 'px';
        el.style.top = p.y + 'px';
        el.style.width = p.ancho + 'px';
        el.style.height = p.alto + 'px';
        el.className = 'ctrl ctrl-' + tipo;
        el.dataset.id = String(id);
        cuerpo.appendChild(el);
        const c = { tipo, el, props: Object.assign({}, p), eventos: {} };
        if (tipo === 'lienzo') c.ctx = el.getContext('2d');
        controles.set(id, c);
        el.addEventListener('mousedown', ev => {
          if (cfg.alSeleccionar) cfg.alSeleccionar(id);
          const r = el.getBoundingClientRect();
          g.posRaton = { x: Math.round(ev.clientX - r.left), y: Math.round(ev.clientY - r.top) };
        });
        if (cfg.alCambiar) cfg.alCambiar();
        return el;
      },

      poner(id, prop, valor) {
        const c = controles.get(id);
        if (!c) return;
        const el = c.el;
        switch (prop) {
          case 'texto':
            c.props.texto = valor;
            if (c.tipo === 'caja') el.value = valor;
            else if (c.tipo === 'casilla') el.querySelector('span').textContent = valor;
            else el.textContent = valor;
            break;
          case 'valor':
            c.props.valor = valor;
            if (c.tipo === 'deslizador') el.querySelector('input').value = valor;
            break;
          case 'marcado':
            c.props.marcado = !!valor;
            el.querySelector('input').checked = !!valor;
            break;
          case 'agregar': {
            const o = document.createElement('option');
            o.textContent = valor;
            el.appendChild(o);
            break;
          }
          case 'limpiar': el.replaceChildren(); break;
          case 'posicion':
            c.props.x = valor.x; c.props.y = valor.y;
            el.style.left = valor.x + 'px'; el.style.top = valor.y + 'px';
            break;
          case 'tamano':
            c.props.ancho = valor.ancho; c.props.alto = valor.alto;
            el.style.width = valor.ancho + 'px'; el.style.height = valor.alto + 'px';
            if (c.tipo === 'lienzo') { el.width = valor.ancho; el.height = valor.alto; }
            break;
          case 'visible': c.props.visible = !!valor; el.style.visibility = valor ? '' : 'hidden'; break;
          case 'habilitado':
            c.props.habilitado = !!valor;
            el.classList.toggle('desactivado', !valor);
            (el.querySelector('input, select') || el).disabled = !valor;
            break;
          case 'fondo': c.props.fondo = rgb(valor); el.style.background = rgb(valor); break;
          case 'color': c.props.color = rgb(valor); el.style.color = rgb(valor); break;
        }
        if (cfg.alCambiar) cfg.alCambiar();
      },

      leer(id, prop) {
        const c = controles.get(id);
        if (!c) return '';
        const el = c.el;
        if (prop === 'texto') {
          if (c.tipo === 'caja') return el.value;
          if (c.tipo === 'casilla') return el.querySelector('span').textContent;
          return el.textContent;
        }
        if (prop === 'valor') return c.tipo === 'deslizador' ? Number(el.querySelector('input').value) : 0;
        if (prop === 'marcado') return c.tipo === 'casilla' ? el.querySelector('input').checked : false;
        if (prop === 'elegido') {
          const o = el.selectedOptions && el.selectedOptions[0];
          return o ? o.textContent : '';
        }
        return '';
      },

      dibujar(id, orden, a) {
        const c = controles.get(id);
        if (!c || !c.ctx) return;
        const x = c.ctx;
        switch (orden) {
          case 'pluma': c.pluma = rgb(a[0]); x.strokeStyle = c.pluma; break;
          case 'relleno': c.relleno = rgb(a[0]); x.fillStyle = c.relleno; break;
          case 'grosor': x.lineWidth = Math.max(0.5, a[0]); break;
          case 'linea':
            x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(a[2], a[3]); x.stroke(); break;
          case 'rectangulo':
            x.beginPath(); x.rect(a[0], a[1], a[2], a[3]);
            if (c.relleno) x.fill();
            x.stroke(); break;
          case 'circulo':
            x.beginPath(); x.arc(a[0], a[1], Math.abs(a[2]), 0, Math.PI * 2);
            if (c.relleno) x.fill();
            x.stroke(); break;
          case 'elipse':
            x.beginPath();
            x.ellipse(a[0], a[1], Math.abs(a[2]) / 2, Math.abs(a[3]) / 2, 0, 0, Math.PI * 2);
            if (c.relleno) x.fill();
            x.stroke(); break;
          case 'punto':
            x.beginPath(); x.arc(a[0], a[1], Math.max(0.7, x.lineWidth / 2), 0, Math.PI * 2);
            x.fillStyle = c.pluma || '#000'; x.fill();
            if (c.relleno) x.fillStyle = c.relleno;
            break;
          case 'texto':
            x.font = '13px system-ui, sans-serif';
            x.fillStyle = c.pluma || '#000';
            x.fillText(a[2], a[0], a[1]);
            if (c.relleno) x.fillStyle = c.relleno;
            break;
          case 'borrar': x.clearRect(0, 0, c.el.width, c.el.height); break;
        }
      },

      alEvento(id, evento, cb) {
        const c = controles.get(id);
        if (!c) return;
        c.eventos[evento] = true;
        const el = c.el;
        const disparar = () => cb([id]);
        if (evento === 'clic') el.addEventListener('click', disparar);
        else if (evento === 'cambio') {
          const campo = el.querySelector('input') || el;
          campo.addEventListener('change', disparar);
          if (campo.tagName === 'INPUT' && campo.type === 'range') campo.addEventListener('input', disparar);
        } else if (evento === 'tecla') {
          (el.querySelector('input') || el).addEventListener('keyup', disparar);
        }
        if (cfg.alCambiar) cfg.alCambiar();
      },

      mensaje(t) { if (cfg.mensaje) cfg.mensaje(t); },
      aviso(t) { if (cfg.aviso) cfg.aviso(t); },
      error(e) { if (cfg.error) cfg.error(e); },
      listo() { if (cfg.listo) cfg.listo(); },
      cerrar() { if (cfg.cerrar) cfg.cerrar(); },
      raton: prop => g.posRaton[prop] || 0
    };
    return g;
  }

  function crearElemento(tipo, p) {
    if (tipo === 'boton') {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = p.texto;
      return b;
    }
    if (tipo === 'caja') {
      const i = document.createElement('input');
      i.type = 'text';
      i.value = p.texto || '';
      return i;
    }
    if (tipo === 'casilla') {
      const l = document.createElement('label');
      const i = document.createElement('input');
      i.type = 'checkbox';
      const s = document.createElement('span');
      s.textContent = p.texto;
      l.append(i, s);
      return l;
    }
    if (tipo === 'lista') {
      const s = document.createElement('select');
      s.size = 4;
      return s;
    }
    if (tipo === 'deslizador') {
      const cont = document.createElement('div');
      const i = document.createElement('input');
      i.type = 'range';
      i.min = 0; i.max = 100; i.value = 0;
      cont.appendChild(i);
      return cont;
    }
    if (tipo === 'lienzo') {
      const c = document.createElement('canvas');
      c.width = p.ancho; c.height = p.alto;
      return c;
    }
    const d = document.createElement('div');   // etiqueta
    d.textContent = p.texto;
    return d;
  }

  global.VisualUI = { guiDOM, crearElemento };
})(typeof window !== 'undefined' ? window : globalThis);

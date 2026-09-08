/* Pantalla de texto compartida por el IDE de ESLE2 y el de ESLE2 POO.
   Modela una pantalla con cursor y colores, como la del SLE original:
   por eso funcionan cls(), set_curpos() y set_color(). */
(function (global) {
  'use strict';

  const COLORES = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa',
    '#aa5500', '#aaaaaa', '#555555', '#5555ff', '#55ff55', '#55ffff',
    '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];
  const LINEAS = 25, COLUMNAS = 80;

  class Pantalla {
    constructor(nodo, contenedor) {
      this.nodo = nodo;
      this.contenedor = contenedor || nodo.parentNode;
      this.limpiar();
    }
    limpiar() {
      this.lineas = [[]];      // cada celda: {c, f, b}  (f/b = 0 -> color por defecto)
      this.l = 1; this.c = 1;
      this.fg = 0; this.bg = 0;
      this.pendiente = true;
      this.pintar();
    }
    linea(i) {
      while (this.lineas.length < i) this.lineas.push([]);
      return this.lineas[i - 1];
    }
    poner(ch) {
      const fila = this.linea(this.l);
      while (fila.length < this.c - 1) fila.push({ c: ' ', f: 0, b: 0 });
      fila[this.c - 1] = { c: ch, f: this.fg, b: this.bg };
      this.c++;
    }
    escribir(texto) {
      for (const ch of texto) {
        if (ch === '\n') { this.l++; this.c = 1; this.linea(this.l); }
        else if (ch === '\r') { this.c = 1; }
        else if (ch === '\t') { const d = Math.floor((this.c - 1) / 8 + 1) * 8 + 1; while (this.c < d) this.poner(' '); }
        else this.poner(ch);
      }
      this.pedirPintado();
    }
    setCurpos(l, c) {
      if (l > 0) { this.l = l; this.linea(this.l); }
      if (c > 0) this.c = c;
      this.pedirPintado();
    }
    getCurpos() { return { linea: this.l, col: this.c }; }
    getScrsize() { return { lineas: LINEAS, columnas: COLUMNAS }; }
    setColor(f, b) {
      if (f > 0) this.fg = Math.min(15, f);
      if (b > 0) this.bg = Math.min(15, b);
    }
    getColor() { return { texto: this.fg, fondo: this.bg }; }

    pedirPintado() {
      if (this.pendiente) return;
      this.pendiente = true;
      requestAnimationFrame(() => this.pintar());
    }
    pintar() {
      this.pendiente = false;
      const frag = document.createDocumentFragment();
      this.lineas.forEach((fila, i) => {
        if (i) frag.appendChild(document.createTextNode('\n'));
        let j = 0;
        while (j < fila.length) {
          const { f, b } = fila[j];
          let txt = '';
          while (j < fila.length && fila[j].f === f && fila[j].b === b) { txt += fila[j].c; j++; }
          if (!f && !b) frag.appendChild(document.createTextNode(txt));
          else {
            const s = document.createElement('span');
            if (f) s.style.color = COLORES[f];
            if (b) s.style.background = COLORES[b];
            s.textContent = txt;
            frag.appendChild(s);
          }
        }
      });
      this.nodo.textContent = '';
      this.nodo.appendChild(frag);
      if (this.contenedor) this.contenedor.scrollTop = this.contenedor.scrollHeight;
    }
  }

  /* Lienzo: dibujar_pixel(), dibujar_linea(), dibujar_rectangulo(),
     dibujar_circulo() y limpiar_lienzo() de js/sle2.js pintan acá.
     Resolución fija de 320×200 —la del viejo modo gráfico de DOS, a tono con
     la paleta "Turbo" de Diseño— agrandada al doble por CSS con los bordes
     duros (image-rendering: pixelated), para que un solo dibujar_pixel() se
     note. Aparece solo (mostrar()) la primera vez que el programa dibuja
     algo, igual que la ventana de ESLE2 Visual. */
  class Lienzo {
    constructor(canvas, alAparecer) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ancho = canvas.width;
      this.alto = canvas.height;
      this.alAparecer = alAparecer || null;
      this.visible = false;
    }
    aparecer() {
      if (this.visible) return;
      this.visible = true;
      if (this.alAparecer) this.alAparecer();
    }
    color(n) { return COLORES[Math.max(0, Math.min(15, Math.trunc(n) || 0))] || '#000000'; }
    limpiar(c) {
      this.ctx.fillStyle = this.color(c);
      this.ctx.fillRect(0, 0, this.ancho, this.alto);
    }
    pixel(x, y, c) {
      this.aparecer();
      this.ctx.fillStyle = this.color(c);
      this.ctx.fillRect(Math.trunc(x), Math.trunc(y), 1, 1);
    }
    rect(x, y, w, h, c) {
      this.aparecer();
      this.ctx.fillStyle = this.color(c);
      this.ctx.fillRect(Math.trunc(x), Math.trunc(y), Math.trunc(w), Math.trunc(h));
    }
    linea(x1, y1, x2, y2, c) {
      this.aparecer();
      this.ctx.strokeStyle = this.color(c);
      this.ctx.beginPath();
      this.ctx.moveTo(Math.trunc(x1) + 0.5, Math.trunc(y1) + 0.5);
      this.ctx.lineTo(Math.trunc(x2) + 0.5, Math.trunc(y2) + 0.5);
      this.ctx.stroke();
    }
    circulo(x, y, r, c) {
      this.aparecer();
      this.ctx.fillStyle = this.color(c);
      this.ctx.beginPath();
      this.ctx.arc(Math.trunc(x), Math.trunc(y), Math.max(0, Math.trunc(r)), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  /* Recuadro de diagnóstico: título, línea de código señalada y recomendación.
     "verLinea(n)" devuelve el texto de la línea n del editor, o ''. */
  function crearDiagnostico(consola, verLinea, totalLineas) {
    return function diagnostico({ tipo, titulo, linea, mensaje, sugerencia }) {
      const d = document.createElement('div');
      d.className = 'diag' + (tipo === 'aviso' ? ' aviso' : tipo === 'estilo' ? ' estilo' : '');

      const t = document.createElement('span');
      t.className = 'diag-tit';
      t.textContent = titulo + (linea ? `  ·  línea ${linea}` : '');
      d.appendChild(t);

      const m = document.createElement('span');
      m.textContent = mensaje;
      d.appendChild(m);

      if (linea && linea <= totalLineas()) {
        const texto = verLinea(linea) || '';
        if (texto.trim()) {
          const c = document.createElement('span');
          c.className = 'diag-cod';
          c.textContent = `${String(linea).padStart(3)} │ ${texto}`;
          d.appendChild(c);
        }
      }
      if (sugerencia) {
        const s = document.createElement('span');
        s.className = 'diag-sug';
        const b = document.createElement('b');
        b.textContent = tipo === 'aviso' || tipo === 'estilo' ? 'Recomendación: ' : 'Cómo resolverlo: ';
        s.appendChild(b);
        s.appendChild(document.createTextNode(sugerencia));
        d.appendChild(s);
      }
      consola.appendChild(d);
      consola.scrollTop = consola.scrollHeight;
    };
  }

  global.ESLE2Consola = { Pantalla, Lienzo, crearDiagnostico, COLORES };
})(window);

/*
 * El diseñador de ventanas, la parte que se ve y se arrastra.
 *
 * Muestra la ventana del programa a tamaño real, con sus controles dibujados
 * exactamente como se van a ver al ejecutarlo —usa el mismo `crearElemento()`
 * que el runtime (js/visual-ui.js), así que no hay dos dibujos que puedan
 * discrepar— y deja moverlos y estirarlos con el mouse.
 *
 * Cada cosa que se hace acá **reescribe el programa** en el editor, y solo los
 * números de la línea que corresponde (ver js/disenador.js). No hay archivo de
 * diseño aparte: el código es el diseño.
 *
 * ------------------------------------------------------------------------
 * Se puede usar sin mouse
 * ------------------------------------------------------------------------
 * Y no es un agregado: un diseñador que solo funciona arrastrando deja afuera
 * a quien no puede arrastrar, y arrastrar es lo que menos se puede hacer sin
 * mouse. Entonces:
 *
 *   · con Tab se recorren los controles, y cada uno dice qué es, qué dice y
 *     dónde está;
 *   · las flechas lo mueven de a un píxel, con Shift de a diez;
 *   · Alt + flechas lo estiran;
 *   · Suprimir lo borra;
 *   · y las cajas de x, y, ancho y alto del panel de la derecha hacen lo mismo
 *     escribiendo el número.
 *
 * Cada movimiento se anuncia en una región viva, así que también se sigue de
 * oído.
 *
 * ------------------------------------------------------------------------
 * Los cambios y el «deshacer»
 * ------------------------------------------------------------------------
 * Mientras se arrastra, solo se mueve el elemento en pantalla; el programa se
 * toca recién al soltar. Si no, un arrastre de dos segundos dejaría doscientas
 * entradas en el historial del editor y Ctrl+Z tendría que apretarse
 * doscientas veces. Y cuando el cambio es de una sola línea se reemplaza esa
 * línea y no el archivo entero, para que el editor no pierda el cursor ni el
 * historial.
 *
 * API:  DisenadorUI.iniciar({ editor, boton, estado })
 */
(function (global) {
  'use strict';

  const REJILLA = 5;            // a cuánto se ajusta al arrastrar
  const MIN = 8;                // ningún control puede quedar más chico que esto

  function iniciar(cfg) {
    const editor = cfg.editor;
    const avisar = cfg.estado || (() => {});
    let dlg = null;
    let d = null;               // lo último leído del programa
    let elegido = -1;           // qué control está seleccionado (por su n)
    let ajustar = true;

    /* ---------------------------------------------------------------- */
    /* El diálogo                                                        */
    /* ---------------------------------------------------------------- */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-disenar';
      dlg.innerHTML = `
        <div class="dis-cab">
          <h3>Diseñar la ventana</h3>
          <p class="nota">Arrastrá los controles para acomodarlos. Cada cosa que muevas
             cambia los números de tu programa, y nada más que esos.</p>
        </div>

        <div class="dis-cuerpo">
          <div class="dis-caja-herr">
            <p class="menu-titulo">Agregar</p>
            <div class="dis-herr" data-campo="herramientas"></div>
            <label class="dis-check">
              <input type="checkbox" data-campo="ajustar" checked>
              Ajustar a la cuadrícula
            </label>
          </div>

          <div class="dis-lienzo-caja">
            <div class="dis-ventana" data-campo="ventana">
              <div class="dis-titulo" data-campo="tituloVentana"></div>
              <div class="dis-area" data-campo="area" role="group"
                   aria-label="Controles de la ventana. Usá Tab para recorrerlos y las flechas para moverlos."></div>
            </div>
            <p class="dis-medidas" data-campo="medidas"></p>
          </div>

          <div class="dis-props">
            <p class="menu-titulo">Propiedades</p>
            <div data-campo="props"></div>
          </div>
        </div>

        <p class="dis-aviso" data-campo="aviso" role="status" aria-live="polite"></p>

        <div class="dlg-fila derecha">
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      /* El cuadro de herramientas sale de la misma tabla que el lenguaje. */
      const herr = campo('herramientas');
      for (const tipo of Object.keys(global.SLE2VIS.CONTROLES)) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn mini-btn';
        b.dataset.agregar = tipo;
        b.textContent = global.Disenador.NOMBRE_LINDO[tipo] || tipo;
        herr.appendChild(b);
      }

      campo('ajustar').addEventListener('change', ev => { ajustar = ev.target.checked; });

      dlg.addEventListener('click', ev => {
        const a = ev.target.closest('[data-agregar]');
        if (a) { agregar(a.dataset.agregar); return; }
        if (ev.target.closest('[data-accion="cerrar"]')) dlg.close();
      });

      /* Clic en el fondo de la ventana: deseleccionar. */
      campo('area').addEventListener('pointerdown', ev => {
        if (ev.target === campo('area')) { elegido = -1; pintar(); }
      });

      dlg.addEventListener('close', () => avisar('listo'));
    }

    const campo = c => dlg.querySelector(`[data-campo="${c}"]`);
    const decir = t => { campo('aviso').textContent = t; };

    /* ---------------------------------------------------------------- */
    /* Escribir en el editor                                             */
    /* ---------------------------------------------------------------- */
    /*
     * Si el cambio es de una sola línea se reemplaza esa línea sola: así el
     * editor no pierde el cursor, el historial queda con una entrada por
     * cambio y Ctrl+Z deshace un arrastre entero de una.
     */
    function aplicar(nueva) {
      const vieja = editor.getValue();
      if (nueva === vieja) return;
      const a = vieja.split('\n'), b = nueva.split('\n');
      if (a.length === b.length) {
        const cambiadas = [];
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) cambiadas.push(i);
        if (cambiadas.length === 1) {
          const i = cambiadas[0];
          editor.replaceRange(b[i], { line: i, ch: 0 }, { line: i, ch: a[i].length });
          leerPrograma();
          return;
        }
      }
      editor.setValue(nueva);
      leerPrograma();
    }

    function leerPrograma() {
      d = global.Disenador.leer(editor.getValue());
      pintar();
    }

    /* ---------------------------------------------------------------- */
    /* Dibujar                                                           */
    /* ---------------------------------------------------------------- */
    function pintar() {
      const area = campo('area');
      area.replaceChildren();

      if (d.error) {
        campo('ventana').classList.add('oculto');
        campo('medidas').textContent = '';
        campo('props').replaceChildren();
        decir('El programa no compila' + (d.error.linea ? ' (línea ' + d.error.linea + ')' : '')
          + ': ' + (d.error.mensaje || d.error.message) + '. Arreglalo y volvé.');
        return;
      }
      campo('ventana').classList.remove('oculto');

      if (!d.ventana) {
        campo('medidas').textContent = '';
        decir('Tu programa todavía no crea una ventana. Escribí '
            + 'ventana ("Título", 420, 260) y volvé a abrir esto.');
        return;
      }

      /* La ventana, a tamaño real. */
      campo('ventana').style.width = d.ventana.ancho + 'px';
      campo('tituloVentana').textContent = d.ventana.titulo || 'Ventana';
      const area2 = campo('area');
      area2.style.width = d.ventana.ancho + 'px';
      area2.style.height = d.ventana.alto + 'px';
      campo('medidas').textContent = `Ventana de ${d.ventana.ancho} × ${d.ventana.alto}`
        + (d.otros ? ` · ${d.otros} control(es) se crean adentro de un ciclo o de una subrutina y no se pueden acomodar acá` : '');

      for (const c of d.controles) area.appendChild(dibujarControl(c));
      pintarProps();
      if (!d.controles.length) {
        decir('Todavía no hay controles. Agregá uno con los botones de la izquierda.');
      }
    }

    function dibujarControl(c) {
      const caja = document.createElement('div');
      caja.className = 'dis-ctrl' + (c.n === elegido ? ' elegido' : '')
        + (c.movible ? '' : ' trabado');
      caja.style.left = c.x + 'px';
      caja.style.top = c.y + 'px';
      caja.style.width = c.ancho + 'px';
      caja.style.height = c.alto + 'px';
      caja.tabIndex = 0;
      caja.dataset.n = c.n;
      caja.setAttribute('role', 'button');
      caja.setAttribute('aria-label', etiquetaDe(c));
      caja.setAttribute('aria-pressed', c.n === elegido ? 'true' : 'false');

      /* El dibujo de adentro es el mismo del programa corriendo, pero acá es
         decoración: no se puede tocar ni lo ve el lector de pantalla, que ya
         tiene el nombre en la caja de afuera. */
      const dentro = global.VisualUI.crearElemento(c.tipo, {
        texto: c.texto || '', ancho: c.ancho, alto: c.alto
      });
      /* El dibujo es decoración:  lo saca del orden de tabulación y del
         árbol de accesibilidad de una vez, con todo lo que tenga adentro. Sin
         esto quedarían controles de verdad (un <button>, un <input>) anidados
         adentro del control que uno arrastra, que además de marcar mal en axe
         haría que Tab se meta adentro de cada botón dibujado. */
      dentro.setAttribute('aria-hidden', 'true');
      dentro.setAttribute('inert', '');
      dentro.inert = true;
      dentro.querySelectorAll('button, input, select, textarea, a')
        .forEach(x => { x.tabIndex = -1; if ('disabled' in x) x.disabled = true; });
      if ('tabIndex' in dentro) dentro.tabIndex = -1;
      dentro.classList.add('dis-dibujo');
      caja.appendChild(dentro);

      if (c.medible) {
        const tir = document.createElement('span');
        tir.className = 'dis-tirador';
        tir.dataset.tirador = '1';
        tir.setAttribute('aria-hidden', 'true');   // se estira con Alt+flechas
        caja.appendChild(tir);
      }

      caja.addEventListener('pointerdown', ev => empezarArrastre(ev, c, caja));
      caja.addEventListener('focus', () => { elegido = c.n; marcarElegido(); pintarProps(); });
      caja.addEventListener('keydown', ev => teclas(ev, c));
      return caja;
    }

    const etiquetaDe = c =>
      `${c.etiquetaTipo}${c.texto ? ' «' + c.texto + '»' : ''}, en ${c.x}, ${c.y}, `
      + `de ${c.ancho} por ${c.alto}${c.movible ? '' : ' (no se puede mover: sus coordenadas no son números)'}`;

    function marcarElegido() {
      for (const n of campo('area').children) {
        const suyo = Number(n.dataset.n) === elegido;
        n.classList.toggle('elegido', suyo);
        n.setAttribute('aria-pressed', suyo ? 'true' : 'false');
      }
    }

    /* ---------------------------------------------------------------- */
    /* Propiedades                                                       */
    /* ---------------------------------------------------------------- */
    function pintarProps() {
      const caja = campo('props');
      caja.replaceChildren();
      const c = d.controles.find(x => x.n === elegido);
      if (!c) {
        const p = document.createElement('p');
        p.className = 'nota';
        p.textContent = 'Elegí un control para ver y cambiar sus datos.';
        caja.appendChild(p);
        return;
      }

      const tit = document.createElement('p');
      tit.className = 'dis-prop-tipo';
      tit.textContent = c.etiquetaTipo + (c.variable ? ' · ' + c.variable : '');
      caja.appendChild(tit);

      if (c.editableTexto) {
        caja.appendChild(campoTexto('Texto', c.texto, v => {
          aplicar(global.Disenador.texto(editor.getValue(), c, v));
        }));
      }

      const rejilla = document.createElement('div');
      rejilla.className = 'dis-prop-grilla';
      const num = (rotulo, valor, puede, alCambiar) => {
        const l = document.createElement('label');
        l.textContent = rotulo;
        const i = document.createElement('input');
        i.type = 'number';
        i.className = 'control';
        i.value = valor;
        i.disabled = !puede;
        i.addEventListener('change', () => alCambiar(Number(i.value)));
        l.appendChild(i);
        rejilla.appendChild(l);
      };
      num('x', c.x, c.movible, v => cambiar(c, { x: v }));
      num('y', c.y, c.movible, v => cambiar(c, { y: v }));
      num('ancho', c.ancho, c.medible, v => cambiar(c, { ancho: Math.max(MIN, v) }));
      num('alto', c.alto, c.medible, v => cambiar(c, { alto: Math.max(MIN, v) }));
      caja.appendChild(rejilla);

      if (!c.movible) {
        const n = document.createElement('p');
        n.className = 'nota';
        n.textContent = 'Este control no se puede mover desde acá: su x y su y no son números '
          + 'escritos sino una variable o una cuenta. Cambiarlas acá querría decir cambiar esa '
          + 'variable, que puede estar usada en otro lado.';
        caja.appendChild(n);
      }
      if (!c.variable) {
        const n = document.createElement('p');
        n.className = 'nota';
        n.textContent = 'No está guardado en ninguna variable, así que todavía no se le puede '
          + 'atender el clic con al_hacer_clic().';
        caja.appendChild(n);
      }

      const borrar = document.createElement('button');
      borrar.type = 'button';
      borrar.className = 'btn borrar';
      borrar.textContent = 'Borrar este control';
      borrar.addEventListener('click', () => borrarControl(c));
      caja.appendChild(borrar);

      const linea = document.createElement('p');
      linea.className = 'nota';
      linea.textContent = 'Está en la línea ' + c.linea + ' de tu programa.';
      caja.appendChild(linea);
    }

    function campoTexto(rotulo, valor, alCambiar) {
      const l = document.createElement('label');
      l.className = 'dis-prop-texto';
      l.textContent = rotulo;
      const i = document.createElement('input');
      i.type = 'text';
      i.className = 'control';
      i.value = valor || '';
      i.addEventListener('change', () => alCambiar(i.value));
      l.appendChild(i);
      return l;
    }

    /* ---------------------------------------------------------------- */
    /* Cambiar                                                           */
    /* ---------------------------------------------------------------- */
    function cambiar(c, caja) {
      aplicar(global.Disenador.mover(editor.getValue(), c, caja));
      const nuevo = d.controles.find(x => x.n === c.n);
      if (nuevo) decir(etiquetaDe(nuevo));
      const nodo = campo('area').querySelector(`[data-n="${c.n}"]`);
      if (nodo) nodo.focus();
    }

    function agregar(tipo) {
      if (!d || !d.ventana) {
        decir('Primero tu programa tiene que crear una ventana.');
        return;
      }
      /* Se pone en un lugar libre y a la vista, no encima de otro. */
      const y = 20 + d.controles.length * 10;
      const r = global.Disenador.agregar(editor.getValue(), tipo, { x: 20, y: Math.min(y, d.ventana.alto - 40) });
      aplicar(r.fuente);
      const nuevo = d.controles.find(c => c.variable === r.nombre);
      if (nuevo) {
        elegido = nuevo.n;
        marcarElegido();
        pintarProps();
        const nodo = campo('area').querySelector(`[data-n="${nuevo.n}"]`);
        if (nodo) nodo.focus();
        decir(`Se agregó ${nuevo.etiquetaTipo}, guardado en la variable ${r.nombre}. `
            + 'Arrastralo o movelo con las flechas.');
      }
    }

    function borrarControl(c) {
      const r = global.Disenador.borrar(editor.getValue(), c);
      elegido = -1;
      aplicar(r.fuente);
      decir(`Se borró ${c.etiquetaTipo}`
        + (r.quitadas ? `, y también ${r.quitadas} línea(s) que le atendían un evento.` : '.'));
    }

    /* ---------------------------------------------------------------- */
    /* Arrastrar                                                         */
    /* ---------------------------------------------------------------- */
    const pegar = v => (ajustar ? Math.round(v / REJILLA) * REJILLA : Math.round(v));

    function empezarArrastre(ev, c, nodo) {
      if (ev.button !== 0) return;
      const estirando = !!ev.target.dataset.tirador;
      if (estirando ? !c.medible : !c.movible) {
        elegido = c.n; marcarElegido(); pintarProps(); nodo.focus();
        return;
      }
      ev.preventDefault();
      elegido = c.n;
      marcarElegido();
      pintarProps();
      nodo.focus();

      const x0 = ev.clientX, y0 = ev.clientY;
      const base = { x: c.x, y: c.y, ancho: c.ancho, alto: c.alto };
      let ultimo = null;

      nodo.setPointerCapture(ev.pointerId);
      nodo.classList.add('moviendo');

      const mover = e => {
        const dx = e.clientX - x0, dy = e.clientY - y0;
        if (estirando) {
          ultimo = {
            ancho: Math.max(MIN, pegar(base.ancho + dx)),
            alto: Math.max(MIN, pegar(base.alto + dy))
          };
          nodo.style.width = ultimo.ancho + 'px';
          nodo.style.height = ultimo.alto + 'px';
        } else {
          /* Sin dejar que se vaya de la ventana: un control en -300 existe
             pero no se ve, y después no hay forma de volver a agarrarlo. */
          ultimo = {
            x: Math.max(0, Math.min(d.ventana.ancho - MIN, pegar(base.x + dx))),
            y: Math.max(0, Math.min(d.ventana.alto - MIN, pegar(base.y + dy)))
          };
          nodo.style.left = ultimo.x + 'px';
          nodo.style.top = ultimo.y + 'px';
        }
      };

      const soltar = () => {
        nodo.removeEventListener('pointermove', mover);
        nodo.removeEventListener('pointerup', soltar);
        nodo.removeEventListener('pointercancel', soltar);
        nodo.classList.remove('moviendo');
        /* Recién acá se toca el programa: durante el arrastre solo se movió el
           elemento en pantalla. */
        if (ultimo) cambiar(c, ultimo);
      };

      nodo.addEventListener('pointermove', mover);
      nodo.addEventListener('pointerup', soltar);
      nodo.addEventListener('pointercancel', soltar);
    }

    /* ---------------------------------------------------------------- */
    /* Teclado                                                           */
    /* ---------------------------------------------------------------- */
    function teclas(ev, c) {
      const paso = ev.shiftKey ? 10 : 1;
      const flechas = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const f = flechas[ev.key];

      if (f) {
        ev.preventDefault();
        if (ev.altKey) {
          if (!c.medible) { decir('Este control no se puede estirar desde acá.'); return; }
          cambiar(c, {
            ancho: Math.max(MIN, c.ancho + f[0] * paso),
            alto: Math.max(MIN, c.alto + f[1] * paso)
          });
        } else {
          if (!c.movible) { decir('Este control no se puede mover desde acá.'); return; }
          cambiar(c, {
            x: Math.max(0, c.x + f[0] * paso),
            y: Math.max(0, c.y + f[1] * paso)
          });
        }
        return;
      }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        ev.preventDefault();
        borrarControl(c);
      }
    }

    /* ---------------------------------------------------------------- */
    /* Abrir                                                             */
    /* ---------------------------------------------------------------- */
    function abrir() {
      if (!dlg) construir();
      elegido = -1;
      leerPrograma();
      dlg.showModal();
      avisar('diseñando la ventana');
    }

    if (cfg.boton) cfg.boton.addEventListener('click', abrir);

    return { abrir, get abierto() { return !!(dlg && dlg.open); } };
  }

  global.DisenadorUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

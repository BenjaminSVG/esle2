/*
 * El diálogo del editor de diagramas: los bloques a la izquierda, el dibujo
 * y el programa a la derecha.
 *
 * El dibujo NO se arma desde el modelo: se genera el programa, se compila y
 * se dibuja con js/diagrama.js, el mismo que usa el resto del sitio. Cuesta
 * un poco más en cada tecla, pero garantiza que lo que se ve dibujado es el
 * programa que va a salir. Si el editor dibujara por su cuenta, los dos
 * podrían separarse sin que nadie se entere, y todo el sentido de la
 * herramienta es que no se separen.
 *
 * Se redibuja con un respiro de unos milisegundos para no recompilar en cada
 * tecla mientras se escribe una condición.
 *
 * API:  DiagramaEditorUI.iniciar({ codigo, ponerCodigo, compilar, mostrarError, estado })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const DE = () => global.DiagramaEditor;
  const RESPIRO = 180;

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function boton(texto, titulo, alTocar, clase) {
    const b = nodo('button', 'btn mini-btn' + (clase ? ' ' + clase : ''), texto);
    b.type = 'button';
    b.title = titulo;
    b.setAttribute('aria-label', titulo);
    b.addEventListener('click', alTocar);
    return b;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgEditorDiagrama');
    if (!dlg) return;

    let modelo = DE().vacio();
    let reloj = null;
    let elegido = null;

    const pedirDibujo = () => {
      if (reloj) clearTimeout(reloj);
      reloj = setTimeout(dibujar, RESPIRO);
    };

    /* ------------------------- los bloques ------------------------- */
    function campoDe(b, campo) {
      const env = nodo('label', 'de-campo' + (campo.ancho === 'largo' ? ' largo' : ''));
      env.appendChild(nodo('span', 'de-etq', campo.etiqueta));
      const inp = nodo('input', 'control');
      inp.type = 'text';
      inp.value = b[campo.k] || '';
      inp.placeholder = campo.opcional ? '(opcional)' : '';
      inp.setAttribute('aria-label', campo.etiqueta);
      inp.addEventListener('input', () => { b[campo.k] = inp.value; pedirDibujo(); });
      env.appendChild(inp);
      return env;
    }

    function pintarLista(lista, contenedor, donde) {
      lista.forEach((b, i) => contenedor.appendChild(pintarBloque(b, lista, i, donde)));
      contenedor.appendChild(agregarAqui(donde));
    }

    function agregarAqui(donde) {
      const fila = nodo('div', 'de-agregar');
      for (const t of Object.keys(DE().TIPOS)) {
        const spec = DE().TIPOS[t];
        fila.appendChild(boton('+ ' + spec.nombre, spec.ayuda, () => {
          const id = DE().agregar(modelo, donde, null, t);
          elegido = id;
          pintar();
        }));
      }
      return fila;
    }

    function pintarBloque(b, lista, i, donde) {
      const spec = DE().TIPOS[b.t];
      const caja = nodo('div', 'de-bloque de-' + b.t + (b.id === elegido ? ' elegido' : ''));

      const cab = nodo('div', 'de-cab');
      cab.appendChild(nodo('span', 'de-tipo', spec.nombre));
      cab.appendChild(nodo('span', 'de-forma', spec.forma));
      const acciones = nodo('span', 'de-acciones');
      acciones.append(
        boton('↑', 'Subir este bloque', () => { if (DE().mover(modelo, b.id, -1)) pintar(); }),
        boton('↓', 'Bajar este bloque', () => { if (DE().mover(modelo, b.id, 1)) pintar(); }),
        boton('✕', 'Borrar este bloque y lo que tenga adentro', () => {
          if (DE().borrar(modelo, b.id)) { elegido = null; pintar(); }
        }, 'borrar'));
      cab.appendChild(acciones);
      caja.appendChild(cab);

      const campos = nodo('div', 'de-campos');
      for (const c of spec.campos) campos.appendChild(campoDe(b, c));
      caja.appendChild(campos);

      /* Las ramas de adentro, cada una con su nombre. */
      for (const rama of spec.hijos) {
        const sub = nodo('div', 'de-rama');
        sub.appendChild(nodo('div', 'de-rama-tit',
          rama === 'entonces' ? 'Si se cumple' : rama === 'sino' ? 'Si no se cumple' : 'Se repite'));
        const dentro = nodo('div', 'de-rama-cuerpo');
        pintarLista(b[rama], dentro, { id: b.id, rama });
        sub.appendChild(dentro);
        caja.appendChild(sub);
      }
      return caja;
    }

    /* ----------------------- las declaraciones --------------------- */
    function pintarCabecera() {
      const caja = $('#deCabecera');
      caja.replaceChildren();

      const nom = nodo('label', 'de-campo');
      nom.appendChild(nodo('span', 'de-etq', 'Nombre del programa'));
      const inp = nodo('input', 'control');
      inp.type = 'text';
      inp.value = modelo.nombre || '';
      inp.placeholder = '(opcional)';
      inp.setAttribute('aria-label', 'Nombre del programa');
      inp.addEventListener('input', () => { modelo.nombre = inp.value; pedirDibujo(); });
      nom.appendChild(inp);
      caja.appendChild(nom);

      const vars = nodo('div', 'de-vars');
      modelo.vars.forEach((v, i) => {
        const fila = nodo('div', 'de-var');
        const n = nodo('input', 'control');
        n.type = 'text';
        n.value = v.nombres;
        n.placeholder = 'n, total';
        n.setAttribute('aria-label', 'Nombres de las variables');
        n.addEventListener('input', () => { v.nombres = n.value; pedirDibujo(); });
        const t = nodo('select', 'control mini-select');
        for (const x of ['numerico', 'cadena', 'logico']) {
          const o = nodo('option', null, x);
          o.value = x;
          if (v.tipo === x) o.selected = true;
          t.appendChild(o);
        }
        t.setAttribute('aria-label', 'Tipo de las variables');
        t.addEventListener('change', () => { v.tipo = t.value; pedirDibujo(); });
        fila.append(n, t, boton('✕', 'Borrar esta declaración', () => {
          modelo.vars.splice(i, 1);
          pintar();
        }, 'borrar'));
        vars.appendChild(fila);
      });
      vars.appendChild(boton('+ Variables', 'Agregar una declaración', () => {
        modelo.vars.push({ nombres: '', tipo: 'numerico' });
        pintar();
      }));
      caja.appendChild(vars);
    }

    /* --------------------------- dibujar --------------------------- */
    function dibujar() {
      const codigo = DE().codigo(modelo);
      $('#deCodigo').textContent = codigo;

      const caja = $('#deDibujo');
      caja.replaceChildren();
      let ast = null, err = null;
      try { ast = global.SLE2.compilar(codigo); } catch (e) { err = e; }

      if (err) {
        /* Pasa mientras se escribe una condición a medio terminar: se avisa
           en el mismo lugar del dibujo y no se rompe nada. */
        $('#deAviso').textContent = 'Todavía no se puede dibujar: ' + err.message
          + (err.linea ? ' (línea ' + err.linea + ')' : '');
        $('#deAviso').classList.remove('oculto');
        return;
      }
      $('#deAviso').classList.add('oculto');

      const rutinas = global.Diagrama.generar(ast);
      if (rutinas.length) caja.innerHTML = rutinas[0].svg;
      $('#deResumen').textContent = contar(modelo) + ' bloque(s)';
    }

    function contar(m) {
      let n = 0;
      for (const { lista } of DE().listas(m)) n += lista.length;
      return n;
    }

    function pintar() {
      pintarCabecera();
      const caja = $('#deBloques');
      caja.replaceChildren();
      pintarLista(modelo.cuerpo, caja, null);
      dibujar();
    }

    /* --------------------------- acciones -------------------------- */
    function abrir() {
      pintar();
      dlg.showModal();
    }

    function traer() {
      let ast;
      try { ast = cfg.compilar(); }
      catch (e) { cfg.mostrarError(e); return; }
      const r = DE().desdeAST(ast);
      if (!r) return;
      modelo = r.modelo;
      elegido = null;
      pintar();
      if (r.resto.length) {
        const que = r.resto.map(x => x.t + (x.linea ? ' (línea ' + x.linea + ')' : '')).join(', ');
        $('#deAviso').textContent = 'Esto no entra en un diagrama de una sola rutina y quedó afuera: '
          + que + '. Si pasás el diagrama al editor, se pierde.';
        $('#deAviso').classList.remove('oculto');
      }
    }

    function pasar() {
      const codigo = DE().codigo(modelo);
      try { global.SLE2.compilar(codigo); }
      catch (e) { cfg.mostrarError(e); return; }
      cfg.ponerCodigo(codigo);
      dlg.close();
      if (cfg.estado) cfg.estado('programa armado desde el diagrama', 'ok');
    }

    $('#btnEditorDiagrama').addEventListener('click', abrir);
    $('#deTraer').addEventListener('click', traer);
    $('#dePasar').addEventListener('click', pasar);
    $('#deLimpiar').addEventListener('click', () => {
      modelo = DE().vacio();
      elegido = null;
      pintar();
    });
    $('#btnCerrarEditorDiagrama').addEventListener('click', () => dlg.close());
    dlg.addEventListener('close', () => { if (reloj) clearTimeout(reloj); reloj = null; });
  }

  global.DiagramaEditorUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * El editor del diagrama: tablas y columnas a la izquierda, el dibujo y el
 * código a la derecha, los tres al mismo tiempo.
 *
 * Cada vez que se toca algo se vuelve a dibujar y se vuelve a escribir el
 * código: es la forma de que se entienda que el diagrama y el código son la
 * misma cosa dicha de dos maneras, que es justamente lo que cuesta ver.
 *
 * Toda la lógica está en js/editor-bd.js; acá solo se arma el DOM.
 *
 * API:  EditorBDUI.iniciar({ tablas, usar, avisar })
 *         tablas()      -> lo que devuelve SQL.tablas(base)
 *         usar(codigo)  -> escribir el programa generado en el editor
 *         avisar(texto) -> el mensajito de estado de la página
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const E = () => global.EditorBD;

  function opcion(valor, texto, elegido) {
    const o = document.createElement('option');
    o.value = valor; o.textContent = texto; o.selected = elegido;
    return o;
  }

  function campo(etiqueta, control) {
    const l = document.createElement('label');
    l.className = 'db-campo';
    const s = document.createElement('span');
    s.textContent = etiqueta;
    l.append(s, control);
    return l;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgEditorBD');
    if (!dlg) return;
    let modelo = E().vacio();

    /* ---------------------------- pintar ---------------------------- */
    function pintar() {
      pintarTablas();
      const d = global.DiagramaBD.generar(modelo.tablas.map(t => ({ ...t, filas: 0 })));
      $('#dibujoEditorBD').innerHTML = d.svg;

      const malos = E().problemas(modelo);
      const ul = $('#problemasBD');
      ul.replaceChildren();
      ul.classList.toggle('oculto', !malos.length);
      for (const p of malos) {
        const li = document.createElement('li');
        li.textContent = p.donde + ': ' + p.mensaje;
        ul.appendChild(li);
      }
      $('#codigoBD').textContent = malos.length
        ? '// Arreglá lo de arriba y el código aparece acá.\n'
        : E().codigo(modelo);
      $('#btnUsarCodigoBD').disabled = malos.length > 0;
      $('#btnCopiarCodigoBD').disabled = malos.length > 0;
    }

    /* Una tabla: su nombre, sus columnas y los botones para agregar y sacar. */
    function pintarTablas() {
      const cont = $('#tablasBD');
      cont.replaceChildren();
      if (!modelo.tablas.length) {
        const p = document.createElement('p');
        p.className = 'nota';
        p.textContent = 'Todavía no hay ninguna tabla. Empezá con «Agregar una tabla».';
        cont.appendChild(p);
        return;
      }

      modelo.tablas.forEach((t, i) => {
        const caja = document.createElement('section');
        caja.className = 'db-tabla';

        const cab = document.createElement('div');
        cab.className = 'db-tabla-cabeza';
        const nom = document.createElement('input');
        nom.type = 'text'; nom.value = t.nombre; nom.className = 'db-nombre';
        nom.setAttribute('aria-label', 'Nombre de la tabla');
        nom.addEventListener('input', () => { t.nombre = nom.value.trim(); pintar(); });
        const quitar = document.createElement('button');
        quitar.type = 'button'; quitar.className = 'btn chico'; quitar.textContent = 'Quitar';
        quitar.title = 'Sacar esta tabla del diagrama';
        quitar.addEventListener('click', () => { modelo.tablas.splice(i, 1); pintar(); });
        cab.append(nom, quitar);
        caja.appendChild(cab);

        t.columnas.forEach((c, j) => caja.appendChild(filaColumna(t, c, j)));

        const mas = document.createElement('button');
        mas.type = 'button'; mas.className = 'btn chico'; mas.textContent = 'Agregar una columna';
        mas.addEventListener('click', () => { t.columnas.push(E().columna('columna')); pintar(); });
        caja.appendChild(mas);
        cont.appendChild(caja);
      });
    }

    function filaColumna(t, c, j) {
      const fila = document.createElement('div');
      fila.className = 'db-columna';

      const nom = document.createElement('input');
      nom.type = 'text'; nom.value = c.nombre;
      nom.setAttribute('aria-label', 'Nombre de la columna');
      nom.addEventListener('input', () => { c.nombre = nom.value.trim(); pintar(); });

      const tipo = document.createElement('input');
      tipo.type = 'text'; tipo.value = c.tipo; tipo.className = 'db-tipo-campo';
      tipo.setAttribute('list', 'tiposBD');
      tipo.setAttribute('aria-label', 'Tipo de la columna');
      tipo.addEventListener('input', () => { c.tipo = tipo.value.trim().toUpperCase(); pintar(); });

      const pk = document.createElement('input');
      pk.type = 'checkbox'; pk.checked = c.pk;
      pk.addEventListener('change', () => {
        c.pk = pk.checked;
        if (c.pk) { c.noNulo = true; t.columnas.forEach(o => { if (o !== c) o.pk = false; }); }
        pintar();
      });

      const nn = document.createElement('input');
      nn.type = 'checkbox'; nn.checked = c.noNulo; nn.disabled = c.pk;
      nn.addEventListener('change', () => { c.noNulo = nn.checked; pintar(); });

      /* La relación: a qué tabla apunta. Solo se ofrecen las columnas que
         pueden recibir una flecha —clave primaria o única—, así no se puede
         armar una relación que después el motor rechazaría. */
      const rel = document.createElement('select');
      rel.setAttribute('aria-label', 'A qué columna apunta');
      rel.appendChild(opcion('', 'no apunta a nada', !c.refiere));
      for (const otra of modelo.tablas) {
        for (const dest of otra.columnas) {
          if (!dest.pk && !dest.unico) continue;
          if (otra === t && dest === c) continue;
          const v = otra.nombre + '.' + dest.nombre;
          rel.appendChild(opcion(v, v,
            !!c.refiere && c.refiere.tabla === otra.nombre && c.refiere.columna === dest.nombre));
        }
      }
      rel.addEventListener('change', () => {
        if (!rel.value) { c.refiere = null; }
        else {
          const corte = rel.value.lastIndexOf('.');
          c.refiere = { tabla: rel.value.slice(0, corte), columna: rel.value.slice(corte + 1) };
        }
        pintar();
      });

      const quitar = document.createElement('button');
      quitar.type = 'button'; quitar.className = 'btn chico';
      quitar.textContent = '×';
      quitar.title = 'Sacar la columna "' + c.nombre + '"';
      quitar.setAttribute('aria-label', 'Sacar la columna ' + c.nombre);
      quitar.addEventListener('click', () => { t.columnas.splice(j, 1); pintar(); });

      fila.append(nom, tipo, campo('clave', pk), campo('sin NULL', nn), rel, quitar);
      return fila;
    }

    /* ---------------------------- acciones -------------------------- */
    function abrir() {
      if (!modelo.tablas.length) traerDeLaBase();
      pintar();
      dlg.showModal();
    }

    function traerDeLaBase() {
      const t = cfg.tablas();
      modelo = t.length ? E().desdeBase(t) : E().vacio();
      if (!modelo.tablas.length) modelo.tablas.push(E().tabla('alumnos'));
    }

    $('#btnEditorBD').addEventListener('click', abrir);
    $('#btnCerrarEditorBD').addEventListener('click', () => dlg.close());
    $('#btnNuevaTablaBD').addEventListener('click', () => {
      let n = 'tabla' + (modelo.tablas.length + 1);
      while (modelo.tablas.some(t => t.nombre === n)) n += '_';
      modelo.tablas.push(E().tabla(n));
      pintar();
    });
    $('#btnTraerBaseBD').addEventListener('click', () => { traerDeLaBase(); pintar(); });

    $('#btnBajarEditorBD').addEventListener('click', () => {
      const d = global.DiagramaBD.generar(modelo.tablas.map(t => ({ ...t, filas: 0 })));
      global.DiagramaBDUI.bajar(d.svg, 'diagrama-de-la-base.svg');
    });

    $('#btnCopiarCodigoBD').addEventListener('click', async () => {
      const t = E().codigo(modelo);
      try { await navigator.clipboard.writeText(t); if (cfg.avisar) cfg.avisar('código copiado'); }
      catch (e) { prompt('Copiá el código:', t); }
    });

    $('#btnUsarCodigoBD').addEventListener('click', () => {
      cfg.usar(E().codigo(modelo));
      dlg.close();
    });
  }

  global.EditorBDUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * El curso de ESLE2 BD en la página: la lista, el enunciado y el botón de
 * corregir.
 *
 * Todo lo que decide si un ejercicio está bien vive en js/verificar-bd.js, que
 * no toca el DOM y se prueba en Node. Acá solo está lo que se ve.
 *
 * Se engancha con el IDE por un objeto chico —`api`— en vez de meterse en
 * bd-app.js: el curso necesita exactamente tres cosas del editor (leer el
 * programa, escribirlo, y refrescarlo) y no tiene por qué saber nada más.
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const COOKIE = 'esle2_progreso_bd';

  const NIVELES = { facil: 'Fácil', medio: 'Medio', dificil: 'Difícil' };

  function leerProgreso() {
    const p = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='));
    try { return p ? JSON.parse(decodeURIComponent(p.slice(COOKIE.length + 1))) : {}; }
    catch (e) { return {}; }
  }
  function grabarProgreso(p) {
    document.cookie = COOKIE + '=' + encodeURIComponent(JSON.stringify(p))
      + '; expires=' + new Date(Date.now() + 365 * 864e5).toUTCString()
      + '; path=/' + '; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }

  function arrancar(api) {
    const EJERCICIOS = (global.CURSO_BD || { EJERCICIOS: [] }).EJERCICIOS;
    const lista = $('#listaEjerciciosBD');
    const detalle = $('#detalleEjercicioBD');
    if (!lista || !detalle || !EJERCICIOS.length) return null;

    let progreso = leerProgreso();
    let filtro = 'todos';
    let actual = null;

    /* ---------------------------- la lista --------------------------- */
    function pintarLista() {
      const visibles = EJERCICIOS.filter(e => filtro === 'todos' || e.nivel === filtro);
      lista.innerHTML = '';
      for (const e of visibles) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'ej' + (progreso[e.id] ? ' hecho' : '')
          + (actual && actual.id === e.id ? ' actual' : '');
        b.setAttribute('aria-current', actual && actual.id === e.id ? 'true' : 'false');
        b.innerHTML = '<span class="ej-nivel">' + NIVELES[e.nivel] + '</span>'
          + '<span class="ej-titulo"></span>'
          + (progreso[e.id] ? '<span class="ej-tilde" aria-hidden="true">✓</span>' : '');
        b.querySelector('.ej-titulo').textContent = e.titulo;
        if (progreso[e.id]) b.title = 'Resuelto';
        b.addEventListener('click', () => elegir(e));
        li.appendChild(b);
        lista.appendChild(li);
      }
      const hechos = EJERCICIOS.filter(e => progreso[e.id]).length;
      const cuenta = $('#cuentaBD');
      if (cuenta) cuenta.textContent = hechos + ' de ' + EJERCICIOS.length;
    }

    /* --------------------------- el detalle -------------------------- */
    function elegir(e) {
      actual = e;
      detalle.innerHTML = '';

      const h = document.createElement('h2');
      h.textContent = e.titulo;
      detalle.appendChild(h);

      const nivel = document.createElement('p');
      nivel.className = 'mini';
      nivel.textContent = NIVELES[e.nivel] + (progreso[e.id] ? ' · resuelto' : '');
      detalle.appendChild(nivel);

      const enun = document.createElement('div');
      enun.className = 'enunciado';
      /* Por js/seguro.js, como en los otros tres cursos: hoy los ejercicios de
         BD son todos nuestros, pero el que pinta no tiene por qué saberlo. */
      enun.innerHTML = Seguro.html(e.enunciado);
      detalle.appendChild(enun);

      /* La pista arranca cerrada: leerla antes de intentar es la forma más
         rápida de no aprender nada. */
      const pista = document.createElement('details');
      pista.className = 'pista';
      const resumen = document.createElement('summary');
      resumen.textContent = 'Una pista';
      pista.appendChild(resumen);
      const cuerpo = document.createElement('div');
      cuerpo.innerHTML = Seguro.html(e.pista);
      pista.appendChild(cuerpo);
      detalle.appendChild(pista);

      const fila = document.createElement('div');
      fila.className = 'dlg-fila';
      const cargar = document.createElement('button');
      cargar.className = 'btn';
      cargar.type = 'button';
      cargar.textContent = 'Poner la plantilla en el editor';
      cargar.addEventListener('click', () => { api.escribir(e.plantilla); api.irAlIDE(); });
      const corregir = document.createElement('button');
      corregir.className = 'btn primario';
      corregir.type = 'button';
      corregir.textContent = 'Corregir';
      corregir.addEventListener('click', () => revisar(e, corregir));
      fila.appendChild(cargar);
      fila.appendChild(corregir);
      detalle.appendChild(fila);

      const res = document.createElement('div');
      res.className = 'resultado-curso';
      res.id = 'resultadoBD';
      res.setAttribute('role', 'status');
      detalle.appendChild(res);

      pintarLista();
      detalle.focus();
    }

    /* -------------------------- la corrección ------------------------ */
    async function revisar(e, boton) {
      const res = $('#resultadoBD');
      const fuente = api.leer();
      boton.disabled = true;
      res.className = 'resultado-curso';
      res.textContent = 'Corrigiendo…';

      const partes = [];
      let todas = true;
      for (const p of e.pruebas) {
        let r;
        try {
          r = await global.VerificarBD.correr(fuente, p);
        } catch (err) {
          r = { ok: false, fallos: ['No se pudo correr el programa: ' + (err && err.message)] };
        }
        if (!r.ok) todas = false;
        partes.push({ nombre: p.nombre, ok: r.ok, fallos: r.fallos });
      }

      res.innerHTML = '';
      const titulo = document.createElement('p');
      titulo.className = 'resultado-titulo';
      titulo.textContent = todas ? '¡Bien! Pasó todo.' : 'Todavía no.';
      res.appendChild(titulo);

      const ul = document.createElement('ul');
      for (const p of partes) {
        const li = document.createElement('li');
        li.className = p.ok ? 'bien' : 'mal';
        const n = document.createElement('strong');
        n.textContent = (p.ok ? '✓ ' : '✗ ') + p.nombre;
        li.appendChild(n);
        /* Un solo fallo por prueba: la lista entera abruma y el primero suele
           ser la causa de los otros. */
        if (!p.ok && p.fallos.length) {
          const d = document.createElement('div');
          d.className = 'porque';
          d.textContent = p.fallos[0]
            + (p.fallos.length > 1 ? ' (y ' + (p.fallos.length - 1) + ' cosa(s) más)' : '');
          li.appendChild(d);
        }
        ul.appendChild(li);
      }
      res.appendChild(ul);
      res.classList.add(todas ? 'ok' : 'nok');

      if (todas && !progreso[e.id]) {
        progreso[e.id] = true;
        grabarProgreso(progreso);
      }
      pintarLista();
      boton.disabled = false;
    }

    /* --------------------------- los filtros ------------------------- */
    const filtros = $('#filtrosBD');
    if (filtros) {
      filtros.addEventListener('click', ev => {
        const b = ev.target.closest('.chip');
        if (!b) return;
        filtro = b.dataset.nivel;
        filtros.querySelectorAll('.chip').forEach(x => {
          const activa = x === b;
          x.classList.toggle('activa', activa);
          x.setAttribute('aria-pressed', String(activa));
        });
        pintarLista();
      });
    }

    const reiniciar = $('#btnReiniciarBD');
    if (reiniciar) {
      reiniciar.addEventListener('click', () => {
        if (!global.confirm('¿Borrar tu avance del curso de BD? No se puede deshacer.')) return;
        progreso = {};
        grabarProgreso(progreso);
        pintarLista();
      });
    }

    pintarLista();
    return { pintarLista, elegir };
  }

  global.CursoBDUI = { arrancar, COOKIE };
})(typeof window !== 'undefined' ? window : globalThis);

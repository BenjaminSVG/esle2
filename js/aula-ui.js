/*
 * Modo aula, la parte que se ve.
 *
 * Dos caras de lo mismo:
 *
 *   · el profesor abre «Modo aula…», marca los ejercicios que entran, le pone
 *     un título y un mensaje a la guía, y copia un enlace;
 *   · el alumno abre ese enlace y el curso pasa a ser esa guía: arriba de la
 *     lista aparece el título con el mensaje del profesor, y abajo solo esos
 *     ejercicios, que se corrigen solos como cualquier otro.
 *
 * El diálogo se arma acá y no en el HTML, igual que «Mis ejercicios», así las
 * páginas que lo usan solo tienen que cargar el archivo.
 *
 * Toda la lógica —armar la guía, meterla en el enlace, sacarla— está en
 * js/aula.js. Acá solo hay DOM.
 *
 * API:  AulaUI.crear({ lenguaje, catalogo, propios, entregar, verEntregas })
 *         -> { abrir(), banner(guia, faltan, destino) }
 */
(function (global) {
  'use strict';

  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };

  function crear(cfg) {
    const { lenguaje, catalogo, propios } = cfg;
    let dlg = null;
    let marcados = new Set();

    /* ------------------------------ armar --------------------------- */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      dlg.innerHTML = `
        <h3>Modo aula</h3>
        <p class="nota">Armá una guía con los ejercicios que quieras y repartila como un enlace.
           Tus alumnos la abren y ven esos ejercicios, que se corrigen solos con los casos de
           prueba de cada uno. <strong>La guía viaja adentro del enlace</strong>: no hay servidor,
           no hay cuentas y no se guarda en ninguna parte.</p>

        <div class="mis-grilla">
          <label>Título de la guía
            <input type="text" data-campo="nombre" maxlength="80" placeholder="Práctica 3: ciclos">
          </label>
          <label>Lenguaje
            <input type="text" data-campo="lenguaje" readonly>
          </label>
        </div>
        <label>Mensaje para la clase
          <textarea data-campo="mensaje" rows="2" maxlength="400"
            placeholder="Para el viernes. Los tres primeros son obligatorios."></textarea>
        </label>

        <div class="dlg-fila">
          <strong data-campo="cuenta">Ningún ejercicio elegido</strong>
          <span class="crece"></span>
          <button class="btn" data-accion="entregas">Ver entregas…</button>
          <button class="btn" data-accion="ninguno">Desmarcar todos</button>
        </div>
        <ul class="aula-lista" data-campo="lista"></ul>

        <p class="mis-error" data-campo="error"></p>
        <label>Enlace para repartir
          <textarea data-campo="enlace" rows="3" spellcheck="false" readonly
            placeholder="Elegí al menos un ejercicio y aparece acá."></textarea>
        </label>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="copiar">Copiar el enlace</button>
          <button class="btn" data-accion="probar">Abrirlo para probar</button>
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);
      $$('lenguaje').value = lenguaje;

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'ninguno') { marcados.clear(); pintar(); }
        else if (a === 'copiar') copiar();
        else if (a === 'probar') probar();
        else if (a === 'entregas' && cfg.verEntregas) { dlg.close(); cfg.verEntregas(); }
      });

      dlg.addEventListener('change', ev => {
        const c = ev.target.closest('input[type="checkbox"][data-id]');
        if (!c) return;
        if (c.checked) marcados.add(c.dataset.id); else marcados.delete(c.dataset.id);
        refrescar();
      });

      /* Sin visor de entregas no se ofrece el botón: un botón que no hace
         nada es peor que no tenerlo. */
      if (!cfg.verEntregas) dlg.querySelector('[data-accion="entregas"]').remove();

      $$('nombre').addEventListener('input', refrescar);
      $$('mensaje').addEventListener('input', refrescar);
    }

    const todos = () => catalogo().concat(propios ? propios() : []);

    /* La lista, agrupada por nivel: es como se elige de verdad —«los tres
       fáciles y uno medio»— y no ejercicio por ejercicio. */
    function pintar() {
      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);
      const ul = $$('lista');
      ul.replaceChildren();
      const lista = todos();
      const delCurso = new Set(catalogo().map(e => e.id));

      for (const nivel of ['facil', 'medio', 'avanzado']) {
        const enNivel = lista.filter(e => (e.nivel || 'facil') === nivel);
        if (!enNivel.length) continue;
        const cab = document.createElement('li');
        cab.className = 'aula-nivel';
        cab.textContent = NIVELES[nivel];
        ul.appendChild(cab);

        for (const e of enNivel) {
          const li = document.createElement('li');
          const lab = document.createElement('label');
          const c = document.createElement('input');
          c.type = 'checkbox';
          c.dataset.id = e.id;
          c.checked = marcados.has(e.id);
          const t = document.createElement('span');
          t.textContent = e.titulo;
          lab.append(c, t);
          if (!delCurso.has(e.id)) {
            const etq = document.createElement('span');
            etq.className = 'etq';
            etq.textContent = 'tuyo';
            etq.title = 'Un ejercicio tuyo: viaja entero adentro del enlace, con sus casos de prueba.';
            lab.appendChild(etq);
          }
          li.appendChild(lab);
          ul.appendChild(li);
        }
      }
      refrescar();
    }

    function guiaActual() {
      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);
      const lista = todos();
      const elegidos = lista.filter(e => marcados.has(e.id));
      return global.Aula.desdeEjercicios($$('nombre').value, $$('mensaje').value,
        lenguaje, elegidos, catalogo());
    }

    /* Cada cambio rehace el enlace: así se ve enseguida que la guía entra en
       un enlace y cuánto ocupa, en vez de descubrirlo al pegarlo. */
    async function refrescar() {
      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);
      $$('cuenta').textContent = marcados.size === 0 ? 'Ningún ejercicio elegido'
        : marcados.size === 1 ? '1 ejercicio elegido'
          : marcados.size + ' ejercicios elegidos';

      const guia = guiaActual();
      const malos = global.Aula.problemas(guia);
      $$('error').textContent = malos.length ? 'Falta algo: ' + malos.join('; ') + '.' : '';
      const listo = !malos.length;
      dlg.querySelector('[data-accion="copiar"]').disabled = !listo;
      dlg.querySelector('[data-accion="probar"]').disabled = !listo;
      $$('enlace').value = listo ? await global.Aula.enlace(guia, destinoBase()) : '';
    }

    /* El enlace apunta a la página del curso de este lenguaje. */
    const destinoBase = () => location.origin + location.pathname;

    async function copiar() {
      const t = dlg.querySelector('[data-campo="enlace"]').value;
      if (!t) return;
      try {
        await navigator.clipboard.writeText(t);
        dlg.querySelector('[data-campo="error"]').textContent = 'Enlace copiado.';
      } catch (e) {
        const campo = dlg.querySelector('[data-campo="enlace"]');
        campo.focus(); campo.select();
      }
    }

    function probar() {
      const t = dlg.querySelector('[data-campo="enlace"]').value;
      if (t) window.open(t, '_blank', 'noopener');
    }

    function abrir() {
      if (!dlg) construir();
      pintar();
      dlg.showModal();
    }

    /* ----------------------------- el alumno ------------------------ */
    /* El cartel de arriba de la lista: de qué guía se trata, qué dijo el
       profesor y cómo salir. */
    function banner(guia, faltan, contenedor, alSalir) {
      const viejo = contenedor.querySelector('.aula-banner');
      if (viejo) viejo.remove();
      if (!guia) return;

      const caja = document.createElement('section');
      caja.className = 'aula-banner';
      caja.setAttribute('aria-label', 'Guía de la clase');

      /* h2 y no h3: en el curso el título de arriba es el h1 de la barra, y
         saltarse un nivel deja el lector de pantalla sin el escalón del medio. */
      const h = document.createElement('h2');
      h.textContent = guia.n;
      caja.appendChild(h);

      if (guia.m) {
        const p = document.createElement('p');
        p.textContent = guia.m;
        caja.appendChild(p);
      }
      if (faltan && faltan.length) {
        const p = document.createElement('p');
        p.className = 'aula-faltan';
        p.textContent = faltan.length === 1
          ? 'Un ejercicio de la guía ya no está en el curso y no se puede mostrar.'
          : faltan.length + ' ejercicios de la guía ya no están en el curso y no se pueden mostrar.';
        caja.appendChild(p);
      }

      /* Entregar: junta lo que el alumno escribió en cada ejercicio de la
         guía, lo corrige acá mismo y baja un archivo para el profesor. Es el
         camino de vuelta que a la guía le faltaba. */
      if (cfg.entregar) {
        const ent = document.createElement('button');
        ent.type = 'button';
        ent.className = 'btn chico primario';
        ent.textContent = 'Entregar la guía';
        ent.title = 'Corregir lo que hiciste y bajar el archivo para tu profesor';
        ent.addEventListener('click', async () => {
          const nombre = prompt('¿Cómo te llamás? Va en la entrega, para que tu profesor sepa de quién es.',
            localStorage.getItem('esle2_alumno') || '');
          if (nombre === null) return;
          if (!nombre.trim()) { alert('Sin tu nombre la entrega no sirve: el profesor no sabría de quién es.'); return; }
          localStorage.setItem('esle2_alumno', nombre.trim());
          ent.disabled = true;
          const antes = ent.textContent;
          ent.textContent = 'corrigiendo…';
          try { await cfg.entregar(nombre.trim()); }
          catch (e) { alert('No se pudo entregar: ' + (e.message || e)); }
          finally { ent.disabled = false; ent.textContent = antes; }
        });
        caja.appendChild(ent);
      }

      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn chico';
      b.textContent = 'Salir de la guía';
      b.title = 'Volver al curso completo';
      b.addEventListener('click', alSalir);
      caja.appendChild(b);

      contenedor.prepend(caja);
    }

    return { abrir, banner };
  }

  global.AulaUI = { crear };
})(typeof window !== 'undefined' ? window : globalThis);

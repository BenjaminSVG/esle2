/*
 * Programar en grupo, la parte que se ve.
 *
 * Dos personas, o toda la clase, escribiendo el mismo programa. Usa Yjs
 * (vendido en vendor/yjs/) para que los editores se junten solos sin pisarse,
 * y js/sala-ui.js para el transporte: sobres cerrados que un relevo reparte
 * sin poder leerlos. El porqué de ese camino —y no el directo entre máquinas,
 * que en una escuela no anda— está arriba de js/sala.js.
 *
 * El paquete de Yjs pesa 214 KB y se carga SOLO al abrir este diálogo, no en
 * cada visita. Tampoco se guarda para usar sin conexión, por la razón obvia:
 * es lo único del sitio que sin internet no puede andar.
 *
 * Lo que NO se comparte: la entrada de datos, la salida, la base de ESLE2 BD,
 * el progreso del curso. Se comparte el texto del programa, que es lo que se
 * escribe entre varios. Cada uno lo ejecuta en su máquina.
 *
 * API:  JuntosUI.iniciar({ editor, boton, estado })
 */
(function (global) {
  'use strict';

  const PAQUETE = 'vendor/yjs/juntos.min.js';
  const CLAVE_NOMBRE = 'esle2_juntos_nombre';
  const CLAVE_COPIA = 'esle2_antes_de_la_sala';

  /* El paquete se trae una sola vez, la primera vez que hace falta. */
  let cargando = null;
  function cargarYjs() {
    if (global.Yjs) return Promise.resolve(global.Yjs);
    if (cargando) return cargando;
    cargando = new Promise((listo, falla) => {
      const s = document.createElement('script');
      s.src = PAQUETE;
      s.onload = () => (global.Yjs ? listo(global.Yjs) : falla(new Error('el paquete cargó vacío')));
      s.onerror = () => falla(new Error('no se pudo cargar ' + PAQUETE));
      document.head.appendChild(s);
    });
    return cargando;
  }

  const crear = (etiqueta, clase, texto) => {
    const e = document.createElement(etiqueta);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  };

  function iniciar(cfg) {
    const editor = cfg.editor;
    const avisar = cfg.estado || (() => {});
    let dlg = null, barra = null;
    let doc = null, prov = null, atadura = null;
    let sala = null, clave = null, relevo = null;
    let invitado = null;                 // la sala que vino en el enlace

    const enSala = () => !!prov;

    /* ----------------------------- el diálogo ------------------------ */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-juntos';
      dlg.innerHTML = `
        <h3>Programar en grupo</h3>
        <p class="nota">Todos ven y escriben el mismo programa, cada uno desde su computadora.
           Lo que se escribe viaja <strong>cifrado</strong>: el servidor que lo reparte no puede
           leerlo.</p>

        <div class="juntos-paso" data-paso="afuera">
          <label class="juntos-alias">Cómo te ven
            <input type="text" data-campo="nombre" maxlength="24" autocomplete="off"
              class="control" spellcheck="false">
          </label>

          <div class="juntos-invitacion oculto" data-campo="invitacion">
            <p class="juntos-titulo" data-campo="invitacion-que"></p>
            <ul class="juntos-avisos">
              <li>Lo que tenés escrito ahora se reemplaza por el programa de la sala.
                  Se guarda una copia antes.</li>
              <li>Cualquiera que tenga este enlace puede entrar y escribir.</li>
              <li>El nombre que muestra cada uno lo elige cada uno: no dice quién es.</li>
            </ul>
          </div>

          <div class="dlg-fila">
            <button class="btn primario" data-accion="entrar">Entrar a la sala</button>
            <button class="btn primario" data-accion="crear">Crear una sala</button>
          </div>
        </div>

        <div class="juntos-paso oculto" data-paso="adentro">
          <div class="juntos-estado" data-campo="estado" aria-live="polite"></div>

          <label>Enlace para tus compañeros
            <div class="juntos-enlace">
              <input type="text" data-campo="enlace" readonly spellcheck="false" class="control">
              <button class="btn" data-accion="copiar">Copiar</button>
            </div>
          </label>

          <p class="juntos-titulo">En la sala</p>
          <ul class="juntos-gente" data-campo="gente" aria-live="polite"
              aria-label="Quiénes están en la sala"></ul>

          <div class="dlg-fila">
            <button class="btn peligro" data-accion="salir">Salir de la sala</button>
          </div>
        </div>

        <p class="mis-error" data-campo="error" aria-live="assertive"></p>

        <details class="juntos-avanzado">
          <summary>Para el profesor: el servidor de la escuela</summary>
          <p class="nota">ESLE2 no trae ningún servidor puesto: no hay uno público que se pueda
             recomendar. Publicar el propio es gratis y son tres comandos, están en
             <code>servidor-senas/cloudflare</code>. Cuando lo tengas, pegá su dirección acá una
             vez por computadora, o repartí el enlace de la sala, que ya la lleva adentro.</p>
          <div class="juntos-enlace">
            <input type="text" data-campo="relevo" class="control" spellcheck="false"
              placeholder="wss://esle2-senas.tu-usuario.workers.dev">
            <button class="btn" data-accion="guardar-relevo">Guardar</button>
          </div>
        </details>

        <div class="doc-nota">Se comparte <strong>solo el texto del programa</strong>: la entrada,
          la salida y tu progreso del curso siguen siendo tuyos, y cada uno ejecuta en su máquina.</div>

        <div class="dlg-fila derecha">
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const nom = campo('nombre');
      let guardado = '';
      try { guardado = localStorage.getItem(CLAVE_NOMBRE) || ''; } catch (e) { /* modo privado */ }
      nom.value = guardado || global.Juntos.nombreSugerido();
      nom.addEventListener('input', () => {
        try { localStorage.setItem(CLAVE_NOMBRE, nom.value); } catch (e) { /* almacén lleno */ }
        if (prov) {
          const n = global.Sala.alias(nom.value);
          prov.vecinos.setLocalStateField('user',
            { name: n, color: global.Sala.colorDe(n), papel: 'edita' });
          pintarGente();
        }
      });

      try { campo('relevo').value = localStorage.getItem('esle2_senas') || ''; }
      catch (e) { /* modo privado */ }

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'crear') nueva();
        else if (a === 'entrar') entrar();
        else if (a === 'salir') salir();
        else if (a === 'copiar') copiar();
        else if (a === 'guardar-relevo') guardarRelevo();
      });
    }

    const campo = c => dlg.querySelector('[data-campo="' + c + '"]');
    const paso = p => dlg.querySelector('[data-paso="' + p + '"]');
    const accion = a => dlg.querySelector('[data-accion="' + a + '"]');
    const miAlias = () => global.Sala.alias(campo('nombre').value);

    /* ------------------------------ conectar ------------------------- */

    async function conectar(s, c, r, soyPrimero) {
      let Y;
      try {
        estadoDelDialogo('trayendo lo necesario…');
        Y = await cargarYjs();
      } catch (e) {
        campo('error').textContent = 'No se pudo cargar lo necesario para conectarse. '
          + '¿Estás sin internet? Esta es la única parte de ESLE2 que lo necesita.';
        return;
      }

      sala = s; clave = c; relevo = r || null;

      /* El programa se guarda ANTES de atar el editor: al atarlo, y-codemirror
         reemplaza su contenido por el del documento compartido, y ya no
         habría de dónde sacarlo. */
      const mio = editor.getValue();
      try { if (mio.trim()) localStorage.setItem(CLAVE_COPIA, mio); }
      catch (e) { /* almacén lleno: se sigue igual, la copia es un extra */ }

      doc = new Y.Y.Doc();
      const texto = doc.getText('programa');

      /* Quien crea la sala pone el programa que tenía, y lo hace ahora, antes
         de que exista el enlace: así no hay ventana en la que dos programas
         se peguen uno atrás del otro. Quien se suma no siembra nada: recibe.
         Antes esto era un temporizador de 800 ms que miraba si el documento
         seguía vacío, y un programa vacío es un estado tan válido como
         cualquier otro. */
      if (soyPrimero && mio.trim()) texto.insert(0, mio);

      prov = global.SalaUI.conectar({
        Y: Y.Y, doc, sala, secreto: clave,
        servidores: global.Juntos.servidores(relevo),
        alias: miAlias(), papel: 'edita'
      });

      atadura = new Y.CodemirrorBinding(texto, editor, prov.vecinos);
      estadoDelDialogo('buscando el servidor…');

      prov.al('estado', e => {
        estadoDelDialogo(e.conectado
          ? (e.gente <= 1 ? 'conectado · esperando a alguien más' : 'conectado · ' + e.gente + ' personas')
          : (e.motivo || 'buscando…'));
        if (!e.conectado && e.motivo === 'sin relevo') sinRelevo();
        pintarGente();
      });
      prov.vecinos.on('change', pintarGente);

      paso('afuera').classList.add('oculto');
      paso('adentro').classList.remove('oculto');
      campo('enlace').value = global.Juntos.enlace(sala, clave, location.origin + location.pathname, relevo);
      campo('error').textContent = '';
      pintarGente();
      pintarBoton();
      mostrarBarra();
      avisar('programando en grupo', 'ok');
    }

    function sinRelevo() {
      campo('error').textContent = 'No hay ningún servidor que reparta los mensajes, así que '
        + 'nadie se va a encontrar con nadie. Hace falta el de la escuela: abrí «Para el profesor» '
        + 'acá abajo. Mientras tanto, pasale el programa por «Compartir».';
      const d = dlg.querySelector('.juntos-avanzado');
      if (d) d.open = true;
    }

    function nueva() {
      const s = global.Juntos.crearSala();
      let propio = null;
      try { propio = localStorage.getItem('esle2_senas') || null; } catch (e) { /* modo privado */ }
      const r = (propio || '').split(',')[0].trim() || null;
      history.replaceState(null, '', global.Juntos.enlace(s.sala, s.clave, location.pathname, r));
      conectar(s.sala, s.clave, r, true);
    }

    function entrar() {
      if (!invitado) return;
      /* Un relevo que vino en un enlace ajeno es una dirección a la que este
         navegador se va a conectar porque lo dijo un papelito. Se usa solo si
         dijeron que sí, viendo el dominio. */
      conectar(invitado.sala, invitado.clave, invitado.relevoAceptado ? invitado.relevo : null, false);
      invitado = null;
    }

    function salir() {
      if (atadura) { atadura.destroy(); atadura = null; }
      if (prov) { prov.destruir(); prov = null; }
      if (doc) { doc.destroy(); doc = null; }
      sala = clave = relevo = null;
      history.replaceState(null, '', location.pathname);
      if (dlg) {
        paso('adentro').classList.add('oculto');
        paso('afuera').classList.remove('oculto');
        accion('entrar').classList.add('oculto');
        campo('invitacion').classList.add('oculto');
        campo('enlace').value = '';
        campo('gente').replaceChildren();
        campo('error').textContent = '';
      }
      if (barra) barra.classList.add('oculto');
      pintarBoton();
      avisar('saliste de la sala');
    }

    /* ------------------------------ pintar --------------------------- */

    const estadoDelDialogo = t => { if (dlg) campo('estado').textContent = t; };

    /* Quiénes están, ordenados y con su color. Cada uno se identifica también
       por su nombre escrito y no solo por el color: dos personas pueden caer
       en el mismo color, y hay gente que no los distingue. */
    function laGente() {
      if (!prov) return [];
      const yo = prov.vecinos.clientID;
      return Array.from(prov.vecinos.getStates().entries())
        .filter(([, e]) => e && e.user)
        .map(([id, e]) => ({ id, yo: id === yo, nombre: e.user.name, color: e.user.color }))
        .sort((a, b) => (b.yo - a.yo) || a.nombre.localeCompare(b.nombre, 'es'));
    }

    function chip(g, donde) {
      const li = crear(donde === 'barra' ? 'span' : 'li', 'juntos-chip');
      const p = crear('span', 'juntos-punto');
      p.style.background = g.color;         // color de la paleta, no del otro
      li.append(p, crear('span', 'juntos-nombre', g.nombre + (g.yo ? ' (vos)' : '')));
      return li;
    }

    function pintarGente() {
      const gente = laGente();
      if (dlg && !paso('adentro').classList.contains('oculto')) {
        const ul = campo('gente');
        ul.replaceChildren();
        for (const g of gente) ul.appendChild(chip(g, 'lista'));
      }
      if (barra) {
        const caja = barra.querySelector('.juntos-barra-gente');
        caja.replaceChildren();
        for (const g of gente) caja.appendChild(chip(g, 'barra'));
        const n = barra.querySelector('.juntos-barra-estado');
        n.textContent = !prov ? '' : prov.conectado
          ? (gente.length <= 1 ? 'esperando a alguien más' : gente.length + ' personas')
          : 'sin conexión';
        barra.classList.toggle('juntos-solo', gente.length <= 1);
      }
      pintarBoton();
    }

    /* Una barra fina arriba del editor: mientras se programa en grupo, quién
       está tiene que verse sin abrir un diálogo. */
    function mostrarBarra() {
      if (!barra) {
        barra = crear('div', 'juntos-barra');
        barra.setAttribute('role', 'region');
        barra.setAttribute('aria-label', 'Programando en grupo');
        barra.append(crear('span', 'juntos-barra-estado'), crear('span', 'juntos-barra-gente'));
        const volver = crear('button', 'btn chico', 'La sala');
        volver.type = 'button';
        volver.addEventListener('click', abrir);
        const sep = crear('span', 'crece');
        barra.append(sep, volver);
        const ancla = document.querySelector('#bannerEjercicio') || document.querySelector('.editor');
        if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(barra, ancla);
        else document.body.appendChild(barra);
      }
      barra.classList.remove('oculto');
      pintarGente();
    }

    function pintarBoton() {
      const b = cfg.boton;
      if (!b) return;
      b.classList.toggle('activo', enSala());
      b.setAttribute('aria-pressed', enSala() ? 'true' : 'false');
    }

    async function copiar() {
      const t = campo('enlace').value;
      if (!t) return;
      try { await navigator.clipboard.writeText(t); campo('error').textContent = 'Enlace copiado.'; }
      catch (e) { campo('enlace').focus(); campo('enlace').select(); }
    }

    function guardarRelevo() {
      const url = campo('relevo').value.trim();
      if (!url) {
        try { localStorage.removeItem('esle2_senas'); } catch (e) { /* modo privado */ }
        campo('error').textContent = 'Listo: ESLE2 vuelve a no tener servidor propio.';
        return;
      }
      campo('error').textContent = global.Juntos.recordarServidor(url)
        ? 'Guardado. Las salas nuevas van a usar ' + url + '.'
        : 'Esa dirección no sirve: tiene que empezar con wss:// (cifrada), como '
          + 'wss://esle2-senas.tu-usuario.workers.dev.';
    }

    /* ------------------------------- abrir --------------------------- */

    function abrir() {
      if (!dlg) construir();
      if (!prov) prepararInvitacion();
      dlg.showModal();
    }

    /* Llegar por un enlace NO conecta solo, ni siquiera con el editor vacío:
       conectarse a un servidor y mostrarle a desconocidos lo que uno escribe
       es algo que se decide, no algo que pasa por abrir un enlace. */
    function prepararInvitacion() {
      const dela = global.Juntos.leerUrl();
      invitado = dela ? Object.assign({ relevoAceptado: false }, dela) : null;
      const caja = campo('invitacion');
      accion('entrar').classList.toggle('oculto', !invitado);
      accion('crear').classList.toggle('primario', !invitado);
      caja.classList.toggle('oculto', !invitado);
      if (!invitado) return;

      campo('invitacion-que').textContent = 'Te invitaron a la sala «' + invitado.sala + '».';
      const avisos = caja.querySelector('.juntos-avisos');
      const viejo = avisos.querySelector('[data-campo="relevo-ajeno"]');
      if (viejo) viejo.remove();
      if (!invitado.relevo) return;

      /* El dominio se muestra entero y hay que tildarlo: el enlace puede venir
         de cualquiera, y esto dice a qué servidor se va a conectar. */
      const li = crear('li');
      li.dataset.campo = 'relevo-ajeno';
      const tilde = document.createElement('input');
      tilde.type = 'checkbox';
      tilde.id = 'juntosRelevoAjeno';
      tilde.addEventListener('change', () => { invitado.relevoAceptado = tilde.checked; });
      const etq = document.createElement('label');
      etq.htmlFor = tilde.id;
      etq.textContent = 'Usar el servidor que trae el enlace: '
        + (function (u) { try { return new URL(u).host; } catch (e) { return u; } })(invitado.relevo)
        + '. Aceptá solo si sabés de quién es.';
      li.append(tilde, etq);
      avisos.appendChild(li);
    }

    if (cfg.boton) cfg.boton.addEventListener('click', abrir);

    /* Si se llegó por el enlace de una sala, se abre el diálogo con la
       invitación a la vista. Entrar sigue siendo un botón. */
    if (global.Juntos.leerUrl()) {
      if (!dlg) construir();
      prepararInvitacion();
      dlg.showModal();
    }

    /* Cerrar la pestaña corta la sala igual, pero avisar rápido evita que los
       demás te vean treinta segundos de más. */
    global.addEventListener('pagehide', () => { if (prov) prov.destruir(); });

    return { abrir, salir, conectado: enSala };
  }

  global.JuntosUI = { iniciar, cargarYjs };
})(typeof window !== 'undefined' ? window : globalThis);

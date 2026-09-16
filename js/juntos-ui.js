/*
 * Programar de a dos, la parte que se conecta.
 *
 * Usa Yjs (vendido en vendor/yjs/) para que dos editores muestren el mismo
 * programa: cada uno escribe donde quiere y las dos versiones se juntan solas,
 * sin pisarse, como en un documento compartido. El transporte es WebRTC: el
 * texto va directo de una computadora a la otra y cifrado con la contraseña
 * que viaja en el enlace; un servidor de señas ajeno solo las presenta.
 *
 * El paquete de Yjs pesa 214 KB y se carga SOLO al abrir este diálogo, no en
 * cada visita. Tampoco se guarda para usar sin conexión, por la razón obvia:
 * es lo único del sitio que sin internet no puede andar.
 *
 * Lo que NO se comparte: la entrada de datos, la salida, la base de ESLE2 BD,
 * el progreso del curso. Se comparte el texto del programa, que es lo que se
 * escribe entre dos. Cada uno lo ejecuta en su máquina.
 *
 * API:  JuntosUI.iniciar({ editor, boton, estado })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const PAQUETE = 'vendor/yjs/juntos.min.js';

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

  function iniciar(cfg) {
    const editor = cfg.editor;
    const avisar = cfg.estado || (() => {});
    let dlg = null;
    let doc = null, proveedor = null, atadura = null;
    let sala = null, clave = null;

    const conectado = () => !!proveedor;

    /* ----------------------------- el diálogo ------------------------ */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      dlg.innerHTML = `
        <h3>Programar de a dos</h3>
        <p class="nota">Los dos ven y escriben el mismo programa, cada uno desde su computadora.
           El texto viaja <strong>directo de una máquina a la otra y cifrado</strong>; el servidor
           que las presenta no puede leerlo.</p>

        <div class="mis-grilla">
          <label>Cómo te ven
            <input type="text" data-campo="nombre" maxlength="24" autocomplete="off">
          </label>
          <label>Estado
            <input type="text" data-campo="estado" readonly value="sin conectar">
          </label>
        </div>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="crear">Crear una sala</button>
          <button class="btn peligro oculto" data-accion="salir">Salir de la sala</button>
        </div>

        <label>Enlace para tu compañero
          <textarea data-campo="enlace" rows="2" spellcheck="false" readonly
            placeholder="Creá una sala y el enlace aparece acá."></textarea>
        </label>

        <p class="mis-error" data-campo="error"></p>
        <ul class="juntos-gente" data-campo="gente" aria-live="polite"
            aria-label="Quiénes están en la sala"></ul>

        <div class="doc-nota">Quien tenga el enlace puede entrar y escribir, como en cualquier
          documento compartido por enlace. Se comparte <strong>solo el texto del programa</strong>:
          la entrada, la salida y tu progreso del curso siguen siendo tuyos, y cada uno ejecuta en
          su máquina.</div>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="copiar" disabled>Copiar el enlace</button>
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const nom = dlg.querySelector('[data-campo="nombre"]');
      nom.value = localStorage.getItem('esle2_juntos_nombre') || global.Juntos.nombreSugerido();
      nom.addEventListener('input', () => {
        try { localStorage.setItem('esle2_juntos_nombre', nom.value); } catch (e) { /* almacén lleno */ }
        if (proveedor) proveedor.awareness.setLocalStateField('user', usuario());
      });

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'crear') crear();
        else if (a === 'salir') salir();
        else if (a === 'copiar') copiar();
      });
    }

    const campo = c => dlg.querySelector(`[data-campo="${c}"]`);

    function usuario() {
      const n = (campo('nombre').value || '').trim() || 'alguien';
      return { name: n, color: global.Juntos.color(n), colorLight: global.Juntos.color(n) };
    }

    /* ------------------------------ conectar ------------------------- */
    async function conectar(s, c, traigoElTexto) {
      let Y;
      try {
        campo('estado').value = 'trayendo el paquete…';
        Y = await cargarYjs();
      } catch (e) {
        campo('error').textContent = 'No se pudo cargar lo necesario para conectarse. '
          + '¿Estás sin internet? Esta es la única parte de ESLE2 que lo necesita.';
        campo('estado').value = 'sin conectar';
        return;
      }

      sala = s; clave = c;
      /* El programa se guarda ANTES de atar el editor: al atarlo, y-codemirror
         reemplaza su contenido por el del documento compartido —que al empezar
         está vacío— y ya no habría de dónde sacarlo. */
      const mio = editor.getValue();
      doc = new Y.Y.Doc();
      const texto = doc.getText('programa');

      /* Quien crea la sala pone el programa que tenía; quien se suma lo
         recibe. Si los dos pusieran el suyo, quedarían pegados uno atrás del
         otro, que es lo que confunde a todo el mundo la primera vez. */
      proveedor = new Y.WebrtcProvider(sala, doc, { password: clave, signaling: global.Juntos.servidores() });
      proveedor.awareness.setLocalStateField('user', usuario());

      if (traigoElTexto) {
        /* Se espera un instante a ver si la sala ya tenía algo: si ya hay
           texto, este no es el primero y no tiene que pisar nada. */
        setTimeout(() => {
          if (texto.length === 0 && mio.trim()) texto.insert(0, mio);
        }, 800);
      }

      atadura = new Y.CodemirrorBinding(texto, editor, proveedor.awareness);

      proveedor.on('status', ev => { campo('estado').value = ev.connected ? 'conectado' : 'buscando…'; });
      proveedor.awareness.on('change', pintarGente);
      pintarGente();

      /* Que el servidor conteste NO quiere decir que sirva: puede aceptar la
         conexión y no reenviar nada, y entonces las dos computadoras quedan
         «conectadas» sin encontrarse jamás. Mirar si la conexión está viva era
         mentirle a la persona con la cara más seria; se prueba el reenvío. */
      global.Juntos.alguienReenvia().then(bueno => {
        if (!proveedor || bueno) return;
        campo('error').textContent = 'Ningún servidor está reenviando: los dos quedarían esperando '
          + 'para siempre sin encontrarse. Hace falta un servidor de señas propio: está listo para publicar en servidor-senas/cloudflare, y es gratis. Mientras tanto, pasale el programa por «Compartir».';
        campo('estado').value = 'sin señal';
      });

      campo('estado').value = 'conectado';
      dlg.querySelector('[data-accion="crear"]').classList.add('oculto');
      dlg.querySelector('[data-accion="salir"]').classList.remove('oculto');
      dlg.querySelector('[data-accion="copiar"]').disabled = false;
      campo('enlace').value = global.Juntos.enlace(sala, clave, location.origin + location.pathname);
      pintarBoton();
      avisar('en sala con otra persona', 'ok');
    }

    function pintarGente() {
      if (!proveedor) return;
      const ul = campo('gente');
      ul.replaceChildren();
      const estados = Array.from(proveedor.awareness.getStates().values());
      for (const e of estados) {
        if (!e || !e.user) continue;
        const li = document.createElement('li');
        const p = document.createElement('span');
        p.className = 'juntos-punto';
        p.style.background = e.user.color;
        const n = document.createElement('span');
        n.textContent = e.user.name;
        li.append(p, n);
        ul.appendChild(li);
      }
      const n = estados.length;
      campo('estado').value = n <= 1 ? 'esperando a la otra persona…' : n + ' personas';
      pintarBoton();
    }

    function crear() {
      const s = global.Juntos.crearSala();
      history.replaceState(null, '', global.Juntos.enlace(s.sala, s.clave, location.pathname));
      conectar(s.sala, s.clave, true);
    }

    function salir() {
      if (atadura) { atadura.destroy(); atadura = null; }
      if (proveedor) { proveedor.destroy(); proveedor = null; }
      if (doc) { doc.destroy(); doc = null; }
      sala = clave = null;
      history.replaceState(null, '', location.pathname);
      if (dlg) {
        campo('estado').value = 'sin conectar';
        campo('enlace').value = '';
        campo('gente').replaceChildren();
        dlg.querySelector('[data-accion="crear"]').classList.remove('oculto');
        dlg.querySelector('[data-accion="salir"]').classList.add('oculto');
        dlg.querySelector('[data-accion="copiar"]').disabled = true;
      }
      pintarBoton();
      avisar('saliste de la sala');
    }

    async function copiar() {
      const t = campo('enlace').value;
      if (!t) return;
      try { await navigator.clipboard.writeText(t); campo('error').textContent = 'Enlace copiado.'; }
      catch (e) { campo('enlace').focus(); campo('enlace').select(); }
    }

    function pintarBoton() {
      const b = cfg.boton;
      if (!b) return;
      b.classList.toggle('activo', conectado());
      b.setAttribute('aria-pressed', conectado() ? 'true' : 'false');
    }

    function abrir() {
      if (!dlg) construir();
      dlg.showModal();
    }

    if (cfg.boton) cfg.boton.addEventListener('click', abrir);

    /* Si se llegó por el enlace de una sala, se pregunta antes: entrar
       reemplaza lo que haya en el editor por el programa de la sala, y perder
       lo que uno venía escribiendo sin que le avisen es imperdonable. */
    const dela = global.Juntos.leerUrl();
    if (dela) {
      const tenia = (editor.getValue() || '').trim();
      const seguir = !tenia || confirm(
        'Vas a entrar a una sala para programar de a dos.\n\n'
        + 'Lo que tenés escrito ahora se reemplaza por el programa de la sala. '
        + 'Se guarda una copia por las dudas.\n\n¿Entrás?');
      if (seguir) {
        try { if (tenia) localStorage.setItem('esle2_antes_de_la_sala', editor.getValue()); }
        catch (e) { /* almacén lleno */ }
        if (!dlg) construir();
        conectar(dela.sala, dela.clave, false);
        dlg.showModal();
      } else {
        history.replaceState(null, '', location.pathname);
      }
    }

    return { abrir, salir, conectado };
  }

  global.JuntosUI = { iniciar, cargarYjs };
})(typeof window !== 'undefined' ? window : globalThis);

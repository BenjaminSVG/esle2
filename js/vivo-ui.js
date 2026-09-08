/*
 * Transmitir mi lógica, la parte que se conecta.
 *
 * Dos lados, los dos acá porque comparten todo salvo quién escribe:
 *
 *   · VivoUI.transmitir({ editor, boton })  — en el IDE. Manda lo que se
 *     escribe y muestra cuánta gente está mirando;
 *   · VivoUI.mirar({ editor, ... })         — en vivo.html. Solo recibe. El
 *     editor es de lectura, y además no se ata al documento compartido: se
 *     copia el texto cuando cambia. Un editor atado es de ida y vuelta por
 *     definición, y acá la vuelta no existe.
 *
 * Por debajo es lo mismo que «Programar de a dos»: Yjs sobre WebRTC, con el
 * paquete vendido en vendor/yjs/ y traído recién cuando hace falta, y los
 * mismos servidores de señas (ver js/juntos.js). Lo que va por la red es el
 * texto del programa y nada más: ni la entrada, ni la salida, ni el progreso.
 *
 * API:  VivoUI.transmitir({ editor, boton, estado })
 *       VivoUI.mirar({ editor, nombre, donde })
 */
(function (global) {
  'use strict';

  const PAQUETE = 'vendor/yjs/juntos.min.js';
  const CLAVE_NOMBRE = 'esle2_vivo_nombre';
  const ESPERA_SIN_SENAL = 15000;

  let cargando = null;
  function cargarYjs() {
    if (global.Yjs) return Promise.resolve(global.Yjs);
    if (cargando) return cargando;
    cargando = new Promise((listo, falla) => {
      const s = document.createElement('script');
      /* En /live/juan la dirección relativa apuntaría a /live/vendor/…, así
         que se arma desde la raíz del sitio. */
      s.src = new URL(PAQUETE, document.baseURI).href;
      s.onload = () => (global.Yjs ? listo(global.Yjs) : falla(new Error('el paquete cargó vacío')));
      s.onerror = () => falla(new Error('no se pudo cargar ' + PAQUETE));
      document.head.appendChild(s);
    });
    return cargando;
  }

  const servidores = () => (global.Juntos ? global.Juntos.servidores() : ['wss://y-webrtc-eu.fly.dev']);

  /* ==================================================================== */
  /* El que transmite                                                     */
  /* ==================================================================== */
  function transmitir(cfg) {
    const editor = cfg.editor;
    const avisar = cfg.estado || (() => {});
    let dlg = null, doc = null, proveedor = null, atadura = null, nombre = null;

    const enVivo = () => !!proveedor;

    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      dlg.innerHTML = `
        <h3>Transmitir mi lógica</h3>
        <p class="nota">Un enlace corto para que otros vean, en el momento, cómo vas escribiendo
           tu programa. Ellos <strong>solo miran</strong>: no pueden tocar tu código.</p>

        <div class="mis-grilla">
          <label>Nombre de tu transmisión
            <input type="text" data-campo="nombre" maxlength="24" autocomplete="off"
                   placeholder="juan">
          </label>
          <label>Estado
            <input type="text" data-campo="estado" readonly value="sin transmitir">
          </label>
        </div>

        <label>Tu enlace
          <input type="text" data-campo="enlace" readonly spellcheck="false"
                 placeholder="Elegí un nombre y empezá; el enlace aparece acá.">
        </label>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="empezar">Empezar a transmitir</button>
          <button class="btn peligro oculto" data-accion="cortar">Cortar la transmisión</button>
          <button class="btn" data-accion="copiar" disabled>Copiar el enlace</button>
        </div>

        <p class="mis-error" data-campo="error" aria-live="polite"></p>
        <p class="vivo-gente" data-campo="gente" aria-live="polite"></p>

        <div class="doc-nota"><strong>El enlace es público.</strong> El nombre es corto para
          poder dictarlo, así que también es fácil de adivinar: cualquiera que escriba esa
          dirección puede mirar mientras estés transmitiendo. No pongas ahí tu nombre completo
          ni nada que no quieras que se vea, y cortá la transmisión cuando termines. Si otra
          persona elige el mismo nombre que vos, van a caer los dos en la misma transmisión;
          si pasa, te avisamos acá.</div>

        <div class="dlg-fila derecha">
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const n = dlg.querySelector('[data-campo="nombre"]');
      try { n.value = localStorage.getItem(CLAVE_NOMBRE) || global.Vivo.nombreSugerido(); }
      catch (e) { n.value = global.Vivo.nombreSugerido(); }
      n.addEventListener('input', pintarEnlace);

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'empezar') empezar();
        else if (a === 'cortar') cortar();
        else if (a === 'copiar') copiar();
      });
      pintarEnlace();
    }

    const campo = c => dlg.querySelector(`[data-campo="${c}"]`);

    function pintarEnlace() {
      const escrito = campo('nombre').value;
      const limpio = global.Vivo.limpiarNombre(escrito);
      const e = campo('error');
      if (!global.Vivo.valido(escrito)) {
        campo('enlace').value = '';
        e.textContent = escrito.trim() ? 'Ese nombre no sirve para un enlace: usá letras y números.' : '';
        return;
      }
      campo('enlace').value = global.Vivo.enlace(limpio, location.origin + '/');
      e.textContent = limpio !== escrito.trim().toLowerCase()
        ? `En el enlace va a quedar como «${limpio}».` : '';
    }

    async function empezar() {
      const escrito = campo('nombre').value;
      if (!global.Vivo.valido(escrito)) { campo('nombre').focus(); return; }
      nombre = global.Vivo.limpiarNombre(escrito);
      try { localStorage.setItem(CLAVE_NOMBRE, nombre); } catch (e) { /* modo privado */ }

      let Y;
      try {
        campo('estado').value = 'trayendo el paquete…';
        Y = await cargarYjs();
      } catch (e) {
        campo('error').textContent = 'No se pudo cargar lo necesario para transmitir. '
          + '¿Estás sin internet? Esta es la única parte de ESLE2 que lo necesita.';
        campo('estado').value = 'sin transmitir';
        return;
      }

      const s = global.Vivo.sala(nombre);
      /* El programa que hay ahora se guarda ANTES de atar el editor: al
         atarlo, y-codemirror lo reemplaza por el del documento compartido
         —que recién empieza y está vacío— y ya no habría de dónde sacarlo. */
      const mio = editor.getValue();
      doc = new Y.Y.Doc();
      const texto = doc.getText('programa');
      proveedor = new Y.WebrtcProvider(s.sala, doc, { password: s.clave, signaling: servidores() });
      proveedor.awareness.setLocalStateField('user', { name: nombre, papel: 'transmite' });
      atadura = new Y.CodemirrorBinding(texto, editor, proveedor.awareness);
      if (mio.trim()) setTimeout(() => { if (texto.length === 0) texto.insert(0, mio); }, 600);

      proveedor.awareness.on('change', pintarGente);
      pintarGente();

      setTimeout(() => {
        if (!proveedor) return;
        if (!proveedor.signalingConns.filter(c => c.connected).length) {
          campo('error').textContent = 'No responde ninguno de los servidores que presentan a las '
            + 'computadoras. Nadie te va a poder ver hasta que vuelva alguno.';
          campo('estado').value = 'sin señal';
        }
      }, ESPERA_SIN_SENAL);

      campo('estado').value = 'en vivo';
      campo('enlace').value = global.Vivo.enlace(nombre, location.origin + '/');
      dlg.querySelector('[data-accion="empezar"]').classList.add('oculto');
      dlg.querySelector('[data-accion="cortar"]').classList.remove('oculto');
      dlg.querySelector('[data-accion="copiar"]').disabled = false;
      campo('nombre').disabled = true;
      pintarBoton();
      avisar('transmitiendo en vivo', 'ok');
    }

    function pintarGente() {
      if (!proveedor) return;
      const estados = Array.from(proveedor.awareness.getStates().values()).filter(e => e && e.user);
      const mirando = estados.filter(e => e.user.papel === 'mira').length;
      const otros = estados.filter(e => e.user.papel === 'transmite').length - 1;
      campo('gente').textContent = mirando === 0 ? 'Todavía no te está mirando nadie.'
        : mirando === 1 ? 'Te está mirando 1 persona.' : `Te están mirando ${mirando} personas.`;
      if (otros > 0) {
        campo('error').textContent = 'Ojo: hay alguien más transmitiendo con este mismo nombre, '
          + 'así que están escribiendo los dos sobre el mismo programa. Cortá y elegí otro nombre.';
      }
    }

    function cortar() {
      if (atadura) { atadura.destroy(); atadura = null; }
      if (proveedor) { proveedor.destroy(); proveedor = null; }
      if (doc) { doc.destroy(); doc = null; }
      if (dlg) {
        campo('estado').value = 'sin transmitir';
        campo('gente').textContent = '';
        campo('error').textContent = '';
        campo('nombre').disabled = false;
        dlg.querySelector('[data-accion="empezar"]').classList.remove('oculto');
        dlg.querySelector('[data-accion="cortar"]').classList.add('oculto');
        dlg.querySelector('[data-accion="copiar"]').disabled = true;
      }
      pintarBoton();
      avisar('transmisión cortada');
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
      b.classList.toggle('activo', enVivo());
      b.setAttribute('aria-pressed', enVivo() ? 'true' : 'false');
    }

    function abrir() {
      if (!dlg) construir();
      dlg.showModal();
    }
    if (cfg.boton) cfg.boton.addEventListener('click', abrir);

    /* Cerrar la pestaña corta la transmisión sola —no queda nada dando
       vueltas— pero se hace explícito igual, para soltar la conexión rápido. */
    global.addEventListener('pagehide', () => { if (proveedor) proveedor.destroy(); });

    return { abrir, cortar, get enVivo() { return enVivo(); } };
  }

  /* ==================================================================== */
  /* El que mira                                                          */
  /* ==================================================================== */
  function mirar(cfg) {
    const editor = cfg.editor;
    const nombre = cfg.nombre;
    const decir = cfg.estado || (() => {});
    let doc = null, proveedor = null;

    async function conectar() {
      const s = global.Vivo.sala(nombre);
      if (!s) { decir('Ese enlace no tiene un nombre válido.', 'error'); return; }

      let Y;
      try {
        decir('Buscando la transmisión…');
        Y = await cargarYjs();
      } catch (e) {
        decir('No se pudo cargar lo necesario para mirar. ¿Estás sin internet?', 'error');
        return;
      }

      doc = new Y.Y.Doc();
      const texto = doc.getText('programa');
      proveedor = new Y.WebrtcProvider(s.sala, doc, { password: s.clave, signaling: servidores() });
      proveedor.awareness.setLocalStateField('user', { name: 'alguien', papel: 'mira' });

      /* Nada de atar el editor: acá se copia el texto y listo. Atarlo lo
         volvería de ida y vuelta, y esto es de una sola mano. Se conserva la
         posición del scroll para que el texto no salte bajo el que lee. */
      const refrescar = () => {
        const y = editor.getScrollInfo().top;
        const t = texto.toString();
        if (t !== editor.getValue()) {
          editor.setValue(t);
          editor.scrollTo(null, y);
        }
        if (cfg.alRecibir) cfg.alRecibir(t);
      };
      texto.observe(refrescar);

      proveedor.awareness.on('change', () => {
        const estados = Array.from(proveedor.awareness.getStates().values()).filter(e => e && e.user);
        const hay = estados.some(e => e.user.papel === 'transmite');
        decir(hay ? 'En vivo' : 'Nadie está transmitiendo en este enlace ahora mismo.',
              hay ? 'ok' : null);
      });

      setTimeout(() => {
        if (!proveedor) return;
        if (!proveedor.signalingConns.filter(c => c.connected).length) {
          decir('No responde ninguno de los servidores que presentan a las computadoras. '
              + 'Probá de nuevo en un rato.', 'error');
        } else if (!texto.toString()) {
          decir('Nadie está transmitiendo en este enlace ahora mismo.');
        }
      }, ESPERA_SIN_SENAL);
    }

    function cortar() {
      if (proveedor) { proveedor.destroy(); proveedor = null; }
      if (doc) { doc.destroy(); doc = null; }
    }

    conectar();
    global.addEventListener('pagehide', cortar);
    return { cortar };
  }

  global.VivoUI = { transmitir, mirar, cargarYjs };
})(typeof window !== 'undefined' ? window : globalThis);

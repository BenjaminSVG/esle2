/*
 * Programar en grupo, la parte que se ve.
 *
 * Dos personas, o toda la clase, escribiendo el mismo programa. Usa Yjs
 * (vendido en vendor/yjs/) para que los editores se junten solos sin pisarse,
 * y js/sala-ui.js para el transporte: sobres cerrados que un relevo reparte
 * sin poder leerlos, y —de a pocos y con permiso— un camino directo de una
 * máquina a la otra. El porqué de los dos está arriba de js/sala.js.
 *
 * El permiso para el camino directo se pide acá, en pantalla, y en ningún otro
 * lado: abrir una conexión directa le muestra la dirección IP del alumno a
 * quien esté del otro lado, y del otro lado puede estar cualquiera que tenga
 * el enlace. Hasta que no lo aprietan, no se crea ninguna conexión ni se le
 * pregunta nada a ningún servidor STUN.
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

          <details class="juntos-avanzado juntos-mano">
            <summary>De a dos, sin ningún servidor</summary>
            <p class="nota">Si no hay servidor, las dos computadoras se pueden conectar
               <strong>directo</strong>, pasándose un código a mano: uno lo arma, se lo manda al
               otro por donde ya se hablan, y el otro devuelve el suyo. Es de a dos, son dos
               pegadas de código, y no hace falta nada más.</p>
            <ul class="juntos-avisos">
              <li>La conexión directa le muestra tu <strong>dirección IP</strong> a la otra
                  persona. Conectate solo con alguien que conozcas.</li>
              <li>El código lleva <strong>la clave de la sala</strong>: a quien se lo reenvíen
                  puede entrar y escribir. Mandáselo solo a tu compañero.</li>
              <li>Anda entre dos máquinas de la misma red, como el laboratorio. Entre dos casas
                  distintas, casi seguro que no.</li>
            </ul>
            <label class="juntos-check">
              <input type="checkbox" data-campo="mano-stun" checked>
              Intentar también entre redes distintas. Para eso hay que preguntarle la dirección a
              un servidor STUN de Cloudflare o Google: ven tu IP, y nada más —el programa no pasa
              por ellos, y no reparten nada. Si estás en la misma red que tu compañero, podés
              destildarlo y no se habla con nadie.
            </label>
            <div class="dlg-fila">
              <button class="btn" data-accion="mano-invito">Yo invito</button>
              <button class="btn" data-accion="mano-tengo">Tengo un código</button>
            </div>
          </details>
        </div>

        <div class="juntos-paso oculto" data-paso="mano">
          <p class="juntos-titulo" data-campo="mano-titulo"></p>
          <div class="juntos-estado" data-campo="mano-estado" aria-live="polite"></div>

          <label class="oculto" data-campo="mano-pego-caja"><span
              data-campo="mano-pego-texto">Pegá acá el código que te mandaron</span>
            <textarea class="control juntos-codigo" data-campo="mano-pego" rows="3"
              spellcheck="false" autocomplete="off"></textarea>
          </label>

          <label class="oculto" data-campo="mano-mio-caja">Tu código, para mandarle a tu compañero
            <textarea class="control juntos-codigo" data-campo="mano-mio" rows="3" readonly
              spellcheck="false"></textarea>
          </label>

          <div class="dlg-fila">
            <button class="btn oculto" data-accion="mano-copiar">Copiar mi código</button>
            <button class="btn primario oculto" data-accion="mano-seguir"></button>
            <button class="btn oculto" data-accion="mano-volver">Volver</button>
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

          <div class="juntos-invitacion oculto" data-campo="caja-directa">
            <p class="juntos-titulo">Conexión directa</p>
            <p class="nota">Siendo pocos, las computadoras pueden hablarse <strong>directo</strong>,
               sin pasar por ningún servidor: en el mismo laboratorio va más rápido y no gasta el
               cupo de nadie.</p>
            <p class="nota"><strong>Lo que cuesta:</strong> una conexión directa le muestra tu
               dirección IP a la otra persona, y del otro lado puede estar cualquiera que tenga
               este enlace. Para armarla también se le pregunta la dirección a un servidor STUN.
               Si no la activás, seguís igual por el servidor, que no muestra tu IP a nadie.</p>
            <div class="dlg-fila">
              <button class="btn" data-accion="directo">Activar la conexión directa</button>
              <span class="juntos-estado" data-campo="estado-directo"></span>
            </div>
          </div>

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
        else if (a === 'directo') activarDirecto();
        else if (a === 'mano-invito') manoInvitar();
        else if (a === 'mano-tengo') manoPedirCodigo();
        else if (a === 'mano-seguir') manoSeguir();
        else if (a === 'mano-copiar') manoCopiar();
        else if (a === 'mano-volver') manoVolver();
      });
    }

    const campo = c => dlg.querySelector('[data-campo="' + c + '"]');
    const paso = p => dlg.querySelector('[data-paso="' + p + '"]');
    const accion = a => dlg.querySelector('[data-accion="' + a + '"]');
    const miAlias = () => global.Sala.alias(campo('nombre').value);

    /* ------------------------------ conectar ------------------------- */

    /* «canal» es el modo a mano: si viene, no hay relevo ni enlace, y los
       sobres viajan por la conexión directa que ya armaron los dos. */
    async function conectar(s, c, r, soyPrimero, canal) {
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
        Y: Y.Y, doc, sala, secreto: clave, canal: canal || null,
        servidores: global.Juntos.servidores(relevo),
        alias: miAlias(), papel: 'edita',
        /* Apagado hasta que lo digan: ver activarDirecto(). A mano no va, que
           el camino ya ES directo. */
        directo: { permitido: false, hasta: 4, iceServers: global.Sala.STUN }
      });

      atadura = new Y.CodemirrorBinding(texto, editor, prov.vecinos);
      /* A mano no hay ningún servidor que buscar: lo que falta es la otra
         persona. Y si no llega, hay que decirlo en vez de esperar sin fin. */
      if (canal) { manoVigilar(canal); estadoDelDialogo('esperando a tu compañero…'); }
      else estadoDelDialogo('buscando el servidor…');

      prov.al('estado', e => {
        pintarDirecto(e);
        estadoDelDialogo(e.conectado
          ? (e.gente <= 1 ? 'conectado · esperando a alguien más' : 'conectado · ' + e.gente + ' personas')
          : (e.motivo || (canal ? 'esperando a tu compañero…' : 'buscando…')));
        if (!e.conectado && e.motivo === 'sin relevo') sinRelevo();
        pintarGente();
      });
      prov.vecinos.on('change', pintarGente);

      paso('afuera').classList.add('oculto');
      paso('mano').classList.add('oculto');
      paso('adentro').classList.remove('oculto');

      /* A mano no hay enlace que repartir —el que quiera entrar tiene que
         pegar un código y que el otro lo acepte— y no hay conexión directa que
         activar, porque ya es la única que hay. */
      const enlaceCaja = campo('enlace').closest('label');
      if (enlaceCaja) enlaceCaja.classList.toggle('oculto', !!canal);
      campo('enlace').value = canal ? ''
        : global.Juntos.enlace(sala, clave, location.origin + location.pathname, relevo);
      campo('error').textContent = '';
      pintarGente();
      pintarBoton();
      mostrarBarra();
      avisar('programando en grupo', 'ok');
    }

    /* ---------------------------- lo directo -------------------------- */

    /* El permiso se da acá y en ningún otro lado. Hasta que no se aprieta este
       botón no se crea ninguna conexión directa ni se le pregunta nada a un
       servidor STUN, así que la dirección IP no sale de la máquina. */
    function activarDirecto() {
      if (!prov) return;
      prov.encenderDirecto();
      accion('directo').disabled = true;
      accion('directo').textContent = 'Conexión directa activada';
    }

    function pintarDirecto(e) {
      if (!dlg) return;
      const caja = campo('caja-directa');
      /* Se ofrece solo cuando tiene sentido: de a pocos. En una clase entera
         serían decenas de conexiones por máquina y no vale la pena. Y nunca a
         mano, donde el camino ya es directo y no hay otro. */
      caja.classList.toggle('oculto', e.gente > 4 || !!(mano && mano.sesion));
      campo('estado-directo').textContent = !e.directo ? ''
        : e.directos > 0
          ? (e.directos === 1 ? 'andando, sin pasar por el servidor'
            : 'andando con ' + e.directos + ', sin pasar por el servidor')
          : 'buscando el camino directo… mientras tanto va por el servidor';
    }

    /* ------------------------- de a dos, a mano ----------------------- */

    /* Todo este pedazo existe para el caso en que no hay servidor de nadie.
       El mensajero es la persona: copia un código y lo manda por donde ya se
       habla con su compañero. Ver js/mano.js y js/mano-ui.js.

       Ninguna de estas pantallas crea una conexión ni toca la red hasta que
       alguien aprieta el botón que lo dice. Pegar un código y leerlo no es
       conectarse. */
    let mano = null;              // { rol, paso, sesion, invitacion }

    const manoBoton = (que, texto) => {
      const b = accion(que);
      b.classList.toggle('oculto', !texto);
      if (texto) b.textContent = texto;
    };
    const manoVer = (que, si) => campo(que).classList.toggle('oculto', !si);
    const manoStun = () => !!campo('mano-stun').checked;

    function manoPantalla(titulo) {
      campo('mano-titulo').textContent = titulo;
      paso('afuera').classList.add('oculto');
      paso('mano').classList.remove('oculto');
      campo('error').textContent = '';
      const d = dlg.querySelector('.juntos-mano');
      if (d) d.open = true;
      manoBoton('mano-volver', 'Volver');
    }

    function manoError(texto) {
      campo('error').textContent = texto;
      campo('mano-estado').textContent = '';
    }

    /* Juntar las direcciones tarda, y el alumno tiene que saber que no se
       colgó. Quince segundos es el tope que pone js/mano-ui.js. */
    const manoEsperando = () => {
      campo('mano-estado').textContent = 'Preparando tu código… puede tardar unos segundos.';
      manoBoton('mano-seguir', '');
      manoBoton('mano-copiar', '');
    };

    async function manoInvitar() {
      if (!global.ManoUI || !global.ManoUI.hayRTC()) {
        campo('error').textContent = 'Este navegador no puede conectarse directo con otro.';
        return;
      }
      const s = global.Juntos.crearSala();
      mano = { rol: 'i', paso: 'armando', sala: s.sala, clave: s.clave };
      manoPantalla('Vos invitás');
      manoVer('mano-pego-caja', false);
      manoVer('mano-mio-caja', false);
      manoEsperando();

      let sesion;
      try { sesion = await global.ManoUI.invitar({ sala: s.sala, secreto: s.clave, stun: manoStun() }); }
      catch (e) { manoError(manoPorQueFallo(e)); return; }
      if (!mano || mano.paso !== 'armando') { sesion.cancelar(); return; }   // se volvió

      mano.sesion = sesion;
      mano.paso = 'espero-respuesta';
      campo('mano-mio').value = sesion.codigo;
      manoVer('mano-mio-caja', true);
      manoVer('mano-pego-caja', true);
      campo('mano-pego-texto').textContent = 'Pegá acá la respuesta de tu compañero';
      campo('mano-pego').value = '';
      campo('mano-estado').textContent = 'Mandale tu código. Cuando te devuelva el suyo, pegalo acá abajo.';
      manoBoton('mano-copiar', 'Copiar mi código');
      manoBoton('mano-seguir', 'Conectar');
    }

    function manoPedirCodigo() {
      mano = { rol: 'r', paso: 'mirando' };
      manoPantalla('Te invitaron');
      manoVer('mano-mio-caja', false);
      manoVer('mano-pego-caja', true);
      campo('mano-pego-texto').textContent = 'Pegá acá el código que te mandaron';
      campo('mano-pego').value = '';
      campo('mano-estado').textContent = '';
      manoBoton('mano-copiar', '');
      manoBoton('mano-seguir', 'Mirar el código');
    }

    async function manoSeguir() {
      if (!mano) return;
      campo('error').textContent = '';

      if (mano.paso === 'mirando') {
        const r = await global.ManoUI.leerInvitacion(campo('mano-pego').value);
        if (!r.ok) { manoError(r.mensaje); return; }
        mano.invitacion = r.paquete;
        mano.paso = 'listo-para-responder';
        campo('mano-estado').textContent = 'El código está bien. Al aceptar, tu computadora se '
          + 'conecta directo con la de quien te invitó y le muestra tu dirección IP.';
        manoBoton('mano-seguir', 'Aceptar y armar mi código');
        return;
      }

      if (mano.paso === 'listo-para-responder') {
        mano.paso = 'armando';
        manoEsperando();
        let sesion;
        try { sesion = await global.ManoUI.responder(mano.invitacion, { stun: manoStun() }); }
        catch (e) { manoError(manoPorQueFallo(e)); return; }
        if (!mano || mano.paso !== 'armando') { sesion.cancelar(); return; }

        mano.sesion = sesion;
        mano.paso = 'esperando-canal';
        campo('mano-mio').value = sesion.codigo;
        manoVer('mano-mio-caja', true);
        manoVer('mano-pego-caja', false);
        campo('mano-estado').textContent = 'Mandale este código a quien te invitó y esperá. '
          + 'Se conectan solos en cuanto lo pegue.';
        manoBoton('mano-copiar', 'Copiar mi código');
        manoBoton('mano-seguir', '');
        /* Se entra a la sala ya: el canal se abre cuando el otro pega el
           código, y ahí empieza a llegar el programa. */
        conectar(sesion.sala, sesion.secreto, null, false, sesion.canal);
        return;
      }

      if (mano.paso === 'espero-respuesta') {
        const r = await mano.sesion.aceptar(campo('mano-pego').value);
        if (!r.ok) { manoError(r.mensaje); return; }
        campo('mano-estado').textContent = 'Conectando…';
        conectar(mano.sala, mano.clave, null, true, mano.sesion.canal);
      }
    }

    /* Cuánto se espera a que el canal se abra después de pegar los códigos.
       Si no abre, no se deja la pantalla «esperando»: se dice qué pasó y qué
       se puede hacer, que casi siempre es marcar la casilla. */
    const ESPERA_CANAL = 30000;
    let manoReloj = null;

    function manoVigilar(canal) {
      clearTimeout(manoReloj);
      const rendirse = () => {
        clearTimeout(manoReloj);
        if (!canal || canal.abierto) return;
        campo('error').textContent = 'No se pudo conectar estas dos computadoras. '
          + (manoStun()
            ? 'La red puede estar bloqueando la conexión directa, y pasa seguido en el wifi de '
              + 'la escuela. Probá desde otra red, o usen una sala con servidor.'
            : 'Si no están en la misma red, hace falta marcar «Intentar también entre redes '
              + 'distintas» y empezar de nuevo con códigos nuevos.');
        estadoDelDialogo('no se pudo conectar');
      };
      canal.alFallar = rendirse;
      manoReloj = setTimeout(rendirse, ESPERA_CANAL);
      const eraAbrir = canal.alAbrir;
      canal.alAbrir = () => { clearTimeout(manoReloj); if (eraAbrir) eraAbrir(); };
    }

    const manoPorQueFallo = e => (e && e.message === 'tardo')
      ? 'No se pudo armar el código: la red tardó demasiado. Probá de nuevo.'
      : 'No se pudo armar el código en esta computadora.';

    function manoCopiar() {
      const t = campo('mano-mio');
      t.select();
      const listo = () => { const b = accion('mano-copiar'); b.textContent = 'Copiado'; };
      if (navigator.clipboard) navigator.clipboard.writeText(t.value).then(listo, () => {});
      else listo();                                   // ya quedó seleccionado
    }

    function manoVolver() {
      clearTimeout(manoReloj);
      if (mano && mano.sesion && !enSala()) mano.sesion.cancelar();
      mano = null;
      paso('mano').classList.add('oculto');
      paso('afuera').classList.remove('oculto');
      campo('error').textContent = '';
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
      /* Salir de una sala a mano es cortar la conexión: no hay dónde volver. */
      clearTimeout(manoReloj);
      if (mano && mano.sesion) mano.sesion.cancelar();
      mano = null;
      sala = clave = relevo = null;
      history.replaceState(null, '', location.pathname);
      if (dlg) {
        paso('adentro').classList.add('oculto');
        paso('mano').classList.add('oculto');
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

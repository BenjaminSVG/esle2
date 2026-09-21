/*
 * La sala compartida, la parte que se conecta.
 *
 * Dos caminos para lo mismo, y uno de los dos siempre está:
 *
 *   · el RELEVO. Todos hablan con el mismo servidor, que reenvía. Anda en
 *     cualquier red donde ande el sitio, y por eso es el piso: nunca se apaga.
 *   · el DIRECTO. De a dos en el mismo laboratorio, el camino de una máquina a
 *     la otra es un salto de red local: no pasa por ningún servidor y no gasta
 *     el cupo de nadie. Solo se enciende con permiso, y solo en salas chicas.
 *     Por qué hace falta permiso: una conexión directa le muestra tu dirección
 *     IP a quien esté del otro lado, y del otro lado puede estar cualquiera
 *     que tenga el enlace.
 *
 * Lo importante es que por los dos viaja EL MISMO SOBRE cerrado con AES-GCM, y
 * los dos entran por la misma puerta —procesar()—, así que hay un solo lugar
 * donde se revisa lo que manda un desconocido. Con el proveedor WebRTC de la
 * librería no sería así: la presencia que llega por ahí entra por su propia
 * puerta y se saltearía toda la revisión de js/sala.js. Por eso no se usa.
 *
 * Para el relevo, esto es el mismo protocolo de siempre —«me interesa el tema
 * X», «publico en X»— así que sirve el mismo servidor de antes, sin cambiarle
 * nada. Hasta las señas para armar el camino directo viajan adentro de un
 * sobre cerrado, así que el relevo tampoco las puede leer.
 *
 * Adentro del sobre hay cinco clases de mensaje, y nada más:
 *
 *   { k: 'sv', d }        «tengo hasta acá, mandame lo que me falta»
 *   { k: 'u',  d }        un cambio del programa (un update de Yjs)
 *   { k: 'p',  i, c, e }  «soy este, acá está mi nombre y mi cursor»
 *   { k: 'rtc', a, para } una seña para armar el camino directo
 *   { k: 'chau', i }      «me voy»
 *
 * Cómo se ponen de acuerdo, sin servidor que guarde nada: el que llega
 * anuncia lo que tiene, y el que ya estaba le manda lo que le falta. Si no hay
 * nadie, no llega nada, y el que llegó es el primero. Eso significa que si se
 * van todos, el programa no queda en ninguna parte —el relevo no lo guarda,
 * justamente porque no lo puede leer— y cada uno se queda con su copia local.
 *
 * API:  SalaUI.conectar({ Y, doc, sala, secreto, servidores, papel })
 *       -> { vecinos, al, mandarPresencia, destruir, estado }
 */
(function (global) {
  'use strict';

  const S = () => global.Sala;
  const REINTENTOS = [800, 1600, 3200, 6000, 10000];

  function conectar(cfg) {
    const Y = cfg.Y;
    const doc = cfg.doc;
    const sala = String(cfg.sala || '');
    const vecinos = S().Vecinos(doc.clientID);
    const vigia = S().Vigia();
    /* A quiénes ya les anunciamos qué tenemos, en esta conexión. */
    let conocidas = new Set();
    /* sesión -> clientID de esa persona, para saber a quién ofrecerle el
       camino directo y quién ofrece primero. */
    const quienEs = new Map();
    const oyentes = new Map();

    /* El modo «a mano»: no hay relevo ni socket, hay un canal que alguien de
       afuera ya armó pegando códigos (js/mano-ui.js). Los sobres son los
       mismos y entran por la misma puerta; lo único distinto es por dónde
       viajan. */
    const canal = cfg.canal || null;

    let ws = null, ctx = null, clave = null;
    cfg.directo = Object.assign({ permitido: false, hasta: 4, iceServers: [] }, cfg.directo || {});
    const directo = armarDirecto();
    let servidor = null, intento = 0;
    let vivo = true, listo = false;
    let latido = null, guadana = null, reloj = null;

    const avisar = (que, datos) => {
      for (const f of (oyentes.get(que) || [])) {
        try { f(datos); } catch (e) { /* un oyente roto no corta la sala */ }
      }
    };

    const decir = (motivo, conectado) => avisar('estado', {
      conectado: !!conectado, motivo, gente: vecinos.getStates().size, servidor,
      directos: directo.abiertos, directo: directo.encendido
    });

    /* ---------------------------- mandar ----------------------------- */

    /* Todo sale por acá, y todo sale cerrado. Si la conexión no está, se
       pierde y no se encola: un cambio de Yjs viejo no sirve para nada, porque
       al volver se manda el estado entero. Encolar sería guardar basura. */
    /* El socket se agarra ANTES de cerrar el sobre y se usa ese, no el de la
       variable: cerrar un sobre es asincrónico, y en el medio la conexión
       puede haber cambiado. Con la variable se perdía justo el mensaje que
       más importa, el «me voy», porque al soltarlo ya estaba en null y los
       demás se quedaban viendo a alguien que no estaba. */
    async function mandar(objeto) {
      const s = ws, c = ctx;
      if (!c) return;
      let sobre;
      try { sobre = await S().cerrar(c, objeto); } catch (e) { return; }

      /* A mano no hay a quién más mandarle: es de a dos y por el canal. */
      if (canal) { canal.enviar(sobre); return; }

      /* Las señas para encontrarse van por el relevo sí o sí: son justamente
         lo que hace falta ANTES de que exista el camino directo. */
      const soloRelevo = objeto.k === 'rtc';

      if (!soloRelevo) directo.mandar(sobre);

      /* Y por el relevo también, salvo que el camino directo llegue a todos.
         Mientras haya una sola persona sin canal directo, el relevo es el
         único que la alcanza. */
      if (!soloRelevo && directo.alcanzaATodos()) return;
      if (!s || s.readyState !== 1) return;
      try { s.send(JSON.stringify({ type: 'publish', topic: sala, data: { e: sobre } })); }
      catch (e) { /* se cortó justo */ }
    }

    const mandarCambio = u => mandar({ k: 'u', d: S().aTexto(u) });
    const mandarEstado = () => mandar({ k: 'sv', d: S().aTexto(Y.encodeStateVector(doc)) });

    function mandarPresencia() {
      const mio = vecinos.getLocalState();
      return mandar({ k: 'p', i: doc.clientID, c: vecinos.reloj, e: mio });
    }

    /* --------------------------- recibir ----------------------------- */

    /* Un update de Yjs no se puede revisar campo por campo como un nombre: es
       un formato binario que solo entiende la librería. Lo que sí se puede es
       no dejarlo entrar si es absurdamente grande, que es la forma barata de
       que alguien con el enlace te llene la memoria. */
    const TOPE_CAMBIO = 2 * 1024 * 1024;

    async function alLlegar(crudo) {
      if (typeof crudo !== 'string') return;
      let m;
      try { m = JSON.parse(crudo); } catch (e) { return; }
      /* La sala llena: el relevo lo dice y no se reintenta, porque reintentar
         contra una puerta cerrada es quedarse mirando «buscando…» para
         siempre. */
      if (m && m.type === 'lleno' && m.topic === sala) {
        vivo = false; listo = false;
        clearTimeout(reloj);
        decir('la sala está llena (' + S().LIMITES.gente + ' personas)', false);
        try { if (ws) ws.close(); } catch (e) {}
        ws = null;
        return;
      }
      if (!m || m.type !== 'publish' || m.topic !== sala) return;
      if (!m.data || typeof m.data.e !== 'string') return;
      return procesar(m.data.e);
    }

    /* El sobre, venga por donde venga. Es la misma función para el relevo y
       para el canal directo a propósito: un solo formato y un solo lugar donde
       se revisa lo que manda un desconocido. Si el camino directo tuviera su
       propia puerta de entrada, habría que acordarse de revisar en dos lados. */
    async function procesar(texto) {
      const sobre = await S().abrir(ctx, texto);
      if (!sobre) return;                                   // no tenía la llave
      if (!vigia.pasa(sobre.sesion, sobre.n)) return;       // ya había pasado
      const d = sobre.dentro;

      /* La primera vez que se oye a alguien, se le anuncia qué tenemos.
         Hace falta porque el relevo solo reparte a los que YA están anotados
         en la sala: si dos se conectan en el mismo instante —o si el relevo se
         cayó y los dos vuelven juntos—, el anuncio de uno llega antes de que el
         otro esté anotado y se pierde, y los dos quedan «conectados» mirando
         programas distintos. Así se arregla solo en cuanto se oyen. */
      if (!conocidas.has(sobre.sesion)) {
        conocidas.add(sobre.sesion);
        mandarEstado();
      }

      if (d.k === 'u') {
        const bytes = S().aBytes(d.d);
        if (!bytes || bytes.length > TOPE_CAMBIO) return;
        /* El origen importa: sin él, aplicar lo que llegó dispara el oyente de
           abajo y lo devuelve por donde vino, en un ida y vuelta sin fin. */
        try { Y.applyUpdate(doc, bytes, 'sala'); } catch (e) { /* update roto */ }
        return;
      }

      if (d.k === 'sv') {
        const bytes = S().aBytes(d.d);
        if (!bytes) return;
        let falta;
        try { falta = Y.encodeStateAsUpdate(doc, bytes); } catch (e) { return; }
        if (falta && falta.length) mandarCambio(falta);
        /* Quien llega también quiere saber quién está. */
        mandarPresencia();
        return;
      }

      if (d.k === 'p') {
        const id = Number(d.i);
        if (!Number.isFinite(id)) return;
        if (vecinos.getStates().size >= S().LIMITES.gente && !vecinos.getStates().has(id)) return;
        quienEs.set(sobre.sesion, id);
        if (vecinos.recibir(id, d.e, Number(d.c), Date.now())) decir(null, true);
        directo.alSaberDeAlguien(sobre.sesion, id);
        return;
      }

      if (d.k === 'rtc') { directo.alLlegarSeña(sobre.sesion, d); return; }

      if (d.k === 'chau') {
        const id = Number(d.i);
        if (!Number.isFinite(id)) return;
        vigia.olvidar(sobre.sesion);
        quienEs.delete(sobre.sesion);
        directo.cortar(sobre.sesion);
        if (vecinos.recibir(id, null, Number(d.c), Date.now())) decir(null, true);
      }
    }

    /* ------------------------------------------------------------------ */
    /* El camino directo                                                   */
    /* ------------------------------------------------------------------ */
    /*
     * De a dos en el mismo laboratorio, el camino directo es un salto de red
     * local: no pasa por ningún servidor, no gasta el cupo de nadie y va más
     * rápido. Para eso —y solo para eso— existe esto.
     *
     * Tres decisiones que valen la pena explicar:
     *
     *   · NO se usa el proveedor WebRTC de la librería. Por acá viaja el mismo
     *     sobre cerrado que va por el relevo, así que hay un solo formato y un
     *     solo lugar donde se revisa lo que manda un desconocido. Con el
     *     proveedor de la librería, la presencia que llega por WebRTC entra
     *     por su propia puerta —escribe derecho en su tabla de estados— y se
     *     saltearía toda la revisión de js/sala.js;
     *   · las señas para encontrarse (oferta, respuesta, candidatos) viajan
     *     adentro de un sobre cerrado por el relevo. El relevo las reparte sin
     *     poder leerlas, igual que todo lo demás;
     *   · nada de esto arranca sin permiso. Abrir una conexión directa le
     *     muestra tu dirección IP a quien esté del otro lado, y del otro lado
     *     puede estar cualquiera que tenga el enlace. Por eso el permiso se
     *     pide antes de crear la primera conexión, no después.
     */
    function armarDirecto() {
      const canales = new Map();          // sesión -> { pc, dc, abierto }
      let encendido = false;

      const puedo = () => encendido && !!global.RTCPeerConnection;

      /* Quién ofrece y quién contesta, sin ponerse de acuerdo: el de número
         más chico ofrece. Sin una regla así los dos ofrecen a la vez y las dos
         ofertas se pisan. */
      const meTocaOfrecer = suId => doc.clientID < suId;

      function nuevaConexion(sesion) {
        const pc = new global.RTCPeerConnection({ iceServers: cfg.directo.iceServers || [] });
        const entrada = { pc, dc: null, abierto: false };
        canales.set(sesion, entrada);

        pc.onicecandidate = ev => {
          if (ev.candidate) mandar({ k: 'rtc', a: 'ice', para: sesion, c: ev.candidate.toJSON() });
        };
        pc.onconnectionstatechange = () => {
          if (['failed', 'closed', 'disconnected'].indexOf(pc.connectionState) >= 0) cortar(sesion);
        };
        pc.ondatachannel = ev => atarCanal(sesion, ev.channel);
        return entrada;
      }

      function atarCanal(sesion, dc) {
        const e = canales.get(sesion);
        if (!e) { try { dc.close(); } catch (x) {} return; }
        e.dc = dc;
        dc.onopen = () => {
          e.abierto = true;
          /* Recién conectado no quiere decir al día: se vuelven a contar las
             cartas por el camino nuevo. */
          mandarEstado();
          decir(null, listo);
        };
        dc.onclose = () => { e.abierto = false; decir(null, listo); };
        dc.onmessage = ev => {
          /* Lo que llega por acá es exactamente lo que llega por el relevo, y
             pasa por la misma revisión. El tope de tamaño lo aplica
             Sala.abrir() antes de mirar nada. */
          if (typeof ev.data === 'string') procesar(ev.data);
        };
      }

      async function alSaberDeAlguien(sesion, suId) {
        if (!puedo() || canales.has(sesion) || sesion === ctx.sesion) return;
        /* El techo: de a pocos el directo conviene, en una clase entera es una
           malla de conexiones que no escala. Pasado el tope, relevo y listo. */
        if (vecinos.getStates().size > cfg.directo.hasta) return;
        if (!meTocaOfrecer(suId)) return;                   // le toca ofrecer a él

        const e = nuevaConexion(sesion);
        atarCanal(sesion, e.pc.createDataChannel('esle2', { ordered: true }));
        try {
          const oferta = await e.pc.createOffer();
          await e.pc.setLocalDescription(oferta);
          mandar({ k: 'rtc', a: 'oferta', para: sesion, sdp: e.pc.localDescription.sdp });
        } catch (x) { cortar(sesion); }
      }

      async function alLlegarSeña(sesion, d) {
        if (!puedo() || d.para !== ctx.sesion) return;
        try {
          if (d.a === 'oferta') {
            if (typeof d.sdp !== 'string' || d.sdp.length > 64 * 1024) return;
            const e = canales.get(sesion) || nuevaConexion(sesion);
            await e.pc.setRemoteDescription({ type: 'offer', sdp: d.sdp });
            const r = await e.pc.createAnswer();
            await e.pc.setLocalDescription(r);
            mandar({ k: 'rtc', a: 'respuesta', para: sesion, sdp: e.pc.localDescription.sdp });
            return;
          }
          const e = canales.get(sesion);
          if (!e) return;
          if (d.a === 'respuesta') {
            if (typeof d.sdp !== 'string' || d.sdp.length > 64 * 1024) return;
            await e.pc.setRemoteDescription({ type: 'answer', sdp: d.sdp });
            return;
          }
          if (d.a === 'ice' && d.c && typeof d.c === 'object') await e.pc.addIceCandidate(d.c);
        } catch (x) { /* una seña mal armada no rompe la sala */ }
      }

      function cortar(sesion) {
        const e = canales.get(sesion);
        if (!e) return;
        canales.delete(sesion);
        try { if (e.dc) e.dc.close(); } catch (x) {}
        try { e.pc.close(); } catch (x) {}
        decir(null, listo);
      }

      return {
        alSaberDeAlguien, alLlegarSeña, cortar,
        encender() {
          if (encendido) return;
          encendido = true;
          /* A los que ya estaban se los saluda ahora. */
          for (const [s, id] of quienEs) alSaberDeAlguien(s, id);
        },
        get encendido() { return encendido; },
        get abiertos() {
          let n = 0;
          for (const e of canales.values()) if (e.abierto) n++;
          return n;
        },
        /* ¿Está TODO el mundo por el camino directo? Solo si es así se deja de
           mandar por el relevo. Se compara contra las sesiones de las que se
           oyó algo, no contra un número: un número igual puede ser gente
           distinta, y ahí alguien deja de recibir sin que nadie se entere. */
        alcanzaATodos() {
          if (!encendido || !quienEs.size) return false;
          for (const s of quienEs.keys()) {
            const e = canales.get(s);
            if (!e || !e.abierto) return false;
          }
          return true;
        },
        mandar(texto) {
          for (const e of canales.values()) {
            if (!e.abierto) continue;
            try { e.dc.send(texto); } catch (x) { /* se cortó justo */ }
          }
        },
        destruir() {
          for (const s of Array.from(canales.keys())) cortar(s);
          encendido = false;
        }
      };
    }

    /* --------------------------- la conexión -------------------------- */

    function abrirSocket(url) {
      servidor = url;
      /* Sesión nueva en cada conexión: la cuenta de sobres vuelve a cero y no
         se repite nunca un número con la misma llave. */
      ctx = S().contexto(clave, sala);
      let s;
      try { s = new WebSocket(url); } catch (e) { reintentar(); return; }
      ws = s;

      s.onopen = () => {
        if (!vivo || ws !== s) { try { s.close(); } catch (e) {} return; }
        intento = 0;
        listo = true;
        conocidas = new Set();
        s.send(JSON.stringify({ type: 'subscribe', topics: [sala] }));
        mandarEstado();
        mandarPresencia();
        decir('conectado', true);
      };
      s.onmessage = ev => { if (ws === s) alLlegar(String(ev.data)); };
      s.onerror = () => { /* onclose viene igual y ahí se reintenta */ };
      s.onclose = () => {
        if (ws !== s) return;
        ws = null;
        listo = false;
        if (vivo) { decir('se cortó, reintentando…', false); reintentar(); }
      };
    }

    function reintentar() {
      if (!vivo) return;
      const espera = REINTENTOS[Math.min(intento, REINTENTOS.length - 1)];
      intento++;
      clearTimeout(reloj);
      reloj = setTimeout(() => { if (vivo) arrancar(); }, espera);
    }

    /* A mano: el canal ya existe o va a existir, y no hay nada que buscar ni
       nada que reintentar. Si se corta, se corta: volver a conectarse es
       pegarse otro código, y eso lo deciden las dos personas. */
    function arrancarAMano() {
      ctx = S().contexto(clave, sala);
      canal.alTexto = texto => { if (vivo) procesar(texto); };
      canal.alAbrir = () => {
        if (!vivo) return;
        listo = true;
        conocidas = new Set();
        mandarEstado();
        mandarPresencia();
        decir('conectado con tu compañero', true);
      };
      canal.alCerrar = () => {
        if (!vivo) return;
        listo = false;
        /* Al compañero lo saca la poda, como a cualquiera que se calla: no
           hace falta una regla aparte para esto. */
        decir('se cortó la conexión con tu compañero', false);
      };
      if (canal.abierto) canal.alAbrir();
    }

    async function arrancar() {
      if (!vivo) return;
      if (canal) return arrancarAMano();
      /* Cuál servidor: el primero que REENVÍE de verdad, no el primero que
         conteste. Un relevo que acepta la conexión y no reparte nada deja a
         todos «conectados» y solos, que es cómo estuvo roto esto mucho tiempo.

         Se prueba siempre, incluso cuando hay uno solo. Antes se salteaba la
         prueba en ese caso —que es el caso normal de una escuela con su
         relevo— y era justo donde más falta hacía: el único servidor
         configurado es el único que puede dejar a todo un curso conectado y
         solo. */
      let url = null;
      try { url = await global.Juntos.alguienReenvia(cfg.servidores); } catch (e) { url = null; }
      if (!vivo) return;
      if (!url) { decir('sin relevo', false); reintentar(); return; }
      abrirSocket(url);
    }

    /* ---------------------------- arrancar ---------------------------- */

    const alCambiarElDoc = (u, origen) => { if (origen !== 'sala') mandarCambio(u); };
    const alCambiarLoMio = () => mandarPresencia();

    (async () => {
      try { clave = await S().claveDe(cfg.secreto, sala); }
      catch (e) { decir('no se pudo preparar el cifrado', false); return; }
      if (!vivo) return;

      /* El propio estado se arma con las mismas reglas que el ajeno: así uno
         se ve en la lista del mismo color con el que lo ven los demás, que es
         todo el sentido de que el color salga del nombre. */
      vecinos.setLocalState(S().presencia({ user: { name: cfg.alias, papel: cfg.papel } }));
      if (cfg.directo.permitido) directo.encender();
      doc.on('update', alCambiarElDoc);
      vecinos.on('update', alCambiarLoMio);

      /* El latido: el relevo no sabe quién se fue —no sabe quién es quién—,
         así que la única señal honesta de que alguien sigue ahí es que lo
         diga cada tanto. Al que se calla, se lo saca de la lista. */
      latido = setInterval(() => { if (listo) mandarPresencia(); }, S().LIMITES.latido);
      guadana = setInterval(() => {
        if (vecinos.podar().length) decir(null, listo);
      }, 5000);

      arrancar();
    })();

    /* ----------------------------- afuera ----------------------------- */

    return {
      vecinos,
      al(que, f) {
        if (!oyentes.has(que)) oyentes.set(que, []);
        oyentes.get(que).push(f);
      },
      mandarPresencia,
      /* El permiso para el camino directo se da en pantalla, así que se
         enciende desde afuera y nunca solo. */
      encenderDirecto() { cfg.directo.permitido = true; directo.encender(); decir(null, listo); },
      get directos() { return directo.abiertos; },
      get conectado() { return listo; },
      get servidor() { return servidor; },
      get gente() { return vecinos.getStates().size; },

      destruir() {
        if (!vivo) return;
        vivo = false;
        clearInterval(latido); clearInterval(guadana); clearTimeout(reloj);
        doc.off('update', alCambiarElDoc);
        vecinos.off('update', alCambiarLoMio);
        directo.destruir();

        if (canal) {
          const irse = () => { try { canal.cerrar(); } catch (e) { /* ya estaba */ } };
          if (listo) mandar({ k: 'chau', i: doc.clientID, c: vecinos.reloj + 1 }).then(irse, irse);
          else irse();
          vecinos.destroy();
          oyentes.clear();
          return;
        }

        /* Avisar que uno se va es cortesía, no seguridad: si la pestaña se
           cierra de golpe no llega, y por eso existe el latido. */
        const suave = ws;
        if (suave && suave.readyState === 1) {
          mandar({ k: 'chau', i: doc.clientID, c: vecinos.reloj + 1 })
            .then(() => { try { suave.close(); } catch (e) {} });
        } else if (suave) { try { suave.close(); } catch (e) {} }
        ws = null;
        vecinos.destroy();
        oyentes.clear();
      }
    };
  }

  global.SalaUI = { conectar };
})(typeof window !== 'undefined' ? window : globalThis);

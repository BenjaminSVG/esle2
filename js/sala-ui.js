/*
 * La sala compartida, la parte que se conecta.
 *
 * Reemplaza al proveedor WebRTC de la librería. Hace lo mismo que hacía —que
 * dos o más editores muestren el mismo programa— por otro camino: en vez de
 * que los navegadores se hablen entre sí, todos hablan con un relevo que
 * reenvía. El porqué está en js/sala.js, arriba de todo: el camino directo no
 * existe en el wifi de un colegio.
 *
 * El relevo no entiende nada de lo que reparte. Lo que sale de acá son sobres
 * cerrados con AES-GCM, y la llave nunca sale del navegador. Para el relevo,
 * esto es el mismo protocolo de siempre —«me interesa el tema X», «publico en
 * X»— así que sirve el mismo servidor que ya estaba escrito, sin cambiarle
 * nada.
 *
 * Adentro del sobre hay cuatro clases de mensaje, y nada más:
 *
 *   { k: 'sv', d }        «tengo hasta acá, mandame lo que me falta»
 *   { k: 'u',  d }        un cambio del programa (un update de Yjs)
 *   { k: 'p',  i, c, e }  «soy este, acá está mi nombre y mi cursor»
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
    const oyentes = new Map();

    let ws = null, ctx = null, clave = null;
    let servidor = null, intento = 0;
    let vivo = true, listo = false;
    let latido = null, guadana = null, reloj = null;

    const avisar = (que, datos) => {
      for (const f of (oyentes.get(que) || [])) {
        try { f(datos); } catch (e) { /* un oyente roto no corta la sala */ }
      }
    };

    const decir = (motivo, conectado) => avisar('estado', {
      conectado: !!conectado, motivo, gente: vecinos.getStates().size, servidor
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
      if (!s || s.readyState !== 1 || !c) return;
      let sobre;
      try { sobre = await S().cerrar(c, objeto); } catch (e) { return; }
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

      const sobre = await S().abrir(ctx, m.data.e);
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
        if (vecinos.recibir(id, d.e, Number(d.c), Date.now())) decir(null, true);
        return;
      }

      if (d.k === 'chau') {
        const id = Number(d.i);
        if (!Number.isFinite(id)) return;
        vigia.olvidar(sobre.sesion);
        if (vecinos.recibir(id, null, Number(d.c), Date.now())) decir(null, true);
      }
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

    async function arrancar() {
      if (!vivo) return;
      /* Cuál servidor: el primero que REENVÍE de verdad, no el primero que
         conteste. Un relevo que acepta la conexión y no reparte nada deja a
         todos «conectados» y solos, que es cómo estuvo roto esto mucho tiempo. */
      let url = cfg.servidores && cfg.servidores.length === 1 ? cfg.servidores[0] : null;
      if (!url) {
        try { url = await global.Juntos.alguienReenvia(cfg.servidores); } catch (e) { url = null; }
      }
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
      get conectado() { return listo; },
      get servidor() { return servidor; },
      get gente() { return vecinos.getStates().size; },

      destruir() {
        if (!vivo) return;
        vivo = false;
        clearInterval(latido); clearInterval(guadana); clearTimeout(reloj);
        doc.off('update', alCambiarElDoc);
        vecinos.off('update', alCambiarLoMio);
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

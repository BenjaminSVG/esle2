/*
 * Conectar dos computadoras pegando códigos, sin ningún servidor.
 *
 * Está del lado «-ui» aunque no toque el DOM porque hace lo mismo que el DOM:
 * solo existe en el navegador. Acá adentro está la RTCPeerConnection, y una
 * RTCPeerConnection no se puede probar en Node. Lo que sí se puede probar
 * —cómo se arma y cómo se lee el código— está en js/mano.js, que es puro.
 *
 * Cómo es de punta a punta:
 *
 *   A  invitar()      arma la conexión, junta TODAS sus direcciones y recién
 *                     entonces da el código. Se lo manda a B por donde sea.
 *   B  responder()    pega ese código, arma su lado y da el código de vuelta.
 *   A  aceptar()      pega la respuesta y quedan conectados, directo.
 *
 * Las direcciones se juntan ANTES de dar el código y no de a una (nada de
 * trickle), porque no hay por dónde mandar las que aparezcan después: el único
 * mensajero es la persona, y no se le va a pedir que copie cinco códigos.
 *
 * Sin servidor de verdad: con iceServers vacío no se habla con nadie. Eso
 * alcanza entre dos máquinas de la misma red —el laboratorio, que es donde
 * esto hace falta— y no alcanza para atravesar dos routers distintos. Para eso
 * hay una casilla aparte, apagada, que enciende los STUN de js/sala.js y lo
 * dice: esos servidores ven la IP, aunque no el programa.
 */
(function (global) {
  'use strict';

  const M = () => global.Mano;
  const S = () => global.Sala;

  /* Cuánto se espera a que el navegador junte sus direcciones. Si no termina,
     se corta el intento: un código a medias conecta a veces, y «a veces» es la
     peor forma de fallar. */
  const ESPERA_ICE = 15000;

  /* Lo más grande que se manda de una vez por el canal. SCTP tiene su propio
     tope y no es el mismo en todos los navegadores, así que el sobre se parte
     y se rearma del otro lado. */
  const TROZO = 16 * 1024;

  const hayRTC = () => !!global.RTCPeerConnection;

  /* ------------------------------------------------------------------ */
  /* El canal                                                            */
  /* ------------------------------------------------------------------ */

  /* Lo que ve js/sala-ui.js: algo por donde mandar un texto y algo que avisa
     cuando llega otro. Nada de WebRTC sale de acá para arriba. */
  function armarCanal(pc) {
    const canal = {
      abierto: false,
      alTexto: null, alAbrir: null, alCerrar: null, alFallar: null,
      enviar(texto) { mandarPartido(String(texto)); },
      cerrar() {
        try { if (dc) dc.close(); } catch (e) { /* ya estaba */ }
        try { pc.close(); } catch (e) { /* ya estaba */ }
      }
    };

    /* Que no conecte es un final posible y hay que decirlo. Sin esto, cuando
       la red no deja, la pantalla se queda «esperando» para siempre, que es
       exactamente la forma de fallar que venimos sacando de todos lados. */
    pc.onconnectionstatechange = () => {
      const e = pc.connectionState;
      if ((e === 'failed' || e === 'closed') && !canal.abierto && canal.alFallar) canal.alFallar(e);
    };

    let dc = null;
    let siguiente = 1;
    /* Un solo sobre a medio llegar por vez: son de a dos y el canal es
       ordenado, así que si aparece otro id es que algo se perdió o que alguien
       está probando cosas. En los dos casos, lo viejo no sirve. */
    let armando = null;

    function mandarPartido(texto) {
      if (!dc || dc.readyState !== 'open') return;
      const tope = Math.min(TROZO, Math.max(1024, (pc.sctp && pc.sctp.maxMessageSize
        ? pc.sctp.maxMessageSize - 512 : TROZO)));
      const total = Math.ceil(texto.length / tope) || 1;
      const id = siguiente++;
      for (let i = 0; i < total; i++) {
        try { dc.send(JSON.stringify({ i: id, n: i, t: total, d: texto.slice(i * tope, (i + 1) * tope) })); }
        catch (e) { return; }                       // se cortó en el medio
      }
    }

    function alLlegarTrozo(crudo) {
      if (typeof crudo !== 'string' || crudo.length > TROZO * 4) return;
      let f;
      try { f = JSON.parse(crudo); } catch (e) { return; }
      if (!f || typeof f.d !== 'string') return;
      if (!Number.isSafeInteger(f.i) || !Number.isSafeInteger(f.n) || !Number.isSafeInteger(f.t)) return;
      if (f.t < 1 || f.n < 0 || f.n >= f.t) return;

      if (!armando || armando.id !== f.i) armando = { id: f.i, partes: [], vistos: 0, largo: 0 };
      if (armando.partes[f.n] !== undefined) return;         // repetido
      armando.partes[f.n] = f.d;
      armando.vistos++;
      armando.largo += f.d.length;
      /* El tope del sobre es el de js/sala.js: el mismo número de un lado y
         del otro, para que no haya un camino más generoso que el otro. */
      if (armando.largo > S().LIMITES.sobre) { armando = null; return; }
      if (armando.vistos < f.t) return;

      const texto = armando.partes.join('');
      armando = null;
      if (canal.alTexto) canal.alTexto(texto);
    }

    canal.atar = nuevo => {
      dc = nuevo;
      dc.onopen = () => { canal.abierto = true; if (canal.alAbrir) canal.alAbrir(); };
      dc.onclose = () => { canal.abierto = false; if (canal.alCerrar) canal.alCerrar(); };
      dc.onmessage = ev => alLlegarTrozo(String(ev.data));
    };
    return canal;
  }

  /* ------------------------------------------------------------------ */
  /* Juntar las direcciones                                              */
  /* ------------------------------------------------------------------ */

  function esperarDirecciones(pc) {
    return new Promise((resolver, rechazar) => {
      if (pc.iceGatheringState === 'complete') return resolver();
      let reloj = null;
      const mirar = () => {
        if (pc.iceGatheringState !== 'complete') return;
        clearTimeout(reloj);
        pc.removeEventListener('icegatheringstatechange', mirar);
        resolver();
      };
      pc.addEventListener('icegatheringstatechange', mirar);
      reloj = setTimeout(() => {
        pc.removeEventListener('icegatheringstatechange', mirar);
        rechazar(new Error('tardo'));
      }, ESPERA_ICE);
    });
  }

  const nuevaConexion = stun => new global.RTCPeerConnection({
    /* Vacío quiere decir vacío: sin la casilla marcada, este navegador no le
       habla a ningún servidor de nadie. */
    iceServers: stun ? (S().STUN || []) : []
  });

  /* ------------------------------------------------------------------ */
  /* Invitar                                                             */
  /* ------------------------------------------------------------------ */

  /* -> { codigo, canal, aceptar(texto), cancelar() } */
  async function invitar(opciones) {
    const o = opciones || {};
    if (!hayRTC()) throw new Error('sin-rtc');

    const pc = nuevaConexion(o.stun);
    const canal = armarCanal(pc);
    canal.atar(pc.createDataChannel('esle2', { ordered: true }));

    const intento = M().nuevoIntento();
    const vence = Date.now() + M().LIMITES.vida;

    try {
      await pc.setLocalDescription(await pc.createOffer());
      await esperarDirecciones(pc);
    } catch (e) { canal.cerrar(); throw e; }

    const codigo = await M().armar({
      rol: 'i', sala: o.sala, secreto: o.secreto, intento, vence,
      sdp: pc.localDescription.sdp
    });
    if (!codigo) { canal.cerrar(); throw new Error('no-se-pudo'); }

    /* La invitación queda acá para comparar contra la respuesta. */
    const mia = { r: 'i', sala: String(o.sala), intento, vence };
    let usada = false;

    return {
      codigo, canal, intento, vence,
      /* -> { ok: true } | { ok: false, mensaje } */
      async aceptar(texto) {
        if (usada) return { ok: false, mensaje: M().MENSAJES.otra };
        const r = await M().leer(texto);
        if (!r.ok) return { ok: false, mensaje: r.mensaje };
        if (r.paquete.r !== 'r') return { ok: false, mensaje: M().MENSAJES.invitacion };
        if (!M().contesta(mia, r.paquete)) return { ok: false, mensaje: M().MENSAJES.otra };
        if (!M().vigente(r.paquete)) return { ok: false, mensaje: M().MENSAJES.vencido };
        try { await pc.setRemoteDescription({ type: 'answer', sdp: r.paquete.sdp }); }
        catch (e) { return { ok: false, mensaje: M().MENSAJES.sdp }; }
        usada = true;
        return { ok: true };
      },
      cancelar() { canal.cerrar(); }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Responder                                                           */
  /* ------------------------------------------------------------------ */

  /* Leer la invitación NO arma ninguna conexión: primero se mira qué dice y se
     le pregunta al alumno, y recién después se toca la red. */
  async function leerInvitacion(texto) {
    const r = await M().leer(texto);
    if (!r.ok) return { ok: false, mensaje: r.mensaje };
    if (r.paquete.r !== 'i') return { ok: false, mensaje: M().MENSAJES.respuesta };
    if (!M().vigente(r.paquete)) return { ok: false, mensaje: M().MENSAJES.vencido };
    return { ok: true, paquete: r.paquete };
  }

  /* -> { codigo, canal, sala, secreto, cancelar() } */
  async function responder(paquete, opciones) {
    const o = opciones || {};
    if (!hayRTC()) throw new Error('sin-rtc');

    const pc = nuevaConexion(o.stun);
    const canal = armarCanal(pc);
    /* El canal lo abre quien invitó. Acá se espera ese y nada más: uno solo,
       el que dijimos. */
    pc.ondatachannel = ev => { if (ev.channel && ev.channel.label === 'esle2') canal.atar(ev.channel); };

    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: paquete.sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await esperarDirecciones(pc);
    } catch (e) { canal.cerrar(); throw e; }

    const codigo = await M().armar({
      rol: 'r', sala: paquete.sala, intento: paquete.intento, vence: paquete.vence,
      sdp: pc.localDescription.sdp
    });
    if (!codigo) { canal.cerrar(); throw new Error('no-se-pudo'); }

    return {
      codigo, canal, sala: paquete.sala, secreto: paquete.secreto,
      cancelar() { canal.cerrar(); }
    };
  }

  global.ManoUI = { invitar, responder, leerInvitacion, hayRTC, ESPERA_ICE, TROZO };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * El servidor de señas de ESLE2, en Cloudflare Workers.
 *
 * Es el mismo servidor que ../servidor.js —presenta a dos computadoras y se
 * va— pero escrito para Workers, que es donde se puede tener gratis y
 * despierto todo el tiempo. La lógica es idéntica y el protocolo también:
 * `subscribe`, `unsubscribe`, `publish`, `ping`. Los clientes no se enteran de
 * cuál de los dos está del otro lado.
 *
 * Por qué existe esta versión, y no alcanza con la de Node: los planes
 * gratuitos que corren Node duermen el servicio a los quince minutos sin
 * tráfico y tardan un minuto en despertar, cortando de paso todas las
 * conexiones abiertas. En una clase donde los chicos se conectan de a poco eso
 * es esperar un minuto una y otra vez, que es exactamente el síntoma que hacía
 * falta arreglar. Un Durable Object no duerme así.
 *
 * Este archivo es el punto de entrada del Worker, y por eso solo puede
 * exportar el handler y la clase del Durable Object. Lo demás —las constantes
 * y la decisión de qué hacer con cada mensaje— vive en logica.js, que además
 * se puede probar en Node.
 *
 * ------------------------------------------------------------------------
 * Un solo Durable Object, a propósito
 * ------------------------------------------------------------------------
 * Todas las conexiones van al MISMO objeto (`idFromName('global')`). Tiene que
 * ser así: dos personas solo se encuentran si las dos están en la misma lista
 * de interesados, y un objeto por región las dejaría mirándose de lejos sin
 * verse nunca. Es también un solo lugar donde puede estar lento, y no importa:
 * la demora acá solo afecta al saludo inicial, porque en cuanto las dos
 * computadoras se encontraron el programa viaja directo entre ellas.
 *
 * ------------------------------------------------------------------------
 * Hibernación
 * ------------------------------------------------------------------------
 * Se usa la API de hibernación (`acceptWebSocket`, no `ws.accept()`): las
 * conexiones quedan abiertas aunque el objeto se descargue de memoria, así que
 * una sala esperando a alguien no gasta nada. Los `ping` los contesta la
 * propia plataforma sin despertar a nadie.
 *
 * Como el objeto se puede descargar en cualquier momento, no puede haber
 * variables sueltas con los temas de cada uno: viven pegados a su conexión
 * (`serializeAttachment`), que es lo único que sobrevive a la hibernación.
 *
 * ------------------------------------------------------------------------
 * Lo que sigue siendo cierto
 * ------------------------------------------------------------------------
 * No ve el contenido: lo que pasa por acá son ofertas y respuestas de WebRTC,
 * y el programa que después viaja entre las dos máquinas va cifrado con una
 * contraseña que este servidor nunca recibe. No guarda nada: no se escribe una
 * sola fila en la base del objeto, así que tampoco hay nada que borrar ni que
 * pagar.
 */
import { decidir, PING, PONG } from './logica.js';

export class Senas {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    /* Que la plataforma conteste los pings sola: así una sala esperando a
       alguien no despierta al objeto cada treinta segundos. */
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG));
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('se esperaba una conexión WebSocket', { status: 426 });
    }
    const par = new WebSocketPair();
    const [cliente, servidor] = Object.values(par);

    /* acceptWebSocket y no servidor.accept(): es lo que deja hibernar. */
    this.ctx.acceptWebSocket(servidor);
    servidor.serializeAttachment({ t: [] });

    return new Response(null, { status: 101, webSocket: cliente });
  }

  temasDe(ws) {
    try {
      const a = ws.deserializeAttachment();
      return a && Array.isArray(a.t) ? a.t : [];
    } catch (e) { return []; }
  }

  async webSocketMessage(ws, datos) {
    if (typeof datos !== 'string') return;          // acá todo es JSON en texto
    let m;
    try { m = JSON.parse(datos); } catch (e) { return; }

    const r = decidir(m, this.temasDe(ws));

    if (r.temas) ws.serializeAttachment({ t: r.temas });

    if (r.responder) {
      try { ws.send(JSON.stringify(r.responder)); } catch (e) { /* se fue */ }
    }

    if (r.publicar) {
      /* A todos los interesados menos a quien lo publicó.
         Se recorren las conexiones abiertas y se mira la lista de cada una. Es
         lineal en la cantidad de gente conectada, no en la de salas: con un
         curso entero es nada. Si algún día esto tuviera miles de conexiones a
         la vez, habría que llevar un índice de tema a conexiones en la base
         del objeto; hoy sería complicarlo por gusto. */
      const texto = JSON.stringify(r.publicar.mensaje);
      for (const otro of this.ctx.getWebSockets()) {
        if (otro === ws) continue;
        if (!this.temasDe(otro).includes(r.publicar.tema)) continue;
        try { otro.send(texto); } catch (e) { /* se fue en el medio */ }
      }
    }
  }

  async webSocketClose(ws) {
    /* No hay nada que limpiar: lo único que guardaba esta conexión viajaba
       pegado a ella, y se va con ella. */
    try { ws.close(); } catch (e) { /* ya estaba cerrada */ }
  }

  async webSocketError(ws) {
    try { ws.close(); } catch (e) { /* ya estaba cerrada */ }
  }
}

export default {
  async fetch(request, env) {
    if (request.headers.get('Upgrade') === 'websocket') {
      /* Un solo objeto para todo el mundo: ver arriba. */
      const id = env.SENAS.idFromName('global');
      return env.SENAS.get(id).fetch(request);
    }
    /* Una página de estado mínima, para poder saber si está vivo desde el
       navegador sin abrir un WebSocket. No dice cuánta gente hay: eso sería
       contar a alguien, y este servidor no cuenta a nadie. */
    return new Response(
      'Servidor de señas de ESLE2.\n'
      + 'Presenta a dos computadoras y se va. No ve el contenido y no guarda nada.\n\n'
      + 'Para usarlo, en la consola del navegador en ESLE2:\n'
      + "  localStorage.esle2_senas = 'wss://" + (new URL(request.url)).host + "'\n",
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
};

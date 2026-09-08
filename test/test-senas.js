/*
 * Prueba del servidor de señas: de las dos versiones a la vez.
 *
 * Lo único que importa acá es que REENVÍE. Un servidor de señas que acepta la
 * conexión y no reenvía nada parece que anda —el cliente dice «conectado»— y
 * es exactamente la forma en que se rompieron los dos servidores públicos que
 * se probaron. Conectar no prueba nada; reenviar sí.
 *
 * Se prueban las dos implementaciones con la MISMA tanda de mensajes:
 *
 *   · servidor-senas/servidor.js            (Node, para una máquina propia)
 *   · servidor-senas/cloudflare/src/…       (Workers, para el plan gratuito)
 *
 * Son dos programas distintos que tienen que comportarse igual, porque el
 * navegador no sabe cuál está del otro lado. La de Node se prueba levantándola
 * de verdad y hablándole por WebSocket; la de Workers, por su lógica pura, que
 * está separada justamente para poder probarla sin Cloudflare.
 *
 *   node test/test-senas.js
 */
'use strict';
const path = require('path');
const { spawn } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const SENAS = path.join(RAIZ, 'servidor-senas');

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);
const esperar = ms => new Promise(r => setTimeout(r, ms));

/* ===================================================================== */
/* 1 · La versión de Workers, por su lógica pura                          */
/* ===================================================================== */
async function probarWorker() {
  seccion('Cloudflare Workers (la decisión, sin red)');
  const mod = await import(
    'file://' + path.join(SENAS, 'cloudflare', 'src', 'logica.js').replace(/\\/g, '/'));
  const { decidir, MAX_TEMAS, PING, PONG } = mod;

  /* Suscribirse deja el tema anotado. */
  {
    const r = decidir({ type: 'subscribe', topics: ['sala-1'] }, []);
    comprobar('suscribirse anota el tema', r.temas && r.temas.join() === 'sala-1', JSON.stringify(r.temas));
    comprobar('y no reenvía nada todavía', !r.publicar);
  }

  /* Suscribirse dos veces al mismo tema no lo duplica. */
  {
    const r = decidir({ type: 'subscribe', topics: ['sala-1'] }, ['sala-1']);
    comprobar('suscribirse dos veces no duplica', r.temas.join() === 'sala-1', JSON.stringify(r.temas));
  }

  /* Publicar sí reenvía: esto es LO que hay que probar. */
  {
    const m = { type: 'publish', topic: 'sala-1', data: 'una oferta de webrtc' };
    const r = decidir(m, ['sala-1']);
    comprobar('publicar reenvía', !!r.publicar, JSON.stringify(r));
    comprobar('al tema que corresponde', r.publicar.tema === 'sala-1', r.publicar.tema);
    comprobar('y el mensaje pasa entero, sin tocarlo',
      JSON.stringify(r.publicar.mensaje) === JSON.stringify(m), JSON.stringify(r.publicar.mensaje));
    comprobar('publicar no cambia los temas de nadie', r.temas === null);
  }

  /* Darse de baja. */
  {
    const r = decidir({ type: 'unsubscribe', topics: ['sala-1'] }, ['sala-1', 'sala-2']);
    comprobar('darse de baja saca solo ese tema', r.temas.join() === 'sala-2', JSON.stringify(r.temas));
  }

  /* El tope de temas: nadie se suscribe a todo. */
  {
    const muchos = [];
    for (let i = 0; i < MAX_TEMAS + 30; i++) muchos.push('t' + i);
    const r = decidir({ type: 'subscribe', topics: muchos }, []);
    comprobar('hay un tope de temas por conexión', r.temas.length === MAX_TEMAS, r.temas.length);
    /* La lista viaja pegada a la conexión y ahí entran 2 KB: si el tope
       dejara pasar más, se perdería sola y en silencio. */
    comprobar('y con ese tope la lista entra en los 2 KB del adjunto',
      JSON.stringify({ t: r.temas.map(() => 'esle2-rio-verde-8f3a12') }).length < 2048,
      JSON.stringify({ t: r.temas.map(() => 'esle2-rio-verde-8f3a12') }).length);
  }

  /* Basura: no puede tumbar nada. */
  {
    const basura = [null, undefined, {}, { type: 5 }, { type: 'publish' },
                    { type: 'publish', topic: '' }, { type: 'nada' },
                    { type: 'subscribe', topics: [1, null, ''] }];
    let exploto = false, reenvio = false;
    for (const b of basura) {
      try {
        const r = decidir(b, []);
        if (r.publicar) reenvio = true;
      } catch (e) { exploto = true; }
    }
    comprobar('la basura no lo tumba', !exploto);
    comprobar('y no hace que reenvíe cualquier cosa', !reenvio);
    comprobar('un subscribe con basura adentro no anota basura',
      decidir({ type: 'subscribe', topics: [1, null, '', 'bueno'] }, []).temas.join() === 'bueno');
  }

  comprobar('el ping que contesta la plataforma es el que manda y-webrtc',
    PING === '{"type":"ping"}', PING);
  comprobar('y la respuesta es la que espera', PONG === '{"type":"pong"}', PONG);
}

/* ===================================================================== */
/* 2 · La versión de Node, hablándole de verdad                           */
/* ===================================================================== */
async function probarNode() {
  seccion('Node (levantándolo y hablándole)');

  let WebSocket;
  try {
    WebSocket = require(path.join(SENAS, 'node_modules', 'ws'));
  } catch (e) {
    console.log('  (salteado: falta «ws»; corré npm install en servidor-senas/)');
    return;
  }

  const PUERTO = 4455;
  const proc = spawn(process.execPath, [path.join(SENAS, 'servidor.js')],
    { env: Object.assign({}, process.env, { PORT: String(PUERTO) }), stdio: 'ignore' });
  await esperar(700);

  const url = 'ws://localhost:' + PUERTO;
  const TEMA = 'prueba-' + Date.now();

  function abrir() {
    return new Promise((listo, falla) => {
      const w = new WebSocket(url);
      w.recibidos = [];
      w.on('message', d => { try { w.recibidos.push(JSON.parse(String(d))); } catch (e) {} });
      w.on('open', () => listo(w));
      w.on('error', falla);
    });
  }

  try {
    const a = await abrir();
    const b = await abrir();
    const c = await abrir();       // este no se suscribe: no tiene que recibir nada

    a.send(JSON.stringify({ type: 'subscribe', topics: [TEMA] }));
    b.send(JSON.stringify({ type: 'subscribe', topics: [TEMA] }));
    await esperar(300);

    const m = { type: 'publish', topic: TEMA, data: 'una oferta' };
    b.send(JSON.stringify(m));
    await esperar(500);

    comprobar('lo publicado llega al otro interesado', a.recibidos.length === 1,
      JSON.stringify(a.recibidos));
    comprobar('y llega igual a como salió',
      a.recibidos.length === 1 && a.recibidos[0].data === 'una oferta',
      JSON.stringify(a.recibidos[0]));
    comprobar('a quien lo publicó no le vuelve', b.recibidos.length === 0,
      JSON.stringify(b.recibidos));
    comprobar('y a quien no pidió el tema no le llega nada', c.recibidos.length === 0,
      JSON.stringify(c.recibidos));

    /* Darse de baja corta el reenvío. */
    a.send(JSON.stringify({ type: 'unsubscribe', topics: [TEMA] }));
    await esperar(300);
    b.send(JSON.stringify({ type: 'publish', topic: TEMA, data: 'otra' }));
    await esperar(400);
    comprobar('darse de baja corta el reenvío', a.recibidos.length === 1,
      JSON.stringify(a.recibidos));

    /* El ping. */
    c.send(JSON.stringify({ type: 'ping' }));
    await esperar(300);
    comprobar('contesta el ping', c.recibidos.length === 1 && c.recibidos[0].type === 'pong',
      JSON.stringify(c.recibidos));

    /* Basura. */
    c.send('esto no es json');
    c.send(JSON.stringify({ type: 'publish' }));
    await esperar(300);
    comprobar('la basura no lo tumba', c.readyState === c.OPEN);

    a.close(); b.close(); c.close();
  } finally {
    proc.kill();
  }
}

(async () => {
  await probarWorker();
  await probarNode();
  console.log('\n' + ok + ' bien, ' + fallos + ' mal');
  process.exit(fallos ? 1 : 0);
})();

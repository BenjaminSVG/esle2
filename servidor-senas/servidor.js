#!/usr/bin/env node
/*
 * Servidor de señas para «programar de a dos» y para las batallas.
 *
 * Lo único que hace es presentar a dos computadoras: recibe «me interesa el
 * tema X» y reenvía a los demás interesados lo que alguien publique en X. Con
 * eso las dos se ponen de acuerdo para hablarse directo por WebRTC, y a partir
 * de ahí este servidor deja de intervenir.
 *
 * NO ve el contenido: lo que se publica acá son ofertas y respuestas de WebRTC,
 * y el programa que después viaja entre las dos máquinas va cifrado con una
 * contraseña que este servidor nunca recibe. Tampoco guarda nada: no hay base
 * de datos, no hay archivos, no hay registro de quién habló con quién.
 *
 * Existe porque los servidores públicos de y-webrtc se caen. El que trae la
 * librería por omisión estaba caído mientras se escribía esto —abría la
 * conexión y no reenviaba nada, que es la peor forma de estar caído— y no hay
 * otro que se pueda recomendar. Con este, una escuela no depende de nadie.
 *
 *   node servidor.js            (escucha en el puerto 4444)
 *   PORT=8080 node servidor.js
 *
 * Se despliega en cualquier lado que corra Node: Fly, Render, Railway, o una
 * máquina de la escuela. Ver README.md.
 */
'use strict';
const http = require('http');
const { WebSocketServer } = require('ws');

const PUERTO = process.env.PORT || 4444;
const PING = 30000;          // cada cuánto se comprueba que el otro sigue ahí
const MAX_TEMAS = 50;        // por conexión, para que nadie se suscriba a todo

/* tema -> conjunto de conexiones interesadas */
const temas = new Map();

const servidor = http.createServer((req, res) => {
  /* Una página de estado mínima: sirve para saber si está vivo sin abrir un
     WebSocket, y para que el proveedor de hosting no lo apague. */
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Servidor de señas de ESLE2. Temas activos: ' + temas.size + '\n');
});

const wss = new WebSocketServer({ server: servidor });

const enviar = (conn, mensaje) => {
  if (conn.readyState !== conn.OPEN) { conn.close(); return; }
  try { conn.send(JSON.stringify(mensaje)); } catch (e) { conn.close(); }
};

wss.on('connection', conn => {
  const suyos = new Set();
  let vivo = true;

  /* Si el otro lado desaparece sin avisar —una notebook que se cierra— la
     conexión queda colgada. El ping lo detecta y la limpia. */
  const reloj = setInterval(() => {
    if (!vivo) { conn.close(); return; }
    vivo = false;
    try { conn.ping(); } catch (e) { conn.close(); }
  }, PING);
  conn.on('pong', () => { vivo = true; });

  conn.on('close', () => {
    for (const t of suyos) {
      const gente = temas.get(t);
      if (!gente) continue;
      gente.delete(conn);
      if (!gente.size) temas.delete(t);
    }
    suyos.clear();
    clearInterval(reloj);
  });

  conn.on('message', datos => {
    let m;
    try { m = JSON.parse(String(datos)); } catch (e) { return; }
    if (!m || typeof m.type !== 'string') return;

    if (m.type === 'subscribe') {
      for (const t of (m.topics || [])) {
        if (typeof t !== 'string' || suyos.size >= MAX_TEMAS) continue;
        if (!temas.has(t)) temas.set(t, new Set());
        temas.get(t).add(conn);
        suyos.add(t);
      }
      return;
    }
    if (m.type === 'unsubscribe') {
      for (const t of (m.topics || [])) {
        const gente = temas.get(t);
        if (gente) gente.delete(conn);
        suyos.delete(t);
      }
      return;
    }
    if (m.type === 'publish') {
      /* A todos los interesados menos a quien lo publicó. */
      const gente = temas.get(m.topic);
      if (!gente) return;
      for (const otro of gente) if (otro !== conn) enviar(otro, m);
      return;
    }
    if (m.type === 'ping') enviar(conn, { type: 'pong' });
  });
});

servidor.listen(PUERTO, () => {
  console.log('Servidor de señas de ESLE2 escuchando en el puerto ' + PUERTO);
});

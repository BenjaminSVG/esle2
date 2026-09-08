/*
 * La decisión del servidor de señas: qué hacer con cada mensaje.
 *
 * Está en su propio archivo por dos razones, y las dos importan.
 *
 * La primera es que se pueda probar en Node, sin Cloudflare y sin red
 * (test/test-senas.js). Es justo la parte que puede fallar en silencio: un
 * servidor de señas que acepta la conexión y no reenvía nada parece que anda
 * —el cliente dice «conectado»— y es la forma exacta en que se rompieron los
 * dos servidores públicos que se probaron. Conectar no prueba nada; reenviar
 * sí.
 *
 * La segunda es que el archivo de entrada de un Worker NO puede exportar
 * cualquier cosa: solo el handler y las clases de Durable Object. Un
 * `export const MAX_TEMAS = 20` ahí hace que el runtime se niegue a arrancar
 * («Incorrect type for map entry»). Así que las constantes viven acá.
 */

/* Cuántos temas puede pedir una conexión. Es más bajo que en la versión de
   Node (50) por una razón concreta: la lista viaja pegada a la conexión y ese
   espacio tiene un tope de 2 KB. Con 20 sobra —el navegador se suscribe a uno
   por sala— y así nunca se llega al límite. */
export const MAX_TEMAS = 20;

/* Lo que la plataforma contesta sola, sin despertar al objeto. y-webrtc manda
   exactamente esto para saber si seguimos vivos. */
export const PING = JSON.stringify({ type: 'ping' });
export const PONG = JSON.stringify({ type: 'pong' });

/*
 * Qué hacer con un mensaje.
 *
 *   mensaje  el objeto ya parseado que llegó
 *   mios     los temas que esta conexión tiene pedidos (array)
 *   ->  { temas, publicar, responder }
 *       temas      cómo queda su lista de temas (o null si no cambió)
 *       publicar   { tema, mensaje } para reenviar a los demás, o null
 *       responder  qué contestarle a quien mandó, o null
 */
export function decidir(mensaje, mios) {
  const vacio = { temas: null, publicar: null, responder: null };
  if (!mensaje || typeof mensaje.type !== 'string') return vacio;

  if (mensaje.type === 'subscribe') {
    const lista = new Set(mios);
    for (const t of (mensaje.topics || [])) {
      if (typeof t !== 'string' || !t) continue;
      if (lista.size >= MAX_TEMAS) break;
      lista.add(t);
    }
    return { temas: [...lista], publicar: null, responder: null };
  }

  if (mensaje.type === 'unsubscribe') {
    const lista = new Set(mios);
    for (const t of (mensaje.topics || [])) lista.delete(t);
    return { temas: [...lista], publicar: null, responder: null };
  }

  if (mensaje.type === 'publish') {
    if (typeof mensaje.topic !== 'string' || !mensaje.topic) return vacio;
    return { temas: null, publicar: { tema: mensaje.topic, mensaje }, responder: null };
  }

  /* El ping normalmente lo contesta la plataforma sin llegar hasta acá; esto
     queda por si algún cliente lo manda escrito de otra forma. */
  if (mensaje.type === 'ping') return { temas: null, publicar: null, responder: { type: 'pong' } };

  return vacio;
}

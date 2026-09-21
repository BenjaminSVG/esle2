/*
 * El código que se pasan dos alumnos para conectarse sin ningún servidor.
 *
 * Por qué existe esto. Dos navegadores no pueden encontrarse solos: uno tiene
 * que decirle al otro «mi dirección es esta, mi certificado es este» antes de
 * que exista cualquier conexión. Eso son las señas (la oferta y la respuesta
 * de WebRTC), y alguien las tiene que llevar. Cuando hay relevo, las lleva el
 * relevo. Cuando no hay nada, las llevan los alumnos: se copian un código y se
 * lo mandan por donde ya se hablan.
 *
 * Es más incómodo que un clic y es la única forma que no necesita servidor de
 * nadie, ni cuenta, ni plata.
 *
 * Lo que sale de acá adentro es texto que una persona va a pegar en otra
 * computadora, así que TODO lo que entra por «leer» es entrada de un
 * desconocido: se mide antes de leer, se descomprime con tope, y se rearma
 * campo por campo. Lo que no entra exactamente en esta forma no pasa.
 *
 * Lo que este código NO hace, y está dicho en pantalla:
 * - no está cifrado. Lleva señas, y la invitación lleva además la clave de la
 *   sala, así que a quien se lo reenvíen puede entrar. El programa sí viaja
 *   cifrado una vez conectados (js/sala.js);
 * - no dice quién es la otra persona. El nombre lo elige cada uno.
 */
(function (global) {
  'use strict';

  const FORMATO = 'esle2-mano';
  const VERSION = 1;

  /* El prefijo es para la persona, no para el programa: si alguien pega
     cualquier cosa, se puede decir «esto no es de ESLE2» en vez de «error». */
  const PREFIJO = 'ESLE2-1-';

  const LIMITES = {
    /* Lo que se acepta que alguien pegue. Más que esto no se mira siquiera. */
    texto: 200000,
    /* El bloque ya decodificado, y lo que sale de descomprimirlo. El tope de
       adentro se mide MIENTRAS se descomprime: esperar al final para medir es
       justo lo que aprovecha una bomba de descompresión. */
    apretado: 98304,
    abierto: 98304,
    /* Un SDP con sus candidatos es grande, pero no tanto. */
    sdp: 65536,
    sala: 64,
    secreto: 64,
    intento: 32,
    /* Diez minutos. No es revocación: es para que un código viejo que quedó
       dando vueltas en un chat no sirva para entrar la semana que viene. */
    vida: 600000
  };

  const MENSAJES = {
    formato: 'Ese código está incompleto o no es de ESLE2. Pedí que te lo copien de nuevo.',
    version: 'Ese código necesita otra versión de ESLE2. Actualicen los dos antes de empezar.',
    grande: 'Ese código es demasiado grande para ser de ESLE2.',
    roto: 'Ese código está cortado o mal copiado. Copialo entero y probá de nuevo.',
    campos: 'Ese código está incompleto o no es de ESLE2. Pedí que te lo copien de nuevo.',
    sdp: 'Ese código no sirve para conectar dos computadoras.',
    vencido: 'Ese código venció. Quien invita tiene que hacer uno nuevo.',
    invitacion: 'Pegaste una invitación. Acá va la respuesta de tu compañero.',
    respuesta: 'Eso es una respuesta. Acá va la invitación que te mandaron.',
    otra: 'Esa respuesta es de otra invitación. Pedile la del código que tenés abierto.'
  };

  const azar = n => {
    const b = new Uint8Array(n);
    (global.crypto || globalThis.crypto).getRandomValues(b);
    return b;
  };

  const enBase64url = bytes => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return global.btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const deBase64url = texto => {
    const limpio = String(texto).replace(/-/g, '+').replace(/_/g, '/');
    /* Sin relleno y sin basura al final: se decodifica y se vuelve a codificar,
       y tiene que dar lo mismo. Así no entra un código «parecido». */
    let crudo;
    try { crudo = global.atob(limpio + '==='.slice((limpio.length + 3) % 4)); }
    catch (e) { return null; }
    const bytes = new Uint8Array(crudo.length);
    for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
    return enBase64url(bytes) === String(texto) ? bytes : null;
  };

  /* Un número para cada intento de conexión. Sirve para una sola cosa, pero
     importante: que la respuesta que pega el que invitó sea la respuesta a SU
     invitación y no a otra que anda dando vueltas. */
  const nuevoIntento = () => enBase64url(azar(9));

  /* ------------------------------------------------------------------ */
  /* gzip                                                                */
  /* ------------------------------------------------------------------ */

  /* El gzip lo hace el navegador. Está escrito acá y no traído de
     js/carpeta.js a propósito: son veinte líneas, y hacer que el módulo de
     conectarse dependa del de carpetas ata dos cosas que no tienen nada que
     ver. La clase se inyecta para poder probarlo en Node. */
  async function pasar(bytes, Clase, tope) {
    const flujo = new Clase('gzip');
    const escritor = flujo.writable.getWriter();
    escritor.write(bytes).catch(() => {});
    escritor.close().catch(() => {});
    const lector = flujo.readable.getReader();
    const partes = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (tope && total > tope) {
        try { await lector.cancel(); } catch (e) { /* ya estaba cortado */ }
        return null;
      }
      partes.push(value);
    }
    const salida = new Uint8Array(total);
    let i = 0;
    for (const p of partes) { salida.set(p, i); i += p.length; }
    return salida;
  }

  /* ------------------------------------------------------------------ */
  /* El SDP                                                              */
  /* ------------------------------------------------------------------ */

  /* Antes de dárselo al navegador se mira que sea lo que decimos que es: una
     sola conexión de datos. Nada de audio ni de video: acá no se prende ni la
     cámara ni el micrófono de nadie, y un código que los pida no se usa. */
  function validarSdp(sdp) {
    if (typeof sdp !== 'string' || !sdp || sdp.length > LIMITES.sdp) return false;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(sdp)) return false;
    const medios = sdp.split('\n').filter(l => l.startsWith('m='));
    if (medios.length !== 1) return false;
    if (!/^m=application\s/.test(medios[0])) return false;
    if (!/\bSCTP\b/i.test(medios[0])) return false;
    if (!/a=fingerprint:/.test(sdp)) return false;
    return /a=ice-ufrag:/.test(sdp);
  }

  const esTexto = (t, tope) => typeof t === 'string' && !!t && t.length <= tope;
  /* Nada de invisibles ni de letras que se parecen: lo que viaja acá son
     nombres de sala y claves, y «parecido» no alcanza. */
  const esLlano = t => /^[A-Za-z0-9._~-]+$/.test(t);

  /* ------------------------------------------------------------------ */
  /* Armar                                                               */
  /* ------------------------------------------------------------------ */

  /* rol: 'i' la invitación (la que va primero y lleva la clave de la sala),
           'r' la respuesta (que no la lleva: quien responde ya la tiene). */
  async function armar(datos, Comp) {
    const d = datos || {};
    const p = {
      f: FORMATO,
      v: VERSION,
      r: d.rol === 'r' ? 'r' : 'i',
      sala: String(d.sala || ''),
      intento: String(d.intento || ''),
      vence: Number(d.vence || 0),
      sdp: String(d.sdp || '')
    };
    if (p.r === 'i') p.secreto = String(d.secreto || '');
    if (!limpiar(p)) return null;

    const C = Comp || global.CompressionStream;
    const bytes = await pasar(new TextEncoder().encode(JSON.stringify(p)), C, null);
    if (!bytes || bytes.length > LIMITES.apretado) return null;
    return PREFIJO + enBase64url(bytes);
  }

  /* ------------------------------------------------------------------ */
  /* Leer                                                                */
  /* ------------------------------------------------------------------ */

  /* El paquete rearmado campo por campo. Lo que llega se usa para LEER, nunca
     se mezcla con lo de acá adentro. */
  function limpiar(bruto) {
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
    if (bruto.f !== FORMATO) return null;
    if (bruto.v !== VERSION) return null;
    if (bruto.r !== 'i' && bruto.r !== 'r') return null;
    if (!esTexto(bruto.sala, LIMITES.sala) || !esLlano(bruto.sala)) return null;
    if (!esTexto(bruto.intento, LIMITES.intento) || !esLlano(bruto.intento)) return null;
    if (!Number.isSafeInteger(bruto.vence) || bruto.vence <= 0) return null;
    if (!validarSdp(bruto.sdp)) return null;

    const p = {
      f: FORMATO, v: VERSION, r: bruto.r,
      sala: bruto.sala, intento: bruto.intento, vence: bruto.vence, sdp: bruto.sdp
    };
    if (bruto.r === 'i') {
      if (!esTexto(bruto.secreto, LIMITES.secreto) || !esLlano(bruto.secreto)) return null;
      p.secreto = bruto.secreto;
    } else if (bruto.secreto !== undefined) {
      /* Una respuesta no lleva clave. Si la trae, está mal armada. */
      return null;
    }
    return p;
  }

  /* -> { ok: true, paquete } | { ok: false, error, mensaje } */
  async function leer(texto, Descomp) {
    const fallo = error => ({ ok: false, error, mensaje: MENSAJES[error] });

    if (typeof texto !== 'string') return fallo('formato');
    if (texto.length > LIMITES.texto) return fallo('grande');
    /* Copiar y pegar mete espacios y saltos de línea en cualquier lado; eso no
       es culpa del alumno. Se sacan y listo. */
    const limpio = texto.replace(/[\s]+/g, '');
    if (!limpio) return fallo('formato');

    if (!limpio.startsWith(PREFIJO)) {
      /* Que sea de ESLE2 pero de otra versión se dice distinto: ahí lo que
         hay que hacer es actualizar, no copiar de nuevo. */
      return fallo(/^ESLE2-\d+-/.test(limpio) ? 'version' : 'formato');
    }

    const bytes = deBase64url(limpio.slice(PREFIJO.length));
    if (!bytes) return fallo('roto');
    if (bytes.length > LIMITES.apretado) return fallo('grande');

    const D = Descomp || global.DecompressionStream;
    let crudo;
    try { crudo = await pasar(bytes, D, LIMITES.abierto); }
    catch (e) { return fallo('roto'); }                 // no era gzip
    if (!crudo) return fallo('grande');                 // se pasaba de grande

    let json;
    try { json = new TextDecoder('utf-8', { fatal: true }).decode(crudo); }
    catch (e) { return fallo('roto'); }
    let bruto;
    try { bruto = JSON.parse(json); } catch (e) { return fallo('roto'); }

    if (bruto && bruto.f === FORMATO && bruto.v !== VERSION) return fallo('version');
    const p = limpiar(bruto);
    if (!p) {
      /* Se separa el caso del SDP para poder decir algo que se entienda: el
         código está bien copiado, pero no sirve para conectar. */
      const casiBien = bruto && bruto.f === FORMATO && bruto.sdp !== undefined
        && !validarSdp(bruto.sdp);
      return fallo(casiBien ? 'sdp' : 'campos');
    }
    return { ok: true, paquete: p };
  }

  /* ------------------------------------------------------------------ */
  /* Las dos mitades                                                     */
  /* ------------------------------------------------------------------ */

  const vigente = (p, ahora) => !!p && p.vence > (ahora === undefined ? Date.now() : ahora);

  /* Una invitación recién hecha no puede durar más de lo que decimos: si
     alguien arma un código a mano con un vencimiento del año que viene, no
     pasa. */
  const vidaSana = (p, ahora) => {
    const t = ahora === undefined ? Date.now() : ahora;
    return vigente(p, t) && p.vence <= t + LIMITES.vida;
  };

  /* ¿Esta respuesta es a MI invitación? Tienen que coincidir las tres cosas,
     no solo la sala: dos intentos de la misma sala son dos conexiones
     distintas y mezclarlas deja a alguien hablando solo. */
  function contesta(invitacion, respuesta) {
    if (!invitacion || !respuesta) return false;
    if (invitacion.r !== 'i' || respuesta.r !== 'r') return false;
    return respuesta.sala === invitacion.sala
      && respuesta.intento === invitacion.intento
      && respuesta.vence === invitacion.vence;
  }

  global.Mano = {
    PREFIJO, LIMITES, MENSAJES, FORMATO, VERSION,
    armar, leer, limpiar, validarSdp, nuevoIntento,
    vigente, vidaSana, contesta, enBase64url, deBase64url
  };
})(typeof window !== 'undefined' ? window : globalThis);

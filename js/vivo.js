/*
 * Transmitir mi lógica: la parte que se puede pensar sin red.
 *
 * Un enlace corto y dictable —esle2.vercel.app/live/juan— donde cualquiera
 * puede mirar cómo alguien escribe su programa, en el momento. Sirve para
 * mostrarle algo a un profesor sin mandarle un archivo, para que la clase siga
 * lo que hace uno en el pizarrón desde su propia pantalla, o para pedir ayuda
 * sin explicar por escrito lo que ya está en la pantalla.
 *
 * Es de una sola mano: el que transmite escribe, los que miran solo miran.
 * Eso lo separa de «Programar de a dos», que es de dos manos y por eso lleva
 * un enlace con una contraseña larga adentro.
 *
 * ------------------------------------------------------------------------
 * Lo que hay que decir con todas las letras: un enlace así es PÚBLICO.
 * ------------------------------------------------------------------------
 * El nombre lo elige quien transmite y es corto, así que es adivinable: si
 * alguien pone «juan», cualquiera que escriba /live/juan lo ve. No es un
 * descuido, es lo que se pidió —un enlace que se pueda dictar en voz alta—,
 * pero hay que saberlo, y la interfaz lo dice antes de empezar.
 *
 * De ahí salen dos consecuencias que el código respeta:
 *
 *   · el programa igual viaja cifrado. La contraseña sale del propio nombre,
 *     así que no protege de alguien que sepa el nombre (no puede: el que mira
 *     tiene que poder desencriptar sabiendo solo el enlace). Sí evita que el
 *     servidor que presenta a las máquinas —que es ajeno— pueda leer lo que
 *     pasa por él sin saber a qué transmisión mirar;
 *   · dos personas con el mismo nombre caen en la misma transmisión. Se avisa
 *     en pantalla cuando se detecta a alguien más transmitiendo ahí.
 *
 * No hay servidor de ESLE2 en el medio: el texto va directo del que transmite
 * al que mira, por WebRTC, igual que en «Programar de a dos». No se guarda
 * nada en ningún lado; cuando el que transmite cierra la pestaña, no queda
 * nada que mirar.
 *
 * API (cálculo puro, sin red ni DOM: lo prueba test/test-vivo.js)
 *   Vivo.limpiarNombre(texto)   -> el nombre como va a quedar en el enlace
 *   Vivo.sala(nombre)           -> { sala, clave }
 *   Vivo.enlace(nombre, base)   -> https://…/live/juan
 *   Vivo.leerUrl(ruta)          -> 'juan' | null
 *   Vivo.nombreSugerido()       -> algo para arrancar
 */
(function (global) {
  'use strict';

  const LARGO_MAX = 24;
  const LARGO_MIN = 2;

  /* Del nombre que uno escribe al que entra en una dirección: sin acentos,
     sin mayúsculas, sin espacios. «Juan Pérez» -> «juan-perez». */
  function limpiarNombre(texto) {
    return String(texto || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // saca los acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, LARGO_MAX)
      .replace(/-+$/, '');
  }

  const valido = n => limpiarNombre(n).length >= LARGO_MIN;

  /* Un número estable a partir de un texto (djb2). El mismo nombre da siempre
     la misma sala en las dos computadoras, sin ponerse de acuerdo en nada. */
  function huella(texto) {
    let h = 5381;
    const t = String(texto || '');
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* La sala y su contraseña salen las dos del nombre. La contraseña NO es un
     secreto —quien sabe el nombre la puede calcular— y no pretende serlo: la
     transmisión es pública a propósito. Lo que sí hace es que el servidor de
     señas, que es de otro, no vea el programa pasar en claro. */
  function sala(nombre) {
    const n = limpiarNombre(nombre);
    if (!n) return null;
    return { sala: 'esle2-vivo-' + n, clave: 'vivo-' + huella('esle2/live/' + n) };
  }

  /* El enlace corto. La base termina siempre en «/» para que salga
     https://sitio/live/juan y no https://sitiolive/juan. */
  function enlace(nombre, base) {
    const n = limpiarNombre(nombre);
    if (!n) return '';
    let raiz = base || (typeof location !== 'undefined' ? location.origin + '/' : '/');
    if (!/\/$/.test(raiz)) raiz += '/';
    return raiz + 'live/' + n;
  }

  /* Del camino de la dirección al nombre. Sirve tanto para /live/juan como
     para el enlace con «?» de un servidor que no reescriba direcciones. */
  /* decodeURIComponent tira TypeError con un «%» suelto —/live/100%— y eso
     cortaba el arranque de la página entera antes de mostrar nada. Una
     dirección mal escrita es «no hay nombre», no un error. */
  const desArmar = s => { try { return decodeURIComponent(s); } catch (e) { return s; } };

  function leerUrl(ruta, busqueda) {
    const r = ruta === undefined && typeof location !== 'undefined' ? location.pathname : (ruta || '');
    const m = /\/live\/([^/?#]+)/.exec(r);
    if (m) return limpiarNombre(desArmar(m[1])) || null;
    const b = busqueda === undefined && typeof location !== 'undefined' ? location.search : (busqueda || '');
    const q = /[?&]vivo=([^&#]+)/.exec(b);
    if (q) return limpiarNombre(desArmar(q[1])) || null;
    return null;
  }

  const NOMBRES = ('ana beto cata dani elsa fabio gaby hugo ivo juli lu mica '
    + 'nico ori pili rami sofi tomi uma vero').split(' ');

  function nombreSugerido() {
    const c = global.crypto || (global.require && global.require('crypto').webcrypto);
    const b = new Uint8Array(2);
    if (c && c.getRandomValues) c.getRandomValues(b);
    else { b[0] = Math.floor(Math.random() * 256); b[1] = Math.floor(Math.random() * 256); }
    return NOMBRES[b[0] % NOMBRES.length] + '-' + (b[1] % 90 + 10);
  }

  global.Vivo = { limpiarNombre, valido, sala, enlace, leerUrl, nombreSugerido, huella,
                  LARGO_MAX, LARGO_MIN };
})(typeof window !== 'undefined' ? window : globalThis);

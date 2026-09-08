/*
 * Programar de a dos: la parte que se puede pensar sin red.
 *
 * Una «sala» es un nombre al azar y una contraseña, también al azar, que
 * viajan los dos adentro del enlace, después del «#». Con eso alcanza:
 *
 *   · el nombre solo sirve para que las dos computadoras se encuentren. Lo ve
 *     el servidor de señas, que no es nuestro, así que no dice nada de nadie:
 *     es «sle2-rio-verde-8f3a», no el nombre de la escuela;
 *   · la contraseña cifra el contenido. El servidor de señas presenta a las
 *     dos máquinas y después se va; el código viaja directo de una a la otra y
 *     cifrado, así que ni ese servidor ni nadie en el medio lo puede leer.
 *
 * Como el enlace lleva las dos cosas, quien lo tiene puede entrar y escribir.
 * Es a propósito, y es lo mismo que un documento compartido por enlace: para
 * una clase alcanza, y evita tener cuentas. Está dicho en la documentación con
 * todas las letras, que es lo que corresponde.
 *
 * API (cálculo puro, sin red ni DOM: lo prueba test/test-juntos.js)
 *   Juntos.crearSala()          -> { sala, clave }
 *   Juntos.enlace(sala, base)   -> url con la sala adentro
 *   Juntos.leerUrl(hash)        -> { sala, clave } | null
 *   Juntos.nombreSugerido()     -> un nombre para mostrarle a la otra persona
 *   Juntos.color(nombre)        -> un color estable para esa persona
 */
(function (global) {
  'use strict';

  /* Palabras fáciles de leer y de dictar por teléfono, por si hay que pasar la
     sala en voz alta. Ninguna dice nada de quién está adentro. */
  const PALABRAS = ('rio verde monte cielo sol luna nube viento piedra arena '
    + 'flor arbol pez ave lago valle campo puente barco faro').split(' ');

  const azar = n => {
    /* crypto.getRandomValues está en todos los navegadores y en Node: se usa
       ese y no Math.random porque el nombre de la sala no se tiene que poder
       adivinar desde otra pestaña. */
    const c = global.crypto || (global.require && global.require('crypto').webcrypto);
    const b = new Uint8Array(n);
    if (c && c.getRandomValues) c.getRandomValues(b);
    else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  };

  const enBase36 = bytes => Array.from(bytes).map(b => b.toString(36)).join('').slice(0, 12);

  function crearSala() {
    const b = azar(16);
    const dos = [PALABRAS[b[0] % PALABRAS.length], PALABRAS[b[1] % PALABRAS.length]];
    return {
      sala: 'esle2-' + dos.join('-') + '-' + enBase36(b.slice(2, 6)).slice(0, 6),
      clave: enBase36(b.slice(6)) + enBase36(azar(8))
    };
  }

  const limpio = t => String(t || '').replace(/[^A-Za-z0-9_-]/g, '');

  function enlace(sala, clave, base) {
    const raiz = base || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
    return raiz + '#juntos=' + limpio(sala) + '.' + limpio(clave);
  }

  function leerUrl(hash) {
    const h = hash === undefined && typeof location !== 'undefined' ? location.hash : (hash || '');
    const m = /[#&]juntos=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)/.exec(h);
    if (!m) return null;
    return { sala: m[1], clave: m[2] };
  }

  const NOMBRES = ('Ana Beto Cata Dani Elsa Fabio Gaby Hugo Ivo Juli Kevin Lu '
    + 'Mica Nico Ori Pili Rami Sofi Tomi Uma Vero Wal Xime Yani Zoe').split(' ');

  function nombreSugerido() {
    const b = azar(2);
    return NOMBRES[b[0] % NOMBRES.length] + ' ' + (b[1] % 90 + 10);
  }

  /* Un color estable a partir del nombre: la misma persona se ve siempre del
     mismo color, en las dos pantallas, sin ponerse de acuerdo en nada. Se
     eligen tonos oscuros para que el nombre se lea sobre ellos en blanco. */
  function color(nombre) {
    let h = 5381;
    const t = String(nombre || '');
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return 'hsl(' + (h % 360) + ', 62%, 38%)';
  }

  /* Los servidores de señas, en orden. Solo presentan a las dos computadoras:
     no ven el contenido, que va cifrado y directo entre ellas.

     Son varios a propósito. El que trae la librería por omisión se cae cada
     tanto —comprobado: durante el desarrollo de esto estaba caído— y con uno
     solo, ese día no anda nada. Con la lista, alcanza con que uno responda.
     Si un día no responde ninguno, se avisa en pantalla en vez de dejar a
     alguien esperando para siempre. */
  const PROPIOS = [
    /* Poné acá el tuyo: ver servidor-senas/README.md. Mientras no haya uno,
       se prueba con el de la librería, que anda a veces. */
    'wss://y-webrtc-eu.fly.dev'
  ];

  /* Una escuela puede apuntar al suyo sin tocar el código, desde la consola:
       localStorage.esle2_senas = 'wss://senas.mi-escuela.edu.py'
     Se admiten varios separados por coma. */
  function servidores() {
    let propio = '';
    try { propio = localStorage.getItem('esle2_senas') || ''; } catch (e) { /* modo privado */ }
    const suyos = propio.split(',').map(t => t.trim()).filter(t => /^wss?:\/\//.test(t));
    return suyos.concat(PROPIOS);
  }

  global.Juntos = { crearSala, enlace, leerUrl, nombreSugerido, color, PALABRAS, servidores, PROPIOS };
})(typeof window !== 'undefined' ? window : globalThis);

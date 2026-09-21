/*
 * Programar en grupo: la parte que se puede pensar sin red.
 *
 * Una «sala» es un nombre al azar y un secreto, también al azar, que viajan
 * los dos adentro del enlace, después del «#». Con eso alcanza:
 *
 *   · el nombre solo sirve para que las computadoras se encuentren. Lo ve el
 *     relevo, que no es nuestro, así que no dice nada de nadie: es
 *     «esle2-rio-verde-8f3a», no el nombre de la escuela;
 *   · el secreto cifra el contenido. De él sale la llave con la que se cierra
 *     todo lo que pasa por el relevo (ver js/sala.js), y el relevo nunca lo
 *     recibe: reparte sobres que no puede abrir.
 *
 * Como el enlace lleva las dos cosas, quien lo tiene puede entrar y escribir.
 * Es a propósito, y es lo mismo que un documento compartido por enlace: para
 * una clase alcanza, y evita tener cuentas. Está dicho en la documentación con
 * todas las letras, y en el propio diálogo antes de entrar, que es lo que
 * corresponde.
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

  /* base64 «url»: entra en un enlace sin escaparse y no se parte al copiarlo. */
  function enTexto(bytes) {
    if (global.Sala) return global.Sala.aTexto(bytes);
    return Buffer.from(bytes).toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /* El secreto es de 256 bits. Antes eran unos veinte caracteres de base36,
     que alcanzaban para que nadie lo escribiera de memoria pero no para ser la
     única puerta de una sala: ahora de este secreto sale la llave con la que
     se cifra todo lo que pasa por el relevo, así que tiene que ser una llave
     de verdad. */
  function crearSala() {
    const b = azar(4);
    const dos = [PALABRAS[b[0] % PALABRAS.length], PALABRAS[b[1] % PALABRAS.length]];
    return {
      sala: 'esle2-' + dos.join('-') + '-' + enBase36(b.slice(2)).slice(0, 6),
      clave: enTexto(azar(32))
    };
  }

  const limpio = t => String(t || '').replace(/[^A-Za-z0-9_-]/g, '');

  /* El relevo puede viajar en el enlace para que una escuela con servidor
     propio no tenga que tocar nada en cada computadora. Va como texto
     codificado y NO se usa sin preguntar: ver leerUrl y el diálogo. */
  const guardarRelevo = url => (url ? '.' + enTexto(new TextEncoder().encode(url)) : '');

  function enlace(sala, clave, base, relevo) {
    const raiz = base || (typeof location !== 'undefined' ? location.origin + location.pathname : '');
    return raiz + '#juntos=' + limpio(sala) + '.' + limpio(clave) + guardarRelevo(relevo);
  }

  /* Un relevo que viene de un enlace ajeno es una dirección a la que el
     navegador del alumno se va a conectar porque se lo pidió un papelito. Se
     devuelve aparte, se muestra el dominio y recién se usa si dicen que sí. */
  function leerRelevo(texto) {
    if (!texto || !global.Sala) return null;
    const b = global.Sala.aBytes(texto);
    if (!b || b.length > 200) return null;
    let url;
    try { url = new TextDecoder().decode(b); } catch (e) { return null; }
    if (!/^wss:\/\/[A-Za-z0-9._-]+(:\d+)?(\/[A-Za-z0-9._~\-/]*)?$/.test(url)) return null;
    return url;
  }

  function leerUrl(hash) {
    const h = hash === undefined && typeof location !== 'undefined' ? location.hash : (hash || '');
    const m = /[#&]juntos=([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)(?:\.([A-Za-z0-9_-]+))?/.exec(h);
    if (!m) return null;
    return { sala: m[1], clave: m[2], relevo: leerRelevo(m[3]) };
  }

  const NOMBRES = ('Ana Beto Cata Dani Elsa Fabio Gaby Hugo Ivo Juli Kevin Lu '
    + 'Mica Nico Ori Pili Rami Sofi Tomi Uma Vero Wal Xime Yani Zoe').split(' ');

  function nombreSugerido() {
    const b = azar(2);
    return NOMBRES[b[0] % NOMBRES.length] + ' ' + (b[1] % 90 + 10);
  }

  /* Un color estable a partir del nombre: la misma persona se ve siempre del
     mismo color, en todas las pantallas, sin ponerse de acuerdo en nada.
     Sale de la paleta de js/sala.js y no de una cuenta, por una razón que
     costó encontrar: y-codemirror le pega dos dígitos más para la
     transparencia («#1d4ed8» + «70»), y un hsl(...) con eso atrás no es un
     color. Por eso la selección del compañero no se veía nunca. */
  const color = nombre => (global.Sala ? global.Sala.colorDe(nombre) : '#1d4ed8');

  /* Los relevos, en orden. Un relevo reparte sobres cerrados: reenvía a los
     demás de la sala lo que publica uno, y no puede leer nada de lo que
     reparte (ver js/sala.js).

     La lista está vacía a propósito, y eso es una decisión, no un olvido: no
     hay ningún servidor público que se pueda recomendar. Los de y-webrtc
     estaban rotos de la peor manera —aceptaban la conexión y no reenviaban
     nada, así que la pantalla decía «conectado» y nadie se encontraba nunca—
     y apuntar a uno ajeno sería hacerle creer a una escuela que tiene algo
     que no tiene.

     Publicar el propio son tres comandos y es gratis: está escrito y probado
     en servidor-senas/cloudflare. Este es ese: desplegado el 2026-09-21,
     comprobado que REENVÍA entre dos conexiones (no solo que conteste) con
     la prueba de test-juntos.js, y no con la propia. */
  const PROPIOS = ['wss://esle2-senas.esle2-senas-cloudflare.workers.dev'];

  /* Una escuela puede apuntar al suyo sin tocar el código:
       localStorage.esle2_senas = 'wss://senas.mi-escuela.edu.py'
     Se admiten varios separados por coma. El diálogo escribe acá. */
  function servidores(primero) {
    let propio = '';
    try { propio = localStorage.getItem('esle2_senas') || ''; } catch (e) { /* modo privado */ }
    const suyos = propio.split(',').map(t => t.trim()).filter(t => /^wss?:\/\//.test(t));
    const todos = (primero ? [primero] : []).concat(suyos, PROPIOS);
    return todos.filter((u, i) => todos.indexOf(u) === i);
  }

  /* Guardar el relevo de la escuela en esta computadora. Devuelve si valía. */
  function recordarServidor(url) {
    if (!/^wss:\/\/[A-Za-z0-9._-]+(:\d+)?(\/\S*)?$/.test(String(url || ''))) return false;
    try { localStorage.setItem('esle2_senas', String(url)); } catch (e) { /* modo privado */ }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* ¿El servidor de señas REENVÍA?                                       */
  /* ------------------------------------------------------------------ */

  /* Conectar no alcanza. Un servidor puede aceptar la conexión y no reenviar
     nada —comprobado: es exactamente lo que hace el que trae la librería por
     omisión—, y entonces las dos computadoras quedan «conectadas» para
     siempre sin encontrarse nunca. Mirar solo si la conexión está viva es
     mentirle a la persona con la cara más seria.

     La prueba tiene que ser entre DOS conexiones, y eso costó descubrirlo.
     Antes se abría una sola, se publicaba y se esperaba el propio eco, y eso
     estaba mal de las dos maneras a la vez:

     - Daba por bueno un servidor que le devuelve el mensaje a quien lo mandó
       y no se lo pasa a nadie más. Comprobado contra uno público de verdad:
       pasaba la prueba y dos alumnos no se encontraban nunca.
     - Daba por malo el nuestro, que hace lo correcto y NO le devuelve el
       mensaje a quien lo mandó (servidor-senas/cloudflare/src/servidor.js:
       «if (otro === ws) continue»). Es decir que el día que una escuela
       publicara el suyo, la prueba le iba a decir que no sirve.

     Así que ahora se abren dos, cada una con su marca, y solo cuenta cuando a
     cada una le llega la marca de la otra. Es lo mismo que hacen dos alumnos.

     El tema lleva azar para que dos alumnos probando a la vez no se crucen. */
  function temaDePrueba() {
    return 'esle2-prueba-' + enBase36(azar(8));
  }

  function pruebaDeRelevo(tema, marca) {
    return {
      suscribir: JSON.stringify({ type: 'subscribe', topics: [tema] }),
      publicar: JSON.stringify({
        type: 'publish', topic: tema, data: { esle2: 'prueba', de: marca || 'a' }
      })
    };
  }

  /* Si no se dice de quién, alcanza con que sea un sobre de prueba de este
     tema; la prueba de verdad siempre dice de quién, porque ahí está todo. */
  function esEco(datos, tema, deQuien) {
    let d;
    try { d = JSON.parse(String(datos)); } catch (e) { return false; }
    return !!d && d.type === 'publish' && d.topic === tema
      && !!d.data && d.data.esle2 === 'prueba'
      && (deQuien === undefined || d.data.de === deQuien);
  }

  /* Cada cuánto se repite el aviso. Este protocolo no tiene acuse de
     suscripción: no hay forma de saber cuándo el servidor anotó a la otra
     conexión, así que se repite hasta que llegue o se acabe el tiempo. */
  const REPETIR = 200;

  /* -> Promise<'reenvia' | 'no-reenvia' | 'sin-conexion'> */
  function probarRelevo(url, opciones) {
    const cfg = opciones || {};
    /* Se mira si la opción vino, no si trae algo: pasar WebSocket: null es la
       forma de decir «este navegador no tiene», y hace falta para probarlo. */
    const Socket = 'WebSocket' in cfg
      ? cfg.WebSocket
      : (typeof WebSocket !== 'undefined' ? WebSocket : null);
    const espera = cfg.espera || 4000;
    if (!Socket) return Promise.resolve('sin-conexion');

    return new Promise(resolver => {
      const tema = cfg.tema || temaDePrueba();
      const partes = [];
      let listo = false, reloj = null, repique = null;

      const terminar = resultado => {
        if (listo) return;
        listo = true;
        clearTimeout(reloj);
        clearInterval(repique);
        for (const p of partes) { try { if (p.ws) p.ws.close(); } catch (e) { /* ya estaba */ } }
        resolver(resultado);
      };

      const avisar = () => {
        if (listo) return;
        for (const p of partes) {
          if (!p.abierto) continue;
          try { p.ws.send(p.sobres.publicar); } catch (e) { terminar('sin-conexion'); return; }
        }
      };

      /* «mia» es la marca que manda esta conexión; «suya», la que espera de la
         otra. Son distintas a propósito: si fueran iguales, el propio eco
         contaría como si hubiera llegado del compañero, que es justo el error
         que dejaba pasar a un servidor donde nadie se encuentra. */
      const armar = (mia, suya) => {
        const parte = { ws: null, abierto: false, oyo: false, sobres: pruebaDeRelevo(tema, mia) };
        try { parte.ws = new Socket(url); } catch (e) { return parte; }
        const ws = parte.ws;
        ws.onerror = () => terminar('sin-conexion');
        ws.onclose = () => terminar('sin-conexion');
        ws.onopen = () => {
          parte.abierto = true;
          try { ws.send(parte.sobres.suscribir); } catch (e) { return terminar('sin-conexion'); }
          avisar();
        };
        ws.onmessage = ev => {
          if (!esEco(ev.data, tema, suya)) return;
          parte.oyo = true;
          if (partes.length === 2 && partes.every(p => p.oyo)) terminar('reenvia');
        };
        return parte;
      };

      partes.push(armar('a', 'b'), armar('b', 'a'));
      if (partes.some(p => !p.ws)) return terminar('sin-conexion');

      /* Una sola ventana para las dos conexiones: abrir, suscribirse, repetir
         el aviso y contestar entran todos acá adentro. */
      reloj = setTimeout(
        () => terminar(partes.every(p => p.abierto) ? 'no-reenvia' : 'sin-conexion'), espera);
      repique = setInterval(avisar, REPETIR);
    });
  }

  /* El primero de la lista que reenvíe de verdad, o null. Se prueban todos a
     la vez: son cuatro segundos, no cuatro por servidor. */
  async function alguienReenvia(urls, opciones) {
    const lista = (urls && urls.length ? urls : servidores());
    if (!lista.length) return null;
    const resultados = await Promise.all(
      lista.map(u => probarRelevo(u, opciones).then(r => ({ url: u, r }))));
    const bueno = resultados.find(x => x.r === 'reenvia');
    return bueno ? bueno.url : null;
  }

  global.Juntos = { crearSala, enlace, leerUrl, leerRelevo, nombreSugerido, color, PALABRAS,
    servidores, recordarServidor, PROPIOS,
    probarRelevo, alguienReenvia, pruebaDeRelevo, esEco, temaDePrueba };
})(typeof window !== 'undefined' ? window : globalThis);

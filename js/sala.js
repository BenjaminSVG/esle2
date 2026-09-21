/*
 * Una sala compartida: el sobre, la llave y quiénes están. Sin red ni DOM.
 *
 * ------------------------------------------------------------------------
 * Por qué esto dejó de ir por WebRTC
 * ------------------------------------------------------------------------
 * «Programar de a dos» iba de máquina a máquina, que suena mejor y en una
 * escuela no anda. Para que dos navegadores se hablen directo hacen falta tres
 * cosas: encontrarse (eso lo arregla un servidor de señas), y después una ruta
 * de verdad entre ellos. Esa ruta es la que no aparece: el wifi de un colegio
 * suele aislar a los alumnos entre sí, el NAT del router no deja entrar nada
 * de afuera, y cuando eso pasa WebRTC necesita un servidor TURN que retransmita
 * —y TURN gratis no existe—. El resultado en pantalla era el peor posible:
 * «conectado», y los dos esperándose para siempre.
 *
 * Ahora las máquinas no se hablan entre sí: las dos hablan con el mismo
 * servidor, que reenvía. Eso anda en cualquier red donde ande el sitio. Lo que
 * se pierde es que ese servidor ve pasar los mensajes, y por eso existe este
 * archivo: los mensajes van CIFRADOS, con una llave que sale del enlace y que
 * el servidor nunca recibe. El servidor reparte sobres cerrados.
 *
 * Lo que el servidor sí ve, y hay que decirlo: cuántas conexiones hay en una
 * sala, cuándo, de qué tamaño y con qué frecuencia. El contenido no.
 * Y lo que el cifrado NO protege: cualquiera que tenga el enlace entra y
 * escribe, igual que en un documento compartido por enlace.
 *
 * ------------------------------------------------------------------------
 * Lo que llega de la sala es texto de un desconocido
 * ------------------------------------------------------------------------
 * Descifrar prueba que el otro tiene la llave, no que sea buena gente: en una
 * clase, el enlace lo tienen treinta personas. Así que todo lo que llega se
 * rearma campo por campo antes de que lo vea nadie —el nombre, el color y la
 * posición del cursor—, y lo que no entra en la forma esperada no pasa.
 * El color es la parte que más importa: y-codemirror lo mete dentro de un
 * «style», así que aceptar el color que mande otro es aceptar que te escriba
 * CSS en la pantalla. Por eso los colores salen de una lista de acá.
 *
 * API (cálculo puro: lo prueba test/test-sala.js)
 *   Sala.alias(texto)                      -> el nombre como se va a mostrar
 *   Sala.colorDe(nombre)                   -> '#rrggbb' de la paleta
 *   Sala.presencia(bruto)                  -> { user, cursor } | null
 *   Sala.Vecinos(clientID)                 -> el «awareness» que pide y-codemirror
 *   Sala.claveDe(secreto, sala, subtle)    -> Promise<CryptoKey>
 *   Sala.cerrar(ctx, objeto)               -> Promise<sobre>   (texto para el relevo)
 *   Sala.abrir(ctx, sobre)                 -> Promise<objeto | null>
 *   Sala.Vigia()                           -> rechaza repeticiones
 */
(function (global) {
  'use strict';

  const LIMITES = {
    alias: 24,          // caracteres de un nombre
    gente: 32,          // personas por sala; un curso chico entra
    sobre: 1048576,     // 1 MiB de sobre: más que eso no se mira siquiera
    presencia: 4096,    // el estado de una persona, en JSON
    posicion: 512,      // cada punta del cursor, en JSON
    sesion: 24,         // el identificador de una sesión
    silencio: 30000,    // sin noticias de alguien, se lo da por ido
    latido: 9000        // cada cuánto se avisa «sigo acá»
  };

  /* Diez colores elegidos a mano, no calculados: tienen que leerse sobre el
     fondo claro Y sobre el oscuro, porque el mismo color pinta el cursor del
     otro en las dos pantallas. Son fijos y en #rrggbb porque y-codemirror les
     pega dos dígitos más para la transparencia («#1d4ed8» + «70»), y eso con
     un hsl(...) no es un color: era la razón por la que la selección del
     compañero no se veía nunca. */
  const PALETA = ['#1d4ed8', '#b91c1c', '#047857', '#6d28d9', '#b45309',
                  '#0e7490', '#be185d', '#4d7c0f', '#4338ca', '#a21caf'];

  function huella(texto) {
    let h = 5381;
    const t = String(texto || '');
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h;
  }

  const colorDe = nombre => PALETA[huella(nombre) % PALETA.length];

  /* Un nombre que va a aparecer arriba del cursor de otro. Se le sacan los
     saltos de línea (estiran el cartelito hasta tapar el editor) y los
     caracteres que dan vuelta el texto —el truco de escribir «ana» y que en
     pantalla se lea otra cosa—. Lo demás lo limpia Seguro, que es el único
     lugar del proyecto que decide qué es texto. */
  const DIRECCION = new RegExp('[\\u200b-\\u200f\\u2028\\u2029\\u202a-\\u202e\\u2066-\\u2069]', 'g');
  
  function alias(valor) {
    const base = global.Seguro
      ? global.Seguro.texto(valor, LIMITES.alias * 4)
      : String(valor === undefined || valor === null ? '' : valor);
    const limpio = base.replace(DIRECCION, '').replace(/[\t\n\r]+/g, ' ').trim();
    return limpio.slice(0, LIMITES.alias) || 'alguien';
  }

  /* ------------------------------------------------------------------ */
  /* Bytes y texto                                                       */
  /* ------------------------------------------------------------------ */

  /* base64 «url», sin «+», «/» ni «=»: así entra en un enlace sin escaparse. */
  function aTexto(bytes) {
    let s = '';
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    const crudo = typeof btoa === 'function'
      ? btoa(s)
      : Buffer.from(b).toString('base64');
    return crudo.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function aBytes(texto) {
    const t = String(texto || '').replace(/-/g, '+').replace(/_/g, '/');
    const relleno = t + '==='.slice((t.length + 3) % 4);
    try {
      if (typeof atob === 'function') {
        const s = atob(relleno);
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return b;
      }
      return new Uint8Array(Buffer.from(relleno, 'base64'));
    } catch (e) { return null; }
  }

  const enBytes = t => new TextEncoder().encode(String(t));

  function azar(n) {
    const c = global.crypto || (global.require && global.require('crypto').webcrypto);
    const b = new Uint8Array(n);
    if (c && c.getRandomValues) c.getRandomValues(b);
    else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  }

  /* Quién soy en esta conexión. Cambia en cada reconexión a propósito: la
     cuenta de sobres arranca de cero con un identificador nuevo, y así nunca
     se repite el par (sesión, número) con la misma llave, que es lo único que
     AES-GCM no perdona. */
  const nuevaSesion = () => aTexto(azar(8));

  /* ------------------------------------------------------------------ */
  /* La llave                                                            */
  /* ------------------------------------------------------------------ */

  const elSubtle = s => s || (global.crypto && global.crypto.subtle)
    || (global.require && global.require('crypto').webcrypto.subtle);

  /* La llave no es el secreto del enlace: se deriva de él con HKDF, con el
     nombre de la sala como sal. Dos salas con el mismo secreto —no debería
     pasar, pero no cuesta nada— dan llaves distintas. */
  async function claveDe(secreto, sala, subtle) {
    const st = elSubtle(subtle);
    const semilla = await st.importKey('raw', enBytes(secreto), 'HKDF', false, ['deriveKey']);
    return st.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enBytes('esle2-sala/' + sala), info: enBytes('esle2-sala-v2') },
      semilla, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  /* El contexto de una punta: su llave, su sala, su sesión y su cuenta. */
  function contexto(clave, sala, subtle) {
    return { clave, sala, sesion: nuevaSesion(), n: 0, subtle: elSubtle(subtle) };
  }

  /* El número que no se repite: 8 bytes de la sesión y 4 de la cuenta. */
  function balde(sesion, n) {
    const s = aBytes(sesion) || new Uint8Array(8);
    const b = new Uint8Array(12);
    b.set(s.slice(0, 8), 0);
    b[8] = (n >>> 24) & 255; b[9] = (n >>> 16) & 255; b[10] = (n >>> 8) & 255; b[11] = n & 255;
    return b;
  }

  /* Lo que se firma junto con el contenido sin cifrarlo: quien reciba esto no
     puede mover un sobre de una sala a otra ni cambiarle el número. */
  const atado = (sala, sesion, n) => enBytes('2|' + sala + '|' + sesion + '|' + n);

  async function cerrar(ctx, objeto) {
    const n = ctx.n++;
    const crudo = await ctx.subtle.encrypt(
      { name: 'AES-GCM', iv: balde(ctx.sesion, n), additionalData: atado(ctx.sala, ctx.sesion, n), tagLength: 128 },
      ctx.clave, enBytes(JSON.stringify(objeto)));
    return JSON.stringify({ v: 2, s: ctx.sesion, n, d: aTexto(new Uint8Array(crudo)) });
  }

  /* Devuelve { sesion, n, dentro } o null. Null quiere decir «esto no venía de
     alguien con la llave», y el que llama lo tira sin mirar: no hay nada útil
     que hacer con un sobre que no abre, y contestar algo distinto según por
     qué falló es justo lo que le sirve a quien está probando. */
  async function abrir(ctx, sobre) {
    if (typeof sobre !== 'string' || sobre.length > LIMITES.sobre) return null;
    let s;
    try { s = JSON.parse(sobre); } catch (e) { return null; }
    if (!s || s.v !== 2 || typeof s.s !== 'string' || typeof s.d !== 'string') return null;
    if (s.s.length > LIMITES.sesion) return null;
    if (typeof s.n !== 'number' || !Number.isInteger(s.n) || s.n < 0) return null;
    if (s.s === ctx.sesion) return null;                 // el eco de uno mismo
    const bytes = aBytes(s.d);
    if (!bytes) return null;
    let claro;
    try {
      claro = await ctx.subtle.decrypt(
        { name: 'AES-GCM', iv: balde(s.s, s.n), additionalData: atado(ctx.sala, s.s, s.n), tagLength: 128 },
        ctx.clave, bytes);
    } catch (e) { return null; }
    let dentro;
    try { dentro = JSON.parse(new TextDecoder().decode(claro)); } catch (e) { return null; }
    if (!dentro || typeof dentro !== 'object') return null;
    return { sesion: s.s, n: s.n, dentro };
  }

  /* Un sobre que ya pasó no vuelve a pasar. Sin esto, alguien que mira la red
     puede volver a mandar el sobre de hace un rato y deshacer lo que escribiste
     —el sobre es legítimo, está bien firmado— y eso es lo que evita la cuenta.
     Se guarda solo el último número de cada sesión, no todos. */
  function Vigia() {
    const visto = new Map();
    return {
      pasa(sesion, n) {
        const ultimo = visto.get(sesion);
        if (ultimo !== undefined && n <= ultimo) return false;
        visto.set(sesion, n);
        return true;
      },
      olvidar(sesion) { visto.delete(sesion); },
      get tamano() { return visto.size; }
    };
  }

  /* ------------------------------------------------------------------ */
  /* Quién está, y cómo se lo dibuja                                     */
  /* ------------------------------------------------------------------ */

  /* Una punta del cursor. y-codemirror hace JSON.parse de esto sin red de
     contención: si alguien manda «{» ahí, la excepción sale adentro del
     manejador del editor y el editor deja de andar para el que recibe. Así que
     se comprueba acá que sea JSON y que sea un objeto. */
  function posicion(valor) {
    if (typeof valor !== 'string' || !valor || valor.length > LIMITES.posicion) return null;
    let p;
    try { p = JSON.parse(valor); } catch (e) { return null; }
    if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
    return valor;
  }

  function cursor(valor) {
    if (!valor || typeof valor !== 'object') return null;
    const a = posicion(valor.anchor), h = posicion(valor.head);
    return a && h ? { anchor: a, head: h } : null;
  }

  /* El estado de otra persona, rearmado. No se limpia el que vino: se hace uno
     nuevo con los campos que existen y nada más. Lo que no está en esta lista
     no llega a la pantalla, venga como venga. */
  function presencia(bruto) {
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
    const u = bruto.user && typeof bruto.user === 'object' ? bruto.user : {};
    const nombre = alias(u.name);
    const limpio = { user: { name: nombre, color: colorDe(nombre), papel: papel(u.papel) } };
    const c = cursor(bruto.cursor);
    if (c) limpio.cursor = c;
    return limpio;
  }

  /* «transmite» y «mira» los usa el modo en vivo para saber quién muestra y
     quién mira. Cualquier otra cosa es un compañero común. */
  const PAPELES = ['edita', 'transmite', 'mira'];
  const papel = v => (PAPELES.indexOf(v) >= 0 ? v : 'edita');

  /* ------------------------------------------------------------------ */
  /* Vecinos: el «awareness» que pide y-codemirror                       */
  /* ------------------------------------------------------------------ */

  /*
   * y-codemirror necesita un objeto con getStates()/on('change')/… para pintar
   * los cursores ajenos. El de la librería viene atado a su propio transporte
   * y, sobre todo, deja entrar cualquier cosa que llegue por la red: el estado
   * del otro se guarda tal cual y el editor lo pinta.
   *
   * Este hace lo mismo hacia el editor y al revés hacia la red: nada entra sin
   * pasar por presencia(). Esa frontera tiene que estar ACÁ y no en un oyente
   * que limpie después, porque «después» es más tarde que el momento en que el
   * editor ya dibujó.
   */
  function Vecinos(clientID) {
    const estados = new Map();
    const visto = new Map();
    const relojes = new Map();
    const oyentes = new Map();
    let reloj = 0;

    const emitir = (que, datos) => {
      for (const f of (oyentes.get(que) || [])) {
        try { f(datos, 'local'); } catch (e) { /* un oyente roto no rompe al resto */ }
      }
    };

    const vecinos = {
      clientID,
      states: estados,
      getStates: () => estados,
      getLocalState: () => estados.get(clientID) || null,

      setLocalState(estado) {
        if (estado === null) estados.delete(clientID);
        else estados.set(clientID, estado);
        reloj++;
        emitir('change', { added: [], updated: [clientID], removed: [] });
        emitir('update', { added: [], updated: [clientID], removed: [] });
      },

      setLocalStateField(campo, valor) {
        const actual = vecinos.getLocalState();
        if (actual === null) return;
        vecinos.setLocalState(Object.assign({}, actual, { [campo]: valor }));
      },

      get reloj() { return reloj; },

      /* Lo que llegó de la red. Devuelve true si algo cambió, para no repintar
         de gusto treinta veces por segundo. */
      recibir(id, estado, suReloj, ahora) {
        if (id === clientID) return false;

        /* «Se lo oyó» y «dijo algo nuevo» son dos cosas distintas, y hay que
           anotarlas en ese orden. El latido de alguien que está quieto repite
           el mismo reloj —no cambió nada—, así que si el reloj viejo cortara
           acá, no se anotaría que se lo oyó, y a los treinta segundos la
           guadaña lo sacaría de la lista estando conectado: el que mira sin
           escribir desaparecía solo. Anotar antes es seguro porque lo que
           llega hasta acá ya pasó por el Vigía: un sobre repetido no llega. */
        visto.set(id, ahora === undefined ? Date.now() : ahora);

        const previo = relojes.get(id);
        if (previo !== undefined && suReloj !== undefined && suReloj <= previo) return false;
        if (suReloj !== undefined) relojes.set(id, suReloj);
        const limpio = presencia(estado);
        const habia = estados.has(id);
        if (!limpio) {
          if (!habia) return false;
          estados.delete(id);
          emitir('change', { added: [], updated: [], removed: [id] });
          return true;
        }
        estados.set(id, limpio);
        emitir('change', habia
          ? { added: [], updated: [id], removed: [] }
          : { added: [id], updated: [], removed: [] });
        return true;
      },

      /* A quien no se le oye hace rato se lo da por ido. El relevo no avisa
         quién se fue —no sabe quién es quién, solo reparte sobres—, así que la
         única señal honesta es el silencio. */
      podar(ahora, silencio) {
        const t = ahora === undefined ? Date.now() : ahora;
        const tope = silencio || LIMITES.silencio;
        const idos = [];
        for (const [id, cuando] of visto) if (t - cuando > tope) idos.push(id);
        for (const id of idos) { visto.delete(id); relojes.delete(id); estados.delete(id); }
        if (idos.length) emitir('change', { added: [], updated: [], removed: idos });
        return idos;
      },

      on(que, f) {
        if (!oyentes.has(que)) oyentes.set(que, []);
        oyentes.get(que).push(f);
      },
      off(que, f) {
        const l = oyentes.get(que);
        if (!l) return;
        const i = l.indexOf(f);
        if (i >= 0) l.splice(i, 1);
      },
      destroy() { oyentes.clear(); estados.clear(); visto.clear(); relojes.clear(); }
    };
    return vecinos;
  }

  global.Sala = {
    LIMITES, PALETA, alias, colorDe, papel, presencia, cursor, posicion,
    Vecinos, Vigia, claveDe, contexto, cerrar, abrir,
    aTexto, aBytes, azar, nuevaSesion, huella
  };
})(typeof window !== 'undefined' ? window : globalThis);

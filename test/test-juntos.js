/*
 * Prueba de «programar de a dos»: la parte que se puede probar sin red.
 *
 * El enlace de una sala lleva el nombre y la contraseña. Si el enlace se lee
 * mal, los dos alumnos terminan en salas distintas mirando pantallas vacías;
 * si la sala se puede adivinar, cualquiera entra. Eso es lo que se comprueba.
 *
 *   node test/test-juntos.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'seguro.js'));
require(path.join(RAIZ, 'js', 'sala.js'));
require(path.join(RAIZ, 'js', 'juntos.js'));
const { Juntos } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('La sala');
  {
    const s = Juntos.crearSala();
    comprobar('tiene nombre y contraseña', !!s.sala && !!s.clave, JSON.stringify(s));
    comprobar('el nombre empieza con esle2-', /^esle2-/.test(s.sala), s.sala);
    comprobar('y se puede dictar por teléfono: solo letras, números y guiones',
      /^[a-z0-9-]+$/.test(s.sala), s.sala);

    /* Dos salas seguidas no se pueden parecer: si se pudieran adivinar,
       cualquiera entraría a la clase de al lado. */
    const muchas = new Set();
    for (let i = 0; i < 500; i++) muchas.add(Juntos.crearSala().sala);
    comprobar('500 salas seguidas son 500 salas distintas', muchas.size === 500, muchas.size);

    const claves = new Set();
    for (let i = 0; i < 500; i++) claves.add(Juntos.crearSala().clave);
    comprobar('y 500 contraseñas distintas', claves.size === 500, claves.size);
    /* El secreto dejó de ser «algo que nadie va a escribir de memoria» para
       ser la llave con la que se cifra todo lo que pasa por el relevo: si es
       corto, el relevo puede probar todos hasta leer la clase entera. */
    comprobar('el secreto es de 256 bits', s.clave.length >= 42, s.clave.length + ' caracteres');
    comprobar('y entra en un enlace sin escaparse', /^[A-Za-z0-9_-]+$/.test(s.clave), s.clave);
  }

  /* ------------------------------------------------------------------ */
  seccion('El enlace');
  {
    const s = Juntos.crearSala();
    const url = Juntos.enlace(s.sala, s.clave, 'https://esle2.vercel.app/index.html');

    comprobar('la sala va después del #', /#juntos=/.test(url), url);
    comprobar('y nada de eso se manda al servidor',
      url.split('#')[0] === 'https://esle2.vercel.app/index.html');

    const vuelta = Juntos.leerUrl(url.slice(url.indexOf('#')));
    comprobar('se puede volver a leer', !!vuelta);
    comprobar('con la misma sala', vuelta.sala === s.sala, vuelta && vuelta.sala);
    comprobar('y la misma contraseña', vuelta.clave === s.clave, vuelta && vuelta.clave);
  }

  /* ------------------------------------------------------------------ */
  seccion('Enlaces de otro lado');
  {
    comprobar('un hash cualquiera da null', Juntos.leerUrl('#curso') === null);
    comprobar('sin contraseña da null', Juntos.leerUrl('#juntos=esle2-rio-verde') === null);
    comprobar('vacío da null', Juntos.leerUrl('') === null);
    comprobar('el de una guía de aula no se confunde con este',
      Juntos.leerUrl('#aula=zzz') === null);
    /* Nada de lo que venga en el enlace puede salir de letras y números: es lo
       que va derecho al servidor de señas. */
    const raro = Juntos.leerUrl('#juntos=sala<script>.clave');
    comprobar('un nombre con símbolos no pasa entero',
      raro === null || !/[<>]/.test(raro.sala + raro.clave), JSON.stringify(raro));
  }

  /* ------------------------------------------------------------------ */
  /* El enlace puede traer el servidor de la escuela adentro, para que nadie
     tenga que configurar nada en cada computadora. Eso también quiere decir
     que un enlace ajeno puede decirle a un navegador a dónde conectarse, así
     que lo que salga de acá tiene que ser una dirección y nada más —y la
     interfaz además lo pregunta antes de usarlo—. */
  seccion('El servidor que viene en el enlace');
  {
    const s = Juntos.crearSala();
    const url = Juntos.enlace(s.sala, s.clave, 'https://esle2.vercel.app/', 'wss://senas.escuela.edu.py');
    const v = Juntos.leerUrl(url.slice(url.indexOf('#')));
    comprobar('vuelve la dirección del relevo', v.relevo === 'wss://senas.escuela.edu.py', v.relevo);
    comprobar('y la sala sigue entera', v.sala === s.sala && v.clave === s.clave);

    comprobar('sin relevo, no hay relevo',
      Juntos.leerUrl(Juntos.enlace(s.sala, s.clave, 'https://x/')).relevo === null);

    /* Lo que no es una dirección cifrada no pasa: ni http, ni javascript:, ni
       una con cosas raras adentro. */
    const cuela = u => Juntos.leerRelevo(Sala.aTexto(new TextEncoder().encode(u)));
    comprobar('ws:// sin cifrar no pasa', cuela('ws://senas.escuela.edu.py') === null);
    comprobar('https:// tampoco', cuela('https://senas.escuela.edu.py') === null);
    comprobar('javascript: menos', cuela('javascript:alert(1)') === null);
    comprobar('con espacios no pasa', cuela('wss://a b') === null);
    comprobar('una enorme tampoco', cuela('wss://' + 'a'.repeat(400)) === null);
    comprobar('una normal sí', cuela('wss://esle2-senas.alguien.workers.dev') !== null);
    comprobar('basura que no es base64 no rompe', Juntos.leerRelevo('!!!!') === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Cómo se ve cada uno');
  {
    comprobar('el color de un nombre es siempre el mismo',
      Juntos.color('Ana 12') === Juntos.color('Ana 12'));
    comprobar('y dos nombres distintos, distinto',
      Juntos.color('Ana 12') !== Juntos.color('Beto 44'));
    /* En #rrggbb y no en hsl(): y-codemirror le pega dos dígitos atrás para la
       transparencia, y «hsl(...)70» no es un color. Por eso la selección del
       compañero no se veía. */
    comprobar('es #rrggbb, que es lo que y-codemirror puede usar',
      /^#[0-9a-f]{6}$/.test(Juntos.color('Ana')), Juntos.color('Ana'));
    comprobar('y con la transparencia atrás sigue siendo un color',
      /^#[0-9a-f]{8}$/.test(Juntos.color('Ana') + '70'));
    comprobar('el nombre sugerido tiene nombre y número',
      /^[A-Za-z]+ \d+$/.test(Juntos.nombreSugerido()), Juntos.nombreSugerido());
  }

  /* ===================== ¿el servidor REENVÍA? ============================ */
  /* Conectar no alcanza. Un servidor de señas puede aceptar la conexión y no
     reenviar nada —es exactamente lo que hace el que trae la librería por
     omisión—, y entonces las dos computadoras quedan «conectadas» sin
     encontrarse jamás. Estas pruebas son sobre ese caso, que es el que estuvo
     rompiendo en producción sin que nada lo dijera. */
  {
    /* Un servidor de mentira. «modo» dice qué clase de servidor es. */
    const servidorFalso = modo => function (url) {
      const ws = this;
      ws.url = url;
      ws.close = () => { ws.cerrado = true; };
      ws.send = datos => {
        const d = JSON.parse(datos);
        /* El que reenvía devuelve lo publicado a los suscriptos. */
        if (modo === 'reenvia' && d.type === 'publish') {
          setTimeout(() => ws.onmessage && ws.onmessage({ data: datos }), 5);
        }
        /* El «mudo» acepta todo y no devuelve nada: el caso peligroso. */
      };
      setTimeout(() => {
        if (modo === 'roto') { ws.onerror && ws.onerror(new Error('no')); return; }
        ws.onopen && ws.onopen();
      }, 3);
    };
    const con = modo => ({ WebSocket: servidorFalso(modo), espera: 120 });

    comprobar('uno que reenvía se detecta',
      await Juntos.probarRelevo('wss://bueno', con('reenvia')) === 'reenvia');
    comprobar('uno que conecta y NO reenvía también',
      await Juntos.probarRelevo('wss://mudo', con('mudo')) === 'no-reenvia');
    comprobar('uno que ni conecta',
      await Juntos.probarRelevo('wss://roto', con('roto')) === 'sin-conexion');
    comprobar('sin WebSocket en el navegador no rompe',
      await Juntos.probarRelevo('wss://x', { WebSocket: null, espera: 50 }) === 'sin-conexion');

    /* Lo que se manda es el protocolo de y-webrtc y nada más. */
    {
      const visto = [];
      const Espia = function () {
        const ws = this;
        ws.send = d => visto.push(d);
        ws.close = () => {};
        setTimeout(() => ws.onopen && ws.onopen(), 3);
      };
      await Juntos.probarRelevo('wss://x', { WebSocket: Espia, espera: 80, tema: 'T' });
      comprobar('se suscribe primero y publica después', visto.length === 2, visto.length);
      comprobar('con el protocolo de y-webrtc',
        JSON.parse(visto[0]).type === 'subscribe' && JSON.parse(visto[1]).type === 'publish',
        visto.join(' '));
      comprobar('sobre el mismo tema',
        JSON.parse(visto[0]).topics[0] === 'T' && JSON.parse(visto[1]).topic === 'T');
    }

    /* El eco: solo cuenta el propio. */
    comprobar('el eco propio cuenta', Juntos.esEco(Juntos.pruebaDeRelevo('T').publicar, 'T'));
    comprobar('el de otro tema no', !Juntos.esEco(Juntos.pruebaDeRelevo('OTRO').publicar, 'T'));
    comprobar('un mensaje cualquiera tampoco', !Juntos.esEco(JSON.stringify({ type: 'pong' }), 'T'));
    comprobar('ni algo que no es JSON', !Juntos.esEco('hola', 'T'));
    comprobar('ni vacío', !Juntos.esEco('', 'T'));

    /* Dos alumnos probando a la vez no se cruzan. */
    comprobar('cada prueba usa un tema distinto',
      Juntos.temaDePrueba() !== Juntos.temaDePrueba());

    /* La lista entera: alcanza con que uno sirva. */
    comprobar('con uno bueno en la lista, alcanza',
      await Juntos.alguienReenvia(['wss://a', 'wss://b'], con('reenvia')) !== null);
    comprobar('si ninguno reenvía, se dice que no',
      await Juntos.alguienReenvia(['wss://a', 'wss://b'], con('mudo')) === null);
    comprobar('sin servidores no rompe',
      await Juntos.alguienReenvia([], con('mudo')) === null);
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'programar de a dos tiene fallos');
})();

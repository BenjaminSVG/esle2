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
require(path.join(RAIZ, 'js', 'juntos.js'));
const { Juntos } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

(() => {
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
    comprobar('la contraseña es larga', s.clave.length >= 16, s.clave.length + ' caracteres');
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
  seccion('Cómo se ve cada uno');
  {
    comprobar('el color de un nombre es siempre el mismo',
      Juntos.color('Ana 12') === Juntos.color('Ana 12'));
    comprobar('y dos nombres distintos, distinto',
      Juntos.color('Ana 12') !== Juntos.color('Beto 44'));
    comprobar('es un color que el navegador entiende',
      /^hsl\(\d+, \d+%, \d+%\)$/.test(Juntos.color('Ana')), Juntos.color('Ana'));
    comprobar('el nombre sugerido tiene nombre y número',
      /^[A-Za-z]+ \d+$/.test(Juntos.nombreSugerido()), Juntos.nombreSugerido());
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'programar de a dos tiene fallos');
})();

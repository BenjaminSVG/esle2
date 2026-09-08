/*
 * Prueba del modo aula: armar una guía, meterla en un enlace y volver a
 * sacarla igual.
 *
 * Lo que importa es la vuelta completa: guía → enlace → guía → ejercicios que
 * el curso pueda corregir. Si eso se rompe, el enlace que un profesor repartió
 * el lunes deja de andar el martes, que es lo peor que puede pasar acá.
 *
 *   node test/test-aula.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'aula.js'));
const { Aula } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

const CATALOGO = [
  { id: 'f1', nivel: 'facil', titulo: 'Hola, mundo', enunciado: '…', plantilla: '', pruebas: [{ entrada: '', salida: 'Hola' }] },
  { id: 'f2', nivel: 'facil', titulo: 'Suma', enunciado: '…', plantilla: '', pruebas: [{ entrada: '5,10', salida: '15' }] },
  { id: 'm1', nivel: 'medio', titulo: 'Factorial', enunciado: '…', plantilla: '', pruebas: [{ entrada: '5', salida: '120' }] }
];

const PROPIO = {
  id: 'mio1', nivel: 'medio', titulo: 'El de la profe',
  enunciado: 'Leé dos números e imprimí su suma.',
  pista: 'leer (a, b)',
  plantilla: 'inicio\nfin\n',
  pruebas: [{ entrada: '5,10', salida: '15' }, { entrada: '1,1', salida: '2' }]
};

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Armar una guía');
  {
    const g = Aula.desdeEjercicios('Práctica 1', 'Para el viernes.', 'SLE2',
      [CATALOGO[1], PROPIO, CATALOGO[2]], CATALOGO);

    comprobar('los del curso viajan como su id, no enteros',
      g.e[0] === 'f2' && g.e[2] === 'm1', JSON.stringify(g.e));
    comprobar('el propio viaja entero', typeof g.e[1] === 'object' && g.e[1].titulo === 'El de la profe');
    comprobar('con sus casos de prueba', g.e[1].pruebas.length === 2);
    comprobar('guarda el título y el mensaje', g.n === 'Práctica 1' && g.m === 'Para el viernes.');
    comprobar('y el lenguaje', g.l === 'SLE2');
    comprobar('no hay problemas que informar', Aula.problemas(g).length === 0, JSON.stringify(Aula.problemas(g)));
  }

  /* ------------------------------------------------------------------ */
  seccion('El enlace');
  {
    const g = Aula.desdeEjercicios('Práctica 1', 'Para el viernes.', 'SLE2',
      [CATALOGO[1], PROPIO], CATALOGO);
    const url = await Aula.enlace(g, 'https://esle2.vercel.app/index.html');

    comprobar('el enlace lleva la guía después del #', /#aula=[A-Za-z0-9\-_]+$/.test(url), url);
    comprobar('y no la manda al servidor: todo va en el fragmento',
      url.split('#')[0] === 'https://esle2.vercel.app/index.html');

    const vuelta = await Aula.leerUrl(url.slice(url.indexOf('#')));
    comprobar('se puede volver a leer', !!vuelta);
    comprobar('y es exactamente la misma guía', JSON.stringify(vuelta) === JSON.stringify(g),
      JSON.stringify(vuelta));

    /* Solo ids del curso: el enlace tiene que quedar chico. */
    const corta = Aula.desdeEjercicios('Repaso', '', 'SLE2', CATALOGO, CATALOGO);
    const urlCorta = await Aula.enlace(corta, 'https://esle2.vercel.app/index.html');
    comprobar('una guía de tres ejercicios del curso da un enlace corto',
      urlCorta.length < 200, urlCorta.length + ' caracteres');

    /* Y una con mucho texto propio también tiene que entrar. */
    const gorda = Aula.desdeEjercicios('Gorda', 'x'.repeat(500), 'SLE2',
      Array.from({ length: 15 }, (_, i) => Object.assign({}, PROPIO, { id: 'p' + i })), []);
    const urlGorda = await Aula.enlace(gorda, 'https://esle2.vercel.app/index.html');
    comprobar('una guía grande sigue entrando en un enlace usable',
      urlGorda.length < 4000, urlGorda.length + ' caracteres');
    comprobar('y también vuelve entera',
      JSON.stringify(await Aula.leerUrl('#aula=' + urlGorda.split('#aula=')[1])) === JSON.stringify(gorda));
  }

  /* ------------------------------------------------------------------ */
  seccion('Enlaces rotos o de otro lado');
  {
    comprobar('un hash sin guía da null', (await Aula.leerUrl('#curso')) === null);
    comprobar('basura codificada da null', (await Aula.leerUrl('#aula=zzzzzz')) === null);
    comprobar('texto vacío da null', (await Aula.decodificar('')) === null);
    comprobar('algo que no es una guía da null',
      (await Aula.decodificar('p' + Buffer.from('{"hola":1}').toString('base64url'))) === null);
    comprobar('una guía de otra versión da null',
      (await Aula.decodificar('p' + Buffer.from('{"v":99,"n":"x","e":[]}').toString('base64url'))) === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Usarla en el curso');
  {
    const g = Aula.desdeEjercicios('Práctica 1', '', 'SLE2', [CATALOGO[1], PROPIO], CATALOGO);
    const { ejercicios, faltan } = Aula.resolver(g, CATALOGO);

    comprobar('salen los dos ejercicios', ejercicios.length === 2);
    comprobar('no falta ninguno', faltan.length === 0);
    comprobar('el del curso es el del curso', ejercicios[0].id === 'f2');
    comprobar('el propio se corrige igual: tiene sus pruebas',
      ejercicios[1].pruebas.length === 2 && ejercicios[1].pruebas[0].salida === '15');
    comprobar('y su id no pisa el de un ejercicio propio del alumno',
      ejercicios[1].id !== 'mio1' && /^a[a-z0-9]+-1$/.test(ejercicios[1].id), ejercicios[1].id);

    /* El mismo enlace abierto dos veces tiene que dar el mismo id, o el
       avance no se guardaría. */
    const otra = Aula.resolver(g, CATALOGO);
    comprobar('el mismo enlace da siempre el mismo id', otra.ejercicios[1].id === ejercicios[1].id);

    /* Dos guías distintas, no. */
    const g2 = Aula.desdeEjercicios('Práctica 2', '', 'SLE2', [PROPIO], CATALOGO);
    comprobar('dos guías distintas no comparten ids',
      Aula.resolver(g2, CATALOGO).ejercicios[0].id !== ejercicios[1].id);

    /* Un id del curso que ya no existe. */
    const g3 = Aula.desdeEjercicios('Vieja', '', 'SLE2', [{ id: 'borrado' }], [{ id: 'borrado' }]);
    const r3 = Aula.resolver(g3, CATALOGO);
    comprobar('un ejercicio del curso que ya no está se avisa',
      r3.faltan.length === 1 && r3.faltan[0] === 'borrado', JSON.stringify(r3));
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que no se puede repartir');
  {
    const sinTitulo = Aula.desdeEjercicios('', '', 'SLE2', [CATALOGO[0]], CATALOGO);
    comprobar('una guía sin título se avisa',
      Aula.problemas(sinTitulo).some(p => /título/.test(p)));

    const vacia = Aula.desdeEjercicios('Vacía', '', 'SLE2', [], CATALOGO);
    comprobar('una guía sin ejercicios se avisa',
      Aula.problemas(vacia).some(p => /ningún ejercicio/.test(p)));

    const sinPruebas = Aula.desdeEjercicios('Mala', '', 'SLE2',
      [{ id: 'x', titulo: 'Sin casos', enunciado: 'algo', pruebas: [] }], []);
    comprobar('un ejercicio propio sin casos de prueba se avisa',
      Aula.problemas(sinPruebas).some(p => /caso de prueba/.test(p)),
      JSON.stringify(Aula.problemas(sinPruebas)));

    const sinConsigna = Aula.desdeEjercicios('Mala', '', 'SLE2',
      [{ id: 'x', titulo: 'Sin consigna', enunciado: '', pruebas: [{ entrada: '', salida: 'a' }] }], []);
    comprobar('y uno sin consigna también',
      Aula.problemas(sinConsigna).some(p => /consigna/.test(p)));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el modo aula tiene fallos');
})();

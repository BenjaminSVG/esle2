/*
 * Prueba de js/guardado.js: guardar sin tirar abajo el IDE.
 *
 * Lo que importa: que escribir NUNCA tire una excepción. El IDE guarda el
 * programa en cada tecla, adentro de un oyente de CodeMirror; una excepción
 * ahí corta el setValue() y el alumno se queda con el editor vacío.
 *
 *   node test/test-guardado.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'guardado.js'));
const { Guardado } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '  [' + detalle + ']' : ''));
}
const seccion = t => console.log('\n' + t);

/* Un almacén que anda. */
function bueno() {
  const m = new Map();
  return {
    getItem: k => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    _m: m
  };
}
/* Y uno lleno, como el de una ventana privada. */
function lleno() {
  return {
    getItem: () => { throw new Error('no se puede leer'); },
    setItem: () => { const e = new Error('lleno'); e.name = 'QuotaExceededError'; throw e; },
    removeItem: () => { throw new Error('no se puede borrar'); }
  };
}

seccion('Cuando se puede guardar');
{
  const a = bueno();
  const g = Guardado.crear({ almacen: a });
  comprobar('escribir devuelve verdadero', g.escribir('esle2_x', 'hola') === true);
  comprobar('y se guardó', a._m.get('esle2_x') === 'hola');
  comprobar('leer lo devuelve', g.leer('esle2_x') === 'hola');
  comprobar('lo que no está da null', g.leer('esle2_nada') === null);
  comprobar('borrar lo saca', g.borrar('esle2_x') === true && a._m.has('esle2_x') === false);
  comprobar('y dice que todo anduvo', g.anduvo() === true);
  comprobar('un número se guarda como texto',
    g.escribir('esle2_n', 7) && a._m.get('esle2_n') === '7');
}

seccion('Cuando no se puede');
{
  const avisos = [];
  const g = Guardado.crear({ almacen: lleno(), avisar: t => avisos.push(t) });

  let tiro = false;
  try { g.escribir('esle2_x', 'hola'); } catch (e) { tiro = true; }
  comprobar('escribir NO tira', !tiro);
  comprobar('devuelve falso', g.escribir('esle2_x', 'hola') === false);
  comprobar('y lo dice', g.anduvo() === false);

  let tiroLeer = false;
  try { g.leer('esle2_x'); } catch (e) { tiroLeer = true; }
  comprobar('leer tampoco tira', !tiroLeer);
  comprobar('y devuelve null', g.leer('esle2_x') === null);
  comprobar('borrar tampoco tira', g.borrar('esle2_x') === false);

  /* Una sola vez: el IDE guarda en cada tecla, y un cartel por tecla sería
     peor que el problema. */
  for (let i = 0; i < 20; i++) g.escribir('esle2_x', 'letra ' + i);
  comprobar('avisa una sola vez', avisos.length === 1, avisos.length);
  comprobar('y el aviso dice qué hacer', /Guardar/.test(avisos[0]), avisos[0]);
}

seccion('El aviso se puede enganchar después');
{
  /* Cuando arranca la página todavía no hay dónde mostrarlo, y el primer
     guardado puede fallar antes de que lo haya. */
  const g = Guardado.crear({ almacen: lleno() });
  g.escribir('esle2_x', 'hola');
  const avisos = [];
  g.alFallar(t => avisos.push(t));
  comprobar('el aviso que se perdió se da al enganchar', avisos.length === 1, avisos.length);
  g.escribir('esle2_x', 'otra');
  comprobar('y no se repite', avisos.length === 1, avisos.length);
}

seccion('Sin almacén ninguno');
{
  const g = Guardado.crear({ almacen: null });
  comprobar('leer da null', g.leer('esle2_x') === null);
  comprobar('escribir da falso y no tira', g.escribir('esle2_x', 'a') === false);
}

seccion('El de por omisión existe');
comprobar('Guardado.escribir es una función', typeof Guardado.escribir === 'function');
comprobar('y tiene el texto del aviso', typeof Guardado.AVISO === 'string' && Guardado.AVISO.length > 40);

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'guardado.js tiene fallos');

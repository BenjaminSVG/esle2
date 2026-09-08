/*
 * Prueba de las estadísticas del curso (js/estadisticas.js).
 *   node test/test-estadisticas.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'estadisticas.js'));
const { Estadisticas } = global;

let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };
function comprobar(que, real, esperado) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return; }
  falla(que, `esperado ${JSON.stringify(esperado)} / obtenido ${JSON.stringify(real)}`);
}

const EJERCICIOS = [
  { id: 'f1', titulo: 'Hola', nivel: 'facil' },
  { id: 'f2', titulo: 'Suma', nivel: 'facil' },
  { id: 'm1', titulo: 'Factorial', nivel: 'medio' },
  { id: 'a1', titulo: 'Primos', nivel: 'avanzado' }
];

/* f1: acertó al primero · f2: siete intentos y sigue sin salir ·
   m1: cuatro intentos y salió · a1: sin tocar */
const DATOS = {
  f1: { intentos: 1, aciertos: 1 },
  f2: { intentos: 7, aciertos: 0 },
  m1: { intentos: 4, aciertos: 1 }
};
const PROGRESO = { f1: '2026-09-01', m1: '2026-09-02' };

const r = Estadisticas.resumen(DATOS, EJERCICIOS, PROGRESO);

comprobar('cuántos hay y cuántos salieron', [r.total, r.resueltos], [4, 2]);
comprobar('intentos y aciertos', [r.intentos, r.aciertos], [12, 2]);
comprobar('intentos por acierto', r.intentosPorAcierto, 6);
comprobar('por nivel', [r.porNivel.facil, r.porNivel.medio, r.porNivel.avanzado],
  [{ total: 2, resueltos: 1 }, { total: 1, resueltos: 1 }, { total: 1, resueltos: 1 - 1 }]);
comprobar('los que más costaron, de mayor a menor',
  r.costosos.map(c => [c.id, c.intentos]), [['f2', 7], ['m1', 4]]);
comprobar('dónde está atascado', r.atascado && r.atascado.id, 'f2');

/* sin datos no se rompe ni divide por cero */
const vacio = Estadisticas.resumen(null, EJERCICIOS, null);
comprobar('sin intentos', [vacio.intentos, vacio.intentosPorAcierto, vacio.atascado], [0, 0, null]);
comprobar('sin ejercicios', Estadisticas.resumen({}, [], {}).total, 0);

/* un nivel que no estaba previsto se agrega solo */
const otro = Estadisticas.resumen({}, [{ id: 'x1', titulo: 'X', nivel: 'experto' }], {});
comprobar('nivel nuevo', otro.porNivel.experto, { total: 1, resueltos: 0 });

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay pruebas fallidas');

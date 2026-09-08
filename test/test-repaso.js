/*
 * Prueba del repaso espaciado (js/repaso.js) y del zoom de la proyección.
 *   node test/test-repaso.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
global.document = { addEventListener() {}, body: { classList: { toggle() {} } }, querySelectorAll: () => [], getElementById: () => null, documentElement: { style: { setProperty() {} } } };
global.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
require(path.join(__dirname, '..', 'js', 'repaso.js'));
require(path.join(__dirname, '..', 'js', 'presentacion.js'));
const { Repaso, Presentacion } = global;

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

/* --------------------------- cuándo vuelve ---------------------------- */
comprobar('la primera espera son 3 días', Repaso.espera(0, 1), 3);
comprobar('después de un repaso, 7', Repaso.espera(1, 1), 7);
comprobar('más adelante se estira', [Repaso.espera(2, 1), Repaso.espera(3, 1), Repaso.espera(9, 1)], [16, 35, 70]);
comprobar('si costó, vuelve antes', [Repaso.espera(0, 5), Repaso.espera(2, 6)], [2, 8]);

/* ------------------------- qué toca repasar --------------------------- */
const base = {
  ejercicios: EJERCICIOS,
  progreso: { f1: '2026-09-01', f2: '2026-09-08', m1: '2026-09-05' },
  intentos: { f1: { intentos: 1, aciertos: 1 }, f2: { intentos: 6, aciertos: 1 }, m1: { intentos: 2, aciertos: 1 } },
  repasos: {},
  hoy: '2026-09-10'
};
const s = Repaso.sugerencias(base);
comprobar('lo más atrasado primero', s.map(x => x.id), ['f1', 'm1', 'f2']);
comprobar('f1 lleva nueve días y tocaba a los tres', [s[0].dias, s[0].espera], [9, 3]);
comprobar('f2 costó seis intentos, así que vuelve a los dos días', [s[2].dias, s[2].espera], [2, 2]);
comprobar('lo que no se resolvió no es repaso',
  Repaso.sugerencias(base).some(x => x.id === 'a1'), false);

comprobar('nada para repasar todavía',
  Repaso.sugerencias(Object.assign({}, base, { hoy: '2026-09-02' })).map(x => x.id), []);

comprobar('se pueden pedir menos',
  Repaso.sugerencias(Object.assign({}, base, { cuantos: 1 })).map(x => x.id), ['f1']);

/* ---------------------- después de repasar algo ----------------------- */
let repasos = Repaso.anotarRepaso({}, 'f1', true, '2026-09-10');
comprobar('un repaso bien cuenta', repasos.f1, { hechos: 1, ultimo: '2026-09-10' });
comprobar('con el repaso hecho, hoy ya no aparece',
  Repaso.sugerencias(Object.assign({}, base, { repasos })).map(x => x.id), ['m1', 'f2']);
comprobar('a los siete días vuelve',
  Repaso.sugerencias(Object.assign({}, base, { repasos, hoy: '2026-09-17' })).map(x => x.id).includes('f1'), true);

repasos = Repaso.anotarRepaso(repasos, 'f1', false, '2026-09-17');
comprobar('si sale mal, vuelve a empezar', repasos.f1, { hechos: 0, ultimo: '2026-09-17' });

/* --------------------------- zoom de la proyección --------------------- */
comprobar('el zoom se queda entre 1 y 2.2',
  [Presentacion.acotar(0.5), Presentacion.acotar(1.4), Presentacion.acotar(9)], [1, 1.4, 2.2]);

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay pruebas fallidas');

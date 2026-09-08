/*
 * Prueba de la racha de días (js/racha.js): la cuenta es una función pura,
 * así que se prueba sin navegador pasándole la fecha de hoy.
 *   node test/test-racha.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
global.document = { addEventListener() {} };      // racha.js se engancha al DOM si lo hay
require(path.join(__dirname, '..', 'js', 'racha.js'));
const { Racha } = global;

let ok = 0, fallos = 0;
function comprobar(que, real, esperado) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}\n    esperado ${JSON.stringify(esperado)}\n    obtenido ${JSON.stringify(real)}`);
}

const sinFecha = e => ({ dias: e.dias, mejor: e.mejor, total: e.total });

/* primer ejercicio de la vida */
let e = Racha.calcular(null, '2026-03-01');
comprobar('primer día', sinFecha(e), { dias: 1, mejor: 1, total: 1 });

/* dos ejercicios el mismo día: la racha no se mueve, el total sí */
e = Racha.calcular(e, '2026-03-01');
comprobar('mismo día', sinFecha(e), { dias: 1, mejor: 1, total: 2 });

/* al día siguiente, la racha crece */
e = Racha.calcular(e, '2026-03-02');
comprobar('día seguido', sinFecha(e), { dias: 2, mejor: 2, total: 3 });
e = Racha.calcular(e, '2026-03-03');
comprobar('tercer día', sinFecha(e), { dias: 3, mejor: 3, total: 4 });

/* saltarse un día la corta, pero el mejor queda guardado */
e = Racha.calcular(e, '2026-03-05');
comprobar('tras faltar un día', sinFecha(e), { dias: 1, mejor: 3, total: 5 });

/* la racha se muestra cortada aunque no se resuelva nada */
comprobar('vigente al día siguiente', Racha.vigente(e, '2026-03-06').dias, 1);
comprobar('vigente dos días después', Racha.vigente(e, '2026-03-07').dias, 0);
comprobar('el mejor no se pierde', Racha.vigente(e, '2026-03-30').mejor, 3);

/* cambio de mes y de año */
let f = Racha.calcular({ ultimo: '2026-12-31', dias: 4, mejor: 4, total: 9 }, '2027-01-01');
comprobar('cambio de año', sinFecha(f), { dias: 5, mejor: 5, total: 10 });

/* una cookie rota no rompe la cuenta */
comprobar('estado inválido', sinFecha(Racha.calcular({ dias: 'x' }, '2026-03-01')), { dias: 1, mejor: 1, total: 1 });

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay pruebas fallidas');

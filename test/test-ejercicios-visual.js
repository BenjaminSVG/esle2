/*
 * Prueba del curso de ESLE2 Visual.
 *
 * Un ejercicio con un enunciado imposible, o con una corrección que no da por
 * buena ni a la solución correcta, es peor que no tener el ejercicio: el
 * alumno se queda peleando con el corrector en vez de con el problema. Así que
 * acá se corren las 50 soluciones de referencia contra su propia corrección y
 * se exige que todas pasen.
 *
 * Además se revisa que cada ejercicio esté bien formado (id único, plantilla
 * que compila, pruebas con pasos y comprobaciones conocidos) y —lo que más
 * importa— que la plantilla vacía NO pase: si pasara, el ejercicio no estaría
 * pidiendo nada.
 *
 *   node test/test-ejercicios-visual.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js/sle2.js'));
require(path.join(RAIZ, 'js/sle2vis.js'));
const VV = require(path.join(RAIZ, 'js/verificar-visual.js'));
require(path.join(RAIZ, 'js/ejercicios-visual.js'));

const EJERCICIOS = global.CURSO_VISUAL.EJERCICIOS;
const SOLUCIONES = require('./soluciones-visual.js');

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n      ' + det : ''}`);
}

(async () => {
  /* --------------------------- forma del curso -------------------------- */
  comprobar('el curso tiene 50 ejercicios', EJERCICIOS.length === 50, String(EJERCICIOS.length));

  const vistos = new Set();
  const NIVELES = new Set(['facil', 'medio', 'avanzado']);
  for (const e of EJERCICIOS) {
    comprobar(`${e.id}: el id no está repetido`, !vistos.has(e.id), e.id);
    vistos.add(e.id);
    comprobar(`${e.id}: tiene un nivel conocido`, NIVELES.has(e.nivel), e.nivel);
    comprobar(`${e.id}: tiene título`, (e.titulo || '').length > 3);
    comprobar(`${e.id}: tiene enunciado`, (e.enunciado || '').length > 40);
    comprobar(`${e.id}: tiene pista`, (e.pista || '').length > 20);
    comprobar(`${e.id}: tiene al menos una prueba`, (e.pruebas || []).length >= 1);

    /* La plantilla es lo primero que ve el alumno: tiene que compilar. */
    try {
      global.SLE2VIS.compilar(e.plantilla);
      ok++;
    } catch (err) {
      fallos++;
      console.log(`  ✘ ${e.id}: la plantilla no compila\n      línea ${err.linea}: ${err.message}`);
    }

    for (const p of e.pruebas) {
      comprobar(`${e.id}: la prueba tiene nombre`, (p.nombre || '').length > 5);
      comprobar(`${e.id}: la prueba comprueba algo`, (p.espera || []).length >= 1);
      for (const paso of (p.pasos || []))
        comprobar(`${e.id}: el paso "${paso[0]}" existe`, !!VV.PASOS[paso[0]], paso[0]);
      for (const esp of (p.espera || []))
        comprobar(`${e.id}: la comprobación "${esp[0]}" existe`, !!VV.ESPERAS[esp[0]], esp[0]);
    }
  }

  const porNivel = n => EJERCICIOS.filter(e => e.nivel === n).length;
  comprobar('hay ejercicios de los tres niveles',
    porNivel('facil') >= 10 && porNivel('medio') >= 10 && porNivel('avanzado') >= 5,
    `${porNivel('facil')} / ${porNivel('medio')} / ${porNivel('avanzado')}`);

  /* --------------------- las soluciones de referencia ------------------- */
  for (const e of EJERCICIOS) {
    const sol = SOLUCIONES[e.id];
    if (!sol) { fallos++; console.log(`  ✘ ${e.id}: falta la solución de referencia`); continue; }

    let todoBien = true;
    for (const p of e.pruebas) {
      const r = await VV.correr(sol, p);
      if (!r.ok) {
        todoBien = false;
        console.log(`  ✘ ${e.id} «${e.titulo}» — ${p.nombre}\n      ${r.fallos.join('\n      ')}`);
      }
    }
    if (todoBien) ok++; else fallos++;
  }

  /* -------------------- y que la plantilla no alcance ------------------- */
  /* Si la plantilla vacía aprobara, el ejercicio no estaría pidiendo nada. */
  for (const e of EJERCICIOS) {
    let alguna = false;
    for (const p of e.pruebas) {
      const r = await VV.correr(e.plantilla, p);
      if (!r.ok) { alguna = true; break; }
    }
    comprobar(`${e.id}: la plantilla sola no aprueba`, alguna);
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el curso de ESLE2 Visual tiene fallos');
})();

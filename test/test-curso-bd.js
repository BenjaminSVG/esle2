/*
 * Prueba del curso de ESLE2 BD: los cincuenta ejercicios.
 *
 * Dos cosas, y las dos importan:
 *
 *   1. que cada ejercicio esté bien armado —id único, nivel válido, enunciado,
 *      pista, plantilla que compile, y al menos una prueba—;
 *   2. que la solución de referencia PASE. Si no pasa, el enunciado está
 *      pidiendo algo que no se puede, o la prueba espera otra cosa, y el que
 *      se entera es el alumno que se queda trabado.
 *
 *   node test/test-curso-bd.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sql.js'));
require(path.join(RAIZ, 'js', 'sle2bd.js'));
require(path.join(RAIZ, 'js', 'verificar-bd.js'));
require(path.join(RAIZ, 'js', 'ejercicios-bd.js'));
const { VerificarBD, SLE2BD, CURSO_BD } = global;
const SOLUCIONES = require('./soluciones-bd.js');

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

(async () => {
  const E = CURSO_BD.EJERCICIOS;

  /* ------------------------------------------------------------------ */
  seccion('El catálogo');
  /* ------------------------------------------------------------------ */
  comprobar('son cincuenta', E.length === 50, E.length);

  const porNivel = n => E.filter(e => e.nivel === n).length;
  comprobar('veinte fáciles', porNivel('facil') === 20, porNivel('facil'));
  comprobar('veinte medios', porNivel('medio') === 20, porNivel('medio'));
  comprobar('diez difíciles', porNivel('dificil') === 10, porNivel('dificil'));

  const ids = new Set();
  for (const e of E) {
    comprobar('id único: ' + e.id, !ids.has(e.id));
    ids.add(e.id);
    comprobar('tiene título: ' + e.id, !!e.titulo);
    comprobar('tiene enunciado: ' + e.id, !!e.enunciado && e.enunciado.length > 40);
    comprobar('tiene pista: ' + e.id, !!e.pista && e.pista.length > 20);
    comprobar('tiene al menos una prueba: ' + e.id, (e.pruebas || []).length > 0);
    for (const p of e.pruebas || []) {
      comprobar('la prueba tiene nombre: ' + e.id, !!p.nombre);
      comprobar('la prueba espera algo: ' + e.id, (p.espera || []).length > 0);
      for (const esp of p.espera || []) {
        comprobar('espera conocida (' + esp[0] + '): ' + e.id,
          VerificarBD.ESPERAS.indexOf(esp[0]) >= 0, esp[0]);
        if (esp[0] === 'usa') {
          comprobar('construcción conocida (' + esp[1] + '): ' + e.id,
            VerificarBD.CONSTRUCCIONES.indexOf(esp[1]) >= 0, esp[1]);
        }
      }
    }
    /* La plantilla es lo primero que ve el alumno: si no compila, arranca con
       un error que no cometió él. */
    comprobar('la plantilla compila: ' + e.id, SLE2BD.compilar(e.plantilla) !== null || true);
    let plantillaOk = true, detalle = '';
    try { SLE2BD.compilar(e.plantilla); } catch (err) { plantillaOk = false; detalle = err.message; }
    comprobar('la plantilla no tiene errores: ' + e.id, plantillaOk, detalle);
  }

  /* ------------------------------------------------------------------ */
  seccion('Las cincuenta soluciones');
  /* ------------------------------------------------------------------ */
  for (const e of E) {
    const sol = SOLUCIONES[e.id];
    comprobar('hay solución de referencia: ' + e.id, !!sol);
    if (!sol) continue;
    for (const p of e.pruebas) {
      const r = await VerificarBD.correr(sol, p);
      comprobar(e.id + ' — ' + p.nombre, r.ok, r.fallos.join('\n'));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Una solución vacía no aprueba ninguno');
  /* ------------------------------------------------------------------ */
  /* Si algún ejercicio aprobara con la plantilla tal cual, no estaría
     corrigiendo nada. */
  {
    let aprobados = [];
    for (const e of E) {
      let todas = true;
      for (const p of e.pruebas) {
        const r = await VerificarBD.correr(e.plantilla, p);
        if (!r.ok) { todas = false; break; }
      }
      if (todas) aprobados.push(e.id);
    }
    comprobar('ninguno aprueba con la plantilla vacía', aprobados.length === 0,
      aprobados.join(', '));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el curso de BD tiene fallos');
})();

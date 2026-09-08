/*
 * Corre todas las pruebas de test/ y resume.
 *   node tools/probar.js            todas
 *   node tools/probar.js viaje sql  solo las que contengan eso en el nombre
 *
 * Antes había que acordarse de correrlas de a una, que es como se cuelan las
 * roturas: nadie olvida correr la prueba de lo que acaba de tocar, se olvida
 * de la de al lado.
 */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'test');
const filtros = process.argv.slice(2).filter(a => !a.startsWith('--'));
const verboso = process.argv.includes('--todo');

const suites = fs.readdirSync(DIR)
  .filter(f => /^test-.*\.js$/.test(f))
  .filter(f => !filtros.length || filtros.some(x => f.includes(x)))
  .sort();

if (!suites.length) { console.error('ninguna prueba coincide'); process.exit(1); }

const fallaron = [];
const arranque = Date.now();

for (const suite of suites) {
  const nombre = suite.replace(/^test-|\.js$/g, '');
  let salida = '', ok = true;
  const desde = Date.now();
  try {
    salida = execFileSync(process.execPath, [path.join(DIR, suite)],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    ok = false;
    salida = String(e.stdout || '') + String(e.stderr || '');
    fallaron.push(nombre);
  }
  const seg = ((Date.now() - desde) / 1000).toFixed(1);
  /* De cada suite alcanza con su última línea: todas terminan resumiendo. */
  const resumen = salida.trim().split('\n').filter(Boolean).pop() || '(sin salida)';
  console.log(`${ok ? 'ok  ' : 'MAL '} ${nombre.padEnd(18)} ${seg.padStart(5)}s  ${resumen}`);
  if (!ok || verboso) console.log(salida.trim().split('\n').map(l => '     ' + l).join('\n'));
}

const total = ((Date.now() - arranque) / 1000).toFixed(1);
console.log(`\n${suites.length - fallaron.length}/${suites.length} suites en ${total}s`);
if (fallaron.length) console.log('fallaron: ' + fallaron.join(' '));
process.exit(fallaron.length ? 1 : 0);

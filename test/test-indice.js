/*
 * El índice del buscador global (js/indice.js) se genera a partir de las
 * documentaciones y los cursos. Esta prueba avisa si quedó viejo.
 *   node test/test-indice.js
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');

try {
  const salida = execFileSync(process.execPath,
    [path.join(__dirname, '..', 'tools', 'generar-indice.js'), '--revisar'],
    { encoding: 'utf8' });
  console.log(salida.trim());
} catch (e) {
  console.error(String(e.stderr || e.message).trim());
  process.exit(1);
}

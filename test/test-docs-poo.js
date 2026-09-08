/*
 * Comprueba que los programas de ejemplo de la documentación de ESLE2 POO
 * (los <pre data-corre="1">) compilan y se ejecutan sin errores.
 *   node test/test-docs-poo.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
const { SLE2POO } = global;

const html = fs.readFileSync(path.join(__dirname, '..', 'poo-documentacion.html'), 'utf8');

const desescapar = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');

const bloques = [];
const re = /<pre data-corre="1"><code>([\s\S]*?)<\/code><\/pre>/g;
let m;
while ((m = re.exec(html))) bloques.push(desescapar(m[1]));

function io(salida) {
  return {
    archivos: new Map(), argumentos: [],
    imprimir: t => salida.push(t),
    limpiar: () => (salida.length = 0),
    finEntrada: () => true,
    leerLinea: async () => null,
    beep: async () => {}, leerTecla: async () => 0
  };
}

(async () => {
  let ok = 0, fallos = 0;
  console.log(`— Programas de la documentación POO (${bloques.length}) —`);
  for (let i = 0; i < bloques.length; i++) {
    const salida = [];
    try {
      await SLE2POO.ejecutar(bloques[i], io(salida), { maxPasos: 2000000 });
      const linea1 = (bloques[i].trim().split('\n')[0] || '').slice(0, 46);
      console.log(`  ✔ ${String(i + 1).padStart(2)}  ${linea1}  →  ${JSON.stringify(salida.join('').slice(0, 70))}`);
      ok++;
    } catch (e) {
      fallos++;
      console.log(`  ✘ ${i + 1}: ${e}\n${bloques[i].split('\n').slice(0, 4).join('\n')}`);
    }
  }
  console.log(`\n${ok} ejemplos corren, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'hay ejemplos de la documentación que no funcionan');
  assert.ok(bloques.length >= 8, 'se esperaban al menos 8 ejemplos ejecutables');
})();

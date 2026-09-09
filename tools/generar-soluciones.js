/*
 * Copia las soluciones de referencia del curso a un archivo que el navegador
 * pueda leer.
 *
 *   node tools/generar-soluciones.js            escribe js/soluciones.js
 *   node tools/generar-soluciones.js --revisar  falla si quedó viejo
 *
 * Por qué generado y no escrito a mano: las soluciones ya viven en
 * test/soluciones-curso.js, que es lo que las pruebas usan para demostrar que
 * los 50 ejercicios se pueden resolver. Tener dos copias sería tener una
 * desactualizada, y la desactualizada sería justo la que ve el alumno.
 *
 * El archivo NO se carga con la página: js/otra-forma.js lo pide recién
 * cuando alguien resolvió un ejercicio y quiere comparar. Son 14 KB que no
 * tiene por qué bajar quien nunca los va a mirar.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'test', 'soluciones-curso.js');
const DESTINO = path.join(RAIZ, 'js', 'soluciones.js');

const soluciones = require(ORIGEN);
const ids = Object.keys(soluciones).sort((a, b) => {
  const orden = { f: 0, m: 1, a: 2 };
  const na = Number(a.slice(1)), nb = Number(b.slice(1));
  return (orden[a[0]] - orden[b[0]]) || (na - nb);
});

const salida = `/* Soluciones de referencia del curso de ESLE2.
   GENERADO por tools/generar-soluciones.js a partir de
   test/soluciones-curso.js: no editar a mano.

   Se carga a pedido —nunca con la página— y solo para comparar con lo que el
   alumno ya resolvió: ver js/otra-forma.js. */
window.ESLE2Soluciones = {
${ids.map(id => `  ${JSON.stringify(id)}: ${JSON.stringify(soluciones[id])}`).join(',\n')}
};
`;

if (process.argv.includes('--revisar')) {
  const actual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8') : '';
  if (actual !== salida) {
    console.error('js/soluciones.js quedó desactualizado: corré «node tools/generar-soluciones.js».');
    process.exit(1);
  }
  console.log(`js/soluciones.js al día (${ids.length} soluciones).`);
} else if (fs.existsSync(DESTINO) && fs.readFileSync(DESTINO, 'utf8') === salida) {
  console.log(`js/soluciones.js ya estaba al día (${ids.length} soluciones).`);
} else {
  fs.writeFileSync(DESTINO, salida);
  console.log(`js/soluciones.js escrito con ${ids.length} soluciones.`);
}

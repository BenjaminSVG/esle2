/*
 * Prueba de js/pwa-archivos.js: el consumidor de archivos que el sistema
 * operativo le pasa a ESLE2 instalada como aplicación.
 *   node test/test-pwa-archivos.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'pwa-archivos.js'));
const { PwaArchivos } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

/* Un FileSystemFileHandle de mentira: solo hace falta getFile(). */
function handleDe(nombre, contenido) {
  return {
    getFile: async () => ({
      name: nombre,
      size: contenido.length,
      text: async () => contenido
    })
  };
}

/* Un handle de un archivo binario, como el gzip de un .esle2carpeta. */
function handleBinario(nombre, bytes) {
  return {
    getFile: async () => ({
      name: nombre,
      size: bytes.length,
      arrayBuffer: async () => bytes.buffer
    })
  };
}

/* ------------------------ sin la API del navegador ---------------------- */
{
  delete global.launchQueue;
  comprobar('sin launchQueue, no está disponible', PwaArchivos.disponible() === false);
  comprobar('escuchar() no rompe, y avisa que no hizo nada',
    PwaArchivos.escuchar({ onArchivo: () => {} }) === false);
}

/* ---------------------------- con la API --------------------------------- */
(async () => {
  let consumidor = null;
  global.launchQueue = { setConsumer: f => { consumidor = f; } };
  comprobar('con launchQueue, está disponible', PwaArchivos.disponible() === true);

  const recibidos = [];
  const errores = [];
  const registrado = PwaArchivos.escuchar({
    extensiones: ['.sl', '.esle2carpeta'],
    binarias: ['.esle2carpeta'],
    maxBytes: 20,
    onArchivo: (nombre, contenido) => recibidos.push({ nombre, contenido }),
    onError: msg => errores.push(msg)
  });
  comprobar('escuchar() se registra de verdad', registrado === true);
  comprobar('y guarda el consumidor', typeof consumidor === 'function');

  /* Un .sl que entra bien: texto de verdad, no bytes. */
  await consumidor({ files: [handleDe('programa.sl', 'var\ninicio\nfin')] });
  comprobar('un .sl válido llega a onArchivo', recibidos.length === 1);
  comprobar('con el nombre correcto', recibidos[0] && recibidos[0].nombre === 'programa.sl');
  comprobar('y el contenido en texto', recibidos[0] && recibidos[0].contenido === 'var\ninicio\nfin');

  /* Un .esle2carpeta: llega como Uint8Array, no como texto. */
  const bytes = new Uint8Array([1, 2, 3, 4]);
  await consumidor({ files: [handleBinario('trabajo.esle2carpeta', bytes)] });
  comprobar('un .esle2carpeta llega a onArchivo', recibidos.length === 2);
  comprobar('como Uint8Array, no como texto',
    recibidos[1] && recibidos[1].contenido instanceof Uint8Array);
  comprobar('con los mismos bytes',
    recibidos[1] && [...recibidos[1].contenido].join() === '1,2,3,4');

  /* Una extensión que no es .sl ni .esle2carpeta: rechazada, no rompe nada. */
  await consumidor({ files: [handleDe('notas.txt', 'hola')] });
  comprobar('una extensión distinta no llega a onArchivo', recibidos.length === 2);
  comprobar('y avisa con onError', errores.length === 1);

  /* Demasiado grande: también rechazado. */
  await consumidor({ files: [handleDe('grande.sl', 'x'.repeat(50))] });
  comprobar('un archivo demasiado grande no llega a onArchivo', recibidos.length === 2);
  comprobar('y también avisa', errores.length === 2);

  /* Varios archivos en un mismo lanzamiento: se procesan todos, en orden. */
  await consumidor({ files: [handleDe('a.sl', '1'), handleDe('b.sl', '2')] });
  comprobar('dos archivos válidos llegan los dos', recibidos.length === 4);
  comprobar('en el orden que llegaron',
    recibidos[2].nombre === 'a.sl' && recibidos[3].nombre === 'b.sl');

  /* Un handle que falla al leer no debe tirar abajo el consumidor entero. */
  await consumidor({ files: [{ getFile: async () => { throw new Error('roto'); } }] });
  comprobar('un archivo que no se puede leer no rompe el consumidor', errores.length === 3);

  console.log(`\n${ok} bien, ${fallos} mal`);
  assert.strictEqual(fallos, 0, 'hay fallos en js/pwa-archivos.js');
})();

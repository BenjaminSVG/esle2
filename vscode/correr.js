#!/usr/bin/env node
/*
 * Corre un programa de SLE2 desde la terminal.
 *
 *   node correr.js programa.sl
 *
 * Lo usa el comando «SLE2: Ejecutar» de la extensión, pero anda solo: sirve
 * igual para correr un ejercicio sin abrir VS Code ni el navegador.
 *
 * El intérprete es el mismo js/sle2.js del sitio. Lo único que hay que darle
 * es un «io»: de dónde lee y a dónde escribe. Acá eso es la terminal.
 */
'use strict';
const fs = require('fs');
const path = require('path');

global.window = global;
require(path.join(__dirname, 'sle2.js'));
const SLE2 = global.SLE2;

const archivo = process.argv[2];
if (!archivo) {
  console.error('Uso: node correr.js programa.sl');
  process.exit(2);
}

let fuente;
try { fuente = fs.readFileSync(archivo, 'utf8'); }
catch (e) { console.error('No se pudo leer ' + archivo + ': ' + e.message); process.exit(2); }

/* La entrada por teclado, leída de a una línea. readline en modo pregunta
   bloquea hasta que la persona escribe, que es justo lo que hace leer(). */
const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
let finEntrada = false;
rl.on('close', () => { finEntrada = true; });

const io = {
  archivos: new Map(),
  argumentos: process.argv.slice(3),
  imprimir: t => process.stdout.write(t),
  limpiar: () => process.stdout.write('\x1b[2J\x1b[H'),
  finEntrada: () => finEntrada,
  leerLinea: () => new Promise(listo => rl.question('', r => listo(r))),
  /* Los colores de SL son los 16 de siempre; se traducen a los de la terminal. */
  setColor: (texto, fondo) => {
    const c = n => (n < 8 ? 30 + n : 90 + (n - 8));
    process.stdout.write('\x1b[' + c(texto & 15) + ';' + (c(fondo & 15) + 10) + 'm');
  },
  getColor: () => ({ texto: 7, fondo: 0 }),
  setCurpos: (l, c) => process.stdout.write('\x1b[' + l + ';' + c + 'H'),
  getCurpos: () => ({ linea: 1, col: 1 }),
  getScrsize: () => ({
    lineas: process.stdout.rows || 25,
    columnas: process.stdout.columns || 80
  }),
  beep: async () => process.stdout.write('\x07'),
  leerTecla: async () => {
    const r = await io.leerLinea();
    return r.length ? r.charCodeAt(0) : 13;
  }
};

(async () => {
  try {
    await SLE2.ejecutar(SLE2.compilar(fuente), io, { archivos: new Map() });
    process.stdout.write('\x1b[0m');
    rl.close();
  } catch (e) {
    process.stdout.write('\x1b[0m\n');
    if (e instanceof SLE2.SLError) {
      /* El mismo formato que el sitio: dónde, qué, y qué hacer. */
      console.error((e.fase === 'compilacion' ? 'Error de compilación' : 'Error de ejecución')
        + (e.linea ? ' en la línea ' + e.linea : '') + ':');
      console.error('  ' + e.message);
      if (e.sugerencia) console.error('\n' + e.sugerencia);
    } else {
      console.error('Error interno: ' + e.message);
    }
    rl.close();
    process.exit(1);
  }
})();

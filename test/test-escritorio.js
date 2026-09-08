/*
 * Prueba de la prueba de escritorio.
 *
 * Lo que tiene que salir bien:
 *   · una columna por variable, en el orden en que el programa las usa;
 *   · un valor en la celda SOLO cuando cambió — si no, la tabla se vuelve
 *     ilegible y se pierde justamente lo que se quiere ver;
 *   · la salida repartida por paso, no toda junta al final;
 *   · la «i» de una subrutina y la «i» de otra en columnas distintas.
 *
 *   node test/test-escritorio.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'memoria.js'));
require(path.join(RAIZ, 'js', 'escritorio.js'));
const { Memoria, Escritorio } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle ? '  [' + detalle + ']' : ''));
}
const seccion = t => console.log('\n' + t);

const col = (t, nombre) => t.columnas.find(c => c.nombre === nombre);
const valor = (t, fila, nombre) => {
  const c = col(t, nombre);
  return c && Object.prototype.hasOwnProperty.call(fila.valores, c.id) ? fila.valores[c.id] : undefined;
};
/* Todas las veces que la columna cambió de valor, en orden. */
const historia = (t, nombre) => t.filas
  .map(f => valor(t, f, nombre)).filter(v => v !== undefined);

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('Un contador simple');
  /* ------------------------------------------------------------------ */
  {
    const CODIGO = [
      'var',
      '   n : numerico',
      '   total : numerico',
      'inicio',
      '   total = 0',
      '   desde n = 1 hasta 3',
      '   {',
      '      total = total + n',
      '   }',
      '   imprimir ("total ", total)',
      'fin',
      ''
    ].join('\n');

    const g = await Memoria.grabar(CODIGO, { maxPasos: 200 });
    comprobar('la grabación no da error', !g.error, g.error && g.error.message);
    const t = Escritorio.tabla(g.fotos, { codigo: CODIGO });

    comprobar('hay dos columnas', t.columnas.length === 2, t.columnas.map(c => c.nombre).join());
    comprobar('en el orden en que el programa las usa',
      t.columnas.map(c => c.nombre).join() === 'n,total', t.columnas.map(c => c.nombre).join());
    comprobar('las dos son globales', t.columnas.every(c => c.ambito === 'global'));

    comprobar('hay una fila por paso', t.filas.length === g.fotos.length,
      t.filas.length + ' vs ' + g.fotos.length);
    comprobar('cada fila trae el código de su línea',
      t.filas.some(f => /total = total \+ n/.test(f.codigo)),
      t.filas.map(f => f.linea).join());

    /* total: 0 y después 1, 3, 6. */
    comprobar('total cambia cuatro veces', historia(t, 'total').join() === '0,1,3,6',
      historia(t, 'total').join());
    /* n: 1, 2, 3 y el 4 con el que sale del ciclo. */
    comprobar('n recorre el ciclo', historia(t, 'n').join() === '0,1,2,3,4',
      historia(t, 'n').join());

    /* Lo que NO cambió no se repite: ese es el punto de la tabla. */
    const repetidos = t.filas.filter(f => Object.keys(f.valores).length === 0).length;
    comprobar('hay filas sin ningún cambio (no se repite lo que no cambió)', repetidos > 0,
      String(repetidos));

    const conSalida = t.filas.filter(f => f.salida);
    comprobar('la salida sale en un solo paso', conSalida.length === 1,
      JSON.stringify(t.filas.map(f => f.salida)));
    comprobar('y es la del imprimir', conSalida[0] && /total 6/.test(conSalida[0].salida),
      conSalida[0] && JSON.stringify(conSalida[0].salida));
  }

  /* ------------------------------------------------------------------ */
  seccion('Dos subrutinas con una «i» cada una');
  /* ------------------------------------------------------------------ */
  {
    const CODIGO = [
      'inicio',
      '   una ()',
      '   otra ()',
      'fin',
      '',
      'subrutina una ()',
      'var',
      '   i : numerico',
      'inicio',
      '   i = 10',
      'fin',
      '',
      'subrutina otra ()',
      'var',
      '   i : numerico',
      'inicio',
      '   i = 99',
      'fin',
      ''
    ].join('\n');

    const g = await Memoria.grabar(CODIGO, { maxPasos: 200 });
    comprobar('corre sin error', !g.error, g.error && g.error.message);
    const t = Escritorio.tabla(g.fotos, { codigo: CODIGO });

    comprobar('la i de una() lleva su nombre adelante', !!col(t, 'una.i'),
      t.columnas.map(c => c.nombre).join());
    comprobar('y la de otra() también', !!col(t, 'otra.i'),
      t.columnas.map(c => c.nombre).join());
    comprobar('son columnas distintas',
      col(t, 'una.i') && col(t, 'otra.i') && col(t, 'una.i').id !== col(t, 'otra.i').id);
    comprobar('marcadas como locales',
      col(t, 'una.i').ambito === 'local' && col(t, 'otra.i').ambito === 'local');
    comprobar('la primera llega a 10', historia(t, 'una.i').map(String).includes('10'),
      historia(t, 'una.i').join());
    comprobar('la segunda a 99', historia(t, 'otra.i').map(String).includes('99'),
      historia(t, 'otra.i').join());
    comprobar('y alguna fila avisa que se liberó una caja',
      t.filas.some(f => f.liberadas.length > 0),
      t.filas.map(f => f.liberadas.length).join());
  }

  /* ------------------------------------------------------------------ */
  seccion('Las tres exportaciones');
  /* ------------------------------------------------------------------ */
  {
    const CODIGO = 'var\n   a : numerico\ninicio\n   a = 1\n   imprimir ("x, y")\nfin\n';
    const g = await Memoria.grabar(CODIGO, { maxPasos: 50 });
    const t = Escritorio.tabla(g.fotos, { codigo: CODIGO });

    const csv = Escritorio.aCSV(t);
    const primeraCSV = csv.split('\n')[0];
    comprobar('el CSV empieza por la cabecera',
      primeraCSV === 'Paso,Línea,Sentencia,a,Salida', primeraCSV);
    comprobar('el CSV tiene una línea por fila más la cabecera',
      csv.trim().split('\n').length === t.filas.length + 1,
      csv.trim().split('\n').length + ' vs ' + (t.filas.length + 1));
    comprobar('y entrecomilla lo que lleva una coma adentro',
      /"x, y"/.test(csv), csv);

    const md = Escritorio.aMarkdown(t);
    comprobar('el Markdown trae la fila de guiones',
      /\|\s*---\s*\|/.test(md.split('\n')[1]), md.split('\n')[1]);
    comprobar('y una fila por paso',
      md.trim().split('\n').length === t.filas.length + 2,
      md.trim().split('\n').length + '');

    const txt = Escritorio.aTexto(t);
    const anchos = txt.trim().split('\n').map(l => l.length);
    comprobar('el texto queda alineado en columnas',
      anchos.length > 2 && new Set(anchos.slice(0, 2)).size === 1,
      anchos.join());
    comprobar('los saltos de línea de la salida no rompen la tabla',
      !/\n/.test(txt.split('\n').find(l => /Salida/.test(l)) || ''), 'cabecera partida');
  }

  /* ------------------------------------------------------------------ */
  seccion('Casos de borde');
  /* ------------------------------------------------------------------ */
  {
    const vacia = Escritorio.tabla([], {});
    comprobar('sin fotos no explota', vacia.filas.length === 0 && vacia.columnas.length === 0);
    comprobar('y se exporta igual', typeof Escritorio.aCSV(vacia) === 'string');

    const g = await Memoria.grabar('inicio\nfin\n', { maxPasos: 20 });
    const t = Escritorio.tabla(g.fotos, { codigo: 'inicio\nfin\n' });
    comprobar('un programa vacío no inventa columnas', t.columnas.length === 0,
      t.columnas.map(c => c.nombre).join());

    /* Las constantes que crea el intérprete no son variables del programa. */
    const g2 = await Memoria.grabar('var\n   b : logico\ninicio\n   b = TRUE\nfin\n', { maxPasos: 50 });
    const t2 = Escritorio.tabla(g2.fotos, {});
    comprobar('TRUE y FALSE no aparecen como columnas',
      !t2.columnas.some(c => ['TRUE', 'FALSE', 'SI', 'NO'].includes(c.nombre)),
      t2.columnas.map(c => c.nombre).join());
    comprobar('pero la variable lógica sí', !!col(t2, 'b'), t2.columnas.map(c => c.nombre).join());
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'la prueba de escritorio tiene fallos');
})();

/*
 * Prueba del traductor a JavaScript: cada programa se corre con el intérprete
 * de ESLE2 y también traducido y ejecutado como JavaScript. Las dos salidas
 * tienen que coincidir.
 *   node test/test-traductor.js
 */
'use strict';
const path = require('path');
const fs = require('fs');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'traducir.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
const { SLE2, TraductorJS, CURSO } = global;

let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };
const norm = t => t.replace(/\r/g, '').split('\n').map(l => l.trimEnd()).filter(l => l !== '').join('\n');

function io(entrada, salida) {
  const lineas = entrada.length ? entrada.replace(/\r/g, '').split('\n') : [];
  return {
    archivos: new Map(), argumentos: [],
    imprimir: t => salida.push(t),
    limpiar: () => (salida.length = 0),
    finEntrada: () => lineas.length === 0,
    leerLinea: async () => (lineas.length ? lineas.shift() : null),
    beep: async () => {}, leerTecla: async () => 0
  };
}

async function conInterprete(fuente, entrada) {
  const salida = [];
  await SLE2.ejecutar(fuente, io(entrada || '', salida), { maxPasos: 4000000 });
  return salida.join('');
}

/* Ejecuta el JavaScript generado capturando lo que imprime. */
function conJS(codigo) {
  let impreso = '';
  const consola = { log: t => { impreso += t; } };
  new Function('console', codigo)(consola);
  return impreso;
}

const CASOS = [
  ['saludo', ['inicio', '   imprimir ("Hola, mundo!")', 'fin'].join('\n'), ''],

  ['leer y calcular', ['var', '   a, b : numerico', 'inicio', '   leer (a, b)',
    '   imprimir (a + b, " ", a * b)', 'fin'].join('\n'), '3,5'],

  ['si / sino', ['var', '   n = 0', 'inicio', '   leer (n)', '   si ( n % 2 == 0 )', '   {',
    '      imprimir ("par")', '   sino', '      imprimir ("impar")', '   }', 'fin'].join('\n'), '7'],

  ['ciclo desde con paso', ['var', '   k, s : numerico', 'inicio', '   s = 0',
    '   desde k=10 hasta 1 paso -2', '   {', '      s = s + k', '   }', '   imprimir (s)', 'fin'].join('\n'), ''],

  ['mientras y repetir', ['var', '   n = 5', '   t = 0', 'inicio', '   mientras ( n > 0 )', '   {',
    '      t = t + n', '      n = n - 1', '   }', '   repetir', '      t = t + 1',
    '   hasta ( t > 20 )', '   imprimir (t)', 'fin'].join('\n'), ''],

  ['vector y alen', ['var', '   A : vector [5] numerico', '   k, s : numerico', 'inicio',
    '   desde k=1 hasta 5', '   {', '      A [k] = k * k', '   }', '   s = 0',
    '   desde k=1 hasta alen (A)', '   {', '      s = s + A [k]', '   }',
    '   imprimir (s, " ", A [3])', 'fin'].join('\n'), ''],

  ['vector abierto con dim', ['var', '   v : vector [*] numerico', '   n, k : numerico', 'inicio',
    '   leer (n)', '   dim (v, n)', '   desde k=1 hasta n', '   {', '      v [k] = k',
    '   }', '   imprimir (alen (v), " ", v [n])', 'fin'].join('\n'), '4'],

  ['cadenas', ['var', '   t = ""', 'inicio', '   leer (t)',
    '   imprimir (strlen (t), " ", upper (t), " ", substr (t, 2, 3), " ", pos ("la", t))', 'fin'].join('\n'), 'hola mundo'],

  ['leer mezclando texto y numero', ['var', '   nombre = ""', '   edad = 0', 'inicio',
    '   leer (nombre, edad)', '   imprimir (nombre, " tiene ", edad)', 'fin'].join('\n'), 'Ana,17'],

  ['registro', ['tipos', '   FECHA : registro', '   {', '      dia, mes : numerico', '   }',
    'var', '   f : FECHA', 'inicio', '   f.dia = 24', '   f.mes = 12',
    '   imprimir (f.dia, "/", f.mes)', 'fin'].join('\n'), ''],

  ['funcion recursiva', ['var', '   n = 0', 'inicio', '   leer (n)', '   imprimir (fact (n))', 'fin', '',
    'subrutina fact (n : numerico) retorna numerico', 'inicio', '   si ( n <= 1 ) { retorna (1) }',
    '   retorna ( n * fact (n - 1) )', 'fin'].join('\n'), '6'],

  ['parametro por referencia', ['var', '   a = 3', '   b = 8', 'inicio', '   poner (a, 99)',
    '   intercambiar (a, b)', '   imprimir (a, " ", b)', 'fin', '',
    'subrutina poner (ref x : numerico; v : numerico)', 'inicio', '   x = v', 'fin'].join('\n'), ''],

  ['vector por referencia', ['var', '   A : vector [3] numerico', 'inicio', '   cargar (A)',
    '   imprimir (A [1], A [2], A [3])', 'fin', '',
    'subrutina cargar (ref v : vector [*] numerico)', 'var', '   k : numerico', 'inicio',
    '   desde k=1 hasta alen (v) { v [k] = k * 2 }', 'fin'].join('\n'), ''],

  ['eval con casos', ['var', '   n = 0', 'inicio', '   leer (n)', '   eval', '   {',
    '      caso ( n < 0 )  imprimir ("negativo")', '      caso ( n == 0 )  imprimir ("cero")',
    '      sino  imprimir ("positivo")', '   }', 'fin'].join('\n'), '-4'],

  ['str y decimales', ['var', '   x = 0', 'inicio', '   leer (x)',
    '   imprimir (str (x / 3, 0, 2), "|", str (x, 6, 0), "|")', 'fin'].join('\n'), '10'],

  ['literal de vector', ['var', '   billetes : vector [6] numerico', '   k, m : numerico', 'inicio',
    '   billetes = {100000, 50000, 20000, 10000, 5000, 2000}', '   leer (m)',
    '   desde k=1 hasta alen (billetes)', '   {',
    '      imprimir (int (m / billetes [k]), " ")', '   }', 'fin'].join('\n'), '287500'],

  ['literal con relleno', ['var', '   F : vector [5] numerico', '   k : numerico', 'inicio',
    '   F = {7, ...}', '   desde k=1 hasta 5', '   {', '      imprimir (F [k], " ")', '   }',
    '   imprimir ("|")', 'fin'].join('\n'), ''],

  ['literal de registro', ['tipos', '   PUNTO : registro', '   {', '      x, y : numerico', '   }',
    'var', '   p : PUNTO', 'inicio', '   p = {3, 4}', '   imprimir (p.x + p.y)', 'fin'].join('\n'), ''],

  ['matriz', ['var', '   M : matriz [2, 3] numerico', '   f, c, s : numerico', 'inicio',
    '   desde f=1 hasta 2', '   {', '      desde c=1 hasta 3', '      {', '         M [f, c] = f * c',
    '      }', '   }', '   s = 0', '   desde f=1 hasta 2', '   {', '      desde c=1 hasta 3', '      {',
    '         s = s + M [f, c]', '      }', '   }', '   imprimir (s, " ", M [2, 3])', 'fin'].join('\n'), '']
];

(async () => {
  console.log('— El JavaScript traducido imprime lo mismo que ESLE2 —');
  for (const [nombre, fuente, entrada] of CASOS) {
    let esperado, obtenido;
    try { esperado = await conInterprete(fuente, entrada); }
    catch (e) { falla(nombre, 'el intérprete falló: ' + e.message); continue; }

    let traduccion;
    try { traduccion = TraductorJS.aJS(SLE2.compilar(fuente), { entrada }); }
    catch (e) { falla(nombre, 'el traductor falló: ' + e.message); continue; }

    if (traduccion.avisos.length) {
      falla(nombre, 'avisos inesperados: ' + traduccion.avisos.map(a => a.texto).join('; '));
      continue;
    }
    try { obtenido = conJS(traduccion.codigo); }
    catch (e) {
      falla(nombre, 'el JavaScript generado no corre: ' + e.message + '\n--- código ---\n' + traduccion.codigo);
      continue;
    }
    if (norm(obtenido) === norm(esperado)) ok++;
    else falla(nombre, `ESLE2 imprime ${JSON.stringify(norm(esperado))} y el JS ${JSON.stringify(norm(obtenido))}`
      + '\n--- código ---\n' + traduccion.codigo);
  }

  console.log('— Los ejercicios del curso se traducen sin romperse —');
  for (const ej of CURSO.EJERCICIOS) {
    try {
      const ast = SLE2.compilar(ej.plantilla);
      const { codigo } = TraductorJS.aJS(ast, { entrada: ej.pruebas[0].entrada });
      new Function('console', codigo);          // que al menos sea JavaScript válido
      ok++;
    } catch (e) {
      if (e instanceof SLE2.SLError) { ok++; continue; }   // plantillas incompletas a propósito
      falla('plantilla ' + ej.id, e.message);
    }
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  if (fallos) process.exit(1);
})();

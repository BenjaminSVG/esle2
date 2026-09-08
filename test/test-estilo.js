/*
 * Prueba del revisor de estilo (js/estilo.js).
 *
 * Cada caso dice qué aviso tiene que aparecer; los casos "limpios" comprueban
 * lo más importante: que un programa bien escrito no reciba ningún aviso.
 *   node test/test-estilo.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'estilo.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
const { SLE2, Estilo, CURSO } = global;

let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };

const avisosDe = fuente => Estilo.revisar(SLE2.compilar(fuente));

function esperaAviso(nombre, fuente, fragmento) {
  let av;
  try { av = avisosDe(fuente); } catch (e) { falla(nombre, 'no compila: ' + e.message); return; }
  const hay = av.some(a => a.mensaje.includes(fragmento));
  if (hay && av.every(a => a.sugerencia)) ok++;
  else falla(nombre, hay ? 'un aviso quedó sin recomendación' : `no avisó "${fragmento}"; dijo: ${av.map(a => a.mensaje).join(' | ') || '(nada)'}`);
}

function sinAvisos(nombre, fuente) {
  let av;
  try { av = avisosDe(fuente); } catch (e) { falla(nombre, 'no compila: ' + e.message); return; }
  if (!av.length) ok++;
  else falla(nombre, 'avisó de más: ' + av.map(a => `línea ${a.linea}: ${a.mensaje}`).join(' | '));
}

const L = (...lineas) => lineas.join('\n');

/* --------------------------- lo que debe avisar --------------------------- */
esperaAviso('variable que solo se escribe',
  L('var', '   total = 0', '   sobra = 0', 'inicio', '   total = 5', '   sobra = total * 2',
    '   imprimir (total)', 'fin'),
  'nunca se lee');

esperaAviso('comparar con TRUE',
  L('var', '   listo = FALSE', 'inicio', '   listo = TRUE',
    '   si ( listo == TRUE ) { imprimir ("va") }', 'fin'),
  'no hace falta comparar con TRUE');

/* La recomendación tiene que decir cuál de las dos formas corresponde. */
function esperaRecomendacion(nombre, fuente, fragmentoMensaje, fragmentoSugerencia) {
  let av;
  try { av = avisosDe(fuente); } catch (e) { falla(nombre, 'no compila: ' + e.message); return; }
  const a = av.find(x => x.mensaje.includes(fragmentoMensaje));
  if (a && a.sugerencia.includes(fragmentoSugerencia)) ok++;
  else falla(nombre, a ? `la recomendación dice: ${a.sugerencia}` : 'no avisó nada');
}

esperaRecomendacion('== TRUE se escribe sin negación',
  L('var', '   listo = FALSE', 'inicio', '   listo = TRUE',
    '   si ( listo == TRUE ) { imprimir ("va") }', 'fin'),
  'comparar con TRUE', 'si ( bandera )');

esperaRecomendacion('== FALSE se escribe con not',
  L('var', '   listo = FALSE', 'inicio', '   listo = TRUE',
    '   si ( listo == FALSE ) { imprimir ("va") }', 'fin'),
  'comparar con FALSE', 'not bandera');

esperaRecomendacion('<> FALSE se escribe sin negación',
  L('var', '   listo = FALSE', 'inicio', '   listo = TRUE',
    '   si ( listo <> FALSE ) { imprimir ("va") }', 'fin'),
  'comparar con FALSE', 'si ( bandera )');

esperaAviso('si que solo asigna un lógico',
  L('var', '   n = 0', '   par = FALSE', 'inicio', '   leer (n)',
    '   si ( n % 2 == 0 )', '   {', '      par = TRUE', '   sino', '      par = FALSE', '   }',
    '   imprimir (par)', 'fin'),
  'se puede escribir en una línea');

esperaAviso('condición constante',
  L('inicio', '   si ( 2 > 1 ) { imprimir ("siempre") }', 'fin'),
  'no depende de ninguna variable');

esperaAviso('bloque vacío',
  L('var', '   n = 0', 'inicio', '   leer (n)', '   si ( n > 0 )', '   {', '   }',
    '   imprimir (n)', 'fin'),
  'está vacío');

esperaAviso('código después de retorna',
  L('inicio', '   imprimir (doble (2))', 'fin', '',
    'subrutina doble (n : numerico) retorna numerico', 'inicio', '   retorna ( n * 2 )',
    '   imprimir ("nunca")', 'fin'),
  'nunca se va a ejecutar');

esperaAviso('tocar la variable del desde',
  L('var', '   k, s : numerico', 'inicio', '   desde k=1 hasta 10', '   {', '      s = s + k',
    '      k = k + 1', '   }', '   imprimir (s)', 'fin'),
  'su propia variable');

esperaAviso('número mágico repetido',
  L('var', '   a, b, c : numerico', 'inicio', '   a = 365 * 2', '   b = 365 + a', '   c = b / 365',
    '   imprimir (c)', 'fin'),
  'aparece 3 veces');

esperaAviso('una letra sola para un texto',
  L('var', '   t = ""', 'inicio', '   leer (t)',
    '   imprimir (t, t, t, t, t, t, t, t, t)', 'fin'),
  'su nombre no dice cuál');

/* ------------------------- lo que NO debe avisar -------------------------- */
sinAvisos('programa limpio',
  L('var', '   n, suma, k : numerico', 'inicio', '   leer (n)', '   suma = 0',
    '   desde k=1 hasta n', '   {', '      suma = suma + k', '   }',
    '   imprimir ("suma ", suma)', 'fin'));

sinAvisos('lógico usado como condición',
  L('var', '   encontrado = FALSE', '   k, n : numerico', 'inicio', '   leer (n)',
    '   desde k=1 hasta n', '   {', '      si ( k == n ) { encontrado = TRUE }', '   }',
    '   si ( encontrado ) { imprimir ("si") sino imprimir ("no") }', 'fin'));

sinAvisos('ciclo mientras TRUE con terminar',
  L('var', '   n = 0', 'inicio', '   mientras ( TRUE )', '   {', '      leer (n)',
    '      si ( n == 0 ) { terminar () }', '      imprimir (n, " ")', '   }', 'fin'));

sinAvisos('contadores de una letra',
  L('var', '   M : matriz [3, 3] numerico', '   f, c : numerico', 'inicio',
    '   desde f=1 hasta 3', '   {', '      desde c=1 hasta 3', '      {', '         M [f, c] = f * c',
    '      }', '   }', '   imprimir (M [3, 3])', 'fin'));

/* ------------------- las soluciones del curso están limpias ---------------- */
{
  const SOLUCIONES = require(path.join(__dirname, 'soluciones-curso.js'));
  let conAvisos = 0;
  for (const [id, fuente] of Object.entries(SOLUCIONES)) {
    let av;
    try { av = avisosDe(fuente); } catch (e) { falla('solución ' + id, e.message); continue; }
    if (!av.length) { ok++; continue; }
    conAvisos++;
    console.log(`  · ${id}: ${av.map(a => a.mensaje).join(' | ')}`);
  }
  console.log(`  (${conAvisos} solución(es) del curso reciben algún aviso de estilo)`);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay pruebas fallidas');

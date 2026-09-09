/*
 * Prueba de «otra forma de resolverlo».
 *
 * Dos cosas: que el archivo de soluciones que ve el navegador sea el mismo
 * que usan las pruebas —si se desincronizan, el alumno compara contra algo
 * que ya no es la solución—, y que la comparación no le diga a nadie que su
 * programa está mal cuando funciona.
 *
 *   node test/test-otra-forma.js
 */
'use strict';
const path = require('path');
const assert = require('assert');
const { execFileSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'otra-forma.js'));
const { OtraForma } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);

seccion('El archivo del navegador no se desincroniza');
{
  try {
    const salida = execFileSync(process.execPath,
      [path.join(RAIZ, 'tools', 'generar-soluciones.js'), '--revisar'], { encoding: 'utf8' });
    comprobar('js/soluciones.js está al día', true);
    console.log('  ' + salida.trim());
  } catch (e) {
    comprobar('js/soluciones.js está al día', false, String(e.stderr || e.message).trim());
  }

  /* Las mismas 50, con el mismo contenido. */
  const delTest = require(path.join(RAIZ, 'test', 'soluciones-curso.js'));
  require(path.join(RAIZ, 'js', 'soluciones.js'));
  const delNavegador = global.ESLE2Soluciones;
  comprobar('están las mismas',
    Object.keys(delTest).length === Object.keys(delNavegador).length,
    Object.keys(delTest).length + ' vs ' + Object.keys(delNavegador).length);
  const distintas = Object.keys(delTest).filter(id => delTest[id] !== delNavegador[id]);
  comprobar('y son idénticas', distintas.length === 0, distintas.join(', '));
  comprobar('son las 50 del curso', Object.keys(delNavegador).length === 50,
    Object.keys(delNavegador).length);
}

seccion('Contar líneas de código');
{
  const contar = OtraForma.lineasDeCodigo;
  comprobar('las vacías no cuentan', contar('inicio\n\n\nfin') === 2);
  comprobar('los comentarios tampoco',
    contar('/* hola */\ninicio\n// nada\nfin') === 2, contar('/* hola */\ninicio\n// nada\nfin'));
  comprobar('la indentación no importa', contar('  inicio  \n    fin  ') === 2);
  comprobar('vacío da cero', contar('') === 0);
  comprobar('nada da cero', contar(null) === 0);
}

seccion('La comparación no reta a nadie');
{
  const larga = 'inicio\na\nb\nc\nd\nfin';
  const corta = 'inicio\na\nfin';

  const masLarga = OtraForma.comparar(larga, corta);
  comprobar('cuenta las dos', masLarga.lineasMias === 6 && masLarga.lineasDeLaCatedra === 3,
    masLarga.lineasMias + '/' + masLarga.lineasDeLaCatedra);
  comprobar('dice que más corto no es mejor', /no es mejor/.test(masLarga.frase), masLarga.frase);
  comprobar('no dice que esté mal',
    !/(mal|incorrect|error|peor)/i.test(masLarga.frase), masLarga.frase);

  const masCorta = OtraForma.comparar(corta, larga);
  comprobar('si la del alumno es más corta, tampoco lo felicita de más',
    /fijate/.test(masCorta.frase), masCorta.frase);
  comprobar('y no lo reta', !/(mal|incorrect|peor)/i.test(masCorta.frase), masCorta.frase);

  const igual = OtraForma.comparar(larga, larga);
  comprobar('dos iguales se notan', igual.iguales === true);
  comprobar('y se dice que empatan', /Las dos tienen 6/.test(igual.frase), igual.frase);

  comprobar('sin código no inventa una frase',
    OtraForma.comparar('', larga).frase === '');
}

seccion('Buscar una solución');
{
  comprobar('hay para el primer ejercicio', OtraForma.hayPara('f1'));
  comprobar('y no para uno inventado', !OtraForma.hayPara('zz99'));
}

seccion('Las soluciones son programas de verdad');
{
  /* Que compilen. Mostrarle al alumno una «solución» que no compila sería
     peor que no mostrarle nada. */
  require(path.join(RAIZ, 'js', 'sle2.js'));
  const rotas = [];
  for (const id of Object.keys(global.ESLE2Soluciones)) {
    try { global.SLE2.compilar(global.ESLE2Soluciones[id]); }
    catch (e) { rotas.push(id + ': ' + e.message); }
  }
  comprobar('las 50 compilan', rotas.length === 0, rotas.slice(0, 3).join(' | '));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, '«otra forma» tiene fallos');

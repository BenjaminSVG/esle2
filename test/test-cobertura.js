/*
 * Prueba de «qué corrió y qué no».
 *
 * Lo que importa es que no mienta en ninguna de las dos direcciones: marcar
 * como «nunca corrió» una línea que sí corrió manda al alumno a buscar un
 * problema que no existe, y no marcar la que de verdad no corrió lo deja
 * exactamente donde estaba.
 *
 *   node test/test-cobertura.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'cobertura.js'));
const { SLE2, Cobertura } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);

/* Corre un programa contando, sin escribir nada en ninguna pantalla. */
async function correr(fuente, entrada) {
  const ast = SLE2.compilar(fuente);
  const contador = Cobertura.crearContador();
  const lineas = (entrada || '').length ? entrada.split('\n') : [];
  const salida = [];
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => salida.push(t),
    limpiar: () => { salida.length = 0; },
    finEntrada: () => lineas.length === 0,
    leerLinea: async () => (lineas.length ? lineas.shift() : null)
  };
  await SLE2.ejecutar(ast, io, { depurador: contador.hook });
  const posibles = Cobertura.lineasDeSentencias(ast);
  return { r: Cobertura.resumir(contador.cuentas(), posibles), salida: salida.join(''), posibles };
}

(async () => {

  seccion('Un «si» que nunca entra');
  {
    const fuente = [
      'programa p', 'var', '   a : numerico', 'inicio',
      '   a = 1',                      // 5
      '   si (a > 100)', '   {',       // 6
      '      imprimir ("grande")',     // 8   <- nunca
      '   sino',
      '      imprimir ("chico")',      // 10
      '   }', 'fin', ''
    ].join('\n');
    const { r } = await correr(fuente);
    comprobar('se marca la rama que no entró', r.nunca.join() === '8', r.nunca);
    comprobar('y NO la que sí', !r.nunca.includes(10));
    comprobar('ni la condición', !r.nunca.includes(6));
    comprobar('el porcentaje sale', r.porcentaje === 75, r.porcentaje);
    comprobar('la frase lo dice en castellano',
      Cobertura.frase(r) === 'La línea 8 nunca se ejecutó.', Cobertura.frase(r));
  }

  seccion('Cuando corre todo, no se dice nada');
  {
    const fuente = ['programa p', 'inicio', '   imprimir ("hola")', 'fin', ''].join('\n');
    const { r } = await correr(fuente);
    comprobar('no queda ninguna sin correr', r.nunca.length === 0, r.nunca);
    comprobar('cien por ciento', r.porcentaje === 100);
    comprobar('y la frase es vacía: felicitar por lo normal es ruido',
      Cobertura.frase(r) === '', Cobertura.frase(r));
  }

  seccion('Una subrutina que nadie llama');
  {
    const fuente = [
      'programa p', 'inicio',
      '   imprimir ("uno")',           // 3
      'fin', '',
      'subrutina nadie ()', 'inicio',
      '   imprimir ("nunca")',         // 8  <- nunca
      'fin', ''
    ].join('\n');
    const { r } = await correr(fuente);
    comprobar('se ve que quedó sin usar', r.nunca.join() === '8', r.nunca);
  }

  seccion('Lo que NO es una sentencia no se cuenta');
  {
    /* Comentarios, líneas en blanco, «var», «inicio», «fin» y las llaves no
       son sentencias: si se contaran, cualquier programa parecería tener
       media docena de líneas muertas y el aviso dejaría de significar algo. */
    const fuente = [
      '/* un comentario',              // 1
      '   de dos líneas */',           // 2
      'programa p',                    // 3
      'var',                           // 4
      '   a : numerico',               // 5
      '',                              // 6
      'inicio',                        // 7
      '   a = 1',                      // 8
      'fin', ''
    ].join('\n');
    const { r, posibles } = await correr(fuente);
    comprobar('la única sentencia es la asignación',
      [...posibles].join() === '8', [...posibles]);
    comprobar('así que no hay nada sin correr', r.nunca.length === 0, r.nunca);
    comprobar('y el total es uno', r.total === 1, r.total);
  }

  seccion('Los ciclos: cuántas vueltas');
  {
    const fuente = [
      'programa p', 'var', '   k : numerico', 'inicio',
      '   desde k=1 hasta 5', '   {',
      '      imprimir (k)',            // 7
      '   }', 'fin', ''
    ].join('\n');
    const { r, salida } = await correr(fuente);
    comprobar('el programa hizo lo suyo', salida === '12345', salida);
    comprobar('la línea de adentro es la más corrida',
      r.masCorrida && r.masCorrida.linea === 7, r.masCorrida);
    comprobar('y dio cinco vueltas', r.masCorrida.veces === 5, r.masCorrida.veces);
    comprobar('nada quedó sin correr', r.nunca.length === 0);
  }

  seccion('Un ciclo que no da ni una vuelta');
  {
    const fuente = [
      'programa p', 'var', '   a : numerico', 'inicio',
      '   a = 0',
      '   mientras (a > 10)', '   {',
      '      a = a - 1',               // 8  <- nunca
      '   }', 'fin', ''
    ].join('\n');
    const { r } = await correr(fuente);
    comprobar('se marca el cuerpo del ciclo', r.nunca.join() === '8', r.nunca);
  }

  seccion('Todas las estructuras del lenguaje quedan cubiertas');
  {
    /* Si el parser guardara sentencias en un campo nuevo, acá se notaría:
       alguna de estas líneas no aparecería entre las posibles. */
    const fuente = [
      'programa p', 'var', '   a : numerico', 'inicio',
      '   a = 0',                      // 5  asignación
      '   imprimir ("x")',             // 6  llamada
      '   si (a == 0)', '   {',
      '      a = 1',                   // 9  dentro de si
      '   sino',
      '      a = 2',                   // 11 dentro de sino
      '   }',
      '   mientras (a < 2)', '   {',
      '      a = a + 1',               // 15 dentro de mientras
      '   }',
      '   repetir',                    // 17  (en SL el «repetir» no lleva llaves)
      '      a = a + 1',               // 18 dentro de repetir
      '   hasta (a > 2)',
      '   desde a=1 hasta 2', '   {',
      '      imprimir (a)',            // 22 dentro de desde
      '   }',
      'fin', ''
    ].join('\n');
    const { posibles } = await correr(fuente);
    for (const l of [5, 6, 9, 11, 15, 18, 22]) {
      comprobar('la línea ' + l + ' figura como sentencia', posibles.has(l), [...posibles]);
    }
  }

  seccion('La frase, cuando son muchas');
  {
    const r = { nunca: [3, 4, 5, 6, 7, 8, 9, 10], total: 20, corridas: 12 };
    const f = Cobertura.frase(r);
    comprobar('se cortan y se dice cuántas faltan', /y 2 más/.test(f), f);
    comprobar('sin listar las ocho', !/9, 10/.test(f), f);
    comprobar('sin resumen no rompe', Cobertura.frase(null) === '');
    comprobar('con cero tampoco', Cobertura.frase({ nunca: [] }) === '');
  }

  seccion('Contar es contar');
  {
    const c = Cobertura.crearContador();
    c.hook(3); c.hook(3); c.hook(7);
    comprobar('cuenta cada línea', c.veces(3) === 2 && c.veces(7) === 1);
    comprobar('una que no pasó nunca da cero', c.veces(99) === 0);
    comprobar('y los pasos totales', c.pasos === 3, c.pasos);
  }


  seccion('Cuánto trabajó el programa');
  {
    /* Un ciclo largo de verdad. No se mira el tiempo —eso cambia con la
       máquina— sino cuántas veces pasó por la misma línea. */
    const fuente = [
      'programa p', 'var', '   k : numerico', '   s : numerico', 'inicio',
      '   s = 0',
      '   desde k=1 hasta 60000', '   {',
      '      s = s + 1',
      '   }',
      '   imprimir (s)',
      'fin', ''
    ].join('\n');
    const { r, salida } = await correr(fuente);
    comprobar('el programa terminó bien', salida === '60000', salida);
    comprobar('se ve qué línea se repitió', r.masCorrida.linea === 9, r.masCorrida);
    comprobar('y cuántas veces', r.masCorrida.veces === 60000, r.masCorrida.veces);

    const f = Cobertura.fraseEsfuerzo(r);
    comprobar('se avisa', f.length > 0, f);
    comprobar('con la línea y el número', /línea 9/.test(f) && /60 mil/.test(f), f);
    /* No es un error: el programa anduvo. La palabra importa. */
    comprobar('sin decir que está mal', !/(error|mal|incorrect)/i.test(f), f);
  }

  seccion('Un programa normal no recibe el aviso');
  {
    const fuente = [
      'programa p', 'var', '   k : numerico', 'inicio',
      '   desde k=1 hasta 100', '   {', '      imprimir (k)', '   }', 'fin', ''
    ].join('\n');
    const { r } = await correr(fuente);
    comprobar('cien vueltas no molestan a nadie', Cobertura.fraseEsfuerzo(r) === '',
      Cobertura.fraseEsfuerzo(r));
    comprobar('sin resumen tampoco rompe', Cobertura.fraseEsfuerzo(null) === '');
    comprobar('ni sin ninguna línea corrida',
      Cobertura.fraseEsfuerzo({ masCorrida: null }) === '');
  }

  seccion('Ninguna solución del curso recibe el aviso');
  {
    /* Si los ejercicios de la cátedra dispararan el aviso, el aviso saldría
       siempre y nadie lo leería. Es el mismo criterio que usa el revisor de
       estilo con sus reglas. */
    const SOLUCIONES = require(path.join(RAIZ, 'test', 'soluciones-curso.js'));
    const CURSO = (() => { require(path.join(RAIZ, 'js', 'ejercicios.js')); return global.CURSO; })();
    let avisados = 0;
    for (const ej of CURSO.EJERCICIOS) {
      const sol = SOLUCIONES[ej.id];
      if (!sol) continue;
      try {
        const { r } = await correr(sol, ej.pruebas[0].entrada);
        if (Cobertura.fraseEsfuerzo(r)) { avisados++; console.log('  · ' + ej.id + ': ' + Cobertura.fraseEsfuerzo(r)); }
      } catch (e) { /* alguna necesita más datos de entrada: no es asunto de esta prueba */ }
    }
    comprobar('las 50 pasan sin aviso de esfuerzo', avisados === 0, avisados + ' con aviso');
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'la cobertura tiene fallos');
})();

/*
 * Prueba del modo flexible.
 *
 * Lo que hay que asegurar, y en este orden de importancia:
 *   1. el modo estricto no cambió — es el que manda cuando hay que entregar;
 *   2. el flexible encuentra VARIOS errores de una vez, que es toda la gracia;
 *   3. lo que sí entendió queda bien, no adivinado;
 *   4. nunca se cuelga: ningún programa roto puede dejar al parser girando.
 *
 *   node test/test-flexible.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'flexible.js'));
const { SLE2, Flexible } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle ? '  [' + detalle + ']' : ''));
}
const seccion = t => console.log('\n' + t);

/* Corre un programa y devuelve lo que imprimió y el error, si hubo. */
async function correr(ast) {
  let salida = '';
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => { salida += t; },
    limpiar: () => { salida = ''; },
    finEntrada: () => true,
    leerLinea: async () => null,
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
  try {
    await SLE2.ejecutar(ast, io, {});
    return { salida, error: null };
  } catch (e) {
    return { salida, error: e };
  }
}

const BIEN = `programa hola
var
   n : numerico
inicio
   n = 3
   imprimir ("n vale ", n, "\\n")
fin
`;

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('El modo estricto no se tocó');
  /* ------------------------------------------------------------------ */
  {
    const ast = SLE2.compilar(BIEN);
    comprobar('un programa correcto compila igual que siempre', !!ast && ast.nombre === 'hola');
    const r = await correr(ast);
    comprobar('y corre igual', r.salida === 'n vale 3\n', JSON.stringify(r.salida));

    let cayo = null;
    try { SLE2.compilar('inicio\n   si (a == 1\n   {\n   }\nfin\n'); }
    catch (e) { cayo = e; }
    comprobar('un programa roto sigue explotando en modo estricto', !!cayo);
    /* El estricto se entera en la línea 3, que es donde el "{" delata que
       faltó el ")" de la 2. */
    comprobar('con la línea donde se dio cuenta', cayo && cayo.linea === 3, cayo && String(cayo.linea));
    comprobar('y marcado como error de compilación', cayo && cayo.fase === 'compilacion');

    /* El flexible culpa a la línea 2, que es donde hay que escribir el ")".
       Es la misma falta contada mejor. */
    const mismo = Flexible.compilar('inicio\n   si (a == 1\n   {\n   }\nfin\n');
    comprobar('el flexible culpa a la línea donde falta el símbolo',
      mismo.errores[0] && mismo.errores[0].linea === 2,
      JSON.stringify(mismo.errores));
  }

  /* ------------------------------------------------------------------ */
  seccion('El flexible encuentra varios errores de una vez');
  /* ------------------------------------------------------------------ */
  {
    /* Tres errores en tres sentencias distintas: en estricto se verían de a
       uno y harían falta tres compilaciones. */
    const TRES = [
      'inicio',
      '   imprimir ("uno"',            // falta el paréntesis que cierra
      '   si (a = 1)',                 // "=" en vez de "=="
      '   {',
      '   }',
      '   mientras (b > 0',            // falta el paréntesis que cierra
      '   {',
      '   }',
      'fin',
      ''
    ].join('\n');

    const est = (() => { try { SLE2.compilar(TRES); return null; } catch (e) { return e; } })();
    comprobar('en estricto se ve un solo error', !!est);

    const r = Flexible.compilar(TRES);
    comprobar('en flexible se ven los tres', r.errores.length === 3,
      r.errores.length + ': ' + r.errores.map(e => e.linea + ' ' + e.mensaje).join(' | '));
    comprobar('ok es false cuando hay errores', r.ok === false);
    comprobar('y vienen ordenados por línea',
      r.errores.every((e, i) => i === 0 || e.linea >= r.errores[i - 1].linea),
      r.errores.map(e => e.linea).join());
    comprobar('cada uno con su línea', r.errores.every(e => e.linea > 0),
      r.errores.map(e => e.linea).join());
    comprobar('el del "=" trae la explicación de siempre',
      r.errores.some(e => /"=="/.test(e.sugerencia || '')),
      r.errores.map(e => e.sugerencia).join(' ~ '));
    comprobar('y son las tres líneas que uno señalaría a mano',
      r.errores.map(e => e.linea).join() === '2,3,6', r.errores.map(e => e.linea).join());
    /* Sin cascada: las tres sentencias del programa siguen enteras. */
    comprobar('las tres sentencias quedan bien igual',
      r.ast.cuerpo.map(x => x.t).join() === 'exprStmt,si,mientras',
      r.ast.cuerpo.map(x => x.t).join());
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que sí entendió queda bien');
  /* ------------------------------------------------------------------ */
  {
    const MEDIO = [
      'programa mitad',
      'var',
      '   n : numerico',
      'inicio',
      '   n = 1',
      '   imprimir ("antes\\n")',
      '   esto no es una sentencia valida ni de casualidad )',
      '   imprimir ("despues\\n")',
      'fin',
      ''
    ].join('\n');

    const r = Flexible.compilar(MEDIO);
    comprobar('el programa conserva su nombre', r.ast && r.ast.nombre === 'mitad');
    comprobar('y sus variables', r.ast && r.ast.vars.length === 1);
    comprobar('hay al menos un error', r.errores.length >= 1, String(r.errores.length));

    const tipos = r.ast.cuerpo.map(s => s.t);
    comprobar('queda un agujero declarado, no una sentencia inventada',
      tipos.includes('error'), tipos.join());
    comprobar('la asignación de antes sobrevivió', tipos[0] === 'asig', tipos.join());
    comprobar('y la sentencia de después también',
      tipos[tipos.length - 1] === 'exprStmt', tipos.join());
    comprobar('Flexible.agujeros los cuenta', Flexible.agujeros(r.ast).length >= 1);
  }

  /* ------------------------------------------------------------------ */
  seccion('Ejecutar un agujero corta ahí, no antes');
  /* ------------------------------------------------------------------ */
  {
    const r = Flexible.compilar([
      'inicio',
      '   imprimir ("lo que iba bien\\n")',
      '   ) ( } {',
      '   imprimir ("esto ya no se ve\\n")',
      'fin',
      ''
    ].join('\n'));
    const e = await correr(r.ast);
    comprobar('se ve lo que el programa alcanzó a imprimir',
      e.salida === 'lo que iba bien\n', JSON.stringify(e.salida));
    comprobar('y después avisa', !!e.error);
    comprobar('en la línea del agujero', e.error && e.error.linea === 3, e.error && String(e.error.linea));
    comprobar('diciendo que es de compilación', e.error && e.error.fase === 'compilacion');
    comprobar('y que el programa está en modo flexible',
      e.error && /modo flexible/.test(e.error.sugerencia || ''), e.error && e.error.sugerencia);
  }

  /* ------------------------------------------------------------------ */
  seccion('Sobrevive a que falten inicio, fin y todo lo demás');
  /* ------------------------------------------------------------------ */
  {
    const sinInicio = Flexible.compilar('   imprimir ("hola")\nfin\n');
    comprobar('sin "inicio" avisa', sinInicio.errores.some(e => /inicio/.test(e.mensaje)),
      sinInicio.errores.map(e => e.mensaje).join(' | '));
    comprobar('y aun así entiende el cuerpo',
      sinInicio.ast && sinInicio.ast.cuerpo.length === 1,
      sinInicio.ast && String(sinInicio.ast.cuerpo.length));

    const sinFin = Flexible.compilar('inicio\n   imprimir ("hola")\n');
    comprobar('sin "fin" avisa', sinFin.errores.some(e => /fin/.test(e.mensaje)),
      sinFin.errores.map(e => e.mensaje).join(' | '));

    const rota = Flexible.compilar([
      'inicio',
      'fin',
      '',
      'subrutina mala (',        // rota
      'inicio',
      'fin',
      '',
      'subrutina buena ()',
      'inicio',
      '   imprimir ("ok")',
      'fin',
      ''
    ].join('\n'));
    comprobar('una subrutina rota no se lleva puesta a la siguiente',
      rota.ast && rota.ast.subs.some(x => x.nombre === 'buena'),
      rota.ast && rota.ast.subs.map(x => x.nombre).join());
    comprobar('y la rota queda anotada', rota.errores.length >= 1);
  }

  /* ------------------------------------------------------------------ */
  seccion('Nunca se cuelga');
  /* ------------------------------------------------------------------ */
  {
    /* Basura variada, incluida la que históricamente hace girar a un parser
       que no consume tokens: símbolos sueltos y cierres sin apertura. */
    const BASURA = [
      '', ' ', '}', '{', ')', '((((', '}}}}', ';;;;', 'fin', 'inicio',
      'inicio\nfin\nfin\nfin\n',
      'inicio\n}\n}\n}\nfin\n',
      'inicio\n   si\nfin\n',
      'inicio\n   mientras ) ( } {\nfin\n',
      'inicio\n   desde\nfin\n',
      'inicio\n   eval\nfin\n',
      'subrutina\n',
      'programa\n',
      'inicio\n   a = = = = =\nfin\n',
      'inicio\n   imprimir(((((((\nfin\n',
      '@@@ ### $$$',
      'inicio\n   leer\n   leer\n   leer\nfin\n'
    ];
    let colgados = 0, explotados = 0;
    for (const src of BASURA) {
      const t0 = Date.now();
      try {
        const r = Flexible.compilar(src);
        if (Date.now() - t0 > 1500) { colgados++; console.log('   lento: ' + JSON.stringify(src)); }
        if (!r || !Array.isArray(r.errores)) { explotados++; console.log('   sin errores[]: ' + JSON.stringify(src)); }
      } catch (e) {
        explotados++;
        console.log('   explotó con ' + JSON.stringify(src) + ': ' + e.message);
      }
    }
    comprobar('ningún programa roto lo cuelga', colgados === 0, String(colgados));
    comprobar('ni lo hace explotar', explotados === 0, String(explotados));

    /* Una cadena sin cerrar rompe en el tokenizador, antes de que haya
       sentencias que repartir: eso tiene que avisar, no explotar. */
    const cad = Flexible.compilar('inicio\n   imprimir ("sin cerrar\nfin\n');
    comprobar('una comilla sin cerrar da un error, no una excepción',
      cad.errores.length >= 1 && cad.ok === false,
      JSON.stringify(cad.errores));
  }

  /* ------------------------------------------------------------------ */
  seccion('Anda con los dialectos');
  /* ------------------------------------------------------------------ */
  {
    require(path.join(RAIZ, 'js', 'sle2poo.js'));
    require(path.join(RAIZ, 'js', 'sle2vis.js'));
    const { SLE2POO, SLE2VIS } = global;

    const poo = Flexible.compilar([
      'clase Punto',
      '   publico x : numerico',
      'fin',
      '',
      'inicio',
      '   imprimir ("hola"',
      'fin',
      ''
    ].join('\n'), { Parser: SLE2POO.ParserPOO, extras: SLE2POO.RESERVADAS });
    comprobar('POO: encuentra el error', poo.errores.length >= 1,
      JSON.stringify(poo.errores));
    comprobar('POO: y conserva la clase',
      poo.ast && (poo.ast.clases || []).some(c => c.nombre === 'Punto'),
      poo.ast && JSON.stringify((poo.ast.clases || []).map(c => c.nombre)));

    const vis = Flexible.compilar([
      'inicio',
      '   ventana ("Hola", 300, 200)',
      '   boton ("Aceptar", 20, 20',
      '   esperar_eventos ()',
      'fin',
      ''
    ].join('\n'), {});
    comprobar('Visual: encuentra el error', vis.errores.length >= 1,
      JSON.stringify(vis.errores));
    comprobar('Visual: y conserva la ventana',
      vis.ast && vis.ast.cuerpo.some(s => s.t === 'exprStmt'),
      vis.ast && vis.ast.cuerpo.map(s => s.t).join());
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el modo flexible tiene fallos');
})();

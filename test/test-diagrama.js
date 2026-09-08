/*
 * Prueba del generador de diagramas de flujo (js/diagrama.js).
 *
 * El dibujo se arma con cuentas, así que lo que se verifica es lo que se
 * puede romper con una cuenta: que cada construcción ponga las formas que le
 * tocan, que no salga ninguna coordenada NaN, que el SVG cierre bien y que
 * las 50 soluciones del curso —más las clases de ESLE2 POO— se dibujen sin
 * reventar. La explicación en palabras se controla con su anidación.
 *   node test/test-diagrama.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
require(path.join(__dirname, '..', 'js', 'diagrama.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios-poo.js'));
const { SLE2, SLE2POO, Diagrama, CURSO } = global;
const SOLUCIONES = require('./soluciones-curso.js');

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}
const cuenta = (t, sub) => t.split(sub).length - 1;

function diagramas(fuente, poo) {
  const ast = poo ? SLE2POO.compilar(fuente) : SLE2.compilar(fuente);
  return Diagrama.generar(ast);
}
const uno = fuente => diagramas(fuente)[0];

/* ------------------------- formas de cada cosa ------------------------- */
{
  const d = uno(`inicio
   imprimir ("hola")
fin`);
  comprobar('programa mínimo: dos terminales', cuenta(d.svg, 'df-terminal') === 2);
  comprobar('imprimir es entrada/salida', cuenta(d.svg, 'df-es') === 1);
  comprobar('no hay decisiones', cuenta(d.svg, 'df-decision') === 0);
  comprobar('el SVG cierra', /^<svg [\s\S]*<\/svg>$/.test(d.svg));
  comprobar('título del principal', d.titulo === 'Programa principal');
}
{
  const d = uno(`programa saludo
var
   n = 0
inicio
   leer (n)
   n = n + 1
fin`);
  comprobar('leer es entrada/salida', cuenta(d.svg, 'df-es') === 1);
  comprobar('la asignación es un proceso', cuenta(d.svg, 'df-proceso') === 1);
  comprobar('el nombre del programa va en el título', d.titulo === 'Programa saludo');
}
{
  const d = uno(`var
   n = 0
inicio
   si ( n > 0 )
   {
      imprimir ("+")
   sino
      imprimir ("-")
   }
fin`);
  comprobar('si/sino: un rombo', cuenta(d.svg, 'df-decision') === 1);
  comprobar('si/sino: las dos ramas', cuenta(d.svg, 'df-es') === 2);
  comprobar('si/sino: las etiquetas sí y no',
    d.svg.includes('>sí<') && d.svg.includes('>no<'));
}
{
  const d = uno(`var
   n = 0
inicio
   si ( n > 0 )
   {
      imprimir ("+")
   }
fin`);
  comprobar('si sin sino: igual hay un rombo', cuenta(d.svg, 'df-decision') === 1);
  comprobar('si sin sino: una sola caja', cuenta(d.svg, 'df-es') === 1);
}
{
  const d = uno(`var
   n = 0
inicio
   eval
   {
      caso ( n > 0 )   imprimir ("+")
      caso ( n < 0 )   imprimir ("-")
      sino             imprimir ("0")
   }
fin`);
  comprobar('eval: un rombo por caso', cuenta(d.svg, 'df-decision') === 2);
  comprobar('eval: una caja por rama', cuenta(d.svg, 'df-es') === 3);
}
{
  const d = uno(`var
   n = 0
inicio
   mientras ( n < 10 ) { n = n + 1 }
fin`);
  comprobar('mientras: un rombo', cuenta(d.svg, 'df-decision') === 1);
  comprobar('mientras: vuelta y salida', cuenta(d.svg, '<path') >= 5);
}
{
  const d = uno(`var
   n = 0
inicio
   repetir
      n = n + 1
   hasta ( n > 10 )
fin`);
  comprobar('repetir: un rombo', cuenta(d.svg, 'df-decision') === 1);
}
{
  /* El desde se dibuja abierto: inicialización, condición e incremento. */
  const d = uno(`var
   i : numerico
inicio
   desde i = 1 hasta 10 { imprimir (i) }
fin`);
  comprobar('desde: un rombo', cuenta(d.svg, 'df-decision') === 1);
  comprobar('desde: inicialización e incremento', cuenta(d.svg, 'df-proceso') === 2);
  comprobar('desde: condición i <= 10', d.svg.includes('i &lt;= 10'));
}
{
  const d = uno(`var
   i : numerico
inicio
   desde i = 10 hasta 1 paso -1 { imprimir (i) }
fin`);
  comprobar('desde con paso negativo: la condición se da vuelta', d.svg.includes('i &gt;= 1'));
}

/* ------------------------------ subrutinas ----------------------------- */
{
  const ds = diagramas(`inicio
   imprimir (doble (2))
fin
subrutina doble (x : numerico) retorna numerico
inicio
   retorna x * 2
fin`);
  comprobar('una rutina por subrutina', ds.length === 2);
  comprobar('título de la subrutina', ds[1].titulo === 'Subrutina doble (x)');
  comprobar('retorna es un terminal', cuenta(ds[1].svg, 'df-terminal') === 3);
}

/* ------------------------------ ESLE2 POO ------------------------------ */
{
  const ds = diagramas(`clase Perro
{
   atributos
      nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo ladrar ()
   inicio
      imprimir (este.nombre, " dice guau")
   fin
}

var
   p : Perro
inicio
   p = nuevo Perro ("Fido")
   p.ladrar ()
fin`, true);
  const titulos = ds.map(d => d.titulo);
  comprobar('POO: constructor y método tienen su diagrama',
    titulos.includes('Constructor de Perro') && titulos.includes('Perro.ladrar ()'),
    titulos.join(' | '));
  comprobar('POO: "nuevo" se escribe entero',
    ds[0].svg.includes('nuevo Perro ("Fido")'));
}

/* -------------------------- texto de los pasos ------------------------- */
{
  const d = uno(`var
   i : numerico
   n = 0
inicio
   leer (n)
   desde i = 1 hasta n {
      si ( i > 3 )
      {
         imprimir (i)
      }
   }
fin`);
  const t = d.pasos.map(p => '  '.repeat(p.nivel) + p.texto);
  comprobar('los pasos empiezan en Inicio y terminan en Fin',
    t[0] === 'Inicio.' && t[t.length - 1] === 'Fin.');
  comprobar('el paso de leer nombra la variable',
    t.some(x => x.includes('se guarda en n')), t.join('\n'));
  comprobar('el desde se cuenta como un para',
    t.some(x => x.trim().startsWith('Para i desde 1 hasta n')), t.join('\n'));
  comprobar('el cuerpo del desde va un nivel adentro',
    d.pasos.some(p => p.nivel === 1 && p.texto.startsWith('Si se cumple (i > 3)')));
  comprobar('el imprimir del si va dos niveles adentro',
    d.pasos.some(p => p.nivel === 2 && p.texto.startsWith('Se muestra en pantalla')));
  comprobar('se avisa del incremento',
    t.some(x => x.includes('Se le suma 1 a i')));
  comprobar('ningún paso queda vacío', d.pasos.every(p => p.texto.trim().length > 3));
}
{
  const d = uno(`var
   n = 0
inicio
   repetir
      n = n + 1
   hasta ( n > 3 )
fin`);
  comprobar('el repetir aclara que se ejecuta al menos una vez',
    d.pasos.some(p => p.texto.includes('al menos una vez')));
}

/* ------------- todo el curso, más los ejercicios de POO ---------------- */
{
  let malos = 0, total = 0, formas = 0;
  for (const [id, fuente] of Object.entries(SOLUCIONES)) {
    total++;
    try {
      for (const d of diagramas(fuente)) {
        formas += cuenta(d.svg, '<g class=');
        if (/NaN|undefined|Infinity/.test(d.svg)) throw new Error('coordenada inválida');
        if (!/^<svg [\s\S]*<\/svg>$/.test(d.svg)) throw new Error('SVG mal cerrado');
        if (!d.pasos.length) throw new Error('sin explicación');
        /* Nadie puede saltar más de un nivel de golpe: eso sería una lista
           anidada imposible de dibujar. */
        d.pasos.reduce((prev, p) => {
          if (p.nivel > prev + 1) throw new Error('salto de nivel en los pasos');
          return p.nivel;
        }, 0);
      }
    } catch (e) {
      malos++;
      console.log(`  ✘ ejercicio ${id}: ${e.message}`);
    }
  }
  comprobar(`las ${total} soluciones del curso se dibujan`, malos === 0, `${malos} fallaron`);
  comprobar('y salen con formas de verdad', formas > total * 3, `${formas} formas`);
}
{
  let malos = 0, total = 0;
  const soluciones = (global.CURSO_POO && global.CURSO_POO.SOLUCIONES) || {};
  for (const [id, fuente] of Object.entries(soluciones)) {
    total++;
    try {
      const ds = diagramas(fuente, true);
      if (!ds.length) throw new Error('sin diagramas');
      for (const d of ds)
        if (/NaN|undefined/.test(d.svg)) throw new Error('coordenada inválida');
    } catch (e) { malos++; console.log(`  ✘ POO ${id}: ${e.message}`); }
  }
  if (total) comprobar(`las ${total} soluciones de POO se dibujan`, malos === 0);
}

/* ------------------- la explicación como texto plano ------------------- */
{
  const t = Diagrama.texto([
    { nivel: 0, texto: 'Inicio.' },
    { nivel: 0, texto: 'Mientras:' },
    { nivel: 1, texto: 'Uno.' },
    { nivel: 1, texto: 'Si:' },
    { nivel: 2, texto: 'Dos.' },
    { nivel: 0, texto: 'Fin.' }
  ]).split('\n');
  comprobar('numeración de primer nivel', t[0].startsWith('1. ') && t[1].startsWith('2. '));
  comprobar('numeración anidada', t[2].trim().startsWith('2.1.') && t[4].trim().startsWith('2.2.1.'));
  comprobar('al volver de nivel sigue el conteo de arriba', t[5].startsWith('3. '), t.join('\n'));
  comprobar('cada nivel va sangrado', t[4].startsWith('      '));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el generador de diagramas tiene fallos');

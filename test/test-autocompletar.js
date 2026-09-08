/*
 * Prueba del autocompletado (js/autocompletar.js).
 *
 * Lo que importa es qué se sugiere y en qué orden: eso es cálculo puro sobre
 * el texto del editor, así que se prueba en Node sin navegador. También se
 * verifica que las plantillas de las estructuras compilen de verdad —una
 * plantilla mal escrita enseñaría mal— y que las ayudas generadas cubran
 * todas las subrutinas predefinidas.
 *   node test/test-autocompletar.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
require(path.join(__dirname, '..', 'js', 'sle2vis.js'));
require(path.join(__dirname, '..', 'js', 'indice.js'));
require(path.join(__dirname, '..', 'js', 'autocompletar.js'));
const { SLE2, SLE2POO, Autocompletar, ESLE2Ayudas } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}
const textos = l => l.map(x => x.texto);
const sug = (pref, op) => Autocompletar.sugerir(pref, op || {});

/* --------------------- qué declara el programa ------------------------- */
{
  const d = Autocompletar.declaraciones(`programa prueba
const
   MAXIMO = 100
tipos
   Alumno : registro { nombre : cadena }
var
   total, parcial : numerico
   nota = 0
inicio
   total = promedio (nota, parcial)
fin
subrutina promedio (a : numerico; ref b : numerico) retorna numerico
inicio
   retorna (a + b) / 2
fin`);
  comprobar('encuentra las variables', ['total', 'parcial', 'nota'].every(n => d.vars.includes(n)),
    d.vars.join());
  comprobar('encuentra las constantes', d.consts.join() === 'MAXIMO', d.consts.join());
  comprobar('encuentra los tipos', d.tipos.join() === 'Alumno', d.tipos.join());
  comprobar('encuentra la subrutina con sus parámetros',
    d.subs.length === 1 && d.subs[0].nombre === 'promedio' && d.subs[0].params.join() === 'a,b',
    JSON.stringify(d.subs));
  comprobar('los parámetros también son variables', d.vars.includes('a') && d.vars.includes('b'));
}
{
  /* Lo que está en un comentario o en una cadena no se declara. */
  const d = Autocompletar.declaraciones(`var
   real = 0
/*
var
   comentada = 0
*/
inicio
   imprimir ("encadenada = 1")
fin`);
  comprobar('no toma declaraciones de un comentario', !d.vars.includes('comentada'), d.vars.join());
  comprobar('ni de adentro de una cadena', !d.palabras.includes('encadenada'), d.palabras.join());
  comprobar('pero sí la de verdad', d.vars.includes('real'));
}
{
  const d = Autocompletar.declaraciones(`clase CUENTA
{
   atributos
      privado
         titular = ""
         saldo = 0

   metodo depositar (monto : numerico)
   inicio
      este.saldo = este.saldo + monto
   fin
}`);
  comprobar('encuentra la clase', d.clases.join() === 'CUENTA');
  comprobar('encuentra los atributos', d.atributos.includes('titular') && d.atributos.includes('saldo'),
    d.atributos.join());
  comprobar('encuentra el método', d.metodos.length === 1 && d.metodos[0].nombre === 'depositar');
}

/* -------------------------- las sugerencias ---------------------------- */
{
  const l = sug('impr');
  comprobar('completar «impr» ofrece imprimir', textos(l)[0] === 'imprimir', textos(l).slice(0, 5).join());
  comprobar('y trae la firma de la documentación', l[0].firma.startsWith('imprimir ('), l[0].firma);
  comprobar('y su explicación', /Muestra los valores/.test(l[0].ayuda), l[0].ayuda);
}
{
  const l = sug('mient');
  comprobar('una palabra reservada se sugiere', textos(l).includes('mientras'));
  comprobar('y se ofrece como estructura completa',
    l.find(x => x.texto === 'mientras').ayuda === 'estructura completa');
}
{
  const l = sug('set_c');
  comprobar('el prefijo con guión bajo funciona',
    textos(l).includes('set_color') && textos(l).includes('set_curpos'), textos(l).join());
}
{
  const l = sug('tot', { fuente: 'var\n   total, totalizado = 0\ninicio\nfin' });
  comprobar('las variables del programa se sugieren',
    textos(l).includes('total') && textos(l).includes('totalizado'), textos(l).join());
  comprobar('primero la más corta', textos(l)[0] === 'total');
}
{
  comprobar('sin prefijo se sugiere de todo', sug('').length > 10);
  comprobar('y la lista tiene tope', sug('').length <= 40);
}

/* --------------------- lo que evita errores de tipeo ------------------- */
{
  /* El caso de verdad: lo mal escrito ya está en el texto del editor, así que
     la lectura del programa lo devuelve como palabra conocida. Aun así hay que
     ofrecer la corrección, no la repetición de lo que se acaba de escribir. */
  const l = sug('imrimir', { fuente: `var
inicio
   imrimir
fin` });
  comprobar('un nombre mal escrito propone el correcto',
    l.length === 1 && l[0].texto === 'imprimir' && l[0].corrige, JSON.stringify(textos(l)));
  comprobar('y no se ofrece a sí mismo', !textos(l).includes('imrimir'));
  comprobar('y lo dice con todas las letras',
    /quisiste escribir/.test(l[0].ayuda), l[0].ayuda);
}
{
  const l = sug('substrr');
  comprobar('otro error de tipeo también', l.length && l[0].texto === 'substr', textos(l).join());
}
{
  const l = sug('Si', { fuente: `inicio
   Si
fin` });
  comprobar('una reservada con mayúscula ofrece primero la minúscula',
    l[0].texto === 'si' && l[0].corrige, JSON.stringify(l[0]));
  comprobar('explicando por qué',
    /minúsculas/.test(l[0].ayuda), l[0].ayuda);
}
{
  const l = sug('MIENTRAS');
  comprobar('vale para cualquier reservada', l[0].texto === 'mientras' && l[0].corrige);
}
{
  comprobar('un disparate no inventa nada', sug('zzqqxx').length === 0, textos(sug('zzqqxx')).join());
}

/* ----------------------------- contexto -------------------------------- */
{
  comprobar('después de un punto el contexto es campo',
    Autocompletar.contexto('   este.sal') === 'campo');
  comprobar('después de «nuevo» el contexto es una clase',
    Autocompletar.contexto('   p = nuevo CU') === 'nuevo');
  comprobar('en otro lado es general', Autocompletar.contexto('   total = ') === 'general');

  const fuente = `clase CUENTA
{
   atributos
      privado
         saldo = 0
   metodo depositar (m : numerico)
   inicio
      este.saldo = m
   fin
}
var
   c : CUENTA
inicio
fin`;
  const campo = sug('', { fuente, poo: true, contexto: 'campo' });
  comprobar('tras el punto se ofrecen atributos y métodos',
    textos(campo).includes('saldo') && textos(campo).includes('depositar'), textos(campo).join());
  comprobar('y no palabras reservadas', !textos(campo).includes('mientras'));

  const clase = sug('', { fuente, poo: true, contexto: 'nuevo' });
  comprobar('tras «nuevo» solo se ofrecen clases', textos(clase).join() === 'CUENTA', textos(clase).join());
}
{
  const l = sug('met', { poo: true });
  comprobar('en POO se ofrecen sus palabras', textos(l).includes('metodo'));
  comprobar('y en SLE2 clásico no', !textos(sug('met')).includes('metodo'));
}

/* ------------------- las plantillas tienen que compilar ---------------- */
{
  const M = Autocompletar.MARCA;
  const relleno = { si: 'x > 0', sino: 'x > 0', mientras: 'x > 0', repetir: 'x > 0',
                    desde: 'i', eval: 'x > 0', subrutina: 'nueva', registro: 'campo',
                    vector: '3', matriz: '3', programa: 'p', clase: 'C', metodo: 'm', constructor: '' };
  const envolver = {
    si: c => `var\n   x = 0\ninicio\n${c}\nfin`,
    sino: c => `var\n   x = 0\ninicio\n${c}\nfin`,
    mientras: c => `var\n   x = 0\ninicio\n   x = 1\n${c}\nfin`,
    repetir: c => `var\n   x = 0\ninicio\n${c}\nfin`,
    desde: c => `var\n   i, n = 0\ninicio\n${c}\nfin`,
    eval: c => `var\n   x = 0\ninicio\n${c}\nfin`,
    subrutina: c => `inicio\nfin\n${c}`,
    registro: c => `var\n   r : ${c}\ninicio\nfin`,
    vector: c => `var\n   v : ${c}\ninicio\nfin`,
    matriz: c => `var\n   m : ${c}\ninicio\nfin`,
    programa: c => c,
    clase: c => `${c}\ninicio\nfin`,
    metodo: c => `clase C\n{\n${c}\n}\ninicio\nfin`,
    constructor: c => `clase C\n{\n${c}\n}\ninicio\nfin`
  };
  const POO = ['clase', 'metodo', 'constructor'];
  let malas = 0;
  for (const [nombre, plantilla] of Object.entries(Autocompletar.PLANTILLAS)) {
    const codigo = envolver[nombre](plantilla.replace(M, relleno[nombre]));
    try {
      (POO.includes(nombre) ? SLE2POO : SLE2).compilar(codigo);
    } catch (e) {
      malas++;
      console.log(`  ✘ la plantilla «${nombre}» no compila: ${e.message}\n${codigo}`);
    }
  }
  comprobar(`las ${Object.keys(Autocompletar.PLANTILLAS).length} plantillas compilan`, malas === 0);
  comprobar('la del sino pone el sino adentro de las llaves',
    /\{[\s\S]*sino[\s\S]*\}/.test(Autocompletar.PLANTILLAS.sino));
  comprobar('todas dicen dónde va el cursor',
    Object.values(Autocompletar.PLANTILLAS).every(p => p.includes(M)));
}

/* --------------- las ayudas cubren lo que trae el lenguaje -------------- */
{
  /* Las ayudas salen de las tablas de las tres documentaciones, así que tienen
     que cubrir tanto el lenguaje base como las subrutinas visuales. */
  const TODAS = Object.assign({}, SLE2.PREDEF, SLE2VIS.PREDEF);
  const faltan = Object.keys(TODAS).filter(n => !ESLE2Ayudas[n]);
  comprobar('cada subrutina predefinida tiene su ayuda', faltan.length === 0,
    'sin ayuda: ' + faltan.join(', '));
  comprobar('y ninguna ayuda quedó vacía',
    Object.values(ESLE2Ayudas).every(a => a.firma && a.texto));
  const sobran = Object.keys(ESLE2Ayudas).filter(n => !TODAS[n]);
  comprobar('ni sobran ayudas de cosas que no existen', sobran.length === 0, sobran.join());
}

/* ---------------- sugerir sobre las soluciones del curso ---------------- */
{
  const SOLUCIONES = require('./soluciones-curso.js');
  let malos = 0, total = 0;
  for (const [id, fuente] of Object.entries(SOLUCIONES)) {
    total++;
    try {
      /* Cada identificador del programa se tiene que sugerir a sí mismo. */
      const d = Autocompletar.declaraciones(fuente);
      for (const n of d.vars.concat(d.consts).slice(0, 6)) {
        const l = sug(n.slice(0, Math.max(2, n.length - 1)), { fuente });
        if (!textos(l).includes(n)) throw new Error(`«${n}» no se sugiere a sí misma`);
      }
    } catch (e) {
      malos++;
      console.log(`  ✘ ejercicio ${id}: ${e.message}`);
    }
  }
  comprobar(`las ${total} soluciones se autocompletan solas`, malos === 0, `${malos} fallaron`);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el autocompletado tiene fallos');

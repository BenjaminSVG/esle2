/*
 * Prueba de ESLE2 POO: clases, objetos, herencia, polimorfismo,
 * encapsulamiento y compatibilidad con el lenguaje base.
 *   node test/test-poo.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios-poo.js'));
const { SLE2POO, CURSO_POO } = global;

const archivos = new Map();
function io(entrada, salida) {
  const lineas = entrada.length ? entrada.replace(/\r/g, '').split('\n') : [];
  return {
    archivos, argumentos: [],
    imprimir: t => salida.push(t),
    limpiar: () => (salida.length = 0),
    finEntrada: () => lineas.length === 0,
    leerLinea: async () => (lineas.length ? lineas.shift() : null),
    beep: async () => {}, leerTecla: async () => 0
  };
}

async function correr(codigo, entrada) {
  const salida = [];
  await SLE2POO.ejecutar(codigo, io(entrada || '', salida), { maxPasos: 4000000, archivos: new Map() });
  return salida.join('');
}

const norm = t => t.replace(/\r/g, '').split('\n')
  .map(l => l.trim().replace(/[ \t]+/g, ' ')).filter(l => l).join('\n');

/* --------------------------- casos correctos --------------------------- */
const CASOS = [
  ['clase mínima', `clase SALUDO
{
   metodo hola ()
   inicio
      imprimir ("hola")
   fin
}
var
   s : SALUDO
inicio
   s = nuevo SALUDO()
   s.hola()
fin`, '', 'hola'],

  ['constructor y atributos privados', `clase CUENTA
{
   atributos
      privado
         titular = ""
         saldo   = 0

   constructor (nombre : cadena; inicial : numerico)
   inicio
      este.titular = nombre
      este.saldo = inicial
   fin

   metodo depositar (monto : numerico)
   inicio
      este.saldo = este.saldo + monto
   fin

   metodo saldo_actual () retorna numerico
   inicio
      retorna ( este.saldo )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.titular + ": " + str (este.saldo, 0, 0) )
   fin
}
var
   c : CUENTA
inicio
   c = nuevo CUENTA ("Ana", 1000)
   c.depositar (500)
   imprimir (c.saldo_actual(), "|", c)
fin`, '', '1500|Ana: 1500'],

  ['herencia y padre', `clase ANIMAL
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ("...")
   fin

   metodo presentarse () retorna cadena
   inicio
      retorna ( este.nombre + " hace " + este.sonido() )
   fin
}
clase PERRO hereda de ANIMAL
{
   constructor (n : cadena)
   inicio
      padre.constructor (n)
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ("guau")
   fin
}
var
   a : ANIMAL
inicio
   a = nuevo PERRO ("Fido")
   imprimir (a.presentarse())
fin`, '', 'Fido hace guau'],

  ['polimorfismo con vector', `clase abstracta FIGURA
{
   metodo abstracto area () retorna numerico
   metodo describir () retorna cadena
   inicio
      retorna ( clase_de (este) + " area=" + str (este.area(), 0, 2) )
   fin
}
clase CIRCULO hereda de FIGURA
{
   atributos
      privado
         r = 0
   constructor (radio : numerico)
   inicio
      este.r = radio
   fin
   metodo area () retorna numerico
   inicio
      retorna ( 3.141592654 * este.r ^ 2 )
   fin
}
clase RECTANGULO hereda de FIGURA
{
   atributos
      privado
         a = 0
         b = 0
   constructor (x, y : numerico)
   inicio
      este.a = x
      este.b = y
   fin
   metodo area () retorna numerico
   inicio
      retorna ( este.a * este.b )
   fin
}
var
   fs : vector [3] FIGURA
   k = 0
   total = 0
inicio
   fs [1] = nuevo CIRCULO (2)
   fs [2] = nuevo RECTANGULO (3, 4)
   fs [3] = nuevo CIRCULO (1)
   desde k=1 hasta alen (fs)
   {
      imprimir (fs[k].describir(), "\\n")
      total = total + fs[k].area()
   }
   imprimir ("total=", str (total, 0, 2))
fin`, '', 'CIRCULO area=12.57\nRECTANGULO area=12.00\nCIRCULO area=3.14\ntotal=27.71'],

  ['operador es y clase_de', `clase A { metodo x () inicio imprimir ("") fin }
clase B hereda de A { }
var
   o : A
inicio
   o = nuevo B()
   imprimir (o es B, " ", o es A, " ", clase_de (o))
   o.x()
fin`, '', 'TRUE TRUE B'],

  ['objetos por referencia', `clase CAJA
{
   atributos
      publico
         v = 0
}
var
   a : CAJA
   b : CAJA
inicio
   a = nuevo CAJA()
   b = a
   b.v = 99
   imprimir (a.v, " ", a == b, " ", id_de (a) == id_de (b))
   b = nuevo CAJA()
   imprimir (" ", a == b, " ", es_nulo (a))
fin`, '', '99 TRUE TRUE FALSE FALSE'],

  ['nulo por defecto', `clase C { metodo x () inicio imprimir ("") fin }
var
   c : C
inicio
   imprimir (es_nulo (c), " ", c == nulo, " ", c)
fin`, '', 'TRUE TRUE nulo'],

  ['atributo compartido (de clase)', `clase CONTADOR
{
   atributos
      compartido publico
         cantidad = 0

   constructor ()
   inicio
      CONTADOR.cantidad = CONTADOR.cantidad + 1
   fin
}
var
   a : CONTADOR
   b : CONTADOR
inicio
   a = nuevo CONTADOR()
   b = nuevo CONTADOR()
   imprimir (CONTADOR.cantidad, " ", a <> b)
fin`, '', '2 TRUE'],

  ['metodo privado usado desde adentro', `clase T
{
   atributos
      privado
         n = 10
   metodo privado doble () retorna numerico
   inicio
      retorna ( este.n * 2 )
   fin
   metodo publico mostrar ()
   inicio
      imprimir (este.doble())
   fin
}
var t : T
inicio
   t = nuevo T()
   t.mostrar()
fin`, '', '20'],

  ['tres niveles de herencia', `clase A { metodo q () retorna cadena inicio retorna ("A") fin }
clase B hereda de A { metodo q () retorna cadena inicio retorna ("B>" + padre.q()) fin }
clase C hereda de B { metodo q () retorna cadena inicio retorna ("C>" + padre.q()) fin }
var o : A
inicio
   o = nuevo C()
   imprimir (o.q())
fin`, '', 'C>B>A'],

  ['objetos dentro de registros y arreglos', `clase P
{
   atributos publico
      n = ""
   constructor (x : cadena) inicio este.n = x fin
}
tipos
   PAR : registro { izq : P  der : P }
var
   r : PAR
   v : vector [*] P
inicio
   r.izq = nuevo P ("a")
   r.der = nuevo P ("b")
   dim (v, 2)
   v [1] = r.izq
   v [2] = nuevo P ("c")
   imprimir (r.izq.n, v[1].n, v[2].n, " ", v[1] == r.izq)
fin`, '', 'aac TRUE'],

  ['inferencia de tipo con nuevo', `clase X { atributos publico  v = 7 }
var
   x = nuevo X()
inicio
   imprimir (x.v, " ", clase_de (x))
fin`, '', '7 X'],

  ['el lenguaje base sigue funcionando', `tipos
   FECHA : registro { d, m, a : numerico }
var
   f : FECHA = {12, 7, 1969}
   v : vector [*] numerico = {3, 1, 2}
   k = 0
inicio
   desde k=1 hasta alen (v) { imprimir (v[k]) }
   imprimir ("|", f.a, "|", max (2, 9), "|", ifval (TRUE, "si", "no"))
fin`, '', '312|1969|9|si'],

  ['metodo que recibe y devuelve objetos', `clase PUNTO
{
   atributos publico
      x = 0
      y = 0
   constructor (a, b : numerico) inicio este.x = a  este.y = b fin
   metodo sumar (o : PUNTO) retorna PUNTO
   inicio
      retorna ( nuevo PUNTO (este.x + o.x, este.y + o.y) )
   fin
   metodo texto () retorna cadena
   inicio
      retorna ( "(" + str (este.x,0,0) + "," + str (este.y,0,0) + ")" )
   fin
}
var
   p : PUNTO
inicio
   p = nuevo PUNTO (1, 2)
   imprimir (p.sumar (nuevo PUNTO (10, 20)))
fin`, '', '(11,22)']
];

/* ---------------------- errores que deben detectarse ---------------------- */
const ERRORES = [
  ['instanciar una clase abstracta', `clase abstracta F { metodo abstracto a () retorna numerico }
var f : F
inicio
   f = nuevo F()
   imprimir (f)
fin`, 'abstracta'],

  ['atributo privado desde afuera', `clase C { atributos privado  s = 0 }
var c : C
inicio
   c = nuevo C()
   imprimir (c.s)
fin`, 'privado'],

  ['método privado desde afuera', `clase C { metodo privado m () inicio imprimir ("") fin }
var c : C
inicio
   c = nuevo C()
   c.m()
fin`, 'privado'],

  ['método inexistente', `clase C { metodo a () inicio imprimir ("") fin }
var c : C
inicio
   c = nuevo C()
   c.b()
fin`, 'no tiene un método'],

  ['llamar sobre nulo', `clase C { metodo a () inicio imprimir ("") fin }
var c : C
inicio
   c.a()
fin`, 'nulo'],

  ['heredar de una clase inexistente', `clase B hereda de NOEXISTE { }
var b : B
inicio
   b = nuevo B()
   imprimir (b)
fin`, 'no existe'],

  ['herencia circular', `clase A hereda de B { }
clase B hereda de A { }
var a : A
inicio
   a = nuevo A()
   imprimir (a)
fin`, 'vuelta infinita'],

  ['tipo incompatible al asignar', `clase A { metodo x () inicio imprimir ("") fin }
clase B { metodo y () inicio imprimir ("") fin }
var a : A
inicio
   a = nuevo B()
   a.x()
fin`, 'no se puede guardar'],

  ['la madre no es la hija', `clase A { metodo x () inicio imprimir ("") fin }
clase B hereda de A { }
var b : B
inicio
   b = nuevo A()
   b.x()
fin`, 'no se puede guardar'],

  ['este fuera de una clase', `inicio
   imprimir (este)
fin`, 'solo puede usarse dentro'],

  ['padre sin clase madre', `clase A { metodo x () inicio imprimir (padre.x()) fin }
var a : A
inicio
   a = nuevo A()
   a.x()
fin`, 'no hereda'],

  ['clase con métodos abstractos no declarada abstracta', `clase F { metodo abstracto a () retorna numerico }
var f : F
inicio
   f = nuevo F()
   imprimir (f)
fin`, 'debe declararse abstracta'],

  ['hija que no implementa el método abstracto', `clase abstracta F { metodo abstracto a () retorna numerico }
clase G hereda de F { }
var g : G
inicio
   g = nuevo G()
   imprimir (g)
fin`, 'no implementa'],

  ['constructor con parámetros de más', `clase C { }
var c : C
inicio
   c = nuevo C (1, 2)
   imprimir (c)
fin`, 'no tiene constructor']
];

/* ------------------------------- corrida ------------------------------- */
(async function () {
  let ok = 0, fallos = 0;
  const falla = (q, d) => { fallos++; console.log(`  ✘ ${q}\n    ${d}`); };

  console.log('— Programas correctos —');
  for (const [nombre, codigo, entrada, esperado] of CASOS) {
    try {
      const salida = norm(await correr(codigo, entrada));
      if (salida === norm(esperado)) ok++;
      else falla(nombre, `esperado ${JSON.stringify(norm(esperado))} / obtenido ${JSON.stringify(salida)}`);
    } catch (e) { falla(nombre, String(e)); }
  }

  console.log('— Errores detectados —');
  for (const [nombre, codigo, fragmento] of ERRORES) {
    try {
      await correr(codigo, '');
      falla(nombre, 'no se detectó el error');
    } catch (e) {
      if (!(e instanceof SLE2POO.SLError)) falla(nombre, 'error inesperado: ' + e.message);
      else if (!e.message.includes(fragmento)) falla(nombre, `mensaje sin "${fragmento}": ${e.message}`);
      else if (!e.sugerencia) falla(nombre, 'el error no trae recomendación: ' + e.message);
      else ok++;
    }
  }

  console.log('— Ejercicios del curso POO —');
  for (const ej of CURSO_POO.EJERCICIOS) {
    const sol = CURSO_POO.SOLUCIONES[ej.id];
    if (!sol) { falla(ej.id, 'sin solución de referencia'); continue; }
    for (let i = 0; i < ej.pruebas.length; i++) {
      const p = ej.pruebas[i];
      try {
        const salida = norm(await correr(sol, p.entrada));
        if (salida === norm(p.salida)) ok++;
        else falla(`${ej.id} caso ${i + 1}`, `esperado ${JSON.stringify(norm(p.salida))} / obtenido ${JSON.stringify(salida)}`);
      } catch (e) { falla(`${ej.id} caso ${i + 1}`, String(e)); }
    }
  }

  console.log('— Ejemplos del IDE POO —');
  for (const e of CURSO_POO.EJEMPLOS) {
    try { await correr(e.codigo, e.entrada); ok++; }
    catch (err) { falla(e.nombre, String(err)); }
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'hay pruebas fallidas');
})();

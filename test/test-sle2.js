/*
 * Prueba del intérprete SLE2: resuelve todos los ejercicios del curso
 * y algunos ejemplos del manual, comparando la salida real con la esperada.
 *   node test/test-sle2.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
const { SLE2, CURSO } = global;

const archivos = new Map();

function io(entrada, salida) {
  const lineas = entrada.length ? entrada.replace(/\r/g, '').split('\n') : [];
  return {
    archivos,
    argumentos: ['uno', 'dos tres'],
    imprimir: t => salida.push(t),
    limpiar: () => (salida.length = 0),
    finEntrada: () => lineas.length === 0,
    leerLinea: async () => (lineas.length ? lineas.shift() : null),
    // La pantalla se simula dejando marcas en la salida, para poder verificarla.
    setColor: (f, b) => salida.push(`[color ${f}/${b}]`),
    getColor: () => ({ texto: 7, fondo: 1 }),
    setCurpos: (l, c) => salida.push(`[pos ${l},${c}]`),
    getCurpos: () => ({ linea: 3, col: 12 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => salida.push('[beep]'),
    leerTecla: async () => 65
  };
}

const norm = t => t.replace(/\r/g, '').split('\n')
  .map(l => l.trim().replace(/[ \t]+/g, ' ')).filter(l => l).join('\n');

async function correr(codigo, entrada) {
  const salida = [];
  await SLE2.ejecutar(codigo, io(entrada || '', salida), { maxPasos: 8000000 });
  return salida.join('');
}

/* ---- soluciones de referencia de los ejercicios del curso ---- */
const SOLUCIONES = require(path.join(__dirname, 'soluciones-curso.js'));

/* ---- pruebas puntuales del lenguaje ---- */
const UNITARIAS = [
  ['precedencia', `var
   a, b, c : numerico
inicio
   a = 2
   b = 4 + a * 3
   c = a ^ 2 * -b
   a = b - c % 10 + 1
   imprimir (b, " ", c, " ", a)
fin`, '', '10 -40 11'],
  // Nota: el ejemplo impreso del manual (24 / -96 / 31) no coincide con su propio
  // código fuente; acá se sigue la tabla de precedencias, que sí es consistente.

  ['potencia derecha', `inicio imprimir (2 ^ 3 ^ 2, " ", -2^2, " ", (-2)^2) fin`, '', '512 -4 4'],

  ['concatenacion', `var s : cadena
inicio
   s = "Primer" + " " + "Curso"
   imprimir (s, " ", strlen (s))
fin`, '', 'Primer Curso 12'],

  ['parametros por valor y referencia', `var
   a, b : numerico
inicio
   a = 1; b = 10
   mi_sub (a, b)
   imprimir ("\\n", a, " ", b)
   mi_sub (a*10, b)
fin

subrutina mi_sub (a : numerico; ref b : numerico)
inicio
   a = 5
   b = b * 5
   imprimir ("\\n", a, " ", b)
fin`, '', '5 50\n1 50\n5 250'],

  ['registros y literales', `tipos
   FECHA : registro { d, m, a : numerico }
var
   f, g : FECHA
inicio
   f = {12, 7, 1969}
   g = f
   g.d = 25
   imprimir (f.d, "/", f.m, "/", f.a, " ", g.d)
fin`, '', '12/7/1969 25'],

  ['arreglos: literal, relleno y alen', `var
   v : vector [8] numerico
   w : vector [*] numerico
inicio
   v = {1, 2, 3, ...}
   w = {10, 20, 30}
   imprimir (v[1], v[8], " ", alen (v), " ", alen (w), " ", w[3])
   w = {}
   imprimir (" ", alen (w))
fin`, '', '13 8 3 30 0'],

  ['matriz de contorno irregular', `var
   M : matriz [*, *] numerico
inicio
   M = { {1, 3, 13, 31},
         {7, 21, 5, 17, 19, 2},
         {},
         {71, 23}
       }
   imprimir (alen (M), " ", alen (M[2]), " ", M[4,1])
fin`, '', '4 6 71'],

  ['cadenas como vectores', `var
   z : cadena
   k : numerico
inicio
   z = "Esta es una prueba"
   desde k=1 hasta strlen (z)
   {
      si ( z[k] == 'a' ) { z[k] = 'b' }
   }
   imprimir (z, "|", z[0], "|", z[99], "|")
fin`, '', 'Estb es unb pruebb|||'],

  ['eval con caso y sino', `var let, msg : cadena
inicio
   leer (let)
   let = let [1]
   eval
   {
      caso ( let >= 'A' and let <= 'Z' )  msg = "mayuscula"
      caso ( let >= 'a' and let <= 'z' )  msg = "minuscula"
      caso ( let >= '0' and let <= '9' )  msg = "digito"
      sino                                msg = "otro"
   }
   imprimir (msg)
fin`, '7', 'digito'],

  ['si encadenado', `var n : numerico
   r : cadena
inicio
   leer (n)
   si ( n >= 95 )
   {
      r = "cinco"
   sino si ( n >= 85 )
      r = "cuatro"
   sino si ( n >= 60 )
      r = "dos"
   sino
      r = "uno"
   }
   imprimir (r)
fin`, '88', 'cuatro'],

  ['funciones de cadena', `inicio
   imprimir (substr ("ABCD", 2), " ", substr ("ABCD", 5, 1), "|",
             pos ("hola mundo", "mundo"), " ", upper ("ñandu"), " ",
             val ("123.4"), " ", val ("abc"), " ", str (123.40451, 10, 3), "|",
             strdup ("-", 5), " ", ascii (65), ord ("A"))
fin`, '', 'BCD |6 ÑANDU 123.4 0 123.405|----- A65'],

  ['inc dec y arreglos', `var
   A : vector [20] numerico
   n : numerico
inicio
   n = 10
   inc (n)
   A [inc (n, 3)] = 32
   dec (n, 2)
   imprimir (n, " ", A [14])
fin`, '', '12 32'],

  ['recursion', `inicio
   imprimir (fact (10))
fin
subrutina fact (n : numerico) retorna numerico
inicio
   si ( n <= 1 ) { retorna (1) }
   retorna ( n * fact (n - 1) )
fin`, '', '3628800'],

  ['ciclo desde con paso negativo', `var k : numerico
inicio
   desde k=5 hasta 1 paso -2 { imprimir (k, " ") }
   desde k=1 hasta 0 { imprimir ("no") }
fin`, '', '5 3 1'],

  ['arreglo abierto como parametro', `var
   A : vector [5] numerico
   B : vector [*] numerico
inicio
   A = {1, 2, 3, 5, 7}
   B = A
   impr_vect (A)
   impr_vect (B)
   impr_vect ({100, 200, 300})
fin
subrutina impr_vect (v : vector [*] numerico)
var k : numerico
inicio
   desde k=1 hasta alen (v) { imprimir (v[k], " ") }
   imprimir ("\\n")
fin`, '', '1 2 3 5 7\n1 2 3 5 7\n100 200 300'],

  ['logicos y salida TRUE/FALSE', `var b : logico
inicio
   b = not (1 < 10) or (100 > 2000 or 1 < 10)
   imprimir (b, " ", SI, " ", NO)
fin`, '', 'TRUE TRUE FALSE'],

  ['comentarios y varias sentencias por linea', `/* comentario
   multilinea // con doble barra adentro */
var a, b : numerico   // otro comentario
inicio
   a = 1; b = a + 1
   imprimir (a + b)
fin`, '', '3']
];

/* ---- novedades del manual 2004 de subrutinas predefinidas ---- */
const NOVEDADES = [
  ['sub como sinonimo', `inicio
   imprimir (doble (21))
fin
sub doble (n : numerico) retorna numerico
inicio
   retorna (n * 2)
fin`, '', '42'],

  ['&& y ||', `var a = 5
inicio
   si ( a > 1 && a < 10 ) { imprimir ("si") }
   si ( a == 0 || !(a == 5) ) { imprimir ("no") sino imprimir ("-ok") }
   si ( a != 4 ) { imprimir ("-distinto") }
fin`, '', 'si-ok-distinto'],

  ['declaracion con inferencia', `var
   n = 0
   nombre = "Ana"
   ok = TRUE
   pos_0 = ord ("0")
inicio
   imprimir (n, "|", nombre, "|", ok, "|", pos_0)
fin`, '', '0|Ana|TRUE|48'],

  ['declaracion con tipo + valor', `var
   nom_dias : vector [*] cadena = {"dom", "lun", "mar"}
   v : vector [5] numerico = {1, 2, 3, ...}
inicio
   imprimir (nom_dias [2], "|", alen (nom_dias), "|", v[5], "|", alen (v))
fin`, '', 'lun|3|3|5'],

  ['inferencia de vector', `var
   M = {10, 14, 21}
inicio
   imprimir (alen (M), "|", M[3])
fin`, '', '3|21'],

  ['ifval', `inicio
   imprimir (nombre_dia (3), "|", nombre_dia (9))
fin
sub nombre_dia (num_dia : numerico) retorna cadena
var
   nom_dias : vector [*] cadena = {"dom", "lun", "mar", "mie", "jue", "vie", "sab"}
inicio
   retorna ifval (num_dia>0 and num_dia<8, nom_dias [num_dia], "MAL")
fin`, '', 'mar|MAL'],

  ['intercambiar y swap', `var
   a = 100
   b = 30
   M : vector [5] numerico = {10, 14, 21, 3, 1}
   N : vector [5] numerico = {1, 212, 31, 4, 90}
inicio
   intercambiar (a, b)
   imprimir (a, " ", b, "|")
   swap (M, N)
   imprimir (M, "|", N)
fin`, '', '30 100|1,212,31,4,90|10,14,21,3,1'],

  ['max y min', `var
   nombres : vector [*] cadena = {"Pablo", "Maria", "Ana", "Marco"}
   ult = ""
   k = 0
inicio
   desde k=1 hasta alen(nombres) {
      ult = max (ult, nombres [k])
   }
   imprimir (ult, "|", min (3, 7), "|", max (2.5, 2.4))
fin`, '', 'Pablo|3|2.5'],

  ['imprimir estructurado', `var
   A : vector [5] numerico
   k = 0
inicio
   desde k=1 hasta alen(A) { A [k] = k*k }
   imprimir (A)
fin`, '', '1,4,9,16,25'],

  ['set_ofs y nodim', `tipos
   Alumno : registro {
               cedula : cadena
               notas : vector [*] numerico
            }
var
   lista : vector [3] Alumno
   k = 0
inicio
   lista = { {"1283912", {5, 4, 5}},
             {"1278217", {} },
             {"1938281", {4, 3, 2}}
           }
   set_ofs (" *Sin notas")
   desde k=1 hasta alen(lista) {
      imprimir (lista [k], "\\n")
   }
   imprimir (get_ofs())
fin`, '', '1283912 5 4 5\n1278217 *Sin notas\n1938281 4 3 2\n *Sin notas'],

  ['leer estructurado', `var
   A : vector [4] numerico
   r : registro { nombre : cadena  edad : numerico }
inicio
   leer (A)
   leer (r)
   imprimir (A, "|", r.nombre, "-", r.edad)
fin`, '10,20,30,40\nAna,17', '10,20,30,40|Ana-17'],

  ['terminar', `inicio
   imprimir ("antes ")
   terminar ("cortado")
   imprimir (" despues")
fin`, '', 'antes cortado'],

  ['archivos: set_stdout y set_stdin', `var
   linea = ""
   n = 0
inicio
   set_stdout ("salida.txt")
   imprimir ("alfa\\nbeta\\ngama")
   set_stdout ("")
   set_stdin ("salida.txt")
   set_ifs ("\\n")
   leer (linea)
   mientras ( not eof() ) {
      inc (n)
      imprimir (n, ":", linea, " ")
      leer (linea)
   }
   imprimir ("fin=", n)
fin`, '', '1:alfa 2:beta 3:gama fin=3'],

  ['archivo inexistente', `inicio
   si ( not set_stdin ("noexiste.txt") ) { imprimir ("no se pudo") }
fin`, '', 'no se pudo'],

  ['pantalla: colores y cursor', `var
   f = 0
   b = 0
   l = 0
   c = 0
inicio
   set_color (14, 1)
   get_color (f, b)
   set_curpos (5, 10)
   get_curpos (l, c)
   get_scrsize (l, c)
   imprimir ("|", f, "/", b, "|", l, "x", c)
   beep (440, 10)
   imprimir ("|tecla=", readkey (10))
fin`, '', '[color 14/1][pos 5,10]|7/1|25x80[beep]|tecla=65'],

  ['parametros del programa', `var k = 0
inicio
   desde k=1 hasta pcount() {
      imprimir (k, "=", paramval (k), " ")
   }
   imprimir ("|", paramval (9), "|", runcmd ("dir"))
fin`, '', '1=uno 2=dos tres ||127'],

  ['sec es epoca unix', `inicio
   si ( sec() > 1000000000 ) { imprimir ("epoca") sino imprimir ("mal") }
fin`, '', 'epoca'],

  ['set_ifs vacio lee caracteres', `var
   c = ""
   n = 0
inicio
   set_stdout ("d.txt")
   imprimir ("abc")
   set_stdout ("")
   set_stdin ("d.txt")
   set_ifs ("")
   mientras ( not eof() ) {
      leer (c)
      imprimir ("[", c, "]")
      inc (n)
   }
fin`, '', '[a][b][c][]'],

  ['dim con dimension parcial', `var
   Z : matriz [*, 5] numerico
   k = 0
inicio
   dim (Z, 3)
   imprimir (alen (Z), "x", alen (Z[1]))
fin`, '', '3x5']
];

/* ---- errores que deben detectarse ---- */
const ERRORES = [
  ['tipos incompatibles', `var a : numerico
inicio
   a = "suma" + 10
fin`],
  ['variable no declarada', `inicio
   x = 1
fin`],
  ['division por cero', `var a : numerico
inicio
   a = 1 / 0
fin`],
  ['indice fuera de rango', `var v : vector [3] numerico
inicio
   imprimir (v[7])
fin`],
  ['arreglo abierto sin dim', `var v : vector [*] numerico
inicio
   v[1] = 5
fin`],
  ['falta fin', `inicio
   imprimir (1)`]
];

(async function () {
  let ok = 0, fallos = 0;
  const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };

  console.log('— Ejercicios del curso (soluciones de referencia) —');
  for (const ej of CURSO.EJERCICIOS) {
    const sol = SOLUCIONES[ej.id];
    if (!sol) { falla(ej.id, 'sin solución de referencia'); continue; }
    for (let i = 0; i < ej.pruebas.length; i++) {
      const p = ej.pruebas[i];
      try {
        const salida = norm(await correr(sol, p.entrada));
        if (salida === norm(p.salida)) ok++;
        else falla(`${ej.id} caso ${i + 1}`, `esperado ${JSON.stringify(norm(p.salida))} / obtenido ${JSON.stringify(salida)}`);
      } catch (e) {
        falla(`${ej.id} caso ${i + 1}`, String(e));
      }
    }
  }

  console.log('— Pruebas del lenguaje —');
  for (const [nombre, codigo, entrada, esperado] of UNITARIAS) {
    try {
      const salida = norm(await correr(codigo, entrada));
      if (salida === norm(esperado)) ok++;
      else falla(nombre, `esperado ${JSON.stringify(norm(esperado))} / obtenido ${JSON.stringify(salida)}`);
    } catch (e) {
      falla(nombre, String(e));
    }
  }

  console.log('— Novedades del manual 2004 —');
  for (const [nombre, codigo, entrada, esperado] of NOVEDADES) {
    try {
      const salida = await correr(codigo, entrada);
      if (salida === esperado) ok++;
      else falla(nombre, `esperado ${JSON.stringify(esperado)} / obtenido ${JSON.stringify(salida)}`);
    } catch (e) {
      falla(nombre, String(e));
    }
  }

  console.log('— Errores detectados —');
  for (const [nombre, codigo] of ERRORES) {
    try {
      await correr(codigo, '');
      falla(nombre, 'no se detectó el error');
    } catch (e) {
      if (e instanceof SLE2.SLError) ok++;
      else falla(nombre, 'error inesperado: ' + e.message);
    }
  }

  console.log('— Ejemplos del IDE (solo deben ejecutarse sin fallar) —');
  for (const e of CURSO.EJEMPLOS) {
    try { await correr(e.codigo, e.entrada); ok++; }
    catch (err) { falla(e.nombre, String(err)); }
  }

  console.log('— Depurador paso a paso —');
  {
    // El intérprete tiene que consultar opts.depurador antes de cada sentencia,
    // pasándole la línea y dejando ver las variables en su estado del momento.
    const fuente = ['var', '   n = 0', 'inicio', '   n = 1', '   n = n + 1',
      '   imprimir (n)', 'fin'].join('\n');
    const lineas = [];
    const valores = [];
    const salida = [];
    await SLE2.ejecutar(fuente, io('', salida), {
      depurador: async (linea, interp) => {
        lineas.push(linea);
        valores.push(interp.globales.get('n').v);
      }
    });
    const esperadas = [4, 5, 6];
    if (String(lineas) === String(esperadas)) ok++;
    else falla('depurador: líneas', `esperado ${esperadas} / obtenido ${lineas}`);
    if (String(valores) === String([0, 1, 2])) ok++;
    else falla('depurador: variables', `esperado 0,1,2 / obtenido ${valores}`);
    if (salida.join('') === '2') ok++;
    else falla('depurador: salida', salida.join(''));

    // Sin depurador, nada cambia.
    const s2 = [];
    await SLE2.ejecutar(fuente, io('', s2), {});
    if (s2.join('') === '2') ok++; else falla('depurador: sin hook', s2.join(''));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'hay pruebas fallidas');
})();

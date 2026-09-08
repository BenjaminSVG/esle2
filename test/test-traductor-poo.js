/*
 * Prueba de los traductores de ESLE2 POO: cada programa se corre con el
 * intérprete y también traducido a Python y a Java. Las tres salidas tienen
 * que coincidir. Si falta Python o el JDK, esa parte se saltea sin fallar.
 *   node test/test-traductor-poo.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
require(path.join(__dirname, '..', 'js', 'traducir-poo.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios-poo.js'));
const { SLE2POO, TraductorPOO, CURSO_POO } = global;

let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };
const norm = t => t.replace(/\r/g, '').split('\n').map(l => l.trimEnd()).filter(l => l !== '').join('\n');

const TRABAJO = fs.mkdtempSync(path.join(os.tmpdir(), 'esle2-poo-'));

function buscar(candidatos, args, esperado) {
  for (const c of candidatos) {
    try {
      const v = execFileSync(c, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (!esperado || v.includes(esperado)) return c;
    } catch (e) { /* siguiente */ }
  }
  return null;
}
const PYTHON = buscar(['python3', 'python', 'C:/Python313/python.exe'], ['-c', 'print(1)'], '1');
const JAVAC = buscar(['javac'], ['-version'], '');
const JAVA = JAVAC ? buscar(['java'], ['-version'], '') : null;

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
  await SLE2POO.ejecutar(fuente, io(entrada || '', salida), { maxPasos: 4000000, archivos: new Map() });
  return salida.join('');
}
function conPython(codigo) {
  const f = path.join(TRABAJO, 'programa.py');
  fs.writeFileSync(f, codigo, 'utf8');
  return execFileSync(PYTHON, [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function conJava(codigo) {
  const dir = fs.mkdtempSync(path.join(TRABAJO, 'java-'));
  const f = path.join(dir, 'Programa.java');
  fs.writeFileSync(f, codigo, 'utf8');
  execFileSync(JAVAC, ['-nowarn', f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return execFileSync(JAVA, ['-cp', dir, 'Programa'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const L = (...l) => l.join('\n');

const CASOS = [
  ['clase con constructor y método', L(
    'clase PERSONA',
    '{',
    '   atributos',
    '      privado',
    '         nombre = ""',
    '         edad = 0',
    '',
    '   constructor (n : cadena; e : numerico)',
    '   inicio',
    '      este.nombre = n',
    '      este.edad = e',
    '   fin',
    '',
    '   metodo saludar ()',
    '   inicio',
    '      imprimir ("Hola, soy ", este.nombre, " y tengo ", este.edad, " anios")',
    '   fin',
    '}',
    'var',
    '   p : PERSONA',
    '   n = ""',
    '   e = 0',
    'inicio',
    '   leer (n, e)',
    '   p = nuevo PERSONA (n, e)',
    '   p.saludar()',
    'fin'), 'Ana,17'],

  ['herencia y padre', L(
    'clase EMPLEADO',
    '{',
    '   atributos',
    '      protegido',
    '         nombre = ""',
    '         sueldo = 0',
    '   constructor (n : cadena; s : numerico)',
    '   inicio',
    '      este.nombre = n',
    '      este.sueldo = s',
    '   fin',
    '   metodo sueldo_final () retorna numerico',
    '   inicio',
    '      retorna ( este.sueldo )',
    '   fin',
    '}',
    'clase GERENTE hereda de EMPLEADO',
    '{',
    '   atributos',
    '      privado',
    '         bono = 0',
    '   constructor (n : cadena; s, b : numerico)',
    '   inicio',
    '      padre.constructor (n, s)',
    '      este.bono = b',
    '   fin',
    '   metodo sueldo_final () retorna numerico',
    '   inicio',
    '      retorna ( padre.sueldo_final() + este.bono )',
    '   fin',
    '}',
    'var',
    '   e : EMPLEADO',
    '   g : GERENTE',
    'inicio',
    '   e = nuevo EMPLEADO ("Ana", 1000)',
    '   g = nuevo GERENTE ("Beto", 2000, 500)',
    '   imprimir (e.sueldo_final(), "\\n", g.sueldo_final())',
    'fin'), ''],

  ['polimorfismo con vector de objetos', L(
    'const',
    '   PI = 3.141592654',
    'clase abstracta FIGURA',
    '{',
    '   metodo abstracto area () retorna numerico',
    '   metodo abstracto nombre () retorna cadena',
    '}',
    'clase CIRCULO hereda de FIGURA',
    '{',
    '   atributos',
    '      privado',
    '         r = 0',
    '   constructor (radio : numerico)',
    '   inicio',
    '      este.r = radio',
    '   fin',
    '   metodo area () retorna numerico',
    '   inicio',
    '      retorna ( PI * este.r * este.r )',
    '   fin',
    '   metodo nombre () retorna cadena',
    '   inicio',
    '      retorna ( "circulo" )',
    '   fin',
    '}',
    'clase CUADRADO hereda de FIGURA',
    '{',
    '   atributos',
    '      privado',
    '         l = 0',
    '   constructor (lado : numerico)',
    '   inicio',
    '      este.l = lado',
    '   fin',
    '   metodo area () retorna numerico',
    '   inicio',
    '      retorna ( este.l * este.l )',
    '   fin',
    '   metodo nombre () retorna cadena',
    '   inicio',
    '      retorna ( "cuadrado" )',
    '   fin',
    '}',
    'var',
    '   fs : vector [3] FIGURA',
    '   k = 0',
    '   total = 0',
    'inicio',
    '   fs [1] = nuevo CIRCULO (2)',
    '   fs [2] = nuevo CUADRADO (3)',
    '   fs [3] = nuevo CIRCULO (1)',
    '   desde k=1 hasta alen (fs)',
    '   {',
    '      imprimir (fs[k].nombre(), " ", str (fs[k].area(), 0, 2), "\\n")',
    '      total = total + fs[k].area()',
    '   }',
    '   imprimir ("total ", str (total, 0, 2))',
    'fin'), ''],

  ['texto(), nulo y consultas de tipo', L(
    'clase CAJA',
    '{',
    '   atributos',
    '      privado',
    '         que = ""',
    '   constructor (x : cadena)',
    '   inicio',
    '      este.que = x',
    '   fin',
    '   metodo texto () retorna cadena',
    '   inicio',
    '      retorna ( "caja de " + este.que )',
    '   fin',
    '}',
    'var',
    '   c : CAJA',
    'inicio',
    '   si ( es_nulo (c) ) { imprimir ("vacia\\n") }',
    '   c = nuevo CAJA ("frutas")',
    '   imprimir (c, "\\n", clase_de (c), "\\n")',
    '   si ( c es CAJA ) { imprimir ("es caja") }',
    'fin'), ''],

  ['atributo compartido', L(
    'clase ROBOT',
    '{',
    '   atributos',
    '      compartido publico',
    '         cantidad = 0',
    '      privado',
    '         numero = 0',
    '   constructor ()',
    '   inicio',
    '      ROBOT.cantidad = ROBOT.cantidad + 1',
    '      este.numero = ROBOT.cantidad',
    '   fin',
    '   metodo ficha () retorna cadena',
    '   inicio',
    '      retorna ( "robot " + str (este.numero, 0, 0) + " de " + str (ROBOT.cantidad, 0, 0) )',
    '   fin',
    '}',
    'var',
    '   a : ROBOT',
    '   b : ROBOT',
    'inicio',
    '   a = nuevo ROBOT ()',
    '   b = nuevo ROBOT ()',
    '   imprimir (a.ficha(), "\\n", b.ficha())',
    'fin'), ''],

  ['objetos dentro de un objeto', L(
    'clase ALUMNO',
    '{',
    '   atributos',
    '      privado',
    '         nombre = ""',
    '         nota = 0',
    '   constructor (n : cadena; x : numerico)',
    '   inicio',
    '      este.nombre = n',
    '      este.nota = x',
    '   fin',
    '   metodo nota_de () retorna numerico',
    '   inicio',
    '      retorna ( este.nota )',
    '   fin',
    '   metodo texto () retorna cadena',
    '   inicio',
    '      retorna ( este.nombre + ": " + str (este.nota, 0, 0) )',
    '   fin',
    '}',
    'clase CURSO',
    '{',
    '   atributos',
    '      privado',
    '         lista : vector [*] ALUMNO',
    '         cant = 0',
    '   constructor (tope : numerico)',
    '   inicio',
    '      dim (este.lista, tope)',
    '   fin',
    '   metodo agregar (a : ALUMNO)',
    '   inicio',
    '      este.cant = este.cant + 1',
    '      este.lista [este.cant] = a',
    '   fin',
    '   metodo promedio () retorna numerico',
    '   var',
    '      k = 0',
    '      s = 0',
    '   inicio',
    '      desde k=1 hasta este.cant',
    '      {',
    '         s = s + este.lista[k].nota_de()',
    '      }',
    '      retorna ( s / este.cant )',
    '   fin',
    '}',
    'var',
    '   c : CURSO',
    '   k = 0',
    'inicio',
    '   c = nuevo CURSO (3)',
    '   c.agregar (nuevo ALUMNO ("Mirta", 98))',
    '   c.agregar (nuevo ALUMNO ("Jose", 72))',
    '   c.agregar (nuevo ALUMNO ("Luisa", 84))',
    '   imprimir (str (c.promedio(), 0, 2))',
    'fin'), '']
];

(async () => {
  console.log(`— ESLE2 POO traducido (python: ${PYTHON || 'no hay'}, javac: ${JAVAC || 'no hay'}) —`);
  for (const [nombre, fuente, entrada] of CASOS) {
    let esperado;
    try { esperado = await conInterprete(fuente, entrada); }
    catch (e) { falla(nombre, 'el intérprete falló: ' + e.message); continue; }

    /* ---- Python ---- */
    if (PYTHON) {
      let t;
      try { t = TraductorPOO.aPython(SLE2POO.compilar(fuente), { entrada }); }
      catch (e) { falla(nombre + ' [py]', 'el traductor falló: ' + e.message); t = null; }
      if (t) {
        if (t.avisos.length) falla(nombre + ' [py]', 'avisos: ' + t.avisos.map(a => a.texto).join('; '));
        else {
          try {
            const salida = conPython(t.codigo);
            if (norm(salida) === norm(esperado)) ok++;
            else falla(nombre + ' [py]', `ESLE2 ${JSON.stringify(norm(esperado))} / Python ${JSON.stringify(norm(salida))}\n--- código ---\n${t.codigo}`);
          } catch (e) {
            falla(nombre + ' [py]', 'no corre: ' + String(e.stderr || e.message).trim() + '\n--- código ---\n' + t.codigo);
          }
        }
      }
    }

    /* ---- Java ---- */
    if (JAVAC && TraductorPOO.aJava) {
      let t;
      try { t = TraductorPOO.aJava(SLE2POO.compilar(fuente), { entrada }); }
      catch (e) { falla(nombre + ' [java]', 'el traductor falló: ' + e.message); t = null; }
      if (t) {
        if (t.avisos.length) falla(nombre + ' [java]', 'avisos: ' + t.avisos.map(a => a.texto).join('; '));
        else {
          try {
            const salida = conJava(t.codigo);
            if (norm(salida) === norm(esperado)) ok++;
            else falla(nombre + ' [java]', `ESLE2 ${JSON.stringify(norm(esperado))} / Java ${JSON.stringify(norm(salida))}\n--- código ---\n${t.codigo}`);
          } catch (e) {
            falla(nombre + ' [java]', 'no compila o no corre: ' + String(e.stderr || e.message).trim() + '\n--- código ---\n' + t.codigo);
          }
        }
      }
    }
  }

  console.log('— Las 50 soluciones del curso POO dan lo mismo traducidas —');
  for (const [id, fuente] of Object.entries(CURSO_POO.SOLUCIONES)) {
    const ej = CURSO_POO.EJERCICIOS.find(e => e.id === id);
    const entrada = ej ? ej.pruebas[0].entrada : '';
    let esperado;
    try { esperado = await conInterprete(fuente, entrada); }
    catch (e) { falla('solución ' + id, 'el intérprete falló: ' + e.message); continue; }

    let ast;
    try { ast = SLE2POO.compilar(fuente); }
    catch (e) { falla('solución ' + id, 'no compila: ' + e.message); continue; }

    if (PYTHON) {
      try {
        const py = TraductorPOO.aPython(ast, { entrada });
        if (py.avisos.length) falla(`solución ${id} [py]`, py.avisos.map(a => a.texto).join('; '));
        else {
          const salida = conPython(py.codigo);
          if (norm(salida) === norm(esperado)) ok++;
          else falla(`solución ${id} [py]`, `ESLE2 ${JSON.stringify(norm(esperado))} / Python ${JSON.stringify(norm(salida))}`);
        }
      } catch (e) { falla(`solución ${id} [py]`, String(e.stderr || e.message).trim().slice(0, 400)); }
    }

    if (JAVAC && TraductorPOO.aJava) {
      try {
        const jv = TraductorPOO.aJava(ast, { entrada });
        if (jv.avisos.length) falla(`solución ${id} [java]`, jv.avisos.map(a => a.texto).join('; '));
        else {
          const salida = conJava(jv.codigo);
          if (norm(salida) === norm(esperado)) ok++;
          else falla(`solución ${id} [java]`, `ESLE2 ${JSON.stringify(norm(esperado))} / Java ${JSON.stringify(norm(salida))}`);
        }
      } catch (e) { falla(`solución ${id} [java]`, String(e.stderr || e.message).trim().slice(0, 400)); }
    }
  }

  try { fs.rmSync(TRABAJO, { recursive: true, force: true }); } catch (e) { /* da igual */ }
  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  if (fallos) process.exit(1);
})();

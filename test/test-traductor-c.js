/*
 * Prueba del traductor a C, C++, Java y C#.
 *
 * La parte fuerte: el Java y el C# generados se COMPILAN y se CORREN de
 * verdad, y su salida se compara carácter por carácter con la del intérprete
 * de SLE2. Es la única forma de saber que la traducción dice lo mismo que el
 * original y no solo que se parece; así aparecieron, por ejemplo, que los
 * números se imprimían con otra cantidad de decimales y que el parámetro por
 * referencia no volvía.
 *
 * Como los cuatro lenguajes salen del mismo traductor y comparten toda la
 * lógica —el orden de un desde, cómo se cierra un repetir, qué operador
 * reemplaza a cada uno—, lo que valida Java y C# vale para los cuatro. De C y
 * C++ se revisa lo que se puede sin compilador: que no queden TODO, que las
 * llaves cierren, y que aparezca lo que tiene que aparecer.
 *
 * Si falta javac o dotnet, esa parte se saltea AVISANDO: no se da por buena.
 *
 *   node test/test-traductor-c.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { execFileSync, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'traducir-c.js'));
const { SLE2, TraductorC } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* ------------------------ correr con el intérprete ------------------ */
async function conInterprete(codigo, entrada) {
  let salida = '';
  const lineas = (entrada || '').length ? entrada.split('\n') : [];
  let i = 0;
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => { salida += t; },
    limpiar: () => { salida = ''; },
    finEntrada: () => i >= lineas.length,
    leerLinea: async () => (i < lineas.length ? lineas[i++] : null),
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
  await SLE2.ejecutar(codigo, io, {});
  return salida;
}

/* --------------------------- correr el Java ------------------------- */
const hayJava = (() => {
  const r = spawnSync('javac', ['-version'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
})();

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'esle2-java-'));

function conJava(fuente) {
  const dir = fs.mkdtempSync(path.join(TMP, 'p-'));
  const archivo = path.join(dir, 'Programa.java');
  fs.writeFileSync(archivo, fuente, 'utf8');
  const c = spawnSync('javac', ['-encoding', 'UTF-8', '-d', dir, archivo], { encoding: 'utf8' });
  if (c.status !== 0) return { error: 'no compila:\n' + (c.stderr || c.stdout) };
  const r = spawnSync('java', ['-Dfile.encoding=UTF-8', '-cp', dir, 'Programa'], { encoding: 'utf8' });
  if (r.status !== 0) return { error: 'no corre:\n' + (r.stderr || r.stdout) };
  return { salida: r.stdout };
}

/* Cuenta llaves, paréntesis y corchetes fuera de cadenas y comentarios. */
function balanceado(texto) {
  let i = 0, llaves = 0, par = 0, cor = 0;
  while (i < texto.length) {
    const c = texto[i];
    if (c === '/' && texto[i + 1] === '/') { while (i < texto.length && texto[i] !== '\n') i++; continue; }
    if (c === '/' && texto[i + 1] === '*') { i += 2; while (i < texto.length && !(texto[i] === '*' && texto[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"') { i++; while (i < texto.length && texto[i] !== '"') { if (texto[i] === '\\') i++; i++; } i++; continue; }
    if (c === "'") { i++; while (i < texto.length && texto[i] !== "'") { if (texto[i] === '\\') i++; i++; } i++; continue; }
    if (c === '{') llaves++; else if (c === '}') llaves--;
    else if (c === '(') par++; else if (c === ')') par--;
    else if (c === '[') cor++; else if (c === ']') cor--;
    if (llaves < 0 || par < 0 || cor < 0) return false;
    i++;
  }
  return llaves === 0 && par === 0 && cor === 0;
}

/* ------------------------- los programas de prueba ------------------ */
const PROGRAMAS = [
  {
    nombre: 'lo básico: variables, cuentas y salida',
    codigo: [
      'programa basico',
      'var',
      '   a, b : numerico',
      '   nom : cadena',
      'inicio',
      '   a = 7',
      '   b = 3',
      '   nom = "SLE2"',
      '   imprimir ("suma ", a + b, "\\n")',
      '   imprimir ("resta ", a - b, "\\n")',
      '   imprimir ("producto ", a * b, "\\n")',
      '   imprimir ("division ", a / b, "\\n")',
      '   imprimir ("resto ", a % b, "\\n")',
      '   imprimir ("potencia ", a ^ 2, "\\n")',
      '   imprimir ("hola ", nom, "\\n")',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'los tres ciclos y el si',
    codigo: [
      'var',
      '   i, total : numerico',
      'inicio',
      '   total = 0',
      '   desde i = 1 hasta 5',
      '   {',
      '      total = total + i',
      '   }',
      '   imprimir ("desde ", total, "\\n")',
      '   i = 0',
      '   mientras (i < 3)',
      '   {',
      '      imprimir ("mientras ", i, "\\n")',
      '      i = i + 1',
      '   }',
      '   i = 0',
      '   repetir',
      '      i = i + 1',
      '   hasta (i >= 2)',
      '   imprimir ("repetir ", i, "\\n")',
      '   desde i = 5 hasta 1 paso -2',
      '   {',
      '      imprimir ("baja ", i, "\\n")',
      '   }',
      '   si (total > 10)',
      '   {',
      '      imprimir ("mayor\\n")',
      '   sino',
      '      imprimir ("menor\\n")',
      '   }',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'vectores 1-based',
    codigo: [
      'var',
      '   v : vector [5] numerico',
      '   i : numerico',
      'inicio',
      '   desde i = 1 hasta 5',
      '   {',
      '      v[i] = i * i',
      '   }',
      '   desde i = 1 hasta 5',
      '   {',
      '      imprimir ("v[", i, "] = ", v[i], "\\n")',
      '   }',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'subrutinas, funciones y parámetros por referencia',
    codigo: [
      'var',
      '   x : numerico',
      'inicio',
      '   x = 4',
      '   imprimir ("doble ", doble (x), "\\n")',
      '   duplicar (x)',
      '   imprimir ("x ahora ", x, "\\n")',
      '   saludar ("mundo")',
      'fin',
      '',
      'subrutina doble (n : numerico) retorna numerico',
      'inicio',
      '   retorna (n * 2)',
      'fin',
      '',
      'subrutina duplicar (ref n : numerico)',
      'inicio',
      '   n = n * 2',
      'fin',
      '',
      'subrutina saludar (q : cadena)',
      'inicio',
      '   imprimir ("hola ", q, "\\n")',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'cadenas y sus subrutinas',
    codigo: [
      'var',
      '   s : cadena',
      'inicio',
      '   s = "Programacion"',
      '   imprimir (strlen (s), "\\n")',
      '   imprimir (substr (s, 1, 6), "\\n")',
      '   imprimir (upper (s), "\\n")',
      '   imprimir (lower (s), "\\n")',
      '   imprimir (pos (s, "grama"), "\\n")',
      '   imprimir (str (42), "|", "\\n")',
      '   imprimir (val ("3.5") + 1, "\\n")',
      '   imprimir (strdup ("ab", 3), "\\n")',
      '   imprimir ("concat: " + s, "\\n")',
      '   si (s == "Programacion")',
      '   {',
      '      imprimir ("iguales\\n")',
      '   }',
      '   si (s <> "otra")',
      '   {',
      '      imprimir ("distintas\\n")',
      '   }',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'lógicos y comparaciones',
    codigo: [
      'var',
      '   ok : logico',
      '   n : numerico',
      'inicio',
      '   n = 5',
      '   ok = (n > 3) and (n < 10)',
      '   imprimir (ok, "\\n")',
      '   ok = (n < 3) or (n == 5)',
      '   imprimir (ok, "\\n")',
      '   ok = not (n == 5)',
      '   imprimir (ok, "\\n")',
      '   si (ok == FALSE)',
      '   {',
      '      imprimir ("falso como esperaba\\n")',
      '   }',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'eval con varios casos',
    codigo: [
      'var',
      '   n : numerico',
      'inicio',
      '   n = 2',
      '   eval',
      '   {',
      '      caso (n == 1)',
      '         imprimir ("uno\\n")',
      '      caso (n == 2)',
      '         imprimir ("dos\\n")',
      '      caso (n == 3)',
      '         imprimir ("tres\\n")',
      '      sino',
      '         imprimir ("otro\\n")',
      '   }',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'leer de la entrada',
    entrada: '10\nmundo\n7,8\n',
    codigo: [
      'var',
      '   n, a, b : numerico',
      '   s : cadena',
      'inicio',
      '   leer (n)',
      '   leer (s)',
      '   leer (a, b)',
      '   imprimir ("n=", n, " s=", s, " a=", a, " b=", b, "\\n")',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'matemáticas',
    codigo: [
      'var',
      '   n, m : numerico',
      'inicio',
      '   n = -9',
      '   m = 5',
      '   imprimir (abs (n), "\\n")',
      '   imprimir (sqrt (16), "\\n")',
      '   imprimir (int (3.9), "\\n")',
      '   imprimir (max (3, 8), "\\n")',
      '   imprimir (min (3, 8), "\\n")',
      '   imprimir (log (100), "\\n")',
      '   imprimir (exp (0), "\\n")',
      '   inc (n, 2)',
      '   imprimir (n, "\\n")',
      '   dec (n)',
      '   imprimir (n, "\\n")',
      '   intercambiar (n, m)',
      '   imprimir (n, " ", m, "\\n")',
      'fin',
      ''
    ].join('\n')
  },
  {
    nombre: 'nombres que chocan con palabras del lenguaje destino',
    codigo: [
      'var',
      '   class, int, public, new : numerico',
      'inicio',
      '   class = 1',
      '   int = 2',
      '   public = 3',
      '   new = 4',
      '   imprimir (class + int + public + new, "\\n")',
      'fin',
      ''
    ].join('\n')
  }
];

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('Los cuatro lenguajes existen y se describen');
  /* ------------------------------------------------------------------ */
  {
    const L = TraductorC.LENGUAJES;
    comprobar('están los cuatro', ['c', 'cpp', 'java', 'cs'].every(k => L[k]),
      Object.keys(L).join());
    for (const k of Object.keys(L)) {
      comprobar(`${k}: dice cómo se llama`, !!L[k].nombre);
      comprobar(`${k}: dice cómo se corre`, !!L[k].corre);
      comprobar(`${k}: dice qué archivo genera`, !!L[k].archivo);
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('El Java generado compila y dice lo mismo que el intérprete');
  /* ------------------------------------------------------------------ */
  if (!hayJava) {
    console.log('  (sin javac en el PATH: esta parte se saltea, no se da por buena)');
  } else {
    for (const p of PROGRAMAS) {
      const ast = SLE2.compilar(p.codigo);
      const { codigo, avisos } = TraductorC.traducir(ast, { lenguaje: 'java', entrada: p.entrada || '' });
      comprobar(`${p.nombre}: sin TODO en la traducción`, avisos.length === 0,
        avisos.map(a => a.texto).join(' | '));

      const esperado = await conInterprete(p.codigo, p.entrada || '');
      const r = conJava(codigo);
      if (r.error) { comprobar(`${p.nombre}: el Java compila y corre`, false, r.error); continue; }
      comprobar(`${p.nombre}: el Java compila y corre`, true);
      /* Se comparan sin fijarse en el fin de línea de cada sistema. */
      const norm = s => String(s).replace(/\r\n/g, '\n').replace(/\s+$/, '');
      comprobar(`${p.nombre}: dice exactamente lo mismo`, norm(r.salida) === norm(esperado),
        'SLE2:\n' + JSON.stringify(esperado) + '\nJava:\n' + JSON.stringify(r.salida));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('C, C++ y C#: lo que se puede revisar sin compilador');
  /* ------------------------------------------------------------------ */
  {
    for (const lang of ['c', 'cpp', 'cs']) {
      const L = TraductorC.LENGUAJES[lang];
      for (const p of PROGRAMAS) {
        const ast = SLE2.compilar(p.codigo);
        const { codigo, avisos } = TraductorC.traducir(ast, { lenguaje: lang, entrada: p.entrada || '' });
        const quien = `${L.nombre} · ${p.nombre}`;
        comprobar(`${quien}: sin TODO`, avisos.length === 0, avisos.map(a => a.texto).join(' | '));
        comprobar(`${quien}: llaves y paréntesis cierran`, balanceado(codigo));
        comprobar(`${quien}: dice de dónde salió`, /ESLE2/.test(codigo));
        comprobar(`${quien}: tiene punto de entrada`,
          lang === 'cs' ? /static void Main/.test(codigo) : /int main\(void\)/.test(codigo));
      }
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Detalles que se ven en el archivo');
  /* ------------------------------------------------------------------ */
  {
    const conRef = SLE2.compilar(PROGRAMAS[3].codigo);

    const c = TraductorC.traducir(conRef, { lenguaje: 'c' }).codigo;
    comprobar('C: el parámetro por referencia es un puntero', /double\* n/.test(c), c.slice(0, 0) || undefined);
    comprobar('C: y se llama con &', /duplicar\(&x\)/.test(c));
    comprobar('C: declara los prototipos antes de main',
      c.indexOf('static double doble(double);') < c.indexOf('int main(void)'));
    comprobar('C: avisa que no libera las cadenas', /no los libera/.test(c));

    const cpp = TraductorC.traducir(conRef, { lenguaje: 'cpp' }).codigo;
    comprobar('C++: usa std::string', /std::string/.test(cpp));
    comprobar('C++: imprime con cout', /std::cout/.test(cpp));

    const java = TraductorC.traducir(conRef, { lenguaje: 'java' }).codigo;
    comprobar('Java: el ref es un arreglo de un elemento', /double\[\] n/.test(java));
    comprobar('Java: la cajita se crea, se pasa y se copia de vuelta',
      /double\[\] _ref1 = \{ x \};/.test(java) && /duplicar\(_ref1\);/.test(java)
      && /x = _ref1\[0\];/.test(java), java.split('\n').filter(l => /_ref1/.test(l)).join(' // '));
    comprobar('Java: todo va adentro de la clase Programa', /public class Programa \{/.test(java));

    const cs = TraductorC.traducir(conRef, { lenguaje: 'cs' }).codigo;
    comprobar('C#: usa System', /using System;/.test(cs));
    comprobar('C#: el punto de entrada es Main', /static void Main\(string\[\] args\)/.test(cs));

    /* Los vectores tienen que reservar una casilla de más. */
    const vec = SLE2.compilar(PROGRAMAS[2].codigo);
    for (const [lang, patron] of [['java', /new double\[5 \+ 1\]/], ['cs', /new double\[5 \+ 1\]/],
      ['cpp', /std::vector<double>\(5 \+ 1\)/], ['c', /_vector\(5, sizeof\(double\)\)/]]) {
      const t = TraductorC.traducir(vec, { lenguaje: lang }).codigo;
      comprobar(`${lang}: el vector reserva la casilla 0 sin usar`, patron.test(t),
        (t.match(/.*vector.*|.*\[5.*/i) || []).slice(0, 2).join(' // '));
    }

    /* Los nombres reservados del destino se renombran. */
    const choque = SLE2.compilar(PROGRAMAS[9].codigo);
    for (const lang of ['c', 'cpp', 'java', 'cs']) {
      const t = TraductorC.traducir(choque, { lenguaje: lang }).codigo;
      comprobar(`${lang}: renombra "int", que es palabra reservada`, /_int\b/.test(t));
      comprobar(`${lang}: y no la deja como variable suelta`, !/^\s*(double|int) int =/m.test(t));
    }
    const jch = TraductorC.traducir(choque, { lenguaje: 'java' }).codigo;
    comprobar('Java: renombra "class" y "new"', /_class\b/.test(jch) && /_new\b/.test(jch));
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que no sabe traducir lo dice, no lo inventa');
  /* ------------------------------------------------------------------ */
  {
    const ast = SLE2.compilar('var\n   v : vector [3] numerico\ninicio\n   imprimir (alen (v))\nfin\n');
    const r = TraductorC.traducir(ast, { lenguaje: 'c' });
    comprobar('C: alen() queda anotado como TODO', r.avisos.length === 1,
      JSON.stringify(r.avisos));
    comprobar('y el TODO también está en el código', /TODO/.test(r.codigo));
    const j = TraductorC.traducir(ast, { lenguaje: 'java' });
    comprobar('en Java sí se sabe hacer', j.avisos.length === 0 && /\.length - 1/.test(j.codigo),
      JSON.stringify(j.avisos));
  }

  /* ------------------------------------------------------------------ */
  seccion('El C# generado también compila y dice lo mismo');
  /* ------------------------------------------------------------------ */
  {
    const hayDotnet = (() => {
      const r = spawnSync('dotnet', ['--version'], { encoding: 'utf8' });
      return !r.error && r.status === 0;
    })();

    if (!hayDotnet) {
      console.log('  (sin dotnet en el PATH: esta parte se saltea, no se da por buena)');
    } else {
      /* El proyecto se arma una vez y se reutiliza: crearlo cuesta medio
         minuto y correrlo dos segundos. */
      const proy = path.join(os.tmpdir(), 'esle2-cs-pruebas');
      let listo = fs.existsSync(path.join(proy, 'app', 'app.csproj'));
      if (!listo) {
        fs.mkdirSync(proy, { recursive: true });
        const r = spawnSync('dotnet', ['new', 'console', '-o', 'app', '--force'],
          { cwd: proy, encoding: 'utf8', timeout: 240000 });
        listo = r.status === 0;
        if (!listo) console.log('  (no se pudo armar el proyecto de C#: se saltea)\n' + (r.stderr || ''));
      }

      if (listo) {
        const app = path.join(proy, 'app');
        for (const prog of PROGRAMAS) {
          if (prog.entrada) continue;   // la entrada va adentro del archivo, ya se probó en Java
          const ast = SLE2.compilar(prog.codigo);
          const { codigo } = TraductorC.traducir(ast, { lenguaje: 'cs' });
          fs.writeFileSync(path.join(app, 'Program.cs'), codigo, 'utf8');
          const r = spawnSync('dotnet', ['run', '--project', app],
            { encoding: 'utf8', timeout: 240000 });
          if (r.status !== 0) {
            comprobar(`${prog.nombre}: el C# compila y corre`, false, r.stdout || r.stderr);
            continue;
          }
          comprobar(`${prog.nombre}: el C# compila y corre`, true);
          const esperado = await conInterprete(prog.codigo, '');
          const norm = x => String(x).replace(/\r\n/g, '\n').replace(/\s+$/, '');
          comprobar(`${prog.nombre}: el C# dice exactamente lo mismo`,
            norm(r.stdout) === norm(esperado),
            'SLE2:\n' + JSON.stringify(esperado) + '\nC#:\n' + JSON.stringify(r.stdout));
        }
      }
    }
  }

  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el traductor a C/C++/Java/C# tiene fallos');
})();

/*
 * Prueba del corrector del curso de ESLE2 BD.
 *
 * Lo que más importa acá no es que apruebe las soluciones buenas —eso lo mira
 * test-curso-bd.js con las cincuenta— sino que REPRUEBE las malas. Un
 * corrector que aprueba todo es peor que no tener corrector: el alumno cree
 * que aprendió.
 *
 *   node test/test-verificar-bd.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sql.js'));
require(path.join(RAIZ, 'js', 'sle2bd.js'));
require(path.join(RAIZ, 'js', 'verificar-bd.js'));
const { VerificarBD } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '  [' + detalle + ']' : ''));
}
const seccion = t => console.log('\n' + t);

const prog = s => 'inicio\n' + s + '\nfin\n';

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('La estructura de la tabla');
  /* ------------------------------------------------------------------ */
  {
    const fuente = prog('   CREAR TABLA alumnos (\n'
      + '      id     ENTERO CLAVE PRIMARIA,\n'
      + '      nombre TEXTO NO NULO,\n'
      + '      correo TEXTO UNICO,\n'
      + '      ciudad TEXTO POR DEFECTO \'Asunción\'\n'
      + '   )');
    let r = await VerificarBD.correr(fuente, {
      espera: [['tabla', 'alumnos', ['id', 'nombre', 'correo', 'ciudad']],
        ['columna', 'alumnos', 'id', { tipo: 'INTEGER', clave: true }],
        ['columna', 'alumnos', 'nombre', { noNulo: true }],
        ['columna', 'alumnos', 'correo', { unico: true }],
        ['columna', 'alumnos', 'ciudad', { porDefecto: 'Asunción' }]]
    });
    comprobar('la solución buena pasa', r.ok, r.fallos.join(' | '));

    /* Y las que le faltan cosas, no. */
    r = await VerificarBD.correr(prog('   CREAR TABLA alumnos (id ENTERO, nombre TEXTO)'), {
      espera: [['tabla', 'alumnos', ['id', 'nombre', 'correo', 'ciudad']]]
    });
    comprobar('faltan columnas: reprueba', !r.ok);
    comprobar('y dice cuáles esperaba', /correo/.test(r.fallos.join(' ')), r.fallos[0]);

    r = await VerificarBD.correr(prog('   CREAR TABLA alumnos (id ENTERO, nombre TEXTO)'), {
      espera: [['columna', 'alumnos', 'id', { clave: true }]]
    });
    comprobar('sin CLAVE PRIMARIA: reprueba', !r.ok, r.fallos.join(' | '));

    r = await VerificarBD.correr(prog('   CREAR TABLA alumnos (id TEXTO)'), {
      espera: [['columna', 'alumnos', 'id', { tipo: 'INTEGER' }]]
    });
    comprobar('con el tipo equivocado: reprueba', !r.ok, r.fallos.join(' | '));

    r = await VerificarBD.correr(prog('   CREAR TABLA otra (id ENTERO)'), {
      espera: [['tabla', 'alumnos', ['id']]]
    });
    comprobar('la tabla con otro nombre: reprueba', !r.ok);
    comprobar('y dice cuáles hay', /otra/.test(r.fallos.join(' ')), r.fallos[0]);
  }

  /* ------------------------------------------------------------------ */
  seccion('El contenido');
  /* ------------------------------------------------------------------ */
  {
    const base = '   CREAR TABLA t (a ENTERO, b TEXTO)\n';
    let r = await VerificarBD.correr(prog(base + '   INSERTAR DENTRO t VALORES (1, \'x\'), (2, \'y\')'), {
      espera: [['filas', 't', 2], ['contenido', 't', ['a', 'b'], [[2, 'y'], [1, 'x']]]]
    });
    comprobar('el contenido no depende del orden', r.ok, r.fallos.join(' | '));

    r = await VerificarBD.correr(prog(base + '   INSERTAR DENTRO t VALORES (1, \'x\')'), {
      espera: [['contenido', 't', ['a', 'b'], [[1, 'x'], [2, 'y']]]]
    });
    comprobar('si falta una fila: reprueba', !r.ok);
    comprobar('y dice cuál falta', /falta la fila/.test(r.fallos.join(' ')), r.fallos[0]);

    r = await VerificarBD.correr(prog(base + '   INSERTAR DENTRO t VALORES (1, \'x\'), (2, \'y\'), (3, \'z\')'), {
      espera: [['contenido', 't', ['a', 'b'], [[1, 'x'], [2, 'y']]]]
    });
    comprobar('si sobra una fila: reprueba', !r.ok);
    comprobar('y dice cuál sobra', /sobra la fila/.test(r.fallos.join(' ')), r.fallos[0]);

    /* Los duplicados cuentan: dos filas iguales no son una. */
    r = await VerificarBD.correr(prog(base + '   INSERTAR DENTRO t VALORES (1, \'x\')'), {
      espera: [['contenido', 't', ['a', 'b'], [[1, 'x'], [1, 'x']]]]
    });
    comprobar('un duplicado que falta también reprueba', !r.ok, r.fallos.join(' | '));

    /* NULO, 0 y "" son tres cosas distintas: es lo que el curso enseña. */
    r = await VerificarBD.correr(prog(base + '   INSERTAR DENTRO t VALORES (0, \'\')'), {
      espera: [['contenido', 't', ['a', 'b'], [[null, null]]]]
    });
    comprobar('el cero y el vacío no pasan por nulo', !r.ok, r.fallos.join(' | '));
  }

  /* ------------------------------------------------------------------ */
  seccion('El resultado de la consulta');
  /* ------------------------------------------------------------------ */
  {
    const datos = 'CREAR TABLA t (n ENTERO); INSERTAR DENTRO t VALORES (3), (1), (2)';

    let r = await VerificarBD.correr(prog('   SELECCIONAR n DE t ORDENAR POR n'), {
      preparar: datos,
      espera: [['en_orden', ['n'], [[1], [2], [3]]]]
    });
    comprobar('ordenado como se pidió: pasa', r.ok, r.fallos.join(' | '));

    r = await VerificarBD.correr(prog('   SELECCIONAR n DE t'), {
      preparar: datos,
      espera: [['en_orden', ['n'], [[1], [2], [3]]]]
    });
    comprobar('sin ordenar, cuando el orden se pidió: reprueba', !r.ok);
    comprobar('y dice en qué lugar falló', /en el lugar 1/.test(r.fallos.join(' ')), r.fallos[0]);

    r = await VerificarBD.correr(prog('   SELECCIONAR n DE t'), {
      preparar: datos,
      espera: [['resultado', ['n'], [[1], [2], [3]]]]
    });
    comprobar('sin ordenar, cuando el orden no se pidió: pasa', r.ok, r.fallos.join(' | '));

    /* Un programa que imprime la respuesta a mano sin tocar la base no puede
       aprobar: es justo lo que el corrector viejo no atrapaba. */
    r = await VerificarBD.correr(prog('   imprimir ("1\\n2\\n3\\n")'), {
      preparar: datos,
      espera: [['resultado', ['n'], [[1], [2], [3]]]]
    });
    comprobar('imprimir la respuesta a mano no aprueba', !r.ok);
    comprobar('y explica qué falta', /no dejó ningún resultado/.test(r.fallos.join(' ')), r.fallos[0]);

    r = await VerificarBD.correr(prog('   SELECCIONAR n COMO cuantos DE t'), {
      preparar: datos, espera: [['columnas', ['cuantos']]]
    });
    comprobar('el nombre de la columna del resultado', r.ok, r.fallos.join(' | '));
  }

  /* ------------------------------------------------------------------ */
  seccion('Cuando el ejercicio pide una construcción');
  /* ------------------------------------------------------------------ */
  {
    const datos = 'CREAR TABLA a (id ENTERO); CREAR TABLA b (a ENTERO); '
      + 'INSERTAR DENTRO a VALORES (1), (2); INSERTAR DENTRO b VALORES (1)';

    let r = await VerificarBD.correr(
      prog('   SELECCIONAR id DE a COMO x DONDE EXISTE (SELECCIONAR 1 DE b DONDE b.a = x.id)'), {
        preparar: datos, espera: [['usa', 'existe'], ['resultado', ['id'], [[1]]]]
      });
    comprobar('resuelto con EXISTE: pasa', r.ok, r.fallos.join(' | '));

    /* Mismo resultado, otra construcción: si el ejercicio pedía practicar
       EXISTE, no alcanza con llegar al número. */
    r = await VerificarBD.correr(prog('   SELECCIONAR id DE a DONDE id EN (SELECCIONAR a DE b)'), {
      preparar: datos, espera: [['usa', 'existe'], ['resultado', ['id'], [[1]]]]
    });
    comprobar('el mismo resultado con otra cosa: reprueba', !r.ok);
    comprobar('y dice qué pedía', /EXISTE/.test(r.fallos.join(' ')), r.fallos[0]);

    /* Y la palabra adentro de un comentario no cuenta: se mira el árbol. */
    r = await VerificarBD.correr(
      prog('   // acá iría un EXISTE\n   SELECCIONAR id DE a DONDE id EN (SELECCIONAR a DE b)'), {
        preparar: datos, espera: [['usa', 'existe']]
      });
    comprobar('la palabra en un comentario no cuenta', !r.ok, r.fallos.join(' | '));

    r = await VerificarBD.correr(
      prog('   SELECCIONAR a.id DE a UNIR b SEGUN b.a = a.id'), {
        preparar: datos, espera: [['usa', 'unir']]
      });
    comprobar('UNIR se reconoce', r.ok, r.fallos.join(' | '));
  }

  /* ------------------------------------------------------------------ */
  seccion('Cada prueba arranca de una base limpia');
  /* ------------------------------------------------------------------ */
  {
    const crear = prog('   CREAR TABLA t (n ENTERO)\n   INSERTAR DENTRO t VALORES (1)');
    await VerificarBD.correr(crear, { espera: [['filas', 't', 1]] });
    const r = await VerificarBD.correr(crear, { espera: [['filas', 't', 1]] });
    comprobar('correr dos veces no acumula filas', r.ok, r.fallos.join(' | '));

    const r2 = await VerificarBD.correr(prog('   SELECCIONAR 1'), {
      espera: [['tabla', 't', ['n']]]
    });
    comprobar('y la tabla de la prueba anterior no quedó', !r2.ok, r2.fallos.join(' | '));
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa que se rompe');
  /* ------------------------------------------------------------------ */
  {
    const r = await VerificarBD.correr(prog('   SELECCIONAR * DE noexiste'), {
      espera: [['filas', 't', 1]]
    });
    comprobar('reprueba', !r.ok);
    comprobar('y dice en qué línea', /línea 2/.test(r.fallos.join(' ')), r.fallos[0]);
    comprobar('y no revienta', r.error !== null && r.fallos.length === 1, r.fallos.join(' | '));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el corrector de BD tiene fallos');
})();

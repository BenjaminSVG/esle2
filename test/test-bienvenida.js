/*
 * Prueba de los primeros pasos: sobre todo, que NO aparezcan cuando no
 * corresponde. Un cartel de bienvenida que le sale a alguien que ya sabe usar
 * el programa es peor que no tenerlo.
 *   node test/test-bienvenida.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'bienvenida.js'));
const { Bienvenida } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);

seccion('Cuándo aparece');
comprobar('la primera vez de verdad',
  Bienvenida.hayQueMostrar({ visto: null, codigo: null }));
comprobar('también con el editor vacío',
  Bienvenida.hayQueMostrar({ visto: null, codigo: '   \n  ' }));

seccion('Cuándo NO aparece');
comprobar('si ya lo vio', !Bienvenida.hayQueMostrar({ visto: '1', codigo: null }));
comprobar('si ya tiene código escrito',
  !Bienvenida.hayQueMostrar({ visto: null, codigo: 'inicio\nfin' }));
comprobar('si abrió un programa compartido',
  !Bienvenida.hayQueMostrar({ visto: null, codigo: 'programa de otro' }));
comprobar('ni con un estado vacío', !Bienvenida.hayQueMostrar(null));
comprobar('ni con las dos cosas', !Bienvenida.hayQueMostrar({ visto: '1', codigo: 'algo' }));

seccion('Los pasos');
{
  const todos = Bienvenida.pasos();
  comprobar('son cuatro', todos.length === 4, todos.length);
  comprobar('cada uno apunta a algo', todos.every(p => p.donde && p.donde.length));
  comprobar('y todos tienen título y texto',
    todos.every(p => p.titulo && p.texto));

  /* El primero tiene que ser el editor: es lo único que la persona mira. */
  comprobar('el primero es el programa', todos[0].donde === '.CodeMirror', todos[0].donde);
  comprobar('el segundo es ejecutar', todos[1].donde === '#btnEjecutar', todos[1].donde);

  /* Ninguno apunta a algo que haya que descubrir después: son cuatro y
     terminan. Si esto crece a ocho, dejó de ser «los primeros cinco minutos». */
  comprobar('no son más de cinco', todos.length <= 5, todos.length);

  /* Los textos hablan de vos y no del programa. Es una regla de estilo del
     curso entero y acá importa más que en ningún lado. */
  comprobar('sin jerga de interfaz',
    !todos.some(p => /widget|panel de control|toolbar/i.test(p.texto + p.titulo)));
}

seccion('Si la página no tiene todo');
{
  /* En una página sin curso, ese paso no se muestra en vez de apuntar al aire. */
  const parcial = Bienvenida.pasos(sel => sel !== '[data-vista="curso"]');
  comprobar('el paso que no aplica se saca', parcial.length === 3, parcial.length);
  comprobar('y los que quedan siguen en orden',
    parcial.map(p => p.donde).join() === '.CodeMirror,#btnEjecutar,#pantalla',
    parcial.map(p => p.donde));

  comprobar('sin ningún elemento no queda ninguno',
    Bienvenida.pasos(() => false).length === 0);
}

seccion('La clave');
comprobar('la clave es del alumno y no de la máquina', Bienvenida.CLAVE === 'esle2_bienvenida');
{
  /* Si un día se agrega perfil.js, esta clave tiene que viajar con el alumno:
     cada persona que empieza merece su recorrido. */
  require(path.join(__dirname, '..', 'js', 'perfil.js'));
  comprobar('viaja con el perfil del alumno',
    global.Perfil.esDelAlumno(Bienvenida.CLAVE));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'los primeros pasos tienen fallos');

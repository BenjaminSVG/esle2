/*
 * Que los ejemplos de ESLE2 Visual anden.
 *
 * Un ejemplo roto es peor que no tener ejemplos: es lo primero que abre
 * alguien que no sabe si el error es suyo o del programa. Acá se comprueba
 * que los once compilen, que corran hasta esperar_eventos() sin reventar y
 * que lo que arman tenga sentido —que haya ventana, que los eventos apunten
 * a subrutinas que existen—.
 *
 *   node test/test-ejemplos-visual.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sle2vis.js'));
require(path.join(RAIZ, 'js', 'visual-ejemplos.js'));
const { SLE2VIS, VISUAL_EJEMPLOS } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}

const io = () => ({
  archivos: new Map(), argumentos: [],
  imprimir() {}, limpiar() {},
  finEntrada: () => true, leerLinea: async () => null,
  beep: async () => {}, leerTecla: async () => 0
});

/* Un reloj de mentira: un ejemplo con temporizador no puede quedarse
   corriendo de verdad durante la prueba. */
function relojFalso() {
  const pendientes = [];
  const reloj = (ms, que) => pendientes.push(que);
  reloj.tic = async (veces) => {
    for (let i = 0; i < (veces || 1); i++) {
      for (const q of pendientes.splice(0, pendientes.length)) q();
      await new Promise(r => setTimeout(r, 5));
    }
  };
  return reloj;
}

(async () => {

  console.log('\nTodos los ejemplos');
  comprobar('hay once', VISUAL_EJEMPLOS.length === 11, String(VISUAL_EJEMPLOS.length));
  comprobar('todos tienen nombre y código',
    VISUAL_EJEMPLOS.every(e => e.nombre && e.codigo && e.codigo.trim().length > 40));
  const nombres = VISUAL_EJEMPLOS.map(e => e.nombre);
  comprobar('sin nombres repetidos', new Set(nombres).size === nombres.length, nombres.join(' | '));

  for (const ej of VISUAL_EJEMPLOS) {
    /* 1. Compila. */
    let ast = null;
    try { ast = SLE2VIS.compilar(ej.codigo); }
    catch (e) { comprobar('«' + ej.nombre + '» compila', false, e.message + ' (línea ' + e.linea + ')'); continue; }
    comprobar('«' + ej.nombre + '» compila', true);

    /* 2. Corre hasta esperar_eventos() sin reventar. */
    const gui = SLE2VIS.guiDeMentira();
    const control = {};
    const reloj = relojFalso();
    let error = null;
    const fin = SLE2VIS.ejecutar(ej.codigo, io(), { gui, control, reloj })
      .catch(e => { error = e; });
    await new Promise(r => setTimeout(r, 20));

    comprobar('«' + ej.nombre + '» arranca sin errores', !error,
      error && (error.message + ' (línea ' + error.linea + ')'));
    comprobar('«' + ej.nombre + '» abre una ventana', gui.registro.some(r => r[0] === 'ventana'));
    comprobar('«' + ej.nombre + '» crea controles', gui.controles.size > 0,
      String(gui.controles.size));
    comprobar('«' + ej.nombre + '» queda esperando', gui.esperando === true);

    /* 3. Tocar todo lo que tenga un evento no puede romper nada. Es lo que
          hace un alumno apenas lo abre. */
    for (const clave of gui.eventos.keys()) {
      const [id, evento] = clave.split(':');
      await gui.disparar(Number(id), evento);
    }
    /* Y si tiene reloj, que un par de tics tampoco lo rompan. */
    await reloj.tic(3);

    comprobar('«' + ej.nombre + '» aguanta que le toquen todo', gui.errores.length === 0,
      gui.errores.map(e => e.message).join(' | '));

    control.detener();
    await fin;
  }

  console.log('\nLos que usan lo nuevo');
  {
    const conNuevos = VISUAL_EJEMPLOS.filter(e =>
      /desplegable|numero \(|progreso \(|confirmar|temporizador/.test(e.codigo));
    comprobar('hay ejemplos de los controles nuevos', conNuevos.length >= 5,
      String(conNuevos.length));
    comprobar('alguno usa confirmar', VISUAL_EJEMPLOS.some(e => /confirmar/.test(e.codigo)));
    comprobar('alguno usa temporizador', VISUAL_EJEMPLOS.some(e => /temporizador/.test(e.codigo)));
    comprobar('alguno asocia etiquetas', VISUAL_EJEMPLOS.some(e => /asociar_etiqueta/.test(e.codigo)));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'los ejemplos de Visual tienen fallos');
})();

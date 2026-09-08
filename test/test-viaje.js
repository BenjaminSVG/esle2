/*
 * Prueba de la grabación para viajar en el tiempo.
 *
 * Se graba con el intérprete de verdad, no con uno de mentira: lo que se está
 * probando es justamente que las fotos correspondan a lo que pasó.
 *
 * Lo que más importa:
 *   · que cada foto sea una COPIA. El error clásico de un grabador así es
 *     guardar el mismo vector que usa el intérprete: al final todas las fotos
 *     muestran el estado final y la película no sirve para nada;
 *   · que la pantalla y el lienzo se puedan rehacer hasta cualquier paso;
 *   · que un ciclo infinito se corte y lo diga.
 *
 *   node test/test-viaje.js
 */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'viaje.js'));
const { SLE2, Viaje } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* Un io como el del IDE: pantalla de texto y lienzo, los dos anotados para
   poder comprobar qué se dibujó. */
function ioFalso(entrada) {
  const lineas = (entrada || '').split('\n').filter((x, i, a) => i < a.length - 1 || x !== '');
  let i = 0;
  const io = {
    archivos: new Map(),
    argumentos: [],
    texto: [], dibujo: [],
    imprimir(t) { io.texto.push(t); },
    limpiar() { io.texto.length = 0; },
    finEntrada: () => i >= lineas.length,
    leerLinea: async () => (i < lineas.length ? lineas[i++] : null),
    setColor: (f, b) => io.dibujo.push(['color', f, b]),
    getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: (l, c) => io.dibujo.push(['pos', l, c]),
    getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {},
    leerTecla: async () => 0,
    pixel: (x, y, c) => io.dibujo.push(['pixel', x, y, c]),
    linea: (a, b, c, d, e) => io.dibujo.push(['linea', a, b, c, d, e]),
    rect: (x, y, w, h, c) => io.dibujo.push(['rect', x, y, w, h, c]),
    circulo: (x, y, r, c) => io.dibujo.push(['circulo', x, y, r, c]),
    limpiarLienzo: c => io.dibujo.push(['limpiar', c]),
    lienzoAncho: () => 320,
    lienzoAlto: () => 200
  };
  return io;
}

/* Graba un programa y devuelve la grabación más el io usado. */
async function grabar(fuente, op) {
  op = op || {};
  const control = {};
  const g = Viaje.crearGrabadora({ maxPasos: op.maxPasos, maxElem: op.maxElem, control });
  const io = ioFalso(op.entrada);
  let error = null, interp = null;
  try {
    interp = await SLE2.ejecutar(fuente, g.envolverIO(io),
      { control, depurador: g.hook, alRetornar: g.alRetornar });
  } catch (e) { error = e; }
  return { g: g.cerrar(error, interp), io, error };
}

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('Un ciclo cualquiera');
  {
    const CODIGO = [
      'var',
      '   n : numerico',
      '   total : numerico',
      'inicio',
      '   total = 0',
      '   desde n = 1 hasta 4',
      '   {',
      '      total = total + n',
      '   }',
      '   imprimir ("total ", total)',
      'fin', ''
    ].join('\n');

    const { g, error } = await grabar(CODIGO);
    comprobar('graba sin error', !error, error && error.message);
    comprobar('grabó varios pasos', g.pasos.length > 6, g.pasos.length);
    comprobar('terminó solo, sin cortes', g.motivo === null && !g.cortada, g.motivo);

    /* Esto es LO importante: cada foto es una foto, no un espejo del final. */
    const totales = g.pasos
      .map(p => (p.ambitos.find(a => a.titulo === 'programa').vars.find(v => v.nombre === 'total') || {}).valor)
      .filter(v => v !== undefined);
    comprobar('«total» va cambiando a lo largo de la película',
      new Set(totales).size > 3, [...new Set(totales)].join(','));
    comprobar('y empieza en cero, no en el valor final',
      totales[0] === 0 && totales[totales.length - 1] === 10,
      totales[0] + ' … ' + totales[totales.length - 1]);

    /* Cada paso apunta a una línea real del programa. */
    const nl = CODIGO.split('\n').length;
    comprobar('toda foto apunta a una línea del programa',
      g.pasos.every(p => p.linea >= 1 && p.linea <= nl),
      g.pasos.map(p => p.linea).join(','));

    comprobar('el resumen dice cuántos pasos', /\d+ pasos grabados/.test(Viaje.resumen(g)), Viaje.resumen(g));
  }

  /* ------------------------------------------------------------------ */
  seccion('Rebobinar la pantalla');
  {
    const CODIGO = [
      'var',
      '   i : numerico',
      'inicio',
      '   desde i = 1 hasta 3',
      '   {',
      '      imprimir ("linea ", i, "\\n")',
      '   }',
      'fin', ''
    ].join('\n');

    const { g, io } = await grabar(CODIGO);
    const impresiones = g.ops.filter(o => o.op === 'imprimir');
    comprobar('se anotó cada impresión', impresiones.length >= 3, impresiones.length);

    const texto = i => Viaje.opsHasta(g, i).filter(o => o.op === 'imprimir').map(o => o.args[0]).join('');
    const alFinal = texto(g.pasos.length);
    comprobar('al final se ve todo', /linea 1/.test(alFinal) && /linea 3/.test(alFinal), alFinal);
    comprobar('lo rehecho al final es exactamente lo que salió de verdad',
      alFinal === io.texto.join(''), JSON.stringify(alFinal) + ' vs ' + JSON.stringify(io.texto.join('')));

    /* En algún punto del medio se tiene que ver menos que al final: es la
       prueba de que la barra sirve para algo. */
    const medios = g.pasos.map((p, i) => texto(i));
    comprobar('en el medio se ve menos que al final',
      medios.some(t => t.length > 0 && t.length < alFinal.length),
      medios.map(t => t.length).join(','));
    comprobar('y al principio todavía no se imprimió nada', texto(0) === '', JSON.stringify(texto(0)));

    /* Lo que se ve nunca puede achicarse yendo hacia adelante. */
    let creciente = true;
    for (let i = 1; i < medios.length; i++) if (medios[i].length < medios[i - 1].length) creciente = false;
    comprobar('avanzando, lo que se ve nunca se achica', creciente, medios.map(t => t.length).join(','));
  }

  /* ------------------------------------------------------------------ */
  seccion('Rebobinar el lienzo');
  {
    const CODIGO = [
      'var',
      '   x : numerico',
      'inicio',
      '   desde x = 1 hasta 5',
      '   {',
      '      dibujar_rectangulo (x * 10, 10, 8, 8, 4)',
      '   }',
      'fin', ''
    ].join('\n');

    const { g, error } = await grabar(CODIGO);
    comprobar('el programa que dibuja se graba sin error', !error, error && error.message);
    const rects = i => Viaje.opsHasta(g, i).filter(o => o.op === 'rect').length;
    comprobar('al final están los cinco rectángulos', rects(g.pasos.length) === 5, rects(g.pasos.length));
    comprobar('al principio no hay ninguno', rects(0) === 0);
    comprobar('y en el medio hay algunos',
      g.pasos.some((p, i) => rects(i) > 0 && rects(i) < 5),
      g.pasos.map((p, i) => rects(i)).join(','));
    comprobar('cada rectángulo se anotó con sus cinco argumentos',
      g.ops.filter(o => o.op === 'rect').every(o => o.args.length === 5),
      JSON.stringify(g.ops.find(o => o.op === 'rect')));
  }

  /* ------------------------------------------------------------------ */
  seccion('Qué cambió en cada paso');
  {
    const CODIGO = [
      'var',
      '   a : numerico',
      '   b : numerico',
      'inicio',
      '   a = 1',
      '   b = 2',
      '   a = a + b',
      'fin', ''
    ].join('\n');

    const { g } = await grabar(CODIGO);
    const todos = g.pasos.map((p, i) => Viaje.cambios(g, i).map(c => c.nombre).join('+'));
    comprobar('en el primer paso no hay «cambió» que valga', todos[0] === '', todos[0]);
    comprobar('«a» aparece como cambiada en algún paso', todos.some(t => t.indexOf('a') >= 0), todos.join(' | '));
    comprobar('«b» también', todos.some(t => t.indexOf('b') >= 0), todos.join(' | '));
    comprobar('nunca cambian las dos en el mismo paso (una asignación por línea)',
      !todos.some(t => t === 'a+b'), todos.join(' | '));

    const cuandoA = Viaje.pasosDondeCambia(g, 'a');
    comprobar('se puede saltar a los pasos donde cambia «a»', cuandoA.length === 2, cuandoA.join(','));
  }

  /* ------------------------------------------------------------------ */
  seccion('Un vector, copiado de verdad');
  {
    const CODIGO = [
      'var',
      '   v : vector [5] numerico',
      '   i : numerico',
      'inicio',
      '   desde i = 1 hasta 5',
      '   {',
      '      v[i] = i * i',
      '   }',
      'fin', ''
    ].join('\n');

    const { g, error } = await grabar(CODIGO);
    comprobar('graba sin error', !error, error && error.message);
    const vs = g.pasos.map(p => JSON.stringify(
      (p.ambitos.find(a => a.titulo === 'programa').vars.find(x => x.nombre === 'v') || {}).valor));
    comprobar('el vector se ve llenarse casilla por casilla', new Set(vs).size > 3,
      [...new Set(vs)].join(' -> '));
    comprobar('la primera foto NO tiene el vector ya lleno',
      vs[0] !== vs[vs.length - 1], vs[0] + ' vs ' + vs[vs.length - 1]);
  }

  /* ------------------------------------------------------------------ */
  seccion('Un vector enorme no se copia entero');
  {
    const grande = new Array(1000).fill(7);
    const copia = Viaje.copiar(grande, 0, 120);
    comprobar('se copian solo las primeras casillas', copia.length === 120, copia.length);
    comprobar('y se anota cuántas faltan', copia.mas === 880, copia.mas);
  }

  /* ------------------------------------------------------------------ */
  seccion('Un ciclo que no termina');
  {
    const CODIGO = [
      'var',
      '   i : numerico',
      'inicio',
      '   i = 0',
      '   mientras ( i >= 0 )',
      '   {',
      '      i = i + 1',
      '   }',
      'fin', ''
    ].join('\n');

    const { g } = await grabar(CODIGO, { maxPasos: 300 });
    comprobar('se corta en el tope', g.cortada && g.pasos.length === 300, g.pasos.length);
    comprobar('y lo dice con todas las letras', g.motivo === 'tope', g.motivo);
    comprobar('el resumen avisa que puede no terminar',
      /no termine/.test(Viaje.resumen(g)), Viaje.resumen(g));
    comprobar('lo grabado igual sirve: se ve a «i» subir sin parar',
      g.pasos[0].ambitos[0].vars.length > 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa que se rompe');
  {
    const CODIGO = [
      'var',
      '   a : numerico',
      '   b : numerico',
      'inicio',
      '   a = 10',
      '   b = 0',
      '   a = a / b',
      'fin', ''
    ].join('\n');

    const { g } = await grabar(CODIGO);
    comprobar('se guarda lo grabado hasta el error', g.pasos.length >= 3, g.pasos.length);
    comprobar('y se anota que hubo error', g.motivo === 'error', g.motivo);
    comprobar('con el mensaje del intérprete', !!g.error, g.error);
    comprobar('el resumen lo cuenta', /error/.test(Viaje.resumen(g)), Viaje.resumen(g));
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa que pide datos');
  {
    const CODIGO = [
      'var',
      '   n : numerico',
      'inicio',
      '   leer (n)',
      '   imprimir ("doble ", n * 2)',
      'fin', ''
    ].join('\n');

    const { g, error, io } = await grabar(CODIGO, { entrada: '21\n' });
    comprobar('usa la entrada de datos como la usaría al ejecutar', !error, error && error.message);
    comprobar('y el resultado es el que corresponde',
      /doble 42/.test(io.texto.join('')), io.texto.join(''));

    /* Sin datos, el intérprete corta con su error de siempre: no es cosa del
       grabador inventar uno nuevo. */
    const sin = await grabar(CODIGO, { entrada: '' });
    comprobar('sin datos, corta con el error del intérprete',
      sin.g.motivo === 'error' && /no hay más datos/.test(sin.g.error), sin.g.error);
  }

  /* ------------------------------------------------------------------ */
  seccion('El io envuelto no cambia el programa');
  {
    const io = ioFalso('');
    const g = Viaje.crearGrabadora({});
    const env = g.envolverIO(io);
    comprobar('pasan las funciones que solo leen', env.lienzoAncho() === 320);
    comprobar('y los datos sueltos', env.archivos === io.archivos);
    env.imprimir('hola');
    comprobar('imprimir sigue imprimiendo', io.texto.join('') === 'hola', io.texto.join(''));
    comprobar('y además queda anotado',
      g.ops.length === 1 && g.ops[0].op === 'imprimir' && g.ops[0].args[0] === 'hola',
      JSON.stringify(g.ops));
  }

  console.log('\n' + ok + ' bien, ' + fallos + ' mal');
  process.exit(fallos ? 1 : 0);
})();

/*
 * Prueba del historial de versiones (js/historial.js).
 *
 * Lo que hay que asegurar es que no se pierda código: que se guarde lo que
 * corresponde, que no se guarde dos veces lo mismo, que al podar sobrevivan
 * las versiones que el alumno guardó a mano, y que el diff diga exactamente
 * qué cambió entre dos versiones.
 *   node test/test-historial.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
/* localStorage de mentira, para probar cargar() y guardar() sin navegador. */
const almacen = new Map();
global.localStorage = {
  getItem: k => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: k => almacen.delete(k)
};
require(path.join(__dirname, '..', 'js', 'historial.js'));
const { Historial } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

const V = (codigo, extra) => Object.assign({ codigo }, extra || {});
const codigos = l => l.map(v => v.codigo);
const marcas = d => d.map(x => (x.t === 'mas' ? '+' : x.t === 'menos' ? '-' : x.t === 'salto' ? '…' : ' ') + x.texto);

/* ----------------------------- dar de alta ----------------------------- */
{
  let h = [];
  h = Historial.agregar(h, V('uno', { mensaje: 'primera' }));
  h = Historial.agregar(h, V('dos'));
  comprobar('la más nueva queda primera', codigos(h).join() === 'dos,uno', codigos(h).join());
  comprobar('guarda el mensaje', h[1].mensaje === 'primera');
  comprobar('le pone fecha', h[0].ts > 0);
  comprobar('y un identificador propio', h[0].id !== h[1].id && !!h[0].id);

  const antes = h.length;
  h = Historial.agregar(h, V('dos'));
  comprobar('el mismo código no se guarda dos veces', h.length === antes, String(h.length));

  h = Historial.agregar(h, V('tres', { tipo: 'ejecucion' }));
  comprobar('el tipo se conserva', h[0].tipo === 'ejecucion');
  h = Historial.agregar(h, V('cuatro', { tipo: 'inventado' }));
  comprobar('un tipo desconocido cae en manual', h[0].tipo === 'manual', h[0].tipo);
  comprobar('el mensaje se recorta a 80',
    Historial.agregar([], V('x', { mensaje: 'a'.repeat(200) }))[0].mensaje.length === 80);
  comprobar('sin entrada, entrada vacía', h[0].entrada === '');
}

/* ------------------------------- podar --------------------------------- */
{
  let h = [];
  for (let i = 0; i < 60; i++) h = Historial.agregar(h, V('v' + i, { tipo: 'ejecucion' }));
  comprobar('no se acumulan más de 40', h.length === 40, String(h.length));
  comprobar('y quedan las más nuevas', h[0].codigo === 'v59' && h[39].codigo === 'v20',
    h[0].codigo + '…' + h[h.length - 1].codigo);
}
{
  /* Las guardadas a mano son las que el alumno eligió recordar: aguantan. */
  let h = Historial.agregar([], V('importante', { tipo: 'manual', mensaje: 'antes de romper todo' }));
  for (let i = 0; i < 60; i++) h = Historial.agregar(h, V('v' + i, { tipo: 'ejecucion' }));
  comprobar('una versión guardada a mano sobrevive a la poda',
    codigos(h).includes('importante'), codigos(h).slice(-3).join());
  comprobar('y sigue siendo la más vieja', h[h.length - 1].codigo === 'importante');
}
{
  /* Aunque sean pocas, no pueden ocupar cualquier cosa. */
  let h = [];
  for (let i = 0; i < 10; i++) h = Historial.agregar(h, V('x'.repeat(50000) + i, { tipo: 'ejecucion' }));
  const bytes = h.reduce((s, v) => s + v.codigo.length, 0);
  comprobar('el tamaño total tiene tope', bytes <= 400000, String(bytes));
  comprobar('pero siempre queda al menos una', h.length >= 1);
}

/* -------------------------------- diff --------------------------------- */
{
  const d = Historial.diff('a\nb\nc', 'a\nb\nc');
  comprobar('dos textos iguales no tienen cambios',
    Historial.resumen(d).mas === 0 && Historial.resumen(d).menos === 0);
  comprobar('y salen todas las líneas', d.length === 3 && d.every(x => x.t === 'igual'));
}
{
  const d = Historial.diff('a\nb\nc', 'a\nB\nc');
  comprobar('una línea cambiada es una que sale y otra que entra',
    marcas(d).join('|') === ' a|-b|+B| c', marcas(d).join('|'));
  const r = Historial.resumen(d);
  comprobar('el resumen cuenta bien', r.mas === 1 && r.menos === 1, JSON.stringify(r));
}
{
  const d = Historial.diff('a\nc', 'a\nb\nc');
  comprobar('una línea agregada no descoloca el resto',
    marcas(d).join('|') === ' a|+b| c', marcas(d).join('|'));
  comprobar('las líneas nuevas saben su número',
    d[1].b === 2 && d[1].a === null, JSON.stringify(d[1]));
}
{
  const d = Historial.diff('a\nb\nc', 'a\nc');
  comprobar('una línea borrada también', marcas(d).join('|') === ' a|-b| c', marcas(d).join('|'));
  comprobar('las borradas saben de qué línea venían', d[1].a === 2 && d[1].b === null);
}
{
  const d = Historial.diff('', 'nueva');
  comprobar('de vacío a algo, todo entra', marcas(d).join('|') === '-|+nueva', marcas(d).join('|'));
}
{
  /* Un caso realista: se cambia el cuerpo de un ciclo. */
  const antes = ['var', '   i, n = 0', 'inicio', '   leer (n)', '   desde i = 1 hasta n', '   {',
                 '      imprimir (i)', '   }', 'fin'].join('\n');
  const despues = ['var', '   i, n = 0', 'inicio', '   leer (n)', '   desde i = 1 hasta n', '   {',
                   '      imprimir (i, " ")', '   }', 'fin'].join('\n');
  const d = Historial.diff(antes, despues);
  const r = Historial.resumen(d);
  comprobar('un cambio de una línea se ve como uno solo', r.mas === 1 && r.menos === 1, JSON.stringify(r));
  comprobar('y lo demás queda igual', d.filter(x => x.t === 'igual').length === 8);

  const corto = Historial.recortar(d, 1);
  comprobar('el recorte deja el cambio y su contexto',
    corto.some(x => x.t === 'mas') && corto.length < d.length, String(corto.length));
  comprobar('y marca lo que salteó', corto.some(x => x.t === 'salto'), marcas(corto).join('|'));
}
{
  /* Programas grandes: el diff no puede tardar una eternidad ni reventar. */
  const a = Array.from({ length: 600 }, (_, i) => 'linea ' + i).join('\n');
  const b = a.replace('linea 300', 'LINEA 300');
  const t0 = Date.now();
  const r = Historial.resumen(Historial.diff(a, b));
  comprobar('600 líneas se comparan bien', r.mas === 1 && r.menos === 1, JSON.stringify(r));
  comprobar('y rápido', Date.now() - t0 < 2000, (Date.now() - t0) + ' ms');
}

/* ---------------------------- guardar y leer --------------------------- */
{
  const h = Historial.agregar([], V('programa\ninicio\nfin', { mensaje: 'hola' }));
  comprobar('se guarda', Historial.guardar('prueba', h) === true);
  const leido = Historial.cargar('prueba');
  comprobar('y se lee igual', leido.length === 1 && leido[0].codigo === h[0].codigo);
  comprobar('con su mensaje', leido[0].mensaje === 'hola');
}
{
  almacen.set('rota', '{esto no es JSON');
  comprobar('una clave corrupta no rompe nada', Historial.cargar('rota').length === 0);
  almacen.set('otra', '{"no":"es una lista"}');
  comprobar('ni una que no sea lista', Historial.cargar('otra').length === 0);
  almacen.set('mezcla', JSON.stringify([{ codigo: 'bien' }, { falta: 'codigo' }, null]));
  const l = Historial.cargar('mezcla');
  comprobar('las entradas rotas se descartan una por una', l.length === 1 && l[0].codigo === 'bien');
  comprobar('y a las buenas se les completan los huecos', l[0].tipo === 'manual' && l[0].entrada === '');
  comprobar('sin nada guardado, lista vacía', Historial.cargar('nunca').length === 0);
}

/* ------------------------------- fecha --------------------------------- */
{
  const f = Historial.fecha(new Date(2026, 8, 1, 9, 5).getTime());
  comprobar('la fecha sale corta y legible', f === '01/09 09:05', f);
  comprobar('una fecha inválida no rompe', Historial.fecha(NaN) === '');
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el historial tiene fallos');

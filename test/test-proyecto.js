/*
 * Prueba del proyecto: la lista de archivos del explorador (js/proyecto.js).
 *
 * Acá lo que no puede fallar es que no se pierda ni se pise un programa: dos
 * archivos con el mismo nombre, un renombre que tapa a otro, un nombre con
 * caracteres que después no se pueden guardar. Todo eso es cálculo sobre
 * listas, así que se prueba sin navegador.
 *   node test/test-proyecto.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
const almacen = new Map();
global.localStorage = {
  getItem: k => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: k => almacen.delete(k)
};
require(path.join(__dirname, '..', 'js', 'proyecto.js'));
const { Proyecto } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}
const nombres = l => l.map(a => a.nombre).join(', ');

/* -------------------------- crear archivos ------------------------------ */
{
  let r = Proyecto.crear([], 'programa', { codigo: 'inicio\nfin' });
  comprobar('se crea el primero', !r.error && r.lista.length === 1);
  comprobar('le pone la extensión sola', r.lista[0].nombre === 'programa.sl', r.lista[0].nombre);
  comprobar('guarda el código', r.lista[0].codigo === 'inicio\nfin');
  comprobar('y la entrada vacía', r.lista[0].entrada === '');

  r = Proyecto.crear(r.lista, 'datos.txt', {});
  comprobar('respeta la extensión que le pongan',
    r.lista.some(a => a.nombre === 'datos.txt'), nombres(r.lista));
  comprobar('y la lista se ordena sola', nombres(r.lista) === 'datos.txt, programa.sl', nombres(r.lista));

  comprobar('no deja dos con el mismo nombre',
    !!Proyecto.crear(r.lista, 'programa.sl', {}).error);
  comprobar('ni cambiando mayúsculas', !!Proyecto.crear(r.lista, 'PROGRAMA.SL', {}).error);
}
{
  const malos = ['', '   ', '/nada.sl', 'nada/', 'a//b.sl', 'con\\barra.sl', 'con:dos.sl',
                 'x'.repeat(70) + '.sl'];
  for (const m of malos)
    comprobar(`«${m.slice(0, 22)}» se rechaza`, !!Proyecto.validar(m, []), 'lo aceptó');
  comprobar('un nombre normal se acepta', Proyecto.validar('parcial/ej1.sl', []) === null);
  comprobar('el error se explica', /Ya hay un archivo/.test(
    Proyecto.validar('a.sl', [{ nombre: 'a.sl' }])));
}
{
  let lista = [];
  for (let i = 0; i < 60; i++) lista = Proyecto.crear(lista, 'a' + i + '.sl', {}).lista;
  comprobar('hay un tope de archivos', !!Proyecto.crear(lista, 'uno-mas.sl', {}).error,
    'aceptó el 61');
}

/* ------------------------------ nombres libres -------------------------- */
{
  const lista = Proyecto.crear([], 'ej.sl', {}).lista;
  comprobar('si está ocupado propone otro', Proyecto.nombreLibre(lista, 'ej.sl') === 'ej 2.sl',
    Proyecto.nombreLibre(lista, 'ej.sl'));
  const dos = Proyecto.crear(lista, 'ej 2.sl', {}).lista;
  comprobar('y sigue contando', Proyecto.nombreLibre(dos, 'ej.sl') === 'ej 3.sl');
  comprobar('si está libre lo deja igual', Proyecto.nombreLibre(lista, 'otro.sl') === 'otro.sl');
  comprobar('respeta la carpeta', Proyecto.nombreLibre(lista, 'c/ej.sl') === 'c/ej.sl');
}

/* ------------------------- renombrar, duplicar, borrar ------------------ */
{
  let lista = Proyecto.crear([], 'viejo.sl', { codigo: 'hola' }).lista;
  lista = Proyecto.crear(lista, 'otro.sl', {}).lista;

  let r = Proyecto.renombrar(lista, 'viejo.sl', 'nuevo.sl');
  comprobar('renombrar cambia el nombre', !r.error && nombres(r.lista) === 'nuevo.sl, otro.sl', nombres(r.lista));
  comprobar('y no toca el contenido', r.lista.find(a => a.nombre === 'nuevo.sl').codigo === 'hola');

  comprobar('no deja pisar a otro', !!Proyecto.renombrar(lista, 'viejo.sl', 'otro.sl').error);
  comprobar('pero sí dejarlo igual', !Proyecto.renombrar(lista, 'viejo.sl', 'viejo.sl').error);
  comprobar('renombrar algo que no está avisa', !!Proyecto.renombrar(lista, 'fantasma.sl', 'x.sl').error);
  comprobar('al renombrar sin extensión se conserva la que tenía',
    Proyecto.renombrar(lista, 'viejo.sl', 'renombrado').lista[1].nombre === 'renombrado.sl',
    nombres(Proyecto.renombrar(lista, 'viejo.sl', 'renombrado').lista));
  comprobar('se puede mover a una carpeta',
    nombres(Proyecto.renombrar(lista, 'viejo.sl', 'tp/viejo.sl').lista).includes('tp/viejo.sl'));

  r = Proyecto.duplicar(lista, 'viejo.sl');
  comprobar('duplicar copia el contenido con otro nombre',
    r.archivo.nombre === 'viejo 2.sl' && r.archivo.codigo === 'hola', r.archivo && r.archivo.nombre);
  comprobar('borrar saca uno solo', nombres(Proyecto.borrar(lista, 'viejo.sl').lista) === 'otro.sl');
  comprobar('borrar algo que no está no rompe', Proyecto.borrar(lista, 'fantasma.sl').lista.length === 2);
}

/* -------------------------------- escribir ------------------------------ */
{
  const lista = Proyecto.crear([], 'a.sl', { codigo: 'uno', entrada: '5' }).lista;
  const l2 = Proyecto.escribir(lista, 'a.sl', { codigo: 'dos' });
  comprobar('escribir cambia el código', l2[0].codigo === 'dos');
  comprobar('y deja la entrada como estaba', l2[0].entrada === '5');
  comprobar('sin tocar la lista original', lista[0].codigo === 'uno');
  comprobar('escribir en uno que no está devuelve lo mismo',
    Proyecto.escribir(lista, 'fantasma.sl', { codigo: 'x' })[0].codigo === 'uno');
}

/* --------------------------------- árbol -------------------------------- */
{
  let lista = [];
  for (const n of ['zeta.sl', 'parcial/ej2.sl', 'parcial/ej1.sl', 'parcial/viejos/uno.sl', 'alfa.sl'])
    lista = Proyecto.crear(lista, n, {}).lista;

  comprobar('la lista queda ordenada', nombres(lista) ===
    'alfa.sl, parcial/ej1.sl, parcial/ej2.sl, parcial/viejos/uno.sl, zeta.sl', nombres(lista));

  const a = Proyecto.arbol(lista);
  comprobar('en la raíz quedan los sueltos', a.archivos.map(x => x.etiqueta).join() === 'alfa.sl,zeta.sl',
    a.archivos.map(x => x.etiqueta).join());
  comprobar('y una carpeta', a.carpetas.length === 1 && a.carpetas[0].nombre === 'parcial');
  const p = a.carpetas[0];
  comprobar('con sus dos archivos', p.archivos.map(x => x.etiqueta).join() === 'ej1.sl,ej2.sl');
  comprobar('y su subcarpeta', p.carpetas.length === 1 && p.carpetas[0].nombre === 'viejos');
  comprobar('la subcarpeta conoce su ruta completa', p.carpetas[0].ruta === 'parcial/viejos');
  comprobar('el archivo de adentro guarda el nombre entero',
    p.carpetas[0].archivos[0].nombre === 'parcial/viejos/uno.sl');
  comprobar('pero se muestra solo con el último tramo',
    p.carpetas[0].archivos[0].etiqueta === 'uno.sl');
  comprobar('las carpetas se listan', Proyecto.carpetas(lista).join() === 'parcial,parcial/viejos',
    Proyecto.carpetas(lista).join());
  comprobar('un proyecto sin carpetas no inventa ninguna',
    Proyecto.arbol([{ nombre: 'a.sl', codigo: '' }]).carpetas.length === 0);
}

/* ------------------------------ guardar y leer -------------------------- */
{
  const lista = Proyecto.crear([], 'a.sl', { codigo: 'hola' }).lista;
  comprobar('se guarda', Proyecto.guardar('p', { archivos: lista, activo: 'a.sl' }) === true);
  const leido = Proyecto.cargar('p');
  comprobar('y se lee igual', leido.archivos.length === 1 && leido.activo === 'a.sl');
  comprobar('con su código', leido.archivos[0].codigo === 'hola');

  almacen.set('rota', '{no es json');
  comprobar('una clave corrupta da un proyecto vacío', Proyecto.cargar('rota').archivos.length === 0);
  almacen.set('mezcla', JSON.stringify({ archivos: [{ nombre: 'b.sl', codigo: 'x' }, { nombre: 5 }, null], activo: 'no-existe' }));
  const m = Proyecto.cargar('mezcla');
  comprobar('las entradas rotas se descartan', m.archivos.length === 1 && m.archivos[0].nombre === 'b.sl');
  comprobar('y un activo que no existe se corrige', m.activo === 'b.sl', String(m.activo));
  comprobar('sin nada guardado, proyecto vacío',
    Proyecto.cargar('nunca').archivos.length === 0 && Proyecto.cargar('nunca').activo === null);
}

/* ------------------ el almacén lleno no se pierde en silencio ----------- */
/* Antes, un fallo acá volvía false y nadie lo miraba: guardarActual() en
   proyecto-ui.js lo ignoraba. Ahora Proyecto.guardar() pasa por
   Guardado.escribir(), así que el mismo aviso que ya usa el editor —una
   sola vez, no en cada tecla— también cubre al proyecto. */
{
  require(path.join(__dirname, '..', 'js', 'guardado.js'));
  const avisos = [];
  const lleno = { setItem: () => { throw new Error('QuotaExceededError'); }, getItem: () => null, removeItem: () => {} };
  const guardadoDelExamen = global.Guardado;
  global.Guardado = global.Guardado.crear({ almacen: lleno, avisar: t => avisos.push(t) });

  const lista = Proyecto.crear([], 'lleno.sl', { codigo: 'x' }).lista;
  const r1 = Proyecto.guardar('p2', { archivos: lista, activo: 'lleno.sl' });
  const r2 = Proyecto.guardar('p2', { archivos: lista, activo: 'lleno.sl' });
  comprobar('con el almacén lleno, guardar avisa que no pudo', r1 === false && r2 === false);
  comprobar('con un solo aviso, no uno por operación', avisos.length === 1, String(avisos.length));

  global.Guardado = guardadoDelExamen;
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el proyecto tiene fallos');

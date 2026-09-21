/*
 * Prueba de llevarse una carpeta y traerla de vuelta.
 *
 * El archivo lo elige el alumno de su propio disco, así que lo que entra por
 * acá es de un desconocido: puede estar roto, puede estar preparado, puede ser
 * un .zip con el nombre cambiado. Eso es lo que se prueba, además de que la
 * ida y la vuelta no pierdan nada.
 *
 *   node test/test-carpeta.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'proyecto.js'));
require(path.join(RAIZ, 'js', 'carpeta.js'));
const { Proyecto, Carpeta } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

const ARCH = (n, c, e) => ({ nombre: n, codigo: c || '', entrada: e || '', ts: 1 });
const estadoBase = () => ({
  archivos: [
    ARCH('suelto.sl', 'inicio\nfin\n'),
    ARCH('parcial/ej1.sl', 'inicio\n   imprimir ("uno")\nfin\n', '5\n'),
    ARCH('parcial/ej2.sl', 'inicio\n   imprimir ("dos")\nfin\n'),
    ARCH('parcial/viejos/ej0.sl', 'inicio\nfin\n'),
    ARCH('parcial2/otro.sl', 'inicio\nfin\n')
  ],
  carpetas: ['parcial/vacia'],
  activo: 'parcial/ej1.sl'
});

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Carpetas en el proyecto');
  {
    const e = estadoBase();
    comprobar('las carpetas se deducen de los nombres y se suman las vacías',
      Proyecto.carpetas(e.archivos, e.carpetas).join(' ')
        === 'parcial parcial/vacia parcial/viejos parcial2',
      Proyecto.carpetas(e.archivos, e.carpetas).join(' '));

    const a = Proyecto.arbol(e.archivos, e.carpetas);
    const parcial = a.carpetas.find(c => c.nombre === 'parcial');
    comprobar('la carpeta vacía igual se dibuja',
      !!parcial.carpetas.find(c => c.nombre === 'vacia'));

    /* Crear una carpeta que todavía no tiene nada adentro. */
    const r = Proyecto.crearCarpeta(e, 'tareas/enero');
    comprobar('se puede crear una carpeta vacía', !!r.estado && !r.error, r.error);
    comprobar('y queda anotada', r.estado.carpetas.indexOf('tareas/enero') >= 0);
    comprobar('con su carpeta de arriba también a la vista',
      Proyecto.carpetas(r.estado.archivos, r.estado.carpetas).indexOf('tareas') >= 0);

    comprobar('no se puede repetir una que ya está',
      !!Proyecto.crearCarpeta(e, 'parcial').error);
    comprobar('ni llamarla como un archivo',
      !!Proyecto.crearCarpeta(e, 'suelto.sl').error);
  }

  /* Un proyecto que todavía no existe tiene que traer los mismos campos que
     uno que sí. Faltaba «carpetas» justo en ese camino, y el explorador se
     rompía en la primera visita de cada alumno: el único momento en que no
     hay nada guardado. */
  {
    const antes = global.localStorage;
    global.localStorage = { getItem: () => null };
    const vacio = Proyecto.cargar('la-que-sea');
    global.localStorage = { getItem: () => 'esto no es json' };
    const roto = Proyecto.cargar('la-que-sea');
    global.localStorage = antes;
    for (const [q, e] of [['sin nada guardado', vacio], ['con basura guardada', roto]]) {
      comprobar(q + ': trae archivos', Array.isArray(e.archivos));
      comprobar(q + ': trae carpetas', Array.isArray(e.carpetas), JSON.stringify(e));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Renombrar y borrar, sin llevarse a la de al lado');
  {
    const e = estadoBase();
    const r = Proyecto.renombrarCarpeta(e, 'parcial', 'final');
    comprobar('renombrar mueve los archivos de adentro',
      r.estado.archivos.some(a => a.nombre === 'final/ej1.sl'));
    comprobar('y también las subcarpetas',
      r.estado.archivos.some(a => a.nombre === 'final/viejos/ej0.sl'));
    comprobar('y las vacías', r.estado.carpetas.indexOf('final/vacia') >= 0);
    /* Lo que se rompe con un startsWith() a secas. */
    comprobar('«parcial2» NO se toca',
      r.estado.archivos.some(a => a.nombre === 'parcial2/otro.sl'),
      r.estado.archivos.map(a => a.nombre).join(' '));
    comprobar('el archivo abierto sigue abierto', r.estado.activo === 'final/ej1.sl');

    const b = Proyecto.borrarCarpeta(e, 'parcial');
    comprobar('borrar se lleva lo de adentro',
      !b.estado.archivos.some(a => a.nombre.startsWith('parcial/')));
    comprobar('y la vacía de adentro', b.estado.carpetas.indexOf('parcial/vacia') < 0);
    comprobar('pero no «parcial2»',
      b.estado.archivos.some(a => a.nombre === 'parcial2/otro.sl'));
    comprobar('y suelta el archivo abierto si estaba ahí', b.estado.activo === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Rutas que no se aceptan');
  {
    const malas = ['..', 'a/../b', './a', 'a/./b', '/a', 'a/', 'a//b', 'a\\b',
      'a\u0000b', 'a‮b', ' ', 'a/b/c/d/e/f/g/h/i', 'x'.repeat(61)];
    let todas = true;
    for (const m of malas) if (!Proyecto.validarRuta(m)) { todas = false; console.log('    pasó: ' + JSON.stringify(m)); }
    comprobar('ninguna ruta rara pasa', todas);
    comprobar('una normal sí', Proyecto.validarRuta('parcial/ej 1.sl') === null);
    comprobar('con acentos y ñ también', Proyecto.validarRuta('año/mañana.sl') === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Llevarse una carpeta y traerla');
  {
    const e = estadoBase();
    const paq = Carpeta.armar(e, 'parcial');
    comprobar('van los archivos de esa carpeta y nada más',
      paq.archivos.map(a => a.nombre).sort().join(' ') === 'ej1.sl ej2.sl viejos/ej0.sl',
      paq.archivos.map(a => a.nombre).join(' '));
    comprobar('las rutas van relativas a la carpeta',
      !paq.archivos.some(a => a.nombre.startsWith('parcial/')));
    comprobar('la carpeta vacía también viaja', paq.carpetas.join(' ') === 'vacia', paq.carpetas.join(' '));
    comprobar('lo de afuera no se cuela',
      !paq.archivos.some(a => /suelto|parcial2/.test(a.nombre)));
    comprobar('se lleva lo que estaba escrito en la entrada de datos',
      paq.archivos.find(a => a.nombre === 'ej1.sl').entrada === '5\n');

    /* La ida y la vuelta por gzip de verdad. */
    const bytes = await Carpeta.comprimir(paq);
    comprobar('comprimido son bytes', bytes instanceof Uint8Array && bytes.length > 0, bytes && bytes.length);
    const vuelta = await Carpeta.descomprimir(bytes);
    comprobar('y vuelve igual', JSON.stringify(vuelta) === JSON.stringify(paq));

    /* Y adentro de un proyecto vacío. */
    const limpio = { archivos: [], carpetas: [], activo: null };
    const f = Carpeta.fundir(limpio, vuelta, 'traido');
    comprobar('se funde en una carpeta nueva', !f.error, f.error);
    comprobar('con los archivos adentro',
      f.estado.archivos.map(a => a.nombre).sort().join(' ')
        === 'traido/ej1.sl traido/ej2.sl traido/viejos/ej0.sl',
      f.estado.archivos.map(a => a.nombre).join(' '));
    comprobar('y la carpeta vacía puesta', f.estado.carpetas.indexOf('traido/vacia') >= 0);
    comprobar('sin perder el código',
      f.estado.archivos.find(a => a.nombre === 'traido/ej1.sl').codigo.includes('uno'));
    comprobar('dice cuántos trajo', f.cuantos === 3, f.cuantos);

    comprobar('no se puede traer encima de una carpeta que ya está',
      !!Carpeta.fundir(e, vuelta, 'parcial').error);

    comprobar('el nombre del archivo sale de la carpeta',
      Carpeta.nombreDeArchivo('trabajos/parcial') === 'parcial.esle2carpeta',
      Carpeta.nombreDeArchivo('trabajos/parcial'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Un archivo que vino de cualquier lado');
  {
    const limpio = { archivos: [], carpetas: [], activo: null };
    const malo = async bruto => {
      const bytes = await Carpeta.comprimir(bruto);
      return await Carpeta.descomprimir(bytes);
    };

    comprobar('otro formato no pasa', await malo({ f: 'otra-cosa', v: 1 }) === null);
    comprobar('otra versión tampoco', await malo({ f: 'esle2-carpeta', v: 99 }) === null);
    comprobar('un arreglo tampoco', await malo([1, 2, 3]) === null);
    comprobar('null tampoco', await malo(null) === null);

    /* El truco de siempre: salirse de la carpeta. */
    const conRuta = ruta => ({ f: 'esle2-carpeta', v: 1, raiz: 'x',
      carpetas: [], archivos: [{ nombre: ruta, codigo: '', entrada: '' }] });
    for (const r of ['../afuera.sl', '../../a.sl', '/etc/passwd', 'a\\b.sl',
                     'a/../../b.sl', 'a\u0000.sl', './a.sl']) {
      comprobar('«' + JSON.stringify(r) + '» no entra', await malo(conRuta(r)) === null);
    }

    comprobar('un nombre que no es texto no entra',
      await malo({ f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [{ nombre: 5 }] }) === null);
    comprobar('un código que no es texto tampoco',
      await malo({ f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [{ nombre: 'a.sl', codigo: { largo: 1 } }] }) === null);
    comprobar('la misma ruta dos veces no entra',
      await malo({ f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [{ nombre: 'a.sl' }, { nombre: 'A.SL' }] }) === null);

    /* Lo que no es gzip. */
    comprobar('lo que no es gzip no pasa',
      await Carpeta.descomprimir(new Uint8Array([1, 2, 3, 4, 5])) === null);
    comprobar('vacío tampoco', await Carpeta.descomprimir(new Uint8Array(0)) === null);
    comprobar('null tampoco', await Carpeta.descomprimir(null) === null);

    /* Un archivo demasiado grande no se mira siquiera. */
    comprobar('uno de más de 2 MiB no se abre',
      await Carpeta.descomprimir(new Uint8Array(Carpeta.LIMITES.archivo + 1)) === null);

    /* La bomba: poco comprimido, muchísimo adentro. */
    {
      const enorme = { f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [{ nombre: 'a.sl', codigo: 'A'.repeat(8 * 1024 * 1024), entrada: '' }] };
      const bytes = await Carpeta.comprimir(enorme);
      comprobar('la bomba comprimida es chica', bytes.length < 200 * 1024, bytes.length);
      comprobar('y descomprimida se corta', await Carpeta.descomprimir(bytes) === null);
    }

    /* Los topes del proyecto, contra el resultado entero y no contra el paquete. */
    {
      const muchos = { f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [] };
      for (let i = 0; i < Proyecto.MAX_ARCHIVOS + 5; i++) {
        muchos.archivos.push({ nombre: 'a' + i + '.sl', codigo: '', entrada: '' });
      }
      const f = Carpeta.fundir(limpio, muchos, 'traido');
      comprobar('más archivos que el tope no entran', !!f.error, f.error);
      comprobar('y el error lo dice', /tope/.test(f.error || ''), f.error);
    }

    /* Un nombre que entra solo, pero no con la raíz adelante. */
    {
      const largo = { f: 'esle2-carpeta', v: 1, raiz: 'x', carpetas: [],
        archivos: [{ nombre: 'a'.repeat(58) + '.sl', codigo: '', entrada: '' }] };
      const f = Carpeta.fundir(limpio, largo, 'una-carpeta-con-nombre-largo');
      comprobar('el largo se mide con la carpeta destino adelante', !!f.error, f.error);
    }

    /* Y lo más importante: si algo falla, el proyecto no se toca. */
    {
      const e = estadoBase();
      const antes = JSON.stringify(e);
      Carpeta.fundir(e, { f: 'roto' }, 'traido');
      Carpeta.fundir(e, conRuta('../a.sl'), 'traido');
      comprobar('una importación que falla no toca el proyecto', JSON.stringify(e) === antes);
    }
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'las carpetas tienen fallos');
})();

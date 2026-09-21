/*
 * Prueba del modelo de versiones del proyecto (js/versiones.js).
 *
 * Lo que hay que asegurar es lo que de verdad importa cuando dos computadoras
 * trabajaron el mismo proyecto por separado: que unir sus historiales no
 * pierda nada, que un archivo tocado de un solo lado se lleve ese cambio
 * solo, que tocado de los dos lados avise en vez de elegir por su cuenta, y
 * que un paquete armado a mano (roto, con ids repetidos, con un ciclo) no
 * entre.
 *   node test/test-versiones.js
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
require(path.join(__dirname, '..', 'js', 'versiones.js'));
const { Versiones } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

/* Reloj e ids deterministas: nada de Date.now() en una prueba. */
let contador = 0;
const idFalso = () => 'id' + (++contador);
const relojFalso = (() => { let t = 1000; return () => (t += 1); })();
const opts = () => ({ generarId: idFalso, ahora: relojFalso });

const inst = archivos => ({ archivos, carpetas: [] });
const arch = (nombre, codigo, entrada) => ({ nombre, codigo, entrada: entrada || '' });

/* --------------------------- instantáneas y commit ---------------------- */
{
  comprobar('dos instantáneas con el mismo contenido en otro orden son iguales',
    Versiones.igualInstantanea(
      inst([arch('a.sl', '1'), arch('b.sl', '2')]),
      inst([arch('b.sl', '2'), arch('a.sl', '1')])
    ));

  let v = Versiones.vacio('clasico', idFalso);
  comprobar('arranca sin cabeza', v.cabeza === null);
  comprobar('con un id de proyecto propio', typeof v.idProyecto === 'string' && v.idProyecto.length > 0);

  v = Versiones.commit(v, inst([arch('a.sl', 'inicio\nfin')]), 'primera', opts());
  comprobar('el primer commit no tiene padres', Versiones.commitPorId(v, v.cabeza).padres.length === 0);
  comprobar('y guarda el mensaje', Versiones.commitPorId(v, v.cabeza).mensaje === 'primera');

  const cabezaAntes = v.cabeza;
  const mismo = Versiones.commit(v, inst([arch('a.sl', 'inicio\nfin')]), 'de nuevo lo mismo', opts());
  comprobar('el mismo contenido no crea una versión nueva', mismo === v && mismo.cabeza === cabezaAntes);

  v = Versiones.commit(v, inst([arch('a.sl', 'inicio\n   x = 1\nfin')]), 'segunda', opts());
  comprobar('el segundo commit sí cambió la cabeza', v.cabeza !== cabezaAntes);
  comprobar('y apunta al primero como padre', Versiones.commitPorId(v, v.cabeza).padres[0] === cabezaAntes);
  comprobar('el mensaje se recorta a 80 caracteres',
    Versiones.commit(v, inst([arch('a.sl', 'x')]), 'x'.repeat(200), opts())
      .confirmaciones.slice(-1)[0].mensaje.length === 80);
}

/* -------------------------------- ascendencia --------------------------- */
{
  let v = Versiones.vacio('clasico', idFalso);
  v = Versiones.commit(v, inst([arch('a.sl', '1')]), 'v1', opts());
  const id1 = v.cabeza;
  v = Versiones.commit(v, inst([arch('a.sl', '2')]), 'v2', opts());
  const id2 = v.cabeza;
  v = Versiones.commit(v, inst([arch('a.sl', '3')]), 'v3', opts());
  const id3 = v.cabeza;

  comprobar('v1 es antecesor de v3', Versiones.esAntecesor(v, id1, id3));
  comprobar('v3 no es antecesor de v1', !Versiones.esAntecesor(v, id3, id1));
  comprobar('una versión es antecesora de sí misma', Versiones.esAntecesor(v, id2, id2));
  comprobar('el antecesor común de v1 y v3 en una línea recta es v1',
    Versiones.ancestroComun(v, id1, id3) === id1);
  comprobar('sin cabeza, no hay antecesor', Versiones.ancestroComun(v, null, id1) === null);
}

/* --------------------------------- diff ---------------------------------- */
{
  const a = inst([arch('a.sl', '1'), arch('b.sl', '2')]);
  const b = inst([arch('a.sl', '1'), arch('c.sl', '3')]);
  const d = Versiones.diffArchivos(a, b);
  comprobar('detecta lo agregado', d.some(x => x.nombre === 'c.sl' && x.tipo === 'agregado'));
  comprobar('detecta lo eliminado', d.some(x => x.nombre === 'b.sl' && x.tipo === 'eliminado'));
  comprobar('lo igual no aparece', !d.some(x => x.nombre === 'a.sl'));
  comprobar('nada más que esos dos cambios', d.length === 2, JSON.stringify(d));

  const c = inst([arch('a.sl', '1'), arch('b.sl', 'distinto')]);
  const d2 = Versiones.diffArchivos(a, c);
  comprobar('un cambio de contenido es "modificado"', d2.some(x => x.nombre === 'b.sl' && x.tipo === 'modificado'));

  const conCarpeta = { archivos: [], carpetas: ['vacia'] };
  const sinCarpeta = { archivos: [], carpetas: [] };
  comprobar('una carpeta vacía nueva se nota',
    Versiones.diffArchivos(sinCarpeta, conCarpeta)[0].tipo === 'carpeta-agregada');
}

/* -------------------------------- combinar -------------------------------- */
{
  const base = inst([arch('a.sl', 'base'), arch('b.sl', 'base')]);

  /* Solo un lado tocó cada archivo: se llevan los dos cambios sin pedir nada. */
  const local1 = inst([arch('a.sl', 'local'), arch('b.sl', 'base')]);
  const remoto1 = inst([arch('a.sl', 'base'), arch('b.sl', 'remoto')]);
  const r1 = Versiones.combinar(base, local1, remoto1);
  comprobar('sin conflictos cuando cada lado tocó un archivo distinto', r1.conflictos.length === 0);
  comprobar('se lleva el cambio local de a.sl', r1.archivos.find(x => x.nombre === 'a.sl').codigo === 'local');
  comprobar('se lleva el cambio remoto de b.sl', r1.archivos.find(x => x.nombre === 'b.sl').codigo === 'remoto');

  /* Los dos tocaron el mismo archivo, pero llegaron a lo mismo. */
  const local2 = inst([arch('a.sl', 'igual'), arch('b.sl', 'base')]);
  const remoto2 = inst([arch('a.sl', 'igual'), arch('b.sl', 'base')]);
  comprobar('sin conflicto si los dos llegaron a lo mismo',
    Versiones.combinar(base, local2, remoto2).conflictos.length === 0);

  /* Los dos tocaron el mismo archivo, distinto: conflicto. */
  const local3 = inst([arch('a.sl', 'local'), arch('b.sl', 'base')]);
  const remoto3 = inst([arch('a.sl', 'remoto'), arch('b.sl', 'base')]);
  const r3 = Versiones.combinar(base, local3, remoto3);
  comprobar('conflicto cuando cada lado cambió lo mismo distinto', r3.conflictos.length === 1);
  comprobar('el conflicto trae las tres versiones', r3.conflictos[0].local.codigo === 'local' &&
    r3.conflictos[0].remoto.codigo === 'remoto' && r3.conflictos[0].base.codigo === 'base');
  comprobar('mientras tanto, b.sl —que nadie tocó— no se pierde', r3.archivos.some(x => x.nombre === 'b.sl'));

  /* Un lado borró, el otro modificó: conflicto, no se borra solo. */
  const localBorra = inst([arch('b.sl', 'base')]);           // a.sl borrado
  const remotoModifica = inst([arch('a.sl', 'cambiado'), arch('b.sl', 'base')]);
  const r4 = Versiones.combinar(base, localBorra, remotoModifica);
  comprobar('borrado contra modificación es conflicto', r4.conflictos.length === 1);

  /* Los dos borraron el mismo archivo: no hay nada que preguntar. */
  const local5 = inst([arch('b.sl', 'base')]);
  const remoto5 = inst([arch('b.sl', 'base')]);
  const r5 = Versiones.combinar(base, local5, remoto5);
  comprobar('los dos borrando lo mismo no es conflicto', r5.conflictos.length === 0 &&
    !r5.archivos.some(x => x.nombre === 'a.sl'));

  /* Una carpeta vacía se conserva si nadie le puso un archivo adentro. */
  const baseCarpeta = { archivos: [], carpetas: ['vacia'] };
  const localCarpeta = { archivos: [], carpetas: ['vacia'] };
  const remotoConArchivo = { archivos: [arch('vacia/x.sl', 'hola')], carpetas: [] };
  const r6 = Versiones.combinar(baseCarpeta, localCarpeta, remotoConArchivo);
  comprobar('la carpeta deja de estar "vacía" si el otro lado le metió un archivo',
    !r6.carpetas.includes('vacia'));
}

/* ------------------------------- fusionar grafos --------------------------- */
{
  let comun = Versiones.vacio('clasico', idFalso);
  comun = Versiones.commit(comun, inst([arch('a.sl', 'base')]), 'inicial', opts());
  const idBase = comun.cabeza;

  let local = Versiones.commit(comun, inst([arch('a.sl', 'local')]), 'cambio local', opts());
  let remoto = Versiones.commit(comun, inst([arch('a.sl', 'remoto')]), 'cambio remoto', opts());

  const fus = Versiones.fusionarGrafos(local, remoto);
  comprobar('unir dos grafos con el mismo origen no da error', !fus.error, fus.error);
  comprobar('el grafo unido tiene las tres versiones', fus.versionado.confirmaciones.length === 3);
  comprobar('el antecesor común de las dos puntas sigue siendo la inicial',
    Versiones.ancestroComun(fus.versionado, local.cabeza, remoto.cabeza) === idBase);

  const otroProyecto = Versiones.vacio('clasico', idFalso);
  comprobar('proyectos distintos no se unen', !!Versiones.fusionarGrafos(local, otroProyecto).error);

  /* Reimportar el mismo paquete no debería romper nada: mismo id, mismo
     contenido, se ignora. */
  const fus2 = Versiones.fusionarGrafos(fus.versionado, remoto);
  comprobar('reimportar el mismo historial es idempotente',
    !fus2.error && fus2.versionado.confirmaciones.length === 3);
}

/* --------------------------- paquete de intercambio ------------------------ */
{
  let v = Versiones.vacio('clasico', idFalso);
  v = Versiones.commit(v, inst([arch('a.sl', 'hola', 'entrada')]), 'primera', opts());
  const paquete = Versiones.empaquetar(v);
  const recuperado = Versiones.desempaquetar(paquete);
  comprobar('lo que se empaqueta se desempaqueta igual', !!recuperado &&
    recuperado.idProyecto === v.idProyecto && recuperado.cabeza === v.cabeza);

  comprobar('un paquete con otro formato no entra', Versiones.desempaquetar({ f: 'otracosa', v: 1 }) === null);
  comprobar('un paquete vacío no entra', Versiones.desempaquetar(null) === null);
  comprobar('un paquete sin versionado no entra', Versiones.desempaquetar({ f: 'esle2-proyecto', v: 1 }) === null);

  /* Una ruta con «..» adentro de un archivo ajeno: el mismo truco de
     siempre para escribir donde no corresponde. Tiene que rechazarse igual
     que en Carpeta.limpiar(). */
  const malicioso = {
    f: 'esle2-proyecto', v: 1,
    versionado: {
      formato: 'esle2-proyecto', idProyecto: 'x', variante: 'clasico', cabeza: 'c1',
      confirmaciones: [{ id: 'c1', padres: [], fecha: 1, mensaje: 'm', tipo: 'manual',
        instantanea: { archivos: [{ nombre: '../fuera.sl', codigo: 'x', entrada: '' }], carpetas: [] } }]
    }
  };
  comprobar('una ruta con «..» no entra', Versiones.desempaquetar(malicioso) === null);

  const ciclo = {
    f: 'esle2-proyecto', v: 1,
    versionado: {
      formato: 'esle2-proyecto', idProyecto: 'x', variante: 'clasico', cabeza: 'c1',
      confirmaciones: [
        { id: 'c1', padres: ['c2'], fecha: 1, mensaje: '', tipo: 'manual', instantanea: { archivos: [], carpetas: [] } },
        { id: 'c2', padres: ['c1'], fecha: 2, mensaje: '', tipo: 'manual', instantanea: { archivos: [], carpetas: [] } }
      ]
    }
  };
  comprobar('un historial en ciclo no entra', Versiones.desempaquetar(ciclo) === null);

  const idRepetido = {
    f: 'esle2-proyecto', v: 1,
    versionado: {
      formato: 'esle2-proyecto', idProyecto: 'x', variante: 'clasico', cabeza: 'c1',
      confirmaciones: [
        { id: 'c1', padres: [], fecha: 1, mensaje: '', tipo: 'manual', instantanea: { archivos: [], carpetas: [] } },
        { id: 'c1', padres: [], fecha: 2, mensaje: '', tipo: 'manual', instantanea: { archivos: [], carpetas: [] } }
      ]
    }
  };
  comprobar('un id repetido no entra', Versiones.desempaquetar(idRepetido) === null);
}

/* -------------------------------- guardar y leer ---------------------------- */
{
  let v = Versiones.vacio('clasico', idFalso);
  v = Versiones.commit(v, inst([arch('a.sl', 'hola')]), 'primera', opts());
  comprobar('se guarda', Versiones.guardar('prueba-versiones', v) === true);
  const leido = Versiones.cargar('prueba-versiones');
  comprobar('y se lee igual', !!leido && leido.cabeza === v.cabeza &&
    leido.confirmaciones.length === v.confirmaciones.length);

  almacen.set('rota', '{esto no es JSON');
  comprobar('una clave corrupta no rompe nada', Versiones.cargar('rota') === null);
  comprobar('sin nada guardado, null', Versiones.cargar('nunca-existió') === null);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'las versiones tienen fallos');

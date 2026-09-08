/*
 * Prueba del diagrama de la base y de su editor.
 *
 * Lo que importa acá es la vuelta completa: base → modelo → código → base.
 * Si el código que escribe el editor no vuelve a armar exactamente la misma
 * base, el diagrama estaría mintiendo, que es peor que no tenerlo.
 *
 *   node test/test-editor-bd.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sql.js'));
require(path.join(RAIZ, 'js', 'sle2bd.js'));
require(path.join(RAIZ, 'js', 'diagrama-bd.js'));
require(path.join(RAIZ, 'js', 'editor-bd.js'));

const { SQL, SLE2BD, DiagramaBD, EditorBD } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

function base(sql) {
  const b = SQL.crear();
  SQL.ejecutar(b, sql);
  return b;
}

const ESCUELA = `
CREATE TABLE ciudades (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);
CREATE TABLE alumnos (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad INTEGER REFERENCES ciudades (id),
  nota   REAL DEFAULT 0
);
CREATE TABLE notas (
  alumno INTEGER REFERENCES alumnos (id),
  nota   REAL
);
INSERT INTO ciudades VALUES (1, 'Asunción'), (2, 'Luque');
INSERT INTO alumnos VALUES (1, 'Ana', 1, 9), (2, 'Beto', NULL, 6);
INSERT INTO notas VALUES (1, 9), (1, 8);
`;

async function correr(codigo) {
  let salida = '';
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => { salida += t; }, limpiar: () => { salida = ''; },
    finEntrada: () => true, leerLinea: async () => null,
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
  try { const i = await SLE2BD.ejecutar(codigo, io, {}); return { salida, base: i.base, error: null }; }
  catch (e) { return { salida, error: e }; }
}

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Las capas ordenan por dependencia');
  {
    const t = SQL.tablas(base(ESCUELA));
    const capas = DiagramaBD.capas(t);
    comprobar('las tablas a las que se apunta van primero',
      capas[0].includes('ciudades') && capas[1].includes('alumnos') && capas[2].includes('notas'),
      JSON.stringify(capas));

    const rel = DiagramaBD.relaciones(t);
    comprobar('encuentra las dos relaciones', rel.length === 2, JSON.stringify(rel));
    comprobar('y sabe de dónde a dónde va cada una',
      rel.some(x => x.desde === 'alumnos' && x.hasta === 'ciudades' && x.hastaColumna === 'id'),
      JSON.stringify(rel));

    /* Un círculo no se puede ordenar, pero tampoco puede colgar el dibujo. */
    const circulo = [
      { nombre: 'a', filas: 0, columnas: [{ nombre: 'x', tipo: 'INTEGER', refiere: { tabla: 'b', columna: 'y' } }] },
      { nombre: 'b', filas: 0, columnas: [{ nombre: 'y', tipo: 'INTEGER', refiere: { tabla: 'a', columna: 'x' } }] }
    ];
    const c2 = DiagramaBD.capas(circulo);
    comprobar('un círculo no cuelga el acomodado', c2.flat().length === 2, JSON.stringify(c2));
  }

  /* ------------------------------------------------------------------ */
  seccion('El dibujo');
  {
    const d = DiagramaBD.generar(SQL.tablas(base(ESCUELA)));
    comprobar('sale un SVG con medidas', /^<svg /.test(d.svg) && d.ancho > 0 && d.alto > 0);
    comprobar('con una caja por tabla', d.cajas.length === 3, d.cajas.length);
    comprobar('y una línea por relación', d.lineas.length === 2, d.lineas.length);
    comprobar('el nombre de cada tabla está en el dibujo',
      ['ciudades', 'alumnos', 'notas'].every(n => d.svg.includes('>' + n + '<')), d.svg.slice(0, 200));
    comprobar('la clave primaria se marca', /🔑 id/.test(d.svg));
    /* Un nombre con < & " no puede romper el SVG: llega de la base, que la
       carga quien quiera, así que se escapa siempre. */
    const feo = DiagramaBD.generar([{
      nombre: 'a<b&c"d', filas: 0,
      columnas: [{ nombre: '<script>', tipo: 'TEXT', pk: false, noNulo: false, refiere: null }]
    }]);
    comprobar('los nombres se escapan en el SVG',
      feo.svg.includes('a&lt;b&amp;c&quot;d') && feo.svg.includes('&lt;script&gt;')
      && !/<script>/.test(feo.svg), feo.svg.slice(0, 400));

    const vacio = DiagramaBD.generar([]);
    comprobar('una base vacía se dibuja igual y lo dice',
      /^<svg /.test(vacio.svg) && /ninguna tabla/.test(vacio.svg), vacio.svg);

    const texto = d.texto;
    comprobar('la versión en palabras nombra las relaciones',
      /alumnos\.ciudad → ciudades\.id/.test(texto), texto);
    comprobar('y dice cuál es la clave primaria', /clave primaria/.test(texto));
  }

  /* ------------------------------------------------------------------ */
  seccion('Del modelo al código y de vuelta');
  {
    const original = SQL.tablas(base(ESCUELA));
    const modelo = EditorBD.desdeBase(original);
    comprobar('no hay problemas que informar', EditorBD.problemas(modelo).length === 0,
      JSON.stringify(EditorBD.problemas(modelo)));

    const codigo = EditorBD.codigo(modelo);
    const r = await correr(codigo);
    comprobar('el código generado corre', !r.error, r.error && (r.error.linea + ': ' + r.error.message));

    if (!r.error) {
      const vuelta = SQL.tablas(r.base);
      const limpiar = ts => JSON.stringify(ts.map(t => ({ ...t, filas: 0 })));
      comprobar('y arma exactamente la misma estructura',
        limpiar(vuelta) === limpiar(original), limpiar(vuelta) + '\n' + limpiar(original));

      /* Segunda vuelta: el código de un modelo sacado del código generado
         tiene que ser idéntico, o el editor perdería algo en cada pasada. */
      const otra = EditorBD.codigo(EditorBD.desdeBase(vuelta));
      comprobar('una segunda vuelta da el mismo código', otra === codigo, otra);
    }

    comprobar('el código pone las tablas en orden de creación',
      codigo.indexOf('CREAR TABLA ciudades') < codigo.indexOf('CREAR TABLA alumnos')
      && codigo.indexOf('CREAR TABLA alumnos') < codigo.indexOf('CREAR TABLA notas'), codigo);
    comprobar('y escribe las referencias', /REFERENCES ciudades \(id\)/.test(codigo), codigo);
    comprobar('el DEFAULT sobrevive', /DEFAULT 0/.test(codigo), codigo);

    const suelto = EditorBD.sql(modelo);
    comprobar('la versión suelta también corre', (() => {
      try { SQL.ejecutar(SQL.crear(), suelto); return true; } catch (e) { return e.message; }
    })() === true, suelto);
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que el editor no deja pasar');
  {
    const m = EditorBD.vacio();
    m.tablas.push(EditorBD.tabla('gente'));
    comprobar('una tabla recién creada ya sirve', EditorBD.problemas(m).length === 0,
      JSON.stringify(EditorBD.problemas(m)));

    m.tablas[0].nombre = 'con espacio';
    comprobar('un nombre con espacios se rechaza',
      EditorBD.problemas(m).some(p => /no llevar espacios/.test(p.mensaje)));

    m.tablas[0].nombre = 'gente';
    m.tablas[0].columnas.push(EditorBD.columna('id'));
    comprobar('una columna repetida se rechaza',
      EditorBD.problemas(m).some(p => /repetida/.test(p.mensaje)));

    m.tablas[0].columnas.pop();
    m.tablas[0].columnas.push(Object.assign(EditorBD.columna('ciudad'), { refiere: { tabla: 'ciudades', columna: 'id' } }));
    comprobar('apuntar a una tabla que no está se rechaza',
      EditorBD.problemas(m).some(p => /no está en el diagrama/.test(p.mensaje)));

    m.tablas.push(EditorBD.tabla('ciudades'));
    comprobar('y se acepta apenas la tabla existe', EditorBD.problemas(m).length === 0,
      JSON.stringify(EditorBD.problemas(m)));

    /* Apuntar a una columna que no es clave: no se sabría a qué fila. */
    m.tablas[1].columnas.push(EditorBD.columna('nombre'));
    m.tablas[0].columnas[1].refiere = { tabla: 'ciudades', columna: 'nombre' };
    comprobar('apuntar a una columna que se puede repetir se rechaza',
      EditorBD.problemas(m).some(p => /no es clave primaria ni única/.test(p.mensaje)));

    /* Un círculo. */
    const c = EditorBD.vacio();
    c.tablas.push(EditorBD.tabla('a'), EditorBD.tabla('b'));
    c.tablas[0].columnas.push(Object.assign(EditorBD.columna('haciaB'), { refiere: { tabla: 'b', columna: 'id' } }));
    c.tablas[1].columnas.push(Object.assign(EditorBD.columna('haciaA'), { refiere: { tabla: 'a', columna: 'id' } }));
    comprobar('un círculo se rechaza y se explica',
      EditorBD.problemas(c).some(p => /en círculo/.test(p.mensaje)),
      JSON.stringify(EditorBD.problemas(c)));
  }

  /* ------------------------------------------------------------------ */
  seccion('Las claves foráneas se cumplen');
  {
    const b = base(ESCUELA);
    const falla = t => { try { SQL.ejecutar(b, t); return null; } catch (e) { return e.message; } };
    comprobar('no se puede apuntar a una fila que no existe',
      /no hay ninguna fila con ciudades\.id/.test(falla("INSERT INTO alumnos VALUES (3,'Cata',99,7)") || ''),
      falla("INSERT INTO alumnos VALUES (4,'Dani',99,7)"));
    comprobar('NULL sí se admite: es «todavía no se sabe»',
      falla("INSERT INTO alumnos VALUES (5,'Eli',NULL,7)") === null);
    comprobar('un UPDATE tampoco puede romper la relación',
      /no hay ninguna fila/.test(falla('UPDATE alumnos SET ciudad = 77') || ''));
    comprobar('apuntar a una tabla que no existe se avisa al crear',
      /no existe/.test(falla('CREATE TABLE x (y INTEGER REFERENCES nohay (id))') || ''));
    comprobar('apuntar a una columna que se repite se avisa al crear',
      /no es PRIMARY KEY ni UNIQUE/.test(falla('CREATE TABLE x (y REFERENCES ciudades (nombre))') || ''));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el diagrama de la base tiene fallos');
})();

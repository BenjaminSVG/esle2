/*
 * Editor del diagrama de la base: se dibuja el diagrama y sale el código.
 *
 * El modelo es la lista de tablas con sus columnas; las flechas del diagrama
 * no son otra cosa: una relación ES una columna que dice a qué tabla apunta.
 * Se hizo así, y no con cajas que se arrastran y flechas que se pinchan, por
 * una razón concreta: de esta forma no existe el diagrama que se ve lindo
 * pero no se puede escribir en SQL. Lo que se dibuja siempre compila.
 *
 * El código sale ordenado por dependencia —primero las tablas a las que se
 * apunta— porque una clave foránea solo puede señalar algo que ya está, y
 * porque ese es el orden en que conviene explicarlas.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-editor-bd.js)
 *   EditorBD.vacio()                -> modelo sin tablas
 *   EditorBD.desdeBase(tablas)      -> modelo, a partir de SQL.tablas(base)
 *   EditorBD.codigo(modelo)         -> el programa de ESLE2 BD que la crea
 *   EditorBD.sql(modelo)            -> las mismas instrucciones, sueltas
 *   EditorBD.problemas(modelo)      -> [{ donde, mensaje }] antes de generar
 *   EditorBD.ordenar(modelo)        -> las tablas en orden de creación
 *   EditorBD.tabla(nombre) · EditorBD.columna(nombre)   -> piezas nuevas
 */
(function (global) {
  'use strict';

  const TIPOS = ['INTEGER', 'REAL', 'TEXT', 'VARCHAR(50)', 'DECIMAL(10,2)'];

  const vacio = () => ({ tablas: [] });

  const columna = nombre => ({
    nombre: nombre || 'columna', tipo: 'TEXT',
    pk: false, noNulo: false, unico: false, porDefecto: null, refiere: null
  });

  const tabla = nombre => ({
    nombre: nombre || 'tabla',
    columnas: [Object.assign(columna('id'), { tipo: 'INTEGER', pk: true, noNulo: true })]
  });

  function desdeBase(tablas) {
    return {
      tablas: (tablas || []).map(t => ({
        nombre: t.nombre,
        columnas: t.columnas.map(c => ({
          nombre: c.nombre, tipo: c.tipo || 'TEXT',
          pk: !!c.pk, noNulo: !!c.noNulo, unico: !!c.unico,
          porDefecto: c.porDefecto === undefined ? null : c.porDefecto,
          refiere: c.refiere ? { tabla: c.refiere.tabla, columna: c.refiere.columna } : null
        }))
      }))
    };
  }

  /* Orden de creación. Reusa el mismo cálculo de capas que el dibujo: si en
     el diagrama una tabla está más abajo, en el código va después. */
  function ordenar(modelo) {
    const tablas = modelo.tablas;
    if (!global.DiagramaBD) return tablas.slice();
    const porNombre = new Map(tablas.map(t => [t.nombre.toLowerCase(), t]));
    const out = [];
    for (const capa of global.DiagramaBD.capas(tablas))
      for (const n of capa) { const t = porNombre.get(n.toLowerCase()); if (t) out.push(t); }
    /* Por si algo quedó afuera (un nombre repetido, por ejemplo). */
    for (const t of tablas) if (!out.includes(t)) out.push(t);
    return out;
  }

  /* Lo que impediría crear la base, dicho antes de intentarlo. Es la misma
     lista que se le muestra a la persona debajo del diagrama. */
  function problemas(modelo) {
    const malos = [];
    const NOMBRE = /^[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*$/;
    const vistas = new Set();

    for (const t of modelo.tablas) {
      const donde = t.nombre || '(sin nombre)';
      if (!NOMBRE.test(t.nombre || ''))
        malos.push({ donde, mensaje: 'el nombre de la tabla tiene que empezar con una letra y no llevar espacios ni tildes' });
      if (vistas.has((t.nombre || '').toLowerCase()))
        malos.push({ donde, mensaje: 'hay dos tablas con este nombre' });
      vistas.add((t.nombre || '').toLowerCase());

      if (!t.columnas.length) malos.push({ donde, mensaje: 'la tabla no tiene ninguna columna' });
      if (t.columnas.filter(c => c.pk).length > 1)
        malos.push({ donde, mensaje: 'hay más de una clave primaria: en este motor la clave es de una sola columna' });

      const cols = new Set();
      for (const c of t.columnas) {
        if (!NOMBRE.test(c.nombre || ''))
          malos.push({ donde, mensaje: `el nombre de columna "${c.nombre}" no sirve: tiene que empezar con una letra y no llevar espacios ni tildes` });
        if (cols.has((c.nombre || '').toLowerCase()))
          malos.push({ donde, mensaje: `la columna "${c.nombre}" está repetida` });
        cols.add((c.nombre || '').toLowerCase());

        if (!c.refiere) continue;
        const otra = modelo.tablas.find(x => x.nombre.toLowerCase() === c.refiere.tabla.toLowerCase());
        if (!otra) {
          malos.push({ donde, mensaje: `"${c.nombre}" apunta a la tabla "${c.refiere.tabla}", que no está en el diagrama` });
          continue;
        }
        const destino = otra.columnas.find(x => x.nombre.toLowerCase() === String(c.refiere.columna || '').toLowerCase());
        if (!destino) {
          malos.push({ donde, mensaje: `"${c.nombre}" apunta a "${otra.nombre}.${c.refiere.columna}", que no existe` });
          continue;
        }
        if (!destino.pk && !destino.unico)
          malos.push({ donde, mensaje: `"${c.nombre}" apunta a "${otra.nombre}.${destino.nombre}", que no es clave primaria ni única: no se sabría a qué fila señala` });
      }
    }

    /* Un ciclo (A apunta a B y B a A) no se puede crear: alguna de las dos
       tendría que existir antes que la otra. */
    const orden = ordenar(modelo);
    const puestas = new Set();
    for (const t of orden) {
      for (const c of t.columnas) {
        if (!c.refiere) continue;
        const ref = c.refiere.tabla.toLowerCase();
        if (ref !== t.nombre.toLowerCase() && !puestas.has(ref)
            && modelo.tablas.some(x => x.nombre.toLowerCase() === ref))
          malos.push({ donde: t.nombre, mensaje: `"${t.nombre}" y "${c.refiere.tabla}" se apuntan en círculo: una de las dos tiene que poder crearse primero` });
      }
      puestas.add(t.nombre.toLowerCase());
    }
    return malos;
  }

  /* ------------------------------------------------------------------ */
  function textoValor(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }

  function unaTabla(t) {
    const ancho = Math.max(0, ...t.columnas.map(c => c.nombre.length));
    const cols = t.columnas.map(c => {
      const partes = [c.nombre.padEnd(ancho), c.tipo || 'TEXT'];
      if (c.pk) partes.push('PRIMARY KEY');
      else {
        if (c.unico) partes.push('UNIQUE');
        if (c.noNulo) partes.push('NOT NULL');
      }
      if (c.porDefecto !== null && c.porDefecto !== undefined)
        partes.push('DEFAULT ' + textoValor(c.porDefecto));
      if (c.refiere) partes.push('REFERENCES ' + c.refiere.tabla + ' (' + c.refiere.columna + ')');
      return '      ' + partes.join(' ');
    });
    return 'CREAR TABLA ' + t.nombre + ' (\n' + cols.join(',\n') + '\n   )';
  }

  /* Las instrucciones sueltas, para el panel «SQL a mano» o para copiar. */
  function sql(modelo) {
    return ordenar(modelo).map(t => unaTabla(t).replace(/\n {6}/g, '\n  ').replace(/\n {3}\)/, '\n)') + ';')
      .join('\n\n') + (modelo.tablas.length ? '\n' : '');
  }

  /* El programa entero, listo para pegar en el editor. */
  function codigo(modelo) {
    if (!modelo.tablas.length) return 'inicio\nfin\n';
    const partes = ordenar(modelo).map(t => '   ' + unaTabla(t));
    return '/*\n   Este programa lo escribió el editor de diagramas de ESLE2 BD.\n'
      + '   Las tablas van en orden de creación: primero las que reciben las\n'
      + '   flechas, porque una clave foránea solo puede apuntar a algo que ya está.\n*/\n'
      + 'inicio\n' + partes.join('\n\n') + '\nfin\n';
  }

  global.EditorBD = { vacio, tabla, columna, desdeBase, ordenar, problemas, codigo, sql, TIPOS };
})(typeof window !== 'undefined' ? window : globalThis);

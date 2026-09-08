/*
 * Exportar la base a SQLite, MySQL o PostgreSQL.
 *
 * Sale un archivo .sql de texto —el CREATE TABLE de cada tabla y los INSERT
 * de sus filas— para abrir en el motor de verdad. Un .sqlite binario no se
 * puede generar honestamente sin traer SQLite entero, y además un archivo de
 * texto se puede leer, corregir y entregar en un trabajo práctico, que es
 * para lo que hace falta acá.
 *
 * Los tres motores no escriben igual, y las diferencias son justamente lo que
 * conviene que se vea:
 *
 *   · los NOMBRES se protegen distinto: "así" en SQLite y PostgreSQL,
 *     `así` en MySQL;
 *   · los TIPOS no son los mismos. SQLite tiene cinco y le da igual; MySQL y
 *     PostgreSQL piden un tipo concreto, y un TEXT sin largo en MySQL no
 *     puede ser clave primaria, así que se traduce a VARCHAR(255);
 *   · el AUTOINCREMENT se llama distinto en cada uno, y en PostgreSQL ni
 *     siquiera es un modificador sino un tipo (SERIAL);
 *   · las comillas de un texto se escapan igual en los tres (duplicándolas),
 *     pero MySQL además interpreta la barra invertida, así que hay que
 *     escaparla.
 *
 * API:  ExportarSQL.exportar(base, { motor, conCrear, conDatos })
 *       ExportarSQL.MOTORES -> { sqlite, mysql, postgres }
 */
(function (global) {
  'use strict';

  const MOTORES = {
    sqlite: {
      nombre: 'SQLite',
      archivo: 'base.sqlite.sql',
      corre: 'sqlite3 base.db < base.sqlite.sql',
      cita: n => '"' + String(n).replace(/"/g, '""') + '"',
      barra: false,
      /* SQLite guarda lo que le den: los tipos son una afinidad, no una regla. */
      tipo: t => {
        const a = String(t || '').toUpperCase();
        if (/INT/.test(a)) return 'INTEGER';
        if (/REAL|FLOA|DOUB|DEC|NUM/.test(a)) return 'REAL';
        if (/BLOB/.test(a)) return 'BLOB';
        return /CHAR|VARCHAR/.test(a) ? a : 'TEXT';
      },
      cabecera: [
        '-- Base exportada desde ESLE2 BD (https://esle2.vercel.app)',
        '-- Para cargarla:  sqlite3 base.db < este-archivo.sql',
        'PRAGMA foreign_keys = ON;',
        'BEGIN TRANSACTION;'
      ],
      pie: ['COMMIT;']
    },
    mysql: {
      nombre: 'MySQL',
      archivo: 'base.mysql.sql',
      corre: 'mysql -u usuario -p base < base.mysql.sql',
      cita: n => '`' + String(n).replace(/`/g, '``') + '`',
      barra: true,
      tipo: (t, col) => {
        const a = String(t || '').toUpperCase();
        if (/INT/.test(a)) return 'INT';
        if (/REAL|FLOA|DOUB/.test(a)) return 'DOUBLE';
        if (/DEC|NUM/.test(a)) return a.replace(/^\w+/, 'DECIMAL');
        if (/^VARCHAR|^CHAR/.test(a)) return a;
        /* Un TEXT no puede ser clave primaria en MySQL sin decir el largo: se
           traduce a VARCHAR(255), que es lo que uno haría a mano. */
        return col && (col.pk || col.unico) ? 'VARCHAR(255)' : 'TEXT';
      },
      cabecera: [
        '-- Base exportada desde ESLE2 BD (https://esle2.vercel.app)',
        '-- Para cargarla:  mysql -u usuario -p nombre_de_la_base < este-archivo.sql',
        'SET NAMES utf8mb4;',
        'START TRANSACTION;'
      ],
      pie: ['COMMIT;']
    },
    postgres: {
      nombre: 'PostgreSQL',
      archivo: 'base.postgres.sql',
      corre: 'psql -d base -f base.postgres.sql',
      cita: n => '"' + String(n).replace(/"/g, '""') + '"',
      barra: false,
      tipo: t => {
        const a = String(t || '').toUpperCase();
        if (/BIGINT/.test(a)) return 'BIGINT';
        if (/INT/.test(a)) return 'INTEGER';
        if (/REAL|FLOA/.test(a)) return 'REAL';
        if (/DOUB/.test(a)) return 'DOUBLE PRECISION';
        if (/DEC|NUM/.test(a)) return a.replace(/^\w+/, 'NUMERIC');
        if (/^VARCHAR|^CHAR/.test(a)) return a;
        return 'TEXT';
      },
      cabecera: [
        '-- Base exportada desde ESLE2 BD (https://esle2.vercel.app)',
        '-- Para cargarla:  psql -d nombre_de_la_base -f este-archivo.sql',
        'BEGIN;'
      ],
      pie: ['COMMIT;']
    }
  };

  /* Un valor, escrito como lo escribiría una persona en ese motor. */
  function valor(v, m) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') {
      if (!isFinite(v)) return 'NULL';
      return Number.isInteger(v) ? String(v) : String(v);
    }
    if (typeof v === 'boolean') return v ? '1' : '0';
    let s = String(v).replace(/'/g, "''");
    /* MySQL interpreta la barra invertida adentro de un texto; los otros dos
       no. Escaparla de más en SQLite pondría una barra que no estaba. */
    if (m.barra) s = s.replace(/\\/g, '\\\\');
    return "'" + s + "'";
  }

  function crearTabla(t, m) {
    const cols = t.columnas.map(c => {
      const partes = [m.cita(c.nombre), m.tipo(c.tipo, c)];
      if (c.pk) partes.push('PRIMARY KEY');
      else {
        if (c.unico) partes.push('UNIQUE');
        if (c.noNulo) partes.push('NOT NULL');
      }
      if (c.porDefecto !== null && c.porDefecto !== undefined)
        partes.push('DEFAULT ' + valor(c.porDefecto, m));
      if (c.refiere)
        partes.push('REFERENCES ' + m.cita(c.refiere.tabla) + ' (' + m.cita(c.refiere.columna) + ')');
      return '  ' + partes.join(' ');
    });
    return 'CREATE TABLE ' + m.cita(t.nombre) + ' (\n' + cols.join(',\n') + '\n);';
  }

  function insertes(t, m) {
    if (!t.filas.length) return [];
    const cols = t.columnas.map(c => m.cita(c.nombre)).join(', ');
    /* De a cien filas por INSERT: un INSERT por fila hace archivos enormes y
       uno solo con diez mil filas revienta el límite de algunos clientes. */
    const trozos = [];
    for (let i = 0; i < t.filas.length; i += 100) {
      const grupo = t.filas.slice(i, i + 100).map(f =>
        '  (' + t.columnas.map(c => valor(f[c.nombre], m)).join(', ') + ')');
      trozos.push('INSERT INTO ' + m.cita(t.nombre) + ' (' + cols + ') VALUES\n'
        + grupo.join(',\n') + ';');
    }
    return trozos;
  }

  function exportar(base, opciones) {
    const o = opciones || {};
    const m = MOTORES[o.motor] || MOTORES.sqlite;
    const conCrear = o.conCrear !== false;
    const conDatos = o.conDatos !== false;

    const tablas = [...base.tablas.values()];
    const partes = m.cabecera.slice();
    partes.push('');

    if (conCrear) {
      /* Se borran en el orden inverso al de creación, por si alguna dependiera
         de otra: es lo que hace cualquier volcado. */
      for (const t of tablas.slice().reverse())
        partes.push('DROP TABLE IF EXISTS ' + m.cita(t.nombre) + ';');
      if (tablas.length) partes.push('');
    }

    for (const t of tablas) {
      if (conCrear) { partes.push(crearTabla(t, m)); partes.push(''); }
      if (conDatos) {
        const ins = insertes(t, m);
        if (ins.length) { partes.push(...ins); partes.push(''); }
      }
    }

    if (!tablas.length) partes.push('-- La base no tiene ninguna tabla todavía.', '');
    partes.push(...m.pie);
    return partes.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  }

  global.ExportarSQL = { exportar, MOTORES };
})(typeof window !== 'undefined' ? window : globalThis);

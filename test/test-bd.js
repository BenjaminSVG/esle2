/*
 * Prueba de ESLE2 BD: el dialecto y la exportación.
 *
 *   node test/test-bd.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sql.js'));
require(path.join(RAIZ, 'js', 'sle2bd.js'));
require(path.join(RAIZ, 'js', 'exportar-sql.js'));
const { SQL, SLE2BD, ExportarSQL } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

async function correr(codigo, base) {
  let salida = '';
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => { salida += t; },
    limpiar: () => { salida = ''; },
    finEntrada: () => true, leerLinea: async () => null,
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
  try {
    const i = await SLE2BD.ejecutar(codigo, io, base ? { base } : {});
    return { salida, base: i.base, error: null };
  } catch (e) {
    return { salida, error: e };
  }
}

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('El SL de siempre sigue andando igual');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr([
      'var',
      '   i, t : numerico',
      'inicio',
      '   t = 0',
      '   desde i = 1 hasta 4',
      '   {',
      '      t = t + i',
      '   }',
      '   imprimir ("total ", t, "\\n")',
      'fin',
      ''
    ].join('\n'));
    comprobar('un programa sin base corre igual', r.salida === 'total 10\n',
      JSON.stringify(r.salida) + (r.error ? ' / ' + r.error.message : ''));
  }

  /* ------------------------------------------------------------------ */
  seccion('Crear, insertar y consultar desde el programa');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr([
      'var',
      '   n, i : numerico',
      'inicio',
      '   sql ("CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT, nota REAL)")',
      '   sql ("INSERT INTO alumnos VALUES (1, \'Ana\', 9), (2, \'Beto\', 6), (3, \'Cata\', 8)")',
      '   n = consultar ("SELECT nombre, nota FROM alumnos WHERE nota >= 8 ORDER BY nota DESC")',
      '   imprimir ("aprobaron ", n, "\\n")',
      '   desde i = 1 hasta filas ()',
      '   {',
      '      imprimir (dato (i, 1), " sacó ", dato (i, "nota"), "\\n")',
      '   }',
      '   imprimir (columnas (), " columnas: ", columna (1), " y ", columna (2), "\\n")',
      'fin',
      ''
    ].join('\n'));
    comprobar('corre sin error', !r.error, r.error && r.error.message);
    comprobar('la consulta trae lo que corresponde',
      r.salida === 'aprobaron 2\nAna sacó 9\nCata sacó 8\n2 columnas: nombre y nota\n',
      JSON.stringify(r.salida));
    comprobar('y la base queda con la tabla', SQL.tablas(r.base).length === 1);
    comprobar('con sus tres filas', SQL.tablas(r.base)[0].filas === 3);
  }

  /* ------------------------------------------------------------------ */
  seccion('NULL no se confunde con vacío');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr([
      'inicio',
      '   sql ("CREATE TABLE t (a TEXT, b TEXT)")',
      '   sql ("INSERT INTO t VALUES (\'\', NULL)")',
      '   consultar ("SELECT a, b FROM t")',
      '   imprimir ("a vacía: ", hay_dato (1, 1), "\\n")',
      '   imprimir ("b nula: ", hay_dato (1, 2), "\\n")',
      'fin',
      ''
    ].join('\n'));
    comprobar('una cadena vacía SÍ es un dato', /a vacía: TRUE/.test(r.salida),
      JSON.stringify(r.salida));
    comprobar('y un NULL no', /b nula: FALSE/.test(r.salida), JSON.stringify(r.salida));
  }

  /* ------------------------------------------------------------------ */
  seccion('mostrar() dibuja la tabla');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr([
      'inicio',
      '   sql ("CREATE TABLE t (id INTEGER, nombre TEXT)")',
      '   sql ("INSERT INTO t VALUES (1, \'Ana\'), (2, NULL)")',
      '   consultar ("SELECT * FROM t ORDER BY id")',
      '   mostrar ()',
      'fin',
      ''
    ].join('\n'));
    comprobar('sale la cabecera', /^id\s+nombre/m.test(r.salida), JSON.stringify(r.salida));
    comprobar('sale la línea de guiones', /^-+\s+-+$/m.test(r.salida), JSON.stringify(r.salida));
    comprobar('las filas quedan alineadas', /^1\s+Ana$/m.test(r.salida), JSON.stringify(r.salida));
    comprobar('un NULL se ve como NULL y no como un hueco',
      /^2\s+NULL$/m.test(r.salida), JSON.stringify(r.salida));
    comprobar('y dice cuántas filas', /2 fila\(s\)/.test(r.salida), JSON.stringify(r.salida));
  }

  /* ------------------------------------------------------------------ */
  seccion('Los errores de SQL se cuentan como los de SL');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr('inicio\n   sql ("SELECT * FROM noexiste")\nfin\n');
    comprobar('el error llega', !!r.error);
    comprobar('dice que es de SQL', /^SQL:/.test(r.error.message), r.error.message);
    comprobar('con la línea del programa', r.error.linea === 2, String(r.error.linea));
    comprobar('y con la sugerencia del motor', !!r.error.sugerencia, r.error.sugerencia);

    const r2 = await correr('inicio\n   imprimir (dato (1, 1))\nfin\n');
    comprobar('pedir un dato sin consultar avisa',
      r2.error && /ninguna consulta/.test(r2.error.message), r2.error && r2.error.message);

    const r3 = await correr([
      'inicio',
      '   sql ("CREATE TABLE t (a INTEGER)")',
      '   consultar ("SELECT a FROM t")',
      '   imprimir (dato (1, 1))',
      'fin', ''
    ].join('\n'));
    comprobar('pedir una fila que no vino avisa',
      r3.error && /no hay una fila 1/.test(r3.error.message), r3.error && r3.error.message);

    const r4 = await correr([
      'inicio',
      '   sql ("CREATE TABLE t (a INTEGER)")',
      '   sql ("INSERT INTO t VALUES (1)")',
      '   consultar ("SELECT a FROM t")',
      '   imprimir (dato (1, "zzz"))',
      'fin', ''
    ].join('\n'));
    comprobar('pedir una columna que no vino avisa, y dice cuáles vinieron',
      r4.error && /no trajo una columna "zzz"/.test(r4.error.message)
      && /Trajo: a/.test(r4.error.sugerencia || ''),
      r4.error && (r4.error.message + ' / ' + r4.error.sugerencia));

    const r5 = await correr([
      'inicio',
      '   sql ("CREATE TABLE t (a INTEGER)")',
      '   consultar ("INSERT INTO t VALUES (1)")',
      'fin', ''
    ].join('\n'));
    comprobar('consultar() con algo que no es SELECT avisa',
      r5.error && /espera un SELECT/.test(r5.error.message), r5.error && r5.error.message);
  }

  /* ------------------------------------------------------------------ */
  seccion('Recorrer las tablas de la base');
  /* ------------------------------------------------------------------ */
  {
    const r = await correr([
      'var',
      '   i : numerico',
      'inicio',
      '   sql ("CREATE TABLE uno (a INTEGER)")',
      '   sql ("CREATE TABLE dos (b INTEGER)")',
      '   desde i = 1 hasta tablas ()',
      '   {',
      '      imprimir (nombre_tabla (i), "\\n")',
      '   }',
      'fin', ''
    ].join('\n'));
    comprobar('se pueden listar las tablas', r.salida === 'uno\ndos\n', JSON.stringify(r.salida));
  }

  /* ------------------------------------------------------------------ */
  seccion('La base se puede compartir entre ejecuciones');
  /* ------------------------------------------------------------------ */
  {
    const base = SQL.crear();
    await correr('inicio\n   sql ("CREATE TABLE t (a INTEGER)")\n   sql ("INSERT INTO t VALUES (7)")\nfin\n', base);
    const r = await correr('inicio\n   consultar ("SELECT a FROM t")\n   imprimir (dato (1, 1))\nfin\n', base);
    comprobar('el segundo programa ve lo que dejó el primero', r.salida === '7',
      JSON.stringify(r.salida) + (r.error ? ' / ' + r.error.message : ''));
  }

  /* ------------------------------------------------------------------ */
  seccion('Exportar a los tres motores');
  /* ------------------------------------------------------------------ */
  {
    const b = SQL.crear();
    /* Sin comillas en el nombre: "clientes" ahora es un texto, no un
       identificador citado (las comillas dobles pasaron a ser la otra forma
       de escribir una cadena, como en el pseudocódigo de MySQL). Para citar
       un nombre se usan acentos graves o corchetes. */
    SQL.ejecutar(b, `CREATE TABLE clientes (
        id INTEGER PRIMARY KEY,
        nombre VARCHAR(60) NOT NULL,
        saldo DECIMAL(10,2) DEFAULT 0,
        nota TEXT
      )`);
    SQL.ejecutar(b, `INSERT INTO clientes VALUES
        (1, 'Ana', 100.5, NULL),
        (2, 'O''Brien', 0, 'con \\ barra y ''comillas''')`);

    for (const motor of ['sqlite', 'mysql', 'postgres']) {
      const m = ExportarSQL.MOTORES[motor];
      const sql = ExportarSQL.exportar(b, { motor });
      comprobar(`${m.nombre}: dice de dónde salió`, /ESLE2 BD/.test(sql));
      comprobar(`${m.nombre}: dice cómo cargarlo`, sql.includes(m.corre.split(' ')[0]),
        sql.split('\n')[2]);
      comprobar(`${m.nombre}: crea la tabla`, /CREATE TABLE/.test(sql));
      comprobar(`${m.nombre}: la borra antes por las dudas`, /DROP TABLE IF EXISTS/.test(sql));
      comprobar(`${m.nombre}: mete las dos filas`,
        (sql.match(/^\s*\(/gm) || []).length === 2, String((sql.match(/^\s*\(/gm) || []).length));
      comprobar(`${m.nombre}: el NULL sale como NULL`, /, NULL\)/.test(sql), sql);
      comprobar(`${m.nombre}: la comilla se duplica`, /O''Brien/.test(sql));
      comprobar(`${m.nombre}: abre y cierra la transacción`,
        /BEGIN|START TRANSACTION/.test(sql) && /COMMIT;/.test(sql));
      comprobar(`${m.nombre}: la clave primaria queda declarada`, /PRIMARY KEY/.test(sql));
      comprobar(`${m.nombre}: y el NOT NULL`, /NOT NULL/.test(sql));
      comprobar(`${m.nombre}: y el DEFAULT`, /DEFAULT 0/.test(sql));
    }

    const sqlite = ExportarSQL.exportar(b, { motor: 'sqlite' });
    const mysql = ExportarSQL.exportar(b, { motor: 'mysql' });
    const pg = ExportarSQL.exportar(b, { motor: 'postgres' });

    comprobar('SQLite y PostgreSQL protegen los nombres con comillas dobles',
      /"clientes"/.test(sqlite) && /"clientes"/.test(pg));
    comprobar('MySQL con acentos graves', /`clientes`/.test(mysql), mysql.split('\n')[6]);
    comprobar('el DECIMAL se traduce en cada motor',
      /REAL/.test(sqlite) && /DECIMAL\(10,2\)/.test(mysql) && /NUMERIC\(10,2\)/.test(pg),
      [sqlite, mysql, pg].map(x => (x.match(/saldo[^,\n]*/) || [''])[0]).join(' | '));
    comprobar('solo MySQL escapa la barra invertida',
      /con \\\\ barra/.test(mysql) && /con \\ barra/.test(sqlite) && !/con \\\\ barra/.test(sqlite),
      [mysql, sqlite].map(x => (x.match(/con \\+ barra/) || [''])[0]).join(' | '));

    /* Lo exportado tiene que poder volver a entrar: es la prueba de que el
       volcado dice lo mismo que la base. */
    const b2 = SQL.crear();
    let volvio = true, err = null;
    try {
      SQL.ejecutar(b2, sqlite.split('\n')
        .filter(l => !/^PRAGMA|^BEGIN|^COMMIT|^SET NAMES|^START/.test(l.trim())).join('\n'));
    } catch (e) { volvio = false; err = e; }
    comprobar('el volcado de SQLite se puede volver a cargar', volvio, err && err.message);
    if (volvio) {
      const a = SQL.ejecutar(b, 'SELECT * FROM clientes ORDER BY id')[0];
      const c = SQL.ejecutar(b2, 'SELECT * FROM clientes ORDER BY id')[0];
      comprobar('y queda exactamente la misma base',
        JSON.stringify(a.filas) === JSON.stringify(c.filas),
        JSON.stringify(a.filas) + '\n' + JSON.stringify(c.filas));
    }

    const vacia = ExportarSQL.exportar(SQL.crear(), { motor: 'sqlite' });
    comprobar('una base vacía se exporta igual y lo dice',
      /no tiene ninguna tabla/.test(vacia), vacia);
    comprobar('se puede exportar solo la estructura',
      !/INSERT INTO/.test(ExportarSQL.exportar(b, { motor: 'sqlite', conDatos: false })));
    comprobar('o solo los datos',
      !/CREATE TABLE/.test(ExportarSQL.exportar(b, { motor: 'sqlite', conCrear: false })));
  }

  /* ------------------------------------------------------------------ */
  seccion('SQL escrito directo, sin sql()');
  {
    const lineas = s => s.split('\n').length;
    for (const src of ['CREAR TABLA t (a INTEGER)',
                       'CREAR TABLA t (\n  a INTEGER,\n  b TEXT\n)',
                       'SELECCIONAR *\nDE t\nDONDE a > 1']) {
      const p = 'inicio\n' + src + '\nfin\n';
      const t = SLE2BD.aSQL(p);
      comprobar('la traducción conserva los renglones: ' + JSON.stringify(src.slice(0, 22)),
        lineas(t) === lineas(p), t);
      comprobar('y envuelve la instrucción: ' + JSON.stringify(src.slice(0, 22)),
        /sql_directo \(/.test(t), t);
    }

    /* Lo que NO es una instrucción tiene que quedar intacto: una variable que
       se llama como un verbo, un comentario, un texto. */
    const intacto = `var
   crear : numerico
inicio
   crear = 1
   imprimir ("SELECCIONAR * DE nada\\n")
   // CREAR TABLA en un comentario
fin
`;
    comprobar('no toca variables, comentarios ni textos',
      SLE2BD.aSQL(intacto) === intacto, SLE2BD.aSQL(intacto));

    const unaVez = SLE2BD.aSQL('inicio\nSELECCIONAR * DE t\nfin\n');
    comprobar('traducir dos veces da lo mismo', SLE2BD.aSQL(unaVez) === unaVez);

    /* El ejemplo del tutorial de MySQL, copiado tal cual y sin sql(). */
    let r = await correr(`inicio
   Crear base de datos makarenko;
   Usar makarenko;
   Crear tabla clientes(
      Id_c int (2),
      Nombre char(15),
      Apellido char(15) );
   Insertar dentro clientes (id_c, nombre, apellido)
   Valores (01, "Rogelio", "Sanchez"),
   Valores (02, "Sandra", "Leon");
   Seleccionar nombre, apellido de clientes;
fin
`);
    comprobar('el ejemplo del tutorial corre escrito directo',
      !r.error && /Rogelio/.test(r.salida) && /Sanchez/.test(r.salida),
      r.error ? r.error.message : r.salida);

    /* Sin ";" y repartido en varios renglones, que es como se escribe acá. */
    r = await correr(`inicio
   CREAR TABLA alumnos (
      id     INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      nota   REAL
   )

   INSERTAR DENTRO alumnos VALORES
      (1, 'Ana', 9),
      (2, 'Beto', 6)

   ACTUALIZAR alumnos
   CONJUNTO nota = nota + 1
   DONDE nombre = 'Beto'

   SELECCIONAR nombre, nota
   DE alumnos
   ORDER BY nota DESC
fin
`);
    comprobar('sin ";" y en varios renglones', !r.error && /Ana/.test(r.salida),
      r.error ? r.error.message : r.salida);
    comprobar('y el ACTUALIZAR llegó entero, con su DONDE', /Beto\s+7/.test(r.salida), r.salida);

    r = await correr(`var
   i : numerico
inicio
   CREAR TABLA t (n INTEGER)
   desde i = 1 hasta 3
   {
      INSERTAR DENTRO t VALORES (@i * 10)
   }
   SELECCIONAR * DE t ORDER BY n
   imprimir ("hay ", filas (), " filas\\n")
fin
`);
    comprobar('mezclado con SL, adentro de un ciclo, con @variable',
      !r.error && /hay 3 filas/.test(r.salida) && /30/.test(r.salida),
      r.error ? r.error.message : r.salida);

    r = await correr(`var
   quien : cadena
inicio
   quien = "O'Higgins"
   CREAR TABLA gente (nombre TEXT, correo TEXT)
   INSERTAR DENTRO gente VALORES (@quien, 'ana@casa.com')
   SELECCIONAR * DE gente DONDE nombre = @quien
fin
`);
    comprobar('@variable cita el texto, y el "@" de una cadena queda como está',
      !r.error && /O'Higgins/.test(r.salida) && /ana@casa\.com/.test(r.salida),
      r.error ? r.error.message : r.salida);

    r = await correr(`inicio
   CREAR TABLA t (n INTEGER)
   INSERTAR DENTRO t VALORES (1), (2), (3)
   BORRAR DE t DONDE n > 1
   imprimir ("borradas: ", afectadas (), "\\n")
fin
`);
    comprobar('afectadas() dice cuántas filas tocó la última instrucción',
      !r.error && /borradas: 2/.test(r.salida), r.error ? r.error.message : r.salida);

    r = await correr(`inicio
   imprimir ("hola\\n")
   SELECCIONAR * DE noexiste
fin
`);
    comprobar('un error de SQL señala la línea del editor',
      r.error && r.error.linea === 3, r.error && (r.error.linea + ': ' + r.error.message));

    r = await correr(`inicio
   sql ("CREATE TABLE t (n INTEGER)")
   sql ("INSERT INTO t VALUES (5)")
   consultar ("SELECT * FROM t")
   mostrar ()
fin
`);
    comprobar('sql() y consultar() siguen andando igual',
      !r.error && /\b5\b/.test(r.salida), r.error ? r.error.message : r.salida);
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa entero en español');
  /* ------------------------------------------------------------------ */
  /* Lo que importa acá no es el motor —eso lo prueba test-sql.js— sino que el
     traductor sepa dónde empieza y dónde termina una instrucción escrita en
     español y repartida en varios renglones, que es como se escribe cuando la
     consulta crece. */
  {
    let r = await correr(`inicio
   CREAR TABLA ventas (id ENTERO CLAVE PRIMARIA, ciudad TEXTO, monto REAL)
   INSERTAR DENTRO ventas VALORES (1, "Luque", 10), (2, "Luque", 20), (3, "Asuncion", 5)
   SELECCIONAR ciudad, SUMAR(monto) COMO total
      DE ventas
      AGRUPAR POR ciudad
      TENIENDO SUMAR(monto) > 6
      ORDENAR POR total DESCENDENTE
fin
`);
    comprobar('una consulta española de varios renglones es una sola instrucción',
      !r.error && /Luque/.test(r.salida) && /30/.test(r.salida),
      r.error ? r.error.linea + ': ' + r.error.message : r.salida);
    comprobar('y no se coló la ciudad que el TENIENDO dejó afuera',
      !r.error && !/Asuncion/.test(r.salida), r.salida);

    /* Recorrer el resultado desde SL, con la consulta también en español. */
    r = await correr(`var
   i, cuantas : numerico
inicio
   CREAR TABLA t (n ENTERO)
   INSERTAR DENTRO t VALORES (4), (7)
   cuantas = consultar ("SELECCIONAR n DE t ORDENAR POR n")
   desde i = 1 hasta cuantas
   {
      imprimir (str (dato (i, 1), 0, 0) + "\\n")
   }
fin
`);
    comprobar('consultar() acepta la consulta en español',
      !r.error && r.salida === '4\n7\n', r.error ? r.error.message : JSON.stringify(r.salida));

    /* La instrucción cortada justo después de un Y sigue en el renglón de
       abajo: «y» tuvo que entrar en la lista de palabras que no cierran. */
    r = await correr(`inicio
   CREAR TABLA p (x ENTERO, y ENTERO)
   INSERTAR DENTRO p VALORES (1, 5), (9, 9)
   SELECCIONAR x DE p DONDE x > 0 Y
      y < 7
fin
`);
    comprobar('un renglón que termina en Y sigue abajo',
      !r.error && /\b1\b/.test(r.salida) && !/\b9\b/.test(r.salida),
      r.error ? r.error.linea + ': ' + r.error.message : r.salida);
  }

  /* ------------------------------------------------------------------ */
  seccion('Los ejemplos que trae la página');
  {
    require(path.join(RAIZ, 'js', 'bd-ejemplos.js'));
    for (const e of global.BD_EJEMPLOS) {
      const r = await correr(e.codigo);
      comprobar('corre sin error: ' + e.nombre, !r.error,
        r.error && (r.error.linea + ': ' + r.error.message));
      comprobar('y no deja avisos del revisor: ' + e.nombre,
        SLE2BD.revisar(e.codigo).length === 0, JSON.stringify(SLE2BD.revisar(e.codigo)));
    }
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'ESLE2 BD tiene fallos');
})();

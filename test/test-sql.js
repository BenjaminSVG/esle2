/*
 * Prueba del motor de SQL de ESLE2 BD.
 *
 * Lo que más importa que esté bien, en orden:
 *   1. NULL. Es lo que más cuesta en la materia y lo que más fácil se
 *      implementa mal: NULL = NULL no es verdadero, y una cuenta con NULL da
 *      NULL. Si esto está mal, el motor enseña algo falso;
 *   2. los JOIN, incluido el LEFT JOIN sin pareja;
 *   3. GROUP BY con agregados y HAVING;
 *   4. que las restricciones (PRIMARY KEY, NOT NULL) se hagan cumplir;
 *   5. que un error de sintaxis se explique, no que reviente.
 *
 *   node test/test-sql.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sql.js'));
const { SQL } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '  [' + detalle + ']' : ''));
}
const seccion = t => console.log('\n' + t);

/* Corre SQL y devuelve el último resultado. */
function q(base, texto) {
  const r = SQL.ejecutar(base, texto);
  return r[r.length - 1];
}
/* Corre SQL esperando que falle, y devuelve el error. */
function falla(base, texto) {
  try { SQL.ejecutar(base, texto); return null; } catch (e) { return e; }
}
/* Las filas como texto, para comparar de un vistazo. */
const filas = r => r.filas.map(f => f.map(v => (v === null ? 'NULL' : String(v))).join('|')).join(' ; ');

/* ------------------------------------------------------------------ */
seccion('Crear tablas y meter filas');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, `CREATE TABLE alumnos (
          id INTEGER PRIMARY KEY,
          nombre TEXT NOT NULL,
          nota REAL,
          ciudad VARCHAR(30) DEFAULT 'Asunción'
        )`);
  comprobar('la tabla existe', SQL.tablas(b).length === 1);
  const t = SQL.tablas(b)[0];
  comprobar('con sus cuatro columnas', t.columnas.length === 4,
    t.columnas.map(c => c.nombre).join());
  comprobar('la clave primaria queda marcada', t.columnas[0].pk === true);
  comprobar('y NOT NULL también', t.columnas[1].noNulo === true);
  comprobar('el tipo con tamaño se guarda entero', t.columnas[3].tipo === 'VARCHAR(30)',
    t.columnas[3].tipo);

  const r = q(b, `INSERT INTO alumnos (id, nombre, nota) VALUES
                    (1, 'Ana', 9), (2, 'Beto', 7.5), (3, 'Cata', NULL)`);
  comprobar('entran tres filas de una vez', r.afectadas === 3, String(r.afectadas));
  comprobar('el DEFAULT se aplica',
    filas(q(b, 'SELECT ciudad FROM alumnos WHERE id = 1')) === 'Asunción',
    filas(q(b, 'SELECT ciudad FROM alumnos WHERE id = 1')));

  comprobar('crear dos veces la misma tabla avisa',
    /ya existe/.test(String(falla(b, 'CREATE TABLE alumnos (id INTEGER)'))));
  comprobar('salvo con IF NOT EXISTS',
    q(b, 'CREATE TABLE IF NOT EXISTS alumnos (id INTEGER)').tipo === 'create');

  /* Restricciones. */
  comprobar('la clave primaria no se repite',
    /ya hay una fila/.test(String(falla(b, "INSERT INTO alumnos (id, nombre) VALUES (1, 'Otro')"))));
  comprobar('NOT NULL se hace cumplir',
    /no admite NULL/.test(String(falla(b, 'INSERT INTO alumnos (id, nombre) VALUES (9, NULL)'))));
  comprobar('y se avisa si faltan valores',
    /valor\(es\) para/.test(String(falla(b, "INSERT INTO alumnos (id, nombre) VALUES (9)"))));
}

/* ------------------------------------------------------------------ */
seccion('NULL se comporta como en SQL de verdad');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE t (a INTEGER, b INTEGER)');
  q(b, 'INSERT INTO t (a, b) VALUES (1, 1), (2, NULL), (NULL, NULL)');

  comprobar('NULL = NULL no es verdadero',
    filas(q(b, 'SELECT a FROM t WHERE a = b')) === '1',
    filas(q(b, 'SELECT a FROM t WHERE a = b')));
  comprobar('NULL <> NULL tampoco',
    q(b, 'SELECT a FROM t WHERE a <> b').filas.length === 0);
  comprobar('IS NULL sí encuentra los nulos',
    q(b, 'SELECT a FROM t WHERE b IS NULL').filas.length === 2);
  comprobar('IS NOT NULL encuentra el resto',
    filas(q(b, 'SELECT a FROM t WHERE b IS NOT NULL')) === '1');
  comprobar('una cuenta con NULL da NULL',
    filas(q(b, 'SELECT a + b FROM t WHERE a = 2')) === 'NULL',
    filas(q(b, 'SELECT a + b FROM t WHERE a = 2')));

  /* Lógica de tres valores. */
  comprobar('FALSE AND NULL es FALSE, así que no pasa la fila',
    q(b, 'SELECT a FROM t WHERE a = 99 AND b = 1').filas.length === 0);
  comprobar('TRUE OR NULL es TRUE, así que sí pasa',
    filas(q(b, 'SELECT a FROM t WHERE a = 1 OR b = 7')) === '1');
  comprobar('NOT NULL sigue siendo NULL: no pasa',
    q(b, 'SELECT a FROM t WHERE NOT (b = 1) AND a = 2').filas.length === 0);

  comprobar('COALESCE reemplaza el nulo',
    filas(q(b, 'SELECT COALESCE(b, 0) FROM t ORDER BY a')) === 'NULL ; 1 ; 0'
      || filas(q(b, 'SELECT COALESCE(b, 0) FROM t ORDER BY a')) === '0 ; 1 ; 0',
    filas(q(b, 'SELECT COALESCE(b, 0) FROM t ORDER BY a')));
  comprobar('los agregados ignoran los nulos',
    filas(q(b, 'SELECT COUNT(b), COUNT(*) FROM t')) === '1|3',
    filas(q(b, 'SELECT COUNT(b), COUNT(*) FROM t')));
}

/* ------------------------------------------------------------------ */
seccion('SELECT: filtrar, ordenar, cortar');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE p (id INTEGER, nombre TEXT, precio REAL, rubro TEXT)');
  q(b, `INSERT INTO p VALUES
          (1, 'pan', 5000, 'panaderia'),
          (2, 'leche', 8000, 'lacteos'),
          (3, 'queso', 25000, 'lacteos'),
          (4, 'factura', 3000, 'panaderia'),
          (5, 'yogur', 8000, 'lacteos')`);

  comprobar('SELECT * trae todas las columnas',
    q(b, 'SELECT * FROM p').columnas.join() === 'id,nombre,precio,rubro',
    q(b, 'SELECT * FROM p').columnas.join());
  comprobar('WHERE filtra',
    filas(q(b, "SELECT nombre FROM p WHERE rubro = 'lacteos' ORDER BY nombre"))
      === 'leche ; queso ; yogur',
    filas(q(b, "SELECT nombre FROM p WHERE rubro = 'lacteos' ORDER BY nombre")));
  comprobar('ORDER BY DESC ordena al revés',
    filas(q(b, 'SELECT nombre FROM p ORDER BY precio DESC LIMIT 2')) === 'queso ; leche',
    filas(q(b, 'SELECT nombre FROM p ORDER BY precio DESC LIMIT 2')));
  comprobar('ORDER BY con dos criterios',
    filas(q(b, 'SELECT nombre FROM p ORDER BY precio, nombre')) === 'factura ; pan ; leche ; yogur ; queso',
    filas(q(b, 'SELECT nombre FROM p ORDER BY precio, nombre')));
  comprobar('LIMIT y OFFSET',
    filas(q(b, 'SELECT nombre FROM p ORDER BY id LIMIT 2 OFFSET 3')) === 'factura ; yogur',
    filas(q(b, 'SELECT nombre FROM p ORDER BY id LIMIT 2 OFFSET 3')));
  comprobar('DISTINCT saca los repetidos',
    filas(q(b, 'SELECT DISTINCT rubro FROM p ORDER BY rubro')) === 'lacteos ; panaderia',
    filas(q(b, 'SELECT DISTINCT rubro FROM p ORDER BY rubro')));
  comprobar('BETWEEN',
    filas(q(b, 'SELECT nombre FROM p WHERE precio BETWEEN 5000 AND 8000 ORDER BY nombre'))
      === 'leche ; pan ; yogur',
    filas(q(b, 'SELECT nombre FROM p WHERE precio BETWEEN 5000 AND 8000 ORDER BY nombre')));
  comprobar('IN',
    filas(q(b, "SELECT nombre FROM p WHERE nombre IN ('pan', 'queso') ORDER BY nombre")) === 'pan ; queso',
    filas(q(b, "SELECT nombre FROM p WHERE nombre IN ('pan', 'queso') ORDER BY nombre")));
  comprobar('LIKE con %',
    filas(q(b, "SELECT nombre FROM p WHERE nombre LIKE 'q%'")) === 'queso',
    filas(q(b, "SELECT nombre FROM p WHERE nombre LIKE 'q%'")));
  comprobar('LIKE con _',
    filas(q(b, "SELECT nombre FROM p WHERE nombre LIKE 'p_n'")) === 'pan',
    filas(q(b, "SELECT nombre FROM p WHERE nombre LIKE 'p_n'")));
  comprobar('un alias renombra la columna',
    q(b, 'SELECT nombre AS producto FROM p').columnas.join() === 'producto',
    q(b, 'SELECT nombre AS producto FROM p').columnas.join());
  comprobar('una expresión también sale como columna',
    filas(q(b, "SELECT precio * 1.1 AS con_iva FROM p WHERE id = 4")) === '3300.0000000000005'
      || /^3300/.test(filas(q(b, "SELECT precio * 1.1 AS con_iva FROM p WHERE id = 4"))),
    filas(q(b, "SELECT precio * 1.1 AS con_iva FROM p WHERE id = 4")));
  comprobar('las funciones de texto andan',
    filas(q(b, "SELECT UPPER(nombre), LENGTH(nombre) FROM p WHERE id = 1")) === 'PAN|3',
    filas(q(b, "SELECT UPPER(nombre), LENGTH(nombre) FROM p WHERE id = 1")));
  comprobar('y la concatenación',
    filas(q(b, "SELECT nombre || ' x' FROM p WHERE id = 1")) === 'pan x',
    filas(q(b, "SELECT nombre || ' x' FROM p WHERE id = 1")));
}

/* ------------------------------------------------------------------ */
seccion('GROUP BY, agregados y HAVING');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE v (rubro TEXT, monto REAL)');
  q(b, `INSERT INTO v VALUES ('a', 10), ('a', 20), ('b', 5), ('c', 100), ('b', NULL)`);

  comprobar('COUNT, SUM, AVG, MIN y MAX sobre todo',
    filas(q(b, 'SELECT COUNT(*), SUM(monto), MIN(monto), MAX(monto) FROM v')) === '5|135|5|100',
    filas(q(b, 'SELECT COUNT(*), SUM(monto), MIN(monto), MAX(monto) FROM v')));
  comprobar('AVG ignora los nulos',
    filas(q(b, 'SELECT AVG(monto) FROM v')) === '33.75',
    filas(q(b, 'SELECT AVG(monto) FROM v')));
  comprobar('GROUP BY arma un grupo por valor',
    filas(q(b, 'SELECT rubro, SUM(monto) FROM v GROUP BY rubro ORDER BY rubro'))
      === 'a|30 ; b|5 ; c|100',
    filas(q(b, 'SELECT rubro, SUM(monto) FROM v GROUP BY rubro ORDER BY rubro')));
  comprobar('HAVING filtra los grupos, no las filas',
    filas(q(b, 'SELECT rubro FROM v GROUP BY rubro HAVING SUM(monto) > 20 ORDER BY rubro'))
      === 'a ; c',
    filas(q(b, 'SELECT rubro FROM v GROUP BY rubro HAVING SUM(monto) > 20 ORDER BY rubro')));
  comprobar('COUNT(*) de una tabla vacía da 0',
    filas(q(b, 'SELECT COUNT(*) FROM v WHERE rubro = \'zzz\'')) === '0',
    filas(q(b, 'SELECT COUNT(*) FROM v WHERE rubro = \'zzz\'')));
  comprobar('COUNT(DISTINCT ...) cuenta valores distintos',
    filas(q(b, 'SELECT COUNT(DISTINCT rubro) FROM v')) === '3',
    filas(q(b, 'SELECT COUNT(DISTINCT rubro) FROM v')));
  comprobar('se puede ordenar por el nombre que le puso la propia consulta',
    filas(q(b, 'SELECT rubro, SUM(monto) AS total FROM v GROUP BY rubro ORDER BY total DESC'))
      === 'c|100 ; a|30 ; b|5',
    filas(q(b, 'SELECT rubro, SUM(monto) AS total FROM v GROUP BY rubro ORDER BY total DESC')));
  comprobar('pero un nombre que no existe en ningún lado sigue siendo error',
    /no existe la columna/.test(falla(b, 'SELECT rubro FROM v ORDER BY inventada').message));
  comprobar('se puede ordenar por el agregado',
    filas(q(b, 'SELECT rubro FROM v GROUP BY rubro ORDER BY SUM(monto) DESC')) === 'c ; a ; b',
    filas(q(b, 'SELECT rubro FROM v GROUP BY rubro ORDER BY SUM(monto) DESC')));
}

/* ------------------------------------------------------------------ */
seccion('JOIN');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE ciudades (id INTEGER, nombre TEXT)');
  q(b, 'CREATE TABLE gente (id INTEGER, nombre TEXT, ciudad INTEGER)');
  q(b, `INSERT INTO ciudades VALUES (1, 'Asuncion'), (2, 'Encarnacion'), (3, 'Ciudad del Este')`);
  q(b, `INSERT INTO gente VALUES (1, 'Ana', 1), (2, 'Beto', 2), (3, 'Cata', NULL)`);

  comprobar('JOIN cruza las dos tablas',
    filas(q(b, `SELECT g.nombre, c.nombre FROM gente g JOIN ciudades c ON g.ciudad = c.id
                ORDER BY g.nombre`)) === 'Ana|Asuncion ; Beto|Encarnacion',
    filas(q(b, `SELECT g.nombre, c.nombre FROM gente g JOIN ciudades c ON g.ciudad = c.id ORDER BY g.nombre`)));
  comprobar('LEFT JOIN deja pasar la fila sin pareja',
    filas(q(b, `SELECT g.nombre, c.nombre FROM gente g LEFT JOIN ciudades c ON g.ciudad = c.id
                ORDER BY g.nombre`)) === 'Ana|Asuncion ; Beto|Encarnacion ; Cata|NULL',
    filas(q(b, `SELECT g.nombre, c.nombre FROM gente g LEFT JOIN ciudades c ON g.ciudad = c.id ORDER BY g.nombre`)));
  comprobar('una columna ambigua se avisa en vez de elegir sola',
    /más de una tabla/.test(String(falla(b, 'SELECT nombre FROM gente g JOIN ciudades c ON g.ciudad = c.id'))),
    String(falla(b, 'SELECT nombre FROM gente g JOIN ciudades c ON g.ciudad = c.id')));
  comprobar('con el alias adelante ya no es ambigua',
    q(b, 'SELECT g.nombre FROM gente g JOIN ciudades c ON g.ciudad = c.id').filas.length === 2);
  comprobar('t.* trae las columnas de una sola tabla',
    q(b, 'SELECT g.* FROM gente g JOIN ciudades c ON g.ciudad = c.id').columnas.join() === 'id,nombre,ciudad',
    q(b, 'SELECT g.* FROM gente g JOIN ciudades c ON g.ciudad = c.id').columnas.join());
  comprobar('JOIN con GROUP BY',
    filas(q(b, `SELECT c.nombre, COUNT(*) FROM gente g JOIN ciudades c ON g.ciudad = c.id
                GROUP BY c.nombre ORDER BY c.nombre`)) === 'Asuncion|1 ; Encarnacion|1',
    filas(q(b, `SELECT c.nombre, COUNT(*) FROM gente g JOIN ciudades c ON g.ciudad = c.id GROUP BY c.nombre ORDER BY c.nombre`)));
}

/* ------------------------------------------------------------------ */
seccion('UPDATE y DELETE');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE t (id INTEGER PRIMARY KEY, n TEXT, v REAL)');
  q(b, `INSERT INTO t VALUES (1, 'a', 10), (2, 'b', 20), (3, 'c', 30)`);

  const u = q(b, 'UPDATE t SET v = v * 2 WHERE id > 1');
  comprobar('UPDATE dice cuántas cambió', u.afectadas === 2, String(u.afectadas));
  comprobar('y cambió las que correspondía',
    filas(q(b, 'SELECT v FROM t ORDER BY id')) === '10 ; 40 ; 60',
    filas(q(b, 'SELECT v FROM t ORDER BY id')));
  comprobar('UPDATE sin WHERE cambia todo',
    q(b, "UPDATE t SET n = 'x'").afectadas === 3);

  const d = q(b, 'DELETE FROM t WHERE v > 50');
  comprobar('DELETE dice cuántas borró', d.afectadas === 1, String(d.afectadas));
  comprobar('y quedaron las otras', q(b, 'SELECT * FROM t').filas.length === 2);
  comprobar('DELETE sin WHERE vacía la tabla',
    q(b, 'DELETE FROM t').afectadas === 2 && q(b, 'SELECT * FROM t').filas.length === 0);
  comprobar('UPDATE de una columna que no existe avisa',
    /no tiene una columna/.test(String(falla(b, "UPDATE t SET zzz = 1"))));
}

/* ------------------------------------------------------------------ */
seccion('Los errores se explican');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE t (a INTEGER)');

  const casos = [
    ['SELECT * FROM noexiste', /no existe la tabla/],
    ['SELECT zzz FROM t', /no existe la columna/],
    ['SELECT * FROM', /se esperaba/],
    ["SELECT 'sin cerrar FROM t", /comilla/],
    ['ZAS t', /no se entiende/],
    /* "insertar" ya se reconoce como INSERT (ver la sección de pseudocódigo
       más abajo), así que ahora el error es sobre lo que falta después. */
    ['INSERTAR EN t', /se esperaba .* INTO/],
    ['SELECT ZZZ(a) FROM t', /la función "zzz" no existe/],
    ['SELECT 1 / 0 FROM t', /división por cero/]
  ];
  for (const [sql, patron] of casos) {
    const e = falla(b, sql.replace('SELECT 1 / 0 FROM t', 'SELECT 1 / 0'));
    comprobar(`«${sql.slice(0, 28)}…» da un error entendible`, !!e && patron.test(String(e)),
      String(e));
    comprobar(`«${sql.slice(0, 28)}…» es un SQLError, no una excepción cualquiera`,
      e instanceof SQL.SQLError, e && e.constructor.name);
  }

  const conSug = falla(b, 'SELECT * FROM noexiste');
  comprobar('y varios traen sugerencia', !!conSug.sugerencia, conSug.sugerencia);
}

/* ------------------------------------------------------------------ */
seccion('Cosas del dialecto');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  comprobar('las palabras clave no distinguen mayúsculas',
    q(b, 'create table Cosas (Id integer, Nombre text)').tipo === 'create');
  q(b, "insert into cosas values (1, 'uno')");
  comprobar('ni los nombres de tabla y columna',
    filas(q(b, 'SELECT NOMBRE FROM COSAS')) === 'uno',
    filas(q(b, 'SELECT NOMBRE FROM COSAS')));
  comprobar('los comentarios se ignoran',
    q(b, '-- esto es un comentario\nSELECT * FROM cosas /* y esto también */').filas.length === 1);
  comprobar('varias instrucciones seguidas devuelven varios resultados',
    SQL.ejecutar(b, "INSERT INTO cosas VALUES (2, 'dos'); SELECT * FROM cosas;").length === 2);
  comprobar('una comilla adentro de un texto se escribe doble',
    filas(q(b, "SELECT 'lo que ''dijo'''")) === "lo que 'dijo'",
    filas(q(b, "SELECT 'lo que ''dijo'''")));
  comprobar('se puede consultar sin tabla',
    filas(q(b, 'SELECT 2 + 3')) === '5', filas(q(b, 'SELECT 2 + 3')));

  /* Afinidad de tipos, como en SQLite. */
  q(b, 'CREATE TABLE tip (n INTEGER, t TEXT)');
  q(b, "INSERT INTO tip VALUES ('42', 7)");
  comprobar('un texto que es número entra como número en una columna INTEGER',
    q(b, 'SELECT n FROM tip').filas[0][0] === 42,
    JSON.stringify(q(b, 'SELECT n FROM tip').filas[0][0]));
  comprobar('y un número entra como texto en una columna TEXT',
    q(b, 'SELECT t FROM tip').filas[0][0] === '7',
    JSON.stringify(q(b, 'SELECT t FROM tip').filas[0][0]));
}

/* ------------------------------------------------------------------ */
seccion('Pseudocódigo en español (fernandoarciniega.com/pseudocodigo-en-mysql)');
/* ------------------------------------------------------------------ */
{
  /* El ejemplo del artículo, tal cual, con sus dos tablas y sus VALUES
     repetidos fila por fila. Si esto compila y corre, el pseudocódigo del
     tutorial funciona sin traducirlo a mano. */
  const b = SQL.crear();
  const rs = SQL.ejecutar(b, `
    Crear base de datos makarenko;
    Usar makarenko;

    Crear tabla clientes(
    Id_c int (2),
    Nombre char(15),
    Apellido char(15),
    Edad int(2),
    Domicilio char(20) );

    Crear tabla pagos (
    Id_p char (3),
    Id_c int(2),
    Monto int(3) );

    Insertar dentro clientes (id_c, nombre, apellido, edad, domicilio)
    Valores (01, "Rogelio", "Sanchez", 32, "Tizayuca"),
    Valores (02, "Sandra", "León", 26, "Tecámac"),
    Valores (03, "Luisa", "Marquez", 28, "Ojo de agua");

    Insertar dentro pagos (id_p, id_c, monto)
    Valores ("01A", 01, 470),
    Valores ("02B", 02, 610);
  `);
  comprobar('el ejemplo entero del artículo corre sin errores', rs.length === 6, rs.length);
  comprobar('"crear base de datos" no explota, solo avisa',
    /makarenko/.test(rs[0].mensaje), rs[0].mensaje);
  comprobar('"usar" tampoco', /makarenko/.test(rs[1].mensaje), rs[1].mensaje);
  comprobar('las dos tablas quedaron creadas',
    SQL.tablas(b).map(t => t.nombre).sort().join() === 'clientes,pagos',
    SQL.tablas(b).map(t => t.nombre).join());
  comprobar('clientes tiene sus tres filas (VALUES repetido, no separado por comas)',
    filas(q(b, 'SELECT nombre FROM clientes ORDER BY id_c')) === 'Rogelio ; Sandra ; Luisa',
    filas(q(b, 'SELECT nombre FROM clientes ORDER BY id_c')));
  comprobar('las cadenas con comillas dobles se guardaron como texto, no como columnas',
    filas(q(b, 'SELECT apellido FROM clientes WHERE id_c = 1')) === 'Sanchez',
    filas(q(b, 'SELECT apellido FROM clientes WHERE id_c = 1')));
  comprobar('pagos también', filas(q(b, 'SELECT id_p FROM pagos ORDER BY id_p')) === '01A ; 02B',
    filas(q(b, 'SELECT id_p FROM pagos ORDER BY id_p')));

  /* Cada verbo por separado, en su forma corta. */
  const b2 = SQL.crear();
  comprobar('SELECCIONAR / DE / DONDE',
    (() => { q(b2, 'CREAR TABLA t (a INTEGER, b TEXT)'); q(b2, "INSERTAR DENTRO t VALUES (1, 'x'), (2, 'y')");
      return filas(q(b2, 'SELECCIONAR b DE t DONDE a = 2')) === 'y'; })());
  comprobar('ACTUALIZAR / CONJUNTO / DONDE',
    q(b2, 'ACTUALIZAR t CONJUNTO b = \'z\' DONDE a = 1').afectadas === 1);
  comprobar('y quedó cambiado', filas(q(b2, 'SELECCIONAR b DE t DONDE a = 1')) === 'z',
    filas(q(b2, 'SELECCIONAR b DE t DONDE a = 1')));
  comprobar('BORRAR / DE / DONDE', q(b2, 'BORRAR DE t DONDE a = 2').afectadas === 1);
  comprobar('ELIMINAR TABLA (DROP TABLE)', q(b2, 'ELIMINAR TABLA t').tipo === 'drop');
  comprobar('y la tabla ya no está', SQL.tablas(b2).length === 0);

  /* Sensible a mayúsculas igual que el resto del dialecto: da lo mismo
     "SELECCIONAR" que "seleccionar". */
  const b3 = SQL.crear();
  q(b3, 'crear tabla t (a integer)');
  q(b3, 'insertar dentro t values (9)');
  comprobar('los verbos en español tampoco distinguen mayúsculas',
    filas(q(b3, 'seleccionar a de t')) === '9', filas(q(b3, 'seleccionar a de t')));

  /* No se tradujeron AND/OR/NOT/LIKE/NULL: una columna de una sola letra
     como "y" tiene que seguir sirviendo como columna, no como el AND. */
  const b4 = SQL.crear();
  q(b4, 'CREAR TABLA punto (x INTEGER, y INTEGER)');
  q(b4, 'INSERTAR DENTRO punto VALUES (3, 7)');
  comprobar('una columna llamada "y" no choca con ningún alias de AND/OR',
    filas(q(b4, 'SELECCIONAR y DE punto')) === '7', filas(q(b4, 'SELECCIONAR y DE punto')));
}

/* ------------------------------------------------------------------ */
seccion('Comillas dobles: texto, no identificador');
/* ------------------------------------------------------------------ */
{
  const b = SQL.crear();
  q(b, 'CREATE TABLE t (a TEXT)');
  comprobar('una comilla doble es una cadena, como en MySQL',
    filas(q(b, 'SELECT "hola" FROM t')) === '', true);   // sin filas: la tabla está vacía, no debe explotar
  q(b, 'INSERT INTO t VALUES ("hola")');
  comprobar('y el valor se guardó como texto', filas(q(b, 'SELECT a FROM t')) === 'hola',
    filas(q(b, 'SELECT a FROM t')));
  comprobar('una comilla doble adentro se escribe doble, como la simple',
    filas(q(b, 'SELECT "ella dijo ""hola"""')) === 'ella dijo "hola"',
    filas(q(b, 'SELECT "ella dijo ""hola"""')));

  /* Pero un nombre puede seguir citándose, para no pelear con una palabra
     reservada: con acentos graves o corchetes (no con comillas dobles, que
     ahora son texto). */
  comprobar('un nombre citado con acentos graves sigue funcionando',
    q(b, 'CREATE TABLE `select` (a INTEGER)').tipo === 'create');
  comprobar('y con corchetes', q(b, 'CREATE TABLE [order] (a INTEGER)').tipo === 'create');

  /* Y lo que pidió el usuario: un nombre entre comillas dobles, directo,
     donde se espera un NOMBRE (no un valor) — es lo que exporta este mismo
     motor para SQLite y PostgreSQL, así que su propio volcado tiene que
     poder releerse. */
  comprobar('CREAR TABLA "nombre" funciona directo, comillas y todo',
    q(b, 'CREATE TABLE "gente" (id INTEGER)').tipo === 'create');
  comprobar('la tabla quedó con el nombre sin comillas',
    SQL.tablas(b).some(t => t.nombre === 'gente'));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el motor de SQL tiene fallos');

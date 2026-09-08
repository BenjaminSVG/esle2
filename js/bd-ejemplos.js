/*
 * Ejemplos de ESLE2 BD, de menos a más.
 *
 * El primero es el que aparece al entrar: tiene que crear una tabla, meter
 * datos y consultarlos en pocas líneas, para que se entienda de qué se trata
 * sin leer la documentación.
 */
(function (global) {
  'use strict';

  global.BD_EJEMPLOS = [
    {
      nombre: 'Crear, insertar y consultar',
      codigo: `/*
   Las instrucciones de la base se escriben solas, como una sentencia más.
   Un SELECCIONAR suelto imprime su tabla.

   Las palabras van en español o en inglés, como se prefiera: CREAR TABLA
   o CREATE TABLE, SELECCIONAR ... DE o SELECT ... FROM.
*/
inicio
   CREAR TABLA alumnos (
      id     INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      nota   REAL
   )

   INSERTAR DENTRO alumnos VALORES
      (1, 'Ana',  9),
      (2, 'Beto', 6),
      (3, 'Cata', 8),
      (4, 'Dani', NULL)

   SELECCIONAR nombre, nota
   DE alumnos
   ORDER BY nota DESC
fin
`
    },
    {
      nombre: 'Recorrer el resultado fila por fila',
      codigo: `/*
   Un SELECCIONAR suelto imprime la tabla y además deja el resultado listo
   para recorrer con filas() y dato(). Si no se quiere que lo imprima,
   está consultar(), que hace lo mismo callado.
*/
var
   i : numerico
inicio
   CREAR TABLA alumnos (nombre TEXT, nota REAL)
   INSERTAR DENTRO alumnos VALORES ('Ana', 9), ('Beto', 6), ('Cata', 8)

   consultar ("SELECCIONAR nombre, nota DE alumnos ORDER BY nombre")
   imprimir ("Vinieron ", filas (), " filas\\n\\n")

   desde i = 1 hasta filas ()
   {
      imprimir (dato (i, "nombre"), ": ", dato (i, "nota"))
      si (dato (i, "nota") >= 7)
      {
         imprimir ("  (aprobó)")
      }
      imprimir ("\\n")
   }
fin
`
    },
    {
      nombre: 'Cargar la base desde el programa',
      codigo: `/*
   Adentro de una instrucción, «@nombre» es el valor de esa variable de SL.
   ESLE2 BD lo cita como corresponde: los números van tal cual y el texto
   entre comillas simples, sin que haya que acordarse de ponerlas.
*/
var
   i : numerico
   par : cadena
inicio
   CREAR TABLA numeros (n INTEGER, cuadrado INTEGER, par TEXT)

   desde i = 1 hasta 10
   {
      si (i % 2 == 0)
      {
         par = "sí"
      sino
         par = "no"
      }
      INSERTAR DENTRO numeros VALORES (@i, @i * @i, @par)
   }

   SELECCIONAR * DE numeros DONDE par = 'sí' ORDER BY n

   imprimir ("\\nLa suma de los cuadrados pares:\\n")
   SELECCIONAR SUM (cuadrado) DE numeros DONDE par = 'sí'
fin
`
    },
    {
      nombre: 'NULL no es cero ni vacío',
      codigo: `/*
   NULL quiere decir "no se sabe", y no es lo mismo que 0 ni que "".
   Por eso NULL = NULL no da verdadero: hay que preguntar IS NULL.
   En SL no existe el nulo, así que para distinguirlo está hay_dato().
*/
var
   i : numerico
inicio
   CREAR TABLA gente (nombre TEXT, edad INTEGER)
   INSERTAR DENTRO gente VALORES ('Ana', 30), ('Beto', NULL), ('Cata', 0)

   imprimir ("Con = NULL no encuentra a nadie:\\n")
   SELECCIONAR nombre DE gente DONDE edad = NULL

   imprimir ("\\nCon IS NULL sí:\\n")
   SELECCIONAR nombre DE gente DONDE edad IS NULL

   imprimir ("\\nY el promedio ignora los nulos, no los cuenta como cero:\\n")
   SELECCIONAR AVG (edad), COUNT (edad), COUNT (*) DE gente

   imprimir ("\\nDesde el programa:\\n")
   consultar ("SELECCIONAR nombre, edad DE gente ORDER BY nombre")
   desde i = 1 hasta filas ()
   {
      imprimir (dato (i, 1), ": ")
      si (hay_dato (i, 2))
      {
         imprimir (dato (i, 2), "\\n")
      sino
         imprimir ("no se sabe\\n")
      }
   }
fin
`
    },
    {
      nombre: 'Dos tablas y un JOIN',
      codigo: `/*
   REFERENCES dice que la columna «ciudad» no guarda un nombre de ciudad sino
   el id de una fila de la tabla ciudades. Eso es una relación, y es lo que
   dibuja la flecha en «Base → Diagrama de la base».

   Además se hace cumplir: un id de ciudad que no existe se rechaza. NULL sí
   se admite, y quiere decir «todavía no se sabe en cuál vive».
*/
inicio
   CREAR TABLA ciudades (
      id     INTEGER PRIMARY KEY,
      nombre TEXT
   )
   CREAR TABLA gente (
      nombre TEXT,
      ciudad INTEGER REFERENCES ciudades (id)
   )

   INSERTAR DENTRO ciudades VALORES (1, 'Asunción'), (2, 'Encarnación'), (3, 'Luque')
   INSERTAR DENTRO gente VALORES ('Ana', 1), ('Beto', 2), ('Cata', 1), ('Dani', NULL)

   imprimir ("Con JOIN, Dani no aparece porque no tiene ciudad:\\n")
   SELECCIONAR g.nombre, c.nombre
   DE gente g
   JOIN ciudades c ON g.ciudad = c.id
   ORDER BY g.nombre

   imprimir ("\\nCon LEFT JOIN sí, con la ciudad en NULL:\\n")
   SELECCIONAR g.nombre, c.nombre
   DE gente g
   LEFT JOIN ciudades c ON g.ciudad = c.id
   ORDER BY g.nombre

   imprimir ("\\nCuánta gente por ciudad:\\n")
   SELECCIONAR c.nombre, COUNT (*) AS cuantos
   DE gente g
   JOIN ciudades c ON g.ciudad = c.id
   GROUP BY c.nombre
   ORDER BY cuantos DESC
fin
`
    },
    {
      nombre: 'Agrupar, filtrar grupos y ordenar',
      codigo: `inicio
   CREAR TABLA ventas (
      producto TEXT,
      rubro    TEXT,
      monto    REAL
   )
   INSERTAR DENTRO ventas VALORES
      ('pan',      'panadería', 15000),
      ('factura',  'panadería',  9000),
      ('leche',    'lácteos',   24000),
      ('queso',    'lácteos',   75000),
      ('yogur',    'lácteos',   12000),
      ('jabón',    'limpieza',   8000)

   imprimir ("Total por rubro:\\n")
   SELECCIONAR rubro, COUNT (*) AS productos, SUM (monto) AS total
   DE ventas
   GROUP BY rubro
   ORDER BY total DESC

   imprimir ("\\nSolo los rubros que pasan de 20000 (eso es HAVING):\\n")
   SELECCIONAR rubro, SUM (monto) AS total
   DE ventas
   GROUP BY rubro
   HAVING SUM (monto) > 20000
   ORDER BY rubro

   imprimir ("\\nWHERE filtra filas, HAVING filtra grupos:\\n")
   SELECCIONAR rubro, SUM (monto) AS total
   DE ventas
   DONDE monto > 10000
   GROUP BY rubro
   ORDER BY rubro
fin
`
    },
    {
      nombre: 'Modificar y borrar',
      codigo: `/*
   Una instrucción escrita directa es una sentencia, no una expresión: para
   saber a cuántas filas tocó se pregunta después con afectadas().
*/
inicio
   CREAR TABLA stock (
      id       INTEGER PRIMARY KEY,
      producto TEXT,
      cantidad INTEGER
   )
   INSERTAR DENTRO stock VALORES (1, 'pan', 10), (2, 'leche', 0), (3, 'queso', 3)

   ACTUALIZAR stock CONJUNTO cantidad = cantidad + 5 DONDE cantidad < 5
   imprimir ("Se repusieron ", afectadas (), " producto(s)\\n\\n")

   SELECCIONAR * DE stock ORDER BY id

   BORRAR DE stock DONDE cantidad > 9
   imprimir ("\\nSe sacaron ", afectadas (), " producto(s) de la lista\\n\\n")

   SELECCIONAR * DE stock ORDER BY id
fin
`
    },
    {
      nombre: 'Armar la consulta con el programa',
      codigo: `/*
   Cuando lo que cambia no es un valor sino la consulta entera —la columna
   por la que se ordena, por ejemplo— la instrucción se arma como cadena y
   se la manda con sql() o consultar().
*/
var
   orden : cadena
   i : numerico
inicio
   CREAR TABLA alumnos (nombre TEXT, nota REAL)
   INSERTAR DENTRO alumnos VALORES ('Ana', 9), ('Beto', 6), ('Cata', 8)

   desde i = 1 hasta 2
   {
      si (i == 1)
      {
         orden = "nombre"
      sino
         orden = "nota DESC"
      }
      imprimir ("Ordenado por ", orden, ":\\n")
      sql ("SELECCIONAR * DE alumnos ORDER BY " + orden)
      mostrar ()
      imprimir ("\\n")
   }
fin
`
    }
  ];

  /* Los datos que crea «Base → Datos de ejemplo»: sirven para practicar
     consultas sin tener que escribir los INSERT cada vez. */
  global.BD_DATOS_EJEMPLO = `
DROP TABLE IF EXISTS alumnos;
DROP TABLE IF EXISTS materias;
DROP TABLE IF EXISTS ciudades;
CREATE TABLE ciudades (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  depto  TEXT
);
CREATE TABLE alumnos (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad INTEGER REFERENCES ciudades (id),
  nota   REAL
);
CREATE TABLE materias (
  id     INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL,
  horas  INTEGER
);
INSERT INTO ciudades VALUES
  (1, 'Asunción', 'Capital'),
  (2, 'Encarnación', 'Itapúa'),
  (3, 'Luque', 'Central'),
  (4, 'Ciudad del Este', 'Alto Paraná');
INSERT INTO alumnos VALUES
  (1, 'Ana Ramírez',   1, 9),
  (2, 'Beto Cáceres',  2, 6),
  (3, 'Cata Duarte',   1, 8),
  (4, 'Dani Ojeda',    3, NULL),
  (5, 'Elsa Benítez',  1, 10),
  (6, 'Fabio Rojas',   4, 4),
  (7, 'Gaby Núñez',    NULL, 7);
INSERT INTO materias VALUES
  (1, 'Programación I', 96),
  (2, 'Base de Datos',  64),
  (3, 'Álgebra',        80);
`;
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Ejemplos de ESLE2 BD, de menos a más.
 *
 * El primero es el que aparece al entrar: tiene que crear una tabla, meter
 * datos y consultarlos en pocas líneas, para que se entienda de qué se trata
 * sin leer la documentación.
 *
 * Están todos escritos en español, de punta a punta, porque es como se enseña
 * y porque un ejemplo mitad y mitad enseña a escribir mitad y mitad. El motor
 * sigue entendiendo el inglés: quien lo quiera ver, está en «Base → Datos de
 * ejemplo», que es un volcado tal como sale de Exportar.
 */
(function (global) {
  'use strict';

  global.BD_EJEMPLOS = [
    {
      nombre: 'Crear, insertar y consultar',
      codigo: `/*
   Las instrucciones de la base se escriben solas, como una sentencia más.
   Un SELECCIONAR suelto imprime su tabla.

   Todo va en español. Lo mismo en inglés —CREATE TABLE, SELECT ... FROM—
   también se entiende, y se pueden mezclar en la misma consulta.
*/
inicio
   CREAR TABLA alumnos (
      id     ENTERO CLAVE PRIMARIA,
      nombre TEXTO NO NULO,
      nota   REAL
   )

   INSERTAR DENTRO alumnos VALORES
      (1, 'Ana',  9),
      (2, 'Beto', 6),
      (3, 'Cata', 8),
      (4, 'Dani', NULO)

   SELECCIONAR nombre, nota
   DE alumnos
   ORDENAR POR nota DESCENDENTE
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
   CREAR TABLA alumnos (nombre TEXTO, nota REAL)
   INSERTAR DENTRO alumnos VALORES ('Ana', 9), ('Beto', 6), ('Cata', 8)

   consultar ("SELECCIONAR nombre, nota DE alumnos ORDENAR POR nombre")
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

   Por eso no hace falta armar la consulta a mano con + y str(), que es
   donde se cuelan las comillas mal puestas.
*/
var
   i : numerico
   par : cadena
inicio
   CREAR TABLA numeros (n ENTERO, cuadrado ENTERO, par TEXTO)

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

   SELECCIONAR * DE numeros DONDE par = 'sí' ORDENAR POR n

   imprimir ("\\nLa suma de los cuadrados pares:\\n")
   SELECCIONAR SUMAR (cuadrado) DE numeros DONDE par = 'sí'
fin
`
    },
    {
      nombre: 'NULO no es cero ni vacío',
      codigo: `/*
   NULO quiere decir "no se sabe", y no es lo mismo que 0 ni que "".
   Por eso NULO = NULO no da verdadero: hay que preguntar ES NULO.
   En SL no existe el nulo, así que para distinguirlo está hay_dato().
*/
var
   i : numerico
inicio
   CREAR TABLA gente (nombre TEXTO, edad ENTERO)
   INSERTAR DENTRO gente VALORES ('Ana', 30), ('Beto', NULO), ('Cata', 0)

   imprimir ("Con = NULO no encuentra a nadie:\\n")
   SELECCIONAR nombre DE gente DONDE edad = NULO

   imprimir ("\\nCon ES NULO sí:\\n")
   SELECCIONAR nombre DE gente DONDE edad ES NULO

   imprimir ("\\nY el promedio ignora los nulos, no los cuenta como cero:\\n")
   SELECCIONAR PROMEDIO (edad), CONTAR (edad), CONTAR (*) DE gente

   imprimir ("\\nDesde el programa:\\n")
   consultar ("SELECCIONAR nombre, edad DE gente ORDENAR POR nombre")
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
      nombre: 'Dos tablas y un UNIR',
      codigo: `/*
   REFERENCIA dice que la columna «ciudad» no guarda un nombre de ciudad sino
   el id de una fila de la tabla ciudades. Eso es una relación, y es lo que
   dibuja la flecha en «Base → Diagrama de la base».

   Además se hace cumplir: un id de ciudad que no existe se rechaza. NULO sí
   se admite, y quiere decir «todavía no se sabe en cuál vive».
*/
inicio
   CREAR TABLA ciudades (
      id     ENTERO CLAVE PRIMARIA,
      nombre TEXTO
   )
   CREAR TABLA gente (
      nombre TEXTO,
      ciudad ENTERO REFERENCIA ciudades (id)
   )

   INSERTAR DENTRO ciudades VALORES (1, 'Asunción'), (2, 'Encarnación'), (3, 'Luque')
   INSERTAR DENTRO gente VALORES ('Ana', 1), ('Beto', 2), ('Cata', 1), ('Dani', NULO)

   imprimir ("Con UNIR, Dani no aparece porque no tiene ciudad:\\n")
   SELECCIONAR g.nombre, c.nombre
   DE gente g
   UNIR ciudades c SEGUN g.ciudad = c.id
   ORDENAR POR g.nombre

   imprimir ("\\nCon IZQUIERDA UNIR sí, con la ciudad en NULO:\\n")
   SELECCIONAR g.nombre, c.nombre
   DE gente g
   IZQUIERDA UNIR ciudades c SEGUN g.ciudad = c.id
   ORDENAR POR g.nombre

   imprimir ("\\nCuánta gente por ciudad:\\n")
   SELECCIONAR c.nombre, CONTAR (*) COMO cuantos
   DE gente g
   UNIR ciudades c SEGUN g.ciudad = c.id
   AGRUPAR POR c.nombre
   ORDENAR POR cuantos DESCENDENTE
fin
`
    },
    {
      nombre: 'Agrupar, filtrar grupos y ordenar',
      codigo: `inicio
   CREAR TABLA ventas (
      producto TEXTO,
      rubro    TEXTO,
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
   SELECCIONAR rubro, CONTAR (*) COMO productos, SUMAR (monto) COMO total
   DE ventas
   AGRUPAR POR rubro
   ORDENAR POR total DESCENDENTE

   imprimir ("\\nSolo los rubros que pasan de 20000 (eso es TENIENDO):\\n")
   SELECCIONAR rubro, SUMAR (monto) COMO total
   DE ventas
   AGRUPAR POR rubro
   TENIENDO SUMAR (monto) > 20000
   ORDENAR POR rubro

   imprimir ("\\nDONDE filtra filas, TENIENDO filtra grupos:\\n")
   SELECCIONAR rubro, SUMAR (monto) COMO total
   DE ventas
   DONDE monto > 10000
   AGRUPAR POR rubro
   ORDENAR POR rubro
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
      id       ENTERO CLAVE PRIMARIA,
      producto TEXTO,
      cantidad ENTERO
   )
   INSERTAR DENTRO stock VALORES (1, 'pan', 10), (2, 'leche', 0), (3, 'queso', 3)

   ACTUALIZAR stock CONJUNTO cantidad = cantidad + 5 DONDE cantidad < 5
   imprimir ("Se repusieron ", afectadas (), " producto(s)\\n\\n")

   SELECCIONAR * DE stock ORDENAR POR id

   BORRAR DE stock DONDE cantidad > 9
   imprimir ("\\nSe sacaron ", afectadas (), " producto(s) de la lista\\n\\n")

   SELECCIONAR * DE stock ORDENAR POR id
fin
`
    },
    {
      nombre: 'Armar la consulta con el programa',
      codigo: `/*
   Para un valor que cambia está «@variable», y alcanza casi siempre. Pero
   «@» solo funciona en una instrucción escrita suelta: adentro de un texto
   es un arroba y nada más.

   Y cuando lo que cambia no es un valor sino la consulta entera —la columna
   por la que se ordena, por ejemplo— tampoco serviría: un nombre de columna
   no se cita como un texto. Ahí la instrucción se arma como cadena y se la
   manda con sql() o consultar().
*/
var
   orden : cadena
   i : numerico
inicio
   CREAR TABLA alumnos (nombre TEXTO, nota REAL)
   INSERTAR DENTRO alumnos VALORES ('Ana', 9), ('Beto', 6), ('Cata', 8)

   desde i = 1 hasta 2
   {
      si (i == 1)
      {
         orden = "nombre"
      sino
         orden = "nota DESCENDENTE"
      }
      imprimir ("Ordenado por ", orden, ":\\n")
      sql ("SELECCIONAR * DE alumnos ORDENAR POR " + orden)
      mostrar ()
      imprimir ("\\n")
   }
fin
`
    },
    {
      nombre: 'Ventas por encima del promedio',
      codigo: `/*
   Una subconsulta es una consulta adentro de otra, entre paréntesis.

   Esta es «suelta»: no nombra nada de la consulta de afuera, así que se
   calcula una sola vez y vale para todas las filas. El promedio de todas
   las ventas es uno solo.
*/
inicio
   CREAR TABLA ventas (
      id       ENTERO CLAVE PRIMARIA,
      vendedor TEXTO,
      monto    REAL
   )
   INSERTAR DENTRO ventas VALORES
      (1, 'Ana',  120000),
      (2, 'Ana',   45000),
      (3, 'Beto', 380000),
      (4, 'Cata',  90000),
      (5, 'Cata',  15000),
      (6, 'Dani',  60000)

   imprimir ("El promedio de una venta:\\n")
   SELECCIONAR REDONDEAR (PROMEDIO (monto), 0) COMO promedio DE ventas

   imprimir ("\\nLas ventas que lo pasan:\\n")
   SELECCIONAR vendedor, monto
   DE ventas
   DONDE monto > (SELECCIONAR PROMEDIO (monto) DE ventas)
   ORDENAR POR monto DESCENDENTE

   /*
      Una tabla derivada es una consulta puesta en el DE, como si fuera una
      tabla. El alias no es opcional: el resultado no tiene nombre propio, y
      sin nombre no habría cómo escribir sus columnas.

      Sirve justo para esto: agrupar primero y recién después filtrar por lo
      que salió de agrupar.
   */
   imprimir ("\\nVendedores cuyo total pasa el total promedio:\\n")
   SELECCIONAR t.vendedor, t.total
   DE (SELECCIONAR vendedor, SUMAR (monto) COMO total
       DE ventas
       AGRUPAR POR vendedor) COMO t
   DONDE t.total > (SELECCIONAR PROMEDIO (monto) * 2 DE ventas)
   ORDENAR POR t.total DESCENDENTE
fin
`
    },
    {
      nombre: 'Quiénes compraron y quiénes no',
      codigo: `/*
   Una subconsulta «correlacionada» sí nombra la fila de afuera —acá el
   c.id— y entonces se calcula una vez por cada fila. Es lo que la hace
   poderosa y también lo que la hace cara.

   Y de paso, la trampa más clásica de SQL: NO EN contra una columna que
   tiene nulos no devuelve nada.
*/
inicio
   CREAR TABLA clientes (
      id     ENTERO CLAVE PRIMARIA,
      nombre TEXTO
   )
   CREAR TABLA compras (
      id      ENTERO CLAVE PRIMARIA,
      cliente ENTERO REFERENCIA clientes (id),
      monto   REAL
   )
   INSERTAR DENTRO clientes VALORES (1, 'Ana'), (2, 'Beto'), (3, 'Cata'), (4, 'Dani')

   /* La última todavía no se sabe de quién es: el cliente quedó en NULO. */
   INSERTAR DENTRO compras VALORES
      (10, 1, 100000),
      (11, 1,  50000),
      (12, 2, 300000),
      (13, NULO, 7000)

   imprimir ("Los que compraron (EXISTE):\\n")
   SELECCIONAR c.nombre
   DE clientes COMO c
   DONDE EXISTE (SELECCIONAR 1 DE compras COMO p DONDE p.cliente = c.id)
   ORDENAR POR c.nombre

   imprimir ("\\nLos que no compraron (NO EXISTE):\\n")
   SELECCIONAR c.nombre
   DE clientes COMO c
   DONDE NO EXISTE (SELECCIONAR 1 DE compras COMO p DONDE p.cliente = c.id)
   ORDENAR POR c.nombre

   /*
      Lo mismo con NO EN parece igual, y no lo es. Hay una compra con el
      cliente en NULO, así que la pregunta «¿el 3 está entre 1, 2 y no se
      sabe?» no tiene respuesta: puede que ese que no se sabe sea el 3.

      La respuesta es «desconocido», y una fila con condición desconocida no
      entra en el resultado. Por eso esto no devuelve a nadie.
   */
   imprimir ("\\nLo mismo con NO EN, y el nulo se lleva puesto el resultado:\\n")
   SELECCIONAR c.nombre
   DE clientes COMO c
   DONDE c.id NO EN (SELECCIONAR p.cliente DE compras COMO p)

   imprimir ("(no salió ninguno)\\n")

   imprimir ("\\nSacando los nulos, NO EN sí anda:\\n")
   SELECCIONAR c.nombre
   DE clientes COMO c
   DONDE c.id NO EN (SELECCIONAR p.cliente DE compras COMO p DONDE p.cliente ES NO NULO)
   ORDENAR POR c.nombre

   imprimir ("\\nCuánto compró cada uno (escalar correlacionada):\\n")
   SELECCIONAR c.nombre,
              (SELECCIONAR SUMAR (p.monto) DE compras COMO p DONDE p.cliente = c.id) COMO total
   DE clientes COMO c
   ORDENAR POR c.nombre
fin
`
    }
  ];

  /* Los datos que crea «Base → Datos de ejemplo»: sirven para practicar
     consultas sin tener que escribir los INSERT cada vez.

     Van en inglés a propósito, y son los únicos: es un volcado tal como sale
     de Exportar, y que se cargue sin tocar nada es la prueba de que un archivo
     de SQLite, MySQL o PostgreSQL entra acá tal cual. */
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

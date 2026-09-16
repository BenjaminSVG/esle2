/* Curso de ESLE2 BD: 50 ejercicios con corrección automática.
 *
 * A diferencia del curso normal, acá no se compara lo que el programa imprime:
 * se mira la base que quedó y el resultado de la última consulta. El motor
 * está en js/verificar-bd.js y ahí está explicado el formato de `espera`.
 *
 * Es a propósito. La mitad de estos ejercicios no imprimen nada —crear una
 * tabla, modificar, borrar— y en la otra mitad alcanzaría con escribir los
 * imprimir() a mano para aprobar sin haber tocado la base.
 *
 * Los enunciados y las plantillas van en español, que es como se enseña. Que
 * el inglés también funcione lo prueba test-sql.js, no el curso.
 */
(function (global) {
  'use strict';

  /* Datos que usan varios ejercicios, para no reescribir los INSERTAR en cada
     enunciado. Son chicos a propósito: el alumno tiene que poder calcular a
     mano lo que espera antes de escribir la consulta. */
  const ALUMNOS = `CREAR TABLA alumnos (
      id ENTERO CLAVE PRIMARIA, nombre TEXTO, ciudad TEXTO, nota REAL);
    INSERTAR DENTRO alumnos VALORES
      (1, 'Ana',  'Luque',    9),
      (2, 'Beto', 'Luque',    6),
      (3, 'Cata', 'Asuncion', 8),
      (4, 'Dani', 'Asuncion', 4),
      (5, 'Elsa', 'Luque',    NULO)`;

  const VENTAS = `CREAR TABLA ventas (
      id ENTERO CLAVE PRIMARIA, vendedor TEXTO, rubro TEXTO, monto REAL);
    INSERTAR DENTRO ventas VALORES
      (1, 'Ana',  'pan',    15000),
      (2, 'Ana',  'leche',  24000),
      (3, 'Beto', 'queso',  75000),
      (4, 'Beto', 'pan',     9000),
      (5, 'Cata', 'jabon',   8000)`;

  const TIENDA = `CREAR TABLA ciudades (id ENTERO CLAVE PRIMARIA, nombre TEXTO);
    CREAR TABLA clientes (
      id ENTERO CLAVE PRIMARIA, nombre TEXTO,
      ciudad ENTERO REFERENCIA ciudades (id));
    CREAR TABLA compras (
      id ENTERO CLAVE PRIMARIA,
      cliente ENTERO REFERENCIA clientes (id), monto REAL);
    INSERTAR DENTRO ciudades VALORES (1, 'Luque'), (2, 'Asuncion'), (3, 'Encarnacion');
    INSERTAR DENTRO clientes VALORES
      (1, 'Ana', 1), (2, 'Beto', 1), (3, 'Cata', 2), (4, 'Dani', NULO);
    INSERTAR DENTRO compras VALORES
      (10, 1, 100000), (11, 1, 50000), (12, 2, 300000), (13, NULO, 7000)`;

  const vacio = 'inicio\n   // escribí tu instrucción acá\n\nfin\n';

  const EJERCICIOS = [

    /* =================================================================== */
    /* FÁCIL — crear, insertar, consultar y filtrar                        */
    /* =================================================================== */
    {
      id: 'b1', nivel: 'facil', titulo: 'Tu primera tabla',
      enunciado: 'Creá una tabla <code>ciudades</code> con dos columnas: '
        + '<code>id</code> de tipo <strong>ENTERO</strong> y <code>nombre</code> de tipo '
        + '<strong>TEXTO</strong>.',
      pista: 'Las instrucciones de la base se escriben solas, sin comillas y sin envolverlas '
        + 'en nada: <code>CREAR TABLA nombre (columna TIPO, columna TIPO)</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'La tabla existe y tiene las dos columnas',
        espera: [['tabla', 'ciudades', ['id', 'nombre']],
          ['columna', 'ciudades', 'id', { tipo: 'INTEGER' }],
          ['columna', 'ciudades', 'nombre', { tipo: 'TEXT' }]]
      }]
    },
    {
      id: 'b2', nivel: 'facil', titulo: 'Los tipos que hay',
      enunciado: 'Creá una tabla <code>productos</code> con <code>codigo</code> ENTERO, '
        + '<code>nombre</code> CADENA(40), <code>precio</code> REAL y <code>activo</code> LOGICO.',
      pista: 'Los tipos en español son <code>ENTERO</code>, <code>REAL</code>, '
        + '<code>TEXTO</code>, <code>CADENA(n)</code>, <code>NUMERICO</code> y '
        + '<code>LOGICO</code>. <code>CADENA(40)</code> es texto con un largo máximo.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cada columna quedó con su tipo',
        espera: [['tabla', 'productos', ['codigo', 'nombre', 'precio', 'activo']],
          ['columna', 'productos', 'codigo', { tipo: 'INTEGER' }],
          ['columna', 'productos', 'nombre', { tipo: 'VARCHAR(40)' }],
          ['columna', 'productos', 'precio', { tipo: 'REAL' }],
          ['columna', 'productos', 'activo', { tipo: 'BOOLEAN' }]]
      }]
    },
    {
      id: 'b3', nivel: 'facil', titulo: 'Una fila',
      enunciado: 'Creá <code>ciudades (id ENTERO, nombre TEXTO)</code> y metele una fila: '
        + 'el <strong>1</strong> con el nombre <code>Luque</code>.',
      pista: '<code>INSERTAR DENTRO tabla VALORES (…)</code>. El texto va entre comillas, '
        + 'simples o dobles: <code>\'Luque\'</code> y <code>"Luque"</code> son lo mismo.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'La fila está',
        espera: [['tabla', 'ciudades', ['id', 'nombre']],
          ['contenido', 'ciudades', ['id', 'nombre'], [[1, 'Luque']]]]
      }]
    },
    {
      id: 'b4', nivel: 'facil', titulo: 'Varias filas de una vez',
      enunciado: 'Creá <code>ciudades (id ENTERO, nombre TEXTO)</code> y metele las tres de '
        + 'una sola instrucción: <code>1 Luque</code>, <code>2 Asuncion</code>, '
        + '<code>3 Encarnacion</code>.',
      pista: 'Después de <code>VALORES</code> van todas las filas separadas por coma: '
        + '<code>VALORES (1, \'a\'), (2, \'b\')</code>. Es mucho más rápido que un '
        + 'INSERTAR por fila.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Están las tres',
        espera: [['filas', 'ciudades', 3],
          ['contenido', 'ciudades', ['id', 'nombre'],
            [[1, 'Luque'], [2, 'Asuncion'], [3, 'Encarnacion']]]]
      }]
    },
    {
      id: 'b5', nivel: 'facil', titulo: 'Traer dos columnas',
      enunciado: 'La tabla <code>alumnos</code> ya está cargada. Traé solo el '
        + '<code>nombre</code> y la <code>nota</code> de todos.',
      pista: '<code>SELECCIONAR columna, columna DE tabla</code>. Un SELECCIONAR suelto '
        + 'imprime su tabla solo.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Trae las dos columnas de los cinco',
        preparar: ALUMNOS,
        espera: [['columnas', ['nombre', 'nota']],
          ['resultado', ['nombre', 'nota'],
            [['Ana', 9], ['Beto', 6], ['Cata', 8], ['Dani', 4], ['Elsa', null]]]]
      }]
    },
    {
      id: 'b6', nivel: 'facil', titulo: 'Filtrar por un número',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que tienen '
        + '<strong>nota 7 o más</strong>.',
      pista: '<code>DONDE</code> filtra filas. En SQL el «igual que» es <code>=</code>, con '
        + 'un solo signo, y también están <code>&gt;</code>, <code>&gt;=</code>, '
        + '<code>&lt;</code>, <code>&lt;=</code> y <code>&lt;&gt;</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Cata',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Ana'], ['Cata']]]]
      }]
    },
    {
      id: 'b7', nivel: 'facil', titulo: 'Filtrar por un texto',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> y la <code>nota</code> '
        + 'de los que viven en <code>Luque</code>.',
      pista: 'Un texto va entre comillas: <code>DONDE ciudad = \'Luque\'</code>. Sin '
        + 'comillas, ESLE2 BD lo leería como el nombre de una columna.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los tres de Luque',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre', 'nota'], [['Ana', 9], ['Beto', 6], ['Elsa', null]]]]
      }]
    },
    {
      id: 'b8', nivel: 'facil', titulo: 'Dos condiciones con Y',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que viven en '
        + '<code>Luque</code> <strong>y</strong> tienen nota 7 o más.',
      pista: '<code>Y</code> es el «and»: las dos condiciones tienen que cumplirse. También '
        + 'está <code>O</code>, con el que alcanza con una.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Solo Ana',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Ana']]]]
      }]
    },
    {
      id: 'b9', nivel: 'facil', titulo: 'O, y NO',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que '
        + '<strong>no</strong> viven en <code>Luque</code>, más los que tienen nota 9.',
      pista: 'Se pueden combinar: <code>DONDE NO ciudad = \'Luque\' O nota = 9</code>. '
        + 'El <code>NO</code> va adelante de la condición que niega.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cata, Dani y Ana',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Ana'], ['Cata'], ['Dani']]]]
      }]
    },
    {
      id: 'b10', nivel: 'facil', titulo: 'Ordenar, y desempatar',
      enunciado: 'De <code>alumnos</code>, traé <code>ciudad</code> y <code>nombre</code> '
        + 'ordenados por <strong>ciudad</strong> y, dentro de cada ciudad, por '
        + '<strong>nombre</strong>.',
      pista: '<code>ORDENAR POR a, b</code>: primero por <code>a</code>, y cuando dos filas '
        + 'empatan, por <code>b</code>. Sin ORDENAR POR, el orden de las filas no significa '
        + 'nada.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'En ese orden exacto',
        preparar: ALUMNOS,
        espera: [['en_orden', ['ciudad', 'nombre'],
          [['Asuncion', 'Cata'], ['Asuncion', 'Dani'],
            ['Luque', 'Ana'], ['Luque', 'Beto'], ['Luque', 'Elsa']]]]
      }]
    },
    {
      id: 'b11', nivel: 'facil', titulo: 'Los dos mejores',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> y la <code>nota</code> '
        + 'de los <strong>dos de nota más alta</strong>, de mayor a menor.',
      pista: '<code>ORDENAR POR nota DESCENDENTE</code> y después <code>LIMITE 2</code>. '
        + 'El LIMITE va siempre al final.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Cata, en ese orden',
        preparar: ALUMNOS,
        espera: [['en_orden', ['nombre', 'nota'], [['Ana', 9], ['Cata', 8]]], ['usa', 'limite']]
      }]
    },
    {
      id: 'b12', nivel: 'facil', titulo: 'Saltear los primeros',
      enunciado: 'De <code>alumnos</code> ordenados por <code>nombre</code>, traé el '
        + '<code>nombre</code> de los dos que quedan <strong>después de saltear los dos '
        + 'primeros</strong>.',
      pista: '<code>DESPLAZAMIENTO n</code> saltea las primeras n filas, y va después del '
        + '<code>LIMITE</code>. Es lo que usa cualquier página que muestra resultados de a '
        + 'diez.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cata y Dani',
        preparar: ALUMNOS,
        espera: [['en_orden', ['nombre'], [['Cata'], ['Dani']]]]
      }]
    },
    {
      id: 'b13', nivel: 'facil', titulo: 'Sin repetir',
      enunciado: 'De <code>alumnos</code>, traé las <strong>ciudades sin repetir</strong>, '
        + 'ordenadas alfabéticamente.',
      pista: '<code>SELECCIONAR DISTINTOS columna DE tabla</code>: deja una sola fila por '
        + 'cada valor distinto.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Dos ciudades',
        preparar: ALUMNOS,
        espera: [['en_orden', ['ciudad'], [['Asuncion'], ['Luque']]], ['usa', 'distintos']]
      }]
    },
    {
      id: 'b14', nivel: 'facil', titulo: 'El que no tiene nota',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que '
        + '<strong>no tienen nota cargada</strong>.',
      pista: '<code>nota = NULO</code> no encuentra a nadie: NULO quiere decir «no se sabe», '
        + 'y no se sabe si es igual a otro que tampoco se sabe. Hay que preguntar '
        + '<code>ES NULO</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Elsa',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Elsa']]]]
      }]
    },
    {
      id: 'b15', nivel: 'facil', titulo: 'Un valor por omisión',
      enunciado: 'Creá <code>alumnos (id ENTERO, nombre TEXTO, ciudad TEXTO)</code> donde '
        + '<code>ciudad</code> valga <code>Asuncion</code> cuando no se diga ninguna. '
        + 'Después meté una fila nombrando solo <code>id</code> y <code>nombre</code>: '
        + '<strong>1, Ana</strong>.',
      pista: '<code>POR DEFECTO valor</code> en la declaración de la columna. Y en el '
        + 'INSERTAR se pueden nombrar las columnas que se cargan: '
        + '<code>INSERTAR DENTRO t (a, b) VALORES (…)</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'La ciudad se llenó sola',
        espera: [['columna', 'alumnos', 'ciudad', { porDefecto: 'Asuncion' }],
          ['contenido', 'alumnos', ['id', 'nombre', 'ciudad'], [[1, 'Ana', 'Asuncion']]]]
      }]
    },
    {
      id: 'b16', nivel: 'facil', titulo: 'La clave primaria',
      enunciado: 'Creá <code>alumnos</code> con <code>id</code> ENTERO como '
        + '<strong>clave primaria</strong> y <code>nombre</code> TEXTO, y metele dos filas: '
        + '<code>1 Ana</code> y <code>2 Beto</code>.',
      pista: '<code>CLAVE PRIMARIA</code> al lado del tipo. El motor la hace cumplir de '
        + 'verdad: dos filas con el mismo id, o un id vacío, se rechazan.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'La clave está declarada y las dos filas entraron',
        espera: [['columna', 'alumnos', 'id', { clave: true }],
          ['contenido', 'alumnos', ['id', 'nombre'], [[1, 'Ana'], [2, 'Beto']]]]
      }]
    },
    {
      id: 'b17', nivel: 'facil', titulo: 'Único, y que no falte',
      enunciado: 'Creá <code>gente</code> con <code>id</code> ENTERO clave primaria, '
        + '<code>nombre</code> TEXTO que <strong>no pueda faltar</strong>, y '
        + '<code>correo</code> TEXTO que <strong>no se pueda repetir</strong>.',
      pista: '<code>NO NULO</code> obliga a que haya un valor. <code>UNICO</code> no deja '
        + 'repetirlo. Son distintas: un correo puede faltar, pero si está, no puede estar dos '
        + 'veces.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Las tres restricciones',
        espera: [['columna', 'gente', 'id', { clave: true }],
          ['columna', 'gente', 'nombre', { noNulo: true }],
          ['columna', 'gente', 'correo', { unico: true }]]
      }]
    },
    {
      id: 'b18', nivel: 'facil', titulo: 'Subir las notas bajas',
      enunciado: 'En <code>alumnos</code>, sumale <strong>1</strong> a la nota de los que '
        + 'tienen <strong>menos de 7</strong>. Después traé <code>nombre</code> y '
        + '<code>nota</code> de todos, ordenados por nombre.',
      pista: '<code>ACTUALIZAR tabla CONJUNTO col = valor DONDE …</code>. Sin el DONDE toca '
        + '<strong>todas</strong> las filas — no es un error, es lo que significa.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Beto y Dani subieron, los demás no',
        preparar: ALUMNOS,
        espera: [['contenido', 'alumnos', ['nombre', 'nota'],
          [['Ana', 9], ['Beto', 7], ['Cata', 8], ['Dani', 5], ['Elsa', null]]]]
      }]
    },
    {
      id: 'b19', nivel: 'facil', titulo: 'Borrar a los que no tienen nota',
      enunciado: 'En <code>alumnos</code>, borrá las filas donde la <code>nota</code> '
        + '<strong>no está cargada</strong>.',
      pista: '<code>BORRAR DE tabla DONDE …</code>. Y para el nulo, otra vez '
        + '<code>ES NULO</code>: con <code>= NULO</code> no borrarías nada.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Quedaron cuatro',
        preparar: ALUMNOS,
        espera: [['filas', 'alumnos', 4],
          ['contenido', 'alumnos', ['nombre'], [['Ana'], ['Beto'], ['Cata'], ['Dani']]]]
      }]
    },
    {
      id: 'b20', nivel: 'facil', titulo: 'Ponerle nombre a una columna',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> con el título '
        + '<code>alumno</code> y la <code>nota</code> multiplicada por 10 con el título '
        + '<code>porcentaje</code>, solo de los que tienen nota.',
      pista: '<code>COMO</code> le pone nombre a una columna del resultado: '
        + '<code>SELECCIONAR nota * 10 COMO porcentaje</code>. Sirve sobre todo cuando la '
        + 'columna es una cuenta y no tiene nombre propio.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los títulos y las cuentas',
        preparar: ALUMNOS,
        espera: [['columnas', ['alumno', 'porcentaje']],
          ['resultado', ['alumno', 'porcentaje'],
            [['Ana', 90], ['Beto', 60], ['Cata', 80], ['Dani', 40]]]]
      }]
    },

    /* =================================================================== */
    /* MEDIO — funciones, agregados, agrupar y unir tablas                 */
    /* =================================================================== */
    {
      id: 'b21', nivel: 'medio', titulo: 'Recorrer el resultado desde el programa',
      enunciado: 'Con <code>consultar()</code> traé <code>nombre</code> y <code>nota</code> '
        + 'de <code>alumnos</code> ordenados por nombre, y desde SL imprimí una línea por '
        + 'alumno con el formato <code>Ana: 9</code>. Los que no tienen nota van como '
        + '<code>Ana: sin nota</code>.',
      pista: '<code>consultar()</code> hace lo mismo que un SELECCIONAR suelto pero sin '
        + 'imprimirlo, y devuelve cuántas filas trajo. Después están <code>filas()</code>, '
        + '<code>dato(fila, col)</code> y <code>hay_dato(fila, col)</code>, que dice '
        + '<code>FALSE</code> cuando el valor era NULO. Los índices empiezan en 1.',
      plantilla: 'var\n   i : numerico\ninicio\n\nfin\n',
      pruebas: [{
        nombre: 'Las cinco líneas, y el nulo distinguido',
        preparar: ALUMNOS,
        espera: [['salida', 'Ana: 9'], ['salida', 'Dani: 4'], ['salida', 'Elsa: sin nota']]
      }]
    },
    {
      id: 'b22', nivel: 'medio', titulo: 'En mayúsculas',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> en '
        + '<strong>mayúsculas</strong> con el título <code>nombre</code>, ordenado.',
      pista: '<code>MAYUSCULAS(texto)</code>. También están <code>MINUSCULAS</code>, '
        + '<code>LONGITUD</code> y <code>RECORTAR</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los cinco en mayúsculas',
        preparar: ALUMNOS,
        espera: [['columnas', ['nombre']],
          ['en_orden', ['nombre'], [['ANA'], ['BETO'], ['CATA'], ['DANI'], ['ELSA']]]]
      }]
    },
    {
      id: 'b23', nivel: 'medio', titulo: 'Largo e inicial',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code>, su largo con el '
        + 'título <code>largo</code>, y su <strong>primera letra</strong> con el título '
        + '<code>inicial</code>. Ordenado por nombre.',
      pista: '<code>LONGITUD(texto)</code> y <code>SUBCADENA(texto, desde, cuantos)</code>. '
        + 'La primera letra empieza en el 1, como los vectores de SL.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Largo e inicial de cada uno',
        preparar: ALUMNOS,
        espera: [['columnas', ['nombre', 'largo', 'inicial']],
          ['en_orden', ['nombre', 'largo', 'inicial'],
            [['Ana', 3, 'A'], ['Beto', 4, 'B'], ['Cata', 4, 'C'],
              ['Dani', 4, 'D'], ['Elsa', 4, 'E']]]]
      }]
    },
    {
      id: 'b24', nivel: 'medio', titulo: 'Redondear',
      enunciado: 'De <code>ventas</code>, traé el <code>vendedor</code>, el '
        + '<code>monto</code>, y el monto en miles redondeado a <strong>un decimal</strong> '
        + 'con el título <code>miles</code>. Ordenado por id.',
      pista: '<code>REDONDEAR(n, decimales)</code>. Sin el segundo parámetro redondea a '
        + 'entero. También está <code>ABSOLUTO</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los cinco montos en miles',
        preparar: VENTAS,
        espera: [['columnas', ['vendedor', 'monto', 'miles']],
          ['en_orden', ['vendedor', 'monto', 'miles'],
            [['Ana', 15000, 15], ['Ana', 24000, 24], ['Beto', 75000, 75],
              ['Beto', 9000, 9], ['Cata', 8000, 8]]]]
      }]
    },
    {
      id: 'b25', nivel: 'medio', titulo: 'Tapar el nulo',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> y la nota, '
        + 'pero mostrando <strong>0</strong> donde la nota sea NULO. La columna se tiene que '
        + 'llamar <code>nota</code>. Ordenado por nombre.',
      pista: '<code>SI_NULO(a, b)</code> devuelve <code>a</code>, o <code>b</code> si '
        + '<code>a</code> era NULO. Ojo: esto es para <em>mostrar</em>. Guardar un 0 donde no '
        + 'se sabe la nota sería mentir en la base.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Elsa aparece con 0',
        preparar: ALUMNOS,
        espera: [['columnas', ['nombre', 'nota']],
          ['en_orden', ['nombre', 'nota'],
            [['Ana', 9], ['Beto', 6], ['Cata', 8], ['Dani', 4], ['Elsa', 0]]]]
      }]
    },
    {
      id: 'b26', nivel: 'medio', titulo: 'Los que empiezan con A',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que '
        + '<strong>terminan en la letra a</strong>.',
      pista: '<code>COMO_PATRON</code>: <code>%</code> es «cualquier cosa» y <code>_</code> '
        + 'es «una letra». Se llama así, y no <code>COMO</code> a secas, porque '
        + '<code>COMO</code> ya es el que le pone alias a una columna.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana, Cata y Elsa',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Ana'], ['Cata'], ['Elsa']]]]
      }]
    },
    {
      id: 'b27', nivel: 'medio', titulo: 'Entre dos valores, o en una lista',
      enunciado: 'De <code>ventas</code>, traé el <code>id</code> de las que tienen monto '
        + '<strong>entre 9000 y 24000</strong>, incluidos los dos, o cuyo <code>rubro</code> '
        + 'sea <code>queso</code> o <code>jabon</code>. Ordenado por id.',
      pista: '<code>ENTRE a Y b</code> incluye los extremos. <code>EN (a, b, c)</code> es '
        + 'más corto que encadenar tres <code>O</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cuatro ventas',
        preparar: VENTAS,
        espera: [['en_orden', ['id'], [[1], [2], [3], [4], [5]]]]
      }]
    },
    {
      id: 'b28', nivel: 'medio', titulo: 'Contar y sumar',
      enunciado: 'De <code>ventas</code>, traé <strong>cuántas</strong> hay con el título '
        + '<code>cuantas</code> y el <strong>total</strong> de los montos con el título '
        + '<code>total</code>.',
      pista: '<code>CONTAR(*)</code> cuenta filas, <code>SUMAR(col)</code> suma. Son '
        + '«funciones de agregación»: devuelven una sola fila para todo el grupo.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cinco ventas, 131000 en total',
        preparar: VENTAS,
        espera: [['columnas', ['cuantas', 'total']],
          ['resultado', ['cuantas', 'total'], [[5, 131000]]]]
      }]
    },
    {
      id: 'b29', nivel: 'medio', titulo: 'Promedio, mínimo y máximo',
      enunciado: 'De <code>alumnos</code>, traé el promedio de las notas con el título '
        + '<code>promedio</code>, la más baja como <code>peor</code> y la más alta como '
        + '<code>mejor</code>.',
      pista: '<code>PROMEDIO</code>, <code>MINIMO</code> y <code>MAXIMO</code>. Los '
        + 'agregados <strong>ignoran los nulos</strong>: no los cuentan como cero, que daría '
        + 'un promedio más bajo y equivocado.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'El promedio de los cuatro que tienen nota',
        preparar: ALUMNOS,
        espera: [['columnas', ['promedio', 'peor', 'mejor']],
          ['resultado', ['promedio', 'peor', 'mejor'], [[6.75, 4, 9]]]]
      }]
    },
    {
      id: 'b30', nivel: 'medio', titulo: 'Total por vendedor',
      enunciado: 'De <code>ventas</code>, traé el <code>vendedor</code> y el total de sus '
        + 'montos con el título <code>total</code>, de mayor a menor.',
      pista: '<code>AGRUPAR POR vendedor</code> arma un grupo por cada vendedor distinto, y '
        + 'el agregado se calcula dentro de cada grupo.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Tres vendedores, de mayor a menor',
        preparar: VENTAS,
        espera: [['columnas', ['vendedor', 'total']],
          ['en_orden', ['vendedor', 'total'], [['Beto', 84000], ['Ana', 39000], ['Cata', 8000]]],
          ['usa', 'agrupar']]
      }]
    },
    {
      id: 'b31', nivel: 'medio', titulo: 'Solo los grupos grandes',
      enunciado: 'De <code>ventas</code>, traé el <code>vendedor</code> y su total como '
        + '<code>total</code>, pero <strong>solo los que pasan de 30000</strong>, ordenados '
        + 'por vendedor.',
      pista: '<code>DONDE</code> filtra filas <em>antes</em> de agrupar; '
        + '<code>TENIENDO</code> filtra grupos <em>después</em>. Acá la condición es sobre la '
        + 'suma, así que va en TENIENDO.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto',
        preparar: VENTAS,
        espera: [['en_orden', ['vendedor', 'total'], [['Ana', 39000], ['Beto', 84000]]],
          ['usa', 'teniendo']]
      }]
    },
    {
      id: 'b32', nivel: 'medio', titulo: 'Dos tablas relacionadas',
      enunciado: 'Creá <code>ciudades (id ENTERO clave primaria, nombre TEXTO)</code> y '
        + '<code>gente (id ENTERO clave primaria, nombre TEXTO, ciudad ENTERO)</code>, donde '
        + '<code>gente.ciudad</code> <strong>apunte</strong> a <code>ciudades.id</code>.',
      pista: '<code>REFERENCIA otra (columna)</code> al lado del tipo. Las tablas se crean '
        + 'de la referida a la que referencia: la otra tiene que existir primero.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'La flecha está declarada',
        espera: [['columna', 'ciudades', 'id', { clave: true }],
          ['columna', 'gente', 'ciudad', { refiere: ['ciudades', 'id'] }]]
      }]
    },
    {
      id: 'b33', nivel: 'medio', titulo: 'Juntar dos tablas',
      enunciado: 'De la tienda, traé el nombre del cliente como <code>cliente</code> y el '
        + 'nombre de su ciudad como <code>ciudad</code>, ordenado por cliente.',
      pista: '<code>UNIR otra SEGUN condición</code> pone las dos tablas una al lado de la '
        + 'otra, emparejadas por la columna que las relaciona. Con dos tablas que tienen una '
        + 'columna con el mismo nombre hay que decir de cuál: <code>c.nombre</code>.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los tres que tienen ciudad',
        preparar: TIENDA,
        espera: [['columnas', ['cliente', 'ciudad']],
          ['en_orden', ['cliente', 'ciudad'],
            [['Ana', 'Luque'], ['Beto', 'Luque'], ['Cata', 'Asuncion']]],
          ['usa', 'unir']]
      }]
    },
    {
      id: 'b34', nivel: 'medio', titulo: 'Sin perder a los que no tienen',
      enunciado: 'Lo mismo que antes, pero que <strong>aparezcan los cuatro clientes</strong>: '
        + 'el que no tiene ciudad tiene que salir con la ciudad en NULO. Ordenado por cliente.',
      pista: '<code>IZQUIERDA UNIR</code>: la fila de la izquierda sale igual aunque no '
        + 'encuentre pareja, con las columnas de la derecha en NULO. Es exactamente por esto '
        + 'que existe.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Dani sale con la ciudad en NULO',
        preparar: TIENDA,
        espera: [['en_orden', ['cliente', 'ciudad'],
          [['Ana', 'Luque'], ['Beto', 'Luque'], ['Cata', 'Asuncion'], ['Dani', null]]],
          ['usa', 'izquierda_unir']]
      }]
    },
    {
      id: 'b35', nivel: 'medio', titulo: 'Tres tablas',
      enunciado: 'De la tienda, traé el nombre del cliente como <code>cliente</code>, el de '
        + 'su ciudad como <code>ciudad</code> y el monto de cada compra como '
        + '<code>monto</code>. Ordenado por cliente y monto.',
      pista: 'Los UNIR se encadenan: uno por cada tabla que se suma, cada uno con su '
        + 'SEGUN. Conviene ponerle alias corto a cada tabla.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Las tres compras con cliente y ciudad',
        preparar: TIENDA,
        espera: [['en_orden', ['cliente', 'ciudad', 'monto'],
          [['Ana', 'Luque', 50000], ['Ana', 'Luque', 100000], ['Beto', 'Luque', 300000]]]]
      }]
    },
    {
      id: 'b36', nivel: 'medio', titulo: 'Cuánto compró cada ciudad',
      enunciado: 'De la tienda, traé el nombre de la ciudad como <code>ciudad</code> y el '
        + 'total comprado por su gente como <code>total</code>, de mayor a menor.',
      pista: 'Se puede agrupar sobre el resultado de un UNIR: primero se juntan las tablas '
        + 'y después se agrupa por la columna que interesa.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Luque, con las tres compras de Ana y Beto',
        preparar: TIENDA,
        espera: [['en_orden', ['ciudad', 'total'], [['Luque', 450000]]]]
      }]
    },
    {
      id: 'b37', nivel: 'medio', titulo: 'Un valor del programa',
      enunciado: 'Guardá <strong>7</strong> en una variable <code>corte</code> y traé el '
        + '<code>nombre</code> de los alumnos con nota mayor o igual a esa variable, ordenado '
        + 'por nombre.',
      pista: 'Adentro de una instrucción escrita suelta, <code>@nombre</code> es el valor de '
        + 'esa variable de SL, ya citado como corresponde. Así no hay que armar la consulta a '
        + 'mano con <code>+</code> y <code>str()</code>.',
      plantilla: 'var\n   corte : numerico\ninicio\n\nfin\n',
      pruebas: [{
        nombre: 'Ana y Cata',
        preparar: ALUMNOS,
        espera: [['resultado', ['nombre'], [['Ana'], ['Cata']]]]
      }]
    },
    {
      id: 'b38', nivel: 'medio', titulo: 'Por encima del promedio',
      enunciado: 'De <code>alumnos</code>, traé el <code>nombre</code> de los que tienen nota '
        + '<strong>mayor al promedio de todas</strong>, ordenado por nombre.',
      pista: 'Una subconsulta es una consulta adentro de otra, entre paréntesis, donde iría '
        + 'el valor. Esta es «suelta»: no nombra nada de la de afuera, así que se calcula una '
        + 'vez y vale para todas las filas.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Cata, que pasan el 6,75',
        preparar: ALUMNOS,
        espera: [['en_orden', ['nombre'], [['Ana'], ['Cata']]], ['usa', 'subconsulta']]
      }]
    },
    {
      id: 'b39', nivel: 'medio', titulo: 'Los que están en la otra tabla',
      enunciado: 'De la tienda, traé el <code>nombre</code> de los clientes que '
        + '<strong>hicieron alguna compra</strong>, ordenado. Resolvelo con <code>EN</code> y '
        + 'una subconsulta.',
      pista: '<code>DONDE id EN (SELECCIONAR …)</code>: la de adentro tiene que traer una '
        + 'sola columna.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre'], [['Ana'], ['Beto']]], ['usa', 'en_subconsulta']]
      }]
    },
    {
      id: 'b40', nivel: 'medio', titulo: 'Una tabla que sale de una consulta',
      enunciado: 'De <code>ventas</code>, traé el <code>vendedor</code> y su total como '
        + '<code>total</code>, pero solo los que pasan de 30000, <strong>usando una tabla '
        + 'derivada</strong> en vez de TENIENDO. Ordenado por vendedor.',
      pista: 'Una consulta puede ir en el <code>DE</code>, como si fuera una tabla: '
        + '<code>DE (SELECCIONAR …) COMO t</code>. El alias no es opcional — el resultado no '
        + 'tiene nombre propio.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto, sin TENIENDO',
        preparar: VENTAS,
        espera: [['en_orden', ['vendedor', 'total'], [['Ana', 39000], ['Beto', 84000]]],
          ['usa', 'tabla_derivada']]
      }]
    },

    /* =================================================================== */
    /* DIFÍCIL — subconsultas correlacionadas y el nulo                    */
    /* =================================================================== */
    {
      id: 'b41', nivel: 'dificil', titulo: 'Cuánto compró cada uno',
      enunciado: 'De la tienda, traé el <code>nombre</code> de cada cliente y el total de sus '
        + 'compras como <code>total</code>, <strong>con una subconsulta</strong> (no con '
        + 'UNIR). Los cuatro clientes tienen que aparecer; el que no compró va en NULO. '
        + 'Ordenado por nombre.',
      pista: 'Una subconsulta «correlacionada» nombra la fila de afuera —el <code>c.id</code> '
        + 'del cliente— y entonces se calcula una vez por cada fila. Sin filas que sumar, '
        + '<code>SUMAR</code> da NULO.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los cuatro, con el total de cada uno',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre', 'total'],
          [['Ana', 150000], ['Beto', 300000], ['Cata', null], ['Dani', null]]],
          ['usa', 'subconsulta']]
      }]
    },
    {
      id: 'b42', nivel: 'dificil', titulo: 'Los que compraron, con EXISTE',
      enunciado: 'De la tienda, traé el <code>nombre</code> de los clientes que hicieron '
        + 'alguna compra, ordenado, <strong>resuelto con EXISTE</strong>.',
      pista: '<code>EXISTE (SELECCIONAR 1 DE … DONDE …)</code> no mira valores: solo pregunta '
        + 'si la consulta de adentro trae al menos una fila. Por eso adentro se pone '
        + '<code>1</code> y no una columna.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre'], [['Ana'], ['Beto']]], ['usa', 'existe']]
      }]
    },
    {
      id: 'b43', nivel: 'dificil', titulo: 'Los que no compraron',
      enunciado: 'De la tienda, traé el <code>nombre</code> de los clientes que '
        + '<strong>no hicieron ninguna compra</strong>, ordenado, resuelto con '
        + '<code>NO EXISTE</code>.',
      pista: 'Mismo EXISTE, con <code>NO</code> adelante. Hay una compra con el cliente en '
        + 'NULO, y con NO EXISTE eso no molesta: esa compra no empareja con nadie, así que no '
        + 'tapa a nadie.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cata y Dani',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre'], [['Cata'], ['Dani']]], ['usa', 'existe']]
      }]
    },
    {
      id: 'b44', nivel: 'dificil', titulo: 'La trampa de NO EN',
      enunciado: 'La misma pregunta que el anterior —los clientes que no compraron— pero '
        + 'resuelta con <code>NO EN</code>. Para que funcione tenés que '
        + '<strong>sacar los nulos</strong> de la subconsulta. Ordenado por nombre.',
      pista: 'Sin sacarlos no devuelve a nadie, y es correcto: «¿el 3 está entre 1, 2 y no se '
        + 'sabe?» no tiene respuesta, porque ese que no se sabe podría ser el 3. Agregá '
        + '<code>DONDE cliente ES NO NULO</code> adentro.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Cata y Dani, con NO EN',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre'], [['Cata'], ['Dani']]], ['usa', 'en_subconsulta']]
      }]
    },
    {
      id: 'b45', nivel: 'dificil', titulo: 'La compra más grande de cada uno',
      enunciado: 'De la tienda, traé el <code>nombre</code> del cliente y el monto de '
        + '<strong>su compra más grande</strong> como <code>mayor</code>, solo de los que '
        + 'compraron. Ordenado por nombre.',
      pista: 'Una escalar correlacionada con <code>MAXIMO</code>, y afuera un filtro para '
        + 'dejar solo a los que tienen alguna. Acordate de que una escalar tiene que traer '
        + 'una sola fila: si trae más, el motor para en vez de elegir una al azar.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana con 100000, Beto con 300000',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre', 'mayor'], [['Ana', 100000], ['Beto', 300000]]],
          ['usa', 'subconsulta']]
      }]
    },
    {
      id: 'b46', nivel: 'dificil', titulo: 'Los que compraron más que el promedio',
      enunciado: 'De la tienda, traé el <code>nombre</code> del cliente y su total como '
        + '<code>total</code>, solo de los que compraron <strong>más que el promedio de una '
        + 'compra</strong>. Usá una <strong>tabla derivada</strong> unida con '
        + '<code>clientes</code>. Ordenado por nombre.',
      pista: 'La derivada agrupa las compras por cliente; el UNIR le pega el nombre; y el '
        + 'promedio de una compra sale de otra subconsulta suelta.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto pasan el promedio de 114250',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre', 'total'], [['Ana', 150000], ['Beto', 300000]]],
          ['usa', 'tabla_derivada'], ['usa', 'unir']]
      }]
    },
    {
      id: 'b47', nivel: 'dificil', titulo: 'Una subconsulta en el TENIENDO',
      enunciado: 'De <code>ventas</code>, traé el <code>vendedor</code> y su total como '
        + '<code>total</code>, solo los que venden <strong>más que el promedio de una '
        + 'venta</strong>. La comparación va en el <code>TENIENDO</code>. Ordenado por '
        + 'vendedor.',
      pista: 'Una subconsulta vale en el TENIENDO igual que en el DONDE. El promedio de una '
        + 'venta son 26200.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto',
        preparar: VENTAS,
        espera: [['en_orden', ['vendedor', 'total'], [['Ana', 39000], ['Beto', 84000]]],
          ['usa', 'teniendo'], ['usa', 'subconsulta']]
      }]
    },
    {
      id: 'b48', nivel: 'dificil', titulo: 'Modificar con una subconsulta',
      enunciado: 'En la tienda, poné la <code>ciudad</code> de todos los clientes que '
        + '<strong>compraron alguna vez</strong> en <strong>3</strong>. Después traé '
        + '<code>nombre</code> y <code>ciudad</code> de los cuatro, ordenados por nombre.',
      pista: 'Una subconsulta también vale adentro de un <code>ACTUALIZAR</code>. Y si algo '
        + 'falla en el medio, no queda nada a medias: la instrucción se aplica entera o no se '
        + 'aplica.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Ana y Beto se mudaron',
        preparar: TIENDA,
        espera: [['en_orden', ['nombre', 'ciudad'],
          [['Ana', 3], ['Beto', 3], ['Cata', 2], ['Dani', null]]]]
      }]
    },
    {
      id: 'b49', nivel: 'dificil', titulo: 'La ciudad que más compra',
      enunciado: 'De la tienda, traé el nombre de la ciudad como <code>ciudad</code> cuyo '
        + 'total comprado sea <strong>el más alto de todos</strong>. Una sola fila.',
      pista: 'Agrupá por ciudad, y compará ese total contra el máximo de los totales: eso es '
        + 'una subconsulta adentro de otra. También se puede ordenar y quedarse con el primero '
        + 'con LIMITE, pero acá se pide la subconsulta.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Luque',
        preparar: TIENDA,
        espera: [['resultado', ['ciudad'], [['Luque']]], ['usa', 'tabla_derivada']]
      }]
    },
    {
      id: 'b50', nivel: 'dificil', titulo: 'El informe',
      enunciado: 'De la tienda, armá un informe con el <code>nombre</code> del cliente, el '
        + 'nombre de su ciudad como <code>ciudad</code>, cuántas compras hizo como '
        + '<code>compras</code> y cuánto gastó como <code>total</code>. Tienen que estar '
        + '<strong>los cuatro clientes</strong>, el que no compró con <code>0</code> compras y '
        + '<code>0</code> gastado, y el que no tiene ciudad con la ciudad en NULO. Ordenado de '
        + 'mayor a menor gasto y, cuando empatan, por nombre.',
      pista: 'Un IZQUIERDA UNIR para no perder a nadie, dos veces: una con ciudades y otra '
        + 'con compras. <code>CONTAR(p.id)</code> cuenta solo las compras que hay —no '
        + '<code>CONTAR(*)</code>, que contaría la fila de nulos— y <code>SI_NULO</code> tapa '
        + 'el total vacío.',
      plantilla: vacio,
      pruebas: [{
        nombre: 'Los cuatro, con sus cuentas',
        preparar: TIENDA,
        espera: [['columnas', ['nombre', 'ciudad', 'compras', 'total']],
          ['en_orden', ['nombre', 'ciudad', 'compras', 'total'],
            [['Beto', 'Luque', 1, 300000], ['Ana', 'Luque', 2, 150000],
              ['Cata', 'Asuncion', 0, 0], ['Dani', null, 0, 0]]],
          ['usa', 'izquierda_unir'], ['usa', 'agrupar']]
      }]
    }
  ];

  global.CURSO_BD = { EJERCICIOS, DATOS: { ALUMNOS, VENTAS, TIENDA } };
})(typeof window !== 'undefined' ? window : globalThis);

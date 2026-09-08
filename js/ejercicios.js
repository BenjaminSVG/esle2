/* Curso integrado de ESLE2: ejercicios por nivel y ejemplos para el IDE. */
(function (global) {
  'use strict';

  const EJERCICIOS = [
    /* ------------------------------- FÁCIL ------------------------------- */
    {
      id: 'f1', nivel: 'facil', titulo: 'Hola, mundo',
      enunciado: 'Escribí un programa que imprima exactamente el texto <code>Hola, mundo!</code>.',
      pista: 'La subrutina <code>imprimir()</code> muestra en pantalla todo lo que recibe como parámetro.',
      plantilla: 'programa hola\ninicio\n   // escribí tu código acá\nfin\n',
      pruebas: [{ entrada: '', salida: 'Hola, mundo!' }]
    },
    {
      id: 'f2', nivel: 'facil', titulo: 'Suma de dos números',
      enunciado: 'Leé dos números e imprimí únicamente su suma.<br>Ejemplo: con la entrada <code>3,5</code> debe imprimir <code>8</code>.',
      pista: '<code>leer (a, b)</code> toma dos valores separados por coma.',
      plantilla: 'var\n   a, b : numerico\ninicio\n   leer (a, b)\n   // imprimí la suma\nfin\n',
      pruebas: [
        { entrada: '3,5', salida: '8' },
        { entrada: '10,-4', salida: '6' },
        { entrada: '2.5,0.5', salida: '3' }
      ]
    },
    {
      id: 'f3', nivel: 'facil', titulo: 'Área de un rectángulo',
      enunciado: 'Leé la base y la altura de un rectángulo e imprimí su área (solo el número).',
      pista: 'Área = base × altura.',
      plantilla: 'var\n   base, altura : numerico\ninicio\n   leer (base, altura)\nfin\n',
      pruebas: [
        { entrada: '4,5', salida: '20' },
        { entrada: '2.5,4', salida: '10' }
      ]
    },
    {
      id: 'f4', nivel: 'facil', titulo: '¿Par o impar?',
      enunciado: 'Leé un número entero e imprimí <code>par</code> o <code>impar</code> según corresponda.',
      pista: 'El operador <code>%</code> devuelve el resto de la división.',
      plantilla: 'var\n   n : numerico\ninicio\n   leer (n)\n   si ( n % 2 == 0 )\n   {\n      // ...\n   }\nfin\n',
      pruebas: [
        { entrada: '7', salida: 'impar' },
        { entrada: '8', salida: 'par' },
        { entrada: '0', salida: 'par' }
      ]
    },
    {
      id: 'f5', nivel: 'facil', titulo: 'El mayor de tres',
      enunciado: 'Leé tres números e imprimí el mayor de ellos.',
      pista: 'Podés encadenar condiciones con <code>sino si (...)</code>.',
      plantilla: 'var\n   a, b, c : numerico\ninicio\n   leer (a, b, c)\nfin\n',
      pruebas: [
        { entrada: '3,9,5', salida: '9' },
        { entrada: '20,7,12', salida: '20' },
        { entrada: '-5,-2,-9', salida: '-2' }
      ]
    },
    {
      id: 'f6', nivel: 'facil', titulo: 'Tabla de multiplicar',
      enunciado: 'Leé un número <code>n</code> e imprimí su tabla del 1 al 10, una línea por cada producto, con el formato:<br><code>3 x 1 = 3</code>',
      pista: 'Usá el ciclo <code>desde k=1 hasta 10</code> y concatená con <code>imprimir</code>.',
      plantilla: 'var\n   n, k : numerico\ninicio\n   leer (n)\n   desde k=1 hasta 10\n   {\n      // imprimir("\\n", n, " x ", k, " = ", n*k)\n   }\nfin\n',
      pruebas: [
        { entrada: '3', salida: '3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27\n3 x 10 = 30' },
        { entrada: '10', salida: '10 x 1 = 10\n10 x 2 = 20\n10 x 3 = 30\n10 x 4 = 40\n10 x 5 = 50\n10 x 6 = 60\n10 x 7 = 70\n10 x 8 = 80\n10 x 9 = 90\n10 x 10 = 100' }
      ]
    },

    {
      id: 'f7', nivel: 'facil', titulo: 'De Celsius a Fahrenheit',
      enunciado: 'Leé una temperatura en grados Celsius e imprimí su equivalente en Fahrenheit (solo el número).<br>La fórmula es <code>F = C × 9 / 5 + 32</code>.',
      pista: 'Cuidado con la precedencia: <code>c * 9 / 5</code> se evalúa de izquierda a derecha, que es justo lo que necesitás.',
      plantilla: 'var\n   c, f : numerico\ninicio\n   leer (c)\nfin\n',
      pruebas: [
        { entrada: '100', salida: '212' },
        { entrada: '37', salida: '98.6' },
        { entrada: '-40', salida: '-40' }
      ]
    },
    {
      id: 'f8', nivel: 'facil', titulo: 'Perímetro y área del círculo',
      enunciado: 'Leé el radio de un círculo. Imprimí en la primera línea el perímetro y en la segunda el área, ambos con <strong>dos decimales</strong>.<br>Usá <code>PI = 3.141592654</code>.',
      pista: 'Declarás <code>const PI = 3.141592654</code> y formateás con <code>str (valor, 0, 2)</code>.',
      plantilla: 'const\n   PI = 3.141592654\nvar\n   r : numerico\ninicio\n   leer (r)\nfin\n',
      pruebas: [
        { entrada: '1', salida: '6.28\n3.14' },
        { entrada: '2.5', salida: '15.71\n19.63' }
      ]
    },
    {
      id: 'f9', nivel: 'facil', titulo: 'Cuenta regresiva',
      enunciado: 'Leé un número <code>n</code> e imprimí la cuenta regresiva desde <code>n</code> hasta 1, un número por línea.',
      pista: 'El ciclo <code>desde</code> admite un incremento negativo: <code>desde k=n hasta 1 paso -1</code>.',
      plantilla: 'var\n   n, k : numerico\ninicio\n   leer (n)\nfin\n',
      pruebas: [
        { entrada: '5', salida: '5\n4\n3\n2\n1' },
        { entrada: '1', salida: '1' }
      ]
    },
    {
      id: 'f10', nivel: 'facil', titulo: 'Signo de un número',
      enunciado: 'Leé un número e imprimí <code>positivo</code>, <code>negativo</code> o <code>cero</code>.',
      pista: 'Tres casos: usá <code>eval</code> con <code>caso</code> y <code>sino</code>, o un <code>si … sino si … sino</code>.',
      plantilla: 'var\n   n : numerico\ninicio\n   leer (n)\n   eval\n   {\n      caso ( n > 0 )   // ...\n   }\nfin\n',
      pruebas: [
        { entrada: '7', salida: 'positivo' },
        { entrada: '-3.5', salida: 'negativo' },
        { entrada: '0', salida: 'cero' }
      ]
    },

    {
      id: 'f11', nivel: 'facil', titulo: 'Año bisiesto',
      enunciado: 'Leé un año e imprimí <code>bisiesto</code> o <code>comun</code>.<br>Un año es bisiesto si es divisible por 4 y no por 100, <em>o bien</em> si es divisible por 400.<br>Escribí la condición con los operadores <code>&amp;&amp;</code> y <code>||</code>, que SLE2 admite como sinónimos de <code>and</code> y <code>or</code>.',
      pista: 'La condición completa es <code>(a % 4 == 0 &amp;&amp; a % 100 &lt;&gt; 0) || a % 400 == 0</code>.',
      plantilla: 'var\n   a = 0\ninicio\n   leer (a)\n   si ( /* condición */ FALSE )\n   {\n      imprimir ("bisiesto")\n   sino\n      imprimir ("comun")\n   }\nfin\n',
      pruebas: [
        { entrada: '2024', salida: 'bisiesto' },
        { entrada: '1900', salida: 'comun' },
        { entrada: '2000', salida: 'bisiesto' },
        { entrada: '2023', salida: 'comun' }
      ]
    },
    {
      id: 'f12', nivel: 'facil', titulo: 'Mayor y menor con max() y min()',
      enunciado: 'Leé tres números. Imprimí el mayor en la primera línea y el menor en la segunda, usando las funciones predefinidas <code>max()</code> y <code>min()</code> en vez de sentencias <code>si</code>.',
      pista: 'Ambas comparan de a dos valores, así que se anidan: <code>max (max (a, b), c)</code>.',
      plantilla: 'var\n   a = 0\n   b = 0\n   c = 0\ninicio\n   leer (a, b, c)\nfin\n',
      pruebas: [
        { entrada: '3,9,5', salida: '9\n3' },
        { entrada: '-1,-7,-3', salida: '-1\n-7' },
        { entrada: '4,4,4', salida: '4\n4' }
      ]
    },

    /* ------------------------------- MEDIO ------------------------------- */
    {
      id: "f13", nivel: "facil", titulo: "Precio con IVA",
      enunciado: "Leé el precio de un producto e imprimí cuánto hay que pagar con el 10% de IVA incluido, sin decimales.<br>Ejemplo: con <code>15000</code> debe imprimir <code>16500</code>.",
      pista: "El 10% de un número es multiplicarlo por <code>0.1</code>. También podés multiplicar el precio por <code>1.1</code> de una vez.",
      plantilla: "var\n   precio : numerico\ninicio\n   leer (precio)\nfin\n",
      pruebas: [
        { entrada: "15000", salida: "16500" },
        { entrada: "0", salida: "0" },
        { entrada: "1000", salida: "1100" }
      ]
    },
    {
      id: "f14", nivel: "facil", titulo: "Suma de 1 hasta n",
      enunciado: "Leé un número <code>n</code> e imprimí la suma de todos los números del 1 al <code>n</code>.<br>Con <code>5</code> debe imprimir <code>15</code> (1+2+3+4+5).",
      pista: "Un acumulador es una variable que arranca en 0 y va creciendo dentro del ciclo: <code>suma = suma + k</code>.",
      plantilla: "var\n   n, k, suma : numerico\ninicio\n   leer (n)\n   suma = 0\n   desde k=1 hasta n\n   {\n      // sumá k\n   }\nfin\n",
      pruebas: [
        { entrada: "5", salida: "15" },
        { entrada: "1", salida: "1" },
        { entrada: "100", salida: "5050" }
      ]
    },
    {
      id: "f15", nivel: "facil", titulo: "Gritar un texto",
      enunciado: "Leé un texto e imprimí, en la primera línea, cuántas letras tiene, y en la segunda, el texto en mayúsculas.<br>Con <code>hola</code> debe imprimir <code>4</code> y después <code>HOLA</code>.",
      pista: "<code>strlen (t)</code> devuelve la cantidad de caracteres y <code>upper (t)</code> devuelve el texto en mayúsculas.",
      plantilla: "var\n   t : cadena\ninicio\n   leer (t)\nfin\n",
      pruebas: [
        { entrada: "hola", salida: "4\nHOLA" },
        { entrada: "Buen dia", salida: "8\nBUEN DIA" }
      ]
    },
    {
      id: "f16", nivel: "facil", titulo: "Descuento por cantidad",
      enunciado: "Leé el precio unitario y la cantidad de unidades. Si se llevan 10 o más, hay un 15% de descuento sobre el total.<br>Imprimí el total a pagar, sin decimales.",
      pista: "Primero calculá el total y después decidí si corresponde el descuento. Un <code>si</code> con una sola condición alcanza.",
      plantilla: "var\n   precio, cant, total : numerico\ninicio\n   leer (precio, cant)\n   total = precio * cant\nfin\n",
      pruebas: [
        { entrada: "1000,3", salida: "3000" },
        { entrada: "1000,10", salida: "8500" },
        { entrada: "2000,20", salida: "34000" }
      ]
    },

    {
      id: 'm1', nivel: 'medio', titulo: 'Factorial',
      enunciado: 'Leé un número entero positivo <code>n</code> e imprimí <code>n!</code> (el factorial).<br>Para <code>n = 0</code> el resultado es <code>1</code>.',
      pista: 'Acumulá el producto dentro de un ciclo <code>desde</code>.',
      plantilla: 'var\n   n, k, f : numerico\ninicio\n   leer (n)\n   f = 1\nfin\n',
      pruebas: [
        { entrada: '5', salida: '120' },
        { entrada: '0', salida: '1' },
        { entrada: '10', salida: '3628800' }
      ]
    },
    {
      id: 'm2', nivel: 'medio', titulo: 'Suma de los dígitos',
      enunciado: 'Leé un número entero positivo e imprimí la suma de sus dígitos.<br>Ejemplo: <code>1234</code> → <code>10</code>.',
      pista: 'Con <code>n % 10</code> obtenés el último dígito y con <code>int(n/10)</code> quitás ese dígito.',
      plantilla: 'var\n   n, s : numerico\ninicio\n   leer (n)\n   repetir\n      // ...\n   hasta ( n == 0 )\nfin\n',
      pruebas: [
        { entrada: '1234', salida: '10' },
        { entrada: '9', salida: '9' },
        { entrada: '100000', salida: '1' }
      ]
    },
    {
      id: 'm3', nivel: 'medio', titulo: 'Contar vocales',
      enunciado: 'Leé una cadena e imprimí cuántas vocales contiene (contá tanto minúsculas como mayúsculas, sin tildes).',
      pista: 'Recorré la cadena con <code>desde k=1 hasta strlen(s)</code> y accedé a cada carácter con <code>s[k]</code>. <code>lower()</code> te ahorra la mitad de las comparaciones.',
      plantilla: 'var\n   s : cadena\n   k, c : numerico\ninicio\n   leer (s)\n   s = lower (s)\nfin\n',
      pruebas: [
        { entrada: 'programacion', salida: '5' },
        { entrada: 'AEIOU', salida: '5' },
        { entrada: 'xyz', salida: '0' }
      ]
    },
    {
      id: 'm4', nivel: 'medio', titulo: 'Invertir una cadena',
      enunciado: 'Leé una cadena e imprimí la misma cadena al revés.<br>Ejemplo: <code>asuncion</code> → <code>noicnusa</code>.',
      pista: 'Recorré desde el último carácter hasta el primero usando <code>paso -1</code>.',
      plantilla: 'var\n   s, r : cadena\n   k : numerico\ninicio\n   leer (s)\nfin\n',
      pruebas: [
        { entrada: 'asuncion', salida: 'noicnusa' },
        { entrada: 'SL', salida: 'LS' }
      ]
    },
    {
      id: 'm5', nivel: 'medio', titulo: 'Serie de Fibonacci',
      enunciado: 'Leé <code>n</code> e imprimí los primeros <code>n</code> términos de la serie de Fibonacci (empezando en 0 y 1), uno por línea.',
      pista: 'Necesitás tres variables: los dos términos anteriores y el nuevo.',
      plantilla: 'var\n   n, a, b, c : numerico\ninicio\n   leer (n)\n   a = 0\n   b = 1\nfin\n',
      pruebas: [
        { entrada: '7', salida: '0\n1\n1\n2\n3\n5\n8' },
        { entrada: '1', salida: '0' }
      ]
    },
    {
      id: 'm6', nivel: 'medio', titulo: 'Promedio de notas',
      enunciado: 'Leé la cantidad de alumnos <code>n</code>, luego las <code>n</code> notas (una por línea) y guardalas en un vector. Imprimí el promedio.',
      pista: 'Declarás el vector abierto con <code>vector [*] numerico</code> y lo dimensionás con <code>dim (v, n)</code>.',
      plantilla: 'var\n   notas : vector [*] numerico\n   n, k, suma : numerico\ninicio\n   leer (n)\n   dim (notas, n)\nfin\n',
      pruebas: [
        { entrada: '4\n10\n8\n9\n7', salida: '8.5' },
        { entrada: '3\n100\n50\n0', salida: '50' }
      ]
    },

    {
      id: 'm7', nivel: 'medio', titulo: 'Contar palabras',
      enunciado: 'Leé una frase e imprimí cuántas palabras tiene. Las palabras están separadas por un solo espacio y la frase no empieza ni termina con espacios.',
      pista: 'Contá los espacios y sumá 1. Recorré la cadena carácter por carácter comparando con <code>\' \'</code>.',
      plantilla: 'var\n   s : cadena\n   k, c : numerico\ninicio\n   leer (s)\nfin\n',
      pruebas: [
        { entrada: 'hola mundo cruel', salida: '3' },
        { entrada: 'programar en SLE2 es divertido', salida: '5' },
        { entrada: 'sola', salida: '1' }
      ]
    },
    {
      id: 'm8', nivel: 'medio', titulo: 'Máximo común divisor',
      enunciado: 'Leé dos números enteros positivos e imprimí su máximo común divisor usando el algoritmo de Euclides.',
      pista: 'Euclides: mientras <code>b &lt;&gt; 0</code>, guardás <code>resto = a % b</code>, después <code>a = b</code> y <code>b = resto</code>. Al final el MCD es <code>a</code>.',
      plantilla: 'var\n   a, b, resto : numerico\ninicio\n   leer (a, b)\nfin\n',
      pruebas: [
        { entrada: '48,18', salida: '6' },
        { entrada: '17,5', salida: '1' },
        { entrada: '100,75', salida: '25' }
      ]
    },
    {
      id: 'm9', nivel: 'medio', titulo: 'Máximo y mínimo',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> números. Imprimí el mayor en la primera línea y el menor en la segunda.',
      pista: 'Arrancá suponiendo que el primer elemento es a la vez el mayor y el menor, y después compará con el resto.',
      plantilla: 'var\n   v : vector [*] numerico\n   n, k, may, men : numerico\ninicio\n   leer (n)\n   dim (v, n)\nfin\n',
      pruebas: [
        { entrada: '5\n4\n9\n1\n7\n3', salida: '9\n1' },
        { entrada: '3\n-2\n-8\n-5', salida: '-2\n-8' }
      ]
    },
    {
      id: 'm10', nivel: 'medio', titulo: 'Potencia con ciclo',
      enunciado: 'Leé una base y un exponente entero mayor o igual a cero. Calculá la potencia <strong>sin usar el operador <code>^</code></strong>, multiplicando dentro de un ciclo, e imprimí el resultado.',
      pista: 'Empezás con el resultado en 1 y multiplicás por la base tantas veces como indique el exponente.',
      plantilla: 'var\n   base, exp, k, r : numerico\ninicio\n   leer (base, exp)\n   r = 1\nfin\n',
      pruebas: [
        { entrada: '2,10', salida: '1024' },
        { entrada: '5,0', salida: '1' },
        { entrada: '3,4', salida: '81' }
      ]
    },
    {
      id: 'm11', nivel: 'medio', titulo: 'Segundos a hh:mm:ss',
      enunciado: 'Leé una cantidad de segundos e imprimí el tiempo con el formato <code>hh:mm:ss</code>, siempre con dos dígitos en cada parte.<br>Ejemplo: <code>3661</code> → <code>01:01:01</code>.',
      pista: 'Con <code>str (n, 2, 0, "0")</code> obtenés el número con dos dígitos rellenando con ceros a la izquierda.',
      plantilla: 'var\n   t, h, m, s : numerico\ninicio\n   leer (t)\nfin\n',
      pruebas: [
        { entrada: '3661', salida: '01:01:01' },
        { entrada: '59', salida: '00:00:59' },
        { entrada: '86399', salida: '23:59:59' }
      ]
    },

    {
      id: 'm12', nivel: 'medio', titulo: 'Par o impar con ifval()',
      enunciado: 'Leé un número entero e imprimí, con <strong>una sola llamada</strong> a <code>imprimir()</code> y sin usar <code>si</code>, un texto como <code>8 es par</code> o <code>7 es impar</code>.',
      pista: '<code>ifval (condicion, valor_si_es_verdadera, valor_si_es_falsa)</code> es una expresión: devuelve uno de los dos valores y solo evalúa el que corresponde.',
      plantilla: 'var\n   n = 0\ninicio\n   leer (n)\n   imprimir (n, " es ", ifval ( /* condición */ FALSE , "par", "impar"))\nfin\n',
      pruebas: [
        { entrada: '8', salida: '8 es par' },
        { entrada: '7', salida: '7 es impar' },
        { entrada: '0', salida: '0 es par' }
      ]
    },
    {
      id: 'm13', nivel: 'medio', titulo: 'Invertir un vector con intercambiar()',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> números. Invertí el vector <strong>en su lugar</strong> usando <code>intercambiar()</code> (o su sinónimo <code>swap()</code>) y mostralo con una sola llamada <code>imprimir (v)</code>, que separa los valores con comas.<br>Ejemplo: con 1 2 3 4 5 debe imprimir <code>5,4,3,2,1</code>.',
      pista: 'Alcanza con recorrer la mitad del vector: <code>desde k=1 hasta int (n/2)</code> e intercambiar <code>v[k]</code> con <code>v[n-k+1]</code>.',
      plantilla: 'var\n   v : vector [*] numerico\n   n = 0\n   k = 0\ninicio\n   leer (n)\n   dim (v, n)\n   leer (v)\nfin\n',
      pruebas: [
        { entrada: '5\n1,2,3,4,5', salida: '5,4,3,2,1' },
        { entrada: '4\n10,20,30,40', salida: '40,30,20,10' },
        { entrada: '1\n7', salida: '7' }
      ]
    },
    {
      id: 'm14', nivel: 'medio', titulo: 'Listado con set_ofs()',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> palabras (una por línea). Guardalas en un vector e imprimilas con <strong>una sola llamada</strong> a <code>imprimir()</code>, separadas por un guion.<br>Ejemplo: <code>rojo-verde-azul</code>.',
      pista: '<code>set_ofs ("-")</code> cambia el separador que usa <code>imprimir()</code> para los datos estructurados; después alcanza con <code>imprimir (v)</code>.',
      plantilla: 'var\n   v : vector [*] cadena\n   n = 0\n   k = 0\ninicio\n   leer (n)\n   dim (v, n)\n   desde k=1 hasta n\n   {\n      leer (v [k])\n   }\nfin\n',
      pruebas: [
        { entrada: '3\nrojo\nverde\nazul', salida: 'rojo-verde-azul' },
        { entrada: '1\nsolo', salida: 'solo' }
      ]
    },
    {
      id: 'm15', nivel: 'medio', titulo: 'Leer un registro completo',
      enunciado: 'Definí un tipo <code>PERSONA</code> con los campos <code>nombre</code> (cadena), <code>edad</code> (numérico) y <code>ciudad</code> (cadena). Leé una persona con <strong>una sola llamada</strong> a <code>leer()</code> —pasándole el registro entero, no cada campo— e imprimí <code>Ana (17) - Asuncion</code>.',
      pista: 'Cuando <code>leer()</code> recibe un registro, toma un campo de la entrada por cada campo del registro, en orden.',
      plantilla: 'tipos\n   PERSONA : registro\n   {\n      nombre : cadena\n      edad   : numerico\n      ciudad : cadena\n   }\nvar\n   p : PERSONA\ninicio\n   leer (p)\nfin\n',
      pruebas: [
        { entrada: 'Ana,17,Asuncion', salida: 'Ana (17) - Asuncion' },
        { entrada: 'Jose,40,Encarnacion', salida: 'Jose (40) - Encarnacion' }
      ]
    },

    /* ----------------------------- AVANZADO ------------------------------ */
    {
      id: "m16", nivel: "medio", titulo: "Un gráfico de barras",
      enunciado: "Leé la cantidad de datos y después cada valor, uno por línea. Por cada uno imprimí una barra de asteriscos con esa longitud, precedida del valor y un espacio.<br>Con el valor <code>3</code> la línea es <code>3 ***</code>.",
      pista: "Un ciclo adentro de otro: el de afuera recorre los datos y el de adentro dibuja los asteriscos de cada barra.",
      plantilla: "var\n   n, k, j, v : numerico\ninicio\n   leer (n)\n   desde k=1 hasta n\n   {\n      leer (v)\n      // dibujá la barra\n   }\nfin\n",
      pruebas: [
        { entrada: "3\n3\n5\n1", salida: "3 ***\n5 *****\n1 *" },
        { entrada: "1\n0", salida: "0" }
      ]
    },
    {
      id: "m17", nivel: "medio", titulo: "¿Es una contraseña segura?",
      enunciado: "Leé un texto y decidí si sirve como contraseña. Es segura si tiene 8 caracteres o más, al menos una letra mayúscula y al menos un dígito.<br>Imprimí <code>segura</code> o, si no, el primer problema que encuentres en este orden: <code>corta</code>, <code>sin mayuscula</code>, <code>sin digito</code>.",
      pista: "Recorré el texto con <code>substr (t, k, 1)</code>. Para saber si un carácter es dígito, compará: <code>c >= \"0\" and c <= \"9\"</code>.",
      plantilla: "var\n   t, c : cadena\n   k : numerico\n   hay_may, hay_dig : logico\ninicio\n   leer (t)\n   hay_may = FALSE\n   hay_dig = FALSE\nfin\n",
      pruebas: [
        { entrada: "Secreto1", salida: "segura" },
        { entrada: "corta1A", salida: "corta" },
        { entrada: "todominuscula1", salida: "sin mayuscula" },
        { entrada: "SinNumeros", salida: "sin digito" }
      ]
    },
    {
      id: "m18", nivel: "medio", titulo: "Cuánto vale cada billete",
      enunciado: "Leé un monto en guaraníes e imprimí cuántos billetes de cada denominación hacen falta, de mayor a menor, usando 100000, 50000, 20000, 10000, 5000 y 2000. Mostrá solo las denominaciones que se usan, con el formato <code>100000 x 2</code>, y al final el vuelto que no se puede cubrir: <code>resto 500</code>.",
      pista: "Guardá las denominaciones en un vector y recorrelo: la cantidad es la división entera (<code>int (monto / valor)</code>) y lo que sobra se calcula con <code>%</code>.",
      plantilla: "var\n   billetes : vector [6] numerico\n   monto, k, cuantos : numerico\ninicio\n   billetes = {100000, 50000, 20000, 10000, 5000, 2000}\n   leer (monto)\nfin\n",
      pruebas: [
        { entrada: "287500", salida: "100000 x 2\n50000 x 1\n20000 x 1\n10000 x 1\n5000 x 1\n2000 x 1\nresto 500" },
        { entrada: "1000", salida: "resto 1000" },
        { entrada: "100000", salida: "100000 x 1\nresto 0" }
      ]
    },

    {
      id: 'a1', nivel: 'avanzado', titulo: 'Números primos',
      enunciado: 'Leé un número <code>n</code> e imprimí todos los números primos entre 2 y <code>n</code>, uno por línea.',
      pista: 'Escribí una función <code>es_primo (x : numerico) retorna logico</code> y usala desde el programa principal.',
      plantilla: 'var\n   n, k : numerico\ninicio\n   leer (n)\nfin\n\nsubrutina es_primo (x : numerico) retorna logico\nvar\n   d : numerico\ninicio\n   retorna ( TRUE )\nfin\n',
      pruebas: [
        { entrada: '20', salida: '2\n3\n5\n7\n11\n13\n17\n19' },
        { entrada: '2', salida: '2' }
      ]
    },
    {
      id: 'a2', nivel: 'avanzado', titulo: 'Ordenar un vector',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> números. Ordenalos de menor a mayor e imprimilos, uno por línea.',
      pista: 'El método de la burbuja alcanza: dos ciclos <code>desde</code> anidados y un intercambio con variable auxiliar.',
      plantilla: 'var\n   v : vector [*] numerico\n   n, k, j, aux : numerico\ninicio\n   leer (n)\n   dim (v, n)\nfin\n',
      pruebas: [
        { entrada: '5\n4\n1\n9\n2\n7', salida: '1\n2\n4\n7\n9' },
        { entrada: '3\n-1\n-5\n0', salida: '-5\n-1\n0' }
      ]
    },
    {
      id: 'a3', nivel: 'avanzado', titulo: 'De decimal a binario',
      enunciado: 'Leé un número entero positivo e imprimí su representación en base 2 (solo los dígitos, sin espacios).<br>Ejemplo: <code>10</code> → <code>1010</code>.',
      pista: 'Armá la cadena de derecha a izquierda: <code>s = str(n % 2, 0, 0) + s</code>.',
      plantilla: 'var\n   n : numerico\n   s : cadena\ninicio\n   leer (n)\nfin\n',
      pruebas: [
        { entrada: '10', salida: '1010' },
        { entrada: '1', salida: '1' },
        { entrada: '255', salida: '11111111' }
      ]
    },
    {
      id: 'a4', nivel: 'avanzado', titulo: 'Palíndromo',
      enunciado: 'Leé una cadena e imprimí <code>SI</code> si es palíndroma (se lee igual al derecho y al revés) o <code>NO</code> en caso contrario. No hay espacios ni tildes en la entrada.',
      pista: 'Comparás el carácter <code>k</code> con el <code>strlen(s)-k+1</code>.',
      plantilla: 'var\n   s : cadena\n   k, g : numerico\n   ok : logico\ninicio\n   leer (s)\n   ok = TRUE\nfin\n',
      pruebas: [
        { entrada: 'reconocer', salida: 'SI' },
        { entrada: 'paraguay', salida: 'NO' },
        { entrada: 'aa', salida: 'SI' }
      ]
    },
    {
      id: 'a5', nivel: 'avanzado', titulo: 'Matriz transpuesta',
      enunciado: 'Leé la cantidad de filas <code>f</code> y de columnas <code>c</code> (en una línea, separadas por coma), luego los <code>f × c</code> valores fila por fila. Imprimí la matriz transpuesta: una línea por fila, con los valores separados por un espacio.',
      pista: 'Declarás <code>matriz [*,*] numerico</code> y usás <code>dim (m, f, c)</code>. La transpuesta cumple <code>t[i,j] = m[j,i]</code>.',
      plantilla: 'var\n   m, t : matriz [*,*] numerico\n   f, c, i, j : numerico\ninicio\n   leer (f, c)\n   dim (m, f, c)\nfin\n',
      pruebas: [
        { entrada: '2,3\n1\n2\n3\n4\n5\n6', salida: '1 4\n2 5\n3 6' },
        { entrada: '1,2\n7\n8', salida: '7\n8' }
      ]
    },
    {
      id: 'a6', nivel: 'avanzado', titulo: 'Búsqueda binaria',
      enunciado: 'Leé <code>n</code>, luego <code>n</code> números <strong>ya ordenados</strong> de menor a mayor, y por último el valor a buscar. Imprimí la posición donde está (contando desde 1) o <code>0</code> si no aparece. Usá búsqueda binaria, no un recorrido lineal.',
      pista: 'Mantené dos límites, <code>izq</code> y <code>der</code>. En cada vuelta mirás el elemento del medio y descartás la mitad que no puede contener al buscado.',
      plantilla: 'var\n   v : vector [*] numerico\n   n, k, buscado, izq, der, medio, pos : numerico\ninicio\n   leer (n)\n   dim (v, n)\nfin\n',
      pruebas: [
        { entrada: '5\n1\n3\n5\n7\n9\n7', salida: '4' },
        { entrada: '5\n1\n3\n5\n7\n9\n4', salida: '0' },
        { entrada: '1\n42\n42', salida: '1' }
      ]
    },
    {
      id: 'a7', nivel: 'avanzado', titulo: 'Producto de matrices',
      enunciado: 'Leé las dimensiones de la primera matriz (<code>f1,c1</code> en una línea) y sus valores fila por fila; después las dimensiones de la segunda (<code>f2,c2</code>) y sus valores. Imprimí la matriz producto, una fila por línea con los valores separados por un espacio.<br>Podés suponer que <code>c1 == f2</code>.',
      pista: 'Cada elemento del resultado es <code>suma de m1[i,k] * m2[k,j]</code> con <code>k</code> de 1 a <code>c1</code>. Necesitás tres ciclos anidados.',
      plantilla: 'var\n   m1, m2, r : matriz [*,*] numerico\n   f1, c1, f2, c2, i, j, k : numerico\ninicio\n   leer (f1, c1)\n   dim (m1, f1, c1)\nfin\n',
      pruebas: [
        { entrada: '2,3\n1\n2\n3\n4\n5\n6\n3,2\n7\n8\n9\n10\n11\n12', salida: '58 64\n139 154' },
        { entrada: '1,1\n3\n1,1\n5', salida: '15' }
      ]
    },
    {
      id: 'a8', nivel: 'avanzado', titulo: 'Triángulo de Pascal',
      enunciado: 'Leé <code>n</code> e imprimí las primeras <code>n</code> filas del triángulo de Pascal: una fila por línea, con los números separados por un espacio.',
      pista: 'Cada fila empieza y termina en 1, y cada valor interior es la suma de los dos que tiene arriba. Con una matriz abierta de contorno irregular sale muy natural.',
      plantilla: 'var\n   t : matriz [*,*] numerico\n   n, f, c : numerico\ninicio\n   leer (n)\n   dim (t, n, n)\nfin\n',
      pruebas: [
        { entrada: '5', salida: '1\n1 1\n1 2 1\n1 3 3 1\n1 4 6 4 1' },
        { entrada: '1', salida: '1' }
      ]
    },
    {
      id: 'a9', nivel: 'avanzado', titulo: 'Ordenar palabras',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> palabras (una por línea). Imprimilas ordenadas alfabéticamente, una por línea.',
      pista: 'Los operadores <code>&lt;</code> y <code>&gt;</code> también funcionan con cadenas: comparan carácter por carácter según la tabla ASCII.',
      plantilla: 'var\n   p : vector [*] cadena\n   n, k, j : numerico\n   aux : cadena\ninicio\n   leer (n)\n   dim (p, n)\nfin\n',
      pruebas: [
        { entrada: '4\nperu\nargentina\nparaguay\nbolivia', salida: 'argentina\nbolivia\nparaguay\nperu' },
        { entrada: '2\nzeta\nalfa', salida: 'alfa\nzeta' }
      ]
    },
    {
      id: 'a10', nivel: 'avanzado', titulo: 'Cifrado César',
      enunciado: 'Leé una palabra en minúsculas (sin espacios ni tildes) y luego un desplazamiento <code>d</code> entre 1 y 25. Imprimí la palabra cifrada corriendo cada letra <code>d</code> posiciones en el abecedario; después de la <code>z</code> se vuelve a la <code>a</code>.<br>Ejemplo: <code>hola</code> con <code>d = 3</code> → <code>krod</code>.',
      pista: 'Con <code>ord (c)</code> obtenés el código ASCII y con <code>ascii (n)</code> volvés al carácter. La <code>a</code> es 97: <code>nueva = (ord(c) - 97 + d) % 26 + 97</code>.',
      plantilla: 'var\n   s, r : cadena\n   d, k : numerico\ninicio\n   leer (s)\n   leer (d)\nfin\n',
      pruebas: [
        { entrada: 'hola\n3', salida: 'krod' },
        { entrada: 'zorro\n1', salida: 'apssp' },
        { entrada: 'sle\n13', salida: 'fyr' }
      ]
    },
    {
      id: 'a11', nivel: 'avanzado', titulo: 'Archivo de aprobados',
      enunciado: 'Leé <code>n</code> y luego <code>n</code> líneas con el formato <code>nombre,nota</code>. Grabá en el archivo <code>aprobados.txt</code> el nombre de cada alumno con nota mayor o igual a 60, uno por línea. Después volvé a leer ese archivo e imprimí:<br><code>aprobados: 2</code><br><code>Mirta,Luisa</code><br>(la cantidad en la primera línea y los nombres separados por coma en la segunda).',
      pista: '<code>set_stdout ("aprobados.txt")</code> hace que <code>imprimir()</code> escriba en el archivo; <code>set_stdout ("")</code> vuelve a la pantalla. Para releerlo: <code>set_stdin ("aprobados.txt")</code>, <code>set_ifs ("\\n")</code> y un ciclo <code>mientras ( not eof() )</code>.',
      plantilla: 'var\n   nombre = ""\n   nota = 0\n   lista = ""\n   n = 0\n   k = 0\n   cant = 0\ninicio\n   leer (n)\n   set_stdout ("aprobados.txt")\n   // grabá acá los aprobados\n   set_stdout ("")\nfin\n',
      pruebas: [
        { entrada: '3\nMirta,98\nJose,45\nLuisa,84', salida: 'aprobados: 2\nMirta,Luisa' },
        { entrada: '2\nAna,30\nBeto,59', salida: 'aprobados: 0' }
      ]
    },
    {
      id: 'a12', nivel: 'avanzado', titulo: 'Frecuencia de letras',
      enunciado: 'Leé una palabra escrita en mayúsculas (solo letras de la A a la Z) e imprimí, en orden alfabético y una por línea, cada letra que aparece junto con su cantidad, con el formato <code>A:2</code>.<br>Ejemplo: para <code>CASA</code> imprime <code>A:2</code>, <code>C:1</code> y <code>S:1</code>.',
      pista: 'Usá un vector de 26 posiciones. Con <code>ord ("A")</code> obtenés 65, así que la posición de una letra es <code>ord (c) - 65 + 1</code>, y sumás con <code>inc (F [posicion])</code>. Para volver de posición a letra: <code>ascii (64 + k)</code>.',
      plantilla: 'var\n   F : vector [26] numerico\n   pos_A = ord ("A")\n   z = ""\n   k = 0\ninicio\n   leer (z)\n   F = {0, ...}\nfin\n',
      pruebas: [
        { entrada: 'CASA', salida: 'A:2\nC:1\nS:1' },
        { entrada: 'AAA', salida: 'A:3' },
        { entrada: 'PARAGUAY', salida: 'A:3\nG:1\nP:1\nR:1\nU:1\nY:1' }
      ]
    },
    {
      id: "a13", nivel: "avanzado", titulo: "Torres de Hanoi",
      enunciado: "Leé la cantidad de discos e imprimí los movimientos para pasarlos de la torre <code>A</code> a la <code>C</code> usando la <code>B</code>, uno por línea, con el formato <code>A -> C</code>. En la última línea imprimí la cantidad de movimientos: <code>total 7</code>.",
      pista: "Recursión pura: mover <code>n</code> discos de origen a destino es mover <code>n-1</code> al auxiliar, mover el disco grande, y mover los <code>n-1</code> de vuelta encima.",
      plantilla: "var\n   n : numerico\ninicio\n   leer (n)\n   hanoi (n, \"A\", \"C\", \"B\")\nfin\n\nsubrutina hanoi (n : numerico; ori, des, aux : cadena)\ninicio\n   // caso base y dos llamadas recursivas\nfin\n",
      pruebas: [
        { entrada: "1", salida: "A -> C\ntotal 1" },
        { entrada: "2", salida: "A -> B\nA -> C\nB -> C\ntotal 3" },
        { entrada: "3", salida: "A -> C\nA -> B\nC -> B\nA -> C\nB -> A\nB -> C\nA -> C\ntotal 7" }
      ]
    },
    {
      id: "a14", nivel: "avanzado", titulo: "La criba de Eratóstenes",
      enunciado: "Leé un número <code>n</code> e imprimí todos los primos menores o iguales a <code>n</code>, separados por un espacio, usando la criba: marcá los múltiplos de cada primo en lugar de probar divisores.<br>En la línea siguiente imprimí cuántos había: <code>cantidad 8</code>.",
      pista: "Usá un <code>vector [*] logico</code> dimensionado con <code>dim</code>. Arrancá suponiendo que todos son primos y andá marcando los múltiplos de cada uno que sobreviva.",
      plantilla: "var\n   es : vector [*] logico\n   n, k, m, cuantos : numerico\ninicio\n   leer (n)\n   dim (es, n)\nfin\n",
      pruebas: [
        { entrada: "20", salida: "2 3 5 7 11 13 17 19\ncantidad 8" },
        { entrada: "2", salida: "2\ncantidad 1" },
        { entrada: "1", salida: "cantidad 0" }
      ]
    },
    {
      id: "a15", nivel: "avanzado", titulo: "Estadísticas de una matriz",
      enunciado: "Leé el tamaño <code>n</code> de una matriz cuadrada y después sus valores (una fila por línea, separados por comas). Imprimí, en este orden y uno por línea: la suma de cada fila con el formato <code>fila 1: 6</code>, después <code>diagonal 15</code> (la suma de la diagonal principal) y finalmente <code>mayor 9</code>.",
      pista: "Con <code>dim (m, n, n)</code> creás la matriz. <code>leer (m [f, 1], m [f, 2], …)</code> no sirve para un tamaño variable: leé cada fila con un ciclo, pero recordá que <code>leer</code> toma una línea entera separada por comas.",
      plantilla: "var\n   m : matriz [*,*] numerico\n   n, f, c, suma, diag, mayor : numerico\ninicio\n   leer (n)\n   dim (m, n, n)\nfin\n",
      pruebas: [
        { entrada: "3\n1,2,3\n4,5,6\n7,8,9", salida: "fila 1: 6\nfila 2: 15\nfila 3: 24\ndiagonal 15\nmayor 9" },
        { entrada: "2\n5,1\n2,4", salida: "fila 1: 6\nfila 2: 6\ndiagonal 9\nmayor 5" }
      ]
    },
    {
      id: "a16", nivel: "avanzado", titulo: "Análisis de un texto",
      enunciado: "Leé una línea de texto e imprimí, uno por línea: la cantidad de palabras (<code>palabras 4</code>), la palabra más larga (<code>mas larga: programacion</code>) y el promedio de letras por palabra con dos decimales (<code>promedio 5.75</code>). Las palabras están separadas por espacios simples.",
      pista: "Recorré el texto carácter por carácter armando la palabra actual: cuando aparece un espacio (o se termina el texto), la palabra está completa y podés compararla con la más larga hasta el momento.",
      plantilla: "var\n   t, palabra, larga : cadena\n   k, cuantas, letras : numerico\ninicio\n   leer (t)\nfin\n",
      pruebas: [
        { entrada: "me gusta la programacion", salida: "palabras 4\nmas larga: programacion\npromedio 5.25" },
        { entrada: "hola", salida: "palabras 1\nmas larga: hola\npromedio 4.00" }
      ]
    }
  ];

  /* Ejemplos listos para explorar en el IDE (tomados del manual de SL). */
  const EJEMPLOS = [
    {
      nombre: 'Pantalla: colores, cursor y pitidos',
      entrada: '',
      codigo: `/*
   OBJETIVO: Mostrar el manejo de pantalla de SLE2:
             cls(), get_scrsize(), get_curpos(), set_curpos(),
             set_color(), get_color() y beep().

   Los colores van del 1 al 15. El 0 significa "no cambiar":
      1 azul       2 verde      3 cian        4 rojo
      5 magenta    6 marron     7 gris claro  8 gris oscuro
      9 azul cl.  10 verde cl. 11 cian cl.   12 rojo claro
     13 magenta cl. 14 amarillo 15 blanco
*/
programa demo_pantalla
var
   lin, col : numerico
   texto, fondo : numerico
   k = 0

inicio
   cls()
   get_scrsize (lin, col)
   imprimir ("Pantalla de ", lin, " lineas por ", col, " columnas\\n")

   /*
      Una barra de progreso dibujada siempre en la misma linea: guardamos
      la posicion del cursor y volvemos a ella en cada paso.
      beep(0, 40) hace una pausa de 40 milisegundos, sin sonido.
   */
   imprimir ("\\nProgreso: ")
   get_curpos (lin, col)
   desde k=1 hasta 20
   {
      set_curpos (lin, col)
      imprimir (strdup ("#", k), strdup (".", 20-k), " ", str (k*5, 3, 0), "%")
      beep (0, 40)
   }

   imprimir ("\\n\\nY ahora, colores:\\n")
   set_color (14, 1)
   imprimir ("  Amarillo sobre azul  \\n")
   set_color (15, 4)
   imprimir ("  Blanco sobre rojo  \\n")

   /*
      get_color() recibe sus dos parametros por referencia, asi que hay
      que pasarle nombres de variables.
   */
   get_color (texto, fondo)
   set_color (11, 1)
   imprimir ("\\nUltimos colores usados: texto=", texto, " fondo=", fondo)
   imprimir ("\\nEl fondo sigue vigente hasta que se lo cambie o se llame a cls().")

   beep (880, 150)
fin
`
    },
    {
      nombre: 'Archivos: set_stdout, set_stdin y eof',
      entrada: '',
      codigo: `/*
   OBJETIVO: Mostrar el manejo de archivos de SLE2:
             set_stdout() para grabar, set_stdin() para leer,
             set_ifs() para elegir el separador y eof() para saber
             cuando ya no quedan datos.

   En ESLE2 los archivos viven en la memoria del navegador; se los ve
   y se los edita con el boton "Archivos..." de la barra de herramientas.
*/
programa demo_archivos
tipos
   ALUMNO : registro
   {
      nombre : cadena
      nota   : numerico
   }
var
   curso : vector [4] ALUMNO = { {"Mirta", 98},
                                 {"Jose",  72},
                                 {"Luisa", 84},
                                 {"Carlos", 55} }
   linea = ""
   cant  = 0
   suma  = 0
   nota  = 0
   k     = 0

inicio
   /*
      1) Grabamos el curso en "notas.txt", un alumno por linea.
         Mientras el archivo esta abierto, imprimir() escribe en el
         y no en la pantalla.
   */
   si ( not set_stdout ("notas.txt") )
   {
      terminar ("No se pudo crear notas.txt")
   }
   desde k=1 hasta alen (curso)
   {
      imprimir (curso [k].nombre, ",", curso [k].nota, "\\n")
   }
   set_stdout ("")

   /*
      2) Lo leemos de vuelta linea por linea. Con set_ifs("\\n") cada
         "campo" es una linea entera.
   */
   imprimir ("Contenido de notas.txt:\\n")
   set_stdin ("notas.txt")
   set_ifs ("\\n")
   leer (linea)
   mientras ( not eof() )
   {
      inc (cant)
      imprimir ("  ", cant, ": ", linea, "\\n")
      leer (linea)
   }

   /*
      3) Y ahora usando la coma como separador, para sacar el promedio.
   */
   set_stdin ("notas.txt")     // set_stdin() vuelve a poner la coma
   suma = 0
   k = 0
   mientras ( not eof() )
   {
      leer (linea, nota)
      si ( linea <> "" )
      {
         suma = suma + nota
         inc (k)
      }
   }
   set_stdin ("")              // volvemos al teclado

   imprimir ("\\nAlumnos: ", k, "   Promedio: ", str (suma / k, 0, 2))
   imprimir ("\\n\\nAbri el boton \\"Archivos...\\" para ver notas.txt.")
fin
`
    },
    {
      nombre: 'Boletin de calificaciones (registros y tipos)',
      entrada: '5\nMirta,98,95,100\nJose,72,68,80\nLuisa,84,91,78\nCarlos,45,58,60\nAna,88,90,85',
      codigo: `/*
   OBJETIVO: Boletin de calificaciones.
             Prueba casi todo el lenguaje: tipos definidos, registros,
             vectores abiertos, subrutinas por valor y por referencia,
             funciones que retornan registros, si/sino si, eval, mientras,
             repetir, desde con paso, cadenas y funciones predefinidas.

   ENTRADA:  primero la cantidad de alumnos, luego una linea por alumno
             con el formato   nombre,nota1,nota2,nota3
*/
programa boletin

const
   CANT_NOTAS = 3
   LINEA      = "----------------------------------------"

tipos
   ALUMNO : registro
   {
      nombre   : cadena
      notas    : vector [CANT_NOTAS] numerico
      promedio : numerico
      escala   : cadena
   }
   CURSO : vector [*] ALUMNO

var
   c : CURSO
   k : numerico

inicio
   leer_curso (c)
   ordenar (c)

   imprimir ("\\n", LINEA)
   imprimir ("\\n", relleno ("ALUMNO", 20), "    PROM", "  ESCALA")
   imprimir ("\\n", LINEA)

   desde k=1 hasta alen (c)
   {
      imprimir ("\\n", relleno (upper (c[k].nombre), 20),
                str (c[k].promedio, 8, 2),
                "  ", c[k].escala)
   }

   imprimir ("\\n", LINEA)
   imprimir ("\\nCantidad de alumnos : ", alen (c))
   imprimir ("\\nPromedio del curso  : ", str (promedio_curso (c), 0, 2))
   imprimir ("\\nAprobados           : ", aprobados (c), " de ", alen (c))
   imprimir ("\\nMejor promedio      : ", c[1].nombre, " (", str (c[1].promedio, 0, 2), ")")
   imprimir ("\\n", LINEA, "\\n")
fin


subrutina leer_curso (ref c : CURSO)
/*
   Lee la cantidad de alumnos y los datos de cada uno.
   c se recibe por referencia: si no, los datos se perderian al salir.
*/
var
   cant, k, j : numerico
inicio
   imprimir ("Cantidad de alumnos: ")
   leer (cant)
   dim (c, cant)
   desde k=1 hasta cant
   {
      leer (c[k].nombre)
      desde j=1 hasta CANT_NOTAS
      {
         leer (c[k].notas [j])
      }
      c[k].promedio = promedio (c[k].notas)
      c[k].escala   = escala_de (c[k].promedio)
   }
fin


subrutina promedio (v : vector [*] numerico) retorna numerico
var
   k, s : numerico
inicio
   s = 0
   desde k=1 hasta alen (v)
   {
      s = s + v [k]
   }
   retorna ( s / alen (v) )
fin


subrutina escala_de (p : numerico) retorna cadena
/*
   Escala del manual de SL:  95-100 => 5, 85-94 => 4, 75-84 => 3,
                             60-74  => 2, 0-59   => 1 (aplazado)
*/
var
   e : cadena
inicio
   eval
   {
      caso ( p >= 95 )   e = "5 (excelente)"
      caso ( p >= 85 )   e = "4 (muy bueno)"
      caso ( p >= 75 )   e = "3 (bueno)"
      caso ( p >= 60 )   e = "2 (regular)"
      sino               e = "1 (aplazado)"
   }
   retorna ( e )
fin


subrutina ordenar (ref c : CURSO)
/*
   Burbuja de mayor a menor promedio. Muestra asignacion entre registros.
*/
var
   aux : ALUMNO
   n, k, g : numerico
inicio
   g = alen (c)
   desde n=1 hasta g-1
   {
      desde k=n+1 hasta g
      {
         si ( c[n].promedio < c[k].promedio )
         {
            aux  = c[n]
            c[n] = c[k]
            c[k] = aux
         }
      }
   }
fin


subrutina aprobados (c : CURSO) retorna numerico
var
   k, cant : numerico
inicio
   cant = 0
   desde k=1 hasta alen (c)
   {
      si ( c[k].promedio >= 60 )
      {
         inc (cant)
      }
   }
   retorna ( cant )
fin


subrutina promedio_curso (c : CURSO) retorna numerico
var
   k, s : numerico
inicio
   k = 1
   s = 0
   mientras ( k <= alen (c) )
   {
      s = s + c[k].promedio
      k = k + 1
   }
   retorna ( s / alen (c) )
fin


subrutina relleno (s : cadena; ancho : numerico) retorna cadena
/*
   Completa la cadena con espacios a la derecha hasta cierto ancho.
*/
inicio
   mientras ( strlen (s) < ancho )
   {
      s = s + " "
   }
   retorna ( s )
fin
`
    },
    {
      nombre: 'Suma de pares entre 1 y n',
      entrada: '20',
      codigo: `/*
   Calcular e imprimir la suma de los numeros pares entre 1 y un n dado.
*/
var
   n, suma, k : numerico
inicio
   imprimir ("Suma de numeros pares entre 1 y n.\\nIngrese un valor para n: ")
   leer (n)
   suma = 0
   desde k=2 hasta n paso 2
   {
      suma = suma + k
   }
   imprimir ("\\nLa suma es ", suma)
fin
`
    },
    {
      nombre: 'Serie de Fibonacci',
      entrada: '10',
      codigo: `programa fibo
var
   a, b, c, n : numerico
inicio
   imprimir ("Cuantos terminos? ")
   leer (n)
   a = 0; b = 1
   si ( n >= 1 ) { imprimir ("\\n", a) }
   si ( n >= 2 ) { imprimir ("\\n", b) }
   n = n - 2
   mientras ( n >= 1 )
   {
      c = a + b
      imprimir ("\\n", c)
      a = b
      b = c
      n = n - 1
   }
fin
`
    },
    {
      nombre: 'Decimal a hexadecimal',
      entrada: '48879',
      codigo: `var
   n : numerico
inicio
   imprimir ("Ingrese un numero entero positivo: ")
   leer (n)
   imprimir ("\\n", n, " en hexadecimal es ", dec_a_hex (n))
fin

subrutina dec_a_hex (n : numerico) retorna cadena
const
   HEX_DIG = "0123456789ABCDEF"
var
   s : cadena
   r : numerico
inicio
   mientras ( n >= 16 )
   {
      r = n % 16
      s = HEX_DIG [r+1] + s
      n = int (n / 16)
   }
   s = HEX_DIG [n+1] + s
   retorna ( s )
fin
`
    },
    {
      nombre: 'Clasificar un carácter (eval)',
      entrada: 'k',
      codigo: `var
   let, msg : cadena
inicio
   imprimir ("Ingrese un caracter: ")
   leer (let)
   let = let [1]
   eval
   {
      caso ( let >= 'A' and let <= 'Z' )
         msg = "letra mayuscula"
      caso ( let >= 'a' and let <= 'z' )
         msg = "letra minuscula"
      caso ( let >= '0' and let <= '9' )
         msg = "digito"
      sino
         msg = "algun otro"
   }
   imprimir ("\\nEl caracter que usted ingreso es ", msg)
fin
`
    },
    {
      nombre: 'Matriz transpuesta (arreglos abiertos)',
      entrada: '',
      codigo: `var
   A, T : matriz [*,*] numerico
inicio
   A = { {10, 11, 12},
         {20, 21, 22},
         {30, 31, 32},
         {40, 41, 42},
         {50, 51, 52}
       }
   imprimir ("Matriz original\\n")
   impr_mat (A)
   T = trasp (A)
   imprimir ("\\nMatriz traspuesta\\n")
   impr_mat (T)
fin

subrutina trasp (m : matriz [*,*] numerico) retorna matriz [*,*] numerico
var
   t : matriz [*,*] numerico
   cf, cc, kf, kc : numerico
inicio
   cf = alen (m [1])
   cc = alen (m)
   dim (t, cf, cc)
   desde kf=1 hasta cf
   {
      desde kc=1 hasta cc
      {
         t [kf, kc] = m [kc, kf]
      }
   }
   retorna ( t )
fin

subrutina impr_mat (m : matriz [*,*] numerico)
var
   f, c : numerico
inicio
   desde f=1 hasta alen (m)
   {
      desde c=1 hasta alen (m[f])
      {
         imprimir (m [f, c], ' ')
      }
      imprimir ("\\n")
   }
fin
`
    },
    {
      nombre: 'Registros y tipos definidos',
      entrada: '3\nMirta,90\nJose,72\nLuisa,84',
      codigo: `programa acta_de_notas
tipos
   ALUMNO : registro
   {
      nombre : cadena
      nota   : numerico
   }
   ACTA : vector [*] ALUMNO
var
   A : ACTA
inicio
   leer_acta (A)
   ordenar_por_nota (A)
   imprimir_acta (A)
fin

subrutina leer_acta (ref c : ACTA)
var
   cant, k : numerico
inicio
   imprimir ("Ingrese cantidad de alumnos: ")
   leer (cant)
   dim (c, cant)
   desde k=1 hasta cant
   {
      leer ( c [k].nombre, c [k].nota )
   }
fin

subrutina ordenar_por_nota (ref A : ACTA)
var
   aux : ALUMNO
   k, n, g : numerico
inicio
   g = alen (A)
   desde n=1 hasta (g - 1)
   {
      desde k=n+1 hasta g
      {
         si ( A [n].nota < A [k].nota )
         {
            aux = A [n]
            A [n] = A [k]
            A [k] = aux
         }
      }
   }
fin

subrutina imprimir_acta (A : ACTA)
var
   k : numerico
inicio
   desde k=1 hasta alen (A)
   {
      imprimir ("\\n", A [k].nombre, "\\t", A [k].nota)
   }
fin
`
    }
  ];

  global.CURSO = { EJERCICIOS, EJEMPLOS };
})(window);

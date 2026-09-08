/* Curso y ejemplos de ESLE2 POO. */
(function (global) {
  'use strict';

  const EJERCICIOS = [
    {
      id: 'p1', nivel: 'facil', titulo: 'Tu primera clase',
      enunciado: 'Definí una clase <code>PERSONA</code> con los atributos privados <code>nombre</code> (cadena) y <code>edad</code> (numérico), un constructor que los reciba, y un método <code>saludar()</code> que imprima <code>Hola, soy Ana y tengo 17 anios</code>.<br>El programa principal debe leer un nombre y una edad, crear la persona y llamar a <code>saludar()</code>.',
      pista: 'Dentro de la clase, los atributos se tocan con <code>este.nombre</code>. El objeto se crea con <code>p = nuevo PERSONA (n, e)</code>.',
      plantilla: 'clase PERSONA\n{\n   atributos\n      privado\n         nombre = ""\n         edad   = 0\n\n   constructor (n : cadena; e : numerico)\n   inicio\n      // guardá los parámetros en los atributos\n   fin\n\n   metodo saludar ()\n   inicio\n      // imprimí el saludo\n   fin\n}\n\nvar\n   p : PERSONA\n   n = ""\n   e = 0\ninicio\n   leer (n, e)\nfin\n',
      pruebas: [
        { entrada: 'Ana,17', salida: 'Hola, soy Ana y tengo 17 anios' },
        { entrada: 'Jose,40', salida: 'Hola, soy Jose y tengo 40 anios' }
      ]
    },
    {
      id: 'p2', nivel: 'facil', titulo: 'Rectángulo con métodos',
      enunciado: 'Definí una clase <code>RECTANGULO</code> con base y altura privadas, constructor, y los métodos <code>area()</code> y <code>perimetro()</code>, ambos <code>retorna numerico</code>.<br>Leé base y altura e imprimí el área en la primera línea y el perímetro en la segunda.',
      pista: 'Un método que devuelve un valor se declara <code>metodo area () retorna numerico</code> y termina con <code>retorna ( … )</code>.',
      plantilla: 'clase RECTANGULO\n{\n   atributos\n      privado\n         b = 0\n         h = 0\n\n   constructor (base, altura : numerico)\n   inicio\n   fin\n}\n\nvar\n   r : RECTANGULO\n   b = 0\n   h = 0\ninicio\n   leer (b, h)\nfin\n',
      pruebas: [
        { entrada: '3,4', salida: '12\n14' },
        { entrada: '5,5', salida: '25\n20' }
      ]
    },
    {
      id: 'p3', nivel: 'medio', titulo: 'Encapsulamiento: una cuenta que se protege',
      enunciado: 'Definí <code>CUENTA</code> con el saldo <strong>privado</strong>. El constructor recibe el saldo inicial. El método <code>extraer(monto)</code> solo debe descontar si hay saldo suficiente; si no, imprime <code>fondos insuficientes</code>. El método <code>saldo_actual()</code> devuelve el saldo.<br>Leé el saldo inicial y dos montos a extraer; después de cada extracción imprimí el saldo.',
      pista: 'El sentido de que <code>saldo</code> sea privado es que nadie pueda dejarlo en un valor imposible desde afuera: toda modificación pasa por un método que valida.',
      plantilla: 'clase CUENTA\n{\n   atributos\n      privado\n         saldo = 0\n\n   constructor (inicial : numerico)\n   inicio\n   fin\n\n   metodo extraer (monto : numerico)\n   inicio\n   fin\n\n   metodo saldo_actual () retorna numerico\n   inicio\n      retorna ( este.saldo )\n   fin\n}\n\nvar\n   c : CUENTA\n   ini = 0\n   m1 = 0\n   m2 = 0\ninicio\n   leer (ini, m1, m2)\nfin\n',
      pruebas: [
        { entrada: '1000,300,900', salida: '700\nfondos insuficientes\n700' },
        { entrada: '500,500,1', salida: '0\nfondos insuficientes\n0' }
      ]
    },
    {
      id: 'p4', nivel: 'medio', titulo: 'El método texto()',
      enunciado: 'Definí <code>PUNTO</code> con <code>x</code> e <code>y</code> privados y un método <code>texto() retorna cadena</code> que devuelva <code>(3,4)</code>.<br>Leé dos números, creá el punto e imprimí el objeto directamente con <code>imprimir (p)</code>.',
      pista: 'Cuando una clase define <code>texto()</code>, <code>imprimir()</code> lo usa automáticamente en lugar de mostrar <code>&lt;PUNTO&gt;</code>. Para armar la cadena usá <code>str (n, 0, 0)</code>.',
      plantilla: 'clase PUNTO\n{\n   atributos\n      privado\n         x = 0\n         y = 0\n\n   constructor (a, b : numerico)\n   inicio\n   fin\n\n   metodo texto () retorna cadena\n   inicio\n   fin\n}\n\nvar\n   p : PUNTO\n   a = 0\n   b = 0\ninicio\n   leer (a, b)\n   p = nuevo PUNTO (a, b)\n   imprimir (p)\nfin\n',
      pruebas: [
        { entrada: '3,4', salida: '(3,4)' },
        { entrada: '-1,0', salida: '(-1,0)' }
      ]
    },
    {
      id: 'p5', nivel: 'medio', titulo: 'Herencia: empleado y gerente',
      enunciado: 'Definí <code>EMPLEADO</code> con nombre y sueldo protegidos, constructor, y <code>sueldo_final() retorna numerico</code> que devuelve el sueldo.<br>Definí <code>GERENTE hereda de EMPLEADO</code>, cuyo constructor recibe además un bono y cuyo <code>sueldo_final()</code> devuelve el sueldo del padre más el bono.<br>Leé los datos de un empleado y de un gerente e imprimí los dos sueldos finales, uno por línea.',
      pista: 'El constructor de la hija llama al de la madre con <code>padre.constructor (…)</code>, y el método sobrescrito puede reutilizar el original con <code>padre.sueldo_final()</code>.',
      plantilla: 'clase EMPLEADO\n{\n   atributos\n      protegido\n         nombre = ""\n         sueldo = 0\n\n   constructor (n : cadena; s : numerico)\n   inicio\n   fin\n\n   metodo sueldo_final () retorna numerico\n   inicio\n      retorna ( este.sueldo )\n   fin\n}\n\nclase GERENTE hereda de EMPLEADO\n{\n}\n\nvar\n   e : EMPLEADO\n   g : GERENTE\ninicio\n   e = nuevo EMPLEADO ("Ana", 1000)\n   g = nuevo GERENTE ("Beto", 2000, 500)\nfin\n',
      pruebas: [
        { entrada: '', salida: '1000\n2500' }
      ]
    },
    {
      id: 'p6', nivel: 'avanzado', titulo: 'Polimorfismo: figuras',
      enunciado: 'Definí la clase abstracta <code>FIGURA</code> con el método abstracto <code>area() retorna numerico</code>. Definí <code>CIRCULO</code> y <code>CUADRADO</code> que hereden de ella y la implementen (usá <code>PI = 3.141592654</code>).<br>Guardá un círculo de radio 2, un cuadrado de lado 3 y un círculo de radio 1 en un <code>vector [3] FIGURA</code>, recorrelo e imprimí una línea por figura con el formato <code>CIRCULO 12.57</code>, y al final <code>total 34.57</code>. Todo con dos decimales.',
      pista: 'La clave del polimorfismo: el ciclo llama siempre a <code>fs[k].area()</code> sin preguntar de qué clase es. Cada objeto responde con su propia versión. <code>clase_de (fs[k])</code> te da el nombre de la clase.',
      plantilla: 'const\n   PI = 3.141592654\n\nclase abstracta FIGURA\n{\n   metodo abstracto area () retorna numerico\n}\n\nclase CIRCULO hereda de FIGURA\n{\n}\n\nclase CUADRADO hereda de FIGURA\n{\n}\n\nvar\n   fs : vector [3] FIGURA\n   k = 0\n   total = 0\ninicio\nfin\n',
      pruebas: [
        { entrada: '', salida: 'CIRCULO 12.57\nCUADRADO 9.00\nCIRCULO 3.14\ntotal 24.71' }
      ]
    },
    {
      id: 'p7', nivel: 'avanzado', titulo: 'Contador de objetos creados',
      enunciado: 'Definí <code>ROBOT</code> con un atributo <strong>compartido</strong> y público <code>cantidad</code> que cuente cuántos robots se crearon, y un atributo privado <code>numero</code> con el número que le tocó a cada uno.<br>Creá tres robots e imprimí, uno por línea, <code>robot 1 de 3</code>, <code>robot 2 de 3</code>, <code>robot 3 de 3</code>. Usá un método <code>ficha() retorna cadena</code>.',
      pista: 'Un atributo <code>compartido</code> pertenece a la clase, no a cada objeto: se accede con <code>ROBOT.cantidad</code> y todos ven el mismo valor. El constructor lo incrementa y guarda el número en el atributo propio.',
      plantilla: 'clase ROBOT\n{\n   atributos\n      compartido publico\n         cantidad = 0\n      privado\n         numero = 0\n\n   constructor ()\n   inicio\n   fin\n\n   metodo ficha () retorna cadena\n   inicio\n   fin\n}\n\nvar\n   a : ROBOT\n   b : ROBOT\n   c : ROBOT\ninicio\nfin\n',
      pruebas: [
        { entrada: '', salida: 'robot 1 de 3\nrobot 2 de 3\nrobot 3 de 3' }
      ]
    },
    {
      id: 'p8', nivel: 'avanzado', titulo: 'Una lista de objetos',
      enunciado: 'Definí <code>ALUMNO</code> (nombre y nota privados, con <code>nota_de() retorna numerico</code> y <code>texto()</code>) y una clase <code>CURSO</code> que guarde adentro un <code>vector [*] ALUMNO</code>.<br><code>CURSO</code> debe tener <code>agregar (a : ALUMNO)</code>, <code>promedio() retorna numerico</code> y <code>mejor() retorna ALUMNO</code>.<br>Leé la cantidad de alumnos y sus datos (<code>nombre,nota</code> por línea). Imprimí el promedio con dos decimales y en la línea siguiente el mejor alumno.',
      pista: 'Un objeto puede contener un vector de objetos. Para agrandar el vector: llevá un contador de cuántos hay y dimensionalo antes con <code>dim</code>, o dimensionalo en el constructor con el tamaño máximo.',
      plantilla: 'clase ALUMNO\n{\n   atributos\n      privado\n         nombre = ""\n         nota = 0\n\n   constructor (n : cadena; x : numerico)\n   inicio\n   fin\n}\n\nclase CURSO\n{\n   atributos\n      privado\n         lista : vector [*] ALUMNO\n         cant = 0\n\n   constructor (tope : numerico)\n   inicio\n      dim (este.lista, tope)\n   fin\n}\n\nvar\n   c : CURSO\n   n = 0\ninicio\n   leer (n)\n   c = nuevo CURSO (n)\nfin\n',
      pruebas: [
        { entrada: '3\nMirta,98\nJose,72\nLuisa,84', salida: '84.67\nMirta: 98' },
        { entrada: '2\nAna,50\nBeto,60', salida: '55.00\nBeto: 60' }
      ]
    }
,
    {
      id: "p9", nivel: "facil", titulo: "Una ficha de libro",
      enunciado: "Definí la clase <code>LIBRO</code> con los atributos privados <code>titulo</code>, <code>autor</code> (cadenas) y <code>paginas</code> (numérico), un constructor que los reciba y un método <code>ficha()</code> que imprima <code>El Quijote (Cervantes, 863 pag)</code>.<br>Leé los tres datos en una línea separados por comas, creá el libro y mostrá su ficha.",
      pista: "Para pegar un número dentro de un texto no hace falta convertirlo: <code>imprimir()</code> acepta varios parámetros y los muestra uno tras otro.",
      plantilla: `clase LIBRO
{
   atributos
      privado
         titulo = ""
         autor  = ""
         paginas = 0

   constructor (t, a : cadena; p : numerico)
   inicio
      // guardá los tres datos
   fin

   metodo ficha ()
   inicio
      // imprimí la ficha
   fin
}

var
   l : LIBRO
   t = ""
   a = ""
   p = 0
inicio
   leer (t, a, p)
fin
`,
      pruebas: [
        { entrada: "El Quijote,Cervantes,863", salida: "El Quijote (Cervantes, 863 pag)" },
        { entrada: "Rayuela,Cortazar,600", salida: "Rayuela (Cortazar, 600 pag)" }
      ]
    },
    {
      id: "p10", nivel: "facil", titulo: "Círculo con dos métodos",
      enunciado: "Definí <code>CIRCULO</code> con el radio privado y los métodos <code>area()</code> y <code>perimetro()</code>, los dos <code>retorna numerico</code>.<br>Leé el radio e imprimí el área en la primera línea y el perímetro en la segunda, ambos con dos decimales. Usá <code>PI = 3.141592654</code>.",
      pista: "Dos decimales: <code>str (valor, 0, 2)</code>. El <code>0</code> del medio es el ancho (0 = el que haga falta).",
      plantilla: `const
   PI = 3.141592654

clase CIRCULO
{
   atributos
      privado
         r = 0

   constructor (radio : numerico)
   inicio
   fin
}

var
   c : CIRCULO
   radio = 0
inicio
   leer (radio)
fin
`,
      pruebas: [
        { entrada: "2", salida: "12.57\n12.57" },
        { entrada: "1", salida: "3.14\n6.28" },
        { entrada: "3.5", salida: "38.48\n21.99" }
      ]
    },
    {
      id: "p11", nivel: "facil", titulo: "Termómetro: guardar y convertir",
      enunciado: "Definí <code>TERMOMETRO</code> con el atributo privado <code>celsius</code>, un método <code>poner (c : numerico)</code> que lo cambie y un método <code>fahrenheit () retorna numerico</code>.<br>Leé dos temperaturas en Celsius (una por línea). Después de cargar cada una, imprimí su equivalente en Fahrenheit.",
      pista: "El objeto guarda el estado; los métodos son la única puerta para entrar y salir. <code>F = C × 9 / 5 + 32</code>.",
      plantilla: `clase TERMOMETRO
{
   atributos
      privado
         celsius = 0

   metodo poner (c : numerico)
   inicio
   fin

   metodo fahrenheit () retorna numerico
   inicio
   fin
}

var
   t : TERMOMETRO
   c = 0
inicio
   t = nuevo TERMOMETRO ()
fin
`,
      pruebas: [
        { entrada: "100\n0", salida: "212\n32" },
        { entrada: "37\n-40", salida: "98.6\n-40" }
      ]
    },
    {
      id: "p12", nivel: "facil", titulo: "Un contador que se cuida solo",
      enunciado: "Definí <code>CONTADOR</code> con el valor privado en 0 y los métodos <code>subir()</code>, <code>bajar()</code> y <code>valor() retorna numerico</code>. <code>bajar()</code> nunca debe dejar el contador por debajo de cero.<br>Leé un número <code>n</code>: subí <code>n</code> veces, bajá dos veces e imprimí el valor final.",
      pista: "Que el atributo sea privado es lo que garantiza la regla: desde afuera nadie puede escribir un valor negativo, porque solo se llega a él por <code>bajar()</code>.",
      plantilla: `clase CONTADOR
{
   atributos
      privado
         v = 0

   metodo subir ()
   inicio
   fin

   metodo bajar ()
   inicio
   fin

   metodo valor () retorna numerico
   inicio
      retorna ( este.v )
   fin
}

var
   c : CONTADOR
   n = 0
   k = 0
inicio
   leer (n)
   c = nuevo CONTADOR ()
fin
`,
      pruebas: [
        { entrada: "5", salida: "3" },
        { entrada: "1", salida: "0" },
        { entrada: "0", salida: "0" }
      ]
    },
    {
      id: "p13", nivel: "facil", titulo: "Un objeto que mira a otro",
      enunciado: "Definí <code>PRODUCTO</code> con nombre y precio privados, un método <code>precio_de () retorna numerico</code> y un método <code>mas_caro_que (otro : PRODUCTO) retorna logico</code>.<br>Leé dos productos (<code>nombre,precio</code> en cada línea) e imprimí el nombre del más caro. Si valen lo mismo, imprimí <code>empate</code>.",
      pista: "Un método puede recibir otro objeto de su misma clase como parámetro y preguntarle por sus datos: <code>otro.precio_de()</code>.",
      plantilla: `clase PRODUCTO
{
   atributos
      privado
         nombre = ""
         precio = 0

   constructor (n : cadena; p : numerico)
   inicio
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin
}

var
   a : PRODUCTO
   b : PRODUCTO
   n = ""
   p = 0
inicio
fin
`,
      pruebas: [
        { entrada: "pan,5000\nqueso,32000", salida: "queso" },
        { entrada: "yerba,18000\nazucar,7000", salida: "yerba" },
        { entrada: "sal,3000\npimienta,3000", salida: "empate" }
      ]
    },
    {
      id: "p14", nivel: "facil", titulo: "La alcancía",
      enunciado: "Definí <code>ALCANCIA</code> con el total privado, un método <code>meter (monto : numerico)</code> que ignore los montos menores o iguales a cero y un método <code>total_ahorrado () retorna numerico</code>.<br>Leé un número <code>n</code> y después <code>n</code> montos, uno por línea. Imprimí el total ahorrado.",
      pista: "Validar dentro del método es la diferencia entre un objeto y un simple montón de variables: el objeto no se deja ensuciar.",
      plantilla: `clase ALCANCIA
{
   atributos
      privado
         total = 0

   metodo meter (monto : numerico)
   inicio
   fin

   metodo total_ahorrado () retorna numerico
   inicio
      retorna ( este.total )
   fin
}

var
   a : ALCANCIA
   n = 0
   k = 0
   m = 0
inicio
   leer (n)
   a = nuevo ALCANCIA ()
fin
`,
      pruebas: [
        { entrada: "3\n1000\n2000\n500", salida: "3500" },
        { entrada: "4\n100\n-50\n0\n900", salida: "1000" }
      ]
    },
    {
      id: "p15", nivel: "facil", titulo: "Cada mascota con su sonido",
      enunciado: "Definí <code>MASCOTA</code> con <code>nombre</code> y <code>sonido</code> privados y un método <code>hablar()</code> que imprima <code>Firulais dice Guau</code>.<br>Leé un número <code>n</code> y después <code>n</code> líneas con <code>nombre,sonido</code>. Creá cada mascota y hacela hablar, una por línea.",
      pista: "No hace falta guardar las mascotas: se puede crear el objeto, usarlo y seguir con el siguiente. El objeto vive mientras alguien lo apunte.",
      plantilla: `clase MASCOTA
{
   atributos
      privado
         nombre = ""
         sonido = ""

   constructor (n, s : cadena)
   inicio
   fin

   metodo hablar ()
   inicio
   fin
}

var
   m : MASCOTA
   n = 0
   k = 0
   nom = ""
   son = ""
inicio
   leer (n)
fin
`,
      pruebas: [
        { entrada: "2\nFirulais,Guau\nMichi,Miau", salida: "Firulais dice Guau\nMichi dice Miau" },
        { entrada: "1\nPiolin,Pio", salida: "Piolin dice Pio" }
      ]
    },
    {
      id: "p16", nivel: "facil", titulo: "Un objeto que imprime su tabla",
      enunciado: "Definí <code>TABLA</code> con el número privado <code>n</code> y un método <code>mostrar (tope : numerico)</code> que imprima las líneas <code>3 x 1 = 3</code> … hasta el valor indicado.<br>Leé el número y el límite, creá el objeto y mostrá la tabla.",
      pista: "Un método puede tener sus propias variables: se declaran con <code>var</code> entre la cabecera y el <code>inicio</code>.",
      plantilla: `clase TABLA
{
   atributos
      privado
         n = 0

   constructor (x : numerico)
   inicio
   fin

   metodo mostrar (tope : numerico)
   var
      k = 0
   inicio
   fin
}

var
   t : TABLA
   n = 0
   h = 0
inicio
   leer (n, h)
fin
`,
      pruebas: [
        { entrada: "3,4", salida: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12" },
        { entrada: "7,2", salida: "7 x 1 = 7\n7 x 2 = 14" }
      ]
    },
    {
      id: "p17", nivel: "facil", titulo: "Distancia entre dos puntos",
      enunciado: "Definí <code>PUNTO</code> con <code>x</code> e <code>y</code> privados, los métodos <code>x_de()</code> y <code>y_de()</code>, y un método <code>distancia_a (otro : PUNTO) retorna numerico</code>.<br>Leé dos puntos (<code>x,y</code> por línea) e imprimí la distancia con dos decimales.",
      pista: "La raíz cuadrada es <code>sqrt (n)</code>. Distancia: <code>sqrt ((x1-x2)^2 + (y1-y2)^2)</code>.",
      plantilla: `clase PUNTO
{
   atributos
      privado
         x = 0
         y = 0

   constructor (a, b : numerico)
   inicio
   fin

   metodo x_de () retorna numerico
   inicio
      retorna ( este.x )
   fin

   metodo y_de () retorna numerico
   inicio
      retorna ( este.y )
   fin
}

var
   p : PUNTO
   q : PUNTO
   a = 0
   b = 0
inicio
fin
`,
      pruebas: [
        { entrada: "0,0\n3,4", salida: "5.00" },
        { entrada: "1,1\n1,1", salida: "0.00" },
        { entrada: "-2,3\n4,-1", salida: "7.21" }
      ]
    },
    {
      id: "p18", nivel: "facil", titulo: "La clase HORA",
      enunciado: "Definí <code>HORA</code> con <code>h</code>, <code>m</code> y <code>s</code> privados, un método <code>en_segundos () retorna numerico</code> y un método <code>texto () retorna cadena</code> que devuelva <code>02:05:09</code> (siempre con dos dígitos).<br>Leé <code>h,m,s</code>, imprimí la hora en la primera línea y sus segundos totales en la segunda.",
      pista: "Para rellenar con ceros: si el número es menor que 10, agregá un <code>\"0\"</code> adelante.",
      plantilla: `clase HORA
{
   atributos
      privado
         h = 0
         m = 0
         s = 0

   constructor (a, b, c : numerico)
   inicio
   fin

   metodo dos (n : numerico) retorna cadena
   inicio
      si ( n < 10 )
      {
         retorna ( "0" + str (n, 0, 0) )
      }
      retorna ( str (n, 0, 0) )
   fin
}

var
   x : HORA
   a = 0
   b = 0
   c = 0
inicio
   leer (a, b, c)
fin
`,
      pruebas: [
        { entrada: "2,5,9", salida: "02:05:09\n7509" },
        { entrada: "0,0,0", salida: "00:00:00\n0" },
        { entrada: "23,59,59", salida: "23:59:59\n86399" }
      ]
    },
    {
      id: "p19", nivel: "facil", titulo: "Tres objetos en un vector",
      enunciado: "Definí <code>ARTICULO</code> con nombre, precio y cantidad privados, y un método <code>subtotal () retorna numerico</code>.<br>Leé tres artículos (<code>nombre,precio,cantidad</code> por línea), guardalos en un <code>vector [3] ARTICULO</code> e imprimí el total de la compra.",
      pista: "Un vector de objetos se declara igual que cualquier vector: <code>v : vector [3] ARTICULO</code>. Cada casilla se llena con <code>v [k] = nuevo ARTICULO (…)</code>.",
      plantilla: `clase ARTICULO
{
   atributos
      privado
         nombre = ""
         precio = 0
         cant = 0

   constructor (n : cadena; p, c : numerico)
   inicio
   fin
}

var
   v : vector [3] ARTICULO
   k = 0
   n = ""
   p = 0
   c = 0
   total = 0
inicio
fin
`,
      pruebas: [
        { entrada: "pan,5000,2\nleche,8000,1\nhuevo,1000,12", salida: "30000" },
        { entrada: "a,1,1\nb,2,2\nc,3,3", salida: "14" }
      ]
    },
    {
      id: "p20", nivel: "facil", titulo: "Cuando todavía no hay objeto",
      enunciado: "Definí <code>CAJA</code> con un contenido privado (cadena) y el método <code>texto ()</code> que devuelva ese contenido.<br>Declará una variable <code>c : CAJA</code> y, <strong>sin crear el objeto</strong>, imprimí <code>vacia</code> si <code>es_nulo (c)</code>. Después leé un texto, creá la caja e imprimí <code>llena: manzanas</code>.",
      pista: "Una variable de clase arranca en <code>nulo</code>: apunta a ningún objeto. Preguntarle algo a una variable nula es un error de ejecución, por eso conviene revisarla con <code>es_nulo ()</code>.",
      plantilla: `clase CAJA
{
   atributos
      privado
         contenido = ""

   constructor (x : cadena)
   inicio
      este.contenido = x
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.contenido )
   fin
}

var
   c : CAJA
   x = ""
inicio
   // ¿está vacía?
   leer (x)
fin
`,
      pruebas: [
        { entrada: "manzanas", salida: "vacia\nllena: manzanas" },
        { entrada: "tornillos", salida: "vacia\nllena: tornillos" }
      ]
    },
    {
      id: "p21", nivel: "facil", titulo: "Dos nombres, un solo objeto",
      enunciado: "Definí <code>NOTA</code> con un texto privado, el método <code>escribir (t : cadena)</code> y <code>texto ()</code>.<br>Creá una nota con <code>\"hola\"</code>, asignala a una segunda variable, cambiá el texto <strong>usando la segunda</strong> e imprimí la primera. Después imprimí <code>mismo objeto</code> o <code>distintos</code> comparando <code>id_de()</code>.",
      pista: "Los objetos se asignan <strong>por referencia</strong>: <code>b = a</code> no copia nada, las dos variables apuntan al mismo objeto. <code>id_de (o)</code> devuelve su identidad.",
      plantilla: `clase NOTA
{
   atributos
      privado
         t = ""

   constructor (x : cadena)
   inicio
      este.t = x
   fin

   metodo escribir (x : cadena)
   inicio
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.t )
   fin
}

var
   a : NOTA
   b : NOTA
inicio
   a = nuevo NOTA ("hola")
fin
`,
      pruebas: [
        { entrada: "", salida: "chau\nmismo objeto" }
      ]
    },
    {
      id: "p22", nivel: "facil", titulo: "Iguales por dentro, distintos por fuera",
      enunciado: "Definí <code>MONEDA</code> con <code>valor</code> privado, <code>valor_de ()</code> y un método <code>igual_a (otra : MONEDA) retorna logico</code> que compare los valores.<br>Creá dos monedas de 500 distintas e imprimí <code>igual contenido</code> o <code>distinto contenido</code>, y en la línea siguiente <code>mismo objeto</code> o <code>objetos distintos</code> según <code>id_de()</code>.",
      pista: "Comparar el contenido y comparar la identidad son dos preguntas diferentes. Dos monedas de 500 valen lo mismo, pero son dos monedas.",
      plantilla: `clase MONEDA
{
   atributos
      privado
         valor = 0

   constructor (v : numerico)
   inicio
      este.valor = v
   fin

   metodo valor_de () retorna numerico
   inicio
      retorna ( este.valor )
   fin
}

var
   a : MONEDA
   b : MONEDA
inicio
fin
`,
      pruebas: [
        { entrada: "", salida: "igual contenido\nobjetos distintos" }
      ]
    },
    {
      id: "p23", nivel: "medio", titulo: "Herencia: cada animal con su sonido",
      enunciado: "Definí <code>ANIMAL</code> con el nombre protegido y un método <code>sonido () retorna cadena</code> que devuelva <code>...</code>. Definí <code>PERRO</code> y <code>GATO</code> que hereden de él y sobrescriban <code>sonido()</code> con <code>Guau</code> y <code>Miau</code>.<br>Creá un animal cualquiera, un perro y un gato, e imprimí <code>nombre: sonido</code>, uno por línea.",
      pista: "Sobrescribir es declarar en la hija un método con el mismo nombre que el de la madre. La hija hereda todo lo demás sin repetirlo.",
      plantilla: `clase ANIMAL
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ( "..." )
   fin

   metodo presentarse ()
   inicio
      imprimir (este.nombre, ": ", este.sonido(), "\\n")
   fin
}

clase PERRO hereda de ANIMAL
{
}

clase GATO hereda de ANIMAL
{
}

var
   a : ANIMAL
   p : PERRO
   g : GATO
inicio
fin
`,
      pruebas: [
        { entrada: "", salida: "bicho: ...\nFirulais: Guau\nMichi: Miau" }
      ]
    },
    {
      id: "p24", nivel: "medio", titulo: "Reutilizar el método de la madre",
      enunciado: "Definí <code>VEHICULO</code> con marca y ruedas protegidas y un método <code>describir () retorna cadena</code> que devuelva <code>Ford, 4 ruedas</code>.<br>Definí <code>CAMION hereda de VEHICULO</code>, que agrega la carga en toneladas y cuyo <code>describir()</code> devuelve <code>Scania, 6 ruedas, 12 t</code> <strong>reutilizando</strong> el de la madre.<br>Creá un vehículo y un camión e imprimí las dos descripciones.",
      pista: "<code>padre.describir()</code> ejecuta la versión de la clase madre; sobre eso agregás lo tuyo en vez de copiar el texto.",
      plantilla: `clase VEHICULO
{
   atributos
      protegido
         marca = ""
         ruedas = 0

   constructor (m : cadena; r : numerico)
   inicio
      este.marca = m
      este.ruedas = r
   fin

   metodo describir () retorna cadena
   inicio
      retorna ( este.marca + ", " + str (este.ruedas, 0, 0) + " ruedas" )
   fin
}

clase CAMION hereda de VEHICULO
{
}

var
   v : VEHICULO
   c : CAMION
inicio
   v = nuevo VEHICULO ("Ford", 4)
   c = nuevo CAMION ("Scania", 6, 12)
fin
`,
      pruebas: [
        { entrada: "", salida: "Ford, 4 ruedas\nScania, 6 ruedas, 12 t" }
      ]
    },
    {
      id: "p25", nivel: "medio", titulo: "Cada clase se muestra a su manera",
      enunciado: "Definí <code>PERSONA</code> con nombre protegido y <code>texto ()</code> que devuelva el nombre. Definí <code>ESTUDIANTE hereda de PERSONA</code>, que agrega la carrera y cuyo <code>texto()</code> devuelve <code>Ana (Informatica)</code>.<br>Leé el nombre de una persona y el nombre y la carrera de un estudiante, e imprimí los dos objetos con <code>imprimir()</code>, uno por línea.",
      pista: "Como <code>imprimir()</code> usa <code>texto()</code>, sobrescribirlo cambia cómo se ve el objeto sin tocar el código que lo imprime.",
      plantilla: `clase PERSONA
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre )
   fin
}

clase ESTUDIANTE hereda de PERSONA
{
}

var
   p : PERSONA
   e : ESTUDIANTE
   n = ""
   c = ""
inicio
   leer (n)
   p = nuevo PERSONA (n)
   leer (n, c)
fin
`,
      pruebas: [
        { entrada: "Carlos\nAna,Informatica", salida: "Carlos\nAna (Informatica)" },
        { entrada: "Rosa\nLuis,Medicina", salida: "Rosa\nLuis (Medicina)" }
      ]
    },
    {
      id: "p26", nivel: "medio", titulo: "Una clase abstracta que ya trae trabajo hecho",
      enunciado: "Definí la clase abstracta <code>EMPLEADO</code> con el nombre protegido, el método abstracto <code>sueldo () retorna numerico</code> y un método <strong>concreto</strong> <code>recibo ()</code> que imprima <code>Ana cobra 1500000</code> usando <code>sueldo()</code>.<br>Definí <code>MENSUAL</code> (sueldo fijo) y <code>JORNALERO</code> (jornal × días). Creá uno de cada uno e imprimí sus recibos.",
      pista: "Una clase abstracta puede tener métodos ya escritos: <code>recibo()</code> llama a <code>sueldo()</code> aunque todavía no sepa cómo se calcula. Cada hija completa esa parte.",
      plantilla: `clase abstracta EMPLEADO
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo abstracto sueldo () retorna numerico

   metodo recibo ()
   inicio
      imprimir (este.nombre, " cobra ", este.sueldo(), "\\n")
   fin
}

clase MENSUAL hereda de EMPLEADO
{
}

clase JORNALERO hereda de EMPLEADO
{
}

var
   a : MENSUAL
   b : JORNALERO
inicio
   a = nuevo MENSUAL ("Ana", 1500000)
   b = nuevo JORNALERO ("Beto", 90000, 20)
fin
`,
      pruebas: [
        { entrada: "", salida: "Ana cobra 1500000\nBeto cobra 1800000" }
      ]
    },
    {
      id: "p27", nivel: "medio", titulo: "Un solo ciclo, muchos comportamientos",
      enunciado: "Reutilizá <code>ANIMAL</code>, <code>PERRO</code> y <code>GATO</code> (nombre protegido y <code>sonido()</code>). Guardá un perro, un gato y otro perro en un <code>vector [3] ANIMAL</code> y recorrelo con un solo ciclo imprimiendo <code>PERRO Firulais Guau</code>.<br>Al final, imprimí cuántos perros había: <code>perros: 2</code>.",
      pista: "Ese ciclo es el corazón del polimorfismo: no pregunta de qué clase es cada uno para saber qué sonido hacer. Para contar sí conviene preguntar, con <code>a es PERRO</code>.",
      plantilla: `clase ANIMAL
{
   atributos
      protegido
         nombre = ""
   constructor (n : cadena)
   inicio
      este.nombre = n
   fin
   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin
   metodo sonido () retorna cadena
   inicio
      retorna ( "..." )
   fin
}

clase PERRO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Guau" )
   fin
}

clase GATO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Miau" )
   fin
}

var
   v : vector [3] ANIMAL
   k = 0
   perros = 0
inicio
fin
`,
      pruebas: [
        { entrada: "", salida: "PERRO Firulais Guau\nGATO Michi Miau\nPERRO Sultan Guau\nperros: 2" }
      ]
    },
    {
      id: "p28", nivel: "medio", titulo: "Preguntar de qué clase es",
      enunciado: "Definí <code>FIGURA</code>, <code>CIRCULO hereda de FIGURA</code> y <code>CUADRADO hereda de FIGURA</code>.<br>Con un círculo guardado en una variable <code>f : FIGURA</code>, imprimí en líneas separadas: el resultado de <code>clase_de (f)</code>, después <code>si</code> o <code>no</code> según <code>f es CIRCULO</code>, después lo mismo para <code>f es FIGURA</code> y para <code>f es CUADRADO</code>.",
      pista: "<code>clase_de()</code> devuelve la clase <strong>exacta</strong>; <code>es</code> también dice que sí para las clases madres, porque un círculo <em>es</em> una figura.",
      plantilla: `clase FIGURA
{
}

clase CIRCULO hereda de FIGURA
{
}

clase CUADRADO hereda de FIGURA
{
}

var
   f : FIGURA
inicio
   f = nuevo CIRCULO ()
fin
`,
      pruebas: [
        { entrada: "", salida: "CIRCULO\nsi\nsi\nno" }
      ]
    },
    {
      id: "p29", nivel: "medio", titulo: "Números de cuenta automáticos",
      enunciado: "Definí <code>CUENTA</code> con un atributo <strong>compartido</strong> público <code>ultimo = 1000</code> y un atributo privado <code>numero</code>. Cada cuenta nueva debe llevarse el número siguiente. Agregá <code>texto ()</code> que devuelva <code>cuenta 1001 de Ana</code>.<br>Leé un número <code>n</code> y después <code>n</code> nombres, uno por línea. Imprimí cada cuenta y al final <code>emitidas: 3</code>.",
      pista: "Lo compartido vive en la clase: <code>CUENTA.ultimo</code> es uno solo para todos los objetos, y por eso sirve para numerarlos sin repetir.",
      plantilla: `clase CUENTA
{
   atributos
      compartido publico
         ultimo = 1000
      privado
         numero = 0
         duenio = ""

   constructor (n : cadena)
   inicio
   fin

   metodo texto () retorna cadena
   inicio
   fin
}

var
   c : CUENTA
   n = 0
   k = 0
   nom = ""
inicio
   leer (n)
fin
`,
      pruebas: [
        { entrada: "3\nAna\nBeto\nCeci", salida: "cuenta 1001 de Ana\ncuenta 1002 de Beto\ncuenta 1003 de Ceci\nemitidas: 3" },
        { entrada: "1\nZoe", salida: "cuenta 1001 de Zoe\nemitidas: 1" }
      ]
    },
    {
      id: "p30", nivel: "medio", titulo: "Un objeto adentro de otro",
      enunciado: "Definí <code>MOTOR</code> con cilindrada privada y <code>texto ()</code> que devuelva <code>motor 1.6</code>. Definí <code>AUTO</code> con marca privada y un atributo <code>m : MOTOR</code>: el auto <strong>tiene</strong> un motor.<br>Leé la marca y la cilindrada e imprimí <code>Fiat con motor 1.6</code>.",
      pista: "Esto es <em>composición</em>: el auto no <strong>es</strong> un motor, lo <strong>tiene</strong>. Cuando dudes entre heredar y componer, preguntate cuál de las dos frases suena bien.",
      plantilla: `clase MOTOR
{
   atributos
      privado
         cc = 0

   constructor (c : numerico)
   inicio
      este.cc = c
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "motor " + str (este.cc, 0, 1) )
   fin
}

clase AUTO
{
   atributos
      privado
         marca = ""
         m : MOTOR

   constructor (ma : cadena; c : numerico)
   inicio
   fin

   metodo texto () retorna cadena
   inicio
   fin
}

var
   a : AUTO
   ma = ""
   c = 0
inicio
   leer (ma, c)
fin
`,
      pruebas: [
        { entrada: "Fiat,1.6", salida: "Fiat con motor 1.6" },
        { entrada: "Toyota,2", salida: "Toyota con motor 2.0" }
      ]
    },
    {
      id: "p31", nivel: "medio", titulo: "Un dato que se defiende",
      enunciado: "Definí <code>SOCIO</code> con nombre y edad privados. El método <code>poner_edad (e : numerico)</code> solo debe aceptar edades entre 0 y 120; si no, imprime <code>edad invalida</code> y deja la anterior.<br>Leé el nombre y tres edades (una por línea). Después de cada intento imprimí la edad vigente.",
      pista: "Sin encapsulamiento, cualquiera podría escribir <code>s.edad = -7</code> y romper el objeto. Con el atributo privado, la única entrada es el método que valida.",
      plantilla: `clase SOCIO
{
   atributos
      privado
         nombre = ""
         edad = 0

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo poner_edad (e : numerico)
   inicio
   fin

   metodo edad_de () retorna numerico
   inicio
      retorna ( este.edad )
   fin
}

var
   s : SOCIO
   n = ""
   e = 0
   k = 0
inicio
   leer (n)
fin
`,
      pruebas: [
        { entrada: "Ana\n30\n-7\n45", salida: "30\nedad invalida\n30\n45" },
        { entrada: "Beto\n200\n0\n121", salida: "edad invalida\n0\n0\nedad invalida\n0" }
      ]
    },
    {
      id: "p32", nivel: "medio", titulo: "Una pila de platos",
      enunciado: "Definí <code>PILA</code> con un <code>vector [*] numerico</code> privado y un contador. Métodos: <code>apilar (n : numerico)</code>, <code>desapilar () retorna numerico</code> (devuelve <code>-1</code> si está vacía) y <code>vacia () retorna logico</code>.<br>Leé la capacidad y después números hasta leer un <code>0</code>: apilalos todos y después desapilalos, imprimiéndolos en una sola línea separados por un espacio.",
      pista: "Una pila es LIFO: el último que entra es el primero que sale. Guardá el tope en un atributo y usalo como índice del vector.",
      plantilla: `clase PILA
{
   atributos
      privado
         v : vector [*] numerico
         tope = 0

   constructor (cap : numerico)
   inicio
      dim (este.v, cap)
   fin

   metodo apilar (n : numerico)
   inicio
   fin

   metodo desapilar () retorna numerico
   inicio
   fin

   metodo vacia () retorna logico
   inicio
      retorna ( este.tope == 0 )
   fin
}

var
   p : PILA
   cap = 0
   n = 0
inicio
   leer (cap)
   p = nuevo PILA (cap)
fin
`,
      pruebas: [
        { entrada: "10\n1\n2\n3\n0", salida: "3 2 1" },
        { entrada: "5\n7\n0", salida: "7" }
      ]
    },
    {
      id: "p33", nivel: "medio", titulo: "La cola del banco",
      enunciado: "Definí <code>COLA</code> con un <code>vector [*] cadena</code> privado, un frente y un fondo. Métodos: <code>entrar (n : cadena)</code>, <code>atender () retorna cadena</code> (devuelve <code>\"\"</code> si no hay nadie) y <code>cuantos () retorna numerico</code>.<br>Leé nombres hasta leer <code>fin</code>. Después atendé a todos, imprimiendo <code>atiendo a Ana</code>, uno por línea, y al final <code>quedan 0</code>.",
      pista: "Una cola es FIFO: el primero que llega es el primero que sale. Con dos índices (uno para el frente y otro para el fondo) alcanza.",
      plantilla: `clase COLA
{
   atributos
      privado
         v : vector [*] cadena
         frente = 1
         fondo = 0

   constructor (cap : numerico)
   inicio
      dim (este.v, cap)
   fin

   metodo entrar (n : cadena)
   inicio
   fin

   metodo atender () retorna cadena
   inicio
   fin

   metodo cuantos () retorna numerico
   inicio
      retorna ( este.fondo - este.frente + 1 )
   fin
}

var
   c : COLA
   n = ""
inicio
   c = nuevo COLA (100)
   leer (n)
fin
`,
      pruebas: [
        { entrada: "Ana\nBeto\nCeci\nfin", salida: "atiendo a Ana\natiendo a Beto\natiendo a Ceci\nquedan 0" },
        { entrada: "fin", salida: "quedan 0" }
      ]
    },
    {
      id: "p34", nivel: "medio", titulo: "Fracciones que se simplifican solas",
      enunciado: "Definí <code>FRACCION</code> con numerador y denominador privados. El constructor debe guardarla ya simplificada (dividiendo por el máximo común divisor). Agregá <code>texto ()</code> con el formato <code>3/4</code> y un método <code>por (otra : FRACCION) retorna FRACCION</code> que devuelva el producto, también simplificado.<br>Leé dos fracciones (<code>num,den</code> por línea) e imprimí cada una y su producto, uno por línea.",
      pista: "El máximo común divisor puede ser un método privado más de la clase. Un método puede devolver un objeto nuevo: <code>retorna ( nuevo FRACCION (…) )</code>. Así el resultado también llega simplificado, porque pasa por el constructor.",
      plantilla: `clase FRACCION
{
   atributos
      privado
         n = 0
         d = 1

   constructor (a, b : numerico)
   var
      g = 0
   inicio
      // simplificá antes de guardar
   fin

   metodo num () retorna numerico
   inicio
      retorna ( este.n )
   fin

   metodo den () retorna numerico
   inicio
      retorna ( este.d )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( str (este.n, 0, 0) + "/" + str (este.d, 0, 0) )
   fin
}

var
   a : FRACCION
   b : FRACCION
   x = 0
   y = 0
inicio
fin
`,
      pruebas: [
        { entrada: "2,4\n3,9", salida: "1/2\n1/3\n1/6" },
        { entrada: "6,3\n5,10", salida: "2/1\n1/2\n1/1" }
      ]
    },
    {
      id: "p35", nivel: "medio", titulo: "Sumar dos vectores del plano",
      enunciado: "Definí <code>VEC2</code> (un vector del plano) con <code>x</code> e <code>y</code> privados, los métodos <code>x_de()</code> y <code>y_de()</code>, <code>texto()</code> con formato <code>(4,6)</code>, y un método <code>mas (otro : VEC2) retorna VEC2</code> que devuelva un <strong>objeto nuevo</strong> con la suma.<br>Leé dos vectores (<code>x,y</code> por línea) e imprimí la suma. Después imprimí el primero otra vez, para comprobar que no cambió.",
      pista: "Devolver un objeto nuevo en lugar de modificar el actual evita sorpresas: el que llamó sigue teniendo su objeto intacto.",
      plantilla: `clase VEC2
{
   atributos
      privado
         x = 0
         y = 0

   constructor (a, b : numerico)
   inicio
      este.x = a
      este.y = b
   fin

   metodo x_de () retorna numerico
   inicio
      retorna ( este.x )
   fin

   metodo y_de () retorna numerico
   inicio
      retorna ( este.y )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "(" + str (este.x, 0, 0) + "," + str (este.y, 0, 0) + ")" )
   fin
}

var
   u : VEC2
   v : VEC2
   a = 0
   b = 0
inicio
fin
`,
      pruebas: [
        { entrada: "1,2\n3,4", salida: "(4,6)\n(1,2)" },
        { entrada: "-1,0\n1,0", salida: "(0,0)\n(-1,0)" }
      ]
    },
    {
      id: "p36", nivel: "medio", titulo: "Tres niveles de herencia",
      enunciado: "Definí <code>SERVIVO</code> con <code>respira()</code> que devuelva <code>respiro</code>; <code>ANIMAL hereda de SERVIVO</code> con <code>moverse()</code> que devuelva <code>me muevo</code>; y <code>AVE hereda de ANIMAL</code> con <code>moverse()</code> sobrescrito devolviendo <code>vuelo</code>.<br>Creá un ave e imprimí, uno por línea: <code>respira()</code>, <code>moverse()</code>, <code>clase_de()</code> y <code>si</code>/<code>no</code> para <code>a es SERVIVO</code>.",
      pista: "La herencia se encadena: el ave hereda de animal, que a su vez hereda de ser vivo. La búsqueda de un método sube por esa cadena hasta encontrarlo.",
      plantilla: `clase SERVIVO
{
   metodo respira () retorna cadena
   inicio
      retorna ( "respiro" )
   fin
}

clase ANIMAL hereda de SERVIVO
{
}

clase AVE hereda de ANIMAL
{
}

var
   a : AVE
inicio
   a = nuevo AVE ()
fin
`,
      pruebas: [
        { entrada: "", salida: "respiro\nvuelo\nAVE\nsi" }
      ]
    },
    {
      id: "p37", nivel: "avanzado", titulo: "Una agenda que crece sola",
      enunciado: "Definí <code>CONTACTO</code> (nombre y teléfono privados, con <code>nombre_de()</code> y <code>texto()</code> con formato <code>Ana - 0981111</code>) y <code>AGENDA</code>, que guarde un <code>vector [*] CONTACTO</code> y lo <strong>agrande sola</strong> cuando se llena (empezando con 2 lugares y duplicando).<br>Leé la cantidad de contactos y después sus datos (<code>nombre,telefono</code> por línea), imprimí cada uno y al final <code>total 4</code>.",
      pista: "Para agrandar sin perder lo guardado: pedí un vector nuevo del doble, copiá los objetos (que son referencias, así que se copian solas) y reemplazá el atributo.",
      plantilla: `clase CONTACTO
{
   atributos
      privado
         nombre = ""
         tel = ""

   constructor (n, t : cadena)
   inicio
      este.nombre = n
      este.tel = t
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " - " + este.tel )
   fin
}

clase AGENDA
{
   atributos
      privado
         v : vector [*] CONTACTO
         cant = 0
         cap = 0

   constructor ()
   inicio
      este.cap = 2
      dim (este.v, este.cap)
   fin

   metodo agregar (c : CONTACTO)
   inicio
      // si no entra, agrandá primero
   fin

   metodo cuantos () retorna numerico
   inicio
      retorna ( este.cant )
   fin

   metodo en (k : numerico) retorna CONTACTO
   inicio
      retorna ( este.v [k] )
   fin
}

var
   a : AGENDA
   n = ""
   t = ""
   k = 0
   cuantos = 0
inicio
   a = nuevo AGENDA ()
   leer (cuantos)
fin
`,
      pruebas: [
        { entrada: "4\nAna,0981111\nBeto,0982222\nCeci,0983333\nDani,0984444", salida: "Ana - 0981111\nBeto - 0982222\nCeci - 0983333\nDani - 0984444\ntotal 4" },
        { entrada: "1\nZoe,0990000", salida: "Zoe - 0990000\ntotal 1" }
      ]
    },
    {
      id: "p38", nivel: "avanzado", titulo: "Cuerpos en el espacio",
      enunciado: "Definí la clase abstracta <code>CUERPO</code> con los métodos abstractos <code>volumen()</code> y <code>nombre()</code>, y un método concreto <code>informe ()</code> que imprima <code>esfera: 33.51</code>.<br>Definí <code>ESFERA</code> (4/3·π·r³), <code>CUBO</code> (l³) y <code>CILINDRO</code> (π·r²·h). Guardá una esfera de radio 2, un cubo de lado 3 y un cilindro de radio 1 y altura 5 en un <code>vector [3] CUERPO</code>, imprimí el informe de cada uno y al final <code>el mayor es cubo</code>.",
      pista: "El ciclo que busca el mayor no sabe con qué cuerpos está tratando: solo compara <code>volumen()</code>. Agregar un cuerpo nuevo no obliga a tocar ese ciclo.",
      plantilla: `const
   PI = 3.141592654

clase abstracta CUERPO
{
   metodo abstracto volumen () retorna numerico
   metodo abstracto nombre () retorna cadena

   metodo informe ()
   inicio
      imprimir (este.nombre(), ": ", str (este.volumen(), 0, 2), "\\n")
   fin
}

clase ESFERA hereda de CUERPO
{
}

clase CUBO hereda de CUERPO
{
}

clase CILINDRO hereda de CUERPO
{
}

var
   v : vector [3] CUERPO
   k = 0
   mayor = 0
inicio
fin
`,
      pruebas: [
        { entrada: "", salida: "esfera: 33.51\ncubo: 27.00\ncilindro: 15.71\nel mayor es esfera" }
      ]
    },
    {
      id: "p39", nivel: "avanzado", titulo: "Transferencia entre cuentas",
      enunciado: "Definí <code>CUENTA</code> con titular y saldo privados, <code>depositar (m)</code>, <code>extraer (m) retorna logico</code> (falso si no alcanza), <code>saldo_de ()</code> y <code>transferir_a (otra : CUENTA; m : numerico)</code>, que mueve el dinero solo si la extracción salió bien; si no, imprime <code>rechazada</code>.<br>Creá dos cuentas (Ana 1000, Beto 500), hacé tres transferencias leídas de la entrada (<code>origen,monto</code> donde origen es <code>A</code> o <code>B</code>) e imprimí los dos saldos finales: <code>Ana 700</code> y <code>Beto 800</code>.",
      pista: "Un objeto puede recibir a otro de su misma clase y llamarle métodos: eso es una relación entre objetos, distinta de la herencia.",
      plantilla: `clase CUENTA
{
   atributos
      privado
         titular = ""
         saldo = 0

   constructor (t : cadena; s : numerico)
   inicio
      este.titular = t
      este.saldo = s
   fin

   metodo depositar (m : numerico)
   inicio
   fin

   metodo extraer (m : numerico) retorna logico
   inicio
   fin

   metodo saldo_de () retorna numerico
   inicio
      retorna ( este.saldo )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.titular + " " + str (este.saldo, 0, 0) )
   fin

   metodo transferir_a (otra : CUENTA; m : numerico)
   inicio
   fin
}

var
   a : CUENTA
   b : CUENTA
   quien = ""
   m = 0
   k = 0
inicio
   a = nuevo CUENTA ("Ana", 1000)
   b = nuevo CUENTA ("Beto", 500)
fin
`,
      pruebas: [
        { entrada: "A,300\nB,0\nA,5000", salida: "rechazada\nAna 700\nBeto 800" },
        { entrada: "B,500\nA,100\nB,200", salida: "rechazada\nAna 1400\nBeto 100" }
      ]
    },
    {
      id: "p40", nivel: "avanzado", titulo: "Ordenar objetos por dos criterios",
      enunciado: "Definí <code>JUGADOR</code> (nombre y puntos privados, con <code>nombre_de()</code>, <code>puntos_de()</code> y <code>texto()</code> con formato <code>Ana 30</code>) y <code>TABLA_POS</code> con un vector de jugadores y un método <code>ordenar ()</code> que los deje de mayor a menor por puntos y, ante un empate, alfabéticamente por nombre.<br>Leé la cantidad y después los jugadores (<code>nombre,puntos</code>) e imprimí la tabla ordenada, uno por línea.",
      pista: "Recordá que al intercambiar dos casillas de un vector de objetos solo se mueven las referencias: los objetos no se copian. <code>intercambiar()</code> sirve igual.",
      plantilla: `clase JUGADOR
{
   atributos
      privado
         nombre = ""
         puntos = 0

   constructor (n : cadena; p : numerico)
   inicio
      este.nombre = n
      este.puntos = p
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo puntos_de () retorna numerico
   inicio
      retorna ( este.puntos )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.puntos, 0, 0) )
   fin
}

clase TABLA_POS
{
   atributos
      privado
         v : vector [*] JUGADOR
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (j : JUGADOR)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = j
   fin

   metodo ordenar ()
   inicio
   fin

   metodo mostrar ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         imprimir (este.v [k], "\\n")
      }
   fin
}

var
   t : TABLA_POS
   n = 0
   k = 0
   nom = ""
   pts = 0
inicio
   leer (n)
   t = nuevo TABLA_POS (n)
fin
`,
      pruebas: [
        { entrada: "4\nAna,30\nBeto,50\nCeci,30\nDani,10", salida: "Beto 50\nAna 30\nCeci 30\nDani 10" },
        { entrada: "3\nzoe,5\nabel,5\nnico,9", salida: "nico 9\nabel 5\nzoe 5" }
      ]
    },
    {
      id: "p41", nivel: "avanzado", titulo: "Buscar y no encontrar",
      enunciado: "Definí <code>ALUMNO</code> (nombre y nota) y <code>REGISTRO</code> con un método <code>buscar (n : cadena) retorna ALUMNO</code> que devuelva <code>nulo</code> si nadie se llama así.<br>Leé la cantidad de alumnos, sus datos (<code>nombre,nota</code>) y después dos nombres a buscar. Por cada uno imprimí <code>Ana tiene 90</code> o <code>no esta</code>.",
      pista: "Devolver <code>nulo</code> es la manera honesta de decir «no hay». El que llama debe revisarlo con <code>es_nulo ()</code> antes de usar el resultado.",
      plantilla: `clase ALUMNO
{
   atributos
      privado
         nombre = ""
         nota = 0

   constructor (n : cadena; x : numerico)
   inicio
      este.nombre = n
      este.nota = x
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " tiene " + str (este.nota, 0, 0) )
   fin
}

clase REGISTRO
{
   atributos
      privado
         v : vector [*] ALUMNO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (a : ALUMNO)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = a
   fin

   metodo buscar (n : cadena) retorna ALUMNO
   inicio
   fin
}

var
   r : REGISTRO
   n = 0
   k = 0
   nom = ""
   nota = 0
   hallado : ALUMNO
inicio
   leer (n)
   r = nuevo REGISTRO (n)
fin
`,
      pruebas: [
        { entrada: "3\nAna,90\nBeto,70\nCeci,85\nCeci\nZoe", salida: "Ceci tiene 85\nno esta" },
        { entrada: "1\nAna,100\nAna\nAna", salida: "Ana tiene 100\nAna tiene 100" }
      ]
    },
    {
      id: "p42", nivel: "avanzado", titulo: "Inventario con alertas",
      enunciado: "Definí <code>ITEM</code> (nombre, stock y mínimo privados) con <code>falta () retorna logico</code> (stock por debajo del mínimo) y <code>texto()</code> con formato <code>clavos 3/10</code>. Definí <code>DEPOSITO</code> con <code>agregar</code>, <code>valor_total() retorna numerico</code> (stock × precio) y <code>alertas ()</code>, que imprima solo los ítems que faltan.<br>Leé la cantidad y los ítems (<code>nombre,stock,minimo,precio</code>). Imprimí las alertas y al final <code>valor 41000</code>.",
      pista: "La regla de cuándo falta un ítem vive dentro de <code>ITEM</code>: el depósito no la conoce, solo pregunta. Si mañana cambia la regla, se toca un solo lugar.",
      plantilla: `clase ITEM
{
   atributos
      privado
         nombre = ""
         stock = 0
         minimo = 0
         precio = 0

   constructor (n : cadena; s, m, p : numerico)
   inicio
      este.nombre = n
      este.stock = s
      este.minimo = m
      este.precio = p
   fin

   metodo falta () retorna logico
   inicio
   fin

   metodo valor () retorna numerico
   inicio
      retorna ( este.stock * este.precio )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.stock, 0, 0) + "/" + str (este.minimo, 0, 0) )
   fin
}

clase DEPOSITO
{
   atributos
      privado
         v : vector [*] ITEM
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (i : ITEM)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = i
   fin

   metodo alertas ()
   inicio
   fin

   metodo valor_total () retorna numerico
   inicio
   fin
}

var
   d : DEPOSITO
   n = 0
   k = 0
   nom = ""
   s = 0
   m = 0
   p = 0
inicio
   leer (n)
   d = nuevo DEPOSITO (n)
fin
`,
      pruebas: [
        { entrada: "3\nclavos,3,10,500\nmartillo,5,2,7000\ntornillos,1,20,300", salida: "clavos 3/10\ntornillos 1/20\nvalor 36800" },
        { entrada: "1\ncinta,9,2,1000", salida: "valor 9000" }
      ]
    },
    {
      id: "p43", nivel: "avanzado", titulo: "Un método que se llama a sí mismo",
      enunciado: "Definí <code>CALCULADORA</code> con dos métodos recursivos: <code>factorial (n : numerico) retorna numerico</code> y <code>fibo (n : numerico) retorna numerico</code> (con <code>fibo(1) = 1</code> y <code>fibo(2) = 1</code>).<br>Leé un número <code>n</code> e imprimí su factorial en la primera línea y el <code>n</code>-ésimo Fibonacci en la segunda.",
      pista: "Un método puede llamarse a sí mismo con <code>este.factorial (n - 1)</code>. Como siempre en la recursión, primero el caso base.",
      plantilla: `clase CALCULADORA
{
   metodo factorial (n : numerico) retorna numerico
   inicio
   fin

   metodo fibo (n : numerico) retorna numerico
   inicio
   fin
}

var
   c : CALCULADORA
   n = 0
inicio
   c = nuevo CALCULADORA ()
   leer (n)
fin
`,
      pruebas: [
        { entrada: "5", salida: "120\n5" },
        { entrada: "1", salida: "1\n1" },
        { entrada: "10", salida: "3628800\n55" }
      ]
    },
    {
      id: "p44", nivel: "avanzado", titulo: "Una lista enlazada de objetos",
      enunciado: "Definí <code>NODO</code> con un valor numérico y un atributo <code>sig : NODO</code> (el nodo siguiente, o <code>nulo</code>), y <code>LISTA</code> con <code>agregar (n : numerico)</code> (al final), <code>largo () retorna numerico</code> y <code>mostrar ()</code>, que imprima los valores separados por <code>-></code>.<br>Leé la cantidad y los números, mostrá la lista y en la línea siguiente imprimí <code>largo 4</code>.",
      pista: "Acá se ve por qué los objetos son referencias: cada nodo apunta al siguiente y <code>nulo</code> marca el final. No hace falta ningún vector.",
      plantilla: `clase NODO
{
   atributos
      publico
         valor = 0
         sig : NODO

   constructor (v : numerico)
   inicio
      este.valor = v
   fin
}

clase LISTA
{
   atributos
      privado
         primero : NODO

   metodo agregar (n : numerico)
   var
      p : NODO
   inicio
      // si la lista está vacía, el nuevo nodo es el primero
   fin

   metodo largo () retorna numerico
   inicio
   fin

   metodo mostrar ()
   inicio
   fin
}

var
   l : LISTA
   n = 0
   k = 0
   x = 0
inicio
   l = nuevo LISTA ()
   leer (n)
fin
`,
      pruebas: [
        { entrada: "4\n5\n8\n2\n9", salida: "5->8->2->9\nlargo 4" },
        { entrada: "1\n7", salida: "7\nlargo 1" }
      ]
    },
    {
      id: "p45", nivel: "avanzado", titulo: "La biblioteca presta y recibe",
      enunciado: "Definí <code>LIBRO</code> (título privado, <code>prestado</code> lógico privado) con <code>prestar () retorna logico</code> (falso si ya estaba prestado), <code>devolver ()</code> y <code>texto()</code> con formato <code>El Quijote (prestado)</code> o <code>El Quijote (disponible)</code>. Definí <code>BIBLIOTECA</code> con <code>buscar (t : cadena) retorna LIBRO</code> y <code>pedir (t : cadena)</code>, que imprima <code>listo</code>, <code>ya prestado</code> o <code>no tenemos ese libro</code>.<br>Leé la cantidad de libros y sus títulos; después tres pedidos. Al final listá los libros con su estado.",
      pista: "Fijate cómo cada clase se ocupa de lo suyo: el libro sabe si puede prestarse, la biblioteca sabe buscarlo. Ninguna hace el trabajo de la otra.",
      plantilla: `clase LIBRO
{
   atributos
      privado
         titulo = ""
         prestado = FALSE

   constructor (t : cadena)
   inicio
      este.titulo = t
   fin

   metodo titulo_de () retorna cadena
   inicio
      retorna ( este.titulo )
   fin

   metodo prestar () retorna logico
   inicio
   fin

   metodo texto () retorna cadena
   inicio
   fin
}

clase BIBLIOTECA
{
   atributos
      privado
         v : vector [*] LIBRO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (l : LIBRO)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = l
   fin

   metodo buscar (t : cadena) retorna LIBRO
   inicio
   fin

   metodo pedir (t : cadena)
   inicio
   fin

   metodo listar ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         imprimir (este.v [k], "\\n")
      }
   fin
}

var
   b : BIBLIOTECA
   n = 0
   k = 0
   t = ""
inicio
   leer (n)
   b = nuevo BIBLIOTECA (n)
fin
`,
      pruebas: [
        { entrada: "2\nEl Quijote\nRayuela\nEl Quijote\nEl Quijote\nMartin Fierro", salida: "listo\nya prestado\nno tenemos ese libro\nEl Quijote (prestado)\nRayuela (disponible)" },
        { entrada: "1\nRayuela\nRayuela\nOtro\nRayuela", salida: "listo\nno tenemos ese libro\nya prestado\nRayuela (prestado)" }
      ]
    },
    {
      id: "p46", nivel: "avanzado", titulo: "La madre arma el informe, las hijas lo llenan",
      enunciado: "Definí la clase abstracta <code>REPORTE</code> con un método concreto <code>emitir ()</code> que imprima siempre la misma estructura: el título, después las líneas del detalle y al final <code>--- fin ---</code>. El título y el detalle son métodos abstractos (<code>titulo()</code> y <code>detalle()</code>).<br>Definí <code>REPORTE_SUMA</code> (imprime los números leídos y su suma) y <code>REPORTE_MAYOR</code> (imprime el mayor). Leé tres números y emití los dos reportes.",
      pista: "Esto se llama <em>método plantilla</em>: la clase madre fija el orden de los pasos y las hijas completan cada paso. El formato del informe se decide en un solo lugar.",
      plantilla: `clase abstracta REPORTE
{
   atributos
      protegido
         v : vector [3] numerico

   constructor (a, b, c : numerico)
   inicio
      este.v [1] = a
      este.v [2] = b
      este.v [3] = c
   fin

   metodo abstracto titulo () retorna cadena
   metodo abstracto detalle ()

   metodo emitir ()
   inicio
      imprimir (este.titulo(), "\\n")
      este.detalle()
      imprimir ("--- fin ---\\n")
   fin
}

clase REPORTE_SUMA hereda de REPORTE
{
}

clase REPORTE_MAYOR hereda de REPORTE
{
}

var
   a = 0
   b = 0
   c = 0
   r1 : REPORTE_SUMA
   r2 : REPORTE_MAYOR
inicio
   leer (a, b, c)
fin
`,
      pruebas: [
        { entrada: "4,9,2", salida: "SUMA\n4\n9\n2\ntotal 15\n--- fin ---\nMAYOR\nel mayor es 9\n--- fin ---" },
        { entrada: "1,1,1", salida: "SUMA\n1\n1\n1\ntotal 3\n--- fin ---\nMAYOR\nel mayor es 1\n--- fin ---" }
      ]
    },
    {
      id: "p47", nivel: "avanzado", titulo: "La nómina completa",
      enunciado: "Partiendo de la clase abstracta <code>EMPLEADO</code> (nombre protegido, <code>sueldo()</code> abstracto y <code>aporte()</code> concreto que devuelve el 9% del sueldo), definí <code>MENSUAL</code>, <code>JORNALERO</code> y <code>COMISIONISTA</code> (base + porcentaje sobre las ventas).<br>Guardá uno de cada uno en un <code>vector [3] EMPLEADO</code> e imprimí por cada uno <code>Ana 1500000 135000</code> (nombre, sueldo y aporte) y al final <code>total 4800000</code>.",
      pista: "El aporte se calcula una sola vez, en la clase madre, encima de un <code>sueldo()</code> que todavía no existe. Cada hija decide después cómo se gana ese sueldo.",
      plantilla: `clase abstracta EMPLEADO
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo abstracto sueldo () retorna numerico

   metodo aporte () retorna numerico
   inicio
      retorna ( este.sueldo() * 0.09 )
   fin
}

clase MENSUAL hereda de EMPLEADO
{
}

clase JORNALERO hereda de EMPLEADO
{
}

clase COMISIONISTA hereda de EMPLEADO
{
}

var
   v : vector [3] EMPLEADO
   k = 0
   total = 0
inicio
   v [1] = nuevo MENSUAL ("Ana", 1500000)
   v [2] = nuevo JORNALERO ("Beto", 90000, 20)
   v [3] = nuevo COMISIONISTA ("Ceci", 1000000, 5000000, 0.1)
fin
`,
      pruebas: [
        { entrada: "", salida: "Ana 1500000 135000\nBeto 1800000 162000\nCeci 1500000 135000\ntotal 4800000" }
      ]
    },
    {
      id: "p48", nivel: "avanzado", titulo: "Tres en raya",
      enunciado: "Definí <code>TABLERO</code> con una <code>matriz [3,3] cadena</code> privada (empieza con <code>.</code> en todas las casillas), los métodos <code>poner (f, c : numerico; s : cadena) retorna logico</code> (falso si la casilla está ocupada), <code>ganador () retorna cadena</code> (devuelve <code>X</code>, <code>O</code> o <code>\"\"</code>) y <code>mostrar ()</code>.<br>Leé jugadas (<code>fila,columna,simbolo</code>) hasta que alguien gane o se lean cinco jugadas. Mostrá el tablero y después <code>gana X</code> o <code>sin ganador</code>.",
      pista: "Guardar la matriz adentro del objeto evita pasarla por parámetro a cada rato: el tablero sabe leerse a sí mismo. Revisá filas, columnas y las dos diagonales.",
      plantilla: `clase TABLERO
{
   atributos
      privado
         m : matriz [3,3] cadena

   constructor ()
   var
      f = 0
      c = 0
   inicio
      desde f=1 hasta 3
      {
         desde c=1 hasta 3
         {
            este.m [f, c] = "."
         }
      }
   fin

   metodo poner (f, c : numerico; s : cadena) retorna logico
   inicio
   fin

   metodo ganador () retorna cadena
   inicio
   fin

   metodo mostrar ()
   var
      f = 0
      c = 0
   inicio
      desde f=1 hasta 3
      {
         desde c=1 hasta 3
         {
            imprimir (este.m [f, c])
         }
         imprimir ("\\n")
      }
   fin
}

var
   t : TABLERO
   k = 0
   f = 0
   c = 0
   s = ""
inicio
   t = nuevo TABLERO ()
fin
`,
      pruebas: [
        { entrada: "1,1,X\n2,2,O\n1,2,X\n3,3,O\n1,3,X", salida: "XXX\n.O.\n..O\ngana X" },
        { entrada: "1,1,X\n1,2,O\n2,2,X\n2,1,O\n3,1,X", salida: "XO.\nOX.\nX..\nsin ganador" }
      ]
    },
    {
      id: "p49", nivel: "avanzado", titulo: "Un duelo por turnos",
      enunciado: "Definí <code>PERSONAJE</code> con nombre, vida y fuerza protegidos, <code>vivo () retorna logico</code>, <code>recibir (d : numerico)</code> y <code>atacar_a (otro : PERSONAJE)</code>, que imprime <code>Conan golpea a Merlin por 20</code>. Definí <code>MAGO hereda de PERSONAJE</code>, cuyo ataque vale el doble pero que pierde 5 de vida cada vez que ataca.<br>Hacé pelear a un guerrero (vida 100, fuerza 20) contra un mago (vida 80, fuerza 15) por turnos hasta que uno caiga, e imprimí <code>gana Conan</code>.",
      pista: "Sobrescribir <code>atacar_a()</code> en el mago cambia el comportamiento sin tocar el ciclo de la pelea: el ciclo solo dice «ahora ataca este».",
      plantilla: `clase PERSONAJE
{
   atributos
      protegido
         nombre = ""
         vida = 0
         fuerza = 0

   constructor (n : cadena; v, f : numerico)
   inicio
      este.nombre = n
      este.vida = v
      este.fuerza = f
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo vivo () retorna logico
   inicio
      retorna ( este.vida > 0 )
   fin

   metodo recibir (d : numerico)
   inicio
      este.vida = este.vida - d
   fin

   metodo atacar_a (otro : PERSONAJE)
   inicio
   fin
}

clase MAGO hereda de PERSONAJE
{
}

var
   g : PERSONAJE
   m : MAGO
inicio
   g = nuevo PERSONAJE ("Conan", 100, 20)
   m = nuevo MAGO ("Merlin", 80, 15)
fin
`,
      pruebas: [
        { entrada: "", salida: "Conan golpea a Merlin por 20\nMerlin golpea a Conan por 30\nConan golpea a Merlin por 20\nMerlin golpea a Conan por 30\nConan golpea a Merlin por 20\nMerlin golpea a Conan por 30\nConan golpea a Merlin por 20\ngana Conan" }
      ]
    },
    {
      id: "p50", nivel: "avanzado", titulo: "El carrito de la tienda",
      enunciado: "Definí la clase abstracta <code>PRODUCTO</code> (nombre y precio protegidos) con <code>precio_final () retorna numerico</code> abstracto y <code>texto()</code> con formato <code>arroz 12000</code> (nombre y precio final). Definí <code>COMIDA</code> (sin recargo), <code>ELECTRO</code> (10% de impuesto) e <code>IMPORTADO</code> (10% de impuesto más 15% de arancel).<br>Definí <code>CARRITO</code> con <code>agregar</code>, <code>total () retorna numerico</code> y <code>ticket ()</code>, que imprima cada producto y al final <code>TOTAL 288500</code>.<br>Leé la cantidad y después cada producto como <code>tipo,nombre,precio</code> (tipo <code>C</code>, <code>E</code> o <code>I</code>).",
      pista: "El carrito nunca pregunta qué tipo de producto tiene: suma <code>precio_final()</code> y listo. Agregar una categoría nueva mañana no lo obliga a cambiar ni una línea.",
      plantilla: `clase abstracta PRODUCTO
{
   atributos
      protegido
         nombre = ""
         precio = 0

   constructor (n : cadena; p : numerico)
   inicio
      este.nombre = n
      este.precio = p
   fin

   metodo abstracto precio_final () retorna numerico

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.precio_final(), 0, 0) )
   fin
}

clase COMIDA hereda de PRODUCTO
{
}

clase ELECTRO hereda de PRODUCTO
{
}

clase IMPORTADO hereda de PRODUCTO
{
}

clase CARRITO
{
   atributos
      privado
         v : vector [*] PRODUCTO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (p : PRODUCTO)
   inicio
   fin

   metodo total () retorna numerico
   inicio
   fin

   metodo ticket ()
   inicio
   fin
}

var
   c : CARRITO
   n = 0
   k = 0
   tipo = ""
   nom = ""
   pre = 0
inicio
   leer (n)
   c = nuevo CARRITO (n)
fin
`,
      pruebas: [
        { entrada: "3\nC,arroz,12000\nE,ventilador,150000\nI,perfume,100000", salida: "arroz 12000\nventilador 165000\nperfume 125000\nTOTAL 302000" },
        { entrada: "1\nC,pan,5000", salida: "pan 5000\nTOTAL 5000" }
      ]
    }
  ];

  /* Soluciones de referencia (las usa test/test-poo.js). */
  const SOLUCIONES = {
    p1: `clase PERSONA
{
   atributos
      privado
         nombre = ""
         edad   = 0

   constructor (n : cadena; e : numerico)
   inicio
      este.nombre = n
      este.edad = e
   fin

   metodo saludar ()
   inicio
      imprimir ("Hola, soy ", este.nombre, " y tengo ", este.edad, " anios")
   fin
}

var
   p : PERSONA
   n = ""
   e = 0
inicio
   leer (n, e)
   p = nuevo PERSONA (n, e)
   p.saludar()
fin`,

    p2: `clase RECTANGULO
{
   atributos
      privado
         b = 0
         h = 0

   constructor (base, altura : numerico)
   inicio
      este.b = base
      este.h = altura
   fin

   metodo area () retorna numerico
   inicio
      retorna ( este.b * este.h )
   fin

   metodo perimetro () retorna numerico
   inicio
      retorna ( 2 * (este.b + este.h) )
   fin
}

var
   r : RECTANGULO
   b = 0
   h = 0
inicio
   leer (b, h)
   r = nuevo RECTANGULO (b, h)
   imprimir (r.area(), "\\n", r.perimetro())
fin`,

    p3: `clase CUENTA
{
   atributos
      privado
         saldo = 0

   constructor (inicial : numerico)
   inicio
      este.saldo = inicial
   fin

   metodo extraer (monto : numerico)
   inicio
      si ( monto <= este.saldo )
      {
         este.saldo = este.saldo - monto
      sino
         imprimir ("fondos insuficientes\\n")
      }
   fin

   metodo saldo_actual () retorna numerico
   inicio
      retorna ( este.saldo )
   fin
}

var
   c : CUENTA
   ini = 0
   m1 = 0
   m2 = 0
inicio
   leer (ini, m1, m2)
   c = nuevo CUENTA (ini)
   c.extraer (m1)
   imprimir (c.saldo_actual(), "\\n")
   c.extraer (m2)
   imprimir (c.saldo_actual())
fin`,

    p4: `clase PUNTO
{
   atributos
      privado
         x = 0
         y = 0

   constructor (a, b : numerico)
   inicio
      este.x = a
      este.y = b
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "(" + str (este.x, 0, 0) + "," + str (este.y, 0, 0) + ")" )
   fin
}

var
   p : PUNTO
   a = 0
   b = 0
inicio
   leer (a, b)
   p = nuevo PUNTO (a, b)
   imprimir (p)
fin`,

    p5: `clase EMPLEADO
{
   atributos
      protegido
         nombre = ""
         sueldo = 0

   constructor (n : cadena; s : numerico)
   inicio
      este.nombre = n
      este.sueldo = s
   fin

   metodo sueldo_final () retorna numerico
   inicio
      retorna ( este.sueldo )
   fin
}

clase GERENTE hereda de EMPLEADO
{
   atributos
      privado
         bono = 0

   constructor (n : cadena; s, b : numerico)
   inicio
      padre.constructor (n, s)
      este.bono = b
   fin

   metodo sueldo_final () retorna numerico
   inicio
      retorna ( padre.sueldo_final() + este.bono )
   fin
}

var
   e : EMPLEADO
   g : GERENTE
inicio
   e = nuevo EMPLEADO ("Ana", 1000)
   g = nuevo GERENTE ("Beto", 2000, 500)
   imprimir (e.sueldo_final(), "\\n", g.sueldo_final())
fin`,

    p6: `const
   PI = 3.141592654

clase abstracta FIGURA
{
   metodo abstracto area () retorna numerico
}

clase CIRCULO hereda de FIGURA
{
   atributos
      privado
         r = 0
   constructor (radio : numerico)
   inicio
      este.r = radio
   fin
   metodo area () retorna numerico
   inicio
      retorna ( PI * este.r ^ 2 )
   fin
}

clase CUADRADO hereda de FIGURA
{
   atributos
      privado
         l = 0
   constructor (lado : numerico)
   inicio
      este.l = lado
   fin
   metodo area () retorna numerico
   inicio
      retorna ( este.l * este.l )
   fin
}

var
   fs : vector [3] FIGURA
   k = 0
   total = 0
inicio
   fs [1] = nuevo CIRCULO (2)
   fs [2] = nuevo CUADRADO (3)
   fs [3] = nuevo CIRCULO (1)
   desde k=1 hasta alen (fs)
   {
      imprimir (clase_de (fs[k]), " ", str (fs[k].area(), 0, 2), "\\n")
      total = total + fs[k].area()
   }
   imprimir ("total ", str (total, 0, 2))
fin`,

    p7: `clase ROBOT
{
   atributos
      compartido publico
         cantidad = 0
      privado
         numero = 0

   constructor ()
   inicio
      ROBOT.cantidad = ROBOT.cantidad + 1
      este.numero = ROBOT.cantidad
   fin

   metodo ficha () retorna cadena
   inicio
      retorna ( "robot " + str (este.numero, 0, 0) + " de " + str (ROBOT.cantidad, 0, 0) )
   fin
}

var
   a : ROBOT
   b : ROBOT
   c : ROBOT
inicio
   a = nuevo ROBOT()
   b = nuevo ROBOT()
   c = nuevo ROBOT()
   imprimir (a.ficha(), "\\n", b.ficha(), "\\n", c.ficha())
fin`,

    p8: `clase ALUMNO
{
   atributos
      privado
         nombre = ""
         nota = 0

   constructor (n : cadena; x : numerico)
   inicio
      este.nombre = n
      este.nota = x
   fin

   metodo nota_de () retorna numerico
   inicio
      retorna ( este.nota )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + ": " + str (este.nota, 0, 0) )
   fin
}

clase CURSO
{
   atributos
      privado
         lista : vector [*] ALUMNO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.lista, tope)
   fin

   metodo agregar (a : ALUMNO)
   inicio
      este.cant = este.cant + 1
      este.lista [este.cant] = a
   fin

   metodo promedio () retorna numerico
   var
      k = 0
      s = 0
   inicio
      desde k=1 hasta este.cant
      {
         s = s + este.lista[k].nota_de()
      }
      retorna ( s / este.cant )
   fin

   metodo mejor () retorna ALUMNO
   var
      k = 0
      m : ALUMNO
   inicio
      m = este.lista [1]
      desde k=2 hasta este.cant
      {
         si ( este.lista[k].nota_de() > m.nota_de() )
         {
            m = este.lista [k]
         }
      }
      retorna ( m )
   fin
}

var
   c : CURSO
   n = 0
   k = 0
   nom = ""
   nota = 0
inicio
   leer (n)
   c = nuevo CURSO (n)
   desde k=1 hasta n
   {
      leer (nom, nota)
      c.agregar (nuevo ALUMNO (nom, nota))
   }
   imprimir (str (c.promedio(), 0, 2), "\\n", c.mejor())
fin`,

    p9: `clase LIBRO
{
   atributos
      privado
         titulo = ""
         autor  = ""
         paginas = 0

   constructor (t, a : cadena; p : numerico)
   inicio
      este.titulo = t
      este.autor = a
      este.paginas = p
   fin

   metodo ficha ()
   inicio
      imprimir (este.titulo, " (", este.autor, ", ", este.paginas, " pag)")
   fin
}

var
   l : LIBRO
   t = ""
   a = ""
   p = 0
inicio
   leer (t, a, p)
   l = nuevo LIBRO (t, a, p)
   l.ficha()
fin`,

    p10: `const
   PI = 3.141592654

clase CIRCULO
{
   atributos
      privado
         r = 0

   constructor (radio : numerico)
   inicio
      este.r = radio
   fin

   metodo area () retorna numerico
   inicio
      retorna ( PI * este.r * este.r )
   fin

   metodo perimetro () retorna numerico
   inicio
      retorna ( 2 * PI * este.r )
   fin
}

var
   c : CIRCULO
   radio = 0
inicio
   leer (radio)
   c = nuevo CIRCULO (radio)
   imprimir (str (c.area(), 0, 2), "\\n", str (c.perimetro(), 0, 2))
fin`,

    p11: `clase TERMOMETRO
{
   atributos
      privado
         celsius = 0

   metodo poner (c : numerico)
   inicio
      este.celsius = c
   fin

   metodo fahrenheit () retorna numerico
   inicio
      retorna ( este.celsius * 9 / 5 + 32 )
   fin
}

var
   t : TERMOMETRO
   c = 0
inicio
   t = nuevo TERMOMETRO ()
   leer (c)
   t.poner (c)
   imprimir (t.fahrenheit(), "\\n")
   leer (c)
   t.poner (c)
   imprimir (t.fahrenheit())
fin`,

    p12: `clase CONTADOR
{
   atributos
      privado
         v = 0

   metodo subir ()
   inicio
      este.v = este.v + 1
   fin

   metodo bajar ()
   inicio
      si ( este.v > 0 )
      {
         este.v = este.v - 1
      }
   fin

   metodo valor () retorna numerico
   inicio
      retorna ( este.v )
   fin
}

var
   c : CONTADOR
   n = 0
   k = 0
inicio
   leer (n)
   c = nuevo CONTADOR ()
   desde k=1 hasta n
   {
      c.subir()
   }
   c.bajar()
   c.bajar()
   imprimir (c.valor())
fin`,

    p13: `clase PRODUCTO
{
   atributos
      privado
         nombre = ""
         precio = 0

   constructor (n : cadena; p : numerico)
   inicio
      este.nombre = n
      este.precio = p
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo precio_de () retorna numerico
   inicio
      retorna ( este.precio )
   fin

   metodo mas_caro_que (otro : PRODUCTO) retorna logico
   inicio
      retorna ( este.precio > otro.precio_de() )
   fin
}

var
   a : PRODUCTO
   b : PRODUCTO
   n = ""
   p = 0
inicio
   leer (n, p)
   a = nuevo PRODUCTO (n, p)
   leer (n, p)
   b = nuevo PRODUCTO (n, p)
   si ( a.mas_caro_que (b) )
   {
      imprimir (a.nombre_de())
   sino si ( b.mas_caro_que (a) )
      imprimir (b.nombre_de())
   sino
      imprimir ("empate")
   }
fin`,

    p14: `clase ALCANCIA
{
   atributos
      privado
         total = 0

   metodo meter (monto : numerico)
   inicio
      si ( monto > 0 )
      {
         este.total = este.total + monto
      }
   fin

   metodo total_ahorrado () retorna numerico
   inicio
      retorna ( este.total )
   fin
}

var
   a : ALCANCIA
   n = 0
   k = 0
   m = 0
inicio
   leer (n)
   a = nuevo ALCANCIA ()
   desde k=1 hasta n
   {
      leer (m)
      a.meter (m)
   }
   imprimir (a.total_ahorrado())
fin`,

    p15: `clase MASCOTA
{
   atributos
      privado
         nombre = ""
         sonido = ""

   constructor (n, s : cadena)
   inicio
      este.nombre = n
      este.sonido = s
   fin

   metodo hablar ()
   inicio
      imprimir (este.nombre, " dice ", este.sonido, "\\n")
   fin
}

var
   m : MASCOTA
   n = 0
   k = 0
   nom = ""
   son = ""
inicio
   leer (n)
   desde k=1 hasta n
   {
      leer (nom, son)
      m = nuevo MASCOTA (nom, son)
      m.hablar()
   }
fin`,

    p16: `clase TABLA
{
   atributos
      privado
         n = 0

   constructor (x : numerico)
   inicio
      este.n = x
   fin

   metodo mostrar (tope : numerico)
   var
      k = 0
   inicio
      desde k=1 hasta tope
      {
         imprimir (este.n, " x ", k, " = ", este.n * k, "\\n")
      }
   fin
}

var
   t : TABLA
   n = 0
   h = 0
inicio
   leer (n, h)
   t = nuevo TABLA (n)
   t.mostrar (h)
fin`,

    p17: `clase PUNTO
{
   atributos
      privado
         x = 0
         y = 0

   constructor (a, b : numerico)
   inicio
      este.x = a
      este.y = b
   fin

   metodo x_de () retorna numerico
   inicio
      retorna ( este.x )
   fin

   metodo y_de () retorna numerico
   inicio
      retorna ( este.y )
   fin

   metodo distancia_a (otro : PUNTO) retorna numerico
   var
      dx = 0
      dy = 0
   inicio
      dx = este.x - otro.x_de()
      dy = este.y - otro.y_de()
      retorna ( sqrt (dx * dx + dy * dy) )
   fin
}

var
   p : PUNTO
   q : PUNTO
   a = 0
   b = 0
inicio
   leer (a, b)
   p = nuevo PUNTO (a, b)
   leer (a, b)
   q = nuevo PUNTO (a, b)
   imprimir (str (p.distancia_a (q), 0, 2))
fin`,

    p18: `clase HORA
{
   atributos
      privado
         h = 0
         m = 0
         s = 0

   constructor (a, b, c : numerico)
   inicio
      este.h = a
      este.m = b
      este.s = c
   fin

   metodo dos (n : numerico) retorna cadena
   inicio
      si ( n < 10 )
      {
         retorna ( "0" + str (n, 0, 0) )
      }
      retorna ( str (n, 0, 0) )
   fin

   metodo en_segundos () retorna numerico
   inicio
      retorna ( este.h * 3600 + este.m * 60 + este.s )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.dos (este.h) + ":" + este.dos (este.m) + ":" + este.dos (este.s) )
   fin
}

var
   x : HORA
   a = 0
   b = 0
   c = 0
inicio
   leer (a, b, c)
   x = nuevo HORA (a, b, c)
   imprimir (x, "\\n", x.en_segundos())
fin`,

    p19: `clase ARTICULO
{
   atributos
      privado
         nombre = ""
         precio = 0
         cant = 0

   constructor (n : cadena; p, c : numerico)
   inicio
      este.nombre = n
      este.precio = p
      este.cant = c
   fin

   metodo subtotal () retorna numerico
   inicio
      retorna ( este.precio * este.cant )
   fin
}

var
   v : vector [3] ARTICULO
   k = 0
   n = ""
   p = 0
   c = 0
   total = 0
inicio
   desde k=1 hasta 3
   {
      leer (n, p, c)
      v [k] = nuevo ARTICULO (n, p, c)
   }
   desde k=1 hasta 3
   {
      total = total + v[k].subtotal()
   }
   imprimir (total)
fin`,

    p20: `clase CAJA
{
   atributos
      privado
         contenido = ""

   constructor (x : cadena)
   inicio
      este.contenido = x
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.contenido )
   fin
}

var
   c : CAJA
   x = ""
inicio
   si ( es_nulo (c) )
   {
      imprimir ("vacia\\n")
   }
   leer (x)
   c = nuevo CAJA (x)
   imprimir ("llena: ", c)
fin`,

    p21: `clase NOTA
{
   atributos
      privado
         t = ""

   constructor (x : cadena)
   inicio
      este.t = x
   fin

   metodo escribir (x : cadena)
   inicio
      este.t = x
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.t )
   fin
}

var
   a : NOTA
   b : NOTA
inicio
   a = nuevo NOTA ("hola")
   b = a
   b.escribir ("chau")
   imprimir (a, "\\n")
   si ( id_de (a) == id_de (b) )
   {
      imprimir ("mismo objeto")
   sino
      imprimir ("distintos")
   }
fin`,

    p22: `clase MONEDA
{
   atributos
      privado
         valor = 0

   constructor (v : numerico)
   inicio
      este.valor = v
   fin

   metodo valor_de () retorna numerico
   inicio
      retorna ( este.valor )
   fin

   metodo igual_a (otra : MONEDA) retorna logico
   inicio
      retorna ( este.valor == otra.valor_de() )
   fin
}

var
   a : MONEDA
   b : MONEDA
inicio
   a = nuevo MONEDA (500)
   b = nuevo MONEDA (500)
   si ( a.igual_a (b) )
   {
      imprimir ("igual contenido\\n")
   sino
      imprimir ("distinto contenido\\n")
   }
   si ( id_de (a) == id_de (b) )
   {
      imprimir ("mismo objeto")
   sino
      imprimir ("objetos distintos")
   }
fin`,

    p23: `clase ANIMAL
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ( "..." )
   fin

   metodo presentarse ()
   inicio
      imprimir (este.nombre, ": ", este.sonido(), "\\n")
   fin
}

clase PERRO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Guau" )
   fin
}

clase GATO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Miau" )
   fin
}

var
   a : ANIMAL
   p : PERRO
   g : GATO
inicio
   a = nuevo ANIMAL ("bicho")
   p = nuevo PERRO ("Firulais")
   g = nuevo GATO ("Michi")
   a.presentarse()
   p.presentarse()
   g.presentarse()
fin`,

    p24: `clase VEHICULO
{
   atributos
      protegido
         marca = ""
         ruedas = 0

   constructor (m : cadena; r : numerico)
   inicio
      este.marca = m
      este.ruedas = r
   fin

   metodo describir () retorna cadena
   inicio
      retorna ( este.marca + ", " + str (este.ruedas, 0, 0) + " ruedas" )
   fin
}

clase CAMION hereda de VEHICULO
{
   atributos
      privado
         toneladas = 0

   constructor (m : cadena; r, t : numerico)
   inicio
      padre.constructor (m, r)
      este.toneladas = t
   fin

   metodo describir () retorna cadena
   inicio
      retorna ( padre.describir() + ", " + str (este.toneladas, 0, 0) + " t" )
   fin
}

var
   v : VEHICULO
   c : CAMION
inicio
   v = nuevo VEHICULO ("Ford", 4)
   c = nuevo CAMION ("Scania", 6, 12)
   imprimir (v.describir(), "\\n", c.describir())
fin`,

    p25: `clase PERSONA
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre )
   fin
}

clase ESTUDIANTE hereda de PERSONA
{
   atributos
      privado
         carrera = ""

   constructor (n, c : cadena)
   inicio
      padre.constructor (n)
      este.carrera = c
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( padre.texto() + " (" + este.carrera + ")" )
   fin
}

var
   p : PERSONA
   e : ESTUDIANTE
   n = ""
   c = ""
inicio
   leer (n)
   p = nuevo PERSONA (n)
   leer (n, c)
   e = nuevo ESTUDIANTE (n, c)
   imprimir (p, "\\n", e)
fin`,

    p26: `clase abstracta EMPLEADO
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo abstracto sueldo () retorna numerico

   metodo recibo ()
   inicio
      imprimir (este.nombre, " cobra ", este.sueldo(), "\\n")
   fin
}

clase MENSUAL hereda de EMPLEADO
{
   atributos
      privado
         fijo = 0

   constructor (n : cadena; f : numerico)
   inicio
      padre.constructor (n)
      este.fijo = f
   fin

   metodo sueldo () retorna numerico
   inicio
      retorna ( este.fijo )
   fin
}

clase JORNALERO hereda de EMPLEADO
{
   atributos
      privado
         jornal = 0
         dias = 0

   constructor (n : cadena; j, d : numerico)
   inicio
      padre.constructor (n)
      este.jornal = j
      este.dias = d
   fin

   metodo sueldo () retorna numerico
   inicio
      retorna ( este.jornal * este.dias )
   fin
}

var
   a : MENSUAL
   b : JORNALERO
inicio
   a = nuevo MENSUAL ("Ana", 1500000)
   b = nuevo JORNALERO ("Beto", 90000, 20)
   a.recibo()
   b.recibo()
fin`,

    p27: `clase ANIMAL
{
   atributos
      protegido
         nombre = ""
   constructor (n : cadena)
   inicio
      este.nombre = n
   fin
   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin
   metodo sonido () retorna cadena
   inicio
      retorna ( "..." )
   fin
}

clase PERRO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Guau" )
   fin
}

clase GATO hereda de ANIMAL
{
   metodo sonido () retorna cadena
   inicio
      retorna ( "Miau" )
   fin
}

var
   v : vector [3] ANIMAL
   k = 0
   perros = 0
inicio
   v [1] = nuevo PERRO ("Firulais")
   v [2] = nuevo GATO ("Michi")
   v [3] = nuevo PERRO ("Sultan")
   desde k=1 hasta alen (v)
   {
      imprimir (clase_de (v[k]), " ", v[k].nombre_de(), " ", v[k].sonido(), "\\n")
      si ( v[k] es PERRO )
      {
         perros = perros + 1
      }
   }
   imprimir ("perros: ", perros)
fin`,

    p28: `clase FIGURA
{
}

clase CIRCULO hereda de FIGURA
{
}

clase CUADRADO hereda de FIGURA
{
}

var
   f : FIGURA
inicio
   f = nuevo CIRCULO ()
   imprimir (clase_de (f), "\\n")
   imprimir (ifval (f es CIRCULO, "si", "no"), "\\n")
   imprimir (ifval (f es FIGURA, "si", "no"), "\\n")
   imprimir (ifval (f es CUADRADO, "si", "no"))
fin`,

    p29: `clase CUENTA
{
   atributos
      compartido publico
         ultimo = 1000
      privado
         numero = 0
         duenio = ""

   constructor (n : cadena)
   inicio
      CUENTA.ultimo = CUENTA.ultimo + 1
      este.numero = CUENTA.ultimo
      este.duenio = n
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "cuenta " + str (este.numero, 0, 0) + " de " + este.duenio )
   fin
}

var
   c : CUENTA
   n = 0
   k = 0
   nom = ""
inicio
   leer (n)
   desde k=1 hasta n
   {
      leer (nom)
      c = nuevo CUENTA (nom)
      imprimir (c, "\\n")
   }
   imprimir ("emitidas: ", CUENTA.ultimo - 1000)
fin`,

    p30: `clase MOTOR
{
   atributos
      privado
         cc = 0

   constructor (c : numerico)
   inicio
      este.cc = c
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "motor " + str (este.cc, 0, 1) )
   fin
}

clase AUTO
{
   atributos
      privado
         marca = ""
         m : MOTOR

   constructor (ma : cadena; c : numerico)
   inicio
      este.marca = ma
      este.m = nuevo MOTOR (c)
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.marca + " con " + este.m.texto() )
   fin
}

var
   a : AUTO
   ma = ""
   c = 0
inicio
   leer (ma, c)
   a = nuevo AUTO (ma, c)
   imprimir (a)
fin`,

    p31: `clase SOCIO
{
   atributos
      privado
         nombre = ""
         edad = 0

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo poner_edad (e : numerico)
   inicio
      si ( e >= 0 and e <= 120 )
      {
         este.edad = e
      sino
         imprimir ("edad invalida\\n")
      }
   fin

   metodo edad_de () retorna numerico
   inicio
      retorna ( este.edad )
   fin
}

var
   s : SOCIO
   n = ""
   e = 0
   k = 0
inicio
   leer (n)
   s = nuevo SOCIO (n)
   desde k=1 hasta 3
   {
      leer (e)
      s.poner_edad (e)
      imprimir (s.edad_de(), "\\n")
   }
fin`,

    p32: `clase PILA
{
   atributos
      privado
         v : vector [*] numerico
         tope = 0

   constructor (cap : numerico)
   inicio
      dim (este.v, cap)
   fin

   metodo apilar (n : numerico)
   inicio
      este.tope = este.tope + 1
      este.v [este.tope] = n
   fin

   metodo desapilar () retorna numerico
   var
      x = 0
   inicio
      si ( este.tope == 0 )
      {
         retorna ( -1 )
      }
      x = este.v [este.tope]
      este.tope = este.tope - 1
      retorna ( x )
   fin

   metodo vacia () retorna logico
   inicio
      retorna ( este.tope == 0 )
   fin
}

var
   p : PILA
   cap = 0
   n = 0
inicio
   leer (cap)
   p = nuevo PILA (cap)
   leer (n)
   mientras ( n <> 0 )
   {
      p.apilar (n)
      leer (n)
   }
   mientras ( not p.vacia() )
   {
      imprimir (p.desapilar())
      si ( not p.vacia() )
      {
         imprimir (" ")
      }
   }
fin`,

    p33: `clase COLA
{
   atributos
      privado
         v : vector [*] cadena
         frente = 1
         fondo = 0

   constructor (cap : numerico)
   inicio
      dim (este.v, cap)
   fin

   metodo entrar (n : cadena)
   inicio
      este.fondo = este.fondo + 1
      este.v [este.fondo] = n
   fin

   metodo atender () retorna cadena
   var
      x = ""
   inicio
      si ( este.cuantos() <= 0 )
      {
         retorna ( "" )
      }
      x = este.v [este.frente]
      este.frente = este.frente + 1
      retorna ( x )
   fin

   metodo cuantos () retorna numerico
   inicio
      retorna ( este.fondo - este.frente + 1 )
   fin
}

var
   c : COLA
   n = ""
inicio
   c = nuevo COLA (100)
   leer (n)
   mientras ( n <> "fin" )
   {
      c.entrar (n)
      leer (n)
   }
   mientras ( c.cuantos() > 0 )
   {
      imprimir ("atiendo a ", c.atender(), "\\n")
   }
   imprimir ("quedan ", c.cuantos())
fin`,

    p34: `clase FRACCION
{
   atributos
      privado
         n = 0
         d = 1

   constructor (a, b : numerico)
   var
      g = 0
   inicio
      g = este.mcd (a, b)
      este.n = a / g
      este.d = b / g
   fin

   metodo mcd (a, b : numerico) retorna numerico
   var
      r = 0
   inicio
      mientras ( b <> 0 )
      {
         r = a % b
         a = b
         b = r
      }
      retorna ( abs (a) )
   fin

   metodo num () retorna numerico
   inicio
      retorna ( este.n )
   fin

   metodo den () retorna numerico
   inicio
      retorna ( este.d )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( str (este.n, 0, 0) + "/" + str (este.d, 0, 0) )
   fin

   metodo por (otra : FRACCION) retorna FRACCION
   inicio
      retorna ( nuevo FRACCION (este.n * otra.num(), este.d * otra.den()) )
   fin
}

var
   a : FRACCION
   b : FRACCION
   x = 0
   y = 0
inicio
   leer (x, y)
   a = nuevo FRACCION (x, y)
   leer (x, y)
   b = nuevo FRACCION (x, y)
   imprimir (a, "\\n", b, "\\n", a.por (b))
fin`,

    p35: `clase VEC2
{
   atributos
      privado
         x = 0
         y = 0

   constructor (a, b : numerico)
   inicio
      este.x = a
      este.y = b
   fin

   metodo x_de () retorna numerico
   inicio
      retorna ( este.x )
   fin

   metodo y_de () retorna numerico
   inicio
      retorna ( este.y )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "(" + str (este.x, 0, 0) + "," + str (este.y, 0, 0) + ")" )
   fin

   metodo mas (otro : VEC2) retorna VEC2
   inicio
      retorna ( nuevo VEC2 (este.x + otro.x_de(), este.y + otro.y_de()) )
   fin
}

var
   u : VEC2
   v : VEC2
   a = 0
   b = 0
inicio
   leer (a, b)
   u = nuevo VEC2 (a, b)
   leer (a, b)
   v = nuevo VEC2 (a, b)
   imprimir (u.mas (v), "\\n", u)
fin`,

    p36: `clase SERVIVO
{
   metodo respira () retorna cadena
   inicio
      retorna ( "respiro" )
   fin
}

clase ANIMAL hereda de SERVIVO
{
   metodo moverse () retorna cadena
   inicio
      retorna ( "me muevo" )
   fin
}

clase AVE hereda de ANIMAL
{
   metodo moverse () retorna cadena
   inicio
      retorna ( "vuelo" )
   fin
}

var
   a : AVE
inicio
   a = nuevo AVE ()
   imprimir (a.respira(), "\\n")
   imprimir (a.moverse(), "\\n")
   imprimir (clase_de (a), "\\n")
   imprimir (ifval (a es SERVIVO, "si", "no"))
fin`,

    p37: `clase CONTACTO
{
   atributos
      privado
         nombre = ""
         tel = ""

   constructor (n, t : cadena)
   inicio
      este.nombre = n
      este.tel = t
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " - " + este.tel )
   fin
}

clase AGENDA
{
   atributos
      privado
         v : vector [*] CONTACTO
         cant = 0
         cap = 0

   constructor ()
   inicio
      este.cap = 2
      dim (este.v, este.cap)
   fin

   metodo crecer ()
   var
      nuevo_v : vector [*] CONTACTO
      k = 0
   inicio
      este.cap = este.cap * 2
      dim (nuevo_v, este.cap)
      desde k=1 hasta este.cant
      {
         nuevo_v [k] = este.v [k]
      }
      este.v = nuevo_v
   fin

   metodo agregar (c : CONTACTO)
   inicio
      si ( este.cant == este.cap )
      {
         este.crecer()
      }
      este.cant = este.cant + 1
      este.v [este.cant] = c
   fin

   metodo cuantos () retorna numerico
   inicio
      retorna ( este.cant )
   fin

   metodo en (k : numerico) retorna CONTACTO
   inicio
      retorna ( este.v [k] )
   fin
}

var
   a : AGENDA
   n = ""
   t = ""
   k = 0
   cuantos = 0
inicio
   a = nuevo AGENDA ()
   leer (cuantos)
   desde k=1 hasta cuantos
   {
      leer (n, t)
      a.agregar (nuevo CONTACTO (n, t))
   }
   desde k=1 hasta a.cuantos()
   {
      imprimir (a.en (k), "\\n")
   }
   imprimir ("total ", a.cuantos())
fin`,

    p38: `const
   PI = 3.141592654

clase abstracta CUERPO
{
   metodo abstracto volumen () retorna numerico
   metodo abstracto nombre () retorna cadena

   metodo informe ()
   inicio
      imprimir (este.nombre(), ": ", str (este.volumen(), 0, 2), "\\n")
   fin
}

clase ESFERA hereda de CUERPO
{
   atributos
      privado
         r = 0
   constructor (radio : numerico)
   inicio
      este.r = radio
   fin
   metodo volumen () retorna numerico
   inicio
      retorna ( 4 / 3 * PI * este.r ^ 3 )
   fin
   metodo nombre () retorna cadena
   inicio
      retorna ( "esfera" )
   fin
}

clase CUBO hereda de CUERPO
{
   atributos
      privado
         l = 0
   constructor (lado : numerico)
   inicio
      este.l = lado
   fin
   metodo volumen () retorna numerico
   inicio
      retorna ( este.l ^ 3 )
   fin
   metodo nombre () retorna cadena
   inicio
      retorna ( "cubo" )
   fin
}

clase CILINDRO hereda de CUERPO
{
   atributos
      privado
         r = 0
         h = 0
   constructor (radio, alto : numerico)
   inicio
      este.r = radio
      este.h = alto
   fin
   metodo volumen () retorna numerico
   inicio
      retorna ( PI * este.r ^ 2 * este.h )
   fin
   metodo nombre () retorna cadena
   inicio
      retorna ( "cilindro" )
   fin
}

var
   v : vector [3] CUERPO
   k = 0
   mayor = 0
inicio
   v [1] = nuevo ESFERA (2)
   v [2] = nuevo CUBO (3)
   v [3] = nuevo CILINDRO (1, 5)
   mayor = 1
   desde k=1 hasta alen (v)
   {
      v[k].informe()
      si ( v[k].volumen() > v[mayor].volumen() )
      {
         mayor = k
      }
   }
   imprimir ("el mayor es ", v[mayor].nombre())
fin`,

    p39: `clase CUENTA
{
   atributos
      privado
         titular = ""
         saldo = 0

   constructor (t : cadena; s : numerico)
   inicio
      este.titular = t
      este.saldo = s
   fin

   metodo depositar (m : numerico)
   inicio
      este.saldo = este.saldo + m
   fin

   metodo extraer (m : numerico) retorna logico
   inicio
      si ( m > este.saldo )
      {
         retorna ( FALSE )
      }
      este.saldo = este.saldo - m
      retorna ( TRUE )
   fin

   metodo saldo_de () retorna numerico
   inicio
      retorna ( este.saldo )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.titular + " " + str (este.saldo, 0, 0) )
   fin

   metodo transferir_a (otra : CUENTA; m : numerico)
   inicio
      si ( este.extraer (m) )
      {
         otra.depositar (m)
      sino
         imprimir ("rechazada\\n")
      }
   fin
}

var
   a : CUENTA
   b : CUENTA
   quien = ""
   m = 0
   k = 0
inicio
   a = nuevo CUENTA ("Ana", 1000)
   b = nuevo CUENTA ("Beto", 500)
   desde k=1 hasta 3
   {
      leer (quien, m)
      si ( quien == "A" )
      {
         a.transferir_a (b, m)
      sino
         b.transferir_a (a, m)
      }
   }
   imprimir (a, "\\n", b)
fin`,

    p40: `clase JUGADOR
{
   atributos
      privado
         nombre = ""
         puntos = 0

   constructor (n : cadena; p : numerico)
   inicio
      este.nombre = n
      este.puntos = p
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo puntos_de () retorna numerico
   inicio
      retorna ( este.puntos )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.puntos, 0, 0) )
   fin

   metodo va_antes_que (otro : JUGADOR) retorna logico
   inicio
      si ( este.puntos <> otro.puntos_de() )
      {
         retorna ( este.puntos > otro.puntos_de() )
      }
      retorna ( este.nombre < otro.nombre_de() )
   fin
}

clase TABLA_POS
{
   atributos
      privado
         v : vector [*] JUGADOR
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (j : JUGADOR)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = j
   fin

   metodo ordenar ()
   var
      i = 0
      j = 0
   inicio
      desde i=1 hasta este.cant - 1
      {
         desde j=i+1 hasta este.cant
         {
            si ( este.v[j].va_antes_que (este.v[i]) )
            {
               intercambiar (este.v [i], este.v [j])
            }
         }
      }
   fin

   metodo mostrar ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         imprimir (este.v [k], "\\n")
      }
   fin
}

var
   t : TABLA_POS
   n = 0
   k = 0
   nom = ""
   pts = 0
inicio
   leer (n)
   t = nuevo TABLA_POS (n)
   desde k=1 hasta n
   {
      leer (nom, pts)
      t.agregar (nuevo JUGADOR (nom, pts))
   }
   t.ordenar()
   t.mostrar()
fin`,

    p41: `clase ALUMNO
{
   atributos
      privado
         nombre = ""
         nota = 0

   constructor (n : cadena; x : numerico)
   inicio
      este.nombre = n
      este.nota = x
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " tiene " + str (este.nota, 0, 0) )
   fin
}

clase REGISTRO
{
   atributos
      privado
         v : vector [*] ALUMNO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (a : ALUMNO)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = a
   fin

   metodo buscar (n : cadena) retorna ALUMNO
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         si ( este.v[k].nombre_de() == n )
         {
            retorna ( este.v [k] )
         }
      }
      retorna ( nulo )
   fin
}

var
   r : REGISTRO
   n = 0
   k = 0
   nom = ""
   nota = 0
   hallado : ALUMNO
inicio
   leer (n)
   r = nuevo REGISTRO (n)
   desde k=1 hasta n
   {
      leer (nom, nota)
      r.agregar (nuevo ALUMNO (nom, nota))
   }
   desde k=1 hasta 2
   {
      leer (nom)
      hallado = r.buscar (nom)
      si ( es_nulo (hallado) )
      {
         imprimir ("no esta\\n")
      sino
         imprimir (hallado, "\\n")
      }
   }
fin`,

    p42: `clase ITEM
{
   atributos
      privado
         nombre = ""
         stock = 0
         minimo = 0
         precio = 0

   constructor (n : cadena; s, m, p : numerico)
   inicio
      este.nombre = n
      este.stock = s
      este.minimo = m
      este.precio = p
   fin

   metodo falta () retorna logico
   inicio
      retorna ( este.stock < este.minimo )
   fin

   metodo valor () retorna numerico
   inicio
      retorna ( este.stock * este.precio )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.stock, 0, 0) + "/" + str (este.minimo, 0, 0) )
   fin
}

clase DEPOSITO
{
   atributos
      privado
         v : vector [*] ITEM
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (i : ITEM)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = i
   fin

   metodo alertas ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         si ( este.v[k].falta() )
         {
            imprimir (este.v [k], "\\n")
         }
      }
   fin

   metodo valor_total () retorna numerico
   var
      k = 0
      s = 0
   inicio
      desde k=1 hasta este.cant
      {
         s = s + este.v[k].valor()
      }
      retorna ( s )
   fin
}

var
   d : DEPOSITO
   n = 0
   k = 0
   nom = ""
   s = 0
   m = 0
   p = 0
inicio
   leer (n)
   d = nuevo DEPOSITO (n)
   desde k=1 hasta n
   {
      leer (nom, s, m, p)
      d.agregar (nuevo ITEM (nom, s, m, p))
   }
   d.alertas()
   imprimir ("valor ", d.valor_total())
fin`,

    p43: `clase CALCULADORA
{
   metodo factorial (n : numerico) retorna numerico
   inicio
      si ( n <= 1 )
      {
         retorna ( 1 )
      }
      retorna ( n * este.factorial (n - 1) )
   fin

   metodo fibo (n : numerico) retorna numerico
   inicio
      si ( n <= 2 )
      {
         retorna ( 1 )
      }
      retorna ( este.fibo (n - 1) + este.fibo (n - 2) )
   fin
}

var
   c : CALCULADORA
   n = 0
inicio
   c = nuevo CALCULADORA ()
   leer (n)
   imprimir (c.factorial (n), "\\n", c.fibo (n))
fin`,

    p44: `clase NODO
{
   atributos
      publico
         valor = 0
         sig : NODO

   constructor (v : numerico)
   inicio
      este.valor = v
   fin
}

clase LISTA
{
   atributos
      privado
         primero : NODO

   metodo agregar (n : numerico)
   var
      p : NODO
      nue : NODO
   inicio
      nue = nuevo NODO (n)
      si ( es_nulo (este.primero) )
      {
         este.primero = nue
      sino
         p = este.primero
         mientras ( not es_nulo (p.sig) )
         {
            p = p.sig
         }
         p.sig = nue
      }
   fin

   metodo largo () retorna numerico
   var
      p : NODO
      c = 0
   inicio
      p = este.primero
      mientras ( not es_nulo (p) )
      {
         c = c + 1
         p = p.sig
      }
      retorna ( c )
   fin

   metodo mostrar ()
   var
      p : NODO
   inicio
      p = este.primero
      mientras ( not es_nulo (p) )
      {
         imprimir (p.valor)
         si ( not es_nulo (p.sig) )
         {
            imprimir ("->")
         }
         p = p.sig
      }
   fin
}

var
   l : LISTA
   n = 0
   k = 0
   x = 0
inicio
   l = nuevo LISTA ()
   leer (n)
   desde k=1 hasta n
   {
      leer (x)
      l.agregar (x)
   }
   l.mostrar()
   imprimir ("\\nlargo ", l.largo())
fin`,

    p45: `clase LIBRO
{
   atributos
      privado
         titulo = ""
         prestado = FALSE

   constructor (t : cadena)
   inicio
      este.titulo = t
   fin

   metodo titulo_de () retorna cadena
   inicio
      retorna ( este.titulo )
   fin

   metodo prestar () retorna logico
   inicio
      si ( este.prestado )
      {
         retorna ( FALSE )
      }
      este.prestado = TRUE
      retorna ( TRUE )
   fin

   metodo devolver ()
   inicio
      este.prestado = FALSE
   fin

   metodo texto () retorna cadena
   inicio
      si ( este.prestado )
      {
         retorna ( este.titulo + " (prestado)" )
      }
      retorna ( este.titulo + " (disponible)" )
   fin
}

clase BIBLIOTECA
{
   atributos
      privado
         v : vector [*] LIBRO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (l : LIBRO)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = l
   fin

   metodo buscar (t : cadena) retorna LIBRO
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         si ( este.v[k].titulo_de() == t )
         {
            retorna ( este.v [k] )
         }
      }
      retorna ( nulo )
   fin

   metodo pedir (t : cadena)
   var
      l : LIBRO
   inicio
      l = este.buscar (t)
      si ( es_nulo (l) )
      {
         imprimir ("no tenemos ese libro\\n")
      sino si ( l.prestar() )
         imprimir ("listo\\n")
      sino
         imprimir ("ya prestado\\n")
      }
   fin

   metodo listar ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         imprimir (este.v [k], "\\n")
      }
   fin
}

var
   b : BIBLIOTECA
   n = 0
   k = 0
   t = ""
inicio
   leer (n)
   b = nuevo BIBLIOTECA (n)
   desde k=1 hasta n
   {
      leer (t)
      b.agregar (nuevo LIBRO (t))
   }
   desde k=1 hasta 3
   {
      leer (t)
      b.pedir (t)
   }
   b.listar()
fin`,

    p46: `clase abstracta REPORTE
{
   atributos
      protegido
         v : vector [3] numerico

   constructor (a, b, c : numerico)
   inicio
      este.v [1] = a
      este.v [2] = b
      este.v [3] = c
   fin

   metodo abstracto titulo () retorna cadena
   metodo abstracto detalle ()

   metodo emitir ()
   inicio
      imprimir (este.titulo(), "\\n")
      este.detalle()
      imprimir ("--- fin ---\\n")
   fin
}

clase REPORTE_SUMA hereda de REPORTE
{
   metodo titulo () retorna cadena
   inicio
      retorna ( "SUMA" )
   fin

   metodo detalle ()
   var
      k = 0
      s = 0
   inicio
      desde k=1 hasta 3
      {
         imprimir (este.v [k], "\\n")
         s = s + este.v [k]
      }
      imprimir ("total ", s, "\\n")
   fin
}

clase REPORTE_MAYOR hereda de REPORTE
{
   metodo titulo () retorna cadena
   inicio
      retorna ( "MAYOR" )
   fin

   metodo detalle ()
   var
      k = 0
      m = 0
   inicio
      m = este.v [1]
      desde k=2 hasta 3
      {
         m = max (m, este.v [k])
      }
      imprimir ("el mayor es ", m, "\\n")
   fin
}

var
   a = 0
   b = 0
   c = 0
   r1 : REPORTE_SUMA
   r2 : REPORTE_MAYOR
inicio
   leer (a, b, c)
   r1 = nuevo REPORTE_SUMA (a, b, c)
   r2 = nuevo REPORTE_MAYOR (a, b, c)
   r1.emitir()
   r2.emitir()
fin`,

    p47: `clase abstracta EMPLEADO
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo abstracto sueldo () retorna numerico

   metodo aporte () retorna numerico
   inicio
      retorna ( este.sueldo() * 0.09 )
   fin
}

clase MENSUAL hereda de EMPLEADO
{
   atributos
      privado
         fijo = 0
   constructor (n : cadena; f : numerico)
   inicio
      padre.constructor (n)
      este.fijo = f
   fin
   metodo sueldo () retorna numerico
   inicio
      retorna ( este.fijo )
   fin
}

clase JORNALERO hereda de EMPLEADO
{
   atributos
      privado
         jornal = 0
         dias = 0
   constructor (n : cadena; j, d : numerico)
   inicio
      padre.constructor (n)
      este.jornal = j
      este.dias = d
   fin
   metodo sueldo () retorna numerico
   inicio
      retorna ( este.jornal * este.dias )
   fin
}

clase COMISIONISTA hereda de EMPLEADO
{
   atributos
      privado
         base = 0
         ventas = 0
         porc = 0
   constructor (n : cadena; b, v, p : numerico)
   inicio
      padre.constructor (n)
      este.base = b
      este.ventas = v
      este.porc = p
   fin
   metodo sueldo () retorna numerico
   inicio
      retorna ( este.base + este.ventas * este.porc )
   fin
}

var
   v : vector [3] EMPLEADO
   k = 0
   total = 0
inicio
   v [1] = nuevo MENSUAL ("Ana", 1500000)
   v [2] = nuevo JORNALERO ("Beto", 90000, 20)
   v [3] = nuevo COMISIONISTA ("Ceci", 1000000, 5000000, 0.1)
   desde k=1 hasta alen (v)
   {
      imprimir (v[k].nombre_de(), " ", v[k].sueldo(), " ", v[k].aporte(), "\\n")
      total = total + v[k].sueldo()
   }
   imprimir ("total ", total)
fin`,

    p48: `clase TABLERO
{
   atributos
      privado
         m : matriz [3,3] cadena

   constructor ()
   var
      f = 0
      c = 0
   inicio
      desde f=1 hasta 3
      {
         desde c=1 hasta 3
         {
            este.m [f, c] = "."
         }
      }
   fin

   metodo poner (f, c : numerico; s : cadena) retorna logico
   inicio
      si ( este.m [f, c] <> "." )
      {
         retorna ( FALSE )
      }
      este.m [f, c] = s
      retorna ( TRUE )
   fin

   metodo tres (a, b, c : cadena) retorna logico
   inicio
      retorna ( a <> "." and a == b and b == c )
   fin

   metodo ganador () retorna cadena
   var
      k = 0
   inicio
      desde k=1 hasta 3
      {
         si ( este.tres (este.m[k,1], este.m[k,2], este.m[k,3]) )
         {
            retorna ( este.m [k, 1] )
         }
         si ( este.tres (este.m[1,k], este.m[2,k], este.m[3,k]) )
         {
            retorna ( este.m [1, k] )
         }
      }
      si ( este.tres (este.m[1,1], este.m[2,2], este.m[3,3]) )
      {
         retorna ( este.m [1, 1] )
      }
      si ( este.tres (este.m[1,3], este.m[2,2], este.m[3,1]) )
      {
         retorna ( este.m [1, 3] )
      }
      retorna ( "" )
   fin

   metodo mostrar ()
   var
      f = 0
      c = 0
   inicio
      desde f=1 hasta 3
      {
         desde c=1 hasta 3
         {
            imprimir (este.m [f, c])
         }
         imprimir ("\\n")
      }
   fin
}

var
   t : TABLERO
   k = 0
   f = 0
   c = 0
   s = ""
inicio
   t = nuevo TABLERO ()
   k = 0
   mientras ( k < 5 and t.ganador() == "" )
   {
      leer (f, c, s)
      t.poner (f, c, s)
      k = k + 1
   }
   t.mostrar()
   si ( t.ganador() == "" )
   {
      imprimir ("sin ganador")
   sino
      imprimir ("gana ", t.ganador())
   }
fin`,

    p49: `clase PERSONAJE
{
   atributos
      protegido
         nombre = ""
         vida = 0
         fuerza = 0

   constructor (n : cadena; v, f : numerico)
   inicio
      este.nombre = n
      este.vida = v
      este.fuerza = f
   fin

   metodo nombre_de () retorna cadena
   inicio
      retorna ( este.nombre )
   fin

   metodo vivo () retorna logico
   inicio
      retorna ( este.vida > 0 )
   fin

   metodo recibir (d : numerico)
   inicio
      este.vida = este.vida - d
   fin

   metodo atacar_a (otro : PERSONAJE)
   inicio
      imprimir (este.nombre, " golpea a ", otro.nombre_de(), " por ", este.fuerza, "\\n")
      otro.recibir (este.fuerza)
   fin
}

clase MAGO hereda de PERSONAJE
{
   metodo atacar_a (otro : PERSONAJE)
   inicio
      imprimir (este.nombre, " golpea a ", otro.nombre_de(), " por ", este.fuerza * 2, "\\n")
      otro.recibir (este.fuerza * 2)
      este.vida = este.vida - 5
   fin
}

var
   g : PERSONAJE
   m : MAGO
inicio
   g = nuevo PERSONAJE ("Conan", 100, 20)
   m = nuevo MAGO ("Merlin", 80, 15)
   mientras ( g.vivo() and m.vivo() )
   {
      g.atacar_a (m)
      si ( m.vivo() )
      {
         m.atacar_a (g)
      }
   }
   si ( g.vivo() )
   {
      imprimir ("gana ", g.nombre_de())
   sino
      imprimir ("gana ", m.nombre_de())
   }
fin`,

    p50: `clase abstracta PRODUCTO
{
   atributos
      protegido
         nombre = ""
         precio = 0

   constructor (n : cadena; p : numerico)
   inicio
      este.nombre = n
      este.precio = p
   fin

   metodo abstracto precio_final () retorna numerico

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " " + str (este.precio_final(), 0, 0) )
   fin
}

clase COMIDA hereda de PRODUCTO
{
   metodo precio_final () retorna numerico
   inicio
      retorna ( este.precio )
   fin
}

clase ELECTRO hereda de PRODUCTO
{
   metodo precio_final () retorna numerico
   inicio
      retorna ( este.precio * 1.1 )
   fin
}

clase IMPORTADO hereda de PRODUCTO
{
   metodo precio_final () retorna numerico
   inicio
      retorna ( este.precio * 1.1 + este.precio * 0.15 )
   fin
}

clase CARRITO
{
   atributos
      privado
         v : vector [*] PRODUCTO
         cant = 0

   constructor (tope : numerico)
   inicio
      dim (este.v, tope)
   fin

   metodo agregar (p : PRODUCTO)
   inicio
      este.cant = este.cant + 1
      este.v [este.cant] = p
   fin

   metodo total () retorna numerico
   var
      k = 0
      s = 0
   inicio
      desde k=1 hasta este.cant
      {
         s = s + este.v[k].precio_final()
      }
      retorna ( s )
   fin

   metodo ticket ()
   var
      k = 0
   inicio
      desde k=1 hasta este.cant
      {
         imprimir (este.v [k], "\\n")
      }
      imprimir ("TOTAL ", str (este.total(), 0, 0))
   fin
}

var
   c : CARRITO
   n = 0
   k = 0
   tipo = ""
   nom = ""
   pre = 0
inicio
   leer (n)
   c = nuevo CARRITO (n)
   desde k=1 hasta n
   {
      leer (tipo, nom, pre)
      si ( tipo == "C" )
      {
         c.agregar (nuevo COMIDA (nom, pre))
      sino si ( tipo == "E" )
         c.agregar (nuevo ELECTRO (nom, pre))
      sino
         c.agregar (nuevo IMPORTADO (nom, pre))
      }
   }
   c.ticket()
fin`
  };

  /* Ejemplos listos para explorar en el IDE. */
  const EJEMPLOS = [
    {
      nombre: '1 · Clase y objeto: una cuenta bancaria',
      entrada: '',
      codigo: `/*
   Una CLASE es el molde; un OBJETO es cada cosa construida con ese molde.
   Los atributos son privados: solo los métodos de la clase los tocan.
*/
clase CUENTA
{
   atributos
      privado
         titular = ""
         saldo   = 0

   constructor (nombre : cadena; inicial : numerico)
   inicio
      este.titular = nombre
      este.saldo   = inicial
   fin

   metodo depositar (monto : numerico)
   inicio
      si ( monto > 0 )
      {
         este.saldo = este.saldo + monto
      }
   fin

   metodo extraer (monto : numerico) retorna logico
   inicio
      si ( monto > 0 and monto <= este.saldo )
      {
         este.saldo = este.saldo - monto
         retorna ( TRUE )
      }
      retorna ( FALSE )
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( este.titular + " tiene " + str (este.saldo, 0, 0) )
   fin
}

var
   a : CUENTA
   b : CUENTA
inicio
   a = nuevo CUENTA ("Ana", 1000)
   b = nuevo CUENTA ("Beto", 50)

   a.depositar (500)
   si ( not b.extraer (200) )
   {
      imprimir ("Beto no tiene suficiente\\n")
   }

   imprimir (a, "\\n", b, "\\n")
   imprimir ("\\nDos objetos distintos del mismo molde: ", a <> b)
fin
`
    },
    {
      nombre: '2 · Herencia: la clase madre y sus hijas',
      entrada: '',
      codigo: `/*
   PERRO y GATO heredan de ANIMAL: reciben sus atributos y métodos,
   y cada uno reescribe (sobrescribe) el que necesita cambiar.
*/
clase ANIMAL
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ( "..." )
   fin

   metodo presentarse ()
   inicio
      imprimir (este.nombre, " (", clase_de (este), ") dice ", este.sonido(), "\\n")
   fin
}

clase PERRO hereda de ANIMAL
{
   constructor (n : cadena)
   inicio
      padre.constructor (n)
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ( "guau" )
   fin
}

clase GATO hereda de ANIMAL
{
   constructor (n : cadena)
   inicio
      padre.constructor (n)
   fin

   metodo sonido () retorna cadena
   inicio
      retorna ( "miau" )
   fin
}

var
   bichos : vector [3] ANIMAL
   k = 0
inicio
   bichos [1] = nuevo PERRO ("Fido")
   bichos [2] = nuevo GATO ("Mishi")
   bichos [3] = nuevo ANIMAL ("Ente")

   desde k=1 hasta alen (bichos)
   {
      bichos [k].presentarse()
   }

   imprimir ("\\nUn PERRO es un ANIMAL: ", bichos[1] es ANIMAL)
   imprimir ("\\nUn ANIMAL es un PERRO: ", bichos[3] es PERRO)
fin
`
    },
    {
      nombre: '3 · Polimorfismo con una clase abstracta',
      entrada: '',
      codigo: `/*
   FIGURA es abstracta: define QUE saben hacer sus hijas (area) pero no COMO.
   El ciclo trata a todas por igual; cada objeto responde a su manera.
*/
const
   PI = 3.141592654

clase abstracta FIGURA
{
   metodo abstracto area () retorna numerico

   metodo texto () retorna cadena
   inicio
      retorna ( clase_de (este) + " de area " + str (este.area(), 0, 2) )
   fin
}

clase CIRCULO hereda de FIGURA
{
   atributos privado
      r = 0
   constructor (radio : numerico) inicio este.r = radio fin
   metodo area () retorna numerico inicio retorna ( PI * este.r ^ 2 ) fin
}

clase RECTANGULO hereda de FIGURA
{
   atributos privado
      a = 0
      b = 0
   constructor (x, y : numerico) inicio este.a = x  este.b = y fin
   metodo area () retorna numerico inicio retorna ( este.a * este.b ) fin
}

clase CUADRADO hereda de RECTANGULO
{
   constructor (lado : numerico)
   inicio
      padre.constructor (lado, lado)
   fin
}

var
   fs : vector [4] FIGURA
   k = 0
   total = 0
inicio
   fs [1] = nuevo CIRCULO (2)
   fs [2] = nuevo RECTANGULO (3, 4)
   fs [3] = nuevo CUADRADO (5)
   fs [4] = nuevo CIRCULO (1)

   desde k=1 hasta alen (fs)
   {
      imprimir (fs [k], "\\n")
      total = total + fs [k].area()
   }
   imprimir ("\\nArea total: ", str (total, 0, 2))
fin
`
    },
    {
      nombre: '4 · Referencias: dos nombres, un solo objeto',
      entrada: '',
      codigo: `/*
   Los objetos NO se copian al asignarlos: las dos variables terminan
   apuntando al mismo objeto. Los registros, en cambio, sí se copian.
*/
clase CAJA
{
   atributos publico
      valor = 0

   metodo texto () retorna cadena
   inicio
      retorna ( "caja#" + str (id_de (este), 0, 0) + "=" + str (este.valor, 0, 0) )
   fin
}

tipos
   REG : registro { valor : numerico }

var
   a : CAJA
   b : CAJA
   r : REG
   s : REG
inicio
   a = nuevo CAJA()
   a.valor = 1
   b = a                        // b NO es una copia: es el mismo objeto
   b.valor = 99

   imprimir ("objetos:   a=", a, "  b=", b)
   imprimir ("\\n           a == b es ", a == b, "\\n")

   r.valor = 1
   s = r                        // los registros sí se copian
   s.valor = 99
   imprimir ("\\nregistros: r=", r.valor, "  s=", s.valor)

   b = nuevo CAJA()             // ahora b apunta a otro objeto
   imprimir ("\\n\\ndespues de b = nuevo CAJA(): a == b es ", a == b)
fin
`
    },
    {
      nombre: '5 · Atributos compartidos por toda la clase',
      entrada: '',
      codigo: `/*
   Un atributo "compartido" pertenece a la CLASE, no a cada objeto:
   hay una sola copia y todos los objetos ven la misma.
*/
clase ROBOT
{
   atributos
      compartido publico
         fabricados = 0
      privado
         numero = 0

   constructor ()
   inicio
      ROBOT.fabricados = ROBOT.fabricados + 1
      este.numero = ROBOT.fabricados
   fin

   metodo texto () retorna cadena
   inicio
      retorna ( "robot " + str (este.numero, 0, 0) +
                " (de " + str (ROBOT.fabricados, 0, 0) + " fabricados)" )
   fin
}

var
   k = 0
   r : ROBOT
inicio
   desde k=1 hasta 3
   {
      r = nuevo ROBOT()
      imprimir (r, "\\n")
   }
   imprimir ("\\nTotal fabricados: ", ROBOT.fabricados)
fin
`
    }
  ];

  global.CURSO_POO = { EJERCICIOS, SOLUCIONES, EJEMPLOS };
})(window);

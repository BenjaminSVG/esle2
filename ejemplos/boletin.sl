/*
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

   imprimir ("\n", LINEA)
   imprimir ("\n", relleno ("ALUMNO", 20), "    PROM", "  ESCALA")
   imprimir ("\n", LINEA)

   desde k=1 hasta alen (c)
   {
      imprimir ("\n", relleno (upper (c[k].nombre), 20),
                str (c[k].promedio, 8, 2),
                "  ", c[k].escala)
   }

   imprimir ("\n", LINEA)
   imprimir ("\nCantidad de alumnos : ", alen (c))
   imprimir ("\nPromedio del curso  : ", str (promedio_curso (c), 0, 2))
   imprimir ("\nAprobados           : ", aprobados (c), " de ", alen (c))
   imprimir ("\nMejor promedio      : ", c[1].nombre, " (", str (c[1].promedio, 0, 2), ")")
   imprimir ("\n", LINEA, "\n")
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

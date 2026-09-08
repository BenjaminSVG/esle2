/*
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
      imprimir (curso [k].nombre, ",", curso [k].nota, "\n")
   }
   set_stdout ("")

   /*
      2) Lo leemos de vuelta linea por linea. Con set_ifs("\n") cada
         "campo" es una linea entera.
   */
   imprimir ("Contenido de notas.txt:\n")
   set_stdin ("notas.txt")
   set_ifs ("\n")
   leer (linea)
   mientras ( not eof() )
   {
      inc (cant)
      imprimir ("  ", cant, ": ", linea, "\n")
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

   imprimir ("\nAlumnos: ", k, "   Promedio: ", str (suma / k, 0, 2))
   imprimir ("\n\nAbri el boton \"Archivos...\" para ver notas.txt.")
fin

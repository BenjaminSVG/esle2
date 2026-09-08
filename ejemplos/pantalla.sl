/*
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
   imprimir ("Pantalla de ", lin, " lineas por ", col, " columnas\n")

   /*
      Una barra de progreso dibujada siempre en la misma linea: guardamos
      la posicion del cursor y volvemos a ella en cada paso.
      beep(0, 40) hace una pausa de 40 milisegundos, sin sonido.
   */
   imprimir ("\nProgreso: ")
   get_curpos (lin, col)
   desde k=1 hasta 20
   {
      set_curpos (lin, col)
      imprimir (strdup ("#", k), strdup (".", 20-k), " ", str (k*5, 3, 0), "%")
      beep (0, 40)
   }

   imprimir ("\n\nY ahora, colores:\n")
   set_color (14, 1)
   imprimir ("  Amarillo sobre azul  \n")
   set_color (15, 4)
   imprimir ("  Blanco sobre rojo  \n")

   /*
      get_color() recibe sus dos parametros por referencia, asi que hay
      que pasarle nombres de variables.
   */
   get_color (texto, fondo)
   set_color (11, 1)
   imprimir ("\nUltimos colores usados: texto=", texto, " fondo=", fondo)
   imprimir ("\nEl fondo sigue vigente hasta que se lo cambie o se llame a cls().")

   beep (880, 150)
fin

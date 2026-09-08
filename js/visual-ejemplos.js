/* Programas de ejemplo de ESLE2 Visual. Van de menor a mayor: el primero es
   el «hola mundo» de una ventana y el último ya mezcla controles con dibujo. */
(function (global) {
  'use strict';

  global.VISUAL_EJEMPLOS = [
    {
      nombre: 'Un botón que saluda',
      codigo: `/*
   El programa más chico con ventana:
   1. se abre la ventana, 2. se crean los controles,
   3. se dice quién atiende cada cosa, 4. se espera.
*/
var
   b : numerico
inicio
   ventana ("Saludos", 380, 200)
   etiqueta ("Tocá el botón:", 30, 30)
   b = boton ("Saludar", 30, 60, 120, 34)
   al_hacer_clic (b, "saludar")
   esperar_eventos ()
fin

subrutina saludar (id : numerico)
inicio
   mensaje ("¡Hola desde ESLE2 Visual!")
fin
`
    },
    {
      nombre: 'Sumar dos números',
      codigo: `var
   a, b, res, btn : numerico
inicio
   ventana ("Sumadora", 420, 220)
   etiqueta ("Primer número:", 20, 20)
   a = caja (150, 18, 100, 26)
   etiqueta ("Segundo número:", 20, 54)
   b = caja (150, 52, 100, 26)
   btn = boton ("Sumar", 150, 90, 100, 32)
   res = etiqueta ("", 20, 140, 360, 24)
   al_hacer_clic (btn, "sumar")
   esperar_eventos ()
fin

subrutina sumar (id : numerico)
var
   x, y : numerico
inicio
   x = val (leer_texto (2))
   y = val (leer_texto (4))
   poner_texto (6, "Resultado: " + str (x + y, 0, 2))
fin
`
    },
    {
      nombre: 'Dibujar con el lienzo',
      codigo: `/* Una casita, con las mismas cuentas de siempre. */
var
   l, i : numerico
inicio
   ventana ("Dibujo", 420, 340)
   l = lienzo (20, 20, 360, 260)

   pluma (l, 40, 90, 160)
   grosor (l, 2)
   relleno (l, 240, 220, 180)
   rectangulo (l, 120, 120, 140, 110)

   relleno (l, 180, 70, 60)
   linea (l, 110, 120, 190, 60)
   linea (l, 190, 60, 270, 120)
   linea (l, 110, 120, 270, 120)

   relleno (l, 120, 180, 230)
   rectangulo (l, 150, 150, 40, 35)

   /* el sol, con un ciclo para los rayos */
   pluma (l, 230, 170, 30)
   relleno (l, 250, 220, 90)
   circulo (l, 320, 60, 22)
   desde i = 0 hasta 7
   {
      linea (l, 320 + 28 * cos (i * 0.78), 60 + 28 * sin (i * 0.78),
                320 + 38 * cos (i * 0.78), 60 + 38 * sin (i * 0.78))
   }
   esperar_eventos ()
fin
`
    },
    {
      nombre: 'Lista, casilla y deslizador',
      codigo: `var
   li, cj, d, b, e : numerico
inicio
   ventana ("Controles", 460, 300)
   etiqueta ("Materias:", 20, 16)
   li = lista (20, 40, 180, 110)
   agregar_item (li, "Programación")
   agregar_item (li, "Álgebra")
   agregar_item (li, "Física")

   cj = casilla ("Contar la asistencia", 220, 40)
   etiqueta ("Nota:", 220, 74)
   d = deslizador (220, 96, 200, 24)
   e = etiqueta ("", 220, 130, 220, 22)

   b = boton ("Mostrar", 220, 170, 110, 32)
   al_hacer_clic (b, "mostrar")
   al_cambiar (d, "mostrar")
   esperar_eventos ()
fin

subrutina mostrar (id : numerico)
var
   t = ""
inicio
   t = item_elegido (1) + " — nota " + str (leer_valor (3), 0, 0)
   si ( marcado (2) )
   {
      t = t + " (con asistencia)"
   }
   poner_texto (5, t)
fin
`
    },
    {
      nombre: 'Un contador',
      codigo: `var
   cuenta = 0
   e, mas, menos : numerico
inicio
   ventana ("Contador", 320, 200)
   e = etiqueta ("0", 140, 40, 60, 30)
   menos = boton ("−", 40, 90, 60, 34)
   mas = boton ("+", 200, 90, 60, 34)
   al_hacer_clic (menos, "restar")
   al_hacer_clic (mas, "sumar")
   esperar_eventos ()
fin

subrutina sumar (id : numerico)
inicio
   cuenta = cuenta + 1
   poner_texto (1, str (cuenta, 0, 0))
fin

subrutina restar (id : numerico)
inicio
   cuenta = cuenta - 1
   poner_texto (1, str (cuenta, 0, 0))
fin
`
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

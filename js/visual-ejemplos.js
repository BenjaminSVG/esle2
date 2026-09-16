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
   t = item_elegido (li) + " — nota " + str (leer_valor (d), 0, 0)
   si ( marcado (cj) )
   {
      t = t + " (con asistencia)"
   }
   poner_texto (e, t)
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
,
    {
      nombre: "Ficha de inscripción",
      codigo: `/*
   Un formulario de verdad: elegir de una lista, poner una cantidad,
   validar antes de aceptar y dejar el cursor donde está el problema.
*/
var
   eNom, nom, eMat, mat, eCant, cant, aviso, btn : numerico
inicio
   ventana ("Inscripción", 470, 300)

   eNom = etiqueta ("Tu nombre:", 20, 20)
   nom = caja (150, 18, 290, 26)
   asociar_etiqueta (eNom, nom)

   eMat = etiqueta ("Materia:", 20, 60)
   mat = desplegable (150, 58, 290, 30)
   agregar_item (mat, "Álgebra")
   agregar_item (mat, "Física I")
   agregar_item (mat, "Programación I")
   asociar_etiqueta (eMat, mat)

   eCant = etiqueta ("Créditos:", 20, 104)
   cant = numero (150, 102, 100, 30)
   rango_numero (cant, 1, 6, 1)
   asociar_etiqueta (eCant, cant)

   btn = boton ("Inscribir", 150, 150, 120, 34)
   aviso = etiqueta ("", 20, 200, 430, 44)

   al_hacer_clic (btn, "inscribir")
   esperar_eventos ()
fin

subrutina inscribir (id : numerico)
var
   listo : logico
inicio
   /* Se valida de a un problema por vez y el cursor va al campo que falta:
      así la persona no tiene que adivinar cuál está mal. */
   listo = TRUE

   si (leer_texto (nom) == "")
   {
      poner_texto (aviso, "Falta tu nombre.")
      enfocar (nom)
      listo = FALSE
   }

   si (listo and leer_valor (mat) == 0)
   {
      poner_texto (aviso, "Elegí una materia de la lista.")
      enfocar (mat)
      listo = FALSE
   }

   si (listo)
   {
      poner_texto (aviso, item_elegido (mat) + ", " + str (leer_valor (cant), 0, 0) + " créditos. Anotado.")
   }
fin
`
    },
    {
      nombre: "Calculadora de entradas",
      codigo: `/*
   El total se recalcula solo. No hay botón «calcular»: cada cambio ya
   dispara la cuenta, que es como se comporta un formulario de verdad.
*/
var
   eTipo, tipo, eCant, cant, total : numerico
inicio
   ventana ("Entradas", 440, 220)

   eTipo = etiqueta ("Tipo:", 20, 20)
   tipo = desplegable (130, 18, 280, 30)
   agregar_item (tipo, "General")
   agregar_item (tipo, "Estudiante")
   agregar_item (tipo, "Jubilado")
   asociar_etiqueta (eTipo, tipo)
   poner_valor (tipo, 1)

   eCant = etiqueta ("Cantidad:", 20, 64)
   cant = numero (130, 62, 100, 30)
   rango_numero (cant, 1, 10, 1)
   poner_valor (cant, 1)
   asociar_etiqueta (eCant, cant)

   total = etiqueta ("", 20, 120, 400, 28)

   al_cambiar (tipo, "recalcular")
   al_cambiar (cant, "recalcular")
   recalcular (0)
   esperar_eventos ()
fin

subrutina recalcular (id : numerico)
var
   precio : numerico
inicio
   precio = 25000
   si (leer_valor (tipo) == 2)
   {
      precio = 15000
   }
   si (leer_valor (tipo) == 3)
   {
      precio = 12000
   }
   poner_texto (total, "Total: " + str (precio * leer_valor (cant), 0, 0) + " Gs.")
fin
`
    },
    {
      nombre: "Lista de tareas con confirmación",
      codigo: `/*
   Agregar tareas, y borrarlas preguntando antes. Borrar sin preguntar es
   el error más común de un programa que maneja datos de alguien.
*/
var
   entrada, btnAgregar, btnVaciar, tareas, cuantas : numerico
inicio
   ventana ("Mis tareas", 470, 340)

   entrada = caja (20, 20, 290, 28)
   btnAgregar = boton ("Agregar", 330, 18, 110, 32)
   tareas = lista (20, 64, 420, 160)
   cuantas = etiqueta ("Sin tareas todavía.", 20, 236, 420, 22)
   btnVaciar = boton ("Vaciar todo", 20, 268, 130, 32)

   al_hacer_clic (btnAgregar, "agregar")
   al_hacer_clic (btnVaciar, "vaciar")
   esperar_eventos ()
fin

subrutina agregar (id : numerico)
inicio
   si (leer_texto (entrada) == "")
   {
      poner_texto (cuantas, "Escribí algo antes de agregar.")
      enfocar (entrada)
   sino
      agregar_item (tareas, leer_texto (entrada))
      poner_texto (entrada, "")
      enfocar (entrada)
      contar (0)
   }
fin

subrutina vaciar (id : numerico)
var
   hay : logico
inicio
   hay = cuantos_items (tareas) > 0

   si (not hay)
   {
      poner_texto (cuantas, "No hay nada para borrar.")
   }

   /* Preguntar antes de borrar. Si contesta que no, no pasa nada: eso es
      todo el punto de confirmar (). */
   si (hay and confirmar ("¿Borrar todas las tareas?"))
   {
      limpiar_items (tareas)
      contar (0)
   }
fin

subrutina contar (id : numerico)
inicio
   si (cuantos_items (tareas) == 0)
   {
      poner_texto (cuantas, "Sin tareas todavía.")
   sino
      poner_texto (cuantas, "Tareas anotadas: " + str (cuantos_items (tareas), 0, 0))
   }
fin
`
    },
    {
      nombre: "Cronómetro con pausa",
      codigo: `/*
   El temporizador: algo que pasa solo, sin que nadie toque nada.
   Un mismo botón hace Pausa y Seguir.
*/
var
   t, marcador, btnPausa, btnCero, segundos : numerico
inicio
   ventana ("Cronómetro", 390, 220)

   segundos = 0
   marcador = etiqueta ("0 segundos", 20, 24, 240, 30)

   btnPausa = boton ("Pausa", 20, 80, 110, 34)
   btnCero = boton ("Volver a cero", 150, 80, 150, 34)

   t = temporizador (1000, "pasa_un_segundo")
   activar_temporizador (t, TRUE)

   al_hacer_clic (btnPausa, "pausar")
   al_hacer_clic (btnCero, "a_cero")
   esperar_eventos ()
fin

subrutina pasa_un_segundo (id : numerico)
inicio
   segundos = segundos + 1
   poner_texto (marcador, str (segundos, 0, 0) + " segundos")
fin

subrutina pausar (id : numerico)
inicio
   si (temporizador_andando (t))
   {
      activar_temporizador (t, FALSE)
      poner_texto (btnPausa, "Seguir")
   sino
      activar_temporizador (t, TRUE)
      poner_texto (btnPausa, "Pausa")
   }
fin

subrutina a_cero (id : numerico)
inicio
   segundos = 0
   poner_texto (marcador, "0 segundos")
fin
`
    },
    {
      nombre: "Barra que avanza sola",
      codigo: `/*
   Una tarea larga que muestra cómo va y que se puede cancelar.
   No hay ninguna tarea de verdad: es una simulación, y el programa lo
   dice. Mentirle a quien mira la pantalla también es un error.
*/
var
   barra, texto1, btnIr, btnParar, t : numerico
inicio
   ventana ("Procesando (simulado)", 430, 220)

   texto1 = etiqueta ("Listo para empezar.", 20, 20, 390, 22)
   barra = progreso (20, 54, 390, 24)
   btnIr = boton ("Empezar", 20, 100, 110, 34)
   btnParar = boton ("Cancelar", 150, 100, 110, 34)
   habilitar (btnParar, FALSE)

   t = temporizador (200, "un_paso")

   al_hacer_clic (btnIr, "empezar")
   al_hacer_clic (btnParar, "cancelar")
   esperar_eventos ()
fin

subrutina empezar (id : numerico)
inicio
   poner_valor (barra, 0)
   poner_texto (texto1, "Procesando…")
   habilitar (btnIr, FALSE)
   habilitar (btnParar, TRUE)
   activar_temporizador (t, TRUE)
fin

subrutina un_paso (id : numerico)
inicio
   poner_valor (barra, leer_valor (barra) + 5)
   poner_texto (texto1, "Procesando… " + str (leer_valor (barra), 0, 0) + "%")
   si (leer_valor (barra) >= 100)
   {
      activar_temporizador (t, FALSE)
      poner_texto (texto1, "Terminado.")
      habilitar (btnIr, TRUE)
      habilitar (btnParar, FALSE)
   }
fin

subrutina cancelar (id : numerico)
inicio
   activar_temporizador (t, FALSE)
   poner_texto (texto1, "Cancelado.")
   poner_valor (barra, 0)
   habilitar (btnIr, TRUE)
   habilitar (btnParar, FALSE)
fin
`
    },
    {
      nombre: "Encuesta con gráfico",
      codigo: `/*
   Junta respuestas y las dibuja. Mezcla los controles de formulario con
   el lienzo: el mismo programa pregunta y muestra el resultado.
*/
var
   eOp, op, btn, lz, a, b, c : numerico
inicio
   ventana ("¿Cuándo estudiás?", 490, 400)

   eOp = etiqueta ("Elegí una opción:", 20, 20)
   op = desplegable (20, 46, 240, 30)
   agregar_item (op, "Mañana")
   agregar_item (op, "Tarde")
   agregar_item (op, "Noche")
   asociar_etiqueta (eOp, op)
   poner_valor (op, 1)

   btn = boton ("Votar", 280, 44, 100, 32)
   lz = lienzo (20, 100, 440, 260)

   a = 0
   b = 0
   c = 0

   al_hacer_clic (btn, "votar")
   dibujar_todo ()
   esperar_eventos ()
fin

subrutina votar (id : numerico)
inicio
   si (leer_valor (op) == 1)
   {
      a = a + 1
   }
   si (leer_valor (op) == 2)
   {
      b = b + 1
   }
   si (leer_valor (op) == 3)
   {
      c = c + 1
   }
   dibujar_todo ()
fin

subrutina dibujar_todo ()
inicio
   borrar_lienzo (lz)
   pluma (lz, 40, 40, 40)
   linea (lz, 40, 220, 420, 220)
   texto_en (lz, 60, 240, "Mañana")
   texto_en (lz, 190, 240, "Tarde")
   texto_en (lz, 310, 240, "Noche")
   barra_de (55, a, 70, 130, 210)
   barra_de (185, b, 230, 160, 60)
   barra_de (305, c, 70, 110, 210)
fin

subrutina barra_de (x : numerico, cuanto : numerico, r : numerico, g : numerico, azul : numerico)
var
   alto : numerico
inicio
   alto = cuanto * 20
   si (alto > 190)
   {
      alto = 190
   }
   relleno (lz, r, g, azul)
   rectangulo (lz, x, 220 - alto, 80, alto)
   pluma (lz, 40, 40, 40)
   texto_en (lz, x + 30, 215 - alto, str (cuanto, 0, 0))
fin
`
    }
  ];
})(typeof window !== 'undefined' ? window : globalThis);

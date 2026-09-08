/*
 * Una solución de referencia por cada ejercicio del curso de ESLE2 Visual.
 *
 * No es material para el alumno: existe para que test/test-ejercicios-visual.js
 * pueda demostrar que los 50 ejercicios se pueden resolver y que la corrección
 * automática los da por buenos. Un enunciado que nadie puede aprobar es peor
 * que no tener el ejercicio.
 */
'use strict';

module.exports = {

  /* ------------------------------- FÁCIL -------------------------------- */
  v1: `inicio
   ventana ("Mi primera ventana", 400, 300)
   esperar_eventos ()
fin
`,

  v2: `var
   e = 0
inicio
   ventana ("Etiquetas", 320, 200)
   e = etiqueta ("Hola, mundo!", 20, 20)
   esperar_eventos ()
fin
`,

  v3: `var
   b = 0
inicio
   ventana ("Botones", 320, 200)
   b = boton ("Aceptar", 20, 20, 100, 32)
   esperar_eventos ()
fin
`,

  v4: `inicio
   ventana ("Provisorio", 300, 200)
   titulo_ventana ("Definitivo")
   esperar_eventos ()
fin
`,

  v5: `var
   b = 0
inicio
   ventana ("Saludos", 340, 200)
   b = boton ("Saludar", 30, 60, 120, 34)
   al_hacer_clic (b, "saludar")
   esperar_eventos ()
fin

subrutina saludar (id : numerico)
inicio
   mensaje ("Hola!")
fin
`,

  v6: `var
   e = 0
   b = 0
inicio
   ventana ("Cambiar", 340, 200)
   e = etiqueta ("Todavia nada", 20, 20)
   b = boton ("Cambiar", 20, 60, 110, 32)
   al_hacer_clic (b, "cambiar")
   esperar_eventos ()
fin

subrutina cambiar (id : numerico)
inicio
   poner_texto (e, "Listo!")
fin
`,

  v7: `var
   c = 0
   b = 0
inicio
   ventana ("Saludo", 340, 200)
   c = caja (20, 20, 180, 26)
   b = boton ("Saludar", 20, 60, 110, 32)
   al_hacer_clic (b, "saludar")
   esperar_eventos ()
fin

subrutina saludar (id : numerico)
inicio
   mensaje ("Hola, " + leer_texto (c) + "!")
fin
`,

  v8: `var
   e = 0
   b1 = 0
   b2 = 0
inicio
   ventana ("Colores", 340, 200)
   e = etiqueta ("nada", 20, 20)
   b1 = boton ("Rojo", 20, 60, 90, 30)
   b2 = boton ("Azul", 120, 60, 90, 30)
   al_hacer_clic (b1, "poner_rojo")
   al_hacer_clic (b2, "poner_azul")
   esperar_eventos ()
fin

subrutina poner_rojo (id : numerico)
inicio
   poner_texto (e, "rojo")
fin

subrutina poner_azul (id : numerico)
inicio
   poner_texto (e, "azul")
fin
`,

  v9: `var
   e = 0
   n = 0
inicio
   ventana ("Contador", 320, 200)
   n = 0
   e = etiqueta ("0", 20, 20)
   al_hacer_clic (boton ("+1", 20, 60, 80, 30), "sumar")
   esperar_eventos ()
fin

subrutina sumar (id : numerico)
inicio
   n = n + 1
   poner_texto (e, str (n, 0, 0))
fin
`,

  v10: `var
   k = 0
   e = 0
inicio
   ventana ("Mostrar y esconder", 340, 200)
   k = casilla ("Ver el mensaje", 20, 20)
   e = etiqueta ("Secreto", 20, 60)
   al_cambiar (k, "revisar")
   esperar_eventos ()
fin

subrutina revisar (id : numerico)
inicio
   visible (e, marcado (k))
fin
`,

  v11: `var
   k = 0
   b = 0
inicio
   ventana ("Terminos", 340, 200)
   k = casilla ("Acepto", 20, 20)
   b = boton ("Continuar", 20, 60, 110, 32)
   habilitar (b, FALSE)
   al_cambiar (k, "revisar")
   esperar_eventos ()
fin

subrutina revisar (id : numerico)
inicio
   habilitar (b, marcado (k))
fin
`,

  v12: `var
   e = 0
   x = 0
inicio
   ventana ("Mover", 400, 200)
   x = 20
   e = etiqueta ("Aca voy", x, 20)
   al_hacer_clic (boton ("Derecha", 20, 80, 100, 30), "correr")
   esperar_eventos ()
fin

subrutina correr (id : numerico)
inicio
   x = x + 20
   mover (e, x, 20)
fin
`,

  v13: `var
   li = 0
inicio
   ventana ("Dias", 340, 220)
   li = lista (20, 20, 160, 110)
   agregar_item (li, "lunes")
   agregar_item (li, "martes")
   agregar_item (li, "miercoles")
   esperar_eventos ()
fin
`,

  v14: `var
   li = 0
   e = 0
inicio
   ventana ("Dias", 380, 220)
   li = lista (20, 20, 160, 110)
   agregar_item (li, "lunes")
   agregar_item (li, "martes")
   agregar_item (li, "miercoles")
   e = etiqueta ("Elegi un dia", 200, 20)
   al_cambiar (li, "elegir")
   esperar_eventos ()
fin

subrutina elegir (id : numerico)
inicio
   poner_texto (e, "Elegiste " + item_elegido (li))
fin
`,

  v15: `var
   d = 0
   e = 0
inicio
   ventana ("Volumen", 340, 200)
   d = deslizador (20, 60, 200, 24)
   e = etiqueta ("0", 20, 20)
   al_cambiar (d, "mostrar")
   esperar_eventos ()
fin

subrutina mostrar (id : numerico)
inicio
   poner_texto (e, str (leer_valor (d), 0, 0))
fin
`,

  v16: `var
   e = 0
inicio
   ventana ("Aviso", 320, 160)
   e = etiqueta ("Atencion", 20, 20, 160, 30)
   color_fondo (e, 255, 220, 0)
   color_texto (e, 0, 0, 0)
   esperar_eventos ()
fin
`,

  v17: `var
   l = 0
inicio
   ventana ("Dibujo", 340, 240)
   l = lienzo (10, 10, 300, 200)
   pluma (l, 0, 0, 255)
   linea (l, 0, 0, 300, 200)
   esperar_eventos ()
fin
`,

  v18: `var
   l = 0
inicio
   ventana ("Dibujo", 340, 240)
   l = lienzo (10, 10, 300, 200)
   relleno (l, 0, 160, 0)
   rectangulo (l, 20, 20, 120, 80)
   esperar_eventos ()
fin
`,

  v19: `var
   l = 0
inicio
   ventana ("Dibujo", 340, 240)
   l = lienzo (10, 10, 300, 200)
   circulo (l, 150, 100, 60)
   esperar_eventos ()
fin
`,

  v20: `var
   l = 0
inicio
   ventana ("Dibujo", 340, 240)
   l = lienzo (10, 10, 300, 200)
   texto_en (l, 30, 40, "ESLE2")
   esperar_eventos ()
fin
`,

  /* ------------------------------- MEDIO -------------------------------- */
  v21: `var
   c1 = 0
   c2 = 0
   e = 0
inicio
   ventana ("Sumadora", 360, 220)
   c1 = caja (20, 20, 100, 26)
   c2 = caja (140, 20, 100, 26)
   e = etiqueta ("0", 20, 110)
   al_hacer_clic (boton ("Sumar", 20, 60, 100, 32), "sumar")
   esperar_eventos ()
fin

subrutina sumar (id : numerico)
inicio
   poner_texto (e, str (val (leer_texto (c1)) + val (leer_texto (c2)), 0, 0))
fin
`,

  v22: `var
   c = 0
   e = 0
inicio
   ventana ("Temperatura", 360, 200)
   c = caja (20, 20, 100, 26)
   e = etiqueta ("0.00", 20, 100)
   al_hacer_clic (boton ("Convertir", 20, 56, 120, 32), "convertir")
   esperar_eventos ()
fin

subrutina convertir (id : numerico)
var
   f = 0
inicio
   f = val (leer_texto (c)) * 9 / 5 + 32
   poner_texto (e, str (f, 0, 2))
fin
`,

  v23: `var
   cb = 0
   ch = 0
   e = 0
inicio
   ventana ("Area", 360, 220)
   cb = caja (20, 20, 100, 26)
   ch = caja (140, 20, 100, 26)
   e = etiqueta ("Area: 0", 20, 110)
   al_hacer_clic (boton ("Calcular", 20, 60, 110, 32), "calcular")
   esperar_eventos ()
fin

subrutina calcular (id : numerico)
inicio
   poner_texto (e, "Area: " + str (val (leer_texto (cb)) * val (leer_texto (ch)), 0, 0))
fin
`,

  v24: `var
   e = 0
   n = 0
inicio
   ventana ("Contador", 320, 200)
   n = 0
   e = etiqueta ("0", 20, 20)
   al_hacer_clic (boton ("-", 20, 60, 60, 30), "bajar")
   al_hacer_clic (boton ("+", 100, 60, 60, 30), "subir")
   esperar_eventos ()
fin

subrutina bajar (id : numerico)
inicio
   si ( n > 0 )
   {
      n = n - 1
   }
   poner_texto (e, str (n, 0, 0))
fin

subrutina subir (id : numerico)
inicio
   si ( n < 5 )
   {
      n = n + 1
   }
   poner_texto (e, str (n, 0, 0))
fin
`,

  v25: `var
   luz = 0
inicio
   ventana ("Semaforo", 360, 240)
   luz = etiqueta ("", 20, 20, 120, 120)
   al_hacer_clic (boton ("Rojo", 160, 20, 120, 30), "rojo")
   al_hacer_clic (boton ("Amarillo", 160, 60, 120, 30), "amarillo")
   al_hacer_clic (boton ("Verde", 160, 100, 120, 30), "verde")
   esperar_eventos ()
fin

subrutina rojo (id : numerico)
inicio
   color_fondo (luz, 220, 0, 0)
fin

subrutina amarillo (id : numerico)
inicio
   color_fondo (luz, 240, 200, 0)
fin

subrutina verde (id : numerico)
inicio
   color_fondo (luz, 0, 170, 0)
fin
`,

  v26: `var
   c = 0
   li = 0
inicio
   ventana ("Tareas", 380, 260)
   c = caja (20, 20, 180, 26)
   li = lista (20, 60, 240, 150)
   al_hacer_clic (boton ("Agregar", 210, 20, 100, 28), "agregar")
   esperar_eventos ()
fin

subrutina agregar (id : numerico)
inicio
   agregar_item (li, leer_texto (c))
   poner_texto (c, "")
fin
`,

  v27: `var
   li = 0
inicio
   ventana ("Vaciar", 340, 260)
   li = lista (20, 20, 160, 120)
   agregar_item (li, "uno")
   agregar_item (li, "dos")
   agregar_item (li, "tres")
   al_hacer_clic (boton ("Vaciar", 200, 20, 100, 30), "vaciar")
   esperar_eventos ()
fin

subrutina vaciar (id : numerico)
inicio
   limpiar_items (li)
fin
`,

  v28: `var
   c = 0
inicio
   ventana ("Guardar", 360, 200)
   c = caja (20, 20, 180, 26)
   al_hacer_clic (boton ("Guardar", 20, 60, 110, 32), "guardar")
   esperar_eventos ()
fin

subrutina guardar (id : numerico)
inicio
   si ( leer_texto (c) == "" )
   {
      mensaje ("Escribi algo primero")
   sino
      mensaje ("Guardado: " + leer_texto (c))
   }
fin
`,

  v29: `var
   d = 0
   e = 0
inicio
   ventana ("Tamano", 360, 220)
   e = etiqueta ("Se agranda", 20, 20, 50, 22)
   d = deslizador (20, 80, 200, 24)
   al_cambiar (d, "estirar")
   esperar_eventos ()
fin

subrutina estirar (id : numerico)
inicio
   redimensionar (e, 50 + leer_valor (d), 22)
fin
`,

  v30: `var
   dr = 0
   dv = 0
   da = 0
   e = 0
inicio
   ventana ("Mezclador", 400, 260)
   e = etiqueta ("", 20, 20, 160, 90)
   dr = deslizador (20, 130, 200, 24)
   dv = deslizador (20, 165, 200, 24)
   da = deslizador (20, 200, 200, 24)
   al_cambiar (dr, "pintar")
   al_cambiar (dv, "pintar")
   al_cambiar (da, "pintar")
   esperar_eventos ()
fin

subrutina pintar (id : numerico)
inicio
   color_fondo (e, leer_valor (dr), leer_valor (dv), leer_valor (da))
fin
`,

  v31: `var
   c = 0
inicio
   ventana ("Entrar", 340, 200)
   c = caja (20, 20, 180, 26)
   al_hacer_clic (boton ("Entrar", 20, 60, 100, 32), "entrar")
   esperar_eventos ()
fin

subrutina entrar (id : numerico)
inicio
   si ( leer_texto (c) == "esle2" )
   {
      mensaje ("Bienvenido")
   sino
      mensaje ("Contrasenia incorrecta")
   }
fin
`,

  v32: `var
   c = 0
   e = 0
inicio
   ventana ("Par o impar", 340, 200)
   c = caja (20, 20, 120, 26)
   e = etiqueta ("?", 20, 100)
   al_hacer_clic (boton ("Revisar", 20, 60, 110, 32), "revisar")
   esperar_eventos ()
fin

subrutina revisar (id : numerico)
inicio
   si ( val (leer_texto (c)) % 2 == 0 )
   {
      poner_texto (e, "par")
   sino
      poner_texto (e, "impar")
   }
fin
`,

  v33: `var
   c = 0
   li = 0
inicio
   ventana ("Tabla", 380, 300)
   c = caja (20, 20, 100, 26)
   li = lista (20, 90, 200, 180)
   al_hacer_clic (boton ("Ver la tabla", 130, 20, 120, 28), "tabla")
   esperar_eventos ()
fin

subrutina tabla (id : numerico)
var
   k = 0
   n = 0
inicio
   n = val (leer_texto (c))
   limpiar_items (li)
   desde k=1 hasta 10
   {
      agregar_item (li, str (n, 0, 0) + " x " + str (k, 0, 0) + " = " + str (n * k, 0, 0))
   }
fin
`,

  v34: `var
   l = 0
inicio
   ventana ("Bandera", 340, 220)
   l = lienzo (10, 10, 300, 180)
   relleno (l, 213, 43, 30)
   rectangulo (l, 0, 0, 300, 60)
   relleno (l, 255, 255, 255)
   rectangulo (l, 0, 60, 300, 60)
   relleno (l, 0, 56, 168)
   rectangulo (l, 0, 120, 300, 60)
   esperar_eventos ()
fin
`,

  v35: `var
   l = 0
inicio
   ventana ("La casa", 340, 240)
   l = lienzo (10, 10, 300, 200)
   rectangulo (l, 60, 90, 160, 100)
   rectangulo (l, 120, 140, 40, 50)
   linea (l, 50, 90, 140, 30)
   linea (l, 140, 30, 230, 90)
   esperar_eventos ()
fin
`,

  v36: `var
   l = 0
   k = 0
inicio
   ventana ("Escalera", 340, 240)
   l = lienzo (10, 10, 300, 200)
   desde k=0 hasta 5
   {
      rectangulo (l, k * 40, 160 - k * 25, 40, 25)
   }
   esperar_eventos ()
fin
`,

  v37: `var
   l = 0
   k = 0
   v : vector [5] numerico
inicio
   ventana ("Barras", 340, 240)
   l = lienzo (10, 10, 300, 200)
   v[1] = 30
   v[2] = 80
   v[3] = 45
   v[4] = 120
   v[5] = 60
   desde k=1 hasta 5
   {
      rectangulo (l, (k - 1) * 55 + 10, 180 - v[k], 40, v[k])
   }
   esperar_eventos ()
fin
`,

  v38: `var
   d = 0
   l = 0
inicio
   ventana ("Termometro", 360, 220)
   l = lienzo (20, 20, 300, 100)
   d = deslizador (20, 140, 200, 24)
   al_cambiar (d, "pintar")
   esperar_eventos ()
fin

subrutina pintar (id : numerico)
inicio
   borrar_lienzo (l)
   rectangulo (l, 10, 10, leer_valor (d) * 2, 30)
fin
`,

  /* ------------------------------ AVANZADO ------------------------------ */
  v39: `var
   l = 0
   f = 0
   c = 0
inicio
   ventana ("Ajedrez", 280, 280)
   l = lienzo (20, 20, 240, 240)
   desde f=0 hasta 7
   {
      desde c=0 hasta 7
      {
         si ( (f + c) % 2 == 0 )
         {
            relleno (l, 240, 240, 240)
         sino
            relleno (l, 60, 60, 60)
         }
         rectangulo (l, c * 30, f * 30, 30, 30)
      }
   }
   esperar_eventos ()
fin
`,

  v40: `var
   l = 0
   k = 0
inicio
   ventana ("Parabola", 340, 240)
   l = lienzo (10, 10, 300, 200)
   desde k=-10 hasta 9
   {
      linea (l, 150 + k * 15, 190 - k * k, 150 + (k + 1) * 15, 190 - (k + 1) * (k + 1))
   }
   esperar_eventos ()
fin
`,

  v41: `const
   PI = 3.141592654
var
   c = 0
   l = 0
   k = 0
   n = 0
inicio
   ventana ("Poligono", 400, 300)
   c = caja (20, 20, 60, 26)
   l = lienzo (100, 20, 240, 240)
   al_hacer_clic (boton ("Dibujar", 20, 60, 70, 28), "dibujar")
   esperar_eventos ()
fin

subrutina dibujar (id : numerico)
inicio
   n = val (leer_texto (c))
   borrar_lienzo (l)
   desde k=0 hasta n - 1
   {
      linea (l, 120 + 100 * cos (2 * PI * k / n), 120 + 100 * sin (2 * PI * k / n),
                120 + 100 * cos (2 * PI * (k + 1) / n), 120 + 100 * sin (2 * PI * (k + 1) / n))
   }
fin
`,

  v42: `var
   l = 0
   k = 0
inicio
   ventana ("Espiral", 280, 280)
   l = lienzo (20, 20, 240, 240)
   desde k=0 hasta 360
   {
      punto (l, 120 + (k / 4) * cos (k / 20), 120 + (k / 4) * sin (k / 20))
   }
   esperar_eventos ()
fin
`,

  v43: `var
   li = 0
   e = 0
   total = 0
   nom : vector [3] cadena
   pre : vector [3] numerico
inicio
   ventana ("Carrito", 400, 260)
   li = lista (20, 20, 160, 110)
   e = etiqueta ("Total: 0", 200, 20)
   total = 0
   nom[1] = "pan"
   nom[2] = "leche"
   nom[3] = "queso"
   pre[1] = 5000
   pre[2] = 7500
   pre[3] = 12000
   agregar_item (li, nom[1])
   agregar_item (li, nom[2])
   agregar_item (li, nom[3])
   al_hacer_clic (boton ("Agregar", 200, 60, 110, 30), "agregar")
   esperar_eventos ()
fin

subrutina agregar (id : numerico)
var
   k = 0
inicio
   desde k=1 hasta 3
   {
      si ( nom[k] == item_elegido (li) )
      {
         total = total + pre[k]
      }
   }
   poner_texto (e, "Total: " + str (total, 0, 0))
fin
`,

  v44: `var
   c = 0
   li = 0
   v : vector [5] cadena
inicio
   ventana ("Buscador", 380, 280)
   c = caja (20, 20, 200, 26)
   li = lista (20, 60, 200, 180)
   v[1] = "maria"
   v[2] = "marcos"
   v[3] = "ana"
   v[4] = "luis"
   v[5] = "marta"
   al_escribir (c, "buscar")
   esperar_eventos ()
fin

subrutina buscar (id : numerico)
var
   k = 0
   t = ""
inicio
   t = leer_texto (c)
   limpiar_items (li)
   desde k=1 hasta 5
   {
      si ( substr (v[k], 1, strlen (t)) == t )
      {
         agregar_item (li, v[k])
      }
   }
fin
`,

  v45: `var
   l = 0
   k = 0
   votos : vector [3] numerico
inicio
   ventana ("Encuesta", 400, 280)
   l = lienzo (20, 90, 240, 160)
   votos[1] = 0
   votos[2] = 0
   votos[3] = 0
   al_hacer_clic (boton ("Perro", 20, 20, 100, 30), "perro")
   al_hacer_clic (boton ("Gato", 140, 20, 100, 30), "gato")
   al_hacer_clic (boton ("Pez", 260, 20, 100, 30), "pez")
   esperar_eventos ()
fin

subrutina perro (id : numerico)
inicio
   votos[1] = votos[1] + 1
   redibujar ()
fin

subrutina gato (id : numerico)
inicio
   votos[2] = votos[2] + 1
   redibujar ()
fin

subrutina pez (id : numerico)
inicio
   votos[3] = votos[3] + 1
   redibujar ()
fin

subrutina redibujar ()
inicio
   borrar_lienzo (l)
   desde k=0 hasta 2
   {
      rectangulo (l, k * 70 + 20, 150 - votos[k + 1] * 20, 50, votos[k + 1] * 20)
   }
fin
`,

  v46: `var
   c1 = 0
   c2 = 0
   li = 0
   e = 0
inicio
   ventana ("Calculadora", 420, 260)
   c1 = caja (20, 20, 100, 26)
   c2 = caja (140, 20, 100, 26)
   li = lista (20, 60, 100, 110)
   e = etiqueta ("0.00", 140, 60, 240, 24)
   agregar_item (li, "+")
   agregar_item (li, "-")
   agregar_item (li, "*")
   agregar_item (li, "/")
   al_hacer_clic (boton ("=", 140, 100, 60, 30), "calcular")
   esperar_eventos ()
fin

subrutina calcular (id : numerico)
var
   a = 0
   b = 0
   op = ""
inicio
   op = item_elegido (li)
   a = val (leer_texto (c1))
   b = val (leer_texto (c2))
   si ( op == "" )
   {
      poner_texto (e, "Elegi una operacion")
   sino si ( op == "/" and b == 0 )
      poner_texto (e, "No se puede dividir por cero")
   sino si ( op == "+" )
      poner_texto (e, str (a + b, 0, 2))
   sino si ( op == "-" )
      poner_texto (e, str (a - b, 0, 2))
   sino si ( op == "*" )
      poner_texto (e, str (a * b, 0, 2))
   sino
      poner_texto (e, str (a / b, 0, 2))
   }
fin
`,

  v47: `var
   cn = 0
   ce = 0
   k = 0
inicio
   ventana ("Inscripcion", 400, 260)
   cn = caja (20, 20, 200, 26)
   ce = caja (20, 60, 80, 26)
   k = casilla ("Acepto", 20, 100)
   al_hacer_clic (boton ("Inscribir", 20, 140, 120, 32), "inscribir")
   esperar_eventos ()
fin

subrutina inscribir (id : numerico)
inicio
   si ( leer_texto (cn) == "" )
   {
      mensaje ("Falta el nombre")
   sino si ( val (leer_texto (ce)) < 18 )
      mensaje ("Tenes que ser mayor de edad")
   sino si ( marcado (k) == FALSE )
      mensaje ("Falta aceptar")
   sino
      mensaje ("Inscripto: " + leer_texto (cn))
   }
fin
`,

  v48: `var
   l = 0
inicio
   ventana ("Pixeles", 260, 260)
   l = lienzo (20, 20, 200, 200)
   al_hacer_clic (l, "pintar")
   esperar_eventos ()
fin

subrutina pintar (id : numerico)
inicio
   relleno (l, 0, 0, 0)
   rectangulo (l, int (raton_x () / 20) * 20, int (raton_y () / 20) * 20, 20, 20)
fin
`,

  v49: `var
   l = 0
   d = 0
   cr = 0
   cg = 0
   cb = 0
inicio
   ventana ("Mini paint", 420, 300)
   l = lienzo (20, 20, 240, 200)
   d = deslizador (20, 240, 200, 24)
   cr = 0
   cg = 0
   cb = 0
   al_hacer_clic (l, "pintar")
   al_hacer_clic (boton ("Negro", 280, 20, 100, 28), "negro")
   al_hacer_clic (boton ("Verde", 280, 60, 100, 28), "verde")
   al_hacer_clic (boton ("Rojo", 280, 100, 100, 28), "rojo")
   esperar_eventos ()
fin

subrutina negro (id : numerico)
inicio
   cr = 0
   cg = 0
   cb = 0
fin

subrutina verde (id : numerico)
inicio
   cr = 0
   cg = 160
   cb = 0
fin

subrutina rojo (id : numerico)
inicio
   cr = 220
   cg = 0
   cb = 0
fin

subrutina pintar (id : numerico)
var
   r = 0
inicio
   r = leer_valor (d)
   si ( r == 0 )
   {
      r = 5
   }
   relleno (l, cr, cg, cb)
   pluma (l, cr, cg, cb)
   circulo (l, raton_x (), raton_y (), r)
fin
`,

  v50: `var
   e = 0
   b = 0
   p = 0
inicio
   ventana ("Tocame", 320, 220)
   p = 0
   e = etiqueta ("0", 20, 10)
   b = boton ("Tocame", 20, 40, 90, 30)
   al_hacer_clic (b, "tocar")
   esperar_eventos ()
fin

subrutina tocar (id : numerico)
inicio
   p = p + 1
   poner_texto (e, str (p, 0, 0))
   mover (b, 20 + (p * 37) % 200, 40 + (p * 53) % 120)
   si ( p >= 5 )
   {
      mensaje ("Ganaste!")
      habilitar (b, FALSE)
   }
fin
`
};

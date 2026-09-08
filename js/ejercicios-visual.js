/* Curso de ESLE2 Visual: 50 ejercicios con corrección automática.
 *
 * A diferencia del curso normal, acá no se compara texto: cada prueba abre el
 * programa con el backend de mentira, le da los toques que daría una persona
 * («clic en el primer botón», «escribí Ana en la primera caja») y después
 * revisa la ventana que quedó. El motor está en js/verificar-visual.js y ahí
 * está explicado el formato de `pasos` y `espera`.
 *
 * Los controles se cuentan por tipo y orden de creación, así que dos
 * soluciones que creen lo mismo en distinto orden de líneas valen igual.
 */
(function (global) {
  'use strict';

  const EJERCICIOS = [

    /* =================================================================== */
    /* FÁCIL — la ventana, los controles y el primer evento                */
    /* =================================================================== */
    {
      id: 'v1', nivel: 'facil', titulo: 'Tu primera ventana',
      enunciado: 'Abrí una ventana titulada <code>Mi primera ventana</code> de <strong>400</strong> de ancho por <strong>300</strong> de alto, y dejá el programa esperando.',
      pista: 'Todo programa visual tiene la misma forma: <code>ventana (...)</code> primero y <code>esperar_eventos ()</code> al final. Sin esa última línea el programa llega al <code>fin</code> y la ventana se cierra enseguida.',
      plantilla: 'inicio\n   // abrí la ventana acá\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'La ventana se abre con el título y el tamaño pedidos',
        espera: [['ventana', { titulo: 'Mi primera ventana', ancho: 400, alto: 300 }]]
      }]
    },
    {
      id: 'v2', nivel: 'facil', titulo: 'Una etiqueta',
      enunciado: 'En una ventana <code>Etiquetas</code> de 320 × 200, poné una etiqueta que diga <code>Hola, mundo!</code> en la posición <strong>x = 20, y = 20</strong>.',
      pista: 'Una etiqueta es un texto que el programa dibuja y la persona no puede cambiar: <code>etiqueta ("texto", x, y)</code>. El <code>0,0</code> está arriba a la izquierda y la <code>y</code> crece hacia abajo.',
      plantilla: 'inicio\n   ventana ("Etiquetas", 320, 200)\n   // poné la etiqueta acá\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Hay una etiqueta con ese texto y en ese lugar',
        espera: [['ventana', { titulo: 'Etiquetas' }], ['hay', 'etiqueta', 1],
          ['texto', 'etiqueta', 0, 'Hola, mundo!'], ['posicion', 'etiqueta', 0, 20, 20]]
      }]
    },
    {
      id: 'v3', nivel: 'facil', titulo: 'Un botón',
      enunciado: 'En una ventana <code>Botones</code> de 320 × 200, poné un botón que diga <code>Aceptar</code> en <strong>x = 20, y = 20</strong>, de <strong>100</strong> de ancho por <strong>32</strong> de alto.',
      pista: '<code>boton ("texto", x, y, ancho, alto)</code>. Si no ponés ancho y alto, el botón toma el tamaño de siempre; acá el ejercicio los pide.',
      plantilla: 'inicio\n   ventana ("Botones", 320, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'El botón está donde se pidió y mide lo que se pidió',
        espera: [['hay', 'boton', 1], ['texto', 'boton', 0, 'Aceptar'],
          ['posicion', 'boton', 0, 20, 20], ['tamano', 'boton', 0, 100, 32]]
      }]
    },
    {
      id: 'v4', nivel: 'facil', titulo: 'Cambiarle el título a la ventana',
      enunciado: 'Abrí la ventana con el título <code>Provisorio</code> (300 × 200) y, en la línea siguiente, cambiale el título a <code>Definitivo</code> sin volver a llamar a <code>ventana()</code>.',
      pista: '<code>titulo_ventana ("texto")</code> cambia el título de la ventana que ya está abierta. Sirve, por ejemplo, para mostrar el nombre del archivo abierto.',
      plantilla: 'inicio\n   ventana ("Provisorio", 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'La ventana termina llamándose Definitivo',
        espera: [['ventana', { titulo: 'Definitivo' }]]
      }]
    },
    {
      id: 'v5', nivel: 'facil', titulo: 'El botón que saluda',
      enunciado: 'Ventana <code>Saludos</code> de 340 × 200 con un botón <code>Saludar</code> en (30, 60) de 120 × 34. Cuando se lo toca tiene que aparecer el mensaje <code>Hola!</code>.',
      pista: 'Son dos pasos: <code>al_hacer_clic (b, "saludar")</code> anota qué subrutina atiende el clic, y esa subrutina se define aparte con <code>subrutina saludar (id : numerico)</code>. El nombre va entre comillas.',
      plantilla: 'var\n   b = 0\ninicio\n   ventana ("Saludos", 340, 200)\n   b = boton ("Saludar", 30, 60, 120, 34)\n   // registrá el clic acá\n\n   esperar_eventos ()\nfin\n\nsubrutina saludar (id : numerico)\ninicio\n   // mostrá el mensaje\nfin\n',
      pruebas: [
        { nombre: 'Sin tocar nada todavía no salió ningún mensaje', espera: [['mensajes', []]] },
        {
          nombre: 'Al tocar el botón aparece el saludo',
          pasos: [['clic', 'boton', 0]], espera: [['mensajes', ['Hola!']]]
        },
        {
          nombre: 'Dos clics, dos saludos',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Hola!', 'Hola!']]]
        }
      ]
    },
    {
      id: 'v6', nivel: 'facil', titulo: 'Cambiarle el texto a una etiqueta',
      enunciado: 'Poné una etiqueta que arranque diciendo <code>Todavia nada</code> y un botón <code>Cambiar</code>. Al tocar el botón, la etiqueta tiene que pasar a decir <code>Listo!</code>.',
      pista: '<code>poner_texto (control, "texto nuevo")</code>. La variable de la etiqueta se declara en <code>var</code>, así la subrutina que atiende el clic también la ve.',
      plantilla: 'var\n   e = 0\n   b = 0\ninicio\n   ventana ("Cambiar", 340, 200)\n   e = etiqueta ("Todavia nada", 20, 20)\n   b = boton ("Cambiar", 20, 60, 110, 32)\n   al_hacer_clic (b, "cambiar")\n   esperar_eventos ()\nfin\n\nsubrutina cambiar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Al principio dice «Todavia nada»', espera: [['texto', 'etiqueta', 0, 'Todavia nada']] },
        {
          nombre: 'Después del clic dice «Listo!»',
          pasos: [['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, 'Listo!']]
        }
      ]
    },
    {
      id: 'v7', nivel: 'facil', titulo: 'Saludar por el nombre',
      enunciado: 'Ventana con una caja de texto, un botón <code>Saludar</code> y nada más. Al tocar el botón tiene que salir el mensaje <code>Hola, Ana!</code> si en la caja dice <code>Ana</code>.',
      pista: '<code>leer_texto (c)</code> devuelve lo que la persona escribió en la caja. Las cadenas se pegan con <code>+</code>: <code>"Hola, " + leer_texto (c) + "!"</code>.',
      plantilla: 'var\n   c = 0\n   b = 0\ninicio\n   ventana ("Saludo", 340, 200)\n   c = caja (20, 20, 180, 26)\n   b = boton ("Saludar", 20, 60, 110, 32)\n   al_hacer_clic (b, "saludar")\n   esperar_eventos ()\nfin\n\nsubrutina saludar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Con «Ana» en la caja saluda a Ana',
          pasos: [['escribir', 0, 'Ana'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Hola, Ana!']]]
        },
        {
          nombre: 'Con otro nombre saluda a ese otro',
          pasos: [['escribir', 0, 'Ruben'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Hola, Ruben!']]]
        }
      ]
    },
    {
      id: 'v8', nivel: 'facil', titulo: 'Dos botones, dos subrutinas',
      enunciado: 'Una etiqueta y dos botones: <code>Rojo</code> (primero) y <code>Azul</code> (segundo). Cada uno pone en la etiqueta el texto <code>rojo</code> o <code>azul</code> según cuál se tocó.',
      pista: 'Cada botón puede tener su propia subrutina. Registrá dos veces <code>al_hacer_clic</code>, una por botón, con nombres distintos.',
      plantilla: 'var\n   e = 0\n   b1 = 0\n   b2 = 0\ninicio\n   ventana ("Colores", 340, 200)\n   e = etiqueta ("nada", 20, 20)\n   b1 = boton ("Rojo", 20, 60, 90, 30)\n   b2 = boton ("Azul", 120, 60, 90, 30)\n   esperar_eventos ()\nfin\n',
      pruebas: [
        { nombre: 'El primer botón pone «rojo»', pasos: [['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, 'rojo']] },
        { nombre: 'El segundo botón pone «azul»', pasos: [['clic', 'boton', 1]], espera: [['texto', 'etiqueta', 0, 'azul']] },
        {
          nombre: 'Y se puede ir y volver',
          pasos: [['clic', 'boton', 1], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'rojo']]
        }
      ]
    },
    {
      id: 'v9', nivel: 'facil', titulo: 'Contador de clics',
      enunciado: 'Una etiqueta que arranca en <code>0</code> y un botón <code>+1</code>. Cada clic suma uno y la etiqueta muestra el total.',
      pista: 'La cuenta va en una variable global (declarada en <code>var</code>), porque tiene que sobrevivir entre un clic y el siguiente. Para pasar el número a texto: <code>str (n, 0, 0)</code>.',
      plantilla: 'var\n   e = 0\n   n = 0\ninicio\n   ventana ("Contador", 320, 200)\n   e = etiqueta ("0", 20, 20)\n   al_hacer_clic (boton ("+1", 20, 60, 80, 30), "sumar")\n   esperar_eventos ()\nfin\n\nsubrutina sumar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Arranca en 0', espera: [['texto', 'etiqueta', 0, '0']] },
        { nombre: 'Un clic, un uno', pasos: [['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, '1']] },
        {
          nombre: 'Cinco clics, un cinco',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0], ['clic', 'boton', 0],
            ['clic', 'boton', 0], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '5']]
        }
      ]
    },
    {
      id: 'v10', nivel: 'facil', titulo: 'Una casilla que esconde',
      enunciado: 'Una casilla <code>Ver el mensaje</code> y una etiqueta <code>Secreto</code>. Mientras la casilla esté marcada la etiqueta se ve; cuando no, se esconde.',
      pista: '<code>al_cambiar (k, "revisar")</code> avisa cada vez que la casilla cambia. Adentro, <code>visible (e, marcado (k))</code> hace todo el trabajo de una sola vez: no hace falta un <code>si</code>.',
      plantilla: 'var\n   k = 0\n   e = 0\ninicio\n   ventana ("Mostrar y esconder", 340, 200)\n   k = casilla ("Ver el mensaje", 20, 20)\n   e = etiqueta ("Secreto", 20, 60)\n   al_cambiar (k, "revisar")\n   esperar_eventos ()\nfin\n\nsubrutina revisar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Marcada: se ve', pasos: [['marcar', 0, true]], espera: [['visible', 'etiqueta', 0, true]] },
        { nombre: 'Sin marcar: se esconde', pasos: [['marcar', 0, false]], espera: [['visible', 'etiqueta', 0, false]] },
        {
          nombre: 'Y se puede marcar y desmarcar',
          pasos: [['marcar', 0, true], ['marcar', 0, false], ['marcar', 0, true]],
          espera: [['visible', 'etiqueta', 0, true]]
        }
      ]
    },
    {
      id: 'v11', nivel: 'facil', titulo: 'Aceptar los términos',
      enunciado: 'Una casilla <code>Acepto</code> y un botón <code>Continuar</code> que arranca <strong>deshabilitado</strong>. El botón se habilita solo cuando la casilla está marcada.',
      pista: '<code>habilitar (b, FALSE)</code> apaga un control: sigue estando pero no se puede tocar. Acordate de dejarlo apagado antes de <code>esperar_eventos ()</code>.',
      plantilla: 'var\n   k = 0\n   b = 0\ninicio\n   ventana ("Terminos", 340, 200)\n   k = casilla ("Acepto", 20, 20)\n   b = boton ("Continuar", 20, 60, 110, 32)\n   al_cambiar (k, "revisar")\n   esperar_eventos ()\nfin\n\nsubrutina revisar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Al abrir, el botón está apagado', espera: [['habilitado', 'boton', 0, false]] },
        { nombre: 'Al aceptar, se enciende', pasos: [['marcar', 0, true]], espera: [['habilitado', 'boton', 0, true]] },
        {
          nombre: 'Al desmarcar, vuelve a apagarse',
          pasos: [['marcar', 0, true], ['marcar', 0, false]],
          espera: [['habilitado', 'boton', 0, false]]
        }
      ]
    },
    {
      id: 'v12', nivel: 'facil', titulo: 'Mover una etiqueta',
      enunciado: 'Una etiqueta <code>Aca voy</code> que arranca en (20, 20) y un botón <code>Derecha</code>. Cada clic corre la etiqueta <strong>20 píxeles</strong> hacia la derecha, sin cambiarle la <code>y</code>.',
      pista: '<code>mover (control, x, y)</code> pide la posición completa, no el desplazamiento. Guardá la <code>x</code> actual en una variable global y sumale 20 en cada clic.',
      plantilla: 'var\n   e = 0\n   x = 0\ninicio\n   ventana ("Mover", 400, 200)\n   x = 20\n   e = etiqueta ("Aca voy", x, 20)\n   al_hacer_clic (boton ("Derecha", 20, 80, 100, 30), "correr")\n   esperar_eventos ()\nfin\n\nsubrutina correr (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Arranca en (20, 20)', espera: [['posicion', 'etiqueta', 0, 20, 20]] },
        { nombre: 'Un clic la lleva a (40, 20)', pasos: [['clic', 'boton', 0]], espera: [['posicion', 'etiqueta', 0, 40, 20]] },
        {
          nombre: 'Tres clics, (80, 20)',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0], ['clic', 'boton', 0]],
          espera: [['posicion', 'etiqueta', 0, 80, 20]]
        }
      ]
    },
    {
      id: 'v13', nivel: 'facil', titulo: 'Una lista con los días',
      enunciado: 'Poné una lista en (20, 20) de 160 × 110 y cargale, en ese orden, <code>lunes</code>, <code>martes</code> y <code>miercoles</code>.',
      pista: 'La lista se crea vacía y se llena de a un ítem: <code>agregar_item (li, "lunes")</code>.',
      plantilla: 'var\n   li = 0\ninicio\n   ventana ("Dias", 340, 220)\n   li = lista (20, 20, 160, 110)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'La lista tiene los tres días en orden',
        espera: [['hay', 'lista', 1], ['items', 0, ['lunes', 'martes', 'miercoles']]]
      }]
    },
    {
      id: 'v14', nivel: 'facil', titulo: 'Elegir de la lista',
      enunciado: 'A la lista del ejercicio anterior sumale una etiqueta. Cuando se elige un día, la etiqueta tiene que decir <code>Elegiste martes</code> (con el día que se haya elegido).',
      pista: '<code>al_cambiar (li, "elegir")</code> avisa cuando cambia lo elegido, y <code>item_elegido (li)</code> devuelve el texto del ítem.',
      plantilla: 'var\n   li = 0\n   e = 0\ninicio\n   ventana ("Dias", 380, 220)\n   li = lista (20, 20, 160, 110)\n   agregar_item (li, "lunes")\n   agregar_item (li, "martes")\n   agregar_item (li, "miercoles")\n   e = etiqueta ("Elegi un dia", 200, 20)\n   al_cambiar (li, "elegir")\n   esperar_eventos ()\nfin\n\nsubrutina elegir (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Al elegir martes', pasos: [['elegir', 0, 'martes']], espera: [['texto', 'etiqueta', 0, 'Elegiste martes']] },
        { nombre: 'Al elegir lunes', pasos: [['elegir', 0, 'lunes']], espera: [['texto', 'etiqueta', 0, 'Elegiste lunes']] }
      ]
    },
    {
      id: 'v15', nivel: 'facil', titulo: 'Un deslizador',
      enunciado: 'Un deslizador (que va de 0 a 100) y una etiqueta que muestre su valor como número entero mientras se lo mueve.',
      pista: '<code>leer_valor (d)</code> devuelve el número del deslizador, y <code>al_cambiar</code> avisa cada vez que se lo mueve.',
      plantilla: 'var\n   d = 0\n   e = 0\ninicio\n   ventana ("Volumen", 340, 200)\n   d = deslizador (20, 60, 200, 24)\n   e = etiqueta ("0", 20, 20)\n   al_cambiar (d, "mostrar")\n   esperar_eventos ()\nfin\n\nsubrutina mostrar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'En 42 muestra 42', pasos: [['deslizar', 0, 42]], espera: [['texto', 'etiqueta', 0, '42']] },
        { nombre: 'En 100 muestra 100', pasos: [['deslizar', 0, 100]], espera: [['texto', 'etiqueta', 0, '100']] },
        { nombre: 'De vuelta en 0', pasos: [['deslizar', 0, 70], ['deslizar', 0, 0]], espera: [['texto', 'etiqueta', 0, '0']] }
      ]
    },
    {
      id: 'v16', nivel: 'facil', titulo: 'Ponerle color a un control',
      enunciado: 'Una etiqueta que diga <code>Atencion</code> con el fondo amarillo <code>(255, 220, 0)</code> y la letra negra <code>(0, 0, 0)</code>.',
      pista: 'Los colores se dan en rojo, verde y azul, de 0 a 255: <code>color_fondo (e, 255, 220, 0)</code> y <code>color_texto (e, 0, 0, 0)</code>.',
      plantilla: 'var\n   e = 0\ninicio\n   ventana ("Aviso", 320, 160)\n   e = etiqueta ("Atencion", 20, 20, 160, 30)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'La etiqueta quedó amarilla con letra negra',
        espera: [['texto', 'etiqueta', 0, 'Atencion'],
          ['fondo', 'etiqueta', 0, 255, 220, 0], ['color', 'etiqueta', 0, 0, 0, 0]]
      }]
    },
    {
      id: 'v17', nivel: 'facil', titulo: 'La primera línea',
      enunciado: 'Poné un lienzo en (10, 10) de 300 × 200 y dibujá con pluma azul <code>(0, 0, 255)</code> una línea que vaya de <code>(0, 0)</code> a <code>(300, 200)</code>.',
      pista: 'El lienzo es una hoja en blanco dentro de la ventana. Sus coordenadas arrancan en su propia esquina, no en la de la ventana. <code>pluma()</code> elige el color con el que se dibuja de ahí en más.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Dibujo", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Hay una línea azul de esquina a esquina',
        espera: [['hay', 'lienzo', 1], ['dibujo', 'pluma', [{ r: 0, g: 0, b: 255 }]],
          ['dibujo', 'linea', [0, 0, 300, 200]], ['dibujos', 'linea', 1]]
      }]
    },
    {
      id: 'v18', nivel: 'facil', titulo: 'Un rectángulo relleno',
      enunciado: 'En un lienzo de 300 × 200, dibujá con relleno verde <code>(0, 160, 0)</code> un rectángulo que arranque en <code>(20, 20)</code> y mida <strong>120 × 80</strong>.',
      pista: '<code>relleno()</code> elige el color de adentro y <code>pluma()</code> el del borde. <code>rectangulo (l, x, y, ancho, alto)</code>.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Dibujo", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'El rectángulo verde está donde va',
        espera: [['dibujo', 'relleno', [{ r: 0, g: 160, b: 0 }]],
          ['dibujo', 'rectangulo', [20, 20, 120, 80]], ['dibujos', 'rectangulo', 1]]
      }]
    },
    {
      id: 'v19', nivel: 'facil', titulo: 'Un círculo',
      enunciado: 'En un lienzo de 300 × 200, dibujá un círculo con el centro en <code>(150, 100)</code> y <strong>60</strong> de radio.',
      pista: '<code>circulo (l, x, y, radio)</code>: los dos primeros números son el <em>centro</em>, no la esquina.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Dibujo", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'El círculo está centrado y con el radio pedido',
        espera: [['dibujo', 'circulo', [150, 100, 60]], ['dibujos', 'circulo', 1]]
      }]
    },
    {
      id: 'v20', nivel: 'facil', titulo: 'Escribir en el lienzo',
      enunciado: 'En un lienzo de 300 × 200, escribí el texto <code>ESLE2</code> en la posición <code>(30, 40)</code>.',
      pista: '<code>texto_en (l, x, y, "texto")</code>. La <code>y</code> es la <em>base</em> de las letras: si ponés 0 el texto queda arriba del borde y no se ve.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Dibujo", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'El texto está escrito donde va',
        espera: [['dibujo', 'texto', [30, 40, 'ESLE2']], ['dibujos', 'texto', 1]]
      }]
    },

    /* =================================================================== */
    /* MEDIO — leer datos, decidir, repetir y dibujar con ciclos           */
    /* =================================================================== */
    {
      id: 'v21', nivel: 'medio', titulo: 'La sumadora',
      enunciado: 'Dos cajas de texto, un botón <code>Sumar</code> y una etiqueta. Al tocar el botón, la etiqueta muestra la suma de los dos números, sin decimales.',
      pista: 'Lo que devuelve <code>leer_texto()</code> es una <strong>cadena</strong>, aunque parezca un número: hay que pasarlo con <code>val()</code>. Después se vuelve a texto con <code>str (n, 0, 0)</code>.',
      plantilla: 'var\n   c1 = 0\n   c2 = 0\n   e = 0\ninicio\n   ventana ("Sumadora", 360, 220)\n   c1 = caja (20, 20, 100, 26)\n   c2 = caja (140, 20, 100, 26)\n   e = etiqueta ("0", 20, 110)\n   al_hacer_clic (boton ("Sumar", 20, 60, 100, 32), "sumar")\n   esperar_eventos ()\nfin\n\nsubrutina sumar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: '3 + 5 = 8',
          pasos: [['escribir', 0, '3'], ['escribir', 1, '5'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '8']]
        },
        {
          nombre: '10 + -4 = 6',
          pasos: [['escribir', 0, '10'], ['escribir', 1, '-4'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '6']]
        }
      ]
    },
    {
      id: 'v22', nivel: 'medio', titulo: 'De Celsius a Fahrenheit',
      enunciado: 'Una caja para los grados Celsius, un botón <code>Convertir</code> y una etiqueta que muestre el resultado <strong>con dos decimales</strong>.<br>La fórmula es <code>F = C × 9 / 5 + 32</code>.',
      pista: '<code>str (valor, 0, 2)</code> da el número con dos decimales. Con 37 tiene que decir exactamente <code>98.60</code>.',
      plantilla: 'var\n   c = 0\n   e = 0\ninicio\n   ventana ("Temperatura", 360, 200)\n   c = caja (20, 20, 100, 26)\n   e = etiqueta ("0.00", 20, 100)\n   al_hacer_clic (boton ("Convertir", 20, 56, 120, 32), "convertir")\n   esperar_eventos ()\nfin\n\nsubrutina convertir (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: '37 grados', pasos: [['escribir', 0, '37'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, '98.60']] },
        { nombre: '100 grados', pasos: [['escribir', 0, '100'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, '212.00']] },
        { nombre: '-40, el punto donde se cruzan', pasos: [['escribir', 0, '-40'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, '-40.00']] }
      ]
    },
    {
      id: 'v23', nivel: 'medio', titulo: 'Área de un rectángulo',
      enunciado: 'Dos cajas (base y altura), un botón <code>Calcular</code> y una etiqueta que diga <code>Area: 12</code> con el número sin decimales.',
      pista: 'Igual que la sumadora, pero armando el texto: <code>"Area: " + str (b * h, 0, 0)</code>.',
      plantilla: 'var\n   cb = 0\n   ch = 0\n   e = 0\ninicio\n   ventana ("Area", 360, 220)\n   cb = caja (20, 20, 100, 26)\n   ch = caja (140, 20, 100, 26)\n   e = etiqueta ("Area: 0", 20, 110)\n   al_hacer_clic (boton ("Calcular", 20, 60, 110, 32), "calcular")\n   esperar_eventos ()\nfin\n\nsubrutina calcular (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: '4 por 5',
          pasos: [['escribir', 0, '4'], ['escribir', 1, '5'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'Area: 20']]
        },
        {
          nombre: '2.5 por 4',
          pasos: [['escribir', 0, '2.5'], ['escribir', 1, '4'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'Area: 10']]
        }
      ]
    },
    {
      id: 'v24', nivel: 'medio', titulo: 'Un contador con topes',
      enunciado: 'Una etiqueta con el número y dos botones: <code>-</code> (primero) y <code>+</code> (segundo). El contador arranca en 0 y <strong>no puede bajar de 0 ni pasar de 5</strong>.',
      pista: 'Dos subrutinas, cada una con su <code>si</code>. También podés usar una sola y <code>min()</code> / <code>max()</code>.',
      plantilla: 'var\n   e = 0\n   n = 0\ninicio\n   ventana ("Contador", 320, 200)\n   n = 0\n   e = etiqueta ("0", 20, 20)\n   al_hacer_clic (boton ("-", 20, 60, 60, 30), "bajar")\n   al_hacer_clic (boton ("+", 100, 60, 60, 30), "subir")\n   esperar_eventos ()\nfin\n\nsubrutina bajar (id : numerico)\ninicio\nfin\n\nsubrutina subir (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'En 0 no baja', pasos: [['clic', 'boton', 0], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, '0']] },
        {
          nombre: 'Sube de a uno',
          pasos: [['clic', 'boton', 1], ['clic', 'boton', 1], ['clic', 'boton', 1]],
          espera: [['texto', 'etiqueta', 0, '3']]
        },
        {
          nombre: 'Y no pasa de 5',
          pasos: [['clic', 'boton', 1], ['clic', 'boton', 1], ['clic', 'boton', 1],
            ['clic', 'boton', 1], ['clic', 'boton', 1], ['clic', 'boton', 1], ['clic', 'boton', 1]],
          espera: [['texto', 'etiqueta', 0, '5']]
        }
      ]
    },
    {
      id: 'v25', nivel: 'medio', titulo: 'El semáforo',
      enunciado: 'Una etiqueta grande (la luz) y tres botones: <code>Rojo</code>, <code>Amarillo</code> y <code>Verde</code>, en ese orden. Cada uno pinta el fondo de la etiqueta con su color: <code>(220, 0, 0)</code>, <code>(240, 200, 0)</code> y <code>(0, 170, 0)</code>.',
      pista: 'Tres subrutinas de una línea cada una. Si te repetís mucho, podés hacer una sola subrutina <code>pintar (r, g, b)</code> y que las tres la llamen.',
      plantilla: 'var\n   luz = 0\ninicio\n   ventana ("Semaforo", 360, 240)\n   luz = etiqueta ("", 20, 20, 120, 120)\n   al_hacer_clic (boton ("Rojo", 160, 20, 120, 30), "rojo")\n   al_hacer_clic (boton ("Amarillo", 160, 60, 120, 30), "amarillo")\n   al_hacer_clic (boton ("Verde", 160, 100, 120, 30), "verde")\n   esperar_eventos ()\nfin\n',
      pruebas: [
        { nombre: 'El boton Rojo pinta la luz', pasos: [['clic', 'boton', 0]], espera: [['fondo', 'etiqueta', 0, 220, 0, 0]] },
        { nombre: 'El boton Amarillo pinta la luz', pasos: [['clic', 'boton', 1]], espera: [['fondo', 'etiqueta', 0, 240, 200, 0]] },
        { nombre: 'Verde después de rojo', pasos: [['clic', 'boton', 0], ['clic', 'boton', 2]], espera: [['fondo', 'etiqueta', 0, 0, 170, 0]] }
      ]
    },
    {
      id: 'v26', nivel: 'medio', titulo: 'Lista de tareas',
      enunciado: 'Una caja, un botón <code>Agregar</code> y una lista. Al tocar el botón, lo que está escrito en la caja se agrega a la lista y <strong>la caja queda vacía</strong> para escribir lo siguiente.',
      pista: 'Es el patrón de casi todo formulario: leer, usar, limpiar. Para vaciar la caja, <code>poner_texto (c, "")</code>.',
      plantilla: 'var\n   c = 0\n   li = 0\ninicio\n   ventana ("Tareas", 380, 260)\n   c = caja (20, 20, 180, 26)\n   li = lista (20, 60, 240, 150)\n   al_hacer_clic (boton ("Agregar", 210, 20, 100, 28), "agregar")\n   esperar_eventos ()\nfin\n\nsubrutina agregar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Dos tareas quedan en la lista y la caja se vacía',
          pasos: [['escribir', 0, 'pan'], ['clic', 'boton', 0],
            ['escribir', 0, 'leche'], ['clic', 'boton', 0]],
          espera: [['items', 0, ['pan', 'leche']], ['texto', 'caja', 0, '']]
        }
      ]
    },
    {
      id: 'v27', nivel: 'medio', titulo: 'Vaciar la lista',
      enunciado: 'Una lista cargada con <code>uno</code>, <code>dos</code> y <code>tres</code>, y un botón <code>Vaciar</code> que la deja sin nada.',
      pista: '<code>limpiar_items (li)</code> borra todo de una. Fijate que la lista sigue existiendo: lo que se vacía es su contenido.',
      plantilla: 'var\n   li = 0\ninicio\n   ventana ("Vaciar", 340, 260)\n   li = lista (20, 20, 160, 120)\n   agregar_item (li, "uno")\n   agregar_item (li, "dos")\n   agregar_item (li, "tres")\n   al_hacer_clic (boton ("Vaciar", 200, 20, 100, 30), "vaciar")\n   esperar_eventos ()\nfin\n\nsubrutina vaciar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Al abrir están los tres', espera: [['items', 0, ['uno', 'dos', 'tres']]] },
        { nombre: 'Después del botón no queda nada', pasos: [['clic', 'boton', 0]], espera: [['items', 0, []], ['hay', 'lista', 1]] }
      ]
    },
    {
      id: 'v28', nivel: 'medio', titulo: 'No dejar guardar en blanco',
      enunciado: 'Una caja y un botón <code>Guardar</code>. Si la caja está vacía, el mensaje tiene que ser <code>Escribi algo primero</code>; si tiene texto, <code>Guardado: pan</code>.',
      pista: 'Validar antes de hacer es la mitad de cualquier programa con ventanas. Compará con la cadena vacía: <code>si ( leer_texto (c) == "" )</code>.',
      plantilla: 'var\n   c = 0\ninicio\n   ventana ("Guardar", 360, 200)\n   c = caja (20, 20, 180, 26)\n   al_hacer_clic (boton ("Guardar", 20, 60, 110, 32), "guardar")\n   esperar_eventos ()\nfin\n\nsubrutina guardar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Con la caja vacía avisa', pasos: [['clic', 'boton', 0]], espera: [['mensajes', ['Escribi algo primero']]] },
        {
          nombre: 'Con texto, guarda',
          pasos: [['escribir', 0, 'pan'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Guardado: pan']]]
        },
        {
          nombre: 'Y avisa cada vez que corresponde',
          pasos: [['clic', 'boton', 0], ['escribir', 0, 'sal'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Escribi algo primero', 'Guardado: sal']]]
        }
      ]
    },
    {
      id: 'v29', nivel: 'medio', titulo: 'Un deslizador que agranda',
      enunciado: 'Un deslizador y una etiqueta. Al mover el deslizador, la etiqueta tiene que pasar a medir <code>50 + valor</code> de ancho, siempre con <strong>22</strong> de alto.',
      pista: '<code>redimensionar (control, ancho, alto)</code>. Con el deslizador en 100 la etiqueta mide 150 × 22.',
      plantilla: 'var\n   d = 0\n   e = 0\ninicio\n   ventana ("Tamano", 360, 220)\n   e = etiqueta ("Se agranda", 20, 20, 50, 22)\n   d = deslizador (20, 80, 200, 24)\n   al_cambiar (d, "estirar")\n   esperar_eventos ()\nfin\n\nsubrutina estirar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'En 100 mide 150 de ancho', pasos: [['deslizar', 0, 100]], espera: [['tamano', 'etiqueta', 0, 150, 22]] },
        { nombre: 'En 30 mide 80', pasos: [['deslizar', 0, 30]], espera: [['tamano', 'etiqueta', 0, 80, 22]] }
      ]
    },
    {
      id: 'v30', nivel: 'medio', titulo: 'El mezclador de colores',
      enunciado: 'Tres deslizadores (rojo, verde y azul, en ese orden) y una etiqueta grande. Mover cualquiera de los tres tiene que repintar el fondo de la etiqueta con la mezcla.',
      pista: 'Los tres <code>al_cambiar</code> pueden apuntar a la <strong>misma</strong> subrutina: adentro se leen los tres deslizadores y se pinta una sola vez. Es la forma corta y la que se entiende.',
      plantilla: 'var\n   dr = 0\n   dv = 0\n   da = 0\n   e = 0\ninicio\n   ventana ("Mezclador", 400, 260)\n   e = etiqueta ("", 20, 20, 160, 90)\n   dr = deslizador (20, 130, 200, 24)\n   dv = deslizador (20, 165, 200, 24)\n   da = deslizador (20, 200, 200, 24)\n   esperar_eventos ()\nfin\n\nsubrutina pintar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Naranja: 255, 128, 0',
          pasos: [['deslizar', 0, 255], ['deslizar', 1, 128], ['deslizar', 2, 0]],
          espera: [['fondo', 'etiqueta', 0, 255, 128, 0]]
        },
        {
          nombre: 'Y cambiar uno solo repinta todo',
          pasos: [['deslizar', 0, 10], ['deslizar', 1, 20], ['deslizar', 2, 30], ['deslizar', 1, 200]],
          espera: [['fondo', 'etiqueta', 0, 10, 200, 30]]
        }
      ]
    },
    {
      id: 'v31', nivel: 'medio', titulo: 'La contraseña',
      enunciado: 'Una caja y un botón <code>Entrar</code>. Si en la caja dice exactamente <code>esle2</code> el mensaje es <code>Bienvenido</code>; si no, <code>Contrasenia incorrecta</code>.',
      pista: 'Dos cadenas se comparan con <code>==</code>, igual que dos números. Ojo con las mayúsculas: <code>"ESLE2"</code> no es <code>"esle2"</code>.',
      plantilla: 'var\n   c = 0\ninicio\n   ventana ("Entrar", 340, 200)\n   c = caja (20, 20, 180, 26)\n   al_hacer_clic (boton ("Entrar", 20, 60, 100, 32), "entrar")\n   esperar_eventos ()\nfin\n\nsubrutina entrar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'La correcta', pasos: [['escribir', 0, 'esle2'], ['clic', 'boton', 0]], espera: [['mensajes', ['Bienvenido']]] },
        { nombre: 'Una equivocada', pasos: [['escribir', 0, 'sle'], ['clic', 'boton', 0]], espera: [['mensajes', ['Contrasenia incorrecta']]] },
        { nombre: 'En mayúsculas tampoco vale', pasos: [['escribir', 0, 'ESLE2'], ['clic', 'boton', 0]], espera: [['mensajes', ['Contrasenia incorrecta']]] }
      ]
    },
    {
      id: 'v32', nivel: 'medio', titulo: '¿Par o impar?',
      enunciado: 'Una caja con un número entero, un botón <code>Revisar</code> y una etiqueta que diga <code>par</code> o <code>impar</code>.',
      pista: '<code>val()</code> para pasar el texto a número y el resto <code>%</code> para decidir. Con 0 tiene que decir <code>par</code>.',
      plantilla: 'var\n   c = 0\n   e = 0\ninicio\n   ventana ("Par o impar", 340, 200)\n   c = caja (20, 20, 120, 26)\n   e = etiqueta ("?", 20, 100)\n   al_hacer_clic (boton ("Revisar", 20, 60, 110, 32), "revisar")\n   esperar_eventos ()\nfin\n\nsubrutina revisar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'El siete es impar', pasos: [['escribir', 0, '7'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, 'impar']] },
        { nombre: 'El ocho es par', pasos: [['escribir', 0, '8'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, 'par']] },
        { nombre: 'El cero tambien es par', pasos: [['escribir', 0, '0'], ['clic', 'boton', 0]], espera: [['texto', 'etiqueta', 0, 'par']] }
      ]
    },
    {
      id: 'v33', nivel: 'medio', titulo: 'La tabla en una lista',
      enunciado: 'Una caja con un número, un botón <code>Ver la tabla</code> y una lista. Al tocar el botón, la lista queda con las diez líneas <code>3 x 1 = 3</code> … <code>3 x 10 = 30</code>.<br>Si se toca de nuevo con otro número, la lista tiene que quedar solo con la tabla nueva.',
      pista: 'El <code>desde</code> de siempre, adentro del evento. Y <code>limpiar_items()</code> antes del ciclo: si no, la segunda tabla se pega debajo de la primera.',
      plantilla: 'var\n   c = 0\n   li = 0\ninicio\n   ventana ("Tabla", 380, 300)\n   c = caja (20, 20, 100, 26)\n   li = lista (20, 90, 200, 180)\n   al_hacer_clic (boton ("Ver la tabla", 130, 20, 120, 28), "tabla")\n   esperar_eventos ()\nfin\n\nsubrutina tabla (id : numerico)\nvar\n   k = 0\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'La tabla del 3',
          pasos: [['escribir', 0, '3'], ['clic', 'boton', 0]],
          espera: [['items', 0, ['3 x 1 = 3', '3 x 2 = 6', '3 x 3 = 9', '3 x 4 = 12', '3 x 5 = 15',
            '3 x 6 = 18', '3 x 7 = 21', '3 x 8 = 24', '3 x 9 = 27', '3 x 10 = 30']]]
        },
        {
          nombre: 'Y la segunda tabla reemplaza a la primera',
          pasos: [['escribir', 0, '3'], ['clic', 'boton', 0], ['escribir', 0, '10'], ['clic', 'boton', 0]],
          espera: [['items', 0, ['10 x 1 = 10', '10 x 2 = 20', '10 x 3 = 30', '10 x 4 = 40', '10 x 5 = 50',
            '10 x 6 = 60', '10 x 7 = 70', '10 x 8 = 80', '10 x 9 = 90', '10 x 10 = 100']]]
        }
      ]
    },
    {
      id: 'v34', nivel: 'medio', titulo: 'La bandera',
      enunciado: 'En un lienzo de 300 × 180 dibujá la bandera paraguaya: tres franjas horizontales de <strong>300 × 60</strong> cada una, en <code>(0, 0)</code>, <code>(0, 60)</code> y <code>(0, 120)</code>, rojas <code>(213, 43, 30)</code>, blancas <code>(255, 255, 255)</code> y azules <code>(0, 56, 168)</code>.',
      pista: 'Antes de cada rectángulo hay que cambiar el <code>relleno()</code>. El color queda puesto hasta que lo cambies: es como apoyar y levantar el pincel.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Bandera", 340, 220)\n   l = lienzo (10, 10, 300, 180)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Las tres franjas, en su color y en su lugar',
        espera: [['dibujos', 'rectangulo', 3],
          ['dibujo', 'relleno', [{ r: 213, g: 43, b: 30 }]],
          ['dibujo', 'relleno', [{ r: 255, g: 255, b: 255 }]],
          ['dibujo', 'relleno', [{ r: 0, g: 56, b: 168 }]],
          ['dibujo', 'rectangulo', [0, 0, 300, 60]],
          ['dibujo', 'rectangulo', [0, 60, 300, 60]],
          ['dibujo', 'rectangulo', [0, 120, 300, 60]]]
      }]
    },
    {
      id: 'v35', nivel: 'medio', titulo: 'Una casa',
      enunciado: 'En un lienzo de 300 × 200 dibujá una casa: la pared es un rectángulo en <code>(60, 90)</code> de <strong>160 × 100</strong>, la puerta otro en <code>(120, 140)</code> de <strong>40 × 50</strong>, y el techo son dos líneas: de <code>(50, 90)</code> a <code>(140, 30)</code> y de <code>(140, 30)</code> a <code>(230, 90)</code>.',
      pista: 'Un dibujo es una lista de órdenes, nada más. Andá una por una y probá seguido con el botón Ejecutar: se ve enseguida qué quedó torcido.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("La casa", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Pared, puerta y techo',
        espera: [['dibujo', 'rectangulo', [60, 90, 160, 100]],
          ['dibujo', 'rectangulo', [120, 140, 40, 50]],
          ['dibujo', 'linea', [50, 90, 140, 30]],
          ['dibujo', 'linea', [140, 30, 230, 90]],
          ['dibujos', 'rectangulo', 2], ['dibujos', 'linea', 2]]
      }]
    },
    {
      id: 'v36', nivel: 'medio', titulo: 'Una escalera con un ciclo',
      enunciado: 'En un lienzo de 300 × 200, dibujá <strong>6 escalones</strong> con un ciclo. El escalón número <code>k</code> (de 0 a 5) es un rectángulo en <code>(k × 40, 160 − k × 25)</code> de <strong>40 × 25</strong>.',
      pista: 'Escribí primero el primer rectángulo a mano, después mirá qué cambia entre uno y el siguiente y poné eso en el <code>desde</code>. Seis rectángulos escritos a mano también «funcionan», pero el ejercicio es el ciclo.',
      plantilla: 'var\n   l = 0\n   k = 0\ninicio\n   ventana ("Escalera", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Los seis escalones',
        espera: [['dibujos', 'rectangulo', 6],
          ['dibujo', 'rectangulo', [0, 160, 40, 25]],
          ['dibujo', 'rectangulo', [40, 135, 40, 25]],
          ['dibujo', 'rectangulo', [200, 35, 40, 25]]]
      }]
    },
    {
      id: 'v37', nivel: 'medio', titulo: 'Gráfico de barras',
      enunciado: 'Guardá en un <code>vector [5] numerico</code> los valores <strong>30, 80, 45, 120, 60</strong> y dibujalos en un lienzo de 300 × 200 como barras: la barra <code>k</code> (de 1 a 5) va en <code>((k − 1) × 55 + 10, 180 − v[k])</code> y mide <strong>40 de ancho por <code>v[k]</code> de alto</strong>.',
      pista: 'Que la barra crezca «hacia arriba» es la parte que confunde: como la <code>y</code> crece hacia abajo, la esquina de arriba se calcula restando la altura desde la base.',
      plantilla: 'var\n   l = 0\n   k = 0\n   v : vector [5] numerico\ninicio\n   ventana ("Barras", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Las cinco barras',
        espera: [['dibujos', 'rectangulo', 5],
          ['dibujo', 'rectangulo', [10, 150, 40, 30]],
          ['dibujo', 'rectangulo', [65, 100, 40, 80]],
          ['dibujo', 'rectangulo', [175, 60, 40, 120]],
          ['dibujo', 'rectangulo', [230, 120, 40, 60]]]
      }]
    },
    {
      id: 'v38', nivel: 'medio', titulo: 'El termómetro',
      enunciado: 'Un deslizador y un lienzo de 300 × 100. Cada vez que se mueve el deslizador hay que <strong>borrar el lienzo</strong> y dibujar una sola barra en <code>(10, 10)</code> de <code>valor × 2</code> de ancho por <strong>30</strong> de alto.',
      pista: 'Sin <code>borrar_lienzo()</code> las barras se van pisando y el dibujo queda sucio: en un lienzo, lo que se dibujó queda dibujado.',
      plantilla: 'var\n   d = 0\n   l = 0\ninicio\n   ventana ("Termometro", 360, 220)\n   l = lienzo (20, 20, 300, 100)\n   d = deslizador (20, 140, 200, 24)\n   al_cambiar (d, "pintar")\n   esperar_eventos ()\nfin\n\nsubrutina pintar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'En 40 la barra mide 80',
          pasos: [['deslizar', 0, 40]],
          espera: [['dibujo', 'rectangulo', [10, 10, 80, 30]], ['dibujos', 'borrar', 1], ['dibujos', 'rectangulo', 1]]
        },
        {
          nombre: 'Y cada movimiento borra el anterior',
          pasos: [['deslizar', 0, 40], ['deslizar', 0, 90]],
          espera: [['dibujo', 'rectangulo', [10, 10, 180, 30]], ['dibujos', 'borrar', 2], ['dibujos', 'rectangulo', 2]]
        }
      ]
    },

    /* =================================================================== */
    /* AVANZADO — estructuras, cálculo y programas de verdad               */
    /* =================================================================== */
    {
      id: 'v39', nivel: 'avanzado', titulo: 'El tablero de ajedrez',
      enunciado: 'En un lienzo de 240 × 240 dibujá un tablero de <strong>8 × 8</strong> casillas de 30 × 30. Dibujá las <strong>64</strong>, alternando el relleno: blanco <code>(240, 240, 240)</code> cuando <code>(fila + columna)</code> es par y negro <code>(60, 60, 60)</code> cuando es impar.',
      pista: 'Dos <code>desde</code>, uno adentro del otro. La casilla de la fila <code>f</code> y la columna <code>c</code> (ambas de 0 a 7) va en <code>(c × 30, f × 30)</code>.',
      plantilla: 'var\n   l = 0\n   f = 0\n   c = 0\ninicio\n   ventana ("Ajedrez", 280, 280)\n   l = lienzo (20, 20, 240, 240)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Las 64 casillas, alternadas',
        espera: [['dibujos', 'rectangulo', 64],
          ['dibujo', 'rectangulo', [0, 0, 30, 30]],
          ['dibujo', 'rectangulo', [210, 210, 30, 30]],
          ['dibujos', 'relleno', 64]]
      }]
    },
    {
      id: 'v40', nivel: 'avanzado', titulo: 'La parábola',
      enunciado: 'En un lienzo de 300 × 200 dibujá <code>y = x²</code> con <strong>20 segmentos</strong>. Recorré <code>k</code> de <strong>−10 a 9</strong> y uní el punto de <code>k</code> con el de <code>k + 1</code>, pasando cada uno a coordenadas del lienzo con <code>x_pantalla = 150 + k × 15</code> y <code>y_pantalla = 190 − k × k</code>.',
      pista: 'Dibujar una función es siempre lo mismo: un ciclo que va uniendo el punto anterior con el siguiente. Lo que cuesta no es el ciclo, es pasar de las coordenadas del problema a las de la pantalla.',
      plantilla: 'var\n   l = 0\n   k = 0\ninicio\n   ventana ("Parabola", 340, 240)\n   l = lienzo (10, 10, 300, 200)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Los veinte segmentos',
        espera: [['dibujos', 'linea', 20],
          ['dibujo', 'linea', [0, 90, 15, 109]],
          ['dibujo', 'linea', [150, 190, 165, 189]],
          ['dibujo', 'linea', [285, 109, 300, 90]]]
      }]
    },
    {
      id: 'v41', nivel: 'avanzado', titulo: 'Un polígono regular',
      enunciado: 'Una caja con el número de lados, un botón <code>Dibujar</code> y un lienzo de 240 × 240. Al tocar el botón hay que <strong>borrar</strong> y dibujar el polígono de <code>n</code> lados con centro en <code>(120, 120)</code> y radio <strong>100</strong>.<br>El vértice <code>k</code> va en <code>(120 + 100 × cos (2 × PI × k / n), 120 + 100 × sen (2 × PI × k / n))</code>.',
      pista: 'Con <code>const PI = 3.141592654</code>. <code>sin()</code> y <code>cos()</code> trabajan en radianes, que es justo lo que da la fórmula. El polígono se cierra porque el último vértice es el mismo que el primero cuando <code>k = n</code>.',
      plantilla: 'const\n   PI = 3.141592654\nvar\n   c = 0\n   l = 0\n   k = 0\n   n = 0\ninicio\n   ventana ("Poligono", 400, 300)\n   c = caja (20, 20, 60, 26)\n   l = lienzo (100, 20, 240, 240)\n   al_hacer_clic (boton ("Dibujar", 20, 60, 70, 28), "dibujar")\n   esperar_eventos ()\nfin\n\nsubrutina dibujar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Un triángulo tiene tres lados',
          pasos: [['escribir', 0, '3'], ['clic', 'boton', 0]],
          espera: [['dibujos', 'linea', 3], ['dibujos', 'borrar', 1]]
        },
        {
          nombre: 'Un hexágono, seis, y el primer lado arranca a la derecha del centro',
          pasos: [['escribir', 0, '6'], ['clic', 'boton', 0]],
          espera: [['dibujos', 'linea', 6], ['dibujo', 'linea', [220, 120, 170, 206.603]]]
        }
      ]
    },
    {
      id: 'v42', nivel: 'avanzado', titulo: 'La espiral',
      enunciado: 'En un lienzo de 240 × 240 dibujá una espiral con <strong>361 puntos</strong>: para <code>k</code> de <strong>0 a 360</strong>, poné un punto en <code>(120 + (k / 4) × cos (k / 20), 120 + (k / 4) × sen (k / 20))</code>.',
      pista: 'Es la fórmula del círculo con el radio creciendo. <code>punto (l, x, y)</code> marca un solo píxel: 361 puntos seguidos se ven como una línea.',
      plantilla: 'var\n   l = 0\n   k = 0\ninicio\n   ventana ("Espiral", 280, 280)\n   l = lienzo (20, 20, 240, 240)\n\n   esperar_eventos ()\nfin\n',
      pruebas: [{
        nombre: 'Los 361 puntos, del centro hacia afuera',
        espera: [['dibujos', 'punto', 361], ['dibujo', 'punto', [120, 120]]]
      }]
    },
    {
      id: 'v43', nivel: 'avanzado', titulo: 'El carrito de compras',
      enunciado: 'Una lista con <code>pan</code>, <code>leche</code> y <code>queso</code>, un botón <code>Agregar</code> y una etiqueta con el total. Los precios son 5000, 7500 y 12000.<br>Cada vez que se toca <code>Agregar</code>, el precio de lo elegido se suma al total y la etiqueta muestra <code>Total: 12500</code>. Si no hay nada elegido, el total no cambia.',
      pista: 'Dos vectores en paralelo (uno de nombres, otro de precios) y un ciclo que busca cuál coincide. Es el mismo «buscar en una tabla» de siempre, con la lista de la ventana como entrada.',
      plantilla: 'var\n   li = 0\n   e = 0\n   total = 0\n   nom : vector [3] cadena\n   pre : vector [3] numerico\ninicio\n   ventana ("Carrito", 400, 260)\n   li = lista (20, 20, 160, 110)\n   e = etiqueta ("Total: 0", 200, 20)\n   total = 0\n   al_hacer_clic (boton ("Agregar", 200, 60, 110, 30), "agregar")\n   esperar_eventos ()\nfin\n\nsubrutina agregar (id : numerico)\nvar\n   k = 0\ninicio\nfin\n',
      pruebas: [
        { nombre: 'La lista tiene los tres productos', espera: [['items', 0, ['pan', 'leche', 'queso']], ['texto', 'etiqueta', 0, 'Total: 0']] },
        {
          nombre: 'Pan y leche',
          pasos: [['elegir', 0, 'pan'], ['clic', 'boton', 0], ['elegir', 0, 'leche'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'Total: 12500']]
        },
        {
          nombre: 'Sin elegir nada, el total no se mueve',
          pasos: [['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'Total: 0']]
        }
      ]
    },
    {
      id: 'v44', nivel: 'avanzado', titulo: 'El buscador',
      enunciado: 'Una caja de búsqueda y una lista. Los nombres son <code>maria</code>, <code>marcos</code>, <code>ana</code>, <code>luis</code> y <code>marta</code> (en un vector).<br>Mientras se escribe en la caja, la lista tiene que quedar con los nombres que <strong>empiezan</strong> con lo escrito, en el orden del vector. Con la caja vacía se muestran todos.',
      pista: '<code>al_escribir (c, "buscar")</code> avisa con cada tecla. Para saber si <code>nombre</code> empieza con <code>texto</code>: <code>substr (nombre, 1, strlen (texto)) == texto</code>. Y limpiá la lista antes de volver a llenarla.',
      plantilla: 'var\n   c = 0\n   li = 0\n   v : vector [5] cadena\ninicio\n   ventana ("Buscador", 380, 280)\n   c = caja (20, 20, 200, 26)\n   li = lista (20, 60, 200, 180)\n   v[1] = "maria"\n   v[2] = "marcos"\n   v[3] = "ana"\n   v[4] = "luis"\n   v[5] = "marta"\n   al_escribir (c, "buscar")\n   esperar_eventos ()\nfin\n\nsubrutina buscar (id : numerico)\nvar\n   k = 0\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Con «mar» quedan tres', pasos: [['escribir', 0, 'mar']], espera: [['items', 0, ['maria', 'marcos', 'marta']]] },
        { nombre: 'Con «mari» queda una', pasos: [['escribir', 0, 'mari']], espera: [['items', 0, ['maria']]] },
        { nombre: 'Con la caja vacía están todos', pasos: [['escribir', 0, 'mar'], ['escribir', 0, '']], espera: [['items', 0, ['maria', 'marcos', 'ana', 'luis', 'marta']]] },
        { nombre: 'Con algo que no está, la lista queda vacía', pasos: [['escribir', 0, 'zz']], espera: [['items', 0, []]] }
      ]
    },
    {
      id: 'v45', nivel: 'avanzado', titulo: 'La encuesta',
      enunciado: 'Tres botones —<code>Perro</code>, <code>Gato</code>, <code>Pez</code>— y un lienzo de 240 × 160. Cada voto suma uno a su categoría y hay que <strong>borrar y redibujar</strong> las tres barras: la barra <code>k</code> (de 0 a 2) va en <code>(k × 70 + 20, 150 − votos × 20)</code> y mide <strong>50 de ancho por <code>votos × 20</code> de alto</strong>.',
      pista: 'Guardá los votos en un <code>vector [3] numerico</code> y hacé una sola subrutina <code>redibujar()</code> que las tres llamen: así el dibujo se arma en un solo lugar.',
      plantilla: 'var\n   l = 0\n   k = 0\n   votos : vector [3] numerico\ninicio\n   ventana ("Encuesta", 400, 280)\n   l = lienzo (20, 90, 240, 160)\n   votos[1] = 0\n   votos[2] = 0\n   votos[3] = 0\n   al_hacer_clic (boton ("Perro", 20, 20, 100, 30), "perro")\n   al_hacer_clic (boton ("Gato", 140, 20, 100, 30), "gato")\n   al_hacer_clic (boton ("Pez", 260, 20, 100, 30), "pez")\n   esperar_eventos ()\nfin\n\nsubrutina redibujar ()\nvar\n   k = 0\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Dos votos al perro y uno al pez',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0], ['clic', 'boton', 2]],
          espera: [['dibujo', 'rectangulo', [20, 110, 50, 40]],
            ['dibujo', 'rectangulo', [160, 130, 50, 20]],
            ['dibujos', 'borrar', 3]]
        },
        {
          nombre: 'Un voto al gato',
          pasos: [['clic', 'boton', 1]],
          espera: [['dibujo', 'rectangulo', [90, 130, 50, 20]], ['dibujos', 'rectangulo', 3]]
        }
      ]
    },
    {
      id: 'v46', nivel: 'avanzado', titulo: 'La calculadora',
      enunciado: 'Dos cajas, una lista con las operaciones <code>+</code>, <code>-</code>, <code>*</code> y <code>/</code>, un botón <code>=</code> y una etiqueta.<br>El resultado va con <strong>dos decimales</strong>. Si no se eligió operación, la etiqueta dice <code>Elegi una operacion</code>; si se divide por cero, dice <code>No se puede dividir por cero</code>.',
      pista: 'Validá <strong>antes</strong> de calcular y en este orden: primero que haya operación elegida, después el cero. Un <code>si … sino si … sino</code> encadenado alcanza para las seis ramas, y tiene la ventaja de que en cuanto una da verdadera las de abajo ni se miran.',
      plantilla: 'var\n   c1 = 0\n   c2 = 0\n   li = 0\n   e = 0\ninicio\n   ventana ("Calculadora", 420, 260)\n   c1 = caja (20, 20, 100, 26)\n   c2 = caja (140, 20, 100, 26)\n   li = lista (20, 60, 100, 110)\n   e = etiqueta ("0.00", 140, 60, 240, 24)\n   agregar_item (li, "+")\n   agregar_item (li, "-")\n   agregar_item (li, "*")\n   agregar_item (li, "/")\n   al_hacer_clic (boton ("=", 140, 100, 60, 30), "calcular")\n   esperar_eventos ()\nfin\n\nsubrutina calcular (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Una suma',
          pasos: [['escribir', 0, '3'], ['escribir', 1, '5'], ['elegir', 0, '+'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '8.00']]
        },
        {
          nombre: 'Una división',
          pasos: [['escribir', 0, '7'], ['escribir', 1, '2'], ['elegir', 0, '/'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '3.50']]
        },
        {
          nombre: 'Sin elegir operación',
          pasos: [['escribir', 0, '3'], ['escribir', 1, '5'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'Elegi una operacion']]
        },
        {
          nombre: 'Dividir por cero',
          pasos: [['escribir', 0, '3'], ['escribir', 1, '0'], ['elegir', 0, '/'], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, 'No se puede dividir por cero']]
        }
      ]
    },
    {
      id: 'v47', nivel: 'avanzado', titulo: 'El formulario de inscripción',
      enunciado: 'Una caja para el nombre, otra para la edad, una casilla <code>Acepto</code> y un botón <code>Inscribir</code>. Al tocar el botón hay que revisar, <strong>en este orden</strong>, y mostrar el primer problema que aparezca:<br>1. nombre vacío → <code>Falta el nombre</code><br>2. edad menor a 18 → <code>Tenes que ser mayor de edad</code><br>3. casilla sin marcar → <code>Falta aceptar</code><br>Si está todo bien: <code>Inscripto: Ana</code>.',
      pista: 'Uno de los errores más comunes en un formulario es mostrar tres avisos juntos. Con un <code>si … sino si … sino si … sino</code> encadenado se muestra uno solo: en cuanto una condición da verdadera, las de abajo ni se miran. Para preguntar si la casilla <em>no</em> está marcada: <code>marcado (k) == FALSE</code>.',
      plantilla: 'var\n   cn = 0\n   ce = 0\n   k = 0\ninicio\n   ventana ("Inscripcion", 400, 260)\n   cn = caja (20, 20, 200, 26)\n   ce = caja (20, 60, 80, 26)\n   k = casilla ("Acepto", 20, 100)\n   al_hacer_clic (boton ("Inscribir", 20, 140, 120, 32), "inscribir")\n   esperar_eventos ()\nfin\n\nsubrutina inscribir (id : numerico)\ninicio\nfin\n',
      pruebas: [
        { nombre: 'Sin nombre', pasos: [['clic', 'boton', 0]], espera: [['mensajes', ['Falta el nombre']]] },
        {
          nombre: 'Menor de edad',
          pasos: [['escribir', 0, 'Ana'], ['escribir', 1, '15'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Tenes que ser mayor de edad']]]
        },
        {
          nombre: 'Sin aceptar',
          pasos: [['escribir', 0, 'Ana'], ['escribir', 1, '20'], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Falta aceptar']]]
        },
        {
          nombre: 'Todo bien',
          pasos: [['escribir', 0, 'Ana'], ['escribir', 1, '20'], ['marcar', 0, true], ['clic', 'boton', 0]],
          espera: [['mensajes', ['Inscripto: Ana']]]
        }
      ]
    },
    {
      id: 'v48', nivel: 'avanzado', titulo: 'El editor de píxeles',
      enunciado: 'Un lienzo de 200 × 200 dividido en celdas de <strong>20 × 20</strong>. Al hacer clic en el lienzo hay que pintar la celda donde cayó el clic: un rectángulo relleno negro <code>(0, 0, 0)</code> en <code>(int (x / 20) × 20, int (y / 20) × 20)</code> de 20 × 20.',
      pista: '<code>raton_x ()</code> y <code>raton_y ()</code> dan dónde cayó el último clic, en coordenadas del lienzo. Dividir por 20, quedarse con la parte entera y volver a multiplicar por 20 es el truco de siempre para «pegar» algo a una cuadrícula.',
      plantilla: 'var\n   l = 0\ninicio\n   ventana ("Pixeles", 260, 260)\n   l = lienzo (20, 20, 200, 200)\n   al_hacer_clic (l, "pintar")\n   esperar_eventos ()\nfin\n\nsubrutina pintar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Un clic en (45, 65) pinta la celda (40, 60)',
          pasos: [['raton', 45, 65], ['clic', 'lienzo', 0]],
          espera: [['dibujo', 'rectangulo', [40, 60, 20, 20]], ['dibujo', 'relleno', [{ r: 0, g: 0, b: 0 }]]]
        },
        {
          nombre: 'Dos clics, dos celdas',
          pasos: [['raton', 5, 5], ['clic', 'lienzo', 0], ['raton', 190, 190], ['clic', 'lienzo', 0]],
          espera: [['dibujo', 'rectangulo', [0, 0, 20, 20]],
            ['dibujo', 'rectangulo', [180, 180, 20, 20]], ['dibujos', 'rectangulo', 2]]
        }
      ]
    },
    {
      id: 'v49', nivel: 'avanzado', titulo: 'Mini paint',
      enunciado: 'Un lienzo de 240 × 200, un deslizador para el grosor y tres botones de color: <code>Negro</code> <code>(0, 0, 0)</code>, <code>Verde</code> <code>(0, 160, 0)</code> y <code>Rojo</code> <code>(220, 0, 0)</code>.<br>Al hacer clic en el lienzo hay que dibujar un círculo relleno del color elegido, con el centro donde cayó el clic y el <strong>radio igual al valor del deslizador</strong> (y 5 mientras no se lo haya tocado). El color arranca en negro.',
      pista: 'Tres variables globales <code>(r, g, b)</code> guardan el color elegido; cada botón las cambia y el clic en el lienzo las usa. El estado del programa vive en las variables, no en la pantalla.',
      plantilla: 'var\n   l = 0\n   d = 0\n   cr = 0\n   cg = 0\n   cb = 0\ninicio\n   ventana ("Mini paint", 420, 300)\n   l = lienzo (20, 20, 240, 200)\n   d = deslizador (20, 240, 200, 24)\n   cr = 0\n   cg = 0\n   cb = 0\n   al_hacer_clic (l, "pintar")\n   al_hacer_clic (boton ("Negro", 280, 20, 100, 28), "negro")\n   al_hacer_clic (boton ("Verde", 280, 60, 100, 28), "verde")\n   al_hacer_clic (boton ("Rojo", 280, 100, 100, 28), "rojo")\n   esperar_eventos ()\nfin\n\nsubrutina pintar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Sin tocar nada: negro y radio 5',
          pasos: [['raton', 100, 50], ['clic', 'lienzo', 0]],
          espera: [['dibujo', 'circulo', [100, 50, 5]], ['dibujo', 'relleno', [{ r: 0, g: 0, b: 0 }]]]
        },
        {
          nombre: 'Verde con grosor 10',
          pasos: [['clic', 'boton', 1], ['deslizar', 0, 10], ['raton', 60, 80], ['clic', 'lienzo', 0]],
          espera: [['dibujo', 'circulo', [60, 80, 10]], ['dibujo', 'relleno', [{ r: 0, g: 160, b: 0 }]]]
        },
        {
          nombre: 'Y el rojo pisa al verde',
          pasos: [['clic', 'boton', 1], ['clic', 'boton', 2], ['deslizar', 0, 3],
            ['raton', 10, 10], ['clic', 'lienzo', 0]],
          espera: [['dibujo', 'circulo', [10, 10, 3]], ['dibujo', 'relleno', [{ r: 220, g: 0, b: 0 }]],
            ['dibujos', 'circulo', 1]]
        }
      ]
    },
    {
      id: 'v50', nivel: 'avanzado', titulo: 'El botón escurridizo',
      enunciado: 'Una etiqueta con el puntaje (arranca en <code>0</code>) y un botón <code>Tocame</code>. Cada clic suma un punto <strong>y</strong> mueve el botón a una posición nueva: <code>x = 20 + (puntaje × 37) % 200</code> y <code>y = 40 + (puntaje × 53) % 120</code>, calculadas con el puntaje <em>ya sumado</em>.<br>Al llegar a <strong>5</strong> puntos hay que mostrar el mensaje <code>Ganaste!</code> y deshabilitar el botón.',
      pista: 'Junta todo lo del curso: una variable que sobrevive entre eventos, cuentas con el resto, <code>mover()</code>, <code>poner_texto()</code> y un <code>si</code> final. El orden importa: primero sumar, después mover.',
      plantilla: 'var\n   e = 0\n   b = 0\n   p = 0\ninicio\n   ventana ("Tocame", 320, 220)\n   p = 0\n   e = etiqueta ("0", 20, 10)\n   b = boton ("Tocame", 20, 40, 90, 30)\n   al_hacer_clic (b, "tocar")\n   esperar_eventos ()\nfin\n\nsubrutina tocar (id : numerico)\ninicio\nfin\n',
      pruebas: [
        {
          nombre: 'Un clic: un punto y el botón se corrió',
          pasos: [['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '1'], ['posicion', 'boton', 0, 57, 93], ['mensajes', []]]
        },
        {
          nombre: 'Tres clics',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '3'], ['posicion', 'boton', 0, 131, 79], ['habilitado', 'boton', 0, true]]
        },
        {
          nombre: 'Cinco clics: se gana y el botón se apaga',
          pasos: [['clic', 'boton', 0], ['clic', 'boton', 0], ['clic', 'boton', 0],
            ['clic', 'boton', 0], ['clic', 'boton', 0]],
          espera: [['texto', 'etiqueta', 0, '5'], ['mensajes', ['Ganaste!']], ['habilitado', 'boton', 0, false]]
        }
      ]
    }
  ];

  global.CURSO_VISUAL = { EJERCICIOS };
})(typeof window !== 'undefined' ? window : globalThis);

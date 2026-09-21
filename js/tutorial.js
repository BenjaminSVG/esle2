/*
 * El tutorial de la interfaz: qué hay en la pantalla y para qué sirve cada cosa.
 *
 * ESLE2 tiene cuatro entornos y, entre todos, más de cien botones. La
 * bienvenida (js/bienvenida.js) son cuatro carteles que aparecen UNA vez para
 * que alguien pueda arrancar; esto es lo otro: la referencia completa, que se
 * abre cuando la persona quiere y se puede volver a mirar mil veces.
 *
 * Va con capturas de la interfaz de verdad —las saca tools/capturar-tutorial.js
 * con Playwright— porque «el botón Ver» dicho con palabras no le sirve a quien
 * todavía no sabe dónde mirar. La captura muestra dónde está; el texto de al
 * lado dice qué hace, cuándo conviene usarlo y qué necesita.
 *
 * Este archivo es solo datos y las funciones que los arman: no toca el DOM, así
 * que se puede probar en Node (test/test-tutorial.js). El diálogo está en
 * js/tutorial-ui.js.
 *
 * API:  Tutorial.entornoDe('visual.html')
 *       Tutorial.secciones('visual')      · las secciones ya resueltas
 *       Tutorial.capturas()               · rutas de todas las imágenes
 *       Tutorial.ENTORNOS · Tutorial.CONTROLES · Tutorial.SECCIONES
 */
(function (global) {
  'use strict';

  const CARPETA = 'img/tutorial/';

  /* ------------------------------------------------------------------ */
  /* Los entornos                                                        */
  /* ------------------------------------------------------------------ */
  const ENTORNOS = {
    clasico: { pagina: 'index.html', nombre: 'ESLE2', que: 'el lenguaje SLE2 de siempre' },
    poo: { pagina: 'poo.html', nombre: 'ESLE2 POO', que: 'el mismo lenguaje con clases y objetos' },
    visual: { pagina: 'visual.html', nombre: 'ESLE2 Visual', que: 'ventanas, controles y dibujo' },
    bd: { pagina: 'bd.html', nombre: 'ESLE2 BD', que: 'bases de datos y SQL en español' }
  };

  /* La página manda: es lo único que se sabe con certeza desde el navegador. */
  function entornoDe(archivo) {
    const hoja = String(archivo || '').split('/').pop().split('?')[0] || 'index.html';
    for (const id of Object.keys(ENTORNOS)) if (ENTORNOS[id].pagina === hoja) return id;
    return 'clasico';
  }

  /* ------------------------------------------------------------------ */
  /* Los controles                                                       */
  /* ------------------------------------------------------------------ */
  /* Uno por cosa con la que se puede interactuar. El texto dice qué hace,
     cuándo usarlo y qué necesita; repetir el nombre del botón no ayuda a
     nadie. Lo que borra algo se avisa acá mismo, no en una nota al pie. */
  const CONTROLES = {
    /* --------------------------- barra de arriba ---------------------- */
    vistaIde: { nombre: 'IDE', que: 'La pantalla donde escribís y ejecutás. Es la que ves al entrar.' },
    vistaCurso: { nombre: 'Curso', que: 'Los ejercicios que se corrigen solos. Tu programa queda donde estaba: volvés a IDE y sigue ahí.' },
    pestDoc: { nombre: 'Documentación', que: 'Todo el lenguaje explicado, con buscador. Se abre en la misma pestaña y ESLE2 se acuerda de tu programa.' },
    pestDialecto: { nombre: 'ESLE2 POO · Visual · BD', que: 'Los otros tres entornos. Son el mismo lenguaje con cosas agregadas: cada uno tiene su curso y su documentación aparte.' },
    pestDiseno: { nombre: 'Diseño', que: 'Colores, tipografía y tamaño de la interfaz. Se guarda en este navegador y vale para todo el sitio.' },
    racha: { nombre: 'La racha', que: 'Días seguidos resolviendo al menos un ejercicio. Aparece recién cuando llevás dos.' },
    progresoGlobal: { nombre: 'El avance', que: 'Cuántos ejercicios del curso llevás resueltos. Vive en una cookie de este navegador.' },
    btnInstalar: { nombre: 'Instalar', que: 'Deja ESLE2 como una aplicación del sistema, con su icono y su ventana. Aparece solo si el navegador lo ofrece: no está en todos.' },
    btnBuscar: { nombre: 'Buscar', atajo: 'Ctrl + K', que: 'Busca en todo ESLE2 a la vez: funciones, ejercicios, temas de la documentación. Es la forma más rápida de llegar a cualquier lado.' },
    btnProyectar: { nombre: 'Proyectar', atajo: 'Ctrl + Shift + P', que: 'Agranda la letra y esconde lo que no se mira desde el fondo del aula. Para dar clase con el proyector.' },
    btnSonido: { nombre: 'El parlante', que: 'Prende y apaga los sonidos cortitos de ESLE2 (ejecutar, acertar, error).' },
    btnTema: { nombre: 'La luna', que: 'Cambia entre claro y oscuro. Cada uno tiene su propia configuración en Diseño.' },
    btnTutorial: { nombre: 'Tutorial', que: 'Este mismo cuadro. Está siempre, también dentro del Curso, y no cambia nada de lo que tenías hecho.' },

    /* ---------------------------- herramientas ------------------------ */
    btnEjecutar: { nombre: 'Ejecutar', atajo: 'Ctrl + Enter', que: 'Corre el programa de arriba a abajo. Si pide datos y no hay nada en Entrada de datos, te los pregunta en la pantalla.' },
    btnCompilar: { nombre: 'Revisar', que: 'Busca errores de sintaxis sin ejecutar nada, y además marca recomendaciones (una variable que nunca se usa, por ejemplo).' },
    btnDepurar: { nombre: 'Depurar', atajo: 'F9', que: 'Arranca el programa en pausa, sentencia por sentencia: se ve la línea marcada y el panel Variables con lo que hay en cada una.' },
    btnGrabar: { nombre: 'Grabar ejecución', que: 'Corre el programa entero de una y después te deja ir para atrás y para adelante con una barra, como un video. Sirve cuando el error pasó y no sabés dónde.' },
    btnDetener: { nombre: 'Detener', atajo: 'Esc', que: 'Corta el programa. Aparece recién cuando hay algo corriendo; es lo que se usa cuando un ciclo no termina nunca.' },
    btnPaso: { nombre: 'Paso', atajo: 'F10', que: 'Ejecuta la sentencia marcada y para en la siguiente. Solo mientras depurás.' },
    btnContinuar: { nombre: 'Continuar', atajo: 'F8', que: 'Suelta el programa: sigue sin pausas hasta terminar. Solo mientras depurás.' },
    estado: { nombre: 'El estado', que: 'Dice en qué anda ESLE2: listo, ejecutando, en pausa, o el error que encontró.' },
    btnDisenar: { nombre: 'Diseñar', atajo: 'Ctrl + Shift + D', que: 'Acomodá los controles arrastrándolos con el mouse; ESLE2 reescribe los números de tu propio programa. No hay archivo de diseño aparte.' },
    btnVentana: { nombre: 'Ventana', atajo: 'Ctrl + Shift + V', que: 'Muestra la ventana del programa sin volver a ejecutarlo. Cerrarla con Esc no corta nada: el programa sigue esperando eventos.' },

    /* ------------------------------ archivo --------------------------- */
    btnNuevo: { nombre: 'Nuevo', que: 'Deja el editor con un programa vacío. Lo que tenías queda guardado en el historial de versiones, así que no se pierde.' },
    btnAbrir: { nombre: 'Abrir…', que: 'Trae un archivo de tu computadora al editor.' },
    btnGuardar: { nombre: 'Guardar', atajo: 'Ctrl + S', que: 'Baja el programa como archivo a tu computadora. ESLE2 ya lo guarda solo en el navegador; esto es para llevártelo.' },
    btnCompartir: { nombre: 'Compartir', que: 'Copia un enlace con el programa adentro. No se sube nada a ningún lado: el programa viaja en el propio enlace.' },
    btnJuntos: { nombre: 'Programar en grupo…', que: 'Dos personas, o toda la clase, escriben el mismo programa cada uno desde su computadora. Con el servidor de la escuela necesita internet; de a dos también se puede sin ningún servidor, pasándose un código a mano.' },
    btnVivo: { nombre: 'Transmitir mi lógica…', que: 'Un enlace corto para que otros vean, en el momento, cómo vas escribiendo. Para mostrar en clase. Necesita internet.' },
    btnArchivos: { nombre: 'Archivos…', que: 'Los archivos de mentira que viven en la memoria del navegador: de ahí lee set_stdin() y ahí escribe set_stdout().' },
    selPlantillas: { nombre: 'Plantillas', que: 'Pega un esqueleto en el cursor —un ciclo, una subrutina— para no arrancar de la hoja en blanco.' },
    selEjemplos: { nombre: 'Ejemplos', que: 'Programas completos que andan. Pisan lo que tengas en el editor, pero antes queda una copia en el historial.' },

    /* -------------------------------- ver ----------------------------- */
    btnExplorador: { nombre: 'Explorador de archivos', que: 'Abre el panel de la izquierda para tener varios programas a la vez en el navegador.' },
    btnAjustar: { nombre: 'Ajustar texto', atajo: 'Alt + Z', que: 'Corta las líneas largas al ancho del panel en vez de dejarlas irse para el costado.' },
    btnEnfoque: { nombre: 'Modo enfoque', atajo: 'Alt + E', que: 'Deja solo el editor, sin menús ni paneles, con música de fondo si querés.' },
    btnFlexible: { nombre: 'Modo flexible', que: 'Compila aunque haya errores y te los muestra todos juntos, en vez de parar en el primero. Para cuando reescribiste medio programa.' },
    btnDiagrama: { nombre: 'Diagrama de flujo', que: 'Dibuja el programa con las formas de siempre —óvalo, rectángulo, romboide, rombo— y al lado lo cuenta en palabras. Se puede bajar en .svg.' },
    btnEditorDiagrama: { nombre: 'Editor de diagramas', que: 'Al revés: armás el diagrama con bloques y el programa sale solo. Adentro de cada bloque se escribe SLE2 tal cual.' },
    btnMemoria: { nombre: 'Simulador de memoria', que: 'Cada variable como una caja con su dirección y su tipo, y una línea de tiempo para ver nacer, cambiar y morir cada una.' },
    btnEscritorio: { nombre: 'Prueba de escritorio', que: 'La tabla del pizarrón: una fila por sentencia ejecutada, una columna por variable, y el valor solo cuando cambia. Se copia y se baja en .csv.' },
    btnHistorial: { nombre: 'Historial de versiones', que: 'Las copias que ESLE2 va guardando solo cada vez que ejecutás y antes de cualquier cosa que pise el editor. Volver atrás nunca te hace perder lo de ahora.' },
    btnDisposicion: { nombre: 'Restablecer los paneles', que: 'Devuelve los paneles al tamaño de fábrica, por si los arrastraste hasta dejarlos impracticables.' },
    argumentos: { nombre: 'Argumentos', que: 'Lo que devuelven paramval() y pcount(): los parámetros con los que «se llamó» al programa.' },
    btnEsquema: { nombre: 'Esquema de la base', que: 'Muestra u oculta el panel con las tablas que hay en la base.' },

    /* ----------------------------- traducir --------------------------- */
    traducir: { nombre: 'A JavaScript, Python, Java, C, C++, C#', que: 'El mismo programa escrito en otro lenguaje, para ver que el pseudocódigo no era un idioma aparte. Se copia y se baja como archivo.' },
    traducirPoo: { nombre: 'A Python y a Java', que: 'Las clases y los objetos de tu programa, escritos en dos lenguajes donde eso mismo se usa todos los días.' },

    /* ----------------------------- insertar --------------------------- */
    insertarControles: { nombre: 'Controles', que: 'Pega en el cursor el código que crea un botón, una caja de texto, una lista. No dibuja nada: escribe el programa que lo dibuja.' },
    insertarDibujo: { nombre: 'Dibujo en el lienzo', que: 'Lo mismo para las líneas, los círculos y los rectángulos del lienzo.' },

    /* -------------------------------- base ---------------------------- */
    btnVaciar: { nombre: 'Vaciar la base', que: 'Borra todas las tablas y sus datos, y no se puede deshacer. Tu programa queda intacto.' },
    btnEjemploBase: { nombre: 'Datos de ejemplo', que: 'Crea unas tablas con datos para practicar consultas sin tener que cargar nada a mano.' },
    btnImportarSQL: { nombre: 'Importar .sql…', que: 'Carga un volcado .sql de tu computadora. Entiende también los que salieron de SQLite, MySQL o PostgreSQL.' },
    btnDiagramaBD: { nombre: 'Diagrama de la base', que: 'Una caja por tabla, la llave marca la clave primaria y la flecha, la columna que apunta a otra tabla.' },
    btnEditorBD: { nombre: 'Dibujar el diagrama…', que: 'Dibujás las tablas y sus relaciones, y el CREAR TABLA sale solo, en orden de creación.' },
    exportarBD: { nombre: 'A SQLite, MySQL, PostgreSQL', que: 'Baja la base entera como un .sql que esos motores entienden, para seguir en la herramienta de la materia.' },

    /* ------------------------------ paneles --------------------------- */
    editor: { nombre: 'El editor', que: 'Acá se escribe. Colorea el código, empareja las llaves, completa solo mientras escribís y marca los errores en el margen. Se guarda en este navegador a cada tecla.' },
    tituloArchivo: { nombre: 'El nombre del archivo', que: 'Qué programa estás editando. Con el explorador abierto, cambia según el que elijas.' },
    posCursor: { nombre: 'Línea y columna', que: 'Dónde está el cursor. Cuando ESLE2 te dice «error en la línea 12», es este número.' },
    entrada: { nombre: 'Entrada de datos', que: 'Lo que va a consumir leer(), una línea por lectura. Si se acaba, ESLE2 te lo pide por pantalla. Sirve para no tipear lo mismo en cada prueba.' },
    consola: { nombre: 'La pantalla', que: 'Lo que escribe tu programa, y donde le contestás cuando pregunta algo. Los errores salen acá, con la línea.' },
    btnLimpiar: { nombre: 'Limpiar', que: 'Vacía la pantalla. No toca el programa ni la base.' },
    lienzo: { nombre: 'El lienzo', que: 'Aparece cuando el programa dibuja: dibujar_pixel(), dibujar_rectangulo(), dibujar_circulo(), dibujar_linea().' },
    variables: { nombre: 'Variables', que: 'Mientras depurás, cada variable viva con lo que tiene adentro. Las de una subrutina se van cuando la subrutina termina.' },
    explorador: { nombre: 'El explorador', que: 'Varios programas a la vez, con carpetas dentro de carpetas. El botón ⋮ de cada fila abre nuevo, renombrar y borrar. Viven en el navegador: para llevártelos, Exportar.' },
    arbolControles: { nombre: 'Controles', que: 'Lo que creó tu programa: la ventana y todo lo que tiene adentro, en forma de árbol. Al elegir uno se ven sus propiedades al lado.' },
    esquema: { nombre: 'La base', que: 'Las tablas que hay ahora mismo, con sus columnas y sus claves. Se actualiza sola cada vez que ejecutás.' },
    sqlRapido: { nombre: 'SQL a mano', atajo: 'Ctrl + Enter', que: 'Probá una consulta suelta sin tocar el programa. Anda sobre la misma base, así que lo que borres acá se borra de verdad.' },

    /* ------------------------------- curso ---------------------------- */
    filtros: { nombre: 'Los filtros', que: 'Muestran solo los ejercicios de un nivel. Empezá por Fácil: están ordenados a propósito.' },
    listaEjercicios: { nombre: 'La lista', que: 'El enunciado se abre al lado. Los resueltos quedan marcados; el avance vive en una cookie de este navegador.' },
    btnVerificar: { nombre: 'Verificar solución', que: 'Corre tu programa con varios juegos de datos y compara el resultado. Si algo no da, te dice con qué datos falló.' },
    btnSalirEjercicio: { nombre: 'Salir del ejercicio', que: 'Vuelve a tu programa de antes. No pierde lo que escribiste: queda en el historial.' },
    btnExamen: { nombre: 'Modo examen…', que: 'Arma una prueba con los ejercicios que elijas y la corrige al final, sin pistas ni soluciones a mano.' },
    btnMisEj: { nombre: 'Mis ejercicios…', que: 'Crear tus propios ejercicios, con sus datos de prueba, y repartirlos como enlace.' },
    btnAula: { nombre: 'Modo aula…', que: 'Una guía de clase —varios ejercicios en orden— que se reparte con un solo enlace.' },
    btnPerfil: { nombre: 'Usuarios', que: 'Creá tu usuario con contraseña para separar tus trabajos en este navegador. Desde acá también podés cambiar la contraseña, cerrar sesión o crear otro usuario.' },
    btnDuelo: { nombre: 'Batallas de código…', que: 'Dos personas, el mismo problema, cinco minutos. Necesita internet.' },
    btnExportar: { nombre: 'Exportar', que: 'Baja un archivo con tu avance del curso, para pasarlo a otra computadora o guardarlo antes de formatear.' },
    btnImportar: { nombre: 'Importar…', que: 'Carga uno de esos archivos. Lo que traiga se suma a lo que ya tenías.' },
    btnReiniciar: { nombre: 'Reiniciar progreso', que: 'Borra todo tu avance del curso. No se puede deshacer; si querés guardarlo, exportalo antes.' },
    btnReiniciarBD: { nombre: 'Reiniciar progreso', que: 'Borra tu avance en los 50 ejercicios de BD y no se puede deshacer. La base de datos no se toca: para eso está Vaciar la base.' },

    /* ----------------------------- diálogos --------------------------- */
    dlgArchivos: { nombre: 'Archivos del programa', que: 'Se crean, se escriben a mano, se suben desde tu computadora y se bajan. Lo que quede sin bajar se pierde al recargar la página.' },
    dlgTraduccion: { nombre: 'La traducción', que: 'El mismo programa en otro lenguaje, listo para copiar o bajar como archivo.' },
    dlgDiagrama: { nombre: 'El diagrama', que: 'El dibujo a la izquierda y el mismo diagrama contado en palabras a la derecha, para quien lea con lector de pantalla o quiera pegarlo en un informe.' },
    dlgEditorDiagrama: { nombre: 'Los bloques', que: 'Cada bloque es una sentencia; el dibujo de la derecha es el diagrama del programa que estás generando, no un dibujo aparte.' },
    dlgEscritorio: { nombre: 'La tabla', que: 'Una fila por sentencia ejecutada. Las locales de una subrutina llevan su nombre adelante (sumar.i) y un guion largo marca dónde deja de existir la caja.' },
    dlgMemoria: { nombre: 'El mapa y la línea de tiempo', que: 'Los botones de abajo recorren el programa paso a paso. Las direcciones y los tamaños son los de manual, no los que usa el navegador por dentro.' },
    dlgHistorial: { nombre: 'Las versiones', que: 'Elegí una de la lista y mirá las diferencias con lo de ahora antes de restaurarla. Al restaurar también se guarda lo que tenías.' },
    dlgVentana: { nombre: 'La ventana del programa', que: 'Lo que ve quien usa tu programa. Se cierra con Esc, y eso no lo corta: para cortarlo está Detener.' },
    dlgExportarBD: { nombre: 'El volcado', que: 'El SQL que crea las tablas y mete los datos, listo para copiar o bajar.' },
    dlgDiagramaBD: { nombre: 'El diagrama de la base', que: 'El dibujo y su descripción en palabras. El dibujo se baja en .svg.' },
    dlgEditorBD: { nombre: 'Las tablas', que: 'Agregás tablas y columnas de un lado y el código aparece del otro. «Escribirlo en el programa» lo pega en el editor.' },
    buscador: { nombre: 'El buscador', atajo: 'Ctrl + K', que: 'Escribí cualquier cosa —una función, un tema, un ejercicio— y te lleva. Se maneja con las flechas y Enter.' }
  };

  /* ------------------------------------------------------------------ */
  /* Las secciones                                                       */
  /* ------------------------------------------------------------------ */
  /* `capturas` dice qué imagen le toca a cada entorno: si un entorno no
     figura, esa sección no aparece ahí. Dos entornos pueden compartir el
     mismo archivo cuando la parte que se muestra es idéntica —el diálogo del
     historial, por ejemplo—, pero nunca «parecida». */
  const SECCIONES = [
    {
      id: 'barra',
      titulo: 'La barra de arriba',
      texto: 'Está en todas las pantallas: las pestañas llevan de un lado a otro y los botones de la derecha ' +
        'valen para todo el sitio. En una pantalla angosta las pestañas bajan a una fila propia, pero son las mismas. ' +
        'Cambiar de pestaña no ejecuta nada ni pierde tu programa.',
      capturas: { clasico: 'barra-clasico.png', poo: 'barra-poo.png', visual: 'barra-visual.png', bd: 'barra-bd.png' },
      alt: 'La barra de arriba: el logo, las pestañas y los botones de la derecha.',
      controles: ['vistaIde', 'vistaCurso', 'pestDoc', 'pestDialecto', 'pestDiseno', 'racha', 'progresoGlobal',
        'btnInstalar', 'btnBuscar', 'btnProyectar', 'btnPerfil', 'btnSonido', 'btnTema', 'btnTutorial'],
      cambios: { bd: { quitar: ['racha', 'progresoGlobal'] } }
    },
    {
      id: 'herramientas',
      titulo: 'Los botones de ejecutar',
      texto: 'La fila de arriba del editor. Los tres primeros son los de todos los días; los de la pausa aparecen solos cuando hacen falta.',
      capturas: { clasico: 'herramientas-clasico.png', poo: 'herramientas-poo.png', visual: 'herramientas-visual.png', bd: 'herramientas-bd.png' },
      alt: 'La fila de botones: Ejecutar, Revisar, Depurar y los menús.',
      controles: ['btnEjecutar', 'btnCompilar', 'btnDepurar', 'btnGrabar', 'btnDetener', 'estado'],
      cambios: {
        visual: { quitar: ['btnGrabar'], agregar: ['btnDisenar', 'btnVentana'] },
        bd: { quitar: ['btnGrabar'] }
      }
    },
    {
      id: 'pausa',
      titulo: 'Cuando el programa está en pausa',
      texto: 'Con Depurar el programa arranca detenido: se marca la línea que viene, aparece el panel Variables y la fila de botones cambia. ' +
        'Es la forma de ver por qué un ciclo no termina o por qué una cuenta da cualquier cosa.',
      capturas: { clasico: 'pausa.png', poo: 'pausa.png', visual: 'pausa.png', bd: 'pausa.png' },
      alt: 'La fila de botones durante la pausa: Detener, Paso y Continuar a la vista.',
      controles: ['btnPaso', 'btnContinuar', 'btnDetener', 'variables']
    },
    {
      id: 'menu-archivo',
      titulo: 'El menú Archivo',
      texto: 'Traer y llevar programas. ESLE2 guarda solo lo que escribís en este navegador, así que esto es para lo otro: ' +
        'pasar el programa a un archivo, a un enlace o a otra persona.',
      capturas: { clasico: 'menu-archivo-clasico.png', poo: 'menu-archivo-poo.png', visual: 'menu-archivo-visual.png', bd: 'menu-archivo-bd.png' },
      alt: 'El menú Archivo abierto, con sus opciones.',
      controles: ['btnNuevo', 'btnAbrir', 'btnGuardar', 'btnCompartir', 'btnJuntos', 'btnVivo', 'btnArchivos', 'selPlantillas', 'selEjemplos'],
      cambios: {
        poo: { quitar: ['btnNuevo', 'btnAbrir', 'btnArchivos', 'selPlantillas'] },
        visual: { quitar: ['btnJuntos', 'btnVivo', 'selPlantillas'] },
        bd: { quitar: ['btnJuntos', 'btnVivo', 'btnArchivos', 'selPlantillas'] }
      }
    },
    {
      id: 'menu-ver',
      titulo: 'El menú Ver',
      texto: 'Las herramientas para entender el programa, no para escribirlo. Casi todas abren un cuadro aparte y ninguna toca tu código.',
      capturas: { clasico: 'menu-ver-clasico.png', poo: 'menu-ver-poo.png', visual: 'menu-ver-visual.png', bd: 'menu-ver-bd.png' },
      alt: 'El menú Ver abierto, con sus opciones.',
      controles: ['btnExplorador', 'btnAjustar', 'btnEnfoque', 'btnFlexible', 'btnDiagrama', 'btnEditorDiagrama',
        'btnMemoria', 'btnEscritorio', 'btnHistorial', 'btnDisposicion', 'argumentos'],
      cambios: {
        poo: { quitar: ['argumentos'] },
        visual: { quitar: ['btnEnfoque'] },
        bd: { quitar: ['btnExplorador', 'btnEnfoque', 'btnDiagrama', 'btnEditorDiagrama', 'btnMemoria', 'btnEscritorio', 'btnHistorial', 'argumentos'], agregar: ['btnEsquema'] }
      }
    },
    {
      id: 'menu-traducir',
      titulo: 'El menú Traducir',
      texto: 'El mismo programa, escrito en un lenguaje de los que se usan afuera. Sirve para ver que lo que aprendiste no era un idioma inventado: ' +
        'cambia cómo se escribe, no lo que hace.',
      capturas: { clasico: 'menu-traducir-clasico.png', poo: 'menu-traducir-poo.png' },
      alt: 'El menú Traducir abierto.',
      controles: ['traducir'],
      cambios: { poo: { quitar: ['traducir'], agregar: ['traducirPoo'] } }
    },
    {
      id: 'menu-insertar',
      titulo: 'El menú Insertar',
      texto: 'Pega en el cursor el código de un control o de un dibujo. No arrastra nada a la ventana: escribe el programa que crea esa cosa, ' +
        'que es lo que después vas a tener que saber escribir.',
      capturas: { visual: 'menu-insertar.png' },
      alt: 'El menú Insertar abierto, con la rejilla de controles y la de dibujo.',
      controles: ['insertarControles', 'insertarDibujo']
    },
    {
      id: 'menu-base',
      titulo: 'El menú Base',
      texto: 'La base de datos vive en el navegador y sobrevive a recargar la página. Estos botones la llenan, la vacían y la dibujan.',
      capturas: { bd: 'menu-base.png' },
      alt: 'El menú Base abierto, con sus opciones.',
      controles: ['btnVaciar', 'btnEjemploBase', 'btnImportarSQL', 'btnDiagramaBD', 'btnEditorBD']
    },
    {
      id: 'menu-exportar',
      titulo: 'El menú Exportar',
      texto: 'Tu base entera como un archivo .sql que otro motor entiende. Lo que cambia entre las tres opciones son los tipos y las comillas, no tus datos.',
      capturas: { bd: 'menu-exportar.png' },
      alt: 'El menú Exportar abierto, con SQLite, MySQL y PostgreSQL.',
      controles: ['exportarBD']
    },
    {
      id: 'editor',
      titulo: 'El editor',
      texto: 'El panel grande, donde se escribe el programa. Lo que escribís se guarda solo en este navegador a cada tecla: ' +
        'podés cerrar la pestaña y volver.',
      capturas: { clasico: 'editor-clasico.png', poo: 'editor-poo.png', visual: 'editor-visual.png', bd: 'editor-bd.png' },
      alt: 'El panel del editor con un programa escrito.',
      controles: ['editor', 'tituloArchivo', 'posCursor']
    },
    {
      id: 'entrada',
      titulo: 'La entrada de datos',
      texto: 'Los datos que tu programa va a leer, escritos de antemano. Sin esto, cada prueba te obliga a tipear todo de nuevo. ' +
        'En Visual y en BD el panel está escondido hasta que hace falta: se prende desde el menú Ver.',
      capturas: { clasico: 'entrada.png', poo: 'entrada.png' },
      alt: 'El panel Entrada de datos con tres líneas escritas.',
      controles: ['entrada']
    },
    {
      id: 'salida',
      titulo: 'La pantalla',
      texto: 'Todo lo que el programa escribe sale acá, y acá mismo le contestás cuando pregunta algo. ' +
        'Los errores también salen acá, con el número de línea.',
      capturas: { clasico: 'salida-clasico.png', poo: 'salida-poo.png', visual: 'salida-visual.png', bd: 'salida-bd.png' },
      alt: 'El panel de la pantalla con la salida de un programa.',
      controles: ['consola', 'btnLimpiar']
    },
    {
      id: 'lienzo',
      titulo: 'El lienzo',
      texto: 'Aparece solo cuando el programa dibuja algo. Es un dibujo de verdad, con coordenadas: (0, 0) es la esquina de arriba a la izquierda.',
      capturas: { clasico: 'lienzo.png' },
      alt: 'El panel del lienzo con un dibujo hecho por el programa.',
      controles: ['lienzo']
    },
    {
      id: 'explorador',
      titulo: 'El explorador de archivos',
      texto: 'Varios programas a la vez, con carpetas dentro de carpetas, como en un editor de verdad. Se prende ' +
        'desde el menú Ver. Cada fila tiene su botón ⋮: ahí está renombrar, borrar, y para una carpeta también ' +
        'crear algo adentro. Arriba, junto a Importar, está Exportar: baja el proyecto entero en un solo archivo. ' +
        'Los archivos viven en este navegador: para llevártelos hay que exportarlos.',
      capturas: { clasico: 'explorador.png', poo: 'explorador.png', visual: 'explorador.png' },
      alt: 'El panel del explorador con una carpeta y dos archivos.',
      controles: ['explorador']
    },
    {
      id: 'controles-visual',
      titulo: 'El panel de controles',
      texto: 'Mientras el programa corre, acá está todo lo que creó: la ventana y sus botones, etiquetas y cajas. ' +
        'Al elegir uno se ven sus propiedades, que son las mismas que devuelve dar_propiedad().',
      capturas: { visual: 'controles-visual.png' },
      alt: 'El panel Controles con el árbol de la ventana y las propiedades del control elegido.',
      controles: ['arbolControles']
    },
    {
      id: 'ventana-visual',
      titulo: 'La ventana del programa',
      texto: 'Lo que ve quien usa tu programa. Se abre sola al ejecutar y se puede volver a mirar con el botón Ventana.',
      capturas: { visual: 'ventana-visual.png' },
      alt: 'La ventana del programa, con sus controles.',
      controles: ['dlgVentana', 'btnVentana']
    },
    {
      id: 'esquema-bd',
      titulo: 'El panel de la base',
      texto: 'Qué tablas hay ahora mismo, con sus columnas, sus tipos y sus claves. Se actualiza cada vez que ejecutás: ' +
        'si una tabla no aparece, es que tu CREAR TABLA no llegó a correr.',
      capturas: { bd: 'esquema-bd.png' },
      alt: 'El panel La base con dos tablas y sus columnas.',
      controles: ['esquema']
    },
    {
      id: 'sql-rapido',
      titulo: 'SQL a mano',
      texto: 'Una consulta suelta, sin tocar el programa. Es el panel que más se usa cuando se está aprendiendo a consultar: ' +
        'escribís, Ctrl + Enter, y ves la tabla que vuelve.',
      capturas: { bd: 'sql-rapido.png' },
      alt: 'El panel SQL a mano con una consulta escrita y el botón Correr.',
      controles: ['sqlRapido']
    },
    {
      id: 'curso',
      titulo: 'El curso',
      texto: 'Ejercicios que se corrigen solos: ESLE2 corre tu programa con varios juegos de datos y compara el resultado. ' +
        'Cada uno se abre en el IDE y se vuelve con «Salir del ejercicio». ' +
        'Debajo de la lista está «Más formas de practicar» y, más abajo, «Tu progreso»: hay que bajar para verlos.',
      capturas: { clasico: 'curso-clasico.png', poo: 'curso-poo.png', visual: 'curso-visual.png', bd: 'curso-bd.png' },
      alt: 'La pantalla del curso: la lista de ejercicios a la izquierda y el enunciado a la derecha.',
      controles: ['filtros', 'listaEjercicios', 'btnExamen', 'btnMisEj', 'btnAula', 'btnDuelo',
        'btnExportar', 'btnImportar', 'btnReiniciar'],
      cambios: {
        visual: { quitar: ['btnMisEj', 'btnDuelo'] },
        bd: {
          quitar: ['btnExamen', 'btnMisEj', 'btnAula', 'btnDuelo', 'btnExportar', 'btnImportar', 'btnReiniciar'],
          agregar: ['btnReiniciarBD']
        }
      }
    },
    {
      id: 'ejercicio',
      titulo: 'Con un ejercicio abierto',
      texto: 'Arriba del editor aparece una franja con el enunciado y dos botones. Mientras esté ahí, lo que escribís es la solución de ese ejercicio.',
      capturas: { clasico: 'ejercicio.png', poo: 'ejercicio.png', visual: 'ejercicio.png' },
      alt: 'La franja del ejercicio abierto, con Verificar solución y Salir del ejercicio.',
      controles: ['btnVerificar', 'btnSalirEjercicio']
    },
    {
      id: 'dlg-archivos',
      titulo: 'Archivos del programa',
      texto: 'Los archivos de mentira que usa tu programa con set_stdin() y set_stdout(). Viven en la memoria del navegador ' +
        'y se pierden al recargar si no los bajás.',
      capturas: { clasico: 'dlg-archivos.png', visual: 'dlg-archivos.png' },
      alt: 'El cuadro de los archivos en memoria, con la lista y el contenido.',
      controles: ['dlgArchivos', 'btnArchivos']
    },
    {
      id: 'dlg-traduccion',
      titulo: 'El programa en otro lenguaje',
      texto: 'Lo que abre el menú Traducir. La traducción es solo para leer: cambiarla acá no cambia tu programa.',
      capturas: { clasico: 'dlg-traduccion.png', poo: 'dlg-traduccion.png' },
      alt: 'El cuadro de la traducción, con el mismo programa en JavaScript.',
      controles: ['dlgTraduccion']
    },
    {
      id: 'dlg-diagrama',
      titulo: 'El diagrama de flujo',
      texto: 'El programa dibujado con las formas de siempre, y al lado el mismo diagrama contado en palabras. ' +
        'Si el programa tiene subrutinas, se elige cuál dibujar.',
      capturas: { clasico: 'dlg-diagrama.png', poo: 'dlg-diagrama.png', visual: 'dlg-diagrama.png' },
      alt: 'El cuadro del diagrama de flujo, con el dibujo y la explicación.',
      controles: ['dlgDiagrama', 'btnDiagrama']
    },
    {
      id: 'dlg-editor-diagrama',
      titulo: 'El editor de diagramas',
      texto: 'Al revés que el anterior: se arma el diagrama con bloques y el programa sale solo. ' +
        '«Pasar al editor» lo escribe en el editor, pisando lo que haya.',
      capturas: { clasico: 'dlg-editor-diagrama.png', poo: 'dlg-editor-diagrama.png', visual: 'dlg-editor-diagrama.png' },
      alt: 'El editor de diagramas: los bloques a la izquierda, el dibujo y el programa a la derecha.',
      controles: ['dlgEditorDiagrama', 'btnEditorDiagrama']
    },
    {
      id: 'dlg-escritorio',
      titulo: 'La prueba de escritorio',
      texto: 'La tabla que se hace en el pizarrón, hecha sola. Es lo que conviene mirar cuando una cuenta da mal ' +
        'y no se entiende en qué vuelta se rompió.',
      capturas: { clasico: 'dlg-escritorio.png', poo: 'dlg-escritorio.png', visual: 'dlg-escritorio.png' },
      alt: 'El cuadro de la prueba de escritorio, con una fila por sentencia ejecutada.',
      controles: ['dlgEscritorio', 'btnEscritorio']
    },
    {
      id: 'dlg-memoria',
      titulo: 'El simulador de memoria',
      texto: 'Las variables como cajas con dirección y tamaño, y una línea de tiempo para recorrer el programa. ' +
        'Sirve para entender qué quiere decir que una variable «se crea» y «se destruye».',
      capturas: { clasico: 'dlg-memoria.png', poo: 'dlg-memoria.png', visual: 'dlg-memoria.png' },
      alt: 'El simulador de memoria, con el mapa de cajas y la narración del paso.',
      controles: ['dlgMemoria', 'btnMemoria']
    },
    {
      id: 'dlg-historial',
      titulo: 'El historial de versiones',
      texto: 'Un control de versiones en chiquito. ESLE2 guarda solo una copia cada vez que ejecutás y antes de cualquier cosa ' +
        'que pise el editor, así que volver atrás nunca te hace perder lo de ahora.',
      capturas: { clasico: 'dlg-historial.png', poo: 'dlg-historial.png', visual: 'dlg-historial.png' },
      alt: 'El historial de versiones, con la lista y las diferencias con el código actual.',
      controles: ['dlgHistorial', 'btnHistorial']
    },
    {
      id: 'dlg-exportar-bd',
      titulo: 'La base en SQL',
      texto: 'El volcado que crea las tablas y mete los datos. Se copia o se baja como archivo, y se abre tal cual en el otro motor.',
      capturas: { bd: 'dlg-exportar-bd.png' },
      alt: 'El cuadro con el volcado SQL de la base.',
      controles: ['dlgExportarBD']
    },
    {
      id: 'dlg-diagrama-bd',
      titulo: 'El diagrama de la base',
      texto: 'Las tablas dibujadas con sus relaciones, y la misma información en palabras para copiar a un informe.',
      capturas: { bd: 'dlg-diagrama-bd.png' },
      alt: 'El diagrama de la base, con una caja por tabla y flechas entre ellas.',
      controles: ['dlgDiagramaBD', 'btnDiagramaBD']
    },
    {
      id: 'dlg-editor-bd',
      titulo: 'Dibujar el diagrama',
      texto: 'Se agregan tablas y columnas de un lado y el CREAR TABLA aparece del otro, en orden de creación, ' +
        'con las claves foráneas ya puestas.',
      capturas: { bd: 'dlg-editor-bd.png' },
      alt: 'El editor del diagrama de la base, con las tablas y el código generado.',
      controles: ['dlgEditorBD', 'btnEditorBD']
    },
    {
      id: 'buscador',
      titulo: 'El buscador',
      texto: 'Ctrl + K en cualquier pantalla. Busca a la vez en las funciones del lenguaje, en los temas de la documentación ' +
        'y en los ejercicios del curso, y te lleva ahí.',
      capturas: { clasico: 'buscador.png', poo: 'buscador.png', visual: 'buscador.png', bd: 'buscador.png' },
      alt: 'El buscador abierto, con lo escrito arriba y los resultados abajo.',
      controles: ['buscador']
    },
    {
      id: 'atajos',
      titulo: 'Los atajos',
      texto: 'Todo se puede hacer con el mouse, pero estos ahorran la mitad del tiempo. Funcionan desde cualquier parte de la pantalla.',
      /* Sin captura a propósito: una lista de teclas se lee mejor como texto,
         y una imagen de un teclado no la haría más clara. */
      capturas: {},
      siempre: true,
      controles: ['btnEjecutar', 'btnDepurar', 'btnPaso', 'btnContinuar', 'btnDetener', 'btnGuardar', 'btnBuscar',
        'btnAjustar', 'btnEnfoque', 'btnProyectar'],
      cambios: {
        visual: { quitar: ['btnEnfoque'], agregar: ['btnDisenar', 'btnVentana'] },
        bd: { quitar: ['btnEnfoque', 'btnAjustar'], agregar: ['sqlRapido'] }
      }
    },
    {
      id: 'donde-seguir',
      titulo: 'Dónde seguir',
      texto: 'La documentación tiene el lenguaje entero explicado, con ejemplos que se pueden ejecutar y un buscador propio. ' +
        'En Diseño se cambian los colores y el tamaño de la letra, y hay una configuración para el tema claro y otra para el oscuro. ' +
        'Nada de esto sale de tu navegador: ESLE2 no tiene servidor y anda igual sin internet.',
      capturas: {},
      siempre: true,
      controles: ['pestDoc', 'pestDiseno', 'btnInstalar']
    }
  ];

  /* ------------------------------------------------------------------ */
  /* Medidas de las capturas                                             */
  /* ------------------------------------------------------------------ */
  /* Van acá para que el navegador reserve el lugar antes de bajar la imagen y
     el cuadro no salte al abrirse. Las escribe tools/capturar-tutorial.js
     entre estas dos marcas: no las edites a mano. */
  const MEDIDAS = {
    /* capturas:inicio */
    'barra-bd.png': [1280, 95],
    'barra-clasico.png': [1280, 95],
    'barra-poo.png': [1280, 95],
    'barra-visual.png': [1280, 95],
    'buscador.png': [620, 502],
    'controles-visual.png': [568, 333],
    'curso-bd.png': [1280, 805],
    'curso-clasico.png': [1280, 805],
    'curso-poo.png': [1280, 805],
    'curso-visual.png': [1280, 805],
    'dlg-archivos.png': [620, 522],
    'dlg-diagrama-bd.png': [1080, 519],
    'dlg-diagrama.png': [1080, 733],
    'dlg-editor-bd.png': [1080, 673],
    'dlg-editor-diagrama.png': [1178, 779],
    'dlg-escritorio.png': [1178, 455],
    'dlg-exportar-bd.png': [880, 643],
    'dlg-historial.png': [1060, 379],
    'dlg-memoria.png': [1120, 355],
    'dlg-traduccion.png': [880, 671],
    'editor-bd.png': [691, 718],
    'editor-clasico.png': [713, 718],
    'editor-poo.png': [713, 718],
    'editor-visual.png': [654, 718],
    'ejercicio.png': [1280, 53],
    'entrada.png': [509, 239],
    'esquema-bd.png': [531, 220],
    'explorador.png': [232, 718],
    'herramientas-bd.png': [1280, 53],
    'herramientas-clasico.png': [1280, 53],
    'herramientas-poo.png': [1280, 53],
    'herramientas-visual.png': [1280, 53],
    'lienzo.png': [509, 213],
    'menu-archivo-bd.png': [222, 280],
    'menu-archivo-clasico.png': [222, 461],
    'menu-archivo-poo.png': [222, 280],
    'menu-archivo-visual.png': [222, 317],
    'menu-base.png': [222, 246],
    'menu-exportar.png': [222, 172],
    'menu-insertar.png': [340, 456],
    'menu-traducir-clasico.png': [222, 283],
    'menu-traducir-poo.png': [222, 135],
    'menu-ver-bd.png': [222, 210],
    'menu-ver-clasico.png': [222, 500],
    'menu-ver-poo.png': [222, 431],
    'menu-ver-visual.png': [222, 463],
    'pausa.png': [1280, 805],
    'salida-bd.png': [531, 286],
    'salida-clasico.png': [509, 461],
    'salida-poo.png': [509, 461],
    'salida-visual.png': [568, 367],
    'sql-rapido.png': [531, 176],
    'ventana-visual.png': [760, 457],
    /* capturas:fin */
  };

  /* ------------------------------------------------------------------ */
  /* Armar el tutorial de un entorno                                     */
  /* ------------------------------------------------------------------ */
  function controlesDe(seccion, entorno) {
    const cambio = (seccion.cambios || {})[entorno] || {};
    const fuera = new Set(cambio.quitar || []);
    const ids = seccion.controles.filter(id => !fuera.has(id)).concat(cambio.agregar || []);
    return ids.map(id => Object.assign({ id }, CONTROLES[id]));
  }

  function secciones(entorno) {
    return SECCIONES
      .filter(s => s.siempre || s.capturas[entorno])
      .map(s => {
        const archivo = s.capturas[entorno];
        const medida = MEDIDAS[archivo] || null;
        return {
          id: s.id,
          titulo: s.titulo,
          texto: s.texto,
          captura: archivo ? {
            ruta: CARPETA + archivo,
            archivo,
            alt: s.alt,
            ancho: medida ? medida[0] : null,
            alto: medida ? medida[1] : null
          } : null,
          controles: controlesDe(s, entorno)
        };
      });
  }

  /* Todas las imágenes que el tutorial puede llegar a pedir, sin repetir: es
     lo que tiene que estar en ARCHIVOS de sw.js para que ande sin conexión. */
  function capturas() {
    const vistas = new Set();
    for (const s of SECCIONES) {
      for (const entorno of Object.keys(s.capturas)) vistas.add(CARPETA + s.capturas[entorno]);
    }
    return [...vistas].sort();
  }

  global.Tutorial = {
    ENTORNOS, CONTROLES, SECCIONES, MEDIDAS, CARPETA,
    entornoDe, secciones, capturas
  };
})(typeof window !== 'undefined' ? window : globalThis);

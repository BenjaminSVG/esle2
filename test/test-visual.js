/*
 * Prueba de ESLE2 Visual (js/sle2vis.js).
 *
 * Todo lo visual pasa por un backend enchufable, así que acá se enchufa uno
 * de mentira que anota lo que el programa pidió: qué ventana, qué controles,
 * qué dibujos y qué eventos. Con eso se puede verificar el lenguaje entero
 * —incluida la vuelta del evento a la subrutina del alumno— sin abrir un
 * navegador.
 *   node test/test-visual.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2vis.js'));
const { SLE2, SLE2VIS } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

function io(salida) {
  return {
    archivos: new Map(), argumentos: [],
    imprimir: t => salida.push(t), limpiar: () => (salida.length = 0),
    finEntrada: () => true, leerLinea: async () => null,
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
}

/* Corre un programa y devuelve el backend con todo lo que quedó anotado.
   Como esperar_eventos() no vuelve hasta que se cierre la ventana, la corrida
   se deja en marcha y la prueba dispara los eventos que quiera. */
function correr(fuente, op) {
  const gui = SLE2VIS.guiDeMentira();
  const salida = [];
  const control = {};
  let error = null;
  const fin = SLE2VIS.ejecutar(fuente, io(salida), Object.assign({ gui, control }, op || {}))
    .catch(e => { error = e; });
  return {
    gui, salida, control, fin,
    error: () => error,
    /* Espera a que el intérprete llegue a esperar_eventos() (o termine). */
    listo: async () => { await Promise.resolve(); await new Promise(r => setTimeout(r, 5)); return gui; }
  };
}

const HOLA = `var
   b : numerico
inicio
   ventana ("Saludos", 400, 240)
   b = boton ("Saludar", 30, 40, 120, 34)
   al_hacer_clic (b, "saludar")
   esperar_eventos ()
fin
subrutina saludar (id : numerico)
inicio
   mensaje ("Hola desde SLE2 Visual")
fin
`;

(async () => {

/* ---------------------------- la ventana ------------------------------- */
{
  const r = correr(HOLA);
  const gui = await r.listo();
  comprobar('la ventana se crea con su título y su tamaño',
    gui.registro[0][0] === 'ventana' && gui.registro[0][1].titulo === 'Saludos' &&
    gui.registro[0][1].ancho === 400 && gui.registro[0][1].alto === 240,
    JSON.stringify(gui.registro[0]));
  comprobar('el botón se crea con su texto y su lugar',
    gui.registro[1][0] === 'crear' && gui.registro[1][2] === 'boton' &&
    gui.registro[1][3].texto === 'Saludar' && gui.registro[1][3].x === 30,
    JSON.stringify(gui.registro[1]));
  comprobar('el programa queda esperando', gui.esperando === true);
  comprobar('y todavía no mostró ningún mensaje', gui.mensajes.length === 0);

  /* El clic de la persona */
  await gui.disparar(1, 'clic');
  comprobar('al hacer clic corre la subrutina', gui.mensajes.join() === 'Hola desde SLE2 Visual',
    gui.mensajes.join());
  await gui.disparar(1, 'clic');
  comprobar('y se puede hacer clic muchas veces', gui.mensajes.length === 2);

  r.control.detener();
  await r.fin;
  comprobar('cerrar la ventana termina el programa', !r.error(), r.error() && r.error().message);
}

/* ---------------------- controles y sus propiedades -------------------- */
{
  const r = correr(`var
   e, c, cj, li, d, lz : numerico
inicio
   ventana ("Todo", 500, 400)
   e = etiqueta ("Nombre:", 20, 20)
   c = caja (20, 44, 200, 26)
   cj = casilla ("Acepto", 20, 80)
   li = lista (20, 110, 200, 90)
   d = deslizador (20, 210, 200, 0, 100)
   lz = lienzo (240, 20, 200, 150)
   agregar_item (li, "uno")
   agregar_item (li, "dos")
   poner_texto (c, "Ana")
   marcar (cj, TRUE)
   poner_valor (d, 42)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  const tipos = [...gui.controles.values()].map(c => c.tipo).join();
  comprobar('se crean los seis controles', tipos === 'etiqueta,caja,casilla,lista,deslizador,lienzo', tipos);
  comprobar('los controles se numeran desde 1', [...gui.controles.keys()].join() === '1,2,3,4,5,6');
  comprobar('la etiqueta lleva su texto', gui.controles.get(1).texto === 'Nombre:');
  comprobar('la caja toma el ancho que se le da', gui.controles.get(2).ancho === 200);
  comprobar('un control sin tamaño toma el de fábrica', gui.controles.get(3).ancho === 140,
    String(gui.controles.get(3).ancho));
  comprobar('la lista guarda sus items', gui.controles.get(4).items.join() === 'uno,dos');
  comprobar('la caja de texto se puede escribir desde el programa',
    gui.leer(2, 'texto') === 'Ana');
  comprobar('la casilla se puede marcar', gui.leer(3, 'marcado') === true);
  comprobar('el deslizador guarda su valor', gui.leer(5, 'valor') === 42);
  r.control.detener();
  await r.fin;
}

/* ------------------------- leer lo que escribió ------------------------ */
{
  const r = correr(`var
   c, b : numerico
inicio
   ventana ("Eco", 400, 200)
   c = caja (20, 20, 200, 26)
   b = boton ("Copiar", 20, 60, 100, 30)
   al_hacer_clic (b, "copiar")
   esperar_eventos ()
fin
subrutina copiar (id : numerico)
var
   t = ""
inicio
   t = leer_texto (1)
   mensaje ("Escribiste: " + t)
fin`);
  const gui = await r.listo();
  /* La persona escribe en la caja y toca el botón. */
  gui.poner(1, 'texto', 'hola mundo');
  await gui.disparar(2, 'clic');
  comprobar('el programa lee lo que se escribió en la caja',
    gui.mensajes.join() === 'Escribiste: hola mundo', gui.mensajes.join());
  r.control.detener();
  await r.fin;
}

/* -------------------------------- dibujo -------------------------------- */
{
  const r = correr(`var
   l : numerico
inicio
   ventana ("Dibujo", 400, 300)
   l = lienzo (10, 10, 300, 200)
   pluma (l, 200, 0, 0)
   grosor (l, 3)
   linea (l, 0, 0, 100, 100)
   relleno (l, 0, 0, 255)
   rectangulo (l, 10, 10, 50, 40)
   circulo (l, 150, 100, 30)
   texto_en (l, 20, 180, "hola")
   punto (l, 5, 5)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  const d = gui.controles.get(1).dibujos;
  comprobar('el lienzo anota todas las órdenes', d.length === 8, String(d.length));
  comprobar('la pluma guarda el color', JSON.stringify(d[0]) === '["pluma",{"r":200,"g":0,"b":0}]',
    JSON.stringify(d[0]));
  comprobar('la línea guarda sus cuatro coordenadas', JSON.stringify(d[2]) === '["linea",0,0,100,100]');
  comprobar('el círculo, centro y radio', JSON.stringify(d[5]) === '["circulo",150,100,30]',
    JSON.stringify(d[5]));
  comprobar('el texto va con su cadena', d[6][3] === 'hola');
  comprobar('un color fuera de rango se recorta a 0..255',
    JSON.stringify(d[3]) === '["relleno",{"r":0,"g":0,"b":255}]');
  r.control.detener();
  await r.fin;
}
{
  const r = correr(`var
   l : numerico
inicio
   ventana ("Borrar", 300, 200)
   l = lienzo (0, 0, 200, 150)
   linea (l, 0, 0, 10, 10)
   borrar_lienzo (l)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('borrar el lienzo lo deja vacío', gui.controles.get(1).dibujos.length === 0);
  r.control.detener();
  await r.fin;
}

/* -------------------------- eventos y errores --------------------------- */
{
  const r = correr(`var
   d : numerico
inicio
   ventana ("Cambios", 300, 200)
   d = deslizador (10, 10, 200, 0, 10)
   al_cambiar (d, "cambio")
   esperar_eventos ()
fin
subrutina cambio (id : numerico)
inicio
   mensaje ("cambió " + str (leer_valor (id), 0, 0))
fin`);
  const gui = await r.listo();
  gui.poner(1, 'valor', 7);
  await gui.disparar(1, 'cambio');
  comprobar('el evento de cambio llega con el id del control',
    gui.mensajes.join() === 'cambió 7', gui.mensajes.join());
  r.control.detener();
  await r.fin;
}
{
  const r = correr(`inicio
   ventana ("Mal", 300, 200)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('avisa si nadie registró un evento', gui.avisos.length === 1, gui.avisos.join());
  r.control.detener();
  await r.fin;
}
{
  const r = correr(`var
   b : numerico
inicio
   ventana ("Mal", 300, 200)
   b = boton ("x", 10, 10)
   al_hacer_clic (b, "no_existe")
   esperar_eventos ()
fin`);
  await r.fin;
  comprobar('registrar una subrutina que no existe es un error', !!r.error());
  comprobar('y el error lo dice con todas las letras',
    /no hay ninguna subrutina/.test(r.error().message), r.error() && r.error().message);
}
{
  const r = correr(`inicio
   boton ("temprano", 10, 10)
fin`);
  await r.fin;
  comprobar('crear un control sin ventana es un error', !!r.error());
  comprobar('y explica qué falta', /todavía no hay ninguna ventana/.test(r.error().message),
    r.error() && r.error().message);
}
{
  const r = correr(`inicio
   ventana ("Mal", 300, 200)
   poner_texto (99, "x")
fin`);
  await r.fin;
  comprobar('usar un control que no existe es un error',
    !!r.error() && /no hay ningún control/.test(r.error().message),
    r.error() && r.error().message);
}
{
  const r = correr(`var
   e : numerico
inicio
   ventana ("Mal", 300, 200)
   e = etiqueta ("hola", 10, 10)
   agregar_item (e, "x")
fin`);
  await r.fin;
  comprobar('pedirle a un control algo que no es suyo también avisa',
    !!r.error() && /solo vale para un "lista"/.test(r.error().message),
    r.error() && r.error().message);
}
{
  const r = correr(`var
   b : numerico
inicio
   ventana ("Error adentro", 300, 200)
   b = boton ("romper", 10, 10)
   al_hacer_clic (b, "romper")
   esperar_eventos ()
fin
subrutina romper (id : numerico)
var
   x = 0
inicio
   x = 1 / 0
fin`);
  const gui = await r.listo();
  await gui.disparar(1, 'clic');
  await r.fin;
  comprobar('un error adentro de un manejador se informa y corta',
    gui.errores.length === 1 && /división por cero/.test(gui.errores[0].message),
    gui.errores.map(e => e.message).join());
}

/* ------------------------ sigue siendo SLE2 ----------------------------- */
{
  const r = correr(`var
   i, l : numerico
inicio
   ventana ("Ciclo", 400, 300)
   l = lienzo (0, 0, 300, 200)
   desde i = 1 hasta 5
   {
      circulo (l, i * 40, 100, 15)
   }
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  const c = gui.controles.get(1).dibujos;
  comprobar('los ciclos y las cuentas de siempre funcionan', c.length === 5, String(c.length));
  comprobar('y calculan bien las coordenadas',
    c.map(x => x[1]).join() === '40,80,120,160,200', c.map(x => x[1]).join());
  r.control.detener();
  await r.fin;
}
{
  /* Un programa visual se compila con el compilador de siempre. */
  const ast = SLE2VIS.compilar(HOLA);
  comprobar('un programa visual es un programa SLE2', ast.cuerpo.length === 4 && ast.subs.length === 1);
  comprobar('el revisor no pide imprimir() en un programa visual',
    SLE2VIS.revisar(HOLA).every(a => !/imprimir\(\)/.test(a.mensaje)),
    SLE2VIS.revisar(HOLA).map(a => a.mensaje).join(' | '));
  comprobar('pero sigue avisando de lo demás',
    SLE2VIS.revisar('var\n   sinUsar = 0\ninicio\n   ventana ("x", 200, 200)\nfin').length > 0);

  /* El revisor base no sabe que a una subrutina de evento la llama el runtime:
     sin este filtro le diría al alumno que su manejador es código muerto. */
  const conEvento = `var
   b = 0
inicio
   ventana ("x", 200, 200)
   al_hacer_clic (boton ("Ir", 10, 10, 60, 30), "andar")
   esperar_eventos ()
fin

subrutina andar (id : numerico)
inicio
   mensaje ("listo")
fin`;
  const avisos = SLE2VIS.revisar(conEvento).map(a => a.mensaje);
  comprobar('no dice que la subrutina de un evento nunca se llama',
    !avisos.some(m => /nunca se llama/.test(m)), avisos.join(' | '));
  comprobar('ni que su parámetro id sobra',
    !avisos.some(m => /se declara en la subrutina andar/.test(m)), avisos.join(' | '));

  /* Pero si nadie la registró, el aviso tiene que seguir saliendo. */
  const suelta = conEvento.replace('al_hacer_clic (boton ("Ir", 10, 10, 60, 30), "andar")',
    'boton ("Ir", 10, 10, 60, 30)');
  comprobar('y avisa igual cuando la subrutina de verdad no se usa',
    SLE2VIS.revisar(suelta).some(a => /nunca se llama/.test(a.mensaje)));
}
{
  /* Las predefinidas de siempre siguen estando. */
  const r = correr(`var
   t = ""
inicio
   ventana ("Mezcla", 300, 200)
   t = upper ("hola")
   etiqueta (t, 10, 10)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('las subrutinas del lenguaje base siguen disponibles',
    gui.controles.get(1).texto === 'HOLA', gui.controles.get(1).texto);
  r.control.detener();
  await r.fin;
}

/* ================== los controles de formulario ========================= */
/* desplegable, numero y progreso. Lo que se comprueba es el contrato que ve
   el alumno: qué devuelve leer_valor, qué pasa cuando se pide algo imposible,
   y que el error lo diga en castellano en vez de dejar un NaN suelto. */
{
  const r = correr(`var
   d, n, pr, e : numerico
inicio
   ventana ("Formulario", 460, 320)
   e = etiqueta ("Materia:", 20, 20)
   d = desplegable (20, 44, 200, 30)
   n = numero (20, 90, 120, 30)
   pr = progreso (20, 140, 200, 22)
   agregar_item (d, "Álgebra")
   agregar_item (d, "Física")
   agregar_item (d, "Química")
   asociar_etiqueta (e, d)
   rango_numero (n, 1, 10, 1)
   poner_valor (d, 2)
   poner_valor (n, 7)
   poner_valor (pr, 40)
   esperar_eventos ()
fin`);
  const gui = await r.listo();

  const tipos = [...gui.controles.values()].map(c => c.tipo).join();
  comprobar('se crean los tres controles nuevos',
    tipos === 'etiqueta,desplegable,numero,progreso', tipos);
  comprobar('el desplegable toma su tamaño de fábrica',
    gui.controles.get(2).alto === 30, String(gui.controles.get(2).alto));

  /* Desplegable: se cuenta desde 1, igual que los vectores de SL. */
  comprobar('el desplegable guarda sus opciones',
    gui.controles.get(2).items.join() === 'Álgebra,Física,Química');
  comprobar('cuantos_items las cuenta', gui.leer(2, 'items') === 3);
  comprobar('elegir la 2 devuelve 2', gui.leer(2, 'valor') === 2);
  comprobar('y item_elegido devuelve su texto', gui.leer(2, 'elegido') === 'Física',
    gui.leer(2, 'elegido'));

  comprobar('el numero guarda lo que se le puso', gui.leer(3, 'valor') === 7);
  comprobar('el progreso también', gui.leer(4, 'valor') === 40);
  comprobar('el rango llega al backend',
    JSON.stringify(gui.controles.get(3).rango) === '{"minimo":1,"maximo":10,"paso":1}',
    JSON.stringify(gui.controles.get(3).rango));
  comprobar('la etiqueta queda asociada al desplegable',
    gui.controles.get(2).etiquetaDe === 1, String(gui.controles.get(2).etiquetaDe));

  r.control.detener();
  await r.fin;
}

/* ------------- lo que pasa cuando se pide algo imposible ---------------- */
{
  /* Un valor fuera del rango se recorta, no rompe: un programa que sube de a
     uno hasta pasarse tiene que quedarse en el máximo, como una barra real. */
  const r = correr(`var
   n, pr : numerico
inicio
   ventana ("Topes", 400, 200)
   n = numero (20, 20, 120, 30)
   pr = progreso (20, 60, 200, 22)
   rango_numero (n, 0, 10)
   poner_valor (n, 999)
   poner_valor (pr, 250)
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('un número más grande que el máximo se recorta', gui.leer(1, 'valor') === 10,
    String(gui.leer(1, 'valor')));
  comprobar('el progreso no pasa de 100', gui.leer(2, 'valor') === 100,
    String(gui.leer(2, 'valor')));
  r.control.detener();
  await r.fin;
}

{
  /* Elegir una opción que no existe SÍ es un error: al revés que el rango,
     acá recortar en silencio dejaría al programa mostrando otra materia. */
  const r = correr(`var
   d : numerico
inicio
   ventana ("Mal", 400, 200)
   d = desplegable (20, 20)
   agregar_item (d, "uno")
   poner_valor (d, 5)
   esperar_eventos ()
fin`);
  await r.fin.catch(() => {});
  const err = r.gui.errores[0] || r.error();
  comprobar('elegir una opción que no existe avisa',
    !!err && /no tiene una opción número 5/.test(err.message || String(err)),
    err && (err.message || String(err)));
  comprobar('y dice cuántas hay',
    !!err && /Tiene 1/.test(err.sugerencia || ''), err && err.sugerencia);
}

{
  const r = correr(`var
   n : numerico
inicio
   ventana ("Mal", 400, 200)
   n = numero (20, 20)
   rango_numero (n, 10, 3)
   esperar_eventos ()
fin`);
  await r.fin.catch(() => {});
  const err = r.gui.errores[0] || r.error();
  comprobar('un rango al revés avisa',
    !!err && /mayor que el mínimo/.test(err.message || String(err)),
    err && (err.message || String(err)));
}

{
  /* Usar una función de lista sobre un botón tiene que decir los dos tipos
     que sí valen, no solo el primero. */
  const r = correr(`var
   b : numerico
inicio
   ventana ("Mal", 400, 200)
   b = boton ("Hola", 20, 20)
   agregar_item (b, "uno")
   esperar_eventos ()
fin`);
  await r.fin.catch(() => {});
  const err = r.gui.errores[0] || r.error();
  const m = err && (err.message || String(err));
  comprobar('agregar_item sobre un botón avisa', !!m && /es un "boton"/.test(m), m);
  comprobar('y nombra los dos tipos que valen',
    !!m && /"lista"/.test(m) && /"desplegable"/.test(m), m);
}

/* --------------------------- enfocar ------------------------------------ */
{
  const r = correr(`var
   c, b : numerico
   pudo : logico
inicio
   ventana ("Foco", 400, 200)
   c = caja (20, 20, 200, 26)
   b = boton ("Ir", 20, 60, 80, 30)
   pudo = enfocar (c)
   si (pudo)
   {
      mensaje ("fui a la caja")
   }
   habilitar (b, FALSE)
   si (not enfocar (b))
   {
      mensaje ("al boton apagado no")
   }
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('enfocar devuelve que sí cuando se pudo',
    gui.mensajes[0] === 'fui a la caja', gui.mensajes.join(' | '));
  comprobar('y que no sobre un control apagado',
    gui.mensajes[1] === 'al boton apagado no', gui.mensajes.join(' | '));
  r.control.detener();
  await r.fin;
}

/* ------------- los programas viejos siguen andando igual ---------------- */
{
  /* La razón de ser de esta prueba: agregar controles no puede cambiar lo que
     ya hacía una lista, que es lo que usan los 50 ejercicios del curso. */
  const r = correr(`var
   li : numerico
inicio
   ventana ("Lista de siempre", 400, 300)
   li = lista (20, 20, 200, 120)
   agregar_item (li, "uno")
   agregar_item (li, "dos")
   limpiar_items (li)
   agregar_item (li, "tres")
   esperar_eventos ()
fin`);
  const gui = await r.listo();
  comprobar('la lista de toda la vida no cambió',
    gui.controles.get(1).items.join() === 'tres', gui.controles.get(1).items.join());
  r.control.detener();
  await r.fin;
}

/* ===================== preguntar antes de borrar ======================== */
/* confirmar() detiene el programa hasta que la persona conteste. En una
   prueba nadie puede tocar un botón, así que las respuestas se dejan puestas
   de antemano: gui.respuestas = [true, false]. */
{
  const r = correr(`var
   li, b : numerico
inicio
   ventana ("Lista", 400, 300)
   li = lista (20, 20, 200, 120)
   agregar_item (li, "uno")
   agregar_item (li, "dos")
   b = boton ("Vaciar", 20, 160, 100, 32)
   al_hacer_clic (b, "vaciar")
   esperar_eventos ()
fin

subrutina vaciar (id : numerico)
inicio
   si (confirmar ("¿Vaciar la lista?"))
   {
      limpiar_items (li)
      mensaje ("vaciada")
   sino
      mensaje ("no se tocó")
   }
fin`);
  const gui = await r.listo();

  /* Primero se contesta que NO. El botón es el control 2: la lista es el 1. */
  gui.respuestas = [false];
  await gui.disparar(2, 'clic');
  comprobar('con «no» no se toca nada',
    gui.controles.get(1).items.join() === 'uno,dos', gui.controles.get(1).items.join());
  comprobar('y el programa se entera', gui.mensajes.join() === 'no se tocó', gui.mensajes.join());
  comprobar('la pregunta llegó tal cual', gui.preguntas[0] === '¿Vaciar la lista?', gui.preguntas[0]);

  /* Y ahora que sí. */
  gui.respuestas = [true];
  await gui.disparar(2, 'clic');
  comprobar('con «sí» se vacía', gui.controles.get(1).items.length === 0,
    gui.controles.get(1).items.join());
  comprobar('se preguntó las dos veces', gui.preguntas.length === 2, String(gui.preguntas.length));

  r.control.detener();
  await r.fin;
}

{
  /* Sin respuesta puesta se contesta que no. Es lo mismo que hace Escape, y
     es el lado seguro: lo que se iba a borrar no se borra. */
  const r = correr(`var
   b : numerico
inicio
   ventana ("P", 300, 200)
   b = boton ("Dale", 20, 20)
   al_hacer_clic (b, "probar")
   esperar_eventos ()
fin

subrutina probar (id : numerico)
inicio
   si (confirmar ("¿Seguro?"))
   {
      mensaje ("dijo que sí")
   sino
      mensaje ("dijo que no")
   }
fin`);
  const gui = await r.listo();
  await gui.disparar(1, 'clic');
  comprobar('sin respuesta, se contesta que no', gui.mensajes.join() === 'dijo que no',
    gui.mensajes.join());
  r.control.detener();
  await r.fin;
}

/* ========================== el temporizador ============================= */
/* Con un reloj de mentira: esperar segundos de verdad haría la prueba lenta
   y, peor, inestable. El reloj guarda lo agendado y la prueba decide cuándo
   pasa el tiempo. */
function relojFalso() {
  const pendientes = [];
  const reloj = (ms, que) => pendientes.push({ ms, que });
  /* Un tic: corre lo que estaba agendado y espera a que la cola se vacíe. */
  reloj.tic = async (veces) => {
    for (let i = 0; i < (veces || 1); i++) {
      const ahora = pendientes.splice(0, pendientes.length);
      for (const p of ahora) p.que();
      await new Promise(r => setTimeout(r, 5));
    }
  };
  reloj.cuantosPendientes = () => pendientes.length;
  return reloj;
}

{
  const reloj = relojFalso();
  const r = correr(`var
   t, cuenta, e : numerico
inicio
   ventana ("Contador", 300, 200)
   e = progreso (20, 20, 200, 22)
   cuenta = 0
   t = temporizador (1000, "avanzar")
   activar_temporizador (t, TRUE)
   esperar_eventos ()
fin

subrutina avanzar (id : numerico)
inicio
   cuenta = cuenta + 1
   poner_valor (e, cuenta)
fin`, { reloj });
  const gui = await r.listo();

  comprobar('al arrancar ya hay un tic agendado', reloj.cuantosPendientes() === 1,
    String(reloj.cuantosPendientes()));
  await reloj.tic();
  comprobar('el primer tic corre la subrutina', gui.leer(1, 'valor') === 1,
    String(gui.leer(1, 'valor')));
  await reloj.tic();
  await reloj.tic();
  comprobar('y sigue solo', gui.leer(1, 'valor') === 3, String(gui.leer(1, 'valor')));
  comprobar('siempre hay uno solo agendado, nunca una pila',
    reloj.cuantosPendientes() === 1, String(reloj.cuantosPendientes()));

  r.control.detener();
  await r.fin;
  await reloj.tic();
  comprobar('después de detener el programa, un tic atrasado no hace nada',
    gui.leer(1, 'valor') === 3, String(gui.leer(1, 'valor')));
}

{
  /* Apagarlo y volver a prenderlo. Lo que estaba agendado de antes no puede
     colarse: por eso cada activación lleva su generación. */
  const reloj = relojFalso();
  const r = correr(`var
   t, cuenta, e, b : numerico
inicio
   ventana ("Pausa", 300, 220)
   e = progreso (20, 20, 200, 22)
   b = boton ("Pausa", 20, 60, 100, 30)
   cuenta = 0
   t = temporizador (100, "avanzar")
   activar_temporizador (t, TRUE)
   al_hacer_clic (b, "pausar")
   esperar_eventos ()
fin

subrutina avanzar (id : numerico)
inicio
   cuenta = cuenta + 1
   poner_valor (e, cuenta)
fin

subrutina pausar (id : numerico)
inicio
   si (temporizador_andando (t))
   {
      activar_temporizador (t, FALSE)
   sino
      activar_temporizador (t, TRUE)
   }
fin`, { reloj });
  const gui = await r.listo();

  await reloj.tic();
  comprobar('va uno', gui.leer(1, 'valor') === 1, String(gui.leer(1, 'valor')));

  await gui.disparar(2, 'clic');           // pausa
  const quedaban = reloj.cuantosPendientes();
  await reloj.tic();
  comprobar('en pausa no avanza', gui.leer(1, 'valor') === 1, String(gui.leer(1, 'valor')));
  comprobar('el tic viejo se descarta en vez de correrse', quedaban >= 0);

  await gui.disparar(2, 'clic');           // sigue
  await reloj.tic();
  comprobar('al volver a prender, sigue de donde estaba',
    gui.leer(1, 'valor') === 2, String(gui.leer(1, 'valor')));

  r.control.detener();
  await r.fin;
}

{
  /* Lo que no se permite. */
  const r = correr(`var
   t : numerico
inicio
   ventana ("Mal", 300, 200)
   t = temporizador (5, "nada")
   esperar_eventos ()
fin

subrutina nada (id : numerico)
inicio
   mensaje ("hola")
fin`);
  await r.fin.catch(() => {});
  const err = r.gui.errores[0] || r.error();
  comprobar('un temporizador demasiado rápido avisa',
    !!err && /no puede ir más rápido/.test(err.message || String(err)),
    err && (err.message || String(err)));
}

{
  const r = correr(`var
   t : numerico
inicio
   ventana ("Mal", 300, 200)
   t = temporizador (1000, "queNoExiste")
   esperar_eventos ()
fin`);
  await r.fin.catch(() => {});
  const err = r.gui.errores[0] || r.error();
  comprobar('un temporizador sin subrutina avisa',
    !!err && /no hay ninguna subrutina/.test(err.message || String(err)),
    err && (err.message || String(err)));
}

/* --------------------- el catálogo que usa la página -------------------- */
{
  /* El catálogo se compara contra la lista entera y no contra un número: un
     control nuevo tiene que obligar a mirar esta línea, y un control que
     DESAPARECE —que rompería programas ya escritos— tiene que gritar. */
  comprobar('el catálogo de controles es el esperado',
    Object.keys(SLE2VIS.CONTROLES).join() ===
      'etiqueta,boton,caja,casilla,lista,desplegable,numero,progreso,deslizador,lienzo',
    Object.keys(SLE2VIS.CONTROLES).join());
  comprobar('cada uno declara su tamaño por omisión',
    Object.values(SLE2VIS.CONTROLES).every(c => c.ancho > 0 && c.alto > 0));
  /* El diseñador y el cuadro de herramientas leen esta misma tabla: si un
     control está acá y no tiene nombre para mostrar, aparece como «numero». */
  {
    require(require('path').join(__dirname, '..', 'js', 'disenador.js'));
    const lindos = (global.Disenador || {}).NOMBRE_LINDO || {};
    const sinNombre = Object.keys(SLE2VIS.CONTROLES).filter(t => !lindos[t]);
    comprobar('todos tienen nombre para mostrar en el diseñador',
      sinNombre.length === 0, sinNombre.join());
  }
  const nuevas = Object.keys(SLE2VIS.PREDEF).filter(n => !SLE2.PREDEF[n]);
  comprobar('el dialecto agrega más de treinta subrutinas', nuevas.length >= 30, String(nuevas.length));
  comprobar('y no pisa ninguna del lenguaje base',
    Object.keys(SLE2.PREDEF).every(n => !!SLE2VIS.PREDEF[n]));
}

/* ============ el aviso de «espera eventos» y el temporizador =========== */
/* El aviso es para el programa que espera algo que no puede llegar nunca. Un
   temporizador andando también lo despierta, así que un reloj o una animación
   —que no registran ningún clic— no tienen que recibirlo. */
{
  /* guiDeMentira() no anota los avisos, así que se le pone dónde dejarlos. */
  const conAvisos = () => {
    const avisos = [];
    const gui = SLE2VIS.guiDeMentira();
    gui.aviso = t => avisos.push(t);
    return { gui, avisos };
  };
  const hubo = avisos => avisos.some(a => /espera eventos/.test(a));

  const solo = conAvisos();
  const r1 = correr([
    'var', '   t : numerico',
    'inicio',
    '   ventana ("Reloj", 200, 100)',
    '   t = temporizador (50, "tic")',
    '   activar_temporizador (t, TRUE)',
    '   esperar_eventos ()',
    'fin', '',
    'subrutina tic (id : numerico)',
    'inicio',
    '   cerrar_ventana ()',
    'fin', ''].join('\n'), { gui: solo.gui, reloj: relojFalso() });
  await r1.listo();
  comprobar('un programa con solo un temporizador no recibe el aviso',
    !hubo(solo.avisos), solo.avisos.join(' | '));

  const nada = conAvisos();
  const r2 = correr([
    'inicio',
    '   ventana ("Nada", 200, 100)',
    '   etiqueta ("hola", 10, 10)',
    '   esperar_eventos ()',
    'fin', ''].join('\n'), { gui: nada.gui });
  await r2.listo();
  comprobar('y el que no tiene ni clics ni temporizador sí lo recibe',
    hubo(nada.avisos), nada.avisos.join(' | '));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'ESLE2 Visual tiene fallos');
})();

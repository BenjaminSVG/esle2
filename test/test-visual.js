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
  const fin = SLE2VIS.ejecutar(fuente, io(salida), { gui, control })
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

/* --------------------- el catálogo que usa la página -------------------- */
{
  comprobar('hay siete controles', Object.keys(SLE2VIS.CONTROLES).length === 7,
    Object.keys(SLE2VIS.CONTROLES).join());
  comprobar('cada uno declara su tamaño por omisión',
    Object.values(SLE2VIS.CONTROLES).every(c => c.ancho > 0 && c.alto > 0));
  const nuevas = Object.keys(SLE2VIS.PREDEF).filter(n => !SLE2.PREDEF[n]);
  comprobar('el dialecto agrega más de treinta subrutinas', nuevas.length >= 30, String(nuevas.length));
  comprobar('y no pisa ninguna del lenguaje base',
    Object.keys(SLE2.PREDEF).every(n => !!SLE2VIS.PREDEF[n]));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'ESLE2 Visual tiene fallos');
})();

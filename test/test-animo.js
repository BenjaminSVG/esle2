/*
 * Prueba del detector: cuándo conviene decir algo y —sobre todo— cuándo no.
 *
 * Lo importante acá son los falsos positivos. Un cartel que aparece en medio
 * de un rato de trabajo normal es la forma más rápida de que nadie vuelva a
 * leer un cartel de estos nunca más.
 *
 *   node test/test-animo.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'animo.js'));
const { Animo } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* Corre una tanda de eventos y devuelve los avisos que salieron. */
function tanda(eventos, opciones) {
  let estado = Animo.vacio();
  const avisos = [];
  for (const ev of eventos) {
    const r = Animo.evaluar(estado, ev, opciones);
    estado = r.estado;
    if (r.aviso) avisos.push(r.aviso);
  }
  return { avisos, estado };
}

const MISMO = 'se esperaba ")" y se encontró "="';
const OTRO = 'falta la palabra "fin"';

(() => {
  /* ------------------------------------------------------------------ */
  seccion('Cuando sí');
  {
    const eventos = [];
    for (let i = 0; i < 5; i++) eventos.push({ error: MISMO, linea: 4, ahora: i * 20000 });
    const { avisos } = tanda(eventos);
    comprobar('cinco veces el mismo error en menos de dos minutos avisa', avisos.length === 1, avisos.length);
    comprobar('y dice de qué línea es', avisos[0] && avisos[0].linea === 4);
    comprobar('el primer mensaje ofrece mirar la línea',
      avisos[0] && /línea/.test(avisos[0].accion), avisos[0] && avisos[0].accion);
    comprobar('y no reta a nadie',
      avisos[0] && !/mal|error tuyo|deberías/i.test(avisos[0].texto), avisos[0] && avisos[0].texto);
  }

  /* ------------------------------------------------------------------ */
  seccion('Cuando no');
  {
    /* Cuatro no alcanzan. */
    const cuatro = [];
    for (let i = 0; i < 4; i++) cuatro.push({ error: MISMO, linea: 4, ahora: i * 10000 });
    comprobar('cuatro veces no avisa', tanda(cuatro).avisos.length === 0);

    /* Cinco veces, pero repartidas en media hora: eso no es trabarse. */
    const lento = [];
    for (let i = 0; i < 8; i++) lento.push({ error: MISMO, linea: 4, ahora: i * 300000 });
    comprobar('el mismo error cada cinco minutos no es trabarse',
      tanda(lento).avisos.length === 0);

    /* Errores distintos: está avanzando, aunque le cueste. */
    const variados = [
      { error: MISMO, linea: 4, ahora: 0 },
      { error: OTRO, linea: 9, ahora: 10000 },
      { error: MISMO, linea: 4, ahora: 20000 },
      { error: OTRO, linea: 9, ahora: 30000 },
      { error: MISMO, linea: 4, ahora: 40000 }
    ];
    comprobar('errores distintos no avisan: está avanzando',
      tanda(variados).avisos.length === 0);

    /* Una compilación buena en el medio corta la racha. */
    const conExito = [
      { error: MISMO, linea: 4, ahora: 0 },
      { error: MISMO, linea: 4, ahora: 10000 },
      { error: null, ahora: 20000 },
      { error: MISMO, linea: 4, ahora: 30000 },
      { error: MISMO, linea: 4, ahora: 40000 },
      { error: MISMO, linea: 4, ahora: 50000 }
    ];
    comprobar('si algo compiló en el medio, la cuenta empieza de nuevo',
      tanda(conExito).avisos.length === 0);

    comprobar('compilar bien deja la cuenta en cero',
      tanda([{ error: MISMO, ahora: 0 }, { error: null, ahora: 1 }]).estado.veces === 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('No repite');
  {
    /* Veinte veces seguidas el mismo error: tiene que hablar una sola vez. */
    const muchas = [];
    for (let i = 0; i < 20; i++) muchas.push({ error: MISMO, linea: 4, ahora: i * 5000 });
    const { avisos } = tanda(muchas);
    comprobar('veinte intentos no dan veinte carteles', avisos.length === 1, avisos.length);

    /* Y si vuelve a pasar mucho después, habla otra vez, con el otro mensaje. */
    const dosVeces = muchas.concat([]);
    for (let i = 0; i < 5; i++) dosVeces.push({ error: MISMO, linea: 4, ahora: 900000 + i * 10000 });
    const r = tanda(dosVeces);
    comprobar('pero diez minutos después vuelve a hablar', r.avisos.length === 2, r.avisos.length);
    comprobar('y la segunda vez propone parar, no repite lo mismo',
      r.avisos[1] && /30 segundos/.test(r.avisos[1].accion), r.avisos[1] && r.avisos[1].accion);
    comprobar('los dos mensajes son distintos',
      r.avisos[0].titulo !== r.avisos[1].titulo);

    /* Y de ahí en más no inventa mensajes nuevos que no existen. */
    const tresVeces = dosVeces.concat([]);
    for (let i = 0; i < 5; i++) tresVeces.push({ error: MISMO, linea: 4, ahora: 1800000 + i * 10000 });
    const r3 = tanda(tresVeces);
    comprobar('la tercera vez repite el último mensaje, no se rompe',
      r3.avisos.length === 3 && !!r3.avisos[2].titulo, JSON.stringify(r3.avisos.length));
  }

  /* ------------------------------------------------------------------ */
  seccion('Se puede afinar');
  {
    const dos = [{ error: MISMO, ahora: 0 }, { error: MISMO, ahora: 1000 }];
    comprobar('con repeticiones: 2 avisa a la segunda',
      tanda(dos, { repeticiones: 2 }).avisos.length === 1);
    comprobar('con una ventana chica, no',
      tanda([{ error: MISMO, ahora: 0 }, { error: MISMO, ahora: 5000 }],
        { repeticiones: 2, ventana: 1000 }).avisos.length === 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('El estado se puede guardar y volver a cargar');
  {
    /* Vive en localStorage entre recargas, así que tiene que sobrevivir a un
       viaje por JSON sin cambiar de comportamiento. */
    let estado = Animo.vacio();
    for (let i = 0; i < 4; i++) {
      estado = Animo.evaluar(estado, { error: MISMO, linea: 4, ahora: i * 10000 }, {}).estado;
      estado = JSON.parse(JSON.stringify(estado));
    }
    const r = Animo.evaluar(estado, { error: MISMO, linea: 4, ahora: 40000 }, {});
    comprobar('avisa igual después de pasar por JSON', !!r.aviso, JSON.stringify(estado));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el detector tiene fallos');
})();

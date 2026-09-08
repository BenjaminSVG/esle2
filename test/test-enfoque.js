/*
 * Prueba de la música del modo enfoque.
 *
 * Se prueba sin navegador y sin hacer ruido: la parte que decide qué suena es
 * cálculo puro, y la que suena de verdad se prueba con un contexto de audio de
 * mentira que anota lo que se le pidió, igual que test/test-sonido.js.
 *
 * Lo que importa acá: que nunca desafine (toda nota tiene que pertenecer al
 * acorde), que nunca se pase de volumen —es fondo, hay gente estudiando— y
 * que no se repita igual, que es lo que vuelve insoportable a la música de
 * fondo hecha con dos compases en bucle.
 *
 *   node test/test-enfoque.js
 */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'enfoque.js'));
const { Enfoque } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* De Hz a número de nota MIDI, para poder preguntar «¿esta nota está en el
   acorde?» sin comparar números con coma. */
const midi = f => Math.round(69 + 12 * Math.log2(f / 440));

/* Un contexto de audio de mentira: anota cada oscilador y cada ganancia sin
   hacer ruido ni necesitar navegador. */
function contextoFalso() {
  const c = {
    currentTime: 0,
    state: 'running',
    osciladores: [],
    ganancias: [],
    destination: { nombre: 'salida' },
    createOscillator() {
      const o = {
        type: '', frecuencias: [], arranca: null, para: null, destino: null,
        frequency: { setValueAtTime: (v, t) => o.frecuencias.push([v, t]) },
        connect(d) { o.destino = d; },
        start(t) { o.arranca = t; },
        stop(t) { o.para = t; }
      };
      c.osciladores.push(o);
      return o;
    },
    createGain() {
      const g = {
        rampas: [], destino: null,
        gain: {
          value: 1,
          setValueAtTime: (v, t) => g.rampas.push(['fijar', v, t]),
          exponentialRampToValueAtTime: (v, t) => g.rampas.push(['exp', v, t]),
          linearRampToValueAtTime: (v, t) => g.rampas.push(['lin', v, t])
        },
        connect(d) { g.destino = d; }
      };
      c.ganancias.push(g);
      return g;
    },
    close() { c.cerrado = true; }
  };
  return c;
}

(() => {
  /* ------------------------------------------------------------------ */
  seccion('La vuelta de acordes');
  {
    comprobar('son cuatro acordes', Enfoque.ACORDES.length === 4);
    comprobar('la vuelta se repite cada cuatro compases',
      Enfoque.compas(0).acorde === Enfoque.compas(4).acorde
      && Enfoque.compas(1).acorde === Enfoque.compas(5).acorde);
    comprobar('empieza en Dm7 y pasa por Cmaj7',
      Enfoque.compas(0).acorde === 'Dm7' && Enfoque.compas(2).acorde === 'Cmaj7',
      Enfoque.compas(0).acorde + ' / ' + Enfoque.compas(2).acorde);
    comprobar('un compás negativo no rompe nada (el módulo de JS da negativo)',
      Enfoque.compas(-1).acorde === 'Am7', Enfoque.compas(-1).acorde);
  }

  /* ------------------------------------------------------------------ */
  seccion('Nunca desafina');
  {
    /* Toda nota de todo compás tiene que ser una nota del acorde, en alguna
       octava. Es lo único que garantiza que música calculada no suene mal. */
    let ajenas = 0, revisadas = 0;
    for (let i = 0; i < 200; i++) {
      const cp = Enfoque.compas(i);
      const a = Enfoque.ACORDES[((i % 4) + 4) % 4];
      const clases = new Set(a.tonos.concat([a.bajo]).map(n => ((n % 12) + 12) % 12));
      for (const nota of cp.notas) {
        revisadas++;
        if (!clases.has(((midi(nota.f) % 12) + 12) % 12)) ajenas++;
      }
    }
    comprobar('doscientos compases sin una sola nota ajena al acorde',
      ajenas === 0, ajenas + ' ajenas de ' + revisadas);
    comprobar('y se revisaron unas cuantas', revisadas > 1000, revisadas);
  }

  /* ------------------------------------------------------------------ */
  seccion('Es fondo, no es un recital');
  {
    let alto = 0, fuera = 0, larga = 0;
    for (let i = 0; i < 200; i++) {
      for (const n of Enfoque.compas(i).notas) {
        if (n.vol > Enfoque.VOL_MAXIMO) alto++;
        if (n.t < 0 || n.t >= Enfoque.COMPAS) fuera++;
        /* Una nota puede pasarse un poco del compás —así se encadenan— pero
           no puede durar dos compases: se amontonarían. */
        if (n.t + n.d > Enfoque.COMPAS * 2) larga++;
      }
    }
    comprobar('ninguna nota pasa el techo de volumen', alto === 0, alto);
    comprobar('ninguna nota empieza fuera de su compás', fuera === 0, fuera);
    comprobar('ninguna nota se estira más de dos compases', larga === 0, larga);

    const suma = Enfoque.compas(0).notas.reduce((s, n) => s + n.vol, 0);
    comprobar('ni todas juntas llegan a un volumen molesto', suma < 0.35, suma);

    comprobar('las frecuencias caen en un rango audible y cómodo',
      Enfoque.compas(7).notas.every(n => n.f > 40 && n.f < 1500),
      Enfoque.compas(7).notas.map(n => Math.round(n.f)).join(' '));
  }

  /* ------------------------------------------------------------------ */
  seccion('No se repite igual');
  {
    const huella = i => Enfoque.compas(i).notas.map(n => Math.round(n.f) + '@' + n.t.toFixed(2)).join('|');
    comprobar('el mismo compás da siempre lo mismo', huella(11) === huella(11));

    /* Los compases con el mismo acorde (0, 4, 8, 12…) no pueden ser todos
       idénticos: si lo fueran, se escucharía el bucle. */
    const conMismoAcorde = [0, 4, 8, 12, 16, 20, 24, 28].map(huella);
    comprobar('pero dos vueltas con el mismo acorde no suenan idénticas',
      new Set(conMismoAcorde).size > 3, new Set(conMismoAcorde).size + ' distintas de 8');

    let iguales = 0;
    for (let i = 0; i < 300; i++) if (huella(i) === huella(i + 4)) iguales++;
    comprobar('y eso pasa en casi toda la corrida', iguales < 120, iguales + ' repetidos de 300');
  }

  /* ------------------------------------------------------------------ */
  seccion('Cuando suena de verdad');
  {
    const c = contextoFalso();
    const m = Enfoque.crearMusica({ crearContexto: () => c, volumen: 0.5 });

    comprobar('no suena hasta que se le pide', c.osciladores.length === 0 && !m.sonando);
    comprobar('arranca bien', m.arrancar() === true && m.sonando);
    comprobar('y programa los primeros compases', c.osciladores.length > 0, c.osciladores.length);

    comprobar('todo va al volumen general y no directo a la salida',
      c.osciladores.every(o => o.destino && o.destino !== c.destination));

    comprobar('nada arranca antes de tiempo',
      c.osciladores.every(o => o.arranca >= 0 && o.para > o.arranca));

    /* Se programa con ventaja, pero no de más: mil osciladores vivos por
       adelantado dejarían la pestaña sin aire. */
    comprobar('programa con ventaja pero sin exagerar',
      c.osciladores.length < 60, c.osciladores.length);

    const antes = c.osciladores.length;
    comprobar('mientras el reloj no avanza, no vuelve a programar nada',
      m.programar() === 0 && c.osciladores.length === antes);

    c.currentTime = 30;
    m.programar();
    comprobar('cuando el reloj avanza, sigue', c.osciladores.length > antes);

    /* La pestaña estuvo dormida diez minutos: al volver no puede vomitar
       diez minutos de música atrasada de golpe. */
    const antesDeDormir = c.osciladores.length;
    c.currentTime = 630;
    m.programar();
    comprobar('volver de una pestaña dormida no dispara cientos de notas',
      c.osciladores.length - antesDeDormir < 60, c.osciladores.length - antesDeDormir);

    comprobar('el volumen se puede bajar', m.volumen(0.2) === 0.2);
    comprobar('y no se puede pasar de los extremos',
      m.volumen(9) === 1 && m.volumen(-3) === 0);

    m.parar();
    comprobar('parar detiene el reloj', !m.sonando);
  }

  /* ------------------------------------------------------------------ */
  seccion('Sin Web Audio no rompe nada');
  {
    const m = Enfoque.crearMusica({ crearContexto: () => { throw new Error('no hay audio'); } });
    comprobar('en un navegador sin audio, arrancar dice que no y sigue de largo',
      m.arrancar() === false && !m.sonando);
    let exploto = false;
    try { m.parar(); } catch (e) { exploto = true; }
    comprobar('y parar tampoco explota', !exploto);
  }

  console.log('\n' + ok + ' bien, ' + fallos + ' mal');
  process.exit(fallos ? 1 : 0);
})();

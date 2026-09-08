/*
 * Prueba de los micro-sonidos (js/sonido.js).
 *
 * No se puede escuchar nada desde Node, pero sí verificar todo lo demás: que
 * los efectos sean cortos y suaves, que las notas estén afinadas donde dicen,
 * que se programe un oscilador por nota con su envolvente, que apagar el
 * sonido no genere nada, y que el contexto de audio no se cree hasta que hace
 * falta —si se creara al cargar la página, el navegador lo bloquearía—.
 *   node test/test-sonido.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'sonido.js'));
const { Sonido } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

/* --------------------- un contexto de audio de mentira ------------------ */
function contextoFalso() {
  const c = {
    currentTime: 10,
    state: 'running',
    resumido: 0,
    osciladores: [],
    ganancias: [],
    destination: { nombre: 'salida' },
    resume() { c.resumido++; },
    createOscillator() {
      const o = {
        type: null, frecuencias: [], inicio: null, fin: null, conectado: null,
        frequency: { setValueAtTime: (v, t) => o.frecuencias.push({ v, t }) },
        connect: d => { o.conectado = d; },
        start: t => { o.inicio = t; },
        stop: t => { o.fin = t; }
      };
      c.osciladores.push(o);
      return o;
    },
    createGain() {
      const g = {
        rampas: [], conectado: null,
        gain: {
          value: 1,
          setValueAtTime: (v, t) => g.rampas.push({ tipo: 'set', v, t }),
          exponentialRampToValueAtTime: (v, t) => g.rampas.push({ tipo: 'rampa', v, t })
        },
        connect: d => { g.conectado = d; }
      };
      c.ganancias.push(g);
      return g;
    }
  };
  return c;
}

function nuevo(guardado) {
  const memoria = { valor: guardado === undefined ? null : guardado };
  let creados = 0;
  let ctx = null;
  Sonido.iniciar({
    crearContexto: () => { creados++; ctx = contextoFalso(); return ctx; },
    leer: () => memoria.valor,
    guardar: (k, v) => { memoria.valor = v; }
  });
  return { memoria, ctx: () => ctx, creados: () => creados };
}

/* ------------------------ cómo son los efectos -------------------------- */
{
  const nombres = Object.keys(Sonido.EFECTOS);
  comprobar('están los tres efectos', nombres.join() === 'exito,logro,error', nombres.join());

  for (const [nombre, e] of Object.entries(Sonido.EFECTOS)) {
    comprobar(`«${nombre}» no se pasa de volumen`, e.vol > 0 && e.vol <= Sonido.VOL_MAXIMO, String(e.vol));
    comprobar(`«${nombre}» dura menos de un segundo`, Sonido.duracion(e) < 1, Sonido.duracion(e) + ' s');
    comprobar(`«${nombre}» tiene notas audibles`,
      e.notas.length >= 2 && e.notas.every(n => n.f >= 200 && n.f <= 2000 && n.d > 0 && n.t >= 0),
      JSON.stringify(e.notas));
    comprobar(`«${nombre}» entra enseguida`, e.notas[0].t === 0);
    comprobar(`«${nombre}» usa una onda suave`, ['sine', 'triangle'].includes(e.onda), e.onda);
  }
}
{
  const s = Sonido.EFECTOS.exito.notas, l = Sonido.EFECTOS.logro.notas, x = Sonido.EFECTOS.error.notas;
  comprobar('el éxito sube', s[1].f > s[0].f);
  comprobar('el error baja', x[1].f < x[0].f);
  comprobar('y suena más bajo que el éxito', Sonido.EFECTOS.error.vol < Sonido.EFECTOS.exito.vol);
  comprobar('el logro es un arpegio que sube', l.every((n, i) => i === 0 || n.f > l[i - 1].f),
    l.map(n => n.f).join(' '));
  comprobar('el logro cierra una octava arriba del principio',
    Math.abs(l[l.length - 1].f / l[0].f - 2) < 0.01, String(l[l.length - 1].f / l[0].f));
  comprobar('el logro es el más largo',
    Sonido.duracion(Sonido.EFECTOS.logro) > Sonido.duracion(Sonido.EFECTOS.exito));
}

/* ---------------------------- al reproducir ----------------------------- */
{
  const s = nuevo();
  comprobar('arranca encendido si no hay nada guardado', Sonido.activo() === true);
  comprobar('el contexto no se crea al iniciar', s.creados() === 0);

  comprobar('tocar devuelve que sonó', Sonido.tocar('logro') === true);
  comprobar('y recién ahí se crea el contexto', s.creados() === 1);

  const c = s.ctx();
  const e = Sonido.EFECTOS.logro;
  comprobar('un oscilador por nota', c.osciladores.length === e.notas.length,
    String(c.osciladores.length));
  comprobar('cada uno con su frecuencia',
    c.osciladores.map(o => o.frecuencias[0].v).join() === e.notas.map(n => n.f).join(),
    c.osciladores.map(o => o.frecuencias[0].v).join());
  comprobar('con la onda del efecto', c.osciladores.every(o => o.type === e.onda));
  comprobar('empiezan en el momento que les toca',
    c.osciladores.map(o => o.inicio).join() === e.notas.map(n => 10 + n.t).join(),
    c.osciladores.map(o => o.inicio).join());
  comprobar('y todos se apagan solos',
    c.osciladores.every((o, i) => o.fin > o.inicio && o.fin <= 10 + e.notas[i].t + e.notas[i].d + 0.05));

  /* La envolvente: entra desde casi cero, sube al volumen y vuelve a bajar. */
  const g = c.ganancias[1];   // la 0 es la maestra
  comprobar('la envolvente arranca en silencio', g.rampas[0].tipo === 'set' && g.rampas[0].v < 0.001);
  comprobar('sube al volumen del efecto', g.rampas[1].v === e.vol, String(g.rampas[1].v));
  comprobar('y se apaga antes de cortar', g.rampas[2].v < 0.001 && g.rampas[2].t > g.rampas[1].t);
  comprobar('nunca llega a cero (la rampa exponencial no puede)',
    c.ganancias.slice(1).every(x => x.rampas.every(r => r.v > 0)));
  comprobar('todo pasa por la ganancia maestra',
    c.osciladores.every((o, i) => o.conectado === c.ganancias[i + 1]) &&
    c.ganancias.slice(1).every(x => x.conectado === c.ganancias[0]));
  comprobar('y la maestra, a la salida', c.ganancias[0].conectado === c.destination);
}
{
  const s = nuevo();
  Sonido.tocar('exito');
  const antes = s.creados();
  Sonido.tocar('exito');
  comprobar('el contexto se crea una sola vez', s.creados() === antes && antes === 1);
  comprobar('las notas se acumulan en el mismo contexto', s.ctx().osciladores.length === 4);
}
{
  const s = nuevo();
  comprobar('un efecto que no existe no hace nada', Sonido.tocar('inventado') === false);
  comprobar('y ni siquiera crea el contexto', s.creados() === 0);
}
{
  const s = nuevo();
  s.ctx();
  Sonido.tocar('exito');
  s.ctx().state = 'suspended';
  Sonido.tocar('exito');
  comprobar('si el navegador lo durmió, se lo despierta', s.ctx().resumido === 1,
    String(s.ctx().resumido));
}

/* ------------------------------ apagarlo -------------------------------- */
{
  const s = nuevo('no');
  comprobar('lo guardado manda: arranca apagado', Sonido.activo() === false);
  comprobar('apagado no suena', Sonido.tocar('logro') === false);
  comprobar('ni crea el contexto', s.creados() === 0);

  comprobar('se puede encender', Sonido.alternar() === true);
  comprobar('y queda guardado', s.memoria.valor === 'si');
  comprobar('al encender se escucha una muestra', s.creados() === 1);

  Sonido.alternar();
  comprobar('se vuelve a apagar', Sonido.activo() === false && s.memoria.valor === 'no');
  const cuantos = s.ctx().osciladores.length;
  Sonido.tocar('logro');
  comprobar('y ya no programa nada más', s.ctx().osciladores.length === cuantos);

  Sonido.alternar(true);
  comprobar('alternar acepta un valor explícito', Sonido.activo() === true);
  Sonido.alternar(false);
  comprobar('en los dos sentidos', Sonido.activo() === false);
}
{
  /* Sin Web Audio —un navegador viejo— no puede romperse nada. */
  Sonido.iniciar({ crearContexto: () => null, leer: () => null, guardar: () => {} });
  comprobar('sin audio, tocar devuelve falso y sigue', Sonido.tocar('exito') === false);
  Sonido.iniciar({ crearContexto: () => { throw new Error('bloqueado'); }, leer: () => null, guardar: () => {} });
  comprobar('si el navegador lo bloquea, tampoco rompe', Sonido.tocar('exito') === false);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'los sonidos tienen fallos');

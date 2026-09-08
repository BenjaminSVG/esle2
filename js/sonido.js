/*
 * Micro-sonidos del IDE.
 *
 * Tres avisos cortos y suaves: cuando el programa compila o termina bien,
 * cuando se resuelve un ejercicio, y cuando algo falla. La idea es que se
 * sientan más que se escuchen —son de menos de un segundo— y que la buena
 * noticia suene un poquito mejor que la mala, que es lo que hace que dé ganas
 * de volver a intentar.
 *
 * No hay archivos de audio: las notas se sintetizan con la Web Audio API, así
 * que esto no pesa nada, funciona sin internet y se puede afinar cambiando
 * números en vez de grabando de nuevo. Cada efecto es una lista de notas con
 * su frecuencia (Hz), cuándo entra y cuánto dura (segundos).
 *
 * El navegador no deja sonar nada hasta que la persona toca algo, así que el
 * contexto de audio se crea recién en el primer sonido —que siempre viene
 * después de un clic o una tecla— y no al cargar la página.
 *
 * API (la parte de cálculo la prueba test/test-sonido.js con un contexto de
 * mentira, sin navegador y sin hacer ruido)
 *   Sonido.iniciar({ crearContexto, guardar, leer })
 *   Sonido.tocar('exito' | 'logro' | 'error')
 *   Sonido.activo() / Sonido.alternar()
 *   Sonido.EFECTOS
 */
(function (global) {
  'use strict';

  const CLAVE = 'esle2_sonido';
  const VOL_MAXIMO = 0.15;   // ningún efecto puede pasar de acá: son avisos, no música
  const SILENCIO = 0.0001;   // la rampa exponencial no puede llegar a cero

  /* Las notas, en Hz. Sirven para leer la música de abajo sin una tabla. */
  const N = {
    sib3: 233.08, mib4: 311.13, sol4: 392.00,
    do5: 523.25, mi5: 659.25, sol5: 783.99, si5: 987.77, do6: 1046.50
  };

  const EFECTOS = {
    /* Compiló o terminó bien: dos notas que suben, cortas. */
    exito: {
      onda: 'sine', vol: 0.10,
      notas: [
        { f: N.mi5, t: 0, d: 0.15 },
        { f: N.si5, t: 0.07, d: 0.22 }
      ]
    },
    /* Ejercicio resuelto: un arpegio de do mayor que cierra una octava arriba.
       Es el único que se permite durar más de un cuarto de segundo. */
    logro: {
      onda: 'triangle', vol: 0.11,
      notas: [
        { f: N.do5, t: 0, d: 0.18 },
        { f: N.mi5, t: 0.08, d: 0.18 },
        { f: N.sol5, t: 0.16, d: 0.20 },
        { f: N.do6, t: 0.26, d: 0.40 }
      ]
    },
    /* Algo falló: dos notas graves que bajan, más bajas de volumen. Un error
       ya se ve en pantalla; el sonido solo lo acompaña, no reta a nadie. */
    error: {
      onda: 'sine', vol: 0.07,
      notas: [
        { f: N.mib4, t: 0, d: 0.16 },
        { f: N.sib3, t: 0.09, d: 0.26 }
      ]
    }
  };

  const duracion = e => Math.max.apply(null, e.notas.map(n => n.t + n.d));

  let ctx = null;
  let maestro = null;
  let encendido = true;
  let cfg = {};

  function iniciar(opciones) {
    /* Reconfigurar es empezar de nuevo: el contexto viejo ya no corresponde a
       esta configuración, así que se suelta (y se cierra, si se puede). */
    if (ctx && ctx.close) { try { ctx.close(); } catch (e) {} }
    ctx = null;
    maestro = null;
    cfg = opciones || {};
    const leido = cfg.leer ? cfg.leer(CLAVE) : null;
    encendido = leido === null || leido === undefined ? true : leido !== 'no';
    return api;
  }

  function activo() { return encendido; }

  function alternar(valor) {
    encendido = valor === undefined ? !encendido : !!valor;
    if (cfg.guardar) cfg.guardar(CLAVE, encendido ? 'si' : 'no');
    if (encendido) tocar('exito');          // así se escucha lo que se acaba de encender
    return encendido;
  }

  function contexto() {
    if (ctx) return ctx;
    const crear = cfg.crearContexto ||
      (global.AudioContext ? () => new global.AudioContext() :
       global.webkitAudioContext ? () => new global.webkitAudioContext() : null);
    if (!crear) return null;
    try { ctx = crear(); } catch (e) { return null; }
    if (!ctx) return null;
    maestro = ctx.createGain();
    maestro.gain.value = 1;
    maestro.connect(ctx.destination);
    return ctx;
  }

  /* Una nota: oscilador con una envolvente que entra rápido y se apaga sola.
     Sin la envolvente se escucharía un chasquido al empezar y al cortar. */
  function nota(c, destino, n, onda, vol) {
    const o = c.createOscillator();
    const g = c.createGain();
    const t0 = c.currentTime + n.t;
    o.type = onda;
    o.frequency.setValueAtTime(n.f, t0);
    g.gain.setValueAtTime(SILENCIO, t0);
    g.gain.exponentialRampToValueAtTime(Math.min(vol, VOL_MAXIMO), t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(SILENCIO, t0 + n.d);
    o.connect(g);
    g.connect(destino);
    o.start(t0);
    o.stop(t0 + n.d + 0.02);
    return o;
  }

  function tocar(cual) {
    const e = EFECTOS[cual];
    if (!e || !encendido) return false;
    const c = contexto();
    if (!c) return false;
    /* Si el navegador lo dejó dormido —pasa cuando la pestaña estuvo en
       segundo plano— hay que despertarlo antes de programar nada. */
    if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (err) {} }
    try { e.notas.forEach(n => nota(c, maestro, n, e.onda, e.vol)); }
    catch (err) { return false; }
    return true;
  }

  const api = { iniciar, tocar, activo, alternar, duracion, EFECTOS, CLAVE, VOL_MAXIMO };
  global.Sonido = api;
})(typeof window !== 'undefined' ? window : globalThis);

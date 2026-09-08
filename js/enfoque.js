/*
 * La música del modo enfoque.
 *
 * No hay archivos de audio. Ninguno: ni un mp3 de fondo, ni una pista traída
 * de otro sitio. Hay dos razones, y las dos importan.
 *
 *   · La legal. La música que suena «tipo lo-fi» en internet es de alguien.
 *     Una web de una universidad pública no puede repartir la canción de otro
 *     porque quede lindo, y no hay pista libre que uno pueda garantizar que va
 *     a seguir siendo libre dentro de dos años.
 *   · La práctica. Diez minutos de audio son diez megas. ESLE2 entero pesa
 *     menos que eso, anda sin internet y se instala en el teléfono de alguien
 *     que paga los datos que gasta.
 *
 * Así que la música se calcula. Es la misma idea de js/sonido.js pero larga:
 * una vuelta de cuatro acordes (Dm7 – G7 – Cmaj7 – Am7, la vuelta de siempre),
 * un bajo, unas notas sueltas encima, todo lento y bajito. No se repite igual
 * porque las notas sueltas de cada compás salen del número de compás, así que
 * la vuelta armónica vuelve pero la melodía no. No pesa nada y nunca se corta.
 *
 * Todo lo que decide QUÉ suena es cálculo puro y lo prueba
 * test/test-enfoque.js sin navegador y sin hacer ruido. Lo único que necesita
 * la Web Audio API es reproducirlo.
 *
 * API
 *   Enfoque.compas(i)            -> { acorde, notas: [{ f, t, d, vol, onda }] }
 *   Enfoque.ACORDES / COMPAS     -> la vuelta y cuánto dura un compás
 *   Enfoque.crearMusica(opts)    -> { arrancar, parar, volumen, sonando }
 */
(function (global) {
  'use strict';

  const VOL_MAXIMO = 0.09;   // techo duro: es fondo, no es un recital
  const SILENCIO = 0.0001;   // la rampa exponencial no puede llegar a cero

  /* 72 pulsos por minuto, cuatro por compás: un compás dura 3,33 segundos.
     Lento a propósito —es para estudiar, no para bailar—. */
  const PULSO = 60 / 72;
  const COMPAS = PULSO * 4;

  /* Los acordes, en números de nota MIDI. La vuelta ii–V–I–vi en do mayor:
     es la que suena en la mitad de la música que a esta altura ya escuchaste,
     y funciona porque nunca termina de cerrar; siempre quiere seguir. */
  const ACORDES = [
    { nombre: 'Dm7',    bajo: 38, tonos: [50, 53, 57, 60] },   // re fa la do
    { nombre: 'G7',     bajo: 43, tonos: [50, 55, 59, 65] },   // re sol si fa
    { nombre: 'Cmaj7',  bajo: 36, tonos: [48, 52, 55, 59] },   // do mi sol si
    { nombre: 'Am7',    bajo: 33, tonos: [45, 48, 52, 55] }    // la do mi sol
  ];

  /* De número de nota MIDI a Hz. El 69 es el la de 440. */
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  /* Un número estable a partir del compás: la melodía no se repite, pero es
     siempre la misma para el mismo compás. Sin Math.random, así se puede
     probar y así dos personas oyen lo mismo. */
  function mezclar(n) {
    let h = (n + 1) * 2654435761 % 4294967296;
    h ^= h >>> 13; h = (h * 1274126177) % 4294967296;
    return (h ^ (h >>> 16)) >>> 0;
  }

  /*
   * Un compás: el colchón, el bajo y dos notas sueltas.
   *
   *   · el colchón (pad) son tres notas del acorde que entran despacio y
   *     duran todo el compás. Es lo que hace que suene «suave» y no a piano
   *     de juguete;
   *   · el bajo marca el 1 y el 3, una octava abajo;
   *   · encima caen dos notas del acorde, siempre del acorde —por eso nunca
   *     desafina— pero en lugares distintos según el compás.
   */
  function compas(i) {
    const a = ACORDES[((i % ACORDES.length) + ACORDES.length) % ACORDES.length];
    const r = mezclar(i);
    const notas = [];

    /* Colchón: las tres primeras notas del acorde, entrando escalonadas para
       que no arranquen todas de golpe. */
    a.tonos.slice(0, 3).forEach((n, k) => {
      notas.push({ f: hz(n), t: k * 0.06, d: COMPAS - 0.1, vol: 0.030, onda: 'sine', voz: 'colchon' });
    });

    /* Bajo en el 1 y en el 3. El segundo un poco más bajito: acompaña. */
    notas.push({ f: hz(a.bajo), t: 0, d: PULSO * 1.6, vol: 0.055, onda: 'triangle', voz: 'bajo' });
    notas.push({ f: hz(a.bajo), t: PULSO * 2, d: PULSO * 1.3, vol: 0.042, onda: 'triangle', voz: 'bajo' });

    /* Dos notas sueltas encima, una octava arriba del acorde. Caen en dos de
       los cuatro pulsos —nunca en el 1, que ya está ocupado por el bajo— y
       nunca las dos en el mismo lugar. */
    const primero = 1 + (r % 3);                       // pulso 1, 2 o 3
    const segundo = 1 + ((r >>> 8) % 3);
    const cuando = primero === segundo ? [primero] : [primero, segundo];
    cuando.forEach((p, k) => {
      const tono = a.tonos[((r >>> (4 + k * 6)) % a.tonos.length)] + 12;
      notas.push({
        f: hz(tono),
        t: p * PULSO + (k ? 0.08 : 0),
        d: PULSO * 1.2,
        vol: 0.038,
        onda: 'sine',
        voz: 'melodia'
      });
    });

    return { acorde: a.nombre, notas };
  }

  /* -------------------------------------------------------------------- */
  /* La parte que suena                                                    */
  /* -------------------------------------------------------------------- */

  /* Se programan los compases un poco antes de que toquen (dos segundos de
     ventaja) y se revisa cada medio segundo. Programarlos todos de una vez
     dejaría miles de osciladores vivos; programarlos justo a tiempo haría
     que se escuchen los saltos cuando la pestaña está ocupada. */
  const VENTAJA = 2;
  const REVISION = 500;

  function crearMusica(opciones) {
    const cfg = opciones || {};
    let ctx = null, maestro = null, reloj = null;
    let proximo = 0;        // en qué segundo del contexto arranca el compás que viene
    let n = 0;              // número de compás
    let vol = cfg.volumen === undefined ? 0.5 : cfg.volumen;

    function contexto() {
      if (ctx) return ctx;
      const crear = cfg.crearContexto ||
        (global.AudioContext ? () => new global.AudioContext() :
         global.webkitAudioContext ? () => new global.webkitAudioContext() : null);
      if (!crear) return null;
      try { ctx = crear(); } catch (e) { return null; }
      if (!ctx) return null;
      maestro = ctx.createGain();
      maestro.gain.value = vol;
      maestro.connect(ctx.destination);
      return ctx;
    }

    function nota(c, x) {
      const o = c.createOscillator();
      const g = c.createGain();
      const t0 = x.cuando;
      const pico = Math.min(x.vol, VOL_MAXIMO);
      /* Entrada lenta en el colchón y rápida en lo demás: es lo que separa
         un acorde que «aparece» de uno que suena a tecla apretada. */
      const ataque = x.voz === 'colchon' ? 0.45 : 0.02;
      o.type = x.onda;
      o.frequency.setValueAtTime(x.f, t0);
      g.gain.setValueAtTime(SILENCIO, t0);
      g.gain.exponentialRampToValueAtTime(pico, t0 + Math.min(ataque, x.d / 2));
      g.gain.exponentialRampToValueAtTime(SILENCIO, t0 + x.d);
      o.connect(g);
      g.connect(maestro);
      o.start(t0);
      o.stop(t0 + x.d + 0.05);
      return o;
    }

    function programar() {
      const c = ctx;
      if (!c) return 0;
      let puestos = 0;
      while (proximo < c.currentTime + VENTAJA) {
        /* Si la pestaña estuvo dormida, el reloj del contexto se fue lejos:
           en vez de programar cien compases atrasados de golpe, se retoma
           desde ahora. */
        if (proximo < c.currentTime) proximo = c.currentTime + 0.1;
        const cp = compas(n++);
        for (const x of cp.notas) {
          try { nota(c, { f: x.f, d: x.d, vol: x.vol, onda: x.onda, voz: x.voz, cuando: proximo + x.t }); }
          catch (e) { return puestos; }
        }
        proximo += COMPAS;
        puestos++;
      }
      return puestos;
    }

    function arrancar() {
      if (reloj) return true;
      const c = contexto();
      if (!c) return false;
      if (c.state === 'suspended' && c.resume) { try { c.resume(); } catch (e) {} }
      proximo = c.currentTime + 0.2;
      programar();
      reloj = setInterval(programar, REVISION);
      return true;
    }

    function parar() {
      if (reloj) { clearInterval(reloj); reloj = null; }
      /* Las notas ya programadas se apagan bajando el volumen general en
         medio segundo: cortar el contexto de golpe hace un chasquido feo. */
      if (ctx && maestro) {
        try {
          maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
          maestro.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        } catch (e) {}
      }
      setTimeout(() => {
        if (reloj) return;                       // volvió a arrancar mientras tanto
        if (ctx && ctx.close) { try { ctx.close(); } catch (e) {} }
        ctx = null; maestro = null; n = 0;
      }, 700);
    }

    function volumen(v) {
      if (v === undefined) return vol;
      vol = Math.max(0, Math.min(1, v));
      if (maestro && ctx) {
        try {
          maestro.gain.setValueAtTime(maestro.gain.value, ctx.currentTime);
          maestro.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.15);
        } catch (e) { maestro.gain.value = vol; }
      }
      return vol;
    }

    return {
      arrancar, parar, volumen, programar,
      get sonando() { return !!reloj; },
      get compasActual() { return n; }
    };
  }

  global.Enfoque = { compas, crearMusica, hz, ACORDES, COMPAS, PULSO, VOL_MAXIMO };
})(typeof window !== 'undefined' ? window : globalThis);

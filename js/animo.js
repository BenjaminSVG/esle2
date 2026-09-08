/*
 * Cuando alguien se traba.
 *
 * Trabarse con el mismo error una y otra vez es lo más normal del mundo
 * aprendiendo a programar, y también el momento exacto en el que la gente
 * abandona. Este módulo mira las últimas compilaciones y decide si conviene
 * decir algo.
 *
 * La regla es la que se pidió: el MISMO error de sintaxis, cinco veces
 * seguidas, en menos de dos minutos. «Seguidas» es literal: una compilación
 * que anduvo, o un error distinto, empieza la cuenta de nuevo. Si no fuera
 * así, aparecería en medio de un rato de trabajo normal, que es la forma más
 * rápida de que alguien no vuelva a leer nunca más un cartel de estos.
 *
 * Tres reglas de la casa, todas por la misma razón —que esto ayude y no
 * moleste—:
 *
 *   · **no interrumpe**. No es un cartel modal ni roba el foco; es un mensaje
 *     más en la salida, que ya se anuncia sola a un lector de pantalla;
 *   · **no repite**. Después de aparecer se calla un rato largo, aunque se
 *     siga trabando: ya lo dijo;
 *   · **se puede apagar para siempre**, y si alguien lo apaga, se apagó. Nada
 *     de volver a preguntar a la semana.
 *
 * Escala en dos pasos: la primera vez ofrece mirar la línea juntos; si vuelve
 * a pasar, propone parar treinta segundos, que es lo que de verdad destraba
 * cuando uno ya está leyendo sin ver.
 *
 * API (cálculo puro, sin DOM ni reloj propio: lo prueba test/test-animo.js)
 *   Animo.evaluar(estado, evento, opciones) -> { estado, aviso | null }
 *   Animo.vacio()                           -> estado inicial
 *   Animo.MENSAJES
 */
(function (global) {
  'use strict';

  const VENTANA = 120000;    // dos minutos
  const REPETICIONES = 5;    // cinco veces el mismo error
  const DESCANSO = 600000;   // diez minutos de silencio después de avisar

  /* ultimoAviso arranca en null y no en 0: un 0 querría decir «avisé en el
     instante cero», y con eso el descanso taparía el primer aviso para
     siempre. null sobrevive a JSON, que es donde vive esto entre recargas. */
  const vacio = () => ({ error: null, veces: 0, desde: 0, ultimoAviso: null, avisos: 0 });

  /* Los dos mensajes, en orden. El primero ofrece hacer algo; el segundo, que
     aparece si el primero no alcanzó, propone parar. */
  const MENSAJES = [
    {
      titulo: '¿Te trabaste?',
      texto: 'Es el mismo error unas cuantas veces seguidas. Pasa siempre: programar es '
        + 'probar y fallar, y encontrar UN error puede llevar más que escribir el programa entero. '
        + '¿Miramos juntos la línea?',
      accion: 'Llevame a la línea'
    },
    {
      titulo: 'Pará treinta segundos',
      texto: 'Sigue apareciendo lo mismo. Cuando uno ya leyó diez veces la misma línea deja de '
        + 'verla: los ojos pasan por arriba. Treinta segundos mirando otra cosa hacen más que '
        + 'otros diez intentos, en serio.',
      accion: 'Tomarme 30 segundos'
    }
  ];

  /* Un evento es { error, linea, ahora }. «error» es el mensaje del error de
     compilación, o null si compiló. */
  function evaluar(estado, evento, opciones) {
    const op = opciones || {};
    const ventana = op.ventana || VENTANA;
    const repeticiones = op.repeticiones || REPETICIONES;
    const descanso = op.descanso === undefined ? DESCANSO : op.descanso;
    const ahora = evento.ahora;
    const e = Object.assign({}, estado || vacio());

    /* Compiló: se acabó la racha. Es el final feliz y no hay nada que decir. */
    if (!evento.error) return { estado: Object.assign(e, { error: null, veces: 0, desde: 0 }), aviso: null };

    /* Otro error, o el mismo pero después de mucho rato: empieza de nuevo. */
    if (e.error !== evento.error || ahora - e.desde > ventana) {
      return { estado: Object.assign(e, { error: evento.error, veces: 1, desde: ahora }), aviso: null };
    }

    e.veces++;
    if (e.veces < repeticiones) return { estado: e, aviso: null };
    if (e.ultimoAviso !== null && ahora - e.ultimoAviso < descanso) return { estado: e, aviso: null };

    /* Se cumplió todo: se avisa, y se calla un buen rato. */
    const cual = Math.min(e.avisos, MENSAJES.length - 1);
    e.ultimoAviso = ahora;
    e.avisos++;
    e.veces = 0;                 // después de avisar, la cuenta arranca limpia
    e.desde = ahora;
    return {
      estado: e,
      aviso: Object.assign({ paso: cual, linea: evento.linea, error: evento.error }, MENSAJES[cual])
    };
  }

  global.Animo = { evaluar, vacio, MENSAJES, VENTANA, REPETICIONES, DESCANSO };
})(typeof window !== 'undefined' ? window : globalThis);

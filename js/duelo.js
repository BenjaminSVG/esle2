/*
 * Batallas de código: dos personas, el mismo problema, cinco minutos.
 *
 * Se juega en una sala de clase: alguien crea la batalla y dicta un código
 * corto —«RIO-482»— y los demás entran con ese código. No hay sala pública ni
 * emparejamiento con desconocidos: en un aula el rival está al lado, y armar
 * una sala de espera global sería juntar menores con gente de internet para
 * ganar muy poco.
 *
 * Todo lo que decide la partida se calcula igual en las dos máquinas, sin
 * servidor que arbitre:
 *
 *   · **quién contra quién**: se ordenan los identificadores y se emparejan de
 *     a dos. Las dos computadoras hacen la misma cuenta y llegan al mismo
 *     resultado, sin ponerse de acuerdo en nada;
 *   · **qué ejercicio toca**: sale de un número derivado del código y de la
 *     ronda, así que los dos reciben el mismo problema;
 *   · **quién ganó**: el primero que pasa todos los casos escribe su nombre y
 *     el instante en que lo logró. Si los dos escriben casi a la vez, gana el
 *     instante más chico, que es una regla que las dos máquinas aplican igual.
 *
 * El puntaje es local y modesto a propósito: participar suma, ganar suma un
 * poco más, y no hay tabla de posiciones global. Lo que se busca es que dos
 * chicos se sienten a resolver lo mismo, no un ranking.
 *
 * API (cálculo puro, sin red ni DOM: lo prueba test/test-duelo.js)
 *   Duelo.crearCodigo()                    -> 'RIO-482'
 *   Duelo.sala(codigo)                     -> { sala, clave } para Yjs
 *   Duelo.emparejar(ids)                   -> { parejas, libres }
 *   Duelo.elegirEjercicio(semilla, lista)  -> uno de la lista, siempre el mismo
 *   Duelo.ganador(marcas)                  -> quién ganó, o null
 *   Duelo.puntos(resultado)                -> cuánto suma
 *   Duelo.sumar(perfil, resultado)         -> el perfil nuevo
 *   Duelo.perfilVacio() · Duelo.MINUTOS
 */
(function (global) {
  'use strict';

  const MINUTOS = 5;

  const PALABRAS = ('RIO SOL LUZ MAR PAN AVE FLOR NUBE MONTE CAMPO PUENTE BARCO '
    + 'FARO LAGO VALLE PIEDRA ARENA VIENTO CIELO LUNA').split(' ');

  const azar = n => {
    const c = global.crypto || (global.require && global.require('crypto').webcrypto);
    const b = new Uint8Array(n);
    if (c && c.getRandomValues) c.getRandomValues(b);
    else for (let i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
    return b;
  };

  /* Un número estable a partir de un texto. Se usa para todo lo que las dos
     máquinas tienen que calcular igual sin hablarse. */
  function huella(texto) {
    let h = 5381;
    const t = String(texto);
    for (let i = 0; i < t.length; i++) h = ((h * 33) ^ t.charCodeAt(i)) >>> 0;
    return h;
  }

  /* Corto y fácil de dictar en voz alta a diez metros: una palabra y tres
     números. No es secreto —quien lo escuche entra— y por eso la batalla es
     de un aula y no de internet. */
  function crearCodigo() {
    const b = azar(3);
    return PALABRAS[b[0] % PALABRAS.length] + '-' + (100 + ((b[1] << 8 | b[2]) % 900));
  }

  const limpiar = c => String(c || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');

  /* El código es lo único que hace falta: de él salen el nombre de la sala y
     la contraseña con la que se cifra, las dos iguales en las dos máquinas. */
  function sala(codigo) {
    const c = limpiar(codigo);
    return {
      sala: 'esle2-duelo-' + c.toLowerCase(),
      clave: 'd' + huella('clave/' + c).toString(36) + huella('sal/' + c).toString(36)
    };
  }

  /* De a dos, en orden. Con un número impar, el último espera la próxima. */
  function emparejar(ids) {
    const orden = (ids || []).slice().filter(Boolean).sort();
    const parejas = [];
    for (let i = 0; i + 1 < orden.length; i += 2) parejas.push([orden[i], orden[i + 1]]);
    return { parejas, libres: orden.length % 2 ? [orden[orden.length - 1]] : [] };
  }

  /* Contra quién juega alguien, según ese emparejamiento. */
  function rivalDe(id, ids) {
    for (const [a, b] of emparejar(ids).parejas) {
      if (a === id) return b;
      if (b === id) return a;
    }
    return null;
  }

  function elegirEjercicio(semilla, lista) {
    if (!lista || !lista.length) return null;
    return lista[huella(semilla) % lista.length];
  }

  /* Las marcas son { nombre: instante }. Gana el instante más chico; si dos
     coinciden al milisegundo, desempata el nombre, para que las dos máquinas
     digan lo mismo y no queden dos ganadores distintos. */
  function ganador(marcas) {
    const entradas = Object.entries(marcas || {}).filter(([, t]) => typeof t === 'number');
    if (!entradas.length) return null;
    entradas.sort((a, b) => (a[1] - b[1]) || (a[0] < b[0] ? -1 : 1));
    return entradas[0][0];
  }

  /* Participar suma. Ganar suma más. Rendirse antes de tiempo no suma, pero
     tampoco resta: nadie tiene que terminar con puntaje negativo por probar. */
  function puntos(resultado) {
    if (!resultado || !resultado.jugo) return 0;
    if (resultado.gano) return 3;
    if (resultado.resolvio) return 2;      // no llegó primero, pero lo resolvió
    return 1;
  }

  const perfilVacio = () => ({ puntos: 0, jugadas: 0, ganadas: 0, resueltas: 0, mejorSegundos: null });

  function sumar(perfil, resultado) {
    const p = Object.assign(perfilVacio(), perfil || {});
    if (!resultado || !resultado.jugo) return p;
    p.puntos += puntos(resultado);
    p.jugadas++;
    if (resultado.gano) p.ganadas++;
    if (resultado.resolvio || resultado.gano) {
      p.resueltas++;
      const s = resultado.segundos;
      if (typeof s === 'number' && s > 0 && (p.mejorSegundos === null || s < p.mejorSegundos)) {
        p.mejorSegundos = s;
      }
    }
    return p;
  }

  global.Duelo = {
    crearCodigo, sala, emparejar, rivalDe, elegirEjercicio, ganador,
    puntos, sumar, perfilVacio, huella, limpiar, MINUTOS, PALABRAS
  };
})(typeof window !== 'undefined' ? window : globalThis);

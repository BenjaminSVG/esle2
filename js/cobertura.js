/*
 * Qué líneas corrieron y cuáles no.
 *
 * «No funciona y no sé por qué» casi siempre es esto: el «si» nunca entró, el
 * «mientras» no dio ni una vuelta, la subrutina no se llamó nunca. El alumno
 * mira una línea que está bien escrita y no se le ocurre que el programa
 * jamás pasó por ahí, porque no hay nada en la pantalla que lo diga.
 *
 * Se cuenta con el mismo gancho que usa el depurador, que se llama una vez
 * por sentencia. Contar es una suma: no se nota al lado de lo que cuesta
 * ejecutar la sentencia, así que va en TODAS las ejecuciones y no en un modo
 * aparte que haya que acordarse de prender.
 *
 * Las líneas que «podrían» correr NO se adivinan mirando el texto: se sacan
 * del árbol que ya armó el compilador, así que una línea en blanco, un
 * comentario, un «var» o una llave nunca se cuentan como no ejecutadas.
 *
 * API (sin DOM: lo prueba test/test-cobertura.js)
 *   Cobertura.crearContador()          -> { hook, cuentas, veces(linea), pasos }
 *   Cobertura.lineasDeSentencias(ast)  -> Set de líneas que podrían correr
 *   Cobertura.resumir(cuentas, posibles)
 *     -> { total, corridas, nunca: [], porcentaje, masCorrida, pasos }
 *   Cobertura.frase(resumen)           -> qué decirle a la persona, o ''
 */
(function (global) {
  'use strict';

  /* Los tres nombres de campo donde el parser guarda listas de sentencias.
     Si algún día aparece una estructura nueva con otro nombre, la prueba
     test/test-cobertura.js lo caza: compila un programa con todo y comprueba
     que ninguna sentencia quede afuera. */
  const LISTAS = ['cuerpo', 'entonces', 'sino'];

  /* Los ciclos quedan afuera, y no es un descuido.
     El intérprete llama al gancho en la línea del ciclo UNA VEZ POR VUELTA, no
     cuando llega. Así que un «mientras» cuya condición da falsa la primera vez
     no aparece nunca en las cuentas, y marcarlo como «no se ejecutó» sería
     mentir: la condición se evaluó, dio que no y por eso no entró. Es
     exactamente el aviso que mandaría al alumno a buscar un problema donde no
     lo hay. Lo que sí se marca es el CUERPO del ciclo, que es la información
     que sirve: «acá adentro no entró nunca». */
  const CICLOS = new Set(['mientras', 'repetir', 'desde']);

  function lineasDeSentencias(ast) {
    const lineas = new Set();
    const ver = nodo => {
      if (!nodo || typeof nodo !== 'object') return;
      if (Array.isArray(nodo)) { nodo.forEach(ver); return; }
      for (const campo of LISTAS) {
        const lista = nodo[campo];
        if (!Array.isArray(lista)) continue;
        for (const s of lista) {
          if (!s || typeof s !== 'object' || typeof s.linea !== 'number') continue;
          if (CICLOS.has(s.t)) continue;
          lineas.add(s.linea);
        }
      }
      for (const k of Object.keys(nodo)) {
        if (k === 'padre') continue;          // no existe hoy, pero por las dudas
        ver(nodo[k]);
      }
    };
    ver(ast);
    return lineas;
  }

  function crearContador() {
    const cuentas = new Map();
    let pasos = 0;
    return {
      /* Mismo contrato que opts.depurador: se llama antes de cada sentencia. */
      hook(linea) {
        pasos++;
        cuentas.set(linea, (cuentas.get(linea) || 0) + 1);
      },
      cuentas: () => cuentas,
      veces: linea => cuentas.get(linea) || 0,
      get pasos() { return pasos; }
    };
  }

  function resumir(cuentas, posibles) {
    const todas = [...(posibles || [])].sort((a, b) => a - b);
    const nunca = todas.filter(l => !cuentas.get(l));
    let masCorrida = null;
    let pasos = 0;
    const cuenta = new Set(todas);
    for (const [linea, veces] of cuentas) {
      pasos += veces;
      /* La más corrida se busca entre las sentencias de verdad. La línea de un
         «mientras» se anota una vez por vuelta, así que siempre ganaría ella y
         señalar el encabezado del ciclo no le dice nada a nadie: lo que
         interesa es qué línea de adentro se repite. */
      if (!cuenta.has(linea)) continue;
      if (!masCorrida || veces > masCorrida.veces) masCorrida = { linea, veces };
    }
    const total = todas.length;
    const corridas = total - nunca.length;
    return {
      total, corridas, nunca,
      porcentaje: total ? Math.round((corridas / total) * 100) : 100,
      masCorrida, pasos
    };
  }

  /* Qué decirle a la persona, en una línea. Cuando corrió todo se devuelve
     vacío a propósito: felicitar por lo normal es ruido, y el que programa
     bien no tiene por qué leer un cartel después de cada ejecución. */
  function frase(r) {
    if (!r || !r.nunca.length) return '';
    const cuantas = r.nunca.length;
    const cuales = r.nunca.length > 6
      ? r.nunca.slice(0, 6).join(', ') + ' y ' + (r.nunca.length - 6) + ' más'
      : r.nunca.join(', ');
    return cuantas === 1
      ? 'La línea ' + cuales + ' nunca se ejecutó.'
      : 'Nunca se ejecutaron ' + cuantas + ' líneas: ' + cuales + '.';
  }

  /* Cuánto trabajó el programa, y dónde.
     Un ciclo que da veinte vueltas es normal; uno que da doscientas mil casi
     siempre es un error que nadie ve, porque el programa termina igual y da
     el resultado correcto —solo que tarda—. Es también la primera vez que
     alguien se topa con que dos programas que hacen lo mismo no cuestan lo
     mismo, sin necesidad de hablar de complejidad.

     El tope es alto a propósito: avisar por un ciclo de cien vueltas sería
     avisar en todos los ejercicios del curso, y un aviso que sale siempre no
     se lee. */
  const MUCHAS_VUELTAS = 50000;

  function fraseEsfuerzo(r) {
    if (!r || !r.masCorrida) return '';
    if (r.masCorrida.veces < MUCHAS_VUELTAS) return '';
    const miles = Math.round(r.masCorrida.veces / 1000);
    return 'La línea ' + r.masCorrida.linea + ' se ejecutó ' + miles.toLocaleString('es')
      + ' mil veces. El programa terminó bien, pero fijate si tiene que repetir tanto.';
  }

  global.Cobertura = {
    crearContador, lineasDeSentencias, resumir, frase, fraseEsfuerzo,
    LISTAS, MUCHAS_VUELTAS
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * El código, dicho en palabras.
 *
 * Convierte un programa de SLE2 en algo que se puede escuchar. No es leer los
 * caracteres uno por uno —«ese i, espacio, paréntesis, equis, mayor…»—, que es
 * lo que hace un lector de pantalla con un editor de texto y es justamente lo
 * que vuelve imposible programar sin ver. Acá cada línea se dice como la diría
 * una persona:
 *
 *      si ( x >= 5 )        →   «si x es mayor o igual que 5»
 *      n = n + 1            →   «n recibe n más 1»
 *      imprimir ("Hola")    →   «imprimir, el texto Hola»
 *
 * Dos cosas que parecen detalles y no lo son:
 *
 *   · «=» se dice «recibe» y «==» se dice «es igual a». Confundirlos es el
 *     error número uno de quien empieza, y escuchar «igual» para los dos lo
 *     haría indetectable de oído;
 *   · la sangría se anuncia cuando cambia («nivel 2»), porque en SL la
 *     estructura del programa está en las llaves y en la sangría, y quien no
 *     ve la pantalla no tiene otra forma de saber dónde está parado.
 *
 * El análisis es por línea y tolerante a propósito: se lee mientras se
 * escribe, así que la mayor parte del tiempo el programa no compila. Nunca
 * lanza: si una línea no se entiende, se dice tal cual está.
 *
 * API (cálculo puro, sin DOM ni voz: lo prueba test/test-voz.js)
 *   Voz.linea(texto, numero, nivelAnterior) -> { texto, nivel }
 *   Voz.programa(fuente, opciones)          -> [{ numero, texto, nivel }]
 *   Voz.texto(fuente, opciones)             -> todo junto, para hablarlo
 *   Voz.error(err)                          -> el error, dicho en palabras
 */
(function (global) {
  'use strict';

  /* Los símbolos, dichos como se leen en voz alta. El orden importa: los de
     dos caracteres van antes que los de uno, o «>=» se leería «mayor, recibe». */
  const SIMBOLOS = [
    ['==', 'es igual a'],
    ['<>', 'es distinto de'],
    ['!=', 'es distinto de'],
    ['>=', 'es mayor o igual que'],
    ['<=', 'es menor o igual que'],
    ['&&', 'y'],
    ['||', 'o'],
    ['...', 'y así siguiendo'],
    ['>', 'es mayor que'],
    ['<', 'es menor que'],
    ['=', 'recibe'],
    ['+', 'más'],
    ['-', 'menos'],
    ['*', 'por'],
    ['/', 'dividido'],
    ['%', 'resto de'],
    ['^', 'elevado a'],
    ['(', 'abre paréntesis'],
    [')', 'cierra paréntesis'],
    ['[', 'abre corchete'],
    [']', 'cierra corchete'],
    ['{', 'empieza el bloque'],
    ['}', 'termina el bloque'],
    [',', 'coma'],
    [';', ''],
    [':', 'de tipo'],
    ['.', 'punto'],
    ['!', 'no']
  ];

  /* Palabras que ya se dicen solas: son español. Se listan igual para poder
     agregarles una coma que separe al hablar, si no «si x» suena pegado. */
  const PAUSA_DESPUES = new Set(['si', 'sino', 'mientras', 'repetir', 'hasta',
    'desde', 'paso', 'eval', 'caso', 'retorna', 'inicio', 'fin', 'var',
    'variables', 'const', 'constantes', 'tipos', 'subrutina', 'sub', 'programa',
    'clase', 'metodo', 'constructor', 'atributos', 'metodos', 'hereda']);

  /* Los paréntesis de una llamada o de una condición no se dicen: se oyen como
     una pausa. Decirlos convierte «si x es mayor que 5» en «si abre paréntesis
     x es mayor que 5 cierra paréntesis», que no hay quien lo siga.
     Los que agrupan una cuenta —«(a + b) * c»— sí se dicen, porque ahí cambian
     el resultado y de oído no habría forma de notarlo. Se distinguen por lo
     que viene antes: si es una palabra o un nombre, es una llamada o una
     condición; si no, agrupa. */

  const NUMERO = /^\d+(\.\d+)?([eE][-+]?\d+)?/;
  const NOMBRE = /^[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*/;

  /* Cuántos espacios de sangría tiene la línea (un tabulador cuenta 3, que es
     la sangría con la que se escribe SL en todo el material). */
  function sangria(texto) {
    const blancos = /^[ \t]*/.exec(texto)[0];
    let n = 0;
    for (const c of blancos) n += c === '\t' ? 3 : 1;
    return Math.floor(n / 3);
  }

  /* Una línea, dicha en palabras. */
  function linea(texto, numero, nivelAnterior, opciones) {
    const op = opciones || {};
    const nivel = sangria(texto);
    const limpio = String(texto).trim();
    const partes = [];

    if (op.conNumero !== false && numero) partes.push('línea ' + numero);

    if (!limpio) {
      partes.push('en blanco');
      return { texto: partes.join(', ') + '.', nivel: nivelAnterior === undefined ? 0 : nivelAnterior };
    }

    /* El nivel se dice solo cuando cambia: repetirlo en cada línea sería un
       ruido que tapa el programa. */
    if (op.conNivel !== false && nivelAnterior !== undefined && nivel !== nivelAnterior) {
      partes.push(nivel === 0 ? 'al margen' : 'nivel ' + nivel);
    }

    partes.push(frase(limpio));
    return { texto: partes.join(', ').replace(/,\s*,/g, ',') + '.', nivel };
  }

  /* El contenido de una línea, sin el número ni el nivel. */
  function frase(linea) {
    const dichas = [];
    let i = 0;
    let trasNombre = false;        // el token anterior fue una palabra o un nombre
    const grupos = [];             // por cada "(" abierto: ¿se dijo?

    const resto = () => linea.slice(i);

    while (i < linea.length) {
      const c = linea[i];

      if (c === ' ' || c === '\t') { i++; continue; }

      /* comentarios: se dicen, porque muchas veces son la explicación */
      if (c === '/' && linea[i + 1] === '/') {
        dichas.push('comentario: ' + linea.slice(i + 2).trim());
        break;
      }
      if (c === '/' && linea[i + 1] === '*') {
        const fin = linea.indexOf('*/', i + 2);
        dichas.push('comentario: ' + linea.slice(i + 2, fin < 0 ? linea.length : fin).trim());
        if (fin < 0) break;
        i = fin + 2; continue;
      }

      /* textos entre comillas: se dice que es un texto y después su contenido,
         para que no se confunda con un nombre de variable */
      if (c === '"' || c === "'" || c === '“' || c === '‘') {
        const cierres = { '"': '"”', "'": "'’", '“': '"”', '‘': "'’" }[c];
        let j = i + 1;
        while (j < linea.length && cierres.indexOf(linea[j]) < 0) j += linea[j] === '\\' ? 2 : 1;
        const dentro = linea.slice(i + 1, j)
          .replace(/\\n/g, ' y baja un renglón')
          .replace(/\\t/g, ' y tabula')
          .trim();
        dichas.push(dentro ? 'el texto ' + dentro : 'un texto vacío');
        i = j + 1; trasNombre = false; continue;
      }

      const num = NUMERO.exec(resto());
      if (num) {
        dichas.push(num[0].replace('.', ' coma '));
        i += num[0].length; trasNombre = false; continue;
      }

      const nom = NOMBRE.exec(resto());
      if (nom) {
        dichas.push(nom[0]);
        if (PAUSA_DESPUES.has(nom[0].toLowerCase())) dichas.push('');
        i += nom[0].length; trasNombre = true; continue;
      }

      const sim = SIMBOLOS.find(s => linea.startsWith(s[0], i));
      if (sim) {
        i += sim[0].length;
        let decir = !!sim[1];
        if (sim[0] === '(') {
          decir = !trasNombre;               // después de un nombre: es llamada o condición
          grupos.push(decir);
        } else if (sim[0] === ')') {
          decir = grupos.length ? grupos.pop() : false;
        }
        if (decir) dichas.push(sim[1]);
        trasNombre = sim[0] === ')' || sim[0] === ']';
        continue;
      }

      /* algo que no se reconoce: se dice tal cual, no se esconde */
      dichas.push(c);
      i++;
      trasNombre = false;
    }

    return dichas.filter(x => x !== '').join(' ').replace(/\s+/g, ' ').trim();
  }

  function programa(fuente, opciones) {
    const lineas = String(fuente === undefined ? '' : fuente).split('\n');
    const salida = [];
    let nivel;
    lineas.forEach((t, k) => {
      const r = linea(t, k + 1, nivel, opciones);
      nivel = r.nivel;
      salida.push({ numero: k + 1, texto: r.texto, nivel: r.nivel });
    });
    return salida;
  }

  function texto(fuente, opciones) {
    return programa(fuente, opciones).map(l => l.texto).join('\n');
  }

  /* Un error, dicho de forma que se entienda sin ver la pantalla: primero
     dónde, después qué, y al final la sugerencia si la hay. */
  function error(err) {
    if (!err) return '';
    /* Las comillas se sacan de todo lo que se dice: un lector de voz las lee
       como «comilla» y parte la frase justo donde está el dato que importa. */
    const sinComillas = t => String(t || '').replace(/["“”]/g, ' ').replace(/\s+/g, ' ').trim();
    const partes = [err.linea ? 'Error en la línea ' + err.linea : 'Error'];
    partes.push(sinComillas(err.mensaje || err.message));
    if (err.sugerencia) partes.push(sinComillas(String(err.sugerencia).replace(/\n+/g, '. ')));
    return partes.filter(Boolean).join('. ').replace(/\s*\.(\s*\.)+/g, '.') + '.';
  }

  global.Voz = { linea, frase, programa, texto, error, sangria, SIMBOLOS };
})(typeof window !== 'undefined' ? window : globalThis);

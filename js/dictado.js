/*
 * Dictar código: lo que se dice en voz alta, escrito en SLE2.
 *
 *      «si x es mayor a 5 entonces»   →   si ( x > 5 )
 *                                         {
 *      «n recibe n más 1»             →   n = n + 1
 *      «mostrar el texto hola»        →   imprimir ("hola")
 *      «leer a y b»                   →   leer (a, b)
 *
 * La traducción es a propósito de una frase por vez y no de un programa
 * entero: reconocer voz se equivoca, y hay que poder ver qué entendió antes de
 * que lo escriba. Cuando no entiende, devuelve null en vez de adivinar —una
 * línea inventada es mucho peor que un «no te entendí», sobre todo para quien
 * no puede mirar la pantalla para descubrirlo—.
 *
 * Esto no depende del micrófono: la misma función traduce una frase escrita.
 * Así anda en cualquier navegador, se puede probar sin voz, y quien no puede
 * hablar (o está en un aula ruidosa) tiene el mismo camino escribiendo.
 *
 * API (cálculo puro, sin DOM ni micrófono: lo prueba test/test-dictado.js)
 *   Dictado.aCodigo(frase)   -> { codigo, abre } | null
 *   Dictado.normalizar(frase)-> la frase lista para comparar
 *   Dictado.numero(palabra)  -> 5, para «cinco»
 *   Dictado.EJEMPLOS         -> qué se puede decir, para mostrarlo en pantalla
 */
(function (global) {
  'use strict';

  /* Los números dichos con palabras. Quien reconoce la voz casi siempre
     devuelve «5», pero no siempre, y «cinco» tiene que andar igual. */
  const NUMEROS = {
    cero: 0, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6,
    siete: 7, ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13,
    catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18,
    diecinueve: 19, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50,
    sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100,
    mil: 1000
  };

  /* Los operadores, del más largo al más corto: «mayor o igual» tiene que
     ganarle a «mayor», o quedaría «> o igual». */
  const OPERADORES = [
    [/\bes\s+mayor\s+o\s+igual\s+(?:que|a)\b/g, ' >= '],
    [/\bes\s+menor\s+o\s+igual\s+(?:que|a)\b/g, ' <= '],
    [/\bmayor\s+o\s+igual\s+(?:que|a)\b/g, ' >= '],
    [/\bmenor\s+o\s+igual\s+(?:que|a)\b/g, ' <= '],
    [/\bes\s+distinto\s+(?:de|a|que)\b/g, ' <> '],
    [/\bes\s+diferente\s+(?:de|a|que)\b/g, ' <> '],
    [/\bes\s+igual\s+(?:que|a)\b/g, ' == '],
    [/\bes\s+mayor\s+(?:que|a)\b/g, ' > '],
    [/\bes\s+menor\s+(?:que|a)\b/g, ' < '],
    [/\bmayor\s+(?:que|a)\b/g, ' > '],
    [/\bmenor\s+(?:que|a)\b/g, ' < '],
    [/\bdistinto\s+(?:de|a|que)\b/g, ' <> '],
    [/\bigual\s+(?:que|a)\b/g, ' == '],
    [/\bresto\s+de\b/g, ' % '],
    [/\bmodulo\b/g, ' % '],
    [/\bdividido\s+(?:por|entre)\b/g, ' / '],
    [/\bdividido\b/g, ' / '],
    [/\bmultiplicado\s+por\b/g, ' * '],
    [/\bmas\b/g, ' + '],
    [/\bmenos\b/g, ' - '],
    [/\bpor\b/g, ' * '],
    [/\belevado\s+a\b/g, ' ^ ']
  ];

  /* «y», «o» y «no» se traducen aparte: son palabras demasiado comunes como
     para tocarlas antes de saber que estamos dentro de una condición. */
  const LOGICOS = [
    [/\by\b/g, ' and '],
    [/\bo\b/g, ' or '],
    [/\bno\b/g, ' not ']
  ];

  const SIN_TILDE = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', Á: 'a', É: 'e', Í: 'i', Ó: 'o', Ú: 'u' };

  /* La frase tal como se dijo, con sus tildes y mayúsculas, pero con los
     espacios y la puntuación del final ya arreglados. Sirve para recuperar el
     texto de un imprimir o de un comentario: ahí las tildes importan, porque
     eso lo va a leer una persona. */
  function crudo(frase) {
    return String(frase || '')
      .replace(/\s+/g, ' ')
      .replace(/[.,;:¿?¡!]+$/g, '')
      .trim();
  }

  /* La misma frase, en minúsculas y sin tildes, que es contra la que se
     comparan las reglas. Cada paso cambia una letra por otra, nunca la
     cantidad, así que las posiciones siguen valiendo en crudo(). */
  function normalizar(frase) {
    return crudo(frase)
      .replace(/[áéíóúüÁÉÍÓÚ]/g, c => SIN_TILDE[c] || c)
      .toLowerCase();
  }

  function numero(palabra) {
    const p = normalizar(palabra);
    if (/^-?\d+([.,]\d+)?$/.test(p)) return parseFloat(p.replace(',', '.'));
    if (NUMEROS[p] !== undefined) return NUMEROS[p];
    /* «veinticinco», «treinta y cinco» */
    const m = /^(\w+)\s+y\s+(\w+)$/.exec(p);
    if (m && NUMEROS[m[1]] !== undefined && NUMEROS[m[2]] !== undefined) {
      return NUMEROS[m[1]] + NUMEROS[m[2]];
    }
    return null;
  }

  /* Lo capturado al final de la frase, pero tomado de la versión sin
     normalizar. Vale porque normalizar() cambia letras por letras y nunca la
     cantidad, así que las dos frases tienen exactamente el mismo largo. */
  function cola(m, tal) {
    return tal.slice(tal.length - m[1].length);
  }

  /* Una expresión dicha en voz alta, escrita como la escribiría alguien. */
  function expresion(texto, conLogicos) {
    let t = ' ' + normalizar(texto) + ' ';
    for (const [re, con] of OPERADORES) t = t.replace(re, con);
    if (conLogicos !== false) for (const [re, con] of LOGICOS) t = t.replace(re, con);
    /* los números escritos con palabras, uno por uno */
    t = t.replace(/\b[a-zñ]+\b/g, p => {
      const n = numero(p);
      return n === null ? p : String(n);
    });
    return t.replace(/\s+/g, ' ').trim();
  }

  /* Las reglas, en orden: la primera que engancha, gana. Están de la más
     específica a la más general a propósito, porque «mostrar el texto hola»
     tiene que ganarle a «mostrar hola». */
  const REGLAS = [
    /* --- bloques y estructura --- */
    [/^(inicio|comienzo|empieza el programa)$/, () => ({ codigo: 'inicio', abre: true })],
    [/^(fin|fin del programa|terminar)$/, () => ({ codigo: 'fin' })],
    [/^(sino|si ?no|en caso contrario)$/, () => ({ codigo: 'sino' })],
    [/^(cerrar|cierra|fin del bloque|termina el bloque|fin del si|fin del mientras|fin del desde)$/,
      () => ({ codigo: '}' })],
    [/^(variables|seccion de variables|declarar variables)$/, () => ({ codigo: 'var' })],

    /* --- condicional --- */
    [/^si (.+?)(?: entonces)?$/, m => ({ codigo: 'si ( ' + expresion(m[1]) + ' )\n{', abre: true })],

    /* --- ciclos --- */
    [/^mientras (?:que )?(.+?)(?: hacer| repetir)?$/,
      m => ({ codigo: 'mientras ( ' + expresion(m[1]) + ' )\n{', abre: true })],
    [/^desde (\w+) (?:igual a?|recibe|en|desde) (.+?) hasta (.+?)(?: con paso (.+?))?$/, m => ({
      codigo: 'desde ' + m[1] + ' = ' + expresion(m[2], false) + ' hasta ' + expresion(m[3], false)
        + (m[4] ? ' paso ' + expresion(m[4], false) : '') + '\n{',
      abre: true
    })],
    [/^repetir$/, () => ({ codigo: 'repetir' })],
    [/^hasta (?:que )?(.+)$/, m => ({ codigo: 'hasta ( ' + expresion(m[1]) + ' )' })],

    /* --- entrada y salida --- */
    /* El texto se saca de la frase como se dijo, con sus tildes: lo va a leer
       una persona, no el compilador. */
    [/^(?:imprimir|mostrar|escribir|decir) (?:el )?(?:texto|mensaje|cartel) (.+)$/,
      (m, tal) => ({ codigo: 'imprimir ("' + cola(m, tal).replace(/"/g, '') + '")' })],
    [/^(?:imprimir|mostrar|escribir|decir) (?:el |la )?(?:valor de |variable |contenido de )(.+)$/,
      m => ({ codigo: 'imprimir (' + expresion(m[1], false) + ')' })],
    [/^(?:imprimir|mostrar|escribir|decir) (?:un )?(?:renglon|salto de linea|linea en blanco)$/,
      () => ({ codigo: 'imprimir ("\\n")' })],
    [/^(?:imprimir|mostrar|escribir|decir) (.+)$/, (m, tal) => ({ codigo: salida(m[1], cola(m, tal)) })],
    [/^(?:leer|ingresar|pedir) (?:la |el )?(?:variable |valor de )?(.+)$/,
      m => ({ codigo: 'leer (' + lista(m[1]) + ')' })],
    [/^(?:limpiar|borrar) (?:la )?pantalla$/, () => ({ codigo: 'cls ()' })],

    /* --- asignación --- */
    [/^(?:la )?variable (\w+) (?:recibe|es|vale|igual a?) (.+)$/,
      m => ({ codigo: m[1] + ' = ' + expresion(m[2], false) })],
    [/^asignar (.+?) a (?:la )?(?:variable )?(\w+)$/,
      m => ({ codigo: m[2] + ' = ' + expresion(m[1], false) })],
    [/^(\w+) (?:recibe|vale|es igual a|igual a) (.+)$/,
      m => ({ codigo: m[1] + ' = ' + expresion(m[2], false) })],
    [/^(?:sumar|sumale) (.+?) a (\w+)$/,
      m => ({ codigo: m[2] + ' = ' + m[2] + ' + ' + expresion(m[1], false) })],
    [/^(?:restar|restale) (.+?) a (\w+)$/,
      m => ({ codigo: m[2] + ' = ' + m[2] + ' - ' + expresion(m[1], false) })],

    /* --- declaración --- */
    [/^(\w+(?:(?: y |, )\w+)*) (?:de tipo|es de tipo|tipo) (numerico|cadena|logico)$/,
      m => ({ codigo: lista(m[1]) + ' : ' + m[2] })],

    /* --- comentario --- */
    [/^(?:comentario|nota|anotar) (.+)$/, (m, tal) => ({ codigo: '// ' + cola(m, tal) })]
  ];

  /* «a y b» o «a, b» → «a, b»: es como se dictan varias variables. */
  const lista = t => normalizar(t).split(/\s*(?:,| y )\s*/).filter(Boolean).join(', ');

  /* Qué imprimir cuando no se dijo si es un texto o una variable: si es una
     sola palabra que puede ser un nombre, es la variable; si son varias, es un
     texto. Es lo que uno espera al decirlo. */
  function salida(t, tal) {
    const n = normalizar(t);
    if (/^[a-zñ_][a-z0-9ñ_]*$/.test(n)) return 'imprimir (' + n + ')';
    const num = numero(n);
    if (num !== null) return 'imprimir (' + num + ')';
    return 'imprimir ("' + String(tal === undefined ? t : tal).replace(/"/g, '') + '")';
  }

  function aCodigo(frase) {
    const f = normalizar(frase);
    if (!f) return null;
    for (const [re, arma] of REGLAS) {
      const m = re.exec(f);
      if (m) {
        const r = arma(m, crudo(frase));
        if (r && r.codigo) return { codigo: r.codigo, abre: !!r.abre };
      }
    }
    return null;
  }

  /* Lo que se puede decir, para que esté escrito en algún lado y no haya que
     adivinarlo. Se muestra al lado del micrófono. */
  const EJEMPLOS = [
    ['si x es mayor a 5 entonces', 'si ( x > 5 )'],
    ['sino', 'sino'],
    ['cerrar', '}'],
    ['mientras n es menor que 10', 'mientras ( n < 10 )'],
    ['desde i igual a 1 hasta 10', 'desde i = 1 hasta 10'],
    ['n recibe n más 1', 'n = n + 1'],
    ['sumale 1 a n', 'n = n + 1'],
    ['leer a y b', 'leer (a, b)'],
    ['mostrar el texto hola mundo', 'imprimir ("hola mundo")'],
    ['mostrar la variable total', 'imprimir (total)'],
    ['a y b de tipo numerico', 'a, b : numerico'],
    ['comentario acá empieza la suma', '// acá empieza la suma']
  ];

  global.Dictado = { aCodigo, normalizar, numero, expresion, EJEMPLOS };
})(typeof window !== 'undefined' ? window : globalThis);

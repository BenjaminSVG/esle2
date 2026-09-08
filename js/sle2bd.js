/*
 * ESLE2 BD: el mismo SL, con una base de datos adentro.
 *
 * No es un lenguaje nuevo. Es el SL de siempre —las mismas variables, los
 * mismos ciclos, el mismo si— más las instrucciones de la base, que se
 * escriben directamente, como una sentencia más:
 *
 *    inicio
 *       CREAR TABLA alumnos (id INTEGER, nombre TEXT, nota REAL)
 *       INSERTAR DENTRO alumnos VALORES (1, "Ana", 9)
 *       SELECCIONAR * DE alumnos DONDE nota >= 7
 *    fin
 *
 * Un SELECCIONAR suelto imprime su tabla y además deja el resultado listo
 * para recorrer con filas() y dato(), que es lo que hace falta cuando la
 * consulta alimenta un ciclo en vez de mirarse.
 *
 * Las subrutinas nuevas:
 *
 *   sql (texto)              ejecuta una instrucción armada como cadena; hace
 *                            falta cuando la consulta se arma en el programa
 *   consultar (texto)        igual, pero para un SELECT que se va a recorrer
 *                            sin imprimirlo; devuelve la cantidad de filas
 *   filas ()                 cuántas filas trajo la última consulta
 *   columnas ()              cuántas columnas
 *   columna (i)              el nombre de la columna i (desde 1)
 *   dato (fila, col)         el valor, por número de columna o por nombre
 *   hay_dato (fila, col)     FALSE si ese valor es NULL — hace falta porque
 *                            en SL no existe el nulo y dato() lo devolvería
 *                            como cadena vacía, que no es lo mismo
 *   mostrar ()               imprime el resultado como una tabla, que es lo
 *                            que uno quiere el 90% de las veces
 *   tablas ()                cuántas tablas hay
 *   nombre_tabla (i)         el nombre de la tabla i (desde 1)
 *
 * Los índices empiezan en 1, como los vectores de SL.
 *
 * API:  SLE2BD.compilar · ejecutar · revisar · PREDEF · base()
 */
(function (global) {
  'use strict';

  const S = global.SLE2;
  const SQL = global.SQL;
  const errE = S.errE;

  /* Las palabras nuevas no son reservadas: son subrutinas, así que un
     programa que ya tenía una variable llamada «dato» sigue andando. */

  function textoDe(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return S.fmtNum(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    return String(v);
  }

  /* Un valor de la base pasado a un valor de SL. NULL no existe en SL: se
     devuelve la cadena vacía o el cero, y para saber si era NULL está
     hay_dato(). Fingir que NULL es 0 sin avisar sería enseñar mal. */
  function aSL(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    return String(v);
  }

  const fn = S.fn;

  const PREDEF_BD = {
    sql: fn(1, 1, function (v, l) {
      const texto = this.aCad(v[0], l);
      const rs = correr(this, texto, l);
      const ultimo = rs[rs.length - 1];
      if (!ultimo) return 0;
      if (ultimo.tipo === 'select') { this.consulta = ultimo; return ultimo.filas.length; }
      this.afectadas = ultimo.afectadas;
      return ultimo.afectadas;
    }),

    consultar: fn(1, 1, function (v, l) {
      const texto = this.aCad(v[0], l);
      const rs = correr(this, texto, l);
      const ultimo = rs[rs.length - 1];
      if (!ultimo || ultimo.tipo !== 'select')
        errE('consultar() espera un SELECT', l,
          'Para INSERT, UPDATE, DELETE o CREATE usá sql(). consultar() es para traer filas.');
      this.consulta = ultimo;
      return ultimo.filas.length;
    }),

    filas: fn(0, 0, function (v, l) { return hay(this, l).filas.length; }),
    columnas: fn(0, 0, function (v, l) { return hay(this, l).columnas.length; }),

    columna: fn(1, 1, function (v, l) {
      const c = hay(this, l);
      const i = Math.trunc(this.aNum(v[0], l));
      if (i < 1 || i > c.columnas.length)
        errE(`no hay una columna ${i}: la consulta trajo ${c.columnas.length}`, l,
          'Las columnas se numeran desde 1, como los vectores de SL.');
      return c.columnas[i - 1];
    }),

    dato: fn(2, 2, function (v, l) { return aSL(celda(this, v, l)); }),

    hay_dato: fn(2, 2, function (v, l) { return celda(this, v, l) !== null; }),

    mostrar: fn(0, 0, function (v, l) { return mostrarTabla(this, hay(this, l)); }),

    /* Lo que escribe la traducción de una instrucción escrita directa. No se
       documenta ni se ofrece en el autocompletado: quien escribe SQL suelto no
       tiene por qué saber que abajo hay una llamada. */
    sql_directo: fn(1, 1, function (v, l) {
      const rs = correr(this, this.aCad(v[0], l), l);
      let n = 0;
      for (const r of rs) {
        if (r.tipo === 'select') { this.consulta = r; n = mostrarTabla(this, r); }
        else { n = r.afectadas; this.afectadas = n; }
      }
      return n;
    }),

    /* Cuántas filas tocó el último INSERT, UPDATE o DELETE. Hace falta porque
       una instrucción escrita directa es una sentencia, no una expresión: no
       se le puede pedir el resultado con un "=". */
    afectadas: fn(0, 0, function () { return this.afectadas || 0; }),

    /* El valor de una variable de SL escrito como lo escribiría SQL: los
       números tal cual, el texto entre comillas simples y con las comillas
       de adentro dobladas. Es lo que hay detrás de «@variable». */
    sql_valor: fn(1, 1, function (v) {
      const x = v[0];
      if (typeof x === 'number') return S.fmtNum(x);
      if (typeof x === 'boolean') return x ? 'TRUE' : 'FALSE';
      return "'" + String(x).replace(/'/g, "''") + "'";
    }),

    tablas: fn(0, 0, function () { return SQL.tablas(this.base).length; }),

    nombre_tabla: fn(1, 1, function (v, l) {
      const t = SQL.tablas(this.base);
      const i = Math.trunc(this.aNum(v[0], l));
      if (i < 1 || i > t.length)
        errE(`no hay una tabla ${i}: la base tiene ${t.length}`, l,
          'Las tablas se numeran desde 1, como los vectores de SL.');
      return t[i - 1].nombre;
    })
  };

  /* En la tabla que se muestra, un NULL se ve como NULL y no como un hueco:
     si se viera vacío no se distinguiría de una cadena vacía, que es otra
     cosa. Es la misma razón por la que existe hay_dato(). */
  const textoNulo = v => (v === null || v === undefined ? 'NULL' : textoDe(v));

  function mostrarTabla(interp, c) {
    const anchos = c.columnas.map((n, i) =>
      Math.max(String(n).length, ...c.filas.map(f => textoNulo(f[i]).length), 1));
    const linea = celdas =>
      celdas.map((x, i) => String(x).padEnd(anchos[i])).join('  ').replace(/\s+$/, '');
    interp.escribir(linea(c.columnas) + '\n');
    interp.escribir(anchos.map(a => '-'.repeat(a)).join('  ') + '\n');
    for (const f of c.filas) interp.escribir(linea(f.map(textoNulo)) + '\n');
    interp.escribir(c.filas.length + ' fila(s)\n');
    return c.filas.length;
  }

  function hay(interp, l) {
    if (!interp.consulta)
      errE('todavía no hiciste ninguna consulta', l,
        'Llamá antes a consultar ("SELECT ...") o a sql ("SELECT ...").');
    return interp.consulta;
  }

  function celda(interp, v, l) {
    const c = hay(interp, l);
    const f = Math.trunc(interp.aNum(v[0], l));
    if (f < 1 || f > c.filas.length)
      errE(`no hay una fila ${f}: la consulta trajo ${c.filas.length}`, l,
        'Las filas se numeran desde 1. Recorrelas con  desde i = 1 hasta filas ().');
    let j;
    if (typeof v[1] === 'string') {
      j = c.columnas.findIndex(n => String(n).toLowerCase() === v[1].toLowerCase());
      if (j < 0) errE(`la consulta no trajo una columna "${v[1]}"`, l,
        'Trajo: ' + c.columnas.join(', ') + '.');
    } else {
      j = Math.trunc(interp.aNum(v[1], l)) - 1;
      if (j < 0 || j >= c.columnas.length)
        errE(`no hay una columna ${j + 1}: la consulta trajo ${c.columnas.length}`, l,
          'Las columnas se numeran desde 1.');
    }
    return c.filas[f - 1][j];
  }

  /* Correr SQL y traducir su error al formato de SL, para que la página lo
     muestre igual que cualquier otro error del programa. */
  function correr(interp, texto, l) {
    try {
      return SQL.ejecutar(interp.base, texto);
    } catch (e) {
      if (e && e.sql) errE('SQL: ' + e.message, l, e.sugerencia || '');
      throw e;
    }
  }

  /* ------------------------------------------------------------------ */
  /* SQL escrito directo                                                 */
  /* ------------------------------------------------------------------ */
  /*
   * Antes de compilar, cada instrucción de la base escrita suelta se reescribe
   * como una llamada a sql_directo ("..."). Es una traducción de texto a texto
   * y conserva los renglones —el SQL queda adentro de una cadena de varias
   * líneas, que en ESLE2 BD están permitidas—, así que todo lo que viene
   * después (los errores, el diagrama, la prueba de escritorio, el simulador
   * de memoria) sigue señalando la línea real del editor.
   *
   * Se hizo así, y no metiendo SQL en la gramática de SL, porque SQL tiene su
   * propio analizador, y mezclar los dos sería duplicar la mitad de cada uno.
   *
   * Dónde empieza:  en la primera palabra de un renglón, si esa palabra es un
   *                 verbo de SQL y en el mismo renglón viene algo más.
   * Dónde termina:  en el ";", o donde el renglón siguiente ya no puede ser
   *                 continuación (está en blanco, empieza con una palabra de
   *                 SL, con "}" , con un comentario, con otra instrucción SQL
   *                 o con una asignación o llamada de SL).
   */

  const VERBOS = new Set(['select', 'seleccionar', 'insert', 'insertar',
    'update', 'actualizar', 'delete', 'borrar', 'create', 'crear',
    'drop', 'eliminar', 'use', 'usar']);

  /* Palabras que no pueden cerrar una instrucción: si el renglón termina ahí,
     lo de abajo todavía es parte de la misma. */
  const SIGUE = new Set(['select', 'seleccionar', 'from', 'de', 'where', 'donde',
    'into', 'dentro', 'values', 'valores', 'set', 'conjunto', 'by', 'and', 'or',
    'not', 'join', 'on', 'group', 'order', 'having', 'left', 'inner', 'as',
    'distinct', 'table', 'tabla', 'database', 'datos', 'like', 'is', 'in']);

  /* Palabras de SL que siempre empiezan otra cosa. */
  const CORTAN = new Set(['inicio', 'fin', 'si', 'sino', 'mientras', 'desde',
    'hasta', 'repetir', 'eval', 'caso', 'retorna', 'var', 'variables', 'const',
    'constantes', 'tipos', 'sub', 'subrutina', 'programa', 'paso', 'lib',
    'libext', 'archivo', 'ref', 'vector', 'matriz', 'registro']);

  const PALABRA = /^[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*/;
  const CIERRA_CAD = { '"': '"”', "'": "'’", '“': '"”', '‘': "'’" };

  /* Las comillas tipográficas también cierran una cadena de SL, así que
     también hay que escaparlas. Los saltos de línea van tal cual: son los que
     mantienen la numeración. */
  const escapar = s => s.replace(/\\/g, '\\\\').replace(/["”]/g, '\\$&');

  /* ¿Después del verbo viene algo que puede ser SQL, y no un "=" o un "("? */
  function arrancaSQL(src, pos) {
    let i = pos;
    while (src[i] === ' ' || src[i] === '\t') i++;
    return /[A-Za-z*'"`[]/.test(src[i] || '');
  }

  function corta(src, pos, leido) {
    const cerrado = leido.replace(/\s+$/, '');
    const ultimo = (cerrado.match(/[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*$/) || [''])[0].toLowerCase();
    if (SIGUE.has(ultimo)) return false;
    if (/[,=+\-*/<>(]$/.test(cerrado)) return false;

    const corteN = src.indexOf('\n', pos);
    const linea = src.slice(pos, corteN < 0 ? src.length : corteN).trim();
    if (!linea) return true;                       // renglón en blanco: se terminó
    if (linea[0] === '}' || linea[0] === '{') return true;
    if (linea.startsWith('//') || linea.startsWith('/*')) return true;

    const m = PALABRA.exec(linea);
    if (!m) return false;                          // empieza con "(" o similar: sigue
    const p = m[0].toLowerCase();
    if (SIGUE.has(p)) return false;
    if (CORTAN.has(p)) return true;
    const resto = linea.slice(m[0].length);
    if (VERBOS.has(p) && /^\s*[A-Za-z*'"`[]/.test(resto)) return true;   // otra instrucción
    return /^\s*[=([.]/.test(resto);               // asignación o llamada de SL
  }

  /* «@variable» adentro del SQL es el valor de esa variable de SL. Se traduce
     a una concatenación con sql_valor(), que la cita como corresponde; así no
     hay que armar la consulta a mano con + y str(), que es donde se cuelan las
     comillas mal puestas. Un "@" adentro de una cadena de SQL (un correo, por
     ejemplo) queda como está. */
  function expresion(texto) {
    const partes = [];
    let lit = '', i = 0;
    while (i < texto.length) {
      const c = texto[i];
      if (c === "'" || c === '"' || c === '`') {
        let j = i + 1;
        while (j < texto.length && texto[j] !== c) j++;
        lit += texto.slice(i, Math.min(j + 1, texto.length));
        i = j + 1; continue;
      }
      if (c === '@') {
        const m = PALABRA.exec(texto.slice(i + 1));
        if (m) {
          partes.push('"' + escapar(lit) + '"', 'sql_valor (' + m[0] + ')');
          lit = ''; i += 1 + m[0].length; continue;
        }
      }
      lit += c; i++;
    }
    partes.push('"' + escapar(lit) + '"');
    return partes.join(' + ');
  }

  /* Hasta dónde llega la instrucción que empieza en «desde». */
  function finSQL(src, desde) {
    let i = desde, hondo = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"' || c === '`') {
        i++;
        while (i < src.length && src[i] !== c) i++;
        i++; continue;   // la comilla doblada ('') se cierra y se reabre sola
      }
      if (c === '(' || c === '[') { hondo++; i++; continue; }
      if (c === ')' || c === ']') { if (hondo > 0) hondo--; i++; continue; }
      if (hondo === 0 && c === ';') return { hasta: i, sigue: i + 1 };
      if (hondo === 0 && c === '\n' && corta(src, i + 1, src.slice(desde, i)))
        return { hasta: i, sigue: i };
      i++;
    }
    return { hasta: src.length, sigue: src.length };
  }

  /* Traduce un programa con SQL suelto a uno que solo tiene SL.
     Es seguro aplicarla dos veces: lo ya traducido quedó adentro de una
     cadena, y las cadenas se copian sin mirar. */
  function aSQL(fuente) {
    let out = '', i = 0, arranque = true;
    const n = fuente.length;
    while (i < n) {
      const c = fuente[i];
      if (c === '\n') { out += c; i++; arranque = true; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { out += c; i++; continue; }

      if (c === '/' && fuente[i + 1] === '/') {
        const j = fuente.indexOf('\n', i), k = j < 0 ? n : j;
        out += fuente.slice(i, k); i = k; arranque = false; continue;
      }
      if (c === '/' && fuente[i + 1] === '*') {
        const j = fuente.indexOf('*/', i + 2), k = j < 0 ? n : j + 2;
        out += fuente.slice(i, k); i = k; arranque = false; continue;
      }
      if (CIERRA_CAD[c]) {
        const cierres = CIERRA_CAD[c];
        let j = i + 1;
        while (j < n && cierres.indexOf(fuente[j]) < 0) j += fuente[j] === '\\' ? 2 : 1;
        out += fuente.slice(i, Math.min(j + 1, n)); i = j + 1; arranque = false; continue;
      }

      if (arranque) {
        const m = PALABRA.exec(fuente.slice(i));
        if (m && VERBOS.has(m[0].toLowerCase()) && arrancaSQL(fuente, i + m[0].length)) {
          const { hasta, sigue } = finSQL(fuente, i);
          out += 'sql_directo (' + expresion(fuente.slice(i, hasta)) + ')';
          i = sigue; arranque = false; continue;
        }
      }
      out += c; i++; arranque = false;
    }
    return out;
  }

  /* ------------------------------------------------------------------ */
  const PREDEF = Object.assign({}, S.PREDEF, PREDEF_BD);

  class InterpreteBD extends S.Interprete {
    constructor(ast, io, opts) {
      super(ast, io, opts);
      /* La base vive en el intérprete, así que dos ejecuciones no se pisan y
         el simulador de memoria puede correr el programa sin tocar la base
         que está mirando la persona. */
      this.base = (opts && opts.base) || SQL.crear();
      this.consulta = null;
      this.afectadas = 0;
    }
    async llamar(n) {
      const f = PREDEF_BD[n.nombre];
      if (!f) return super.llamar(n);
      return await f.call(this, n);
    }
  }

  /* En ESLE2 BD una cadena puede ocupar varias líneas: adentro va una
     consulta SQL, y partirla con + la volvería ilegible justo donde lo
     importante es leer el SQL. */
  const OPCIONES = { cadenasLargas: true };
  const compilar = fuente => S.compilar(aSQL(fuente), null, null, OPCIONES);

  async function ejecutar(fuente, io, opts) {
    const ast = typeof fuente === 'string' ? compilar(fuente) : fuente;
    const interp = new InterpreteBD(ast, io, opts);
    if (opts && opts.control) opts.control.detener = () => { interp.abortar = true; };
    await interp.run();
    return interp;
  }

  /* El revisor de siempre, sin los avisos que en un programa de base de datos
     serían mentira. */
  function revisar(fuente) {
    /* revisar() vuelve a tokenizar por su cuenta; si una cadena pasa de línea
       explotaría antes de revisar nada, así que se le pasa un programa donde
       cada cadena larga quedó en una sola línea. Los números de línea se
       conservan porque solo se reemplazan saltos por espacios adentro de la
       cadena... y como eso los correría, se prefiere no revisar nada antes que
       señalar líneas equivocadas: si hay cadenas largas, se avisa. */
    try {
      return S.revisar(aSQL(fuente)).filter(a => !/imprimir\(\)/.test(a.mensaje));
    } catch (e) {
      if (e && e.fase === 'compilacion' && /cadena sin cerrar/.test(e.message)) return [];
      throw e;
    }
  }

  global.SLE2BD = {
    compilar, ejecutar, revisar, aSQL, InterpreteBD, PREDEF, PREDEF_BD,
    crearBase: () => SQL.crear()
  };
})(typeof window !== 'undefined' ? window : globalThis);

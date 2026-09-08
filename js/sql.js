/*
 * Un motor de SQL chico, escrito a mano, para ESLE2 BD.
 *
 * Es el mismo criterio que el resto de ESLE2: el intérprete de SL está
 * escrito a mano y se prueba en Node, así que la base de datos también. La
 * alternativa era traer SQLite compilado a WebAssembly, un archivo binario de
 * más de un mega que hay que guardar en la caché de la aplicación y dentro
 * del cual no se puede ver nada. Acá el motor entra en un archivo que se lee,
 * corre sin conexión, y —lo que más importa para una materia— puede explicar
 * lo que hace: cada consulta puede devolver en qué orden resolvió las cosas.
 *
 * El dialecto que entiende es el que se enseña en una primera materia de
 * bases de datos, y a propósito no más:
 *
 *   CREATE TABLE t (c TIPO [PRIMARY KEY] [NOT NULL] [DEFAULT v], ...)
 *   DROP TABLE [IF EXISTS] t
 *   INSERT INTO t [(cols)] VALUES (...), (...)
 *   SELECT [DISTINCT] cols FROM t [alias]
 *          [JOIN t2 [alias] ON cond]
 *          [WHERE cond] [GROUP BY cols] [HAVING cond]
 *          [ORDER BY col [ASC|DESC], ...] [LIMIT n [OFFSET m]]
 *   UPDATE t SET c = v, ... [WHERE cond]
 *   DELETE FROM t [WHERE cond]
 *
 * Funciones: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, ROUND, ABS,
 * SUBSTR, TRIM, COALESCE.
 *
 * Los tipos son los de SQLite —dinámicos, con afinidad— porque es el motor
 * que se pide poder exportar y porque es el que menos sorpresas da a quien
 * recién empieza: guardar 3 en una columna TEXT no explota.
 *
 * NULL se comporta como en SQL de verdad: NULL = NULL da NULL, no verdadero,
 * y hay que preguntar IS NULL. Es de las cosas que más cuesta y por eso no se
 * simplifica.
 *
 * API:
 *   SQL.crear()                       -> base vacía
 *   SQL.ejecutar(base, texto)         -> [{ tipo, columnas, filas, afectadas, mensaje }]
 *   SQL.tablas(base)                  -> [{ nombre, columnas, filas }]
 *   SQL.SQLError
 */
(function (global) {
  'use strict';

  class SQLError extends Error {
    constructor(msg, sugerencia) {
      super(msg);
      this.sugerencia = sugerencia || '';
      this.sql = true;
    }
  }
  const err = (m, s) => { throw new SQLError(m, s); };

  /* ------------------------------------------------------------------ */
  /* Análisis léxico                                                     */
  /* ------------------------------------------------------------------ */
  const PALABRAS = new Set(['select', 'from', 'where', 'insert', 'into', 'values', 'update',
    'set', 'delete', 'create', 'table', 'drop', 'if', 'exists', 'not', 'null', 'primary',
    'key', 'default', 'and', 'or', 'order', 'by', 'asc', 'desc', 'limit', 'offset', 'group',
    'having', 'join', 'inner', 'left', 'on', 'as', 'distinct', 'is', 'like', 'in', 'between',
    'count', 'sum', 'avg', 'min', 'max', 'unique',
    'foreign', 'references',
    'use', 'database']);        // "usar" y "base de datos": ver SINONIMOS

  /* Pseudocódigo en español: los mismos verbos que trae
     https://fernandoarciniega.com/pseudocodigo-en-mysql/, que es la
     referencia de la que sale este dialecto. Cada palabra española cae en el
     token de su equivalente en inglés, así que la gramática de más abajo no
     se escribe dos veces: "SELECCIONAR … DE … DONDE" recorre exactamente el
     mismo camino que "SELECT … FROM … WHERE".

     A propósito NO se traducen AND/OR/NOT/LIKE/NULL: el artículo tampoco lo
     hace, y una palabra de una sola letra como "y" u "o" chocaría con
     columnas así de cortas (una tabla de puntos con una columna "y" es
     moneda corriente en este mismo sitio, ver dibujar_pixel()). */
  const SINONIMOS = {
    seleccionar: 'select', de: 'from', donde: 'where',
    insertar: 'insert', dentro: 'into', valores: 'values',
    actualizar: 'update', conjunto: 'set', borrar: 'delete',
    crear: 'create', tabla: 'table', eliminar: 'drop', usar: 'use',
    basededatos: 'database'                    // "basededatos", una sola palabra
  };

  const SIMBOLOS = ['<>', '<=', '>=', '!=', '||', '(', ')', ',', '.', '*', '+', '-', '/',
    '%', '=', '<', '>', ';'];

  /* La siguiente palabra a partir de `desde`, saltando espacios, sin
     consumirla. Sirve para reconocer "base de datos" como un solo token de
     tres palabras sin tener que rehacer el análisis léxico entero. */
  function siguientePalabra(src, desde) {
    let j = desde;
    while (j < src.length && /\s/.test(src[j])) j++;
    let k = j;
    while (k < src.length && /[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]/.test(src[k])) k++;
    return { palabra: src.slice(j, k).toLowerCase(), fin: k };
  }

  function tokenizar(src) {
    const t = [];
    let i = 0;
    const n = src.length;
    while (i < n) {
      const c = src[i];
      if (/\s/.test(c)) { i++; continue; }
      /* Comentarios: -- hasta el fin de la línea, y /* … *​/ */
      if (c === '-' && src[i + 1] === '-') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      /* Una cadena va entre comillas simples o dobles —las dos formas del
         pseudocódigo de bases de datos—; para poner una comilla adentro se
         escribe dos veces, como en SQL de verdad. */
      if (c === "'" || c === '"') {
        const cierra = c;
        i++;
        let s = '';
        for (;;) {
          if (i >= n) err('falta la comilla que cierra el texto',
            `En SQL los textos van entre comillas: ${cierra}Asunción${cierra}.`);
          if (src[i] === cierra) {
            if (src[i + 1] === cierra) { s += cierra; i += 2; continue; }
            i++; break;
          }
          s += src[i++];
        }
        t.push({ k: 'cad', v: s });
        continue;
      }
      /* Un nombre entre acentos graves o corchetes es un identificador, no un
         texto —para una tabla o columna que coincida con una palabra
         reservada. Las comillas dobles NO se usan para esto: en el
         pseudocódigo de bases de datos (y en MySQL, que es de donde sale) son
         la otra forma de escribir un texto, igual que las simples. */
      if (c === '`' || c === '[') {
        const cierra = c === '[' ? ']' : c;
        i++;
        let s = '';
        while (i < n && src[i] !== cierra) s += src[i++];
        i++;
        t.push({ k: 'id', v: s, citado: true });
        continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1]))) {
        let s = '';
        while (i < n && /[0-9.]/.test(src[i])) s += src[i++];
        t.push({ k: 'num', v: parseFloat(s) });
        continue;
      }
      if (/[A-Za-z_ñÑáéíóúÁÉÍÓÚ]/.test(c)) {
        let s = '';
        while (i < n && /[A-Za-z0-9_ñÑáéíóúÁÉÍÓÚ]/.test(src[i])) s += src[i++];
        const b = s.toLowerCase();
        /* "base de datos", en tres palabras sueltas, es "basededatos" dicho
           despacio: se juntan acá para que el resto del motor vea un solo
           token, igual que si se hubiera escrito de una vez. */
        if (b === 'base') {
          const p1 = siguientePalabra(src, i);
          if (p1.palabra === 'de') {
            const p2 = siguientePalabra(src, p1.fin);
            if (p2.palabra === 'datos') {
              i = p2.fin;
              t.push({ k: 'database', v: 'base de datos' });
              continue;
            }
          }
        }
        const clave = SINONIMOS[b] || b;
        t.push(PALABRAS.has(clave) ? { k: clave, v: s } : { k: 'id', v: s });
        continue;
      }
      const sim = SIMBOLOS.find(x => src.startsWith(x, i));
      if (sim) { t.push({ k: sim, v: sim }); i += sim.length; continue; }
      err(`no se entiende el símbolo "${c}"`);
    }
    t.push({ k: 'fin', v: null });
    return t;
  }

  /* ------------------------------------------------------------------ */
  /* Análisis sintáctico                                                 */
  /* ------------------------------------------------------------------ */
  class P {
    constructor(t) { this.t = t; this.p = 0; }
    tk(d) { return this.t[this.p + (d || 0)]; }
    get k() { return this.tk().k; }
    es(k) { return this.k === k; }
    sig() { return this.t[this.p++]; }
    come(k) { return this.es(k) ? (this.sig(), true) : false; }
    exige(k, que) {
      if (this.es(k)) return this.sig();
      err(`se esperaba ${que || '"' + k + '"'} y se encontró ` +
        (this.tk().v === null ? 'el final' : `"${this.tk().v}"`));
    }
    nombre(que) {
      if (this.es('id')) return this.sig().v;
      /* "CREAR TABLA "clientes" (…)": con las comillas dobles ya sueltas
         para escribir texto (ver tokenizar), un nombre entre comillas se lee
         igual que uno sin comillas — así se puede escribir directo, y de
         paso es lo que exporta este mismo motor para SQLite y PostgreSQL,
         que citan los nombres así; si no, ni su propio volcado se podría
         volver a cargar. */
      if (this.es('cad')) return this.sig().v;
      /* Una palabra reservada puede ser un nombre si no hay ambigüedad; se
         acepta para no pelear con tablas que se llaman «key» o «count». */
      if (PALABRAS.has(this.k) && this.tk().v) return this.sig().v;
      err(`se esperaba ${que || 'un nombre'} y se encontró "${this.tk().v}"`);
    }

    /* ------------------------ sentencias ------------------------- */
    sentencia() {
      /* "CREAR BASE DE DATOS x" y "USAR x": ESLE2 BD trabaja con una única
         base implícita, así que estas dos son un saludo sin efecto — pero
         tienen que entenderse, porque son las primeras dos líneas de
         cualquier pseudocódigo copiado de un tutorial. */
      if (this.es('create') && this.tk(1).k === 'database') return this.crearBase();
      if (this.es('drop') && this.tk(1).k === 'database') return this.borrarBase();
      if (this.es('use')) return this.usarBase();
      if (this.es('create')) return this.crearTabla();
      if (this.es('drop')) return this.borrarTabla();
      if (this.es('insert')) return this.insertar();
      if (this.es('select')) return this.seleccionar();
      if (this.es('update')) return this.actualizar();
      if (this.es('delete')) return this.eliminar();
      err(`no se entiende "${this.tk().v}" como comienzo de una instrucción`,
        'Las instrucciones que entiende ESLE2 BD son CREAR (BASE DE DATOS / TABLA), USAR, ELIMINAR, '
        + 'INSERTAR, SELECCIONAR, ACTUALIZAR y BORRAR — o su forma en inglés: CREATE, USE, DROP, '
        + 'INSERT, SELECT, UPDATE y DELETE.');
    }

    crearBase() {
      this.exige('create');
      this.exige('database', 'la palabra BASE DE DATOS');
      return { t: 'basededatos', accion: 'crear', nombre: this.nombre('el nombre de la base') };
    }
    borrarBase() {
      this.exige('drop');
      this.exige('database', 'la palabra BASE DE DATOS');
      return { t: 'basededatos', accion: 'eliminar', nombre: this.nombre('el nombre de la base') };
    }
    usarBase() {
      this.exige('use');
      this.come('database');                    // "usar x" o "usar base de datos x", las dos formas
      return { t: 'basededatos', accion: 'usar', nombre: this.nombre('el nombre de la base') };
    }

    crearTabla() {
      this.exige('create');
      this.exige('table', 'la palabra TABLE');
      let siNoExiste = false;
      if (this.come('if')) { this.exige('not'); this.exige('exists'); siNoExiste = true; }
      const nombre = this.nombre('el nombre de la tabla');
      this.exige('(', '"(" con las columnas');
      const columnas = [];
      do {
        /* Una restricción de tabla, escrita al final y no pegada a la columna:
             FOREIGN KEY (ciudad) REFERENCES ciudades (id)
           Es la forma que exportan los tres motores, así que tiene que
           entenderse para poder volver a cargar un volcado propio. */
        if (this.es('foreign')) {
          this.sig();
          this.exige('key', 'la palabra KEY');
          this.exige('(', '"(" con la columna que referencia');
          const cual = this.nombre('el nombre de una columna');
          this.exige(')');
          const ref = this.referencia();
          const c = columnas.find(x => x.nombre.toLowerCase() === cual.toLowerCase());
          if (!c) err(`la tabla "${nombre}" no tiene una columna "${cual}"`,
            'La FOREIGN KEY tiene que nombrar una columna declarada más arriba.');
          c.refiere = ref;
          continue;
        }
        const c = { nombre: this.nombre('el nombre de una columna'), tipo: 'TEXT', pk: false, noNulo: false, porDefecto: null, refiere: null };
        if (this.es('id')) {
          c.tipo = this.sig().v.toUpperCase();
          /* Un tipo puede llevar tamaño: VARCHAR(30), DECIMAL(10,2). */
          if (this.come('(')) {
            const dims = [];
            do { dims.push(this.exige('num', 'un número').v); } while (this.come(','));
            this.exige(')');
            c.tipo += '(' + dims.join(',') + ')';
          }
        }
        for (;;) {
          if (this.come('primary')) { this.exige('key'); c.pk = true; c.noNulo = true; continue; }
          if (this.come('unique')) { c.unico = true; continue; }
          if (this.es('not') && this.tk(1).k === 'null') { this.sig(); this.sig(); c.noNulo = true; continue; }
          if (this.come('default')) { c.porDefecto = this.valorLiteral(); continue; }
          if (this.es('references')) { c.refiere = this.referencia(); continue; }
          break;
        }
        columnas.push(c);
      } while (this.come(','));
      this.exige(')');
      return { t: 'create', nombre, columnas, siNoExiste };
    }

    /* REFERENCES tabla (columna). La columna se puede omitir: entonces es la
       clave primaria de esa tabla, que es lo que se quiere el 99% de las
       veces y lo que hacen SQLite y PostgreSQL. */
    referencia() {
      this.exige('references', 'la palabra REFERENCES');
      const tabla = this.nombre('el nombre de la tabla a la que apunta');
      let columna = null;
      if (this.come('(')) { columna = this.nombre('el nombre de una columna'); this.exige(')'); }
      return { tabla, columna };
    }

    valorLiteral() {
      if (this.es('num')) return this.sig().v;
      if (this.es('cad')) return this.sig().v;
      if (this.come('null')) return null;
      if (this.es('-') && this.tk(1).k === 'num') { this.sig(); return -this.sig().v; }
      err('se esperaba un valor');
    }

    borrarTabla() {
      this.exige('drop');
      this.exige('table', 'la palabra TABLE');
      const siExiste = this.come('if') ? (this.exige('exists'), true) : false;
      return { t: 'drop', nombre: this.nombre('el nombre de la tabla'), siExiste };
    }

    insertar() {
      this.exige('insert');
      this.exige('into', 'la palabra INTO');
      const tabla = this.nombre('el nombre de la tabla');
      let columnas = null;
      if (this.come('(')) {
        columnas = [];
        do { columnas.push(this.nombre('el nombre de una columna')); } while (this.come(','));
        this.exige(')');
      }
      this.exige('values', 'la palabra VALUES');
      const filas = [];
      do {
        /* El pseudocódigo de algunos tutoriales repite la palabra VALUES en
           cada fila —"VALUES (1, 'a'), VALUES (2, 'b')"— en vez de dejarlas
           separadas solo por la coma. Es opcional: si no está, es el INSERT
           de siempre. */
        this.come('values');
        this.exige('(', '"(" con los valores');
        const fila = [];
        do { fila.push(this.expr()); } while (this.come(','));
        this.exige(')');
        filas.push(fila);
      } while (this.come(','));
      return { t: 'insert', tabla, columnas, filas };
    }

    fuente() {
      const tabla = this.nombre('el nombre de la tabla');
      let alias = null;
      if (this.come('as')) alias = this.nombre('el alias');
      else if (this.es('id')) alias = this.sig().v;
      return { tabla, alias: alias || tabla };
    }

    seleccionar() {
      this.exige('select');
      const distinto = this.come('distinct');
      const cols = [];
      do {
        if (this.es('*') && (this.tk(1).k === 'from' || this.tk(1).k === ',')) {
          this.sig();
          cols.push({ todo: true });
          continue;
        }
        const e = this.expr();
        let alias = null;
        if (this.come('as')) alias = this.nombre('el alias');
        else if (this.es('id')) alias = this.sig().v;
        cols.push({ e, alias });
      } while (this.come(','));

      const q = { t: 'select', distinto, cols, de: null, joins: [], where: null, group: null, having: null, order: [], limit: null, offset: null };
      if (this.come('from')) {
        q.de = this.fuente();
        for (;;) {
          const izq = this.come('left');
          if (izq) this.come('inner');
          if (!this.come('join')) {
            if (izq) err('después de LEFT se esperaba JOIN');
            break;
          }
          const f = this.fuente();
          this.exige('on', 'la palabra ON con la condición del JOIN');
          q.joins.push({ fuente: f, on: this.expr(), izq });
        }
      }
      if (this.come('where')) q.where = this.expr();
      if (this.come('group')) {
        this.exige('by', 'la palabra BY');
        q.group = [];
        do { q.group.push(this.expr()); } while (this.come(','));
      }
      if (this.come('having')) q.having = this.expr();
      if (this.come('order')) {
        this.exige('by', 'la palabra BY');
        do {
          const e = this.expr();
          const desc = this.come('desc') ? true : (this.come('asc'), false);
          q.order.push({ e, desc });
        } while (this.come(','));
      }
      if (this.come('limit')) {
        q.limit = this.exige('num', 'un número').v;
        if (this.come('offset')) q.offset = this.exige('num', 'un número').v;
      }
      return q;
    }

    actualizar() {
      this.exige('update');
      const tabla = this.nombre('el nombre de la tabla');
      this.exige('set', 'la palabra SET');
      const sets = [];
      do {
        const c = this.nombre('el nombre de una columna');
        this.exige('=');
        sets.push({ columna: c, e: this.expr() });
      } while (this.come(','));
      const where = this.come('where') ? this.expr() : null;
      return { t: 'update', tabla, sets, where };
    }

    eliminar() {
      this.exige('delete');
      this.exige('from', 'la palabra FROM');
      const tabla = this.nombre('el nombre de la tabla');
      const where = this.come('where') ? this.expr() : null;
      return { t: 'delete', tabla, where };
    }

    /* ------------------------ expresiones ------------------------ */
    expr() { return this.nOr(); }
    nOr() {
      let n = this.nAnd();
      while (this.come('or')) n = { t: 'bin', op: 'or', i: n, d: this.nAnd() };
      return n;
    }
    nAnd() {
      let n = this.nNot();
      while (this.come('and')) n = { t: 'bin', op: 'and', i: n, d: this.nNot() };
      return n;
    }
    nNot() {
      if (this.come('not')) return { t: 'un', op: 'not', e: this.nNot() };
      return this.nRel();
    }
    nRel() {
      let n = this.nAdit();
      for (;;) {
        if (this.come('is')) {
          const neg = this.come('not');
          this.exige('null', 'la palabra NULL');
          n = { t: 'esNulo', e: n, neg };
          continue;
        }
        if (this.come('like')) { n = { t: 'bin', op: 'like', i: n, d: this.nAdit() }; continue; }
        if (this.come('between')) {
          const a = this.nAdit();
          this.exige('and', 'la palabra AND');
          n = { t: 'entre', e: n, a, b: this.nAdit() };
          continue;
        }
        if (this.come('in')) {
          this.exige('(', '"(" con la lista de valores');
          const items = [];
          do { items.push(this.expr()); } while (this.come(','));
          this.exige(')');
          n = { t: 'en', e: n, items };
          continue;
        }
        if (['=', '<>', '!=', '<', '<=', '>', '>='].includes(this.k)) {
          const op = this.sig().k;
          n = { t: 'bin', op, i: n, d: this.nAdit() };
          continue;
        }
        return n;
      }
    }
    nAdit() {
      let n = this.nMult();
      while (this.es('+') || this.es('-') || this.es('||')) {
        const op = this.sig().k;
        n = { t: 'bin', op, i: n, d: this.nMult() };
      }
      return n;
    }
    nMult() {
      let n = this.nUn();
      while (this.es('*') || this.es('/') || this.es('%')) {
        const op = this.sig().k;
        n = { t: 'bin', op, i: n, d: this.nUn() };
      }
      return n;
    }
    nUn() {
      if (this.es('-')) { this.sig(); return { t: 'un', op: '-', e: this.nUn() }; }
      if (this.es('+')) { this.sig(); return this.nUn(); }
      return this.primaria();
    }
    primaria() {
      if (this.es('num')) return { t: 'num', v: this.sig().v };
      if (this.es('cad')) return { t: 'cad', v: this.sig().v };
      if (this.come('null')) return { t: 'nulo' };
      if (this.come('(')) { const e = this.expr(); this.exige(')'); return e; }
      /* Las funciones de agregación son palabras reservadas. */
      if (['count', 'sum', 'avg', 'min', 'max'].includes(this.k)) {
        const f = this.sig().k;
        this.exige('(', `"(" después de ${f.toUpperCase()}`);
        const distinto = this.come('distinct');
        let arg = null;
        if (this.come('*')) arg = { t: 'todo' };
        else arg = this.expr();
        this.exige(')');
        return { t: 'agr', f, arg, distinto };
      }
      if (this.es('id') || PALABRAS.has(this.k)) {
        const n1 = this.nombre();
        if (this.come('(')) {
          const args = [];
          if (!this.es(')')) do { args.push(this.expr()); } while (this.come(','));
          this.exige(')');
          return { t: 'fn', nombre: n1.toLowerCase(), args };
        }
        if (this.come('.')) {
          if (this.come('*')) return { t: 'todo', tabla: n1 };
          return { t: 'col', tabla: n1, nombre: this.nombre('el nombre de la columna') };
        }
        return { t: 'col', tabla: null, nombre: n1 };
      }
      err(`no se entiende "${this.tk().v}" dentro de una expresión`);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Valores: las reglas de SQLite, que son las que menos sorprenden      */
  /* ------------------------------------------------------------------ */
  /* Separador para armar la clave de un grupo o de un DISTINCT. Tiene que
     ser algo que no pueda aparecer en un dato: si se usara una coma, las
     filas ('a,b', 'c') y ('a', 'b,c') tendrían la misma clave y se
     considerarían repetidas sin serlo. */
  const SEPARADOR = String.fromCharCode(1);

  const esNulo = v => v === null || v === undefined;

  function afinidad(tipo) {
    const t = String(tipo || '').toUpperCase();
    if (/INT/.test(t)) return 'entero';
    if (/CHAR|CLOB|TEXT/.test(t)) return 'texto';
    if (/BLOB/.test(t) || t === '') return 'nada';
    if (/REAL|FLOA|DOUB/.test(t)) return 'real';
    return 'numero';
  }

  /* Guardar un valor en una columna: se convierte si tiene sentido, y si no
     se guarda como vino. Es lo que hace SQLite y evita que un TEXT con un
     número adentro explote en la cara de quien recién empieza. */
  function convertir(v, tipo) {
    if (esNulo(v)) return null;
    const a = afinidad(tipo);
    if (a === 'texto') return typeof v === 'string' ? v : textoDe(v);
    if (a === 'entero' || a === 'real' || a === 'numero') {
      if (typeof v === 'number') return a === 'entero' && Number.isInteger(v) ? v : v;
      const n = Number(String(v).trim());
      if (String(v).trim() !== '' && !Number.isNaN(n)) return n;
      return v;
    }
    return v;
  }

  function textoDe(v) {
    if (esNulo(v)) return '';
    if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(parseFloat(v.toPrecision(12)));
    if (typeof v === 'boolean') return v ? '1' : '0';
    return String(v);
  }

  /* Comparar como SQL: los números antes que los textos, y NULL aparte. */
  function comparar(a, b) {
    if (esNulo(a) && esNulo(b)) return 0;
    if (esNulo(a)) return -1;
    if (esNulo(b)) return 1;
    const na = typeof a === 'number', nb = typeof b === 'number';
    if (na && nb) return a < b ? -1 : a > b ? 1 : 0;
    if (na) return -1;
    if (nb) return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  }

  const verdad = v => (esNulo(v) ? null : (typeof v === 'number' ? v !== 0 : !!v));

  /* ------------------------------------------------------------------ */
  /* Evaluación                                                          */
  /* ------------------------------------------------------------------ */
  function comoRegex(patron) {
    let r = '';
    for (const c of String(patron)) {
      if (c === '%') r += '[\\s\\S]*';
      else if (c === '_') r += '[\\s\\S]';
      else r += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + r + '$', 'i');
  }

  function evaluar(e, fila, ctx) {
    switch (e.t) {
      case 'num': return e.v;
      case 'cad': return e.v;
      case 'nulo': return null;
      case 'col': return leerCol(e, fila, ctx);
      case 'un': {
        const v = evaluar(e.e, fila, ctx);
        if (e.op === 'not') { const b = verdad(v); return b === null ? null : !b; }
        return esNulo(v) ? null : -Number(v);
      }
      case 'esNulo': {
        const v = evaluar(e.e, fila, ctx);
        return e.neg ? !esNulo(v) : esNulo(v);
      }
      case 'entre': {
        const v = evaluar(e.e, fila, ctx);
        const a = evaluar(e.a, fila, ctx), b = evaluar(e.b, fila, ctx);
        if (esNulo(v) || esNulo(a) || esNulo(b)) return null;
        return comparar(v, a) >= 0 && comparar(v, b) <= 0;
      }
      case 'en': {
        const v = evaluar(e.e, fila, ctx);
        if (esNulo(v)) return null;
        let hayNulo = false;
        for (const x of e.items) {
          const w = evaluar(x, fila, ctx);
          if (esNulo(w)) { hayNulo = true; continue; }
          if (comparar(v, w) === 0) return true;
        }
        return hayNulo ? null : false;
      }
      case 'bin': return binario(e, fila, ctx);
      case 'fn': return funcion(e, fila, ctx);
      case 'agr': return ctx && ctx.agregados ? ctx.agregados.get(claveAgr(e)) : null;
      case 'todo': err('* no se puede usar en esta parte de la consulta');
      default: err('expresión que el motor no conoce');
    }
  }

  function leerCol(e, fila, ctx) {
    const clave = e.tabla ? e.tabla.toLowerCase() + '.' + e.nombre.toLowerCase() : e.nombre.toLowerCase();
    if (fila && Object.prototype.hasOwnProperty.call(fila, clave)) return fila[clave];
    if (!e.tabla && fila) {
      /* Sin la tabla adelante: se busca en todas, y si está en más de una se
         avisa en vez de elegir una al azar. */
      const cand = Object.keys(fila).filter(k => k.endsWith('.' + e.nombre.toLowerCase()));
      const distintas = new Set(cand.map(k => fila[k]));
      if (cand.length === 1) return fila[cand[0]];
      if (cand.length > 1) {
        if (distintas.size === 1) return fila[cand[0]];
        err(`la columna "${e.nombre}" está en más de una tabla`,
          'Poné adelante el nombre o el alias de la tabla: t.' + e.nombre + '.');
      }
    }
    if (ctx && ctx.alias && Object.prototype.hasOwnProperty.call(ctx.alias, clave)) return ctx.alias[clave];
    err(`no existe la columna "${e.tabla ? e.tabla + '.' : ''}${e.nombre}"`,
      ctx && ctx.columnas && ctx.columnas.length
        ? 'Las que hay son: ' + ctx.columnas.join(', ') + '.' : '');
  }

  function binario(e, fila, ctx) {
    const op = e.op;
    if (op === 'and' || op === 'or') {
      const a = verdad(evaluar(e.i, fila, ctx));
      /* La lógica de tres valores de SQL: FALSE AND NULL da FALSE, pero
         TRUE AND NULL da NULL. */
      if (op === 'and' && a === false) return false;
      if (op === 'or' && a === true) return true;
      const b = verdad(evaluar(e.d, fila, ctx));
      if (a === null || b === null) return null;
      return op === 'and' ? a && b : a || b;
    }
    const a = evaluar(e.i, fila, ctx);
    const b = evaluar(e.d, fila, ctx);
    if (op === '||') return esNulo(a) || esNulo(b) ? null : textoDe(a) + textoDe(b);
    if (op === 'like') return esNulo(a) || esNulo(b) ? null : comoRegex(b).test(textoDe(a));
    if (esNulo(a) || esNulo(b)) return null;      // cualquier cuenta con NULL da NULL
    switch (op) {
      case '+': return num(a) + num(b);
      case '-': return num(a) - num(b);
      case '*': return num(a) * num(b);
      case '/': {
        if (num(b) === 0) err('división por cero en la consulta');
        return num(a) / num(b);
      }
      case '%': {
        if (num(b) === 0) err('división por cero en la consulta');
        return num(a) % num(b);
      }
      case '=': return comparar(a, b) === 0;
      case '<>': case '!=': return comparar(a, b) !== 0;
      case '<': return comparar(a, b) < 0;
      case '<=': return comparar(a, b) <= 0;
      case '>': return comparar(a, b) > 0;
      case '>=': return comparar(a, b) >= 0;
      default: err(`operador "${op}" que el motor no conoce`);
    }
  }

  const num = v => (typeof v === 'number' ? v : (Number(v) || 0));

  function funcion(e, fila, ctx) {
    const a = e.args.map(x => evaluar(x, fila, ctx));
    switch (e.nombre) {
      case 'upper': return esNulo(a[0]) ? null : textoDe(a[0]).toUpperCase();
      case 'lower': return esNulo(a[0]) ? null : textoDe(a[0]).toLowerCase();
      case 'length': return esNulo(a[0]) ? null : textoDe(a[0]).length;
      case 'trim': return esNulo(a[0]) ? null : textoDe(a[0]).trim();
      case 'abs': return esNulo(a[0]) ? null : Math.abs(num(a[0]));
      case 'round': {
        if (esNulo(a[0])) return null;
        const d = a.length > 1 ? Math.trunc(num(a[1])) : 0;
        const f = Math.pow(10, d);
        return Math.round(num(a[0]) * f) / f;
      }
      case 'substr': {
        if (esNulo(a[0])) return null;
        const s = textoDe(a[0]);
        const desde = Math.trunc(num(a[1]));
        const cuantos = a.length > 2 ? Math.trunc(num(a[2])) : s.length;
        return s.substr(desde < 1 ? 0 : desde - 1, cuantos);
      }
      case 'coalesce': {
        for (const v of a) if (!esNulo(v)) return v;
        return null;
      }
      case 'ifnull': return esNulo(a[0]) ? a[1] : a[0];
      default:
        err(`la función "${e.nombre}" no existe`,
          'Las que hay son: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, TRIM, ROUND, ABS, SUBSTR, COALESCE e IFNULL.');
    }
  }

  const FUNCIONES = new Set(['upper', 'lower', 'length', 'trim', 'abs', 'round',
    'substr', 'coalesce', 'ifnull']);

  const claveAgr = e => e.f + '|' + (e.distinto ? 'd|' : '') + JSON.stringify(e.arg);

  /* Revisa los nombres ANTES de ejecutar. Sin esto, una consulta sobre una
     tabla vacía no llega a evaluar nada y un nombre mal escrito pasaría en
     silencio: la consulta «anda» y devuelve cero filas, que es la peor forma
     de equivocarse porque parece un resultado. */
  function validar(e, columnas) {
    if (!e || typeof e !== 'object') return;
    if (e.t === 'col') {
      const clave = (e.tabla ? e.tabla + '.' : '') + e.nombre;
      const hay = columnas.some(c => c.toLowerCase() === clave.toLowerCase())
        || (!e.tabla && columnas.some(c => c.toLowerCase().endsWith('.' + e.nombre.toLowerCase())));
      if (!hay) err(`no existe la columna "${clave}"`,
        columnas.length ? 'Las que hay son: ' + columnas.join(', ') + '.' : '');
      return;
    }
    if (e.t === 'fn' && !FUNCIONES.has(e.nombre))
      err(`la función "${e.nombre}" no existe`,
        'Las que hay son: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, TRIM, ROUND, ABS, SUBSTR, COALESCE e IFNULL.');
    for (const k of Object.keys(e)) {
      if (k === 't' || k === 'tabla' || k === 'nombre' || k === 'op' || k === 'f') continue;
      const v = e[k];
      if (Array.isArray(v)) v.forEach(x => validar(x, columnas));
      else if (v && typeof v === 'object') validar(v, columnas);
    }
  }

  /* ------------------------------------------------------------------ */
  /* La base                                                             */
  /* ------------------------------------------------------------------ */
  function crear() { return { tablas: new Map() }; }

  function tabla(base, nombre, para) {
    const t = base.tablas.get(nombre.toLowerCase());
    if (!t) err(`no existe la tabla "${nombre}"`,
      base.tablas.size
        ? 'Las que hay son: ' + [...base.tablas.values()].map(x => x.nombre).join(', ') + '.'
        : 'Todavía no creaste ninguna tabla. Empezá con CREATE TABLE.');
    return t;
  }

  function tablas(base) {
    return [...base.tablas.values()].map(t => ({
      nombre: t.nombre,
      columnas: t.columnas.map(c => ({
        nombre: c.nombre, tipo: c.tipo, pk: c.pk, noNulo: c.noNulo, unico: !!c.unico,
        porDefecto: c.porDefecto === undefined ? null : c.porDefecto,
        refiere: c.refiere ? { tabla: c.refiere.tabla, columna: c.refiere.columna } : null
      })),
      filas: t.filas.length
    }));
  }

  /* --------------------------- ejecutar ------------------------------ */
  function ejecutar(base, texto) {
    const p = new P(tokenizar(texto));
    const salidas = [];
    for (;;) {
      while (p.come(';')) { /* varias instrucciones seguidas */ }
      if (p.es('fin')) break;
      const s = p.sentencia();
      salidas.push(correr(base, s));
    }
    return salidas;
  }

  function correr(base, s) {
    switch (s.t) {
      case 'create': return crearTabla(base, s);
      case 'drop': return borrarTabla(base, s);
      case 'insert': return insertar(base, s);
      case 'select': return seleccionar(base, s);
      case 'update': return actualizar(base, s);
      case 'delete': return eliminar(base, s);
      case 'basededatos': return basedeDatos(s);
      default: err('instrucción que el motor no conoce');
    }
  }

  /* CREAR/ELIMINAR/USAR BASE DE DATOS: ESLE2 BD ya trabaja con una única base
     implícita —la que se ve en el panel "La base"—, así que estas tres no
     hacen nada más que dejarlo dicho. Se entienden en vez de fallar porque
     son casi siempre las dos primeras líneas de un tutorial copiado tal
     cual, y que ESLE2 BD se trabe justo ahí sería la peor bienvenida
     posible. */
  function basedeDatos(s) {
    const frases = {
      crear: `la base "${s.nombre}" ya existe: es esta misma`,
      eliminar: `ESLE2 BD no borra la base entera desde SQL; usá "Vaciar la base" en el menú Base`,
      usar: `ya se está usando "${s.nombre}": ESLE2 BD trabaja con una sola base`
    };
    return { tipo: 'basededatos', afectadas: 0, mensaje: frases[s.accion] };
  }

  function crearTabla(base, s) {
    const k = s.nombre.toLowerCase();
    if (base.tablas.has(k)) {
      if (s.siNoExiste) return { tipo: 'create', afectadas: 0, mensaje: `la tabla ${s.nombre} ya existía` };
      err(`la tabla "${s.nombre}" ya existe`,
        'Usá CREATE TABLE IF NOT EXISTS, o borrala antes con DROP TABLE.');
    }
    const vistos = new Set();
    for (const c of s.columnas) {
      const n = c.nombre.toLowerCase();
      if (vistos.has(n)) err(`la columna "${c.nombre}" está repetida en la tabla "${s.nombre}"`);
      vistos.add(n);
    }
    if (s.columnas.filter(c => c.pk).length > 1)
      err(`la tabla "${s.nombre}" tiene más de una PRIMARY KEY`,
        'Si la clave es de varias columnas, en este motor se declara una sola y se controla a mano.');

    /* Las referencias se resuelven acá y no al usarlas: si la tabla a la que
       apuntan no existe todavía, lo mejor es decirlo al crear y no cuando ya
       hay datos cargados. Por eso las tablas se crean de la referida a la que
       referencia, que además es el orden en que se explican en clase. */
    for (const c of s.columnas) {
      if (!c.refiere) continue;
      const otra = base.tablas.get(c.refiere.tabla.toLowerCase());
      if (!otra) err(`la columna "${c.nombre}" apunta a la tabla "${c.refiere.tabla}", que no existe`,
        'Creá primero la tabla a la que apunta: una clave foránea solo puede señalar algo que ya está.');
      let destino = c.refiere.columna
        ? otra.columnas.find(x => x.nombre.toLowerCase() === c.refiere.columna.toLowerCase())
        : otra.columnas.find(x => x.pk);
      if (!destino) err(c.refiere.columna
        ? `la tabla "${otra.nombre}" no tiene una columna "${c.refiere.columna}"`
        : `la tabla "${otra.nombre}" no tiene PRIMARY KEY`,
        c.refiere.columna ? '' : 'Poné entre paréntesis a qué columna apunta: REFERENCES ' + otra.nombre + ' (columna).');
      if (!destino.pk && !destino.unico)
        err(`"${otra.nombre}.${destino.nombre}" no es PRIMARY KEY ni UNIQUE`,
          'Una clave foránea tiene que apuntar a una columna que no se repita: si no, no se sabría a qué fila señala.');
      c.refiere = { tabla: otra.nombre, columna: destino.nombre };
    }

    base.tablas.set(k, { nombre: s.nombre, columnas: s.columnas, filas: [] });
    return { tipo: 'create', afectadas: 0, mensaje: `tabla ${s.nombre} creada` };
  }

  function borrarTabla(base, s) {
    const k = s.nombre.toLowerCase();
    if (!base.tablas.has(k)) {
      if (s.siExiste) return { tipo: 'drop', afectadas: 0, mensaje: `la tabla ${s.nombre} no existía` };
      err(`no existe la tabla "${s.nombre}"`);
    }
    base.tablas.delete(k);
    return { tipo: 'drop', afectadas: 0, mensaje: `tabla ${s.nombre} borrada` };
  }

  /* Una clave foránea se hace cumplir al escribir: un valor que no está en la
     otra tabla se rechaza. NULL sí se admite —quiere decir «todavía no se
     sabe a cuál»—, que es lo que hace que exista el LEFT JOIN.

     Al borrar NO se controla nada: para eso harían falta ON DELETE CASCADE y
     RESTRICT, que este motor no tiene, y elegir uno de los dos por nuestra
     cuenta sería inventar lo que el programa no dijo. Está anotado en
     «Lo que no hace» de la documentación. */
  function controlarRefs(base, t, fila) {
    for (const c of t.columnas) {
      if (!c.refiere || esNulo(fila[c.nombre])) continue;
      const otra = base.tablas.get(c.refiere.tabla.toLowerCase());
      if (!otra) continue;                       // la borraron con DROP TABLE
      const hay = otra.filas.some(f => comparar(f[c.refiere.columna], fila[c.nombre]) === 0);
      if (!hay) err(`no hay ninguna fila con ${c.refiere.tabla}.${c.refiere.columna} = ${textoDe(fila[c.nombre])}`,
        `La columna "${t.nombre}.${c.nombre}" apunta a "${c.refiere.tabla}": el valor tiene que existir allá primero. `
        + 'Si todavía no se sabe cuál es, dejalo en NULL.');
    }
  }

  function insertar(base, s) {
    const t = tabla(base, s.tabla);
    const cols = s.columnas
      ? s.columnas.map(n => {
        const c = t.columnas.find(x => x.nombre.toLowerCase() === n.toLowerCase());
        if (!c) err(`la tabla "${t.nombre}" no tiene una columna "${n}"`,
          'Las que tiene son: ' + t.columnas.map(x => x.nombre).join(', ') + '.');
        return c;
      })
      : t.columnas;

    let n = 0;
    for (const valores of s.filas) {
      if (valores.length !== cols.length)
        err(`se dieron ${valores.length} valor(es) para ${cols.length} columna(s)`,
          'Tiene que haber un valor por cada columna nombrada, en el mismo orden.');
      const fila = {};
      for (const c of t.columnas) fila[c.nombre] = esNulo(c.porDefecto) ? null : c.porDefecto;
      cols.forEach((c, i) => { fila[c.nombre] = convertir(evaluar(valores[i], null, null), c.tipo); });

      for (const c of t.columnas) {
        if (c.noNulo && esNulo(fila[c.nombre]))
          err(`la columna "${c.nombre}" no admite NULL`,
            c.pk ? 'Es la clave primaria de la tabla.' : 'Está declarada NOT NULL.');
        if ((c.pk || c.unico) && !esNulo(fila[c.nombre])) {
          const repetida = t.filas.some(f => comparar(f[c.nombre], fila[c.nombre]) === 0);
          if (repetida) err(`ya hay una fila con ${c.nombre} = ${textoDe(fila[c.nombre])}`,
            c.pk ? 'La clave primaria no se puede repetir.' : 'La columna está declarada UNIQUE.');
        }
      }
      controlarRefs(base, t, fila);
      t.filas.push(fila);
      n++;
    }
    return { tipo: 'insert', afectadas: n, mensaje: `${n} fila(s) agregada(s) a ${t.nombre}` };
  }

  /* Arma las filas «anchas» del FROM y los JOIN: cada clave es
     «alias.columna» en minúsculas, más «columna» sola para poder escribirla
     sin prefijo cuando no hay ambigüedad. */
  function filasDe(base, q) {
    const fuentes = [q.de].concat(q.joins.map(j => j.fuente)).filter(Boolean);
    const columnas = [];
    for (const f of fuentes) {
      const t = tabla(base, f.tabla);
      for (const c of t.columnas) columnas.push(f.alias + '.' + c.nombre);
    }
    if (!q.de) return { filas: [{}], columnas };

    const ancha = (base_, f, fila) => {
      const o = {};
      const t = tabla(base_, f.tabla);
      for (const c of t.columnas) {
        o[f.alias.toLowerCase() + '.' + c.nombre.toLowerCase()] = fila[c.nombre];
      }
      return o;
    };

    let filas = tabla(base, q.de.tabla).filas.map(f => ancha(base, q.de, f));
    for (const j of q.joins) {
      const der = tabla(base, j.fuente.tabla).filas.map(f => ancha(base, j.fuente, f));
      const vacia = {};
      for (const c of tabla(base, j.fuente.tabla).columnas)
        vacia[j.fuente.alias.toLowerCase() + '.' + c.nombre.toLowerCase()] = null;

      const nuevas = [];
      for (const a of filas) {
        let hubo = false;
        for (const b of der) {
          const fila = Object.assign({}, a, b);
          if (verdad(evaluar(j.on, fila, { columnas })) === true) { nuevas.push(fila); hubo = true; }
        }
        /* LEFT JOIN: la fila de la izquierda sale igual, con nulos. */
        if (!hubo && j.izq) nuevas.push(Object.assign({}, a, vacia));
      }
      filas = nuevas;
    }
    return { filas, columnas };
  }

  /* Junta todas las funciones de agregación que aparecen en la consulta. */
  function buscarAgregados(e, out) {
    if (!e || typeof e !== 'object') return out;
    if (e.t === 'agr') { out.push(e); return out; }
    for (const k of Object.keys(e)) {
      const v = e[k];
      if (Array.isArray(v)) v.forEach(x => buscarAgregados(x, out));
      else if (v && typeof v === 'object') buscarAgregados(v, out);
    }
    return out;
  }

  function calcularAgregados(agrs, filas, ctx) {
    const m = new Map();
    for (const a of agrs) {
      let vals = a.arg && a.arg.t === 'todo' ? filas.map(() => 1)
        : filas.map(f => evaluar(a.arg, f, ctx));
      if (!(a.arg && a.arg.t === 'todo')) vals = vals.filter(v => !esNulo(v));
      if (a.distinto) {
        const vistos = new Set();
        vals = vals.filter(v => {
          const k = typeof v + '|' + textoDe(v);
          if (vistos.has(k)) return false;
          vistos.add(k);
          return true;
        });
      }
      let r;
      switch (a.f) {
        case 'count': r = vals.length; break;
        case 'sum': r = vals.length ? vals.reduce((s, v) => s + num(v), 0) : null; break;
        case 'avg': r = vals.length ? vals.reduce((s, v) => s + num(v), 0) / vals.length : null; break;
        case 'min': r = vals.length ? vals.reduce((x, v) => (comparar(v, x) < 0 ? v : x)) : null; break;
        case 'max': r = vals.length ? vals.reduce((x, v) => (comparar(v, x) > 0 ? v : x)) : null; break;
        default: r = null;
      }
      m.set(claveAgr(a), r);
    }
    return m;
  }

  function nombreCol(c, i) {
    if (c.alias) return c.alias;
    const e = c.e;
    if (e.t === 'col') return e.nombre;
    if (e.t === 'agr') return e.f.toUpperCase() + '(' + (e.arg && e.arg.t === 'todo' ? '*' : nombreExpr(e.arg)) + ')';
    if (e.t === 'fn') return e.nombre.toUpperCase() + '(' + (e.args || []).map(nombreExpr).join(', ') + ')';
    return nombreExpr(e) || ('columna' + (i + 1));
  }

  function nombreExpr(e) {
    if (!e) return '';
    if (e.t === 'col') return (e.tabla ? e.tabla + '.' : '') + e.nombre;
    if (e.t === 'num') return String(e.v);
    if (e.t === 'cad') return "'" + e.v + "'";
    if (e.t === 'bin') return nombreExpr(e.i) + ' ' + e.op + ' ' + nombreExpr(e.d);
    return 'expr';
  }

  function seleccionar(base, q) {
    const { filas, columnas } = filasDe(base, q);
    const ctx = { columnas };

    let vivas = q.where
      ? filas.filter(f => verdad(evaluar(q.where, f, ctx)) === true)
      : filas;

    /* Qué columnas salen: se expande el * a las columnas de verdad. */
    const salida = [];
    for (const c of q.cols) {
      if (c.todo) {
        for (const nom of columnas) {
          const [al, col] = nom.split('.');
          salida.push({ nombre: col, e: { t: 'col', tabla: al, nombre: col } });
        }
        continue;
      }
      if (c.e && c.e.t === 'todo' && c.e.tabla) {
        for (const nom of columnas.filter(x => x.toLowerCase().startsWith(c.e.tabla.toLowerCase() + '.'))) {
          const [al, col] = nom.split('.');
          salida.push({ nombre: col, e: { t: 'col', tabla: al, nombre: col } });
        }
        continue;
      }
      salida.push({ nombre: nombreCol(c, salida.length), e: c.e });
    }

    /* También los del ORDER BY: «ORDER BY SUM(monto)» es legítimo aunque la
       suma no aparezca entre las columnas que se muestran. */
    for (const c of salida) validar(c.e, columnas);
    if (q.where) validar(q.where, columnas);
    if (q.having) validar(q.having, columnas);
    /* En el ORDER BY también vale el nombre que la propia consulta le puso a
       una columna —«... COUNT(*) AS cuantos  ORDER BY cuantos»—, como en
       SQLite, MySQL y PostgreSQL. Ese nombre no es una columna de ninguna
       tabla, así que validar() lo rechazaría; ordenar por él ya lo sabe
       resolver valorOrden(). */
    const aliasSalida = e => e.t === 'col' && !e.tabla
      && salida.some(c => c.nombre.toLowerCase() === e.nombre.toLowerCase());
    for (const o of q.order) if (!aliasSalida(o.e)) validar(o.e, columnas);
    for (const g of q.group || []) validar(g, columnas);

    const agrs = buscarAgregados({
      cols: salida.map(s => s.e), having: q.having, order: q.order.map(o => o.e)
    }, []);
    let resultado = [];

    if (q.group || agrs.length) {
      /* Con GROUP BY se arma un grupo por combinación de valores; sin él,
         toda la tabla es un grupo solo. */
      const grupos = new Map();
      if (q.group) {
        for (const f of vivas) {
          const clave = q.group.map(g => {
            const v = evaluar(g, f, ctx);
            return typeof v + '|' + textoDe(v);
          }).join('');
          if (!grupos.has(clave)) grupos.set(clave, []);
          grupos.get(clave).push(f);
        }
      } else {
        grupos.set('', vivas);
      }

      for (const [, gf] of grupos) {
        const ctxG = { columnas, agregados: calcularAgregados(agrs, gf, ctx) };
        const rep = gf[0] || {};
        if (q.having && verdad(evaluar(q.having, rep, ctxG)) !== true) continue;
        resultado.push({ v: salida.map(c => evaluar(c.e, rep, ctxG)), origen: rep, ctx: ctxG });
      }
      /* Sin GROUP BY y sin filas, COUNT(*) igual tiene que dar 0. */
      if (!q.group && !vivas.length && agrs.length && !resultado.length) {
        const ctxG = { columnas, agregados: calcularAgregados(agrs, [], ctx) };
        resultado.push({ v: salida.map(c => evaluar(c.e, {}, ctxG)), origen: {}, ctx: ctxG });
      }
    } else {
      for (const f of vivas) {
        resultado.push({ v: salida.map(c => evaluar(c.e, f, ctx)), origen: f, ctx });
      }
    }

    if (q.distinto) {
      const vistos = new Set();
      resultado = resultado.filter(f => {
        const k = f.v.map(v => typeof v + '|' + textoDe(v)).join(SEPARADOR);
        if (vistos.has(k)) return false;
        vistos.add(k);
        return true;
      });
    }

    if (q.order.length) {
      resultado.sort((a, b) => {
        for (const o of q.order) {
          /* Se puede ordenar por una columna de la salida o por una de la
             tabla, que es como se usa en la práctica. */
          const va = valorOrden(o.e, a, salida, ctx);
          const vb = valorOrden(o.e, b, salida, ctx);
          const c = comparar(va, vb);
          if (c !== 0) return o.desc ? -c : c;
        }
        return 0;
      });
    }

    if (q.offset) resultado = resultado.slice(q.offset);
    if (q.limit !== null && q.limit !== undefined) resultado = resultado.slice(0, q.limit);

    return {
      tipo: 'select',
      columnas: salida.map(c => c.nombre),
      filas: resultado.map(f => f.v),
      afectadas: resultado.length,
      mensaje: `${resultado.length} fila(s)`
    };
  }

  /* Ordenar por una columna de la salida (por su alias) o por cualquier
     expresión sobre la fila original: las dos formas se usan. */
  function valorOrden(e, fila, salida, ctx) {
    if (e.t === 'col' && !e.tabla) {
      const i = salida.findIndex(x => x.nombre.toLowerCase() === e.nombre.toLowerCase());
      if (i >= 0) return fila.v[i];
    }
    return evaluar(e, fila.origen || {}, fila.ctx || ctx);
  }

  function actualizar(base, s) {
    const t = tabla(base, s.tabla);
    const ctx = { columnas: t.columnas.map(c => t.nombre + '.' + c.nombre) };
    const ancha = f => {
      const o = {};
      for (const c of t.columnas) {
        o[t.nombre.toLowerCase() + '.' + c.nombre.toLowerCase()] = f[c.nombre];
      }
      return o;
    };
    /* Se revisan los nombres antes de recorrer: si la tabla está vacía, el
       ciclo no se ejecutaría y una columna mal escrita pasaría en silencio. */
    const destinos = s.sets.map(set => {
      const c = t.columnas.find(x => x.nombre.toLowerCase() === set.columna.toLowerCase());
      if (!c) err(`la tabla "${t.nombre}" no tiene una columna "${set.columna}"`,
        'Las que tiene son: ' + t.columnas.map(x => x.nombre).join(', ') + '.');
      validar(set.e, ctx.columnas);
      return c;
    });
    if (s.where) validar(s.where, ctx.columnas);

    let n = 0;
    for (const f of t.filas) {
      const a = ancha(f);
      if (s.where && verdad(evaluar(s.where, a, ctx)) !== true) continue;
      s.sets.forEach((set, i) => {
        const c = destinos[i];
        const v = convertir(evaluar(set.e, a, ctx), c.tipo);
        if (c.noNulo && esNulo(v)) err(`la columna "${c.nombre}" no admite NULL`);
        f[c.nombre] = v;
      });
      controlarRefs(base, t, f);
      n++;
    }
    return { tipo: 'update', afectadas: n, mensaje: `${n} fila(s) modificada(s) en ${t.nombre}` };
  }

  function eliminar(base, s) {
    const t = tabla(base, s.tabla);
    const ctx = { columnas: t.columnas.map(c => t.nombre + '.' + c.nombre) };
    const ancha = f => {
      const o = {};
      for (const c of t.columnas) o[t.nombre.toLowerCase() + '.' + c.nombre.toLowerCase()] = f[c.nombre];
      return o;
    };
    if (s.where) validar(s.where, ctx.columnas);
    const antes = t.filas.length;
    t.filas = t.filas.filter(f => (s.where ? verdad(evaluar(s.where, ancha(f), ctx)) !== true : false));
    const n = antes - t.filas.length;
    return { tipo: 'delete', afectadas: n, mensaje: `${n} fila(s) borrada(s) de ${t.nombre}` };
  }

  global.SQL = { crear, ejecutar, tablas, SQLError, textoDe, comparar, tokenizar, afinidad };
})(typeof window !== 'undefined' ? window : globalThis);

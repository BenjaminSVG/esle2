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
 *   CREAR TABLA t (c TIPO [CLAVE PRIMARIA] [NO NULO] [POR DEFECTO v], ...)
 *   ELIMINAR TABLA [SI EXISTE] t
 *   INSERTAR DENTRO t [(cols)] VALORES (...), (...)
 *   SELECCIONAR [DISTINTOS] cols DE t [alias]
 *          [UNIR t2 [alias] SEGUN cond]
 *          [DONDE cond] [AGRUPAR POR cols] [TENIENDO cond]
 *          [ORDENAR POR col [ASCENDENTE|DESCENDENTE], ...] [LIMITE n [DESPLAZAMIENTO m]]
 *   ACTUALIZAR t CONJUNTO c = v, ... [DONDE cond]
 *   BORRAR DE t [DONDE cond]
 *
 * La misma gramática se escribe en inglés, y los dos idiomas se pueden
 * mezclar: hace falta para volver a cargar un volcado propio, que sale en
 * inglés. Es exactamente el mismo camino, palabra por palabra:
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
 *   SQL.SQLError · SQL.SQLLimite · SQL.TOPES
 *
 * Cada sentencia tiene un presupuesto (ver TOPES) y una sentencia que lo
 * supera para con un SQLLimite y deja la base como estaba. Ninguna sentencia
 * se aplica por la mitad: se calcula cómo va a quedar la tabla y recién
 * después se publica.
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
  /* El presupuesto de una sentencia                                     */
  /* ------------------------------------------------------------------ */
  /* Una pestaña del navegador tiene la memoria que tiene, y un JOIN de dos
     tablas grandes puede pedir más de lo que hay sin que nada avise. Sin un
     tope, «la consulta está pensando» y «la pestaña se colgó» se ven igual, y
     lo segundo se lleva puesto el programa del alumno.

     Así que cada sentencia tiene un presupuesto, y cuando se le acaba para y
     lo dice. Nunca devuelve un resultado cortado en silencio: un resultado
     incompleto que parece completo enseña algo falso. */
  const TOPES = {
    filasPorTabla: 100000,
    filasEnTotal: 500000,
    filasDeResultado: 100000,
    trabajo: 10000000,
    milisegundos: 5000,
    textoSQL: 1048576
  };

  /* Cada cuánto se mira el reloj. Mirarlo en cada paso costaría más que el
     paso; cada 8192 el costo es invisible y la demora extra, imperceptible. */
  const CADA_CUANTO = 8192;

  class SQLLimite extends SQLError {
    constructor(msg, sugerencia) { super(msg, sugerencia); this.limite = true; }
  }

  /* El presupuesto de la sentencia que se está corriendo. Es una variable del
     módulo y no un parámetro porque el motor es de un solo hilo y hay quince
     funciones en el camino: pasarlo por todas no lo haría más correcto, solo
     más largo. ejecutar() lo pone y lo saca siempre, pase lo que pase. */
  let gasto = null;

  function gastar(n) {
    if (!gasto) return;
    gasto.trabajo += n;
    if (gasto.trabajo > gasto.topes.trabajo)
      throw new SQLLimite('la consulta superó el límite de trabajo',
        'Agregá un filtro, reducí el resultado con LIMITE, o dividila en dos. '
        + 'La base quedó como estaba.');
    gasto.desdeReloj += n;
    if (gasto.desdeReloj >= CADA_CUANTO) {
      gasto.desdeReloj = 0;
      if (Date.now() > gasto.hasta)
        throw new SQLLimite(`la consulta tardó más de ${gasto.topes.milisegundos / 1000} segundos`,
          'Agregá un filtro, reducí el resultado con LIMITE, o dividila en dos. '
          + 'La base quedó como estaba.');
    }
  }

  function tope(cuantas, cual, que) {
    if (cuantas <= TOPES[cual]) return;
    throw new SQLLimite(`${que}: el tope de esta sesión es ${TOPES[cual]}`,
      'Cargá menos filas, o guardá la base con Exportar y seguí en SQLite, MySQL o PostgreSQL.');
  }

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

     Están todas: no queda ninguna palabra que haya que escribir en inglés por
     obligación. El inglés se sigue entendiendo, y los dos idiomas se pueden
     mezclar en la misma sentencia — hace falta para poder volver a cargar un
     volcado propio, que sale en inglés.

     Las palabras de sintaxis se escriben sin tildes, pero se aceptan con
     ellas: adentro se comparan sin tilde (ver sinTildes). */
  const SINONIMOS = {
    seleccionar: 'select', de: 'from', donde: 'where',
    insertar: 'insert', dentro: 'into', valores: 'values',
    actualizar: 'update', conjunto: 'set', borrar: 'delete',
    crear: 'create', tabla: 'table', eliminar: 'drop', usar: 'use',
    basededatos: 'database',                   // "basededatos", una sola palabra

    ordenar: 'order', agrupar: 'group', por: 'by', teniendo: 'having',
    unir: 'join', interior: 'inner', izquierda: 'left', segun: 'on',
    como: 'as', como_patron: 'like', distintos: 'distinct',
    limite: 'limit', desplazamiento: 'offset',
    ascendente: 'asc', descendente: 'desc',
    es: 'is', nulo: 'null', en: 'in', entre: 'between', existe: 'exists',
    si: 'if', unico: 'unique', referencia: 'references', referencias: 'references',
    no: 'not',
    contar: 'count', sumar: 'sum', promedio: 'avg', minimo: 'min', maximo: 'max'
  };

  /* «y» y «o» son las dos únicas que NO se reservan. Una tabla de puntos con
     columnas «x» e «y» es moneda corriente en este mismo sitio (ver
     dibujar_pixel()), así que reservarlas rompería «ORDENAR POR y». Llegan
     como identificadores, y el parser las lee como operador solamente donde
     no puede haber una columna — ver esEsp() y comeEsp(). */
  const CONTEXTUALES = new Set(['y', 'o']);

  /* Las que no son una palabra por otra: en español el orden es al revés
     (CLAVE PRIMARIA, no PRIMARIA CLAVE) o son dos palabras donde el inglés
     tiene una. Se reconocen enteras: «PRIMARY CLAVE» no es ninguna de las dos
     formas y no se acepta. */
  const FRASES = {
    base: [{ palabras: ['de', 'datos'], token: 'database', texto: 'base de datos' }],
    por: [{ palabras: ['defecto'], token: 'default', texto: 'por defecto' }],
    clave: [{ palabras: ['primaria'], token: 'primary', mas: 'key', texto: 'clave primaria' },
      { palabras: ['foranea'], token: 'foreign', mas: 'key', texto: 'clave foránea' }]
  };

  /* Las palabras de sintaxis se comparan sin tildes, así que «SEGUN» y
     «SEGÚN» son la misma. La ñ no se toca: solo aparece en nombres de
     columna, y «año» no puede volverse «ano». */
  const sinTildes = s => s.replace(/[áà]/g, 'a').replace(/[éè]/g, 'e')
    .replace(/[íì]/g, 'i').replace(/[óò]/g, 'o').replace(/[úùü]/g, 'u');

  /* Los tipos en español se pasan al nombre interno al declarar la columna,
     antes de la afinidad y antes de exportar: así el volcado sigue siendo SQL
     que SQLite entiende. No traen validaciones nuevas — FECHA no hace
     aritmética de fechas, es un TEXT con otro nombre. */
  const TIPOS = {
    entero: 'INTEGER', entero_corto: 'SMALLINT', entero_largo: 'BIGINT',
    real: 'REAL', flotante: 'FLOAT', doble: 'DOUBLE',
    numerico: 'NUMERIC', decimal: 'DECIMAL',
    texto: 'TEXT', texto_largo: 'CLOB', binario: 'BLOB',
    caracter: 'CHAR', cadena: 'VARCHAR',
    logico: 'BOOLEAN',
    fecha: 'DATE', hora: 'TIME', fecha_hora: 'DATETIME', marca_tiempo: 'TIMESTAMP'
  };

  /* Las de agregación (CONTAR, SUMAR, PROMEDIO, MINIMO, MAXIMO) son palabras
     reservadas y están en SINONIMOS; estas otras se reconocen por el nombre
     al llamarlas, así que se traducen acá. */
  const FUNCIONES_ESP = {
    mayusculas: 'upper', minusculas: 'lower', longitud: 'length',
    recortar: 'trim', redondear: 'round', absoluto: 'abs',
    subcadena: 'substr', primero_no_nulo: 'coalesce', si_nulo: 'ifnull'
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
    return { palabra: sinTildes(src.slice(j, k).toLowerCase()), fin: k };
  }

  /* ¿La palabra que se acaba de leer empieza una de las frases de FRASES? Se
     mira sin consumir nada: si no completa, la palabra sigue su camino sola
     («por» a secas es BY, «por defecto» es DEFAULT). */
  function buscarFrase(src, desde, primera) {
    const opciones = FRASES[primera];
    if (!opciones) return null;
    for (const op of opciones) {
      let fin = desde, sirve = true;
      for (const p of op.palabras) {
        const sig = siguientePalabra(src, fin);
        if (sig.palabra !== p) { sirve = false; break; }
        fin = sig.fin;
      }
      if (sirve) return { fin, token: op.token, mas: op.mas, texto: op.texto };
    }
    return null;
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
        const b = sinTildes(s.toLowerCase());
        /* "base de datos" o "clave primaria", en palabras sueltas: se juntan
           acá para que el resto del motor vea el token que le corresponde,
           igual que si se hubiera escrito en inglés de una sola palabra. */
        const fr = buscarFrase(src, i, b);
        if (fr) {
          i = fr.fin;
          t.push({ k: fr.token, v: fr.texto });
          if (fr.mas) t.push({ k: fr.mas, v: fr.texto });
          continue;
        }
        if (CONTEXTUALES.has(b)) { t.push({ k: 'id', v: s, esp: b }); continue; }
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

    /* «y» y «o» llegan como identificadores (ver CONTEXTUALES). Acá se las
       lee como operador, que es lo único que pueden ser en este lugar de la
       gramática: en lugar de operando el parser nunca las mira, así que
       «ORDENAR POR y» ordena por la columna y. Un nombre entre corchetes o
       acentos graves no lleva `esp`, así que [y] siempre es la columna. */
    esEsp(w) { const k = this.tk(); return k.k === 'id' && k.esp === w; }
    comeEsp(w) { return this.esEsp(w) ? (this.sig(), true) : false; }

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
      this.exige('table', 'la palabra TABLA (TABLE)');
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
          this.exige('key', 'la palabra CLAVE (KEY)');
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
          const escrito = this.sig().v;
          c.tipo = TIPOS[sinTildes(escrito.toLowerCase())] || escrito.toUpperCase();
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
      this.exige('references', 'la palabra REFERENCIA (REFERENCES)');
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
      this.exige('table', 'la palabra TABLA (TABLE)');
      const siExiste = this.come('if') ? (this.exige('exists'), true) : false;
      return { t: 'drop', nombre: this.nombre('el nombre de la tabla'), siExiste };
    }

    insertar() {
      this.exige('insert');
      this.exige('into', 'la palabra DENTRO (INTO)');
      const tabla = this.nombre('el nombre de la tabla');
      let columnas = null;
      if (this.come('(')) {
        columnas = [];
        do { columnas.push(this.nombre('el nombre de una columna')); } while (this.come(','));
        this.exige(')');
      }
      this.exige('values', 'la palabra VALORES (VALUES)');
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
      /* Una tabla derivada: «DE (SELECCIONAR …) COMO x». El alias no es
         opcional acá, porque el resultado no tiene nombre propio y sin alias
         no habría cómo escribir sus columnas. */
      if (this.es('(') && this.tk(1).k === 'select') {
        this.sig();
        const q = this.seleccionar();
        this.exige(')');
        this.come('as');
        const alias = this.nombre('el alias de la tabla derivada');
        return { sub: q, alias };
      }
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
          /* INTERIOR (INNER) es opcional y puede venir solo: hasta acá se lo
             consumía únicamente después de IZQUIERDA, así que un «INTERIOR
             UNIR» suelto dejaba la palabra sin comer y la consulta se cortaba
             ahí, sin decir por qué. */
          const interior = this.come('inner');
          if (!this.come('join')) {
            if (izq || interior)
              err(`después de ${izq ? 'IZQUIERDA (LEFT)' : 'INTERIOR (INNER)'} se esperaba UNIR (JOIN)`);
            break;
          }
          const f = this.fuente();
          this.exige('on', 'la palabra SEGUN (ON) con la condición del UNIR');
          q.joins.push({ fuente: f, on: this.expr(), izq });
        }
      }
      if (this.come('where')) q.where = this.expr();
      if (this.come('group')) {
        this.exige('by', 'la palabra POR (BY)');
        q.group = [];
        do { q.group.push(this.expr()); } while (this.come(','));
      }
      if (this.come('having')) q.having = this.expr();
      if (this.come('order')) {
        this.exige('by', 'la palabra POR (BY)');
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
      this.exige('set', 'la palabra CONJUNTO (SET)');
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
      this.exige('from', 'la palabra DE (FROM)');
      const tabla = this.nombre('el nombre de la tabla');
      const where = this.come('where') ? this.expr() : null;
      return { t: 'delete', tabla, where };
    }

    /* ------------------------ expresiones ------------------------ */
    expr() { return this.nOr(); }
    nOr() {
      let n = this.nAnd();
      while (this.come('or') || this.comeEsp('o')) n = { t: 'bin', op: 'or', i: n, d: this.nAnd() };
      return n;
    }
    nAnd() {
      let n = this.nNot();
      while (this.come('and') || this.comeEsp('y')) n = { t: 'bin', op: 'and', i: n, d: this.nNot() };
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
          this.exige('null', 'la palabra NULO (NULL)');
          n = { t: 'esNulo', e: n, neg };
          continue;
        }
        /* «NO EN», «NO ENTRE», «NO COMO_PATRON»: el NO va en el medio, no
           adelante, así que nNot() no lo ve. Hasta acá no se podía escribir
           ninguno de los tres. */
        let neg = false;
        if (this.es('not') && ['in', 'between', 'like'].includes(this.tk(1).k)) {
          this.sig();
          neg = true;
        }
        const negar = x => (neg ? { t: 'un', op: 'not', e: x } : x);

        if (this.come('like')) { n = negar({ t: 'bin', op: 'like', i: n, d: this.nAdit() }); continue; }
        if (this.come('between')) {
          const a = this.nAdit();
          if (!this.come('and') && !this.comeEsp('y')) this.exige('and', 'la palabra Y (AND)');
          n = negar({ t: 'entre', e: n, a, b: this.nAdit() });
          continue;
        }
        if (this.come('in')) {
          this.exige('(', '"(" con la lista de valores');
          if (this.es('select')) {
            const q = this.seleccionar();
            this.exige(')');
            n = negar({ t: 'enSub', e: n, q });
            continue;
          }
          const items = [];
          do { items.push(this.expr()); } while (this.come(','));
          this.exige(')');
          n = negar({ t: 'en', e: n, items });
          continue;
        }
        if (neg) err('después de NO (NOT) se esperaba EN, ENTRE o COMO_PATRON');
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
      /* EXISTE (consulta): no mira ningún valor, solo si la consulta de
         adentro trae al menos una fila. */
      if (this.es('exists') && this.tk(1).k === '(') {
        this.sig(); this.sig();
        const q = this.seleccionar();
        this.exige(')');
        return { t: 'existe', q };
      }
      if (this.es('(')) {
        /* Un paréntesis puede abrir una expresión o una consulta entera: una
           subconsulta escalar vale donde vale un valor. */
        if (this.tk(1).k === 'select') {
          this.sig();
          const q = this.seleccionar();
          this.exige(')');
          return { t: 'sub', q };
        }
        this.sig();
        const e = this.expr();
        this.exige(')');
        return e;
      }
      /* Las funciones de agregación son palabras reservadas, pero solo cuando
         viene el paréntesis: si no, una columna llamada «promedio» o «max»
         dejaría de poder nombrarse. */
      if (['count', 'sum', 'avg', 'min', 'max'].includes(this.k) && this.tk(1).k === '(') {
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
          const baja = sinTildes(n1.toLowerCase());
          return { t: 'fn', nombre: FUNCIONES_ESP[baja] || baja, args };
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
      case 'sub': return subEscalar(e.q, fila, ctx);
      case 'existe': return correrSub(e.q, fila, ctx).filas.length > 0;
      case 'enSub': return enSub(e, fila, ctx);
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
    /* Acá adentro no está: puede ser una columna de la consulta de afuera. Eso
       es exactamente lo que vuelve «correlacionada» a una subconsulta.

       Con una excepción: si el alias que se nombró existe acá adentro pero no
       tiene esa columna, es un error y no una invitación a buscar el mismo
       alias afuera. Si no, «a.zzz» mal escrito se resolvería en silencio con
       el «a» de la consulta de arriba. */
    if (ctx && ctx.afuera) {
      const al = (e.tabla || '').toLowerCase();
      const aquiEstaElAlias = al
        && (ctx.columnas || []).some(k => k.toLowerCase().startsWith(al + '.'));
      if (!aquiEstaElAlias) return leerCol(e, ctx.afuera.fila, ctx.afuera.ctx);
    }
    err(`no existe la columna "${e.tabla ? e.tabla + '.' : ''}${e.nombre}"`,
      ctx && ctx.columnas && ctx.columnas.length
        ? 'Las que hay son: ' + ctx.columnas.join(', ') + '.' : '');
  }

  /* ------------------------------------------------------------------ */
  /* Subconsultas                                                         */
  /* ------------------------------------------------------------------ */
  /* Una subconsulta se corre con la fila de afuera a la vista: eso es lo que
     la vuelve correlacionada. El presupuesto NO se reinicia —lo comparten
     todas— o anidar sería la forma de esquivarlo. */
  const HONDO = 32;

  function correrSub(q, fila, ctx) {
    if (!ctx || !ctx.base) err('una subconsulta no se puede usar acá');
    const hondo = (ctx.hondo || 0) + 1;
    if (hondo > HONDO)
      err(`la consulta supera los ${HONDO} niveles de anidamiento`,
        'Dividila en consultas más simples: a esta altura ya no la lee nadie.');
    gastar(1);
    return seleccionar(ctx.base, q, { fila, ctx }, hondo);
  }

  function unaSolaColumna(r, donde) {
    if (r.columnas.length !== 1)
      err(`la subconsulta trae ${r.columnas.length} columnas y ${donde}`,
        'Dejá una sola columna en el SELECCIONAR de adentro.');
  }

  function subEscalar(q, fila, ctx) {
    const r = correrSub(q, fila, ctx);
    unaSolaColumna(r, 'acá se espera un solo valor');
    /* Sin filas, el valor es NULO: «no se sabe» es exactamente lo que pasó. */
    if (!r.filas.length) return null;
    if (r.filas.length > 1)
      err(`la subconsulta trajo ${r.filas.length} filas y acá se espera un solo valor`,
        'Agregá un filtro, o usá un agregado como MINIMO() o MAXIMO(). Quedarse con la '
        + 'primera fila sería inventar una respuesta: las filas de una tabla no tienen orden.');
    return r.filas[0][0];
  }

  function enSub(e, fila, ctx) {
    const r = correrSub(e.q, fila, ctx);
    unaSolaColumna(r, 'con EN (IN) tiene que traer una sola');
    /* Contra un resultado vacío la respuesta es falso, aunque la izquierda sea
       nula: no hay nada con qué comparar, así que no hay nada que no se sepa. */
    if (!r.filas.length) return false;
    const v = evaluar(e.e, fila, ctx);
    gastar(r.filas.length);
    let hayNulo = false;
    for (const f of r.filas) {
      const w = f[0];
      if (esNulo(w)) { hayNulo = true; continue; }
      if (!esNulo(v) && comparar(v, w) === 0) return true;
    }
    /* Ni la izquierda nula ni un nulo adentro dan falso: dan «no se sabe», y
       por eso NO EN contra una columna con nulos no devuelve nada. */
    if (esNulo(v) || hayNulo) return null;
    return false;
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
          'Las que hay son: CONTAR, SUMAR, PROMEDIO, MINIMO, MAXIMO, MAYUSCULAS, MINUSCULAS, '
          + 'LONGITUD, RECORTAR, REDONDEAR, ABSOLUTO, SUBCADENA, PRIMERO_NO_NULO y SI_NULO — '
          + 'o su forma en inglés: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, TRIM, '
          + 'ROUND, ABS, SUBSTR, COALESCE e IFNULL.');
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
        'Las que hay son: CONTAR, SUMAR, PROMEDIO, MINIMO, MAXIMO, MAYUSCULAS, MINUSCULAS, '
        + 'LONGITUD, RECORTAR, REDONDEAR, ABSOLUTO, SUBCADENA, PRIMERO_NO_NULO y SI_NULO — '
        + 'o su forma en inglés: COUNT, SUM, AVG, MIN, MAX, UPPER, LOWER, LENGTH, TRIM, '
        + 'ROUND, ABS, SUBSTR, COALESCE e IFNULL.');
    for (const k of Object.keys(e)) {
      if (k === 't' || k === 'tabla' || k === 'nombre' || k === 'op' || k === 'f') continue;
      /* Una subconsulta tiene sus propias columnas: revisarla con las de acá
         rechazaría las suyas y aceptaría las que no puede ver. Se revisa sola
         cuando se la corre. */
      if (k === 'q') continue;
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
  /* `alAnalizar` recibe cada sentencia ya analizada, antes de correrla. Lo usa
     el corrector del curso: cuando el ejercicio pide practicar una
     construcción —un EXISTE correlacionado, por ejemplo— hay que mirar lo que
     el alumno escribió de verdad, y buscar la palabra con una expresión
     regular encontraría también la que está adentro de un comentario. */
  function ejecutar(base, texto, alAnalizar) {
    if (String(texto).length > TOPES.textoSQL)
      throw new SQLLimite('la instrucción es demasiado larga',
        `El tope es ${Math.round(TOPES.textoSQL / 1024)} KB de texto en una sola instrucción.`);
    const p = new P(tokenizar(texto));
    const salidas = [];
    for (;;) {
      while (p.come(';')) { /* varias instrucciones seguidas */ }
      if (p.es('fin')) break;
      const s = p.sentencia();
      if (alAnalizar) alAnalizar(s);
      /* Un presupuesto nuevo por sentencia, no por texto: dos consultas
         escritas una abajo de la otra son dos trabajos, no uno. */
      const anterior = gasto;
      gasto = { topes: TOPES, trabajo: 0, desdeReloj: 0, hasta: Date.now() + TOPES.milisegundos };
      try { salidas.push(correr(base, s)); }
      finally { gasto = anterior; }
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
      /* La columna a la que apunta es siempre clave primaria o UNIQUE —se
         controla al crear la tabla—, así que tiene índice y la búsqueda no
         recorre la otra tabla. */
      const mapa = indices(otra).get(c.refiere.columna.toLowerCase());
      let hay;
      if (mapa) hay = mapa.has(claveDe(fila[c.nombre]));
      else {
        gastar(otra.filas.length);
        hay = otra.filas.some(f => comparar(f[c.refiere.columna], fila[c.nombre]) === 0);
      }
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

    /* Las filas se arman y se revisan enteras antes de tocar la tabla. Antes
       se empujaban de a una: si la tercera fallaba, las dos primeras quedaban
       adentro y la instrucción había hecho la mitad de lo que decía. */
    const nuevas = [];
    for (const valores of s.filas) {
      gastar(1);
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
      }
      nuevas.push(fila);
    }

    tope(t.filas.length + nuevas.length, 'filasPorTabla',
      `la tabla "${t.nombre}" quedaría con ${t.filas.length + nuevas.length} filas`);
    tope(cuantasFilas(base) + nuevas.length, 'filasEnTotal',
      'la base quedaría con más filas de las que entran en una pestaña');

    /* Las claves se anotan en el índice a medida que se revisan, así que una
       fila repetida dentro del mismo INSERTAR choca contra la anterior: antes
       cada una se comparaba contra la tabla y no contra las otras, y las dos
       pasaban. Si algo falla en el medio, lo anotado se saca: la tabla no se
       tocó todavía, y un índice con filas que no existen miente. */
    const ix = indices(t);
    const puestas = [];
    try {
      for (const fila of nuevas) {
        for (const c of t.columnas) {
          if (!c.pk && !c.unico) continue;
          const v = fila[c.nombre];
          if (esNulo(v)) continue;
          const mapa = ix.get(c.nombre.toLowerCase());
          const k = claveDe(v);
          if (mapa.has(k)) err(`ya hay una fila con ${c.nombre} = ${textoDe(v)}`,
            c.pk ? 'La clave primaria no se puede repetir.' : 'La columna está declarada UNIQUE.');
          mapa.add(k);
          puestas.push([mapa, k]);
        }
        controlarRefs(base, t, fila);
      }
    } catch (e) {
      for (const [mapa, k] of puestas) mapa.delete(k);
      throw e;
    }

    for (const fila of nuevas) t.filas.push(fila);
    const n = nuevas.length;
    return { tipo: 'insert', afectadas: n, mensaje: `${n} fila(s) agregada(s) a ${t.nombre}` };
  }

  function cuantasFilas(base) {
    let n = 0;
    for (const t of base.tablas.values()) n += t.filas.length;
    return n;
  }

  /* Que no se repita ninguna clave primaria ni ninguna columna UNIQUE, sobre
     el conjunto de filas con el que va a quedar la tabla. */
  function controlarClaves(t, filas) {
    for (const c of t.columnas) {
      if (!c.pk && !c.unico) continue;
      gastar(filas.length);
      const vistos = new Set();
      for (const f of filas) {
        const v = f[c.nombre];
        if (esNulo(v)) continue;
        const k = claveDe(v);
        if (vistos.has(k)) err(`ya hay una fila con ${c.nombre} = ${textoDe(v)}`,
          c.pk ? 'La clave primaria no se puede repetir.' : 'La columna está declarada UNIQUE.');
        vistos.add(k);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Índices de las columnas clave                                        */
  /* ------------------------------------------------------------------ */
  /* Existen por una sola razón: sin ellos, comprobar que una clave primaria no
     se repite recorre la tabla entera. Un programa que carga cien mil filas de
     a una —que es como se carga una base de verdad— hace diez mil millones de
     comparaciones y no termina nunca. Con el índice, cada fila cuesta lo
     mismo, sea la primera o la cien mil.

     Se pueden mantener sin miedo porque el motor es el único que escribe:
     el editor visual de tablas y la importación de un .sql pasan los dos por
     ejecutar(). INSERTAR los actualiza fila por fila; ACTUALIZAR y BORRAR los
     tiran, porque los dos ya recorren la tabla entera de todas formas y un
     índice desactualizado miente, que es peor que no tenerlo.

     Es la misma clave que usa comparar() para la igualdad: un número y un
     texto nunca son iguales, así que el tipo entra en la clave. */
  const claveDe = v => typeof v + '|' + textoDe(v);

  function indices(t) {
    if (t.indices) return t.indices;
    t.indices = new Map();
    for (const c of t.columnas) {
      if (!c.pk && !c.unico) continue;
      gastar(t.filas.length);
      const mapa = new Set();
      for (const f of t.filas) {
        const v = f[c.nombre];
        if (!esNulo(v)) mapa.add(claveDe(v));
      }
      t.indices.set(c.nombre.toLowerCase(), mapa);
    }
    return t.indices;
  }

  const tirarIndices = t => { t.indices = null; };

  /* Arma las filas «anchas» del FROM y los JOIN: cada clave es
     «alias.columna» en minúsculas, más «columna» sola para poder escribirla
     sin prefijo cuando no hay ambigüedad. */
  function filasDe(base, q, afuera, hondo) {
    /* Cada fuente puede ser una tabla o una consulta entera («tabla
       derivada»). Las dos terminan igual: una lista de nombres de columna y
       una lista de filas anchas. */
    const deLaFuente = f => {
      if (f.sub) {
        /* Una tabla derivada se resuelve sola, sin ver las fuentes de al lado
           ni la fila de afuera: eso sería LATERAL, que este motor no tiene. */
        const r = seleccionar(base, f.sub, afuera, hondo || 0);
        const nombres = r.columnas.map(c => f.alias + '.' + c);
        const filas = r.filas.map(v => {
          const o = {};
          r.columnas.forEach((c, i) => { o[f.alias.toLowerCase() + '.' + c.toLowerCase()] = v[i]; });
          return o;
        });
        return { nombres, filas, vacia: nombresVacios(nombres) };
      }
      const t = tabla(base, f.tabla);
      const nombres = t.columnas.map(c => f.alias + '.' + c.nombre);
      const filas = t.filas.map(fila => {
        const o = {};
        for (const c of t.columnas) o[f.alias.toLowerCase() + '.' + c.nombre.toLowerCase()] = fila[c.nombre];
        return o;
      });
      return { nombres, filas, vacia: nombresVacios(nombres) };
    };

    const fuentes = [q.de].concat(q.joins.map(j => j.fuente)).filter(Boolean);
    if (!q.de) return { filas: [{}], columnas: [] };

    const resueltas = fuentes.map(deLaFuente);
    const columnas = [];
    for (const r of resueltas) for (const n of r.nombres) columnas.push(n);

    const ctxJ = { base, columnas, afuera, hondo: hondo || 0 };
    let filas = resueltas[0].filas;
    for (let ji = 0; ji < q.joins.length; ji++) {
      const j = q.joins[ji];
      const der = resueltas[ji + 1].filas;
      const vacia = resueltas[ji + 1].vacia;

      const pares = igualdadesCruzadas(j.on, j.fuente.alias);
      const cubos = pares.length ? agrupar(der, pares.map(p => p[1]), ctxJ) : null;

      const nuevas = [];
      for (const a of filas) {
        gastar(1);
        /* Con una igualdad en el SEGUN se va derecho a las filas que pueden
           emparejar; sin ella no queda otra que mirarlas todas. */
        let candidatas;
        if (cubos) {
          const k = clavePara(a, pares.map(p => p[0]), ctxJ);
          candidatas = k === null ? [] : (cubos.get(k) || []);
        } else {
          candidatas = der;
        }
        gastar(candidatas.length);
        let hubo = false;
        for (const b of candidatas) {
          const fila = Object.assign({}, a, b);
          /* La condición entera, no solo las igualdades: el SEGUN puede traer
             algo más («… Y p.fecha > c.alta») y ese resto se mira acá. */
          if (verdad(evaluar(j.on, fila, ctxJ)) === true) { nuevas.push(fila); hubo = true; }
        }
        /* LEFT JOIN: la fila de la izquierda sale igual, con nulos. */
        if (!hubo && j.izq) nuevas.push(Object.assign({}, a, vacia));
      }
      filas = nuevas;
    }
    return { filas, columnas };
  }

  /* La fila «no hay pareja» de un IZQUIERDA UNIR: todas las columnas de esa
     fuente en nulo. */
  function nombresVacios(nombres) {
    const o = {};
    for (const n of nombres) o[n.toLowerCase()] = null;
    return o;
  }

  /* De la condición de un UNIR, las igualdades «columna de acá = columna de la
     tabla que se está sumando», unidas por Y. Son las que dejan agrupar por
     clave en vez de comparar cada fila con todas: de N×M a N+M.

     Devuelve [[expresión de la izquierda, expresión de la derecha], …]. Una
     igualdad entre dos columnas del mismo lado no sirve para agrupar y se
     deja para la evaluación de siempre. */
  function igualdadesCruzadas(e, alias) {
    const del = (alias || '').toLowerCase();
    const esDeLaDerecha = c => c && c.t === 'col' && (c.tabla || '').toLowerCase() === del;
    const out = [];
    const juntar = x => {
      if (!x || x.t !== 'bin') return;
      if (x.op === 'and') { juntar(x.i); juntar(x.d); return; }
      if (x.op !== '=') return;
      if (esDeLaDerecha(x.d) && x.i && x.i.t === 'col' && !esDeLaDerecha(x.i)) out.push([x.i, x.d]);
      else if (esDeLaDerecha(x.i) && x.d && x.d.t === 'col' && !esDeLaDerecha(x.d)) out.push([x.d, x.i]);
    };
    juntar(e);
    return out;
  }

  /* La clave de una fila para esas columnas, o null si alguna es nula: en SQL
     un NULL no empareja con nada, ni siquiera con otro NULL. */
  function clavePara(fila, cols, ctx) {
    const partes = [];
    for (const c of cols) {
      const v = evaluar(c, fila, ctx);
      if (esNulo(v)) return null;
      partes.push(claveDe(v));
    }
    return partes.join(SEPARADOR);
  }

  function agrupar(filas, cols, ctx) {
    const m = new Map();
    gastar(filas.length * cols.length);
    for (const f of filas) {
      const k = clavePara(f, cols, ctx);
      if (k === null) continue;
      /* Una lista por clave, no una fila: si dos filas tienen la misma, las
         dos emparejan y las dos tienen que salir. */
      const cubo = m.get(k);
      if (cubo) cubo.push(f); else m.set(k, [f]);
    }
    return m;
  }

  /* Junta todas las funciones de agregación que aparecen en la consulta. */
  function buscarAgregados(e, out) {
    if (!e || typeof e !== 'object') return out;
    if (e.t === 'agr') { out.push(e); return out; }
    /* Los agregados de adentro de una subconsulta son de esa consulta, no de
       esta: si se los juntara acá, un SUMAR() de adentro se calcularía sobre
       las filas de afuera. */
    if (e.t === 'sub' || e.t === 'existe' || e.t === 'enSub') {
      if (e.e) buscarAgregados(e.e, out);       // «x EN (SELECCIONAR …)»: la x sí es de acá
      return out;
    }
    for (const k of Object.keys(e)) {
      const v = e[k];
      if (Array.isArray(v)) v.forEach(x => buscarAgregados(x, out));
      else if (v && typeof v === 'object') buscarAgregados(v, out);
    }
    return out;
  }

  function calcularAgregados(agrs, filas, ctx) {
    const m = new Map();
    gastar(agrs.length * filas.length);
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

  function seleccionar(base, q, afuera, hondo) {
    const { filas, columnas } = filasDe(base, q, afuera, hondo);
    const ctx = { base, columnas, afuera, hondo: hondo || 0 };
    /* validar() es un control previo, para que una columna mal escrita se
       avise aunque la tabla esté vacía. Adentro de una subconsulta también
       valen las columnas de afuera; cuál gana cuando el nombre está en las dos
       lo decide leerCol(), que es quien resuelve de verdad. */
    const visibles = afuera ? columnas.concat(afuera.ctx.columnas || []) : columnas;

    gastar(filas.length);
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
    for (const c of salida) validar(c.e, visibles);
    if (q.where) validar(q.where, visibles);
    if (q.having) validar(q.having, visibles);
    /* En el ORDER BY también vale el nombre que la propia consulta le puso a
       una columna —«... COUNT(*) AS cuantos  ORDER BY cuantos»—, como en
       SQLite, MySQL y PostgreSQL. Ese nombre no es una columna de ninguna
       tabla, así que validar() lo rechazaría; ordenar por él ya lo sabe
       resolver valorOrden(). */
    const aliasSalida = e => e.t === 'col' && !e.tabla
      && salida.some(c => c.nombre.toLowerCase() === e.nombre.toLowerCase());
    for (const o of q.order) if (!aliasSalida(o.e)) validar(o.e, visibles);
    for (const g of q.group || []) validar(g, visibles);

    const agrs = buscarAgregados({
      cols: salida.map(s => s.e), having: q.having, order: q.order.map(o => o.e)
    }, []);
    let resultado = [];

    if (q.group || agrs.length) {
      /* Con GROUP BY se arma un grupo por combinación de valores; sin él,
         toda la tabla es un grupo solo. */
      const grupos = new Map();
      if (q.group) {
        gastar(vivas.length * q.group.length);
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
        const ctxG = { base, columnas, afuera, hondo: hondo || 0, agregados: calcularAgregados(agrs, gf, ctx) };
        const rep = gf[0] || {};
        if (q.having && verdad(evaluar(q.having, rep, ctxG)) !== true) continue;
        resultado.push({ v: salida.map(c => evaluar(c.e, rep, ctxG)), origen: rep, ctx: ctxG });
      }
      /* Sin GROUP BY y sin filas, COUNT(*) igual tiene que dar 0. */
      if (!q.group && !vivas.length && agrs.length && !resultado.length) {
        const ctxG = { base, columnas, afuera, hondo: hondo || 0, agregados: calcularAgregados(agrs, [], ctx) };
        resultado.push({ v: salida.map(c => evaluar(c.e, {}, ctxG)), origen: {}, ctx: ctxG });
      }
    } else {
      gastar(vivas.length * salida.length);
      for (const f of vivas) {
        resultado.push({ v: salida.map(c => evaluar(c.e, f, ctx)), origen: f, ctx });
      }
    }

    /* El tope se mira sobre el resultado entero, antes del LIMITE: una
       consulta que arma un millón de filas ya gastó la memoria aunque después
       se pidan diez. */
    tope(resultado.length, 'filasDeResultado',
      `la consulta armó ${resultado.length} filas`);

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
      /* Ordenar es n·log n comparaciones y cada una evalúa las expresiones del
         ORDENAR POR: con medio millón de filas es lo más caro de la consulta. */
      gastar(resultado.length * Math.max(1, Math.ceil(Math.log2(resultado.length + 2))));
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
    const ctx = { base, columnas: t.columnas.map(c => t.nombre + '.' + c.nombre) };
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

    /* Se calcula cómo va a quedar la tabla entera y recién después se publica.
       Antes cada fila se modificaba en el lugar, así que un error en la mitad
       dejaba media tabla cambiada y media no. */
    const finales = [], tocadas = [];
    for (const f of t.filas) {
      gastar(1);
      const a = ancha(f);
      if (s.where && verdad(evaluar(s.where, a, ctx)) !== true) { finales.push(f); continue; }
      const nueva = Object.assign({}, f);
      s.sets.forEach((set, i) => {
        const c = destinos[i];
        const v = convertir(evaluar(set.e, a, ctx), c.tipo);
        if (c.noNulo && esNulo(v)) err(`la columna "${c.nombre}" no admite NULL`);
        nueva[c.nombre] = v;
      });
      finales.push(nueva);
      tocadas.push(nueva);
    }

    /* Las claves también se controlan acá: hasta ahora un ACTUALIZAR podía
       dejar dos filas con la misma clave primaria, que es justo lo que la
       clave primaria promete que no pasa. */
    controlarClaves(t, finales);
    for (const nueva of tocadas) controlarRefs(base, t, nueva);

    t.filas = finales;
    tirarIndices(t);
    const n = tocadas.length;
    return { tipo: 'update', afectadas: n, mensaje: `${n} fila(s) modificada(s) en ${t.nombre}` };
  }

  function eliminar(base, s) {
    const t = tabla(base, s.tabla);
    const ctx = { base, columnas: t.columnas.map(c => t.nombre + '.' + c.nombre) };
    const ancha = f => {
      const o = {};
      for (const c of t.columnas) o[t.nombre.toLowerCase() + '.' + c.nombre.toLowerCase()] = f[c.nombre];
      return o;
    };
    if (s.where) validar(s.where, ctx.columnas);
    const antes = t.filas.length;
    gastar(antes);
    t.filas = t.filas.filter(f => (s.where ? verdad(evaluar(s.where, ancha(f), ctx)) !== true : false));
    tirarIndices(t);
    const n = antes - t.filas.length;
    return { tipo: 'delete', afectadas: n, mensaje: `${n} fila(s) borrada(s) de ${t.nombre}` };
  }

  global.SQL = { crear, ejecutar, tablas, SQLError, SQLLimite, TOPES, textoDe, comparar, tokenizar, afinidad };
})(typeof window !== 'undefined' ? window : globalThis);

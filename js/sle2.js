/*
 * SLE2 en JavaScript — lexer, parser e intérprete del lenguaje SL (SLE2)
 * Basado en:
 *   · "Introducción al lenguaje SL", Juan Segovia Silvero, CNC - UNA (1999)
 *   · "Índice de subrutinas y funciones predefinidas de SL", J. Segovia (2004)
 *
 * API:  const prog = SLE2.compilar(fuente)      -> AST (lanza SLE2.SLError)
 *       await SLE2.ejecutar(fuente, io, opts)   -> corre el programa
 *       SLE2.revisar(fuente)                    -> avisos y recomendaciones
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Errores                                                             */
  /* ------------------------------------------------------------------ */
  class SLError extends Error {
    constructor(msg, linea, fase, sugerencia) {
      super(msg);
      this.linea = linea || 0;
      this.fase = fase || 'ejecucion';
      this.sugerencia = sugerencia || '';
    }
    toString() {
      const f = this.fase === 'compilacion' ? 'Error de compilación' : 'Error de ejecución';
      return this.linea ? `${f} [línea ${this.linea}]: ${this.message}` : `${f}: ${this.message}`;
    }
  }
  const errC = (m, l, s) => { throw new SLError(m, l, 'compilacion', s); };
  const errE = (m, l, s) => { throw new SLError(m, l, 'ejecucion', s); };

  /* Distancia de edición, para sugerir el identificador que quiso escribirse. */
  function distancia(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return Math.max(m, n);
    let fila = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      let ant = fila[0];
      fila[0] = i;
      for (let j = 1; j <= n; j++) {
        const tmp = fila[j];
        fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, ant + (a[i - 1] === b[j - 1] ? 0 : 1));
        ant = tmp;
      }
    }
    return fila[n];
  }

  function parecido(nombre, candidatos) {
    let mejor = null, mejorD = Infinity;
    for (const c of candidatos) {
      const d = distancia(nombre.toLowerCase(), String(c).toLowerCase());
      if (d < mejorD) { mejorD = d; mejor = c; }
    }
    return mejorD <= Math.max(2, Math.floor(nombre.length / 3)) ? mejor : null;
  }

  /* ------------------------------------------------------------------ */
  /* Analizador léxico                                                   */
  /* ------------------------------------------------------------------ */
  const RESERVADAS = new Set([
    'and', 'archivo', 'caso', 'const', 'constantes', 'desde', 'eval', 'fin',
    'hasta', 'inicio', 'lib', 'libext', 'matriz', 'mientras', 'not', 'or',
    'paso', 'sub', 'subrutina', 'programa', 'ref', 'registro', 'repetir',
    'retorna', 'si', 'sino', 'tipos', 'var', 'variables', 'vector'
  ]);

  // Comillas rectas y tipográficas: el material de SL usa ambas.
  const ABRE_CAD = { '"': '"”', "'": "'’", '“': '"”', '‘': "'’" };

  function tokenizar(src, extras, opciones) {
    const reservadas = extras ? new Set([...RESERVADAS, ...extras]) : RESERVADAS;
    /* cadenasLargas: deja que una cadena pase de línea. Lo usa ESLE2 BD, donde
       el texto que va entre comillas es una consulta SQL de varios renglones. */
    const cadenasLargas = !!(opciones && opciones.cadenasLargas);
    const toks = [];
    let i = 0, linea = 1;
    const letra = c => /[A-Za-z_ñÑ]/.test(c);
    const digito = c => c >= '0' && c <= '9';
    const push = (tipo, valor) => toks.push({ tipo, valor, linea });

    while (i < src.length) {
      const c = src[i];
      if (c === '\n') { linea++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

      // comentarios
      if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        const ini = linea; i += 2;
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') linea++; i++; }
        if (i >= src.length) errC('comentario /* sin cerrar', ini, 'Falta la secuencia */ que cierra el comentario.');
        i += 2; continue;
      }

      // números
      if (digito(c) || (c === '.' && digito(src[i + 1]))) {
        let j = i;
        while (j < src.length && digito(src[j])) j++;
        if (src[j] === '.' && digito(src[j + 1])) { j++; while (j < src.length && digito(src[j])) j++; }
        if ((src[j] === 'e' || src[j] === 'E') &&
            (digito(src[j + 1]) || ((src[j + 1] === '+' || src[j + 1] === '-') && digito(src[j + 2])))) {
          j += 2; while (j < src.length && digito(src[j])) j++;
        }
        push('num', parseFloat(src.slice(i, j)));
        i = j; continue;
      }

      // identificadores / palabras reservadas
      if (letra(c)) {
        let j = i;
        while (j < src.length && (letra(src[j]) || digito(src[j]))) j++;
        const pal = src.slice(i, j);
        if (pal.length > 32)
          errC(`el identificador "${pal}" supera los 32 caracteres`, linea,
            'En SL un identificador puede tener hasta 32 caracteres. Usá un nombre más corto.');
        // "sub" es el sinónimo moderno de "subrutina"
        push(pal === 'sub' ? 'subrutina' : (reservadas.has(pal) ? pal : 'id'), pal);
        i = j; continue;
      }

      // cadenas
      if (ABRE_CAD[c]) {
        const cierres = ABRE_CAD[c];
        let j = i + 1, out = '';
        while (j < src.length && cierres.indexOf(src[j]) < 0) {
          if (src[j] === '\n') {
            if (!cadenasLargas)
              errC('constante de cadena sin cerrar', linea,
                'Una cadena tiene que empezar y terminar en la misma línea. Para partirla en varias, usá el operador de concatenación: "parte 1" + "parte 2".');
            /* La línea sigue contando: si no, todos los errores de abajo
               quedarían corridos y señalarían el renglón equivocado. */
            linea++;
          }
          if (src[j] === '\\') {
            const e = src[j + 1];
            out += e === 'n' ? '\n' : e === 't' ? '\t' : e === 'r' ? '\r' : (e === undefined ? '' : e);
            j += 2;
          } else { out += src[j]; j++; }
        }
        if (j >= src.length)
          errC('constante de cadena sin cerrar', linea, 'Falta la comilla que cierra el texto.');
        push('cad', out);
        i = j + 1; continue;
      }

      // operadores y signos
      if (src.startsWith('...', i)) { push('...', '...'); i += 3; continue; }
      const dos = src.substr(i, 2);
      // sinónimos al estilo C admitidos por SLE2
      if (dos === '&&') { push('and', 'and'); i += 2; continue; }
      if (dos === '||') { push('or', 'or'); i += 2; continue; }
      if (dos === '!=') { push('<>', '<>'); i += 2; continue; }
      if (['==', '<>', '<=', '>='].includes(dos)) { push(dos, dos); i += 2; continue; }
      if (c === '!') { push('not', 'not'); i++; continue; }
      if ('+-*/%^=<>()[]{},;:.'.includes(c)) { push(c, c); i++; continue; }

      if (/[áéíóúÁÉÍÓÚüÜàèìòùâêîôû]/.test(c))
        errC(`no se puede usar la letra acentuada "${c}" fuera de una cadena`, linea,
          'Los identificadores de SL admiten la ñ pero no las vocales con tilde. Escribí "anio" o "numero" sin tilde. Si el texto es un mensaje, tiene que ir entre comillas.');
      if (c === '&' || c === '|')
        errC(`el operador "${c}" solo, no existe en SL`, linea,
          'SL usa las palabras and, or y not (también admite && y || como sinónimos).');
      errC(`carácter no reconocido: "${c}"`, linea,
        'Revisá si te faltó una comilla o si copiaste un símbolo de otro lenguaje.');
    }
    toks.push({ tipo: 'eof', valor: null, linea });
    return toks;
  }

  /* ------------------------------------------------------------------ */
  /* Analizador sintáctico                                               */
  /* ------------------------------------------------------------------ */
  const FIN_BLOQUE = new Set(['fin', 'sino', 'hasta', 'caso', '}', 'eof']);

  class Parser {
    constructor(toks) { this.t = toks; this.p = 0; }
    tk(k) { return this.t[this.p + (k || 0)]; }
    get tipo() { return this.tk().tipo; }
    get linea() { return this.tk().linea; }
    es(tipo) { return this.tipo === tipo; }
    sig() { return this.t[this.p++]; }
    come(tipo) { if (this.es(tipo)) { return this.sig(); } return null; }
    exige(tipo, que, sug) {
      if (this.es(tipo)) return this.sig();
      const t = this.tk();
      const v = t.valor === null ? 'el fin del archivo' : `"${t.valor}"`;

      // Diagnósticos de los errores más frecuentes.
      if (tipo === ')' && this.es('='))
        errC('apareció "=" dentro de una condición', this.linea,
          'Para comparar se usa "==" (igual que); el "=" solo sirve para asignar. Escribí, por ejemplo, si ( a == b ).');
      if (this.es('sino'))
        errC('la palabra "sino" está fuera de lugar', this.linea,
          'En SL el "sino" va DENTRO de las llaves del si:\n   si ( cond )\n   {\n      ...\n   sino\n      ...\n   }');
      if (t.tipo === 'eof')
        errC(`el programa termina antes de tiempo: falta ${que || '"' + tipo + '"'}`, this.linea,
          'Revisá que cada "inicio" tenga su "fin" y que cada "{" tenga su "}".');
      if (t.tipo === 'id' && RESERVADAS.has(String(t.valor).toLowerCase()))
        errC(`"${t.valor}" no se reconoce como palabra reservada`, this.linea,
          `Las palabras reservadas de SL se escriben siempre en minúsculas: usá "${String(t.valor).toLowerCase()}".`);
      if (tipo === '{' && (t.tipo === 'id' || t.tipo === 'imprimir'))
        errC(`falta "{" antes del cuerpo`, this.linea,
          'En SL el cuerpo de si, mientras, desde y eval va siempre entre llaves { }.');

      errC(`se esperaba ${que || '"' + tipo + '"'} y se encontró ${v}`, this.linea, sug);
    }
    saltaPuntoComa() { while (this.es(';')) this.sig(); }

    /* ---- programa ---- */
    programa() {
      const prog = { nombre: null, consts: [], tipos: [], vars: [], cuerpo: [], subs: [] };
      if (this.come('programa')) prog.nombre = this.exige('id', 'nombre del programa').valor;
      this.secciones(prog);
      this.exige('inicio', 'la palabra "inicio"',
        'El cuerpo del programa va entre "inicio" y "fin". Antes de "inicio" solo pueden aparecer las secciones const, tipos y var.');
      prog.cuerpo = this.sentencias();
      this.exige('fin', 'la palabra "fin"', 'Cada "inicio" necesita su "fin".');
      while (this.es('subrutina')) prog.subs.push(this.subrutina());
      if (!this.es('eof'))
        errC(`texto inesperado después del programa: "${this.tk().valor}"`, this.linea,
          'Después de "fin" solo pueden ir subrutinas. Revisá si te sobra una llave o una palabra "fin".');
      return prog;
    }

    secciones(dest) {
      for (;;) {
        this.saltaPuntoComa();
        if (this.es('const') || this.es('constantes')) { this.sig(); this.declConsts(dest.consts); }
        else if (this.es('tipos')) { this.sig(); this.declTipos(dest.tipos); }
        else if (this.es('var') || this.es('variables')) { this.sig(); this.declVars(dest.vars); }
        else return;
      }
    }

    declConsts(dest) {
      while (this.es('id') && this.tk(1).tipo === '=') {
        const linea = this.linea, nombre = this.sig().valor;
        this.sig(); // =
        dest.push({ nombre, valor: this.expr(), linea });
        this.saltaPuntoComa();
      }
    }

    declTipos(dest) {
      while (this.es('id') && this.tk(1).tipo === ':') {
        const linea = this.linea, nombre = this.sig().valor;
        this.sig(); // :
        dest.push({ nombre, tipo: this.tipoSpec(), linea });
        this.saltaPuntoComa();
      }
    }

    /* Declaración de variables. Admite las tres formas de SLE2:
         n : numerico                       (tipo explícito)
         n = 0                              (tipo inferido del valor inicial)
         v : vector [*] cadena = {"a", "b"} (tipo explícito + valor inicial)   */
    declVars(dest) {
      while (this.es('id')) this.unaDeclaracion(dest);
    }

    unaDeclaracion(dest) {
      {
        const linea = this.linea, nombres = [this.sig().valor];
        while (this.come(',')) nombres.push(this.exige('id', 'nombre de variable').valor);
        let tipo = null, init = null;
        if (this.come(':')) tipo = this.tipoSpec();
        if (this.come('=')) init = this.es('{') ? this.literalEstructurado() : this.expr();
        if (!tipo && !init)
          errC(`falta el tipo o el valor inicial de "${nombres[nombres.length - 1]}"`, linea,
            'Se declara así:  n : numerico   (tipo explícito)\n            o así:  n = 0         (el tipo se deduce del valor inicial)');
        dest.push({ nombres, tipo, init, linea });
        this.saltaPuntoComa();
      }
    }

    tipoSpec() {
      const linea = this.linea;
      if (this.es('vector') || this.es('matriz')) {
        this.sig();
        this.exige('[', '"[" con las dimensiones');
        const dims = [];
        do { dims.push(this.come('*') ? '*' : this.expr()); } while (this.come(','));
        this.exige(']');
        return { k: 'arr', dims, elem: this.tipoSpec(), linea };
      }
      if (this.es('registro')) {
        this.sig();
        this.exige('{', '"{" con los campos del registro');
        const campos = [];
        this.declVars(campos);
        this.exige('}');
        if (!campos.length) errC('un registro debe tener al menos un campo', linea);
        return { k: 'rec', campos, linea };
      }
      const id = this.exige('id', 'un tipo de dato').valor;
      if (id === 'numerico') return { k: 'num', linea };
      if (id === 'cadena') return { k: 'cad', linea };
      if (id === 'logico') return { k: 'log', linea };
      return { k: 'nombre', nombre: id, linea };
    }

    /* Lista de parámetros formales, entre paréntesis. */
    parametros() {
      const linea = this.linea;
      const params = [];
      this.exige('(');
      if (!this.es(')')) {
        for (;;) {
          const porRef = !!this.come('ref');
          const nombres = [this.exige('id', 'nombre de parámetro').valor];
          while (this.es(',') && this.tk(1).tipo === 'id' && (this.tk(2).tipo === ',' || this.tk(2).tipo === ':')) {
            this.sig(); nombres.push(this.sig().valor);
          }
          this.exige(':', '":" seguido del tipo del parámetro');
          const tipo = this.tipoSpec();
          nombres.forEach(n => params.push({ nombre: n, tipo, porRef, linea }));
          if (this.come(';') || this.come(',')) continue;
          break;
        }
      }
      this.exige(')');
      return params;
    }

    subrutina() {
      const linea = this.linea;
      this.sig();
      const nombre = this.exige('id', 'nombre de la subrutina').valor;
      const params = this.parametros();
      const sub = { nombre, params, retorna: null, consts: [], tipos: [], vars: [], cuerpo: [], linea };
      if (this.come('retorna')) sub.retorna = this.tipoSpec();
      this.secciones(sub);
      this.exige('inicio', '"inicio" de la subrutina');
      sub.cuerpo = this.sentencias();
      this.exige('fin', '"fin" de la subrutina');
      return sub;
    }

    /* ---- sentencias ---- */
    sentencias() {
      const lista = [];
      for (;;) {
        this.saltaPuntoComa();
        if (FIN_BLOQUE.has(this.tipo)) return lista;
        lista.push(this.sentencia());
      }
    }

    sentencia() {
      const linea = this.linea;
      switch (this.tipo) {
        case 'si': {
          this.sig();
          this.exige('(', '"(" con la condición');
          const cond = this.expr();
          this.exige(')');
          this.exige('{', '"{" que abre el cuerpo del si');
          const nodo = this.siEncadenado(cond, linea);
          this.exige('}', '"}" que cierra el si');
          return nodo;
        }
        case 'mientras': {
          this.sig();
          this.exige('(', '"(" con la condición');
          const cond = this.expr();
          this.exige(')');
          this.exige('{');
          const cuerpo = this.sentencias();
          this.exige('}');
          return { t: 'mientras', cond, cuerpo, linea };
        }
        case 'repetir': {
          this.sig();
          const cuerpo = this.sentencias();
          this.exige('hasta', '"hasta" con la condición de fin');
          this.exige('(');
          const cond = this.expr();
          this.exige(')');
          return { t: 'repetir', cuerpo, cond, linea };
        }
        case 'desde': {
          this.sig();
          const ctrl = this.postfijo(this.primaria());
          this.exige('=', '"=" con el valor inicial');
          const desde = this.expr();
          this.exige('hasta', '"hasta" con el valor final');
          const hasta = this.expr();
          const paso = this.come('paso') ? this.expr() : null;
          this.exige('{');
          const cuerpo = this.sentencias();
          this.exige('}');
          return { t: 'desde', ctrl, desde, hasta, paso, cuerpo, linea };
        }
        case 'eval': {
          this.sig();
          this.exige('{');
          const casos = [];
          let sino = null;
          while (this.es('caso')) {
            const l2 = this.linea;
            this.sig();
            this.exige('(', '"(" con la condición del caso');
            const cond = this.expr();
            this.exige(')');
            casos.push({ cond, cuerpo: this.sentencias(), linea: l2 });
          }
          if (this.come('sino')) sino = this.sentencias();
          this.exige('}');
          if (!casos.length) errC('la sentencia eval necesita al menos un "caso"', linea);
          return { t: 'eval', casos, sino, linea };
        }
        case 'retorna': {
          this.sig();
          return { t: 'retorna', valor: this.expr(), linea };
        }
        default: {
          if (!this.es('id')) {
            const t = this.tk();
            if (RESERVADAS.has(String(t.valor).toLowerCase()) && t.tipo !== 'id')
              errC(`la palabra "${t.valor}" no puede empezar una sentencia acá`, linea,
                'Revisá si te falta abrir un bloque con "{" o si escribiste la sentencia fuera de su lugar.');
            errC(`sentencia no válida: se encontró "${t.valor}"`, linea,
              'Una sentencia empieza con el nombre de una variable (asignación), con una llamada a subrutina, o con si / mientras / repetir / desde / eval / retorna.');
          }
          const destino = this.postfijo(this.primaria());
          if (this.come('=')) {
            const valor = this.es('{') ? this.literalEstructurado() : this.expr();
            return { t: 'asig', destino, valor, linea };
          }
          if (this.es('=='))
            errC('se usó "==" en una asignación', linea,
              'Para asignar un valor se usa un solo "=". El "==" sirve únicamente para comparar dentro de una condición.');
          if (destino.t !== 'llamada')
            errC('sentencia incompleta', linea,
              'Falta el "=" con el valor a asignar, o los paréntesis si querías llamar a una subrutina: cls(), imprimir("hola").');
          return { t: 'exprStmt', expr: destino, linea };
        }
      }
    }

    siEncadenado(cond, linea) {
      const nodo = { t: 'si', cond, entonces: this.sentencias(), sino: null, linea };
      if (this.come('sino')) {
        if (this.es('si')) {
          const l2 = this.linea;
          this.sig();
          this.exige('(', '"(" con la condición');
          const c2 = this.expr();
          this.exige(')');
          nodo.sino = [this.siEncadenado(c2, l2)];
        } else {
          nodo.sino = this.sentencias();
        }
      }
      return nodo;
    }

    /* ---- expresiones (precedencia según el manual de SL) ---- */
    expr() { return this.nivelOr(); }

    nivelOr() {
      let n = this.nivelAnd();
      while (this.es('or')) { const l = this.linea; this.sig(); n = { t: 'bin', op: 'or', i: n, d: this.nivelAnd(), linea: l }; }
      return n;
    }
    nivelAnd() {
      let n = this.nivelNot();
      while (this.es('and')) { const l = this.linea; this.sig(); n = { t: 'bin', op: 'and', i: n, d: this.nivelNot(), linea: l }; }
      return n;
    }
    nivelNot() {
      if (this.es('not')) { const l = this.linea; this.sig(); return { t: 'un', op: 'not', e: this.nivelNot(), linea: l }; }
      return this.nivelRel();
    }
    nivelRel() {
      let n = this.nivelAdit();
      while (['==', '<>', '<', '<=', '>', '>='].includes(this.tipo)) {
        const l = this.linea, op = this.sig().tipo;
        n = { t: 'bin', op, i: n, d: this.nivelAdit(), linea: l };
      }
      return n;
    }
    nivelAdit() {
      let n = this.nivelMult();
      while (this.es('+') || this.es('-')) {
        const l = this.linea, op = this.sig().tipo;
        n = { t: 'bin', op, i: n, d: this.nivelMult(), linea: l };
      }
      return n;
    }
    nivelMult() {
      let n = this.nivelUnario();
      while (this.es('*') || this.es('/') || this.es('%')) {
        const l = this.linea, op = this.sig().tipo;
        n = { t: 'bin', op, i: n, d: this.nivelUnario(), linea: l };
      }
      return n;
    }
    nivelUnario() {
      if (this.es('-') || this.es('+')) {
        const l = this.linea, op = this.sig().tipo;
        return { t: 'un', op, e: this.nivelUnario(), linea: l };
      }
      return this.nivelPot();
    }
    nivelPot() {
      const base = this.postfijo(this.primaria());
      if (this.es('^')) {
        const l = this.linea; this.sig();
        return { t: 'bin', op: '^', i: base, d: this.nivelUnario(), linea: l }; // asociativo a la derecha
      }
      return base;
    }

    postfijo(n) {
      for (;;) {
        if (this.es('[')) {
          const l = this.linea; this.sig();
          do { n = { t: 'indice', base: n, idx: this.expr(), linea: l }; } while (this.come(','));
          this.exige(']');
        } else if (this.es('.') && this.tk(1).tipo === 'id') {
          const l = this.linea; this.sig();
          n = { t: 'campo', base: n, nombre: this.sig().valor, linea: l };
        } else if (this.es('(') && (n.t === 'id')) {
          const l = this.linea; this.sig();
          const args = [];
          if (!this.es(')')) {
            do { args.push(this.es('{') ? this.literalEstructurado() : this.expr()); } while (this.come(','));
          }
          this.exige(')');
          n = { t: 'llamada', nombre: n.nombre, args, linea: l };
        } else return n;
      }
    }

    primaria() {
      const linea = this.linea;
      if (this.es('num')) return { t: 'num', v: this.sig().valor, linea };
      if (this.es('cad')) return { t: 'cad', v: this.sig().valor, linea };
      if (this.es('(')) { this.sig(); const e = this.expr(); this.exige(')'); return e; }
      if (this.es('{')) return this.literalEstructurado();
      if (this.es('id')) return { t: 'id', nombre: this.sig().valor, linea };
      errC(`se esperaba un valor y se encontró "${this.tk().valor}"`, linea,
        'En una expresión pueden aparecer números, cadenas entre comillas, variables, llamadas a funciones y paréntesis.');
    }

    literalEstructurado() {
      const linea = this.linea;
      this.exige('{');
      const items = [];
      let relleno = false;
      if (!this.es('}')) {
        for (;;) {
          if (this.come('...')) { relleno = true; this.come(','); break; }
          items.push(this.es('{') ? this.literalEstructurado() : this.expr());
          if (!this.come(',')) break;
        }
      }
      this.exige('}');
      return { t: 'estruct', items, relleno, linea };
    }
  }

  /* ------------------------------------------------------------------ */
  /* Valores en tiempo de ejecución                                      */
  /* ------------------------------------------------------------------ */
  class Registro {
    constructor(campos) { this.c = campos; }         // {nombre: valor}
  }
  const esArr = v => Array.isArray(v);
  const esRec = v => v instanceof Registro;

  function copiar(v) {
    if (esArr(v)) return v.map(copiar);
    if (esRec(v)) { const o = {}; for (const k in v.c) o[k] = copiar(v.c[k]); return new Registro(o); }
    return v;
  }

  function fmtNum(n) {
    if (!isFinite(n)) return n > 0 ? 'infinito' : (n < 0 ? '-infinito' : 'indefinido');
    if (Number.isInteger(n)) return String(n);
    return String(parseFloat(n.toPrecision(12)));
  }

  function nombreTipo(t) {
    switch (t.k) {
      case 'num': return 'numerico';
      case 'cad': return 'cadena';
      case 'log': return 'logico';
      case 'arr': return `vector/matriz de ${nombreTipo(t.elem)}`;
      case 'rec': return 'registro';
      default: return t.nombre || '?';
    }
  }

  function tipoDeValor(v) {
    if (typeof v === 'number') return 'numerico';
    if (typeof v === 'string') return 'cadena';
    if (typeof v === 'boolean') return 'logico';
    if (esArr(v)) return 'vector/matriz';
    if (esRec(v)) return 'registro';
    return 'no inicializado';
  }

  /* ------------------------------------------------------------------ */
  /* Intérprete                                                          */
  /* ------------------------------------------------------------------ */
  class Retorno { constructor(v) { this.v = v; } }
  class Terminado { constructor(m) { this.m = m; } }

  class Interprete {
    constructor(ast, io, opts) {
      this.ast = ast;
      this.io = io;
      this.opts = opts || {};
      this.globales = new Map();
      this.tipos = new Map();
      this.subs = new Map();
      this.pila = [];                     // ámbitos locales
      this.ifs = ',';                     // separador de entrada
      this.ofs = ',';                     // separador de salida de datos estructurados
      this.nodim = '<nodim>';             // marca de arreglo no dimensionado
      this.campos = [];                   // campos pendientes de leer() (teclado)
      this.fuente = null;                 // archivo de entrada activo, o null (teclado)
      this.finArchivo = false;            // ya se intentó leer más allá del final
      this.destino = null;                // archivo de salida activo, o null (pantalla)
      this.archivos = this.opts.archivos || (io && io.archivos) || new Map();
      this.argumentos = this.opts.argumentos || (io && io.argumentos) || [];
      this.pasos = 0;
      this.abortar = false;
      this.maxPasos = this.opts.maxPasos || 40000000;
    }

    get local() { return this.pila.length ? this.pila[this.pila.length - 1] : null; }

    async tick(linea) {
      // El corte se comprueba en cada paso para que "Detener" reaccione al instante.
      if (this.abortar) throw new SLError('ejecución interrumpida por el usuario', linea);
      if (++this.pasos % 4000 !== 0) return;
      if (this.pasos > this.maxPasos) errE('el programa ejecutó demasiadas instrucciones (¿ciclo infinito?)', linea,
        'Revisá que la condición del ciclo llegue a ser falsa: dentro del "mientras" tiene que cambiar alguna de las variables que aparecen en la condición.');
      await new Promise(r => setTimeout(r, 0));
      if (this.abortar) throw new SLError('ejecución interrumpida por el usuario', linea);
    }

    /* Punto de parada del depurador: solo antes de una sentencia, nunca en
       medio de una expresión ni durante las declaraciones. */
    async pausa(linea) {
      if (this.opts.depurador) await this.opts.depurador(linea, this);
    }

    /* ---- tipos ---- */
    resolverTipo(spec, linea) {
      switch (spec.k) {
        case 'num': case 'cad': case 'log': return { k: spec.k };
        case 'arr': {
          const dims = spec.dims.map(d => {
            if (d === '*') return '*';
            const n = Math.trunc(this.evalConst(d));
            if (!(n > 0)) errE('el tamaño de un arreglo debe ser mayor que cero', spec.linea);
            return n;
          });
          let fijo = false;
          for (const d of dims) {
            if (d !== '*') fijo = true;
            else if (fijo) errE('no se puede usar "*" luego de una dimensión de tamaño fijo', spec.linea);
          }
          return { k: 'arr', dims, elem: this.resolverTipo(spec.elem, linea) };
        }
        case 'rec': {
          const campos = [];
          for (const d of spec.campos) {
            const t = d.tipo ? this.resolverTipo(d.tipo, d.linea) : null;
            if (!t) errE('los campos de un registro necesitan un tipo explícito', d.linea,
              'Escribí, por ejemplo:  registro { nombre : cadena  edad : numerico }');
            for (const n of d.nombres) {
              if (campos.some(c => c.nombre === n)) errE(`campo duplicado "${n}" en el registro`, d.linea);
              campos.push({ nombre: n, tipo: t });
            }
          }
          return { k: 'rec', campos };
        }
        default: {
          const t = this.tipos.get(spec.nombre);
          if (!t) {
            const cand = parecido(spec.nombre, [...this.tipos.keys(), 'numerico', 'cadena', 'logico']);
            errE(`tipo de dato desconocido: "${spec.nombre}"`, spec.linea || linea,
              cand ? `¿Quisiste escribir "${cand}"?`
                   : 'Los tipos básicos son numerico, cadena y logico. Si es un tipo propio, definilo antes en la sección "tipos".');
          }
          return t;
        }
      }
    }

    // Tipo deducido de un valor ya calculado (inferencia en la declaración).
    tipoDeRuntime(v, linea) {
      if (typeof v === 'number') return { k: 'num' };
      if (typeof v === 'string') return { k: 'cad' };
      if (typeof v === 'boolean') return { k: 'log' };
      if (esArr(v)) return { k: 'arr', dims: ['*'], elem: v.length ? this.tipoDeRuntime(v[0], linea) : { k: 'num' } };
      if (esRec(v)) {
        const campos = [];
        for (const k in v.c) campos.push({ nombre: k, tipo: this.tipoDeRuntime(v.c[k], linea) });
        return { k: 'rec', campos };
      }
      errE('no se puede deducir el tipo del valor inicial', linea,
        'Indicá el tipo de la variable de forma explícita:  v : vector [*] numerico');
    }

    // Tipo de un literal { ... } cuando no se declaró el tipo.
    async tipoDeLiteral(nodo) {
      if (!nodo.items.length)
        errE('no se puede deducir el tipo de un literal vacío', nodo.linea,
          'Escribí el tipo de la variable:  v : vector [*] numerico = {}');
      const primero = nodo.items[0];
      const elem = primero.t === 'estruct'
        ? await this.tipoDeLiteral(primero)
        : this.tipoDeRuntime(await this.eval(primero), nodo.linea);
      return { k: 'arr', dims: ['*'], elem };
    }

    evalConst(nodo) {
      const v = this.evalSync(nodo);
      if (typeof v !== 'number') errE('se esperaba un valor numérico', nodo.linea);
      return v;
    }

    valorPorDefecto(t) {
      switch (t.k) {
        case 'num': return 0;
        case 'cad': return '';
        case 'log': return false;
        case 'rec': { const o = {}; for (const c of t.campos) o[c.nombre] = this.valorPorDefecto(c.tipo); return new Registro(o); }
        case 'arr': return this.crearArreglo(t, []);
      }
    }

    // Crea el arreglo usando tamaños explícitos y, si faltan, los de la declaración.
    crearArreglo(t, tam, linea) {
      const dims = t.dims.map((d, k) => (tam[k] !== undefined ? Math.trunc(tam[k]) : d));
      if (dims[0] === '*') return null;                       // arreglo abierto sin inicializar
      const sub = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : null;
      const n = dims[0];
      if (!(n > 0)) errE('el tamaño de un arreglo debe ser mayor que cero', linea);
      const a = new Array(n);
      for (let i = 0; i < n; i++) a[i] = sub ? this.crearArreglo(sub, [], linea) : this.valorPorDefecto(t.elem);
      return a;
    }

    async declarar(mapa, decls, consts, tiposDecl) {
      // Las constantes van primero: los tipos y las dimensiones pueden usarlas.
      for (const c of consts || []) {
        const v = this.evalSync(c.valor);
        mapa.set(c.nombre, { v, tipo: { k: typeof v === 'number' ? 'num' : typeof v === 'string' ? 'cad' : 'log' }, konst: true });
      }
      for (const c of tiposDecl || []) this.tipos.set(c.nombre, this.resolverTipo(c.tipo, c.linea));

      for (const d of decls || []) {
        let tipo = d.tipo ? this.resolverTipo(d.tipo, d.linea) : null;
        let valor;
        if (d.init) {
          if (d.init.t === 'estruct') {
            if (!tipo) tipo = await this.tipoDeLiteral(d.init);
            valor = await this.construirEstructura(tipo, d.init);
          } else {
            const v = await this.eval(d.init);
            if (!tipo) tipo = this.tipoDeRuntime(v, d.linea);
            valor = this.convertir(v, tipo, d.linea);
          }
        }
        for (const n of d.nombres) {
          if (mapa.has(n)) errE(`identificador duplicado: "${n}"`, d.linea);
          mapa.set(n, { v: d.init ? copiar(valor) : this.valorPorDefecto(tipo), tipo });
        }
      }
    }

    celda(nombre, linea) {
      const l = this.local;
      if (l && l.has(nombre)) return l.get(nombre);
      if (this.globales.has(nombre)) return this.globales.get(nombre);
      const visibles = [...(l ? l.keys() : []), ...this.globales.keys()];
      const cand = parecido(nombre, visibles);
      errE(`identificador no declarado: "${nombre}"`, linea,
        cand ? `¿Quisiste escribir "${cand}"? Recordá que SL distingue mayúsculas de minúsculas: "Total" y "total" son variables distintas.`
             : `Antes de usar "${nombre}" hay que declararlo en la sección var:\n   var\n      ${nombre} : numerico`);
    }

    /* ---- ejecución ---- */
    async run() {
      const a = this.ast;
      for (const s of a.subs) {
        if (this.subs.has(s.nombre)) errE(`subrutina duplicada: "${s.nombre}"`, s.linea);
        this.subs.set(s.nombre, s);
      }
      this.globales.set('TRUE', { v: true, tipo: { k: 'log' }, konst: true });
      this.globales.set('FALSE', { v: false, tipo: { k: 'log' }, konst: true });
      this.globales.set('SI', { v: true, tipo: { k: 'log' }, konst: true });
      this.globales.set('NO', { v: false, tipo: { k: 'log' }, konst: true });
      try {
        await this.declarar(this.globales, a.vars, a.consts, a.tipos);
        await this.bloque(a.cuerpo);
      } catch (e) {
        if (e instanceof Retorno) return;
        if (e instanceof Terminado) { this.terminado = true; return; }
        throw e;
      }
    }

    async bloque(lista) { for (const s of lista) await this.ejecutar(s); }

    async ejecutar(s) {
      await this.tick(s.linea);
      // Los ciclos se marcan una vez por vuelta, más abajo: acá se saltean para
      // no detener dos veces seguidas en la misma línea.
      if (s.t !== 'mientras' && s.t !== 'repetir' && s.t !== 'desde') await this.pausa(s.linea);
      switch (s.t) {
        case 'asig': {
          const lv = await this.lvalue(s.destino);
          if (lv.konst) errE('no se puede modificar una constante', s.linea,
            'Las constantes de la sección "const" no cambian durante la ejecución. Si el valor tiene que cambiar, declaralo como variable en la sección "var".');
          if (s.valor.t === 'estruct') await this.asignarEstructura(lv, s.valor);
          else lv.set(this.convertir(await this.eval(s.valor), lv.tipo, s.linea));
          return;
        }
        case 'exprStmt': await this.eval(s.expr); return;
        case 'si':
          if (this.aLogico(await this.eval(s.cond), s.linea)) await this.bloque(s.entonces);
          else if (s.sino) await this.bloque(s.sino);
          return;
        case 'mientras':
          while (this.aLogico(await this.eval(s.cond), s.linea)) {
            await this.tick(s.linea);
            await this.pausa(s.linea);
            await this.bloque(s.cuerpo);
          }
          return;
        case 'repetir':
          do {
            await this.tick(s.linea);
            await this.pausa(s.linea);
            await this.bloque(s.cuerpo);
          } while (!this.aLogico(await this.eval(s.cond), s.linea));
          return;
        case 'desde': {
          const lv = await this.lvalue(s.ctrl);
          const ini = Math.trunc(this.aNum(await this.eval(s.desde), s.linea));
          const fin = this.aNum(await this.eval(s.hasta), s.linea);
          const paso = s.paso ? Math.trunc(this.aNum(await this.eval(s.paso), s.linea)) : 1;
          if (paso === 0) errE('el paso del ciclo desde no puede ser cero', s.linea,
            'Con paso 0 el ciclo nunca terminaría. Usá un paso positivo para contar hacia adelante o negativo para contar hacia atrás.');
          lv.set(ini);
          while (paso > 0 ? this.aNum(lv.get(), s.linea) <= fin : this.aNum(lv.get(), s.linea) >= fin) {
            await this.tick(s.linea);
            await this.pausa(s.linea);
            await this.bloque(s.cuerpo);
            lv.set(this.aNum(lv.get(), s.linea) + paso);
          }
          return;
        }
        case 'eval': {
          for (const c of s.casos) {
            if (this.aLogico(await this.eval(c.cond), c.linea)) { await this.bloque(c.cuerpo); return; }
          }
          if (s.sino) await this.bloque(s.sino);
          return;
        }
        case 'retorna': throw new Retorno(await this.eval(s.valor));
        /* Un agujero que dejó el modo flexible (ver js/flexible.js). El
           programa corre hasta acá y recién entonces avisa: así se ve la
           salida que llevaba, que es lo que sirve para ubicar el error. */
        case 'error':
          errC(s.mensaje || 'esta línea tiene un error de sintaxis', s.linea,
            (s.sugerencia ? s.sugerencia + '\n\n' : '') +
            'El programa está en modo flexible: corrió hasta acá y paró en el primer error que quedó sin arreglar.');
          return;
      }
    }

    /* ---- lvalues ---- */
    async lvalue(n) {
      switch (n.t) {
        case 'id': {
          const c = this.celda(n.nombre, n.linea);
          return { get: () => c.v, set: v => { c.v = v; }, tipo: c.tipo, konst: c.konst, celda: c };
        }
        case 'campo': {
          const b = await this.lvalue(n.base);
          if (b.tipo.k !== 'rec') errE(`"${n.nombre}": el valor no es un registro`, n.linea);
          const def = b.tipo.campos.find(c => c.nombre === n.nombre);
          if (!def) {
            const cand = parecido(n.nombre, b.tipo.campos.map(c => c.nombre));
            errE(`el registro no tiene un campo llamado "${n.nombre}"`, n.linea,
              cand ? `¿Quisiste escribir "${cand}"?`
                   : `Los campos disponibles son: ${b.tipo.campos.map(c => c.nombre).join(', ')}.`);
          }
          const r = b.get();
          if (!esRec(r)) errE('el registro no está inicializado', n.linea,
            'Si el registro es un elemento de un vector abierto, primero hay que dimensionarlo con dim().');
          return { get: () => r.c[n.nombre], set: v => { r.c[n.nombre] = v; }, tipo: def.tipo, konst: b.konst };
        }
        case 'indice': {
          const b = await this.lvalue(n.base);
          const i = Math.trunc(this.aNum(await this.eval(n.idx), n.linea));
          if (b.tipo.k === 'cad') {
            return {
              get: () => { const s = b.get(); return (i >= 1 && i <= s.length) ? s[i - 1] : ''; },
              set: v => {
                const s = b.get();
                if (typeof v !== 'string') errE('solo se puede asignar una cadena a un carácter', n.linea);
                if (i >= 1 && i <= s.length && v.length) b.set(s.slice(0, i - 1) + v[0] + s.slice(i));
              },
              tipo: { k: 'cad' }, konst: b.konst
            };
          }
          if (b.tipo.k !== 'arr') errE('solo se puede indexar un vector, una matriz o una cadena', n.linea,
            'Los corchetes [ ] se usan con vectores, matrices y cadenas. Para acceder a un campo de un registro se usa el punto: r.campo.');
          const arr = b.get();
          if (!esArr(arr)) errE('el arreglo abierto todavía no fue inicializado', n.linea,
            'Antes de usar un arreglo declarado con [*] hay que darle tamaño:  dim (v, cantidad)  o asignarle un literal:  v = {1, 2, 3}.');
          if (i < 1 || i > arr.length) errE(`índice fuera de rango: ${i} (el arreglo tiene ${arr.length} elemento(s))`, n.linea,
            `En SL los índices van de 1 a ${arr.length}. Revisá los límites del ciclo: desde k=1 hasta alen (v).`);
          const tElem = b.tipo.dims.length > 1
            ? { k: 'arr', dims: b.tipo.dims.slice(1), elem: b.tipo.elem }
            : b.tipo.elem;
          return { get: () => arr[i - 1], set: v => { arr[i - 1] = v; }, tipo: tElem, konst: b.konst };
        }
        default: errE('el destino de la asignación no es válido', n.linea);
      }
    }

    async asignarEstructura(lv, nodo) {
      lv.set(await this.construirEstructura(lv.tipo, nodo));
    }

    async construirEstructura(t, nodo) {
      if (t.k === 'arr') {
        if (!nodo.items.length && !nodo.relleno) return t.dims[0] === '*' ? null : this.crearArreglo(t, [], nodo.linea);
        const tElem = t.dims.length > 1 ? { k: 'arr', dims: t.dims.slice(1), elem: t.elem } : t.elem;
        const vals = [];
        for (const it of nodo.items) {
          vals.push(it.t === 'estruct'
            ? await this.construirEstructura(tElem, it)
            : this.convertir(await this.eval(it), tElem, it.linea));
        }
        const n = t.dims[0] === '*' ? vals.length : t.dims[0];
        if (t.dims[0] === '*' && nodo.relleno) errE('no se puede usar "..." al inicializar un arreglo abierto', nodo.linea);
        if (vals.length > n) errE(`el literal tiene ${vals.length} elementos y el arreglo ${n}`, nodo.linea);
        const out = new Array(n);
        for (let i = 0; i < n; i++) {
          if (i < vals.length) out[i] = vals[i];
          else if (nodo.relleno && vals.length) out[i] = copiar(vals[vals.length - 1]);
          else out[i] = tElem.k === 'arr' ? this.crearArreglo(tElem, [], nodo.linea) : this.valorPorDefecto(tElem);
        }
        return out;
      }
      if (t.k === 'rec') {
        if (nodo.items.length > t.campos.length) errE('el literal tiene más valores que campos el registro', nodo.linea);
        const o = {};
        for (let i = 0; i < t.campos.length; i++) {
          const c = t.campos[i], it = nodo.items[i];
          if (it === undefined) o[c.nombre] = this.valorPorDefecto(c.tipo);
          else o[c.nombre] = it.t === 'estruct'
            ? await this.construirEstructura(c.tipo, it)
            : this.convertir(await this.eval(it), c.tipo, it.linea);
        }
        return new Registro(o);
      }
      errE('un literal { } solo puede asignarse a un arreglo o a un registro', nodo.linea);
    }

    convertir(v, tipo, linea) {
      if (!tipo) return copiar(v);
      const esperado = tipo.k;
      const real = typeof v === 'number' ? 'num' : typeof v === 'string' ? 'cad'
        : typeof v === 'boolean' ? 'log' : esArr(v) || v === null ? 'arr' : 'rec';
      if (esperado !== real) {
        if (esperado === 'arr' && v === null) return null;
        errE(`no hay concordancia de tipos: se esperaba ${nombreTipo(tipo)} y se obtuvo ${tipoDeValor(v)}`, linea,
          esperado === 'num' && real === 'cad'
            ? 'SL no mezcla cadenas con números. Para convertir una cadena en número usá val (s).'
            : esperado === 'cad' && real === 'num'
              ? 'Para convertir un número en cadena usá str (n).'
              : 'Cada variable solo admite valores de su propio tipo. Revisá la declaración en la sección var.');
      }
      // La compatibilidad de registros y arreglos es estructural, no por nombres:
      // los valores se copian posición por posición sobre la forma del destino.
      if (esperado === 'rec') return this.adaptarRegistro(v, tipo, linea);
      if (esperado === 'arr' && v !== null) return this.adaptarArreglo(v, tipo, linea);
      return copiar(v);
    }

    adaptarRegistro(v, tipo, linea) {
      const nombres = Object.keys(v.c);
      if (nombres.length !== tipo.campos.length)
        errE(`los registros no son asignables: uno tiene ${nombres.length} campo(s) y el otro ${tipo.campos.length}`, linea,
          'Para asignar un registro a otro, los dos tienen que tener la misma cantidad de campos y coincidir uno a uno en tipo. Los nombres no importan.');
      const o = {};
      tipo.campos.forEach((c, i) => { o[c.nombre] = this.convertir(v.c[nombres[i]], c.tipo, linea); });
      return new Registro(o);
    }

    adaptarArreglo(v, tipo, linea) {
      if (tipo.dims[0] !== '*' && v.length !== tipo.dims[0])
        errE(`los arreglos no son asignables: el origen tiene ${v.length} elemento(s) y el destino ${tipo.dims[0]}`, linea,
          'El destino tiene que tener la misma cantidad de elementos que el origen, o ser un arreglo abierto.');
      const tElem = tipo.dims.length > 1 ? { k: 'arr', dims: tipo.dims.slice(1), elem: tipo.elem } : tipo.elem;
      return v.map(x => (x === null ? null : this.convertir(x, tElem, linea)));
    }

    aNum(v, l) {
      if (typeof v !== 'number')
        errE(`se esperaba un valor numérico y se obtuvo ${tipoDeValor(v)}`, l,
          typeof v === 'string' ? 'Si el dato viene como cadena, convertilo con val (s).' : '');
      return v;
    }
    aCad(v, l) {
      if (typeof v !== 'string')
        errE(`se esperaba una cadena y se obtuvo ${tipoDeValor(v)}`, l,
          typeof v === 'number' ? 'Si el dato es un número, convertilo con str (n).' : '');
      return v;
    }
    aLogico(v, l) {
      if (typeof v !== 'boolean')
        errE(`se esperaba una condición lógica y se obtuvo ${tipoDeValor(v)}`, l,
          'La condición de si, mientras, repetir y caso tiene que dar verdadero o falso; por ejemplo ( n > 0 ) o ( ok and n <> 0 ).');
      return v;
    }

    /* ---- expresiones ---- */
    evalSync(n) {
      // Solo para constantes y dimensiones: no admite llamadas ni entrada.
      switch (n.t) {
        case 'num': case 'cad': return n.v;
        case 'id': { const c = this.celda(n.nombre, n.linea); return c.v; }
        case 'un': {
          const v = this.evalSync(n.e);
          if (n.op === 'not') return !this.aLogico(v, n.linea);
          return n.op === '-' ? -this.aNum(v, n.linea) : this.aNum(v, n.linea);
        }
        case 'bin': return this.binario(n.op, this.evalSync(n.i), this.evalSync(n.d), n.linea);
        default: errE('esta expresión no puede usarse en una constante o en una dimensión', n.linea);
      }
    }

    async eval(n) {
      await this.tick(n.linea);
      switch (n.t) {
        case 'num': case 'cad': return n.v;
        case 'id': {
          const c = this.celda(n.nombre, n.linea);
          if (c.v === null) errE(`el arreglo abierto "${n.nombre}" todavía no fue inicializado`, n.linea,
            `Dale tamaño antes de usarlo:  dim (${n.nombre}, cantidad)  o asignale un literal:  ${n.nombre} = {1, 2, 3}.`);
          return c.v;
        }
        case 'indice': case 'campo': return (await this.lvalue(n)).get();
        case 'un': {
          const v = await this.eval(n.e);
          if (n.op === 'not') return !this.aLogico(v, n.linea);
          return n.op === '-' ? -this.aNum(v, n.linea) : this.aNum(v, n.linea);
        }
        case 'bin': {
          if (n.op === 'and') return this.aLogico(await this.eval(n.i), n.linea) ? this.aLogico(await this.eval(n.d), n.linea) : false;
          if (n.op === 'or') return this.aLogico(await this.eval(n.i), n.linea) ? true : this.aLogico(await this.eval(n.d), n.linea);
          return this.binario(n.op, await this.eval(n.i), await this.eval(n.d), n.linea);
        }
        case 'llamada': return await this.llamar(n);
        case 'estruct': errE('un literal { } solo puede usarse en una asignación o como parámetro', n.linea);
        default: errE('expresión no válida', n.linea);
      }
    }

    binario(op, a, b, l) {
      switch (op) {
        case '+':
          if (typeof a === 'number' && typeof b === 'number') return a + b;
          if (typeof a === 'string' && typeof b === 'string') return a + b;
          errE(`no se puede usar "+" entre ${tipoDeValor(a)} y ${tipoDeValor(b)}`, l,
            'El "+" suma dos números o concatena dos cadenas, pero no mezcla los dos tipos. Convertí el número con str (n) o la cadena con val (s).');
          break;
        case '-': return this.aNum(a, l) - this.aNum(b, l);
        case '*': return this.aNum(a, l) * this.aNum(b, l);
        case '/':
          if (this.aNum(b, l) === 0) errE('división por cero', l,
            'Antes de dividir verificá que el divisor no sea 0:  si ( d <> 0 ) { ... }.');
          return this.aNum(a, l) / b;
        case '%':
          if (Math.trunc(this.aNum(b, l)) === 0) errE('división por cero (operador %)', l,
            'El operador % calcula el resto de una división, así que el segundo operando no puede ser 0.');
          return Math.trunc(this.aNum(a, l)) % Math.trunc(b);
        case '^': return Math.pow(this.aNum(a, l), this.aNum(b, l));
        default: {
          if (typeof a !== typeof b || esArr(a) || esRec(a))
            errE(`no se pueden comparar ${tipoDeValor(a)} y ${tipoDeValor(b)}`, l,
              'Los operadores relacionales comparan dos valores del mismo tipo simple (dos números, dos cadenas o dos lógicos). Los arreglos y registros no se comparan directamente.');
          switch (op) {
            case '==': return a === b;
            case '<>': return a !== b;
            case '<': return a < b;
            case '<=': return a <= b;
            case '>': return a > b;
            case '>=': return a >= b;
          }
        }
      }
    }

    /* ---- llamadas ---- */
    async llamar(n) {
      const sub = this.subs.get(n.nombre);
      if (sub) return await this.llamarSub(sub, n);
      if (PREDEF[n.nombre]) return await PREDEF[n.nombre].call(this, n);
      const cand = parecido(n.nombre, [...this.subs.keys(), ...Object.keys(PREDEF)]);
      errE(`subrutina o función no definida: "${n.nombre}"`, n.linea,
        cand ? `¿Quisiste escribir "${cand}"?`
             : 'Las subrutinas propias se escriben después del "fin" del programa principal. Revisá también la lista de predefinidas en la documentación.');
    }

    async llamarSub(sub, n) {
      if (n.args.length !== sub.params.length)
        errE(`"${sub.nombre}" espera ${sub.params.length} parámetro(s) y recibió ${n.args.length}`, n.linea,
          `La definición es: subrutina ${sub.nombre} (${sub.params.map(p => (p.porRef ? 'ref ' : '') + p.nombre).join(', ')}).`);
      if (this.pila.length > 400) errE('demasiadas llamadas anidadas (¿recursión infinita?)', n.linea,
        'Una subrutina recursiva necesita un caso base que corte las llamadas; por ejemplo  si ( n <= 1 ) { retorna (1) }.');

      const nuevo = new Map();
      for (let i = 0; i < sub.params.length; i++) {
        const p = sub.params[i], a = n.args[i];
        const tipo = this.resolverTipo(p.tipo, p.linea || n.linea);
        if (p.porRef) {
          if (!['id', 'indice', 'campo'].includes(a.t)) errE(`el parámetro "${p.nombre}" debe recibir una variable (es por referencia)`, a.linea,
            'Un parámetro declarado con "ref" recibe la variable en sí, no el resultado de una cuenta. Pasá el nombre de una variable.');
          const lv = await this.lvalue(a);
          nuevo.set(p.nombre, { get v() { return lv.get(); }, set v(x) { lv.set(x); }, tipo: lv.tipo });
        } else if (a.t === 'estruct') {
          nuevo.set(p.nombre, { v: await this.construirEstructura(tipo, a), tipo });
        } else {
          nuevo.set(p.nombre, { v: this.convertir(await this.eval(a), tipo, a.linea), tipo });
        }
      }
      nuevo.nombreSub = sub.nombre;   // lo usa el depurador para mostrar dónde está
      this.pila.push(nuevo);
      try {
        await this.declarar(nuevo, sub.vars, sub.consts, sub.tipos);
        await this.bloque(sub.cuerpo);
        if (sub.retorna) errE(`la función "${sub.nombre}" terminó sin ejecutar "retorna"`, sub.linea,
          'Toda función declarada con "retorna tipo" tiene que ejecutar la sentencia retorna ( valor ) en todos sus caminos posibles.');
        return undefined;
      } catch (e) {
        if (e instanceof Retorno) {
          if (!sub.retorna) errE(`"${sub.nombre}" no está declarada con "retorna" y sin embargo retorna un valor`, sub.linea,
            `Si querés que devuelva un valor, declarala así:  subrutina ${sub.nombre} (...) retorna numerico`);
          return this.convertir(e.v, this.resolverTipo(sub.retorna, sub.linea), sub.linea);
        }
        throw e;
      } finally {
        if (this.opts.alRetornar) await this.opts.alRetornar(this, sub);
        this.pila.pop();
      }
    }

    /* ---- entrada de datos ---- */
    hayFin() {
      if (this.fuente) return this.finArchivo;
      return this.campos.length === 0 && (!this.io.finEntrada || this.io.finEntrada());
    }

    // Devuelve el próximo campo, o null si ya no hay datos.
    async proximoCampo(linea) {
      if (this.fuente) {
        const f = this.fuente;
        if (f.pos >= f.texto.length) { this.finArchivo = true; return null; }
        if (this.ifs === '') { return f.texto[f.pos++]; }   // set_ifs("") -> carácter a carácter
        let fin = f.pos;
        while (fin < f.texto.length && f.texto[fin] !== this.ifs && f.texto[fin] !== '\n') fin++;
        const campo = f.texto.slice(f.pos, fin).replace(/\r$/, '');
        f.pos = fin + 1;
        return campo;
      }
      while (!this.campos.length) {
        const l = await this.io.leerLinea();
        if (l === null) return null;
        this.campos = this.ifs === '' ? l.split('') : l.split(this.ifs);
      }
      return this.campos.shift();
    }

    async campoObligatorio(linea) {
      const c = await this.proximoCampo(linea);
      if (c === null) {
        if (this.fuente) return '';    // leyendo de un archivo, leer() no produce error
        errE('no hay más datos en la entrada para leer()', linea,
          'Cargá más líneas en el panel "Entrada de datos" (una por cada lectura) o revisá si el ciclo lee más veces de las necesarias. La función eof() te dice si todavía quedan datos.');
      }
      return c;
    }

    // Lee un valor completo (simple o estructurado) respetando la forma del destino.
    async leerEn(tipo, actual, linea) {
      if (tipo.k === 'num') return valorNumerico(await this.campoObligatorio(linea));
      if (tipo.k === 'cad') return await this.campoObligatorio(linea);
      if (tipo.k === 'log') errE('leer() no admite variables lógicas', linea,
        'Leé un número o una cadena y después convertilo; por ejemplo  ok = (resp == "s").');
      if (tipo.k === 'rec') {
        const o = {};
        for (const c of tipo.campos) o[c.nombre] = await this.leerEn(c.tipo, actual ? actual.c[c.nombre] : null, linea);
        return new Registro(o);
      }
      if (tipo.k === 'arr') {
        if (!esArr(actual)) errE('no se puede leer un arreglo abierto sin dimensionar', linea,
          'Llamá antes a dim (v, cantidad) para que leer() sepa cuántos valores tiene que tomar.');
        const tElem = tipo.dims.length > 1 ? { k: 'arr', dims: tipo.dims.slice(1), elem: tipo.elem } : tipo.elem;
        const out = [];
        for (let i = 0; i < actual.length; i++) out.push(await this.leerEn(tElem, actual[i], linea));
        return out;
      }
    }

    /* ---- salida ---- */
    escribir(texto) {
      if (this.destino) {
        this.archivos.set(this.destino.nombre, (this.archivos.get(this.destino.nombre) || '') + texto);
        return;
      }
      this.io.imprimir(texto);
    }

    // Representación de un valor para imprimir(): los estructurados se aplanan
    // separando los valores con el OFS y marcando los arreglos sin dimensionar.
    texto(v, linea) {
      if (esArr(v) || esRec(v) || v === null) {
        const partes = [];
        const aplanar = x => {
          if (x === null) { partes.push(this.nodim); return; }
          if (esArr(x)) { x.forEach(aplanar); return; }
          if (esRec(x)) { for (const k in x.c) aplanar(x.c[k]); return; }
          partes.push(this.texto(x, linea));
        };
        aplanar(v);
        return partes.join(this.ofs);
      }
      if (typeof v === 'string') return v;
      if (typeof v === 'number') return fmtNum(v);
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
      errE('imprimir() no puede mostrar este valor', linea);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Subrutinas y funciones predefinidas                                 */
  /* (manual "Índice de subrutinas y funciones predefinidas de SL")      */
  /* ------------------------------------------------------------------ */
  function valorNumerico(s) {
    const m = /^\s*[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/.exec(s);
    return m ? parseFloat(m[0]) : 0;
  }

  // Helper para funciones que reciben valores ya evaluados.
  function fn(min, max, f) {
    return async function (n) {
      if (n.args.length < min || n.args.length > max)
        errE(`"${n.nombre}" espera entre ${min} y ${max} parámetro(s) y recibió ${n.args.length}`, n.linea);
      const vs = [];
      for (const a of n.args) vs.push(await this.eval(a));
      return f.call(this, vs, n.linea, n);
    };
  }

  // Helper para las que reciben variables por referencia.
  async function lvalues(interp, n, cant) {
    if (n.args.length !== cant)
      errE(`"${n.nombre}" espera ${cant} parámetro(s) y recibió ${n.args.length}`, n.linea);
    const out = [];
    for (const a of n.args) {
      if (!['id', 'indice', 'campo'].includes(a.t))
        errE(`"${n.nombre}" recibe sus parámetros por referencia: tienen que ser nombres de variables`, n.linea,
          'Pasá una variable, no una cuenta ni un valor fijo.');
      out.push(await interp.lvalue(a));
    }
    return out;
  }

  const PREDEF = {
    /* --------------------------- entrada/salida --------------------------- */
    imprimir: async function (n) {
      let out = '';
      for (const a of n.args) out += this.texto(await this.eval(a), n.linea);
      this.escribir(out);
    },
    leer: async function (n) {
      if (!n.args.length) errE('leer() necesita al menos una variable', n.linea,
        'Se escribe leer (n) o leer (a, b). Los datos se toman del panel "Entrada de datos".');
      for (const a of n.args) {
        const lv = await this.lvalue(a);
        lv.set(await this.leerEn(lv.tipo, lv.get(), n.linea));
      }
    },
    cls: fn(0, 0, function () { if (!this.destino) this.io.limpiar(); }),
    eof: fn(0, 0, function () { return this.hayFin(); }),
    set_ifs: fn(1, 1, function (v, l) { this.ifs = this.aCad(v[0], l).slice(0, 1); }),
    get_ifs: fn(0, 0, function () { return this.ifs; }),
    set_ofs: fn(1, 1, function (v, l) {
      const c = this.aCad(v[0], l);
      this.ofs = c.slice(0, 1) || ',';
      this.nodim = c.slice(1);
    }),
    get_ofs: fn(0, 0, function () { return this.ofs + this.nodim; }),

    /* ------------------------------ archivos ------------------------------ */
    set_stdin: fn(1, 1, function (v, l) {
      const nombre = this.aCad(v[0], l);
      this.ifs = ',';                       // set_stdin() restaura el separador
      this.finArchivo = false;
      if (nombre === '') { this.fuente = null; return true; }
      if (!this.archivos.has(nombre)) { this.fuente = null; return false; }
      this.fuente = { nombre, texto: this.archivos.get(nombre), pos: 0 };
      return true;
    }),
    set_stdout: fn(1, 2, function (v, l) {
      const nombre = this.aCad(v[0], l);
      const modo = v.length > 1 ? this.aCad(v[1], l) : 'wt';
      if (nombre === '') { this.destino = null; return true; }
      const previo = (modo === 'at' && this.archivos.has(nombre)) ? this.archivos.get(nombre) : '';
      this.archivos.set(nombre, previo);
      this.destino = { nombre };
      return true;
    }),

    /* ----------------------------- pantalla ------------------------------- */
    set_color: fn(2, 2, function (v, l) {
      if (this.io.setColor) this.io.setColor(Math.trunc(this.aNum(v[0], l)), Math.trunc(this.aNum(v[1], l)));
    }),
    get_color: async function (n) {
      const [lf, lb] = await lvalues(this, n, 2);
      const c = this.io.getColor ? this.io.getColor() : { texto: 7, fondo: 0 };
      lf.set(c.texto); lb.set(c.fondo);
    },
    set_curpos: fn(2, 2, function (v, l) {
      if (this.io.setCurpos) this.io.setCurpos(Math.trunc(this.aNum(v[0], l)), Math.trunc(this.aNum(v[1], l)));
    }),
    get_curpos: async function (n) {
      const [ll, lc] = await lvalues(this, n, 2);
      const p = (this.destino || !this.io.getCurpos) ? { linea: 0, col: 0 } : this.io.getCurpos();
      ll.set(p.linea); lc.set(p.col);
    },
    get_scrsize: async function (n) {
      const [ll, lc] = await lvalues(this, n, 2);
      const s = this.io.getScrsize ? this.io.getScrsize() : { lineas: 25, columnas: 80 };
      ll.set(s.lineas); lc.set(s.columnas);
    },
    beep: fn(0, 2, async function (v, l) {
      const f = v.length > 0 ? this.aNum(v[0], l) : 500;
      const d = v.length > 1 ? this.aNum(v[1], l) : 100;
      if (this.io.beep) await this.io.beep(f, d);
    }),
    readkey: fn(0, 1, async function (v, l) {
      const ms = v.length ? this.aNum(v[0], l) : 0;
      return this.io.leerTecla ? await this.io.leerTecla(ms) : 0;
    }),

    /* ------------------------------- lienzo -------------------------------- */
    /* El SLE original tenía unas pocas órdenes para dibujar en pantalla; con
       estas se arma un Snake o un Pong en pseudocódigo. Los colores son los
       mismos 1 a 15 de set_color(); el lienzo aparece solo la primera vez que
       se dibuja algo, como la ventana de ESLE2 Visual. Si el entorno no tiene
       lienzo (por ejemplo, al corregir un ejercicio) no hacen nada, igual que
       set_color() cuando la salida está redirigida a un archivo. */
    dibujar_pixel: fn(2, 3, function (v, l) {
      const c = v.length > 2 ? this.aNum(v[2], l) : 15;
      if (this.io.pixel) this.io.pixel(this.aNum(v[0], l), this.aNum(v[1], l), c);
    }),
    dibujar_linea: fn(4, 5, function (v, l) {
      const c = v.length > 4 ? this.aNum(v[4], l) : 15;
      if (this.io.linea) this.io.linea(this.aNum(v[0], l), this.aNum(v[1], l), this.aNum(v[2], l), this.aNum(v[3], l), c);
    }),
    dibujar_rectangulo: fn(4, 5, function (v, l) {
      const c = v.length > 4 ? this.aNum(v[4], l) : 15;
      if (this.io.rect) this.io.rect(this.aNum(v[0], l), this.aNum(v[1], l), this.aNum(v[2], l), this.aNum(v[3], l), c);
    }),
    dibujar_circulo: fn(3, 4, function (v, l) {
      const c = v.length > 3 ? this.aNum(v[3], l) : 15;
      if (this.io.circulo) this.io.circulo(this.aNum(v[0], l), this.aNum(v[1], l), this.aNum(v[2], l), c);
    }),
    limpiar_lienzo: fn(0, 1, function (v, l) {
      const c = v.length ? this.aNum(v[0], l) : 0;
      if (this.io.limpiarLienzo) this.io.limpiarLienzo(c);
    }),
    lienzo_ancho: fn(0, 0, function () { return this.io.lienzoAncho ? this.io.lienzoAncho() : 0; }),
    lienzo_alto: fn(0, 0, function () { return this.io.lienzoAlto ? this.io.lienzoAlto() : 0; }),

    /* ------------------------------ arreglos ------------------------------ */
    dim: async function (n) {
      if (!n.args.length) errE('dim() necesita el arreglo y sus tamaños', n.linea);
      const lv = await this.lvalue(n.args[0]);
      if (lv.tipo.k !== 'arr') errE('dim() solo puede aplicarse a un vector o una matriz', n.linea,
        'dim() sirve para dar tamaño a los arreglos declarados con [*]; por ejemplo  v : vector [*] numerico.');
      const tam = [];
      for (let i = 1; i < n.args.length; i++) tam.push(this.aNum(await this.eval(n.args[i]), n.linea));
      lv.set(this.crearArreglo(lv.tipo, tam, n.linea));
    },
    alen: async function (n) {
      if (n.args.length !== 1) errE('alen() espera un parámetro', n.linea);
      const a = n.args[0];
      let v;
      if (['id', 'indice', 'campo'].includes(a.t)) v = (await this.lvalue(a)).get();
      else v = await this.eval(a);
      if (v === null) return 0;
      if (!esArr(v)) errE('alen() solo puede aplicarse a un vector o una matriz', n.linea,
        'Para saber cuántos caracteres tiene una cadena usá strlen (s).');
      return v.length;
    },

    /* ------------------------------- otros -------------------------------- */
    // ifval() es una expresión condicional: solo evalúa la rama que corresponde.
    ifval: async function (n) {
      if (n.args.length !== 3) errE('ifval() espera tres parámetros: condición, valor si es verdadera, valor si es falsa', n.linea,
        'Por ejemplo:  retorna ifval (n > 0, "positivo", "no positivo")');
      const c = this.aLogico(await this.eval(n.args[0]), n.linea);
      return await this.eval(n.args[c ? 1 : 2]);
    },
    intercambiar: async function (n) {
      const [a, b] = await lvalues(this, n, 2);
      const va = a.get(), vb = b.get();
      if (tipoDeValor(va) !== tipoDeValor(vb))
        errE(`no se pueden intercambiar ${tipoDeValor(va)} y ${tipoDeValor(vb)}`, n.linea,
          'Las dos variables tienen que ser del mismo tipo.');
      a.set(copiar(vb));
      b.set(copiar(va));
    },
    max: fn(2, 2, function (v, l) {
      if (typeof v[0] !== typeof v[1] || esArr(v[0]) || esRec(v[0]))
        errE('max() compara dos valores simples del mismo tipo', l);
      return v[0] >= v[1] ? copiar(v[0]) : copiar(v[1]);
    }),
    min: fn(2, 2, function (v, l) {
      if (typeof v[0] !== typeof v[1] || esArr(v[0]) || esRec(v[0]))
        errE('min() compara dos valores simples del mismo tipo', l);
      return v[0] <= v[1] ? copiar(v[0]) : copiar(v[1]);
    }),
    terminar: fn(0, 1, function (v, l) {
      if (v.length) this.escribir(this.texto(v[0], l));
      throw new Terminado(v.length ? v[0] : '');
    }),
    runcmd: fn(1, 1, function () { return 127; }),   // no hay procesador de comandos en el navegador
    paramval: fn(1, 1, function (v, l) {
      const k = Math.trunc(this.aNum(v[0], l));
      return (k >= 1 && k <= this.argumentos.length) ? this.argumentos[k - 1] : '';
    }),
    pcount: fn(0, 0, function () { return this.argumentos.length; }),
    sec: fn(0, 0, function () { return Math.floor(Date.now() / 1000); }),
    mem: fn(0, 0, function () { return 640000; }),   // valor simbólico: no hay heap propio
    random: fn(1, 2, function (v, l) {
      const tope = Math.trunc(this.aNum(v[0], l));
      if (tope <= 0) errE('random() necesita un tope mayor que cero', l);
      return Math.floor(Math.random() * tope);
    }),

    /* ---------------------------- matemáticas ----------------------------- */
    abs: fn(1, 1, function (v, l) { return Math.abs(this.aNum(v[0], l)); }),
    arctan: fn(1, 1, function (v, l) { return Math.atan(this.aNum(v[0], l)); }),
    cos: fn(1, 1, function (v, l) { return Math.cos(this.aNum(v[0], l)); }),
    sin: fn(1, 1, function (v, l) { return Math.sin(this.aNum(v[0], l)); }),
    tan: fn(1, 1, function (v, l) { return Math.tan(this.aNum(v[0], l)); }),
    exp: fn(1, 1, function (v, l) { return Math.exp(this.aNum(v[0], l)); }),
    log: fn(1, 1, function (v, l) {
      const x = this.aNum(v[0], l);
      if (x <= 0) errE('log() requiere un valor mayor que cero', l);
      return Math.log10(x);
    }),
    sqrt: fn(1, 1, function (v, l) {
      const x = this.aNum(v[0], l);
      if (x < 0) errE('sqrt() requiere un valor no negativo', l);
      return Math.sqrt(x);
    }),
    int: fn(1, 1, function (v, l) { return Math.trunc(this.aNum(v[0], l)); }),
    inc: async function (n) {
      const [lv] = await lvalues(this, { ...n, args: [n.args[0]] }, 1);
      const a = n.args.length > 1 ? this.aNum(await this.eval(n.args[1]), n.linea) : 1;
      const v = this.aNum(lv.get(), n.linea) + a;
      lv.set(v); return v;
    },
    dec: async function (n) {
      const [lv] = await lvalues(this, { ...n, args: [n.args[0]] }, 1);
      const a = n.args.length > 1 ? this.aNum(await this.eval(n.args[1]), n.linea) : 1;
      const v = this.aNum(lv.get(), n.linea) - a;
      lv.set(v); return v;
    },

    /* ------------------------------ cadenas ------------------------------- */
    ascii: fn(1, 1, function (v, l) { return String.fromCharCode(Math.trunc(this.aNum(v[0], l))); }),
    ord: fn(1, 1, function (v, l) { const s = this.aCad(v[0], l); return s.length ? s.charCodeAt(0) : 0; }),
    lower: fn(1, 1, function (v, l) { return this.aCad(v[0], l).toLowerCase(); }),
    upper: fn(1, 1, function (v, l) { return this.aCad(v[0], l).toUpperCase(); }),
    strlen: fn(1, 1, function (v, l) { return this.aCad(v[0], l).length; }),
    strdup: fn(2, 2, function (v, l) { return this.aCad(v[0], l).repeat(Math.max(0, Math.trunc(this.aNum(v[1], l)))); }),
    substr: fn(2, 3, function (v, l) {
      const s = this.aCad(v[0], l), p = Math.trunc(this.aNum(v[1], l));
      if (p > s.length || p < 1) return '';
      const c = v.length > 2 ? Math.trunc(this.aNum(v[2], l)) : s.length;
      return s.substr(p - 1, Math.max(0, c));
    }),
    pos: fn(2, 3, function (v, l) {
      const s1 = this.aCad(v[0], l), s2 = this.aCad(v[1], l);
      const p = v.length > 2 ? Math.trunc(this.aNum(v[2], l)) : 1;
      return s1.indexOf(s2, Math.max(0, p - 1)) + 1;
    }),
    val: fn(1, 1, function (v, l) { return valorNumerico(this.aCad(v[0], l)); }),
    str: fn(1, 4, function (v, l) {
      const n = this.aNum(v[0], l);
      const anc = v.length > 1 ? Math.trunc(this.aNum(v[1], l)) : 0;
      const dec = v.length > 2 ? Math.trunc(this.aNum(v[2], l)) : 2;
      const rel = v.length > 3 ? (this.aCad(v[3], l) || ' ')[0] : ' ';
      let s = n.toFixed(Math.max(0, dec));
      while (s.length < anc) s = rel + s;
      return s;
    })
  };
  PREDEF.swap = PREDEF.intercambiar;   // sinónimo documentado

  /* ------------------------------------------------------------------ */
  /* Revisión previa: avisos y recomendaciones                           */
  /* ------------------------------------------------------------------ */
  function recorrer(nodo, cb) {
    if (!nodo || typeof nodo !== 'object') return;
    if (Array.isArray(nodo)) { nodo.forEach(n => recorrer(n, cb)); return; }
    if (nodo.t) cb(nodo);
    for (const k in nodo) {
      if (k === 't' || k === 'linea' || k === 'nombre' || k === 'op') continue;
      recorrer(nodo[k], cb);
    }
  }

  const MODIFICAN = ['leer', 'dim', 'inc', 'dec', 'intercambiar', 'swap',
    'get_color', 'get_curpos', 'get_scrsize', 'set_stdin'];

  function modificados(nodos) {
    const out = new Set();
    const raiz = n => { while (n && (n.t === 'indice' || n.t === 'campo')) n = n.base; return n && n.t === 'id' ? n.nombre : null; };
    recorrer(nodos, n => {
      if (n.t === 'asig') { const r = raiz(n.destino); if (r) out.add(r); }
      else if (n.t === 'desde') { const r = raiz(n.ctrl); if (r) out.add(r); }
      else if (n.t === 'llamada') {
        // Una subrutina propia puede recibir parámetros por referencia: se asume lo peor.
        const modifica = !PREDEF[n.nombre] || MODIFICAN.includes(n.nombre);
        if (modifica) n.args.forEach(a => { const r = raiz(a); if (r) out.add(r); });
      }
    });
    return out;
  }

  function revisar(fuente) {
    const avisos = [];
    const add = (linea, mensaje, sugerencia) => avisos.push({ linea, mensaje, sugerencia });
    let ast;
    try { ast = compilar(fuente); } catch (e) { return avisos; }

    // 1. Palabras reservadas o predefinidas escritas con mayúsculas.
    const vistas = new Set();
    for (const t of tokenizar(fuente)) {
      if (t.tipo !== 'id') continue;
      const min = String(t.valor).toLowerCase();
      if (t.valor === min || vistas.has(t.valor)) continue;
      if (RESERVADAS.has(min)) {
        vistas.add(t.valor);
        add(t.linea, `"${t.valor}" se parece a la palabra reservada "${min}"`,
          'Las palabras reservadas de SL se escriben siempre en minúsculas; si no, el compilador las toma como nombres de variables.');
      } else if (PREDEF[min]) {
        vistas.add(t.valor);
        add(t.linea, `"${t.valor}" se parece a la subrutina predefinida "${min}"`,
          `SL distingue mayúsculas de minúsculas: escribí "${min}".`);
      }
    }

    // 2. Identificadores declarados que nunca se usan.
    const usados = new Set(), llamadas = new Set();
    const cuerpos = [ast.cuerpo, ...ast.subs.map(s => s.cuerpo)];
    const inits = [ast.vars, ...ast.subs.map(s => s.vars)];
    recorrer([cuerpos, inits], n => {
      if (n.t === 'id') usados.add(n.nombre);
      if (n.t === 'llamada') llamadas.add(n.nombre);
    });
    const declaradas = [];
    const juntar = (origen, ambito) => {
      (origen.vars || []).forEach(d => d.nombres.forEach(n => declaradas.push({ n, linea: d.linea, ambito })));
      (origen.consts || []).forEach(c => declaradas.push({ n: c.nombre, linea: c.linea, ambito, konst: true }));
      (origen.params || []).forEach(p => declaradas.push({ n: p.nombre, linea: origen.linea, ambito, param: true }));
    };
    juntar(ast, 'el programa principal');
    ast.subs.forEach(s => juntar(s, `la subrutina ${s.nombre}()`));
    declaradas.forEach(d => {
      if (usados.has(d.n)) return;
      add(d.linea, `${d.konst ? 'la constante' : d.param ? 'el parámetro' : 'la variable'} "${d.n}" se declara en ${d.ambito} pero nunca se usa`,
        'Puede que la hayas escrito distinto en otro lado (SL distingue mayúsculas de minúsculas) o que ya no haga falta.');
    });

    // 3. Subrutinas que nunca se llaman.
    ast.subs.forEach(s => {
      if (!llamadas.has(s.nombre))
        add(s.linea, `la subrutina "${s.nombre}" nunca se llama`,
          'Para ejecutarla escribí su nombre seguido de paréntesis en el cuerpo del programa.');
    });

    // 4. El programa no muestra nada.
    if (!llamadas.has('imprimir'))
      add(1, 'el programa nunca llama a imprimir()',
        'Sin imprimir() el programa se ejecuta pero no muestra ningún resultado en pantalla.');

    // 5. Ciclos cuya condición no cambia dentro del cuerpo.
    recorrer(cuerpos, n => {
      if (n.t !== 'mientras' && n.t !== 'repetir') return;
      const enCond = new Set();
      recorrer(n.cond, x => { if (x.t === 'id') enCond.add(x.nombre); });
      if (!enCond.size) return;
      let salidaAlternativa = false;
      recorrer(n.cuerpo, x => {
        if (x.t === 'retorna') salidaAlternativa = true;
        if (x.t === 'llamada' && x.nombre === 'terminar') salidaAlternativa = true;
      });
      if (salidaAlternativa) return;
      const cambian = modificados(n.cuerpo);
      if (![...enCond].some(v => cambian.has(v)))
        add(n.linea, `el ciclo "${n.t}" puede no terminar nunca`,
          `Ninguna de las variables de la condición (${[...enCond].join(', ')}) cambia dentro del ciclo, así que la condición siempre daría el mismo resultado.`);
    });

    return avisos.sort((a, b) => a.linea - b.linea);
  }

  /* ------------------------------------------------------------------ */
  /* API pública                                                         */
  /* ------------------------------------------------------------------ */
  function compilar(fuente, extras, ClaseParser, opciones) {
    return new (ClaseParser || Parser)(tokenizar(fuente, extras, opciones)).programa();
  }

  async function ejecutar(fuente, io, opts) {
    const ast = typeof fuente === 'string' ? compilar(fuente) : fuente;
    const interp = new ((opts && opts.Interprete) || Interprete)(ast, io, opts);
    if (opts && opts.control) opts.control.detener = () => { interp.abortar = true; };
    await interp.run();
    return interp;
  }

  global.SLE2 = {
    compilar, ejecutar, revisar, tokenizar, SLError, RESERVADAS, PREDEF, fmtNum,
    // internos, para construir dialectos encima (ver sle2poo.js)
    Parser, Interprete, Registro, Retorno, Terminado, copiar, recorrer, parecido,
    tipoDeValor, nombreTipo, errC, errE, esArr, esRec, valorNumerico, fn, lvalues
  };
})(window);

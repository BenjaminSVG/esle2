/*
 * Traductor de SLE2 a JavaScript.
 *
 * Toma el AST que devuelve SLE2.compilar() y escribe un programa JavaScript
 * equivalente y legible: la idea es ver el mismo algoritmo en el lenguaje que
 * se va a usar después. No es un compilador optimizador ni pretende cubrir
 * todo el lenguaje; lo que no sabe traducir lo deja anotado como aviso y como
 * comentario en el código, en vez de inventar algo que no funciona.
 *
 * Decisiones que se ven en el resultado:
 *   · los vectores quedan 1-based (la casilla 0 no se usa) para que A[k] siga
 *     significando lo mismo en los dos lenguajes;
 *   · imprimir() acumula en un texto que se muestra al final, así el programa
 *     corre igual en Node y en la consola del navegador;
 *   · leer() consume las líneas de la constante ENTRADA, que queda arriba de
 *     todo para poder cambiarla a mano.
 *
 * API:  TraductorJS.aJS(ast, { entrada }) -> { codigo, avisos }
 */
(function (global) {
  'use strict';

  const RESERVADAS_JS = new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
    'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
    'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let',
    'static', 'await', 'arguments', 'eval']);

  /* ------------------------------------------------------------------ */
  /* Ayudas que se copian al programa traducido (solo las que se usan)   */
  /* ------------------------------------------------------------------ */
  const AYUDAS = {
    salida: `let _salida = "";
function _texto(v) {
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(parseFloat(v.toPrecision(12)));
  return String(v);
}
function imprimir(...valores) { _salida += valores.map(_texto).join(""); }`,

    leer: `let _linea = 0;
function _leerLinea() { return _linea < ENTRADA.length ? ENTRADA[_linea++] : ""; }
let _campos = [];
function _leerCampo() {
  if (!_campos.length) _campos = _leerLinea().split(",");
  return (_campos.shift() ?? "").trim();
}
function leerNumero() { return parseFloat(_leerCampo()) || 0; }
function leerTexto() { return _leerCampo(); }   // una cadena ocupa un campo, igual que un número`,

    vector: `// Los vectores de SLE2 empiezan en 1: la casilla 0 queda sin usar.
function nuevoVector(n, porDefecto) {
  const v = new Array(n + 1);
  for (let i = 1; i <= n; i++) v[i] = typeof porDefecto === "function" ? porDefecto() : porDefecto;
  return v;
}
function alen(v) { return v.length - 1; }`,

    literal: `// Un literal { a, b, ... }: se completa hasta el tamaño del arreglo.
function _literal(n, items, relleno) {
  const v = new Array(n + 1);
  for (let i = 1; i <= n; i++) v[i] = i <= items.length ? items[i - 1] : relleno;
  return v;
}`,

    str: `// str() de SLE2: dos decimales si no se dice otra cosa, y rellena a la izquierda.
function str(n, ancho = 0, decimales = 2, relleno = " ") {
  let t = n.toFixed(Math.max(0, decimales));
  while (t.length < ancho) t = relleno[0] + t;
  return t;
}`,
    val: `function val(s) { return parseFloat(s) || 0; }`,
    strlen: `function strlen(s) { return s.length; }`,
    substr: `function substr(s, desde, cuantos = s.length) {
  if (desde < 1 || desde > s.length) return "";
  return s.substr(desde - 1, Math.max(0, cuantos));
}`,
    pos: `// pos (texto, buscado): en qué posición de texto aparece buscado, o 0.
function pos(texto, buscado, desde = 1) { return texto.indexOf(buscado, Math.max(0, desde - 1)) + 1; }`,
    upper: `function upper(s) { return s.toUpperCase(); }`,
    lower: `function lower(s) { return s.toLowerCase(); }`,
    ord: `function ord(s) { return s.length ? s.charCodeAt(0) : 0; }`,
    ascii: `function ascii(n) { return String.fromCharCode(n); }`,
    int: `function int(n) { return Math.trunc(n); }`,
    strdup: `function strdup(s, n) { return s.repeat(Math.max(0, n)); }`,
    random: `function random(n) { return Math.floor(Math.random() * n) + 1; }`,
    ifval: `function ifval(cond, a, b) { return cond ? a : b; }`,
    terminar: `class _Terminado extends Error {}
function terminar() { throw new _Terminado(); }`
  };

  /* Predefinidas de SLE2 que pasan tal cual a una función de JavaScript. */
  const DIRECTAS = {
    abs: 'Math.abs', sqrt: 'Math.sqrt', sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan',
    exp: 'Math.exp', log: 'Math.log', arctan: 'Math.atan', max: 'Math.max', min: 'Math.min'
  };
  /* Predefinidas que necesitan una de las ayudas de arriba. */
  const CON_AYUDA = {
    str: 'str', val: 'val', strlen: 'strlen', substr: 'substr', pos: 'pos', upper: 'upper',
    lower: 'lower', ord: 'ord', ascii: 'ascii', int: 'int', strdup: 'strdup', random: 'random',
    ifval: 'ifval', alen: 'vector', terminar: 'terminar'
  };

  function aJS(ast, opciones) {
    const opts = opciones || {};
    const avisos = [];
    const ayudas = new Set();
    const tipos = new Map();          // nombre de tipo -> spec
    let ambito = new Map();           // nombre -> spec de tipo (para saber qué es cada cosa)
    let refsEscalares = new Set();    // parámetros ref de tipo simple dentro de la subrutina actual
    const subs = new Map();           // nombre -> declaración

    const aviso = (linea, texto) => { avisos.push({ linea, texto }); return `/* TODO: ${texto} */`; };
    const nombre = n => (RESERVADAS_JS.has(n) ? '_' + n : n);
    const usa = a => { ayudas.add(a); };

    /* --------------------------- tipos --------------------------- */
    function resolver(spec) {
      if (!spec) return null;
      if (spec.k === 'nombre' || (!spec.k && spec.nombre)) return resolver(tipos.get(spec.nombre));
      if (spec.k && !['num', 'cad', 'log', 'arr', 'rec'].includes(spec.k)) return resolver(tipos.get(spec.k));
      return spec;
    }
    /* Los campos de un registro se declaran de a varios: { nombres: [...], tipo }. */
    const camposDe = t => (t.campos || []).flatMap(c => (c.nombres || [c.nombre]).map(n => ({ nombre: n, tipo: c.tipo })));

    const esCadena = spec => { const t = resolver(spec); return t && t.k === 'cad'; };

    function porDefecto(spec) {
      const t = resolver(spec);
      if (!t) return '0';
      switch (t.k) {
        case 'cad': return '""';
        case 'log': return 'false';
        case 'num': return '0';
        case 'rec': return `{ ${camposDe(t).map(c => `${c.nombre}: ${porDefecto(c.tipo)}`).join(', ')} }`;
        case 'arr': {
          usa('vector');
          const dims = t.dims || [];
          if (dims[0] === '*') return 'null';                       // se dimensiona con dim()
          const interno = dims.length > 1
            ? porDefecto({ k: 'arr', dims: dims.slice(1), elem: t.elem })
            : porDefecto(t.elem);
          return `nuevoVector(${dimTexto(dims[0])}, () => (${interno}))`;
        }
        default: return '0';
      }
    }
    const dimTexto = d => (typeof d === 'number' ? String(d) : expr(d));

    const tipoDelLiteral = n => {
      if (!n) return null;
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'id' && ['TRUE', 'FALSE', 'SI', 'NO'].includes(n.nombre)) return { k: 'log' };
      return null;
    };

    /* ------------------------ expresiones ------------------------ */
    function expr(n) {
      switch (n.t) {
        case 'num': return String(n.v);
        case 'cad': return JSON.stringify(n.v);
        case 'id': {
          if (n.nombre === 'TRUE' || n.nombre === 'SI') return 'true';
          if (n.nombre === 'FALSE' || n.nombre === 'NO') return 'false';
          return refsEscalares.has(n.nombre) ? `${nombre(n.nombre)}.v` : nombre(n.nombre);
        }
        case 'indice': return `${expr(n.base)}[${expr(n.idx)}]`;
        case 'campo': return `${expr(n.base)}.${n.nombre}`;
        case 'un':
          if (n.op === 'not') return `!(${expr(n.e)})`;
          return `${n.op}(${expr(n.e)})`;
        case 'bin': return binario(n);
        case 'llamada': return llamada(n, false);
        case 'estruct': return estructura(null, n);
        default: return aviso(n.linea, 'expresión que el traductor no conoce');
      }
    }

    function binario(n) {
      const OPS = { '=': '===', '==': '===', '<>': '!==', '!=': '!==', and: '&&', or: '||' };
      const i = expr(n.i), d = expr(n.d);
      if (n.op === '^') return `Math.pow(${i}, ${d})`;
      if (n.op === '%') { usa('int'); return `(int(${i}) % int(${d}))`; }
      const op = OPS[n.op] || n.op;
      return `(${i} ${op} ${d})`;
    }

    /* Un literal { … } traducido con el tipo de su destino, si se conoce. */
    function estructura(spec, nodo) {
      const t = resolver(spec);
      const items = nodo.items || [];
      if (t && t.k === 'rec') {
        const campos = camposDe(t);
        return `{ ${campos.map((c, i) => `${c.nombre}: ${items[i] ? valorLiteral(c.tipo, items[i]) : porDefecto(c.tipo)}`).join(', ')} }`;
      }
      const dims = (t && t.dims) || [];
      const tElem = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : (t ? t.elem : null);
      const valores = items.map(it => valorLiteral(tElem, it));
      const abierto = !dims.length || dims[0] === '*';
      if (abierto && !nodo.relleno) return `[null, ${valores.join(', ')}]`;
      usa('literal');
      // El "..." final repite el último valor hasta llenar el arreglo.
      const relleno = nodo.relleno && valores.length ? valores[valores.length - 1] : porDefecto(tElem);
      return `_literal(${abierto ? valores.length : dimTexto(dims[0])}, [${valores.join(', ')}], ${relleno})`;
    }
    const valorLiteral = (spec, nodo) => (nodo.t === 'estruct' ? estructura(spec, nodo) : expr(nodo));

    /* ------------------------- llamadas -------------------------- */
    function llamada(n, comoSentencia) {
      const nom = n.nombre;
      const args = n.args || [];

      if (nom === 'imprimir') { usa('salida'); return `imprimir(${args.map(expr).join(', ')})`; }

      if (nom === 'leer') {
        usa('leer'); usa('salida');
        const partes = args.map(a => {
          const t = tipoDe(a);
          if (t && (t.k === 'arr' || t.k === 'rec'))
            return aviso(n.linea, 'leer() de un arreglo o registro entero: hay que hacerlo campo por campo');
          return `${destino(a)} = ${esCadena(t) ? 'leerTexto()' : 'leerNumero()'}`;
        });
        return partes.join(comoSentencia ? ';\n' + sangria() : ', ');
      }

      if (nom === 'dim') {
        usa('vector');
        const t = resolver(tipoDe(args[0]));
        const elem = t && t.dims && t.dims.length > 1
          ? porDefecto({ k: 'arr', dims: t.dims.slice(1), elem: t.elem })
          : (t ? porDefecto(t.elem) : '0');
        if (args.length === 2) return `${destino(args[0])} = nuevoVector(${expr(args[1])}, () => (${elem}))`;
        if (args.length === 3)
          return `${destino(args[0])} = nuevoVector(${expr(args[1])}, () => nuevoVector(${expr(args[2])}, () => (${elem})))`;
        return aviso(n.linea, 'dim() con más de dos dimensiones');
      }

      if (nom === 'inc' || nom === 'dec') {
        const paso = args[1] ? expr(args[1]) : '1';
        return `${destino(args[0])} ${nom === 'inc' ? '+=' : '-='} ${paso}`;
      }
      if (nom === 'intercambiar' || nom === 'swap')
        return `[${destino(args[0])}, ${destino(args[1])}] = [${destino(args[1])}, ${destino(args[0])}]`;
      if (nom === 'cls') { usa('salida'); return '_salida = ""'; }

      if (DIRECTAS[nom]) return `${DIRECTAS[nom]}(${args.map(expr).join(', ')})`;
      if (CON_AYUDA[nom]) { usa(CON_AYUDA[nom]); return `${nom}(${args.map(expr).join(', ')})`; }

      const sub = subs.get(nom);
      if (sub) return llamadaASubrutina(sub, n, comoSentencia);

      return aviso(n.linea, `la subrutina predefinida "${nom}()" no tiene equivalente directo`);
    }

    /* Las referencias a arreglos y registros funcionan solas (JavaScript ya
       los pasa por referencia); las de tipo simple se envuelven en una caja. */
    function llamadaASubrutina(sub, n, comoSentencia) {
      const cajas = [];
      const args = (n.args || []).map((a, i) => {
        const p = sub.params[i];
        if (!p || !p.porRef) return expr(a);
        const t = resolver(p.tipo);
        if (t && (t.k === 'arr' || t.k === 'rec')) return expr(a);
        if (!comoSentencia) {
          aviso(n.linea, `"${n.nombre}()" usa ref dentro de una expresión: revisá esa línea a mano`);
          return expr(a);
        }
        const caja = `_ref${cajas.length + 1}`;
        cajas.push({ caja, destino: destino(a) });
        return caja;
      });
      const llamado = `${nombre(n.nombre)}(${args.join(', ')})`;
      if (!cajas.length) return llamado;
      const s = sangria();
      return `{\n${s}  ${cajas.map(c => `const ${c.caja} = { v: ${c.destino} };`).join('\n' + s + '  ')}\n`
        + `${s}  ${llamado};\n`
        + `${s}  ${cajas.map(c => `${c.destino} = ${c.caja}.v;`).join('\n' + s + '  ')}\n${s}}`;
    }

    /* Un destino asignable (lo que en SLE2 sería un lvalue). */
    function destino(n) {
      if (!n) return '_';
      if (n.t === 'id') return refsEscalares.has(n.nombre) ? `${nombre(n.nombre)}.v` : nombre(n.nombre);
      if (n.t === 'indice') return `${expr(n.base)}[${expr(n.idx)}]`;
      if (n.t === 'campo') return `${expr(n.base)}.${n.nombre}`;
      return expr(n);
    }

    /* Tipo declarado de una expresión, si se puede saber. */
    function tipoDe(n) {
      if (!n) return null;
      if (n.t === 'id') return resolver(ambito.get(n.nombre));
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'indice') {
        const b = resolver(tipoDe(n.base));
        if (!b) return null;
        if (b.k === 'cad') return { k: 'cad' };
        if (b.k !== 'arr') return null;
        return b.dims.length > 1 ? resolver({ k: 'arr', dims: b.dims.slice(1), elem: b.elem }) : resolver(b.elem);
      }
      if (n.t === 'campo') {
        const b = resolver(tipoDe(n.base));
        const c = b && b.k === 'rec' && camposDe(b).find(x => x.nombre === n.nombre);
        return c ? resolver(c.tipo) : null;
      }
      return null;
    }

    /* ------------------------- sentencias ------------------------ */
    let nivel = 1;
    const sangria = () => '  '.repeat(nivel);

    function bloque(lista) {
      nivel++;
      const s = (lista || []).map(x => sangria() + sentencia(x)).join('\n');
      nivel--;
      return s;
    }

    function sentencia(s) {
      switch (s.t) {
        case 'asig': {
          if (s.valor.t === 'estruct') return `${destino(s.destino)} = ${estructura(tipoDe(s.destino), s.valor)};`;
          return `${destino(s.destino)} = ${expr(s.valor)};`;
        }
        case 'exprStmt': {
          const c = s.expr.t === 'llamada' ? llamada(s.expr, true) : expr(s.expr);
          return c.endsWith('}') ? c : c + ';';
        }
        case 'si': {
          let t = `if (${expr(s.cond)}) {\n${bloque(s.entonces)}\n${sangria()}}`;
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'mientras':
          return `while (${expr(s.cond)}) {\n${bloque(s.cuerpo)}\n${sangria()}}`;
        case 'repetir':
          return `do {\n${bloque(s.cuerpo)}\n${sangria()}} while (!(${expr(s.cond)}));`;
        case 'desde': {
          const k = destino(s.ctrl);
          const paso = s.paso ? expr(s.paso) : '1';
          const negativo = /^-/.test(paso);
          const cmp = negativo ? '>=' : '<=';
          return `for (${k} = ${expr(s.desde)}; ${k} ${cmp} ${expr(s.hasta)}; ${k} += ${paso}) {\n${bloque(s.cuerpo)}\n${sangria()}}`;
        }
        case 'eval': {
          const partes = s.casos.map((c, i) =>
            `${i ? ' else ' : ''}if (${expr(c.cond)}) {\n${bloque(c.cuerpo)}\n${sangria()}}`);
          let t = partes.join('');
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'retorna':
          return s.valor ? `return ${expr(s.valor)};` : 'return;';
        default:
          return aviso(s.linea, `sentencia "${s.t}" que el traductor no conoce`);
      }
    }

    /* ----------------------- declaraciones ----------------------- */
    function declaraciones(prog, palabra) {
      const lineas = [];
      for (const c of prog.consts || []) {
        ambito.set(c.nombre, { k: typeof c.valor.v === 'string' ? 'cad' : 'num' });
        lineas.push(`const ${nombre(c.nombre)} = ${expr(c.valor)};`);
      }
      for (const d of prog.vars || []) {
        // Sin tipo escrito, SLE2 lo deduce del valor inicial; acá hace falta saberlo
        // para elegir entre leerNumero() y leerTexto().
        const tipoDecl = d.tipo || tipoDelLiteral(d.init);
        for (const n of d.nombres) {
          ambito.set(n, tipoDecl);
          const inicial = d.init && d.init.t !== 'estruct' ? expr(d.init)
            : d.init ? estructura(tipoDecl, d.init)
              : porDefecto(tipoDecl);
          lineas.push(`${palabra} ${nombre(n)} = ${inicial};`);
        }
      }
      return lineas;
    }

    /* --------------------------- armado -------------------------- */
    for (const t of ast.tipos || []) tipos.set(t.nombre, t.tipo);
    for (const s of ast.subs || []) subs.set(s.nombre, s);

    const globales = declaraciones(ast, 'let');
    const ambitoGlobal = new Map(ambito);

    nivel = 0;
    const cuerpo = bloque(ast.cuerpo).replace(/^/gm, '');
    nivel = 1;

    /* subrutinas */
    const funciones = (ast.subs || []).map(sub => {
      ambito = new Map(ambitoGlobal);
      refsEscalares = new Set();
      const params = [];
      for (const p of sub.params || []) {
        ambito.set(p.nombre, p.tipo);
        const t = resolver(p.tipo);
        if (p.porRef && t && t.k !== 'arr' && t.k !== 'rec') refsEscalares.add(p.nombre);
        params.push(nombre(p.nombre));
      }
      const locales = declaraciones(sub, 'let').map(l => '  ' + l);
      nivel = 0;
      const cuerpoSub = bloque(sub.cuerpo);
      nivel = 1;
      const cabecera = sub.retorna
        ? `/* función: en SLE2 devuelve ${sub.retorna.k === 'cad' ? 'una cadena' : 'un valor'} */\n`
        : '';
      return `${cabecera}function ${nombre(sub.nombre)}(${params.join(', ')}) {\n`
        + (locales.length ? locales.join('\n') + '\n' : '')
        + cuerpoSub + '\n}';
    });
    ambito = ambitoGlobal;

    /* ayudas que hicieron falta, en un orden estable */
    const orden = ['salida', 'leer', 'vector', 'literal', 'str', 'val', 'strlen', 'substr', 'pos', 'upper',
      'lower', 'ord', 'ascii', 'int', 'strdup', 'random', 'ifval', 'terminar'];
    if (ayudas.has('str')) ayudas.add('salida');          // str() usa _texto()
    const textoAyudas = orden.filter(a => ayudas.has(a)).map(a => AYUDAS[a]).join('\n\n');

    const entrada = (opts.entrada || '').replace(/\r/g, '');
    const lineasEntrada = entrada.length ? entrada.split('\n') : [];

    const codigo = [
      `/*`,
      ` * Traducción a JavaScript de un programa ESLE2${ast.nombre ? ` («${ast.nombre}»)` : ''}.`,
      ` * Generada por https://esle2.vercel.app — se puede correr con:  node programa.js`,
      ` *`,
      ` * Los vectores conservan los índices desde 1: la casilla 0 queda sin usar.`,
      ` */`,
      `'use strict';`,
      ``,
      `// Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.`,
      `const ENTRADA = ${JSON.stringify(lineasEntrada)};`,
      ``,
      textoAyudas ? `// ---------- ayudas que imitan a las subrutinas de SLE2 ----------\n${textoAyudas}\n` : '',
      globales.length ? `// ---------- variables del programa ----------\n${globales.join('\n')}\n` : '',
      `// ---------- programa principal ----------`,
      `function principal() {`,
      cuerpo,
      `}`,
      ``,
      funciones.length ? funciones.join('\n\n') + '\n' : '',
      ayudas.has('terminar')
        ? `try { principal(); } catch (e) { if (!(e instanceof _Terminado)) throw e; }`
        : `principal();`,
      ayudas.has('salida') ? `console.log(_salida);` : ''
    ].filter(l => l !== '').join('\n');

    return { codigo: codigo.replace(/\n{3,}/g, '\n\n') + '\n', avisos };
  }

  global.TraductorJS = { aJS };
})(typeof window !== 'undefined' ? window : globalThis);

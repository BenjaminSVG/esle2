/*
 * Traductor de SLE2 a Python.
 *
 * Mismo criterio que js/traducir.js: escribir el mismo algoritmo en el otro
 * lenguaje, legible, sin dependencias y listo para correr con
 *   python programa.py
 *
 * Diferencias con la traducción a JavaScript, propias de Python:
 *   · los vectores se hacen con listas de n+1 elementos (la casilla 0 no se usa)
 *     para conservar los índices desde 1;
 *   · los registros son objetos simples (SimpleNamespace), así r.campo se
 *     escribe igual que en SLE2;
 *   · las funciones que tocan variables del programa llevan su "global";
 *   · el operador % de SLE2 trunca como en C, que no es lo que hace Python con
 *     números negativos: por eso va una ayuda propia.
 *
 * API:  TraductorPY.aPython(ast, { entrada }) -> { codigo, avisos }
 */
(function (global) {
  'use strict';

  const RESERVADAS_PY = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
    'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'try', 'while', 'with', 'yield', 'print', 'input', 'list', 'str', 'int', 'len',
    'max', 'min', 'abs', 'range', 'type', 'dict', 'set', 'sum', 'id', 'pos', 'val']);

  const AYUDAS = {
    salida: `_salida = ""

def _texto(v):
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v)

def imprimir(*valores):
    global _salida
    _salida += "".join(_texto(v) for v in valores)`,

    leer: `_linea = 0
_campos = []

def _leer_campo():
    global _linea, _campos
    while not _campos:
        if _linea >= len(ENTRADA):
            return ""
        _campos = ENTRADA[_linea].split(",")
        _linea += 1
    return _campos.pop(0).strip()

def leer_numero():
    global _campos
    t = _leer_campo()
    try:
        return float(t)
    except ValueError:
        return 0.0

def leer_texto():
    # Una cadena ocupa un campo, igual que un número.
    return _leer_campo()`,

    vector: `def nuevo_vector(n, por_defecto=0):
    """Los vectores de SLE2 empiezan en 1: la casilla 0 queda sin usar."""
    return [None] + [por_defecto() if callable(por_defecto) else por_defecto for _ in range(int(n))]

def alen(v):
    return len(v) - 1`,

    literal: `def _literal(n, items, relleno=0):
    v = nuevo_vector(n, relleno)
    for i, x in enumerate(items, start=1):
        v[i] = x
    return v`,

    registro: `from types import SimpleNamespace as Registro`,

    modulo: `def modulo(a, b):
    """El % de SLE2 trunca hacia cero, como en C (Python redondea al revés)."""
    a, b = int(a), int(b)
    r = abs(a) % abs(b)
    return -r if a < 0 else r`,

    str: `def str_(n, ancho=0, decimales=2, relleno=" "):
    t = ("%." + str(int(decimales)) + "f") % n
    return t.rjust(int(ancho), relleno[0])`,
    val: `def val(s):
    try:
        return float(s)
    except ValueError:
        return 0.0`,
    strlen: `def strlen(s):
    return len(s)`,
    substr: `def substr(s, desde, cuantos=None):
    desde = int(desde)
    if desde < 1 or desde > len(s):
        return ""
    return s[desde - 1:] if cuantos is None else s[desde - 1:desde - 1 + int(cuantos)]`,
    pos: `def pos(texto, buscado, desde=1):
    return texto.find(buscado, max(0, int(desde) - 1)) + 1`,
    upper: `def upper(s):
    return s.upper()`,
    lower: `def lower(s):
    return s.lower()`,
    ord: `def ord_(s):
    return ord(s[0]) if s else 0`,
    ascii: `def ascii_(n):
    return chr(int(n))`,
    int: `def int_(n):
    return float(int(n))`,
    strdup: `def strdup(s, n):
    return s * max(0, int(n))`,
    random: `import random as _random_mod

def random_(n):
    return float(_random_mod.randint(1, int(n)))`,
    ifval: `def ifval(cond, a, b):
    return a if cond else b`,
    terminar: `class _Terminado(Exception):
    pass

def terminar():
    raise _Terminado()`,
    rango: `def _rango(desde, hasta, paso=1):
    """El ciclo desde…hasta de SLE2 incluye el extremo."""
    k = desde
    while (k <= hasta) if paso > 0 else (k >= hasta):
        yield k
        k += paso`,
    matematica: `import math`
  };

  /* Predefinidas que van directo a algo de Python. */
  const DIRECTAS = {
    abs: 'abs', max: 'max', min: 'min',
    sqrt: 'math.sqrt', sin: 'math.sin', cos: 'math.cos', tan: 'math.tan',
    exp: 'math.exp', log: 'math.log', arctan: 'math.atan'
  };
  /* Predefinidas que se traducen a una ayuda (a veces con otro nombre). */
  const CON_AYUDA = {
    str: ['str', 'str_'], val: ['val', 'val'], strlen: ['strlen', 'strlen'],
    substr: ['substr', 'substr'], pos: ['pos', 'pos'], upper: ['upper', 'upper'],
    lower: ['lower', 'lower'], ord: ['ord', 'ord_'], ascii: ['ascii', 'ascii_'],
    int: ['int', 'int_'], strdup: ['strdup', 'strdup'], random: ['random', 'random_'],
    ifval: ['ifval', 'ifval'], alen: ['vector', 'alen'], terminar: ['terminar', 'terminar']
  };

  function aPython(ast, opciones) {
    const opts = opciones || {};
    const avisos = [];
    const ayudas = new Set();
    const tipos = new Map();
    const subs = new Map();
    let ambito = new Map();
    let refsEscalares = new Set();
    let locales = new Set();          // nombres declarados en la subrutina actual
    let globalesUsadas = new Set();   // globales que la subrutina actual modifica

    const aviso = (linea, texto) => { avisos.push({ linea, texto }); return `pass  # TODO: ${texto}`; };
    const nombre = n => (RESERVADAS_PY.has(n) ? n + '_' : n);
    const usa = a => { ayudas.add(a); };

    /* ---------------------------- tipos ---------------------------- */
    function resolver(spec) {
      if (!spec) return null;
      if (spec.k === 'nombre') return resolver(tipos.get(spec.nombre));
      if (spec.k && !['num', 'cad', 'log', 'arr', 'rec'].includes(spec.k)) return resolver(tipos.get(spec.k));
      return spec;
    }
    const camposDe = t => (t.campos || []).flatMap(c => (c.nombres || [c.nombre]).map(n => ({ nombre: n, tipo: c.tipo })));
    const esCadena = spec => { const t = resolver(spec); return t && t.k === 'cad'; };

    function porDefecto(spec) {
      const t = resolver(spec);
      if (!t) return '0';
      switch (t.k) {
        case 'cad': return '""';
        case 'log': return 'False';
        case 'num': return '0';
        case 'rec':
          usa('registro');
          return `Registro(${camposDe(t).map(c => `${c.nombre}=${porDefecto(c.tipo)}`).join(', ')})`;
        case 'arr': {
          usa('vector');
          const dims = t.dims || [];
          if (dims[0] === '*') return 'None';
          const interno = dims.length > 1
            ? porDefecto({ k: 'arr', dims: dims.slice(1), elem: t.elem })
            : porDefecto(t.elem);
          return `nuevo_vector(${dimTexto(dims[0])}, lambda: ${interno})`;
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

    /* -------------------------- expresiones ------------------------- */
    function expr(n) {
      switch (n.t) {
        case 'num': return String(n.v);
        case 'cad': return JSON.stringify(n.v);
        case 'id': {
          if (n.nombre === 'TRUE' || n.nombre === 'SI') return 'True';
          if (n.nombre === 'FALSE' || n.nombre === 'NO') return 'False';
          return refsEscalares.has(n.nombre) ? `${nombre(n.nombre)}[0]` : nombre(n.nombre);
        }
        case 'indice': return `${expr(n.base)}[${indice(n)}]`;
        case 'campo': return `${expr(n.base)}.${n.nombre}`;
        case 'un':
          if (n.op === 'not') return `(not ${expr(n.e)})`;
          return `${n.op}(${expr(n.e)})`;
        case 'bin': return binario(n);
        case 'llamada': return llamada(n, false);
        case 'estruct': return estructura(null, n);
        default: return aviso(n.linea, 'expresión que el traductor no conoce');
      }
    }

    /* Los índices son enteros: en SLE2 los números son todos reales. */
    const entero = t => (/^-?\d+$/.test(t) ? t : `int(${t})`);
    const indice = n => entero(expr(n.idx));

    function binario(n) {
      const OPS = { '=': '==', '==': '==', '<>': '!=', '!=': '!=', and: 'and', or: 'or' };
      const i = expr(n.i), d = expr(n.d);
      if (n.op === '^') return `(${i} ** ${d})`;
      if (n.op === '%') { usa('modulo'); return `modulo(${i}, ${d})`; }
      return `(${i} ${OPS[n.op] || n.op} ${d})`;
    }

    function estructura(spec, nodo) {
      const t = resolver(spec);
      const items = nodo.items || [];
      if (t && t.k === 'rec') {
        usa('registro');
        const campos = camposDe(t);
        return `Registro(${campos.map((c, i) =>
          `${c.nombre}=${items[i] ? valorLiteral(c.tipo, items[i]) : porDefecto(c.tipo)}`).join(', ')})`;
      }
      const dims = (t && t.dims) || [];
      const tElem = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : (t ? t.elem : null);
      const valores = items.map(it => valorLiteral(tElem, it));
      const abierto = !dims.length || dims[0] === '*';
      if (abierto && !nodo.relleno) return `[None, ${valores.join(', ')}]`;
      usa('vector'); usa('literal');
      const relleno = nodo.relleno && valores.length ? valores[valores.length - 1] : porDefecto(tElem);
      return `_literal(${abierto ? valores.length : dimTexto(dims[0])}, [${valores.join(', ')}], ${relleno})`;
    }
    const valorLiteral = (spec, nodo) => (nodo.t === 'estruct' ? estructura(spec, nodo) : expr(nodo));

    /* --------------------------- llamadas --------------------------- */
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
          return `${destino(a)} = ${esCadena(t) ? 'leer_texto()' : 'leer_numero()'}`;
        });
        if (!comoSentencia && partes.length) return aviso(n.linea, 'leer() dentro de una expresión');
        return partes.join('\n' + sangria());
      }

      if (nom === 'dim') {
        usa('vector');
        const t = resolver(tipoDe(args[0]));
        const elem = t && t.dims && t.dims.length > 1
          ? porDefecto({ k: 'arr', dims: t.dims.slice(1), elem: t.elem })
          : (t ? porDefecto(t.elem) : '0');
        if (args.length === 2) return `${destino(args[0])} = nuevo_vector(${expr(args[1])}, lambda: ${elem})`;
        if (args.length === 3)
          return `${destino(args[0])} = nuevo_vector(${expr(args[1])}, lambda: nuevo_vector(${expr(args[2])}, lambda: ${elem}))`;
        return aviso(n.linea, 'dim() con más de dos dimensiones');
      }

      if (nom === 'inc' || nom === 'dec')
        return `${destino(args[0])} ${nom === 'inc' ? '+=' : '-='} ${args[1] ? expr(args[1]) : '1'}`;
      if (nom === 'intercambiar' || nom === 'swap')
        return `${destino(args[0])}, ${destino(args[1])} = ${destino(args[1])}, ${destino(args[0])}`;
      if (nom === 'cls') { usa('salida'); return '_salida = ""'; }

      if (DIRECTAS[nom]) {
        if (DIRECTAS[nom].startsWith('math.')) usa('matematica');
        return `${DIRECTAS[nom]}(${args.map(expr).join(', ')})`;
      }
      if (CON_AYUDA[nom]) {
        const [ayuda, nombrePy] = CON_AYUDA[nom];
        usa(ayuda);
        return `${nombrePy}(${args.map(expr).join(', ')})`;
      }

      const sub = subs.get(nom);
      if (sub) return llamadaASubrutina(sub, n, comoSentencia);
      return aviso(n.linea, `la subrutina predefinida "${nom}()" no tiene equivalente directo`);
    }

    /* Los parámetros ref de tipo simple viajan en una lista de un elemento;
       los arreglos y registros ya se pasan por referencia en Python. */
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
      return cajas.map(c => `${c.caja} = [${c.destino}]`).join('\n' + s)
        + '\n' + s + llamado
        + '\n' + s + cajas.map(c => `${c.destino} = ${c.caja}[0]`).join('\n' + s);
    }

    function destino(n) {
      if (!n) return '_'
      if (n.t === 'id') {
        anotarAsignacion(n.nombre);
        return refsEscalares.has(n.nombre) ? `${nombre(n.nombre)}[0]` : nombre(n.nombre);
      }
      if (n.t === 'indice') return `${expr(n.base)}[${indice(n)}]`;
      if (n.t === 'campo') return `${expr(n.base)}.${n.nombre}`;
      return expr(n);
    }

    /* Python necesita declarar "global" lo que una función modifica. */
    function anotarAsignacion(n) {
      if (!enSubrutina) return;
      if (locales.has(n) || refsEscalares.has(n)) return;
      if (ambitoGlobal.has(n)) globalesUsadas.add(nombre(n));
    }

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

    /* -------------------------- sentencias -------------------------- */
    let nivel = 1;
    const sangria = () => '    '.repeat(nivel);

    function bloque(lista) {
      nivel++;
      const s = (lista && lista.length)
        ? lista.map(x => sangria() + sentencia(x)).join('\n')
        : sangria() + 'pass';
      nivel--;
      return s;
    }

    function sentencia(s) {
      switch (s.t) {
        case 'asig': {
          const d = destino(s.destino);
          if (s.valor.t === 'estruct') return `${d} = ${estructura(tipoDe(s.destino), s.valor)}`;
          return `${d} = ${expr(s.valor)}`;
        }
        case 'exprStmt':
          return s.expr.t === 'llamada' ? llamada(s.expr, true) : expr(s.expr);
        case 'si': {
          let t = `if ${expr(s.cond)}:\n${bloque(s.entonces)}`;
          if (s.sino && s.sino.length) t += `\n${sangria()}else:\n${bloque(s.sino)}`;
          return t;
        }
        case 'mientras':
          return `while ${expr(s.cond)}:\n${bloque(s.cuerpo)}`;
        case 'repetir':
          nivel++;
          var corte = `${sangria()}if ${expr(s.cond)}:\n${sangria()}    break`;
          nivel--;
          return `while True:\n${bloque(s.cuerpo)}\n${corte}`;
        case 'desde': {
          const k = destino(s.ctrl);
          const desde = expr(s.desde), hasta = expr(s.hasta);
          const paso = s.paso ? expr(s.paso) : '1';
          if (/^-?\d+$/.test(paso)) {
            const p = Number(paso);
            // El "hasta" de SLE2 incluye el extremo; el range de Python, no.
            const fin = /^-?\d+$/.test(hasta) ? String(Number(hasta) + (p > 0 ? 1 : -1))
              : entero(p > 0 ? `${hasta} + 1` : `${hasta} - 1`);
            return `for ${k} in range(${entero(desde)}, ${fin}, ${p}):\n${bloque(s.cuerpo)}`;
          }
          usa('rango');
          return `for ${k} in _rango(${desde}, ${hasta}, ${paso}):\n${bloque(s.cuerpo)}`;
        }
        case 'eval': {
          const partes = s.casos.map((c, i) =>
            `${i ? sangria() + 'el' : ''}if ${expr(c.cond)}:\n${bloque(c.cuerpo)}`);
          let t = partes.join('\n');
          if (s.sino && s.sino.length) t += `\n${sangria()}else:\n${bloque(s.sino)}`;
          return t;
        }
        case 'retorna':
          return s.valor ? `return ${expr(s.valor)}` : 'return';
        default:
          return aviso(s.linea, `sentencia "${s.t}" que el traductor no conoce`);
      }
    }

    /* ------------------------ declaraciones ------------------------- */
    function declaraciones(prog) {
      const lineas = [];
      for (const c of prog.consts || []) {
        ambito.set(c.nombre, tipoDelLiteral(c.valor));
        lineas.push(`${nombre(c.nombre)} = ${expr(c.valor)}`);
      }
      for (const d of prog.vars || []) {
        const tipoDecl = d.tipo || tipoDelLiteral(d.init);
        for (const n of d.nombres) {
          ambito.set(n, tipoDecl);
          const inicial = d.init && d.init.t !== 'estruct' ? expr(d.init)
            : d.init ? estructura(tipoDecl, d.init)
              : porDefecto(tipoDecl);
          lineas.push(`${nombre(n)} = ${inicial}`);
        }
      }
      return lineas;
    }

    /* ---------------------------- armado ---------------------------- */
    for (const t of ast.tipos || []) tipos.set(t.nombre, t.tipo);
    for (const s of ast.subs || []) subs.set(s.nombre, s);

    let enSubrutina = false;
    const globales = declaraciones(ast);
    const ambitoGlobal = new Map(ambito);

    /* cuerpo principal */
    enSubrutina = true;
    locales = new Set();
    globalesUsadas = new Set();
    nivel = 0;
    const cuerpoPrincipal = bloque(ast.cuerpo);
    const globalesPrincipal = [...globalesUsadas];
    nivel = 1;

    /* subrutinas */
    const funciones = (ast.subs || []).map(sub => {
      ambito = new Map(ambitoGlobal);
      refsEscalares = new Set();
      locales = new Set();
      globalesUsadas = new Set();
      const params = [];
      for (const p of sub.params || []) {
        ambito.set(p.nombre, p.tipo);
        locales.add(p.nombre);
        const t = resolver(p.tipo);
        if (p.porRef && t && t.k !== 'arr' && t.k !== 'rec') refsEscalares.add(p.nombre);
        params.push(nombre(p.nombre));
      }
      const decls = declaraciones(sub);
      for (const d of sub.vars || []) d.nombres.forEach(n => locales.add(n));
      for (const c of sub.consts || []) locales.add(c.nombre);

      nivel = 0;
      const cuerpo = bloque(sub.cuerpo);
      nivel = 1;
      const cabecera = [`def ${nombre(sub.nombre)}(${params.join(', ')}):`];
      if (globalesUsadas.size) cabecera.push(`    global ${[...globalesUsadas].join(', ')}`);
      decls.forEach(l => cabecera.push('    ' + l));
      return cabecera.join('\n') + '\n' + cuerpo;
    });
    ambito = ambitoGlobal;
    enSubrutina = false;

    /* ayudas, en un orden estable */
    if (ayudas.has('str')) ayudas.add('salida');
    if (ayudas.has('literal')) ayudas.add('vector');
    const orden = ['matematica', 'random', 'registro', 'salida', 'leer', 'vector', 'literal',
      'modulo', 'rango', 'str', 'val', 'strlen', 'substr', 'pos', 'upper', 'lower', 'ord',
      'ascii', 'int', 'strdup', 'ifval', 'terminar'];
    const textoAyudas = orden.filter(a => ayudas.has(a)).map(a => AYUDAS[a]).join('\n\n');

    const entrada = (opts.entrada || '').replace(/\r/g, '');
    const lineasEntrada = entrada.length ? entrada.split('\n') : [];

    const partes = [
      `"""`,
      `Traducción a Python de un programa ESLE2${ast.nombre ? ` («${ast.nombre}»)` : ''}.`,
      `Generada por https://esle2.vercel.app — se puede correr con:  python programa.py`,
      ``,
      `Los vectores conservan los índices desde 1: la casilla 0 queda sin usar.`,
      `"""`,
      ``,
      `# Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.`,
      `ENTRADA = ${JSON.stringify(lineasEntrada)}`,
      ``
    ];
    if (textoAyudas) partes.push(`# ---------- ayudas que imitan a las subrutinas de SLE2 ----------`, textoAyudas, ``);
    if (globales.length) partes.push(`# ---------- variables del programa ----------`, globales.join('\n'), ``);
    if (funciones.length) partes.push(funciones.join('\n\n'), ``);

    partes.push(`# ---------- programa principal ----------`, `def principal():`);
    if (globalesPrincipal.length) partes.push(`    global ${globalesPrincipal.join(', ')}`);
    partes.push(cuerpoPrincipal, ``);

    partes.push(ayudas.has('terminar')
      ? `try:\n    principal()\nexcept _Terminado:\n    pass`
      : `principal()`);
    if (ayudas.has('salida')) partes.push(`print(_salida)`);

    return { codigo: partes.join('\n').replace(/\n{3,}/g, '\n\n\n') + '\n', avisos };
  }

  global.TraductorPY = { aPython };
})(typeof window !== 'undefined' ? window : globalThis);

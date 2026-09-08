/*
 * Traductor de ESLE2 POO a Python y a Java.
 *
 * La idea es la misma que en js/traducir.js y js/traducir-py.js: ver el mismo
 * programa —clases incluidas— escrito en el lenguaje que se va a usar después.
 * Cada salida es un archivo solo, sin dependencias, listo para correr:
 *
 *   python programa.py
 *   javac Programa.java && java Programa
 *
 * Cómo se traduce cada cosa de la POO de ESLE2:
 *
 *   ESLE2 POO            Python                    Java
 *   clase X { }          class X:                  static class X
 *   hereda de Y          class X(Y)                extends Y
 *   clase abstracta      método que lanza error    abstract class
 *   constructor          __init__                  constructor
 *   este.x               self.x                    this.x
 *   padre.m()            super().m()               super.m()
 *   padre.constructor()  super().__init__()        super(...)
 *   compartido           atributo de clase         static
 *   nuevo X (…)          X(…)                      new X(…)
 *   o es X               isinstance(o, X)          o instanceof X
 *   clase_de (o)         type(o).__name__          o.getClass().getSimpleName()
 *   texto ()             __str__                   toString()
 *
 * API:  TraductorPOO.aPython(ast, { entrada }) -> { codigo, avisos }
 *       TraductorPOO.aJava(ast, { entrada })   -> { codigo, avisos, archivo }
 */
(function (global) {
  'use strict';

  const RESERVADAS_PY = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await',
    'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
    'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise',
    'return', 'try', 'while', 'with', 'yield', 'print', 'input', 'list', 'str', 'int', 'len',
    'max', 'min', 'abs', 'range', 'type', 'dict', 'set', 'sum', 'id', 'pos', 'val', 'self']);

  const RESERVADAS_JAVA = new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch',
    'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends',
    'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
    'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return',
    'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws',
    'transient', 'try', 'void', 'volatile', 'while', 'var', 'record', 'main', 'String']);

  /* ------------------------------------------------------------------ */
  /* Cosas que sirven para los dos idiomas                               */
  /* ------------------------------------------------------------------ */
  function contexto(ast) {
    const tipos = new Map();
    (ast.tipos || []).forEach(t => tipos.set(t.nombre, t.tipo));
    const clases = new Map();
    (ast.clases || []).forEach(c => clases.set(c.nombre, c));

    const resolver = spec => {
      if (!spec) return null;
      if (spec.k === 'nombre') {
        if (clases.has(spec.nombre)) return { k: 'obj', clase: spec.nombre };
        return resolver(tipos.get(spec.nombre));
      }
      if (spec.k && !['num', 'cad', 'log', 'arr', 'rec', 'obj'].includes(spec.k)) {
        if (clases.has(spec.k)) return { k: 'obj', clase: spec.k };
        return resolver(tipos.get(spec.k));
      }
      return spec;
    };
    const camposDe = t => (t.campos || []).flatMap(c =>
      (c.nombres || [c.nombre]).map(n => ({ nombre: n, tipo: c.tipo })));
    const tipoDelLiteral = n => {
      if (!n) return null;
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'id' && ['TRUE', 'FALSE', 'SI', 'NO'].includes(n.nombre)) return { k: 'log' };
      if (n.t === 'nuevo') return { k: 'obj', clase: n.clase };
      return null;
    };
    /* Nombre del tipo declarado tal como lo escribió el programa (para Java). */
    const nombreSpec = spec => (spec && (spec.nombre || (typeof spec.k === 'string' ? spec.k : ''))) || '';

    return { tipos, clases, resolver, camposDe, tipoDelLiteral, nombreSpec };
  }

  /* ================================================================== */
  /* Python                                                              */
  /* ================================================================== */
  const AYUDAS_PY = {
    salida: `_salida = ""

def _texto(v):
    if v is None:
        return "nulo"
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
    try:
        return float(_leer_campo())
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
    return (("%." + str(int(decimales)) + "f") % n).rjust(int(ancho), relleno[0])`,
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
    int: `def int_(n):
    return float(int(n))`,
    ord: `def ord_(s):
    return ord(s[0]) if s else 0`,
    ascii: `def ascii_(n):
    return chr(int(n))`,
    ifval: `def ifval(cond, a, b):
    return a if cond else b`,
    matematica: `import math`,
    rango: `def _rango(desde, hasta, paso=1):
    k = desde
    while (k <= hasta) if paso > 0 else (k >= hasta):
        yield k
        k += paso`
  };

  const DIRECTAS_PY = {
    abs: 'abs', max: 'max', min: 'min', sqrt: 'math.sqrt', sin: 'math.sin', cos: 'math.cos',
    tan: 'math.tan', exp: 'math.exp', log: 'math.log', arctan: 'math.atan'
  };
  const AYUDA_PY = {
    str: ['str', 'str_'], val: ['val', 'val'], strlen: ['strlen', 'strlen'], substr: ['substr', 'substr'],
    pos: ['pos', 'pos'], upper: ['upper', 'upper'], lower: ['lower', 'lower'], int: ['int', 'int_'],
    ord: ['ord', 'ord_'], ascii: ['ascii', 'ascii_'], ifval: ['ifval', 'ifval'], alen: ['vector', 'alen']
  };

  function aPython(ast, opciones) {
    const opts = opciones || {};
    const cx = contexto(ast);
    const avisos = [];
    const ayudas = new Set();
    const aviso = (linea, texto) => { avisos.push({ linea, texto }); return `pass  # TODO: ${texto}`; };
    const usa = a => ayudas.add(a);
    const nom = n => (RESERVADAS_PY.has(n) ? n + '_' : n);

    let ambito = new Map();
    let ambitoGlobal = new Map();
    let claseActual = null;
    let enRutina = false;
    let locales = new Set();
    let globalesUsadas = new Set();
    let nivel = 0;
    const sangria = () => '    '.repeat(nivel);

    const entero = t => (/^-?\d+$/.test(t) ? t : `int(${t})`);

    /* ------------------------------ tipos ----------------------------- */
    function porDefecto(spec) {
      const t = cx.resolver(spec);
      if (!t) return '0';
      switch (t.k) {
        case 'cad': return '""';
        case 'log': return 'False';
        case 'num': return '0';
        case 'obj': return 'None';
        case 'rec':
          usa('registro');
          return `Registro(${cx.camposDe(t).map(c => `${c.nombre}=${porDefecto(c.tipo)}`).join(', ')})`;
        case 'arr': {
          usa('vector');
          const dims = t.dims || [];
          if (dims[0] === '*') return 'None';
          const interno = dims.length > 1 ? porDefecto({ k: 'arr', dims: dims.slice(1), elem: t.elem }) : porDefecto(t.elem);
          return `nuevo_vector(${dimTexto(dims[0])}, lambda: ${interno})`;
        }
        default: return '0';
      }
    }
    const dimTexto = d => (typeof d === 'number' ? String(d) : expr(d));

    function tipoDe(n) {
      if (!n) return null;
      if (n.t === 'id') return cx.resolver(ambito.get(n.nombre));
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'nuevo') return { k: 'obj', clase: n.clase };
      if (n.t === 'este') return claseActual ? { k: 'obj', clase: claseActual.nombre } : null;
      if (n.t === 'indice') {
        const b = cx.resolver(tipoDe(n.base));
        if (!b) return null;
        if (b.k === 'cad') return { k: 'cad' };
        if (b.k !== 'arr') return null;
        return b.dims.length > 1 ? cx.resolver({ k: 'arr', dims: b.dims.slice(1), elem: b.elem }) : cx.resolver(b.elem);
      }
      if (n.t === 'campo') {
        const b = cx.resolver(tipoDe(n.base));
        if (b && b.k === 'obj') return atributoDe(b.clase, n.nombre);
        if (b && b.k === 'rec') {
          const c = cx.camposDe(b).find(x => x.nombre === n.nombre);
          return c ? cx.resolver(c.tipo) : null;
        }
        if (n.base.t === 'id' && cx.clases.has(n.base.nombre)) return atributoDe(n.base.nombre, n.nombre);
        return null;
      }
      return null;
    }
    /* Tipo de un atributo, subiendo por la cadena de herencia. */
    function atributoDe(clase, campo) {
      let c = cx.clases.get(clase);
      while (c) {
        for (const a of c.atributos || []) {
          if (!a.nombres.includes(campo)) continue;
          return cx.resolver(a.tipo || cx.tipoDelLiteral(a.init));
        }
        c = c.padre ? cx.clases.get(c.padre) : null;
      }
      return null;
    }

    /* --------------------------- expresiones -------------------------- */
    function expr(n) {
      switch (n.t) {
        case 'num': return String(n.v);
        case 'cad': return JSON.stringify(n.v);
        case 'id':
          if (n.nombre === 'TRUE' || n.nombre === 'SI') return 'True';
          if (n.nombre === 'FALSE' || n.nombre === 'NO') return 'False';
          if (n.nombre === 'nulo') return 'None';
          return nom(n.nombre);
        case 'este': return 'self';
        case 'padre': return 'super()';
        case 'nulo': return 'None';
        case 'nuevo': return `${nom(n.clase)}(${(n.args || []).map(expr).join(', ')})`;
        case 'es': return `isinstance(${expr(n.obj)}, ${nom(n.clase)})`;
        case 'indice': return `${expr(n.base)}[${entero(expr(n.idx))}]`;
        case 'campo': return `${expr(n.base)}.${nom(n.nombre)}`;
        case 'metodo': {
          if (n.obj.t === 'padre' && n.nombre === 'constructor')
            return `super().__init__(${(n.args || []).map(expr).join(', ')})`;
          return `${expr(n.obj)}.${nom(n.nombre)}(${(n.args || []).map(expr).join(', ')})`;
        }
        case 'un': return n.op === 'not' ? `(not ${expr(n.e)})` : `${n.op}(${expr(n.e)})`;
        case 'bin': {
          const OPS = { '=': '==', '==': '==', '<>': '!=', '!=': '!=', and: 'and', or: 'or' };
          if (n.op === '^') return `(${expr(n.i)} ** ${expr(n.d)})`;
          if (n.op === '%') { usa('modulo'); return `modulo(${expr(n.i)}, ${expr(n.d)})`; }
          return `(${expr(n.i)} ${OPS[n.op] || n.op} ${expr(n.d)})`;
        }
        case 'llamada': return llamada(n, false);
        case 'estruct': return estructura(null, n);
        default: return aviso(n.linea, `expresión "${n.t}" que el traductor no conoce`);
      }
    }

    function estructura(spec, nodo) {
      const t = cx.resolver(spec);
      const items = nodo.items || [];
      if (t && t.k === 'rec') {
        usa('registro');
        return `Registro(${cx.camposDe(t).map((c, i) =>
          `${c.nombre}=${items[i] ? (items[i].t === 'estruct' ? estructura(c.tipo, items[i]) : expr(items[i])) : porDefecto(c.tipo)}`).join(', ')})`;
      }
      const dims = (t && t.dims) || [];
      const tElem = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : (t ? t.elem : null);
      const valores = items.map(it => (it.t === 'estruct' ? estructura(tElem, it) : expr(it)));
      if (!dims.length || dims[0] === '*') return `[None, ${valores.join(', ')}]`;
      usa('vector'); usa('literal');
      const relleno = nodo.relleno && valores.length ? valores[valores.length - 1] : porDefecto(tElem);
      return `_literal(${dimTexto(dims[0])}, [${valores.join(', ')}], ${relleno})`;
    }

    function llamada(n, comoSentencia) {
      const args = n.args || [];
      const nombre = n.nombre;
      if (nombre === 'imprimir') { usa('salida'); return `imprimir(${args.map(expr).join(', ')})`; }
      if (nombre === 'leer') {
        usa('leer'); usa('salida');
        const partes = args.map(a => {
          const t = tipoDe(a);
          return `${expr(a)} = ${t && t.k === 'cad' ? 'leer_texto()' : 'leer_numero()'}`;
        });
        return partes.join('\n' + sangria());
      }
      if (nombre === 'dim') {
        usa('vector');
        const t = cx.resolver(tipoDe(args[0]));
        const elem = t && t.dims && t.dims.length > 1
          ? porDefecto({ k: 'arr', dims: t.dims.slice(1), elem: t.elem })
          : (t ? porDefecto(t.elem) : '0');
        if (args.length === 2) return `${expr(args[0])} = nuevo_vector(${expr(args[1])}, lambda: ${elem})`;
        if (args.length === 3) return `${expr(args[0])} = nuevo_vector(${expr(args[1])}, lambda: nuevo_vector(${expr(args[2])}, lambda: ${elem}))`;
        return aviso(n.linea, 'dim() con más de dos dimensiones');
      }
      if (nombre === 'inc' || nombre === 'dec') return `${expr(args[0])} ${nombre === 'inc' ? '+=' : '-='} ${args[1] ? expr(args[1]) : '1'}`;
      if (nombre === 'intercambiar' || nombre === 'swap')
        return `${expr(args[0])}, ${expr(args[1])} = ${expr(args[1])}, ${expr(args[0])}`;
      if (nombre === 'clase_de') return `type(${expr(args[0])}).__name__`;
      if (nombre === 'es_nulo') return `(${expr(args[0])} is None)`;
      if (nombre === 'id_de') return `float(id(${expr(args[0])}))`;
      if (nombre === 'cls') { usa('salida'); return '_salida = ""'; }
      if (DIRECTAS_PY[nombre]) {
        if (DIRECTAS_PY[nombre].startsWith('math.')) usa('matematica');
        return `${DIRECTAS_PY[nombre]}(${args.map(expr).join(', ')})`;
      }
      if (AYUDA_PY[nombre]) { usa(AYUDA_PY[nombre][0]); return `${AYUDA_PY[nombre][1]}(${args.map(expr).join(', ')})`; }
      return `${nom(nombre)}(${args.map(expr).join(', ')})`;
    }

    /* --------------------------- sentencias --------------------------- */
    function bloque(lista) {
      nivel++;
      const s = (lista && lista.length) ? lista.map(x => sangria() + sentencia(x)).join('\n') : sangria() + 'pass';
      nivel--;
      return s;
    }

    function anotarGlobal(n) {
      if (!enRutina || claseActual) return;
      if (n && !locales.has(n) && ambitoGlobal.has(n)) globalesUsadas.add(nom(n));
    }
    const raiz = n => { while (n && (n.t === 'indice' || n.t === 'campo')) n = n.base; return n && n.t === 'id' ? n.nombre : null; };

    function sentencia(s) {
      switch (s.t) {
        case 'asig': {
          anotarGlobal(raiz(s.destino));
          if (s.valor.t === 'estruct') return `${expr(s.destino)} = ${estructura(tipoDe(s.destino), s.valor)}`;
          return `${expr(s.destino)} = ${expr(s.valor)}`;
        }
        case 'exprStmt': {
          if (s.expr.t === 'llamada') {
            const nombre = s.expr.nombre;
            if (['leer', 'dim', 'inc', 'dec', 'intercambiar', 'swap'].includes(nombre))
              (s.expr.args || []).forEach(a => anotarGlobal(raiz(a)));
            return llamada(s.expr, true);
          }
          return expr(s.expr);
        }
        case 'si': {
          let t = `if ${expr(s.cond)}:\n${bloque(s.entonces)}`;
          if (s.sino && s.sino.length) t += `\n${sangria()}else:\n${bloque(s.sino)}`;
          return t;
        }
        case 'mientras': return `while ${expr(s.cond)}:\n${bloque(s.cuerpo)}`;
        case 'repetir': {
          nivel++;
          const corte = `${sangria()}if ${expr(s.cond)}:\n${sangria()}    break`;
          nivel--;
          return `while True:\n${bloque(s.cuerpo)}\n${corte}`;
        }
        case 'desde': {
          anotarGlobal(raiz(s.ctrl));
          const k = expr(s.ctrl), desde = expr(s.desde), hasta = expr(s.hasta);
          const paso = s.paso ? expr(s.paso) : '1';
          if (/^-?\d+$/.test(paso)) {
            const p = Number(paso);
            const fin = /^-?\d+$/.test(hasta) ? String(Number(hasta) + (p > 0 ? 1 : -1))
              : entero(`${hasta} ${p > 0 ? '+' : '-'} 1`);
            return `for ${k} in range(${entero(desde)}, ${fin}, ${p}):\n${bloque(s.cuerpo)}`;
          }
          usa('rango');
          return `for ${k} in _rango(${desde}, ${hasta}, ${paso}):\n${bloque(s.cuerpo)}`;
        }
        case 'eval': {
          const partes = s.casos.map((c, i) => `${i ? sangria() + 'el' : ''}if ${expr(c.cond)}:\n${bloque(c.cuerpo)}`);
          let t = partes.join('\n');
          if (s.sino && s.sino.length) t += `\n${sangria()}else:\n${bloque(s.sino)}`;
          return t;
        }
        case 'retorna': return s.valor ? `return ${expr(s.valor)}` : 'return';
        default: return aviso(s.linea, `sentencia "${s.t}" que el traductor no conoce`);
      }
    }

    function declaraciones(origen, dentroDeClase) {
      const lineas = [];
      for (const c of origen.consts || []) {
        ambito.set(c.nombre, cx.tipoDelLiteral(c.valor));
        lineas.push(`${nom(c.nombre)} = ${expr(c.valor)}`);
      }
      for (const d of origen.vars || []) {
        const tipo = d.tipo || cx.tipoDelLiteral(d.init);
        for (const n of d.nombres) {
          ambito.set(n, tipo);
          if (dentroDeClase) locales.add(n);
          const inicial = d.init && d.init.t !== 'estruct' ? expr(d.init)
            : d.init ? estructura(tipo, d.init) : porDefecto(tipo);
          lineas.push(`${nom(n)} = ${inicial}`);
        }
      }
      return lineas;
    }

    /* ----------------------------- clases ----------------------------- */
    /* El constructor que se usa si la clase no declara uno propio. */
    function constructorHeredado(c) {
      let p = c.padre ? cx.clases.get(c.padre) : null;
      while (p) {
        if (p.constructor) return p.constructor;
        p = p.padre ? cx.clases.get(p.padre) : null;
      }
      return null;
    }

    function clase(c) {
      claseActual = c;
      const guardado = ambito;
      const partes = [];
      const cab = c.padre ? `class ${nom(c.nombre)}(${nom(c.padre)}):` : `class ${nom(c.nombre)}:`;
      partes.push(cab);
      if (c.abstracta) partes.push(`    """Clase abstracta: no se crean objetos de ella, solo de sus hijas."""`);

      /* atributos compartidos = atributos de clase */
      const compartidos = (c.atributos || []).filter(a => a.compartido);
      compartidos.forEach(a => a.nombres.forEach(n =>
        partes.push(`    ${nom(n)} = ${a.init ? expr(a.init) : porDefecto(a.tipo)}`)));

      /* constructor */
      const propios = (c.atributos || []).filter(a => !a.compartido);
      const ctor = c.constructor;
      /* Si la clase no declara constructor, en ESLE2 POO se usa el de su madre;
         acá hay que escribirlo, porque el __init__ propio taparía al heredado. */
      const heredado = ctor ? null : constructorHeredado(c);
      const params = (ctor ? ctor.params : (heredado ? heredado.params : [])) || [];
      const paramsCtor = params.map(p => nom(p.nombre));
      partes.push('');
      partes.push(`    def __init__(self${paramsCtor.length ? ', ' + paramsCtor.join(', ') : ''}):`);

      ambito = new Map(guardado);
      params.forEach(p => ambito.set(p.nombre, p.tipo));

      const cuerpoCtor = [];
      /* Si el constructor llama a padre.constructor, de los atributos heredados
         se encarga la clase madre. Si no lo llama —cosa válida en ESLE2 POO—,
         hay que darles su valor inicial acá, porque en Python los atributos
         nacen en __init__. */
      const llamaAlPadre = !!(ctor && (ctor.cuerpo || []).some(s =>
        s.t === 'exprStmt' && s.expr.t === 'metodo' &&
        s.expr.obj.t === 'padre' && s.expr.nombre === 'constructor'));
      if (heredado) cuerpoCtor.push(`super().__init__(${paramsCtor.join(', ')})`);

      const aInicializar = propios.slice();
      if (c.padre && !llamaAlPadre && !heredado) {
        let p = cx.clases.get(c.padre);
        while (p) {
          (p.atributos || []).filter(a => !a.compartido).forEach(a => aInicializar.push(a));
          p = p.padre ? cx.clases.get(p.padre) : null;
        }
      }
      aInicializar.forEach(a => a.nombres.forEach(n =>
        cuerpoCtor.push(`self.${nom(n)} = ${a.init ? expr(a.init) : porDefecto(a.tipo)}`)));

      nivel = 2;
      const cuerpoEscrito = (ctor && ctor.cuerpo || []).map(s => '        ' + sentencia(s));
      nivel = 0;
      const todo = cuerpoCtor.map(l => '        ' + l).concat(cuerpoEscrito);
      partes.push(todo.length ? todo.join('\n') : '        pass');

      /* métodos */
      for (const m of c.metodos || []) {
        ambito = new Map(guardado);
        (m.params || []).forEach(p => ambito.set(p.nombre, p.tipo));
        const ps = (m.params || []).map(p => nom(p.nombre));
        partes.push('');
        partes.push(`    def ${nom(m.nombre)}(self${ps.length ? ', ' + ps.join(', ') : ''}):`);
        if (m.abstracto) {
          partes.push(`        raise NotImplementedError("cada clase hija tiene que escribir ${m.nombre}()")`);
          continue;
        }
        const locs = declaraciones(m, true).map(l => '        ' + l);
        nivel = 2;
        const cuerpo = (m.cuerpo || []).map(s => '        ' + sentencia(s));
        nivel = 0;
        partes.push(locs.concat(cuerpo).join('\n') || '        pass');
      }

      /* texto() se usa al imprimir: en Python eso es __str__ */
      if ((c.metodos || []).some(m => m.nombre === 'texto')) {
        partes.push('');
        partes.push('    def __str__(self):');
        partes.push('        return self.texto()');
      } else if (!c.padre) {
        partes.push('');
        partes.push('    def __str__(self):');
        partes.push('        return "<" + type(self).__name__ + ">"');
      }

      ambito = guardado;
      claseActual = null;
      return partes.join('\n');
    }

    /* ----------------------------- armado ----------------------------- */
    const globales = declaraciones(ast, false);
    ambitoGlobal = new Map(ambito);

    const clases = (ast.clases || []).map(clase);

    enRutina = true;
    locales = new Set();
    globalesUsadas = new Set();
    nivel = 0;
    const cuerpoPrincipal = bloque(ast.cuerpo);
    const globalesPrincipal = [...globalesUsadas];

    const funciones = (ast.subs || []).map(sub => {
      ambito = new Map(ambitoGlobal);
      locales = new Set((sub.params || []).map(p => p.nombre));
      globalesUsadas = new Set();
      (sub.params || []).forEach(p => ambito.set(p.nombre, p.tipo));
      const decls = declaraciones(sub, true);
      nivel = 0;
      const cuerpo = bloque(sub.cuerpo);
      const cab = [`def ${nom(sub.nombre)}(${(sub.params || []).map(p => nom(p.nombre)).join(', ')}):`];
      if (globalesUsadas.size) cab.push(`    global ${[...globalesUsadas].join(', ')}`);
      decls.forEach(l => cab.push('    ' + l));
      return cab.join('\n') + '\n' + cuerpo;
    });
    enRutina = false;

    if (ayudas.has('str')) ayudas.add('salida');
    const orden = ['matematica', 'registro', 'salida', 'leer', 'vector', 'literal', 'modulo', 'rango',
      'str', 'val', 'strlen', 'substr', 'pos', 'upper', 'lower', 'int', 'ord', 'ascii', 'ifval'];
    const textoAyudas = orden.filter(a => ayudas.has(a)).map(a => AYUDAS_PY[a]).join('\n\n');

    const entrada = (opts.entrada || '').replace(/\r/g, '');
    const lineasEntrada = entrada.length ? entrada.split('\n') : [];

    const partes = [
      '"""',
      `Traducción a Python de un programa ESLE2 POO${ast.nombre ? ` («${ast.nombre}»)` : ''}.`,
      'Generada por https://esle2.vercel.app — se puede correr con:  python programa.py',
      '',
      'Los vectores conservan los índices desde 1: la casilla 0 queda sin usar.',
      '"""',
      '',
      '# Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.',
      `ENTRADA = ${JSON.stringify(lineasEntrada)}`,
      ''
    ];
    if (textoAyudas) partes.push('# ---------- ayudas que imitan a las subrutinas de SLE2 ----------', textoAyudas, '');
    if (clases.length) partes.push('# ---------- clases ----------', clases.join('\n\n\n'), '');
    if (globales.length) partes.push('# ---------- variables del programa ----------', globales.join('\n'), '');
    if (funciones.length) partes.push(funciones.join('\n\n'), '');
    partes.push('# ---------- programa principal ----------', 'def principal():');
    if (globalesPrincipal.length) partes.push(`    global ${globalesPrincipal.join(', ')}`);
    partes.push(cuerpoPrincipal, '', 'principal()');
    if (ayudas.has('salida')) partes.push('print(_salida)');

    return { codigo: partes.join('\n').replace(/\n{4,}/g, '\n\n\n') + '\n', avisos };
  }

  /* ================================================================== */
  /* Java                                                                */
  /* ================================================================== */
  const AYUDAS_JAVA = {
    salida: [
      '  static StringBuilder _salida = new StringBuilder();',
      '',
      '  static String _texto(Object v) {',
      '    if (v == null) return "nulo";',
      '    if (v instanceof Boolean) return ((Boolean) v) ? "TRUE" : "FALSE";',
      '    if (v instanceof Double) {',
      '      double d = (Double) v;',
      '      if (d == Math.rint(d) && !Double.isInfinite(d)) return String.valueOf((long) d);',
      '      return String.valueOf(d);',
      '    }',
      '    return String.valueOf(v);',
      '  }',
      '',
      '  static void imprimir(Object... valores) {',
      '    for (Object v : valores) _salida.append(_texto(v));',
      '  }'
    ].join('\n'),

    leer: [
      '  static int _linea = 0;',
      '  static java.util.List<String> _campos = new java.util.ArrayList<>();',
      '',
      '  static String _leerCampo() {',
      '    while (_campos.isEmpty()) {',
      '      if (_linea >= ENTRADA.length) return "";',
      '      for (String c : ENTRADA[_linea].split(",", -1)) _campos.add(c);',
      '      _linea++;',
      '    }',
      '    return _campos.remove(0).trim();',
      '  }',
      '',
      '  static double leerNumero() {',
      '    try { return Double.parseDouble(_leerCampo()); } catch (NumberFormatException e) { return 0; }',
      '  }',
      '',
      '  // Una cadena ocupa un campo, igual que un número.',
      '  static String leerTexto() { return _leerCampo(); }'
    ].join('\n'),

    vector: [
      '  // Los vectores de SLE2 empiezan en 1: la casilla 0 queda sin usar.',
      '  static <T> T[] llenar(T[] v, java.util.function.Supplier<T> valor) {',
      '    for (int i = 1; i < v.length; i++) v[i] = valor.get();',
      '    return v;',
      '  }',
      '',
      '  static double alen(Object v) { return java.lang.reflect.Array.getLength(v) - 1; }'
    ].join('\n'),

    modulo: [
      '  // El % de SLE2 trunca hacia cero, como en C.',
      '  static double modulo(double a, double b) { return (long) a % (long) b; }'
    ].join('\n'),

    str: [
      '  static String str(double n) { return str(n, 0, 2); }',
      '',
      '  static String str(double n, double ancho, double decimales) {',
      '    String t = String.format("%." + (int) decimales + "f", n);',
      '    while (t.length() < (int) ancho) t = " " + t;',
      '    return t;',
      '  }'
    ].join('\n'),

    val: [
      '  static double val(String s) {',
      '    try { return Double.parseDouble(s.trim()); } catch (NumberFormatException e) { return 0; }',
      '  }'
    ].join('\n'),

    strlen: '  static double strlen(String s) { return s.length(); }',

    substr: [
      '  static String substr(String s, double desde) { return substr(s, desde, s.length()); }',
      '',
      '  static String substr(String s, double desde, double cuantos) {',
      '    int d = (int) desde;',
      '    if (d < 1 || d > s.length()) return "";',
      '    return s.substring(d - 1, Math.min(s.length(), d - 1 + Math.max(0, (int) cuantos)));',
      '  }'
    ].join('\n'),

    pos: '  static double pos(String texto, String buscado) { return texto.indexOf(buscado) + 1; }',
    upper: '  static String upper(String s) { return s.toUpperCase(); }',
    lower: '  static String lower(String s) { return s.toLowerCase(); }',
    intf: '  static double int_(double n) { return (long) n; }',
    ordf: '  static double ord_(String s) { return s.isEmpty() ? 0 : s.charAt(0); }',
    asciif: '  static String ascii(double n) { return String.valueOf((char) (int) n); }',
    strdup: '  static String strdup(String s, double n) { return s.repeat(Math.max(0, (int) n)); }',

    igual: [
      '  // El == de SLE2 compara el contenido de las cadenas, no la referencia.',
      '  static boolean igual(Object a, Object b) { return java.util.Objects.equals(a, b); }'
    ].join('\n'),

    objeto: [
      '  // Toda clase de ESLE2 POO sabe mostrarse: imprimir(obj) usa su texto().',
      '  static abstract class ObjetoSLE2 {',
      '    public String texto() { return "<" + getClass().getSimpleName() + ">"; }',
      '    @Override public String toString() { return texto(); }',
      '  }'
    ].join('\n')
  };

  const DIRECTAS_JAVA = {
    abs: 'Math.abs', max: 'Math.max', min: 'Math.min', sqrt: 'Math.sqrt', sin: 'Math.sin',
    cos: 'Math.cos', tan: 'Math.tan', exp: 'Math.exp', log: 'Math.log', arctan: 'Math.atan'
  };
  const AYUDA_JAVA = {
    str: ['str', 'str'], val: ['val', 'val'], strlen: ['strlen', 'strlen'], substr: ['substr', 'substr'],
    pos: ['pos', 'pos'], upper: ['upper', 'upper'], lower: ['lower', 'lower'], int: ['intf', 'int_'],
    ord: ['ordf', 'ord_'], ascii: ['asciif', 'ascii'], strdup: ['strdup', 'strdup'], alen: ['vector', 'alen']
  };

  function aJava(ast, opciones) {
    const opts = opciones || {};
    const cx = contexto(ast);
    const avisos = [];
    const ayudas = new Set();
    const aviso = (linea, texto) => { avisos.push({ linea, texto }); return `/* TODO: ${texto} */`; };
    const usa = a => ayudas.add(a);
    const nom = n => (RESERVADAS_JAVA.has(n) ? n + '_' : n);

    let ambito = new Map();
    let claseActual = null;
    let nivel = 2;
    const sangria = () => '  '.repeat(nivel);

    /* ------------------------------ tipos ----------------------------- */
    function tipoJava(spec) {
      const t = cx.resolver(spec);
      if (!t) return 'double';
      switch (t.k) {
        case 'num': return 'double';
        case 'cad': return 'String';
        case 'log': return 'boolean';
        case 'obj': return nom(t.clase);
        case 'rec': return nombreDelTipo(spec) || 'Object';
        case 'arr': {
          const dims = t.dims || [];
          const interno = dims.length > 1
            ? tipoJava({ k: 'arr', dims: dims.slice(1), elem: t.elem })
            : tipoJava(t.elem);
          return interno + '[]';
        }
        default: return 'double';
      }
    }
    /* Un registro con nombre propio se traduce a una clase con ese nombre. */
    function nombreDelTipo(spec) {
      if (!spec) return null;
      if (spec.k === 'nombre') return nom(spec.nombre);
      if (spec.k && cx.tipos.has(spec.k)) return nom(spec.k);
      if (spec.k === 'rec') {
        for (const [n, t] of cx.tipos) if (t === spec) return nom(n);
      }
      return null;
    }

    function porDefecto(spec) {
      const t = cx.resolver(spec);
      if (!t) return '0';
      switch (t.k) {
        case 'num': return '0';
        case 'cad': return '""';
        case 'log': return 'false';
        case 'obj': return 'null';
        case 'rec': return `new ${nombreDelTipo(spec) || 'Object'}()`;
        case 'arr': {
          const dims = t.dims || [];
          if (dims[0] === '*') return 'null';
          return nuevoArreglo(t, dims.map(d => (typeof d === 'number' ? String(d) : expr(d))));
        }
        default: return '0';
      }
    }

    /* new double[n+1], o llenar(...) cuando las casillas necesitan un valor. */
    function nuevoArreglo(t, tamanos) {
      usa('vector');
      const dims = t.dims || [];
      const specElem = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : t.elem;
      const tipoElem = tipoJava(specElem);
      const kElem = cx.resolver(specElem) || { k: 'num' };
      const n = `(int) (${tamanos[0]}) + 1`;
      // En Java el tamaño va en el primer par de corchetes: new String[n][]
      const base = tipoElem.replace(/(\[\])+$/, '');
      const sobran = tipoElem.slice(base.length);
      const crear = `new ${base}[${n}]${sobran}`;
      if (kElem.k === 'num' || kElem.k === 'log' || kElem.k === 'obj') return crear;
      if (kElem.k === 'cad') return `llenar(${crear}, () -> "")`;
      if (kElem.k === 'rec') return `llenar(${crear}, ${tipoElem}::new)`;
      if (kElem.k === 'arr') {
        const interno = nuevoArreglo(kElem, tamanos.slice(1));
        return `llenar(${crear}, () -> ${interno})`;
      }
      return crear;
    }

    function tipoDe(n) {
      if (!n) return null;
      if (n.t === 'id') return cx.resolver(ambito.get(n.nombre));
      if (n.t === 'cad') return { k: 'cad' };
      if (n.t === 'num') return { k: 'num' };
      if (n.t === 'nuevo') return { k: 'obj', clase: n.clase };
      if (n.t === 'este') return claseActual ? { k: 'obj', clase: claseActual.nombre } : null;
      if (n.t === 'es') return { k: 'log' };
      if (n.t === 'llamada') {
        if (['str', 'substr', 'upper', 'lower', 'ascii', 'strdup', 'clase_de'].includes(n.nombre)) return { k: 'cad' };
        if (n.nombre === 'es_nulo') return { k: 'log' };
        const sub = (ast.subs || []).find(s => s.nombre === n.nombre);
        return sub && sub.retorna ? cx.resolver(sub.retorna) : { k: 'num' };
      }
      if (n.t === 'metodo') {
        const b = cx.resolver(tipoDe(n.obj));
        const clase = n.obj.t === 'padre'
          ? (claseActual && claseActual.padre)
          : (b && b.k === 'obj' ? b.clase : null);
        const m = metodoDe(clase, n.nombre);
        return m && m.retorna ? cx.resolver(m.retorna) : null;
      }
      if (n.t === 'indice') {
        const b = cx.resolver(tipoDe(n.base));
        if (!b) return null;
        if (b.k === 'cad') return { k: 'cad' };
        if (b.k !== 'arr') return null;
        return b.dims.length > 1 ? cx.resolver({ k: 'arr', dims: b.dims.slice(1), elem: b.elem }) : cx.resolver(b.elem);
      }
      if (n.t === 'campo') {
        const b = cx.resolver(tipoDe(n.base));
        if (b && b.k === 'obj') return atributoDe(b.clase, n.nombre);
        if (b && b.k === 'rec') {
          const c = cx.camposDe(b).find(x => x.nombre === n.nombre);
          return c ? cx.resolver(c.tipo) : null;
        }
        if (n.base.t === 'id' && cx.clases.has(n.base.nombre)) return atributoDe(n.base.nombre, n.nombre);
        return null;
      }
      if (n.t === 'bin') {
        if (n.op === '+') return tipoDe(n.i) || tipoDe(n.d);
        if (['and', 'or', '==', '=', '<>', '!=', '<', '>', '<=', '>='].includes(n.op)) return { k: 'log' };
        return { k: 'num' };
      }
      return null;
    }
    function atributoDe(clase, campo) {
      let c = cx.clases.get(clase);
      while (c) {
        for (const a of c.atributos || []) {
          if (!a.nombres.includes(campo)) continue;
          return cx.resolver(a.tipo || cx.tipoDelLiteral(a.init));
        }
        c = c.padre ? cx.clases.get(c.padre) : null;
      }
      return null;
    }
    function metodoDe(clase, nombre) {
      let c = cx.clases.get(clase);
      while (c) {
        const m = (c.metodos || []).find(x => x.nombre === nombre);
        if (m) return m;
        c = c.padre ? cx.clases.get(c.padre) : null;
      }
      return null;
    }

    /* --------------------------- expresiones -------------------------- */
    function expr(n) {
      switch (n.t) {
        case 'num': return Number.isInteger(n.v) ? `${n.v}.0` : String(n.v);
        case 'cad': return JSON.stringify(n.v);
        case 'id':
          if (n.nombre === 'TRUE' || n.nombre === 'SI') return 'true';
          if (n.nombre === 'FALSE' || n.nombre === 'NO') return 'false';
          if (n.nombre === 'nulo') return 'null';
          return nom(n.nombre);
        case 'este': return 'this';
        case 'nulo': return 'null';
        case 'nuevo': return `new ${nom(n.clase)}(${(n.args || []).map(expr).join(', ')})`;
        case 'es': return `(${expr(n.obj)} instanceof ${nom(n.clase)})`;
        case 'indice': return `${expr(n.base)}[(int) (${expr(n.idx)})]`;
        case 'campo': return `${expr(n.base)}.${nom(n.nombre)}`;
        case 'metodo': {
          const args = (n.args || []).map(expr).join(', ');
          if (n.obj.t === 'padre') {
            return n.nombre === 'constructor' ? `super(${args})` : `super.${nom(n.nombre)}(${args})`;
          }
          return `${expr(n.obj)}.${nom(n.nombre)}(${args})`;
        }
        case 'un': return n.op === 'not' ? `(!(${expr(n.e)}))` : `(${n.op}(${expr(n.e)}))`;
        case 'bin': return binario(n);
        case 'llamada': return llamada(n, false);
        case 'estruct': return estructura(null, n);
        default: return aviso(n.linea, `expresión "${n.t}" que el traductor no conoce`);
      }
    }

    function binario(n) {
      const i = expr(n.i), d = expr(n.d);
      if (n.op === '^') return `Math.pow(${i}, ${d})`;
      if (n.op === '%') { usa('modulo'); return `modulo(${i}, ${d})`; }
      if (n.op === 'and') return `(${i} && ${d})`;
      if (n.op === 'or') return `(${i} || ${d})`;

      const ti = cx.resolver(tipoDe(n.i)), td = cx.resolver(tipoDe(n.d));
      const texto = (ti && ti.k === 'cad') || (td && td.k === 'cad');

      if (['==', '=', '<>', '!='].includes(n.op)) {
        const negar = ['<>', '!='].includes(n.op);
        if (texto) { usa('igual'); return `${negar ? '!' : ''}igual(${i}, ${d})`; }
        return `(${i} ${negar ? '!=' : '=='} ${d})`;
      }
      if (texto && ['<', '>', '<=', '>='].includes(n.op)) return `(${i}.compareTo(${d}) ${n.op} 0)`;
      return `(${i} ${n.op} ${d})`;
    }

    function estructura(spec, nodo) {
      const t = cx.resolver(spec);
      const items = nodo.items || [];
      if (!t || t.k !== 'arr') return aviso(nodo.linea, 'un literal { } que Java necesita escrito campo por campo');
      const dims = t.dims || [];
      const specElem = dims.length > 1 ? { k: 'arr', dims: dims.slice(1), elem: t.elem } : t.elem;
      const tipoElem = tipoJava(specElem);
      const kElem = cx.resolver(specElem) || { k: 'num' };
      const valores = items.map(it => (it.t === 'estruct' ? estructura(specElem, it) : expr(it)));
      const vacio = kElem.k === 'cad' ? '""' : kElem.k === 'log' ? 'false' : kElem.k === 'num' ? '0' : 'null';
      const total = typeof dims[0] === 'number' ? dims[0] : valores.length;
      const relleno = nodo.relleno && valores.length ? valores[valores.length - 1] : vacio;
      const lista = [];
      for (let i = 0; i < total; i++) lista.push(i < valores.length ? valores[i] : relleno);
      return `new ${tipoElem}[] { ${vacio}, ${lista.join(', ')} }`;
    }

    function llamada(n) {
      const args = n.args || [];
      const nombre = n.nombre;
      if (nombre === 'imprimir') { usa('salida'); return `imprimir(${args.map(expr).join(', ')})`; }
      if (nombre === 'leer') {
        usa('leer'); usa('salida');
        return args.map(a => {
          const t = cx.resolver(tipoDe(a));
          return `${expr(a)} = ${t && t.k === 'cad' ? 'leerTexto()' : 'leerNumero()'}`;
        }).join(';\n' + sangria());
      }
      if (nombre === 'dim') {
        const t = cx.resolver(tipoDe(args[0]));
        if (!t || t.k !== 'arr') return aviso(n.linea, 'dim() sobre algo que no es un vector');
        return `${expr(args[0])} = ${nuevoArreglo(t, args.slice(1).map(expr))}`;
      }
      if (nombre === 'inc' || nombre === 'dec')
        return `${expr(args[0])} ${nombre === 'inc' ? '+=' : '-='} ${args[1] ? expr(args[1]) : '1'}`;
      if (nombre === 'intercambiar' || nombre === 'swap') {
        const t = cx.resolver(tipoDe(args[0])) || { k: 'num' };
        return `{ ${tipoJava(t)} _tmp = ${expr(args[0])}; ${expr(args[0])} = ${expr(args[1])}; ${expr(args[1])} = _tmp; }`;
      }
      if (nombre === 'clase_de') return `${expr(args[0])}.getClass().getSimpleName()`;
      if (nombre === 'es_nulo') return `(${expr(args[0])} == null)`;
      if (nombre === 'id_de') return `((double) System.identityHashCode(${expr(args[0])}))`;
      if (nombre === 'ifval') return `(${expr(args[0])} ? ${expr(args[1])} : ${expr(args[2])})`;
      if (nombre === 'cls') { usa('salida'); return '_salida.setLength(0)'; }
      if (DIRECTAS_JAVA[nombre]) return `${DIRECTAS_JAVA[nombre]}(${args.map(expr).join(', ')})`;
      if (AYUDA_JAVA[nombre]) { usa(AYUDA_JAVA[nombre][0]); return `${AYUDA_JAVA[nombre][1]}(${args.map(expr).join(', ')})`; }
      return `${nom(nombre)}(${args.map(expr).join(', ')})`;
    }

    /* --------------------------- sentencias --------------------------- */
    function bloque(lista) {
      nivel++;
      const s = (lista || []).map(x => sangria() + sentencia(x)).join('\n');
      nivel--;
      return s;
    }

    function sentencia(s) {
      switch (s.t) {
        case 'asig':
          if (s.valor.t === 'estruct') return `${expr(s.destino)} = ${estructura(tipoDe(s.destino), s.valor)};`;
          return `${expr(s.destino)} = ${expr(s.valor)};`;
        case 'exprStmt': {
          const c = s.expr.t === 'llamada' ? llamada(s.expr) : expr(s.expr);
          return c.endsWith('}') ? c : c + ';';
        }
        case 'si': {
          let t = `if (${expr(s.cond)}) {\n${bloque(s.entonces)}\n${sangria()}}`;
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'mientras': return `while (${expr(s.cond)}) {\n${bloque(s.cuerpo)}\n${sangria()}}`;
        case 'repetir': return `do {\n${bloque(s.cuerpo)}\n${sangria()}} while (!(${expr(s.cond)}));`;
        case 'desde': {
          const k = expr(s.ctrl);
          const paso = s.paso ? expr(s.paso) : '1.0';
          const cmp = /^\(?-/.test(paso) ? '>=' : '<=';
          return `for (${k} = ${expr(s.desde)}; ${k} ${cmp} ${expr(s.hasta)}; ${k} += ${paso}) {\n${bloque(s.cuerpo)}\n${sangria()}}`;
        }
        case 'eval': {
          const partes = s.casos.map((c, i) => `${i ? ' else ' : ''}if (${expr(c.cond)}) {\n${bloque(c.cuerpo)}\n${sangria()}}`);
          let t = partes.join('');
          if (s.sino && s.sino.length) t += ` else {\n${bloque(s.sino)}\n${sangria()}}`;
          return t;
        }
        case 'retorna': return s.valor ? `return ${expr(s.valor)};` : 'return;';
        default: return aviso(s.linea, `sentencia "${s.t}" que el traductor no conoce`);
      }
    }

    function declaraciones(origen, prefijo) {
      const lineas = [];
      for (const c of origen.consts || []) {
        const t = cx.tipoDelLiteral(c.valor);
        ambito.set(c.nombre, t);
        lineas.push(`${prefijo}final ${tipoJava(t)} ${nom(c.nombre)} = ${expr(c.valor)};`);
      }
      for (const d of origen.vars || []) {
        const tipo = d.tipo || cx.tipoDelLiteral(d.init);
        for (const n of d.nombres) {
          ambito.set(n, tipo);
          const inicial = d.init && d.init.t !== 'estruct' ? expr(d.init)
            : d.init ? estructura(tipo, d.init) : porDefecto(tipo);
          lineas.push(`${prefijo}${tipoJava(tipo)} ${nom(n)} = ${inicial};`);
        }
      }
      return lineas;
    }

    /* ------------------------- tipos y clases ------------------------- */
    /* El constructor que se usa si la clase no declara uno propio. */
    function constructorHeredado(c) {
      let p = c.padre ? cx.clases.get(c.padre) : null;
      while (p) {
        if (p.constructor) return p.constructor;
        p = p.padre ? cx.clases.get(p.padre) : null;
      }
      return null;
    }

    function registro(nombre, spec) {
      const t = cx.resolver(spec);
      const campos = cx.camposDe(t).map(c => `    public ${tipoJava(c.tipo)} ${nom(c.nombre)} = ${porDefecto(c.tipo)};`);
      return `  static class ${nom(nombre)} {\n${campos.join('\n')}\n  }`;
    }

    function clase(c) {
      claseActual = c;
      const guardado = new Map(ambito);
      usa('objeto');
      const partes = [`  ${c.abstracta ? 'abstract ' : ''}static class ${nom(c.nombre)} ` +
        `extends ${c.padre ? nom(c.padre) : 'ObjetoSLE2'} {`];

      for (const a of c.atributos || []) {
        const tipo = a.tipo || cx.tipoDelLiteral(a.init);
        const vis = a.vis === 'publico' ? 'public' : a.vis === 'protegido' ? 'protected' : 'private';
        for (const n of a.nombres) {
          ambito.set(n, tipo);
          partes.push(`    ${vis} ${a.compartido ? 'static ' : ''}${tipoJava(tipo)} ${nom(n)} = ` +
            `${a.init ? expr(a.init) : porDefecto(tipo)};`);
        }
      }

      let ctor = c.constructor;
      if (!ctor) {
        // En ESLE2 POO, "nuevo HIJA (…)" usa el constructor heredado.
        const heredado = constructorHeredado(c);
        if (heredado && (heredado.params || []).length) {
          const ps = heredado.params.map(p => `${tipoJava(p.tipo)} ${nom(p.nombre)}`);
          const nombres = heredado.params.map(p => nom(p.nombre));
          partes.push('');
          partes.push('    // ESLE2 POO hereda el constructor; Java pide escribirlo.');
          partes.push(`    ${nom(c.nombre)}(${ps.join(', ')}) {`);
          partes.push(`      super(${nombres.join(', ')});`);
          partes.push('    }');
        }
      }
      if (ctor) {
        const guardadoC = new Map(ambito);
        const params = (ctor.params || []).map(p => {
          ambito.set(p.nombre, p.tipo);
          return `${tipoJava(p.tipo)} ${nom(p.nombre)}`;
        });
        nivel = 2;
        partes.push('');
        partes.push(`    ${nom(c.nombre)}(${params.join(', ')}) {`);
        declaraciones(ctor, '      ').forEach(l => partes.push(l));
        (ctor.cuerpo || []).forEach(x => partes.push('      ' + sentencia(x)));
        partes.push('    }');
        if (params.length) {
          // Java pide un constructor sin parámetros para las hijas que no llaman
          // a padre.constructor, cosa que en ESLE2 POO es válida.
          partes.push('');
          partes.push(`    ${nom(c.nombre)}() { }`);
        }
        ambito = guardadoC;
      }

      for (const m of c.metodos || []) {
        const guardadoM = new Map(ambito);
        const params = (m.params || []).map(p => {
          ambito.set(p.nombre, p.tipo);
          return `${tipoJava(p.tipo)} ${nom(p.nombre)}`;
        });
        const ret = m.retorna ? tipoJava(m.retorna) : 'void';
        const vis = m.vis === 'privado' ? 'private' : m.vis === 'protegido' ? 'protected' : 'public';
        partes.push('');
        if (m.abstracto) {
          partes.push(`    ${vis} abstract ${ret} ${nom(m.nombre)}(${params.join(', ')});`);
          ambito = guardadoM;
          continue;
        }
        partes.push(`    ${vis} ${ret} ${nom(m.nombre)}(${params.join(', ')}) {`);
        declaraciones(m, '      ').forEach(l => partes.push(l));
        nivel = 2;
        (m.cuerpo || []).forEach(s => partes.push('      ' + sentencia(s)));
        partes.push('    }');
        ambito = guardadoM;
      }

      partes.push('  }');
      ambito = guardado;
      claseActual = null;
      return partes.join('\n');
    }

    /* ----------------------------- armado ----------------------------- */
    const tiposPropios = [...cx.tipos.entries()]
      .filter(([, spec]) => { const t = cx.resolver(spec); return t && t.k === 'rec'; })
      .map(([n, spec]) => registro(n, spec));

    const clases = (ast.clases || []).map(clase);
    const globales = declaraciones(ast, '  static ');
    const ambitoGlobal = new Map(ambito);

    nivel = 2;
    const cuerpoPrincipal = (ast.cuerpo || []).map(s => '    ' + sentencia(s));

    const funciones = (ast.subs || []).map(sub => {
      ambito = new Map(ambitoGlobal);
      const params = (sub.params || []).map(p => {
        ambito.set(p.nombre, p.tipo);
        const t = cx.resolver(p.tipo);
        if (p.porRef && t && !['arr', 'rec', 'obj'].includes(t.k))
          aviso(sub.linea, `"ref ${p.nombre}" en ${sub.nombre}(): Java no pasa números ni cadenas por referencia`);
        return `${tipoJava(p.tipo)} ${nom(p.nombre)}`;
      });
      const ret = sub.retorna ? tipoJava(sub.retorna) : 'void';
      const lineas = [`  static ${ret} ${nom(sub.nombre)}(${params.join(', ')}) {`];
      declaraciones(sub, '    ').forEach(l => lineas.push(l));
      nivel = 1;
      (sub.cuerpo || []).forEach(s => lineas.push('    ' + sentencia(s)));
      nivel = 2;
      lineas.push('  }');
      return lineas.join('\n');
    });
    ambito = ambitoGlobal;

    const orden = ['objeto', 'salida', 'leer', 'vector', 'modulo', 'igual', 'str', 'val', 'strlen',
      'substr', 'pos', 'upper', 'lower', 'intf', 'ordf', 'asciif', 'strdup'];
    const textoAyudas = orden.filter(a => ayudas.has(a)).map(a => AYUDAS_JAVA[a]).join('\n\n');

    const entrada = (opts.entrada || '').replace(/\r/g, '');
    const lineasEntrada = entrada.length ? entrada.split('\n') : [];

    const partes = [
      '/*',
      ` * Traducción a Java de un programa ESLE2 POO${ast.nombre ? ` («${ast.nombre}»)` : ''}.`,
      ' * Generada por https://esle2.vercel.app — se puede correr con:',
      ' *     javac Programa.java && java Programa',
      ' *',
      ' * Los vectores conservan los índices desde 1: la casilla 0 queda sin usar.',
      ' */',
      'public class Programa {',
      '',
      '  // Lo que en el IDE es el panel «Entrada de datos»: una línea por elemento.',
      `  static final String[] ENTRADA = { ${lineasEntrada.map(l => JSON.stringify(l)).join(', ')} };`,
      ''
    ];
    if (textoAyudas) partes.push('  // ---------- ayudas que imitan a las subrutinas de SLE2 ----------', textoAyudas, '');
    if (tiposPropios.length) partes.push('  // ---------- tipos propios ----------', tiposPropios.join('\n\n'), '');
    if (clases.length) partes.push('  // ---------- clases ----------', clases.join('\n\n'), '');
    if (globales.length) partes.push('  // ---------- variables del programa ----------', globales.join('\n'), '');
    if (funciones.length) partes.push(funciones.join('\n\n'), '');

    partes.push('  // ---------- programa principal ----------');
    partes.push('  public static void main(String[] args) {');
    cuerpoPrincipal.forEach(l => partes.push(l));
    if (ayudas.has('salida')) partes.push('    System.out.print(_salida);');
    partes.push('  }');
    partes.push('}');

    return { codigo: partes.join('\n').replace(/\n{3,}/g, '\n\n') + '\n', avisos, archivo: 'Programa.java' };
  }

  global.TraductorPOO = { aPython, aJava };
})(typeof window !== 'undefined' ? window : globalThis);

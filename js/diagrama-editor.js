/*
 * Editor de diagramas de flujo: armar el diagrama y que salga el programa.
 *
 * js/diagrama.js hace el camino de ida —del código al dibujo—. Esto hace el
 * de vuelta: se arma el diagrama con bloques y sale el programa en SLE2, que
 * después se dibuja con el mismo js/diagrama.js. O sea que el dibujo que se
 * ve nunca es «lo que el editor cree», es el dibujo del programa de verdad:
 * si los dos coincidieran solo por casualidad, se notaría enseguida.
 *
 * Decisiones que importan:
 *
 *   · el modelo es un árbol de bloques, no una tela con flechas sueltas. Un
 *     diagrama hecho con flechas libres puede quedar imposible de convertir
 *     en un programa (un salto al medio de un ciclo, por ejemplo), y este
 *     editor es para aprender a estructurar, no para dibujar cualquier cosa;
 *   · lo que se escribe adentro de un bloque es SLE2 tal cual —«total = 0»,
 *     «i < 10»— y no un formulario con casilleros. Es una materia de
 *     programación: la condición se escribe, no se arma con botones;
 *   · se puede traer un programa que ya existe (desdeAST) y seguir editando
 *     su diagrama. Sin eso el editor solo serviría para empezar de cero, que
 *     es la mitad de las veces que hace falta.
 *
 * Todo esto es cálculo puro sobre el modelo, sin DOM, así que
 * test/test-diagrama-editor.js lo prueba en Node.
 *
 * API:
 *   DiagramaEditor.vacio()                    -> modelo nuevo
 *   DiagramaEditor.codigo(modelo)             -> programa en SLE2
 *   DiagramaEditor.desdeAST(ast)              -> { modelo, resto } | null
 *   DiagramaEditor.agregar(m, padre, i, tipo) -> id del bloque nuevo
 *   DiagramaEditor.borrar(m, id) · mover(m, id, d) · buscar(m, id)
 *   DiagramaEditor.TIPOS                      -> qué bloques hay
 */
(function (global) {
  'use strict';

  /* Qué bloques hay, con qué campos y cómo se llaman en el dibujo. */
  const TIPOS = {
    proceso: {
      nombre: 'Proceso', forma: 'rectángulo',
      ayuda: 'Una asignación o una llamada: total = total + n',
      campos: [{ k: 'texto', etiqueta: 'Sentencia', ancho: 'largo' }],
      hijos: []
    },
    entrada: {
      nombre: 'Entrada', forma: 'romboide',
      ayuda: 'Leer un dato del teclado',
      campos: [{ k: 'variables', etiqueta: 'Variables' }],
      hijos: []
    },
    salida: {
      nombre: 'Salida', forma: 'romboide',
      ayuda: 'Mostrar algo en la pantalla',
      campos: [{ k: 'texto', etiqueta: 'Qué imprimir', ancho: 'largo' }],
      hijos: []
    },
    si: {
      nombre: 'Decisión', forma: 'rombo',
      ayuda: 'Si la condición se cumple va por un lado, y si no, por el otro',
      campos: [{ k: 'cond', etiqueta: 'Condición' }],
      hijos: ['entonces', 'sino']
    },
    mientras: {
      nombre: 'Mientras', forma: 'rombo + ciclo',
      ayuda: 'Repite mientras la condición se cumpla; puede no entrar nunca',
      campos: [{ k: 'cond', etiqueta: 'Condición' }],
      hijos: ['cuerpo']
    },
    repetir: {
      nombre: 'Repetir', forma: 'ciclo + rombo',
      ayuda: 'Repite hasta que la condición se cumpla; entra siempre al menos una vez',
      campos: [{ k: 'cond', etiqueta: 'Hasta que' }],
      hijos: ['cuerpo']
    },
    desde: {
      nombre: 'Desde', forma: 'ciclo contado',
      ayuda: 'Repite una cantidad conocida de veces',
      campos: [
        { k: 'ctrl', etiqueta: 'Variable' },
        { k: 'desde', etiqueta: 'Desde' },
        { k: 'hasta', etiqueta: 'Hasta' },
        { k: 'paso', etiqueta: 'Paso', opcional: true }
      ],
      hijos: ['cuerpo']
    }
  };

  let siguiente = 1;
  const nuevoId = () => 'b' + (siguiente++);

  function vacio() {
    return {
      nombre: '',
      vars: [],                       // [{ nombres: 'a, b', tipo: 'numerico' }]
      cuerpo: []
    };
  }

  /* ---------------------- crear y mover bloques ---------------------- */
  function bloque(tipo) {
    const spec = TIPOS[tipo];
    if (!spec) return null;
    const b = { id: nuevoId(), t: tipo };
    for (const c of spec.campos) b[c.k] = '';
    for (const h of spec.hijos) b[h] = [];
    if (tipo === 'desde') { b.ctrl = 'i'; b.desde = '1'; b.hasta = '10'; }
    return b;
  }

  /* Las listas de bloques que hay en el modelo, con su bloque padre. */
  function listas(modelo) {
    const out = [{ lista: modelo.cuerpo, padre: null, rama: 'cuerpo' }];
    const recorrer = lista => {
      for (const b of lista) {
        for (const h of (TIPOS[b.t] || { hijos: [] }).hijos) {
          out.push({ lista: b[h], padre: b, rama: h });
          recorrer(b[h]);
        }
      }
    };
    recorrer(modelo.cuerpo);
    return out;
  }

  function buscar(modelo, id) {
    for (const { lista, padre, rama } of listas(modelo)) {
      const i = lista.findIndex(b => b.id === id);
      if (i >= 0) return { bloque: lista[i], lista, indice: i, padre, rama };
    }
    return null;
  }

  /* Agrega un bloque. `donde` es null para el cuerpo principal, o
     { id, rama } para meterlo adentro de otro bloque. */
  function agregar(modelo, donde, indice, tipo) {
    const b = bloque(tipo);
    if (!b) return null;
    let lista = modelo.cuerpo;
    if (donde && donde.id) {
      const r = buscar(modelo, donde.id);
      if (!r) return null;
      const rama = donde.rama || (TIPOS[r.bloque.t].hijos[0]);
      if (!rama || !r.bloque[rama]) return null;
      lista = r.bloque[rama];
    }
    const i = indice === undefined || indice === null || indice < 0 || indice > lista.length
      ? lista.length : indice;
    lista.splice(i, 0, b);
    return b.id;
  }

  function borrar(modelo, id) {
    const r = buscar(modelo, id);
    if (!r) return false;
    r.lista.splice(r.indice, 1);
    return true;
  }

  /* Sube o baja un bloque entre sus hermanos. No se cambia de rama: mover un
     bloque del «entonces» al «sino» con una flecha sería adivinar. */
  function mover(modelo, id, d) {
    const r = buscar(modelo, id);
    if (!r) return false;
    const j = r.indice + d;
    if (j < 0 || j >= r.lista.length) return false;
    const [b] = r.lista.splice(r.indice, 1);
    r.lista.splice(j, 0, b);
    return true;
  }

  /* ------------------------- generar el código ----------------------- */
  const SANGRIA = '   ';

  function sentencia(b, nivel) {
    const s = SANGRIA.repeat(nivel);
    const linea = t => s + t;
    switch (b.t) {
      case 'proceso': return linea(b.texto || '/* falta la sentencia */');
      case 'entrada': return linea(`leer (${b.variables || 'n'})`);
      case 'salida': return linea(`imprimir (${b.texto || '""'})`);
      case 'si': {
        const out = [linea(`si (${b.cond || 'TRUE'})`), linea('{')];
        out.push(cuerpo(b.entonces, nivel + 1));
        if (b.sino && b.sino.length) {
          out.push(linea('sino'));
          out.push(cuerpo(b.sino, nivel + 1));
        }
        out.push(linea('}'));
        return out.filter(x => x !== '').join('\n');
      }
      case 'mientras':
        return [linea(`mientras (${b.cond || 'TRUE'})`), linea('{'),
          cuerpo(b.cuerpo, nivel + 1), linea('}')].filter(x => x !== '').join('\n');
      case 'repetir':
        return [linea('repetir'), cuerpo(b.cuerpo, nivel + 1),
          linea(`hasta (${b.cond || 'TRUE'})`)].filter(x => x !== '').join('\n');
      case 'desde': {
        const paso = b.paso && String(b.paso).trim() && String(b.paso).trim() !== '1'
          ? ` paso ${b.paso}` : '';
        return [linea(`desde ${b.ctrl || 'i'} = ${b.desde || '1'} hasta ${b.hasta || '10'}${paso}`),
          linea('{'), cuerpo(b.cuerpo, nivel + 1), linea('}')].filter(x => x !== '').join('\n');
      }
      default: return linea('/* bloque desconocido */');
    }
  }

  const cuerpo = (lista, nivel) => (lista || []).map(b => sentencia(b, nivel)).join('\n');

  function codigo(modelo) {
    const partes = [];
    if (modelo.nombre && modelo.nombre.trim()) partes.push('programa ' + modelo.nombre.trim());
    const vars = (modelo.vars || []).filter(v => v.nombres && v.nombres.trim());
    if (vars.length) {
      partes.push('var');
      for (const v of vars) partes.push(`${SANGRIA}${v.nombres.trim()} : ${v.tipo || 'numerico'}`);
    }
    partes.push('inicio');
    const c = cuerpo(modelo.cuerpo, 1);
    if (c) partes.push(c);
    partes.push('fin');
    return partes.join('\n') + '\n';
  }

  /* ---------------- volver a escribir una expresión ------------------ */
  /* No sirve el expr() de js/diagrama.js: ese arma ETIQUETAS para el dibujo
     —recorta lo largo y escribe los saltos de línea de verdad— y con eso el
     programa no vuelve a compilar. Acá hace falta lo contrario: texto que un
     compilador acepte y que signifique exactamente lo mismo.

     Los paréntesis se ponen solo donde hacen falta, mirando la precedencia:
     escribir todo entre paréntesis compilaría igual, pero el alumno vería un
     programa que no se parece al que escribió. */
  const PREC = {
    or: 1, and: 2,
    '==': 3, '=': 3, '<>': 3, '!=': 3, '<': 3, '<=': 3, '>': 3, '>=': 3,
    '+': 4, '-': 4,
    '*': 5, '/': 5, '%': 5,
    '^': 7
  };

  function cadenaSLE2(v) {
    return '"' + String(v)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t') + '"';
  }

  function textoExpr(e, prec) {
    const fuera = prec || 0;
    if (!e) return '';
    switch (e.t) {
      case 'num': return String(e.v);
      case 'cad': return cadenaSLE2(e.v);
      case 'id': return e.nombre;
      case 'indice': return textoExpr(e.base, 9) + '[' + textoExpr(e.idx, 0) + ']';
      case 'campo': return textoExpr(e.base, 9) + '.' + e.nombre;
      case 'llamada': return e.nombre + ' (' + (e.args || []).map(a => textoExpr(a, 0)).join(', ') + ')';
      case 'un': {
        const dentro = textoExpr(e.e, e.op === 'not' ? 2 : 6);
        const t = e.op === 'not' ? 'not ' + dentro : e.op + dentro;
        return (e.op === 'not' ? 2 : 6) < fuera ? '(' + t + ')' : t;
      }
      case 'bin': {
        const n = PREC[e.op] || 0;
        /* La potencia asocia a la derecha; el resto, a la izquierda. */
        const der = e.op === '^';
        const t = textoExpr(e.i, der ? n + 1 : n) + ' ' + e.op + ' ' + textoExpr(e.d, der ? n : n + 1);
        return n < fuera ? '(' + t + ')' : t;
      }
      case 'estruct': return '{ ' + (e.items || []).map(x => textoExpr(x, 0)).join(', ') + ' }';
      default: return '';
    }
  }

  /* ------------------- traer un programa que ya existe --------------- */
  /* Devuelve el modelo, y en `resto` lo que no se pudo representar. Se avisa
     en vez de tirarlo en silencio: un editor que se come sentencias sin
     decirlo es peor que uno que no importa nada. */
  function desdeAST(ast) {
    if (!ast) return null;
    const resto = [];


    function desdeLista(lista) {
      const out = [];
      for (const s of lista || []) {
        const b = desdeSentencia(s);
        if (b) out.push(b);
      }
      return out;
    }

    function desdeSentencia(s) {
      switch (s.t) {
        case 'asig': {
          const b = bloque('proceso');
          b.texto = `${textoExpr(s.destino)} = ${textoExpr(s.valor)}`;
          return b;
        }
        case 'exprStmt': {
          const e = s.expr;
          if (e && e.t === 'llamada' && e.nombre === 'leer') {
            const b = bloque('entrada');
            b.variables = (e.args || []).map(textoExpr).join(', ');
            return b;
          }
          if (e && e.t === 'llamada' && e.nombre === 'imprimir') {
            const b = bloque('salida');
            b.texto = (e.args || []).map(textoExpr).join(', ');
            return b;
          }
          const b = bloque('proceso');
          b.texto = textoExpr(e);
          return b;
        }
        case 'si': {
          const b = bloque('si');
          b.cond = textoExpr(s.cond);
          b.entonces = desdeLista(s.entonces);
          b.sino = desdeLista(s.sino);
          return b;
        }
        case 'mientras': {
          const b = bloque('mientras');
          b.cond = textoExpr(s.cond);
          b.cuerpo = desdeLista(s.cuerpo);
          return b;
        }
        case 'repetir': {
          const b = bloque('repetir');
          b.cond = textoExpr(s.cond);
          b.cuerpo = desdeLista(s.cuerpo);
          return b;
        }
        case 'desde': {
          const b = bloque('desde');
          b.ctrl = textoExpr(s.ctrl);
          b.desde = textoExpr(s.desde);
          b.hasta = textoExpr(s.hasta);
          b.paso = s.paso ? textoExpr(s.paso) : '';
          b.cuerpo = desdeLista(s.cuerpo);
          return b;
        }
        default:
          resto.push({ linea: s.linea || 0, t: s.t });
          return null;
      }
    }

    const modelo = vacio();
    modelo.nombre = ast.nombre || '';
    for (const d of ast.vars || []) {
      modelo.vars.push({
        nombres: (d.nombres || []).join(', '),
        tipo: d.tipo && d.tipo.k ? nombreTipo(d.tipo) : 'numerico'
      });
    }
    modelo.cuerpo = desdeLista(ast.cuerpo);
    /* Las subrutinas no se editan acá: el editor arma UNA rutina, que es el
       programa principal. Si el programa las tiene, se dice. */
    for (const s of ast.subs || []) resto.push({ linea: s.linea || 0, t: 'subrutina ' + s.nombre });
    return { modelo, resto };
  }

  function nombreTipo(t) {
    switch (t.k) {
      case 'cad': return 'cadena';
      case 'log': return 'logico';
      case 'num': return 'numerico';
      default: return 'numerico';
    }
  }

  global.DiagramaEditor = {
    TIPOS, vacio, bloque, codigo, desdeAST,
    agregar, borrar, mover, buscar, listas, textoExpr
  };
})(typeof window !== 'undefined' ? window : globalThis);

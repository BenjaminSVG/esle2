/*
 * Diagrama de flujo a partir del código.
 *
 * Toma el AST que devuelve SLE2.compilar() (o el de ESLE2 POO) y dibuja el
 * diagrama de flujo de cada rutina: el programa principal, cada subrutina y,
 * si es POO, cada método. Además del dibujo devuelve la misma cosa contada en
 * palabras, que es lo que se pide en la mayoría de los trabajos prácticos.
 *
 * Las formas son las de siempre:
 *   · óvalo .......... inicio y fin
 *   · rectángulo ..... proceso (una asignación, una llamada)
 *   · romboide ....... entrada y salida (leer / imprimir)
 *   · rombo .......... decisión (si, mientras, repetir, eval)
 *
 * El "desde" no tiene forma propia: se dibuja como lo que realmente hace —
 * inicializar la variable de control, preguntar por la condición, ejecutar el
 * cuerpo y sumar el paso— porque es la forma en que se explica en clase.
 *
 * Cada bloque del dibujo se arma con la misma interfaz: un rectángulo de
 * ancho w y alto h con la entrada arriba y la salida abajo, las dos sobre la
 * misma vertical `eje`. Componer un programa es apilar bloques haciendo
 * coincidir sus ejes, y por eso el algoritmo entra en tan poco código.
 *
 * API:  Diagrama.generar(ast) -> [{ titulo, svg, pasos: [{nivel, texto}] }]
 */
(function (global) {
  'use strict';

  /* Medidas, todas en píxeles del SVG. */
  const ALTO = 40;          // alto de un rectángulo
  const ALTO_ROMBO = 64;
  const CHAR = 6.7;         // ancho aproximado de un carácter a 12.5px
  const SALTO = 30;         // separación vertical entre bloques
  const MARGEN = 34;        // aire a los costados de un ciclo, para el retorno
  const MAX_TEXTO = 46;     // a partir de acá la etiqueta se recorta

  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const corto = t => (t.length > MAX_TEXTO ? t.slice(0, MAX_TEXTO - 1) + '…' : t);
  const ancho = t => Math.max(112, corto(t).length * CHAR + 34);
  const r = n => Math.round(n * 10) / 10;

  /* ------------------------------------------------------------------ */
  /* El código, escrito como texto                                       */
  /* ------------------------------------------------------------------ */
  function expr(e) {
    if (!e || !e.t) return '?';
    switch (e.t) {
      case 'num': return String(e.v);
      case 'cad': return '"' + e.v + '"';
      case 'id': return e.nombre;
      case 'indice': return expr(e.base) + '[' + expr(e.idx) + ']';
      case 'campo': return expr(e.base) + '.' + e.nombre;
      case 'llamada': return e.nombre + ' (' + e.args.map(expr).join(', ') + ')';
      case 'un': return e.op === 'not' ? 'not ' + expr(e.e) : e.op + expr(e.e);
      case 'bin': return expr(e.i) + ' ' + e.op + ' ' + expr(e.d);
      case 'estruct': return '{' + e.items.map(expr).concat(e.relleno ? ['…'] : []).join(', ') + '}';
      /* ESLE2 POO */
      case 'nulo': return 'nulo';
      case 'este': return 'este';
      case 'padre': return 'padre';
      case 'nuevo': return 'nuevo ' + e.clase + ' (' + e.args.map(expr).join(', ') + ')';
      case 'metodo': return expr(e.obj) + '.' + e.nombre + ' (' + e.args.map(expr).join(', ') + ')';
      case 'es': return expr(e.obj) + ' es ' + e.clase;
      default: return '…';
    }
  }

  const esLlamada = (n, nombre) =>
    n.t === 'exprStmt' && n.expr.t === 'llamada' && n.expr.nombre === nombre;

  /* ------------------------------------------------------------------ */
  /* Piezas del dibujo                                                   */
  /* ------------------------------------------------------------------ */
  function etiqueta(x, y, t, clase) {
    return `<text class="${clase || 'df-t'}" x="${r(x)}" y="${r(y)}">${esc(corto(t))}</text>`;
  }
  function titulo(t) {
    return t.length > MAX_TEXTO ? `<title>${esc(t)}</title>` : '';
  }
  /* Una línea quebrada; con punta de flecha en el último tramo. */
  function linea(puntos, conPunta) {
    const d = puntos.map((p, i) => (i ? 'L' : 'M') + r(p[0]) + ' ' + r(p[1])).join(' ');
    return `<path class="df-l" d="${d}"${conPunta === false ? '' : ' marker-end="url(#df-punta)"'}/>`;
  }

  function bloqueCaja(texto, clase, forma) {
    const w = ancho(texto), h = ALTO;
    return {
      w, h, eje: w / 2,
      svg(x, y) {
        const t = etiqueta(x + w / 2, y + h / 2 + 4.5, texto) + titulo(texto);
        if (forma === 'terminal')
          return `<g class="${clase}"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${h}" rx="${h / 2}"/>${t}</g>`;
        if (forma === 'es') {
          const s = 14;
          const p = `${r(x + s)},${r(y)} ${r(x + w)},${r(y)} ${r(x + w - s)},${r(y + h)} ${r(x)},${r(y + h)}`;
          return `<g class="${clase}"><polygon points="${p}"/>${t}</g>`;
        }
        return `<g class="${clase}"><rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${h}" rx="3"/>${t}</g>`;
      }
    };
  }
  const bProceso = t => bloqueCaja(t, 'df-proceso');
  const bTerminal = t => bloqueCaja(t, 'df-terminal', 'terminal');
  const bES = t => bloqueCaja(t, 'df-es', 'es');

  /* Un tramo de recta: el "si no" que no tiene sentencias. */
  function bHueco() {
    return { w: 76, h: 20, eje: 38, svg: (x, y) => linea([[x + 38, y], [x + 38, y + 20]], false) };
  }

  function rombo(cx, y, w, texto) {
    const h = ALTO_ROMBO;
    const p = `${r(cx)},${r(y)} ${r(cx + w / 2)},${r(y + h / 2)} ${r(cx)},${r(y + h)} ${r(cx - w / 2)},${r(y + h / 2)}`;
    return `<g class="df-decision"><polygon points="${p}"/>` +
           etiqueta(cx, y + h / 2 + 4.5, texto) + titulo(texto) + '</g>';
  }
  const anchoRombo = t => Math.max(136, ancho(t) + 46);

  /* ------------------------------------------------------------------ */
  /* Composición                                                         */
  /* ------------------------------------------------------------------ */
  function bSecuencia(items) {
    const bs = items.map(x => (typeof x.svg === 'function' ? x : bloque(x)));
    if (!bs.length) return bHueco();
    if (bs.length === 1) return bs[0];
    const eje = Math.max.apply(null, bs.map(b => b.eje));
    const w = Math.max.apply(null, bs.map(b => eje - b.eje + b.w));
    const h = bs.reduce((s, b) => s + b.h, 0) + SALTO * (bs.length - 1);
    return {
      w, h, eje,
      svg(x, y) {
        let out = '', cy = y;
        bs.forEach((b, i) => {
          if (i) { out += linea([[x + eje, cy], [x + eje, cy + SALTO]]); cy += SALTO; }
          out += b.svg(x + eje - b.eje, cy);
          cy += b.h;
        });
        return out;
      }
    };
  }

  /* si / eval: rombo arriba y las dos ramas al costado. */
  function bSi(n) {
    const cond = expr(n.cond);
    const A = bSecuencia(n.entonces);
    const B = n.sino && n.sino.length ? bSecuencia(n.sino) : bHueco();
    const dw = anchoRombo(cond);
    /* Las ramas se separan lo suficiente como para que el rombo entre entre
       las dos verticales, si no las flechas saldrían hacia adentro. */
    const sep = Math.max(34, dw + 24 - (A.w - A.eje) - B.eje);
    const xa = A.eje, xb = A.w + sep + B.eje;
    const cx = (xa + xb) / 2;
    const yRamas = ALTO_ROMBO + SALTO;
    const altoRamas = Math.max(A.h, B.h);
    const yUnion = yRamas + altoRamas + 26;
    const h = yUnion + 26;
    const w = Math.max(A.w + sep + B.w, cx + dw / 2);
    return {
      w, h, eje: cx,
      svg(x, y) {
        const izq = x + cx - dw / 2, der = x + cx + dw / 2, medio = y + ALTO_ROMBO / 2;
        return rombo(x + cx, y, dw, cond) +
          etiqueta(izq - 7, medio - 7, 'sí', 'df-r df-fin') +
          etiqueta(der + 7, medio - 7, 'no', 'df-r') +
          linea([[izq, medio], [x + xa, medio], [x + xa, y + yRamas]]) +
          linea([[der, medio], [x + xb, medio], [x + xb, y + yRamas]]) +
          A.svg(x + xa - A.eje, y + yRamas) +
          B.svg(x + xb - B.eje, y + yRamas) +
          linea([[x + xa, y + yRamas + A.h], [x + xa, y + yUnion], [x + cx, y + yUnion]], false) +
          linea([[x + xb, y + yRamas + B.h], [x + xb, y + yUnion], [x + cx, y + yUnion]], false) +
          linea([[x + cx, y + yUnion], [x + cx, y + h]]);
      }
    };
  }

  /* mientras: se pregunta antes de entrar y se vuelve por la izquierda. */
  function bMientras(cond, cuerpo) {
    const C = bSecuencia(cuerpo);
    const dw = anchoRombo(cond);
    const cx = MARGEN + Math.max(dw / 2, C.eje);
    const w = cx + Math.max(dw / 2, C.w - C.eje) + MARGEN;
    const arriba = 22, yC = arriba + ALTO_ROMBO + SALTO, finC = yC + C.h;
    const h = finC + 58;
    return {
      w, h, eje: cx,
      svg(x, y) {
        const der = x + cx + dw / 2, medio = y + arriba + ALTO_ROMBO / 2;
        return linea([[x + cx, y], [x + cx, y + arriba]], false) +
          rombo(x + cx, y + arriba, dw, cond) +
          etiqueta(x + cx + 8, y + arriba + ALTO_ROMBO + 16, 'sí', 'df-r') +
          etiqueta(der + 7, medio - 7, 'no', 'df-r') +
          linea([[x + cx, y + arriba + ALTO_ROMBO], [x + cx, y + yC]]) +
          C.svg(x + cx - C.eje, y + yC) +
          /* vuelta al principio, por el margen izquierdo */
          linea([[x + cx, y + finC], [x + cx, y + finC + 18], [x + 12, y + finC + 18],
                 [x + 12, y + 8], [x + cx, y + 8], [x + cx, y + arriba]]) +
          /* salida, por el margen derecho */
          linea([[der, medio], [x + w - 12, medio], [x + w - 12, y + finC + 38],
                 [x + cx, y + finC + 38], [x + cx, y + h]]);
      }
    };
  }

  /* repetir … hasta: el cuerpo se ejecuta y recién después se pregunta. */
  function bRepetir(n) {
    const cond = expr(n.cond);
    const C = bSecuencia(n.cuerpo);
    const dw = anchoRombo(cond);
    const cx = MARGEN + Math.max(dw / 2, C.eje);
    const w = cx + Math.max(dw / 2, C.w - C.eje) + MARGEN;
    const arriba = 22, finC = arriba + C.h, yD = finC + SALTO;
    const h = yD + ALTO_ROMBO + 30;
    return {
      w, h, eje: cx,
      svg(x, y) {
        const izq = x + cx - dw / 2, medio = y + yD + ALTO_ROMBO / 2;
        return linea([[x + cx, y], [x + cx, y + arriba]], false) +
          C.svg(x + cx - C.eje, y + arriba) +
          linea([[x + cx, y + finC], [x + cx, y + yD]]) +
          rombo(x + cx, y + yD, dw, cond) +
          etiqueta(izq - 7, medio - 7, 'no', 'df-r df-fin') +
          etiqueta(x + cx + 8, y + yD + ALTO_ROMBO + 16, 'sí', 'df-r') +
          linea([[izq, medio], [x + 12, medio], [x + 12, y + 8], [x + cx, y + 8], [x + cx, y + arriba]]) +
          linea([[x + cx, y + yD + ALTO_ROMBO], [x + cx, y + h]]);
      }
    };
  }

  /* eval se dibuja como los "si" encadenados que en el fondo es. */
  function evalComoSi(n, k) {
    const c = n.casos[k];
    return {
      t: 'si', cond: c.cond, entonces: c.cuerpo, linea: c.linea,
      sino: k + 1 < n.casos.length ? [evalComoSi(n, k + 1)] : n.sino
    };
  }

  function pasoDe(n) { return n.paso ? expr(n.paso) : '1'; }
  const pasoNegativo = n => !!n.paso && n.paso.t === 'un' && n.paso.op === '-';

  function bloque(n) {
    switch (n.t) {
      case 'asig': return bProceso(expr(n.destino) + ' = ' + expr(n.valor));
      case 'si': return bSi(n);
      case 'eval': return bSi(evalComoSi(n, 0));
      case 'mientras': return bMientras(expr(n.cond), n.cuerpo);
      case 'repetir': return bRepetir(n);
      case 'desde': {
        const v = expr(n.ctrl), p = pasoDe(n);
        const cond = v + (pasoNegativo(n) ? ' >= ' : ' <= ') + expr(n.hasta);
        const inc = bProceso(v + ' = ' + v + ' + ' + p);
        return bSecuencia([
          bProceso(v + ' = ' + expr(n.desde)),
          bMientras(cond, n.cuerpo.concat([inc]))
        ]);
      }
      /* ponytail: `retorna` se dibuja como terminal y el hilo sigue; poner el
         salto al final de la rutina duplicaría medio diagrama por una
         sentencia que en SLE2 casi siempre es la última. */
      case 'retorna': return bTerminal('retorna ' + expr(n.valor));
      case 'exprStmt':
        if (esLlamada(n, 'imprimir')) return bES('Mostrar ' + n.expr.args.map(expr).join(', '));
        if (esLlamada(n, 'leer')) return bES('Leer ' + n.expr.args.map(expr).join(', '));
        return bProceso(expr(n.expr));
      default: return bProceso(expr(n));
    }
  }

  /* ------------------------------------------------------------------ */
  /* La misma cosa, contada en palabras                                  */
  /* ------------------------------------------------------------------ */
  function pasos(cuerpo, nivel, salida) {
    for (const n of cuerpo) {
      const p = t => salida.push({ nivel, texto: t });
      switch (n.t) {
        case 'asig':
          p('Se guarda ' + expr(n.valor) + ' en ' + expr(n.destino) + '.'); break;
        case 'si':
          p('Si se cumple (' + expr(n.cond) + '):');
          pasos(n.entonces, nivel + 1, salida);
          if (n.sino && n.sino.length) {
            p('Si no:');
            pasos(n.sino, nivel + 1, salida);
          }
          break;
        case 'eval':
          p('Se toma el primer caso que se cumpla:');
          n.casos.forEach(c => {
            salida.push({ nivel: nivel + 1, texto: 'Caso (' + expr(c.cond) + '):' });
            pasos(c.cuerpo, nivel + 2, salida);
          });
          if (n.sino && n.sino.length) {
            salida.push({ nivel: nivel + 1, texto: 'Si no se cumple ningún caso:' });
            pasos(n.sino, nivel + 2, salida);
          }
          break;
        case 'mientras':
          p('Mientras se cumpla (' + expr(n.cond) + '), se repite:');
          pasos(n.cuerpo, nivel + 1, salida);
          p('Cuando la condición deja de cumplirse, el ciclo termina.');
          break;
        case 'repetir':
          p('Se repite lo siguiente hasta que se cumpla (' + expr(n.cond) + '):');
          pasos(n.cuerpo, nivel + 1, salida);
          p('El cuerpo se ejecuta siempre al menos una vez.');
          break;
        case 'desde': {
          const v = expr(n.ctrl);
          p('Para ' + v + ' desde ' + expr(n.desde) + ' hasta ' + expr(n.hasta) +
            (n.paso ? ', de a ' + pasoDe(n) : '') + ', se repite:');
          pasos(n.cuerpo, nivel + 1, salida);
          salida.push({ nivel: nivel + 1, texto: 'Se le suma ' + pasoDe(n) + ' a ' + v + ' y se vuelve a preguntar.' });
          break;
        }
        case 'retorna':
          p('Se devuelve ' + expr(n.valor) + ' y la subrutina termina acá.'); break;
        case 'exprStmt':
          if (esLlamada(n, 'imprimir')) p('Se muestra en pantalla ' + n.expr.args.map(expr).join(', ') + '.');
          else if (esLlamada(n, 'leer')) p('Se lee de la entrada y se guarda en ' + n.expr.args.map(expr).join(', ') + '.');
          else p('Se ejecuta ' + expr(n.expr) + '.');
          break;
        default:
          p('Se ejecuta ' + expr(n) + '.');
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Armado del SVG                                                      */
  /* ------------------------------------------------------------------ */
  const DEFS =
    '<defs><marker id="df-punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" ' +
    'markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>';

  function dibujar(inicio, cuerpo, fin) {
    const b = bSecuencia([bTerminal(inicio)].concat(cuerpo, [bTerminal(fin)]));
    const P = 16;
    const w = Math.ceil(b.w + P * 2), h = Math.ceil(b.h + P * 2);
    return `<svg class="df" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" ` +
      `width="${w}" height="${h}" role="img" aria-label="Diagrama de flujo">` +
      DEFS + b.svg(P, P) + '</svg>';
  }

  function rutina(titulo, inicio, fin, cuerpo) {
    const ps = [{ nivel: 0, texto: inicio + '.' }];
    pasos(cuerpo, 0, ps);
    ps.push({ nivel: 0, texto: fin + '.' });
    return { titulo, svg: dibujar(inicio, cuerpo, fin), pasos: ps };
  }

  const firma = s => s.nombre + ' (' + (s.params || []).map(p => p.nombre).join(', ') + ')';

  function generar(ast) {
    const out = [rutina(
      ast.nombre ? 'Programa ' + ast.nombre : 'Programa principal',
      'Inicio', 'Fin', ast.cuerpo)];

    for (const s of ast.subs || [])
      out.push(rutina('Subrutina ' + firma(s),
        'Inicio de ' + firma(s), 'Fin de ' + s.nombre, s.cuerpo));

    for (const c of ast.clases || []) {
      if (c.constructor && c.constructor.cuerpo)
        out.push(rutina('Constructor de ' + c.nombre,
          'Inicio del constructor de ' + c.nombre, 'Fin del constructor', c.constructor.cuerpo));
      for (const m of c.metodos || []) {
        if (m.abstracto || !m.cuerpo) continue;
        out.push(rutina(c.nombre + '.' + firma(m),
          'Inicio de ' + c.nombre + '.' + firma(m), 'Fin de ' + m.nombre, m.cuerpo));
      }
    }
    return out;
  }

  /* La explicación como texto plano numerado, para copiar y pegar. */
  function texto(ps) {
    const cont = [];
    return ps.map(p => {
      cont.length = p.nivel + 1;
      for (let i = 0; i < cont.length; i++) if (!cont[i]) cont[i] = 0;
      cont[p.nivel]++;
      return '   '.repeat(p.nivel) + cont.join('.') + '. ' + p.texto;
    }).join('\n');
  }

  global.Diagrama = { generar, texto, expr, pasos };
})(typeof window !== 'undefined' ? window : globalThis);

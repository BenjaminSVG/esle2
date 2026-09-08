/*
 * Diseñador de ventanas de ESLE2 Visual: la parte que se puede pensar sin DOM.
 *
 * Deja acomodar los controles arrastrándolos en vez de adivinando números, que
 * es lo que uno quiere hacer, y lo que hasta ahora había que hacer a mano:
 *
 *     b = boton ("Saludar", 30, 40, 120, 34)
 *                            ↑   ↑    ↑   ↑
 *                            ¿y ahora cuánto le sumo?
 *
 * ------------------------------------------------------------------------
 * El código sigue siendo la fuente de la verdad
 * ------------------------------------------------------------------------
 * Esto NO es un diseñador que guarde el diseño en un archivo aparte y escupa
 * código generado. Eso deja al alumno con dos cosas que se desincronizan y con
 * un programa que él no escribió. Acá el diseñador **edita los números que ya
 * están en el programa**: arrastrar un botón cambia el 30 y el 40 de su
 * línea, y nada más de esa línea. La sangría, los comentarios al final, los
 * espacios raros y el resto del archivo quedan intactos.
 *
 * De ahí sale una regla honesta, y la interfaz la dice: solo se puede arrastrar
 * un control cuyas coordenadas sean **números escritos**. Si alguien escribió
 * `boton ("Ok", x, y + 10, 100, 30)`, ese control se ve en el diseñador pero no
 * se mueve: mover un `y + 10` querría decir cambiar `y`, que puede valer
 * cualquier cosa y estar usada en otras diez líneas. Se muestra y se explica
 * en vez de romper el programa por atrás.
 *
 * Tampoco se muestran los controles creados adentro de un `si`, un `mientras`
 * o una subrutina: no existen hasta que el programa pasa por ahí, así que no
 * tienen un lugar fijo que dibujar. Se cuentan y se avisa cuántos son.
 *
 * ------------------------------------------------------------------------
 * API (cálculo puro, sin DOM: lo prueba test/test-disenador.js)
 * ------------------------------------------------------------------------
 *   Disenador.leer(fuente)                     -> { ventana, controles, otros, error }
 *   Disenador.mover(fuente, ctrl, caja)        -> fuente nueva
 *   Disenador.texto(fuente, ctrl, texto)       -> fuente nueva
 *   Disenador.tamanoVentana(fuente, an, al)    -> fuente nueva
 *   Disenador.agregar(fuente, tipo, caja)      -> { fuente, nombre }
 *   Disenador.borrar(fuente, ctrl)             -> { fuente, quitadas }
 */
(function (global) {
  'use strict';

  /* Los tipos que crean un control, con su forma. Sale de la misma tabla que
     usa el intérprete (SLE2VIS.CONTROLES) para que no puedan discrepar: si
     algún día se agrega un control nuevo al lenguaje, aparece acá solo. */
  function tabla() {
    const V = global.SLE2VIS;
    return (V && V.CONTROLES) || {};
  }

  const NOMBRE_LINDO = {
    etiqueta: 'Etiqueta', boton: 'Botón', caja: 'Caja de texto',
    casilla: 'Casilla', lista: 'Lista', deslizador: 'Deslizador', lienzo: 'Lienzo'
  };

  /* Las subrutinas que registran un evento sobre un control. Si se borra el
     control, estas líneas quedarían apuntando a algo que ya no existe. */
  const EVENTOS = ['al_hacer_clic', 'al_cambiar', 'al_escribir'];

  /* ------------------------------------------------------------------ */
  /* Encontrar los argumentos de una llamada, dentro del texto de una línea */
  /* ------------------------------------------------------------------ */
  /*
   * Devuelve, para la primera llamada a `nombre` que haya en la línea, dónde
   * empieza y dónde termina cada argumento, en caracteres.
   *
   * Se hace sobre el texto y no sobre el árbol porque el árbol no guarda
   * columnas, y porque la idea es tocar exactamente los caracteres del
   * argumento y ni uno más: así el comentario del final, la sangría y los
   * espacios que la persona puso siguen donde estaban.
   */
  function argumentos(linea, nombre) {
    /* La llamada, con el nombre como palabra entera y lo que venga hasta el
       paréntesis (SLE2 permite «boton (» con espacio en el medio). */
    const re = new RegExp('(^|[^A-Za-z0-9_])' + nombre + '\\s*\\(', 'g');
    const m = re.exec(linea);
    if (!m) return null;

    let i = m.index + m[0].length;        // justo después del "("
    const partes = [];
    let desde = i, hondo = 0, comilla = null;

    for (; i < linea.length; i++) {
      const c = linea[i];
      if (comilla) {
        if (comilla.indexOf(c) >= 0) comilla = null;
        continue;
      }
      /* La misma regla que el tokenizador de SLE2 (ver ABRE_CAD en sle2.js):
         una cadena abierta con " se cierra con " o con ”, y una abierta con '
         se cierra con ' o con ’. Si acá se cerrara distinto que allá, se
         estarían contando argumentos que el compilador no ve. */
      if (c === '"' || c === '“') { comilla = '"”'; continue; }
      if (c === "'" || c === '‘') { comilla = "'’"; continue; }
      if (c === '(' || c === '[') { hondo++; continue; }
      if (c === ')' && hondo === 0) break;
      if (c === ')' || c === ']') { hondo--; continue; }
      if (c === ',' && hondo === 0) { partes.push([desde, i]); desde = i + 1; continue; }
    }
    if (i >= linea.length) return null;               // paréntesis sin cerrar
    if (linea.slice(desde, i).trim()) partes.push([desde, i]);

    /* Se recortan los espacios de los bordes para que reemplazar un argumento
       no se coma la separación que la persona escribió. */
    return {
      cierre: i,
      args: partes.map(([a, b]) => {
        while (a < b && /\s/.test(linea[a])) a++;
        while (b > a && /\s/.test(linea[b - 1])) b--;
        return { desde: a, hasta: b, texto: linea.slice(a, b) };
      })
    };
  }

  /* Cambia varios argumentos de una línea de una sola pasada. Los cambios se
     aplican de atrás para adelante para que las posiciones no se corran. */
  function cambiarArgs(linea, nombre, cambios) {
    const c = argumentos(linea, nombre);
    if (!c) return linea;
    const ordenados = Object.keys(cambios).map(Number)
      .filter(k => c.args[k]).sort((a, b) => b - a);
    let salida = linea;
    for (const k of ordenados) {
      const a = c.args[k];
      salida = salida.slice(0, a.desde) + String(cambios[k]) + salida.slice(a.hasta);
    }
    return salida;
  }

  /* Agrega argumentos al final de la llamada (para cuando alguien escribió
     `boton ("Ok", 10, 20)` sin ancho ni alto y ahora lo estira). */
  function agregarArgs(linea, nombre, valores) {
    const c = argumentos(linea, nombre);
    if (!c) return linea;
    return linea.slice(0, c.cierre) + ', ' + valores.join(', ') + linea.slice(c.cierre);
  }

  /* ------------------------------------------------------------------ */
  /* Leer el programa                                                    */
  /* ------------------------------------------------------------------ */
  const esNum = n => n && n.t === 'num';
  const esCad = n => n && n.t === 'cad';

  function leer(fuente) {
    const V = global.SLE2VIS;
    const CONTROLES = tabla();
    let ast;
    try {
      ast = V.compilar(fuente);
    } catch (e) {
      /* Sin un programa que compile no hay nada que dibujar. Se devuelve el
         error tal cual para poder decir en qué línea está. */
      return { ventana: null, controles: [], otros: 0, error: e };
    }

    const lineas = fuente.split('\n');
    const salida = { ventana: null, controles: [], otros: 0, error: null };

    /* La ventana. */
    let n = 0;
    for (const s of ast.cuerpo) {
      const ll = llamadaDe(s);
      if (!ll || ll.nombre !== 'ventana') continue;
      salida.ventana = {
        linea: s.linea,
        titulo: esCad(ll.args[0]) ? ll.args[0].v : null,
        ancho: esNum(ll.args[1]) ? ll.args[1].v : 420,
        alto: esNum(ll.args[2]) ? ll.args[2].v : 300,
        medible: esNum(ll.args[1]) && esNum(ll.args[2])
      };
      break;
    }

    /* Los controles del cuerpo principal, uno por sentencia. */
    for (const s of ast.cuerpo) {
      const ll = llamadaDe(s);
      if (!ll || !CONTROLES[ll.nombre]) continue;
      const def = CONTROLES[ll.nombre];
      const conTexto = !!def.texto;
      const a = ll.args;
      let i = 0;
      const argTexto = conTexto ? a[i++] : null;
      const argX = a[i++], argY = a[i++];
      const argAncho = a[i++], argAlto = a[i++];

      salida.controles.push({
        n: n++,
        linea: s.linea,
        tipo: ll.nombre,
        etiquetaTipo: NOMBRE_LINDO[ll.nombre] || ll.nombre,
        /* La variable donde quedó guardado, si se guardó. Es lo que hace
           falta para poder atender su clic. */
        variable: s.t === 'asig' && s.destino.t === 'id' ? s.destino.nombre : null,
        texto: conTexto ? (esCad(argTexto) ? argTexto.v : null) : null,
        editableTexto: conTexto && esCad(argTexto),
        x: esNum(argX) ? argX.v : 0,
        y: esNum(argY) ? argY.v : 0,
        ancho: argAncho ? (esNum(argAncho) ? argAncho.v : def.ancho) : def.ancho,
        alto: argAlto ? (esNum(argAlto) ? argAlto.v : def.alto) : def.alto,
        /* Solo se puede arrastrar lo que está escrito como número. */
        movible: esNum(argX) && esNum(argY),
        medible: (!argAncho && !argAlto) || (esNum(argAncho) && esNum(argAlto)),
        /* Si no tiene ancho ni alto escritos, estirarlo se los agrega. */
        tieneMedidas: !!(argAncho && argAlto),
        indiceX: conTexto ? 1 : 0
      });
    }

    /* Los que se crean en otro lado —adentro de un si, de un ciclo o de una
       subrutina— existen pero no tienen un lugar fijo que dibujar. Se cuentan
       para poder decirlo en vez de que parezcan perdidos. */
    salida.otros = contarEnOtroLado(ast, CONTROLES, salida.controles.length);

    /* Para dibujar, el que está más abajo en el código va más adelante, que es
       lo mismo que hace el runtime. */
    salida.lineas = lineas;
    return salida;
  }

  /* La llamada de una sentencia, sea `boton (…)` o `b = boton (…)`. */
  function llamadaDe(s) {
    if (!s) return null;
    if (s.t === 'exprStmt' && s.expr && s.expr.t === 'llamada') return s.expr;
    if (s.t === 'asig' && s.valor && s.valor.t === 'llamada') return s.valor;
    return null;
  }

  function contarEnOtroLado(ast, CONTROLES, yaContados) {
    let total = 0;
    const S = global.SLE2;
    if (!S || !S.recorrer) return 0;
    const contar = nodo => {
      if (nodo && nodo.t === 'llamada' && CONTROLES[nodo.nombre]) total++;
    };
    try {
      S.recorrer(ast, contar);
    } catch (e) { return 0; }
    return Math.max(0, total - yaContados);
  }

  /* ------------------------------------------------------------------ */
  /* Cambiar el programa                                                 */
  /* ------------------------------------------------------------------ */
  const conLineas = (fuente, i, nueva) => {
    const l = fuente.split('\n');
    l[i] = nueva;
    return l.join('\n');
  };

  /* Mover y/o estirar. `caja` puede traer x, y, ancho y alto, todos opcionales. */
  function mover(fuente, ctrl, caja) {
    const lineas = fuente.split('\n');
    const i = ctrl.linea - 1;
    if (i < 0 || i >= lineas.length) return fuente;
    let linea = lineas[i];
    const b = ctrl.indiceX;                       // dónde empieza la x

    const cambios = {};
    if (caja.x !== undefined && ctrl.movible) cambios[b] = Math.round(caja.x);
    if (caja.y !== undefined && ctrl.movible) cambios[b + 1] = Math.round(caja.y);

    const estira = caja.ancho !== undefined || caja.alto !== undefined;
    if (estira && ctrl.medible) {
      if (ctrl.tieneMedidas) {
        if (caja.ancho !== undefined) cambios[b + 2] = Math.round(caja.ancho);
        if (caja.alto !== undefined) cambios[b + 3] = Math.round(caja.alto);
      } else {
        /* No los tenía escritos: se agregan los dos, porque el ancho sin el
           alto no es una llamada válida. */
        linea = agregarArgs(linea, ctrl.tipo, [
          Math.round(caja.ancho !== undefined ? caja.ancho : ctrl.ancho),
          Math.round(caja.alto !== undefined ? caja.alto : ctrl.alto)
        ]);
      }
    }
    if (Object.keys(cambios).length) linea = cambiarArgs(linea, ctrl.tipo, cambios);
    return conLineas(fuente, i, linea);
  }

  /* Cambiar el texto de un control que lleva texto. */
  function texto(fuente, ctrl, nuevo) {
    if (!ctrl.editableTexto) return fuente;
    const lineas = fuente.split('\n');
    const i = ctrl.linea - 1;
    if (i < 0 || i >= lineas.length) return fuente;
    return conLineas(fuente, i, cambiarArgs(lineas[i], ctrl.tipo, { 0: comillas(nuevo) }));
  }

  /*
   * Un texto listo para meter en el programa.
   *
   * SLE2 no tiene escapes adentro de una cadena, así que una comilla suelta la
   * cortaría al medio y rompería el programa. Y ojo con el atajo obvio: una
   * cadena abierta con " también se cierra con ”, así que cambiar " por ”
   * —que fue lo primero que se probó— no arregla nada, la corta igual. Adentro
   * de una cadena con comillas dobles, la comilla simple es un carácter más y
   * no cierra nada, así que esa es la que se usa.
   *
   * El salto de línea se cambia por un espacio: una cadena de SLE2 vive en una
   * sola línea, y meter un salto partiría la línea del programa en dos.
   */
  function comillas(t) {
    return '"' + String(t === undefined || t === null ? '' : t)
      .replace(/\r?\n/g, ' ')
      .replace(/["”“]/g, "'") + '"';
  }

  function tamanoVentana(fuente, ancho, alto) {
    const d = leer(fuente);
    if (!d.ventana || !d.ventana.medible) return fuente;
    const lineas = fuente.split('\n');
    const i = d.ventana.linea - 1;
    return conLineas(fuente, i,
      cambiarArgs(lineas[i], 'ventana', { 1: Math.round(ancho), 2: Math.round(alto) }));
  }

  /* ------------------------------------------------------------------ */
  /* Agregar un control                                                  */
  /* ------------------------------------------------------------------ */
  /*
   * Se inserta la línea justo antes de `esperar_eventos()` —que es donde el
   * programa se queda esperando, así que todo lo que se cree después no se
   * vería— y se declara una variable para guardarlo. Lo de la variable no es
   * un capricho: sin ella no se le puede poner un `al_hacer_clic`, y un botón
   * que no se puede atender no sirve para nada.
   */
  function agregar(fuente, tipo, caja) {
    const CONTROLES = tabla();
    const def = CONTROLES[tipo];
    if (!def) return { fuente, nombre: null };

    const d = leer(fuente);
    const usados = new Set(d.controles.map(c => c.variable).filter(Boolean));
    /* Un nombre corto y libre: boton1, boton2… */
    let k = 1;
    while (usados.has(tipo + k)) k++;
    const nombre = tipo + k;

    const x = Math.round(caja && caja.x !== undefined ? caja.x : 20);
    const y = Math.round(caja && caja.y !== undefined ? caja.y : 20);
    const ancho = Math.round(caja && caja.ancho !== undefined ? caja.ancho : def.ancho);
    const alto = Math.round(caja && caja.alto !== undefined ? caja.alto : def.alto);
    const rotulo = caja && caja.texto !== undefined ? caja.texto : (NOMBRE_LINDO[tipo] || tipo);

    const partes = [];
    if (def.texto) partes.push(comillas(rotulo));
    partes.push(x, y, ancho, alto);
    const llamada = `${nombre} = ${tipo} (${partes.join(', ')})`;

    let lineas = fuente.split('\n');
    const sangria = sangriaDe(lineas, d);
    const donde = dondeInsertar(lineas, d);
    lineas.splice(donde, 0, sangria + llamada);

    lineas = declarar(lineas, nombre);
    return { fuente: lineas.join('\n'), nombre };
  }

  /* La sangría que usa el programa: se copia la de la línea de la ventana, o
     tres espacios, que es lo que usa todo ESLE2. */
  function sangriaDe(lineas, d) {
    if (d.ventana) {
      const m = /^\s*/.exec(lineas[d.ventana.linea - 1] || '');
      if (m && m[0]) return m[0];
    }
    return '   ';
  }

  /* Antes de esperar_eventos(); si no hay, antes del «fin» del programa. */
  function dondeInsertar(lineas, d) {
    for (let i = 0; i < lineas.length; i++) {
      if (/(^|[^A-Za-z0-9_])esperar_eventos\s*\(/.test(lineas[i])) return i;
    }
    const ultimo = d.controles.length ? d.controles[d.controles.length - 1].linea : 0;
    if (ultimo) return ultimo;
    for (let i = 0; i < lineas.length; i++) if (/^\s*fin\b/.test(lineas[i])) return i;
    return lineas.length;
  }

  /* Declara la variable en el bloque `var`, y si no hay bloque, lo crea justo
     antes de `inicio`. */
  function declarar(lineas, nombre) {
    let iVar = -1, iInicio = -1;
    for (let i = 0; i < lineas.length; i++) {
      if (iVar < 0 && /^\s*(var|variables)\s*$/i.test(lineas[i])) iVar = i;
      if (/^\s*inicio\b/i.test(lineas[i])) { iInicio = i; break; }
    }
    const decl = '   ' + nombre + ' : numerico';

    if (iVar >= 0) {
      /* Al final de las declaraciones que ya hay: la última línea con «:»
         antes de `inicio`. */
      let fin = iVar;
      for (let i = iVar + 1; i < (iInicio < 0 ? lineas.length : iInicio); i++) {
        if (/:/.test(lineas[i])) fin = i;
      }
      lineas.splice(fin + 1, 0, decl);
      return lineas;
    }
    if (iInicio >= 0) {
      lineas.splice(iInicio, 0, 'var', decl);
      return lineas;
    }
    return lineas;
  }

  /* ------------------------------------------------------------------ */
  /* Borrar un control                                                   */
  /* ------------------------------------------------------------------ */
  /*
   * Se va su línea, y también las que le registraban un evento: dejar un
   * `al_hacer_clic (b, "saludar")` apuntando a un botón que ya no existe hace
   * que el programa reviente al ejecutarlo, y la persona no tendría cómo saber
   * por qué. Se devuelve cuántas se quitaron para poder decirlo.
   */
  function borrar(fuente, ctrl) {
    const lineas = fuente.split('\n');
    const i = ctrl.linea - 1;
    if (i < 0 || i >= lineas.length) return { fuente, quitadas: 0 };

    const fuera = new Set([i]);
    if (ctrl.variable) {
      for (let k = 0; k < lineas.length; k++) {
        if (fuera.has(k)) continue;
        for (const ev of EVENTOS) {
          const c = argumentos(lineas[k], ev);
          if (c && c.args[0] && c.args[0].texto === ctrl.variable) fuera.add(k);
        }
      }
    }
    const quedan = lineas.filter((_, k) => !fuera.has(k));
    return { fuente: quedan.join('\n'), quitadas: fuera.size - 1 };
  }

  global.Disenador = {
    leer, mover, texto, tamanoVentana, agregar, borrar,
    argumentos, cambiarArgs, agregarArgs, comillas,
    NOMBRE_LINDO, EVENTOS
  };
})(typeof window !== 'undefined' ? window : globalThis);

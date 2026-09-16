/*
 * Corrección automática de los ejercicios de ESLE2 BD.
 *
 * El curso normal compara lo que imprime el programa con lo que se esperaba.
 * Acá eso no sirve: la mitad de los ejercicios no imprimen nada —crear una
 * tabla, modificar filas, borrar— y en la otra mitad alcanzaría con escribir
 * los imprimir() a mano, sin tocar la base, para aprobar. Lo que hay que mirar
 * es la base que quedó y el resultado de la última consulta.
 *
 * Es el mismo criterio que verificar-visual.js, que mira la ventana en vez del
 * texto.
 *
 * Una prueba es un objeto:
 *
 *   { nombre: 'La tabla queda con las tres columnas',
 *     preparar: 'CREAR TABLA ...',        // SQL que corre ANTES del programa
 *     entrada: '3,5',                     // lo que consume leer(), si hace falta
 *     espera: [['tabla', 'alumnos', ['id', 'nombre', 'nota']]] }
 *
 * Las esperas:
 *
 *   ['tabla', t, [cols]]            la tabla existe y tiene esas columnas
 *   ['columna', t, c, {…}]          tipo, clave, unico, noNulo, porDefecto, refiere
 *   ['filas', t, n]                 cuántas filas tiene
 *   ['contenido', t, [cols], filas] el contenido, como multiconjunto
 *   ['resultado', [cols], filas]    la última consulta, como multiconjunto
 *   ['en_orden', [cols], filas]     ídem, pero el orden importa
 *   ['salida', texto]               la salida impresa dice esto
 *   ['usa', que]                    el programa usó esa construcción de SQL
 *
 * Las filas se comparan como MULTICONJUNTO —con los duplicados, sin orden—
 * salvo con «en_orden». Es lo correcto: en SQL el orden de las filas no
 * significa nada mientras no se pida con ORDENAR POR, así que exigirlo
 * reprobaría una solución buena.
 *
 * Los valores se comparan con su tipo: NULO, 0 y "" son tres cosas distintas,
 * y confundirlas es exactamente el error que el curso quiere corregir.
 *
 * API:  VerificarBD.correr(fuente, prueba) -> { ok, fallos, base, salida, error }
 *       VerificarBD.ESPERAS
 */
(function (global) {
  'use strict';

  const SQL = global.SQL;
  const SLE2BD = global.SLE2BD;

  /* ------------------------------------------------------------------ */
  /* Comparar valores y filas                                            */
  /* ------------------------------------------------------------------ */
  const esNulo = v => v === null || v === undefined;

  /* La misma igualdad que usa el motor: un número y un texto nunca son
     iguales, así que el tipo entra en la comparación. Un 7 y un "7" son
     distintos, y tienen que serlo: es la diferencia entre una nota y el texto
     de una nota. */
  function mismoValor(a, b) {
    if (esNulo(a) && esNulo(b)) return true;
    if (esNulo(a) || esNulo(b)) return false;
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    if (typeof a === 'number' || typeof b === 'number') {
      /* Un número escrito como texto en el ejercicio sí vale: lo que se está
         corrigiendo es la consulta, no cómo se escribió el esperado. */
      return String(a) === String(b);
    }
    return String(a) === String(b);
  }

  const mismaFila = (a, b) => a.length === b.length && a.every((v, i) => mismoValor(v, b[i]));

  const textoValor = v => (esNulo(v) ? 'NULO' : (typeof v === 'string' ? '"' + v + '"' : String(v)));
  const textoFila = f => '(' + f.map(textoValor).join(', ') + ')';

  /* Como multiconjunto: cada fila esperada tiene que estar, y no puede sobrar
     ninguna. Los duplicados cuentan — dos filas iguales no son una. */
  function compararSinOrden(traidas, esperadas, fallos, que) {
    const libres = traidas.slice();
    const faltan = [];
    for (const e of esperadas) {
      const i = libres.findIndex(t => mismaFila(t, e));
      if (i < 0) faltan.push(e); else libres.splice(i, 1);
    }
    if (!faltan.length && !libres.length) return true;
    if (faltan.length) fallos.push(que + ': falta la fila ' + textoFila(faltan[0])
      + (faltan.length > 1 ? ' (y ' + (faltan.length - 1) + ' más)' : '') + '.');
    if (libres.length) fallos.push(que + ': sobra la fila ' + textoFila(libres[0])
      + (libres.length > 1 ? ' (y ' + (libres.length - 1) + ' más)' : '') + '.');
    return false;
  }

  function compararEnOrden(traidas, esperadas, fallos, que) {
    if (traidas.length !== esperadas.length) {
      fallos.push(`${que}: se esperaban ${esperadas.length} fila(s) y vinieron ${traidas.length}.`);
      return false;
    }
    for (let i = 0; i < esperadas.length; i++) {
      if (!mismaFila(traidas[i], esperadas[i])) {
        fallos.push(`${que}: en el lugar ${i + 1} se esperaba ${textoFila(esperadas[i])} `
          + `y vino ${textoFila(traidas[i])}.`);
        return false;
      }
    }
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Mirar la base                                                       */
  /* ------------------------------------------------------------------ */
  function laTabla(base, nombre, fallos, que) {
    const t = SQL.tablas(base).find(x => x.nombre.toLowerCase() === String(nombre).toLowerCase());
    if (!t) {
      const hay = SQL.tablas(base).map(x => x.nombre);
      fallos.push(`${que}: no existe la tabla "${nombre}"`
        + (hay.length ? ' (hay ' + hay.join(', ') + ').' : ' (no creaste ninguna).'));
      return null;
    }
    return t;
  }

  function laColumna(t, nombre, fallos, que) {
    const c = t.columnas.find(x => x.nombre.toLowerCase() === String(nombre).toLowerCase());
    if (!c) {
      fallos.push(`${que}: la tabla "${t.nombre}" no tiene una columna "${nombre}" `
        + '(tiene ' + t.columnas.map(x => x.nombre).join(', ') + ').');
      return null;
    }
    return c;
  }

  /* Las filas de una tabla, proyectadas sobre las columnas que pide la
     prueba. Se pregunta con una consulta para no depender de cómo el motor
     guarda las filas por dentro. */
  function contenido(base, tabla, cols) {
    const r = SQL.ejecutar(base, 'SELECCIONAR ' + cols.join(', ') + ' DE ' + tabla);
    return r[r.length - 1].filas;
  }

  /* ------------------------------------------------------------------ */
  /* Las construcciones que un ejercicio puede pedir                      */
  /* ------------------------------------------------------------------ */
  /* Se miran sobre la sentencia ya analizada, no sobre el texto: buscar la
     palabra con una expresión regular encontraría también la que está adentro
     de un comentario o de un nombre de columna. */
  const CONSTRUCCIONES = {
    subconsulta: e => e.t === 'sub',
    existe: e => e.t === 'existe',
    en_subconsulta: e => e.t === 'enSub',
    tabla_derivada: e => !!e.sub && !!e.alias,
    unir: (e, s) => s.t === 'select' && (s.joins || []).length > 0,
    izquierda_unir: (e, s) => s.t === 'select' && (s.joins || []).some(j => j.izq),
    agrupar: (e, s) => s.t === 'select' && !!s.group,
    teniendo: (e, s) => s.t === 'select' && !!s.having,
    agregado: e => e.t === 'agr',
    ordenar: (e, s) => s.t === 'select' && (s.order || []).length > 0,
    limite: (e, s) => s.t === 'select' && s.limit !== null && s.limit !== undefined,
    distintos: (e, s) => s.t === 'select' && !!s.distinto
  };

  const NOMBRE_CONSTRUCCION = {
    subconsulta: 'una subconsulta', existe: 'EXISTE', en_subconsulta: 'EN con una subconsulta',
    tabla_derivada: 'una tabla derivada', unir: 'UNIR', izquierda_unir: 'IZQUIERDA UNIR',
    agrupar: 'AGRUPAR POR', teniendo: 'TENIENDO', agregado: 'una función de agregación',
    ordenar: 'ORDENAR POR', limite: 'LIMITE', distintos: 'DISTINTOS'
  };

  /* Recorre el árbol de una sentencia buscando la construcción. */
  function usa(sentencias, que) {
    const mira = CONSTRUCCIONES[que];
    if (!mira) return false;
    for (const s of sentencias) {
      let encontrado = false;
      const ver = e => {
        if (encontrado || !e || typeof e !== 'object') return;
        if (mira(e, s)) { encontrado = true; return; }
        for (const k of Object.keys(e)) {
          const v = e[k];
          if (Array.isArray(v)) v.forEach(ver);
          else if (v && typeof v === 'object') ver(v);
        }
      };
      ver(s);
      if (encontrado) return true;
    }
    return false;
  }

  /* ------------------------------------------------------------------ */
  /* Correr el programa del alumno                                       */
  /* ------------------------------------------------------------------ */
  function entradaDe(texto) {
    const pendiente = String(texto === undefined || texto === null ? '' : texto).split('\n');
    let i = 0;
    return {
      hay: () => i < pendiente.length,
      leer: () => (i < pendiente.length ? pendiente[i++] : null)
    };
  }

  async function correr(fuente, prueba) {
    const fallos = [];
    /* Una base nueva por prueba, siempre. Nunca la del IDE: un ejercicio que
       aprueba porque quedaron los datos de la prueba anterior no probó nada, y
       uno que reprueba por lo mismo es peor todavía. */
    const base = SQL.crear();
    if (prueba.preparar) SQL.ejecutar(base, prueba.preparar);

    let salida = '';
    const ent = entradaDe(prueba.entrada);
    const sentencias = [];
    const io = {
      archivos: new Map(), argumentos: [],
      imprimir: t => { salida += t; },
      limpiar: () => { salida = ''; },
      finEntrada: () => !ent.hay(),
      leerLinea: async () => ent.leer(),
      setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
      setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
      getScrsize: () => ({ lineas: 25, columnas: 80 }),
      beep: async () => {}, leerTecla: async () => 0
    };

    let interp = null, error = null;
    try {
      interp = await SLE2BD.ejecutar(fuente, io, { base, alAnalizar: s => sentencias.push(s) });
    } catch (e) {
      error = e;
      fallos.push('El programa se detuvo'
        + (e && e.linea ? ' en la línea ' + e.linea : '') + ': ' + (e && e.message ? e.message : e));
    }

    if (!error) {
      for (const esp of prueba.espera || []) revisar(esp, base, interp, salida, sentencias, fallos);
    }
    return { ok: fallos.length === 0, fallos, base, salida, error };
  }

  function revisar(esp, base, interp, salida, sentencias, fallos) {
    const que = esp[0];
    switch (que) {
      case 'tabla': {
        const t = laTabla(base, esp[1], fallos, 'la tabla ' + esp[1]);
        if (!t) return;
        const tiene = t.columnas.map(c => c.nombre.toLowerCase());
        const quiere = esp[2].map(c => String(c).toLowerCase());
        if (tiene.length !== quiere.length || tiene.some((c, i) => c !== quiere[i])) {
          fallos.push(`la tabla ${esp[1]}: se esperaban las columnas ${esp[2].join(', ')} `
            + `y están ${t.columnas.map(c => c.nombre).join(', ')}.`);
        }
        return;
      }
      case 'columna': {
        const t = laTabla(base, esp[1], fallos, 'la tabla ' + esp[1]);
        if (!t) return;
        const c = laColumna(t, esp[2], fallos, 'la tabla ' + esp[1]);
        if (!c) return;
        const q = esp[3] || {};
        const donde = `la columna ${esp[1]}.${c.nombre}`;
        if (q.tipo && String(c.tipo).toUpperCase() !== String(q.tipo).toUpperCase())
          fallos.push(`${donde}: se esperaba de tipo ${q.tipo} y es ${c.tipo}.`);
        if (q.clave !== undefined && !!c.pk !== !!q.clave)
          fallos.push(`${donde}: ${q.clave ? 'tiene que ser la CLAVE PRIMARIA.' : 'no tendría que ser clave primaria.'}`);
        if (q.unico !== undefined && !!c.unico !== !!q.unico)
          fallos.push(`${donde}: ${q.unico ? 'tiene que ser UNICO.' : 'no tendría que ser UNICO.'}`);
        if (q.noNulo !== undefined && !!c.noNulo !== !!q.noNulo)
          fallos.push(`${donde}: ${q.noNulo ? 'tiene que ser NO NULO.' : 'no tendría que ser NO NULO.'}`);
        if (q.porDefecto !== undefined && !mismoValor(c.porDefecto, q.porDefecto))
          fallos.push(`${donde}: se esperaba POR DEFECTO ${textoValor(q.porDefecto)} `
            + `y quedó ${textoValor(c.porDefecto)}.`);
        if (q.refiere) {
          const r = c.refiere;
          if (!r) fallos.push(`${donde}: tiene que apuntar a ${q.refiere[0]} con REFERENCIA.`);
          else if (r.tabla.toLowerCase() !== String(q.refiere[0]).toLowerCase()
            || r.columna.toLowerCase() !== String(q.refiere[1]).toLowerCase())
            fallos.push(`${donde}: se esperaba que apunte a ${q.refiere[0]} (${q.refiere[1]}) `
              + `y apunta a ${r.tabla} (${r.columna}).`);
        }
        return;
      }
      case 'filas': {
        const t = laTabla(base, esp[1], fallos, 'la tabla ' + esp[1]);
        if (!t) return;
        if (t.filas !== esp[2])
          fallos.push(`la tabla ${esp[1]}: se esperaban ${esp[2]} fila(s) y tiene ${t.filas}.`);
        return;
      }
      case 'contenido': {
        const t = laTabla(base, esp[1], fallos, 'la tabla ' + esp[1]);
        if (!t) return;
        for (const c of esp[2]) if (!laColumna(t, c, fallos, 'la tabla ' + esp[1])) return;
        compararSinOrden(contenido(base, t.nombre, esp[2]), esp[3], fallos,
          'la tabla ' + esp[1]);
        return;
      }
      case 'resultado':
      case 'en_orden': {
        const c = interp && interp.consulta;
        if (!c) {
          fallos.push('la última consulta: el programa no dejó ningún resultado. '
            + 'Escribí el SELECCIONAR suelto, o pasalo por consultar().');
          return;
        }
        const cols = c.columnas.map(x => String(x).toLowerCase());
        const quiere = esp[1].map(x => String(x).toLowerCase());
        if (cols.length !== quiere.length) {
          fallos.push(`la última consulta: se esperaban ${quiere.length} columna(s) `
            + `y trajo ${cols.length} (${c.columnas.join(', ')}).`);
          return;
        }
        (que === 'en_orden' ? compararEnOrden : compararSinOrden)(
          c.filas, esp[2], fallos, 'la última consulta');
        return;
      }
      case 'columnas': {
        const c = interp && interp.consulta;
        if (!c) { fallos.push('la última consulta: no hay ninguna.'); return; }
        const tiene = c.columnas.map(x => String(x).toLowerCase());
        const quiere = esp[1].map(x => String(x).toLowerCase());
        if (tiene.length !== quiere.length || tiene.some((x, i) => x !== quiere[i]))
          fallos.push('la última consulta: se esperaban las columnas '
            + esp[1].join(', ') + ' y vinieron ' + c.columnas.join(', ') + '.');
        return;
      }
      case 'salida':
        if (salida.indexOf(esp[1]) < 0)
          fallos.push(`la salida: faltó "${esp[1]}".`);
        return;
      case 'usa':
        if (!usa(sentencias, esp[1]))
          fallos.push('este ejercicio pide resolverlo con '
            + (NOMBRE_CONSTRUCCION[esp[1]] || esp[1]) + ', y no aparece.');
        return;
      default:
        fallos.push('espera desconocida: ' + que);
    }
  }

  global.VerificarBD = {
    correr,
    ESPERAS: ['tabla', 'columna', 'filas', 'contenido', 'resultado', 'en_orden',
      'columnas', 'salida', 'usa'],
    CONSTRUCCIONES: Object.keys(CONSTRUCCIONES)
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Simulador de memoria: las "cajas" de las variables, dibujadas.
 *
 * El intérprete se detiene antes de cada sentencia (el mismo enganche que usa
 * el depurador). En cada parada este módulo saca una foto de la memoria y la
 * guarda; después la interfaz recorre esas fotos con una línea de tiempo y se
 * ve nacer cada caja, cambiar su contenido y desaparecer al terminar la
 * subrutina.
 *
 * Es un modelo simplificado, y a propósito:
 *   · las direcciones son inventadas pero estables — las globales arrancan en
 *     0x1000 hacia arriba y cada llamada abre un marco de pila 0x100 más abajo
 *     que el anterior, para que se vea que la pila crece hacia abajo;
 *   · los tamaños son los "de manual" (un número 8 bytes, un lógico 1, una
 *     cadena un byte por letra más el cierre), no los que usa el navegador;
 *   · un objeto de ESLE2 POO no vive en la caja: la caja guarda la referencia
 *     y el objeto va al montículo, que es justamente lo que cuesta explicar.
 *
 * Todo lo de acá adentro es cálculo puro sobre el intérprete, sin tocar el
 * DOM, así que test/test-memoria.js lo prueba en Node.
 *
 * API:
 *   Memoria.instantanea(interp, linea, paso) -> foto
 *   Memoria.cambios(anterior, actual)        -> { creadas, modificadas, liberadas }
 *   Memoria.narrar(anterior, actual)         -> ["Se crea la caja …", …]
 */
(function (global) {
  'use strict';

  const BASE_GLOBAL = 0x1000;
  const BASE_PILA = 0x7f00;
  const SALTO_PILA = 0x100;
  const BASE_MONTON = 0xa000;
  const SALTO_MONTON = 0x40;
  const ALINEACION = 4;

  /* Las cuatro constantes lógicas que el intérprete crea solo. */
  const OCULTAS = new Set(['TRUE', 'FALSE', 'SI', 'NO']);

  const hex = n => '0x' + n.toString(16).toUpperCase().padStart(4, '0');
  const esObjeto = v => !!(v && v.clase && v.campos);
  const esRegistro = v => !!(v && v.c);

  /* Tamaño "de manual" de un valor, en bytes. */
  function bytes(v) {
    if (typeof v === 'number') return 8;
    if (typeof v === 'boolean') return 1;
    if (typeof v === 'string') return v.length + 1;
    if (Array.isArray(v)) return v.reduce((s, x) => s + bytes(x), 0);
    if (esObjeto(v)) return 4;                       // la caja guarda la referencia
    if (esRegistro(v)) return Object.keys(v.c).reduce((s, k) => s + bytes(v.c[k]), 0);
    return 4;
  }

  function nombreDelTipo(celda) {
    const S = global.SLE2;
    if (celda.tipo) {
      if (celda.tipo.k === 'obj') return celda.tipo.clase;
      return S.nombreTipo(celda.tipo);
    }
    return S.tipoDeValor(celda.v);
  }

  /* Un parámetro por referencia no tiene datos propios: su "v" es un par de
     accesores que leen y escriben la variable del que llamó. */
  function esReferencia(celda) {
    const d = Object.getOwnPropertyDescriptor(celda, 'v');
    return !!(d && d.get);
  }

  function textoDe(v) {
    const D = global.ESLE2Depurador;
    return D ? D.texto(v) : String(v);
  }

  /* --------------------------- la foto ------------------------------- */
  function celdasDe(mapa, base, monton) {
    const salida = [];
    let dir = base;
    for (const [nombre, celda] of mapa) {
      if (celda.konst && OCULTAS.has(nombre)) continue;
      const v = celda.v;
      const n = bytes(v);
      salida.push({
        nombre,
        tipo: nombreDelTipo(celda),
        valor: textoDe(v),
        bytes: n,
        dir: hex(dir),
        konst: !!celda.konst,
        ref: esReferencia(celda),
        apunta: esObjeto(v) ? v.id : null,
        forma: Array.isArray(v) ? 'vector' : esRegistro(v) ? 'registro' : esObjeto(v) ? 'objeto' : 'simple',
        /* En SLE2 los índices empiezan en 1, pero el arreglo interno es 0-based:
           la casilla que el programa llama A[1] es la que está en v[0]. */
        casillas: Array.isArray(v) ? v.slice(0, 12).map(textoDe) : null,
        campos: esRegistro(v) ? Object.keys(v.c).map(k => ({ nombre: k, valor: textoDe(v.c[k]) })) : null
      });
      if (esObjeto(v)) anotarObjeto(monton, v);
      dir += Math.ceil(n / ALINEACION) * ALINEACION;
    }
    return salida;
  }

  function anotarObjeto(monton, o) {
    if (monton.some(x => x.id === o.id)) return;
    monton.push({
      id: o.id,
      clase: o.clase,
      dir: hex(BASE_MONTON + o.id * SALTO_MONTON),
      bytes: Object.keys(o.campos).reduce((s, k) => s + bytes(o.campos[k]), 0),
      campos: Object.keys(o.campos).map(k => ({ nombre: k, valor: textoDe(o.campos[k]) }))
    });
  }

  function instantanea(interp, linea, paso) {
    const monton = [];
    const marcos = [{
      id: 'g', titulo: 'Programa (variables globales)', zona: 'globales',
      celdas: celdasDe(interp.globales, BASE_GLOBAL, monton)
    }];
    (interp.pila || []).forEach((marco, i) => {
      marcos.push({
        id: 'p' + i,
        titulo: (marco.nombreSub || 'subrutina') + ' ()',
        zona: 'pila',
        celdas: celdasDe(marco, BASE_PILA - i * SALTO_PILA, monton)
      });
    });
    return {
      paso: paso || 0,
      linea: linea || 0,
      marcos,
      monton,
      total: marcos.reduce((s, m) => s + m.celdas.reduce((t, c) => t + c.bytes, 0), 0) +
             monton.reduce((s, o) => s + o.bytes, 0)
    };
  }

  /* ------------------------- qué cambió ------------------------------ */
  function indexar(foto) {
    const m = new Map();
    if (!foto) return m;
    for (const marco of foto.marcos)
      for (const c of marco.celdas) m.set(marco.id + '::' + c.nombre, { marco, celda: c });
    return m;
  }

  function cambios(antes, ahora) {
    const a = indexar(antes), b = indexar(ahora);
    const creadas = [], modificadas = [], liberadas = [];
    for (const [k, x] of b) {
      if (!a.has(k)) creadas.push(k);
      else if (a.get(k).celda.valor !== x.celda.valor) modificadas.push(k);
    }
    for (const k of a.keys()) if (!b.has(k)) liberadas.push(k);
    /* Los objetos nuevos del montículo también cuentan como memoria creada. */
    const viejos = new Set((antes ? antes.monton : []).map(o => o.id));
    const nuevos = (ahora ? ahora.monton : []).filter(o => !viejos.has(o.id)).map(o => 'obj::' + o.id);
    return { creadas, modificadas, liberadas, objetos: nuevos };
  }

  /* ------------------ lo mismo, contado en palabras ------------------- */
  function narrar(antes, ahora) {
    const a = indexar(antes), b = indexar(ahora);
    const c = cambios(antes, ahora);
    const frases = [];

    /* Un marco entero que aparece o desaparece se cuenta de una sola vez. */
    const marcosAntes = new Set((antes ? antes.marcos : []).map(m => m.id));
    const marcosAhora = new Set(ahora.marcos.map(m => m.id));
    for (const m of ahora.marcos)
      if (!marcosAntes.has(m.id) && m.zona === 'pila')
        frases.push(`Se llama a ${m.titulo.replace(' ()', '')}: se abre su marco en la pila, con ` +
          `${m.celdas.length} caja(s) en ${m.celdas.length ? m.celdas[0].dir : '—'}.`);
    for (const m of (antes ? antes.marcos : []))
      if (!marcosAhora.has(m.id) && m.zona === 'pila')
        frases.push(`Termina ${m.titulo.replace(' ()', '')}: se liberan las ${m.celdas.length} caja(s) de su marco.`);

    for (const k of c.creadas) {
      const x = b.get(k);
      if (!marcosAntes.has(x.marco.id)) continue;      // ya se contó el marco entero
      frases.push(`Se crea la caja «${x.celda.nombre}» (${x.celda.tipo}, ${x.celda.bytes} bytes) ` +
        `en ${x.celda.dir}, con ${x.celda.valor}.`);
    }
    for (const k of c.modificadas) {
      const x = b.get(k), y = a.get(k);
      frases.push(`«${x.celda.nombre}» (${x.celda.dir}) pasa de ${y.celda.valor} a ${x.celda.valor}.`);
    }
    for (const id of c.objetos) {
      const o = ahora.monton.find(o2 => 'obj::' + o2.id === id);
      frases.push(`Nace el objeto ${o.clase} #${o.id} en el montículo (${o.dir}, ${o.bytes} bytes); ` +
        `la variable solo guarda su dirección.`);
    }
    for (const k of c.liberadas) {
      const x = a.get(k);
      if (marcosAhora.has(x.marco.id))
        frases.push(`Se libera la caja «${x.celda.nombre}» (${x.celda.dir}).`);
    }
    return frases;
  }

  /* --------------------------- la grabación --------------------------- */
  /* Corre el programa entero de una vez guardando una foto por sentencia. La
     pantalla no se dibuja: lo que imprima queda en `salida` por si sirve. Un
     ciclo infinito lo corta el propio intérprete con su tope de pasos. */
  async function grabar(fuente, op) {
    op = op || {};
    const max = op.maxPasos || 400;
    const fotos = [];
    const salida = [];
    let impresoHasta = 0;
    let ultimaLinea = 0;
    const lineas = (op.entrada || '').replace(/\r/g, '').split('\n');
    let siguiente = 0;
    const io = {
      archivos: new Map(),
      argumentos: [],
      imprimir: t => salida.push(t),
      limpiar: () => { salida.length = 0; impresoHasta = 0; },
      finEntrada: () => siguiente >= lineas.length,
      leerLinea: async () => (siguiente < lineas.length ? lineas[siguiente++] : null),
      setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
      setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
      getScrsize: () => ({ lineas: 25, columnas: 80 }),
      beep: async () => {}, leerTecla: async () => 0
    };

    const control = {};
    let cortado = false, error = null;
    const opts = {
      control,
      /* Antes de que la subrutina descarte su marco, una foto más: si no, lo
         que hizo su última línea no quedaría registrado en ningún lado. */
      alRetornar: async interp => {
        if (fotos.length >= max) return;
        const foto = instantanea(interp, ultimaLinea, fotos.length);
        foto.impreso = salida.slice(impresoHasta).join('');
        impresoHasta = salida.length;
        foto.retorno = true;
        fotos.push(foto);
      },
      depurador: async (linea, interp) => {
        ultimaLinea = linea;
        const foto = instantanea(interp, linea, fotos.length);
        /* Lo que el programa imprimió desde la foto anterior. La prueba de
           escritorio necesita saber qué salió en CADA paso, no solo el total:
           una columna "salida" que dijera siempre lo mismo no enseñaría nada. */
        foto.impreso = salida.slice(impresoHasta).join('');
        impresoHasta = salida.length;
        fotos.push(foto);
        if (fotos.length >= max) { cortado = true; control.detener(); }
      }
    };

    try {
      const interp = await (op.ejecutar || global.SLE2.ejecutar)(fuente, io, opts);
      const fin = instantanea(interp, 0, fotos.length);
      fin.impreso = salida.slice(impresoHasta).join('');
      impresoHasta = salida.length;
      fin.fin = true;
      fotos.push(fin);
    } catch (e) {
      if (!cortado) error = e;
    }
    return { fotos, salida: salida.join(''), error, cortado };
  }

  global.Memoria = { instantanea, cambios, narrar, grabar, bytes, hex, BASE_GLOBAL, BASE_PILA };
})(typeof window !== 'undefined' ? window : globalThis);

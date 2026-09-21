/*
 * El proyecto: varios programas guardados en el navegador, con nombre.
 *
 * Es lo que hace falta para tener un explorador de archivos como el de un
 * editor de verdad. El modelo es a propósito lo más simple posible: una lista
 * de archivos con nombre y contenido, nada más. Las carpetas no se guardan
 * como algo aparte: son los tramos del nombre separados por «/», igual que en
 * cualquier ruta. Así «parcial/ej1.sl» ya está dentro de la carpeta «parcial»
 * sin ninguna estructura extra que mantener, y renombrar una carpeta es
 * renombrar los archivos que empiezan con ella.
 *
 * Todo acá adentro es cálculo puro sobre listas, sin DOM ni almacenamiento
 * salvo cargar() y guardar(), así que test/test-proyecto.js lo prueba en Node.
 *
 * API:
 *   Proyecto.crear(lista, nombre, datos)   -> { lista, archivo } | { error }
 *   Proyecto.renombrar(lista, viejo, nuevo)
 *   Proyecto.borrar(lista, nombre)  ·  Proyecto.duplicar(lista, nombre)
 *   Proyecto.escribir(lista, nombre, datos)
 *   Proyecto.arbol(lista)  ·  Proyecto.validar(nombre, lista, exceptuando)
 *   Proyecto.nombreLibre(lista, base)  ·  cargar(clave) / guardar(clave, lista)
 */
(function (global) {
  'use strict';

  const MAX_NOMBRE = 60;
  const MAX_ARCHIVOS = 60;
  const MAX_CARPETAS = 60;
  const MAX_NIVELES = 8;
  const PROHIBIDOS = /[\\:*?"<>|]/;
  /* Los de control no se ven pero desordenan la pantalla, y los que dan vuelta
     el texto sirven para que un archivo importado se lea distinto de lo que
     es. En un nombre escrito a mano no aparecen nunca; en uno que viene de un
     archivo ajeno, sí. */
  const INVISIBLES = new RegExp('[\\u0000-\\u001f\\u007f\\u200b-\\u200f\\u2028\\u2029\\u202a-\\u202e\\u2066-\\u2069]');

  const limpiar = n => String(n == null ? '' : n).trim().replace(/\s*\/\s*/g, '/');

  /* ---------------------------- validación --------------------------- */
  /* Lo que vale para un nombre vale igual para una carpeta: son la misma cosa
     —tramos separados por «/»— y tener dos reglas distintas es cómo se cuela
     un «..» por el lado que nadie miró. */
  function validarRuta(ruta) {
    const n = limpiar(ruta);
    if (!n) return 'Poné un nombre.';
    if (n.length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.`;
    if (PROHIBIDOS.test(n)) return 'El nombre no puede llevar \\ : * ? " < > |';
    if (INVISIBLES.test(n)) return 'El nombre tiene caracteres que no se pueden usar.';
    if (n.startsWith('/') || n.endsWith('/')) return 'El nombre no puede empezar ni terminar con «/».';
    if (n.includes('//')) return 'Sobra una barra «/».';
    const tramos = n.split('/');
    if (tramos.some(t => !t.trim())) return 'Falta el nombre de una carpeta.';
    /* «..» sirve para salirse de la carpeta, y eso en un archivo importado es
       justamente el truco para escribir donde no corresponde. Acá adentro no
       hay «afuera», así que no significa nada y no se acepta. */
    if (tramos.some(t => t === '.' || t === '..')) return 'El nombre no puede llevar «.» ni «..».';
    if (tramos.length > MAX_NIVELES) return `No se pueden anidar más de ${MAX_NIVELES} carpetas.`;
    return null;
  }

  function validar(nombre, lista, exceptuando) {
    const n = limpiar(nombre);
    const error = validarRuta(n);
    if (error) return error;
    if ((lista || []).some(a => a.nombre.toLowerCase() === n.toLowerCase() &&
                                a.nombre !== exceptuando))
      return `Ya hay un archivo que se llama «${n}».`;
    return null;
  }

  /* Le agrega la extensión si no tiene ninguna: es un programa, después de todo. */
  function conExtension(nombre, ext) {
    const n = limpiar(nombre);
    const ultimo = n.slice(n.lastIndexOf('/') + 1);
    return ultimo.includes('.') ? n : n + (ext || '.sl');
  }

  /* «programa.sl» ocupado -> «programa 2.sl» */
  function nombreLibre(lista, base) {
    const n = limpiar(base);
    if (!validar(n, lista)) return n;
    const punto = n.lastIndexOf('.');
    const cuerpo = punto > n.lastIndexOf('/') ? n.slice(0, punto) : n;
    const ext = punto > n.lastIndexOf('/') ? n.slice(punto) : '';
    for (let i = 2; i < 500; i++) {
      const intento = `${cuerpo} ${i}${ext}`;
      if (!validar(intento, lista)) return intento;
    }
    return `${cuerpo} ${Date.now()}${ext}`;
  }

  /* ------------------------------ altas ------------------------------ */
  function crear(lista, nombre, datos) {
    const previa = Array.isArray(lista) ? lista : [];
    if (previa.length >= MAX_ARCHIVOS)
      return { error: `No se pueden tener más de ${MAX_ARCHIVOS} archivos.` };
    const n = conExtension(nombre, (datos && datos.ext) || '.sl');
    const error = validar(n, previa);
    if (error) return { error };
    const archivo = {
      nombre: n,
      codigo: String((datos && datos.codigo) || ''),
      entrada: String((datos && datos.entrada) || ''),
      ts: (datos && datos.ts) || Date.now()
    };
    return { lista: ordenar(previa.concat([archivo])), archivo };
  }

  function renombrar(lista, viejo, nuevo) {
    const i = (lista || []).findIndex(a => a.nombre === viejo);
    if (i < 0) return { error: 'Ese archivo ya no está.' };
    const n = conExtension(nuevo, extensionDe(viejo));
    const error = validar(n, lista, viejo);
    if (error) return { error };
    const copia = lista.map(a => (a.nombre === viejo ? Object.assign({}, a, { nombre: n }) : a));
    return { lista: ordenar(copia), archivo: copia.find(a => a.nombre === n) };
  }

  function borrar(lista, nombre) {
    return { lista: (lista || []).filter(a => a.nombre !== nombre) };
  }

  function duplicar(lista, nombre) {
    const a = (lista || []).find(x => x.nombre === nombre);
    if (!a) return { error: 'Ese archivo ya no está.' };
    return crear(lista, nombreLibre(lista, a.nombre), { codigo: a.codigo, entrada: a.entrada });
  }

  /* Guarda el contenido sin tocar el resto. */
  function escribir(lista, nombre, datos) {
    let toco = false;
    const copia = (lista || []).map(a => {
      if (a.nombre !== nombre) return a;
      toco = true;
      return Object.assign({}, a, {
        codigo: datos.codigo === undefined ? a.codigo : String(datos.codigo),
        entrada: datos.entrada === undefined ? a.entrada : String(datos.entrada),
        ts: Date.now()
      });
    });
    return toco ? copia : lista || [];
  }

  const extensionDe = n => {
    const u = String(n).slice(String(n).lastIndexOf('/') + 1);
    const p = u.lastIndexOf('.');
    return p > 0 ? u.slice(p) : '.sl';
  };

  /* Carpetas primero y todo alfabético, como en cualquier explorador. */
  function ordenar(lista) {
    return lista.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  }

  /* ------------------------------ el árbol --------------------------- */
  /* Devuelve carpetas y archivos anidados según los «/» del nombre. */
  function arbol(lista, explicitas) {
    const raiz = { carpetas: [], archivos: [] };

    /* Las carpetas creadas a mano se dibujan aunque estén vacías: si no, se
       crea una carpeta, no aparece nada, y parece que no anduvo. */
    const abrir = ruta => {
      let nodo = raiz, acum = '';
      for (const tramo of String(ruta).split('/')) {
        acum += (acum ? '/' : '') + tramo;
        let c = nodo.carpetas.find(x => x.nombre === tramo);
        if (!c) { c = { nombre: tramo, ruta: acum, carpetas: [], archivos: [] }; nodo.carpetas.push(c); }
        nodo = c;
      }
      return nodo;
    };
    for (const c of ordenarRutas(explicitas || [])) abrir(c);

    for (const a of ordenar(lista || [])) {
      const tramos = a.nombre.split('/');
      let nodo = raiz, ruta = '';
      for (let i = 0; i < tramos.length - 1; i++) {
        ruta += (ruta ? '/' : '') + tramos[i];
        let c = nodo.carpetas.find(x => x.nombre === tramos[i]);
        if (!c) { c = { nombre: tramos[i], ruta, carpetas: [], archivos: [] }; nodo.carpetas.push(c); }
        nodo = c;
      }
      nodo.archivos.push(Object.assign({ etiqueta: tramos[tramos.length - 1] }, a));
    }
    return raiz;
  }

  /* Todas las carpetas: las que se deducen de los nombres de los archivos y
     las que alguien creó a mano y todavía están vacías. Las dos son carpetas
     para el que mira el explorador. */
  const carpetas = (lista, explicitas) => {
    const s = new Set();
    const anotar = ruta => {
      const t = String(ruta).split('/');
      let acum = '';
      for (const tramo of t) { acum += (acum ? '/' : '') + tramo; s.add(acum); }
    };
    for (const a of lista || []) {
      const t = a.nombre.split('/');
      if (t.length > 1) anotar(t.slice(0, -1).join('/'));
    }
    for (const c of explicitas || []) anotar(c);
    return [...s].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  };

  /* ---------------------------- carpetas ----------------------------- */
  /*
   * Una carpeta sigue siendo los tramos del nombre separados por «/», como
   * siempre: no hay entidad «carpeta» con identificador ni permisos. Lo único
   * que se guarda aparte es la lista de las que alguien creó y todavía no
   * tienen ningún archivo adentro, porque esas no se pueden deducir de nada.
   *
   * Se probó primero con un archivo oculto adentro para que la carpeta
   * «existiera», y es peor: aparece en la cuenta de archivos, en lo que se
   * exporta, en lo que se borra, y hay que acordarse de esquivarlo en cada
   * lugar. Una lista de rutas no tiene excepciones.
   */
  const dentroDe = (ruta, nombre) => nombre === ruta || nombre.startsWith(ruta + '/');

  function validarCarpeta(ruta, estado, exceptuando) {
    const n = limpiar(ruta);
    const error = validarRuta(n);
    if (error) return error;
    const arch = (estado && estado.archivos) || [];
    /* Un archivo y una carpeta no pueden llamarse igual: el explorador tendría
       que dibujar dos cosas distintas en el mismo lugar. */
    if (arch.some(a => a.nombre.toLowerCase() === n.toLowerCase()))
      return `Ya hay un archivo que se llama «${n}».`;
    const todas = carpetas(arch, (estado && estado.carpetas) || []);
    if (todas.some(c => c.toLowerCase() === n.toLowerCase() && c !== exceptuando))
      return `Ya hay una carpeta que se llama «${n}».`;
    if (todas.length >= MAX_CARPETAS)
      return `No se pueden tener más de ${MAX_CARPETAS} carpetas.`;
    return null;
  }

  function crearCarpeta(estado, ruta) {
    const e = normalizar(estado);
    const n = limpiar(ruta);
    const error = validarCarpeta(n, e);
    if (error) return { error };
    return { estado: Object.assign({}, e, { carpetas: ordenarRutas(e.carpetas.concat([n])) }), carpeta: n };
  }

  /* Borrar una carpeta se lleva lo que tiene adentro: es lo que espera
     cualquiera que borra una carpeta. Quien llama tiene que preguntar antes. */
  function borrarCarpeta(estado, ruta) {
    const e = normalizar(estado);
    const n = limpiar(ruta);
    return {
      estado: {
        archivos: e.archivos.filter(a => !dentroDe(n, a.nombre)),
        carpetas: e.carpetas.filter(c => !dentroDe(n, c)),
        activo: e.activo && dentroDe(n, e.activo) ? null : e.activo
      }
    };
  }

  function renombrarCarpeta(estado, vieja, nueva) {
    const e = normalizar(estado);
    const v = limpiar(vieja), n = limpiar(nueva);
    if (v === n) return { estado: e };
    const error = validarCarpeta(n, e, v);
    if (error) return { error };
    /* Con «ruta + '/'» y no con startsWith(ruta) a secas: si no, renombrar
       «parcial» se llevaría puesta «parcial2», que es otra carpeta. */
    const mover = t => (t === v ? n : (t.startsWith(v + '/') ? n + t.slice(v.length) : t));
    return {
      estado: {
        archivos: ordenar(e.archivos.map(a => Object.assign({}, a, { nombre: mover(a.nombre) }))),
        carpetas: ordenarRutas(e.carpetas.map(mover)),
        activo: e.activo ? mover(e.activo) : null
      }
    };
  }

  const ordenarRutas = rutas =>
    [...new Set(rutas)].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

  /* Un estado con todos sus campos, venga como venga. Los proyectos guardados
     antes de que existieran las carpetas vacías no tienen «carpetas». */
  function normalizar(estado) {
    const e = estado || {};
    return {
      archivos: Array.isArray(e.archivos) ? e.archivos : [],
      carpetas: Array.isArray(e.carpetas) ? e.carpetas.filter(c => typeof c === 'string') : [],
      activo: e.activo || null
    };
  }

  /* ---------------------------- guardado ----------------------------- */
  function cargar(clave) {
    try {
      const x = JSON.parse(global.localStorage.getItem(clave) || 'null');
      if (!x || !Array.isArray(x.archivos)) return { archivos: [], carpetas: [], activo: null };
      const archivos = ordenar(x.archivos
        .filter(a => a && typeof a.nombre === 'string' && typeof a.codigo === 'string')
        .map(a => ({ nombre: a.nombre, codigo: a.codigo, entrada: String(a.entrada || ''), ts: a.ts || 0 })));
      const activo = archivos.some(a => a.nombre === x.activo) ? x.activo
                   : (archivos[0] ? archivos[0].nombre : null);
      /* Las carpetas vacías son de después: un proyecto guardado antes no las
         trae, y eso no es un error, es un proyecto de antes. */
      const vacias = Array.isArray(x.carpetas)
        ? ordenarRutas(x.carpetas.filter(c => typeof c === 'string' && !validarRuta(c)))
        : [];
      return { archivos, carpetas: vacias, activo };
    } catch (e) { return { archivos: [], carpetas: [], activo: null }; }
  }

  function guardar(clave, estado) {
    try {
      const e = normalizar(estado);
      global.localStorage.setItem(clave, JSON.stringify({
        archivos: e.archivos, carpetas: e.carpetas, activo: e.activo
      }));
      return true;
    } catch (e) { return false; }
  }

  global.Proyecto = {
    crear, renombrar, borrar, duplicar, escribir, arbol, carpetas, ordenar,
    validar, validarRuta, nombreLibre, conExtension, cargar, guardar, normalizar,
    crearCarpeta, borrarCarpeta, renombrarCarpeta, validarCarpeta, dentroDe,
    MAX_NOMBRE, MAX_ARCHIVOS, MAX_CARPETAS, MAX_NIVELES
  };
})(typeof window !== 'undefined' ? window : globalThis);

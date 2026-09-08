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
  const PROHIBIDOS = /[\\:*?"<>|]/;

  const limpiar = n => String(n == null ? '' : n).trim().replace(/\s*\/\s*/g, '/');

  /* ---------------------------- validación --------------------------- */
  function validar(nombre, lista, exceptuando) {
    const n = limpiar(nombre);
    if (!n) return 'Poné un nombre.';
    if (n.length > MAX_NOMBRE) return `El nombre no puede pasar de ${MAX_NOMBRE} caracteres.`;
    if (PROHIBIDOS.test(n)) return 'El nombre no puede llevar \\ : * ? " < > |';
    if (n.startsWith('/') || n.endsWith('/')) return 'El nombre no puede empezar ni terminar con «/».';
    if (n.includes('//')) return 'Sobra una barra «/».';
    if (n.split('/').some(t => !t.trim())) return 'Falta el nombre de una carpeta.';
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
  function arbol(lista) {
    const raiz = { carpetas: [], archivos: [] };
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

  const carpetas = lista => {
    const s = new Set();
    for (const a of lista || []) {
      const t = a.nombre.split('/');
      let ruta = '';
      for (let i = 0; i < t.length - 1; i++) { ruta += (ruta ? '/' : '') + t[i]; s.add(ruta); }
    }
    return [...s].sort();
  };

  /* ---------------------------- guardado ----------------------------- */
  function cargar(clave) {
    try {
      const x = JSON.parse(global.localStorage.getItem(clave) || 'null');
      if (!x || !Array.isArray(x.archivos)) return { archivos: [], activo: null };
      const archivos = ordenar(x.archivos
        .filter(a => a && typeof a.nombre === 'string' && typeof a.codigo === 'string')
        .map(a => ({ nombre: a.nombre, codigo: a.codigo, entrada: String(a.entrada || ''), ts: a.ts || 0 })));
      const activo = archivos.some(a => a.nombre === x.activo) ? x.activo
                   : (archivos[0] ? archivos[0].nombre : null);
      return { archivos, activo };
    } catch (e) { return { archivos: [], activo: null }; }
  }

  function guardar(clave, estado) {
    try {
      global.localStorage.setItem(clave, JSON.stringify({
        archivos: estado.archivos || [], activo: estado.activo || null
      }));
      return true;
    } catch (e) { return false; }
  }

  global.Proyecto = {
    crear, renombrar, borrar, duplicar, escribir, arbol, carpetas, ordenar,
    validar, nombreLibre, conExtension, cargar, guardar, MAX_NOMBRE, MAX_ARCHIVOS
  };
})(typeof window !== 'undefined' ? window : globalThis);

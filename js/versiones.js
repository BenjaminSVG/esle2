/*
 * Versiones del proyecto: un control de versiones chiquito, con «commits» que
 * guardan TODO el proyecto de una vez (sin staging: no hay que elegir qué
 * guardar) y se pueden llevar a otra computadora en un archivo.
 *
 * Es otra cosa que js/historial.js, que sigue existiendo tal cual para las
 * copias automáticas de seguridad de UN programa. Acá cada «confirmación»
 * (commit) es una foto de TODOS los archivos del proyecto, con mensaje, y las
 * confirmaciones se van encadenando —cada una apunta a la anterior, o a DOS
 * cuando es la unión de dos historiales distintos— así que hay un árbol
 * completo, no una lista.
 *
 * Por qué encadenado y no una lista plana: para poder unir el trabajo de dos
 * computadoras hace falta saber DE DÓNDE partió cada una —el antecesor común—
 * para compararlas contra eso y no entre sí. Sin eso, no hay forma de saber
 * qué cambió cada lado.
 *
 * API (cálculo puro, sin DOM: lo prueba test/test-versiones.js)
 *   Versiones.vacio(variante, generarId)                    -> versionado nuevo
 *   Versiones.normalizarInstantanea(estado)                 -> instantánea prolija
 *   Versiones.igualInstantanea(a, b)
 *   Versiones.commit(versionado, instantanea, mensaje, opts) -> versionado | {error}
 *   Versiones.commitFusion(versionado, instantanea, padres, mensaje, opts)
 *   Versiones.cabezaInstantanea(versionado)                 -> instantánea | null
 *   Versiones.commitPorId(versionado, id)
 *   Versiones.ascendientes(versionado, id)                  -> Set de ids
 *   Versiones.esAntecesor(versionado, posible, id)
 *   Versiones.ancestroComun(versionado, a, b)                -> id | null
 *   Versiones.diffArchivos(a, b)                             -> [{ nombre, tipo }]
 *   Versiones.combinar(base, local, remoto)                  -> { archivos, carpetas, conflictos }
 *   Versiones.validarGrafo(versionado)                       -> null | mensaje
 *   Versiones.fusionarGrafos(local, remoto)                  -> { versionado } | { error }
 *   Versiones.empaquetar(versionado)  ·  Versiones.desempaquetar(bruto)
 *   Versiones.cargar(clave)  ·  Versiones.guardar(clave, versionado)
 */
(function (global) {
  'use strict';

  const FORMATO = 'esle2-proyecto';
  const VERSION = 1;
  const MAX_CONFIRMACIONES = 200;
  const MAX_BYTES = 2 * 1024 * 1024;

  const P = () => global.Proyecto;

  /* ------------------------------ instantáneas ------------------------- */
  /* Una instantánea es la foto de todos los archivos y carpetas vacías del
     proyecto en un momento dado, sin nada que dependa de esta computadora
     (ni «activo», ni fechas de edición, ni preferencias de pantalla): dos
     computadoras que llegaron al mismo código tienen que dar la MISMA
     instantánea para poder compararse. */
  function normalizarInstantanea(estado) {
    const e = estado || {};
    const archivos = (Array.isArray(e.archivos) ? e.archivos : [])
      .map(a => ({
        nombre: String(a.nombre),
        codigo: String(a.codigo == null ? '' : a.codigo),
        entrada: String(a.entrada == null ? '' : a.entrada)
      }))
      .sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { numeric: true }));
    const carpetas = [...new Set((Array.isArray(e.carpetas) ? e.carpetas : []).map(String))]
      .sort((x, y) => x.localeCompare(y, 'es', { numeric: true }));
    return { archivos, carpetas };
  }

  function igualInstantanea(a, b) {
    return JSON.stringify(normalizarInstantanea(a)) === JSON.stringify(normalizarInstantanea(b));
  }

  /* ------------------------------ el grafo ------------------------------ */
  function vacio(variante, generarId) {
    return { formato: FORMATO, idProyecto: generarId(), variante: String(variante), cabeza: null, confirmaciones: [] };
  }

  function commitPorId(versionado, id) {
    return (versionado.confirmaciones || []).find(c => c.id === id) || null;
  }

  function cabezaInstantanea(versionado) {
    const c = versionado.cabeza ? commitPorId(versionado, versionado.cabeza) : null;
    return c ? c.instantanea : null;
  }

  const tamano = versionado => JSON.stringify(versionado).length;

  function agregarConfirmacion(versionado, confirmacion) {
    const nuevo = {
      formato: FORMATO,
      idProyecto: versionado.idProyecto,
      variante: versionado.variante,
      cabeza: confirmacion.id,
      confirmaciones: versionado.confirmaciones.concat([confirmacion])
    };
    if (nuevo.confirmaciones.length > MAX_CONFIRMACIONES)
      return { error: `Ya hay ${MAX_CONFIRMACIONES} versiones guardadas, que es el máximo. Bajá o borrá el ` +
                       'archivo de intercambio más viejo antes de seguir.' };
    if (tamano(nuevo) > MAX_BYTES)
      return { error: 'El historial de versiones ya ocupa demasiado. Descargalo (Pasar a otra compu) y ' +
                       'empezá de nuevo si hace falta.' };
    return { versionado: nuevo };
  }

  /* No guarda un commit si el proyecto quedó exactamente igual al de la
     cabeza actual: una versión que no cambia nada no aporta y solo confunde
     la lista. */
  function commit(versionado, instantanea, mensaje, opts) {
    const o = opts || {};
    const inst = normalizarInstantanea(instantanea);
    if (versionado.cabeza && igualInstantanea(cabezaInstantanea(versionado), inst)) return versionado;
    const confirmacion = {
      id: String((o.generarId || (() => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)))()),
      padres: versionado.cabeza ? [versionado.cabeza] : [],
      fecha: (o.ahora || Date.now)(),
      mensaje: String(mensaje || '').slice(0, 80),
      tipo: 'manual',
      instantanea: inst
    };
    const r = agregarConfirmacion(versionado, confirmacion);
    return r.error ? r : r.versionado;
  }

  /* Un commit con DOS padres: el resultado de unir dos historiales. */
  function commitFusion(versionado, instantanea, padres, mensaje, opts) {
    const o = opts || {};
    const confirmacion = {
      id: String((o.generarId || (() => Date.now().toString(36) + Math.random().toString(36).slice(2, 9)))()),
      padres: padres.slice(),
      fecha: (o.ahora || Date.now)(),
      mensaje: String(mensaje || 'Cambios unidos de otra computadora').slice(0, 80),
      tipo: 'fusion',
      instantanea: normalizarInstantanea(instantanea)
    };
    return agregarConfirmacion(versionado, confirmacion);
  }

  /* --------------------------- recorrer el grafo ------------------------ */
  function ascendientes(versionado, id) {
    const vistos = new Set();
    const pila = id ? [id] : [];
    while (pila.length) {
      const x = pila.pop();
      if (vistos.has(x)) continue;
      vistos.add(x);
      const c = commitPorId(versionado, x);
      if (c) pila.push(...c.padres);
    }
    return vistos;
  }

  const esAntecesor = (versionado, posible, id) => ascendientes(versionado, id).has(posible);

  /* El antecesor común más cercano: el que está a menor distancia combinada
     de los dos. Con historiales chicos de curso —no miles de commits— esto
     alcanza; un grafo con varios antecesores comunes «máximos» a la vez es
     un caso de manual de git que acá no hace falta resolver del todo bien,
     alcanza con no romper nada cuando pasa (ver combinar()). */
  function ancestroComun(versionado, a, b) {
    if (!a || !b) return null;
    if (a === b) return a;
    const distancias = origen => {
      const d = new Map([[origen, 0]]);
      const pila = [origen];
      while (pila.length) {
        const x = pila.pop();
        const c = commitPorId(versionado, x);
        if (!c) continue;
        for (const p of c.padres) if (!d.has(p)) { d.set(p, d.get(x) + 1); pila.push(p); }
      }
      return d;
    };
    const da = distancias(a), db = distancias(b);
    let mejor = null, mejorSuma = Infinity;
    for (const [id, dist] of da) {
      if (!db.has(id)) continue;
      const suma = dist + db.get(id);
      if (suma < mejorSuma) { mejorSuma = suma; mejor = id; }
    }
    return mejor;
  }

  /* ------------------------------- diffs -------------------------------- */
  const clave = a => a.nombre;

  /* Qué archivos cambiaron entre dos instantáneas: para la pestaña
     «Cambios» (contra la cabeza actual) y para la lista de una versión
     guardada (contra su padre). */
  function diffArchivos(a, b) {
    const ai = normalizarInstantanea(a), bi = normalizarInstantanea(b);
    const A = new Map(ai.archivos.map(x => [clave(x), x]));
    const B = new Map(bi.archivos.map(x => [clave(x), x]));
    const nombres = new Set([...A.keys(), ...B.keys()]);
    const salida = [];
    for (const n of nombres) {
      const x = A.get(n), y = B.get(n);
      if (!x) salida.push({ nombre: n, tipo: 'agregado' });
      else if (!y) salida.push({ nombre: n, tipo: 'eliminado' });
      else if (x.codigo !== y.codigo || x.entrada !== y.entrada) salida.push({ nombre: n, tipo: 'modificado' });
    }
    const Ac = new Set(ai.carpetas), Bc = new Set(bi.carpetas);
    for (const c of bi.carpetas) if (!Ac.has(c)) salida.push({ nombre: c, tipo: 'carpeta-agregada' });
    for (const c of ai.carpetas) if (!Bc.has(c)) salida.push({ nombre: c, tipo: 'carpeta-eliminada' });
    return salida.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es', { numeric: true }));
  }

  /* --------------------------------- unir -------------------------------- */
  const igualArchivo = (x, y) => {
    if (!x && !y) return true;
    if (!x || !y) return false;
    return x.codigo === y.codigo && x.entrada === y.entrada;
  };

  /* Combina base/local/remoto archivo por archivo. Un archivo solo cambiado
     de un lado se lleva ese cambio; cambiado de los dos a lo mismo, se lleva
     eso; cambiado distinto de cada lado —o borrado de un lado y tocado del
     otro— es un conflicto que el alumno tiene que mirar. */
  function combinar(base, local, remoto) {
    const bi = normalizarInstantanea(base), li = normalizarInstantanea(local), ri = normalizarInstantanea(remoto);
    const B = new Map(bi.archivos.map(x => [clave(x), x]));
    const L = new Map(li.archivos.map(x => [clave(x), x]));
    const R = new Map(ri.archivos.map(x => [clave(x), x]));
    const nombres = new Set([...B.keys(), ...L.keys(), ...R.keys()]);

    const archivos = [];
    const conflictos = [];
    for (const n of nombres) {
      const b = B.get(n) || null, l = L.get(n) || null, r = R.get(n) || null;
      const tocoLocal = !igualArchivo(b, l);
      const tocoRemoto = !igualArchivo(b, r);
      if (!tocoLocal && !tocoRemoto) { if (b) archivos.push(b); continue; }
      if (tocoLocal && !tocoRemoto) { if (l) archivos.push(l); continue; }
      if (!tocoLocal && tocoRemoto) { if (r) archivos.push(r); continue; }
      /* Los dos lo tocaron: si terminaron en lo mismo, no hay nada que
         elegir; si no, es un conflicto de verdad. */
      if (igualArchivo(l, r)) { if (l) archivos.push(l); continue; }
      conflictos.push({ nombre: n, base: b, local: l, remoto: r });
    }

    const carpetas = [...new Set(li.carpetas.concat(ri.carpetas))]
      .filter(c => !archivos.some(a => a.nombre === c || a.nombre.startsWith(c + '/')))
      .sort((x, y) => x.localeCompare(y, 'es', { numeric: true }));

    return { archivos, carpetas, conflictos };
  }

  /* ------------------------------ validación ----------------------------- */
  function validarGrafo(v) {
    const ids = new Set();
    for (const c of v.confirmaciones || []) {
      if (!c || typeof c.id !== 'string' || !c.id) return 'Hay una versión sin identificador.';
      if (ids.has(c.id)) return 'Hay una versión repetida en el historial.';
      ids.add(c.id);
    }
    for (const c of v.confirmaciones || []) {
      for (const p of c.padres) if (!ids.has(p)) return 'Falta una versión de la que otra depende.';
    }
    const estado = new Map();
    const porId = new Map((v.confirmaciones || []).map(c => [c.id, c]));
    const visitar = id => {
      if (estado.get(id) === 1) return true;
      if (estado.get(id) === 0) return false;
      estado.set(id, 0);
      for (const p of porId.get(id).padres) if (!visitar(p)) return false;
      estado.set(id, 1);
      return true;
    };
    for (const c of v.confirmaciones || []) if (!visitar(c.id)) return 'El historial de versiones tiene un ciclo.';
    if (v.cabeza && !ids.has(v.cabeza)) return 'La versión actual no está en el historial.';
    if ((v.confirmaciones || []).length > MAX_CONFIRMACIONES) return 'Ese historial tiene demasiadas versiones.';
    return null;
  }

  /* Junta dos grafos por id de commit: lo que ya tiene cada uno se conserva,
     lo que le falta se copia del otro. Si un mismo id trae contenido
     DISTINTO de cada lado, algo está corrupto —los identificadores no se
     repiten nunca al crear un commit— y se rechaza entero antes de tocar
     nada. */
  function fusionarGrafos(local, remoto) {
    if (local.idProyecto !== remoto.idProyecto)
      return { error: 'Ese archivo es de otro proyecto: no se puede unir con este.' };
    const porId = new Map((local.confirmaciones || []).map(c => [c.id, c]));
    for (const c of remoto.confirmaciones || []) {
      const previo = porId.get(c.id);
      if (previo) {
        if (JSON.stringify(previo) !== JSON.stringify(c))
          return { error: 'El archivo que trajiste no coincide con lo que ya tenés guardado. Puede estar dañado.' };
        continue;
      }
      porId.set(c.id, c);
    }
    const unido = {
      formato: FORMATO, idProyecto: local.idProyecto, variante: local.variante,
      cabeza: local.cabeza, confirmaciones: [...porId.values()]
    };
    const error = validarGrafo(unido);
    if (error) return { error };
    if (tamano(unido) > MAX_BYTES) return { error: 'El historial unido ocupa demasiado.' };
    return { versionado: unido };
  }

  /* ------------------------- paquete de intercambio ---------------------- */
  function empaquetar(versionado) {
    return { f: FORMATO, v: VERSION, versionado: {
      formato: FORMATO, idProyecto: versionado.idProyecto, variante: versionado.variante,
      cabeza: versionado.cabeza, confirmaciones: versionado.confirmaciones
    } };
  }

  /* El paquete rearmado campo por campo, como en Carpeta.limpiar(): lo que
     no entra en esta forma exacta no pasa, venga como venga del disco de
     quien sea. */
  function desempaquetar(bruto) {
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
    if (bruto.f !== FORMATO || bruto.v !== VERSION) return null;
    const vb = bruto.versionado;
    if (!vb || typeof vb !== 'object') return null;
    if (typeof vb.idProyecto !== 'string' || !vb.idProyecto) return null;
    if (typeof vb.variante !== 'string' || !vb.variante) return null;
    if (vb.cabeza !== null && typeof vb.cabeza !== 'string') return null;
    if (!Array.isArray(vb.confirmaciones)) return null;

    const confirmaciones = [];
    for (const c of vb.confirmaciones) {
      if (!c || typeof c !== 'object') return null;
      if (typeof c.id !== 'string' || !c.id) return null;
      if (!Array.isArray(c.padres) || c.padres.some(p => typeof p !== 'string')) return null;
      if (typeof c.fecha !== 'number' || !isFinite(c.fecha)) return null;
      if (typeof c.mensaje !== 'string') return null;
      if (c.tipo !== 'manual' && c.tipo !== 'fusion') return null;
      const inst = c.instantanea;
      if (!inst || typeof inst !== 'object') return null;
      if (!Array.isArray(inst.archivos) || !Array.isArray(inst.carpetas)) return null;
      for (const a of inst.archivos) {
        if (!a || typeof a.nombre !== 'string' || P().validarRuta(a.nombre)) return null;
        if (typeof a.codigo !== 'string' || typeof a.entrada !== 'string') return null;
      }
      for (const cp of inst.carpetas) if (typeof cp !== 'string' || P().validarRuta(cp)) return null;
      confirmaciones.push({
        id: c.id, padres: c.padres.slice(), fecha: c.fecha, mensaje: c.mensaje.slice(0, 80),
        tipo: c.tipo, instantanea: normalizarInstantanea(inst)
      });
    }
    const v = { formato: FORMATO, idProyecto: vb.idProyecto, variante: vb.variante, cabeza: vb.cabeza || null, confirmaciones };
    return validarGrafo(v) ? null : v;
  }

  /* -------------------------------- guardado ------------------------------ */
  function cargar(clave) {
    try {
      const x = JSON.parse(global.localStorage.getItem(clave) || 'null');
      if (!x) return null;
      const bruto = { f: FORMATO, v: VERSION, versionado: x };
      return desempaquetar(bruto);
    } catch (e) { return null; }
  }

  function guardar(clave, versionado) {
    try { global.localStorage.setItem(clave, JSON.stringify(versionado)); return true; }
    catch (e) { return false; }
  }

  global.Versiones = {
    vacio, normalizarInstantanea, igualInstantanea,
    commit, commitFusion, cabezaInstantanea, commitPorId,
    ascendientes, esAntecesor, ancestroComun,
    diffArchivos, combinar,
    validarGrafo, fusionarGrafos,
    empaquetar, desempaquetar,
    cargar, guardar, tamano,
    FORMATO, VERSION, MAX_CONFIRMACIONES, MAX_BYTES
  };
})(typeof window !== 'undefined' ? window : globalThis);

/*
 * Llevarse una carpeta y traerla de vuelta.
 *
 * Un archivo «.esle2carpeta» con una carpeta entera adentro: los programas,
 * lo que cada uno tenía escrito en la entrada de datos, y las subcarpetas,
 * incluso las que están vacías. Sirve para pasarle el parcial a un compañero,
 * para llevarse el trabajo a casa en un pendrive, o para que el profesor
 * reparta la misma carpeta a treinta alumnos.
 *
 * Por qué no es un .zip. Un .zip de verdad se abre en cualquier lado, que es
 * una ventaja real, pero leer .zip es leer un formato entero —con sus
 * variantes, sus métodos de compresión y sus campos raros— y el que lo va a
 * leer es este navegador, con lo que le dé el alumno. Un JSON comprimido con
 * el gzip que el navegador ya trae es una línea de código y no tiene
 * superficie donde equivocarse. Para sacar un programa suelto y abrirlo en
 * otro lado ya está «Guardar .sl», que no cambió.
 *
 * ------------------------------------------------------------------------
 * Lo que viene de afuera
 * ------------------------------------------------------------------------
 * El archivo lo elige el alumno de su propio disco, así que puede ser
 * cualquier cosa: uno roto, uno preparado, o un .zip con el nombre cambiado.
 * Entonces:
 *
 *   · se mira el tamaño ANTES de leerlo, y el tamaño de lo descomprimido
 *     mientras se descomprime. Cuarenta kilobytes se pueden descomprimir en
 *     cientos de megas si alguien los arma para eso;
 *   · nada se copia tal cual: el paquete se rearma campo por campo;
 *   · las rutas se revisan de nuevo con la misma regla que las escritas a
 *     mano, que es la que rechaza «..», las barras al revés, los caracteres
 *     invisibles y las carpetas sin nombre. Un «../../otra cosa» adentro de un
 *     archivo ajeno es el truco de siempre para escribir donde no corresponde;
 *   · se revisa TODO el resultado antes de tocar nada. Una importación que
 *     falla a la mitad y deja el proyecto mezclado es peor que una que no
 *     empieza.
 *
 * Y lo que hay que decir en pantalla: el archivo exportado NO tiene
 * contraseña. Quien lo tenga lo abre.
 *
 * API (cálculo puro salvo el gzip, que se inyecta: lo prueba test/test-carpeta.js)
 *   Carpeta.armar(estado, ruta)            -> el paquete de esa carpeta
 *   Carpeta.comprimir(paquete, Comp)       -> Promise<Uint8Array>
 *   Carpeta.descomprimir(bytes, Descomp)   -> Promise<paquete | null>
 *   Carpeta.limpiar(bruto)                 -> el paquete rearmado, o null
 *   Carpeta.fundir(estado, paquete, raiz)  -> { estado } | { error }
 *   Carpeta.nombreDeArchivo(ruta)          -> «parcial.esle2carpeta»
 *
 * El gzip de acá abajo (comprimirJSON/descomprimirJSON) es de cualquier
 * objeto, no solo de una carpeta: js/versiones.js lo reutiliza para el
 * archivo de «Pasar a otra compu», que es OTRO formato (empieza con
 * f:"esle2-proyecto", no f:"esle2-carpeta") y por eso no puede pasar por
 * limpiar(), que es específica de una carpeta.
 */
(function (global) {
  'use strict';

  const FORMATO = 'esle2-carpeta';
  const VERSION = 1;
  const EXTENSION = '.esle2carpeta';

  const LIMITES = {
    archivo: 2 * 1024 * 1024,     // lo que se acepta leer del disco
    abierto: 2 * 1024 * 1024,     // lo que se acepta una vez descomprimido
    raiz: 60                      // el nombre de la carpeta adentro del paquete
  };

  const P = () => global.Proyecto;

  /* ------------------------------------------------------------------ */
  /* Llevarse                                                            */
  /* ------------------------------------------------------------------ */

  /* Adentro del paquete las rutas van RELATIVAS a la carpeta exportada: así
     la misma carpeta se puede traer a otro lado con otro nombre sin tener que
     reescribir nada. */
  function armar(estado, ruta) {
    const e = P().normalizar(estado);
    const raiz = String(ruta || '');
    const corte = raiz ? raiz.length + 1 : 0;
    const adentro = n => (raiz ? P().dentroDe(raiz, n) && n !== raiz : true);

    return {
      f: FORMATO,
      v: VERSION,
      raiz: raiz ? raiz.split('/').pop() : 'proyecto',
      carpetas: e.carpetas.filter(c => adentro(c)).map(c => c.slice(corte)).filter(Boolean),
      archivos: e.archivos.filter(a => adentro(a.nombre)).map(a => ({
        nombre: a.nombre.slice(corte),
        codigo: String(a.codigo || ''),
        entrada: String(a.entrada || '')
      })).filter(a => a.nombre)
    };
  }

  const enBytes = t => new TextEncoder().encode(t);

  /* El gzip lo hace el navegador. Se inyecta la clase para poder probarlo en
     Node sin inventar un gzip propio. */
  async function pasar(bytes, Clase, formato, tope) {
    const flujo = new Clase(formato);
    const escritor = flujo.writable.getWriter();
    escritor.write(bytes).catch(() => {});
    escritor.close().catch(() => {});
    const lector = flujo.readable.getReader();
    const partes = [];
    let total = 0;
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      if (tope && total > tope) {
        /* Se corta EN EL MEDIO, no al final: esperar a terminar para después
           mirar el tamaño es justamente lo que una bomba zip aprovecha. */
        try { await lector.cancel(); } catch (e) { /* ya estaba cortado */ }
        return null;
      }
      partes.push(value);
    }
    const salida = new Uint8Array(total);
    let i = 0;
    for (const p of partes) { salida.set(p, i); i += p.length; }
    return salida;
  }

  /* Cualquier objeto, comprimido: JSON.stringify + gzip, nada más. */
  function comprimirJSON(objeto, Comp) {
    const C = Comp || global.CompressionStream;
    return pasar(enBytes(JSON.stringify(objeto)), C, 'gzip', null);
  }

  /* La vuelta: gzip -> texto -> JSON.parse. Devuelve el objeto CRUDO, sin
     revisar campo por campo —eso es tarea de quien conoce ESE formato—, o
     null si no era gzip, se pasaba de grande, o no era JSON. */
  async function descomprimirJSON(bytes, Descomp, tope) {
    if (!bytes || bytes.length > LIMITES.archivo) return null;
    const D = Descomp || global.DecompressionStream;
    let crudo;
    try { crudo = await pasar(bytes, D, 'gzip', tope || LIMITES.abierto); }
    catch (e) { return null; }                       // no era gzip
    if (!crudo) return null;                         // se pasaba de grande
    let texto;
    try { texto = new TextDecoder('utf-8', { fatal: true }).decode(crudo); }
    catch (e) { return null; }                       // no era texto
    try { return JSON.parse(texto); } catch (e) { return null; }
  }

  function comprimir(paquete, Comp) { return comprimirJSON(paquete, Comp); }

  async function descomprimir(bytes, Descomp) {
    const bruto = await descomprimirJSON(bytes, Descomp);
    return bruto === null ? null : limpiar(bruto);
  }

  /* ------------------------------------------------------------------ */
  /* Traer                                                               */
  /* ------------------------------------------------------------------ */

  /* El paquete rearmado campo por campo. Lo que no entra en esta forma no
     pasa, venga como venga. */
  function limpiar(bruto) {
    if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
    if (bruto.f !== FORMATO || bruto.v !== VERSION) return null;

    const raiz = P().validarRuta(bruto.raiz) ? '' : String(bruto.raiz);
    const carpetas = [];
    for (const c of (Array.isArray(bruto.carpetas) ? bruto.carpetas : [])) {
      if (typeof c !== 'string' || P().validarRuta(c)) return null;
      carpetas.push(c.normalize('NFC'));
    }

    const archivos = [];
    for (const a of (Array.isArray(bruto.archivos) ? bruto.archivos : [])) {
      if (!a || typeof a !== 'object' || Array.isArray(a)) return null;
      if (typeof a.nombre !== 'string' || P().validarRuta(a.nombre)) return null;
      if (a.codigo !== undefined && typeof a.codigo !== 'string') return null;
      if (a.entrada !== undefined && typeof a.entrada !== 'string') return null;
      archivos.push({
        nombre: a.nombre.normalize('NFC'),
        codigo: String(a.codigo || ''),
        entrada: String(a.entrada || '')
      });
    }

    /* Dos veces la misma ruta adentro del paquete: no se sabe cuál gana, y
       «la última» es una respuesta que alguien puede usar a su favor. */
    const vistas = new Set();
    for (const n of archivos.map(a => a.nombre).concat(carpetas)) {
      const k = n.toLowerCase();
      if (vistas.has(k)) return null;
      vistas.add(k);
    }

    return { f: FORMATO, v: VERSION, raiz: raiz.slice(0, LIMITES.raiz), carpetas, archivos };
  }

  /* El paquete, adentro de una carpeta nueva del proyecto. Todo o nada: si
     algo no da, se devuelve el error y el proyecto queda como estaba. */
  function fundir(estado, paquete, raizDestino) {
    const e = P().normalizar(estado);
    const p = limpiar(paquete);
    if (!p) return { error: 'Ese archivo no es una carpeta de ESLE2, o está roto.' };

    const raiz = String(raizDestino || p.raiz || 'importado').trim();
    const errorRaiz = P().validarCarpeta(raiz, e);
    if (errorRaiz) return { error: errorRaiz };

    const con = n => raiz + '/' + n;

    /* Cada ruta final se revisa entera: el tope de largo es del nombre
       completo, y el nombre completo recién existe acá, con la raíz adelante. */
    for (const n of p.archivos.map(a => a.nombre).concat(p.carpetas)) {
      const error = P().validarRuta(con(n));
      if (error) return { error: `«${n}»: ${error.charAt(0).toLowerCase() + error.slice(1)}` };
    }

    const archivos = e.archivos.concat(p.archivos.map(a => ({
      nombre: con(a.nombre), codigo: a.codigo, entrada: a.entrada, ts: Date.now()
    })));
    if (archivos.length > P().MAX_ARCHIVOS) {
      return { error: `No entran: quedarían ${archivos.length} archivos y el tope es ${P().MAX_ARCHIVOS}.` };
    }

    const carpetas = e.carpetas.concat([raiz], p.carpetas.map(con));
    const todas = P().carpetas(archivos, carpetas);
    if (todas.length > P().MAX_CARPETAS) {
      return { error: `No entran: quedarían ${todas.length} carpetas y el tope es ${P().MAX_CARPETAS}.` };
    }

    /* Y que nada choque con lo que ya había. */
    const previos = new Set(e.archivos.map(a => a.nombre.toLowerCase()));
    for (const a of p.archivos) {
      if (previos.has(con(a.nombre).toLowerCase())) return { error: `Ya hay un archivo «${con(a.nombre)}».` };
    }

    return {
      estado: {
        archivos: P().ordenar(archivos),
        carpetas: [...new Set(carpetas)].sort((x, y) => x.localeCompare(y, 'es', { numeric: true })),
        activo: e.activo
      },
      raiz,
      cuantos: p.archivos.length
    };
  }

  /* «trabajos/parcial» -> «parcial.esle2carpeta» */
  function nombreDeArchivo(ruta) {
    const ultimo = String(ruta || 'proyecto').split('/').pop() || 'proyecto';
    return ultimo.replace(/[\\/:*?"<>|]/g, '-') + EXTENSION;
  }

  global.Carpeta = {
    armar, comprimir, descomprimir, comprimirJSON, descomprimirJSON, limpiar, fundir, nombreDeArchivo,
    LIMITES, FORMATO, VERSION, EXTENSION
  };
})(typeof window !== 'undefined' ? window : globalThis);

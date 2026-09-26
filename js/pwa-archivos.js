/*
 * Recibir archivos que el sistema operativo le pasa a ESLE2 instalada como
 * aplicación (file_handlers del manifest): el alumno hace doble clic en un
 * .sl, o elige ESLE2 con «Abrir con», y el navegador arranca la PWA con ese
 * archivo en vez de vacía.
 *
 * Esto SOLO existe si el alumno instaló ESLE2 como aplicación —el botón
 * «Instalar» de la barra— y su navegador soporta la API (hoy, Chrome y Edge
 * de escritorio). Sin eso, `window.launchQueue` ni existe, y este módulo no
 * hace nada: abrir un archivo con el selector de siempre sigue andando igual.
 *
 * No toca el DOM ni el editor directamente: solo lee el o los archivos y se
 * los pasa a quien lo inició, uno por uno, en el orden que llegaron.
 *
 * API:  PwaArchivos.disponible()                     -> boolean
 *       PwaArchivos.escuchar({ extensiones, maxBytes, onArchivo, onError })
 */
(function (global) {
  'use strict';

  function disponible() {
    return typeof global.launchQueue !== 'undefined' && typeof global.launchQueue.setConsumer === 'function';
  }

  /* Cada «archivo recibido» de launchQueue es un FileSystemFileHandle, no un
     File: hace falta pedirle el contenido con getFile(). */
  async function leer(handle, extensiones, maxBytes) {
    const archivo = await handle.getFile();
    const punto = archivo.name.lastIndexOf('.');
    const ext = punto >= 0 ? archivo.name.slice(punto).toLowerCase() : '';
    if (extensiones && !extensiones.includes(ext))
      return { error: `«${archivo.name}» no es un archivo que ESLE2 sepa abrir así.` };
    if (maxBytes && archivo.size > maxBytes)
      return { error: `«${archivo.name}» es demasiado grande para abrirlo de esta forma.` };
    const texto = await archivo.text();
    return { nombre: archivo.name, codigo: texto };
  }

  /* Se registra una sola vez, apenas la página termina de armar el editor y
     el proyecto: si hay un lanzamiento pendiente (la PWA se abrió por esto),
     el navegador lo entrega apenas hay consumidor; si no hay ninguno, no pasa
     nada y el resto de ESLE2 sigue como siempre. */
  function escuchar(cfg) {
    if (!disponible()) return false;
    const extensiones = cfg.extensiones || null;
    const maxBytes = cfg.maxBytes || null;
    global.launchQueue.setConsumer(async lanzamiento => {
      const archivos = lanzamiento.files || [];
      for (const handle of archivos) {
        let r;
        try { r = await leer(handle, extensiones, maxBytes); }
        catch (e) { r = { error: 'No se pudo leer ese archivo.' }; }
        if (r.error) { if (cfg.onError) cfg.onError(r.error); continue; }
        if (cfg.onArchivo) cfg.onArchivo(r.nombre, r.codigo);
      }
    });
    return true;
  }

  global.PwaArchivos = { disponible, escuchar };
})(typeof window !== 'undefined' ? window : globalThis);

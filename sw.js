/*
 * Service worker de ESLE2: hace que el sitio funcione sin internet.
 *
 * Al instalarse guarda una copia de todo lo propio; después sirve primero
 * desde esa copia (los archivos son estáticos y solo cambian al publicar) y
 * en segundo plano pide la versión nueva para la próxima visita.
 *
 * Al publicar una versión nueva hay que subir VERSION: eso borra la caché vieja.
 */
const VERSION = 'esle2-v48';

const ARCHIVOS = [
  './',
  'index.html',
  'poo.html',
  'documentacion.html',
  'poo-documentacion.html',
  'diseno.html',
  'css/estilo.css',
  'js/sle2.js',
  'js/sle2poo.js',
  'js/modo-sle2.js',
  'js/consola.js',
  'js/estilo.js',
  'js/app.js',
  'js/app-poo.js',
  'js/app-diseno.js',
  'js/ejercicios.js',
  'js/plantillas.js',
  'js/ejercicios-poo.js',
  'js/doc.js',
  'js/tema.js',
  'js/diseno.js',
  'js/compartir.js',
  'js/depurador.js',
  'js/progreso.js',
  'js/racha.js',
  'js/mis-ejercicios.js',
  'js/examen.js',
  'js/aula.js',
  'js/aula-ui.js',
  'js/estadisticas.js',
  'js/repaso.js',
  'js/presentacion.js',
  'visual.html',
  'bd.html',
  'bd-documentacion.html',
  'visual-documentacion.html',
  'css/visual.css',
  'css/bd.css',
  'js/sle2vis.js',
  'js/sql.js',
  'js/sle2bd.js',
  'js/exportar-sql.js',
  'js/diagrama-bd.js',
  'js/diagrama-bd-ui.js',
  'js/editor-bd.js',
  'js/editor-bd-ui.js',
  'js/bd-app.js',
  'js/bd-ejemplos.js',
  'js/visual-ui.js',
  'js/disenador.js',
  'js/disenador-ui.js',
  'js/visual-app.js',
  'js/visual-ejemplos.js',
  'js/verificar-visual.js',
  'js/ejercicios-visual.js',
  'img/visual/curso.png',
  'img/visual/depurador.png',
  'img/visual/entorno.png',
  'img/visual/insertar.png',
  'img/visual/lienzo.png',
  'img/visual/propiedades.png',
  'img/visual/salida-error.png',
  'img/visual/telefono.png',
  'img/visual/ventana.png',
  'img/visual/verificacion.png',
  'js/iconos-visual.js',
  'js/proyecto.js',
  'js/proyecto-ui.js',
  'js/iconos.js',
  'js/menus.js',
  'js/sonido.js',
  'js/historial.js',
  'js/historial-ui.js',
  'js/autocompletar.js',
  'js/autocompletar-ui.js',
  'js/memoria.js',
  'js/memoria-ui.js',
  'js/escritorio.js',
  'js/escritorio-ui.js',
  'js/diagrama.js',
  'js/diagrama-ui.js',
  'js/diagrama-editor.js',
  'js/diagrama-editor-ui.js',
  'js/flexible.js',
  'js/flexible-ui.js',
  'js/ajustar-texto.js',
  'js/animo.js',
  'js/animo-ui.js',
  'js/duelo.js',
  'js/duelo-ui.js',
  'js/voz.js',
  'js/dictado.js',
  'js/voz-ui.js',
  /* vendor/yjs/juntos.min.js NO se guarda a propósito: son 214 KB que solo
     sirven conectado, y se traen recién al abrir «Programar de a dos». */
  'js/juntos.js',
  'js/juntos-ui.js',
  'js/enfoque.js',
  'js/enfoque-ui.js',
  'js/viaje.js',
  'js/viaje-ui.js',
  /* La transmisión en vivo necesita internet igual que «Programar de a dos»,
     pero la página se guarda igual: así, si alguien abre /live/… sin señal,
     ve la explicación en vez de un error del navegador. */
  'vivo.html',
  'js/vivo.js',
  'js/vivo-ui.js',
  'js/disposicion.js',
  'js/buscador.js',
  'js/traducir.js',
  'js/traducir-py.js',
  'js/traducir-c.js',
  'js/traducir-poo.js',
  'js/indice.js',
  'js/instalar.js',
  'vendor/codemirror/codemirror.min.css',
  'vendor/codemirror/codemirror.min.js',
  'vendor/codemirror/addon/edit/matchbrackets.min.js',
  'vendor/codemirror/addon/hint/show-hint.min.js',
  'vendor/codemirror/addon/hint/show-hint.min.css',
  'img/logo.svg',
  'img/logo-poo.svg',
  'img/favicon.png',
  'img/icono-192.png',
  'img/icono-512.png',
  'img/icono-mask-512.png',
  'img/icono-180.png',
  'manifest.json'
  'img/poo/hero.svg',
  'img/poo/clase-objeto.svg',
  'img/poo/encapsulamiento.svg',
  'img/poo/abstraccion.svg',
  'img/poo/herencia.svg',
  'img/poo/polimorfismo.svg',
  'js/perfil.js',
  'js/perfil-ui.js',
];

/* Guarda una copia bajo la dirección pedida.
   Se rearma la respuesta porque el navegador no deja cachear una redirección
   (y algunos servidores mandan /index.html a /), ni una petición de navegación. */
async function guardar(cache, url, resp) {
  if (!resp || !resp.ok) return;
  try {
    const copia = new Response(await resp.clone().blob(), {
      status: 200,
      statusText: 'OK',
      headers: resp.headers
    });
    await cache.put(new Request(url), copia);
  } catch (e) { /* si no se puede cachear, el sitio sigue andando online */ }
}

self.addEventListener('install', ev => {
  ev.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(ARCHIVOS.map(async ruta => {
      const url = new URL(ruta, self.registration.scope).href;
      try { await guardar(cache, url, await fetch(url, { cache: 'reload' })); }
      catch (e) { /* un archivo suelto que falle no arruina la instalación */ }
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', ev => {
  ev.waitUntil((async () => {
    const viejas = (await caches.keys()).filter(k => k !== VERSION);
    await Promise.all(viejas.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== location.origin) return;   // tipografías: al navegador

  ev.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const guardado = await cache.match(req.url, { ignoreSearch: true });

    if (guardado) {
      // Refresco en segundo plano: la copia nueva queda para la próxima vez.
      ev.waitUntil((async () => {
        try { await guardar(cache, req.url, await fetch(req.url, { cache: 'reload' })); }
        catch (e) { /* sin conexión: seguimos con la copia */ }
      })());
      return guardado;
    }

    try {
      const resp = await fetch(req);
      ev.waitUntil(guardar(cache, req.url, resp));
      return resp;
    } catch (e) {
      // Sin conexión y sin copia: si es una navegación, mostrar al menos el IDE.
      if (req.mode === 'navigate') {
        const inicio = await cache.match(new URL('index.html', self.registration.scope).href);
        if (inicio) return inicio;
      }
      return Response.error();
    }
  })());
});

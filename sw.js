/*
 * Service worker de ESLE2: hace que el sitio funcione sin internet.
 *
 * Al instalarse guarda una copia de todo lo propio; después sirve primero
 * desde esa copia (los archivos son estáticos y solo cambian al publicar) y
 * en segundo plano pide la versión nueva para la próxima visita.
 *
 * Al publicar una versión nueva hay que subir VERSION: eso borra la caché vieja.
 */
const VERSION = 'esle2-v68';

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
  /* vendor/yjs/juntos.min.js NO se guarda a propósito: son 214 KB que solo
     sirven conectado, y se traen recién al abrir «Programar en grupo». */
  'js/juntos.js',
  'js/juntos-ui.js',
  'js/enfoque.js',
  'js/enfoque-ui.js',
  'js/viaje.js',
  'js/viaje-ui.js',
  /* La transmisión en vivo necesita internet igual que «Programar en grupo»,
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
  'manifest.json',
  'img/poo/hero.svg',
  'img/poo/clase-objeto.svg',
  'img/poo/encapsulamiento.svg',
  'img/poo/abstraccion.svg',
  'img/poo/herencia.svg',
  'img/poo/polimorfismo.svg',
  'js/perfil.js',
  'js/perfil-ui.js',
  'js/bienvenida.js',
  'js/cobertura.js',
  'js/otra-forma.js',
  'js/soluciones.js',   // se pide a mano; ningún HTML lo nombra
  'img/visual/diseno-y-ejecucion.png',
  'img/visual/coordenadas-formulario.png',
  'img/visual/formulario-anatomia.png',
  'img/visual/confirmacion.png',
  'img/visual/temporizador-eventos.png',
  'js/verificar-bd.js',
  'js/ejercicios-bd.js',
  'js/curso-bd-ui.js',
  'img/bd/subconsulta-suelta-vs-correlacionada.png',
  'img/bd/no-en-vs-no-existe.png',
  'img/bd/unir-por-clave.png',
  'js/guardado.js',
  'img/tutorial/barra-bd.png',
  'img/tutorial/barra-clasico.png',
  'img/tutorial/barra-poo.png',
  'img/tutorial/barra-visual.png',
  'img/tutorial/buscador.png',
  'img/tutorial/controles-visual.png',
  'img/tutorial/curso-bd.png',
  'img/tutorial/curso-clasico.png',
  'img/tutorial/curso-poo.png',
  'img/tutorial/curso-visual.png',
  'img/tutorial/dlg-archivos.png',
  'img/tutorial/dlg-diagrama-bd.png',
  'img/tutorial/dlg-diagrama.png',
  'img/tutorial/dlg-editor-bd.png',
  'img/tutorial/dlg-editor-diagrama.png',
  'img/tutorial/dlg-escritorio.png',
  'img/tutorial/dlg-exportar-bd.png',
  'img/tutorial/dlg-historial.png',
  'img/tutorial/dlg-memoria.png',
  'img/tutorial/dlg-traduccion.png',
  'img/tutorial/editor-bd.png',
  'img/tutorial/editor-clasico.png',
  'img/tutorial/editor-poo.png',
  'img/tutorial/editor-visual.png',
  'img/tutorial/ejercicio.png',
  'img/tutorial/entrada.png',
  'img/tutorial/esquema-bd.png',
  'img/tutorial/explorador.png',
  'img/tutorial/herramientas-bd.png',
  'img/tutorial/herramientas-clasico.png',
  'img/tutorial/herramientas-poo.png',
  'img/tutorial/herramientas-visual.png',
  'img/tutorial/lienzo.png',
  'img/tutorial/menu-archivo-bd.png',
  'img/tutorial/menu-archivo-clasico.png',
  'img/tutorial/menu-archivo-poo.png',
  'img/tutorial/menu-archivo-visual.png',
  'img/tutorial/menu-base.png',
  'img/tutorial/menu-exportar.png',
  'img/tutorial/menu-insertar.png',
  'img/tutorial/menu-traducir-clasico.png',
  'img/tutorial/menu-traducir-poo.png',
  'img/tutorial/menu-ver-bd.png',
  'img/tutorial/menu-ver-clasico.png',
  'img/tutorial/menu-ver-poo.png',
  'img/tutorial/menu-ver-visual.png',
  'img/tutorial/pausa.png',
  'img/tutorial/salida-bd.png',
  'img/tutorial/salida-clasico.png',
  'img/tutorial/salida-poo.png',
  'img/tutorial/salida-visual.png',
  'img/tutorial/sql-rapido.png',
  'img/tutorial/ventana-visual.png',
  'js/tutorial.js',
  'js/tutorial-ui.js',
  'img/logo-bd.svg',
  'img/logo-visual.svg',
  'js/seguro.js',
  'js/vivo-pagina.js',
  'js/sala.js',
  'js/sala-ui.js',
  'js/carpeta.js',
];

/* Lo que esta caché acepta guardar. Sin esto, una respuesta que viniera de
   otro lado —una redirección, un portal de wifi del colegio que contesta
   cualquier cosa, un proxy— quedaba guardada con nuestra dirección y se
   seguía sirviendo después, incluso ya con internet: el sitio quedaba
   envenenado hasta que alguien limpiara la caché a mano. */
function sirveParaGuardar(url, resp) {
  if (!resp || !resp.ok || resp.status !== 200) return false;
  if (resp.type === 'opaque' || resp.type === 'opaqueredirect' || resp.type === 'error') return false;
  /* La dirección FINAL, después de seguir redirecciones, tiene que ser
     nuestra: resp.url es la de verdad, req.url es la que pedimos. */
  if (resp.redirected) return false;
  try {
    if (resp.url && new URL(resp.url).origin !== location.origin) return false;
    if (new URL(url, location.href).origin !== location.origin) return false;
  } catch (e) { return false; }
  /* Y tiene que ser de un tipo que este sitio sirva. Un text/html donde
     esperábamos un .js es la forma clásica de que un portal cautivo termine
     guardado como si fuera nuestro código. */
  const tipo = (resp.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!tipo) return true;                       // sin tipo declarado: lo decide el navegador
  const esperado = TIPOS_POR_EXTENSION[(url.match(/\.([a-z0-9]+)(?:$|\?)/i) || [])[1] || ''];
  return !esperado || esperado.indexOf(tipo) >= 0;
}

const TIPOS_POR_EXTENSION = {
  js: ['text/javascript', 'application/javascript'],
  css: ['text/css'],
  html: ['text/html'],
  json: ['application/json', 'application/manifest+json'],
  webmanifest: ['application/manifest+json'],
  svg: ['image/svg+xml'],
  png: ['image/png']
};

/* Guarda una copia bajo la dirección pedida.
   Se rearma la respuesta porque el navegador no deja cachear una redirección
   (y algunos servidores mandan /index.html a /), ni una petición de navegación.
   Las cabeceras se copian tal cual: ahí viaja la CSP, y una copia sin ella
   quedaría más floja que el original. */
async function guardar(cache, url, resp) {
  if (!sirveParaGuardar(url, resp)) return;
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
    /* Solo las cachés de ESLE2: si el sitio convive con otra cosa en el mismo
       origen —una prueba, otra herramienta de la escuela—, borrarle la suya
       sería romperle el trabajo a otro. */
    const viejas = (await caches.keys()).filter(k => k !== VERSION && k.startsWith('esle2-'));
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
      // Sin conexión y sin copia: si es una navegación, mostrar algo útil.
      if (req.mode === 'navigate') {
        /* /live/juan es la página de una transmisión: sin conexión tiene que
           mostrar ESA página, que explica que no hay señal, y no el IDE. */
        const esVivo = /\/live\//.test(new URL(req.url).pathname);
        const destino = new URL(esVivo ? 'vivo.html' : 'index.html', self.registration.scope).href;
        const pagina = await cache.match(destino);
        if (pagina) return pagina;
      }
      return Response.error();
    }
  })());
});

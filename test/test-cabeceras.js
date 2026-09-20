/*
 * Las cabeceras de seguridad, y lo que hace falta para poder tenerlas.
 *
 * La CSP es lo único del proyecto que vive en un archivo de configuración y no
 * en el código: si alguien la afloja —o si, sin querer, vuelve a escribir un
 * <script> adentro de un HTML y hay que aflojarla para que ande— no se rompe
 * ninguna prueba y nadie se entera. Esta prueba es ese aviso.
 *
 * Lo que comprueba:
 *   · que vercel.json declare las cabeceras, para todas las direcciones;
 *   · que la CSP no traiga 'unsafe-inline' ni 'unsafe-eval' donde importa;
 *   · que ningún HTML tenga <script> escrito adentro, ni <style>, ni un
 *     atributo onclick=… ni style=…, que es lo que obligaría a aflojarla;
 *   · que todo lo que se pide de afuera esté permitido por la política.
 *
 *   node test/test-cabeceras.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);
const paginas = () => fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();

seccion('vercel.json declara las cabeceras');
comprobar('hay un bloque de cabeceras', Array.isArray(cfg.headers) && cfg.headers.length > 0);
const bloque = (cfg.headers || []).find(h => h.source === '/(.*)');
comprobar('que vale para todas las direcciones', !!bloque, JSON.stringify((cfg.headers || []).map(h => h.source)));
const valor = nombre => {
  const h = ((bloque && bloque.headers) || []).find(x => x.key.toLowerCase() === nombre.toLowerCase());
  return h ? h.value : '';
};

const ESPERADAS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
for (const [nombre, esperado] of Object.entries(ESPERADAS)) {
  comprobar(`${nombre}: ${esperado}`, valor(nombre) === esperado, valor(nombre) || '(no está)');
}
comprobar('Strict-Transport-Security con un año o más',
  /max-age=(\d+)/.test(valor('Strict-Transport-Security'))
  && Number(/max-age=(\d+)/.exec(valor('Strict-Transport-Security'))[1]) >= 31536000,
  valor('Strict-Transport-Security'));
comprobar('Permissions-Policy apaga la cámara', /camera=\(\)/.test(valor('Permissions-Policy')));
comprobar('y el micrófono', /microphone=\(\)/.test(valor('Permissions-Policy')));
comprobar('y la ubicación', /geolocation=\(\)/.test(valor('Permissions-Policy')));

seccion('La política de contenido');
const csp = valor('Content-Security-Policy');
const directiva = d => {
  const m = new RegExp('(?:^|;)\\s*' + d + '\\s+([^;]+)').exec(csp);
  return m ? m[1].trim() : '';
};
comprobar('hay CSP', csp.length > 50);
comprobar("script-src es 'self' y nada más", directiva('script-src') === "'self'", directiva('script-src'));
comprobar('sin unsafe-inline en los scripts', !/script-src[^;]*unsafe-inline/.test(csp));
comprobar('sin unsafe-eval en ningún lado', !/unsafe-eval/.test(csp));
comprobar("default-src 'self'", directiva('default-src') === "'self'", directiva('default-src'));
comprobar("object-src 'none'", directiva('object-src') === "'none'");
comprobar("frame-ancestors 'none' (nadie mete el sitio en un iframe)",
  directiva('frame-ancestors') === "'none'");
comprobar("form-action 'none' (ningún formulario manda nada a ningún lado)",
  directiva('form-action') === "'none'");
comprobar("base-uri 'self'", directiva('base-uri') === "'self'");
comprobar("script-src-attr 'none' (ningún onclick= en el HTML)",
  directiva('script-src-attr') === "'none'");
comprobar('las tipografías de Google están permitidas y nada más',
  directiva('style-src') === "'self' https://fonts.googleapis.com", directiva('style-src'));
comprobar('y sus archivos', directiva('font-src') === "'self' https://fonts.gstatic.com", directiva('font-src'));
comprobar('las imágenes son solo nuestras', directiva('img-src') === "'self'", directiva('img-src'));
comprobar('connect-src permite los servidores de señas',
  /wss:/.test(directiva('connect-src')), directiva('connect-src'));
comprobar("worker-src 'self' (el service worker)", directiva('worker-src') === "'self'");

seccion('Nada de «inline» en el HTML, que es lo que permite esa CSP');
for (const p of paginas()) {
  const html = fs.readFileSync(path.join(RAIZ, p), 'utf8');
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>/g)];
  comprobar(`${p}: sin <script> escrito adentro`, inline.length === 0, inline.map(m => m[0]).join(' '));
  comprobar(`${p}: sin <style> escrito adentro`, !/<style[\s>]/.test(html));
  const on = [...html.matchAll(/\son[a-z]+\s*=/g)];
  comprobar(`${p}: sin atributos onclick= y compañía`, on.length === 0, on.map(m => m[0]).join(' '));
  comprobar(`${p}: sin atributos style=`, !/\sstyle\s*=/.test(html));
}

seccion('Lo que el HTML pide de afuera está permitido');
{
  const permitidos = new Set(['https://fonts.googleapis.com', 'https://fonts.gstatic.com']);
  for (const p of paginas()) {
    const html = fs.readFileSync(path.join(RAIZ, p), 'utf8');
    /* Enlaces a otras páginas (href de un <a>) no los mira la CSP: lo que
       importa es lo que el navegador va a BAJAR solo. */
    for (const m of html.matchAll(/<(?:link|script|img|iframe)[^>]*(?:src|href)="(https?:\/\/[^"]+)"/g)) {
      const origen = new URL(m[1]).origin;
      comprobar(`${p}: ${origen} está en la política`, permitidos.has(origen), m[1]);
    }
    for (const m of html.matchAll(/<a[^>]*target="_blank"[^>]*>/g)) {
      comprobar(`${p}: un enlace a otra pestaña lleva rel=noopener`,
        /rel="[^"]*noopener/.test(m[0]), m[0].slice(0, 90));
    }
  }
}

seccion('Un solo lugar decide qué es texto y qué es HTML');
{
  const js = fs.readdirSync(path.join(RAIZ, 'js')).filter(x => x.endsWith('.js'));
  for (const f of js) {
    if (f === 'seguro.js') continue;
    const s = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
    /* Cada módulo tenía su propio escapar(), y ninguno escapaba las comillas:
       servían para un párrafo y no para un atributo, que es donde se colaba. */
    /* Un escapador de HTML es el que reemplaza «<». Los que escapan comillas
       para un CSV o para una cadena de SQL son otra cosa y se quedan donde
       están. */
    const propio = /const escapar[^;]*replace\([^)]*&lt;|const escapar[^;]*\[&<>\]/.test(s);
    comprobar(`js/${f}: no se escribe su propio escapador de HTML`, !propio);
    /* El enunciado y la pista de un ejercicio son lo único del proyecto que
       puede traer etiquetas, y solo pasando por Seguro.html(). */
    for (const m of s.matchAll(/[^.\w](e\.enunciado|e\.pista)\b/g)) {
      const antes = s.slice(Math.max(0, m.index - 160), m.index);
      if (!/innerHTML[\s\S]*$/.test(antes) && !/\+\s*$|`\s*$|\$\{\s*$/.test(antes)) continue;
      /* «e.pista ? …» es una pregunta, no una pantalla: lo que importa es lo
         que va del otro lado del interrogante. */
      if (/^\s*\?/.test(s.slice(m.index + m[0].length))) continue;
      const rodea = s.slice(Math.max(0, m.index - 30), m.index + 40);
      comprobar(`js/${f}: ${m[1]} pasa por Seguro.html()`,
        rodea.includes('Seguro.html(' + m[1] + ')') || rodea.includes('textContent'), rodea.replace(/\s+/g, ' '));
    }
  }
}

seccion('Los módulos propios no piden nada de afuera');
for (const f of fs.readdirSync(path.join(RAIZ, 'js')).filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(RAIZ, 'js', f), 'utf8');
  /* Un fetch() o un <script src> a otro sitio sería una dependencia nueva, y
     la CSP lo bloquearía en producción: mejor enterarse acá. */
  const pedidos = [...s.matchAll(/(?:fetch|createElement\('script'\)[\s\S]{0,200}?src\s*=)\s*\(?\s*['"`](https?:\/\/[^'"`]+)/g)];
  comprobar(`js/${f}: no baja nada de otro sitio`, pedidos.length === 0, pedidos.map(m => m[1]).join(' '));
}

console.log(`\n${ok} bien, ${fallos} mal`);
process.exit(fallos ? 1 : 0);

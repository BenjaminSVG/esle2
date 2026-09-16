/*
 * Prueba de la instalación como aplicación (manifest.json, iconos y las
 * etiquetas de cada página).
 *
 * Un manifiesto con un icono que no existe, o una página sin la etiqueta
 * viewport, no rompe nada visible: simplemente el teléfono deja de ofrecer
 * instalar la aplicación, y nadie se entera hasta que un alumno lo intenta.
 * Por eso se verifica acá.
 *   node test/test-manifest.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
const PAGINAS = ['index.html', 'poo.html', 'documentacion.html', 'poo-documentacion.html',
  'diseno.html', 'visual.html', 'visual-documentacion.html'];

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

/* Ancho y alto de un PNG: van en el bloque IHDR, siempre al principio. */
function tamanoPNG(archivo) {
  const b = fs.readFileSync(path.join(RAIZ, archivo));
  const firma = b.slice(0, 8).toString('hex');
  if (firma !== '89504e470d0a1a0a') return null;
  return { ancho: b.readUInt32BE(16), alto: b.readUInt32BE(20), bytes: b.length };
}

/* ----------------------------- manifest.json ---------------------------- */
const m = JSON.parse(leer('manifest.json'));
{
  comprobar('tiene nombre y nombre corto', !!m.name && !!m.short_name);
  comprobar('el nombre corto entra en el teléfono', m.short_name.length <= 12, m.short_name);
  comprobar('arranca en una página que existe',
    fs.existsSync(path.join(RAIZ, m.start_url.replace('./', ''))), m.start_url);
  comprobar('se abre como aplicación', m.display === 'standalone', m.display);
  comprobar('con colores propios', /^#[0-9a-f]{6}$/i.test(m.theme_color) && /^#[0-9a-f]{6}$/i.test(m.background_color));
  comprobar('en español', m.lang === 'es');
  comprobar('con descripción', (m.description || '').length > 20);
  comprobar('y sin encerrar la orientación', m.orientation === 'any', m.orientation);
}

/* ------------------------------- iconos --------------------------------- */
{
  comprobar('hay iconos', Array.isArray(m.icons) && m.icons.length >= 3, String((m.icons || []).length));
  for (const i of m.icons) {
    const existe = fs.existsSync(path.join(RAIZ, i.src));
    comprobar(`el icono ${i.src} existe`, existe);
    if (!existe || i.type !== 'image/png') continue;
    const t = tamanoPNG(i.src);
    comprobar(`${i.src} es un PNG de verdad`, !!t);
    if (!t) continue;
    comprobar(`${i.src} mide lo que dice`, `${t.ancho}x${t.alto}` === i.sizes,
      `${t.ancho}x${t.alto} contra ${i.sizes}`);
    comprobar(`${i.src} no es una imagen vacía`, t.bytes > 500, t.bytes + ' bytes');
  }
  const anys = m.icons.filter(i => i.type === 'image/png' && (i.purpose || 'any').includes('any'));
  comprobar('hay un PNG de 192 y otro de 512',
    anys.some(i => i.sizes === '192x192') && anys.some(i => i.sizes === '512x512'),
    anys.map(i => i.sizes).join());
  const mask = m.icons.filter(i => (i.purpose || '').includes('maskable'));
  comprobar('hay un icono maskable para Android', mask.length === 1 && mask[0].sizes === '512x512');
}
{
  /* El de iOS no va en el manifiesto sino en cada página. */
  const t = tamanoPNG('img/icono-180.png');
  comprobar('el icono de iOS mide 180x180', t && t.ancho === 180 && t.alto === 180,
    t ? `${t.ancho}x${t.alto}` : 'no existe');
}

/* ------------------------------- atajos --------------------------------- */
{
  comprobar('hay atajos', Array.isArray(m.shortcuts) && m.shortcuts.length >= 2);
  for (const s of m.shortcuts || []) {
    const destino = s.url.replace('./', '').split('#')[0];
    comprobar(`el atajo «${s.short_name}» lleva a una página que existe`,
      fs.existsSync(path.join(RAIZ, destino)), s.url);
    comprobar(`el atajo «${s.short_name}» tiene nombre corto`,
      !!s.short_name && s.short_name.length <= 12, s.short_name);
    for (const i of s.icons || [])
      comprobar(`el icono del atajo «${s.short_name}» existe`, fs.existsSync(path.join(RAIZ, i.src)), i.src);
  }
}

/* --------------------------- las cinco páginas -------------------------- */
for (const p of PAGINAS) {
  const html = leer(p);
  comprobar(`${p}: se adapta al ancho del dispositivo`,
    /<meta name="viewport" content="width=device-width, initial-scale=1">/.test(html));
  comprobar(`${p}: enlaza el manifiesto`, /<link rel="manifest" href="manifest.json">/.test(html));
  comprobar(`${p}: tiene icono para iOS`,
    /<link rel="apple-touch-icon" href="img\/icono-180.png">/.test(html));
  comprobar(`${p}: se abre a pantalla completa en iOS`,
    /apple-mobile-web-app-capable" content="yes"/.test(html));
  comprobar(`${p}: tiene nombre corto en iOS`,
    /apple-mobile-web-app-title" content="ESLE2"/.test(html));
  comprobar(`${p}: color de barra para los dos temas`,
    (html.match(/name="theme-color"/g) || []).length === 2);
  comprobar(`${p}: tiene el botón de instalar`, /id="btnInstalar"/.test(html));
  comprobar(`${p}: carga js/instalar.js`, /src="js\/instalar.js"/.test(html));
  /* Un initial-scale fijo o maximum-scale=1 impediría agrandar el texto. */
  comprobar(`${p}: no bloquea el zoom`, !/user-scalable=no|maximum-scale/.test(html));
}

/* --------------------------- caché sin internet ------------------------- */
{
  const sw = leer('sw.js');
  comprobar('el service worker guarda el manifiesto', sw.includes("'manifest.json'"));
  for (const i of m.icons)
    comprobar(`el service worker guarda ${i.src}`, sw.includes(`'${i.src}'`));
  comprobar('y el icono de iOS', sw.includes("'img/icono-180.png'"));
  const version = /const VERSION = '([^']+)'/.exec(sw);
  comprobar('la caché tiene versión', !!version && /^esle2-v\d+$/.test(version[1]),
    version && version[1]);
}

/* ------------------ las capturas de la documentación Visual ------------- */
{
  /* Una captura rota deja la documentación con un hueco y nadie se entera:
     acá se revisa que existan, que midan lo que dice el HTML, que tengan un
     texto alternativo de verdad y que el service worker las guarde. */
  const sw = leer('sw.js');
  const DOCS = [
    ['visual-documentacion.html', 'img/visual', 8, 'Visual'],
    ['bd-documentacion.html', 'img/bd', 3, 'BD']
  ];

  for (const [pagina, carpeta, minimo, comoSeLlama] of DOCS) {
    const html = leer(pagina);
    const re = new RegExp('<img src="(' + carpeta.replace('/', '\\/')
      + '\\/[^"]+)"\\s+width="(\\d+)"\\s+height="(\\d+)"[^>]*?alt="([^"]*)"', 'g');
    const usadas = [...html.matchAll(re)];
    comprobar(`la documentación ${comoSeLlama} muestra lo que explica`,
      usadas.length >= minimo, String(usadas.length));

    for (const [, ruta, ancho, alto, alt] of usadas) {
      const t = tamanoPNG(ruta);
      comprobar(`${ruta} existe y es un PNG`, !!t);
      if (!t) continue;
      comprobar(`${ruta} mide lo que dice el HTML`,
        String(t.ancho) === ancho && String(t.alto) === alto,
        `${t.ancho}x${t.alto} contra ${ancho}x${alto}`);
      comprobar(`${ruta} describe lo que se ve`, alt.length > 40, alt.slice(0, 50));
      comprobar(`el service worker guarda ${ruta}`, sw.includes(`'${ruta}'`));
    }

    /* Y al revés: ninguna imagen guardada de más. */
    const enDisco = fs.readdirSync(path.join(RAIZ, carpeta)).map(f => carpeta + '/' + f);
    const enHtml = new Set(usadas.map(u => u[1]));
    for (const f of enDisco)
      comprobar(`${f} se usa en alguna página`, enHtml.has(f));
  }
}

/* --------------------- lo que el CSS promete en el teléfono ------------- */
{
  const css = leer('css/estilo.css');
  comprobar('hay una hoja de estilos para teléfonos', css.includes('@media (max-width: 640px)'));
  comprobar('y otra para pantallas táctiles', css.includes('@media (pointer: coarse)'));
  /* Hay más de un bloque para pantallas táctiles; el que importa acá es el que
     agranda los botones. */
  comprobar('los botones llegan a 40 px donde se tocan con el dedo',
    /\.btn, \.pest, \.btn-buscar[^}]*min-height:\s*40px/.test(css));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'la instalación como aplicación tiene fallos');

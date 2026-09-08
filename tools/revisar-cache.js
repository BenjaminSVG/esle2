/*
 * Revisa la lista ARCHIVOS del service worker contra lo que las páginas piden
 * de verdad.
 *
 * Por qué existe: olvidarse de agregar un archivo a ARCHIVOS no rompe nada
 * visible. El sitio anda perfecto mientras haya internet, y falla recién en la
 * máquina de alguien que lo abrió sin conexión — que es justo cuando nadie
 * puede avisar. Ninguna otra prueba lo agarra.
 *
 *   node tools/revisar-cache.js              lista los problemas
 *   node tools/revisar-cache.js --arreglar   agrega a ARCHIVOS lo que falta
 *
 * Sale con 1 si hay algo mal, para que sirva como prueba.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SW = path.join(RAIZ, 'sw.js');

/* Lo que se sirve solo y no es un archivo del proyecto. */
const NO_ES_ARCHIVO = new Set(['/', './', '']);

function paginas() {
  return fs.readdirSync(RAIZ).filter(f => f.endsWith('.html')).sort();
}

/* Todo lo local que piden las páginas: scripts, hojas de estilo, imágenes,
   el manifiesto y los enlaces entre páginas. */
function pedidos() {
  const encontrados = new Map();   // ruta -> quién la pide
  for (const pagina of paginas()) {
    const texto = fs.readFileSync(path.join(RAIZ, pagina), 'utf8');
    for (const m of texto.matchAll(/(?:src|href)="([^"]*)"/g)) {
      const bruto = m[1];
      if (/^(?:https?:|data:|mailto:|javascript:|#)/i.test(bruto)) continue;
      const url = bruto.replace(/^\.\//, '').split('#')[0].split('?')[0];
      if (NO_ES_ARCHIVO.has(url)) continue;          // el <base href="/"> de vivo.html
      if (!encontrados.has(url)) encontrados.set(url, pagina);
    }
  }
  return encontrados;
}

function listaDelSw(texto) {
  const bloque = texto.match(/const ARCHIVOS = \[([\s\S]*?)\n\];/);
  if (!bloque) throw new Error('no encontré la lista ARCHIVOS en sw.js');
  return (bloque[1].match(/'[^']+'/g) || []).map(s => s.slice(1, -1));
}

function revisar() {
  const texto = fs.readFileSync(SW, 'utf8');
  const enCache = listaDelSw(texto);
  const guardados = new Set(enCache.map(u => u.replace(/^\.\//, '')));
  const piden = pedidos();

  const rotas = [];      // la página pide algo que no está en el disco
  const faltan = [];     // existe, se pide, y no se guarda para usar sin internet
  for (const [url, pagina] of piden) {
    if (!fs.existsSync(path.join(RAIZ, url))) rotas.push([url, pagina]);
    else if (!guardados.has(url)) faltan.push([url, pagina]);
  }

  /* Al revés: lo que se guarda y ya no existe. Se descarga en cada visita,
     falla, y la instalación entera del service worker se cae con él. */
  const fantasmas = enCache.filter(u => !NO_ES_ARCHIVO.has(u) &&
    !fs.existsSync(path.join(RAIZ, u)));

  return { enCache, faltan, rotas, fantasmas };
}

function arreglar(faltan) {
  const texto = fs.readFileSync(SW, 'utf8');
  const bloque = texto.match(/const ARCHIVOS = \[([\s\S]*?)\n\];/);
  const fin = texto.indexOf('\n];', bloque.index);
  const salto = texto.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const nuevas = faltan.map(([u]) => `  '${u}',`).join(salto);
  fs.writeFileSync(SW, texto.slice(0, fin) + salto + nuevas + texto.slice(fin));
}

if (require.main === module) {
  const r = revisar();
  for (const [u, p] of r.rotas) console.error(`ROTO      ${u}  (lo pide ${p})`);
  for (const [u, p] of r.faltan) console.error(`SIN CACHÉ ${u}  (lo pide ${p})`);
  for (const u of r.fantasmas) console.error(`NO EXISTE ${u}  (está en ARCHIVOS)`);

  if (process.argv.includes('--arreglar') && r.faltan.length) {
    arreglar(r.faltan);
    console.log(`agregados a ARCHIVOS: ${r.faltan.length}`);
    console.log('acordate de subir VERSION en sw.js');
    process.exit(r.rotas.length + r.fantasmas.length ? 1 : 0);
  }

  const mal = r.rotas.length + r.faltan.length + r.fantasmas.length;
  console.log(mal
    ? `${mal} problemas en la caché (probá con --arreglar)`
    : `caché completa: ${r.enCache.length} archivos, ${paginas().length} páginas`);
  process.exit(mal ? 1 : 0);
}

module.exports = { revisar, pedidos, listaDelSw };

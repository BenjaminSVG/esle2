/*
 * Que todo lo que piden las páginas se guarde para usar sin internet.
 *   node test/test-cache.js
 *
 * Es la única prueba que puede fallar sin que se vea nada en el navegador:
 * el sitio anda igual con internet. Se rompe recién en la máquina de alguien
 * que lo abrió sin conexión.
 */
'use strict';
const { revisar, pedidos, listaDelSw } = require('../tools/revisar-cache.js');
const fs = require('fs');
const path = require('path');

let bien = 0, mal = 0;
const chk = (c, m) => { if (c) bien++; else { mal++; console.log('  FALLA: ' + m); } };

const r = revisar();

chk(r.rotas.length === 0,
  'ninguna página pide un archivo que no existe: ' + r.rotas.map(x => x[0]).join(' '));
chk(r.faltan.length === 0,
  'todo lo que se pide está en ARCHIVOS (corré: node tools/revisar-cache.js --arreglar): '
  + r.faltan.map(x => x[0]).join(' '));
chk(r.fantasmas.length === 0,
  'ARCHIVOS no nombra archivos borrados —tiran abajo la instalación entera—: '
  + r.fantasmas.join(' '));

/* Las diez páginas tienen que estar guardadas: si falta una, sin internet
   se ve el cartel del navegador en lugar del sitio. */
for (const p of fs.readdirSync(path.join(__dirname, '..')).filter(f => f.endsWith('.html'))) {
  chk(r.enCache.includes(p), 'está guardada la página ' + p);
}

/* La raíz se pide sola cuando alguien entra a esle2.vercel.app. */
chk(r.enCache.includes('./'), 'está guardada la raíz del sitio');

/* Nada repetido: se descargaría dos veces. */
const repes = r.enCache.filter((u, i) => r.enCache.indexOf(u) !== i);
chk(repes.length === 0, 'sin repetidos en ARCHIVOS: ' + repes.join(' '));

/* El service worker tiene que llevar una VERSION distinta en cada publicación:
   es lo que borra la caché vieja. Acá solo se comprueba que exista y tenga
   forma de número, que es lo que se puede saber sin mirar el sitio publicado. */
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const version = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
chk(/^esle2-v\d+$/.test(version || ''), 'la VERSION tiene la forma esperada: ' + version);

chk(pedidos().size > 100, 'se leyeron las referencias de las páginas: ' + pedidos().size);
chk(listaDelSw(sw).length === r.enCache.length, 'la lista se lee entera');

/* Y que sw.js siga siendo JavaScript. Una coma que falta lo deja sin instalar,
   el sitio anda igual con internet, y la prueba de arriba pasa lo mismo porque
   lee la lista con una expresión regular. Ya pasó de verdad: --arreglar
   agregaba una entrada abajo de la última, que no tenía coma. */
let compilaSw = true, porque = '';
try { new Function(sw); } catch (e) { compilaSw = false; porque = e.message; }
chk(compilaSw, 'sw.js es JavaScript válido: ' + porque);

/* Una actualización a medias —la conexión se corta durante la instalación—
   no tiene que poder borrar una copia anterior que sí funcionaba. Esto es
   una comprobación de forma sobre el código, no de comportamiento real
   (simular el Cache API entero es más gestor de lo que hace falta acá):
   confirma que el borrado de cachés viejas está adentro de la condición
   de «versión completa», y que hay una red de contención hacia una
   versión anterior cuando la petición falla. */
chk(/if \(await versionCompleta\(cache\)\) \{[\s\S]{0,200}caches\.delete/.test(sw),
  'activate solo borra cachés viejas si esta versión quedó completa');
chk(/const vieja = await deOtraVersion\(req\.url\);[\s\S]{0,60}if \(vieja\) return vieja;/.test(sw),
  'fetch busca en una versión anterior antes de rendirse');
chk(/await deOtraVersion\(destino\)/.test(sw),
  'y también al mostrar la página de repuesto sin conexión');

console.log(bien + ' bien, ' + mal + ' mal');
process.exit(mal ? 1 : 0);

/*
 * Todo lo que hay que hacer antes de publicar, en un solo comando.
 *   node tools/soltar.js            revisa nomás
 *   node tools/soltar.js --publicar revisa y, si todo está bien, publica
 *
 * Los cuatro pasos que antes se hacían de memoria: regenerar el índice del
 * buscador, revisar la caché, subir VERSION en sw.js, correr las pruebas.
 * Olvidarse de cualquiera de ellos no rompe nada acá; rompe en la máquina de
 * un alumno, después.
 */
'use strict';
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SW = path.join(RAIZ, 'sw.js');
const publicar = process.argv.includes('--publicar');
const problemas = [];

function paso(titulo, fn) {
  process.stdout.write('· ' + titulo.padEnd(34));
  try { console.log(fn() || 'bien'); }
  catch (e) {
    console.log('MAL');
    problemas.push(titulo + '\n' + String(e.stdout || e.stderr || e.message).trim());
  }
}

const correr = (script, args = []) =>
  execFileSync(process.execPath, [path.join(__dirname, script), ...args],
    { encoding: 'utf8', cwd: RAIZ }).trim().split('\n').pop();

paso('índice del buscador', () => correr('generar-indice.js'));
paso('caché sin agujeros', () => correr('revisar-cache.js'));

/* VERSION nueva. sw.js tiene que quedar tocado después que todo lo que guarda:
   si alguien cambió un archivo y no subió VERSION, el service worker sigue
   sirviendo la copia vieja y el cambio no llega a nadie.
   ponytail: se mira la fecha del archivo, no el sitio publicado. Con git
   bastaría comparar contra la última publicación; esto anda desde hoy. */
paso('VERSION al día', () => {
  const texto = fs.readFileSync(SW, 'utf8');
  const version = (texto.match(/const VERSION = '([^']+)'/) || [])[1];
  const cuando = fs.statSync(SW).mtimeMs;
  const nuevos = (texto.match(/const ARCHIVOS = \[([\s\S]*?)\n\];/)[1].match(/'[^']+'/g) || [])
    .map(s => s.slice(1, -1))
    .filter(u => u !== './' && fs.existsSync(path.join(RAIZ, u)))
    .filter(u => fs.statSync(path.join(RAIZ, u)).mtimeMs > cuando);
  if (nuevos.length) {
    throw new Error('cambiaron después de la última VERSION (' + version + '):\n  '
      + nuevos.join('\n  ') + '\nsubí VERSION en sw.js');
  }
  return version;
});

paso('las pruebas', () => correr('probar.js'));

if (problemas.length) {
  console.log('\n' + problemas.join('\n\n'));
  console.log('\nno se publicó nada.');
  process.exit(1);
}

if (!publicar) {
  console.log('\ntodo listo. Para publicar: node tools/soltar.js --publicar');
  process.exit(0);
}

console.log('\npublicando…');
const r = spawnSync('vercel', ['--prod', '--yes'], { cwd: RAIZ, stdio: 'inherit', shell: true });
process.exit(r.status || 0);

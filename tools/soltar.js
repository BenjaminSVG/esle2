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
paso('soluciones del curso', () => correr('generar-soluciones.js'));
paso('caché sin agujeros', () => correr('revisar-cache.js'));

/* VERSION nueva. Si alguien cambia un archivo y no sube VERSION, el service
   worker sigue sirviendo la copia vieja y el cambio no llega a nadie.
   Se compara contra la última publicación —tools/publicado.json, escrito al
   final de este mismo script— y no contra la fecha de sw.js: el índice del
   buscador se regenera unos renglones más arriba, así que sw.js casi nunca es
   el archivo más nuevo aunque VERSION esté perfecta. */
const REGISTRO = path.join(__dirname, 'publicado.json');

function versionActual() {
  return (fs.readFileSync(SW, 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];
}

paso('VERSION al día', () => {
  const version = versionActual();
  if (!fs.existsSync(REGISTRO)) return version + ' (primera publicación con esto)';

  const ultima = JSON.parse(fs.readFileSync(REGISTRO, 'utf8'));
  if (version !== ultima.version) return version + ' (era ' + ultima.version + ')';

  const cambiados = (fs.readFileSync(SW, 'utf8')
    .match(/const ARCHIVOS = \[([\s\S]*?)\n\];/)[1].match(/'[^']+'/g) || [])
    .map(s => s.slice(1, -1))
    .filter(u => u !== './' && fs.existsSync(path.join(RAIZ, u)))
    .filter(u => fs.statSync(path.join(RAIZ, u)).mtimeMs > ultima.cuando);

  if (cambiados.length) {
    throw new Error('cambiaron desde que se publicó ' + version + ':\n  '
      + cambiados.join('\n  ') + '\nsubí VERSION en sw.js');
  }
  return version + ' (nada cambió desde la última publicación)';
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
if (!r.status) {
  fs.writeFileSync(REGISTRO, JSON.stringify(
    { version: versionActual(), cuando: Date.now(), fecha: new Date().toISOString() }, null, 2) + '\n');
  console.log('\npublicado ' + versionActual());
}
process.exit(r.status || 0);

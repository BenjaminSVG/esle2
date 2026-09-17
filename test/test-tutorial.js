/*
 * Prueba del tutorial de la interfaz.
 *
 * Lo que más importa acá no es que el texto esté lindo sino que no mienta: que
 * ningún entorno explique un botón que no tiene, que ninguna captura falte, y
 * que lo que el modelo dice que hay en la pantalla esté de verdad en el HTML
 * de esa página. Un tutorial desactualizado es peor que no tener tutorial.
 *
 *   node test/test-tutorial.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'tutorial.js'));
const { Tutorial } = global;
const { CONTROLES, SECCIONES, ENTORNOS, MEDIDAS } = Tutorial;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);
const ENTORNO_IDS = Object.keys(ENTORNOS);

seccion('Qué entorno es cada página');
comprobar('index.html es el clásico', Tutorial.entornoDe('index.html') === 'clasico');
comprobar('poo.html es POO', Tutorial.entornoDe('/poo.html') === 'poo');
comprobar('bd.html es BD', Tutorial.entornoDe('https://esle2.vercel.app/bd.html') === 'bd');
comprobar('visual.html es Visual', Tutorial.entornoDe('visual.html?x=1') === 'visual');
comprobar('la raíz es el clásico', Tutorial.entornoDe('/') === 'clasico');
comprobar('y cualquier otra cosa también', Tutorial.entornoDe('documentacion.html') === 'clasico');

seccion('El modelo es coherente');
{
  const ids = SECCIONES.map(s => s.id);
  comprobar('no hay dos secciones con el mismo id', new Set(ids).size === ids.length);
  for (const s of SECCIONES) {
    const nombrados = s.controles.concat(
      ...Object.values(s.cambios || {}).map(c => (c.agregar || []).concat(c.quitar || [])));
    for (const id of nombrados) {
      comprobar(`«${s.id}» nombra un control que existe: ${id}`, !!CONTROLES[id]);
    }
    comprobar(`«${s.id}» tiene texto`, typeof s.texto === 'string' && s.texto.length > 40);
    comprobar(`«${s.id}» tiene alt si tiene captura`,
      !Object.keys(s.capturas).length || (typeof s.alt === 'string' && s.alt.length > 10));
    for (const entorno of Object.keys(s.capturas)) {
      comprobar(`«${s.id}» usa un entorno que existe: ${entorno}`, !!ENTORNOS[entorno]);
    }
  }
  for (const id of Object.keys(CONTROLES)) {
    const c = CONTROLES[id];
    comprobar(`«${id}» explica algo`, typeof c.que === 'string' && c.que.length > 25, c.que);
    comprobar(`«${id}» no repite el nombre y nada más`,
      c.que.trim().toLowerCase() !== (c.nombre || '').trim().toLowerCase());
  }
  const usados = new Set();
  for (const s of SECCIONES) {
    for (const entorno of ENTORNO_IDS) {
      if (!s.siempre && !s.capturas[entorno]) continue;
      for (const c of Tutorial.secciones(entorno).find(x => x.id === s.id).controles) usados.add(c.id);
    }
  }
  for (const id of Object.keys(CONTROLES)) {
    comprobar(`«${id}» lo muestra alguna sección`, usados.has(id));
  }
}

seccion('Cada entorno arma su tutorial');
for (const entorno of ENTORNO_IDS) {
  const secs = Tutorial.secciones(entorno);
  comprobar(`${entorno}: tiene secciones`, secs.length >= 12, secs.length);
  const ids = secs.map(s => s.id);
  comprobar(`${entorno}: sin secciones repetidas`, new Set(ids).size === ids.length);
  comprobar(`${entorno}: siempre están los atajos`, ids.includes('atajos'));
  for (const s of secs) {
    comprobar(`${entorno}/${s.id}: tiene controles`, s.controles.length > 0);
    const cids = s.controles.map(c => c.id);
    comprobar(`${entorno}/${s.id}: sin controles repetidos`, new Set(cids).size === cids.length);
    for (const c of s.controles) comprobar(`${entorno}/${s.id}: ${c.id} tiene nombre`, !!c.nombre);
  }
}

seccion('Lo que cada entorno NO tiene');
{
  const controlesDe = entorno => {
    const v = new Set();
    for (const s of Tutorial.secciones(entorno)) for (const c of s.controles) v.add(c.id);
    return v;
  };
  const clasico = controlesDe('clasico');
  const poo = controlesDe('poo');
  const visual = controlesDe('visual');
  const bd = controlesDe('bd');

  comprobar('el clásico graba la ejecución', clasico.has('btnGrabar'));
  comprobar('POO también', poo.has('btnGrabar'));
  comprobar('Visual no graba: no tiene ese botón', !visual.has('btnGrabar'));
  comprobar('BD tampoco', !bd.has('btnGrabar'));
  comprobar('Visual tiene el diseñador', visual.has('btnDisenar'));
  comprobar('y la ventana', visual.has('btnVentana'));
  comprobar('el clásico no tiene diseñador', !clasico.has('btnDisenar'));
  comprobar('BD no tiene modo enfoque', !bd.has('btnEnfoque'));
  comprobar('BD no tiene explorador de archivos', !bd.has('btnExplorador'));
  comprobar('BD tiene SQL a mano', bd.has('sqlRapido'));
  comprobar('BD tiene el esquema', bd.has('esquema'));
  comprobar('POO no tiene plantillas', !poo.has('selPlantillas'));
  comprobar('el clásico sí', clasico.has('selPlantillas'));
  comprobar('POO traduce a dos lenguajes', poo.has('traducirPoo') && !poo.has('traducir'));
  comprobar('Visual no traduce', !visual.has('traducir') && !visual.has('traducirPoo'));
}

seccion('Los botones que nombra están en el HTML de esa página');
/* El modelo se escribe a mano y el HTML cambia; esto los ata. Solo los que se
   llaman como su id: los demás (paneles, menús enteros) no tienen uno. */
for (const entorno of ENTORNO_IDS) {
  const html = fs.readFileSync(path.join(RAIZ, ENTORNOS[entorno].pagina), 'utf8');
  const vistos = new Set();
  for (const s of Tutorial.secciones(entorno)) {
    for (const c of s.controles) {
      if (!/^(btn|sel)[A-Z]/.test(c.id) || vistos.has(c.id)) continue;
      vistos.add(c.id);
      comprobar(`${entorno}: #${c.id} está en ${ENTORNOS[entorno].pagina}`,
        html.includes(`id="${c.id}"`));
    }
  }
}

seccion('Las capturas');
{
  const rutas = Tutorial.capturas();
  comprobar('hay unas cuantas', rutas.length >= 40, rutas.length);
  let total = 0, masPesada = 0;
  for (const ruta of rutas) {
    const archivo = path.join(RAIZ, ruta);
    const hay = fs.existsSync(archivo);
    comprobar('existe ' + ruta, hay);
    if (!hay) continue;
    const peso = fs.statSync(archivo).size;
    total += peso;
    masPesada = Math.max(masPesada, peso);
    comprobar(`${ruta} no es descomunal`, peso <= 160 * 1024, (peso / 1024).toFixed(0) + ' KiB');
    const nombre = ruta.split('/').pop();
    comprobar(`${nombre} tiene medidas`, Array.isArray(MEDIDAS[nombre]) && MEDIDAS[nombre][0] > 0);
  }
  /* Todo esto se baja para que ESLE2 ande sin conexión: es descarga, no
     imágenes que cada uno pide si quiere. */
  comprobar('todas juntas entran en 3 MiB', total <= 3 * 1024 * 1024,
    (total / 1048576).toFixed(2) + ' MiB');
  console.log(`  (${rutas.length} capturas, ${(total / 1048576).toFixed(2)} MiB, ` +
    `la más pesada ${(masPesada / 1024).toFixed(0)} KiB)`);

  /* Al revés: una captura en el disco que ya no usa nadie es peso muerto en
     la caché de todos. */
  const carpeta = path.join(RAIZ, 'img', 'tutorial');
  const usadas = new Set(rutas.map(r => r.split('/').pop()));
  for (const archivo of fs.readdirSync(carpeta)) {
    comprobar(`${archivo} la usa alguna sección`, usadas.has(archivo));
  }
  for (const nombre of Object.keys(MEDIDAS)) {
    comprobar(`las medidas de ${nombre} son de una captura que se usa`, usadas.has(nombre));
  }
}

seccion('Las páginas tienen el botón y los módulos');
for (const entorno of ENTORNO_IDS) {
  const html = fs.readFileSync(path.join(RAIZ, ENTORNOS[entorno].pagina), 'utf8');
  comprobar(`${entorno}: tiene el botón Tutorial`, html.includes('id="btnTutorial"'));
  comprobar(`${entorno}: carga js/tutorial.js`, html.includes('src="js/tutorial.js"'));
  comprobar(`${entorno}: carga js/tutorial-ui.js`, html.includes('src="js/tutorial-ui.js"'));
}

console.log(`\n${ok} bien, ${fallos} mal`);
process.exit(fallos ? 1 : 0);

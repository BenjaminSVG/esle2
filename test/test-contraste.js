/*
 * Contraste de los colores del sitio (WCAG AA: 4.5:1 para texto normal).
 *
 * Los colores viven en dos lados: los de arranque en css/estilo.css y los de
 * cada fondo de la página Diseño en js/diseno.js. Esta prueba los lee de ahí
 * mismo y calcula el contraste, así que si alguien aclara un gris "porque se
 * ve mejor", salta acá y no en la cara de quien no distingue bien los grises.
 *   node test/test-contraste.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

/* js/diseno.js necesita un navegador para cargarse, así que los fondos se leen
   del propio archivo en vez de ejecutarlo. */
function fondosDeDiseno() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'diseno.js'), 'utf8');
  const lista = [];
  const re = /id: '([\w-]+)', nombre: '([^']+)', tema: '(\w+)'[\s\S]*?vars: \{([\s\S]*?)\}/g;
  for (const m of src.matchAll(re)) {
    const vars = {};
    for (const v of m[4].matchAll(/'?([\w-]+)'?:\s*'(#[0-9a-fA-F]{6})'/g)) vars[v[1]] = v[2];
    lista.push({ id: m[1], nombre: m[2], tema: m[3], vars });
  }
  return lista;
}

const MINIMO = 4.5;
let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };

/* ------------------------- cuentas de la norma ------------------------- */
function luminancia(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}
function comprobar(que, texto, fondo) {
  const r = contraste(texto, fondo);
  if (r >= MINIMO) { ok++; return; }
  falla(que, `${texto} sobre ${fondo} da ${r.toFixed(2)}:1 y hace falta ${MINIMO}:1`);
}

/* ---------------------- colores de css/estilo.css ---------------------- */
function variablesDe(bloque) {
  const vars = {};
  for (const m of bloque.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6});/g)) vars[m[1]] = m[2];
  return vars;
}
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'estilo.css'), 'utf8');
const claro = variablesDe(css.slice(css.indexOf(':root {'), css.indexOf('html[data-tema="oscuro"]')));
const oscuro = variablesDe(css.slice(css.indexOf('html[data-tema="oscuro"]'), css.indexOf('* { box-sizing')));

for (const [nombre, v] of [['tema claro', claro], ['tema oscuro', oscuro]]) {
  const fondos = [v.fondo, v['fondo-2'], v.panel, v['panel-2']];
  for (const f of fondos) {
    comprobar(`${nombre}: texto`, v.texto, f);
    comprobar(`${nombre}: texto secundario`, v['texto-2'], f);
    comprobar(`${nombre}: texto tenue`, v.tenue, f);
  }
  comprobar(`${nombre}: acento`, v.acento, v.panel);
  /* El renglón elegido del autocompletado se pinta con el acento suave. */
  comprobar(`${nombre}: sugerencia elegida`, v.texto, v['acento-sua']);
  comprobar(`${nombre}: tipo de la sugerencia elegida`, v['texto-2'], v['acento-sua']);
  comprobar(`${nombre}: etiqueta fácil`, v.ok, v['ok-sua']);
  comprobar(`${nombre}: etiqueta media`, v.aviso, v['aviso-sua']);
  comprobar(`${nombre}: etiqueta avanzada`, v.error, v['error-sua']);
  comprobar(`${nombre}: sugerencia de estilo`, v.acento, v['acento-sua']);
}

/* --------------------- fondos de la página Diseño ---------------------- */
const FONDOS = fondosDeDiseno();
if (FONDOS.length < 8) throw new Error('no pude leer los fondos de js/diseno.js');
for (const fondo of FONDOS) {
  const v = fondo.vars;
  const fondos = [v.fondo, v['fondo-2'], v.panel, v['panel-2']];
  for (const f of fondos) {
    comprobar(`fondo «${fondo.nombre}»: texto`, v.texto, f);
    comprobar(`fondo «${fondo.nombre}»: texto secundario`, v['texto-2'], f);
    comprobar(`fondo «${fondo.nombre}»: texto tenue`, v.tenue, f);
  }
}

/* ------------------ las paletas pensadas para daltonismo ---------------- */
/* Las paletas "de autor" (Monokai, Solarized…) se respetan como son; las que
   ESLE2 ofrece como accesibles sí tienen que cumplir el contraste. */
{
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'diseno.js'), 'utf8');
  const re = /id: '(daltonico-[\w-]+)', nombre: '([^']+)'[\s\S]*?fondo: '(#[0-9a-fA-F]{6})',\s*colores: \{([\s\S]*?)\}/g;
  let encontradas = 0;
  for (const m of src.matchAll(re)) {
    encontradas++;
    for (const c of m[4].matchAll(/(\w+): '(#[0-9a-fA-F]{6})'/g)) {
      comprobar(`paleta «${m[2]}»: ${c[1]}`, c[2], m[3]);
    }
  }
  if (encontradas !== 2) falla('paletas accesibles', `esperaba 2 y encontré ${encontradas}`);
  else ok++;
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay colores que no llegan al contraste mínimo');

/* Modo aula en ESLE2 Visual: el profesor arma la guía y el alumno la abre.
   node v-aula-visual.js [base] */
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:4321';
let ok = 0, mal = 0;
const chk = (c, m) => { if (c) ok++; else { mal++; console.log('  FALLA: ' + m); } };

(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1400, height: 1000 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

  console.log('\nEl profesor');
  await p.goto(BASE + '/visual.html');
  await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelector('[data-vista="curso"], a[href="#curso"]')?.click());
  await p.waitForTimeout(300);

  chk(await p.locator('#btnAula').count() === 1, 'está el botón «Modo aula…»');
  await p.evaluate(() => document.querySelector('#btnAula').click());
  await p.waitForTimeout(500);

  const dlg = p.locator('dialog.dlg-mis[open]');
  chk(await dlg.count() === 1, 'se abre el diálogo');
  chk(await p.inputValue('[data-campo="lenguaje"]') === 'ESLE2 Visual',
    'dice que es de Visual: ' + await p.inputValue('[data-campo="lenguaje"]'));

  /* Sin contar las cabeceras de nivel, que también son <li>. */
  const cuantos = await p.locator('.aula-lista li input[type=checkbox]').count();
  chk(cuantos > 10, 'lista los ejercicios de Visual: ' + cuantos);

  /* El catálogo tiene que ser el de Visual, no el del IDE. */
  chk(await p.evaluate(() => window.CURSO_VISUAL.EJERCICIOS.length) === cuantos,
    'son exactamente los del curso de Visual');
  chk(await p.locator('.aula-lista li .etq').count() === 0,
    'ninguno figura como «tuyo»: en Visual no hay ejercicios propios todavía');

  await p.fill('[data-campo="nombre"]', 'Práctica 3: ventanas');
  await p.fill('[data-campo="mensaje"]', 'Para el viernes.');
  /* Marcar tres. */
  for (let i = 0; i < 3; i++) {
    await p.locator('.aula-lista li input[type=checkbox]').nth(i).check();
  }
  await p.waitForTimeout(400);
  chk(/3/.test(await p.textContent('[data-campo="cuenta"]')),
    'cuenta los elegidos: ' + await p.textContent('[data-campo="cuenta"]'));

  const enlace = await p.inputValue('[data-campo="enlace"]').catch(() => '')
    || await p.locator('[data-campo="enlace"]').inputValue();
  chk(/visual\.html#/.test(enlace), 'el enlace apunta a visual.html: ' + enlace.slice(0, 60));
  chk(enlace.length > 40, 'y lleva la guía adentro (' + enlace.length + ' caracteres)');

  console.log('\nEl alumno');
  const destino = BASE + '/visual.html' + enlace.slice(enlace.indexOf('#'));
  const p2 = await ctx.newPage();
  const errs2 = [];
  p2.on('pageerror', e => errs2.push(String(e)));
  await p2.goto(destino);
  await p2.waitForTimeout(2000);

  chk(await p2.locator('.aula-banner').count() === 1, 've el cartel de la guía');
  chk(/Práctica 3: ventanas/.test(await p2.textContent('.aula-banner')),
    'con el título del profesor');
  chk(/Para el viernes/.test(await p2.textContent('.aula-banner')), 'y su mensaje');
  chk(await p2.locator('#listaEjercicios li').count() === 3,
    'la lista son los tres de la guía: ' + await p2.locator('#listaEjercicios li').count());
  chk(await p2.locator('#filtros').evaluate(e => e.classList.contains('oculto')),
    'los filtros por nivel se esconden');
  chk(await p2.evaluate(() => document.querySelector('#vista-curso').classList.contains('activa')
    || !document.querySelector('#vista-curso').hidden), 'y arranca en el curso');

  /* Un ejercicio de la guía se abre y se corrige como cualquier otro. */
  await p2.locator('#listaEjercicios li').first().click();
  await p2.waitForTimeout(500);
  chk(await p2.locator('#enunciado, .enunciado').count() > 0, 'se puede abrir un ejercicio');

  console.log('\nSalir de la guía');
  await p2.locator('.aula-banner button').click();
  await p2.waitForTimeout(600);
  chk(await p2.locator('.aula-banner').count() === 0, 'se va el cartel');
  chk(await p2.locator('#listaEjercicios li').count() > 10,
    'vuelve el curso entero: ' + await p2.locator('#listaEjercicios li').count());
  chk(!await p2.locator('#filtros').evaluate(e => e.classList.contains('oculto')),
    'y vuelven los filtros');
  chk(!p2.url().includes('#'), 'el enlace de la guía sale de la barra: ' + p2.url().slice(-30));

  chk(errs.length === 0, 'sin errores (profesor): ' + errs.join(' | '));
  chk(errs2.length === 0, 'sin errores (alumno): ' + errs2.join(' | '));

  await nav.close();
  console.log('\n' + ok + ' bien, ' + mal + ' mal');
  process.exit(mal ? 1 : 0);
})();

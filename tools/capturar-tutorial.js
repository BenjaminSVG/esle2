/*
 * Las capturas del tutorial (js/tutorial.js), sacadas de la interfaz de verdad.
 *
 * Por qué un script y no unas capturas hechas a mano: la interfaz cambia, y
 * unas capturas viejas mienten con una seguridad que el texto no tiene. Esto
 * levanta el sitio en un servidor propio, abre cada página, prepara el estado
 * —carga un ejemplo, ejecuta, abre el menú, abre el diálogo— y recorta la
 * región que corresponde. Volver a sacarlas todas es un comando.
 *
 *   node tools/capturar-tutorial.js               saca las 53 capturas
 *   node tools/capturar-tutorial.js --verificar   no escribe nada: solo revisa
 *                                                 que cada región siga estando
 *
 * Necesita Playwright, que NO es dependencia del sitio: esto es herramienta de
 * desarrollo y no va a ARCHIVOS de sw.js. Si no está en node_modules, se le
 * puede pasar de dónde sacarlo:
 *
 *   node tools/capturar-tutorial.js --playwright C:/ruta/a/node_modules
 *
 * Al terminar reescribe el bloque MEDIDAS de js/tutorial.js con el tamaño real
 * de cada imagen, para que el navegador reserve el lugar y el cuadro no salte.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'img', 'tutorial');
const MODELO = path.join(RAIZ, 'js', 'tutorial.js');
const SOLO_VERIFICAR = process.argv.includes('--verificar');

/* ------------------------------------------------------------------ */
/* Playwright, esté donde esté                                          */
/* ------------------------------------------------------------------ */
function cargarPlaywright() {
  const i = process.argv.indexOf('--playwright');
  const extra = i >= 0 ? process.argv[i + 1] : process.env.ESLE2_PLAYWRIGHT;
  for (const donde of [null, extra]) {
    try {
      return require(donde ? path.join(donde, 'playwright') : 'playwright');
    } catch (e) { /* probamos el siguiente */ }
  }
  console.error('No encontré Playwright. Instalalo (npm i -D playwright) o pasale\n' +
    'la carpeta con --playwright <ruta a node_modules>.');
  process.exit(2);
}

/* ------------------------------------------------------------------ */
/* Un servidor estático, sin dependencias                               */
/* ------------------------------------------------------------------ */
const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json'
};
function servir() {
  const s = http.createServer((pedido, respuesta) => {
    const url = decodeURIComponent(pedido.url.split('?')[0]);
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const archivo = path.join(RAIZ, rel);
    /* Que nadie salga de la carpeta del proyecto, ni por accidente. */
    if (!archivo.startsWith(RAIZ) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) {
      respuesta.writeHead(404); respuesta.end('no está'); return;
    }
    respuesta.writeHead(200, { 'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream' });
    fs.createReadStream(archivo).pipe(respuesta);
  });
  return new Promise(listo => s.listen(0, '127.0.0.1', () => listo({
    base: 'http://127.0.0.1:' + s.address().port,
    cerrar: () => new Promise(f => s.close(f))
  })));
}

/* ------------------------------------------------------------------ */
/* Programas de muestra                                                 */
/* ------------------------------------------------------------------ */
/* Cortos a propósito: la captura tiene que entrar en el panel sin achicar la
   letra, y lo que se está mostrando es el panel, no el programa. */
const SALUDO = [
  'var',
  '   nombre : cadena',
  '   i : numerico',
  'inicio',
  '   nombre = "Ana"',
  '   imprimir ("Hola, ", nombre, "!\\n")',
  '',
  '   desde i = 1 hasta 3',
  '   {',
  '      imprimir ("Vuelta ", i, "\\n")',
  '   }',
  'fin',
  ''].join('\n');

const DIBUJO = [
  'var',
  '   i : numerico',
  'inicio',
  '   dibujar_rectangulo (20, 20, 140, 90, 9)',
  '   dibujar_circulo (200, 70, 45, 14)',
  '   desde i = 0 hasta 6',
  '   {',
  '      dibujar_linea (20, 130 + i * 8, 300, 130 + i * 8, 10)',
  '   }',
  'fin',
  ''].join('\n');

/* ------------------------------------------------------------------ */
/* Manitos                                                             */
/* ------------------------------------------------------------------ */
const escribir = (pag, codigo) => pag.evaluate(c => {
  document.querySelector('.CodeMirror').CodeMirror.setValue(c);
}, codigo);

const ejemplo = async (pag, patron) => {
  await pag.evaluate(p => {
    const sel = document.getElementById('selEjemplos');
    const re = new RegExp(p, 'i');
    const op = [...sel.options].find(o => o.value !== '' && re.test(o.textContent));
    sel.value = (op || [...sel.options].find(o => o.value !== '')).value;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, patron);
  await pag.waitForTimeout(150);
};

/* Ejecutar y esperar a que termine de verdad: el botón Detener se esconde
   recién cuando el programa terminó, así que eso es lo que se espera —y no
   un tiempo fijo, que en una máquina cargada se queda corto. */
async function correr(pag) {
  await pag.click('#btnEjecutar');
  await pag.waitForFunction(
    () => document.getElementById('btnDetener').classList.contains('oculto'),
    null, { timeout: 15000 });
  await pag.waitForTimeout(120);
}

/* Abrir un menú <details> por su botón, como lo abriría una persona. */
async function abrirMenu(pag, id) {
  await pag.click(`${id} > summary`);
  await pag.waitForSelector(`${id}[open] .menu-caja`, { state: 'visible' });
  await pag.waitForTimeout(120);
}
const cerrarMenus = pag => pag.evaluate(() =>
  document.querySelectorAll('details.menu[open]').forEach(d => { d.open = false; }));

/* Una opción de un menú: abrir el menú y tocarla. */
async function porMenu(pag, menu, boton, espera) {
  await abrirMenu(pag, menu);
  await pag.click(boton);
  if (espera) await pag.waitForSelector(espera, { state: 'visible' });
  await pag.waitForTimeout(250);
}

/* La caja de un menú abierto cae fuera del rectángulo del <details>, así que
   la región es la unión de los dos. */
async function region(pag, selectores) {
  const cajas = [];
  for (const sel of selectores) {
    const caja = await pag.locator(sel).first().boundingBox();
    if (!caja) throw new Error('no encontré ' + sel);
    cajas.push(caja);
  }
  const x = Math.min(...cajas.map(c => c.x)) - 6;
  const y = Math.min(...cajas.map(c => c.y)) - 6;
  const x2 = Math.max(...cajas.map(c => c.x + c.width)) + 6;
  const y2 = Math.max(...cajas.map(c => c.y + c.height)) + 6;
  const v = pag.viewportSize();
  return {
    x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)),
    width: Math.round(Math.min(x2, v.width) - Math.max(0, x)),
    height: Math.round(Math.min(y2, v.height) - Math.max(0, y))
  };
}

/* ------------------------------------------------------------------ */
/* Qué se captura                                                      */
/* ------------------------------------------------------------------ */
/* `union` significa recortar la unión de varios elementos (los menús);
   `donde` a secas, recortar ese elemento. `antes` deja la pantalla como
   tiene que salir en la foto. */
const PLAN = [
  /* ------------------------------ clásico ---------------------------- */
  { pagina: 'index.html', archivo: 'barra-clasico.png', donde: '.barra' },
  { pagina: 'index.html', archivo: 'herramientas-clasico.png', donde: '.herramientas',
    antes: p => escribir(p, SALUDO) },
  { pagina: 'index.html', archivo: 'editor-clasico.png', donde: '.panel.editor',
    antes: p => escribir(p, SALUDO) },
  { pagina: 'index.html', archivo: 'entrada.png', donde: '[data-panel="entrada"]',
    antes: p => p.fill('#entrada', 'Ana\n7\n9') },
  { pagina: 'index.html', archivo: 'salida-clasico.png', donde: '[data-panel="salida"]',
    antes: async p => { await escribir(p, SALUDO); await correr(p); } },
  { pagina: 'index.html', archivo: 'lienzo.png', donde: '#panelLienzo',
    antes: async p => { await escribir(p, DIBUJO); await correr(p); } },
  { pagina: 'index.html', archivo: 'pausa.png', donde: '#vista-ide',
    antes: async p => {
      await escribir(p, SALUDO);
      await p.click('#btnDepurar');
      await p.waitForSelector('#btnPaso:not(.oculto)');
      await p.click('#btnPaso'); await p.click('#btnPaso');
      await p.waitForTimeout(300);
    } },
  { pagina: 'index.html', archivo: 'menu-archivo-clasico.png',
    union: ['#menuArchivo > summary', '#menuArchivo .menu-caja'],
    antes: p => abrirMenu(p, '#menuArchivo') },
  { pagina: 'index.html', archivo: 'menu-ver-clasico.png',
    union: ['#menuVer > summary', '#menuVer .menu-caja'],
    antes: p => abrirMenu(p, '#menuVer') },
  { pagina: 'index.html', archivo: 'menu-traducir-clasico.png',
    union: ['#menuTraducir > summary', '#menuTraducir .menu-caja'],
    antes: p => abrirMenu(p, '#menuTraducir') },
  { pagina: 'index.html', archivo: 'explorador.png', donde: '#panelExplorador',
    antes: async p => {
      p.on('dialog', d => d.accept('notas.sl'));
      await porMenu(p, '#menuVer', '#btnExplorador');
      await cerrarMenus(p);
      await p.click('#expNuevo');
      await p.waitForTimeout(300);
    } },
  { pagina: 'index.html', archivo: 'ejercicio.png', donde: '#bannerEjercicio',
    antes: async p => {
      await p.click('[data-vista="curso"]');
      await p.click('#listaEjercicios li:first-child');
      await p.waitForTimeout(200);
      await p.click('#detalleEjercicio .btn.primario');
      await p.waitForSelector('#bannerEjercicio:not(.oculto)');
      await p.waitForTimeout(250);
    } },
  { pagina: 'index.html', archivo: 'curso-clasico.png', donde: '#vista-curso',
    antes: async p => {
      await p.click('[data-vista="curso"]');
      await p.click('#listaEjercicios li:first-child');
      await p.waitForTimeout(300);
    } },
  { pagina: 'index.html', archivo: 'buscador.png', donde: '.paleta-caja',
    antes: async p => {
      await p.click('#btnBuscar');
      await p.waitForSelector('.paleta-caja', { state: 'visible' });
      await p.keyboard.type('imprimir');
      await p.waitForTimeout(300);
    } },
  { pagina: 'index.html', archivo: 'dlg-archivos.png', donde: '#dlgArchivos',
    antes: p => porMenu(p, '#menuArchivo', '#btnArchivos', '#dlgArchivos[open]') },
  { pagina: 'index.html', archivo: 'dlg-traduccion.png', donde: '#dlgTraduccion',
    antes: async p => {
      await escribir(p, SALUDO);
      await porMenu(p, '#menuTraducir', '#btnTraducir', '#dlgTraduccion[open]');
    } },
  { pagina: 'index.html', archivo: 'dlg-diagrama.png', donde: '#dlgDiagrama',
    antes: async p => {
      await escribir(p, SALUDO);
      await porMenu(p, '#menuVer', '#btnDiagrama', '#dlgDiagrama[open]');
      await p.waitForTimeout(300);
    } },
  { pagina: 'index.html', archivo: 'dlg-editor-diagrama.png', donde: '#dlgEditorDiagrama',
    antes: async p => {
      await escribir(p, SALUDO);
      await porMenu(p, '#menuVer', '#btnEditorDiagrama', '#dlgEditorDiagrama[open]');
      await p.click('#deTraer');
      await p.waitForTimeout(400);
    } },
  { pagina: 'index.html', archivo: 'dlg-escritorio.png', donde: '#dlgEscritorio',
    antes: async p => {
      await escribir(p, SALUDO);
      await porMenu(p, '#menuVer', '#btnEscritorio', '#dlgEscritorio[open]');
      await p.waitForTimeout(400);
    } },
  { pagina: 'index.html', archivo: 'dlg-memoria.png', donde: '#dlgMemoria',
    antes: async p => {
      await escribir(p, SALUDO);
      await porMenu(p, '#menuVer', '#btnMemoria', '#dlgMemoria[open]');
      await p.waitForTimeout(400);
      await p.click('#memAdelante'); await p.click('#memAdelante');
      await p.waitForTimeout(250);
    } },
  { pagina: 'index.html', archivo: 'dlg-historial.png', donde: '#dlgHistorial',
    antes: async p => {
      await escribir(p, SALUDO);
      await correr(p);
      await escribir(p, SALUDO.replace('"Ana"', '"Beto"'));
      await correr(p);
      await porMenu(p, '#menuVer', '#btnHistorial', '#dlgHistorial[open]');
      await p.click('#hisLista li:first-child');
      await p.waitForTimeout(350);
    } },

  /* -------------------------------- POO ------------------------------ */
  { pagina: 'poo.html', archivo: 'barra-poo.png', donde: '.barra' },
  { pagina: 'poo.html', archivo: 'herramientas-poo.png', donde: '.herramientas',
    antes: p => ejemplo(p, '.') },
  { pagina: 'poo.html', archivo: 'editor-poo.png', donde: '.panel.editor',
    antes: p => ejemplo(p, '.') },
  { pagina: 'poo.html', archivo: 'salida-poo.png', donde: '[data-panel="salida"]',
    antes: async p => { await ejemplo(p, '.'); await correr(p); } },
  { pagina: 'poo.html', archivo: 'menu-archivo-poo.png',
    union: ['#menuArchivo > summary', '#menuArchivo .menu-caja'],
    antes: p => abrirMenu(p, '#menuArchivo') },
  { pagina: 'poo.html', archivo: 'menu-ver-poo.png',
    union: ['#menuVer > summary', '#menuVer .menu-caja'],
    antes: p => abrirMenu(p, '#menuVer') },
  { pagina: 'poo.html', archivo: 'menu-traducir-poo.png',
    union: ['#menuTraducir > summary', '#menuTraducir .menu-caja'],
    antes: p => abrirMenu(p, '#menuTraducir') },
  { pagina: 'poo.html', archivo: 'curso-poo.png', donde: '#vista-curso',
    antes: async p => {
      await p.click('[data-vista="curso"]');
      await p.click('#listaEjercicios li:first-child');
      await p.waitForTimeout(300);
    } },

  /* ------------------------------ Visual ----------------------------- */
  { pagina: 'visual.html', archivo: 'barra-visual.png', donde: '.barra' },
  { pagina: 'visual.html', archivo: 'herramientas-visual.png', donde: '.herramientas',
    antes: p => ejemplo(p, 'salud') },
  { pagina: 'visual.html', archivo: 'editor-visual.png', donde: '.panel.editor',
    antes: p => ejemplo(p, 'salud') },
  { pagina: 'visual.html', archivo: 'menu-archivo-visual.png',
    union: ['#menuArchivo > summary', '#menuArchivo .menu-caja'],
    antes: p => abrirMenu(p, '#menuArchivo') },
  { pagina: 'visual.html', archivo: 'menu-ver-visual.png',
    union: ['#menuVer > summary', '#menuVer .menu-caja'],
    antes: p => abrirMenu(p, '#menuVer') },
  { pagina: 'visual.html', archivo: 'menu-insertar.png',
    union: ['#menuInsertar > summary', '#menuInsertar .menu-caja'],
    antes: p => abrirMenu(p, '#menuInsertar') },
  /* La ventana se abre sola al ejecutar; el programa queda esperando eventos,
     así que acá no se espera a que termine. */
  { pagina: 'visual.html', archivo: 'ventana-visual.png', donde: '#dlgVentana',
    antes: async p => {
      await ejemplo(p, 'salud');
      await p.click('#btnEjecutar');
      await p.waitForSelector('#dlgVentana[open]');
      await p.waitForTimeout(500);
    } },
  { pagina: 'visual.html', archivo: 'controles-visual.png', donde: '[data-panel="controles"]',
    antes: async p => {
      await ejemplo(p, 'salud');
      await p.click('#btnEjecutar');
      await p.waitForSelector('#dlgVentana[open]');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(300);
      /* Con un control elegido: el panel de propiedades vacío no muestra
         para qué sirve la mitad del panel. */
      await p.click('#arbol .hijo');
      await p.waitForTimeout(300);
    } },
  { pagina: 'visual.html', archivo: 'salida-visual.png', donde: '[data-panel="salida"]',
    antes: async p => {
      await ejemplo(p, 'salud');
      await p.click('#btnEjecutar');
      await p.waitForSelector('#dlgVentana[open]');
      await p.keyboard.press('Escape');
      await p.waitForTimeout(400);
    } },
  { pagina: 'visual.html', archivo: 'curso-visual.png', donde: '#vista-curso',
    antes: async p => {
      await p.click('[data-vista="curso"]');
      await p.click('#listaEjercicios li:first-child');
      await p.waitForTimeout(300);
    } },

  /* -------------------------------- BD ------------------------------- */
  { pagina: 'bd.html', archivo: 'barra-bd.png', donde: '.barra' },
  { pagina: 'bd.html', archivo: 'herramientas-bd.png', donde: '.herramientas',
    antes: p => ejemplo(p, '.') },
  { pagina: 'bd.html', archivo: 'editor-bd.png', donde: '.panel.editor',
    antes: p => ejemplo(p, '.') },
  { pagina: 'bd.html', archivo: 'salida-bd.png', donde: '[data-panel="salida"]',
    antes: async p => { await ejemplo(p, '.'); await correr(p); } },
  { pagina: 'bd.html', archivo: 'esquema-bd.png', donde: '#panelEsquema',
    antes: async p => { await ejemplo(p, '.'); await correr(p); } },
  { pagina: 'bd.html', archivo: 'sql-rapido.png', donde: '[data-panel="rapida"]',
    antes: async p => {
      await ejemplo(p, '.');
      await correr(p);
      await p.fill('#sqlRapido', 'SELECCIONAR * DE alumnos ORDENAR POR nota DESCENDENTE');
      await p.click('#btnCorrerSQL');
      await p.waitForTimeout(400);
    } },
  { pagina: 'bd.html', archivo: 'menu-archivo-bd.png',
    union: ['#menuArchivo > summary', '#menuArchivo .menu-caja'],
    antes: p => abrirMenu(p, '#menuArchivo') },
  { pagina: 'bd.html', archivo: 'menu-base.png',
    union: ['#menuBase > summary', '#menuBase .menu-caja'],
    antes: p => abrirMenu(p, '#menuBase') },
  { pagina: 'bd.html', archivo: 'menu-exportar.png',
    union: ['#menuExportar > summary', '#menuExportar .menu-caja'],
    antes: p => abrirMenu(p, '#menuExportar') },
  { pagina: 'bd.html', archivo: 'menu-ver-bd.png',
    union: ['#menuVer > summary', '#menuVer .menu-caja'],
    antes: p => abrirMenu(p, '#menuVer') },
  { pagina: 'bd.html', archivo: 'dlg-exportar-bd.png', donde: '#dlgExportar',
    antes: async p => {
      await porMenu(p, '#menuBase', '#btnEjemploBase');
      await p.waitForTimeout(400);
      await porMenu(p, '#menuExportar', '#btnSQLite', '#dlgExportar[open]');
      await p.waitForTimeout(300);
    } },
  { pagina: 'bd.html', archivo: 'dlg-diagrama-bd.png', donde: '#dlgDiagramaBD',
    antes: async p => {
      await porMenu(p, '#menuBase', '#btnEjemploBase');
      await p.waitForTimeout(400);
      await porMenu(p, '#menuBase', '#btnDiagramaBD', '#dlgDiagramaBD[open]');
      await p.waitForTimeout(400);
    } },
  { pagina: 'bd.html', archivo: 'dlg-editor-bd.png', donde: '#dlgEditorBD',
    antes: async p => {
      await porMenu(p, '#menuBase', '#btnEjemploBase');
      await p.waitForTimeout(400);
      await porMenu(p, '#menuBase', '#btnEditorBD', '#dlgEditorBD[open]');
      await p.click('#btnTraerBaseBD');
      await p.waitForTimeout(500);
    } },
  { pagina: 'bd.html', archivo: 'curso-bd.png', donde: '#vista-curso',
    antes: async p => {
      await p.click('[data-vista="curso"]');
      await p.click('#listaEjerciciosBD li:first-child');
      await p.waitForTimeout(300);
    } }
];

/* ------------------------------------------------------------------ */
/* Las medidas, de vuelta al modelo                                     */
/* ------------------------------------------------------------------ */
function guardarMedidas(medidas) {
  const texto = fs.readFileSync(MODELO, 'utf8');
  const salto = texto.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const filas = Object.keys(medidas).sort()
    .map(a => `    '${a}': [${medidas[a][0]}, ${medidas[a][1]}],`).join(salto);
  const nuevo = texto.replace(
    /(\/\* capturas:inicio \*\/)[\s\S]*?(\/\* capturas:fin \*\/)/,
    `$1${salto}${filas}${salto}    $2`);
  if (nuevo === texto) throw new Error('no encontré las marcas capturas:inicio/fin en js/tutorial.js');
  fs.writeFileSync(MODELO, nuevo);
}

/* ------------------------------------------------------------------ */
(async () => {
  const { chromium } = cargarPlaywright();

  /* Lo que el modelo dice que necesita, para comparar con lo que sale de acá. */
  global.window = global;
  require(MODELO);
  const pedidas = new Set(global.Tutorial.capturas().map(r => r.split('/').pop()));
  const planeadas = new Set(PLAN.map(c => c.archivo));
  const sinPlan = [...pedidas].filter(a => !planeadas.has(a));
  const sinUsar = [...planeadas].filter(a => !pedidas.has(a));

  if (!SOLO_VERIFICAR) fs.mkdirSync(DESTINO, { recursive: true });
  const sitio = await servir();
  const nav = await chromium.launch();
  /* Una ventana limpia por captura. Comparten contexto y lo que una deja
     guardado —el programa, la entrada de datos, la base— sale en la foto de
     la siguiente, y el resultado depende del orden en que se sacaron. */
  async function ventana() {
    const ctx = await nav.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      /* Sin service worker: si no, sirve la copia vieja de los .js y las
         capturas salen de una versión del sitio que ya no existe. */
      serviceWorkers: 'block'
    });
    /* La bienvenida tapa media pantalla y es de una sola vez: acá estorba. */
    await ctx.addInitScript(() => {
      try { localStorage.setItem('esle2_bienvenida', '1'); } catch (e) { /* nada */ }
    });
    return ctx;
  }

  const medidas = {};
  let bien = 0; const malas = [];

  for (const paso of PLAN) {
    const ctx = await ventana();
    const pag = await ctx.newPage();
    const errores = [];
    pag.on('pageerror', e => errores.push(e.message));
    try {
      await pag.goto(sitio.base + '/' + paso.pagina, { waitUntil: 'networkidle' });
      await pag.waitForTimeout(250);
      if (paso.antes) await paso.antes(pag);

      const destino = path.join(DESTINO, paso.archivo);
      let caja;
      if (paso.union) {
        caja = await region(pag, paso.union);
        if (!SOLO_VERIFICAR) await pag.screenshot({ path: destino, clip: caja });
      } else {
        const el = pag.locator(paso.donde).first();
        caja = await el.boundingBox();
        if (!caja) throw new Error('no se ve ' + paso.donde);
        if (!SOLO_VERIFICAR) await el.screenshot({ path: destino });
      }
      if (caja.width < 40 || caja.height < 20) throw new Error('quedó demasiado chica');
      medidas[paso.archivo] = [Math.round(caja.width), Math.round(caja.height)];
      if (errores.length) throw new Error('la página tiró errores: ' + errores.join(' | '));
      bien++;
      console.log((SOLO_VERIFICAR ? 'ok   ' : 'saqué') + '  ' + paso.archivo +
        '  ' + medidas[paso.archivo].join('×'));
    } catch (e) {
      malas.push([paso.archivo, e.message]);
      console.error('FALLA  ' + paso.archivo + ': ' + e.message);
    }
    await pag.close();
    await ctx.close();
  }

  await nav.close();
  await sitio.cerrar();

  for (const a of sinPlan) console.error('FALTA  ' + a + ': js/tutorial.js la pide y el plan no la saca');
  for (const a of sinUsar) console.error('SOBRA  ' + a + ': el plan la saca y nadie la usa');

  if (!SOLO_VERIFICAR && !malas.length) {
    guardarMedidas(medidas);
    const pesos = Object.keys(medidas).map(a => fs.statSync(path.join(DESTINO, a)).size);
    const total = pesos.reduce((a, b) => a + b, 0);
    console.log(`\n${bien} capturas, ${(total / 1048576).toFixed(2)} MiB en total, ` +
      `la más pesada ${(Math.max(...pesos) / 1024).toFixed(0)} KiB`);
    console.log('medidas escritas en js/tutorial.js; acordate de subir VERSION en sw.js');
  }

  const mal = malas.length + sinPlan.length + sinUsar.length;
  console.log(mal ? `\n${mal} problemas` : '\ntodo en orden');
  process.exit(mal ? 1 : 0);
})();

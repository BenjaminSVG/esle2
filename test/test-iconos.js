/*
 * Prueba de los iconos y de la barra de herramientas agrupada en menús.
 *
 * Lo que se puede romper sin que se note: un botón que pide un icono que no
 * existe (queda sin dibujo), y —el peor— un botón dentro de un menú que
 * ningún módulo escucha, o sea que no hace nada al tocarlo. Eso pasó de
 * verdad al agrupar la barra, así que acá se verifica.
 *   node test/test-iconos.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

global.window = global;
require(path.join(RAIZ, 'js', 'iconos.js'));
const { Iconos } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

/* Todas las páginas del sitio, para que ninguna quede sin revisar. */
const PAGINAS = fs.readdirSync(RAIZ)
  .filter(f => f.endsWith('.html')).sort();
/* Dónde puede estar cableado un botón. */
/* Todos los módulos, no una lista escrita a mano: una lista a mano se queda
   vieja en silencio y entonces este control deja de controlar nada. Pasó al
   agregar la prueba de escritorio: su botón parecía sin cablear porque el
   módulo nuevo no estaba en la lista. */
const MODULOS = fs.readdirSync(path.join(RAIZ, 'js'))
  .filter(f => f.endsWith('.js')).map(f => 'js/' + f).sort();
const CODIGO = MODULOS.map(leer).join('\n');

/* ------------------------------ el set --------------------------------- */
{
  comprobar('hay iconos suficientes', Iconos.NOMBRES.length >= 20, String(Iconos.NOMBRES.length));
  for (const n of Iconos.NOMBRES) {
    const d = Iconos.D[n];
    comprobar(`«${n}» dibuja algo`, /<(path|circle|rect)/.test(d), d.slice(0, 40));
    /* Los trazos mezclan comandos absolutos y relativos, así que medir la caja
       exacta pediría un intérprete de paths. Lo que sí se puede exigir: que no
       haya números rotos y que ninguna coordenada absoluta se salga del 24. */
    comprobar(`«${n}» no tiene números rotos`, !/NaN|undefined|,,/.test(d), d.slice(0, 60));
    const absolutos = (d.match(/[MLHV][ ]?-?\d+(?:\.\d+)?(?:[ ,]-?\d+(?:\.\d+)?)?/g) || [])
      .join(' ').match(/-?\d+(?:\.\d+)?/g) || [];
    comprobar(`«${n}» entra en la grilla de 24`,
      absolutos.map(Number).every(x => x >= -0.5 && x <= 24.5), absolutos.join());
  }
  const svg = Iconos.svg('ejecutar');
  comprobar('el SVG toma el color del texto', svg.includes('stroke="currentColor"'));
  comprobar('y no lo lee un lector de pantalla', svg.includes('aria-hidden="true"'));
  comprobar('un icono que no existe no devuelve nada', Iconos.svg('inventado') === '');
}

/* --------------------- cada botón pide un icono real -------------------- */
{
  let pedidos = 0;
  for (const p of PAGINAS) {
    const html = leer(p);
    for (const m of html.matchAll(/data-ic="([\w-]+)"/g)) {
      pedidos++;
      comprobar(`${p} pide el icono «${m[1]}»`, !!Iconos.D[m[1]], 'no existe');
    }
  }
  comprobar('los iconos se usan de verdad', pedidos >= 25, String(pedidos));
}

/* ---------------- la barra agrupada, y sin botones muertos -------------- */
for (const p of ['index.html', 'poo.html']) {
  const html = leer(p);
  const barra = html.slice(html.indexOf('<div class="herramientas">'), html.indexOf('<div id="bannerEjercicio"'));

  const menus = [...barra.matchAll(/<details class="menu" id="(\w+)"/g)].map(m => m[1]);
  comprobar(`${p}: la barra tiene tres menús`, menus.length === 3, menus.join());
  for (const m of menus)
    comprobar(`${p}: el menú ${m} tiene su resumen con icono`,
      new RegExp('id="' + m + '"[\\s\\S]{0,120}<summary class="btn" data-ic=').test(barra));

  /* Botones sueltos: solo los de ejecución. Todo lo demás vive en un menú. */
  const sueltos = [...barra.replace(/<div class="menu-caja">[\s\S]*?<\/div>/g, '')
    .matchAll(/<button[^>]*id="(\w+)"/g)].map(m => m[1]);
  comprobar(`${p}: fuera de los menús solo quedan los botones de ejecución`,
    sueltos.every(id => ['btnEjecutar', 'btnCompilar', 'btnDepurar', 'btnGrabar',
                         'btnDetener', 'btnPaso', 'btnContinuar'].includes(id)),
    sueltos.join());
  comprobar(`${p}: y son siete`, sueltos.length === 7, String(sueltos.length));

  /* Ningún botón puede quedar sin nadie que lo escuche. */
  const ids = [...barra.matchAll(/<(?:button|select|input)[^>]*id="(\w+)"/g)].map(m => m[1]);
  for (const id of ids) {
    if (id === 'archivo') continue;                    // lo dispara btnAbrir
    comprobar(`${p}: «${id}» está cableado`,
      CODIGO.includes(`#${id}`) || CODIGO.includes(`getElementById('${id}')`),
      'ningún módulo lo escucha');
  }
  /* Lo que se ve de un vistazo: los seis de ejecución y los tres menús. */
  comprobar(`${p}: la barra quedó corta`, sueltos.length + menus.length <= 10,
    `${sueltos.length} botones + ${menus.length} menús`);
}

/* ------------------------ iconos en la cabecera ------------------------- */
/* vivo.html queda afuera de esta parte a propósito: es la página de mirar
   una transmisión, no tiene menús ni buscador, y traerle el índice del
   buscador (74 KB) para ver el programa de otro sería gastar los datos de
   quien mira. La cabecera, la marca y las pestañas sí se le exigen igual. */
const CON_MENUS = PAGINAS.filter(p => p !== 'vivo.html');
for (const p of CON_MENUS) {
  const html = leer(p);
  comprobar(`${p}: el botón de instalar tiene icono`, /id="btnInstalar"[^>]*data-ic="instalar"/.test(html));
  comprobar(`${p}: el de buscar también`, /id="btnBuscar"[^>]*data-ic="buscar"/.test(html));
  comprobar(`${p}: carga js/iconos.js`, html.includes('src="js/iconos.js"'));
  comprobar(`${p}: carga js/menus.js`, html.includes('src="js/menus.js"'));
}

/* -------------------- la misma cabecera en las seis --------------------- */
{
  /* Es una sola barra repetida en seis archivos: si una se desalinea no lo
     avisa nadie. Se exige la misma estructura y los mismos controles. */
  const css = leer('css/estilo.css');
  comprobar('la cabecera define un alto único para lo que se pulsa',
    /\.barra \{[\s\S]*?--alto-ctrl: \d+px;/.test(css));
  for (const sel of ['.pest', '.btn-buscar', '.btn-tema']) {
    const bloque = new RegExp('\\' + sel + ' \\{[^}]*\\}', 'm').exec(css);
    comprobar(`${sel} usa ese alto`, !!bloque && /var\(--alto-ctrl/.test(bloque[0]),
      bloque ? bloque[0].slice(0, 80) : 'no está');
  }
  comprobar('las pestañas no se parten en dos líneas',
    /\.pest \{[^}]*white-space: nowrap/.test(css));
  comprobar('ni el nombre del sitio', /\.marca h1 \{[^}]*white-space: nowrap/.test(css));
  comprobar('y si no entran, se desplazan de costado',
    /\.pestanas \{[^}]*overflow-x: auto/.test(css));

  for (const p of PAGINAS) {
    const html = leer(p);
    comprobar(`${p}: tiene la cabecera del sitio`, html.includes('<header class="barra">'));
    comprobar(`${p}: con la marca y su logo de 30 px`,
      /<img class="logo" src="img\/logo(-poo)?\.svg" alt="" width="30" height="30">/.test(html));
    comprobar(`${p}: con las pestañas`, /<nav class="pestanas"/.test(html));
    comprobar(`${p}: y las acciones agrupadas`, html.includes('<div class="barra-acciones">'));

    /* Los controles de la derecha van adentro del grupo, no sueltos. */
    const grupo = html.slice(html.indexOf('<div class="barra-acciones">'), html.indexOf('</header>'));
    const suyos = p === 'vivo.html' ? ['btnTema'] : ['btnInstalar', 'btnBuscar', 'btnTema'];
    for (const id of suyos)
      comprobar(`${p}: «${id}» está adentro del grupo de acciones`, grupo.includes('id="' + id + '"'));
  }
}

/* ------------------- los menús que js/menus.js maneja ------------------- */
{
  /* Un <details> de menú con una clase que menus.js no conoce sigue abriendo y
     cerrando —eso lo hace el navegador—, pero deja de cerrarse al elegir algo,
     al tocar afuera o con Escape, y no cierra a los otros. Pasó con los de
     ESLE2 Visual, que son «details.vs-m». */
  const menus = leer('js/menus.js');
  const selector = (/const SELECTOR = '([^']+)'/.exec(menus) || [])[1] || '';
  const clases = selector.split(',').map(s => s.trim().replace('details.', ''));
  comprobar('js/menus.js declara qué menús maneja', clases.length >= 1, selector);

  for (const p of PAGINAS.concat(['visual.html'])) {
    const html = leer(p);
    const usadas = new Set();
    for (const m of html.matchAll(/<details class="([\w-]+)/g)) usadas.add(m[1]);
    for (const c of usadas)
      comprobar(`${p}: los menús «${c}» los maneja js/menus.js`, clases.includes(c),
        'menus.js conoce: ' + clases.join(', '));
  }
}

/* ------------------- los iconos de ESLE2 Visual ------------------------- */
/* El menú «Insertar» y el árbol de controles piden el icono por el nombre del
   control o de la orden, sin acentos. Si falta uno queda la letra vieja y no
   se nota hasta que alguien mira el menú, así que se verifica acá. */
{
  const app = leer('js/visual-app.js');
  const modulo = leer('js/iconos-visual.js');
  const clave = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const controles = Object.keys(JSON.parse('{' +
    /const GLIFOS = \{([\s\S]*?)\};/.exec(app)[1]
      .replace(/(\w+):/g, '"$1":').replace(/'/g, '"').replace(/,\s*$/, '') + '}'));
  const dibujos = Array.from(
    /const DIBUJO = \[([\s\S]*?)\];/.exec(app)[1].matchAll(/\['([^']+)'/g), m => m[1]);

  comprobar('hay siete controles y diez órdenes de dibujo',
    controles.length === 7 && dibujos.length === 10,
    controles.length + ' y ' + dibujos.length);

  for (const n of controles.concat(dibujos))
    comprobar(`el icono de «${n}» existe`,
      new RegExp('\\b' + clave(n) + ': "<svg').test(modulo));

  /* Dos tintas: el trazo sigue al texto y el hueco al fondo del recuadro. */
  comprobar('los iconos usan currentColor', modulo.includes('currentColor'));
  comprobar('y var(--hueco) para los huecos', modulo.includes('var(--hueco)'));
  comprobar('el CSS define --hueco', leer('css/visual.css').includes('--hueco:'));
  comprobar('ningún icono trae la firma C2PA', !modulo.includes('c2pa'));
  comprobar('ni el fondo blanco original', !/rgb\(255, ?255, ?255\)/.test(modulo));
}

/* ------------- el botón que abre la ventana del programa ---------------- */
/* La ventana dejó de ser un panel fijo: vive en un diálogo que abre este
   botón. Si el diálogo o el botón se renombran, la página deja de mostrar la
   ventana y no lo dice; por eso están atados acá. */
{
  const html = leer('visual.html');
  const app = leer('js/visual-app.js');
  comprobar('visual.html tiene el botón Ventana', html.includes('id="btnVentana"'));
  comprobar('y el diálogo con la ventana', html.includes('id="dlgVentana"'));
  comprobar('el diálogo lleva adentro el marco de la ventana',
    /id="dlgVentana"[\s\S]*?id="formaCuerpo"[\s\S]*?<\/dialog>/.test(html));
  comprobar('ya no queda el panel de la ventana', !html.includes('data-panel="ventana"'));
  comprobar('el botón usa un icono que existe', !!Iconos.svg('ventana'));
  comprobar('el botón la abre', app.includes("$('#btnVentana').addEventListener"));
  comprobar('Cerrar no corta el programa',
    /btnCerrarVentana[\s\S]{0,120}verVentana\(false\)/.test(app));
  comprobar('y Escape con la ventana a la vista tampoco',
    /Escape' && dlgVentana\.open\) return/.test(app));
}

/* --------------------------- ajustar texto ----------------------------- */
/* El Alt + Z de Visual Studio Code. Tiene que estar en los tres IDE, con una
   clave distinta cada uno —si compartieran clave, encenderlo en el IDE
   clásico lo encendería en el de POO sin que nadie lo pidiera— y el módulo
   tiene que cargarse antes que la aplicación que lo usa. */
{
  const modulo = leer('js/ajustar-texto.js');
  const IDES = [['index.html', 'js/app.js', 'esle2_ajustar'],
                ['poo.html', 'js/app-poo.js', 'esle2poo_ajustar'],
                ['visual.html', 'js/visual-app.js', 'esle2vis_ajustar']];
  const claves = new Set();

  for (const [pagina, app, clave] of IDES) {
    const html = leer(pagina);
    const js = leer(app);
    comprobar(`${pagina}: tiene el botón «Ajustar texto»`, html.includes('id="btnAjustar"'));
    comprobar(`${pagina}: con su icono`, /id="btnAjustar"[\s\S]{0,120}data-ic="ajustar"/.test(html));
    comprobar(`${pagina}: y dice si está encendido`,
      /id="btnAjustar"[\s\S]{0,200}aria-pressed=/.test(html));
    comprobar(`${pagina}: carga js/ajustar-texto.js`, html.includes('js/ajustar-texto.js'));
    comprobar(`${pagina}: y lo carga antes que ${app}`,
      html.indexOf('js/ajustar-texto.js') < html.indexOf(app));
    comprobar(`${app}: lo arranca con el editor y el botón`,
      /AjustarTexto\.iniciar\(\{[^}]*editor[^}]*btnAjustar/.test(js));
    comprobar(`${app}: con la clave ${clave}`, js.includes("'" + clave + "'"));
    claves.add(clave);
  }
  comprobar('cada IDE guarda el ajuste por separado', claves.size === 3, [...claves].join());

  comprobar('el icono «ajustar» existe', !!Iconos.svg('ajustar'));
  comprobar('el módulo enciende lineWrapping', modulo.includes("setOption('lineWrapping'"));
  comprobar('cuelga la continuación de la sangría de la línea',
    modulo.includes("on('renderLine'") && modulo.includes('textIndent'));
  comprobar('y redibuja, si no la sangría vieja se queda pegada',
    modulo.includes('editor.refresh()'));
  comprobar('Alt + Z lo alterna, como en Visual Studio Code',
    /altKey[\s\S]{0,120}'z'/.test(modulo));
  comprobar('el service worker guarda js/ajustar-texto.js',
    leer('sw.js').includes("'js/ajustar-texto.js'"));
}

/* ------------------------- y quedan en la caché ------------------------- */
{
  const sw = leer('sw.js');
  comprobar('el service worker guarda js/iconos.js', sw.includes("'js/iconos.js'"));
  comprobar('y js/menus.js', sw.includes("'js/menus.js'"));
  comprobar('y js/iconos-visual.js', sw.includes("'js/iconos-visual.js'"));
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'los iconos o la barra tienen fallos');

/*
 * Baja los iconos de Higgsfield y genera js/iconos-visual.js.
 *
 * Vienen de dos colores: el azul es el trazo y el blanco son los huecos —el
 * texto de una etiqueta, el hueco de una caja, el tilde de una casilla—. Los
 * huecos no se pueden borrar sin quedarse con un cuadrado macizo, así que:
 *
 *   · el azul pasa a «currentColor», para que el icono siga al tema;
 *   · el blanco pasa a «var(--hueco)», que el CSS pone igual al fondo del
 *     recuadro, y así se ve como un hueco tanto en claro como en oscuro;
 *   · el primer blanco de cada archivo es el fondo entero del lienzo: ese sí
 *     se borra.
 *
 * El SVG se inserta en el documento en vez de cargarse con <img> porque un
 * <img> no ve ni currentColor ni las variables del tema.
 */
const fs = require('fs');
const https = require('https');

const BASE = 'https://d8j0ntlcm91z4.cloudfront.net/user_3GhRs6VtcPI5TIsRYSVD3awjcR7/';
const ICONOS = [
  ['etiqueta',   'hf_20260902_190735_6e655dca-0f9f-4109-9872-2aa826d34183.svg'],
  ['boton',      'hf_20260902_190735_4a01dd0b-11b8-4230-9c4b-34bf9deee70d.svg'],
  ['caja',       'hf_20260902_190054_20df8ef0-2bf2-4637-a401-cb3b8e133aa2.svg'],
  ['casilla',    'hf_20260902_190054_c92a90fc-1e80-4010-9274-1060fd99076d.svg'],
  ['lista',      'hf_20260902_190054_46e4f9cb-0d45-4e44-bbd7-96919172286e.svg'],
  ['deslizador', 'hf_20260902_190054_4c96de4d-b345-4685-8669-04459274deb2.svg'],
  ['lienzo',     'hf_20260902_190054_a41c62bd-e074-480a-b93b-e0663f378466.svg'],
  ['pluma',      'hf_20260902_190134_f25aafdf-319d-4fd7-ac0c-ffe3983c9338.svg'],
  ['relleno',    'hf_20260902_190134_68b42f9f-7562-444f-a133-266ec03402db.svg'],
  ['grosor',     'hf_20260902_190054_3cdf1386-d0dc-4506-adaf-cbfb087023c8.svg'],
  ['linea',      'hf_20260902_190054_270ca7bd-7136-4666-a660-e5d292328b52.svg'],
  ['rectangulo', 'hf_20260902_190054_8e98aa46-4ffd-4e20-a1d4-0a3b9771e6e6.svg'],
  ['circulo',    'hf_20260902_190202_1e083723-5cd7-4c26-b45b-2fe6eaecf8ef.svg'],
  ['elipse',     'hf_20260902_190134_4313a60d-b9eb-4ffe-b785-30193406d82d.svg'],
  ['punto',      'hf_20260902_190735_4236ba47-270e-41a3-b397-ee3130851e9e.svg'],
  ['texto',      'hf_20260902_190735_963c75bc-a3ed-406d-97b0-26b100644ab2.svg'],
  ['borrar',     'hf_20260902_190134_d42a818a-c202-4d11-9cb0-34d24629f291.svg']
];

/* Tres iconos dibujados a mano, en la misma convención de dos tintas:
   «currentColor» es el trazo y «var(--hueco)» es el hueco. Se dibujan acá y no
   se bajan porque los de arriba salieron de un generador de imágenes que hoy
   puede no estar, y porque estos tres son cuatro líneas cada uno: pedirle a
   una máquina que dibuje un rectángulo con un triangulito sería absurdo.
   El lienzo es de 2048×2048, como el de los otros. */
const A_MANO = {
  /* Desplegable: un rectángulo con el triangulito de abrir a la derecha. */
  desplegable: '<svg viewBox="0 0 2048 2048">'
    + '<path fill="currentColor" d="M 256 704 L 1792 704 L 1792 1344 L 256 1344 z"/>'
    + '<path fill="var(--hueco)" d="M 352 800 L 1696 800 L 1696 1248 L 352 1248 z"/>'
    + '<path fill="currentColor" d="M 1344 960 L 1600 960 L 1472 1136 z"/>'
    + '<path fill="currentColor" d="M 480 992 L 1216 992 L 1216 1056 L 480 1056 z"/></svg>',
  /* Número: un rectángulo con las dos flechitas de subir y bajar. */
  numero: '<svg viewBox="0 0 2048 2048">'
    + '<path fill="currentColor" d="M 256 704 L 1792 704 L 1792 1344 L 256 1344 z"/>'
    + '<path fill="var(--hueco)" d="M 352 800 L 1696 800 L 1696 1248 L 352 1248 z"/>'
    + '<path fill="currentColor" d="M 1408 848 L 1568 1008 L 1248 1008 z"/>'
    + '<path fill="currentColor" d="M 1408 1200 L 1248 1040 L 1568 1040 z"/>'
    + '<path fill="currentColor" d="M 480 992 L 928 992 L 928 1056 L 480 1056 z"/></svg>',
  /* Progreso: una barra llena hasta poco más de la mitad. */
  progreso: '<svg viewBox="0 0 2048 2048">'
    + '<path fill="currentColor" d="M 192 832 L 1856 832 L 1856 1216 L 192 1216 z"/>'
    + '<path fill="var(--hueco)" d="M 288 928 L 1760 928 L 1760 1120 L 288 1120 z"/>'
    + '<path fill="currentColor" d="M 288 928 L 1216 928 L 1216 1120 L 288 1120 z"/></svg>'
};

const bajar = url => new Promise((ok, mal) => {
  https.get(url, r => {
    if (r.statusCode !== 200) { mal(new Error(url + ' -> ' + r.statusCode)); return; }
    let t = ''; r.setEncoding('utf8');
    r.on('data', d => { t += d; });
    r.on('end', () => ok(t));
  }).on('error', mal);
});

const BLANCO = /fill="rgb\(255,\s*255,\s*255\)"/;

function limpiar(svg) {
  let s = svg.replace(/<\?xml[^>]*\?>\s*/g, '')
             .replace(/<metadata>[\s\S]*?<\/metadata>/g, '')
             .replace(/<!--[\s\S]*?-->/g, '')
             .replace(/\sxmlns:c2pa="[^"]*"/g, '')
             .replace(/\sxmlns="[^"]*"/g, '')
             .replace(/\sversion="[^"]*"/g, '')
             .replace(/\sstyle="display: block;"/g, '')
             .replace(/\spreserveAspectRatio="none"/g, '')
             .replace(/\swidth="\d+"\s*height="\d+"/g, '');

  /* El primer elemento blanco es el fondo del lienzo entero. */
  const elementos = s.match(/<(?:path|rect|circle|ellipse|polygon)\b[^>]*\/>/g) || [];
  const fondo = elementos.find(e => BLANCO.test(e));
  if (fondo) s = s.replace(fondo, '');

  s = s.replace(/fill="rgb\(255,\s*255,\s*255\)"/g, 'fill="var(--hueco)"');
  s = s.replace(/(fill|stroke)="rgb\([^)]*\)"/g, (m, q) => q + '="currentColor"');
  return s.replace(/\s+/g, ' ').replace(/> </g, '><').trim();
}

/* Lo que ya está generado. Sirve de red: los iconos viejos vinieron de un
   servicio de imágenes que puede no contestar más, y perder los diecisiete
   que ya andan por agregar tres nuevos sería un mal negocio. */
function yaGenerados() {
  const hechos = {};
  try {
    const viejo = fs.readFileSync(SALIDA, 'utf8');
    for (const m of viejo.matchAll(/^    ([a-z_]+): ("(?:[^"\\]|\\.)*")/gm)) {
      hechos[m[1]] = JSON.parse(m[2]);
    }
  } catch (e) { /* la primera vez no hay nada */ }
  return hechos;
}

const SALIDA = 'c:/Users/benja/OneDrive/Desktop/ESLE2/js/iconos-visual.js';

(async () => {
  const partes = [];
  const viejos = yaGenerados();
  for (const [nombre, archivo] of ICONOS) {
    let limpio;
    try {
      limpio = limpiar(await bajar(BASE + archivo));
    } catch (e) {
      if (!viejos[nombre]) throw e;
      limpio = viejos[nombre];
      console.log(nombre.padEnd(12), 'no se pudo bajar: se deja el que ya estaba');
    }
    const huecos = (limpio.match(/--hueco/g) || []).length;
    console.log(nombre.padEnd(12), (limpio.length / 1024).toFixed(1) + ' KB', huecos + ' huecos');
    partes.push('    ' + nombre + ': ' + JSON.stringify(limpio));
  }
  for (const nombre of Object.keys(A_MANO)) {
    const limpio = A_MANO[nombre].replace(/\s+/g, ' ').replace(/> </g, '><').trim();
    console.log(nombre.padEnd(12), (limpio.length / 1024).toFixed(1) + ' KB', 'a mano');
    partes.push('    ' + nombre + ': ' + JSON.stringify(limpio));
  }

  const salida =
`/*
 * Iconos de ESLE2 Visual: los diez controles y las diez órdenes de dibujo.
 *
 * Son dibujos vectoriales de dos tintas. El trazo es «currentColor», así que
 * el icono toma el color del texto que lo rodea y sigue al tema claro u
 * oscuro; los huecos —el renglón de una etiqueta, el tilde de una casilla—
 * son «var(--hueco)», que el CSS pone igual al fondo del recuadro.
 *
 * Por eso el SVG se inserta en el documento y no se carga con <img>: un <img>
 * no ve ni currentColor ni las variables del tema, y en modo oscuro quedaría
 * un parche claro sobre el panel.
 *
 * Generado con tools/iconos-visual.js — no editar a mano.
 */
(function (global) {
  'use strict';

  const ICONOS = {
${partes.join(',\n')}
  };

  /* Deja el icono adentro de \`caja\`. Si no existe, no rompe nada: se devuelve
     false y quien llama pone la letra de siempre. */
  function poner(caja, nombre) {
    const svg = ICONOS[nombre];
    if (!svg) return false;
    caja.innerHTML = svg;
    caja.setAttribute('aria-hidden', 'true');
    return true;
  }

  global.VISUAL_ICONOS = { lista: ICONOS, poner: poner };
})(typeof window !== 'undefined' ? window : globalThis);
`;
  fs.writeFileSync(SALIDA, salida);
  console.log('js/iconos-visual.js: ' + (salida.length / 1024).toFixed(1) + ' KB');
})();

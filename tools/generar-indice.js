/*
 * Genera js/indice.js: el índice que usa el buscador global (Ctrl + K).
 *
 *   node tools/generar-indice.js            escribe el archivo
 *   node tools/generar-indice.js --revisar  solo avisa si quedó desactualizado
 *
 * Se arma leyendo las dos documentaciones y los dos cursos, así que hay que
 * volver a correrlo cada vez que se agrega una sección o un ejercicio.
 * test/test-indice.js verifica que esté al día.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const leer = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');

/* Texto plano de un fragmento de HTML. */
const plano = h => h.replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/* Secciones y apartados de una documentación. */
function deDocumentacion(archivo, sitio) {
  const html = leer(archivo);
  const entradas = [];
  const secciones = html.split('<section class="doc-seccion"').slice(1);
  for (const trozo of secciones) {
    const id = (/id="([^"]+)"/.exec(trozo) || [])[1];
    const titulo = (/data-titulo="([^"]+)"/.exec(trozo) || [])[1]
      || plano((/<h2>([\s\S]*?)<\/h2>/.exec(trozo) || [, ''])[1]);
    if (!id || !titulo) continue;
    const sub = plano((/<p class="sub">([\s\S]*?)<\/p>/.exec(trozo) || [, ''])[1]);
    entradas.push([titulo, sitio, `${archivo}#${id}`, sub]);

    for (const m of trozo.matchAll(/<h3>([\s\S]*?)<\/h3>/g)) {
      const h3 = plano(m[1]);
      if (h3) entradas.push([h3, `${sitio} · ${titulo}`, `${archivo}#${id}`, '']);
    }
  }
  return entradas;
}

/* Ejercicios de un curso. */
function deCurso(archivoJs, clave, pagina, sitio) {
  global.window = global;
  delete require.cache[require.resolve(path.join(RAIZ, archivoJs))];
  require(path.join(RAIZ, archivoJs));
  const NIVEL = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };
  return global[clave].EJERCICIOS.map(e =>
    [e.titulo, `${sitio} · ${NIVEL[e.nivel]}`, `${pagina}#ej=${e.id}`, plano(e.enunciado).slice(0, 120)]);
}

/* Subrutinas y funciones que trae el lenguaje. */
function predefinidas() {
  global.window = global;
  delete require.cache[require.resolve(path.join(RAIZ, 'js/sle2.js'))];
  require(path.join(RAIZ, 'js/sle2.js'));
  return Object.keys(global.SLE2.PREDEF).sort()
    .map(n => [(AYUDAS[n] ? AYUDAS[n].firma : n + ' ()'), 'Predefinida',
               'documentacion.html#s-predefinidas', AYUDAS[n] ? AYUDAS[n].texto : '']);
}

/* Firma y explicación de cada subrutina predefinida, sacadas de las tablas de
   la sección «Subrutinas y funciones predefinidas» de las dos documentaciones.
   Las usa el autocompletado del editor (js/autocompletar.js): así la ayuda que
   aparece mientras se escribe es exactamente la de la documentación y no se
   puede desfasar. */
function ayudas() {
  const mapa = {};

  /* Las tablas de un tramo de HTML, en el formato «firma | qué hace». */
  const deTrozo = trozo => {
    for (const fila of trozo.matchAll(/<tr>([\s\S]*?)<\/tr>/g)) {
      const celdas = [...fila[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(c => c[1]);
      if (celdas.length < 2) continue;
      const texto = plano(celdas[1]);
      for (const cod of celdas[0].matchAll(/<code>([\s\S]*?)<\/code>/g)) {
        const firma = plano(cod[1]);
        const nombre = (/^([A-Za-z_][A-Za-z0-9_]*)/.exec(firma) || [])[1];
        if (nombre && !mapa[nombre]) mapa[nombre] = { firma, texto };
      }
    }
  };

  for (const archivo of ['documentacion.html', 'poo-documentacion.html']) {
    const html = leer(archivo);
    const i = html.indexOf('id="s-predefinidas"');
    if (i < 0) continue;
    deTrozo(html.slice(i, html.indexOf('</section>', i)));
  }

  /* ESLE2 Visual no tiene una sección «predefinidas» sino una tabla por tema;
     son las mismas tablas que lee una persona, así que la ayuda del
     autocompletado nunca se desfasa de la documentación. */
  const visual = leer('visual-documentacion.html');
  /* Ojo: esta lista hay que ampliarla cuando se agrega una sección con
     subrutinas nuevas. Si falta, la función queda sin ayuda y sin entrada en
     el buscador, y nadie se entera hasta que alguien la escribe en el editor.
     test/test-autocompletar.js lo caza: comprueba que TODA predefinida tenga
     su ayuda. */
  for (const id of ['s-ventana', 's-controles', 's-eventos', 's-lienzo',
                    's-preguntar', 's-temporizador']) {
    const i = visual.indexOf('id="' + id + '"');
    if (i < 0) continue;
    deTrozo(visual.slice(i, visual.indexOf('</section>', i)));
  }

  return mapa;
}

const AYUDAS = ayudas();

const PAGINAS = [
  ['IDE de ESLE2', 'Página', 'index.html', 'editor, entrada de datos y pantalla'],
  ['Curso de ESLE2', 'Página', 'index.html#curso', '50 ejercicios con corrección automática'],
  ['Documentación de ESLE2', 'Página', 'documentacion.html', 'sintaxis y funcionamiento del lenguaje'],
  ['IDE de ESLE2 POO', 'Página', 'poo.html', 'el mismo lenguaje con clases y objetos'],
  ['Curso de ESLE2 POO', 'Página', 'poo.html#curso', '50 ejercicios de objetos'],
  ['Documentación de ESLE2 POO', 'Página', 'poo-documentacion.html', 'los cuatro pilares explicados desde cero'],
  ['ESLE2 Visual', 'Página', 'visual.html', 'ventanas, controles y dibujo con SLE2'],
  ['Curso de ESLE2 Visual', 'Página', 'visual.html#curso', '50 ejercicios de ventanas, eventos y dibujo'],
  ['Documentación de ESLE2 Visual', 'Página', 'visual-documentacion.html', 'la referencia de ventanas, controles y lienzo'],
  ['ESLE2 BD', 'Página', 'bd.html', 'bases de datos y SQL con SLE2'],
  ['Documentación de ESLE2 BD', 'Página', 'bd-documentacion.html', 'SQL, NULL y la exportación a SQLite, MySQL y PostgreSQL'],
  ['Diseño', 'Página', 'diseno.html', 'colores del fondo y de la sintaxis']
];

const entradas = [].concat(
  PAGINAS,
  deDocumentacion('documentacion.html', 'Documentación'),
  deDocumentacion('poo-documentacion.html', 'Documentación POO'),
  deDocumentacion('visual-documentacion.html', 'Documentación Visual'),
  deDocumentacion('bd-documentacion.html', 'Documentación BD'),
  deCurso('js/ejercicios.js', 'CURSO', 'index.html', 'Curso'),
  deCurso('js/ejercicios-poo.js', 'CURSO_POO', 'poo.html', 'Curso POO'),
  deCurso('js/ejercicios-visual.js', 'CURSO_VISUAL', 'visual.html', 'Curso Visual'),
  predefinidas()
);

const salida = `/* Índice del buscador global y ayudas del autocompletado.
   GENERADO por tools/generar-indice.js: no editar a mano. */
window.ESLE2Indice = [
${entradas.map(e => '  ' + JSON.stringify(e)).join(',\n')}
];
window.ESLE2Ayudas = {
${Object.keys(AYUDAS).sort().map(n => `  ${JSON.stringify(n)}: ${JSON.stringify(AYUDAS[n])}`).join(',\n')}
};
`;

const destino = path.join(RAIZ, 'js/indice.js');
if (process.argv.includes('--revisar')) {
  const actual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
  if (actual !== salida) {
    console.error('js/indice.js quedó desactualizado: corré «node tools/generar-indice.js».');
    process.exit(1);
  }
  console.log(`js/indice.js al día (${entradas.length} entradas, ${Object.keys(AYUDAS).length} ayudas).`);
} else if (fs.existsSync(destino) && fs.readFileSync(destino, 'utf8') === salida) {
  /* Si no cambió nada, no se toca: reescribirlo igual le cambia la fecha y
     hace creer que hay algo nuevo sin publicar. */
  console.log(`js/indice.js ya estaba al día (${entradas.length} entradas, ${Object.keys(AYUDAS).length} ayudas).`);
} else {
  fs.writeFileSync(destino, salida);
  console.log(`js/indice.js escrito con ${entradas.length} entradas y ${Object.keys(AYUDAS).length} ayudas.`);
}

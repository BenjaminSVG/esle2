/*
 * Prueba del modo aula: armar una guía, meterla en un enlace y volver a
 * sacarla igual.
 *
 * Lo que importa es la vuelta completa: guía → enlace → guía → ejercicios que
 * el curso pueda corregir. Si eso se rompe, el enlace que un profesor repartió
 * el lunes deja de andar el martes, que es lo peor que puede pasar acá.
 *
 *   node test/test-aula.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'seguro.js'));
require(path.join(RAIZ, 'js', 'aula.js'));
const { Aula } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

const CATALOGO = [
  { id: 'f1', nivel: 'facil', titulo: 'Hola, mundo', enunciado: '…', plantilla: '', pruebas: [{ entrada: '', salida: 'Hola' }] },
  { id: 'f2', nivel: 'facil', titulo: 'Suma', enunciado: '…', plantilla: '', pruebas: [{ entrada: '5,10', salida: '15' }] },
  { id: 'm1', nivel: 'medio', titulo: 'Factorial', enunciado: '…', plantilla: '', pruebas: [{ entrada: '5', salida: '120' }] }
];

const PROPIO = {
  id: 'mio1', nivel: 'medio', titulo: 'El de la profe',
  enunciado: 'Leé dos números e imprimí su suma.',
  pista: 'leer (a, b)',
  plantilla: 'inicio\nfin\n',
  pruebas: [{ entrada: '5,10', salida: '15' }, { entrada: '1,1', salida: '2' }]
};

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Armar una guía');
  {
    const g = Aula.desdeEjercicios('Práctica 1', 'Para el viernes.', 'SLE2',
      [CATALOGO[1], PROPIO, CATALOGO[2]], CATALOGO);

    comprobar('los del curso viajan como su id, no enteros',
      g.e[0] === 'f2' && g.e[2] === 'm1', JSON.stringify(g.e));
    comprobar('el propio viaja entero', typeof g.e[1] === 'object' && g.e[1].titulo === 'El de la profe');
    comprobar('con sus casos de prueba', g.e[1].pruebas.length === 2);
    comprobar('guarda el título y el mensaje', g.n === 'Práctica 1' && g.m === 'Para el viernes.');
    comprobar('y el lenguaje', g.l === 'SLE2');
    comprobar('no hay problemas que informar', Aula.problemas(g).length === 0, JSON.stringify(Aula.problemas(g)));
  }

  /* ------------------------------------------------------------------ */
  seccion('El enlace');
  {
    const g = Aula.desdeEjercicios('Práctica 1', 'Para el viernes.', 'SLE2',
      [CATALOGO[1], PROPIO], CATALOGO);
    const url = await Aula.enlace(g, 'https://esle2.vercel.app/index.html');

    comprobar('el enlace lleva la guía después del #', /#aula=[A-Za-z0-9\-_]+$/.test(url), url);
    comprobar('y no la manda al servidor: todo va en el fragmento',
      url.split('#')[0] === 'https://esle2.vercel.app/index.html');

    const vuelta = await Aula.leerUrl(url.slice(url.indexOf('#')));
    comprobar('se puede volver a leer', !!vuelta);
    comprobar('y es exactamente la misma guía', JSON.stringify(vuelta) === JSON.stringify(g),
      JSON.stringify(vuelta));

    /* Solo ids del curso: el enlace tiene que quedar chico. */
    const corta = Aula.desdeEjercicios('Repaso', '', 'SLE2', CATALOGO, CATALOGO);
    const urlCorta = await Aula.enlace(corta, 'https://esle2.vercel.app/index.html');
    comprobar('una guía de tres ejercicios del curso da un enlace corto',
      urlCorta.length < 200, urlCorta.length + ' caracteres');

    /* Y una con mucho texto propio también tiene que entrar. */
    const gorda = Aula.desdeEjercicios('Gorda', 'x'.repeat(500), 'SLE2',
      Array.from({ length: 15 }, (_, i) => Object.assign({}, PROPIO, { id: 'p' + i })), []);
    const urlGorda = await Aula.enlace(gorda, 'https://esle2.vercel.app/index.html');
    comprobar('una guía grande sigue entrando en un enlace usable',
      urlGorda.length < 4000, urlGorda.length + ' caracteres');
    comprobar('y también vuelve entera',
      JSON.stringify(await Aula.leerUrl('#aula=' + urlGorda.split('#aula=')[1])) === JSON.stringify(gorda));
  }

  /* ------------------------------------------------------------------ */
  seccion('Enlaces rotos o de otro lado');
  {
    comprobar('un hash sin guía da null', (await Aula.leerUrl('#curso')) === null);
    comprobar('basura codificada da null', (await Aula.leerUrl('#aula=zzzzzz')) === null);
    comprobar('texto vacío da null', (await Aula.decodificar('')) === null);
    comprobar('algo que no es una guía da null',
      (await Aula.decodificar('p' + Buffer.from('{"hola":1}').toString('base64url'))) === null);
    comprobar('una guía de otra versión da null',
      (await Aula.decodificar('p' + Buffer.from('{"v":99,"n":"x","e":[]}').toString('base64url'))) === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Usarla en el curso');
  {
    const g = Aula.desdeEjercicios('Práctica 1', '', 'SLE2', [CATALOGO[1], PROPIO], CATALOGO);
    const { ejercicios, faltan } = Aula.resolver(g, CATALOGO);

    comprobar('salen los dos ejercicios', ejercicios.length === 2);
    comprobar('no falta ninguno', faltan.length === 0);
    comprobar('el del curso es el del curso', ejercicios[0].id === 'f2');
    comprobar('el propio se corrige igual: tiene sus pruebas',
      ejercicios[1].pruebas.length === 2 && ejercicios[1].pruebas[0].salida === '15');
    comprobar('y su id no pisa el de un ejercicio propio del alumno',
      ejercicios[1].id !== 'mio1' && /^a[a-z0-9]+-1$/.test(ejercicios[1].id), ejercicios[1].id);

    /* El mismo enlace abierto dos veces tiene que dar el mismo id, o el
       avance no se guardaría. */
    const otra = Aula.resolver(g, CATALOGO);
    comprobar('el mismo enlace da siempre el mismo id', otra.ejercicios[1].id === ejercicios[1].id);

    /* Dos guías distintas, no. */
    const g2 = Aula.desdeEjercicios('Práctica 2', '', 'SLE2', [PROPIO], CATALOGO);
    comprobar('dos guías distintas no comparten ids',
      Aula.resolver(g2, CATALOGO).ejercicios[0].id !== ejercicios[1].id);

    /* Un id del curso que ya no existe. */
    const g3 = Aula.desdeEjercicios('Vieja', '', 'SLE2', [{ id: 'borrado' }], [{ id: 'borrado' }]);
    const r3 = Aula.resolver(g3, CATALOGO);
    comprobar('un ejercicio del curso que ya no está se avisa',
      r3.faltan.length === 1 && r3.faltan[0] === 'borrado', JSON.stringify(r3));
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que no se puede repartir');
  {
    const sinTitulo = Aula.desdeEjercicios('', '', 'SLE2', [CATALOGO[0]], CATALOGO);
    comprobar('una guía sin título se avisa',
      Aula.problemas(sinTitulo).some(p => /título/.test(p)));

    const vacia = Aula.desdeEjercicios('Vacía', '', 'SLE2', [], CATALOGO);
    comprobar('una guía sin ejercicios se avisa',
      Aula.problemas(vacia).some(p => /ningún ejercicio/.test(p)));

    const sinPruebas = Aula.desdeEjercicios('Mala', '', 'SLE2',
      [{ id: 'x', titulo: 'Sin casos', enunciado: 'algo', pruebas: [] }], []);
    comprobar('un ejercicio propio sin casos de prueba se avisa',
      Aula.problemas(sinPruebas).some(p => /caso de prueba/.test(p)),
      JSON.stringify(Aula.problemas(sinPruebas)));

    const sinConsigna = Aula.desdeEjercicios('Mala', '', 'SLE2',
      [{ id: 'x', titulo: 'Sin consigna', enunciado: '', pruebas: [{ entrada: '', salida: 'a' }] }], []);
    comprobar('y uno sin consigna también',
      Aula.problemas(sinConsigna).some(p => /consigna/.test(p)));
  }

  seccion('Entregar la guía');
  /* Una entrega de guía tiene que ser indistinguible de una de examen para el
     visor del profesor: si no, la planilla del curso no la toma y el camino de
     vuelta no sirve para nada. Por eso se prueba contra el propio examen.js. */
  {
    global.document = global.document || { addEventListener() {} };
    require(path.join(RAIZ, 'js', 'examen.js'));
    const { Examen } = global;

    const guia = Aula.desdeEjercicios('Práctica 3', 'Para el viernes', 'SLE2',
      [CATALOGO[0], CATALOGO[2]], CATALOGO);

    const hechos = [
      { id: 'f1', titulo: 'Hola, mundo', nivel: 'facil', codigo: 'inicio\nfin', pasadas: 1, total: 1 },
      { id: 'm1', titulo: 'Factorial', nivel: 'medio', codigo: '', pasadas: 0, total: 2 }
    ];
    const entrega = Aula.armarEntrega({ guia, alumno: '  Ana  ', ejercicios: hechos,
      entregado: '2026-09-07T10:00:00Z' });

    comprobar('el visor de examen la reconoce como entrega', Examen.esEntrega(entrega));
    comprobar('lleva el título de la guía', entrega.titulo === 'Práctica 3', entrega.titulo);
    comprobar('el nombre va sin espacios de más', entrega.alumno === 'Ana', entrega.alumno);
    comprobar('se sabe que viene de una guía', entrega.origen === 'aula', entrega.origen);
    comprobar('lleva el lenguaje de la guía', entrega.lenguaje === 'SLE2', entrega.lenguaje);
    comprobar('y la fecha que se le pasó', entrega.entregado === '2026-09-07T10:00:00Z');

    const r = Examen.resumir(entrega);
    comprobar('resumen: uno resuelto de dos', r.resueltos === 1 && r.total === 2,
      r.resueltos + '/' + r.total);
    comprobar('resumen: la nota', r.nota === 50, r.nota);
    comprobar('resumen: los casos', r.casos === 1 && r.casosTotales === 3,
      r.casos + '/' + r.casosTotales);

    /* La planilla del curso, que es para lo que existe todo esto. */
    const otra = Aula.armarEntrega({ guia, alumno: 'Beto', ejercicios: [
      { id: 'f1', titulo: 'Hola, mundo', nivel: 'facil', codigo: 'x', pasadas: 1, total: 1 },
      { id: 'm1', titulo: 'Factorial', nivel: 'medio', codigo: 'y', pasadas: 2, total: 2 }
    ] });
    const planilla = Examen.planilla([entrega, otra]);
    comprobar('la planilla toma las dos', planilla.filas.length === 2);
    comprobar('ordenadas por nota',
      planilla.filas.map(f => f.alumno).join() === 'Beto,Ana', planilla.filas.map(f => f.alumno));
    comprobar('una columna por ejercicio',
      planilla.columnas.map(c => c.id).join() === 'f1,m1', planilla.columnas.map(c => c.id));
    comprobar('y sale el CSV', Examen.planillaCSV(planilla).split('\n').length === 3);

    /* Una guía es tarea para casa, no un parcial: no hay cronómetro. Que la
       planilla no invente tiempos que nadie midió. */
    comprobar('sin minutos inventados', planilla.filas.every(f => f.minutos === 0));

    /* Lo que falta, dicho antes de bajar un archivo inservible. */
    const debeFallar = (que, fn, fragmento) => {
      try { fn(); comprobar(que, false, 'no protestó'); }
      catch (e) { comprobar(que, e.message.includes(fragmento), e.message); }
    };
    debeFallar('sin nombre no se entrega',
      () => Aula.armarEntrega({ guia, alumno: '   ', ejercicios: hechos }), 'nombre');
    debeFallar('sin guía abierta tampoco',
      () => Aula.armarEntrega({ guia: null, alumno: 'Ana', ejercicios: hechos }), 'guía');
    debeFallar('ni sin ejercicios',
      () => Aula.armarEntrega({ guia, alumno: 'Ana', ejercicios: [] }), 'ningún ejercicio');

    /* Campos rotos: la entrega se arma igual, con ceros, en vez de meter un NaN
       adentro de la planilla del profesor. */
    const rara = Aula.armarEntrega({ guia, alumno: 'Ana',
      ejercicios: [{ id: 'f1', pasadas: 'x', total: undefined }] });
    comprobar('los números rotos quedan en cero',
      rara.ejercicios[0].pasadas === 0 && rara.ejercicios[0].total === 0);
    comprobar('sin título se usa el id', rara.ejercicios[0].titulo === 'f1');
    comprobar('y el código siempre es texto', rara.ejercicios[0].codigo === '');

    /* El nombre del archivo: dos alumnos no se pisan. */
    comprobar('nombre de archivo sin acentos ni espacios',
      Aula.nombreDeEntrega(guia, 'Ana María Gómez') === 'guia-practica-3-ana-maria-gomez.json',
      Aula.nombreDeEntrega(guia, 'Ana María Gómez'));
    comprobar('sin datos igual sale un nombre',
      Aula.nombreDeEntrega({ n: '' }, '') === 'guia-sin-titulo-alumno.json',
      Aula.nombreDeEntrega({ n: '' }, ''));
    comprobar('dos alumnos, dos archivos',
      Aula.nombreDeEntrega(guia, 'Ana') !== Aula.nombreDeEntrega(guia, 'Beto'));
  }

  seccion('Lo que llega de un enlace ajeno');
  {
    /* Una guía la arma cualquiera: lo que trae se limpia antes de que nadie
       lo mire. Esto es lo que impedía que un enunciado con una etiqueta
       terminara pegado como HTML en la pantalla del alumno. */
    const sucia = {
      v: 1, l: 'SLE2', n: 'Guía', m: '',
      e: [{
        id: '__proto__', nivel: 'inventado', titulo: 'x'.repeat(9999),
        enunciado: '<img src=x onerror=alert(1)>', pista: null,
        plantilla: 'inicio\nfin\n', pruebas: [{ entrada: 1, salida: 2 }],
        colado: 'no debería viajar'
      }]
    };
    const r = Aula.resolver(sucia, CATALOGO);
    const e = r.ejercicios[0];
    comprobar('el nivel inventado cae en fácil', e.nivel === 'facil', e.nivel);
    comprobar('el título se recorta', e.titulo.length <= 200, e.titulo.length);
    comprobar('no se cuela ningún campo de más', e.colado === undefined);
    comprobar('los casos quedan como texto', e.pruebas[0].entrada === '1');
    comprobar('y el id lo pone la guía, no el archivo', /^a[a-z0-9]+-1$/.test(e.id), e.id);
    comprobar('Object.prototype sigue limpio', ({}).colado === undefined);
  }

  seccion('Los límites del enlace');
  {
    comprobar('un hash descomunal no se decodifica',
      await Aula.decodificar('z' + 'A'.repeat(600000)) === null);
    comprobar('un prefijo desconocido no se acepta',
      await Aula.decodificar('x' + 'AAAA') === null);
    comprobar('base64 roto devuelve null', await Aula.decodificar('p!!!!') === null);
    comprobar('una guía con mil ejercicios no pasa',
      await (async () => {
        const grande = { v: 1, l: 'SLE2', n: 'g', m: '', e: Array.from({ length: 1000 }, () => 'f1') };
        return await Aula.decodificar(await Aula.codificar(grande)) === null;
      })());
    comprobar('y una normal sí',
      await (async () => {
        const g = { v: 1, l: 'SLE2', n: 'g', m: '', e: ['f1', 'f2'] };
        const v = await Aula.decodificar(await Aula.codificar(g));
        return !!v && v.e.length === 2;
      })());
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el modo aula tiene fallos');
})();

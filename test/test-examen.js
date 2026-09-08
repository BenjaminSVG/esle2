/*
 * Prueba del modo examen: armar el paquete, el cronómetro y el resumen de una
 * entrega. Son funciones puras, así que corren sin navegador.
 *   node test/test-examen.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
global.document = { addEventListener() {} };
require(path.join(__dirname, '..', 'js', 'examen.js'));
const { Examen } = global;

let ok = 0, fallos = 0;
const falla = (que, det) => { fallos++; console.log(`  ✘ ${que}\n    ${det}`); };
function comprobar(que, real, esperado) {
  if (JSON.stringify(real) === JSON.stringify(esperado)) { ok++; return; }
  falla(que, `esperado ${JSON.stringify(esperado)} / obtenido ${JSON.stringify(real)}`);
}
function debeFallar(que, fn, fragmento) {
  try { fn(); falla(que, 'no protestó'); }
  catch (e) { e.message.includes(fragmento) ? ok++ : falla(que, 'dijo: ' + e.message); }
}

const EJERCICIOS = [
  { id: 'f1', titulo: 'Hola', nivel: 'facil', enunciado: 'Saludar', plantilla: 'inicio\nfin',
    pruebas: [{ entrada: '', salida: 'Hola' }] },
  { id: 'm3', titulo: 'Vocales', nivel: 'medio', enunciado: 'Contar', plantilla: '',
    pruebas: [{ entrada: 'casa', salida: '2' }, { entrada: 'sol', salida: '1' }] }
];

/* ------------------------------ el paquete ------------------------------ */
const paquete = Examen.armarPaquete({ titulo: '  Parcial 1  ', minutos: 45, lenguaje: 'SLE2', ejercicios: EJERCICIOS });
comprobar('título sin espacios de más', paquete.titulo, 'Parcial 1');
comprobar('duración', paquete.minutos, 45);
comprobar('los ejercicios viajan enteros', paquete.ejercicios.map(e => [e.id, e.pruebas.length]), [['f1', 1], ['m3', 2]]);
comprobar('es un paquete válido', Examen.esPaquete(paquete), true);
comprobar('una entrega no es un paquete', Examen.esPaquete({ formato: 'esle2-entrega', ejercicios: [] }), false);

debeFallar('sin título', () => Examen.armarPaquete({ minutos: 10, ejercicios: EJERCICIOS }), 'título');
debeFallar('sin duración', () => Examen.armarPaquete({ titulo: 'X', minutos: 0, ejercicios: EJERCICIOS }), 'duración');
debeFallar('sin ejercicios', () => Examen.armarPaquete({ titulo: 'X', minutos: 10, ejercicios: [] }), 'al menos un ejercicio');

/* ------------------------------ el reloj -------------------------------- */
const arranque = '2026-09-01T10:00:00.000Z';
const enT = min => Date.parse(arranque) + min * 60000;
const estado = { empezado: arranque, minutos: 60 };
comprobar('al empezar quedan 60 minutos', Examen.segundosRestantes(estado, enT(0)), 3600);
comprobar('a la media hora', Examen.segundosRestantes(estado, enT(30)), 1800);
comprobar('justo al final', Examen.segundosRestantes(estado, enT(60)), 0);
comprobar('pasado el final no da negativo', Examen.segundosRestantes(estado, enT(75)), 0);
comprobar('formato del reloj', [Examen.reloj(3600), Examen.reloj(605), Examen.reloj(9)],
  ['60:00', '10:05', '00:09']);

/* ---------------------------- la corrección ----------------------------- */
const entrega = {
  formato: 'esle2-entrega', version: 1, titulo: 'Parcial 1', alumno: 'Ana',
  entregado: new Date().toISOString(),
  ejercicios: [
    { id: 'f1', titulo: 'Hola', pasadas: 1, total: 1, segundos: 120, minutos: 2 },
    { id: 'm3', titulo: 'Vocales', pasadas: 1, total: 2, segundos: 300, minutos: 5 }
  ]
};
comprobar('es una entrega válida', Examen.esEntrega(entrega), true);
const r = Examen.resumir(entrega);
comprobar('resumen', [r.total, r.resueltos, r.casos, r.casosTotales, r.nota], [2, 1, 2, 3, 50]);

const perfecta = { formato: 'esle2-entrega', ejercicios: [{ pasadas: 2, total: 2 }, { pasadas: 3, total: 3 }] };
comprobar('todo bien es 100', Examen.resumir(perfecta).nota, 100);
const vacia = { formato: 'esle2-entrega', ejercicios: [] };
comprobar('sin ejercicios no divide por cero', Examen.resumir(vacia).nota, 0);

/* ------------------------ las plantillas de examen ---------------------- */
{
  require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
  require(path.join(__dirname, '..', 'js', 'ejercicios-poo.js'));
  require(path.join(__dirname, '..', 'js', 'ejercicios-visual.js'));
  const cursos = {
    SLE2: global.CURSO.EJERCICIOS,
    'ESLE2 POO': global.CURSO_POO.EJERCICIOS,
    'ESLE2 Visual': global.CURSO_VISUAL.EJERCICIOS
  };
  for (const [lenguaje, lista] of Object.entries(cursos)) {
    const plantillas = Examen.plantillasDe(lenguaje);
    if (!plantillas.length) { falla('plantillas de ' + lenguaje, 'no hay ninguna'); continue; }
    for (const p of plantillas) {
      const faltan = p.ids.filter(id => !lista.some(e => e.id === id));
      if (faltan.length) falla(`plantilla «${p.nombre}»`, 'ejercicios que no existen: ' + faltan.join(', '));
      else if (!(p.minutos > 0)) falla(`plantilla «${p.nombre}»`, 'sin duración');
      else ok++;
    }
  }
  for (const lenguaje of Object.keys(cursos)) {
    for (const t of Examen.plantillasDe(lenguaje)) {
      comprobar('«' + t.nombre + '» no repite ejercicios',
        new Set(t.ids).size === t.ids.length, true);
    }
  }
  comprobar('un lenguaje desconocido no tiene plantillas', Examen.plantillasDe('COBOL'), []);
}

/* --------------------------- la planilla del curso ---------------------- */
{
  const entregas = [
    { formato: 'esle2-entrega', titulo: 'Parcial 1', alumno: 'Beto', entregado: '2026-09-01T12:00:00Z',
      ejercicios: [
        { id: 'f1', titulo: 'Hola', pasadas: 1, total: 1, minutos: 3 },
        { id: 'm3', titulo: 'Vocales', pasadas: 0, total: 2, minutos: 12 }] },
    { formato: 'esle2-entrega', titulo: 'Parcial 1', alumno: 'Ana', entregado: '2026-09-01T12:05:00Z',
      ejercicios: [
        { id: 'f1', titulo: 'Hola', pasadas: 1, total: 1, minutos: 2 },
        { id: 'm3', titulo: 'Vocales', pasadas: 2, total: 2, minutos: 9 }] }
  ];
  const p = Examen.planilla(entregas);
  comprobar('una columna por ejercicio', p.columnas.map(c => c.id), ['f1', 'm3']);
  comprobar('ordenada por nota', p.filas.map(f => [f.alumno, f.nota]), [['Ana', 100], ['Beto', 50]]);
  comprobar('minutos sumados', p.filas.map(f => f.minutos), [11, 15]);

  const csv = Examen.planillaCSV(p).split('\n');
  comprobar('cabecera del csv', csv[0], '"Alumno","Nota (%)","Resueltos","Minutos","Hola","Vocales"');
  comprobar('primera fila del csv', csv[1], '"Ana","100","2/2","11","1/1","2/2"');
  comprobar('el csv tiene una fila por entrega', csv.length, 3);

  /* si una entrega tiene un ejercicio que las otras no, igual entra */
  const mixtas = entregas.concat([{ formato: 'esle2-entrega', titulo: 'Parcial 1', alumno: 'Ceci',
    entregado: '2026-09-01T12:09:00Z',
    ejercicios: [{ id: 'a2', titulo: 'Ordenar', pasadas: 1, total: 1, minutos: 20 }] }]);
  const q = Examen.planilla(mixtas);
  comprobar('columnas de todas las entregas', q.columnas.map(c => c.id), ['f1', 'm3', 'a2']);
  comprobar('lo que no rindió queda vacío', Examen.planillaCSV(q).split('\n')[1].endsWith('"1/1","2/2",""'), true);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'hay pruebas fallidas');

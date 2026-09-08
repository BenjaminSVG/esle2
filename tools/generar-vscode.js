/*
 * Arma la extensión de VS Code a partir del intérprete de verdad.
 *
 *   node tools/generar-vscode.js
 *
 * Dos cosas, y las dos por la misma razón: que no existan dos versiones de SL.
 *
 *   1. copia js/sle2.js a vscode/sle2.js sin tocar nada. La extensión usa el
 *      mismo compilador que el sitio, así que nunca pueden dar veredictos
 *      distintos sobre el mismo programa;
 *   2. escribe la gramática del resaltado sacando las palabras reservadas y
 *      las subrutinas predefinidas del propio intérprete. Si mañana SL suma
 *      una palabra, se resalta sola.
 *
 * test/test-vscode.js comprueba que lo que hay en vscode/ es lo que saldría de
 * correr esto, igual que test-indice.js con el buscador.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const DESTINO = path.join(RAIZ, 'vscode');

global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
const SLE2 = global.SLE2;

/* Las palabras, separadas por lo que significan, que es lo que decide el
   color. Salen del intérprete menos las que se listan a mano acá, que son las
   que en SL cumplen un papel distinto del resto. */
const CONTROL = ['si', 'sino', 'mientras', 'repetir', 'hasta', 'desde', 'paso',
  'eval', 'caso', 'retorna', 'and', 'or', 'not'];
const TIPOS = ['numerico', 'cadena', 'logico', 'vector', 'matriz', 'registro'];
const CONSTANTES = ['TRUE', 'FALSE', 'SI', 'NO'];

const DECLARACION = [...SLE2.RESERVADAS]
  .filter(p => !CONTROL.includes(p) && !TIPOS.includes(p))
  .sort();

const PREDEFINIDAS = Object.keys(SLE2.PREDEF).sort();

const alternativa = lista => '\\b(?:' + lista.join('|') + ')\\b';

const gramatica = {
  $schema: 'https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json',
  name: 'SLE2',
  scopeName: 'source.sle2',
  patterns: [
    { include: '#comentarios' },
    { include: '#textos' },
    { include: '#numeros' },
    { include: '#control' },
    { include: '#declaracion' },
    { include: '#tipos' },
    { include: '#constantes' },
    { include: '#predefinidas' },
    { include: '#subrutinas' },
    { include: '#operadores' }
  ],
  repository: {
    comentarios: {
      patterns: [
        { name: 'comment.line.double-slash.sle2', match: '//.*$' },
        { name: 'comment.block.sle2', begin: '/\\*', end: '\\*/' }
      ]
    },
    /* SL admite comillas rectas y tipográficas: el material del curso usa las
       dos, y una cadena escrita con “ ” tiene que verse como cadena igual. */
    textos: {
      patterns: [
        { name: 'string.quoted.double.sle2', begin: '"', end: '["\u201d]',
          patterns: [{ name: 'constant.character.escape.sle2', match: '\\\\.' }] },
        { name: 'string.quoted.single.sle2', begin: "'", end: "['\u2019]",
          patterns: [{ name: 'constant.character.escape.sle2', match: '\\\\.' }] },
        { name: 'string.quoted.double.sle2', begin: '\u201c', end: '["\u201d]' }
      ]
    },
    numeros: {
      name: 'constant.numeric.sle2',
      match: '\\b\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?\\b'
    },
    control: { name: 'keyword.control.sle2', match: alternativa(CONTROL) },
    declaracion: { name: 'keyword.other.sle2', match: alternativa(DECLARACION) },
    tipos: { name: 'storage.type.sle2', match: alternativa(TIPOS) },
    constantes: { name: 'constant.language.sle2', match: alternativa(CONSTANTES) },
    predefinidas: {
      name: 'support.function.sle2',
      match: alternativa(PREDEFINIDAS) + '(?=\\s*\\()'
    },
    /* Cualquier otro nombre seguido de «(» es una subrutina del programa. */
    subrutinas: {
      name: 'entity.name.function.sle2',
      match: '\\b[A-Za-z_\u00f1\u00d1][A-Za-z0-9_\u00f1\u00d1]*(?=\\s*\\()'
    },
    operadores: {
      patterns: [
        { name: 'keyword.operator.comparison.sle2', match: '==|<>|!=|<=|>=|<|>' },
        { name: 'keyword.operator.assignment.sle2', match: '=' },
        { name: 'keyword.operator.arithmetic.sle2', match: '\\+|-|\\*|/|%|\\^' }
      ]
    }
  }
};

const config = {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [['{', '}'], ['[', ']'], ['(', ')']],
  autoClosingPairs: [
    { open: '{', close: '}' }, { open: '[', close: ']' }, { open: '(', close: ')' },
    { open: '"', close: '"', notIn: ['string'] }
  ],
  surroundingPairs: [['{', '}'], ['[', ']'], ['(', ')'], ['"', '"']],
  /* En SL se sangra dentro de las llaves, y con tres espacios, que es como
     está escrito todo el material de la materia. */
  indentationRules: {
    increaseIndentPattern: '\\{\\s*$',
    decreaseIndentPattern: '^\\s*\\}'
  }
};

function escribir(relativo, texto) {
  const p = path.join(DESTINO, relativo);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, texto);
  return p;
}

const copia = fs.readFileSync(path.join(RAIZ, 'js', 'sle2.js'), 'utf8');
escribir('sle2.js',
  '/* COPIA AUTOMÁTICA de js/sle2.js. No editar acá: correr node tools/generar-vscode.js */\n'
  + copia);
escribir('syntaxes/sle2.tmLanguage.json', JSON.stringify(gramatica, null, 2) + '\n');
escribir('language-configuration.json', JSON.stringify(config, null, 2) + '\n');

console.log('vscode/ al día: ' + DECLARACION.length + ' palabras reservadas, '
  + PREDEFINIDAS.length + ' subrutinas predefinidas.');

module.exports = { gramatica, config, copia };

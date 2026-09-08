/*
 * Prueba de la extensión de VS Code.
 *
 * Lo que más importa: que el compilador de la extensión sea EL MISMO que el
 * del sitio, byte por byte. Si se desincronizaran, la extensión diría que un
 * programa está bien y el sitio que está mal, y el alumno quedaría en el medio
 * sin forma de saber quién tiene razón.
 *
 *   node test/test-vscode.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
const SLE2 = global.SLE2;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);
const leer = r => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const hay = r => fs.existsSync(path.join(RAIZ, r));

(() => {
  /* ------------------------------------------------------------------ */
  seccion('Están todos los archivos');
  {
    for (const f of ['vscode/package.json', 'vscode/extension.js', 'vscode/correr.js',
      'vscode/sle2.js', 'vscode/syntaxes/sle2.tmLanguage.json',
      'vscode/language-configuration.json', 'vscode/README.md']) {
      comprobar(f + ' existe', hay(f));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Un solo compilador, no dos');
  {
    const original = leer('js/sle2.js');
    const copia = leer('vscode/sle2.js');
    comprobar('vscode/sle2.js es js/sle2.js sin tocar',
      copia.endsWith(original),
      'la copia tiene ' + copia.length + ' caracteres y el original ' + original.length);
    comprobar('y dice que es una copia, para que nadie la edite a mano',
      /COPIA AUTOMÁTICA de js\/sle2\.js/.test(copia.slice(0, 200)));

    /* Y que de verdad compile lo mismo. */
    delete global.SLE2;
    require(path.join(RAIZ, 'vscode', 'sle2.js'));
    const otro = global.SLE2;
    const programa = 'var\n   n : numerico\ninicio\n   leer (n)\n   imprimir (n * 2)\nfin\n';
    comprobar('los dos compilan el mismo programa igual',
      JSON.stringify(otro.compilar(programa)) === JSON.stringify(SLE2.compilar(programa)));

    const roto = 'inicio\n   si ( a = 5 )\n   {\n   }\nfin\n';
    const err = t => { try { t.compilar(roto); return null; } catch (e) { return e.message; } };
    comprobar('y dan el mismo error ante el mismo programa roto',
      err(otro) === err(SLE2) && !!err(SLE2), err(otro) + ' / ' + err(SLE2));
  }

  /* ------------------------------------------------------------------ */
  seccion('La gramática del resaltado');
  {
    const g = JSON.parse(leer('vscode/syntaxes/sle2.tmLanguage.json'));
    comprobar('el ámbito es el que declara package.json',
      g.scopeName === 'source.sle2'
      && JSON.parse(leer('vscode/package.json')).contributes.grammars[0].scopeName === 'source.sle2');

    const todo = JSON.stringify(g);
    /* Ninguna palabra reservada se puede quedar sin color: si falta una, se ve
       como una variable y el alumno no nota que la escribió mal. */
    for (const p of SLE2.RESERVADAS) {
      comprobar('la palabra «' + p + '» está en la gramática',
        todo.includes('|' + p + '|') || todo.includes('|' + p + ')') || todo.includes(':' + p + '|'));
    }
    /* Y las subrutinas del lenguaje también, o «imprimir» se vería igual que
       una subrutina cualquiera. */
    for (const p of ['imprimir', 'leer', 'substr', 'strlen', 'random', 'dibujar_pixel']) {
      if (!SLE2.PREDEF[p]) continue;
      comprobar('la subrutina «' + p + '» está en la gramática', todo.includes(p));
    }

    comprobar('los comentarios de bloque están', /comment\.block/.test(todo));
    comprobar('las comillas tipográficas también cierran una cadena',
      todo.includes('\\u201d') || /”/.test(todo));
    comprobar('«==» se distingue de «=»',
      /keyword\.operator\.comparison/.test(todo) && /keyword\.operator\.assignment/.test(todo));
  }

  /* ------------------------------------------------------------------ */
  seccion('El manifiesto');
  {
    const p = JSON.parse(leer('vscode/package.json'));
    comprobar('declara el lenguaje sle2', p.contributes.languages[0].id === 'sle2');
    comprobar('y las extensiones de archivo del curso',
      ['.sl', '.slp', '.sldb'].every(e => p.contributes.languages[0].extensions.includes(e)),
      JSON.stringify(p.contributes.languages[0].extensions));
    comprobar('tiene el comando de ejecutar',
      p.contributes.commands.some(c => c.command === 'sle2.ejecutar'));
    comprobar('el atajo es el mismo que en el sitio: Ctrl + Enter',
      p.contributes.keybindings.some(k => k.key === 'ctrl+enter'));
    comprobar('el archivo principal existe', hay('vscode/' + p.main.replace('./', '')));
    comprobar('no arrastra dependencias de npm',
      !p.dependencies || Object.keys(p.dependencies).length === 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('Correr desde la terminal');
  {
    const { execFileSync } = require('child_process');
    const tmp = path.join(require('os').tmpdir(), 'esle2-vscode-prueba.sl');
    fs.writeFileSync(tmp, 'var\n   a, b : numerico\ninicio\n   leer (a, b)\n   imprimir (a + b)\nfin\n');

    let salida = '';
    try {
      salida = execFileSync(process.execPath, [path.join(RAIZ, 'vscode', 'correr.js'), tmp],
        { input: '5,10\n', encoding: 'utf8', timeout: 20000 });
    } catch (e) { salida = 'FALLÓ: ' + (e.stderr || e.message); }
    comprobar('corre un programa y da el resultado', /15/.test(salida), salida.slice(-160));

    fs.writeFileSync(tmp, 'inicio\n   si ( a = 5 )\n   {\n   }\nfin\n');
    let err = '', codigo = 0;
    try {
      execFileSync(process.execPath, [path.join(RAIZ, 'vscode', 'correr.js'), tmp],
        { input: '', encoding: 'utf8', timeout: 20000 });
    } catch (e) { err = String(e.stderr || ''); codigo = e.status; }
    comprobar('un programa roto sale con error', codigo === 1, 'salió con ' + codigo);
    comprobar('y dice la línea', /línea 2/.test(err), err.slice(0, 120));
    comprobar('y la sugerencia, que es la mitad del valor',
      /Para comparar se usa/.test(err), err.slice(0, 200));

    fs.unlinkSync(tmp);
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'la extensión de VS Code tiene fallos');
})();

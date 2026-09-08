/*
 * SLE2 en Visual Studio Code.
 *
 * Es el MISMO compilador que corre en el navegador: js/sle2.js se copia acá tal
 * cual, sin tocar una línea. Eso importa más de lo que parece: si la extensión
 * tuviera su propio validador, tarde o temprano diría que algo está bien
 * cuando el sitio dice que está mal, y el alumno quedaría en el medio. Una sola
 * implementación, un solo veredicto.
 *
 * Lo que hace:
 *   · marca los errores de sintaxis mientras se escribe, en el lugar exacto;
 *   · agrega las recomendaciones del revisor como avisos;
 *   · ejecuta el programa en una terminal de VS Code, con la entrada por
 *     teclado andando.
 */
'use strict';
const vscode = require('vscode');
const path = require('path');

/* El intérprete se escribió para el navegador: se le da un «window» y listo.
   No toca el DOM en ningún momento, y por eso esto alcanza. */
global.window = global;
require('./sle2.js');
const SLE2 = global.SLE2;

let avisos;

function activate(contexto) {
  avisos = vscode.languages.createDiagnosticCollection('sle2');
  contexto.subscriptions.push(avisos);

  const revisar = doc => {
    if (!doc || doc.languageId !== 'sle2') return;
    const cfg = vscode.workspace.getConfiguration('sle2');
    if (!cfg.get('revisarAlEscribir')) { avisos.delete(doc.uri); return; }
    avisos.set(doc.uri, diagnosticos(doc, cfg.get('recomendaciones')));
  };

  contexto.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(e => revisar(e.document)),
    vscode.workspace.onDidOpenTextDocument(revisar),
    vscode.workspace.onDidCloseTextDocument(d => avisos.delete(d.uri)),
    vscode.commands.registerCommand('sle2.ejecutar', ejecutar),
    vscode.commands.registerCommand('sle2.revisar', () => {
      const ed = vscode.window.activeTextEditor;
      if (ed) { revisar(ed.document); vscode.commands.executeCommand('workbench.actions.view.problems'); }
    })
  );
  vscode.workspace.textDocuments.forEach(revisar);
}

/* Un error de SLE2, puesto donde VS Code lo espera. El compilador da la línea
   pero no la columna, así que se marca la línea entera sin los espacios de la
   sangría: subrayar el margen izquierdo no le dice nada a nadie. */
function rango(doc, linea) {
  const n = Math.max(0, Math.min((linea || 1) - 1, doc.lineCount - 1));
  const texto = doc.lineAt(n).text;
  const desde = texto.length - texto.replace(/^\s+/, '').length;
  return new vscode.Range(n, desde, n, Math.max(desde + 1, texto.length));
}

function diagnosticos(doc, conRecomendaciones) {
  const fuente = doc.getText();
  const salida = [];

  try {
    SLE2.compilar(fuente);
  } catch (e) {
    if (!(e instanceof SLE2.SLError)) throw e;
    const d = new vscode.Diagnostic(rango(doc, e.linea), e.message,
      vscode.DiagnosticSeverity.Error);
    d.source = 'SLE2';
    /* La sugerencia del compilador es la mitad del valor de sus errores: dice
       qué hacer, no solo qué está mal. Va como información relacionada para
       que se lea completa, con sus saltos de línea. */
    if (e.sugerencia) {
      d.relatedInformation = [new vscode.DiagnosticRelatedInformation(
        new vscode.Location(doc.uri, rango(doc, e.linea)), e.sugerencia)];
    }
    salida.push(d);
    return salida;      // sin compilar no hay nada más que revisar
  }

  if (conRecomendaciones) {
    let recomendaciones = [];
    try { recomendaciones = SLE2.revisar(fuente) || []; } catch (e) { /* no es grave */ }
    for (const a of recomendaciones) {
      const d = new vscode.Diagnostic(rango(doc, a.linea), a.mensaje,
        vscode.DiagnosticSeverity.Information);
      d.source = 'SLE2';
      salida.push(d);
    }
  }
  return salida;
}

/* Ejecutar: se corre en una terminal y no en la ventana de salida, porque los
   programas de SL leen del teclado y una ventana de salida no deja escribir. */
function ejecutar() {
  const ed = vscode.window.activeTextEditor;
  if (!ed || ed.document.languageId !== 'sle2') {
    vscode.window.showWarningMessage('Abrí un programa de SLE2 para ejecutarlo.');
    return;
  }
  ed.document.save().then(() => {
    const corredor = path.join(__dirname, 'correr.js');
    const t = vscode.window.terminals.find(x => x.name === 'SLE2')
      || vscode.window.createTerminal('SLE2');
    t.show();
    t.sendText(`node "${corredor}" "${ed.document.fileName}"`);
  });
}

function deactivate() { if (avisos) avisos.dispose(); }

module.exports = { activate, deactivate, diagnosticos };

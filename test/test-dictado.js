/*
 * Prueba del dictado: lo que se dice, escrito en SLE2.
 *
 * Además de que traduzca bien, importa que lo que escribe COMPILE: una línea
 * que suena bien pero no compila es peor que un «no te entendí», porque quien
 * dictó no la ve. Por eso al final se compila todo lo que se dictó.
 *
 *   node test/test-dictado.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'dictado.js'));
const { Dictado, SLE2 } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);
const c = frase => { const r = Dictado.aCodigo(frase); return r ? r.codigo : null; };

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('El ejemplo del pedido');
  {
    comprobar('«si x es mayor a 5 entonces»',
      c('si x es mayor a 5 entonces') === 'si ( x > 5 )\n{', JSON.stringify(c('si x es mayor a 5 entonces')));
    comprobar('abre bloque, para que la línea siguiente entre sangrada',
      Dictado.aCodigo('si x es mayor a 5 entonces').abre === true);
    comprobar('«que» y «a» valen lo mismo',
      c('si x es mayor que 5') === c('si x es mayor a 5'));
    comprobar('sin «entonces» también',
      c('si x es mayor a 5') === 'si ( x > 5 )\n{');
  }

  /* ------------------------------------------------------------------ */
  seccion('Las comparaciones');
  {
    const casos = [
      ['si a es igual a b', 'si ( a == b )\n{'],
      ['si a es distinto de b', 'si ( a <> b )\n{'],
      ['si a es mayor o igual que b', 'si ( a >= b )\n{'],
      ['si a es menor o igual que b', 'si ( a <= b )\n{'],
      ['si a es menor que b', 'si ( a < b )\n{']
    ];
    for (const [dicho, esperado] of casos) {
      comprobar('«' + dicho + '»', c(dicho) === esperado, c(dicho));
    }
    comprobar('«mayor o igual» le gana a «mayor»',
      !/> o igual/.test(c('si a es mayor o igual que b')), c('si a es mayor o igual que b'));
    comprobar('«es igual a» en una condición es «==», no «=»',
      c('si a es igual a b') === 'si ( a == b )\n{', c('si a es igual a b'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Y, o, no');
  {
    comprobar('«y» es and',
      c('si a es mayor que 1 y b es menor que 2') === 'si ( a > 1 and b < 2 )\n{',
      c('si a es mayor que 1 y b es menor que 2'));
    comprobar('«o» es or',
      /or/.test(c('si a es mayor que 1 o b es menor que 2')),
      c('si a es mayor que 1 o b es menor que 2'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Asignar');
  {
    comprobar('«n recibe n más 1»', c('n recibe n mas 1') === 'n = n + 1', c('n recibe n mas 1'));
    comprobar('con tilde en «más» también', c('n recibe n más 1') === 'n = n + 1');
    comprobar('«la variable total vale 0»',
      c('la variable total vale 0') === 'total = 0', c('la variable total vale 0'));
    comprobar('«asignar 10 a x»', c('asignar 10 a x') === 'x = 10', c('asignar 10 a x'));
    comprobar('«sumale 1 a n»', c('sumale 1 a n') === 'n = n + 1', c('sumale 1 a n'));
    comprobar('«restale 2 a total»', c('restale 2 a total') === 'total = total - 2', c('restale 2 a total'));
    comprobar('al asignar, «es igual a» es «=» y no «==»',
      c('x es igual a 5') === 'x = 5', c('x es igual a 5'));
    comprobar('las cuentas',
      c('x recibe a por b dividido 2') === 'x = a * b / 2', c('x recibe a por b dividido 2'));
    comprobar('el resto', c('x recibe n resto de 2') === 'x = n % 2', c('x recibe n resto de 2'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Números dichos con palabras');
  {
    comprobar('«cinco» es 5', Dictado.numero('cinco') === 5);
    comprobar('«treinta y cinco» es 35', Dictado.numero('treinta y cinco') === 35);
    comprobar('«5» es 5', Dictado.numero('5') === 5);
    comprobar('«hola» no es un número', Dictado.numero('hola') === null);
    comprobar('en una frase también',
      c('x recibe cinco') === 'x = 5', c('x recibe cinco'));
    comprobar('«desde i igual a uno hasta diez»',
      c('desde i igual a uno hasta diez') === 'desde i = 1 hasta 10\n{',
      c('desde i igual a uno hasta diez'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Entrada y salida');
  {
    comprobar('«mostrar el texto hola mundo»',
      c('mostrar el texto hola mundo') === 'imprimir ("hola mundo")', c('mostrar el texto hola mundo'));
    comprobar('«mostrar la variable total»',
      c('mostrar la variable total') === 'imprimir (total)', c('mostrar la variable total'));
    comprobar('una sola palabra se toma como variable',
      c('mostrar total') === 'imprimir (total)', c('mostrar total'));
    comprobar('varias palabras, como texto',
      c('mostrar hola que tal') === 'imprimir ("hola que tal")', c('mostrar hola que tal'));
    comprobar('«mostrar un renglón»',
      c('mostrar un renglon') === 'imprimir ("\\n")', c('mostrar un renglon'));
    comprobar('«leer a y b»', c('leer a y b') === 'leer (a, b)', c('leer a y b'));
    comprobar('«leer n»', c('leer n') === 'leer (n)', c('leer n'));
    comprobar('«limpiar la pantalla»', c('limpiar la pantalla') === 'cls ()', c('limpiar la pantalla'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Estructura');
  {
    comprobar('«inicio»', c('inicio') === 'inicio');
    comprobar('«fin»', c('fin') === 'fin');
    comprobar('«sino»', c('sino') === 'sino');
    comprobar('«cerrar» cierra el bloque', c('cerrar') === '}');
    comprobar('«fin del si» también', c('fin del si') === '}');
    comprobar('«mientras n es menor que 10»',
      c('mientras n es menor que 10') === 'mientras ( n < 10 )\n{', c('mientras n es menor que 10'));
    comprobar('«a y b de tipo numerico»',
      c('a y b de tipo numerico') === 'a, b : numerico', c('a y b de tipo numerico'));
    comprobar('un comentario', c('comentario aca empieza la suma') === '// aca empieza la suma');
  }

  /* ------------------------------------------------------------------ */
  seccion('Cuando no entiende, lo dice');
  {
    comprobar('una frase cualquiera da null', Dictado.aCodigo('qué hora es') === null);
    comprobar('vacío da null', Dictado.aCodigo('') === null);
    comprobar('null da null', Dictado.aCodigo(null) === null);
    comprobar('no inventa una línea', Dictado.aCodigo('ammm este') === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo dictado tiene que compilar');
  {
    /* Un programa entero dictado frase por frase. Si esto no compila, el
       dictado estaría escribiendo algo que no sirve. */
    const dictado = [
      'variables',
      'n y total de tipo numerico',
      'i de tipo numerico',
      'inicio',
      'total recibe 0',
      'leer n',
      'desde i igual a 1 hasta n',
      'sumale i a total',
      'cerrar',
      'si total es mayor que 100 entonces',
      'mostrar el texto pasaste de cien',
      'sino',
      'mostrar la variable total',
      'cerrar',
      'fin'
    ];

    let nivel = 0;
    const lineas = [];
    let entendio = 0;
    for (const frase of dictado) {
      const r = Dictado.aCodigo(frase);
      if (!r) { lineas.push('// no entendió: ' + frase); continue; }
      entendio++;
      if (r.codigo === '}' || r.codigo === 'sino' || r.codigo === 'fin') nivel = Math.max(0, nivel - 1);
      for (const l of r.codigo.split('\n')) {
        lineas.push('   '.repeat(nivel) + l);
        if (l === '{') nivel++;
      }
      if (r.codigo === 'inicio' || r.codigo === 'sino') nivel++;
    }
    const fuente = lineas.join('\n') + '\n';

    comprobar('entendió las 15 frases', entendio === dictado.length, entendio + ' de ' + dictado.length + '\n' + fuente);

    let error = null;
    try { SLE2.compilar(fuente); } catch (e) { error = e; }
    comprobar('y el programa dictado compila', !error,
      (error && error.linea + ': ' + error.message) + '\n' + fuente);

    /* Y corre de verdad: con n = 4, total = 10. */
    if (!error) {
      let salida = '';
      const io = {
        archivos: new Map(), argumentos: [],
        imprimir: t => { salida += t; }, limpiar: () => { salida = ''; },
        finEntrada: () => false, leerLinea: async () => '4',
        setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
        setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
        getScrsize: () => ({ lineas: 25, columnas: 80 }),
        beep: async () => {}, leerTecla: async () => 0
      };
      await SLE2.ejecutar(SLE2.compilar(fuente), io, {});
      comprobar('y da el resultado correcto: 1+2+3+4 = 10', salida.trim() === '10', JSON.stringify(salida));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Los ejemplos que se muestran en pantalla son ciertos');
  {
    for (const [dicho, esperado] of Dictado.EJEMPLOS) {
      const r = c(dicho);
      const primera = r ? r.split('\n')[0] : null;
      comprobar('«' + dicho + '» → ' + esperado, primera === esperado, r);
    }
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el dictado tiene fallos');
})();

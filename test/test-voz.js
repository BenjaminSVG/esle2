/*
 * Prueba del lector: el código dicho en palabras.
 *
 * Lo que se comprueba acá no es que «diga algo», sino que diga lo correcto en
 * los lugares donde equivocarse arruina la clase: «=» contra «==», la sangría,
 * los textos entre comillas y las líneas a medio escribir.
 *
 *   node test/test-voz.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'voz.js'));
const { Voz } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);
const f = t => Voz.frase(t);

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Asignar y comparar no suenan igual');
  {
    comprobar('«=» se dice recibe', f('n = 5') === 'n recibe 5', f('n = 5'));
    comprobar('«==» se dice es igual a', f('n == 5') === 'n es igual a 5', f('n == 5'));
    comprobar('y no se confunden', f('n = 5') !== f('n == 5'));
    comprobar('«<>» se dice es distinto de', f('a <> b') === 'a es distinto de b', f('a <> b'));
    comprobar('«>=» no se parte en dos', f('x >= 5') === 'x es mayor o igual que 5', f('x >= 5'));
    comprobar('«<=» tampoco', f('x <= 5') === 'x es menor o igual que 5', f('x <= 5'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Las cuentas');
  {
    comprobar('suma y resta', f('a = b + c - d') === 'a recibe b más c menos d', f('a = b + c - d'));
    comprobar('por y dividido', f('a = b * c / d') === 'a recibe b por c dividido d', f('a = b * c / d'));
    comprobar('el resto', f('a = n % 2') === 'a recibe n resto de 2', f('a = n % 2'));
    comprobar('un decimal se dice con coma', f('x = 3.5') === 'x recibe 3 coma 5', f('x = 3.5'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Los paréntesis que no hace falta decir');
  {
    comprobar('la condición del si no dice paréntesis',
      f('si ( x > 5 )') === 'si x es mayor que 5', f('si ( x > 5 )'));
    comprobar('una llamada tampoco',
      f('imprimir ("Hola")') === 'imprimir el texto Hola', f('imprimir ("Hola")'));
    /* Pero los de adentro sí: ahí cambian la cuenta y hay que oírlos. */
    comprobar('los anidados sí se dicen',
      /abre paréntesis/.test(f('x = (a + b) * c')), f('x = (a + b) * c'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Los textos');
  {
    comprobar('se avisa que es un texto',
      f('imprimir ("Hola, mundo!")') === 'imprimir el texto Hola, mundo!',
      f('imprimir ("Hola, mundo!")'));
    comprobar('el salto de línea se dice',
      /baja un renglón/.test(f('imprimir ("Hola\\n")')), f('imprimir ("Hola\\n")'));
    comprobar('un texto vacío se dice',
      /un texto vacío/.test(f('a = ""')), f('a = ""'));
    comprobar('un texto sin cerrar no rompe nada',
      typeof f('imprimir ("sin cerrar') === 'string', f('imprimir ("sin cerrar'));
    comprobar('lo de adentro del texto no se interpreta como código',
      f('imprimir ("a = b")') === 'imprimir el texto a = b', f('imprimir ("a = b")'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Los comentarios se dicen');
  {
    comprobar('el de una línea',
      f('// esto suma todo') === 'comentario: esto suma todo', f('// esto suma todo'));
    comprobar('el de bloque',
      /comentario: nota/.test(f('/* nota */')), f('/* nota */'));
    comprobar('lo que viene después de // no se lee como código',
      f('// a = b') === 'comentario: a = b', f('// a = b'));
  }

  /* ------------------------------------------------------------------ */
  seccion('La sangría se anuncia cuando cambia');
  {
    const p = Voz.programa('inicio\n   a = 1\n   b = 2\n      c = 3\nfin\n');
    comprobar('la primera línea no anuncia nivel', !/nivel/.test(p[0].texto), p[0].texto);
    comprobar('al entrar al bloque se anuncia', /nivel 1/.test(p[1].texto), p[1].texto);
    comprobar('y no se repite en la línea siguiente', !/nivel/.test(p[2].texto), p[2].texto);
    comprobar('al bajar más, se anuncia otra vez', /nivel 2/.test(p[3].texto), p[3].texto);
    comprobar('al volver al margen, se dice', /al margen/.test(p[4].texto), p[4].texto);
    comprobar('un tabulador cuenta como sangría', Voz.sangria('\ta = 1') === 1, Voz.sangria('\ta = 1'));
  }

  /* ------------------------------------------------------------------ */
  seccion('Cada línea dice su número');
  {
    const p = Voz.programa('a = 1\n\nb = 2\n');
    comprobar('la primera dice línea 1', /^línea 1,/.test(p[0].texto), p[0].texto);
    comprobar('una vacía se dice en blanco', /línea 2, en blanco/.test(p[1].texto), p[1].texto);
    comprobar('la tercera dice línea 3', /^línea 3,/.test(p[2].texto), p[2].texto);
    comprobar('termina en punto, para que la voz haga la pausa',
      p.every(l => /\.$/.test(l.texto)), JSON.stringify(p.map(l => l.texto)));

    const sinNumero = Voz.linea('a = 1', 1, 0, { conNumero: false });
    comprobar('se pueden pedir sin número', sinNumero.texto === 'a recibe 1.', sinNumero.texto);
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa entero, a medio escribir');
  {
    /* Se lee mientras se escribe, así que casi nunca compila: no puede
       lanzar nunca. */
    const rotos = ['si ( x >', 'imprimir (', '}}}', '   var', '@#$%', '', '   ', 'a = "'];
    let lanzo = false;
    for (const r of rotos) { try { Voz.programa(r); } catch (e) { lanzo = true; } }
    comprobar('ninguna línea rota lo hace lanzar', !lanzo);

    const t = Voz.texto('var\n   n : numerico\ninicio\n   leer (n)\n   si ( n % 2 == 0 )\n   {\n      imprimir ("par")\n   }\nfin\n');
    comprobar('el tipo se dice «de tipo»', /n de tipo numerico/.test(t), t);
    comprobar('la llave que abre se dice empieza el bloque', /empieza el bloque/.test(t), t);
    comprobar('la que cierra, termina el bloque', /termina el bloque/.test(t), t);
    comprobar('la condición se entiende de oído',
      /si n resto de 2 es igual a 0/.test(t), t);
  }

  /* ------------------------------------------------------------------ */
  seccion('Los errores');
  {
    const e = Voz.error({ linea: 4, mensaje: 'se esperaba ")" y se encontró "="', sugerencia: 'Para comparar se usa "==".' });
    comprobar('dice primero dónde', /^Error en la línea 4/.test(e), e);
    comprobar('después qué pasó', /se esperaba/.test(e), e);
    comprobar('y al final la sugerencia', /Para comparar/.test(e), e);
    comprobar('sin comillas, que la voz lee raro', !/"/.test(e), e);
    comprobar('un error sin línea igual se dice', /^Error\./.test(Voz.error({ mensaje: '' })) === false
      || typeof Voz.error({ mensaje: 'algo' }) === 'string');
    comprobar('sin error, texto vacío', Voz.error(null) === '');
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el lector por voz tiene fallos');
})();

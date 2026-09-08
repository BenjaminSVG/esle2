/*
 * Prueba del simulador de memoria (js/memoria.js).
 *
 * Todo lo importante del simulador es cálculo: qué caja existe en cada paso,
 * en qué dirección, cuánto ocupa y qué cambió respecto del paso anterior. Eso
 * se puede probar sin navegador, que es de lo que se trata acá.
 *   node test/test-memoria.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
global.document = undefined;
require(path.join(__dirname, '..', 'js', 'sle2.js'));
require(path.join(__dirname, '..', 'js', 'sle2poo.js'));
require(path.join(__dirname, '..', 'js', 'depurador.js'));
require(path.join(__dirname, '..', 'js', 'memoria.js'));
require(path.join(__dirname, '..', 'js', 'ejercicios.js'));
const { SLE2, SLE2POO, Memoria } = global;
const SOLUCIONES = require('./soluciones-curso.js');

let ok = 0, fallos = 0;
function comprobar(que, cond, det) {
  if (cond) { ok++; return; }
  fallos++;
  console.log(`  ✘ ${que}${det ? '\n    ' + det : ''}`);
}

const grabar = (fuente, op) => Memoria.grabar(fuente, op);
const caja = (foto, marco, nombre) => {
  const m = foto.marcos.find(x => x.id === marco);
  return m && m.celdas.find(c => c.nombre === nombre);
};
const frases = (a, b) => Memoria.narrar(a, b).join(' | ');

(async () => {

/* ------------------------- tamaños y direcciones ----------------------- */
{
  comprobar('un número ocupa 8 bytes', Memoria.bytes(3.5) === 8);
  comprobar('un lógico ocupa 1', Memoria.bytes(true) === 1);
  comprobar('una cadena ocupa las letras más el cierre', Memoria.bytes('hola') === 5);
  comprobar('un vector suma sus casillas', Memoria.bytes([1, 2, 3]) === 24);
  comprobar('las direcciones salen en hexadecimal', Memoria.hex(0x1000) === '0x1000');
}

/* --------------------------- fotos del programa ------------------------ */
{
  const { fotos, error } = await grabar(`var
   n = 0
   msg = "hola"
inicio
   n = 5
   n = n + 1
fin`);
  comprobar('no hubo error', !error, error && error.message);
  comprobar('hay una foto por sentencia más la final', fotos.length === 3, `fotos=${fotos.length}`);

  const p = fotos[0];
  comprobar('las globales están en el primer marco', p.marcos[0].zona === 'globales');
  comprobar('no se muestran TRUE/FALSE/SI/NO',
    !p.marcos[0].celdas.some(c => ['TRUE', 'FALSE', 'SI', 'NO'].includes(c.nombre)));
  comprobar('la primera caja arranca en 0x1000', caja(p, 'g', 'n').dir === '0x1000');
  comprobar('la segunda va después de los 8 bytes de la primera',
    caja(p, 'g', 'msg').dir === '0x1008', caja(p, 'g', 'msg').dir);
  comprobar('la caja conoce su tipo', caja(p, 'g', 'n').tipo === 'numerico');
  comprobar('y su valor', caja(p, 'g', 'n').valor === '0');

  comprobar('el valor cambia entre fotos', caja(fotos[1], 'g', 'n').valor === '5');
  comprobar('y otra vez en la última', caja(fotos[2], 'g', 'n').valor === '6');

  const c = Memoria.cambios(fotos[0], fotos[1]);
  comprobar('el cambio se detecta', c.modificadas.join() === 'g::n', c.modificadas.join());
  comprobar('y nada se creó ni se liberó', !c.creadas.length && !c.liberadas.length);
  comprobar('la narración dice de cuánto a cuánto',
    frases(fotos[0], fotos[1]).includes('«n» (0x1000) pasa de 0 a 5'), frases(fotos[0], fotos[1]));
}

/* ------------------------ la pila: llamar y volver --------------------- */
{
  const { fotos } = await grabar(`var
   r = 0
inicio
   r = doble (4)
   r = r + 0
fin
subrutina doble (x : numerico) retorna numerico
var
   y = 0
inicio
   y = x * 2
   retorna y
fin`);
  const conMarco = fotos.filter(f => f.marcos.length > 1);
  comprobar('mientras corre la subrutina hay un marco de pila', conMarco.length >= 2,
    `${conMarco.length} fotos con marco`);

  const dentro = conMarco[0];
  comprobar('el marco se llama como la subrutina', dentro.marcos[1].titulo.startsWith('doble'));
  comprobar('el parámetro está en el marco', !!caja(dentro, 'p0', 'x'));
  comprobar('la pila arranca en 0x7F00', caja(dentro, 'p0', 'x').dir === '0x7F00',
    caja(dentro, 'p0', 'x').dir);
  comprobar('el parámetro trae el argumento', caja(dentro, 'p0', 'x').valor === '4');

  const antes = fotos[fotos.indexOf(dentro) - 1];
  comprobar('se narra la apertura del marco',
    frases(antes, dentro).includes('se abre su marco en la pila'), frases(antes, dentro));

  const iDentro = fotos.indexOf(conMarco[conMarco.length - 1]);
  const salida = fotos[iDentro + 1];
  comprobar('al volver, el marco desapareció', salida.marcos.length === 1);
  comprobar('y se narra la liberación',
    frases(conMarco[conMarco.length - 1], salida).includes('se liberan las'),
    frases(conMarco[conMarco.length - 1], salida));
  comprobar('la última foto está marcada como final', fotos[fotos.length - 1].fin === true);
}

/* --------------------------- ref y recursión --------------------------- */
{
  const { fotos } = await grabar(`var
   a = 1
inicio
   cambiar (a)
fin
subrutina cambiar (ref v : numerico)
inicio
   v = 99
fin`);
  const dentro = fotos.find(f => f.marcos.length > 1);
  comprobar('un parámetro por referencia se marca como tal', caja(dentro, 'p0', 'v').ref === true);
  const fin = fotos[fotos.length - 1];
  comprobar('y escribir en él cambia la caja del que llamó', caja(fin, 'g', 'a').valor === '99');
}
{
  const { fotos } = await grabar(`inicio
   cuenta (3)
fin
subrutina cuenta (n : numerico)
inicio
   si ( n > 0 )
   {
      cuenta (n - 1)
   }
fin`);
  const hondo = fotos.reduce((m, f) => Math.max(m, f.marcos.length), 0);
  comprobar('la recursión apila varios marcos', hondo === 5, `profundidad ${hondo}`);
  const f = fotos.find(x => x.marcos.length === 5);
  comprobar('cada marco está más abajo que el anterior',
    caja(f, 'p0', 'n').dir === '0x7F00' && caja(f, 'p1', 'n').dir === '0x7E00' &&
    caja(f, 'p3', 'n').dir === '0x7C00',
    [0, 1, 3].map(i => caja(f, 'p' + i, 'n').dir).join(' '));
  comprobar('y cada uno tiene su propio n',
    caja(f, 'p0', 'n').valor === '3' && caja(f, 'p3', 'n').valor === '0');
}

/* ------------------------ vectores y registros ------------------------- */
{
  const { fotos } = await grabar(`var
   v : vector [4] numerico
   p : registro { nombre : cadena; edad : numerico }
inicio
   v[2] = 7
   p.edad = 30
fin`);
  const fin = fotos[fotos.length - 1];
  const cv = caja(fin, 'g', 'v');
  comprobar('un vector se dibuja por casillas', cv.forma === 'vector' && cv.casillas.length === 4);
  comprobar('la casilla 2 es la segunda del dibujo', cv.casillas[1] === '7', cv.casillas.join());
  comprobar('el vector ocupa lo que suman sus casillas', cv.bytes === 32, String(cv.bytes));
  const cp = caja(fin, 'g', 'p');
  comprobar('un registro se dibuja por campos', cp.forma === 'registro' && cp.campos.length === 2);
  comprobar('con su valor adentro', cp.campos[1].valor === '30');
}

/* ------------------------- objetos: el montículo ----------------------- */
{
  const { fotos, error } = await grabar(`clase PUNTO
{
   atributos
      x = 0
      y = 0

   constructor (a : numerico; b : numerico)
   inicio
      este.x = a
      este.y = b
   fin

   metodo mover (a : numerico)
   inicio
      este.x = a
   fin
}

var
   p : PUNTO
inicio
   p = nuevo PUNTO (3, 4)
   p.mover (10)
fin`, { ejecutar: SLE2POO.ejecutar });
  comprobar('el programa de objetos corre', !error, error && error.message);
  const fin = fotos[fotos.length - 1];
  comprobar('el objeto vive en el montículo', fin.monton.length === 1);
  comprobar('con dirección propia', /^0x[0-9A-F]{4}$/.test(fin.monton[0].dir));
  comprobar('y sus atributos adentro', fin.monton[0].campos.length === 2);
  const cp = caja(fin, 'g', 'p');
  comprobar('la variable solo apunta al objeto', cp.forma === 'objeto' && cp.apunta === fin.monton[0].id);
  comprobar('y por eso ocupa 4 bytes', cp.bytes === 4);
  comprobar('el atributo modificado se ve', fin.monton[0].campos[0].valor === '10',
    JSON.stringify(fin.monton[0].campos));

  const nacio = fotos.find((f, i) => i && f.monton.length && !fotos[i - 1].monton.length);
  const antes = fotos[fotos.indexOf(nacio) - 1];
  comprobar('se narra el nacimiento del objeto',
    frases(antes, nacio).includes('Nace el objeto PUNTO'), frases(antes, nacio));
}

/* --------------------------- casos de borde ---------------------------- */
{
  const { fotos, cortado } = await grabar(`var
   i = 0
inicio
   mientras ( i < 1000 )
   {
      i = i + 1
   }
fin`, { maxPasos: 25 });
  comprobar('la grabación se corta en el tope pedido', cortado && fotos.length === 25,
    `${fotos.length} fotos, cortado=${cortado}`);
}
{
  const { error, fotos } = await grabar(`var
   n = 0
inicio
   n = 1
   n = n / 0
fin`);
  comprobar('un error de ejecución se devuelve, no se tira', !!error);
  comprobar('y las fotos de antes del error se conservan', fotos.length >= 2);
}
{
  const { fotos, salida } = await grabar(`var
   n = 0
inicio
   leer (n)
   imprimir ("leido ", n)
fin`, { entrada: '42' });
  comprobar('leer() consume la entrada dada', caja(fotos[fotos.length - 1], 'g', 'n').valor === '42');
  comprobar('y la salida queda guardada', salida === 'leido 42', salida);
}

/* ------------------- todo el curso, sin romperse ----------------------- */
{
  let malos = 0, total = 0, maxFotos = 0;
  for (const [id, fuente] of Object.entries(SOLUCIONES)) {
    total++;
    try {
      const { fotos } = await grabar(fuente, { maxPasos: 60, entrada: '5\n3\n1\n2\n4\nhola\nchau\n' });
      if (!fotos.length) throw new Error('ninguna foto');
      maxFotos = Math.max(maxFotos, fotos.length);
      for (const f of fotos) {
        for (const m of f.marcos)
          for (const c of m.celdas) {
            if (!/^0x[0-9A-F]{4}$/.test(c.dir)) throw new Error('dirección rara: ' + c.dir);
            if (!(c.bytes >= 0)) throw new Error('tamaño raro en ' + c.nombre);
            if (c.valor === undefined) throw new Error('valor sin texto en ' + c.nombre);
          }
        if (!(f.total >= 0)) throw new Error('total raro');
      }
      /* La narración de cada salto tiene que poder escribirse sin reventar. */
      for (let i = 1; i < fotos.length; i++) Memoria.narrar(fotos[i - 1], fotos[i]);
    } catch (e) {
      malos++;
      console.log(`  ✘ ejercicio ${id}: ${e.message}`);
    }
  }
  comprobar(`las ${total} soluciones del curso se graban`, malos === 0, `${malos} fallaron`);
  comprobar('y alguna llega al tope de pasos', maxFotos === 60, `máximo ${maxFotos}`);
}

console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
assert.strictEqual(fallos, 0, 'el simulador de memoria tiene fallos');
})();

/*
 * Prueba de las batallas.
 *
 * Todo lo que decide la partida se calcula en las dos máquinas por separado y
 * sin servidor. Así que lo que se prueba acá es que las dos cuentas den SIEMPRE
 * lo mismo: si no, uno de los dos vería otro ejercicio, u otro ganador, y la
 * batalla no tendría sentido.
 *
 *   node test/test-duelo.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'duelo.js'));
const { Duelo } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

(() => {
  /* ------------------------------------------------------------------ */
  seccion('El código de la batalla');
  {
    const c = Duelo.crearCodigo();
    comprobar('es corto y se puede dictar', /^[A-Z]+-\d{3}$/.test(c), c);

    const muchos = new Set();
    for (let i = 0; i < 300; i++) muchos.add(Duelo.crearCodigo());
    comprobar('no salen todos iguales', muchos.size > 250, muchos.size + ' de 300');

    /* Del código salen la sala y la contraseña, y tienen que salir IGUALES en
       las dos computadoras: si no, no se encuentran. */
    const a = Duelo.sala('RIO-482');
    const b = Duelo.sala('rio-482');
    comprobar('mayúsculas o minúsculas dan la misma sala', a.sala === b.sala, a.sala + ' / ' + b.sala);
    comprobar('y la misma contraseña', a.clave === b.clave);
    comprobar('un código con espacios de más también',
      Duelo.sala(' RIO-482 ').sala === a.sala);
    comprobar('dos códigos distintos, salas distintas',
      Duelo.sala('SOL-100').sala !== a.sala);
    comprobar('la contraseña no es el código pelado',
      a.clave.indexOf('RIO-482') < 0 && a.clave.length > 10, a.clave);
  }

  /* ------------------------------------------------------------------ */
  seccion('Quién contra quién');
  {
    /* La clave: las dos máquinas reciben la lista en cualquier orden y tienen
       que emparejar igual. */
    const unos = Duelo.emparejar(['ana', 'beto', 'cata', 'dani']);
    const otros = Duelo.emparejar(['dani', 'ana', 'cata', 'beto']);
    comprobar('el orden en que llegan no cambia las parejas',
      JSON.stringify(unos.parejas) === JSON.stringify(otros.parejas),
      JSON.stringify(unos.parejas) + '\n' + JSON.stringify(otros.parejas));
    comprobar('con cuatro personas salen dos parejas', unos.parejas.length === 2);
    comprobar('y nadie queda libre', unos.libres.length === 0);

    const impar = Duelo.emparejar(['ana', 'beto', 'cata']);
    comprobar('con tres, una pareja y uno esperando',
      impar.parejas.length === 1 && impar.libres.length === 1, JSON.stringify(impar));

    comprobar('cada uno sabe contra quién juega',
      Duelo.rivalDe('ana', ['ana', 'beto']) === 'beto'
      && Duelo.rivalDe('beto', ['ana', 'beto']) === 'ana');
    comprobar('el que quedó libre no tiene rival',
      Duelo.rivalDe('cata', ['ana', 'beto', 'cata']) === null);
    comprobar('con una sola persona, tampoco',
      Duelo.rivalDe('ana', ['ana']) === null && Duelo.emparejar(['ana']).parejas.length === 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('Qué ejercicio toca');
  {
    const lista = [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }, { id: 'm1' }, { id: 'm2' }];
    const uno = Duelo.elegirEjercicio('RIO-482/1', lista);
    const otro = Duelo.elegirEjercicio('RIO-482/1', lista);
    comprobar('las dos máquinas eligen el mismo', uno.id === otro.id, uno.id + ' / ' + otro.id);
    comprobar('otra ronda, otro ejercicio (casi siempre)',
      Duelo.elegirEjercicio('RIO-482/2', lista).id !== undefined);
    comprobar('sin ejercicios devuelve null', Duelo.elegirEjercicio('x', []) === null);

    /* Con muchas rondas tiene que recorrer la lista, no quedarse en uno. */
    const vistos = new Set();
    for (let i = 0; i < 40; i++) vistos.add(Duelo.elegirEjercicio('RIO-482/' + i, lista).id);
    comprobar('a lo largo de varias rondas no repite siempre el mismo',
      vistos.size >= 3, [...vistos].join(', '));
  }

  /* ------------------------------------------------------------------ */
  seccion('Quién ganó');
  {
    comprobar('el primero que terminó', Duelo.ganador({ ana: 1000, beto: 2000 }) === 'ana');
    comprobar('aunque llegue anotado al revés', Duelo.ganador({ beto: 2000, ana: 1000 }) === 'ana');
    comprobar('si no terminó nadie, no hay ganador', Duelo.ganador({}) === null);
    comprobar('ni con marcas que no son números', Duelo.ganador({ ana: null }) === null);
    comprobar('uno solo termina y gana', Duelo.ganador({ beto: 5 }) === 'beto');

    /* El caso raro pero posible: los dos al mismo milisegundo. Las dos
       máquinas tienen que decidir lo mismo. */
    const a = Duelo.ganador({ ana: 7000, beto: 7000 });
    const b = Duelo.ganador({ beto: 7000, ana: 7000 });
    comprobar('un empate exacto se resuelve igual en las dos máquinas', a === b, a + ' / ' + b);
  }

  /* ------------------------------------------------------------------ */
  seccion('Los puntos');
  {
    comprobar('ganar suma 3', Duelo.puntos({ jugo: true, gano: true }) === 3);
    comprobar('resolverlo sin llegar primero suma 2', Duelo.puntos({ jugo: true, resolvio: true }) === 2);
    comprobar('jugar y no resolverlo suma 1', Duelo.puntos({ jugo: true }) === 1);
    comprobar('no jugar no suma', Duelo.puntos({ jugo: false }) === 0);
    comprobar('nunca resta', [
      { jugo: true, gano: true }, { jugo: true, resolvio: true }, { jugo: true }, {}
    ].every(r => Duelo.puntos(r) >= 0));

    let p = Duelo.perfilVacio();
    comprobar('el perfil arranca en cero', p.puntos === 0 && p.jugadas === 0 && p.mejorSegundos === null);

    p = Duelo.sumar(p, { jugo: true, gano: true, segundos: 90 });
    comprobar('una victoria se anota', p.puntos === 3 && p.ganadas === 1 && p.jugadas === 1, JSON.stringify(p));
    comprobar('y guarda el tiempo', p.mejorSegundos === 90);

    p = Duelo.sumar(p, { jugo: true, resolvio: true, segundos: 60 });
    comprobar('un mejor tiempo lo reemplaza', p.mejorSegundos === 60, JSON.stringify(p));

    p = Duelo.sumar(p, { jugo: true, resolvio: true, segundos: 200 });
    comprobar('uno peor no', p.mejorSegundos === 60);

    p = Duelo.sumar(p, { jugo: true });
    comprobar('perder sin resolver suma 1 igual', p.puntos === 3 + 2 + 2 + 1, p.puntos);
    comprobar('y cuenta como jugada', p.jugadas === 4);
    comprobar('pero no como resuelta', p.resueltas === 3, p.resueltas);

    const antes = JSON.stringify(p);
    comprobar('sumar algo que no se jugó no cambia nada',
      JSON.stringify(Duelo.sumar(p, { jugo: false })) === antes);
    comprobar('un perfil roto no rompe la cuenta',
      Duelo.sumar(null, { jugo: true, gano: true }).puntos === 3);
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'las batallas tienen fallos');
})();

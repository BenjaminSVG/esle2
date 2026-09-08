/*
 * Prueba de la transmisión en vivo.
 *
 * Lo que importa acá es que el enlace sea lo que uno espera: dictable, sin
 * acentos, y que la MISMA dirección lleve siempre a la misma transmisión
 * calculada en las dos computadoras por separado, que es lo que hace que esto
 * ande sin ningún servidor de ESLE2 en el medio.
 *
 *   node test/test-vivo.js
 */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'vivo.js'));
const { Vivo } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

(() => {
  /* ------------------------------------------------------------------ */
  seccion('El nombre que entra en la dirección');
  {
    comprobar('lo simple queda igual', Vivo.limpiarNombre('juan') === 'juan');
    comprobar('las mayúsculas bajan', Vivo.limpiarNombre('JUAN') === 'juan');
    comprobar('los acentos se van', Vivo.limpiarNombre('José Pérez') === 'jose-perez',
      Vivo.limpiarNombre('José Pérez'));
    comprobar('la eñe también', Vivo.limpiarNombre('Ñandú') === 'nandu', Vivo.limpiarNombre('Ñandú'));
    comprobar('los espacios se vuelven guiones', Vivo.limpiarNombre('3 ro B') === '3-ro-b',
      Vivo.limpiarNombre('3 ro B'));
    comprobar('no queda un guion colgando', Vivo.limpiarNombre('  juan  ') === 'juan',
      JSON.stringify(Vivo.limpiarNombre('  juan  ')));
    comprobar('los guiones repetidos se juntan', Vivo.limpiarNombre('a---b') === 'a-b',
      Vivo.limpiarNombre('a---b'));

    /* Nada de lo que se escriba puede salir de estos caracteres: el nombre va
       a parar a una dirección y a un nombre de sala. */
    const feos = ['../../etc', '<script>', 'a/b?c#d', 'ñ%20ñ', '💥', "'; DROP TABLE"];
    comprobar('lo raro no sobrevive',
      feos.every(f => /^[a-z0-9-]*$/.test(Vivo.limpiarNombre(f))),
      feos.map(f => f + ' -> ' + Vivo.limpiarNombre(f)).join(' | '));
    comprobar('un nombre larguísimo se corta',
      Vivo.limpiarNombre('a'.repeat(200)).length === Vivo.LARGO_MAX,
      Vivo.limpiarNombre('a'.repeat(200)).length);

    comprobar('un nombre de una letra no alcanza', !Vivo.valido('a'));
    comprobar('uno vacío tampoco', !Vivo.valido('   ') && !Vivo.valido(''));
    comprobar('uno de dos sí', Vivo.valido('ju'));
    comprobar('uno que después de limpiar queda vacío, no', !Vivo.valido('💥💥'));
  }

  /* ------------------------------------------------------------------ */
  seccion('La sala sale del nombre, sin ponerse de acuerdo');
  {
    const a = Vivo.sala('juan');
    const b = Vivo.sala('  JUAN  ');
    comprobar('el mismo nombre da la misma sala en las dos máquinas',
      a.sala === b.sala && a.clave === b.clave, JSON.stringify(a) + ' vs ' + JSON.stringify(b));
    comprobar('la sala lleva el nombre adentro', a.sala === 'esle2-vivo-juan', a.sala);
    comprobar('dos nombres distintos, dos salas distintas',
      Vivo.sala('ana').sala !== Vivo.sala('beto').sala);
    comprobar('y dos contraseñas distintas',
      Vivo.sala('ana').clave !== Vivo.sala('beto').clave);
    comprobar('un nombre inválido no da sala', Vivo.sala('') === null && Vivo.sala('💥') === null);

    comprobar('la sala no choca con las de «programar de a dos»',
      a.sala.indexOf('esle2-vivo-') === 0 && a.sala.indexOf('esle2-rio') !== 0, a.sala);
  }

  /* ------------------------------------------------------------------ */
  seccion('El enlace');
  {
    comprobar('es corto y dictable',
      Vivo.enlace('juan', 'https://esle2.vercel.app/') === 'https://esle2.vercel.app/live/juan',
      Vivo.enlace('juan', 'https://esle2.vercel.app/'));
    comprobar('la barra del final no hace falta ponerla',
      Vivo.enlace('juan', 'https://esle2.vercel.app') === 'https://esle2.vercel.app/live/juan',
      Vivo.enlace('juan', 'https://esle2.vercel.app'));
    comprobar('el nombre se limpia antes de armarlo',
      Vivo.enlace('José Pérez', 'https://x/') === 'https://x/live/jose-perez',
      Vivo.enlace('José Pérez', 'https://x/'));
    comprobar('sin nombre no hay enlace', Vivo.enlace('', 'https://x/') === '');
  }

  /* ------------------------------------------------------------------ */
  seccion('Leer el enlace del otro lado');
  {
    comprobar('se saca el nombre del camino', Vivo.leerUrl('/live/juan') === 'juan');
    comprobar('con barra al final también', Vivo.leerUrl('/live/juan/') === 'juan');
    comprobar('y con lo que venga después', Vivo.leerUrl('/live/juan?x=1') === 'juan');
    comprobar('el nombre que llega también se limpia (nadie manda lo que quiera)',
      Vivo.leerUrl('/live/JUAN') === 'juan', Vivo.leerUrl('/live/JUAN'));
    comprobar('un nombre escapado se entiende',
      Vivo.leerUrl('/live/jos%C3%A9') === 'jose', Vivo.leerUrl('/live/jos%C3%A9'));
    comprobar('otra página no es una transmisión',
      Vivo.leerUrl('/index.html') === null && Vivo.leerUrl('/') === null);

    /* Si un día el sitio se sirve en un lugar que no reescribe direcciones,
       el enlace con «?» sigue funcionando. */
    comprobar('la forma con ? también sirve',
      Vivo.leerUrl('/vivo.html', '?vivo=ana') === 'ana');
    comprobar('el camino manda por sobre el ?',
      Vivo.leerUrl('/live/juan', '?vivo=ana') === 'juan');

    comprobar('ida y vuelta: lo que se arma se puede volver a leer',
      Vivo.leerUrl(new URL(Vivo.enlace('Sofi Ramírez', 'https://x/')).pathname) === 'sofi-ramirez',
      Vivo.enlace('Sofi Ramírez', 'https://x/'));
  }

  /* ------------------------------------------------------------------ */
  seccion('El nombre sugerido');
  {
    const n = Vivo.nombreSugerido();
    comprobar('sirve tal cual', Vivo.valido(n) && Vivo.limpiarNombre(n) === n, n);
    const muchos = new Set();
    for (let i = 0; i < 50; i++) muchos.add(Vivo.nombreSugerido());
    comprobar('y no siempre sugiere lo mismo', muchos.size > 10, muchos.size);
  }

  console.log('\n' + ok + ' bien, ' + fallos + ' mal');
  process.exit(fallos ? 1 : 0);
})();

/*
 * Prueba de los perfiles: que el trabajo de un alumno no aparezca en la
 * sesión del siguiente, y que nada se pierda al ir y volver.
 *
 * Lo que se comprueba de verdad es la vuelta completa: Ana trabaja, entra
 * Beto, vuelve Ana y encuentra todo como lo dejó. Si eso falla, un alumno
 * pierde su tarea, que es lo peor que puede pasar acá.
 *
 *   node test/test-perfil.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = global;
require(path.join(__dirname, '..', 'js', 'perfil.js'));
const { Perfil } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle) : ''));
}
const seccion = t => console.log('\n' + t);

/* Un navegador de mentira: localStorage y cookies. */
function navegador() {
  const datos = new Map();
  const cookies = new Map();
  return {
    datos, cookies,
    almacen: {
      leer: k => (datos.has(k) ? datos.get(k) : null),
      escribir: (k, v) => datos.set(k, String(v)),
      borrar: k => datos.delete(k),
      claves: () => [...datos.keys()]
    },
    galletas: {
      leer: c => cookies.get(c) || '',
      grabar: (c, v) => (v ? cookies.set(c, v) : cookies.delete(c))
    }
  };
}

seccion('Qué es del alumno y qué de la máquina');
comprobar('el código de un ejercicio es del alumno', Perfil.esDelAlumno('esle2_ej_f1'));
comprobar('la racha también', Perfil.esDelAlumno('esle2_racha'));
comprobar('y los ejercicios propios', Perfil.esDelAlumno('esle2poo_mis_ej'));
comprobar('el tema NO se cambia', !Perfil.esDelAlumno('esle2_tema'));
comprobar('la disposición de los paneles tampoco', !Perfil.esDelAlumno('esle2vis_disposicion'));
comprobar('ni el servidor de señas', !Perfil.esDelAlumno('esle2_senas'));
comprobar('el registro de perfiles no se guarda a sí mismo',
  !Perfil.esDelAlumno('esle2_perfiles'));
comprobar('ni los cajones de los perfiles', !Perfil.esDelAlumno('esle2_perfil_ana'));
comprobar('lo que no es de ESLE2 no se toca', !Perfil.esDelAlumno('otra_cosa'));
/* Una clave nueva que nadie agregó a la lista cae del lado del alumno: es el
   lado seguro del error. */
comprobar('una clave nueva se supone del alumno', Perfil.esDelAlumno('esle2_algo_nuevo'));

seccion('Los cuatro cursos y las cuatro disposiciones');
/* Dos listas que hay que acordarse de actualizar cuando aparece un dialecto
   nuevo, y las dos se olvidaron alguna vez. */
for (const c of ['esle2_progreso', 'esle2_progreso_poo', 'esle2_progreso_vis', 'esle2_progreso_bd'])
  comprobar('el avance de ' + c + ' viaja con el perfil', Perfil.COOKIES.includes(c));
for (const d of ['esle2_disposicion', 'esle2poo_disposicion', 'esle2vis_disposicion', 'esle2bd_disposicion'])
  comprobar('la disposición ' + d + ' queda en la máquina', !Perfil.esDelAlumno(d));

seccion('Las preferencias del lector por voz, que ya no existe');
/* El lector por voz se sacó del proyecto, pero quien lo había apagado o
   prendido tiene esas cuatro claves guardadas en su navegador. Siguen
   contando como «de la máquina»: si pasaran al lado del alumno, el perfil
   diría que hay trabajo donde no hay ninguno, y se las copiaría de un perfil
   a otro. */
for (const k of ['esle2_voz', 'esle2_voz_poo', 'esle2_voz_vis', 'esle2_voz_bd'])
  comprobar(k + ' sigue siendo de la máquina', !Perfil.esDelAlumno(k));
{
  const n = navegador();
  const p = Perfil.crear(n);
  n.almacen.escribir('esle2_voz', '1');
  n.almacen.escribir('esle2_voz_poo', '0');
  comprobar('un navegador con solo esas claves no tiene trabajo de nadie', !p.hayDatos());

  p.crear('Ana');
  n.almacen.escribir('esle2_ej_f1', 'el programa de Ana');
  p.crear('Beto');
  comprobar('al cambiar de alumno no se las lleva',
    n.almacen.leer('esle2_voz') === '1' && n.almacen.leer('esle2_voz_poo') === '0',
    n.almacen.leer('esle2_voz') + '/' + n.almacen.leer('esle2_voz_poo'));
  comprobar('y el trabajo de Ana sí se guarda', n.almacen.leer('esle2_ej_f1') === null);
  p.cambiar('Ana');
  comprobar('y vuelve cuando vuelve Ana',
    n.almacen.leer('esle2_ej_f1') === 'el programa de Ana', n.almacen.leer('esle2_ej_f1'));
}

seccion('El primero se queda con lo que ya había');
{
  const n = navegador();
  const p = Perfil.crear(n);
  n.almacen.escribir('esle2_ej_f1', 'lo que venía escribiendo');
  n.almacen.escribir('esle2_tema', 'oscuro');
  n.galletas.grabar('esle2_progreso', '{"f1":true}');

  comprobar('al principio no hay perfiles', p.listar().length === 0);
  comprobar('pero sí datos de alguien', p.hayDatos());

  p.crear('Ana');
  comprobar('se crea el perfil', p.actual() === 'Ana', p.actual());
  comprobar('y NO le borra lo que ya tenía',
    n.almacen.leer('esle2_ej_f1') === 'lo que venía escribiendo');
  comprobar('el progreso tampoco', n.galletas.leer('esle2_progreso') === '{"f1":true}');
}

seccion('Entra otro alumno');
{
  const n = navegador();
  const p = Perfil.crear(n);
  n.almacen.escribir('esle2_ej_f1', 'el programa de Ana');
  n.almacen.escribir('esle2_racha', '{"dias":5}');
  n.almacen.escribir('esle2_tema', 'oscuro');
  n.galletas.grabar('esle2_progreso', '{"f1":true,"f2":true}');
  p.crear('Ana');

  p.crear('Beto');
  comprobar('ahora es Beto', p.actual() === 'Beto');
  comprobar('Beto NO ve el código de Ana', n.almacen.leer('esle2_ej_f1') === null,
    n.almacen.leer('esle2_ej_f1'));
  comprobar('ni su racha', n.almacen.leer('esle2_racha') === null);
  comprobar('ni su avance', n.galletas.leer('esle2_progreso') === '');
  comprobar('pero el tema de la máquina queda', n.almacen.leer('esle2_tema') === 'oscuro');

  n.almacen.escribir('esle2_ej_f1', 'el programa de Beto');
  n.galletas.grabar('esle2_progreso', '{"f1":true}');

  p.cambiar('Ana');
  comprobar('vuelve Ana', p.actual() === 'Ana');
  comprobar('y encuentra SU código', n.almacen.leer('esle2_ej_f1') === 'el programa de Ana',
    n.almacen.leer('esle2_ej_f1'));
  comprobar('su racha', n.almacen.leer('esle2_racha') === '{"dias":5}');
  comprobar('y su avance entero', n.galletas.leer('esle2_progreso') === '{"f1":true,"f2":true}');

  p.cambiar('Beto');
  comprobar('y lo de Beto tampoco se perdió',
    n.almacen.leer('esle2_ej_f1') === 'el programa de Beto');
  comprobar('con su avance', n.galletas.leer('esle2_progreso') === '{"f1":true}');
  comprobar('la racha de Ana no se le pegó', n.almacen.leer('esle2_racha') === null);
}

seccion('Los nombres');
{
  const n = navegador();
  const p = Perfil.crear(n);
  p.crear('  Ana   María  ');
  comprobar('los espacios de más se van', p.actual() === 'Ana María', p.actual());
  comprobar('se puede volver escribiéndolo distinto', p.cambiar('ANA MARIA') === 'Ana María');

  let dijo = '';
  try { p.crear('ana maría'); } catch (e) { dijo = e.message; }
  comprobar('no se repite un perfil con otras mayúsculas', /ya hay/.test(dijo), dijo);

  dijo = '';
  try { p.crear('   '); } catch (e) { dijo = e.message; }
  comprobar('sin nombre no se crea', /nombre/.test(dijo), dijo);

  dijo = '';
  try { p.cambiar('Nadie'); } catch (e) { dijo = e.message; }
  comprobar('no se entra a uno que no existe', /no hay/.test(dijo), dijo);

  comprobar('un nombre larguísimo se corta',
    Perfil.limpiarNombre('a'.repeat(200)).length === 40);
}

seccion('Borrar un perfil');
{
  const n = navegador();
  const p = Perfil.crear(n);
  n.almacen.escribir('esle2_ej_f1', 'de Ana');
  p.crear('Ana');
  p.crear('Beto');
  n.almacen.escribir('esle2_ej_f1', 'de Beto');

  p.borrar('Ana');
  comprobar('queda uno solo', p.listar().join() === 'Beto', p.listar());
  comprobar('el que sigue abierto no se toca', n.almacen.leer('esle2_ej_f1') === 'de Beto');

  p.borrar('Beto');
  comprobar('sin perfiles no hay ninguno abierto', p.actual() === null);
  comprobar('y la máquina queda limpia', n.almacen.leer('esle2_ej_f1') === null);
  comprobar('pero sin borrar lo que no era de nadie',
    n.almacen.leer('esle2_perfiles') !== null);
}

seccion('Cosas que pueden salir mal');
{
  const n = navegador();
  n.almacen.escribir('esle2_perfiles', 'esto no es JSON');
  const p = Perfil.crear(n);
  comprobar('un registro roto no rompe nada', p.listar().length === 0);
  p.crear('Ana');
  comprobar('y se puede seguir usando', p.actual() === 'Ana');

  /* Guardar sin nadie abierto no debe inventar un cajón. */
  const n2 = navegador();
  const p2 = Perfil.crear(n2);
  comprobar('guardar sin perfil no hace nada', p2.guardar() === false);
  comprobar('y no deja basura', n2.almacen.claves().length === 0, n2.almacen.claves());

  /* Cambiar al que ya está abierto no puede vaciar nada. */
  const n3 = navegador();
  const p3 = Perfil.crear(n3);
  n3.almacen.escribir('esle2_ej_f1', 'algo');
  p3.crear('Ana');
  p3.cambiar('Ana');
  comprobar('cambiar al mismo no borra nada', n3.almacen.leer('esle2_ej_f1') === 'algo');

  comprobar('se puede saber cuánto ocupa', p3.tamano('Ana') > 0, p3.tamano('Ana'));
  comprobar('y uno que no existe ocupa cero', p3.tamano('Nadie') === 0);
}

/* ==================================================================== */
/* El modo usuario: nombre, contraseña y cerrar sesión                   */
/* ==================================================================== */
(async () => {
  seccion('La cerradura');
  {
    const n = navegador();
    const p = Perfil.crear(n);
    comprobar('viene apagado', p.modo() === false);
    p.ponerModo(true);
    comprobar('se puede encender', p.modo() === true);

    p.crear('Ana');
    comprobar('un perfil recién hecho no tiene contraseña', !p.tieneClave('Ana'));
    /* Con el modo encendido, «sin contraseña» tiene que ser «no entra», no
       «pasá sin golpear». */
    comprobar('y sin contraseña puesta no deja entrar nadie',
      (await p.comprobar('Ana', '')) === false);
    comprobar('ni con cualquier cosa', (await p.comprobar('Ana', 'lo que sea')) === false);

    await p.ponerClave('Ana', 'sandia-con-vino');
    comprobar('ahora sí tiene', p.tieneClave('Ana'));
    comprobar('la contraseña correcta entra', (await p.comprobar('Ana', 'sandia-con-vino')) === true);
    comprobar('una parecida no', (await p.comprobar('Ana', 'sandia-con-vin')) === false);
    comprobar('vacía tampoco', (await p.comprobar('Ana', '')) === false);
    comprobar('la de otro perfil que no existe tampoco',
      (await p.comprobar('Nadie', 'sandia-con-vino')) === false);

    /* Lo que se guarda no es la contraseña. */
    const crudo = n.almacen.leer('esle2_perfiles');
    comprobar('la contraseña NO queda guardada', !crudo.includes('sandia-con-vino'), crudo);
    comprobar('queda una sal propia', /"s":"[A-Za-z0-9_-]{20,}"/.test(crudo));
    comprobar('y cuántas vueltas costó', /"it":\d{5,}/.test(crudo));

    /* Dos perfiles con la misma contraseña no dan lo mismo: cada uno su sal. */
    p.crear('Beto');
    await p.ponerClave('Beto', 'sandia-con-vino');
    const reg = JSON.parse(n.almacen.leer('esle2_perfiles'));
    const [a, b] = ['ana', 'beto'].map(x => reg.cerraduras.find(c => c.n === x));
    comprobar('cada perfil tiene su propia sal', a.s !== b.s);
    comprobar('y por eso la misma contraseña no da lo mismo', a.h !== b.h);

    comprobar('una contraseña corta no se acepta',
      await p.ponerClave('Ana', 'corta').then(() => false, () => true));
  }

  seccion('Entrar y salir');
  {
    const n = navegador();
    const p = Perfil.crear(n);
    p.ponerModo(true);
    p.crear('Ana');
    n.almacen.escribir('esle2_ej_f1', 'el programa de Ana');
    await p.ponerClave('Ana', 'sandia-con-vino');
    p.guardar();

    comprobar('con la contraseña mal no se abre sesión',
      (await p.abrirSesion('Ana', 'otra cosa')) === false);

    comprobar('cerrar sesión devuelve true', p.cerrarSesion() === true);
    comprobar('y nadie queda abierto', p.actual() === null);
    /* Lo que de verdad arregla la cerradura: el que viene después no ve nada. */
    comprobar('la máquina queda limpia', !n.almacen.leer('esle2_ej_f1'),
      n.almacen.leer('esle2_ej_f1'));
    comprobar('pero el trabajo no se perdió: está en su cajón',
      (n.almacen.leer('esle2_perfil_ana') || '').includes('el programa de Ana'));

    comprobar('con la contraseña bien se vuelve a entrar',
      (await p.abrirSesion('Ana', 'sandia-con-vino')) === true);
    comprobar('y el trabajo vuelve', n.almacen.leer('esle2_ej_f1') === 'el programa de Ana');
    comprobar('con la sesión abierta, el perfil es el suyo', p.actual() === 'Ana');

    comprobar('cerrar sesión sin nadie adentro no rompe',
      p.cerrarSesion() === true && p.cerrarSesion() === false);
  }

  seccion('Sacar la cerradura');
  {
    const n = navegador();
    const p = Perfil.crear(n);
    p.crear('Ana');
    await p.ponerClave('Ana', 'sandia-con-vino');
    comprobar('sacarla sin la contraseña no se puede',
      (await p.sacarClave('Ana', 'otra cosa')) === false);
    comprobar('y sigue puesta', p.tieneClave('Ana'));
    comprobar('con la contraseña sí', (await p.sacarClave('Ana', 'sandia-con-vino')) === true);
    comprobar('y ya no está', !p.tieneClave('Ana'));
  }

  seccion('Un registro que alguien tocó a mano');
  {
    const n = navegador();
    const p = Perfil.crear(n);
    p.crear('Ana');
    await p.ponerClave('Ana', 'sandia-con-vino');

    const conRegistro = cambio => {
      const r = JSON.parse(n.almacen.leer('esle2_perfiles'));
      cambio(r);
      n.almacen.escribir('esle2_perfiles', JSON.stringify(r));
    };

    /* Bajar las vueltas a una hace barato probar contraseñas: no se acepta. */
    conRegistro(r => { r.cerraduras[0].it = 1; });
    comprobar('con las vueltas bajadas a mano no entra',
      (await p.comprobar('Ana', 'sandia-con-vino')) === false);

    conRegistro(r => { r.cerraduras[0].it = 210000; r.cerraduras[0].v = 99; });
    comprobar('con una versión desconocida tampoco',
      (await p.comprobar('Ana', 'sandia-con-vino')) === false);

    conRegistro(r => { r.cerraduras = 'no soy una lista'; });
    comprobar('con las cerraduras rotas no entra nadie',
      (await p.comprobar('Ana', 'sandia-con-vino')) === false);
    comprobar('y no se rompe al preguntar', p.tieneClave('Ana') === false);
  }

  seccion('Un alumno que se llama «__proto__»');
  {
    const n = navegador();
    const p = Perfil.crear(n);
    p.crear('__proto__');
    await p.ponerClave('__proto__', 'sandia-con-vino');
    comprobar('entra como cualquiera', (await p.comprobar('__proto__', 'sandia-con-vino')) === true);
    comprobar('y no le pisa el prototipo a nadie', ({}).v === undefined && ({}).h === undefined);
  }

  seccion('Comparar sin apurarse');
  {
    comprobar('dos iguales dan true', Perfil.iguales('abc', 'abc'));
    comprobar('distintas, false', !Perfil.iguales('abc', 'abd'));
    comprobar('de distinto largo, false', !Perfil.iguales('abc', 'abcd'));
    comprobar('vacías, true', Perfil.iguales('', ''));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'los perfiles tienen fallos');
})();

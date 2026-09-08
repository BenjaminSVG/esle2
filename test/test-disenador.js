/*
 * Prueba del diseñador de ventanas de ESLE2 Visual.
 *
 * Lo que hay que garantizar acá es más delicado que en otros módulos: esto
 * REESCRIBE el programa de otra persona. Si se equivoca, no muestra un dato
 * mal, le rompe el código.
 *
 * Por eso lo que más se prueba es lo que NO tiene que cambiar:
 *   · arrastrar un botón cambia dos números de su línea y nada más —ni la
 *     sangría, ni el comentario del final, ni ninguna otra línea—;
 *   · un control cuyas coordenadas son una variable o una cuenta NO se mueve,
 *     porque moverlo querría decir cambiar la variable;
 *   · borrar un control se lleva también las líneas que le registraban un
 *     evento, que si no quedarían apuntando a algo que ya no existe;
 *   · y, después de cada cambio, el programa TIENE que seguir compilando.
 *
 *   node test/test-disenador.js
 */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'sle2vis.js'));
require(path.join(RAIZ, 'js', 'disenador.js'));
const { SLE2VIS, Disenador } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* Después de cualquier cambio, el programa tiene que seguir compilando. Es la
   red de seguridad de todo este módulo. */
function compila(fuente) {
  try { SLE2VIS.compilar(fuente); return true; }
  catch (e) { return e.message || String(e); }
}

const PROGRAMA = [
  'var',
  '   b : numerico',
  '   t : numerico',
  'inicio',
  '   ventana ("Mi programa", 420, 260)',
  '   e = etiqueta ("Tu nombre:", 20, 20)          // sin ancho ni alto',
  '   t = caja (20, 45, 200, 26)',
  '   b = boton ("Saludar", 30, 90, 120, 34)   // el botón principal',
  '   al_hacer_clic (b, "saludar")',
  '   esperar_eventos ()',
  'fin',
  '',
  'subrutina saludar (id : numerico)',
  'inicio',
  '   mensaje ("Hola, " + leer_texto (t))',
  'fin',
  ''
].join('\n');

const de = (d, tipo) => d.controles.find(c => c.tipo === tipo);

(() => {
  /* ------------------------------------------------------------------ */
  seccion('Leer el programa');
  {
    const d = Disenador.leer(PROGRAMA);
    comprobar('compila y se lee', !d.error, d.error && d.error.message);
    comprobar('encuentra la ventana', !!d.ventana);
    comprobar('con su título y su tamaño',
      d.ventana.titulo === 'Mi programa' && d.ventana.ancho === 420 && d.ventana.alto === 260,
      JSON.stringify(d.ventana));
    comprobar('encuentra los tres controles', d.controles.length === 3,
      d.controles.map(c => c.tipo).join());

    const b = de(d, 'boton');
    comprobar('el botón está donde dice el código',
      b.x === 30 && b.y === 90 && b.ancho === 120 && b.alto === 34, JSON.stringify(b));
    comprobar('con su texto', b.texto === 'Saludar', b.texto);
    comprobar('y sabe en qué variable quedó', b.variable === 'b', b.variable);
    comprobar('y en qué línea está', b.linea === 8, b.linea);

    /* La etiqueta no tiene ancho ni alto escritos: se usan los de por defecto
       y se anota que no los tiene, porque estirarla se los va a tener que
       agregar. */
    const e = de(d, 'etiqueta');
    comprobar('la etiqueta sin medidas toma las de por defecto',
      e.ancho === 120 && e.alto === 22, JSON.stringify(e));
    comprobar('y queda anotado que no las tiene escritas', e.tieneMedidas === false);

    /* La caja no lleva texto: su primer argumento ya es la x. */
    const c = de(d, 'caja');
    comprobar('la caja sin texto lee bien su x', c.x === 20 && c.y === 45, JSON.stringify(c));
    comprobar('y no ofrece cambiarle el texto', c.editableTexto === false);
  }

  /* ------------------------------------------------------------------ */
  seccion('Mover: cambia dos números y NADA más');
  {
    const d = Disenador.leer(PROGRAMA);
    const b = de(d, 'boton');
    const nuevo = Disenador.mover(PROGRAMA, b, { x: 200, y: 150 });

    comprobar('sigue compilando', compila(nuevo) === true, compila(nuevo));

    const antes = PROGRAMA.split('\n');
    const ahora = nuevo.split('\n');
    comprobar('la cantidad de líneas no cambia', antes.length === ahora.length);
    const distintas = antes.map((l, i) => (l === ahora[i] ? -1 : i)).filter(i => i >= 0);
    comprobar('cambia UNA sola línea', distintas.length === 1, distintas.join());
    comprobar('y es la del botón', distintas[0] === 7, distintas[0]);

    const l = ahora[7];
    comprobar('con los números nuevos', /boton \("Saludar", 200, 150, 120, 34\)/.test(l), l);
    comprobar('la sangría queda igual', /^   b = /.test(l), JSON.stringify(l.slice(0, 8)));
    comprobar('y el comentario del final también',
      /\/\/ el botón principal$/.test(l), JSON.stringify(l));

    const d2 = Disenador.leer(nuevo);
    comprobar('releerlo devuelve lo que se puso',
      de(d2, 'boton').x === 200 && de(d2, 'boton').y === 150);
  }

  /* ------------------------------------------------------------------ */
  seccion('Estirar');
  {
    const d = Disenador.leer(PROGRAMA);
    const b = de(d, 'boton');
    const nuevo = Disenador.mover(PROGRAMA, b, { ancho: 200, alto: 50 });
    comprobar('sigue compilando', compila(nuevo) === true, compila(nuevo));
    comprobar('cambia el ancho y el alto',
      /boton \("Saludar", 30, 90, 200, 50\)/.test(nuevo.split('\n')[7]), nuevo.split('\n')[7]);

    /* La etiqueta no tenía medidas: hay que agregárselas, y las dos juntas,
       porque el ancho sin el alto no es una llamada válida. */
    const e = de(d, 'etiqueta');
    const conMedidas = Disenador.mover(PROGRAMA, e, { ancho: 150, alto: 30 });
    comprobar('a la que no tenía medidas se le agregan', compila(conMedidas) === true,
      compila(conMedidas));
    comprobar('las dos juntas',
      /etiqueta \("Tu nombre:", 20, 20, 150, 30\)/.test(conMedidas.split('\n')[5]),
      conMedidas.split('\n')[5]);
    comprobar('sin comerse el comentario',
      /\/\/ sin ancho ni alto$/.test(conMedidas.split('\n')[5]), conMedidas.split('\n')[5]);
    comprobar('y al releerlo están', Disenador.leer(conMedidas).controles
      .find(c => c.tipo === 'etiqueta').ancho === 150);
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que NO se puede mover');
  {
    /* Si las coordenadas salen de una variable o de una cuenta, moverlas
       querría decir cambiar la variable, que puede estar usada en otro lado.
       Se muestra, se dice, y no se toca. */
    const raro = [
      'var',
      '   x : numerico',
      '   b : numerico',
      'inicio',
      '   ventana ("Raro", 400, 300)',
      '   x = 50',
      '   b = boton ("Ok", x, x + 10, 100, 30)',
      '   esperar_eventos ()',
      'fin', ''
    ].join('\n');

    const d = Disenador.leer(raro);
    comprobar('el control igual se ve', d.controles.length === 1);
    const b = d.controles[0];
    comprobar('pero se marca como no movible', b.movible === false);
    comprobar('y sí como estirable (el ancho y el alto sí son números)', b.medible === true);

    const intento = Disenador.mover(raro, b, { x: 999, y: 999 });
    comprobar('mover no hace nada', intento === raro);
    comprobar('el programa queda intacto', compila(intento) === true);

    /* Pero estirarlo sí se puede: esos dos sí son números. */
    const estirado = Disenador.mover(raro, b, { ancho: 150, alto: 40 });
    comprobar('estirarlo sí se puede', /boton \("Ok", x, x \+ 10, 150, 40\)/.test(estirado),
      estirado.split('\n')[6]);
    comprobar('y la cuenta queda tal cual', /x \+ 10/.test(estirado));
  }

  /* ------------------------------------------------------------------ */
  seccion('Los que se crean en otro lado');
  {
    const conCiclo = [
      'var',
      '   i : numerico',
      'inicio',
      '   ventana ("Con ciclo", 400, 300)',
      '   boton ("Fijo", 10, 10, 80, 30)',
      '   desde i = 1 hasta 3',
      '   {',
      '      boton ("En el ciclo", 10, i * 40, 80, 30)',
      '   }',
      '   esperar_eventos ()',
      'fin', ''
    ].join('\n');

    const d = Disenador.leer(conCiclo);
    comprobar('solo se dibuja el que tiene un lugar fijo', d.controles.length === 1,
      d.controles.length);
    comprobar('y se cuentan los otros para poder decirlo', d.otros === 1, d.otros);
  }

  /* ------------------------------------------------------------------ */
  seccion('Cambiar el texto');
  {
    const d = Disenador.leer(PROGRAMA);
    const b = de(d, 'boton');
    const nuevo = Disenador.texto(PROGRAMA, b, 'Saludar fuerte');
    comprobar('sigue compilando', compila(nuevo) === true, compila(nuevo));
    comprobar('cambia el texto', Disenador.leer(nuevo).controles
      .find(c => c.tipo === 'boton').texto === 'Saludar fuerte');
    comprobar('y no toca las coordenadas',
      /boton \("Saludar fuerte", 30, 90, 120, 34\)/.test(nuevo.split('\n')[7]),
      nuevo.split('\n')[7]);

    /* Una comilla adentro del texto cortaría la cadena al medio y rompería el
       programa. Ojo: cambiarla por «”» tampoco sirve, porque una cadena
       abierta con " también se cierra con ese carácter. Se usa la simple. */
    const conComilla = Disenador.texto(PROGRAMA, b, 'Decí "hola"');
    comprobar('una comilla adentro no rompe el programa', compila(conComilla) === true,
      compila(conComilla));
    comprobar('y el texto se entiende igual',
      /Dec/.test(Disenador.leer(conComilla).controles.find(c => c.tipo === 'boton').texto));

    /* Un salto de línea tampoco. */
    const conSalto = Disenador.texto(PROGRAMA, b, 'dos\nlíneas');
    comprobar('un salto de línea tampoco lo rompe', compila(conSalto) === true, compila(conSalto));
    comprobar('y no agrega líneas al programa',
      conSalto.split('\n').length === PROGRAMA.split('\n').length);
  }

  /* ------------------------------------------------------------------ */
  seccion('El tamaño de la ventana');
  {
    const nuevo = Disenador.tamanoVentana(PROGRAMA, 600, 400);
    comprobar('sigue compilando', compila(nuevo) === true, compila(nuevo));
    comprobar('cambia el tamaño', /ventana \("Mi programa", 600, 400\)/.test(nuevo),
      nuevo.split('\n')[4]);
    comprobar('y no toca el título',
      Disenador.leer(nuevo).ventana.titulo === 'Mi programa');
  }

  /* ------------------------------------------------------------------ */
  seccion('Agregar un control');
  {
    const r = Disenador.agregar(PROGRAMA, 'boton', { x: 200, y: 200, texto: 'Salir' });
    comprobar('sigue compilando', compila(r.fuente) === true, compila(r.fuente));
    comprobar('le pone un nombre libre', r.nombre === 'boton1', r.nombre);

    const d = Disenador.leer(r.fuente);
    comprobar('ahora hay cuatro controles', d.controles.length === 4, d.controles.length);
    const nuevo = d.controles.find(c => c.variable === 'boton1');
    comprobar('el nuevo está donde se pidió', nuevo && nuevo.x === 200 && nuevo.y === 200,
      JSON.stringify(nuevo));
    comprobar('con el texto que se pidió', nuevo.texto === 'Salir', nuevo && nuevo.texto);

    /* Se guarda en una variable declarada: sin eso no se le puede poner un
       al_hacer_clic, y un botón que no se puede atender no sirve. */
    comprobar('la variable queda declarada', /^\s*boton1 : numerico\s*$/m.test(r.fuente),
      r.fuente.split('\n').slice(0, 5).join(' | '));

    /* Y va ANTES de esperar_eventos: lo que se crea después no se vería. */
    const lineas = r.fuente.split('\n');
    const iNuevo = lineas.findIndex(l => /boton1 = boton/.test(l));
    const iEsperar = lineas.findIndex(l => /esperar_eventos/.test(l));
    comprobar('va antes de esperar_eventos()', iNuevo >= 0 && iNuevo < iEsperar,
      iNuevo + ' vs ' + iEsperar);

    /* Dos veces seguidas: nombres distintos. */
    const r2 = Disenador.agregar(r.fuente, 'boton', { x: 10, y: 10 });
    comprobar('el segundo toma otro nombre', r2.nombre === 'boton2', r2.nombre);
    comprobar('y sigue compilando', compila(r2.fuente) === true, compila(r2.fuente));
  }

  /* ------------------------------------------------------------------ */
  seccion('Agregar cuando el programa casi no tiene nada');
  {
    /* Sin bloque var: hay que crearlo. */
    const pelado = ['inicio', '   ventana ("Vacía", 300, 200)', '   esperar_eventos ()', 'fin', ''].join('\n');
    const r = Disenador.agregar(pelado, 'boton', { x: 10, y: 10 });
    comprobar('se crea el bloque var', compila(r.fuente) === true, compila(r.fuente));
    comprobar('y el control aparece', Disenador.leer(r.fuente).controles.length === 1,
      r.fuente);

    /* Sin esperar_eventos: igual tiene que quedar adentro del programa. */
    const sinEsperar = ['inicio', '   ventana ("Vacía", 300, 200)', 'fin', ''].join('\n');
    const r2 = Disenador.agregar(sinEsperar, 'etiqueta', { x: 5, y: 5 });
    comprobar('sin esperar_eventos también compila', compila(r2.fuente) === true,
      compila(r2.fuente));
    comprobar('y el control queda adentro', Disenador.leer(r2.fuente).controles.length === 1,
      r2.fuente);
  }

  /* ------------------------------------------------------------------ */
  seccion('Borrar un control');
  {
    const d = Disenador.leer(PROGRAMA);
    const b = de(d, 'boton');
    const r = Disenador.borrar(PROGRAMA, b);
    comprobar('sigue compilando', compila(r.fuente) === true, compila(r.fuente));
    comprobar('se va el botón', !Disenador.leer(r.fuente).controles.some(c => c.tipo === 'boton'));

    /* Y se lleva el al_hacer_clic: si quedara, el programa reventaría al
       ejecutarse apuntando a un control que ya no existe. */
    comprobar('se lleva también su al_hacer_clic', !/al_hacer_clic/.test(r.fuente), r.fuente);
    comprobar('y lo dice', r.quitadas === 1, r.quitadas);

    /* Los otros dos siguen enteros. */
    comprobar('los demás controles siguen', Disenador.leer(r.fuente).controles.length === 2,
      Disenador.leer(r.fuente).controles.length);
    comprobar('y la subrutina no se toca', /subrutina saludar/.test(r.fuente));

    /* Uno sin variable: no hay eventos que arrastrar. */
    const sinVar = Disenador.leer(PROGRAMA).controles.find(c => c.variable === null);
    if (sinVar) {
      const r2 = Disenador.borrar(PROGRAMA, sinVar);
      comprobar('borrar uno sin variable no se lleva nada más', r2.quitadas === 0, r2.quitadas);
      comprobar('y compila', compila(r2.fuente) === true, compila(r2.fuente));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Un programa que no compila');
  {
    const roto = 'inicio\n   ventana ("Rota", 300\nfin\n';
    const d = Disenador.leer(roto);
    comprobar('no explota', !!d);
    comprobar('avisa del error', !!d.error, JSON.stringify(d));
    comprobar('y no inventa controles', d.controles.length === 0);
  }

  /* ------------------------------------------------------------------ */
  seccion('Muchos cambios seguidos');
  {
    /* Arrastrar un rato es esto: decenas de cambios encadenados. Al final el
       programa tiene que seguir compilando y decir lo que se puso. */
    let f = PROGRAMA;
    for (let i = 0; i < 30; i++) {
      const d = Disenador.leer(f);
      const b = d.controles.find(c => c.tipo === 'boton');
      f = Disenador.mover(f, b, { x: 10 + i * 3, y: 20 + i * 2 });
    }
    comprobar('después de treinta arrastres sigue compilando', compila(f) === true, compila(f));
    const fin = Disenador.leer(f).controles.find(c => c.tipo === 'boton');
    comprobar('y quedó en el último lugar', fin.x === 97 && fin.y === 78, JSON.stringify(fin));
    comprobar('el programa no creció', f.split('\n').length === PROGRAMA.split('\n').length,
      f.split('\n').length);
    comprobar('y el comentario sigue ahí', /el botón principal/.test(f));
  }

  console.log('\n' + ok + ' bien, ' + fallos + ' mal');
  process.exit(fallos ? 1 : 0);
})();

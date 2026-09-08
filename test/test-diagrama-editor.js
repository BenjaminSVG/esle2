/*
 * Prueba del editor de diagramas.
 *
 * La propiedad que importa, y que es la que hace confiable a todo el editor:
 * el programa que sale del diagrama TIENE que compilar, y volver a traerlo al
 * editor tiene que dar el mismo diagrama. Si eso se cumple, el dibujo que ve
 * el alumno y el programa que se ejecuta no pueden separarse.
 *
 *   node test/test-diagrama-editor.js
 */
'use strict';
const path = require('path');
const assert = require('assert');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'sle2.js'));
require(path.join(RAIZ, 'js', 'diagrama.js'));
require(path.join(RAIZ, 'js', 'diagrama-editor.js'));
const { SLE2, Diagrama, DiagramaEditor: DE } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* Corre un programa y devuelve lo que imprimió. */
async function correr(codigo, entrada) {
  let salida = '';
  const lineas = (entrada || '').length ? entrada.split('\n') : [];
  let i = 0;
  const io = {
    archivos: new Map(), argumentos: [],
    imprimir: t => { salida += t; },
    limpiar: () => { salida = ''; },
    finEntrada: () => i >= lineas.length,
    leerLinea: async () => (i < lineas.length ? lineas[i++] : null),
    setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
    setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
    getScrsize: () => ({ lineas: 25, columnas: 80 }),
    beep: async () => {}, leerTecla: async () => 0
  };
  await SLE2.ejecutar(codigo, io, {});
  return salida;
}

(async () => {

  /* ------------------------------------------------------------------ */
  seccion('Un diagrama vacío ya es un programa válido');
  /* ------------------------------------------------------------------ */
  {
    const m = DE.vacio();
    const c = DE.codigo(m);
    comprobar('dice inicio y fin', /inicio[\s\S]*fin/.test(c), JSON.stringify(c));
    let compila = true;
    try { SLE2.compilar(c); } catch (e) { compila = false; }
    comprobar('y compila', compila, c);
  }

  /* ------------------------------------------------------------------ */
  seccion('Los siete bloques generan código que compila y corre');
  /* ------------------------------------------------------------------ */
  {
    comprobar('hay siete tipos de bloque', Object.keys(DE.TIPOS).length === 7,
      Object.keys(DE.TIPOS).join());
    for (const t of Object.keys(DE.TIPOS)) {
      const spec = DE.TIPOS[t];
      comprobar(`${t}: tiene nombre, forma y ayuda`, !!spec.nombre && !!spec.forma && !!spec.ayuda);
      comprobar(`${t}: declara sus campos`, Array.isArray(spec.campos));
    }

    const m = DE.vacio();
    m.nombre = 'demo';
    m.vars.push({ nombres: 'n, total, i', tipo: 'numerico' });
    m.vars.push({ nombres: 's', tipo: 'cadena' });

    const p1 = DE.agregar(m, null, null, 'proceso');
    DE.buscar(m, p1).bloque.texto = 'total = 0';

    const sal = DE.agregar(m, null, null, 'salida');
    DE.buscar(m, sal).bloque.texto = '"empiezo\\n"';

    const des = DE.agregar(m, null, null, 'desde');
    const d = DE.buscar(m, des).bloque;
    d.ctrl = 'i'; d.desde = '1'; d.hasta = '3';
    const dentro = DE.agregar(m, { id: des, rama: 'cuerpo' }, null, 'proceso');
    DE.buscar(m, dentro).bloque.texto = 'total = total + i';

    const si = DE.agregar(m, null, null, 'si');
    DE.buscar(m, si).bloque.cond = 'total > 3';
    const si1 = DE.agregar(m, { id: si, rama: 'entonces' }, null, 'salida');
    DE.buscar(m, si1).bloque.texto = '"grande\\n"';
    const si2 = DE.agregar(m, { id: si, rama: 'sino' }, null, 'salida');
    DE.buscar(m, si2).bloque.texto = '"chico\\n"';

    const mie = DE.agregar(m, null, null, 'mientras');
    DE.buscar(m, mie).bloque.cond = 'total > 5';
    const mie1 = DE.agregar(m, { id: mie, rama: 'cuerpo' }, null, 'proceso');
    DE.buscar(m, mie1).bloque.texto = 'total = total - 1';

    const rep = DE.agregar(m, null, null, 'repetir');
    DE.buscar(m, rep).bloque.cond = 'total <= 0';
    const rep1 = DE.agregar(m, { id: rep, rama: 'cuerpo' }, null, 'proceso');
    DE.buscar(m, rep1).bloque.texto = 'total = total - 1';

    const fin = DE.agregar(m, null, null, 'salida');
    DE.buscar(m, fin).bloque.texto = '"total ", total, "\\n"';

    const c = DE.codigo(m);
    let ast = null, err = null;
    try { ast = SLE2.compilar(c); } catch (e) { err = e; }
    comprobar('el programa compila', !!ast, err && (err.message + '\n' + c));

    if (ast) {
      comprobar('conserva el nombre', ast.nombre === 'demo');
      comprobar('declara las dos variables', (ast.vars || []).length === 2,
        JSON.stringify((ast.vars || []).map(v => v.nombres)));
      const salida = await correr(c);
      comprobar('y corre dando lo esperado',
        salida === 'empiezo\ngrande\ntotal 0\n', JSON.stringify(salida) + '\n' + c);
    }

    /* Y se puede dibujar: el dibujo sale del programa, no del modelo. */
    if (ast) {
      const rutinas = Diagrama.generar(ast);
      comprobar('el diagrama se dibuja', rutinas.length >= 1 && /<svg/.test(rutinas[0].svg));
      comprobar('con un rombo por cada decisión y ciclo',
        (rutinas[0].svg.match(/<polygon/g) || []).length >= 3,
        String((rutinas[0].svg.match(/<polygon/g) || []).length));
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Traer un programa y volver a generarlo da lo mismo');
  /* ------------------------------------------------------------------ */
  {
    const ORIGINAL = [
      'programa vuelta',
      'var',
      '   n : numerico',
      '   s : cadena',
      'inicio',
      '   n = 0',
      '   leer (n)',
      '   imprimir ("n vale ", n, "\\n")',
      '   si (n > 0)',
      '   {',
      '      imprimir ("positivo\\n")',
      '   sino',
      '      imprimir ("no positivo\\n")',
      '   }',
      '   mientras (n > 0)',
      '   {',
      '      n = n - 1',
      '   }',
      '   repetir',
      '      n = n + 1',
      '   hasta (n >= 2)',
      '   desde n = 1 hasta 3 paso 2',
      '   {',
      '      imprimir (n, "\\n")',
      '   }',
      'fin',
      ''
    ].join('\n');

    const ast = SLE2.compilar(ORIGINAL);
    const r = DE.desdeAST(ast);
    comprobar('se puede traer', !!r && !!r.modelo);
    comprobar('sin dejar nada afuera', r.resto.length === 0, JSON.stringify(r.resto));
    comprobar('con sus dos variables', r.modelo.vars.length === 2,
      JSON.stringify(r.modelo.vars));
    comprobar('y el nombre', r.modelo.nombre === 'vuelta');

    const tipos = r.modelo.cuerpo.map(b => b.t).join();
    comprobar('cada sentencia es el bloque que corresponde',
      tipos === 'proceso,entrada,salida,si,mientras,repetir,desde', tipos);

    /* La vuelta completa: modelo -> código -> se ejecuta igual que el original. */
    const generado = DE.codigo(r.modelo);
    let compila = true, err = null;
    try { SLE2.compilar(generado); } catch (e) { compila = false; err = e; }
    comprobar('lo generado compila', compila, err && (err.message + '\n' + generado));

    const a = await correr(ORIGINAL, '5\n');
    const b = await correr(generado, '5\n');
    comprobar('y hace exactamente lo mismo que el original', a === b,
      'original: ' + JSON.stringify(a) + '\ngenerado: ' + JSON.stringify(b) + '\n' + generado);

    /* Y una segunda vuelta no cambia nada más: el modelo es estable. */
    const r2 = DE.desdeAST(SLE2.compilar(generado));
    comprobar('la segunda vuelta da el mismo código', DE.codigo(r2.modelo) === generado,
      generado + '\n---\n' + DE.codigo(r2.modelo));
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que no entra en un diagrama se dice, no se tira');
  /* ------------------------------------------------------------------ */
  {
    const CON_SUB = [
      'inicio',
      '   saludar ()',
      'fin',
      '',
      'subrutina saludar ()',
      'inicio',
      '   imprimir ("hola")',
      'fin',
      ''
    ].join('\n');
    const r = DE.desdeAST(SLE2.compilar(CON_SUB));
    comprobar('la subrutina se avisa', r.resto.some(x => /subrutina saludar/.test(x.t)),
      JSON.stringify(r.resto));
    comprobar('y la llamada sí entra como proceso',
      r.modelo.cuerpo.length === 1 && r.modelo.cuerpo[0].t === 'proceso',
      JSON.stringify(r.modelo.cuerpo.map(b => b.t)));

    const conEval = SLE2.compilar('inicio\n   eval\n   {\n      caso (TRUE)\n         imprimir ("a")\n   }\nfin\n');
    const r2 = DE.desdeAST(conEval);
    comprobar('un eval se avisa como no representable',
      r2.resto.some(x => x.t === 'eval'), JSON.stringify(r2.resto));
  }

  /* ------------------------------------------------------------------ */
  seccion('Agregar, borrar y mover');
  /* ------------------------------------------------------------------ */
  {
    const m = DE.vacio();
    const a = DE.agregar(m, null, null, 'proceso');
    const b = DE.agregar(m, null, null, 'proceso');
    const c = DE.agregar(m, null, null, 'proceso');
    DE.buscar(m, a).bloque.texto = 'a = 1';
    DE.buscar(m, b).bloque.texto = 'b = 2';
    DE.buscar(m, c).bloque.texto = 'c = 3';
    comprobar('los ids no se repiten', new Set([a, b, c]).size === 3);

    comprobar('mover baja un bloque', DE.mover(m, a, 1)
      && m.cuerpo.map(x => x.texto).join() === 'b = 2,a = 1,c = 3',
      m.cuerpo.map(x => x.texto).join());
    comprobar('mover sube un bloque', DE.mover(m, c, -1)
      && m.cuerpo.map(x => x.texto).join() === 'b = 2,c = 3,a = 1',
      m.cuerpo.map(x => x.texto).join());
    comprobar('no se puede subir el primero', DE.mover(m, m.cuerpo[0].id, -1) === false);
    comprobar('ni bajar el último', DE.mover(m, m.cuerpo[2].id, 1) === false);

    comprobar('borrar saca el bloque', DE.borrar(m, b) && m.cuerpo.length === 2);
    comprobar('borrar algo que no existe no rompe', DE.borrar(m, 'noExiste') === false);
    comprobar('buscar algo que no existe devuelve null', DE.buscar(m, 'noExiste') === null);

    /* Insertar en una posición concreta. */
    const d = DE.agregar(m, null, 0, 'salida');
    comprobar('se puede insertar al principio', m.cuerpo[0].id === d);

    /* Un bloque adentro de otro. */
    const si = DE.agregar(m, null, null, 'si');
    const dentro = DE.agregar(m, { id: si, rama: 'entonces' }, null, 'proceso');
    comprobar('se agrega adentro de la rama pedida',
      DE.buscar(m, si).bloque.entonces.length === 1 && DE.buscar(m, dentro) !== null);
    comprobar('y borrar el padre se lleva a los hijos',
      DE.borrar(m, si) && DE.buscar(m, dentro) === null);

    comprobar('un tipo que no existe no crea nada', DE.agregar(m, null, null, 'ovni') === null);
  }

  /* ------------------------------------------------------------------ */
  seccion('Bloques a medio llenar no rompen el programa');
  /* ------------------------------------------------------------------ */
  {
    /* Mientras se está armando el diagrama, los campos están vacíos. El
       código tiene que seguir compilando para que el dibujo se pueda ver. */
    const m = DE.vacio();
    for (const t of ['proceso', 'entrada', 'salida', 'si', 'mientras', 'repetir', 'desde'])
      DE.agregar(m, null, null, t);
    const c = DE.codigo(m);
    let err = null;
    try { SLE2.compilar(c); } catch (e) { err = e; }
    /* El «proceso» vacío deja un comentario, no una sentencia inventada. */
    comprobar('un proceso vacío queda como comentario', /falta la sentencia/.test(c));
    comprobar('y el resto compila igual', !err, err && (err.message + '\n' + c));
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el editor de diagramas tiene fallos');
})();

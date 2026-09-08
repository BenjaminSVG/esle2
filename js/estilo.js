/*
 * Revisor de estilo.
 *
 * El "Revisar" de SLE2 (SLE2.revisar) busca cosas que probablemente sean un
 * error: mayúsculas mal puestas, variables sin usar, ciclos que no terminan.
 * Esto es el otro lado: código que anda pero se puede escribir mejor. Son
 * sugerencias, nunca errores, y por eso cada una explica el porqué.
 *
 * Criterio para agregar una regla: que casi nunca se equivoque. Un aviso
 * falso enseña a ignorar los avisos, que es peor que no tenerlos.
 *
 * API:  Estilo.revisar(ast) -> [{ linea, mensaje, sugerencia }]
 */
(function (global) {
  'use strict';

  const S = global.SLE2;
  const recorrer = S.recorrer;

  const LOGICOS = ['TRUE', 'FALSE', 'SI', 'NO'];
  // Nombres cortos que en un algoritmo se entienden igual: contadores, un vector,
  // un texto, un resultado. Avisar de estos sería ruido.
  const CORTOS_OK = ['i', 'j', 'k', 'n', 'm', 'f', 'c', 'x', 'y', 'z', 'p', 'q',
    'v', 'w', 'r', 's', 't', 'a', 'b', 'd', 'e', 'g', 'h'];
  // Solo tiene sentido nombrar un número grande y repetido: los chiquitos suelen ser
  // tamaños de arreglo o límites de ciclo, y ponerles nombre no aclara nada.
  const MINIMO_MAGICO = 10;
  const NORMALES = [10, 100, 1000];

  /* Dos trozos de programa iguales, sin mirar en qué línea están. */
  const sinLineas = n => JSON.stringify(n, (k, v) => (k === 'linea' ? undefined : v));
  const mismo = (a, b) => sinLineas(a) === sinLineas(b);

  /* La variable de la que cuelga un destino:  A[k].nota  ->  A */
  const raiz = n => {
    while (n && (n.t === 'indice' || n.t === 'campo')) n = n.base;
    return n && n.t === 'id' ? n.nombre : null;
  };

  function revisar(ast) {
    if (!ast || !ast.cuerpo) return [];
    const avisos = [];
    const add = (linea, mensaje, sugerencia) => avisos.push({ linea, mensaje, sugerencia });

    /* Cuerpos: el programa, sus subrutinas y —si es ESLE2 POO— los métodos. */
    const rutinas = [{ nombre: 'el programa', cuerpo: ast.cuerpo, params: [], vars: ast.vars }];
    (ast.subs || []).forEach(s => rutinas.push({ nombre: `la subrutina ${s.nombre}()`, cuerpo: s.cuerpo, params: s.params, vars: s.vars }));
    (ast.clases || []).forEach(c => (c.metodos || []).forEach(m =>
      rutinas.push({ nombre: `el método ${c.nombre}.${m.nombre || 'constructor'}()`, cuerpo: m.cuerpo, params: m.params, vars: m.vars })));
    const cuerpos = rutinas.map(r => r.cuerpo);

    /* ---------- 1 · variables que se escriben pero no se leen ---------- */
    {
      const escritas = new Map();     // nombre -> línea de la primera escritura
      const leidas = new Set();
      const anotar = (n, linea) => { if (n && !escritas.has(n)) escritas.set(n, linea); };

      recorrer(cuerpos, n => {
        if (n.t === 'asig') {
          anotar(raiz(n.destino), n.linea);
          // lo que está a la derecha sí se lee, igual que los índices del destino
          recorrer(n.valor, x => { if (x.t === 'id') leidas.add(x.nombre); });
          recorrer(n.destino.base ? [n.destino.base, n.destino.idx] : [], x => { if (x.t === 'id') leidas.add(x.nombre); });
        } else if (n.t === 'desde') {
          anotar(raiz(n.ctrl), n.linea);
          recorrer([n.desde, n.hasta, n.paso], x => { if (x.t === 'id') leidas.add(x.nombre); });
        } else if (n.t === 'llamada') {
          (n.args || []).forEach(a => recorrer(a, x => { if (x.t === 'id') leidas.add(x.nombre); }));
          if (n.nombre === 'leer' || n.nombre === 'dim') (n.args || []).forEach(a => anotar(raiz(a), n.linea));
        } else if (n.t === 'si' || n.t === 'mientras' || n.t === 'repetir' || n.t === 'eval' || n.t === 'retorna') {
          recorrer([n.cond, n.valor, n.casos && n.casos.map(c => c.cond)], x => { if (x.t === 'id') leidas.add(x.nombre); });
        }
      });

      // La variable de control de un "desde" la maneja el ciclo: que el cuerpo no
      // la lea es normal (desde k=1 hasta n { suma = suma + 1 }).
      const controles = new Set();
      recorrer(cuerpos, n => { if (n.t === 'desde') { const r = raiz(n.ctrl); if (r) controles.add(r); } });

      for (const [nombre, linea] of escritas) {
        if (leidas.has(nombre) || controles.has(nombre)) continue;
        add(linea, `a "${nombre}" se le asignan valores pero nunca se lee`,
          'Si el valor no se usa después, la asignación no hace falta; y si tendría que usarse, faltó hacerlo.');
      }
    }

    /* ---------- 2 · comparar con TRUE o FALSE ---------- */
    recorrer(cuerpos, n => {
      if (n.t !== 'bin' || !['==', '=', '<>', '!='].includes(n.op)) return;
      const lado = [n.i, n.d].find(x => x.t === 'id' && LOGICOS.includes(x.nombre));
      if (!lado) return;
      // "b == TRUE" y "b <> FALSE" son b;  "b == FALSE" y "b <> TRUE" son not b.
      const igualdad = ['==', '='].includes(n.op);
      const verdadero = ['TRUE', 'SI'].includes(lado.nombre);
      const directo = igualdad === verdadero;
      add(n.linea, `no hace falta comparar con ${lado.nombre}`,
        directo ? 'Un valor lógico ya sirve solo como condición: escribí  si ( bandera )  en lugar de compararlo.'
                : 'Esa comparación es la negación: alcanza con  si ( not bandera ).');
    });

    /* ---------- 3 · si que solo asigna TRUE o FALSE ---------- */
    recorrer(cuerpos, n => {
      if (n.t !== 'si' || !n.sino) return;
      const a = n.entonces, b = n.sino;
      if (a.length !== 1 || b.length !== 1 || a[0].t !== 'asig' || b[0].t !== 'asig') return;
      if (!mismo(a[0].destino, b[0].destino)) return;
      const va = a[0].valor, vb = b[0].valor;
      const esLog = x => x.t === 'id' && LOGICOS.includes(x.nombre);
      if (!esLog(va) || !esLog(vb) || sinLineas(va) === sinLineas(vb)) return;
      const directo = ['TRUE', 'SI'].includes(va.nombre);
      add(n.linea, 'ese "si" se puede escribir en una línea',
        `La condición ya vale ${directo ? 'lo mismo que' : 'lo contrario de'} lo que querés guardar: ` +
        `alcanza con una asignación${directo ? '' : ' con not'}.`);
    });

    /* ---------- 4 · condición que siempre da lo mismo ---------- */
    recorrer(cuerpos, n => {
      const cond = n.t === 'si' || n.t === 'mientras' || n.t === 'repetir' ? n.cond : null;
      if (!cond) return;
      let constante = true;
      recorrer(cond, x => { if (x.t === 'id' && !LOGICOS.includes(x.nombre)) constante = false; if (x.t === 'llamada') constante = false; });
      if (!constante) return;
      if (n.t === 'mientras' && cond.t === 'id' && ['TRUE', 'SI'].includes(cond.nombre)) return;   // ciclo infinito a propósito
      add(n.linea, `la condición del "${n.t}" no depende de ninguna variable`,
        'Siempre va a dar el mismo resultado, así que la rama que se ejecuta ya está decidida antes de correr el programa.');
    });

    /* ---------- 5 · bloques vacíos ---------- */
    recorrer(cuerpos, n => {
      const vacio = (lista, que) => {
        if (lista && lista.length === 0) add(n.linea, `el ${que} está vacío`,
          'Un bloque sin sentencias no hace nada: completalo o sacá la estructura.');
      };
      if (n.t === 'si') { vacio(n.entonces, 'cuerpo del "si"'); if (n.sino) vacio(n.sino, 'bloque "sino"'); }
      if (n.t === 'mientras' || n.t === 'repetir' || n.t === 'desde') vacio(n.cuerpo, `cuerpo del "${n.t}"`);
    });

    /* ---------- 6 · sentencias después de retorna o terminar() ---------- */
    const inalcanzable = lista => {
      if (!Array.isArray(lista)) return;
      lista.forEach((s, i) => {
        const corta = s.t === 'retorna' ||
          (s.t === 'exprStmt' && s.expr.t === 'llamada' && s.expr.nombre === 'terminar');
        if (corta && i < lista.length - 1)
          add(lista[i + 1].linea, 'esta línea nunca se va a ejecutar',
            `Está después de "${s.t === 'retorna' ? 'retorna' : 'terminar()'}", que corta la ejecución ahí mismo.`);
        ['entonces', 'sino', 'cuerpo'].forEach(k => inalcanzable(s[k]));
        if (s.casos) s.casos.forEach(c => inalcanzable(c.cuerpo));
      });
    };
    cuerpos.forEach(inalcanzable);

    /* ---------- 7 · tocar la variable del ciclo desde ---------- */
    recorrer(cuerpos, n => {
      if (n.t !== 'desde') return;
      const ctrl = raiz(n.ctrl);
      if (!ctrl) return;
      let tocada = null;
      recorrer(n.cuerpo, x => {
        if (x.t === 'asig' && raiz(x.destino) === ctrl) tocada = x.linea;
        if (x.t === 'llamada' && ['inc', 'dec'].includes(x.nombre) && raiz(x.args[0]) === ctrl) tocada = x.linea;
      });
      if (tocada) add(tocada, `el ciclo cambia por dentro su propia variable "${ctrl}"`,
        'El "desde" ya se encarga de avanzarla: cambiarla adentro hace que la cuenta de vueltas sea difícil de seguir. Si necesitás otro avance, usá "mientras".');
    });

    /* ---------- 8 · el mismo número repetido muchas veces ---------- */
    {
      const cuenta = new Map();
      recorrer(cuerpos, n => {
        if (n.t !== 'num' || Math.abs(n.v) < MINIMO_MAGICO || NORMALES.includes(n.v)) return;
        const c = cuenta.get(n.v) || { veces: 0, linea: n.linea };
        c.veces++;
        cuenta.set(n.v, c);
      });
      for (const [valor, c] of cuenta) {
        if (c.veces < 3) continue;
        add(c.linea, `el número ${valor} aparece ${c.veces} veces`,
          `Si es un dato del problema, dale nombre:  const  MAX = ${valor}. Cuando cambie, se toca en un solo lugar.`);
      }
    }

    /* ---------- 9 · una letra sola para un texto o un registro ----------
       En un contador (k, i, f, c) una letra se entiende; en algo que guarda un
       texto o una ficha, no dice nada de lo que hay adentro. Por eso el aviso
       mira el tipo declarado, y no cuántas letras tiene el nombre. */
    {
      const usos = new Map();
      recorrer(cuerpos, n => {
        if (n.t !== 'id' || n.nombre.length !== 1) return;
        usos.set(n.nombre, (usos.get(n.nombre) || 0) + 1);
      });
      const controles = new Set();
      recorrer(cuerpos, n => { if (n.t === 'desde') { const r = raiz(n.ctrl); if (r) controles.add(r); } });

      const tipoDe = new Map();
      const anotarTipos = origen => (origen.vars || []).forEach(d =>
        d.nombres.forEach(n => tipoDe.set(n, d.tipo || (d.init && d.init.t === 'cad' ? { k: 'cad' } : null))));
      anotarTipos(ast);
      (ast.subs || []).forEach(anotarTipos);

      const nombrable = t => t && (t.k === 'cad' || t.k === 'rec' || t.k === 'nombre');
      for (const [nombre, veces] of usos) {
        if (veces < 6 || controles.has(nombre) || !nombrable(tipoDe.get(nombre))) continue;
        add(1, `"${nombre}" guarda un texto o una ficha y su nombre no dice cuál`,
          'Una letra sola se entiende en el contador de un ciclo. Para lo demás, un nombre como "nombre", "titulo" o "alumno" hace que el programa se lea solo.');
      }
    }

    /* ---------- 10 · subrutinas muy largas ---------- */
    rutinas.forEach(r => {
      let sentencias = 0;
      recorrer(r.cuerpo, n => { if (n.t && ['asig', 'exprStmt', 'si', 'mientras', 'repetir', 'desde', 'eval', 'retorna'].includes(n.t)) sentencias++; });
      if (sentencias > 40)
        add(r.cuerpo.length ? r.cuerpo[0].linea : 1, `${r.nombre} tiene ${sentencias} sentencias`,
          'Cuando una rutina se pasa de largo conviene partirla: cada subrutina debería poder explicarse en una frase.');
    });

    return avisos.sort((a, b) => a.linea - b.linea);
  }

  global.Estilo = { revisar };
})(typeof window !== 'undefined' ? window : globalThis);

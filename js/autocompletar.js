/*
 * Autocompletado del editor.
 *
 * Mientras se escribe aparece una lista con lo que puede ir ahí: las palabras
 * reservadas, las subrutinas que trae el lenguaje —con su firma y la
 * explicación sacada de la documentación—, y lo que declaró el propio
 * programa: variables, constantes, tipos, subrutinas y, en ESLE2 POO, clases,
 * métodos y atributos.
 *
 * La idea es que no haga falta acordarse de cómo se escribía «set_curpos» ni
 * si era «substr» o «subcad», y sobre todo que no se escriba mal un nombre.
 * Por eso hay tres ayudas pensadas para los errores típicos de SL:
 *
 *   · si lo escrito no existe pero se parece a algo que sí, se ofrece eso
 *     («imrimir» propone «imprimir»), usando la misma medida de parecido con
 *     la que el intérprete sugiere correcciones en sus errores;
 *   · si se escribió una palabra reservada con mayúsculas —«Si», «MIENTRAS»—,
 *     lo primero que aparece es la forma en minúsculas, que es la única
 *     válida y el error más difícil de encontrar de SL;
 *   · las estructuras se completan enteras (si, mientras, desde, subrutina…),
 *     con el «sino» adentro de las llaves, que es donde va en SL.
 *
 * El análisis del programa se hace con una lectura superficial del texto, no
 * con el compilador: mientras se escribe, el programa casi nunca compila.
 *
 * API (todo lo de abajo es cálculo puro, sin DOM: lo prueba test/test-autocompletar.js)
 *   Autocompletar.declaraciones(fuente) -> { vars, consts, tipos, subs, clases, … }
 *   Autocompletar.sugerir(prefijo, opciones) -> [{ texto, tipo, firma, ayuda, corrige }]
 *   Autocompletar.contexto(linea)            -> 'general' | 'campo' | 'clase' | 'nuevo'
 */
(function (global) {
  'use strict';

  const MARCA = '‸';   // dónde queda el cursor dentro de una plantilla
  const MAX = 40;           // cuántas sugerencias se muestran como mucho

  /* Estructuras completas. No son texto de ayuda sino la forma correcta de
     escribirlas en SL, que es lo que más se equivoca al empezar. */
  const PLANTILLAS = {
    si: 'si ( ' + MARCA + ' )\n{\n   \n}',
    sino: 'si ( ' + MARCA + ' )\n{\n   \nsino\n   \n}',
    mientras: 'mientras ( ' + MARCA + ' )\n{\n   \n}',
    repetir: 'repetir\n   \nhasta ( ' + MARCA + ' )',
    desde: 'desde ' + MARCA + ' = 1 hasta n\n{\n   \n}',
    eval: 'eval\n{\n   caso ( ' + MARCA + ' )   \n   sino             \n}',
    subrutina: 'subrutina ' + MARCA + ' ()\nvar\n   \ninicio\n   \nfin',
    registro: 'registro { ' + MARCA + ' : numerico }',
    vector: 'vector [' + MARCA + '] numerico',
    matriz: 'matriz [' + MARCA + ', 1] numerico',
    programa: 'programa ' + MARCA + '\nvar\n   \ninicio\n   \nfin',
    clase: 'clase ' + MARCA + '\n{\n   atributos\n      privado\n         \n\n   constructor ()\n   inicio\n      \n   fin\n}',
    metodo: 'metodo ' + MARCA + ' ()\ninicio\n   \nfin',
    constructor: 'constructor (' + MARCA + ')\ninicio\n   \nfin'
  };

  /* Quita comentarios y cadenas: adentro no hay declaraciones que leer. */
  function limpiar(fuente) {
    return String(fuente || '')
      .replace(/\/\*[\s\S]*?(?:\*\/|$)/g, ' ')
      .replace(/\/\/[^\n]*/g, ' ')
      .replace(/"[^"\n]*"?/g, '""')
      .replace(/'[^'\n]*'?/g, "''");
  }

  const ID = '[A-Za-z_ñÑ][A-Za-z0-9_ñÑ]*';
  const reID = new RegExp(ID);

  /* Nombres declarados en un bloque «var», «const», «tipos» o «atributos»:
     líneas de la forma  a, b : tipo   o   n = 0. */
  function nombresDeBloque(texto) {
    const out = [];
    for (const linea of texto.split('\n')) {
      const m = new RegExp('^\\s*(' + ID + '(?:\\s*,\\s*' + ID + ')*)\\s*[:=]').exec(linea);
      if (m) m[1].split(',').forEach(n => out.push(n.trim()));
    }
    return out;
  }

  /* Trozos que van desde una palabra que abre sección hasta la que la cierra. */
  function bloques(texto, apertura, cierre) {
    const out = [];
    const re = new RegExp('(^|\\s)(?:' + apertura + ')\\s*\\n', 'g');
    let m;
    while ((m = re.exec(texto))) {
      const desde = m.index + m[0].length;
      const resto = texto.slice(desde);
      const fin = new RegExp('(^|\\n)\\s*(?:' + cierre + ')\\b').exec(resto);
      out.push(fin ? resto.slice(0, fin.index) : resto);
    }
    return out;
  }

  const unicos = a => [...new Set(a.filter(Boolean))];

  function declaraciones(fuente) {
    const t = limpiar(fuente);
    const CIERRE = 'inicio|var|variables|const|constantes|tipos|subrutina|sub|clase|metodo|constructor|fin|atributos';

    const vars = [];
    bloques(t, 'var|variables', CIERRE).forEach(b => vars.push(...nombresDeBloque(b)));
    const consts = [];
    bloques(t, 'const|constantes', CIERRE).forEach(b => consts.push(...nombresDeBloque(b)));
    const tipos = [];
    bloques(t, 'tipos', CIERRE).forEach(b => tipos.push(...nombresDeBloque(b)));
    const atributos = [];
    bloques(t, 'atributos|publico|privado|protegido|compartido', CIERRE + '|publico|privado|protegido')
      .forEach(b => atributos.push(...nombresDeBloque(b)));

    const subs = [];
    for (const m of t.matchAll(new RegExp('\\b(?:subrutina|sub)\\s+(' + ID + ')\\s*\\(([^)]*)\\)', 'g')))
      subs.push({ nombre: m[1], params: parametros(m[2]) });

    const metodos = [];
    for (const m of t.matchAll(new RegExp('\\bmetodo\\s+(' + ID + ')\\s*\\(([^)]*)\\)', 'g')))
      metodos.push({ nombre: m[1], params: parametros(m[2]) });

    const clases = [];
    for (const m of t.matchAll(new RegExp('\\bclase\\s+(' + ID + ')', 'g'))) clases.push(m[1]);

    /* Último recurso: cualquier identificador que ya esté escrito. Sirve para
       lo que la lectura superficial no vio, y para no repetir un nombre mal. */
    const palabras = unicos([...t.matchAll(new RegExp('\\b' + ID + '\\b', 'g'))].map(m => m[0]))
      .filter(p => p.length >= 3);

    /* Los parámetros de las subrutinas también son variables donde se usan. */
    subs.concat(metodos).forEach(s => vars.push(...s.params));

    return {
      vars: unicos(vars), consts: unicos(consts), tipos: unicos(tipos),
      atributos: unicos(atributos), clases: unicos(clases),
      subs, metodos, palabras
    };
  }

  function parametros(texto) {
    const out = [];
    for (const trozo of String(texto).split(/[;,]/)) {
      const m = new RegExp('(?:\\bref\\s+)?(' + ID + ')\\s*(?::|$)').exec(trozo.trim());
      if (m) out.push(m[1]);
    }
    return out;
  }

  /* Las palabras del SQL de ESLE2 BD. Van en mayúsculas porque así se
     escriben en todo el material, aunque el motor acepte cualquier forma. */
  const SQL_PALABRAS = ('SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE '
    + 'CREATE TABLE DROP IF NOT EXISTS NULL PRIMARY KEY UNIQUE DEFAULT FOREIGN REFERENCES '
    + 'AND OR ORDER BY ASC DESC GROUP HAVING JOIN LEFT INNER ON AS DISTINCT LIMIT OFFSET '
    + 'IS LIKE IN BETWEEN COUNT SUM AVG MIN MAX UPPER LOWER LENGTH TRIM ROUND ABS SUBSTR '
    + 'COALESCE IFNULL INTEGER REAL TEXT VARCHAR DECIMAL').split(' ');

  /* Y sus formas en español, que son las que se enseñan primero. Están todas:
     el material se escribe en español, así que si el autocompletado ofreciera
     solo la mitad estaría empujando a escribir mitad y mitad. */
  const SQL_PAREJAS = [
    ['SELECCIONAR', 'SELECT'], ['DE', 'FROM'], ['DONDE', 'WHERE'],
    ['INSERTAR', 'INSERT'], ['DENTRO', 'INTO'], ['VALORES', 'VALUES'],
    ['ACTUALIZAR', 'UPDATE'], ['CONJUNTO', 'SET'], ['BORRAR', 'DELETE'],
    ['CREAR', 'CREATE'], ['TABLA', 'TABLE'], ['ELIMINAR', 'DROP'], ['USAR', 'USE'],
    ['ORDENAR', 'ORDER'], ['AGRUPAR', 'GROUP'], ['POR', 'BY'], ['TENIENDO', 'HAVING'],
    ['UNIR', 'JOIN'], ['INTERIOR', 'INNER'], ['IZQUIERDA', 'LEFT'], ['SEGUN', 'ON'],
    ['COMO', 'AS'], ['COMO_PATRON', 'LIKE'], ['DISTINTOS', 'DISTINCT'],
    ['LIMITE', 'LIMIT'], ['DESPLAZAMIENTO', 'OFFSET'],
    ['ASCENDENTE', 'ASC'], ['DESCENDENTE', 'DESC'],
    ['ES', 'IS'], ['NULO', 'NULL'], ['EN', 'IN'], ['ENTRE', 'BETWEEN'],
    ['EXISTE', 'EXISTS'], ['SI', 'IF'], ['NO', 'NOT'],
    ['CLAVE PRIMARIA', 'PRIMARY KEY'], ['CLAVE FORANEA', 'FOREIGN KEY'],
    ['REFERENCIA', 'REFERENCES'], ['UNICO', 'UNIQUE'], ['POR DEFECTO', 'DEFAULT'],
    ['CONTAR', 'COUNT'], ['SUMAR', 'SUM'], ['PROMEDIO', 'AVG'],
    ['MINIMO', 'MIN'], ['MAXIMO', 'MAX'],
    ['MAYUSCULAS', 'UPPER'], ['MINUSCULAS', 'LOWER'], ['LONGITUD', 'LENGTH'],
    ['RECORTAR', 'TRIM'], ['REDONDEAR', 'ROUND'], ['ABSOLUTO', 'ABS'],
    ['SUBCADENA', 'SUBSTR'], ['PRIMERO_NO_NULO', 'COALESCE'], ['SI_NULO', 'IFNULL'],
    ['ENTERO', 'INTEGER'], ['TEXTO', 'TEXT'], ['CADENA', 'VARCHAR'],
    ['NUMERICO', 'NUMERIC'], ['LOGICO', 'BOOLEAN'], ['FECHA', 'DATE']
  ];

  /* -------------------------- el catálogo ---------------------------- */
  function catalogo(op) {
    op = op || {};
    const S = global.SLE2;
    const ayudas = op.ayudas || global.ESLE2Ayudas || {};
    const d = declaraciones(op.fuente || '');
    const lista = [];
    const add = (texto, tipo, firma, ayuda) => lista.push({ texto, tipo, firma: firma || texto, ayuda: ayuda || '' });

    for (const p of (S ? S.RESERVADAS : []))
      add(p, 'reservada', PLANTILLAS[p] ? p + ' …' : p,
        PLANTILLAS[p] ? 'estructura completa' : 'palabra reservada');
    for (const t of ['numerico', 'cadena', 'logico']) add(t, 'tipo', t, 'tipo de dato');
    for (const c of ['TRUE', 'FALSE', 'SI', 'NO']) add(c, 'constante', c, 'constante lógica');
    if (op.poo)
      for (const p of ['clase', 'metodo', 'constructor', 'atributos', 'este', 'padre', 'nuevo',
                       'nulo', 'publico', 'privado', 'protegido', 'hereda', 'abstracta', 'es'])
        add(p, 'reservada', PLANTILLAS[p] ? p + ' …' : p, 'ESLE2 POO');

    /* Un dialecto puede sumar las suyas (ESLE2 Visual, por ejemplo). */
    const predefinidas = new Set(Object.keys(S ? S.PREDEF : {}).concat(op.extras || []));
    for (const n of predefinidas)
      add(n, 'predefinida', ayudas[n] ? ayudas[n].firma : n + ' ()',
        ayudas[n] ? ayudas[n].texto : 'subrutina predefinida');

    /* ESLE2 BD: las palabras del SQL que se escribe suelto, y —lo que más
       sirve— los nombres de las tablas y columnas que hay ahora en la base,
       que son justo los que no se pueden adivinar ni están en ninguna lista. */
    if (op.sql) {
      for (const p of SQL_PALABRAS) add(p, 'sql', p, 'palabra de SQL');
      for (const [es, en] of SQL_PAREJAS) add(es, 'sql', es, 'lo mismo que ' + en);
      for (const t of (op.tablas || [])) {
        add(t.nombre, 'tabla', t.nombre + ' (' + t.columnas.length + ' columna(s))', 'tabla de la base');
        for (const c of t.columnas)
          add(c.nombre, 'columna', c.nombre + ' : ' + (c.tipo || ''),
            'columna de ' + t.nombre + (c.pk ? ', clave primaria' : '')
            + (c.refiere ? ', apunta a ' + c.refiere.tabla : ''));
      }
    }

    d.consts.forEach(n => add(n, 'constante', n, 'constante del programa'));
    d.tipos.forEach(n => add(n, 'tipo', n, 'tipo del programa'));
    d.clases.forEach(n => add(n, 'clase', n, 'clase del programa'));
    d.vars.forEach(n => add(n, 'variable', n, 'variable del programa'));
    d.atributos.forEach(n => add(n, 'atributo', n, 'atributo de la clase'));
    d.subs.forEach(s => add(s.nombre, 'subrutina', `${s.nombre} (${s.params.join(', ')})`, 'subrutina del programa'));
    d.metodos.forEach(s => add(s.nombre, 'metodo', `${s.nombre} (${s.params.join(', ')})`, 'método de una clase'));

    const vistos = new Set(lista.map(x => x.texto));
    d.palabras.forEach(n => { if (!vistos.has(n)) { vistos.add(n); add(n, 'palabra', n, 'ya aparece en el programa'); } });
    return lista;
  }

  /* Dónde está el cursor: después de un punto solo pueden ir campos o
     métodos, y después de «nuevo» solo una clase. */
  function contexto(hastaElCursor) {
    const t = String(hastaElCursor || '');
    if (/\bnuevo\s+[A-Za-z0-9_ñÑ]*$/.test(t)) return 'nuevo';
    if (/[A-Za-z0-9_ñÑ)\]]\s*\.\s*[A-Za-z0-9_ñÑ]*$/.test(t)) return 'campo';
    return 'general';
  }

  const ORDEN = {
    reservada: 0, predefinida: 1, subrutina: 1, metodo: 1,
    /* En ESLE2 BD lo que más se escribe son nombres de la base: van arriba de
       las palabras sueltas de SQL, que uno ya se sabe. */
    tabla: 1, columna: 2, variable: 2, atributo: 2,
    constante: 3, tipo: 3, clase: 3, sql: 4, palabra: 5
  };

  function sugerir(prefijo, op) {
    op = op || {};
    const pref = String(prefijo || '');
    const bajo = pref.toLowerCase();
    const ctx = op.contexto || 'general';
    let lista = catalogo(op);

    if (ctx === 'campo') lista = lista.filter(x => ['atributo', 'metodo', 'variable', 'palabra'].includes(x.tipo));
    if (ctx === 'nuevo') lista = lista.filter(x => x.tipo === 'clase');
    /* Lo que se está escribiendo ya figura en el texto, así que la lectura del
       programa lo devuelve como si fuera una palabra conocida: ofrecerlo no
       completa nada y taparía la corrección del nombre mal escrito. */
    lista = lista.filter(x => !(x.tipo === 'palabra' && x.texto === pref));

    const salida = [];
    const puesto = new Set();
    const meter = (x, rango, extra) => {
      if (puesto.has(x.texto)) return;
      puesto.add(x.texto);
      salida.push(Object.assign({ rango, corrige: false }, x, extra || {}));
    };

    /* Una palabra reservada escrita con mayúsculas: SL solo las acepta en
       minúsculas y el error aparece después, en un lugar que no se entiende. */
    const S = global.SLE2;
    if (pref && S && S.RESERVADAS.has(bajo) && pref !== bajo) {
      const x = lista.find(y => y.texto === bajo);
      if (x) meter(x, -1, { corrige: true, ayuda: 'las palabras reservadas van siempre en minúsculas' });
    }

    if (!pref) {
      lista.forEach(x => meter(x, ORDEN[x.tipo] || 4));
    } else {
      for (const x of lista) if (x.texto.startsWith(pref)) meter(x, ORDEN[x.tipo] || 4);
      for (const x of lista) if (x.texto.toLowerCase().startsWith(bajo)) meter(x, 6 + (ORDEN[x.tipo] || 4));
      for (const x of lista) if (x.texto.toLowerCase().includes(bajo)) meter(x, 12 + (ORDEN[x.tipo] || 4));

      /* Nada empieza igual: puede ser un error de tipeo. Se usa la misma
         medida de parecido con la que el intérprete corrige los nombres. */
      if (!salida.length && S && pref.length >= 3) {
        const cerca = S.parecido(pref, lista.map(x => x.texto));
        const x = cerca && lista.find(y => y.texto === cerca);
        if (x) meter(x, 0, { corrige: true, ayuda: '¿quisiste escribir «' + cerca + '»? · ' + x.ayuda });
      }
    }

    salida.sort((a, b) => a.rango - b.rango || a.texto.length - b.texto.length ||
                          a.texto.localeCompare(b.texto));
    return salida.slice(0, MAX);
  }

  global.Autocompletar = { declaraciones, catalogo, sugerir, contexto, PLANTILLAS, MARCA, limpiar };
})(typeof window !== 'undefined' ? window : globalThis);

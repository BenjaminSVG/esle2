/*
 * Resaltado de sintaxis de ESLE2 y ESLE2 POO para CodeMirror.
 *
 * No es una lista de expresiones regulares: es un pequeño analizador con
 * estado que mira el contexto, como hace Visual Studio Code. Así distingue
 * un nombre de clase de una variable, una llamada a función de un atributo,
 * un parámetro de una variable local, etc.
 *
 * Categorías que emite (la clase CSS es cm-<categoria>):
 *   comentario  cadena  numero  control  declaracion  tipo  clase
 *   funcion  predefinida  variable  propiedad  parametro  constante
 *   lenguaje  operador  puntuacion
 */
(function (global) {
  'use strict';

  const juego = (...palabras) => new Set(palabras.join(' ').split(/\s+/).filter(Boolean));

  // Palabras que dirigen el flujo del programa.
  const CONTROL = juego(`si sino mientras repetir hasta desde paso eval caso
                         retorna and or not es`);

  // Palabras que declaran o estructuran.
  const DECLARACION = juego(`programa inicio fin var variables const constantes
                             tipos subrutina sub ref lib libext archivo`);

  const DECLARACION_POO = juego(`clase hereda atributos metodos metodo constructor
                                 publico privado protegido abstracta abstracto
                                 compartido nuevo`);

  const TIPOS = juego('numerico cadena logico vector matriz registro');
  const CONSTANTES = juego('TRUE FALSE SI NO nulo');
  const LENGUAJE = juego('este padre');

  // Subrutinas y funciones que trae el lenguaje.
  const PREDEFINIDAS = juego(`imprimir leer cls dim alen eof set_ifs get_ifs set_ofs
    get_ofs set_stdin set_stdout set_color get_color set_curpos get_curpos
    get_scrsize beep readkey ifval intercambiar swap max min terminar runcmd
    paramval pcount inc dec abs arctan ascii cos sin tan exp log sqrt int lower
    upper ord strlen strdup substr pos val str random sec mem
    clase_de es_nulo id_de`);

  /* ESLE2 BD escribe las instrucciones de la base sueltas, sin comillas, así
     que sus palabras también hay que pintarlas. Se miran en minúsculas porque
     en SQL da igual cómo se escriban, y solo después de las palabras de SL:
     si una coincide —"de", por ejemplo— manda SL. */
  const SQL_CLAUSULA = juego(`select seleccionar from de where donde insert insertar
    into dentro values valores update actualizar set conjunto delete borrar
    create crear table tabla drop eliminar use usar database order group by
    having join left inner outer on as distinct limit offset asc desc union
    exists between like in is all any primary key unique default references
    foreign check autoincrement if`);

  const SQL_TIPO = juego(`integer int text char varchar real float double numeric
    decimal boolean blob date datetime time`);

  const SQL_FUNCION = juego(`count sum avg min max upper lower length trim round
    abs substr coalesce ifnull`);

  const LETRA = /[A-Za-z_ñÑ]/;
  const ALFANUM = /[A-Za-z0-9_ñÑ]/;

  function crearModo(poo, sql) {
    return function () {
      return {
        startState() {
          return {
            enComentario: false,
            esperaClase: false,     // después de: clase, hereda, nuevo, es, o un ":" con tipo propio
            esperaNombre: false,    // después de: metodo, subrutina, sub, programa
            esperaTipo: false,      // después de ":" o de "retorna"
            trasPunto: false,       // el token anterior fue "."
            seccion: null,          // 'tipos' | 'atributos' | 'var' | null
            llaves: 0,              // profundidad de { } dentro de una declaración
            tipoTrasCorchete: false,// el tipo llega después de [ ... ]
            enParametros: 0,        // profundidad de paréntesis de una lista de parámetros
            paramNombre: false      // dentro de los parámetros, antes del ":"
          };
        },

        token(stream, estado) {
          // ---- comentario de bloque ----
          if (estado.enComentario) {
            while (!stream.eol()) {
              if (stream.next() === '*' && stream.peek() === '/') { stream.next(); estado.enComentario = false; break; }
            }
            return 'comentario';
          }
          if (stream.eatSpace()) return null;

          const ch = stream.peek();

          // ---- comentarios ----
          if (ch === '/') {
            if (stream.match('//')) { stream.skipToEnd(); return 'comentario'; }
            if (stream.match('/*')) {
              estado.enComentario = true;
              while (!stream.eol()) {
                if (stream.next() === '*' && stream.peek() === '/') { stream.next(); estado.enComentario = false; break; }
              }
              return 'comentario';
            }
          }

          // ---- cadenas ----
          if (ch === '"' || ch === "'" || ch === '“' || ch === '‘') {
            const cierres = { '"': '"”', "'": "'’", '“': '"”', '‘': "'’" }[ch];
            stream.next();
            let escapado = false;
            while (!stream.eol()) {
              const c = stream.next();
              if (escapado) { escapado = false; continue; }
              if (c === '\\') { escapado = true; continue; }
              if (cierres.indexOf(c) >= 0) break;
            }
            estado.trasPunto = false;
            return 'cadena';
          }

          // ---- números ----
          if (/\d/.test(ch) || (ch === '.' && /\d/.test(stream.string.charAt(stream.pos + 1)))) {
            stream.match(/^\d*\.?\d*(?:[eE][-+]?\d+)?/);
            estado.trasPunto = false;
            return 'numero';
          }

          // ---- identificadores y palabras reservadas ----
          if (LETRA.test(ch)) {
            let pal = '';
            while (!stream.eol() && ALFANUM.test(stream.peek())) pal += stream.next();
            const sigueParen = stream.match(/^\s*\(/, false);
            const sigueDosPuntos = stream.match(/^\s*:/, false);

            const trasPunto = estado.trasPunto;
            estado.trasPunto = false;

            // 1 · después de un punto: atributo o método del objeto
            if (trasPunto) {
              if (pal === 'constructor') return 'declaracion';
              return sigueParen ? 'funcion' : 'propiedad';
            }

            // 2 · palabras de control
            if (CONTROL.has(pal)) return 'control';

            // 3 · palabras de declaración
            if (DECLARACION.has(pal) || (poo && DECLARACION_POO.has(pal))) {
              if (['tipos', 'var', 'variables', 'const', 'constantes', 'atributos'].includes(pal))
                estado.seccion = (pal === 'tipos' || pal === 'atributos') ? pal : 'var';
              if (['inicio', 'fin', 'metodo', 'constructor', 'subrutina', 'sub'].includes(pal)) estado.seccion = null;
              if (pal === 'clase' || pal === 'hereda' || pal === 'nuevo') estado.esperaClase = true;
              if (pal === 'metodo' || pal === 'subrutina' || pal === 'sub' || pal === 'programa') estado.esperaNombre = true;
              if (pal === 'constructor') { estado.enParametros = 0; estado.paramNombre = true; }
              return 'declaracion';
            }

            // 4 · tipos básicos del lenguaje
            if (TIPOS.has(pal)) {
              // vector y matriz van seguidos del tipo de sus elementos
              estado.esperaTipo = (pal === 'vector' || pal === 'matriz');
              return 'tipo';
            }

            // 5 · constantes y palabras que se refieren al objeto actual
            if (CONSTANTES.has(pal)) return 'constante';
            if (poo && LENGUAJE.has(pal)) return 'lenguaje';

            // 5b · palabras de SQL, en ESLE2 BD
            if (sql) {
              const baja = pal.toLowerCase();
              if (baja === 'null') return 'constante';
              if (SQL_CLAUSULA.has(baja)) return 'control';
              if (SQL_TIPO.has(baja)) return 'tipo';
              if (SQL_FUNCION.has(baja) && sigueParen) return 'predefinida';
            }

            // 6 · nombre de clase esperado (clase X, hereda de X, nuevo X, es X)
            if (estado.esperaClase) {
              if (pal !== 'de' && pal !== 'abstracta') estado.esperaClase = false;
              if (pal === 'de' || pal === 'abstracta') return 'declaracion';
              return 'clase';
            }

            // 7 · nombre que se está definiendo (metodo X, subrutina X, programa X)
            if (estado.esperaNombre) {
              estado.esperaNombre = false;
              estado.paramNombre = true;
              return 'funcion';
            }

            // 8 · posición de tipo: después de ":" o de "retorna"
            if (estado.esperaTipo) {
              estado.esperaTipo = false;
              return 'clase';                      // un tipo propio o una clase
            }

            // 8b · en la sección "tipos", el nombre que se define ES un tipo
            if (estado.seccion === 'tipos' && estado.llaves === 0 && sigueDosPuntos) return 'clase';

            // 8c · en la sección "atributos" lo declarado es un atributo del objeto
            if (estado.seccion === 'atributos' && !sigueParen) return 'propiedad';

            // 9 · dentro de una lista de parámetros, antes del ":"
            if (estado.enParametros > 0 && estado.paramNombre && !sigueParen) return 'parametro';

            // 10 · llamada a subrutina o función
            if (sigueParen) return PREDEFINIDAS.has(pal) ? 'predefinida' : 'funcion';

            // 11 · declaración con tipo:  nombre : tipo
            if (sigueDosPuntos) return 'variable';

            return 'variable';
          }

          // ---- operadores y signos ----
          stream.next();
          const dos = ch + (stream.peek() || '');
          if (['&&', '||', '==', '<>', '<=', '>=', '!='].includes(dos)) { stream.next(); estado.trasPunto = false; return 'operador'; }
          if ('+-*/%^=<>!'.includes(ch)) { estado.trasPunto = false; return 'operador'; }

          if (ch === '.') {
            // un punto entre identificadores accede a un campo
            estado.trasPunto = /[A-Za-z_ñÑ]/.test(stream.peek() || '');
            return 'puntuacion';
          }
          if (ch === ':') { estado.esperaTipo = true; estado.paramNombre = false; estado.trasPunto = false; return 'puntuacion'; }
          if (ch === ';' || ch === ',') {
            if (estado.enParametros > 0) estado.paramNombre = true;
            estado.trasPunto = false;
            return 'puntuacion';
          }
          if (ch === '(') { if (estado.paramNombre || estado.enParametros > 0) estado.enParametros++; estado.trasPunto = false; return 'puntuacion'; }
          if (ch === ')') {
            if (estado.enParametros > 0) estado.enParametros--;
            if (estado.enParametros === 0) { estado.paramNombre = false; estado.esperaTipo = false; }
            estado.trasPunto = false;
            return 'puntuacion';
          }
          if (ch === '[') {
            if (estado.esperaTipo) { estado.tipoTrasCorchete = true; estado.esperaTipo = false; }
            estado.trasPunto = false; return 'puntuacion';
          }
          if (ch === ']') {
            if (estado.tipoTrasCorchete) { estado.esperaTipo = true; estado.tipoTrasCorchete = false; }
            estado.trasPunto = false; return 'puntuacion';
          }
          if (ch === '{') { estado.llaves++; estado.trasPunto = false; return 'puntuacion'; }
          if (ch === '}') { if (estado.llaves > 0) estado.llaves--; estado.trasPunto = false; return 'puntuacion'; }

          estado.trasPunto = false;
          return null;
        },

        lineComment: '//',
        electricInput: /^\s*[}\]]$/
      };
    };
  }

  if (global.CodeMirror) {
    CodeMirror.defineMode('sle2', crearModo(false));
    CodeMirror.defineMode('sle2poo', crearModo(true));
    CodeMirror.defineMode('sle2bd', crearModo(false, true));
  }

  global.ESLE2Modo = {
    crearModo,
    CATEGORIAS: [
      { id: 'comentario',  nombre: 'Comentarios',        ejemplo: '// nota' },
      { id: 'cadena',      nombre: 'Textos',             ejemplo: '"hola"' },
      { id: 'numero',      nombre: 'Números',            ejemplo: '3.14' },
      { id: 'control',     nombre: 'Control',            ejemplo: 'si · mientras · desde' },
      { id: 'declaracion', nombre: 'Declaraciones',      ejemplo: 'var · clase · metodo' },
      { id: 'tipo',        nombre: 'Tipos de dato',      ejemplo: 'numerico · cadena' },
      { id: 'clase',       nombre: 'Clases y tipos propios', ejemplo: 'CUENTA · FECHA' },
      { id: 'funcion',     nombre: 'Funciones y métodos', ejemplo: 'calcular()' },
      { id: 'predefinida', nombre: 'Predefinidas',        ejemplo: 'imprimir() · leer()' },
      { id: 'variable',    nombre: 'Variables',           ejemplo: 'total' },
      { id: 'propiedad',   nombre: 'Atributos y campos',  ejemplo: 'este.saldo' },
      { id: 'parametro',   nombre: 'Parámetros',          ejemplo: '(monto : numerico)' },
      { id: 'constante',   nombre: 'Constantes',          ejemplo: 'TRUE · nulo' },
      { id: 'lenguaje',    nombre: 'este y padre',        ejemplo: 'este · padre' },
      { id: 'operador',    nombre: 'Operadores',          ejemplo: '+ · == · and' },
      { id: 'puntuacion',  nombre: 'Signos',              ejemplo: '( ) { } , ;' }
    ]
  };
})(window);

/*
 * Modo flexible: compilar un programa que todavía tiene errores.
 *
 * El compilador de SLE2 es estricto a propósito: al primer error para y lo
 * cuenta bien. Eso está perfecto para entregar un trabajo, pero es penoso
 * para aprender —quien recién empieza suele tener cinco errores a la vez y
 * los descubre de a uno, recompilando cinco veces— y es inútil para las
 * herramientas que solo quieren mirar el programa: el diagrama de flujo, la
 * prueba de escritorio o el autocompletado no pueden hacer nada con un
 * programa que ni siquiera compila.
 *
 * Este módulo agrega el modo flexible. Recupera en dos alturas:
 *
 *   1. «faltó un símbolo» (exige): se anota el error y se sigue como si el
 *      símbolo hubiera estado. Es lo que arregla los errores más comunes
 *      —un paréntesis o una llave sin cerrar— sin perder nada del programa.
 *   2. «esta sentencia no se entiende» (sentencias): se anota el error, se
 *      deja un agujero declarado y se salta hasta donde puede empezar la
 *      sentencia siguiente.
 *
 * Y si aun así algo se escapa, compilar() reintenta una vez con el archivo
 * cortado en la línea del error, para no perder todo lo de arriba.
 *
 * Reglas de la casa:
 *   · el modo flexible NO inventa código. Donde no entendió deja un agujero
 *     declarado, no una sentencia adivinada, porque un programa que corre algo
 *     distinto de lo que dice el editor enseña mal;
 *   · ejecutar un agujero lanza el error original, en su línea. Así el
 *     programa corre hasta ahí y se ve la salida que llevaba, que es
 *     justamente lo que sirve para encontrar el error;
 *   · el modo estricto sigue existiendo igual y sin cambios: es el que manda
 *     cuando hay que entregar.
 *
 * Anda con cualquier dialecto —el clásico, POO y Visual— porque no reescribe
 * la gramática de nadie: se cuelga de exige() y de sentencias(), que son de la
 * clase base y todos los dialectos usan.
 *
 * API:
 *   Flexible.compilar(fuente, { extras, Parser, opciones })
 *     -> { ast, errores: [{ linea, mensaje, sugerencia }], ok }
 *   Flexible.parser(ClaseParser) -> clase de parser tolerante
 *   Flexible.agujeros(ast)       -> los nodos { t: 'error' } que quedaron
 */
(function (global) {
  'use strict';

  const S = global.SLE2;

  /* Donde termina un bloque: ahí hay que parar sí o sí, o nos comeríamos la
     llave que cierra y el error se propagaría hasta el final del archivo. */
  const CIERRES = new Set([
    'fin', 'sino', 'hasta', 'caso', '}', 'eof', 'subrutina', 'clase', 'metodo', 'constructor'
  ]);

  /* Los símbolos que se pueden dar por puestos sin inventar nada: son
     estructura, no contenido. Dar por puesto un "id" o un número sería
     adivinar el programa, y eso no se hace. */
  const SUPONIBLES = new Set(['(', ')', '{', '}', ',', ':', ';', 'inicio', 'fin', 'hasta', 'entonces']);

  function parser(Base) {
    return class ParserFlexible extends (Base || S.Parser) {
      constructor(toks) {
        super(toks);
        this.errores = [];
        this.flexible = true;
      }

      anotar(e, linea) {
        /* Un error sin línea no ayuda a nadie: si no la trae, vale la del
           token donde estábamos parados. */
        this.errores.push({
          linea: e.linea || linea || 0,
          mensaje: e.message || String(e),
          sugerencia: e.sugerencia || ''
        });
      }

      /* Falta un símbolo: se anota y se sigue como si hubiera estado.
         Importante: NO se consume el token que sí hay, porque ese token
         probablemente sea el comienzo legítimo de lo que viene. */
      /* La línea a la que culpar. Si el símbolo que falta se detecta en un
         token de una línea posterior —lo normal: el ")" que falta al final de
         una línea se nota recién en la siguiente— la culpa es de la línea
         anterior, que es donde hay que escribirlo. */
      lineaCulpable() {
        const ahora = this.linea;
        const previo = this.p > 0 ? this.t[this.p - 1] : null;
        return previo && previo.linea && previo.linea < ahora ? previo.linea : ahora;
      }

      exige(tipo, que, sug) {
        if (this.es(tipo)) return this.sig();
        const linea = this.lineaCulpable();
        try {
          /* Se llama igual al de la clase base para quedarse con su
             diagnóstico, que es la parte valiosa: «apareció = dentro de una
             condición», «sino está fuera de lugar», y demás. */
          return super.exige(tipo, que, sug);
        } catch (e) {
          if (!(e instanceof S.SLError)) throw e;
          /* El diagnóstico de la clase base es lo valioso; la línea, la de
             arriba. */
          this.anotar({ message: e.message, sugerencia: e.sugerencia, linea: linea }, linea);

          /* Si el símbolo que falta aparece más adelante en la misma línea, no
             falta: sobra lo que hay en el medio. Es el caso de si (a = 1): el
             ")" está, el estorbo es el "=". Saltar hasta él evita que el
             parser quede corrido y se queje cuatro veces del mismo renglón. */
          const salto = this.linea === linea ? this.buscarEnLaLinea(tipo) : -1;
          if (salto >= 0) { this.p = salto; return this.sig(); }

          if (SUPONIBLES.has(tipo)) return { tipo, valor: tipo, linea };
          /* Lo que no es estructura sí se inventaría: mejor cortar y que lo
             agarre la recuperación por sentencia. */
          throw e;
        }
      }

      /* Busca el símbolo `tipo` en lo que queda de la línea actual. Devuelve
         su posición, o -1 si no está. No cruza a la línea siguiente ni pasa un
         cierre de bloque: más allá de eso ya no sería "lo mismo que el alumno
         escribió", sería otra sentencia. */
      buscarEnLaLinea(tipo) {
        const linea = this.linea;
        for (let i = this.p; i < this.t.length; i++) {
          const t = this.t[i];
          if (t.linea !== linea || t.tipo === 'eof') return -1;
          if (CIERRES.has(t.tipo) && t.tipo !== tipo) return -1;
          if (t.tipo === tipo) return i;
        }
        return -1;
      }

      /* Tira el resto de la línea que no se entendió y sigue en la siguiente.
         El corte es por línea y no por una lista de palabras porque en SL casi
         todo empieza con un identificador —imprimir, leer y las subrutinas
         propias no son palabras reservadas—, así que ninguna lista serviría. Y
         es como lee una persona: una línea rota, se sigue en la que viene. */
      recuperar(linea) {
        for (;;) {
          const t = this.tk();
          if (CIERRES.has(t.tipo)) return;
          if (t.linea > linea) return;
          if (t.tipo === ';') { this.sig(); return; }
          this.sig();
        }
      }

      sentencias() {
        const lista = [];
        for (;;) {
          this.saltaPuntoComa();
          if (CIERRES.has(this.tipo)) return lista;
          const marca = this.p;
          const linea = this.linea;
          try {
            lista.push(this.sentencia());
          } catch (e) {
            if (!(e instanceof S.SLError)) throw e;
            /* exige() ya la anotó cuando el error vino de un símbolo que
               falta; anotarla otra vez duplicaría el mismo mensaje. */
            const yaEsta = this.errores.some(x => x.linea === (e.linea || linea) && x.mensaje === e.message);
            if (!yaEsta) this.anotar(e, linea);
            lista.push({ t: 'error', linea: e.linea || linea, mensaje: e.message, sugerencia: e.sugerencia || '' });
            /* Si el parser no consumió nada hay que empujarlo a mano: si no,
               volveríamos a fallar en el mismo token para siempre. */
            if (this.p === marca) this.sig();
            this.recuperar(linea);
          }
          /* Red de seguridad: ninguna vuelta puede quedarse quieta. */
          if (this.p === marca && !CIERRES.has(this.tipo)) this.sig();
        }
      }

      /* Una subrutina rota no puede llevarse puestas a las que vienen
         después: se anota, se salta hasta la próxima y en su lugar queda una
         subrutina con un agujero adentro. */
      subrutina() {
        const marca = this.p;
        try {
          return super.subrutina();
        } catch (e) {
          if (!(e instanceof S.SLError)) throw e;
          this.anotar(e);
          if (this.p === marca) this.sig();
          while (!this.es('subrutina') && !this.es('clase') && !this.es('eof')) this.sig();
          return {
            nombre: '_rota_' + marca, params: [], consts: [], tipos: [], vars: [],
            retorna: null, linea: e.linea || 0,
            cuerpo: [{ t: 'error', linea: e.linea || 0, mensaje: e.message, sugerencia: e.sugerencia || '' }]
          };
        }
      }

      /* La gramática del programa es de cada dialecto: acá solo se le cuelga
         la lista de errores a lo que haya devuelto. */
      programa() {
        const prog = super.programa();
        prog.errores = this.errores;
        return prog;
      }
    };
  }

  /* Una subclase por clase base: sin esto, cada compilación crearía una clase
     nueva y el motor no podría optimizar nada. */
  const cache = new Map();
  function parserCacheado(Base) {
    const B = Base || S.Parser;
    if (!cache.has(B)) cache.set(B, parser(B));
    return cache.get(B);
  }

  /* Un error por línea. Un solo paréntesis sin cerrar deja al parser
     desorientado y genera tres o cuatro quejas seguidas sobre la misma línea;
     mostrarlas todas asusta y no agrega nada, porque al arreglar la primera
     desaparecen las demás. Se queda la primera, que es la que apunta a la
     causa. */
  const limpiar = errores => {
    const porLinea = new Map();
    for (const e of errores) if (!porLinea.has(e.linea)) porLinea.set(e.linea, e);
    return [...porLinea.values()].sort((a, b) => a.linea - b.linea);
  };

  function compilar(fuente, opciones) {
    const o = opciones || {};
    const P = parserCacheado(o.Parser);
    const src = String(fuente == null ? '' : fuente);

    try {
      const ast = S.compilar(src, o.extras, P, o.opciones);
      const errores = limpiar(ast.errores || []);
      return { ast, errores, ok: errores.length === 0 };
    } catch (e) {
      if (!(e instanceof S.SLError)) throw e;

      /* Se escapó algo que las dos recuperaciones no pudieron absorber: una
         comilla sin cerrar (rompe al tokenizar, antes de que haya sentencias
         que repartir) o basura al final del archivo. Se reintenta con el
         archivo cortado en esa línea, así no se pierde todo lo de arriba. */
      const primero = { linea: e.linea || 0, mensaje: e.message, sugerencia: e.sugerencia || '' };
      const lineas = src.split('\n');
      if (e.linea > 1 && e.linea <= lineas.length + 1) {
        const recorte = lineas.slice(0, e.linea - 1).join('\n') + '\n';
        try {
          const ast = S.compilar(recorte, o.extras, P, o.opciones);
          /* Sin este agujero el programa correría entero y en silencio, sin
             la parte que quedó afuera: parecería que anduvo bien. */
          ast.cuerpo = (ast.cuerpo || []).concat([{
            t: 'error', linea: e.linea, mensaje: e.message, sugerencia: e.sugerencia || ''
          }]);
          const errores = limpiar([primero].concat(ast.errores || []));
          return { ast, errores, ok: false, recortado: e.linea };
        } catch (e2) { /* el recorte tampoco compila: se devuelve el error */ }
      }
      return { ast: null, errores: [primero], ok: false };
    }
  }

  function agujeros(ast) {
    const lista = [];
    if (ast) S.recorrer(ast, n => { if (n && n.t === 'error') lista.push(n); });
    return lista;
  }

  global.Flexible = { compilar, parser: parserCacheado, agujeros };
})(typeof window !== 'undefined' ? window : globalThis);

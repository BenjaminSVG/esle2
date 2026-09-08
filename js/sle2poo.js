/*
 * ESLE2 POO — el lenguaje SL/SLE2 con programación orientada a objetos.
 *
 * Es el mismo lenguaje de siempre (mismos tipos, sentencias, operadores y
 * subrutinas predefinidas) más clases, objetos, herencia y polimorfismo.
 * Se construye ENCIMA de sle2.js: extiende su parser y su intérprete, así
 * que todo programa SLE2 válido sigue siendo válido acá.
 *
 * API:  SLE2POO.compilar(fuente) / ejecutar(fuente, io, opts) / revisar(fuente)
 */
(function (global) {
  'use strict';

  const S = global.SLE2;
  if (!S) throw new Error('sle2poo.js necesita que sle2.js esté cargado antes.');

  const { SLError, errC, errE, copiar, recorrer, parecido, esArr, esRec, fn, PREDEF } = S;

  /* Palabras reservadas propias del dialecto. El resto de las palabras de la
     POO (atributos, metodo, constructor, publico, privado, protegido,
     abstracta, abstracto, compartido, de) se reconocen por contexto, para no
     quitarle nombres de variable a los programas que ya existen. */
  const RESERVADAS_POO = new Set(['clase', 'hereda', 'nuevo', 'este', 'padre', 'nulo', 'es']);
  const VISIBILIDADES = ['publico', 'privado', 'protegido'];

  /* ------------------------------------------------------------------ */
  /* Valores                                                             */
  /* ------------------------------------------------------------------ */
  let proximoId = 1;
  const reiniciarIds = () => { proximoId = 1; };
  class Objeto {
    constructor(clase) {
      this.clase = clase;         // nombre de la clase
      this.campos = {};
      this.id = proximoId++;      // identidad, útil para explicar referencias
    }
  }
  const esObj = v => v instanceof Objeto;

  /* ------------------------------------------------------------------ */
  /* Analizador sintáctico                                               */
  /* ------------------------------------------------------------------ */
  class ParserPOO extends S.Parser {
    esPalabra(p) { return this.es('id') && this.tk().valor === p; }

    programa() {
      const prog = { nombre: null, consts: [], tipos: [], vars: [], cuerpo: [], subs: [], clases: [] };
      if (this.come('programa')) prog.nombre = this.exige('id', 'nombre del programa').valor;

      // Las clases pueden ir antes del cuerpo principal o después del "fin".
      for (;;) {
        this.saltaPuntoComa();
        if (this.es('clase')) { prog.clases.push(this.clase()); continue; }
        const antes = this.p;
        this.secciones(prog);
        if (this.p === antes) break;
      }

      this.exige('inicio', 'la palabra "inicio"',
        'El cuerpo del programa va entre "inicio" y "fin". Antes solo pueden ir clases y las secciones const, tipos y var.');
      prog.cuerpo = this.sentencias();
      this.exige('fin', 'la palabra "fin"', 'Cada "inicio" necesita su "fin".');

      for (;;) {
        if (this.es('subrutina')) prog.subs.push(this.subrutina());
        else if (this.es('clase')) prog.clases.push(this.clase());
        else break;
      }
      if (!this.es('eof'))
        errC(`texto inesperado después del programa: "${this.tk().valor}"`, this.linea,
          'Después de "fin" solo pueden ir subrutinas y clases.');
      return prog;
    }

    /* ---- clase NOMBRE [hereda de PADRE] { ... } ---- */
    clase() {
      const linea = this.linea;
      this.sig();                                   // clase
      let abstracta = false;
      if (this.esPalabra('abstracta')) { this.sig(); abstracta = true; }
      const nombre = this.exige('id', 'el nombre de la clase',
        'Se escribe:  clase CUENTA { ... }').valor;

      let padre = null;
      if (this.come('hereda')) {
        if (this.esPalabra('de')) this.sig();       // "hereda de" o "hereda"
        padre = this.exige('id', 'el nombre de la clase madre',
          'Se escribe:  clase CAJA_AHORRO hereda de CUENTA { ... }').valor;
      }

      this.exige('{', '"{" que abre el cuerpo de la clase');
      const c = { nombre, padre, abstracta, atributos: [], metodos: [], constructor: null, linea };

      for (;;) {
        this.saltaPuntoComa();
        if (this.es('}') || this.es('eof')) break;
        if (this.esPalabra('atributos')) { this.declAtributos(c); continue; }
        if (this.esPalabra('metodos')) { this.sig(); continue; }   // rótulo opcional
        if (this.esPalabra('constructor') || this.esPalabra('metodo') ||
            VISIBILIDADES.includes(this.tk().valor)) { this.metodo(c); continue; }
        errC(`no se esperaba "${this.tk().valor}" dentro de la clase "${nombre}"`, this.linea,
          'Dentro de una clase solo van la sección "atributos", los "metodo" y el "constructor".');
      }
      this.exige('}', '"}" que cierra la clase');
      if (c.abstracta === false && c.metodos.some(m => m.abstracto))
        errC(`la clase "${nombre}" tiene métodos abstractos, así que debe declararse abstracta`, linea,
          `Escribí:  clase abstracta ${nombre} { ... }`);
      return c;
    }

    esSeccion() {
      return this.es('id') && ['metodo', 'constructor', 'atributos', 'metodos'].includes(this.tk().valor);
    }

    declAtributos(c) {
      this.sig();                                   // atributos
      let vis = 'privado';                          // los atributos son privados por defecto
      for (;;) {
        this.saltaPuntoComa();
        if (!this.es('id') || this.esSeccion()) break;

        // Modificadores: publico / privado / protegido / compartido, en cualquier
        // orden. Si a la palabra le sigue ":", "=" o ",", es un nombre de atributo.
        let compartido = false;
        while (this.es('id') &&
               (VISIBILIDADES.includes(this.tk().valor) || this.tk().valor === 'compartido') &&
               ![':', '=', ','].includes(this.tk(1).tipo)) {
          const p = this.sig().valor;
          if (p === 'compartido') compartido = true; else vis = p;
        }
        if (!this.es('id') || this.esSeccion()) break;

        const antes = c.atributos.length;
        this.unaDeclaracion(c.atributos);
        for (let i = antes; i < c.atributos.length; i++) {
          c.atributos[i].vis = vis;
          c.atributos[i].compartido = compartido;
        }
      }
    }

    metodo(c) {
      const linea = this.linea;
      let vis = 'publico', abstracto = false;       // los métodos son públicos por defecto
      while (this.es('id') && (VISIBILIDADES.includes(this.tk().valor) || this.tk().valor === 'abstracto')) {
        const p = this.sig().valor;
        if (p === 'abstracto') abstracto = true; else vis = p;
      }
      const esCtor = this.esPalabra('constructor');
      if (!esCtor && !this.esPalabra('metodo'))
        errC(`se esperaba "metodo" o "constructor" y se encontró "${this.tk().valor}"`, this.linea);
      this.sig();
      while (this.es('id') && (VISIBILIDADES.includes(this.tk().valor) || this.tk().valor === 'abstracto')) {
        const p = this.sig().valor;
        if (p === 'abstracto') abstracto = true; else vis = p;
      }

      const nombre = esCtor ? 'constructor' : this.exige('id', 'el nombre del método').valor;
      const m = {
        nombre, vis, abstracto, esCtor, clase: c.nombre, linea,
        params: this.parametros(), retorna: null,
        consts: [], tipos: [], vars: [], cuerpo: []
      };
      if (this.come('retorna')) m.retorna = this.tipoSpec();
      if (esCtor && m.retorna) errC('un constructor no devuelve ningún valor', linea);

      if (abstracto) {
        if (esCtor) errC('un constructor no puede ser abstracto', linea);
        if (c.constructor === undefined) { /* nada */ }
        c.metodos.push(m);
        return;
      }
      this.secciones(m);
      this.exige('inicio', `"inicio" del ${esCtor ? 'constructor' : 'método ' + nombre}`);
      m.cuerpo = this.sentencias();
      this.exige('fin', `"fin" del ${esCtor ? 'constructor' : 'método ' + nombre}`);

      if (esCtor) {
        if (c.constructor) errC(`la clase "${c.nombre}" ya tiene un constructor`, linea);
        c.constructor = m;
      } else {
        if (c.metodos.some(x => x.nombre === nombre))
          errC(`la clase "${c.nombre}" ya tiene un método llamado "${nombre}"`, linea);
        c.metodos.push(m);
      }
    }

    /* ---- sentencias ---- */
    // Se reescribe el caso "asignación o llamada" para admitir este.x = …,
    // padre.metodo(…) y objeto.metodo(…) como sentencias.
    sentencia() {
      const t = this.tipo;
      if (t !== 'este' && t !== 'padre' && t !== 'id') return super.sentencia();

      const linea = this.linea;
      const destino = this.postfijo(this.primaria());
      if (this.come('=')) {
        const valor = this.es('{') ? this.literalEstructurado() : this.expr();
        return { t: 'asig', destino, valor, linea };
      }
      if (this.es('=='))
        errC('se usó "==" en una asignación', linea,
          'Para asignar un valor se usa un solo "=". El "==" sirve únicamente para comparar.');
      if (destino.t !== 'llamada' && destino.t !== 'metodo')
        errC('sentencia incompleta', linea,
          'Falta el "=" con el valor a asignar, o los paréntesis de la llamada:  objeto.metodo(...).');
      return { t: 'exprStmt', expr: destino, linea };
    }

    /* ---- expresiones ---- */
    primaria() {
      const linea = this.linea;
      if (this.es('nulo')) { this.sig(); return { t: 'nulo', linea }; }
      if (this.es('este')) { this.sig(); return { t: 'este', linea }; }
      if (this.es('padre')) { this.sig(); return { t: 'padre', linea }; }
      if (this.es('nuevo')) {
        this.sig();
        const clase = this.exige('id', 'el nombre de la clase que se quiere crear',
          'Se escribe:  c = nuevo CUENTA ("Ana", 1000)').valor;
        const args = [];
        if (this.come('(')) {
          if (!this.es(')')) do { args.push(this.es('{') ? this.literalEstructurado() : this.expr()); } while (this.come(','));
          this.exige(')');
        }
        return { t: 'nuevo', clase, args, linea };
      }
      return super.primaria();
    }

    postfijo(n) {
      for (;;) {
        // llamada a método: algo.nombre(...)
        if (this.es('(') && n.t === 'campo') {
          const l = this.linea; this.sig();
          const args = [];
          if (!this.es(')')) do { args.push(this.es('{') ? this.literalEstructurado() : this.expr()); } while (this.come(','));
          this.exige(')');
          n = { t: 'metodo', obj: n.base, nombre: n.nombre, args, linea: l };
          continue;
        }
        const antes = n;
        n = super.postfijo(n);
        if (n === antes) return n;
        if (!(this.es('(') && n.t === 'campo')) return n;
      }
    }

    nivelRel() {
      let n = super.nivelRel();
      while (this.es('es')) {
        const l = this.linea; this.sig();
        const clase = this.exige('id', 'el nombre de una clase',
          'Se escribe:  si ( f es CIRCULO ) { ... }').valor;
        n = { t: 'es', obj: n, clase, linea: l };
      }
      return n;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Intérprete                                                          */
  /* ------------------------------------------------------------------ */
  class InterpretePOO extends S.Interprete {
    constructor(ast, io, opts) {
      super(ast, io, opts);
      this.clases = new Map();
      this.pilaCtx = [];          // {objeto, clase} de cada método en ejecución
    }

    ctx(linea, quien) {
      if (!this.pilaCtx.length)
        errE(`"${quien || 'este'}" solo puede usarse dentro de un método o del constructor de una clase`, linea,
          'Fuera de una clase no hay ningún objeto actual. Pasá el objeto como parámetro si lo necesitás.');
      return this.pilaCtx[this.pilaCtx.length - 1];
    }

    /* ---- registro y preparación de clases ---- */
    async run() {
      for (const c of this.ast.clases || []) {
        if (this.clases.has(c.nombre))
          errE(`la clase "${c.nombre}" está definida dos veces`, c.linea);
        this.clases.set(c.nombre, Object.assign({}, c, {
          mapaMetodos: new Map(c.metodos.map(m => [m.nombre, m])),
          compartidos: {}, campos: null
        }));
        this.tipos.set(c.nombre, { k: 'obj', clase: c.nombre });
      }
      // La herencia se valida antes de ejecutar nada.
      for (const c of this.clases.values()) {
        if (!c.padre) continue;
        if (!this.clases.has(c.padre)) {
          const cand = parecido(c.padre, [...this.clases.keys()]);
          errE(`la clase "${c.nombre}" hereda de "${c.padre}", que no existe`, c.linea,
            cand ? `¿Quisiste escribir "${cand}"?` : 'Definí primero la clase madre, o revisá cómo la escribiste.');
        }
        let p = c, vistas = new Set();
        while (p) {
          if (vistas.has(p.nombre))
            errE(`la herencia de "${c.nombre}" da una vuelta infinita`, c.linea,
              'Una clase no puede heredar, directa o indirectamente, de sí misma.');
          vistas.add(p.nombre);
          p = p.padre ? this.clases.get(p.padre) : null;
        }
      }
      await super.run();
    }

    cadena(clase) {                    // de la madre más lejana hasta la clase dada
      const out = [];
      let c = clase;
      while (c) { out.unshift(c); c = c.padre ? this.clases.get(c.padre) : null; }
      return out;
    }

    esDescendiente(nombreHija, nombreMadre) {
      let c = this.clases.get(nombreHija);
      while (c) { if (c.nombre === nombreMadre) return true; c = c.padre ? this.clases.get(c.padre) : null; }
      return false;
    }

    // Resuelve (una sola vez) los campos de la clase, incluidos los heredados.
    async prepararCampos(clase) {
      if (clase.campos) return clase;
      clase.campos = new Map();
      for (const c of this.cadena(clase)) {
        for (const a of c.atributos) {
          const tipo = a.tipo ? this.resolverTipo(a.tipo, a.linea) : null;
          for (const nombre of a.nombres) {
            clase.campos.set(nombre, { nombre, tipo, decl: a, vis: a.vis, compartido: a.compartido, dueño: c.nombre });
            if (a.compartido && !(nombre in c.compartidos)) {
              c.compartidos[nombre] = a.init
                ? this.convertir(await this.eval(a.init), tipo || this.tipoDeRuntime(await this.eval(a.init), a.linea), a.linea)
                : this.valorPorDefecto(tipo || { k: 'num' });
            }
          }
        }
      }
      return clase;
    }

    buscarMetodo(clase, nombre) {
      let c = clase;
      while (c) { const m = c.mapaMetodos.get(nombre); if (m) return m; c = c.padre ? this.clases.get(c.padre) : null; }
      return null;
    }
    buscarConstructor(clase) {
      let c = clase;
      while (c) { if (c.constructor) return c.constructor; c = c.padre ? this.clases.get(c.padre) : null; }
      return null;
    }
    metodosVisibles(clase) {
      const out = [];
      for (const c of this.cadena(clase)) c.metodos.forEach(m => out.push(m.nombre));
      return out;
    }

    /* ---- creación de objetos ---- */
    async instanciar(nombreClase, argNodos, linea) {
      const clase = this.clases.get(nombreClase);
      if (!clase) {
        const cand = parecido(nombreClase, [...this.clases.keys()]);
        errE(`no existe una clase llamada "${nombreClase}"`, linea,
          cand ? `¿Quisiste escribir "${cand}"?` : 'Las clases se definen con  clase NOMBRE { ... }.');
      }
      if (clase.abstracta)
        errE(`"${nombreClase}" es una clase abstracta: no se pueden crear objetos suyos`, linea,
          `Creá un objeto de alguna clase que herede de ${nombreClase} y complete sus métodos abstractos.`);

      const sinCuerpo = [];
      for (const c of this.cadena(clase))
        for (const m of c.metodos)
          if (m.abstracto && !this.tieneImplementacion(clase, m.nombre))
            sinCuerpo.push(m.nombre);
      if (sinCuerpo.length)
        errE(`"${nombreClase}" no puede instanciarse: no implementa ${sinCuerpo.map(x => '"' + x + '()"').join(', ')}`, linea,
          'Una clase que hereda métodos abstractos tiene que escribirlos, o declararse abstracta también.');

      await this.prepararCampos(clase);
      const obj = new Objeto(nombreClase);
      // Los valores iniciales se evalúan sin ver las variables locales de quien
      // llamó a "nuevo": solo constantes, globales y expresiones simples.
      this.pila.push(new Map());
      try {
        for (const [nombre, def] of clase.campos) {
          if (def.compartido) continue;
          let tipo = def.tipo, valor;
          if (def.decl.init) {
            const v = await this.eval(def.decl.init);
            if (!tipo) { tipo = this.tipoDeRuntime(v, def.decl.linea); def.tipo = tipo; }
            valor = this.convertir(v, tipo, def.decl.linea);
          } else {
            valor = this.valorPorDefecto(tipo);
          }
          obj.campos[nombre] = valor;
        }
      } finally { this.pila.pop(); }

      const ctor = this.buscarConstructor(clase);
      if (ctor) await this.ejecutarMetodo(obj, ctor, argNodos, linea);
      else if (argNodos.length)
        errE(`la clase "${nombreClase}" no tiene constructor, así que "nuevo" no recibe parámetros`, linea,
          `Escribí  nuevo ${nombreClase}()  o agregale un constructor a la clase.`);
      return obj;
    }

    tieneImplementacion(clase, nombre) {
      const m = this.buscarMetodo(clase, nombre);
      return m && !m.abstracto;
    }

    /* Las predefinidas del dialecto (imprimir con texto(), clase_de, …) tienen
       prioridad sobre las del lenguaje base. */
    async llamar(n) {
      const sub = this.subs.get(n.nombre);
      if (sub) return await this.llamarSub(sub, n);
      const p = PREDEF_POO[n.nombre];
      if (p) return await p.call(this, n);
      if (this.clases.has(n.nombre))
        errE(`"${n.nombre}" es una clase, no una subrutina`, n.linea,
          `Para crear un objeto escribí  nuevo ${n.nombre} (...).`);
      const cand = parecido(n.nombre, [...this.subs.keys(), ...Object.keys(PREDEF_POO)]);
      errE(`subrutina o función no definida: "${n.nombre}"`, n.linea,
        cand ? `¿Quisiste escribir "${cand}"?`
             : 'Si es un método, se llama sobre un objeto:  objeto.metodo(...).');
    }

    /* ---- llamadas a métodos ---- */
    async invocar(n) {
      let objeto, claseBusqueda;

      if (n.obj.t === 'padre') {
        const c = this.ctx(n.linea, 'padre');
        objeto = c.objeto;
        const claseDef = this.clases.get(c.clase);
        if (!claseDef.padre)
          errE(`la clase "${c.clase}" no hereda de ninguna otra, así que no tiene "padre"`, n.linea,
            'Usá "padre" solo en clases declaradas con  hereda de OTRA_CLASE.');
        claseBusqueda = this.clases.get(claseDef.padre);
      } else {
        objeto = await this.eval(n.obj);
        if (objeto === null)
          errE(`no se puede llamar a "${n.nombre}()" sobre nulo`, n.linea,
            'La variable todavía no apunta a ningún objeto. Creá uno con  nuevo CLASE(...)  antes de usarla.');
        if (!esObj(objeto))
          errE(`"${n.nombre}()" se llamó sobre algo que no es un objeto`, n.linea,
            'Los métodos solo se llaman sobre variables de una clase.');
        claseBusqueda = this.clases.get(objeto.clase);
      }

      const m = n.nombre === 'constructor'
        ? this.buscarConstructor(claseBusqueda)
        : this.buscarMetodo(claseBusqueda, n.nombre);

      if (!m) {
        const cand = parecido(n.nombre, this.metodosVisibles(claseBusqueda));
        errE(`la clase "${claseBusqueda.nombre}" no tiene un método llamado "${n.nombre}"`, n.linea,
          cand ? `¿Quisiste escribir "${cand}()"?`
               : `Métodos disponibles: ${this.metodosVisibles(claseBusqueda).join(', ') || '(ninguno)'}.`);
      }
      if (m.abstracto)
        errE(`el método "${n.nombre}()" de "${claseBusqueda.nombre}" es abstracto y no tiene cuerpo`, n.linea,
          'Un método abstracto solo se puede llamar sobre un objeto de una clase que lo implemente.');
      this.verVisibilidad(m.vis, m.clase, `el método "${n.nombre}()"`, n.linea);
      return await this.ejecutarMetodo(objeto, m, n.args, n.linea);
    }

    verVisibilidad(vis, dueño, que, linea) {
      if (vis === 'publico') return;
      const c = this.pilaCtx.length ? this.pilaCtx[this.pilaCtx.length - 1] : null;
      const dentro = c && (vis === 'privado' ? c.clase === dueño : this.esDescendiente(c.clase, dueño));
      if (dentro) return;
      errE(`${que} es ${vis} de la clase "${dueño}"`, linea,
        vis === 'privado'
          ? `Solo se puede usar desde dentro de "${dueño}". Desde afuera, accedé a través de un método público.`
          : `Solo se puede usar desde "${dueño}" o desde las clases que heredan de ella.`);
    }

    async ejecutarMetodo(objeto, m, argNodos, linea) {
      if (argNodos.length !== m.params.length)
        errE(`"${m.nombre}()" espera ${m.params.length} parámetro(s) y recibió ${argNodos.length}`, linea,
          `La definición es: metodo ${m.nombre} (${m.params.map(p => (p.porRef ? 'ref ' : '') + p.nombre).join(', ')}).`);
      if (this.pila.length > 400)
        errE('demasiadas llamadas anidadas (¿recursión infinita?)', linea,
          'Revisá que el método tenga un caso que corte la cadena de llamadas.');

      const marco = new Map();
      for (let i = 0; i < m.params.length; i++) {
        const p = m.params[i], a = argNodos[i];
        const tipo = this.resolverTipo(p.tipo, p.linea || linea);
        if (p.porRef) {
          if (!['id', 'indice', 'campo'].includes(a.t))
            errE(`el parámetro "${p.nombre}" debe recibir una variable (es por referencia)`, a.linea);
          const lv = await this.lvalue(a);
          marco.set(p.nombre, { get v() { return lv.get(); }, set v(x) { lv.set(x); }, tipo: lv.tipo });
        } else if (a.t === 'estruct') {
          marco.set(p.nombre, { v: await this.construirEstructura(tipo, a), tipo });
        } else {
          marco.set(p.nombre, { v: this.convertir(await this.eval(a), tipo, a.linea), tipo });
        }
      }

      marco.nombreSub = m.clase + "." + (m.nombre || "constructor");
      this.pila.push(marco);
      this.pilaCtx.push({ objeto, clase: m.clase });
      try {
        await this.declarar(marco, m.vars, m.consts, m.tipos);
        await this.bloque(m.cuerpo);
        if (m.retorna)
          errE(`el método "${m.nombre}()" terminó sin ejecutar "retorna"`, m.linea,
            'Todo método declarado con "retorna tipo" tiene que devolver un valor en todos sus caminos.');
        return undefined;
      } catch (e) {
        if (e instanceof S.Retorno) {
          if (!m.retorna)
            errE(`"${m.nombre}()" no está declarado con "retorna" y sin embargo devuelve un valor`, m.linea,
              `Declaralo así:  metodo ${m.nombre} (...) retorna numerico`);
          return this.convertir(e.v, this.resolverTipo(m.retorna, m.linea), m.linea);
        }
        throw e;
      } finally {
        this.pila.pop();
        this.pilaCtx.pop();
      }
    }

    /* ---- tipos y valores ---- */
    valorPorDefecto(t) {
      if (t && t.k === 'obj') return null;      // un objeto arranca en "nulo"
      return super.valorPorDefecto(t);
    }

    tipoDeRuntime(v, linea) {
      if (esObj(v)) return { k: 'obj', clase: v.clase };
      return super.tipoDeRuntime(v, linea);
    }

    convertir(v, tipo, linea) {
      if (tipo && tipo.k === 'obj') {
        if (v === null) return null;
        if (!esObj(v))
          errE(`se esperaba un objeto de la clase "${tipo.clase}" y se obtuvo ${S.tipoDeValor(v)}`, linea,
            `Creá el objeto con  nuevo ${tipo.clase} (...)  o asignale nulo.`);
        if (!this.esDescendiente(v.clase, tipo.clase))
          errE(`un objeto de la clase "${v.clase}" no se puede guardar en una variable de tipo "${tipo.clase}"`, linea,
            `Solo se admite un ${tipo.clase} o una clase que herede de él. La herencia va en un solo sentido: un ${tipo.clase} no es necesariamente un ${v.clase}.`);
        return v;                                // los objetos se asignan POR REFERENCIA
      }
      if (esObj(v) && tipo)
        errE(`no se puede guardar un objeto de la clase "${v.clase}" en una variable de tipo ${S.nombreTipo(tipo)}`, linea,
          'Los objetos solo entran en variables declaradas con el nombre de su clase.');
      return super.convertir(v, tipo, linea);
    }

    /* ---- acceso a campos ---- */
    async lvalue(n) {
      if (n.t === 'este') {
        const c = this.ctx(n.linea, 'este');
        return {
          get: () => c.objeto,
          set: () => errE('no se puede asignarle un valor a "este"', n.linea,
            '"este" siempre apunta al objeto que está ejecutando el método.'),
          tipo: { k: 'obj', clase: c.objeto.clase }
        };
      }
      if (n.t === 'campo') {
        // atributo compartido: CLASE.atributo
        if (n.base.t === 'id' && this.clases.has(n.base.nombre) && !this.hayVariable(n.base.nombre))
          return await this.lvalueCompartido(this.clases.get(n.base.nombre), n.nombre, n.linea);

        const b = await this.lvalue(n.base);
        if (b.tipo && b.tipo.k === 'obj') {
          const obj = b.get();
          if (obj === null)
            errE(`no se puede usar el campo "${n.nombre}" de una variable que vale nulo`, n.linea,
              'Antes de usar sus atributos, creá el objeto con  nuevo CLASE(...).');
          const clase = await this.prepararCampos(this.clases.get(obj.clase));
          const def = clase.campos.get(n.nombre);
          if (!def) {
            const cand = parecido(n.nombre, [...clase.campos.keys(), ...this.metodosVisibles(clase)]);
            errE(`la clase "${obj.clase}" no tiene un atributo llamado "${n.nombre}"`, n.linea,
              cand ? `¿Quisiste escribir "${cand}"?`
                   : `Atributos disponibles: ${[...clase.campos.keys()].join(', ') || '(ninguno)'}.`);
          }
          this.verVisibilidad(def.vis, def.dueño, `el atributo "${n.nombre}"`, n.linea);
          if (def.compartido) return await this.lvalueCompartido(this.clases.get(def.dueño), n.nombre, n.linea);
          return {
            get: () => obj.campos[n.nombre],
            set: v => { obj.campos[n.nombre] = v; },
            tipo: def.tipo
          };
        }
        return await super.lvalue(n);
      }
      return await super.lvalue(n);
    }

    hayVariable(nombre) {
      const l = this.local;
      return (l && l.has(nombre)) || this.globales.has(nombre);
    }

    async lvalueCompartido(clase, nombre, linea) {
      await this.prepararCampos(clase);
      const def = clase.campos.get(nombre);
      if (!def || !def.compartido)
        errE(`la clase "${clase.nombre}" no tiene un atributo compartido llamado "${nombre}"`, linea,
          'Los atributos compartidos se declaran así:  atributos  compartido cantidad = 0');
      this.verVisibilidad(def.vis, def.dueño, `el atributo compartido "${nombre}"`, linea);
      const dueño = this.clases.get(def.dueño);
      return {
        get: () => dueño.compartidos[nombre],
        set: v => { dueño.compartidos[nombre] = v; },
        tipo: def.tipo
      };
    }

    /* ---- expresiones ---- */
    async eval(n) {
      switch (n.t) {
        case 'nulo': return null;
        case 'este': return this.ctx(n.linea, 'este').objeto;
        case 'padre':
          errE('"padre" solo sirve para llamar a un método de la clase madre', n.linea,
            'Escribí  padre.nombre_del_metodo (...)  o  padre.constructor (...).');
          break;
        case 'nuevo': return await this.instanciar(n.clase, n.args, n.linea);
        case 'metodo': return await this.invocar(n);
        case 'es': {
          const o = await this.eval(n.obj);
          if (!this.clases.has(n.clase))
            errE(`no existe una clase llamada "${n.clase}"`, n.linea);
          return esObj(o) && this.esDescendiente(o.clase, n.clase);
        }
        case 'id': {
          // una variable de objeto puede valer nulo sin que eso sea un error
          const c = this.celda(n.nombre, n.linea);
          if (c.tipo && c.tipo.k === 'obj') return c.v;
          break;
        }
      }
      return await super.eval(n);
    }

    binario(op, a, b, l) {
      // Los objetos se comparan por identidad: dos variables son iguales si
      // apuntan al MISMO objeto.
      if (esObj(a) || esObj(b) || ((a === null || b === null) && (esObj(a) || esObj(b) || op === '==' || op === '<>'))) {
        if (op === '==') return a === b;
        if (op === '<>') return a !== b;
      }
      if (esObj(a) || esObj(b))
        errE(`no se puede aplicar "${op}" a un objeto`, l,
          'Con objetos solo se puede comparar identidad (== y <>). Para comparar su contenido, escribí un método.');
      return super.binario(op, a, b, l);
    }

    texto(v, linea) {
      if (esObj(v)) return `<${v.clase}>`;
      if (v === null) return 'nulo';
      return super.texto(v, linea);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Predefinidas propias del dialecto                                   */
  /* ------------------------------------------------------------------ */
  const PREDEF_POO = Object.assign({}, PREDEF, {
    // imprimir() usa el método texto() del objeto, si lo tiene (como toString)
    imprimir: async function (n) {
      let out = '';
      for (const a of n.args) {
        const v = await this.eval(a);
        if (esObj(v) && this.buscarMetodo(this.clases.get(v.clase), 'texto')) {
          const m = this.buscarMetodo(this.clases.get(v.clase), 'texto');
          if (m.retorna && m.retorna.k === 'cad' && !m.params.length && !m.abstracto) {
            out += await this.ejecutarMetodo(v, m, [], n.linea);
            continue;
          }
        }
        out += this.texto(v, n.linea);
      }
      this.escribir(out);
    },
    clase_de: fn(1, 1, function (v, l) {
      if (v[0] === null) return '';
      if (!esObj(v[0])) errE('clase_de() espera un objeto', l, 'Se usa así:  imprimir (clase_de (c))');
      return v[0].clase;
    }),
    es_nulo: fn(1, 1, function (v) { return v[0] === null; }),
    id_de: fn(1, 1, function (v, l) {
      if (!esObj(v[0])) errE('id_de() espera un objeto', l, 'Sirve para ver si dos variables apuntan al mismo objeto.');
      return v[0].id;
    })
  });

  /* ------------------------------------------------------------------ */
  /* Revisión previa                                                     */
  /* ------------------------------------------------------------------ */
  function revisar(fuente) {
    const avisos = [];
    const add = (linea, mensaje, sugerencia) => avisos.push({ linea, mensaje, sugerencia });
    let ast;
    try { ast = compilar(fuente); } catch (e) { return avisos; }

    const cuerpos = [ast.cuerpo, ...ast.subs.map(s => s.cuerpo)];
    const metodos = [];
    (ast.clases || []).forEach(c => {
      if (c.constructor) metodos.push(c.constructor);
      c.metodos.forEach(m => metodos.push(m));
    });
    metodos.forEach(m => cuerpos.push(m.cuerpo));

    const usados = new Set(), llamadas = new Set(), metodosLlamados = new Set();
    const clasesUsadas = new Set(), camposUsados = new Set();
    recorrer([cuerpos, ast.vars, (ast.clases || []).map(c => c.atributos)], n => {
      if (n.t === 'id') usados.add(n.nombre);
      if (n.t === 'llamada') llamadas.add(n.nombre);
      if (n.t === 'metodo') { metodosLlamados.add(n.nombre); camposUsados.add(n.nombre); }
      if (n.t === 'campo') camposUsados.add(n.nombre);
      if (n.t === 'nuevo') clasesUsadas.add(n.clase);
      if (n.t === 'es') clasesUsadas.add(n.clase);
    });
    // un tipo declarado también "usa" la clase
    const tipoUsa = spec => {
      if (!spec || typeof spec !== 'object') return;
      if (spec.k === 'nombre') clasesUsadas.add(spec.nombre);
      if (spec.k === 'arr') tipoUsa(spec.elem);
      if (spec.k === 'rec') (spec.campos || []).forEach(c => tipoUsa(c.tipo));
    };
    const declsDe = o => [...(o.vars || []), ...(o.atributos || [])];
    const revisarTipos = o => {
      declsDe(o).forEach(d => tipoUsa(d.tipo));
      (o.params || []).forEach(p => tipoUsa(p.tipo));
      tipoUsa(o.retorna);
    };
    revisarTipos(ast);
    ast.subs.forEach(revisarTipos);
    (ast.clases || []).forEach(c => {
      revisarTipos(c);
      if (c.padre) clasesUsadas.add(c.padre);
      if (c.constructor) revisarTipos(c.constructor);
      c.metodos.forEach(revisarTipos);
    });

    // 1. variables declaradas y nunca usadas
    const declaradas = [];
    const juntar = (o, ambito) => {
      (o.vars || []).forEach(d => d.nombres.forEach(n => declaradas.push({ n, linea: d.linea, ambito })));
      (o.consts || []).forEach(c => declaradas.push({ n: c.nombre, linea: c.linea, ambito, konst: true }));
      (o.params || []).forEach(p => declaradas.push({ n: p.nombre, linea: o.linea, ambito, param: true }));
    };
    juntar(ast, 'el programa principal');
    ast.subs.forEach(s => juntar(s, `la subrutina ${s.nombre}()`));
    metodos.forEach(m => juntar(m, `${m.esCtor ? 'el constructor' : 'el método ' + m.nombre + '()'} de ${m.clase}`));
    declaradas.forEach(d => {
      if (usados.has(d.n)) return;
      add(d.linea, `${d.konst ? 'la constante' : d.param ? 'el parámetro' : 'la variable'} "${d.n}" se declara en ${d.ambito} pero nunca se usa`,
        'Puede que la hayas escrito distinto en otro lado (SL distingue mayúsculas de minúsculas) o que ya no haga falta.');
    });

    // 2. clases y métodos que nadie usa
    (ast.clases || []).forEach(c => {
      if (!clasesUsadas.has(c.nombre))
        add(c.linea, `la clase "${c.nombre}" nunca se usa`,
          `Para crear un objeto de esa clase escribí  x = nuevo ${c.nombre} (...).`);
      c.atributos.forEach(a => a.nombres.forEach(nom => {
        if (!camposUsados.has(nom) && !usados.has(nom))
          add(a.linea, `el atributo "${nom}" de la clase "${c.nombre}" nunca se usa`,
            'Se accede a los atributos con  este.' + nom + '  dentro de la clase.');
      }));
      c.metodos.forEach(m => {
        if (m.abstracto) return;
        if (!metodosLlamados.has(m.nombre) && m.nombre !== 'texto')
          add(m.linea, `el método "${m.nombre}()" de la clase "${c.nombre}" nunca se llama`,
            'Se llama con  objeto.' + m.nombre + '(...).');
      });
    });

    // 3. el programa no muestra nada
    if (!llamadas.has('imprimir'))
      add(1, 'el programa nunca llama a imprimir()',
        'Sin imprimir() el programa se ejecuta pero no muestra ningún resultado.');

    // 4. clase abstracta sin métodos abstractos
    (ast.clases || []).forEach(c => {
      if (c.abstracta && !c.metodos.some(m => m.abstracto))
        add(c.linea, `la clase "${c.nombre}" es abstracta pero no declara ningún método abstracto`,
          'Una clase abstracta suele definir al menos un método que las hijas están obligadas a escribir.');
    });

    return avisos.sort((a, b) => a.linea - b.linea);
  }

  /* ------------------------------------------------------------------ */
  /* API pública                                                         */
  /* ------------------------------------------------------------------ */
  function compilar(fuente) {
    return S.compilar(fuente, RESERVADAS_POO, ParserPOO);
  }

  async function ejecutar(fuente, io, opts) {
    const ast = typeof fuente === 'string' ? compilar(fuente) : fuente;
    reiniciarIds();               // cada corrida numera sus objetos desde 1
    const o = Object.assign({}, opts, { Interprete: InterpretePOO });
    const interp = new InterpretePOO(ast, io, o);
    // las predefinidas del dialecto se resuelven contra el intérprete POO
    interp.PREDEF = PREDEF_POO;
    if (o.control) o.control.detener = () => { interp.abortar = true; };
    await interp.run();
    return interp;
  }

  global.SLE2POO = {
    compilar, ejecutar, revisar, Objeto, esObj,
    ParserPOO, InterpretePOO, PREDEF: PREDEF_POO, RESERVADAS: RESERVADAS_POO,
    SLError
  };
})(window);

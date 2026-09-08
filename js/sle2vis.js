/*
 * ESLE2 Visual — el mismo lenguaje SLE2, con ventanas, controles y dibujo.
 *
 * No cambia la sintaxis: no hay palabras reservadas nuevas ni sentencias
 * nuevas. Todo lo visual entra como subrutinas predefinidas, igual que
 * imprimir() o substr(). Eso es a propósito: un programa .slv se lee, se
 * compila, se depura, se traduce y se dibuja como diagrama exactamente igual
 * que uno .sl, y quien ya sabe SLE2 no tiene que aprender otro lenguaje, solo
 * una biblioteca.
 *
 * Un programa visual tiene siempre la misma forma:
 *
 *     var
 *        b : numerico
 *     inicio
 *        ventana ("Mi programa", 420, 260)      // 1. la ventana
 *        b = boton ("Saludar", 30, 40, 120, 34) // 2. los controles
 *        al_hacer_clic (b, "saludar")           // 3. quién atiende cada cosa
 *        esperar_eventos ()                     // 4. quedarse esperando
 *     fin
 *     subrutina saludar (id : numerico)
 *     inicio
 *        mensaje ("¡Hola!")
 *     fin
 *
 * `esperar_eventos()` es la clave y es lo que hace que se entienda: el
 * programa no «termina» al llegar al fin, se queda esperando, y cada vez que
 * pasa algo el runtime llama a la subrutina que se registró. Es lo mismo que
 * hace Application.Run() en un formulario de escritorio, con un nombre que se
 * puede leer.
 *
 * Todo lo que se ve pasa por un backend enchufable (opts.gui), igual que la
 * entrada y la salida pasan por `io`. La página usa uno que dibuja en el DOM;
 * las pruebas usan uno que anota lo que se pidió, y así se verifica sin
 * navegador.
 *
 * API:  SLE2VIS.compilar(fuente) · ejecutar(fuente, io, opts) · revisar(fuente)
 *       SLE2VIS.CONTROLES · SLE2VIS.PREDEF
 */
(function (global) {
  'use strict';

  const S = global.SLE2;
  if (!S) throw new Error('sle2vis.js necesita que sle2.js esté cargado antes.');

  const { errE, fn, PREDEF } = S;

  /* Los controles que se pueden crear, con su tamaño por omisión. */
  const CONTROLES = {
    etiqueta:   { ancho: 120, alto: 22, texto: true },
    boton:      { ancho: 110, alto: 32, texto: true },
    caja:       { ancho: 160, alto: 26, texto: false },  // una caja de texto arranca vacía
    casilla:    { ancho: 140, alto: 22, texto: true },
    lista:      { ancho: 160, alto: 110, texto: false },
    deslizador: { ancho: 160, alto: 24, texto: false },
    lienzo:     { ancho: 300, alto: 200, texto: false }
  };

  /* Órdenes de dibujo del lienzo. */
  const DIBUJOS = ['pluma', 'relleno', 'grosor', 'linea', 'rectangulo', 'circulo',
                   'elipse', 'punto', 'texto', 'borrar'];

  /* ------------------------------------------------------------------ */
  /* Intérprete                                                          */
  /* ------------------------------------------------------------------ */
  class InterpreteVIS extends S.Interprete {
    constructor(ast, io, opts) {
      super(ast, io, opts);
      this.gui = (opts && opts.gui) || null;
      this.controles = new Map();     // id -> { tipo }
      this.manejadores = new Map();   // "id:evento" -> nombre de subrutina
      this.proximoId = 1;
      this.esperando = null;          // resolvedor de esperar_eventos()
      this.cola = Promise.resolve();  // los eventos se atienden de a uno
      this.hayVentana = false;
    }

    /* Las subrutinas visuales se resuelven antes que las del lenguaje base
       (que igual están todas adentro de PREDEF_VIS). */
    async llamar(n) {
      const sub = this.subs.get(n.nombre);
      if (sub) return await this.llamarSub(sub, n);
      const p = PREDEF_VIS[n.nombre];
      if (p) return await p.call(this, n);
      const cand = S.parecido(n.nombre, [...this.subs.keys(), ...Object.keys(PREDEF_VIS)]);
      errE(`subrutina o función no definida: "${n.nombre}"`, n.linea,
        cand ? `¿Quisiste escribir "${cand}"?`
             : 'Mirá la documentación de ESLE2 Visual: ahí está la lista de las ' +
               'subrutinas para ventanas, controles y dibujo.');
    }

    /* Un control que existe de verdad, o un error que se entiende. */
    control(id, linea, tipoEsperado) {
      const n = Math.trunc(this.aNum(id, linea));
      const c = this.controles.get(n);
      if (!c) errE(`no hay ningún control con el número ${n}`, linea,
        'Los controles se guardan en una variable cuando se crean:\n' +
        '   b = boton ("Aceptar", 20, 20, 100, 30)\n' +
        'y después se usa esa variable:  poner_texto (b, "Listo")');
      if (tipoEsperado && c.tipo !== tipoEsperado)
        errE(`ese control es un "${c.tipo}" y esto solo vale para un "${tipoEsperado}"`, linea);
      return { n, c };
    }

    exigeVentana(linea) {
      if (this.hayVentana) return;
      errE('todavía no hay ninguna ventana', linea,
        'Antes de crear controles hay que abrir la ventana:\n   ventana ("Mi programa", 420, 260)');
    }

    /* Llama a una subrutina del programa con valores ya calculados. Es lo que
       usa el runtime cuando pasa algo en la pantalla. */
    async disparar(nombre, valores) {
      const sub = this.subs.get(nombre);
      if (!sub) return;
      const args = (valores || []).map(v => (
        typeof v === 'number' ? { t: 'num', v, linea: sub.linea }
          : typeof v === 'boolean' ? { t: 'id', nombre: v ? 'TRUE' : 'FALSE', linea: sub.linea }
            : { t: 'cad', v: String(v), linea: sub.linea }));
      /* La subrutina puede declarar menos parámetros de los que se le mandan:
         al que no le interesa el id no tiene por qué recibirlo. */
      await this.llamarSub(sub, { args: args.slice(0, sub.params.length), linea: sub.linea });
    }

    /* Los eventos se atienden de a uno: dos clics seguidos no pueden dejar el
       programa a medio ejecutar en dos lugares a la vez. */
    encolar(nombre, valores) {
      this.cola = this.cola.then(async () => {
        if (this.abortar || !this.esperando) return;
        try {
          await this.disparar(nombre, valores);
        } catch (e) {
          if (this.gui && this.gui.error) this.gui.error(e);
          this.terminarEspera();
        }
      });
      return this.cola;
    }

    terminarEspera() {
      const r = this.esperando;
      this.esperando = null;
      if (r) r();
    }
  }

  /* ------------------------------------------------------------------ */
  /* Las subrutinas visuales                                             */
  /* ------------------------------------------------------------------ */
  const num = (i, v, l) => i.aNum(v, l);
  const cad = (i, v, l) => i.aCad(v, l);
  const ent = (i, v, l) => Math.trunc(i.aNum(v, l));

  function crearControl(tipo) {
    /* etiqueta/boton/caja/casilla llevan texto; lista/deslizador/lienzo no. */
    const def = CONTROLES[tipo];
    const conTexto = def.texto;
    return async function (n) {
      const l = n.linea;
      this.exigeVentana(l);
      const a = [];
      for (const x of n.args) a.push(await this.eval(x));
      let i = 0;
      const texto = conTexto ? cad(this, a[i++], l) : '';
      const minimo = conTexto ? 3 : 2;
      if (a.length < minimo) errE(`${tipo}() necesita al menos ${minimo} datos`, l,
        conTexto ? `Se escribe así:  ${tipo} ("texto", x, y)` : `Se escribe así:  ${tipo} (x, y)`);
      const x = ent(this, a[i++], l), y = ent(this, a[i++], l);
      const ancho = a.length > i ? ent(this, a[i++], l) : def.ancho;
      const alto = a.length > i ? ent(this, a[i++], l) : def.alto;

      const id = this.proximoId++;
      this.controles.set(id, { tipo });
      this.gui.crear(id, tipo, { texto, x, y, ancho, alto });
      return id;
    };
  }

  const PREDEF_VIS = Object.assign(Object.create(null), PREDEF, {

    /* ------------------------------ ventana --------------------------- */
    ventana: fn(1, 3, function (v, l) {
      const titulo = cad(this, v[0], l);
      const ancho = v.length > 1 ? ent(this, v[1], l) : 480;
      const alto = v.length > 2 ? ent(this, v[2], l) : 320;
      if (ancho < 120 || alto < 90) errE('la ventana no puede ser tan chica', l,
        'El mínimo razonable es  ventana ("titulo", 120, 90).');
      this.hayVentana = true;
      this.gui.ventana({ titulo, ancho, alto });
      return true;
    }),

    titulo_ventana: fn(1, 1, function (v, l) {
      this.exigeVentana(l);
      this.gui.ventana({ titulo: cad(this, v[0], l) });
      return true;
    }),

    /* ----------------------------- controles -------------------------- */
    etiqueta: crearControl('etiqueta'),
    boton: crearControl('boton'),
    caja: crearControl('caja'),
    casilla: crearControl('casilla'),
    lista: crearControl('lista'),
    deslizador: crearControl('deslizador'),
    lienzo: crearControl('lienzo'),

    poner_texto: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'texto', cad(this, v[1], l));
      return true;
    }),
    leer_texto: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l);
      return String(this.gui.leer(n, 'texto'));
    }),
    poner_valor: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'valor', num(this, v[1], l));
      return true;
    }),
    leer_valor: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l);
      return Number(this.gui.leer(n, 'valor')) || 0;
    }),
    marcado: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, 'casilla');
      return !!this.gui.leer(n, 'marcado');
    }),
    marcar: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l, 'casilla');
      this.gui.poner(n, 'marcado', this.aLogico(v[1], l));
      return true;
    }),

    agregar_item: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l, 'lista');
      this.gui.poner(n, 'agregar', cad(this, v[1], l));
      return true;
    }),
    limpiar_items: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, 'lista');
      this.gui.poner(n, 'limpiar', true);
      return true;
    }),
    item_elegido: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, 'lista');
      return String(this.gui.leer(n, 'elegido'));
    }),

    mover: fn(3, 3, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'posicion', { x: ent(this, v[1], l), y: ent(this, v[2], l) });
      return true;
    }),
    redimensionar: fn(3, 3, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'tamano', { ancho: ent(this, v[1], l), alto: ent(this, v[2], l) });
      return true;
    }),
    visible: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'visible', this.aLogico(v[1], l));
      return true;
    }),
    habilitar: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'habilitado', this.aLogico(v[1], l));
      return true;
    }),
    color_fondo: fn(4, 4, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'fondo', color(this, v, l));
      return true;
    }),
    color_texto: fn(4, 4, function (v, l) {
      const { n } = this.control(v[0], l);
      this.gui.poner(n, 'color', color(this, v, l));
      return true;
    }),

    /* ------------------------------ eventos --------------------------- */
    al_hacer_clic: fn(2, 2, function (v, l) { return registrar(this, 'clic', v, l); }),
    al_cambiar: fn(2, 2, function (v, l) { return registrar(this, 'cambio', v, l); }),
    al_escribir: fn(2, 2, function (v, l) { return registrar(this, 'tecla', v, l); }),

    esperar_eventos: async function (n) {
      const l = n.linea;
      this.exigeVentana(l);
      if (!this.manejadores.size && this.gui.aviso)
        this.gui.aviso('El programa espera eventos pero no registró ninguno con al_hacer_clic().');
      this.gui.listo();
      await new Promise(res => { this.esperando = res; });
      return true;
    },

    cerrar_ventana: fn(0, 0, function () {
      this.terminarEspera();
      if (this.gui.cerrar) this.gui.cerrar();
      return true;
    }),

    mensaje: fn(1, 1, function (v, l) {
      this.gui.mensaje(cad(this, v[0], l));
      return true;
    }),

    /* ------------------------------- dibujo --------------------------- */
    pluma: fn(4, 4, function (v, l) { return dibujar(this, v, l, 'pluma', [color(this, v, l)]); }),
    relleno: fn(4, 4, function (v, l) { return dibujar(this, v, l, 'relleno', [color(this, v, l)]); }),
    grosor: fn(2, 2, function (v, l) { return dibujar(this, v, l, 'grosor', [num(this, v[1], l)]); }),
    linea: fn(5, 5, function (v, l) {
      return dibujar(this, v, l, 'linea', [num(this, v[1], l), num(this, v[2], l),
                                           num(this, v[3], l), num(this, v[4], l)]);
    }),
    rectangulo: fn(5, 5, function (v, l) {
      return dibujar(this, v, l, 'rectangulo', [num(this, v[1], l), num(this, v[2], l),
                                                num(this, v[3], l), num(this, v[4], l)]);
    }),
    circulo: fn(4, 4, function (v, l) {
      return dibujar(this, v, l, 'circulo', [num(this, v[1], l), num(this, v[2], l), num(this, v[3], l)]);
    }),
    elipse: fn(5, 5, function (v, l) {
      return dibujar(this, v, l, 'elipse', [num(this, v[1], l), num(this, v[2], l),
                                            num(this, v[3], l), num(this, v[4], l)]);
    }),
    punto: fn(3, 3, function (v, l) {
      return dibujar(this, v, l, 'punto', [num(this, v[1], l), num(this, v[2], l)]);
    }),
    texto_en: fn(4, 4, function (v, l) {
      return dibujar(this, v, l, 'texto', [num(this, v[1], l), num(this, v[2], l), cad(this, v[3], l)]);
    }),
    borrar_lienzo: fn(1, 1, function (v, l) { return dibujar(this, v, l, 'borrar', []); }),

    raton_x: fn(0, 0, function () { return Number(this.gui.raton('x')) || 0; }),
    raton_y: fn(0, 0, function () { return Number(this.gui.raton('y')) || 0; })
  });

  /* Ayudas compartidas por varias subrutinas. */
  function color(interp, v, l) {
    const c = [1, 2, 3].map(i => Math.max(0, Math.min(255, Math.trunc(interp.aNum(v[i], l)))));
    return { r: c[0], g: c[1], b: c[2] };
  }

  function dibujar(interp, v, l, orden, args) {
    const { n } = interp.control(v[0], l, 'lienzo');
    interp.gui.dibujar(n, orden, args);
    return true;
  }

  function registrar(interp, evento, v, l) {
    const { n } = interp.control(v[0], l);
    const sub = interp.aCad(v[1], l);
    if (!interp.subs.has(sub)) {
      const cerca = S.parecido(sub, [...interp.subs.keys()]);
      errE(`no hay ninguna subrutina que se llame "${sub}"`, l,
        cerca ? `¿Quisiste decir "${cerca}"?`
              : 'El nombre va entre comillas y tiene que ser el de una subrutina del programa:\n' +
                '   al_hacer_clic (b, "saludar")\n   ...\n   subrutina saludar (id : numerico)');
    }
    interp.manejadores.set(n + ':' + evento, sub);
    interp.gui.alEvento(n, evento, valores => interp.encolar(sub, valores));
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* Backend de mentira: sirve de referencia y para las pruebas          */
  /* ------------------------------------------------------------------ */
  function guiDeMentira() {
    const g = {
      registro: [],          // todo lo que se pidió, en orden
      controles: new Map(),
      eventos: new Map(),
      mensajes: [],
      avisos: [],
      errores: [],
      cerrada: false,
      posRaton: { x: 0, y: 0 },

      ventana(p) { g.registro.push(['ventana', p]); g.titulo = p.titulo; },
      crear(id, tipo, p) {
        g.registro.push(['crear', id, tipo, p]);
        g.controles.set(id, Object.assign({ tipo, valor: 0, marcado: false, items: [], elegido: '', dibujos: [] }, p));
      },
      poner(id, prop, valor) {
        g.registro.push(['poner', id, prop, valor]);
        const c = g.controles.get(id);
        if (!c) return;
        if (prop === 'agregar') c.items.push(valor);
        else if (prop === 'limpiar') c.items = [];
        else if (prop === 'posicion') { c.x = valor.x; c.y = valor.y; }
        else if (prop === 'tamano') { c.ancho = valor.ancho; c.alto = valor.alto; }
        else c[prop] = valor;
      },
      leer(id, prop) {
        const c = g.controles.get(id) || {};
        if (prop === 'texto') return c.texto === undefined ? '' : c.texto;
        if (prop === 'valor') return c.valor || 0;
        if (prop === 'marcado') return !!c.marcado;
        if (prop === 'elegido') return c.elegido || '';
        return '';
      },
      dibujar(id, orden, args) {
        g.registro.push(['dibujar', id, orden, args]);
        const c = g.controles.get(id);
        if (c) (orden === 'borrar' ? (c.dibujos = []) : c.dibujos.push([orden].concat(args)));
      },
      alEvento(id, evento, cb) { g.eventos.set(id + ':' + evento, cb); },
      mensaje(t) { g.mensajes.push(t); g.registro.push(['mensaje', t]); },
      aviso(t) { g.avisos.push(t); },
      error(e) { g.errores.push(e); },
      listo() { g.registro.push(['listo']); g.esperando = true; },
      cerrar() { g.cerrada = true; },
      raton: prop => g.posRaton[prop] || 0
    };
    /* Disparar un evento desde la prueba, como si lo hubiera hecho la persona. */
    g.disparar = (id, evento, valores) => {
      const cb = g.eventos.get(id + ':' + evento);
      return cb ? cb(valores || [id]) : Promise.resolve();
    };
    return g;
  }

  /* ------------------------------------------------------------------ */
  /* API pública                                                         */
  /* ------------------------------------------------------------------ */
  const compilar = fuente => S.compilar(fuente);

  async function ejecutar(fuente, io, opts) {
    const ast = typeof fuente === 'string' ? compilar(fuente) : fuente;
    const o = Object.assign({}, opts, { Interprete: InterpreteVIS });
    const interp = new InterpreteVIS(ast, io, o);
    interp.PREDEF = PREDEF_VIS;
    if (!interp.gui) interp.gui = guiDeMentira();
    if (o.control) o.control.detener = () => {
      interp.abortar = true;
      interp.terminarEspera();
    };
    await interp.run();
    return interp;
  }

  /* El revisor del lenguaje base no conoce los eventos, así que dice tres
     cosas que en un programa visual son falsas:
       · «nunca llamás a imprimir()»  — acá la salida es la ventana;
       · «la subrutina X nunca se llama» — la llama el runtime cuando alguien
         toca el control, y el nombre viaja como cadena adentro de
         al_hacer_clic(), que el revisor no sigue;
       · «el parámetro id nunca se usa» — al que atiende un solo control no le
         hace falta saber cuál fue.
     Se las saca acá, no en el revisor base, porque solo son falsas en este
     dialecto. */
  function revisar(fuente) {
    const manejadores = new Set();
    /* El nombre es la última cadena antes del paréntesis que cierra; el
       primer argumento puede ser a su vez una llamada, como en
       al_hacer_clic (boton ("+1", 20, 60), "sumar"). */
    for (const m of String(fuente).matchAll(/al_(?:hacer_clic|cambiar|escribir)\s*\([\s\S]{0,200}?["']([A-Za-z_]\w*)["']\s*\)/g))
      manejadores.add(m[1]);

    return S.revisar(fuente).filter(a => {
      if (/imprimir\(\)/.test(a.mensaje)) return false;
      const noSeLlama = /la subrutina "(\w+)" nunca se llama/.exec(a.mensaje);
      if (noSeLlama && manejadores.has(noSeLlama[1])) return false;
      const param = /se declara en la subrutina (\w+)\(\)/.exec(a.mensaje);
      if (param && manejadores.has(param[1])) return false;
      return true;
    });
  }

  global.SLE2VIS = {
    compilar, ejecutar, revisar, guiDeMentira,
    InterpreteVIS, PREDEF: PREDEF_VIS, CONTROLES, DIBUJOS, SLError: S.SLError
  };
})(typeof window !== 'undefined' ? window : globalThis);

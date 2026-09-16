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

  /* Los controles que se pueden crear, con su tamaño por omisión.
     Esta tabla es la única lista: el diseñador la lee de acá (SLE2VIS.CONTROLES)
     y el cuadro de herramientas también, así que un control nuevo aparece en
     los tres lugares o en ninguno. */
  const CONTROLES = {
    etiqueta:    { ancho: 120, alto: 22, texto: true },
    boton:       { ancho: 110, alto: 32, texto: true },
    caja:        { ancho: 160, alto: 26, texto: false },  // una caja de texto arranca vacía
    casilla:     { ancho: 140, alto: 22, texto: true },
    lista:       { ancho: 160, alto: 110, texto: false },
    desplegable: { ancho: 160, alto: 30, texto: false },
    numero:      { ancho: 120, alto: 30, texto: false },
    progreso:    { ancho: 200, alto: 22, texto: false },
    deslizador:  { ancho: 160, alto: 24, texto: false },
    lienzo:      { ancho: 300, alto: 200, texto: false }
  };

  /* Los que guardan una lista de opciones. «lista» las muestra todas y
     «desplegable» una sola: por dentro son lo mismo, así que agregar_item y
     compañía valen para los dos. */
  const CON_ITEMS = ['lista', 'desplegable'];

  /* Los que tienen un valor numérico. Cada uno con lo suyo:
     el progreso solo se muestra, así que no se puede escribir en él. */
  const RANGO_POR_OMISION = { minimo: 0, maximo: 100, paso: 1 };

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
      this.temporizadores = new Map();
      this.proximoTemporizador = 1;
    }

    /* Agenda el próximo tic de un temporizador.
       Se agenda de a uno y recién después de que el anterior terminó: con
       setInterval, un programa lento acumularía tics atrasados y los correría
       todos juntos cuando se desocupara. Un reloj que se atrasa es molesto;
       uno que de golpe da diez vueltas seguidas es un error imposible de
       entender para quien recién aprende. */
    agendar(id) {
      const t = this.temporizadores.get(id);
      if (!t || !t.andando || this.abortar) return;
      const generacion = t.generacion;
      const reloj = (this.opts && this.opts.reloj) || relojDeVerdad;
      reloj(t.ms, () => {
        const ahora = this.temporizadores.get(id);
        /* Se comprueba al EJECUTAR y no al agendar: entre medio pueden haber
           apagado el temporizador, detenido el programa o cerrado la ventana. */
        if (!ahora || !ahora.andando || ahora.generacion !== generacion) return;
        if (this.abortar || !this.esperando) return;
        /* Por la misma cola que los clics: dos cosas del programa no pueden
           estar corriendo a la vez. */
        this.encolar(ahora.sub, [id]).then(() => this.agendar(id));
      });
    }

    pararTodosLosTemporizadores() {
      for (const t of this.temporizadores.values()) { t.andando = false; t.generacion++; }
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

    /* Un control que existe de verdad, o un error que se entiende.
       «tipoEsperado» puede ser un tipo o una lista de tipos. */
    control(id, linea, tipoEsperado) {
      const n = Math.trunc(this.aNum(id, linea));
      const c = this.controles.get(n);
      if (!c) errE(`no hay ningún control con el número ${n}`, linea,
        'Los controles se guardan en una variable cuando se crean:\n' +
        '   b = boton ("Aceptar", 20, 20, 100, 30)\n' +
        'y después se usa esa variable:  poner_texto (b, "Listo")');
      if (tipoEsperado) {
        const vale = Array.isArray(tipoEsperado) ? tipoEsperado : [tipoEsperado];
        if (vale.indexOf(c.tipo) < 0) {
          errE(`ese control es un "${c.tipo}" y esto solo vale para ${
            vale.length === 1 ? `un "${vale[0]}"` : 'un ' + vale.map(t => `"${t}"`).join(' o un ')
          }`, linea);
        }
      }
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
      const c = { tipo };
      /* Los controles con número llevan su rango encima: el intérprete tiene
         que poder recortar un valor sin preguntarle a la pantalla, porque en
         las pruebas la pantalla es de mentira. */
      if (tipo === 'numero') c.rango = Object.assign({}, RANGO_POR_OMISION);
      if (tipo === 'progreso') c.rango = { minimo: 0, maximo: 100, paso: 1 };
      this.controles.set(id, c);
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
    desplegable: crearControl('desplegable'),
    numero: crearControl('numero'),
    progreso: crearControl('progreso'),
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
    /* poner_valor / leer_valor valen para todo lo que tiene un número:
         · deslizador y numero : el número en sí;
         · progreso            : de 0 a 100, lo que se ve lleno;
         · desplegable         : cuál opción está elegida, 1 para la primera.
           Se cuenta desde 1 y no desde 0 porque en SL los vectores también
           empiezan en 1: dos formas de contar en el mismo lenguaje sería
           regalarle un error a cada alumno. */
    poner_valor: fn(2, 2, function (v, l) {
      const { n, c } = this.control(v[0], l,
        ['deslizador', 'numero', 'progreso', 'desplegable']);
      let x = Math.trunc(num(this, v[1], l));
      if (c.tipo === 'desplegable') {
        const cuantos = Number(this.gui.leer(n, 'items')) || 0;
        if (x !== 0 && (x < 1 || x > cuantos)) {
          errE(`el desplegable no tiene una opción número ${x}`, l,
            cuantos ? `Tiene ${cuantos}: van de 1 a ${cuantos}. Con 0 no queda ninguna elegida.`
                    : 'Todavía no tiene ninguna opción: agregalas con agregar_item ().');
        }
      } else if (c.rango) {
        x = Math.max(c.rango.minimo, Math.min(c.rango.maximo, x));
      }
      this.gui.poner(n, 'valor', x);
      return true;
    }),
    leer_valor: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l,
        ['deslizador', 'numero', 'progreso', 'desplegable']);
      return Number(this.gui.leer(n, 'valor')) || 0;
    }),

    /* Hasta dónde llega un «numero». El paso es de a cuánto sube cada vez que
       se toca la flechita. */
    rango_numero: fn(3, 4, function (v, l) {
      const { n, c } = this.control(v[0], l, 'numero');
      const minimo = Math.trunc(num(this, v[1], l));
      const maximo = Math.trunc(num(this, v[2], l));
      const paso = v.length > 3 ? Math.trunc(num(this, v[3], l)) : 1;
      if (maximo <= minimo) errE('el máximo tiene que ser mayor que el mínimo', l,
        `Escribiste  rango_numero (n, ${minimo}, ${maximo}).`);
      if (paso < 1) errE('el paso tiene que ser 1 o más', l,
        'El paso es de a cuánto sube el número cada vez: rango_numero (n, 1, 10, 1).');
      c.rango = { minimo, maximo, paso };
      this.gui.poner(n, 'rango', c.rango);
      return true;
    }),

    /* Le dice al navegador que esa etiqueta es el nombre de ese control. Sin
       esto, un lector de pantalla llega a la caja de texto y dice «campo de
       texto» a secas: la etiqueta de al lado la lee antes y ya la olvidó. */
    asociar_etiqueta: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l, 'etiqueta');
      const { n: destino } = this.control(v[1], l,
        ['caja', 'lista', 'desplegable', 'numero', 'deslizador', 'progreso']);
      this.gui.poner(destino, 'etiquetaDe', n);
      return true;
    }),

    /* Manda el cursor a un control. Devuelve si se pudo: un control escondido
       o apagado no recibe el foco, y el programa tiene derecho a enterarse. */
    enfocar: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l);
      return !!this.gui.poner(n, 'enfocar', true);
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

    /* Valen para «lista» y para «desplegable»: por dentro son la misma cosa
       con dos formas de mostrarse. */
    agregar_item: fn(2, 2, function (v, l) {
      const { n } = this.control(v[0], l, CON_ITEMS);
      this.gui.poner(n, 'agregar', cad(this, v[1], l));
      return true;
    }),
    limpiar_items: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, CON_ITEMS);
      this.gui.poner(n, 'limpiar', true);
      return true;
    }),
    item_elegido: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, CON_ITEMS);
      return String(this.gui.leer(n, 'elegido'));
    }),
    cuantos_items: fn(1, 1, function (v, l) {
      const { n } = this.control(v[0], l, CON_ITEMS);
      return Number(this.gui.leer(n, 'items')) || 0;
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
      /* El aviso es para el programa que se queda esperando algo que no puede
         llegar nunca. Un temporizador andando también despierta al programa,
         así que contarlo no es un detalle: sin esto, un reloj o una animación
         —que no registran ningún clic— recibían un aviso que los mandaba a
         agregar un al_hacer_clic() que no les hace falta. */
      const tic = [...this.temporizadores.values()].some(t => t.andando);
      if (!this.manejadores.size && !tic && this.gui.aviso)
        this.gui.aviso('El programa espera eventos pero no hay nada que pueda despertarlo: '
          + 'no registró ningún clic con al_hacer_clic() ni tiene un temporizador andando.');
      this.gui.listo();
      await new Promise(res => { this.esperando = res; });
      return true;
    },

    cerrar_ventana: fn(0, 0, function () {
      this.pararTodosLosTemporizadores();
      this.terminarEspera();
      if (this.gui.cerrar) this.gui.cerrar();
      return true;
    }),

    /* ---------------------------- temporizador ------------------------ */
    /* Un reloj que llama a una subrutina cada tantos milisegundos. Es lo que
       falta para un contador, un juego o una barra que avanza sola.

       Arranca apagado a propósito: crearlo y que ya empiece a correr deja al
       programa haciendo cosas antes de terminar de armar la ventana. */
    temporizador: fn(2, 2, function (v, l) {
      const ms = Math.trunc(num(this, v[0], l));
      const sub = cad(this, v[1], l);
      if (ms < MINIMO_MS) errE(`el temporizador no puede ir más rápido que ${MINIMO_MS} milisegundos`, l,
        'Un reloj más rápido que eso no se ve y traba el navegador. ' +
        'Para algo que pasa cada segundo:  t = temporizador (1000, "avanzar")');
      if (!this.subs.has(sub)) {
        const cerca = S.parecido(sub, [...this.subs.keys()]);
        errE(`no hay ninguna subrutina que se llame "${sub}"`, l,
          cerca ? `¿Quisiste decir "${cerca}"?`
                : 'El nombre va entre comillas y tiene que ser el de una subrutina del programa.');
      }
      const id = this.proximoTemporizador++;
      this.temporizadores.set(id, { ms, sub, andando: false, generacion: 0 });
      return id;
    }),

    activar_temporizador: fn(2, 2, function (v, l) {
      const id = ent(this, v[0], l);
      const t = this.temporizadores.get(id);
      if (!t) errE(`no hay ningún temporizador con el número ${id}`, l,
        'Se guarda en una variable cuando se crea:\n' +
        '   t = temporizador (1000, "avanzar")\n' +
        'y después:  activar_temporizador (t, TRUE)');
      const prender = this.aLogico(v[1], l);
      t.generacion++;              // lo que estuviera agendado ya no vale
      t.andando = prender;
      if (prender) this.agendar(id);
      return true;
    }),

    temporizador_andando: fn(1, 1, function (v, l) {
      const t = this.temporizadores.get(ent(this, v[0], l));
      return !!(t && t.andando);
    }),

    mensaje: fn(1, 1, function (v, l) {
      this.gui.mensaje(cad(this, v[0], l));
      return true;
    }),

    /* Preguntar antes de hacer algo que no se puede deshacer.
       El programa se queda esperando la respuesta, como en cualquier
       formulario de verdad: es la primera vez que el alumno escribe código
       que se detiene esperando a una persona y después sigue.

       La respuesta NO se encola detrás del evento que la pidió: el clic que
       abrió la pregunta todavía está corriendo, y ponerse en la fila detrás
       de sí mismo dejaría el programa trabado para siempre. */
    confirmar: async function (n) {
      const l = n.linea;
      const a = [];
      for (const x of n.args) a.push(await this.eval(x));
      if (a.length !== 1) errE('confirmar() necesita la pregunta', l,
        'Se escribe así:  si (confirmar ("¿Vaciar la lista?")) { ... }');
      if (!this.gui.confirmar) return false;
      const respuesta = await this.gui.confirmar(cad(this, a[0], l));
      /* Si mientras la pregunta estaba abierta se detuvo el programa, no se
         sigue: el «sí» sería de una ejecución que ya no existe. */
      if (this.abortar) return false;
      return !!respuesta;
    },

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

  /* Más lento que esto no se ve, y más rápido traba el navegador. */
  const MINIMO_MS = 50;

  /* El reloj de verdad. Las pruebas pasan el suyo por opts.reloj: esperar
     segundos de verdad en una prueba la vuelve lenta y, peor, inestable. */
  const relojDeVerdad = (ms, que) => setTimeout(que, ms);

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
        else if (prop === 'limpiar') { c.items = []; c.valor = 0; }
        else if (prop === 'posicion') { c.x = valor.x; c.y = valor.y; }
        else if (prop === 'tamano') { c.ancho = valor.ancho; c.alto = valor.alto; }
        else if (prop === 'enfocar') {
          /* Sin pantalla no hay foco de verdad, pero la respuesta tiene que
             ser la misma que daría el navegador: escondido o apagado, no. */
          if (c.visible === false || c.habilitado === false) return false;
          g.enfocado = id;
          return true;
        } else c[prop] = valor;
      },
      leer(id, prop) {
        const c = g.controles.get(id) || {};
        if (prop === 'texto') return c.texto === undefined ? '' : c.texto;
        if (prop === 'valor') return c.valor || 0;
        if (prop === 'marcado') return !!c.marcado;
        if (prop === 'items') return (c.items || []).length;
        /* En un desplegable, lo elegido sale del número: así la pantalla de
           mentira y la de verdad contestan lo mismo sin repetir el estado. */
        if (prop === 'elegido') {
          if (c.tipo === 'desplegable') {
            const i = (Number(c.valor) || 0) - 1;
            return (c.items && c.items[i]) || '';
          }
          return c.elegido || '';
        }
        return '';
      },
      dibujar(id, orden, args) {
        g.registro.push(['dibujar', id, orden, args]);
        const c = g.controles.get(id);
        if (c) (orden === 'borrar' ? (c.dibujos = []) : c.dibujos.push([orden].concat(args)));
      },
      alEvento(id, evento, cb) { g.eventos.set(id + ':' + evento, cb); },
      mensaje(t) { g.mensajes.push(t); g.registro.push(['mensaje', t]); },
      /* Las preguntas se contestan de antemano: g.respuestas = [TRUE, FALSE].
         Una prueba no puede tocar un botón, y esperar a que alguien lo toque
         la dejaría colgada. Si no quedan respuestas, se contesta que no —que
         es lo que hace Escape, y lo más seguro para lo que se iba a borrar. */
      respuestas: [],
      confirmar(t) {
        g.preguntas.push(t);
        g.registro.push(['confirmar', t]);
        return Promise.resolve(g.respuestas.length ? !!g.respuestas.shift() : false);
      },
      preguntas: [],
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
      interp.pararTodosLosTemporizadores();
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

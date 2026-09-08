/*
 * Corrección automática de los ejercicios de ESLE2 Visual.
 *
 * Un ejercicio del curso normal se corrige comparando lo que imprime el
 * programa con lo que se esperaba. Acá no hay texto que comparar: lo que hay
 * es una ventana. Así que el programa del alumno se ejecuta con el backend de
 * mentira de sle2vis.js —el que anota todo lo que se le pide en vez de
 * dibujarlo—, se le mandan los toques que haría una persona («clic en el
 * primer botón», «escribí Ana en la primera caja») y después se revisa qué
 * quedó: qué controles hay, qué dicen, qué se dibujó y qué mensajes salieron.
 *
 * Una prueba es un objeto:
 *
 *   { nombre: 'Al tocar Saludar aparece el saludo',
 *     entrada: '',                       // lo que consume leer(), si hace falta
 *     pasos:  [['clic', 'boton', 0]],
 *     espera: [['mensajes', ['Hola!']]] }
 *
 * Los controles se nombran por tipo y número de orden («el segundo botón»),
 * nunca por el número interno, para que dos soluciones distintas que crean lo
 * mismo en otro orden de líneas sigan valiendo.
 *
 * API:  VerificarVisual.correr(fuente, prueba) -> { ok, fallos, gui, salida }
 *       VerificarVisual.PASOS · VerificarVisual.ESPERAS
 */
(function (global) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Ayudas                                                              */
  /* ------------------------------------------------------------------ */

  /* Espera a que se cumpla una condición sin bloquear el hilo: el programa del
     alumno corre en paralelo y hay que dejarlo avanzar. */
  async function hasta(cond, vueltas) {
    for (let i = 0; i < (vueltas || 400); i++) {
      if (cond()) return true;
      await new Promise(r => setTimeout(r, 1));
    }
    return cond();
  }

  /* Los controles de un tipo, en el orden en que el programa los creó. */
  function delTipo(gui, tipo) {
    const r = [];
    gui.controles.forEach((c, id) => { if (!tipo || c.tipo === tipo) r.push({ id, c }); });
    return r;
  }

  /* «la primera etiqueta», «el segundo botón»: los mensajes de una corrección
     los lee alguien que está aprendiendo, así que tienen que estar bien
     escritos. Etiqueta, caja, casilla y lista son femeninas. */
  const ORD_M = ['el primer', 'el segundo', 'el tercer', 'el cuarto', 'el quinto',
    'el sexto', 'el séptimo', 'el octavo'];
  const ORD_F = ['la primera', 'la segunda', 'la tercera', 'la cuarta', 'la quinta',
    'la sexta', 'la séptima', 'la octava'];
  const FEMENINOS = new Set(['etiqueta', 'caja', 'casilla', 'lista']);
  const NOMBRE = { boton: 'botón' };

  function elDe(tipo, i) {
    const n = i || 0;
    const f = FEMENINOS.has(tipo);
    const o = (f ? ORD_F : ORD_M)[n] || ((f ? 'la número ' : 'el número ') + (n + 1));
    return o + ' ' + (NOMBRE[tipo] || tipo);
  }

  function unControl(gui, tipo, i, fallos, que) {
    const lista = delTipo(gui, tipo);
    const n = i || 0;
    if (lista.length <= n) {
      fallos.push(que + ': falta ' + elDe(tipo, n) + ' (hay ' + lista.length + ').');
      return null;
    }
    return lista[n];
  }

  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const J = v => JSON.stringify(v);

  /* Números con la tolerancia de siempre: 0.001 alcanza para todo el curso. */
  const mismoNumero = (a, b) => Math.abs(Number(a) - Number(b)) < 0.001;

  const normalizar = t => String(t).replace(/\r/g, '').split('\n')
    .map(l => l.trim().replace(/[ \t]+/g, ' ')).filter(l => l.length).join('\n');

  /* ------------------------------------------------------------------ */
  /* Los toques que da la persona                                        */
  /* ------------------------------------------------------------------ */
  const PASOS = {
    /* ['clic', tipo, i] — tocar un control */
    async clic(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'clic');
      if (t) await gui.disparar(t.id, 'clic', [t.id]);
    },
    /* ['escribir', i, texto] — escribir en una caja de texto */
    async escribir(gui, a, fallos) {
      const t = unControl(gui, 'caja', a[0], fallos, 'escribir');
      if (!t) return;
      t.c.texto = String(a[1]);
      await gui.disparar(t.id, 'tecla', [t.id]);
      await gui.disparar(t.id, 'cambio', [t.id]);
    },
    /* ['marcar', i, si] — marcar o desmarcar una casilla */
    async marcar(gui, a, fallos) {
      const t = unControl(gui, 'casilla', a[0], fallos, 'marcar');
      if (!t) return;
      t.c.marcado = a[1] !== false;
      await gui.disparar(t.id, 'cambio', [t.id]);
    },
    /* ['elegir', i, texto] — elegir un ítem de una lista */
    async elegir(gui, a, fallos) {
      const t = unControl(gui, 'lista', a[0], fallos, 'elegir');
      if (!t) return;
      t.c.elegido = String(a[1]);
      await gui.disparar(t.id, 'cambio', [t.id]);
    },
    /* ['deslizar', i, valor] — mover un deslizador */
    async deslizar(gui, a, fallos) {
      const t = unControl(gui, 'deslizador', a[0], fallos, 'deslizar');
      if (!t) return;
      t.c.valor = Number(a[1]);
      await gui.disparar(t.id, 'cambio', [t.id]);
    },
    /* ['raton', x, y] — poner el puntero en un lugar del lienzo */
    async raton(gui, a) { gui.posRaton = { x: Number(a[0]), y: Number(a[1]) }; }
  };

  /* ------------------------------------------------------------------ */
  /* Lo que se revisa al final                                           */
  /* ------------------------------------------------------------------ */
  const ESPERAS = {
    /* ['ventana', {titulo, ancho, alto}] */
    ventana(gui, a, fallos) {
      const props = a[0] || {};
      const v = (gui.registro.filter(r => r[0] === 'ventana').pop() || [])[1];
      if (!v) { fallos.push('No se abrió ninguna ventana con ventana().'); return; }
      for (const k of Object.keys(props)) {
        const esperado = props[k];
        const obtenido = v[k];
        const bien = typeof esperado === 'number' ? mismoNumero(obtenido, esperado)
          : String(obtenido) === String(esperado);
        if (!bien) fallos.push('La ventana tiene ' + k + ' = ' + J(obtenido) + ' y se esperaba ' + J(esperado) + '.');
      }
    },
    /* ['hay', tipo, cuantos] */
    hay(gui, a, fallos) {
      const n = delTipo(gui, a[0]).length;
      if (n !== a[1]) fallos.push('Hay ' + n + ' control(es) de tipo "' + a[0] + '" y se esperaban ' + a[1] + '.');
    },
    /* ['texto', tipo, i, valor] — lo que muestra el control */
    texto(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'texto');
      if (!t) return;
      const obtenido = t.c.texto === undefined ? '' : String(t.c.texto);
      if (normalizar(obtenido) !== normalizar(a[2]))
        fallos.push(elDe(a[0], a[1]) + ' dice ' + J(obtenido) + ' y se esperaba ' + J(String(a[2])) + '.');
    },
    /* ['valor', tipo, i, n] */
    valor(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'valor');
      if (t && !mismoNumero(t.c.valor, a[2]))
        fallos.push(elDe(a[0], a[1]) + ' vale ' + t.c.valor + ' y se esperaba ' + a[2] + '.');
    },
    /* ['marcado', i, si] */
    marcado(gui, a, fallos) {
      const t = unControl(gui, 'casilla', a[0], fallos, 'marcado');
      if (t && !!t.c.marcado !== !!a[1])
        fallos.push(elDe('casilla', a[0]) + ' está ' + (t.c.marcado ? 'marcada' : 'sin marcar') +
          ' y se esperaba lo contrario.');
    },
    /* ['items', i, [..]] — el contenido de una lista */
    items(gui, a, fallos) {
      const t = unControl(gui, 'lista', a[0], fallos, 'items');
      if (!t) return;
      const obtenido = (t.c.items || []).map(String);
      if (!igual(obtenido, a[1].map(String)))
        fallos.push(elDe('lista', a[0]) + ' tiene ' + J(obtenido) + ' y se esperaba ' + J(a[1]) + '.');
    },
    /* ['visible', tipo, i, si] */
    visible(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'visible');
      /* Si nunca se tocó, un control se ve. */
      if (t && (t.c.visible === undefined ? true : !!t.c.visible) !== !!a[2])
        fallos.push(elDe(a[0], a[1]) + ' tendría que estar ' + (a[2] ? 'visible' : 'escondido') + '.');
    },
    /* ['habilitado', tipo, i, si] */
    habilitado(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'habilitado');
      if (t && (t.c.habilitado === undefined ? true : !!t.c.habilitado) !== !!a[2])
        fallos.push(elDe(a[0], a[1]) + ' tendría que estar ' + (a[2] ? 'habilitado' : 'deshabilitado') + '.');
    },
    /* ['posicion', tipo, i, x, y] */
    posicion(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'posicion');
      if (t && !(mismoNumero(t.c.x, a[2]) && mismoNumero(t.c.y, a[3])))
        fallos.push(elDe(a[0], a[1]) + ' está en (' + t.c.x + ', ' + t.c.y +
          ') y se esperaba (' + a[2] + ', ' + a[3] + ').');
    },
    /* ['tamano', tipo, i, ancho, alto] */
    tamano(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'tamano');
      if (t && !(mismoNumero(t.c.ancho, a[2]) && mismoNumero(t.c.alto, a[3])))
        fallos.push(elDe(a[0], a[1]) + ' mide ' + t.c.ancho + 'x' + t.c.alto +
          ' y se esperaba ' + a[2] + 'x' + a[3] + '.');
    },
    /* ['fondo', tipo, i, r, g, b] */
    fondo(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'fondo');
      if (t && !igual(t.c.fondo, { r: a[2], g: a[3], b: a[4] }))
        fallos.push(elDe(a[0], a[1]) + ' tiene el fondo ' + J(t.c.fondo) +
          ' y se esperaba rgb(' + a[2] + ', ' + a[3] + ', ' + a[4] + ').');
    },
    /* ['color', tipo, i, r, g, b] */
    color(gui, a, fallos) {
      const t = unControl(gui, a[0], a[1], fallos, 'color');
      if (t && !igual(t.c.color, { r: a[2], g: a[3], b: a[4] }))
        fallos.push(elDe(a[0], a[1]) + ' tiene la letra de color ' + J(t.c.color) +
          ' y se esperaba rgb(' + a[2] + ', ' + a[3] + ', ' + a[4] + ').');
    },
    /* ['mensajes', [..]] — los mensaje() que salieron, en orden */
    mensajes(gui, a, fallos) {
      const obtenido = gui.mensajes.map(normalizar);
      if (!igual(obtenido, a[0].map(normalizar)))
        fallos.push('Los mensajes fueron ' + J(gui.mensajes) + ' y se esperaba ' + J(a[0]) + '.');
    },
    /* ['dibujos', orden, cuantos] — cuántas veces se dibujó algo */
    dibujos(gui, a, fallos) {
      const n = gui.registro.filter(r => r[0] === 'dibujar' && r[2] === a[0]).length;
      if (n !== a[1]) fallos.push('Se dibujaron ' + n + ' "' + a[0] + '" y se esperaban ' + a[1] + '.');
    },
    /* ['dibujo', orden, [args]] — que exista un dibujo con esos números */
    dibujo(gui, a, fallos) {
      const hay = gui.registro.some(r => r[0] === 'dibujar' && r[2] === a[0] &&
        a[1].every((v, k) => (typeof v === 'number' ? mismoNumero(r[3][k], v) : igual(r[3][k], v))));
      if (!hay) fallos.push('Falta dibujar ' + a[0] + ' (' + a[1].join(', ') + ').');
    },
    /* ['salida', texto] — lo que se imprimió con imprimir() */
    salida(gui, a, fallos, ctx) {
      const obtenido = ctx.salida.join('');
      if (normalizar(obtenido) !== normalizar(a[0]))
        fallos.push('Se imprimió ' + J(obtenido) + ' y se esperaba ' + J(a[0]) + '.');
    },
    /* ['cerrada', si] — que el programa haya cerrado la ventana solo */
    cerrada(gui, a, fallos) {
      const quiere = a[0] !== false;
      if (!!gui.cerrada !== quiere)
        fallos.push(quiere ? 'La ventana tendría que haberse cerrado con cerrar_ventana().'
          : 'La ventana no tendría que cerrarse todavía.');
    }
  };

  /* ------------------------------------------------------------------ */
  /* Correr una prueba                                                   */
  /* ------------------------------------------------------------------ */
  async function correr(fuente, prueba) {
    const VIS = global.SLE2VIS;
    const gui = VIS.guiDeMentira();
    const salida = [];
    const lineas = (prueba.entrada || '').length
      ? String(prueba.entrada).replace(/\r/g, '').split('\n') : [];
    const io = {
      archivos: new Map(), argumentos: [],
      imprimir: t => salida.push(t),
      limpiar: () => { salida.length = 0; },
      finEntrada: () => lineas.length === 0,
      leerLinea: async () => (lineas.length ? lineas.shift() : null),
      setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
      setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
      getScrsize: () => ({ lineas: 25, columnas: 80 }),
      beep: async () => {}, leerTecla: async () => 0
    };

    const control = {};
    const fallos = [];
    let termino = false, error = null;

    const corriendo = VIS.ejecutar(fuente, io, { gui, control, maxPasos: 4000000 })
      .then(() => { termino = true; }, e => { error = e; termino = true; });

    /* El programa se queda esperando eventos: hay que dejarlo llegar hasta ahí
       antes de tocar nada. Si termina solo (uno que solo dibuja), también vale. */
    await hasta(() => termino || gui.esperando);

    if (!error) {
      for (const paso of (prueba.pasos || [])) {
        const f = PASOS[paso[0]];
        if (!f) { fallos.push('Paso desconocido: ' + paso[0]); continue; }
        await f(gui, paso.slice(1), fallos);
      }
    }

    if (control.detener) control.detener();
    await corriendo;

    if (error) {
      fallos.push('El programa cortó con un error' + (error.linea ? ' (línea ' + error.linea + ')' : '') +
        ': ' + error.message);
    }
    for (const e of gui.errores)
      fallos.push('Un evento cortó con un error' + (e.linea ? ' (línea ' + e.linea + ')' : '') +
        ': ' + e.message);

    if (!error) {
      const ctx = { salida };
      for (const esp of (prueba.espera || [])) {
        const f = ESPERAS[esp[0]];
        if (!f) { fallos.push('Comprobación desconocida: ' + esp[0]); continue; }
        f(gui, esp.slice(1), fallos, ctx);
      }
    }

    return { ok: fallos.length === 0, fallos, gui, salida: salida.join(''), error };
  }

  global.VerificarVisual = { correr, PASOS, ESPERAS, normalizar, delTipo };
  if (typeof module !== 'undefined' && module.exports) module.exports = global.VerificarVisual;
})(typeof window !== 'undefined' ? window : globalThis);

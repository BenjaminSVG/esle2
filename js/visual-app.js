/*
 * ESLE2 Visual — el armado de la página.
 *
 * Es el mismo IDE que index.html y poo.html: la misma cabecera, la misma barra
 * de herramientas, los mismos paneles redimensionables, el mismo curso y los
 * mismos diálogos. Lo único propio son los paneles «Ventana» y «Controles», y
 * el menú «Insertar», que pega el código de un control o de un dibujo.
 *
 * El backend que dibuja está en js/visual-ui.js, el lenguaje en js/sle2vis.js
 * y la corrección de ejercicios en js/verificar-visual.js. Acá se los enchufa.
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const CTRL = SLE2VIS.CONTROLES;
  const CATALOGO = (window.CURSO_VISUAL || { EJERCICIOS: [] }).EJERCICIOS;

  /* La lista del curso, salvo que se haya entrado por el enlace de una guía:
     ahí la lista es esa guía y nada más, que es de lo que se trata el modo
     aula. Es la misma mecánica que en el IDE (js/app.js). */
  let EJERCICIOS = CATALOGO;
  let guiaAula = null;          // la guía abierta por enlace, o null
  let faltanDeLaGuia = [];      // los que ya no están en el curso

  function recargarEjercicios() {
    if (guiaAula && window.Aula) {
      const r = window.Aula.resolver(guiaAula, CATALOGO);
      EJERCICIOS = r.ejercicios;
      faltanDeLaGuia = r.faltan;
      return;
    }
    EJERCICIOS = CATALOGO;
    faltanDeLaGuia = [];
  }

  /* =================================================================== */
  /* Progreso en cookies                                                 */
  /* =================================================================== */
  const COOKIE = 'esle2_progreso_vis';

  function leerCookie(nombre) {
    const p = document.cookie.split('; ').find(c => c.startsWith(nombre + '='));
    return p ? decodeURIComponent(p.slice(nombre.length + 1)) : '';
  }
  function grabarCookie(nombre, valor, dias) {
    const f = new Date(Date.now() + dias * 864e5).toUTCString();
    /* Secure cuando la página va por https: una cookie que también viaja por
       http se la puede leer cualquiera en la red del colegio. En localhost no,
       porque ahí el navegador descartaría la cookie y no se guardaría nada. */
    document.cookie = nombre + '=' + encodeURIComponent(valor) +
      '; expires=' + f + '; path=/; SameSite=Lax' +
      (location.protocol === 'https:' ? '; Secure' : '');
  }

  const progreso = (() => {
    try { return JSON.parse(leerCookie(COOKIE) || '{}'); } catch (e) { return {}; }
  })();

  function guardarProgreso() {
    grabarCookie(COOKIE, JSON.stringify(progreso), 365);
    pintarProgreso();
  }

  function pintarProgreso() {
    const n = EJERCICIOS.filter(e => progreso[e.id]).length;
    const t = EJERCICIOS.length;
    $('#progresoTexto').textContent = n + ' / ' + t;
    $('#progresoBarra').style.width = (t ? (n / t) * 100 : 0) + '%';
    $('#progresoGlobal').title = n + ' de ' + t + ' ejercicios del curso Visual resueltos';
  }

  /* =================================================================== */
  /* Editor                                                              */
  /* =================================================================== */
  const INICIAL = (window.VISUAL_EJEMPLOS && VISUAL_EJEMPLOS[0].codigo) || 'inicio\nfin\n';

  const editor = CodeMirror.fromTextArea($('#codigo'), {
    mode: 'sle2', theme: 'esle2', lineNumbers: true,
    indentUnit: 3, tabSize: 3, matchBrackets: true,
    extraKeys: {
      'Ctrl-Enter': () => ejecutar(false),
      'Cmd-Enter': () => ejecutar(false),
      'Ctrl-S': () => { guardar(); return false; },
      Tab: cm => cm.execCommand('insertSoftTab')
    }
  });
  /* Ajustar texto: el Alt + Z de Visual Studio Code. */
  AjustarTexto.iniciar({ editor: editor, boton: $('#btnAjustar'), clave: 'esle2vis_ajustar' });

  /* Cuando el mismo error de sintaxis aparece cinco veces seguidas en dos
     minutos, se dice algo. Va en la salida y no en un cartel: no interrumpe. */
  const animo = AnimoUI.iniciar({
    clave: 'esle2_animo_vis',
    consola: $('#consola'),
    alaLinea: n => { editor.setCursor({ line: n - 1, ch: 0 }); editor.focus(); }
  });

  /* Modo flexible: el único compilador de la página (ver js/flexible-ui.js).
     En estricto se comporta igual que siempre. */
  const Flex = FlexibleUI.iniciar({
    editor: editor, boton: $('#btnFlexible'), clave: 'esle2vis_flexible',
    estricto: fuente => SLE2VIS.compilar(fuente),
    informar: errores => {
      if (!errores.length) return;
      escribir('\nModo flexible: ' + errores.length +
        (errores.length === 1 ? ' error de sintaxis' : ' errores de sintaxis') +
        '. El programa se compiló igual y corre hasta el primero.\n', 'aviso');
      for (const e of errores) {
        escribir('  línea ' + e.linea + ': ' + e.mensaje + '\n', 'err');
        if (e.sugerencia) escribir('     ' + e.sugerencia.split('\n')[0] + '\n', 'info');
      }
    }
  });
  const compilar = fuente => Flex.compilar(fuente);


  editor.setValue(Guardado.leer('esle2vis_codigo') || INICIAL);
  editor.getInputField().setAttribute('aria-label', 'Editor de programas ESLE2 Visual');
  editor.getScrollerElement().setAttribute('tabindex', '0');
  editor.getScrollerElement().setAttribute('role', 'region');
  editor.getScrollerElement().setAttribute('aria-label', 'Editor de programas ESLE2 Visual');
  editor.on('change', () => {
    Guardado.escribir('esle2vis_codigo', editor.getValue());
    if (ejercicioActivo) Guardado.escribir('esle2vis_ej_' + ejercicioActivo.id, editor.getValue());
  });
  editor.on('cursorActivity', () => {
    const c = editor.getCursor();
    $('#posCursor').textContent = (c.line + 1) + ' : ' + (c.ch + 1);
  });

  const compartido = window.Compartir && Compartir.leer();
  if (compartido) { editor.setValue(compartido.codigo); Compartir.limpiarUrl(); }

  if (window.AutocompletarUI)
    AutocompletarUI.iniciar(editor, { extras: Object.keys(SLE2VIS.PREDEF) });

  /* =================================================================== */
  /* Salida y estado                                                     */
  /* =================================================================== */
  function escribir(texto, clase) {
    const n = document.createElement('span');
    if (clase) n.className = clase;
    n.textContent = texto;
    $('#consola').appendChild(n);
    $('#consola').scrollTop = $('#consola').scrollHeight;
  }
  const limpiarSalida = () => $('#consola').replaceChildren();

  function estado(txt, clase) {
    $('#estado').textContent = txt;
    $('#estado').className = 'estado ' + (clase || '');
  }

  /* Si el navegador no deja guardar —ventana privada, o el almacén lleno— se
     dice una sola vez. Callarlo sería dejar que alguien trabaje una hora
     creyendo que su programa está a salvo. */
  Guardado.alFallar(texto => {
    escribir('\nAviso: ' + texto + '\n', 'aviso');
    estado('no se está guardando', 'error');
  });

  function mostrarError(e) {
    const linea = e && e.linea ? ' (línea ' + e.linea + ')' : '';
    escribir('\n' + (e && e.fase === 'compilacion' ? 'Error de compilación' : 'Error') +
      linea + ': ' + e.message + '\n', 'err');
    if (e && e.sugerencia) escribir(e.sugerencia + '\n', 'info');
    if (e && e.linea) { editor.setCursor({ line: e.linea - 1, ch: 0 }); editor.focus(); }
    estado('con errores', 'error');
    if (e && e.fase === 'compilacion') animo.registrar({ error: e.message, linea: e.linea });
  }

  /* =================================================================== */
  /* Vistas: diseñador y curso                                           */
  /* =================================================================== */
  $('#nav').addEventListener('click', ev => {
    const b = ev.target.closest('.pest[data-vista]');
    if (b) irA(b.dataset.vista);
  });

  function irA(cual) {
    document.querySelectorAll('.pest[data-vista]').forEach(b =>
      b.classList.toggle('activa', b.dataset.vista === cual));
    document.querySelectorAll('.vista').forEach(v =>
      v.classList.toggle('activa', v.id === 'vista-' + cual));
    if (cual === 'ide') editor.refresh();
  }

  /* =================================================================== */
  /* El backend que dibuja                                               */
  /* =================================================================== */
  let elegido = null;

  /* La ventana del programa no ocupa un panel fijo: vive en una pantalla que
     se abre con el botón «Ventana». Se abre sola la primera vez que el
     programa dibuja algo, y de ahí en adelante manda la persona: cerrarla no
     corta nada, el programa sigue esperando eventos. */
  const dlgVentana = $('#dlgVentana');
  let ventanaMostrada = false;        // ya se abrió sola en esta ejecución
  function verVentana(abrir) {
    if (abrir === false) { if (dlgVentana.open) dlgVentana.close(); return; }
    if (!dlgVentana.open) dlgVentana.showModal();
  }
  function marcarVentana() {
    const n = gui.controles.size;
    const pastilla = $('#ventanaCuenta');
    pastilla.textContent = n || '';
    pastilla.classList.toggle('oculto', !n);
    $('#btnVentana').classList.toggle('viva', !!control);
  }

  const gui = VisualUI.guiDOM({
    marco: $('#formaMarco'),
    titulo: $('#formaTitulo'),
    cuerpo: $('#formaCuerpo'),
    alCambiar: () => {
      $('#disenoVacio').classList.add('oculto');
      pintarArbol();
      if (!ventanaMostrada) { ventanaMostrada = true; verVentana(true); }
    },
    alSeleccionar: id => seleccionar(id),
    mensaje: t => { escribir('[mensaje] ' + t + '\n'); alert(t); },
    aviso: t => escribir('Aviso: ' + t + '\n', 'aviso'),
    error: e => mostrarError(e),
    listo: () => {
      escribir('La ventana está abierta. Tocá los controles: el programa responde.\n', 'ok');
      estado('esperando eventos', 'corriendo');
      $('#ventanaMini').textContent = 'tocá los controles';
      marcarVentana();
    },
    cerrar: () => detener()
  });

  /* =================================================================== */
  /* Ejecución                                                           */
  /* =================================================================== */
  let control = null;
  let detenido = false;                // si esta ejecución la cortó la persona
  const archivos = new Map();          // archivos en memoria de set_stdin/set_stdout

  /* Esperas cancelables: lo mismo que hace el IDE clásico para que «Detener»
     corte también cuando el programa está pausado en el depurador. */
  const esperas = new Set();
  function esperar(ejecutor) {
    const p = new Promise((resolve, reject) => {
      const espera = {
        cancelar: () => {
          esperas.delete(espera);
          if (espera.limpiar) espera.limpiar();
          reject(new SLE2.SLError('ejecución interrumpida por el usuario', 0));
        }
      };
      esperas.add(espera);
      const terminar = valor => {
        if (!esperas.has(espera)) return;
        esperas.delete(espera);
        if (espera.limpiar) espera.limpiar();
        resolve(valor);
      };
      espera.limpiar = ejecutor(terminar) || null;
    });
    p.catch(() => {});
    return p;
  }
  const cancelarEsperas = () => { for (const e of Array.from(esperas)) e.cancelar(); };

  const argumentos = () => ($('#argumentos').value.match(/"[^"]*"|\S+/g) || [])
    .map(a => a.replace(/^"|"$/g, ''));

  function io() {
    const lineas = $('#entrada').value.length
      ? $('#entrada').value.replace(/\r/g, '').split('\n') : [];
    return {
      archivos, argumentos: argumentos(),
      imprimir: t => escribir(t),
      limpiar: () => limpiarSalida(),
      finEntrada: () => lineas.length === 0,
      leerLinea: async () => {
        /* Si el programa lee y no hay datos, se muestra el panel: es más útil
           que devolver vacío en silencio. */
        if (!lineas.length) { verEntrada(true); return null; }
        return lineas.shift();
      },
      setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
      setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
      getScrsize: () => ({ lineas: 25, columnas: 80 }),
      beep: async () => {}, leerTecla: async () => 0
    };
  }

  async function ejecutar(pasoAPaso) {
    irA('ide');
    /* Si ya hay una ventana abierta, ejecutar de nuevo la cierra y arranca
       otra vez: es lo que uno espera al tocar «Ejecutar» dos veces. */
    if (control) { detener(); await new Promise(r => setTimeout(r, 40)); }
    limpiarSalida();
    if (gui.cerrarPregunta) gui.cerrarPregunta();   // no queda nada de la corrida anterior
    gui.limpiar();
    elegido = null;
    $('#formaMarco').classList.add('oculto');
    $('#disenoVacio').classList.remove('oculto');
    $('#ventanaMini').textContent = 'se abre al ejecutar';
    ventanaMostrada = false;
    pintarArbol();
    pintarProps();

    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }

    if (historial) historial.registrar('ejecucion', 'Antes de ejecutar');

    control = {};
    detenido = false;
    $('#btnDetener').classList.remove('oculto');
    estado('ejecutando…', 'corriendo');
    escribir('Ejecutando el programa…\n', 'info');
    if (pasoAPaso) { depurador.encender(); botonesPaso(true); }

    try {
      await SLE2VIS.ejecutar(ast, io(), { gui, control, depurador: depurador.hook });
      /* Cerrar la ventana con «Detener» también hace volver a ejecutar(), pero
         ahí el programa no terminó: lo cortaron. Decir «terminó» sería falso. */
      if (!detenido) {
        escribir('\n[el programa terminó]\n', 'info');
        estado('terminado', 'ok');
        if (window.Sonido) Sonido.tocar('exito');
      }
    } catch (e) {
      mostrarError(e);
    } finally {
      control = null;
      depurador.terminar();
      botonesPaso(false);
      $('#btnDetener').classList.add('oculto');
    }
  }

  function detener() {
    if (!control) return;
    detenido = true;
    /* Primero se contesta la pregunta que haya quedado abierta —que no— y
       recién después se corta: si no, el programa queda esperando para
       siempre una respuesta que ya nadie va a dar. */
    if (gui.cerrarPregunta) gui.cerrarPregunta();
    control.detener();
    verVentana(false);
    cancelarEsperas();
    escribir('\n[ventana cerrada]\n', 'info');
    estado('listo');
  }

  $('#btnEjecutar').addEventListener('click', () => ejecutar(false));
  /* --------------------- diseñador de ventanas ---------------------- */
  /* Acomodar los controles arrastrándolos. Reescribe los números del propio
     programa: no hay archivo de diseño aparte (ver js/disenador.js). */
  DisenadorUI.iniciar({ editor, boton: $('#btnDisenar'), estado });
  document.addEventListener('keydown', ev => {
    if (ev.ctrlKey && ev.shiftKey && (ev.key === 'D' || ev.key === 'd')) {
      ev.preventDefault();
      $('#btnDisenar').click();
    }
  });

  $('#btnDepurar').addEventListener('click', () => ejecutar(true));
  $('#btnDetener').addEventListener('click', detener);
  $('#btnVentana').addEventListener('click', () => verVentana(true));
  $('#btnCerrarVentana').addEventListener('click', () => verVentana(false));

  /* --------------------------- depurador ------------------------------ */
  /* El mismo módulo del IDE clásico: el intérprete lo llama antes de cada
     sentencia y él marca la línea y muestra las variables vivas. En un
     programa visual eso también sirve adentro de un evento: se ve la subrutina
     del clic ejecutándose línea por línea. */
  const depurador = ESLE2Depurador.crearDepurador({
    editor,
    panel: $('#panelVars'),
    cuerpo: $('#varsCuerpo'),
    esperar,
    alPausar(linea) {
      $('#varsLinea').textContent = 'línea ' + linea;
      $('#btnPaso').classList.remove('oculto');
      $('#btnContinuar').classList.remove('oculto');
      estado('en pausa — línea ' + linea, 'corriendo');
    },
    alSeguir() { $('#varsLinea').textContent = 'ejecutando…'; }
  });

  function botonesPaso(visibles) {
    $('#btnPaso').classList.toggle('oculto', !visibles);
    $('#btnContinuar').classList.toggle('oculto', !visibles);
  }

  $('#btnPaso').addEventListener('click', () => depurador.paso());
  $('#btnContinuar').addEventListener('click', () => {
    depurador.apagar(true);
    botonesPaso(false);
    estado('ejecutando…', 'corriendo');
  });

  /* ---------------------------- revisar ------------------------------- */
  $('#btnCompilar').addEventListener('click', () => {
    irA('ide');
    limpiarSalida();
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }
    const avisos = SLE2VIS.revisar(editor.getValue());
    const estilo = window.Estilo ? Estilo.revisar(ast) : [];
    if (!avisos.length && !estilo.length) {
      escribir('Sin errores ni observaciones.\n', 'ok');
      estado('revisado', 'ok');
      return;
    }
    avisos.concat(estilo).forEach(a => escribir('línea ' + a.linea + ': ' + a.mensaje + '\n', 'aviso'));
    estado(avisos.length + estilo.length + ' observación(es)', 'corriendo');
  });

  $('#btnLimpiar').addEventListener('click', limpiarSalida);

  /* El panel de entrada de datos viene apagado —un programa visual casi nunca
     lee de ahí— y se enciende solo cuando hace falta. */
  function verEntrada(si) {
    $('#panelEntrada').classList.toggle('oculto', !si);
  }
  $('#entrada').value = Guardado.leer('esle2vis_entrada') || '';
  if ($('#entrada').value) verEntrada(true);
  $('#entrada').addEventListener('input', () =>
    Guardado.escribir('esle2vis_entrada', $('#entrada').value));

  /* =================================================================== */
  /* Menú «Insertar»: el cuadro de herramientas                          */
  /* =================================================================== */
  const PLANTILLAS = {
    etiqueta: n => n + ' = etiqueta ("Texto", 20, 20)',
    boton: n => n + ' = boton ("Aceptar", 20, 60, 110, 32)',
    caja: n => n + ' = caja (20, 100, 160, 26)',
    casilla: n => n + ' = casilla ("Opción", 20, 140)',
    lista: n => n + ' = lista (20, 170, 160, 110)',
    desplegable: n => n + ' = desplegable (20, 170, 160, 30)',
    numero: n => n + ' = numero (20, 210, 120, 30)',
    progreso: n => n + ' = progreso (20, 250, 200, 22)',
    deslizador: n => n + ' = deslizador (20, 290, 200, 24)',
    lienzo: n => n + ' = lienzo (200, 20, 240, 180)'
  };
  const LETRA = {
    etiqueta: 'e', boton: 'b', caja: 'c', casilla: 'k',
    lista: 'li', desplegable: 'dp', numero: 'nu', progreso: 'pr',
    deslizador: 'd', lienzo: 'l'
  };
  const GLIFOS = {
    etiqueta: 'A', boton: 'B', caja: '▭', casilla: '☑',
    lista: '≡', desplegable: '▾', numero: '#', progreso: '▮',
    deslizador: '⇔', lienzo: '◨'
  };

  /* Las órdenes de dibujo no crean nada: se pegan tal cual, sobre el lienzo
     que ya exista en el programa. */
  const DIBUJO = [
    ['pluma', '✎', l => 'pluma (' + l + ', 0, 0, 0)'],
    ['relleno', '■', l => 'relleno (' + l + ', 220, 60, 60)'],
    ['grosor', '≡', l => 'grosor (' + l + ', 3)'],
    ['línea', '╱', l => 'linea (' + l + ', 10, 10, 200, 150)'],
    ['rectángulo', '▭', l => 'rectangulo (' + l + ', 20, 20, 120, 80)'],
    ['círculo', '○', l => 'circulo (' + l + ', 120, 100, 50)'],
    ['elipse', '⬭', l => 'elipse (' + l + ', 120, 100, 140, 80)'],
    ['punto', '·', l => 'punto (' + l + ', 60, 60)'],
    ['texto', 'T', l => 'texto_en (' + l + ', 30, 40, "Hola")'],
    ['borrar', '⌫', l => 'borrar_lienzo (' + l + ')']
  ];

  function nombreLibre(letra) {
    const texto = editor.getValue();
    for (let i = 1; i < 100; i++) {
      const n = letra + (i === 1 ? '' : i);
      if (!new RegExp('\\b' + n + '\\b').test(texto)) return n;
    }
    return letra + Date.now();
  }

  /* El nombre de la variable del lienzo, si el programa ya tiene uno. */
  function lienzoDelPrograma() {
    const m = /(\w+)\s*=\s*lienzo\s*\(/.exec(editor.getValue());
    return m ? m[1] : 'l';
  }

  function pegarLinea(linea, aviso) {
    const cur = editor.getCursor();
    const sangria = (/^\s*/.exec(editor.getLine(cur.line)) || [''])[0] || '   ';
    editor.replaceRange(linea + '\n' + sangria, cur);
    editor.focus();
    if (aviso) escribir(aviso, 'info');
    irA('ide');
  }

  function pegarControl(tipo) {
    const nombre = nombreLibre(LETRA[tipo]);
    pegarLinea(PLANTILLAS[tipo](nombre),
      'Se pegó el código de ' + tipo + '. Acordate de declarar «' + nombre + ' = 0» en var.\n');
  }

  /* El nombre del icono es el del control o el de la orden sin acentos:
     «línea» es linea.svg. Si el dibujo no está, queda la letra de siempre,
     que es lo que había antes de que hubiera iconos. */
  const clave = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  function ponerGlifo(caja, nombre, letra) {
    caja.className = 'glifo';
    if (window.VISUAL_ICONOS && VISUAL_ICONOS.poner(caja, clave(nombre))) {
      caja.classList.add('con-icono');
      return;
    }
    caja.textContent = letra || '·';
  }

  function botonHerramienta(nombre, glifo, texto, titulo, alTocar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn menu-item';
    b.title = titulo;
    const g = document.createElement('span');
    ponerGlifo(g, nombre, glifo);
    const t = document.createElement('span');
    t.textContent = texto;
    b.append(g, t);
    b.addEventListener('click', alTocar);
    return b;
  }

  (function pintarHerramientas() {
    const ul = $('#herramientas');
    for (const tipo of Object.keys(CTRL)) {
      ul.appendChild(botonHerramienta(tipo, GLIFOS[tipo] || '·',
        tipo[0].toUpperCase() + tipo.slice(1),
        'Pegar el código de ' + tipo, () => pegarControl(tipo)));
    }
    const ud = $('#herramientasDibujo');
    for (const [nombre, glifo, plantilla] of DIBUJO) {
      ud.appendChild(botonHerramienta(nombre, glifo, nombre[0].toUpperCase() + nombre.slice(1),
        'Pegar la orden ' + nombre, () => pegarLinea(plantilla(lienzoDelPrograma()))));
    }
  })();

  /* =================================================================== */
  /* Árbol de controles y propiedades                                    */
  /* =================================================================== */
  function seleccionar(id) {
    elegido = id;
    gui.controles.forEach((c, k) => c.el.classList.toggle('elegido', k === id));
    pintarArbol();
    pintarProps();
  }

  function pintarArbol() {
    const caja = $('#arbol');
    caja.replaceChildren();
    marcarVentana();
    $('#ctrlMini').textContent = gui.controles.size
      ? gui.controles.size + ' control(es)' : 'lo que creó el programa';
    if (!gui.controles.size) {
      const p = document.createElement('p');
      p.className = 'nota';
      p.textContent = 'Todavía no hay controles. Ejecutá el programa.';
      caja.appendChild(p);
      return;
    }
    const raiz = document.createElement('button');
    raiz.type = 'button';
    raiz.className = 'raiz';
    raiz.textContent = 'Form1';
    caja.appendChild(raiz);
    gui.controles.forEach((c, id) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hijo' + (id === elegido ? ' elegido' : '');
      const g = document.createElement('span');
      ponerGlifo(g, c.tipo, GLIFOS[c.tipo]);
      const n = document.createElement('span');
      n.textContent = c.tipo + ' ' + id;
      const t = document.createElement('span');
      t.className = 'tipo-ctrl';
      t.textContent = c.props.texto ? '«' + c.props.texto + '»' : '';
      b.append(g, n, t);
      b.addEventListener('click', () => seleccionar(id));
      caja.appendChild(b);
    });
  }

  /* Las propiedades se pueden tocar para probar: cambian el control que está
     en pantalla, no el programa. El código sigue mandando. */
  const EDITABLES = [
    ['texto', 'texto'], ['x', 'numero'], ['y', 'numero'],
    ['ancho', 'numero'], ['alto', 'numero']
  ];

  function pintarProps() {
    const caja = $('#props');
    caja.replaceChildren();
    const c = elegido !== null ? gui.controles.get(elegido) : null;
    if (!c) {
      const p = document.createElement('p');
      p.className = 'nota';
      p.textContent = 'Elegí un control de la ventana o de la lista para ver sus propiedades.';
      caja.appendChild(p);
      return;
    }
    const tabla = document.createElement('table');
    const fila = (nombre, valor) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td');
      a.textContent = nombre;
      const b = document.createElement('td');
      b.append(valor);
      tr.append(a, b);
      tabla.appendChild(tr);
    };
    fila('control', document.createTextNode(c.tipo + ' ' + elegido));

    for (const par of EDITABLES) {
      const prop = par[0], tipo = par[1];
      const inp = document.createElement('input');
      inp.type = tipo === 'numero' ? 'number' : 'text';
      inp.value = c.props[prop] === undefined ? '' : c.props[prop];
      inp.setAttribute('aria-label', prop + ' del control ' + elegido);
      inp.addEventListener('change', () => {
        const v = tipo === 'numero' ? Number(inp.value) || 0 : inp.value;
        if (prop === 'texto') gui.poner(elegido, 'texto', v);
        else if (prop === 'x' || prop === 'y') {
          gui.poner(elegido, 'posicion', {
            x: prop === 'x' ? v : c.props.x, y: prop === 'y' ? v : c.props.y
          });
        } else {
          gui.poner(elegido, 'tamano', {
            ancho: prop === 'ancho' ? v : c.props.ancho,
            alto: prop === 'alto' ? v : c.props.alto
          });
        }
      });
      fila(prop, inp);
    }
    caja.appendChild(tabla);
    const p = document.createElement('p');
    p.className = 'nota';
    p.textContent = 'Lo que cambies acá vale hasta la próxima ejecución. Para que quede, ' +
      'cambialo en el código.';
    caja.appendChild(p);
  }

  pintarArbol();
  pintarProps();

  /* =================================================================== */
  /* Curso                                                               */
  /* =================================================================== */
  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };
  let filtro = 'todos';
  let seleccionado = null;
  let ejercicioActivo = null;

  /* Lo que se pinta pasa por js/seguro.js: acá también entran guías de clase
     ajenas, con el enunciado y la pista que quien armó el enlace haya puesto. */
  const escapar = Seguro.escapar;

  function pintarLista() {
    const ol = $('#listaEjercicios');
    ol.replaceChildren();
    EJERCICIOS.filter(e => filtro === 'todos' || e.nivel === filtro).forEach(e => {
      const li = document.createElement('li');
      const hecho = !!progreso[e.id];
      li.className = (hecho ? 'hecho ' : '') + (seleccionado === e.id ? 'sel' : '');
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'curso-ejercicio';
      const marca = document.createElement('span');
      marca.className = 'marca-ok';
      marca.textContent = hecho ? '●' : '○';
      const texto = document.createElement('span');
      texto.className = 'curso-ej-texto';
      const tit = document.createElement('span');
      tit.className = 'tit';
      tit.textContent = e.titulo;
      const nivelSpan = document.createElement('span');
      const nivel = Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil');
      nivelSpan.className = 'curso-ej-nivel';
      nivelSpan.textContent = NIVELES[nivel] + (hecho ? ' · resuelto' : '');
      texto.append(tit, nivelSpan);
      boton.append(marca, texto);
      boton.addEventListener('click', () => mostrarEjercicio(e.id));
      li.appendChild(boton);
      ol.appendChild(li);
    });
  }

  /* Se busca .chip solo adentro de este panel: hay otros .chip en la página
     y tocarlos acá era un error que esperaba a pasar. */
  $('#filtros').addEventListener('click', ev => {
    const c = ev.target.closest('.chip');
    if (!c) return;
    filtro = c.dataset.nivel;
    $('#filtros').querySelectorAll('.chip').forEach(x => {
      const activa = x === c;
      x.classList.toggle('activa', activa);
      x.setAttribute('aria-pressed', String(activa));
    });
    pintarLista();
  });

  const ORD_M = ['el primer', 'el segundo', 'el tercer', 'el cuarto', 'el quinto',
    'el sexto', 'el séptimo', 'el octavo'];
  const ORD_F = ['la primera', 'la segunda', 'la tercera', 'la cuarta', 'la quinta',
    'la sexta', 'la séptima', 'la octava'];
  const FEMENINOS = new Set(['etiqueta', 'caja', 'casilla', 'lista']);
  const NOMBRE_CTRL = { boton: 'botón' };

  /* «la primera etiqueta», «el segundo botón». */
  function elDe(tipo, i) {
    const n = i || 0;
    const f = FEMENINOS.has(tipo);
    const o = (f ? ORD_F : ORD_M)[n] || ((f ? 'la número ' : 'el número ') + (n + 1));
    return o + ' ' + (NOMBRE_CTRL[tipo] || tipo);
  }

  /* Los pasos y las comprobaciones de una prueba, contados en castellano: el
     alumno tiene que poder saber qué se le va a pedir antes de escribir. */
  const CUENTA_PASO = {
    clic: a => 'clic en ' + elDe(a[0], a[1]),
    escribir: a => 'escribir «' + a[1] + '» en ' + elDe('caja', a[0]),
    marcar: a => (a[1] === false ? 'desmarcar ' : 'marcar ') + elDe('casilla', a[0]),
    elegir: a => 'elegir «' + a[1] + '» en ' + elDe('lista', a[0]),
    deslizar: a => 'poner ' + elDe('deslizador', a[0]) + ' en ' + a[1],
    raton: a => 'poner el puntero en (' + a[0] + ', ' + a[1] + ')'
  };

  const CUENTA_ESPERA = {
    ventana: a => 'la ventana es ' + Object.keys(a[0]).map(k => k + ' ' + a[0][k]).join(', '),
    hay: a => 'hay ' + a[1] + ' ' + (NOMBRE_CTRL[a[0]] || a[0]) + (a[1] === 1 ? '' : 's'),
    texto: a => elDe(a[0], a[1]) + ' dice «' + a[2] + '»',
    valor: a => elDe(a[0], a[1]) + ' vale ' + a[2],
    marcado: a => elDe('casilla', a[0]) + ' está ' + (a[1] ? 'marcada' : 'sin marcar'),
    items: a => 'la lista tiene ' + (a[1].length ? '«' + a[1].join('», «') + '»' : 'nada'),
    visible: a => elDe(a[0], a[1]) + ' está ' + (a[2] ? 'visible' : 'escondida'),
    habilitado: a => elDe(a[0], a[1]) + ' está ' + (a[2] ? 'habilitado' : 'deshabilitado'),
    posicion: a => elDe(a[0], a[1]) + ' está en (' + a[2] + ', ' + a[3] + ')',
    tamano: a => elDe(a[0], a[1]) + ' mide ' + a[2] + ' × ' + a[3],
    fondo: a => elDe(a[0], a[1]) + ' tiene el fondo rgb(' + a[2] + ', ' + a[3] + ', ' + a[4] + ')',
    color: a => elDe(a[0], a[1]) + ' tiene la letra rgb(' + a[2] + ', ' + a[3] + ', ' + a[4] + ')',
    mensajes: a => (a[0].length ? 'los mensajes son «' + a[0].join('», «') + '»' : 'no sale ningún mensaje'),
    dibujos: a => 'se dibujan ' + a[1] + ' ' + a[0] + (a[1] === 1 ? '' : 's'),
    dibujo: a => 'hay un ' + a[0] + ' (' + a[1].map(v => (typeof v === 'object' ? 'ese color' : v)).join(', ') + ')',
    salida: a => 'se imprime «' + a[0] + '»',
    cerrada: a => (a[0] === false ? 'la ventana sigue abierta' : 'la ventana se cierra sola')
  };

  const contar = (tabla, x) => (tabla[x[0]] ? tabla[x[0]](x.slice(1)) : x[0]);

  /* Cinco clics seguidos en el mismo botón se cuentan una vez: «5 veces: clic
     en el primer botón» se lee, la lista de cinco frases iguales no. */
  function comprimir(frases) {
    const r = [];
    for (const f of frases) {
      const ultimo = r[r.length - 1];
      if (ultimo && ultimo.texto === f) ultimo.veces++;
      else r.push({ texto: f, veces: 1 });
    }
    return r.map(x => (x.veces === 1 ? x.texto : x.veces + ' veces: ' + x.texto));
  }

  function mostrarEjercicio(id) {
    const e = EJERCICIOS.find(x => x.id === id);
    seleccionado = id;
    pintarLista();

    const casos = e.pruebas.map(p => {
      const pasos = comprimir((p.pasos || []).map(x => contar(CUENTA_PASO, x)));
      const esperas = (p.espera || []).map(x => contar(CUENTA_ESPERA, x));
      return '<tr><td>' + escapar(p.nombre) + '</td>' +
        '<td>' + (pasos.length ? escapar(pasos.join('; ')) : '(nada: se mira apenas se abre)') + '</td>' +
        '<td>' + escapar(esperas.join('; ')) + '</td></tr>';
    }).join('');

    $('#detalleEjercicio').innerHTML =
      '<span class="etq ' + Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil') + '">' +
      NIVELES[Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil')] + '</span>' +
      '<h2></h2>' +
      '<div class="enunciado">' + Seguro.html(e.enunciado) + '</div>' +
      '<div class="pista"><strong>Pista:</strong> ' + Seguro.html(e.pista) + '</div>' +
      '<div class="acciones">' +
      '<button class="btn primario" id="btnAbrirEjercicio" type="button">Abrir en el diseñador</button>' +
      (progreso[id] ? '<span class="nota">✔ Ya resolviste este ejercicio.</span>' : '') +
      '</div>' +
      '<div class="casos"><h3>Cómo se corrige</h3>' +
      '<p class="nota">ESLE2 abre tu programa una vez por caso, hace lo que dice la columna del ' +
      'medio y después revisa lo de la derecha.</p>' +
      '<table><tr><th>Caso</th><th>Qué se toca</th><th>Qué tiene que pasar</th></tr>' +
      casos + '</table></div>';
    $('#detalleEjercicio h2').textContent = e.titulo;
    $('#btnAbrirEjercicio').addEventListener('click', () => abrirEjercicio(e));
  }

  function abrirEjercicio(e) {
    if (historial) historial.registrar('previa', 'Antes de abrir «' + e.titulo + '»');
    detener();
    ejercicioActivo = e;
    const guardado = Guardado.leer('esle2vis_ej_' + e.id);
    editor.setValue(guardado || e.plantilla);
    $('#bannerTitulo').textContent = e.titulo + ' (' + NIVELES[e.nivel] + ')';
    $('#bannerEjercicio').classList.remove('oculto');
    limpiarSalida();
    estado('ejercicio cargado');
    irA('ide');
    editor.refresh();
    editor.focus();
  }

  function salirDeEjercicio() {
    ejercicioActivo = null;
    $('#bannerEjercicio').classList.add('oculto');
  }
  $('#btnSalirEjercicio').addEventListener('click', salirDeEjercicio);

  async function verificar() {
    const e = ejercicioActivo;
    if (!e) return;
    irA('ide');
    detener();
    limpiarSalida();
    estado('verificando…', 'corriendo');
    escribir('Verificando «' + e.titulo + '»…\n\n', 'info');

    try { compilar(); }
    catch (err) { mostrarError(err); return; }

    let todoBien = true;
    for (let i = 0; i < e.pruebas.length; i++) {
      const p = e.pruebas[i];
      const r = await VerificarVisual.correr(editor.getValue(), p);
      todoBien = todoBien && r.ok;
      escribir('Caso ' + (i + 1) + ' · ' + p.nombre + '  ', 'info');
      escribir(r.ok ? '✔ correcto\n' : '✘ incorrecto\n', r.ok ? 'ok' : 'err');
      if (!r.ok) r.fallos.forEach(f => escribir('   ' + f + '\n', 'err'));
    }

    if (stats) stats.registrar(e.id, todoBien);
    if (repaso && repasando === e.id) { repaso.registrar(e.id, todoBien); repasando = null; }

    if (todoBien) {
      escribir('\n¡Ejercicio resuelto! 🎉\n', 'ok');
      estado('ejercicio resuelto', 'ok');
      if (historial) historial.registrar('ejercicio', 'Resuelto: ' + e.titulo);
      if (window.Sonido) Sonido.tocar('logro');
      if (!progreso[e.id]) {
        progreso[e.id] = new Date().toISOString().slice(0, 10);
        guardarProgreso();
        if (window.Racha) Racha.registrar();
      }
      pintarLista();
      if (seleccionado === e.id) mostrarEjercicio(e.id);
    } else {
      escribir('\nTodavía no. Mirá los casos que fallaron y volvé a intentar.\n', 'err');
      estado('faltan casos', 'error');
      const avisos = SLE2VIS.revisar(editor.getValue());
      if (avisos.length) {
        escribir('\nPuede que esto te ayude:\n', 'info');
        avisos.forEach(a => escribir('línea ' + a.linea + ': ' + a.mensaje + '\n', 'aviso'));
      }
    }
    /* Después de anotar el progreso, para que el panel cuente este intento. */
    pintarEstadisticas();
    pintarRepaso();
  }
  $('#btnVerificar').addEventListener('click', verificar);

  /* ------------------- cómo venís y repaso espaciado ------------------- */
  const stats = window.Estadisticas ? Estadisticas.crear('esle2vis_intentos') : null;
  const repaso = window.Repaso ? Repaso.crear('esle2vis_repasos') : null;
  let repasando = null;          // id del ejercicio que se está repasando

  function pintarEstadisticas() {
    const caja = $('#panelStats');
    if (!caja || !stats) return;
    const r = Estadisticas.resumen(stats.datos(), EJERCICIOS, progreso);
    if (!r.intentos) { caja.classList.add('oculto'); return; }
    caja.classList.remove('oculto');

    const niveles = Object.entries(r.porNivel).filter(([, n]) => n.total)
      .map(([nombre, n]) => '<li><b>' + (NIVELES[nombre] || nombre) + '</b> ' + n.resueltos + ' de ' + n.total + '</li>')
      .join('');
    const costosos = r.costosos.length
      ? '<ul class="stats-lista">' + r.costosos.map(c => '<li>' + escapar(c.titulo) +
          ' <span class="nota">' + c.intentos + ' intento(s)' +
          (c.resuelto ? '' : ', sin resolver') + '</span></li>').join('') + '</ul>'
      : '';
    caja.innerHTML = '<h3>Cómo venís</h3><ul class="stats-niveles">' + niveles + '</ul>' +
      '<p class="nota">' + r.resueltos + ' de ' + r.total + ' resueltos · ' + r.intentos +
      ' verificación(es) · ' + r.intentosPorAcierto + ' intento(s) por ejercicio resuelto.</p>' +
      (r.atascado ? '<p class="stats-atascado">Donde más te trabaste: <strong>' +
        escapar(r.atascado.titulo) + '</strong> (' + r.atascado.intentos +
        ' intentos). Probá abrirlo y mirar la pista.</p>' : '') +
      (costosos ? '<h4>Los que más te costaron</h4>' + costosos : '');
  }

  function pintarRepaso() {
    const caja = $('#panelRepaso');
    if (!caja || !repaso || !stats) return;
    const lista = repaso.sugerencias(EJERCICIOS, progreso, stats.datos(), 3);
    caja.classList.toggle('oculto', !lista.length);
    if (!lista.length) return;
    caja.innerHTML = '<h3>Para repasar hoy</h3>' +
      '<p class="nota">Los resolviste hace unos días: rehacerlos de memoria es lo que los fija.</p>' +
      '<ul class="repaso-lista">' + lista.map(r =>
        '<li><button class="repaso-item" type="button" data-repasar="' + escapar(r.id) + '">' +
        escapar(r.titulo) + '</button> <span class="nota">hace ' + r.dias + ' día(s)' +
        (r.hechos ? ' · repasado ' + r.hechos + ' vez(ces)' : '') + '</span></li>').join('') + '</ul>';
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-repasar]');
    if (!b) return;
    const e = EJERCICIOS.find(x => x.id === b.dataset.repasar);
    if (!e) return;
    repasando = e.id;
    /* En un repaso se arranca de la plantilla: la gracia es rehacerlo. */
    Guardado.borrar('esle2vis_ej_' + e.id);
    abrirEjercicio(e);
    estado('repaso: rehacelo de memoria');
  });

  $('#btnReiniciar').addEventListener('click', () => {
    if (!confirm('¿Borrar todo tu progreso del curso Visual? No se puede deshacer.')) return;
    Object.keys(progreso).forEach(k => delete progreso[k]);
    guardarProgreso();
    if (stats) stats.borrar();
    pintarLista();
    pintarEstadisticas();
    pintarRepaso();
    if (seleccionado) mostrarEjercicio(seleccionado);
  });

  pintarLista();
  pintarProgreso();
  pintarEstadisticas();
  pintarRepaso();

  /* =================================================================== */
  /* Archivos, ejemplos y progreso portable                              */
  /* =================================================================== */
  function guardar() {
    const b = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'programa.slv';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  $('#btnGuardar').addEventListener('click', guardar);

  $('#btnNuevo').addEventListener('click', () => {
    if (!confirm('¿Empezar un programa nuevo? Se borra lo que hay en el editor.')) return;
    detener();
    salirDeEjercicio();
    editor.setValue('var\ninicio\n   ventana ("Mi programa", 400, 300)\n   \n   esperar_eventos ()\nfin\n');
    editor.setCursor({ line: 3, ch: 3 });
    editor.focus();
  });

  $('#btnAbrir').addEventListener('click', () => $('#archivo').click());
  $('#archivo').addEventListener('change', ev => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    if (!Seguro.cabe(f)) { alert(Seguro.AVISO_GRANDE); return; }
    const r = new FileReader();
    r.onload = () => { editor.setValue(String(r.result)); irA('ide'); };
    r.readAsText(f, 'utf-8');
  });

  $('#btnCompartir').addEventListener('click', async () => {
    if (!window.Compartir) return;
    const url = Compartir.enlace(editor.getValue(), '');
    const ok = await Compartir.copiar(url);
    escribir(ok ? 'Enlace copiado al portapapeles.\n' : 'No se pudo copiar el enlace.\n', ok ? 'ok' : 'err');
  });

  /* ------------------------ archivos en memoria ------------------------ */
  /* Los que usan set_stdin() y set_stdout(): viven en un Map y no tocan el
     disco hasta que alguien pulsa «Bajar». */
  function pintarArchivos() {
    const sel = $('#listaArchivos');
    const previo = sel.value;
    sel.replaceChildren();
    for (const nombre of archivos.keys()) sel.add(new Option(nombre, nombre));
    if (archivos.has(previo)) sel.value = previo;
    const vacio = archivos.size === 0;
    $('#sinArchivos').classList.toggle('oculto', !vacio);
    $('#contenidoArchivo').disabled = vacio;
    $('#contenidoArchivo').value = vacio ? '' : (archivos.get(sel.value) || '');
  }

  $('#btnArchivos').addEventListener('click', () => { pintarArchivos(); $('#dlgArchivos').showModal(); });
  $('#cerrarArchivos').addEventListener('click', () => $('#dlgArchivos').close());
  $('#listaArchivos').addEventListener('change', pintarArchivos);
  $('#contenidoArchivo').addEventListener('input', () => {
    const n = $('#listaArchivos').value;
    if (n) archivos.set(n, $('#contenidoArchivo').value);
  });
  $('#nuevoArchivo').addEventListener('click', () => {
    const n = prompt('Nombre del archivo:', 'datos.txt');
    if (!n) return;
    archivos.set(n, archivos.get(n) || '');
    pintarArchivos();
    $('#listaArchivos').value = n;
    $('#contenidoArchivo').value = archivos.get(n);
  });
  $('#borrarArchivo').addEventListener('click', () => {
    const n = $('#listaArchivos').value;
    if (n && confirm('¿Borrar «' + n + '»?')) { archivos.delete(n); pintarArchivos(); }
  });
  $('#subirArchivo').addEventListener('click', () => $('#archivoDeDisco').click());
  $('#archivoDeDisco').addEventListener('change', ev => {
    const files = Array.from(ev.target.files || []);
    ev.target.value = '';
    let quedan = files.length;
    for (const f of files) {
      if (!Seguro.cabe(f)) { alert(Seguro.AVISO_GRANDE); quedan--; continue; }
      const r = new FileReader();
      r.onload = () => { archivos.set(f.name, String(r.result)); if (!--quedan) pintarArchivos(); };
      r.readAsText(f, 'utf-8');
    }
  });
  $('#bajarArchivo').addEventListener('click', () => {
    const n = $('#listaArchivos').value;
    if (!n) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([archivos.get(n) || ''], { type: 'text/plain;charset=utf-8' }));
    a.download = n;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* -------------------- progreso portable ------------------------------ */
  $('#btnExportar').addEventListener('click', () => ProgresoESLE2.descargar());
  $('#btnImportar').addEventListener('click', () => $('#archivoProgreso').click());
  $('#archivoProgreso').addEventListener('change', ev => {
    const f = ev.target.files[0];
    ev.target.value = '';
    if (!f) return;
    if (!Seguro.cabe(f)) { alert(Seguro.AVISO_GRANDE); return; }
    const lector = new FileReader();
    lector.onload = () => {
      let sumados;
      try { sumados = ProgresoESLE2.importar(String(lector.result)); }
      catch (err) { alert('No se pudo importar: ' + err.message); return; }
      const vigente = ProgresoESLE2.leerJSON(COOKIE);
      Object.keys(vigente).forEach(k => { progreso[k] = vigente[k]; });
      pintarProgreso();
      pintarLista();
      alert('Listo: se sumaron ' + (sumados.vis || 0) + ' ejercicios del curso Visual.');
    };
    lector.readAsText(f, 'utf-8');
  });

  const sel = $('#selEjemplos');
  (window.VISUAL_EJEMPLOS || []).forEach((e, i) => sel.add(new Option(e.nombre, String(i))));
  sel.addEventListener('change', () => {
    const e = VISUAL_EJEMPLOS[Number(sel.value)];
    if (!e) return;
    detener();
    editor.setValue(e.codigo);
    sel.value = '';
    limpiarSalida();
    irA('ide');
    estado('ejemplo cargado');
  });

  /* =================================================================== */
  /* Lo que comparte con el resto de ESLE2                               */
  /* =================================================================== */
  if (window.Disposicion) Disposicion.iniciar($('.area'), { clave: 'esle2vis_disposicion' });

  if (window.Sonido) {
    Sonido.iniciar({
      leer: k => Guardado.leer(k),
      guardar: (k, v) => { try { Guardado.escribir(k, v); } catch (e) {} }
    });
    const btnSonido = $('#btnSonido');
    const pintarSonido = () => {
      const on = Sonido.activo();
      btnSonido.textContent = on ? '🔊' : '🔇';
      btnSonido.setAttribute('aria-pressed', String(on));
      const que = on ? 'Sonidos encendidos: tocá para apagarlos'
        : 'Sonidos apagados: tocá para encenderlos';
      btnSonido.setAttribute('aria-label', que);
      btnSonido.title = que;
    };
    btnSonido.addEventListener('click', () => { Sonido.alternar(); pintarSonido(); });
    pintarSonido();
  }

  const historial = window.HistorialUI ? HistorialUI.iniciar({
    clave: 'esle2vis_historial',
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    aplicar: (codigo, entradaTexto) => {
      editor.setValue(codigo);
      if (entradaTexto !== undefined) $('#entrada').value = entradaTexto;
      irA('ide');
      editor.focus();
    },
    estado
  }) : null;

  if (window.DiagramaUI)
    DiagramaUI.iniciar({ compilar: () => compilar(), mostrarError });
  DiagramaEditorUI.iniciar({
    codigo: () => editor.getValue(),
    ponerCodigo: c => editor.setValue(c),
    compilar: () => compilar(),
    mostrarError,
    estado
  });

  /* El simulador de memoria graba hasta que la ventana queda esperando: de ahí
     en adelante el programa no avanza solo, así que no hay más pasos que
     mostrar. Por eso el backend de mentira corta la grabación en listo(). */
  if (window.MemoriaUI) {
    MemoriaUI.iniciar({
      codigo: () => editor.getValue(),
      entrada: () => $('#entrada').value,
      compilar: fuente => compilar(fuente),
      ejecutar: (fuente, io2, opts) => {
        const falso = SLE2VIS.guiDeMentira();
        const listoOriginal = falso.listo;
        falso.listo = () => {
          listoOriginal();
          /* Con un setTimeout a propósito: esperar_eventos() llama a listo()
             justo ANTES de instalar el resolvedor de su espera, así que cortar
             en este mismo instante no cortaría nada y el programa quedaría
             colgado para siempre. */
          setTimeout(() => {
            if (opts.control && opts.control.detener) opts.control.detener();
          }, 0);
        };
        return SLE2VIS.ejecutar(fuente, io2, Object.assign({}, opts, { gui: falso }));
      },
      mostrarError
    });

    EscritorioUI.iniciar({
      codigo: () => editor.getValue(),
      entrada: () => $('#entrada').value,
      compilar: fuente => compilar(fuente),
      ejecutar: (fuente, io2, opts) => {
        const falso = SLE2VIS.guiDeMentira();
        const listoOriginal = falso.listo;
        falso.listo = () => {
          listoOriginal();
          /* Con un setTimeout a propósito: esperar_eventos() llama a listo()
             justo ANTES de instalar el resolvedor de su espera, así que cortar
             en este mismo instante no cortaría nada y el programa quedaría
             colgado para siempre. */
          setTimeout(() => {
            if (opts.control && opts.control.detener) opts.control.detener();
          }, 0);
        };
        return SLE2VIS.ejecutar(fuente, io2, Object.assign({}, opts, { gui: falso }));
      },
      mostrarError
    });
  }

  if (window.ProyectoUI) {
    ProyectoUI.iniciar({
      clave: 'esle2vis_proyecto',
      claveModo: 'esle2vis_explorador',
      ext: '.slv',
      proyecto: 'ESLE2 Visual',
      plantilla: 'var\ninicio\n   ventana ("Mi programa", 400, 300)\n   \n   esperar_eventos ()\nfin\n',
      editor,
      entrada: () => $('#entrada').value,
      aplicar: (codigo, entradaTexto) => {
        editor.setValue(codigo);
        $('#entrada').value = entradaTexto || '';
        irA('ide');
        editor.refresh();
      },
      estado: nombre => estado('abierto ' + nombre)
    });
  }

  /* ------------------------------ el alumno ---------------------------- */
  /* Quién está usando esta máquina. Sin esto, tres alumnos del laboratorio
     comparten avance, racha y código sin darse cuenta. */
  if (window.PerfilUI) PerfilUI.iniciar({ boton: $('#btnPerfil') });

  if (window.Presentacion) Presentacion.crear();
  if (window.Racha) Racha.pintar();
  if (window.Iconos) Iconos.pintar(document);

  /* ------------------------------ atajos ------------------------------- */
  document.addEventListener('keydown', ev => {
    /* Con la ventana a la vista, Escape la cierra y nada más: cortar el
       programa desde ahí sería una sorpresa fea. */
    if (ev.key === 'Escape' && dlgVentana.open) return;
    if (ev.key === 'Escape' && control) { detener(); return; }
    if (ev.key === 'V' && ev.ctrlKey && ev.shiftKey) { ev.preventDefault(); verVentana(true); return; }
    if (ev.key === 'F9' && !control) { ev.preventDefault(); ejecutar(true); }
    if (ev.key === 'F10' && depurador.enPausa) { ev.preventDefault(); depurador.paso(); }
    if (ev.key === 'F8' && depurador.activo) { ev.preventDefault(); $('#btnContinuar').click(); }
  });

  /* ---------------------------- modo examen ---------------------------- */
  /* Corrige un ejercicio sin escribir nada en pantalla ni abrir la ventana:
     lo usa la corrección automática al entregar. Es la misma verificación que
     el botón «Verificar», sin la parte que informa. */
  async function evaluarEnSilencio(codigo, pruebas) {
    try { SLE2VIS.compilar(codigo); }
    catch (e) { return { pasadas: 0, total: pruebas.length, error: e.message }; }

    let pasadas = 0;
    for (const prueba of pruebas) {
      try {
        const r = await VerificarVisual.correr(codigo, prueba);
        if (r.ok) pasadas++;
      } catch (e) { /* ese caso queda como no pasado */ }
    }
    return { pasadas, total: pruebas.length };
  }

  const examen = window.Examen ? Examen.crear({
    lenguaje: 'ESLE2 Visual',
    ejercicios: () => EJERCICIOS,
    codigoActual: () => editor.getValue(),
    evaluar: evaluarEnSilencio,
    abrirEjercicio(e, codigo) {
      ejercicioActivo = e;
      editor.setValue(codigo);
      $('#bannerTitulo').textContent = e.titulo + ' (examen)';
      $('#bannerEjercicio').classList.remove('oculto');
      limpiarSalida();
      estado('en examen');
      irA('ide');
      editor.refresh();
      editor.focus();
    },
    alCambiarModo(activo) {
      document.body.classList.toggle('en-examen', activo);
      /* Durante el examen no se ofrecen ni el curso ni las soluciones. */
      document.querySelectorAll('.pest[data-vista="curso"]')
        .forEach(x => x.classList.toggle('oculto', activo));
      if (!activo) { salirDeEjercicio(); irA('curso'); }
    }
  }) : null;

  if (examen && $('#btnExamen')) {
    $('#btnExamen').addEventListener('click', () => examen.abrir());
    /* Lo escrito se anota al cambiar de ejercicio y también al cerrar. */
    window.addEventListener('beforeunload', () => examen.anotarActual());
  }

  /* ------------------------------ modo aula ---------------------------- */
  /* Una guía repartida por enlace, igual que en el IDE. Del lado del profesor
     es el diálogo que arma el enlace; del lado del alumno, la lista del curso
     pasa a ser esa guía hasta que decida salir.

     En Visual esto pesa más que en el IDE: la unidad de interfaces es donde el
     profesor más necesita repartir una consigna paso a paso, y hasta ahora era
     la única parte del curso donde no se podía. */
  /* Entregar la guía: junta lo que el alumno escribió en cada ejercicio, lo
     corrige acá mismo con los casos de cada uno, y baja el archivo para el
     profesor. Mismo formato que una entrega de examen, así se abren las dos en
     el mismo visor y sale la misma planilla. */
  async function entregarLaGuia(alumno) {
    if (!guiaAula) throw new Error('no hay ninguna guía abierta');
    const abierto = ejercicioActivo;
    if (abierto) Guardado.escribir('esle2vis_ej_' + abierto.id, editor.getValue());

    const hechos = [];
    for (const e of EJERCICIOS) {
      const codigo = Guardado.leer('esle2vis_ej_' + e.id) || '';
      let r = { pasadas: 0, total: (e.pruebas || []).length };
      /* Sin nada escrito no se corre nada: correr la plantilla vacía tarda y
         da lo mismo que no haberla corrido. */
      if (codigo.trim()) {
        try { r = await evaluarEnSilencio(codigo, e.pruebas || []); }
        catch (err) { r = { pasadas: 0, total: (e.pruebas || []).length, error: String(err.message || err) }; }
      }
      hechos.push(Object.assign({ id: e.id, titulo: e.titulo, nivel: e.nivel, codigo }, r));
    }

    const entrega = Aula.armarEntrega({ guia: guiaAula, alumno, ejercicios: hechos });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(entrega, null, 2)],
      { type: 'application/json' }));
    a.download = Aula.nombreDeEntrega(guiaAula, alumno);
    a.click();
    URL.revokeObjectURL(a.href);

    const resueltos = hechos.filter(x => x.total > 0 && x.pasadas === x.total).length;
    estado('guía entregada: ' + resueltos + ' de ' + hechos.length + ' resueltos', 'ok');
    alert('Guía entregada.\n\n' + resueltos + ' de ' + hechos.length +
      ' ejercicios resueltos.\n\nSe bajó el archivo: mandáselo a tu profesor.');
    return entrega;
  }

  const aulaUI = window.AulaUI ? AulaUI.crear({
    lenguaje: 'ESLE2 Visual',
    catalogo: () => CATALOGO,
    propios: () => [],       // «Mis ejercicios» todavía no está en Visual
    entregar: alumno => entregarLaGuia(alumno),
    verEntregas: () => examen && examen.verEntregas()
  }) : null;

  if (aulaUI && $('#btnAula')) {
    $('#btnAula').addEventListener('click', () => aulaUI.abrir());
  }

  function pintarAula() {
    if (!aulaUI) return;
    aulaUI.banner(guiaAula, faltanDeLaGuia, $('.lista-ejercicios'), salirDelAula);
    /* Dentro de una guía los filtros por nivel no vienen al caso: la lista no
       es el curso, son los ejercicios que mandó el profesor. */
    $('#filtros').classList.toggle('oculto', !!guiaAula);
    if ($('#btnExamen')) $('#btnExamen').classList.toggle('oculto', !!guiaAula);
  }

  function salirDelAula() {
    guiaAula = null;
    faltanDeLaGuia = [];
    seleccionado = null;
    history.replaceState(null, '', location.pathname);
    recargarEjercicios();
    pintarAula();
    pintarLista();
    pintarEstadisticas();
    pintarRepaso();
    estado('saliste de la guía');
  }

  /* El enlace de una guía manda sobre todo lo demás: se lee al arrancar y
     abre el curso ya puesto en esa guía. */
  (async function entrarSiHayGuia() {
    if (!window.Aula) return;
    const g = await Aula.leerUrl();
    if (!g) return;
    guiaAula = g;
    recargarEjercicios();
    pintarAula();
    pintarLista();
    irA('curso');
    estado('guía: ' + g.n, 'ok');
  })();

  estado('listo');
})();

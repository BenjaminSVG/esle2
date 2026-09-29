/* ESLE2 — interfaz: editor, pantalla, archivos, curso y progreso en cookies. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const { EJEMPLOS } = window.CURSO;

  /* Los del curso más los que haya creado el usuario (js/mis-ejercicios.js).
     Salvo que se haya entrado por el enlace de una guía: ahí la lista es esa
     guía y nada más, que es de lo que se trata el modo aula. */
  let EJERCICIOS = window.CURSO.EJERCICIOS.slice();
  let guiaAula = null;          // la guía abierta por enlace, o null
  let faltanDeLaGuia = [];      // los suyos que ya no están en el curso

  function recargarEjercicios() {
    const propios = window.MisEjercicios ? misEjercicios.cargar() : [];
    if (guiaAula && window.Aula) {
      const r = window.Aula.resolver(guiaAula, window.CURSO.EJERCICIOS.concat(propios));
      EJERCICIOS = r.ejercicios;
      faltanDeLaGuia = r.faltan;
      return;
    }
    EJERCICIOS = window.CURSO.EJERCICIOS.concat(propios);
  }

  /* =================================================================== */
  /* Progreso en cookies                                                 */
  /* =================================================================== */
  const COOKIE = 'esle2_progreso';

  function leerCookie(nombre) {
    const p = document.cookie.split('; ').find(c => c.startsWith(nombre + '='));
    return p ? decodeURIComponent(p.slice(nombre.length + 1)) : '';
  }
  function grabarCookie(nombre, valor, dias) {
    const f = new Date(Date.now() + dias * 864e5).toUTCString();
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${f}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  }

  const progreso = (() => {
    try { return JSON.parse(leerCookie(COOKIE) || '{}'); } catch (e) { return {}; }
  })();

  function guardarProgreso() { grabarCookie(COOKIE, JSON.stringify(progreso), 365); pintarProgreso(); }
  function resueltos() { return EJERCICIOS.filter(e => progreso[e.id]).length; }

  function pintarProgreso() {
    const n = resueltos(), t = EJERCICIOS.length;
    $('#progresoTexto').textContent = `${n} / ${t}`;
    $('#progresoBarra').style.width = (t ? (n / t) * 100 : 0) + '%';
  }

  /* =================================================================== */
  /* Editor                                                              */
  /* =================================================================== */
  /* El resaltado vive en js/modo-sle2.js */

  const CODIGO_INICIAL = `/*
   Bienvenido a ESLE2.
   Escribí tu programa y pulsá "Ejecutar" (o Ctrl + Enter).
*/
programa saludo
var
   nombre = ""
inicio
   imprimir ("Como te llamas? ")
   leer (nombre)
   imprimir ("\\nHola ", nombre, ", programemos en SLE2!")
fin
`;

  const editor = CodeMirror.fromTextArea($('#codigo'), {
    mode: 'sle2',
    theme: 'esle2',
    lineNumbers: true,
    indentUnit: 3,
    tabSize: 3,
    indentWithTabs: false,
    matchBrackets: true,
    lineWrapping: false,
    extraKeys: {
      'Ctrl-Enter': () => ejecutar(),
      'Cmd-Enter': () => ejecutar(),
      'Ctrl-S': () => { descargar(); return false; },
      Tab: cm => cm.execCommand('insertSoftTab'),
      /* Tab escribe sangría, así que alguien que solo usa el teclado se
         queda atrapado adentro del editor sin este escape: Ctrl + M le saca
         el foco, como en cualquier editor de código accesible. */
      'Ctrl-M': cm => { cm.getInputField().blur(); return false; }
    }
  });

  /* Ajustar texto: el Alt + Z de Visual Studio Code. */
  AjustarTexto.iniciar({ editor: editor, boton: $('#btnAjustar'), clave: 'esle2_ajustar' });

  /* Cuando el mismo error de sintaxis aparece cinco veces seguidas en dos
     minutos, se dice algo. Va en la salida y no en un cartel: no interrumpe. */
  const animo = AnimoUI.iniciar({
    clave: 'esle2_animo',
    consola: $('#consola'),
    alaLinea: n => { editor.setCursor({ line: n - 1, ch: 0 }); editor.focus(); }
  });

  /* Modo flexible: el único compilador de la página (ver js/flexible-ui.js).
     En estricto se comporta igual que siempre. */
  const Flex = FlexibleUI.iniciar({
    editor: editor, boton: $('#btnFlexible'), clave: 'esle2_flexible',
    estricto: fuente => SLE2.compilar(fuente),
    informar: errores => {
      if (!errores.length) return;
      diagnostico({
        tipo: 'aviso',
        titulo: errores.length === 1 ? 'Modo flexible: 1 error de sintaxis'
                                     : 'Modo flexible: ' + errores.length + ' errores de sintaxis',
        mensaje: 'El programa se compiló igual, con un agujero en cada línea marcada. '
               + 'Corre hasta el primero de esos agujeros.',
        sugerencia: 'Para exigir el programa entero, apagá el modo flexible en el menú Ver.'
      });
      for (const e of errores)
        diagnostico({ titulo: 'Error de compilación', linea: e.linea, mensaje: e.mensaje, sugerencia: e.sugerencia });
    }
  });
  const compilar = fuente => Flex.compilar(fuente);


  editor.setValue(Guardado.leer('esle2_codigo') || CODIGO_INICIAL);
  // El área de texto que usa CodeMirror por debajo también necesita nombre.
  editor.getInputField().setAttribute('aria-label', 'Editor de programas SLE2');
  // El área con scroll del editor se anuncia y se alcanza con el teclado.
  editor.getScrollerElement().setAttribute('tabindex', '0');
  editor.getScrollerElement().setAttribute('role', 'region');
  editor.getScrollerElement().setAttribute('aria-label', 'Editor de programas SLE2. Ctrl + M saca el foco del editor.');
  editor.on('change', () => Guardado.escribir('esle2_codigo', editor.getValue()));

  /* Si la URL trae un programa compartido, ese gana. */
  const compartido = window.Compartir && Compartir.leer();
  if (compartido) {
    editor.setValue(compartido.codigo);
    Compartir.limpiarUrl();
  }
  editor.on('cursorActivity', () => {
    const c = editor.getCursor();
    $('#posCursor').textContent = `${c.line + 1} : ${c.ch + 1}`;
  });
  $('#entrada').value = (compartido && compartido.entrada) || Guardado.leer('esle2_entrada') || '';
  $('#entrada').addEventListener('input', e => Guardado.escribir('esle2_entrada', e.target.value));
  $('#argumentos').value = Guardado.leer('esle2_args') || '';
  $('#argumentos').addEventListener('input', e => Guardado.escribir('esle2_args', e.target.value));

  let marcaLinea = null;
  function limpiarMarca() {
    if (marcaLinea === null) return;
    editor.removeLineClass(marcaLinea, 'background', 'linea-error');
    marcaLinea = null;
  }
  /* Las líneas que el programa no pisó. Se marcan al costado y no pintando
     el fondo: encima del código, cualquier tinte le baja el contraste a los
     números y a las palabras clave. */
  let sinCorrer = [];
  function limpiarSinCorrer() {
    for (const l of sinCorrer) editor.removeLineClass(l, 'wrap', 'linea-muerta');
    sinCorrer = [];
  }
  function marcarSinCorrer(lineas) {
    limpiarSinCorrer();
    for (const l of lineas) {
      if (l >= 1 && l <= editor.lineCount()) {
        sinCorrer.push(editor.addLineClass(l - 1, 'wrap', 'linea-muerta'));
      }
    }
  }

  function marcarLinea(l) {
    limpiarMarca();
    if (l >= 1 && l <= editor.lineCount()) marcaLinea = editor.addLineClass(l - 1, 'background', 'linea-error');
  }

  /* =================================================================== */
  /* Pantalla del programa                                               */
  /* Modelo de texto con cursor y colores, como la pantalla del SLE      */
  /* original: hace posible cls(), set_curpos() y set_color().           */
  /* =================================================================== */
  const { Pantalla, Lienzo, crearDiagnostico } = window.ESLE2Consola;

  const consola = $('#consola');
  const pantalla = new Pantalla($('#pantalla'), consola);
  const diagnostico = crearDiagnostico(consola, l => editor.getLine(l - 1), () => editor.lineCount());
  /* Si el navegador no deja guardar —ventana privada, o el almacén lleno— se
     dice una sola vez. Callarlo sería dejar que alguien trabaje una hora
     creyendo que su programa está a salvo. */
  Guardado.alFallar(texto => diagnostico({
    tipo: 'aviso', titulo: 'No se está guardando tu programa', mensaje: texto,
    sugerencia: 'Archivo → Guardar baja un archivo a tu computadora.'
  }));


  /* El lienzo aparece solo la primera vez que el programa dibuja algo, y se
     vuelve a ocultar al arrancar la ejecución siguiente: así nunca queda un
     dibujo de una corrida anterior detrás de un programa que no dibuja nada. */
  const lienzo = new Lienzo($('#lienzoCanvas'), () => $('#panelLienzo').classList.remove('oculto'));
  function ocultarLienzo() {
    lienzo.visible = false;
    lienzo.limpiar(0);
    $('#panelLienzo').classList.add('oculto');
  }

  function escribir(texto, clase) {
    const n = document.createElement('span');
    if (clase) n.className = clase;
    n.textContent = texto;
    consola.appendChild(n);
    consola.scrollTop = consola.scrollHeight;
  }
  function limpiarConsola() {
    [...consola.children].forEach(c => { if (c.id !== 'pantalla') c.remove(); });
    pantalla.limpiar();
  }
  $('#btnLimpiar').addEventListener('click', () => { limpiarConsola(); limpiarMarca(); });

  /* ------------------------- entrada interactiva ---------------------- */
  /* Toda espera del programa (datos, teclas, pausas) se registra acá para
     que el botón "Detener" pueda cortarla: si no, el intérprete queda
     bloqueado en una promesa que nadie resuelve. */
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
    p.catch(() => {});   // la cancelación siempre queda "atendida"
    return p;
  }

  function cancelarEsperas() {
    [...esperas].forEach(e => e.cancelar());
  }

  function pedirLinea() {
    return esperar(terminar => {
      const campo = document.createElement('input');
      campo.className = 'entrada-viva';
      campo.setAttribute('aria-label', 'Entrada de datos del programa');
      pantalla.escribir('▸ ');
      $('#pantalla').after(campo);
      consola.scrollTop = consola.scrollHeight;
      campo.focus();
      campo.addEventListener('keydown', ev => {
        if (ev.key !== 'Enter') return;
        const v = campo.value;
        pantalla.escribir(v + '\n');
        terminar(v);
      });
      return () => campo.remove();
    });
  }

  let teclaPendiente = null;
  function esperarTecla(ms) {
    return esperar(terminar => {
      teclaPendiente = terminar;
      consola.focus();
      const reloj = ms > 0 ? setTimeout(() => terminar(0), ms) : null;
      return () => { teclaPendiente = null; if (reloj) clearTimeout(reloj); };
    });
  }
  consola.addEventListener('keydown', ev => {
    if (!teclaPendiente) return;
    ev.preventDefault();
    const cod = ev.key.length === 1 ? ev.key.charCodeAt(0) : (ev.key === 'Enter' ? 13 : ev.key === 'Escape' ? 27 : 0);
    teclaPendiente(cod);
  });

  /* ---------------------- archivos en memoria ------------------------- */
  const archivos = new Map();

  function refrescarArchivos() {
    const sel = $('#listaArchivos');
    const previo = sel.value;
    sel.innerHTML = '';
    [...archivos.keys()].sort().forEach(n => sel.add(new Option(n, n)));
    if (archivos.has(previo)) sel.value = previo;
    else if (sel.options.length) sel.selectedIndex = 0;
    $('#contenidoArchivo').value = sel.value ? archivos.get(sel.value) : '';
    $('#sinArchivos').classList.toggle('oculto', archivos.size > 0);
    $('#btnArchivos').textContent = archivos.size ? `Archivos (${archivos.size})` : 'Archivos…';
  }

  $('#btnArchivos').addEventListener('click', () => { refrescarArchivos(); $('#dlgArchivos').showModal(); });
  $('#cerrarArchivos').addEventListener('click', () => $('#dlgArchivos').close());
  $('#listaArchivos').addEventListener('change', ev => {
    $('#contenidoArchivo').value = archivos.get(ev.target.value) || '';
  });
  $('#contenidoArchivo').addEventListener('input', ev => {
    const n = $('#listaArchivos').value;
    if (n) archivos.set(n, ev.target.value);
  });
  $('#nuevoArchivo').addEventListener('click', () => {
    const n = prompt('Nombre del archivo:', 'datos.txt');
    if (!n) return;
    archivos.set(n, '');
    refrescarArchivos();
    $('#listaArchivos').value = n;
    $('#contenidoArchivo').value = '';
    $('#contenidoArchivo').focus();
  });
  /* Archivos de verdad: subir un .txt del disco y bajar lo que el programa escribió. */
  $('#subirArchivo').addEventListener('click', () => $('#archivoDeDisco').click());
  $('#archivoDeDisco').addEventListener('change', async ev => {
    const elegidos = [...ev.target.files];
    ev.target.value = '';
    for (const f of elegidos) {
      const texto = await f.text();
      archivos.set(f.name, texto);
    }
    if (!elegidos.length) return;
    refrescarArchivos();
    $('#listaArchivos').value = elegidos[elegidos.length - 1].name;
    $('#contenidoArchivo').value = archivos.get($('#listaArchivos').value) || '';
    escribir(`[${elegidos.length} archivo(s) cargados: ${elegidos.map(f => f.name).join(', ')}]
`, 'info');
  });

  $('#bajarArchivo').addEventListener('click', () => {
    const nombre = $('#listaArchivos').value;
    if (!nombre) { alert('No hay ningún archivo para bajar.'); return; }
    const b = new Blob([archivos.get(nombre) || ''], { type: 'text/plain;charset=utf-8' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(b);
    el.download = nombre;
    el.click();
    URL.revokeObjectURL(el.href);
  });

  $('#borrarArchivo').addEventListener('click', () => {
    const n = $('#listaArchivos').value;
    if (!n || !confirm(`¿Borrar "${n}"?`)) return;
    archivos.delete(n);
    refrescarArchivos();
  });

  /* ---------------------------- objeto IO ----------------------------- */
  function argumentos() {
    const txt = $('#argumentos').value.trim();
    if (!txt) return [];
    return (txt.match(/"[^"]*"|'[^']*'|\S+/g) || []).map(s => s.replace(/^["']|["']$/g, ''));
  }

  function crearIO(textoEntrada, interactivo, salida) {
    const lineas = textoEntrada.length ? textoEntrada.replace(/\r/g, '').split('\n') : [];
    const io = {
      archivos,
      argumentos: argumentos(),
      imprimir(t) { salida ? salida.push(t) : pantalla.escribir(t); },
      limpiar() { salida ? (salida.length = 0) : pantalla.limpiar(); },
      finEntrada() { return lineas.length === 0; },
      async leerLinea() {
        if (lineas.length) return lineas.shift();
        return interactivo ? await pedirLinea() : null;
      }
    };
    if (!salida) {
      // Solo la ejecución normal habla con la pantalla; la corrección de
      // ejercicios trabaja con el texto plano.
      io.setColor = (f, b) => pantalla.setColor(f, b);
      io.getColor = () => pantalla.getColor();
      io.setCurpos = (l, c) => pantalla.setCurpos(l, c);
      io.getCurpos = () => pantalla.getCurpos();
      io.getScrsize = () => pantalla.getScrsize();
      io.beep = (f, ms) => pitar(f, ms);
      io.leerTecla = ms => esperarTecla(ms);
      io.pixel = (x, y, c) => lienzo.pixel(x, y, c);
      io.linea = (x1, y1, x2, y2, c) => lienzo.linea(x1, y1, x2, y2, c);
      io.rect = (x, y, w, h, c) => lienzo.rect(x, y, w, h, c);
      io.circulo = (x, y, r, c) => lienzo.circulo(x, y, r, c);
      io.limpiarLienzo = c => lienzo.limpiar(c);
      io.lienzoAncho = () => lienzo.ancho;
      io.lienzoAlto = () => lienzo.alto;
    } else {
      io.beep = async () => {};
      io.leerTecla = async () => 0;
    }
    return io;
  }

  let audio = null;
  function pitar(frecuencia, ms) {
    return esperar(terminar => {
      const dur = Math.max(0, Math.min(60000, ms));
      let osc = null;
      try {
        if (frecuencia > 0) {
          audio = audio || new (window.AudioContext || window.webkitAudioContext)();
          osc = audio.createOscillator();
          const gan = audio.createGain();
          osc.frequency.value = frecuencia;
          gan.gain.value = 0.06;
          osc.connect(gan).connect(audio.destination);
          osc.start();
          osc.stop(audio.currentTime + Math.max(0.05, dur / 1000));
        }
      } catch (e) { osc = null; /* sin audio disponible: solo se hace la pausa */ }
      const reloj = setTimeout(terminar, dur);
      return () => {
        clearTimeout(reloj);
        try { if (osc) osc.stop(); } catch (e) { /* ya se detuvo */ }
      };
    });
  }

  /* =================================================================== */
  /* Errores y recomendaciones                                           */
  /* =================================================================== */
  function estado(txt, clase) {
    const e = $('#estado');
    e.textContent = txt;
    e.className = 'estado ' + (clase || '');
  }

  const esInterrupcion = e => e instanceof SLE2.SLError && /interrumpida/.test(e.message);

  function mostrarError(e) {
    if (esInterrupcion(e)) {
      escribir('\n[ejecución detenida por vos]\n', 'info');
      estado('detenido');
      return;
    }
    Sonido.tocar('error');
    if (!(e instanceof SLE2.SLError)) {
      diagnostico({ titulo: 'Error interno de ESLE2', mensaje: e.message, sugerencia: 'Contactá al responsable del sitio con el programa que lo provocó.' });
      estado('error interno', 'error');
      return;
    }
    const compil = e.fase === 'compilacion';
    diagnostico({
      titulo: compil ? 'Error de compilación' : 'Error de ejecución',
      linea: e.linea,
      mensaje: e.message,
      sugerencia: e.sugerencia
    });
    estado(compil ? 'error de compilación' : 'error de ejecución', 'error');
    if (compil) animo.registrar({ error: e.message, linea: e.linea });
    if (e.linea) {
      marcarLinea(e.linea);
      editor.setCursor({ line: e.linea - 1, ch: 0 });
    }
  }

  function mostrarAvisos(avisos) {
    avisos.forEach(a => diagnostico({
      tipo: 'aviso', titulo: 'Aviso', linea: a.linea, mensaje: a.mensaje, sugerencia: a.sugerencia
    }));
    return avisos.length;
  }

  function mostrarSugerencias(lista) {
    lista.forEach(s => diagnostico({
      tipo: 'estilo', titulo: 'Estilo', linea: s.linea, mensaje: s.mensaje, sugerencia: s.sugerencia
    }));
    return lista.length;
  }

  /* =================================================================== */
  /* Ejecución                                                           */
  /* =================================================================== */
  let control = null;

  function revisarCodigo() {
    limpiarConsola();
    limpiarMarca();
    limpiarSinCorrer();
    let ast;
    try {
      ast = compilar();
    } catch (e) {
      mostrarError(e);
      return null;
    }
    const avisos = SLE2.revisar(editor.getValue());
    // Lo de arriba busca posibles errores; lo de abajo, cómo escribirlo mejor.
    const sugerencias = window.Estilo ? Estilo.revisar(ast) : [];

    if (avisos.length) {
      escribir(`La sintaxis está bien. Hay ${avisos.length} cosa(s) para revisar:\n`, 'info');
      mostrarAvisos(avisos);
    }
    if (sugerencias.length) {
      escribir(`\n${sugerencias.length} sugerencia(s) de estilo (el programa anda igual):\n`, 'info');
      mostrarSugerencias(sugerencias);
    }
    if (!avisos.length && !sugerencias.length) {
      escribir('Sin errores ni observaciones. El programa está listo para ejecutarse.\n', 'ok');
      estado('revisado', 'ok');
      Sonido.tocar('exito');
    } else {
      estado(`${avisos.length + sugerencias.length} observación(es)`, 'corriendo');
    }
  }
  $('#btnCompilar').addEventListener('click', revisarCodigo);

  /* Ejecutar y grabar son la MISMA corrida: grabando, el intérprete además
     avisa antes de cada sentencia y el objeto io queda envuelto para anotar
     lo que se le pide a la pantalla. Un segundo camino de ejecución sería un
     segundo lugar donde los errores se comportan distinto. */
  /* «No funciona y no sé por qué» casi siempre es que el «si» nunca entró o
     que el ciclo no dio ni una vuelta. El alumno mira una línea bien escrita
     sin sospechar que el programa jamás pasó por ahí, porque nada se lo dice.
     Solo se habla cuando hay algo que decir: felicitar por lo normal es ruido. */
  function avisarCobertura(ast, contador) {
    let r;
    try { r = Cobertura.resumir(contador.cuentas(), Cobertura.lineasDeSentencias(ast)); }
    catch (e) { return; }
    const frase = Cobertura.frase(r);
    if (frase) {
      marcarSinCorrer(r.nunca);
      escribir('\n' + frase + ' Están marcadas al costado.\n', 'aviso');
    }
    /* Y si una línea se repitió muchísimas veces, también se dice. El
       programa terminó bien: no es un error, es algo que vale la pena mirar. */
    const esfuerzo = Cobertura.fraseEsfuerzo(r);
    if (esfuerzo) escribir('\n' + esfuerzo + '\n', 'aviso');
  }

  async function ejecutar(paso_a_paso, grabando) {
    if (control) return;
    limpiarConsola();
    limpiarMarca();
    ocultarLienzo();
    viaje.cerrar();                 // la película anterior ya no corresponde

    let ast;
    try {
      ast = compilar();
    } catch (e) {
      mostrarError(e);
      return;
    }

    const antesArchivos = archivos.size;
    if (paso_a_paso) { depurador.encender(); botonesPaso(true); }
    estado(paso_a_paso ? 'paso a paso' : grabando ? 'grabando…' : 'ejecutando…', 'corriendo');
    $('#btnDetener').classList.remove('oculto');
    $('#btnEjecutar').disabled = true;
    control = {};
    const grabadora = grabando ? Viaje.crearGrabadora({ control }) : null;
    /* Contar qué líneas corren es una suma por sentencia: no se nota al lado
       de lo que cuesta ejecutarla, así que va siempre y no en un modo aparte
       que haya que acordarse de prender. */
    const contador = window.Cobertura && !paso_a_paso && !grabando
      ? Cobertura.crearContador() : null;
    const t0 = performance.now();
    let fallo = null, interp = null;
    try {
      /* Grabando, la entrada NO es interactiva: el programa corre entero de
         una, así que nadie puede contestarle. Si se le acaban los datos corta
         con el mismo error de siempre, y lo grabado hasta ahí igual sirve. */
      const io = crearIO($('#entrada').value, !grabando);
      interp = await SLE2.ejecutar(ast, grabadora ? grabadora.envolverIO(io) : io,
        grabadora
          ? { control, depurador: grabadora.hook, alRetornar: grabadora.alRetornar }
          : { control, depurador: contador
              ? (l, i) => { contador.hook(l); return depurador.hook(l, i); }
              : depurador.hook });
      if (contador) avisarCobertura(ast, contador);
      const ms = Math.round(performance.now() - t0);
      escribir(`\n[programa terminado en ${ms} ms]\n`, 'info');
      estado('terminado', 'ok');
      historial.registrar('ejecucion', 'Anduvo');
      Sonido.tocar('exito');
    } catch (e) {
      fallo = e;
      mostrarError(e);
    } finally {
      control = null;
      depurador.terminar();
      botonesPaso(false);
      /* Después de que el depurador limpió lo suyo: si no, su terminar()
         esconde el panel de variables que la película acaba de abrir. */
      if (grabadora) viaje.mostrar(grabadora.cerrar(fallo, interp));
      teclaPendiente = null;
      cancelarEsperas();                                   // red de seguridad
      consola.querySelectorAll('.entrada-viva').forEach(c => c.remove());
      $('#btnDetener').classList.add('oculto');
      $('#btnEjecutar').disabled = false;
      if (archivos.size !== antesArchivos || archivos.size) refrescarArchivos();
      if (archivos.size > antesArchivos)
        escribir(`[el programa escribió ${archivos.size - antesArchivos} archivo(s); mirá el botón "Archivos"]\n`, 'info');
    }

    // Ante un error, las recomendaciones suelen explicar la causa de fondo.
    if (fallo instanceof SLE2.SLError && fallo.fase !== 'compilacion') {
      const avisos = SLE2.revisar(editor.getValue());
      if (avisos.length) {
        escribir('\nOtras cosas que conviene revisar:\n', 'info');
        mostrarAvisos(avisos);
      }
    }
  }

  $('#btnEjecutar').addEventListener('click', () => ejecutar(false));

  /* --------------------------- depurador ------------------------------ */
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

  /* --------------- viajar en el tiempo, enfoque, en vivo -------------- */
  const viaje = ViajeUI.iniciar({
    editor,
    pantalla, lienzo,
    panelVars: $('#panelVars'),
    varsCuerpo: $('#varsCuerpo'),
    area: document.querySelector('.area'),
    estado: t => estado(t),
    /* Al cerrar la película, la pantalla vuelve a mostrar lo que el programa
       dejó de verdad: si no, quedaría congelada en el paso que se estaba
       mirando, que ya no es el resultado de nada. */
    alTerminar() { estado('listo'); }
  });
  $('#btnGrabar').addEventListener('click', () => ejecutar(false, true));

  EnfoqueUI.iniciar({ editor, boton: $('#btnEnfoque') });
  VivoUI.transmitir({ editor, boton: $('#btnVivo'), estado });

  function botonesPaso(visibles) {
    $('#btnPaso').classList.toggle('oculto', !visibles);
    $('#btnContinuar').classList.toggle('oculto', !visibles);
    document.querySelector('.columna').classList.toggle('depurando', visibles);
  }

  $('#btnDepurar').addEventListener('click', () => ejecutar(true));
  $('#btnPaso').addEventListener('click', () => depurador.paso());
  $('#btnContinuar').addEventListener('click', () => {
    depurador.apagar(true);
    botonesPaso(false);
    estado('ejecutando…', 'corriendo');
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'F9' && !control) { ev.preventDefault(); ejecutar(true); }
    if (ev.key === 'F10' && depurador.enPausa) { ev.preventDefault(); depurador.paso(); }
    if (ev.key === 'F8' && depurador.activo) { ev.preventDefault(); $('#btnContinuar').click(); }
  });


  function detener() {
    if (!control) return;
    if (control.detener) control.detener();   // corta en el próximo paso del intérprete
    cancelarEsperas();                        // …y despierta al programa si está esperando
  }
  $('#btnDetener').addEventListener('click', detener);
  // Escape también detiene, incluso con el foco en el campo de datos.
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && control) { ev.preventDefault(); detener(); }
  });

  /* --------------------------- archivos .sl --------------------------- */
  function descargar() {
    const b = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'programa.sl';
    a.click();
    URL.revokeObjectURL(a.href);
  }
  $('#btnGuardar').addEventListener('click', descargar);

  /* ------------------- traducción a JavaScript y Python ------------------ */
  const idiomaC = clave => {
    const L = TraductorC.LENGUAJES[clave];
    return {
      titulo: 'El mismo programa, en ' + L.nombre,
      archivo: L.archivo,
      corre: L.corre,
      traducir: (ast, opts) => TraductorC.traducir(ast, Object.assign({ lenguaje: clave }, opts))
    };
  };

  const IDIOMAS = {
    js: {
      titulo: 'El mismo programa, en JavaScript',
      archivo: 'programa.js',
      corre: 'node programa.js',
      traducir: (ast, opts) => TraductorJS.aJS(ast, opts)
    },
    py: {
      titulo: 'El mismo programa, en Python',
      archivo: 'programa.py',
      corre: 'python programa.py',
      traducir: (ast, opts) => TraductorPY.aPython(ast, opts)
    },
    /* Los cuatro lenguajes de llaves salen del mismo traductor: comparten
       toda la lógica y se diferencian en el vocabulario (ver js/traducir-c.js). */
    java: idiomaC('java'),
    c: idiomaC('c'),
    cpp: idiomaC('cpp'),
    cs: idiomaC('cs')
  };
  let idioma = IDIOMAS.js;

  function traducir(cual) {
    idioma = IDIOMAS[cual];
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }

    const { codigo, avisos } = idioma.traducir(ast, { entrada: $('#entrada').value });
    $('#tituloTraduccion').textContent = idioma.titulo;
    $('#notaTraduccion').innerHTML =
      'Traducción del programa que tenés en el editor. Los vectores conservan los índices desde 1 ' +
      '(la casilla 0 queda sin usar) y va una copia de las subrutinas de SLE2 que hagan falta, así el ' +
      'archivo corre tal cual con <code>' + idioma.corre + '</code>.';
    $('#codigoTraducido').textContent = codigo;
    $('#avisosTraduccion').textContent = avisos.length
      ? `Hay ${avisos.length} cosa(s) que el traductor no supo pasar; están marcadas con TODO en el código.`
      : '';
    $('#dlgTraduccion').showModal();
  }

  $('#btnTraducir').addEventListener('click', () => traducir('js'));
  $('#btnTraducirPy').addEventListener('click', () => traducir('py'));
  $('#btnTraducirJava').addEventListener('click', () => traducir('java'));
  $('#btnTraducirC').addEventListener('click', () => traducir('c'));
  $('#btnTraducirCpp').addEventListener('click', () => traducir('cpp'));
  $('#btnTraducirCs').addEventListener('click', () => traducir('cs'));
  $('#btnCerrarJS').addEventListener('click', () => $('#dlgTraduccion').close());

  /* ---------- diagrama de flujo y disposición de los paneles ---------- */
  window.addEventListener('esle2:disposicion', () => editor.refresh());
  DiagramaUI.iniciar({ compilar: () => compilar(), mostrarError });
  DiagramaEditorUI.iniciar({
    codigo: () => editor.getValue(),
    ponerCodigo: c => editor.setValue(c),
    compilar: () => compilar(),
    mostrarError,
    estado
  });
  Disposicion.iniciar($('.area'));
  /* --------------------------- micro-sonidos --------------------------- */
  Sonido.iniciar({
    leer: k => Guardado.leer(k),
    guardar: (k, v) => { try { Guardado.escribir(k, v); } catch (e) {} }
  });
  const btnSonido = $('#btnSonido');
  function pintarSonido() {
    const on = Sonido.activo();
    btnSonido.textContent = on ? '🔊' : '🔇';
    btnSonido.setAttribute('aria-pressed', String(on));
    const que = on ? 'Sonidos encendidos: tocá para apagarlos'
                   : 'Sonidos apagados: tocá para encenderlos';
    btnSonido.setAttribute('aria-label', que);
    btnSonido.title = que;
  }
  btnSonido.addEventListener('click', () => { Sonido.alternar(); pintarSonido(); });
  pintarSonido();

  /* ------------------- explorador de archivos (apagado) ---------------- */
  const aplicarAlEditor = (codigo, entrada) => {
    editor.setValue(codigo);
    $('#entrada').value = entrada || '';
    Guardado.escribir('esle2_entrada', entrada || '');
    editor.refresh();
  };
  const proyecto = ProyectoUI.iniciar({
    clave: 'esle2_proyecto',
    claveModo: 'esle2_explorador',
    ext: '.sl',
    proyecto: 'ESLE2',
    editor,
    entrada: () => $('#entrada').value,
    aplicar: aplicarAlEditor,
    estado: nombre => estado('abierto ' + nombre)
  });

  const historial = HistorialUI.iniciar({
    clave: 'esle2_historial',
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    aplicar: (codigo, entrada) => {
      editor.setValue(codigo);
      if (entrada !== undefined) { $('#entrada').value = entrada; Guardado.escribir('esle2_entrada', entrada); }
      editor.focus();
    },
    estado
  });

  if (window.VersionesUI && proyecto) {
    VersionesUI.iniciar({
      variante: 'clasico',
      claveVersiones: 'esle2_versiones',
      proyecto, historial, editor,
      entrada: () => $('#entrada').value,
      ext: '.sl',
      aplicar: aplicarAlEditor,
      estado
    });
  }

  /* Si el alumno instaló ESLE2 como aplicación y abre un .sl o un
     .esle2carpeta con «Abrir con» o doble clic, el navegador arranca acá con
     ese archivo en vez de vacía. Sin instalar, PwaArchivos.disponible() da
     false y esto no hace nada. */
  if (window.PwaArchivos) {
    PwaArchivos.escuchar({
      extensiones: ['.sl', '.esle2carpeta'],
      binarias: ['.esle2carpeta'],
      maxBytes: Math.max(Seguro.LIMITES.archivo, (window.Carpeta && Carpeta.LIMITES.archivo) || 0),
      onArchivo: (nombre, contenido) => {
        if (nombre.toLowerCase().endsWith('.esle2carpeta')) {
          if (!proyecto || !proyecto.encendido()) {
            alert('Para traer una carpeta primero tenés que prender el explorador de archivos (menú Ver).');
            return;
          }
          proyecto.importarCarpetaExterna(contenido);
          return;
        }
        if (proyecto && proyecto.encendido()) {
          const r = proyecto.abrirExterno(nombre, contenido);
          if (r.error) { alert(r.error); return; }
        } else {
          historial.registrar('previa', 'Antes de abrir ' + nombre);
          editor.setValue(contenido);
        }
        salirDeEjercicio();
        estado('abierto ' + nombre);
      },
      onError: msg => alert(msg)
    });
  }

  AutocompletarUI.iniciar(editor, { poo: false });
  MemoriaUI.iniciar({
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    compilar: fuente => compilar(fuente),
    ejecutar: SLE2.ejecutar,
    mostrarError
  });

  EscritorioUI.iniciar({
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    compilar: fuente => compilar(fuente),
    ejecutar: SLE2.ejecutar,
    mostrarError
  });
  $('#btnCopiarJS').addEventListener('click', async () => {
    const t = $('#codigoTraducido').textContent;
    try { await navigator.clipboard.writeText(t); estado('código copiado', 'ok'); }
    catch (e) { prompt('Copiá el código:', t); }
  });
  $('#btnBajarJS').addEventListener('click', () => {
    const b = new Blob([$('#codigoTraducido').textContent], { type: 'text/plain;charset=utf-8' });
    const el = document.createElement('a');
    el.href = URL.createObjectURL(b);
    el.download = idioma.archivo;
    el.click();
    URL.revokeObjectURL(el.href);
  });

  $('#btnCompartir').addEventListener('click', async () => {
    const url = Compartir.enlace(editor.getValue(), $('#entrada').value);
    const ok = await Compartir.copiar(url);
    if (ok) estado('enlace copiado', 'ok');
  });
  $('#btnNuevo').addEventListener('click', () => {
    if (!confirm('¿Borrar el programa actual del editor?')) return;
    historial.registrar('previa', 'Antes de empezar de cero');
    editor.setValue('var\ninicio\n   \nfin\n');
    editor.setCursor({ line: 2, ch: 3 });
    editor.focus();
  });
  $('#btnAbrir').addEventListener('click', () => $('#archivo').click());
  $('#archivo').addEventListener('change', ev => {
    const f = ev.target.files[0];
    if (!f) return;
    if (!Seguro.cabe(f)) { alert(Seguro.AVISO_GRANDE); return; }
    const r = new FileReader();
    r.onload = () => {
      historial.registrar('previa', 'Antes de abrir ' + f.name);
      editor.setValue(String(r.result));
      salirDeEjercicio();
    };
    r.readAsText(f, 'utf-8');
    ev.target.value = '';
  });

  /* -------------------------- plantillas ------------------------------ */
  /* A diferencia de "Ejemplos" —un programa completo para leer— esto pega un
     esqueleto de pocas líneas en el cursor, sin tocar el resto: sirve tanto
     para arrancar de la hoja en blanco como para meter un "si" en medio de
     algo que ya se estaba escribiendo. */
  const selPlantillas = $('#selPlantillas');
  (window.PLANTILLAS || []).forEach((p, i) => selPlantillas.add(new Option(p.nombre, String(i))));
  selPlantillas.addEventListener('change', () => {
    const p = (window.PLANTILLAS || [])[Number(selPlantillas.value)];
    selPlantillas.value = '';
    if (!p) return;
    const cur = editor.getCursor();
    const sangria = (/^\s*/.exec(editor.getLine(cur.line)) || [''])[0];
    editor.replaceRange(p.codigo.replace(/\n/g, '\n' + sangria), cur);
    editor.focus();
    estado('plantilla pegada', 'ok');
  });

  /* --------------------------- ejemplos ------------------------------ */
  const sel = $('#selEjemplos');
  EJEMPLOS.forEach((e, i) => sel.add(new Option(e.nombre, String(i))));
  sel.addEventListener('change', () => {
    const e = EJEMPLOS[Number(sel.value)];
    if (!e) return;
    historial.registrar('previa', 'Antes de cargar el ejemplo «' + e.nombre + '»');
    editor.setValue(e.codigo);
    $('#entrada').value = e.entrada;
    Guardado.escribir('esle2_entrada', e.entrada);
    salirDeEjercicio();
    sel.value = '';
    limpiarConsola();
    limpiarMarca();
    estado('ejemplo cargado');
  });

  /* =================================================================== */
  /* Vistas                                                              */
  /* =================================================================== */
  $('#nav').addEventListener('click', ev => {
    const b = ev.target.closest('.pest');
    if (!b || b.tagName === 'A') return;          // los enlaces navegan solos
    document.querySelectorAll('.pest').forEach(p => p.classList.toggle('activa', p === b));
    document.querySelectorAll('.vista').forEach(v => v.classList.toggle('activa', v.id === 'vista-' + b.dataset.vista));
    if (b.dataset.vista === 'ide') editor.refresh();
  });
  const irA = vista => document.querySelector(`.pest[data-vista="${vista}"]`).click();

  /* =================================================================== */
  /* Curso                                                               */
  /* =================================================================== */
  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };
  let filtro = 'todos';
  let seleccionado = null;
  let ejercicioActivo = null;

  function pintarLista() {
    const ol = $('#listaEjercicios');
    ol.innerHTML = '';
    EJERCICIOS.filter(e => filtro === 'todos' || e.nivel === filtro).forEach(e => {
      const li = document.createElement('li');
      const hecho = !!progreso[e.id];
      li.className = (hecho ? 'hecho ' : '') + (seleccionado === e.id ? 'sel' : '');
      const nivel = Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil');
      li.innerHTML = `<button type="button" class="curso-ejercicio">
                      <span class="marca-ok">${hecho ? '●' : '○'}</span>
                      <span class="curso-ej-texto">
                        <span class="tit"></span>
                        <span class="curso-ej-nivel">${NIVELES[nivel]}${hecho ? ' · resuelto' : ''}</span>
                      </span>
                    </button>`;
      li.querySelector('.tit').textContent = e.titulo;
      li.querySelector('.curso-ejercicio').addEventListener('click', () => mostrarEjercicio(e.id));
      ol.appendChild(li);
    });
  }

  /* Se busca .chip solo adentro de este panel: el de «Mis ejercicios» y el
     del examen tienen sus propios .chip, y tocarlos acá era un error que
     esperaba a pasar. */
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

  /* Todo lo que se pinta pasa por js/seguro.js. El enunciado y la pista de un
     ejercicio del curso son nuestros, pero los de una guía de clase o de «Mis
     ejercicios» vienen de un enlace que cualquiera pudo armar, y terminan en
     esta misma pantalla. */
  const escapar = Seguro.escapar;
  const nivelDe = e => Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil');

  function mostrarEjercicio(id) {
    const e = EJERCICIOS.find(x => x.id === id);
    seleccionado = id;
    pintarLista();
    const casos = (e.pruebas || []).map(p => `<tr>
        <td>${p.entrada ? escapar(p.entrada) : '(sin datos)'}</td>
        <td>${escapar(p.salida)}</td></tr>`).join('');
    $('#detalleEjercicio').innerHTML = `
      <span class="etq ${nivelDe(e)}">${NIVELES[nivelDe(e)]}</span>
      <h2></h2>
      <div class="enunciado">${Seguro.html(e.enunciado)}</div>
      ${e.pista ? `<div class="pista"><strong>Pista:</strong> ${Seguro.html(e.pista)}</div>` : ''}
      <div class="acciones">
        <button class="btn primario" id="btnAbrirEjercicio">Abrir en el IDE</button>
        ${progreso[id] ? '<span class="nota">✔ Ya resolviste este ejercicio.</span>' : ''}
        ${progreso[id] && window.OtraForma
          ? '<button class="btn" id="btnOtraForma" title="Ver cómo lo resolvió la cátedra">Otra forma de resolverlo…</button>'
          : ''}
      </div>
      <div class="casos">
        <h3>Casos de prueba</h3>
        <table><tr><th>Entrada</th><th>Salida esperada</th></tr>${casos}</table>
      </div>`;
    $('#detalleEjercicio h2').textContent = e.titulo;
    $('#btnAbrirEjercicio').addEventListener('click', () => abrirEjercicio(e));
    /* «Otra forma»: solo aparece si el ejercicio ya está resuelto. Antes de
       resolverlo sería el botón de copiar, y un curso con botón de copiar no
       enseña nada. */
    const btnOtra = $('#btnOtraForma');
    if (btnOtra) {
      btnOtra.addEventListener('click', async () => {
        btnOtra.disabled = true;
        const antes = btnOtra.textContent;
        btnOtra.textContent = 'buscando…';
        try {
          const mio = Guardado.leer('esle2_ej_' + e.id)
            || (ejercicioActivo && ejercicioActivo.id === e.id ? editor.getValue() : '');
          await otraForma.mostrar(e, mio);
        } catch (err) {
          estado(err.message || 'no se pudo abrir', 'error');
        } finally {
          btnOtra.disabled = false;
          btnOtra.textContent = antes;
        }
      });
    }
  }

  function abrirEjercicio(e, codigoInicial) {
    historial.registrar('previa', 'Antes de abrir «' + e.titulo + '»');
    ejercicioActivo = e;
    const guardado = Guardado.leer('esle2_ej_' + e.id);
    editor.setValue(codigoInicial !== undefined ? codigoInicial : (guardado || e.plantilla || ''));
    /* Un ejercicio sin casos de prueba no debería existir, pero uno que llegó
       en una guía puede venir así: abrirlo tiene que dejar la entrada vacía,
       no tirar el curso abajo. */
    const primero = (e.pruebas && e.pruebas[0]) || { entrada: '' };
    $('#entrada').value = primero.entrada;
    Guardado.escribir('esle2_entrada', primero.entrada);
    $('#bannerTitulo').textContent = `${e.titulo} (${NIVELES[e.nivel]})`;
    $('#bannerEjercicio').classList.remove('oculto');
    limpiarConsola();
    limpiarMarca();
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

  editor.on('change', () => {
    if (ejercicioActivo) Guardado.escribir('esle2_ej_' + ejercicioActivo.id, editor.getValue());
  });

  /* --------------------------- verificación --------------------------- */
  function normalizar(t) {
    return t.replace(/\r/g, '').split('\n')
      .map(l => l.trim().replace(/[ \t]+/g, ' '))
      .filter(l => l.length)
      .join('\n');
  }

  async function verificar() {
    const e = ejercicioActivo;
    if (!e) return;
    limpiarConsola();
    limpiarMarca();
    estado('verificando…', 'corriendo');
    escribir(`Verificando «${e.titulo}»…\n\n`, 'info');

    let ast;
    try {
      ast = compilar();
    } catch (err) { mostrarError(err); return; }

    let todoBien = true;
    for (let i = 0; i < e.pruebas.length; i++) {
      const p = e.pruebas[i];
      const salida = [];
      const ctrl = {};
      control = ctrl;
      let error = null;
      try {
        await SLE2.ejecutar(ast, crearIO(p.entrada, false, salida),
          { control: ctrl, maxPasos: 8000000, archivos: new Map() });
      } catch (err) {
        error = err;
      } finally {
        control = null;
      }
      const obtenido = normalizar(salida.join(''));
      const esperado = normalizar(p.salida);
      const ok = !error && obtenido === esperado;
      todoBien = todoBien && ok;

      escribir(`Caso ${i + 1}  `, 'info');
      escribir(ok ? '✔ correcto\n' : '✘ incorrecto\n', ok ? 'ok' : 'err');
      if (!ok) {
        escribir(`  entrada:  ${p.entrada.replace(/\n/g, ' ⏎ ') || '(sin datos)'}\n`, 'info');
        escribir(`  esperado: ${esperado.replace(/\n/g, ' ⏎ ')}\n`, 'info');
        if (error) mostrarError(error);
        else escribir(`  obtenido: ${obtenido.replace(/\n/g, ' ⏎ ') || '(nada)'}\n`, 'err');
      }
    }

    stats.registrar(e.id, todoBien);
    if (repasando === e.id) { repaso.registrar(e.id, todoBien); repasando = null; }

    if (todoBien) {
      escribir('\n¡Ejercicio resuelto! 🎉\n', 'ok');
      estado('ejercicio resuelto', 'ok');
      historial.registrar('ejercicio', 'Resuelto: ' + e.titulo);
      Sonido.tocar('logro');
      if (!progreso[e.id]) { progreso[e.id] = new Date().toISOString().slice(0, 10); guardarProgreso(); }
      if (window.Racha) Racha.registrar();     // suma un día a la racha, como mucho una vez por día
      pintarLista();
      if (seleccionado === e.id) mostrarEjercicio(e.id);
    } else {
      escribir('\nTodavía no. Revisá los casos que fallaron y volvé a intentar.\n', 'err');
      estado('faltan casos', 'error');
      const avisos = SLE2.revisar(editor.getValue());
      if (avisos.length) {
        escribir('\nPuede que esto te ayude:\n', 'info');
        mostrarAvisos(avisos);
      }
    }
    pintarEstadisticas();   // después de anotar el progreso, para que cuente este intento
    pintarRepaso();
  }
  $('#btnVerificar').addEventListener('click', verificar);


  /* ------------------- progreso portable (exportar / importar) --------- */
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
      catch (e) { alert('No se pudo importar: ' + e.message); return; }
      // Las cookies ya cambiaron; hay que releerlas para pintar la lista.
      const vigente = ProgresoESLE2.leerJSON(ProgresoESLE2.COOKIES.sle2);
      Object.keys(vigente).forEach(k => { progreso[k] = vigente[k]; });
      pintarProgreso();
      pintarLista();
      if (seleccionado) mostrarEjercicio(seleccionado);
      alert('Progreso importado: ' + sumados.sle2 + ' ejercicio(s) de SLE2 y ' +
            sumados.poo + ' de ESLE2 POO.');
    };
    lector.readAsText(f, 'utf-8');
  });


  /* ---------------------------- modo examen ---------------------------- */
  /* Corre las pruebas de un ejercicio sin escribir nada en pantalla: lo usa
     la corrección automática al entregar un examen. */
  async function evaluarEnSilencio(codigo, pruebas) {
    let ast;
    try { ast = compilar(codigo); }
    catch (e) { return { pasadas: 0, total: pruebas.length, error: e.message }; }

    let pasadas = 0;
    for (const p of pruebas) {
      const salida = [];
      try {
        await SLE2.ejecutar(ast, crearIO(p.entrada, false, salida),
          { maxPasos: 4000000, archivos: new Map() });
        if (normalizar(salida.join('')) === normalizar(p.salida)) pasadas++;
      } catch (e) { /* ese caso queda como no pasado */ }
    }
    return { pasadas, total: pruebas.length };
  }

  const examen = Examen.crear({
    lenguaje: 'SLE2',
    ejercicios: () => EJERCICIOS,
    codigoActual: () => editor.getValue(),
    evaluar: evaluarEnSilencio,
    abrirEjercicio(e, codigo) {
      ejercicioActivo = e;
      editor.setValue(codigo);
      $('#entrada').value = e.pruebas[0].entrada;
      $('#bannerTitulo').textContent = e.titulo + ' (examen)';
      $('#bannerEjercicio').classList.remove('oculto');
      limpiarConsola();
      limpiarMarca();
      estado('en examen');
      irA('ide');
      editor.refresh();
      editor.focus();
    },
    alCambiarModo(activo) {
      document.body.classList.toggle('en-examen', activo);
      // Durante el examen no se ofrecen ni el curso ni las soluciones.
      document.querySelectorAll('.pest[data-vista="curso"]').forEach(p => p.classList.toggle('oculto', activo));
      if (!activo) { salirDeEjercicio(); irA('curso'); }   // al terminar, de vuelta al curso
    }
  });
  $('#btnExamen').addEventListener('click', () => examen.abrir());
  // Lo escrito se anota al cambiar de ejercicio y también al cerrar la página.
  window.addEventListener('beforeunload', () => examen.anotarActual());


  /* -------------------------- estadísticas ---------------------------- */
  const stats = Estadisticas.crear('esle2_intentos');

  /* Panel con lo que se puede saber de tus intentos: se muestra en la vista
     del curso cuando todavía no elegiste ningún ejercicio. */
  function pintarEstadisticas() {
    const caja = document.querySelector('#panelStats');
    if (!caja) return;
    const r = Estadisticas.resumen(stats.datos(), EJERCICIOS, progreso);
    if (!r.intentos) { caja.classList.add('oculto'); return; }
    caja.classList.remove('oculto');

    const niveles = Object.entries(r.porNivel)
      .filter(([, n]) => n.total)
      .map(([nombre, n]) => `<li><b>${NIVELES[nombre] || nombre}</b> ${n.resueltos} de ${n.total}</li>`).join('');
    const costosos = r.costosos.length
      ? '<ul class="stats-lista">' + r.costosos.map(c =>
          `<li>${escapar(c.titulo)} <span class="nota">${c.intentos} intento(s)${c.resuelto ? '' : ', sin resolver'}</span></li>`).join('') + '</ul>'
      : '';
    caja.innerHTML = `
      <h3>Cómo venís</h3>
      <ul class="stats-niveles">${niveles}</ul>
      <p class="nota">${r.resueltos} de ${r.total} resueltos · ${r.intentos} verificación(es) ·
         ${r.intentosPorAcierto} intento(s) por ejercicio resuelto.</p>
      ${r.atascado ? `<p class="stats-atascado">Donde más te trabaste: <strong>${escapar(r.atascado.titulo)}</strong>
         (${r.atascado.intentos} intentos). Probá abrirlo y mirar la pista.</p>` : ''}
      ${costosos ? '<h4>Los que más te costaron</h4>' + costosos : ''}`;
  }


  /* --------------------- proyección y repaso -------------------------- */
  /* ------------------------------ el alumno ---------------------------- */
  /* Quién está usando esta máquina. Sin esto, tres alumnos del laboratorio
     comparten avance, racha y código sin darse cuenta. */
  if (window.PerfilUI) PerfilUI.iniciar({ boton: $('#btnPerfil') });

  const proyeccion = Presentacion.crear();
  const repaso = Repaso.crear('esle2_repasos');
  let repasando = null;          // id del ejercicio que se está repasando

  function pintarRepaso() {
    const caja = document.querySelector('#panelRepaso');
    if (!caja) return;
    const lista = repaso.sugerencias(EJERCICIOS, progreso, stats.datos(), 3);
    caja.classList.toggle('oculto', !lista.length);
    if (!lista.length) return;
    caja.innerHTML = '<h3>Para repasar hoy</h3>' +
      '<p class="nota">Los resolviste hace unos días: rehacerlos de memoria es lo que los fija.</p>' +
      '<ul class="repaso-lista">' + lista.map(r =>
        `<li><button class="repaso-item" data-repasar="${escapar(r.id)}">${escapar(r.titulo)}</button>
           <span class="nota">hace ${r.dias} día(s)${r.hechos ? ' · repasado ' + r.hechos + ' vez(ces)' : ''}</span></li>`
      ).join('') + '</ul>';
  }

  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-repasar]');
    if (!b) return;
    const e = EJERCICIOS.find(x => x.id === b.dataset.repasar);
    if (!e) return;
    repasando = e.id;
    // En un repaso se arranca de la plantilla: la gracia es rehacerlo, no releerlo.
    abrirEjercicio(Object.assign({}, e), e.plantilla);
    estado('repaso: rehacelo de memoria');
  });

  $('#btnReiniciar').addEventListener('click', () => {
    if (!confirm('¿Borrar todo tu progreso guardado?')) return;
    Object.keys(progreso).forEach(k => delete progreso[k]);
    guardarProgreso();
    stats.borrar();
    repaso.borrar();
    pintarLista();
    pintarEstadisticas();
    pintarRepaso();
    if (seleccionado) mostrarEjercicio(seleccionado);
  });


  /* --------------------- ejercicios propios --------------------------- */
  const misEjercicios = MisEjercicios.crear({
    clave: 'esle2_mis_ej',
    lenguaje: 'SLE2',
    alCambiar() {
      recargarEjercicios();
      pintarProgreso();
      pintarLista();
      // Si estaba abierto uno que se borró, se vuelve a la lista.
      if (seleccionado && !EJERCICIOS.some(e => e.id === seleccionado)) seleccionado = null;
      if (seleccionado) mostrarEjercicio(seleccionado);
    }
  });
  $('#btnMisEj').addEventListener('click', () => misEjercicios.abrir());

  /* ------------------------------ modo aula --------------------------- */
  /* Una guía repartida por enlace. Del lado del profesor es el diálogo que
     arma ese enlace; del lado del alumno, la lista del curso pasa a ser la
     guía hasta que decida salir de ella. */
  /* Entregar la guía: junta lo que el alumno escribió en cada ejercicio, lo
     corrige acá mismo con los casos de cada uno, y baja el archivo para el
     profesor. Mismo formato que una entrega de examen, así se abren las dos en
     el mismo visor y sale la misma planilla. */
  async function entregarLaGuia(alumno) {
    if (!guiaAula) throw new Error('no hay ninguna guía abierta');
    const abierto = ejercicioActivo;
    if (abierto) Guardado.escribir('esle2_ej_' + abierto.id, editor.getValue());

    const hechos = [];
    for (const e of EJERCICIOS) {
      const codigo = Guardado.leer('esle2_ej_' + e.id) || '';
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

  /* Comparar con la solución de la cátedra, después de resolver. Las
     soluciones se piden recién al tocar el botón: son 14 KB que no tiene por
     qué bajar quien nunca los va a mirar. */
  const otraForma = window.OtraForma ? OtraForma.iniciar({}) : null;

  const aulaUI = AulaUI.crear({
    lenguaje: 'SLE2',
    catalogo: () => window.CURSO.EJERCICIOS,
    propios: () => (window.MisEjercicios ? misEjercicios.cargar() : []),
    entregar: alumno => entregarLaGuia(alumno),
    verEntregas: () => examen.verEntregas()
  });
  $('#btnAula').addEventListener('click', () => aulaUI.abrir());

  /* Programar en grupo. El paquete que lo hace posible pesa 214 KB y se trae
     recién al abrir el diálogo: es lo único del sitio que necesita internet,
     y no tiene por qué pagarlo quien no lo usa. */
  JuntosUI.iniciar({
    editor: editor,
    boton: $('#btnJuntos'),
    estado: (t, c) => estado(t, c)
  });

  /* Batallas de código. Usa la misma sala de Yjs que «programar en grupo»,
     pero acá NO viaja el código de nadie: solo «terminé, en tantos segundos».
     Corrige cada máquina con los casos de prueba del ejercicio. */
  DueloUI.iniciar({
    boton: $('#btnDuelo'),
    ejercicios: () => EJERCICIOS.filter(e => e.pruebas && e.pruebas.length),
    abrir: e => abrirEjercicio(e),
    codigoActual: () => editor.getValue(),
    evaluar: (codigo, pruebas) => evaluarEnSilencio(codigo, pruebas),
    estado: (t, c) => estado(t, c)
  });

  function pintarAula() {
    aulaUI.banner(guiaAula, faltanDeLaGuia, $('.lista-ejercicios'), salirDelAula);
    $('#filtros').classList.toggle('oculto', !!guiaAula);
    /* Dentro de una guía, «Modo examen» y «Mis ejercicios» no vienen al caso:
       la lista no es el curso, es lo que mandó el profesor. */
    for (const sel of ['#btnExamen', '#btnMisEj']) {
      if ($(sel)) $(sel).classList.toggle('oculto', !!guiaAula);
    }
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
  async function entrarSiHayGuia() {
    if (!window.Aula) return;
    const g = await Aula.leerUrl();
    if (!g) return;
    guiaAula = g;
    recargarEjercicios();
    pintarAula();
    pintarLista();
    pintarProgreso();
    irA('curso');
    estado('guía: ' + g.n, 'ok');
  }

  /* =================================================================== */
  recargarEjercicios();
  pintarLista();
  pintarEstadisticas();
  pintarRepaso();
  pintarProgreso();
  refrescarArchivos();
  /* --------------------------- los primeros pasos ---------------------- */
  /* Cuatro carteles, una sola vez, para quien abre esto por primera vez. Va
     al final de todo: recién acá la pantalla es la que la persona va a ver. */
  if (window.Bienvenida) Bienvenida.iniciar();

  estado('listo');

  /* Enlaces directos: #curso abre el curso y #ej=f13 abre ese ejercicio
     (los usa el buscador global). */
  function aplicarHash() {
    const h = location.hash;
    if (h === '#curso') { irA('curso'); return; }
    const m = /^#ej=([A-Za-z0-9_-]+)$/.exec(h);
    if (!m) return;
    if (!EJERCICIOS.some(e => e.id === m[1])) return;
    irA('curso');
    mostrarEjercicio(m[1]);
  }
  entrarSiHayGuia();
  aplicarHash();
  window.addEventListener('hashchange', aplicarHash);
})();

/* IDE de ESLE2 POO: editor, pantalla, ejemplos y curso de objetos. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const { EJEMPLOS } = window.CURSO_POO;

  /* Los del curso más los que haya creado el usuario (js/mis-ejercicios.js).
     Salvo que se haya entrado por el enlace de una guía: ahí la lista es esa
     guía y nada más, que es de lo que se trata el modo aula. */
  let EJERCICIOS = window.CURSO_POO.EJERCICIOS.slice();
  let guiaAula = null;          // la guía abierta por enlace, o null
  let faltanDeLaGuia = [];      // los suyos que ya no están en el curso

  function recargarEjercicios() {
    const propios = window.MisEjercicios ? misEjercicios.cargar() : [];
    if (guiaAula && window.Aula) {
      const r = window.Aula.resolver(guiaAula, window.CURSO_POO.EJERCICIOS.concat(propios));
      EJERCICIOS = r.ejercicios;
      faltanDeLaGuia = r.faltan;
      return;
    }
    EJERCICIOS = window.CURSO_POO.EJERCICIOS.concat(propios);
  }
  const { Pantalla, crearDiagnostico } = window.ESLE2Consola;

  /* ------------------------------ progreso ---------------------------- */
  const COOKIE = 'esle2_progreso_poo';
  const leerCookie = n => {
    const p = document.cookie.split('; ').find(c => c.startsWith(n + '='));
    return p ? decodeURIComponent(p.slice(n.length + 1)) : '';
  };
  const grabarCookie = (n, v) => {
    document.cookie = `${n}=${encodeURIComponent(v)}; expires=${new Date(Date.now() + 365 * 864e5).toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  };
  const progreso = (() => { try { return JSON.parse(leerCookie(COOKIE) || '{}'); } catch (e) { return {}; } })();
  function pintarProgreso() {
    const n = EJERCICIOS.filter(e => progreso[e.id]).length;
    $('#progresoTexto').textContent = `${n} / ${EJERCICIOS.length}`;
    $('#progresoBarra').style.width = (n / EJERCICIOS.length) * 100 + '%';
  }

  /* ------------------------------- editor ----------------------------- */
  /* El resaltado vive en js/modo-sle2.js */

  const editor = CodeMirror.fromTextArea($('#codigo'), {
    mode: 'sle2poo', theme: 'esle2', lineNumbers: true,
    indentUnit: 3, tabSize: 3, matchBrackets: true,
    extraKeys: {
      'Ctrl-Enter': () => ejecutar(), 'Cmd-Enter': () => ejecutar(),
      Tab: cm => cm.execCommand('insertSoftTab')
    }
  });
  /* Ajustar texto: el Alt + Z de Visual Studio Code. */
  AjustarTexto.iniciar({ editor: editor, boton: $('#btnAjustar'), clave: 'esle2poo_ajustar' });

  /* Cuando el mismo error de sintaxis aparece cinco veces seguidas en dos
     minutos, se dice algo. Va en la salida y no en un cartel: no interrumpe. */
  const animo = AnimoUI.iniciar({
    clave: 'esle2_animo_poo',
    consola: $('#consola'),
    alaLinea: n => { editor.setCursor({ line: n - 1, ch: 0 }); editor.focus(); }
  });

  /* Modo flexible: el único compilador de la página (ver js/flexible-ui.js).
     En estricto se comporta igual que siempre. */
  const Flex = FlexibleUI.iniciar({
    editor: editor, boton: $('#btnFlexible'), clave: 'esle2poo_flexible',
    estricto: fuente => SLE2POO.compilar(fuente),
    Parser: SLE2POO.ParserPOO, extras: SLE2POO.RESERVADAS,
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


  editor.setValue(Guardado.leer('esle2poo_codigo') || EJEMPLOS[0].codigo);
  // El área de texto que usa CodeMirror por debajo también necesita nombre.
  editor.getInputField().setAttribute('aria-label', 'Editor de programas ESLE2 POO');
  // El área con scroll del editor se anuncia y se alcanza con el teclado.
  editor.getScrollerElement().setAttribute('tabindex', '0');
  editor.getScrollerElement().setAttribute('role', 'region');
  editor.getScrollerElement().setAttribute('aria-label', 'Editor de programas ESLE2 POO');
  editor.on('change', () => Guardado.escribir('esle2poo_codigo', editor.getValue()));

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
  $('#entrada').value = (compartido && compartido.entrada) || Guardado.leer('esle2poo_entrada') || '';
  $('#entrada').addEventListener('input', e => Guardado.escribir('esle2poo_entrada', e.target.value));

  let marcaLinea = null;
  const limpiarMarca = () => {
    if (marcaLinea === null) return;
    editor.removeLineClass(marcaLinea, 'background', 'linea-error');
    marcaLinea = null;
  };
  /* Las líneas que el programa no pisó. Se marcan al costado y no pintando
     el fondo: encima del código, cualquier tinte le baja el contraste a los
     números y a las palabras clave. */
  let sinCorrer = [];
  const limpiarSinCorrer = () => {
    for (const l of sinCorrer) editor.removeLineClass(l, 'wrap', 'linea-muerta');
    sinCorrer = [];
  };
  const marcarSinCorrer = lineas => {
    limpiarSinCorrer();
    for (const l of lineas) {
      if (l >= 1 && l <= editor.lineCount()) {
        sinCorrer.push(editor.addLineClass(l - 1, 'wrap', 'linea-muerta'));
      }
    }
  };

  const marcarLinea = l => {
    limpiarMarca();
    limpiarSinCorrer();
    if (l >= 1 && l <= editor.lineCount()) marcaLinea = editor.addLineClass(l - 1, 'background', 'linea-error');
  };

  /* ------------------------------ consola ----------------------------- */
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

  const esperas = new Set();
  function esperar(ejecutor) {
    const p = new Promise((resolve, reject) => {
      const e = {
        cancelar: () => {
          esperas.delete(e);
          if (e.limpiar) e.limpiar();
          reject(new SLE2.SLError('ejecución interrumpida por el usuario', 0));
        }
      };
      esperas.add(e);
      const terminar = v => {
        if (!esperas.has(e)) return;
        esperas.delete(e);
        if (e.limpiar) e.limpiar();
        resolve(v);
      };
      e.limpiar = ejecutor(terminar) || null;
    });
    p.catch(() => {});
    return p;
  }
  const cancelarEsperas = () => [...esperas].forEach(e => e.cancelar());

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
        pantalla.escribir(campo.value + '\n');
        terminar(campo.value);
      });
      return () => campo.remove();
    });
  }

  function crearIO(textoEntrada, interactivo, salida) {
    const lineas = textoEntrada.length ? textoEntrada.replace(/\r/g, '').split('\n') : [];
    const io = {
      archivos: new Map(), argumentos: [],
      imprimir(t) { salida ? salida.push(t) : pantalla.escribir(t); },
      limpiar() { salida ? (salida.length = 0) : pantalla.limpiar(); },
      finEntrada() { return lineas.length === 0; },
      async leerLinea() {
        if (lineas.length) return lineas.shift();
        return interactivo ? await pedirLinea() : null;
      },
      beep: async () => {}, leerTecla: async () => 0
    };
    if (!salida) {
      io.setColor = (f, b) => pantalla.setColor(f, b);
      io.getColor = () => pantalla.getColor();
      io.setCurpos = (l, c) => pantalla.setCurpos(l, c);
      io.getCurpos = () => pantalla.getCurpos();
      io.getScrsize = () => pantalla.getScrsize();
    }
    return io;
  }

  /* ------------------------- errores y estado ------------------------- */
  function estado(txt, clase) {
    const e = $('#estado');
    e.textContent = txt;
    e.className = 'estado ' + (clase || '');
  }
  const esInterrupcion = e => e instanceof SLE2.SLError && /interrumpida/.test(e.message);

  function mostrarError(e) {
    if (esInterrupcion(e)) { escribir('\n[ejecución detenida por vos]\n', 'info'); estado('detenido'); return; }
    Sonido.tocar('error');
    if (!(e instanceof SLE2.SLError)) {
      diagnostico({ titulo: 'Error interno de ESLE2', mensaje: e.message });
      estado('error interno', 'error');
      return;
    }
    const compil = e.fase === 'compilacion';
    diagnostico({
      titulo: compil ? 'Error de compilación' : 'Error de ejecución',
      linea: e.linea, mensaje: e.message, sugerencia: e.sugerencia
    });
    estado(compil ? 'error de compilación' : 'error de ejecución', 'error');
    if (compil) animo.registrar({ error: e.message, linea: e.linea });
    if (e.linea) { marcarLinea(e.linea); editor.setCursor({ line: e.linea - 1, ch: 0 }); }
  }
  const mostrarSugerencias = lista => lista.forEach(s => diagnostico({
    tipo: 'estilo', titulo: 'Estilo', linea: s.linea, mensaje: s.mensaje, sugerencia: s.sugerencia
  }));
  const mostrarAvisos = av => av.forEach(a => diagnostico({
    tipo: 'aviso', titulo: 'Aviso', linea: a.linea, mensaje: a.mensaje, sugerencia: a.sugerencia
  }));

  /* ------------------------------ ejecución ---------------------------- */
  let control = null;

  $('#btnCompilar').addEventListener('click', () => {
    limpiarConsola(); limpiarMarca();
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }
    const avisos = SLE2POO.revisar(editor.getValue());
    // Lo de arriba busca posibles errores; lo de abajo, cómo escribirlo mejor.
    const sugerencias = window.Estilo ? Estilo.revisar(ast) : [];
    if (avisos.length || sugerencias.length) {
      if (avisos.length) {
        escribir(`La sintaxis está bien. Hay ${avisos.length} cosa(s) para revisar:\n`, 'info');
        mostrarAvisos(avisos);
      }
      if (sugerencias.length) {
        escribir(`\n${sugerencias.length} sugerencia(s) de estilo (el programa anda igual):\n`, 'info');
        mostrarSugerencias(sugerencias);
      }
      estado(`${avisos.length + sugerencias.length} observación(es)`, 'corriendo');
    } else {
      escribir('Sin errores ni observaciones. El programa está listo para ejecutarse.\n', 'ok');
      estado('revisado', 'ok');
      Sonido.tocar('exito');
    }
  });

  /* Ejecutar y grabar son la MISMA corrida: grabando, el intérprete además
     avisa antes de cada sentencia y el io queda envuelto para anotar lo que se
     le pide a la pantalla. Ver js/viaje.js. */
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
    limpiarConsola(); limpiarMarca();
    viaje.cerrar();                 // la película anterior ya no corresponde
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }

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
      /* Grabando la entrada NO es interactiva: el programa corre entero de una
         y nadie puede contestarle. Si se le acaban los datos corta con el
         mismo error de siempre, y lo grabado hasta ahí igual sirve. */
      const io = crearIO($('#entrada').value, !grabando);
      interp = await SLE2POO.ejecutar(ast, grabadora ? grabadora.envolverIO(io) : io,
        grabadora
          ? { control, depurador: grabadora.hook, alRetornar: grabadora.alRetornar }
          : { control, depurador: contador
              ? (l, i) => { contador.hook(l); return depurador.hook(l, i); }
              : depurador.hook });
      if (contador) avisarCobertura(ast, contador);
      escribir(`\n[programa terminado en ${Math.round(performance.now() - t0)} ms]\n`, 'info');
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
      cancelarEsperas();
      consola.querySelectorAll('.entrada-viva').forEach(c => c.remove());
      $('#btnDetener').classList.add('oculto');
      $('#btnEjecutar').disabled = false;
    }
    if (fallo instanceof SLE2.SLError && fallo.fase !== 'compilacion' && !esInterrupcion(fallo)) {
      const avisos = SLE2POO.revisar(editor.getValue());
      if (avisos.length) { escribir('\nOtras cosas que conviene revisar:\n', 'info'); mostrarAvisos(avisos); }
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
    pantalla,
    panelVars: $('#panelVars'),
    varsCuerpo: $('#varsCuerpo'),
    area: document.querySelector('.area'),
    estado: t => estado(t),
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
    if (control.detener) control.detener();
    cancelarEsperas();
  }
  $('#btnDetener').addEventListener('click', detener);
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && control) { ev.preventDefault(); detener(); }
  });

  /* ------------------------------ ejemplos ----------------------------- */
  const sel = $('#selEjemplos');
  EJEMPLOS.forEach((e, i) => sel.add(new Option(e.nombre, String(i))));
  sel.addEventListener('change', () => {
    const e = EJEMPLOS[Number(sel.value)];
    if (!e) return;
    historial.registrar('previa', 'Antes de cargar el ejemplo «' + e.nombre + '»');
    editor.setValue(e.codigo);
    $('#entrada').value = e.entrada;
    Guardado.escribir('esle2poo_entrada', e.entrada);
    salirDeEjercicio();
    sel.value = '';
    limpiarConsola(); limpiarMarca();
    estado('ejemplo cargado');
  });
  /* ------------------- traducción a Python y a Java -------------------- */
  const IDIOMAS = {
    py: {
      titulo: 'El mismo programa, en Python',
      archivo: 'programa.py',
      corre: 'python programa.py',
      traducir: (ast, opts) => TraductorPOO.aPython(ast, opts)
    },
    java: {
      titulo: 'El mismo programa, en Java',
      archivo: 'Programa.java',
      corre: 'javac Programa.java &amp;&amp; java Programa',
      traducir: (ast, opts) => TraductorPOO.aJava(ast, opts)
    }
  };
  let idioma = IDIOMAS.py;

  function traducir(cual) {
    idioma = IDIOMAS[cual];
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }

    const { codigo, avisos } = idioma.traducir(ast, { entrada: $('#entrada').value });
    $('#tituloTraduccion').textContent = idioma.titulo;
    $('#notaTraduccion').innerHTML =
      'Traducción del programa que tenés en el editor: las clases, la herencia y los objetos pasan ' +
      'al otro lenguaje. Los vectores conservan los índices desde 1 y va una copia de las subrutinas ' +
      'de SLE2 que hagan falta, así el archivo corre tal cual con <code>' + idioma.corre + '</code>.';
    $('#codigoTraducido').textContent = codigo;
    $('#avisosTraduccion').textContent = avisos.length
      ? `Hay ${avisos.length} cosa(s) que el traductor no supo pasar; están marcadas con TODO en el código.`
      : '';
    $('#dlgTraduccion').showModal();
  }

  $('#btnTraducirPy').addEventListener('click', () => traducir('py'));
  $('#btnTraducirJava').addEventListener('click', () => traducir('java'));

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
  /* Con su propia clave, como Visual y BD. Sin ella usaba la de por omisión,
     que es la del IDE clásico — y los paneles no son los mismos: el clásico
     tiene el del lienzo y este no. Al guardar los dos en el mismo lugar, el
     que se abría segundo encontraba una disposición con otra cantidad de
     paneles, la descartaba, y volvía a la de fábrica. Acomodar los paneles en
     POO no quedaba nunca. */
  Disposicion.iniciar($('.area'), { clave: 'esle2poo_disposicion' });
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
  ProyectoUI.iniciar({
    clave: 'esle2poo_proyecto',
    claveModo: 'esle2poo_explorador',
    ext: '.slp',
    proyecto: 'ESLE2 POO',
    editor,
    entrada: () => $('#entrada').value,
    aplicar: (codigo, entrada) => {
      editor.setValue(codigo);
      $('#entrada').value = entrada || '';
      Guardado.escribir('esle2poo_entrada', entrada || '');
      editor.refresh();
    },
    estado: nombre => estado('abierto ' + nombre)
  });

  const historial = HistorialUI.iniciar({
    clave: 'esle2poo_historial',
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    aplicar: (codigo, entrada) => {
      editor.setValue(codigo);
      if (entrada !== undefined) { $('#entrada').value = entrada; Guardado.escribir('esle2poo_entrada', entrada); }
      editor.focus();
    },
    estado
  });
  AutocompletarUI.iniciar(editor, { poo: true });
  MemoriaUI.iniciar({
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    compilar: fuente => compilar(fuente),
    ejecutar: SLE2POO.ejecutar,
    mostrarError
  });

  EscritorioUI.iniciar({
    codigo: () => editor.getValue(),
    entrada: () => $('#entrada').value,
    compilar: fuente => compilar(fuente),
    ejecutar: SLE2POO.ejecutar,
    mostrarError
  });
  $('#btnCerrarJS').addEventListener('click', () => $('#dlgTraduccion').close());
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
    if (await Compartir.copiar(url)) estado('enlace copiado', 'ok');
  });
  $('#btnGuardar').addEventListener('click', () => {
    const b = new Blob([editor.getValue()], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'programa.slp';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* -------------------------------- vistas ----------------------------- */
  $('#nav').addEventListener('click', ev => {
    const b = ev.target.closest('.pest');
    if (!b || b.tagName === 'A') return;
    document.querySelectorAll('.pest').forEach(p => p.classList.toggle('activa', p === b));
    document.querySelectorAll('.vista').forEach(v => v.classList.toggle('activa', v.id === 'vista-' + b.dataset.vista));
    if (b.dataset.vista === 'ide') editor.refresh();
  });
  const irA = v => document.querySelector(`.pest[data-vista="${v}"]`).click();

  /* -------------------------------- curso ------------------------------ */
  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };
  let seleccionado = null, ejercicioActivo = null, filtro = 'todos';

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

  /* Se busca .chip solo adentro de este panel: hay otros .chip en la página
     (el examen, «Mis ejercicios») y tocarlos acá era un error que esperaba
     a pasar. */
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

  /* Igual que en el IDE clásico: lo que se pinta pasa por js/seguro.js, porque
     una guía de clase puede traer el enunciado que quiera. */
  const escapar = Seguro.escapar;

  function mostrarEjercicio(id) {
    const e = EJERCICIOS.find(x => x.id === id);
    seleccionado = id;
    pintarLista();
    const nivel = Seguro.deLista(e.nivel, Seguro.NIVELES, 'facil');
    const casos = (e.pruebas || []).map(p => `<tr><td>${p.entrada ? escapar(p.entrada) : '(sin datos)'}</td><td>${escapar(p.salida)}</td></tr>`).join('');
    $('#detalleEjercicio').innerHTML = `
      <span class="etq ${nivel}">${NIVELES[nivel]}</span>
      <h2></h2>
      <div class="enunciado">${Seguro.html(e.enunciado)}</div>
      ${e.pista ? `<div class="pista"><strong>Pista:</strong> ${Seguro.html(e.pista)}</div>` : ''}
      <div class="acciones">
        <button class="btn primario" id="btnAbrirEjercicio">Abrir en el IDE</button>
        ${progreso[id] ? '<span class="nota">✔ Ya resolviste este ejercicio.</span>' : ''}
      </div>
      <div class="casos"><h3>Casos de prueba</h3>
        <table><tr><th>Entrada</th><th>Salida esperada</th></tr>${casos}</table></div>`;
    $('#detalleEjercicio h2').textContent = e.titulo;
    $('#btnAbrirEjercicio').addEventListener('click', () => abrirEjercicio(e));
  }

  function abrirEjercicio(e, codigoInicial) {
    historial.registrar('previa', 'Antes de abrir «' + e.titulo + '»');
    ejercicioActivo = e;
    editor.setValue(codigoInicial !== undefined ? codigoInicial : (Guardado.leer('esle2poo_ej_' + e.id) || e.plantilla || ''));
    /* Sin casos de prueba —puede pasar con una guía ajena— la entrada queda
       vacía en vez de tirar el curso abajo. */
    $('#entrada').value = ((e.pruebas && e.pruebas[0]) || { entrada: '' }).entrada;
    $('#bannerTitulo').textContent = `${e.titulo} (${NIVELES[e.nivel]})`;
    $('#bannerEjercicio').classList.remove('oculto');
    limpiarConsola(); limpiarMarca();
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
    if (ejercicioActivo) Guardado.escribir('esle2poo_ej_' + ejercicioActivo.id, editor.getValue());
  });

  const normalizar = t => t.replace(/\r/g, '').split('\n')
    .map(l => l.trim().replace(/[ \t]+/g, ' ')).filter(l => l).join('\n');

  $('#btnVerificar').addEventListener('click', async () => {
    const e = ejercicioActivo;
    if (!e) return;
    limpiarConsola(); limpiarMarca();
    estado('verificando…', 'corriendo');
    escribir(`Verificando «${e.titulo}»…\n\n`, 'info');
    let ast;
    try { ast = compilar(); }
    catch (err) { mostrarError(err); return; }

    let todoBien = true;
    for (let i = 0; i < e.pruebas.length; i++) {
      const p = e.pruebas[i], salida = [], ctrl = {};
      control = ctrl;
      let error = null;
      try {
        await SLE2POO.ejecutar(ast, crearIO(p.entrada, false, salida), { control: ctrl, maxPasos: 4000000 });
      } catch (err) { error = err; } finally { control = null; }
      const obtenido = normalizar(salida.join('')), esperado = normalizar(p.salida);
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
      if (!progreso[e.id]) { progreso[e.id] = new Date().toISOString().slice(0, 10); grabarCookie(COOKIE, JSON.stringify(progreso)); }
      if (window.Racha) Racha.registrar();
      pintarProgreso(); pintarLista();
      if (seleccionado === e.id) mostrarEjercicio(e.id);
    } else {
      escribir('\nTodavía no. Revisá los casos que fallaron y volvé a intentar.\n', 'err');
      estado('faltan casos', 'error');
    }
    pintarEstadisticas();   // después de anotar el progreso, para que cuente este intento
    pintarRepaso();
  });


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
      const vigente = ProgresoESLE2.leerJSON(ProgresoESLE2.COOKIES.poo);
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
        await SLE2POO.ejecutar(ast, crearIO(p.entrada, false, salida),
          { maxPasos: 4000000, archivos: new Map() });
        if (normalizar(salida.join('')) === normalizar(p.salida)) pasadas++;
      } catch (e) { /* ese caso queda como no pasado */ }
    }
    return { pasadas, total: pruebas.length };
  }

  const examen = Examen.crear({
    lenguaje: 'ESLE2 POO',
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
  const stats = Estadisticas.crear('esle2poo_intentos');

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
  const repaso = Repaso.crear('esle2poo_repasos');
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
    if (!confirm('¿Borrar tu progreso del curso de objetos?')) return;
    Object.keys(progreso).forEach(k => delete progreso[k]);
    grabarCookie(COOKIE, '{}');
    stats.borrar();
    repaso.borrar();
    pintarProgreso(); pintarLista(); pintarEstadisticas(); pintarRepaso();
    if (seleccionado) mostrarEjercicio(seleccionado);
  });


  /* --------------------- ejercicios propios --------------------------- */
  const misEjercicios = MisEjercicios.crear({
    clave: 'esle2poo_mis_ej',
    lenguaje: 'ESLE2 POO',
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
  /* Una guía repartida por enlace: el profesor la arma acá y el alumno la
     abre desde el enlace, y hasta que salga, el curso es esa guía. */
  /* Entregar la guía: junta lo que el alumno escribió en cada ejercicio, lo
     corrige acá mismo con los casos de cada uno, y baja el archivo para el
     profesor. Mismo formato que una entrega de examen, así se abren las dos en
     el mismo visor y sale la misma planilla. */
  async function entregarLaGuia(alumno) {
    if (!guiaAula) throw new Error('no hay ninguna guía abierta');
    const abierto = ejercicioActivo;
    if (abierto) Guardado.escribir('esle2poo_ej_' + abierto.id, editor.getValue());

    const hechos = [];
    for (const e of EJERCICIOS) {
      const codigo = Guardado.leer('esle2poo_ej_' + e.id) || '';
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

  const aulaUI = AulaUI.crear({
    lenguaje: 'ESLE2 POO',
    catalogo: () => window.CURSO_POO.EJERCICIOS,
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

  recargarEjercicios();
  pintarLista();
  pintarProgreso();
  pintarEstadisticas();
  pintarRepaso();
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

/*
 * La página de ESLE2 BD.
 *
 * Es el mismo IDE que las demás páginas —misma cabecera, misma barra, mismos
 * paneles— con tres cosas propias: el panel que muestra la base, el panel de
 * SQL suelto para probar una consulta sin tocar el programa, y el menú
 * Exportar.
 *
 * La base vive en esta página, no en cada ejecución: si se vaciara al
 * ejecutar, no se podría escribir un programa que consulta lo que dejó otro,
 * que es exactamente cómo se trabaja con una base. Por eso «Vaciar la base»
 * es una acción explícita y aparte de «Ejecutar».
 */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const { SLE2, SQL, SLE2BD, ExportarSQL } = window;

  /* --------------------------- la base -------------------------------- */
  let base = SQL.crear();

  /* --------------------------- el editor ------------------------------ */
  const INICIAL = (window.BD_EJEMPLOS && BD_EJEMPLOS[0].codigo) || 'inicio\nfin\n';

  const editor = CodeMirror.fromTextArea($('#codigo'), {
    mode: 'sle2bd', theme: 'esle2', lineNumbers: true,
    indentUnit: 3, tabSize: 3, matchBrackets: true,
    extraKeys: {
      'Ctrl-Enter': () => ejecutar(false),
      'Cmd-Enter': () => ejecutar(false),
      'Ctrl-S': () => { guardar(); return false; },
      Tab: cm => cm.execCommand('insertSoftTab')
    }
  });

  AjustarTexto.iniciar({ editor: editor, boton: $('#btnAjustar'), clave: 'esle2bd_ajustar' });

  /* Leer el código en voz alta y dictarlo. Apagado por omisión: quien ya usa
     un lector de pantalla no necesita que le hablen encima. */
  VozUI.iniciar({ editor: editor, guardarClave: 'esle2_voz_bd' });

  /* --------------------------- la salida ------------------------------ */
  /* Va acá arriba y no más abajo porque AnimoUI y el modo flexible escriben en
     la consola: declarada después, «consola» todavía no existe cuando se la
     pasa, y toda esta función se cortaba ahí sin que se viera nada. */
  const consola = $('#consola');
  const { crearDiagnostico } = window.ESLE2Consola;
  const diagnostico = crearDiagnostico(consola, l => editor.getLine(l - 1), () => editor.lineCount());

  /* Cuando el mismo error de sintaxis aparece cinco veces seguidas en dos
     minutos, se dice algo. Va en la salida y no en un cartel: no interrumpe. */
  const animo = AnimoUI.iniciar({
    clave: 'esle2_animo_bd',
    consola: consola,
    alaLinea: n => { editor.setCursor({ line: n - 1, ch: 0 }); editor.focus(); }
  });

  const Flex = FlexibleUI.iniciar({
    editor: editor, boton: $('#btnFlexible'), clave: 'esle2bd_flexible',
    estricto: fuente => SLE2BD.compilar(fuente),
    opciones: { cadenasLargas: true },
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
  /* El SQL suelto se traduce acá y no adentro de Flex: el modo flexible
     compila con su propio parser y no pasaría por SLE2BD.compilar. */
  const compilar = fuente =>
    Flex.compilar(SLE2BD.aSQL(fuente === undefined ? editor.getValue() : fuente));

  editor.setValue(localStorage.getItem('esle2bd_codigo') || INICIAL);
  editor.getInputField().setAttribute('aria-label', 'Editor de programas ESLE2 BD');
  editor.getScrollerElement().setAttribute('tabindex', '0');
  editor.getScrollerElement().setAttribute('role', 'region');
  editor.getScrollerElement().setAttribute('aria-label', 'Editor de programas ESLE2 BD');
  editor.on('change', () => localStorage.setItem('esle2bd_codigo', editor.getValue()));
  editor.on('cursorActivity', () => {
    const c = editor.getCursor();
    $('#posCursor').textContent = (c.line + 1) + ' : ' + (c.ch + 1);
  });


  function escribir(texto, clase) {
    const s = document.createElement('span');
    if (clase) s.className = clase;
    s.textContent = texto;
    consola.appendChild(s);
    consola.scrollTop = consola.scrollHeight;
  }
  const limpiarSalida = () => consola.replaceChildren();

  function estado(t, clase) {
    const e = $('#estado');
    e.textContent = t;
    e.className = 'estado' + (clase ? ' ' + clase : '');
  }

  function mostrarError(e) {
    if (!(e instanceof SLE2.SLError)) {
      diagnostico({
        titulo: 'Error interno de ESLE2',
        mensaje: e.message,
        sugerencia: 'Contactá al responsable del sitio con el programa que lo provocó.'
      });
      estado('error interno', 'error');
      return;
    }
    if (window.Sonido) Sonido.tocar('error');
    const compil = e.fase === 'compilacion';
    diagnostico({
      titulo: compil ? 'Error de compilación' : 'Error de ejecución',
      linea: e.linea, mensaje: e.message, sugerencia: e.sugerencia
    });
    estado(compil ? 'error de compilación' : 'error de ejecución', 'error');
    if (compil) animo.registrar({ error: e.message, linea: e.linea });
    if (e.linea) {
      editor.setCursor({ line: e.linea - 1, ch: 0 });
      editor.focus();
    }
  }

  /* -------------------- el panel con las tablas ----------------------- */
  function pintarEsquema() {
    const caja = $('#esquemaCuerpo');
    caja.replaceChildren();
    const ts = SQL.tablas(base);
    $('#esquemaMini').textContent = ts.length
      ? ts.length + ' tabla(s)' : 'sin tablas';

    if (!ts.length) {
      const p = document.createElement('p');
      p.className = 'nota';
      p.textContent = 'La base está vacía. Creá una tabla con CREATE TABLE, o traé datos '
        + 'de ejemplo desde el menú Base.';
      caja.appendChild(p);
      return;
    }

    for (const t of ts) {
      const d = document.createElement('details');
      d.className = 'tabla-esq';
      d.open = ts.length <= 3;
      const s = document.createElement('summary');
      const n = document.createElement('b');
      n.textContent = t.nombre;
      const c = document.createElement('span');
      c.className = 'mini';
      c.textContent = t.filas + ' fila(s)';
      s.append(n, c);
      d.appendChild(s);

      const ul = document.createElement('ul');
      for (const col of t.columnas) {
        const li = document.createElement('li');
        const nom = document.createElement('span');
        nom.className = 'col-n' + (col.pk ? ' pk' : '');
        nom.textContent = col.nombre;
        if (col.pk) nom.title = 'Clave primaria';
        const tip = document.createElement('span');
        tip.className = 'col-t';
        tip.textContent = col.tipo + (col.noNulo && !col.pk ? ' · obligatorio' : '');
        li.append(nom, tip);
        ul.appendChild(li);
      }
      d.appendChild(ul);

      const ver = document.createElement('button');
      ver.className = 'btn mini-btn';
      ver.type = 'button';
      ver.textContent = 'Ver las filas';
      ver.addEventListener('click', () => correrSQL('SELECT * FROM ' + t.nombre));
      d.appendChild(ver);

      caja.appendChild(d);
    }
  }

  /* Dibuja el resultado de una consulta en la salida, como tabla. */
  function pintarResultado(r) {
    if (r.tipo !== 'select') { escribir(r.mensaje + '\n', 'ok'); return; }
    const tabla = document.createElement('table');
    tabla.className = 'tabla-sql';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    for (const c of r.columnas) {
      const th = document.createElement('th');
      th.textContent = c;
      tr.appendChild(th);
    }
    thead.appendChild(tr);
    tabla.appendChild(thead);
    const tbody = document.createElement('tbody');
    for (const f of r.filas) {
      const fila = document.createElement('tr');
      for (const v of f) {
        const td = document.createElement('td');
        if (v === null || v === undefined) {
          td.textContent = 'NULL';
          td.className = 'nulo';
          td.title = 'NULL: no se sabe. No es lo mismo que 0 ni que una cadena vacía.';
        } else {
          td.textContent = SQL.textoDe(v);
          if (typeof v === 'number') td.className = 'num';
        }
        fila.appendChild(td);
      }
      tbody.appendChild(fila);
    }
    tabla.appendChild(tbody);
    consola.appendChild(tabla);
    escribir(r.filas.length + ' fila(s)\n', 'info');
  }

  /* --------------------------- SQL suelto ----------------------------- */
  function correrSQL(texto) {
    const t = (texto === undefined ? $('#sqlRapido').value : texto).trim();
    if (!t) return;
    escribir('\n> ' + t.replace(/\s+/g, ' ').slice(0, 120) + '\n', 'eco');
    try {
      for (const r of SQL.ejecutar(base, t)) pintarResultado(r);
      estado('listo', 'ok');
    } catch (e) {
      if (e && e.sql) {
        diagnostico({ titulo: 'Error de SQL', mensaje: e.message, sugerencia: e.sugerencia });
        estado('error de SQL', 'error');
        if (window.Sonido) Sonido.tocar('error');
      } else { mostrarError(e); }
    }
    pintarEsquema();
  }

  /* --------------------------- ejecución ------------------------------ */
  let control = null;

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

  function io() {
    const lineas = $('#entrada').value.length
      ? $('#entrada').value.replace(/\r/g, '').split('\n') : [];
    return {
      archivos: new Map(), argumentos: [],
      imprimir: t => escribir(t),
      limpiar: () => limpiarSalida(),
      finEntrada: () => lineas.length === 0,
      leerLinea: async () => {
        if (!lineas.length) { $('#panelEntrada').classList.remove('oculto'); return null; }
        return lineas.shift();
      },
      setColor: () => {}, getColor: () => ({ texto: 7, fondo: 0 }),
      setCurpos: () => {}, getCurpos: () => ({ linea: 1, col: 1 }),
      getScrsize: () => ({ lineas: 25, columnas: 80 }),
      beep: async () => {}, leerTecla: async () => 0
    };
  }

  const depurador = ESLE2Depurador.crearDepurador({
    editor,
    panel: $('#panelVars'),
    cuerpo: $('#varsCuerpo'),
    esperar,
    alPausar: () => { $('#varsLinea').textContent = 'en pausa'; },
    alSeguir: () => { $('#varsLinea').textContent = ''; }
  });

  function botonesPaso(v) {
    $('#btnPaso').classList.toggle('oculto', !v);
    $('#btnContinuar').classList.toggle('oculto', !v);
  }

  async function ejecutar(pasoAPaso) {
    if (control) return;
    limpiarSalida();
    let ast;
    try { ast = compilar(); }
    catch (e) { mostrarError(e); return; }

    control = {};
    $('#btnDetener').classList.remove('oculto');
    estado('ejecutando…', 'corriendo');
    if (pasoAPaso) { depurador.encender(); botonesPaso(true); }

    try {
      await SLE2BD.ejecutar(ast, io(), { control, base, depurador: depurador.hook });
      escribir('\n[el programa terminó]\n', 'info');
      estado('terminado', 'ok');
      if (window.Sonido) Sonido.tocar('exito');
    } catch (e) {
      mostrarError(e);
    } finally {
      control = null;
      depurador.terminar();
      botonesPaso(false);
      $('#btnDetener').classList.add('oculto');
      pintarEsquema();
    }
  }

  function detener() {
    if (!control) return;
    control.detener();
    cancelarEsperas();
    escribir('\n[ejecución detenida por vos]\n', 'info');
    estado('detenido');
  }

  function revisar() {
    limpiarSalida();
    let avisos;
    try {
      compilar();
      avisos = SLE2BD.revisar(editor.getValue());
    } catch (e) { mostrarError(e); return; }
    if (!avisos.length) {
      escribir('El programa compila y no hay recomendaciones.\n', 'ok');
      estado('sin errores', 'ok');
      return;
    }
    avisos.forEach(a => diagnostico({
      tipo: 'aviso', titulo: 'Recomendación', linea: a.linea,
      mensaje: a.mensaje, sugerencia: a.sugerencia
    }));
    estado(avisos.length + ' recomendación(es)', 'aviso');
  }

  /* --------------------------- exportar ------------------------------- */
  let ultimoSQL = { texto: '', archivo: 'base.sql' };

  function exportar(motor) {
    const m = ExportarSQL.MOTORES[motor];
    const texto = ExportarSQL.exportar(base, { motor });
    ultimoSQL = { texto, archivo: m.archivo };
    $('#tituloExportar').textContent = 'La base, en SQL de ' + m.nombre;
    $('#notaExportar').innerHTML =
      'Volcado de la base tal como está ahora: el <code>CREATE TABLE</code> de cada tabla y los '
      + '<code>INSERT</code> de sus filas, escritos como los escribe ' + m.nombre + '. Para cargarlo: '
      + '<code>' + m.corre + '</code>.';
    $('#codigoExportado').textContent = texto;
    $('#dlgExportar').showModal();
  }

  const bajar = (texto, nombre, tipo) => {
    const url = URL.createObjectURL(new Blob([texto], { type: tipo || 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  function guardar() {
    bajar(editor.getValue(), ($('#tituloArchivo').textContent || 'programa.sldb'), 'text/plain');
    estado('archivo guardado', 'ok');
  }

  /* ----------------------------- cableado ----------------------------- */
  $('#btnEjecutar').addEventListener('click', () => ejecutar(false));
  $('#btnDepurar').addEventListener('click', () => ejecutar(true));
  $('#btnDetener').addEventListener('click', detener);
  $('#btnCompilar').addEventListener('click', revisar);
  $('#btnLimpiar').addEventListener('click', limpiarSalida);
  $('#btnPaso').addEventListener('click', () => depurador.paso());
  $('#btnContinuar').addEventListener('click', () => { depurador.apagar(); botonesPaso(false); });

  $('#btnCorrerSQL').addEventListener('click', () => correrSQL());
  $('#sqlRapido').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); correrSQL(); }
  });

  $('#btnVaciar').addEventListener('click', () => {
    base = SQL.crear();
    limpiarSalida();
    pintarEsquema();
    escribir('\n[la base quedó vacía]\n', 'info');
    estado('base vacía');
  });
  $('#btnEjemploBase').addEventListener('click', () => {
    try {
      SQL.ejecutar(base, window.BD_DATOS_EJEMPLO);
      escribir('\n[se cargaron las tablas de ejemplo]\n', 'ok');
      estado('datos de ejemplo cargados', 'ok');
    } catch (e) {
      diagnostico({ titulo: 'No se pudieron cargar los datos de ejemplo',
        mensaje: e.message, sugerencia: e.sugerencia || '' });
      estado('no se pudo', 'error');
    }
    pintarEsquema();
  });
  $('#btnImportarSQL').addEventListener('click', () => $('#archivoSQL').click());
  $('#archivoSQL').addEventListener('change', ev => {
    const f = ev.target.files[0];
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      try {
        /* Un volcado trae PRAGMA, BEGIN y COMMIT, que este motor no necesita:
           se saltean en vez de dar un error por algo que no es del alumno. */
        const texto = String(lector.result).split('\n')
          .filter(l => !/^\s*(PRAGMA|BEGIN|COMMIT|START TRANSACTION|SET NAMES)/i.test(l))
          .join('\n');
        const rs = SQL.ejecutar(base, texto);
        escribir(`\n[se cargó ${f.name}: ${rs.length} instrucción(es)]\n`, 'ok');
        estado('archivo cargado', 'ok');
      } catch (e) {
        diagnostico({ titulo: 'Error al cargar el archivo', mensaje: e.message, sugerencia: e.sugerencia || '' });
        estado('no se pudo cargar', 'error');
      }
      pintarEsquema();
    };
    lector.readAsText(f);
    ev.target.value = '';
  });

  $('#btnSQLite').addEventListener('click', () => exportar('sqlite'));
  $('#btnMySQL').addEventListener('click', () => exportar('mysql'));
  $('#btnPostgres').addEventListener('click', () => exportar('postgres'));
  $('#btnCerrarExportar').addEventListener('click', () => $('#dlgExportar').close());
  $('#btnBajarSQL').addEventListener('click', () => bajar(ultimoSQL.texto, ultimoSQL.archivo, 'application/sql'));
  $('#btnCopiarSQL').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(ultimoSQL.texto); estado('SQL copiado', 'ok'); }
    catch (e) { estado('no se pudo copiar', 'error'); }
  });

  $('#btnNuevo').addEventListener('click', () => {
    editor.setValue('inicio\n   \nfin\n');
    editor.setCursor({ line: 1, ch: 3 });
    editor.focus();
  });
  $('#btnAbrir').addEventListener('click', () => $('#archivo').click());
  $('#archivo').addEventListener('change', ev => {
    const f = ev.target.files[0];
    if (!f) return;
    const lector = new FileReader();
    lector.onload = () => {
      editor.setValue(String(lector.result));
      $('#tituloArchivo').textContent = f.name;
    };
    lector.readAsText(f);
    ev.target.value = '';
  });
  $('#btnGuardar').addEventListener('click', guardar);
  $('#btnCompartir').addEventListener('click', async () => {
    const url = Compartir.enlace(editor.getValue(), $('#entrada').value);
    try { await navigator.clipboard.writeText(url); estado('enlace copiado', 'ok'); }
    catch (e) { estado('no se pudo copiar el enlace', 'error'); }
  });

  /* Ejemplos */
  const sel = $('#selEjemplos');
  (window.BD_EJEMPLOS || []).forEach((e, i) => {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = e.nombre;
    sel.appendChild(o);
  });
  sel.addEventListener('change', () => {
    const i = Number(sel.value);
    if (!sel.value || !BD_EJEMPLOS[i]) return;
    editor.setValue(BD_EJEMPLOS[i].codigo);
    sel.value = '';
    editor.focus();
  });

  /* El panel del esquema se puede apagar, como el explorador en los otros. */
  const btnEsq = $('#btnEsquema');
  let esquemaVisible = localStorage.getItem('esle2bd_esquema') !== '0';
  function aplicarEsquema() {
    $('#panelEsquema').classList.toggle('oculto', !esquemaVisible);
    btnEsq.setAttribute('aria-pressed', String(esquemaVisible));
    const etq = btnEsq.querySelector('.menu-etiqueta');
    etq.textContent = esquemaVisible ? 'Esquema de la base ✓' : 'Esquema de la base';
    try { localStorage.setItem('esle2bd_esquema', esquemaVisible ? '1' : '0'); } catch (e) {}
    window.dispatchEvent(new CustomEvent('esle2:disposicion'));
  }
  btnEsq.addEventListener('click', () => { esquemaVisible = !esquemaVisible; aplicarEsquema(); });
  aplicarEsquema();

  $('#btnDisposicion').addEventListener('click', () => disposicion && disposicion.restablecer());
  const disposicion = Disposicion.iniciar($('.area'), { clave: 'esle2bd_disposicion' });
  window.addEventListener('esle2:disposicion', () => editor.refresh());

  /* Sonido, tema, presentación y buscador, como en las demás páginas. */
  Sonido.iniciar({
    leer: k => localStorage.getItem(k),
    guardar: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
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

  /* El autocompletado sabe de SQL y de lo que hay en la base ahora mismo.
     sql_directo y sql_valor no se ofrecen: son la traducción de una
     instrucción escrita suelta, no algo que se escriba a mano. */
  AutocompletarUI.iniciar(editor, {
    poo: false,
    sql: true,
    extras: Object.keys(SLE2BD.PREDEF_BD).filter(n => !/^sql_/.test(n)),
    tablas: () => SQL.tablas(base)
  });

  DiagramaBDUI.iniciar({ tablas: () => SQL.tablas(base) });
  EditorBDUI.iniciar({
    tablas: () => SQL.tablas(base),
    avisar: t => estado(t, 'ok'),
    usar: codigo => { editor.setValue(codigo); editor.focus(); estado('el código del diagrama está en el editor', 'ok'); }
  });
  Presentacion.crear();
  Iconos.pintar(document);

  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && control) { detener(); return; }
    if (ev.key === 'F9' && !control) { ev.preventDefault(); ejecutar(true); }
    if (ev.key === 'F10' && depurador.enPausa) { ev.preventDefault(); depurador.paso(); }
    if (ev.key === 'F8' && depurador.activo) { ev.preventDefault(); $('#btnContinuar').click(); }
  });

  /* Un programa compartido por enlace: ese gana sobre lo guardado. */
  const compartido = window.Compartir && Compartir.leer();
  if (compartido) {
    editor.setValue(compartido.codigo);
    $('#entrada').value = compartido.entrada || '';
    Compartir.limpiarUrl();
  }

  /* --------------------------- las vistas ----------------------------- */
  /* Dos: la consola de siempre y el curso. El curso se arma solo desde
     js/curso-bd-ui.js; de acá se lleva lo único que necesita del editor. */
  function irA(cual) {
    document.querySelectorAll('.pest[data-vista]').forEach(b =>
      b.classList.toggle('activa', b.dataset.vista === cual));
    document.querySelectorAll('.vista').forEach(v =>
      v.classList.toggle('activa', v.id === 'vista-' + cual));
    if (cual === 'ide') editor.refresh();
  }
  const nav = $('#nav');
  if (nav) {
    nav.addEventListener('click', ev => {
      const b = ev.target.closest('.pest[data-vista]');
      if (b) irA(b.dataset.vista);
    });
  }
  if (window.CursoBDUI) {
    CursoBDUI.arrancar({
      leer: () => editor.getValue(),
      escribir: t => { editor.setValue(t); editor.focus(); },
      irAlIDE: () => irA('ide')
    });
  }

  pintarEsquema();
  estado('listo');
})();

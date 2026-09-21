/*
 * El diálogo «Versiones»: cuatro pestañas sobre el mismo <dialog> que antes
 * era solo el historial de copias automáticas.
 *
 *   Cambios             lo que cambió desde la última versión guardada, y el
 *                        botón para guardar una nueva («commit», para quien
 *                        ya conoce la palabra).
 *   Versiones guardadas  la lista de versiones del proyecto, con su diff y
 *                        «Volver a esta versión».
 *   Pasar a otra compu   llevar el proyecto entero (con su historial) a un
 *                        archivo, y traer de vuelta lo que se hizo en otro
 *                        lado, uniendo los dos historiales.
 *   Copias automáticas   el historial de recuperación de siempre
 *                        (js/historial.js), sin tocar.
 *
 * Una versión acá es SIEMPRE el proyecto entero —todos los archivos—, no
 * staging ni casillas para elegir qué guardar: lo que hay ahora es lo que se
 * guarda, con un mensaje.
 *
 * Las cuentas (el grafo de commits, el diff, la unión de dos historiales) las
 * hace js/versiones.js, que no toca el DOM y por eso lo prueba
 * test/test-versiones.js. Acá se dibuja, se guarda y se conecta con el editor
 * y el explorador (js/proyecto-ui.js).
 *
 * API:  VersionesUI.iniciar({ variante, claveVersiones, proyecto, historial,
 *                              editor, entrada, ext, plantilla, aplicar, estado })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const EXTENSION = '.esle2proyecto';

  const ETIQUETAS = {
    agregado: 'Nuevo', eliminado: 'Borrado', modificado: 'Cambiado',
    'carpeta-agregada': 'Carpeta nueva', 'carpeta-eliminada': 'Carpeta borrada'
  };
  const claseTipo = t => (t === 'agregado' || t === 'carpeta-agregada') ? 'agregado'
                        : (t === 'eliminado' || t === 'carpeta-eliminada') ? 'eliminado' : 'modificado';

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function filaDiff(l) {
    const fila = nodo('div', 'his-linea ' + l.t);
    fila.append(
      nodo('span', 'his-num', l.t === 'salto' ? '' : (l.a || l.b || '')),
      nodo('span', 'his-signo', l.t === 'mas' ? '+' : l.t === 'menos' ? '−' : l.t === 'salto' ? '⋮' : ' '),
      nodo('code', null, l.texto)
    );
    return fila;
  }

  function generarId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }

  function iniciar(cfg) {
    const dlg = $('#dlgHistorial');
    const V = global.Versiones, H = global.Historial;
    if (!dlg || !V || !H || !global.Carpeta || !cfg.proyecto) return null;

    let v = V.cargar(cfg.claveVersiones) || V.vacio(cfg.variante, generarId);
    let cambioElegido = null;
    let verElegida = null;
    let verCompararConActual = false;
    let pendienteFusion = null;   // { unido, padres, combinado, elecciones }

    const grabar = () => V.guardar(cfg.claveVersiones, v);

    /* ---------------------- leer y aplicar el proyecto ------------------- */
    /* Cuando el explorador está apagado el «proyecto» es lo único que hay en
       el editor: un solo archivo. Con el explorador prendido es su estado
       completo. Las dos formas se guardan de la misma manera. */
    function snapshotActual() {
      if (cfg.proyecto.encendido()) {
        const st = cfg.proyecto.estadoCompleto();
        return V.normalizarInstantanea(st);
      }
      return V.normalizarInstantanea({
        archivos: [{ nombre: 'programa' + (cfg.ext || '.sl'), codigo: cfg.editor.getValue(), entrada: cfg.entrada() }],
        carpetas: []
      });
    }

    function aplicarSnapshot(inst) {
      cfg.proyecto.establecer({
        archivos: inst.archivos.map(a => ({ nombre: a.nombre, codigo: a.codigo, entrada: a.entrada, ts: Date.now() })),
        carpetas: inst.carpetas,
        activo: inst.archivos[0] ? inst.archivos[0].nombre : null
      });
    }

    /* No guarda si el proyecto quedó igual a la última versión (Versiones.commit
       ya lo detecta); avisa con alert() si algo falló, igual que el resto del
       explorador (importar carpeta, por ejemplo). */
    function commitDesdeActual(mensaje) {
      const antes = v;
      const nueva = V.commit(v, snapshotActual(), mensaje, { generarId, ahora: Date.now });
      if (nueva.error) { alert(nueva.error); return false; }
      if (nueva === antes) return false;
      v = nueva;
      if (!grabar()) { v = antes; alert('No se pudo guardar la versión: puede que no haya espacio en el navegador.'); return false; }
      return true;
    }

    function pintarTodo() { pintarCambios(); pintarVersiones(); }

    /* ------------------------------ pestañas ------------------------------ */
    const TABS = [
      { boton: 'verTabCambios', panel: 'verPanelCambios', al: pintarCambios },
      { boton: 'verTabVersiones', panel: 'verPanelVersiones', al: pintarVersiones },
      { boton: 'verTabPasar', panel: 'verPanelPasar', al: () => {} },
      { boton: 'verTabAuto', panel: 'verPanelAuto', al: () => cfg.historial && cfg.historial.abrir() }
    ];
    let tabActiva = 0;

    function activarTab(i, enfocar) {
      tabActiva = i;
      TABS.forEach((t, j) => {
        const boton = $('#' + t.boton);
        boton.setAttribute('aria-selected', String(i === j));
        boton.tabIndex = i === j ? 0 : -1;
        $('#' + t.panel).classList.toggle('oculto', i !== j);
      });
      TABS[i].al();
      if (enfocar) $('#' + TABS[i].boton).focus();
    }

    TABS.forEach((t, i) => $('#' + t.boton).addEventListener('click', () => activarTab(i, false)));
    $('.ver-tabs').addEventListener('keydown', ev => {
      if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
      ev.preventDefault();
      const n = TABS.length;
      activarTab(ev.key === 'ArrowLeft' ? (tabActiva - 1 + n) % n : (tabActiva + 1) % n, true);
    });

    /* -------------------------------- Cambios ------------------------------ */
    function cambiosActuales() {
      const cabeza = V.cabezaInstantanea(v) || { archivos: [], carpetas: [] };
      return V.diffArchivos(cabeza, snapshotActual());
    }

    function pintarCambios() {
      const cambios = cambiosActuales();
      const ul = $('#verCambiosLista');
      ul.replaceChildren();
      $('#verGuardar').disabled = !cambios.length;

      if (!cambios.length) {
        const li = nodo('li');
        li.appendChild(nodo('p', 'nota', v.cabeza
          ? 'No hay cambios desde la última versión guardada.'
          : 'Todavía no guardaste ninguna versión de este proyecto. El botón de abajo guarda la primera.'));
        ul.appendChild(li);
        cambioElegido = null;
      } else {
        if (!cambios.some(c => c.nombre === cambioElegido)) cambioElegido = cambios[0].nombre;
        for (const c of cambios) {
          const li = nodo('li', 'ver-item');
          const b = nodo('button', 'ver-btn' + (c.nombre === cambioElegido ? ' elegida' : ''));
          b.type = 'button';
          b.setAttribute('aria-pressed', String(c.nombre === cambioElegido));
          b.append(nodo('span', 'ver-etiqueta-tipo ' + claseTipo(c.tipo), ETIQUETAS[c.tipo]), nodo('span', 'ver-nombre', c.nombre));
          b.addEventListener('click', () => { cambioElegido = c.nombre; pintarCambios(); });
          li.appendChild(b);
          ul.appendChild(li);
        }
      }
      pintarDiffCambio(cambios);
    }

    function pintarDiffCambio(cambios) {
      const caja = $('#verCambiosDiff');
      caja.replaceChildren();
      const c = cambios.find(x => x.nombre === cambioElegido);
      if (!c) { $('#verCambiosTitulo').textContent = 'Elegí un archivo cambiado de la lista'; return; }
      $('#verCambiosTitulo').textContent = c.nombre;
      if (c.tipo === 'carpeta-agregada' || c.tipo === 'carpeta-eliminada') {
        caja.appendChild(nodo('p', 'nota', ETIQUETAS[c.tipo] + '.'));
        return;
      }
      const cabeza = V.cabezaInstantanea(v) || { archivos: [] };
      const antes = (cabeza.archivos.find(a => a.nombre === c.nombre) || { codigo: '' }).codigo;
      const despues = (snapshotActual().archivos.find(a => a.nombre === c.nombre) || { codigo: '' }).codigo;
      for (const l of H.recortar(H.diff(antes, despues))) caja.appendChild(filaDiff(l));
    }

    $('#verGuardar').addEventListener('click', () => {
      if (commitDesdeActual($('#verMensaje').value.trim())) {
        $('#verMensaje').value = '';
        pintarTodo();
        if (cfg.estado) cfg.estado('versión guardada', 'ok');
      }
    });
    $('#verMensaje').addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); $('#verGuardar').click(); } });

    /* --------------------------- Versiones guardadas ------------------------ */
    function pintarVersiones() {
      const ul = $('#verLista');
      ul.replaceChildren();
      const commits = v.confirmaciones.slice().sort((a, b) => b.fecha - a.fecha);
      if (!commits.length) {
        const li = nodo('li');
        li.appendChild(nodo('p', 'nota', 'Todavía no guardaste ninguna versión. Se guardan desde la pestaña «Cambios».'));
        ul.appendChild(li);
      }
      for (const c of commits) {
        const li = nodo('li', 'his-item' + (c.id === verElegida ? ' elegida' : ''));
        const b = nodo('button', 'his-btn');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(c.id === verElegida));
        const cab = nodo('div', 'his-cab');
        cab.append(nodo('span', 'his-fecha', H.fecha(c.fecha)),
                   nodo('span', 'his-tipo ' + (c.tipo === 'fusion' ? 'restauracion' : 'manual'),
                        c.tipo === 'fusion' ? 'unión de otra compu' : 'guardada a mano'));
        const cuerpo = nodo('div', 'his-mensaje', c.mensaje || '(sin mensaje)');
        const padre = c.padres[0] ? V.commitPorId(v, c.padres[0]) : null;
        const cambios = V.diffArchivos(padre ? padre.instantanea : { archivos: [], carpetas: [] }, c.instantanea);
        const pie = nodo('div', 'his-mini',
          `${c.instantanea.archivos.length} archivo(s) · ${cambios.length ? cambios.length + ' cambiado(s) desde la anterior' : 'sin cambios respecto de la anterior'}`);
        b.append(cab, cuerpo, pie);
        b.addEventListener('click', () => { verElegida = c.id; verCompararConActual = false; pintarVersiones(); });
        li.appendChild(b);
        ul.appendChild(li);
      }
      pintarDiffVersion();
    }

    function pintarDiffVersion() {
      const c = V.commitPorId(v, verElegida);
      const caja = $('#verDiff');
      caja.replaceChildren();
      $('#verAcciones').classList.toggle('oculto', !c);
      if (!c) { $('#verTitulo').textContent = 'Elegí una versión de la lista'; $('#verResumen').textContent = ''; return; }
      $('#verTitulo').textContent = H.fecha(c.fecha) + ' — ' + (c.mensaje || '(sin mensaje)');
      $('#verComparar').textContent = verCompararConActual ? 'Comparar con la versión anterior' : 'Comparar con mi trabajo';
      const padre = c.padres[0] ? V.commitPorId(v, c.padres[0]) : null;
      const contra = verCompararConActual ? snapshotActual() : (padre ? padre.instantanea : { archivos: [], carpetas: [] });
      const cambios = V.diffArchivos(c.instantanea, contra);
      $('#verResumen').textContent = cambios.length
        ? `${cambios.length} archivo(s) distinto(s) de ${verCompararConActual ? 'lo que tenés ahora' : 'la versión anterior'}.`
        : `Es igual a ${verCompararConActual ? 'lo que tenés ahora' : 'la versión anterior'}.`;
      for (const ch of cambios) {
        const fila = nodo('div', 'ver-cambio-fila');
        fila.append(nodo('span', 'ver-etiqueta-tipo ' + claseTipo(ch.tipo), ETIQUETAS[ch.tipo]), nodo('span', 'ver-nombre', ch.nombre));
        caja.appendChild(fila);
      }
    }

    $('#verComparar').addEventListener('click', () => { verCompararConActual = !verCompararConActual; pintarDiffVersion(); });
    $('#verRestaurar').addEventListener('click', () => {
      const c = V.commitPorId(v, verElegida);
      if (!c) return;
      if (!confirm(`¿Volver a la versión del ${H.fecha(c.fecha)}? Lo que tenés ahora se guarda antes, así que no se pierde nada.`)) return;
      commitDesdeActual('Antes de volver a una versión anterior');
      aplicarSnapshot(c.instantanea);
      commitDesdeActual('Vuelta a: ' + (c.mensaje || 'una versión sin mensaje'));
      pintarTodo();
      if (cfg.estado) cfg.estado('versión restaurada', 'ok');
      dlg.close();
    });

    /* --------------------------- Pasar a otra compu -------------------------- */
    async function llevarProyecto() {
      commitDesdeActual('Antes de llevar el proyecto a otra computadora');
      try {
        const bytes = await global.Carpeta.comprimirJSON(V.empaquetar(v));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/gzip' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'proyecto' + EXTENSION;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) { alert('No se pudo armar el archivo del proyecto.'); }
    }

    function pintarConflictos() {
      const ul = $('#verConflictosLista');
      ul.replaceChildren();
      pendienteFusion.combinado.conflictos.forEach((c, i) => {
        if (!pendienteFusion.elecciones[c.nombre]) pendienteFusion.elecciones[c.nombre] = 'local';
        const li = nodo('li', 'ver-conflicto');
        li.appendChild(nodo('p', 'ver-conflicto-nombre', c.nombre));
        const grupo = 'verConf' + i;
        const fila = nodo('div', 'dlg-fila');
        [
          ['local', c.local ? 'Quedarme con la de esta compu' : 'Borrarlo (acá lo borraste)'],
          ['remoto', c.remoto ? 'Usar la que trajiste' : 'Borrarlo (en el otro lado lo borraron)'],
          ['ambos', 'Guardar las dos (a la que trajiste le cambio el nombre)']
        ].forEach(([valor, etiqueta]) => {
          const label = nodo('label', 'ver-opcion');
          const input = document.createElement('input');
          input.type = 'radio';
          input.name = grupo;
          input.value = valor;
          input.checked = pendienteFusion.elecciones[c.nombre] === valor;
          input.addEventListener('change', () => { pendienteFusion.elecciones[c.nombre] = valor; });
          label.append(input, document.createTextNode(' ' + etiqueta));
          fila.appendChild(label);
        });
        li.appendChild(fila);
        const caja = nodo('div', 'his-diff ver-conflicto-diff');
        for (const l of H.recortar(H.diff(c.local ? c.local.codigo : '', c.remoto ? c.remoto.codigo : ''))) caja.appendChild(filaDiff(l));
        li.appendChild(caja);
        ul.appendChild(li);
      });
      $('#verConflictos').classList.remove('oculto');
    }

    function aplicarFusion() {
      const { unido, padres, combinado, elecciones } = pendienteFusion;
      const archivos = combinado.archivos.slice();
      for (const c of combinado.conflictos) {
        const eleccion = elecciones[c.nombre] || 'local';
        if (eleccion === 'local' && c.local) archivos.push(c.local);
        else if (eleccion === 'remoto' && c.remoto) archivos.push(c.remoto);
        else if (eleccion === 'ambos') {
          if (c.local) archivos.push(c.local);
          if (c.remoto) archivos.push(Object.assign({}, c.remoto, { nombre: global.Proyecto.nombreLibre(archivos, c.nombre) }));
        }
      }
      const instFinal = V.normalizarInstantanea({ archivos, carpetas: combinado.carpetas });
      const fus = V.commitFusion(unido, instFinal, padres, 'Cambios unidos de otra computadora', { generarId, ahora: Date.now });
      if (fus.error) { alert(fus.error); return; }
      v = fus.versionado;
      grabar();
      aplicarSnapshot(instFinal);
      pendienteFusion = null;
      $('#verConflictos').classList.add('oculto');
      pintarTodo();
      if (cfg.estado) cfg.estado('cambios unidos', 'ok');
    }

    async function traerCambios(archivo) {
      if (archivo.size > global.Carpeta.LIMITES.archivo) { alert('Ese archivo es demasiado grande para ser un proyecto de ESLE2.'); return; }
      let paquete;
      try { paquete = await global.Carpeta.descomprimirJSON(new Uint8Array(await archivo.arrayBuffer())); }
      catch (e) { paquete = null; }
      const remoto = paquete && V.desempaquetar(paquete);
      if (!remoto) { alert('Ese archivo no es un paquete de versiones de ESLE2, o está roto.'); return; }
      if (remoto.variante !== cfg.variante) {
        alert(`Ese archivo es de otro dialecto de ESLE2 (${remoto.variante}); no se puede traer acá.`);
        return;
      }

      /* Un proyecto que todavía no guardó ninguna versión no tiene nada que
         proteger: adoptar el que llega entero es lo que se espera —es
         exactamente el caso de «traje mi trabajo a esta compu nueva»— y no
         hay que generarle una versión vacía antes solo para después
         rechazarla por ser «de otro proyecto». */
      if (!v.confirmaciones.length && v.idProyecto !== remoto.idProyecto) {
        v = remoto;
        grabar();
        const cabeza = V.cabezaInstantanea(v);
        if (cabeza) aplicarSnapshot(cabeza);
        pintarTodo();
        if (cfg.estado) cfg.estado('proyecto traído', 'ok');
        return;
      }

      /* De acá en más sí hay algo que proteger: se guarda antes de tocar
         nada, así que pase lo que pase después esto nunca se pierde. */
      commitDesdeActual('Antes de traer cambios de otra computadora');

      if (v.idProyecto !== remoto.idProyecto) {
        alert('Ese archivo es de OTRO proyecto, no de este (tiene su propio historial, separado). ' +
              'Para traerlo como algo nuevo, aparte de lo que tenés, usá «Importar» en el Explorador de archivos.');
        return;
      }

      const fus = V.fusionarGrafos(v, remoto);
      if (fus.error) { alert(fus.error); return; }
      const unido = fus.versionado;

      if (!remoto.cabeza || unido.cabeza === remoto.cabeza || V.esAntecesor(unido, remoto.cabeza, unido.cabeza)) {
        v = unido; grabar(); pintarTodo();
        if (cfg.estado) cfg.estado('ya tenías esos cambios', 'ok');
        return;
      }
      if (!unido.cabeza || V.esAntecesor(unido, unido.cabeza, remoto.cabeza)) {
        unido.cabeza = remoto.cabeza;
        v = unido; grabar();
        aplicarSnapshot(V.cabezaInstantanea(v));
        pintarTodo();
        if (cfg.estado) cfg.estado('cambios incorporados en esta compu', 'ok');
        return;
      }

      const idBase = V.ancestroComun(unido, unido.cabeza, remoto.cabeza);
      const baseInst = idBase ? V.commitPorId(unido, idBase).instantanea : { archivos: [], carpetas: [] };
      const localInst = V.commitPorId(unido, unido.cabeza).instantanea;
      const remotoInst = V.commitPorId(unido, remoto.cabeza).instantanea;
      pendienteFusion = { unido, padres: [unido.cabeza, remoto.cabeza], combinado: V.combinar(baseInst, localInst, remotoInst), elecciones: {} };
      if (!pendienteFusion.combinado.conflictos.length) aplicarFusion();
      else pintarConflictos();
    }

    $('#verLlevar').addEventListener('click', llevarProyecto);
    $('#verTraer').addEventListener('click', () => {
      const campo = document.createElement('input');
      campo.type = 'file';
      campo.accept = EXTENSION;
      campo.addEventListener('change', () => {
        const f = campo.files && campo.files[0];
        if (f) traerCambios(f);
      });
      campo.click();
    });
    $('#verConflictosAplicar').addEventListener('click', aplicarFusion);
    $('#verConflictosCancelar').addEventListener('click', () => {
      pendienteFusion = null;
      $('#verConflictos').classList.add('oculto');
    });

    /* --------------------------------- abrir --------------------------------- */
    $('#btnHistorial').addEventListener('click', () => {
      v = V.cargar(cfg.claveVersiones) || V.vacio(cfg.variante, generarId);
      activarTab(0, false);
      dlg.showModal();
    });

    return { abrir: () => $('#btnHistorial').click() };
  }

  global.VersionesUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

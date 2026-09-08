/*
 * Modo examen.
 *
 * Un profesor arma un examen —qué ejercicios entran y cuánto dura—, lo reparte
 * como archivo, y el alumno lo rinde en el mismo IDE: cronómetro arriba, sin
 * pistas y sin la lista del curso. Al entregar (o al terminarse el tiempo), el
 * navegador corrige solo cada ejercicio y baja una entrega con los resultados,
 * el código escrito y los tiempos. El profesor abre esa entrega acá mismo.
 *
 * No hay servidor: todo viaja en archivos. El examen no "vigila" a nadie —eso
 * no se puede hacer honestamente sin uno—, pero deja constancia de qué se
 * entregó, cuándo y qué pruebas pasó.
 *
 * La parte que se puede probar sin navegador (armar el paquete, corregir una
 * entrega, calcular el tiempo) vive en funciones puras, al final del archivo.
 */
(function (global) {
  'use strict';

  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };

  /* Exámenes armados de antemano, para no elegir uno por uno cada vez. Si un
     ejercicio no está (porque el curso cambió), simplemente no entra. */
  const PLANTILLAS = {
    SLE2: [
      { id: 'basico', nombre: 'Primer parcial: lo básico', minutos: 60,
        ids: ['f2', 'f4', 'f5', 'f6', 'm1'] },
      { id: 'arreglos', nombre: 'Parcial de vectores y matrices', minutos: 75,
        ids: ['f14', 'm6', 'm13', 'a2', 'a5'] },
      { id: 'cadenas', nombre: 'Parcial de cadenas', minutos: 75,
        ids: ['m3', 'm4', 'a4', 'a10', 'a16'] },
      { id: 'rapida', nombre: 'Práctica rápida', minutos: 20, ids: ['f1', 'f4', 'f9'] }
    ],
    'ESLE2 POO': [
      { id: 'poo-basico', nombre: 'Primer parcial de objetos', minutos: 60,
        ids: ['p1', 'p2', 'p9', 'p12', 'p14'] },
      { id: 'poo-herencia', nombre: 'Parcial de herencia y polimorfismo', minutos: 75,
        ids: ['p23', 'p24', 'p26', 'p27', 'p36'] },
      { id: 'poo-rapida', nombre: 'Práctica rápida de objetos', minutos: 20,
        ids: ['p1', 'p11', 'p15'] }
    ]
  };

  const plantillasDe = lenguaje => PLANTILLAS[lenguaje] || [];

  /* Planilla del curso: una fila por entrega, una columna por ejercicio. */
  function planilla(entregas) {
    const columnas = [];
    for (const e of entregas) {
      for (const ej of e.ejercicios) if (!columnas.some(c => c.id === ej.id)) columnas.push({ id: ej.id, titulo: ej.titulo });
    }
    const filas = entregas.map(e => {
      const r = resumir(e);
      const casos = {};
      for (const ej of e.ejercicios) casos[ej.id] = { pasadas: ej.pasadas, total: ej.total, minutos: ej.minutos };
      return {
        alumno: e.alumno || 'sin nombre',
        titulo: e.titulo,
        entregado: e.entregado,
        nota: r.nota,
        resueltos: r.resueltos,
        total: r.total,
        minutos: e.ejercicios.reduce((s, x) => s + (x.minutos || 0), 0),
        casos
      };
    });
    filas.sort((a, b) => b.nota - a.nota || a.alumno.localeCompare(b.alumno));
    return { columnas, filas };
  }

  /* La misma planilla en CSV, para abrirla con una planilla de cálculo. */
  function planillaCSV(p) {
    const escapar = v => `"${String(v).replace(/"/g, '""')}"`;
    const cabecera = ['Alumno', 'Nota (%)', 'Resueltos', 'Minutos']
      .concat(p.columnas.map(c => c.titulo)).map(escapar).join(',');
    const filas = p.filas.map(f => [f.alumno, f.nota, `${f.resueltos}/${f.total}`, f.minutos]
      .concat(p.columnas.map(c => {
        const x = f.casos[c.id];
        return x ? `${x.pasadas}/${x.total}` : '';
      })).map(escapar).join(','));
    return [cabecera].concat(filas).join('\n');
  }
  const CLAVE_ESTADO = 'esle2_examen_en_curso';

  /* ------------------------------------------------------------------ */
  /* Funciones puras (las prueba test/test-examen.js)                    */
  /* ------------------------------------------------------------------ */

  /* Un examen listo para repartir. Los ejercicios van enteros: el alumno no
     necesita tener el mismo curso ni los mismos ejercicios propios. */
  function armarPaquete({ titulo, minutos, lenguaje, ejercicios }) {
    if (!titulo || !titulo.trim()) throw new Error('el examen necesita un título');
    if (!(minutos > 0)) throw new Error('la duración tiene que ser mayor que cero');
    if (!ejercicios || !ejercicios.length) throw new Error('elegí al menos un ejercicio');
    return {
      formato: 'esle2-examen',
      version: 1,
      titulo: titulo.trim(),
      minutos: Math.round(minutos),
      lenguaje: lenguaje || 'SLE2',
      creado: new Date().toISOString(),
      ejercicios: ejercicios.map(e => ({
        id: e.id, titulo: e.titulo, nivel: e.nivel,
        enunciado: e.enunciado, plantilla: e.plantilla || '', pruebas: e.pruebas
      }))
    };
  }

  const esPaquete = p => p && p.formato === 'esle2-examen' && Array.isArray(p.ejercicios);
  const esEntrega = e => e && e.formato === 'esle2-entrega' && Array.isArray(e.ejercicios);

  /* Cuánto falta, en segundos. Nunca menos de cero. */
  function segundosRestantes(estado, ahora) {
    const fin = Date.parse(estado.empezado) + estado.minutos * 60000;
    return Math.max(0, Math.round((fin - (ahora || Date.now())) / 1000));
  }

  const reloj = seg => {
    const m = Math.floor(seg / 60), s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  /* Resumen de una entrega: cuántos ejercicios pasaron todas sus pruebas. */
  function resumir(entrega) {
    const total = entrega.ejercicios.length;
    const resueltos = entrega.ejercicios.filter(e => e.pasadas === e.total && e.total > 0).length;
    const casos = entrega.ejercicios.reduce((s, e) => s + e.pasadas, 0);
    const casosTotales = entrega.ejercicios.reduce((s, e) => s + e.total, 0);
    return { total, resueltos, casos, casosTotales, nota: total ? Math.round((resueltos / total) * 100) : 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Interfaz                                                            */
  /* ------------------------------------------------------------------ */
  function crear(cfg) {
    /* cfg: { lenguaje, ejercicios(), abrirEjercicio(ej), codigoActual(),
              evaluar(codigo, pruebas) -> {pasadas, total}, alCambiarModo() }    */
    let dlg = null;
    let estado = null;          // examen en curso, o null
    let cronometro = null;

    /* ------------------------------ estado ----------------------------- */
    const guardar = () => localStorage.setItem(CLAVE_ESTADO, JSON.stringify(estado));
    function recuperar() {
      try {
        const e = JSON.parse(localStorage.getItem(CLAVE_ESTADO) || 'null');
        if (e && e.paquete && e.empezado) estado = e;
      } catch (err) { estado = null; }
    }
    const terminarEstado = () => { estado = null; localStorage.removeItem(CLAVE_ESTADO); };

    /* ------------------------------ diálogo ---------------------------- */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-examen';
      dlg.innerHTML = `
        <h3>Modo examen</h3>
        <p class="nota">Un examen es un archivo: el profesor elige los ejercicios y el tiempo, y el
           alumno lo rinde acá mismo. Al entregar, el navegador corrige solo y baja la entrega.</p>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="armar">Armar un examen</button>
          <button class="btn" data-accion="rendir">Rendir un examen…</button>
          <button class="btn" data-accion="ver">Ver entregas…</button>
          <input type="file" accept=".json,application/json" hidden multiple data-campo="archivo">
        </div>

        <form class="mis-form oculto" data-campo="form">
          <label>Plantilla
            <select data-campo="plantilla">
              <option value="">— armarlo a mano —</option>
            </select>
          </label>
          <div class="mis-grilla">
            <label>Título del examen
              <input type="text" data-campo="titulo" required maxlength="60" placeholder="Parcial 1">
            </label>
            <label>Duración (minutos)
              <input type="number" data-campo="minutos" min="1" max="600" value="60" required>
            </label>
          </div>
          <label>Ejercicios que entran
            <span class="nota">Los que marques viajan enteros dentro del archivo.</span>
          </label>
          <ul class="examen-lista" data-campo="lista"></ul>
          <p class="mis-error" data-campo="error"></p>
          <div class="dlg-fila derecha">
            <button type="button" class="btn" data-accion="cancelar">Cancelar</button>
            <button type="submit" class="btn primario">Bajar el examen</button>
          </div>
        </form>

        <div class="examen-informe oculto" data-campo="informe"></div>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'cancelar') { $$('form').classList.add('oculto'); }
        else if (a === 'armar') abrirFormulario();
        else if (a === 'rendir') { dlg._modo = 'rendir'; $$('archivo').click(); }
        else if (a === 'ver') { dlg._modo = 'ver'; $$('archivo').click(); }
        else if (a === 'csv' && dlg._planilla) {
          const texto = planillaCSV(dlg._planilla);
          const el = document.createElement('a');
          el.href = URL.createObjectURL(new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' }));
          el.download = 'planilla.csv';
          el.click();
          URL.revokeObjectURL(el.href);
        }
      });

      $$('archivo').addEventListener('change', async ev => {
        const archivos = [...ev.target.files];
        ev.target.value = '';
        if (!archivos.length) return;
        const leidos = [];
        for (const f of archivos) {
          try { leidos.push(JSON.parse(await f.text())); }
          catch (e) { alert(`"${f.name}" no es un JSON válido.`); }
        }
        if (!leidos.length) return;
        if (dlg._modo === 'rendir') empezar(leidos[0]);
        else mostrarEntregas(leidos);
      });

      $$('form').addEventListener('submit', ev => {
        ev.preventDefault();
        const elegidos = [...$$('lista').querySelectorAll('input:checked')]
          .map(i => cfg.ejercicios().find(e => e.id === i.value))
          .filter(Boolean);
        try {
          const paquete = armarPaquete({
            titulo: $$('titulo').value,
            minutos: Number($$('minutos').value),
            lenguaje: cfg.lenguaje,
            ejercicios: elegidos
          });
          bajar(`examen-${paquete.titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, paquete);
          $$('form').classList.add('oculto');
          alert(`Examen listo: ${paquete.ejercicios.length} ejercicio(s), ${paquete.minutos} minutos.`);
        } catch (e) { $$('error').textContent = e.message; }
      });

      /* Las plantillas completan el formulario; después se puede tocar todo. */
      function aplicarPlantilla(id) {
        const p = plantillasDe(cfg.lenguaje).find(x => x.id === id);
        if (!p) return;
        $$('titulo').value = p.nombre;
        $$('minutos').value = p.minutos;
        $$('lista').querySelectorAll('input[type="checkbox"]').forEach(i => { i.checked = p.ids.includes(i.value); });
      }

      function abrirFormulario() {
        const ul = $$('lista');
        ul.innerHTML = '';
        for (const e of cfg.ejercicios()) {
          const li = document.createElement('li');
          const id = 'ex-' + e.id;
          li.innerHTML = `<label for="${id}"><input type="checkbox" id="${id}" value="${e.id}"> ` +
            `<span class="mis-tit"></span> <span class="etq ${e.nivel}">${NIVELES[e.nivel] || e.nivel}</span></label>`;
          li.querySelector('.mis-tit').textContent = e.titulo;
          ul.appendChild(li);
        }
        const sel = $$('plantilla');
        sel.innerHTML = '<option value="">— armarlo a mano —</option>' +
          plantillasDe(cfg.lenguaje).map(p =>
            `<option value="${p.id}">${p.nombre} · ${p.ids.length} ejercicios · ${p.minutos} min</option>`).join('');
        sel.onchange = () => aplicarPlantilla(sel.value);
        $$('error').textContent = '';
        $$('form').classList.remove('oculto');
        $$('titulo').focus();
      }

      function mostrarEntregas(lista) {
        const entregas = lista.filter(esEntrega);
        if (!entregas.length) { alert('Ninguno de esos archivos es una entrega de examen.'); return; }
        if (entregas.length === 1) return mostrarEntrega(entregas[0]);

        const p = planilla(entregas);
        const cabecera = ['Alumno', 'Nota', 'Resueltos', 'Minutos']
          .concat(p.columnas.map(c => c.titulo)).map(t => `<th>${escapar(t)}</th>`).join('');
        const filas = p.filas.map(f => `<tr>
            <td>${escapar(f.alumno)}</td><td>${f.nota} %</td>
            <td>${f.resueltos}/${f.total}</td><td>${f.minutos}</td>
            ${p.columnas.map(c => {
              const x = f.casos[c.id];
              return `<td>${x ? `${x.pasadas}/${x.total}` : '—'}</td>`;
            }).join('')}
          </tr>`).join('');
        const promedio = Math.round(p.filas.reduce((s, f) => s + f.nota, 0) / p.filas.length);

        $$('informe').innerHTML = `
          <h4>${escapar(entregas[0].titulo)} — ${p.filas.length} entregas</h4>
          <p class="nota">Promedio del curso: ${promedio} %.</p>
          <div class="examen-tabla"><table><tr>${cabecera}</tr>${filas}</table></div>
          <div class="dlg-fila"><button class="btn" data-accion="csv">Bajar planilla (.csv)</button></div>`;
        $$('informe').classList.remove('oculto');
        dlg._planilla = p;
      }

      function mostrarEntrega(entrega) {
        if (!esEntrega(entrega)) { alert('Ese archivo no es una entrega de examen.'); return; }
        const r = resumir(entrega);
        const filas = entrega.ejercicios.map(e => `
          <tr>
            <td>${escapar(e.titulo)}</td>
            <td>${e.pasadas} / ${e.total}</td>
            <td>${e.minutos} min</td>
          </tr>`).join('');
        $$('informe').innerHTML = `
          <h4>${escapar(entrega.alumno || 'sin nombre')} — ${escapar(entrega.titulo)}</h4>
          <p class="nota">Entregado el ${new Date(entrega.entregado).toLocaleString('es')} ·
             ${r.resueltos} de ${r.total} ejercicios (${r.nota} %) · ${r.casos} de ${r.casosTotales} casos.</p>
          <table><tr><th>Ejercicio</th><th>Casos</th><th>Tiempo</th></tr>${filas}</table>
          <p class="nota">El código de cada ejercicio está en el archivo, listo para leerlo o pegarlo en el IDE.</p>`;
        $$('informe').classList.remove('oculto');
      }

      dlg._abrirFormulario = abrirFormulario;
    }

    const escapar = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

    function bajar(nombre, datos) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' }));
      a.download = nombre;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    /* ----------------------------- rendirlo ---------------------------- */
    function empezar(paquete, alumno) {
      if (!esPaquete(paquete)) { alert('Ese archivo no es un examen de ESLE2.'); return; }
      const nombre = alumno !== undefined ? alumno : (prompt('Tu nombre y apellido:', '') || '').trim();
      if (nombre === null) return;
      estado = {
        paquete, alumno: nombre, empezado: new Date().toISOString(),
        minutos: paquete.minutos, actual: 0,
        respuestas: paquete.ejercicios.map(e => ({ id: e.id, codigo: e.plantilla || '', segundos: 0 })),
        ultimoCambio: Date.now()
      };
      guardar();
      if (dlg) dlg.close();
      pintarBanner();
      irA(0);
      if (cfg.alCambiarModo) cfg.alCambiarModo(true);
    }

    /* Guarda lo escrito en el ejercicio actual y el tiempo que llevó. */
    function anotarActual() {
      if (!estado) return;
      const r = estado.respuestas[estado.actual];
      if (!r) return;
      r.codigo = cfg.codigoActual();
      r.segundos += Math.round((Date.now() - estado.ultimoCambio) / 1000);
      estado.ultimoCambio = Date.now();
      guardar();
    }

    function irA(i) {
      if (!estado || i < 0 || i >= estado.paquete.ejercicios.length) return;
      anotarActual();
      estado.actual = i;
      estado.ultimoCambio = Date.now();
      guardar();
      const e = estado.paquete.ejercicios[i];
      cfg.abrirEjercicio(Object.assign({}, e, { pista: '', examen: true }),
        estado.respuestas[i].codigo || e.plantilla || '');
      pintarBanner();
    }

    /* ------------------------------ banner ----------------------------- */
    function pintarBanner() {
      let barra = document.getElementById('bannerExamen');
      if (!estado) { if (barra) barra.remove(); if (cronometro) clearInterval(cronometro); cronometro = null; return; }
      if (!barra) {
        barra = document.createElement('div');
        barra.id = 'bannerExamen';
        barra.className = 'banner examen';
        document.querySelector('.herramientas').after(barra);
        barra.addEventListener('click', ev => {
          const b = ev.target.closest('[data-ir]');
          if (b) irA(Number(b.dataset.ir));
          if (ev.target.closest('#btnEntregar')) entregar('el alumno entregó');
        });
      }
      const total = estado.paquete.ejercicios.length;
      const botones = estado.paquete.ejercicios.map((e, i) =>
        `<button class="chip ${i === estado.actual ? 'activa' : ''}" data-ir="${i}" title="${escapar(e.titulo)}">${i + 1}</button>`).join('');
      barra.innerHTML = `
        <div><strong>${escapar(estado.paquete.titulo)}</strong>
          <span class="nota">· ${escapar(estado.alumno || 'sin nombre')} · ejercicio ${estado.actual + 1} de ${total}</span>
          <span class="examen-chips">${botones}</span>
        </div>
        <div class="banner-acciones">
          <span class="examen-reloj" id="relojExamen">--:--</span>
          <button class="btn primario" id="btnEntregar">Entregar</button>
        </div>`;
      actualizarReloj();
      if (!cronometro) cronometro = setInterval(actualizarReloj, 1000);
    }

    function actualizarReloj() {
      if (!estado) return;
      const seg = segundosRestantes(estado, Date.now());
      const r = document.getElementById('relojExamen');
      if (r) {
        r.textContent = reloj(seg);
        r.classList.toggle('poco', seg <= 300);
      }
      if (seg === 0) entregar('se terminó el tiempo');
    }

    /* ----------------------------- entregar ---------------------------- */
    async function entregar(motivo) {
      if (!estado) return;
      if (cronometro) { clearInterval(cronometro); cronometro = null; }
      anotarActual();
      const paquete = estado.paquete;

      const ejercicios = [];
      for (let i = 0; i < paquete.ejercicios.length; i++) {
        const e = paquete.ejercicios[i];
        const r = estado.respuestas[i];
        let resultado = { pasadas: 0, total: e.pruebas.length };
        try { resultado = await cfg.evaluar(r.codigo, e.pruebas); }
        catch (err) { resultado = { pasadas: 0, total: e.pruebas.length, error: String(err.message || err) }; }
        ejercicios.push({
          id: e.id, titulo: e.titulo, nivel: e.nivel,
          codigo: r.codigo, segundos: r.segundos, minutos: Math.round(r.segundos / 60),
          pasadas: resultado.pasadas, total: resultado.total, error: resultado.error || null
        });
      }

      const entrega = {
        formato: 'esle2-entrega', version: 1,
        titulo: paquete.titulo, alumno: estado.alumno, lenguaje: paquete.lenguaje,
        empezado: estado.empezado, entregado: new Date().toISOString(), motivo,
        ejercicios
      };
      const r = resumir(entrega);
      bajar(`entrega-${(estado.alumno || 'alumno').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`, entrega);
      terminarEstado();
      pintarBanner();
      if (cfg.alCambiarModo) cfg.alCambiarModo(false);
      alert(`Examen entregado (${motivo}).\n\n` +
            `${r.resueltos} de ${r.total} ejercicios resueltos (${r.nota} %).\n` +
            `${r.casos} de ${r.casosTotales} casos de prueba.\n\n` +
            'Se bajó el archivo de entrega: mandáselo a tu profesor.');
      return entrega;
    }

    /* ------------------------------ público ---------------------------- */
    recuperar();
    if (estado) setTimeout(() => { pintarBanner(); irA(estado.actual); if (cfg.alCambiarModo) cfg.alCambiarModo(true); }, 0);

    return {
      abrir() { if (!dlg) construir(); dlg.showModal(); },
      get enExamen() { return !!estado; },
      anotarActual,
      empezar,
      entregar
    };
  }

  global.Examen = { crear, armarPaquete, resumir, segundosRestantes, reloj, esPaquete, esEntrega,
    PLANTILLAS, plantillasDe, planilla, planillaCSV };
})(typeof window !== 'undefined' ? window : globalThis);

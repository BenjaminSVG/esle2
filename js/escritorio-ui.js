/*
 * El diálogo de la prueba de escritorio: la tabla, y cómo llevársela.
 *
 * La tabla la arma js/escritorio.js a partir de las fotos del grabador; acá
 * solo se dibuja. Dos detalles del dibujo que no son adorno:
 *
 *   · las celdas que cambiaron van resaltadas, porque leer la tabla es
 *     justamente seguir esos cambios de arriba abajo;
 *   · la primera columna y la cabecera quedan pegadas al borde al desplazar
 *     (position: sticky). Con veinte pasos y seis variables, sin eso uno se
 *     pierde de qué línea es la fila que está mirando.
 *
 * Se puede llevar en tres formatos porque los trabajos prácticos se entregan
 * de tres maneras: pegada en una planilla (CSV), en un documento de texto
 * (monoespaciado) o en un informe en Markdown.
 *
 * API:  EscritorioUI.iniciar({ codigo, entrada, compilar, ejecutar, mostrarError, estado })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const MAX = 400;

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgEscritorio');
    if (!dlg) return;
    let tabla = null;

    function pintar(t) {
      const caja = $('#pruebaEscritorio');
      caja.replaceChildren();

      if (!t.columnas.length && !t.filas.length) {
        caja.appendChild(nodo('p', 'nota', 'El programa no ejecutó ninguna sentencia.'));
        return;
      }

      const tab = nodo('table', 'tabla-escritorio');
      const thead = nodo('thead');
      const tr = nodo('tr');
      tr.append(nodo('th', 'col-paso', '#'), nodo('th', 'col-linea', 'Línea'),
                nodo('th', 'col-cod', 'Sentencia'));
      for (const c of t.columnas) {
        const th = nodo('th', 'col-var' + (c.ambito === 'local' ? ' local' : ''), c.nombre);
        th.title = c.ambito === 'local' ? 'Variable local de una subrutina' : 'Variable global del programa';
        tr.appendChild(th);
      }
      tr.appendChild(nodo('th', 'col-salida', 'Salida'));
      thead.appendChild(tr);
      tab.appendChild(thead);

      const tbody = nodo('tbody');
      t.filas.forEach(f => {
        const fila = nodo('tr', f.fin ? 'fila-fin' : f.retorno ? 'fila-retorno' : '');
        fila.append(nodo('td', 'col-paso', String(f.paso + 1)),
                    nodo('td', 'col-linea', f.linea ? String(f.linea) : ''),
                    nodo('td', 'col-cod', f.fin ? '(fin del programa)' : f.codigo));
        for (const c of t.columnas) {
          const hay = Object.prototype.hasOwnProperty.call(f.valores, c.id);
          const muerta = !hay && f.liberadas.indexOf(c.id) >= 0;
          const td = nodo('td', 'col-var' + (hay ? ' cambia' : muerta ? ' muere' : ''),
            hay ? String(f.valores[c.id]) : muerta ? '—' : '');
          if (muerta) td.title = 'La subrutina terminó: esta caja ya no existe';
          fila.appendChild(td);
        }
        const sal = nodo('td', 'col-salida', f.salida.replace(/\n/g, '⏎'));
        if (f.salida) sal.title = f.salida;
        fila.appendChild(sal);
        tbody.appendChild(fila);
      });
      tab.appendChild(tbody);
      caja.appendChild(tab);
    }

    async function abrir() {
      const codigo = cfg.codigo();
      try { (cfg.compilar || (() => {}))(codigo); }
      catch (e) { cfg.mostrarError(e); return; }

      const r = await global.Memoria.grabar(codigo, {
        entrada: cfg.entrada(), ejecutar: cfg.ejecutar, maxPasos: MAX
      });
      if (!r.fotos.length) {
        cfg.mostrarError(r.error || new Error('el programa no ejecutó ninguna sentencia'));
        return;
      }

      tabla = global.Escritorio.tabla(r.fotos, { codigo, cortada: r.cortado });
      pintar(tabla);

      const aviso = r.cortado ? 'La tabla llega hasta el paso ' + MAX + ': el programa sigue después.'
        : r.error ? 'El programa cortó con un error: ' + r.error.message
          : '';
      $('#escAviso').textContent = aviso;
      $('#escAviso').classList.toggle('oculto', !aviso);
      $('#escResumen').textContent = tabla.filas.length + ' paso(s) · ' +
        tabla.columnas.length + ' variable(s)';
      dlg.showModal();
    }

    const copiar = async (texto, que) => {
      try {
        await navigator.clipboard.writeText(texto);
        if (cfg.estado) cfg.estado(que + ' copiada', 'ok');
      } catch (e) {
        if (cfg.estado) cfg.estado('no se pudo copiar', 'error');
      }
    };

    const bajar = (texto, nombre, tipo) => {
      const url = URL.createObjectURL(new Blob([texto], { type: tipo }));
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    $('#btnEscritorio').addEventListener('click', abrir);
    $('#btnCerrarEscritorio').addEventListener('click', () => dlg.close());
    $('#escCopiarTexto').addEventListener('click',
      () => tabla && copiar(global.Escritorio.aTexto(tabla), 'La tabla'));
    $('#escCopiarMD').addEventListener('click',
      () => tabla && copiar(global.Escritorio.aMarkdown(tabla), 'La tabla en Markdown'));
    $('#escBajarCSV').addEventListener('click',
      () => tabla && bajar(global.Escritorio.aCSV(tabla), 'prueba-de-escritorio.csv', 'text/csv'));
  }

  global.EscritorioUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

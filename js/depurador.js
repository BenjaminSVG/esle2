/*
 * Depurador paso a paso.
 *
 * El intérprete llama a este módulo antes de cada sentencia (opts.depurador).
 * Cuando el modo está encendido, el depurador marca la línea, muestra las
 * variables vivas y se queda esperando a que pulses «Paso» o «Continuar».
 *
 * La espera usa el mismo mecanismo cancelable que leer() y readkey(), así que
 * el botón «Detener» y la tecla Escape cortan también estando en pausa.
 */
(function (global) {
  'use strict';

  const S = global.SLE2;
  const MAX_ELEM = 8;      // cuántos elementos de un arreglo se muestran

  /* Un valor de SLE2 en una línea de texto. */
  function texto(v, prof) {
    prof = prof || 0;
    if (v === undefined || v === null) return '—';
    if (typeof v === 'number') return S.fmtNum(v);
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'string') return '"' + v + '"';
    if (v && v.clase && v.campos) return '<' + v.clase + ' #' + v.id + '>';   // objeto de ESLE2 POO
    if (Array.isArray(v)) {
      if (prof > 1) return '{…}';
      const partes = v.slice(0, MAX_ELEM).map(x => texto(x, prof + 1));
      if (v.length > MAX_ELEM) partes.push('… +' + (v.length - MAX_ELEM));
      return '{' + partes.join(', ') + '}';
    }
    if (v && v.c) {                                                          // registro
      if (prof > 1) return '{…}';
      return '{' + Object.keys(v.c).map(k => k + ': ' + texto(v.c[k], prof + 1)).join(', ') + '}';
    }
    return String(v);
  }

  /* Un valor dibujado: los vectores como casillas numeradas, los registros y
     los objetos como su lista de campos. Ver la forma del dato ayuda más que
     leerlo en una línea, sobre todo con matrices. */
  const CASILLAS = 12;   // cuántas casillas de un vector se dibujan

  function dibujar(v, prof) {
    prof = prof || 0;

    if (Array.isArray(v) && prof < 2) {
      const caja = document.createElement('div');
      caja.className = 'v-vector';
      v.slice(0, CASILLAS).forEach((x, i) => {
        const c = document.createElement('span');
        c.className = 'v-casilla';
        const idx = document.createElement('b');
        idx.textContent = i + 1;                       // los índices de SLE2 empiezan en 1
        const val = document.createElement('span');
        val.appendChild(dibujar(x, prof + 1));
        c.append(idx, val);
        caja.appendChild(c);
      });
      if (v.length > CASILLAS) {
        const mas = document.createElement('span');
        mas.className = 'v-mas';
        mas.textContent = `+${v.length - CASILLAS}`;
        caja.appendChild(mas);
      }
      return caja;
    }

    const campos = v && v.c ? v.c : (v && v.campos ? v.campos : null);
    if (campos && prof < 2) {
      const caja = document.createElement('div');
      caja.className = 'v-registro';
      if (v.clase) {
        const cab = document.createElement('b');
        cab.className = 'v-clase';
        cab.textContent = `${v.clase} #${v.id}`;
        caja.appendChild(cab);
      }
      for (const k of Object.keys(campos)) {
        const fila = document.createElement('div');
        fila.className = 'v-campo';
        const n = document.createElement('i');
        n.textContent = k;
        fila.append(n, dibujar(campos[k], prof + 1));
        caja.appendChild(fila);
      }
      return caja;
    }

    const simple = document.createElement('span');
    simple.textContent = texto(v, prof);
    return simple;
  }

  /* Variables visibles ahora mismo: primero las locales, después las globales. */
  function ambitos(interp) {
    const salida = [];
    const marco = interp.pila.length ? interp.pila[interp.pila.length - 1] : null;
    if (marco) salida.push({ titulo: marco.nombreSub || 'subrutina', celdas: marco });
    salida.push({ titulo: 'programa', celdas: interp.globales });
    return salida;
  }

  function crearDepurador(cfg) {
    const { editor, panel, cuerpo, esperar, alPausar, alSeguir } = cfg;
    let activo = false;          // modo paso a paso encendido
    let seguir = null;           // resolvedor de la pausa actual
    let linea = 0;
    let marca = null;

    const marcar = l => {
      desmarcar();
      if (l >= 1 && l <= editor.lineCount()) {
        marca = editor.addLineClass(l - 1, 'background', 'linea-actual');
        editor.scrollIntoView({ line: l - 1, ch: 0 }, 60);
      }
    };
    const desmarcar = () => {
      if (marca === null) return;
      editor.removeLineClass(marca, 'background', 'linea-actual');
      marca = null;
    };

    function pintar(interp) {
      cuerpo.innerHTML = '';
      let hay = false;
      for (const a of ambitos(interp)) {
        /* El título va como <caption> de la tabla: un <h4> suelto acá saltea
           niveles de encabezado, y el caption lo lee el lector de pantalla al
           entrar en la tabla, que es cuando sirve. */
        const tabla = document.createElement('table');
        const cap = document.createElement('caption');
        cap.textContent = a.titulo;
        tabla.appendChild(cap);
        for (const [nombre, celda] of a.celdas) {
          if (celda.konst && ['TRUE', 'FALSE', 'SI', 'NO'].includes(nombre)) continue;
          const fila = document.createElement('tr');
          const n = document.createElement('td');
          n.className = 'v-nombre';
          n.textContent = nombre;
          const v = document.createElement('td');
          v.className = 'v-valor';
          v.appendChild(dibujar(celda.v));
          fila.append(n, v);
          tabla.appendChild(fila);
          hay = true;
        }
        if (tabla.querySelectorAll('tr').length === 0) {
          const p = document.createElement('p');
          p.className = 'nota';
          p.textContent = a.titulo + ': sin variables';
          cuerpo.appendChild(p);
        } else cuerpo.appendChild(tabla);
      }
      return hay;
    }

    return {
      get activo() { return activo; },
      get enPausa() { return seguir !== null; },
      get linea() { return linea; },

      encender() {
        activo = true;
        panel.classList.remove('oculto');
      },

      /* Sale del modo paso a paso; si estaba detenido, deja seguir al programa. */
      apagar(ocultarPanel) {
        activo = false;
        desmarcar();
        if (ocultarPanel) panel.classList.add('oculto');
        this.paso();
      },

      paso() {
        if (!seguir) return;
        const r = seguir;
        seguir = null;
        if (alSeguir) alSeguir();
        r();
      },

      terminar() {
        activo = false;
        seguir = null;
        desmarcar();
        panel.classList.add('oculto');
      },

      /* Lo que llama el intérprete antes de cada sentencia. */
      async hook(l, interp) {
        if (!activo) return;
        linea = l;
        marcar(l);
        pintar(interp);
        if (alPausar) alPausar(l);
        await esperar(terminar => {
          seguir = terminar;
          return () => { seguir = null; };
        });
      }
    };
  }

  /* dibujar() sale afuera para que la línea de tiempo (js/viaje-ui.js) muestre
     las variables exactamente igual que el depurador: dos dibujos distintos
     para lo mismo es la forma más barata de confundir a alguien. */
  global.ESLE2Depurador = { crearDepurador, texto, dibujar };
})(window);

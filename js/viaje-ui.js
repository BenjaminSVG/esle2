/*
 * Viajar en el tiempo, la parte que se ve.
 *
 * Una barra debajo del área de trabajo con la película de la última ejecución.
 * Se arrastra y todo el IDE se mueve con ella: la línea que se estaba
 * ejecutando se marca en el editor, las variables del panel vuelven al valor
 * que tenían en ese instante, y la pantalla y el lienzo se vuelven a dibujar
 * hasta ahí —lo dibujado después se borra, y si vas para adelante se vuelve a
 * pintar—.
 *
 * Rehacer la pantalla desde cero en cada movimiento suena caro y no lo es: son
 * unas pocas miles de operaciones sobre un modelo de texto y un canvas de
 * 320×200. Guardar una imagen por paso, eso sí sería caro.
 *
 * Lo que cambió respecto del paso anterior se marca. Es la mitad del valor de
 * todo esto: ver los números no alcanza, hay que ver cuál se movió.
 *
 * API:  ViajeUI.iniciar({ editor, pantalla, lienzo, panelVars, varsCuerpo,
 *                         area, boton, estado, alTerminar })
 */
(function (global) {
  'use strict';

  const PASO_MS = 110;         // cuánto dura un paso cuando se reproduce sola

  function iniciar(cfg) {
    const editor = cfg.editor;
    const D = global.ESLE2Depurador;
    let g = null;                // la grabación actual
    let i = 0;                   // en qué paso estamos
    let barra = null;
    let marca = null;
    let reloj = null;

    /* ---------------------------- la barra ---------------------------- */
    function construir() {
      if (barra) return;
      barra = document.createElement('div');
      barra.className = 'viaje oculto';
      barra.setAttribute('aria-label', 'Línea de tiempo de la ejecución');
      barra.innerHTML = `
        <div class="viaje-mandos">
          <button class="btn mini-btn" data-accion="inicio" title="Volver al principio"
                  aria-label="Volver al principio">⏮</button>
          <button class="btn mini-btn" data-accion="atras" title="Un paso atrás"
                  aria-label="Un paso atrás">◀</button>
          <button class="btn mini-btn" data-accion="jugar" title="Reproducir"
                  aria-label="Reproducir">▶</button>
          <button class="btn mini-btn" data-accion="adelante" title="Un paso adelante"
                  aria-label="Un paso adelante">▶|</button>
        </div>
        <input type="range" class="viaje-barra" data-campo="barra" min="0" max="0" value="0"
               aria-label="Paso de la ejecución">
        <span class="viaje-donde" data-campo="donde" aria-live="polite"></span>
        <button class="btn mini-btn" data-accion="cerrar" title="Cerrar la línea de tiempo">Cerrar</button>
        <p class="viaje-nota" data-campo="nota"></p>`;

      const area = cfg.area || document.querySelector('.area');
      area.parentNode.insertBefore(barra, area.nextSibling);

      const rango = barra.querySelector('[data-campo="barra"]');
      rango.addEventListener('input', () => { parar(); ir(Number(rango.value)); });

      barra.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') cerrar();
        else if (a === 'jugar') (reloj ? parar() : jugar());
        else { parar(); ir(a === 'inicio' ? 0 : a === 'atras' ? i - 1 : i + 1); }
      });
    }

    const campo = c => barra.querySelector(`[data-campo="${c}"]`);

    /* -------------------------- marcar la línea ----------------------- */
    function marcar(l) {
      desmarcar();
      if (l >= 1 && l <= editor.lineCount()) {
        marca = editor.addLineClass(l - 1, 'background', 'linea-actual');
        editor.scrollIntoView({ line: l - 1, ch: 0 }, 60);
      }
    }
    function desmarcar() {
      if (marca === null) return;
      editor.removeLineClass(marca, 'background', 'linea-actual');
      marca = null;
    }

    /* ------------------------ rehacer la pantalla --------------------- */
    /* Se borra todo y se vuelve a hacer lo que el programa había pedido hasta
       ese paso. Es lo que hace que ir para atrás borre de verdad lo dibujado
       y no quede el rastro del futuro. */
    function repintar(paso) {
      const p = cfg.pantalla, l = cfg.lienzo;
      if (p) p.limpiar();
      if (l) l.limpiar(0);
      for (const o of global.Viaje.opsHasta(g, paso)) {
        try {
          switch (o.op) {
            case 'imprimir':  if (p) p.escribir(o.args[0]); break;
            case 'limpiar':   if (p) p.limpiar(); break;
            case 'setColor':  if (p) p.setColor(o.args[0], o.args[1]); break;
            case 'setCurpos': if (p) p.setCurpos(o.args[0], o.args[1]); break;
            case 'pixel':     if (l) l.pixel(o.args[0], o.args[1], o.args[2]); break;
            case 'linea':     if (l) l.linea(o.args[0], o.args[1], o.args[2], o.args[3], o.args[4]); break;
            case 'rect':      if (l) l.rect(o.args[0], o.args[1], o.args[2], o.args[3], o.args[4]); break;
            case 'circulo':   if (l) l.circulo(o.args[0], o.args[1], o.args[2], o.args[3]); break;
            case 'limpiarLienzo': if (l) l.limpiar(o.args[0]); break;
            default: break;    // beep y compañía: no se rehacen
          }
        } catch (e) { /* una operación rara no puede arruinar el viaje */ }
      }
    }

    /* ------------------- saltar a donde algo cambió -------------------- */
    /* Los pasos donde se mueve cada variable se calculan una sola vez por
       grabación y se guardan: recorrer los cuatro mil pasos en cada clic se
       nota, y acá el clic tiene que contestar en el acto. */
    let dondeCambia = new Map();

    function vecesQueCambia(nombre) {
      if (!g) return 0;
      if (!dondeCambia.has(nombre)) {
        dondeCambia.set(nombre, global.Viaje.pasosDondeCambia(g, nombre));
      }
      return dondeCambia.get(nombre).length;
    }

    /* Del paso actual al próximo donde esa variable cambia. Al llegar al
       último vuelve al primero en vez de quedarse mudo: con un ciclo, «la
       próxima» después de la última es la primera, y un botón que deja de
       hacer nada parece roto. */
    function saltarA(nombre) {
      vecesQueCambia(nombre);
      const pasos = dondeCambia.get(nombre) || [];
      if (!pasos.length) return;
      const siguiente = pasos.find(x => x > i);
      const destino = siguiente === undefined ? pasos[0] : siguiente;
      const cual = pasos.indexOf(destino) + 1;
      ir(destino);
      if (cfg.estado) {
        cfg.estado(nombre + ' cambia en el paso ' + destino
          + ' (' + cual + ' de ' + pasos.length + ')'
          + (siguiente === undefined && pasos.length > 1 ? ', volviendo al principio' : ''));
      }
    }

    /* -------------------------- las variables ------------------------- */
    function pintarVariables(paso) {
      const cuerpo = cfg.varsCuerpo;
      if (!cuerpo) return;
      cuerpo.replaceChildren();
      const cambiadas = new Set(global.Viaje.cambios(g, paso).map(c => c.ambito + '::' + c.nombre));
      for (const amb of g.pasos[paso].ambitos) {
        if (!amb.vars.length) {
          const p = document.createElement('p');
          p.className = 'nota';
          p.textContent = amb.titulo + ': sin variables';
          cuerpo.appendChild(p);
          continue;
        }
        /* El título va como <caption> de la tabla y no como encabezado suelto:
           un <h4> acá saltea niveles, y además el lector de pantalla lee el
           caption al entrar en la tabla, que es justo cuando hace falta. */
        const tabla = document.createElement('table');
        const cap = document.createElement('caption');
        cap.textContent = amb.titulo;
        tabla.appendChild(cap);
        for (const v of amb.vars) {
          const fila = document.createElement('tr');
          if (cambiadas.has(amb.titulo + '::' + v.nombre)) fila.className = 'cambio';
          const n = document.createElement('td');
          n.className = 'v-nombre';
          /* El nombre es un botón: lleva al próximo paso donde ESA variable
             cambia. Buscar eso arrastrando la barra es el trabajo que la
             máquina tendría que hacer sola, y es la pregunta que uno se hace
             de verdad: «¿dónde se me volvió cero?».
             Botón y no un clic sobre la fila, para que se llegue con Tab. */
          const salto = document.createElement('button');
          salto.type = 'button';
          salto.className = 'v-salto';
          salto.textContent = v.nombre;
          const cuantos = vecesQueCambia(v.nombre);
          salto.disabled = cuantos === 0;
          salto.title = cuantos === 0
            ? v.nombre + ' no cambia en toda la ejecución'
            : v.nombre + ' cambia ' + cuantos + (cuantos === 1 ? ' vez' : ' veces')
              + ': ir a la próxima';
          salto.setAttribute('aria-label', salto.title);
          salto.addEventListener('click', () => saltarA(v.nombre));
          n.appendChild(salto);
          const val = document.createElement('td');
          val.className = 'v-valor';
          /* El mismo dibujo del depurador: los vectores como casillas, los
             registros y los objetos como su lista de campos. */
          val.appendChild(D && D.dibujar ? D.dibujar(v.valor) : document.createTextNode(String(v.valor)));
          fila.append(n, val);
          tabla.appendChild(fila);
        }
        cuerpo.appendChild(tabla);
      }
    }

    /* ------------------------------ moverse --------------------------- */
    function ir(n) {
      if (!g || !g.pasos.length) return;
      i = Math.max(0, Math.min(g.pasos.length - 1, n));
      const p = g.pasos[i];
      marcar(p.linea);
      pintarVariables(i);
      repintar(i);
      campo('barra').value = String(i);
      const cambios = global.Viaje.cambios(g, i);
      campo('donde').textContent = `paso ${i + 1} de ${g.pasos.length} · línea ${p.linea}`
        + (cambios.length ? ' · cambió ' + cambios.map(c => c.nombre).join(', ') : '');
      if (i >= g.pasos.length - 1) parar();
    }

    function jugar() {
      if (!g) return;
      if (i >= g.pasos.length - 1) ir(0);
      reloj = setInterval(() => ir(i + 1), PASO_MS);
      barra.querySelector('[data-accion="jugar"]').textContent = '⏸';
      barra.querySelector('[data-accion="jugar"]').setAttribute('aria-label', 'Pausar');
    }
    function parar() {
      if (!reloj) return;
      clearInterval(reloj);
      reloj = null;
      const b = barra.querySelector('[data-accion="jugar"]');
      b.textContent = '▶';
      b.setAttribute('aria-label', 'Reproducir');
    }

    /* ------------------------- abrir y cerrar ------------------------- */
    function mostrar(grabacion) {
      dondeCambia = new Map();   // la película es otra: las cuentas viejas no sirven
      construir();
      g = grabacion;
      if (!g || !g.pasos.length) {
        cerrar();
        if (cfg.estado) cfg.estado('no se grabó ningún paso');
        return;
      }
      barra.classList.remove('oculto');
      if (cfg.panelVars) cfg.panelVars.classList.remove('oculto');
      campo('barra').max = String(g.pasos.length - 1);
      campo('nota').textContent = global.Viaje.resumen(g);
      campo('nota').classList.toggle('aviso', g.motivo === 'tope' || g.motivo === 'error');
      /* Se abre en el final: es lo que la persona acaba de ver ejecutarse, y
         desde ahí lo natural es ir para atrás a buscar dónde se torció. */
      ir(g.pasos.length - 1);
      campo('barra').focus();
    }

    function cerrar() {
      parar();
      desmarcar();
      if (barra) barra.classList.add('oculto');
      if (cfg.panelVars) cfg.panelVars.classList.add('oculto');
      g = null;
      if (cfg.alTerminar) cfg.alTerminar();
    }

    return {
      mostrar, cerrar, ir,
      get abierta() { return !!g; },
      get paso() { return i; }
    };
  }

  global.ViajeUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

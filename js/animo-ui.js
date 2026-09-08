/*
 * El cartel de «¿te trabaste?», enchufado a la página.
 *
 * Decide js/animo.js; acá se pinta y se guarda el estado entre recargas
 * (trabarse a las 11 y volver a las 11:05 es la misma sesión de trabajo, y si
 * se perdiera la cuenta al recargar no se enteraría nunca).
 *
 * Va adentro de la salida y no en un cartel flotante: la salida ya es una
 * región que se anuncia sola, ya se mira después de cada ejecución, y no
 * tapa nada. No roba el foco ni interrumpe: quien está escribiendo, sigue.
 *
 * API:  AnimoUI.iniciar({ clave, consola, alaLinea, activo })
 *         -> { registrar({ error, linea }), apagado() }
 */
(function (global) {
  'use strict';

  function iniciar(cfg) {
    const clave = cfg.clave || 'esle2_animo';
    const claveApagado = clave + '_no';

    const apagado = () => localStorage.getItem(claveApagado) === '1';

    const leer = () => {
      try { return JSON.parse(localStorage.getItem(clave) || 'null') || global.Animo.vacio(); }
      catch (e) { return global.Animo.vacio(); }
    };
    const guardar = e => { try { localStorage.setItem(clave, JSON.stringify(e)); } catch (x) { /* modo privado */ } };

    /* Un error de compilación (o null si compiló). Devuelve true si dijo algo. */
    function registrar(evento) {
      if (apagado() || !global.Animo) return false;
      const r = global.Animo.evaluar(leer(), {
        error: evento && evento.error ? String(evento.error) : null,
        linea: evento && evento.linea,
        ahora: Date.now()
      }, cfg.opciones);
      guardar(r.estado);
      if (r.aviso) pintar(r.aviso);
      return !!r.aviso;
    }

    function pintar(aviso) {
      const caja = cfg.consola;
      if (!caja) return;

      const c = document.createElement('div');
      c.className = 'animo';

      const h = document.createElement('strong');
      h.textContent = aviso.titulo;
      const p = document.createElement('p');
      p.textContent = aviso.texto;
      c.append(h, p);

      const fila = document.createElement('div');
      fila.className = 'animo-acciones';

      const hacer = document.createElement('button');
      hacer.type = 'button';
      hacer.className = 'btn chico';
      hacer.textContent = aviso.accion;
      hacer.addEventListener('click', () => {
        if (aviso.paso === 0) { if (cfg.alaLinea && aviso.linea) cfg.alaLinea(aviso.linea); }
        else respiro(c, hacer);
      });

      const basta = document.createElement('button');
      basta.type = 'button';
      basta.className = 'btn chico';
      basta.textContent = 'No me lo muestres más';
      basta.title = 'No volver a avisar en este navegador';
      basta.addEventListener('click', () => {
        localStorage.setItem(claveApagado, '1');
        c.replaceChildren(document.createTextNode('Listo, no te lo muestro más.'));
      });

      fila.append(hacer, basta);
      c.appendChild(fila);
      caja.appendChild(c);
      caja.scrollTop = caja.scrollHeight;
    }

    /* Los treinta segundos. Se cuentan en voz alta —bueno, en pantalla— para
       que sea un rato de verdad y no un botón que no hace nada. */
    function respiro(caja, boton) {
      let quedan = 30;
      boton.disabled = true;
      const p = document.createElement('p');
      p.className = 'animo-cuenta';
      p.setAttribute('role', 'status');
      p.textContent = 'Quedan 30 segundos. Mirá por la ventana, tomá agua, estirate.';
      caja.appendChild(p);
      const reloj = setInterval(() => {
        quedan--;
        if (quedan > 0) { p.textContent = 'Quedan ' + quedan + ' segundos.'; return; }
        clearInterval(reloj);
        p.textContent = 'Listo. Ahora leé la línea del error de nuevo, en voz alta si podés.';
        boton.disabled = false;
        boton.textContent = 'Otros 30 segundos';
      }, 1000);
    }

    return { registrar, apagado };
  }

  global.AnimoUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

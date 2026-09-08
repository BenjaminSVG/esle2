/*
 * El diálogo del historial: la lista de versiones a la izquierda y, a la
 * derecha, qué cambió entre la versión elegida y el código que hay ahora en
 * el editor. Desde ahí se restaura, se borra y se guarda una versión a mano.
 *
 * Las cuentas las hace js/historial.js; acá se dibuja y se guarda.
 *
 * API:  HistorialUI.iniciar({ clave, codigo, entrada, aplicar, estado })
 *         -> { registrar(tipo, mensaje) }
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function iniciar(cfg) {
    const dlg = $('#dlgHistorial');
    if (!dlg) return null;

    const H = global.Historial;
    let lista = H.cargar(cfg.clave);
    let elegida = null;    // id de la versión seleccionada

    /* --------------------------- guardar ---------------------------- */
    function registrar(tipo, mensaje) {
      /* agregar() devuelve la misma lista cuando el código no cambió. */
      const nueva = H.agregar(lista, {
        codigo: cfg.codigo(), entrada: cfg.entrada(), tipo, mensaje
      });
      if (nueva === lista) return false;
      lista = nueva;
      H.guardar(cfg.clave, lista);
      return true;
    }

    /* --------------------------- dibujar ---------------------------- */
    function pintarLista() {
      const ul = $('#hisLista');
      ul.replaceChildren();
      if (!lista.length) {
        ul.appendChild(nodo('p', 'nota', 'Todavía no hay ninguna versión guardada. ' +
          'Se van a ir guardando solas cuando ejecutes el programa, y podés guardar una ' +
          'ahora mismo con el botón de arriba.'));
        return;
      }
      const ahora = cfg.codigo();
      for (const v of lista) {
        const r = H.resumen(H.diff(v.codigo, ahora));
        const li = nodo('li', 'his-item' + (v.id === elegida ? ' elegida' : ''));
        const b = nodo('button', 'his-btn');
        b.type = 'button';
        b.setAttribute('aria-pressed', String(v.id === elegida));
        const cab = nodo('div', 'his-cab');
        cab.append(nodo('span', 'his-fecha', H.fecha(v.ts)),
                   nodo('span', 'his-tipo ' + v.tipo, H.TIPOS[v.tipo]));
        const cuerpo = nodo('div', 'his-mensaje',
          v.mensaje || v.codigo.split('\n').find(l => l.trim()) || '(sin texto)');
        const pie = nodo('div', 'his-mini',
          `${v.codigo.split('\n').length} líneas · ${r.mas || r.menos
            ? `+${r.mas} −${r.menos} respecto de lo que tenés ahora`
            : 'igual a lo que tenés ahora'}`);
        b.append(cab, cuerpo, pie);
        b.addEventListener('click', () => { elegida = v.id; pintar(); });
        li.appendChild(b);
        ul.appendChild(li);
      }
    }

    const dif = v => H.resumen(H.diff(v.codigo, cfg.codigo()));

    function pintarDiff() {
      const v = lista.find(x => x.id === elegida);
      const caja = $('#hisDiff');
      caja.replaceChildren();
      $('#hisAcciones').classList.toggle('oculto', !v);
      if (!v) {
        $('#hisTitulo').textContent = 'Elegí una versión de la lista';
        caja.appendChild(nodo('p', 'nota', 'Vas a ver qué cambió entre esa versión y el ' +
          'código que tenés ahora en el editor: en rojo lo que ya no está, en verde lo que se agregó.'));
        return;
      }
      const r = dif(v);
      $('#hisTitulo').textContent = `${H.fecha(v.ts)} — ${v.mensaje || H.TIPOS[v.tipo]}`;
      $('#hisResumen').textContent = r.mas || r.menos
        ? `${r.mas} línea(s) agregadas y ${r.menos} quitadas desde esa versión hasta ahora.`
        : 'Esa versión es idéntica al código que tenés ahora.';

      for (const l of H.recortar(H.diff(v.codigo, cfg.codigo()))) {
        const fila = nodo('div', 'his-linea ' + l.t);
        fila.append(nodo('span', 'his-num', l.t === 'salto' ? '' : (l.a || l.b || '')),
                    nodo('span', 'his-signo', l.t === 'mas' ? '+' : l.t === 'menos' ? '−' : l.t === 'salto' ? '⋮' : ' '),
                    nodo('code', null, l.texto));
        caja.appendChild(fila);
      }
    }

    function pintar() { pintarLista(); pintarDiff(); }

    /* --------------------------- acciones --------------------------- */
    function restaurar() {
      const v = lista.find(x => x.id === elegida);
      if (!v) return;
      /* Antes de pisar el editor se guarda lo que había: volver atrás nunca
         puede hacer perder lo de ahora, y así restaurar también se deshace. */
      registrar('restauracion', 'Antes de volver a la versión del ' + H.fecha(v.ts));
      cfg.aplicar(v.codigo, v.entrada);
      pintar();
      if (cfg.estado) cfg.estado('versión del ' + H.fecha(v.ts) + ' restaurada', 'ok');
      dlg.close();
    }

    function borrar() {
      const v = lista.find(x => x.id === elegida);
      if (!v) return;
      if (!confirm('¿Borrar esta versión del historial? El código de ahora no se toca.')) return;
      lista = lista.filter(x => x.id !== v.id);
      H.guardar(cfg.clave, lista);
      elegida = null;
      pintar();
    }

    function guardarAMano() {
      const campo = $('#hisMensaje');
      const nuevo = registrar('manual', campo.value.trim());
      campo.value = '';
      if (!nuevo) {
        $('#hisAviso').textContent = 'Ya hay una versión con exactamente este código: no hace falta guardarla otra vez.';
        $('#hisAviso').classList.remove('oculto');
      } else {
        $('#hisAviso').classList.add('oculto');
        elegida = lista[0].id;
      }
      pintar();
    }

    function abrir() {
      lista = H.cargar(cfg.clave);
      elegida = null;
      $('#hisAviso').classList.add('oculto');
      $('#hisMensaje').value = '';
      pintar();
      dlg.showModal();
    }

    $('#btnHistorial').addEventListener('click', abrir);
    $('#hisGuardar').addEventListener('click', guardarAMano);
    $('#hisMensaje').addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); guardarAMano(); }
    });
    $('#hisRestaurar').addEventListener('click', restaurar);
    $('#hisBorrar').addEventListener('click', borrar);
    $('#btnCerrarHistorial').addEventListener('click', () => dlg.close());

    return { registrar, abrir, versiones: () => lista };
  }

  global.HistorialUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

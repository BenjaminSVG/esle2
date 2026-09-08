/*
 * Batallas de código, la parte que se conecta.
 *
 * Se apoya en lo que ya está: la sala de Yjs de «programar de a dos» (mismo
 * transporte, mismo servidor de señas, mismo cifrado) y los casos de prueba de
 * los ejercicios del curso, que ya corrigen solos. Lo que agrega es el
 * cronómetro y la cuenta de quién llegó primero.
 *
 * Acá NO se comparte el código de nadie: cada uno escribe el suyo y solo viaja
 * «terminé, en tantos segundos». Sería muy fácil compartir el editor —el
 * módulo de al lado lo hace— y sería exactamente lo contrario de lo que se
 * busca.
 *
 * Quien corrige es cada máquina, con las pruebas del ejercicio. Eso quiere
 * decir que alguien que sepa mucho podría hacer trampa desde la consola del
 * navegador. Se puede, y no se va a arreglar: para arreglarlo haría falta un
 * servidor que corra el código, y una batalla entre dos chicos de la misma
 * clase no justifica eso. El puntaje es local y no hay tabla mundial que
 * defender.
 *
 * API:  DueloUI.iniciar({ ejercicios, abrir, evaluar, codigoActual, estado, boton })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const CLAVE_PERFIL = 'esle2_duelo_perfil';
  const CLAVE_NOMBRE = 'esle2_juntos_nombre';

  const mmss = s => Math.floor(s / 60) + ':' + String(Math.max(0, s % 60)).padStart(2, '0');

  function iniciar(cfg) {
    let dlg = null, barra = null;
    let doc = null, proveedor = null, mapa = null;
    let codigo = null, yo = null, rival = null, ejercicio = null;
    let arrancoLocal = 0, reloj = null, entregado = null, cerrado = false;

    const perfil = () => {
      try { return JSON.parse(localStorage.getItem(CLAVE_PERFIL) || 'null') || global.Duelo.perfilVacio(); }
      catch (e) { return global.Duelo.perfilVacio(); }
    };
    const guardarPerfil = p => localStorage.setItem(CLAVE_PERFIL, JSON.stringify(p));

    /* ----------------------------- el diálogo ------------------------ */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      dlg.innerHTML = `
        <h3>Batallas de código</h3>
        <p class="nota">Dos personas, el mismo problema, cinco minutos. Gana quien pasa todos los
           casos de prueba primero. <strong>El código de cada uno es suyo</strong>: solo viaja
           «terminé».</p>

        <div class="mis-grilla">
          <label>Cómo te ven
            <input type="text" data-campo="nombre" maxlength="24" autocomplete="off">
          </label>
          <label>Código de la batalla
            <input type="text" data-campo="codigo" maxlength="12" autocomplete="off"
              placeholder="RIO-482" style="text-transform:uppercase">
          </label>
        </div>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="crear">Crear una batalla</button>
          <button class="btn" data-accion="entrar">Entrar con el código</button>
          <span class="crece"></span>
          <button class="btn peligro oculto" data-accion="salir">Salir</button>
        </div>

        <p class="mis-error" data-campo="error"></p>
        <p class="nota" data-campo="estado">Creá una batalla y dictá el código a tu rival.</p>
        <ul class="juntos-gente" data-campo="gente" aria-live="polite"
            aria-label="Quiénes están en la batalla"></ul>

        <div class="dlg-fila">
          <button class="btn primario oculto" data-accion="empezar">¡Empezar!</button>
        </div>

        <div class="duelo-perfil" data-campo="perfil"></div>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const nom = campo('nombre');
      nom.value = localStorage.getItem(CLAVE_NOMBRE) || global.Juntos.nombreSugerido();
      nom.addEventListener('input', () => {
        localStorage.setItem(CLAVE_NOMBRE, nom.value);
        if (proveedor) proveedor.awareness.setLocalStateField('user', quienSoy());
      });

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'crear') { campo('codigo').value = global.Duelo.crearCodigo(); conectar(); }
        else if (a === 'entrar') conectar();
        else if (a === 'salir') salir(true);
        else if (a === 'empezar') empezar();
      });
      pintarPerfil();
    }

    const campo = c => dlg.querySelector(`[data-campo="${c}"]`);
    const boton = a => dlg.querySelector(`[data-accion="${a}"]`);

    function quienSoy() {
      const n = (campo('nombre').value || '').trim() || 'alguien';
      return { name: n, color: global.Juntos.color(n) };
    }

    function pintarPerfil() {
      const p = perfil();
      const c = campo('perfil');
      c.replaceChildren();
      if (!p.jugadas) {
        c.textContent = 'Todavía no jugaste ninguna batalla.';
        return;
      }
      c.textContent = p.puntos + ' punto(s) · ' + p.jugadas + ' batalla(s) · '
        + p.ganadas + ' ganada(s)'
        + (p.mejorSegundos !== null ? ' · tu mejor tiempo: ' + mmss(p.mejorSegundos) : '');
    }

    /* ------------------------------ conectar ------------------------- */
    async function conectar() {
      const c = global.Duelo.limpiar(campo('codigo').value);
      if (!c) { campo('error').textContent = 'Falta el código de la batalla.'; return; }

      let Y;
      campo('estado').textContent = 'conectando…';
      try { Y = await global.JuntosUI.cargarYjs(); }
      catch (e) {
        campo('error').textContent = 'No se pudo conectar. Las batallas son lo único de ESLE2 '
          + 'que necesita internet.';
        campo('estado').textContent = '';
        return;
      }

      codigo = c;
      const s = global.Duelo.sala(codigo);
      doc = new Y.Y.Doc();
      mapa = doc.getMap('batalla');
      proveedor = new Y.WebrtcProvider(s.sala, doc, {
        password: s.clave,
        signaling: global.Juntos.servidores()
      });
      proveedor.awareness.setLocalStateField('user', quienSoy());
      yo = String(proveedor.awareness.clientID);

      proveedor.awareness.on('change', pintarGente);
      mapa.observe(alCambiarLaBatalla);

      setTimeout(() => {
        if (!proveedor) return;
        if (!proveedor.signalingConns.filter(c => c.connected).length) {
          campo('error').textContent = 'No responde ninguno de los servidores que juntan a las dos '
            + 'computadoras. Probá de nuevo en un rato.';
          campo('estado').textContent = 'sin señal';
        }
      }, 15000);

      campo('error').textContent = '';
      campo('codigo').value = codigo;
      boton('crear').classList.add('oculto');
      boton('entrar').classList.add('oculto');
      boton('salir').classList.remove('oculto');
      pintarGente();
    }

    const conectados = () => Array.from(proveedor.awareness.getStates().entries())
      .filter(([, e]) => e && e.user)
      .map(([id, e]) => ({ id: String(id), nombre: e.user.name, color: e.user.color }));

    function pintarGente() {
      if (!proveedor || !dlg) return;
      const gente = conectados();
      const ul = campo('gente');
      ul.replaceChildren();
      for (const g of gente) {
        const li = document.createElement('li');
        const p = document.createElement('span');
        p.className = 'juntos-punto';
        p.style.background = g.color;
        const n = document.createElement('span');
        n.textContent = g.nombre + (g.id === yo ? ' (vos)' : '');
        li.append(p, n);
        ul.appendChild(li);
      }

      const enJuego = !!mapa.get('empiezaEn');
      campo('estado').textContent = enJuego ? 'batalla en curso'
        : gente.length < 2 ? 'Código ' + codigo + ' · esperando a alguien más…'
          : 'Código ' + codigo + ' · listos ' + gente.length + '. Cualquiera puede empezar.';
      boton('empezar').classList.toggle('oculto', enJuego || gente.length < 2);
    }

    /* ------------------------------- jugar --------------------------- */
    function empezar() {
      const ids = conectados().map(g => g.id);
      if (ids.length < 2) return;
      mapa.set('ronda', (mapa.get('ronda') || 0) + 1);
      mapa.set('jugadores', ids);
      mapa.set('marcas', {});
      mapa.set('empiezaEn', Date.now());
    }

    function alCambiarLaBatalla() {
      if (!mapa.get('empiezaEn')) return;
      if (!ejercicio) arrancar();
      else revisarFinal();
    }

    function arrancar() {
      const ids = mapa.get('jugadores') || conectados().map(g => g.id);
      rival = global.Duelo.rivalDe(yo, ids);
      if (!ids.includes(yo)) return;          // llegó tarde: mira la próxima

      const lista = cfg.ejercicios();
      ejercicio = global.Duelo.elegirEjercicio(codigo + '/' + (mapa.get('ronda') || 1), lista);
      if (!ejercicio) return;

      /* Cada uno cuenta desde su propio reloj: los relojes de dos máquinas no
         coinciden, y restar contra el ajeno daría cinco minutos a uno y tres
         al otro. */
      arrancoLocal = Date.now();
      entregado = null;
      cerrado = false;
      if (dlg && dlg.open) dlg.close();
      cfg.abrir(ejercicio);
      mostrarBarra();
      tic();
    }

    const nombreDe = id => {
      const g = conectados().find(x => x.id === id);
      return g ? g.nombre : 'tu rival';
    };

    function mostrarBarra() {
      if (!barra) {
        barra = document.createElement('div');
        barra.className = 'duelo-barra';
        barra.setAttribute('role', 'region');
        barra.setAttribute('aria-label', 'Batalla en curso');
        const ancla = $('#bannerEjercicio');
        if (ancla && ancla.parentNode) ancla.parentNode.insertBefore(barra, ancla.nextSibling);
        else document.body.appendChild(barra);
      }
      barra.replaceChildren();
      barra.classList.remove('oculto');

      const t = document.createElement('strong');
      t.className = 'duelo-reloj';
      t.setAttribute('role', 'timer');
      barra.appendChild(t);

      const quien = document.createElement('span');
      quien.textContent = rival ? 'contra ' + nombreDe(rival) : 'sin rival: mirá y practicá';
      barra.appendChild(quien);

      const sep = document.createElement('span');
      sep.className = 'crece';
      barra.appendChild(sep);

      const entregar = document.createElement('button');
      entregar.type = 'button';
      entregar.className = 'btn chico primario';
      entregar.textContent = 'Entregar';
      entregar.addEventListener('click', entregar_);
      barra.appendChild(entregar);

      const rendirse = document.createElement('button');
      rendirse.type = 'button';
      rendirse.className = 'btn chico';
      rendirse.textContent = 'Abandonar';
      rendirse.addEventListener('click', () => terminar('abandonaste'));
      barra.appendChild(rendirse);

      barra.querySelector('.duelo-reloj').textContent = mmss(global.Duelo.MINUTOS * 60);
    }

    function tic() {
      clearInterval(reloj);
      reloj = setInterval(() => {
        const quedan = global.Duelo.MINUTOS * 60 - Math.floor((Date.now() - arrancoLocal) / 1000);
        const r = barra && barra.querySelector('.duelo-reloj');
        if (r) {
          r.textContent = mmss(quedan);
          r.classList.toggle('poco', quedan <= 30);
        }
        if (quedan <= 0) terminar('se acabó el tiempo');
      }, 250);
    }

    async function entregar_() {
      if (cerrado) return;
      const r = await cfg.evaluar(cfg.codigoActual(), ejercicio.pruebas);
      const segundos = Math.round((Date.now() - arrancoLocal) / 1000);
      if (r.pasadas < r.total) {
        cfg.estado('pasaste ' + r.pasadas + ' de ' + r.total + ' casos', 'error');
        return;
      }
      entregado = segundos;
      /* Se anota la marca en el mapa compartido. La otra máquina la ve y las
         dos sacan la misma cuenta de quién llegó primero. */
      const marcas = Object.assign({}, mapa.get('marcas') || {});
      marcas[yo] = segundos;
      mapa.set('marcas', marcas);
      cfg.estado('¡resuelto en ' + mmss(segundos) + '!', 'ok');
      revisarFinal();
    }

    function revisarFinal() {
      if (cerrado || !ejercicio) return;
      const marcas = mapa.get('marcas') || {};
      const mio = marcas[yo];
      const suyo = rival ? marcas[rival] : undefined;
      if (mio === undefined && suyo === undefined) return;
      if (mio !== undefined && suyo === undefined && rival) { terminar('ganaste'); return; }
      if (mio === undefined && suyo !== undefined) { terminar('ganó ' + nombreDe(rival)); return; }
      if (mio !== undefined) terminar(mio <= suyo ? 'ganaste' : 'ganó ' + nombreDe(rival));
    }

    function terminar(porque) {
      if (cerrado) return;
      cerrado = true;
      clearInterval(reloj);

      const gano = /ganaste/.test(porque);
      const resultado = {
        jugo: true, gano, resolvio: entregado !== null && !gano, segundos: entregado
      };
      guardarPerfil(global.Duelo.sumar(perfil(), resultado));

      if (barra) {
        barra.replaceChildren();
        const t = document.createElement('strong');
        t.textContent = gano ? '¡Ganaste! 🎉' : porque.charAt(0).toUpperCase() + porque.slice(1);
        const d = document.createElement('span');
        d.textContent = entregado !== null
          ? 'Lo resolviste en ' + mmss(entregado) + '. +' + global.Duelo.puntos(resultado) + ' punto(s).'
          : 'No pasa nada: +' + global.Duelo.puntos(resultado) + ' punto por jugar. El ejercicio '
            + 'queda abierto para terminarlo con calma.';
        const sep = document.createElement('span');
        sep.className = 'crece';
        const ok = document.createElement('button');
        ok.type = 'button';
        ok.className = 'btn chico';
        ok.textContent = 'Listo';
        ok.addEventListener('click', () => barra.classList.add('oculto'));
        barra.append(t, d, sep, ok);
      }
      cfg.estado(gano ? 'ganaste la batalla' : 'batalla terminada', gano ? 'ok' : '');
      ejercicio = null;
      if (dlg) { pintarPerfil(); pintarGente(); }
    }

    function salir(cerrarTodo) {
      clearInterval(reloj);
      if (proveedor) { proveedor.destroy(); proveedor = null; }
      if (doc) { doc.destroy(); doc = null; }
      mapa = null; codigo = null; ejercicio = null; rival = null;
      if (barra) barra.classList.add('oculto');
      if (dlg && cerrarTodo) {
        boton('crear').classList.remove('oculto');
        boton('entrar').classList.remove('oculto');
        boton('salir').classList.add('oculto');
        boton('empezar').classList.add('oculto');
        campo('gente').replaceChildren();
        campo('estado').textContent = 'Creá una batalla y dictá el código a tu rival.';
      }
    }

    function abrir() {
      if (!dlg) construir();
      pintarPerfil();
      dlg.showModal();
    }

    if (cfg.boton) cfg.boton.addEventListener('click', abrir);
    return { abrir, salir };
  }

  global.DueloUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

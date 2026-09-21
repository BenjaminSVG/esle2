/*
 * Quién está usando esta máquina, la parte que se ve.
 *
 * Un botón que dice de quién es la sesión abierta, y un diálogo para cambiar
 * de alumno, agregar uno o sacarlo.
 *
 * Al cambiar se recarga la página. Podría no hacerlo, pero treinta módulos
 * leen su estado una sola vez al arrancar: sin recargar, la mitad de la
 * pantalla seguiría mostrando lo del alumno anterior, que es exactamente el
 * problema que esto viene a resolver.
 *
 * API:  PerfilUI.iniciar({ boton, almacen, galletas })
 */
(function (global) {
  'use strict';

  function iniciar(cfg) {
    const boton = cfg.boton;
    if (!boton || !global.Perfil) return null;

    const perfil = global.Perfil.crear({
      almacen: cfg.almacen || {
        leer: k => localStorage.getItem(k),
        escribir: (k, v) => localStorage.setItem(k, v),
        borrar: k => localStorage.removeItem(k),
        claves: () => Object.keys(localStorage)
      },
      galletas: cfg.galletas || {
        leer: n => {
          const p = document.cookie.split('; ').find(c => c.startsWith(n + '='));
          return p ? decodeURIComponent(p.slice(n.length + 1)) : '';
        },
        grabar: (n, v) => {
          document.cookie = v
            ? `${n}=${encodeURIComponent(v)}; expires=${new Date(Date.now() + 365 * 864e5).toUTCString()}; path=/; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
            : `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      }
    });

    let dlg = null;
    /* El de js/seguro.js: escapa también la comilla simple, que es la que
       quedaba afuera y alcanza para cerrar un atributo. */
    const escapar = global.Seguro.escapar;

    function pintarBoton() {
      const quien = perfil.actual();
      boton.textContent = quien ? 'Alumno: ' + quien : '¿Quién sos?';
      boton.title = quien
        ? 'Cambiar de alumno, o agregar otro'
        : 'Si compartís esta máquina, decí quién sos para que tu trabajo no se mezcle';
      boton.classList.toggle('sin-perfil', !quien);
    }

    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-perfil';
      dlg.innerHTML = `
        <h3>¿Quién está usando esta máquina?</h3>
        <p class="nota">Si varios usan el mismo navegador —el laboratorio, la máquina de casa—
           cada uno tiene su cajón: su avance, su racha y lo que escribió en cada ejercicio.
           No hay servidor: esto evita que el trabajo de uno aparezca en la sesión del otro.</p>
        <p class="nota">El tema, los colores y la disposición de los paneles son de la máquina y no
           cambian.</p>

        <ul class="perfil-lista" data-campo="lista"></ul>

        <div class="perfil-modo">
          <label class="perfil-interruptor">
            <input type="checkbox" data-campo="modo">
            <span><strong>Modo usuario</strong>: entrar con nombre y contraseña</span>
          </label>
          <p class="nota" data-campo="modo-que"></p>
        </div>

        <form class="perfil-alta" data-campo="form">
          <label>Agregar a alguien
            <input type="text" data-campo="nombre" maxlength="40" placeholder="Tu nombre"
                   autocomplete="off">
          </label>
          <button class="btn primario" type="submit">Agregar</button>
        </form>
        <p class="mis-error" data-campo="error"></p>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') { dlg.close(); return; }
        if (a === 'entrar') {
          try { perfil.cambiar(b.dataset.nombre); location.reload(); }
          catch (e) { $$('error').textContent = e.message; }
          return;
        }
        if (a === 'clave') { ponerClave(b.dataset.nombre); return; }
        if (a === 'salir') {
          perfil.cerrarSesion();
          location.reload();
          return;
        }
        if (a === 'borrar') {
          const quien = b.dataset.nombre;
          if (!confirm(`¿Borrar el cajón de ${quien}?\n\nSe pierde su avance y todo lo que escribió `
            + 'en esta máquina. Si va a seguir usando ESLE2, que antes exporte su progreso.')) return;
          const eraElAbierto = perfil.actual() === quien;
          perfil.borrar(quien);
          if (eraElAbierto) location.reload();
          else { pintar(); pintarBoton(); }
        }
      });

      $$('form').addEventListener('submit', ev => {
        ev.preventDefault();
        try {
          perfil.crear($$('nombre').value);
          location.reload();
        } catch (e) { $$('error').textContent = e.message; }
      });

      /* El interruptor del modo usuario, y lo que dice arriba de él. Se dice
         lo que hace Y lo que no hace: una contraseña que la gente cree que
         cifra y no cifra es peor que no tenerla. */
      const MODO_SI = 'Encendido. Cada uno entra con su nombre y su contraseña, y al cerrar '
        + 'sesión la máquina queda limpia para el que sigue. Ojo: esto NO cifra nada. Alguien '
        + 'que sepa abrir las herramientas del navegador puede ver los cajones igual. Y si '
        + 'alguien olvida su contraseña, desde ESLE2 no hay forma de volver a entrar a ese '
        + 'perfil: hay que empezar uno nuevo.';
      const MODO_NO = 'Apagado. Se cambia de alumno con un clic, sin contraseña. Para una '
        + 'máquina de casa alcanza.';

      $$('modo').addEventListener('change', () => {
        const quiere = $$('modo').checked;
        if (quiere && !perfil.listar().length) {
          $$('modo').checked = false;
          $$('error').textContent = 'Primero agregá al menos a una persona.';
          return;
        }
        perfil.ponerModo(quiere);
        $$('modo-que').textContent = quiere ? MODO_SI : MODO_NO;
        pintar();
      });

      /* Poner o cambiar la contraseña de alguien. Se pide dos veces porque
         una contraseña mal tipeada acá deja a alguien afuera de su trabajo. */
      async function ponerClave(quien) {
        const uno = prompt(`Contraseña para ${quien} (mínimo ${global.Perfil.CLAVE_MIN} caracteres).\n\n`
          + 'Si la olvidás, desde ESLE2 no vas a poder volver a entrar a este perfil.');
        if (uno === null) return;
        const dos = prompt('Escribila otra vez, para estar seguros:');
        if (dos === null) return;
        if (uno !== dos) { $$('error').textContent = 'Las dos no son iguales. Probá de nuevo.'; return; }
        try {
          await perfil.ponerClave(quien, uno);
          $$('error').textContent = `Listo: ${quien} ahora entra con contraseña.`;
          pintar();
        } catch (e) { $$('error').textContent = e.message; }
      }

      function pintar() {
        $$('modo').checked = perfil.modo();
        $$('modo-que').textContent = perfil.modo() ? MODO_SI : MODO_NO;
        const ul = $$('lista');
        ul.replaceChildren();
        const nombres = perfil.listar();
        const quien = perfil.actual();

        if (!nombres.length) {
          const li = document.createElement('li');
          li.className = 'nota';
          li.textContent = perfil.hayDatos()
            ? 'Todavía no hay nadie anotado. Lo que está en esta máquina va a quedar para el primero que se agregue.'
            : 'Todavía no hay nadie anotado.';
          ul.appendChild(li);
          return;
        }

        for (const n of nombres) {
          const abierto = quien === n;
          const li = document.createElement('li');
          li.className = abierto ? 'abierto' : '';
          const conClave = perfil.tieneClave(n);
          /* Con el modo encendido, entrar de un clic sería la puerta de atrás
             que deja la cerradura de adorno: se entra por la pantalla de
             entrada, escribiendo la contraseña. */
          const puedeEntrarDeUnClic = !abierto && !perfil.modo();
          li.innerHTML = `
            <span class="perfil-nombre">${escapar(n)}</span>
            ${abierto ? '<span class="etq">acá estás</span>' : ''}
            ${conClave ? '<span class="etq">con contraseña</span>' : ''}
            <span class="crece"></span>
            ${abierto ? '<button class="btn chico" data-accion="salir">Cerrar sesión</button>' : ''}
            ${puedeEntrarDeUnClic ? `<button class="btn chico" data-accion="entrar" data-nombre="${escapar(n)}">Entrar</button>` : ''}
            <button class="btn chico" data-accion="clave" data-nombre="${escapar(n)}">${conClave ? 'Cambiar contraseña' : 'Poner contraseña'}</button>
            <button class="btn chico borrar" data-accion="borrar" data-nombre="${escapar(n)}">Borrar</button>`;
          ul.appendChild(li);
        }
      }

      dlg._pintar = pintar;
    }

    /* ------------------------------------------------------------------ */
    /* La pantalla de entrada                                              */
    /* ------------------------------------------------------------------ */
    /*
     * Con el modo usuario encendido y sin nadie adentro, esto es lo primero
     * que se ve y no se puede cerrar: ni con Escape ni con un clic afuera. Si
     * se pudiera cerrar, el modo no serviría de nada.
     *
     * Lo que sí tiene es una salida: «apagar el modo usuario», ahí a la vista.
     * Sin eso, un alumno que olvidó su contraseña se queda afuera de la
     * máquina entera, y no de su perfil. Que esa salida exista es justamente
     * lo que hace que esto sea una cerradura y no una caja fuerte, y está
     * dicho en la misma pantalla para que nadie se confunda.
     */
    function pantallaEntrada() {
      const p = document.createElement('dialog');
      p.className = 'dlg dlg-entrada';
      p.innerHTML = `
        <h3>Entrar a ESLE2</h3>
        <p class="nota">Esta máquina está en modo usuario: cada uno entra con su nombre y su
           contraseña, y lo que escribe queda en su cajón.</p>
        <form class="perfil-alta" data-campo="form">
          <label>Quién sos
            <select data-campo="quien" class="control"></select>
          </label>
          <label>Contraseña
            <input type="password" data-campo="clave" class="control" autocomplete="current-password">
          </label>
          <button class="btn primario" type="submit" data-campo="entrar">Entrar</button>
        </form>
        <p class="mis-error" data-campo="error" aria-live="assertive"></p>
        <div class="doc-nota">Si olvidaste tu contraseña no hay forma de recuperarla desde acá.
          Y si nadie puede entrar, se puede apagar el modo usuario: lo puede hacer cualquiera que
          esté frente a esta computadora, así que esto ordena el trabajo, no lo guarda bajo llave.</div>
        <div class="dlg-fila derecha">
          <button class="btn" data-accion="apagar">Apagar el modo usuario</button>
        </div>`;
      document.body.appendChild(p);
      const $$ = c => p.querySelector(`[data-campo="${c}"]`);

      const sel = $$('quien');
      for (const n of perfil.listar()) {
        const o = document.createElement('option');
        o.value = n;
        o.textContent = n + (perfil.tieneClave(n) ? '' : ' (sin contraseña)');
        sel.appendChild(o);
      }

      /* Escape no cierra: sin esto, la pantalla se saltea con una tecla. */
      p.addEventListener('cancel', ev => ev.preventDefault());

      p.querySelector('[data-accion="apagar"]').addEventListener('click', () => {
        if (!confirm('¿Apagar el modo usuario?\n\nCualquiera va a poder cambiar de alumno sin '
          + 'contraseña. Las contraseñas puestas quedan guardadas por si se vuelve a encender.')) return;
        perfil.ponerModo(false);
        location.reload();
      });

      $$('form').addEventListener('submit', async ev => {
        ev.preventDefault();
        const quien = sel.value;
        if (!perfil.tieneClave(quien)) {
          $$('error').textContent = 'Ese perfil todavía no tiene contraseña. Apagá el modo usuario, '
            + 'ponele una desde «¿Quién sos?» y volvé a encenderlo.';
          return;
        }
        /* Mientras se amasa la contraseña —doscientas mil vueltas— el botón se
           apaga: si no, apretar dos veces lanza dos comprobaciones. */
        $$('entrar').disabled = true;
        $$('error').textContent = 'Abriendo tus trabajos…';
        const bien = await perfil.abrirSesion(quien, $$('clave').value);
        if (bien) { location.reload(); return; }
        $$('entrar').disabled = false;
        $$('clave').value = '';
        $$('error').textContent = 'Esa contraseña no es.';
        $$('clave').focus();
      });

      p.showModal();
      $$('clave').focus();
      return p;
    }

    boton.addEventListener('click', () => {
      if (!dlg) construir();
      dlg.querySelector('[data-campo="error"]').textContent = '';
      dlg.querySelector('[data-campo="nombre"]').value = '';
      dlg._pintar();
      dlg.showModal();
    });

    /* Antes de cerrar la pestaña se guarda lo que el alumno hizo recién: si
       no, lo último queda en la máquina y no en su cajón. */
    global.addEventListener('beforeunload', () => { try { perfil.guardar(); } catch (e) {} });

    pintarBoton();
    /* Con el modo encendido y nadie adentro, esto es lo primero que se ve. */
    if (perfil.modo() && !perfil.actual() && perfil.listar().length) pantallaEntrada();
    return { perfil, pintarBoton, pantallaEntrada };
  }

  global.PerfilUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

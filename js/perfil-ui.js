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
           <strong>No son cuentas ni contraseñas</strong>: no hay servidor y esto no protege nada,
           solo evita que el trabajo de uno aparezca en la sesión del otro.</p>
        <p class="nota">El tema, los colores y la disposición de los paneles son de la máquina y no
           cambian.</p>

        <ul class="perfil-lista" data-campo="lista"></ul>

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

      function pintar() {
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
          li.innerHTML = `
            <span class="perfil-nombre">${escapar(n)}</span>
            ${abierto ? '<span class="etq">acá estás</span>' : ''}
            <span class="crece"></span>
            ${abierto ? '' : `<button class="btn chico" data-accion="entrar" data-nombre="${escapar(n)}">Entrar</button>`}
            <button class="btn chico borrar" data-accion="borrar" data-nombre="${escapar(n)}">Borrar</button>`;
          ul.appendChild(li);
        }
      }

      dlg._pintar = pintar;
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
    return { perfil, pintarBoton };
  }

  global.PerfilUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

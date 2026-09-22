/*
 * Quién está usando esta máquina, la parte que se ve.
 *
 * Un botón de icono en el encabezado —el mismo en las cuatro páginas— y dos
 * diálogos: uno para administrar (se puede cerrar) y uno que bloquea cuando
 * hace falta contraseña y todavía no la escribieron (no se puede cerrar).
 *
 * Antes esto eran tres pasos sueltos: agregar un nombre a una lista, aparte
 * prender un interruptor llamado «modo usuario», aparte volver a buscar ese
 * nombre para ponerle contraseña. Ahora «Crear usuario» hace las tres cosas
 * de una: crea el perfil, le pone la contraseña y prende el pedido de
 * contraseña, todo junto. Seguís pudiendo tener perfiles sin contraseña —una
 * máquina de casa, un alumno que todavía no la puso— porque eso no cambió en
 * js/perfil.js, que es donde vive la seguridad de verdad y esto no toca.
 *
 * Al cambiar de usuario se recarga la página. Podría no hacerlo, pero treinta
 * módulos leen su estado una sola vez al arrancar: sin recargar, la mitad de
 * la pantalla seguiría mostrando lo del alumno anterior, que es exactamente
 * el problema que esto viene a resolver.
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

    const MIN = global.Perfil.CLAVE_MIN;
    /* De verdad no cifra nada: la misma frase en las tres pantallas donde se
       puede llegar a pensar lo contrario. */
    const HONESTIDAD = 'Es una cerradura, no una caja fuerte: no cifra tus trabajos. '
      + 'Quien use esta máquina puede apagar el pedido de contraseña. No hay cuenta en '
      + 'ningún servidor, y si la olvidás, nadie la puede recuperar.';

    let dlg = null;
    const escapar = global.Seguro.escapar;

    /* ------------------------------------------------------------------ */
    /* El botón del encabezado                                            */
    /* ------------------------------------------------------------------ */

    function pintarBoton() {
      const quien = perfil.actual();
      /* Nunca se toca el contenido con textContent: ahí adentro vive el SVG
         que puso js/iconos.js, y reemplazarlo lo borraría. Solo cambian los
         atributos y una clase. */
      boton.title = quien ? `Usuario: ${quien}. Administrar usuario` : 'Usuarios: crear usuario o iniciar sesión';
      boton.setAttribute('aria-label', boton.title);
      boton.classList.toggle('activo', !!quien);
    }

    /* ------------------------------------------------------------------ */
    /* Un formulario de dos contraseñas, reusado en dos lugares            */
    /* ------------------------------------------------------------------ */

    /* El HTML de las dos cajas de contraseña. Se usa tanto para crear un
       usuario nuevo como para ponerle o cambiarle la contraseña a uno que ya
       existe: es el mismo par de campos en los dos casos, y nunca hay dos
       formularios en pantalla a la vez, así que no hace falta variar el id. */
    const CAMPOS_CLAVE = `
      <label>Contraseña
        <input type="password" data-campo="clave" class="control"
               autocomplete="new-password" minlength="${MIN}">
      </label>
      <label>Repetí la contraseña
        <input type="password" data-campo="clave2" class="control"
               autocomplete="new-password" minlength="${MIN}">
      </label>`;

    function validarClaves(a, b) {
      if (a.length < MIN) return `La contraseña tiene que tener al menos ${MIN} caracteres.`;
      if (a !== b) return 'Las dos contraseñas no son iguales.';
      return null;
    }

    /* ------------------------------------------------------------------ */
    /* El diálogo de administrar                                          */
    /* ------------------------------------------------------------------ */

    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-perfil';
      document.body.appendChild(dlg);

      /* «vista» dice qué se está mostrando adentro del mismo diálogo:
         'gestion' (la normal), 'crear' (usuario nuevo), 'clave' (poner
         contraseña a uno que todavía no tiene) o 'entrar' (pedirle SU
         contraseña a uno que ya tiene, para cambiarse a él). Un solo
         diálogo con vistas adentro, y no un diálogo por paso: así no hay
         que decidir cuál se cierra cuando se cancela desde el medio. */
      let vista = { tipo: 'gestion' };

      function pintar() {
        dlg.querySelector('.dlg-cuerpo')?.remove();
        const cuerpo = document.createElement('div');
        cuerpo.className = 'dlg-cuerpo';
        cuerpo.innerHTML = vista.tipo === 'crear' ? vistaCrear()
          : vista.tipo === 'clave' ? vistaClave(vista.quien)
          : vista.tipo === 'entrar' ? vistaEntrar(vista.quien)
          : vistaGestion();
        dlg.appendChild(cuerpo);
        atarEventos(cuerpo);
        const primero = cuerpo.querySelector('input, button:not([data-accion="cerrar"])');
        if (primero) primero.focus();
      }

      function vistaGestion() {
        const quien = perfil.actual();
        const nombres = perfil.listar();
        const otros = nombres.filter(n => n !== quien);

        const filaActual = quien ? `
          <div class="perfil-actual">
            <p class="perfil-nombre-grande">${escapar(quien)}</p>
            <div class="dlg-fila">
              <button class="btn" data-accion="ir-clave" data-nombre="${escapar(quien)}">
                ${perfil.tieneClave(quien) ? 'Cambiar contraseña' : 'Crear contraseña'}</button>
              <button class="btn" data-accion="salir">Cerrar sesión</button>
            </div>
          </div>` : '';

        const filaOtros = otros.length ? `
          <p class="curso-grupo-titulo">Usuarios de esta máquina</p>
          <ul class="perfil-lista" data-campo="lista">
            ${otros.map(n => filaUsuario(n)).join('')}
          </ul>` : '';

        return `
          <h3>${quien ? 'Tu usuario' : 'Usuarios'}</h3>
          ${filaActual}
          ${filaOtros}
          <div class="dlg-fila">
            <button class="btn primario" data-accion="ir-crear">Crear ${quien || otros.length ? 'otro ' : ''}usuario</button>
          </div>

          <div class="perfil-modo">
            <label class="perfil-interruptor">
              <input type="checkbox" data-campo="modo" ${perfil.modo() ? 'checked' : ''}>
              <span>Pedir contraseña al iniciar sesión en esta máquina</span>
            </label>
          </div>
          <p class="nota">${HONESTIDAD}</p>

          <p class="mis-error" data-campo="error" aria-live="assertive"></p>
          <div class="dlg-fila derecha">
            <button class="btn" data-accion="cerrar">Cerrar</button>
          </div>`;
      }

      /* Entrar a un usuario CON contraseña siempre pide esa contraseña acá
         —sin importar si esta máquina tiene prendido el pedido general—:
         que «modo» esté apagado quiere decir que no se muestra la pantalla
         de entrada al abrir ESLE2, no que cualquiera pueda meterse en un
         usuario ajeno que sí eligió proteger el suyo.

         Y por la misma razón, «Cambiar contraseña» de un usuario ajeno que
         YA tiene una no aparece acá: eso permitiría ponerle una contraseña
         nueva sin saber la vieja y entrar igual, lo que deja sin efecto el
         cuidado de arriba. Cambiarla solo se puede desde adentro de ese
         mismo usuario (arriba, en «Tu usuario»), una vez que ya entraste.
         Ponerle una primera contraseña a uno que todavía no tiene ninguna
         sigue disponible acá: ahí no hay nada que proteger todavía. */
      function filaUsuario(n) {
        const conClave = perfil.tieneClave(n);
        return `<li>
          <span class="perfil-nombre">${escapar(n)}</span>
          ${conClave ? '<span class="etq">con contraseña</span>' : ''}
          <span class="crece"></span>
          <button class="btn chico" data-accion="entrar" data-nombre="${escapar(n)}">Entrar</button>
          ${conClave ? '' : `<button class="btn chico" data-accion="ir-clave" data-nombre="${escapar(n)}">Poner contraseña</button>`}
          <button class="btn chico borrar" data-accion="borrar" data-nombre="${escapar(n)}">Borrar</button>
        </li>`;
      }

      function vistaCrear() {
        const primero = !perfil.listar().length;
        const heredaTrabajo = primero && perfil.hayDatos();
        return `
          <h3>Crear usuario</h3>
          <form data-campo="form-crear">
            <label>Nombre
              <input type="text" data-campo="nombre" class="control" maxlength="40"
                     placeholder="Tu nombre" autocomplete="off">
            </label>
            ${CAMPOS_CLAVE}
            <p class="nota">Tu usuario y tus trabajos quedan en este navegador. Al crear tu
              usuario, esta máquina va a pedir contraseña para entrar.</p>
            ${heredaTrabajo ? '<p class="nota">Los trabajos que ya están en este navegador van a quedar en tu usuario.</p>' : ''}
            <p class="nota">${HONESTIDAD}</p>
            <p class="mis-error" data-campo="error" aria-live="assertive"></p>
            <div class="dlg-fila">
              <button class="btn primario" type="submit" data-campo="boton-crear">Crear usuario</button>
              <button class="btn" type="button" data-accion="ir-gestion">Cancelar</button>
            </div>
          </form>`;
      }

      function vistaClave(quien) {
        const conClave = perfil.tieneClave(quien);
        return `
          <h3>${conClave ? 'Cambiar' : 'Crear'} la contraseña de ${escapar(quien)}</h3>
          <form data-campo="form-clave">
            ${CAMPOS_CLAVE}
            <p class="nota">${HONESTIDAD}</p>
            <p class="mis-error" data-campo="error" aria-live="assertive"></p>
            <div class="dlg-fila">
              <button class="btn primario" type="submit">Guardar</button>
              <button class="btn" type="button" data-accion="ir-gestion">Cancelar</button>
            </div>
          </form>`;
      }

      function vistaEntrar(quien) {
        return `
          <h3>Entrá como ${escapar(quien)}</h3>
          <form data-campo="form-entrar">
            <label>Contraseña
              <input type="password" data-campo="clave" class="control"
                     autocomplete="current-password" aria-describedby="perfil-entrar-error">
            </label>
            <p class="mis-error" id="perfil-entrar-error" data-campo="error" aria-live="assertive"></p>
            <div class="dlg-fila">
              <button class="btn primario" type="submit" data-campo="boton-entrar">Entrar</button>
              <button class="btn" type="button" data-accion="ir-gestion">Cancelar</button>
            </div>
          </form>`;
      }

      /* ---------------------------- eventos --------------------------- */

      function atarEventos(cuerpo) {
        const err = () => cuerpo.querySelector('[data-campo="error"]');

        cuerpo.addEventListener('click', ev => {
          const b = ev.target.closest('[data-accion]');
          if (!b) return;
          const a = b.dataset.accion;
          if (a === 'cerrar') { dlg.close(); return; }
          if (a === 'ir-gestion') { vista = { tipo: 'gestion' }; pintar(); return; }
          if (a === 'ir-crear') { vista = { tipo: 'crear' }; pintar(); return; }
          if (a === 'ir-clave') { vista = { tipo: 'clave', quien: b.dataset.nombre }; pintar(); return; }
          if (a === 'entrar') {
            const quien = b.dataset.nombre;
            if (perfil.tieneClave(quien)) { vista = { tipo: 'entrar', quien }; pintar(); return; }
            try { perfil.cambiar(quien); location.reload(); }
            catch (e) { err().textContent = e.message; }
            return;
          }
          if (a === 'salir') { perfil.cerrarSesion(); location.reload(); return; }
          if (a === 'borrar') {
            const quien = b.dataset.nombre;
            if (!confirm(`¿Borrar el usuario ${quien}?\n\nSe pierde su avance y todo lo que `
              + 'escribió en esta máquina. Si va a seguir usando ESLE2, que antes exporte su '
              + 'progreso.')) return;
            perfil.borrar(quien);
            vista = { tipo: 'gestion' };
            pintar();
            pintarBoton();
          }
        });

        const modoCheck = cuerpo.querySelector('[data-campo="modo"]');
        if (modoCheck) {
          modoCheck.addEventListener('change', () => {
            const quiere = modoCheck.checked;
            if (quiere && !perfil.listar().some(n => perfil.tieneClave(n))) {
              modoCheck.checked = false;
              err().textContent = 'Primero creá al menos un usuario con contraseña.';
              return;
            }
            if (!quiere) {
              if (!confirm('¿Dejar de pedir contraseña en esta máquina?\n\nAl abrir ESLE2 no va a '
                + 'aparecer la pantalla de entrada. Para cambiarte a un usuario CON contraseña vas '
                + 'a tener que escribirla igual. Los trabajos y las contraseñas guardadas se '
                + 'conservan.')) {
                modoCheck.checked = true;
                return;
              }
            }
            perfil.ponerModo(quiere);
            pintar();
          });
        }

        const formCrear = cuerpo.querySelector('[data-campo="form-crear"]');
        if (formCrear) formCrear.addEventListener('submit', ev => {
          ev.preventDefault();
          crearUsuario(cuerpo, () => location.reload());
        });

        const formClave = cuerpo.querySelector('[data-campo="form-clave"]');
        if (formClave) formClave.addEventListener('submit', async ev => {
          ev.preventDefault();
          const $$ = c => cuerpo.querySelector(`[data-campo="${c}"]`);
          const a = $$('clave').value, b = $$('clave2').value;
          const problema = validarClaves(a, b);
          if (problema) { err().textContent = problema; return; }
          try {
            await perfil.ponerClave(vista.quien, a);
            vista = { tipo: 'gestion' };
            pintar();
            pintarBoton();
          } catch (e) { err().textContent = e.message; }
        });

        const formEntrar = cuerpo.querySelector('[data-campo="form-entrar"]');
        if (formEntrar) formEntrar.addEventListener('submit', async ev => {
          ev.preventDefault();
          const $$ = c => cuerpo.querySelector(`[data-campo="${c}"]`);
          const quien = vista.quien;
          const boton = $$('boton-entrar');
          boton.disabled = true;
          err().textContent = 'Abriendo tus trabajos…';
          const bien = await perfil.abrirSesion(quien, $$('clave').value);
          if (bien) { location.reload(); return; }
          boton.disabled = false;
          $$('clave').value = '';
          err().textContent = 'Esa contraseña no es.';
          $$('clave').focus();
        });
      }

      /* Crear un usuario: nombre + contraseña + prender el pedido de
         contraseña, de una sola vez. La sesión que perfil.crear() abre
         se cierra ENSEGUIDA —antes de amasar la contraseña, que tarda—
         para que en ningún momento quede un usuario «adentro» sin haber
         probado su contraseña todavía. Si algo falla en el medio, el
         usuario queda creado pero afuera, listo para reintentar: no se
         lo borra, porque el primero se lleva el trabajo que ya había en
         la máquina y perderlo sería peor que el error. */
      async function crearUsuario(cuerpo, alTerminar) {
        const $$ = c => cuerpo.querySelector(`[data-campo="${c}"]`);
        const nombre = $$('nombre').value;
        const a = $$('clave').value, b = $$('clave2').value;
        const problema = validarClaves(a, b);
        if (problema) { $$('error').textContent = problema; return; }

        const boton = $$('boton-crear');
        boton.disabled = true;
        $$('error').textContent = 'Creando tu usuario…';
        try {
          const creado = perfil.crear(nombre);
          perfil.cerrarSesion();
          await perfil.ponerClave(creado, a);
          perfil.ponerModo(true);
          const bien = await perfil.abrirSesion(creado, a);
          if (!bien) throw new Error('no se pudo entrar con la contraseña recién puesta');
          alTerminar();
        } catch (e) {
          boton.disabled = false;
          $$('error').textContent = e.message;
        }
      }

      dlg.abrir = () => {
        vista = { tipo: perfil.listar().length ? 'gestion' : 'crear' };
        pintar();
        dlg.showModal();
      };
    }

    /* ------------------------------------------------------------------ */
    /* La pantalla de entrada                                              */
    /* ------------------------------------------------------------------ */
    /*
     * Con «pedir contraseña» encendido y sin nadie adentro, esto es lo
     * primero que se ve y no se puede cerrar: ni con Escape ni con un clic
     * afuera. Si se pudiera cerrar, no serviría de nada.
     *
     * Lo que sí tiene es una salida: «Usar sin contraseña», ahí a la vista.
     * Sin eso, un alumno que olvidó su contraseña se queda afuera de la
     * máquina entera, y no de su usuario. Que esa salida exista es lo que
     * hace que esto sea una cerradura y no una caja fuerte, y está dicho en
     * la misma pantalla para que nadie se confunda.
     */
    function pantallaEntrada() {
      const p = document.createElement('dialog');
      p.className = 'dlg dlg-entrada';
      document.body.appendChild(p);
      p.addEventListener('cancel', ev => ev.preventDefault());

      let vista = { tipo: perfil.listar().length ? 'login' : 'crear' };

      function pintar() {
        p.innerHTML = vista.tipo === 'crear' ? vistaCrear() : vistaLogin();
        atarEventos();
        const primero = p.querySelector('select, input');
        if (primero) primero.focus();
      }

      function pieComun() {
        return `
          <p class="nota">${HONESTIDAD}</p>
          <div class="dlg-fila derecha">
            <button class="btn" data-accion="apagar">Usar sin contraseña</button>
          </div>`;
      }

      function vistaLogin() {
        const nombres = perfil.listar();
        const sinNadie = !nombres.length;
        return `
          <h3>Entrá a ESLE2</h3>
          <p class="nota">${sinNadie ? 'Todavía no hay usuarios en esta máquina.'
            : 'Elegí tu usuario o creá uno nuevo en este navegador.'}</p>
          <form data-campo="form-login">
            <label>Usuario
              <select data-campo="quien" class="control" ${sinNadie ? 'disabled' : ''}>
                ${nombres.map(n => `<option value="${escapar(n)}">${escapar(n)}${perfil.tieneClave(n) ? '' : ' (sin contraseña)'}</option>`).join('')}
              </select>
            </label>
            <label>Contraseña
              <input type="password" data-campo="clave" class="control"
                     autocomplete="current-password" ${sinNadie ? 'disabled' : ''}>
            </label>
            <p class="mis-error" data-campo="error" aria-live="assertive"></p>
            <div class="dlg-fila">
              <button class="btn" type="button" data-accion="ir-crear">Crear usuario</button>
              <button class="btn primario" type="submit" data-campo="entrar" ${sinNadie ? 'disabled' : ''}>Iniciar sesión</button>
            </div>
          </form>
          ${pieComun()}`;
      }

      function vistaCrear() {
        const heredaTrabajo = !perfil.listar().length && perfil.hayDatos();
        return `
          <h3>Crear usuario</h3>
          <form data-campo="form-crear">
            <label>Nombre
              <input type="text" data-campo="nombre" class="control" maxlength="40"
                     placeholder="Tu nombre" autocomplete="off">
            </label>
            ${CAMPOS_CLAVE}
            <p class="nota">Al crear tu usuario, esta máquina va a pedir contraseña para
              entrar.</p>
            ${heredaTrabajo ? '<p class="nota">Los trabajos que ya están en este navegador van a quedar en tu usuario.</p>' : ''}
            <p class="mis-error" data-campo="error" aria-live="assertive"></p>
            <div class="dlg-fila">
              ${perfil.listar().length ? '<button class="btn" type="button" data-accion="ir-login">Volver a iniciar sesión</button>' : ''}
              <button class="btn primario" type="submit" data-campo="boton-crear">Crear usuario</button>
            </div>
          </form>
          ${pieComun()}`;
      }

      function atarEventos() {
        p.querySelectorAll('[data-accion]').forEach(b => {
          if (b.dataset.accion === 'ir-crear') b.addEventListener('click', () => { vista = { tipo: 'crear' }; pintar(); });
          if (b.dataset.accion === 'ir-login') b.addEventListener('click', () => { vista = { tipo: 'login' }; pintar(); });
          if (b.dataset.accion === 'apagar') b.addEventListener('click', () => {
            if (!confirm('¿Dejar de pedir contraseña en esta máquina?\n\nAl abrir ESLE2 no va a '
              + 'aparecer esta pantalla. Para cambiarte a un usuario CON contraseña vas a tener '
              + 'que escribirla igual. Los trabajos y las contraseñas guardadas se conservan.')) return;
            perfil.ponerModo(false);
            location.reload();
          });
        });

        const formLogin = p.querySelector('[data-campo="form-login"]');
        if (formLogin) formLogin.addEventListener('submit', async ev => {
          ev.preventDefault();
          const $$ = c => p.querySelector(`[data-campo="${c}"]`);
          const quien = $$('quien').value;
          if (!perfil.tieneClave(quien)) {
            $$('error').textContent = 'Ese usuario todavía no tiene contraseña. Usá «Usar sin '
              + 'contraseña» y después creala desde el botón de usuario.';
            return;
          }
          $$('entrar').disabled = true;
          $$('error').textContent = 'Abriendo tus trabajos…';
          const bien = await perfil.abrirSesion(quien, $$('clave').value);
          if (bien) { location.reload(); return; }
          $$('entrar').disabled = false;
          $$('clave').value = '';
          $$('error').textContent = 'Esa contraseña no es.';
          $$('clave').focus();
        });

        const formCrear = p.querySelector('[data-campo="form-crear"]');
        if (formCrear) formCrear.addEventListener('submit', ev => {
          ev.preventDefault();
          crearUsuarioEntrada();
        });
      }

      /* Mismo procedimiento que en el diálogo de administrar: crear, cerrar
         la sesión provisional, amasar la contraseña, prender el pedido, y
         recién ahí entrar de verdad. Ver el comentario largo en
         crearUsuario() de construir(), acá arriba en este archivo. */
      async function crearUsuarioEntrada() {
        const $$ = c => p.querySelector(`[data-campo="${c}"]`);
        const nombre = $$('nombre').value;
        const a = $$('clave').value, b = $$('clave2').value;
        const problema = validarClaves(a, b);
        if (problema) { $$('error').textContent = problema; return; }

        const boton = $$('boton-crear');
        boton.disabled = true;
        $$('error').textContent = 'Creando tu usuario…';
        try {
          const creado = perfil.crear(nombre);
          perfil.cerrarSesion();
          await perfil.ponerClave(creado, a);
          perfil.ponerModo(true);
          const bien = await perfil.abrirSesion(creado, a);
          if (!bien) throw new Error('no se pudo entrar con la contraseña recién puesta');
          location.reload();
        } catch (e) {
          boton.disabled = false;
          $$('error').textContent = e.message;
        }
      }

      pintar();
      p.showModal();
      return p;
    }

    boton.addEventListener('click', () => {
      if (!dlg) construir();
      dlg.abrir();
    });

    /* Antes de cerrar la pestaña se guarda lo que el alumno hizo recién: si
       no, lo último queda en la máquina y no en su cajón. */
    global.addEventListener('beforeunload', () => { try { perfil.guardar(); } catch (e) {} });

    pintarBoton();
    /* Con el pedido de contraseña encendido y nadie adentro, esto es lo
       primero que se ve — incluso si todavía no hay ningún usuario creado:
       antes se necesitaba al menos uno, y una máquina que prende el modo con
       la lista vacía se quedaba sin ninguna pantalla que lo pidiera. */
    if (perfil.modo() && !perfil.actual()) pantallaEntrada();
    return { perfil, pintarBoton, pantallaEntrada };
  }

  global.PerfilUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

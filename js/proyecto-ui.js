/*
 * El explorador de archivos: la barra lateral con los programas del proyecto.
 *
 * Viene apagado. Mientras está apagado, ESLE2 funciona exactamente como antes
 * —un solo programa, guardado solo en el navegador— y este módulo no toca
 * nada. Se enciende desde el menú «Ver ▸ Explorador de archivos», y al
 * encenderlo por primera vez el programa que esté en el editor pasa a ser el
 * primer archivo del proyecto, así que no se pierde nada ni hace falta
 * entender nada nuevo para empezar.
 *
 * Con el explorador encendido:
 *   · la lista muestra los archivos, y las carpetas son los tramos del nombre
 *     separados por «/» (parcial/ej1.sl vive dentro de «parcial»);
 *   · al tocar un archivo se guarda el que estaba abierto y se abre el otro:
 *     nunca hay que acordarse de guardar;
 *   · cada archivo se puede renombrar, duplicar y borrar; mover uno de
 *     carpeta es renombrarlo con otra carpeta adelante.
 *
 * Las cuentas están en js/proyecto.js; acá se dibuja y se conecta al editor.
 *
 * API:  ProyectoUI.iniciar({ clave, claveModo, ext, editor, entrada, aplicar, estado })
 */
(function (global) {
  'use strict';

  const $ = s => document.querySelector(s);
  const ESPERA = 400;   // ms que se espera antes de guardar lo que se escribe

  function nodo(tag, clase, texto) {
    const e = document.createElement(tag);
    if (clase) e.className = clase;
    if (texto !== undefined) e.textContent = texto;
    return e;
  }

  function iniciar(cfg) {
    const panel = $('#panelExplorador');
    const boton = $('#btnExplorador');
    if (!panel || !boton || !global.Proyecto) return null;

    const P = global.Proyecto;

    /* ----------------------- el menú de una fila ------------------------ */
    /*
     * Antes cada carpeta tenía CINCO botones de icono pegados uno al lado del
     * otro, invisibles hasta pasar el mouse por encima: en una pantalla táctil
     * no hay «pasar por encima», así que en un celular esos botones no
     * existían. Y ni en escritorio se entendían: nada avisaba que ahí había
     * algo para tocar.
     *
     * Ahora cada fila tiene UN disparador (⋮), siempre visible, que abre un
     * panel con las acciones escritas con su nombre. Es el mismo panel
     * compartido para todas las filas: se arma una vez y se reubica.
     */
    let menuEl = null;
    let menuTitulo = null;
    let menuAcciones = null;
    let menuDisparador = null;   // el botón que lo abrió, para devolverle el foco

    function menu() {
      if (menuEl) return menuEl;
      menuEl = nodo('div', 'exp-menu oculto');
      menuEl.id = 'expMenu';
      menuEl.setAttribute('role', 'group');
      menuTitulo = nodo('p', 'exp-menu-titulo');
      menuTitulo.id = 'expMenuTitulo';
      menuEl.setAttribute('aria-labelledby', 'expMenuTitulo');
      menuAcciones = nodo('div', 'exp-menu-acciones');
      menuEl.append(menuTitulo, menuAcciones);
      /* Escape lo cierra a ÉL, y no también al programa: si no se corta acá,
         el mismo Escape sigue de largo hasta el atajo global que detiene la
         ejecución, y cerrar un menú terminaría cortando el programa. */
      menuEl.addEventListener('keydown', ev => {
        if (ev.key !== 'Escape') return;
        ev.preventDefault();
        ev.stopPropagation();
        cerrarMenu(true);
      });
      document.body.appendChild(menuEl);
      return menuEl;
    }

    function cerrarMenu(devolverFoco) {
      if (!menuEl || menuEl.classList.contains('oculto')) return;
      menuEl.classList.add('oculto');
      if (menuDisparador) {
        menuDisparador.setAttribute('aria-expanded', 'false');
        if (devolverFoco) menuDisparador.focus();
      }
      menuDisparador = null;
    }

    /* «acciones» es una lista de { etiqueta, icono, fn, peligrosa }. Cada
       botón cierra el menú y llama a fn ANTES de que fn haga su prompt() o su
       confirm(): con el menú todavía abierto, ese diálogo nativo queda
       tapando un panel que ya no hace falta ver. */
    function abrirMenu(disparador, titulo, acciones) {
      const m = menu();
      if (menuDisparador === disparador) { cerrarMenu(true); return; }  // toggle
      cerrarMenu(false);
      menuDisparador = disparador;
      menuTitulo.textContent = titulo;
      menuAcciones.replaceChildren();
      acciones.forEach(a => {
        const b = nodo('button', 'exp-menu-accion' + (a.peligrosa ? ' exp-menu-borrar' : ''));
        b.type = 'button';
        if (a.icono && global.Iconos) b.insertAdjacentHTML('afterbegin', global.Iconos.svg(a.icono));
        b.appendChild(nodo('span', null, a.etiqueta));
        b.addEventListener('click', () => { cerrarMenu(false); a.fn(); });
        menuAcciones.appendChild(b);
      });
      m.classList.remove('oculto');
      disparador.setAttribute('aria-expanded', 'true');
      posicionarMenu(disparador);
      const primero = menuAcciones.querySelector('button');
      if (primero) primero.focus();
    }

    /* Fijo, al lado del disparador: adentro de .exp-cuerpo el menú se
       recortaría o se scrollearía junto con el árbol, que no es lo que se
       quiere. Se calcula con el rectángulo de la pantalla, no con el del
       contenedor, y se acomoda si no entra abajo o a la derecha. */
    function posicionarMenu(disparador) {
      const m = menu();
      const r = disparador.getBoundingClientRect();
      const ANCHO = 216, MARGEN = 8;
      m.style.width = ANCHO + 'px';
      let izq = Math.min(r.left, window.innerWidth - ANCHO - MARGEN);
      izq = Math.max(MARGEN, izq);
      m.style.left = izq + 'px';
      /* Se mide afuera de la pantalla y no con visibility:hidden: oculto así
         no se puede enfocar, y el primer botón necesita foco apenas se abre.
         Estar fuera de la pantalla no se nota —no hay flash— y sí se puede
         enfocar. */
      m.style.top = '-9999px';
      const alto = m.getBoundingClientRect().height;
      let arriba = r.bottom + 4;
      if (arriba + alto > window.innerHeight - MARGEN) arriba = Math.max(MARGEN, r.top - alto - 4);
      m.style.top = arriba + 'px';
    }

    document.addEventListener('click', ev => {
      if (!menuEl || menuEl.classList.contains('oculto')) return;
      if (menuEl.contains(ev.target) || (menuDisparador && menuDisparador.contains(ev.target))) return;
      cerrarMenu(false);
    });
    global.addEventListener('resize', () => cerrarMenu(false));
    let st = P.cargar(cfg.clave);
    let encendido = false;
    let cambiando = false;    // mientras se cambia de archivo no se guarda nada
    let reloj = null;

    const leerModo = () => {
      try { return localStorage.getItem(cfg.claveModo) === 'si'; } catch (e) { return false; }
    };
    const grabarModo = v => {
      try { localStorage.setItem(cfg.claveModo, v ? 'si' : 'no'); } catch (e) {}
    };
    const grabar = () => P.guardar(cfg.clave, st);

    /* -------------------------- guardar y abrir ------------------------ */
    function guardarActual() {
      if (!encendido || cambiando || !st.activo) return;
      st.archivos = P.escribir(st.archivos, st.activo, {
        codigo: cfg.editor.getValue(), entrada: cfg.entrada()
      });
      grabar();
    }

    function abrir(nombre) {
      const a = st.archivos.find(x => x.nombre === nombre);
      if (!a) return;
      guardarActual();
      cambiando = true;
      st.activo = a.nombre;
      cfg.aplicar(a.codigo, a.entrada);
      cambiando = false;
      grabar();
      pintar();
      if (cfg.estado) cfg.estado(a.nombre);
    }

    /* Un nombre escrito a mano, validado sin barras: quien crea un archivo
       o una carpeta «acá» ya eligió el destino con el disparador que tocó,
       así que el cuadro de texto solo pide el nombre propio, nunca la
       ruta entera. Antes el destino vivía ADENTRO del mismo texto editable
       (el valor propuesto ya traía «carpeta/» escrito delante) y bastaba
       con borrar esa parte —lo más natural del mundo, si ya estás mirando
       el menú de esa carpeta— para que el archivo apareciera en la raíz
       sin ningún aviso de que el destino se había perdido. */
    function pedirNombrePropio(mensajeBase, destino, valorInicial) {
      const mensaje = destino ? `${mensajeBase} en «${destino}» (solo el nombre):`
                               : `${mensajeBase} en la raíz (solo el nombre):`;
      const escrito = prompt(mensaje, valorInicial);
      if (escrito === null) return null;
      const limpio = String(escrito).trim();
      if (!limpio) { alert('Poné un nombre.'); return null; }
      if (limpio.includes('/') || limpio.includes('\\')) {
        alert('Escribí solo el nombre, sin barras. La carpeta de destino ya está elegida.');
        return null;
      }
      return limpio;
    }

    /* ---------------------------- acciones ----------------------------- */
    function nuevo(carpeta) {
      /* Guardar ANTES de calcular: P.crear() arma la lista nueva a partir
         de st.archivos tal como está en este instante, así que lo último
         que se escribió tiene que estar adentro antes de preguntar nada. */
      guardarActual();
      const propuesto = P.nombreLibre(st.archivos, (carpeta ? carpeta + '/' : '') + 'programa' + (cfg.ext || '.sl'));
      const base = propuesto.slice(propuesto.lastIndexOf('/') + 1);
      const limpio = pedirNombrePropio('Nombre del archivo nuevo', carpeta, base);
      if (limpio === null) return;
      const nombre = (carpeta ? carpeta + '/' : '') + limpio;
      const r = P.crear(st.archivos, nombre, { ext: cfg.ext, codigo: PLANTILLA() });
      if (r.error) { alert(r.error); return; }
      st.archivos = r.lista;
      abrir(r.archivo.nombre);
    }

    /* Un archivo que llegó de AFUERA (el sistema operativo, vía la PWA
       instalada) entra a la raíz del proyecto, nunca pisa uno que ya
       existía: si el nombre está ocupado, se le suma «2», «3», etc., como
       en cualquier explorador de verdad. Solo tiene sentido llamarla con
       el explorador prendido; con el explorador apagado quien llama tiene
       que aplicar el código directo al editor, como con «Abrir…» de disco. */
    function abrirExterno(nombre, codigo) {
      guardarActual();
      const propuesto = P.nombreLibre(st.archivos, nombre);
      const r = P.crear(st.archivos, propuesto, { ext: cfg.ext, codigo });
      if (r.error) return { error: r.error };
      st.archivos = r.lista;
      abrir(r.archivo.nombre);
      return { archivo: r.archivo.nombre };
    }

    /* Una carpeta se crea sola, sin archivo adentro. Antes había que crearle
       uno para que existiera —una carpeta vacía no se podía deducir de nada— y
       eso obligaba a inventar un programa que nadie pidió. */
    function nuevaCarpeta(dentroDe) {
      const limpio = pedirNombrePropio('Nombre de la carpeta nueva', dentroDe, 'carpeta');
      if (limpio === null) return;
      const ruta = (dentroDe ? dentroDe + '/' : '') + limpio;
      const r = P.crearCarpeta(st, ruta);
      if (r.error) { alert(r.error); return; }
      st = r.estado;
      abiertas.add(r.carpeta);
      grabar();
      pintar(r.carpeta);
    }

    /* «Renombrar o mover» sigue siendo el mismo cuadro con la ruta entera
       editable —acá sí hace falta, es la única forma de decirle a dónde
       se muda— pero con el mensaje diciendo explícitamente que sirve para
       eso, no solo para cambiarle el nombre. */
    function renombrarCarpeta(ruta) {
      guardarActual();
      const nueva = prompt(
        'Escribí el nombre y la ruta completos. Para moverla, usá «destino/carpeta»; ' +
        'para dejarla en la raíz, escribí solo el nombre:', ruta);
      if (nueva === null) return;
      const destino = String(nueva).trim();
      if (destino === ruta) return;
      /* Mover una carpeta ADENTRO de sí misma —o de una de sus propias
         subcarpetas— no tiene ningún resultado sensato, y el modelo no lo
         rechaza por su cuenta: lo cuidamos acá, antes de tocar nada. */
      if (destino.startsWith(ruta + '/')) {
        alert('No podés mover una carpeta adentro de sí misma.');
        return;
      }
      const r = P.renombrarCarpeta(st, ruta, destino);
      if (r.error) { alert(r.error); return; }
      /* Cada archivo o subcarpeta que viaja adentro se queda con la misma
         «cola» después del nombre nuevo; P.renombrarCarpeta() no revisa
         que esas rutas finales sigan siendo válidas (el tope de caracteres,
         de niveles), así que se revisan acá, TODAS, antes de aplicar nada.
         Una mudanza que se corta a la mitad porque una subcarpeta muy
         anidada se pasó de largo es peor que una que nunca empieza. */
      const rutasFinales = r.estado.archivos.map(a => a.nombre)
        .concat(r.estado.carpetas)
        .filter(n => n === destino || n.startsWith(destino + '/'));
      for (const n of rutasFinales) {
        const error = P.validarRuta(n);
        if (error) { alert(`«${n}»: ${error.charAt(0).toLowerCase() + error.slice(1)}`); return; }
      }
      st = r.estado;
      /* «abiertas» recuerda quién estaba desplegado por su ruta VIEJA: sin
         esto, la carpeta que se acaba de mover —y todo lo que tenía
         adentro abierto— se cerraba sola en el mismo repintado, como si el
         cambio de nombre también hubiera guardado el árbol. */
      for (const vieja of [...abiertas]) {
        if (vieja === ruta) { abiertas.delete(vieja); abiertas.add(destino); }
        else if (vieja.startsWith(ruta + '/')) {
          abiertas.delete(vieja);
          abiertas.add(destino + vieja.slice(ruta.length));
        }
      }
      /* Y los ANTECESORES del destino también quedan abiertos: si «cinthia»
         estaba cerrada y la carpeta se mudó adentro, tiene que desplegarse
         sola para que se vea dónde quedó. */
      const tramos = destino.split('/');
      let acum = '';
      for (let i = 0; i < tramos.length - 1; i++) {
        acum += (acum ? '/' : '') + tramos[i];
        abiertas.add(acum);
      }
      grabar();
      pintar(destino);
      if (st.activo) {
        const a = st.archivos.find(x => x.nombre === st.activo);
        if (a && cfg.estado) cfg.estado(a.nombre);
      }
    }

    function borrarCarpeta(ruta) {
      const adentro = st.archivos.filter(a => P.dentroDe(ruta, a.nombre)).length;
      const aviso = adentro
        ? `Se va a borrar la carpeta «${ruta}» con ${adentro} archivo(s) adentro. No se puede deshacer.`
        : `¿Borrar la carpeta vacía «${ruta}»?`;
      if (!confirm(aviso)) return;
      const eraElAbierto = st.activo && P.dentroDe(ruta, st.activo);
      /* Al padre si lo tiene, o a la barra de arriba si la carpeta borrada
         estaba en la raíz: eso decide pintar() cuando la ruta no existe. */
      const padre = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/')) : null;
      st = P.borrarCarpeta(st, ruta).estado;
      grabar();
      if (eraElAbierto && st.archivos.length) abrir(st.archivos[0].nombre);
      else pintar(padre);
    }

    /* ------------------------ llevarse y traer ------------------------- */

    async function exportarCarpeta(ruta) {
      guardarActual();
      try {
        const bytes = await global.Carpeta.comprimir(global.Carpeta.armar(st, ruta));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/gzip' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = global.Carpeta.nombreDeArchivo(ruta);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (e) {
        alert('No se pudo armar el archivo de la carpeta.');
      }
    }

    function importarCarpeta() {
      const campo = document.createElement('input');
      campo.type = 'file';
      campo.accept = global.Carpeta.EXTENSION;
      campo.addEventListener('change', async () => {
        const f = campo.files && campo.files[0];
        if (!f) return;
        /* El tamaño se mira ANTES de leer: un archivo de 800 MB no es un
           ataque elaborado, pero cuelga la pestaña igual. */
        if (f.size > global.Carpeta.LIMITES.archivo) {
          alert('Ese archivo es demasiado grande para ser una carpeta de ESLE2.');
          return;
        }
        let paquete;
        try {
          paquete = await global.Carpeta.descomprimir(new Uint8Array(await f.arrayBuffer()));
        } catch (e) { paquete = null; }
        if (!paquete) { alert('Ese archivo no es una carpeta de ESLE2, o está roto.'); return; }

        const propuesta = prompt('¿En qué carpeta la traigo?', paquete.raiz || 'importado');
        if (propuesta === null) return;
        const r = global.Carpeta.fundir(st, paquete, String(propuesta).trim());
        if (r.error) { alert(r.error); return; }
        guardarActual();
        st = r.estado;
        abiertas.add(r.raiz);
        grabar();
        pintar();
        alert(`Listo: ${r.cuantos} archivo(s) en «${r.raiz}».`);
      });
      campo.click();
    }

    function renombrar(nombre) {
      guardarActual();
      const nuevoNombre = prompt(
        'Escribí el nombre y la ruta completos. Para moverlo, usá «carpeta/archivo.sl»; ' +
        'para dejarlo en la raíz, escribí solo el nombre:', nombre);
      if (nuevoNombre === null) return;
      const r = P.renombrar(st.archivos, nombre, nuevoNombre);
      if (r.error) { alert(r.error); return; }
      st.archivos = r.lista;
      if (st.activo === nombre) st.activo = r.archivo.nombre;
      grabar();
      pintar(r.archivo.nombre);
    }

    function duplicar(nombre) {
      guardarActual();
      const r = P.duplicar(st.archivos, nombre);
      if (r.error) { alert(r.error); return; }
      st.archivos = r.lista;
      grabar();
      pintar(r.archivo.nombre);
    }

    function borrar(nombre) {
      if (!confirm(`¿Borrar «${nombre}»? No se puede deshacer.`)) return;
      const padre = nombre.includes('/') ? nombre.slice(0, nombre.lastIndexOf('/')) : null;
      st.archivos = P.borrar(st.archivos, nombre).lista;
      if (st.activo === nombre) {
        st.activo = st.archivos.length ? st.archivos[0].nombre : null;
        if (st.activo) {
          const a = st.archivos.find(x => x.nombre === st.activo);
          cambiando = true;
          cfg.aplicar(a.codigo, a.entrada);
          cambiando = false;
        }
      }
      grabar();
      pintar(padre);
    }

    /* Un archivo nuevo arranca con el esqueleto mínimo que compila; cada
       dialecto puede traer el suyo (ESLE2 Visual abre además la ventana). */
    const PLANTILLA = () => cfg.plantilla || 'var\ninicio\n   \nfin\n';

    /* ---------------------------- dibujar ------------------------------ */
    /* El color del icono según la extensión, como en cualquier explorador:
       de un vistazo se ve qué es cada archivo sin leer el nombre. */
    function claseExtension(nombre) {
      const u = nombre.slice(nombre.lastIndexOf('/') + 1);
      const punto = u.lastIndexOf('.');
      const ext = punto > 0 ? u.slice(punto + 1).toLowerCase() : '';
      return 'ext-' + (['sl', 'slp', 'txt', 'json', 'md', 'csv'].includes(ext) ? ext : 'otro');
    }

    /* Los archivos de código (el .sl de cada dialecto y sus variantes) llevan
       una forma de icono distinta a un documento cualquiera, no solo otro
       color: así se distinguen aunque el alumno no vea bien los colores. */
    const EXT_CODIGO = ['sl', 'slp', 'sldb', 'slv'];
    function iconoDocumento(nombre) {
      const u = nombre.slice(nombre.lastIndexOf('/') + 1);
      const punto = u.lastIndexOf('.');
      const ext = punto > 0 ? u.slice(punto + 1).toLowerCase() : '';
      return EXT_CODIGO.includes(ext) ? 'documento-sl' : 'documento';
    }

    /* El disparador ⋮ de una fila: siempre visible, con o sin mouse. Un solo
       botón en vez de tres o cinco es lo que hace que quepa en una barra
       lateral angosta y que en el celular no ocupe la fila entera. */
    function disparador(etiqueta, ruta) {
      const x = nodo('button', 'exp-mini exp-disparador');
      x.type = 'button';
      x.setAttribute('data-ic', 'mas');
      if (global.Iconos) x.innerHTML = global.Iconos.svg('mas');
      x.setAttribute('aria-haspopup', 'true');
      x.setAttribute('aria-expanded', 'false');
      x.setAttribute('aria-controls', 'expMenu');
      x.setAttribute('aria-label', etiqueta);
      x.title = etiqueta;
      x.dataset.ruta = ruta;
      return x;
    }

    function filaArchivo(a) {
      const li = nodo('li', 'exp-item' + (a.nombre === st.activo ? ' activo' : ''));
      li.dataset.ruta = a.nombre;

      const b = nodo('button', 'exp-archivo ' + claseExtension(a.nombre));
      b.type = 'button';
      b.title = a.nombre;
      b.setAttribute('aria-current', a.nombre === st.activo ? 'true' : 'false');
      b.innerHTML = global.Iconos ? global.Iconos.svg(iconoDocumento(a.nombre)) : '';
      b.appendChild(nodo('span', 'exp-nombre', a.etiqueta || a.nombre));
      b.addEventListener('click', () => abrir(a.nombre));

      const disp = disparador('Acciones del archivo «' + a.nombre + '»', a.nombre);
      disp.addEventListener('click', ev => {
        ev.stopPropagation();
        abrirMenu(disp, a.nombre, [
          { etiqueta: 'Renombrar o mover…', icono: 'renombrar', fn: () => renombrar(a.nombre) },
          { etiqueta: 'Duplicar', icono: 'archivos', fn: () => duplicar(a.nombre) },
          { etiqueta: 'Borrar…', icono: 'borrar', peligrosa: true, fn: () => borrar(a.nombre) }
        ]);
      });

      li.append(b, disp);
      return li;
    }

    /* Una carpeta es un <details>: el triangulito que abre y cierra lo pone el
       navegador y el teclado ya funciona. Las carpetas abiertas se recuerdan
       para que al repintar no se cierren todas de golpe. */
    const abiertas = new Set();

    function pintarCarpeta(c) {
      const det = nodo('details', 'exp-carpeta');
      det.open = !abiertas.size || abiertas.has(c.ruta);
      det.addEventListener('toggle', () => {
        if (det.open) abiertas.add(c.ruta); else abiertas.delete(c.ruta);
      });
      const sum = nodo('summary', 'exp-sum');
      sum.innerHTML = global.Iconos ? global.Iconos.svg('carpeta') : '';
      sum.appendChild(nodo('span', 'exp-nombre', c.nombre));
      det.append(sum, pintarLista(c));

      /* El disparador va afuera del <summary> y no adentro: un botón adentro
         de otro elemento que ya es un botón es lo que axe llama
         «nested-interactive», y para quien navega con teclado o lector de
         pantalla es un lío. Ocupa su propio hueco reservado con CSS, así que
         nunca tapa el nombre de la carpeta. */
      const disp = disparador('Acciones de la carpeta «' + c.ruta + '»', c.ruta);
      disp.addEventListener('click', ev => {
        ev.stopPropagation();
        abrirMenu(disp, c.ruta, [
          { etiqueta: 'Nuevo archivo acá', icono: 'nuevo', fn: () => nuevo(c.ruta) },
          { etiqueta: 'Nueva carpeta acá', icono: 'carpeta', fn: () => nuevaCarpeta(c.ruta) },
          { etiqueta: 'Renombrar o mover carpeta…', icono: 'renombrar', fn: () => renombrarCarpeta(c.ruta) },
          { etiqueta: 'Exportar carpeta', icono: 'exportar', fn: () => exportarCarpeta(c.ruta) },
          { etiqueta: 'Borrar carpeta…', icono: 'borrar', peligrosa: true, fn: () => borrarCarpeta(c.ruta) }
        ]);
      });

      const fila = nodo('div', 'exp-fila-sum');
      fila.append(det, disp);
      const li = nodo('li', 'exp-fila-carpeta');
      li.dataset.ruta = c.ruta;
      li.appendChild(fila);
      return li;
    }

    function pintarLista(nodoArbol) {
      const ul = nodo('ul', 'exp-lista');
      nodoArbol.carpetas.forEach(c => ul.appendChild(pintarCarpeta(c)));
      nodoArbol.archivos.forEach(a => ul.appendChild(filaArchivo(a)));
      return ul;
    }

    /* «enfocarRuta» es adónde vuelve el teclado después de repintar: al
       disparador de esa fila si sigue existiendo, o si no —se borró, por
       ejemplo— al primer botón de la barra de arriba. Sin esto, cada acción
       dejaba el foco tirado en un botón que el repintado acababa de destruir. */
    function pintar(enfocarRuta) {
      cerrarMenu(false);
      const cuerpo = $('#expCuerpo');
      cuerpo.replaceChildren();
      if (!st.archivos.length && !st.carpetas.length) {
        cuerpo.appendChild(nodo('p', 'nota', 'No hay archivos todavía. Creá uno con «Nuevo archivo».'));
      } else {
        /* Arriba de todo, la raíz del proyecto: cierra y abre el árbol entero,
           igual que la carpeta del proyecto en un editor de escritorio. */
        const raiz = nodo('details', 'exp-carpeta exp-raiz');
        raiz.open = true;
        const sum = nodo('summary', 'exp-sum');
        sum.appendChild(nodo('span', 'exp-nombre', cfg.proyecto || 'Mis programas'));
        raiz.append(sum, pintarLista(P.arbol(st.archivos, st.carpetas)));
        cuerpo.appendChild(raiz);
      }
      $('#expCuenta').textContent = st.archivos.length === 1
        ? '1 archivo' : st.archivos.length + ' archivos';
      const tit = $('#tituloArchivo');
      if (tit) tit.textContent = encendido && st.activo ? st.activo : tit.dataset.porDefecto;

      /* undefined: no se toca el foco (abrir un archivo, prender el
         explorador). null o una ruta: se pidió explícitamente, y si esa ruta
         ya no existe —se acaba de borrar, por ejemplo— se cae a la barra de
         arriba en vez de dejar el foco tirado en un botón que ya no está. */
      if (enfocarRuta !== undefined) {
        const fila = enfocarRuta === null ? null
          : cuerpo.querySelector('[data-ruta="' + String(enfocarRuta).replace(/"/g, '\\"') + '"]');
        /* «:scope >» y no un querySelector cualquiera: una carpeta con algo
           adentro tiene MÁS de un .exp-disparador en su subárbol —el suyo y
           los de lo que tiene dentro—, y sin acotar al hijo directo el foco
           podía terminar en el disparador de una carpeta anidada. */
        const disp = fila && fila.querySelector(':scope > .exp-fila-sum > .exp-disparador, :scope > .exp-disparador');
        if (disp) disp.focus(); else { const n = $('#expNuevo'); if (n) n.focus(); }
      }
    }

    /* --------------------------- encender ------------------------------ */
    function aplicarModo(v) {
      encendido = !!v;
      panel.classList.toggle('oculto', !encendido);
      document.body.classList.toggle('con-explorador', encendido);
      boton.setAttribute('aria-pressed', String(encendido));
      const etiqueta = boton.querySelector('.menu-etiqueta') || boton;
      etiqueta.textContent = encendido ? 'Explorador de archivos ✓' : 'Explorador de archivos';

      if (encendido && !st.archivos.length) {
        /* Primera vez: lo que hay en el editor pasa a ser el primer archivo. */
        const r = P.crear([], 'programa' + (cfg.ext || '.sl'),
          { ext: cfg.ext, codigo: cfg.editor.getValue(), entrada: cfg.entrada() });
        st = P.normalizar({ archivos: r.lista, carpetas: st.carpetas, activo: r.archivo.nombre });
        grabar();
      } else if (encendido && st.activo) {
        const a = st.archivos.find(x => x.nombre === st.activo);
        if (a) {
          cambiando = true;
          cfg.aplicar(a.codigo, a.entrada);
          cambiando = false;
        }
      }
      pintar();
      global.dispatchEvent(new CustomEvent('esle2:disposicion'));
    }

    /* ------------------------------ cableado --------------------------- */
    boton.addEventListener('click', () => {
      guardarActual();
      const v = !encendido;
      grabarModo(v);
      aplicarModo(v);
    });
    /* Los botones de la barra de arriba crean adentro de la carpeta del
       archivo que está abierto, no siempre en la raíz: si estás mirando
       «parcial/a.sl» y tocás «Nuevo archivo», lo esperable es que el
       archivo nuevo quede en «parcial», no que aparezca en otro lado. Cada
       carpeta también tiene su propio «Nuevo archivo acá» en el disparador
       ⋮, que ya apunta a esa carpeta puntual y no cambia con esto. */
    const carpetaActiva = () => (st.activo && st.activo.includes('/'))
      ? st.activo.slice(0, st.activo.lastIndexOf('/')) : '';
    $('#expNuevo').addEventListener('click', () => nuevo(carpetaActiva()));
    $('#expNuevaCarpeta').addEventListener('click', () => nuevaCarpeta(carpetaActiva()));
    const btnImportar = $('#expImportar');
    if (btnImportar) btnImportar.addEventListener('click', importarCarpeta);
    /* Todo el proyecto es «la carpeta raíz»: Carpeta.armar(st, '') ya trae
       todo lo que hay, así que exportar el proyecto entero no es un camino
       aparte, es exportarCarpeta('') con el mismo botón de siempre. */
    const btnExportar = $('#expExportar');
    if (btnExportar) btnExportar.addEventListener('click', () => exportarCarpeta(''));

    /* Adentro del árbol el menú se movería con lo que scrollea; se cierra en
       vez de perseguirlo. */
    const cuerpoExp = $('#expCuerpo');
    if (cuerpoExp) cuerpoExp.addEventListener('scroll', () => cerrarMenu(false));

    cfg.editor.on('change', () => {
      if (!encendido || cambiando) return;
      clearTimeout(reloj);
      reloj = setTimeout(guardarActual, ESPERA);
    });
    const campo = $('#entrada');
    if (campo) campo.addEventListener('input', () => {
      if (!encendido || cambiando) return;
      clearTimeout(reloj);
      reloj = setTimeout(guardarActual, ESPERA);
    });
    global.addEventListener('beforeunload', guardarActual);

    aplicarModo(leerModo());

    /* Lo que necesita js/versiones-ui.js para hacer commits del proyecto
       entero: leer el estado tal cual está guardado (con lo que se esté
       escribiendo en este momento incluido) y reemplazarlo entero —al
       restaurar una versión vieja o al traer cambios de otra computadora—
       prendiendo el explorador si hiciera falta, porque un proyecto con más
       de un archivo no se puede mostrar con el explorador apagado. */
    function estadoCompleto() {
      guardarActual();
      return P.normalizar(st);
    }

    function establecer(nuevoEstado) {
      st = P.normalizar(nuevoEstado);
      grabar();
      if (st.archivos.length > 1 && !encendido) {
        encendido = true;
        grabarModo(true);
        panel.classList.remove('oculto');
        document.body.classList.add('con-explorador');
        boton.setAttribute('aria-pressed', 'true');
        const etiqueta = boton.querySelector('.menu-etiqueta') || boton;
        etiqueta.textContent = 'Explorador de archivos ✓';
      }
      if (encendido && st.activo) {
        const a = st.archivos.find(x => x.nombre === st.activo);
        if (a) { cambiando = true; cfg.aplicar(a.codigo, a.entrada); cambiando = false; }
      } else if (!encendido && st.archivos[0]) {
        cambiando = true; cfg.aplicar(st.archivos[0].codigo, st.archivos[0].entrada); cambiando = false;
      }
      pintar();
      global.dispatchEvent(new CustomEvent('esle2:disposicion'));
    }

    return {
      activo: () => (encendido ? st.activo : null), guardarActual, abrir, encendido: () => encendido,
      estadoCompleto, establecer, abrirExterno
    };
  }

  global.ProyectoUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

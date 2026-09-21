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

    /* ---------------------------- acciones ----------------------------- */
    function nuevo(carpeta) {
      const propuesto = P.nombreLibre(st.archivos, (carpeta ? carpeta + '/' : '') + 'programa' + (cfg.ext || '.sl'));
      const nombre = prompt('Nombre del archivo nuevo:', propuesto);
      if (nombre === null) return;
      const r = P.crear(st.archivos, nombre, { ext: cfg.ext, codigo: PLANTILLA() });
      if (r.error) { alert(r.error); return; }
      guardarActual();
      st.archivos = r.lista;
      abrir(r.archivo.nombre);
    }

    /* Una carpeta se crea sola, sin archivo adentro. Antes había que crearle
       uno para que existiera —una carpeta vacía no se podía deducir de nada— y
       eso obligaba a inventar un programa que nadie pidió. */
    function nuevaCarpeta(dentroDe) {
      const base = (dentroDe ? dentroDe + '/' : '') + 'carpeta';
      const carpeta = prompt('Nombre de la carpeta nueva:', base);
      if (carpeta === null) return;
      const limpio = String(carpeta).trim().replace(/^\/+|\/+$/g, '');
      if (!limpio) return;
      const r = P.crearCarpeta(st, limpio);
      if (r.error) { alert(r.error); return; }
      st = r.estado;
      abiertas.add(limpio);
      grabar();
      pintar();
    }

    function renombrarCarpeta(ruta) {
      const nueva = prompt('Nuevo nombre de la carpeta:', ruta);
      if (nueva === null) return;
      const r = P.renombrarCarpeta(st, ruta, String(nueva).trim());
      if (r.error) { alert(r.error); return; }
      guardarActual();
      st = r.estado;
      grabar();
      pintar();
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
      st = P.borrarCarpeta(st, ruta).estado;
      grabar();
      if (eraElAbierto && st.archivos.length) abrir(st.archivos[0].nombre);
      else pintar();
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
      const nuevoNombre = prompt('Nuevo nombre (podés usar «carpeta/archivo» para moverlo):', nombre);
      if (nuevoNombre === null) return;
      const r = P.renombrar(st.archivos, nombre, nuevoNombre);
      if (r.error) { alert(r.error); return; }
      st.archivos = r.lista;
      if (st.activo === nombre) st.activo = r.archivo.nombre;
      grabar();
      pintar();
    }

    function duplicar(nombre) {
      guardarActual();
      const r = P.duplicar(st.archivos, nombre);
      if (r.error) { alert(r.error); return; }
      st.archivos = r.lista;
      grabar();
      pintar();
    }

    function borrar(nombre) {
      if (!confirm(`¿Borrar «${nombre}»? No se puede deshacer.`)) return;
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
      pintar();
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

    function filaArchivo(a) {
      const li = nodo('li', 'exp-item' + (a.nombre === st.activo ? ' activo' : ''));

      const b = nodo('button', 'exp-archivo ' + claseExtension(a.nombre));
      b.type = 'button';
      b.title = a.nombre;
      b.setAttribute('aria-current', a.nombre === st.activo ? 'true' : 'false');
      b.innerHTML = global.Iconos ? global.Iconos.svg('documento') : '';
      b.appendChild(nodo('span', 'exp-nombre', a.etiqueta || a.nombre));
      b.addEventListener('click', () => abrir(a.nombre));

      const acciones = nodo('span', 'exp-acciones');
      const mini = (ic, titulo, fn) => {
        const x = nodo('button', 'exp-mini');
        x.type = 'button';
        x.title = titulo;
        x.setAttribute('aria-label', titulo + ' ' + a.nombre);
        x.innerHTML = global.Iconos ? global.Iconos.svg(ic) : titulo[0];
        x.addEventListener('click', ev => { ev.stopPropagation(); fn(a.nombre); });
        acciones.appendChild(x);
      };
      mini('renombrar', 'Renombrar', renombrar);
      mini('archivos', 'Duplicar', duplicar);
      mini('borrar', 'Borrar', borrar);

      li.append(b, acciones);
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
      sum.appendChild(nodo('span', 'exp-nombre', c.nombre));
      det.appendChild(sum);
      det.appendChild(pintarLista(c));
      return det;
    }

    /* Los botones de una carpeta NO van adentro del <summary>: un botón
       adentro de otro elemento que ya es un botón es exactamente lo que axe
       llama «nested-interactive», y para quien navega con teclado o lector de
       pantalla es un lío. Van al lado, en la misma fila, puestos con CSS. */
    function accionesDeCarpeta(ruta) {
      const acciones = nodo('span', 'exp-acciones exp-acciones-carpeta');
      const mini = (ic, titulo, fn) => {
        const x = nodo('button', 'exp-mini');
        x.type = 'button';
        x.title = titulo;
        x.setAttribute('aria-label', titulo + ' la carpeta ' + ruta);
        x.innerHTML = global.Iconos ? global.Iconos.svg(ic) : titulo[0];
        x.addEventListener('click', ev => { ev.stopPropagation(); fn(ruta); });
        acciones.appendChild(x);
      };
      mini('nuevo', 'Nuevo archivo en', nuevo);
      mini('archivos', 'Nueva carpeta dentro de', nuevaCarpeta);
      mini('guardar', 'Exportar', exportarCarpeta);
      mini('renombrar', 'Renombrar', renombrarCarpeta);
      mini('borrar', 'Borrar', borrarCarpeta);
      return acciones;
    }

    function pintarLista(nodoArbol) {
      const ul = nodo('ul', 'exp-lista');
      nodoArbol.carpetas.forEach(c => {
        const li = nodo('li', 'exp-fila-carpeta');
        li.appendChild(pintarCarpeta(c));
        li.appendChild(accionesDeCarpeta(c.ruta));
        ul.appendChild(li);
      });
      nodoArbol.archivos.forEach(a => ul.appendChild(filaArchivo(a)));
      return ul;
    }

    function pintar() {
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
    $('#expNuevo').addEventListener('click', () => nuevo(''));
    $('#expNuevaCarpeta').addEventListener('click', () => nuevaCarpeta(''));
    const btnImportar = $('#expImportar');
    if (btnImportar) btnImportar.addEventListener('click', importarCarpeta);

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

    return { activo: () => (encendido ? st.activo : null), guardarActual, abrir, encendido: () => encendido };
  }

  global.ProyectoUI = { iniciar };
})(typeof window !== 'undefined' ? window : globalThis);

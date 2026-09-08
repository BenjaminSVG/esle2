/*
 * Registra el service worker (para que el sitio ande sin internet) y se ocupa
 * de instalar ESLE2 como aplicación.
 *
 * Hay dos caminos y ninguno se puede evitar:
 *   · Chrome y Edge —en Android y en escritorio— avisan con el evento
 *     beforeinstallprompt y dejan abrir el cartel de instalación desde el
 *     código: ahí el botón instala de una;
 *   · Safari (iPhone y iPad) y Firefox no tienen ese evento: la única forma es
 *     que la persona use el menú del navegador. Como no hay manera de hacerlo
 *     por ella, el botón abre un diálogo con los pasos del navegador que está
 *     usando, que es lo que hace falta para que ESLE2 quede en el teléfono.
 *
 * El diálogo se arma acá y no en el HTML porque son cinco páginas: una sola
 * copia en JavaScript no se desincroniza.
 */
(function () {
  'use strict';

  /* Con file:// no hay service worker; el sitio funciona igual, solo que sin caché. */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin caché, nada grave */ });
    });
  }

  const $ = s => document.querySelector(s);
  const ua = navigator.userAgent || '';
  const esIOS = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPad moderno
  const esAndroid = /Android/.test(ua);

  /* Ya instalada: en una ventana de aplicación no tiene sentido ofrecerlo. */
  const instalada = () =>
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;

  let invitacion = null;   // el evento de Chrome/Edge, si llegó

  const boton = () => $('#btnInstalar');

  function mostrarBoton() {
    const b = boton();
    if (!b) return;
    b.classList.toggle('oculto', instalada());
    b.title = 'Instalar ESLE2 como aplicación en este dispositivo';
  }

  window.addEventListener('beforeinstallprompt', ev => {
    ev.preventDefault();
    invitacion = ev;
    mostrarBoton();
  });

  window.addEventListener('appinstalled', () => {
    invitacion = null;
    const b = boton();
    if (b) b.classList.add('oculto');
  });

  /* --------------------- el diálogo con los pasos --------------------- */
  const PASOS = [
    {
      id: 'ios',
      titulo: 'iPhone o iPad (Safari)',
      pasos: ['Tocá el botón Compartir, el cuadradito con la flecha hacia arriba.',
              'Bajá hasta «Añadir a pantalla de inicio» (o «Agregar a inicio»).',
              'Tocá «Añadir». ESLE2 queda con su icono, junto a las demás aplicaciones.'],
      nota: 'En el iPhone solo funciona desde Safari: si estás en Chrome, abrí antes esta ' +
            'página en Safari.'
    },
    {
      id: 'android',
      titulo: 'Android (Chrome)',
      pasos: ['Tocá el menú ⋮ arriba a la derecha.',
              'Elegí «Instalar aplicación» o «Añadir a pantalla de inicio».',
              'Confirmá con «Instalar».']
    },
    {
      id: 'escritorio',
      titulo: 'Computadora (Chrome, Edge)',
      pasos: ['Mirá el icono de instalar al final de la barra de direcciones.',
              'O abrí el menú ⋮ y elegí «Instalar ESLE2…».']
    }
  ];

  function armarDialogo() {
    let dlg = $('#dlgInstalar');
    if (dlg) return dlg;

    dlg = document.createElement('dialog');
    dlg.id = 'dlgInstalar';
    dlg.className = 'dlg dlg-instalar';

    const h = document.createElement('h3');
    h.textContent = 'Instalar ESLE2 en este dispositivo';
    const nota = document.createElement('p');
    nota.className = 'nota';
    nota.textContent = 'Queda con su propio icono y se abre a pantalla completa, sin la barra del ' +
      'navegador. Anda sin internet: el curso, la documentación y el IDE ya están guardados. ' +
      'Este navegador no permite instalarla desde un botón, así que van los pasos:';
    dlg.append(h, nota);

    const orden = esIOS ? ['ios', 'android', 'escritorio']
                : esAndroid ? ['android', 'ios', 'escritorio']
                : ['escritorio', 'android', 'ios'];
    for (const id of orden) {
      const p = PASOS.find(x => x.id === id);
      const sec = document.createElement('section');
      sec.className = 'inst-bloque' + (id === orden[0] ? ' propio' : '');
      const t = document.createElement('h4');
      t.textContent = p.titulo;
      const ol = document.createElement('ol');
      p.pasos.forEach(x => {
        const li = document.createElement('li');
        li.textContent = x;
        ol.appendChild(li);
      });
      sec.append(t, ol);
      if (p.nota) {
        const n = document.createElement('p');
        n.className = 'nota';
        n.textContent = p.nota;
        sec.appendChild(n);
      }
      dlg.appendChild(sec);
    }

    const fila = document.createElement('div');
    fila.className = 'dlg-fila derecha';
    const cerrar = document.createElement('button');
    cerrar.className = 'btn primario';
    cerrar.type = 'button';
    cerrar.textContent = 'Entendido';
    cerrar.addEventListener('click', () => dlg.close());
    fila.appendChild(cerrar);
    dlg.appendChild(fila);

    document.body.appendChild(dlg);
    return dlg;
  }

  document.addEventListener('click', async ev => {
    if (!ev.target.closest('#btnInstalar')) return;
    if (invitacion) {
      invitacion.prompt();
      const r = await invitacion.userChoice;
      invitacion = null;
      if (r && r.outcome === 'accepted') boton().classList.add('oculto');
      return;
    }
    const d = armarDialogo();
    d.showModal();
    /* showModal() enfoca el botón del final y el navegador lo trae a la vista,
       dejando el título fuera de pantalla en un teléfono. */
    d.scrollTop = 0;
  });

  /* Sin el evento de Chrome el botón igual tiene que estar: en el teléfono es
     justo donde más se necesita, y ahí es donde no existe el evento. */
  mostrarBoton();
  if (window.matchMedia) {
    const mm = window.matchMedia('(display-mode: standalone)');
    if (mm.addEventListener) mm.addEventListener('change', mostrarBoton);
  }
})();

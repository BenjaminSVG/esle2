/*
 * El cuadro del tutorial: el índice a la izquierda y una parte de la interfaz
 * por vez a la derecha, con su captura.
 *
 * Es un cuadro y no un recorrido sobre la pantalla de verdad a propósito: el
 * recorrido obliga a ir en orden, tapa justo lo que hay que mirar y no se
 * puede consultar mientras se trabaja. Acá se entra por donde uno quiera, se
 * cierra con Escape y nada de lo que había cambia: ni el programa, ni la base,
 * ni los paneles.
 *
 * El diálogo se arma la primera vez que se abre, no al cargar la página: son
 * treinta secciones y cincuenta imágenes, y la mayoría de las veces nadie lo
 * abre. Las imágenes van con loading="lazy" por lo mismo.
 *
 * API:  TutorialUI.iniciar({ entorno })
 */
(function (global) {
  'use strict';

  function iniciar(cfg) {
    cfg = cfg || {};
    const boton = document.getElementById('btnTutorial');
    if (!boton || !global.Tutorial) return null;

    const entorno = cfg.entorno || global.Tutorial.entornoDe(location.pathname);
    const secciones = global.Tutorial.secciones(entorno);
    if (!secciones.length) return null;

    let dlg = null, indice = null, cuerpo = null, elegida = null;

    function armar() {
      dlg = document.createElement('dialog');
      dlg.id = 'dlgTutorial';
      dlg.className = 'dlg dlg-tutorial';
      dlg.setAttribute('aria-labelledby', 'tutTitulo');

      const cab = document.createElement('div');
      cab.className = 'tut-cab';
      const h3 = document.createElement('h3');
      h3.id = 'tutTitulo';
      h3.textContent = 'Cómo se usa ' + global.Tutorial.ENTORNOS[entorno].nombre;
      const nota = document.createElement('p');
      nota.className = 'nota';
      nota.textContent = 'Cada parte de la pantalla, con su foto y para qué sirve cada botón. ' +
        'Mirar esto no cambia nada de lo que tenés hecho.';
      const cerrar = document.createElement('button');
      cerrar.className = 'btn primario';
      cerrar.type = 'button';
      cerrar.textContent = 'Cerrar';
      cerrar.addEventListener('click', () => dlg.close());
      cab.append(h3, nota, cerrar);

      indice = document.createElement('nav');
      indice.className = 'tut-indice';
      indice.setAttribute('aria-label', 'Partes de la interfaz');
      secciones.forEach((s, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tut-item';
        b.textContent = s.titulo;
        b.addEventListener('click', () => mostrar(i));
        indice.appendChild(b);
      });

      cuerpo = document.createElement('article');
      cuerpo.className = 'tut-cuerpo';
      cuerpo.tabIndex = -1;

      const caja = document.createElement('div');
      caja.className = 'tut-caja';
      caja.append(indice, cuerpo);
      dlg.append(cab, caja);

      /* Cerrar con la X del navegador o con Escape deja el foco donde estaba
         quien abrió el cuadro, que es el único lugar que tiene sentido. */
      dlg.addEventListener('close', () => { if (boton.isConnected) boton.focus(); });
      document.body.appendChild(dlg);
    }

    function mostrar(i) {
      const s = secciones[i];
      if (!s) return;
      elegida = i;
      [...indice.children].forEach((b, n) => {
        b.classList.toggle('activa', n === i);
        /* aria-current y no aria-selected: esto es una lista de enlaces a
           secciones, no una lista de pestañas con su teclado propio. */
        if (n === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });

      cuerpo.replaceChildren();
      const h4 = document.createElement('h4');
      h4.textContent = s.titulo;
      const p = document.createElement('p');
      p.textContent = s.texto;
      cuerpo.append(h4, p);

      if (s.captura) cuerpo.appendChild(figura(s.captura));

      if (s.controles.length) {
        const lista = document.createElement('dl');
        lista.className = 'tut-controles';
        for (const c of s.controles) {
          const dt = document.createElement('dt');
          dt.textContent = c.nombre;
          if (c.atajo) {
            const k = document.createElement('kbd');
            k.textContent = c.atajo;
            dt.append(' ', k);
          }
          const dd = document.createElement('dd');
          dd.textContent = c.que;
          lista.append(dt, dd);
        }
        cuerpo.appendChild(lista);
      }
      cuerpo.scrollTop = 0;
      cuerpo.focus();
    }

    function figura(captura) {
      const fig = document.createElement('figure');
      fig.className = 'tut-figura';
      const img = document.createElement('img');
      img.src = captura.ruta;
      img.alt = captura.alt || '';
      if (captura.ancho) { img.width = captura.ancho; img.height = captura.alto; }
      img.loading = 'lazy';
      img.decoding = 'async';
      /* Si la imagen no está —una caché a medio bajar, por ejemplo— la
         explicación tiene que seguir sirviendo igual: se cambia por un aviso
         y no por un cuadrito roto. */
      img.addEventListener('error', () => {
        const aviso = document.createElement('p');
        aviso.className = 'nota tut-sin-imagen';
        aviso.textContent = 'No se pudo cargar la captura de esta parte. Lo de abajo la explica igual.';
        img.replaceWith(aviso);
      });
      const pie = document.createElement('figcaption');
      const enlace = document.createElement('a');
      enlace.href = captura.ruta;
      enlace.target = '_blank';
      enlace.rel = 'noopener';
      enlace.textContent = 'Ver la captura en su tamaño original';
      pie.appendChild(enlace);
      fig.append(img, pie);
      return fig;
    }

    function abrir() {
      if (!dlg) armar();
      if (!dlg.open) dlg.showModal();
      mostrar(elegida === null ? 0 : elegida);
    }

    boton.addEventListener('click', abrir);
    return { abrir, cerrar: () => dlg && dlg.close(), get secciones() { return secciones; } };
  }

  global.TutorialUI = { iniciar };

  /* Se engancha solo: el botón es el mismo en las cuatro páginas y no hace
     falta que cada IDE se acuerde de llamarlo. Si no hay botón —la
     documentación, el diseño— no pasa nada. */
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => iniciar());
    } else {
      iniciar();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

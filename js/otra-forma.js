/*
 * «Otra forma de resolverlo».
 *
 * El alumno resuelve un ejercicio, pasa los casos y sigue al siguiente. Nunca
 * se entera de que había una manera más corta, ni de que la cátedra lo pensó
 * distinto. Eso es la mitad de lo que se aprende en un curso de programación,
 * y hoy se pierde entero.
 *
 * Reglas, en orden de importancia:
 *
 *   · SOLO después de resolverlo. Antes es el botón de copiar, y un curso
 *     con botón de copiar no enseña nada. Lo que habilita el botón es el
 *     progreso guardado, no haber apretado «Verificar» recién: quien lo
 *     resolvió ayer también tiene derecho a comparar;
 *   · las soluciones NO viajan con la página. Son 14 KB que se piden recién
 *     cuando alguien toca el botón, y quien nunca lo toca no los baja;
 *   · no se dice cuál es mejor. Se muestran las dos, una al lado de la otra,
 *     y se cuenta cuántas líneas tiene cada una. Que la de la cátedra sea más
 *     corta no la hace más correcta, y decirle a alguien que su programa —que
 *     funciona— está mal es la forma más rápida de que deje de escribir.
 *
 * API:  OtraForma.iniciar({ solucionesUrl })
 *       OtraForma.hayPara(id)        (después de cargar)
 *       OtraForma.mostrar(ejercicio, codigoDelAlumno)
 *       OtraForma.comparar(mio, dela)  -> {lineasMias, lineasDeLaCatedra, ...}
 */
(function (global) {
  'use strict';

  const URL_POR_OMISION = 'js/soluciones.js';
  let cargando = null;

  /* Las cuentas son a propósito modestas: cuántas líneas de código tiene cada
     una, sin contar comentarios ni renglones vacíos. No se mide «calidad»
     —nadie sabe medirla— ni se declara un ganador. */
  function lineasDeCodigo(texto) {
    return String(texto || '').split('\n')
      .map(l => l.trim())
      .filter(l => l.length && !l.startsWith('//') && !l.startsWith('/*') && !l.startsWith('*'))
      .length;
  }

  function comparar(mio, dela) {
    const a = lineasDeCodigo(mio);
    const b = lineasDeCodigo(dela);
    let frase;
    if (!a || !b) frase = '';
    else if (a === b) frase = 'Las dos tienen ' + a + ' líneas de código.';
    else if (a > b) {
      frase = 'La tuya tiene ' + a + ' líneas y la de la cátedra ' + b
        + '. Más corto no es mejor, pero vale la pena mirar por qué.';
    } else {
      frase = 'La tuya tiene ' + a + ' líneas y la de la cátedra ' + b
        + '. La tuya es más corta: fijate igual si hacen lo mismo en todos los casos.';
    }
    return { lineasMias: a, lineasDeLaCatedra: b, frase, iguales: mio === dela };
  }

  /* Se pide una sola vez, y si ya está cargada no se vuelve a pedir. */
  function cargar(url) {
    if (global.ESLE2Soluciones) return Promise.resolve(global.ESLE2Soluciones);
    if (cargando) return cargando;
    cargando = new Promise((listo, falla) => {
      const s = document.createElement('script');
      s.src = url || URL_POR_OMISION;
      s.onload = () => (global.ESLE2Soluciones
        ? listo(global.ESLE2Soluciones)
        : falla(new Error('el archivo de soluciones no trajo nada')));
      s.onerror = () => falla(new Error('no se pudieron cargar las soluciones'));
      document.head.appendChild(s);
    });
    return cargando;
  }

  const hayPara = id => !!(global.ESLE2Soluciones && global.ESLE2Soluciones[id]);

  function iniciar(cfg) {
    cfg = cfg || {};
    let dlg = null;

    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-otra';
      dlg.innerHTML = `
        <h3 data-campo="titulo">Otra forma de resolverlo</h3>
        <p class="nota" data-campo="nota"></p>
        <div class="otra-lado">
          <section>
            <h4>La tuya</h4>
            <pre data-campo="mia"></pre>
          </section>
          <section>
            <h4>La de la cátedra</h4>
            <pre data-campo="suya"></pre>
          </section>
        </div>
        <p class="nota">Las dos pasan los mismos casos de prueba. No hay una
           correcta y una incorrecta: hay dos maneras, y mirar la otra es la
           parte del curso que no se puede corregir automáticamente.</p>
        <div class="dlg-fila derecha">
          <button class="btn" data-accion="copiar">Copiar la de la cátedra</button>
          <button class="btn primario" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        if (b.dataset.accion === 'cerrar') dlg.close();
        if (b.dataset.accion === 'copiar') {
          const texto = dlg.querySelector('[data-campo="suya"]').textContent;
          navigator.clipboard.writeText(texto).then(
            () => { b.textContent = 'copiada'; setTimeout(() => { b.textContent = 'Copiar la de la cátedra'; }, 1500); },
            () => { b.textContent = 'no se pudo copiar'; });
        }
      });
    }

    async function mostrar(ejercicio, codigoDelAlumno) {
      const soluciones = await cargar(cfg.solucionesUrl);
      const suya = soluciones[ejercicio.id];
      if (!suya) throw new Error('todavía no hay otra forma cargada para este ejercicio');
      if (!dlg) construir();
      const campo = c => dlg.querySelector(`[data-campo="${c}"]`);
      campo('titulo').textContent = 'Otra forma de resolver «' + ejercicio.titulo + '»';
      campo('mia').textContent = codigoDelAlumno || '(no escribiste nada)';
      campo('suya').textContent = suya;
      campo('nota').textContent = comparar(codigoDelAlumno, suya).frase;
      dlg.showModal();
      return true;
    }

    return { mostrar, cargar: () => cargar(cfg.solucionesUrl), hayPara };
  }

  global.OtraForma = { iniciar, comparar, lineasDeCodigo, cargar, hayPara };
})(typeof window !== 'undefined' ? window : globalThis);

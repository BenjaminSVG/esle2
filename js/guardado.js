/*
 * Guardar en el navegador sin perder el programa cuando no se puede.
 *
 * Por qué existe: localStorage tira error en dos situaciones que pasan de
 * verdad —una ventana privada, y una máquina de laboratorio con el trabajo de
 * un cuatrimestre adentro—, y el IDE lo usaba directo en el camino más
 * caliente que tiene: el «se guarda solo» de cada tecla. Ahí el error no se
 * quedaba quieto: salía del oyente de CodeMirror y cortaba el setValue(), así
 * que abrir un ejercicio del curso o un programa compartido dejaba de andar.
 * El alumno veía un editor vacío sin ninguna explicación.
 *
 * Entonces: escribir nunca tira. Devuelve si pudo, y la primera vez que no
 * puede avisa una sola vez —no en cada tecla— para que el alumno sepa que lo
 * que escriba ahora no va a estar cuando vuelva.
 *
 * API:  Guardado.crear({ almacen, avisar }) -> { leer, escribir, borrar, anduvo }
 *       Guardado.leer / escribir / borrar / alFallar   (sobre localStorage)
 */
(function (global) {
  'use strict';

  const AVISO = 'No se pudo guardar tu programa en este navegador: puede estar lleno, '
    + 'o ser una ventana privada. Lo que escribas ahora no va a estar cuando vuelvas — '
    + 'guardalo en un archivo con Archivo → Guardar.';

  function crear(op) {
    const o = op || {};
    const almacen = o.almacen || (typeof localStorage !== 'undefined' ? localStorage : null);
    let avisar = typeof o.avisar === 'function' ? o.avisar : null;
    let avisado = false;
    let anduvo = true;

    /* «avisado» se marca solo cuando el aviso llegó a alguien. Si todavía no
       hay dónde mostrarlo, queda pendiente para cuando lo haya: dar por
       avisado algo que nadie vio sería perder el único aviso que hay. */
    function fallo() {
      anduvo = false;
      if (avisado || !avisar) return false;
      avisado = true;
      try { avisar(AVISO); } catch (e) { /* ni eso */ }
      return false;
    }

    return {
      leer(clave) {
        if (!almacen) return null;
        try { return almacen.getItem(clave); } catch (e) { return null; }
      },
      escribir(clave, valor) {
        if (!almacen) return fallo();
        try { almacen.setItem(clave, String(valor)); anduvo = true; return true; }
        catch (e) { return fallo(); }
      },
      borrar(clave) {
        if (!almacen) return false;
        try { almacen.removeItem(clave); return true; } catch (e) { return false; }
      },
      /* Que se pueda enganchar el aviso después de crear el guardado: cuando
         arranca la página todavía no existe dónde mostrarlo. */
      alFallar(fn) {
        avisar = fn;
        /* Si ya falló antes de que hubiera dónde avisar, se avisa ahora: el
           problema no deja de existir porque nadie estuviera escuchando. */
        if (!anduvo && !avisado) { avisado = true; try { fn(AVISO); } catch (e) { /* ni eso */ } }
      },
      anduvo: () => anduvo,
      AVISO
    };
  }

  const porOmision = crear({});
  global.Guardado = {
    crear,
    leer: c => porOmision.leer(c),
    escribir: (c, v) => porOmision.escribir(c, v),
    borrar: c => porOmision.borrar(c),
    alFallar: fn => porOmision.alFallar(fn),
    anduvo: () => porOmision.anduvo(),
    AVISO
  };
})(typeof window !== 'undefined' ? window : globalThis);

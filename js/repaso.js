/*
 * Repaso espaciado.
 *
 * Resolver un ejercicio una vez no es aprenderlo: a los pocos días se olvida.
 * Este módulo mira lo que ya está guardado —qué resolviste, cuándo y cuántos
 * intentos te llevó— y propone qué conviene rehacer hoy, sin pedir nada nuevo
 * al usuario.
 *
 * La regla, en una línea: cuanto más te costó, antes vuelve; cuantas más veces
 * lo repasaste bien, más tarda en volver.
 *
 * sugerencias() es una función pura: la prueba test/test-repaso.js.
 */
(function (global) {
  'use strict';

  const DIA = 864e5;
  /* Cada repaso bien hecho estira la espera: 3 días, después 7, 16, 35… */
  const ESPERA = [3, 7, 16, 35, 70];

  const dias = (desde, hasta) => Math.floor((Date.parse(hasta) - Date.parse(desde)) / DIA);

  /* Cuántos días esperar antes de volver a proponer un ejercicio. */
  function espera(repasosHechos, intentos) {
    const base = ESPERA[Math.min(repasosHechos, ESPERA.length - 1)];
    // Si costó (varios intentos para resolverlo), vuelve antes.
    return intentos >= 4 ? Math.max(2, Math.round(base / 2)) : base;
  }

  /*
   * ejercicios : los del curso
   * progreso   : { id: 'YYYY-MM-DD' }  la fecha en que se resolvió
   * intentos   : { id: { intentos, aciertos } }
   * repasos    : { id: { hechos, ultimo: 'YYYY-MM-DD' } }
   * hoy        : 'YYYY-MM-DD'
   */
  function sugerencias({ ejercicios, progreso, intentos, repasos, hoy, cuantos }) {
    progreso = progreso || {};
    intentos = intentos || {};
    repasos = repasos || {};
    const limite = cuantos || 3;
    const lista = [];

    for (const e of ejercicios) {
      const resuelto = progreso[e.id];
      if (!resuelto) continue;                       // todavía no es repaso: es tarea pendiente
      const r = repasos[e.id] || { hechos: 0, ultimo: null };
      const desde = r.ultimo || (typeof resuelto === 'string' ? resuelto : null);
      if (!desde) continue;
      const pasados = dias(desde, hoy);
      const cuanto = espera(r.hechos, (intentos[e.id] || {}).intentos || 1);
      if (pasados < cuanto) continue;
      lista.push({
        id: e.id, titulo: e.titulo, nivel: e.nivel,
        dias: pasados, espera: cuanto, hechos: r.hechos,
        // Cuánto se pasó de su fecha: lo más atrasado va primero.
        atraso: pasados - cuanto,
        intentos: (intentos[e.id] || {}).intentos || 1
      });
    }

    lista.sort((a, b) => b.atraso - a.atraso || b.intentos - a.intentos || a.titulo.localeCompare(b.titulo));
    return lista.slice(0, limite);
  }

  /* Estado nuevo después de repasar un ejercicio: bien lo estira, mal lo reinicia. */
  function anotarRepaso(repasos, id, ok, hoy) {
    const d = Object.assign({}, repasos);
    const r = d[id] || { hechos: 0, ultimo: null };
    d[id] = { hechos: ok ? r.hechos + 1 : 0, ultimo: hoy };
    return d;
  }

  /* --------------------------- lado navegador --------------------------- */
  function crear(clave) {
    const leer = () => {
      try { return JSON.parse(localStorage.getItem(clave) || '{}'); } catch (e) { return {}; }
    };
    const guardar = d => {
      try { localStorage.setItem(clave, JSON.stringify(d)); } catch (e) { /* almacén lleno */ }
    };
    const hoy = () => new Date().toISOString().slice(0, 10);

    return {
      datos: leer,
      sugerencias(ejercicios, progreso, intentos, cuantos) {
        return sugerencias({ ejercicios, progreso, intentos, repasos: leer(), hoy: hoy(), cuantos });
      },
      registrar(id, ok) { guardar(anotarRepaso(leer(), id, ok, hoy())); },
      borrar() { try { localStorage.removeItem(clave); } catch (e) { /* nada que hacer */ } }
    };
  }

  global.Repaso = { crear, sugerencias, anotarRepaso, espera };
})(typeof window !== 'undefined' ? window : globalThis);

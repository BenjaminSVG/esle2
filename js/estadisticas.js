/*
 * Estadísticas del curso.
 *
 * Cada vez que alguien pulsa «Verificar solución» queda anotado si pasó o no.
 * Con eso se puede contestar la pregunta que importa cuando uno estudia solo:
 * en qué me estoy trabando. No se manda nada a ningún lado: vive en el
 * localStorage de ese navegador, igual que el resto del progreso.
 *
 * Las cuentas son funciones puras (las prueba test/test-estadisticas.js).
 */
(function (global) {
  'use strict';

  const NIVELES = ['facil', 'medio', 'avanzado'];

  function crear(clave) {
    const leer = () => {
      try { return JSON.parse(localStorage.getItem(clave) || '{}'); } catch (e) { return {}; }
    };
    const guardar = d => {
      try { localStorage.setItem(clave, JSON.stringify(d)); } catch (e) { /* almacén lleno */ }
    };

    return {
      datos: leer,
      /* Un intento más en ese ejercicio; `ok` dice si pasó todas las pruebas. */
      registrar(id, ok) {
        const d = leer();
        const e = d[id] || { intentos: 0, aciertos: 0 };
        e.intentos++;
        if (ok) e.aciertos++;
        d[id] = e;
        guardar(d);
        return e;
      },
      borrar() { try { localStorage.removeItem(clave); } catch (e) { /* nada que hacer */ } }
    };
  }

  /* Resumen legible a partir de los intentos y de la lista de ejercicios. */
  function resumen(datos, ejercicios, progreso) {
    datos = datos || {};
    progreso = progreso || {};
    const porNivel = {};
    for (const n of NIVELES) porNivel[n] = { total: 0, resueltos: 0 };

    let intentos = 0, aciertos = 0;
    const conCosto = [];
    for (const e of ejercicios) {
      const nivel = porNivel[e.nivel] || (porNivel[e.nivel] = { total: 0, resueltos: 0 });
      nivel.total++;
      if (progreso[e.id]) nivel.resueltos++;
      const d = datos[e.id];
      if (!d) continue;
      intentos += d.intentos;
      aciertos += d.aciertos;
      if (d.intentos > 1) conCosto.push({ id: e.id, titulo: e.titulo, intentos: d.intentos, resuelto: !!progreso[e.id] });
    }

    conCosto.sort((a, b) => b.intentos - a.intentos || a.titulo.localeCompare(b.titulo));
    const resueltos = Object.values(porNivel).reduce((s, n) => s + n.resueltos, 0);
    const total = ejercicios.length;

    return {
      total, resueltos, intentos, aciertos,
      /* Cuántas veces, en promedio, hubo que verificar para acertar. */
      intentosPorAcierto: aciertos ? Math.round((intentos / aciertos) * 10) / 10 : 0,
      porNivel,
      costosos: conCosto.slice(0, 5),
      /* El que quedó sin resolver después de más intentos: ahí conviene ayudar. */
      atascado: conCosto.find(c => !c.resuelto) || null
    };
  }

  global.Estadisticas = { crear, resumen };
})(typeof window !== 'undefined' ? window : globalThis);

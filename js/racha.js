/*
 * Racha: días seguidos resolviendo ejercicios.
 *
 * Nada de puntajes ni rankings: solo un contador de constancia, que es lo que
 * de verdad hace aprender a programar. Se guarda en una cookie propia y suma
 * como mucho una vez por día, resuelvas uno o veinte ejercicios.
 *
 * La cuenta vive en calcular(), que es una función pura: recibe el estado y la
 * fecha de hoy y devuelve el estado nuevo. Así se puede probar sin navegador.
 */
(function (global) {
  'use strict';

  const COOKIE = 'esle2_racha';
  const DIA = 864e5;

  const hoyISO = fecha => (fecha || new Date()).toISOString().slice(0, 10);
  const diasEntre = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DIA);

  const vacio = () => ({ ultimo: '', dias: 0, mejor: 0, total: 0 });

  /* Estado nuevo después de resolver un ejercicio el día `hoy`. */
  function calcular(estado, hoy) {
    const e = Object.assign(vacio(), estado || {});
    e.total += 1;
    if (e.ultimo === hoy) return e;                 // ya contó hoy: la racha no se mueve
    const saltados = e.ultimo ? diasEntre(e.ultimo, hoy) : null;
    e.dias = (saltados === 1) ? e.dias + 1 : 1;     // ayer sigue la racha; cualquier otro día, vuelve a empezar
    e.ultimo = hoy;
    e.mejor = Math.max(e.mejor, e.dias);
    return e;
  }

  /* La racha se corta sola si pasó más de un día sin resolver nada. */
  function vigente(estado, hoy) {
    const e = Object.assign(vacio(), estado || {});
    if (!e.ultimo) return e;
    const saltados = diasEntre(e.ultimo, hoy);
    return saltados <= 1 ? e : Object.assign(e, { dias: 0 });
  }

  /* ------------------------- guardado en cookie ------------------------ */
  const leerCookie = () => {
    const p = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='));
    try { return p ? JSON.parse(decodeURIComponent(p.slice(COOKIE.length + 1))) : vacio(); }
    catch (e) { return vacio(); }
  };
  const grabarCookie = v => {
    document.cookie = `${COOKIE}=${encodeURIComponent(JSON.stringify(v))}; ` +
      `expires=${new Date(Date.now() + 365 * DIA).toUTCString()}; path=/; SameSite=Lax`;
  };

  function pintar() {
    const caja = document.getElementById('racha');
    if (!caja) return;
    const e = vigente(leerCookie(), hoyISO());
    caja.classList.toggle('oculto', e.dias < 1);
    caja.textContent = `🔥 ${e.dias}`;
    caja.title = e.dias === 1
      ? 'Empezaste una racha: volvé mañana para seguirla.'
      : `${e.dias} días seguidos resolviendo (tu mejor racha: ${e.mejor}).`;
  }

  function registrar() {
    const nuevo = calcular(leerCookie(), hoyISO());
    grabarCookie(nuevo);
    pintar();
    return nuevo;
  }

  document.addEventListener('DOMContentLoaded', pintar);

  global.Racha = { calcular, vigente, registrar, pintar, estado: () => vigente(leerCookie(), hoyISO()) };
})(typeof window !== 'undefined' ? window : globalThis);

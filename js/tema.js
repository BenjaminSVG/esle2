/* Tema claro / oscuro, compartido por todas las páginas.
   Se guarda en la cookie "esle2_tema" para que dure entre visitas. */
(function () {
  'use strict';

  function leer(nombre) {
    const p = document.cookie.split('; ').find(c => c.startsWith(nombre + '='));
    return p ? decodeURIComponent(p.slice(nombre.length + 1)) : '';
  }
  function grabar(nombre, valor) {
    const f = new Date(Date.now() + 365 * 864e5).toUTCString();
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${f}; path=/; SameSite=Lax`;
  }

  const guardado = leer('esle2_tema');
  const inicial = guardado || (window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro');
  document.documentElement.setAttribute('data-tema', inicial);

  window.ESLE2Tema = {
    actual: () => document.documentElement.getAttribute('data-tema'),
    alternar() {
      const nuevo = this.actual() === 'oscuro' ? 'claro' : 'oscuro';
      document.documentElement.setAttribute('data-tema', nuevo);
      grabar('esle2_tema', nuevo);
      document.dispatchEvent(new CustomEvent('esle2:tema', { detail: nuevo }));
      this.pintarBoton();
      return nuevo;
    },
    pintarBoton() {
      const b = document.getElementById('btnTema');
      if (!b) return;
      const osc = this.actual() === 'oscuro';
      b.textContent = osc ? '☀' : '☾';
      b.title = osc ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
      b.setAttribute('aria-label', b.title);
    },
    iniciar() {
      const b = document.getElementById('btnTema');
      if (b) b.addEventListener('click', () => this.alternar());
      this.pintarBoton();
    }
  };

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', () => window.ESLE2Tema.iniciar());
  else window.ESLE2Tema.iniciar();
})();

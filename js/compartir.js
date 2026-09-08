/*
 * Compartir un programa por enlace.
 *
 * El programa entero viaja en el fragmento de la URL (después del #), así que
 * nunca sale del navegador: no se envía a ningún servidor ni queda guardado en
 * ninguna parte. El que abre el enlace recibe el código y los datos de entrada
 * cargados en el IDE.
 */
(function (global) {
  'use strict';

  /* base64 "url-safe": sin +, / ni = para que el enlace no se rompa al pegarlo. */
  const aBase64 = texto => {
    const bytes = new TextEncoder().encode(texto);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const deBase64 = s => {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  };

  function enlace(codigo, entrada) {
    const dato = aBase64(JSON.stringify({ c: codigo, e: entrada || '' }));
    return location.origin + location.pathname + '#p=' + dato;
  }

  /* Devuelve {codigo, entrada} si la URL trae un programa, o null. */
  function leer() {
    const m = /[#&]p=([A-Za-z0-9\-_]+)/.exec(location.hash);
    if (!m) return null;
    try {
      const d = JSON.parse(deBase64(m[1]));
      if (typeof d.c !== 'string') return null;
      return { codigo: d.c, entrada: typeof d.e === 'string' ? d.e : '' };
    } catch (e) { return null; }
  }

  /* Saca el programa de la barra de direcciones sin recargar ni dejar historial. */
  function limpiarUrl() {
    history.replaceState(null, '', location.pathname + location.search);
  }

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch (e) {
      // Sin permiso de portapapeles (o fuera de https): que lo copie a mano.
      prompt('Copiá el enlace:', texto);
      return false;
    }
  }

  global.Compartir = { enlace, leer, limpiarUrl, copiar };
})(window);

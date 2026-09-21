/*
 * Quién está usando esta máquina.
 *
 * Todo lo del alumno —el avance, lo que escribió en cada ejercicio, la racha,
 * sus ejercicios propios— vive en el navegador. En una máquina de casa está
 * perfecto. En el laboratorio de la facultad, tres alumnos usan el mismo
 * Chrome el mismo día: el segundo abre ESLE2 y ve la racha, los ejercicios y
 * el código del primero.
 *
 * No es solo confuso. Desde que se puede entregar una guía, es peor: si Ana
 * entrega desde la máquina donde antes trabajó Beto, se lleva el código de
 * Beto con su nombre encima.
 *
 * Es un cajón por persona: al cambiar de alumno se guarda lo del que estaba y
 * se saca lo del que viene. No son cuentas de un servidor, porque no hay
 * servidor.
 *
 * Arriba de eso, y apagado por omisión, está el «modo usuario»: con él
 * encendido cada alumno entra con nombre y contraseña, y al cerrar sesión la
 * máquina queda limpia. Lo que esa contraseña hace y lo que no —no cifra
 * nada— está explicado más abajo, donde está el código, y también en pantalla
 * antes de que nadie la elija.
 *
 * Lo que NO se cambia son las preferencias de la máquina: el tema, los
 * colores, la disposición de los paneles, el servidor de señas. Esas son del
 * aula, no de la persona, y hacer que cada alumno vuelva a acomodar los
 * paneles sería castigar al que comparte máquina.
 *
 * API (sin DOM: lo prueba test/test-perfil.js)
 *   Perfil.crear({ almacen, galletas }) -> {
 *     listar(), actual(), cambiar(nombre), crear(nombre), borrar(nombre),
 *     guardar(), hayDatos(), tamano(nombre),
 *     modo(), ponerModo(v), tieneClave(n), ponerClave(n, clave),
 *     sacarClave(n, clave), comprobar(n, clave), abrirSesion(n, clave),
 *     cerrarSesion()
 *   }
 *   Perfil.esDelAlumno(clave)   Perfil.limpiarNombre(texto)
 *   Perfil.sal()   Perfil.amasar(clave, sal, vueltas, subtle)
 */
(function (global) {
  'use strict';

  const REGISTRO = 'esle2_perfiles';          // { actual, nombres, modo, cerraduras }
  const PREFIJO_DATOS = 'esle2_perfil_';      // + nombre
  const LARGO_MAX = 40;
  const CLAVE_MIN = 8;

  /*
   * ----------------------------------------------------------------------
   * La cerradura: lo que es y lo que NO es
   * ----------------------------------------------------------------------
   * Con el «modo usuario» encendido, cada alumno entra con su nombre y su
   * contraseña, y al cerrar sesión sus cosas se guardan en su cajón y la
   * máquina queda limpia: el que viene después abre ESLE2 y no ve nada de
   * nadie. Eso es lo que arregla, y en un laboratorio es justamente el
   * problema de todos los días.
   *
   * Lo que NO hace, y está dicho en pantalla con todas las letras: no cifra
   * nada. Los cajones siguen guardados en el navegador, así que alguien que
   * sepa abrir las herramientas del navegador los puede leer igual. Para que
   * la contraseña protegiera de verdad habría que cifrar el cajón con una
   * llave sacada de ella, y entonces el trabajo del alumno no podría vivir
   * suelto en el almacenamiento mientras la sesión está abierta —treinta
   * módulos lo leen y lo escriben ahí— sino solo en memoria. Es otro trabajo
   * y no se hace de arriba de este.
   *
   * De la contraseña no se guarda la contraseña: se guarda el resultado de
   * pasarla por PBKDF2 con una sal propia. No es para proteger el cajón —ya
   * dijimos que no lo protege— sino porque los chicos repiten contraseñas: si
   * alguien mira el navegador, que no se lleve puesta la que además usan en
   * otro lado.
   */

  /* Las que se quedan en la máquina pase quien pase. Todo lo demás que
     empiece con «esle2» es del alumno: si mañana alguien agrega una clave y
     se olvida de esta lista, lo peor que pasa es que una preferencia se
     reinicie al cambiar de alumno. Al revés —que el código de uno quede en la
     sesión de otro— sería mucho peor. */
  const DE_LA_MAQUINA = new Set([
    'esle2_tema', 'esle2_diseno', 'esle2_senas', 'esle2_sonido',
    'esle2_presentacion', 'esle2_enfoque',
    'esle2_disposicion', 'esle2bd_disposicion', 'esle2poo_disposicion', 'esle2vis_disposicion',
    'esle2_ajustar', 'esle2bd_ajustar', 'esle2poo_ajustar', 'esle2vis_ajustar',
    'esle2_flexible', 'esle2bd_flexible', 'esle2poo_flexible', 'esle2vis_flexible',
    'esle2_explorador', 'esle2poo_explorador', 'esle2vis_explorador',
    /* El lector por voz ya no existe, pero estas cuatro claves siguen acá:
       quien las tiene guardadas de antes las tiene igual, y sacarlas de esta
       lista las volvería «trabajo del alumno» — el perfil diría que hay datos
       donde no hay ninguno, y se los copiaría de un perfil a otro. */
    'esle2_voz', 'esle2_voz_bd', 'esle2_voz_poo', 'esle2_voz_vis'
  ]);

  /* Las cookies del avance de los cuatro cursos. Se nombran acá y no se leen
     de ProgresoESLE2 para que esto se pueda probar sin cargar aquel archivo
     — con la contra de que hay que acordarse de agregar la del curso nuevo:
     la de BD faltó desde que existe el curso, así que el avance de un alumno
     en BD se lo encontraba el siguiente. */
  const COOKIES = ['esle2_progreso', 'esle2_progreso_poo', 'esle2_progreso_vis',
    'esle2_progreso_bd'];

  function esDelAlumno(clave) {
    if (typeof clave !== 'string' || !clave.startsWith('esle2')) return false;
    if (clave === REGISTRO || clave.startsWith(PREFIJO_DATOS)) return false;
    return !DE_LA_MAQUINA.has(clave);
  }

  /* El nombre es una etiqueta para que el alumno se reconozca, no un usuario:
     se guarda como lo escribió y se compara sin acentos ni mayúsculas, para
     que «Ana» y «ana» no terminen siendo dos cajones distintos. */
  function limpiarNombre(texto) {
    return String(texto || '').replace(/\s+/g, ' ').trim().slice(0, LARGO_MAX);
  }
  const comparable = t => limpiarNombre(t).normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ------------------------------------------------------------------ */
  /* Amasar la contraseña                                                */
  /* ------------------------------------------------------------------ */

  /* Cuántas vueltas. Es un número de compromiso: en la máquina de un
     laboratorio tiene que tardar menos de un segundo —si no, entrar a clase
     se vuelve un castigo— y al mismo tiempo tiene que hacer caro probar
     contraseñas una por una. */
  const VUELTAS = 210000;

  const enTexto = bytes => {
    let s = '';
    const b = new Uint8Array(bytes);
    for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    const crudo = typeof btoa === 'function' ? btoa(s) : Buffer.from(b).toString('base64');
    return crudo.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  function sal(n) {
    const c = global.crypto || (global.require && global.require('crypto').webcrypto);
    const b = new Uint8Array(n || 16);
    if (c && c.getRandomValues) c.getRandomValues(b);
    else for (let i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256);
    return enTexto(b);
  }

  const elSubtle = s => s || (global.crypto && global.crypto.subtle)
    || (global.require && global.require('crypto').webcrypto.subtle);

  async function amasar(clave, laSal, vueltas, subtle) {
    const st = elSubtle(subtle);
    const bytes = new TextEncoder().encode(String(clave));
    const semilla = await st.importKey('raw', bytes, 'PBKDF2', false, ['deriveBits']);
    const salado = new TextEncoder().encode('esle2-perfil/' + laSal);
    const crudo = await st.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salado, iterations: vueltas || VUELTAS },
      semilla, 256);
    return enTexto(crudo);
  }

  /* Comparar sin apurarse: si se corta en la primera letra distinta, el
     tiempo que tarda dice cuántas letras acertó quien está probando. */
  function iguales(a, b) {
    const x = String(a), y = String(b);
    if (x.length !== y.length) return false;
    let d = 0;
    for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return d === 0;
  }

  function crear(cfg) {
    const almacen = cfg.almacen;
    const galletas = cfg.galletas || { leer: () => '', grabar: () => {} };

    const leerRegistro = () => {
      try {
        const r = JSON.parse(almacen.leer(REGISTRO) || 'null');
        if (r && Array.isArray(r.nombres)) return r;
      } catch (e) { /* registro roto: se empieza de nuevo */ }
      return { actual: null, nombres: [] };
    };
    const grabarRegistro = r => almacen.escribir(REGISTRO, JSON.stringify(r));
    const ranura = nombre => PREFIJO_DATOS + comparable(nombre);

    /* ------------------------------ mover ---------------------------- */

    /* Todo lo del alumno que hay ahora en el navegador. */
    function tomar() {
      const claves = {};
      for (const k of almacen.claves()) {
        if (esDelAlumno(k)) claves[k] = almacen.leer(k);
      }
      const cookies = {};
      for (const c of COOKIES) cookies[c] = galletas.leer(c);
      return { claves, cookies, guardado: new Date().toISOString() };
    }

    /* Saca lo del alumno que estaba y pone lo del que viene. Primero borra:
       si no, lo que el anterior tenía y este no queda dando vueltas, que es
       justo el problema que esto viene a resolver. */
    function poner(datos) {
      for (const k of almacen.claves()) if (esDelAlumno(k)) almacen.borrar(k);
      for (const c of COOKIES) galletas.grabar(c, '');
      if (!datos) return;
      for (const k of Object.keys(datos.claves || {})) {
        if (esDelAlumno(k)) almacen.escribir(k, datos.claves[k]);
      }
      for (const c of COOKIES) {
        if (datos.cookies && datos.cookies[c]) galletas.grabar(c, datos.cookies[c]);
      }
    }

    const leerDatos = nombre => {
      try { return JSON.parse(almacen.leer(ranura(nombre)) || 'null'); }
      catch (e) { return null; }
    };

    /* ------------------------------ público -------------------------- */

    function guardar() {
      const r = leerRegistro();
      if (!r.actual) return false;
      almacen.escribir(ranura(r.actual), JSON.stringify(tomar()));
      return true;
    }

    function crearPerfil(nombre) {
      const limpio = limpiarNombre(nombre);
      if (!limpio) throw new Error('el perfil necesita un nombre');
      const r = leerRegistro();
      if (r.nombres.some(n => comparable(n) === comparable(limpio))) {
        throw new Error('ya hay un perfil que se llama así');
      }
      guardar();                       // lo del que estaba, a su cajón
      r.nombres.push(limpio);
      r.actual = limpio;
      grabarRegistro(r);
      /* El primero se queda con lo que ya había en la máquina: si no, el
         alumno que venía usando ESLE2 solo perdería todo al crear su perfil. */
      if (r.nombres.length > 1) poner(null);
      almacen.escribir(ranura(limpio), JSON.stringify(tomar()));
      return limpio;
    }

    function cambiar(nombre) {
      const r = leerRegistro();
      const destino = r.nombres.find(n => comparable(n) === comparable(nombre));
      if (!destino) throw new Error('no hay ningún perfil que se llame así');
      if (r.actual && comparable(r.actual) === comparable(destino)) return destino;
      guardar();
      poner(leerDatos(destino));
      r.actual = destino;
      grabarRegistro(r);
      return destino;
    }

    function borrar(nombre) {
      const r = leerRegistro();
      const cual = r.nombres.find(n => comparable(n) === comparable(nombre));
      if (!cual) throw new Error('no hay ningún perfil que se llame así');
      almacen.borrar(ranura(cual));
      r.nombres = r.nombres.filter(n => n !== cual);
      if (r.actual && comparable(r.actual) === comparable(cual)) {
        r.actual = null;
        poner(null);                   // y la máquina queda limpia
      }
      grabarRegistro(r);
      return r.nombres;
    }

    /* Si hay trabajo de alguien en el navegador sin ningún perfil abierto:
       es lo que hace falta saber para ofrecer «¿este trabajo es tuyo?». */
    function hayDatos() {
      return almacen.claves().some(k => esDelAlumno(k) && (almacen.leer(k) || '').length)
        || COOKIES.some(c => (galletas.leer(c) || '').length > 2);
    }

    /* Cuánto ocupa un perfil guardado, en caracteres. La cuota del navegador
       es de unos 5 MB para todo el sitio: con treinta alumnos en una máquina
       esto importa, y es mejor poder decirlo que fallar en silencio. */
    function tamano(nombre) {
      return (almacen.leer(ranura(nombre)) || '').length;
    }

    /* ---------------------------- cerradura --------------------------- */

    /* Las cerraduras van en una lista y no en un objeto con el nombre de
       clave: el nombre lo escribe el alumno, y un alumno que se llama
       «__proto__» no tiene por qué poder tocar el prototipo de nada. */
    const cerraduras = r => (Array.isArray(r.cerraduras) ? r.cerraduras : []);
    const cerraduraDe = (r, nombre) =>
      cerraduras(r).find(c => c && c.n === comparable(nombre)) || null;

    const modo = () => leerRegistro().modo === true;

    function ponerModo(encendido) {
      const r = leerRegistro();
      r.modo = !!encendido;
      grabarRegistro(r);
      return r.modo;
    }

    const tieneClave = nombre => !!cerraduraDe(leerRegistro(), nombre);

    async function ponerClave(nombre, clave, subtle) {
      const texto = String(clave == null ? '' : clave);
      if (texto.length < CLAVE_MIN) {
        throw new Error('la contraseña tiene que tener al menos ' + CLAVE_MIN + ' caracteres');
      }
      const r = leerRegistro();
      const cual = r.nombres.find(n => comparable(n) === comparable(nombre));
      if (!cual) throw new Error('no hay ningún perfil que se llame así');
      const laSal = sal(16);
      const h = await amasar(texto, laSal, VUELTAS, subtle);
      r.cerraduras = cerraduras(r).filter(c => c && c.n !== comparable(cual))
        .concat([{ n: comparable(cual), v: 1, it: VUELTAS, s: laSal, h }]);
      grabarRegistro(r);
      return true;
    }

    /* Devuelve si la contraseña es la de ese perfil. Un perfil sin cerradura
       contesta que NO, en vez de dejar entrar a cualquiera: con el modo
       encendido, «sin contraseña» es «todavía no terminó de configurarse», no
       «pasá sin golpear». */
    async function comprobar(nombre, clave, subtle) {
      const c = cerraduraDe(leerRegistro(), nombre);
      if (!c || c.v !== 1 || typeof c.s !== 'string' || typeof c.h !== 'string') return false;
      const vueltas = Number(c.it);
      if (!Number.isInteger(vueltas) || vueltas < 1000 || vueltas > 5000000) return false;
      let h;
      try { h = await amasar(String(clave == null ? '' : clave), c.s, vueltas, subtle); }
      catch (e) { return false; }
      return iguales(h, c.h);
    }

    async function abrirSesion(nombre, clave, subtle) {
      if (!(await comprobar(nombre, clave, subtle))) return false;
      cambiar(nombre);
      return true;
    }

    /* Cerrar sesión: lo del alumno se va a su cajón y la máquina queda
       limpia. Eso es lo que hace que el que viene después no vea nada. */
    function cerrarSesion() {
      const r = leerRegistro();
      if (!r.actual) return false;
      guardar();
      poner(null);
      r.actual = null;
      grabarRegistro(r);
      return true;
    }

    /* Sacar la cerradura pide la contraseña: si no, cualquiera la saca desde
       el mismo diálogo y la cerradura no cierra nada. */
    async function sacarClave(nombre, clave, subtle) {
      if (!(await comprobar(nombre, clave, subtle))) return false;
      const r = leerRegistro();
      r.cerraduras = cerraduras(r).filter(c => c && c.n !== comparable(nombre));
      grabarRegistro(r);
      return true;
    }

    return {
      listar: () => leerRegistro().nombres.slice(),
      actual: () => leerRegistro().actual,
      crear: crearPerfil,
      cambiar, borrar, guardar, hayDatos, tamano,
      modo, ponerModo, tieneClave, ponerClave, sacarClave, comprobar,
      abrirSesion, cerrarSesion
    };
  }

  global.Perfil = { crear, esDelAlumno, limpiarNombre, sal, amasar, iguales,
    DE_LA_MAQUINA, COOKIES, REGISTRO, CLAVE_MIN, VUELTAS };
})(typeof window !== 'undefined' ? window : globalThis);

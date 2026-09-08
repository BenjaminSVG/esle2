/*
 * Diseño: fondo de la interfaz y colores de la sintaxis, elegidos por el usuario.
 * Se guarda en la cookie "esle2_diseno", una configuración por cada modo
 * (claro y oscuro), y se aplica escribiendo variables CSS en <html>.
 */
(function (global) {
  'use strict';

  const COOKIE = 'esle2_diseno';

  /* ------------------------------ fondos ------------------------------ */
  const FONDOS = [
    {
      id: 'papel', nombre: 'Papel', tema: 'claro', muestra: '#f6f6f3',
      vars: { fondo: '#f6f6f3', 'fondo-2': '#eeeeea', panel: '#ffffff', 'panel-2': '#f3f3ef',
              linea: '#dedcd4', 'linea-2': '#ebe9e2', texto: '#2c3038', 'texto-2': '#5b6472', tenue: '#646c7a' }
    },
    {
      id: 'blanco', nombre: 'Blanco', tema: 'claro', muestra: '#ffffff',
      vars: { fondo: '#ffffff', 'fondo-2': '#f4f5f7', panel: '#ffffff', 'panel-2': '#f7f8fa',
              linea: '#e2e5ea', 'linea-2': '#eef0f3', texto: '#1f2328', 'texto-2': '#57606a', tenue: '#68717d' }
    },
    {
      id: 'sepia', nombre: 'Sepia', tema: 'claro', muestra: '#f4ecd8',
      vars: { fondo: '#f4ecd8', 'fondo-2': '#ece2c8', panel: '#fbf6e9', 'panel-2': '#f2e9d4',
              linea: '#ddd0ae', 'linea-2': '#e8dcc0', texto: '#3b3227', 'texto-2': '#6b5d49', tenue: '#6e634f' }
    },
    {
      id: 'niebla', nombre: 'Niebla', tema: 'claro', muestra: '#eef1f4',
      vars: { fondo: '#eef1f4', 'fondo-2': '#e4e8ee', panel: '#fbfcfd', 'panel-2': '#eef1f5',
              linea: '#d5dbe3', 'linea-2': '#e3e7ed', texto: '#22272e', 'texto-2': '#525c68', tenue: '#606874' }
    },
    {
      id: 'pizarra', nombre: 'Pizarra', tema: 'oscuro', muestra: '#1a1d22',
      vars: { fondo: '#1a1d22', 'fondo-2': '#21252b', panel: '#23272e', 'panel-2': '#282d35',
              linea: '#353b45', 'linea-2': '#2c313a', texto: '#d8dce3', 'texto-2': '#aab2be', tenue: '#8b94a1' }
    },
    {
      id: 'carbon', nombre: 'Carbón', tema: 'oscuro', muestra: '#101010',
      vars: { fondo: '#101010', 'fondo-2': '#181818', panel: '#1c1c1c', 'panel-2': '#222222',
              linea: '#333333', 'linea-2': '#282828', texto: '#e0e0e0', 'texto-2': '#b0b0b0', tenue: '#8a8a8a' }
    },
    {
      id: 'noche', nombre: 'Azul noche', tema: 'oscuro', muestra: '#121a2b',
      vars: { fondo: '#121a2b', 'fondo-2': '#182136', panel: '#1b2540', 'panel-2': '#212c4a',
              linea: '#2e3b5c', 'linea-2': '#26314d', texto: '#d6ddf0', 'texto-2': '#a8b3d0', tenue: '#8b98ba' }
    },
    {
      id: 'contraste', nombre: 'Alto contraste', tema: 'oscuro', muestra: '#000000',
      vars: { fondo: '#000000', 'fondo-2': '#0a0a0a', panel: '#000000', 'panel-2': '#111111',
              linea: '#5a5a5a', 'linea-2': '#3a3a3a', texto: '#ffffff', 'texto-2': '#e0e0e0', tenue: '#b8b8b8' }
    },
    {
      /* Morado casi negro con bordes de neón: la estética "gamer" que se pidió.
         El acento (los botones) sigue siendo el azul de siempre —FONDOS no lo
         toca, ver aplicar()— así que combina con cualquier paleta de sintaxis;
         para el paquete completo, elegí también la sintaxis "Cyberpunk". */
      id: 'cyberpunk', nombre: 'Cyberpunk', tema: 'oscuro', muestra: '#0b0014',
      vars: { fondo: '#0b0014', 'fondo-2': '#150024', panel: '#12001d', 'panel-2': '#1c0030',
              linea: '#ff2bd6', 'linea-2': '#5a1a66', texto: '#eafcff', 'texto-2': '#8be9ff', tenue: '#c07dff' }
    }
  ];

  /* ---------------------------- sintaxis ------------------------------ */
  const SINTAXIS = [
    /* Las dos primeras evitan los pares rojo/verde, que es lo que no se
       distingue con daltonismo (que es lo más común), y separan las categorías
       por tono —azul, naranja, violeta, celeste— y no por matices del mismo
       color. Todas llegan a 4.5:1 sobre su fondo. */
    {
      id: 'daltonico-claro', nombre: 'Daltónico (claro)', tema: 'claro', fondo: '#ffffff',
      colores: {
        comentario: '#5b6472', cadena: '#8a5f1f', numero: '#0f6e8c',
        control: '#7b3fa0', declaracion: '#0b4f9e', tipo: '#0b4f9e',
        clase: '#0f6e8c', funcion: '#8a5f1f', predefinida: '#8a5f1f',
        variable: '#1f2328', propiedad: '#1f2328', parametro: '#1f2328',
        constante: '#0b4f9e', lenguaje: '#7b3fa0', operador: '#3b3b3b', puntuacion: '#3b3b3b'
      }
    },
    {
      id: 'daltonico-oscuro', nombre: 'Daltónico (oscuro)', tema: 'oscuro', fondo: '#12161c',
      colores: {
        comentario: '#9aa3b1', cadena: '#f0a860', numero: '#7fd3ee',
        control: '#c9a5f0', declaracion: '#8fc4ff', tipo: '#8fc4ff',
        clase: '#7fd3ee', funcion: '#f0c06a', predefinida: '#f0c06a',
        variable: '#e8ecf3', propiedad: '#e8ecf3', parametro: '#e8ecf3',
        constante: '#8fc4ff', lenguaje: '#c9a5f0', operador: '#cfd6e0', puntuacion: '#cfd6e0'
      }
    },
    {
      id: 'vscode-claro', nombre: 'VS Code Light+', tema: 'claro',
      colores: {
        comentario: '#008000', cadena: '#a31515', numero: '#098658',
        control: '#af00db', declaracion: '#0000ff', tipo: '#0000ff',
        clase: '#267f99', funcion: '#795e26', predefinida: '#795e26',
        variable: '#001080', propiedad: '#001080', parametro: '#001080',
        constante: '#0070c1', lenguaje: '#0000ff', operador: '#000000', puntuacion: '#3b3b3b'
      }
    },
    {
      id: 'vscode-oscuro', nombre: 'VS Code Dark+', tema: 'oscuro', fondo: '#1e1e1e',
      colores: {
        comentario: '#6a9955', cadena: '#ce9178', numero: '#b5cea8',
        control: '#c586c0', declaracion: '#569cd6', tipo: '#569cd6',
        clase: '#4ec9b0', funcion: '#dcdcaa', predefinida: '#dcdcaa',
        variable: '#9cdcfe', propiedad: '#9cdcfe', parametro: '#9cdcfe',
        constante: '#4fc1ff', lenguaje: '#569cd6', operador: '#d4d4d4', puntuacion: '#d4d4d4'
      }
    },
    {
      id: 'monokai', nombre: 'Monokai', tema: 'oscuro', fondo: '#272822',
      colores: {
        comentario: '#88846f', cadena: '#e6db74', numero: '#ae81ff',
        control: '#f92672', declaracion: '#f92672', tipo: '#66d9ef',
        clase: '#a6e22e', funcion: '#a6e22e', predefinida: '#66d9ef',
        variable: '#f8f8f2', propiedad: '#fd971f', parametro: '#fd971f',
        constante: '#ae81ff', lenguaje: '#66d9ef', operador: '#f92672', puntuacion: '#f8f8f2'
      }
    },
    {
      id: 'solarized-claro', nombre: 'Solarized Light', tema: 'claro', fondo: '#fdf6e3',
      colores: {
        comentario: '#93a1a1', cadena: '#2aa198', numero: '#d33682',
        control: '#859900', declaracion: '#859900', tipo: '#b58900',
        clase: '#b58900', funcion: '#268bd2', predefinida: '#268bd2',
        variable: '#586e75', propiedad: '#657b83', parametro: '#657b83',
        constante: '#cb4b16', lenguaje: '#859900', operador: '#859900', puntuacion: '#93a1a1'
      }
    },
    {
      id: 'solarized-oscuro', nombre: 'Solarized Dark', tema: 'oscuro', fondo: '#002b36',
      colores: {
        comentario: '#586e75', cadena: '#2aa198', numero: '#d33682',
        control: '#859900', declaracion: '#859900', tipo: '#b58900',
        clase: '#b58900', funcion: '#268bd2', predefinida: '#268bd2',
        variable: '#93a1a1', propiedad: '#eee8d5', parametro: '#eee8d5',
        constante: '#cb4b16', lenguaje: '#859900', operador: '#859900', puntuacion: '#586e75'
      }
    },
    {
      id: 'esle2', nombre: 'ESLE2 clásico', tema: 'claro',
      colores: {
        comentario: '#61789b', cadena: '#4a7a48', numero: '#97602c',
        control: '#8a4a72', declaracion: '#8a4a72', tipo: '#2f6b7e',
        clase: '#2f6b7e', funcion: '#3a6b8f', predefinida: '#3a6b8f',
        variable: '#2c3038', propiedad: '#3a6b8f', parametro: '#5b6472',
        constante: '#97602c', lenguaje: '#8a4a72', operador: '#5b6472', puntuacion: '#5b6472'
      }
    },
    {
      id: 'turbo', nombre: 'Turbo (el SLE original)', tema: 'oscuro', fondo: '#0000aa',
      colores: {
        comentario: '#7f7fff', cadena: '#00ffff', numero: '#00ffff',
        control: '#ffffff', declaracion: '#ffffff', tipo: '#ffffff',
        clase: '#55ff55', funcion: '#ffff55', predefinida: '#ffff55',
        variable: '#ffff55', propiedad: '#55ffff', parametro: '#55ffff',
        constante: '#ff55ff', lenguaje: '#ffffff', operador: '#ffffff', puntuacion: '#c0c0c0'
      }
    },
    {
      id: 'contraste', nombre: 'Alto contraste', tema: 'oscuro', fondo: '#000000',
      colores: {
        comentario: '#7ca668', cadena: '#ce9178', numero: '#b5cea8',
        control: '#ff79ff', declaracion: '#5fc7ff', tipo: '#5fc7ff',
        clase: '#4ee6c0', funcion: '#ffff8a', predefinida: '#ffff8a',
        variable: '#ffffff', propiedad: '#a6e0ff', parametro: '#a6e0ff',
        constante: '#79d0ff', lenguaje: '#5fc7ff', operador: '#ffffff', puntuacion: '#dddddd'
      }
    },
    {
      id: 'cyberpunk', nombre: 'Cyberpunk', tema: 'oscuro', fondo: '#0d0221',
      colores: {
        comentario: '#7a6a9a', cadena: '#39ffea', numero: '#fcee0c',
        control: '#ff2bd6', declaracion: '#00e5ff', tipo: '#00e5ff',
        clase: '#39ffea', funcion: '#ff8b3d', predefinida: '#ff8b3d',
        variable: '#f5f0ff', propiedad: '#c9a6ff', parametro: '#c9a6ff',
        constante: '#ff8b3d', lenguaje: '#ff2bd6', operador: '#f5f0ff', puntuacion: '#9d8cc4'
      }
    }
  ];

  const POR_DEFECTO = {
    claro: { fondo: 'papel', sintaxis: 'vscode-claro', colores: {}, fondoEditor: null },
    oscuro: { fondo: 'pizarra', sintaxis: 'vscode-oscuro', colores: {}, fondoEditor: null }
  };

  /* --------------------------- persistencia --------------------------- */
  function leerCookie(nombre) {
    const p = document.cookie.split('; ').find(c => c.startsWith(nombre + '='));
    return p ? decodeURIComponent(p.slice(nombre.length + 1)) : '';
  }
  function grabarCookie(nombre, valor) {
    const f = new Date(Date.now() + 365 * 864e5).toUTCString();
    document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${f}; path=/; SameSite=Lax`;
  }

  function leer() {
    let cfg;
    try { cfg = JSON.parse(leerCookie(COOKIE) || '{}'); } catch (e) { cfg = {}; }
    return {
      claro: Object.assign({}, POR_DEFECTO.claro, cfg.claro || {}),
      oscuro: Object.assign({}, POR_DEFECTO.oscuro, cfg.oscuro || {})
    };
  }
  function guardar(cfg) { grabarCookie(COOKIE, JSON.stringify(cfg)); aplicar(); }

  const buscar = (lista, id) => lista.find(x => x.id === id) || lista[0];
  const modoActual = () => (document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro');

  /* ----------------------------- aplicar ------------------------------ */
  function aplicar() {
    const cfg = leer();
    const modo = modoActual();
    const c = cfg[modo];
    const raiz = document.documentElement;

    const fondo = buscar(FONDOS.filter(f => f.tema === modo), c.fondo);
    for (const k in fondo.vars) raiz.style.setProperty('--' + k, fondo.vars[k]);

    const sint = buscar(SINTAXIS, c.sintaxis);
    const colores = Object.assign({}, sint.colores, c.colores || {});
    for (const k in colores) raiz.style.setProperty('--cod-' + k, colores[k]);

    // Fondo propio del editor: el que traiga la paleta, salvo que el usuario elija otro.
    const fe = c.fondoEditor || sint.fondo || '';
    if (fe) {
      raiz.style.setProperty('--cod-fondo', fe);
      raiz.style.setProperty('--cod-borde', mezclar(fe, colores.variable || '#888888', 0.22));
      // Los números de línea necesitan bastante más contraste que el borde.
      raiz.style.setProperty('--cod-num-linea', mezclar(fe, colores.variable || '#888888', 0.66));
    } else {
      raiz.style.removeProperty('--cod-fondo');
      raiz.style.removeProperty('--cod-borde');
      raiz.style.removeProperty('--cod-num-linea');
    }
    raiz.style.setProperty('--cod-texto', colores.variable || 'var(--texto)');
  }

  /* Mezcla dos colores hexadecimales, para derivar bordes y números de línea. */
  function mezclar(a, b, p) {
    const h = s => {
      s = s.replace('#', '');
      if (s.length === 3) s = s.split('').map(x => x + x).join('');
      return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    };
    try {
      const A = h(a), B = h(b);
      return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join('');
    } catch (e) { return a; }
  }

  global.ESLE2Diseno = {
    FONDOS, SINTAXIS, POR_DEFECTO, COOKIE,
    leer, guardar, aplicar, modoActual, buscar, mezclar,
    restaurar() { grabarCookie(COOKIE, '{}'); aplicar(); }
  };

  aplicar();
  document.addEventListener('esle2:tema', aplicar);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aplicar);
})(window);

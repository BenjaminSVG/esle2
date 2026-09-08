/* Página Diseño: elegir fondo y colores de la sintaxis, con vista previa en vivo. */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const D = window.ESLE2Diseno;
  const CATEGORIAS = window.ESLE2Modo.CATEGORIAS;

  const EJEMPLOS = {
    clasico: `/*
   Promedio de notas: muestra casi todas las categorías.
*/
programa boletin
const
   MAX_NOTAS = 3
tipos
   ALUMNO : registro
   {
      nombre : cadena
      notas  : vector [MAX_NOTAS] numerico
   }
var
   curso : vector [*] ALUMNO
   k = 0
   prom = 0
inicio
   dim (curso, 2)
   curso [1].nombre = "Mirta"
   curso [1].notas = {98, 95, 100}
   desde k=1 hasta alen (curso)
   {
      prom = promedio (curso [k].notas)
      si ( prom >= 60 and prom <> 0 )
      {
         imprimir (curso [k].nombre, ": ", str (prom, 0, 2), "\\n")
      sino
         imprimir ("aplazado\\n")
      }
   }
fin

sub promedio (v : vector [*] numerico) retorna numerico
var
   i = 0
   s = 0
inicio
   desde i=1 hasta alen (v)
   {
      s = s + v [i]
   }
   retorna ( s / alen (v) )
fin`,

    poo: `/*
   Figuras: clases, herencia y polimorfismo.
*/
const
   PI = 3.141592654

clase abstracta FIGURA
{
   atributos
      protegido
         nombre = ""

   constructor (n : cadena)
   inicio
      este.nombre = n
   fin

   metodo abstracto area () retorna numerico

   metodo texto () retorna cadena
   inicio
      retorna ( este.nombre + " → " + str (este.area(), 0, 2) )
   fin
}

clase CIRCULO hereda de FIGURA
{
   atributos privado
      radio = 0

   constructor (r : numerico)
   inicio
      padre.constructor ("circulo")
      este.radio = r
   fin

   metodo area () retorna numerico
   inicio
      retorna ( PI * este.radio ^ 2 )
   fin
}

var
   f : FIGURA
inicio
   f = nuevo CIRCULO (2)
   si ( f es CIRCULO and not es_nulo (f) )
   {
      imprimir (f, "  clase=", clase_de (f))
   }
fin`
  };

  /* ----------------------------- editor previo ----------------------------- */
  const previo = CodeMirror.fromTextArea($('#previo'), {
    mode: 'sle2', theme: 'esle2', lineNumbers: true, indentUnit: 3, tabSize: 3, readOnly: true
  });
  previo.setValue(EJEMPLOS.clasico);

  /* La vista previa es de solo lectura: sin esto, su zona con scroll no se
     puede recorrer con el teclado ni la anuncia un lector de pantalla. */
  previo.getInputField().setAttribute('aria-label', 'Vista previa del resaltado');
  const zonaPrevia = previo.getScrollerElement();
  zonaPrevia.setAttribute('tabindex', '0');
  zonaPrevia.setAttribute('role', 'region');
  zonaPrevia.setAttribute('aria-label', 'Vista previa del resaltado');

  $('#selEjemploPrevio').addEventListener('change', ev => {
    const poo = ev.target.value === 'poo';
    previo.setOption('mode', poo ? 'sle2poo' : 'sle2');
    previo.setValue(poo ? EJEMPLOS.poo : EJEMPLOS.clasico);
  });

  /* ------------------------------- estado --------------------------------- */
  const modo = () => D.modoActual();
  const cfg = () => D.leer();
  function actualizar(cambio) {
    const c = cfg();
    Object.assign(c[modo()], cambio);
    D.guardar(c);
    pintar();
  }

  /* ------------------------------- pintado -------------------------------- */
  function pintarFondos() {
    const cont = $('#listaFondos');
    const actual = cfg()[modo()].fondo;
    cont.innerHTML = '';
    D.FONDOS.filter(f => f.tema === modo()).forEach(f => {
      const b = document.createElement('button');
      b.className = 'muestra' + (f.id === actual ? ' elegida' : '');
      b.type = 'button';
      b.innerHTML = `<span class="mini-fondo" style="background:${f.muestra};border-color:${f.vars.linea}">
                       <i style="background:${f.vars.panel}"></i>
                       <i style="background:${f.vars['texto-2']}"></i>
                     </span><span class="muestra-nombre"></span>`;
      b.querySelector('.muestra-nombre').textContent = f.nombre;
      b.addEventListener('click', () => actualizar({ fondo: f.id }));
      cont.appendChild(b);
    });
  }

  function pintarPaletas() {
    const cont = $('#listaSintaxis');
    const c = cfg()[modo()];
    cont.innerHTML = '';
    D.SINTAXIS.forEach(p => {
      const b = document.createElement('button');
      b.className = 'muestra' + (p.id === c.sintaxis ? ' elegida' : '');
      b.type = 'button';
      const fondo = p.fondo || (p.tema === 'oscuro' ? '#23272e' : '#ffffff');
      const tiras = ['control', 'cadena', 'funcion', 'clase', 'numero', 'comentario']
        .map(k => `<i style="background:${p.colores[k]}"></i>`).join('');
      b.innerHTML = `<span class="mini-paleta" style="background:${fondo}">${tiras}</span>
                     <span class="muestra-nombre"></span>`;
      b.querySelector('.muestra-nombre').textContent = p.nombre;
      b.addEventListener('click', () => actualizar({ sintaxis: p.id, colores: {} }));
      cont.appendChild(b);
    });
  }

  function coloresVigentes() {
    const c = cfg()[modo()];
    const base = D.buscar(D.SINTAXIS, c.sintaxis).colores;
    return Object.assign({}, base, c.colores || {});
  }

  /* El fondo sobre el que se va a ver de verdad ese color: el del editor, no
     el de esta pagina. */
  function fondoDelEditor() {
    const c = cfg()[modo()];
    const pal = D.buscar(D.SINTAXIS, c.sintaxis);
    const fondoBase = D.buscar(D.FONDOS.filter(f => f.tema === modo()), c.fondo).vars.panel;
    return c.fondoEditor || pal.fondo || fondoBase;
  }

  function pintarCategorias() {
    const cont = $('#listaCategorias');
    const col = coloresVigentes();
    const fondo = fondoDelEditor();
    cont.innerHTML = '';
    CATEGORIAS.forEach(cat => {
      const fila = document.createElement('label');
      fila.className = 'categoria';
      fila.innerHTML = `<input type="color" value="${col[cat.id]}" aria-label="Color de ${cat.nombre}">
                        <span class="cat-nombre"></span>
                        <code class="cat-ejemplo" style="color:${col[cat.id]};background:${fondo}"></code>`;
      fila.querySelector('.cat-nombre').textContent = cat.nombre;
      fila.querySelector('.cat-ejemplo').textContent = cat.ejemplo;
      fila.querySelector('input').addEventListener('input', ev => {
        const c = cfg();
        c[modo()].colores = Object.assign({}, c[modo()].colores, { [cat.id]: ev.target.value });
        D.guardar(c);
        fila.querySelector('.cat-ejemplo').style.color = ev.target.value;
        previo.refresh();
      });
      cont.appendChild(fila);
    });
  }

  function pintarEditor() {
    const c = cfg()[modo()];
    const pal = D.buscar(D.SINTAXIS, c.sintaxis);
    $('#colorEditor').value = fondoDelEditor();
    $('#btnEditorAuto').disabled = !c.fondoEditor && !pal.fondo;
  }

  function pintar() {
    $('#modoActual').textContent = modo() === 'oscuro' ? 'oscuro' : 'claro';
    pintarFondos();
    pintarPaletas();
    pintarCategorias();
    pintarEditor();
    previo.refresh();
  }

  $('#colorEditor').addEventListener('input', ev => actualizar({ fondoEditor: ev.target.value }));
  $('#btnEditorAuto').addEventListener('click', () => actualizar({ fondoEditor: null }));
  $('#btnRestaurar').addEventListener('click', () => {
    if (!confirm('¿Volver al diseño por defecto, en los dos modos?')) return;
    D.restaurar();
    pintar();
  });

  // Al cambiar de claro a oscuro se edita la otra configuración.
  document.addEventListener('esle2:tema', () => setTimeout(pintar, 0));

  pintar();
})();

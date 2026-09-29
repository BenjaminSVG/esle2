/*
 * Mis ejercicios: crear ejercicios propios y compartirlos.
 *
 * Pensado para dar clase: un profesor arma sus consignas con sus casos de
 * prueba, exporta un archivo .json y sus alumnos lo importan. Los ejercicios
 * propios se corrigen solos, igual que los del curso, porque son objetos con
 * la misma forma ({ id, nivel, titulo, enunciado, pista, plantilla, pruebas }).
 *
 * Se guardan en localStorage, así que viven en ese navegador hasta exportarlos.
 */
(function (global) {
  'use strict';

  const NIVELES = { facil: 'Fácil', medio: 'Medio', avanzado: 'Avanzado' };

  function crear(cfg) {
    const { clave, lenguaje, alCambiar } = cfg;   // lenguaje: 'SLE2' o 'ESLE2 POO'
    let editando = null;                          // id que se está editando, o null
    let dlg = null;

    /* ------------------------------ datos ------------------------------ */
    /* Todo lo que sale de acá pasó por js/seguro.js: estos ejercicios se
       importan de un .json que repartió otro —ese es justamente el punto de
       «Mis ejercicios»—, y su enunciado se pinta en la misma pantalla que los
       del curso. El id se rearma si no sirve: sin id no se puede ni borrar. */
    function limpiar(e, i) {
      const s = global.Seguro ? global.Seguro.ejercicio(e) : e;
      if (!s.id) s.id = 'mio' + (i + 1);
      return s;
    }

    function cargar() {
      try {
        const v = JSON.parse(localStorage.getItem(clave) || '[]');
        if (!Array.isArray(v)) return [];
        const tope = global.Seguro ? global.Seguro.LIMITES.ejercicios : 100;
        return v.slice(0, tope).filter(valido).map(limpiar);
      } catch (e) { return []; }
    }
    /* Guardado.escribir() avisa —una sola vez— si el almacén está lleno,
       en vez de perder el ejercicio en silencio. */
    const guardar = lista => {
      if (global.Guardado) { global.Guardado.escribir(clave, JSON.stringify(lista)); return; }
      try { localStorage.setItem(clave, JSON.stringify(lista)); } catch (e) { /* almacén lleno */ }
    };

    function valido(e) {
      return e && typeof e.id === 'string' && typeof e.titulo === 'string'
        && Array.isArray(e.pruebas) && e.pruebas.length > 0;
    }

    const nuevoId = lista => {
      let n = 1;
      while (lista.some(e => e.id === 'mio' + n)) n++;
      return 'mio' + n;
    };

    /* ----------------------------- interfaz ---------------------------- */
    function construir() {
      dlg = document.createElement('dialog');
      dlg.className = 'dlg dlg-mis';
      dlg.innerHTML = `
        <h3>Mis ejercicios</h3>
        <p class="nota">Ejercicios tuyos, con sus casos de prueba: se corrigen solos igual que los
           del curso. Se guardan en este navegador; para pasarlos a otra máquina (o a tus alumnos)
           usá <strong>Exportar</strong>.</p>

        <div class="dlg-fila">
          <button class="btn primario" data-accion="nuevo">+ Nuevo ejercicio</button>
          <button class="btn" data-accion="exportar">Exportar…</button>
          <button class="btn" data-accion="importar">Importar…</button>
          <input type="file" accept=".json,application/json" hidden data-campo="archivo">
        </div>

        <ul class="mis-lista" data-campo="lista"></ul>

        <form class="mis-form oculto" data-campo="form">
          <div class="mis-grilla">
            <label>Título
              <input type="text" data-campo="titulo" required maxlength="70" placeholder="Suma de dos números">
            </label>
            <label>Nivel
              <select data-campo="nivel">
                <option value="facil">Fácil</option>
                <option value="medio">Medio</option>
                <option value="avanzado">Avanzado</option>
              </select>
            </label>
          </div>
          <label>Enunciado
            <textarea data-campo="enunciado" rows="3" required
              placeholder="Qué tiene que hacer el programa. Se puede usar HTML simple: &lt;code&gt;, &lt;strong&gt;, &lt;br&gt;."></textarea>
          </label>
          <label>Pista
            <textarea data-campo="pista" rows="2" placeholder="Una ayuda para el que se traba."></textarea>
          </label>
          <label>Plantilla (el código con el que arranca el alumno)
            <textarea data-campo="plantilla" rows="4" spellcheck="false" placeholder="var\n   a, b : numerico\ninicio\n   leer (a, b)\nfin"></textarea>
          </label>
          <label>Casos de prueba
            <span class="nota">Uno por bloque: primero la entrada, después la salida esperada.
              Separá los casos con una línea que diga <code>---</code>, y la entrada de la salida con
              <code>=&gt;</code> en su propia línea.</span>
            <textarea data-campo="casos" rows="6" spellcheck="false" required
              placeholder="3,5&#10;=&gt;&#10;8&#10;---&#10;10,-4&#10;=&gt;&#10;6"></textarea>
          </label>
          <p class="mis-error" data-campo="error"></p>
          <div class="dlg-fila derecha">
            <button type="button" class="btn" data-accion="cancelar">Cancelar</button>
            <button type="submit" class="btn primario">Guardar ejercicio</button>
          </div>
        </form>

        <div class="dlg-fila derecha">
          <button class="btn" data-accion="cerrar">Cerrar</button>
        </div>`;
      document.body.appendChild(dlg);

      const $$ = c => dlg.querySelector(`[data-campo="${c}"]`);

      dlg.addEventListener('click', ev => {
        const b = ev.target.closest('[data-accion]');
        if (!b) return;
        const a = b.dataset.accion;
        if (a === 'cerrar') dlg.close();
        else if (a === 'nuevo') abrirForm(null);
        else if (a === 'cancelar') { $$('form').classList.add('oculto'); editando = null; }
        else if (a === 'exportar') exportar();
        else if (a === 'importar') $$('archivo').click();
        else if (a === 'editar') abrirForm(b.dataset.id);
        else if (a === 'borrar') borrar(b.dataset.id);
      });

      $$('archivo').addEventListener('change', ev => {
        const f = ev.target.files[0];
        ev.target.value = '';
        if (!f) return;
        if (!Seguro.cabe(f)) { alert(Seguro.AVISO_GRANDE); return; }
        const lector = new FileReader();
        lector.onload = () => importar(String(lector.result));
        lector.readAsText(f, 'utf-8');
      });

      $$('form').addEventListener('submit', ev => {
        ev.preventDefault();
        guardarForm();
      });

      /* --------- lista --------- */
      function pintar() {
        const lista = cargar();
        const ul = $$('lista');
        ul.innerHTML = '';
        if (!lista.length) {
          ul.innerHTML = '<li class="vacia">Todavía no creaste ninguno.</li>';
          return;
        }
        for (const e of lista) {
          const li = document.createElement('li');
          const t = document.createElement('span');
          t.className = 'mis-tit';
          t.textContent = e.titulo;
          const n = document.createElement('span');
          const nivel = global.Seguro ? global.Seguro.deLista(e.nivel, global.Seguro.NIVELES, 'facil') : 'facil';
          n.className = 'etq ' + nivel;
          n.textContent = NIVELES[nivel] || nivel;
          const c = document.createElement('span');
          c.className = 'nota';
          c.textContent = `${e.pruebas.length} caso(s)`;
          const acciones = document.createElement('span');
          acciones.className = 'mis-acciones';
          /* El id va por dataset y no pegado adentro del atributo: así no hay
             forma de cerrar la comilla desde un ejercicio importado. */
          acciones.innerHTML = '<button class="btn mini-btn" data-accion="editar">Editar</button>'
            + '<button class="btn mini-btn" data-accion="borrar">Borrar</button>';
          acciones.querySelectorAll('button').forEach(b => { b.dataset.id = e.id; });
          li.append(t, n, c, acciones);
          ul.appendChild(li);
        }
      }

      /* --------- formulario --------- */
      function abrirForm(id) {
        const e = id ? cargar().find(x => x.id === id) : null;
        editando = id;
        $$('titulo').value = e ? e.titulo : '';
        $$('nivel').value = e ? e.nivel : 'facil';
        $$('enunciado').value = e ? e.enunciado : '';
        $$('pista').value = e ? e.pista : '';
        $$('plantilla').value = e ? e.plantilla : 'var\ninicio\n   \nfin\n';
        $$('casos').value = e ? aTexto(e.pruebas) : '';
        $$('error').textContent = '';
        $$('form').classList.remove('oculto');
        $$('titulo').focus();
      }

      function guardarForm() {
        let pruebas;
        try { pruebas = deTexto($$('casos').value); }
        catch (err) { $$('error').textContent = err.message; return; }

        const lista = cargar();
        const datos = {
          id: editando || nuevoId(lista),
          mio: true,
          nivel: $$('nivel').value,
          titulo: $$('titulo').value.trim(),
          enunciado: $$('enunciado').value.trim(),
          pista: $$('pista').value.trim() || 'Sin pista para este ejercicio.',
          plantilla: $$('plantilla').value || '',
          pruebas
        };
        const i = lista.findIndex(x => x.id === datos.id);
        if (i >= 0) lista[i] = datos; else lista.push(datos);
        guardar(lista);
        editando = null;
        $$('form').classList.add('oculto');
        pintar();
        if (alCambiar) alCambiar();
      }

      function borrar(id) {
        const e = cargar().find(x => x.id === id);
        if (!e || !confirm(`¿Borrar «${e.titulo}»?`)) return;
        guardar(cargar().filter(x => x.id !== id));
        try { localStorage.removeItem('esle2_ej_' + id); } catch (e) { /* nada que hacer */ }
        pintar();
        if (alCambiar) alCambiar();
      }

      /* --------- compartir --------- */
      function exportar() {
        const lista = cargar();
        if (!lista.length) { alert('Todavía no hay ejercicios para exportar.'); return; }
        const paquete = { formato: 'esle2-ejercicios', version: 1, lenguaje, ejercicios: lista };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(paquete, null, 2)], { type: 'application/json' }));
        a.download = 'mis-ejercicios.json';
        a.click();
        URL.revokeObjectURL(a.href);
      }

      function importar(texto) {
        let d;
        try { d = JSON.parse(texto); } catch (e) { alert('El archivo no es un JSON válido.'); return; }
        if (!d || d.formato !== 'esle2-ejercicios' || !Array.isArray(d.ejercicios)) {
          alert('No parece un paquete de ejercicios de ESLE2.');
          return;
        }
        if (d.lenguaje && d.lenguaje !== lenguaje &&
            !confirm(`Ese paquete es de ${d.lenguaje} y estás en ${lenguaje}. ¿Importarlo igual?`)) return;

        const lista = cargar();
        const tope = global.Seguro ? global.Seguro.LIMITES.ejercicios : 100;
        let sumados = 0;
        for (const e of d.ejercicios.slice(0, tope)) {
          if (!valido(e)) continue;
          /* Del archivo se toman los campos conocidos y nada más: «mio» y el
             id los pone ESLE2, no el que armó el paquete. */
          const copia = Object.assign(limpiar(e, lista.length), { mio: true });
          if (!copia.id || lista.some(x => x.id === copia.id)) copia.id = nuevoId(lista);
          lista.push(copia);
          sumados++;
          if (lista.length >= tope) break;
        }
        guardar(lista);
        pintar();
        if (alCambiar) alCambiar();
        alert(`Importados ${sumados} ejercicio(s).`);
      }

      dlg._pintar = pintar;
      pintar();
    }

    /* Casos de prueba en texto:  entrada  =>  salida, separados por --- */
    function aTexto(pruebas) {
      return pruebas.map(p => `${p.entrada}\n=>\n${p.salida}`).join('\n---\n');
    }
    function deTexto(texto) {
      const pruebas = texto.replace(/\r/g, '').split(/^---$/m).map(bloque => {
        const partes = bloque.split(/^=>$/m);
        if (partes.length !== 2) throw new Error('Cada caso necesita una línea con "=>" entre la entrada y la salida.');
        return { entrada: partes[0].replace(/^\n+|\n+$/g, ''), salida: partes[1].replace(/^\n+|\n+$/g, '') };
      });
      if (!pruebas.length) throw new Error('Hace falta al menos un caso de prueba.');
      return pruebas;
    }

    return {
      cargar,
      abrir() {
        if (!dlg) construir();
        dlg._pintar();
        dlg.showModal();
      }
    };
  }

  global.MisEjercicios = { crear };
})(window);

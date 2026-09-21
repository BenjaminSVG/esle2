# Cómo meterle mano a ESLE2

El `README.md` cuenta **qué hace** ESLE2. Esto cuenta **cómo se le agregan cosas**, para el día en
que lo mantenga alguien que no lo escribió.

Si tenés quince minutos, leé nada más las dos primeras secciones: las reglas y el ciclo de trabajo.
Lo demás son recetas para buscar cuando hagan falta.

---

## Las cuatro reglas que no se negocian

Están primero porque son las únicas que no se pueden deducir mirando el código, y las cuatro se
rompen sin querer.

### 1. No hay servidor, y no lo va a haber

Todo el sitio son archivos estáticos. No hay base de datos, no hay funciones serverless, no hay
cuentas. Lo que parece guardarse en algún lado está en el navegador (`localStorage`, cookies) o
viaja adentro de un enlace, después del `#`.

**Por qué:** una cátedra no puede depender de un servidor que alguien tiene que pagar y mantener
después de que el autor se recibe. Un sitio estático publicado en cualquier lado sigue andando solo
durante años. Y el día del parcial no se cae nada, porque no hay nada que se pueda caer.

La única excepción es el relevo de `servidor-senas/`, que **solo reparte sobres cerrados** y no
ve el contenido: lo que pasa por ahí va cifrado con una llave que ese servidor nunca recibe. Si se
cae, se caen tres funciones y el resto del sitio sigue entero.

### 2. No hay IA

Ni para corregir, ni para explicar, ni para generar ejercicios. La corrección es determinista: se
ejecuta el programa y se compara la salida con la esperada. Un alumno que reprueba tiene derecho a
saber exactamente por qué, y a que mañana la respuesta sea la misma.

### 3. El lenguaje no se toca por comodidad

`inicio`, `fin`, `si`, `mientras` y el resto son los del material de la cátedra. Cambiar una palabra
—o "arreglar" una rareza de la sintaxis— parte en dos el curso, los ejemplos, la documentación, los
seis traductores y todo lo que los alumnos ya escribieron.

Si el material de la cátedra cambia, el lenguaje cambia. Si no, no.

### 4. Todo tiene que andar sin internet, y sin mouse

El *service worker* guarda una copia de todo. Si agregás un archivo y no entra en la lista, el sitio
anda perfecto con conexión y falla en la máquina de un alumno sin ella —que es cuando nadie puede
avisar. `npm run revisar` lo caza; ver más abajo.

Y todo lo que se hace con el mouse se tiene que poder hacer con el teclado. El diseñador de ventanas
de ESLE2 Visual se arrastra con el mouse **y** se mueve con las flechas, y cada movimiento se
anuncia. No es un extra: quien más necesita el resto de ESLE2 suele ser quien no puede usar el
mouse.

---

## El ciclo de trabajo

```
npm test          las 47 suites, un renglón cada una (~2 minutos)
npm run revisar   eso más las cuatro cosas previas a publicar
npm run soltar    revisa y, si está todo bien, publica
```

`npm run revisar` hace, en este orden:

1. regenera `js/indice.js` (el buscador global) y `js/soluciones.js`;
2. compara lo que piden las diez páginas contra la lista `ARCHIVOS` de `sw.js`;
3. comprueba que `VERSION` en `sw.js` haya subido desde la última publicación;
4. corre todas las pruebas.

**No publiques a mano.** Los cuatro pasos se hacían de memoria y el que más se olvidaba —el de la
caché— es el único que no se nota hasta que es tarde.

### Nunca comprometas esto

* que las 47 suites pasen;
* que `axe-core` no reporte ninguna violación. Cada función nueva se audita en 3 anchos × 2 temas ×
  los estados que tenga. Ya hubo seis defectos reales encontrados así, incluido un contraste de 4,03
  donde hacía falta 4,5;
* que lo nuevo se pueda usar con el teclado.

---

## Recetas

### Agregar un ejercicio al curso

1. En `js/ejercicios.js`, agregá el objeto:

   ```js
   {
     id: 'm14',                       // f=fácil, m=medio, a=avanzado, + número
     nivel: 'medio',
     titulo: 'Contar vocales',
     enunciado: 'Leé una palabra e imprimí cuántas vocales tiene.',
     pista: 'strlen (s) y substr (s, i, 1)',
     plantilla: 'var\n   s : cadena\ninicio\n   \nfin\n',
     pruebas: [{ entrada: 'casa', salida: '2' }]
   }
   ```

2. En `test/soluciones-curso.js`, agregá **una solución de referencia con el mismo id**.
3. `npm test`.

Tres pruebas distintas van a opinar, y las tres tienen razón:

* `test-sle2.js` ejecuta tu solución contra cada caso. Si no da exactamente la salida esperada,
  falla: un ejercicio que nadie puede aprobar es peor que no tener el ejercicio;
* `test-estilo.js` pasa el revisor de estilo por tu solución. Si la solución de la cátedra recibe
  avisos, la regla de estilo está mal o la solución está mal;
* `test-otra-forma.js` comprueba que `js/soluciones.js` no quedó viejo (lo regenera `npm run revisar`).

Los ejercicios de POO están en `js/ejercicios-poo.js` y los de Visual en `js/ejercicios-visual.js`,
con `test/soluciones-visual.js`. Los de Visual no se corrigen por la salida de texto sino por lo que
el programa dibujó en la ventana: mirá `js/verificar-visual.js`.

### Agregar una función al lenguaje

Una función predefinida —del estilo de `strlen`— se toca en pocos lugares:

1. `js/sle2.js`: la tabla `PREDEF` (qué recibe, qué devuelve, qué hace);
2. `documentacion.html`: la fila de la tabla que le corresponde, con la firma entre `<code>` y una
   explicación en la celda siguiente;
3. los traductores que correspondan (`js/traducir.js`, `traducir-py.js`, `traducir-c.js`,
   `traducir-poo.js`) — si no la traducís, exportar un programa que la use produce código roto;
4. `test/test-sle2.js` y el test del traductor que hayas tocado.

**El paso 2 no es solo documentación.** `tools/generar-indice.js` lee esas tablas y de ahí salen
tanto el buscador global como la ayuda que aparece al escribir la función en el editor. No hay una
lista de ayudas escrita a mano en ningún lado: si la documentaste, el autocompletado ya la sabe.

Una **palabra reservada** nueva es harina de otro costal: toca el tokenizador, el parser, el
intérprete, el resaltado (`js/modo-sle2.js`), los seis traductores y la documentación. Antes de
hacerlo, leé la regla 3.

### Agregar una función nueva al IDE

El patrón que sigue todo el proyecto: **un archivo con el modelo y otro con la pantalla.**

* `js/loquesea.js` — cálculo puro, sin DOM. Es lo que se prueba con Node.
* `js/loquesea-ui.js` — solo DOM. Llama al modelo.
* `test/test-loquesea.js` — prueba el modelo.

Después: agregá los `<script>` a las páginas que lo usen, `npm run revisar` (mete el archivo en la
caché y te avisa que subas `VERSION`), documentalo en el `README.md` y en la documentación de la
página, y auditá con axe.

Módulos chicos y buenos para copiar como plantilla: `js/racha.js`, `js/cobertura.js`,
`js/perfil.js`.

### Pintar algo que vino de afuera

Tres reglas, y las tres las prueba `test/test-cabeceras.js`:

1. **Texto ajeno va con `textContent`.** Un título, un nombre, un error, una celda: nada de eso
   necesita ser HTML.
2. **Si de verdad tiene que llevar etiquetas** —solo el enunciado y la pista de un ejercicio—, va
   por `Seguro.html(...)`. No escribas otro escapador: los que había escapaban `&<>` y no las
   comillas, así que servían para un párrafo y se colaban en un atributo.
3. **Nada se pega adentro de un atributo.** El id, el nivel y el color se ponen por DOM
   (`el.dataset.id = …`, `el.style.background = …`), no interpolados en un `innerHTML`.

Lo que llega de un enlace, de un archivo o de otro par se limpia **antes** de guardarlo o mostrarlo,
con `Seguro.ejercicio()` o con la función de limpieza de ese formato, y con el tamaño mirado antes
de leer (`Seguro.cabe(archivo)`). Los límites están todos juntos en `Seguro.LIMITES`.

Y por la CSP: nada de `<script>` ni `<style>` escritos adentro de un HTML, ni atributos `onclick=`
o `style=`. Si hace falta un script nuevo, es un archivo en `js/` y un `<script src>`.

### Tocar la interfaz: acordate del tutorial

Si agregaste, sacaste o renombraste un botón, un panel o un menú, el tutorial quedó viejo. Son dos
cosas, y las dos avisan solas:

1. **el texto**, en `js/tutorial.js`: un `CONTROLES[id]` con qué hace, cuándo usarlo y qué necesita,
   y el id en la sección que corresponda (`cambios` dice qué entorno agrega o quita cuál).
   `test/test-tutorial.js` compara los ids que empiezan con `btn` o `sel` contra el HTML de cada
   página, así que un botón que ya no existe hace fallar la prueba;
2. **la captura**:

   ```
   node tools/capturar-tutorial.js --verificar    ¿siguen estando esas regiones?
   node tools/capturar-tutorial.js                las saca de nuevo, las 53
   ```

   Necesita Playwright, que **no** es dependencia del sitio: instalalo aparte
   (`npm i -D playwright`) o pasale dónde está con `--playwright <ruta a node_modules>`. Levanta el
   sitio en un servidor propio, así que no hace falta tener nada corriendo. Al terminar escribe solo
   las medidas de cada imagen en `js/tutorial.js`.

Después, `npm run revisar` mete las capturas nuevas en la caché y te avisa que subas `VERSION`.

### Publicar

`npm run soltar`. Publica en Vercel y anota la versión en `tools/publicado.json`, que es contra lo
que se compara la próxima vez.

---

## Cómo está armado

| Dónde | Qué hay |
| --- | --- |
| `js/sle2.js` | Tokenizador, parser, intérprete y revisor de estilo. El corazón. |
| `js/sle2poo.js` · `sle2vis.js` · `sle2bd.js` | Los tres dialectos, extendiendo el mismo intérprete. |
| `js/app.js` · `app-poo.js` · `visual-app.js` · `bd-app.js` | Un IDE por página. |
| `js/*-ui.js` | La pantalla de cada función; el archivo sin `-ui` es el modelo. |
| `test/` | Una suite por módulo. Se corren con `npm test`. |
| `tools/` | Generadores y el guion de publicación. |
| `servidor-senas/` | El único servidor, y es opcional. |

El intérprete es un recorredor de árbol `async`: cada sentencia pasa por `Interprete.ejecutar(s)`,
que antes llama a `opts.depurador(linea, this)`. **Ese gancho es de donde cuelga medio ESLE2**: el
depurador paso a paso, el viaje en el tiempo y la cobertura de líneas son todos el mismo gancho con
distinta pantalla. Si necesitás saber qué está haciendo un programa mientras corre, empezá por ahí.

---

## Errores que ya cometimos

Están acá para que no haya que volver a descubrirlos.

* **`ARCHIVOS` en `sw.js`.** La primera vez que corrió `tools/revisar-cache.js` encontró seis
  archivos sin guardar: los diagramas de la documentación de POO llevaban quién sabe cuánto sin
  verse sin internet. Nada lo mostraba.
* **Copiar por referencia en el grabador.** Al guardar el estado paso a paso hay que **clonar** las
  variables. Si no, todos los cuadros muestran el valor final y el viaje en el tiempo parece que
  anda.
* **Marcar la línea de un ciclo como "no se ejecutó".** El gancho se llama una vez por vuelta, así
  que un `mientras` que da falso la primera vez no aparece en las cuentas — pero su condición **sí**
  se evaluó. Marcarlo manda al alumno a buscar un problema inexistente.
* **`”` no escapa una comilla.** En SL una cadena abierta con `"` también se cierra con `”`. Para
  meter una comilla adentro de una cadena hay que usar la simple.
* **Pintar el fondo de una línea del editor.** El verde de los números (`#098658`) tiene 4,60 de
  contraste contra el blanco: cualquier tinte lo baja de 4,5. Las líneas se marcan con una barra al
  costado, no con fondo.
* **Una sola clave de `localStorage` para todo el sitio.** El examen en curso se guardaba con la
  misma clave en los tres dialectos: quien estaba rindiendo en el IDE y abría Visual se encontraba
  ese examen, con ejercicios que Visual no tiene y sin forma de salir.
* **Creer que "conectado" es "funciona".** Un relevo puede aceptar la conexión y no reenviar
  nada. Hay que probar el reenvío, no la conexión.
* **Creer que "se conectan" es "se encuentran".** Esto costó una versión entera: de máquina a
  máquina (WebRTC) las dos puntas se anuncian bien y después no hay ruta entre ellas, porque el
  wifi de un colegio aísla a los alumnos entre sí. La señal de que algo anda es que el otro vea lo
  que escribís, no que la pantalla diga «conectado».

---

## Si venís de afuera

No hace falta pedir permiso para nada. Un ejercicio nuevo, un error de tipeo en la documentación o
una traducción que devuelve código roto son todos aportes del mismo tamaño.

Lo único que se pide es que `npm test` pase y que lo nuevo se pueda usar sin mouse.

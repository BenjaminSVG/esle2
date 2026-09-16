# Plan de trabajo: ESLE2 BD

Cuatro cosas pedidas, en este orden de dependencia:

1. Que todo se escriba en español, sin una sola palabra en inglés obligatoria.
2. Que se puedan anidar consultas, y que anidarlas mucho no rompa nada.
3. Que una base grande no cuelgue la pestaña.
4. Diez ejemplos, cincuenta ejercicios y la documentación al día, con dibujos.

«Sin fallas» no puede significar «sin límite»: una pestaña del navegador tiene
la memoria que tiene. Significa **resultado correcto mientras entre en el
presupuesto, y un cartel claro cuando no entre** — nunca una pestaña congelada
ni una sentencia aplicada por la mitad.

## Cómo está hoy

| Pieza | Estado |
|---|---|
| `js/sql.js` | Motor propio: CREATE/DROP TABLE, INSERT, SELECT con JOIN, GROUP BY, HAVING, ORDER BY, LIMIT, UPDATE, DELETE. Catorce funciones. NULL de verdad. |
| Español | **Catorce palabras** traducidas (`SINONIMOS`). El resto —ORDENAR, AGRUPAR, UNIR, EN, ENTRE, los tipos, las funciones— hay que escribirlo en inglés. |
| Subconsultas | **Ninguna.** Ni escalar, ni `EN (SELECT)`, ni `EXISTE`, ni tabla derivada. |
| JOIN | Bucle anidado que materializa todo: un `Object.assign` por cada pareja candidata. 100.000 × 100.000 no termina. |
| Índices | No hay. Comprobar una clave primaria recorre la tabla entera, así que cargar N filas tiende a O(N²). |
| Cortes | No hay tope de filas, ni de tiempo, ni de trabajo. Una consulta cara cuelga la pestaña sin aviso. |
| Curso | **No existe.** Los otros tres dialectos tienen cincuenta ejercicios cada uno. |
| Ejemplos | Ocho. |

Dos defectos encontrados al revisar, que entran en la primera fase:

- **`INNER JOIN` no se puede escribir.** En `seleccionar()`, `come('inner')`
  solo se ejecuta si antes vino `LEFT`. Un `INNER JOIN` suelto deja el `inner`
  sin consumir y la consulta se corta ahí. Solo anda `JOIN` a secas.
- `IFNULL` existe en el motor y está en el mensaje de error, pero no figura en
  la documentación, así que el autocompletado no lo ofrece.

## Las nueve entregas

Cada fila se publica sola, con `npm run soltar`, y deja el sitio andando.

| # | Entrega | Qué toca | Cuándo está lista |
|---|---|---|---|
| 1 ✅ | Español completo | `sql.js`, `sle2bd.js`, `modo-sle2.js`, docs | Español, inglés y mezcla dan lo mismo; los ocho ejemplos y los volcados propios siguen andando |
| 2 ✅ | Presupuesto y cancelación | `sql.js`, `bd-app.js` | Una consulta cara se detiene sin colgar el IDE y sin dejar la base a medias |
| 3 | Índices de clave | `sql.js` | Buscar por clave primaria deja de recorrer la tabla; índice y datos nunca divergen |
| 4 | Consultas grandes | `sql.js` | 100.000 × 100.000 por igualdad sin armar el producto cartesiano |
| 5 | Subconsultas sueltas | `sql.js` | Escalar, `EN`, `EXISTE`, tabla derivada; cardinalidad y nulos cubiertos |
| 6 | Subconsultas correlacionadas | `sql.js` | Correlación a varios niveles, con el mismo presupuesto compartido |
| 7 | Diez ejemplos | `bd-ejemplos.js` | Los diez corren desde una base limpia |
| 8 | Curso de cincuenta | `ejercicios-bd.js`, `verificar-bd.js`, `curso-bd-ui.js` | Las cincuenta soluciones pasan y las respuestas tramposas no |
| 9 | Documentación ilustrada | `bd-documentacion.html`, `img/bd/` | Referencia completa, tres dibujos, ayuda regenerada, anda sin conexión |

**El orden importa.** El presupuesto (fase 2) va *antes* que las subconsultas
(5 y 6): una correlacionada multiplica el trabajo por la cantidad de filas de
afuera, y sin tope eso es una pestaña colgada garantizada.

---

## 1. Español completo

Una sola gramática, dos vocabularios. Las palabras de sintaxis van **sin
tildes**; los mensajes y las explicaciones, escritos como se escribe.

| SQL | Español |
|---|---|
| SELECT / FROM / WHERE | SELECCIONAR / DE / DONDE |
| INSERT INTO / VALUES | INSERTAR DENTRO / VALORES |
| UPDATE / SET | ACTUALIZAR / CONJUNTO |
| DELETE FROM | BORRAR DE |
| CREATE TABLE / DROP TABLE | CREAR TABLA / ELIMINAR TABLA |
| IF EXISTS / IF NOT EXISTS | SI EXISTE / SI NO EXISTE |
| AS / DISTINCT | COMO / DISTINTOS |
| ORDER BY / ASC / DESC | ORDENAR POR / ASCENDENTE / DESCENDENTE |
| GROUP BY / HAVING | AGRUPAR POR / TENIENDO |
| JOIN / INNER JOIN / LEFT JOIN | UNIR / INTERIOR UNIR / IZQUIERDA UNIR |
| ON | SEGUN |
| LIMIT / OFFSET | LIMITE / DESPLAZAMIENTO |
| AND / OR / NOT | Y / O / NO |
| IS NULL / IS NOT NULL | ES NULO / ES NO NULO |
| LIKE / NOT LIKE | COMO_PATRON / NO COMO_PATRON |
| IN / NOT IN | EN / NO EN |
| BETWEEN / EXISTS | ENTRE / EXISTE |
| PRIMARY KEY / FOREIGN KEY / REFERENCES | CLAVE PRIMARIA / CLAVE FORANEA / REFERENCIA |
| UNIQUE / NOT NULL / DEFAULT / NULL | UNICO / NO NULO / POR DEFECTO / NULO |

Funciones: `CONTAR`, `SUMAR`, `PROMEDIO`, `MINIMO`, `MAXIMO`, `MAYUSCULAS`,
`MINUSCULAS`, `LONGITUD`, `REDONDEAR`, `ABSOLUTO`, `SUBCADENA`, `RECORTAR`,
`PRIMERO_NO_NULO`, `SI_NULO`.

Tipos: `ENTERO`, `REAL`, `TEXTO`, `NUMERICO`, `DECIMAL`, `CARACTER(n)`,
`CADENA(n)`, `LOGICO`, `FECHA`, `HORA`, `FECHA_HORA`. Se normalizan al tipo
interno **en el parser de declaraciones**, antes de la afinidad y antes de
exportar, así el volcado sigue siendo SQL que SQLite entiende. Los tipos en
español no traen validaciones nuevas: `FECHA` no hace aritmética de fechas.

### La colisión de `y` y `o`

Es lo que frenó esta traducción la primera vez, y con razón: una tabla de
puntos con columnas `x` e `y` es corriente en este mismo sitio. Reservar `y`
globalmente rompería `ORDENAR POR y`.

**Se resuelve en el parser, no en el tokenizador.** El tokenizador deja la
palabra como vino; el parser la lee según el lugar:

- donde espera un operando → es una columna;
- después de una expresión completa → es el operador;
- después de un punto → siempre es un nombre de columna;
- entre comillas → siempre es un nombre.

Esto tiene que andar:

```sql
SELECCIONAR x, y, o
DE puntos
DONDE y > 0 Y o < 10
ORDENAR POR y
```

Otras palabras que pueden chocar con nombres de columna razonables: `real`,
`fecha`, `hora`, `grupo`, `valores`, `tabla`, `clave`, `referencia`, `promedio`,
`minimo`, `maximo`, `nulo`. Misma regla. Para lo que quede ambiguo —una columna
que se llame `nulo`—, se documenta escribirla entre comillas o calificada:
`t.nulo`.

Mezclar los dos idiomas en una sentencia se acepta, pero las frases españolas
se reconocen enteras: `CLAVE PRIMARIA` sí, `PRIMARY CLAVE` no. Los errores
nombran primero la forma española y entre paréntesis la inglesa cuando ayuda:
«se esperaba DENTRO (INTO)».

## 2. Presupuesto y cancelación

Topes iniciales, todos en un solo lugar del archivo para poder moverlos después
de medir:

| Recurso | Tope |
|---|---:|
| Filas por tabla / en total | 100.000 / 500.000 |
| Filas de resultado | 100.000 |
| Trabajo por sentencia | 10.000.000 de operaciones |
| Tiempo por sentencia | 5 s |
| Texto SQL / nodos del árbol | 1 MiB / 50.000 |
| Filas mostradas por página | 100 |

El contador cuenta parejas de JOIN examinadas, evaluaciones y trabajo de
ordenamiento. **Todas las subconsultas comparten el mismo presupuesto**:
ninguna lo reinicia, o anidar sería la forma de evadirlo.

Nada se trunca en silencio. El cartel dice qué hacer:

> La consulta se detuvo porque superó el límite de trabajo. Agregá un filtro,
> reducí el resultado con LIMITE o dividila. La base no se modificó.

**Que la pestaña siga viva sin Web Worker.** El recorrido interno se hace
reanudable, y de ahí cuelgan dos entradas: `SQL.ejecutar()` sigue siendo
síncrona para Node y para el editor de tablas, y una entrada cooperativa para
`InterpreteBD` que devuelve el control al navegador cada 8–16 ms. Un solo
evaluador, no dos. Ceder con una tarea del navegador, no con
`await Promise.resolve()`, que no alcanza para repintar.

Un Worker solo se justifica si esto falla la prueba de respuesta: mover el SQL
solo obligaría a copiar la base de ida y vuelta, y mover todo SL es otro
proyecto.

> **Lo que se hizo y lo que no.** El presupuesto, los topes y la atomicidad
> están. El recorrido reanudable **no**: mientras una instrucción corre, la
> página se queda quieta hasta que termina o hasta que se le acaban los cinco
> segundos. La falla de verdad —una pestaña colgada para siempre, una sentencia
> aplicada por la mitad, un resultado cortado que parece completo— ya no está,
> y eso vale un release. Partir el evaluador en dos entradas es un refactor
> grande; conviene hacerlo después de la fase 4, cuando el JOIN por hash ya
> haya cambiado los ciclos que habría que volver reanudables, y no antes.

Cada sentencia se publica entera o no se publica: si se corta a la mitad, la
base queda como estaba.

## 3 y 4. Que aguante una base grande

En orden de lo que más rinde por lo que cuesta:

| # | Cambio | Qué gana |
|---|---|---|
| 1 | Resolver las columnas una vez por consulta, no una por fila | Constante, 1–3× |
| 2 | Filas por referencia, sin copiar cada pareja | Menos basura, 2–5× |
| 3 | Corte temprano cuando ya salieron las filas del LIMITE | Puede pasar de 100× |
| 4 | Índices de clave primaria y única | Buscar una clave: de O(N) a O(1) |
| 5 | JOIN por hash cuando la condición es una igualdad | O(N×M) a O(N+M+R) |
| 6 | Reusar la subconsulta que no depende de la fila de afuera | Se calcula una vez, no N |

Las filas siguen siendo objetos con el nombre de columna de clave: pasarlas a
arrays tocaría el editor de tablas, el exportador y el diagrama sin necesidad.
Lo que se saca es el `Object.assign` por pareja.

El JOIN por hash tiene que conservar los duplicados (el índice apunta a una
lista, no a una fila), dejar afuera las claves nulas, aceptar una condición
sobrante evaluada sobre los candidatos, y armar la clave respetando
`comparar()`: `1` y `"1"` no son lo mismo.

Los índices son mapas internos, fuera de lo que se serializa. Antes de
escribirlos hay que ubicar **todos** los lugares que tocan `filas` —insertar,
actualizar, borrar, importar, el editor visual— porque un escritor que se
olvide de mantenerlos es un índice mentiroso, que es peor que no tenerlo.

El corte por LIMITE nunca se empuja por debajo de un ORDENAR, un AGRUPAR o un
DISTINTOS.

Escala que se promete después de medirla: 100.000 filas por tabla en
escritorio, 20.000 en teléfono. Un millón queda como experimento, no como
promesa.

## 5 y 6. Subconsultas

Dónde se pueden escribir: en la proyección, en las comparaciones, en los
argumentos de una función, en `DONDE`, en `SEGUN`, en `TENIENDO`, en los
valores de un INSERTAR y en las expresiones de un ACTUALIZAR. En `POR DEFECTO`
no: ahí sigue yendo un literal.

En el parser (`class P`): `primaria()` distingue una expresión entre paréntesis
de un `SELECCIONAR`; `EN (` distingue una lista de una consulta; se agrega
`NO EN`, que hoy no existe; se reconoce `EXISTE (consulta)`; y `fuente()`
acepta `(consulta) COMO alias`, con el alias obligatorio.

En la evaluación, `evaluar()` y `seleccionar()` reciben un contexto con la base,
el presupuesto compartido, el ámbito actual, la cadena de ámbitos de afuera, la
profundidad y una caché de las subconsultas que no dependen de la fila. Entrar
a una subconsulta **agrega** un ámbito, no mezcla la fila de afuera con la de
adentro. Un alias local tapa al de afuera entero: si adentro existe `a` pero no
tiene `a.x`, eso es un error, no una excusa para ir a buscar el `a.x` de afuera.

Hay que revisar a mano `validar()`, `buscarAgregados()` y el contexto de
agrupación: los tres recorren el árbol genéricamente, así que hoy atravesarían
la frontera de una subconsulta sin darse cuenta.

Lo que tiene que dar cada caso:

| Caso | Resultado |
|---|---|
| Escalar, una columna, cero filas | NULO |
| Escalar, una columna, una fila | Ese valor |
| Escalar, más de una fila | **Error**, nunca la primera |
| Escalar o `EN` con más de una columna | Error, aunque venga vacía |
| `EXISTE` | Verdadero con al menos una fila |
| `EN`, coincide | Verdadero |
| `EN`, no coincide pero hay un nulo | NULO |
| `EN`, no coincide y no hay nulos | Falso |
| `EN` sobre resultado vacío | Falso, aun con la izquierda nula |
| `NO EN` | Negación de tres valores: negar NULO sigue dando NULO |

`EXISTE` puede cortar en la primera fila **del resultado**, no de la tabla:
AGRUPAR, TENIENDO y LIMITE cambian si existe o no. Una escalar solo necesita
mirar hasta dos filas para saber si hay más de una.

Un ACTUALIZAR cuya subconsulta lee la misma tabla lee el estado *anterior* a la
sentencia, o el resultado dependería del orden de recorrido.

Topes: **32 niveles** de anidamiento, 128 de paréntesis y 50.000 nodos,
revisados *antes* de cada descenso, no después de armar el árbol. Los árboles
largos —mil sumas seguidas— se recorren con una pila explícita, no con
recursión. El error dice qué hacer:

> La consulta supera los 32 niveles de anidamiento. Dividila en consultas más
> simples.

`finSQL()` en `sle2bd.js` —el que decide dónde termina una sentencia SQL suelta
dentro de un programa— ya cuenta paréntesis. Se extiende y se prueba: comentarios,
nombres entre comillas, `@variable`, cláusulas en español y subconsultas de
varias líneas. No se reemplaza por otro parser.

Fuera de alcance por ahora: `UNION`, CTE (`WITH`), funciones de ventana,
transacciones y `LATERAL`.

## 7. Los diez ejemplos

Los ocho de hoy se conservan y se traducen. El octavo pasa a mostrar
`@variable` en primer plano. Los dos nuevos:

9. **Ventas por encima del promedio** — escalar suelta, tabla derivada y
   agrupación, en un informe corto.
10. **Quiénes compraron y quiénes no** — `EXISTE` y `NO EXISTE` correlacionados,
    con la variante con `EN` al lado para mostrar por qué el nulo la cambia.

El ejemplo 10 no es una consulta de treinta niveles: eso va en las pruebas del
motor, no en el selector.

## 8. Los cincuenta ejercicios

Se corrige **mirando la base que quedó**, no el texto impreso. Comparar la
salida aprueba a quien escriba los `imprimir()` a mano sin tocar la base, y no
comprueba nada de un CREAR TABLA ni de un ACTUALIZAR — que es justamente lo que
se está enseñando. Es el mismo criterio que `verificar-visual.js`, que mira la
ventana en vez del texto.

Archivos: `js/ejercicios-bd.js` (los enunciados), `js/verificar-bd.js` (el
corrector, sin DOM), `js/curso-bd-ui.js`, `test/test-verificar-bd.js`,
`test/soluciones-bd.js` y `test/test-curso-bd.js`.

Reglas del corrector: base nueva por caso y nunca la del IDE; valores
comparados con su tipo (NULO, `0` y `""` son tres cosas distintas); filas
comparadas como multiconjunto, con los duplicados, y el orden exigido solo si
el enunciado lo pide; varios juegos de datos para que una respuesta constante
no pase; y diferencias concretas en el mensaje —qué fila falta, qué valor
cambió—. Donde el ejercicio pide practicar una construcción (`EXISTE`
correlacionado), se mira el árbol, no se busca la palabra con una expresión
regular.

Veinte fáciles, veinte medios, diez difíciles:

| Ejercicios | Tema |
|---|---|
| 1–5 | Crear tabla, tipos en español, insertar una y varias filas, seleccionar |
| 6–10 | Filtrar números y texto, `Y`, `O` y `NO`, ordenar con desempate |
| 11–15 | LIMITE y DESPLAZAMIENTO, DISTINTOS, nulos, POR DEFECTO, clave primaria |
| 16–20 | UNICO y NO NULO, actualizar, borrar, alias, recorrer el resultado desde SL |
| 21–25 | Mayúsculas, longitud y subcadena, redondeo, tapar nulos, patrones |
| 26–30 | ENTRE y listas, contar y sumar, promedio y extremos, agrupar, TENIENDO |
| 31–35 | Referencias, UNIR, IZQUIERDA UNIR, tres tablas, agregados sobre un UNIR |
| 36–40 | `@variable`, escalar suelta, `EN` con subconsulta, `EXISTE`, tabla derivada |
| 41–45 | Escalar correlacionada, existencia correlacionada, ausencia con `NO EXISTE`, `NO EN` con nulos, dos ámbitos |
| 46–50 | Derivada con agregado y UNIR, subconsulta en `TENIENDO`, ACTUALIZAR con subconsulta, cuatro niveles, informe integrador |

Enunciados, plantillas y soluciones, todo en español. Que el inglés siga
andando se prueba en el motor, no en el curso.

`tools/generar-indice.js` y `tools/generar-soluciones.js` tienen que aprender
el curso nuevo; hoy el segundo solo genera las del curso base. El progreso usa
claves propias de BD.

## 9. Documentación y dibujos

Tres ilustraciones, cada una con una sola idea:

| Dibujo | Lo que tiene que quedar claro |
|---|---|
| Subconsulta suelta y correlacionada | La suelta se calcula una vez; la correlacionada recibe la fila de afuera |
| `NO EN` contra `NO EXISTE` con nulos | Un nulo vuelve desconocido a `NO EN`; `EXISTE` solo pregunta si hay filas |
| JOIN por hash | Agrupar por clave evita comparar cada fila con todas |

Van en `img/bd/`, con los atributos en el orden que exige `test-manifest.js`
(`src`, `width`, `height`, `loading`, `alt`) y en el precache de `sw.js`. Las
tablas de funciones nuevas van en secciones cuyo id esté en
`tools/generar-indice.js`, o el autocompletado no las ve.

## Lo que más riesgo tiene

| Fase | Qué se puede romper | Prueba que lo agarra |
|---|---|---|
| 1 | Una palabra nueva se come una columna o un alias | Matriz español/inglés/mezcla; columnas `y`, `o`, `nulo`, `promedio`; recargar un volcado propio |
| 2 | Sentencia aplicada a medias, o resultado truncado sin avisar | Cancelar en medio de un JOIN y de un ACTUALIZAR; base idéntica antes y después de una sentencia cortada |
| 3 | Índice desactualizado tras importar o editar a mano | Insertar, actualizar, borrar, editar, importar; duplicados dentro del mismo lote |
| 4 | El hash pierde duplicados o nulos; el corte cambia el resultado | Comparar contra el bucle simple sobre bases chicas |
| 5 | Escalar que elige la primera fila; `NO EN` mal | Cero, una y dos filas; conjunto vacío con nulo; niveles 32 y 33 |
| 6 | Columna resuelta en el ámbito equivocado | Alias tapado; correlación a tres niveles; presupuesto acumulado |
| 8 | El corrector aprueba una respuesta constante | Las cincuenta pasan; variantes tramposas fallan |
| 9 | Ayuda sin regenerar, imagen fuera del precache | `test-indice.js`, `test-autocompletar.js`, `test-manifest.js`, `test-cache.js` |

Además, tres cosas para cubrir con pruebas de regresión mientras se toca esto:

- `NULO Y falso` tiene que dar falso y `NULO O verdadero` verdadero, en los dos
  órdenes.
- Un agregado sin filas no puede reinsertar una fila que el `TENIENDO` rechazó.
- Actualizar una clave tiene que comprobar la unicidad **antes** de publicar.

Cada entrega: `npm run revisar`, teclado y axe en tres anchos × dos temas,
prueba sin conexión, y recién ahí `npm run soltar`.

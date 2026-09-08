# SLE2 para Visual Studio Code

Pseudocódigo en español, con resaltado, errores en vivo y ejecución.
Es el lenguaje **SL / SLE2** de la materia (CNC–UNA), el mismo de
[esle2.vercel.app](https://esle2.vercel.app).

Para quien ya se siente cómodo en el navegador y quiere salir de él: escribir en
su propia computadora, con sus archivos, su Git y su tema de colores, sin
cambiar de lenguaje.

## Qué hace

* **Resaltado de sintaxis** en español: `si`, `mientras`, `desde`, `subrutina`,
  los tipos, las constantes y las 59 subrutinas que trae el lenguaje. Distingue
  `=` de `==` con colores distintos, que es el error más común al empezar.
* **Errores mientras escribís**, sin ejecutar nada. Aparecen subrayados en la
  línea y en el panel *Problemas*, **con la sugerencia** de qué hacer: no solo
  «se esperaba `)`», también «para comparar se usa `==`».
* **Recomendaciones** del revisor —una variable declarada y nunca usada, por
  ejemplo— como avisos, no como errores.
* **Ejecutar** con `Ctrl + Enter`. Corre en una terminal de VS Code, así que
  `leer()` funciona: se escribe en la terminal como en el navegador.

## Es el mismo compilador

`sle2.js` es una **copia exacta** del intérprete que corre en el sitio, generada
por `tools/generar-vscode.js`. No hay dos implementaciones de SL, y por eso la
extensión y el sitio nunca pueden dar veredictos distintos sobre el mismo
programa. Hay una prueba que lo comprueba byte por byte
(`test/test-vscode.js`).

No tiene dependencias de npm. No manda nada a ningún lado.

## Instalarla

Todavía no está publicada en el Marketplace. Se instala así:

```
cd vscode
npx @vscode/vsce package        # deja sle2-1.0.0.vsix
code --install-extension sle2-1.0.0.vsix
```

O, para probarla mientras se la edita: abrir la carpeta `vscode/` en VS Code y
pulsar `F5`.

Para publicarla hace falta una cuenta de editor en el Marketplace de Visual
Studio; con `npx @vscode/vsce publish` y el token de esa cuenta sale.

## Correr un programa sin VS Code

`correr.js` anda solo, con Node:

```
node vscode/correr.js programa.sl
```

Lee del teclado, escribe en la terminal, respeta los colores y los códigos de
`set_color`, y sale con código 1 si el programa no compila. Sirve para corregir
un trabajo práctico desde un script.

## Archivos que reconoce

`.sl` · `.sle` · `.slp` (ESLE2 POO) · `.sldb` (ESLE2 BD)

## Ajustes

| Ajuste | Qué hace |
| --- | --- |
| `sle2.revisarAlEscribir` | Marcar los errores mientras se escribe. Encendido. |
| `sle2.recomendaciones` | Mostrar además los avisos del revisor. Encendido. |

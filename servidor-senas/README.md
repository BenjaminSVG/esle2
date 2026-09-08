# Servidor de señas de ESLE2

Lo que hace posible **Programar de a dos** y las **Batallas de código**.

## Qué hace, y qué no

Presenta a dos computadoras y se va. Recibe «me interesa el tema X» y reenvía a
los demás interesados lo que alguien publique en X; con eso las dos se ponen de
acuerdo para hablarse **directo por WebRTC**, y desde ahí este servidor no
interviene más.

**No ve el contenido.** Lo que pasa por acá son ofertas y respuestas de WebRTC.
El programa que después viaja entre las dos máquinas va cifrado con una
contraseña que este servidor **nunca recibe**: viaja en el enlace, del profesor
al alumno, sin pasar por ningún lado.

**No guarda nada.** No hay base de datos, no hay archivos, no hay registro de
quién habló con quién. Si se reinicia, no se pierde nada porque no había nada.

## Por qué existe

y-webrtc trae un servidor público por omisión. Mientras se escribía esto,
**estaba caído** —y de la peor manera: aceptaba la conexión y no reenviaba
nada, así que la aplicación parecía conectada y no lo estaba—. El otro que se
suele recomendar (`demos.yjs.dev`) es un servidor de y-**websocket**, que habla
otro protocolo y tampoco sirve.

Con este, una escuela no depende de la buena voluntad de nadie. Son 40 líneas y
una sola dependencia.

## Dos versiones, el mismo servidor

| Carpeta | Para qué |
| --- | --- |
| esta | Cualquier máquina que corra Node: una computadora de la escuela, o un servicio pago. |
| [`cloudflare/`](cloudflare/) | **Cloudflare Workers: gratis, sin tarjeta y sin dormirse.** Es la que conviene si no tenés una máquina propia. |

Las dos hablan el mismo protocolo, así que el navegador no se entera de cuál está del otro lado.
[`../test/test-senas.js`](../test/test-senas.js) las prueba a las dos con la misma tanda de
mensajes, y lo que comprueba es que **reenvíen**, no que conecten: aceptar la conexión y no reenviar
nada es justo la forma en que se rompieron los servidores públicos.

**Ojo con los planes gratuitos que corren Node** (tipo Render): duermen el servicio a los quince
minutos sin tráfico, tardan un minuto en despertar y al dormirse cortan las conexiones abiertas. En
una clase eso es esperar un minuto una y otra vez. Para eso está la versión de Cloudflare.

## Levantarlo

```
cd servidor-senas
npm install
npm start                 # escucha en el puerto 4444
```

Para probar que reenvía de verdad —no solo que abre el socket— abrirlo en el
navegador: muestra cuántos temas hay activos.

## Ponerlo en internet

Cualquier lugar que corra Node sirve. Hay un `Dockerfile` listo.

| Dónde | Cómo |
| --- | --- |
| Fly.io | `fly launch` en esta carpeta, y `fly deploy` |
| Render | Servicio web nuevo, apuntando a esta carpeta, comando `npm start` |
| Railway | Igual que Render |
| Una máquina de la escuela | `npm start` detrás de un proxy con HTTPS |

Tiene que quedar en **`wss://`** (no `ws://`): el sitio se sirve por HTTPS y el
navegador no deja abrir un socket sin cifrar desde una página cifrada. Los tres
servicios de arriba dan HTTPS solo.

## Apuntar ESLE2 a él

Sin tocar el código, desde la consola del navegador en el sitio:

```js
localStorage.esle2_senas = 'wss://senas.mi-escuela.edu.py'
```

Se admiten varios separados por coma; se prueban en orden y alcanza con que uno
responda.

Para dejarlo fijo para todos, agregarlo a `PROPIOS` en
[`js/juntos.js`](../js/juntos.js).

## Cuánto aguanta

Cada batalla o sala usa **una conexión por persona**, y solo mientras se están
buscando: una vez que las dos se encontraron, el tráfico va directo entre ellas
y por acá no pasa casi nada. Un curso entero entra de sobra en la capa gratuita
de cualquiera de esos servicios.

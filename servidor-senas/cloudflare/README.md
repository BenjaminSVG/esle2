# El servidor de señas, gratis y despierto

Esta es la versión del servidor de señas para **Cloudflare Workers**. Hace exactamente lo mismo que
[`../servidor.js`](../servidor.js) —presenta a dos computadoras y se va— pero se puede tener **gratis
y encendido todo el tiempo**, que es lo que hacía falta.

## Por qué acá y no en otro lado

Se probaron las alternativas gratuitas mirando lo único que importa: si **reenvían**, no si conectan.

| Dónde | Qué pasa |
| --- | --- |
| Servidores públicos de y-webrtc | **No sirven.** Uno acepta la conexión y no reenvía nada, otro ya no existe, el tercero habla otro protocolo. |
| Planes gratuitos que corren Node (tipo Render) | Duermen el servicio a los 15 minutos sin tráfico, tardan un minuto en despertar y al dormirse cortan las conexiones abiertas. En una clase, es esperar un minuto una y otra vez. |
| **Cloudflare Workers + Durable Objects** | Gratis, sin tarjeta, **no duerme así**. Es lo que hay acá. |
| Una máquina propia (Oracle *always free*, o una de la escuela) | Funciona y es tuya, pero te toca el certificado HTTPS y mantenerla. Para eso está [`../servidor.js`](../servidor.js). |

## Publicarlo

Hace falta una cuenta gratuita de Cloudflare (no pide tarjeta). Tres comandos:

```
cd servidor-senas/cloudflare
npx wrangler login       # abre el navegador una vez
npx wrangler deploy
```

Al terminar te dice la dirección, algo como `https://esle2-senas.TU-USUARIO.workers.dev`.

## Apuntar ESLE2 a él

En la consola del navegador, en el sitio, **una sola vez por computadora**:

```js
localStorage.esle2_senas = 'wss://esle2-senas.TU-USUARIO.workers.dev'
```

Fijate que sea **`wss://`** y no `https://` ni `ws://`: el sitio se sirve cifrado y el navegador no
deja abrir un socket sin cifrar desde una página cifrada.

Si abrís esa dirección en el navegador te muestra una página de estado con la línea ya armada, para
copiar y pegar.

Para que quede fijo para todos sin tocar nada en cada máquina, ponelo en `PROPIOS`, en
[`js/juntos.js`](../../js/juntos.js).

## Cuánto aguanta el plan gratuito

De sobra. Por acá pasa **solo el saludo** entre dos computadoras: en cuanto se encontraron, el
programa viaja directo entre ellas y este servidor deja de intervenir. El plan gratuito da del orden
de tres millones de pedidos por mes, y encima los mensajes que entran se cuentan de a veinte. Un
colegio entero no lo roza.

Tampoco se guarda nada —no se escribe una sola fila— así que el cobro por almacenamiento no aplica.

## Probarlo antes de publicar

```
npx wrangler dev
```

Lo levanta en `http://localhost:8787`. Para comprobar que **reenvía de verdad** —que es lo único que
importa y lo que fallaba en los públicos— está `test/test-senas.js`, que prueba las dos versiones
con la misma tanda de mensajes:

```
node test/test-senas.js
```

## Cómo está hecho

Todas las conexiones van al **mismo** Durable Object (`idFromName('global')`). Tiene que ser así:
dos personas se encuentran solo si están en la misma lista de interesados, y un objeto por región
las dejaría mirándose de lejos sin verse nunca.

Usa la **API de hibernación**, así que una sala esperando a alguien no consume nada, y los `ping` los
contesta la plataforma sola sin despertar al objeto. Como el objeto se puede descargar de memoria en
cualquier momento, la lista de temas de cada uno no vive en una variable: viaja pegada a su conexión,
que es lo único que sobrevive.

Y como en la otra versión: **no ve el contenido** —lo que pasa son ofertas y respuestas de WebRTC, y
el programa va cifrado con una contraseña que este servidor nunca recibe— y **no guarda nada**.

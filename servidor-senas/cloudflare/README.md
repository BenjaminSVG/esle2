# El relevo, gratis y despierto

Esta es la versión del relevo para **Cloudflare Workers**. Hace exactamente lo mismo que
[`../servidor.js`](../servidor.js) —reparte sobres cerrados entre los que están en la misma sala—
pero se puede tener **gratis y encendido todo el tiempo**, que es lo que hacía falta.

Antes esto solo presentaba a dos computadoras para que se hablaran directo por WebRTC. Ese camino
no existe en el wifi de una escuela, así que ahora **todo el tráfico pasa por acá**. Lo que no
cambió es lo que este servidor puede leer: nada. Ver [`../../js/sala.js`](../../js/sala.js).

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

Lo más simple: en el sitio, **Archivo → Programar en grupo… → Para el profesor**, pegar la
dirección y guardar. Queda en esa computadora, y **el enlace de cada sala la lleva adentro**, así
que a los alumnos no hay que configurarles nada.

Fijate que sea **`wss://`** y no `https://` ni `ws://`: el sitio se sirve cifrado, el navegador no
deja abrir un socket sin cifrar desde una página cifrada, y la CSP del sitio solo permite `wss:`.

Si abrís esa dirección en el navegador te muestra una página de estado.

Para que quede fijo para todos sin tocar nada en cada máquina, ponelo en `PROPIOS`, en
[`js/juntos.js`](../../js/juntos.js).

## Cuánto aguanta el plan gratuito

Alcanza, pero ahora hay que mirarlo: desde que el tráfico dejó de ir de máquina a máquina, **por acá
pasa todo lo que se escribe**, no solo el saludo. El plan gratuito da del orden de tres millones de
pedidos por mes y los mensajes entrantes se cuentan de a veinte; una clase de treinta escribiendo
una hora entra cómoda, pero si un día una escuela entera lo usa a la vez, conviene ver el tablero de
Cloudflare antes que suponer. «Gratis» no quiere decir «ilimitado»: pasado el cupo, las operaciones
fallan.

Lo que no cambió: no se guarda nada —no se escribe una sola fila— así que el cobro por
almacenamiento no aplica, y lo que pasa va cifrado con una llave que este servidor nunca recibe.
Hay dos topes puestos: **32 personas por sala** y **un mega por mensaje**, y los dos se miran antes
de parsear nada.

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

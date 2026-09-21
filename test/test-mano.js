/*
 * Prueba del código que se pasan dos alumnos para conectarse sin servidor.
 *
 * Todo lo que entra por «leer» lo pegó una persona: puede venir cortado, mal
 * copiado, de otra versión, armado a mano por alguien que quiere entrar donde
 * no lo llamaron, o ser una bomba de descompresión. Eso es lo que se prueba,
 * además de que la ida y la vuelta no pierdan nada.
 *
 *   node test/test-mano.js
 */
'use strict';
const path = require('path');
const assert = require('assert');
const zlib = require('zlib');

const RAIZ = path.join(__dirname, '..');
global.window = global;
require(path.join(RAIZ, 'js', 'mano.js'));
const { Mano } = global;

let ok = 0, fallos = 0;
function comprobar(que, cond, detalle) {
  if (cond) { ok++; return; }
  fallos++;
  console.log('  FALLA: ' + que + (detalle !== undefined ? '\n         ' + String(detalle).replace(/\n/g, '\n         ') : ''));
}
const seccion = t => console.log('\n' + t);

/* Un SDP de datos como el que hace el navegador, recortado a lo que se mira. */
const SDP = [
  'v=0',
  'o=- 4611731400430051336 2 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'a=group:BUNDLE 0',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'c=IN IP4 0.0.0.0',
  'a=ice-ufrag:4ZcD',
  'a=ice-pwd:2/1muCWoOi3uLifh0NuRHlPy',
  'a=fingerprint:sha-256 AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89',
  'a=setup:actpass',
  'a=mid:0',
  'a=sctp-port:5000',
  ''
].join('\n');

const SDP_CON_VIDEO = SDP.replace('m=application 9 UDP/DTLS/SCTP webrtc-datachannel',
  'm=application 9 UDP/DTLS/SCTP webrtc-datachannel\nm=video 9 UDP/TLS/RTP/SAVPF 96');

/* Node 22 trae CompressionStream, que es lo mismo que usa el navegador. */
const AHORA = 1700000000000;
const invita = extra => Object.assign({
  rol: 'i', sala: 'esle2-abc123', secreto: 'S'.repeat(43),
  intento: 'intento01', vence: AHORA + 60000, sdp: SDP
}, extra || {});
const responde = extra => Object.assign({
  rol: 'r', sala: 'esle2-abc123', intento: 'intento01', vence: AHORA + 60000, sdp: SDP
}, extra || {});

(async () => {
  /* ------------------------------------------------------------------ */
  seccion('Ida y vuelta');
  {
    const codigo = await Mano.armar(invita());
    comprobar('la invitación se arma', typeof codigo === 'string' && codigo.length > 40);
    comprobar('y se reconoce de lejos que es de ESLE2', codigo.startsWith('ESLE2-1-'));
    comprobar('y no tiene nada que se rompa al copiar y pegar',
      /^[A-Za-z0-9_-]+$/.test(codigo.slice(Mano.PREFIJO.length)), codigo.slice(0, 60));

    const leida = await Mano.leer(codigo);
    comprobar('se vuelve a leer', leida.ok, leida.error);
    comprobar('con la sala', leida.ok && leida.paquete.sala === 'esle2-abc123');
    comprobar('con la clave de la sala', leida.ok && leida.paquete.secreto === 'S'.repeat(43));
    comprobar('con el intento', leida.ok && leida.paquete.intento === 'intento01');
    comprobar('y con el SDP entero', leida.ok && leida.paquete.sdp === SDP);

    /* El código es grande: no se puede prometer que se dicte por teléfono. */
    comprobar('y entra en un mensaje, aunque no en un dictado',
      codigo.length < 4000, codigo.length + ' caracteres');

    const r = await Mano.leer(await Mano.armar(responde()));
    comprobar('la respuesta también', r.ok, r.error);
    comprobar('y no lleva la clave de la sala: quien responde ya la tiene',
      r.ok && r.paquete.secreto === undefined);
  }

  /* ------------------------------------------------------------------ */
  seccion('Copiado a mano, que es como va a pasar');
  {
    const codigo = await Mano.armar(invita());
    comprobar('con un salto de línea en el medio sigue sirviendo',
      (await Mano.leer(codigo.slice(0, 30) + '\n' + codigo.slice(30))).ok);
    comprobar('con espacios adelante y atrás también',
      (await Mano.leer('  ' + codigo + '\n\n')).ok);
    comprobar('cortado por la mitad no',
      (await Mano.leer(codigo.slice(0, codigo.length - 12))).error !== undefined);
    comprobar('con una letra cambiada tampoco',
      (await Mano.leer(codigo.slice(0, -1) + (codigo.slice(-1) === 'A' ? 'B' : 'A'))).ok !== true);
  }

  /* ------------------------------------------------------------------ */
  seccion('Lo que pegó alguien y no es esto');
  {
    const mal = async (que, texto, error) => {
      const r = await Mano.leer(texto);
      comprobar(que, !r.ok && r.error === error, r.error + ' / ' + (r.mensaje || ''));
    };
    await mal('vacío', '', 'formato');
    await mal('un hola', 'hola', 'formato');
    await mal('un enlace de la sala con relevo', 'https://esle2.vercel.app/#juntos=a.b', 'formato');
    await mal('algo que no es texto', 12345, 'formato');
    await mal('de otra versión de ESLE2 se dice distinto', 'ESLE2-9-abcdef', 'version');
    await mal('con el prefijo y basura atrás', 'ESLE2-1-!!!!!', 'roto');
    await mal('con el prefijo y base64 que no es gzip', 'ESLE2-1-aGVsbG8', 'roto');
    await mal('enorme ni se mira', 'ESLE2-1-' + 'a'.repeat(Mano.LIMITES.texto), 'grande');

    comprobar('y cada error dice algo que un chico entienda',
      Object.values(Mano.MENSAJES).every(m => typeof m === 'string' && m.length > 20 && /\.$/.test(m)));
  }

  /* ------------------------------------------------------------------ */
  seccion('Armado a mano por alguien que sabe');
  {
    /* Se arma el paquete de cero, como lo haría alguien que leyó el código
       fuente. Es el caso que importa: el formato es público. */
    const envolver = async p => Mano.PREFIJO
      + Mano.enBase64url(new Uint8Array(zlib.gzipSync(Buffer.from(JSON.stringify(p), 'utf8'))));
    const base = () => ({
      f: 'esle2-mano', v: 1, r: 'i', sala: 'esle2-abc123',
      secreto: 'S'.repeat(43), intento: 'intento01', vence: AHORA + 60000, sdp: SDP
    });
    const mal = async (que, cambio, error) => {
      const p = base();
      cambio(p);
      const r = await Mano.leer(await envolver(p));
      comprobar(que, !r.ok && (error === undefined || r.error === error), r.error);
    };

    comprobar('el paquete honesto pasa', (await Mano.leer(await envolver(base()))).ok);

    await mal('otro formato no', p => { p.f = 'otro'; }, 'campos');
    await mal('otra versión no', p => { p.v = 2; }, 'version');
    await mal('un rol inventado no', p => { p.r = 'x'; }, 'campos');
    await mal('una sala con barras no', p => { p.sala = 'a/b'; }, 'campos');
    await mal('una sala con invisibles tampoco', p => { p.sala = 'esle2-a​bc'; }, 'campos');
    await mal('una sala enorme no', p => { p.sala = 'a'.repeat(200); }, 'campos');
    await mal('sin vencimiento no', p => { delete p.vence; }, 'campos');
    await mal('con un vencimiento que no es número no', p => { p.vence = '9999'; }, 'campos');
    await mal('una lista en vez de un objeto no', p => { p.sdp = [SDP]; }, 'sdp');
    await mal('una respuesta con clave adentro no', p => { p.r = 'r'; }, 'campos');
    await mal('una invitación sin clave no', p => { delete p.secreto; }, 'campos');

    /* Lo que más importa de todo: nada de cámara ni de micrófono. */
    await mal('un SDP que pide video no', p => { p.sdp = SDP_CON_VIDEO; }, 'sdp');
    await mal('un SDP sin fingerprint tampoco',
      p => { p.sdp = SDP.replace(/a=fingerprint:.*\n/, ''); }, 'sdp');
    await mal('un SDP vacío tampoco', p => { p.sdp = ''; }, 'sdp');
    await mal('un SDP enorme tampoco',
      p => { p.sdp = SDP + '\na=x:' + 'y'.repeat(Mano.LIMITES.sdp); }, 'sdp');
    await mal('un SDP con caracteres de control tampoco',
      p => { p.sdp = SDP.replace('a=mid:0', 'a=mid:0\u0007'); }, 'sdp');

    /* Una bomba: poco comprimido, enorme adentro. */
    {
      const bomba = Mano.PREFIJO + Mano.enBase64url(
        new Uint8Array(zlib.gzipSync(Buffer.alloc(50 * 1024 * 1024, 32))));
      const r = await Mano.leer(bomba);
      comprobar('una bomba de descompresión se corta en el medio',
        !r.ok && r.error === 'grande', r.error);
    }
  }

  /* ------------------------------------------------------------------ */
  seccion('Que la respuesta sea a MI invitación');
  {
    const i = Mano.limpiar({
      f: 'esle2-mano', v: 1, r: 'i', sala: 'esle2-abc123', secreto: 'S'.repeat(43),
      intento: 'intento01', vence: AHORA + 60000, sdp: SDP
    });
    const r = p => Mano.limpiar(Object.assign({
      f: 'esle2-mano', v: 1, r: 'r', sala: 'esle2-abc123',
      intento: 'intento01', vence: AHORA + 60000, sdp: SDP
    }, p || {}));

    comprobar('la respuesta a esta invitación sí', Mano.contesta(i, r()));
    comprobar('la de otra sala no', !Mano.contesta(i, r({ sala: 'esle2-otra' })));
    comprobar('la de otro intento de la misma sala tampoco',
      !Mano.contesta(i, r({ intento: 'intento02' })));
    comprobar('otra invitación no es una respuesta', !Mano.contesta(i, i));
    comprobar('y una respuesta no invita a nada', !Mano.contesta(r(), r()));
    comprobar('sin nada no rompe', !Mano.contesta(null, r()) && !Mano.contesta(i, null));

    comprobar('un código vivo está vivo', Mano.vigente(i, AHORA));
    comprobar('uno de ayer no', !Mano.vigente(i, AHORA + 120000));
    comprobar('uno que dice que vence el año que viene no se acepta',
      !Mano.vidaSana(Mano.limpiar(Object.assign({}, i, { vence: AHORA + 400 * 86400000 })), AHORA));
    comprobar('y uno de diez minutos sí', Mano.vidaSana(i, AHORA));

    comprobar('cada intento es distinto', Mano.nuevoIntento() !== Mano.nuevoIntento());
    comprobar('y no trae nada raro para pegar en un código',
      /^[A-Za-z0-9_-]+$/.test(Mano.nuevoIntento()), Mano.nuevoIntento());
  }

  console.log(`\n${ok} verificaciones correctas, ${fallos} fallos.`);
  assert.strictEqual(fallos, 0, 'el código a mano tiene fallos');
})();

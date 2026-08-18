/**
 * La sala donde dos navegadores se presentan.
 *
 * WebRTC no sabe encontrar al otro por sí solo: hace falta un sitio por el que
 * intercambiar la oferta, la respuesta y las candidatas ICE. Eso es todo lo que
 * hace este fichero, y en cuanto los dos se han dado la mano, **la partida deja
 * de pasar por aquí**.
 *
 * Y es la única razón por la que el multijugador cabe en el plan gratis. Pasar
 * la partida entera por Realtime son unos 864 000 mensajes por hora, contra los
 * 2 millones al mes que hay: dos horas y pico de juego al mes. Presentarse son
 * unas decenas de mensajes por partida.
 *
 * ## La sala es privada de verdad
 *
 * El canal se abre con `private: true` y hay una política en `realtime.messages`
 * que solo deja entrar al anfitrión y a los miembros de esa partida. Sin eso,
 * bastaría con saber el id de una partida para colarse en la sala y acabar
 * recibiendo el mundo — porque el mundo se manda a quien complete el saludo.
 * Quien decide es el servidor, no un id difícil de adivinar.
 */

import { nube } from '../nube/cliente';

/** Lo que se manda por la sala. Nada de esto es partida: es presentarse. */
export type Recado =
  | { que: 'oferta'; de: string; sdp: string }
  | { que: 'respuesta'; de: string; para: string; sdp: string }
  | { que: 'ice'; de: string; para: string; candidata: string }
  | { que: 'adios'; de: string };

export interface Sala {
  /** Quién soy en esta sala. Se genera al entrar y no se repite. */
  readonly yo: string;
  mandar(recado: Recado): Promise<void>;
  cerrar(): Promise<void>;
}

export function nombreDeSala(idPartida: string): string {
  return `sala:${idPartida}`;
}

/**
 * Entra en la sala de una partida.
 *
 * `alRecado` recibe todo lo que digan los demás. Lo propio no vuelve: Realtime
 * no se hace eco de uno mismo con `self: false`, que es lo que evita tener que
 * filtrarse a mano en cada sitio.
 */
export async function entrarEnSala(
  idPartida: string,
  alRecado: (r: Recado) => void,
): Promise<Sala> {
  const sb = await nube();
  const { data: sesion } = await sb.auth.getSession();
  if (!sesion.session) {
    throw new Error('Hay que entrar con una cuenta para jugar acompañado');
  }

  // Un identificador por pestaña, no por usuario: la misma persona puede tener
  // dos ventanas abiertas y son dos participantes distintos.
  const yo = `${sesion.session.user.id.slice(0, 8)}-${Math.random().toString(36).slice(2, 8)}`;

  const canal = sb.channel(nombreDeSala(idPartida), {
    config: { private: true, broadcast: { self: false } },
  });

  canal.on('broadcast', { event: 'recado' }, (msg) => {
    const r = msg['payload'] as Recado | undefined;
    // Lo de la sala viene de otro navegador: se comprueba antes de creérselo.
    if (r && typeof r === 'object' && typeof r.que === 'string' && typeof r.de === 'string') {
      alRecado(r);
    }
  });

  await new Promise<void>((listo, mal) => {
    // Sin tope, un fallo de permisos dejaría la pantalla esperando para siempre.
    const reloj = setTimeout(() => mal(new Error('La sala no responde')), 15000);
    canal.subscribe((estado, error) => {
      if (estado === 'SUBSCRIBED') {
        clearTimeout(reloj);
        listo();
      } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
        clearTimeout(reloj);
        mal(new Error(error?.message ?? 'No se ha podido entrar en la sala'));
      }
    });
  });

  return {
    yo,
    async mandar(recado: Recado): Promise<void> {
      await canal.send({ type: 'broadcast', event: 'recado', payload: recado });
    },
    async cerrar(): Promise<void> {
      try {
        await canal.send({ type: 'broadcast', event: 'recado', payload: { que: 'adios', de: yo } });
      } catch {
        /* si ya no hay canal, tampoco hay a quién despedirse */
      }
      await sb.removeChannel(canal);
    },
  };
}

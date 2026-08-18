/**
 * `SaveAdapter` contra Supabase.
 *
 * Cumple exactamente el mismo contrato que el de IndexedDB —cuatro métodos, el
 * mundo como `Uint8Array` opaco— así que el motor no se entera de nada. Para eso
 * se escribió `SaveAdapter` en la fase 4.
 *
 * El reparto: la **ficha** va a la tabla `juego.partidas` y el **mundo** a un
 * blob en Storage. Así el menú se pinta con una consulta pequeña en vez de
 * bajarse 129 KB por cada mundo de la lista.
 */

import type { MetaMundo, SaveAdapter } from '../world/almacen';
import { BUCKET, nube, rutaMundo } from './cliente';

/** Una fila de `juego.partidas`. */
interface FilaPartida {
  id: string;
  nombre: string;
  semilla: string;
  ancho: number;
  alto: number;
  version_formato: number;
  version_juego: string;
  hardcore: boolean;
  caido: boolean;
  jugado: number;
  bytes: number;
  creado: string;
  actualizado: string;
}

const CAMPOS =
  'id,nombre,semilla,ancho,alto,version_formato,version_juego,hardcore,caido,jugado,bytes,creado,actualizado';

function aMeta(f: FilaPartida): MetaMundo {
  return {
    id: f.id,
    nombre: f.nombre,
    semilla: f.semilla,
    ancho: f.ancho,
    alto: f.alto,
    creado: Date.parse(f.creado),
    modificado: Date.parse(f.actualizado),
    jugado: Number(f.jugado),
    bytes: f.bytes,
    version: f.version_formato,
    versionJuego: f.version_juego,
    hardcore: f.hardcore,
    caido: f.caido,
  };
}

/**
 * El tope que acepta el bucket. Se comprueba también aquí para poder decir qué
 * pasa: si solo lo parara el servidor, el jugador vería un error de red.
 */
export const TOPE_BYTES = 2 * 1024 * 1024;

export class AlmacenNube implements SaveAdapter {
  async listar(): Promise<MetaMundo[]> {
    const sb = await nube();
    const { data, error } = await sb
      .from('partidas')
      .select(CAMPOS)
      .order('actualizado', { ascending: false });
    if (error) throw new Error(`No se ha podido leer la lista de partidas: ${error.message}`);
    return (data as FilaPartida[]).map(aMeta);
  }

  async cargar(id: string): Promise<Uint8Array> {
    const sb = await nube();
    const { data, error } = await sb.storage.from(BUCKET).download(rutaMundo(id));
    if (error) throw new Error(`No se ha podido descargar el mundo: ${error.message}`);
    return new Uint8Array(await data.arrayBuffer());
  }

  /**
   * Guarda ficha y mundo.
   *
   * **El blob primero y la ficha después**, y el orden importa: la ficha lleva
   * `actualizado`, que es con lo que se decide si lo de la nube es más nuevo que
   * lo del disco. Si se escribiera antes y fallara la subida, la ficha diría que
   * hay algo más nuevo arriba que en realidad no está, y el jugador acabaría
   * descartando progreso bueno a cambio de nada.
   */
  async guardar(id: string, meta: MetaMundo, datos: Uint8Array): Promise<void> {
    if (datos.length > TOPE_BYTES) {
      throw new Error(
        `Esta partida ocupa ${Math.round(datos.length / 1024)} KB y el tope son ` +
          `${Math.round(TOPE_BYTES / 1024)} KB`,
      );
    }
    const sb = await nube();
    const { data: sesion } = await sb.auth.getSession();
    const yo = sesion.session?.user.id;
    if (!yo) throw new Error('Hay que entrar con una cuenta para guardar en la nube');

    const { error: errorBlob } = await sb.storage
      .from(BUCKET)
      .upload(rutaMundo(id), new Blob([datos as BlobPart], { type: 'application/octet-stream' }), {
        upsert: true,
        contentType: 'application/octet-stream',
      });
    if (errorBlob) throw new Error(`No se ha podido subir el mundo: ${errorBlob.message}`);

    const fila = {
      id,
      propietario: yo,
      nombre: meta.nombre,
      semilla: meta.semilla,
      ancho: meta.ancho,
      alto: meta.alto,
      version_formato: meta.version,
      version_juego: meta.versionJuego ?? '',
      hardcore: meta.hardcore ?? false,
      caido: meta.caido ?? false,
      jugado: meta.jugado,
      bytes: datos.length,
    };
    // `upsert` porque guardar es lo mismo la primera vez y la número mil. El RLS
    // se encarga de que un `update` sobre la partida de otro no cuele.
    const { error } = await sb.from('partidas').upsert(fila, { onConflict: 'id' });
    if (error) throw new Error(`No se ha podido guardar la partida: ${error.message}`);
  }

  /**
   * Borra mundo y ficha, **en ese orden**.
   *
   * El blob va antes porque es el que no se puede borrar solo: Supabase prohíbe
   * el `delete` directo sobre las tablas de Storage, así que no hay trigger que
   * lo limpie por detrás (se intentó, y hacía imposible borrar la partida; está
   * contado en `docs/NUBE-ESQUEMA.md`).
   *
   * Si el borrado del blob falla se sigue igualmente: quedarse con un fichero
   * huérfano de unos kilobytes es mucho mejor que quedarse con una partida que
   * no se deja borrar.
   */
  async borrar(id: string): Promise<void> {
    const sb = await nube();
    const { error: errorBlob } = await sb.storage.from(BUCKET).remove([rutaMundo(id)]);
    if (errorBlob) {
      console.warn('No se ha podido borrar el mundo de Storage, queda huérfano:', errorBlob.message);
    }
    const { error } = await sb.from('partidas').delete().eq('id', id);
    if (error) throw new Error(`No se ha podido borrar la partida: ${error.message}`);
  }

  // --- Lo que el adaptador local no tiene -----------------------------------

  /** Un código de 8 caracteres para que entre alguien. */
  async invitar(idPartida: string, usos = 5): Promise<string> {
    const sb = await nube();
    const { data, error } = await sb.rpc('crear_invitacion', {
      p_partida: idPartida,
      p_usos: usos,
    });
    if (error) throw new Error(`No se ha podido crear la invitación: ${error.message}`);
    return data as string;
  }

  /** Canjea un código. Devuelve la partida a la que da acceso. */
  async canjear(codigo: string): Promise<string> {
    const sb = await nube();
    const { data, error } = await sb.rpc('canjear', {
      p_codigo: codigo.trim().toUpperCase(),
    });
    // El servidor ya distingue "no vale" de "no has entrado", y los dos mensajes
    // son para leerlos tal cual.
    if (error) throw new Error(error.message);
    return data as string;
  }

  /** Si esta partida es mía o solo estoy invitado. Manda quién puede guardar. */
  async soyElAnfitrion(idPartida: string): Promise<boolean> {
    const sb = await nube();
    const { data: sesion } = await sb.auth.getSession();
    const yo = sesion.session?.user.id;
    if (!yo) return false;
    const { data, error } = await sb
      .from('partidas')
      .select('propietario')
      .eq('id', idPartida)
      .maybeSingle();
    if (error || !data) return false;
    return (data as { propietario: string }).propietario === yo;
  }
}

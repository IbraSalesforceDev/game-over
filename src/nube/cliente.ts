/**
 * La conexión con Supabase.
 *
 * Todo lo de la nube entra por aquí, y entra **tarde**: el cliente se importa
 * de forma dinámica la primera vez que alguien lo pide. Quien juegue en local
 * no descarga ni un byte de esto, que es lo que permite meter la única
 * dependencia de runtime del proyecto sin castigar a quien no la usa.
 *
 * La clave publicable va en el código a propósito: está diseñada para ir en el
 * navegador. Lo que protege las partidas es el RLS del servidor
 * (ver `docs/NUBE-ESQUEMA.md`), no esconder una cadena que el navegador tiene
 * que enseñar de todas formas. La que no puede salir nunca del panel es la
 * `service_role`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * El cliente, con el esquema del juego fijado en el tipo.
 *
 * Sin esto, `SupabaseClient` da por hecho `public` y `from('partidas')` no
 * compila: las tablas del juego viven en `juego`.
 */
export type ClienteNube = SupabaseClient<any, any, typeof ESQUEMA>;

/** Proyecto `GameOver`. Se puede sobreescribir al desplegar. */
export const URL_NUBE =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://aazwkoccddlmscgdcwpy.supabase.co';

export const CLAVE_NUBE =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'sb_publishable_jTgrZwrh9irWoVhpqLV0CQ_DzRBd4ak';

/** El esquema del juego. No es `public`: ver `docs/NUBE-ESQUEMA.md`. */
export const ESQUEMA = 'juego';

/** El bucket donde vive el mundo de verdad. */
export const BUCKET = 'mundos';

/** La ruta del blob de una partida. La primera carpeta es de dónde sale el RLS. */
export function rutaMundo(idPartida: string): string {
  return `${idPartida}/mundo.bin`;
}

let cliente: ClienteNube | null = null;
let cargando: Promise<ClienteNube> | null = null;

/**
 * El cliente, creado una sola vez.
 *
 * Devuelve siempre la misma instancia: dos clientes serían dos sesiones
 * intentando refrescar el mismo token, que es la forma más rápida de que a
 * alguien lo echen a mitad de partida.
 */
export async function nube(): Promise<ClienteNube> {
  if (cliente) return cliente;
  if (cargando) return cargando;

  cargando = import('@supabase/supabase-js').then(({ createClient }) => {
    const nuevo: ClienteNube = createClient(URL_NUBE, CLAVE_NUBE, {
      db: { schema: ESQUEMA },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // El juego no vuelve de ningún redirect con la sesión en la URL
        // mientras se entre con correo y contraseña. Cuando se añada Discord
        // habrá que ponerlo a true.
        detectSessionInUrl: false,
      },
    });
    cliente = nuevo;
    return nuevo;
  });

  return cargando;
}

/** Solo para los tests. */
export function olvidarCliente(): void {
  cliente = null;
  cargando = null;
}

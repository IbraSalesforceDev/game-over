/**
 * Worker que empaqueta la partida.
 *
 * El RLE y el deflate de un mundo cuestan entre 36 ms (pequeño) y 259 ms
 * (titánico) medidos. En el hilo principal eso es una congelación cada treinta
 * segundos: quince frames perdidos en un mundo titánico, justo mientras se está
 * jugando. Aquí no molesta a nadie.
 *
 * El worker no sabe nada del juego: recibe cuatro TypedArrays y un estado, y
 * devuelve bytes. Toda la lógica del formato sigue viviendo en `save.ts`, que es
 * donde se puede testear sin montar un worker.
 */

import { empaquetar, type CapasMundo, type EstadoPartida } from './save';

export interface PeticionEmpaquetado {
  /** Para casar la respuesta con quien la pidió. */
  id: number;
  capas: CapasMundo;
  estado: EstadoPartida;
}

export type RespuestaEmpaquetado =
  | { id: number; ok: true; bytes: Uint8Array }
  | { id: number; ok: false; error: string };

self.onmessage = (e: MessageEvent<PeticionEmpaquetado>) => {
  const { id, capas, estado } = e.data;
  empaquetar(capas, estado).then(
    (bytes) => {
      const respuesta: RespuestaEmpaquetado = { id, ok: true, bytes };
      // El buffer se transfiere: ya no hace falta aquí y así no se copia otra vez.
      (self as unknown as Worker).postMessage(respuesta, [bytes.buffer]);
    },
    (error: unknown) => {
      const respuesta: RespuestaEmpaquetado = {
        id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
      (self as unknown as Worker).postMessage(respuesta);
    },
  );
};

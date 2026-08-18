/**
 * Empaquetar la partida sin congelar el juego.
 *
 * `empaquetar()` de `save.ts` hace el trabajo, pero lo hace donde se le llame:
 * en el hilo principal son entre 36 y 259 ms de tirón cada vez que se guarda.
 * Esto lo manda a un worker y deja el bucle corriendo.
 *
 * Si no hay workers —un navegador viejo, o los tests, que corren en Node— se
 * empaqueta aquí mismo. El juego no se entera: la promesa es la misma y el
 * resultado, byte a byte, también.
 */

import { empaquetar, type CapasMundo, type EstadoPartida } from './save';
import type { PeticionEmpaquetado, RespuestaEmpaquetado } from './empaquetar.worker';

/** Copia de las capas, para no mandarle al worker las del mundo que se juega. */
function copiarCapas(mundo: CapasMundo): CapasMundo {
  return {
    ancho: mundo.ancho,
    alto: mundo.alto,
    tileId: new Uint16Array(mundo.tileId),
    wallId: new Uint16Array(mundo.wallId),
    flags: new Uint8Array(mundo.flags),
    liquido: new Uint8Array(mundo.liquido),
  };
}

let worker: Worker | null = null;
let sinWorker = false;
let siguienteId = 1;

/** Peticiones en vuelo, por id. */
const enEspera = new Map<
  number,
  { resolver: (bytes: Uint8Array) => void; rechazar: (e: Error) => void }
>();

function arrancarWorker(): Worker | null {
  if (worker) return worker;
  if (sinWorker || typeof Worker === 'undefined') return null;
  try {
    worker = new Worker(new URL('./empaquetar.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (e: MessageEvent<RespuestaEmpaquetado>) => {
      const pendiente = enEspera.get(e.data.id);
      if (!pendiente) return;
      enEspera.delete(e.data.id);
      if (e.data.ok) pendiente.resolver(e.data.bytes);
      else pendiente.rechazar(new Error(e.data.error));
    };
    // Si el worker se cae, no se pierde el guardado: se contesta a todos los que
    // estaban esperando y a partir de ahí se empaqueta en el hilo principal.
    worker.onerror = () => {
      rendirse();
    };
    return worker;
  } catch {
    sinWorker = true;
    return null;
  }
}

function rendirse(): void {
  sinWorker = true;
  worker?.terminate();
  worker = null;
  for (const [, pendiente] of enEspera) {
    pendiente.rechazar(new Error('El worker de guardado se ha caído'));
  }
  enEspera.clear();
}

/**
 * Empaqueta en un worker si se puede, y aquí mismo si no.
 *
 * Copiar las capas cuesta un `memcpy` —4 MB en un mundo pequeño, 50 MB en un
 * titánico—, que es muchísimo menos que comprimirlas. La copia hace falta
 * porque el mundo se sigue jugando mientras se guarda: transferir los originales
 * los dejaría vacíos a mitad de partida.
 */
export async function empaquetarFuera(
  mundo: CapasMundo,
  estado: EstadoPartida,
): Promise<Uint8Array> {
  const w = arrancarWorker();
  if (!w) return empaquetar(mundo, estado);

  const capas = copiarCapas(mundo);
  const id = siguienteId++;
  const peticion: PeticionEmpaquetado = { id, capas, estado };

  try {
    return await new Promise<Uint8Array>((resolver, rechazar) => {
      enEspera.set(id, { resolver, rechazar });
      w.postMessage(peticion, [
        capas.tileId.buffer,
        capas.wallId.buffer,
        capas.flags.buffer,
        capas.liquido.buffer,
      ]);
    });
  } catch (e) {
    // Un worker que falla no puede costar una partida: se reintenta aquí.
    console.warn('Empaquetado en worker fallido, se hace en el hilo principal:', e);
    rendirse();
    return empaquetar(mundo, estado);
  }
}

/** Solo para los tests: devuelve el módulo a su estado inicial. */
export function reiniciarEmpaquetador(): void {
  worker?.terminate();
  worker = null;
  sinWorker = false;
  enEspera.clear();
}

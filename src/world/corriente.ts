import {
  BATERIA,
  BOMBILLA,
  BOMBILLA_ENCENDIDA,
  CABLE,
  INTERRUPTOR,
  INTERRUPTOR_ENCENDIDO,
} from './tiles';
import type { Mundo } from './world';

/**
 * La instalación eléctrica improvisada.
 *
 * Una batería empuja corriente por el cable que la toca, la corriente se gasta
 * un poco por cada tile que recorre, y toda bombilla a la que le llegue algo se
 * enciende. Es la misma idea que la luz —una inundación con caída— pero por el
 * grafo del cableado en vez de por el aire, y esa diferencia es toda la gracia:
 * la luz llega hasta donde llega, y la corriente llega hasta donde tú la lleves.
 *
 * El alcance limitado no es una limitación técnica sino la regla del juego. Sin
 * él, una batería en la superficie alumbraría la mina entera y la instalación se
 * resolvería la primera vez y para siempre; con él, iluminar un sitio grande
 * pide repartir baterías por el camino, que es lo que convierte el cableado en
 * algo que se planea.
 *
 * El interruptor corta. Un cable que llega a un interruptor apagado no sigue,
 * así que el mismo tendido puede alimentar tres salas y encenderlas por
 * separado. Es la única pieza que hace que valga la pena tender cable en vez de
 * pegar una bombilla a cada batería.
 */

/** Carga con la que sale una batería. */
export const CARGA_BATERIA = 60;
/** Lo que se pierde por cada tile de cable recorrido. */
export const CAIDA_CABLE = 1;
/** Alcance real de una batería, en tiles de cable. */
export const ALCANCE = CARGA_BATERIA / CAIDA_CABLE;

/** Un tile que la simulación ha encendido o apagado. */
export interface Cambio {
  tx: number;
  ty: number;
  antes: number;
  ahora: number;
}

/** ¿La corriente puede atravesar este tile? */
function conduce(id: number): boolean {
  return (
    id === CABLE ||
    id === BOMBILLA ||
    id === BOMBILLA_ENCENDIDA ||
    // El interruptor encendido conduce; el apagado es donde se para todo.
    id === INTERRUPTOR_ENCENDIDO
  );
}

/**
 * Recalcula qué está encendido en un trozo del mundo.
 *
 * Se le da la ventana que interesa —la que se ve, con margen— y no el mundo
 * entero: un mundo titánico son seiscientas mil celdas y recorrerlas para buscar
 * seis baterías costaría más que todo lo demás junto. Que solo se resuelva lo
 * que se ve tiene una consecuencia visible y aceptada: una bombilla muy lejos
 * no cambia de estado hasta que uno se acerca, y como nadie está mirando, nadie
 * lo nota.
 *
 * Devuelve solo los tiles que han cambiado, para que quien llame repinte y
 * rehaga la luz de esos y de ninguno más.
 */
export function resolverCorriente(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
): Cambio[] {
  const x0 = Math.max(0, tx0);
  const y0 = Math.max(0, ty0);
  const x1 = Math.min(mundo.ancho - 1, tx1);
  const y1 = Math.min(mundo.alto - 1, ty1);
  const ancho = x1 - x0 + 1;
  const alto = y1 - y0 + 1;
  if (ancho <= 0 || alto <= 0) return [];

  const carga = new Uint8Array(ancho * alto);
  const cola: number[] = [];

  // Siembra: cada batería empuja hacia sus cuatro lados. La batería no conduce
  // —si lo hiciera, dos baterías pegadas se sumarían— sino que alimenta.
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      if (mundo.getTile(x0 + x, y0 + y) !== BATERIA) continue;
      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
        if (!conduce(mundo.getTile(x0 + nx, y0 + ny))) continue;
        const j = ny * ancho + nx;
        if (carga[j]! >= CARGA_BATERIA) continue;
        carga[j] = CARGA_BATERIA;
        cola.push(j);
      }
    }
  }

  // Y se propaga por el cableado, perdiendo un poco por tile.
  for (let cabeza = 0; cabeza < cola.length; cabeza++) {
    const i = cola[cabeza]!;
    const nivel = carga[i]!;
    if (nivel <= CAIDA_CABLE) continue;
    const x = i % ancho;
    const y = (i / ancho) | 0;
    for (let d = 0; d < 4; d++) {
      const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
      const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
      if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;
      if (!conduce(mundo.getTile(x0 + nx, y0 + ny))) continue;
      const j = ny * ancho + nx;
      const nuevo = nivel - CAIDA_CABLE;
      if (nuevo <= carga[j]!) continue;
      carga[j] = nuevo;
      cola.push(j);
    }
  }

  // Y ahora se mira qué bombilla ha cambiado de estado.
  const cambios: Cambio[] = [];
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const tx = x0 + x;
      const ty = y0 + y;
      const id = mundo.getTile(tx, ty);
      if (id !== BOMBILLA && id !== BOMBILLA_ENCENDIDA) continue;
      const debe = carga[y * ancho + x]! > 0 ? BOMBILLA_ENCENDIDA : BOMBILLA;
      if (debe === id) continue;
      mundo.setTile(tx, ty, debe);
      cambios.push({ tx, ty, antes: id, ahora: debe });
    }
  }
  return cambios;
}

/**
 * Da la vuelta a un interruptor. Devuelve el tile nuevo, o null si ahí no había
 * ninguno.
 */
export function accionarInterruptor(mundo: Mundo, tx: number, ty: number): number | null {
  const id = mundo.getTile(tx, ty);
  if (id !== INTERRUPTOR && id !== INTERRUPTOR_ENCENDIDO) return null;
  const nuevo = id === INTERRUPTOR ? INTERRUPTOR_ENCENDIDO : INTERRUPTOR;
  mundo.setTile(tx, ty, nuevo);
  return nuevo;
}

import { BROTE, cultivoDe, HIERBA, TIERRA_LABRADA, AIRE, esSolido } from './tiles';
import type { Mundo } from './world';

/**
 * Crecimiento de lo plantado.
 *
 * No hay lista de macetas. Cada tick se sortean unos pocos tiles de la zona
 * donde está el jugador y, si toca uno plantado, avanza. Es la misma idea que
 * el tick aleatorio de Minecraft y resuelve tres problemas de golpe: no hay que
 * mantener un registro de qué está sembrado, no hay que recorrer el mundo
 * entero, y el guardado se lleva los cultivos sin enterarse de que existen —la
 * etapa vive en el id del tile.
 *
 * El precio es que un huerto fuera de la pantalla no crece. Es un precio justo:
 * lo que importa es que al volver a casa el trigo esté alto, y volver a casa
 * significa tenerlo delante.
 */

/** Tiles sorteados por tick. */
export const MUESTRAS_POR_TICK = 10;
/** Radio en tiles alrededor del jugador donde se sortea. */
export const RADIO_CULTIVO = 60;
/**
 * Probabilidad de que un cultivo elegido avance de etapa.
 *
 * Con diez muestras por tick sobre un área de 121×121, a un tile concreto le
 * toca una vez cada 1.464 ticks, o sea cada 24 segundos. Con esta probabilidad
 * cada etapa tarda algo más de un minuto y el ciclo entero unos cuatro: lo
 * bastante para que valga la pena irse a hacer otra cosa, y lo bastante poco
 * para que el huerto no sea una inversión a fondo perdido.
 */
export const PROBABILIDAD_CRECER = 0.35;

export interface Crecido {
  tx: number;
  ty: number;
  /** Un brote que se ha convertido en árbol, para que el bucle lo plante. */
  arbol: boolean;
}

/**
 * Un tick de crecimiento. Devuelve lo que ha cambiado, para que el bucle
 * invalide el chunk sin que este módulo sepa nada de render.
 */
export function tickCultivos(
  mundo: Mundo,
  txJugador: number,
  tyJugador: number,
  aleatorio: () => number = Math.random,
): Crecido[] {
  const salida: Crecido[] = [];
  for (let i = 0; i < MUESTRAS_POR_TICK; i++) {
    const tx = txJugador + Math.floor((aleatorio() - 0.5) * RADIO_CULTIVO * 2);
    const ty = tyJugador + Math.floor((aleatorio() - 0.5) * RADIO_CULTIVO * 2);
    if (!mundo.dentro(tx, ty)) continue;
    const id = mundo.getTile(tx, ty);

    const cultivo = cultivoDe(id);
    if (cultivo !== null) {
      if (id >= cultivo.ultima) continue;
      // Sin tierra labrada debajo el cultivo se seca: es lo que hace que la
      // azada sirva para algo y que no se pueda sembrar en cualquier sitio.
      if (mundo.getTile(tx, ty + 1) !== TIERRA_LABRADA) {
        mundo.setTile(tx, ty, AIRE);
        salida.push({ tx, ty, arbol: false });
        continue;
      }
      if (aleatorio() >= PROBABILIDAD_CRECER) continue;
      mundo.setTile(tx, ty, id + 1);
      salida.push({ tx, ty, arbol: false });
      continue;
    }

    if (id === BROTE) {
      if (mundo.getTile(tx, ty + 1) !== HIERBA) {
        mundo.setTile(tx, ty, AIRE);
        salida.push({ tx, ty, arbol: false });
        continue;
      }
      // Un árbol necesita sitio: si hay algo encima, el brote espera en vez de
      // crecer dentro de un techo.
      if (!hayHueco(mundo, tx, ty)) continue;
      if (aleatorio() >= PROBABILIDAD_CRECER) continue;
      mundo.setTile(tx, ty, AIRE);
      salida.push({ tx, ty, arbol: true });
    }
  }
  return salida;
}

/** ¿Cabe un árbol pequeño encima de este brote? */
function hayHueco(mundo: Mundo, tx: number, ty: number): boolean {
  for (let d = 0; d < 8; d++) {
    if (ty - d < 2) return false;
    if (esSolido(mundo.getTile(tx, ty - d))) return false;
  }
  return true;
}

/**
 * ¿Se puede sembrar aquí?
 *
 * Solo sobre tierra labrada y con el hueco libre. Es la única regla, y va aquí
 * y no en `edit.ts` porque sembrar no es colocar un bloque: no se apoya en la
 * cuadrícula, se apoya en el arado.
 */
export function puedeSembrar(mundo: Mundo, tx: number, ty: number): boolean {
  return mundo.getTile(tx, ty) === AIRE && mundo.getTile(tx, ty + 1) === TIERRA_LABRADA;
}

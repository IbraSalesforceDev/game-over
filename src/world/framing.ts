import { AIRE, esPlataforma, esSolido } from './tiles';
import type { Mundo } from './world';

/**
 * Auto-tiling por máscara de vecinos.
 *
 * Cada tile mira a sus cuatro vecinos ortogonales y compone una máscara de 4
 * bits con los lados por los que "conecta". El render usa esa máscara para
 * saber qué bordes están expuestos y dibujar ahí el bisel: sin esto, un macizo
 * de tierra se ve como una cuadrícula en vez de como una masa de tierra.
 */

export const ARRIBA = 1;
export const DERECHA = 2;
export const ABAJO = 4;
export const IZQUIERDA = 8;

/** Número de máscaras distintas (2^4). */
export const MASCARAS = 16;

/**
 * Dos tiles conectan si son de la misma familia: los macizos entre sí y las
 * plataformas entre sí. El aire no conecta con nada.
 */
export function conecta(a: number, b: number): boolean {
  if (a === AIRE || b === AIRE) return false;
  if (esPlataforma(a) || esPlataforma(b)) return esPlataforma(a) && esPlataforma(b);
  return esSolido(a) && esSolido(b);
}

/** Máscara de los lados por los que el tile conecta con sus vecinos. */
export function mascaraTile(mundo: Mundo, tx: number, ty: number): number {
  const id = mundo.getTile(tx, ty);
  if (id === AIRE) return 0;
  let m = 0;
  if (conecta(id, mundo.getTile(tx, ty - 1))) m |= ARRIBA;
  if (conecta(id, mundo.getTile(tx + 1, ty))) m |= DERECHA;
  if (conecta(id, mundo.getTile(tx, ty + 1))) m |= ABAJO;
  if (conecta(id, mundo.getTile(tx - 1, ty))) m |= IZQUIERDA;
  return m;
}

/**
 * Máscara para la capa de paredes. Las paredes solo conectan con paredes, y
 * cualquier pared conecta con cualquier otra: el fondo se ve como una
 * superficie continua.
 */
export function mascaraPared(mundo: Mundo, tx: number, ty: number): number {
  if (mundo.getPared(tx, ty) === AIRE) return 0;
  let m = 0;
  if (mundo.getPared(tx, ty - 1) !== AIRE) m |= ARRIBA;
  if (mundo.getPared(tx + 1, ty) !== AIRE) m |= DERECHA;
  if (mundo.getPared(tx, ty + 1) !== AIRE) m |= ABAJO;
  if (mundo.getPared(tx - 1, ty) !== AIRE) m |= IZQUIERDA;
  return m;
}

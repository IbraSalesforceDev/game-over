import { CUBO, CUBO_AGUA, CUBO_LAVA } from './items';
import type { SimuladorLiquidos } from '../world/liquids';
import { MINIMO } from '../world/liquids';
import { esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';

/**
 * Cubos: recoger y verter líquido.
 *
 * Un cubo lleva una celda entera, ni más ni menos. Que la unidad sea la celda
 * y no un volumen arbitrario es lo que hace que la operación sea reversible:
 * lo que recoges es exactamente lo que vuelves a soltar, y nadie pierde agua
 * por el camino.
 *
 * Recoger admite un poco de holgura —se acepta a partir de media celda— porque
 * exigir una celda perfectamente llena obligaría a perseguir el nivel exacto
 * con el ratón mientras el agua se mueve.
 */

/** Nivel mínimo de una celda para poder llenar el cubo. */
export const MINIMO_RECOGIDA = 128;

/**
 * ¿El cubo haría algo aquí? Es la misma decisión que `usarCubo` pero sin tocar
 * el mundo, para poder pintar el recuadro del puntero antes de que el jugador
 * pulse nada.
 */
export function puedeUsarCubo(mundo: Mundo, objeto: number, tx: number, ty: number): boolean {
  if (!mundo.dentro(tx, ty)) return false;
  if (objeto === CUBO) return mundo.getLiquido(tx, ty) >= MINIMO_RECOGIDA;
  if (objeto !== CUBO_AGUA && objeto !== CUBO_LAVA) return false;
  if (esSolido(mundo.getTile(tx, ty))) return false;
  const actual = mundo.getLiquido(tx, ty);
  return actual <= MINIMO || mundo.esLava(tx, ty) === (objeto === CUBO_LAVA);
}

export type ResultadoCubo =
  | { tipo: 'nada' }
  | { tipo: 'lleno'; objeto: number }
  | { tipo: 'vaciado'; objeto: number };

/**
 * Usa el cubo sobre una celda. No toca el inventario: devuelve en qué se
 * convierte el cubo y quien llama decide cómo cambiarlo de sitio.
 */
export function usarCubo(
  mundo: Mundo,
  sim: SimuladorLiquidos,
  objeto: number,
  tx: number,
  ty: number,
): ResultadoCubo {
  if (!mundo.dentro(tx, ty)) return { tipo: 'nada' };

  if (objeto === CUBO) {
    const nivel = mundo.getLiquido(tx, ty);
    if (nivel < MINIMO_RECOGIDA) return { tipo: 'nada' };
    const lava = mundo.esLava(tx, ty);
    mundo.setLiquido(tx, ty, 0);
    sim.activar(tx, ty);
    return { tipo: 'lleno', objeto: lava ? CUBO_LAVA : CUBO_AGUA };
  }

  if (objeto === CUBO_AGUA || objeto === CUBO_LAVA) {
    // Dentro de un bloque no cabe: el líquido desaparecería en el siguiente
    // paso de la simulación y el cubo se habría gastado para nada.
    if (esSolido(mundo.getTile(tx, ty))) return { tipo: 'nada' };
    const lava = objeto === CUBO_LAVA;
    const actual = mundo.getLiquido(tx, ty);
    // Verter agua sobre lava (o al revés) no mezcla nada: hay que buscar otro
    // sitio.
    if (actual > MINIMO && mundo.esLava(tx, ty) !== lava) return { tipo: 'nada' };
    sim.verter(tx, ty, 255, lava);
    return { tipo: 'vaciado', objeto: CUBO };
  }

  return { tipo: 'nada' };
}

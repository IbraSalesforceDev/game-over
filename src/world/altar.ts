import type { Inventario } from '../items/inventory';
import { defObjeto, GEL, HUESO, LINGOTE_ORO, LINGOTE_PLATA, RELIQUIA } from '../items/items';

/**
 * El altar de la fortaleza.
 *
 * Es el único sitio del juego donde se paga algo sin recibir un objeto a
 * cambio: lo que se recibe es una pelea. Por eso la ofrenda no está pensada
 * como una receta más sino como un resumen de la partida entera —hueso de las
 * cuevas, gel de la superficie, oro y plata del fondo, y una reliquia que solo
 * cae peleando—, de modo que estar en condiciones de pagarla signifique de
 * verdad haber jugado a todo.
 *
 * "Cincuenta lingotes de oro y plata" se reparte mitad y mitad. Cincuenta de
 * cada uno serían dos horas de picar oro puro, y el cuello de botella de una
 * pelea no debería ser la minería.
 */

export const OFRENDA: readonly (readonly [objeto: number, cantidad: number])[] = [
  [HUESO, 5],
  [LINGOTE_ORO, 25],
  [LINGOTE_PLATA, 25],
  [GEL, 100],
  [RELIQUIA, 1],
];

export interface FaltaOfrenda {
  objeto: number;
  /** Cuántas unidades faltan. */
  faltan: number;
}

/** Lo que falta para poder invocar. Vacío significa que ya se puede. */
export function faltaParaOfrenda(inv: Inventario): FaltaOfrenda[] {
  const salida: FaltaOfrenda[] = [];
  for (const [objeto, cantidad] of OFRENDA) {
    const tiene = inv.contar(objeto);
    if (tiene < cantidad) salida.push({ objeto, faltan: cantidad - tiene });
  }
  return salida;
}

export function puedeInvocar(inv: Inventario): boolean {
  return faltaParaOfrenda(inv).length === 0;
}

/**
 * Cobra la ofrenda. Devuelve false y no toca nada si falta algo: cobrar a
 * medias dejaría al jugador sin material y sin jefe, que es la peor de las
 * combinaciones posibles.
 */
export function pagarOfrenda(inv: Inventario): boolean {
  if (!puedeInvocar(inv)) return false;
  for (const [objeto, cantidad] of OFRENDA) {
    let restante = cantidad;
    for (let i = 0; i < inv.ranuras.length && restante > 0; i++) {
      if (inv.ranuras[i]!.objeto !== objeto) continue;
      restante -= inv.sacarDe(i, restante);
    }
  }
  return true;
}

/** Un renglón legible con lo que falta, para el aviso de pantalla. */
export function textoFalta(falta: readonly FaltaOfrenda[]): string {
  return falta.map((f) => `${f.faltan} ${defObjeto(f.objeto).nombre}`).join(', ');
}

import { hay, VERSION_ACTUAL } from '../core/versiones';
import type { Inventario } from '../items/inventory';
import {
  defObjeto,
  GEL,
  HUESO,
  LINGOTE_COBALTO,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  RELIQUIA,
} from '../items/items';

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

export type Ofrenda = readonly (readonly [objeto: number, cantidad: number])[];

/**
 * La ofrenda tal y como se escribió en 4.0.0.
 *
 * Entonces era el resumen honesto de la partida entera. Hoy no: con las
 * armaduras de los hondos, cualquiera que pueda pelear con el guardián lleva
 * los cien geles y los veinticinco oros desde hace rato, y la puerta que se
 * suponía que era el altar se abría sola.
 */
export const OFRENDA_ORIGINAL: Ofrenda = [
  [HUESO, 5],
  [LINGOTE_ORO, 25],
  [LINGOTE_PLATA, 25],
  [GEL, 100],
  [RELIQUIA, 1],
];

/**
 * La ofrenda de 6.8.0.
 *
 * Sube todo un escalón y añade una cosa que antes no pedía: cobalto. Es lo que
 * convierte el altar otra vez en una puerta, porque el cobalto no se recoge
 * paseando —hay que bajar a los hondos, que es donde vive el equipo con el que
 * esta pelea se aguanta—. Las tres reliquias son el otro filtro: caen a tres de
 * cada cien bichos, así que juntarlas es un rato de pelear, no de picar.
 *
 * El gel sigue siendo el número grande y sigue siendo a propósito: es lo único
 * de la lista que se consigue en la superficie y de día, y sin él la ofrenda
 * sería un examen de minería y nada más.
 */
export const OFRENDA_REFORZADA: Ofrenda = [
  [HUESO, 12],
  [LINGOTE_ORO, 30],
  [LINGOTE_PLATA, 30],
  [LINGOTE_COBALTO, 12],
  [GEL, 150],
  [RELIQUIA, 3],
];

/** La que pide el altar en un mundo de esta versión. */
export function ofrendaDe(versionMundo: string = VERSION_ACTUAL): Ofrenda {
  return hay('guardianReforzado', versionMundo) ? OFRENDA_REFORZADA : OFRENDA_ORIGINAL;
}

/** La de hoy, para quien no tenga a mano la versión del mundo. */
export const OFRENDA = OFRENDA_REFORZADA;

export interface FaltaOfrenda {
  objeto: number;
  /** Cuántas unidades faltan. */
  faltan: number;
}

/** Lo que falta para poder invocar. Vacío significa que ya se puede. */
export function faltaParaOfrenda(
  inv: Inventario,
  versionMundo: string = VERSION_ACTUAL,
): FaltaOfrenda[] {
  const salida: FaltaOfrenda[] = [];
  for (const [objeto, cantidad] of ofrendaDe(versionMundo)) {
    const tiene = inv.contar(objeto);
    if (tiene < cantidad) salida.push({ objeto, faltan: cantidad - tiene });
  }
  return salida;
}

export function puedeInvocar(inv: Inventario, versionMundo: string = VERSION_ACTUAL): boolean {
  return faltaParaOfrenda(inv, versionMundo).length === 0;
}

/**
 * Cobra la ofrenda. Devuelve false y no toca nada si falta algo: cobrar a
 * medias dejaría al jugador sin material y sin jefe, que es la peor de las
 * combinaciones posibles.
 */
export function pagarOfrenda(inv: Inventario, versionMundo: string = VERSION_ACTUAL): boolean {
  if (!puedeInvocar(inv, versionMundo)) return false;
  for (const [objeto, cantidad] of ofrendaDe(versionMundo)) {
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

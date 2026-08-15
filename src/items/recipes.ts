import { TILE } from '../core/constants';
import type { Caja } from '../entities/physics';
import { ANTORCHA, COBRE, esEstacion, HIERRO, HORNO, MADERA, MESA, ORO, PIEDRA, PLATA, PLATAFORMA, COFRE, YUNQUE } from '../world/tiles';
import type { Mundo } from '../world/world';
import type { Inventario } from './inventory';
import {
  LINGOTE_COBRE,
  LINGOTE_HIERRO,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  PICO_HIERRO,
  PICO_ORO,
  PICO_PLATA,
} from './items';

/**
 * Recetas de crafteo.
 *
 * Cada receta declara qué consume, qué produce y junto a qué estación hay que
 * estar. `estacion: null` significa que se hace a mano, en cualquier sitio.
 *
 * El orden de la lista es el orden en que se enseñan, así que va de lo básico a
 * lo caro: la primera vez que abres el panel, lo primero que ves es lo que
 * puedes hacer con la madera que acabas de recoger.
 */

export interface Receta {
  /** Identificador estable, por si algún día hay que guardarlas. */
  readonly id: string;
  readonly ingredientes: readonly (readonly [objeto: number, cantidad: number])[];
  readonly resultado: number;
  readonly cantidad: number;
  /** Tile de la estación necesaria, o null si se hace a mano. */
  readonly estacion: number | null;
}

export const RECETAS: readonly Receta[] = [
  // --- A mano ---
  {
    id: 'antorchas',
    ingredientes: [[MADERA, 1]],
    resultado: ANTORCHA,
    cantidad: 3,
    estacion: null,
  },
  {
    id: 'mesa',
    ingredientes: [[MADERA, 10]],
    resultado: MESA,
    cantidad: 1,
    estacion: null,
  },

  // --- Mesa de trabajo ---
  {
    id: 'plataformas',
    ingredientes: [[MADERA, 1]],
    resultado: PLATAFORMA,
    cantidad: 2,
    estacion: MESA,
  },
  {
    id: 'cofre',
    ingredientes: [[MADERA, 8]],
    resultado: COFRE,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'horno',
    ingredientes: [[PIEDRA, 20]],
    resultado: HORNO,
    cantidad: 1,
    estacion: MESA,
  },
  {
    id: 'yunque',
    ingredientes: [[LINGOTE_HIERRO, 5]],
    resultado: YUNQUE,
    cantidad: 1,
    estacion: MESA,
  },

  // --- Horno: fundir mineral ---
  {
    id: 'lingote-cobre',
    ingredientes: [[COBRE, 3]],
    resultado: LINGOTE_COBRE,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-hierro',
    ingredientes: [[HIERRO, 3]],
    resultado: LINGOTE_HIERRO,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-plata',
    ingredientes: [[PLATA, 4]],
    resultado: LINGOTE_PLATA,
    cantidad: 1,
    estacion: HORNO,
  },
  {
    id: 'lingote-oro',
    ingredientes: [[ORO, 4]],
    resultado: LINGOTE_ORO,
    cantidad: 1,
    estacion: HORNO,
  },

  // --- Yunque: herramientas ---
  {
    id: 'pico-hierro',
    ingredientes: [
      [LINGOTE_HIERRO, 12],
      [MADERA, 4],
    ],
    resultado: PICO_HIERRO,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'pico-plata',
    ingredientes: [
      [LINGOTE_PLATA, 12],
      [MADERA, 4],
    ],
    resultado: PICO_PLATA,
    cantidad: 1,
    estacion: YUNQUE,
  },
  {
    id: 'pico-oro',
    ingredientes: [
      [LINGOTE_ORO, 12],
      [MADERA, 4],
    ],
    resultado: PICO_ORO,
    cantidad: 1,
    estacion: YUNQUE,
  },
];

/** Radio, en tiles, dentro del cual una estación cuenta como "cerca". */
export const RADIO_ESTACION = 6;

/**
 * Estaciones al alcance del jugador. Se devuelve un conjunto porque una mesa
 * pegada a un horno habilita las recetas de ambos, que es como funciona en
 * Terraria y como espera cualquiera que monte su taller en una sala.
 */
export function estacionesCerca(mundo: Mundo, caja: Caja): Set<number> {
  const cerca = new Set<number>();
  const cx = Math.floor((caja.x + caja.ancho / 2) / TILE);
  const cy = Math.floor((caja.y + caja.alto / 2) / TILE);
  for (let ty = cy - RADIO_ESTACION; ty <= cy + RADIO_ESTACION; ty++) {
    for (let tx = cx - RADIO_ESTACION; tx <= cx + RADIO_ESTACION; tx++) {
      const id = mundo.getTile(tx, ty);
      if (esEstacion(id)) cerca.add(id);
    }
  }
  return cerca;
}

export function tieneIngredientes(inv: Inventario, receta: Receta): boolean {
  return receta.ingredientes.every(([objeto, n]) => inv.contar(objeto) >= n);
}

export function estacionDisponible(receta: Receta, estaciones: ReadonlySet<number>): boolean {
  return receta.estacion === null || estaciones.has(receta.estacion);
}

export function sePuedeCraftear(
  inv: Inventario,
  receta: Receta,
  estaciones: ReadonlySet<number>,
): boolean {
  return estacionDisponible(receta, estaciones) && tieneIngredientes(inv, receta);
}

/**
 * Recetas cuya estación está disponible. Se enseñan también las que no se
 * pueden pagar todavía, en gris: saber que existe un pico de hierro es lo que
 * te empuja a bajar a por hierro.
 */
export function recetasVisibles(estaciones: ReadonlySet<number>): Receta[] {
  return RECETAS.filter((r) => estacionDisponible(r, estaciones));
}

/**
 * Ejecuta una receta. Devuelve false y no toca nada si falta algo, si no hay
 * estación o si el resultado no cabe: fabricar y perder el resultado sería
 * peor que no fabricar.
 */
export function craftear(
  inv: Inventario,
  receta: Receta,
  estaciones: ReadonlySet<number>,
): boolean {
  if (!sePuedeCraftear(inv, receta, estaciones)) return false;
  if (!inv.cabe(receta.resultado, receta.cantidad)) return false;

  for (const [objeto, n] of receta.ingredientes) {
    let restante = n;
    for (let i = 0; i < inv.ranuras.length && restante > 0; i++) {
      if (inv.ranuras[i]!.objeto !== objeto) continue;
      restante -= inv.sacarDe(i, restante);
    }
  }
  inv.anadir(receta.resultado, receta.cantidad);
  return true;
}

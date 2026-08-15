import {
  ANTORCHA,
  COBRE,
  HIERBA,
  HIERRO,
  HOJAS,
  MADERA,
  ORO,
  PIEDRA,
  PLATA,
  PLATAFORMA,
  TIERRA,
  TILES,
  TRONCO,
} from '../world/tiles';

/**
 * Catálogo de objetos.
 *
 * Los identificadores de los objetos que son bloques coinciden a propósito con
 * los de sus tiles: así colocar es `mundo.setTile(tx, ty, objeto)` sin tabla de
 * traducción de por medio. Las herramientas viven a partir del último tile.
 *
 * Lo que suelta un tile al romperse sí es una tabla aparte, porque no es
 * uno a uno: la hierba suelta tierra, el tronco suelta madera y las hojas no
 * sueltan nada.
 */

export const NADA = 0;

/** Primer id de objeto que no es un tile. */
export const PICO_MADERA = TILES.length; // 13
export const PICO_COBRE = TILES.length + 1;
export const PICO_HIERRO = TILES.length + 2;

export type TipoObjeto = 'bloque' | 'herramienta' | 'material';

export interface DefObjeto {
  readonly nombre: string;
  readonly tipo: TipoObjeto;
  readonly color: string;
  readonly maxPila: number;
  /** Tile que coloca, si es un bloque. */
  readonly tile?: number;
  /** Potencia de picado, si es un pico. */
  readonly potencia?: number;
}

const PILA = 999;

function deTile(id: number, tipo: TipoObjeto = 'bloque'): DefObjeto {
  const t = TILES[id]!;
  return {
    nombre: t.nombre,
    tipo,
    color: t.color,
    maxPila: PILA,
    tile: tipo === 'bloque' ? id : undefined,
  };
}

export const OBJETOS: readonly DefObjeto[] = [
  { nombre: 'nada', tipo: 'material', color: '#000000', maxPila: 0 },
  deTile(TIERRA),
  deTile(HIERBA),
  deTile(PIEDRA),
  deTile(MADERA),
  deTile(PLATAFORMA),
  // Los minerales en bruto no se colocan: son material para la fase de
  // crafteo. Que un lingote sin fundir no sea un bloque es lo que hace que
  // minar tenga sentido más allá de decorar.
  deTile(COBRE, 'material'),
  deTile(HIERRO, 'material'),
  deTile(PLATA, 'material'),
  deTile(ORO, 'material'),
  deTile(TRONCO),
  deTile(HOJAS),
  deTile(ANTORCHA),
  {
    nombre: 'pico de madera',
    tipo: 'herramienta',
    color: '#8a5f33',
    maxPila: 1,
    potencia: 60,
  },
  {
    nombre: 'pico de cobre',
    tipo: 'herramienta',
    color: '#b06a3b',
    maxPila: 1,
    potencia: 100,
  },
  {
    nombre: 'pico de hierro',
    tipo: 'herramienta',
    color: '#a3968a',
    maxPila: 1,
    potencia: 160,
  },
];

export function defObjeto(id: number): DefObjeto {
  return OBJETOS[id] ?? OBJETOS[NADA]!;
}

export function esColocable(id: number): boolean {
  return defObjeto(id).tile !== undefined;
}

export function esHerramienta(id: number): boolean {
  return defObjeto(id).tipo === 'herramienta';
}

export function maxPila(id: number): number {
  return defObjeto(id).maxPila;
}

/** Qué suelta un tile al romperse. NADA si no suelta nada. */
export function dropDeTile(tile: number): number {
  switch (tile) {
    case HIERBA:
      return TIERRA;
    case TRONCO:
      return MADERA;
    case HOJAS:
      return NADA;
    default:
      return tile;
  }
}

/** Qué suelta una pared al picarse. Las paredes vuelven como su bloque. */
export function dropDePared(pared: number): number {
  return dropDeTile(pared);
}

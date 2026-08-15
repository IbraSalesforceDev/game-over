/**
 * Catálogo de tiles. Tabla plana indexada por id: el acceso ocurre miles de
 * veces por frame, así que nada de Map ni de búsquedas por nombre.
 */

export const AIRE = 0;
export const TIERRA = 1;
export const HIERBA = 2;
export const PIEDRA = 3;
export const MADERA = 4;
export const PLATAFORMA = 5;
export const COBRE = 6;
export const HIERRO = 7;
export const PLATA = 8;
export const ORO = 9;
export const TRONCO = 10;
export const HOJAS = 11;
export const ANTORCHA = 12;

/** Minerales, de menos a más profundo. */
export const MINERALES = [COBRE, HIERRO, PLATA, ORO] as const;

export interface DefTile {
  readonly nombre: string;
  /** Bloquea el paso en ambos ejes. */
  readonly solido: boolean;
  /** Plataforma de una dirección: solo frena al caer sobre ella. */
  readonly plataforma: boolean;
  /** Ticks base de picado; lo usará la fase 2. */
  readonly dureza: number;
  /** Color base; el tileset procedural genera variantes a partir de él. */
  readonly color: string;
  /** Luz que emite el tile, en la escala 0-255. 0 = no ilumina. */
  readonly luz?: number;
}

export const TILES: readonly DefTile[] = [
  { nombre: 'aire', solido: false, plataforma: false, dureza: 0, color: '#000000' },
  { nombre: 'tierra', solido: true, plataforma: false, dureza: 20, color: '#6b4b2a' },
  { nombre: 'hierba', solido: true, plataforma: false, dureza: 20, color: '#4c8b3a' },
  { nombre: 'piedra', solido: true, plataforma: false, dureza: 45, color: '#6e6e78' },
  { nombre: 'madera', solido: true, plataforma: false, dureza: 30, color: '#8a5f33' },
  { nombre: 'plataforma', solido: false, plataforma: true, dureza: 15, color: '#a07545' },
  { nombre: 'cobre', solido: true, plataforma: false, dureza: 55, color: '#b06a3b' },
  { nombre: 'hierro', solido: true, plataforma: false, dureza: 70, color: '#a3968a' },
  { nombre: 'plata', solido: true, plataforma: false, dureza: 85, color: '#c2ccd6' },
  { nombre: 'oro', solido: true, plataforma: false, dureza: 100, color: '#dcb13a' },
  // Los árboles no frenan: en Terraria se atraviesan, y así no hay que
  // resolver colisiones absurdas contra una rama.
  { nombre: 'tronco', solido: false, plataforma: false, dureza: 25, color: '#5a4028' },
  { nombre: 'hojas', solido: false, plataforma: false, dureza: 8, color: '#3f7a35' },
  {
    nombre: 'antorcha',
    solido: false,
    plataforma: false,
    dureza: 5,
    color: '#ffb347',
    luz: 235,
  },
];

/** Tile usado fuera de los límites laterales e inferior del mundo. */
export const TILE_BORDE = PIEDRA;

export function defTile(id: number): DefTile {
  return TILES[id] ?? TILES[AIRE]!;
}

/** Bloquea el movimiento en los dos ejes (las plataformas no cuentan). */
export function esSolido(id: number): boolean {
  return defTile(id).solido;
}

export function esPlataforma(id: number): boolean {
  return defTile(id).plataforma;
}

/** Luz que emite el tile, 0 si no ilumina. */
export function emisionLuz(id: number): number {
  return defTile(id).luz ?? 0;
}

/** ¿Este tile tapa el cielo? Un bloque macizo sí; una antorcha o una hoja, no. */
export function tapaCielo(id: number): boolean {
  return esSolido(id) || esPlataforma(id);
}

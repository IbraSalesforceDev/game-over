import {
  ANTORCHA,
  ARENA,
  ARENISCA,
  CACTUS,
  COBRE,
  COFRE,
  HIELO,
  HIERBA,
  NIEVE,
  HIERRO,
  HOJAS,
  HORNO,
  MADERA,
  MESA,
  ORO,
  PIEDRA,
  PLATA,
  PLATAFORMA,
  TIERRA,
  TILES,
  TRONCO,
  YUNQUE,
} from '../world/tiles';

/**
 * Catálogo de objetos.
 *
 * Los objetos que son bloques comparten identificador con su tile, así colocar
 * es `mundo.setTile(tx, ty, objeto)` sin tabla de traducción. Los que no son
 * bloques empiezan en 64, bien lejos del rango de tiles: los ids acaban dentro
 * de partidas guardadas, y si dependieran de cuántos tiles existan, añadir un
 * mueble convertiría los picos de todo el mundo en otra cosa. Ya pasó al llegar
 * la fase 7, y por eso el formato de guardado sube de versión y remapea.
 *
 * Lo que suelta un tile al romperse sí es una tabla aparte, porque no es uno a
 * uno: la hierba suelta tierra, el tronco madera y las hojas nada.
 */

export const NADA = 0;

/** Primer id que no corresponde a un tile. */
export const BASE_NO_TILE = 64;

export const LINGOTE_COBRE = 64;
export const LINGOTE_HIERRO = 65;
export const LINGOTE_PLATA = 66;
export const LINGOTE_ORO = 67;
export const PICO_MADERA = 68;
export const PICO_COBRE = 69;
export const PICO_HIERRO = 70;
export const PICO_PLATA = 71;
export const PICO_ORO = 72;
export const GEL = 73;
export const HUESO = 74;
export const ESPADA_MADERA = 75;
export const ESPADA_COBRE = 76;
export const ESPADA_HIERRO = 77;
export const CUBO = 78;
export const CUBO_AGUA = 79;
export const CUBO_LAVA = 80;
export const PICO_PIEDRA = 81;
export const ESPADA_PIEDRA = 82;
export const CARNE_CRUDA = 83;
export const CARNE_ASADA = 84;
export const BAYAS = 85;

/**
 * Identificadores que tenían las herramientas antes de moverse al rango 64+.
 * Se conserva para poder abrir partidas del formato 3.
 */
export const IDS_ANTIGUOS: Readonly<Record<number, number>> = {
  13: PICO_MADERA,
  14: PICO_COBRE,
  15: PICO_HIERRO,
};

export type TipoObjeto = 'bloque' | 'herramienta' | 'arma' | 'material' | 'cubo' | 'comida';

export interface DefObjeto {
  readonly nombre: string;
  readonly tipo: TipoObjeto;
  readonly color: string;
  readonly maxPila: number;
  /** Tile que coloca, si es un bloque. */
  readonly tile?: number;
  /** Potencia de picado, si es un pico. */
  readonly potencia?: number;
  /** Nivel de la herramienta: qué tiles puede romper. */
  readonly nivel?: number;
  /** Daño por golpe, si es un arma. */
  readonly dano?: number;
  /** Ticks entre golpes, si es un arma. */
  readonly cadencia?: number;
  /** Alcance del golpe en píxeles, si es un arma. */
  readonly alcance?: number;
  /** Hambre que quita, si es comida. */
  readonly saciedad?: number;
  /** Vida que cura al comerla. */
  readonly curacion?: number;
}

const PILA = 999;

function deTile(id: number, tipo: TipoObjeto = 'bloque'): [number, DefObjeto] {
  const t = TILES[id]!;
  return [
    id,
    {
      nombre: t.nombre,
      tipo,
      color: t.color,
      maxPila: PILA,
      tile: tipo === 'bloque' ? id : undefined,
    },
  ];
}

function lingote(id: number, nombre: string, color: string): [number, DefObjeto] {
  return [id, { nombre, tipo: 'material', color, maxPila: PILA }];
}

function pico(
  id: number,
  nombre: string,
  color: string,
  potencia: number,
  nivel: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'herramienta', color, maxPila: 1, potencia, nivel }];
}

function espada(
  id: number,
  nombre: string,
  color: string,
  dano: number,
  cadencia: number,
  alcance: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'arma', color, maxPila: 1, dano, cadencia, alcance }];
}

/**
 * Comida. La cruda sacia poco y no cura: pasar por el horno es lo que hace que
 * el horno siga sirviendo para algo después de fundir el último lingote.
 */
function comida(
  id: number,
  nombre: string,
  color: string,
  saciedad: number,
  curacion: number,
): [number, DefObjeto] {
  return [id, { nombre, tipo: 'comida', color, maxPila: 99, saciedad, curacion }];
}

const ENTRADAS: [number, DefObjeto][] = [
  [NADA, { nombre: 'nada', tipo: 'material', color: '#000000', maxPila: 0 }],
  deTile(TIERRA),
  deTile(HIERBA),
  deTile(PIEDRA),
  deTile(MADERA),
  deTile(PLATAFORMA),
  // Los minerales en bruto no se colocan: hay que fundirlos.
  deTile(COBRE, 'material'),
  deTile(HIERRO, 'material'),
  deTile(PLATA, 'material'),
  deTile(ORO, 'material'),
  deTile(TRONCO),
  deTile(HOJAS),
  deTile(ANTORCHA),
  deTile(MESA),
  deTile(HORNO),
  deTile(YUNQUE),
  deTile(COFRE),
  lingote(LINGOTE_COBRE, 'lingote de cobre', '#c98352'),
  lingote(LINGOTE_HIERRO, 'lingote de hierro', '#b6aca0'),
  lingote(LINGOTE_PLATA, 'lingote de plata', '#d6dee8'),
  lingote(LINGOTE_ORO, 'lingote de oro', '#eec84a'),
  pico(PICO_MADERA, 'pico de madera', '#8a5f33', 55, 1),
  pico(PICO_PIEDRA, 'pico de piedra', '#8d8d97', 85, 2),
  pico(PICO_COBRE, 'pico de cobre', '#b06a3b', 100, 3),
  pico(PICO_HIERRO, 'pico de hierro', '#a3968a', 160, 4),
  pico(PICO_PLATA, 'pico de plata', '#c2ccd6', 220, 5),
  pico(PICO_ORO, 'pico de oro', '#dcb13a', 300, 6),
  lingote(GEL, 'gel', '#79c8e0'),
  lingote(HUESO, 'hueso', '#e2ddcb'),
  // Más daño cuesta más lentitud: una espada de hierro pega fuerte pero se
  // recupera despacio, y eso obliga a medir cuándo entrar.
  espada(ESPADA_MADERA, 'espada de madera', '#8a5f33', 12, 26, 34),
  espada(ESPADA_PIEDRA, 'espada de piedra', '#8d8d97', 15, 27, 36),
  espada(ESPADA_COBRE, 'espada de cobre', '#b06a3b', 18, 28, 38),
  espada(ESPADA_HIERRO, 'espada de hierro', '#a3968a', 26, 32, 42),
  deTile(ARENA),
  deTile(ARENISCA),
  deTile(CACTUS),
  deTile(NIEVE),
  deTile(HIELO),
  // Los cubos no se apilan: llevar diez cubos de agua sería llevar un lago en
  // el bolsillo, y el viaje de ida y vuelta hasta el líquido es justo lo que
  // hace que mover agua cueste algo.
  [CUBO, { nombre: 'cubo vacío', tipo: 'cubo', color: '#9aa4ad', maxPila: 1 }],
  [CUBO_AGUA, { nombre: 'cubo de agua', tipo: 'cubo', color: '#2f6fb5', maxPila: 1 }],
  [CUBO_LAVA, { nombre: 'cubo de lava', tipo: 'cubo', color: '#d84a1b', maxPila: 1 }],
  comida(CARNE_CRUDA, 'carne cruda', '#c2504f', 18, 0),
  comida(CARNE_ASADA, 'carne asada', '#9b5a2c', 42, 14),
  comida(BAYAS, 'bayas', '#c23a5e', 12, 3),
];

/** Array disperso: hay hueco entre el último tile y el 64, y no pasa nada. */
const MAPA: DefObjeto[] = [];
for (const [id, def] of ENTRADAS) MAPA[id] = def;

export const OBJETOS: readonly DefObjeto[] = MAPA;
/** Todos los ids existentes, para recorrer el catálogo sin tropezar con huecos. */
export const IDS_OBJETO: readonly number[] = ENTRADAS.map(([id]) => id);

export function defObjeto(id: number): DefObjeto {
  return MAPA[id] ?? MAPA[NADA]!;
}

export function esColocable(id: number): boolean {
  return defObjeto(id).tile !== undefined;
}

export function esHerramienta(id: number): boolean {
  return defObjeto(id).tipo === 'herramienta';
}

/** Nivel de la herramienta que se lleva. 0 son las manos. */
export function nivelHerramienta(id: number): number {
  return defObjeto(id).nivel ?? 0;
}

/** Picos por nivel, para poder decir en voz alta cuál falta. */
const PICO_DE_NIVEL: readonly number[] = [
  NADA,
  PICO_MADERA,
  PICO_PIEDRA,
  PICO_COBRE,
  PICO_HIERRO,
  PICO_PLATA,
  PICO_ORO,
];

/**
 * Nombre del pico más humilde que rompe un tile de este nivel. Se usa en el
 * aviso al fallar: "necesitas un pico de piedra" enseña el siguiente paso,
 * mientras que un cursor rojo sin más solo dice que algo no va.
 */
export function nombrePicoDeNivel(nivel: number): string {
  const id = PICO_DE_NIVEL[Math.min(nivel, PICO_DE_NIVEL.length - 1)] ?? NADA;
  return id === NADA ? 'un pico' : defObjeto(id).nombre;
}

export function esArma(id: number): boolean {
  return defObjeto(id).tipo === 'arma';
}

export function esCubo(id: number): boolean {
  return defObjeto(id).tipo === 'cubo';
}

export function esComida(id: number): boolean {
  return defObjeto(id).tipo === 'comida';
}

export function maxPila(id: number): number {
  return defObjeto(id).maxPila;
}

/** Traduce un id guardado por una versión anterior del formato. */
export function migrarId(id: number): number {
  return IDS_ANTIGUOS[id] ?? id;
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
    // El cactus se lleva como madera del desierto: sirve para lo mismo.
    case CACTUS:
      return MADERA;
    default:
      return tile;
  }
}

/** Qué suelta una pared al picarse. Las paredes vuelven como su bloque. */
export function dropDePared(pared: number): number {
  return dropDeTile(pared);
}

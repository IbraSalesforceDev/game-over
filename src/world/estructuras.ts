/**
 * Registro de estructuras del mundo.
 *
 * Una fortaleza que solo aparece cavando al azar es una fortaleza que nadie
 * ve. Por eso el generador no se limita a escribirla en los tiles: apunta
 * dónde la ha puesto, y esa lista viaja en el guardado. Con ella la brújula
 * puede señalarla y el mapa puede marcarla, que son las dos formas de
 * encontrar algo enterrado sin tener que picar medio mundo por si acaso.
 *
 * Lo que se guarda es el centro y nada más. Ni el tamaño ni el contenido: el
 * mundo ya lleva escrito tile a tile lo que hay dentro, y duplicarlo aquí solo
 * daría dos versiones de la verdad que podrían discrepar en cuanto alguien
 * picara una pared.
 */

export const FORTALEZA = 0;
export const CABANA = 1;
export const MINA = 2;
// 5.2.0: las cuevas propias del desierto y de la nieve. Cuentan como
// estructura y no como terreno porque tienen dentro un cofre puesto a mano, y
// porque la brújula tiene que poder llevarte a ellas: una caverna de hielo con
// titanio dentro que solo se encuentra por casualidad es una caverna que casi
// nadie verá.
export const CUEVA_DESIERTO = 3;
export const CUEVA_NIEVE = 4;
// 6.2.0: las fortalezas del inframundo. No hay una sino varias, al revés que
// la de la caverna: aquella es el sitio del jefe y por eso es única, y estas
// son puestos avanzados —lo que le da al inframundo algo que buscar además de
// no caerse.
export const FORTALEZA_INFERNAL = 5;

export type TipoEstructura =
  | typeof FORTALEZA
  | typeof CABANA
  | typeof MINA
  | typeof CUEVA_DESIERTO
  | typeof CUEVA_NIEVE
  | typeof FORTALEZA_INFERNAL;

export interface Estructura {
  readonly tipo: TipoEstructura;
  readonly tx: number;
  readonly ty: number;
}

/** Nombre de cada tipo, para la brújula y el mapa. */
export const NOMBRE_ESTRUCTURA: Readonly<Record<number, string>> = {
  [FORTALEZA]: 'Fortaleza',
  [CABANA]: 'Cabaña abandonada',
  [MINA]: 'Mina abandonada',
  [CUEVA_DESIERTO]: 'Cueva de arenisca',
  [CUEVA_NIEVE]: 'Cueva helada',
  [FORTALEZA_INFERNAL]: 'Fortaleza infernal',
};

/** Letra que marca cada tipo en el mapa. Una sola: el mapa es diminuto. */
export const MARCA_ESTRUCTURA: Readonly<Record<number, string>> = {
  [FORTALEZA]: 'F',
  [CABANA]: 'C',
  [MINA]: 'M',
  [CUEVA_DESIERTO]: 'A',
  [CUEVA_NIEVE]: 'H',
  [FORTALEZA_INFERNAL]: 'I',
};

/** Color del marcador de cada tipo. */
export const COLOR_ESTRUCTURA: Readonly<Record<number, string>> = {
  [FORTALEZA]: '#c88ae8',
  [CABANA]: '#e8c06a',
  [MINA]: '#8fd0e8',
  [CUEVA_DESIERTO]: '#e8c88a',
  [CUEVA_NIEVE]: '#a8e0f0',
  [FORTALEZA_INFERNAL]: '#ff7a3a',
};

/**
 * Radio en tiles dentro del cual se considera que estás "en" cada estructura.
 *
 * Se guarda aquí y no en el generador porque lo necesita la partida, que no
 * vuelve a generar nada: solo tiene la lista de centros. Son radios generosos a
 * propósito —una fortaleza mide sesenta y siete columnas y cuarenta y seis
 * filas— porque el efecto que producen es "aquí dentro sale más cosa", y que
 * empiece un par de tiles antes de cruzar la puerta no se nota; que empiece un
 * par de tiles después, sí.
 */
export const RADIO_ESTRUCTURA: Readonly<Record<number, number>> = {
  [FORTALEZA]: 46,
  [CABANA]: 0,
  [MINA]: 42,
  [CUEVA_DESIERTO]: 24,
  [CUEVA_NIEVE]: 24,
  [FORTALEZA_INFERNAL]: 40,
};

/**
 * ¿Dentro de qué estructura está este punto? Devuelve el tipo, o null.
 *
 * Las cabañas no cuentan y su radio es cero: son el refugio de la superficie,
 * el sitio donde uno se mete a pasar la noche, y llenarlas de bichos sería
 * quitarles justo aquello para lo que existen.
 */
export function estructuraEn(
  lista: readonly Estructura[],
  tx: number,
  ty: number,
): TipoEstructura | null {
  for (const e of lista) {
    const r = RADIO_ESTRUCTURA[e.tipo] ?? 0;
    if (r === 0) continue;
    if (Math.abs(e.tx - tx) <= r && Math.abs(e.ty - ty) <= r) return e.tipo;
  }
  return null;
}

export function nombreEstructura(tipo: number): string {
  return NOMBRE_ESTRUCTURA[tipo] ?? 'Estructura';
}

export interface EstructuraCerca {
  readonly estructura: Estructura;
  /** Distancia en tiles, en línea recta. */
  readonly distancia: number;
}

/**
 * La estructura más cercana a un punto, o null si no hay ninguna.
 *
 * Se mide en línea recta y no por camino andable a propósito: la brújula dice
 * hacia dónde está, no cómo llegar. Que el trayecto lo resuelva quien cava es
 * justo la parte que se quiere conservar.
 */
export function estructuraMasCercana(
  lista: readonly Estructura[],
  tx: number,
  ty: number,
): EstructuraCerca | null {
  let mejor: EstructuraCerca | null = null;
  for (const e of lista) {
    const d = Math.hypot(e.tx - tx, e.ty - ty);
    if (mejor === null || d < mejor.distancia) mejor = { estructura: e, distancia: d };
  }
  return mejor;
}

/** Puntos cardinales de un vector, para poder decirlo con palabras. */
export function rumbo(dx: number, dy: number): string {
  const horizontal = Math.abs(dx) > Math.abs(dy) * 0.5 ? (dx > 0 ? 'este' : 'oeste') : '';
  const vertical = Math.abs(dy) > Math.abs(dx) * 0.5 ? (dy > 0 ? 'abajo' : 'arriba') : '';
  if (horizontal && vertical) return `${horizontal} y ${vertical}`;
  return horizontal || vertical || 'aquí mismo';
}

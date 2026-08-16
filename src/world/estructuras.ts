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

export type TipoEstructura = typeof FORTALEZA | typeof CABANA | typeof MINA;

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
};

/** Letra que marca cada tipo en el mapa. Una sola: el mapa es diminuto. */
export const MARCA_ESTRUCTURA: Readonly<Record<number, string>> = {
  [FORTALEZA]: 'F',
  [CABANA]: 'C',
  [MINA]: 'M',
};

/** Color del marcador de cada tipo. */
export const COLOR_ESTRUCTURA: Readonly<Record<number, string>> = {
  [FORTALEZA]: '#c88ae8',
  [CABANA]: '#e8c06a',
  [MINA]: '#8fd0e8',
};

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

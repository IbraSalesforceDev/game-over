/**
 * Ruido de valor con semilla.
 *
 * No hace falta Perlin ni Simplex: para un relieve y unas cuevas de tiles, el
 * ruido de valor con interpolación suave y varias octavas da un resultado
 * indistinguible y se escribe en veinte líneas. Es una función pura del punto y
 * la semilla, así que no hay que precalcular ni guardar tablas.
 */

/** Hash entero → decimal en [0, 1). */
function hash(x: number, y: number, semilla: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(semilla, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Interpolación suave (smoothstep): quita las esquinas de la rejilla. */
function suave(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ruido de valor en una dimensión. Devuelve [0, 1). */
export function ruido1D(x: number, semilla: number): number {
  const i = Math.floor(x);
  const f = suave(x - i);
  return lerp(hash(i, 0, semilla), hash(i + 1, 0, semilla), f);
}

/** Ruido de valor en dos dimensiones. Devuelve [0, 1). */
export function ruido2D(x: number, y: number, semilla: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = suave(x - ix);
  const fy = suave(y - iy);
  const arriba = lerp(hash(ix, iy, semilla), hash(ix + 1, iy, semilla), fx);
  const abajo = lerp(hash(ix, iy + 1, semilla), hash(ix + 1, iy + 1, semilla), fx);
  return lerp(arriba, abajo, fy);
}

export interface OpcionesOctavas {
  octavas?: number;
  /** Cuánto pierde de peso cada octava respecto a la anterior. */
  persistencia?: number;
  /** Cuánto se comprime cada octava. */
  lacunaridad?: number;
}

/**
 * Suma de octavas: la primera pone las colinas grandes y las siguientes van
 * añadiendo detalle cada vez más fino. Devuelve [0, 1).
 */
export function fractal1D(
  x: number,
  semilla: number,
  { octavas = 4, persistencia = 0.5, lacunaridad = 2 }: OpcionesOctavas = {},
): number {
  let suma = 0;
  let amplitud = 1;
  let total = 0;
  let frecuencia = 1;
  for (let o = 0; o < octavas; o++) {
    suma += ruido1D(x * frecuencia, semilla + o * 1013) * amplitud;
    total += amplitud;
    amplitud *= persistencia;
    frecuencia *= lacunaridad;
  }
  return suma / total;
}

export function fractal2D(
  x: number,
  y: number,
  semilla: number,
  { octavas = 4, persistencia = 0.5, lacunaridad = 2 }: OpcionesOctavas = {},
): number {
  let suma = 0;
  let amplitud = 1;
  let total = 0;
  let frecuencia = 1;
  for (let o = 0; o < octavas; o++) {
    suma += ruido2D(x * frecuencia, y * frecuencia, semilla + o * 1013) * amplitud;
    total += amplitud;
    amplitud *= persistencia;
    frecuencia *= lacunaridad;
  }
  return suma / total;
}

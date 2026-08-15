/**
 * Aleatoriedad con semilla.
 *
 * Nada de Math.random en la generación: el mundo tiene que ser reproducible a
 * partir de su semilla, tanto para poder compartir mundos como para que un test
 * pueda comprobar que dos generaciones con la misma semilla salen idénticas.
 */

/** Generador mulberry32: rápido, sin estado global y de calidad suficiente. */
export function crearRng(semilla: number): () => number {
  let a = semilla >>> 0;
  return function siguiente(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  (): number;
  /** Entero en [min, max], ambos incluidos. */
  entero(min: number, max: number): number;
  /** Decimal en [min, max). */
  rango(min: number, max: number): number;
  /** true con la probabilidad dada. */
  suerte(p: number): boolean;
  elegir<T>(opciones: readonly T[]): T;
}

export function crearRngRico(semilla: number): Rng {
  const base = crearRng(semilla);
  const r = base as Rng;
  r.entero = (min, max) => min + Math.floor(base() * (max - min + 1));
  r.rango = (min, max) => min + base() * (max - min);
  r.suerte = (p) => base() < p;
  r.elegir = (opciones) => opciones[Math.floor(base() * opciones.length)]!;
  return r;
}

/** Convierte una semilla de texto en un entero de 32 bits (FNV-1a). */
export function semillaDeTexto(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Semilla aleatoria presentable, del estilo de las de Terraria. */
export function semillaAleatoria(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .toUpperCase();
}

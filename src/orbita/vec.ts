/** Vectores 2D. Eje y hacia arriba: el lienzo se invierte al dibujar. */
export interface V {
  x: number;
  y: number;
}

export const v = (x = 0, y = 0): V => ({ x, y });
export const suma = (a: V, b: V): V => ({ x: a.x + b.x, y: a.y + b.y });
export const resta = (a: V, b: V): V => ({ x: a.x - b.x, y: a.y - b.y });
export const escala = (a: V, k: number): V => ({ x: a.x * k, y: a.y * k });
export const punto = (a: V, b: V): number => a.x * b.x + a.y * b.y;
/** Componente z del producto vectorial: positivo si b queda a la izquierda de a. */
export const cruz = (a: V, b: V): number => a.x * b.y - a.y * b.x;
export const largo = (a: V): number => Math.hypot(a.x, a.y);
export const dist = (a: V, b: V): number => Math.hypot(a.x - b.x, a.y - b.y);
export const unit = (a: V): V => {
  const l = Math.hypot(a.x, a.y);
  return l > 1e-12 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 1 };
};
export const polar = (angulo: number, r = 1): V => ({ x: Math.cos(angulo) * r, y: Math.sin(angulo) * r });
export const angulo = (a: V): number => Math.atan2(a.y, a.x);
export const perp = (a: V): V => ({ x: -a.y, y: a.x });

/** Diferencia angular en (-π, π]. */
export function difAngulo(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distancia de un punto a un segmento. */
export function distSegmento(p: V, a: V, b: V): number {
  const ab = resta(b, a);
  const l2 = punto(ab, ab);
  const t = l2 > 0 ? clamp(punto(resta(p, a), ab) / l2, 0, 1) : 0;
  return dist(p, suma(a, escala(ab, t)));
}

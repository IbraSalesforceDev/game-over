/**
 * Elementos de una órbita a partir de posición y velocidad relativas.
 *
 * Con la aproximación de cónicas enlazadas (dentro de una esfera de influencia
 * solo tira un cuerpo) la trayectoria es exactamente una cónica, así que la
 * línea que se dibuja en el mapa es la que de verdad va a seguir la nave.
 */
import { type V, cruz, largo, punto, v } from './vec';

export interface Elementos {
  /** Semieje mayor (negativo en una hipérbola). */
  a: number;
  e: number;
  /** Distancias al centro del cuerpo. */
  periapsis: number;
  apoapsis: number;
  /** Ángulo del periapsis respecto al eje x. */
  argPe: number;
  /** +1 antihorario, -1 horario. */
  sentido: number;
  /** Anomalía verdadera actual. */
  nu: number;
  periodo: number;
  escapa: boolean;
}

export function elementos(r: V, vel: V, gm: number): Elementos {
  const rl = largo(r);
  const v2 = punto(vel, vel);
  const h = cruz(r, vel);
  const energia = v2 / 2 - gm / rl;
  const rv = punto(r, vel);
  // Vector excentricidad.
  const ex = ((v2 - gm / rl) * r.x - rv * vel.x) / gm;
  const ey = ((v2 - gm / rl) * r.y - rv * vel.y) / gm;
  const e = Math.hypot(ex, ey);
  const a = Math.abs(energia) < 1e-9 ? Infinity : -gm / (2 * energia);
  const p = (h * h) / gm;
  const periapsis = p / (1 + e);
  const escapa = e >= 1;
  const apoapsis = escapa ? Infinity : a * (1 + e);
  const argPe = e > 1e-7 ? Math.atan2(ey, ex) : Math.atan2(r.y, r.x);
  const sentido = h >= 0 ? 1 : -1;
  const nu = (Math.atan2(r.y, r.x) - argPe) * sentido;
  const periodo = escapa ? Infinity : 2 * Math.PI * Math.sqrt((a * a * a) / gm);
  return { a, e, periapsis, apoapsis, argPe, sentido, nu, periodo, escapa };
}

/** Radio de la cónica en la anomalía verdadera nu. */
export function radioEn(el: Elementos, nu: number): number {
  const p = el.escapa ? el.a * (1 - el.e * el.e) : el.a * (1 - el.e * el.e);
  return p / (1 + el.e * Math.cos(nu));
}

/**
 * Puntos de la cónica, relativos al cuerpo, para dibujarla. Las hipérbolas y
 * las elipses que se salen de la esfera se cortan en `rMax`.
 */
export function puntosConica(el: Elementos, rMax: number, n = 180): V[] {
  const out: V[] = [];
  let nuMax = Math.PI;
  if (el.escapa || el.apoapsis > rMax) {
    // Anomalía en la que la cónica cruza rMax.
    const p = el.a * (1 - el.e * el.e);
    const c = (p / rMax - 1) / el.e;
    nuMax = Math.acos(Math.max(-1, Math.min(1, c)));
  }
  for (let i = 0; i <= n; i++) {
    const nu = -nuMax + (2 * nuMax * i) / n;
    const r = radioEn(el, nu);
    if (!(r > 0) || !isFinite(r)) continue;
    const ang = el.argPe + nu * el.sentido;
    out.push(v(Math.cos(ang) * r, Math.sin(ang) * r));
  }
  return out;
}

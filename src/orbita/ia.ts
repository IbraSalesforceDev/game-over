/**
 * La otra raza: diplomacia, flotas y pilotos automáticos.
 *
 * La relación pasa por tres estados. En paz no te ataca nadie; minar en su
 * territorio o merodear su estación sube la tensión, y al llegar a 100 declara
 * la guerra. También la declara si disparas primero. En guerra manda
 * incursiones cada pocos minutos, más grandes cuanto más fuerza tenga; cada nave
 * que derribas le quita fuerza. Destruir su estación la obliga a rendirse.
 */
import type { Diseno, Nave } from './nave';
import type { Raza } from './partes';
import { type V, angulo, clamp, difAngulo, escala, largo, perp, resta, suma, unit } from './vec';

export type Relacion = 'paz' | 'tension' | 'guerra';

export interface Diplomacia {
  estado: Relacion;
  tension: number;
  /** Fuerza de su flota, de 0 a 100. */
  fuerza: number;
  /** 0 = pacífica, 1 = normal, 2 = salvaje. Se cambia desde el panel de administración. */
  agresividad: number;
  /** Segundos reales hasta la próxima incursión. */
  proxima: number;
  /** Tiempo de juego hasta el que dura la rendición. */
  rendidaHasta: number;
  derribadas: number;
  perdidas: number;
  victorias: number;
}

export function crearDiplomacia(): Diplomacia {
  return { estado: 'paz', tension: 0, fuerza: 30, agresividad: 1, proxima: 200, rendidaHasta: 0, derribadas: 0, perdidas: 0, victorias: 0 };
}

export function declararGuerra(d: Diplomacia): void {
  if (d.estado === 'guerra') return;
  d.estado = 'guerra';
  d.tension = 100;
  d.proxima = Math.min(d.proxima, 45);
}

export function costePaz(d: Diplomacia): number {
  return Math.round(5000 + d.fuerza * 250);
}

export function firmarPaz(d: Diplomacia): void {
  d.estado = 'paz';
  d.tension = 30;
  d.proxima = 200;
}

/** Avanza la diplomacia `dt` segundos reales. Devuelve un mensaje si cambia de estado. */
export function tickDiplomacia(d: Diplomacia, dt: number, tJuego: number): string | null {
  if (d.rendidaHasta > tJuego) {
    d.estado = 'paz';
    d.tension = 0;
    return null;
  }
  if (d.estado === 'guerra') {
    d.fuerza = Math.min(100, d.fuerza + (dt / 60) * (0.6 + d.agresividad * 0.6));
    return null;
  }
  d.fuerza = Math.min(100, d.fuerza + (dt / 60) * 0.3);
  d.tension = Math.max(0, d.tension - dt * 0.02);
  const antes = d.estado;
  if (d.agresividad > 0 && d.tension >= 100) {
    declararGuerra(d);
    return 'guerra';
  }
  d.estado = d.tension >= 50 ? 'tension' : 'paz';
  if (antes !== d.estado && d.estado === 'tension') return 'tension';
  return null;
}

export function subirTension(d: Diplomacia, cant: number): void {
  if (d.estado === 'guerra') return;
  d.tension = Math.min(100, d.tension + cant * Math.max(0.3, d.agresividad));
}

/** Cuántas naves y de qué nivel trae la próxima incursión. */
export function tamanoIncursion(d: Diplomacia): { naves: number; nivel: 1 | 2 | 3 } {
  const naves = clamp(1 + Math.floor((d.fuerza / 35) * Math.max(0.5, d.agresividad)), 1, 5);
  const nivel = d.fuerza > 70 ? 3 : d.fuerza > 40 ? 2 : 1;
  return { naves, nivel };
}

export function intervaloIncursion(d: Diplomacia, azar: () => number): number {
  const base = 210 - 60 * clamp(d.agresividad, 0, 2);
  return base * (0.75 + azar() * 0.5);
}

// ------------------------------------------------------------ diseños enemigos

export function disenoEnemigo(raza: Raza, nivel: 1 | 2 | 3): Diseno {
  if (raza === 'alien') {
    const pila =
      nivel === 1
        ? [
            { parte: 'a_simbionte', radial: 'a_lanza' },
            { parte: 'a_quitina', radial: null },
            { parte: 'a_vejiga_m', radial: 'aletas' },
            { parte: 'a_pulso', radial: null },
          ]
        : nivel === 2
          ? [
              { parte: 'a_simbionte', radial: 'a_lanza' },
              { parte: 'a_fase', radial: null },
              { parte: 'a_quitina', radial: 'a_enjambre' },
              { parte: 'a_vejiga_m', radial: null },
              { parte: 'a_latido', radial: null },
            ]
          : [
              { parte: 'a_mente', radial: 'a_haz' },
              { parte: 'a_fase', radial: 'a_cilios' },
              { parte: 'a_coraza', radial: 'a_enjambre' },
              { parte: 'a_saco', radial: null },
              { parte: 'a_gravitico', radial: null },
            ];
    return { nombre: ['Avispa', 'Mantis', 'Leviatán'][nivel - 1]!, raza, pila };
  }
  const pila =
    nivel === 1
      ? [
          { parte: 'h_alondra', radial: 'h_canon' },
          { parte: 'h_placa', radial: null },
          { parte: 'h_t400', radial: 'aletas' },
          { parte: 'h_saltamontes', radial: null },
        ]
      : nivel === 2
        ? [
            { parte: 'h_alondra', radial: 'h_canon' },
            { parte: 'h_placa', radial: 'h_halcon' },
            { parte: 'h_placa', radial: 'h_pdc' },
            { parte: 'h_t400', radial: null },
            { parte: 'h_giro', radial: null },
          ]
        : [
            { parte: 'h_condor', radial: 'h_riel' },
            { parte: 'h_deflector', radial: 'h_pdc' },
            { parte: 'h_compuesto', radial: 'h_halcon' },
            { parte: 'h_x2000', radial: 'h_canon' },
            { parte: 'h_mamut', radial: null },
          ];
  return { nombre: ['Lancero', 'Fragata', 'Acorazado'][nivel - 1]!, raza, pila };
}

// ------------------------------------------------------------ piloto automático

export interface Cerebro {
  nivel: 1 | 2 | 3;
  /** A quién persigue: una nave o un punto fijo (la estación). */
  objetivo: 'jugador' | 'estacion';
  distancia: number;
  lado: number;
  recompensa: number;
}

export interface Blanco {
  pos: V;
  vel: V;
}

/**
 * Decide giro y acelerador para acercarse a `b` hasta `cer.distancia` y
 * rodearlo. Trabaja en velocidades relativas: los dos caen igual en el mismo
 * campo de gravedad, así que no hace falta compensarla.
 */
export function pilotar(n: Nave, b: Blanco, cer: Cerebro): void {
  const rel = resta(b.pos, n.pos);
  const d = largo(rel);
  const haciaB = unit(rel);
  const vCierre = clamp((d - cer.distancia) * 0.06, -60, 220);
  const deseada = suma(escala(haciaB, vCierre), escala(perp(haciaB), 14 * cer.lado));
  const actual = resta(n.vel, b.vel);
  const error = resta(deseada, actual);
  const aMax = Math.max(0.1, n.empujeMax() / n.masa());
  const aDes = escala(error, 0.6);
  const ad = largo(aDes);
  const objetivoAng = ad > 0.6 ? angulo(aDes) : angulo(rel);
  const dif = difAngulo(n.ang, objetivoAng);
  n.giro = clamp(dif * 2.5 - n.omega * 1.4, -1, 1);
  n.encendida = true;
  n.acel = Math.abs(dif) < 0.35 && ad > 0.6 ? clamp(ad / aMax, 0, 1) : 0;
}

/** Punto de impacto previsto para un proyectil de velocidad `vp` disparado desde `desde`. */
export function adelanto(desde: V, velDesde: V, b: Blanco, vp: number): V {
  const rel = resta(b.pos, desde);
  const vr = resta(b.vel, velDesde);
  // |rel + vr t| = vp t  →  a t² + b t + c = 0
  const a = vr.x * vr.x + vr.y * vr.y - vp * vp;
  const bb = 2 * (rel.x * vr.x + rel.y * vr.y);
  const c = rel.x * rel.x + rel.y * rel.y;
  let t = 0;
  if (Math.abs(a) < 1e-6) t = -c / (bb || 1);
  else {
    const disc = bb * bb - 4 * a * c;
    if (disc >= 0) {
      const s = Math.sqrt(disc);
      const t1 = (-bb - s) / (2 * a);
      const t2 = (-bb + s) / (2 * a);
      t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
    }
  }
  if (!(t > 0) || t > 30) t = largo(rel) / vp;
  return suma(b.pos, escala(vr, t));
}

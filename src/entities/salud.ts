import type { Caja } from './physics';

/**
 * Vida, daño e invulnerabilidad.
 *
 * Los fotogramas de invulnerabilidad no son un adorno: sin ellos, quedarse
 * pegado a un enemigo aplica daño sesenta veces por segundo y cualquier
 * descuido mata al instante. Son lo que convierte un choque en un error
 * recuperable en vez de una sentencia.
 */

/** Vida máxima del jugador. Cada corazón vale 20. */
export const VIDA_POR_CORAZON = 20;
export const VIDA_MAXIMA = 100;

/** Ticks de invulnerabilidad tras recibir un golpe. */
export const TICKS_INVULNERABLE = 45;

/** Fuerza del empujón al recibir daño, en píxeles por tick. */
export const KNOCKBACK = 4.2;
export const KNOCKBACK_VERTICAL = 3.4;

export interface Salud {
  vida: number;
  vidaMax: number;
  /** Ticks que quedan de invulnerabilidad. */
  invulnerable: number;
  /** Ticks desde la última vez que recibió daño, para el aviso en pantalla. */
  desdeGolpe: number;
  muerto: boolean;
}

export function crearSalud(vidaMax = VIDA_MAXIMA): Salud {
  return { vida: vidaMax, vidaMax, invulnerable: 0, desdeGolpe: 9999, muerto: false };
}

export function tickSalud(s: Salud): void {
  if (s.invulnerable > 0) s.invulnerable--;
  if (s.desdeGolpe < 9999) s.desdeGolpe++;
}

/**
 * Aplica daño y empuja en dirección contraria a la fuente. Devuelve true si el
 * golpe ha entrado; si estaba invulnerable, no pasa nada en absoluto.
 *
 * `empuje` se puede desactivar para el daño que no viene de un sitio concreto
 * —ahogarse, quemarse—: dar un empujón ahí solo serviría para arrancarle el
 * control al jugador justo cuando más lo necesita.
 */
export function golpear(
  s: Salud,
  caja: Caja,
  dano: number,
  fuenteX: number,
  invulnerabilidad = TICKS_INVULNERABLE,
  empuje = true,
): boolean {
  if (s.invulnerable > 0 || s.muerto) return false;
  s.vida -= dano;
  s.invulnerable = invulnerabilidad;
  s.desdeGolpe = 0;

  if (empuje) {
    const direccion = caja.x + caja.ancho / 2 < fuenteX ? -1 : 1;
    caja.vx = direccion * KNOCKBACK;
    caja.vy = -KNOCKBACK_VERTICAL;
    caja.enSuelo = false;
  }

  if (s.vida <= 0) {
    s.vida = 0;
    s.muerto = true;
  }
  return true;
}

export function curar(s: Salud, cantidad: number): void {
  s.vida = Math.min(s.vidaMax, s.vida + cantidad);
  if (s.vida > 0) s.muerto = false;
}

export function revivir(s: Salud): void {
  s.vida = s.vidaMax;
  s.invulnerable = TICKS_INVULNERABLE * 2;
  s.muerto = false;
}

/** Corazones enteros y la fracción del último, para pintarlos. */
export function corazones(s: Salud): { llenos: number; parcial: number; total: number } {
  const total = Math.ceil(s.vidaMax / VIDA_POR_CORAZON);
  const llenos = Math.floor(s.vida / VIDA_POR_CORAZON);
  const parcial = (s.vida % VIDA_POR_CORAZON) / VIDA_POR_CORAZON;
  return { llenos, parcial, total };
}

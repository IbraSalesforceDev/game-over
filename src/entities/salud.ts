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

/**
 * Techo de vida máxima y cuánto sube cada cristal.
 *
 * Cinco corazones de partida y hasta diez: el doble de aguante, no diez veces
 * más. Un tope alto convertiría la exploración en farmeo de cristales, y lo que
 * interesa es que subir de cinco a seis se note de verdad en la primera cueva.
 */
export const VIDA_TOPE = 200;
export const VIDA_POR_CRISTAL = VIDA_POR_CORAZON;

/** Ticks de invulnerabilidad tras recibir un golpe. */
export const TICKS_INVULNERABLE = 45;

/** Fuerza del empujón al recibir daño, en píxeles por tick. */
export const KNOCKBACK = 4.2;
export const KNOCKBACK_VERTICAL = 3.4;

/** Por qué se ha recibido el último golpe, para poder contarlo al morir. */
export type Motivo =
  | 'golpe'
  | 'caida'
  | 'ahogo'
  | 'lava'
  | 'fuego'
  | 'hambre'
  | 'desconocido';

export const TEXTO_MOTIVO: Record<Motivo, string> = {
  golpe: 'Te han matado.',
  caida: 'Has caído desde demasiado alto.',
  ahogo: 'Te has ahogado.',
  lava: 'Te ha matado la lava.',
  fuego: 'Has muerto ardiendo.',
  hambre: 'Has muerto de hambre.',
  desconocido: 'Vuelves al punto de aparición.',
};

export interface Salud {
  vida: number;
  vidaMax: number;
  /** Ticks que quedan de invulnerabilidad. */
  invulnerable: number;
  /** Ticks desde la última vez que recibió daño, para el aviso en pantalla. */
  desdeGolpe: number;
  muerto: boolean;
  /** Qué le hizo el último daño. Es lo que se cuenta en la pantalla de muerte. */
  motivo: Motivo;
}

export function crearSalud(vidaMax = VIDA_MAXIMA): Salud {
  return {
    vida: vidaMax,
    vidaMax,
    invulnerable: 0,
    desdeGolpe: 9999,
    muerto: false,
    motivo: 'desconocido',
  };
}

/**
 * Sube el techo de vida y cura lo que sube. Devuelve false si ya estaba al tope
 * —el cristal no se gasta si no hace nada.
 */
export function ampliarVida(s: Salud, cuanto = VIDA_POR_CRISTAL): boolean {
  if (s.vidaMax >= VIDA_TOPE) return false;
  const antes = s.vidaMax;
  s.vidaMax = Math.min(VIDA_TOPE, s.vidaMax + cuanto);
  // La vida sube con el techo: si no, usar un cristal dejaría la barra más
  // vacía que antes y se leería como un castigo.
  s.vida += s.vidaMax - antes;
  return true;
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
  motivo: Motivo = 'golpe',
): boolean {
  if (s.invulnerable > 0 || s.muerto) return false;
  s.vida -= dano;
  s.invulnerable = invulnerabilidad;
  s.desdeGolpe = 0;
  s.motivo = motivo;

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
  s.motivo = 'desconocido';
}

/**
 * Daño por caída.
 *
 * Los primeros tiles salen gratis: sin ese margen, bajar un par de escalones
 * castigaría, y saltar —que es el verbo principal del juego— daría miedo. A
 * partir de ahí sube rápido, porque lo que tiene que enseñar la caída es a
 * medir los saltos largos, no a andar con cuidado.
 */
export const CAIDA_SEGURA = 9;
export const DANO_POR_TILE = 7;

export function danoDeCaida(tiles: number): number {
  if (tiles <= CAIDA_SEGURA) return 0;
  return Math.round((tiles - CAIDA_SEGURA) * DANO_POR_TILE);
}

/** Corazones enteros y la fracción del último, para pintarlos. */
export function corazones(s: Salud): { llenos: number; parcial: number; total: number } {
  const total = Math.ceil(s.vidaMax / VIDA_POR_CORAZON);
  const llenos = Math.floor(s.vida / VIDA_POR_CORAZON);
  const parcial = (s.vida % VIDA_POR_CORAZON) / VIDA_POR_CORAZON;
  return { llenos, parcial, total };
}

import type { Caja } from './physics';
import { curar, golpear, type Salud } from './salud';

/**
 * Hambre.
 *
 * La idea es que comer sea la forma normal de curarse y que dejar de comer
 * tenga consecuencias, sin convertir la partida en un trabajo. De ahí las tres
 * franjas:
 *
 *  - **Saciado** (90 % o más): se regenera vida poco a poco, y regenerar gasta
 *    hambre extra. Comer bien es la cura, y curarse cuesta comida.
 *  - **Normal**: no pasa nada. Es donde se está casi siempre.
 *  - **Hambriento** (15 % o menos): se pierde vida a intervalos. No mata
 *    deprisa —da tiempo de sobra a buscar algo— pero no se puede ignorar.
 *
 * El drenaje base es lento a propósito: un depósito lleno dura unos doce
 * minutos de juego tranquilo. Correr, saltar y picar lo aceleran, porque si
 * gastar energía no costara nada, el medidor sería un reloj y no un recurso.
 */

export const HAMBRE_MAXIMA = 100;

/** A partir de aquí se regenera vida. */
export const UMBRAL_SACIADO = 90;
/** Por debajo de aquí se pasa hambre y se pierde vida. */
export const UMBRAL_HAMBRIENTO = 15;

/** Hambre que se gasta por tick sin hacer nada. */
export const DRENAJE_BASE = 100 / (12 * 60 * 60);
/** Multiplicador del drenaje mientras se corre, se salta o se pica. */
export const FACTOR_ACTIVIDAD = 2.4;
/** Hambre extra por tick mientras se está regenerando vida. */
export const COSTE_REGENERACION = DRENAJE_BASE * 3;

/** Cada cuántos ticks se cura un punto estando saciado, y cuánto. */
export const INTERVALO_REGENERACION = 45;
export const CURACION_POR_TICK = 2;

/** Cada cuántos ticks duele el hambre, y cuánto. */
export const INTERVALO_INANICION = 110;
export const DANO_INANICION = 5;

export interface Hambre {
  /** Nivel actual, 0-100. */
  nivel: number;
  /** Cuenta atrás hasta la próxima curación por saciedad. */
  proximaCura: number;
  /** Cuenta atrás hasta el próximo mordisco de inanición. */
  proximoDano: number;
}

export function crearHambre(nivel = HAMBRE_MAXIMA): Hambre {
  return {
    nivel: Math.max(0, Math.min(HAMBRE_MAXIMA, nivel)),
    proximaCura: INTERVALO_REGENERACION,
    proximoDano: INTERVALO_INANICION,
  };
}

export function saciado(h: Hambre): boolean {
  return h.nivel >= UMBRAL_SACIADO;
}

export function hambriento(h: Hambre): boolean {
  return h.nivel <= UMBRAL_HAMBRIENTO;
}

export interface ResultadoHambre {
  /** Ha curado este tick. */
  curado: boolean;
  /** Ha hecho daño por inanición este tick. */
  danado: boolean;
}

/**
 * Un tick de hambre.
 *
 * `activo` es true cuando el jugador está corriendo, saltando o picando: gastar
 * energía cuesta comida.
 */
export function tickHambre(
  h: Hambre,
  s: Salud,
  caja: Caja,
  activo: boolean,
): ResultadoHambre {
  const salida: ResultadoHambre = { curado: false, danado: false };
  if (s.muerto) return salida;

  let gasto = DRENAJE_BASE * (activo ? FACTOR_ACTIVIDAD : 1);

  if (saciado(h) && s.vida < s.vidaMax) {
    // Regenerar consume de más: es el precio de usar la comida como botiquín.
    gasto += COSTE_REGENERACION;
    if (--h.proximaCura <= 0) {
      h.proximaCura = INTERVALO_REGENERACION;
      curar(s, CURACION_POR_TICK);
      salida.curado = true;
    }
  } else {
    h.proximaCura = INTERVALO_REGENERACION;
  }

  h.nivel = Math.max(0, h.nivel - gasto);

  if (hambriento(h)) {
    if (--h.proximoDano <= 0) {
      h.proximoDano = INTERVALO_INANICION;
      // Sin invulnerabilidad y sin empujón: el hambre no es un golpe del que
      // uno se aparte, y darle fotogramas de gracia la haría inofensiva.
      if (golpear(s, caja, DANO_INANICION, caja.x + caja.ancho / 2, 0, false, 'hambre')) {
        salida.danado = true;
      }
    }
  } else {
    h.proximoDano = INTERVALO_INANICION;
  }

  return salida;
}

/** Come: sube el hambre y cura de golpe. Devuelve false si ya estaba lleno. */
export function comer(h: Hambre, s: Salud, saciedad: number, curacion: number): boolean {
  // Comer con el depósito lleno tiraría la comida a la basura, así que no se
  // deja. El margen de un punto evita que un decimal impida comer.
  if (h.nivel >= HAMBRE_MAXIMA - 1 && s.vida >= s.vidaMax) return false;
  h.nivel = Math.min(HAMBRE_MAXIMA, h.nivel + saciedad);
  if (curacion > 0) curar(s, curacion);
  return true;
}

export function reiniciarHambre(h: Hambre): void {
  // Al reaparecer no se resucita con el estómago lleno, pero tampoco con el
  // problema que te acababa de matar: se deja en la franja tranquila.
  h.nivel = Math.max(h.nivel, 60);
  h.proximaCura = INTERVALO_REGENERACION;
  h.proximoDano = INTERVALO_INANICION;
}

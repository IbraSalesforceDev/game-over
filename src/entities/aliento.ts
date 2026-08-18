import type { Caja } from './physics';
import { golpear, type Salud } from './salud';

/**
 * Aliento bajo el agua y quemaduras de lava.
 *
 * El agua no mata: avisa. Hay medio minuto de aire, un medidor que aparece solo
 * cuando queda poco, y el daño empieza despacio — bucear tiene que ser una
 * decisión con un reloj corriendo, no una muerte súbita por asomarse a un lago.
 *
 * La lava es lo contrario: quema en cuanto se toca y el daño es serio. Es el
 * peligro que enseña a mirar antes de cavar hacia abajo.
 */

/** Ticks de aire con los pulmones llenos. 30 segundos. */
export const ALIENTO_MAXIMO = 1800;
/** Cada cuántos ticks hace daño el ahogo una vez agotado el aire. */
export const INTERVALO_AHOGO = 40;
export const DANO_AHOGO = 8;
/** Ticks que se recupera de aire por tick fuera del agua. */
export const RECUPERACION = 6;

/** Daño de la lava y cada cuánto se aplica mientras se siga dentro. */
export const DANO_LAVA = 18;
export const INTERVALO_LAVA = 30;
/** Ticks que se sigue ardiendo tras salir de la lava. */
export const TICKS_ARDIENDO = 180;
export const DANO_ARDIENDO = 4;
export const INTERVALO_ARDIENDO = 45;

export interface Aliento {
  /** Ticks de aire restantes. */
  aire: number;
  /** Cuenta atrás hasta el próximo daño por ahogo. */
  proximoAhogo: number;
  /** Ticks que quedan ardiendo tras tocar lava. */
  ardiendo: number;
  /** Cuenta atrás hasta el próximo daño de fuego. */
  proximoFuego: number;
}

export function crearAliento(): Aliento {
  return {
    aire: ALIENTO_MAXIMO,
    proximoAhogo: INTERVALO_AHOGO,
    ardiendo: 0,
    proximoFuego: 0,
  };
}

export interface ResultadoAliento {
  /** Ha entrado daño este tick. */
  dano: boolean;
  /** Motivo, para el aviso en pantalla. */
  motivo: 'ahogo' | 'lava' | 'fuego' | null;
}

/**
 * Un tick de aliento y quemaduras.
 *
 * `cabezaDentro` es lo que decide si se respira: el cuerpo puede estar en el
 * agua mientras la cabeza asoma, y en ese caso no pasa nada. `enLava` es
 * cualquier contacto, porque para quemarse basta rozarla.
 */
export function tickAliento(
  a: Aliento,
  s: Salud,
  caja: Caja,
  cabezaDentro: boolean,
  enLava: boolean,
  castigo = 1,
  /**
   * Lo que multiplica el gasto de aire. Menos de uno es que dura más.
   *
   * Va como número y no como "¿lleva agallas puestas?" para que este módulo no
   * tenga que saber que existen las pociones: recibe un factor y ya.
   */
  ritmoAire = 1,
): ResultadoAliento {
  let motivo: ResultadoAliento['motivo'] = null;
  let dano = false;
  /** El daño del entorno lo escala la dificultad, redondeando siempre a más de cero. */
  const punzada = (base: number): number => Math.max(1, Math.round(base * castigo));

  // --- Aire ---
  if (cabezaDentro) {
    if (a.aire > 0) {
      a.aire = Math.max(0, a.aire - ritmoAire);
      a.proximoAhogo = INTERVALO_AHOGO;
    } else if (--a.proximoAhogo <= 0) {
      a.proximoAhogo = INTERVALO_AHOGO;
      // Sin invulnerabilidad: el ahogo no es un golpe del que uno se recupere
      // apartándose, y los fotogramas de gracia lo harían inofensivo.
      if (golpear(s, caja, punzada(DANO_AHOGO), caja.x + caja.ancho / 2, 0, false, 'ahogo')) {
        dano = true;
        motivo = 'ahogo';
      }
    }
  } else if (a.aire < ALIENTO_MAXIMO) {
    a.aire = Math.min(ALIENTO_MAXIMO, a.aire + RECUPERACION);
  }

  // --- Lava y fuego ---
  if (enLava) {
    a.ardiendo = TICKS_ARDIENDO;
    if (--a.proximoFuego <= 0) {
      a.proximoFuego = INTERVALO_LAVA;
      if (golpear(s, caja, punzada(DANO_LAVA), caja.x + caja.ancho / 2, INTERVALO_LAVA, false, 'lava')) {
        dano = true;
        motivo = 'lava';
      }
    }
  } else if (a.ardiendo > 0) {
    a.ardiendo--;
    if (--a.proximoFuego <= 0) {
      a.proximoFuego = INTERVALO_ARDIENDO;
      if (golpear(s, caja, punzada(DANO_ARDIENDO), caja.x + caja.ancho / 2, INTERVALO_ARDIENDO, false, 'fuego')) {
        dano = true;
        motivo = 'fuego';
      }
    }
  } else {
    a.proximoFuego = 0;
  }

  return { dano, motivo };
}

/** El agua apaga el fuego: salir corriendo a un lago es la respuesta correcta. */
export function apagar(a: Aliento): void {
  a.ardiendo = 0;
  a.proximoFuego = 0;
}

export function reiniciarAliento(a: Aliento): void {
  a.aire = ALIENTO_MAXIMO;
  a.proximoAhogo = INTERVALO_AHOGO;
  a.ardiendo = 0;
  a.proximoFuego = 0;
}

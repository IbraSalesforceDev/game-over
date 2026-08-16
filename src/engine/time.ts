/**
 * Reloj del mundo y ciclo día-noche.
 *
 * El tiempo se mide en minutos de juego (0 a 1440). Un ciclo completo dura 12
 * minutos reales, algo más corto que en Terraria: en una partida de navegador
 * interesa que amanezca y anochezca varias veces en una sesión.
 */

/** Minutos de juego que pasan por cada segundo real. */
export const VELOCIDAD_POR_DEFECTO = 1440 / (12 * 60);

export const AMANECER = 5 * 60;
export const MEDIA_MANANA = 7 * 60;
export const ATARDECER = 17 * 60;
export const NOCHE = 20 * 60;

/** Luz solar de pleno día y luz de luna, en la escala 0-255 de la luz. */
export const LUZ_DIA = 255;
/**
 * La luna no deja el mundo a oscuras del todo: por debajo de ~35 la superficie
 * de noche es un rectángulo negro y no se puede ni caminar. Que dé miedo, sí;
 * que sea injugable, no.
 */
export const LUZ_NOCHE = 52;

function interpolar(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

type Color = readonly [number, number, number];

function mezclarColor(a: Color, b: Color, t: number): Color {
  return [
    Math.round(interpolar(a[0], b[0], t)),
    Math.round(interpolar(a[1], b[1], t)),
    Math.round(interpolar(a[2], b[2], t)),
  ];
}

export function css(c: Color): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/** Paleta del cielo en tres bandas (alto, medio, horizonte) por momento del día. */
const CIELOS = {
  noche: [
    [8, 12, 28],
    [16, 22, 48],
    [30, 38, 66],
  ],
  alba: [
    [42, 52, 96],
    [150, 96, 92],
    [232, 150, 96],
  ],
  dia: [
    [47, 93, 146],
    [107, 163, 214],
    [168, 207, 232],
  ],
  ocaso: [
    [38, 46, 88],
    [162, 92, 78],
    [238, 138, 74],
  ],
} as const satisfies Record<string, readonly [Color, Color, Color]>;

export class Reloj {
  /** Minuto del día, 0 a 1440. */
  minutos: number;
  /** Minutos de juego por segundo real. */
  velocidad = VELOCIDAD_POR_DEFECTO;

  constructor(minutosIniciales = 8 * 60) {
    this.minutos = minutosIniciales % 1440;
  }

  /**
   * Salta a una hora concreta. Lo usa la cama: dormir no es acelerar el reloj,
   * es ponerlo en el amanecer de golpe.
   */
  ir(minuto: number): void {
    this.minutos = ((minuto % 1440) + 1440) % 1440;
  }

  avanzar(segundos: number): void {
    this.minutos = (this.minutos + this.velocidad * segundos) % 1440;
  }

  get hora(): string {
    const h = Math.floor(this.minutos / 60);
    const m = Math.floor(this.minutos % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  get esNoche(): boolean {
    return this.minutos >= NOCHE || this.minutos < AMANECER;
  }

  /**
   * Intensidad de la luz solar, 0-255. Las transiciones son suaves para que el
   * mundo no se apague de golpe: el amanecer y el ocaso son la mitad de la
   * gracia de un ciclo día-noche.
   */
  get luzSolar(): number {
    const m = this.minutos;
    if (m >= MEDIA_MANANA && m < ATARDECER) return LUZ_DIA;
    if (m >= AMANECER && m < MEDIA_MANANA) {
      return Math.round(
        interpolar(LUZ_NOCHE, LUZ_DIA, (m - AMANECER) / (MEDIA_MANANA - AMANECER)),
      );
    }
    if (m >= ATARDECER && m < NOCHE) {
      return Math.round(interpolar(LUZ_DIA, LUZ_NOCHE, (m - ATARDECER) / (NOCHE - ATARDECER)));
    }
    return LUZ_NOCHE;
  }

  /** Las tres bandas del degradado del cielo para la hora actual. */
  get colorCielo(): readonly [Color, Color, Color] {
    const m = this.minutos;
    const mezcla = (a: readonly [Color, Color, Color], b: readonly [Color, Color, Color], t: number) =>
      [mezclarColor(a[0], b[0], t), mezclarColor(a[1], b[1], t), mezclarColor(a[2], b[2], t)] as const;

    if (m >= MEDIA_MANANA && m < ATARDECER) return CIELOS.dia;
    if (m >= AMANECER && m < MEDIA_MANANA) {
      const t = (m - AMANECER) / (MEDIA_MANANA - AMANECER);
      // Primero la noche vira a alba, y el alba al día.
      return t < 0.5
        ? mezcla(CIELOS.noche, CIELOS.alba, t * 2)
        : mezcla(CIELOS.alba, CIELOS.dia, (t - 0.5) * 2);
    }
    if (m >= ATARDECER && m < NOCHE) {
      const t = (m - ATARDECER) / (NOCHE - ATARDECER);
      return t < 0.5
        ? mezcla(CIELOS.dia, CIELOS.ocaso, t * 2)
        : mezcla(CIELOS.ocaso, CIELOS.noche, (t - 0.5) * 2);
    }
    return CIELOS.noche;
  }

  /**
   * Tinte de la luz ambiental. De noche tira a azul y al atardecer a ámbar:
   * multiplicar la escena por un gris puro deja las noches sucias y muertas.
   */
  get tinteLuz(): Color {
    const m = this.minutos;
    const dia: Color = [255, 250, 240];
    const noche: Color = [120, 140, 200];
    const calido: Color = [255, 190, 140];
    if (m >= MEDIA_MANANA && m < ATARDECER) return dia;
    if (m >= AMANECER && m < MEDIA_MANANA) {
      const t = (m - AMANECER) / (MEDIA_MANANA - AMANECER);
      return t < 0.5 ? mezclarColor(noche, calido, t * 2) : mezclarColor(calido, dia, (t - 0.5) * 2);
    }
    if (m >= ATARDECER && m < NOCHE) {
      const t = (m - ATARDECER) / (NOCHE - ATARDECER);
      return t < 0.5 ? mezclarColor(dia, calido, t * 2) : mezclarColor(calido, noche, (t - 0.5) * 2);
    }
    return noche;
  }
}

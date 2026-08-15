/**
 * Constantes estructurales del juego.
 *
 * Estas son las decisiones caras de cambiar (ver docs/ROADMAP.md): tocar TILE
 * obliga a rehacer todo el arte y a reajustar cada constante de física; tocar
 * CHUNK afecta a la caché de render, a la iluminación y al formato de guardado.
 */

/** Píxeles de mundo por tile. */
export const TILE = 16;

/** Tiles por lado de un chunk. */
export const CHUNK = 64;

/** Frecuencia del paso fijo de simulación. */
export const TICK_HZ = 60;

/** Duración de un tick de simulación, en segundos. */
export const TICK = 1 / TICK_HZ;

/**
 * Techo de ticks simulados por frame. Sin él, una pestaña que vuelve del
 * segundo plano intenta recuperar minutos de simulación y bloquea el hilo
 * (la "espiral de la muerte").
 */
export const MAX_TICKS_POR_FRAME = 5;

/** Tamaño del jugador en píxeles de mundo (1,25 x 2,6 tiles, como en Terraria). */
export const JUGADOR_ANCHO = 20;
export const JUGADOR_ALTO = 42;

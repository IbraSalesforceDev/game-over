import { TILE } from '../core/constants';
import { esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';
import { crearEnemigo, type Enemigo, type Especie } from './enemies';
import type { Caja } from './physics';

/**
 * Aparición de enemigos.
 *
 * Aparecen fuera de la pantalla pero cerca, para que el jugador se los
 * encuentre en vez de verlos brotar de la nada. La regla es la de siempre en
 * este género: de día la superficie está tranquila y el peligro está abajo; de
 * noche el peligro sube a la superficie.
 */

/** Distancia mínima y máxima de aparición, en tiles. */
const DISTANCIA_MIN = 22;
const DISTANCIA_MAX = 38;
/** Enemigos vivos como máximo alrededor del jugador. */
export const TOPE_ENEMIGOS = 7;
/** Ticks entre intentos de aparición. */
export const INTERVALO_INTENTO = 40;
/** Profundidad, en tiles bajo la superficie, a partir de la cual siempre hay peligro. */
export const PROFUNDIDAD_PELIGRO = 28;

export interface ContextoAparicion {
  /** Es de noche en el mundo. */
  esNoche: boolean;
  /** Altura del terreno en la columna del jugador. */
  superficieTy: number;
}

/** Especies que pueden salir en una situación dada. */
export function especiesPosibles(
  ctx: ContextoAparicion,
  tyJugador: number,
): Especie[] {
  const bajoTierra = tyJugador > ctx.superficieTy + PROFUNDIDAD_PELIGRO;
  if (bajoTierra) return ['slime', 'murcielago', 'zombi'];
  if (ctx.esNoche) return ['zombi', 'slime'];
  // De día en la superficie solo hay slimes, y pocos: el mundo tiene que
  // dejarte construir tranquilo en algún momento.
  return ['slime'];
}

/**
 * Busca un hueco con suelo debajo donde quepa el enemigo. Devuelve null si no
 * encuentra sitio, que es lo normal dentro de la roca maciza.
 */
function buscarSitio(
  mundo: Mundo,
  tx: number,
  tyDesde: number,
  alto: number,
  rng: () => number,
): { x: number; y: number } | null {
  const tyBase = Math.max(2, Math.min(mundo.alto - 4, tyDesde));
  // Escanea unas cuantas filas alrededor de la altura pedida.
  for (let intento = 0; intento < 14; intento++) {
    const ty = tyBase + Math.floor((rng() - 0.5) * 24);
    if (ty < 2 || ty >= mundo.alto - 3) continue;
    if (!esSolido(mundo.getTile(tx, ty + 1))) continue;

    const tilesAlto = Math.ceil(alto / TILE);
    let libre = true;
    for (let d = 0; d < tilesAlto + 1 && libre; d++) {
      if (esSolido(mundo.getTile(tx, ty - d))) libre = false;
    }
    if (!libre) continue;
    return { x: tx * TILE, y: (ty + 1) * TILE - alto };
  }
  return null;
}

/** Sitio para un enemigo volador: un hueco de aire, sin necesidad de suelo. */
function buscarAire(
  mundo: Mundo,
  tx: number,
  tyDesde: number,
  rng: () => number,
): { x: number; y: number } | null {
  for (let intento = 0; intento < 14; intento++) {
    const ty = tyDesde + Math.floor((rng() - 0.5) * 26);
    if (ty < 2 || ty >= mundo.alto - 3) continue;
    if (esSolido(mundo.getTile(tx, ty)) || esSolido(mundo.getTile(tx, ty + 1))) continue;
    return { x: tx * TILE, y: ty * TILE };
  }
  return null;
}

/**
 * Intenta añadir un enemigo. Devuelve el que ha aparecido, o null si no había
 * hueco, ya hay demasiados o no toca.
 */
export function intentarAparicion(
  mundo: Mundo,
  enemigos: Enemigo[],
  jugador: Caja,
  ctx: ContextoAparicion,
  rng: () => number = Math.random,
): Enemigo | null {
  const vivos = enemigos.filter((e) => e.vivo).length;
  if (vivos >= TOPE_ENEMIGOS) return null;

  const txJugador = Math.floor((jugador.x + jugador.ancho / 2) / TILE);
  const tyJugador = Math.floor((jugador.y + jugador.alto / 2) / TILE);

  const posibles = especiesPosibles(ctx, tyJugador);
  if (posibles.length === 0) return null;
  const especie = posibles[Math.floor(rng() * posibles.length)]!;

  const lado = rng() < 0.5 ? -1 : 1;
  const distancia = DISTANCIA_MIN + Math.floor(rng() * (DISTANCIA_MAX - DISTANCIA_MIN));
  const tx = txJugador + lado * distancia;
  if (tx < 3 || tx >= mundo.ancho - 3) return null;

  const def = especie === 'murcielago';
  const sitio = def
    ? buscarAire(mundo, tx, tyJugador, rng)
    : buscarSitio(mundo, tx, tyJugador, especie === 'zombi' ? 40 : 16, rng);
  if (!sitio) return null;

  const e = crearEnemigo(especie, sitio.x, sitio.y);
  enemigos.push(e);
  return e;
}

/** Quita del array los que ya no están vivos. */
export function limpiarEnemigos(enemigos: Enemigo[]): void {
  if (!enemigos.some((e) => !e.vivo)) return;
  const vivos = enemigos.filter((e) => e.vivo);
  enemigos.length = 0;
  enemigos.push(...vivos);
}

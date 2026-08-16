import { TILE } from '../core/constants';
import { ARENA, ARENISCA, esSolido, HIELO, NIEVE } from '../world/tiles';
import type { Mundo } from '../world/world';
import { crearEnemigo, ENEMIGOS, type Enemigo, type Especie } from './enemies';
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

export type BiomaLocal = 'bosque' | 'desierto' | 'nieve';

export interface ContextoAparicion {
  /** Es de noche en el mundo. */
  esNoche: boolean;
  /** Altura del terreno en la columna del jugador. */
  superficieTy: number;
  /** Bioma donde está el jugador. */
  bioma: BiomaLocal;
}

/**
 * Deduce el bioma mirando el terreno que pisa el jugador.
 *
 * Se saca del mundo y no de un mapa guardado a propósito: el mapa de biomas es
 * cosa de la generación y no viaja en las partidas, mientras que la arena y la
 * nieve están ahí siempre. Además así el bioma se mueve con el mundo: si
 * alguien se trae un camión de arena y se monta un desierto, saldrán
 * escarabajos.
 */
export function biomaEn(mundo: Mundo, tx: number, ty: number): BiomaLocal {
  for (let d = 0; d <= 6; d++) {
    const id = mundo.getTile(tx, ty + d);
    if (id === ARENA || id === ARENISCA) return 'desierto';
    if (id === NIEVE || id === HIELO) return 'nieve';
    if (esSolido(id)) return 'bosque';
  }
  return 'bosque';
}

/** Especies que pueden salir en una situación dada. */
export function especiesPosibles(
  ctx: ContextoAparicion,
  tyJugador: number,
): Especie[] {
  const bajoTierra = tyJugador > ctx.superficieTy + PROFUNDIDAD_PELIGRO;
  if (bajoTierra) return ['slime', 'murcielago', 'zombi'];

  // En la superficie manda el bioma. Los animales salen de día en todos menos
  // en el desierto: son la fuente de comida, así que tienen que estar donde el
  // jugador pasa el rato, no escondidos en un rincón del mapa.
  if (ctx.bioma === 'desierto') return ctx.esNoche ? ['escarabajo', 'zombi'] : ['escarabajo'];
  if (ctx.bioma === 'nieve') {
    return ctx.esNoche ? ['lobo', 'zombi'] : ['conejo', 'conejo', 'slime'];
  }

  if (ctx.esNoche) return ['zombi', 'slime'];
  // De día en el bosque hay caza y algún slime. La proporción va por
  // repetición en la lista, que es la forma más simple de dar peso sin montar
  // una tabla de probabilidades para cinco entradas.
  return ['conejo', 'conejo', 'jabali', 'slime'];
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

  const sitio = ENEMIGOS[especie].vuela
    ? buscarAire(mundo, tx, tyJugador, rng)
    : buscarSitio(mundo, tx, tyJugador, ENEMIGOS[especie].alto, rng);
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

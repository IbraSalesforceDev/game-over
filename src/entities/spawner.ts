import { TILE } from '../core/constants';
import {
  dificultad,
  DIFICULTAD_POR_DEFECTO,
  hayHostiles,
  type NivelDificultad,
} from '../core/dificultad';
import {
  ARENA,
  ARENISCA,
  BARRO,
  esSolido,
  HIELO,
  HIERBA_JUNGLA,
  NIEVE,
} from '../world/tiles';
import type { Mundo } from '../world/world';
import { hay, VERSION_ACTUAL } from '../core/versiones';
import {
  CUEVA_DESIERTO,
  CUEVA_NIEVE,
  FORTALEZA,
  FORTALEZA_INFERNAL,
  MINA,
} from '../world/estructuras';
import {
  crearEnemigo,
  ENEMIGOS,
  especieExisteEn,
  PROBABILIDAD_ELITE,
  type Enemigo,
  type Especie,
} from './enemies';
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

/**
 * Luz por encima de la cual no aparece nada hostil.
 *
 * Una antorcha vale 255 y pierde 14 por tile, así que este umbral dibuja un
 * círculo seguro de unos doce tiles a su alrededor. Es la regla que convierte
 * alumbrar la base en una decisión: hasta ahora poner antorchas solo servía
 * para ver, y los zombis salían igual dentro de casa.
 */
export const UMBRAL_LUZ_HOSTIL = 90;

/**
 * Cuánto se debilita lo hostil que sale de día.
 *
 * De día se supone que el mundo está tranquilo: lo que se cuela por una cueva
 * abierta o baja de la montaña no debería pegar como el zombi de las tres de la
 * madrugada. En vez de prohibirlo —y dejar el día completamente vacío— sale con
 * la mitad larga de sus fuerzas.
 */
export const FUERZA_DIURNA = 0.6;

export type BiomaLocal = 'bosque' | 'desierto' | 'nieve' | 'jungla';

export interface ContextoAparicion {
  /** Es de noche en el mundo. */
  esNoche: boolean;
  /** Altura del terreno en la columna del jugador. */
  superficieTy: number;
  /** Bioma donde está el jugador. */
  bioma: BiomaLocal;
  /**
   * Luz del sitio candidato, 0-255. Sin ella se supone oscuridad, que es lo
   * que hacía el juego antes de que las antorchas espantaran nada.
   */
  luzEn?: (tx: number, ty: number) => number;
  /** Dificultad del mundo. Sin ella, normal. */
  dif?: NivelDificultad;
  /** Versión del mundo. Sin ella, la actual: sale todo. */
  version?: string;
  /**
   * Fila en la que empieza el inframundo. Sin ella no hay inframundo, que es
   * lo que corresponde en los mundos anteriores a 5.0.0.
   */
  inframundoTy?: number;
  /**
   * Estructura en la que está el jugador, si está en alguna.
   *
   * Cambia tres cosas a la vez: qué sale, cuánto sale y si puede ser de élite.
   * Una fortaleza vacía es un decorado —se entra, se abren los cofres y se sale
   * sin haber peleado— y eso convertía la mejor recompensa del juego en la más
   * barata de conseguir.
   */
  estructura?: number | null;
}

/**
 * Lo que vive en cada estructura, además de lo que ya salga por el sitio.
 *
 * Cada una tiene lo suyo, y esa es la mitad de la gracia: los esqueletos de la
 * fortaleza dicen de qué está hecha, las momias de la cueva de arenisca dicen
 * en qué bioma estás, y los diablillos de la fortaleza infernal dicen a qué
 * profundidad has llegado. Salen repetidos en la lista porque la lista es la
 * tabla de pesos: dos entradas es el doble de probable.
 */
const GUARNICION: Readonly<Record<number, readonly Especie[]>> = {
  [FORTALEZA]: ['esqueleto', 'esqueleto', 'esqueleto', 'zombi', 'murcielago'],
  [MINA]: ['esqueleto', 'esqueleto', 'murcielago', 'murcielago', 'slime'],
  [CUEVA_DESIERTO]: ['momia', 'momia', 'golem', 'esqueleto'],
  [CUEVA_NIEVE]: ['espectro', 'espectro', 'lobo', 'esqueleto'],
  [FORTALEZA_INFERNAL]: ['diablillo', 'diablillo', 'diablillo', 'esqueleto'],
};

/**
 * Cuánto más deprisa aparecen los bichos dentro de una estructura.
 *
 * El doble. No es un número sacado del aire: el aforo y el intervalo están
 * ajustados para el mundo abierto, donde el jugador se mueve y va dejando
 * bichos atrás. Dentro de una fortaleza no se avanza, se registra —se entra en
 * una sala, se abre un cofre, se vuelve—, así que con la tasa normal daba
 * tiempo a vaciarla entera entre aparición y aparición.
 */
export const RITMO_ESTRUCTURA = 2;

/** ¿Esta especie viene a hacer daño? Los animales, no. */
export function esHostil(especie: Especie): boolean {
  const def = ENEMIGOS[especie];
  return !def.pasivo && def.dano > 0;
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
    if (id === HIERBA_JUNGLA || id === BARRO) return 'jungla';
    if (esSolido(id)) return 'bosque';
  }
  return 'bosque';
}

/** Especies que pueden salir en una situación dada. */
export function especiesPosibles(
  ctx: ContextoAparicion,
  tyJugador: number,
): Especie[] {
  // En pacífico no sale nada que pueda hacer daño, ni en la superficie ni en el
  // fondo de la cueva más honda. Se filtra al final, sobre la lista que tocase,
  // para no tener que mantener una segunda tabla de biomas sin hostiles.
  const v = ctx.version ?? VERSION_ACTUAL;
  // Antes de 2.0.0 no había bichos de ninguna clase: el juego era construir y
  // nada más, y llenarlo de conejos sería inventarse una versión que no fue.
  if (!hay('combate', v)) return [];
  const lista = especiesDelSitio(ctx, tyJugador).filter((e) => especieExisteEn(e, v));
  const dif = ctx.dif ?? dificultad(DIFICULTAD_POR_DEFECTO);
  return hayHostiles(dif) ? lista : lista.filter((e) => !esHostil(e));
}

function especiesDelSitio(ctx: ContextoAparicion, tyJugador: number): Especie[] {
  const bajoTierra = tyJugador > ctx.superficieTy + PROFUNDIDAD_PELIGRO;

  // Dentro de una estructura manda su guarnición, mezclada con lo que saldría
  // por el sitio: si solo saliera la guarnición, una fortaleza en la nieve y
  // otra en el desierto tendrían exactamente los mismos bichos.
  const guarnicion = ctx.estructura != null ? GUARNICION[ctx.estructura] : undefined;
  if (guarnicion) {
    return [...guarnicion, ...especiesDelSitioBase(ctx, tyJugador, bajoTierra)];
  }
  return especiesDelSitioBase(ctx, tyJugador, bajoTierra);
}

function especiesDelSitioBase(
  ctx: ContextoAparicion,
  tyJugador: number,
  bajoTierra: boolean,
): Especie[] {

  // El inframundo manda sobre todo lo demás: se está bajo la roca infernal, y
  // ahí ni hay biomas ni hay noche que valga.
  //
  if (ctx.inframundoTy !== undefined && tyJugador >= ctx.inframundoTy) {
    return ['diablillo', 'diablillo', 'esqueleto'];
  }

  if (bajoTierra) {
    // El subsuelo también tiene bioma. Es lo que da sentido a los setenta y
    // ocho tiles que cada franja gana en 5.0.0: bajar por un desierto lleva a
    // gólems, y bajar por la nieve a espectros, así que la elección de por
    // dónde se cava importa.
    if (ctx.bioma === 'desierto') return ['golem', 'esqueleto', 'murcielago', 'momia'];
    if (ctx.bioma === 'nieve') return ['espectro', 'espectro', 'esqueleto', 'murcielago'];
    if (ctx.bioma === 'jungla') return ['arana', 'arana', 'esqueleto', 'slime'];
    // El esqueleto solo vive abajo: es lo que hace que la cueva sea otra cosa y
    // no la superficie con menos luz.
    return ['slime', 'murcielago', 'zombi', 'esqueleto', 'esqueleto'];
  }

  // En la superficie manda el bioma. Los animales salen de día en todos menos
  // en el desierto: son la fuente de comida, así que tienen que estar donde el
  // jugador pasa el rato, no escondidos en un rincón del mapa.
  // El desierto tiene los suyos: la serpiente a todas horas —es lo que hace que
  // cruzar la arena de día tampoco sea gratis— y la momia solo de noche.
  if (ctx.bioma === 'desierto') {
    return ctx.esNoche
      ? ['escarabajo', 'momia', 'momia', 'serpiente']
      : ['escarabajo', 'serpiente'];
  }
  if (ctx.bioma === 'nieve') {
    return ctx.esNoche ? ['lobo', 'zombi'] : ['conejo', 'conejo', 'gallina', 'slime'];
  }
  // La selva está viva a todas horas: es lo que la hace incómoda de cruzar.
  // Hay caza —jabalíes— pero también serpientes de día y zombis de noche.
  if (ctx.bioma === 'jungla') {
    return ctx.esNoche
      ? ['zombi', 'arana', 'serpiente', 'slime']
      : ['jabali', 'serpiente', 'slime'];
  }

  if (ctx.esNoche) return ['zombi', 'slime'];
  // De día en el bosque hay caza y algún slime. La proporción va por
  // repetición en la lista, que es la forma más simple de dar peso sin montar
  // una tabla de probabilidades para cinco entradas.
  return ['conejo', 'conejo', 'gallina', 'gallina', 'jabali', 'slime'];
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
  const dif = ctx.dif ?? dificultad(DIFICULTAD_POR_DEFECTO);
  const vivos = enemigos.filter((e) => e.vivo).length;
  // El aforo sube con la dificultad, pero nunca baja de uno mientras haya algo
  // que pueda salir: los animales tienen que caber aunque el mundo sea pacífico.
  const dentro = ctx.estructura != null;
  const tope = Math.max(
    1,
    Math.round(TOPE_ENEMIGOS * Math.max(dif.aforo, 0.5) * (dentro ? RITMO_ESTRUCTURA : 1)),
  );
  if (vivos >= tope) return null;

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

  // La luz solo frena a lo hostil: un conejo puede pastar a pleno sol, y
  // espantar la caza con antorchas dejaría al jugador sin comer.
  if (ctx.luzEn && esHostil(especie)) {
    const luz = ctx.luzEn(
      Math.floor(sitio.x / TILE),
      Math.floor((sitio.y + ENEMIGOS[especie].alto / 2) / TILE),
    );
    if (luz > UMBRAL_LUZ_HOSTIL) return null;
  }

  // De día lo hostil sale mermado; de noche, entero. La dificultad multiplica
  // encima: es lo único que separa "tranquilo" de "tú lo has querido".
  const fuerza = esHostil(especie)
    ? dif.fuerza * (ctx.esNoche ? 1 : FUERZA_DIURNA)
    : 1;

  const enSuperficie = tyJugador <= ctx.superficieTy + PROFUNDIDAD_PELIGRO;
  const e = crearEnemigo(
    especie,
    sitio.x,
    sitio.y,
    fuerza,
    esElite(ctx, especie, enSuperficie, rng),
  );
  enemigos.push(e);
  return e;
}

/**
 * ¿Este bicho sale de élite?
 *
 * Solo de noche, solo en la superficie y solo si es hostil. Las tres
 * condiciones son la misma idea: la élite es lo que le pasa a la noche, no una
 * rareza que pueda tocar en cualquier sitio. Bajo tierra ya hay gólems y
 * espectros haciendo ese papel, y una élite a doscientos tiles de profundidad
 * sería el tercer enemigo duro del mismo pasillo.
 */
export function esElite(
  ctx: ContextoAparicion,
  especie: Especie,
  enSuperficie: boolean,
  rng: () => number,
): boolean {
  if (!esHostil(especie)) return false;
  // Dentro de una estructura hay élites a cualquier hora y a cualquier
  // profundidad. La regla de "solo de noche y arriba" era para el mundo
  // abierto, donde de día no pasa nada y bajo tierra ya hay gólems haciendo ese
  // papel; una fortaleza es lo contrario, un sitio al que se va a propósito
  // sabiendo lo que hay, y ahí una élite es la razón de ir preparado.
  const dentro = ctx.estructura != null;
  if (!dentro && (!ctx.esNoche || !enSuperficie)) return false;
  if (!hay('elitesNocturnos', ctx.version ?? VERSION_ACTUAL)) return false;
  // La dificultad también manda aquí: en pacífico no hay hostiles y en brutal
  // la noche tiene que dar miedo de verdad.
  const dif = ctx.dif ?? dificultad(DIFICULTAD_POR_DEFECTO);
  // Y dentro salen el doble: es lo que hace que la fortaleza se sienta
  // defendida y no solo habitada.
  return rng() < PROBABILIDAD_ELITE * dif.fuerza * (dentro ? 2 : 1);
}

/** Quita del array los que ya no están vivos. */
export function limpiarEnemigos(enemigos: Enemigo[]): void {
  if (!enemigos.some((e) => !e.vivo)) return;
  const vivos = enemigos.filter((e) => e.vivo);
  enemigos.length = 0;
  enemigos.push(...vivos);
}

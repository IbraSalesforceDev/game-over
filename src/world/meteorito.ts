import { crearRngRico } from './gen/rng';
import { AIRE, COBALTO, esSolido, OBSIDIANA, PIEDRA, TITANIO } from './tiles';
import type { Mundo } from './world';

/**
 * Meteoritos.
 *
 * Lo que caen las noches de lluvia de estrellas. Un meteorito abre un cráter en
 * la superficie y deja dentro una bolsa de metal de los hondos: es la única
 * forma del juego de conseguir cobalto y titanio sin bajar a por ellos, y por
 * eso el suceso es un regalo y no una amenaza.
 *
 * Cae *cerca* del jugador a propósito, no en un punto cualquiera del mundo. Un
 * cráter a mil tiles de distancia es un cráter que nadie encuentra nunca, y
 * entonces el suceso solo sería un cartel que sale y no cambia nada. Cerca, se
 * oye el impacto, se ve el cráter al amanecer y hay un motivo para salir de casa
 * de noche —que es cuando salen los bichos—, que es exactamente el tipo de
 * decisión que se quería añadir.
 */

/** Radio del cráter, en tiles. */
export const RADIO = 6;
/**
 * Distancia mínima y máxima al jugador, en tiles.
 *
 * La franja es ancha y empieza lejos por una razón que se vio en cuanto se probó
 * de verdad: con la primera —de veinticinco a noventa— una lluvia dejaba cinco
 * cráteres solapados en el mismo trozo de ladera, y si la casa estaba ahí, la
 * casa se iba. Un suceso que es un regalo no puede llevarse por delante lo que
 * has construido. A cuarenta tiles ya no se alcanza el jardín, y repartidos
 * hasta ciento cincuenta, dos cráteres rara vez caen encima del mismo sitio.
 */
export const CERCA = 40;
export const LEJOS = 150;

export interface Impacto {
  tx: number;
  ty: number;
  /** Cuántos tiles de mineral ha dejado. */
  mineral: number;
}

/**
 * Hace caer un meteorito cerca de esta columna. Devuelve dónde ha caído, o null
 * si no ha encontrado sitio.
 *
 * El sitio tiene que ser terreno abierto: buscar la superficie por la columna y
 * comprobar que se ve el cielo. Sin eso, un meteorito podía "caer" dentro de una
 * montaña o en el techo de una cueva y abrir un agujero absurdo en mitad de la
 * roca.
 */
export function caerMeteorito(
  mundo: Mundo,
  txJugador: number,
  alturaCielo: Int32Array,
  rng: () => number = Math.random,
): Impacto | null {
  for (let intento = 0; intento < 24; intento++) {
    const lado = rng() < 0.5 ? -1 : 1;
    const tx = txJugador + lado * (CERCA + Math.floor(rng() * (LEJOS - CERCA)));
    if (tx < RADIO + 2 || tx >= mundo.ancho - RADIO - 2) continue;
    const ty = sueloDe(mundo, tx, alturaCielo[tx] ?? -1);
    if (ty < RADIO + 4 || ty >= mundo.alto - RADIO - 4) continue;
    if (mundo.getLiquido(tx, ty) > 0) continue;
    return excavarCrater(mundo, tx, ty, rng);
  }
  return null;
}

/**
 * La primera fila de suelo de verdad de una columna, o -1 si no hay.
 *
 * No vale con la altura del cielo. Esa tabla marca la primera fila que tapa el
 * sol, y un árbol tapa el sol: en una columna con árbol devuelve la copa, y el
 * primer meteorito que se probó cayó *sobre las hojas*, dejando una montaña de
 * obsidiana a quince tiles del suelo con el tronco saliendo por debajo. Los
 * troncos y las hojas no frenan el paso —no son sólidos— pero sí cuentan como
 * techo, así que hay que bajar hasta pisar algo.
 */
function sueloDe(mundo: Mundo, tx: number, desde: number): number {
  if (desde < 0) return -1;
  for (let ty = desde; ty < Math.min(mundo.alto, desde + 40); ty++) {
    if (esSolido(mundo.getTile(tx, ty))) return ty;
  }
  return -1;
}

/**
 * El cráter: un cuenco de obsidiana con la bolsa de metal en el fondo.
 *
 * La obsidiana no es adorno. Pide pico de nivel alto, así que el cráter no se
 * desmonta con lo que uno lleve encima la primera noche: se ve el metal, se sabe
 * que está ahí y hay que volver con mejor pico. Un regalo que además marca por
 * dónde vas de progresión.
 */
export function excavarCrater(
  mundo: Mundo,
  cx: number,
  cy: number,
  rng: () => number = Math.random,
): Impacto {
  let mineral = 0;
  // El cuenco es más ancho que hondo: un agujero redondo parece un pozo, y lo
  // que deja un impacto es un plato.
  const semiancho = RADIO;
  const semialto = Math.round(RADIO * 0.7);
  for (let dy = -semialto; dy <= semialto + 2; dy++) {
    for (let dx = -semiancho; dx <= semiancho; dx++) {
      const tx = cx + dx;
      const ty = cy + dy;
      if (tx <= 0 || ty <= 0 || tx >= mundo.ancho - 1 || ty >= mundo.alto - 1) continue;
      const d = Math.hypot(dx / semiancho, dy / semialto);
      if (d > 1) continue;
      // El borde queda de obsidiana y el interior se vacía; la última fila de
      // dentro es la que lleva el metal.
      if (d > 0.78) {
        if (esSolido(mundo.getTile(tx, ty))) mundo.setTile(tx, ty, OBSIDIANA);
        continue;
      }
      if (dy >= semialto - 2 && rng() < 0.55) {
        mundo.setTile(tx, ty, rng() < 0.6 ? COBALTO : TITANIO);
        mineral++;
        continue;
      }
      mundo.setTile(tx, ty, AIRE);
      // La pared se queda: un cráter con el cielo de fondo por el agujero se
      // lee como un error del terreno, no como un socavón.
      if (mundo.getPared(tx, ty) === AIRE) mundo.setPared(tx, ty, PIEDRA);
    }
  }
  return { tx: cx, ty: cy, mineral };
}

/** Un rng determinista a partir de una semilla, para poder probarlo. */
export function rngDe(semilla: number): () => number {
  return crearRngRico(semilla);
}

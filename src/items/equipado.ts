import { Inventario } from './inventory';
import {
  defensaDe,
  defObjeto,
  esArmadura,
  huecoDe,
  HUECOS,
  NADA,
  poderDe,
  type Hueco,
} from './items';
import type { ClasePoder } from './inscripciones';

/**
 * Armadura puesta.
 *
 * Son tres ranuras y se guardan en un `Inventario` normal, no en una estructura
 * propia: así el panel del inventario reutiliza el mismo `tocarRanura` que ya
 * mueve objetos entre la mochila y el cofre, y el guardado reutiliza `aDatos`.
 * Lo único que hace falta encima es una regla de qué cabe en cada hueco.
 */

/** Orden fijo de las ranuras: cabeza, torso, piernas. */
export const RANURAS_EQUIPO = HUECOS.length;

export function crearEquipo(): Inventario {
  return new Inventario(RANURAS_EQUIPO);
}

/** Índice de la ranura donde va este hueco. */
export function indiceDeHueco(h: Hueco): number {
  return HUECOS.indexOf(h);
}

/** ¿Cabe este objeto en esta ranura de equipo? */
export function cabeEnEquipo(objeto: number, indice: number): boolean {
  // El hueco vacío siempre se puede dejar vacío: sacar una pieza no se
  // comprueba, solo meterla.
  if (objeto === NADA) return true;
  if (!esArmadura(objeto)) return false;
  const h = huecoDe(objeto);
  return h !== null && indiceDeHueco(h) === indice;
}

/**
 * El poder que trae la armadura puesta, o null si ninguna pieza trae ninguno.
 *
 * Se recorre el equipo entero y no solo el torso: hoy los poderes vienen en los
 * petos, pero atar la búsqueda a una ranura concreta sería escribir esa
 * casualidad en el código y tener que buscarla el día que un casco traiga uno.
 * Gana la primera pieza que lo tenga, en el orden de las ranuras.
 */
export function poderPuesto(equipo: Inventario): ClasePoder | null {
  for (const r of equipo.ranuras) {
    if (r.cantidad <= 0) continue;
    const p = poderDe(r.objeto);
    if (p !== null) return p;
  }
  return null;
}

/**
 * Defensa total del equipo puesto.
 *
 * Se recalcula en cada golpe en vez de guardarse: son tres sumas, y un valor
 * cacheado es un valor que se olvida de actualizar el día que la armadura se
 * rompa, se encante o se pierda al morir.
 */
export function defensaTotal(equipo: Inventario): number {
  let total = 0;
  for (const r of equipo.ranuras) {
    if (r.cantidad > 0) total += defensaDe(r.objeto);
  }
  return total;
}

/**
 * Los colores de lo que se lleva puesto, hueco a hueco.
 *
 * Es lo único que el render necesita saber de la armadura: la forma de cada
 * pieza la pone el sprite y no cambia entre metales. Devuelve un array del
 * tamaño de `HUECOS` con el color de cada pieza, o null donde no haya nada.
 */
export function coloresEquipo(equipo: Inventario): (string | null)[] {
  return HUECOS.map((_, i) => {
    const r = equipo.ranuras[i];
    if (!r || r.cantidad <= 0 || !esArmadura(r.objeto)) return null;
    return defObjeto(r.objeto).color;
  });
}

/**
 * Fracción del golpe que la armadura nunca puede parar.
 *
 * Sin este suelo, juntar defensa suficiente volvería al jugador inmune y el
 * combate dejaría de existir. Con él, la mejor armadura del juego reduce el
 * golpe a la cuarta parte y ni un punto más.
 */
export const MINIMO_PASA = 0.25;

/** Daño que llega después de la armadura. Nunca menos de uno. */
export function danoTrasArmadura(dano: number, defensa: number): number {
  if (dano <= 0) return 0;
  const suelo = dano * MINIMO_PASA;
  return Math.max(1, Math.round(Math.max(suelo, dano - defensa)));
}

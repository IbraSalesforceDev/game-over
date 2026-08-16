import { ANTORCHA, esBlando } from '../world/tiles';
import { Inventario } from './inventory';
import {
  defObjeto,
  esHerramienta,
  esPala,
  ESPADA_MADERA,
  nivelHerramienta,
  PICO_MADERA,
} from './items';

/**
 * Equipo con el que empieza una partida y consultas sobre herramientas.
 *
 * El pico inicial no es un regalo: sin herramienta no se puede minar nada, y
 * empezar sin poder cavar sería empezar sin juego. Lo mismo con la espada desde
 * que hay enemigos: la primera noche cae a los pocos minutos de empezar, y
 * llegar a ella sin nada con lo que defenderse no es dificultad, es una trampa.
 * Las antorchas ya se pueden fabricar, pero se dan unas cuantas para que la
 * primera cueva no dependa de haber talado un árbol antes.
 */

export const PICO_INICIAL = PICO_MADERA;
export const ESPADA_INICIAL = ESPADA_MADERA;
export const ANTORCHA_INICIAL = 20;

export function equipoInicial(): Inventario {
  const inv = new Inventario();
  inv.anadir(PICO_INICIAL, 1);
  inv.anadir(ESPADA_INICIAL, 1);
  inv.anadir(ANTORCHA, ANTORCHA_INICIAL);
  return inv;
}

/**
 * Potencia con la que pican las manos desnudas.
 *
 * No es cero: quedarse sin pico no puede ser quedarse encerrado, y la tierra,
 * la hierba, la arena, la nieve, las hojas y la madera son cosas que se apartan
 * a manotazos. Es lo bastante baja —menos de la mitad que el pico de madera—
 * como para que nadie prefiera cavar así teniendo herramienta. Lo que las manos
 * no pueden es *entrar en la piedra*: eso lo decide el nivel, no la potencia.
 */
export const POTENCIA_MANO = 24;

/**
 * Potencia de picado de lo que se lleva en la mano.
 *
 * Antes se usaba el mejor pico del inventario estuviera donde estuviera, para
 * ahorrar el baile de teclas entre picar y construir. Se ha cambiado porque el
 * efecto secundario era peor que el problema: con una antorcha en la mano se
 * picaba exactamente igual de rápido que con el pico, así que la herramienta
 * dejaba de verse. Ahora manda la mano, como en Terraria, y de paso el objeto
 * que se sostiene significa algo.
 */
export function potenciaEnMano(objeto: number): number {
  if (!esHerramienta(objeto)) return POTENCIA_MANO;
  return defObjeto(objeto).potencia ?? POTENCIA_MANO;
}

/**
 * Penalización de la pala fuera de su terreno.
 *
 * Con la pala en la mano la piedra se pica a la décima parte. No se prohíbe
 * —quedarse encerrado por llevar la herramienta equivocada sería cruel— pero
 * cuesta lo bastante como para que uno cambie de ranura.
 */
export const CASTIGO_PALA = 0.1;

/**
 * Potencia real contra un tile concreto.
 *
 * Es donde se cruza la herramienta con el material: la pala vuela en lo blando
 * y se atasca en lo demás, y el pico al revés. Sin esto una pala solo podría
 * ser "un pico más rápido", y entonces sustituiría al pico en vez de
 * acompañarlo.
 */
export function potenciaContra(objeto: number, tile: number): number {
  const base = potenciaEnMano(objeto);
  if (!esPala(objeto)) return base;
  return esBlando(tile) ? base : base * CASTIGO_PALA;
}

/** Nivel de la herramienta en la mano. Las manos son nivel 0. */
export function nivelEnMano(objeto: number): number {
  return nivelHerramienta(objeto);
}

/** El mejor pico que lleve encima. Solo para avisos de interfaz. */
export function mejorPico(inventario: Inventario): number {
  let mejor = 0;
  for (const r of inventario.ranuras) {
    if (r.cantidad <= 0 || !esHerramienta(r.objeto)) continue;
    const potencia = defObjeto(r.objeto).potencia ?? 0;
    if (potencia > mejor) mejor = potencia;
  }
  return mejor;
}

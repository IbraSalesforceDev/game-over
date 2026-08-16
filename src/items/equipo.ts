import { ANTORCHA } from '../world/tiles';
import { Inventario } from './inventory';
import { defObjeto, esHerramienta, ESPADA_MADERA, PICO_MADERA } from './items';

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
 * Potencia de picado de lo que se lleva en la mano. 0 si eso no es un pico.
 *
 * Antes se usaba el mejor pico del inventario estuviera donde estuviera, para
 * ahorrar el baile de teclas entre picar y construir. Se ha cambiado porque el
 * efecto secundario era peor que el problema: con una antorcha en la mano se
 * picaba exactamente igual de rápido que con el pico, así que la herramienta
 * dejaba de verse. Ahora manda la mano, como en Terraria, y de paso el objeto
 * que se sostiene significa algo.
 */
export function potenciaEnMano(objeto: number): number {
  if (!esHerramienta(objeto)) return 0;
  return defObjeto(objeto).potencia ?? 0;
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

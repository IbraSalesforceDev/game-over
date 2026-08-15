import { ANTORCHA } from '../world/tiles';
import { Inventario } from './inventory';
import { defObjeto, esHerramienta, PICO_COBRE } from './items';

/**
 * Equipo con el que empieza una partida y consultas sobre herramientas.
 *
 * El pico inicial no es un regalo: sin herramienta no se puede minar nada, y
 * empezar sin poder cavar sería empezar sin juego. Las antorchas ya se pueden
 * fabricar con madera, pero se dan unas cuantas para que la primera cueva no
 * dependa de haber talado un árbol antes.
 */

export const PICO_INICIAL = PICO_COBRE;
export const ANTORCHA_INICIAL = 20;

export function equipoInicial(): Inventario {
  const inv = new Inventario();
  inv.anadir(PICO_INICIAL, 1);
  inv.anadir(ANTORCHA, ANTORCHA_INICIAL);
  return inv;
}

/**
 * Potencia del mejor pico que lleve encima, 0 si no lleva ninguno.
 *
 * Se usa el mejor y no el seleccionado a propósito: obligar a cambiar de ranura
 * entre picar y colocar convierte cada túnel en un baile de teclas sin aportar
 * nada. La herramienta sigue importando —hace falta tenerla, y una mejor pica
 * más rápido—, pero no estorba.
 */
export function mejorPico(inventario: Inventario): number {
  let mejor = 0;
  for (const r of inventario.ranuras) {
    if (r.cantidad <= 0 || !esHerramienta(r.objeto)) continue;
    const potencia = defObjeto(r.objeto).potencia ?? 0;
    if (potencia > mejor) mejor = potencia;
  }
  return mejor;
}

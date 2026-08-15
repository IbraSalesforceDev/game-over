import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../core/constants';
import type { Mundo } from '../world/world';
import { actualizarFisica, crearCaja, type Ajustes, type Caja, type Entrada } from './physics';

export interface Jugador {
  caja: Caja;
  /** Posición del tick anterior, para interpolar en el render. */
  xPrev: number;
  yPrev: number;
  /** Punto de reaparición en píxeles de mundo. */
  spawnX: number;
  spawnY: number;
}

export function crearJugador(txSpawn: number, tySpawn: number): Jugador {
  const x = txSpawn * TILE;
  const y = tySpawn * TILE;
  return {
    caja: crearCaja(x, y, JUGADOR_ANCHO, JUGADOR_ALTO),
    xPrev: x,
    yPrev: y,
    spawnX: x,
    spawnY: y,
  };
}

export function actualizarJugador(
  mundo: Mundo,
  j: Jugador,
  entrada: Entrada,
  aj: Ajustes,
  sumergido = 0,
): void {
  j.xPrev = j.caja.x;
  j.yPrev = j.caja.y;
  actualizarFisica(mundo, j.caja, entrada, aj, sumergido);
}

export function reaparecer(j: Jugador): void {
  j.caja.x = j.spawnX;
  j.caja.y = j.spawnY;
  j.caja.vx = 0;
  j.caja.vy = 0;
  j.xPrev = j.spawnX;
  j.yPrev = j.spawnY;
}

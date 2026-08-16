import { TILE } from '../core/constants';
import type { Caja } from '../entities/physics';
import { AIRE, defTile, esPlataforma, esSolido, nivelPicoTile } from './tiles';
import type { Mundo } from './world';

/**
 * Reglas de minar y colocar.
 *
 * Todo son funciones puras sobre el mundo y la caja del jugador: aquí no hay
 * ratón ni canvas, para poder probar las reglas sin navegador.
 */

/** Alcance del jugador, en tiles, medido de centro a centro. */
export const ALCANCE = 5.5;

/**
 * Filas de arriba del mundo donde no se puede construir.
 *
 * La cámara se para al llegar al techo pero el jugador seguía subiendo por su
 * propia escalera hasta salirse de la vista, construyendo a ciegas. En vez de
 * dejar que la cámara persiga hasta el infinito, el techo es un límite de
 * verdad: ahí arriba no se coloca nada, así que no hay forma de seguir subiendo.
 */
export const TECHO_CONSTRUIBLE = 6;

/**
 * Potencia de referencia: la dureza de un tile son los ticks que tarda en
 * romperse con un pico de potencia 100. La potencia real la pone la
 * herramienta que lleve el jugador.
 */
export const POTENCIA_PICO = 100;

export type Capa = 'bloque' | 'pared';

export function distanciaTiles(caja: Caja, tx: number, ty: number): number {
  const cx = (caja.x + caja.ancho / 2) / TILE;
  const cy = (caja.y + caja.alto / 2) / TILE;
  return Math.hypot(cx - (tx + 0.5), cy - (ty + 0.5));
}

export function enAlcance(caja: Caja, tx: number, ty: number): boolean {
  return distanciaTiles(caja, tx, ty) <= ALCANCE;
}

/** ¿El tile se solapa con la caja del jugador? */
export function solapaJugador(caja: Caja, tx: number, ty: number): boolean {
  const x0 = tx * TILE;
  const y0 = ty * TILE;
  return (
    caja.x < x0 + TILE &&
    caja.x + caja.ancho > x0 &&
    caja.y < y0 + TILE &&
    caja.y + caja.alto > y0
  );
}

/**
 * Un bloque necesita apoyo: un vecino ortogonal de la misma capa o una pared
 * detrás. Sin esta regla se pueden construir islas flotantes en mitad del
 * cielo de un solo clic.
 */
export function tieneApoyo(mundo: Mundo, tx: number, ty: number): boolean {
  if (mundo.getPared(tx, ty) !== AIRE) return true;
  const vecinos = [
    mundo.getTile(tx, ty - 1),
    mundo.getTile(tx + 1, ty),
    mundo.getTile(tx, ty + 1),
    mundo.getTile(tx - 1, ty),
  ];
  return vecinos.some((id) => esSolido(id) || esPlataforma(id));
}

export interface Resultado {
  ok: boolean;
  /** Motivo del rechazo, para que el HUD pueda explicarlo. */
  motivo?:
    | 'alcance'
    | 'ocupado'
    | 'vacio'
    | 'jugador'
    | 'limites'
    | 'nada'
    | 'herramienta';
  /** Nivel de pico que pedía el tile, cuando el motivo es 'herramienta'. */
  nivelPedido?: number;
}

const OK: Resultado = { ok: true };

/** ¿Está la posición dentro de la franja donde sí se puede edificar? */
export function alturaEdificable(ty: number): boolean {
  return ty >= TECHO_CONSTRUIBLE;
}

export function puedeColocarBloque(
  mundo: Mundo,
  caja: Caja,
  tx: number,
  ty: number,
  id: number,
): Resultado {
  if (!mundo.dentro(tx, ty)) return { ok: false, motivo: 'limites' };
  if (!alturaEdificable(ty)) return { ok: false, motivo: 'limites' };
  if (!enAlcance(caja, tx, ty)) return { ok: false, motivo: 'alcance' };
  if (mundo.getTile(tx, ty) !== AIRE) return { ok: false, motivo: 'ocupado' };
  // Las plataformas sí se pueden poner bajo los pies: es como se construye
  // hacia arriba. Los macizos, no.
  if (!esPlataforma(id) && solapaJugador(caja, tx, ty)) {
    return { ok: false, motivo: 'jugador' };
  }
  if (!tieneApoyo(mundo, tx, ty)) return { ok: false, motivo: 'vacio' };
  return OK;
}

export function puedeColocarPared(
  mundo: Mundo,
  caja: Caja,
  tx: number,
  ty: number,
): Resultado {
  if (!mundo.dentro(tx, ty)) return { ok: false, motivo: 'limites' };
  if (!alturaEdificable(ty)) return { ok: false, motivo: 'limites' };
  if (!enAlcance(caja, tx, ty)) return { ok: false, motivo: 'alcance' };
  if (mundo.getPared(tx, ty) !== AIRE) return { ok: false, motivo: 'ocupado' };
  const apoyo =
    mundo.getPared(tx, ty - 1) !== AIRE ||
    mundo.getPared(tx + 1, ty) !== AIRE ||
    mundo.getPared(tx, ty + 1) !== AIRE ||
    mundo.getPared(tx - 1, ty) !== AIRE ||
    mundo.getTile(tx, ty) !== AIRE ||
    esSolido(mundo.getTile(tx, ty - 1)) ||
    esSolido(mundo.getTile(tx + 1, ty)) ||
    esSolido(mundo.getTile(tx, ty + 1)) ||
    esSolido(mundo.getTile(tx - 1, ty));
  return apoyo ? OK : { ok: false, motivo: 'vacio' };
}

/**
 * ¿Se puede empezar a picar aquí con la herramienta que se lleva?
 *
 * `nivel` es el nivel del objeto en la mano: 0 son las manos, 1 el pico de
 * madera, y así hasta el de oro. Es la única puerta del sistema de niveles —
 * `avanzarPicado` no lo comprueba porque el bucle llama aquí antes cada tick, y
 * duplicar la regla en dos sitios es la forma segura de que se desincronicen.
 */
export function puedeMinar(
  mundo: Mundo,
  caja: Caja,
  tx: number,
  ty: number,
  capa: Capa,
  nivel = Infinity,
): Resultado {
  if (!mundo.dentro(tx, ty)) return { ok: false, motivo: 'limites' };
  // Minar no tiene techo: si algo llegó ahí arriba, se puede quitar.
  if (!enAlcance(caja, tx, ty)) return { ok: false, motivo: 'alcance' };
  const id = capa === 'bloque' ? mundo.getTile(tx, ty) : mundo.getPared(tx, ty);
  if (id === AIRE) return { ok: false, motivo: 'nada' };
  const pedido = nivelPicoTile(id);
  if (pedido > nivel) return { ok: false, motivo: 'herramienta', nivelPedido: pedido };
  return OK;
}

/** Estado del picado en curso. Solo se mina un tile a la vez. */
export interface Picado {
  tx: number;
  ty: number;
  capa: Capa;
  progreso: number;
}

export function crearPicado(): Picado {
  return { tx: -1, ty: -1, capa: 'bloque', progreso: 0 };
}

/** Etapa de grieta 0-3 según lo avanzado que vaya el picado. */
export function etapaGrieta(p: Picado, dureza: number): number {
  if (dureza <= 0) return 0;
  return Math.min(3, Math.floor((p.progreso / dureza) * 4));
}

/**
 * Avanza el picado un tick. Devuelve true si el tile se ha roto.
 * Cambiar de objetivo reinicia el progreso: no se acumula daño de un bloque a
 * otro.
 */
export function avanzarPicado(
  mundo: Mundo,
  p: Picado,
  tx: number,
  ty: number,
  capa: Capa,
  potencia = POTENCIA_PICO,
): boolean {
  if (p.tx !== tx || p.ty !== ty || p.capa !== capa) {
    p.tx = tx;
    p.ty = ty;
    p.capa = capa;
    p.progreso = 0;
  }
  const id = capa === 'bloque' ? mundo.getTile(tx, ty) : mundo.getPared(tx, ty);
  if (id === AIRE) {
    p.progreso = 0;
    return false;
  }
  // Las paredes cuestan un 50 % más: picar el fondo de una cueva es tedioso a
  // propósito, igual que en Terraria.
  const dureza = defTile(id).dureza * (capa === 'pared' ? 1.5 : 1);
  p.progreso += potencia / 100;
  if (p.progreso >= dureza) {
    if (capa === 'bloque') mundo.setTile(tx, ty, AIRE);
    else mundo.setPared(tx, ty, AIRE);
    p.progreso = 0;
    return true;
  }
  return false;
}

export function reiniciarPicado(p: Picado): void {
  p.tx = -1;
  p.ty = -1;
  p.progreso = 0;
}

/** Dureza efectiva del objetivo actual, para pintar la grieta. */
export function durezaObjetivo(mundo: Mundo, p: Picado): number {
  const id =
    p.capa === 'bloque' ? mundo.getTile(p.tx, p.ty) : mundo.getPared(p.tx, p.ty);
  return defTile(id).dureza * (p.capa === 'pared' ? 1.5 : 1);
}

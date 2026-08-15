import { TILE } from '../core/constants';
import type { Inventario } from '../items/inventory';
import { maxPila, NADA } from '../items/items';
import type { Mundo } from '../world/world';
import { moverX, moverY, type Caja } from './physics';

/**
 * Objetos sueltos por el suelo.
 *
 * Tienen su propia física, mucho más simple que la del jugador, pero reutilizan
 * `moverX` y `moverY`: son las mismas rutinas de colisión contra la rejilla que
 * ya están probadas, así que un drop tampoco puede atravesar el suelo.
 *
 * Cuando el jugador se acerca, el objeto sale disparado hacia él. Ese imán no
 * es un adorno: sin él hay que pasar por encima de cada tile exacto y recoger
 * lo que has minado se convierte en una tarea.
 */

/** Tamaño del objeto en el mundo, en píxeles. */
export const TAMANO_DROP = 8;
/** Distancia a la que el objeto empieza a perseguir al jugador, en tiles. */
export const RADIO_IMAN = 5;
/** Distancia a la que se recoge, en píxeles. */
const RADIO_RECOGIDA = 14;
/** Ticks que tarda un objeto recién soltado en poder recogerse. */
const RETARDO_RECOGIDA = 20;
/** Ticks que sobrevive un objeto en el suelo antes de desaparecer. */
export const VIDA_DROP = 60 * 60 * 5;

const GRAVEDAD = 0.35;
const VEL_TERMINAL = 9;
const ROZAMIENTO = 0.86;
const REBOTE = 0.35;
const FUERZA_IMAN = 0.55;
const VEL_MAX_IMAN = 7;

export interface Drop {
  objeto: number;
  cantidad: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Ticks vividos, para el balanceo visual y para la caducidad. */
  edad: number;
  vivo: boolean;
}

export function crearDrop(
  objeto: number,
  cantidad: number,
  tx: number,
  ty: number,
  rng: () => number = Math.random,
): Drop {
  return {
    objeto,
    cantidad,
    // Centrado en el tile, menos el propio tamaño del objeto.
    x: tx * TILE + (TILE - TAMANO_DROP) / 2,
    y: ty * TILE + (TILE - TAMANO_DROP) / 2,
    // Un empujoncito al azar para que dos drops del mismo sitio no se solapen.
    vx: (rng() - 0.5) * 2.2,
    vy: -1.6 - rng() * 0.8,
    edad: 0,
    vivo: true,
  };
}

/** Caja reutilizada en cada actualización: cero asignaciones en el bucle. */
const caja: Caja = {
  x: 0,
  y: 0,
  ancho: TAMANO_DROP,
  alto: TAMANO_DROP,
  vx: 0,
  vy: 0,
  enSuelo: false,
  mirando: 1,
  ticksCoyote: 0,
  ticksBuffer: 0,
  ticksSalto: 0,
  saltando: false,
  yInicioCaida: 0,
  ultimaCaida: 0,
};

export interface CentroJugador {
  x: number;
  y: number;
}

/**
 * Avanza un drop un tick. Devuelve true si el jugador lo ha recogido.
 * El inventario decide: si no cabe, el objeto se queda en el suelo.
 */
export function actualizarDrop(
  mundo: Mundo,
  d: Drop,
  jugador: CentroJugador,
  inventario: Inventario,
): boolean {
  d.edad++;
  if (d.edad > VIDA_DROP) {
    d.vivo = false;
    return false;
  }

  const cx = d.x + TAMANO_DROP / 2;
  const cy = d.y + TAMANO_DROP / 2;
  const dx = jugador.x - cx;
  const dy = jugador.y - cy;
  const distancia = Math.hypot(dx, dy);

  const puedeRecogerse = d.edad >= RETARDO_RECOGIDA;
  const atraible = puedeRecogerse && distancia < RADIO_IMAN * TILE;

  if (atraible && distancia > 0.001) {
    d.vx += (dx / distancia) * FUERZA_IMAN;
    d.vy += (dy / distancia) * FUERZA_IMAN;
    const v = Math.hypot(d.vx, d.vy);
    if (v > VEL_MAX_IMAN) {
      d.vx = (d.vx / v) * VEL_MAX_IMAN;
      d.vy = (d.vy / v) * VEL_MAX_IMAN;
    }
  } else {
    d.vy += GRAVEDAD;
    if (d.vy > VEL_TERMINAL) d.vy = VEL_TERMINAL;
  }

  // Volcamos el estado en la caja compartida para reutilizar la colisión del
  // jugador, que ya sabe no atravesar tiles.
  caja.x = d.x;
  caja.y = d.y;
  caja.vx = d.vx;
  caja.vy = d.vy;

  const pasos = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(d.vx), Math.abs(d.vy)) / (TILE - 1)),
  );
  for (let i = 0; i < pasos; i++) {
    if (moverX(mundo, caja, d.vx / pasos)) {
      d.vx = -d.vx * REBOTE;
      caja.vx = d.vx;
    }
    const r = moverY(mundo, caja, d.vy / pasos, false);
    if (r.colision) {
      // Al tocar suelo se frena en horizontal: si no, los objetos patinan.
      if (r.suelo && !atraible) d.vx *= ROZAMIENTO;
      d.vy = 0;
      caja.vy = 0;
    }
  }
  d.x = caja.x;
  d.y = caja.y;
  if (!atraible) d.vx *= 0.995;

  if (puedeRecogerse && distancia < RADIO_RECOGIDA) {
    const antes = d.cantidad;
    const sobra = inventario.anadir(d.objeto, d.cantidad);
    if (sobra < antes) {
      d.cantidad = sobra;
      if (d.cantidad <= 0) {
        d.vivo = false;
        return true;
      }
    }
  }
  return false;
}

/**
 * Junta drops iguales que estén pegados. Picar una veta genera decenas de
 * objetos en dos tiles y sin esto la pantalla se llena de cuadraditos.
 */
export function fusionarDrops(drops: Drop[], radio = 12): void {
  for (let i = 0; i < drops.length; i++) {
    const a = drops[i]!;
    if (!a.vivo) continue;
    const tope = maxPila(a.objeto);
    for (let j = i + 1; j < drops.length; j++) {
      const b = drops[j]!;
      if (!b.vivo || b.objeto !== a.objeto) continue;
      if (a.cantidad >= tope) break;
      if (Math.abs(a.x - b.x) > radio || Math.abs(a.y - b.y) > radio) continue;
      const cabe = Math.min(tope - a.cantidad, b.cantidad);
      a.cantidad += cabe;
      b.cantidad -= cabe;
      if (b.cantidad <= 0) b.vivo = false;
    }
  }
}

/** Suelta un objeto en el mundo si el tile lo produce. */
export function soltar(
  drops: Drop[],
  objeto: number,
  tx: number,
  ty: number,
  rng?: () => number,
): void {
  if (objeto === NADA) return;
  drops.push(crearDrop(objeto, 1, tx, ty, rng));
}

import { defObjeto } from '../items/items';
import { danarEnemigo, solapan, type Enemigo } from './enemies';
import type { Caja } from './physics';

/**
 * Golpe cuerpo a cuerpo.
 *
 * El arma barre un rectángulo delante del jugador durante unos pocos ticks.
 * No es un cono ni una animación con huesos: para un juego de tiles, una caja
 * que aparece delante durante ocho ticks se lee igual de bien y se puede
 * probar sin dibujar nada.
 *
 * Cada golpe lleva su propia lista de enemigos ya tocados, así que un mismo
 * mandoble no puede pegar dos veces al mismo bicho.
 */

/** Ticks que el arma está "activa" dentro de la animación. */
export const TICKS_GOLPE = 8;

export interface Golpe {
  /** Ticks que quedan de animación; 0 = quieto. */
  restante: number;
  /** Ticks hasta poder volver a golpear. */
  recarga: number;
  /** Hacia dónde salió el golpe. */
  direccion: 1 | -1;
  /** Objeto con el que se golpeó, para dibujarlo. */
  arma: number;
  /** Enemigos ya alcanzados por este golpe. */
  tocados: Set<Enemigo>;
}

export function crearGolpe(): Golpe {
  return { restante: 0, recarga: 0, direccion: 1, arma: 0, tocados: new Set() };
}

export function tickGolpe(g: Golpe): void {
  if (g.restante > 0) g.restante--;
  if (g.recarga > 0) g.recarga--;
  if (g.restante === 0 && g.tocados.size > 0) g.tocados.clear();
}

/** ¿Se puede lanzar un golpe ahora mismo? */
export function puedeGolpear(g: Golpe): boolean {
  return g.recarga <= 0;
}

/** Lanza un golpe con el arma dada. Devuelve false si aún está recargando. */
export function lanzarGolpe(g: Golpe, arma: number, direccion: 1 | -1): boolean {
  if (!puedeGolpear(g)) return false;
  const def = defObjeto(arma);
  g.restante = TICKS_GOLPE;
  g.recarga = def.cadencia ?? 30;
  g.direccion = direccion;
  g.arma = arma;
  g.tocados.clear();
  return true;
}

/** Caja que barre el arma, delante del jugador. */
export function cajaGolpe(g: Golpe, jugador: Caja): Caja | null {
  if (g.restante <= 0) return null;
  const def = defObjeto(g.arma);
  const alcance = def.alcance ?? 34;
  const alto = jugador.alto * 0.8;
  return {
    x: g.direccion > 0 ? jugador.x + jugador.ancho : jugador.x - alcance,
    y: jugador.y + jugador.alto * 0.1,
    ancho: alcance,
    alto,
    vx: 0,
    vy: 0,
    enSuelo: false,
    mirando: g.direccion,
    ticksCoyote: 0,
    ticksBuffer: 0,
    ticksSalto: 0,
    saltando: false,
    nadaba: false,
    yInicioCaida: 0,
    ultimaCaida: 0,
  };
}

export interface ResultadoGolpe {
  /** Enemigos alcanzados en este tick. */
  alcanzados: number;
  /** Los que han muerto por el golpe. */
  muertos: Enemigo[];
}

/**
 * Aplica el golpe activo a los enemigos que toque. Se llama cada tick mientras
 * dura la animación; la lista de tocados evita repetir.
 */
export function resolverGolpe(
  g: Golpe,
  jugador: Caja,
  enemigos: readonly Enemigo[],
): ResultadoGolpe {
  const salida: ResultadoGolpe = { alcanzados: 0, muertos: [] };
  const caja = cajaGolpe(g, jugador);
  if (!caja) return salida;

  const def = defObjeto(g.arma);
  const dano = def.dano ?? 0;
  if (dano <= 0) return salida;

  const desdeX = jugador.x + jugador.ancho / 2;
  for (const e of enemigos) {
    if (!e.vivo || g.tocados.has(e)) continue;
    if (!solapan(caja, e.caja)) continue;
    g.tocados.add(e);
    salida.alcanzados++;
    if (danarEnemigo(e, dano, desdeX)) salida.muertos.push(e);
  }
  return salida;
}

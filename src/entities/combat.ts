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

/**
 * Hacia dónde sale el mandoble.
 *
 * El ratón manda, pero se redondea a uno de los tres ejes en vez de usar el
 * ángulo tal cual: un arco diagonal exacto pediría una caja rotada —y con ella,
 * colisiones que ya no son AABB— para ganar muy poco. Con tres direcciones se
 * pega hacia arriba al slime que salta encima y hacia abajo al que espera en el
 * hueco, que es justo lo que faltaba.
 */
export type Sentido = 'lado' | 'arriba' | 'abajo';

/** A partir de qué inclinación deja de contar como golpe horizontal. */
const SENO_VERTICAL = Math.sin((50 * Math.PI) / 180);

/** Redondea un vector de apuntado al eje que domina. */
export function sentidoDeVector(dx: number, dy: number): Sentido {
  const largo = Math.hypot(dx, dy);
  if (largo < 1e-6) return 'lado';
  const seno = dy / largo;
  if (seno <= -SENO_VERTICAL) return 'arriba';
  if (seno >= SENO_VERTICAL) return 'abajo';
  return 'lado';
}

export interface Golpe {
  /** Ticks que quedan de animación; 0 = quieto. */
  restante: number;
  /** Ticks hasta poder volver a golpear. */
  recarga: number;
  /** Hacia dónde salió el golpe. */
  direccion: 1 | -1;
  /** Si fue hacia el lado, hacia arriba o hacia abajo. */
  sentido: Sentido;
  /** Objeto con el que se golpeó, para dibujarlo. */
  arma: number;
  /** Enemigos ya alcanzados por este golpe. */
  tocados: Set<Enemigo>;
}

export function crearGolpe(): Golpe {
  return {
    restante: 0,
    recarga: 0,
    direccion: 1,
    sentido: 'lado',
    arma: 0,
    tocados: new Set(),
  };
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
export function lanzarGolpe(
  g: Golpe,
  arma: number,
  direccion: 1 | -1,
  sentido: Sentido = 'lado',
): boolean {
  if (!puedeGolpear(g)) return false;
  const def = defObjeto(arma);
  g.restante = TICKS_GOLPE;
  g.recarga = def.cadencia ?? 30;
  g.direccion = direccion;
  g.sentido = sentido;
  g.arma = arma;
  g.tocados.clear();
  return true;
}

/**
 * Caja que barre el arma.
 *
 * Sale delante del jugador, o por encima o por debajo si se apuntó ahí. El
 * grosor del arco vertical es algo mayor que el propio jugador: barrer una
 * columna exactamente igual de ancha que uno mismo obliga a alinearse al píxel
 * con el bicho de arriba, y eso no es puntería, es lotería.
 */
export function cajaGolpe(g: Golpe, jugador: Caja): Caja | null {
  if (g.restante <= 0) return null;
  const def = defObjeto(g.arma);
  const alcance = def.alcance ?? 34;

  let x: number;
  let y: number;
  let ancho: number;
  let alto: number;
  if (g.sentido === 'lado') {
    ancho = alcance;
    alto = jugador.alto * 0.8;
    x = g.direccion > 0 ? jugador.x + jugador.ancho : jugador.x - alcance;
    y = jugador.y + jugador.alto * 0.1;
  } else {
    ancho = jugador.ancho * 1.6;
    alto = alcance;
    x = jugador.x + jugador.ancho / 2 - ancho / 2;
    y = g.sentido === 'abajo' ? jugador.y + jugador.alto : jugador.y - alcance;
  }

  return {
    x,
    y,
    ancho,
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
  /** Los que han recibido el golpe, para poder sacar chispas donde toca. */
  tocados: Enemigo[];
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
  multiplicador = 1,
): ResultadoGolpe {
  const salida: ResultadoGolpe = { alcanzados: 0, tocados: [], muertos: [] };
  const caja = cajaGolpe(g, jugador);
  if (!caja) return salida;

  const def = defObjeto(g.arma);
  const dano = (def.dano ?? 0) * multiplicador;
  if (dano <= 0) return salida;

  const desdeX = jugador.x + jugador.ancho / 2;
  for (const e of enemigos) {
    if (!e.vivo || g.tocados.has(e)) continue;
    if (!solapan(caja, e.caja)) continue;
    g.tocados.add(e);
    salida.alcanzados++;
    salida.tocados.push(e);
    if (danarEnemigo(e, dano, desdeX)) salida.muertos.push(e);
  }
  return salida;
}

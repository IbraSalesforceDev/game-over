import { defObjeto } from '../items/items';
import { danarEnemigo, solapan, type Enemigo } from './enemies';
import { hayVista } from './ataques';
import type { Caja } from './physics';
import type { Mundo } from '../world/world';

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
  /**
   * Jugadores ya alcanzados por este golpe, por su número de red.
   *
   * Aparte de `tocados` y no dentro: un jugador no es un `Enemigo` y meterlo en
   * el mismo conjunto pediría inventarse uno de mentira. Son dos listas porque
   * son dos clases de víctima, no por descuido.
   */
  tocadosJugador: Set<number>;
}

export function crearGolpe(): Golpe {
  return {
    restante: 0,
    recarga: 0,
    direccion: 1,
    sentido: 'lado',
    arma: 0,
    tocados: new Set(),
    tocadosJugador: new Set(),
  };
}

export function tickGolpe(g: Golpe): void {
  if (g.restante > 0) g.restante--;
  if (g.recarga > 0) g.recarga--;
  if (g.restante === 0 && g.tocados.size > 0) g.tocados.clear();
  if (g.restante === 0 && g.tocadosJugador.size > 0) g.tocadosJugador.clear();
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
  g.tocadosJugador.clear();
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
 * Dónde se tocan dos cajas: el centro de lo que se solapa.
 *
 * Es el punto al que hay que llegar para que el golpe cuente, y por eso es el
 * que se mira para saber si hay pared por medio. Mirar el centro del bicho
 * sería mirar más lejos de lo que llega el arma.
 */
function puntoDeContacto(a: Caja, b: Caja): { x: number; y: number } {
  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.ancho, b.x + b.ancho);
  const y0 = Math.max(a.y, b.y);
  const y1 = Math.min(a.y + a.alto, b.y + b.alto);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

/**
 * Aplica el golpe activo a los enemigos que toque. Se llama cada tick mientras
 * dura la animación; la lista de tocados evita repetir.
 *
 * Con `mundo` puesto, el golpe además tiene que llegar: un arma con dos tiles de
 * alcance cruzaba una pared de un bloque y mataba desde el otro lado sin
 * asomarse, que era la forma barata de limpiar una cueva. Va como parámetro y no
 * como regla fija porque los mundos viejos se juegan con las reglas que tenían.
 */
export function resolverGolpe(
  g: Golpe,
  jugador: Caja,
  enemigos: readonly Enemigo[],
  multiplicador = 1,
  mundo: Mundo | null = null,
): ResultadoGolpe {
  const salida: ResultadoGolpe = { alcanzados: 0, tocados: [], muertos: [] };
  const caja = cajaGolpe(g, jugador);
  if (!caja) return salida;

  const def = defObjeto(g.arma);
  const dano = (def.dano ?? 0) * multiplicador;
  if (dano <= 0) return salida;

  const desdeX = jugador.x + jugador.ancho / 2;
  const desdeY = jugador.y + jugador.alto / 2;
  for (const e of enemigos) {
    if (!e.vivo || g.tocados.has(e)) continue;
    if (!solapan(caja, e.caja)) continue;
    if (mundo) {
      const p = puntoDeContacto(caja, e.caja);
      if (!hayVista(mundo, desdeX, desdeY, p.x, p.y)) continue;
    }
    g.tocados.add(e);
    salida.alcanzados++;
    salida.tocados.push(e);
    if (danarEnemigo(e, dano, desdeX)) salida.muertos.push(e);
  }
  return salida;
}

/**
 * Un jugador, visto como algo a lo que se puede pegar.
 *
 * Lleva el interruptor de duelo dentro a propósito. La regla —«hacen falta los
 * dos»— cabe entera en `resolverGolpeAJugadores` y se puede probar sin red, sin
 * mundo y sin menús; si el interruptor se mirara fuera, la regla estaría
 * repartida por tres ficheros y no habría un sitio donde leerla.
 */
export interface Duelista {
  /** Su número de red. El anfitrión es el 1. */
  id: number;
  caja: Caja;
  /** Ticks de invulnerabilidad que le quedan. */
  invulnerable: number;
  /** Si tiene el duelo encendido. */
  duelo: boolean;
}

/** A quién le ha entrado el golpe y cuánto pegaba. */
export interface DanoAJugador {
  id: number;
  dano: number;
  /** Desde dónde vino, para el empujón. */
  desdeX: number;
}

/**
 * El mismo mandoble, aplicado a los demás jugadores.
 *
 * Es una función aparte de `resolverGolpe` y no un parámetro más porque lo que
 * devuelve es distinto: de un bicho se sabe todo aquí —se le baja la vida y se
 * mira si ha muerto— y de un jugador solo se puede decir «a este le han dado y
 * pegaba tanto». La armadura, el empujón y la muerte los aplica cada uno en su
 * casa, igual que con los golpes de los bichos. Aquí no se toca a nadie: se
 * devuelve la lista y ya la reparte quien corresponda.
 *
 * Las tres puertas, en orden:
 *
 * 1. **Quien pega tiene que querer pegar.** Sin duelo encendido no sale nada,
 *    y esto se mira antes que nada para que el mandoble de siempre no pague ni
 *    un recorrido de más.
 * 2. **Quien recibe también.** Es lo que impide que un mandoble a un bicho, con
 *    un amigo picando al lado, le cueste la partida al amigo.
 * 3. **Uno mismo no cuenta**, y lo demás es idéntico al golpe a un bicho: mismo
 *    alcance, misma línea de visión, misma memoria de tocados para que un
 *    barrido no pegue dos veces.
 */
export function resolverGolpeAJugadores(
  g: Golpe,
  atacante: Duelista,
  objetivos: readonly Duelista[],
  multiplicador = 1,
  mundo: Mundo | null = null,
): DanoAJugador[] {
  const salida: DanoAJugador[] = [];
  if (!atacante.duelo) return salida;
  const caja = cajaGolpe(g, atacante.caja);
  if (!caja) return salida;

  const def = defObjeto(g.arma);
  const dano = (def.dano ?? 0) * multiplicador;
  if (dano <= 0) return salida;

  const desdeX = atacante.caja.x + atacante.caja.ancho / 2;
  const desdeY = atacante.caja.y + atacante.caja.alto / 2;
  for (const o of objetivos) {
    if (o.id === atacante.id || !o.duelo || o.invulnerable > 0) continue;
    if (g.tocadosJugador.has(o.id)) continue;
    if (!solapan(caja, o.caja)) continue;
    if (mundo) {
      const p = puntoDeContacto(caja, o.caja);
      if (!hayVista(mundo, desdeX, desdeY, p.x, p.y)) continue;
    }
    g.tocadosJugador.add(o.id);
    salida.push({ id: o.id, dano, desdeX });
  }
  return salida;
}

import { TILE } from '../core/constants';
import { ALTAR, COFRE, TILES, esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';
import { danarEnemigo, type Enemigo } from './enemies';
import type { Caja } from './physics';

/**
 * Bombas y dinamita.
 *
 * Son el primer objeto del juego que rompe terreno sin picarlo, y eso cambia
 * cómo se mina: hasta ahora bajar era un túnel de un tile hecho a golpe de pico,
 * y con esto se abre una sala de un tirón. No sustituye al pico —cuesta pólvora,
 * y la pólvora cuesta carbón y arena— pero convierte el metal sobrante en tiempo
 * ahorrado, que es exactamente lo que le faltaba a la minería tardía.
 *
 * No son flechas con más daño y por eso no van en `proyectiles.ts`: una flecha
 * se clava en lo primero que toca y una bomba **rebota y rueda**, que es lo que
 * hace que se pueda tirar por un pozo o colar por debajo de una repisa. Y sobre
 * todo, una bomba le explota en la cara a quien la tira si la tira mal: eso es
 * lo que impide que sea un pico mejor y gratis.
 */

/** Gravedad de un explosivo. Bastante más que la de una flecha: pesa. */
const GRAVEDAD = 0.34;
/**
 * Cuánta velocidad conserva al rebotar contra el terreno.
 *
 * Bajo a propósito. Con 0,42 la bomba se pasaba la mecha entera dando botes, y
 * como el rozamiento solo muerde cuando toca suelo, apenas frenaba: una
 * dinamita tirada a diez tiles acababa estallando a once del que la tiró y casi
 * siempre fuera de la pantalla. Un explosivo que no se sabe dónde va a estallar
 * no se puede usar para nada.
 */
const REBOTE = 0.3;
/** Rozamiento al rodar por el suelo, por tick apoyado. */
const ROZAMIENTO = 0.72;
/** Radio del cuerpo en píxeles: media celda. */
const RADIO_CUERPO = TILE * 0.4;
/** Pasos de subdivisión por tick, para no atravesar una pared fina. */
const PASO_MAX = TILE / 2;

/** Tope de explosivos a la vez. */
export const TOPE_BOMBAS = 24;

export type TipoExplosivo = 'bomba' | 'dinamita';

export interface Explosivo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Ticks que quedan de mecha. Al llegar a cero, estalla. */
  mecha: number;
  /** Radio de la explosión, en tiles. */
  radio: number;
  /** Daño en el centro. Cae con la distancia. */
  dano: number;
  /**
   * Dureza máxima de tile que revienta.
   *
   * Es el freno que impide que la dinamita sea la llave maestra del juego: el
   * ladrillo de fortaleza y el del inframundo están por encima de los dos
   * valores, así que una fortaleza sigue habiendo que abrirla con el pico que
   * toca. Volar la roca de alrededor no te mete dentro.
   */
  rompe: number;
  tipo: TipoExplosivo;
  vivo: boolean;
  /** Ticks vividos, para el parpadeo de la mecha. */
  edad: number;
}

/** Los dos explosivos y lo que hace cada uno. */
export const EXPLOSIVOS: Readonly<Record<TipoExplosivo, Omit<Explosivo, 'x' | 'y' | 'vx' | 'vy' | 'vivo' | 'edad' | 'tipo'>>> = {
  // La bomba es de mano: mecha corta, agujero de tres tiles y no entra en la
  // piedra dura. Sirve para abrir una veta o para quitarse tres bichos de
  // encima, no para reformar una montaña.
  bomba: { mecha: 110, radio: 3.2, dano: 55, rompe: 120 },
  // La dinamita es el doble de todo y tarda el doble en estallar. Con esa mecha
  // hay tiempo de tirarla y salir corriendo, que es justo lo que hay que hacer:
  // su radio es más grande que la distancia a la que se tira.
  dinamita: { mecha: 200, radio: 6.5, dano: 120, rompe: 220 },
};

export function crearExplosivo(
  tipo: TipoExplosivo,
  x: number,
  y: number,
  vx: number,
  vy: number,
): Explosivo {
  return { ...EXPLOSIVOS[tipo], tipo, x, y, vx, vy, vivo: true, edad: 0 };
}

/** Lanza desde el pecho hacia un punto, igual que el arco. */
export function lanzarDesde(
  tipo: TipoExplosivo,
  lanzador: Caja,
  haciaX: number,
  haciaY: number,
  velocidad: number,
): Explosivo {
  const ox = lanzador.x + lanzador.ancho / 2;
  const oy = lanzador.y + lanzador.alto * 0.4;
  const dx = haciaX - ox;
  const dy = haciaY - oy;
  const largo = Math.hypot(dx, dy);
  const ux = largo < 1e-6 ? lanzador.mirando : dx / largo;
  const uy = largo < 1e-6 ? 0 : dy / largo;
  // Se le suma la velocidad del que la tira: correr y lanzar hacia delante tira
  // más lejos que lanzar parado, que es lo que espera cualquiera.
  return crearExplosivo(tipo, ox, oy, ux * velocidad + lanzador.vx * 0.5, uy * velocidad - 1.2);
}

/** Un tile que la explosión ha roto, con lo que había, para soltar el drop. */
export interface TileRoto {
  tx: number;
  ty: number;
  tile: number;
}

export interface Estallido {
  x: number;
  y: number;
  /** Radio en píxeles, para el fogonazo. */
  radio: number;
  tipo: TipoExplosivo;
  rotos: TileRoto[];
  impactos: { enemigo: Enemigo; muerto: boolean }[];
  /** Daño que le toca al jugador, o 0 si estaba fuera del radio. */
  danoJugador: number;
}

/**
 * Tiles que ninguna explosión rompe, por dureza que tengan.
 *
 * El cofre porque volarlo se llevaría por delante lo que hay dentro sin
 * devolverlo —sería perder el botín de una fortaleza por tirar mal una bomba— y
 * el altar porque no se recoge: romperlo es tirarlo, y hacerlo sin querer
 * dejaría el mundo sin jefe.
 */
const INMUNES: ReadonlySet<number> = new Set([COFRE, ALTAR]);

/**
 * Un tick de todos los explosivos: mover, rebotar y, al acabarse la mecha,
 * estallar.
 *
 * `cajaJugador` puede faltar —los tests no siempre tienen jugador— y entonces
 * simplemente nadie se lleva el daño propio.
 */
export function actualizarExplosivos(
  mundo: Mundo,
  bombas: Explosivo[],
  enemigos: readonly Enemigo[],
  cajaJugador?: Caja,
): Estallido[] {
  const salida: Estallido[] = [];

  for (const b of bombas) {
    if (!b.vivo) continue;
    b.edad++;
    b.mecha--;

    if (b.mecha <= 0) {
      salida.push(detonar(mundo, b, enemigos, cajaJugador));
      b.vivo = false;
      continue;
    }

    b.vy += GRAVEDAD;

    const largo = Math.hypot(b.vx, b.vy);
    const pasos = Math.max(1, Math.ceil(largo / PASO_MAX));
    for (let i = 0; i < pasos; i++) {
      // Por ejes separados, igual que el jugador: moviendo los dos a la vez, una
      // bomba que cae en diagonal contra una esquina rebota hacia dentro de la
      // pared y se queda temblando ahí hasta que estalla.
      b.x += b.vx / pasos;
      if (chocaEn(mundo, b.x, b.y)) {
        b.x -= b.vx / pasos;
        b.vx = -b.vx * REBOTE;
      }
      b.y += b.vy / pasos;
      if (chocaEn(mundo, b.x, b.y)) {
        b.y -= b.vy / pasos;
        // Al tocar suelo pierde el rebote vertical y además frena en horizontal.
        // El rozamiento se cobra en cualquier choque vertical y no solo cayendo:
        // cobrándolo solo al caer, una bomba que rebota sube y baja sin apoyarse
        // nunca del todo y conserva casi toda la velocidad horizontal.
        b.vx *= ROZAMIENTO;
        b.vy = -b.vy * REBOTE;
        if (Math.abs(b.vy) < 0.9) b.vy = 0;
      }
    }

    // Fuera del mundo no explota: desaparece. Una explosión en el borde no
    // tendría a quién hacer daño y sí podría reventar la columna de piedra que
    // hace de pared del mundo.
    if (
      b.x < 0 ||
      b.y < 0 ||
      b.x >= mundo.ancho * TILE ||
      b.y >= mundo.alto * TILE
    ) {
      b.vivo = false;
    }
  }

  return salida;
}

/** ¿El cuerpo del explosivo toca terreno sólido en esta posición? */
function chocaEn(mundo: Mundo, x: number, y: number): boolean {
  for (const dx of [-RADIO_CUERPO, RADIO_CUERPO]) {
    for (const dy of [-RADIO_CUERPO, RADIO_CUERPO]) {
      const tx = Math.floor((x + dx) / TILE);
      const ty = Math.floor((y + dy) / TILE);
      if (esSolido(mundo.getTile(tx, ty))) return true;
    }
  }
  return false;
}

/**
 * La explosión: rompe terreno, reparte daño y devuelve todo lo que ha pasado.
 *
 * No modifica ni enemigos ni jugador más allá del daño; los drops y el
 * repintado los hace quien la llama, porque el mundo no sabe de inventarios.
 */
export function detonar(
  mundo: Mundo,
  b: Explosivo,
  enemigos: readonly Enemigo[],
  cajaJugador?: Caja,
): Estallido {
  const radioPx = b.radio * TILE;
  const est: Estallido = {
    x: b.x,
    y: b.y,
    radio: radioPx,
    tipo: b.tipo,
    rotos: [],
    impactos: [],
    danoJugador: 0,
  };

  // --- Terreno ---
  const cx = b.x / TILE;
  const cy = b.y / TILE;
  const r = b.radio;
  for (let ty = Math.floor(cy - r); ty <= Math.ceil(cy + r); ty++) {
    for (let tx = Math.floor(cx - r); tx <= Math.ceil(cx + r); tx++) {
      // El borde del mundo no se toca: es la caja que impide salirse.
      if (tx <= 0 || ty <= 0 || tx >= mundo.ancho - 1 || ty >= mundo.alto - 1) continue;
      // Se mide al centro del tile y no a su esquina, o el agujero sale cuadrado
      // por un lado y mordido por el otro.
      const d = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy);
      if (d > r) continue;
      const id = mundo.getTile(tx, ty);
      if (id === 0 || INMUNES.has(id)) continue;
      const def = TILES[id];
      if (!def || def.dureza > b.rompe) continue;
      est.rotos.push({ tx, ty, tile: id });
    }
  }

  // --- Bichos ---
  for (const e of enemigos) {
    if (!e.vivo) continue;
    const ex = e.caja.x + e.caja.ancho / 2;
    const ey = e.caja.y + e.caja.alto / 2;
    const d = Math.hypot(ex - b.x, ey - b.y);
    if (d > radioPx) continue;
    const muerto = danarEnemigo(e, danoA(b.dano, d, radioPx), b.x);
    est.impactos.push({ enemigo: e, muerto });
  }

  // --- Y el que la ha tirado ---
  if (cajaJugador) {
    const jx = cajaJugador.x + cajaJugador.ancho / 2;
    const jy = cajaJugador.y + cajaJugador.alto / 2;
    const d = Math.hypot(jx - b.x, jy - b.y);
    // El daño propio es la mitad. Tiene que doler de verdad —si no, la forma
    // óptima de minar sería tirarse bombas a los pies— pero una dinamita a
    // bocajarro mataría de un golpe a cualquiera, y morir por usar la
    // herramienta como se usa no enseña nada.
    if (d <= radioPx) est.danoJugador = Math.max(1, Math.round(danoA(b.dano, d, radioPx) / 2));
  }

  return est;
}

/** Daño según la distancia: entero en el centro, la mitad en el borde. */
function danoA(dano: number, distancia: number, radio: number): number {
  return Math.max(1, Math.round(dano * (1 - 0.5 * (distancia / radio))));
}

/** Quita los muertos del array. */
export function limpiarExplosivos(bombas: Explosivo[]): void {
  if (!bombas.some((b) => !b.vivo)) return;
  const vivos = bombas.filter((b) => b.vivo);
  bombas.length = 0;
  bombas.push(...vivos);
}

/** Hace sitio para uno nuevo sacrificando el más viejo si hace falta. */
export function anadirExplosivo(bombas: Explosivo[], nuevo: Explosivo): void {
  limpiarExplosivos(bombas);
  if (bombas.length >= TOPE_BOMBAS) bombas.shift();
  bombas.push(nuevo);
}

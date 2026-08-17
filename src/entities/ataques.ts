import { TILE } from '../core/constants';
import { esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';
import { DURACION, type ClaseEfecto } from './efectos';
import type { Caja } from './physics';

/**
 * Ataques especiales de los enemigos.
 *
 * Hasta aquí todos los bichos hacían exactamente lo mismo: acercarse y tocarte.
 * Cambiaban el aguante, el daño y la forma de moverse, pero la respuesta del
 * jugador era siempre la misma —pegar o apartarse—, y por eso una momia y un
 * zombi se peleaban igual aunque uno viviera en el desierto y el otro en el
 * bosque.
 *
 * Un ataque a distancia rompe eso, porque apartarse deja de ser gratis: hay que
 * mirar dónde está el bicho *y* qué hay entre él y tú. Y como cada uno lanza lo
 * suyo, cruzar un bioma pasa a tener un color propio: en el desierto vuelan
 * bolas de fuego, en la nieve te congelan y en la selva te envenenan.
 *
 * El módulo no sabe quién dispara ni a quién: recibe un punto de salida y un
 * objetivo, y devuelve proyectiles que luego alguien mueve. Eso permite
 * probar todas las trayectorias sin un solo bicho.
 */

export type ClaseAtaque = 'bolaDeFuego' | 'arena' | 'ventisca' | 'veneno' | 'hueso';

export interface DefAtaque {
  readonly nombre: string;
  /** Daño del impacto, antes de la armadura. */
  readonly dano: number;
  /** Píxeles por tick. */
  readonly velocidad: number;
  /** Hasta dónde busca al jugador para decidir disparar, en tiles. */
  readonly alcance: number;
  /** Ticks entre disparos. */
  readonly cadencia: number;
  /** Cuántos salen de una vez. */
  readonly salvas: number;
  /** Cuánto se abre el abanico cuando salen varios, en radianes. */
  readonly abanico: number;
  /** Efecto que pega al acertar, si pega alguno. */
  readonly efecto?: ClaseEfecto;
  readonly duracionEfecto: number;
  /** Le afecta la gravedad: cae mientras vuela. */
  readonly pesa: boolean;
  readonly color: string;
  readonly radio: number;
  readonly desde: string;
}

function ataque(nombre: string, extra: Partial<DefAtaque> & { color: string }): DefAtaque {
  return {
    nombre,
    dano: 12,
    velocidad: 4,
    alcance: 16,
    cadencia: 150,
    salvas: 1,
    abanico: 0,
    duracionEfecto: DURACION.ataque,
    pesa: false,
    radio: 4,
    desde: '6.10.0',
    ...extra,
  };
}

/**
 * Los cinco ataques.
 *
 * Tres llevan efecto y dos no, y no es un olvido: si todos pegaran un estado,
 * cruzar cualquier sitio sería llevar tres cosas encima a la vez y el remedio
 * dejaría de ser una decisión para ser una obligación. Los dos que no lo llevan
 * —la arena y el hueso— se compensan por otro lado: la arena sale de tres en
 * tres y el hueso vuela el doble de rápido, así que esquivarlos también cuesta.
 */
export const ATAQUES: Readonly<Record<ClaseAtaque, DefAtaque>> = {
  bolaDeFuego: ataque('bola de fuego', {
    color: '#ff8a3a',
    dano: 16,
    velocidad: 3.6,
    alcance: 18,
    cadencia: 160,
    efecto: 'ardiendo',
    radio: 5,
  }),
  arena: ataque('ráfaga de arena', {
    color: '#d8b96a',
    dano: 9,
    velocidad: 4.6,
    alcance: 13,
    cadencia: 190,
    salvas: 3,
    abanico: 0.34,
    radio: 3,
  }),
  ventisca: ataque('ventisca', {
    color: '#a8e0f5',
    dano: 11,
    velocidad: 4.2,
    alcance: 15,
    cadencia: 170,
    efecto: 'congelado',
    radio: 4,
  }),
  veneno: ataque('escupitajo', {
    color: '#8fd14a',
    dano: 8,
    velocidad: 4.4,
    alcance: 14,
    cadencia: 140,
    efecto: 'veneno',
    // Pesa: se lanza en arco, así que subirse a algo lo evita y agacharse no.
    pesa: true,
    radio: 3,
  }),
  hueso: ataque('hueso lanzado', {
    color: '#e4dfcc',
    dano: 14,
    velocidad: 7,
    alcance: 17,
    cadencia: 200,
    pesa: true,
    radio: 3,
  }),
};

/**
 * Lo que multiplica la élite en sus ataques especiales.
 *
 * Dispara casi el doble de seguido y saca un proyectil más. No pega más por
 * disparo —de eso ya se encarga su multiplicador de fuerza—, sino más a menudo,
 * que es lo que obliga a moverse en vez de a aguantar.
 */
export const CADENCIA_ELITE = 0.55;
export const SALVAS_ELITE = 1;

/** Gravedad de los proyectiles que pesan, en píxeles por tick². */
const GRAVEDAD = 0.14;
/** Ticks que vive un disparo antes de apagarse solo. */
const VIDA_MAXIMA = 60 * 6;

export interface Disparo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  clase: ClaseAtaque;
  dano: number;
  vivo: boolean;
  edad: number;
  /** Ángulo con el que se dibuja. */
  angulo: number;
}

/**
 * Los proyectiles que saca un ataque, apuntando a un punto.
 *
 * `fuerza` es la del bicho que dispara: un zombi de madrugada en brutal escupe
 * lo mismo pero hace más daño, igual que pasa con sus golpes. Sin eso, el
 * ataque especial sería lo único del juego que no escala y llegaría a ser una
 * cosquilla.
 */
export function lanzarAtaque(
  clase: ClaseAtaque,
  desdeX: number,
  desdeY: number,
  haciaX: number,
  haciaY: number,
  fuerza = 1,
  elite = false,
): Disparo[] {
  const def = ATAQUES[clase];
  const dx = haciaX - desdeX;
  const dy = haciaY - desdeY;
  const base = Math.atan2(dy, dx);
  // Los que pesan se apuntan un poco por encima, o el arco los deja siempre
  // cortos: apuntar al centro y caer a media distancia no se lee como un tiro
  // en arco sino como un tiro que falla.
  const correccion = def.pesa ? -Math.min(0.45, Math.hypot(dx, dy) / (TILE * 60)) : 0;
  const cuantos = def.salvas + (elite ? SALVAS_ELITE : 0);
  const salida: Disparo[] = [];
  for (let i = 0; i < cuantos; i++) {
    // Repartidos alrededor del centro: con uno solo sale recto, con tres sale
    // uno al centro y dos abiertos.
    const paso = cuantos === 1 ? 0 : i / (cuantos - 1) - 0.5;
    const angulo = base + correccion + paso * def.abanico * (cuantos - 1);
    salida.push({
      x: desdeX,
      y: desdeY,
      vx: Math.cos(angulo) * def.velocidad,
      vy: Math.sin(angulo) * def.velocidad,
      clase,
      dano: Math.max(1, Math.round(def.dano * fuerza)),
      vivo: true,
      edad: 0,
      angulo,
    });
  }
  return salida;
}

export interface ImpactoDisparo {
  disparo: Disparo;
  x: number;
  y: number;
}

export interface ResultadoDisparos {
  /** Los que han acertado al jugador. */
  aciertos: ImpactoDisparo[];
  /** Los que se han estrellado contra el terreno, para sacar chispas. */
  choques: ImpactoDisparo[];
}

/**
 * Avanza todos los disparos un tick y resuelve lo que toquen.
 *
 * El avance va por pasos de menos de un tile, igual que en las flechas: un
 * hueso a siete píxeles por tick atravesaría una pared de un tile si se moviera
 * de una vez, y recibir un disparo a través de la roca es de las cosas que peor
 * se leen en un juego de bloques.
 */
export function avanzarDisparos(
  mundo: Mundo,
  disparos: Disparo[],
  jugador: Caja,
): ResultadoDisparos {
  const salida: ResultadoDisparos = { aciertos: [], choques: [] };

  for (const d of disparos) {
    if (!d.vivo) continue;
    const def = ATAQUES[d.clase];
    if (def.pesa) d.vy += GRAVEDAD;
    if (++d.edad > VIDA_MAXIMA) {
      d.vivo = false;
      continue;
    }
    d.angulo = Math.atan2(d.vy, d.vx);

    const pasos = Math.max(1, Math.ceil(Math.hypot(d.vx, d.vy) / (TILE - 2)));
    for (let i = 0; i < pasos && d.vivo; i++) {
      d.x += d.vx / pasos;
      d.y += d.vy / pasos;

      if (fueraDelMundo(mundo, d)) {
        d.vivo = false;
        break;
      }
      if (esSolido(mundo.getTile(Math.floor(d.x / TILE), Math.floor(d.y / TILE)))) {
        d.vivo = false;
        salida.choques.push({ disparo: d, x: d.x, y: d.y });
        break;
      }
      if (dentroDe(jugador, d.x, d.y)) {
        d.vivo = false;
        salida.aciertos.push({ disparo: d, x: d.x, y: d.y });
        break;
      }
    }
  }

  return salida;
}

function dentroDe(c: Caja, x: number, y: number): boolean {
  return x >= c.x && x <= c.x + c.ancho && y >= c.y && y <= c.y + c.alto;
}

function fueraDelMundo(mundo: Mundo, d: Disparo): boolean {
  return d.x < 0 || d.y < 0 || d.x >= mundo.ancho * TILE || d.y >= mundo.alto * TILE;
}

/** Quita del array los que ya no vuelan. */
export function limpiarDisparos(disparos: Disparo[]): void {
  if (!disparos.some((d) => !d.vivo)) return;
  const vivos = disparos.filter((d) => d.vivo);
  disparos.length = 0;
  disparos.push(...vivos);
}

/**
 * ¿Hay línea recta despejada entre estos dos puntos?
 *
 * Sin esto, un gólem al otro lado de una pared de roca dispara igual y el
 * jugador recibe arena de la nada. Se mira cada medio tile, que es suficiente:
 * lo que se quiere evitar es disparar a través de un muro, no acertar por un
 * hueco de un píxel.
 */
export function hayVista(
  mundo: Mundo,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  const d = Math.hypot(x1 - x0, y1 - y0);
  const pasos = Math.ceil(d / (TILE / 2));
  for (let i = 1; i < pasos; i++) {
    const t = i / pasos;
    const tx = Math.floor((x0 + (x1 - x0) * t) / TILE);
    const ty = Math.floor((y0 + (y1 - y0) * t) / TILE);
    if (esSolido(mundo.getTile(tx, ty))) return false;
  }
  return true;
}

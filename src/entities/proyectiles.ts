import { TILE } from '../core/constants';
import { esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';
import { danarEnemigo, solapan, type Enemigo } from './enemies';
import type { Caja } from './physics';

/**
 * Flechas.
 *
 * No usan `moverX`/`moverY` como el jugador y los enemigos: una flecha es un
 * punto, no una caja de 26×46, y resolver por ejes separados le daría un rebote
 * en las esquinas que no tiene sentido para algo que vuela. Se mueve en pasos
 * cortos y en cuanto un paso cae dentro de un tile sólido, ahí se clava.
 *
 * El arco no es "la espada pero de lejos": pega menos por flechazo y gasta
 * munición. Lo que compra es distancia, y con ella la posibilidad de tumbar al
 * zombi antes de que llegue — a cambio de tener que fabricar flechas.
 */

/** Gravedad de la flecha. Menos que la del jugador: vuela tenso y luego cae. */
const GRAVEDAD = 0.16;
/** Ticks que una flecha vive en el aire antes de rendirse. */
const VIDA_VUELO = 260;
/** Ticks que una flecha clavada se queda a la vista antes de desaparecer. */
export const VIDA_CLAVADA = 180;
/** Pasos de subdivisión por tick: nunca avanza más de medio tile de golpe. */
const PASO_MAX = TILE / 2;

/** Tope de flechas a la vez. Pasado, la más vieja deja sitio a la nueva. */
export const TOPE_FLECHAS = 40;

export interface Flecha {
  x: number;
  y: number;
  vx: number;
  vy: number;
  dano: number;
  vivo: boolean;
  /** Ticks que lleva existiendo. */
  edad: number;
  /** Se ha clavado en el terreno: ya no se mueve ni hace daño. */
  clavada: boolean;
  /** Ángulo con el que se dibuja; se congela al clavarse. */
  angulo: number;
  /**
   * Enemigos que todavía puede atravesar antes de pararse.
   *
   * Es lo que hace distinta a la flecha de hueso. Una flecha normal se gasta en
   * el primer bicho al que acierta, así que contra un grupo hay que disparar
   * tantas veces como bichos haya; la de hueso cruza la fila. Con eso el pasillo
   * estrecho, que era el peor sitio para el arco, pasa a ser el mejor.
   */
  perfora: number;
  /**
   * Radio en tiles de la explosión al pararse, o 0 si no estalla.
   *
   * La de fuego cambia a qué se apunta: contra un enemigo suelto no da más que
   * la de hueso, pero contra tres juntos reparte a los tres, y contra uno que
   * esquiva basta con acertarle al suelo de al lado.
   */
  estalla: number;
  /** Color con el que se dibuja, para distinguir los tipos en el aire. */
  color: string;
  /**
   * A quién ha tocado ya, para no cobrarle dos veces.
   *
   * Vive en la flecha y no en el tick, y esa es toda la diferencia entre que la
   * perforación funcione o no. Un zombi mide veinte píxeles de ancho y la
   * flecha avanza ocho por tick: pasa dentro de él dos o tres ticks seguidos.
   * Con el registro por tick, el primer zombi se comía las tres perforaciones
   * él solo y la flecha no llegaba nunca al segundo — que es justo lo único
   * que la flecha de hueso tiene que hacer.
   */
  readonly tocados: Set<Enemigo>;
}

/** Lo que la munición aporta al disparo, por encima de lo que pone el arco. */
export interface Punta {
  /** Daño que suma a lo que pega el arco. */
  extra?: number;
  /** Enemigos que atraviesa antes de pararse. */
  perfora?: number;
  /** Radio de la explosión al pararse, en tiles. */
  estalla?: number;
  color?: string;
}

const PUNTA_LISA: Punta = {};

export function crearFlecha(
  x: number,
  y: number,
  vx: number,
  vy: number,
  dano: number,
  punta: Punta = PUNTA_LISA,
): Flecha {
  return {
    x,
    y,
    vx,
    vy,
    dano: dano + (punta.extra ?? 0),
    vivo: true,
    edad: 0,
    clavada: false,
    angulo: Math.atan2(vy, vx),
    perfora: punta.perfora ?? 0,
    estalla: punta.estalla ?? 0,
    color: punta.color ?? '#b8a882',
    tocados: new Set(),
  };
}

/**
 * Dispara hacia un punto del mundo.
 *
 * Sale del pecho y no de los pies para que apuntar al suelo justo delante no
 * salga rasante; es el mismo criterio que usa el mandoble.
 */
export function dispararDesde(
  tirador: Caja,
  haciaX: number,
  haciaY: number,
  velocidad: number,
  dano: number,
  punta: Punta = PUNTA_LISA,
): Flecha {
  const ox = tirador.x + tirador.ancho / 2;
  const oy = tirador.y + tirador.alto * 0.4;
  const dx = haciaX - ox;
  const dy = haciaY - oy;
  const largo = Math.hypot(dx, dy);
  // Apuntar exactamente a uno mismo tiene que dar algo: sale hacia donde mira.
  const ux = largo < 1e-6 ? tirador.mirando : dx / largo;
  const uy = largo < 1e-6 ? 0 : dy / largo;
  return crearFlecha(ox, oy, ux * velocidad, uy * velocidad, dano, punta);
}

export interface ImpactoFlecha {
  flecha: Flecha;
  enemigo: Enemigo;
  muerto: boolean;
}

export interface ResultadoFlechas {
  /** Flechas que han acertado a algo este tick. */
  impactos: ImpactoFlecha[];
  /** Dónde se han clavado, para las partículas. */
  clavadas: { x: number; y: number }[];
  /** Dónde ha estallado alguna, y con qué radio, para el fogonazo. */
  estallidos: { x: number; y: number; radio: number }[];
}

/**
 * Un tick de todas las flechas: mover, chocar con el terreno y con los bichos.
 *
 * El orden importa. Se comprueba el enemigo *durante* el avance, paso a paso, y
 * no al final del tick: a nueve píxeles por tick una flecha cruza un slime
 * entero entre dos fotogramas, y comprobando solo la posición final atravesaría
 * enemigos sin tocarlos.
 */
export function actualizarFlechas(
  mundo: Mundo,
  flechas: Flecha[],
  enemigos: readonly Enemigo[],
): ResultadoFlechas {
  const salida: ResultadoFlechas = { impactos: [], clavadas: [], estallidos: [] };

  for (const f of flechas) {
    if (!f.vivo) continue;
    f.edad++;

    if (f.clavada) {
      if (f.edad > VIDA_CLAVADA) f.vivo = false;
      continue;
    }
    if (f.edad > VIDA_VUELO) {
      f.vivo = false;
      continue;
    }

    f.vy += GRAVEDAD;
    f.angulo = Math.atan2(f.vy, f.vx);

    const largo = Math.hypot(f.vx, f.vy);
    const pasos = Math.max(1, Math.ceil(largo / PASO_MAX));
    for (let i = 0; i < pasos && f.vivo && !f.clavada; i++) {
      f.x += f.vx / pasos;
      f.y += f.vy / pasos;

      if (fueraDelMundo(mundo, f)) {
        f.vivo = false;
        break;
      }

      const tx = Math.floor(f.x / TILE);
      const ty = Math.floor(f.y / TILE);
      if (esSolido(mundo.getTile(tx, ty))) {
        // Retrocede el paso para no quedarse dentro del bloque: clavada en la
        // cara del tile se ve; clavada dentro, no se ve nada.
        f.x -= f.vx / pasos;
        f.y -= f.vy / pasos;
        // Una flecha que estalla no se queda clavada de adorno: revienta contra
        // la pared. Es lo que permite usarla apuntando al suelo de al lado en
        // vez de al bicho, que es media gracia de tenerla.
        if (f.estalla > 0) {
          estallar(f, enemigos, salida);
          f.vivo = false;
        } else {
          f.clavada = true;
          f.edad = 0;
          salida.clavadas.push({ x: f.x, y: f.y });
        }
        break;
      }

      const tocado = primerEnemigoEn(enemigos, f.x, f.y, f.tocados);
      if (tocado) {
        const muerto = danarEnemigo(tocado, f.dano, f.x);
        salida.impactos.push({ flecha: f, enemigo: tocado, muerto });
        if (f.estalla > 0) {
          estallar(f, enemigos, salida);
          f.vivo = false;
          break;
        }
        // Perforando sigue de largo, pero sin volver a pegarle al mismo nunca
        // más: el registro va en la flecha porque atravesar a un bicho lleva
        // varios ticks, no varios pasos de uno.
        f.tocados.add(tocado);
        if (f.perfora > 0) {
          f.perfora--;
        } else {
          f.vivo = false;
          break;
        }
      }
    }
  }

  return salida;
}

/**
 * La explosión de una flecha de fuego: daño a todo bicho dentro del radio.
 *
 * No toca el terreno. Un proyectil que además rompe bloques convierte el arco
 * en una herramienta de excavación, y para eso ya está la dinamita; lo que se
 * quiere aquí es poder repartir a un grupo, no abrir un túnel.
 */
function estallar(
  f: Flecha,
  enemigos: readonly Enemigo[],
  salida: ResultadoFlechas,
): void {
  const radio = f.estalla * TILE;
  salida.estallidos.push({ x: f.x, y: f.y, radio });
  for (const e of enemigos) {
    if (!e.vivo) continue;
    const cx = e.caja.x + e.caja.ancho / 2;
    const cy = e.caja.y + e.caja.alto / 2;
    const d = Math.hypot(cx - f.x, cy - f.y);
    if (d > radio) continue;
    // El daño cae con la distancia, hasta la mitad en el borde: si repartiera
    // lo mismo en todo el círculo, apuntar dejaría de importar.
    const dano = Math.max(1, Math.round(f.dano * (1 - 0.5 * (d / radio))));
    const muerto = danarEnemigo(e, dano, f.x);
    salida.impactos.push({ flecha: f, enemigo: e, muerto });
  }
}

function fueraDelMundo(mundo: Mundo, f: Flecha): boolean {
  return f.x < 0 || f.y < 0 || f.x >= mundo.ancho * TILE || f.y >= mundo.alto * TILE;
}

/** Primer enemigo vivo cuya caja contiene este punto. */
function primerEnemigoEn(
  enemigos: readonly Enemigo[],
  x: number,
  y: number,
  excluidos?: ReadonlySet<Enemigo>,
): Enemigo | null {
  const punto = { x, y, ancho: 1, alto: 1 } as Caja;
  for (const e of enemigos) {
    if (!e.vivo) continue;
    if (excluidos?.has(e)) continue;
    if (solapan(punto, e.caja)) return e;
  }
  return null;
}

/** Quita las muertas del array. Se llama de vez en cuando, no cada tick. */
export function limpiarFlechas(flechas: Flecha[]): void {
  if (!flechas.some((f) => !f.vivo)) return;
  const vivas = flechas.filter((f) => f.vivo);
  flechas.length = 0;
  flechas.push(...vivas);
}

/** Hace sitio para una flecha nueva sacrificando la más vieja si hace falta. */
export function anadirFlecha(flechas: Flecha[], nueva: Flecha): void {
  limpiarFlechas(flechas);
  if (flechas.length >= TOPE_FLECHAS) flechas.shift();
  flechas.push(nueva);
}

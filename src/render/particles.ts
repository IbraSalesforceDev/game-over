import { TILE } from '../core/constants';
import { esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';
import { aclarar } from './pixel';

/**
 * Partículas.
 *
 * Son el pegamento entre lo que pasa y lo que se ve. Un bloque que desaparece
 * sin más se lee como un fallo del render; el mismo bloque soltando cascotes de
 * su propio color se lee como algo que se ha roto. Lo mismo con el aterrizaje,
 * los golpes o el chapoteo: el suceso ya existía, lo que faltaba era el aviso.
 *
 * Todas viven en un anillo de tamaño fijo que se reserva una vez. Emitir nunca
 * asigna memoria ni puede desbordarse: cuando se llena, las nuevas pisan a las
 * más viejas, que es exactamente lo que uno querría que pasara.
 */

/** Tope de partículas vivas. Más que esto no se distingue y sí se nota. */
const TOPE = 600;

/** Formas: un cuadradito, una chispa que se apaga o una burbuja que sube. */
export type FormaParticula = 'cascote' | 'chispa' | 'burbuja' | 'humo';

interface Particula {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  vidaMax: number;
  tam: number;
  color: string;
  forma: FormaParticula;
  /** Rebota contra el terreno. Las chispas y el humo lo atraviesan. */
  choca: boolean;
  gravedad: number;
}

function vacia(): Particula {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    vida: 0,
    vidaMax: 1,
    tam: 2,
    color: '#ffffff',
    forma: 'cascote',
    choca: false,
    gravedad: 0,
  };
}

export interface OpcionesEmision {
  cantidad: number;
  color: string;
  forma?: FormaParticula;
  /** Velocidad inicial: se reparte al azar dentro de este radio. */
  dispersion?: number;
  /** Empuje constante añadido a la velocidad inicial. */
  empujeX?: number;
  empujeY?: number;
  vida?: number;
  tam?: number;
  gravedad?: number;
  choca?: boolean;
}

export class Particulas {
  private readonly pool: Particula[] = [];
  private siguiente = 0;
  private vivas = 0;

  /**
   * Apagarlas del todo.
   *
   * Un mundo anterior a 2.2.0 no tenía partículas, y la forma honesta de
   * jugarlo es sin ellas. Se apaga aquí, en la puerta, en vez de rodear con un
   * `if` las veinte llamadas a `emitir` repartidas por el bucle.
   */
  habilitadas = true;

  constructor() {
    for (let i = 0; i < TOPE; i++) this.pool.push(vacia());
  }

  get cuantas(): number {
    return this.vivas;
  }

  emitir(x: number, y: number, op: OpcionesEmision): void {
    if (!this.habilitadas) return;
    const {
      cantidad,
      color,
      forma = 'cascote',
      dispersion = 1.4,
      empujeX = 0,
      empujeY = 0,
      vida = 40,
      tam = 2,
      gravedad = 0.22,
      choca = forma === 'cascote',
    } = op;

    for (let i = 0; i < cantidad; i++) {
      const p = this.pool[this.siguiente]!;
      this.siguiente = (this.siguiente + 1) % TOPE;
      // Dirección al azar en un disco, no en un cuadrado: repartir en un
      // cuadrado hace que salgan más partículas por las diagonales y el chorro
      // se ve con forma de aspa.
      const ang = Math.random() * Math.PI * 2;
      const fuerza = Math.sqrt(Math.random()) * dispersion;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(ang) * fuerza + empujeX;
      p.vy = Math.sin(ang) * fuerza + empujeY;
      p.vidaMax = vida * (0.7 + Math.random() * 0.6);
      p.vida = p.vidaMax;
      p.tam = tam;
      p.color = Math.random() < 0.35 ? aclarar(color, 22) : color;
      p.forma = forma;
      p.choca = choca;
      p.gravedad = gravedad;
    }
  }

  /** Un tick. El mundo solo hace falta para las que rebotan. */
  actualizar(mundo: Mundo | null): void {
    let vivas = 0;
    for (const p of this.pool) {
      if (p.vida <= 0) continue;
      p.vida--;
      vivas++;

      p.vy += p.gravedad;
      if (p.forma === 'burbuja') {
        // Las burbujas suben y se bambolean: caen hacia arriba, básicamente.
        p.vy -= p.gravedad * 2.1;
        p.x += Math.sin(p.vida * 0.2) * 0.15;
      }
      if (p.forma === 'humo') p.vy -= p.gravedad * 1.2;

      if (!p.choca || !mundo) {
        p.x += p.vx;
        p.y += p.vy;
        continue;
      }

      // Colisión de pobre, un eje cada vez: es una mota de dos píxeles, no hace
      // falta el resolutor completo de la física.
      const nx = p.x + p.vx;
      if (esSolido(mundo.getTile(Math.floor(nx / TILE), Math.floor(p.y / TILE)))) {
        p.vx *= -0.35;
      } else {
        p.x = nx;
      }
      const ny = p.y + p.vy;
      if (esSolido(mundo.getTile(Math.floor(p.x / TILE), Math.floor(ny / TILE)))) {
        p.vy *= -0.32;
        p.vx *= 0.7;
        // Casi parada contra el suelo: se apaga antes en vez de vibrar.
        if (Math.abs(p.vy) < 0.4) p.vida = Math.min(p.vida, 8);
      } else {
        p.y = ny;
      }
    }
    this.vivas = vivas;
  }

  /** Vuelca las partículas visibles. `ox`/`oy` es el origen de la cámara. */
  dibujar(ctx: CanvasRenderingContext2D, ox: number, oy: number, zoom: number): void {
    if (this.vivas === 0) return;
    ctx.save();
    for (const p of this.pool) {
      if (p.vida <= 0) continue;
      const t = p.vida / p.vidaMax;
      // Se apagan por opacidad y por tamaño a la vez: solo con la opacidad
      // parecen desvanecerse, y solo con el tamaño, encogerse.
      ctx.globalAlpha = p.forma === 'chispa' ? Math.min(1, t * 1.6) : Math.min(1, t * 2.2);
      const lado = Math.max(1, Math.round(p.tam * (0.45 + t * 0.55) * zoom));
      ctx.fillStyle = p.color;
      ctx.fillRect(ox + Math.round(p.x * zoom), oy + Math.round(p.y * zoom), lado, lado);
    }
    ctx.restore();
  }

  limpiar(): void {
    for (const p of this.pool) p.vida = 0;
    this.vivas = 0;
  }
}

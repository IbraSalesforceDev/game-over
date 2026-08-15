import { TILE } from '../core/constants';
import { AIRE, PLATAFORMA, TILES } from '../world/tiles';

/**
 * Tileset procedural.
 *
 * No hay ni un PNG en el repo: cada tile se dibuja al arrancar en un canvas
 * fuera de pantalla, con varias variantes por tipo para que el terreno no se
 * vea como una cuadrícula plana. La variante se elige por hash de la posición,
 * así que es estable entre frames sin guardar nada por tile.
 */

const VARIANTES = 4;

export interface Tileset {
  /** Una tira horizontal por tipo de tile, con sus variantes. */
  readonly lienzo: HTMLCanvasElement;
  dibujar(
    ctx: CanvasRenderingContext2D,
    id: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
}

/** Ruido entero determinista: mismo (x,y) → mismo valor, sin estado. */
function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function mezclar(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) + delta));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + delta));
  const b = Math.min(255, Math.max(0, (n & 255) + delta));
  return `rgb(${r},${g},${b})`;
}

export function crearTileset(): Tileset {
  const lienzo = document.createElement('canvas');
  lienzo.width = TILE * VARIANTES;
  lienzo.height = TILE * TILES.length;
  const ctx = lienzo.getContext('2d');
  if (!ctx) throw new Error('No se ha podido crear el contexto del tileset');

  for (let id = 0; id < TILES.length; id++) {
    const def = TILES[id]!;
    if (id === AIRE) continue;

    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      const oy = id * TILE;

      if (id === PLATAFORMA) {
        // La plataforma solo ocupa la franja superior: se ve que se atraviesa.
        ctx.fillStyle = def.color;
        ctx.fillRect(ox, oy, TILE, 5);
        ctx.fillStyle = mezclar(def.color, 28);
        ctx.fillRect(ox, oy, TILE, 1);
        ctx.fillStyle = mezclar(def.color, -40);
        ctx.fillRect(ox, oy + 4, TILE, 1);
        continue;
      }

      ctx.fillStyle = def.color;
      ctx.fillRect(ox, oy, TILE, TILE);

      // Grano: píxeles sueltos más claros y más oscuros.
      for (let py = 0; py < TILE; py++) {
        for (let px = 0; px < TILE; px++) {
          const n = hash2(px + v * 31 + id * 101, py + v * 17);
          if (n > 0.86) {
            ctx.fillStyle = mezclar(def.color, 16);
            ctx.fillRect(ox + px, oy + py, 1, 1);
          } else if (n < 0.14) {
            ctx.fillStyle = mezclar(def.color, -18);
            ctx.fillRect(ox + px, oy + py, 1, 1);
          }
        }
      }

    }
  }

  return {
    lienzo,
    dibujar(destino, id, tx, ty, sx, sy, tam) {
      if (id === AIRE) return;
      const v = Math.floor(hash2(tx, ty) * VARIANTES) % VARIANTES;
      const alto = id === PLATAFORMA ? 5 : TILE;
      destino.drawImage(
        lienzo,
        v * TILE,
        id * TILE,
        TILE,
        alto,
        sx,
        sy,
        tam,
        (tam * alto) / TILE,
      );
    },
  };
}

import { TILE } from '../core/constants';
import { ABAJO, ARRIBA, DERECHA, IZQUIERDA, MASCARAS } from '../world/framing';
import { AIRE, PLATAFORMA, TILES } from '../world/tiles';

/**
 * Tileset procedural con auto-tiling.
 *
 * No hay ni un PNG en el repo. Al arrancar se generan dos atlas —uno para
 * bloques y otro para paredes— con una fila por cada combinación de tipo de
 * tile y máscara de vecinos, y varias variantes de grano por celda para que el
 * terreno no se vea como una cuadrícula. La variante se elige por hash de la
 * posición: estable entre frames sin guardar nada por tile.
 */

const VARIANTES = 4;
/** Grosor del bisel de los bordes expuestos, en píxeles de tile. */
const BISEL = 2;

export interface Tileset {
  dibujarBloque(
    ctx: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  dibujarPared(
    ctx: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  /** Textura de grietas, 4 etapas de picado. */
  dibujarGrieta(
    ctx: CanvasRenderingContext2D,
    etapa: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  /** Variante estable para una posición del mundo. */
  variante(tx: number, ty: number): number;
}

/** Ruido entero determinista: mismo (x,y) → mismo valor, sin estado. */
function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function rgb(hex: string, delta: number, escala = 1): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v * escala) + delta));
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

function css(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Dibuja las VARIANTES texturas base de un tipo de tile en una tira horizontal.
 * El grano se pinta píxel a píxel una sola vez, en la carga.
 */
function pintarBase(
  ctx: CanvasRenderingContext2D,
  color: string,
  escala: number,
  oy: number,
): void {
  for (let v = 0; v < VARIANTES; v++) {
    const ox = v * TILE;
    ctx.fillStyle = css(rgb(color, 0, escala));
    ctx.fillRect(ox, oy, TILE, TILE);
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        const n = hash2(px + v * 31, py + v * 17);
        if (n > 0.86) {
          ctx.fillStyle = css(rgb(color, 16, escala));
          ctx.fillRect(ox + px, oy + py, 1, 1);
        } else if (n < 0.14) {
          ctx.fillStyle = css(rgb(color, -18, escala));
          ctx.fillRect(ox + px, oy + py, 1, 1);
        }
      }
    }
  }
}

/** Bisela los lados que NO conectan: ahí es donde el bloque queda a la vista. */
function pintarBordes(
  ctx: CanvasRenderingContext2D,
  color: string,
  escala: number,
  mascara: number,
  ox: number,
  oy: number,
): void {
  const claro = css(rgb(color, 30, escala));
  const oscuro = css(rgb(color, -34, escala));

  if (!(mascara & ARRIBA)) {
    ctx.fillStyle = claro;
    ctx.fillRect(ox, oy, TILE, BISEL);
  }
  if (!(mascara & ABAJO)) {
    ctx.fillStyle = oscuro;
    ctx.fillRect(ox, oy + TILE - BISEL, TILE, BISEL);
  }
  if (!(mascara & IZQUIERDA)) {
    ctx.fillStyle = claro;
    ctx.fillRect(ox, oy, BISEL, TILE);
  }
  if (!(mascara & DERECHA)) {
    ctx.fillStyle = oscuro;
    ctx.fillRect(ox + TILE - BISEL, oy, BISEL, TILE);
  }
}

/** Atlas completo: filas de (tipo × máscara), columnas de variantes. */
function crearAtlas(escala: number, alfa: number): HTMLCanvasElement {
  const atlas = lienzo(VARIANTES * TILE, TILES.length * MASCARAS * TILE);
  const ctx = atlas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido crear el contexto del tileset');

  // Las bases se pintan en un lienzo aparte y se copian a cada máscara: pintar
  // el grano 16 veces por tipo sería 100.000 fillRect en el arranque.
  const bases = lienzo(VARIANTES * TILE, TILES.length * TILE);
  const cbase = bases.getContext('2d');
  if (!cbase) throw new Error('No se ha podido crear el contexto de las bases');

  for (let id = 0; id < TILES.length; id++) {
    if (id === AIRE) continue;
    pintarBase(cbase, TILES[id]!.color, escala, id * TILE);
  }

  ctx.globalAlpha = alfa;
  for (let id = 0; id < TILES.length; id++) {
    if (id === AIRE) continue;
    const def = TILES[id]!;
    for (let m = 0; m < MASCARAS; m++) {
      const oy = (id * MASCARAS + m) * TILE;
      ctx.drawImage(bases, 0, id * TILE, VARIANTES * TILE, TILE, 0, oy, VARIANTES * TILE, TILE);
      for (let v = 0; v < VARIANTES; v++) {
        pintarBordes(ctx, def.color, escala, m, v * TILE, oy);
      }
    }
  }
  ctx.globalAlpha = 1;
  return atlas;
}

/** Plataformas: solo la franja superior, para que se vea que se atraviesan. */
function recortarPlataformas(atlas: HTMLCanvasElement): void {
  const ctx = atlas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(
    0,
    PLATAFORMA * MASCARAS * TILE,
    atlas.width,
    MASCARAS * TILE,
  );
  const def = TILES[PLATAFORMA]!;
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (PLATAFORMA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = def.color;
      ctx.fillRect(ox, oy, TILE, 5);
      ctx.fillStyle = css(rgb(def.color, 28));
      ctx.fillRect(ox, oy, TILE, 1);
      ctx.fillStyle = css(rgb(def.color, -40));
      ctx.fillRect(ox, oy + 4, TILE, 1);
    }
  }
}

function crearGrietas(): HTMLCanvasElement {
  const etapas = 4;
  const c = lienzo(TILE * etapas, TILE);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No se ha podido crear el contexto de las grietas');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let e = 0; e < etapas; e++) {
    const ox = e * TILE;
    const densidad = 0.06 + e * 0.07;
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        // Grietas que nacen del centro y se abren hacia fuera.
        const d = Math.abs(px - 8) + Math.abs(py - 8);
        if (hash2(px * 7 + e, py * 13) < densidad * (1 + (16 - d) / 12)) {
          ctx.fillRect(ox + px, py, 1, 1);
        }
      }
    }
  }
  return c;
}

export function crearTileset(): Tileset {
  const bloques = crearAtlas(1, 1);
  recortarPlataformas(bloques);
  // Las paredes son el mismo terreno al 45 % de luz: se leen como fondo sin
  // competir con los bloques del primer plano.
  const paredes = crearAtlas(0.45, 1);
  const grietas = crearGrietas();

  function dibujar(
    atlas: HTMLCanvasElement,
    destino: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void {
    if (id === AIRE) return;
    const v = Math.floor(hash2(tx, ty) * VARIANTES) % VARIANTES;
    const alto = id === PLATAFORMA ? 5 : TILE;
    destino.drawImage(
      atlas,
      v * TILE,
      (id * MASCARAS + mascara) * TILE,
      TILE,
      alto,
      sx,
      sy,
      tam,
      (tam * alto) / TILE,
    );
  }

  return {
    dibujarBloque: (ctx, id, m, tx, ty, sx, sy, tam) =>
      dibujar(bloques, ctx, id, m, tx, ty, sx, sy, tam),
    dibujarPared: (ctx, id, m, tx, ty, sx, sy, tam) =>
      dibujar(paredes, ctx, id, m, tx, ty, sx, sy, tam),
    dibujarGrieta(ctx, etapa, sx, sy, tam) {
      const e = Math.min(3, Math.max(0, etapa));
      ctx.drawImage(grietas, e * TILE, 0, TILE, TILE, sx, sy, tam, tam);
    },
    variante: (tx, ty) => Math.floor(hash2(tx, ty) * VARIANTES) % VARIANTES,
  };
}

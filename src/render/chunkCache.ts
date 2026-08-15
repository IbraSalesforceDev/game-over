import { TILE } from '../core/constants';
import { mascaraPared, mascaraTile } from '../world/framing';
import { AIRE } from '../world/tiles';
import type { Mundo } from '../world/world';
import type { Tileset } from './tileset';

/**
 * Caché de render por chunk.
 *
 * Dibujar tile a tile cada frame funciona ahora, pero deja de funcionar en
 * cuanto el mundo sea grande y haya que componer paredes, bloques y (fase 5)
 * iluminación. Aquí cada chunk se pinta una vez a su propio lienzo y el frame
 * se reduce a un puñado de drawImage; al tocar un tile solo se ensucia su chunk
 * (y el vecino, si el tile estaba en el borde: su bisel depende del de al lado).
 *
 * El chunk de render es de 32 tiles, la mitad que el de datos: 512x512 px son
 * ~1 MB por lienzo, contra los 4 MB que costaría uno de 64.
 */
export const CHUNK_RENDER = 32;
const LADO_PX = CHUNK_RENDER * TILE;
/** Techo de lienzos vivos. A 1 MB cada uno, 48 son ~48 MB en el peor caso. */
const MAX_CHUNKS = 48;

interface EntradaChunk {
  lienzo: HTMLCanvasElement;
  sucio: boolean;
  /** Contador de uso para descartar los que llevan más tiempo sin verse. */
  visto: number;
}

export class CacheChunks {
  private readonly mapa = new Map<number, EntradaChunk>();
  private reloj = 0;

  constructor(private readonly tileset: Tileset) {}

  private clave(cx: number, cy: number): number {
    // Desplazamiento para admitir índices negativos sin colisiones.
    return (cy + 4096) * 100000 + (cx + 4096);
  }

  /** Marca como sucio el chunk del tile y, si toca borde, el vecino afectado. */
  invalidar(tx: number, ty: number): void {
    const cx = Math.floor(tx / CHUNK_RENDER);
    const cy = Math.floor(ty / CHUNK_RENDER);
    this.ensuciar(cx, cy);
    const lx = tx - cx * CHUNK_RENDER;
    const ly = ty - cy * CHUNK_RENDER;
    if (lx === 0) this.ensuciar(cx - 1, cy);
    if (lx === CHUNK_RENDER - 1) this.ensuciar(cx + 1, cy);
    if (ly === 0) this.ensuciar(cx, cy - 1);
    if (ly === CHUNK_RENDER - 1) this.ensuciar(cx, cy + 1);
  }

  private ensuciar(cx: number, cy: number): void {
    const e = this.mapa.get(this.clave(cx, cy));
    if (e) e.sucio = true;
  }

  invalidarTodo(): void {
    for (const e of this.mapa.values()) e.sucio = true;
  }

  /** Lienzo del chunk, repintado si hacía falta. */
  obtener(mundo: Mundo, cx: number, cy: number): HTMLCanvasElement {
    const k = this.clave(cx, cy);
    let e = this.mapa.get(k);
    if (!e) {
      const lienzo = document.createElement('canvas');
      lienzo.width = LADO_PX;
      lienzo.height = LADO_PX;
      e = { lienzo, sucio: true, visto: 0 };
      this.mapa.set(k, e);
      this.podar();
    }
    e.visto = ++this.reloj;
    if (e.sucio) {
      this.pintar(mundo, e.lienzo, cx, cy);
      e.sucio = false;
    }
    return e.lienzo;
  }

  private pintar(
    mundo: Mundo,
    lienzo: HTMLCanvasElement,
    cx: number,
    cy: number,
  ): void {
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, LADO_PX, LADO_PX);
    ctx.imageSmoothingEnabled = false;

    const tx0 = cx * CHUNK_RENDER;
    const ty0 = cy * CHUNK_RENDER;

    // Primero las paredes de todo el chunk, luego los bloques: así un bloque
    // nunca queda tapado por la pared de su vecino.
    for (let y = 0; y < CHUNK_RENDER; y++) {
      for (let x = 0; x < CHUNK_RENDER; x++) {
        const tx = tx0 + x;
        const ty = ty0 + y;
        const pared = mundo.getPared(tx, ty);
        if (pared === AIRE) continue;
        this.tileset.dibujarPared(
          ctx,
          pared,
          mascaraPared(mundo, tx, ty),
          tx,
          ty,
          x * TILE,
          y * TILE,
          TILE,
        );
      }
    }

    for (let y = 0; y < CHUNK_RENDER; y++) {
      for (let x = 0; x < CHUNK_RENDER; x++) {
        const tx = tx0 + x;
        const ty = ty0 + y;
        const id = mundo.getTile(tx, ty);
        if (id === AIRE) continue;
        this.tileset.dibujarBloque(
          ctx,
          id,
          mascaraTile(mundo, tx, ty),
          tx,
          ty,
          x * TILE,
          y * TILE,
          TILE,
        );
      }
    }
  }

  /** Descarta los chunks que llevan más tiempo sin dibujarse. */
  private podar(): void {
    if (this.mapa.size <= MAX_CHUNKS) return;
    let peorK = -1;
    let peorVisto = Infinity;
    for (const [k, e] of this.mapa) {
      if (e.visto < peorVisto) {
        peorVisto = e.visto;
        peorK = k;
      }
    }
    if (peorK !== -1) this.mapa.delete(peorK);
  }

  get tamano(): number {
    return this.mapa.size;
  }
}

import { TILE } from '../core/constants';
import type { Jugador } from '../entities/player';
import { AIRE, PLATAFORMA } from '../world/tiles';
import type { Mundo } from '../world/world';
import type { Zona } from '../world/testLevel';
import { Camara } from './camera';
import { crearTileset, type Tileset } from './tileset';

/**
 * Render del laboratorio.
 *
 * De momento dibuja tile a tile los que caen dentro de la vista (unos 2000 en
 * pantalla completa, que Canvas2D despacha sin despeinarse). La caché por chunk
 * llega en la fase 2, cuando el mundo empiece a cambiar y el coste importe.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly camara = new Camara();
  private readonly tileset: Tileset;
  private dpr = 1;

  constructor(private readonly lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Este navegador no soporta canvas 2D');
    this.ctx = ctx;
    this.tileset = crearTileset();
    this.redimensionar();
  }

  redimensionar(): void {
    // Capamos el DPR: en pantallas 3x el coste se dispara sin ganancia visible
    // en un juego de pixel art.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.lienzo.clientWidth * this.dpr);
    const h = Math.floor(this.lienzo.clientHeight * this.dpr);
    if (this.lienzo.width !== w || this.lienzo.height !== h) {
      this.lienzo.width = w;
      this.lienzo.height = h;
    }
    this.ctx.imageSmoothingEnabled = false;
    // Zoom adaptativo: apuntamos a unos 44 tiles de ancho de vista, que es la
    // escala a la que se lee bien el terreno sin marearse.
    this.camara.zoom = Math.min(4, Math.max(2, Math.round(w / (44 * TILE))));
    this.camara.redimensionar(w, h);
  }

  get anchoCanvas(): number {
    return this.lienzo.width;
  }

  get altoCanvas(): number {
    return this.lienzo.height;
  }

  private cielo(): void {
    const { ctx } = this;
    const g = ctx.createLinearGradient(0, 0, 0, this.altoCanvas);
    g.addColorStop(0, '#2f5d92');
    g.addColorStop(0.55, '#6ba3d6');
    g.addColorStop(1, '#a8cfe8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.anchoCanvas, this.altoCanvas);
  }

  private tiles(mundo: Mundo): void {
    const { ctx, camara } = this;
    const { tx0, ty0, tx1, ty1 } = camara.tilesVisibles();
    const tam = TILE * camara.zoom;
    const borde = Math.max(1, Math.round(camara.zoom));

    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const id = mundo.getTile(tx, ty);
        if (id === AIRE) continue;
        // Redondeo a entero: si no, el pixel art tiembla al moverse la cámara.
        const sx = Math.round(camara.aPantallaX(tx * TILE));
        const sy = Math.round(camara.aPantallaY(ty * TILE));
        this.tileset.dibujar(ctx, id, tx, ty, sx, sy, tam);

        // El bisel solo se dibuja en los bordes expuestos. Ponerlo en todos los
        // tiles convertía el subsuelo en un rayado horizontal.
        if (id === PLATAFORMA) continue;
        if (mundo.getTile(tx, ty - 1) === AIRE) {
          ctx.fillStyle = 'rgba(255,255,255,0.16)';
          ctx.fillRect(sx, sy, tam, borde);
        }
        if (mundo.getTile(tx, ty + 1) === AIRE) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(sx, sy + tam - borde, tam, borde);
        }
      }
    }
  }

  private jugador(j: Jugador, alpha: number): void {
    const { ctx, camara } = this;
    // Interpolación entre el tick anterior y el actual: el movimiento se ve
    // fluido aunque la simulación vaya a 60 fijos.
    const wx = j.xPrev + (j.caja.x - j.xPrev) * alpha;
    const wy = j.yPrev + (j.caja.y - j.yPrev) * alpha;
    const sx = Math.round(camara.aPantallaX(wx));
    const sy = Math.round(camara.aPantallaY(wy));
    const w = j.caja.ancho * camara.zoom;
    const h = j.caja.alto * camara.zoom;
    const u = camara.zoom; // un píxel de mundo

    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(sx, sy + h * 0.45, w, h * 0.55);
    ctx.fillStyle = '#3f5f7a';
    ctx.fillRect(sx, sy + h * 0.3, w, h * 0.2);
    ctx.fillStyle = '#e8c9a0';
    ctx.fillRect(sx + u * 2, sy, w - u * 4, h * 0.32);

    // Ojo, para ver hacia dónde mira.
    ctx.fillStyle = '#1a2430';
    const ojoX = j.caja.mirando > 0 ? sx + w - u * 7 : sx + u * 4;
    ctx.fillRect(ojoX, sy + u * 6, u * 3, u * 3);
  }

  /**
   * Rótulos de las zonas del laboratorio, anclados en X al mundo pero fijos en
   * la parte baja de la pantalla: así se leen sin importar a qué altura esté la
   * cámara.
   */
  private zonas(zonas: Zona[]): void {
    const { ctx, camara } = this;
    const escala = this.dpr;
    ctx.font = `${Math.round(11 * escala)}px ui-monospace, monospace`;
    ctx.textBaseline = 'bottom';
    const sy = this.altoCanvas - 14 * escala;
    for (const z of zonas) {
      const sx = camara.aPantallaX(z.tx * TILE);
      if (sx < -260 * escala || sx > this.anchoCanvas) continue;
      const ancho = ctx.measureText(z.etiqueta).width + 10 * escala;
      ctx.fillStyle = 'rgba(13, 17, 23, 0.7)';
      ctx.fillRect(sx, sy - 14 * escala, ancho, 18 * escala);
      ctx.fillStyle = '#e8b64c';
      ctx.fillText(z.etiqueta, sx + 5 * escala, sy);
    }
  }

  dibujar(mundo: Mundo, j: Jugador, alpha: number, zonas: Zona[]): void {
    this.cielo();
    this.tiles(mundo);
    this.jugador(j, alpha);
    this.zonas(zonas);
  }
}

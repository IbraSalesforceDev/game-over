import { TILE } from '../core/constants';
import { css, type Reloj } from '../engine/time';
import type { Jugador } from '../entities/player';
import type { MotorLuz } from '../world/lighting';
import type { Capa, Picado } from '../world/edit';
import { durezaObjetivo, etapaGrieta } from '../world/edit';
import type { Mundo } from '../world/world';
import type { Zona } from '../world/testLevel';
import { Camara } from './camera';
import { CacheChunks, CHUNK_RENDER } from './chunkCache';
import { crearTileset, type Tileset } from './tileset';

/** Lo que el render necesita saber del puntero de construcción. */
export interface Objetivo {
  tx: number;
  ty: number;
  valido: boolean;
  visible: boolean;
  capa: Capa;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly camara = new Camara();
  readonly cache: CacheChunks;
  private readonly tileset: Tileset;
  private dpr = 1;
  private lienzoLuz: HTMLCanvasElement | null = null;
  private ctxLuz: CanvasRenderingContext2D | null = null;
  private imgLuz: ImageData | null = null;
  private tinteAnterior = '';

  constructor(private readonly lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Este navegador no soporta canvas 2D');
    this.ctx = ctx;
    this.tileset = crearTileset();
    this.cache = new CacheChunks(this.tileset);
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

  get escala(): number {
    return this.dpr;
  }

  private cielo(reloj: Reloj): void {
    const { ctx } = this;
    const [alto, medio, bajo] = reloj.colorCielo;
    const g = ctx.createLinearGradient(0, 0, 0, this.altoCanvas);
    g.addColorStop(0, css(alto));
    g.addColorStop(0.55, css(medio));
    g.addColorStop(1, css(bajo));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.anchoCanvas, this.altoCanvas);
    this.estrellas(reloj);
  }

  /**
   * Estrellas de noche. Su posición depende solo del índice, así que no
   * parpadean ni se mueven con la cámara: son el fondo del firmamento.
   */
  private estrellas(reloj: Reloj): void {
    const opacidad = 1 - reloj.luzSolar / 255;
    if (opacidad <= 0.05) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacidad * 1.2);
    ctx.fillStyle = '#e8eef8';
    const n = 90;
    for (let i = 0; i < n; i++) {
      // Dispersión determinista barata: dos irracionales distintos por eje.
      const x = ((i * 0.7548776662) % 1) * this.anchoCanvas;
      const y = ((i * 0.5698402909) % 1) * this.altoCanvas * 0.6;
      const tam = i % 7 === 0 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), tam * this.dpr, tam * this.dpr);
    }
    ctx.restore();
  }

  /**
   * Vuelca la luz como una capa que multiplica la escena.
   *
   * El buffer tiene un píxel por tile y se estira con suavizado: es el truco
   * de siempre y da degradados suaves casi gratis, en vez de un mosaico de
   * cuadrados oscuros. Se repinta solo cuando la luz ha cambiado.
   */
  private luz(motor: MotorLuz, reloj: Reloj, recalculada: boolean, ox: number, oy: number): void {
    const { tx0, ty0, ancho, alto } = motor.ventana;
    if (ancho === 0 || alto === 0) return;

    if (!this.lienzoLuz || this.lienzoLuz.width !== ancho || this.lienzoLuz.height !== alto) {
      this.lienzoLuz = document.createElement('canvas');
      this.lienzoLuz.width = ancho;
      this.lienzoLuz.height = alto;
      this.ctxLuz = this.lienzoLuz.getContext('2d');
      this.imgLuz = this.ctxLuz?.createImageData(ancho, alto) ?? null;
      recalculada = true;
    }
    if (!this.ctxLuz || !this.imgLuz) return;

    const tinte = reloj.tinteLuz;
    if (recalculada || this.tinteAnterior !== tinte.join()) {
      this.tinteAnterior = tinte.join();
      const datos = this.imgLuz.data;
      const buf = motor.buffer;
      // El tinte se normaliza a su canal más alto: si no, el azul de la noche
      // multiplica encima del nivel de luz y oscurece dos veces, dejando el
      // mundo nocturno casi negro. El tinte debe cambiar el color, no el brillo.
      const k = 255 / Math.max(tinte[0], tinte[1], tinte[2], 1);
      const r = tinte[0] * k;
      const g = tinte[1] * k;
      const b = tinte[2] * k;
      for (let i = 0; i < buf.length; i++) {
        const l = buf[i]! / 255;
        const j = i * 4;
        datos[j] = r * l;
        datos[j + 1] = g * l;
        datos[j + 2] = b * l;
        datos[j + 3] = 255;
      }
      this.ctxLuz.putImageData(this.imgLuz, 0, 0);
    }

    const { ctx, camara } = this;
    const z = camara.zoom;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply';
    // Medio tile de desplazamiento: así el centro de cada píxel de luz cae en
    // el centro de su tile y el degradado interpola entre centros, no entre
    // esquinas.
    ctx.drawImage(
      this.lienzoLuz,
      ox + Math.round((tx0 * TILE - TILE / 2) * z),
      oy + Math.round((ty0 * TILE - TILE / 2) * z),
      ancho * TILE * z,
      alto * TILE * z,
    );
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  /** Vuelca los lienzos de los chunks visibles. Un drawImage por chunk. */
  private chunks(mundo: Mundo, ox: number, oy: number): void {
    const { ctx, camara } = this;
    const zoom = camara.zoom;
    const ladoPx = CHUNK_RENDER * TILE;
    const cx0 = Math.floor(camara.x / ladoPx);
    const cy0 = Math.floor(camara.y / ladoPx);
    const cx1 = Math.floor((camara.x + camara.ancho) / ladoPx);
    const cy1 = Math.floor((camara.y + camara.alto) / ladoPx);
    const anchoChunks = Math.ceil(mundo.ancho / CHUNK_RENDER);
    const altoChunks = Math.ceil(mundo.alto / CHUNK_RENDER);

    for (let cy = cy0; cy <= cy1; cy++) {
      if (cy < 0 || cy >= altoChunks) continue;
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cx >= anchoChunks) continue;
        const lienzo = this.cache.obtener(mundo, cx, cy);
        ctx.drawImage(
          lienzo,
          ox + cx * ladoPx * zoom,
          oy + cy * ladoPx * zoom,
          ladoPx * zoom,
          ladoPx * zoom,
        );
      }
    }
  }

  private jugador(j: Jugador, alpha: number, ox: number, oy: number): void {
    const { ctx, camara } = this;
    // Interpolación entre el tick anterior y el actual: el movimiento se ve
    // fluido aunque la simulación vaya a 60 fijos.
    const wx = j.xPrev + (j.caja.x - j.xPrev) * alpha;
    const wy = j.yPrev + (j.caja.y - j.yPrev) * alpha;
    const u = camara.zoom;
    const sx = ox + Math.round(wx * u);
    const sy = oy + Math.round(wy * u);
    const w = j.caja.ancho * u;
    const h = j.caja.alto * u;

    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(sx, sy + h * 0.45, w, h * 0.55);
    ctx.fillStyle = '#3f5f7a';
    ctx.fillRect(sx, sy + h * 0.3, w, h * 0.2);
    ctx.fillStyle = '#e8c9a0';
    ctx.fillRect(sx + u * 2, sy, w - u * 4, h * 0.32);

    ctx.fillStyle = '#1a2430';
    const ojoX = j.caja.mirando > 0 ? sx + w - u * 7 : sx + u * 4;
    ctx.fillRect(ojoX, sy + u * 6, u * 3, u * 3);
  }

  /** Grietas del bloque que se está picando ahora mismo. */
  private picado(mundo: Mundo, p: Picado, ox: number, oy: number): void {
    if (p.progreso <= 0 || p.tx < 0) return;
    const u = this.camara.zoom;
    const dureza = durezaObjetivo(mundo, p);
    if (dureza <= 0) return;
    this.tileset.dibujarGrieta(
      this.ctx,
      etapaGrieta(p, dureza),
      ox + p.tx * TILE * u,
      oy + p.ty * TILE * u,
      TILE * u,
    );
  }

  /** Recuadro del tile apuntado: verde si la acción es posible, rojo si no. */
  private objetivo(o: Objetivo, ox: number, oy: number): void {
    if (!o.visible) return;
    const { ctx } = this;
    const u = this.camara.zoom;
    const sx = ox + o.tx * TILE * u;
    const sy = oy + o.ty * TILE * u;
    const lado = TILE * u;

    ctx.fillStyle = o.valido
      ? 'rgba(232, 182, 76, 0.18)'
      : 'rgba(224, 90, 90, 0.16)';
    ctx.fillRect(sx, sy, lado, lado);
    ctx.strokeStyle = o.valido ? '#e8b64c' : '#e05a5a';
    ctx.lineWidth = Math.max(1, Math.round(this.dpr));
    ctx.strokeRect(sx + 0.5, sy + 0.5, lado - 1, lado - 1);

    // En capa de pared, un aspa interior distingue de un vistazo en qué capa
    // vas a actuar.
    if (o.capa === 'pared') {
      ctx.beginPath();
      ctx.moveTo(sx + lado * 0.3, sy + lado * 0.3);
      ctx.lineTo(sx + lado * 0.7, sy + lado * 0.7);
      ctx.moveTo(sx + lado * 0.7, sy + lado * 0.3);
      ctx.lineTo(sx + lado * 0.3, sy + lado * 0.7);
      ctx.stroke();
    }
  }

  /**
   * Rótulos de las zonas del laboratorio, anclados en X al mundo pero fijos en
   * la parte baja de la pantalla: así se leen sin importar a qué altura esté la
   * cámara.
   */
  private zonas(zonas: Zona[], ox: number): void {
    const { ctx, camara } = this;
    const escala = this.dpr;
    ctx.font = `${Math.round(11 * escala)}px ui-monospace, monospace`;
    ctx.textBaseline = 'bottom';
    // Por encima del HUD de construcción, que vive pegado al borde inferior.
    const sy = this.altoCanvas - 106 * escala;
    for (const z of zonas) {
      const sx = ox + z.tx * TILE * camara.zoom;
      if (sx < -260 * escala || sx > this.anchoCanvas) continue;
      const ancho = ctx.measureText(z.etiqueta).width + 10 * escala;
      ctx.fillStyle = 'rgba(13, 17, 23, 0.7)';
      ctx.fillRect(sx, sy - 14 * escala, ancho, 18 * escala);
      ctx.fillStyle = '#e8b64c';
      ctx.fillText(z.etiqueta, sx + 5 * escala, sy);
    }
  }

  dibujar(
    mundo: Mundo,
    j: Jugador,
    alpha: number,
    zonas: Zona[],
    picado: Picado,
    objetivo: Objetivo,
    motorLuz: MotorLuz,
    reloj: Reloj,
  ): void {
    const ox = this.camara.origenX();
    const oy = this.camara.origenY();
    const { tx0, ty0, tx1, ty1 } = this.camara.tilesVisibles();
    const recalculada = motorLuz.actualizar(tx0, ty0, tx1, ty1, reloj.luzSolar);

    this.cielo(reloj);
    this.chunks(mundo, ox, oy);
    this.picado(mundo, picado, ox, oy);
    this.jugador(j, alpha, ox, oy);
    // La luz va después del mundo y del personaje, pero antes de la interfaz:
    // el recuadro del puntero tiene que verse igual dentro de una cueva.
    this.luz(motorLuz, reloj, recalculada, ox, oy);
    this.objetivo(objetivo, ox, oy);
    this.zonas(zonas, ox);
  }
}

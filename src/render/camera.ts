import { TILE } from '../core/constants';

/**
 * Cámara y conversión entre los tres espacios de coordenadas del juego:
 *   - tile   (tx, ty): índices en la rejilla
 *   - mundo  (wx, wy): píxeles de mundo, decimales
 *   - pantalla (sx, sy): píxeles de canvas, ya con el zoom aplicado
 *
 * Los nombres llevan el prefijo a propósito: mezclar espacios sin darse cuenta
 * es el bug más común de un juego de tiles.
 */
export class Camara {
  /** Esquina superior izquierda de la vista, en píxeles de mundo. */
  x = 0;
  y = 0;
  /** Tamaño de la vista en píxeles de mundo. */
  ancho = 0;
  alto = 0;
  zoom = 3;
  /** Suavizado del seguimiento: 0 = pegada, 1 = no se mueve. */
  suavizado = 0.12;

  redimensionar(anchoCanvas: number, altoCanvas: number): void {
    this.ancho = anchoCanvas / this.zoom;
    this.alto = altoCanvas / this.zoom;
  }

  /** Centra la cámara de golpe (al arrancar o al reaparecer). */
  centrar(wx: number, wy: number, mundoAncho: number, mundoAlto: number): void {
    this.x = wx - this.ancho / 2;
    this.y = wy - this.alto / 2;
    this.limitar(mundoAncho, mundoAlto);
  }

  /** Sigue al objetivo con suavizado exponencial independiente del framerate. */
  seguir(wx: number, wy: number, mundoAncho: number, mundoAlto: number): void {
    const destinoX = wx - this.ancho / 2;
    const destinoY = wy - this.alto / 2;
    this.x += (destinoX - this.x) * this.suavizado;
    this.y += (destinoY - this.y) * this.suavizado;
    this.limitar(mundoAncho, mundoAlto);
  }

  /** No enseñar el vacío de fuera del mundo. */
  limitar(mundoAncho: number, mundoAlto: number): void {
    const maxX = mundoAncho * TILE - this.ancho;
    const maxY = mundoAlto * TILE - this.alto;
    this.x = maxX <= 0 ? maxX / 2 : Math.min(Math.max(this.x, 0), maxX);
    this.y = maxY <= 0 ? maxY / 2 : Math.min(Math.max(this.y, 0), maxY);
  }

  /**
   * Origen de la vista redondeado a píxel entero de pantalla.
   *
   * Todo lo que se dibuja se coloca como `origen + round(w * zoom)`. Redondear
   * cada elemento por separado deja costuras de un píxel entre los lienzos de
   * los chunks; redondear el origen una vez, no.
   */
  origenX(): number {
    return Math.round(-this.x * this.zoom);
  }

  origenY(): number {
    return Math.round(-this.y * this.zoom);
  }

  /** Posición de pantalla alineada a píxel, coherente entre todas las capas. */
  pintarX(wx: number): number {
    return this.origenX() + Math.round(wx * this.zoom);
  }

  pintarY(wy: number): number {
    return this.origenY() + Math.round(wy * this.zoom);
  }

  aPantallaX(wx: number): number {
    return (wx - this.x) * this.zoom;
  }

  aPantallaY(wy: number): number {
    return (wy - this.y) * this.zoom;
  }

  aMundoX(sx: number): number {
    return sx / this.zoom + this.x;
  }

  aMundoY(sy: number): number {
    return sy / this.zoom + this.y;
  }

  /** Rango de tiles visibles, con un tile de margen por cada lado. */
  tilesVisibles(): { tx0: number; ty0: number; tx1: number; ty1: number } {
    return {
      tx0: Math.floor(this.x / TILE) - 1,
      ty0: Math.floor(this.y / TILE) - 1,
      tx1: Math.floor((this.x + this.ancho) / TILE) + 1,
      ty1: Math.floor((this.y + this.alto) / TILE) + 1,
    };
  }
}

export function tileDeMundo(w: number): number {
  return Math.floor(w / TILE);
}

export function mundoDeTile(t: number): number {
  return t * TILE;
}

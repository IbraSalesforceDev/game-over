import { AIRE, TILE_BORDE } from './tiles';

/**
 * Mundo de tiles en TypedArrays paralelos.
 *
 * Un objeto por tile sería inviable: un mundo de 2100x600 son 1,26 millones de
 * tiles. Aquí cada capa es un array plano indexado por `ty * ancho + tx`.
 * Las capas de líquido, luz y framing llegan en fases posteriores, pero el
 * layout ya está pensado para añadirlas sin tocar nada más.
 */
export class Mundo {
  readonly ancho: number;
  readonly alto: number;

  /** Bloque delantero. 0 = aire. */
  readonly tileId: Uint16Array;
  /** Pared de fondo (fase 2). */
  readonly wallId: Uint16Array;
  /** Bits de estado por tile (orientación, variantes...). */
  readonly flags: Uint8Array;
  /** Nivel de líquido, 0 = seco, 255 = celda llena. */
  readonly liquido: Uint8Array;

  constructor(ancho: number, alto: number) {
    this.ancho = ancho;
    this.alto = alto;
    const n = ancho * alto;
    this.tileId = new Uint16Array(n);
    this.wallId = new Uint16Array(n);
    this.flags = new Uint8Array(n);
    this.liquido = new Uint8Array(n);
  }

  dentro(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.ancho && ty < this.alto;
  }

  /**
   * Fuera de los límites: por encima del mundo hay aire (se puede saltar en la
   * cima), y por los lados y por debajo hay roca maciza, que hace de muro
   * infranqueable sin necesidad de casos especiales en la física.
   */
  getTile(tx: number, ty: number): number {
    if (ty < 0) return AIRE;
    if (tx < 0 || tx >= this.ancho || ty >= this.alto) return TILE_BORDE;
    return this.tileId[ty * this.ancho + tx]!;
  }

  setTile(tx: number, ty: number, id: number): void {
    if (!this.dentro(tx, ty)) return;
    this.tileId[ty * this.ancho + tx] = id;
  }

  getPared(tx: number, ty: number): number {
    if (!this.dentro(tx, ty)) return AIRE;
    return this.wallId[ty * this.ancho + tx]!;
  }

  setPared(tx: number, ty: number, id: number): void {
    if (!this.dentro(tx, ty)) return;
    this.wallId[ty * this.ancho + tx] = id;
  }

  // --- Líquidos -------------------------------------------------------------
  //
  // El tipo (agua o lava) va en un bit de `flags` en vez de en un array
  // propio: son 1,26 MB de diferencia en un mundo mediano por un dato que solo
  // tiene dos valores.

  /** Bit de `flags` que marca la celda como lava. */
  static readonly BIT_LAVA = 1;

  getLiquido(tx: number, ty: number): number {
    if (!this.dentro(tx, ty)) return 0;
    return this.liquido[ty * this.ancho + tx]!;
  }

  esLava(tx: number, ty: number): boolean {
    if (!this.dentro(tx, ty)) return false;
    return (this.flags[ty * this.ancho + tx]! & Mundo.BIT_LAVA) !== 0;
  }

  setLiquido(tx: number, ty: number, nivel: number, lava = false): void {
    if (!this.dentro(tx, ty)) return;
    const i = ty * this.ancho + tx;
    this.liquido[i] = Math.max(0, Math.min(255, Math.round(nivel)));
    if (this.liquido[i] === 0) {
      // Una celda seca no es "agua seca" ni "lava seca": pierde el tipo, para
      // que la siguiente gota que caiga ahí no herede lo que hubo antes.
      this.flags[i] = this.flags[i]! & ~Mundo.BIT_LAVA;
    } else if (lava) {
      this.flags[i] = this.flags[i]! | Mundo.BIT_LAVA;
    } else {
      this.flags[i] = this.flags[i]! & ~Mundo.BIT_LAVA;
    }
  }

  /** Rellena un rectángulo inclusivo. Utilidad para el nivel de pruebas. */
  rellenar(tx0: number, ty0: number, tx1: number, ty1: number, id: number): void {
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) this.setTile(tx, ty, id);
    }
  }
}

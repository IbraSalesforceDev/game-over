import { Inventario } from '../items/inventory';
import { estaVacia } from '../items/inventory';

/**
 * Contenidos de los cofres, indexados por su posición en el mundo.
 *
 * Vive aparte de las capas de tiles porque es información dispersa: hay tres
 * cofres en un mundo de 630.000 tiles, y reservar una ranura por tile para eso
 * sería absurdo. La clave es `ty * ancho + tx`, la misma que usan las capas,
 * de modo que traducir entre una y otra es inmediato.
 */

export const RANURAS_COFRE = 20;

export class Contenedores {
  private readonly mapa = new Map<number, Inventario>();

  constructor(private readonly anchoMundo: number) {}

  private clave(tx: number, ty: number): number {
    return ty * this.anchoMundo + tx;
  }

  /** Inventario del cofre, creándolo vacío si es la primera vez que se abre. */
  obtener(tx: number, ty: number): Inventario {
    const k = this.clave(tx, ty);
    let inv = this.mapa.get(k);
    if (!inv) {
      inv = new Inventario(RANURAS_COFRE);
      this.mapa.set(k, inv);
    }
    return inv;
  }

  /** Lo que hay guardado, sin crear nada. */
  mirar(tx: number, ty: number): Inventario | undefined {
    return this.mapa.get(this.clave(tx, ty));
  }

  vacio(tx: number, ty: number): boolean {
    const inv = this.mirar(tx, ty);
    return !inv || inv.ranuras.every(estaVacia);
  }

  borrar(tx: number, ty: number): void {
    this.mapa.delete(this.clave(tx, ty));
  }

  /** Descarta los cofres vacíos. Se llama antes de guardar. */
  limpiar(): void {
    for (const [k, inv] of this.mapa) {
      if (inv.ranuras.every(estaVacia)) this.mapa.delete(k);
    }
  }

  get cuantos(): number {
    return this.mapa.size;
  }

  /** Serializa a [tx, ty, ranuras] por cofre. */
  aDatos(): DatosCofre[] {
    const salida: DatosCofre[] = [];
    for (const [k, inv] of this.mapa) {
      salida.push({
        tx: k % this.anchoMundo,
        ty: Math.floor(k / this.anchoMundo),
        ranuras: inv.aDatos(),
      });
    }
    return salida;
  }

  static desdeDatos(anchoMundo: number, datos: readonly DatosCofre[]): Contenedores {
    const c = new Contenedores(anchoMundo);
    for (const d of datos) {
      const inv = Inventario.desdeDatos(d.ranuras);
      // El inventario de un cofre tiene su propio tamaño, no el del jugador.
      const cofre = new Inventario(RANURAS_COFRE);
      for (let i = 0; i < RANURAS_COFRE; i++) {
        const r = inv.ranuras[i];
        if (!r) break;
        cofre.ranuras[i]!.objeto = r.objeto;
        cofre.ranuras[i]!.cantidad = r.cantidad;
      }
      c.mapa.set(d.ty * anchoMundo + d.tx, cofre);
    }
    return c;
  }
}

export interface DatosCofre {
  tx: number;
  ty: number;
  ranuras: [number, number][];
}

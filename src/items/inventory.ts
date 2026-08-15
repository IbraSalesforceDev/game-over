import { maxPila, NADA } from './items';

/**
 * Inventario del jugador.
 *
 * Lógica pura sobre un array de ranuras: sin DOM, sin canvas y sin saber nada
 * del mundo. La interfaz de la fase se apoya encima, pero las reglas de apilado
 * —lo difícil de acertar— se prueban solas.
 *
 * Las diez primeras ranuras son la barra rápida. Es la misma rejilla, no un
 * contenedor aparte: así arrastrar algo del inventario a la barra es mover una
 * ranura y ya está.
 */

export const RANURAS_BARRA = 10;
export const FILAS = 4;
export const TOTAL_RANURAS = RANURAS_BARRA * FILAS;

export interface Ranura {
  objeto: number;
  cantidad: number;
}

export function ranuraVacia(): Ranura {
  return { objeto: NADA, cantidad: 0 };
}

export function estaVacia(r: Ranura): boolean {
  return r.objeto === NADA || r.cantidad <= 0;
}

export class Inventario {
  readonly ranuras: Ranura[];

  constructor(total = TOTAL_RANURAS) {
    this.ranuras = Array.from({ length: total }, ranuraVacia);
  }

  /**
   * Mete objetos y devuelve los que no han cabido.
   *
   * Primero completa pilas ya empezadas y solo después ocupa ranuras vacías,
   * que es lo que espera cualquiera que haya jugado a esto.
   */
  anadir(objeto: number, cantidad: number): number {
    if (objeto === NADA || cantidad <= 0) return 0;
    const tope = maxPila(objeto);
    let restante = cantidad;

    for (const r of this.ranuras) {
      if (restante === 0) break;
      if (r.objeto !== objeto || r.cantidad >= tope) continue;
      const cabe = Math.min(tope - r.cantidad, restante);
      r.cantidad += cabe;
      restante -= cabe;
    }

    for (const r of this.ranuras) {
      if (restante === 0) break;
      if (!estaVacia(r)) continue;
      const cabe = Math.min(tope, restante);
      r.objeto = objeto;
      r.cantidad = cabe;
      restante -= cabe;
    }

    return restante;
  }

  /** ¿Cabe entero? Útil para no recoger un drop a medias. */
  cabe(objeto: number, cantidad: number): boolean {
    if (objeto === NADA) return false;
    const tope = maxPila(objeto);
    let hueco = 0;
    for (const r of this.ranuras) {
      if (estaVacia(r)) hueco += tope;
      else if (r.objeto === objeto) hueco += tope - r.cantidad;
      if (hueco >= cantidad) return true;
    }
    return hueco >= cantidad;
  }

  /** Saca hasta `cantidad` de una ranura. Devuelve lo que ha sacado. */
  sacarDe(indice: number, cantidad = 1): number {
    const r = this.ranuras[indice];
    if (!r || estaVacia(r)) return 0;
    const sacado = Math.min(cantidad, r.cantidad);
    r.cantidad -= sacado;
    if (r.cantidad <= 0) {
      r.objeto = NADA;
      r.cantidad = 0;
    }
    return sacado;
  }

  /**
   * Mete un objeto en una ranura concreta si está libre o ya lleva lo mismo.
   * Devuelve false sin tocar nada si no cabe ahí.
   *
   * Existe por el cubo: lo natural es que el cubo lleno se quede en la misma
   * ranura donde estaba el vacío, y no que salte al primer hueco libre del
   * inventario justo cuando lo tienes en la mano.
   */
  ponerEn(indice: number, objeto: number, cantidad: number): boolean {
    const r = this.ranuras[indice];
    if (!r) return false;
    if (estaVacia(r)) {
      r.objeto = objeto;
      r.cantidad = cantidad;
      return true;
    }
    if (r.objeto !== objeto || r.cantidad + cantidad > maxPila(objeto)) return false;
    r.cantidad += cantidad;
    return true;
  }

  contar(objeto: number): number {
    let n = 0;
    for (const r of this.ranuras) if (r.objeto === objeto) n += r.cantidad;
    return n;
  }

  /** Primera ranura que contiene el objeto, o -1. */
  buscar(objeto: number): number {
    return this.ranuras.findIndex((r) => r.objeto === objeto && r.cantidad > 0);
  }

  /**
   * Intercambia o apila dos ranuras. Es la operación que hay detrás de coger
   * una pila con el ratón y soltarla en otro sitio.
   */
  mover(origen: number, destino: number): void {
    const a = this.ranuras[origen];
    const b = this.ranuras[destino];
    if (!a || !b || origen === destino) return;

    if (!estaVacia(a) && a.objeto === b.objeto) {
      const tope = maxPila(a.objeto);
      const cabe = Math.min(tope - b.cantidad, a.cantidad);
      b.cantidad += cabe;
      a.cantidad -= cabe;
      if (a.cantidad <= 0) {
        a.objeto = NADA;
        a.cantidad = 0;
      }
      return;
    }

    const tmp = { objeto: a.objeto, cantidad: a.cantidad };
    a.objeto = b.objeto;
    a.cantidad = b.cantidad;
    b.objeto = tmp.objeto;
    b.cantidad = tmp.cantidad;
  }

  /** Serializable a JSON plano, para el guardado. */
  aDatos(): [number, number][] {
    return this.ranuras.map((r) => [r.objeto, r.cantidad]);
  }

  static desdeDatos(datos: readonly (readonly [number, number])[]): Inventario {
    const inv = new Inventario(Math.max(TOTAL_RANURAS, datos.length));
    datos.forEach(([objeto, cantidad], i) => {
      const r = inv.ranuras[i];
      if (!r) return;
      r.objeto = objeto;
      r.cantidad = cantidad;
    });
    return inv;
  }
}

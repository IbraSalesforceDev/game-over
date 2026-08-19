import { defObjeto, maxPila, NADA } from './items';

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

/**
 * Lo que se lleva en la mano al mover cosas de un sitio a otro.
 *
 * Es el cursor del inventario: se coge de una ranura, se lleva y se suelta en
 * otra. No es un sitio donde se guarde nada —al cerrar el panel vuelve al
 * zurrón— pero mientras dura, es un estado más.
 */
export interface EnMano {
  objeto: number;
  cantidad: number;
}

/**
 * Toca una ranura llevando algo (o nada) en la mano.
 *
 * Coger, soltar, apilar o intercambiar según lo que haya en cada lado, que es
 * lo que hace todo el mundo sin pensarlo. Mueve **las dos** cosas: la ranura y
 * la mano.
 *
 * Vive aquí y no en el panel porque desde 7.12.2 lo ejecutan dos sitios: quien
 * hace clic y, en una partida acompañada, el anfitrión sobre su propio cofre.
 * Si fueran dos copias de la misma regla, un día apilarían distinto y el cofre
 * acabaría con más cosas de las que entraron.
 */
export function tocar(
  inv: Inventario,
  indice: number,
  mano: EnMano,
  admite: (objeto: number) => boolean = () => true,
): boolean {
  const r = inv.ranuras[indice];
  if (!r) return false;
  // Sacar siempre se puede; meter, solo lo que admita la ranura. Es lo que
  // impide dejar una pila de tierra en el hueco del casco.
  if (mano.objeto !== NADA && !admite(mano.objeto)) return false;

  if (mano.objeto === NADA) {
    if (estaVacia(r)) return false;
    mano.objeto = r.objeto;
    mano.cantidad = r.cantidad;
    r.objeto = NADA;
    r.cantidad = 0;
  } else if (estaVacia(r)) {
    r.objeto = mano.objeto;
    r.cantidad = mano.cantidad;
    mano.objeto = NADA;
    mano.cantidad = 0;
  } else if (r.objeto === mano.objeto) {
    const tope = defObjeto(r.objeto).maxPila;
    const cabe = Math.min(tope - r.cantidad, mano.cantidad);
    r.cantidad += cabe;
    mano.cantidad -= cabe;
    if (mano.cantidad <= 0) mano.objeto = NADA;
  } else {
    const tmp = { objeto: r.objeto, cantidad: r.cantidad };
    r.objeto = mano.objeto;
    r.cantidad = mano.cantidad;
    mano.objeto = tmp.objeto;
    mano.cantidad = tmp.cantidad;
  }
  return true;
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
  /** Deja todas las ranuras vacías. Lo usa el menú de depuración. */
  vaciar(): void {
    for (const r of this.ranuras) {
      r.objeto = 0;
      r.cantidad = 0;
    }
  }

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

  /**
   * Quita hasta `cantidad` unidades de un objeto, mire donde mire.
   *
   * Devuelve cuántas ha quitado de verdad. Se vacían primero las pilas más
   * pequeñas: así el inventario tiende a consolidarse en vez de acabar con
   * ocho ranuras de una flecha cada una.
   */
  quitar(objeto: number, cantidad: number): number {
    if (objeto === NADA || cantidad <= 0) return 0;
    const conEsto = this.ranuras
      .filter((r) => r.objeto === objeto && r.cantidad > 0)
      .sort((a, b) => a.cantidad - b.cantidad);
    let restante = cantidad;
    for (const r of conEsto) {
      if (restante === 0) break;
      const saca = Math.min(r.cantidad, restante);
      r.cantidad -= saca;
      restante -= saca;
      if (r.cantidad === 0) r.objeto = NADA;
    }
    return cantidad - restante;
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

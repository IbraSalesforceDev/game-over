import { AIRE, emisionLuz, esSolido, tapaCielo } from './tiles';
import type { Mundo } from './world';

/**
 * Iluminación por propagación con caída por tile.
 *
 * La luz no se calcula para el mundo entero: eso serían 630.000 celdas por
 * recálculo y no hace falta ninguna, porque solo se ve una ventana. El motor
 * mantiene el buffer de una ventana algo mayor que la pantalla y lo rehace
 * cuando la cámara se mueve lo suficiente, cuando cambia un tile o cuando el
 * sol sube o baja. Recalcular esa ventana cuesta menos de un milisegundo.
 *
 * La altura del cielo por columna sí es global, y se mantiene incrementalmente:
 * es lo que permite saber si un tile recibe sol sin mirar 400 filas hacia
 * arriba en cada recálculo.
 */

/** Luz que se pierde por tile al atravesar aire. */
export const CAIDA_AIRE = 18;
/** Luz que se pierde por tile al atravesar materia. */
export const CAIDA_SOLIDO = 45;
/** Luz que emite una celda llena de lava. */
export const LUZ_LAVA = 200;
/** Margen de tiles que se calcula fuera de la pantalla. */
const MARGEN = 12;
/** Cuántos tiles puede moverse la cámara antes de rehacer la ventana. */
const TOLERANCIA = 6;
/** Cambio de luz solar que obliga a recalcular. */
const TOLERANCIA_SOL = 3;

export class MotorLuz {
  /** Primera fila con algo que tape el cielo, por columna. */
  readonly alturaCielo: Int32Array;

  private luz: Uint8Array = new Uint8Array(0);
  private tx0 = 0;
  private ty0 = 0;
  private ancho = 0;
  private alto = 0;
  private sucio = true;
  private solCalculado = -999;
  /** Cola de la propagación, reutilizada entre recálculos. */
  private cola: Int32Array = new Int32Array(0);

  constructor(private readonly mundo: Mundo) {
    this.alturaCielo = new Int32Array(mundo.ancho);
    this.recalcularCielo();
  }

  /** Recorre el mundo una vez para saber hasta dónde llega el cielo abierto. */
  recalcularCielo(): void {
    const { mundo } = this;
    for (let tx = 0; tx < mundo.ancho; tx++) this.actualizarColumna(tx);
  }

  /**
   * Recalcula la altura del cielo de una columna. Se llama al tocar un tile:
   * poner un bloque puede dejar a oscuras todo lo que hay debajo.
   */
  actualizarColumna(tx: number): void {
    const { mundo } = this;
    let ty = 0;
    while (ty < mundo.alto) {
      if (tapaCielo(mundo.getTile(tx, ty)) || mundo.getPared(tx, ty) !== AIRE) break;
      ty++;
    }
    this.alturaCielo[tx] = ty;
  }

  /** Avisa de que un tile ha cambiado. */
  invalidar(tx: number): void {
    this.actualizarColumna(tx);
    this.sucio = true;
  }

  marcarSucio(): void {
    this.sucio = true;
  }

  /**
   * Asegura que la ventana cubre el rango pedido y que la luz está al día.
   * Devuelve true si ha recalculado.
   */
  actualizar(
    txVista0: number,
    tyVista0: number,
    txVista1: number,
    tyVista1: number,
    luzSolar: number,
  ): boolean {
    const anchoPedido = txVista1 - txVista0 + 1 + MARGEN * 2;
    const altoPedido = tyVista1 - tyVista0 + 1 + MARGEN * 2;
    const nuevoTx0 = txVista0 - MARGEN;
    const nuevoTy0 = tyVista0 - MARGEN;

    const cambioTamano = anchoPedido !== this.ancho || altoPedido !== this.alto;
    const cambioSol = Math.abs(luzSolar - this.solCalculado) >= TOLERANCIA_SOL;
    const desplazada =
      Math.abs(nuevoTx0 - this.tx0) > TOLERANCIA || Math.abs(nuevoTy0 - this.ty0) > TOLERANCIA;

    if (!cambioTamano && !cambioSol && !desplazada && !this.sucio) return false;

    if (cambioTamano) {
      this.ancho = anchoPedido;
      this.alto = altoPedido;
      this.luz = new Uint8Array(anchoPedido * altoPedido);
      this.cola = new Int32Array(anchoPedido * altoPedido);
    }
    this.tx0 = nuevoTx0;
    this.ty0 = nuevoTy0;
    this.solCalculado = luzSolar;
    this.sucio = false;
    this.calcular(luzSolar);
    return true;
  }

  private calcular(luzSolar: number): void {
    const { mundo, luz, cola, ancho, alto, tx0, ty0 } = this;
    luz.fill(0);

    let fin = 0;

    // Siembra: el sol entra por las columnas abiertas y las antorchas se
    // encienden allí donde estén.
    for (let y = 0; y < alto; y++) {
      const ty = ty0 + y;
      for (let x = 0; x < ancho; x++) {
        const tx = tx0 + x;
        let valor = 0;
        if (tx >= 0 && tx < mundo.ancho && ty >= 0 && ty < mundo.alto) {
          // El `<=` importa: el primer tile que tapa el cielo es la propia
          // superficie del terreno, y está a la intemperie. Si solo se ilumina
          // lo que hay por encima, de noche el suelo se ve negro porque la luz
          // de la luna no sobrevive ni a un tile de roca.
          if (ty <= this.alturaCielo[tx]!) valor = luzSolar;
          const emision = emisionLuz(mundo.getTile(tx, ty));
          if (emision > valor) valor = emision;
          // La lava alumbra proporcionalmente a lo llena que esté la celda: un
          // charco delgado no ilumina una caverna entera.
          const liquido = mundo.getLiquido(tx, ty);
          if (liquido > 0 && mundo.esLava(tx, ty)) {
            const brillo = (LUZ_LAVA * liquido) / 255;
            if (brillo > valor) valor = brillo;
          }
        } else if (ty < 0) {
          valor = luzSolar;
        }
        if (valor > 0) {
          const i = y * ancho + x;
          luz[i] = valor;
          cola[fin++] = i;
        }
      }
    }

    // Propagación tipo inundación. La cola puede desbordar el buffer inicial
    // porque una celda se reencola si mejora, así que crece si hace falta.
    let colaActual = cola;
    let cabeza = 0;
    while (cabeza < fin) {
      const i = colaActual[cabeza++]!;
      const nivel = luz[i]!;
      if (nivel <= CAIDA_AIRE) continue;
      const x = i % ancho;
      const y = (i / ancho) | 0;

      for (let d = 0; d < 4; d++) {
        const nx = x + (d === 0 ? -1 : d === 1 ? 1 : 0);
        const ny = y + (d === 2 ? -1 : d === 3 ? 1 : 0);
        if (nx < 0 || ny < 0 || nx >= ancho || ny >= alto) continue;

        const tx = tx0 + nx;
        const ty = ty0 + ny;
        const solido =
          tx >= 0 && tx < mundo.ancho && ty >= 0 && ty < mundo.alto
            ? esSolido(mundo.getTile(tx, ty))
            : true;
        const caida = solido ? CAIDA_SOLIDO : CAIDA_AIRE;
        if (nivel <= caida) continue;

        const j = ny * ancho + nx;
        const nuevo = nivel - caida;
        if (nuevo > luz[j]!) {
          luz[j] = nuevo;
          if (fin >= colaActual.length) {
            const mayor = new Int32Array(colaActual.length * 2);
            mayor.set(colaActual);
            colaActual = mayor;
          }
          colaActual[fin++] = j;
        }
      }
    }
  }

  /** Nivel de luz de un tile del mundo, 0-255. Fuera de la ventana, 0. */
  nivel(tx: number, ty: number): number {
    const x = tx - this.tx0;
    const y = ty - this.ty0;
    if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return 0;
    return this.luz[y * this.ancho + x]!;
  }

  get ventana(): { tx0: number; ty0: number; ancho: number; alto: number } {
    return { tx0: this.tx0, ty0: this.ty0, ancho: this.ancho, alto: this.alto };
  }

  /** Buffer crudo, para que el render lo vuelque sin copiarlo tile a tile. */
  get buffer(): Uint8Array {
    return this.luz;
  }
}

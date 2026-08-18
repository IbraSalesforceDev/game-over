/**
 * Escribir y leer bytes.
 *
 * Vive aquí y no dentro del guardado porque lo usan dos cosas que no se conocen
 * entre sí: el formato de partida y el protocolo de red. Son el mismo problema
 * —meter números en un `Uint8Array` y sacarlos en el mismo orden— y tenerlo dos
 * veces sería tenerlo dos veces mal.
 *
 * Todo va en big-endian, que es lo que hace `DataView` por defecto. No importa
 * cuál, importa que sea siempre el mismo en los dos extremos.
 */

export class Escritor {
  private buf = new Uint8Array(1 << 16);
  private vista = new DataView(this.buf.buffer);
  private pos = 0;

  private asegurar(bytes: number): void {
    if (this.pos + bytes <= this.buf.length) return;
    let nuevo = this.buf.length * 2;
    while (nuevo < this.pos + bytes) nuevo *= 2;
    const copia = new Uint8Array(nuevo);
    copia.set(this.buf);
    this.buf = copia;
    this.vista = new DataView(this.buf.buffer);
  }

  u8(v: number): void {
    this.asegurar(1);
    this.vista.setUint8(this.pos, v);
    this.pos += 1;
  }

  u16(v: number): void {
    this.asegurar(2);
    this.vista.setUint16(this.pos, v);
    this.pos += 2;
  }

  u32(v: number): void {
    this.asegurar(4);
    this.vista.setUint32(this.pos, v);
    this.pos += 4;
  }

  f64(v: number): void {
    this.asegurar(8);
    this.vista.setFloat64(this.pos, v);
    this.pos += 8;
  }

  /** Entero con signo de 16 bits. Las posiciones del mundo caben de sobra. */
  i16(v: number): void {
    this.asegurar(2);
    this.vista.setInt16(this.pos, v);
    this.pos += 2;
  }

  /** Bytes en crudo, con su longitud delante. */
  bytes(v: Uint8Array): void {
    this.u32(v.length);
    this.asegurar(v.length);
    this.buf.set(v, this.pos);
    this.pos += v.length;
  }

  texto(v: string): void {
    const bytes = new TextEncoder().encode(v);
    this.u16(bytes.length);
    this.asegurar(bytes.length);
    this.buf.set(bytes, this.pos);
    this.pos += bytes.length;
  }

  terminar(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }
}

export class Lector {
  private vista: DataView;
  private pos = 0;

  constructor(private readonly buf: Uint8Array) {
    this.vista = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  u8(): number {
    return this.vista.getUint8(this.pos++);
  }

  u16(): number {
    const v = this.vista.getUint16(this.pos);
    this.pos += 2;
    return v;
  }

  u32(): number {
    const v = this.vista.getUint32(this.pos);
    this.pos += 4;
    return v;
  }

  f64(): number {
    const v = this.vista.getFloat64(this.pos);
    this.pos += 8;
    return v;
  }

  i16(): number {
    const v = this.vista.getInt16(this.pos);
    this.pos += 2;
    return v;
  }

  bytes(): Uint8Array {
    const n = this.u32();
    // Una copia, no una vista: quien lo reciba no debe poder tocar el original,
    // y en la red el buffer de llegada se reutiliza.
    const v = this.buf.slice(this.pos, this.pos + n);
    this.pos += n;
    return v;
  }

  texto(): string {
    const n = this.u16();
    const bytes = this.buf.subarray(this.pos, this.pos + n);
    this.pos += n;
    return new TextDecoder().decode(bytes);
  }

  get agotado(): boolean {
    return this.pos >= this.buf.length;
  }
}


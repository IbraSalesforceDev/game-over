import { migrarId } from '../items/items';
import type { DatosCofre } from './contenedores';
import { Mundo } from './world';

/**
 * Serialización del mundo.
 *
 * El formato lleva número de versión desde el primer día: en cuanto una fase
 * futura añada una capa (líquidos, luz, cofres), los mundos guardados con la
 * versión anterior tienen que seguir abriéndose o cargárselos en cada
 * despliegue. `VERSION_FORMATO` sube y `deserializar` decide qué hacer.
 *
 * Las capas se guardan con RLE. Un mundo es enormemente repetitivo —miles de
 * tiles de piedra seguidos— así que el RLE lo deja en una fracción, y el
 * deflate posterior remata el trabajo.
 */

export const MAGIA = 0x474f5652; // 'GOVR'
/**
 * Historial del formato:
 *   1 — mundo, paredes y estado del jugador.
 *   2 — se añade la hora del mundo (fase 5). Los mundos de la versión 1 se
 *       abren igual y amanecen a las 8:00.
 *   3 — se añade el inventario (fase 6). Los mundos anteriores se abren con
 *       el equipo inicial.
 *   5 — se añade la vida del jugador (fase 8). Los mundos anteriores se
 *       abren con la vida al máximo.
 *   4 — se añaden los cofres (fase 7) y las herramientas se mudan al rango de
 *       ids 64+. Los inventarios del formato 3 se remapean al leerlos: sin
 *       eso, el pico de cobre de una partida antigua se convertiría en un
 *       horno al añadirse los muebles nuevos.
 *   6 — se añade la capa de líquidos (fase 9). Los mundos anteriores se abren
 *       secos, que es exactamente como estaban.
 */
export const VERSION_FORMATO = 6;

export interface EstadoJugador {
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
}

export interface EstadoPartida {
  semilla: string;
  jugador: EstadoJugador;
  /** Marca de tiempo de creación del mundo. */
  creado: number;
  /** Milisegundos jugados en total. */
  jugado: number;
  /** Material y capa seleccionados, para no perder el contexto al volver. */
  material: number;
  capaPared: boolean;
  /** Minuto del día en el que se dejó el mundo (formato 2 en adelante). */
  minutos: number;
  /** Ranuras del inventario como pares (objeto, cantidad); formato 3. */
  inventario: readonly (readonly [number, number])[];
  /** Contenido de los cofres del mundo; formato 4. */
  cofres: readonly DatosCofre[];
  /** Vida del jugador; formato 5. 0 significa "al máximo". */
  vida: number;
}

/** Hora a la que amanecen los mundos guardados antes de que existiera el reloj. */
export const HORA_POR_DEFECTO = 8 * 60;

export interface Partida {
  mundo: Mundo;
  estado: EstadoPartida;
}

// --- Escritura y lectura de bytes --------------------------------------------

class Escritor {
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

class Lector {
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

// --- RLE ---------------------------------------------------------------------

/** Escribe una capa como pares (valor, repeticiones). */
function escribirRle(e: Escritor, capa: Uint16Array): void {
  // Reservamos el hueco del contador y lo rellenamos al final: no sabemos
  // cuántas tiradas habrá hasta haberlas escrito.
  const tiradas: number[] = [];
  let valor = capa[0] ?? 0;
  let largo = 0;
  for (let i = 0; i < capa.length; i++) {
    const v = capa[i]!;
    if (v === valor && largo < 0xffffffff) {
      largo++;
    } else {
      tiradas.push(valor, largo);
      valor = v;
      largo = 1;
    }
  }
  if (largo > 0) tiradas.push(valor, largo);

  e.u32(tiradas.length / 2);
  for (let i = 0; i < tiradas.length; i += 2) {
    e.u16(tiradas[i]!);
    e.u32(tiradas[i + 1]!);
  }
}

function leerRle(l: Lector, capa: Uint16Array): void {
  const tiradas = l.u32();
  let pos = 0;
  for (let i = 0; i < tiradas; i++) {
    const valor = l.u16();
    const largo = l.u32();
    if (pos + largo > capa.length) {
      throw new Error('Datos de mundo corruptos: una tirada se sale de la capa');
    }
    capa.fill(valor, pos, pos + largo);
    pos += largo;
  }
  if (pos !== capa.length) {
    throw new Error(
      `Datos de mundo corruptos: se esperaban ${capa.length} tiles y hay ${pos}`,
    );
  }
}

// --- Cuerpo ------------------------------------------------------------------

/** Serializa mundo y estado sin comprimir. */
export function serializar(mundo: Mundo, estado: EstadoPartida): Uint8Array {
  const e = new Escritor();
  e.u32(mundo.ancho);
  e.u32(mundo.alto);
  e.texto(estado.semilla);
  e.f64(estado.creado);
  e.f64(estado.jugado);
  e.f64(estado.jugador.x);
  e.f64(estado.jugador.y);
  e.f64(estado.jugador.spawnX);
  e.f64(estado.jugador.spawnY);
  e.u8(estado.material);
  e.u8(estado.capaPared ? 1 : 0);
  e.u16(Math.round(estado.minutos) % 1440); // formato 2
  // Formato 3: el inventario. Va antes del RLE para que leerlo no obligue a
  // recorrer el mundo entero.
  e.u16(estado.inventario.length);
  for (const [objeto, cantidad] of estado.inventario) {
    e.u16(objeto);
    e.u16(Math.min(65535, cantidad));
  }
  // Formato 4: los cofres. Son pocos y dispersos, así que van como lista.
  e.u16(estado.cofres.length);
  for (const cofre of estado.cofres) {
    e.u32(cofre.tx);
    e.u32(cofre.ty);
    e.u16(cofre.ranuras.length);
    for (const [objeto, cantidad] of cofre.ranuras) {
      e.u16(objeto);
      e.u16(Math.min(65535, cantidad));
    }
  }
  e.u16(Math.max(0, Math.round(estado.vida))); // formato 5
  escribirRle(e, mundo.tileId);
  escribirRle(e, mundo.wallId);
  escribirRle(e, capaLiquido(mundo)); // formato 6
  return e.terminar();
}

/**
 * Empaqueta nivel y tipo de líquido en una sola capa de 16 bits: el nivel en el
 * byte bajo y el bit de lava en el 256. Así el líquido cabe en una única tirada
 * de RLE —y un mundo seco entero se guarda en una— en vez de en dos capas que
 * habría que mantener sincronizadas al leer.
 */
function capaLiquido(mundo: Mundo): Uint16Array {
  const capa = new Uint16Array(mundo.liquido.length);
  for (let i = 0; i < capa.length; i++) {
    const nivel = mundo.liquido[i]!;
    if (nivel === 0) continue;
    capa[i] = nivel | ((mundo.flags[i]! & Mundo.BIT_LAVA) !== 0 ? 256 : 0);
  }
  return capa;
}

export function deserializar(datos: Uint8Array, version = VERSION_FORMATO): Partida {
  const l = new Lector(datos);
  const ancho = l.u32();
  const alto = l.u32();
  if (ancho <= 0 || alto <= 0 || ancho > 20000 || alto > 20000) {
    throw new Error(`Dimensiones de mundo imposibles: ${ancho}x${alto}`);
  }
  const estado: {
    -readonly [K in keyof EstadoPartida]: EstadoPartida[K];
  } = {
    semilla: l.texto(),
    creado: l.f64(),
    jugado: l.f64(),
    jugador: { x: l.f64(), y: l.f64(), spawnX: l.f64(), spawnY: l.f64() },
    material: l.u8(),
    capaPared: l.u8() === 1,
    // El campo de la hora no existe en el formato 1: esos mundos amanecen.
    minutos: version >= 2 ? l.u16() : HORA_POR_DEFECTO,
    inventario: [],
    cofres: [],
    vida: 0,
  };
  if (version >= 3) {
    const n = l.u16();
    const ranuras: [number, number][] = [];
    // Antes del formato 4 las herramientas ocupaban ids del rango de tiles.
    const traducir = version < 4;
    for (let i = 0; i < n; i++) {
      const objeto = l.u16();
      ranuras.push([traducir ? migrarId(objeto) : objeto, l.u16()]);
    }
    estado.inventario = ranuras;
  }
  if (version >= 4) {
    const cuantos = l.u16();
    const cofres: DatosCofre[] = [];
    for (let c = 0; c < cuantos; c++) {
      const tx = l.u32();
      const ty = l.u32();
      const n = l.u16();
      const ranuras: [number, number][] = [];
      for (let i = 0; i < n; i++) ranuras.push([l.u16(), l.u16()]);
      cofres.push({ tx, ty, ranuras });
    }
    estado.cofres = cofres;
  }
  if (version >= 5) estado.vida = l.u16();
  const mundo = new Mundo(ancho, alto);
  leerRle(l, mundo.tileId);
  leerRle(l, mundo.wallId);
  if (version >= 6) {
    const capa = new Uint16Array(mundo.liquido.length);
    leerRle(l, capa);
    for (let i = 0; i < capa.length; i++) {
      const v = capa[i]!;
      if (v === 0) continue;
      mundo.liquido[i] = v & 255;
      if ((v & 256) !== 0) mundo.flags[i] = mundo.flags[i]! | Mundo.BIT_LAVA;
    }
  }
  return { mundo, estado };
}

// --- Empaquetado (cabecera + compresión) -------------------------------------

const CRUDO = 0;
const DEFLATE = 1;

function hayCompresion(): boolean {
  return typeof CompressionStream !== 'undefined';
}

async function comprimir(datos: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function descomprimir(datos: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/**
 * Cabecera + cuerpo comprimido. La cabecera va siempre en claro para poder
 * comprobar la magia y la versión sin descomprimir nada.
 */
export async function empaquetar(
  mundo: Mundo,
  estado: EstadoPartida,
): Promise<Uint8Array> {
  const cuerpo = serializar(mundo, estado);
  const comprime = hayCompresion();
  const carga = comprime ? await comprimir(cuerpo) : cuerpo;

  const salida = new Uint8Array(8 + carga.length);
  const vista = new DataView(salida.buffer);
  vista.setUint32(0, MAGIA);
  vista.setUint16(4, VERSION_FORMATO);
  vista.setUint8(6, comprime ? DEFLATE : CRUDO);
  vista.setUint8(7, 0);
  salida.set(carga, 8);
  return salida;
}

export async function desempaquetar(datos: Uint8Array): Promise<Partida> {
  if (datos.length < 8) throw new Error('Fichero de partida vacío o truncado');
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  if (vista.getUint32(0) !== MAGIA) {
    throw new Error('Esto no es un mundo de Game Over');
  }
  const version = vista.getUint16(4);
  if (version > VERSION_FORMATO) {
    throw new Error(
      `El mundo es de una versión más nueva (${version}) que este juego (${VERSION_FORMATO})`,
    );
  }
  const compresion = vista.getUint8(6);
  const carga = datos.subarray(8);
  const cuerpo =
    compresion === DEFLATE ? await descomprimir(carga) : carga.slice();
  return deserializar(cuerpo, version);
}

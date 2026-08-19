/**
 * Lo que se dicen dos navegadores.
 *
 * El modelo es **anfitrión autoritario**, como en Terraria: uno de los jugadores
 * simula el mundo y los demás le mandan lo que pulsan y reciben instantáneas.
 * No es lockstep —hay 33 `Math.random()` sueltos por el runtime y basta uno para
 * que dos navegadores vean partidas distintas— ni servidor de verdad, porque eso
 * pide un proceso corriendo a 60 Hz y esto es una página estática.
 *
 * ## Por qué está escrito así y no en JSON
 *
 * Las instantáneas van a 20 Hz. En JSON, una posición son unos 20 caracteres;
 * aquí son 4 bytes. A 20 Hz y con varias entidades la diferencia deja de ser
 * estética.
 *
 * ## Lo que hace que los bichos se puedan añadir después sin reescribir
 *
 * Este fichero se escribe para el juego entero aunque la fase A solo mueva
 * jugadores. Tres decisiones cargan con eso:
 *
 * 1. **Un sobre genérico.** Cada mensaje empieza por su tipo, y añadir uno nuevo
 *    no toca los que ya hay.
 * 2. **Las entidades llevan su clase.** Hoy solo existe `JUGADOR`; mañana un
 *    bicho es otro valor de ese byte y un jefe, otro. La instantánea no sabe
 *    qué está mandando, y por eso no hay que cambiarla.
 * 3. **Una versión de protocolo que se comprueba al saludar.** Igual que el
 *    formato de guardado: dos versiones distintas se rechazan con un recado en
 *    vez de conectarse y desincronizarse en silencio, que es mil veces peor.
 */

import { Escritor, Lector } from '../core/bytes';

/**
 * Sube cuando cambia lo que se manda por el cable.
 *
 * No tiene nada que ver con la versión del juego ni con la del guardado: son
 * tres números que suben por motivos distintos.
 */
export const VERSION_PROTOCOLO = 2;

/** Tipos de mensaje. El primer byte de todo lo que se manda. */
export const MSG = {
  /** Cliente → anfitrión, al conectar. */
  HOLA: 1,
  /** Anfitrión → cliente: bienvenido, y este es tu número de jugador. */
  BIENVENIDO: 2,
  /** Anfitrión → cliente: no entras, y por esto. */
  RECHAZO: 3,
  /** Anfitrión → cliente: un trozo del mundo. */
  MUNDO: 4,
  /** Cliente → anfitrión: lo que estoy pulsando. */
  ENTRADA: 5,
  /** Anfitrión → cliente: cómo está todo ahora mismo. */
  INSTANTANEA: 6,
  /** Cliente → anfitrión: quiero picar o poner aquí. */
  PIDO_TILE: 7,
  /** Anfitrión → cliente: estos tiles han cambiado. */
  TILES: 8,
  /** Los dos: me voy. */
  ADIOS: 9,
} as const;

export type TipoMensaje = (typeof MSG)[keyof typeof MSG];

/**
 * Clases de entidad.
 *
 * En la fase A solo se manda `JUGADOR`. Los demás existen ya para que el hueco
 * esté hecho: la instantánea los transporta sin enterarse de qué son.
 */
export const ENT = {
  JUGADOR: 1,
  BICHO: 2,
  PROYECTIL: 3,
  OBJETO: 4,
} as const;

export type ClaseEntidad = (typeof ENT)[keyof typeof ENT];

/** Motivos de rechazo, para poder decirle a la persona qué ha pasado. */
export const RECHAZO = {
  VERSION: 1,
  LLENO: 2,
  OTRA_PARTIDA: 3,
} as const;

export function textoRechazo(motivo: number): string {
  switch (motivo) {
    case RECHAZO.VERSION:
      return 'Los dos tenéis versiones distintas del juego. Recargad la página.';
    case RECHAZO.LLENO:
      return 'Esa partida está llena.';
    case RECHAZO.OTRA_PARTIDA:
      return 'El anfitrión está jugando en otro mundo.';
    default:
      return 'El anfitrión no te ha dejado entrar.';
  }
}

// --- Botones ----------------------------------------------------------------

/**
 * Lo que se pulsa, en un byte.
 *
 * Un byte y no un objeto porque esto viaja 30 veces por segundo por cada
 * jugador. Es además lo único que el cliente le manda al anfitrión: no le manda
 * su posición, porque entonces cualquiera podría teletransportarse escribiendo
 * un número.
 */
export const BOTON = {
  IZQUIERDA: 1 << 0,
  DERECHA: 1 << 1,
  ARRIBA: 1 << 2,
  ABAJO: 1 << 3,
  SALTO: 1 << 4,
  USAR: 1 << 5,
  ALTERNAR: 1 << 6,
} as const;

export interface Entrada {
  /** El tick del cliente al pulsar. Es lo que permite reconciliar después. */
  tick: number;
  botones: number;
  /** Dónde apunta el ratón, en tiles. */
  ratonTx: number;
  ratonTy: number;
}

/**
 * Los bits de `banderas`.
 *
 * No son adorno: sin ellos, repetir las teclas del cliente arranca en una fase
 * de salto equivocada y el personaje acaba en otro sitio. Medido: hasta 96 px
 * —seis tiles— de desvío con 200 ms de red. Ver `prediccion.ts`.
 */
export const BANDERA = {
  EN_SUELO: 1 << 0,
  SALTANDO: 1 << 1,
  NADABA: 1 << 2,
  MIRA_DERECHA: 1 << 3,
} as const;

export interface EntidadRed {
  clase: ClaseEntidad;
  id: number;
  /** Píxeles de mundo. */
  x: number;
  y: number;
  /** Píxeles por tick, x256 para que quepan en un entero sin perder el detalle. */
  vx: number;
  vy: number;
  banderas: number;
  vida: number;
  /**
   * Qué es exactamente, dentro de su clase.
   *
   * Para un `BICHO` es su especie; para un `JUGADOR` no significa nada. Este
   * byte es lo que hace que la instantánea no tenga que saber qué transporta:
   * añadir bichos no le cambió ni un campo, solo le dio un uso a este.
   */
  sub: number;
  /**
   * El estado del salto.
   *
   * Va en la instantánea porque la reconciliación lo necesita para volver a
   * aplicar las teclas desde el sitio correcto. La posición sola no vale: dos
   * personajes en el mismo punto, uno subiendo y otro cayendo, se separan al
   * tick siguiente.
   */
  ticksCoyote: number;
  ticksBuffer: number;
  ticksSalto: number;
  /** Desde qué altura se empezó a caer, para el daño por caída. */
  yInicioCaida: number;
  /** Tope de vida. Sin esto no se puede pintar la barra de un bicho. */
  vidaMax: number;
}

export interface Instantanea {
  /** Tick del anfitrión. */
  tick: number;
  /**
   * El último tick que el anfitrión ha procesado de este cliente.
   *
   * Es la pieza que hace posible la reconciliación: el cliente sabe hasta dónde
   * le han hecho caso y puede volver a aplicar solo lo de después.
   */
  tickConfirmado: number;
  entidades: EntidadRed[];
}

export interface CambioTile {
  tx: number;
  ty: number;
  /** El id del tile, o 0 para aire. */
  id: number;
  /** Si toca la capa de paredes en vez de la de bloques. */
  pared: boolean;
}

// --- Empaquetar -------------------------------------------------------------

export function escribirHola(nombre: string, idPartida: string): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.HOLA);
  e.u16(VERSION_PROTOCOLO);
  e.texto(nombre);
  e.texto(idPartida);
  return e.terminar();
}

export function escribirBienvenido(numeroJugador: number, tick: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.BIENVENIDO);
  e.u8(numeroJugador);
  e.u32(tick);
  return e.terminar();
}

export function escribirRechazo(motivo: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.RECHAZO);
  e.u8(motivo);
  return e.terminar();
}

/**
 * Un trozo del mundo.
 *
 * Va troceado porque un mundo son de 41 a 345 KB y un canal de datos no traga
 * mensajes de ese tamaño de una vez. El número de trozo va dentro para poder
 * enseñar una barra de progreso mientras llega.
 */
export function escribirMundo(trozo: number, total: number, datos: Uint8Array): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.MUNDO);
  e.u16(trozo);
  e.u16(total);
  e.bytes(datos);
  return e.terminar();
}

export function escribirEntrada(entrada: Entrada): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.ENTRADA);
  e.u32(entrada.tick);
  e.u8(entrada.botones);
  e.i16(entrada.ratonTx);
  e.i16(entrada.ratonTy);
  return e.terminar();
}

export function escribirInstantanea(inst: Instantanea): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.INSTANTANEA);
  e.u32(inst.tick);
  e.u32(inst.tickConfirmado);
  e.u16(inst.entidades.length);
  for (const ent of inst.entidades) {
    e.u8(ent.clase);
    e.u16(ent.id);
    e.i16(Math.round(ent.x));
    e.i16(Math.round(ent.y));
    // La velocidad se manda x256 porque en píxeles por tick es un número
    // pequeño con decimales que importan: redondearla a entero se nota como
    // tirones al interpolar.
    e.i16(Math.max(-32768, Math.min(32767, Math.round(ent.vx * 256))));
    e.i16(Math.max(-32768, Math.min(32767, Math.round(ent.vy * 256))));
    e.u8(ent.banderas);
    e.u16(Math.max(0, Math.min(65535, Math.round(ent.vida))));
    e.u8(Math.max(0, Math.min(255, ent.sub)));
    e.u8(Math.max(0, Math.min(255, ent.ticksCoyote)));
    e.u8(Math.max(0, Math.min(255, ent.ticksBuffer)));
    e.u8(Math.max(0, Math.min(255, ent.ticksSalto)));
    e.i16(Math.max(-32768, Math.min(32767, Math.round(ent.yInicioCaida))));
    e.u16(Math.max(0, Math.min(65535, Math.round(ent.vidaMax))));
  }
  return e.terminar();
}

export function escribirPidoTile(c: CambioTile): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.PIDO_TILE);
  e.i16(c.tx);
  e.i16(c.ty);
  e.u16(c.id);
  e.u8(c.pared ? 1 : 0);
  return e.terminar();
}

export function escribirTiles(cambios: readonly CambioTile[]): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.TILES);
  e.u16(cambios.length);
  for (const c of cambios) {
    e.i16(c.tx);
    e.i16(c.ty);
    e.u16(c.id);
    e.u8(c.pared ? 1 : 0);
  }
  return e.terminar();
}

export function escribirAdios(): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.ADIOS);
  return e.terminar();
}

// --- Desempaquetar ----------------------------------------------------------

export type Mensaje =
  | { tipo: typeof MSG.HOLA; version: number; nombre: string; idPartida: string }
  | { tipo: typeof MSG.BIENVENIDO; numeroJugador: number; tick: number }
  | { tipo: typeof MSG.RECHAZO; motivo: number }
  | { tipo: typeof MSG.MUNDO; trozo: number; total: number; datos: Uint8Array }
  | { tipo: typeof MSG.ENTRADA; entrada: Entrada }
  | { tipo: typeof MSG.INSTANTANEA; instantanea: Instantanea }
  | { tipo: typeof MSG.PIDO_TILE; cambio: CambioTile }
  | { tipo: typeof MSG.TILES; cambios: CambioTile[] }
  | { tipo: typeof MSG.ADIOS };

/**
 * Lee un mensaje. Devuelve null si no se entiende.
 *
 * **Null y no una excepción**, y no es pereza: al otro lado del cable hay algo
 * que no controlamos. Un mensaje corrupto, de una versión futura o de alguien
 * cacharreando no puede tirar la partida de nadie; se ignora y se sigue.
 */
export function leerMensaje(datos: Uint8Array): Mensaje | null {
  if (datos.length < 1) return null;
  try {
    const l = new Lector(datos);
    const tipo = l.u8();
    switch (tipo) {
      case MSG.HOLA:
        return { tipo: MSG.HOLA, version: l.u16(), nombre: l.texto(), idPartida: l.texto() };
      case MSG.BIENVENIDO:
        return { tipo: MSG.BIENVENIDO, numeroJugador: l.u8(), tick: l.u32() };
      case MSG.RECHAZO:
        return { tipo: MSG.RECHAZO, motivo: l.u8() };
      case MSG.MUNDO:
        return { tipo: MSG.MUNDO, trozo: l.u16(), total: l.u16(), datos: l.bytes() };
      case MSG.ENTRADA:
        return {
          tipo: MSG.ENTRADA,
          entrada: { tick: l.u32(), botones: l.u8(), ratonTx: l.i16(), ratonTy: l.i16() },
        };
      case MSG.INSTANTANEA: {
        const tick = l.u32();
        const tickConfirmado = l.u32();
        const n = l.u16();
        const entidades: EntidadRed[] = [];
        for (let i = 0; i < n; i++) {
          entidades.push({
            clase: l.u8() as ClaseEntidad,
            id: l.u16(),
            x: l.i16(),
            y: l.i16(),
            vx: l.i16() / 256,
            vy: l.i16() / 256,
            banderas: l.u8(),
            vida: l.u16(),
            sub: l.u8(),
            ticksCoyote: l.u8(),
            ticksBuffer: l.u8(),
            ticksSalto: l.u8(),
            yInicioCaida: l.i16(),
            vidaMax: l.u16(),
          });
        }
        return { tipo: MSG.INSTANTANEA, instantanea: { tick, tickConfirmado, entidades } };
      }
      case MSG.PIDO_TILE:
        return {
          tipo: MSG.PIDO_TILE,
          cambio: { tx: l.i16(), ty: l.i16(), id: l.u16(), pared: l.u8() === 1 },
        };
      case MSG.TILES: {
        const n = l.u16();
        const cambios: CambioTile[] = [];
        for (let i = 0; i < n; i++) {
          cambios.push({ tx: l.i16(), ty: l.i16(), id: l.u16(), pared: l.u8() === 1 });
        }
        return { tipo: MSG.TILES, cambios };
      }
      case MSG.ADIOS:
        return { tipo: MSG.ADIOS };
      default:
        return null;
    }
  } catch {
    // Truncado a la mitad, o con menos bytes de los que dice llevar.
    return null;
  }
}

/** Trocea el mundo para que quepa por el canal de datos. */
export const BYTES_POR_TROZO = 16 * 1024;

export function trocearMundo(datos: Uint8Array): Uint8Array[] {
  const total = Math.max(1, Math.ceil(datos.length / BYTES_POR_TROZO));
  const trozos: Uint8Array[] = [];
  for (let i = 0; i < total; i++) {
    trozos.push(
      escribirMundo(i, total, datos.subarray(i * BYTES_POR_TROZO, (i + 1) * BYTES_POR_TROZO)),
    );
  }
  return trozos;
}

/**
 * Junta los trozos según llegan. Devuelve el mundo cuando están todos.
 *
 * Guarda por número de trozo y no en una lista que va creciendo porque el canal
 * fiable garantiza el orden, pero el día que algo llegue dos veces —una
 * reconexión, un reintento— sumar a ciegas daría un mundo corrupto que no
 * fallaría hasta abrirlo.
 */
export class JuntaMundo {
  private trozos = new Map<number, Uint8Array>();
  private total = 0;

  añadir(trozo: number, total: number, datos: Uint8Array): Uint8Array | null {
    this.total = total;
    this.trozos.set(trozo, datos);
    if (this.trozos.size < total) return null;

    let largo = 0;
    for (let i = 0; i < total; i++) largo += this.trozos.get(i)?.length ?? 0;
    const entero = new Uint8Array(largo);
    let pos = 0;
    for (let i = 0; i < total; i++) {
      const t = this.trozos.get(i);
      if (!t) return null; // falta uno: aún no está
      entero.set(t, pos);
      pos += t.length;
    }
    return entero;
  }

  /** De 0 a 1, para la barra de progreso. */
  get progreso(): number {
    return this.total === 0 ? 0 : this.trozos.size / this.total;
  }
}

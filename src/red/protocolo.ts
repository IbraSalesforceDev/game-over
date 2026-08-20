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
export const VERSION_PROTOCOLO = 9;

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
  /**
   * Anfitrión → cliente: te acaban de dar.
   *
   * El anfitrión decide **que** te han dado y **cuánto** pega lo que te ha
   * dado; la armadura, la invulnerabilidad y la muerte las aplica cada uno en
   * su casa. Es un reparto a medias y conviene decir por qué: llevar la vida de
   * todos en el anfitrión pedía mandar también armadura, efectos y pociones de
   * cada uno, y esto es un juego para tres amigos, no un servidor público. Lo
   * que sí decide el anfitrión es lo único que no se puede falsear sin que se
   * note: dónde está cada bicho y a quién ha tocado.
   */
  DANO: 10,
  /**
   * Cliente → anfitrión: he dado un mandoble con esto y hacia allí.
   *
   * No dice a quién le ha dado ni cuánto: eso lo resuelve el anfitrión con sus
   * bichos y su mundo. Lo único que viaja es el arma y la dirección, que es lo
   * mismo que ve el jugador al pulsar. La cadencia también la comprueba el
   * anfitrión, con la misma regla que en local: sin eso, un cliente modificado
   * mandaría un golpe por tick.
   */
  GOLPE: 11,
  /** Cliente → anfitrión: quiero coger ese objeto del suelo. */
  COJO: 12,
  /** Anfitrión → cliente: es tuyo, mételo en el zurrón. */
  RECOGIDO: 13,
  /**
   * Anfitrión → cliente: así está el agua ahora.
   *
   * El líquido lo simula solo el anfitrión y el invitado lo recibe hecho. Los
   * dos simulándolo por su cuenta parece que funcionaría —el simulador es
   * determinista— pero no lo es: el mundo de cada uno se toca en momentos
   * distintos, y basta un bloque picado un tick antes en un lado para que dos
   * cascadas idénticas acaben en sitios distintos. Y un cubo de agua vertido
   * por uno no llegaba al otro de ninguna manera.
   */
  LIQUIDOS: 14,
  /**
   * Cliente → anfitrión: he usado un cubo aquí.
   *
   * Va como petición y no como hecho consumado por lo mismo que los tiles: el
   * agua es del mundo y el mundo lo lleva el anfitrión. El invitado lo pinta al
   * momento —esperar a que el agua caiga se siente fatal— y la siguiente tanda
   * de líquidos lo deja como toque.
   */
  CUBO: 15,
  /**
   * Cliente → anfitrión: ábreme ese cofre.
   *
   * Hace falta preguntar aunque el invitado tenga su copia del mundo, porque su
   * copia es de cuando entró: desde entonces el anfitrión ha podido guardar o
   * sacar cosas de ese mismo cofre, y abrirlo con lo que uno recuerda es la
   * forma más rápida de que dos jugadores vean cofres distintos.
   */
  COFRE_ABRIR: 16,
  /**
   * Cliente → anfitrión: he tocado esa ranura llevando esto en la mano.
   *
   * Lo que viaja es el gesto, no el resultado. El anfitrión lo repite sobre su
   * cofre —con la misma función que usa el panel— y contesta con cómo ha
   * quedado el cofre y qué ha quedado en la mano. Así dos que cojan lo mismo a
   * la vez no lo duplican: el segundo se encuentra la ranura ya vacía.
   */
  COFRE_TOCAR: 17,
  /** Anfitrión → cliente: así está ese cofre, y esto es lo que llevas. */
  COFRE: 18,
  /**
   * Cliente → anfitrión: esto es lo que llevo encima.
   *
   * Los efectos de cada uno son suyos —se los bebe él y se le pasan a él— pero
   * el anfitrión los necesita para dos cosas que decide él: lo deprisa que
   * corre el invitado, porque su física la simula el anfitrión, y lo fuerte que
   * pega, porque sus mandobles los resuelve el anfitrión. Sin esto, un invitado
   * que bebía ligereza se veía a sí mismo corriendo y el anfitrión lo devolvía
   * a su sitio veinte veces por segundo.
   *
   * Se manda la causa y no el resultado: los efectos con lo que les queda, no
   * «multiplico la velocidad por 1,2». Así el día que haya una poción más, esto
   * no se entera.
   *
   * Y desde 7.13.0 lleva además la vida, que es lo que hace falta para pintarle
   * la barra a un compañero. La vida sigue siendo de cada uno —la armadura, el
   * empujón y la muerte los aplica él— pero verla no puede depender de eso: sin
   * la barra no se sabe si al de al lado le queda un golpe o veinte, y jugar
   * acompañado es sobre todo saber cuándo hay que ir a echar una mano.
   */
  ESTADO: 19,
  /** Anfitrión → cliente: cúrate esto. Lo que hace la savia de un arma. */
  CURA: 20,
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
   * Para un `BICHO` es su especie, para un `OBJETO` es qué objeto y para un
   * `JUGADOR` no significa nada. Es lo que hace que la instantánea no tenga que
   * saber qué transporta: añadir bichos no le cambió ni un campo, solo le dio un
   * uso a este.
   *
   * Ocupa dos bytes desde el protocolo 4. Con uno solo cabían las especies, que
   * son veintitrés, pero no los objetos, que pasan de doscientos: la alternativa
   * era meter el identificador del objeto en el campo de la vida, y un campo que
   * significa dos cosas según quién lo mire es la clase de atajo que se cobra
   * meses después.
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
   * La hora del mundo, en minutos del día (0-1439).
   *
   * Viaja en cada instantánea porque el reloj es del mundo y el mundo lo lleva
   * el anfitrión. Antes cada uno corría el suyo: se empezaba a la misma hora
   * —la del fichero— y a los pocos minutos uno estaba a mediodía y el otro de
   * noche, en el mismo sitio. Dos bytes veinte veces por segundo es un precio
   * ridículo por que los dos vean el mismo cielo.
   */
  minutos: number;
  /**
   * El suceso en marcha, en un número (0 = ninguno).
   *
   * Viaja con la hora y por lo mismo: es del mundo, no de quien mira. Cada uno
   * sorteando el suyo daba partidas en las que a uno le caía una luna de sangre
   * y al otro no, en el mismo sitio y a la misma hora.
   */
  suceso: number;
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
  e.u16(Math.max(0, Math.min(1439, Math.round(inst.minutos))));
  e.u8(Math.max(0, Math.min(255, inst.suceso)));
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
    e.u16(Math.max(0, Math.min(65535, ent.sub)));
    e.u8(Math.max(0, Math.min(255, ent.ticksCoyote)));
    e.u8(Math.max(0, Math.min(255, ent.ticksBuffer)));
    e.u8(Math.max(0, Math.min(255, ent.ticksSalto)));
    e.i16(Math.max(-32768, Math.min(32767, Math.round(ent.yInicioCaida))));
    e.u16(Math.max(0, Math.min(65535, Math.round(ent.vidaMax))));
  }
  return e.terminar();
}

/** Un mandoble del invitado, para que lo resuelva quien tiene los bichos. */
export function escribirGolpe(arma: number, direccion: 1 | -1, sentido: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.GOLPE);
  e.u16(arma);
  e.u8(direccion === 1 ? 1 : 0);
  e.u8(sentido);
  return e.terminar();
}

/** Un efecto y lo que le queda, tal cual viaja. */
export interface EfectoRed {
  /** El número del efecto, según `ORDEN_EFECTOS`. */
  clase: number;
  ticks: number;
}

export function escribirEstado(
  efectos: readonly EfectoRed[],
  vida = 0,
  vidaMax = 0,
): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.ESTADO);
  e.u16(Math.max(0, Math.min(65535, Math.round(vida))));
  e.u16(Math.max(0, Math.min(65535, Math.round(vidaMax))));
  e.u8(Math.min(255, efectos.length));
  for (const ef of efectos.slice(0, 255)) {
    e.u8(ef.clase);
    e.u16(Math.max(0, Math.min(65535, Math.round(ef.ticks))));
  }
  return e.terminar();
}

export function escribirCura(cantidad: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.CURA);
  e.u16(Math.max(0, Math.min(65535, Math.round(cantidad))));
  return e.terminar();
}

export interface EstadoCofre {
  tx: number;
  ty: number;
  /** Las veinte ranuras, como pares (objeto, cantidad). */
  ranuras: [number, number][];
  /**
   * Lo que le queda en la mano a quien tocó, o null si esto no viene de tocar.
   *
   * Va junto y no en un mensaje aparte porque es la otra mitad del mismo
   * movimiento: el cofre y la mano cambian a la vez, y separarlos abriría un
   * instante en el que un objeto está en los dos sitios o en ninguno.
   */
  mano: { objeto: number; cantidad: number } | null;
}

export function escribirCofreAbrir(tx: number, ty: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.COFRE_ABRIR);
  e.i16(tx);
  e.i16(ty);
  return e.terminar();
}

export function escribirCofreTocar(
  tx: number,
  ty: number,
  ranura: number,
  objeto: number,
  cantidad: number,
): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.COFRE_TOCAR);
  e.i16(tx);
  e.i16(ty);
  e.u8(ranura);
  e.u16(objeto);
  e.u16(cantidad);
  return e.terminar();
}

export function escribirCofre(c: EstadoCofre): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.COFRE);
  e.i16(c.tx);
  e.i16(c.ty);
  e.u8(c.mano ? 1 : 0);
  e.u16(c.mano?.objeto ?? 0);
  e.u16(c.mano?.cantidad ?? 0);
  e.u8(c.ranuras.length);
  for (const [objeto, cantidad] of c.ranuras) {
    e.u16(objeto);
    e.u16(cantidad);
  }
  return e.terminar();
}

/** Un cubo usado en una casilla. El anfitrión mira si se puede. */
export function escribirCubo(objeto: number, tx: number, ty: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.CUBO);
  e.u16(objeto);
  e.i16(tx);
  e.i16(ty);
  return e.terminar();
}

/** «Quiero ese de ahí» y «tuyo es», las dos mitades de recoger algo del suelo. */
export function escribirCojo(idDrop: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.COJO);
  e.u16(idDrop);
  return e.terminar();
}

export function escribirRecogido(objeto: number, cantidad: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.RECOGIDO);
  e.u16(objeto);
  e.u16(cantidad);
  return e.terminar();
}

export interface CambioLiquido {
  tx: number;
  ty: number;
  /** 0-255. Cero es que ahí ya no hay nada. */
  nivel: number;
  lava: boolean;
}

/** Cómo ha quedado el líquido de unas cuantas celdas. */
export function escribirLiquidos(cambios: readonly CambioLiquido[]): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.LIQUIDOS);
  e.u16(cambios.length);
  for (const c of cambios) {
    e.i16(c.tx);
    e.i16(c.ty);
    e.u8(Math.max(0, Math.min(255, c.nivel)));
    e.u8(c.lava ? 1 : 0);
  }
  return e.terminar();
}

/** Un golpe que hay que cobrarse en el otro lado. */
export function escribirDano(dano: number, desdeX: number): Uint8Array {
  const e = new Escritor();
  e.u8(MSG.DANO);
  e.u16(Math.max(0, Math.min(65535, Math.round(dano))));
  e.i16(Math.max(-32768, Math.min(32767, Math.round(desdeX))));
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
  | { tipo: typeof MSG.ADIOS }
  | { tipo: typeof MSG.DANO; dano: number; desdeX: number }
  | { tipo: typeof MSG.GOLPE; arma: number; direccion: 1 | -1; sentido: number }
  | { tipo: typeof MSG.COJO; idDrop: number }
  | { tipo: typeof MSG.RECOGIDO; objeto: number; cantidad: number }
  | { tipo: typeof MSG.LIQUIDOS; cambios: CambioLiquido[] }
  | { tipo: typeof MSG.CUBO; objeto: number; tx: number; ty: number }
  | { tipo: typeof MSG.COFRE_ABRIR; tx: number; ty: number }
  | {
      tipo: typeof MSG.COFRE_TOCAR;
      tx: number;
      ty: number;
      ranura: number;
      objeto: number;
      cantidad: number;
    }
  | { tipo: typeof MSG.COFRE; cofre: EstadoCofre }
  | { tipo: typeof MSG.ESTADO; vida: number; vidaMax: number; efectos: EfectoRed[] }
  | { tipo: typeof MSG.CURA; cantidad: number };

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
        const minutos = l.u16();
        const suceso = l.u8();
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
            sub: l.u16(),
            ticksCoyote: l.u8(),
            ticksBuffer: l.u8(),
            ticksSalto: l.u8(),
            yInicioCaida: l.i16(),
            vidaMax: l.u16(),
          });
        }
        return {
          tipo: MSG.INSTANTANEA,
          instantanea: { tick, tickConfirmado, minutos, suceso, entidades },
        };
      }
      case MSG.DANO:
        return { tipo: MSG.DANO, dano: l.u16(), desdeX: l.i16() };
      case MSG.GOLPE:
        return {
          tipo: MSG.GOLPE,
          arma: l.u16(),
          direccion: l.u8() === 1 ? 1 : -1,
          sentido: l.u8(),
        };
      case MSG.LIQUIDOS: {
        const n = l.u16();
        const cambios: CambioLiquido[] = [];
        for (let i = 0; i < n; i++) {
          cambios.push({ tx: l.i16(), ty: l.i16(), nivel: l.u8(), lava: l.u8() === 1 });
        }
        return { tipo: MSG.LIQUIDOS, cambios };
      }
      case MSG.CUBO:
        return { tipo: MSG.CUBO, objeto: l.u16(), tx: l.i16(), ty: l.i16() };
      case MSG.ESTADO: {
        const vida = l.u16();
        const vidaMax = l.u16();
        const n = l.u8();
        const efectos: EfectoRed[] = [];
        for (let i = 0; i < n; i++) efectos.push({ clase: l.u8(), ticks: l.u16() });
        return { tipo: MSG.ESTADO, vida, vidaMax, efectos };
      }
      case MSG.CURA:
        return { tipo: MSG.CURA, cantidad: l.u16() };
      case MSG.COFRE_ABRIR:
        return { tipo: MSG.COFRE_ABRIR, tx: l.i16(), ty: l.i16() };
      case MSG.COFRE_TOCAR:
        return {
          tipo: MSG.COFRE_TOCAR,
          tx: l.i16(),
          ty: l.i16(),
          ranura: l.u8(),
          objeto: l.u16(),
          cantidad: l.u16(),
        };
      case MSG.COFRE: {
        const tx = l.i16();
        const ty = l.i16();
        const hayMano = l.u8() === 1;
        const objeto = l.u16();
        const cantidad = l.u16();
        const n = l.u8();
        const ranuras: [number, number][] = [];
        for (let i = 0; i < n; i++) ranuras.push([l.u16(), l.u16()]);
        return {
          tipo: MSG.COFRE,
          cofre: { tx, ty, ranuras, mano: hayMano ? { objeto, cantidad } : null },
        };
      }
      case MSG.COJO:
        return { tipo: MSG.COJO, idDrop: l.u16() };
      case MSG.RECOGIDO:
        return { tipo: MSG.RECOGIDO, objeto: l.u16(), cantidad: l.u16() };
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

/**
 * El lado que manda.
 *
 * El anfitrión simula el mundo y los demás le mandan lo que pulsan. Aquí no hay
 * WebRTC: se habla contra un `Enlace`, que es «algo por lo que mandar bytes».
 * Así esto se prueba entero contra un enlace de mentira con retraso y pérdidas,
 * que es la única forma de saber si funciona antes de abrir dos navegadores.
 *
 * ## La regla que no se rompe
 *
 * **Nada de lo que llega se cree sin comprobar.** Un cliente manda teclas, no
 * posiciones, y cuando pide picar un bloque el anfitrión mira si lo tiene a
 * mano. Un cliente modificado es un caso normal, no un ataque exótico: la mitad
 * de la gracia de tener un anfitrión autoritario es justamente esta.
 */

import { TILE } from '../core/constants';
import { actualizarFisica, crearCaja, type Ajustes, type Caja, type Entrada } from '../entities/physics';
import { JUGADOR_ALTO, JUGADOR_ANCHO } from '../core/constants';
import type { Mundo } from '../world/world';
import { indiceDeEspecie, type Acompanante, type Enemigo } from '../entities/enemies';
import { TICKS_INVULNERABLE } from '../entities/salud';
import { autoridadDeCaja } from './prediccion';
import {
  BOTON,
  ENT,
  MSG,
  escribirDano,
  RECHAZO,
  VERSION_PROTOCOLO,
  escribirBienvenido,
  escribirInstantanea,
  escribirRechazo,
  escribirTiles,
  leerMensaje,
  trocearMundo,
  type CambioTile,
  type EntidadRed,
} from './protocolo';

/** Algo por lo que mandar bytes. `Conexion` lo cumple. */
export interface Enlace {
  mandarVivo(datos: Uint8Array): void;
  mandarFirme(datos: Uint8Array): void;
}

/** Cada cuántos ticks sale una instantánea. 3 sobre 60 son 20 por segundo. */
export const TICKS_POR_INSTANTANEA = 3;

/**
 * Hasta dónde llega el brazo de un jugador, en tiles.
 *
 * El mismo número para todos y comprobado aquí: si solo lo comprobara el
 * cliente, un cliente modificado picaría el mundo entero desde su sitio.
 */
export const ALCANCE_TILES = 8;

/**
 * Desde dónde empiezan los identificadores de bicho.
 *
 * Los jugadores van del 1 en adelante y son pocos; los bichos empiezan bien
 * arriba para que un número no pueda significar las dos cosas.
 */
export const BASE_ID_BICHO = 1000;

/**
 * Cuántos bichos caben en una instantánea.
 *
 * Cada uno son 20 bytes y esto va 20 veces por segundo. Con el tope en 60 son
 * 24 KB/s, que sigue siendo poco; sin tope, una luna de sangre con doscientos
 * bichos llenaría el canal de golpe.
 */
export const TOPE_BICHOS = 60;

export interface JugadorConectado {
  /** Número corto, el que viaja en las instantáneas. */
  id: number;
  nombre: string;
  enlace: Enlace;
  caja: Caja;
  /** Lo último que dijo que estaba pulsando. */
  entrada: Entrada;
  /** El tick suyo que corresponde a esa entrada. */
  ultimoTick: number;
  /** Ya se le ha mandado el mundo. */
  listo: boolean;
  /**
   * Ticks que le quedan de invulnerabilidad, contados aquí.
   *
   * Los lleva el anfitrión porque es quien decide que le han dado: sin esta
   * cuenta, un slime pegado a alguien le mandaría un golpe cada tick, sesenta
   * por segundo. Es la misma regla que en local, aplicada en el sitio en el que
   * se toma la decisión.
   */
  invulnerable: number;
}

export interface OpcionesAnfitrion {
  mundo: Mundo;
  ajustes: Ajustes;
  idPartida: string;
  /** Dónde aparecen los que entran, en tiles. */
  spawnTx: number;
  spawnTy: number;
  /** El mundo empaquetado, para mandárselo a quien entre. */
  bytesDelMundo: () => Promise<Uint8Array>;
  maxJugadores?: number;
  /** Avisos para la interfaz. */
  alEntrar?: (j: JugadorConectado) => void;
  alSalir?: (id: number) => void;
  /** Un tile ha cambiado por petición de alguien: el juego tiene que enterarse. */
  alCambiarTile?: (c: CambioTile) => void;
  /**
   * Los bichos que hay ahora mismo.
   *
   * Se pide en cada instantánea en vez de guardarse: la lista del juego cambia
   * sola —nacen, mueren, se olvidan— y una copia se quedaría vieja al momento.
   */
  bichos?: () => readonly Enemigo[];
  /**
   * La hora del mundo ahora mismo, en minutos del día.
   *
   * Se pide en cada instantánea, como los bichos: el reloj corre solo y una
   * copia se quedaría vieja al momento.
   */
  minutos?: () => number;
}

function entradaDeBotones(botones: number, antes: Entrada): Entrada {
  const salto = (botones & BOTON.SALTO) !== 0;
  return {
    izq: (botones & BOTON.IZQUIERDA) !== 0,
    der: (botones & BOTON.DERECHA) !== 0,
    abajo: (botones & BOTON.ABAJO) !== 0,
    salto,
    // El flanco se deduce aquí y no viaja: mandarlo dejaría que un cliente
    // afirmara "he pulsado salto" en todos los ticks y saltara sin parar.
    saltoPulsado: salto && !antes.salto,
  };
}

const ENTRADA_QUIETA: Entrada = {
  izq: false,
  der: false,
  abajo: false,
  salto: false,
  saltoPulsado: false,
};

export class Anfitrion {
  private jugadores = new Map<number, JugadorConectado>();
  private siguienteId = 2; // el 1 es el anfitrión
  private tickActual = 0;
  /** Tiles cambiados desde la última difusión. */
  private pendientes: CambioTile[] = [];

  constructor(private readonly op: OpcionesAnfitrion) {}

  get tick(): number {
    return this.tickActual;
  }

  get conectados(): readonly JugadorConectado[] {
    return [...this.jugadores.values()];
  }

  /**
   * Llega alguien. Todavía no es un jugador: lo será cuando salude bien.
   *
   * Devuelve el identificador con el que hay que pasarle después los mensajes.
   */
  recibir(enlace: Enlace, datos: Uint8Array, quien: number | null): number | null {
    const m = leerMensaje(datos);
    if (!m) return quien; // basura: ni se contesta

    if (m.tipo === MSG.HOLA) {
      if (m.version !== VERSION_PROTOCOLO) {
        enlace.mandarFirme(escribirRechazo(RECHAZO.VERSION));
        return null;
      }
      if (m.idPartida !== this.op.idPartida) {
        enlace.mandarFirme(escribirRechazo(RECHAZO.OTRA_PARTIDA));
        return null;
      }
      // Un segundo saludo por el mismo canal no es otro jugador: es el mismo
      // repitiendo porque no le ha llegado la bienvenida. Sin esta línea, cada
      // repetición entraba como alguien nuevo, y el invitado acababa viendo un
      // fantasma de sí mismo mientras el anfitrión contaba dos personas con el
      // mismo nombre. Se le vuelve a dar la bienvenida y ya está: el mundo no se
      // manda otra vez, que ese ya iba de camino por el canal fiable.
      if (quien !== null && this.jugadores.has(quien)) {
        enlace.mandarFirme(escribirBienvenido(quien, this.tickActual));
        return quien;
      }
      if (this.jugadores.size + 1 >= (this.op.maxJugadores ?? 3)) {
        enlace.mandarFirme(escribirRechazo(RECHAZO.LLENO));
        return null;
      }
      return this.admitir(enlace, m.nombre);
    }

    if (quien === null) return null;
    const j = this.jugadores.get(quien);
    if (!j) return null;

    switch (m.tipo) {
      case MSG.ENTRADA:
        // Solo se hace caso hacia delante: un tick repetido o viejo llegó tarde
        // y hacerle caso sería retroceder.
        if (m.entrada.tick > j.ultimoTick) {
          j.entrada = entradaDeBotones(m.entrada.botones, j.entrada);
          j.ultimoTick = m.entrada.tick;
        }
        break;
      case MSG.PIDO_TILE:
        this.atenderPeticionDeTile(j, m.cambio);
        break;
      case MSG.ADIOS:
        this.quitar(quien);
        return null;
    }
    return quien;
  }

  private admitir(enlace: Enlace, nombre: string): number {
    const id = this.siguienteId++;
    const j: JugadorConectado = {
      id,
      nombre: nombre.slice(0, 24) || `Jugador ${id}`,
      enlace,
      caja: crearCaja(
        this.op.spawnTx * TILE,
        this.op.spawnTy * TILE,
        JUGADOR_ANCHO,
        JUGADOR_ALTO,
      ),
      entrada: { ...ENTRADA_QUIETA },
      ultimoTick: -1,
      listo: false,
      invulnerable: 0,
    };
    this.jugadores.set(id, j);
    enlace.mandarFirme(escribirBienvenido(id, this.tickActual));
    this.op.alEntrar?.(j);
    return id;
  }

  /**
   * Los invitados, como los ven los bichos.
   *
   * Se da tal cual a `actualizarEnemigos` para que persigan a todo el mundo y
   * no solo a quien hospeda.
   */
  get acompanantes(): Acompanante[] {
    return [...this.jugadores.values()]
      .filter((j) => j.listo)
      .map((j) => ({ id: j.id, caja: j.caja, invulnerable: j.invulnerable }));
  }

  /**
   * Cobrarle a un invitado un golpe que ha decidido el anfitrión.
   *
   * Se le manda por el canal fiable: un «te han dado» perdido es vida que nadie
   * pierde, y eso se nota mucho más que un tirón.
   */
  cobrar(id: number, dano: number, desdeX: number): void {
    const j = this.jugadores.get(id);
    if (!j || !j.listo || j.invulnerable > 0) return;
    j.invulnerable = TICKS_INVULNERABLE;
    j.enlace.mandarFirme(escribirDano(dano, desdeX));
  }

  /** Manda el mundo al que acaba de entrar. Va por el canal fiable y troceado. */
  async mandarMundo(id: number): Promise<void> {
    const j = this.jugadores.get(id);
    if (!j) return;
    const bytes = await this.op.bytesDelMundo();
    for (const trozo of trocearMundo(bytes)) j.enlace.mandarFirme(trozo);
    j.listo = true;
  }

  quitar(id: number): void {
    if (this.jugadores.delete(id)) this.op.alSalir?.(id);
  }

  /**
   * Un tile que ha cambiado por decisión del anfitrión (ha picado él, o se ha
   * caído la arena). Se difunde igual que los pedidos.
   */
  anunciarTile(c: CambioTile): void {
    this.pendientes.push(c);
  }

  /**
   * Alguien pide picar o poner.
   *
   * Se comprueban dos cosas: que el sitio exista y que lo tenga a mano. Lo
   * segundo es lo que impide que un cliente modificado desmonte el mundo entero
   * sin moverse del sitio.
   */
  private atenderPeticionDeTile(j: JugadorConectado, c: CambioTile): void {
    const mundo = this.op.mundo;
    if (!mundo.dentro(c.tx, c.ty)) return;

    const cx = (j.caja.x + j.caja.ancho / 2) / TILE;
    const cy = (j.caja.y + j.caja.alto / 2) / TILE;
    if (Math.hypot(c.tx + 0.5 - cx, c.ty + 0.5 - cy) > ALCANCE_TILES) return;

    if (c.pared) mundo.setPared(c.tx, c.ty, c.id);
    else mundo.setTile(c.tx, c.ty, c.id);

    this.pendientes.push(c);
    this.op.alCambiarTile?.(c);
  }

  /**
   * Los bichos vivos, listos para el cable.
   *
   * Los muertos no se mandan: dejar de aparecer en la instantánea es
   * exactamente lo que el otro lado entiende como «ya no está», y así no hace
   * falta un mensaje aparte para decirlo.
   *
   * El identificador sale de la posición en la lista, sumándole un número alto
   * para no chocar con los de los jugadores. Es estable mientras el bicho siga
   * en la lista, que es lo único que necesita la interpolación.
   */
  private bichosDeLaInstantanea(): EntidadRed[] {
    const lista = this.op.bichos?.() ?? [];
    const salida: EntidadRed[] = [];
    for (let i = 0; i < lista.length && salida.length < TOPE_BICHOS; i++) {
      const b = lista[i]!;
      if (!b.vivo) continue;
      salida.push({
        clase: ENT.BICHO,
        id: BASE_ID_BICHO + i,
        sub: indiceDeEspecie(b.especie),
        vida: b.salud.vida,
        vidaMax: b.salud.vidaMax,
        ...autoridadDeCaja(b.caja),
      });
    }
    return salida;
  }

  /**
   * Un tick de mundo. Lo llama el juego, después de mover a su propio jugador.
   *
   * `miCaja` es la del anfitrión, que entra en las instantáneas como uno más:
   * los invitados tienen que verlo moverse igual que él los ve a ellos.
   */
  avanzar(miCaja: Caja, miVida = 0): void {
    this.tickActual++;

    for (const j of this.jugadores.values()) {
      actualizarFisica(this.op.mundo, j.caja, j.entrada, this.op.ajustes);
      // El flanco de salto dura un tick: si no se apaga, se salta sin parar
      // mientras no llegue una entrada nueva.
      j.entrada = { ...j.entrada, saltoPulsado: false };
      if (j.invulnerable > 0) j.invulnerable--;
    }

    if (this.pendientes.length > 0) {
      const bytes = escribirTiles(this.pendientes);
      this.pendientes = [];
      for (const j of this.jugadores.values()) {
        if (j.listo) j.enlace.mandarFirme(bytes);
      }
    }

    if (this.tickActual % TICKS_POR_INSTANTANEA !== 0) return;

    const todos: EntidadRed[] = [
      { clase: ENT.JUGADOR, id: 1, sub: 0, vida: miVida, vidaMax: 0, ...autoridadDeCaja(miCaja) },
      ...[...this.jugadores.values()].map((j) => ({
        clase: ENT.JUGADOR,
        id: j.id,
        sub: 0,
        vida: 0,
        vidaMax: 0,
        ...autoridadDeCaja(j.caja),
      })),
      ...this.bichosDeLaInstantanea(),
    ];

    // Una instantánea por jugador y no una para todos: `tickConfirmado` es
    // distinto para cada uno, y es justo el dato que le deja reconciliar.
    for (const j of this.jugadores.values()) {
      if (!j.listo) continue;
      j.enlace.mandarVivo(
        escribirInstantanea({
          tick: this.tickActual,
          tickConfirmado: j.ultimoTick,
          minutos: this.op.minutos?.() ?? 0,
          entidades: todos,
        }),
      );
    }
  }
}

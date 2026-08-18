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
import { autoridadDeCaja } from './prediccion';
import {
  BOTON,
  ENT,
  MSG,
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
    };
    this.jugadores.set(id, j);
    enlace.mandarFirme(escribirBienvenido(id, this.tickActual));
    this.op.alEntrar?.(j);
    return id;
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
      { clase: ENT.JUGADOR, id: 1, vida: miVida, ...autoridadDeCaja(miCaja) },
      ...[...this.jugadores.values()].map((j) => ({
        clase: ENT.JUGADOR,
        id: j.id,
        vida: 0,
        ...autoridadDeCaja(j.caja),
      })),
    ];

    // Una instantánea por jugador y no una para todos: `tickConfirmado` es
    // distinto para cada uno, y es justo el dato que le deja reconciliar.
    for (const j of this.jugadores.values()) {
      if (!j.listo) continue;
      j.enlace.mandarVivo(
        escribirInstantanea({
          tick: this.tickActual,
          tickConfirmado: j.ultimoTick,
          entidades: todos,
        }),
      );
    }
  }
}

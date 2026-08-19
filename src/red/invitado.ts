/**
 * El lado que obedece.
 *
 * El invitado no simula el mundo: manda lo que pulsa, recibe instantáneas y se
 * cree lo que le digan. Con dos excepciones, que son las que hacen que se pueda
 * jugar:
 *
 * - **Su propio personaje sí lo mueve él**, al instante, y luego lo cuadra con
 *   lo que diga el anfitrión (`prediccion.ts`). Esperar respuesta para andar es
 *   injugable.
 * - **Los tiles los pinta al pedirlos**, sin esperar. Si el anfitrión dice que
 *   no, la siguiente instantánea de tiles lo devuelve a su sitio. Picar con
 *   retraso se siente fatal, y equivocarse de vez en cuando se nota mucho menos.
 *
 * Igual que el anfitrión, habla contra un `Enlace` y no contra WebRTC, para
 * poder probarlo entero sin navegador.
 */

import { crearEnemigo, especieDeIndice, type Enemigo } from '../entities/enemies';
import { BANDERA } from './protocolo';
import type { Ajustes, Caja, Entrada } from '../entities/physics';
import type { Mundo } from '../world/world';
import { Interpolador, Prediccion, autoridadDeEntidad } from './prediccion';
import type { Enlace } from './anfitrion';
import { crearDrop, type Drop } from '../entities/drop';
import {
  BOTON,
  ENT,
  JuntaMundo,
  MSG,
  escribirCojo,
  escribirCubo,
  escribirEntrada,
  escribirGolpe,
  escribirHola,
  escribirPidoTile,
  leerMensaje,
  textoRechazo,
  type CambioLiquido,
  type CambioTile,
  type EntidadRed,
} from './protocolo';

export interface OtroJugador {
  id: number;
  interpolador: Interpolador;
  /** Lo último que se supo de él, para pintarlo mirando bien. */
  ultima: EntidadRed;
}

export interface OpcionesInvitado {
  enlace: Enlace;
  nombre: string;
  idPartida: string;
  ajustes: Ajustes;
  /** Ha llegado el mundo entero: el juego tiene que abrirlo. */
  alLlegarMundo: (bytes: Uint8Array) => void;
  /** Va llegando: de 0 a 1. */
  alAvanzarMundo?: (progreso: number) => void;
  /** El anfitrión confirma cambios de tiles. */
  alCambiarTiles: (cambios: readonly CambioTile[]) => void;
  /** Con qué versión se creó el mundo, para que los bichos salgan como toca. */
  versionMundo?: string;
  /** No se ha podido entrar, y este es el motivo ya legible. */
  alRechazar?: (motivo: string) => void;
  /** La hora del anfitrión, en minutos del día. Llega con cada instantánea. */
  alDarLaHora?: (minutos: number) => void;
  /** Un bicho del anfitrión te ha tocado: aplícatelo con tu armadura. */
  alRecibirGolpe?: (dano: number, desdeX: number) => void;
  /** El anfitrión te da lo que habías pedido del suelo. */
  alRecogerObjeto?: (objeto: number, cantidad: number) => void;
  /** Cómo ha quedado el agua. La simula el anfitrión y aquí solo se aplica. */
  alCambiarLiquidos?: (cambios: readonly CambioLiquido[]) => void;
}

export function botonesDeEntrada(e: Entrada): number {
  return (
    (e.izq ? BOTON.IZQUIERDA : 0) |
    (e.der ? BOTON.DERECHA : 0) |
    (e.abajo ? BOTON.ABAJO : 0) |
    (e.salto ? BOTON.SALTO : 0)
  );
}

export class Invitado {
  readonly prediccion = new Prediccion();
  private otros = new Map<number, OtroJugador>();
  /**
   * Los bichos que dice el anfitrión.
   *
   * Se guardan como `Enemigo` de verdad, no como una estructura aparte, y no es
   * por comodidad: así el renderer los dibuja **con el mismo código** que los
   * del anfitrión, sin una segunda ruta que se quedaría atrás en cuanto alguien
   * tocara los sprites.
   */
  private bichosRemotos = new Map<number, Enemigo>();
  /**
   * Los objetos del suelo, como los manda el anfitrión.
   *
   * Igual que con los bichos, se guardan como `Drop` de verdad para que el
   * renderer los dibuje con el mismo código y no haya una segunda ruta que se
   * quede atrás.
   */
  private objetosRemotos = new Map<number, Drop>();
  private junta = new JuntaMundo();
  private tickPropio = 0;
  private _miId = 0;
  private _dentro = false;

  constructor(private readonly op: OpcionesInvitado) {}

  get miId(): number {
    return this._miId;
  }
  get dentro(): boolean {
    return this._dentro;
  }
  /** Los demás, para pintarlos. El anfitrión es el id 1. */
  get demas(): readonly OtroJugador[] {
    return [...this.otros.values()];
  }

  /** Los bichos, tal cual los espera el renderer. */
  get bichos(): readonly Enemigo[] {
    return [...this.bichosRemotos.values()];
  }

  /** Se saluda al conectar. Hasta que no conteste, no hay partida. */
  saludar(): void {
    this.op.enlace.mandarFirme(escribirHola(this.op.nombre, this.op.idPartida));
  }

  recibir(datos: Uint8Array): void {
    const m = leerMensaje(datos);
    if (!m) return;

    switch (m.tipo) {
      case MSG.BIENVENIDO:
        this._miId = m.numeroJugador;
        break;

      case MSG.RECHAZO:
        this.op.alRechazar?.(textoRechazo(m.motivo));
        break;

      case MSG.MUNDO: {
        const entero = this.junta.añadir(m.trozo, m.total, m.datos);
        this.op.alAvanzarMundo?.(this.junta.progreso);
        if (entero) {
          this._dentro = true;
          this.op.alLlegarMundo(entero);
        }
        break;
      }

      case MSG.TILES:
        this.op.alCambiarTiles(m.cambios);
        break;

      case MSG.DANO:
        this.op.alRecibirGolpe?.(m.dano, m.desdeX);
        break;

      case MSG.RECOGIDO:
        this.op.alRecogerObjeto?.(m.objeto, m.cantidad);
        break;

      case MSG.LIQUIDOS:
        this.op.alCambiarLiquidos?.(m.cambios);
        break;

      case MSG.INSTANTANEA:
        this.guardarInstantanea(m.instantanea.entidades);
        this.ultimaInstantanea = m.instantanea;
        // La hora es del mundo, y del mundo manda el anfitrión.
        this.op.alDarLaHora?.(m.instantanea.minutos);
        break;
    }
  }

  /** La última que llegó, sin aplicar. Se aplica en el tick, no al recibirla. */
  private ultimaInstantanea: { tickConfirmado: number; entidades: EntidadRed[] } | null = null;

  private guardarInstantanea(entidades: readonly EntidadRed[]): void {
    this.guardarBichos(entidades);
    this.guardarObjetos(entidades);
    const vistos = new Set<number>();
    for (const e of entidades) {
      if (e.clase !== ENT.JUGADOR || e.id === this._miId) continue;
      vistos.add(e.id);
      let otro = this.otros.get(e.id);
      if (!otro) {
        otro = { id: e.id, interpolador: new Interpolador(), ultima: e };
        this.otros.set(e.id, otro);
      }
      otro.ultima = e;
      otro.interpolador.meter(e.x, e.y);
    }
    // Quien deja de aparecer se ha ido.
    for (const id of [...this.otros.keys()]) {
      if (!vistos.has(id)) this.otros.delete(id);
    }
  }

  /**
   * Un tick. Se llama después de mover al propio jugador en local.
   *
   * El orden importa: primero se manda lo que se ha pulsado, luego se cuadra
   * con lo último que dijo el anfitrión. Al revés, se reconciliaría contra una
   * instantánea que aún no ha visto el tick que se acaba de jugar.
   */
  avanzar(mundo: Mundo, miCaja: Caja, entrada: Entrada, sumergido = 0): void {
    const tick = this.tickPropio++;
    this.prediccion.registrar(tick, entrada, sumergido);
    this.op.enlace.mandarVivo(
      escribirEntrada({
        tick,
        botones: botonesDeEntrada(entrada),
        ratonTx: 0,
        ratonTy: 0,
      }),
    );

    const inst = this.ultimaInstantanea;
    if (inst) {
      this.ultimaInstantanea = null;
      const mia = inst.entidades.find((e) => e.clase === ENT.JUGADOR && e.id === this._miId);
      if (mia) {
        this.prediccion.reconciliar(
          mundo,
          miCaja,
          this.op.ajustes,
          autoridadDeEntidad(mia),
          inst.tickConfirmado,
        );
      }
    }

    this.prediccion.avanzarSuavizado();
    for (const o of this.otros.values()) o.interpolador.avanzar();
  }

  /**
   * Coloca los bichos que dice el anfitrión.
   *
   * Los que dejan de aparecer se quitan: no hace falta un mensaje de «este ha
   * muerto» porque ausentarse ya lo dice, y así una instantánea perdida no deja
   * un cadáver de pie para siempre.
   */
  private guardarBichos(entidades: readonly EntidadRed[]): void {
    const vistos = new Set<number>();
    for (const e of entidades) {
      if (e.clase !== ENT.BICHO) continue;
      const especie = especieDeIndice(e.sub);
      // Una especie que aquí no existe: el otro tiene otra versión del juego.
      // Se ignora ese bicho en vez de inventarse uno.
      if (!especie) continue;
      vistos.add(e.id);

      let b = this.bichosRemotos.get(e.id);
      if (!b || b.especie !== especie) {
        b = crearEnemigo(especie, e.x, e.y, 1, false, this.op.versionMundo);
        this.bichosRemotos.set(e.id, b);
      }
      b.caja.x = e.x;
      b.caja.y = e.y;
      b.caja.vx = e.vx;
      b.caja.vy = e.vy;
      b.caja.enSuelo = (e.banderas & BANDERA.EN_SUELO) !== 0;
      b.caja.mirando = (e.banderas & BANDERA.MIRA_DERECHA) !== 0 ? 1 : -1;
      // Si ha perdido vida desde la última instantánea es que le han dado, y
      // eso es lo único que hace falta para que parpadee: el destello sale del
      // mismo contador que en local, así que el invitado ve entrar sus golpes
      // sin necesidad de que el anfitrión se lo cuente aparte.
      if (e.vida < b.salud.vida) b.salud.desdeGolpe = 0;
      b.salud.vida = e.vida;
      if (e.vidaMax > 0) b.salud.vidaMax = e.vidaMax;
      // El reloj de animación corre aquí: si viniera del anfitrión, entre
      // instantánea e instantánea el bicho se quedaría congelado.
      b.animReloj++;
      if (b.salud.desdeGolpe < 60) b.salud.desdeGolpe++;
      b.vivo = true;
    }
    for (const id of [...this.bichosRemotos.keys()]) {
      if (!vistos.has(id)) this.bichosRemotos.delete(id);
    }
  }

  /** Los objetos del suelo, con los que llegan y sin los que ya no están. */
  private guardarObjetos(entidades: readonly EntidadRed[]): void {
    const vistos = new Set<number>();
    for (const e of entidades) {
      if (e.clase !== ENT.OBJETO) continue;
      vistos.add(e.id);
      const existente = this.objetosRemotos.get(e.id);
      if (existente) {
        existente.x = e.x;
        existente.y = e.y;
        existente.vx = e.vx;
        existente.vy = e.vy;
        existente.cantidad = e.vida;
        existente.edad++;
        continue;
      }
      const nuevo = crearDrop(e.sub, e.vida, 0, 0);
      nuevo.id = e.id;
      nuevo.x = e.x;
      nuevo.y = e.y;
      this.objetosRemotos.set(e.id, nuevo);
    }
    // Lo que deja de aparecer es que alguien lo ha cogido o ha caducado.
    for (const id of [...this.objetosRemotos.keys()]) {
      if (!vistos.has(id)) this.objetosRemotos.delete(id);
    }
  }

  /** Pide picar o poner. Se pinta ya; si el anfitrión dice que no, se deshace. */
  pedirTile(c: CambioTile): void {
    this.op.enlace.mandarFirme(escribirPidoTile(c));
  }

  /**
   * Avisa de un mandoble. Quién lo cobra lo decide el anfitrión.
   *
   * No se predice nada: la animación del arma ya la pinta el juego de aquí, y
   * adivinar que un bicho ha muerto para desdecirse medio segundo después se ve
   * mucho peor que esperar a la siguiente instantánea.
   */
  golpear(arma: number, direccion: 1 | -1, sentido: number): void {
    this.op.enlace.mandarFirme(escribirGolpe(arma, direccion, sentido));
  }

  /** Pide un objeto del suelo. El anfitrión mira si lo tiene a mano. */
  pedirObjeto(idDrop: number): void {
    this.op.enlace.mandarFirme(escribirCojo(idDrop));
  }

  /** Avisa de un cubo usado. El agua que salga de ahí la reparte el anfitrión. */
  avisarCubo(objeto: number, tx: number, ty: number): void {
    this.op.enlace.mandarFirme(escribirCubo(objeto, tx, ty));
  }

  /** Los objetos del suelo que dice el anfitrión, tal cual los espera el juego. */
  get objetos(): readonly Drop[] {
    return [...this.objetosRemotos.values()];
  }

  /** Al salir del mundo o al desconectar. */
  olvidar(): void {
    this.prediccion.olvidar();
    this.otros.clear();
    this.bichosRemotos.clear();
    this.objetosRemotos.clear();
    this.ultimaInstantanea = null;
    this._dentro = false;
  }
}

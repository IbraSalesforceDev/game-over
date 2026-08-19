/**
 * Una partida acompañada, de principio a fin.
 *
 * Junta las tres piezas anteriores —la sala donde se presentan, la conexión
 * entre navegadores y la lógica de anfitrión o invitado— y le da al juego una
 * sola cosa con la que hablar.
 *
 * ## Quién ofrece y quién contesta
 *
 * El invitado entra en la sala y grita «aquí estoy». El anfitrión le contesta
 * con una oferta. Va en ese orden y no al revés porque **los canales de datos
 * los crea quien ofrece**, y quien tiene que decidir cómo son —uno no fiable
 * para las instantáneas y otro fiable para los tiles— es el anfitrión.
 *
 * ## Lo que no hace
 *
 * No dibuja, no toca el mundo y no sabe qué es un bloque. Todo eso se lo pide
 * al juego por los avisos de las opciones, para que esta capa se pueda seguir
 * probando sin navegador.
 */

import type { Ajustes, Caja, Entrada } from '../entities/physics';
import type { Mundo } from '../world/world';
import type { Acompanante, Enemigo } from '../entities/enemies';
import type { Drop } from '../entities/drop';
import type { Golpe } from '../entities/combat';
import { Anfitrion, type Enlace, type JugadorConectado } from './anfitrion';
import { ConexionAnfitrion, ConexionInvitado, type EstadoConexion } from './conexion';
import { Invitado, type OtroJugador } from './invitado';
import {
  escribirAdios,
  type CambioLiquido,
  type CambioTile,
  type EstadoCofre,
} from './protocolo';
import { entrarEnSala, type Recado, type Sala } from './senal';

export type Papel = 'anfitrion' | 'invitado';

export interface AvisosSesion {
  /** Para la interfaz: «Fulano ha entrado», «se ha ido», «no hay conexión». */
  alContar?: (texto: string) => void;
  alCambiarEstado?: (estado: EstadoConexion, motivo?: string) => void;
  /** Solo en el invitado: ha llegado el mundo del anfitrión. */
  alLlegarMundo?: (bytes: Uint8Array) => void;
  alAvanzarMundo?: (progreso: number) => void;
  /** Tiles que hay que aplicar al mundo de aquí. */
  alCambiarTiles?: (cambios: readonly CambioTile[]) => void;
  /** Solo en el invitado: cómo ha quedado el agua según el anfitrión. */
  alCambiarLiquidos?: (cambios: readonly CambioLiquido[]) => void;
  /** Solo en el invitado: lo que hay de verdad en un cofre. */
  alSaberDelCofre?: (cofre: EstadoCofre) => void;
  /**
   * Solo en el invitado: te han dado, y esto es lo que pega.
   *
   * La armadura y la muerte las aplica el juego de aquí: el anfitrión decide
   * que te han tocado, no cuánta vida te queda.
   */
  alRecibirGolpe?: (dano: number, desdeX: number) => void;
  /**
   * Solo en el invitado: la hora que dice el anfitrión.
   *
   * El reloj del mundo lo lleva quien lo hospeda. Con cada uno corriendo el
   * suyo, dos jugadores en el mismo sitio veían uno el mediodía y el otro la
   * noche.
   */
  alDarLaHora?: (minutos: number) => void;
}

export interface OpcionesSesion extends AvisosSesion {
  idPartida: string;
  nombre: string;
  ajustes: Ajustes;
  mundo: Mundo;
  /** Solo el anfitrión: dónde aparecen los que entran y cómo se empaqueta. */
  spawnTx?: number;
  spawnTy?: number;
  bytesDelMundo?: () => Promise<Uint8Array>;
  /** Solo el anfitrión: los bichos que simula, para mandarlos. */
  bichos?: () => readonly Enemigo[];
  /** Solo el anfitrión: la hora del mundo, que es suya. */
  minutos?: () => number;
  /** Solo el anfitrión: los objetos del suelo, para mandarlos. */
  objetos?: () => readonly Drop[];
  /** Solo el anfitrión: las celdas de agua que han cambiado. */
  liquidosCambiados?: (tope: number) => readonly CambioLiquido[];
  /** Solo el anfitrión: un invitado ha dado un mandoble ya comprobado. */
  alGolpear?: (quien: number, golpe: Golpe, caja: Caja) => void;
  /** Solo el anfitrión: un invitado quiere coger algo del suelo. */
  alPedirObjeto?: (quien: number, idDrop: number, caja: Caja) => void;
  /** Solo el anfitrión: un invitado ha usado un cubo dentro de su alcance. */
  alUsarCubo?: (objeto: number, tx: number, ty: number) => void;
  /** Solo el anfitrión: un invitado quiere abrir un cofre. */
  alAbrirCofre?: (quien: number, tx: number, ty: number) => void;
  /** Solo el anfitrión: un invitado ha tocado una ranura de un cofre. */
  alTocarCofre?: (
    quien: number,
    tx: number,
    ty: number,
    ranura: number,
    objeto: number,
    cantidad: number,
  ) => void;
  /** Solo el invitado: el anfitrión te da lo que habías pedido. */
  alRecogerObjeto?: (objeto: number, cantidad: number) => void;
  /** Con qué versión nació el mundo, para recrear bien los bichos que llegan. */
  versionMundo?: string;
  /**
   * Cómo se entra en la sala. Por defecto, la de Supabase.
   *
   * Se puede sustituir, y no es un adorno: con la de verdad esto solo se puede
   * probar con dos cuentas, dos navegadores y conexión a la nube, que es justo
   * el tipo de prueba que no se hace nunca. Con una sala de mentira, el apretón
   * de manos entero —oferta, respuesta, candidatas, saludo y mundo— se ejecuta
   * de verdad, con WebRTC de verdad, en `pruebas/red.html`.
   *
   * Es una función y no una sala ya hecha porque la sala necesita saber a quién
   * avisar: quien entra le entrega su oyente al hacerlo.
   */
  entrarEnSala?: (idPartida: string, alRecado: (r: Recado) => void) => Promise<Sala>;
}

/**
 * Cada cuánto se repite lo que aún no ha tenido respuesta, y cuántas veces.
 *
 * Las dos cosas que se repiten se perdían por lo mismo: se mandaban una sola vez
 * y en un momento en el que el otro lado podía no estar escuchando todavía.
 */
export const REINTENTO_MS = 1000;
export const REINTENTOS_MAXIMOS = 30;

export interface SesionRed {
  readonly papel: Papel;
  /** Un tick. Lo llama el juego después de mover a su propio jugador. */
  avanzar(miCaja: Caja, entrada: Entrada, sumergido?: number): void;
  /** Los demás, ya colocados donde toca pintarlos. */
  otros(): { id: number; nombre: string; x: number; y: number; mirando: 1 | -1 }[];
  /** Picar o poner. El anfitrión lo hace y lo difunde; el invitado lo pide. */
  tile(c: CambioTile): void;
  /** Cuánto hay que desplazar el dibujo del propio jugador, para no dar tirones. */
  desvio(): { x: number; y: number };
  /**
   * Los demás jugadores, como los tienen que ver los bichos.
   *
   * Solo el anfitrión devuelve algo: es el único que simula bichos.
   */
  acompanantes(): readonly Acompanante[];
  /** Cobrarle un golpe a un invitado. En el invitado no hace nada. */
  cobrar(id: number, dano: number, desdeX: number): void;
  /**
   * Un mandoble. En el invitado se manda al anfitrión, que es quien lo resuelve;
   * en el anfitrión no hace nada, porque el suyo lo resuelve el juego.
   */
  golpear(arma: number, direccion: 1 | -1, sentido: number): void;
  /** Pedir un objeto del suelo. Solo el invitado tiene que pedir permiso. */
  pedirObjeto(idDrop: number): void;
  /** Avisar de un cubo usado. En el anfitrión no hace nada: ya lo ha hecho. */
  avisarCubo(objeto: number, tx: number, ty: number): void;
  /** Pedir abrir un cofre. En el anfitrión no hace nada: ya lo tiene. */
  abrirCofre(tx: number, ty: number): void;
  /** Contar que se ha tocado una ranura de un cofre. */
  tocarCofre(tx: number, ty: number, ranura: number, objeto: number, cantidad: number): void;
  /** Contar cómo ha quedado un cofre. Solo el anfitrión reparte. */
  contarCofre(cofre: EstadoCofre, quien?: number): void;
  /** Darle a un invitado lo que ha pedido. Solo el anfitrión reparte. */
  entregar(id: number, objeto: number, cantidad: number): void;
  /**
   * Los objetos del suelo que hay que dibujar.
   *
   * En el anfitrión, null: los suyos ya los tiene el juego. En el invitado, los
   * que manda el anfitrión.
   */
  objetos(): readonly Drop[] | null;
  /**
   * Los bichos que hay que dibujar.
   *
   * En el anfitrión, null: los suyos ya los tiene el juego y no hace falta
   * copiarlos. En el invitado, los que manda el anfitrión.
   */
  bichos(): readonly Enemigo[] | null;
  cerrar(): Promise<void>;
}

/** Monta la partida como anfitrión y espera a que entre alguien. */
export async function hospedar(op: OpcionesSesion): Promise<SesionRed> {
  const nombres = new Map<number, string>();
  const anfitrion = new Anfitrion({
    mundo: op.mundo,
    ajustes: op.ajustes,
    idPartida: op.idPartida,
    spawnTx: op.spawnTx ?? 0,
    spawnTy: op.spawnTy ?? 0,
    bytesDelMundo: op.bytesDelMundo ?? (async () => new Uint8Array(0)),
    bichos: op.bichos,
    minutos: op.minutos,
    objetos: op.objetos,
    liquidosCambiados: op.liquidosCambiados,
    alGolpear: op.alGolpear,
    alPedirObjeto: op.alPedirObjeto,
    alUsarCubo: op.alUsarCubo,
    alAbrirCofre: op.alAbrirCofre,
    alTocarCofre: op.alTocarCofre,
    alEntrar: (j) => {
      nombres.set(j.id, j.nombre);
      op.alContar?.(`${j.nombre} ha entrado`);
      void anfitrion.mandarMundo(j.id);
    },
    alSalir: (id) => {
      op.alContar?.(`${nombres.get(id) ?? 'Alguien'} se ha ido`);
      nombres.delete(id);
    },
    alCambiarTile: (c) => op.alCambiarTiles?.([c]),
  });

  /** Una conexión por invitado, con su identificador de sala. */
  const conexiones = new Map<string, { con: ConexionAnfitrion; quien: number | null }>();
  let sala: Sala;

  const alRecado = (r: Recado): void => {
    void (async () => {
      if (r.que === 'aqui-estoy') {
        const previa = conexiones.get(r.de);
        if (previa) {
          // El invitado repite el «aquí estoy» hasta que le contestan. Si ya le
          // estamos atendiendo no se hace nada; pero si aquella conexión murió
          // —se cayó la red, la pestaña estuvo dormida— hay que rehacerla, que
          // si no queda apuntado para siempre y no vuelve a entrar nunca.
          if (previa.con.estado !== 'fallo' && previa.con.estado !== 'cerrado') return;
          if (previa.quien !== null) anfitrion.quitar(previa.quien);
          previa.con.cerrar();
          conexiones.delete(r.de);
        }
        const entrada: { con: ConexionAnfitrion; quien: number | null } = {
          con: null as unknown as ConexionAnfitrion,
          quien: null,
        };
        const con = new ConexionAnfitrion({
          alLlegar: (datos) => {
            const enlace: Enlace = {
              mandarVivo: (d) => con.mandarVivo(d),
              mandarFirme: (d) => con.mandarFirme(d),
            };
            entrada.quien = anfitrion.recibir(enlace, datos, entrada.quien);
          },
          alCambiarEstado: (estado, motivo) => {
            op.alCambiarEstado?.(estado, motivo);
            if (estado === 'cerrado' || estado === 'fallo') {
              if (entrada.quien !== null) anfitrion.quitar(entrada.quien);
              conexiones.delete(r.de);
            }
          },
          alTenerCandidata: (candidata) => {
            void sala.mandar({ que: 'ice', de: sala.yo, para: r.de, candidata });
          },
        });
        entrada.con = con;
        conexiones.set(r.de, entrada);
        await sala.mandar({
          que: 'oferta',
          de: sala.yo,
          para: r.de,
          sdp: await con.oferta(),
        });
        return;
      }

      const c = conexiones.get(r.de);
      if (!c) return;
      if (r.que === 'respuesta' && r.para === sala.yo) await c.con.recibirRespuesta(r.sdp);
      else if (r.que === 'ice' && r.para === sala.yo) await c.con.añadirCandidata(r.candidata);
      else if (r.que === 'adios') {
        c.con.cerrar();
        conexiones.delete(r.de);
      }
    })();
  };

  sala = await (op.entrarEnSala ?? entrarEnSala)(op.idPartida, alRecado);

  return {
    papel: 'anfitrion',
    avanzar(miCaja) {
      anfitrion.avanzar(miCaja);
    },
    otros() {
      return anfitrion.conectados.map((j: JugadorConectado) => ({
        id: j.id,
        nombre: j.nombre,
        x: j.caja.x,
        y: j.caja.y,
        mirando: j.caja.mirando,
      }));
    },
    tile(c) {
      // El anfitrión ya ha tocado su mundo: aquí solo se difunde.
      anfitrion.anunciarTile(c);
    },
    desvio() {
      // El anfitrión es la verdad: nunca se corrige a sí mismo.
      return { x: 0, y: 0 };
    },
    acompanantes() {
      return anfitrion.acompanantes;
    },
    cobrar(id, dano, desdeX) {
      anfitrion.cobrar(id, dano, desdeX);
    },
    golpear() {
      /* el mandoble del anfitrión lo resuelve el juego, aquí y ahora */
    },
    pedirObjeto() {
      /* el anfitrión coge del suelo sin pedirle permiso a nadie */
    },
    avisarCubo() {
      /* el cubo del anfitrión ya ha mojado su mundo, que es el que manda */
    },
    abrirCofre() {
      /* el anfitrión abre el suyo directamente */
    },
    tocarCofre() {
      /* el anfitrión toca el suyo directamente; lo que hace es contarlo */
    },
    contarCofre(cofre, quien) {
      anfitrion.contarCofre(cofre, quien);
    },
    entregar(id, objeto, cantidad) {
      anfitrion.entregar(id, objeto, cantidad);
    },
    objetos() {
      return null; // los suyos ya los tiene el juego
    },
    bichos() {
      return null; // los suyos ya los tiene el juego
    },
    async cerrar() {
      for (const { con } of conexiones.values()) {
        con.mandarFirme(escribirAdios());
        con.cerrar();
      }
      conexiones.clear();
      await sala.cerrar();
    },
  };
}

/** Se une a la partida de otro. */
export async function unirse(op: OpcionesSesion): Promise<SesionRed> {
  let sala: Sala;
  let anfitrionEnSala: string | null = null;
  /** Los relojes de los reintentos, para poder pararlos al cerrar. */
  const relojes: ReturnType<typeof setInterval>[] = [];

  const parar = (): void => {
    for (const r of relojes) clearInterval(r);
    relojes.length = 0;
  };

  /**
   * Repite algo hasta que deje de hacer falta, o hasta cansarse.
   *
   * Se llama una vez enseguida y luego cada segundo. Lo de «una vez enseguida»
   * importa: el caso normal es que funcione a la primera y no llegue a haber
   * ningún reintento.
   */
  const insistir = (yaEsta: () => boolean, hacer: () => void): void => {
    if (yaEsta()) return;
    hacer();
    let veces = 0;
    const reloj = setInterval(() => {
      if (yaEsta() || ++veces >= REINTENTOS_MAXIMOS) {
        clearInterval(reloj);
        return;
      }
      hacer();
    }, REINTENTO_MS);
    relojes.push(reloj);
  };

  const con = new ConexionInvitado({
    alLlegar: (datos) => invitado.recibir(datos),
    alCambiarEstado: (estado, motivo) => op.alCambiarEstado?.(estado, motivo),
    alTenerCandidata: (candidata) => {
      if (anfitrionEnSala) {
        void sala.mandar({ que: 'ice', de: sala.yo, para: anfitrionEnSala, candidata });
      }
    },
    /**
     * El saludo va aquí, y solo aquí.
     *
     * Antes salía al recibir la oferta y otra vez al ponerse la conexión en
     * «conectado», y las dos veces podía caer en saco roto: en la primera el
     * canal ni existía —lo crea el anfitrión y llega por `ondatachannel`— y en
     * la segunda podía estar todavía abriéndose. `mandar` no avisa cuando no
     * puede mandar: se calla. El resultado era un invitado dentro del mundo,
     * con su copia bajada de la nube, al que el anfitrión no había visto nunca:
     * ni jugadores, ni bloques, ni bichos.
     *
     * Y se repite hasta que conteste. Un HOLA es un byte; perderlo cuesta la
     * partida entera.
     */
    alAbrirseFirme: () => {
      insistir(() => invitado.miId !== 0, () => invitado.saludar());
    },
  });

  const invitado = new Invitado({
    enlace: {
      mandarVivo: (d) => con.mandarVivo(d),
      mandarFirme: (d) => con.mandarFirme(d),
    },
    nombre: op.nombre,
    idPartida: op.idPartida,
    ajustes: op.ajustes,
    alLlegarMundo: (bytes) => op.alLlegarMundo?.(bytes),
    alAvanzarMundo: (p) => op.alAvanzarMundo?.(p),
    alCambiarTiles: (cs) => op.alCambiarTiles?.(cs),
    versionMundo: op.versionMundo,
    alDarLaHora: (minutos) => op.alDarLaHora?.(minutos),
    alRecibirGolpe: (dano, desdeX) => op.alRecibirGolpe?.(dano, desdeX),
    alRecogerObjeto: (objeto, cantidad) => op.alRecogerObjeto?.(objeto, cantidad),
    alCambiarLiquidos: (cs) => op.alCambiarLiquidos?.(cs),
    alSaberDelCofre: (c) => op.alSaberDelCofre?.(c),
    alRechazar: (motivo) => {
      parar();
      op.alCambiarEstado?.('fallo', motivo);
    },
  });

  const alRecado = (r: Recado): void => {
    void (async () => {
      if (r.que === 'oferta' && r.para === sala.yo) {
        // Una segunda oferta del mismo anfitrión sería un apretón de manos a
        // medio hacer pisando al que ya está en marcha.
        if (anfitrionEnSala !== null) return;
        anfitrionEnSala = r.de;
        const sdp = await con.responder(r.sdp);
        await sala.mandar({ que: 'respuesta', de: sala.yo, para: r.de, sdp });
      } else if (r.que === 'ice' && r.para === sala.yo) {
        await con.añadirCandidata(r.candidata);
      } else if (r.que === 'adios' && r.de === anfitrionEnSala) {
        parar();
        op.alContar?.('El anfitrión ha cerrado la partida');
        op.alCambiarEstado?.('cerrado');
      }
    })();
  };

  sala = await (op.entrarEnSala ?? entrarEnSala)(op.idPartida, alRecado);

  /**
   * «Aquí estoy», hasta que alguien ofrezca.
   *
   * También se decía una sola vez, y eso daba por hecho que el anfitrión ya
   * estaba en la sala. Si abre el mundo un minuto más tarde —que es lo normal
   * cuando se queda con alguien— aquel único aviso se perdió y el invitado se
   * quedaba esperando una oferta que nadie iba a mandar.
   */
  insistir(
    () => anfitrionEnSala !== null,
    () => void sala.mandar({ que: 'aqui-estoy', de: sala.yo, nombre: op.nombre }),
  );

  return {
    papel: 'invitado',
    avanzar(miCaja, entrada, sumergido = 0) {
      invitado.avanzar(op.mundo, miCaja, entrada, sumergido);
    },
    otros() {
      return invitado.demas.flatMap((o: OtroJugador) => {
        const donde = o.interpolador.donde();
        if (!donde) return [];
        return [
          {
            id: o.id,
            nombre: o.id === 1 ? 'Anfitrión' : `Jugador ${o.id}`,
            x: donde.x,
            y: donde.y,
            mirando: ((o.ultima.banderas & 8) !== 0 ? 1 : -1) as 1 | -1,
          },
        ];
      });
    },
    tile(c) {
      invitado.pedirTile(c);
    },
    desvio() {
      return { x: invitado.prediccion.desvioX, y: invitado.prediccion.desvioY };
    },
    acompanantes() {
      return []; // el invitado no simula bichos: no tiene a quién enseñárselos
    },
    cobrar() {
      /* de repartir golpes se encarga el anfitrión */
    },
    golpear(arma, direccion, sentido) {
      invitado.golpear(arma, direccion, sentido);
    },
    pedirObjeto(idDrop) {
      invitado.pedirObjeto(idDrop);
    },
    avisarCubo(objeto, tx, ty) {
      invitado.avisarCubo(objeto, tx, ty);
    },
    abrirCofre(tx, ty) {
      invitado.abrirCofre(tx, ty);
    },
    tocarCofre(tx, ty, ranura, objeto, cantidad) {
      invitado.tocarCofre(tx, ty, ranura, objeto, cantidad);
    },
    contarCofre() {
      /* el invitado no le cuenta a nadie lo que hay en un cofre */
    },
    entregar() {
      /* el invitado no reparte nada */
    },
    objetos() {
      return invitado.objetos;
    },
    bichos() {
      return invitado.bichos;
    },
    async cerrar() {
      parar();
      con.mandarFirme(escribirAdios());
      con.cerrar();
      invitado.olvidar();
      await sala.cerrar();
    },
  };
}

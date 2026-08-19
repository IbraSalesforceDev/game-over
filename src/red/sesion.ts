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
import type { Enemigo } from '../entities/enemies';
import { Anfitrion, type Enlace, type JugadorConectado } from './anfitrion';
import { ConexionAnfitrion, ConexionInvitado, type EstadoConexion } from './conexion';
import { Invitado, type OtroJugador } from './invitado';
import { escribirAdios, type CambioTile } from './protocolo';
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
  /** Con qué versión nació el mundo, para recrear bien los bichos que llegan. */
  versionMundo?: string;
}

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
        if (conexiones.has(r.de)) return; // ya le estamos atendiendo
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

  sala = await entrarEnSala(op.idPartida, alRecado);

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

  const con = new ConexionInvitado({
    alLlegar: (datos) => invitado.recibir(datos),
    alCambiarEstado: (estado, motivo) => op.alCambiarEstado?.(estado, motivo),
    alTenerCandidata: (candidata) => {
      if (anfitrionEnSala) {
        void sala.mandar({ que: 'ice', de: sala.yo, para: anfitrionEnSala, candidata });
      }
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
    alRechazar: (motivo) => op.alCambiarEstado?.('fallo', motivo),
  });

  const alRecado = (r: Recado): void => {
    void (async () => {
      if (r.que === 'oferta' && r.para === sala.yo) {
        anfitrionEnSala = r.de;
        const sdp = await con.responder(r.sdp);
        await sala.mandar({ que: 'respuesta', de: sala.yo, para: r.de, sdp });
        // Se saluda en cuanto hay canal; si aún no está abierto, el saludo se
        // pierde y se reintenta al conectar.
        invitado.saludar();
      } else if (r.que === 'ice' && r.para === sala.yo) {
        await con.añadirCandidata(r.candidata);
      } else if (r.que === 'adios' && r.de === anfitrionEnSala) {
        op.alContar?.('El anfitrión ha cerrado la partida');
        op.alCambiarEstado?.('cerrado');
      }
    })();
  };

  sala = await entrarEnSala(op.idPartida, alRecado);
  // El canal tarda en abrirse: cuando lo hace, se vuelve a saludar por si el
  // primer intento salió antes de tiempo.
  const saludoAlConectar = (estado: EstadoConexion): void => {
    if (estado === 'conectado' && !invitado.dentro) invitado.saludar();
  };
  const avisoOriginal = op.alCambiarEstado;
  op.alCambiarEstado = (estado, motivo) => {
    saludoAlConectar(estado);
    avisoOriginal?.(estado, motivo);
  };

  await sala.mandar({ que: 'aqui-estoy', de: sala.yo, nombre: op.nombre });

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
    bichos() {
      return invitado.bichos;
    },
    async cerrar() {
      con.mandarFirme(escribirAdios());
      con.cerrar();
      invitado.olvidar();
      await sala.cerrar();
    },
  };
}

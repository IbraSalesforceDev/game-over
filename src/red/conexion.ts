/**
 * La conexión entre dos navegadores.
 *
 * Los datos de partida van por `RTCDataChannel`, directos de un navegador al
 * otro. No pasan por ningún servidor: latencia menor y coste cero, que es lo
 * único que hace viable el multijugador dentro del plan gratis.
 *
 * ## Dos canales, y no es un capricho
 *
 * - **`vivo`** — no fiable y sin orden. Por aquí van las instantáneas y las
 *   teclas, 20 y 30 veces por segundo. Si una se pierde, **no se reenvía**: la
 *   siguiente ya viene de camino con datos más nuevos. Reenviar una posición
 *   vieja es peor que perderla, porque atasca la cola y retrasa las buenas.
 * - **`firme`** — fiable y ordenado. Por aquí van los tiles, los cofres y el
 *   mundo al entrar. Perder «este bloque ya no está» no se arregla solo: los
 *   dos mundos quedarían distintos para siempre.
 *
 * ## Del TURN
 *
 * Solo STUN, de momento, y gratis y sin cuenta. Entre un 10 % y un 20 % de las
 * redes domésticas no consiguen conexión directa y necesitan un relevo TURN, que
 * pide cuenta de Cloudflare y un endpoint que acuñe credenciales. Se deja para
 * cuando se demuestre que hace falta, y mientras tanto un fallo se dice claro en
 * vez de dejar la pantalla esperando.
 */

/**
 * Servidores STUN. Solo sirven para que cada uno averigüe su propia dirección
 * pública; por aquí no pasa ni un byte de partida.
 */
export const STUN: RTCIceServer[] = [
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.l.google.com:19302' },
];

export type EstadoConexion = 'conectando' | 'conectado' | 'cerrado' | 'fallo';

export interface Conexion {
  /** Instantáneas y teclas. Se pierde lo que se pierda. */
  mandarVivo(datos: Uint8Array): void;
  /** Tiles, cofres y el mundo. No se pierde nada. */
  mandarFirme(datos: Uint8Array): void;
  cerrar(): void;
  readonly estado: EstadoConexion;
}

export interface OyentesConexion {
  alLlegar(datos: Uint8Array, firme: boolean): void;
  alCambiarEstado(estado: EstadoConexion, motivo?: string): void;
  /** Una candidata que hay que hacer llegar al otro por la sala. */
  alTenerCandidata(candidata: string): void;
  /**
   * El canal fiable ya está abierto.
   *
   * Hace falta porque «conectado» no significa «se puede mandar». `connectionState`
   * se pone en `connected` cuando terminan ICE y DTLS, y el canal de datos abre
   * después, cuando acaba de negociarse SCTP. Entre las dos cosas hay unos
   * milisegundos en los que `mandar` no manda nada —se va por el desagüe sin
   * decir ni pío— y ahí es donde se perdía el saludo del invitado.
   */
  alAbrirseFirme?(): void;
}

/**
 * Lo común a los dos lados.
 *
 * El anfitrión crea los canales y el invitado los recibe, pero a partir de ahí
 * los dos hacen lo mismo, así que la fontanería vive en un sitio.
 */
class ConexionBase implements Conexion {
  protected pc: RTCPeerConnection;
  protected vivo: RTCDataChannel | null = null;
  protected firme: RTCDataChannel | null = null;
  private _estado: EstadoConexion = 'conectando';
  /** Candidatas que llegaron antes de tener con qué colocarlas. */
  private guardadas: string[] = [];
  private tieneRemoto = false;

  constructor(protected readonly oyentes: OyentesConexion) {
    this.pc = new RTCPeerConnection({ iceServers: STUN });

    this.pc.onicecandidate = (e) => {
      if (e.candidate) this.oyentes.alTenerCandidata(JSON.stringify(e.candidate));
    };

    this.pc.onconnectionstatechange = () => {
      switch (this.pc.connectionState) {
        case 'connected':
          this.cambiar('conectado');
          break;
        case 'failed':
          // El caso típico: una red que necesita TURN y no lo tiene.
          this.cambiar(
            'fallo',
            'No se ha podido conectar directamente. Puede ser cosa de vuestras redes.',
          );
          break;
        case 'disconnected':
        case 'closed':
          this.cambiar('cerrado');
          break;
      }
    };
  }

  get estado(): EstadoConexion {
    return this._estado;
  }

  protected cambiar(estado: EstadoConexion, motivo?: string): void {
    if (this._estado === estado) return;
    this._estado = estado;
    this.oyentes.alCambiarEstado(estado, motivo);
  }

  protected enchufar(canal: RTCDataChannel, firme: boolean): void {
    canal.binaryType = 'arraybuffer';
    canal.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) this.oyentes.alLlegar(new Uint8Array(e.data), firme);
    };
    if (firme) {
      this.firme = canal;
      // Puede llegar ya abierto —`ondatachannel` a veces se dispara con el canal
      // hecho—, y entonces `onopen` no vuelve a saltar nunca. Se mira el estado
      // además de escuchar el evento.
      canal.onopen = () => this.oyentes.alAbrirseFirme?.();
      if (canal.readyState === 'open') this.oyentes.alAbrirseFirme?.();
    } else {
      this.vivo = canal;
    }
  }

  /** ¿Se puede mandar ya por el canal fiable? */
  get firmeAbierto(): boolean {
    return this.firme?.readyState === 'open';
  }

  /**
   * Coloca una candidata del otro.
   *
   * Pueden llegar antes que la descripción remota —la sala no garantiza el
   * orden— y añadirlas entonces las tira. Se guardan y se colocan después.
   */
  async añadirCandidata(texto: string): Promise<void> {
    if (!this.tieneRemoto) {
      this.guardadas.push(texto);
      return;
    }
    try {
      await this.pc.addIceCandidate(JSON.parse(texto) as RTCIceCandidateInit);
    } catch {
      // Una candidata mala no rompe nada: sobran otras por las que conectar.
    }
  }

  protected async colocarGuardadas(): Promise<void> {
    this.tieneRemoto = true;
    const pendientes = this.guardadas;
    this.guardadas = [];
    for (const c of pendientes) await this.añadirCandidata(c);
  }

  private mandar(canal: RTCDataChannel | null, datos: Uint8Array): void {
    if (canal?.readyState !== 'open') return;
    // `slice` para no mandar una vista de un buffer más grande, que enviaría de
    // más sin avisar.
    canal.send(datos.slice().buffer as ArrayBuffer);
  }

  mandarVivo(datos: Uint8Array): void {
    this.mandar(this.vivo, datos);
  }

  mandarFirme(datos: Uint8Array): void {
    this.mandar(this.firme, datos);
  }

  cerrar(): void {
    this.vivo?.close();
    this.firme?.close();
    this.pc.close();
    this.cambiar('cerrado');
  }
}

/** El lado del anfitrión: crea los canales y ofrece. */
export class ConexionAnfitrion extends ConexionBase {
  constructor(oyentes: OyentesConexion) {
    super(oyentes);
    // `maxRetransmits: 0` es lo que lo hace no fiable: se manda una vez y si no
    // llega, mala suerte. Y `ordered: false` para que un paquete perdido no
    // retenga a los que vienen detrás.
    this.enchufar(
      this.pc.createDataChannel('vivo', { ordered: false, maxRetransmits: 0 }),
      false,
    );
    this.enchufar(this.pc.createDataChannel('firme', { ordered: true }), true);
  }

  async oferta(): Promise<string> {
    const o = await this.pc.createOffer();
    await this.pc.setLocalDescription(o);
    return JSON.stringify(o);
  }

  async recibirRespuesta(sdp: string): Promise<void> {
    await this.pc.setRemoteDescription(JSON.parse(sdp) as RTCSessionDescriptionInit);
    await this.colocarGuardadas();
  }
}

/** El lado del invitado: espera los canales y contesta. */
export class ConexionInvitado extends ConexionBase {
  constructor(oyentes: OyentesConexion) {
    super(oyentes);
    // Los canales los crea el anfitrión; aquí llegan hechos y se reconocen por
    // su nombre, que es lo que decide si lo que venga es fiable o no.
    this.pc.ondatachannel = (e) => this.enchufar(e.channel, e.channel.label === 'firme');
  }

  async responder(sdpOferta: string): Promise<string> {
    await this.pc.setRemoteDescription(JSON.parse(sdpOferta) as RTCSessionDescriptionInit);
    await this.colocarGuardadas();
    const r = await this.pc.createAnswer();
    await this.pc.setLocalDescription(r);
    return JSON.stringify(r);
  }
}

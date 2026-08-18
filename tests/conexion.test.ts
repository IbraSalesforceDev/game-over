import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

/**
 * WebRTC de mentira.
 *
 * En Node no hay `RTCPeerConnection`, así que se falsifica lo justo para poder
 * comprobar lo que de verdad decide si esto funciona: cómo se crean los canales
 * y qué pasa con las candidatas que llegan a destiempo.
 */
interface CanalFalso {
  label: string;
  opciones: RTCDataChannelInit | undefined;
  readyState: string;
  binaryType: string;
  enviados: ArrayBuffer[];
  onmessage: ((e: { data: unknown }) => void) | null;
  send(b: ArrayBuffer): void;
  close(): void;
}

const canales: CanalFalso[] = [];
let candidatasAñadidas: string[] = [];
let remotoPuesto = false;

function crearCanalFalso(label: string, opciones?: RTCDataChannelInit): CanalFalso {
  const c: CanalFalso = {
    label,
    opciones,
    readyState: 'open',
    binaryType: '',
    enviados: [],
    onmessage: null,
    send(b) {
      c.enviados.push(b);
    },
    close() {
      c.readyState = 'closed';
    },
  };
  canales.push(c);
  return c;
}

class PeerFalso {
  connectionState = 'new';
  onicecandidate: ((e: { candidate: unknown }) => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  ondatachannel: ((e: { channel: CanalFalso }) => void) | null = null;
  createDataChannel = (label: string, op?: RTCDataChannelInit) => crearCanalFalso(label, op);
  createOffer = async () => ({ type: 'offer', sdp: 'OFERTA' });
  createAnswer = async () => ({ type: 'answer', sdp: 'RESPUESTA' });
  setLocalDescription = async () => {};
  setRemoteDescription = async () => {
    remotoPuesto = true;
  };
  addIceCandidate = async (c: RTCIceCandidateInit) => {
    if (!remotoPuesto) throw new Error('todavía no hay descripción remota');
    candidatasAñadidas.push(JSON.stringify(c));
  };
  close = () => {
    this.connectionState = 'closed';
  };
}

vi.stubGlobal('RTCPeerConnection', PeerFalso);

const { ConexionAnfitrion, ConexionInvitado, STUN } = await import('../src/red/conexion');

function oyentes() {
  const llegados: { datos: Uint8Array; firme: boolean }[] = [];
  const estados: { estado: string; motivo?: string }[] = [];
  const candidatas: string[] = [];
  return {
    llegados,
    estados,
    candidatas,
    alLlegar: (datos: Uint8Array, firme: boolean) => llegados.push({ datos, firme }),
    alCambiarEstado: (estado: string, motivo?: string) => estados.push({ estado, motivo }),
    alTenerCandidata: (c: string) => candidatas.push(c),
  };
}

beforeEach(() => {
  canales.length = 0;
  candidatasAñadidas = [];
  remotoPuesto = false;
});
afterEach(() => vi.clearAllMocks());

describe('los dos canales', () => {
  /**
   * El test que impide el fallo caro de este fichero.
   *
   * Si al canal de instantáneas se le olvida `maxRetransmits: 0`, deja de ser
   * no fiable: una posición perdida se reenvía, atasca la cola y retrasa a las
   * que vienen detrás con datos mejores. Se nota como tirones y no como error,
   * que es lo peor que puede pasar.
   */
  it('el canal en vivo no reenvía ni ordena', () => {
    new ConexionAnfitrion(oyentes());
    const vivo = canales.find((c) => c.label === 'vivo');
    expect(vivo).toBeDefined();
    expect(vivo!.opciones).toMatchObject({ ordered: false, maxRetransmits: 0 });
  });

  it('el canal firme sí ordena y no pierde nada', () => {
    new ConexionAnfitrion(oyentes());
    const firme = canales.find((c) => c.label === 'firme');
    expect(firme!.opciones).toMatchObject({ ordered: true });
    expect(firme!.opciones).not.toHaveProperty('maxRetransmits');
  });

  it('los dos reciben binario, no texto', () => {
    new ConexionAnfitrion(oyentes());
    expect(canales.map((c) => c.binaryType)).toEqual(['arraybuffer', 'arraybuffer']);
  });

  it('lo que llega dice por qué canal ha venido', () => {
    const o = oyentes();
    new ConexionAnfitrion(o);
    const vivo = canales.find((c) => c.label === 'vivo')!;
    const firme = canales.find((c) => c.label === 'firme')!;
    vivo.onmessage!({ data: new Uint8Array([1, 2]).buffer });
    firme.onmessage!({ data: new Uint8Array([3]).buffer });
    expect(o.llegados.map((l) => l.firme)).toEqual([false, true]);
    expect(o.llegados[0]!.datos).toEqual(new Uint8Array([1, 2]));
  });

  it('lo que no sea binario se ignora', () => {
    const o = oyentes();
    new ConexionAnfitrion(o);
    canales[0]!.onmessage!({ data: 'hola' });
    expect(o.llegados).toHaveLength(0);
  });
});

describe('mandar', () => {
  it('mandar por un canal cerrado no revienta', () => {
    const c = new ConexionAnfitrion(oyentes());
    for (const canal of canales) canal.readyState = 'closed';
    expect(() => c.mandarVivo(new Uint8Array([1]))).not.toThrow();
    expect(() => c.mandarFirme(new Uint8Array([1]))).not.toThrow();
  });

  /** Mandar una vista de un buffer mayor enviaría de más sin avisar. */
  it('manda solo los bytes que se le dan, no el buffer entero', () => {
    const c = new ConexionAnfitrion(oyentes());
    const grande = new Uint8Array([9, 9, 1, 2, 3, 9, 9]);
    c.mandarVivo(grande.subarray(2, 5));
    const vivo = canales.find((x) => x.label === 'vivo')!;
    expect(new Uint8Array(vivo.enviados[0]!)).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('candidatas a destiempo', () => {
  /**
   * La sala no garantiza el orden, así que las candidatas pueden llegar antes
   * que la descripción remota. Añadirlas entonces las tira, y sin candidatas no
   * hay conexión: la pantalla se queda esperando para siempre.
   */
  it('las que llegan pronto se guardan y se colocan después', async () => {
    const c = new ConexionAnfitrion(oyentes());
    await c.añadirCandidata('{"candidate":"una"}');
    await c.añadirCandidata('{"candidate":"otra"}');
    expect(candidatasAñadidas).toHaveLength(0);

    await c.recibirRespuesta('{"type":"answer"}');
    expect(candidatasAñadidas).toHaveLength(2);
  });

  it('una candidata rota no tumba la conexión', async () => {
    const c = new ConexionAnfitrion(oyentes());
    await c.recibirRespuesta('{"type":"answer"}');
    await expect(c.añadirCandidata('esto no es json')).resolves.toBeUndefined();
    expect(c.estado).not.toBe('fallo');
  });

  it('el invitado también las guarda hasta tener la oferta', async () => {
    const c = new ConexionInvitado(oyentes());
    await c.añadirCandidata('{"candidate":"una"}');
    expect(candidatasAñadidas).toHaveLength(0);
    await c.responder('{"type":"offer"}');
    expect(candidatasAñadidas).toHaveLength(1);
  });
});

describe('estados', () => {
  it('un fallo de conexión se explica, no se calla', () => {
    const o = oyentes();
    const c = new ConexionAnfitrion(o);
    const pc = (c as unknown as { pc: PeerFalso }).pc;
    pc.connectionState = 'failed';
    pc.onconnectionstatechange!();
    expect(c.estado).toBe('fallo');
    expect(o.estados.at(-1)!.motivo).toBeTruthy();
  });

  it('no repite el mismo estado dos veces', () => {
    const o = oyentes();
    const c = new ConexionAnfitrion(o);
    const pc = (c as unknown as { pc: PeerFalso }).pc;
    pc.connectionState = 'connected';
    pc.onconnectionstatechange!();
    pc.onconnectionstatechange!();
    expect(o.estados.filter((e) => e.estado === 'conectado')).toHaveLength(1);
  });

  it('cerrar cierra los dos canales', () => {
    const c = new ConexionAnfitrion(oyentes());
    c.cerrar();
    expect(canales.every((x) => x.readyState === 'closed')).toBe(true);
    expect(c.estado).toBe('cerrado');
  });
});

describe('el invitado no crea canales', () => {
  it('los recibe hechos y los reconoce por el nombre', () => {
    const o = oyentes();
    const c = new ConexionInvitado(o);
    expect(canales).toHaveLength(0); // no ha creado ninguno

    const pc = (c as unknown as { pc: PeerFalso }).pc;
    pc.ondatachannel!({ channel: crearCanalFalso('firme') });
    pc.ondatachannel!({ channel: crearCanalFalso('vivo') });

    canales[0]!.onmessage!({ data: new Uint8Array([1]).buffer });
    canales[1]!.onmessage!({ data: new Uint8Array([2]).buffer });
    expect(o.llegados.map((l) => l.firme)).toEqual([true, false]);
  });
});

describe('STUN', () => {
  /** Por STUN no pasa partida: solo sirve para saber la propia dirección. */
  it('hay más de uno, por si uno se cae', () => {
    expect(STUN.length).toBeGreaterThan(1);
    expect(STUN.every((s) => String(s.urls).startsWith('stun:'))).toBe(true);
  });
});

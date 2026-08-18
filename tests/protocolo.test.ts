import { describe, expect, it } from 'vitest';
import {
  BOTON,
  BYTES_POR_TROZO,
  ENT,
  JuntaMundo,
  MSG,
  RECHAZO,
  VERSION_PROTOCOLO,
  escribirAdios,
  escribirBienvenido,
  escribirEntrada,
  escribirHola,
  escribirInstantanea,
  escribirPidoTile,
  escribirRechazo,
  escribirTiles,
  leerMensaje,
  textoRechazo,
  trocearMundo,
  type EntidadRed,
} from '../src/red/protocolo';

describe('ida y vuelta de cada mensaje', () => {
  it('hola', () => {
    const m = leerMensaje(escribirHola('Ibra', 'mmsux3lc15y1v'));
    expect(m).toEqual({
      tipo: MSG.HOLA,
      version: VERSION_PROTOCOLO,
      nombre: 'Ibra',
      idPartida: 'mmsux3lc15y1v',
    });
  });

  it('un nombre con acentos y emoji vuelve entero', () => {
    const m = leerMensaje(escribirHola('Ñoño 🪓', 'p1'));
    expect(m).toMatchObject({ nombre: 'Ñoño 🪓' });
  });

  it('bienvenido y rechazo', () => {
    expect(leerMensaje(escribirBienvenido(2, 1234))).toEqual({
      tipo: MSG.BIENVENIDO,
      numeroJugador: 2,
      tick: 1234,
    });
    expect(leerMensaje(escribirRechazo(RECHAZO.LLENO))).toEqual({
      tipo: MSG.RECHAZO,
      motivo: RECHAZO.LLENO,
    });
  });

  it('entrada', () => {
    const entrada = {
      tick: 99,
      botones: BOTON.DERECHA | BOTON.SALTO,
      ratonTx: -12,
      ratonTy: 340,
    };
    expect(leerMensaje(escribirEntrada(entrada))).toEqual({ tipo: MSG.ENTRADA, entrada });
  });

  it('pido tile y tiles, incluida la capa de pared', () => {
    const cambio = { tx: 700, ty: 300, id: 0, pared: true };
    expect(leerMensaje(escribirPidoTile(cambio))).toEqual({ tipo: MSG.PIDO_TILE, cambio });

    const cambios = [cambio, { tx: -1, ty: 5, id: 73, pared: false }];
    expect(leerMensaje(escribirTiles(cambios))).toEqual({ tipo: MSG.TILES, cambios });
  });

  it('adios', () => {
    expect(leerMensaje(escribirAdios())).toEqual({ tipo: MSG.ADIOS });
  });
});

describe('instantánea', () => {
  const ent = (extra: Partial<EntidadRed> = {}): EntidadRed => ({
    clase: ENT.JUGADOR,
    id: 1,
    x: 1200,
    y: -400,
    vx: 2.5,
    vy: -3.25,
    banderas: 0b101,
    vida: 100,
    ticksCoyote: 3,
    ticksBuffer: 0,
    ticksSalto: 7,
    yInicioCaida: -250,
    ...extra,
  });

  it('va y vuelve entera', () => {
    const inst = { tick: 500, tickConfirmado: 497, entidades: [ent(), ent({ id: 2, x: -80 })] };
    const m = leerMensaje(escribirInstantanea(inst));
    expect(m).toMatchObject({ tipo: MSG.INSTANTANEA });
    expect((m as { instantanea: typeof inst }).instantanea).toEqual(inst);
  });

  /**
   * La velocidad viaja x256 y no redondeada a entero.
   *
   * En píxeles por tick es un número pequeño con decimales que importan: a
   * entero, un jugador andando a 2,5 se vería a 2 o a 3 y la interpolación daría
   * tirones.
   */
  it('conserva los decimales de la velocidad', () => {
    const inst = { tick: 1, tickConfirmado: 0, entidades: [ent({ vx: 2.5, vy: -0.125 })] };
    const leida = (
      leerMensaje(escribirInstantanea(inst)) as { instantanea: typeof inst }
    ).instantanea;
    expect(leida.entidades[0]!.vx).toBe(2.5);
    expect(leida.entidades[0]!.vy).toBe(-0.125);
  });

  /**
   * Lo que hace que los bichos se puedan añadir sin tocar esto.
   *
   * La instantánea transporta la clase sin interpretarla. Si este test falla es
   * que alguien ha metido lógica de jugadores dentro del transporte, y la fase B
   * pasa de "añadir un caso" a "reescribir el protocolo".
   */
  it('transporta clases que la fase A no usa', () => {
    const inst = {
      tick: 1,
      tickConfirmado: 0,
      entidades: [ent({ clase: ENT.BICHO, id: 40 }), ent({ clase: ENT.PROYECTIL, id: 41 })],
    };
    const leida = (
      leerMensaje(escribirInstantanea(inst)) as { instantanea: typeof inst }
    ).instantanea;
    expect(leida.entidades.map((e) => e.clase)).toEqual([ENT.BICHO, ENT.PROYECTIL]);
  });

  /**
   * Sin esto, repetir las teclas del cliente arranca en otra fase del salto.
   * Medido antes de arreglarlo: hasta 96 px de desvío con 200 ms de red.
   */
  it('el estado del salto sobrevive al viaje', () => {
    const inst = {
      tick: 1,
      tickConfirmado: 0,
      entidades: [ent({ ticksCoyote: 5, ticksBuffer: 2, ticksSalto: 11, yInicioCaida: -600 })],
    };
    const leida = (
      leerMensaje(escribirInstantanea(inst)) as { instantanea: typeof inst }
    ).instantanea;
    expect(leida.entidades[0]).toMatchObject({
      ticksCoyote: 5,
      ticksBuffer: 2,
      ticksSalto: 11,
      yInicioCaida: -600,
    });
  });

  it('una instantánea vacía es válida', () => {
    const inst = { tick: 7, tickConfirmado: 7, entidades: [] as EntidadRed[] };
    const leida = (
      leerMensaje(escribirInstantanea(inst)) as { instantanea: typeof inst }
    ).instantanea;
    expect(leida.entidades).toEqual([]);
  });
});

/**
 * Al otro lado del cable hay algo que no controlamos.
 *
 * Nada de lo que llegue puede tirar la partida: se ignora y se sigue.
 */
describe('basura por el cable', () => {
  it('un mensaje vacío no revienta', () => {
    expect(leerMensaje(new Uint8Array(0))).toBeNull();
  });

  it('un tipo desconocido se ignora', () => {
    expect(leerMensaje(new Uint8Array([250, 1, 2, 3]))).toBeNull();
  });

  it('un mensaje cortado a la mitad se ignora', () => {
    const entero = escribirInstantanea({
      tick: 1,
      tickConfirmado: 0,
      entidades: [
        {
          clase: ENT.JUGADOR, id: 1, x: 1, y: 2, vx: 0, vy: 0, banderas: 0, vida: 1,
          ticksCoyote: 0, ticksBuffer: 0, ticksSalto: 0, yInicioCaida: 0,
        },
      ],
    });
    expect(leerMensaje(entero.slice(0, entero.length - 4))).toBeNull();
  });

  it('una instantánea que promete más entidades de las que trae se ignora', () => {
    // Dice 999 entidades y no trae ninguna.
    const malo = new Uint8Array([MSG.INSTANTANEA, 0, 0, 0, 1, 0, 0, 0, 0, 3, 231]);
    expect(leerMensaje(malo)).toBeNull();
  });

  it('el rechazo siempre tiene texto, incluso uno que no conocemos', () => {
    expect(textoRechazo(RECHAZO.VERSION)).toMatch(/versiones distintas/i);
    expect(textoRechazo(200)).toBeTruthy();
  });
});

describe('el mundo troceado', () => {
  function mundoDePrueba(n: number): Uint8Array {
    const d = new Uint8Array(n);
    for (let i = 0; i < n; i++) d[i] = (i * 31) % 251;
    return d;
  }

  it('un mundo de tamaño real va y vuelve idéntico', () => {
    const original = mundoDePrueba(129 * 1024);
    const trozos = trocearMundo(original);
    expect(trozos.length).toBe(Math.ceil(original.length / BYTES_POR_TROZO));

    const junta = new JuntaMundo();
    let entero: Uint8Array | null = null;
    for (const t of trozos) {
      const m = leerMensaje(t) as { trozo: number; total: number; datos: Uint8Array };
      entero = junta.añadir(m.trozo, m.total, m.datos);
    }
    expect(entero).toEqual(original);
  });

  /** Una reconexión o un reintento no pueden dar un mundo corrupto. */
  it('un trozo repetido no descuadra el resultado', () => {
    const original = mundoDePrueba(40 * 1024);
    const trozos = trocearMundo(original).map(
      (t) => leerMensaje(t) as { trozo: number; total: number; datos: Uint8Array },
    );
    const junta = new JuntaMundo();
    junta.añadir(trozos[0]!.trozo, trozos[0]!.total, trozos[0]!.datos);
    junta.añadir(trozos[0]!.trozo, trozos[0]!.total, trozos[0]!.datos); // repetido
    let entero: Uint8Array | null = null;
    for (const t of trozos.slice(1)) entero = junta.añadir(t.trozo, t.total, t.datos);
    expect(entero).toEqual(original);
  });

  it('hasta que no están todos no devuelve nada, y el progreso sube', () => {
    const trozos = trocearMundo(mundoDePrueba(50 * 1024)).map(
      (t) => leerMensaje(t) as { trozo: number; total: number; datos: Uint8Array },
    );
    const junta = new JuntaMundo();
    for (const t of trozos.slice(0, -1)) {
      expect(junta.añadir(t.trozo, t.total, t.datos)).toBeNull();
    }
    expect(junta.progreso).toBeGreaterThan(0.5);
    expect(junta.progreso).toBeLessThan(1);
    const ultimo = trozos[trozos.length - 1]!;
    expect(junta.añadir(ultimo.trozo, ultimo.total, ultimo.datos)).not.toBeNull();
    expect(junta.progreso).toBe(1);
  });

  it('un mundo vacío sigue dando un trozo', () => {
    expect(trocearMundo(new Uint8Array(0)).length).toBe(1);
  });
});

/**
 * El cliente no manda su posición, solo lo que pulsa.
 *
 * Si mandara la posición, cualquiera podría teletransportarse escribiendo un
 * número. Este test vigila esa frontera: si algún día aparece una x en la
 * entrada, es que la autoridad se ha escapado al cliente.
 */
describe('la autoridad no se le escapa al cliente', () => {
  it('la entrada solo lleva tick, botones y ratón', () => {
    const bytes = escribirEntrada({ tick: 1, botones: 0, ratonTx: 0, ratonTy: 0 });
    // 1 tipo + 4 tick + 1 botones + 2 + 2 ratón
    expect(bytes.length).toBe(10);
  });
});

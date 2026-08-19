import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import {
  AJUSTES_POR_DEFECTO,
  actualizarFisica,
  crearCaja,
  type Entrada,
} from '../src/entities/physics';
import { Mundo } from '../src/world/world';
import { AIRE, PIEDRA, TIERRA } from '../src/world/tiles';
import { ALCANCE_TILES, Anfitrion, type Enlace } from '../src/red/anfitrion';
import { TICKS_GOLPE } from '../src/entities/combat';
import { Invitado } from '../src/red/invitado';
import {
  ENT,
  escribirGolpe,
  escribirHola,
  escribirInstantanea,
  escribirRecogido,
  leerMensaje,
  type CambioTile,
} from '../src/red/protocolo';
import { defObjeto, ESPADA_HIERRO, GEL, IDS_OBJETO } from '../src/items/items';
import { actualizarEnemigos, crearEnemigo, type Enemigo } from '../src/entities/enemies';

/**
 * Un cable de mentira, con retraso y pérdidas.
 *
 * Es lo que permite probar la partida entera sin abrir un navegador. El canal
 * en vivo pierde paquetes a propósito, porque en la vida real los pierde: si el
 * juego solo funcionara con la red perfecta, no funcionaría.
 */
class Cable {
  private cola: { enTick: number; datos: Uint8Array; firme: boolean; haciaA: boolean }[] = [];
  private tick = 0;
  private semilla = 12345;

  constructor(
    private readonly retraso: number,
    private readonly perdidaViva: number,
  ) {}

  private azar(): number {
    this.semilla = (this.semilla * 1103515245 + 12345) & 0x7fffffff;
    return this.semilla / 0x7fffffff;
  }

  private meter(datos: Uint8Array, firme: boolean, haciaA: boolean): void {
    // Solo el canal en vivo pierde: el firme reenvía hasta que llega.
    if (!firme && this.azar() < this.perdidaViva) return;
    this.cola.push({ enTick: this.tick + this.retraso, datos, firme, haciaA });
  }

  /** El enlace que ve el anfitrión (manda hacia el invitado). */
  haciaInvitado(): Enlace {
    return {
      mandarVivo: (d) => this.meter(d, false, false),
      mandarFirme: (d) => this.meter(d, true, false),
    };
  }

  /** El que ve el invitado (manda hacia el anfitrión). */
  haciaAnfitrion(): Enlace {
    return {
      mandarVivo: (d) => this.meter(d, false, true),
      mandarFirme: (d) => this.meter(d, true, true),
    };
  }

  /** Entrega lo que toque en este tick. */
  avanzar(aAnfitrion: (d: Uint8Array) => void, aInvitado: (d: Uint8Array) => void): void {
    this.tick++;
    const listos = this.cola.filter((p) => p.enTick <= this.tick);
    this.cola = this.cola.filter((p) => p.enTick > this.tick);
    for (const p of listos) (p.haciaA ? aAnfitrion : aInvitado)(p.datos);
  }

  /** Vacía la cola de golpe, para el saludo y el envío del mundo. */
  vaciar(aAnfitrion: (d: Uint8Array) => void, aInvitado: (d: Uint8Array) => void): void {
    for (let i = 0; i < 200 && this.cola.length > 0; i++) this.avanzar(aAnfitrion, aInvitado);
  }
}

function mundoDePruebas(): Mundo {
  const m = new Mundo(200, 60);
  for (let tx = 0; tx < 200; tx++) {
    for (let ty = 40; ty < 60; ty++) m.setTile(tx, ty, PIEDRA);
  }
  return m;
}

const quieto: Entrada = { izq: false, der: false, abajo: false, salto: false, saltoPulsado: false };

function teclasDe(t: number): Entrada {
  return {
    izq: t % 101 > 85,
    der: t % 101 <= 85,
    abajo: false,
    salto: t % 19 < 5,
    saltoPulsado: t % 19 === 0,
  };
}

/** Monta anfitrión, invitado y cable, ya saludados y con el mundo entregado. */
async function montarPartida(retraso = 6, perdida = 0) {
  const mundoAnf = mundoDePruebas();
  const mundoInv = mundoDePruebas();
  const cable = new Cable(retraso, perdida);

  const tilesEnElInvitado: CambioTile[] = [];
  let bytesPedidos = 0;

  const bichosDelAnfitrion: Enemigo[] = [];
  const anfitrion = new Anfitrion({
    mundo: mundoAnf,
    ajustes: AJUSTES_POR_DEFECTO,
    idPartida: 'p1',
    spawnTx: 10,
    spawnTy: 38,
    bytesDelMundo: async () => {
      bytesPedidos++;
      return new Uint8Array(40 * 1024).fill(7);
    },
    bichos: () => bichosDelAnfitrion,
  });

  let mundoRecibido: Uint8Array | null = null;
  const invitado = new Invitado({
    enlace: cable.haciaAnfitrion(),
    nombre: 'Invitado',
    idPartida: 'p1',
    ajustes: AJUSTES_POR_DEFECTO,
    alLlegarMundo: (b) => {
      mundoRecibido = b;
    },
    alCambiarTiles: (cs) => {
      for (const c of cs) {
        tilesEnElInvitado.push(c);
        if (c.pared) mundoInv.setPared(c.tx, c.ty, c.id);
        else mundoInv.setTile(c.tx, c.ty, c.id);
      }
    },
  });

  let quien: number | null = null;
  const alAnfitrion = (d: Uint8Array) => {
    quien = anfitrion.recibir(cable.haciaInvitado(), d, quien);
  };
  const alInvitado = (d: Uint8Array) => invitado.recibir(d);

  invitado.saludar();
  cable.vaciar(alAnfitrion, alInvitado);
  if (quien !== null) await anfitrion.mandarMundo(quien);
  cable.vaciar(alAnfitrion, alInvitado);

  return {
    cable,
    anfitrion,
    invitado,
    mundoAnf,
    mundoInv,
    alAnfitrion,
    alInvitado,
    tilesEnElInvitado,
    bichosDelAnfitrion,
    get mundoRecibido() {
      return mundoRecibido;
    },
    get bytesPedidos() {
      return bytesPedidos;
    },
    get quien() {
      return quien;
    },
  };
}

describe('entrar en una partida', () => {
  it('saluda, le dan número y recibe el mundo entero', async () => {
    const p = await montarPartida();
    expect(p.quien).not.toBeNull();
    expect(p.invitado.miId).toBe(2); // el 1 es el anfitrión
    expect(p.invitado.dentro).toBe(true);
    expect(p.mundoRecibido).not.toBeNull();
    expect(p.mundoRecibido!.length).toBe(40 * 1024);
    expect(p.bytesPedidos).toBe(1);
  });

  it('con la versión de protocolo cambiada, se rechaza y se explica', async () => {
    const mundo = mundoDePruebas();
    const anf = new Anfitrion({
      mundo,
      ajustes: AJUSTES_POR_DEFECTO,
      idPartida: 'p1',
      spawnTx: 10,
      spawnTy: 38,
      bytesDelMundo: async () => new Uint8Array(0),
    });
    const salida: Uint8Array[] = [];
    const enlace: Enlace = { mandarVivo: (d) => salida.push(d), mandarFirme: (d) => salida.push(d) };
    // Un hola con versión 99.
    const hola = new Uint8Array([1, 0, 99, 0, 2, 104, 105, 0, 2, 112, 49]);
    expect(anf.recibir(enlace, hola, null)).toBeNull();

    let motivo = '';
    const inv = new Invitado({
      enlace,
      nombre: 'x',
      idPartida: 'p1',
      ajustes: AJUSTES_POR_DEFECTO,
      alLlegarMundo: () => {},
      alCambiarTiles: () => {},
      alRechazar: (m) => {
        motivo = m;
      },
    });
    inv.recibir(salida[0]!);
    expect(motivo).toMatch(/versiones distintas/i);
  });

  it('a la partida equivocada no se entra', async () => {
    const anf = new Anfitrion({
      mundo: mundoDePruebas(),
      ajustes: AJUSTES_POR_DEFECTO,
      idPartida: 'la-buena',
      spawnTx: 10,
      spawnTy: 38,
      bytesDelMundo: async () => new Uint8Array(0),
    });
    const salida: Uint8Array[] = [];
    const enlace: Enlace = { mandarVivo: (d) => salida.push(d), mandarFirme: (d) => salida.push(d) };
    const inv = new Invitado({
      enlace,
      nombre: 'x',
      idPartida: 'la-mala',
      ajustes: AJUSTES_POR_DEFECTO,
      alLlegarMundo: () => {},
      alCambiarTiles: () => {},
    });
    inv.saludar();
    expect(anf.recibir(enlace, salida[0]!, null)).toBeNull();
    expect(anf.conectados).toHaveLength(0);
  });
});

describe('jugar en red', () => {
  /**
   * **La prueba de que la fase A funciona.**
   *
   * Anfitrión e invitado corren 400 ticks con retraso de red y pérdidas en el
   * canal en vivo. Al final, el personaje del invitado tiene que estar donde el
   * anfitrión dice que está — porque el anfitrión es quien manda — y donde
   * estaría jugando solo, porque si no, se sentiría raro.
   */
  it('el invitado acaba donde dice el anfitrión, con retraso y pérdidas', async () => {
    const p = await montarPartida(6, 0.1);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const invCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);

    for (let t = 0; t < 400; t++) {
      // El invitado mueve su personaje en local y manda las teclas.
      const teclas = teclasDe(t);
      actualizarFisica(p.mundoInv, invCaja, teclas, AJUSTES_POR_DEFECTO);
      p.invitado.avanzar(p.mundoInv, invCaja, teclas);

      // El anfitrión mueve el suyo (quieto) y simula a los demás.
      actualizarFisica(p.mundoAnf, miCaja, quieto, AJUSTES_POR_DEFECTO);
      p.anfitrion.avanzar(miCaja);

      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }

    const suyo = p.anfitrion.conectados[0]!.caja;
    // El invitado va por delante del anfitrión (predice), así que no coinciden
    // al píxel; lo que importa es que no se hayan separado.
    expect(Math.abs(invCaja.x - suyo.x)).toBeLessThan(3 * TILE);
    expect(Math.abs(invCaja.y - suyo.y)).toBeLessThan(3 * TILE);
    // Y que de verdad se ha movido, no que los dos estén parados.
    expect(invCaja.x).toBeGreaterThan(20 * TILE);
  });

  it('el anfitrión ve moverse al invitado, y el invitado al anfitrión', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(30 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const invCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const derecha: Entrada = { ...quieto, der: true };

    for (let t = 0; t < 120; t++) {
      actualizarFisica(p.mundoInv, invCaja, derecha, AJUSTES_POR_DEFECTO);
      p.invitado.avanzar(p.mundoInv, invCaja, derecha);
      actualizarFisica(p.mundoAnf, miCaja, derecha, AJUSTES_POR_DEFECTO);
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }

    // El invitado tiene al anfitrión en su lista y lo ve donde toca.
    const anfitrionVisto = p.invitado.demas.find((o) => o.id === 1);
    expect(anfitrionVisto).toBeDefined();
    const donde = anfitrionVisto!.interpolador.donde()!;
    expect(Math.abs(donde.x - miCaja.x)).toBeLessThan(3 * TILE);
  });
});

describe('los tiles los decide el anfitrión', () => {
  it('un bloque que se pica llega al otro lado', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const invCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);

    p.invitado.pedirTile({ tx: 11, ty: 40, id: AIRE, pared: false });

    for (let t = 0; t < 40; t++) {
      p.invitado.avanzar(p.mundoInv, invCaja, quieto);
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }

    expect(p.mundoAnf.getTile(11, 40)).toBe(AIRE);
    expect(p.tilesEnElInvitado).toContainEqual({ tx: 11, ty: 40, id: AIRE, pared: false });
  });

  /**
   * El motivo de que el alcance se compruebe en el anfitrión.
   *
   * Si solo lo mirara el cliente, un cliente modificado desmontaría el mundo
   * entero sin moverse del sitio.
   */
  it('no se pica un bloque que queda lejísimos', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const invCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);

    const lejos = 10 + ALCANCE_TILES + 20;
    p.invitado.pedirTile({ tx: lejos, ty: 40, id: AIRE, pared: false });

    for (let t = 0; t < 40; t++) {
      p.invitado.avanzar(p.mundoInv, invCaja, quieto);
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }

    expect(p.mundoAnf.getTile(lejos, 40)).toBe(PIEDRA);
    expect(p.tilesEnElInvitado).toHaveLength(0);
  });

  it('un bloque fuera del mundo no rompe nada', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    p.invitado.pedirTile({ tx: -5, ty: -5, id: TIERRA, pared: false });
    for (let t = 0; t < 20; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.tilesEnElInvitado).toHaveLength(0);
  });

  it('lo que pica el anfitrión también se difunde', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    p.mundoAnf.setTile(12, 40, AIRE);
    p.anfitrion.anunciarTile({ tx: 12, ty: 40, id: AIRE, pared: false });
    for (let t = 0; t < 20; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.mundoInv.getTile(12, 40)).toBe(AIRE);
  });
});

describe('desconfiar de lo que llega', () => {
  it('un tick de entrada repetido no cuenta dos veces', async () => {
    const p = await montarPartida(1);
    const j = p.anfitrion.conectados[0]!;
    // Dos entradas con el mismo tick: la segunda se ignora.
    const dos = new Uint8Array([5, 0, 0, 0, 5, 2, 0, 0, 0, 0]); // ENTRADA tick 5, DERECHA
    p.anfitrion.recibir(j.enlace, dos, j.id);
    expect(j.ultimoTick).toBe(5);
    const vieja = new Uint8Array([5, 0, 0, 0, 3, 1, 0, 0, 0, 0]); // tick 3, IZQUIERDA
    p.anfitrion.recibir(j.enlace, vieja, j.id);
    expect(j.ultimoTick).toBe(5); // no ha retrocedido
    expect(j.entrada.der).toBe(true);
  });

  it('basura por el cable no tumba al anfitrión', async () => {
    const p = await montarPartida(1);
    const j = p.anfitrion.conectados[0]!;
    expect(() => p.anfitrion.recibir(j.enlace, new Uint8Array([200, 1, 2]), j.id)).not.toThrow();
    expect(() => p.anfitrion.recibir(j.enlace, new Uint8Array(0), j.id)).not.toThrow();
    expect(p.anfitrion.conectados).toHaveLength(1);
  });

  /**
   * El flanco de salto se deduce en el anfitrión y no viaja.
   *
   * Si viajara, un cliente modificado podría afirmar «he pulsado salto» en cada
   * tick y saltar sin tocar el suelo.
   */
  it('mantener salto no cuenta como pulsarlo cada tick', async () => {
    const p = await montarPartida(1);
    const j = p.anfitrion.conectados[0]!;
    const conSalto = (tick: number) =>
      new Uint8Array([5, 0, 0, 0, tick, 16, 0, 0, 0, 0]); // botón SALTO
    p.anfitrion.recibir(j.enlace, conSalto(1), j.id);
    expect(j.entrada.saltoPulsado).toBe(true);
    p.anfitrion.recibir(j.enlace, conSalto(2), j.id);
    expect(j.entrada.saltoPulsado).toBe(false);
  });
});

describe('irse', () => {
  it('quien dice adiós desaparece de la lista', async () => {
    const p = await montarPartida(1);
    const j = p.anfitrion.conectados[0]!;
    expect(p.anfitrion.recibir(j.enlace, new Uint8Array([9]), j.id)).toBeNull();
    expect(p.anfitrion.conectados).toHaveLength(0);
  });

  it('el invitado se olvida de los demás al salir', async () => {
    const p = await montarPartida(2);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const invCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    for (let t = 0; t < 30; t++) {
      p.invitado.avanzar(p.mundoInv, invCaja, quieto);
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.invitado.demas.length).toBeGreaterThan(0);
    p.invitado.olvidar();
    expect(p.invitado.demas).toHaveLength(0);
    expect(p.invitado.dentro).toBe(false);
  });
});


describe('los bichos los pone el anfitrión', () => {
  /** El invitado no simula ninguno: los suyos son los que le llegan. */
  it('un bicho del anfitrión aparece en el invitado, con su especie y su vida', async () => {
    const p = await montarPartida(4);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    p.bichosDelAnfitrion.push(crearEnemigo('zombi', 20 * TILE, 38 * TILE));
    p.bichosDelAnfitrion.push(crearEnemigo('murcielago', 25 * TILE, 30 * TILE));

    for (let t = 0; t < 30; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }

    const vistos = p.invitado.bichos;
    expect(vistos).toHaveLength(2);
    expect(vistos.map((b) => b.especie).sort()).toEqual(['murcielago', 'zombi']);
    const zombi = vistos.find((b) => b.especie === 'zombi')!;
    expect(zombi.caja.x).toBeCloseTo(20 * TILE, 0);
    expect(zombi.salud.vidaMax).toBeGreaterThan(0);
    expect(zombi.vivo).toBe(true);
  });

  /**
   * Ausentarse es la forma de decir «ya no está».
   *
   * Sin esto haría falta un mensaje de «este ha muerto», y una instantánea
   * perdida dejaría un cadáver de pie para siempre.
   */
  it('un bicho que muere desaparece del invitado', async () => {
    const p = await montarPartida(2);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const bicho = crearEnemigo('zombi', 20 * TILE, 38 * TILE);
    p.bichosDelAnfitrion.push(bicho);

    for (let t = 0; t < 20; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.invitado.bichos).toHaveLength(1);

    bicho.vivo = false;
    for (let t = 0; t < 20; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.invitado.bichos).toHaveLength(0);
  });

  it('el bicho se mueve al otro lado, no se queda clavado', async () => {
    const p = await montarPartida(2);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    const bicho = crearEnemigo('zombi', 20 * TILE, 38 * TILE);
    p.bichosDelAnfitrion.push(bicho);

    for (let t = 0; t < 60; t++) {
      bicho.caja.x += 1.5;
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.invitado.bichos[0]!.caja.x).toBeGreaterThan(20 * TILE + 40);
  });

  /** Una luna de sangre no puede llenar el canal de golpe. */
  it('hay un tope de bichos por instantánea', async () => {
    const p = await montarPartida(2);
    const miCaja = crearCaja(10 * TILE, 38 * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
    for (let i = 0; i < 200; i++) {
      p.bichosDelAnfitrion.push(crearEnemigo('zombi', (20 + i) * TILE, 38 * TILE));
    }
    for (let t = 0; t < 20; t++) {
      p.anfitrion.avanzar(miCaja);
      p.cable.avanzar(p.alAnfitrion, p.alInvitado);
    }
    expect(p.invitado.bichos.length).toBeLessThanOrEqual(60);
    expect(p.invitado.bichos.length).toBeGreaterThan(0);
  });
});

/**
 * Lo que se vio al probarlo con dos navegadores de verdad.
 *
 * Tres cosas distintas, y las tres se veían en la misma pantalla: el invitado
 * salía dos veces, cada uno tenía su hora y los bichos solo perseguían a quien
 * hospedaba.
 */
describe('dos jugadores, un solo mundo', () => {
  it('saludar dos veces no mete a dos jugadores', async () => {
    const p = await montarPartida();
    expect(p.anfitrion.conectados).toHaveLength(1);
    const idPrimero = p.invitado.miId;

    // El invitado repite el saludo porque cree que no le han contestado: es
    // exactamente lo que hace el reintento cuando la bienvenida tarda.
    p.invitado.saludar();
    p.cable.vaciar(p.alAnfitrion, p.alInvitado);
    p.invitado.saludar();
    p.cable.vaciar(p.alAnfitrion, p.alInvitado);

    expect(p.anfitrion.conectados).toHaveLength(1);
    // Y le vuelven a dar el mismo número, no uno nuevo: sin esto, el invitado
    // se veía a sí mismo de pie a su lado.
    expect(p.invitado.miId).toBe(idPrimero);
  });

  it('la hora del mundo la pone el anfitrión', () => {
    let horaDelInvitado = -1;
    // Se monta otro invitado para poder escuchar la hora que llega.
    const oyente = new Invitado({
      enlace: { mandarVivo: () => {}, mandarFirme: () => {} },
      nombre: 'Oyente',
      idPartida: 'p1',
      ajustes: AJUSTES_POR_DEFECTO,
      alLlegarMundo: () => {},
      alCambiarTiles: () => {},
      alDarLaHora: (m) => {
        horaDelInvitado = m;
      },
    });
    oyente.recibir(
      escribirInstantanea({ tick: 1, tickConfirmado: 0, minutos: 934, entidades: [] }),
    );
    expect(horaDelInvitado).toBe(934);
  });

  it('los bichos persiguen al que tengan más cerca, sea quien sea', () => {
    const mundo = mundoDePruebas();
    const anfitrionCaja = crearCaja(10 * TILE, 36 * TILE, 26, 46);
    const invitadoCaja = crearCaja(40 * TILE, 36 * TILE, 26, 46);
    // El bicho, pegado al invitado y lejísimos del anfitrión.
    const bicho = crearEnemigo('zombi', 42 * TILE, 36 * TILE);
    const lista = [bicho];

    const antes = bicho.caja.x;
    for (let i = 0; i < 40; i++) {
      actualizarEnemigos(mundo, lista, anfitrionCaja, { invulnerable: 0 }, undefined, [
        { id: 2, caja: invitadoCaja, invulnerable: 0 },
      ]);
    }
    // Se mueve hacia el invitado (a su izquierda), no hacia el anfitrión, que
    // está treinta tiles más allá en la misma dirección: lo que se comprueba es
    // que no lo ignora, y para eso basta con que se le acerque.
    expect(Math.abs(bicho.caja.x - invitadoCaja.x)).toBeLessThan(Math.abs(antes - invitadoCaja.x) + 1);
    expect(bicho.caja.x).toBeGreaterThan(anfitrionCaja.x + 20 * TILE);
  });

  it('y le hacen daño al invitado, con su invulnerabilidad aparte', () => {
    const mundo = mundoDePruebas();
    const lejos = crearCaja(200 * TILE, 36 * TILE, 26, 46);
    const invitadoCaja = crearCaja(40 * TILE, 36 * TILE, 26, 46);
    const bicho = crearEnemigo('zombi', 40 * TILE, 36 * TILE);

    const golpea = (invulnerable: number) =>
      actualizarEnemigos(mundo, [bicho], lejos, { invulnerable: 60 }, undefined, [
        { id: 2, caja: invitadoCaja, invulnerable },
      ]).danoAAcompanantes;

    const cobrado = golpea(0);
    expect(cobrado).toHaveLength(1);
    expect(cobrado[0]!.id).toBe(2);
    expect(cobrado[0]!.dano).toBeGreaterThan(0);

    // Con invulnerabilidad puesta no se le cobra nada: si no, un zombi pegado
    // mandaría sesenta golpes por segundo por el cable.
    expect(golpea(30)).toHaveLength(0);
  });

  it('sin acompañantes, todo se comporta igual que antes', () => {
    const mundo = mundoDePruebas();
    const jugador = crearCaja(10 * TILE, 36 * TILE, 26, 46);
    const bicho = crearEnemigo('zombi', 12 * TILE, 36 * TILE);
    const r = actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 });
    expect(r.danoAAcompanantes).toEqual([]);
  });
});

/**
 * El invitado peleando.
 *
 * Lo que no podía hacer hasta 7.12.0: su espada atravesaba a los bichos sin
 * tocarlos, porque los que veía eran copias y los de verdad los tenía el
 * anfitrión.
 */
describe('el invitado pelea', () => {
  it('su mandoble lo resuelve el anfitrión, no él', () => {
    const resueltos: number[] = [];
    const mundo = mundoDePruebas();
    const anfitrion = new Anfitrion({
      mundo,
      ajustes: AJUSTES_POR_DEFECTO,
      idPartida: 'p1',
      spawnTx: 10,
      spawnTy: 38,
      bytesDelMundo: async () => new Uint8Array(0),
      alGolpear: (quien) => resueltos.push(quien),
    });
    const enlace: Enlace = { mandarVivo: () => {}, mandarFirme: () => {} };
    const quien = anfitrion.recibir(enlace, escribirHola('Inv', 'p1'), null);
    expect(quien).not.toBeNull();

    anfitrion.recibir(enlace, escribirGolpe(ESPADA_HIERRO, 1, 0), quien);
    // El arma barre durante unos ticks, igual que en local: se resuelve en cada
    // uno mientras dure, y la lista de tocados del propio golpe evita repetir.
    expect(resueltos).toEqual([]);
    anfitrion.avanzar(crearCaja(0, 0, 26, 46));
    expect(resueltos).toEqual([quien]);
  });

  /**
   * La cadencia se comprueba donde se decide, no donde se pulsa.
   *
   * Se cuentan los ticks barridos y no los clics: veinte clics seguidos tienen
   * que barrer exactamente lo mismo que uno, que es lo que dura un mandoble.
   */
  it('veinte clics seguidos barren lo mismo que uno', () => {
    const resueltos: number[] = [];
    const anfitrion = new Anfitrion({
      mundo: mundoDePruebas(),
      ajustes: AJUSTES_POR_DEFECTO,
      idPartida: 'p1',
      spawnTx: 10,
      spawnTy: 38,
      bytesDelMundo: async () => new Uint8Array(0),
      alGolpear: (quien) => resueltos.push(quien),
    });
    const enlace: Enlace = { mandarVivo: () => {}, mandarFirme: () => {} };
    const quien = anfitrion.recibir(enlace, escribirHola('Inv', 'p1'), null);
    const cadencia = defObjeto(ESPADA_HIERRO).cadencia!;

    for (let t = 0; t < cadencia; t++) {
      anfitrion.recibir(enlace, escribirGolpe(ESPADA_HIERRO, 1, 0), quien);
      anfitrion.avanzar(crearCaja(0, 0, 26, 46));
    }
    expect(resueltos).toHaveLength(TICKS_GOLPE);

    // Y pasada la cadencia, el siguiente sí sale.
    anfitrion.recibir(enlace, escribirGolpe(ESPADA_HIERRO, 1, 0), quien);
    anfitrion.avanzar(crearCaja(0, 0, 26, 46));
    expect(resueltos).toHaveLength(TICKS_GOLPE + 1);
  });

  it('un «arma» que no es un arma no da ningún golpe', () => {
    const resueltos: number[] = [];
    const anfitrion = new Anfitrion({
      mundo: mundoDePruebas(),
      ajustes: AJUSTES_POR_DEFECTO,
      idPartida: 'p1',
      spawnTx: 10,
      spawnTy: 38,
      bytesDelMundo: async () => new Uint8Array(0),
      alGolpear: (quien) => resueltos.push(quien),
    });
    const enlace: Enlace = { mandarVivo: () => {}, mandarFirme: () => {} };
    const quien = anfitrion.recibir(enlace, escribirHola('Inv', 'p1'), null);
    anfitrion.recibir(enlace, escribirGolpe(GEL, 1, 0), quien);
    anfitrion.recibir(enlace, escribirGolpe(0, 1, 0), quien);
    anfitrion.avanzar(crearCaja(0, 0, 26, 46));
    expect(resueltos).toEqual([]);
  });

  it('los objetos del suelo viajan con lo que son y cuántos hay', () => {
    let recibido: { objeto: number; cantidad: number } | null = null;
    const invitado = new Invitado({
      enlace: { mandarVivo: () => {}, mandarFirme: () => {} },
      nombre: 'Inv',
      idPartida: 'p1',
      ajustes: AJUSTES_POR_DEFECTO,
      alLlegarMundo: () => {},
      alCambiarTiles: () => {},
      alRecogerObjeto: (objeto, cantidad) => {
        recibido = { objeto, cantidad };
      },
    });

    invitado.recibir(
      escribirInstantanea({
        tick: 1,
        tickConfirmado: 0,
        minutos: 0,
        entidades: [
          {
            clase: ENT.OBJETO,
            id: 77,
            x: 100,
            y: 200,
            vx: 0,
            vy: 0,
            banderas: 0,
            vida: 9,
            sub: GEL,
            ticksCoyote: 0,
            ticksBuffer: 0,
            ticksSalto: 0,
            yInicioCaida: 0,
            vidaMax: 0,
          },
        ],
      }),
    );
    expect(invitado.objetos).toHaveLength(1);
    expect(invitado.objetos[0]!.objeto).toBe(GEL);
    expect(invitado.objetos[0]!.cantidad).toBe(9);
    expect(invitado.objetos[0]!.id).toBe(77);

    // Y lo que deja de venir es que alguien lo ha cogido.
    invitado.recibir(
      escribirInstantanea({ tick: 2, tickConfirmado: 0, minutos: 0, entidades: [] }),
    );
    expect(invitado.objetos).toHaveLength(0);

    invitado.recibir(escribirRecogido(GEL, 3));
    expect(recibido).toEqual({ objeto: GEL, cantidad: 3 });
  });

  /**
   * El identificador de un objeto no cabía en el byte del subtipo: hay más de
   * doscientos objetos y ese campo llegaba a 255. Por eso el protocolo 4 lo
   * ensancha, y esto lo vigila.
   */
  it('el subtipo aguanta el objeto más alto del catálogo', () => {
    const alto = Math.max(...IDS_OBJETO);
    expect(alto).toBeGreaterThan(255);
    const leida = leerMensaje(
      escribirInstantanea({
        tick: 1,
        tickConfirmado: 0,
        minutos: 0,
        entidades: [
          {
            clase: ENT.OBJETO, id: 1, x: 0, y: 0, vx: 0, vy: 0, banderas: 0,
            vida: 1, sub: alto, ticksCoyote: 0, ticksBuffer: 0, ticksSalto: 0,
            yInicioCaida: 0, vidaMax: 0,
          },
        ],
      }),
    ) as { instantanea: { entidades: { sub: number }[] } };
    expect(leida.instantanea.entidades[0]!.sub).toBe(alto);
  });
});

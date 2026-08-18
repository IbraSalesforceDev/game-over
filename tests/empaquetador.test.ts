import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { generarMundo } from '../src/world/gen/worldgen';
import {
  deserializar,
  empaquetar,
  serializar,
  desempaquetar,
  type CapasMundo,
  type EstadoPartida,
} from '../src/world/save';
import { empaquetarFuera, reiniciarEmpaquetador } from '../src/world/empaquetador';
import { VERSION_ACTUAL } from '../src/core/versiones';
import { Mundo } from '../src/world/world';
import { DIFICULTAD_POR_DEFECTO } from '../src/core/dificultad';

function estado(): EstadoPartida {
  return {
    semilla: 'worker',
    jugador: { x: 100, y: 100, spawnX: 100, spawnY: 100 },
    creado: 1_700_000_000_000,
    jugado: 0,
    material: 1,
    capaPared: false,
    minutos: 480,
    inventario: [],
    equipo: [],
    cofres: [],
    vida: 0,
    vidaMax: 0,
    hambre: 0,
    dificultad: DIFICULTAD_POR_DEFECTO,
    hardcore: false,
    hardcoreMuerto: false,
    estructuras: [],
    jefeVencido: false,
    versionJuego: VERSION_ACTUAL,
    mundoHondo: false,
    finalVencido: false,
  } as EstadoPartida;
}

/** Las cuatro capas sueltas, sin la clase alrededor: lo que cruza al worker. */
function soloCapas(mundo: Mundo): CapasMundo {
  return {
    ancho: mundo.ancho,
    alto: mundo.alto,
    tileId: new Uint16Array(mundo.tileId),
    wallId: new Uint16Array(mundo.wallId),
    flags: new Uint8Array(mundo.flags),
    liquido: new Uint8Array(mundo.liquido),
  };
}

describe('serializar sin la clase Mundo', () => {
  it('un objeto plano con las cuatro capas vale igual que un Mundo', () => {
    const { mundo } = generarMundo({ ancho: 200, alto: 120, semilla: 'PLANO' });
    // Si esto deja de compilar o de coincidir, el worker se queda sin poder
    // empaquetar: `postMessage` clona los datos y tira los métodos.
    expect(serializar(soloCapas(mundo), estado())).toEqual(serializar(mundo, estado()));
  });

  it('lo serializado desde capas sueltas se vuelve a leer entero', () => {
    const { mundo } = generarMundo({ ancho: 200, alto: 120, semilla: 'VUELTA' });
    mundo.setTile(50, 40, 0);
    mundo.setPared(50, 40, 3);
    const copia = deserializar(serializar(soloCapas(mundo), estado())).mundo;
    expect(copia.tileId).toEqual(mundo.tileId);
    expect(copia.wallId).toEqual(mundo.wallId);
  });
});

describe('empaquetarFuera', () => {
  beforeEach(() => reiniciarEmpaquetador());
  afterEach(() => {
    vi.unstubAllGlobals();
    reiniciarEmpaquetador();
  });

  it('sin workers empaqueta igual que empaquetar()', async () => {
    vi.stubGlobal('Worker', undefined);
    const { mundo } = generarMundo({ ancho: 200, alto: 120, semilla: 'SINWORKER' });
    const fuera = await empaquetarFuera(mundo, estado());
    expect(fuera).toEqual(await empaquetar(mundo, estado()));
  });

  it('lo que devuelve se puede abrir como una partida', async () => {
    vi.stubGlobal('Worker', undefined);
    const { mundo } = generarMundo({ ancho: 200, alto: 120, semilla: 'ABRIR' });
    mundo.setTile(30, 30, 0);
    const partida = await desempaquetar(await empaquetarFuera(mundo, estado()));
    expect(partida.mundo.tileId).toEqual(mundo.tileId);
    expect(partida.estado.semilla).toBe('worker');
  });

  /**
   * El fallo que este test existe para impedir.
   *
   * Al worker se le mandan los buffers transferidos, que es lo que evita una
   * segunda copia. Pero se transfieren *copias*: si alguien decidiera transferir
   * las capas del mundo de verdad para ahorrarse el `memcpy`, el mundo se
   * quedaría vacío a media partida y el jugador vería desaparecer el terreno
   * bajo sus pies cada treinta segundos. Silencioso y catastrófico.
   */
  it('el mundo que se está jugando sale intacto de guardar', async () => {
    const { mundo } = generarMundo({ ancho: 200, alto: 120, semilla: 'INTACTO' });
    const antes = {
      tileId: new Uint16Array(mundo.tileId),
      wallId: new Uint16Array(mundo.wallId),
      flags: new Uint8Array(mundo.flags),
      liquido: new Uint8Array(mundo.liquido),
    };
    await empaquetarFuera(mundo, estado());
    expect(mundo.tileId).toEqual(antes.tileId);
    expect(mundo.wallId).toEqual(antes.wallId);
    expect(mundo.flags).toEqual(antes.flags);
    expect(mundo.liquido).toEqual(antes.liquido);
    expect(mundo.tileId.length).toBeGreaterThan(0);
  });

  it('si el worker no se puede crear, se sigue guardando', async () => {
    vi.stubGlobal(
      'Worker',
      class {
        constructor() {
          throw new Error('aquí no hay workers');
        }
      },
    );
    const { mundo } = generarMundo({ ancho: 120, alto: 80, semilla: 'ROTO' });
    const bytes = await empaquetarFuera(mundo, estado());
    expect(bytes.length).toBeGreaterThan(8);
    // Y la siguiente vez ni lo intenta: se quedó apuntado que no hay workers.
    expect((await empaquetarFuera(mundo, estado())).length).toBe(bytes.length);
  });
});

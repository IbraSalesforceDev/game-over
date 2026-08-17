import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { generarMundo } from '../src/world/gen/worldgen';
import { crearJugador, actualizarJugador } from '../src/entities/player';
import { AJUSTES_POR_DEFECTO, solapaSolido, type Entrada } from '../src/entities/physics';
import { SimuladorLiquidos, sumersion } from '../src/world/liquids';
import {
  actualizarEnemigos,
  crearEnemigo,
  type Enemigo,
  type Especie,
  ENEMIGOS,
} from '../src/entities/enemies';
import { esSolido, versionTile } from '../src/world/tiles';
import { destinosPosibles, migrarPasos } from '../src/world/migracion';
import { VERSIONES, VERSION_ACTUAL, alMenos } from '../src/core/versiones';
import { DIFICULTAD_POR_DEFECTO } from '../src/core/dificultad';
import { serializar, deserializar, type EstadoPartida } from '../src/world/save';

/** Un generador determinista, para que un fallo se pueda repetir. */
function rng(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const OP = { ancho: 1200, alto: 700, semilla: 'GLITCH' };

/**
 * Caza de glitches.
 *
 * No prueban una regla concreta: ponen el juego a correr y comprueban que
 * nada se rompe. Veinte mil ticks de entrada errática es más de lo que nadie
 * juega seguido apretando teclas al azar, y es donde salen los fallos de
 * esquina que ninguna prueba dirigida encuentra.
 */
describe('el jugador y los bichos aguantan', () => {
  it('el jugador nunca se sale del mundo ni se mete en la roca', () => {
    const gen = generarMundo(OP);
    const { mundo } = gen;
    const j = crearJugador(gen.spawnTx, gen.spawnTy);
    const r = rng(7);
    const problemas: string[] = [];

    let dentroDeRoca = 0;
    for (let t = 0; t < 20000; t++) {
      // Entrada errática a propósito: es donde salen los fallos de esquina.
      const e: Entrada = {
        izq: r() < 0.35,
        der: r() < 0.35,
        abajo: r() < 0.1,
        salto: r() < 0.3,
        saltoPulsado: r() < 0.12,
      };
      const sum = sumersion(mundo, j.caja, TILE);
      actualizarJugador(mundo, j, e, AJUSTES_POR_DEFECTO, sum.fraccion);

      const c = j.caja;
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.vx) || !Number.isFinite(c.vy)) {
        problemas.push(`tick ${t}: NaN en la caja (${c.x},${c.y},${c.vx},${c.vy})`);
        break;
      }
      if (c.x < 0 || c.y < 0 || c.x > mundo.ancho * TILE || c.y > mundo.alto * TILE) {
        problemas.push(`tick ${t}: fuera del mundo en (${Math.round(c.x)},${Math.round(c.y)})`);
        break;
      }
      if (solapaSolido(mundo, c)) dentroDeRoca++;
    }
    expect(problemas).toEqual([]);
  });

  it('ninguna especie se rompe simulada mil ticks', () => {
    const gen = generarMundo(OP);
    const { mundo } = gen;
    const jugador = crearJugador(gen.spawnTx, gen.spawnTy).caja;
    const rotos: string[] = [];
    for (const especie of Object.keys(ENEMIGOS) as Especie[]) {
      const lista: Enemigo[] = [];
      for (let i = 0; i < 4; i++) {
        lista.push(crearEnemigo(especie, (gen.spawnTx + 3 + i * 2) * TILE, (gen.spawnTy - 3) * TILE, 1));
      }
      const salud = { invulnerable: 0 };
      for (let t = 0; t < 1000; t++) {
        actualizarEnemigos(mundo, lista, jugador, salud, 1e9);
        for (const e of lista) {
          const c = e.caja;
          if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || !Number.isFinite(c.vx) || !Number.isFinite(c.vy)) {
            rotos.push(`${especie}: NaN en el tick ${t}`);
            break;
          }
          if (c.y > mundo.alto * TILE + 200) {
            rotos.push(`${especie}: se cae del mundo en el tick ${t}`);
            break;
          }
        }
        if (rotos.length) break;
      }
    }
    expect(rotos).toEqual([]);
  });

  it('el líquido no se crea ni se destruye al simularlo', () => {
    const { mundo } = generarMundo(OP);
    const masa = (): number => {
      let s = 0;
      for (let i = 0; i < mundo.liquido.length; i++) s += mundo.liquido[i]!;
      return s;
    };
    const sim = new SimuladorLiquidos(mundo);
    sim.despertarTodo();
    const antes = masa();
    let pasos = 0;
    for (; pasos < 4000; pasos++) if (sim.paso() === 0) break;
    const despues = masa();
    // Se pierde algo por evaporación de restos, pero no puede crearse.
    expect(despues).toBeLessThanOrEqual(antes);
    expect(despues / antes).toBeGreaterThan(0.9);
    expect(sim.pendientes).toBe(0);
  });

  it('ningún líquido queda dentro de un bloque', () => {
    const { mundo } = generarMundo(OP);
    const sim = new SimuladorLiquidos(mundo);
    sim.despertarTodo();
    for (let i = 0; i < 4000 && sim.paso() > 0; i++);
    let dentro = 0;
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        if (mundo.getLiquido(tx, ty) > 0 && esSolido(mundo.getTile(tx, ty))) dentro++;
      }
    }
    expect(dentro).toBe(0);
  });

  it('el punto de aparición es firme y despejado', () => {
    for (const semilla of ['A', 'B', 'C', 'D', 'E', 'F']) {
      const gen = generarMundo({ ...OP, semilla });
      const { mundo, spawnTx, spawnTy } = gen;
      const j = crearJugador(spawnTx, spawnTy);
      expect(solapaSolido(mundo, j.caja)).toBe(false);
      // Y con suelo debajo a poca distancia: aparecer en caída libre sobre una
      // sima es aparecer muerto.
      let ty = spawnTy;
      while (ty < mundo.alto - 1 && !esSolido(mundo.getTile(spawnTx, ty))) ty++;
      expect(ty - spawnTy).toBeLessThan(12);
      // Ni con los pies en la lava.
      expect(mundo.esLava(spawnTx, ty - 1)).toBe(false);
    }
  });
});

describe('migrar entre versiones no rompe nada', () => {
  const TAM = { ancho: 260, alto: 200 };

  function estadoBase(v: string): EstadoPartida {
    return {
      semilla: 'MIG', jugador: { x: 100, y: 100, spawnX: 100, spawnY: 100 },
      creado: 0, jugado: 0, material: 0, capaPared: false, minutos: 600,
      inventario: [], equipo: [], cofres: [], vida: 100, vidaMax: 100, hambre: 100,
      dificultad: DIFICULTAD_POR_DEFECTO, hardcore: false, hardcoreMuerto: false,
      estructuras: [], jefeVencido: false, versionJuego: v, mundoHondo: false,
    };
  }

  it('subir y bajar desde y hasta la actual no rompe nada', () => {
    const fallos: string[] = [];
    // Solo los saltos que el juego llega a ofrecer: si `destinosPosibles` deja
    // una versión fuera es porque migrar hacia ella no significa nada, y
    // probarla sería probar una puerta que no existe.
    const pares: [string, string][] = [];
    for (const v of destinosPosibles(VERSION_ACTUAL)) pares.push([VERSION_ACTUAL, v.id]);
    for (const v of VERSIONES) {
      if (destinosPosibles(v.id).some((d) => d.id === VERSION_ACTUAL)) {
        pares.push([v.id, VERSION_ACTUAL]);
      }
    }
    {
      for (const [desde, hasta] of pares) {
        try {
          const { mundo } = generarMundo({ ...TAM, semilla: 'MIG', version: desde });
          const it = migrarPasos(mundo, estadoBase(desde), hasta, TAM);
          let paso = it.next();
          while (!paso.done) paso = it.next();
          const r = paso.value;
          if (r.estado.versionJuego !== hasta) fallos.push(`${desde}→${hasta}: no quedó marcado`);
          if (r.mundo.tileId.length !== TAM.ancho * TAM.alto) fallos.push(`${desde}→${hasta}: tamaño roto`);
          // Ningún tile del mundo resultante puede ser de una versión posterior
          // a la de destino: eso sería colar contenido del futuro.
          for (let i = 0; i < r.mundo.tileId.length; i++) {
            const id = r.mundo.tileId[i]!;
            if (id !== 0 && !alMenos(hasta, versionTile(id))) {
              fallos.push(`${desde}→${hasta}: quedó el tile #${id} de ${versionTile(id)}`);
              break;
            }
          }
        } catch (e) {
          fallos.push(`${desde}→${hasta}: ${String(e)}`);
        }
      }
    }
    expect(fallos).toEqual([]);
  });

  it('guardar y abrir un mundo de verdad lo devuelve igual', () => {
    const gen = generarMundo({ ancho: 400, alto: 300, semilla: 'SAVE' });
    const e = estadoBase(VERSION_ACTUAL);
    e.mundoHondo = true;
    e.cofres = gen.cofres.map((c) => ({ tx: c.tx, ty: c.ty, ranuras: c.ranuras }));
    e.estructuras = gen.estructuras.map((s) => ({ tipo: s.tipo, tx: s.tx, ty: s.ty }));
    const bytes = serializar(gen.mundo, e);
    const { mundo, estado } = deserializar(bytes);
    let distintos = 0;
    for (let i = 0; i < mundo.tileId.length; i++) {
      if (mundo.tileId[i] !== gen.mundo.tileId[i]) distintos++;
      if (mundo.liquido[i] !== gen.mundo.liquido[i]) distintos++;
    }
    expect(distintos).toBe(0);
    expect(estado.mundoHondo).toBe(true);
    expect(estado.cofres.length).toBe(e.cofres.length);
  });
});

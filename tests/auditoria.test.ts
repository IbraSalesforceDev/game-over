import { describe, expect, it } from 'vitest';
import {
  BAYAS,
  CUBO_AGUA,
  CUBO_LAVA,
  defObjeto,
  dropDeTile,
  esArco,
  esColocable,
  esMunicion,
  ESENCIA,
  ESPADA_GUARDIAN,
  FLECHAS,
  IDS_OBJETO,
  NADA,
  objetoExisteEn,
  PEDERNAL,
  PLUMA,
  RELIQUIA,
  SEMILLAS,
  SEMILLAS_ZANAHORIA,
  TRIGO,
  versionObjeto,
} from '../src/items/items';
import {
  craftear,
  estacionDisponible,
  estacionesCerca,
  existeEn,
  RECETAS,
  sePuedeCraftear,
  tieneIngredientes,
} from '../src/items/recipes';
import { Inventario } from '../src/items/inventory';
import { Mundo } from '../src/world/world';
import { crearCaja } from '../src/entities/physics';
import { TILE } from '../src/core/constants';
import { ENEMIGOS } from '../src/entities/enemies';
import { ARENA, BARRO, MADERA, MESA, TIERRA, TILES, TRONCO, versionTile } from '../src/world/tiles';
import { alMenos, hay, VERSION_ACTUAL, VERSIONES } from '../src/core/versiones';
import { generarMundo } from '../src/world/gen/worldgen';
import { destinosPosibles } from '../src/world/migracion';

/**
 * Auditoría del catálogo.
 *
 * Estos tests no prueban una función: recorren todo lo que hay y comprueban que
 * encaja entre sí. Son los que cazan la clase de fallo que nadie mira —un
 * objeto que se puede colocar pero no conseguir, una receta que pide algo que
 * en su versión no existía, un bicho que suelta un lingote de un metal que
 * todavía no se había inventado— porque cada pieza por separado está bien y lo
 * que falla es la relación entre dos.
 *
 * Lo que encontraron la primera vez: nueve bloques de adorno sin ninguna forma
 * de obtenerlos, y abedules y pinos plantados en mundos de 2.1.0, dos
 * versiones antes de que esos árboles existieran.
 */

const nombre = (id: number): string => `${defObjeto(id).nombre} (#${id})`;

/** Lo que no sale de una receta, de picar ni de un bicho, con su mecánica. */
const OTRAS_FUENTES = new Set<number>([
  CUBO_AGUA,
  CUBO_LAVA,
  BAYAS,
  SEMILLAS,
  SEMILLAS_ZANAHORIA,
  PEDERNAL,
  PLUMA,
  RELIQUIA,
  ESPADA_GUARDIAN,
  ESENCIA,
  TRIGO,
]);

describe('todo objeto se puede conseguir', () => {
  it('de una receta, de picar, de un bicho o de su propia mecánica', () => {
    const porReceta = new Set(RECETAS.map((r) => r.resultado));
    const porTile = new Set<number>();
    // TILES va indexado por id y con huecos: se recorre por índice. Y cada uno
    // se pregunta muchas veces, porque algunos sueltan al azar —la grava da
    // pedernal una de cada cuatro— y con una sola tirada la mitad de las veces
    // parecería que el otro resultado no existe.
    for (let id = 0; id < TILES.length; id++) {
      if (!TILES[id]) continue;
      for (let intento = 0; intento < 200; intento++) {
        const d = dropDeTile(id);
        if (d !== NADA) porTile.add(d);
      }
    }
    const porBicho = new Set<number>();
    for (const e of Object.values(ENEMIGOS)) {
      porBicho.add(e.botin);
      if (e.botinRaro !== undefined) porBicho.add(e.botinRaro);
    }

    const huerfanos = IDS_OBJETO.filter(
      (id) =>
        id !== NADA &&
        !porReceta.has(id) &&
        !porTile.has(id) &&
        !porBicho.has(id) &&
        !OTRAS_FUENTES.has(id),
    ).map(nombre);
    expect(huerfanos).toEqual([]);
  });

  it('y todo lo colocable coloca un tile que existe', () => {
    const rotos = IDS_OBJETO.filter((id) => {
      if (id === NADA || !esColocable(id)) return false;
      // El tile no lleva el número del objeto: el vidrio es el objeto 110 y el
      // bloque 33.
      return !TILES[defObjeto(id).tile!];
    }).map(nombre);
    expect(rotos).toEqual([]);
  });
});

describe('nada llega antes de tiempo', () => {
  it('ninguna receta pide ni produce algo del futuro', () => {
    const malas: string[] = [];
    for (const r of RECETAS) {
      const v = r.desde ?? VERSIONES[0]!.id;
      for (const [ing] of r.ingredientes) {
        if (!objetoExisteEn(ing, v)) {
          malas.push(`${r.id} (${v}) pide ${nombre(ing)}, de ${versionObjeto(ing)}`);
        }
      }
      if (!objetoExisteEn(r.resultado, v)) {
        malas.push(`${r.id} (${v}) da ${nombre(r.resultado)}, de ${versionObjeto(r.resultado)}`);
      }
      if (r.estacion !== null && !alMenos(v, versionTile(r.estacion))) {
        malas.push(`${r.id} (${v}) pide una estación de ${versionTile(r.estacion)}`);
      }
    }
    expect(malas).toEqual([]);
  });

  it('ningún bicho suelta algo que aún no se había inventado', () => {
    const malas: string[] = [];
    for (const [especie, d] of Object.entries(ENEMIGOS)) {
      for (const id of [d.botin, d.botinRaro]) {
        if (id === undefined) continue;
        if (!objetoExisteEn(id, d.desde)) {
          malas.push(`${especie} (${d.desde}) suelta ${nombre(id)}, de ${versionObjeto(id)}`);
        }
      }
    }
    expect(malas).toEqual([]);
  });

  it('el mundo generado no contiene un solo bloque posterior a su versión', () => {
    // El que cazó los abedules y los pinos: la nieve existe desde 2.1.0 y esos
    // dos árboles desde 3.1.0, así que un mundo de 2.1.0 salía con dos bloques
    // que en esa versión no existían.
    const malas: string[] = [];
    for (const v of VERSIONES) {
      // Antes de 1.3.0 no había generación: el juego daba el escenario de
      // pruebas, y llamar al generador con esas versiones no representa nada.
      if (!hay('mundoGenerado', v.id)) continue;
      const { mundo } = generarMundo({ ancho: 260, alto: 200, semilla: 'AUDIT', version: v.id });
      const vistos = new Set<number>();
      for (let i = 0; i < mundo.tileId.length; i++) {
        const id = mundo.tileId[i]!;
        if (id === 0 || vistos.has(id)) continue;
        vistos.add(id);
        if (!alMenos(v.id, versionTile(id))) {
          malas.push(`${v.id}: ${TILES[id]?.nombre ?? id} (#${id}), de ${versionTile(id)}`);
        }
      }
    }
    expect(malas).toEqual([]);
  });
});

describe('el catálogo es coherente consigo mismo', () => {
  it('no hay identificadores repetidos', () => {
    const ids = RECETAS.map((r) => r.id);
    expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
    expect(new Set(IDS_OBJETO).size).toBe(IDS_OBJETO.length);
  });

  it('toda munición sirve para algún arco', () => {
    const sueltas = IDS_OBJETO.filter((i) => esMunicion(i) && !FLECHAS.includes(i));
    expect(sueltas.map(nombre)).toEqual([]);
    expect(IDS_OBJETO.filter((i) => esArco(i)).length).toBeGreaterThan(0);
  });

  it('todo objeto declara una versión real y existe en la actual', () => {
    const ids = new Set(VERSIONES.map((v) => v.id));
    for (const id of IDS_OBJETO) {
      if (id === NADA) continue;
      expect(ids.has(versionObjeto(id))).toBe(true);
      expect(objetoExisteEn(id, VERSION_ACTUAL)).toBe(true);
    }
  });

  it('todo destino de migración que se ofrece tuvo un mundo', () => {
    // Migrar un mundo a una versión que no generaba ninguno no significa nada,
    // y lo que hacía era darle terreno con vetas de mineral y árboles: justo el
    // contenido que esa versión no tenía.
    for (const v of VERSIONES) {
      for (const d of destinosPosibles(v.id)) {
        expect(hay('mundoGenerado', d.id)).toBe(true);
        expect(d.id).not.toBe(v.id);
      }
    }
  });
});

describe('los bloques de adorno se fabrican de verdad', () => {
  /**
   * No basta con que la receta exista en la tabla: tiene que aparecer en el
   * panel junto a una mesa y tiene que poder pagarse. Es el paso que separa
   * "está en el catálogo" de "el jugador puede tenerlo", que es justo lo que
   * fallaba con estos nueve bloques.
   */
  it('con una mesa al lado y madera en el zurrón salen los nueve', () => {
    const mundo = new Mundo(40, 30);
    mundo.rellenar(0, 20, 39, 29, TIERRA);
    // La mesa pegada a los pies del jugador.
    mundo.setTile(21, 19, MESA);
    const caja = crearCaja(20 * TILE, 18 * TILE, 26, 46);

    const inv = new Inventario(40);
    inv.anadir(MADERA, 60);
    inv.anadir(ARENA, 10);
    inv.anadir(TIERRA, 10);
    inv.anadir(BARRO, 10);
    inv.anadir(SEMILLAS, 10);

    const estaciones = estacionesCerca(mundo, caja);
    expect(estaciones.has(MESA)).toBe(true);

    const adorno = [
      'troncos', 'hojas', 'cactus-bloque', 'troncos-abedul', 'troncos-selva',
      'hojas-pino', 'hojas-selva', 'hierba-bloque', 'hierba-selva',
    ];
    const noSalen: string[] = [];
    for (const id of adorno) {
      const r = RECETAS.find((x) => x.id === id);
      if (!r) {
        noSalen.push(`${id}: no existe`);
        continue;
      }
      if (!sePuedeCraftear(inv, r, estaciones, VERSION_ACTUAL)) {
        noSalen.push(
          `${id}: ingredientes=${tieneIngredientes(inv, r)} ` +
            `estación=${estacionDisponible(r, estaciones)} versión=${existeEn(r, VERSION_ACTUAL)}`,
        );
      }
    }
    expect(noSalen).toEqual([]);
  });

  it('y fabricarlos deja el bloque en el zurrón', () => {
    const inv = new Inventario(40);
    inv.anadir(MADERA, 20);
    const receta = RECETAS.find((r) => r.id === 'troncos')!;
    expect(craftear(inv, receta, new Set([MESA]))).toBe(true);
    expect(inv.contar(TRONCO)).toBe(receta.cantidad);
    expect(inv.contar(MADERA)).toBe(18);
  });
});

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
  versionDeclarada,
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
import {
  AIRE,
  ALTAR,
  ARENA,
  ARENISCA,
  BARRO,
  CARBON,
  COFRE,
  GRAVA,
  HIELO,
  INFERNITA,
  LADRILLO,
  LADRILLO_INFERNAL,
  LIANA,
  MADERA,
  MESA,
  PIEDRA,
  PINCHOS,
  BLOQUE_COBRE,
  BLOQUE_INFERNITA,
  BATERIA,
  BOMBILLA_ENCENDIDA,
  CABLE,
  INTERRUPTOR_ENCENDIDO,
  ROCA_INFERNAL,
  TIERRA,
  TILES,
  TRONCO,
  versionTile,
} from '../src/world/tiles';
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

  it('y la declara a propósito, no por omisión', () => {
    // `versionObjeto` devuelve 1.6.0 para lo que no encuentra en la tabla, que
    // es lo correcto para el catálogo original y convierte un olvido en un
    // objeto del futuro disponible en el primer mundo del juego. El ladrillo
    // infernal y los pinchos estuvieron así dos versiones enteras, y el test de
    // arriba no lo veía porque 1.6.0 es una versión perfectamente real.
    const sinDeclarar = IDS_OBJETO.filter((id) => id !== NADA && versionDeclarada(id) === null);
    expect(sinDeclarar.map(nombre)).toEqual([]);
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

describe('los cofres no guardan cosas del futuro', () => {
  /**
   * Un agujero que la auditoría de tiles no veía.
   *
   * El botín de un cofre no pasa por el filtro de versión al abrirlo: se
   * adopta tal cual del guardado. Así que ampliar las tablas de botín en 6.3.0
   * —lingotes de cobalto en la fortaleza, flechas de hueso en la cueva helada—
   * metió objetos de 5.0.0 y 5.4.0 en cofres que abre igual un mundo de 4.0.0.
   * Se filtra al generar, que es el único momento en que se sabe la versión.
   */
  it('en ninguna versión', () => {
    const malas: string[] = [];
    // Solo las que tienen estructuras: antes de 4.0.0 no hay cofres que mirar.
    for (const v of VERSIONES) {
      if (!hay('estructuras', v.id)) continue;
      const { cofres } = generarMundo({ ancho: 700, alto: 500, semilla: 'COFRES', version: v.id });
      for (const c of cofres) {
        for (const [objeto] of c.ranuras) {
          if (!objetoExisteEn(objeto, v.id)) {
            malas.push(`${v.id}: ${nombre(objeto)}, de ${versionObjeto(objeto)}`);
          }
        }
      }
    }
    expect([...new Set(malas)]).toEqual([]);
  });

  it('y ningún cofre sale vacío por haberlo filtrado', () => {
    // Filtrando después de sortear, un cofre de un mundo viejo podía quedarse
    // sin nada porque los dos premios que le tocaron eran de más adelante.
    for (const v of ['4.0.0', '5.0.0', '5.4.0', VERSION_ACTUAL]) {
      const { cofres } = generarMundo({ ancho: 700, alto: 500, semilla: 'COFRES', version: v });
      expect(cofres.length).toBeGreaterThan(0);
      for (const c of cofres) expect(c.ranuras.length).toBeGreaterThan(0);
    }
  });
});

describe('la tabla de tiles está en su sitio', () => {
  /**
   * La invariante que faltaba, y que costó un bug de verdad.
   *
   * `TILES` es un vector posicional: el tile número 51 es el que está en la
   * posición 51, y las constantes exportadas —`LIANA = 51`— son la otra mitad
   * del acuerdo. Al añadir dos tiles en 6.2.0 y 6.3.0 se insertaron sus
   * definiciones donde caía bien de leer, no donde tocaba, y todo lo posterior
   * se desplazó: la liana pasó a tener las propiedades del ladrillo infernal y
   * el ladrillo infernal las de los pinchos, o sea que las paredes de la
   * fortaleza del inframundo dejaban pasar y hacían veintidós de daño.
   *
   * Ninguna prueba lo vio porque los ids que escribe el generador y los que lee
   * el render son los mismos: lo que estaba mal era lo que la tabla decía de
   * ellos. Este test compara nombre a nombre.
   */
  it('cada constante apunta al tile que dice su nombre', () => {
    const esperado: [number, string][] = [
      [AIRE, 'aire'],
      [TIERRA, 'tierra'],
      [PIEDRA, 'piedra'],
      [MADERA, 'madera'],
      [COFRE, 'cofre'],
      [ARENISCA, 'arenisca'],
      [HIELO, 'hielo'],
      [GRAVA, 'grava'],
      [LADRILLO, 'ladrillo de fortaleza'],
      [ALTAR, 'altar antiguo'],
      [CARBON, 'carbón'],
      [INFERNITA, 'infernita'],
      [ROCA_INFERNAL, 'roca infernal'],
      [LIANA, 'liana'],
      [LADRILLO_INFERNAL, 'ladrillo infernal'],
      [PINCHOS, 'pinchos'],
      [BLOQUE_COBRE, 'bloque de cobre'],
      [BLOQUE_INFERNITA, 'bloque de infernita'],
      [CABLE, 'cable de cobre'],
      [BOMBILLA_ENCENDIDA, 'bombilla encendida'],
      [BATERIA, 'batería improvisada'],
      [INTERRUPTOR_ENCENDIDO, 'interruptor encendido'],
    ];
    for (const [id, nom] of esperado) {
      expect(`${id}=${TILES[id]?.nombre}`).toBe(`${id}=${nom}`);
    }
  });

  it('no hay huecos ni sobrantes al final de la tabla', () => {
    // Un hueco significa que alguien añadió una constante sin su definición, o
    // al revés. Las dos cosas se leen como "el tile existe" hasta que alguien
    // lo coloca y no pasa nada.
    expect(TILES[INTERRUPTOR_ENCENDIDO]).toBeDefined();
    expect(TILES.length).toBe(INTERRUPTOR_ENCENDIDO + 1);
    for (let id = 0; id < TILES.length; id++) {
      expect(TILES[id], `falta el tile #${id}`).toBeDefined();
    }
  });
});

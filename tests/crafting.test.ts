import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import { Inventario } from '../src/items/inventory';
import {
  defObjeto,
  IDS_OBJETO,
  LINGOTE_HIERRO,
  migrarId,
  PICO_COBRE,
  PICO_HIERRO,
  PICO_MADERA,
} from '../src/items/items';
import {
  craftear,
  estacionesCerca,
  RADIO_ESTACION,
  RECETAS,
  recetasVisibles,
  sePuedeCraftear,
  tieneIngredientes,
} from '../src/items/recipes';
import { Contenedores, RANURAS_COFRE } from '../src/world/contenedores';
import { ANTORCHA, COBRE, HIERRO, HORNO, MADERA, MESA, PIEDRA, YUNQUE } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SIN_ESTACION: ReadonlySet<number> = new Set();

function receta(id: string) {
  const r = RECETAS.find((x) => x.id === id);
  if (!r) throw new Error(`No existe la receta ${id}`);
  return r;
}

describe('catálogo de recetas', () => {
  it('todas producen algo que existe y cuestan algo', () => {
    for (const r of RECETAS) {
      expect(defObjeto(r.resultado).nombre).not.toBe('nada');
      expect(r.ingredientes.length).toBeGreaterThan(0);
      expect(r.cantidad).toBeGreaterThan(0);
      for (const [objeto, n] of r.ingredientes) {
        expect(IDS_OBJETO).toContain(objeto);
        expect(n).toBeGreaterThan(0);
      }
    }
  });

  it('los identificadores son únicos', () => {
    expect(new Set(RECETAS.map((r) => r.id)).size).toBe(RECETAS.length);
  });

  it('hay un camino de arranque que no necesita estación', () => {
    const aMano = RECETAS.filter((r) => r.estacion === null);
    expect(aMano.map((r) => r.resultado)).toContain(MESA);
    expect(aMano.map((r) => r.resultado)).toContain(ANTORCHA);
  });
});

describe('recetas visibles', () => {
  it('sin estación solo se ven las de mano', () => {
    const visibles = recetasVisibles(SIN_ESTACION);
    expect(visibles.every((r) => r.estacion === null)).toBe(true);
    expect(visibles.length).toBeGreaterThan(0);
  });

  it('con mesa aparecen las suyas', () => {
    const conMesa = recetasVisibles(new Set([MESA]));
    expect(conMesa.map((r) => r.id)).toContain('horno');
    expect(conMesa.map((r) => r.id)).not.toContain('lingote-cobre');
  });

  it('dos estaciones juntas habilitan las recetas de ambas', () => {
    const ids = recetasVisibles(new Set([MESA, HORNO])).map((r) => r.id);
    expect(ids).toContain('horno');
    expect(ids).toContain('lingote-cobre');
  });
});

describe('fabricar', () => {
  it('consume los ingredientes y entrega el resultado', () => {
    const inv = new Inventario();
    inv.anadir(MADERA, 10);
    expect(craftear(inv, receta('mesa'), SIN_ESTACION)).toBe(true);
    expect(inv.contar(MADERA)).toBe(0);
    expect(inv.contar(MESA)).toBe(1);
  });

  it('respeta la cantidad producida', () => {
    const inv = new Inventario();
    inv.anadir(MADERA, 1);
    craftear(inv, receta('antorchas'), SIN_ESTACION);
    expect(inv.contar(ANTORCHA)).toBe(3);
  });

  it('no fabrica sin ingredientes suficientes', () => {
    const inv = new Inventario();
    inv.anadir(MADERA, 9);
    expect(craftear(inv, receta('mesa'), SIN_ESTACION)).toBe(false);
    expect(inv.contar(MADERA)).toBe(9);
    expect(inv.contar(MESA)).toBe(0);
  });

  it('no fabrica sin la estación necesaria', () => {
    const inv = new Inventario();
    inv.anadir(COBRE, 30);
    expect(craftear(inv, receta('lingote-cobre'), SIN_ESTACION)).toBe(false);
    expect(craftear(inv, receta('lingote-cobre'), new Set([HORNO]))).toBe(true);
    expect(inv.contar(COBRE)).toBe(27);
  });

  it('gasta de varias ranuras si el material está repartido', () => {
    const inv = new Inventario();
    // Repartir la madera a mano en tres ranuras distintas.
    for (const i of [0, 5, 9]) {
      inv.ranuras[i]!.objeto = MADERA;
      inv.ranuras[i]!.cantidad = 4;
    }
    expect(craftear(inv, receta('mesa'), SIN_ESTACION)).toBe(true);
    expect(inv.contar(MADERA)).toBe(2);
  });

  it('la cadena completa lleva de mineral a pico', () => {
    const inv = new Inventario();
    inv.anadir(MADERA, 20);
    inv.anadir(HIERRO, 36);
    inv.anadir(PIEDRA, 20);

    expect(craftear(inv, receta('mesa'), SIN_ESTACION)).toBe(true);
    const conMesa = new Set([MESA]);
    expect(craftear(inv, receta('horno'), conMesa)).toBe(true);

    const conHorno = new Set([MESA, HORNO]);
    for (let i = 0; i < 12; i++) {
      expect(craftear(inv, receta('lingote-hierro'), conHorno)).toBe(true);
    }
    expect(inv.contar(LINGOTE_HIERRO)).toBe(12);

    expect(craftear(inv, receta('yunque'), conHorno)).toBe(true);
    expect(inv.contar(LINGOTE_HIERRO)).toBe(7);

    // Ya no queda hierro suficiente para el pico: hay que volver a la mina.
    const conYunque = new Set([MESA, HORNO, YUNQUE]);
    expect(sePuedeCraftear(inv, receta('pico-hierro'), conYunque)).toBe(false);
    inv.anadir(LINGOTE_HIERRO, 5);
    expect(craftear(inv, receta('pico-hierro'), conYunque)).toBe(true);
    expect(inv.contar(PICO_HIERRO)).toBe(1);
  });

  it('tieneIngredientes no modifica el inventario', () => {
    const inv = new Inventario();
    inv.anadir(MADERA, 10);
    expect(tieneIngredientes(inv, receta('mesa'))).toBe(true);
    expect(inv.contar(MADERA)).toBe(10);
  });
});

describe('estaciones cercanas', () => {
  function jugadorEn(tx: number, ty: number): Caja {
    return crearCaja(tx * TILE, ty * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
  }

  it('detecta una mesa al lado', () => {
    const m = new Mundo(60, 40);
    m.setTile(11, 20, MESA);
    expect(estacionesCerca(m, jugadorEn(10, 20)).has(MESA)).toBe(true);
  });

  it('no detecta una mesa lejana', () => {
    const m = new Mundo(60, 40);
    m.setTile(10 + RADIO_ESTACION + 4, 20, MESA);
    expect(estacionesCerca(m, jugadorEn(10, 20)).size).toBe(0);
  });

  it('devuelve todas las que haya cerca', () => {
    const m = new Mundo(60, 40);
    m.setTile(11, 20, MESA);
    m.setTile(12, 20, HORNO);
    m.setTile(13, 20, YUNQUE);
    const cerca = estacionesCerca(m, jugadorEn(10, 20));
    expect(cerca.size).toBe(3);
  });

  it('un bloque normal no es estación', () => {
    const m = new Mundo(60, 40);
    m.setTile(11, 20, PIEDRA);
    expect(estacionesCerca(m, jugadorEn(10, 20)).size).toBe(0);
  });
});

describe('cofres', () => {
  it('crea el inventario al abrirlo por primera vez', () => {
    const c = new Contenedores(100);
    expect(c.mirar(5, 5)).toBeUndefined();
    const inv = c.obtener(5, 5);
    expect(inv.ranuras).toHaveLength(RANURAS_COFRE);
    expect(c.mirar(5, 5)).toBe(inv);
  });

  it('cada cofre guarda lo suyo', () => {
    const c = new Contenedores(100);
    c.obtener(5, 5).anadir(PIEDRA, 10);
    c.obtener(9, 9).anadir(MADERA, 4);
    expect(c.obtener(5, 5).contar(PIEDRA)).toBe(10);
    expect(c.obtener(9, 9).contar(PIEDRA)).toBe(0);
  });

  it('sabe si está vacío', () => {
    const c = new Contenedores(100);
    expect(c.vacio(5, 5)).toBe(true);
    c.obtener(5, 5).anadir(PIEDRA, 1);
    expect(c.vacio(5, 5)).toBe(false);
    c.obtener(5, 5).sacarDe(0, 1);
    expect(c.vacio(5, 5)).toBe(true);
  });

  it('limpiar descarta los que se quedaron vacíos', () => {
    const c = new Contenedores(100);
    c.obtener(1, 1);
    c.obtener(2, 2).anadir(PIEDRA, 3);
    c.limpiar();
    expect(c.cuantos).toBe(1);
  });

  it('sobrevive a la ida y vuelta del guardado', () => {
    const c = new Contenedores(100);
    c.obtener(7, 3).anadir(PIEDRA, 25);
    c.obtener(40, 12).anadir(MADERA, 8);

    const copia = Contenedores.desdeDatos(100, c.aDatos());
    expect(copia.obtener(7, 3).contar(PIEDRA)).toBe(25);
    expect(copia.obtener(40, 12).contar(MADERA)).toBe(8);
    expect(copia.mirar(0, 0)).toBeUndefined();
  });

  it('las coordenadas no se cruzan al serializar', () => {
    const c = new Contenedores(1400);
    c.obtener(1399, 448).anadir(PIEDRA, 1);
    const datos = c.aDatos();
    expect(datos[0]!.tx).toBe(1399);
    expect(datos[0]!.ty).toBe(448);
  });
});

describe('migración de identificadores', () => {
  it('los picos del formato 3 se traducen a sus ids nuevos', () => {
    expect(migrarId(13)).toBe(PICO_MADERA);
    expect(migrarId(14)).toBe(PICO_COBRE);
    expect(migrarId(15)).toBe(PICO_HIERRO);
  });

  it('los ids que no cambiaron se dejan tal cual', () => {
    expect(migrarId(PIEDRA)).toBe(PIEDRA);
    expect(migrarId(MADERA)).toBe(MADERA);
    expect(migrarId(PICO_HIERRO)).toBe(PICO_HIERRO);
  });

  it('las herramientas viven fuera del rango de los tiles', () => {
    // Es lo que impide que añadir un mueble desplace los picos guardados.
    expect(PICO_MADERA).toBeGreaterThan(YUNQUE);
    expect(PICO_MADERA).toBeGreaterThanOrEqual(64);
  });
});

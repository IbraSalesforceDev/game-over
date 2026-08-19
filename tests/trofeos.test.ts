import { describe, expect, it } from 'vitest';
import { ALIENTO_MAXIMO, crearAliento, tickAliento } from '../src/entities/aliento';
import { crearCaja } from '../src/entities/physics';
import { crearSalud } from '../src/entities/salud';
import {
  aplicarEfecto,
  crearEfectos,
  EFECTOS,
  multiplicadorAire,
  multiplicadorMinado,
} from '../src/entities/efectos';
import {
  defObjeto,
  esColocable,
  esPocion,
  objetoExisteEn,
  POCION_AGALLAS,
  POCION_BRIO,
  versionDeclarada,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { COLOR_PLACA, defTile, MESA, PLACAS, TILES } from '../src/world/tiles';
import { CLASES_JEFE, JEFES } from '../src/world/jefes';

describe('las placas de trofeo', () => {
  it('son seis, una por jefe', () => {
    expect(PLACAS).toHaveLength(CLASES_JEFE.length);
    expect(new Set(PLACAS).size).toBe(6);
    expect(COLOR_PLACA).toHaveLength(6);
  });

  it('son adorno: no frenan el paso y alumbran un poco', () => {
    for (const p of PLACAS) {
      const d = defTile(p);
      expect(d.solido, d.nombre).toBe(false);
      expect(d.plataforma, d.nombre).toBe(false);
      expect(d.luz ?? 0, d.nombre).toBeGreaterThan(0);
      // Y se pican deprisa: una placa mal puesta no puede costar un minuto.
      expect(d.dureza, d.nombre).toBeLessThan(defTile(MESA).dureza);
    }
  });

  it('se colocan y se recuperan como cualquier bloque', () => {
    for (const p of PLACAS) {
      expect(esColocable(p), defObjeto(p).nombre).toBe(true);
      expect(defObjeto(p).tile, defObjeto(p).nombre).toBe(p);
    }
  });

  it('cada una cuesta el trofeo de su jefe, y solo uno', () => {
    CLASES_JEFE.forEach((clase, i) => {
      const r = RECETAS.find((x) => x.resultado === PLACAS[i]);
      expect(r, clase).toBeDefined();
      expect(r!.desde, clase).toBe('7.3.0');
      // En la mesa y no en el yunque: lo caro ya fue matar al jefe.
      expect(r!.estacion, clase).toBe(MESA);
      const trofeo = r!.ingredientes.find(([o]) => o === JEFES[clase].trofeo);
      expect(trofeo, clase).toBeDefined();
      expect(trofeo![1], clase).toBe(1);
    });
  });

  it('sus nombres están bien escritos y no se repiten', () => {
    const nombres = PLACAS.map((p) => defTile(p).nombre);
    expect(new Set(nombres).size).toBe(6);
    for (const n of nombres) expect(n).toMatch(/^placa de[l ]/);
  });

  it('no existen antes de 7.3.0', () => {
    for (const p of PLACAS) {
      expect(objetoExisteEn(p, '7.2.1'), defObjeto(p).nombre).toBe(false);
      expect(objetoExisteEn(p, '7.3.0'), defObjeto(p).nombre).toBe(true);
    }
  });

  /**
   * Las seis van seguidas y sin huecos. Comprobar que la tabla *acaba* en ellas
   * era comprobar de paso que nadie había añadido un tile detrás, y eso duró
   * hasta 7.11.0, que añadió el altar de bioma. Lo que de verdad importaba —que
   * las seis placas existan y estén juntas— sigue comprobado aquí.
   */
  it('las seis van seguidas en la tabla', () => {
    for (const [i, p] of PLACAS.entries()) {
      expect(TILES[p], `placa #${i}`).toBeDefined();
      if (i > 0) expect(p).toBe(PLACAS[i - 1]! + 1);
    }
  });
});

describe('las dos pociones de oficio', () => {
  const DOS = [POCION_AGALLAS, POCION_BRIO];

  it('son pociones y ponen un efecto que existe', () => {
    for (const id of DOS) {
      expect(esPocion(id)).toBe(true);
      const e = defObjeto(id).efecto;
      expect(e, defObjeto(id).nombre).toBeDefined();
      expect(EFECTOS[e!]).toBeDefined();
      expect(defObjeto(id).duracion ?? 0).toBeGreaterThan(0);
    }
  });

  it('se declaran de 7.3.0 y se preparan en el caldero', () => {
    for (const id of DOS) {
      expect(versionDeclarada(id)).toBe('7.3.0');
      const r = RECETAS.find((x) => x.resultado === id);
      expect(r, `${id}`).toBeDefined();
      expect(r!.desde).toBe('7.3.0');
    }
  });

  it('las agallas alargan el aire y no lo contrario', () => {
    const ef = crearEfectos();
    expect(multiplicadorAire(ef)).toBe(1);
    aplicarEfecto(ef, 'agallas', 100);
    expect(multiplicadorAire(ef)).toBeLessThan(1);
  });

  it('y bajo el agua se nota: el aire dura de verdad más', () => {
    const aguanta = (conAgallas: boolean): number => {
      const a = crearAliento();
      const s = crearSalud();
      const caja = crearCaja(0, 0, 20, 42);
      const ef = crearEfectos();
      if (conAgallas) aplicarEfecto(ef, 'agallas', 60 * 60);
      let ticks = 0;
      while (a.aire > 0 && ticks < 60 * 600) {
        tickAliento(a, s, caja, true, false, 1, multiplicadorAire(ef));
        ticks++;
      }
      return ticks;
    };
    const sin = aguanta(false);
    expect(sin).toBe(ALIENTO_MAXIMO);
    expect(aguanta(true)).toBeGreaterThan(sin * 2);
  });

  it('el brío pica más deprisa y nada más', () => {
    const ef = crearEfectos();
    expect(multiplicadorMinado(ef)).toBe(1);
    aplicarEfecto(ef, 'brio', 100);
    expect(multiplicadorMinado(ef)).toBeGreaterThan(1);
    // Y no toca el aire, para que no sea la poción que sirve para todo.
    expect(multiplicadorAire(ef)).toBe(1);
  });

  it('ninguna de las dos es dañina: son las que se buscan', () => {
    expect(EFECTOS.agallas.danino).toBe(false);
    expect(EFECTOS.brio.danino).toBe(false);
  });
});

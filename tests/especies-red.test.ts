import { describe, expect, it } from 'vitest';
import {
  ENEMIGOS,
  ORDEN_ESPECIES,
  especieDeIndice,
  indiceDeEspecie,
  type Especie,
} from '../src/entities/enemies';

/**
 * El orden de especies es un array posicional, como `TILES`.
 *
 * La diferencia es dónde duele equivocarse: el índice de un tile va al fichero
 * de guardado y el de una especie **va por el cable**. Meter una especie en
 * medio le cambia el número a todas las de después, y dos jugadores con
 * versiones distintas verían cosas distintas — uno un zombi donde el otro ve un
 * yeti. Por eso solo se puede añadir por el final.
 */
describe('el orden de especies', () => {
  it('están todas las que hay, y ninguna de más', () => {
    expect([...ORDEN_ESPECIES].sort()).toEqual(Object.keys(ENEMIGOS).sort());
  });

  it('ninguna repetida', () => {
    expect(new Set(ORDEN_ESPECIES).size).toBe(ORDEN_ESPECIES.length);
  });

  it('cabe en un byte', () => {
    expect(ORDEN_ESPECIES.length).toBeLessThanOrEqual(256);
  });

  it('cada especie va y vuelve por su índice', () => {
    for (const especie of Object.keys(ENEMIGOS) as Especie[]) {
      expect(especieDeIndice(indiceDeEspecie(especie))).toBe(especie);
    }
  });

  /** Llega de la red: un índice inventado no puede dar una especie cualquiera. */
  it('un índice que no existe devuelve null, no la primera especie', () => {
    expect(especieDeIndice(250)).toBeNull();
    expect(especieDeIndice(-1)).toBeNull();
    expect(especieDeIndice(ORDEN_ESPECIES.length)).toBeNull();
  });
});

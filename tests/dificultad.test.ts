import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import {
  dificultad,
  DIFICULTADES,
  DIFICULTAD_POR_DEFECTO,
  hayHostiles,
} from '../src/core/dificultad';
import { crearCaja, type Caja } from '../src/entities/physics';
import { crearSalud } from '../src/entities/salud';
import { crearHambre, HAMBRE_MAXIMA, tickHambre } from '../src/entities/hambre';
import { esHostil, intentarAparicion, type ContextoAparicion } from '../src/entities/spawner';
import type { Enemigo } from '../src/entities/enemies';
import { leerDificultad } from '../src/world/escenario';
import { TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

/**
 * Los diez niveles, de pacífico a "tú lo has querido".
 *
 * Lo que se comprueba no son los números concretos —esos se afinan jugando—
 * sino que la escalera sea monótona y que los extremos hagan lo que prometen:
 * en pacífico no aparece nada hostil y en el último todo pega mucho más.
 */

const SUELO = 40;

function mundoLlano(): Mundo {
  const m = new Mundo(200, 120);
  m.rellenar(0, SUELO, 199, 119, TIERRA);
  return m;
}

function jugador(): Caja {
  return crearCaja(100 * TILE, (SUELO - 3) * TILE, 26, 46);
}

function contexto(extra: Partial<ContextoAparicion> = {}): ContextoAparicion {
  return { esNoche: true, superficieTy: SUELO, bioma: 'bosque', ...extra };
}

function aparecerAlgo(m: Mundo, ctx: ContextoAparicion, intentos = 400): Enemigo | null {
  const lista: Enemigo[] = [];
  const j = jugador();
  for (let i = 0; i < intentos; i++) {
    const e = intentarAparicion(m, lista, j, ctx);
    if (e) return e;
    lista.length = 0;
  }
  return null;
}

describe('la tabla', () => {
  it('son diez niveles con id correlativo', () => {
    expect(DIFICULTADES).toHaveLength(10);
    DIFICULTADES.forEach((d, i) => expect(d.id).toBe(i));
  });

  it('todos tienen nombre y una línea que los explica', () => {
    for (const d of DIFICULTADES) {
      expect(d.nombre.length).toBeGreaterThan(0);
      expect(d.resumen.length).toBeGreaterThan(0);
    }
  });

  it('la escalera nunca baja', () => {
    for (let i = 1; i < DIFICULTADES.length; i++) {
      const antes = DIFICULTADES[i - 1]!;
      const ahora = DIFICULTADES[i]!;
      expect(ahora.fuerza).toBeGreaterThanOrEqual(antes.fuerza);
      expect(ahora.aforo).toBeGreaterThanOrEqual(antes.aforo);
      expect(ahora.hambre).toBeGreaterThanOrEqual(antes.hambre);
      expect(ahora.castigo).toBeGreaterThanOrEqual(antes.castigo);
    }
  });

  it('normal es exactamente el juego de siempre', () => {
    const n = dificultad(DIFICULTAD_POR_DEFECTO);
    expect(n.fuerza).toBe(1);
    expect(n.aforo).toBe(1);
    expect(n.hambre).toBe(1);
    expect(n.castigo).toBe(1);
  });

  it('pacífico no tiene hostiles y el resto sí', () => {
    expect(hayHostiles(DIFICULTADES[0]!)).toBe(false);
    for (let i = 1; i < DIFICULTADES.length; i++) {
      expect(hayHostiles(DIFICULTADES[i]!)).toBe(true);
    }
  });

  it('un id imposible no rompe la partida', () => {
    expect(dificultad(-1).id).toBe(DIFICULTAD_POR_DEFECTO);
    expect(dificultad(99).id).toBe(DIFICULTAD_POR_DEFECTO);
    expect(dificultad(NaN).id).toBe(DIFICULTAD_POR_DEFECTO);
  });
});

describe('pacífico', () => {
  it('de noche en el bosque no sale absolutamente nada', () => {
    const m = mundoLlano();
    expect(aparecerAlgo(m, contexto({ dif: DIFICULTADES[0] }))).toBeNull();
  });

  it('los animales siguen saliendo de día: hay que poder comer', () => {
    const m = mundoLlano();
    const e = aparecerAlgo(m, contexto({ esNoche: false, dif: DIFICULTADES[0] }));
    expect(e).not.toBeNull();
    expect(esHostil(e!.especie)).toBe(false);
  });

  it('el hambre no baja', () => {
    const h = crearHambre();
    const s = crearSalud(100);
    const c = jugador();
    for (let i = 0; i < 600; i++) tickHambre(h, s, c, true, DIFICULTADES[0]!.hambre);
    expect(h.nivel).toBe(HAMBRE_MAXIMA);
  });
});

describe('las dificultades altas se notan', () => {
  it('el zombi de "tú lo has querido" tiene mucha más vida que el de normal', () => {
    const m = mundoLlano();
    const normal = aparecerAlgo(m, contexto({ dif: DIFICULTADES[3] }));
    const brutal = aparecerAlgo(m, contexto({ dif: DIFICULTADES[9] }));
    expect(brutal!.fuerza).toBeGreaterThan(normal!.fuerza * 4);
  });

  it('el hambre baja más deprisa cuanto más alta es la dificultad', () => {
    const gastar = (ritmo: number): number => {
      const h = crearHambre();
      const s = crearSalud(100);
      const c = jugador();
      for (let i = 0; i < 3600; i++) tickHambre(h, s, c, true, ritmo);
      return HAMBRE_MAXIMA - h.nivel;
    };
    expect(gastar(DIFICULTADES[9]!.hambre)).toBeGreaterThan(gastar(DIFICULTADES[3]!.hambre));
    expect(gastar(DIFICULTADES[1]!.hambre)).toBeLessThan(gastar(DIFICULTADES[3]!.hambre));
  });

  it('la inanición duele más, pero nunca menos de un punto', () => {
    const morder = (castigo: number): number => {
      const h = crearHambre(1);
      const s = crearSalud(1000);
      const c = jugador();
      for (let i = 0; i < 200; i++) tickHambre(h, s, c, false, 1, castigo);
      return 1000 - s.vida;
    };
    expect(morder(2.2)).toBeGreaterThan(morder(1));
    expect(morder(0.001)).toBeGreaterThan(0);
  });
});

describe('la dificultad por URL', () => {
  it('acepta un número dentro de rango', () => {
    expect(leerDificultad('0')).toBe(0);
    expect(leerDificultad('9')).toBe(9);
  });

  it('recorta lo que se pase de rango y descarta lo ilegible', () => {
    expect(leerDificultad('42')).toBe(9);
    expect(leerDificultad('-3')).toBe(0);
    expect(leerDificultad('brutal')).toBe(DIFICULTAD_POR_DEFECTO);
    expect(leerDificultad(null)).toBe(DIFICULTAD_POR_DEFECTO);
  });
});

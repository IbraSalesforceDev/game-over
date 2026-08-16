import { describe, expect, it } from 'vitest';
import { puedeSembrar, RADIO_CULTIVO, tickCultivos } from '../src/world/cultivo';
import {
  AIRE,
  BROTE,
  CULTIVOS,
  CAMA,
  cultivoDe,
  cultivoMaduro,
  HIERBA,
  PIEDRA,
  TIERRA,
  TIERRA_LABRADA,
  TRIGO_0,
  TRIGO_3,
  ZANAHORIA_0,
  ZANAHORIA_3,
} from '../src/world/tiles';
import {
  dropDeTile,
  esSemilla,
  PAN,
  SEMILLAS,
  SEMILLAS_ZANAHORIA,
  siembraDe,
  TRIGO,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { Mundo } from '../src/world/world';

/**
 * Cultivos.
 *
 * Lo que se comprueba es la regla que sostiene todo lo demás: la etapa vive en
 * el id del tile, así que crecer es sumar uno y el guardado se lleva el huerto
 * sin enterarse de que existe. Si esa propiedad se rompe, se rompe en silencio.
 */

const SUELO = 20;

function huerto(): Mundo {
  const m = new Mundo(60, 40);
  m.rellenar(0, SUELO, 59, 39, TIERRA);
  m.rellenar(0, SUELO, 59, SUELO, TIERRA_LABRADA);
  return m;
}

describe('la etapa vive en el id', () => {
  it('cada cultivo es un rango contiguo de cuatro tiles', () => {
    for (const c of CULTIVOS) {
      expect(c.ultima - c.primera).toBe(3);
      for (let id = c.primera; id <= c.ultima; id++) {
        expect(cultivoDe(id)).toEqual(c);
      }
    }
  });

  it('solo la última etapa está madura', () => {
    for (const c of CULTIVOS) {
      for (let id = c.primera; id < c.ultima; id++) expect(cultivoMaduro(id)).toBe(false);
      expect(cultivoMaduro(c.ultima)).toBe(true);
    }
  });

  it('lo que no es cultivo no lo es', () => {
    for (const id of [AIRE, TIERRA, PIEDRA, HIERBA, BROTE, CAMA]) {
      expect(cultivoDe(id)).toBeNull();
      expect(cultivoMaduro(id)).toBe(false);
    }
  });
});

describe('sembrar', () => {
  it('solo sobre tierra labrada y con el hueco libre', () => {
    const m = huerto();
    expect(puedeSembrar(m, 10, SUELO - 1)).toBe(true);
    // Con algo encima, no.
    m.setTile(11, SUELO - 1, PIEDRA);
    expect(puedeSembrar(m, 11, SUELO - 1)).toBe(false);
    // Sobre tierra sin labrar, tampoco.
    m.setTile(12, SUELO, TIERRA);
    expect(puedeSembrar(m, 12, SUELO - 1)).toBe(false);
  });

  it('cada semilla planta lo suyo', () => {
    expect(esSemilla(SEMILLAS)).toBe(true);
    expect(siembraDe(SEMILLAS)).toBe(TRIGO_0);
    expect(siembraDe(SEMILLAS_ZANAHORIA)).toBe(ZANAHORIA_0);
    expect(siembraDe(TIERRA)).toBe(0);
  });
});

describe('crecer', () => {
  it('un cultivo sembrado acaba maduro', () => {
    const m = huerto();
    m.setTile(30, SUELO - 1, TRIGO_0);
    // Al tile le toca una vez cada 1.464 ticks, así que hacen falta bastantes.
    for (let i = 0; i < 40000 && m.getTile(30, SUELO - 1) !== TRIGO_3; i++) {
      tickCultivos(m, 30, SUELO - 1);
    }
    expect(m.getTile(30, SUELO - 1)).toBe(TRIGO_3);
  });

  it('maduro se queda: no se pasa de la última etapa', () => {
    const m = huerto();
    m.setTile(30, SUELO - 1, TRIGO_3);
    for (let i = 0; i < 20000; i++) tickCultivos(m, 30, SUELO - 1);
    expect(m.getTile(30, SUELO - 1)).toBe(TRIGO_3);
  });

  it('sin tierra labrada debajo se seca', () => {
    const m = huerto();
    m.setTile(30, SUELO, TIERRA);
    m.setTile(30, SUELO - 1, ZANAHORIA_0);
    for (let i = 0; i < 20000 && m.getTile(30, SUELO - 1) !== AIRE; i++) {
      tickCultivos(m, 30, SUELO - 1);
    }
    expect(m.getTile(30, SUELO - 1)).toBe(AIRE);
  });

  it('lo que está lejos del jugador no crece', () => {
    const m = huerto();
    m.setTile(50, SUELO - 1, TRIGO_0);
    // El jugador en la otra punta, bien fuera del radio.
    for (let i = 0; i < 20000; i++) tickCultivos(m, 50 - RADIO_CULTIVO * 3, SUELO - 1);
    expect(m.getTile(50, SUELO - 1)).toBe(TRIGO_0);
  });

  it('un brote sobre hierba acaba pidiendo un árbol', () => {
    const m = new Mundo(60, 40);
    m.rellenar(0, SUELO, 59, 39, TIERRA);
    m.rellenar(0, SUELO, 59, SUELO, HIERBA);
    m.setTile(30, SUELO - 1, BROTE);
    let arbol = false;
    for (let i = 0; i < 40000 && !arbol; i++) {
      arbol = tickCultivos(m, 30, SUELO - 1).some((c) => c.arbol);
    }
    expect(arbol).toBe(true);
    expect(m.getTile(30, SUELO - 1)).toBe(AIRE);
  });

  it('un brote con techo espera en vez de crecer dentro de la piedra', () => {
    const m = new Mundo(60, 40);
    m.rellenar(0, SUELO, 59, 39, TIERRA);
    m.rellenar(0, SUELO, 59, SUELO, HIERBA);
    m.setTile(30, SUELO - 1, BROTE);
    m.setTile(30, SUELO - 3, PIEDRA);
    for (let i = 0; i < 20000; i++) {
      expect(tickCultivos(m, 30, SUELO - 1).some((c) => c.arbol)).toBe(false);
    }
    expect(m.getTile(30, SUELO - 1)).toBe(BROTE);
  });
});

describe('la cosecha', () => {
  it('maduro da fruto y a medias devuelve la semilla', () => {
    expect(dropDeTile(TRIGO_3)).toBe(TRIGO);
    expect(dropDeTile(TRIGO_0)).toBe(SEMILLAS);
    expect(dropDeTile(ZANAHORIA_0)).toBe(SEMILLAS_ZANAHORIA);
    // La zanahoria madura es a la vez tile y comida: se arranca y se come.
    expect(dropDeTile(ZANAHORIA_3)).toBe(ZANAHORIA_3);
  });

  it('el trigo se convierte en pan en el horno', () => {
    const r = RECETAS.find((x) => x.resultado === PAN)!;
    expect(r.ingredientes.map(([id]) => id)).toEqual([TRIGO]);
  });
});

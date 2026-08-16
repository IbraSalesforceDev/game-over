import { describe, expect, it } from 'vitest';
import {
  ARENA,
  CANA,
  CRISTAL_VIDA,
  GRAVA,
  HIERRO,
  LADRILLO,
  materialDe,
  MADERA,
  PIEDRA,
  TIERRA,
  TRIGO_2,
  TRONCO_JUNGLA,
  VIDRIO,
} from '../src/world/tiles';
import {
  ARCO,
  BRUJULA,
  CASCO_HIERRO,
  descripcionDe,
  ESPADA_HIERRO,
  GREBAS_ORO,
  IDS_OBJETO,
  NADA,
  PETO_PLATA,
  resumenDe,
} from '../src/items/items';
import { coloresEquipo, crearEquipo } from '../src/items/equipado';
import { ENEMIGOS, vozDe, type Especie } from '../src/entities/enemies';

describe('de qué suena cada bloque', () => {
  it('agrupa por lo que oye el oído, no por lo que ve el ojo', () => {
    expect(materialDe(PIEDRA)).toBe('piedra');
    expect(materialDe(LADRILLO)).toBe('piedra');
    expect(materialDe(TIERRA)).toBe('tierra');
    expect(materialDe(ARENA)).toBe('tierra');
    // La grava se pinta con el grano de la piedra y se cava a paladas, pero al
    // romperse suena a tierra: es el caso que justifica que la tabla exista.
    expect(materialDe(GRAVA)).toBe('tierra');
    expect(materialDe(MADERA)).toBe('madera');
    expect(materialDe(TRONCO_JUNGLA)).toBe('madera');
    expect(materialDe(HIERRO)).toBe('metal');
    expect(materialDe(CANA)).toBe('planta');
    expect(materialDe(VIDRIO)).toBe('vidrio');
    expect(materialDe(CRISTAL_VIDA)).toBe('vidrio');
  });

  it('los cultivos suenan a planta sin estar uno a uno en la tabla', () => {
    expect(materialDe(TRIGO_2)).toBe('planta');
  });

  it('un tile desconocido no revienta: suena a piedra', () => {
    expect(materialDe(60000)).toBe('piedra');
  });
});

describe('fichas de objeto', () => {
  it('todo el catálogo tiene algo que decir de sí mismo', () => {
    for (const id of IDS_OBJETO) {
      if (id === NADA) continue;
      expect(descripcionDe(id).length).toBeGreaterThan(0);
    }
  });

  it('los números salen del catálogo, no de un texto a mano', () => {
    const r = resumenDe(ESPADA_HIERRO);
    expect(r).toContain('daño 26');
    expect(r).toContain('alcance 42');
  });

  it('la armadura dice cuánto defiende y dónde va', () => {
    expect(resumenDe(PETO_PLATA)).toContain('defensa');
    expect(resumenDe(PETO_PLATA)).toContain('torso');
  });

  it('el arco dice qué munición gasta', () => {
    expect(resumenDe(ARCO)).toContain('flecha');
  });

  it('la brújula tiene explicación propia, no la genérica de su tipo', () => {
    expect(descripcionDe(BRUJULA)).toContain('aguja');
  });
});

describe('la armadura que se ve puesta', () => {
  it('desnudo son cinco huecos vacíos', () => {
    expect(coloresEquipo(crearEquipo())).toEqual([null, null, null, null, null]);
  });

  it('cada pieza tiñe su hueco y solo el suyo', () => {
    const equipo = crearEquipo();
    equipo.ponerEn(0, CASCO_HIERRO, 1);
    equipo.ponerEn(2, GREBAS_ORO, 1);
    const colores = coloresEquipo(equipo);
    expect(colores[0]).toBe('#a3968a');
    expect(colores[1]).toBeNull();
    expect(colores[2]).toBe('#dcb13a');
    expect(colores[3]).toBeNull();
  });
});

describe('voces de los bichos', () => {
  it('los animales callan', () => {
    for (const pacifico of ['conejo', 'gallina', 'jabali'] as const) {
      expect(vozDe(pacifico)).toBeNull();
    }
  });

  it('todo lo hostil tiene voz', () => {
    for (const especie of Object.keys(ENEMIGOS) as Especie[]) {
      const def = ENEMIGOS[especie];
      if (def.pasivo || def.dano <= 0) continue;
      expect(vozDe(especie)).not.toBeNull();
    }
  });
});

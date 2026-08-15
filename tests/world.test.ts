import { describe, expect, it } from 'vitest';
import { AIRE, PIEDRA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import { crearNivelPruebas } from '../src/world/testLevel';
import { esSolido } from '../src/world/tiles';
import { TILE } from '../src/core/constants';

describe('Mundo', () => {
  it('guarda y lee tiles por coordenada', () => {
    const m = new Mundo(10, 10);
    m.setTile(3, 4, TIERRA);
    expect(m.getTile(3, 4)).toBe(TIERRA);
    expect(m.getTile(4, 4)).toBe(AIRE);
  });

  it('por encima del mundo hay aire, y roca por los lados y por debajo', () => {
    const m = new Mundo(10, 10);
    expect(m.getTile(5, -1)).toBe(AIRE);
    expect(m.getTile(-1, 5)).toBe(PIEDRA);
    expect(m.getTile(10, 5)).toBe(PIEDRA);
    expect(m.getTile(5, 10)).toBe(PIEDRA);
  });

  it('escribir fuera de límites no revienta ni desborda a otra fila', () => {
    const m = new Mundo(10, 10);
    m.setTile(-1, 0, TIERRA);
    m.setTile(10, 0, TIERRA);
    expect(m.tileId.every((v) => v === AIRE)).toBe(true);
  });

  it('rellenar cubre el rectángulo inclusivo', () => {
    const m = new Mundo(10, 10);
    m.rellenar(2, 2, 4, 3, PIEDRA);
    expect(m.getTile(2, 2)).toBe(PIEDRA);
    expect(m.getTile(4, 3)).toBe(PIEDRA);
    expect(m.getTile(5, 3)).toBe(AIRE);
    expect(m.getTile(2, 4)).toBe(AIRE);
  });
});

describe('nivel de pruebas', () => {
  it('el spawn queda en el aire y con suelo debajo', () => {
    const { mundo, spawnTx, spawnTy } = crearNivelPruebas();
    expect(esSolido(mundo.getTile(spawnTx, spawnTy))).toBe(false);
    let ty = spawnTy;
    while (ty < mundo.alto && !esSolido(mundo.getTile(spawnTx, ty))) ty++;
    expect(ty).toBeLessThan(mundo.alto);
  });

  it('tiene todas las zonas dentro de los límites del mundo', () => {
    const { mundo, zonas } = crearNivelPruebas();
    expect(zonas.length).toBeGreaterThan(5);
    for (const z of zonas) {
      expect(z.tx).toBeGreaterThan(0);
      expect(z.tx).toBeLessThan(mundo.ancho);
    }
  });

  it('el pozo tiene la profundidad necesaria para alcanzar la velocidad terminal', () => {
    const { mundo } = crearNivelPruebas();
    // Columna de caída libre del pozo (zona 4).
    let ty = 64;
    while (ty < mundo.alto && !esSolido(mundo.getTile(94, ty))) ty++;
    const caidaPx = (ty - 64) * TILE;
    // Con gravedad 0,4 y tope 10 px/tick hacen falta ~125 px para llegar al tope.
    expect(caidaPx).toBeGreaterThan(200);
  });
});

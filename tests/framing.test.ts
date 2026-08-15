import { describe, expect, it } from 'vitest';
import {
  ABAJO,
  ARRIBA,
  conecta,
  DERECHA,
  IZQUIERDA,
  mascaraPared,
  mascaraTile,
} from '../src/world/framing';
import { AIRE, MADERA, PIEDRA, PLATAFORMA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

describe('conexión entre tiles', () => {
  it('los macizos conectan entre sí aunque sean de distinto material', () => {
    expect(conecta(TIERRA, PIEDRA)).toBe(true);
    expect(conecta(MADERA, TIERRA)).toBe(true);
  });

  it('el aire no conecta con nada', () => {
    expect(conecta(AIRE, TIERRA)).toBe(false);
    expect(conecta(TIERRA, AIRE)).toBe(false);
    expect(conecta(AIRE, AIRE)).toBe(false);
  });

  it('las plataformas solo conectan con plataformas', () => {
    expect(conecta(PLATAFORMA, PLATAFORMA)).toBe(true);
    expect(conecta(PLATAFORMA, PIEDRA)).toBe(false);
    expect(conecta(PIEDRA, PLATAFORMA)).toBe(false);
  });
});

describe('máscara de vecinos', () => {
  it('un bloque aislado no conecta por ningún lado', () => {
    const m = new Mundo(10, 10);
    m.setTile(5, 5, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(0);
  });

  it('un bloque rodeado conecta por los cuatro', () => {
    const m = new Mundo(10, 10);
    m.rellenar(4, 4, 6, 6, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(ARRIBA | DERECHA | ABAJO | IZQUIERDA);
  });

  it('cada bit corresponde a su lado', () => {
    const m = new Mundo(10, 10);
    m.setTile(5, 5, TIERRA);
    m.setTile(5, 4, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(ARRIBA);
    m.setTile(6, 5, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(ARRIBA | DERECHA);
    m.setTile(5, 6, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(ARRIBA | DERECHA | ABAJO);
    m.setTile(4, 5, TIERRA);
    expect(mascaraTile(m, 5, 5)).toBe(ARRIBA | DERECHA | ABAJO | IZQUIERDA);
  });

  it('el aire siempre da máscara 0', () => {
    const m = new Mundo(10, 10);
    m.rellenar(4, 4, 6, 6, TIERRA);
    m.setTile(5, 5, AIRE);
    expect(mascaraTile(m, 5, 5)).toBe(0);
  });

  it('en el borde inferior del mundo el bloque conecta con la roca del límite', () => {
    const m = new Mundo(10, 10);
    m.setTile(5, 9, TIERRA);
    expect(mascaraTile(m, 5, 9) & ABAJO).toBe(ABAJO);
  });

  it('por encima del mundo hay aire, así que el borde superior queda expuesto', () => {
    const m = new Mundo(10, 10);
    m.setTile(5, 0, TIERRA);
    expect(mascaraTile(m, 5, 0) & ARRIBA).toBe(0);
  });
});

describe('máscara de paredes', () => {
  it('las paredes conectan solo con paredes', () => {
    const m = new Mundo(10, 10);
    m.setPared(5, 5, TIERRA);
    m.setPared(5, 4, PIEDRA);
    m.setTile(6, 5, PIEDRA); // un bloque delante no cuenta como pared
    expect(mascaraPared(m, 5, 5)).toBe(ARRIBA);
  });

  it('sin pared la máscara es 0', () => {
    const m = new Mundo(10, 10);
    m.setPared(5, 4, TIERRA);
    expect(mascaraPared(m, 5, 5)).toBe(0);
  });
});

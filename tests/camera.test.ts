import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { Camara, mundoDeTile, tileDeMundo } from '../src/render/camera';

function camara(zoom = 3): Camara {
  const c = new Camara();
  c.zoom = zoom;
  c.redimensionar(900, 600);
  return c;
}

describe('Camara', () => {
  it('la conversión mundo → pantalla → mundo es de ida y vuelta', () => {
    const c = camara();
    c.x = 137.5;
    c.y = 42.25;
    for (const wx of [0, 16, 137.5, 1024]) {
      expect(c.aMundoX(c.aPantallaX(wx))).toBeCloseTo(wx, 6);
    }
    for (const wy of [0, 16, 42.25, 999]) {
      expect(c.aMundoY(c.aPantallaY(wy))).toBeCloseTo(wy, 6);
    }
  });

  it('el tamaño de la vista en píxeles de mundo depende del zoom', () => {
    expect(camara(3).ancho).toBe(300);
    expect(camara(2).ancho).toBe(450);
  });

  it('no se sale de los límites del mundo', () => {
    const c = camara();
    c.centrar(0, 0, 300, 110);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    c.centrar(300 * TILE, 110 * TILE, 300, 110);
    expect(c.x).toBe(300 * TILE - c.ancho);
    expect(c.y).toBe(110 * TILE - c.alto);
  });

  it('centra el eje cuando el mundo es más pequeño que la vista', () => {
    const c = camara();
    c.centrar(0, 0, 5, 5); // 80x80 px de mundo contra 300x200 de vista
    expect(c.x).toBe((5 * TILE - c.ancho) / 2);
  });

  it('el seguimiento se acerca al objetivo sin pasarse', () => {
    const c = camara();
    c.centrar(1000, 500, 300, 110);
    const objetivoX = 2000;
    const antes = Math.abs(c.x - (objetivoX - c.ancho / 2));
    c.seguir(objetivoX, 500, 300, 110);
    const despues = Math.abs(c.x - (objetivoX - c.ancho / 2));
    expect(despues).toBeLessThan(antes);
  });

  it('tilesVisibles cubre la vista con un tile de margen', () => {
    const c = camara();
    c.x = 160;
    c.y = 320;
    const { tx0, ty0, tx1, ty1 } = c.tilesVisibles();
    expect(tx0).toBe(9);
    expect(ty0).toBe(19);
    expect(tx1).toBeGreaterThan(tileDeMundo(c.x + c.ancho) - 1);
    expect(ty1).toBeGreaterThan(tileDeMundo(c.y + c.alto) - 1);
  });

  it('las utilidades tile ↔ mundo son coherentes', () => {
    expect(mundoDeTile(3)).toBe(48);
    expect(tileDeMundo(48)).toBe(3);
    expect(tileDeMundo(63)).toBe(3);
    expect(tileDeMundo(-1)).toBe(-1);
  });
});

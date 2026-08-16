import { describe, expect, it } from 'vitest';
import {
  comer,
  crearHambre,
  DANO_INANICION,
  HAMBRE_MAXIMA,
  hambriento,
  INTERVALO_INANICION,
  INTERVALO_REGENERACION,
  reiniciarHambre,
  saciado,
  tickHambre,
  UMBRAL_HAMBRIENTO,
  UMBRAL_SACIADO,
} from '../src/entities/hambre';
import { crearCaja } from '../src/entities/physics';
import { crearSalud } from '../src/entities/salud';
import { CARNE_ASADA, CARNE_CRUDA, defObjeto, esComida } from '../src/items/items';

const caja = () => crearCaja(0, 0, 20, 42);

describe('hambre', () => {
  it('baja sola, y más deprisa si te mueves', () => {
    const quieto = crearHambre();
    const corriendo = crearHambre();
    const s = crearSalud();
    for (let i = 0; i < 600; i++) {
      tickHambre(quieto, s, caja(), false);
      tickHambre(corriendo, s, caja(), true);
    }
    expect(quieto.nivel).toBeLessThan(HAMBRE_MAXIMA);
    expect(corriendo.nivel).toBeLessThan(quieto.nivel);
  });

  it('el depósito lleno dura del orden de diez minutos parado', () => {
    const h = crearHambre();
    const s = crearSalud();
    // Diez minutos de juego a 60 ticks por segundo.
    for (let i = 0; i < 60 * 60 * 10; i++) tickHambre(h, s, caja(), false);
    expect(h.nivel).toBeGreaterThan(0);
    expect(h.nivel).toBeLessThan(30);
  });

  it('saciado regenera vida, y regenerar gasta comida de más', () => {
    const h = crearHambre();
    const s = crearSalud();
    s.vida = 40;
    const c = caja();

    const conHerida = crearHambre();
    const sano = crearSalud();
    for (let i = 0; i < INTERVALO_REGENERACION; i++) {
      tickHambre(h, s, c, false);
      tickHambre(conHerida, sano, c, false);
    }
    expect(s.vida).toBeGreaterThan(40);
    // El que se está curando ha gastado más hambre que el que estaba sano.
    expect(h.nivel).toBeLessThan(conHerida.nivel);
  });

  it('no regenera si el hambre no llega al umbral', () => {
    const h = crearHambre(UMBRAL_SACIADO - 5);
    const s = crearSalud();
    s.vida = 40;
    for (let i = 0; i < INTERVALO_REGENERACION * 3; i++) tickHambre(h, s, caja(), false);
    expect(s.vida).toBe(40);
  });

  it('con el estómago vacío se pierde vida a intervalos', () => {
    const h = crearHambre(2);
    const s = crearSalud();
    const c = caja();
    for (let i = 0; i < INTERVALO_INANICION; i++) tickHambre(h, s, c, false);
    expect(s.vida).toBe(s.vidaMax - DANO_INANICION);
    // Y el tick siguiente no vuelve a doler.
    tickHambre(h, s, c, false);
    expect(s.vida).toBe(s.vidaMax - DANO_INANICION);
  });

  it('el hambre no empuja al jugador', () => {
    const h = crearHambre(1);
    const s = crearSalud();
    const c = caja();
    for (let i = 0; i < INTERVALO_INANICION; i++) tickHambre(h, s, c, false);
    expect(c.vx).toBe(0);
    expect(c.vy).toBe(0);
  });

  it('muerto no se pasa hambre', () => {
    const h = crearHambre(50);
    const s = crearSalud();
    s.muerto = true;
    tickHambre(h, s, caja(), true);
    expect(h.nivel).toBe(50);
  });

  it('las franjas se leen con los mismos umbrales que pinta la interfaz', () => {
    expect(saciado(crearHambre(UMBRAL_SACIADO))).toBe(true);
    expect(saciado(crearHambre(UMBRAL_SACIADO - 1))).toBe(false);
    expect(hambriento(crearHambre(UMBRAL_HAMBRIENTO))).toBe(true);
    expect(hambriento(crearHambre(UMBRAL_HAMBRIENTO + 1))).toBe(false);
  });
});

describe('comer', () => {
  it('sube el hambre y cura', () => {
    const h = crearHambre(30);
    const s = crearSalud();
    s.vida = 50;
    const def = defObjeto(CARNE_ASADA);
    expect(comer(h, s, def.saciedad ?? 0, def.curacion ?? 0)).toBe(true);
    expect(h.nivel).toBe(30 + (def.saciedad ?? 0));
    expect(s.vida).toBe(50 + (def.curacion ?? 0));
  });

  it('no pasa del máximo ni desperdicia comida estando lleno', () => {
    const h = crearHambre(HAMBRE_MAXIMA);
    const s = crearSalud();
    expect(comer(h, s, 40, 10)).toBe(false);
    expect(h.nivel).toBe(HAMBRE_MAXIMA);
  });

  it('estando lleno pero herido sí se come, porque cura', () => {
    const h = crearHambre(HAMBRE_MAXIMA);
    const s = crearSalud();
    s.vida = 20;
    expect(comer(h, s, 40, 10)).toBe(true);
    expect(s.vida).toBe(30);
    expect(h.nivel).toBe(HAMBRE_MAXIMA);
  });

  it('la carne asada alimenta más que la cruda, que es para lo que está el horno', () => {
    const cruda = defObjeto(CARNE_CRUDA);
    const asada = defObjeto(CARNE_ASADA);
    expect(esComida(CARNE_CRUDA)).toBe(true);
    expect(asada.saciedad!).toBeGreaterThan(cruda.saciedad!);
    expect(asada.curacion!).toBeGreaterThan(cruda.curacion!);
  });

  it('reaparecer deja el hambre en la franja tranquila, ni llena ni crítica', () => {
    const h = crearHambre(3);
    reiniciarHambre(h);
    expect(hambriento(h)).toBe(false);
    expect(saciado(h)).toBe(false);
  });
});

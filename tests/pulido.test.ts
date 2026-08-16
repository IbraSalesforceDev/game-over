import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { Camara } from '../src/render/camera';
import { Particulas } from '../src/render/particles';
import { aclarar, mezclar, tono } from '../src/render/pixel';
import { PIEDRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

function mundoPlano(ancho = 60, alto = 40): Mundo {
  const m = new Mundo(ancho, alto);
  m.rellenar(0, SUELO, ancho - 1, alto - 1, PIEDRA);
  return m;
}

describe('partículas', () => {
  it('emitir las pone vivas y actualizar las va apagando', () => {
    const p = new Particulas();
    expect(p.cuantas).toBe(0);
    p.emitir(100, 100, { cantidad: 10, color: '#ff0000', vida: 5 });
    p.actualizar(null);
    expect(p.cuantas).toBe(10);
    for (let i = 0; i < 20; i++) p.actualizar(null);
    expect(p.cuantas).toBe(0);
  });

  it('nunca pasa del tope, por muchas que se pidan', () => {
    const p = new Particulas();
    for (let i = 0; i < 50; i++) {
      p.emitir(10, 10, { cantidad: 40, color: '#ffffff', vida: 999 });
    }
    p.actualizar(null);
    // Dos mil pedidas, y el anillo aguanta sin crecer: las nuevas pisan a las
    // viejas, que es justo lo que se quiere cuando se desborda.
    expect(p.cuantas).toBeLessThanOrEqual(600);
  });

  it('las que chocan se posan y se apagan; las que no, siguen cayendo', () => {
    const m = mundoPlano();
    const chocan = new Particulas();
    const atraviesan = new Particulas();
    const emision = {
      cantidad: 30,
      color: '#8a5f33',
      dispersion: 0.1,
      empujeY: 6,
      vida: 400,
    } as const;
    // El mismo chorro hacia abajo, justo encima de la roca, con y sin colisión.
    chocan.emitir(10 * TILE, (SUELO - 1) * TILE, { ...emision, choca: true });
    atraviesan.emitir(10 * TILE, (SUELO - 1) * TILE, { ...emision, choca: false });

    for (let i = 0; i < 60; i++) {
      chocan.actualizar(m);
      atraviesan.actualizar(m);
    }

    // Las que chocan tocan suelo, se quedan casi paradas y el sistema les corta
    // la vida para que no vibren eternamente. Las que lo atraviesan siguen
    // cayendo hacia el infinito con su vida intacta. Que una lista esté vacía y
    // la otra llena es la prueba de que la colisión ocurre.
    expect(chocan.cuantas).toBe(0);
    expect(atraviesan.cuantas).toBe(30);
  });

  it('limpiar las apaga todas de golpe', () => {
    const p = new Particulas();
    p.emitir(0, 0, { cantidad: 20, color: '#fff', vida: 500 });
    p.actualizar(null);
    p.limpiar();
    expect(p.cuantas).toBe(0);
  });
});

describe('sacudida de cámara', () => {
  it('desplaza el origen y vuelve sola a cero', () => {
    const c = new Camara();
    c.zoom = 1;
    c.redimensionar(800, 600);
    c.centrar(400, 300, 200, 200);
    const reposo = c.origenX();

    c.sacudir(8);
    c.tickSacudida();
    expect(c.origenX()).not.toBe(reposo);

    // Amortigua a 0,86 por tick: en unos sesenta ticks tiene que estar quieta.
    for (let i = 0; i < 80; i++) c.tickSacudida();
    expect(c.origenX()).toBe(reposo);
  });

  it('dos golpes seguidos no se suman: manda el mayor', () => {
    const c = new Camara();
    c.zoom = 1;
    c.redimensionar(800, 600);
    c.sacudir(3);
    c.sacudir(6);
    c.sacudir(2);
    c.tickSacudida();
    // La amplitud es 6, así que el desplazamiento no puede pasarse de ahí.
    expect(Math.abs(c.origenX())).toBeLessThanOrEqual(6);
  });

  it('sin sacudir, el origen es exactamente el de la cámara', () => {
    const c = new Camara();
    c.zoom = 2;
    c.redimensionar(800, 600);
    c.x = 37.4;
    expect(c.origenX()).toBe(Math.round(-37.4 * 2));
  });
});

describe('paleta', () => {
  it('aclarar sube y baja sin salirse del rango', () => {
    expect(aclarar('#808080', 20)).toBe('#949494');
    expect(aclarar('#000000', -50)).toBe('#000000');
    expect(aclarar('#ffffff', 50)).toBe('#ffffff');
  });

  it('mezclar interpola entre dos colores', () => {
    expect(mezclar('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mezclar('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mezclar('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('un tono trae siempre su claro y su oscuro alrededor de la base', () => {
    const t = tono('#808080', 20, 30);
    expect(t.base).toBe('#808080');
    expect(t.claro).toBe(aclarar('#808080', 20));
    expect(t.oscuro).toBe(aclarar('#808080', -30));
  });
});

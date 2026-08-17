import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import {
  actualizarExplosivos,
  crearExplosivo,
  detonar,
  EXPLOSIVOS,
  lanzarDesde,
  limpiarExplosivos,
  anadirExplosivo,
  TOPE_BOMBAS,
  type Explosivo,
} from '../src/entities/explosivos';
import { crearEnemigo, type Enemigo } from '../src/entities/enemies';
import type { Caja } from '../src/entities/physics';
import { Mundo } from '../src/world/world';
import { AIRE, ALTAR, COFRE, LADRILLO, LADRILLO_INFERNAL, PIEDRA, TIERRA } from '../src/world/tiles';

/** Un mundo macizo de piedra, con un hueco donde ponerse. */
function macizo(ancho = 60, alto = 60, relleno = PIEDRA): Mundo {
  const m = new Mundo(ancho, alto);
  for (let ty = 0; ty < alto; ty++) {
    for (let tx = 0; tx < ancho; tx++) m.setTile(tx, ty, relleno);
  }
  return m;
}

function enElCentro(m: Mundo, tipo: 'bomba' | 'dinamita' = 'bomba'): Explosivo {
  const cx = (m.ancho / 2) * TILE;
  const cy = (m.alto / 2) * TILE;
  return crearExplosivo(tipo, cx, cy, 0, 0);
}

describe('explosivos (6.4.0)', () => {
  it('la explosión abre un agujero redondo del radio que dice', () => {
    const m = macizo();
    const b = enElCentro(m);
    const est = detonar(m, b, []);
    expect(est.rotos.length).toBeGreaterThan(0);
    // Todo lo roto cae dentro del radio, y el radio se aprovecha: si el agujero
    // saliera muy por debajo del área del círculo es que se está midiendo a la
    // esquina del tile y no a su centro, y entonces el hueco sale mordido.
    const cx = m.ancho / 2;
    const cy = m.alto / 2;
    for (const { tx, ty } of est.rotos) {
      expect(Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy)).toBeLessThanOrEqual(b.radio);
    }
    const area = Math.PI * b.radio * b.radio;
    expect(est.rotos.length).toBeGreaterThan(area * 0.8);
  });

  it('la dinamita abre bastante más que la bomba', () => {
    const m = macizo(80, 80);
    const chica = detonar(m, enElCentro(m, 'bomba'), []);
    const grande = detonar(m, enElCentro(m, 'dinamita'), []);
    expect(grande.rotos.length).toBeGreaterThan(chica.rotos.length * 3);
  });

  it('ninguna de las dos abre el ladrillo de fortaleza ni el del inframundo', () => {
    // Es el freno que impide que la dinamita sea la llave maestra del juego: si
    // volara el ladrillo, la fortaleza dejaría de pedir el pico que pide y todo
    // el bloque 5 se saltaría con pólvora.
    for (const duro of [LADRILLO, LADRILLO_INFERNAL]) {
      const m = macizo(80, 80, duro);
      expect(detonar(m, enElCentro(m, 'dinamita'), []).rotos).toEqual([]);
    }
  });

  it('pero sí la tierra y la piedra', () => {
    for (const blando of [TIERRA, PIEDRA]) {
      const m = macizo(60, 60, blando);
      expect(detonar(m, enElCentro(m, 'bomba'), []).rotos.length).toBeGreaterThan(10);
    }
  });

  it('el cofre y el altar sobreviven a una dinamita a bocajarro', () => {
    // Volar un cofre se llevaría por delante lo que hay dentro sin devolverlo, y
    // romper el altar sin querer dejaría el mundo sin jefe para siempre.
    const m = macizo(80, 80);
    const cx = Math.floor(m.ancho / 2);
    const cy = Math.floor(m.alto / 2);
    m.setTile(cx + 1, cy, COFRE);
    m.setTile(cx - 1, cy, ALTAR);
    const rotos = detonar(m, enElCentro(m, 'dinamita'), []).rotos;
    expect(rotos.some((r) => r.tile === COFRE || r.tile === ALTAR)).toBe(false);
  });

  it('no toca el borde del mundo, que es la caja que impide salirse', () => {
    const m = macizo(20, 20);
    const b = crearExplosivo('dinamita', 1.5 * TILE, 1.5 * TILE, 0, 0);
    for (const { tx, ty } of detonar(m, b, []).rotos) {
      expect(tx).toBeGreaterThan(0);
      expect(ty).toBeGreaterThan(0);
      expect(tx).toBeLessThan(m.ancho - 1);
      expect(ty).toBeLessThan(m.alto - 1);
    }
  });

  it('reparte daño a los bichos y menos cuanto más lejos', () => {
    const m = macizo();
    const b = enElCentro(m);
    const cerca = bicho(m, b.x + TILE, b.y);
    const lejos = bicho(m, b.x + b.radio * TILE * 0.95, b.y);
    const fuera = bicho(m, b.x + b.radio * TILE * 2, b.y);
    const antes = [cerca, lejos, fuera].map((e) => e.salud.vida);
    detonar(m, b, [cerca, lejos, fuera]);
    const perdido = [cerca, lejos, fuera].map((e, i) => antes[i]! - e.salud.vida);
    expect(perdido[0]!).toBeGreaterThan(perdido[1]!);
    expect(perdido[1]!).toBeGreaterThan(0);
    expect(perdido[2]!).toBe(0);
  });

  it('y al que la ha tirado, la mitad', () => {
    // Es lo único que impide que la forma óptima de minar sea tirarse bombas a
    // los pies: si no doliera, el pico sobraría.
    const m = macizo();
    const b = enElCentro(m);
    const caja: Caja = { x: b.x, y: b.y, ancho: 26, alto: 46 } as Caja;
    const est = detonar(m, b, [], caja);
    expect(est.danoJugador).toBeGreaterThan(EXPLOSIVOS.bomba.dano / 3);
    expect(est.danoJugador).toBeLessThan(EXPLOSIVOS.bomba.dano);
  });

  it('el que está lejos no se lleva nada', () => {
    const m = macizo();
    const b = enElCentro(m);
    const caja: Caja = { x: b.x + 40 * TILE, y: b.y, ancho: 26, alto: 46 } as Caja;
    expect(detonar(m, b, [], caja).danoJugador).toBe(0);
  });

  it('la mecha estalla sola, y solo una vez', () => {
    const m = macizo(60, 60, AIRE);
    const bombas = [enElCentro(m)];
    let estallidos = 0;
    for (let t = 0; t < EXPLOSIVOS.bomba.mecha + 60; t++) {
      estallidos += actualizarExplosivos(m, bombas, []).length;
    }
    expect(estallidos).toBe(1);
    expect(bombas[0]!.vivo).toBe(false);
  });

  it('rebota en el suelo en vez de atravesarlo', () => {
    const m = macizo(60, 60, AIRE);
    for (let tx = 0; tx < m.ancho; tx++) m.setTile(tx, 40, PIEDRA);
    const b = crearExplosivo('bomba', 30 * TILE, 20 * TILE, 3, 0);
    for (let t = 0; t < 100; t++) actualizarExplosivos(m, [b], []);
    // Sigue por encima del suelo: si atravesara, a los cien ticks estaría muy
    // por debajo de la fila 40.
    expect(b.y).toBeLessThan(40 * TILE);
    // Y ha avanzado en horizontal, o sea que ha rodado en vez de clavarse.
    expect(b.x).toBeGreaterThan(30 * TILE);
  });

  it('no se queda dentro de una pared al chocar en diagonal', () => {
    const m = macizo(60, 60, AIRE);
    for (let ty = 0; ty < m.alto; ty++) m.setTile(40, ty, PIEDRA);
    for (let tx = 0; tx < m.ancho; tx++) m.setTile(tx, 40, PIEDRA);
    const b = crearExplosivo('bomba', 30 * TILE, 30 * TILE, 6, 6);
    for (let t = 0; t < 100; t++) actualizarExplosivos(m, [b], []);
    expect(b.x).toBeLessThan(40 * TILE);
    expect(b.y).toBeLessThan(40 * TILE);
  });

  it('se lanza hacia donde se apunta', () => {
    const caja: Caja = { x: 100, y: 100, ancho: 26, alto: 46, mirando: 1, vx: 0 } as Caja;
    const der = lanzarDesde('bomba', caja, 400, 100, 8);
    const izq = lanzarDesde('bomba', caja, -400, 100, 8);
    expect(der.vx).toBeGreaterThan(0);
    expect(izq.vx).toBeLessThan(0);
  });

  it('el tope no deja que se acumulen sin fin', () => {
    const bombas: Explosivo[] = [];
    for (let i = 0; i < TOPE_BOMBAS * 3; i++) {
      anadirExplosivo(bombas, crearExplosivo('bomba', i, 0, 0, 0));
    }
    expect(bombas.length).toBe(TOPE_BOMBAS);
    for (const b of bombas) b.vivo = false;
    limpiarExplosivos(bombas);
    expect(bombas).toEqual([]);
  });
});

function bicho(_m: Mundo, x: number, y: number): Enemigo {
  const e = crearEnemigo('zombi', x, y);
  e.caja.x = x - e.caja.ancho / 2;
  e.caja.y = y - e.caja.alto / 2;
  return e;
}

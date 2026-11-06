import { describe, expect, it } from 'vitest';
import { caminoA } from '../src/colonia/camino';
import { deserializar, serializar } from '../src/colonia/guardado';
import { Orden } from '../src/colonia/mapa';
import { Mundo } from '../src/colonia/mundo';
import type { Edificio } from '../src/colonia/edificios';
import { ANCHO, ALTO, TPS, idx } from '../src/colonia/tipos';

function segundos(w: Mundo, s: number): void {
  for (let k = 0; k < s * TPS; k++) w.paso();
}

/** Busca un bloque de 2×2 del mineral dado cerca del inicio. */
function mancha(w: Mundo, tipo: number): [number, number] {
  const [x0, y0] = w.inicio;
  for (let r = 2; r < 40; r++) {
    for (let y = y0 - r; y <= y0 + r; y++) {
      for (let x = x0 - r; x <= x0 + r; x++) {
        if (x < 0 || y < 0 || x + 1 >= ANCHO || y + 1 >= ALTO) continue;
        const ok = [idx(x, y), idx(x + 1, y), idx(x, y + 1), idx(x + 1, y + 1)].every((i) => w.mapa.mineral[i] === tipo);
        if (ok) return [x, y];
      }
    }
  }
  throw new Error('sin mineral');
}

function despejar(w: Mundo, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = idx(x, y);
      w.mapa.planta[i] = 0;
      w.mapa.muro[i] = 0;
      if (w.mapa.suelo[i] === 3) w.mapa.suelo[i] = 1;
    }
}

describe('mapa', () => {
  it('el inicio es accesible y los nidos quedan lejos', () => {
    for (const semilla of [1, 2, 3, 4, 5]) {
      const w = Mundo.nueva(semilla);
      const [x, y] = w.inicio;
      expect(w.pasableColono(idx(x, y))).toBe(true);
      expect(w.nidos.length).toBeGreaterThanOrEqual(2);
      for (const n of w.nidos) expect(Math.hypot(n.x - x, n.y - y)).toBeGreaterThan(40);
      // Hay hierro, cobre y carbón a mano.
      for (const t of [1, 2, 3]) expect(() => mancha(w, t)).not.toThrow();
    }
  });

  it('el camino rodea los obstáculos', () => {
    const w = Mundo.nueva(7);
    const [x, y] = w.inicio;
    despejar(w, x - 6, y - 6, x + 6, y + 6);
    for (let k = -3; k <= 3; k++) w.colocar('muroMadera', x + 2, y + k, 0, true);
    const c = caminoA(idx(x, y), idx(x + 4, y), w.pasableColono);
    expect(c).not.toBeNull();
    expect(c!.length).toBeGreaterThan(4);
    for (const i of c!) expect(w.pasableColono(i)).toBe(true);
  });
});

describe('colonos', () => {
  it('desde cero: talan, construyen, minan a mano, funden y fabrican engranajes', () => {
    const w = Mundo.nueva(1234);
    const [x0, y0] = w.inicio;
    const [hx, hy] = mancha(w, 1);
    // Minar a mano la mancha de hierro.
    for (let y = hy; y < hy + 2; y++) for (let x = hx; x < hx + 2; x++) w.mapa.orden[idx(x, y)] = Orden.Minar;
    const horno = w.colocar('horno', x0 + 3, y0 - 4, 0);
    const mesa = w.colocar('mesaTrabajo', x0 - 4, y0 - 4, 0);
    expect(typeof horno).not.toBe('string');
    expect(typeof mesa).not.toBe('string');
    const placasAntes = w.existencias('placaHierro');
    const engranajesAntes = w.existencias('engranaje');
    segundos(w, 400);
    expect((horno as Edificio).construido).toBe(true);
    expect((mesa as Edificio).construido).toBe(true);
    // Han fundido mineral y fabricado engranajes con las placas.
    const placas = w.existencias('placaHierro') + 2 * (w.existencias('engranaje') - engranajesAntes);
    expect(placas).toBeGreaterThan(placasAntes);
    expect(w.existencias('engranaje')).toBeGreaterThan(engranajesAntes);
    expect(w.colonos.every((c) => !c.muerto)).toBe(true);
  });

  it('comen cuando tienen hambre y duermen de noche', () => {
    const w = Mundo.nueva(42);
    const c = w.colonos[0]!;
    c.hambre = 0.1;
    const comida = w.existencias('comida');
    segundos(w, 30);
    expect(c.hambre).toBeGreaterThan(0.3);
    expect(w.existencias('comida')).toBeLessThan(comida);
    // Avanza hasta la noche.
    while (w.hora < 23) w.paso();
    segundos(w, 20);
    expect(w.colonos.some((k) => k.tarea?.t === 'dormir')).toBe(true);
  });
});

describe('fábrica', () => {
  it('taladro → cinta → insertador → horno → insertador → cofre', () => {
    const w = Mundo.nueva(99);
    w.investigacion.hechas = ['cintas', 'electricidad'];
    const [hx, hy] = mancha(w, 1);
    despejar(w, hx, hy - 3, hx + 12, hy + 4);
    const t = w.colocar('taladro', hx, hy, 0, true) as Edificio;
    t.combustible = { item: 'carbon', n: 30 };
    for (let k = 0; k < 4; k++) w.colocar('cinta', hx + 2 + k, hy, 0, true);
    w.colocar('insertador', hx + 6, hy, 0, true);
    const h = w.colocar('horno', hx + 7, hy, 0, true) as Edificio;
    h.combustible = { item: 'carbon', n: 30 };
    w.colocar('insertador', hx + 9, hy, 0, true);
    const cofre = w.colocar('cofre', hx + 10, hy, 0, true) as Edificio;
    const gen = w.colocar('generador', hx + 2, hy + 2, 0, true) as Edificio;
    gen.combustible = { item: 'carbon', n: 30 };
    // Que los colonos no toquen nada.
    for (const c of w.colonos) c.muerto = true;
    segundos(w, 120);
    const placas = cofre.inv.reduce((s, p) => s + (p.item === 'placaHierro' ? p.n : 0), 0);
    expect(placas).toBeGreaterThan(15);
    expect(w.contaminacionTotal).toBeGreaterThan(0);
  });

  it('la ensambladora fabrica con energía y para sin ella', () => {
    const w = Mundo.nueva(5);
    w.investigacion.hechas = ['cintas', 'electricidad', 'automatizacion'];
    const [x, y] = w.inicio;
    despejar(w, x - 8, y - 8, x - 2, y - 2);
    const a = w.colocar('ensambladora', x - 8, y - 8, 0, true) as Edificio;
    a.receta = 'engranaje';
    a.entrada = { placaHierro: 6 };
    for (const c of w.colonos) c.muerto = true;
    segundos(w, 10);
    expect(a.salida).toBeNull();
    const g = w.colocar('generador', x - 5, y - 8, 0, true) as Edificio;
    g.combustible = { item: 'madera', n: 10 };
    segundos(w, 10);
    expect(a.salida?.n).toBe(3);
  });
});

describe('criaturas', () => {
  it('las torretas con munición frenan una incursión', () => {
    const w = Mundo.nueva(11);
    w.investigacion.hechas = ['defensa'];
    const [x, y] = w.inicio;
    despejar(w, x - 14, y - 3, x + 2, y + 3);
    const t1 = w.colocar('torreta', x - 3, y - 1, 0, true) as Edificio;
    const t2 = w.colocar('torreta', x - 3, y + 1, 0, true) as Edificio;
    t1.balas = t2.balas = 200;
    for (let k = 0; k < 8; k++)
      w.criaturas.push({ id: 1000 + k, tipo: 'larva', x: x - 13 + (k % 3) * 0.3, y: y + (k % 4) * 0.3, hp: 18, hpMax: 18, nido: null, modo: 'ataque', objetivo: null, cd: 0, golpe: 0, mira: 0, paso: 0 });
    segundos(w, 20);
    expect(w.criaturas.filter((c) => c.id >= 1000).length).toBe(0);
    expect(w.colonos.every((c) => !c.muerto)).toBe(true);
  });

  it('la contaminación que llega a un nido se convierte en un ataque', () => {
    const w = Mundo.nueva(21);
    const n = w.nidos[0]!;
    w.mapa.contaminar(n.x, n.y, 400);
    segundos(w, 3);
    expect(n.ira + n.grupo.length * 4).toBeGreaterThan(0);
    expect(w.criaturas.length).toBeGreaterThan(0);
    // El grupo sale a por lo que contamina (aquí, lo único que hay).
    w.colocar('cama', w.inicio[0] + 2, w.inicio[1] + 2, 0, true);
    let atacaron = false;
    for (let k = 0; k < 170 && !atacaron; k++) {
      segundos(w, 1);
      atacaron = w.criaturas.some((c) => c.modo === 'ataque');
    }
    expect(atacaron).toBe(true);
    expect(w.evolucion).toBeGreaterThan(0);
  });
});

describe('investigación y guardado', () => {
  it('la investigación gasta paquetes de ciencia de la mesa', () => {
    const w = Mundo.nueva(3);
    w.investigacion.hechas = ['cintas'];
    w.elegirInvestigacion('electricidad');
    const [x, y] = w.inicio;
    despejar(w, x - 6, y - 6, x - 3, y - 5);
    const mesa = w.colocar('mesaInvestigacion', x - 6, y - 6, 0, true) as Edificio;
    expect(w.investigar(mesa, 50)).toBe(false);
    mesa.entrada = { cienciaRoja: 10 };
    for (let k = 0; k < 400 && !w.investigado('electricidad'); k++) w.investigar(mesa, 1);
    expect(w.investigado('electricidad')).toBe(true);
    expect(mesa.entrada.cienciaRoja ?? 0).toBe(0);
  });

  it('guardar y cargar conserva la partida', () => {
    const w = Mundo.nueva(77);
    w.colocar('cama', w.inicio[0] + 3, w.inicio[1] - 3, 0);
    segundos(w, 20);
    const w2 = deserializar(serializar(w))!;
    expect(w2).not.toBeNull();
    expect(w2.tick).toBe(w.tick);
    expect(w2.edificios.size).toBe(w.edificios.size);
    expect(w2.colonos.map((c) => c.nombre)).toEqual(w.colonos.map((c) => c.nombre));
    expect([...w2.mapa.suelo]).toEqual([...w.mapa.suelo]);
    segundos(w2, 5);
  });
});

describe('panel de administración', () => {
  it('construcción gratis, modo dios, pacífico, energía y combustible infinitos', () => {
    const w = Mundo.nueva(31);
    const [x, y] = w.inicio;
    despejar(w, x - 8, y - 8, x - 2, y - 2);
    w.admin.gratis = true;
    const cama = w.colocar('cama', x - 8, y - 8, 0) as Edificio;
    expect(cama.construido).toBe(true);

    w.admin.dios = true;
    const c = w.colonos[0]!;
    c.hambre = 0;
    segundos(w, 5);
    expect(c.hp).toBe(100);

    w.admin.pacifico = true;
    const n = w.nidos[0]!;
    w.mapa.contaminar(n.x, n.y, 1000);
    w.proximaIncursion = w.tick + 1;
    segundos(w, 5);
    expect(w.criaturas.length).toBe(0);

    w.investigacion.hechas = ['cintas', 'electricidad', 'automatizacion'];
    w.admin.energia = true;
    const a = w.colocar('ensambladora', x - 6, y - 8, 0) as Edificio;
    a.receta = 'engranaje';
    a.entrada = { placaHierro: 2 };
    segundos(w, 5);
    expect(a.salida?.n).toBe(1);

    w.admin.combustible = true;
    const h = w.colocar('horno', x - 4, y - 6, 0) as Edificio;
    h.entrada = { hierro: 2 };
    for (const k of w.colonos) k.muerto = true;
    segundos(w, 10);
    expect(h.salida?.item).toBe('placaHierro');
    expect(h.combustible).toBeNull();
  });

  it('los interruptores se guardan con la partida', () => {
    const w = Mundo.nueva(32);
    w.admin.dios = true;
    w.admin.pacifico = true;
    const w2 = deserializar(serializar(w))!;
    expect(w2.admin.dios).toBe(true);
    expect(w2.admin.pacifico).toBe(true);
    expect(w2.admin.gratis).toBe(false);
  });
});

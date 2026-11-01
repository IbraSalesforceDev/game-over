import { describe, expect, it } from 'vitest';
import { pasoNave, telemetria } from '../src/orbita/fisica';
import { adelanto } from '../src/orbita/ia';
import { Vuelo } from '../src/orbita/juego';
import { elementos } from '../src/orbita/kepler';
import { crearMercado, precio, tickMercado, vender } from '../src/orbita/mercado';
import { Nave, costeDiseno, etapas } from '../src/orbita/nave';
import { PARTES, RAZAS, parte } from '../src/orbita/partes';
import { disenoInicial, disenosDeEjemplo, nuevaPartida } from '../src/orbita/partida';
import { CUERPOS, GAIA, posCuerpo, velCuerpo } from '../src/orbita/sistema';
import { TECNOLOGIAS, puedeInvestigar } from '../src/orbita/tecnologia';
import { angulo, largo, polar, resta, rng, v } from '../src/orbita/vec';

function enOrbita(n: Nave, alt: number): void {
  const r = GAIA.radio + alt;
  n.pos = v(0, r);
  n.vel = v(-Math.sqrt(GAIA.gm / r), 0);
  n.ang = Math.PI;
}

describe('órbitas', () => {
  it('una órbita circular sigue circular tras una vuelta entera', () => {
    const n = Nave.desde(disenoInicial('humana'));
    enOrbita(n, 100_000);
    const r0 = largo(n.pos);
    const el0 = elementos(n.pos, n.vel, GAIA.gm);
    expect(el0.e).toBeLessThan(1e-6);
    const h = 0.5;
    for (let t = 0; t < el0.periodo; t += h) pasoNave(n, h, t);
    const el = elementos(n.pos, n.vel, GAIA.gm);
    expect(Math.abs(el.a - el0.a) / el0.a).toBeLessThan(0.002);
    expect(Math.abs(largo(n.pos) - r0) / r0).toBeLessThan(0.01);
  });

  it('los elementos de una elipse dan apoapsis y periapsis correctos', () => {
    const rp = GAIA.radio + 80_000;
    const ra = GAIA.radio + 300_000;
    const a = (rp + ra) / 2;
    const vp = Math.sqrt(GAIA.gm * (2 / rp - 1 / a));
    const el = elementos(v(rp, 0), v(0, vp), GAIA.gm);
    expect(el.periapsis).toBeCloseTo(rp, -1);
    expect(el.apoapsis).toBeCloseTo(ra, -1);
  });

  it('las esferas de influencia de las lunas no se solapan', () => {
    const selene = CUERPOS.find((c) => c.id === 'selene')!;
    const xyl = CUERPOS.find((c) => c.id === 'xyl')!;
    expect(selene.orbita!.radio + selene.soi).toBeLessThan(xyl.orbita!.radio - xyl.soi);
  });
});

describe('diseños', () => {
  it('la nave inicial tiene Δv de sobra para una misión de minería', () => {
    for (const r of ['humana', 'alien'] as const) {
      const ets = etapas(disenoInicial(r), 9.8);
      expect(ets[0]!.twr).toBeGreaterThan(1.2);
      expect(ets.reduce((s, e) => s + e.dvVac, 0)).toBeGreaterThan(1800);
      expect(costeDiseno(disenoInicial(r))).toBeLessThan(nuevaPartida(r).creditos / 3);
    }
  });

  it('todas las piezas de los diseños de ejemplo existen y son de su raza', () => {
    for (const r of ['humana', 'alien'] as const) {
      for (const d of disenosDeEjemplo(r)) {
        for (const x of d.pila) {
          const p = parte(x.parte);
          expect(p.raza === 'ambas' || p.raza === r).toBe(true);
          if (x.radial) expect(parte(x.radial).montaje).not.toBe('pila');
        }
      }
    }
  });

  it('cada pieza pide una tecnología que existe', () => {
    const ids = new Set(['base', ...TECNOLOGIAS.map((t) => t.id)]);
    for (const p of PARTES) expect(ids.has(p.tech)).toBe(true);
    for (const t of TECNOLOGIAS) for (const r of t.requiere) expect(ids.has(r)).toBe(true);
  });

  it('el árbol respeta los requisitos', () => {
    expect(puedeInvestigar('propulsion1', new Set())).toBe(true);
    expect(puedeInvestigar('propulsion2', new Set(['propulsion1']))).toBe(false);
    expect(puedeInvestigar('propulsion2', new Set(['propulsion1', 'estructura1']))).toBe(true);
  });
});

describe('etapas y daño', () => {
  it('Espacio enciende y luego suelta la etapa de abajo', () => {
    const d = disenosDeEjemplo('humana')[1]!;
    const n = Nave.desde(d);
    enOrbita(n, 100_000);
    const masa = n.masa();
    const largoAntes = n.nodos.length;
    expect(n.etapa()).toBeNull();
    expect(n.encendida).toBe(true);
    const restos = n.etapa();
    expect(restos).not.toBeNull();
    expect(n.nodos.length + restos!.nodos.length).toBe(largoAntes);
    expect(n.masa() + restos!.masa()).toBeCloseTo(masa, 6);
    // La parte de arriba no se mueve al soltar la de abajo.
    expect(n.nodos.at(-1)!.parte.forma).not.toBe('desacoplador');
  });

  it('el blindaje recibe los golpes y sin mando la nave se pierde', () => {
    const n = Nave.desde({
      nombre: 'prueba',
      raza: 'humana',
      pila: [
        { parte: 'h_alondra', radial: null },
        { parte: 'h_placa', radial: null },
        { parte: 'h_t400', radial: null },
        { parte: 'h_saltamontes', radial: null },
      ],
    });
    const azar = rng(5);
    let placa = 0;
    for (let i = 0; i < 40; i++) {
      const antes = n.nodos[1]!.hp;
      n.danar(1, azar);
      if (n.nodos[1]!.hp < antes) placa++;
    }
    expect(placa).toBeGreaterThan(14);
    for (let i = 0; i < 200 && n.controlable; i++) n.danar(50, azar);
    expect(n.controlable).toBe(false);
  });
});

describe('vuelo', () => {
  it('la nave inicial llega a órbita estable con un giro gravitatorio', () => {
    for (const raza of ['humana', 'alien'] as const) {
      const p = nuevaPartida(raza);
      const vu = new Vuelo(p, disenoInicial(raza), false);
      const n = vu.jugador;
      n.etapa();
      n.acel = 1;
      let fase: 'ascenso' | 'costa' | 'circular' | 'hecho' = 'ascenso';
      const dt = 1 / 30;
      for (let i = 0; i < 30 * 900 && fase !== 'hecho'; i++) {
        const tel = telemetria(n, vu.t);
        const c = tel.cuerpo;
        const rel = resta(n.pos, posCuerpo(c, vu.t));
        const arriba = angulo(rel);
        const el = elementos(rel, tel.velRel, c.gm);
        const techo = c.atm!.techo;
        let objetivo = n.ang;
        if (fase === 'ascenso') {
          const giro = Math.min(1, Math.max(0, (tel.altitud - 500) / (techo * 0.8)));
          objetivo = arriba + Math.sqrt(giro) * (Math.PI / 2) * 0.9;
          if (tel.altitud > 1000 && !el.escapa && el.apoapsis - c.radio > techo + 18_000) {
            fase = 'costa';
            n.acel = 0;
          }
        } else if (fase === 'costa') {
          objetivo = angulo(tel.velRel);
          const vVert = (tel.velRel.x * rel.x + tel.velRel.y * rel.y) / largo(rel);
          if (vVert < 15 && tel.altitud > techo) {
            fase = 'circular';
            n.acel = 1;
          }
        } else if (fase === 'circular') {
          objetivo = angulo(tel.velRel);
          if (el.periapsis - c.radio > techo + 4_000) {
            n.acel = 0;
            fase = 'hecho';
          }
        }
        // Piloto simple: el giro sigue al rumbo objetivo.
        let d = (objetivo - n.ang) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        n.giro = Math.max(-1, Math.min(1, d * 4 - n.omega * 2));
        vu.paso(dt);
        expect(n.controlable).toBe(true);
        if (process.env.DEPURAR && i % 300 === 0) console.log(raza, fase, (i * dt).toFixed(0), tel.altitud.toFixed(0), (el.apoapsis - c.radio).toFixed(0), (el.periapsis - c.radio).toFixed(0), n.combustibleEtapa().toFixed(2), largo(tel.velRel).toFixed(0), n.posado);
      }
      expect(fase).toBe('hecho');
      // Y sobra combustible para ir a minar y volver.
      expect(n.combustibleEtapa()).toBeGreaterThan(0.9);
    }
  });

  it('el paracaídas posa la nave sana desde 15 km', () => {
    const p = nuevaPartida('humana');
    const vu = new Vuelo(p, disenoInicial('humana'), false);
    const n = vu.jugador;
    const c = GAIA;
    n.posado = null;
    n.pos = polar(1.2, c.radio + 15_000);
    n.vel = v(0, 0);
    n.ang = 1.2;
    n.paracaidas = true;
    for (let i = 0; i < 60 * 600 && !n.posado; i++) {
      vu.paso(1 / 60);
      expect(n.controlable).toBe(true);
    }
    expect(n.posado).not.toBeNull();
    void velCuerpo;
  });

  it('el adelanto acierta a un blanco en movimiento uniforme', () => {
    const b = { pos: v(1000, 0), vel: v(0, 50) };
    const punto = adelanto(v(0, 0), v(0, 0), b, 500);
    const t = largo(punto) / 500;
    expect(Math.abs(punto.y - b.vel.y * t)).toBeLessThan(1);
  });

  it('en guerra llegan incursiones y derribarlas da créditos', () => {
    const p = nuevaPartida('humana');
    const vu = new Vuelo(p, disenoInicial('humana'), false);
    vu.jugador.posado = null;
    enOrbita(vu.jugador, 150_000);
    p.diplomacia.estado = 'guerra';
    vu.incursion(2, 1);
    const enemigas = vu.naves.filter((x) => x.raza === 'alien');
    expect(enemigas.length).toBe(2);
    const antes = p.creditos;
    for (const e of enemigas) e.romper(0);
    vu.paso(1 / 60);
    expect(p.creditos).toBeGreaterThan(antes);
    expect(p.diplomacia.derribadas).toBe(2);
  });
});

describe('mercado', () => {
  it('vender hunde el precio y el tiempo lo recupera', () => {
    const m = crearMercado();
    const p0 = precio(m, 'platino', false);
    const ingreso = vender(m, 'platino', 20, false);
    expect(ingreso).toBeLessThan(p0 * 20);
    expect(precio(m, 'platino', false)).toBeLessThan(p0 * 0.8);
    tickMercado(m, 0, 6 * 3600 * 4, false);
    expect(m.cot.platino.saturacion).toBeLessThan(0.1);
  });

  it('la raza humana vende más caro', () => {
    expect(RAZAS.humana.venta).toBeGreaterThan(RAZAS.alien.venta);
  });
});

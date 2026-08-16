import { describe, expect, it } from 'vitest';
import { generarMundo } from '../src/world/gen/worldgen';
import {
  CABANA,
  estructuraMasCercana,
  FORTALEZA,
  MINA,
  nombreEstructura,
  rumbo,
} from '../src/world/estructuras';
import { AIRE, ALTAR, LADRILLO } from '../src/world/tiles';
import { Inventario } from '../src/items/inventory';
import {
  faltaParaOfrenda,
  OFRENDA,
  pagarOfrenda,
  puedeInvocar,
  textoFalta,
} from '../src/world/altar';
import { GEL, HUESO, LINGOTE_ORO, LINGOTE_PLATA, RELIQUIA } from '../src/items/items';

const OP = { ancho: 400, alto: 300, semilla: 'FORTALEZA' };

describe('estructuras del mundo', () => {
  it('todo mundo tiene una fortaleza, y solo una', () => {
    const { estructuras } = generarMundo(OP);
    const fortalezas = estructuras.filter((e) => e.tipo === FORTALEZA);
    expect(fortalezas).toHaveLength(1);
  });

  it('la fortaleza queda apuntada donde está el altar', () => {
    const { mundo, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;
    expect(mundo.getTile(f.tx, f.ty)).toBe(ALTAR);
  });

  it('la fortaleza es de ladrillo y por dentro está hueca', () => {
    const { mundo, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;

    // El altar se apoya en su pedestal de ladrillo.
    expect(mundo.getTile(f.tx, f.ty + 1)).toBe(LADRILLO);
    // Y la sala que lo rodea es aire con pared de ladrillo detrás: si fuera
    // aire sin pared, el jugador estaría mirando al vacío en vez de a una sala.
    expect(mundo.getTile(f.tx + 4, f.ty)).toBe(AIRE);
    expect(mundo.getPared(f.tx + 4, f.ty)).toBe(LADRILLO);
  });

  it('la fortaleza no queda pegada al punto de aparición', () => {
    const { spawnTx, estructuras } = generarMundo(OP);
    const f = estructuras.find((e) => e.tipo === FORTALEZA)!;
    // Al menos un cuarto del mundo de distancia: si estuviera al lado, se
    // encontraría el primer día cavando recto hacia abajo.
    expect(Math.abs(f.tx - spawnTx)).toBeGreaterThan(OP.ancho * 0.2);
  });

  it('también salen cabañas y minas', () => {
    const { estructuras } = generarMundo(OP);
    expect(estructuras.some((e) => e.tipo === CABANA)).toBe(true);
    expect(estructuras.some((e) => e.tipo === MINA)).toBe(true);
  });

  it('las estructuras traen cofres con botín dentro', () => {
    const { cofres } = generarMundo(OP);
    expect(cofres.length).toBeGreaterThan(0);
    for (const c of cofres) {
      expect(c.ranuras.length).toBeGreaterThan(0);
      for (const [objeto, cantidad] of c.ranuras) {
        expect(objeto).toBeGreaterThan(0);
        expect(cantidad).toBeGreaterThan(0);
      }
    }
  });

  it('la misma semilla pone las estructuras en el mismo sitio', () => {
    const a = generarMundo(OP);
    const b = generarMundo(OP);
    expect(a.estructuras).toEqual(b.estructuras);
    expect(a.cofres).toEqual(b.cofres);
  });

  it('semillas distintas mueven la fortaleza', () => {
    const a = generarMundo(OP);
    const b = generarMundo({ ...OP, semilla: 'OTRA' });
    const fa = a.estructuras.find((e) => e.tipo === FORTALEZA)!;
    const fb = b.estructuras.find((e) => e.tipo === FORTALEZA)!;
    expect(fa.tx === fb.tx && fa.ty === fb.ty).toBe(false);
  });
});

describe('encontrar estructuras', () => {
  const lista = [
    { tipo: FORTALEZA, tx: 800, ty: 200 } as const,
    { tipo: CABANA, tx: 120, ty: 60 } as const,
    { tipo: MINA, tx: 140, ty: 90 } as const,
  ];

  it('devuelve la más cercana y su distancia', () => {
    const r = estructuraMasCercana(lista, 130, 62)!;
    expect(r.estructura.tipo).toBe(CABANA);
    expect(r.distancia).toBeCloseTo(Math.hypot(10, 2));
  });

  it('sin estructuras no hay nada que señalar', () => {
    expect(estructuraMasCercana([], 0, 0)).toBeNull();
  });

  it('el rumbo dice hacia dónde tirar', () => {
    expect(rumbo(100, 2)).toBe('este');
    expect(rumbo(-100, 2)).toBe('oeste');
    expect(rumbo(2, 100)).toBe('abajo');
    expect(rumbo(80, 80)).toBe('este y abajo');
  });

  it('cada tipo tiene nombre', () => {
    expect(nombreEstructura(FORTALEZA)).toBe('Fortaleza');
    expect(nombreEstructura(99)).toBe('Estructura');
  });
});

describe('el altar', () => {
  function conOfrenda(): Inventario {
    const inv = new Inventario(40);
    for (const [objeto, cantidad] of OFRENDA) inv.anadir(objeto, cantidad);
    return inv;
  }

  it('con el zurrón vacío falta todo', () => {
    const falta = faltaParaOfrenda(new Inventario(40));
    expect(falta).toHaveLength(OFRENDA.length);
    expect(puedeInvocar(new Inventario(40))).toBe(false);
  });

  it('con la ofrenda completa se puede invocar', () => {
    expect(puedeInvocar(conOfrenda())).toBe(true);
  });

  it('faltando una sola reliquia, no', () => {
    const inv = conOfrenda();
    inv.quitar(RELIQUIA, 1);
    expect(puedeInvocar(inv)).toBe(false);
    const falta = faltaParaOfrenda(inv);
    expect(falta).toEqual([{ objeto: RELIQUIA, faltan: 1 }]);
    expect(textoFalta(falta)).toContain('reliquia');
  });

  it('pagar deja el zurrón sin la ofrenda y no toca lo demás', () => {
    const inv = conOfrenda();
    inv.anadir(HUESO, 3);
    expect(pagarOfrenda(inv)).toBe(true);
    // Los huesos de más se quedan; los cinco de la ofrenda se van.
    expect(inv.contar(HUESO)).toBe(3);
    expect(inv.contar(GEL)).toBe(0);
    expect(inv.contar(LINGOTE_ORO)).toBe(0);
    expect(inv.contar(LINGOTE_PLATA)).toBe(0);
    expect(inv.contar(RELIQUIA)).toBe(0);
  });

  it('sin la ofrenda entera no se cobra nada', () => {
    const inv = conOfrenda();
    inv.quitar(GEL, 1);
    expect(pagarOfrenda(inv)).toBe(false);
    // Ni un lingote de menos: cobrar a medias dejaría sin material y sin jefe.
    expect(inv.contar(LINGOTE_ORO)).toBe(25);
    expect(inv.contar(GEL)).toBe(99);
  });

  it('el oro y la plata suman los cincuenta lingotes prometidos', () => {
    const oro = OFRENDA.find(([o]) => o === LINGOTE_ORO)![1];
    const plata = OFRENDA.find(([o]) => o === LINGOTE_PLATA)![1];
    expect(oro + plata).toBe(50);
  });
});

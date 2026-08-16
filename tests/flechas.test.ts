import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import { crearEnemigo, type Enemigo } from '../src/entities/enemies';
import {
  actualizarFlechas,
  anadirFlecha,
  crearFlecha,
  dispararDesde,
  limpiarFlechas,
  TOPE_FLECHAS,
  VIDA_CLAVADA,
  type Flecha,
} from '../src/entities/proyectiles';
import { Inventario } from '../src/items/inventory';
import { ARCO, defObjeto, esArco, FLECHA, municionDe, NADA } from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { PIEDRA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

/**
 * Arco y flechas.
 *
 * Lo que más importa aquí es que una flecha no atraviese nada: a nueve píxeles
 * por tick cruza un slime entero entre dos fotogramas, y esa es exactamente la
 * clase de fallo que solo se nota jugando y nunca se sabe reproducir.
 */

const SUELO = 30;

function mundoLlano(): Mundo {
  const m = new Mundo(120, 60);
  m.rellenar(0, SUELO, 119, 59, TIERRA);
  return m;
}

function tirador(): Caja {
  return crearCaja(20 * TILE, (SUELO - 3) * TILE, 26, 46);
}

/** Corre el mundo hasta que la flecha deje de estar en el aire. */
function volarHasta(m: Mundo, f: Flecha, enemigos: Enemigo[] = [], topes = 600) {
  const lista = [f];
  for (let i = 0; i < topes; i++) {
    const r = actualizarFlechas(m, lista, enemigos);
    if (r.impactos.length > 0) return { fin: 'impacto' as const, r };
    if (f.clavada) return { fin: 'clavada' as const, r };
    if (!f.vivo) return { fin: 'perdida' as const, r };
  }
  return { fin: 'volando' as const, r: null };
}

describe('el arco', () => {
  it('es un arma a distancia que gasta flechas', () => {
    expect(esArco(ARCO)).toBe(true);
    expect(municionDe(ARCO)).toBe(FLECHA);
    expect(defObjeto(ARCO).dano!).toBeGreaterThan(0);
    expect(defObjeto(ARCO).velocidad!).toBeGreaterThan(0);
  });

  it('pega menos por tiro que la espada de piedra, pero desde lejos', () => {
    const espada = RECETAS.find((r) => r.id === 'espada-piedra')!;
    expect(defObjeto(ARCO).dano!).toBeLessThan(defObjeto(espada.resultado).dano!);
  });

  it('el arco y las flechas se hacen en la mesa, sin metal', () => {
    for (const id of ['arco', 'flechas']) {
      const r = RECETAS.find((x) => x.id === id)!;
      expect(r.estacion).not.toBeNull();
      // Nada de lingotes: tiene que estar disponible la primera noche.
      for (const [ing] of r.ingredientes) expect(ing).toBeLessThan(64);
    }
    expect(RECETAS.find((x) => x.id === 'flechas')!.cantidad).toBeGreaterThan(1);
  });

  it('cada disparo gasta exactamente una flecha del inventario', () => {
    const inv = new Inventario();
    inv.anadir(FLECHA, 3);
    expect(inv.quitar(FLECHA, 1)).toBe(1);
    expect(inv.contar(FLECHA)).toBe(2);
  });

  it('quitar más de lo que hay quita lo que hay y lo dice', () => {
    const inv = new Inventario();
    inv.anadir(FLECHA, 2);
    expect(inv.quitar(FLECHA, 5)).toBe(2);
    expect(inv.contar(FLECHA)).toBe(0);
    expect(inv.quitar(FLECHA, 1)).toBe(0);
    expect(inv.quitar(NADA, 1)).toBe(0);
  });

  it('vacía primero las pilas pequeñas, para consolidar', () => {
    const inv = new Inventario();
    inv.ponerEn(0, FLECHA, 10);
    inv.ponerEn(1, FLECHA, 2);
    inv.quitar(FLECHA, 2);
    expect(inv.ranuras[0]!.cantidad).toBe(10);
    expect(inv.ranuras[1]!.objeto).toBe(NADA);
  });
});

describe('apuntar', () => {
  it('sale del pecho y hacia donde apunta el ratón', () => {
    const c = tirador();
    const derecha = dispararDesde(c, c.x + 200, c.y, 9, 10);
    expect(derecha.vx).toBeGreaterThan(0);
    const izquierda = dispararDesde(c, c.x - 200, c.y, 9, 10);
    expect(izquierda.vx).toBeLessThan(0);
    const arriba = dispararDesde(c, c.x, c.y - 200, 9, 10);
    expect(arriba.vy).toBeLessThan(0);
  });

  it('sale siempre a la velocidad pedida, apunte donde apunte', () => {
    const c = tirador();
    for (const [dx, dy] of [[100, 0], [0, -100], [-70, 70], [3, 400]] as const) {
      const f = dispararDesde(c, c.x + dx, c.y + dy, 9, 10);
      expect(Math.hypot(f.vx, f.vy)).toBeCloseTo(9, 5);
    }
  });

  it('apuntarse a uno mismo dispara hacia donde se mira', () => {
    const c = tirador();
    c.mirando = -1;
    const f = dispararDesde(c, c.x + c.ancho / 2, c.y + c.alto * 0.4, 9, 10);
    expect(f.vx).toBeLessThan(0);
  });
});

describe('el vuelo', () => {
  it('se clava en el terreno y no lo atraviesa', () => {
    const m = mundoLlano();
    const c = tirador();
    const f = dispararDesde(c, c.x, c.y + 400, 9, 10);
    const { fin } = volarHasta(m, f);
    expect(fin).toBe('clavada');
    expect(Math.floor(f.y / TILE)).toBeLessThanOrEqual(SUELO);
  });

  it('una flecha rapidísima tampoco atraviesa una pared de un tile', () => {
    const m = mundoLlano();
    const c = tirador();
    for (let ty = SUELO - 6; ty < SUELO; ty++) m.setTile(30, ty, PIEDRA);
    // Cuarenta píxeles por tick: dos tiles y medio de golpe.
    const f = dispararDesde(c, c.x + 400, c.y + c.alto * 0.4, 40, 10);
    volarHasta(m, f);
    expect(f.clavada).toBe(true);
    expect(Math.floor(f.x / TILE)).toBeLessThanOrEqual(30);
  });

  it('cae con el vuelo: acaba más abajo que la línea recta', () => {
    const m = mundoLlano();
    const c = tirador();
    const f = dispararDesde(c, c.x + 900, c.y + c.alto * 0.4, 9, 10);
    const y0 = f.y;
    volarHasta(m, f);
    expect(f.y).toBeGreaterThan(y0);
  });

  it('acierta a un enemigo que tiene delante', () => {
    const m = mundoLlano();
    const c = tirador();
    // A la altura del pecho y cerca: así la caída del vuelo no la mete por
    // debajo del bicho, que es lo que pasa disparando en horizontal a lo lejos.
    const e = crearEnemigo('slime', c.x + 70, c.y + c.alto * 0.4 - 8);
    const f = dispararDesde(c, e.caja.x + 11, e.caja.y + 8, 9, 12);
    const { fin, r } = volarHasta(m, f, [e]);
    expect(fin).toBe('impacto');
    expect(r!.impactos[0]!.enemigo).toBe(e);
    expect(e.salud.vida).toBeLessThan(e.salud.vidaMax);
    expect(f.vivo).toBe(false);
  });

  it('no atraviesa al enemigo aunque vaya muy rápido', () => {
    const m = mundoLlano();
    const c = tirador();
    const e = crearEnemigo('slime', c.x + 60, c.y + 10);
    // Un slime mide 22 px y la flecha avanza 60 por tick: sin subdividir, entre
    // dos fotogramas se lo salta entero.
    const f = dispararDesde(c, e.caja.x + 11, e.caja.y + 8, 60, 12);
    const { fin } = volarHasta(m, f, [e]);
    expect(fin).toBe('impacto');
  });

  it('un enemigo muerto ya no para flechas', () => {
    const m = mundoLlano();
    const c = tirador();
    const e = crearEnemigo('slime', c.x + 60, c.y + 10);
    e.vivo = false;
    const f = dispararDesde(c, e.caja.x + 11, e.caja.y + 8, 9, 12);
    const { fin } = volarHasta(m, f, [e]);
    expect(fin).not.toBe('impacto');
  });

  it('la que se va del mundo se pierde en vez de volar para siempre', () => {
    const m = mundoLlano();
    const f = crearFlecha(5, 5 * TILE, -20, -20, 10);
    const { fin } = volarHasta(m, f);
    expect(fin).toBe('perdida');
  });

  it('la clavada desaparece al cabo de un rato', () => {
    const m = mundoLlano();
    const c = tirador();
    const f = dispararDesde(c, c.x, c.y + 400, 9, 10);
    volarHasta(m, f);
    expect(f.clavada).toBe(true);
    for (let i = 0; i <= VIDA_CLAVADA; i++) actualizarFlechas(m, [f], []);
    expect(f.vivo).toBe(false);
  });

  it('una clavada ya no hace daño a quien pase por encima', () => {
    const m = mundoLlano();
    const c = tirador();
    const f = dispararDesde(c, c.x, c.y + 400, 9, 10);
    volarHasta(m, f);
    const e = crearEnemigo('slime', f.x - 8, f.y - 8);
    const r = actualizarFlechas(m, [f], [e]);
    expect(r.impactos).toHaveLength(0);
    expect(e.salud.vida).toBe(e.salud.vidaMax);
  });
});

describe('el tope de flechas', () => {
  it('nunca se acumulan más de las que caben', () => {
    const lista: Flecha[] = [];
    for (let i = 0; i < TOPE_FLECHAS * 3; i++) {
      anadirFlecha(lista, crearFlecha(i, 0, 1, 0, 5));
    }
    expect(lista.length).toBeLessThanOrEqual(TOPE_FLECHAS);
    // La última disparada siempre está: sacrificar la nueva sería no disparar.
    expect(lista[lista.length - 1]!.x).toBe(TOPE_FLECHAS * 3 - 1);
  });

  it('limpiar quita las muertas y deja las vivas', () => {
    const lista = [crearFlecha(0, 0, 1, 0, 5), crearFlecha(1, 0, 1, 0, 5)];
    lista[0]!.vivo = false;
    limpiarFlechas(lista);
    expect(lista).toHaveLength(1);
    expect(lista[0]!.x).toBe(1);
  });
});

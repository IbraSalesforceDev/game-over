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
import {
  ARCO,
  ARCO_CAZA,
  ARCO_COBALTO,
  ARCO_INFERNAL,
  defObjeto,
  esArco,
  esMunicion,
  FLECHA,
  FLECHA_FUEGO,
  FLECHA_HIERRO,
  FLECHA_HUESO,
  FLECHAS,
  municionDe,
  NADA,
  objetoExisteEn,
  puntaDe,
} from '../src/items/items';
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

describe('las tres puntas (5.4.0)', () => {
  /** Un mundo vacío con suelo, para que nada estorbe. */
  function cielo(): Mundo {
    const m = new Mundo(120, 40);
    m.rellenar(0, 35, 119, 39, PIEDRA);
    return m;
  }

  /**
   * Una fila de bichos, todos a la misma altura y separados.
   *
   * Zombis y no slimes: el slime mide dieciséis píxeles de alto y la flecha,
   * que cae con la gravedad, le pasa por debajo antes de llegar al tercero. Con
   * cuarenta píxeles de alto el blanco aguanta la caída de todo el recorrido, y
   * lo que se está probando aquí es la perforación, no la balística.
   */
  function fila(cuantos: number, x0: number, paso: number): Enemigo[] {
    const lista: Enemigo[] = [];
    for (let i = 0; i < cuantos; i++) {
      lista.push(crearEnemigo('zombi', x0 + i * paso, 20 * TILE, 1));
    }
    return lista;
  }

  /** Un disparo tenso y corto: la caída no debe decidir estos tests. */
  const tiro = (dano: number, punta = {}): Flecha =>
    crearFlecha(24 * TILE, 20 * TILE + 18, 12, 0, dano, punta);

  it('una flecha lisa se gasta en el primer bicho', () => {
    const m = cielo();
    const bichos = fila(3, 26 * TILE, 24);
    const f = tiro(10);
    const flechas = [f];
    let tocados = new Set<Enemigo>();
    for (let t = 0; t < 60; t++) {
      for (const i of actualizarFlechas(m, flechas, bichos).impactos) tocados.add(i.enemigo);
    }
    expect(tocados.size).toBe(1);
    expect(f.vivo).toBe(false);
  });

  it('la de hueso atraviesa la fila entera', () => {
    const m = cielo();
    const bichos = fila(3, 26 * TILE, 24);
    const f = tiro(10, { perfora: 2, extra: 9 });
    const flechas = [f];
    const tocados = new Set<Enemigo>();
    for (let t = 0; t < 60; t++) {
      for (const i of actualizarFlechas(m, flechas, bichos).impactos) tocados.add(i.enemigo);
    }
    expect(tocados.size).toBe(3);
    // Y el extra de la punta se suma al daño del arco.
    expect(f.dano).toBe(19);
  });

  it('la perforación no se gasta dos veces en el mismo bicho', () => {
    // A ocho píxeles por tick una flecha da dos pasos dentro de un slime de 22
    // de ancho. Sin llevar la cuenta de a quién ya tocó, ese slime se comería
    // la perforación entera él solo y la flecha no llegaría al segundo.
    const m = cielo();
    const bichos = fila(2, 26 * TILE, 24);
    const f = tiro(10, { perfora: 1 });
    const flechas = [f];
    const veces = new Map<Enemigo, number>();
    for (let t = 0; t < 60; t++) {
      for (const i of actualizarFlechas(m, flechas, bichos).impactos) {
        veces.set(i.enemigo, (veces.get(i.enemigo) ?? 0) + 1);
      }
    }
    expect([...veces.values()]).toEqual([1, 1]);
  });

  it('la de fuego reparte a todo lo que hay alrededor', () => {
    const m = cielo();
    // Tres slimes muy juntos: uno en el camino y dos al lado.
    // Muy juntos y muy cerca del tirador: lo que se prueba es el reparto en
    // círculo, y a diez tiles la caída de la flecha decidiría el resultado por
    // su cuenta.
    // Los tres apiñados alrededor del punto de impacto, que es el primero de
    // ellos: lo que se prueba es el reparto en círculo.
    const bichos = [
      crearEnemigo('zombi', 26 * TILE, 20 * TILE, 1),
      crearEnemigo('zombi', 26 * TILE + 18, 20 * TILE, 1),
      crearEnemigo('zombi', 26 * TILE, 20 * TILE + 14, 1),
    ];
    const f = tiro(10, { estalla: 2.2 });
    const flechas = [f];
    const r = { impactos: [] as { enemigo: Enemigo }[], estallidos: [] as unknown[] };
    for (let t = 0; t < 60; t++) {
      const paso = actualizarFlechas(m, flechas, bichos);
      r.impactos.push(...paso.impactos);
      r.estallidos.push(...paso.estallidos);
    }
    expect(r.estallidos).toHaveLength(1);
    expect(new Set(r.impactos.map((i) => i.enemigo)).size).toBe(3);
    // Y la flecha se consume: no sigue volando tras reventar.
    expect(f.vivo).toBe(false);
  });

  it('la de fuego estalla también contra la pared', () => {
    const m = cielo();
    // Un slime pegado al suelo y la flecha apuntada al suelo de al lado.
    const bicho = crearEnemigo('zombi', 30 * TILE, 34 * TILE - 40, 1);
    const vidaAntes = bicho.salud.vida;
    const f = crearFlecha(29 * TILE, 31 * TILE, 4, 6, 20, { estalla: 2.2 });
    const flechas = [f];
    let estallidos = 0;
    for (let t = 0; t < 60; t++) estallidos += actualizarFlechas(m, flechas, [bicho]).estallidos.length;
    expect(estallidos).toBe(1);
    // Le ha llegado sin haberle acertado.
    expect(bicho.salud.vida).toBeLessThan(vidaAntes);
    // Y no se queda clavada de adorno.
    expect(f.clavada).toBe(false);
  });

  it('el daño de la explosión baja con la distancia', () => {
    const m = cielo();
    const cerca = crearEnemigo('zombi', 26 * TILE, 20 * TILE, 1);
    const lejos = crearEnemigo('zombi', 26 * TILE + 26, 20 * TILE, 1);
    const f = tiro(40, { estalla: 2.2 });
    const flechas = [f];
    for (let t = 0; t < 60; t++) actualizarFlechas(m, flechas, [cerca, lejos]);
    expect(cerca.salud.vida).toBeLessThan(lejos.salud.vida);
  });
});

describe('la escalera de arcos y flechas', () => {
  it('cada arco pega más, dispara antes y lanza más rápido que el anterior', () => {
    const escalera = [ARCO, ARCO_CAZA, ARCO_COBALTO, ARCO_INFERNAL];
    for (let i = 1; i < escalera.length; i++) {
      const antes = defObjeto(escalera[i - 1]!);
      const ahora = defObjeto(escalera[i]!);
      expect(ahora.dano!).toBeGreaterThan(antes.dano!);
      expect(ahora.cadencia!).toBeLessThan(antes.cadencia!);
      expect(ahora.velocidad!).toBeGreaterThan(antes.velocidad!);
      expect(esArco(escalera[i]!)).toBe(true);
    }
  });

  it('las puntas no son una escalera: cada una sirve para otra cosa', () => {
    // Si fueran tres números en fila, la última haría inútiles a las otras dos.
    expect(puntaDe(FLECHA).extra).toBe(0);
    expect(puntaDe(FLECHA_HIERRO).extra).toBeGreaterThan(0);
    expect(puntaDe(FLECHA_HIERRO).perfora).toBe(0);
    expect(puntaDe(FLECHA_HUESO).perfora).toBeGreaterThan(0);
    expect(puntaDe(FLECHA_FUEGO).estalla).toBeGreaterThan(0);
    // Y la de más daño bruto no es la que más efectos tiene.
    expect(puntaDe(FLECHA_HUESO).extra).toBeGreaterThan(puntaDe(FLECHA_FUEGO).extra);
  });

  it('la lista de flechas va de peor a mejor y las incluye todas', () => {
    expect(FLECHAS[0]).toBe(FLECHA);
    expect(FLECHAS).toContain(FLECHA_HIERRO);
    expect(FLECHAS).toContain(FLECHA_HUESO);
    expect(FLECHAS).toContain(FLECHA_FUEGO);
    for (const f of FLECHAS) expect(esMunicion(f)).toBe(true);
  });

  it('nada de esto existe antes de 5.4.0', () => {
    for (const id of [ARCO_CAZA, ARCO_COBALTO, ARCO_INFERNAL, FLECHA_HIERRO, FLECHA_HUESO, FLECHA_FUEGO]) {
      expect(objetoExisteEn(id, '5.3.1')).toBe(false);
      expect(objetoExisteEn(id, '5.4.0')).toBe(true);
    }
    // Pero el arco y la flecha de siempre siguen siendo de 3.0.0.
    expect(objetoExisteEn(ARCO, '3.0.0')).toBe(true);
    expect(objetoExisteEn(FLECHA, '3.0.0')).toBe(true);
  });
});

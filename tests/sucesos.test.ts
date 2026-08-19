import { describe, expect, it } from 'vitest';
import {
  cortarSuceso,
  crearSucesos,
  DESCANSO,
  forzarSuceso,
  INTERVALO_SORTEO,
  numeroDeSuceso,
  ORDEN_SUCESOS,
  PROBABILIDAD,
  ritmoDeApariciones,
  ritmoDeElites,
  SUCESOS,
  sucesoDeNumero,
  tickSucesos,
  type ClaseSuceso,
  type ContextoSuceso,
  type EstadoSucesos,
} from '../src/world/sucesos';
import { caerMeteorito, CERCA, excavarCrater, LEJOS, RADIO, rngDe } from '../src/world/meteorito';
import { Mundo } from '../src/world/world';
import {
  AIRE,
  COBALTO,
  esSolido,
  OBSIDIANA,
  HOJAS,
  TIERRA,
  TITANIO,
  TRONCO,
  versionTile,
} from '../src/world/tiles';
import { alMenos } from '../src/core/versiones';

const NOCHE: ContextoSuceso = { esNoche: true, enSuperficie: true };
const DIA: ContextoSuceso = { esNoche: false, enSuperficie: true };

/** Corre el calendario hasta que empiece algo, o se rinde. */
function hastaQueEmpiece(
  e: EstadoSucesos,
  ctx: ContextoSuceso,
  rng: () => number,
  tope = 400_000,
): ClaseSuceso | null {
  for (let t = 0; t < tope; t++) {
    const c = tickSucesos(e, ctx, rng);
    if (c.empieza) return c.empieza;
  }
  return null;
}

describe('el calendario de sucesos (6.7.0)', () => {
  it('nace sin nada en marcha', () => {
    const e = crearSucesos();
    expect(e.activo).toBeNull();
    expect(e.espera).toBe(INTERVALO_SORTEO);
  });

  it('no pasa nada hasta que toca sortear', () => {
    // Con el dado siempre a cero —o sea, siempre acertando— aun así no puede
    // salir nada antes del intervalo: si no, el primer tick de cada partida
    // traería un suceso.
    const e = crearSucesos();
    for (let t = 0; t < INTERVALO_SORTEO - 1; t++) {
      expect(tickSucesos(e, NOCHE, () => 0)).toEqual({});
    }
    expect(tickSucesos(e, NOCHE, () => 0).empieza).toBeDefined();
  });

  it('con el dado en contra no sale nunca', () => {
    const e = crearSucesos();
    expect(hastaQueEmpiece(e, NOCHE, () => 0.99, INTERVALO_SORTEO * 20)).toBeNull();
  });

  it('bajo tierra no empieza ninguno', () => {
    // Los tres pasan arriba: gastarlos con alguien a doscientas filas de hondo
    // sería que el suceso no lo viera nadie.
    const e = crearSucesos();
    const hondo = { ...NOCHE, enSuperficie: false };
    expect(hastaQueEmpiece(e, hondo, () => 0, INTERVALO_SORTEO * 10)).toBeNull();
  });

  it('de día solo puede salir el enjambre', () => {
    // La luna de sangre y la lluvia de estrellas son de noche por definición.
    const e = crearSucesos();
    for (let i = 0; i < 30; i++) {
      const salido = hastaQueEmpiece(e, DIA, rngDe(i + 1));
      if (salido === null) continue;
      expect(salido).toBe('enjambre');
      cortarSuceso(e);
    }
  });

  it('el mismo no sale dos veces seguidas', () => {
    const e = crearSucesos();
    const rng = rngDe(7);
    let anterior: ClaseSuceso | null = null;
    for (let i = 0; i < 20; i++) {
      const salido = hastaQueEmpiece(e, NOCHE, rng);
      if (salido === null) break;
      expect(salido).not.toBe(anterior);
      anterior = salido;
      // Se corta a mano para poder encadenar el siguiente en el mismo test.
      cortarSuceso(e);
    }
    expect(anterior).not.toBeNull();
  });

  it('con el tiempo salen los tres', () => {
    const e = crearSucesos();
    const rng = rngDe(3);
    const vistos = new Set<ClaseSuceso>();
    for (let i = 0; i < 60 && vistos.size < 3; i++) {
      const salido = hastaQueEmpiece(e, i % 4 === 0 ? DIA : NOCHE, rng);
      if (salido) vistos.add(salido);
      cortarSuceso(e);
    }
    expect([...vistos].sort()).toEqual(['enjambre', 'lluviaEstrellas', 'lunaDeSangre']);
  });

  it('la luna de sangre dura hasta que amanece, no un número de ticks', () => {
    // Es lo que convierte aguantar hasta el amanecer en el objetivo. Con un
    // contador sería una cuenta atrás, que es otra cosa.
    const e = crearSucesos();
    forzarSuceso(e, 'lunaDeSangre');
    for (let t = 0; t < 60 * 60 * 5; t++) {
      expect(tickSucesos(e, NOCHE, () => 0.99)).toEqual({});
    }
    expect(tickSucesos(e, DIA, () => 0.99).termina).toBe('lunaDeSangre');
    expect(e.activo).toBeNull();
  });

  it('los que llevan reloj se acaban solos aunque siga siendo de noche', () => {
    for (const clase of ['enjambre', 'lluviaEstrellas'] as ClaseSuceso[]) {
      const e = crearSucesos();
      forzarSuceso(e, clase);
      const dura = SUCESOS[clase].duracion;
      for (let t = 0; t < dura - 1; t++) {
        expect(tickSucesos(e, NOCHE, () => 0.99)).toEqual({});
      }
      expect(tickSucesos(e, NOCHE, () => 0.99).termina).toBe(clase);
    }
  });

  it('detrás de uno viene un descanso, no otro suceso', () => {
    const e = crearSucesos();
    forzarSuceso(e, 'enjambre');
    for (let t = 0; t < SUCESOS.enjambre.duracion; t++) tickSucesos(e, NOCHE, () => 0);
    expect(e.espera).toBe(DESCANSO);
    // Y durante ese descanso, ni con el dado a favor.
    for (let t = 0; t < DESCANSO - 1; t++) {
      expect(tickSucesos(e, NOCHE, () => 0).empieza).toBeUndefined();
    }
  });

  it('mientras hay uno en marcha no empieza otro', () => {
    const e = crearSucesos();
    forzarSuceso(e, 'lunaDeSangre');
    for (let t = 0; t < INTERVALO_SORTEO * 3; t++) {
      expect(tickSucesos(e, NOCHE, () => 0).empieza).toBeUndefined();
    }
    expect(e.activo).toBe('lunaDeSangre');
  });

  it('en un mundo anterior a 6.7.0 no pasa absolutamente nada', () => {
    const e = crearSucesos();
    const viejo = { ...NOCHE, version: '6.6.0' };
    for (let t = 0; t < INTERVALO_SORTEO * 5; t++) {
      expect(tickSucesos(e, viejo, () => 0)).toEqual({});
    }
    expect(e.activo).toBeNull();
  });

  it('cortar y forzar hacen lo que dicen', () => {
    const e = crearSucesos();
    expect(cortarSuceso(e)).toBeNull();
    forzarSuceso(e, 'enjambre');
    expect(e.activo).toBe('enjambre');
    expect(cortarSuceso(e)).toBe('enjambre');
    expect(e.activo).toBeNull();
  });

  it('cada suceso dice quién es y cuándo llegó', () => {
    for (const [clave, def] of Object.entries(SUCESOS)) {
      expect(def.nombre.length, clave).toBeGreaterThan(0);
      expect(def.aviso.length, clave).toBeGreaterThan(0);
      expect(def.despedida.length, clave).toBeGreaterThan(0);
      expect(def.peso, clave).toBeGreaterThan(0);
      expect(def.desde, clave).toBe('6.7.0');
    }
  });

  it('la probabilidad y el intervalo dan un suceso de tarde en tarde', () => {
    // Ni tan a menudo que canse ni tan de tarde en tarde que una partida se
    // acabe sin ver ninguno: entre diez y cuarenta minutos de media.
    const minutos = (INTERVALO_SORTEO / PROBABILIDAD / 60) / 60;
    expect(minutos).toBeGreaterThan(10);
    expect(minutos).toBeLessThan(40);
  });
});

describe('lo que cambia mientras dura', () => {
  it('la luna de sangre multiplica bichos y élites', () => {
    const e = crearSucesos();
    forzarSuceso(e, 'lunaDeSangre');
    expect(ritmoDeApariciones(e)).toBeGreaterThan(1);
    expect(ritmoDeElites(e)).toBeGreaterThan(1);
  });

  it('el enjambre multiplica bichos pero no élites', () => {
    // Cuatro veces más bichos *y* tres veces más élites a la vez sería
    // injugable: cada suceso cambia una regla, no todas.
    const e = crearSucesos();
    forzarSuceso(e, 'enjambre');
    expect(ritmoDeApariciones(e)).toBeGreaterThan(ritmoDeApariciones(crearSucesos()));
    expect(ritmoDeElites(e)).toBe(1);
  });

  it('la lluvia de estrellas no toca las apariciones', () => {
    // Es el regalo de los tres. Si además atacara, ver el cartel sería siempre
    // malo y la reacción sería meterse en casa y esperar.
    const e = crearSucesos();
    forzarSuceso(e, 'lluviaEstrellas');
    expect(ritmoDeApariciones(e)).toBe(1);
    expect(ritmoDeElites(e)).toBe(1);
  });

  it('sin nada en marcha, nada se multiplica', () => {
    const e = crearSucesos();
    expect(ritmoDeApariciones(e)).toBe(1);
    expect(ritmoDeElites(e)).toBe(1);
  });
});

/** Un mundo llano con la superficie en la fila 40. */
function llano(ancho = 600, suelo = 40): { mundo: Mundo; cielo: Int32Array } {
  const mundo = new Mundo(ancho, 120);
  mundo.rellenar(0, suelo, ancho - 1, 119, TIERRA);
  const cielo = new Int32Array(ancho).fill(suelo);
  return { mundo, cielo };
}

describe('los meteoritos', () => {
  it('el cráter es un cuenco de obsidiana con metal dentro', () => {
    const { mundo } = llano();
    const impacto = excavarCrater(mundo, 200, 40, rngDe(1));
    expect(impacto.mineral).toBeGreaterThan(0);

    let obsidiana = 0;
    let hueco = 0;
    let metal = 0;
    for (let ty = 40 - RADIO - 2; ty <= 40 + RADIO + 3; ty++) {
      for (let tx = 200 - RADIO - 1; tx <= 200 + RADIO + 1; tx++) {
        const id = mundo.getTile(tx, ty);
        if (id === OBSIDIANA) obsidiana++;
        if (id === AIRE) hueco++;
        if (id === COBALTO || id === TITANIO) metal++;
      }
    }
    expect(obsidiana).toBeGreaterThan(10);
    expect(hueco).toBeGreaterThan(10);
    expect(metal).toBe(impacto.mineral);
  });

  it('el metal queda en el fondo, no flotando en el aire', () => {
    const { mundo } = llano();
    excavarCrater(mundo, 200, 40, rngDe(9));
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 190; tx <= 210; tx++) {
        const id = mundo.getTile(tx, ty);
        if (id !== COBALTO && id !== TITANIO) continue;
        // Debajo de cada trozo de metal hay algo sólido.
        expect(esSolido(mundo.getTile(tx, ty + 1)), `${tx},${ty}`).toBe(true);
      }
    }
  });

  it('deja pared detrás del hueco, para que no se vea el cielo por el agujero', () => {
    // Solo por debajo de la superficie original: lo de encima del borde del
    // cráter era cielo antes y sigue siéndolo, que es lo correcto.
    const { mundo } = llano();
    excavarCrater(mundo, 200, 40, rngDe(2));
    let sinPared = 0;
    for (let ty = 40; ty <= 46; ty++) {
      for (let tx = 195; tx <= 205; tx++) {
        if (mundo.getTile(tx, ty) === AIRE && mundo.getPared(tx, ty) === AIRE) sinPared++;
      }
    }
    expect(sinPared).toBe(0);
  });

  it('cae cerca del jugador, pero no encima', () => {
    // Un cráter a mil tiles es un cráter que nadie encuentra, y uno a los pies
    // es un agujero debajo de la casa.
    const { mundo, cielo } = llano();
    for (let i = 0; i < 30; i++) {
      const impacto = caerMeteorito(mundo, 300, cielo, rngDe(i + 1));
      if (!impacto) continue;
      const d = Math.abs(impacto.tx - 300);
      expect(d).toBeGreaterThanOrEqual(CERCA);
      expect(d).toBeLessThanOrEqual(LEJOS);
    }
  });

  it('no cae sobre la copa de un árbol', () => {
    // La altura del cielo marca la primera fila que tapa el sol, y un árbol tapa
    // el sol. El primer meteorito que se probó cayó sobre las hojas y dejó una
    // montaña de obsidiana a quince tiles del suelo, con el tronco saliendo por
    // debajo. Troncos y hojas no frenan el paso, pero sí cuentan como techo.
    // Un mundo nuevo por intento: si se reutiliza, el cráter anterior ya se ha
    // comido las dos primeras filas de tierra y el siguiente cae más abajo con
    // toda la razón.
    for (let i = 0; i < 20; i++) {
      const { mundo, cielo } = llano();
      for (let tx = 0; tx < mundo.ancho; tx++) {
        for (let ty = 25; ty < 40; ty++) mundo.setTile(tx, ty, ty < 32 ? HOJAS : TRONCO);
        cielo[tx] = 25;
      }
      const impacto = caerMeteorito(mundo, 300, cielo, rngDe(i + 1));
      if (!impacto) continue;
      // Ha bajado hasta la tierra, no se ha quedado en la copa.
      expect(impacto.ty).toBe(40);
    }
  });

  it('no cae donde no hay suelo', () => {
    const mundo = new Mundo(600, 120);
    const cielo = new Int32Array(600).fill(40);
    // Mundo entero de aire: no hay ni una columna en la que apoyar el cráter.
    expect(caerMeteorito(mundo, 300, cielo, rngDe(4))).toBeNull();
  });

  it('no toca la columna del borde, que es la que impide salirse del mundo', () => {
    const { mundo } = llano(30);
    excavarCrater(mundo, 2, 40, rngDe(5));
    for (let ty = 40; ty < mundo.alto; ty++) {
      expect(mundo.getTile(0, ty), `fila ${ty}`).toBe(TIERRA);
    }
  });

  it('con la misma semilla sale el mismo cráter', () => {
    const a = llano().mundo;
    const b = llano().mundo;
    excavarCrater(a, 200, 40, rngDe(11));
    excavarCrater(b, 200, 40, rngDe(11));
    expect(a.tileId).toEqual(b.tileId);
  });

  it('y no deja nada que sea posterior al suceso que lo trae', () => {
    // Un cráter que soltara un bloque de 6.8.0 metería en el mundo algo que en
    // esa versión no existe, igual que hacían los abedules de 2.1.0.
    for (const id of [OBSIDIANA, COBALTO, TITANIO]) {
      expect(alMenos(SUCESOS.lluviaEstrellas.desde, versionTile(id)), String(id)).toBe(true);
    }
  });
});

/**
 * El suceso, en un número.
 *
 * Hace falta para mandarlo por la red en un byte, y la tabla está escrita a
 * mano por lo mismo que la de las especies: el orden de las claves de un objeto
 * es estable en la práctica, pero de esto depende que el invitado no confunda
 * una luna de sangre con un enjambre.
 */
describe('el suceso en un número, para el cable', () => {
  it('están los tres y ninguno es cero', () => {
    expect(ORDEN_SUCESOS).toHaveLength(Object.keys(SUCESOS).length);
    for (const c of ORDEN_SUCESOS) expect(numeroDeSuceso(c)).toBeGreaterThan(0);
  });

  it('ida y vuelta, incluido «no hay ninguno»', () => {
    expect(numeroDeSuceso(null)).toBe(0);
    expect(sucesoDeNumero(0)).toBeNull();
    for (const c of ORDEN_SUCESOS) {
      expect(sucesoDeNumero(numeroDeSuceso(c))).toBe(c);
    }
  });

  /** Llega de otro navegador: un número que no conocemos no inventa nada. */
  it('un número que no es de ninguno no da un suceso', () => {
    expect(sucesoDeNumero(99)).toBeNull();
    expect(sucesoDeNumero(-1)).toBeNull();
  });

  it('la tabla nombra sucesos que existen de verdad', () => {
    for (const c of ORDEN_SUCESOS) expect(SUCESOS[c]).toBeDefined();
    expect(new Set(ORDEN_SUCESOS).size).toBe(ORDEN_SUCESOS.length);
  });
});

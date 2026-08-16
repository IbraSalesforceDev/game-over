import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import { crearEnemigo, danoDe, ENEMIGOS, type Enemigo } from '../src/entities/enemies';
import { DIFICULTADES } from '../src/core/dificultad';
import {
  esHostil,
  especiesPosibles,
  FUERZA_DIURNA,
  intentarAparicion,
  UMBRAL_LUZ_HOSTIL,
  type ContextoAparicion,
} from '../src/entities/spawner';
import { MotorLuz } from '../src/world/lighting';
import { ANTORCHA, PIEDRA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

/**
 * Antorchas contra zombis, y días tranquilos.
 *
 * Las dos reglas van juntas porque responden a la misma queja: el mundo pegaba
 * igual de fuerte a mediodía dentro de una casa alumbrada que a las tres de la
 * madrugada en campo abierto.
 */

const SUELO = 40;

function mundoLlano(): Mundo {
  const m = new Mundo(200, 120);
  m.rellenar(0, SUELO, 199, 119, TIERRA);
  return m;
}

function jugador(): Caja {
  return crearCaja(100 * TILE, (SUELO - 3) * TILE, 26, 46);
}

function contexto(extra: Partial<ContextoAparicion> = {}): ContextoAparicion {
  return { esNoche: true, superficieTy: SUELO, bioma: 'bosque', ...extra };
}

/** Repite el intento hasta que salga algo, o se rinde. */
function aparecerAlgo(
  m: Mundo,
  ctx: ContextoAparicion,
  intentos = 400,
): Enemigo | null {
  const lista: Enemigo[] = [];
  const j = jugador();
  for (let i = 0; i < intentos; i++) {
    const e = intentarAparicion(m, lista, j, ctx);
    if (e) return e;
    lista.length = 0;
  }
  return null;
}

describe('quién puede salir', () => {
  it('los animales no cuentan como hostiles', () => {
    expect(esHostil('conejo')).toBe(false);
    expect(esHostil('jabali')).toBe(false);
    expect(esHostil('zombi')).toBe(true);
    expect(esHostil('slime')).toBe(true);
  });

  it('de noche en el bosque hay zombis y de día no', () => {
    const deNoche = especiesPosibles(contexto({ esNoche: true }), SUELO - 3);
    const deDia = especiesPosibles(contexto({ esNoche: false }), SUELO - 3);
    expect(deNoche).toContain('zombi');
    expect(deDia).not.toContain('zombi');
  });
});

describe('la luz espanta a lo hostil', () => {
  it('con el sitio muy iluminado no sale nada hostil', () => {
    const m = mundoLlano();
    const ctx = contexto({ luzEn: () => 255 });
    // Todo lo que puede salir de noche en el bosque es hostil, así que con luz
    // no debería salir absolutamente nada.
    expect(aparecerAlgo(m, ctx)).toBeNull();
  });

  it('a oscuras sí sale', () => {
    const m = mundoLlano();
    expect(aparecerAlgo(m, contexto({ luzEn: () => 0 }))).not.toBeNull();
  });

  it('justo en el umbral todavía sale: el corte es estricto', () => {
    const m = mundoLlano();
    expect(
      aparecerAlgo(m, contexto({ luzEn: () => UMBRAL_LUZ_HOSTIL })),
    ).not.toBeNull();
    expect(
      aparecerAlgo(m, contexto({ luzEn: () => UMBRAL_LUZ_HOSTIL + 1 })),
    ).toBeNull();
  });

  it('la luz no espanta a la caza: de día se sigue pudiendo comer', () => {
    const m = mundoLlano();
    const e = aparecerAlgo(m, contexto({ esNoche: false, luzEn: () => 255 }));
    expect(e).not.toBeNull();
    expect(esHostil(e!.especie)).toBe(false);
  });

  it('sin decir nada de la luz, el mundo se comporta como antes', () => {
    const m = mundoLlano();
    expect(aparecerAlgo(m, contexto())).not.toBeNull();
  });
});

describe('lo que sale de día pega menos', () => {
  it('un hostil diurno nace mermado y uno nocturno entero', () => {
    const m = mundoLlano();
    const dia = aparecerAlgo(m, contexto({ esNoche: false, luzEn: () => 0 }));
    const noche = aparecerAlgo(m, contexto({ esNoche: true, luzEn: () => 0 }));
    expect(noche!.fuerza).toBe(1);
    // De día lo único hostil del bosque es el slime.
    expect(dia).not.toBeNull();
    if (esHostil(dia!.especie)) expect(dia!.fuerza).toBe(FUERZA_DIURNA);
  });

  it('la fuerza escala vida y daño a la vez', () => {
    const entero = crearEnemigo('zombi', 0, 0, 1);
    const flojo = crearEnemigo('zombi', 0, 0, 0.5);
    expect(flojo.salud.vidaMax).toBeLessThan(entero.salud.vidaMax);
    expect(danoDe(flojo)).toBeLessThan(danoDe(entero));
    expect(danoDe(entero)).toBe(ENEMIGOS.zombi.dano);
  });

  it('por flojo que salga, siempre hace al menos un punto de daño', () => {
    const casiNada = crearEnemigo('zombi', 0, 0, 0.001);
    expect(danoDe(casiNada)).toBe(1);
    expect(casiNada.salud.vidaMax).toBeGreaterThan(0);
  });

  it('un animal no hace daño por mucha fuerza que se le dé', () => {
    expect(danoDe(crearEnemigo('conejo', 0, 0, 10))).toBe(0);
  });
});

describe('luz estimada fuera de la ventana visible', () => {
  it('una antorcha ilumina su alrededor aunque nadie la esté mirando', () => {
    const m = mundoLlano();
    // Bien enterrada, para que no le llegue el sol por ningún lado.
    m.rellenar(0, SUELO, 199, 119, PIEDRA);
    m.setTile(150, SUELO + 20, ANTORCHA);
    const luz = new MotorLuz(m);
    expect(luz.luzEstimada(150, SUELO + 20, 0)).toBeGreaterThan(UMBRAL_LUZ_HOSTIL);
    expect(luz.luzEstimada(152, SUELO + 20, 0)).toBeGreaterThan(UMBRAL_LUZ_HOSTIL);
    // A ocho tiles ya se ha perdido bastante, y a veinte no llega nada.
    expect(luz.luzEstimada(170, SUELO + 20, 0)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });

  it('a pleno sol un sitio a cielo abierto está iluminado', () => {
    const m = mundoLlano();
    const luz = new MotorLuz(m);
    expect(luz.luzEstimada(100, SUELO - 2, 1)).toBeGreaterThan(UMBRAL_LUZ_HOSTIL);
    expect(luz.luzEstimada(100, SUELO - 2, 0)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });

  it('bajo tierra no llega el sol ni a mediodía', () => {
    const m = mundoLlano();
    const luz = new MotorLuz(m);
    expect(luz.luzEstimada(100, SUELO + 30, 1)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });
});

describe('los tres bichos nuevos', () => {
  it('el esqueleto solo vive bajo tierra', () => {
    const hondo = especiesPosibles(contexto({ esNoche: true }), SUELO + 60);
    const arriba = especiesPosibles(contexto({ esNoche: true }), SUELO - 2);
    expect(hondo).toContain('esqueleto');
    expect(arriba).not.toContain('esqueleto');
  });

  it('la serpiente y la momia son del desierto y de ningún otro sitio', () => {
    const desiertoDia = especiesPosibles(
      contexto({ esNoche: false, bioma: 'desierto' }),
      SUELO - 2,
    );
    const desiertoNoche = especiesPosibles(
      contexto({ esNoche: true, bioma: 'desierto' }),
      SUELO - 2,
    );
    expect(desiertoDia).toContain('serpiente');
    expect(desiertoNoche).toContain('momia');
    // La momia es nocturna; la serpiente, no.
    expect(desiertoDia).not.toContain('momia');

    for (const bioma of ['bosque', 'nieve'] as const) {
      const otro = especiesPosibles(contexto({ esNoche: true, bioma }), SUELO - 2);
      expect(otro).not.toContain('serpiente');
      expect(otro).not.toContain('momia');
    }
  });

  it('los tres hacen daño y pegan más fuerte que un slime', () => {
    for (const especie of ['esqueleto', 'serpiente', 'momia'] as const) {
      expect(esHostil(especie)).toBe(true);
      expect(ENEMIGOS[especie].dano).toBeGreaterThan(ENEMIGOS.slime.dano);
    }
  });

  it('la serpiente es baja: hay que apuntar el mandoble al suelo', () => {
    // Menos de un tile de alto, así que la caja horizontal del golpe la coge
    // justo, y esa es la razón de que exista el apuntado hacia abajo.
    expect(ENEMIGOS.serpiente.alto).toBeLessThan(TILE);
  });

  it('en pacífico no sale ninguno de los tres', () => {
    for (const bioma of ['desierto', 'bosque'] as const) {
      const lista = especiesPosibles(
        contexto({ esNoche: true, bioma, dif: DIFICULTADES[0] }),
        SUELO + 60,
      );
      for (const especie of ['esqueleto', 'serpiente', 'momia'] as const) {
        expect(lista).not.toContain(especie);
      }
    }
  });
});

import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import {
  crearEnemigo,
  danoDe,
  ENEMIGOS,
  FUERZA_ELITE,
  PROBABILIDAD_ELITE,
  botinDe,
  botinRaroDe,
  nombreDe,
  type Enemigo,
} from '../src/entities/enemies';
import { DIFICULTADES } from '../src/core/dificultad';
import {
  esElite,
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
    // De noche puede tocar élite, que multiplica encima de lo demás. Sin
    // élite, entero: la noche no merma a nadie.
    expect(noche!.fuerza).toBe(noche!.elite ? FUERZA_ELITE : 1);
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

describe('lo que vive abajo (5.3.0)', () => {
  const HONDO = SUELO + 60;

  it('cada bioma tiene su bicho de subsuelo, y solo el suyo', () => {
    const dueno = {
      desierto: 'golem',
      nieve: 'espectro',
      jungla: 'arana',
    } as const;
    for (const [bioma, propio] of Object.entries(dueno)) {
      const aqui = especiesPosibles(
        contexto({ bioma: bioma as ContextoAparicion['bioma'] }),
        HONDO,
      );
      expect(aqui).toContain(propio);
      // Y no sale en el subsuelo de los demás: encontrárselo tiene que decir
      // dónde estás.
      for (const otro of Object.keys(dueno)) {
        if (otro === bioma) continue;
        const alli = especiesPosibles(
          contexto({ bioma: otro as ContextoAparicion['bioma'] }),
          HONDO,
        );
        expect(alli).not.toContain(propio);
      }
    }
  });

  it('ninguno de los tres sube a la superficie de su bioma', () => {
    for (const [bioma, propio] of [
      ['desierto', 'golem'],
      ['nieve', 'espectro'],
    ] as const) {
      const arriba = especiesPosibles(contexto({ bioma }), SUELO - 2);
      expect(arriba).not.toContain(propio);
    }
  });

  it('la araña sí patrulla la selva de noche: es lo que la hace incómoda', () => {
    const noche = especiesPosibles(contexto({ esNoche: true, bioma: 'jungla' }), SUELO - 2);
    const dia = especiesPosibles(contexto({ esNoche: false, bioma: 'jungla' }), SUELO - 2);
    expect(noche).toContain('arana');
    expect(dia).not.toContain('arana');
  });

  it('el diablillo solo sale en el inframundo', () => {
    const INFRA = 100;
    const abajo = especiesPosibles(contexto({ inframundoTy: INFRA }), INFRA + 5);
    const caverna = especiesPosibles(contexto({ inframundoTy: INFRA }), INFRA - 20);
    expect(abajo).toContain('diablillo');
    expect(caverna).not.toContain('diablillo');
    // Y en un mundo sin inframundo no sale en ninguna parte, por hondo que se
    // cave: los mundos de antes de 5.0.0 no tienen ese sitio.
    expect(especiesPosibles(contexto(), 118)).not.toContain('diablillo');
  });

  it('en mundos anteriores a 5.3.0 no existe ninguno de los cuatro', () => {
    const listas = [
      especiesPosibles(contexto({ bioma: 'desierto', version: '5.2.0' }), HONDO),
      especiesPosibles(contexto({ bioma: 'nieve', version: '5.2.0' }), HONDO),
      especiesPosibles(contexto({ bioma: 'jungla', version: '5.2.0' }), HONDO),
      especiesPosibles(contexto({ version: '5.2.0', inframundoTy: 100 }), 105),
    ];
    for (const lista of listas) {
      for (const especie of ['golem', 'espectro', 'arana', 'diablillo'] as const) {
        expect(lista).not.toContain(especie);
      }
      // Pero la lista no se queda vacía: lo que sí existía en 5.2.0 sigue ahí.
      expect(lista.length).toBeGreaterThan(0);
    }
  });

  it('el gólem aguanta más que nadie y el jefe sigue pegando más que nadie', () => {
    const noJefes = (Object.keys(ENEMIGOS) as (keyof typeof ENEMIGOS)[]).filter(
      (e) => !ENEMIGOS[e].jefe,
    );
    expect(Math.max(...noJefes.map((e) => ENEMIGOS[e].vida))).toBe(ENEMIGOS.golem.vida);
    expect(Math.max(...noJefes.map((e) => ENEMIGOS[e].dano))).toBeLessThan(
      ENEMIGOS.guardian.dano,
    );
  });

  it('los cuatro sueltan su botín raro, y pocas veces', () => {
    for (const especie of ['golem', 'espectro', 'arana', 'diablillo'] as const) {
      const def = ENEMIGOS[especie];
      expect(def.botinRaro).toBeDefined();
      // Nunca seguro: un botín garantizado convierte al bicho en expendedora.
      expect(botinRaroDe(especie, () => 0.95)).toBeNull();
      expect(botinRaroDe(especie, () => 0)).toBe(def.botinRaro);
    }
    // Y quien no tiene botín raro no lo suelta por mucha suerte que se tenga.
    expect(botinRaroDe('zombi', () => 0)).toBeNull();
  });
});

describe('élites nocturnos', () => {
  it('solo de noche, solo arriba y solo si es hostil', () => {
    const siempre = () => 0;
    const noche = contexto({ esNoche: true });
    expect(esElite(noche, 'zombi', true, siempre)).toBe(true);
    // De día no, aunque la tirada salga redonda.
    expect(esElite(contexto({ esNoche: false }), 'zombi', true, siempre)).toBe(false);
    // Bajo tierra tampoco: ahí ya están los gólems haciendo ese papel.
    expect(esElite(noche, 'zombi', false, siempre)).toBe(false);
    // Y un conejo de élite sería un conejo que sigue sin morder.
    expect(esElite(noche, 'conejo', true, siempre)).toBe(false);
  });

  it('es la excepción, no la regla', () => {
    const noche = contexto({ esNoche: true });
    // Con la tirada justo por encima del umbral no sale élite.
    expect(esElite(noche, 'zombi', true, () => PROBABILIDAD_ELITE + 0.01)).toBe(false);
    expect(PROBABILIDAD_ELITE).toBeLessThan(0.2);
  });

  it('antes de 5.3.0 no había élites', () => {
    expect(esElite(contexto({ esNoche: true, version: '5.2.0' }), 'zombi', true, () => 0)).toBe(
      false,
    );
  });

  it('un élite aguanta y pega mucho más que su especie', () => {
    const normal = crearEnemigo('zombi', 0, 0, 1, false);
    const elite = crearEnemigo('zombi', 0, 0, 1, true);
    expect(elite.elite).toBe(true);
    expect(elite.fuerza).toBe(FUERZA_ELITE);
    expect(elite.salud.vidaMax).toBe(Math.round(ENEMIGOS.zombi.vida * FUERZA_ELITE));
    expect(danoDe(elite)).toBeGreaterThan(danoDe(normal) * 2);
  });

  it('la élite multiplica encima de la dificultad, no en vez de ella', () => {
    // La aparición pasa la fuerza de la dificultad y `crearEnemigo` la escala:
    // un élite en brutal tiene que ser peor que uno en normal.
    const normalito = crearEnemigo('zombi', 0, 0, 1, true);
    const brutal = crearEnemigo('zombi', 0, 0, 1.6, true);
    expect(brutal.salud.vidaMax).toBeGreaterThan(normalito.salud.vidaMax);
  });

  it('la élite suelta el doble de lo común y el raro cuatro veces más', () => {
    expect(botinDe('zombi', () => 0.99, true).cantidad).toBe(
      botinDe('zombi', () => 0.99, false).cantidad * 2,
    );
    // Con una tirada que el gólem normal falla, el de élite acierta.
    const justo = ENEMIGOS.golem.probRaro! * 2;
    expect(botinRaroDe('golem', () => justo, false)).toBeNull();
    expect(botinRaroDe('golem', () => justo, true)).toBe(ENEMIGOS.golem.botinRaro);
  });
});

describe('cómo se llama cada bicho', () => {
  it('un élite se anuncia como élite', () => {
    expect(nombreDe(crearEnemigo('zombi', 0, 0, 1, false))).toBe('zombi');
    expect(nombreDe(crearEnemigo('zombi', 0, 0, 1, true))).toBe('zombi de élite');
  });

  it('los cuatro nuevos tienen nombre en español', () => {
    for (const especie of ['golem', 'espectro', 'arana', 'diablillo'] as const) {
      expect(ENEMIGOS[especie].nombre.length).toBeGreaterThan(3);
    }
    // Las claves del código van sin tildes ni eñes porque son identificadores;
    // lo que ve el jugador, no. Es justo el par que se olvida.
    expect(ENEMIGOS.golem.nombre).toBe('gólem de arenisca');
    expect(ENEMIGOS.arana.nombre).toBe('araña de la selva');
  });
});

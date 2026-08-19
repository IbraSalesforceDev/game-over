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
  aforoDeZona,
  apuntarMuerte,
  avanzarPresion,
  crearPresion,
  esElite,
  esHostil,
  especiesPosibles,
  ESPERA_POR_VIVO,
  ESPERA_TRAS_APARECER,
  FUERZA_DIURNA,
  intentarAparicion,
  RADIO_ZONA,
  TICKS_POR_REFUERZO,
  TOPE_ZONA,
  UMBRAL_LUZ_HOSTIL,
  VETO_MUERTE,
  type ContextoAparicion,
} from '../src/entities/spawner';
import { MotorLuz } from '../src/world/lighting';
import { LUZ_DIA, LUZ_NOCHE } from '../src/engine/time';
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
    expect(luz.luzEstimada(100, SUELO - 2, LUZ_DIA)).toBeGreaterThan(UMBRAL_LUZ_HOSTIL);
    expect(luz.luzEstimada(100, SUELO - 2, 0)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });

  it('bajo tierra no llega el sol ni a mediodía', () => {
    const m = mundoLlano();
    const luz = new MotorLuz(m);
    expect(luz.luzEstimada(100, SUELO + 30, LUZ_DIA)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });

  /**
   * El fallo que tenía escondido el juego entero de noche.
   *
   * `luzSolar` va de 0 a 255 y `luzEstimada` devolvía `255 * luzSolar`, o sea
   * 65025 a mediodía y 13260 de noche. Como el umbral son 90, la comprobación de
   * luz rechazaba **todo** lo hostil que quisiera salir a cielo abierto: la
   * superficie no tenía zombis a ninguna hora, y solo aparecían conejos y
   * gallinas, que no miran la luz. Bajo tierra no se notaba porque allí no se ve
   * el cielo y el valor salía del recorrido de antorchas.
   *
   * Estos tests pasaban porque estaban escritos con la misma suposición: se
   * llamaba con un 1 para decir "mediodía". Por eso este comprueba las dos
   * escalas a la vez, contra las constantes de verdad del reloj.
   */
  it('la luz del sol y la luz estimada usan la misma escala', () => {
    const m = mundoLlano();
    const luz = new MotorLuz(m);
    const aCieloAbierto = SUELO - 2;
    expect(luz.luzEstimada(100, aCieloAbierto, LUZ_DIA)).toBe(LUZ_DIA);
    expect(luz.luzEstimada(100, aCieloAbierto, LUZ_NOCHE)).toBe(LUZ_NOCHE);
    // Y lo que importa: de noche, al aire libre, sí puede salir algo hostil.
    expect(luz.luzEstimada(100, aCieloAbierto, LUZ_NOCHE)).toBeLessThan(UMBRAL_LUZ_HOSTIL);
  });

  /** La prueba de fuego: de noche, en campo abierto, salen zombis. */
  it('de noche aparece algo hostil en la superficie', () => {
    const m = mundoLlano();
    const luz = new MotorLuz(m);
    const ctx = contexto({
      esNoche: true,
      luzEn: (tx, ty) => luz.luzEstimada(tx, ty, LUZ_NOCHE),
    });
    let hostiles = 0;
    for (let i = 0; i < 200; i++) {
      const e = aparecerAlgo(m, ctx, 20);
      if (e && esHostil(e.especie)) hostiles++;
    }
    expect(hostiles).toBeGreaterThan(0);
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
  it('de noche arriba sí, de día arriba no, y nunca un animal', () => {
    const siempre = () => 0;
    const noche = contexto({ esNoche: true });
    expect(esElite(noche, 'zombi', true, siempre)).toBe(true);
    // De día en la superficie no, aunque la tirada salga redonda: el día es el
    // rato tranquilo y eso no lo cambió 6.10.0.
    expect(esElite(contexto({ esNoche: false }), 'zombi', true, siempre)).toBe(false);
    // Y un conejo de élite sería un conejo que sigue sin morder.
    expect(esElite(noche, 'conejo', true, siempre)).toBe(false);
  });

  it('desde 6.10.0 también las hay bajo tierra, y a mitad de ritmo', () => {
    const siempre = () => 0;
    const noche = contexto({ esNoche: true });
    expect(esElite(noche, 'zombi', false, siempre)).toBe(true);
    // Antes de 6.10.0, ahí abajo no había ninguna.
    const antes = contexto({ esNoche: true, version: '6.9.0' });
    expect(esElite(antes, 'zombi', false, siempre)).toBe(false);
    // Y sale la mitad de a menudo que en la superficie: una tirada que arriba
    // pasa, abajo se queda corta.
    const justo = PROBABILIDAD_ELITE * 0.75;
    expect(esElite(noche, 'zombi', true, () => justo)).toBe(true);
    expect(esElite(noche, 'zombi', false, () => justo)).toBe(false);
  });

  it('sigue sin ser la regla', () => {
    const noche = contexto({ esNoche: true });
    // Con la tirada justo por encima del umbral no sale élite.
    expect(esElite(noche, 'zombi', true, () => PROBABILIDAD_ELITE + 0.01)).toBe(false);
    // Subió de 1/9 a 1/4 en 6.10.0, pero la mayoría de los bichos de la noche
    // siguen siendo bichos normales.
    expect(PROBABILIDAD_ELITE).toBeLessThan(0.5);
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

/**
 * El ritmo al que se llena una zona.
 *
 * Las dos quejas que arregla esta parte son la misma de fondo: la aparición solo
 * miraba cuántos había vivos. Matar bajaba la cuenta y el hueco se rellenaba en
 * el acto, y quedarse en un sitio topaba en cuatro bichos y ahí se quedaba el
 * mundo.
 */
describe('la presión de la zona', () => {
  /** Cuántos bichos aparecen en `ticks`, jugando de verdad al reloj. */
  function simular(ticks: number, matar: (e: Enemigo) => boolean = () => false) {
    const m = mundoLlano();
    const j = jugador();
    const p = crearPresion();
    const lista: Enemigo[] = [];
    const ctx = contexto({ presion: p });
    let salidos = 0;
    let muertos = 0;
    const tx = Math.floor(j.x / TILE);
    const ty = Math.floor(j.y / TILE);
    for (let t = 0; t < ticks; t++) {
      avanzarPresion(p, tx, ty);
      // El juego lo intenta cada 40 ticks; la presión decide si toca.
      if (t % 40 === 0) {
        const e = intentarAparicion(m, lista, j, ctx);
        if (e) salidos++;
      }
      for (const e of lista) {
        if (e.vivo && matar(e)) {
          e.vivo = false;
          muertos++;
          apuntarMuerte(p);
        }
      }
    }
    return { salidos, muertos, vivos: lista.filter((e) => e.vivo).length, p };
  }

  it('matar frena la aparición en vez de dispararla', () => {
    const p = crearPresion();
    apuntarMuerte(p);
    expect(p.espera).toBe(VETO_MUERTE);

    const m = mundoLlano();
    const lista: Enemigo[] = [];
    // Con el veto puesto no sale nada, por mucho que se intente y por vacía que
    // esté la zona.
    for (let i = 0; i < 50; i++) {
      expect(intentarAparicion(m, lista, jugador(), contexto({ presion: p }))).toBeNull();
    }
    expect(lista).toHaveLength(0);
  });

  it('el veto se acaba solo', () => {
    const p = crearPresion();
    apuntarMuerte(p);
    for (let t = 0; t < VETO_MUERTE; t++) avanzarPresion(p, 0, 0);
    expect(p.espera).toBe(0);
  });

  it('una luna de sangre no se para en seco cada vez que cae un zombi', () => {
    const normal = crearPresion();
    const luna = crearPresion();
    apuntarMuerte(normal, 1);
    apuntarMuerte(luna, 2);
    expect(luna.espera).toBeLessThan(normal.espera);
  });

  /** El goteo: cada bicho que ya anda suelto retrasa al siguiente. */
  it('cuantos más hay, más se tarda en soltar el siguiente', () => {
    const m = mundoLlano();
    const p = crearPresion();
    const lista: Enemigo[] = [];
    const ctx = contexto({ presion: p });
    const j = jugador();

    /** Insiste hasta que salga uno: un intento suelto puede no encontrar sitio. */
    const soltarUno = (): void => {
      for (let i = 0; i < 400; i++) {
        p.espera = 0;
        if (intentarAparicion(m, lista, j, ctx)) return;
      }
      throw new Error('no ha salido ninguno');
    };

    soltarUno();
    const esperaCon1 = p.espera;
    expect(esperaCon1).toBe(ESPERA_TRAS_APARECER);

    soltarUno();
    expect(p.espera).toBe(ESPERA_TRAS_APARECER + ESPERA_POR_VIVO);
    expect(p.espera).toBeGreaterThan(esperaCon1);
  });

  it('quedarse en el sitio sube el aforo, hasta un tope', () => {
    const p = crearPresion();
    expect(aforoDeZona(7, p)).toBe(7);
    p.quieto = TICKS_POR_REFUERZO;
    expect(aforoDeZona(7, p)).toBe(8);
    p.quieto = TICKS_POR_REFUERZO * 4;
    expect(aforoDeZona(7, p)).toBe(11);
    p.quieto = TICKS_POR_REFUERZO * 1000;
    expect(aforoDeZona(7, p)).toBe(7 * TOPE_ZONA);
  });

  it('irse a otra zona reinicia la cuenta', () => {
    const p = crearPresion();
    for (let t = 0; t < 500; t++) avanzarPresion(p, 100, 50);
    expect(p.quieto).toBeGreaterThan(400);
    avanzarPresion(p, 100 + RADIO_ZONA + 1, 50);
    expect(p.quieto).toBe(0);
    // Y volver a moverse dentro de la misma zona no la reinicia.
    for (let t = 0; t < 10; t++) avanzarPresion(p, 100 + RADIO_ZONA + 1 + t, 50);
    expect(p.quieto).toBe(10);
  });

  /**
   * Lo que el jugador nota: quedarse tres minutos en el mismo claro acaba
   * juntando más bichos de los que cabían al llegar.
   */
  it('quedarse mucho junta más bichos que quedarse poco', () => {
    const corto = simular(60 * 40).vivos;
    const largo = simular(60 * 60 * 5).vivos;
    expect(largo).toBeGreaterThan(corto);
  });

  /** Y matando sin parar la zona no se llena: es lo contrario del relleno. */
  it('matando todo lo que sale, la zona se queda vacía', () => {
    const r = simular(60 * 60 * 2, () => true);
    expect(r.muertos).toBeGreaterThan(0);
    expect(r.vivos).toBe(0);
  });

  it('sin presión, el mundo viejo se comporta como antes', () => {
    const m = mundoLlano();
    const lista: Enemigo[] = [];
    const j = jugador();
    // Sin `presion` no hay veto que valga: sale uno detrás de otro hasta el
    // aforo, que es exactamente lo que hacían las versiones anteriores.
    let salidos = 0;
    for (let i = 0; i < 40; i++) {
      if (intentarAparicion(m, lista, j, contexto())) salidos++;
    }
    expect(salidos).toBeGreaterThan(1);
  });
});

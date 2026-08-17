import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { VERSIONES } from '../src/core/versiones';
import {
  actualizarEnemigos,
  crearEnemigo,
  ENEMIGOS,
  esJefe,
  type Especie,
} from '../src/entities/enemies';
import { crearJugador } from '../src/entities/player';
import { especiesPosibles } from '../src/entities/spawner';
import { defObjeto, esInvocador, esTrofeo, objetoExisteEn } from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { CALDERO, PIEDRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import {
  CLASES_JEFE,
  claseDeEspecie,
  JEFES,
  jefeDeInvocador,
  sitioCorrecto,
  trofeoDe,
  type ClaseJefe,
  type DondeEstoy,
} from '../src/world/jefes';

/** Un sitio cualquiera, para retocar lo que haga falta en cada caso. */
function donde(cambios: Partial<DondeEstoy> = {}): DondeEstoy {
  return { bioma: 'bosque', bajoTierra: false, inframundo: false, ...cambios };
}

describe('la tabla de jefes de bioma', () => {
  it('son seis, uno por sitio', () => {
    expect(CLASES_JEFE).toHaveLength(6);
    expect(new Set(CLASES_JEFE.map((c) => JEFES[c].especie)).size).toBe(6);
  });

  it('cada uno tiene su especie, su ídolo y su trofeo, y no se repiten', () => {
    const idolos = new Set<number>();
    const trofeos = new Set<number>();
    for (const clase of CLASES_JEFE) {
      const def = JEFES[clase];
      expect(ENEMIGOS[def.especie], clase).toBeDefined();
      expect(esInvocador(def.invocador), clase).toBe(true);
      expect(esTrofeo(def.trofeo), clase).toBe(true);
      idolos.add(def.invocador);
      trofeos.add(def.trofeo);
    }
    expect(idolos.size).toBe(6);
    expect(trofeos.size).toBe(6);
  });

  it('los seis son jefes de verdad y ninguno aparece solo', () => {
    const biomas = ['bosque', 'desierto', 'nieve', 'jungla'] as const;
    for (const clase of CLASES_JEFE) {
      const especie = JEFES[clase].especie;
      expect(esJefe(especie), clase).toBe(true);
      for (const bioma of biomas) {
        for (const esNoche of [true, false]) {
          for (const ty of [10, 400]) {
            const lista = especiesPosibles({ esNoche, superficieTy: 20, bioma }, ty);
            expect(lista, `${clase} en ${bioma}`).not.toContain(especie as Especie);
          }
        }
      }
    }
  });

  it('los seis pelean parecido: ninguno dobla a otro en aguante', () => {
    // No son una escalera. Si uno aguantara el doble que otro habría que
    // hacerlos en un orden concreto, y cinco de las seis peleas pasarían a ser
    // trámite antes de la que importa.
    const vidas = CLASES_JEFE.map((c) => ENEMIGOS[JEFES[c].especie].vida);
    expect(Math.max(...vidas) / Math.min(...vidas)).toBeLessThan(2);
  });

  it('todos aguantan y pegan mucho más que cualquier bicho normal', () => {
    const normales = (Object.keys(ENEMIGOS) as Especie[]).filter(
      (e) => ENEMIGOS[e].jefe !== true,
    );
    const vidaMax = Math.max(...normales.map((e) => ENEMIGOS[e].vida));
    const danoMax = Math.max(...normales.map((e) => ENEMIGOS[e].dano));
    for (const clase of CLASES_JEFE) {
      const def = ENEMIGOS[JEFES[clase].especie];
      expect(def.vida, clase).toBeGreaterThan(vidaMax * 3);
      expect(def.dano, clase).toBeGreaterThan(danoMax);
    }
  });

  it('todos tienen ataque especial: es media pelea', () => {
    for (const clase of CLASES_JEFE) {
      expect(ENEMIGOS[JEFES[clase].especie].ataque, clase).toBeDefined();
    }
  });

  it('cada ataque es el de su bioma', () => {
    expect(ENEMIGOS[JEFES.desierto.especie].ataque).toBe('arena');
    expect(ENEMIGOS[JEFES.nieve.especie].ataque).toBe('ventisca');
    expect(ENEMIGOS[JEFES.jungla.especie].ataque).toBe('veneno');
    expect(ENEMIGOS[JEFES.infierno.especie].ataque).toBe('bolaDeFuego');
  });

  it('los seis declaran una versión que existe', () => {
    const conocidas = new Set(VERSIONES.map((v) => v.id));
    for (const clase of CLASES_JEFE) {
      expect(conocidas.has(JEFES[clase].desde), clase).toBe(true);
      expect(conocidas.has(ENEMIGOS[JEFES[clase].especie].desde), clase).toBe(true);
    }
  });

  it('sus objetos no existen antes de 7.0.0', () => {
    for (const clase of CLASES_JEFE) {
      const def = JEFES[clase];
      expect(objetoExisteEn(def.invocador, '6.10.0'), clase).toBe(false);
      expect(objetoExisteEn(def.trofeo, '6.10.0'), clase).toBe(false);
      expect(objetoExisteEn(def.invocador, '7.0.0'), clase).toBe(true);
    }
  });
});

describe('buscar por ídolo y por especie', () => {
  it('cada ídolo encuentra a su jefe', () => {
    for (const clase of CLASES_JEFE) {
      expect(jefeDeInvocador(JEFES[clase].invocador)).toBe(JEFES[clase]);
    }
  });

  it('un objeto cualquiera no llama a nadie', () => {
    expect(jefeDeInvocador(PIEDRA)).toBeNull();
  });

  it('cada especie de jefe conoce su clase y su trofeo', () => {
    for (const clase of CLASES_JEFE) {
      expect(claseDeEspecie(JEFES[clase].especie)).toBe(clase as ClaseJefe);
      expect(trofeoDe(JEFES[clase].especie)).toBe(JEFES[clase].trofeo);
    }
  });

  it('el guardián de la fortaleza no es de bioma y no deja trofeo', () => {
    expect(claseDeEspecie('guardian')).toBeNull();
    expect(trofeoDe('guardian')).toBeNull();
    expect(trofeoDe('zombi')).toBeNull();
  });
});

describe('dónde vale cada ritual', () => {
  it('el de la pradera solo en el bosque, y en la superficie', () => {
    expect(sitioCorrecto(JEFES.pradera, donde())).toBe(true);
    expect(sitioCorrecto(JEFES.pradera, donde({ bioma: 'desierto' }))).toBe(false);
    // La cueva que hay debajo del bosque es la caverna, no el bosque.
    expect(sitioCorrecto(JEFES.pradera, donde({ bajoTierra: true }))).toBe(false);
  });

  it('cada ídolo de superficie exige exactamente su bioma', () => {
    const porBioma = [
      ['pradera', 'bosque'],
      ['desierto', 'desierto'],
      ['nieve', 'nieve'],
      ['jungla', 'jungla'],
    ] as const;
    for (const [clase, bioma] of porBioma) {
      expect(sitioCorrecto(JEFES[clase], donde({ bioma })), clase).toBe(true);
      for (const otro of ['bosque', 'desierto', 'nieve', 'jungla'] as const) {
        if (otro === bioma) continue;
        expect(sitioCorrecto(JEFES[clase], donde({ bioma: otro })), `${clase}/${otro}`).toBe(
          false,
        );
      }
    }
  });

  it('el de la caverna pide profundidad, y le da igual el bioma', () => {
    expect(sitioCorrecto(JEFES.cueva, donde())).toBe(false);
    for (const bioma of ['bosque', 'desierto', 'nieve', 'jungla'] as const) {
      expect(sitioCorrecto(JEFES.cueva, donde({ bioma, bajoTierra: true })), bioma).toBe(true);
    }
    // El inframundo está debajo de todo, así que también cuenta como hondo.
    expect(sitioCorrecto(JEFES.cueva, donde({ inframundo: true }))).toBe(true);
  });

  it('el infernal solo en el inframundo, ni siquiera en una cueva honda', () => {
    expect(sitioCorrecto(JEFES.infierno, donde({ inframundo: true }))).toBe(true);
    expect(sitioCorrecto(JEFES.infierno, donde({ bajoTierra: true }))).toBe(false);
    expect(sitioCorrecto(JEFES.infierno, donde())).toBe(false);
  });

  it('ningún ídolo vale en todos los sitios a la vez', () => {
    const sitios: DondeEstoy[] = [
      donde(),
      donde({ bioma: 'desierto' }),
      donde({ bioma: 'nieve' }),
      donde({ bioma: 'jungla' }),
      donde({ bajoTierra: true }),
      donde({ inframundo: true }),
    ];
    for (const clase of CLASES_JEFE) {
      const validos = sitios.filter((s) => sitioCorrecto(JEFES[clase], s)).length;
      expect(validos, clase).toBeGreaterThan(0);
      expect(validos, clase).toBeLessThan(sitios.length);
    }
  });
});

describe('los rituales como recetas', () => {
  const recetaDe = (clase: ClaseJefe) =>
    RECETAS.find((r) => r.resultado === JEFES[clase].invocador);

  it('los seis ídolos se fabrican, y en el caldero', () => {
    for (const clase of CLASES_JEFE) {
      const r = recetaDe(clase);
      expect(r, clase).toBeDefined();
      expect(r!.estacion, clase).toBe(CALDERO);
      expect(r!.desde, clase).toBe('7.0.0');
      expect(r!.cantidad, clase).toBe(1);
    }
  });

  it('ninguno es barato: todos piden un montón de algo', () => {
    // El precio no es por ser caro: juntar doscientas rocas del infierno
    // obliga a estar allí un buen rato, y eso es lo que se quiere que haya
    // pasado antes de pelear con lo que vive allí.
    for (const clase of CLASES_JEFE) {
      const r = recetaDe(clase)!;
      expect(r.ingredientes.length, clase).toBeGreaterThanOrEqual(3);
      const mayor = Math.max(...r.ingredientes.map(([, n]) => n));
      expect(mayor, clase).toBeGreaterThanOrEqual(60);
    }
  });

  it('cada receta pide material que solo hay en su bioma', () => {
    // Se comprueba que las seis listas de ingredientes son distintas entre sí:
    // si dos coincidieran, dos rituales serían el mismo con otro nombre.
    const firmas = CLASES_JEFE.map((c) =>
      recetaDe(c)!
        .ingredientes.map(([o]) => o)
        .sort()
        .join(','),
    );
    expect(new Set(firmas).size).toBe(6);
  });

  it('el ídolo se apila poco: no es material de construcción', () => {
    for (const clase of CLASES_JEFE) {
      expect(defObjeto(JEFES[clase].invocador).maxPila, clase).toBeLessThanOrEqual(4);
    }
  });
});

describe('los jefes en el mundo', () => {
  it('ninguno desaparece por olvido, aunque te vayas lejísimos', () => {
    for (const clase of CLASES_JEFE) {
      const mundo = new Mundo(60, 60);
      mundo.rellenar(0, 50, 59, 59, PIEDRA);
      const boss = crearEnemigo(JEFES[clase].especie, 10 * TILE, 40 * TILE);
      const jugador = crearJugador(50, 40).caja;
      for (let i = 0; i < 700; i++) {
        actualizarEnemigos(mundo, [boss], jugador, { invulnerable: 0 }, 1);
      }
      expect(boss.vivo, clase).toBe(true);
    }
  });

  it('a tiro, todos lanzan lo suyo', () => {
    for (const clase of CLASES_JEFE) {
      const mundo = new Mundo(120, 60);
      mundo.rellenar(0, 45, 119, 59, PIEDRA);
      const especie = JEFES[clase].especie;
      const boss = crearEnemigo(especie, 20 * TILE, 43 * TILE - ENEMIGOS[especie].alto);
      const jugador = crearJugador(28, 43).caja;
      const x0 = boss.caja.x;
      const y0 = boss.caja.y;
      let total = 0;
      for (let i = 0; i < 600; i++) {
        total += actualizarEnemigos(mundo, [boss], jugador, { invulnerable: 0 }).disparos
          .length;
        boss.caja.x = x0;
        boss.caja.y = y0;
      }
      expect(total, clase).toBeGreaterThan(0);
    }
  });

  it('en un mundo de 6.10.0 no existían', () => {
    for (const clase of CLASES_JEFE) {
      const especie = JEFES[clase].especie;
      expect(ENEMIGOS[especie].desde).toBe('7.0.0');
    }
  });
});

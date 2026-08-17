import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import {
  actualizarEnemigos,
  botinDe,
  crearEnemigo,
  danarEnemigo,
  danoDe,
  ENEMIGOS,
  esJefe,
  estadisticasDe,
  GUARDIAN_ORIGINAL,
  pensar,
  PROBABILIDAD_RELIQUIA,
  sueltaReliquia,
  type Especie,
} from '../src/entities/enemies';
import { especiesPosibles } from '../src/entities/spawner';
import { ESENCIA } from '../src/items/items';
import { Mundo } from '../src/world/world';
import { PIEDRA } from '../src/world/tiles';
import { crearJugador } from '../src/entities/player';

/** Un contador que devuelve valores fijos, para no depender del azar. */
function secuencia(valores: number[]): () => number {
  let i = 0;
  return () => valores[i++ % valores.length]!;
}

describe('el guardián', () => {
  it('es un jefe y suelta esencia', () => {
    expect(esJefe('guardian')).toBe(true);
    expect(botinDe('guardian', () => 0).objeto).toBe(ESENCIA);
  });

  it('no sale nunca por sí solo', () => {
    // Ni de día ni de noche, ni arriba ni abajo, ni en ningún bioma.
    const biomas = ['bosque', 'desierto', 'nieve', 'jungla'] as const;
    for (const bioma of biomas) {
      for (const esNoche of [true, false]) {
        for (const ty of [10, 400]) {
          const lista = especiesPosibles({ esNoche, superficieTy: 20, bioma }, ty);
          expect(lista).not.toContain('guardian' as Especie);
        }
      }
    }
  });

  it('no desaparece por olvido, aunque el jugador se vaya lejísimos', () => {
    const mundo = new Mundo(60, 60);
    mundo.rellenar(0, 50, 59, 59, PIEDRA);
    const jefe = crearEnemigo('guardian', 10 * TILE, 40 * TILE);
    const zombi = crearEnemigo('zombi', 10 * TILE, 40 * TILE);
    const enemigos = [jefe, zombi];
    const jugador = crearJugador(50 * TILE, 40 * TILE).caja;

    // Bastante más de los diez segundos que tarda un bicho normal en olvidarse.
    for (let i = 0; i < 700; i++) {
      actualizarEnemigos(mundo, enemigos, jugador, { invulnerable: 0 }, 1);
    }
    expect(zombi.vivo).toBe(false);
    expect(jefe.vivo).toBe(true);
  });

  it('pega más fuerte que cualquier otra cosa del juego', () => {
    const otros = (Object.keys(ENEMIGOS) as Especie[])
      .filter((e) => e !== 'guardian')
      .map((e) => ENEMIGOS[e].dano);
    expect(ENEMIGOS.guardian.dano).toBeGreaterThan(Math.max(...otros));
  });
});

describe('el guardián reforzado de 6.8.0', () => {
  it('en un mundo de hoy aguanta y pega más que en uno de antes', () => {
    const hoy = estadisticasDe('guardian', '6.8.0');
    const antes = estadisticasDe('guardian', '6.7.0');
    expect(hoy.vida).toBeGreaterThan(antes.vida);
    expect(hoy.dano).toBeGreaterThan(antes.dano);
    expect(antes).toEqual({ vida: GUARDIAN_ORIGINAL.vida, dano: GUARDIAN_ORIGINAL.dano });
  });

  it('un mundo de 4.0.0 despierta al guardián de 4.0.0', () => {
    const viejo = crearEnemigo('guardian', 0, 0, 1, false, '4.0.0');
    const nuevo = crearEnemigo('guardian', 0, 0, 1, false, '6.8.0');
    expect(viejo.salud.vidaMax).toBe(GUARDIAN_ORIGINAL.vida);
    expect(danoDe(viejo)).toBe(GUARDIAN_ORIGINAL.dano);
    expect(nuevo.salud.vidaMax).toBe(ENEMIGOS.guardian.vida);
    expect(danoDe(nuevo)).toBe(ENEMIGOS.guardian.dano);
  });

  it('la dificultad sigue multiplicando encima de lo que toque a cada versión', () => {
    const viejo = crearEnemigo('guardian', 0, 0, 2, false, '4.0.0');
    expect(viejo.salud.vidaMax).toBe(GUARDIAN_ORIGINAL.vida * 2);
    expect(danoDe(viejo)).toBe(GUARDIAN_ORIGINAL.dano * 2);
  });

  it('el resto de especies no cambia con la versión', () => {
    for (const especie of Object.keys(ENEMIGOS) as Especie[]) {
      if (especie === 'guardian') continue;
      expect(estadisticasDe(especie, '2.0.0')).toEqual(estadisticasDe(especie, '6.8.0'));
    }
  });

  it('embiste más seguido al enfurecerse, y solo en los mundos nuevos', () => {
    // Se cuenta cuántas veces arranca una embestida en mil ticks con la barra
    // por debajo de la mitad: es la única señal observable del ritmo.
    const embestidas = (version: string): number => {
      const e = crearEnemigo('guardian', 0, 0, 1, false, version);
      e.salud.vida = 1;
      let cuentas = 0;
      for (let i = 0; i < 1000; i++) {
        const antes = e.caja.vx;
        pensar(e, { x: 400, y: 0 });
        if (Math.abs(e.caja.vx) > Math.abs(antes) + 3) cuentas++;
      }
      return cuentas;
    };
    expect(embestidas('6.8.0')).toBeGreaterThan(embestidas('6.7.0'));
  });
});

describe('la reliquia', () => {
  it('los hostiles la sueltan de vez en cuando', () => {
    // Justo por debajo del umbral, sí; justo por encima, no.
    expect(sueltaReliquia('zombi', () => PROBABILIDAD_RELIQUIA - 0.001)).toBe(true);
    expect(sueltaReliquia('zombi', () => PROBABILIDAD_RELIQUIA + 0.001)).toBe(false);
  });

  it('los animales no sueltan nada de eso', () => {
    for (const pacifico of ['conejo', 'gallina', 'jabali'] as const) {
      expect(sueltaReliquia(pacifico, () => 0)).toBe(false);
    }
  });

  it('el jefe tampoco: ya suelta lo suyo', () => {
    expect(sueltaReliquia('guardian', () => 0)).toBe(false);
  });

  it('la proporción a la larga es la anunciada', () => {
    // Mil tiradas repartidas por igual entre 0 y 1.
    const azar = secuencia(Array.from({ length: 1000 }, (_, i) => i / 1000));
    let caidas = 0;
    for (let i = 0; i < 1000; i++) if (sueltaReliquia('esqueleto', azar)) caidas++;
    expect(caidas).toBe(Math.round(PROBABILIDAD_RELIQUIA * 1000));
  });
});

describe('un bicho solo se muere una vez', () => {
  it('rematarlo lo marca muerto en el acto, no al final del tick', () => {
    const e = crearEnemigo('slime', 0, 0);
    expect(e.vivo).toBe(true);
    // De un solo golpe: tras uno normal quedan doce ticks de invulnerabilidad,
    // y un segundo golpe inmediato no llegaría a contar.
    expect(danarEnemigo(e, 999, 0)).toBe(true);
    // Si siguiera vivo aquí, `actualizarEnemigos` volvería a darlo por muerto
    // en el mismo tick y su botín se repartiría dos veces.
    expect(e.vivo).toBe(false);
  });

  it('y el recorrido de enemigos ya no lo cuenta otra vez', () => {
    const mundo = new Mundo(40, 40);
    mundo.rellenar(0, 30, 39, 39, PIEDRA);
    const e = crearEnemigo('slime', 5 * TILE, 28 * TILE);
    const jugador = crearJugador(6 * TILE, 28 * TILE).caja;
    danarEnemigo(e, 999, 0);
    const r = actualizarEnemigos(mundo, [e], jugador, { invulnerable: 0 });
    expect(r.muertos).toHaveLength(0);
  });
});

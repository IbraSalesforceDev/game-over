import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { VERSIONES } from '../src/core/versiones';
import { ATAQUES, type ClaseAtaque } from '../src/entities/ataques';
import { actualizarEnemigos, crearEnemigo, ENEMIGOS, esJefe } from '../src/entities/enemies';
import { crearJugador } from '../src/entities/player';
import { especiesPosibles } from '../src/entities/spawner';
import { Inventario } from '../src/items/inventory';
import {
  CORONA_ROTA,
  defObjeto,
  esArma,
  ESPADA_GUARDIAN,
  ESPADA_INFERNITA,
  ESPADA_VERDADERA,
  objetoExisteEn,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { PIEDRA, YUNQUE } from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import {
  CLASES_JEFE,
  JEFE_FINAL,
  JEFES,
  pagarReliquias,
  RELIQUIAS_BIOMA,
  reliquiasQueFaltan,
  tieneTodasLasReliquias,
} from '../src/world/jefes';

/** Un zurrón con las seis reliquias dentro. */
function conLasSeis(): Inventario {
  const inv = new Inventario(40);
  for (const r of RELIQUIAS_BIOMA) inv.anadir(r, 1);
  return inv;
}

describe('las seis reliquias', () => {
  it('son seis y ninguna se repite', () => {
    expect(RELIQUIAS_BIOMA).toHaveLength(6);
    expect(new Set(RELIQUIAS_BIOMA).size).toBe(6);
  });

  it('cada jefe tiene la suya, distinta de su trofeo', () => {
    for (const clase of CLASES_JEFE) {
      const def = JEFES[clase];
      expect(RELIQUIAS_BIOMA).toContain(def.reliquia);
      expect(def.reliquia).not.toBe(def.trofeo);
    }
  });

  it('cada una se forja con el arma de su bioma y un trofeo suyo', () => {
    for (const clase of CLASES_JEFE) {
      const def = JEFES[clase];
      const r = RECETAS.find((x) => x.resultado === def.reliquia);
      expect(r, clase).toBeDefined();
      expect(r!.estacion, clase).toBe(YUNQUE);
      expect(r!.desde, clase).toBe('7.2.0');
      // Dos ingredientes: el arma, que se gasta, y un trofeo suelto.
      expect(r!.ingredientes.map(([o]) => o), clase).toContain(def.trofeo);
      expect(r!.ingredientes, clase).toHaveLength(2);
    }
  });

  it('la receta gasta el arma y nunca el peto', () => {
    // Quitarle a alguien la armadura que lleva puesta para fabricar una llave
    // se lee como un castigo; el arma se vuelve a forjar con otro trofeo.
    const petos = new Set(
      RECETAS.filter((r) => r.id.startsWith('peto-')).map((r) => r.resultado),
    );
    for (const clase of CLASES_JEFE) {
      const r = RECETAS.find((x) => x.resultado === JEFES[clase].reliquia)!;
      for (const [o] of r.ingredientes) expect(petos.has(o), r.id).toBe(false);
    }
  });

  it('no existen antes de 7.2.0', () => {
    for (const r of RELIQUIAS_BIOMA) {
      expect(objetoExisteEn(r, '7.1.0')).toBe(false);
      expect(objetoExisteEn(r, '7.2.0')).toBe(true);
    }
  });
});

describe('la llave del final', () => {
  it('con las seis se abre', () => {
    const inv = conLasSeis();
    expect(tieneTodasLasReliquias(inv)).toBe(true);
    expect(reliquiasQueFaltan(inv)).toEqual([]);
  });

  it('con cinco no, y dice cuál falta', () => {
    const inv = conLasSeis();
    inv.quitar(RELIQUIAS_BIOMA[3]!, 1);
    expect(tieneTodasLasReliquias(inv)).toBe(false);
    expect(reliquiasQueFaltan(inv)).toEqual([RELIQUIAS_BIOMA[3]]);
  });

  it('seis de la misma no valen: hacen falta una de cada', () => {
    // Si contara el montón, matar seis veces al jefe más fácil abriría el
    // final y los otros cinco biomas sobrarían.
    const inv = new Inventario(40);
    inv.anadir(RELIQUIAS_BIOMA[0]!, 6);
    expect(tieneTodasLasReliquias(inv)).toBe(false);
  });

  it('cobrarlas se lleva una de cada y respeta lo demás', () => {
    const inv = conLasSeis();
    inv.anadir(RELIQUIAS_BIOMA[0]!, 2);
    expect(pagarReliquias(inv)).toBe(true);
    expect(inv.contar(RELIQUIAS_BIOMA[0]!)).toBe(2);
    for (const r of RELIQUIAS_BIOMA.slice(1)) expect(inv.contar(r)).toBe(0);
  });

  it('sin las seis no se cobra nada', () => {
    const inv = conLasSeis();
    inv.quitar(RELIQUIAS_BIOMA[5]!, 1);
    expect(pagarReliquias(inv)).toBe(false);
    // Ni una sola: cobrar a medias dejaría sin reliquias y sin jefe.
    for (const r of RELIQUIAS_BIOMA.slice(0, 5)) expect(inv.contar(r)).toBe(1);
  });
});

describe('el guardián verdadero', () => {
  const def = ENEMIGOS[JEFE_FINAL];

  it('es un jefe y no sale nunca por su cuenta', () => {
    expect(esJefe(JEFE_FINAL)).toBe(true);
    for (const bioma of ['bosque', 'desierto', 'nieve', 'jungla'] as const) {
      for (const esNoche of [true, false]) {
        for (const ty of [10, 400]) {
          const lista = especiesPosibles({ esNoche, superficieTy: 20, bioma }, ty);
          expect(lista).not.toContain(JEFE_FINAL);
        }
      }
    }
  });

  it('aguanta más del doble que cualquier jefe de bioma', () => {
    const suyos = CLASES_JEFE.map((c) => ENEMIGOS[JEFES[c].especie].vida);
    expect(def.vida).toBeGreaterThan(Math.max(...suyos) * 2);
  });

  it('y pega más que todos, el guardián de la fortaleza incluido', () => {
    const otros = [
      ...CLASES_JEFE.map((c) => ENEMIGOS[JEFES[c].especie].dano),
      ENEMIGOS.guardian.dano,
    ];
    expect(def.dano).toBeGreaterThan(Math.max(...otros));
  });

  it('alterna todos los ataques del juego', () => {
    const suyos = new Set<ClaseAtaque>([def.ataque!, ...(def.ataquesExtra ?? [])]);
    expect(suyos.size).toBe(Object.keys(ATAQUES).length);
  });

  it('y los va rotando de verdad al disparar', () => {
    const mundo = new Mundo(160, 80);
    mundo.rellenar(0, 60, 159, 79, PIEDRA);
    const boss = crearEnemigo(JEFE_FINAL, 20 * TILE, 50 * TILE);
    const jugador = crearJugador(30, 56).caja;
    const x0 = boss.caja.x;
    const y0 = boss.caja.y;
    const clases = new Set<ClaseAtaque>();
    for (let i = 0; i < 60 * 40; i++) {
      for (const d of actualizarEnemigos(mundo, [boss], jugador, { invulnerable: 0 })
        .disparos) {
        clases.add(d.clase);
      }
      boss.caja.x = x0;
      boss.caja.y = y0;
    }
    expect(clases.size).toBeGreaterThan(1);
  });

  it('es de 7.2.0 y declara una versión que existe', () => {
    expect(def.desde).toBe('7.2.0');
    expect(new Set(VERSIONES.map((v) => v.id)).has(def.desde)).toBe(true);
  });
});

describe('lo que deja', () => {
  it('la espada verdadera es la mejor del juego', () => {
    expect(esArma(ESPADA_VERDADERA)).toBe(true);
    const suya = defObjeto(ESPADA_VERDADERA).dano ?? 0;
    expect(suya).toBeGreaterThan(defObjeto(ESPADA_INFERNITA).dano ?? 0);
    expect(suya).toBeGreaterThan(defObjeto(ESPADA_GUARDIAN).dano ?? 0);
  });

  it('y no se fabrica: no hay receta que la dé', () => {
    for (const id of [ESPADA_VERDADERA, CORONA_ROTA]) {
      expect(RECETAS.find((r) => r.resultado === id), `${id}`).toBeUndefined();
    }
  });
});

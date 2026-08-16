import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import { puedeMinar } from '../src/world/edit';
import {
  ANTORCHA,
  ARENA,
  COBRE,
  HIELO,
  HIERBA,
  HIERRO,
  HOJAS,
  MADERA,
  NIEVE,
  ORO,
  PIEDRA,
  PLATA,
  TIERRA,
  TRONCO,
  nivelPicoTile,
} from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import {
  ANTORCHA_INICIAL,
  POTENCIA_MANO,
  nivelEnMano,
  potenciaEnMano,
} from '../src/items/equipo';
import {
  ESPADA_HIERRO,
  PICO_COBRE,
  PICO_HIERRO,
  PICO_MADERA,
  PICO_ORO,
  PICO_PIEDRA,
  PICO_PLATA,
  NADA,
  defObjeto,
  nivelHerramienta,
  nombrePicoDeNivel,
} from '../src/items/items';

/**
 * Niveles de herramienta.
 *
 * La escalera es la columna vertebral de la progresión: si el pico de madera
 * llegase al oro —aunque fuese despacio— no habría razón para fundir nada, y
 * todo el árbol de fabricación se quedaría de adorno. Por eso la tabla se
 * comprueba entera y no de muestra.
 */

const SUELO = 20;

function escenario(): { m: Mundo; c: Caja } {
  const m = new Mundo(60, 40);
  m.rellenar(0, SUELO, 59, 39, TIERRA);
  const c = crearCaja(10 * TILE, SUELO * TILE - JUGADOR_ALTO, JUGADOR_ANCHO, JUGADOR_ALTO);
  return { m, c };
}

/** ¿Se puede romper este tile con esta herramienta en la mano? */
function rompe(tile: number, enMano: number): boolean {
  const { m, c } = escenario();
  m.setTile(10, SUELO, tile);
  return puedeMinar(m, c, 10, SUELO, 'bloque', nivelEnMano(enMano)).ok;
}

describe('qué pide cada tile', () => {
  it('lo blando se aparta con las manos', () => {
    for (const t of [TIERRA, HIERBA, ARENA, NIEVE, MADERA, TRONCO, HOJAS]) {
      expect(nivelPicoTile(t)).toBe(0);
      expect(rompe(t, NADA)).toBe(true);
    }
  });

  it('la piedra ya no se saca a manotazos', () => {
    expect(rompe(PIEDRA, NADA)).toBe(false);
    expect(rompe(PIEDRA, PICO_MADERA)).toBe(true);
  });

  it('el cobre y el hierro piden pico de piedra', () => {
    for (const mineral of [COBRE, HIERRO]) {
      expect(rompe(mineral, PICO_MADERA)).toBe(false);
      expect(rompe(mineral, PICO_PIEDRA)).toBe(true);
      expect(rompe(mineral, PICO_COBRE)).toBe(true);
    }
  });

  it('la plata y el oro piden pico de hierro', () => {
    for (const mineral of [PLATA, ORO]) {
      expect(rompe(mineral, PICO_PIEDRA)).toBe(false);
      expect(rompe(mineral, PICO_COBRE)).toBe(false);
      expect(rompe(mineral, PICO_HIERRO)).toBe(true);
      expect(rompe(mineral, PICO_ORO)).toBe(true);
    }
  });

  it('el hielo se pica pero no se rompe con la mano', () => {
    expect(rompe(HIELO, NADA)).toBe(false);
    expect(rompe(HIELO, PICO_MADERA)).toBe(true);
  });

  it('el rechazo dice qué pico hace falta', () => {
    const { m, c } = escenario();
    m.setTile(10, SUELO, ORO);
    const r = puedeMinar(m, c, 10, SUELO, 'bloque', nivelEnMano(PICO_MADERA));
    expect(r.motivo).toBe('herramienta');
    expect(r.nivelPedido).toBe(nivelPicoTile(ORO));
    expect(nombrePicoDeNivel(r.nivelPedido!)).toBe('pico de hierro');
  });

  it('las paredes heredan el nivel de su bloque', () => {
    const { m, c } = escenario();
    m.setPared(10, SUELO, PIEDRA);
    expect(puedeMinar(m, c, 10, SUELO, 'pared', 0).motivo).toBe('herramienta');
    expect(puedeMinar(m, c, 10, SUELO, 'pared', 1).ok).toBe(true);
  });

  it('sin pasar nivel se mina todo: los tests viejos no cambian de sentido', () => {
    const { m, c } = escenario();
    m.setTile(10, SUELO, ORO);
    expect(puedeMinar(m, c, 10, SUELO, 'bloque').ok).toBe(true);
  });
});

describe('la escalera de picos', () => {
  const ESCALERA = [PICO_MADERA, PICO_PIEDRA, PICO_COBRE, PICO_HIERRO, PICO_PLATA, PICO_ORO];

  it('cada pico es de más nivel y más potencia que el anterior', () => {
    for (let i = 1; i < ESCALERA.length; i++) {
      const antes = defObjeto(ESCALERA[i - 1]!);
      const ahora = defObjeto(ESCALERA[i]!);
      expect(ahora.nivel!).toBeGreaterThan(antes.nivel!);
      expect(ahora.potencia!).toBeGreaterThan(antes.potencia!);
    }
  });

  it('los niveles van de 1 a 6 sin saltos', () => {
    ESCALERA.forEach((id, i) => expect(nivelHerramienta(id)).toBe(i + 1));
  });

  it('cada pico rompe todo lo que rompía el anterior', () => {
    const tiles = [TIERRA, PIEDRA, COBRE, HIERRO, PLATA, ORO];
    for (let i = 1; i < ESCALERA.length; i++) {
      for (const t of tiles) {
        if (rompe(t, ESCALERA[i - 1]!)) expect(rompe(t, ESCALERA[i]!)).toBe(true);
      }
    }
  });
});

describe('potencia según lo que se lleve en la mano', () => {
  it('las manos pican, pero flojo', () => {
    expect(potenciaEnMano(NADA)).toBe(POTENCIA_MANO);
    expect(POTENCIA_MANO).toBeGreaterThan(0);
    expect(POTENCIA_MANO).toBeLessThan(defObjeto(PICO_MADERA).potencia! / 2);
  });

  it('una antorcha no pica como un pico', () => {
    expect(potenciaEnMano(ANTORCHA)).toBeLessThan(potenciaEnMano(PICO_MADERA));
    expect(nivelEnMano(ANTORCHA)).toBe(0);
  });

  it('una espada no da nivel de pico: sirve para pegar, no para cavar', () => {
    expect(nivelEnMano(ESPADA_HIERRO)).toBe(0);
    expect(rompe(PIEDRA, ESPADA_HIERRO)).toBe(false);
  });

  it('el equipo inicial trae con qué empezar a cavar', () => {
    expect(nivelEnMano(PICO_MADERA)).toBeGreaterThanOrEqual(nivelPicoTile(PIEDRA));
    expect(ANTORCHA_INICIAL).toBeGreaterThan(0);
  });
});

describe('nombres de los picos', () => {
  it('traduce el nivel al pico que hace falta', () => {
    expect(nombrePicoDeNivel(1)).toBe('pico de madera');
    expect(nombrePicoDeNivel(2)).toBe('pico de piedra');
    expect(nombrePicoDeNivel(4)).toBe('pico de hierro');
  });

  it('un nivel disparatado no rompe el aviso', () => {
    expect(nombrePicoDeNivel(99)).toBe('pico de oro');
    expect(nombrePicoDeNivel(0)).toBe('un pico');
  });
});

import { describe, expect, it } from 'vitest';
import {
  CASTIGO_PALA,
  POTENCIA_MANO,
  potenciaContra,
  potenciaEnMano,
} from '../src/items/equipo';
import {
  AZADA,
  dropDeTile,
  esAzada,
  esPala,
  PALA_HIERRO,
  PICO_HIERRO,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import {
  ARENA,
  esBlando,
  HIERBA,
  NIEVE,
  PIEDRA,
  TIERRA,
  TIERRA_LABRADA,
  COBRE,
} from '../src/world/tiles';
import { YUNQUE } from '../src/world/tiles';

/**
 * Pala y azada.
 *
 * La pala existe para no ser un pico mejor. Si lo fuera nadie volvería a llevar
 * pico y el par dejaría de tener sentido, así que lo que se comprueba es
 * justamente que sea mala donde el pico es bueno.
 */

describe('qué es blando', () => {
  it('lo que se aparta a paladas', () => {
    for (const t of [TIERRA, HIERBA, ARENA, NIEVE, TIERRA_LABRADA]) {
      expect(esBlando(t)).toBe(true);
    }
  });

  it('la roca y el mineral no', () => {
    for (const t of [PIEDRA, COBRE]) expect(esBlando(t)).toBe(false);
  });
});

describe('la pala', () => {
  it('cava lo blando mucho más rápido que el pico de hierro', () => {
    expect(potenciaContra(PALA_HIERRO, TIERRA)).toBeGreaterThan(
      potenciaContra(PICO_HIERRO, TIERRA) * 2,
    );
  });

  it('con la piedra apenas puede', () => {
    expect(potenciaContra(PALA_HIERRO, PIEDRA)).toBeLessThan(
      potenciaContra(PICO_HIERRO, PIEDRA),
    );
    expect(potenciaContra(PALA_HIERRO, PIEDRA)).toBe(
      potenciaEnMano(PALA_HIERRO) * CASTIGO_PALA,
    );
  });

  it('pero no deja a nadie encerrado: sigue picando algo', () => {
    expect(potenciaContra(PALA_HIERRO, PIEDRA)).toBeGreaterThan(0);
  });

  it('el pico va igual contra todo: el material no le cambia la potencia', () => {
    for (const t of [TIERRA, PIEDRA, ARENA]) {
      expect(potenciaContra(PICO_HIERRO, t)).toBe(potenciaEnMano(PICO_HIERRO));
    }
  });

  it('las manos siguen siendo las manos, apunte donde apunte', () => {
    expect(potenciaContra(TIERRA, TIERRA)).toBe(POTENCIA_MANO);
  });

  it('se forja en el yunque y cuesta parecido al pico de hierro', () => {
    const pala = RECETAS.find((r) => r.resultado === PALA_HIERRO)!;
    const pico = RECETAS.find((r) => r.resultado === PICO_HIERRO)!;
    expect(pala.estacion).toBe(YUNQUE);
    const total = (r: typeof pala): number =>
      r.ingredientes.reduce((a, [, n]) => a + n, 0);
    // Ni la mitad ni el doble: es la otra mitad del par, no una mejora.
    expect(total(pala)).toBeGreaterThan(total(pico) * 0.5);
    expect(total(pala)).toBeLessThan(total(pico) * 1.5);
  });
});

describe('la azada', () => {
  it('no pica nada: no es una herramienta de romper', () => {
    expect(esAzada(AZADA)).toBe(true);
    expect(esPala(AZADA)).toBe(false);
    expect(potenciaEnMano(AZADA)).toBe(0);
  });

  it('la tierra labrada vuelve tierra al romperla', () => {
    // Labrar no crea material: si soltara un bloque propio se podría labrar y
    // romper en bucle para fabricar tierra de la nada.
    expect(dropDeTile(TIERRA_LABRADA)).toBe(TIERRA);
  });

  it('se forja en el yunque', () => {
    expect(RECETAS.find((r) => r.resultado === AZADA)!.estacion).toBe(YUNQUE);
  });
});

import { describe, expect, it } from 'vitest';
import {
  cabeEnEquipo,
  crearEquipo,
  danoTrasArmadura,
  defensaTotal,
  indiceDeHueco,
  MINIMO_PASA,
  RANURAS_EQUIPO,
} from '../src/items/equipado';
import {
  CASCO_COBRE,
  CASCO_HIERRO,
  CASCO_ORO,
  CASCO_PLATA,
  defensaDe,
  esArmadura,
  GREBAS_COBRE,
  GREBAS_ORO,
  HUECOS,
  huecoDe,
  PETO_COBRE,
  PETO_ORO,
  PICO_HIERRO,
  defObjeto,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { TIERRA, YUNQUE } from '../src/world/tiles';

/**
 * Armadura.
 *
 * Lo que se comprueba es que la escalera suba y que el suelo de daño aguante:
 * una armadura que anula el golpe convierte el combate en un trámite, y es la
 * clase de rotura que solo se nota veinte horas después de haberla metido.
 */

describe('las piezas', () => {
  it('hay cinco huecos y cinco ranuras', () => {
    expect(HUECOS).toHaveLength(5);
    expect(RANURAS_EQUIPO).toBe(5);
    HUECOS.forEach((h, i) => expect(indiceDeHueco(h)).toBe(i));
  });

  it('cada pieza sabe su hueco y da defensa', () => {
    for (const id of [CASCO_COBRE, PETO_COBRE, GREBAS_COBRE]) {
      expect(esArmadura(id)).toBe(true);
      expect(huecoDe(id)).not.toBeNull();
      expect(defensaDe(id)).toBeGreaterThan(0);
    }
  });

  it('el peto defiende más que las grebas y estas más que el casco', () => {
    expect(defensaDe(PETO_ORO)).toBeGreaterThan(defensaDe(GREBAS_ORO));
    expect(defensaDe(GREBAS_ORO)).toBeGreaterThan(defensaDe(CASCO_ORO));
  });

  it('cada metal defiende más que el anterior', () => {
    const escalera = [CASCO_COBRE, CASCO_HIERRO, CASCO_PLATA, CASCO_ORO];
    for (let i = 1; i < escalera.length; i++) {
      expect(defensaDe(escalera[i]!)).toBeGreaterThan(defensaDe(escalera[i - 1]!));
    }
  });

  it('las veinte piezas se forjan en el yunque', () => {
    // Cinco huecos por cuatro metales.
    const recetas = RECETAS.filter((r) => esArmadura(r.resultado));
    expect(recetas).toHaveLength(20);
    for (const r of recetas) expect(r.estacion).toBe(YUNQUE);
    expect(new Set(recetas.map((r) => r.resultado)).size).toBe(20);
  });

  it('el juego completo cuesta más que el pico del mismo metal', () => {
    const coste = (id: number): number => {
      const r = RECETAS.find((x) => x.resultado === id)!;
      return r.ingredientes.reduce((a, [, n]) => a + n, 0);
    };
    const juego = coste(CASCO_HIERRO) + coste(PETO_COBRE) + coste(GREBAS_COBRE);
    expect(juego).toBeGreaterThan(coste(PICO_HIERRO));
  });
});

describe('qué cabe en cada hueco', () => {
  it('cada pieza solo entra en la suya', () => {
    expect(cabeEnEquipo(CASCO_COBRE, indiceDeHueco('cabeza'))).toBe(true);
    expect(cabeEnEquipo(CASCO_COBRE, indiceDeHueco('torso'))).toBe(false);
    expect(cabeEnEquipo(PETO_COBRE, indiceDeHueco('torso'))).toBe(true);
    expect(cabeEnEquipo(GREBAS_COBRE, indiceDeHueco('piernas'))).toBe(true);
  });

  it('lo que no es armadura no entra en ningún hueco', () => {
    for (let i = 0; i < RANURAS_EQUIPO; i++) {
      expect(cabeEnEquipo(TIERRA, i)).toBe(false);
      expect(cabeEnEquipo(PICO_HIERRO, i)).toBe(false);
    }
  });

  it('vaciar una ranura siempre se puede', () => {
    for (let i = 0; i < RANURAS_EQUIPO; i++) expect(cabeEnEquipo(0, i)).toBe(true);
  });
});

describe('la defensa que se lleva puesta', () => {
  it('suma las piezas y nada más', () => {
    const eq = crearEquipo();
    expect(defensaTotal(eq)).toBe(0);
    eq.ponerEn(indiceDeHueco('cabeza'), CASCO_ORO, 1);
    eq.ponerEn(indiceDeHueco('torso'), PETO_ORO, 1);
    expect(defensaTotal(eq)).toBe(defensaDe(CASCO_ORO) + defensaDe(PETO_ORO));
  });

  it('una ranura sin cantidad no cuenta', () => {
    const eq = crearEquipo();
    eq.ranuras[0]!.objeto = CASCO_ORO;
    eq.ranuras[0]!.cantidad = 0;
    expect(defensaTotal(eq)).toBe(0);
  });

  it('mezclar metales es un estado válido', () => {
    const eq = crearEquipo();
    eq.ponerEn(indiceDeHueco('cabeza'), CASCO_COBRE, 1);
    eq.ponerEn(indiceDeHueco('torso'), PETO_ORO, 1);
    expect(defensaTotal(eq)).toBeGreaterThan(defensaDe(CASCO_COBRE));
  });
});

describe('el daño que llega', () => {
  it('sin armadura llega entero', () => {
    expect(danoTrasArmadura(18, 0)).toBe(18);
  });

  it('la defensa lo descuenta', () => {
    expect(danoTrasArmadura(18, 6)).toBe(12);
  });

  it('nunca para más de tres cuartas partes del golpe', () => {
    // Aunque la defensa supere al daño con creces.
    expect(danoTrasArmadura(40, 999)).toBe(Math.round(40 * MINIMO_PASA));
    expect(danoTrasArmadura(18, 999)).toBeGreaterThan(0);
  });

  it('siempre pasa al menos un punto', () => {
    expect(danoTrasArmadura(1, 999)).toBe(1);
    expect(danoTrasArmadura(2, 999)).toBe(1);
  });

  it('un golpe de cero sigue siendo cero', () => {
    expect(danoTrasArmadura(0, 5)).toBe(0);
  });

  it('el juego completo de oro no vuelve inofensivo a un zombi', () => {
    const eq = crearEquipo();
    eq.ponerEn(indiceDeHueco('cabeza'), CASCO_ORO, 1);
    eq.ponerEn(indiceDeHueco('torso'), PETO_ORO, 1);
    eq.ponerEn(indiceDeHueco('piernas'), GREBAS_ORO, 1);
    const llega = danoTrasArmadura(18, defensaTotal(eq));
    expect(llega).toBeGreaterThan(2);
    expect(llega).toBeLessThan(18);
  });

  it('las piezas tienen nombre propio, no el genérico del catálogo', () => {
    expect(defObjeto(PETO_ORO).nombre).toBe('peto de oro');
    expect(defObjeto(GREBAS_COBRE).nombre).toBe('grebas de cobre');
  });
});

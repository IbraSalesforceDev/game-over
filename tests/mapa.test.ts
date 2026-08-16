import { describe, expect, it } from 'vitest';
import {
  ALCANCE_MAPA,
  alcanceDeMapa,
  defObjeto,
  esMapa,
  MAPAS,
  MAPA_1,
  MAPA_5,
  NADA,
  PAPEL,
  PICO_HIERRO,
} from '../src/items/items';
import { RECETAS } from '../src/items/recipes';
import { pasoDeMuestreo, regionDelMapa } from '../src/ui/mapa';
import { CANA, defTile, esSolido, MESA, nivelPicoTile, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

/**
 * Caña, papel y mapa.
 *
 * La escalera de mapas es lo que convierte "ver el mundo" en algo que se gana.
 * Lo que se comprueba es que sea de verdad una escalera —cada nivel pide el
 * anterior— y que la ventana no se salga del mundo por los bordes, que es donde
 * los recortes suelen fallar.
 */

describe('la escalera de mapas', () => {
  it('son cinco y cada uno ve más que el anterior', () => {
    expect(MAPAS).toHaveLength(5);
    expect(ALCANCE_MAPA).toHaveLength(5);
    for (let i = 1; i < ALCANCE_MAPA.length; i++) {
      expect(ALCANCE_MAPA[i]!).toBeGreaterThan(ALCANCE_MAPA[i - 1]!);
    }
  });

  it('el último ve el mundo entero', () => {
    expect(alcanceDeMapa(MAPA_5)).toBe(Infinity);
    expect(Number.isFinite(alcanceDeMapa(MAPA_1))).toBe(true);
  });

  it('lo que no es un mapa no ve nada', () => {
    expect(alcanceDeMapa(PICO_HIERRO)).toBe(0);
    expect(alcanceDeMapa(NADA)).toBe(0);
    expect(esMapa(PAPEL)).toBe(false);
  });

  it('cada ampliación consume el mapa anterior', () => {
    for (let i = 1; i < MAPAS.length; i++) {
      const receta = RECETAS.find((r) => r.resultado === MAPAS[i])!;
      const ingredientes = receta.ingredientes.map(([id]) => id);
      expect(ingredientes).toContain(MAPAS[i - 1]);
      expect(ingredientes).toContain(PAPEL);
    }
  });

  it('el primero solo cuesta papel: no hace falta tener nada antes', () => {
    const primera = RECETAS.find((r) => r.resultado === MAPA_1)!;
    expect(primera.ingredientes).toEqual([[PAPEL, 2]]);
  });

  it('el mapa del mundo entero cuesta diez papeles en total', () => {
    // Dos por escalón, cinco escalones. Es lo que impide fabricarlo del tirón.
    let papeles = 0;
    for (const id of MAPAS) {
      const r = RECETAS.find((x) => x.resultado === id)!;
      papeles += r.ingredientes.find(([ing]) => ing === PAPEL)?.[1] ?? 0;
    }
    expect(papeles).toBe(10);
  });

  it('el papel sale de la caña, y todo se hace en la mesa', () => {
    const papel = RECETAS.find((r) => r.resultado === PAPEL)!;
    expect(papel.ingredientes.map(([id]) => id)).toEqual([CANA]);
    expect(papel.cantidad).toBeGreaterThan(1);
    for (const id of [PAPEL, ...MAPAS]) {
      expect(RECETAS.find((r) => r.resultado === id)!.estacion).toBe(MESA);
    }
  });

  it('los cinco tienen nombre propio', () => {
    const nombres = MAPAS.map((id) => defObjeto(id).nombre);
    expect(new Set(nombres).size).toBe(5);
    expect(nombres[4]).toBe('mapa del mundo');
  });

  it('un mapa no se apila: no tiene sentido llevar dos iguales', () => {
    for (const id of MAPAS) expect(defObjeto(id).maxPila).toBe(1);
  });
});

describe('la ventana del mapa', () => {
  const m = new Mundo(400, 200);

  it('se centra en el jugador', () => {
    const r = regionDelMapa(m, 200, 100, 50);
    expect(r.ancho).toBe(101);
    expect(r.tx0 + Math.floor(r.ancho / 2)).toBe(200);
    expect(r.ty0 + Math.floor(r.alto / 2)).toBe(100);
  });

  it('en el borde se pega al borde en vez de salirse', () => {
    const izquierda = regionDelMapa(m, 2, 2, 50);
    expect(izquierda.tx0).toBe(0);
    expect(izquierda.ty0).toBe(0);
    const derecha = regionDelMapa(m, 399, 199, 50);
    expect(derecha.tx0 + derecha.ancho).toBe(m.ancho);
    expect(derecha.ty0 + derecha.alto).toBe(m.alto);
  });

  it('un alcance mayor que el mundo lo enseña entero, sin desbordar', () => {
    const r = regionDelMapa(m, 200, 100, 9999);
    expect(r).toEqual({ tx0: 0, ty0: 0, ancho: 400, alto: 200 });
  });

  it('el del mundo entero abarca todo el mundo', () => {
    const r = regionDelMapa(m, 10, 10, Infinity);
    expect(r).toEqual({ tx0: 0, ty0: 0, ancho: 400, alto: 200 });
  });

  it('la ventana nunca se sale de los límites, mire donde mire', () => {
    for (const [tx, ty] of [[0, 0], [399, 199], [200, 0], [0, 199]] as const) {
      for (const alcance of ALCANCE_MAPA) {
        const r = regionDelMapa(m, tx, ty, alcance);
        expect(r.tx0).toBeGreaterThanOrEqual(0);
        expect(r.ty0).toBeGreaterThanOrEqual(0);
        expect(r.tx0 + r.ancho).toBeLessThanOrEqual(m.ancho);
        expect(r.ty0 + r.alto).toBeLessThanOrEqual(m.alto);
      }
    }
  });
});

describe('el muestreo', () => {
  it('un mapa pequeño va tile a tile', () => {
    expect(pasoDeMuestreo(91, 91)).toBe(1);
  });

  it('el mundo enorme se muestrea para que el lienzo no se dispare', () => {
    const paso = pasoDeMuestreo(4800, 900);
    expect(paso).toBeGreaterThan(1);
    expect(Math.ceil(4800 / paso)).toBeLessThanOrEqual(1400);
  });
});

describe('la caña de azúcar', () => {
  it('se puede volver a plantar: es un bloque que se suelta a sí mismo', () => {
    expect(defObjeto(CANA).tile).toBe(CANA);
  });

  it('no frena al pasar por encima, como los árboles', () => {
    // Si fuera sólida, plantar un cañaveral sería levantar una valla sin querer.
    expect(esSolido(CANA)).toBe(false);
  });

  it('se rompe de un manotazo: es una planta, no un bloque', () => {
    expect(nivelPicoTile(CANA)).toBe(0);
    expect(defTile(CANA).dureza).toBeLessThan(defTile(TIERRA).dureza);
  });
});

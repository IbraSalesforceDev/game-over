import { describe, expect, it } from 'vitest';
import {
  alMenos,
  DESDE,
  hay,
  indiceVersion,
  version,
  VERSIONES,
  VERSION_ACTUAL,
  VERSION_MINIMA,
  type Caracteristica,
} from '../src/core/versiones';
import { generarMundo } from '../src/world/gen/worldgen';
import { RECETAS, recetasVisibles, existeEn } from '../src/items/recipes';
import { ENEMIGOS, especieExisteEn, type Especie } from '../src/entities/enemies';
import { especiesPosibles } from '../src/entities/spawner';
import { MESA, HORNO, YUNQUE, CANA, HIERBA_JUNGLA, ARENA } from '../src/world/tiles';
import { FORTALEZA } from '../src/world/estructuras';

describe('el catálogo de versiones', () => {
  it('está ordenado y sin repetidos', () => {
    const vistos = new Set<string>();
    for (const v of VERSIONES) {
      expect(vistos.has(v.id)).toBe(false);
      vistos.add(v.id);
    }
    expect(VERSIONES.length).toBeGreaterThan(1);
  });

  it('los tres números siguen la regla: el parche vuelve a 0 al subir el menor', () => {
    let anterior: [number, number, number] | null = null;
    for (const v of VERSIONES) {
      const partes = v.id.split('.').map(Number) as [number, number, number];
      expect(partes).toHaveLength(3);
      expect(partes.every(Number.isInteger)).toBe(true);
      if (anterior) {
        const [aM, am, ap] = anterior;
        const [M, m, p] = partes;
        // Sube exactamente uno de los tres, y lo que queda a su derecha se
        // pone a cero. Cualquier otra cosa sería otra regla.
        const subeMayor = M === aM + 1 && m === 0 && p === 0;
        const subeMenor = M === aM && m === am + 1 && p === 0;
        const subeParche = M === aM && m === am && p === ap + 1;
        expect(subeMayor || subeMenor || subeParche).toBe(true);
      }
      anterior = partes;
    }
  });

  it('todas son prealfa por ahora, y todas se explican', () => {
    for (const v of VERSIONES) {
      expect(v.etapa).toBe('prealfa');
      expect(v.resumen.length).toBeGreaterThan(10);
      expect(v.cambios.length).toBeGreaterThan(0);
      expect(v.nombre.length).toBeGreaterThan(0);
    }
  });

  it('la primera es 1.0.0 y la actual es la última de la lista', () => {
    expect(VERSION_MINIMA).toBe('1.0.0');
    expect(VERSION_ACTUAL).toBe(VERSIONES[VERSIONES.length - 1]!.id);
  });

  it('compara por historia, no por texto', () => {
    // El fallo clásico: ordenando como texto, "4.10.0" iría antes que "4.2.0".
    expect(alMenos('4.0.0', '3.2.0')).toBe(true);
    expect(alMenos('3.2.0', '4.0.0')).toBe(false);
    expect(alMenos('2.2.1', '2.2.0')).toBe(true);
    expect(alMenos('1.0.0', '1.0.0')).toBe(true);
  });

  it('una versión desconocida cae en la actual, no revienta', () => {
    expect(indiceVersion('9.9.9')).toBe(-1);
    expect(version('9.9.9').id).toBe(VERSION_ACTUAL);
    expect(alMenos('9.9.9', '1.0.0')).toBe(true);
  });

  it('cada característica llega en una versión que existe', () => {
    for (const [que, desde] of Object.entries(DESDE)) {
      expect(indiceVersion(desde), `${que} dice venir de ${desde}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('en la versión actual está todo', () => {
    for (const que of Object.keys(DESDE) as Caracteristica[]) {
      expect(hay(que, VERSION_ACTUAL)).toBe(true);
    }
  });

  it('en la primera versión no hay casi nada', () => {
    for (const que of Object.keys(DESDE) as Caracteristica[]) {
      expect(hay(que, '1.0.0')).toBe(false);
    }
  });
});

describe('las versiones viejas también se ven viejas', () => {
  it('los sprites, el fondo y las sombras llegan en 2.2.0', () => {
    for (const que of ['spritesAnimados', 'fondoParallax', 'sombras'] as const) {
      expect(hay(que, '2.1.0')).toBe(false);
      expect(hay(que, '2.2.0')).toBe(true);
    }
  });

  it('los iconos dibujados y el objeto en la mano llegan en 2.2.1', () => {
    expect(hay('iconosDibujados', '2.2.0')).toBe(false);
    expect(hay('iconosDibujados', '2.2.1')).toBe(true);
    expect(hay('objetoEnMano', '2.2.0')).toBe(false);
    expect(hay('objetoEnMano', '2.2.1')).toBe(true);
  });

  it('el sol y la luna llegan con el ciclo de día y noche', () => {
    expect(hay('astros', '1.4.0')).toBe(false);
    expect(hay('astros', '1.5.0')).toBe(true);
    // Van juntos por definición: no tiene sentido un sol que no se mueve ni un
    // ciclo de día sin sol que lo represente.
    expect(DESDE.astros).toBe(DESDE.diaNoche);
  });

  it('cada medidor del HUD aparece con el sistema que mide', () => {
    expect(DESDE.barraVida).toBe(DESDE.combate);
    expect(DESDE.barraAliento).toBe(DESDE.liquidos);
    expect(hay('barraVida', '1.7.0')).toBe(false);
    expect(hay('hambre', '2.2.1')).toBe(false);
  });

  it('lo visual no puede llegar antes que lo que dibuja', () => {
    // La armadura no se puede ver antes de que exista la armadura, y no puede
    // haber barra de enemigo antes de que haya enemigos.
    expect(alMenos(DESDE.armaduraVisible, DESDE.armadura)).toBe(true);
    expect(alMenos(DESDE.barraVida, DESDE.combate)).toBe(true);
    expect(alMenos(DESDE.audioPorMaterial, DESDE.audio)).toBe(true);
    expect(alMenos(DESDE.mares, DESDE.liquidos)).toBe(true);
    expect(alMenos(DESDE.jefe, DESDE.estructuras)).toBe(true);
  });
});

describe('un mundo trae solo lo de su versión', () => {
  const OP = { ancho: 400, alto: 300, semilla: 'VERSIONES' };

  it('la versión actual tiene fortaleza; 3.2.0 no', () => {
    expect(
      generarMundo({ ...OP, version: VERSION_ACTUAL }).estructuras.some(
        (e) => e.tipo === FORTALEZA,
      ),
    ).toBe(true);
    expect(generarMundo({ ...OP, version: '3.2.0' }).estructuras).toEqual([]);
    expect(generarMundo({ ...OP, version: '3.2.0' }).cofres).toEqual([]);
  });

  it('3.1.0 tiene selva; 2.1.0 solo desierto y nieve; 1.4.0 ninguno', () => {
    const conSelva = generarMundo({ ...OP, version: '3.1.0' });
    const secos = generarMundo({ ...OP, version: '2.1.0' });
    const sinBiomas = generarMundo({ ...OP, version: '1.4.0' });
    const tieneJungla = (m: ReturnType<typeof generarMundo>): boolean =>
      m.mundo.tileId.includes(HIERBA_JUNGLA);
    const tieneArena = (m: ReturnType<typeof generarMundo>): boolean =>
      m.mundo.tileId.includes(ARENA);

    expect(tieneJungla(conSelva)).toBe(true);
    expect(tieneJungla(secos)).toBe(false);
    expect(tieneArena(secos)).toBe(true);
    expect(tieneJungla(sinBiomas)).toBe(false);
    expect(tieneArena(sinBiomas)).toBe(false);
  });

  it('sin líquidos antes de 2.1.0', () => {
    const seco = generarMundo({ ...OP, version: '2.0.0' });
    expect(seco.mundo.liquido.some((l) => l > 0)).toBe(false);
    const mojado = generarMundo({ ...OP, version: '2.1.0' });
    expect(mojado.mundo.liquido.some((l) => l > 0)).toBe(true);
  });

  it('sin caña antes de 3.0.0', () => {
    expect(generarMundo({ ...OP, version: '2.3.1' }).mundo.tileId.includes(CANA)).toBe(false);
  });

  it('la misma semilla y versión dan el mismo mundo', () => {
    const a = generarMundo({ ...OP, version: '3.0.0' });
    const b = generarMundo({ ...OP, version: '3.0.0' });
    expect(a.mundo.tileId).toEqual(b.mundo.tileId);
  });

  it('la misma semilla en versiones distintas da mundos distintos', () => {
    const a = generarMundo({ ...OP, version: '2.1.0' });
    const b = generarMundo({ ...OP, version: VERSION_ACTUAL });
    expect(a.mundo.tileId).not.toEqual(b.mundo.tileId);
  });
});

describe('las recetas y los bichos llegan cuando llegaron', () => {
  const estaciones = new Set([MESA, HORNO, YUNQUE]);

  it('en 1.7.0 no se puede fabricar un arco', () => {
    const ids = recetasVisibles(estaciones, '1.7.0').map((r) => r.id);
    expect(ids).toContain('pico-madera');
    expect(ids).not.toContain('arco');
    expect(ids).not.toContain('brujula');
  });

  it('la lista solo crece al avanzar de versión', () => {
    let anterior = -1;
    for (const v of VERSIONES) {
      const cuantas = recetasVisibles(estaciones, v.id).length;
      expect(cuantas).toBeGreaterThanOrEqual(anterior);
      anterior = cuantas;
    }
    expect(recetasVisibles(estaciones, VERSION_ACTUAL).length).toBe(RECETAS.length);
  });

  it('toda receta declara de cuándo es, y es una versión real', () => {
    for (const r of RECETAS) {
      expect(r.desde, `la receta ${r.id} no dice de cuándo es`).toBeDefined();
      expect(indiceVersion(r.desde!)).toBeGreaterThanOrEqual(0);
      expect(existeEn(r, VERSION_ACTUAL)).toBe(true);
    }
  });

  it('antes de 2.0.0 no aparece ningún bicho', () => {
    const ctx = { esNoche: true, superficieTy: 20, bioma: 'bosque' as const, version: '1.7.0' };
    expect(especiesPosibles(ctx, 10)).toEqual([]);
  });

  it('en 2.0.0 hay zombis pero no esqueletos', () => {
    const ctx = { esNoche: true, superficieTy: 20, bioma: 'bosque' as const, version: '2.0.0' };
    const lista = especiesPosibles(ctx, 400);
    expect(lista).toContain('zombi');
    expect(lista).not.toContain('esqueleto');
  });

  it('toda especie declara de cuándo es', () => {
    for (const especie of Object.keys(ENEMIGOS) as Especie[]) {
      expect(indiceVersion(ENEMIGOS[especie].desde)).toBeGreaterThanOrEqual(0);
      expect(especieExisteEn(especie, VERSION_ACTUAL)).toBe(true);
    }
  });
});

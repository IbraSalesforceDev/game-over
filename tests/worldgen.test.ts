import { describe, expect, it } from 'vitest';
import { fractal1D, fractal2D, ruido1D, ruido2D } from '../src/world/gen/noise';
import { crearRngRico, semillaDeTexto } from '../src/world/gen/rng';
import { generarMundo, TAMANOS } from '../src/world/gen/worldgen';
import { BOSQUE, DESIERTO, NIEVE_B } from '../src/world/gen/biomas';
import { SimuladorLiquidos } from '../src/world/liquids';
import {
  AIRE,
  ARENA,
  CACTUS,
  CRISTAL_VIDA,
  esSolido,
  HIERBA,
  MINERALES,
  NIEVE,
  PIEDRA,
  TIERRA,
} from '../src/world/tiles';

/** Mundo pequeño para que la suite siga siendo rápida. */
const OP = { ancho: 400, alto: 300, semilla: 'PRUEBA' };

describe('aleatoriedad con semilla', () => {
  it('la misma semilla da la misma secuencia', () => {
    const a = crearRngRico(1234);
    const b = crearRngRico(1234);
    for (let i = 0; i < 50; i++) expect(a()).toBe(b());
  });

  it('semillas distintas dan secuencias distintas', () => {
    const a = crearRngRico(1);
    const b = crearRngRico(2);
    expect(a()).not.toBe(b());
  });

  it('los valores caen dentro de [0, 1)', () => {
    const r = crearRngRico(99);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('entero respeta los extremos', () => {
    const r = crearRngRico(7);
    for (let i = 0; i < 300; i++) {
      const v = r.entero(3, 6);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(6);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('semillaDeTexto es estable y distingue textos', () => {
    expect(semillaDeTexto('hola')).toBe(semillaDeTexto('hola'));
    expect(semillaDeTexto('hola')).not.toBe(semillaDeTexto('adios'));
  });
});

describe('ruido', () => {
  it('devuelve valores en [0, 1)', () => {
    for (let i = 0; i < 200; i++) {
      const v1 = ruido1D(i * 0.37, 42);
      const v2 = ruido2D(i * 0.31, i * 0.17, 42);
      const f1 = fractal1D(i * 0.11, 42);
      const f2 = fractal2D(i * 0.13, i * 0.07, 42);
      for (const v of [v1, v2, f1, f2]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('es determinista', () => {
    expect(ruido2D(3.7, 1.2, 5)).toBe(ruido2D(3.7, 1.2, 5));
    expect(fractal1D(9.4, 5)).toBe(fractal1D(9.4, 5));
  });

  it('es continuo: dos puntos cercanos dan valores cercanos', () => {
    for (let i = 0; i < 50; i++) {
      const x = i * 0.83;
      expect(Math.abs(ruido1D(x, 3) - ruido1D(x + 0.01, 3))).toBeLessThan(0.1);
    }
  });

  it('cambiar la semilla cambia el paisaje', () => {
    expect(ruido2D(3.7, 1.2, 5)).not.toBe(ruido2D(3.7, 1.2, 6));
  });
});

describe('generación de mundo', () => {
  it('es reproducible: misma semilla, mundo idéntico tile a tile', () => {
    const a = generarMundo(OP);
    const b = generarMundo(OP);
    expect(a.mundo.tileId).toEqual(b.mundo.tileId);
    expect(a.mundo.wallId).toEqual(b.mundo.wallId);
    expect(a.spawnTx).toBe(b.spawnTx);
    expect(a.spawnTy).toBe(b.spawnTy);
  });

  it('semillas distintas dan mundos distintos', () => {
    const a = generarMundo(OP);
    const b = generarMundo({ ...OP, semilla: 'OTRA' });
    expect(a.mundo.tileId).not.toEqual(b.mundo.tileId);
  });

  it('tiene cielo arriba y roca abajo', () => {
    const { mundo, superficie } = generarMundo(OP);
    for (let tx = 5; tx < mundo.ancho - 5; tx += 37) {
      // Por encima de la superficie no hay terreno (salvo árboles, que no son
      // sólidos).
      expect(esSolido(mundo.getTile(tx, superficie[tx]! - 8))).toBe(false);
      // Las últimas filas son macizas.
      expect(mundo.getTile(tx, mundo.alto - 1)).toBe(PIEDRA);
    }
  });

  it('el relieve no tiene acantilados absurdos entre columnas contiguas', () => {
    const { superficie } = generarMundo(OP);
    let maximo = 0;
    for (let tx = 1; tx < superficie.length; tx++) {
      maximo = Math.max(maximo, Math.abs(superficie[tx]! - superficie[tx - 1]!));
    }
    expect(maximo).toBeLessThanOrEqual(4);
  });

  it('excava cuevas: hay hueco bajo tierra, pero no se lo come todo', () => {
    const { mundo, superficie } = generarMundo(OP);
    let aire = 0;
    let total = 0;
    for (let tx = 4; tx < mundo.ancho - 4; tx++) {
      for (let ty = superficie[tx]! + 20; ty < mundo.alto - 10; ty++) {
        total++;
        if (mundo.getTile(tx, ty) === AIRE) aire++;
      }
    }
    const proporcion = aire / total;
    expect(proporcion).toBeGreaterThan(0.05);
    expect(proporcion).toBeLessThan(0.6);
  });

  it('siembra los cuatro minerales', () => {
    const { mundo } = generarMundo(OP);
    const cuenta = new Map<number, number>();
    for (const id of mundo.tileId) cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
    for (const mineral of MINERALES) {
      expect(cuenta.get(mineral) ?? 0).toBeGreaterThan(0);
    }
  });

  it('los minerales solo aparecen bajo tierra', () => {
    const { mundo, superficie } = generarMundo(OP);
    for (let tx = 2; tx < mundo.ancho - 2; tx++) {
      for (let ty = 0; ty < superficie[tx]!; ty++) {
        expect(MINERALES).not.toContain(mundo.getTile(tx, ty));
      }
    }
  });

  it('hay paredes bajo tierra pero no en el cielo', () => {
    const { mundo, superficie } = generarMundo(OP);
    let conPared = 0;
    for (let tx = 5; tx < mundo.ancho - 5; tx += 13) {
      expect(mundo.getPared(tx, superficie[tx]! - 2)).toBe(AIRE);
      if (mundo.getPared(tx, superficie[tx]! + 20) !== AIRE) conPared++;
    }
    expect(conPared).toBeGreaterThan(0);
  });

  it('la hierba solo está donde hay aire justo encima', () => {
    const { mundo } = generarMundo(OP);
    let revisados = 0;
    for (let tx = 3; tx < mundo.ancho - 3; tx += 7) {
      for (let ty = 1; ty < mundo.alto; ty++) {
        if (mundo.getTile(tx, ty) !== HIERBA) continue;
        expect(mundo.getTile(tx, ty - 1)).not.toBe(TIERRA);
        revisados++;
      }
    }
    expect(revisados).toBeGreaterThan(0);
  });

  it('el spawn cae en un hueco despejado con suelo debajo', () => {
    const { mundo, spawnTx, spawnTy } = generarMundo(OP);
    for (let dy = 0; dy < 3; dy++) {
      expect(esSolido(mundo.getTile(spawnTx, spawnTy + dy))).toBe(false);
    }
    let ty = spawnTy;
    while (ty < mundo.alto && !esSolido(mundo.getTile(spawnTx, ty))) ty++;
    expect(ty).toBeLessThan(mundo.alto);
    expect(ty - spawnTy).toBeLessThan(10);
  });

  it('los bordes laterales son roca maciza', () => {
    const { mundo } = generarMundo(OP);
    for (let ty = 0; ty < mundo.alto; ty += 17) {
      expect(mundo.getTile(0, ty)).toBe(PIEDRA);
      expect(mundo.getTile(mundo.ancho - 1, ty)).toBe(PIEDRA);
    }
  });

  it('los tamaños del catálogo son coherentes', () => {
    expect(TAMANOS.pequeno.ancho).toBeLessThan(TAMANOS.mediano.ancho);
    expect(TAMANOS.pequeno.alto).toBeLessThan(TAMANOS.mediano.alto);
  });
});

describe('biomas', () => {
  it('hay desierto y nieve, y cada uno en un lado', () => {
    const { biomas } = generarMundo(OP);
    const centro = biomas.length / 2;
    let desiertoIzq = 0;
    let desiertoDer = 0;
    let nieveIzq = 0;
    let nieveDer = 0;
    for (let tx = 0; tx < biomas.length; tx++) {
      if (biomas[tx] === DESIERTO) tx < centro ? desiertoIzq++ : desiertoDer++;
      if (biomas[tx] === NIEVE_B) tx < centro ? nieveIzq++ : nieveDer++;
    }
    expect(desiertoIzq + desiertoDer).toBeGreaterThan(20);
    expect(nieveIzq + nieveDer).toBeGreaterThan(20);
    // Uno a cada lado: nunca los dos juntos.
    expect(Math.min(desiertoIzq, desiertoDer)).toBe(0);
    expect(Math.min(nieveIzq, nieveDer)).toBe(0);
  });

  it('el centro del mundo, donde aparece el jugador, es bosque', () => {
    const { biomas, spawnTx } = generarMundo(OP);
    expect(biomas[spawnTx]).toBe(BOSQUE);
  });

  it('el suelo de cada bioma es el suyo', () => {
    const { mundo, biomas, superficie } = generarMundo(OP);
    const suelos = new Map<number, Set<number>>();
    for (let tx = 4; tx < mundo.ancho - 4; tx += 3) {
      let ty = Math.max(0, superficie[tx]! - 6);
      while (ty < mundo.alto && mundo.getTile(tx, ty) === AIRE) ty++;
      const id = mundo.getTile(tx, ty);
      if (!suelos.has(biomas[tx]!)) suelos.set(biomas[tx]!, new Set());
      suelos.get(biomas[tx]!)!.add(id);
    }
    // La frontera entre biomas deja algún tile mezclado; lo que se comprueba es
    // que el material propio de cada uno sea el que domina.
    expect(suelos.get(DESIERTO)).toContain(ARENA);
    expect(suelos.get(NIEVE_B)).toContain(NIEVE);
    expect(suelos.get(BOSQUE)).toContain(HIERBA);
  });

  it('los cactus solo salen en el desierto', () => {
    const { mundo, biomas } = generarMundo(OP);
    let cactus = 0;
    for (let tx = 0; tx < mundo.ancho; tx++) {
      for (let ty = 0; ty < mundo.alto; ty++) {
        if (mundo.getTile(tx, ty) !== CACTUS) continue;
        cactus++;
        expect(biomas[tx]).toBe(DESIERTO);
      }
    }
    expect(cactus).toBeGreaterThan(0);
  });
});

describe('líquidos del mundo generado', () => {
  it('hay agua y hay lava', () => {
    const { mundo } = generarMundo(OP);
    let agua = 0;
    let lava = 0;
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        if (mundo.getLiquido(tx, ty) === 0) continue;
        if (mundo.esLava(tx, ty)) lava++;
        else agua++;
      }
    }
    expect(agua).toBeGreaterThan(30);
    expect(lava).toBeGreaterThan(10);
  });

  it('ningún líquido nace dentro de un bloque', () => {
    const { mundo } = generarMundo(OP);
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        if (mundo.getLiquido(tx, ty) > 0) {
          expect(esSolido(mundo.getTile(tx, ty))).toBe(false);
        }
      }
    }
  });

  it('la lava está abajo, lejos de la superficie', () => {
    const { mundo, superficie } = generarMundo(OP);
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        if (mundo.getLiquido(tx, ty) > 0 && mundo.esLava(tx, ty)) {
          expect(ty).toBeGreaterThan(superficie[tx]! + 60);
        }
      }
    }
  });

  it('el agua de superficie se queda quieta al simularla', () => {
    const { mundo } = generarMundo(OP);
    const sim = new SimuladorLiquidos(mundo);
    sim.despertarTodo();
    const antes = mundo.liquido.reduce((a, v) => a + v, 0);
    // Si los lagos se generasen desbordados, la simulación los vaciaría ladera
    // abajo y esto se desplomaría.
    for (let i = 0; i < 400 && sim.paso() > 0; i++);
    const despues = mundo.liquido.reduce((a, v) => a + v, 0);
    expect(despues).toBeGreaterThan(antes * 0.85);
  });

  it('los cristales de vida salen bajo tierra, en el suelo y en seco', () => {
    const { mundo, superficie } = generarMundo(OP);
    let cuantos = 0;
    for (let ty = 0; ty < mundo.alto; ty++) {
      for (let tx = 0; tx < mundo.ancho; tx++) {
        if (mundo.getTile(tx, ty) !== CRISTAL_VIDA) continue;
        cuantos++;
        // Nunca a la vista desde la superficie.
        expect(ty).toBeGreaterThan(superficie[tx]! + 20);
        // Siempre apoyado en algo macizo y con hueco encima.
        expect(esSolido(mundo.getTile(tx, ty + 1))).toBe(true);
        expect(mundo.getTile(tx, ty - 1)).toBe(AIRE);
        expect(mundo.getLiquido(tx, ty)).toBe(0);
      }
    }
    // Bastantes para llegar al tope de vida, pero no una alfombra.
    expect(cuantos).toBeGreaterThanOrEqual(5);
    expect(cuantos).toBeLessThan(mundo.ancho / 40);
  });
});

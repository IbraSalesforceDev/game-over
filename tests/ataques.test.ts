import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { VERSIONES } from '../src/core/versiones';
import {
  ATAQUES,
  avanzarDisparos,
  CADENCIA_ELITE,
  hayVista,
  lanzarAtaque,
  limpiarDisparos,
  SALVAS_ELITE,
  type ClaseAtaque,
  type Disparo,
} from '../src/entities/ataques';
import { EFECTOS } from '../src/entities/efectos';
import {
  actualizarEnemigos,
  crearEnemigo,
  ENEMIGOS,
  botiquinDe,
  BOTIQUIN_ELITE,
  PROBABILIDAD_BOTIQUIN,
  type Especie,
} from '../src/entities/enemies';
import { crearJugador } from '../src/entities/player';
import { crearCaja } from '../src/entities/physics';
import { esColocable, defObjeto } from '../src/items/items';
import { AIRE, PIEDRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const CLASES = Object.keys(ATAQUES) as ClaseAtaque[];

describe('la tabla de ataques', () => {
  it('todos hacen daño, vuelan y tienen alcance', () => {
    for (const clase of CLASES) {
      const def = ATAQUES[clase];
      expect(def.dano, clase).toBeGreaterThan(0);
      expect(def.velocidad, clase).toBeGreaterThan(0);
      expect(def.alcance, clase).toBeGreaterThan(0);
      expect(def.cadencia, clase).toBeGreaterThan(0);
      expect(def.salvas, clase).toBeGreaterThanOrEqual(1);
    }
  });

  it('el que trae efecto nombra uno que existe y le pone duración', () => {
    for (const clase of CLASES) {
      const def = ATAQUES[clase];
      if (def.efecto === undefined) continue;
      expect(EFECTOS[def.efecto], clase).toBeDefined();
      expect(def.duracionEfecto, clase).toBeGreaterThan(0);
    }
  });

  it('no todos pegan estado: dos van sin, y a cambio molestan de otra forma', () => {
    const sinEfecto = CLASES.filter((c) => ATAQUES[c].efecto === undefined);
    expect(sinEfecto.length).toBeGreaterThan(0);
    for (const clase of sinEfecto) {
      const def = ATAQUES[clase];
      // O sale de varios en varios, o vuela más rápido que los que sí pegan.
      const rapido = def.velocidad > 5;
      expect(def.salvas > 1 || rapido, clase).toBe(true);
    }
  });

  it('todos declaran de qué versión son, y es una que existe', () => {
    const conocidas = new Set(VERSIONES.map((v) => v.id));
    for (const clase of CLASES) expect(conocidas.has(ATAQUES[clase].desde), clase).toBe(true);
  });
});

describe('lanzar un ataque', () => {
  it('sale uno solo y apuntando al objetivo', () => {
    const [d] = lanzarAtaque('bolaDeFuego', 0, 0, 100, 0);
    expect(d).toBeDefined();
    expect(d!.vx).toBeGreaterThan(0);
    expect(Math.abs(d!.vy)).toBeLessThan(0.01);
  });

  it('apunta también hacia atrás y hacia arriba', () => {
    const [izq] = lanzarAtaque('bolaDeFuego', 100, 0, 0, 0);
    expect(izq!.vx).toBeLessThan(0);
    const [arriba] = lanzarAtaque('bolaDeFuego', 0, 100, 0, 0);
    expect(arriba!.vy).toBeLessThan(0);
  });

  it('la arena sale de tres en tres y abierta en abanico', () => {
    const salva = lanzarAtaque('arena', 0, 0, 200, 0);
    expect(salva).toHaveLength(ATAQUES.arena.salvas);
    const angulos = salva.map((d) => Math.atan2(d.vy, d.vx));
    expect(new Set(angulos.map((a) => a.toFixed(3))).size).toBe(salva.length);
  });

  it('la élite saca un proyectil más', () => {
    const normal = lanzarAtaque('bolaDeFuego', 0, 0, 200, 0, 1, false);
    const elite = lanzarAtaque('bolaDeFuego', 0, 0, 200, 0, 1, true);
    expect(elite.length).toBe(normal.length + SALVAS_ELITE);
  });

  it('la fuerza del bicho escala el daño del disparo', () => {
    const [flojo] = lanzarAtaque('hueso', 0, 0, 200, 0, 1);
    const [fuerte] = lanzarAtaque('hueso', 0, 0, 200, 0, 2.5);
    expect(fuerte!.dano).toBeGreaterThan(flojo!.dano * 2);
  });

  it('la velocidad del proyectil es la que dice su tabla', () => {
    for (const clase of CLASES) {
      const [d] = lanzarAtaque(clase, 0, 0, 300, 0);
      expect(Math.hypot(d!.vx, d!.vy), clase).toBeCloseTo(ATAQUES[clase].velocidad, 4);
    }
  });
});

describe('los disparos por el mundo', () => {
  /** Un mundo con suelo abajo del todo y aire por encima. */
  function cielo(): Mundo {
    const m = new Mundo(80, 60);
    m.rellenar(0, 50, 79, 59, PIEDRA);
    return m;
  }

  it('un disparo que da al jugador se apunta como acierto y se apaga', () => {
    const mundo = cielo();
    const jugador = crearCaja(20 * TILE, 40 * TILE, 20, 42);
    const tiros = lanzarAtaque('hueso', 10 * TILE, 40 * TILE + 20, 20 * TILE, 40 * TILE + 20);
    let aciertos = 0;
    for (let i = 0; i < 200 && tiros.some((d) => d.vivo); i++) {
      aciertos += avanzarDisparos(mundo, tiros, jugador).aciertos.length;
    }
    expect(aciertos).toBe(1);
    expect(tiros.every((d) => !d.vivo)).toBe(true);
  });

  it('contra una pared se estrella y no llega al otro lado', () => {
    const mundo = cielo();
    // Un muro entre el que dispara y el jugador.
    mundo.rellenar(15, 30, 15, 49, PIEDRA);
    const jugador = crearCaja(20 * TILE, 40 * TILE, 20, 42);
    const tiros = lanzarAtaque('hueso', 10 * TILE, 40 * TILE + 20, 20 * TILE, 40 * TILE + 20);
    let aciertos = 0;
    let choques = 0;
    for (let i = 0; i < 200 && tiros.some((d) => d.vivo); i++) {
      const r = avanzarDisparos(mundo, tiros, jugador);
      aciertos += r.aciertos.length;
      choques += r.choques.length;
    }
    expect(aciertos).toBe(0);
    expect(choques).toBe(1);
  });

  it('no atraviesa una pared de un solo tile por ir rápido', () => {
    // El hueso vuela a siete píxeles por tick, casi medio tile: moviéndose de
    // una vez podría saltarse una pared fina, y recibir un disparo a través de
    // la roca es de lo que peor se lee.
    const mundo = cielo();
    mundo.rellenar(15, 40, 15, 40, PIEDRA);
    const tiros: Disparo[] = [
      ...lanzarAtaque('hueso', 10 * TILE, 40 * TILE + 8, 30 * TILE, 40 * TILE + 8),
    ];
    let choques = 0;
    const lejos = crearCaja(1000, 1000, 2, 2);
    for (let i = 0; i < 100 && tiros.some((d) => d.vivo); i++) {
      choques += avanzarDisparos(mundo, tiros, lejos).choques.length;
    }
    expect(choques).toBe(1);
  });

  it('los que pesan van en arco y los que no, en línea recta', () => {
    const mundo = new Mundo(4000, 400);
    const lejos = crearCaja(1e6, 1e6, 2, 2);
    /** Cuánto cambia la caída vertical entre el principio y el final. */
    const curvatura = (clase: ClaseAtaque): number => {
      const tiros = lanzarAtaque(clase, 10 * TILE, 200 * TILE, 3000 * TILE, 200 * TILE);
      const vy0 = tiros[0]!.vy;
      for (let i = 0; i < 40; i++) avanzarDisparos(mundo, tiros, lejos);
      return tiros[0]!.vy - vy0;
    };
    // El hueso sale apuntado hacia arriba y va cayendo; la bola de fuego
    // mantiene exactamente la misma vertical del primer tick al último.
    expect(curvatura('hueso')).toBeGreaterThan(0);
    expect(curvatura('bolaDeFuego')).toBe(0);
  });

  it('se apaga solo si no le da a nada', () => {
    const mundo = new Mundo(4000, 200);
    const lejos = crearCaja(1e6, 1e6, 2, 2);
    const tiros = lanzarAtaque('bolaDeFuego', 10 * TILE, 100 * TILE, 3000 * TILE, 100 * TILE);
    for (let i = 0; i < 60 * 10; i++) avanzarDisparos(mundo, tiros, lejos);
    expect(tiros.every((d) => !d.vivo)).toBe(true);
  });

  it('la limpieza se lleva los apagados y respeta los vivos', () => {
    const tiros = lanzarAtaque('arena', 0, 0, 100, 0);
    tiros[0]!.vivo = false;
    const quedaban = tiros.length;
    limpiarDisparos(tiros);
    expect(tiros).toHaveLength(quedaban - 1);
    expect(tiros.every((d) => d.vivo)).toBe(true);
  });
});

describe('la línea de tiro', () => {
  it('por el aire hay vista, con roca en medio no', () => {
    const mundo = new Mundo(60, 60);
    expect(hayVista(mundo, 0, 0, 40 * TILE, 0)).toBe(true);
    mundo.setTile(20, 0, PIEDRA);
    expect(hayVista(mundo, 0, 8, 40 * TILE, 8)).toBe(false);
    mundo.setTile(20, 0, AIRE);
    expect(hayVista(mundo, 0, 8, 40 * TILE, 8)).toBe(true);
  });
});

describe('los bichos disparando', () => {
  /** Un mundo llano con el bicho y el jugador a la distancia que se pida. */
  function duelo(especie: Especie, tilesDeDistancia: number, elite = false) {
    const mundo = new Mundo(120, 60);
    mundo.rellenar(0, 45, 119, 59, PIEDRA);
    const bicho = crearEnemigo(especie, 20 * TILE, 43 * TILE, 1, elite);
    const jugador = crearJugador(20 + tilesDeDistancia, 43).caja;
    return { mundo, bicho, jugador };
  }

  /**
   * Cuántos proyectiles salen en n ticks, con el bicho clavado en el sitio.
   *
   * Sin clavarlo no se mide lo que se cree: un bicho suelto se acerca andando,
   * así que a los cien ticks ya no está a la distancia que se pidió. Lo que se
   * quiere probar aquí es la regla de "a esta distancia dispara o no", no la
   * persecución.
   */
  function contar(especie: Especie, distancia: number, ticks: number, elite = false): number {
    const { mundo, bicho, jugador } = duelo(especie, distancia, elite);
    const x0 = bicho.caja.x;
    const y0 = bicho.caja.y;
    let total = 0;
    for (let i = 0; i < ticks; i++) {
      total += actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 }).disparos.length;
      bicho.caja.x = x0;
      bicho.caja.y = y0;
    }
    return total;
  }

  it('la momia lanza fuego cuando te tiene a tiro', () => {
    expect(contar('momia', 8, 400)).toBeGreaterThan(0);
  });

  it('el que no tiene ataque especial no lanza nada nunca', () => {
    expect(contar('zombi', 8, 600)).toBe(0);
    expect(contar('slime', 8, 600)).toBe(0);
  });

  it('de lejos no dispara: no te ve venir', () => {
    expect(contar('momia', ATAQUES.bolaDeFuego.alcance + 6, 600)).toBe(0);
  });

  it('a bocajarro tampoco: eso ya lo cubre el contacto', () => {
    expect(contar('momia', 1, 600)).toBe(0);
  });

  it('a través de una pared, no', () => {
    const { mundo, bicho, jugador } = duelo('momia', 8, false);
    mundo.rellenar(24, 30, 24, 44, PIEDRA);
    const x0 = bicho.caja.x;
    let total = 0;
    for (let i = 0; i < 600; i++) {
      total += actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 }).disparos.length;
      bicho.caja.x = x0;
    }
    expect(total).toBe(0);
  });

  it('la élite dispara bastante más que la normal', () => {
    const normal = contar('momia', 8, 900, false);
    const elite = contar('momia', 8, 900, true);
    expect(elite).toBeGreaterThan(normal);
    // Cadencia más corta y un proyectil más por salva: al menos vez y media.
    expect(elite).toBeGreaterThan(normal * 1.5);
    expect(CADENCIA_ELITE).toBeLessThan(1);
  });

  it('un mundo anterior a 6.10.0 tiene momias que solo caminan', () => {
    const mundo = new Mundo(120, 60);
    mundo.rellenar(0, 45, 119, 59, PIEDRA);
    const bicho = crearEnemigo('momia', 20 * TILE, 43 * TILE, 1, false, '6.9.0');
    const jugador = crearJugador(28, 43).caja;
    const x0 = bicho.caja.x;
    let total = 0;
    for (let i = 0; i < 900; i++) {
      total += actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 }).disparos.length;
      bicho.caja.x = x0;
    }
    expect(total).toBe(0);
  });

  it('dos bichos iguales no disparan siempre en el mismo tick', () => {
    // La recarga inicial va al azar justo para esto: si no, los tres bichos de
    // una sala sueltan una salva a la vez y no se lee como una emboscada.
    const recargas = new Set<number>();
    for (let i = 0; i < 20; i++) recargas.add(crearEnemigo('momia', 0, 0).recarga);
    expect(recargas.size).toBeGreaterThan(1);
  });

  it('cada ataque repartido apunta al bioma de su bicho', () => {
    expect(ENEMIGOS.momia.ataque).toBe('bolaDeFuego');
    expect(ENEMIGOS.golem.ataque).toBe('arena');
    expect(ENEMIGOS.lobo.ataque).toBe('ventisca');
    expect(ENEMIGOS.arana.ataque).toBe('veneno');
    expect(ENEMIGOS.diablillo.ataque).toBe('bolaDeFuego');
    expect(ENEMIGOS.esqueleto.ataque).toBe('hueso');
  });

  it('ningún animal ni el jefe lanza nada', () => {
    for (const especie of ['conejo', 'gallina', 'jabali', 'guardian'] as const) {
      expect(ENEMIGOS[especie].ataque, especie).toBeUndefined();
    }
  });
});

describe('el botiquín de la élite', () => {
  it('solo cae de élites', () => {
    expect(botiquinDe(false, '6.10.0', () => 0)).toBeNull();
    expect(botiquinDe(true, '6.10.0', () => 0)).not.toBeNull();
  });

  it('la mitad de las veces, ni más ni menos', () => {
    expect(botiquinDe(true, '6.10.0', () => PROBABILIDAD_BOTIQUIN + 0.01)).toBeNull();
    expect(botiquinDe(true, '6.10.0', () => PROBABILIDAD_BOTIQUIN - 0.01)).not.toBeNull();
  });

  it('antes de 6.10.0 no había botiquín', () => {
    expect(botiquinDe(true, '6.9.0', () => 0)).toBeNull();
  });

  it('lo que suelta son cosas de gastar, nunca equipo', () => {
    for (const id of BOTIQUIN_ELITE) {
      const d = defObjeto(id);
      expect(d.tipo === 'pocion' || d.tipo === 'material', d.nombre).toBe(true);
      expect(esColocable(id), d.nombre).toBe(false);
    }
  });

  it('con suerte distinta salen cosas distintas', () => {
    const salidas = new Set<number | null>();
    for (let i = 0; i < BOTIQUIN_ELITE.length; i++) {
      const p = i / BOTIQUIN_ELITE.length;
      salidas.add(botiquinDe(true, '6.10.0', () => p * 0.49 + 0.001));
    }
    expect(salidas.size).toBeGreaterThan(1);
  });
});

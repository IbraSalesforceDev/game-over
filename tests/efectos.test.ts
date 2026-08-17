import { describe, expect, it } from 'vitest';
import {
  aplicarEfecto,
  CLASES_EFECTO,
  crearEfectos,
  defensaExtra,
  DURACION,
  EFECTOS,
  efectosActivos,
  limpiarDaninos,
  limpiarEfectos,
  multiplicadorDano,
  multiplicadorSalto,
  multiplicadorVelocidad,
  quitarEfecto,
  segundos,
  tickEfectos,
  tieneEfecto,
  type ClaseEfecto,
} from '../src/entities/efectos';
import { crearEnemigo, actualizarEnemigos } from '../src/entities/enemies';
import { crearJugador } from '../src/entities/player';
import { Mundo } from '../src/world/world';
import { PIEDRA } from '../src/world/tiles';
import { TILE } from '../src/core/constants';
import {
  defObjeto,
  esPocion,
  FRASCO,
  POCION_FUERZA,
  POCION_LIGEREZA,
  POCION_PIEDRA,
  POCION_REGENERACION,
  POCION_REMEDIO,
  POCION_VIDA,
  puntaDe,
  FLECHA_FUEGO,
  FLECHA,
  objetoExisteEn,
  versionDeclarada,
} from '../src/items/items';
import { CALDERO } from '../src/world/tiles';
import { RECETAS } from '../src/items/recipes';

/** Corre n ticks del bolsillo de efectos y suma lo que sale. */
function correr(ef: ReturnType<typeof crearEfectos>, ticks: number) {
  let dano = 0;
  let danoSuave = 0;
  let curacion = 0;
  const terminados: ClaseEfecto[] = [];
  for (let i = 0; i < ticks; i++) {
    const r = tickEfectos(ef);
    dano += r.dano;
    danoSuave += r.danoSuave;
    curacion += r.curacion;
    terminados.push(...r.terminados);
  }
  return { dano, danoSuave, curacion, terminados };
}

describe('el bolsillo de efectos', () => {
  it('empieza vacío y no hace nada', () => {
    const ef = crearEfectos();
    expect(efectosActivos(ef)).toHaveLength(0);
    const r = tickEfectos(ef);
    expect(r).toEqual({ dano: 0, danoSuave: 0, curacion: 0, terminados: [] });
  });

  it('un efecto puesto dura lo que se le dijo y ni un tick más', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'fuerza', 10);
    correr(ef, 9);
    expect(tieneEfecto(ef, 'fuerza')).toBe(true);
    const r = tickEfectos(ef);
    expect(r.terminados).toEqual(['fuerza']);
    expect(tieneEfecto(ef, 'fuerza')).toBe(false);
  });

  it('volver a ponerlo se queda con el más largo, no los suma', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'ardiendo', 300);
    aplicarEfecto(ef, 'ardiendo', 60);
    expect(ef.ardiendo).toBe(300);
    aplicarEfecto(ef, 'ardiendo', 400);
    expect(ef.ardiendo).toBe(400);
  });

  it('poner cero ticks no pone nada', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'veneno', 0);
    expect(tieneEfecto(ef, 'veneno')).toBe(false);
  });

  it('arder hace daño a su ritmo', () => {
    const ef = crearEfectos();
    // Seis segundos ardiendo: un pinchazo cada media, o sea doce.
    aplicarEfecto(ef, 'ardiendo', 60 * 6);
    const r = correr(ef, 60 * 6);
    expect(r.dano).toBe(12 * EFECTOS.ardiendo.puntos);
    expect(r.danoSuave).toBe(0);
  });

  it('el veneno hace daño del que no mata', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'veneno', 60 * 4);
    const r = correr(ef, 60 * 4);
    expect(r.danoSuave).toBeGreaterThan(0);
    expect(r.dano).toBe(0);
    expect(EFECTOS.veneno.letal).toBe(false);
  });

  it('la regeneración cura en vez de quitar', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'regeneracion', 60 * 6);
    const r = correr(ef, 60 * 6);
    expect(r.curacion).toBeGreaterThan(0);
    expect(r.dano + r.danoSuave).toBe(0);
  });

  it('los multiplicadores se acumulan entre efectos', () => {
    const ef = crearEfectos();
    expect(multiplicadorVelocidad(ef)).toBe(1);
    aplicarEfecto(ef, 'ligereza', 100);
    aplicarEfecto(ef, 'congelado', 100);
    // Corriendo y congelado a la vez: se multiplica, no gana el último.
    expect(multiplicadorVelocidad(ef)).toBeCloseTo(
      EFECTOS.ligereza.velocidad * EFECTOS.congelado.velocidad,
    );
    expect(multiplicadorSalto(ef)).toBeCloseTo(
      EFECTOS.ligereza.salto * EFECTOS.congelado.salto,
    );
  });

  it('la fuerza multiplica el daño y la piel de piedra suma defensa', () => {
    const ef = crearEfectos();
    expect(multiplicadorDano(ef)).toBe(1);
    expect(defensaExtra(ef)).toBe(0);
    aplicarEfecto(ef, 'fuerza', 100);
    aplicarEfecto(ef, 'pielDePiedra', 100);
    expect(multiplicadorDano(ef)).toBeCloseTo(EFECTOS.fuerza.dano);
    expect(defensaExtra(ef)).toBe(EFECTOS.pielDePiedra.defensa);
  });

  it('el remedio se lleva lo malo y respeta lo bueno', () => {
    const ef = crearEfectos();
    for (const clase of CLASES_EFECTO) aplicarEfecto(ef, clase, 200);
    const quitados = limpiarDaninos(ef);
    expect(quitados.sort()).toEqual(['ardiendo', 'congelado', 'veneno']);
    expect(tieneEfecto(ef, 'fuerza')).toBe(true);
    expect(tieneEfecto(ef, 'ardiendo')).toBe(false);
  });

  it('morir se lleva todo', () => {
    const ef = crearEfectos();
    for (const clase of CLASES_EFECTO) aplicarEfecto(ef, clase, 200);
    limpiarEfectos(ef);
    expect(efectosActivos(ef)).toHaveLength(0);
  });

  it('quitar uno a mano no toca a los demás', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'fuerza', 100);
    aplicarEfecto(ef, 'veneno', 100);
    quitarEfecto(ef, 'veneno');
    expect(tieneEfecto(ef, 'veneno')).toBe(false);
    expect(tieneEfecto(ef, 'fuerza')).toBe(true);
  });

  it('los dañinos salen primero en la lista de pantalla', () => {
    const ef = crearEfectos();
    aplicarEfecto(ef, 'fuerza', 100);
    aplicarEfecto(ef, 'veneno', 100);
    const lista = efectosActivos(ef);
    expect(EFECTOS[lista[0]!.clase].danino).toBe(true);
  });

  it('los segundos se redondean hacia arriba: nunca se enseña un cero vivo', () => {
    expect(segundos(1)).toBe(1);
    expect(segundos(60)).toBe(1);
    expect(segundos(61)).toBe(2);
  });

  it('todos los efectos declaran de qué versión son', () => {
    for (const clase of CLASES_EFECTO) {
      expect(EFECTOS[clase].desde, clase).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe('los efectos en los bichos', () => {
  /** Un mundo con suelo y un bicho encima, listo para tiquear. */
  function escenario() {
    const mundo = new Mundo(60, 60);
    mundo.rellenar(0, 40, 59, 59, PIEDRA);
    const bicho = crearEnemigo('zombi', 10 * TILE, 38 * TILE);
    // Ojo: `crearJugador` recibe tiles, no píxeles.
    const jugador = crearJugador(12, 38).caja;
    return { mundo, bicho, jugador };
  }

  it('arder le va quitando vida sin que nadie le pegue', () => {
    const { mundo, bicho, jugador } = escenario();
    aplicarEfecto(bicho.efectos, 'ardiendo', 60 * 3);
    const antes = bicho.salud.vida;
    for (let i = 0; i < 60 * 3; i++) {
      actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 });
    }
    expect(bicho.salud.vida).toBeLessThan(antes);
    expect(tieneEfecto(bicho.efectos, 'ardiendo')).toBe(false);
  });

  it('el veneno lo deja tocado pero nunca lo mata', () => {
    const { mundo, bicho, jugador } = escenario();
    bicho.salud.vida = 4;
    aplicarEfecto(bicho.efectos, 'veneno', 60 * 20);
    for (let i = 0; i < 60 * 20; i++) {
      actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 });
    }
    expect(bicho.salud.vida).toBe(1);
    expect(bicho.vivo).toBe(true);
  });

  it('congelado avanza menos que suelto', () => {
    const avance = (congelar: boolean): number => {
      const { mundo, bicho, jugador } = escenario();
      // El objetivo, lejos y a la derecha, para que corra en línea recta.
      jugador.x = 40 * TILE;
      if (congelar) aplicarEfecto(bicho.efectos, 'congelado', 60 * 60);
      const x0 = bicho.caja.x;
      for (let i = 0; i < 120; i++) {
        actualizarEnemigos(mundo, [bicho], jugador, { invulnerable: 0 });
      }
      return bicho.caja.x - x0;
    };
    expect(avance(true)).toBeLessThan(avance(false));
  });

  it('un bicho nace sin nada puesto', () => {
    expect(efectosActivos(crearEnemigo('slime', 0, 0).efectos)).toHaveLength(0);
  });
});

describe('las pociones', () => {
  const TODAS = [
    POCION_VIDA,
    POCION_REGENERACION,
    POCION_FUERZA,
    POCION_PIEDRA,
    POCION_LIGEREZA,
    POCION_REMEDIO,
  ];

  it('las seis son pociones y ninguna se apila como un material', () => {
    for (const id of TODAS) {
      expect(esPocion(id), `${id}`).toBe(true);
      expect(defObjeto(id).maxPila).toBeLessThanOrEqual(12);
    }
    expect(esPocion(FRASCO)).toBe(false);
  });

  it('cada una hace algo: o cura, o pone un efecto, o limpia', () => {
    for (const id of TODAS) {
      const d = defObjeto(id);
      const hace = (d.curacion ?? 0) > 0 || d.efecto !== undefined || d.limpia === true;
      expect(hace, defObjeto(id).nombre).toBe(true);
    }
  });

  it('las de efecto duran algo y nombran un efecto que existe', () => {
    for (const id of TODAS) {
      const d = defObjeto(id);
      if (d.efecto === undefined) continue;
      expect(EFECTOS[d.efecto]).toBeDefined();
      expect(d.duracion ?? 0).toBeGreaterThan(0);
    }
  });

  it('ninguna sacia: el hambre y las pociones son cosas distintas', () => {
    for (const id of TODAS) expect(defObjeto(id).saciedad ?? 0).toBe(0);
  });

  it('el remedio limpia y no pone nada', () => {
    const d = defObjeto(POCION_REMEDIO);
    expect(d.limpia).toBe(true);
    expect(d.efecto).toBeUndefined();
  });

  it('todas se declaran de 6.9.0 y no existen antes', () => {
    for (const id of [...TODAS, FRASCO, CALDERO]) {
      expect(versionDeclarada(id), `${id}`).toBe('6.9.0');
      expect(objetoExisteEn(id, '6.8.0')).toBe(false);
      expect(objetoExisteEn(id, '6.9.0')).toBe(true);
    }
  });

  it('las seis se preparan en el caldero, y el caldero no', () => {
    const enCaldero = new Set(
      RECETAS.filter((r) => r.estacion === CALDERO).map((r) => r.resultado),
    );
    for (const id of TODAS) expect(enCaldero.has(id), defObjeto(id).nombre).toBe(true);
    expect(RECETAS.find((r) => r.resultado === CALDERO)!.estacion).not.toBe(CALDERO);
  });

  it('todas gastan un frasco: es lo que las hace costar vidrio', () => {
    // Solo las pociones. Desde 7.0.0 el caldero también prepara los rituales,
    // que no llevan frasco porque no se beben.
    for (const r of RECETAS.filter((x) => x.estacion === CALDERO && esPocion(x.resultado))) {
      expect(r.ingredientes.some(([o]) => o === FRASCO), r.id).toBe(true);
    }
  });
});

describe('la flecha de fuego', () => {
  it('prende, y la lisa no', () => {
    expect(puntaDe(FLECHA_FUEGO).efecto).toBe('ardiendo');
    expect(puntaDe(FLECHA_FUEGO).duracionEfecto).toBe(DURACION.ataque);
    expect(puntaDe(FLECHA).efecto).toBeUndefined();
  });
});

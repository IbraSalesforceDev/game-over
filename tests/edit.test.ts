import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import {
  ALCANCE,
  avanzarPicado,
  crearPicado,
  enAlcance,
  etapaGrieta,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  solapaJugador,
  tieneApoyo,
} from '../src/world/edit';
import { AIRE, PIEDRA, PLATAFORMA, TIERRA, TILES } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

function escenario(): { m: Mundo; c: Caja } {
  const m = new Mundo(60, 40);
  m.rellenar(0, SUELO, 59, 39, TIERRA);
  const c = crearCaja(10 * TILE, SUELO * TILE - JUGADOR_ALTO, JUGADOR_ANCHO, JUGADOR_ALTO);
  return { m, c };
}

describe('alcance', () => {
  it('el tile bajo los pies está en alcance y uno lejano no', () => {
    const { c } = escenario();
    expect(enAlcance(c, 10, SUELO)).toBe(true);
    expect(enAlcance(c, 10 + Math.ceil(ALCANCE) + 2, SUELO)).toBe(false);
  });

  it('el alcance se mide en diagonal, no por ejes', () => {
    const { c } = escenario();
    // Este tile queda a 3,9 tiles en X y 4,2 en Y —cada eje por separado cabe
    // en el alcance de 5,5—, pero en diagonal son 5,7: fuera.
    expect(enAlcance(c, 14, SUELO - 6)).toBe(false);
    expect(enAlcance(c, 14, SUELO - 5)).toBe(true);
  });
});

describe('solape con el jugador', () => {
  it('detecta el tile que ocupa el propio jugador', () => {
    const { c } = escenario();
    const tx = Math.floor((c.x + c.ancho / 2) / TILE);
    const ty = Math.floor((c.y + c.alto / 2) / TILE);
    expect(solapaJugador(c, tx, ty)).toBe(true);
  });

  it('el tile justo bajo los pies no solapa', () => {
    const { c } = escenario();
    expect(solapaJugador(c, 10, SUELO)).toBe(false);
  });
});

describe('apoyo para construir', () => {
  it('un tile pegado al suelo tiene apoyo', () => {
    const { m } = escenario();
    expect(tieneApoyo(m, 10, SUELO - 1)).toBe(true);
  });

  it('un tile en mitad del cielo no tiene apoyo', () => {
    const { m } = escenario();
    expect(tieneApoyo(m, 10, SUELO - 8)).toBe(false);
  });

  it('una pared detrás basta como apoyo', () => {
    const { m } = escenario();
    m.setPared(10, SUELO - 8, TIERRA);
    expect(tieneApoyo(m, 10, SUELO - 8)).toBe(true);
  });
});

describe('colocar bloques', () => {
  it('se puede colocar sobre el suelo, a un lado del jugador', () => {
    const { m, c } = escenario();
    expect(puedeColocarBloque(m, c, 12, SUELO - 1, PIEDRA).ok).toBe(true);
  });

  it('no se puede colocar sobre un tile ocupado', () => {
    const { m, c } = escenario();
    expect(puedeColocarBloque(m, c, 12, SUELO, PIEDRA).motivo).toBe('ocupado');
  });

  it('no se puede colocar en el aire sin apoyo', () => {
    const { m, c } = escenario();
    expect(puedeColocarBloque(m, c, 12, SUELO - 5, PIEDRA).motivo).toBe('vacio');
  });

  it('no se puede colocar un macizo dentro del jugador', () => {
    const { m, c } = escenario();
    const tx = Math.floor((c.x + c.ancho / 2) / TILE);
    const ty = Math.floor((c.y + c.alto / 2) / TILE);
    m.setPared(tx, ty, TIERRA); // apoyo, para aislar el motivo
    expect(puedeColocarBloque(m, c, tx, ty, PIEDRA).motivo).toBe('jugador');
  });

  it('una plataforma sí se puede colocar dentro del jugador', () => {
    const { m, c } = escenario();
    const tx = Math.floor((c.x + c.ancho / 2) / TILE);
    const ty = Math.floor((c.y + c.alto / 2) / TILE);
    m.setPared(tx, ty, TIERRA);
    expect(puedeColocarBloque(m, c, tx, ty, PLATAFORMA).ok).toBe(true);
  });

  it('no se puede colocar fuera de alcance ni fuera del mundo', () => {
    const { m, c } = escenario();
    expect(puedeColocarBloque(m, c, 40, SUELO - 1, PIEDRA).motivo).toBe('alcance');
    expect(puedeColocarBloque(m, c, -1, SUELO, PIEDRA).motivo).toBe('limites');
  });
});

describe('colocar paredes', () => {
  it('se puede poner una pared junto a otra', () => {
    const { m, c } = escenario();
    m.setPared(10, SUELO - 2, TIERRA);
    expect(puedeColocarPared(m, c, 10, SUELO - 3).ok).toBe(true);
  });

  it('no se puede poner una pared aislada en el cielo', () => {
    const { m, c } = escenario();
    expect(puedeColocarPared(m, c, 12, SUELO - 6).motivo).toBe('vacio');
  });

  it('una pared se puede poner detrás de un bloque existente', () => {
    const { m, c } = escenario();
    expect(puedeColocarPared(m, c, 12, SUELO).ok).toBe(true);
  });
});

describe('picado', () => {
  it('rompe el bloque tras los ticks que marca su dureza', () => {
    const { m } = escenario();
    const p = crearPicado();
    const dureza = TILES[TIERRA]!.dureza;
    let roto = false;
    let ticks = 0;
    while (!roto && ticks < 500) {
      roto = avanzarPicado(m, p, 10, SUELO, 'bloque');
      ticks++;
    }
    expect(roto).toBe(true);
    expect(ticks).toBe(dureza);
    expect(m.getTile(10, SUELO)).toBe(AIRE);
  });

  it('cambiar de objetivo reinicia el progreso', () => {
    const { m } = escenario();
    const p = crearPicado();
    for (let i = 0; i < 10; i++) avanzarPicado(m, p, 10, SUELO, 'bloque');
    expect(p.progreso).toBe(10);
    avanzarPicado(m, p, 11, SUELO, 'bloque');
    expect(p.progreso).toBe(1);
    expect(m.getTile(10, SUELO)).toBe(TIERRA);
  });

  it('las paredes cuestan un 50 % más que el bloque equivalente', () => {
    const { m } = escenario();
    m.setPared(10, SUELO - 1, TIERRA);
    const p = crearPicado();
    let ticks = 0;
    while (!avanzarPicado(m, p, 10, SUELO - 1, 'pared') && ticks < 500) ticks++;
    expect(ticks + 1).toBe(Math.ceil(TILES[TIERRA]!.dureza * 1.5));
  });

  it('picar aire no hace nada', () => {
    const { m } = escenario();
    const p = crearPicado();
    expect(avanzarPicado(m, p, 10, SUELO - 5, 'bloque')).toBe(false);
    expect(p.progreso).toBe(0);
  });

  it('la piedra tarda más que la tierra', () => {
    const { m } = escenario();
    m.setTile(12, SUELO, PIEDRA);
    const contar = (tx: number): number => {
      const p = crearPicado();
      let t = 0;
      while (!avanzarPicado(m, p, tx, SUELO, 'bloque') && t < 999) t++;
      return t;
    };
    expect(contar(12)).toBeGreaterThan(contar(10));
  });

  it('la etapa de grieta avanza de 0 a 3', () => {
    const p = crearPicado();
    const dureza = 20;
    p.progreso = 0;
    expect(etapaGrieta(p, dureza)).toBe(0);
    p.progreso = 19;
    expect(etapaGrieta(p, dureza)).toBe(3);
  });
});

describe('minar: comprobaciones previas', () => {
  it('no se puede minar el vacío ni fuera de alcance', () => {
    const { m, c } = escenario();
    expect(puedeMinar(m, c, 10, SUELO - 5, 'bloque').motivo).toBe('nada');
    expect(puedeMinar(m, c, 40, SUELO, 'bloque').motivo).toBe('alcance');
    expect(puedeMinar(m, c, 10, SUELO, 'bloque').ok).toBe(true);
  });

  it('en capa de pared solo importa la pared', () => {
    const { m, c } = escenario();
    expect(puedeMinar(m, c, 10, SUELO, 'pared').motivo).toBe('nada');
    m.setPared(10, SUELO, TIERRA);
    expect(puedeMinar(m, c, 10, SUELO, 'pared').ok).toBe(true);
  });
});

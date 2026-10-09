import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import { crearCaja, type Caja } from '../src/entities/physics';
import {
  ALCANCE,
  avanzarPicado,
  bloqueEnDireccion,
  crearPicado,
  enAlcance,
  etapaGrieta,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  solapaJugador,
  tieneApoyo,
} from '../src/world/edit';
import { AIRE, ANTORCHA, PIEDRA, PLATAFORMA, TIERRA, TILES } from '../src/world/tiles';
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

/**
 * Picar con el dedo: el dedo da la dirección, no el bloque.
 *
 * El jugador está de pie en el suelo, en la columna 10, con la cabeza en la
 * fila SUELO − 3 y los pies en la SUELO − 1.
 */
describe('el bloque en la dirección del dedo', () => {
  /** Un punto del mundo, en píxeles, en el centro de un tile. */
  const centroDe = (tx: number, ty: number): [number, number] => [
    tx * TILE + TILE / 2,
    ty * TILE + TILE / 2,
  ];
  const filaMedia = SUELO - 2;

  it('tocando lejos a un lado, se pica el primer bloque de esa línea', () => {
    const { m, c } = escenario();
    m.setTile(13, filaMedia, PIEDRA);
    m.setTile(14, filaMedia, PIEDRA);
    // El dedo, mucho más allá: lo que cuenta es la dirección.
    expect(bloqueEnDireccion(m, c, ...centroDe(40, filaMedia))).toEqual({ tx: 13, ty: filaMedia });
  });

  /** Mantener el dedo cava un túnel: roto uno, la misma línea da el siguiente. */
  it('roto el primero, la misma dirección da el siguiente', () => {
    const { m, c } = escenario();
    m.setTile(13, filaMedia, PIEDRA);
    m.setTile(14, filaMedia, PIEDRA);
    m.setTile(13, filaMedia, AIRE);
    expect(bloqueEnDireccion(m, c, ...centroDe(40, filaMedia))).toEqual({ tx: 14, ty: filaMedia });
  });

  it('tocando debajo de los pies, se cava hacia abajo', () => {
    const { m, c } = escenario();
    const b = bloqueEnDireccion(m, c, c.x + c.ancho / 2, (SUELO + 10) * TILE);
    expect(b?.ty).toBe(SUELO);
  });

  it('lo que está fuera de alcance no se pica, aunque esté en la línea', () => {
    const { m, c } = escenario();
    m.setTile(10 + Math.ceil(ALCANCE) + 2, filaMedia, PIEDRA);
    expect(bloqueEnDireccion(m, c, ...centroDe(40, filaMedia))).toBeNull();
  });

  /** Cavar no puede ir llevándose las antorchas que hay por el camino. */
  it('una antorcha en el camino se atraviesa', () => {
    const { m, c } = escenario();
    m.setTile(12, filaMedia, ANTORCHA);
    m.setTile(14, filaMedia, PIEDRA);
    expect(bloqueEnDireccion(m, c, ...centroDe(40, filaMedia))).toEqual({ tx: 14, ty: filaMedia });
  });

  it('pero tocando justo encima de la antorcha, se coge ella', () => {
    const { m, c } = escenario();
    m.setTile(12, filaMedia, ANTORCHA);
    m.setTile(14, filaMedia, PIEDRA);
    expect(bloqueEnDireccion(m, c, ...centroDe(12, filaMedia))).toEqual({ tx: 12, ty: filaMedia });
  });

  it('en una dirección vacía no hay nada que picar', () => {
    const { m, c } = escenario();
    expect(bloqueEnDireccion(m, c, ...centroDe(10, 0))).toBeNull();
  });

  it('tocando encima del propio jugador no hay dirección', () => {
    const { m, c } = escenario();
    expect(bloqueEnDireccion(m, c, c.x + c.ancho / 2, c.y + c.alto / 2)).toBeNull();
  });

  /** Lo que devuelve siempre es algo que `puedeMinar` acepta por alcance. */
  it('el bloque elegido siempre está al alcance', () => {
    const { m, c } = escenario();
    for (let x = 0; x < 60; x++) for (let y = 0; y < 40; y += 3) {
      const b = bloqueEnDireccion(m, c, ...centroDe(x, y));
      if (b) expect(enAlcance(c, b.tx, b.ty)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  accionarInterruptor,
  ALCANCE,
  resolverCorriente,
} from '../src/world/corriente';
import { Mundo } from '../src/world/world';
import { TILE } from '../src/core/constants';
import { crearCaja } from '../src/entities/physics';
import { puedeColocarBloque } from '../src/world/edit';
import {
  ANTORCHA,
  BATERIA,
  BOMBILLA,
  BOMBILLA_ENCENDIDA,
  CABLE,
  emisionLuz,
  INTERRUPTOR,
  INTERRUPTOR_ENCENDIDO,
  PIEDRA,
} from '../src/world/tiles';

/** Un mundo vacío con una batería y un tendido recto hacia la derecha. */
function tendido(largo: number, bombillaEn = largo): Mundo {
  const m = new Mundo(Math.max(40, largo + 20), 20);
  m.setTile(2, 10, BATERIA);
  for (let i = 1; i <= largo; i++) m.setTile(2 + i, 10, CABLE);
  m.setTile(2 + bombillaEn, 10, BOMBILLA);
  return m;
}

/** Resuelve el mundo entero. */
const resolver = (m: Mundo): ReturnType<typeof resolverCorriente> =>
  resolverCorriente(m, 0, 0, m.ancho - 1, m.alto - 1);

describe('la instalación eléctrica (6.5.0)', () => {
  it('una batería enciende la bombilla que tiene al lado', () => {
    const m = tendido(1);
    const cambios = resolver(m);
    expect(m.getTile(3, 10)).toBe(BOMBILLA_ENCENDIDA);
    expect(cambios).toHaveLength(1);
  });

  it('y la enciende de verdad: el tile encendido alumbra y el apagado no', () => {
    expect(emisionLuz(BOMBILLA)).toBe(0);
    expect(emisionLuz(BOMBILLA_ENCENDIDA)).toBeGreaterThan(0);
  });

  it('la corriente llega por el cable hasta el alcance de la batería', () => {
    const m = tendido(ALCANCE - 2);
    resolver(m);
    expect(m.getTile(2 + ALCANCE - 2, 10)).toBe(BOMBILLA_ENCENDIDA);
  });

  it('y no más allá: ese es el motivo de repartir baterías', () => {
    // Sin tope, una batería en la superficie alumbraría la mina entera y la
    // instalación se resolvería la primera vez y para siempre.
    const m = tendido(ALCANCE + 20);
    resolver(m);
    expect(m.getTile(2 + ALCANCE + 20, 10)).toBe(BOMBILLA);
  });

  it('una segunda batería a mitad de camino la lleva más lejos', () => {
    const largo = ALCANCE + 20;
    const m = tendido(largo);
    m.setTile(2 + ALCANCE - 4, 9, BATERIA);
    resolver(m);
    expect(m.getTile(2 + largo, 10)).toBe(BOMBILLA_ENCENDIDA);
  });

  it('un cable suelto no enciende nada', () => {
    const m = new Mundo(40, 20);
    for (let i = 0; i < 10; i++) m.setTile(5 + i, 10, CABLE);
    m.setTile(15, 10, BOMBILLA);
    expect(resolver(m)).toEqual([]);
    expect(m.getTile(15, 10)).toBe(BOMBILLA);
  });

  it('un hueco en el cable corta la corriente', () => {
    const m = tendido(12);
    m.setTile(8, 10, 0);
    resolver(m);
    expect(m.getTile(14, 10)).toBe(BOMBILLA);
  });

  it('el interruptor apagado corta, y encendido deja pasar', () => {
    // Es la única pieza que hace que valga la pena tender cable en vez de pegar
    // una bombilla a cada batería.
    const m = tendido(12);
    m.setTile(8, 10, INTERRUPTOR);
    resolver(m);
    expect(m.getTile(14, 10)).toBe(BOMBILLA);

    expect(accionarInterruptor(m, 8, 10)).toBe(INTERRUPTOR_ENCENDIDO);
    resolver(m);
    expect(m.getTile(14, 10)).toBe(BOMBILLA_ENCENDIDA);

    expect(accionarInterruptor(m, 8, 10)).toBe(INTERRUPTOR);
    resolver(m);
    expect(m.getTile(14, 10)).toBe(BOMBILLA);
  });

  it('accionar donde no hay interruptor no hace nada', () => {
    const m = tendido(4);
    expect(accionarInterruptor(m, 5, 10)).toBeNull();
    expect(accionarInterruptor(m, 0, 0)).toBeNull();
  });

  it('el mismo tendido enciende dos salas por separado', () => {
    const m = new Mundo(60, 20);
    m.setTile(2, 10, BATERIA);
    for (let i = 3; i <= 20; i++) m.setTile(i, 10, CABLE);
    // Dos ramas, cada una con su llave.
    m.setTile(10, 9, INTERRUPTOR);
    m.setTile(10, 8, BOMBILLA);
    m.setTile(20, 9, INTERRUPTOR_ENCENDIDO);
    m.setTile(20, 8, BOMBILLA);
    resolver(m);
    expect(m.getTile(10, 8)).toBe(BOMBILLA);
    expect(m.getTile(20, 8)).toBe(BOMBILLA_ENCENDIDA);
  });

  it('quitar la batería apaga lo que alimentaba', () => {
    const m = tendido(6);
    resolver(m);
    expect(m.getTile(8, 10)).toBe(BOMBILLA_ENCENDIDA);
    m.setTile(2, 10, 0);
    const cambios = resolver(m);
    expect(m.getTile(8, 10)).toBe(BOMBILLA);
    expect(cambios).toEqual([{ tx: 8, ty: 10, antes: BOMBILLA_ENCENDIDA, ahora: BOMBILLA }]);
  });

  it('no devuelve cambios cuando ya está todo como debe', () => {
    // El bucle del juego repinta y rehace la luz de lo que cambia, así que un
    // cambio de más por tick sería repintar la instalación entera sesenta veces
    // por segundo sin que nada se mueva.
    const m = tendido(6);
    resolver(m);
    expect(resolver(m)).toEqual([]);
  });

  it('solo mira la ventana que se le da', () => {
    // Es lo que impide recorrer seiscientas mil celdas de un mundo titánico
    // buscando seis baterías.
    const m = tendido(6);
    expect(resolverCorriente(m, 30, 0, 39, 19)).toEqual([]);
    expect(m.getTile(8, 10)).toBe(BOMBILLA);
  });

  it('un cable se agarra a otro cable', () => {
    // Tender es literalmente para lo que sirve. Con la regla general de apoyo
    // —hace falta un bloque macizo o una pared— un tendido no podía cruzar una
    // caverna: había que ir poniéndole bloques debajo, que es lo contrario de lo
    // que hace un cable.
    const m = new Mundo(40, 20);
    m.setTile(5, 15, PIEDRA);
    // El jugador, apartado: un bloque macizo no se puede colocar encima de uno mismo.
    const caja = crearCaja(2 * TILE, 13 * TILE, 26, 46);
    expect(puedeColocarBloque(m, caja, 5, 14, CABLE).ok).toBe(true);
    m.setTile(5, 14, CABLE);
    // Y de ahí en horizontal, al aire, apoyándose solo en el cable anterior.
    expect(puedeColocarBloque(m, caja, 6, 14, CABLE).ok).toBe(true);
    // Pero una antorcha ahí no: la excepción es solo de la instalación.
    expect(puedeColocarBloque(m, caja, 6, 14, ANTORCHA).ok).toBe(false);
  });

  it('dos baterías pegadas no se suman', () => {
    // La batería no conduce, alimenta: si condujera, una fila de baterías sería
    // una batería con alcance infinito.
    const largo = ALCANCE + 10;
    const m = tendido(largo);
    m.setTile(2, 9, BATERIA);
    m.setTile(2, 11, BATERIA);
    resolver(m);
    expect(m.getTile(2 + largo, 10)).toBe(BOMBILLA);
  });
});

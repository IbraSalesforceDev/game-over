import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { crearCaja, NADO } from '../src/entities/physics';
import { actualizarFisica } from '../src/entities/physics';
import { AJUSTES_POR_DEFECTO, ENTRADA_VACIA } from '../src/entities/physics';
import {
  ALIENTO_MAXIMO,
  crearAliento,
  DANO_AHOGO,
  INTERVALO_AHOGO,
  RECUPERACION,
  tickAliento,
} from '../src/entities/aliento';
import { crearSalud } from '../src/entities/salud';
import {
  actualizarEnemigos,
  crearEnemigo,
  DANO_LAVA_ENEMIGO,
  ENEMIGOS,
  INTERVALO_LAVA_ENEMIGO,
} from '../src/entities/enemies';
import { MINIMO, SimuladorLiquidos, sumersion } from '../src/world/liquids';
import { defTile, nivelPicoTile, OBSIDIANA, PIEDRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

/** Caja hueca con suelo y paredes, para que el agua no se escape del test. */
function cuenco(ancho = 40, alto = 30): Mundo {
  const m = new Mundo(ancho, alto);
  m.rellenar(0, SUELO, ancho - 1, alto - 1, PIEDRA);
  m.rellenar(0, 0, 0, alto - 1, PIEDRA);
  m.rellenar(ancho - 1, 0, ancho - 1, alto - 1, PIEDRA);
  return m;
}

/** Corre la simulación hasta que se estabiliza o se agota el presupuesto. */
function estabilizar(sim: SimuladorLiquidos, maximo = 4000): number {
  let pasos = 0;
  while (pasos < maximo && sim.paso() > 0) pasos++;
  return pasos;
}

function totalLiquido(m: Mundo): number {
  let n = 0;
  for (let i = 0; i < m.liquido.length; i++) n += m.liquido[i]!;
  return n;
}

describe('capa de líquidos', () => {
  it('guarda nivel y tipo por celda', () => {
    const m = cuenco();
    m.setLiquido(5, 5, 200, true);
    expect(m.getLiquido(5, 5)).toBe(200);
    expect(m.esLava(5, 5)).toBe(true);
  });

  it('una celda seca pierde el tipo, para que la siguiente gota no lo herede', () => {
    const m = cuenco();
    m.setLiquido(5, 5, 200, true);
    m.setLiquido(5, 5, 0);
    expect(m.esLava(5, 5)).toBe(false);
    m.setLiquido(5, 5, 100);
    expect(m.esLava(5, 5)).toBe(false);
  });

  it('fuera del mundo no hay líquido', () => {
    const m = cuenco();
    expect(m.getLiquido(-1, 5)).toBe(0);
    expect(m.getLiquido(5, 999)).toBe(0);
    expect(m.esLava(-1, -1)).toBe(false);
  });
});

describe('simulación', () => {
  it('el agua cae hasta el suelo', () => {
    const m = cuenco();
    // Pozo de una columna: el agua no tiene a dónde repartirse.
    m.rellenar(9, 0, 9, SUELO - 1, PIEDRA);
    m.rellenar(11, 0, 11, SUELO - 1, PIEDRA);
    const sim = new SimuladorLiquidos(m);
    sim.verter(10, 5, 255);
    estabilizar(sim);
    expect(m.getLiquido(10, 5)).toBe(0);
    expect(m.getLiquido(10, SUELO - 1)).toBe(255);
  });

  it('se nivela: las columnas conectadas acaban a la misma altura', () => {
    const m = cuenco();
    // Piscina de seis columnas, para que la lámina se vea.
    m.rellenar(4, 0, 4, SUELO - 1, PIEDRA);
    m.rellenar(11, 0, 11, SUELO - 1, PIEDRA);
    const sim = new SimuladorLiquidos(m);
    // Doce celdas llenas caídas en una esquina: al nivelarse tienen que dar
    // dos filas completas de las seis columnas disponibles.
    for (let i = 0; i < 12; i++) sim.verter(5, SUELO - 1 - i, 255);
    estabilizar(sim);

    const fondo = [];
    for (let tx = 5; tx <= 10; tx++) fondo.push(m.getLiquido(tx, SUELO - 1));
    expect(Math.min(...fondo)).toBeGreaterThan(240);
    // Y la columna donde cayó todo ya no está apilada hasta arriba.
    expect(m.getLiquido(5, SUELO - 8)).toBe(0);
  });

  it('se detiene sola: la lista de celdas activas acaba vacía', () => {
    const m = cuenco();
    const sim = new SimuladorLiquidos(m);
    sim.verter(10, 5, 255);
    estabilizar(sim);
    expect(sim.pendientes).toBe(0);
  });

  it('el agua no atraviesa la roca', () => {
    const m = cuenco();
    m.rellenar(9, 10, 11, 10, PIEDRA);
    const sim = new SimuladorLiquidos(m);
    sim.verter(10, 5, 255);
    estabilizar(sim);
    // El hueco entre la losa y el suelo queda seco: el agua ha tenido que
    // rodearla por los lados y solo vuelve a pasar por debajo al llegar abajo.
    for (let ty = 11; ty < SUELO - 1; ty++) expect(m.getLiquido(10, ty)).toBe(0);
    // Y ha llegado al suelo dando el rodeo.
    expect(m.getLiquido(8, SUELO - 1) + m.getLiquido(12, SUELO - 1)).toBeGreaterThan(0);
  });

  it('el líquido dentro de un bloque desaparece', () => {
    const m = cuenco();
    m.setLiquido(10, 10, 255);
    m.setTile(10, 10, PIEDRA);
    const sim = new SimuladorLiquidos(m);
    sim.activar(10, 10);
    sim.paso();
    expect(m.getLiquido(10, 10)).toBe(0);
  });

  it('el agua apaga la lava y deja obsidiana', () => {
    const m = cuenco();
    const sim = new SimuladorLiquidos(m);
    m.setLiquido(10, SUELO - 1, 255, true);
    sim.verter(10, 10, 255, false);
    estabilizar(sim);
    // Donde estaba la lava queda un bloque, y no queda líquido de ninguno de
    // los dos: el agua se gasta apagándola.
    expect(m.getTile(10, SUELO - 1)).toBe(OBSIDIANA);
    expect(m.getLiquido(10, SUELO - 1)).toBe(0);
  });

  it('la obsidiana solo sale donde estaba la lava, no donde estaba el agua', () => {
    const m = cuenco();
    const sim = new SimuladorLiquidos(m);
    m.setLiquido(10, SUELO - 1, 255, true);
    m.setLiquido(11, SUELO - 1, 255, false);
    sim.despertarTodo();
    estabilizar(sim);
    expect(m.getTile(10, SUELO - 1)).toBe(OBSIDIANA);
    expect(m.getTile(11, SUELO - 1)).not.toBe(OBSIDIANA);
  });

  it('dos celdas de agua juntas no se apagan entre ellas', () => {
    const m = cuenco();
    const sim = new SimuladorLiquidos(m);
    m.setLiquido(10, SUELO - 1, 255, false);
    m.setLiquido(11, SUELO - 1, 255, false);
    sim.despertarTodo();
    estabilizar(sim);
    expect(m.getTile(10, SUELO - 1)).not.toBe(OBSIDIANA);
    expect(totalLiquido(m)).toBeGreaterThan(0);
  });

  it('la obsidiana es lo más duro y pide pico de hierro', () => {
    // Si se pudiera picar con el de madera, apagar una colada con un cubo de
    // agua saldría gratis y la lava dejaría de ser un obstáculo.
    expect(nivelPicoTile(OBSIDIANA)).toBeGreaterThanOrEqual(4);
    expect(defTile(OBSIDIANA).dureza).toBeGreaterThan(defTile(PIEDRA).dureza);
  });

  it('no crea líquido de la nada al repartirse', () => {
    const m = cuenco();
    const sim = new SimuladorLiquidos(m);
    for (let i = 0; i < 4; i++) sim.verter(10, 10 + i, 255);
    const antes = totalLiquido(m);
    estabilizar(sim);
    // Puede perder los restos que se evaporan, pero nunca ganar.
    expect(totalLiquido(m)).toBeLessThanOrEqual(antes);
  });

  it('despertarTodo revive el líquido de un mundo recién cargado', () => {
    const m = cuenco();
    m.setLiquido(10, 5, 255);
    const sim = new SimuladorLiquidos(m);
    expect(sim.pendientes).toBe(0);
    sim.despertarTodo();
    expect(sim.pendientes).toBe(1);
    estabilizar(sim);
    expect(m.getLiquido(10, 5)).toBe(0);
  });
});

describe('sumersión', () => {
  const caja = () => ({ x: 10 * TILE, y: 10 * TILE, ancho: 20, alto: 42 });

  it('una caja en seco no está sumergida', () => {
    const m = cuenco();
    expect(sumersion(m, caja(), TILE).fraccion).toBe(0);
  });

  it('una caja rodeada de agua está sumergida del todo', () => {
    const m = cuenco();
    for (let ty = 9; ty <= 13; ty++) {
      for (let tx = 9; tx <= 12; tx++) m.setLiquido(tx, ty, 255);
    }
    const s = sumersion(m, caja(), TILE);
    expect(s.fraccion).toBeCloseTo(1, 2);
    expect(s.cabeza).toBe(true);
  });

  it('con solo los pies dentro, la cabeza respira', () => {
    const m = cuenco();
    // La caja va de la fila 10 a la 12 (42 px). Solo se moja la última.
    for (let tx = 9; tx <= 12; tx++) m.setLiquido(tx, 12, 255);
    const s = sumersion(m, caja(), TILE);
    expect(s.fraccion).toBeGreaterThan(0);
    expect(s.fraccion).toBeLessThan(NADO.umbral);
    expect(s.cabeza).toBe(false);
  });

  it('detecta la lava aunque solo se roce', () => {
    const m = cuenco();
    m.setLiquido(10, 12, 255, true);
    expect(sumersion(m, caja(), TILE).lava).toBe(true);
  });

  it('una celda a medio llenar solo moja su mitad de abajo', () => {
    const m = cuenco();
    // Media celda de agua en la fila de los pies.
    for (let tx = 9; tx <= 12; tx++) m.setLiquido(tx, 12, 128);
    const s = sumersion(m, caja(), TILE);
    // La caja acaba a 42 px de su origen, o sea 10 px dentro de la fila 12;
    // la lámina empieza a los 8 px, así que se mojan unos 2 px de 42.
    expect(s.fraccion).toBeGreaterThan(0);
    expect(s.fraccion).toBeLessThan(0.15);
  });

  it('ignora los restos por debajo del mínimo', () => {
    const m = cuenco();
    for (let tx = 9; tx <= 12; tx++) m.setLiquido(tx, 12, MINIMO);
    expect(sumersion(m, caja(), TILE).fraccion).toBe(0);
  });
});

describe('nadar', () => {
  const mundoSeco = () => cuenco();

  it('se cae mucho más despacio dentro del agua', () => {
    const m = mundoSeco();
    const seca = crearCaja(5 * TILE, 5 * TILE, 20, 42);
    const mojada = crearCaja(5 * TILE, 5 * TILE, 20, 42);
    for (let i = 0; i < 30; i++) {
      actualizarFisica(m, seca, ENTRADA_VACIA, AJUSTES_POR_DEFECTO, 0);
      actualizarFisica(m, mojada, ENTRADA_VACIA, AJUSTES_POR_DEFECTO, 1);
    }
    expect(mojada.y).toBeLessThan(seca.y);
    expect(mojada.vy).toBeLessThanOrEqual(
      AJUSTES_POR_DEFECTO.velTerminal * NADO.velTerminal + 0.001,
    );
  });

  it('manteniendo salto se sube, sin necesitar suelo', () => {
    const m = mundoSeco();
    const c = crearCaja(5 * TILE, 10 * TILE, 20, 42);
    const yInicial = c.y;
    const entrada = { ...ENTRADA_VACIA, salto: true };
    for (let i = 0; i < 60; i++) actualizarFisica(m, c, entrada, AJUSTES_POR_DEFECTO, 1);
    expect(c.y).toBeLessThan(yInicial);
  });

  it('mojarse por debajo del umbral no cambia nada', () => {
    const m = mundoSeco();
    const seca = crearCaja(5 * TILE, 5 * TILE, 20, 42);
    const rozando = crearCaja(5 * TILE, 5 * TILE, 20, 42);
    const poco = NADO.umbral - 0.05;
    for (let i = 0; i < 20; i++) {
      actualizarFisica(m, seca, ENTRADA_VACIA, AJUSTES_POR_DEFECTO, 0);
      actualizarFisica(m, rozando, ENTRADA_VACIA, AJUSTES_POR_DEFECTO, poco);
    }
    expect(rozando.y).toBeCloseTo(seca.y, 6);
  });
});

describe('aliento', () => {
  const caja = () => crearCaja(0, 0, 20, 42);

  it('con la cabeza fuera el aire no baja', () => {
    const a = crearAliento();
    const s = crearSalud();
    tickAliento(a, s, caja(), false, false);
    expect(a.aire).toBe(ALIENTO_MAXIMO);
  });

  it('bajo el agua el aire baja un tick por tick', () => {
    const a = crearAliento();
    const s = crearSalud();
    const c = caja();
    for (let i = 0; i < 100; i++) tickAliento(a, s, c, true, false);
    expect(a.aire).toBe(ALIENTO_MAXIMO - 100);
  });

  it('sin aire se ahoga, y a intervalos, no cada tick', () => {
    const a = crearAliento();
    const s = crearSalud();
    const c = caja();
    a.aire = 0;
    for (let i = 0; i < INTERVALO_AHOGO; i++) tickAliento(a, s, c, true, false);
    expect(s.vida).toBe(s.vidaMax - DANO_AHOGO);
    // Justo el tick siguiente no vuelve a doler.
    tickAliento(a, s, c, true, false);
    expect(s.vida).toBe(s.vidaMax - DANO_AHOGO);
  });

  it('ahogarse no empuja al jugador: perder el control ahí sería peor', () => {
    const a = crearAliento();
    const s = crearSalud();
    const c = caja();
    a.aire = 0;
    for (let i = 0; i < INTERVALO_AHOGO; i++) tickAliento(a, s, c, true, false);
    expect(c.vx).toBe(0);
    expect(c.vy).toBe(0);
  });

  it('salir a la superficie recupera el aire deprisa', () => {
    const a = crearAliento();
    const s = crearSalud();
    const c = caja();
    a.aire = 0;
    tickAliento(a, s, c, false, false);
    expect(a.aire).toBe(RECUPERACION);
  });

  it('la lava quema al instante y se sigue ardiendo al salir', () => {
    const a = crearAliento();
    const s = crearSalud();
    const c = caja();
    tickAliento(a, s, c, false, true);
    expect(s.vida).toBeLessThan(s.vidaMax);
    expect(a.ardiendo).toBeGreaterThan(0);

    const trasLava = s.vida;
    s.invulnerable = 0;
    for (let i = 0; i < 200; i++) {
      s.invulnerable = 0;
      tickAliento(a, s, c, false, false);
    }
    expect(s.vida).toBeLessThan(trasLava);
    expect(a.ardiendo).toBe(0);
  });
});

describe('la lava quema a todo el mundo', () => {
  it('un enemigo metido en lava pierde vida', () => {
    const m = cuenco();
    m.setLiquido(10, SUELO - 1, 255, true);
    m.setLiquido(11, SUELO - 1, 255, true);
    const e = crearEnemigo('zombi', 10 * TILE, (SUELO - 3) * TILE);
    const salud = crearSalud(100);
    const caja = crearCaja(30 * TILE, 5 * TILE, 26, 46);
    const antes = e.salud.vida;
    for (let i = 0; i < INTERVALO_LAVA_ENEMIGO * 3; i++) {
      actualizarEnemigos(m, [e], caja, salud);
    }
    expect(e.salud.vida).toBeLessThan(antes);
  });

  it('no mata de un toque: da tiempo a salir', () => {
    const m = cuenco();
    m.setLiquido(10, SUELO - 1, 255, true);
    const e = crearEnemigo('zombi', 10 * TILE, (SUELO - 3) * TILE);
    const salud = crearSalud(100);
    const caja = crearCaja(30 * TILE, 5 * TILE, 26, 46);
    actualizarEnemigos(m, [e], caja, salud);
    expect(e.salud.muerto).toBe(false);
    expect(DANO_LAVA_ENEMIGO).toBeLessThan(ENEMIGOS.zombi.vida);
  });

  it('fuera de la lava no se quema nadie', () => {
    const m = cuenco();
    const e = crearEnemigo('zombi', 10 * TILE, (SUELO - 3) * TILE);
    const salud = crearSalud(100);
    const caja = crearCaja(30 * TILE, 5 * TILE, 26, 46);
    for (let i = 0; i < 200; i++) actualizarEnemigos(m, [e], caja, salud);
    expect(e.salud.vida).toBe(e.salud.vidaMax);
  });

  it('el agua no quema', () => {
    const m = cuenco();
    m.setLiquido(10, SUELO - 1, 255, false);
    m.setLiquido(11, SUELO - 1, 255, false);
    const e = crearEnemigo('slime', 10 * TILE, (SUELO - 3) * TILE);
    const salud = crearSalud(100);
    const caja = crearCaja(30 * TILE, 5 * TILE, 26, 46);
    for (let i = 0; i < 200; i++) actualizarEnemigos(m, [e], caja, salud);
    expect(e.salud.vida).toBe(e.salud.vidaMax);
  });
});

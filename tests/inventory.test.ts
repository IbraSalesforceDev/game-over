import { describe, expect, it } from 'vitest';
import { TILE } from '../src/core/constants';
import { actualizarDrop, crearDrop, fusionarDrops, RADIO_IMAN } from '../src/entities/drop';
import { equipoInicial, mejorPico, PICO_INICIAL } from '../src/items/equipo';
import { Inventario, RANURAS_BARRA, TOTAL_RANURAS } from '../src/items/inventory';
import {
  defObjeto,
  dropDeTile,
  esColocable,
  esHerramienta,
  NADA,
  PICO_HIERRO,
  PICO_MADERA,
  SEMILLAS,
  SEMILLAS_ZANAHORIA,
} from '../src/items/items';
import {
  ANTORCHA,
  BROTE,
  COBRE,
  HIERBA,
  HOJAS,
  MADERA,
  PIEDRA,
  TIERRA,
  TRONCO,
} from '../src/world/tiles';
import { Mundo } from '../src/world/world';

describe('catálogo de objetos', () => {
  it('los bloques colocan su propio tile', () => {
    expect(defObjeto(PIEDRA).tile).toBe(PIEDRA);
    expect(esColocable(PIEDRA)).toBe(true);
  });

  it('los minerales en bruto no se colocan', () => {
    expect(esColocable(COBRE)).toBe(false);
  });

  it('los picos son herramientas y no se apilan', () => {
    expect(esHerramienta(PICO_MADERA)).toBe(true);
    expect(defObjeto(PICO_MADERA).maxPila).toBe(1);
  });

  it('un pico mejor tiene más potencia', () => {
    expect(defObjeto(PICO_HIERRO).potencia!).toBeGreaterThan(
      defObjeto(PICO_MADERA).potencia!,
    );
  });
});

describe('lo que suelta cada tile', () => {
  it('la hierba suelta tierra casi siempre y el tronco madera', () => {
    // La hierba tiene un 12 % de dar semillas, así que preguntarle una sola vez
    // era un test que fallaba una de cada ocho ejecuciones. Se muestrea.
    let tierra = 0;
    for (let i = 0; i < 400; i++) if (dropDeTile(HIERBA) === TIERRA) tierra++;
    expect(tierra).toBeGreaterThan(300);
    // El tronco sí es determinista: siempre madera.
    for (let i = 0; i < 20; i++) expect(dropDeTile(TRONCO)).toBe(MADERA);
  });

  it('las hojas casi nunca sueltan nada, y a veces un brote', () => {
    // Es aleatorio, así que se muestrea: lo que se comprueba es que la mayoría
    // no dé nada y que el brote salga alguna vez. Sin el brote, talar un bosque
    // sería talarlo para siempre.
    let nada = 0;
    let brotes = 0;
    for (let i = 0; i < 3000; i++) {
      const d = dropDeTile(HOJAS);
      if (d === NADA) nada++;
      else if (d === BROTE) brotes++;
      else throw new Error(`las hojas no deberían soltar ${d}`);
    }
    expect(brotes).toBeGreaterThan(0);
    expect(nada).toBeGreaterThan(brotes * 5);
  });

  it('la hierba da tierra casi siempre y semillas de vez en cuando', () => {
    let tierra = 0;
    let semillas = 0;
    for (let i = 0; i < 3000; i++) {
      const d = dropDeTile(HIERBA);
      if (d === TIERRA) tierra++;
      else if (d === SEMILLAS || d === SEMILLAS_ZANAHORIA) semillas++;
      else throw new Error(`la hierba no debería soltar ${d}`);
    }
    expect(semillas).toBeGreaterThan(0);
    expect(tierra).toBeGreaterThan(semillas * 3);
  });

  it('el resto se suelta a sí mismo', () => {
    expect(dropDeTile(PIEDRA)).toBe(PIEDRA);
    expect(dropDeTile(COBRE)).toBe(COBRE);
  });
});

describe('inventario', () => {
  it('empieza vacío con las ranuras esperadas', () => {
    const inv = new Inventario();
    expect(inv.ranuras).toHaveLength(TOTAL_RANURAS);
    expect(inv.contar(PIEDRA)).toBe(0);
  });

  it('añadir apila en la misma ranura', () => {
    const inv = new Inventario();
    inv.anadir(PIEDRA, 10);
    inv.anadir(PIEDRA, 5);
    expect(inv.contar(PIEDRA)).toBe(15);
    expect(inv.ranuras.filter((r) => r.objeto === PIEDRA)).toHaveLength(1);
  });

  it('completa pilas empezadas antes de ocupar ranuras vacías', () => {
    const inv = new Inventario();
    const tope = defObjeto(PIEDRA).maxPila;
    inv.anadir(PIEDRA, tope - 3);
    inv.anadir(PIEDRA, 10);
    expect(inv.ranuras[0]!.cantidad).toBe(tope);
    expect(inv.ranuras[1]!.cantidad).toBe(7);
  });

  it('no mete más de lo que cabe y devuelve el sobrante', () => {
    const inv = new Inventario(2);
    const tope = defObjeto(PIEDRA).maxPila;
    const sobra = inv.anadir(PIEDRA, tope * 2 + 25);
    expect(sobra).toBe(25);
    expect(inv.contar(PIEDRA)).toBe(tope * 2);
  });

  it('las herramientas ocupan una ranura cada una', () => {
    const inv = new Inventario();
    inv.anadir(PICO_MADERA, 3);
    expect(inv.ranuras.filter((r) => r.objeto === PICO_MADERA)).toHaveLength(3);
  });

  it('cabe() responde sin modificar nada', () => {
    const inv = new Inventario(1);
    expect(inv.cabe(PIEDRA, 10)).toBe(true);
    expect(inv.cabe(PIEDRA, 100000)).toBe(false);
    expect(inv.contar(PIEDRA)).toBe(0);
  });

  it('sacar vacía la ranura al llegar a cero', () => {
    const inv = new Inventario();
    inv.anadir(PIEDRA, 2);
    expect(inv.sacarDe(0, 1)).toBe(1);
    expect(inv.sacarDe(0, 5)).toBe(1);
    expect(inv.ranuras[0]!.objeto).toBe(NADA);
    expect(inv.sacarDe(0, 1)).toBe(0);
  });

  it('mover intercambia ranuras distintas', () => {
    const inv = new Inventario();
    inv.anadir(PIEDRA, 5);
    inv.ranuras[1]!.objeto = MADERA;
    inv.ranuras[1]!.cantidad = 3;
    inv.mover(0, 1);
    expect(inv.ranuras[0]!.objeto).toBe(MADERA);
    expect(inv.ranuras[1]!.objeto).toBe(PIEDRA);
  });

  it('mover apila si son el mismo objeto', () => {
    const inv = new Inventario();
    inv.ranuras[0]! .objeto = PIEDRA;
    inv.ranuras[0]!.cantidad = 5;
    inv.ranuras[1]!.objeto = PIEDRA;
    inv.ranuras[1]!.cantidad = 3;
    inv.mover(0, 1);
    expect(inv.ranuras[1]!.cantidad).toBe(8);
    expect(inv.ranuras[0]!.objeto).toBe(NADA);
  });

  it('sobrevive a la ida y vuelta del guardado', () => {
    const inv = new Inventario();
    inv.anadir(PIEDRA, 42);
    inv.anadir(ANTORCHA, 7);
    const copia = Inventario.desdeDatos(inv.aDatos());
    expect(copia.contar(PIEDRA)).toBe(42);
    expect(copia.contar(ANTORCHA)).toBe(7);
  });

  it('la barra rápida son las primeras ranuras del inventario', () => {
    expect(RANURAS_BARRA).toBeLessThan(TOTAL_RANURAS);
  });
});

describe('equipo inicial', () => {
  it('trae un pico y antorchas', () => {
    const inv = equipoInicial();
    expect(inv.contar(PICO_INICIAL)).toBe(1);
    expect(inv.contar(ANTORCHA)).toBeGreaterThan(0);
  });

  it('mejorPico devuelve la potencia más alta que se lleve', () => {
    const inv = new Inventario();
    expect(mejorPico(inv)).toBe(0);
    inv.anadir(PICO_MADERA, 1);
    expect(mejorPico(inv)).toBe(defObjeto(PICO_MADERA).potencia);
    inv.anadir(PICO_HIERRO, 1);
    expect(mejorPico(inv)).toBe(defObjeto(PICO_HIERRO).potencia);
  });
});

describe('objetos por el suelo', () => {
  const SUELO = 20;

  function mundo(): Mundo {
    const m = new Mundo(60, 40);
    m.rellenar(0, SUELO, 59, 39, PIEDRA);
    return m;
  }

  /** Jugador lejos, para que el imán no interfiera. */
  const lejos = { x: 50 * TILE, y: 5 * TILE };

  it('cae y se queda sobre el suelo', () => {
    const m = mundo();
    const inv = new Inventario();
    const d = crearDrop(PIEDRA, 1, 10, SUELO - 6, () => 0.5);
    for (let i = 0; i < 200; i++) actualizarDrop(m, d, lejos, inv);
    expect(d.vivo).toBe(true);
    expect(d.y + 8).toBeLessThanOrEqual(SUELO * TILE);
    expect(d.y + 8).toBeGreaterThan(SUELO * TILE - 2);
  });

  it('el jugador cercano lo atrae y acaba recogiéndolo', () => {
    const m = mundo();
    const inv = new Inventario();
    const d = crearDrop(PIEDRA, 3, 10, SUELO - 2, () => 0.5);
    const cerca = { x: 12 * TILE, y: (SUELO - 1) * TILE };
    let recogido = false;
    for (let i = 0; i < 300 && !recogido; i++) {
      recogido = actualizarDrop(m, d, cerca, inv);
    }
    expect(recogido).toBe(true);
    expect(inv.contar(PIEDRA)).toBe(3);
    expect(d.vivo).toBe(false);
  });

  it('no lo atrae si está lejos', () => {
    const m = mundo();
    const inv = new Inventario();
    const d = crearDrop(PIEDRA, 1, 10, SUELO - 2, () => 0.5);
    const muyLejos = { x: (10 + RADIO_IMAN + 6) * TILE, y: (SUELO - 1) * TILE };
    for (let i = 0; i < 200; i++) actualizarDrop(m, d, muyLejos, inv);
    expect(inv.contar(PIEDRA)).toBe(0);
    expect(d.vivo).toBe(true);
  });

  it('no se recoge nada más soltarlo, para no tragarse lo que colocas', () => {
    const m = mundo();
    const inv = new Inventario();
    const d = crearDrop(PIEDRA, 1, 10, SUELO - 1, () => 0.5);
    const encima = { x: 10 * TILE, y: (SUELO - 1) * TILE };
    expect(actualizarDrop(m, d, encima, inv)).toBe(false);
    expect(inv.contar(PIEDRA)).toBe(0);
  });

  it('si el inventario está lleno, el objeto se queda en el suelo', () => {
    const m = mundo();
    const inv = new Inventario(1);
    inv.anadir(MADERA, defObjeto(MADERA).maxPila);
    const d = crearDrop(PIEDRA, 1, 10, SUELO - 2, () => 0.5);
    const cerca = { x: 10 * TILE, y: (SUELO - 1) * TILE };
    for (let i = 0; i < 200; i++) actualizarDrop(m, d, cerca, inv);
    expect(d.vivo).toBe(true);
    expect(inv.contar(PIEDRA)).toBe(0);
  });

  it('los objetos iguales que están juntos se fusionan', () => {
    const drops = [
      crearDrop(PIEDRA, 1, 10, 10, () => 0.5),
      crearDrop(PIEDRA, 1, 10, 10, () => 0.5),
      crearDrop(MADERA, 1, 10, 10, () => 0.5),
    ];
    fusionarDrops(drops);
    const vivos = drops.filter((d) => d.vivo);
    expect(vivos).toHaveLength(2);
    expect(vivos.find((d) => d.objeto === PIEDRA)!.cantidad).toBe(2);
  });

  it('no atraviesa el suelo aunque caiga desde muy alto', () => {
    const m = mundo();
    const inv = new Inventario();
    const d = crearDrop(PIEDRA, 1, 10, 0, () => 0.5);
    for (let i = 0; i < 400; i++) actualizarDrop(m, d, lejos, inv);
    expect(d.y).toBeLessThan(SUELO * TILE);
  });
});

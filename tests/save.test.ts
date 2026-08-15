import { describe, expect, it } from 'vitest';
import { AlmacenMemoria, nuevoId, type MetaMundo } from '../src/world/almacen';
import { generarMundo } from '../src/world/gen/worldgen';
import {
  desempaquetar,
  deserializar,
  empaquetar,
  HORA_POR_DEFECTO,
  serializar,
  VERSION_FORMATO,
  type EstadoPartida,
} from '../src/world/save';
import { HIERBA, MADERA, PIEDRA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

function estado(parcial: Partial<EstadoPartida> = {}): EstadoPartida {
  return {
    semilla: 'PRUEBA',
    jugador: { x: 123.5, y: 456.25, spawnX: 100, spawnY: 200 },
    creado: 1700000000000,
    jugado: 65000,
    material: 2,
    capaPared: true,
    minutos: 13 * 60 + 37,
    inventario: [
      [3, 120],
      [12, 8],
    ],
    cofres: [],
    vida: 80,
    ...parcial,
  };
}

function mundoDePrueba(): Mundo {
  const m = new Mundo(60, 40);
  m.rellenar(0, 20, 59, 39, TIERRA);
  m.rellenar(0, 30, 59, 39, PIEDRA);
  m.rellenar(0, 20, 59, 20, HIERBA);
  m.rellenar(10, 15, 14, 19, MADERA);
  for (let ty = 21; ty < 40; ty++) m.setPared(5, ty, TIERRA);
  return m;
}

describe('serialización', () => {
  it('el mundo vuelve igual tras la ida y vuelta', () => {
    const m = mundoDePrueba();
    const e = estado();
    const { mundo, estado: leido } = deserializar(serializar(m, e));

    expect(mundo.ancho).toBe(m.ancho);
    expect(mundo.alto).toBe(m.alto);
    expect(mundo.tileId).toEqual(m.tileId);
    expect(mundo.wallId).toEqual(m.wallId);
    expect(leido).toEqual(e);
  });

  it('conserva la posición del jugador con decimales', () => {
    const { estado: leido } = deserializar(serializar(mundoDePrueba(), estado()));
    expect(leido.jugador.x).toBe(123.5);
    expect(leido.jugador.y).toBe(456.25);
  });

  it('el RLE deja el mundo en una fracción de su tamaño en bruto', () => {
    const m = mundoDePrueba();
    const bruto = m.tileId.byteLength + m.wallId.byteLength;
    const bytes = serializar(m, estado()).length;
    expect(bytes).toBeLessThan(bruto / 4);
  });

  it('aguanta un mundo generado de verdad', () => {
    const { mundo } = generarMundo({ ancho: 300, alto: 200, semilla: 'RLE' });
    const copia = deserializar(serializar(mundo, estado())).mundo;
    expect(copia.tileId).toEqual(mundo.tileId);
    expect(copia.wallId).toEqual(mundo.wallId);
  });

  it('un mundo vacío también va y vuelve', () => {
    const m = new Mundo(8, 8);
    const copia = deserializar(serializar(m, estado())).mundo;
    expect(copia.tileId).toEqual(m.tileId);
  });
});

describe('empaquetado', () => {
  it('la ida y vuelta completa reconstruye el mundo', async () => {
    const m = mundoDePrueba();
    const e = estado();
    const { mundo, estado: leido } = await desempaquetar(await empaquetar(m, e));
    expect(mundo.tileId).toEqual(m.tileId);
    expect(leido).toEqual(e);
  });

  it('la cabecera lleva magia y versión legibles sin descomprimir', async () => {
    const bytes = await empaquetar(mundoDePrueba(), estado());
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(vista.getUint32(0)).toBe(0x474f5652);
    expect(vista.getUint16(4)).toBe(VERSION_FORMATO);
  });

  it('rechaza un fichero que no es del juego', async () => {
    const basura = new Uint8Array(64);
    basura.fill(7);
    await expect(desempaquetar(basura)).rejects.toThrow(/no es un mundo/i);
  });

  it('rechaza un fichero truncado', async () => {
    await expect(desempaquetar(new Uint8Array(3))).rejects.toThrow(/truncado|vac/i);
  });

  /**
   * Reconstruye el cuerpo tal y como lo escribía una versión anterior:
   * la cabecera común, después los campos que existieran en esa versión, y al
   * final el mismo bloque RLE. Se calcula por tamaños en vez de a ojo para que
   * no haya que retocarlo cada vez que el formato crece.
   */
  function cuerpoAntiguo(m: Mundo, e: EstadoPartida, version: 1 | 2 | 3): Uint8Array {
    const bytesSemilla = new TextEncoder().encode(e.semilla).length;
    const comun = 4 + 4 + 2 + bytesSemilla + 8 * 6 + 1 + 1;
    const campoMinutos = 2;
    const campoInventario = 2 + 4 * e.inventario.length;
    // Solo se construyen cuerpos antiguos sin cofres, que es el caso real.
    const campoCofres = 2;
    const campoVida = 2;

    const actual = serializar(m, e);
    const inicioRle = comun + campoMinutos + campoInventario + campoCofres + campoVida;
    const rle = actual.subarray(inicioRle);

    let extra = 0;
    if (version >= 2) extra += campoMinutos;
    if (version >= 3) extra += campoInventario;

    const salida = new Uint8Array(comun + extra + rle.length);
    salida.set(actual.subarray(0, comun + extra), 0);
    salida.set(rle, comun + extra);
    return salida;
  }

  it('abre un mundo del formato 1, que no guardaba ni la hora ni el inventario', () => {
    const m = new Mundo(4, 4);
    m.rellenar(0, 2, 3, 3, PIEDRA);
    const e = estado();

    const { estado: leido, mundo } = deserializar(cuerpoAntiguo(m, e, 1), 1);
    expect(leido.minutos).toBe(HORA_POR_DEFECTO);
    expect(leido.inventario).toEqual([]);
    expect(leido.semilla).toBe(e.semilla);
    expect(mundo.tileId).toEqual(m.tileId);
  });

  it('abre un mundo del formato 2, que guardaba la hora pero no el inventario', () => {
    const m = new Mundo(4, 4);
    m.rellenar(0, 2, 3, 3, PIEDRA);
    const e = estado();

    const { estado: leido, mundo } = deserializar(cuerpoAntiguo(m, e, 2), 2);
    expect(leido.minutos).toBe(e.minutos);
    expect(leido.inventario).toEqual([]);
    expect(mundo.tileId).toEqual(m.tileId);
  });

  it('rechaza un mundo de una versión futura', async () => {
    const bytes = await empaquetar(mundoDePrueba(), estado());
    new DataView(bytes.buffer).setUint16(4, VERSION_FORMATO + 1);
    await expect(desempaquetar(bytes)).rejects.toThrow(/más nueva/i);
  });

  it('comprime de verdad un mundo generado', async () => {
    const { mundo } = generarMundo({ ancho: 400, alto: 300, semilla: 'PESO' });
    const crudo = serializar(mundo, estado()).length;
    const empaquetado = (await empaquetar(mundo, estado())).length;
    expect(empaquetado).toBeLessThan(crudo);
    // Un mundo de 400x300 tiene que caber de sobra en el presupuesto de
    // IndexedDB: si esto se dispara, el formato se ha roto.
    expect(empaquetado).toBeLessThan(500 * 1024);
  });
});

describe('almacén', () => {
  const meta = (id: string, nombre: string, modificado: number): MetaMundo => ({
    id,
    nombre,
    semilla: 'S',
    ancho: 60,
    alto: 40,
    creado: 1,
    modificado,
    jugado: 0,
    bytes: 10,
    version: VERSION_FORMATO,
  });

  it('guarda, lista, carga y borra', async () => {
    const a = new AlmacenMemoria();
    const datos = new Uint8Array([1, 2, 3, 4]);
    await a.guardar('uno', meta('uno', 'Primero', 100), datos);

    const lista = await a.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0]!.nombre).toBe('Primero');

    expect(await a.cargar('uno')).toEqual(datos);

    await a.borrar('uno');
    expect(await a.listar()).toHaveLength(0);
  });

  it('lista los mundos del más reciente al más antiguo', async () => {
    const a = new AlmacenMemoria();
    const d = new Uint8Array([0]);
    await a.guardar('viejo', meta('viejo', 'Viejo', 100), d);
    await a.guardar('nuevo', meta('nuevo', 'Nuevo', 900), d);
    await a.guardar('medio', meta('medio', 'Medio', 500), d);
    expect((await a.listar()).map((m) => m.nombre)).toEqual(['Nuevo', 'Medio', 'Viejo']);
  });

  it('sobrescribir un mundo no lo duplica', async () => {
    const a = new AlmacenMemoria();
    await a.guardar('x', meta('x', 'Uno', 1), new Uint8Array([1]));
    await a.guardar('x', meta('x', 'Uno editado', 2), new Uint8Array([2, 2]));
    const lista = await a.listar();
    expect(lista).toHaveLength(1);
    expect(lista[0]!.nombre).toBe('Uno editado');
    expect(await a.cargar('x')).toEqual(new Uint8Array([2, 2]));
  });

  it('cargar un id inexistente falla con un mensaje claro', async () => {
    const a = new AlmacenMemoria();
    await expect(a.cargar('fantasma')).rejects.toThrow(/no hay ningún mundo/i);
  });

  it('guardar copia los datos: mutar el original después no corrompe la partida', async () => {
    const a = new AlmacenMemoria();
    const datos = new Uint8Array([1, 2, 3]);
    await a.guardar('x', meta('x', 'X', 1), datos);
    datos[0] = 99;
    expect((await a.cargar('x'))[0]).toBe(1);
  });

  it('los identificadores no se repiten', () => {
    const ids = new Set(Array.from({ length: 200 }, () => nuevoId()));
    expect(ids.size).toBe(200);
  });
});

describe('partida completa', () => {
  it('un mundo generado, guardado y recuperado es idéntico', async () => {
    const a = new AlmacenMemoria();
    const { mundo, spawnTx, spawnTy } = generarMundo({
      ancho: 300,
      alto: 200,
      semilla: 'VIAJE',
    });
    // Simular que el jugador ha excavado y construido.
    mundo.setTile(150, 60, 0);
    mundo.setTile(151, 60, 0);
    mundo.setTile(150, 59, MADERA);
    mundo.setPared(150, 60, PIEDRA);

    const e = estado({
      semilla: 'VIAJE',
      jugador: { x: spawnTx * 16, y: spawnTy * 16, spawnX: spawnTx * 16, spawnY: spawnTy * 16 },
    });
    const bytes = await empaquetar(mundo, e);
    const id = nuevoId();
    await a.guardar(
      id,
      {
        id,
        nombre: 'Viaje',
        semilla: 'VIAJE',
        ancho: mundo.ancho,
        alto: mundo.alto,
        creado: e.creado,
        modificado: Date.now(),
        jugado: e.jugado,
        bytes: bytes.length,
        version: VERSION_FORMATO,
      },
      bytes,
    );

    const recuperado = await desempaquetar(await a.cargar(id));
    expect(recuperado.mundo.tileId).toEqual(mundo.tileId);
    expect(recuperado.mundo.wallId).toEqual(mundo.wallId);
    expect(recuperado.mundo.getTile(150, 59)).toBe(MADERA);
    expect(recuperado.mundo.getTile(150, 60)).toBe(0);
    expect(recuperado.mundo.getPared(150, 60)).toBe(PIEDRA);
    expect(recuperado.estado.jugador.x).toBe(spawnTx * 16);
  });
});

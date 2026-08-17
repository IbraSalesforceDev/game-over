import { describe, expect, it } from 'vitest';
import { generarMundo } from '../src/world/gen/worldgen';
import {
  destinosPosibles,
  dilatar,
  fundir,
  marcarTocado,
  migrarEstado,
  migrarPasos,
  planMigracion,
} from '../src/world/migracion';
import { hay, VERSION_ACTUAL, VERSIONES } from '../src/core/versiones';
import { DIFICULTAD_POR_DEFECTO } from '../src/core/dificultad';
import { VIDA_MAXIMA } from '../src/entities/salud';
import { ESPADA_GUARDIAN, SEMILLAS } from '../src/items/items';
import {
  AIRE,
  HIERBA,
  HIERBA_JUNGLA,
  LADRILLO,
  MADERA,
  MADERA as MADERA_OBJ,
  PIEDRA,
  sustitutoTile,
  versionTile,
} from '../src/world/tiles';
import { Mundo } from '../src/world/world';
import type { EstadoPartida } from '../src/world/save';

const TAM = { ancho: 400, alto: 300 };
const SEMILLA = 'MIGRAR';

function estadoDe(version: string, parcial: Partial<EstadoPartida> = {}): EstadoPartida {
  return {
    semilla: SEMILLA,
    jugador: { x: 100, y: 100, spawnX: 100, spawnY: 100 },
    creado: 0,
    jugado: 0,
    material: 0,
    capaPared: false,
    minutos: 600,
    inventario: [],
    equipo: [],
    cofres: [],
    vida: 100,
    vidaMax: 100,
    hambre: 100,
    dificultad: DIFICULTAD_POR_DEFECTO,
    hardcore: false,
    hardcoreMuerto: false,
    estructuras: [],
    jefeVencido: false,
    versionJuego: version,
    mundoHondo: false,
    ...parcial,
  };
}

/** Agota el generador de migración de una tacada, como hacen los tests. */
function migrar(mundo: Mundo, estado: EstadoPartida, hasta: string) {
  const it = migrarPasos(mundo, estado, hasta, TAM);
  let paso = it.next();
  while (!paso.done) paso = it.next();
  return paso.value;
}

describe('sustituir bloques que ya no existen', () => {
  it('busca el pariente más cercano, no un agujero', () => {
    const existe = (id: number) => versionTile(id) <= '3.0.0';
    expect(sustitutoTile(HIERBA_JUNGLA, existe)).toBe(HIERBA);
    expect(sustitutoTile(LADRILLO, existe)).toBe(PIEDRA);
  });

  it('deja aire solo cuando de verdad no hay equivalente', () => {
    // Con una versión tan vieja que ni la hierba existe, la de selva sigue la
    // cadena hasta tierra en vez de rendirse en el primer salto.
    const soloPiedra = (id: number) => id === PIEDRA || id === AIRE;
    expect(sustitutoTile(LADRILLO, soloPiedra)).toBe(PIEDRA);
    expect(sustitutoTile(HIERBA_JUNGLA, soloPiedra)).toBe(AIRE);
  });

  it('lo que ya existe no se toca', () => {
    expect(sustitutoTile(PIEDRA, () => true)).toBe(PIEDRA);
  });
});

describe('marcar lo que tocó el jugador', () => {
  it('detecta el bloque puesto, el roto y el líquido movido', () => {
    const a = new Mundo(4, 4);
    const b = new Mundo(4, 4);
    a.setTile(1, 1, PIEDRA);
    b.setTile(2, 2, MADERA);
    b.setLiquido(3, 3, 255);
    const marca = marcarTocado(b, a);
    expect(marca[1 * 4 + 1]).toBe(1);
    expect(marca[2 * 4 + 2]).toBe(1);
    expect(marca[3 * 4 + 3]).toBe(1);
    expect(marca[0]).toBe(0);
  });

  it('un mundo idéntico no tiene nada tocado', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: '3.0.0' });
    const copia = generarMundo({ ...TAM, semilla: SEMILLA, version: '3.0.0' }).mundo;
    expect(marcarTocado(mundo, copia).some((v) => v === 1)).toBe(false);
  });
});

describe('el margen alrededor de lo construido', () => {
  it('ensancha la marca en las dos direcciones', () => {
    const marca = new Uint8Array(9 * 9);
    marca[4 * 9 + 4] = 1;
    dilatar(marca, 9, 9, 2);
    // Un cuadrado de lado 5 centrado en el punto: 25 celdas.
    expect(marca.reduce((a, b) => a + b, 0)).toBe(25);
    expect(marca[4 * 9 + 6]).toBe(1);
    expect(marca[2 * 9 + 4]).toBe(1);
    expect(marca[4 * 9 + 7]).toBe(0);
  });

  it('con radio cero no hace nada', () => {
    const marca = new Uint8Array(9);
    marca[4] = 1;
    dilatar(marca, 9, 1, 0);
    expect(marca.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('no se sale por los bordes', () => {
    const marca = new Uint8Array(4 * 4);
    marca[0] = 1;
    dilatar(marca, 4, 4, 1);
    // Esquina: solo cuatro celdas caben.
    expect(marca.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe('bajar de versión', () => {
  it('la selva desaparece y lo construido se queda', () => {
    const gen = generarMundo({ ...TAM, semilla: SEMILLA, version: VERSION_ACTUAL });
    const mundo = gen.mundo;
    expect(mundo.tileId.includes(HIERBA_JUNGLA)).toBe(true);

    // Una casita de madera en el aire, que es algo que el generador nunca hace.
    for (let tx = 40; tx < 48; tx++) mundo.setTile(tx, 20, MADERA);

    const r = migrar(mundo, estadoDe(VERSION_ACTUAL), '2.1.0');
    expect(r.mundo.tileId.includes(HIERBA_JUNGLA)).toBe(false);
    for (let tx = 40; tx < 48; tx++) {
      expect(r.mundo.getTile(tx, 20)).toBe(MADERA);
    }
  });

  it('el ladrillo de una construcción pasa a piedra, no a aire', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: VERSION_ACTUAL });
    for (let tx = 60; tx < 66; tx++) mundo.setTile(tx, 25, LADRILLO);
    const r = migrar(mundo, estadoDe(VERSION_ACTUAL), '3.2.0');
    for (let tx = 60; tx < 66; tx++) {
      expect(r.mundo.getTile(tx, 25)).toBe(PIEDRA);
    }
  });

  it('los líquidos se van si la versión no los tenía', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: '3.0.0' });
    expect(mundo.liquido.some((l) => l > 0)).toBe(true);
    const r = migrar(mundo, estadoDe('3.0.0'), '2.0.0');
    expect(r.mundo.liquido.some((l) => l > 0)).toBe(false);
  });

  it('el zurrón pierde lo que aún no se había inventado', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: VERSION_ACTUAL });
    const estado = estadoDe(VERSION_ACTUAL, {
      inventario: [
        [MADERA_OBJ, 40],
        [ESPADA_GUARDIAN, 1],
        [SEMILLAS, 12],
      ],
    });
    const r = migrar(mundo, estado, '3.0.0');
    expect(r.estado.inventario).toEqual([[MADERA_OBJ, 40]]);
  });

  it('apaga el hardcore, la dificultad y los corazones de más', () => {
    const estado = estadoDe('4.0.0', {
      hardcore: true,
      hardcoreMuerto: true,
      dificultad: 8,
      vidaMax: 200,
      vida: 200,
      jefeVencido: true,
    });
    const r = migrarEstado(estado, '2.1.0', []);
    expect(r.hardcore).toBe(false);
    expect(r.hardcoreMuerto).toBe(false);
    expect(r.dificultad).toBe(DIFICULTAD_POR_DEFECTO);
    expect(r.vidaMax).toBe(VIDA_MAXIMA);
    expect(r.vida).toBe(VIDA_MAXIMA);
    expect(r.jefeVencido).toBe(false);
    expect(r.versionJuego).toBe('2.1.0');
  });
});

describe('subir de versión', () => {
  it('aparece lo que trae la versión nueva', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: '2.1.0' });
    expect(mundo.tileId.includes(HIERBA_JUNGLA)).toBe(false);
    const r = migrar(mundo, estadoDe('2.1.0'), VERSION_ACTUAL);
    expect(r.mundo.tileId.includes(HIERBA_JUNGLA)).toBe(true);
    expect(r.estado.estructuras.length).toBeGreaterThan(0);
    expect(r.estado.versionJuego).toBe(VERSION_ACTUAL);
  });

  it('lo construido sobrevive, con su suelo debajo', () => {
    const { mundo, spawnTx, spawnTy } = generarMundo({
      ...TAM,
      semilla: SEMILLA,
      version: '2.1.0',
    });
    // Una torre en el punto de aparición: es el sitio donde alguien construye.
    for (let d = 0; d < 6; d++) mundo.setTile(spawnTx, spawnTy - d, MADERA);
    const antesDebajo = mundo.getTile(spawnTx, spawnTy + 3);

    const r = migrar(mundo, estadoDe('2.1.0'), VERSION_ACTUAL);
    for (let d = 0; d < 6; d++) {
      expect(r.mundo.getTile(spawnTx, spawnTy - d)).toBe(MADERA);
    }
    // Y el terreno de alrededor no se ha movido bajo sus pies.
    expect(r.mundo.getTile(spawnTx, spawnTy + 3)).toBe(antesDebajo);
  });

  it('ida y vuelta deja el mundo como estaba donde no se tocó', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: '3.0.0' });
    const copia = generarMundo({ ...TAM, semilla: SEMILLA, version: '3.0.0' }).mundo;
    const subido = migrar(mundo, estadoDe('3.0.0'), VERSION_ACTUAL);
    const bajado = migrar(subido.mundo, subido.estado, '3.0.0');
    expect(bajado.mundo.tileId).toEqual(copia.tileId);
  });
});

describe('el plan que se enseña antes de aceptar', () => {
  it('cuenta los bloques que van a cambiar', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: VERSION_ACTUAL });
    const plan = planMigracion(mundo, estadoDe(VERSION_ACTUAL), '2.1.0');
    expect(plan.retrocede).toBe(true);
    expect(plan.bloques.length).toBeGreaterThan(0);
    // Ordenado de más a menos, para que lo importante salga primero.
    for (let i = 1; i < plan.bloques.length; i++) {
      expect(plan.bloques[i - 1]!.cuantos).toBeGreaterThanOrEqual(plan.bloques[i]!.cuantos);
    }
  });

  it('avisa aparte de lo que no es un bloque ni un objeto', () => {
    const { mundo, estructuras } = generarMundo({
      ...TAM,
      semilla: SEMILLA,
      version: VERSION_ACTUAL,
    });
    const estado = estadoDe(VERSION_ACTUAL, {
      hardcore: true,
      dificultad: 7,
      vidaMax: 180,
      estructuras,
    });
    const plan = planMigracion(mundo, estado, '2.1.0');
    const texto = plan.avisos.join(' ');
    expect(texto).toContain('hardcore');
    expect(texto).toContain('dificultad');
    expect(texto).toContain('fortaleza');
  });

  it('cuenta los objetos que se pierden, sumando zurrón y cofres', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: VERSION_ACTUAL });
    const estado = estadoDe(VERSION_ACTUAL, {
      inventario: [[SEMILLAS, 10]],
      cofres: [{ tx: 1, ty: 1, ranuras: [[SEMILLAS, 5]] }],
    });
    const plan = planMigracion(mundo, estado, '3.0.0');
    const semillas = plan.objetos.find((o) => o.nombre.includes('semillas'));
    expect(semillas?.cuantos).toBe(15);
  });

  it('subir a la versión actual no rompe nada', () => {
    const { mundo } = generarMundo({ ...TAM, semilla: SEMILLA, version: '2.1.0' });
    const plan = planMigracion(mundo, estadoDe('2.1.0'), VERSION_ACTUAL);
    expect(plan.retrocede).toBe(false);
    expect(plan.bloques).toEqual([]);
    expect(plan.objetos).toEqual([]);
  });
});

describe('a dónde se puede ir', () => {
  it('todas las que tuvieron mundo, menos la propia', () => {
    const destinos = destinosPosibles('3.0.0');
    expect(destinos.some((v) => v.id === '3.0.0')).toBe(false);
    // 6.0.0 incluida: un mundo clásico puede subir y llevarse el contenido
    // nuevo sin cambiar de altura, porque la altura va guardada con el mundo.
    expect(destinos.some((v) => v.id === VERSION_ACTUAL)).toBe(true);
    // Pero no las de antes de 1.3.0: entonces no había generación de mundo, y
    // migrar el tuyo a una de ellas no significa nada. Lo que hacía era darle
    // terreno con vetas y árboles, o sea justo lo que esa versión no tenía.
    expect(destinos.some((v) => v.id === '1.0.0')).toBe(false);
    expect(destinos.some((v) => v.id === '1.3.0')).toBe(true);
    const conMundo = VERSIONES.filter((v) => hay('mundoGenerado', v.id));
    expect(destinos.length).toBe(conMundo.length - 1);
  });
});

describe('fundir', () => {
  it('lo no tocado viene del destino y lo tocado se traduce', () => {
    const actual = new Mundo(4, 1);
    const destino = new Mundo(4, 1);
    actual.setTile(0, 0, LADRILLO);
    actual.setTile(1, 0, MADERA);
    destino.setTile(0, 0, PIEDRA);
    destino.setTile(1, 0, HIERBA);
    const tocado = new Uint8Array([1, 0, 0, 0]);

    fundir(actual, destino, tocado, '3.0.0');
    // El ladrillo estaba tocado: se traduce a piedra en vez de perderse.
    expect(actual.getTile(0, 0)).toBe(PIEDRA);
    // El de al lado no estaba tocado: es el del mundo de destino.
    expect(actual.getTile(1, 0)).toBe(HIERBA);
  });
});

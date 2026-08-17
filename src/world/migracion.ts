import { alMenos, indiceVersion, version, VERSIONES } from '../core/versiones';
import { DIFICULTAD_POR_DEFECTO } from '../core/dificultad';
import { defObjeto, filtrarObjeto, NADA, objetoExisteEn } from '../items/items';
import { VIDA_MAXIMA } from '../entities/salud';
import { defTile, sustitutoTile, versionTile } from './tiles';
import { generarMundoPasos, type Progreso } from './gen/worldgen';
import { Mundo } from './world';
import type { DatosCofre } from './contenedores';
import type { EstadoPartida } from './save';

/**
 * Cambiar un mundo de versión, hacia delante y hacia atrás.
 *
 * La idea es una sola y todo lo demás sale de ella: **lo que tú has tocado se
 * conserva; lo que nunca tocaste pasa a ser lo que habría sido en la versión de
 * destino**.
 *
 * Se consigue sin guardar ni un byte de más. El mundo es una función de la
 * semilla y la versión, así que se puede regenerar el mundo prístino de la
 * versión de origen y compararlo con el actual: lo que difiere es, exactamente,
 * lo que hizo quien juega. Después se genera el prístino de la versión de
 * destino y se le pegan encima esas diferencias. No hace falta un bit de "tile
 * tocado" —que además no existiría en las partidas ya guardadas— y el resultado
 * es exacto en vez de aproximado.
 *
 * Hay un detalle que no se puede resolver con un diff y por eso está aquí a
 * propósito: el terreno de alrededor. Si al subir de versión aparecen montañas
 * donde había una llanura, una casa construida en la llanura acabaría metida
 * dentro de una ladera. Minecraft evita esto conservando los trozos de mundo ya
 * generados, con el precio de que se ven las costuras. Aquí se conserva un
 * margen de terreno alrededor de todo lo tocado: la casa mantiene el suelo que
 * pisaba, y el resto del mundo sí cambia.
 *
 * Y lo que no cabe en la versión de destino, se va. Un mundo que retrocede por
 * debajo de 3.1.0 pierde la selva —la hierba de selva vuelve a ser hierba, el
 * barro tierra y los troncos de ceiba troncos normales—, los objetos que aún no
 * se habían inventado desaparecen del zurrón y de los cofres, y la fortaleza
 * deja de ser fortaleza. Es lo que pasa al abrir un mundo con una versión vieja
 * de cualquier juego, y es mejor decirlo antes que descubrirlo después: por eso
 * `planMigracion` calcula el estropicio para poder enseñarlo y que se confirme.
 */

/** Tiles de margen que se conservan alrededor de lo tocado. */
export const MARGEN_TOCADO = 6;

export interface CambioBloque {
  /** Nombre del tile que desaparece. */
  nombre: string;
  /** Nombre en el que se convierte, o "nada" si se queda en aire. */
  enQue: string;
  /** Cuántos hay en el mundo. */
  cuantos: number;
}

export interface PlanMigracion {
  readonly desde: string;
  readonly hasta: string;
  /** Hacia atrás en el tiempo. */
  readonly retrocede: boolean;
  /** Bloques que se convierten en otra cosa, de más a menos numerosos. */
  readonly bloques: readonly CambioBloque[];
  /** Objetos que se pierden del zurrón, del equipo y de los cofres. */
  readonly objetos: readonly { nombre: string; cuantos: number }[];
  /** Avisos sueltos: hardcore que se apaga, dificultad que se olvida… */
  readonly avisos: readonly string[];
}

/**
 * Qué pasaría al llevar este mundo a esa versión.
 *
 * Se calcula sobre el mundo de verdad y no sobre una estimación: la lista dice
 * "1.284 bloques de hierba de selva pasarán a hierba", no "puede que pierdas
 * cosas". Un aviso que no dice cuánto no sirve para decidir.
 */
export function planMigracion(
  mundo: Mundo,
  estado: EstadoPartida,
  hasta: string,
): PlanMigracion {
  const desde = estado.versionJuego;
  const existeTile = (id: number): boolean => alMenos(hasta, versionTile(id));

  const cuenta = new Map<number, number>();
  for (const capa of [mundo.tileId, mundo.wallId]) {
    for (let i = 0; i < capa.length; i++) {
      const id = capa[i]!;
      if (id === 0 || existeTile(id)) continue;
      cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
    }
  }
  const bloques: CambioBloque[] = [...cuenta.entries()]
    .map(([id, cuantos]) => {
      const nuevo = sustitutoTile(id, existeTile);
      return {
        nombre: defTile(id).nombre,
        enQue: nuevo === 0 ? 'nada' : defTile(nuevo).nombre,
        cuantos,
      };
    })
    .sort((a, b) => b.cuantos - a.cuantos);

  const perdidos = new Map<number, number>();
  const apuntar = (objeto: number, cantidad: number): void => {
    if (objeto === NADA || cantidad <= 0 || objetoExisteEn(objeto, hasta)) return;
    perdidos.set(objeto, (perdidos.get(objeto) ?? 0) + cantidad);
  };
  for (const [objeto, cantidad] of estado.inventario) apuntar(objeto, cantidad);
  for (const [objeto, cantidad] of estado.equipo) apuntar(objeto, cantidad);
  for (const c of estado.cofres) {
    for (const [objeto, cantidad] of c.ranuras) apuntar(objeto, cantidad);
  }
  const objetos = [...perdidos.entries()]
    .map(([id, cuantos]) => ({ nombre: defObjeto(id).nombre, cuantos }))
    .sort((a, b) => b.cuantos - a.cuantos);

  const avisos: string[] = [];
  if (estado.hardcore && !alMenos(hasta, '3.2.0')) {
    avisos.push('El modo hardcore se apaga: en esa versión no existía.');
  }
  if (estado.dificultad !== DIFICULTAD_POR_DEFECTO && !alMenos(hasta, '3.0.0')) {
    avisos.push('La dificultad vuelve a normal: no había niveles todavía.');
  }
  if (estado.vidaMax > VIDA_MAXIMA && !alMenos(hasta, '3.0.0')) {
    avisos.push(`La vida máxima vuelve a ${VIDA_MAXIMA}: no había cristales de vida.`);
  }
  if (estado.estructuras.length > 0 && !alMenos(hasta, '4.0.0')) {
    avisos.push('La fortaleza deja de estar apuntada y su ladrillo pasa a piedra.');
  }
  if (!alMenos(hasta, '2.1.0')) {
    avisos.push('El agua y la lava desaparecen: los líquidos son de 2.1.0.');
  }
  if (!alMenos(desde, hasta) && alMenos(hasta, desde)) {
    avisos.push('Lo que nunca tocaste se rehace con la generación de la versión nueva.');
  }

  return {
    desde,
    hasta,
    retrocede: !alMenos(hasta, desde),
    bloques,
    objetos,
    avisos,
  };
}

export interface ResultadoMigracion {
  mundo: Mundo;
  estado: EstadoPartida;
}

/**
 * Lleva el mundo a otra versión, cediendo el control entre pasos.
 *
 * Es un generador por lo mismo que lo es la generación de mundo: por dentro
 * genera dos mundos enteros, y sin ceder el hilo la pantalla se quedaría
 * congelada un segundo largo sin explicar por qué.
 */
export function* migrarPasos(
  mundo: Mundo,
  estado: EstadoPartida,
  hasta: string,
  tamano: { ancho: number; alto: number },
): Generator<Progreso, ResultadoMigracion, void> {
  const desde = estado.versionJuego;
  const semilla = estado.semilla;
  // La profundidad viene del mundo, no de ninguna de las dos versiones: las
  // dos reconstrucciones tienen que usar el mismo reparto de capas o el diff
  // compararía dos mundos que no se parecen en nada.
  const hondo = estado.mundoHondo;

  yield { pct: 5, texto: `Reconstruyendo el mundo de ${desde}…` };
  const original = yield* generarMundoPasos({ ...tamano, semilla, version: desde, hondo });

  yield { pct: 45, texto: `Generando el mundo de ${hasta}…` };
  const destino = yield* generarMundoPasos({ ...tamano, semilla, version: hasta, hondo });

  yield { pct: 85, texto: 'Devolviendo lo que construiste…' };
  const tocado = marcarTocado(mundo, original.mundo);
  dilatar(tocado, mundo.ancho, mundo.alto, MARGEN_TOCADO);
  fundir(mundo, destino.mundo, tocado, hasta);

  yield { pct: 95, texto: 'Revisando el zurrón…' };
  const nuevo = migrarEstado(estado, hasta, destino.estructuras);

  yield { pct: 100, texto: 'Listo' };
  return { mundo, estado: nuevo };
}

/**
 * Marca los tiles que difieren del mundo prístino: eso es lo que hizo quien
 * juega. Se mira el bloque, la pared y el líquido, porque llenar un hoyo de
 * agua también es haber tocado el mundo.
 */
export function marcarTocado(actual: Mundo, original: Mundo): Uint8Array {
  const n = actual.tileId.length;
  const marca = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (
      actual.tileId[i] !== original.tileId[i] ||
      actual.wallId[i] !== original.wallId[i] ||
      actual.liquido[i] !== original.liquido[i]
    ) {
      marca[i] = 1;
    }
  }
  return marca;
}

/**
 * Ensancha la marca unos cuantos tiles.
 *
 * Es lo que salva a una casa de quedarse dentro de una montaña que antes no
 * estaba: no basta con conservar los bloques que alguien puso, hay que
 * conservar el suelo que pisaban. Se hace en dos pasadas separables —primero
 * en horizontal y luego en vertical— porque un cuadrado es la composición de
 * dos líneas y así el coste es lineal en vez de cuadrático en el margen.
 */
export function dilatar(marca: Uint8Array, ancho: number, alto: number, radio: number): void {
  if (radio <= 0) return;
  const copia = new Uint8Array(marca);
  // Horizontal.
  for (let y = 0; y < alto; y++) {
    const fila = y * ancho;
    let ultima = -radio - 1;
    for (let x = 0; x < ancho; x++) {
      if (copia[fila + x] === 1) ultima = x;
      if (x - ultima <= radio) marca[fila + x] = 1;
    }
    ultima = ancho + radio + 1;
    for (let x = ancho - 1; x >= 0; x--) {
      if (copia[fila + x] === 1) ultima = x;
      if (ultima - x <= radio) marca[fila + x] = 1;
    }
  }
  // Vertical, sobre el resultado horizontal.
  const tras = new Uint8Array(marca);
  for (let x = 0; x < ancho; x++) {
    let ultima = -radio - 1;
    for (let y = 0; y < alto; y++) {
      if (tras[y * ancho + x] === 1) ultima = y;
      if (y - ultima <= radio) marca[y * ancho + x] = 1;
    }
    ultima = alto + radio + 1;
    for (let y = alto - 1; y >= 0; y--) {
      if (tras[y * ancho + x] === 1) ultima = y;
      if (ultima - y <= radio) marca[y * ancho + x] = 1;
    }
  }
}

/**
 * Mezcla el mundo de destino con lo tocado, y traduce lo que ya no existe.
 *
 * Lo tocado se traduce igual que lo demás: una casa de ladrillo en un mundo que
 * vuelve a 3.0.0 se convierte en una casa de piedra. Conservarla en ladrillo
 * sería dejar en el mundo un bloque que esa versión no sabe ni dibujar.
 */
export function fundir(
  mundo: Mundo,
  destino: Mundo,
  tocado: Uint8Array,
  hasta: string,
): void {
  const existeTile = (id: number): boolean => alMenos(hasta, versionTile(id));
  const traducidos = new Map<number, number>();
  const traducir = (id: number): number => {
    if (id === 0 || existeTile(id)) return id;
    let t = traducidos.get(id);
    if (t === undefined) {
      t = sustitutoTile(id, existeTile);
      traducidos.set(id, t);
    }
    return t;
  };
  const conLiquidos = alMenos(hasta, '2.1.0');

  for (let i = 0; i < mundo.tileId.length; i++) {
    if (tocado[i] === 1) {
      mundo.tileId[i] = traducir(mundo.tileId[i]!);
      mundo.wallId[i] = traducir(mundo.wallId[i]!);
      if (!conLiquidos) {
        mundo.liquido[i] = 0;
        mundo.flags[i] = mundo.flags[i]! & ~Mundo.BIT_LAVA;
      }
      continue;
    }
    mundo.tileId[i] = destino.tileId[i]!;
    mundo.wallId[i] = destino.wallId[i]!;
    mundo.liquido[i] = destino.liquido[i]!;
    mundo.flags[i] = destino.flags[i]!;
  }
}

/** Deja el estado de la partida en condiciones para la versión de destino. */
export function migrarEstado(
  estado: EstadoPartida,
  hasta: string,
  estructuras: EstadoPartida['estructuras'],
): EstadoPartida {
  const limpiar = (
    ranuras: readonly (readonly [number, number])[],
  ): [number, number][] =>
    ranuras
      .filter(([objeto]) => filtrarObjeto(objeto, hasta) !== NADA)
      .map(([objeto, cantidad]) => [objeto, cantidad] as [number, number]);

  const cofres: DatosCofre[] = estado.cofres.map((c) => ({
    tx: c.tx,
    ty: c.ty,
    ranuras: limpiar(c.ranuras),
  }));

  return {
    ...estado,
    versionJuego: hasta,
    inventario: limpiar(estado.inventario),
    equipo: limpiar(estado.equipo),
    cofres,
    // La fortaleza del mundo de destino, que puede no existir o estar en otro
    // sitio: la lista vieja apuntaría a un montón de piedra.
    estructuras: alMenos(hasta, '4.0.0') ? estructuras : [],
    jefeVencido: alMenos(hasta, '4.0.0') ? estado.jefeVencido : false,
    hardcore: alMenos(hasta, '3.2.0') ? estado.hardcore : false,
    hardcoreMuerto: alMenos(hasta, '3.2.0') ? estado.hardcoreMuerto : false,
    dificultad: alMenos(hasta, '3.0.0') ? estado.dificultad : DIFICULTAD_POR_DEFECTO,
    vidaMax: alMenos(hasta, '3.0.0') ? estado.vidaMax : VIDA_MAXIMA,
    vida: Math.min(
      estado.vida,
      alMenos(hasta, '3.0.0') ? estado.vidaMax : VIDA_MAXIMA,
    ),
  };
}

/** Versiones a las que se puede llevar un mundo: todas menos la suya. */
export function destinosPosibles(desde: string): typeof VERSIONES {
  const i = indiceVersion(desde);
  // Todas menos la suya, en los dos sentidos. La profundidad no limita nada:
  // un mundo clásico puede subir a 6.0.0 y llevarse el contenido nuevo
  // conservando su reparto de capas, porque el reparto va guardado con el
  // mundo y no se deduce de la versión.
  return VERSIONES.filter((v) => indiceVersion(v.id) !== i);
}

/** Una frase corta que resume el salto, para el botón. */
export function resumenSalto(desde: string, hasta: string): string {
  const a = version(desde);
  const b = version(hasta);
  return alMenos(hasta, desde)
    ? `Subir de ${a.id} a ${b.id}`
    : `Bajar de ${a.id} a ${b.id}`;
}

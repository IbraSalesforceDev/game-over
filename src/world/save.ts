import { DIFICULTAD_POR_DEFECTO } from '../core/dificultad';
import { migrarBase, migrarId } from '../items/items';
import type { DatosCofre } from './contenedores';
import type { Estructura, TipoEstructura } from './estructuras';

/**
 * Con qué versión se abre un mundo que no la lleva apuntada.
 *
 * Es la última que hubo antes de que la versión se pudiera elegir: cualquier
 * mundo guardado con el formato 12 o anterior se creó con todo el contenido de
 * entonces, así que abrirlo como más antiguo le quitaría cosas que sí tiene
 * enterradas.
 */
export const VERSION_ANTES_DE_ELEGIR = '4.1.0';
import { Mundo } from './world';
import { Escritor, Lector } from '../core/bytes';

/**
 * Serialización del mundo.
 *
 * El formato lleva número de versión desde el primer día: en cuanto una fase
 * futura añada una capa (líquidos, luz, cofres), los mundos guardados con la
 * versión anterior tienen que seguir abriéndose o cargárselos en cada
 * despliegue. `VERSION_FORMATO` sube y `deserializar` decide qué hacer.
 *
 * Las capas se guardan con RLE. Un mundo es enormemente repetitivo —miles de
 * tiles de piedra seguidos— así que el RLE lo deja en una fracción, y el
 * deflate posterior remata el trabajo.
 */

/**
 * Lo único que la serialización necesita de un mundo: sus cuatro capas y su
 * tamaño.
 *
 * No pide un `Mundo` a propósito. Un `Mundo` es una clase con métodos, y las
 * clases no cruzan la frontera de un worker: `postMessage` clona los datos y
 * deja los métodos por el camino. Pidiendo solo esto, la misma función sirve
 * para el hilo principal y para el worker que empaqueta de fondo, y `Mundo`
 * encaja sin convertir nada porque tiene estos cuatro campos públicos.
 */
export interface CapasMundo {
  readonly ancho: number;
  readonly alto: number;
  readonly tileId: Uint16Array;
  readonly wallId: Uint16Array;
  readonly flags: Uint8Array;
  readonly liquido: Uint8Array;
}

export const MAGIA = 0x474f5652; // 'GOVR'
/**
 * Historial del formato:
 *   1 — mundo, paredes y estado del jugador.
 *   2 — se añade la hora del mundo (fase 5). Los mundos de la versión 1 se
 *       abren igual y amanecen a las 8:00.
 *   3 — se añade el inventario (fase 6). Los mundos anteriores se abren con
 *       el equipo inicial.
 *   5 — se añade la vida del jugador (fase 8). Los mundos anteriores se
 *       abren con la vida al máximo.
 *   4 — se añaden los cofres (fase 7) y las herramientas se mudan al rango de
 *       ids 64+. Los inventarios del formato 3 se remapean al leerlos: sin
 *       eso, el pico de cobre de una partida antigua se convertiría en un
 *       horno al añadirse los muebles nuevos.
 *   6 — se añade la capa de líquidos (fase 9). Los mundos anteriores se abren
 *       secos, que es exactamente como estaban.
 *   7 — se añade el hambre. Los mundos anteriores se abren con el estómago
 *       lleno, que es lo justo: se guardaron en un juego donde no existía.
 *   8 — se añade la dificultad del mundo. Los mundos anteriores se abren en
 *       normal, que es la dificultad con la que se jugaron.
 *   9 — se añade la vida máxima, que ya no es fija: los cristales de vida la
 *       suben. Los mundos anteriores se abren con los cinco corazones de
 *       siempre.
 *  10 — se añade la armadura puesta. Los mundos anteriores se abren desnudos,
 *       que es como se guardaron.
 *  11 — se añade el modo hardcore y si ya se ha muerto en él. Los mundos
 *       anteriores se abren en modo normal, con sus muertes ya perdonadas.
 *  12 — se añaden las estructuras del mundo y si ya se venció al jefe. Los
 *       mundos anteriores se abren sin ninguna estructura apuntada, que es la
 *       verdad: se generaron en un juego donde la fortaleza no existía, así
 *       que tampoco está enterrada esperando a que la brújula la encuentre.
 *  13 — se añade la versión del juego con la que se creó el mundo. Los mundos
 *       anteriores se abren como 4.1.0, que es la última que hubo antes de que
 *       se pudiera elegir: es la única respuesta correcta, porque se crearon
 *       con todo lo que había entonces.
 *
 * Ojo con no confundir los dos números. Este `VERSION_FORMATO` describe cómo
 * está escrito el fichero; la versión del juego describe con qué reglas se
 * generó el mundo. Suben por separado y por motivos distintos: un arreglo del
 * empaquetado sube el formato sin tocar el juego, y una tanda de contenido
 * sube el juego sin tocar el formato.
 */
export const VERSION_FORMATO = 16;

export interface EstadoJugador {
  x: number;
  y: number;
  spawnX: number;
  spawnY: number;
}

export interface EstadoPartida {
  semilla: string;
  jugador: EstadoJugador;
  /** Marca de tiempo de creación del mundo. */
  creado: number;
  /** Milisegundos jugados en total. */
  jugado: number;
  /** Material y capa seleccionados, para no perder el contexto al volver. */
  material: number;
  capaPared: boolean;
  /** Minuto del día en el que se dejó el mundo (formato 2 en adelante). */
  minutos: number;
  /** Ranuras del inventario como pares (objeto, cantidad); formato 3. */
  inventario: readonly (readonly [number, number])[];
  /** Las tres ranuras de armadura puesta; formato 10. */
  equipo: readonly (readonly [number, number])[];
  /** Contenido de los cofres del mundo; formato 4. */
  cofres: readonly DatosCofre[];
  /** Vida del jugador; formato 5. 0 significa "al máximo". */
  vida: number;
  /** Techo de vida del jugador; formato 9. 0 significa "el de siempre". */
  vidaMax: number;
  /** Hambre del jugador; formato 7. 0 significa "al máximo". */
  hambre: number;
  /**
   * Dificultad del mundo; formato 8. Se elige al crearlo y no se toca después:
   * poder subirla y bajarla a mitad de partida vaciaría de sentido elegirla.
   */
  dificultad: number;
  /** El mundo se creó en hardcore; formato 11. */
  hardcore: boolean;
  /** Ya se ha muerto en hardcore: el mundo queda cerrado; formato 11. */
  hardcoreMuerto: boolean;
  /**
   * Estructuras que levantó el generador; formato 12.
   *
   * Se guardan porque no se pueden deducir: el mundo se edita tile a tile, y
   * salir a buscar rectángulos de ladrillo cada vez que se abre una partida
   * sería recorrer un millón de tiles para recuperar tres coordenadas.
   */
  estructuras: readonly Estructura[];
  /** Ya se ha vencido al guardián al menos una vez; formato 12. */
  jefeVencido: boolean;
  /** El guardián verdadero ha caído en este mundo; formato 16. */
  finalVencido: boolean;
  /**
   * Versión del juego con la que se creó el mundo; formato 13.
   *
   * No cambia nunca: es lo que decide qué existe en esta partida. Actualizar
   * un mundo a una versión más nueva es otro asunto y todavía no se hace.
   */
  versionJuego: string;
  /**
   * El mundo se creó con el reparto de capas hondo de 6.0.0; formato 14.
   *
   * Es propiedad del mundo y no de su versión, igual que el ancho. Un mundo
   * nace con una altura y ya no crece nunca: si esto se dedujera de
   * `versionJuego`, actualizar un mundo clásico a 6.0.0 le movería el nivel del
   * mar cincuenta y cinco filas hacia arriba sobre unos tiles que no se han
   * movido, y todo lo que el jugador hubiera construido quedaría enterrado o
   * colgando. Guardándolo aparte, un mundo viejo puede subir a 6.0.0 y llevarse
   * el contenido nuevo —minerales, bichos, flechas— conservando su reparto.
   */
  mundoHondo: boolean;
}

/** Hora a la que amanecen los mundos guardados antes de que existiera el reloj. */
export const HORA_POR_DEFECTO = 8 * 60;

export interface Partida {
  mundo: Mundo;
  estado: EstadoPartida;
}

// --- Escritura y lectura de bytes --------------------------------------------

// --- RLE ---------------------------------------------------------------------

/** Escribe una capa como pares (valor, repeticiones). */
function escribirRle(e: Escritor, capa: Uint16Array): void {
  // Reservamos el hueco del contador y lo rellenamos al final: no sabemos
  // cuántas tiradas habrá hasta haberlas escrito.
  const tiradas: number[] = [];
  let valor = capa[0] ?? 0;
  let largo = 0;
  for (let i = 0; i < capa.length; i++) {
    const v = capa[i]!;
    if (v === valor && largo < 0xffffffff) {
      largo++;
    } else {
      tiradas.push(valor, largo);
      valor = v;
      largo = 1;
    }
  }
  if (largo > 0) tiradas.push(valor, largo);

  e.u32(tiradas.length / 2);
  for (let i = 0; i < tiradas.length; i += 2) {
    e.u16(tiradas[i]!);
    e.u32(tiradas[i + 1]!);
  }
}

function leerRle(l: Lector, capa: Uint16Array): void {
  const tiradas = l.u32();
  let pos = 0;
  for (let i = 0; i < tiradas; i++) {
    const valor = l.u16();
    const largo = l.u32();
    if (pos + largo > capa.length) {
      throw new Error('Datos de mundo corruptos: una tirada se sale de la capa');
    }
    capa.fill(valor, pos, pos + largo);
    pos += largo;
  }
  if (pos !== capa.length) {
    throw new Error(
      `Datos de mundo corruptos: se esperaban ${capa.length} tiles y hay ${pos}`,
    );
  }
}

// --- Cuerpo ------------------------------------------------------------------

/** Serializa mundo y estado sin comprimir. */
export function serializar(mundo: CapasMundo, estado: EstadoPartida): Uint8Array {
  const e = new Escritor();
  e.u32(mundo.ancho);
  e.u32(mundo.alto);
  e.texto(estado.semilla);
  e.f64(estado.creado);
  e.f64(estado.jugado);
  e.f64(estado.jugador.x);
  e.f64(estado.jugador.y);
  e.f64(estado.jugador.spawnX);
  e.f64(estado.jugador.spawnY);
  e.u8(estado.material);
  e.u8(estado.capaPared ? 1 : 0);
  e.u16(Math.round(estado.minutos) % 1440); // formato 2
  // Formato 3: el inventario. Va antes del RLE para que leerlo no obligue a
  // recorrer el mundo entero.
  e.u16(estado.inventario.length);
  for (const [objeto, cantidad] of estado.inventario) {
    e.u16(objeto);
    e.u16(Math.min(65535, cantidad));
  }
  // Formato 4: los cofres. Son pocos y dispersos, así que van como lista.
  e.u16(estado.cofres.length);
  for (const cofre of estado.cofres) {
    e.u32(cofre.tx);
    e.u32(cofre.ty);
    e.u16(cofre.ranuras.length);
    for (const [objeto, cantidad] of cofre.ranuras) {
      e.u16(objeto);
      e.u16(Math.min(65535, cantidad));
    }
  }
  e.u16(Math.max(0, Math.round(estado.vida))); // formato 5
  e.u16(Math.max(0, Math.round(estado.hambre))); // formato 7
  e.u8(Math.max(0, Math.min(255, Math.round(estado.dificultad)))); // formato 8
  e.u16(Math.max(0, Math.round(estado.vidaMax))); // formato 9
  // Formato 10: la armadura. Va con su longitud por delante, igual que el
  // inventario, para poder añadir un cuarto hueco sin subir de versión.
  e.u16(estado.equipo.length);
  for (const [objeto, cantidad] of estado.equipo) {
    e.u16(objeto);
    e.u16(Math.min(65535, cantidad));
  }
  // Formato 11: hardcore y si ya se ha muerto en él, en un solo byte de bits.
  // Va el último a propósito: cada campo nuevo se añade al final para que un
  // lector de una versión anterior encuentre todo lo suyo donde lo espera, y
  // meterlo en medio rompería esa propiedad para todos los campos posteriores.
  e.u8((estado.hardcore ? 1 : 0) | (estado.hardcoreMuerto ? 2 : 0));
  // Formato 12: las estructuras y si el jefe ya cayó. Al final, por lo mismo.
  e.u16(estado.estructuras.length);
  for (const s of estado.estructuras) {
    e.u8(s.tipo);
    e.u32(Math.max(0, Math.round(s.tx)));
    e.u32(Math.max(0, Math.round(s.ty)));
  }
  e.u8(estado.jefeVencido ? 1 : 0);
  // Formato 13: la versión del juego. Al final del cuerpo, como todo lo nuevo.
  e.texto(estado.versionJuego);
  // Formato 14: si el mundo nació hondo.
  e.u8(estado.mundoHondo ? 1 : 0);
  // formato 16: el final. Va al final del cuerpo, como todo lo que se añade,
  // para que un guardado viejo se lea igual sin tocar nada de lo anterior.
  e.u8(estado.finalVencido ? 1 : 0);
  escribirRle(e, mundo.tileId);
  escribirRle(e, mundo.wallId);
  escribirRle(e, capaLiquido(mundo)); // formato 6
  return e.terminar();
}

/**
 * Empaqueta nivel y tipo de líquido en una sola capa de 16 bits: el nivel en el
 * byte bajo y el bit de lava en el 256. Así el líquido cabe en una única tirada
 * de RLE —y un mundo seco entero se guarda en una— en vez de en dos capas que
 * habría que mantener sincronizadas al leer.
 */
function capaLiquido(mundo: CapasMundo): Uint16Array {
  const capa = new Uint16Array(mundo.liquido.length);
  for (let i = 0; i < capa.length; i++) {
    const nivel = mundo.liquido[i]!;
    if (nivel === 0) continue;
    capa[i] = nivel | ((mundo.flags[i]! & Mundo.BIT_LAVA) !== 0 ? 256 : 0);
  }
  return capa;
}

export function deserializar(datos: Uint8Array, version = VERSION_FORMATO): Partida {
  const l = new Lector(datos);
  const ancho = l.u32();
  const alto = l.u32();
  if (ancho <= 0 || alto <= 0 || ancho > 20000 || alto > 20000) {
    throw new Error(`Dimensiones de mundo imposibles: ${ancho}x${alto}`);
  }
  const estado: {
    -readonly [K in keyof EstadoPartida]: EstadoPartida[K];
  } = {
    semilla: l.texto(),
    creado: l.f64(),
    jugado: l.f64(),
    jugador: { x: l.f64(), y: l.f64(), spawnX: l.f64(), spawnY: l.f64() },
    material: l.u8(),
    capaPared: l.u8() === 1,
    // El campo de la hora no existe en el formato 1: esos mundos amanecen.
    minutos: version >= 2 ? l.u16() : HORA_POR_DEFECTO,
    inventario: [],
    equipo: [],
    cofres: [],
    vida: 0,
    vidaMax: 0,
    hambre: 0,
    dificultad: DIFICULTAD_POR_DEFECTO,
    hardcore: false,
    hardcoreMuerto: false,
    estructuras: [],
    jefeVencido: false,
    // Un mundo sin versión apuntada es de antes de que se pudieran elegir, así
    // que se creó con todo lo que había: la última anterior a este formato.
    versionJuego: VERSION_ANTES_DE_ELEGIR,
    // Todo lo anterior al formato 14 es de antes de que existieran los mundos
    // hondos, así que es clásico por definición.
    mundoHondo: false,
    finalVencido: false,
  };
  /**
   * Traduce un id de objeto guardado a los ids de hoy.
   *
   * Son dos mudanzas distintas y el orden entre ellas importa. Antes del formato
   * 4 las herramientas ocupaban ids del rango de tiles —13, 14 y 15—, y antes
   * del 15 todo lo que no es un bloque vivía a partir del 64 en vez del 128. La
   * de la frontera va primero justo porque aquellos tres ids caen por debajo de
   * 64: la tabla de ids antiguos ya apunta a los valores de hoy, así que si se
   * aplicara al revés se les sumaría el desplazamiento dos veces.
   */
  const objeto = (id: number): number => {
    const base = version < 15 ? migrarBase(id) : id;
    return version < 4 ? migrarId(base) : base;
  };

  if (version >= 3) {
    const n = l.u16();
    const ranuras: [number, number][] = [];
    for (let i = 0; i < n; i++) ranuras.push([objeto(l.u16()), l.u16()]);
    estado.inventario = ranuras;
  }
  if (version >= 4) {
    const cuantos = l.u16();
    const cofres: DatosCofre[] = [];
    for (let c = 0; c < cuantos; c++) {
      const tx = l.u32();
      const ty = l.u32();
      const n = l.u16();
      const ranuras: [number, number][] = [];
      for (let i = 0; i < n; i++) ranuras.push([objeto(l.u16()), l.u16()]);
      cofres.push({ tx, ty, ranuras });
    }
    estado.cofres = cofres;
  }
  if (version >= 5) estado.vida = l.u16();
  if (version >= 7) estado.hambre = l.u16();
  if (version >= 8) estado.dificultad = l.u8();
  if (version >= 9) estado.vidaMax = l.u16();
  if (version >= 10) {
    const n = l.u16();
    const ranuras: [number, number][] = [];
    for (let i = 0; i < n; i++) ranuras.push([objeto(l.u16()), l.u16()]);
    estado.equipo = ranuras;
  }
  if (version >= 11) {
    const bits = l.u8();
    estado.hardcore = (bits & 1) !== 0;
    estado.hardcoreMuerto = (bits & 2) !== 0;
  }
  if (version >= 12) {
    const cuantas = l.u16();
    const lista: Estructura[] = [];
    for (let i = 0; i < cuantas; i++) {
      lista.push({ tipo: l.u8() as TipoEstructura, tx: l.u32(), ty: l.u32() });
    }
    estado.estructuras = lista;
    estado.jefeVencido = l.u8() === 1;
  }
  if (version >= 13) estado.versionJuego = l.texto();
  if (version >= 14) estado.mundoHondo = l.u8() === 1;
  if (version >= 16) estado.finalVencido = l.u8() === 1;
  const mundo = new Mundo(ancho, alto);
  leerRle(l, mundo.tileId);
  leerRle(l, mundo.wallId);
  if (version >= 6) {
    const capa = new Uint16Array(mundo.liquido.length);
    leerRle(l, capa);
    for (let i = 0; i < capa.length; i++) {
      const v = capa[i]!;
      if (v === 0) continue;
      mundo.liquido[i] = v & 255;
      if ((v & 256) !== 0) mundo.flags[i] = mundo.flags[i]! | Mundo.BIT_LAVA;
    }
  }
  return { mundo, estado };
}

// --- Empaquetado (cabecera + compresión) -------------------------------------

const CRUDO = 0;
const DEFLATE = 1;

function hayCompresion(): boolean {
  return typeof CompressionStream !== 'undefined';
}

async function comprimir(datos: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function descomprimir(datos: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

/**
 * Cabecera + cuerpo comprimido. La cabecera va siempre en claro para poder
 * comprobar la magia y la versión sin descomprimir nada.
 */
export async function empaquetar(
  mundo: CapasMundo,
  estado: EstadoPartida,
): Promise<Uint8Array> {
  const cuerpo = serializar(mundo, estado);
  const comprime = hayCompresion();
  const carga = comprime ? await comprimir(cuerpo) : cuerpo;

  const salida = new Uint8Array(8 + carga.length);
  const vista = new DataView(salida.buffer);
  vista.setUint32(0, MAGIA);
  vista.setUint16(4, VERSION_FORMATO);
  vista.setUint8(6, comprime ? DEFLATE : CRUDO);
  vista.setUint8(7, 0);
  salida.set(carga, 8);
  return salida;
}

export async function desempaquetar(datos: Uint8Array): Promise<Partida> {
  if (datos.length < 8) throw new Error('Fichero de partida vacío o truncado');
  const vista = new DataView(datos.buffer, datos.byteOffset, datos.byteLength);
  if (vista.getUint32(0) !== MAGIA) {
    throw new Error('Esto no es un mundo de Game Over');
  }
  const version = vista.getUint16(4);
  if (version > VERSION_FORMATO) {
    throw new Error(
      `El mundo es de una versión más nueva (${version}) que este juego (${VERSION_FORMATO})`,
    );
  }
  const compresion = vista.getUint8(6);
  const carga = datos.subarray(8);
  const cuerpo =
    compresion === DEFLATE ? await descomprimir(carga) : carga.slice();
  return deserializar(cuerpo, version);
}

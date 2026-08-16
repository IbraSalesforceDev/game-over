/**
 * Catálogo de tiles. Tabla plana indexada por id: el acceso ocurre miles de
 * veces por frame, así que nada de Map ni de búsquedas por nombre.
 */

export const AIRE = 0;
export const TIERRA = 1;
export const HIERBA = 2;
export const PIEDRA = 3;
export const MADERA = 4;
export const PLATAFORMA = 5;
export const COBRE = 6;
export const HIERRO = 7;
export const PLATA = 8;
export const ORO = 9;
export const TRONCO = 10;
export const HOJAS = 11;
export const ANTORCHA = 12;
export const MESA = 13;
export const HORNO = 14;
export const YUNQUE = 15;
export const COFRE = 16;
// Biomas (fase 9).
export const ARENA = 17;
export const ARENISCA = 18;
export const CACTUS = 19;
export const NIEVE = 20;
export const HIELO = 21;
export const CRISTAL_VIDA = 22;
export const TIERRA_LABRADA = 23;
export const CANA = 24;
// Bloque 3: selva, taiga, un segundo árbol de bosque y grava.
export const BARRO = 25;
export const HIERBA_JUNGLA = 26;
export const TRONCO_JUNGLA = 27;
export const HOJAS_JUNGLA = 28;
export const TRONCO_ABEDUL = 29;
export const HOJAS_PINO = 30;
export const GRAVA = 31;
export const OBSIDIANA = 32;
export const VIDRIO = 33;

/** Tiles que habilitan recetas cuando el jugador está cerca. */
export const ESTACIONES = [MESA, HORNO, YUNQUE] as const;

/** Minerales, de menos a más profundo. */
export const MINERALES = [COBRE, HIERRO, PLATA, ORO] as const;

/** Suelos de superficie de cada bioma; se usan para vestir el terreno. */
export const SUELOS_BIOMA = [HIERBA, ARENA, NIEVE, HIERBA_JUNGLA] as const;

/** Todo lo que es tronco, de cualquier árbol. */
export const TRONCOS = [TRONCO, TRONCO_JUNGLA, TRONCO_ABEDUL] as const;
/** Todo lo que es copa, de cualquier árbol. */
export const COPAS = [HOJAS, HOJAS_JUNGLA, HOJAS_PINO] as const;

export interface DefTile {
  readonly nombre: string;
  /** Bloquea el paso en ambos ejes. */
  readonly solido: boolean;
  /** Plataforma de una dirección: solo frena al caer sobre ella. */
  readonly plataforma: boolean;
  /** Ticks base de picado; lo usará la fase 2. */
  readonly dureza: number;
  /** Color base; el tileset procedural genera variantes a partir de él. */
  readonly color: string;
  /** Luz que emite el tile, en la escala 0-255. 0 = no ilumina. */
  readonly luz?: number;
  /**
   * Cuánto agarra el suelo, como factor sobre la fricción normal.
   *
   * 1 es tierra. La arena frena más porque el pie se hunde, y el hielo casi no
   * frena, que es lo que convierte un lago helado en un sitio donde hay que
   * anticiparse en vez de en un suelo pintado de azul.
   */
  readonly agarre?: number;
  /**
   * Se cava, no se pica: la pala va rápida con esto y el pico va lento.
   *
   * Separa lo que se aparta a paladas —tierra, arena, nieve, hierba— de lo que
   * hay que romper. Sin la distinción, una pala sería un pico con otro nombre.
   */
  readonly blando?: boolean;
  /**
   * Nivel de pico que hace falta para romperlo.
   *
   * 0 se saca con las manos, 1 pide pico de madera o mejor, y así. Es lo que
   * convierte la cadena de herramientas en una cadena de verdad: sin esto se
   * podía llegar al oro con el pico de madera, solo que despacio, y entonces
   * fabricar uno mejor era una comodidad y no un requisito.
   */
  readonly nivelPico?: number;
}

export const TILES: readonly DefTile[] = [
  { nombre: 'aire', solido: false, plataforma: false, dureza: 0, color: '#000000' },
  { nombre: 'tierra', solido: true, plataforma: false, dureza: 20, color: '#6b4b2a', blando: true },
  { nombre: 'hierba', solido: true, plataforma: false, dureza: 20, color: '#4c8b3a', blando: true },
  { nombre: 'piedra', solido: true, plataforma: false, dureza: 45, color: '#6e6e78', nivelPico: 1 },
  { nombre: 'madera', solido: true, plataforma: false, dureza: 30, color: '#8a5f33' },
  { nombre: 'plataforma', solido: false, plataforma: true, dureza: 15, color: '#a07545' },
  { nombre: 'cobre', solido: true, plataforma: false, dureza: 55, color: '#b06a3b', nivelPico: 2 },
  // El hierro tira a cálido a propósito. Con el gris pardo de antes, sobre la
  // roca gris de la textura de mineral, una veta era invisible: se cruzaba por
  // delante sin verla.
  { nombre: 'hierro', solido: true, plataforma: false, dureza: 70, color: '#d2a76b', nivelPico: 2 },
  { nombre: 'plata', solido: true, plataforma: false, dureza: 85, color: '#c2ccd6', nivelPico: 4 },
  { nombre: 'oro', solido: true, plataforma: false, dureza: 100, color: '#dcb13a', nivelPico: 4 },
  // Los árboles no frenan: en Terraria se atraviesan, y así no hay que
  // resolver colisiones absurdas contra una rama.
  { nombre: 'tronco', solido: false, plataforma: false, dureza: 25, color: '#5a4028' },
  { nombre: 'hojas', solido: false, plataforma: false, dureza: 8, color: '#3f7a35' },
  {
    nombre: 'antorcha',
    solido: false,
    plataforma: false,
    dureza: 5,
    color: '#ffb347',
    // Sube de 235: con la caída por tile que hay, una antorcha alumbraba unos
    // ocho tiles y hacía falta plantar una cada dos pasos para ver el túnel.
    luz: 255,
  },
  // Los muebles no son macizos: se atraviesan, como en Terraria, para poder
  // ponerlos en un pasillo estrecho sin quedarte encerrado.
  { nombre: 'mesa de trabajo', solido: false, plataforma: true, dureza: 18, color: '#a3743c' },
  { nombre: 'horno', solido: false, plataforma: false, dureza: 30, color: '#7a6a5c', luz: 150 },
  { nombre: 'yunque', solido: false, plataforma: true, dureza: 40, color: '#4a4a52', nivelPico: 1 },
  { nombre: 'cofre', solido: false, plataforma: false, dureza: 22, color: '#a37b3c' },
  // La arena es blanda, la arenisca es la piedra del desierto y el cactus no
  // frena, como los árboles.
  { nombre: 'arena', solido: true, plataforma: false, dureza: 14, color: '#d9c07a', agarre: 1.5, blando: true },
  { nombre: 'arenisca', solido: true, plataforma: false, dureza: 40, color: '#b39457', nivelPico: 1 },
  { nombre: 'cactus', solido: false, plataforma: false, dureza: 18, color: '#4f8a4a' },
  { nombre: 'nieve', solido: true, plataforma: false, dureza: 16, color: '#e6eef5', blando: true },
  { nombre: 'hielo', solido: true, plataforma: false, dureza: 35, color: '#a9d6ec', agarre: 0.18, nivelPico: 1 },
  // El cristal de vida. Ilumina bastante a propósito: encontrarlo en una cueva
  // a oscuras tiene que ser un "¿qué es esa luz rosa de ahí abajo?", no un
  // tile más que se pica sin mirar. Pide pico de piedra, así que la primera
  // ampliación de vida va detrás de la primera herramienta de verdad.
  {
    nombre: 'cristal de vida',
    solido: false,
    plataforma: false,
    dureza: 40,
    color: '#e0538f',
    luz: 190,
    nivelPico: 2,
  },
  // Tierra labrada: lo que deja la azada. De momento solo se distingue a la
  // vista; los cultivos que va a sostener llegan con el bloque de siembra, y
  // tenerla ya evita que ese bloque tenga que tocar el formato de guardado.
  {
    nombre: 'tierra labrada',
    solido: true,
    plataforma: false,
    dureza: 18,
    color: '#5a3d21',
    blando: true,
  },
  // Caña de azúcar: crece al borde del agua y no frena, como los árboles. Es la
  // única planta que sirve para algo que no sea comer — de ella sale el papel, y
  // del papel el mapa.
  {
    nombre: 'caña de azúcar',
    solido: false,
    plataforma: false,
    dureza: 6,
    color: '#8fc44a',
  },
  // --- Selva, taiga, abedul y grava --------------------------------------
  // El barro es la tierra de la selva: más oscura y más blanda, para que al
  // cavar se note que se está en otro sitio antes incluso de mirar el cielo.
  { nombre: 'barro', solido: true, plataforma: false, dureza: 16, color: '#4a3524', blando: true },
  { nombre: 'hierba de selva', solido: true, plataforma: false, dureza: 18, color: '#2f7a2a', blando: true },
  { nombre: 'tronco de selva', solido: false, plataforma: false, dureza: 34, color: '#4a3a22' },
  { nombre: 'hojas de selva', solido: false, plataforma: false, dureza: 8, color: '#2b6b28' },
  { nombre: 'tronco de abedul', solido: false, plataforma: false, dureza: 24, color: '#d8d2c4' },
  { nombre: 'hojas de pino', solido: false, plataforma: false, dureza: 8, color: '#2c5c3e' },
  // La grava se desmorona a paladas y es de donde saldrá el pedernal.
  { nombre: 'grava', solido: true, plataforma: false, dureza: 22, color: '#7b7772', blando: true },
  // Obsidiana: lo que queda cuando el agua toca la lava. Es lo más duro del
  // juego y pide pico de hierro, así que una colada apagada a lo bruto deja un
  // tapón que no se quita hasta bien entrada la partida.
  {
    nombre: 'obsidiana',
    solido: true,
    plataforma: false,
    dureza: 150,
    color: '#241d33',
    nivelPico: 4,
  },
  // Vidrio: sólido pero no tapa el cielo, así que una ventana deja pasar la luz
  // del sol. Es la única razón de que exista.
  { nombre: 'vidrio', solido: true, plataforma: false, dureza: 10, color: '#bcd8e4' },
];

/** Tile usado fuera de los límites laterales e inferior del mundo. */
export const TILE_BORDE = PIEDRA;

export function defTile(id: number): DefTile {
  return TILES[id] ?? TILES[AIRE]!;
}

/** Bloquea el movimiento en los dos ejes (las plataformas no cuentan). */
export function esSolido(id: number): boolean {
  return defTile(id).solido;
}

export function esPlataforma(id: number): boolean {
  return defTile(id).plataforma;
}

/** ¿Es una estación de crafteo? */
export function esEstacion(id: number): boolean {
  return (ESTACIONES as readonly number[]).includes(id);
}

/** Nivel de pico necesario. 0 = se saca con las manos. */
export function nivelPicoTile(id: number): number {
  return defTile(id).nivelPico ?? 0;
}

/** ¿Se cava a paladas en vez de picarse? */
export function esBlando(id: number): boolean {
  return defTile(id).blando === true;
}

/** Agarre del tile: multiplica la fricción del suelo. 1 si no dice nada. */
export function agarreTile(id: number): number {
  return defTile(id).agarre ?? 1;
}

/** Luz que emite el tile, 0 si no ilumina. */
export function emisionLuz(id: number): number {
  return defTile(id).luz ?? 0;
}

/** ¿Este tile tapa el cielo? Un bloque macizo sí; una antorcha o una hoja, no. */
export function tapaCielo(id: number): boolean {
  // El vidrio es la excepción: es macizo para andar por encima y para que el
  // agua no lo cruce, pero no corta el sol. Sin esto una casa con ventanas
  // estaría igual de oscura que una sin ellas, y el vidrio no serviría de nada.
  if (id === VIDRIO) return false;
  return esSolido(id) || esPlataforma(id);
}

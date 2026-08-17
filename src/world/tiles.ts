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
// Bloque 4: cama y cultivos. Las cuatro etapas de cada cultivo van seguidas
// para poder pasar de una a la siguiente sumando uno.
export const CAMA = 34;
export const TRIGO_0 = 35;
export const TRIGO_1 = 36;
export const TRIGO_2 = 37;
export const TRIGO_3 = 38;
export const ZANAHORIA_0 = 39;
export const ZANAHORIA_1 = 40;
export const ZANAHORIA_2 = 41;
export const ZANAHORIA_3 = 42;
export const BROTE = 43;
// Bloque 5: la fortaleza. El ladrillo es su material —y el único bloque del
// juego que no sale de ningún bioma— y el altar es la pieza que la justifica.
export const LADRILLO = 44;
export const ALTAR = 45;
// 5.0.0: cuatro minerales más, la roca del inframundo y las lianas de la selva.
// El carbón va por debajo de la piedra —se saca con las manos— y los otros tres
// por encima del oro, cada uno más hondo que el anterior.
export const CARBON = 46;
export const COBALTO = 47;
export const TITANIO = 48;
export const INFERNITA = 49;
export const ROCA_INFERNAL = 50;
export const LIANA = 51;
// 6.2.0: el material de las fortalezas del inframundo. Es la roca del sitio
// fundida y prensada, así que alumbra como ella pero aguanta mucho más: sin esa
// dureza, una fortaleza del inframundo se abriría por un costado con el mismo
// pico con el que se llegó hasta ella.
export const LADRILLO_INFERNAL = 52;

/**
 * Cultivos: primera etapa, última y qué se planta con qué semilla.
 *
 * Se declara como rangos y no como lista suelta porque crecer es literalmente
 * `id + 1`: guardar la etapa en el propio id ahorra una capa entera de estado
 * por tile, y el guardado se lleva los cultivos sin enterarse.
 */
export const CULTIVOS: readonly { primera: number; ultima: number }[] = [
  { primera: TRIGO_0, ultima: TRIGO_3 },
  { primera: ZANAHORIA_0, ultima: ZANAHORIA_3 },
];

/** ¿Es un cultivo? Devuelve el rango al que pertenece, o null. */
export function cultivoDe(id: number): { primera: number; ultima: number } | null {
  for (const c of CULTIVOS) {
    if (id >= c.primera && id <= c.ultima) return c;
  }
  return null;
}

/** ¿Está este cultivo listo para cosechar? */
export function cultivoMaduro(id: number): boolean {
  const c = cultivoDe(id);
  return c !== null && id === c.ultima;
}

/** Tiles que habilitan recetas cuando el jugador está cerca. */
export const ESTACIONES = [MESA, HORNO, YUNQUE] as const;

/** Minerales, de menos a más profundo. */
export const MINERALES = [COBRE, HIERRO, PLATA, ORO] as const;

/**
 * Los tres metales de 5.0.0, que viven por debajo del oro.
 *
 * Van en su propia lista y no dentro de `MINERALES` porque no comparten sitio
 * ni regla: los cuatro de siempre se reparten por toda la roca y estos empiezan
 * donde acaban ellos. La infernita, además, solo existe en el inframundo.
 */
export const MINERALES_PROFUNDOS = [COBALTO, TITANIO, INFERNITA] as const;

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
  // La cama no frena, como el resto de muebles: ponerla en un pasillo estrecho
  // no debe dejarte encerrado.
  { nombre: 'cama', solido: false, plataforma: true, dureza: 20, color: '#a8434a' },
  { nombre: 'trigo (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#7a8a3a' },
  { nombre: 'trigo (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#93a63f' },
  { nombre: 'trigo (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#b9b249' },
  { nombre: 'trigo', solido: false, plataforma: false, dureza: 4, color: '#d8c855' },
  { nombre: 'zanahoria (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#3f7a34' },
  { nombre: 'zanahoria (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#468a37' },
  { nombre: 'zanahoria (creciendo)', solido: false, plataforma: false, dureza: 4, color: '#4c9a3a' },
  { nombre: 'zanahoria', solido: false, plataforma: false, dureza: 4, color: '#54a83e' },
  { nombre: 'brote', solido: false, plataforma: false, dureza: 4, color: '#4f9a3a' },
  // Ladrillo de fortaleza: duro, pero no imposible. Pide pico de piedra porque
  // llegar a la fortaleza ya cuesta bastante, y encontrarla para descubrir que
  // no se puede entrar sería la peor recompensa posible.
  {
    nombre: 'ladrillo de fortaleza',
    solido: true,
    plataforma: false,
    dureza: 110,
    color: '#4b4757',
    nivelPico: 2,
  },
  // El altar. No frena —se entra en él, como en cualquier mueble— y alumbra
  // poco, con esa luz morada que se ve desde el otro lado de la sala y dice
  // "aquí es". Pide pico de oro para romperlo: quien llegue con uno ya ha
  // ganado el derecho a desmontarlo, y hasta entonces no puede perderlo por un
  // clic despistado.
  {
    nombre: 'altar antiguo',
    solido: false,
    plataforma: false,
    dureza: 400,
    color: '#6d4d8e',
    luz: 150,
    nivelPico: 6,
  },
  // El carbón es lo contrario de un mineral raro: está por todas partes y se
  // saca con las manos. Existe para que la primera noche no dependa de haber
  // encontrado madera, y para que el horno tenga con qué arder más adelante.
  {
    nombre: 'carbón',
    solido: true,
    plataforma: false,
    dureza: 30,
    color: '#2f3238',
    nivelPico: 0,
  },
  {
    nombre: 'cobalto',
    solido: true,
    plataforma: false,
    dureza: 120,
    color: '#3f7fc4',
    nivelPico: 5,
  },
  {
    nombre: 'titanio',
    solido: true,
    plataforma: false,
    dureza: 145,
    color: '#c8d0d8',
    nivelPico: 6,
  },
  // La infernita solo existe abajo del todo, y pide el pico que sale del
  // cobalto: es el último escalón de la cadena de herramientas.
  {
    nombre: 'infernita',
    solido: true,
    plataforma: false,
    dureza: 175,
    color: '#e0552a',
    luz: 60,
    nivelPico: 7,
  },
  // La roca del inframundo alumbra un poco por sí sola: es lo que hace que allá
  // abajo se vea el terreno sin antorchas y que el sitio se lea como otro mundo
  // en vez de como una cueva más.
  {
    nombre: 'roca infernal',
    solido: true,
    plataforma: false,
    dureza: 90,
    color: '#6b2f26',
    // Sube de 40 a 120: con la caída de luz por tile que hay, cuarenta se
    // apagaba en tres tiles y el inframundo salía negro del todo. Con esto la
    // sala se lee entera con su brasa roja de fondo, que es lo que lo hace otro
    // sitio en vez de una cueva más honda.
    luz: 120,
    nivelPico: 4,
  },
  // El ladrillo de las fortalezas de ahí abajo. Alumbra menos que la roca de la
  // que sale —está prensado, no al rojo— pero lo justo para que una sala se lea
  // al entrar sin tener que ir poniendo antorchas.
  {
    nombre: 'ladrillo infernal',
    solido: true,
    plataforma: false,
    dureza: 260,
    color: '#8a3a24',
    luz: 70,
    nivelPico: 6,
  },
  // Las lianas cuelgan y no frenan, como las hojas. Se agarran al techo de la
  // selva y son lo que hace que mirar hacia arriba ahí signifique algo.
  {
    nombre: 'liana',
    solido: false,
    plataforma: false,
    dureza: 6,
    color: '#4f9a3a',
  },
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

/**
 * En qué versión apareció cada tile, y en qué se convierte al retroceder.
 *
 * Las dos cosas juntas porque son la misma decisión: si un mundo vuelve a una
 * versión donde la selva no existía, hay que saber que la hierba de selva es de
 * 3.1.0 *y* que lo razonable es dejar hierba normal en su sitio, no un agujero.
 *
 * El sustituto no es siempre aire, y ahí está la gracia. Un bloque colocado por
 * quien juega es trabajo suyo: convertir su casa de ladrillo en un vacío sería
 * castigarle por cambiar de versión. Se busca el pariente más cercano que ya
 * existiera —ladrillo a piedra, tronco de selva a tronco— y solo se deja aire
 * cuando de verdad no hay equivalente: una caña, un altar, un cultivo.
 *
 * La cadena se sigue hasta el final: la hierba de selva vuelve a hierba, y si
 * la versión fuera tan vieja que ni la hierba existiera, seguiría a tierra.
 */
const TILE_DESDE: Readonly<Record<number, string>> = {
  [TRONCO]: '1.3.0',
  [HOJAS]: '1.3.0',
  [COBRE]: '1.3.0',
  [HIERRO]: '1.3.0',
  [PLATA]: '1.3.0',
  [ORO]: '1.3.0',
  [ANTORCHA]: '1.5.0',
  [MESA]: '1.7.0',
  [HORNO]: '1.7.0',
  [YUNQUE]: '1.7.0',
  [COFRE]: '1.7.0',
  [ARENA]: '2.1.0',
  [ARENISCA]: '2.1.0',
  [CACTUS]: '2.1.0',
  [NIEVE]: '2.1.0',
  [HIELO]: '2.1.0',
  [CRISTAL_VIDA]: '3.0.0',
  [CANA]: '3.0.0',
  [TIERRA_LABRADA]: '3.0.0',
  [BARRO]: '3.1.0',
  [HIERBA_JUNGLA]: '3.1.0',
  [TRONCO_JUNGLA]: '3.1.0',
  [HOJAS_JUNGLA]: '3.1.0',
  [TRONCO_ABEDUL]: '3.1.0',
  [HOJAS_PINO]: '3.1.0',
  [GRAVA]: '3.1.0',
  [OBSIDIANA]: '3.2.0',
  [VIDRIO]: '3.2.0',
  [CAMA]: '3.2.0',
  [BROTE]: '3.2.0',
  [TRIGO_0]: '3.2.0',
  [TRIGO_1]: '3.2.0',
  [TRIGO_2]: '3.2.0',
  [TRIGO_3]: '3.2.0',
  [ZANAHORIA_0]: '3.2.0',
  [ZANAHORIA_1]: '3.2.0',
  [ZANAHORIA_2]: '3.2.0',
  [ZANAHORIA_3]: '3.2.0',
  [LADRILLO]: '4.0.0',
  [ALTAR]: '4.0.0',
  [CARBON]: '5.0.0',
  [COBALTO]: '5.0.0',
  [TITANIO]: '5.0.0',
  [INFERNITA]: '5.0.0',
  [ROCA_INFERNAL]: '5.0.0',
  [LIANA]: '5.0.0',
  [LADRILLO_INFERNAL]: '6.2.0',
};

/** En qué se convierte cada tile cuando su versión queda por delante. */
const TILE_SUSTITUTO: Readonly<Record<number, number>> = {
  [HIERBA_JUNGLA]: HIERBA,
  [BARRO]: TIERRA,
  [TRONCO_JUNGLA]: TRONCO,
  [TRONCO_ABEDUL]: TRONCO,
  [HOJAS_JUNGLA]: HOJAS,
  [HOJAS_PINO]: HOJAS,
  [GRAVA]: PIEDRA,
  [OBSIDIANA]: PIEDRA,
  [LADRILLO]: PIEDRA,
  [ARENISCA]: PIEDRA,
  [HIELO]: PIEDRA,
  [VIDRIO]: ARENA,
  [ARENA]: TIERRA,
  [NIEVE]: TIERRA,
  [CAMA]: MADERA,
  [MESA]: MADERA,
  [COFRE]: MADERA,
  [HORNO]: PIEDRA,
  [YUNQUE]: PIEDRA,
  [TIERRA_LABRADA]: TIERRA,
  [HIERBA]: TIERRA,
  [TRONCO]: MADERA,
  // Sin equivalente posible: lo que era una planta, un mueble raro o el altar
  // se queda en aire. Poner piedra donde había una caña taparía el cielo.
  [CACTUS]: AIRE,
  [CANA]: AIRE,
  [BROTE]: AIRE,
  [CRISTAL_VIDA]: AIRE,
  [ALTAR]: AIRE,
  [ANTORCHA]: AIRE,
  [HOJAS]: AIRE,
  [PLATAFORMA]: AIRE,
  // Los minerales vuelven a ser la roca de la que salieron.
  [COBRE]: PIEDRA,
  [HIERRO]: PIEDRA,
  [PLATA]: PIEDRA,
  [ORO]: PIEDRA,
  [CARBON]: PIEDRA,
  [COBALTO]: PIEDRA,
  [TITANIO]: PIEDRA,
  [INFERNITA]: PIEDRA,
  [ROCA_INFERNAL]: PIEDRA,
  [LADRILLO_INFERNAL]: ROCA_INFERNAL,
  [LIANA]: AIRE,
};

/** Versión en la que apareció este tile. */
export function versionTile(id: number): string {
  return TILE_DESDE[id] ?? PRIMERA_VERSION_TILE;
}

/** Los bloques del principio: tierra, hierba, piedra, madera y plataforma. */
export const PRIMERA_VERSION_TILE = '1.2.0';

/**
 * En qué se convierte un tile al volver a una versión que no lo conocía.
 *
 * Sigue la cadena de sustitutos hasta dar con uno que sí exista: la hierba de
 * selva vuelve a hierba, y si tampoco la hubiera, a tierra. El límite de vueltas
 * es una red contra un ciclo mal escrito en la tabla, no una regla del juego.
 */
export function sustitutoTile(
  id: number,
  existeEn: (tile: number) => boolean,
): number {
  let actual = id;
  for (let vuelta = 0; vuelta < 8; vuelta++) {
    if (existeEn(actual)) return actual;
    const siguiente = TILE_SUSTITUTO[actual];
    if (siguiente === undefined) return AIRE;
    actual = siguiente;
  }
  return AIRE;
}

/**
 * De qué suena hecho un bloque.
 *
 * No es lo mismo que su textura ni que su dureza: la grava se pinta con el
 * grano de la piedra y se cava a paladas, pero suena a tierra. Es una tabla
 * corta y aparte precisamente porque la agrupación que le va bien al oído no
 * es ninguna de las que ya existen.
 */
export type MaterialSonido = 'piedra' | 'tierra' | 'madera' | 'metal' | 'planta' | 'vidrio';

const MATERIAL_SONIDO: Readonly<Record<number, MaterialSonido>> = {
  [TIERRA]: 'tierra',
  [HIERBA]: 'tierra',
  [HIERBA_JUNGLA]: 'tierra',
  [BARRO]: 'tierra',
  [ARENA]: 'tierra',
  [NIEVE]: 'tierra',
  [GRAVA]: 'tierra',
  [TIERRA_LABRADA]: 'tierra',
  [PIEDRA]: 'piedra',
  [ARENISCA]: 'piedra',
  [ROCA_INFERNAL]: 'piedra',
  [CARBON]: 'piedra',
  [OBSIDIANA]: 'piedra',
  [LADRILLO]: 'piedra',
  [ALTAR]: 'piedra',
  [MADERA]: 'madera',
  [TRONCO]: 'madera',
  [TRONCO_JUNGLA]: 'madera',
  [TRONCO_ABEDUL]: 'madera',
  [PLATAFORMA]: 'madera',
  [MESA]: 'madera',
  [COFRE]: 'madera',
  [CAMA]: 'madera',
  [CACTUS]: 'planta',
  [HOJAS]: 'planta',
  [HOJAS_JUNGLA]: 'planta',
  [HOJAS_PINO]: 'planta',
  [CANA]: 'planta',
  [BROTE]: 'planta',
  [LIANA]: 'planta',
  [COBRE]: 'metal',
  [HIERRO]: 'metal',
  [PLATA]: 'metal',
  [ORO]: 'metal',
  [COBALTO]: 'metal',
  [TITANIO]: 'metal',
  [INFERNITA]: 'metal',
  [YUNQUE]: 'metal',
  [HORNO]: 'piedra',
  [VIDRIO]: 'vidrio',
  [HIELO]: 'vidrio',
  [CRISTAL_VIDA]: 'vidrio',
};

/** Material sonoro de un tile. Lo que no está en la tabla suena a piedra. */
export function materialDe(id: number): MaterialSonido {
  const m = MATERIAL_SONIDO[id];
  if (m) return m;
  // Los cultivos son muchos ids seguidos y todos suenan igual; ponerlos uno a
  // uno en la tabla sería ocho entradas para decir lo mismo.
  return cultivoDe(id) !== null ? 'planta' : 'piedra';
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

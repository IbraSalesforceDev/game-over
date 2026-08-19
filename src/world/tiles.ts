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
// 6.3.0: los pinchos de las trampas. No frenan —se entra en ellos— porque una
// trampa que además bloquea el paso es un muro con pinchos, y lo que tiene que
// hacer es castigar el descuido, no cerrar el camino.
export const PINCHOS = 53;
// 6.4.0: bloques de metal macizo. Son a la vez almacén y material de obra: cada
// uno cuesta cinco lingotes y devuelve los cinco al deshacerlo, así que una
// ranura de bloques guarda quinientos lingotes donde antes cabían noventa y
// nueve. Y de paso hay por fin algo bonito con lo que construir: hasta ahora
// todo lo que se podía levantar era madera, piedra o ladrillo.
export const BLOQUE_COBRE = 54;
export const BLOQUE_HIERRO = 55;
export const BLOQUE_PLATA = 56;
export const BLOQUE_ORO = 57;
export const BLOQUE_COBALTO = 58;
export const BLOQUE_TITANIO = 59;
export const BLOQUE_INFERNITA = 60;

// 6.5.0: la instalación eléctrica improvisada. El cobre era el metal que menos
// razones daba para volver a picarlo: de cobre se hacía el primer pico, la
// primera espada y la primera armadura, y a partir del hierro no volvía a
// aparecer en ninguna receta. Esto le da un uso que no caduca.
export const CABLE = 61;
export const BOMBILLA = 62;
export const BOMBILLA_ENCENDIDA = 63;
export const BATERIA = 64;
export const INTERRUPTOR = 65;
export const INTERRUPTOR_ENCENDIDO = 66;

/** 6.9.0: el caldero, donde se preparan las pociones. */
export const CALDERO = 67;

/**
 * 7.3.0: las placas de trofeo, una por jefe de bioma.
 *
 * Son adorno y nada más, y por eso existen: el juego no tenía ni una sola cosa
 * que sirviera para enseñar lo que has hecho. Un trofeo en el zurrón es un
 * número; clavado en la pared de tu base es lo único que cuenta la partida sin
 * abrir ningún menú. Y de paso le da un segundo destino a los trofeos que
 * sobran de forjar el equipo.
 */
export const PLACA_PRADERA = 68;
export const PLACA_DESIERTO = 69;
export const PLACA_NIEVE = 70;
export const PLACA_JUNGLA = 71;
export const PLACA_CUEVA = 72;
export const PLACA_INFIERNO = 73;
/**
 * 7.11.0: el altar de un santuario de bioma.
 *
 * Es el altar de la fortaleza contado otra vez para los seis jefes que no lo
 * tenían: los suyos se llamaban con un ídolo en la mano y en cualquier parte del
 * bioma, y eso dejaba a seis de los siete jefes del juego sin ningún sitio al
 * que ir. A qué jefe llama cada uno no lo dice el tile —sería un tile por
 * jefe— sino el santuario en el que está.
 */
export const ALTAR_BIOMA = 74;

/** Las seis, en el orden de los jefes. */
export const PLACAS: readonly number[] = [
  PLACA_PRADERA,
  PLACA_DESIERTO,
  PLACA_NIEVE,
  PLACA_JUNGLA,
  PLACA_CUEVA,
  PLACA_INFIERNO,
];

/** El color del jefe de cada placa, que es lo único que las distingue. */
export const COLOR_PLACA: readonly string[] = [
  '#5ad07a',
  '#e0b45a',
  '#dceef8',
  '#4f9b3a',
  '#b8b2a0',
  '#ff7a3a',
];

/**
 * Las dos parejas apagado/encendido de la instalación.
 *
 * El estado va en el propio identificador del tile y no en una capa nueva, y esa
 * decisión se paga una vez y se cobra en todas partes: la luz que emite ya sale
 * de la tabla de tiles, el guardado se lo lleva sin enterarse, el render lo
 * pinta con su color y la migración de versiones lo trata como a cualquier otro
 * bloque. Una capa de "encendido" habría tocado esas cuatro cosas.
 */
export const PAREJAS_ENCENDIDO: readonly (readonly [apagado: number, encendido: number])[] = [
  [BOMBILLA, BOMBILLA_ENCENDIDA],
  [INTERRUPTOR, INTERRUPTOR_ENCENDIDO],
];

/** Los tiles por los que pasa la corriente. */
export const CONDUCTORES: readonly number[] = [
  CABLE,
  BOMBILLA,
  BOMBILLA_ENCENDIDA,
  INTERRUPTOR,
  INTERRUPTOR_ENCENDIDO,
];

/**
 * Todo lo que forma parte de la instalación eléctrica, batería incluida.
 *
 * Sirve para dos cosas distintas: para saber qué se puede colgar de qué al
 * construir y, sobre todo, para no repetir la lista en tres sitios.
 */
export function esInstalacion(id: number): boolean {
  return id === CABLE || id === BATERIA || CONDUCTORES.includes(id);
}

/** Los siete bloques de metal, del más blando al más duro. */
export const BLOQUES_METAL: readonly number[] = [
  BLOQUE_COBRE,
  BLOQUE_HIERRO,
  BLOQUE_PLATA,
  BLOQUE_ORO,
  BLOQUE_COBALTO,
  BLOQUE_TITANIO,
  BLOQUE_INFERNITA,
];

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
export const ESTACIONES = [MESA, HORNO, YUNQUE, CALDERO] as const;

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
  /**
   * Daño por contacto al pisarlo o meterse dentro.
   *
   * Es lo que convierte un tile decorativo en una trampa. Va en la tabla y no
   * en un caso especial del jugador porque el día que haya una segunda trampa
   * —una zarza, una placa al rojo— tiene que bastar con añadir una fila.
   */
  readonly dano?: number;
}

/**
 * Los siete bloques de metal, en el orden de `BLOQUES_METAL`.
 *
 * Va en una función y no escrito a mano siete veces porque lo único que cambia
 * entre ellos son cuatro números, y siete copias del mismo objeto es donde se
 * cuelan las erratas —un nivel de pico de menos y un bloque se abre a mano—.
 */
function bloquesMetal(): DefTile[] {
  const metales: [string, string, number, number, number][] = [
    // nombre, color, dureza, nivel de pico, luz
    ['cobre', '#b06a3b', 70, 1, 0],
    ['hierro', '#a3968a', 95, 2, 0],
    ['plata', '#c2ccd6', 120, 2, 0],
    ['oro', '#dcb13a', 150, 3, 24],
    ['cobalto', '#3f7fc4', 185, 4, 0],
    ['titanio', '#c8d0d8', 215, 5, 0],
    ['infernita', '#e0552a', 250, 6, 46],
  ];
  return metales.map(([metal, color, dureza, nivelPico, luz]) => ({
    nombre: `bloque de ${metal}`,
    solido: true,
    plataforma: false,
    dureza,
    color,
    nivelPico,
    ...(luz > 0 ? { luz } : {}),
  }));
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
    // Sube de 110 a 240 y de nivel 2 a 3 en 6.3.0. Con pico de cobre se abría
    // un boquete en la pared exterior y se entraba por detrás sin ver una sola
    // sala: la fortaleza tenía puertas y nadie las usaba. Ahora hay que
    // recorrerla.
    dureza: 240,
    color: '#4b4757',
    nivelPico: 3,
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
  // Pinchos. Hacen daño al pisarlos y no se pueden atravesar sin pagarlo, que
  // es toda la trampa: no cierran el paso, lo encarecen. Se pican fácil —quien
  // los vea y tenga paciencia los quita— porque el castigo es para quien va
  // Las lianas cuelgan y no frenan, como las hojas. Se agarran al techo de la
  // selva y son lo que hace que mirar hacia arriba ahí signifique algo.
  {
    nombre: 'liana',
    solido: false,
    plataforma: false,
    dureza: 6,
    color: '#4f9a3a',
  },
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
  // corriendo, no para quien mira dónde pisa.
  {
    nombre: 'pinchos',
    solido: false,
    plataforma: false,
    dureza: 30,
    color: '#8f96a3',
    dano: 22,
  },
  // Los siete bloques de metal. La dureza y el nivel de pico son los del
  // mineral del que salen: un bloque de infernita no se abre con el pico con el
  // que se abre uno de cobre, y así una casa hecha de metal caro es de verdad
  // más difícil de desmontar. El de oro y el de infernita alumbran un poco:
  // pulidos así, devuelven la luz de una antorcha.
  ...bloquesMetal(),
  // La instalación eléctrica. Nada de esto frena el paso: un cable que hiciera
  // de suelo convertiría la instalación en andamio, y una bombilla que bloqueara
  // sería una antorcha con pasos de más. Todo se quita de un manotazo, porque
  // reformar el cableado tiene que costar tiempo de pensar y no de picar.
  {
    nombre: 'cable de cobre',
    solido: false,
    plataforma: false,
    dureza: 8,
    color: '#b06a3b',
  },
  {
    nombre: 'bombilla',
    solido: false,
    plataforma: false,
    dureza: 10,
    color: '#6d6a55',
  },
  {
    // Alumbra bastante más que una antorcha, y esa es la gracia: la antorcha se
    // pone donde llegas, y la bombilla ilumina una sala entera desde el techo
    // sin que nadie tenga que ir hasta allí a encenderla.
    nombre: 'bombilla encendida',
    solido: false,
    plataforma: false,
    dureza: 10,
    color: '#ffe9a8',
    luz: 235,
  },
  {
    // La batería sí es maciza: es el único cacharro de la instalación con peso,
    // y poder subirse encima de ella es justo lo que hace que se note como un
    // aparato y no como una pegatina en la pared.
    nombre: 'batería improvisada',
    solido: true,
    plataforma: false,
    dureza: 40,
    color: '#3f6a4a',
    luz: 18,
  },
  {
    nombre: 'interruptor',
    solido: false,
    plataforma: false,
    dureza: 10,
    color: '#7a5334',
  },
  {
    nombre: 'interruptor encendido',
    solido: false,
    plataforma: false,
    dureza: 10,
    color: '#c98a3f',
    luz: 12,
  },
  {
    // El caldero. Es la cuarta estación y la primera que no fabrica objetos a
    // partir de metal: aquí se cuece lo que se bebe. Alumbra un poco porque
    // debajo tiene lumbre, y eso además lo hace fácil de encontrar en el sótano
    // donde acaba puesto siempre.
    nombre: 'caldero',
    solido: true,
    plataforma: false,
    dureza: 90,
    color: '#4a4550',
    luz: 26,
    nivelPico: 1,
  },
  // Las seis placas. No frenan el paso —son un cuadro, no un bloque— y alumbran
  // un poco: una sala de trofeos que hay que iluminar aparte no la monta nadie.
  ...placas(),
  // El altar de bioma. Alumbra más que el antiguo y es más blando: el de la
  // fortaleza pide pico de oro porque está al final de una fortaleza entera, y
  // estos están a cielo abierto en su bioma. Aun así no es un bloque que uno
  // vaya a picar sin querer.
  {
    nombre: 'altar de bioma',
    solido: false,
    plataforma: false,
    dureza: 320,
    color: '#c07ad8',
    luz: 180,
    nivelPico: 4,
  },
];

/**
 * Las seis placas, generadas de la lista de colores.
 *
 * Escritas a mano serían seis bloques calcados con el color cambiado, que es
 * donde se cuela la errata que nadie ve.
 */
function placas(): DefTile[] {
  const nombres = [
    'placa de la pradera',
    'placa del desierto',
    'placa de la nieve',
    'placa de la selva',
    'placa de la caverna',
    'placa del infierno',
  ];
  return nombres.map((nombre, i) => ({
    nombre,
    solido: false,
    plataforma: false,
    // Blanda: una placa mal colgada no puede costar un minuto de picar.
    dureza: 14,
    color: COLOR_PLACA[i]!,
    luz: 40,
  }));
}

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
/**
 * Daño por contacto de un tile, o 0 si no hace ninguno.
 *
 * Se pregunta por la tabla y no por el id para que añadir una trampa nueva sea
 * añadir una fila y no tocar la física del jugador.
 */
export function danoTile(id: number): number {
  return TILES[id]?.dano ?? 0;
}

/** ¿Hay algún tile que haga daño dentro de este rectángulo de píxeles? */
export function danoEnCaja(
  mundo: { getTile(tx: number, ty: number): number },
  x: number,
  y: number,
  ancho: number,
  alto: number,
  TILE: number,
): number {
  let peor = 0;
  const tx0 = Math.floor(x / TILE);
  const tx1 = Math.floor((x + ancho - 1e-6) / TILE);
  const ty0 = Math.floor(y / TILE);
  const ty1 = Math.floor((y + alto - 1e-6) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const d = danoTile(mundo.getTile(tx, ty));
      if (d > peor) peor = d;
    }
  }
  return peor;
}

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
  [ALTAR_BIOMA]: '7.11.0',
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
  [PINCHOS]: '6.3.0',
  [BLOQUE_COBRE]: '6.4.0',
  [BLOQUE_HIERRO]: '6.4.0',
  [BLOQUE_PLATA]: '6.4.0',
  [BLOQUE_ORO]: '6.4.0',
  [BLOQUE_COBALTO]: '6.4.0',
  [BLOQUE_TITANIO]: '6.4.0',
  [BLOQUE_INFERNITA]: '6.4.0',
  [CABLE]: '6.5.0',
  [BOMBILLA]: '6.5.0',
  [BOMBILLA_ENCENDIDA]: '6.5.0',
  [BATERIA]: '6.5.0',
  [INTERRUPTOR]: '6.5.0',
  [INTERRUPTOR_ENCENDIDO]: '6.5.0',
  [CALDERO]: '6.9.0',
  ...Object.fromEntries(PLACAS.map((p) => [p, '7.3.0'])),
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
  [PINCHOS]: AIRE,
  [LIANA]: AIRE,
  // Un bloque de metal vuelve a ser el mineral del que salió, no piedra: una
  // pared hecha de cincuenta bloques de infernita es un montón de trabajo, y al
  // bajar de versión tiene que quedar algo que se pueda volver a picar y
  // fundir, no un muro de roca gris.
  [BLOQUE_COBRE]: COBRE,
  [BLOQUE_HIERRO]: HIERRO,
  [BLOQUE_PLATA]: PLATA,
  [BLOQUE_ORO]: ORO,
  [BLOQUE_COBALTO]: COBALTO,
  [BLOQUE_TITANIO]: TITANIO,
  [BLOQUE_INFERNITA]: INFERNITA,
  // La instalación no tiene equivalente en ninguna versión anterior: sin
  // corriente, un cable es un adorno y una bombilla apagada un cacharro. Se
  // quedan en aire, como la antorcha o la caña.
  [CABLE]: AIRE,
  [BOMBILLA]: AIRE,
  [BOMBILLA_ENCENDIDA]: AIRE,
  [BATERIA]: AIRE,
  [INTERRUPTOR]: AIRE,
  [INTERRUPTOR_ENCENDIDO]: AIRE,
  // Sin pociones, un caldero es una olla decorativa.
  [CALDERO]: AIRE,
  // Y una placa de un jefe que aún no existía no es nada de nada.
  ...Object.fromEntries(PLACAS.map((p) => [p, AIRE])),
  // Un altar de bioma en un mundo sin santuarios es el altar de siempre: la
  // pieza sigue significando lo mismo —aquí se despierta algo— y dejarlo en
  // aire convertiría el santuario en un agujero con antorchas.
  [ALTAR_BIOMA]: ALTAR,
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

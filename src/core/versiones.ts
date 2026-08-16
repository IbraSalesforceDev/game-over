/**
 * Versiones del juego.
 *
 * A partir de aquí se acabaron las fases y los bloques: el juego tiene
 * versiones, y se numeran `mayor.menor.parche`.
 *
 *   mayor  — un cambio grande, o una tanda que añade muchas cosas a la vez.
 *   menor  — algo nuevo, pero de tamaño normal.
 *   parche — arreglos y retoques pequeños.
 *
 * El parche vuelve a 0 cada vez que sube el menor, y el menor vuelve a 0 cada
 * vez que sube el mayor. Es la regla de siempre y no hace falta inventarse
 * otra.
 *
 * La lista de abajo es la historia real del repositorio traducida a esa regla,
 * commit a commit. No es decorativa: al crear un mundo se elige una de estas
 * versiones y el mundo se construye con lo que había entonces y nada más. Por
 * eso el orden importa y por eso cada entrada dice qué trajo — es a la vez el
 * registro de cambios y la tabla que decide qué existe en cada partida.
 *
 * Una advertencia honesta, que también aparece en el menú: el motor siempre es
 * el de hoy. Jugar a 1.4.0 no rebobina el código —las físicas, el render y el
 * guardado son los actuales—; lo que se rebobina es el contenido: qué bloques,
 * bichos, recetas, biomas y sistemas existen en ese mundo. Es una
 * reconstrucción, no una máquina del tiempo.
 */

export type Etapa = 'prealfa' | 'alfa' | 'beta' | 'estable';

export interface Version {
  /** "1.2.0". Es también la clave que se guarda con el mundo. */
  readonly id: string;
  readonly etapa: Etapa;
  /** Título corto, para la lista desplegable. */
  readonly nombre: string;
  /** Qué cambia respecto de la anterior, en una frase. */
  readonly resumen: string;
  /** Lo que trajo, en viñetas cortas. */
  readonly cambios: readonly string[];
}

/**
 * Todas las versiones, de la más antigua a la más nueva.
 *
 * El orden de este array es la ordenación: comparar por índice es más rápido y
 * mucho más difícil de romper que interpretar los tres números, y como la
 * lista se escribe a mano no hay forma de que se desordene sola.
 */
export const VERSIONES: readonly Version[] = [
  {
    id: '1.0.0',
    etapa: 'prealfa',
    nombre: 'El andamiaje',
    resumen: 'Lo primero que hubo: un lienzo, un bucle a 60 y nada más.',
    cambios: ['Canvas a pantalla completa', 'Bucle de paso fijo', 'Pantalla de carga'],
  },
  {
    id: '1.1.0',
    etapa: 'prealfa',
    nombre: 'Laboratorio de físicas',
    resumen: 'Aparece el personaje y se puede correr y saltar. Sin mundo todavía.',
    cambios: [
      'Correr, saltar con altura variable y coyote time',
      'Colisiones contra la rejilla, sin atravesar nada',
      'Escenario de pruebas hecho a mano',
    ],
  },
  {
    id: '1.2.0',
    etapa: 'prealfa',
    nombre: 'Minar y construir',
    resumen: 'Ya se pueden romper y poner bloques, y existe la capa de paredes.',
    cambios: ['Picar y colocar', 'Capa de pared detrás del bloque', 'Auto-tiling'],
  },
  {
    id: '1.3.0',
    etapa: 'prealfa',
    nombre: 'Mundo generado',
    resumen: 'El escenario de pruebas deja paso a un mundo de verdad, con semilla.',
    cambios: ['Relieve por ruido', 'Cuevas', 'Vetas de mineral', 'Árboles'],
  },
  {
    id: '1.4.0',
    etapa: 'prealfa',
    nombre: 'Guardado',
    resumen: 'El mundo sobrevive a cerrar la pestaña.',
    cambios: ['Guardado comprimido', 'Menú de mundos', 'Autoguardado'],
  },
  {
    id: '1.5.0',
    etapa: 'prealfa',
    nombre: 'Luz y día-noche',
    resumen: 'Las cuevas se oscurecen, las antorchas alumbran y el sol se mueve.',
    cambios: ['Iluminación propagada', 'Antorchas', 'Ciclo de día y noche'],
  },
  {
    id: '1.6.0',
    etapa: 'prealfa',
    nombre: 'Inventario',
    resumen: 'Lo que se pica se recoge y se guarda.',
    cambios: ['Objetos y pilas', 'Barra rápida', 'Objetos por el suelo'],
  },
  {
    id: '1.7.0',
    etapa: 'prealfa',
    nombre: 'Crafteo y cofres',
    resumen: 'Mesa, horno y yunque: los materiales pasan a servir para algo.',
    cambios: ['Recetas y estaciones', 'Cofres', 'Lingotes y las primeras herramientas'],
  },
  {
    id: '2.0.0',
    etapa: 'prealfa',
    nombre: 'Enemigos y combate',
    resumen: 'Deja de ser un juego de construir: ahora hay algo que te puede matar.',
    cambios: ['Vida y muerte', 'Slimes, zombis y murciélagos', 'Espadas y botín'],
  },
  {
    id: '2.1.0',
    etapa: 'prealfa',
    nombre: 'Líquidos y biomas',
    resumen: 'Agua que corre, lava en el fondo y los dos primeros biomas.',
    cambios: ['Agua y lava simuladas', 'Nadar y aliento', 'Desierto y nieve', 'Cubos'],
  },
  {
    id: '2.2.0',
    etapa: 'prealfa',
    nombre: 'Se ve y se oye',
    resumen: 'Sprites animados, partículas, fondo con parallax y sonido.',
    cambios: ['Sprites del personaje y de los bichos', 'Partículas', 'Audio sintetizado'],
  },
  {
    id: '2.2.1',
    etapa: 'prealfa',
    nombre: 'Pulido de navegador',
    resumen: 'Iconos de objeto con forma propia y el panel de controles.',
    cambios: ['Iconos dibujados', 'Panel de ayuda', 'El overlay ya no sale de serie'],
  },
  {
    id: '2.3.0',
    etapa: 'prealfa',
    nombre: 'Hambre y animales',
    resumen: 'Hay que comer, y para comer hay que cazar.',
    cambios: ['Barra de hambre', 'Conejos y jabalíes', 'Horno para asar', 'Taller propio'],
  },
  {
    id: '2.3.1',
    etapa: 'prealfa',
    nombre: 'Caída, pausa y arreglos',
    resumen: 'Daño de caída, menú de pausa y el fallo que se comía los cofres.',
    cambios: ['Daño por caída', 'Menú de pausa', 'Arreglado el cofre que se borraba'],
  },
  {
    id: '3.0.0',
    etapa: 'prealfa',
    nombre: 'Progresión',
    resumen: 'La tanda más grande: herramientas por nivel, dificultad, armadura, arco y mapas.',
    cambios: [
      'Cada bloque pide su nivel de pico',
      'Diez niveles de dificultad',
      'Esqueleto, serpiente y momia',
      'Cristales de vida',
      'Armadura de cuatro metales',
      'Arco y flechas',
      'Pala y azada',
      'Caña, papel y la escalera de mapas',
    ],
  },
  {
    id: '3.1.0',
    etapa: 'prealfa',
    nombre: 'El mundo crece',
    resumen: 'Selva, taiga, montañas y mares. Cada bioma tira de un metal.',
    cambios: ['Selva y taiga', 'Montañas con cumbre pelada', 'Mares con playa', 'Grava y pedernal'],
  },
  {
    id: '3.2.0',
    etapa: 'prealfa',
    nombre: 'Lava, hardcore y huerto',
    resumen: 'La lava quema a todos, aparece el hardcore y se puede cultivar.',
    cambios: [
      'La lava hace daño a todo el mundo, sin matar de un toque',
      'Agua y lava hacen obsidiana',
      'Modo hardcore',
      'Botas y guantes',
      'Huerto, camas, brotes y gallinas',
    ],
  },
  {
    id: '4.0.0',
    etapa: 'prealfa',
    nombre: 'La fortaleza',
    resumen: 'Aparece un final: una fortaleza enterrada, un altar y un jefe.',
    cambios: [
      'Fortaleza de ladrillo en la caverna',
      'Cabañas y minas abandonadas',
      'Altar y el guardián de la fortaleza',
      'Brújula que señala lo construido',
      'Espada del guardián y esencia',
    ],
  },
  {
    id: '4.1.0',
    etapa: 'prealfa',
    nombre: 'Se ve y se explica',
    resumen: 'La armadura se ve puesta, cada material suena distinto y los objetos se explican.',
    cambios: [
      'La armadura puesta se ve en el personaje',
      'Sonido de rotura por material y voces de los bichos',
      'Ficha de objeto al pasar el ratón',
      'Ajustes de zoom, oscuridad y resolución',
    ],
  },
  {
    id: '4.2.0',
    etapa: 'prealfa',
    nombre: 'Elegir versión',
    resumen: 'Se puede crear un mundo con cualquier versión anterior del juego.',
    cambios: [
      'Selector de versión al crear el mundo',
      'Cada versión trae solo lo que existía entonces',
      'La versión se guarda con el mundo',
    ],
  },
];

/** La más nueva. Es la que trae marcada el menú. */
export const VERSION_ACTUAL = VERSIONES[VERSIONES.length - 1]!.id;

/** La más antigua que se puede elegir. */
export const VERSION_MINIMA = VERSIONES[0]!.id;

const INDICE = new Map<string, number>(VERSIONES.map((v, i) => [v.id, i]));

/**
 * Posición de una versión en la historia. -1 si no existe.
 *
 * Todo lo demás se apoya en esto: comparar por índice en vez de interpretar
 * "4.10.0" evita el clásico fallo de ordenar versiones como si fueran texto,
 * donde 4.10.0 va antes que 4.2.0.
 */
export function indiceVersion(id: string): number {
  return INDICE.get(id) ?? -1;
}

/** La versión pedida, o la actual si el id no se reconoce. */
export function version(id: string): Version {
  const i = indiceVersion(id);
  return VERSIONES[i] ?? VERSIONES[VERSIONES.length - 1]!;
}

/** ¿`a` es igual o posterior a `b`? Un id desconocido cuenta como la actual. */
export function alMenos(a: string, b: string): boolean {
  const ia = indiceVersion(a);
  const ib = indiceVersion(b);
  return (ia < 0 ? VERSIONES.length - 1 : ia) >= (ib < 0 ? VERSIONES.length - 1 : ib);
}

/**
 * Qué se puede encontrar en un mundo, y desde cuándo.
 *
 * Una sola tabla en vez de comprobaciones sueltas repartidas por el código.
 * Cada entrada es una cosa que el jugador nota —un bioma, un sistema, una
 * familia de objetos— con la versión en la que llegó. Preguntar por ellas es
 * lo único que hace falta para que un mundo de 2.1.0 no tenga selva.
 *
 * La granularidad no es por objeto sino por "cosa que se anunció": partirlo más
 * fino daría una tabla de doscientas entradas que nadie mantendría al día, y
 * partirlo menos dejaría versiones que no se distinguen entre sí.
 */
export const DESDE = {
  // --- Mundo ---
  mundoGenerado: '1.3.0',
  cuevas: '1.3.0',
  minerales: '1.3.0',
  arboles: '1.3.0',
  luz: '1.5.0',
  diaNoche: '1.5.0',
  liquidos: '2.1.0',
  biomasSecos: '2.1.0',
  biomasNuevos: '3.1.0',
  montanas: '3.1.0',
  mares: '3.1.0',
  grava: '3.1.0',
  cristalesVida: '3.0.0',
  cana: '3.0.0',
  estructuras: '4.0.0',

  // --- Sistemas ---
  inventario: '1.6.0',
  crafteo: '1.7.0',
  cofres: '1.7.0',
  combate: '2.0.0',
  particulas: '2.2.0',
  audio: '2.2.0',
  hambre: '2.3.0',
  danoCaida: '2.3.1',
  nivelesHerramienta: '3.0.0',
  dificultad: '3.0.0',
  armadura: '3.0.0',
  mapas: '3.0.0',
  lavaQuema: '3.2.0',
  hardcore: '3.2.0',
  cultivos: '3.2.0',
  camas: '3.2.0',
  jefe: '4.0.0',
  brujula: '4.0.0',
  armaduraVisible: '4.1.0',
  audioPorMaterial: '4.1.0',
  fichaObjeto: '4.1.0',
} as const satisfies Record<string, string>;

export type Caracteristica = keyof typeof DESDE;

/** ¿Existe esta cosa en un mundo de esta versión? */
export function hay(que: Caracteristica, versionMundo: string): boolean {
  return alMenos(versionMundo, DESDE[que]);
}

/**
 * Etapa en palabras, para el sello del menú.
 *
 * Todas las versiones de hoy son prealfa y lo dicen: el juego no tiene ni
 * pantalla de título decente, y llamar "beta" a esto sería mentir en la única
 * pantalla donde el jugador todavía se fía de lo que lee.
 */
export const NOMBRE_ETAPA: Readonly<Record<Etapa, string>> = {
  prealfa: 'prealfa',
  alfa: 'alfa',
  beta: 'beta',
  estable: 'estable',
};

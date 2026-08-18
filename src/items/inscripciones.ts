import { DURACION, type ClaseEfecto } from '../entities/efectos';

/**
 * Inscripciones: lo que llevan escrito el arma y el peto de cada jefe.
 *
 * El equipo de bioma no es "lo mismo pero con más números". Un peto de oro con
 * cuatro puntos más de defensa no cambia nada de cómo se juega: se equipa y se
 * olvida. Lo que lo cambia es que haga algo, y que ese algo se lea antes de
 * conseguirlo —pasando el ratón por encima— para que valga la pena ir a por él.
 *
 * Hay dos clases y son distintas a propósito:
 *
 *  - El **filo** va en el arma y es pasivo: pasa solo, en cada golpe. Es lo que
 *    hace que elegir espada sea una decisión de bioma y no de número.
 *  - El **poder** va en el peto y se dispara con una tecla. Es activo, tiene
 *    recarga y hay que decidir cuándo gastarlo.
 *
 * Poner el activo en la armadura y no en el arma es deliberado: el arma se
 * cambia todo el rato según lo que se esté matando, y un poder que aparece y
 * desaparece cada dos minutos no se llega a aprender nunca. La armadura se
 * elige una vez por partida y se lleva puesta, así que su tecla se convierte en
 * parte de cómo te mueves.
 */

// --- Filos: lo que hace el arma en cada golpe -------------------------------

export type ClaseFilo = 'savia' | 'doble' | 'escarcha' | 'ponzona' | 'veta' | 'brasa';

export interface DefFilo {
  /** Nombre de la inscripción, tal cual sale grabado. */
  readonly nombre: string;
  /** Lo que se lee en la ficha. */
  readonly texto: string;
  /** Efecto que le pega al bicho, si le pega alguno. */
  readonly efecto?: ClaseEfecto;
  readonly duracionEfecto: number;
  /** Vida que te devuelve cada golpe. */
  readonly curacion: number;
  /** Probabilidad de que el golpe entre dos veces. */
  readonly probDoble: number;
  /** Lo que multiplica el daño estando bajo tierra. */
  readonly bonusHondo: number;
}

function filo(nombre: string, texto: string, extra: Partial<DefFilo> = {}): DefFilo {
  return {
    nombre,
    texto,
    duracionEfecto: DURACION.ataque,
    curacion: 0,
    probDoble: 0,
    bonusHondo: 1,
    ...extra,
  };
}

export const FILOS: Readonly<Record<ClaseFilo, DefFilo>> = {
  savia: filo('Savia', 'Cada golpe te devuelve un poco de vida.', { curacion: 3 }),
  doble: filo('Doble', 'Uno de cada cinco golpes entra dos veces.', { probDoble: 0.2 }),
  escarcha: filo('Escarcha', 'Los golpes dejan helado a lo que tocan.', {
    efecto: 'congelado',
  }),
  ponzona: filo('Ponzoña', 'Los golpes envenenan.', { efecto: 'veneno' }),
  // La única que depende de dónde estás. Es la que convierte un arma en el arma
  // *de la caverna* y no en una espada más de la lista.
  veta: filo('Veta', 'Bajo tierra pega la mitad más.', { bonusHondo: 1.5 }),
  brasa: filo('Brasa', 'Los golpes prenden.', { efecto: 'ardiendo' }),
};

// --- Poderes: lo que hace el peto al pulsar la tecla ------------------------

export type ClasePoder =
  | 'brote'
  | 'muroDeArena'
  | 'ondaGelida'
  | 'esporas'
  | 'zancada'
  | 'bolaDeFuego';

export interface DefPoder {
  readonly nombre: string;
  readonly texto: string;
  /** Ticks entre usos. */
  readonly recarga: number;
  readonly color: string;
  /** Efecto que se pone uno mismo. */
  readonly efectoPropio?: ClaseEfecto;
  /** Efecto que reparte a lo que tenga cerca. */
  readonly efectoCercano?: ClaseEfecto;
  readonly duracion: number;
  /** Radio del reparto, en tiles. Solo cuenta si reparte algo. */
  readonly radio: number;
  /** Daño del proyectil que lanza, o 0 si no lanza ninguno. */
  readonly danoProyectil: number;
}

function poder(
  nombre: string,
  texto: string,
  color: string,
  extra: Partial<DefPoder> = {},
): DefPoder {
  return {
    nombre,
    texto,
    recarga: 60 * 20,
    color,
    duracion: 60 * 15,
    radio: 0,
    danoProyectil: 0,
    ...extra,
  };
}

/**
 * Los seis poderes.
 *
 * Tres se los pone uno encima, dos reparten a lo que hay alrededor y uno lanza
 * algo. Ninguno hace daño directo grande: si el poder matara, la espada
 * sobraría y el juego se convertiría en pulsar una tecla cada veinte segundos.
 * Lo que hacen es cambiar el próximo medio minuto de pelea.
 */
export const PODERES: Readonly<Record<ClasePoder, DefPoder>> = {
  brote: poder('Brote', 'Q: te cura poco a poco durante un rato.', '#7fd15a', {
    efectoPropio: 'regeneracion',
    duracion: 60 * 20,
    recarga: 60 * 30,
  }),
  muroDeArena: poder('Muro', 'Q: la arena te cubre y aguantas mucho más.', '#e0c070', {
    efectoPropio: 'pielDePiedra',
  }),
  ondaGelida: poder('Onda gélida', 'Q: congela a todo lo que tengas cerca.', '#a8e0f5', {
    efectoCercano: 'congelado',
    duracion: 60 * 6,
    radio: 9,
    recarga: 60 * 16,
  }),
  esporas: poder('Esporas', 'Q: envenena a todo lo que tengas cerca.', '#8fd14a', {
    efectoCercano: 'veneno',
    duracion: 60 * 10,
    radio: 8,
    recarga: 60 * 16,
  }),
  zancada: poder('Zancada', 'Q: corres y saltas más durante un rato.', '#a7e8c0', {
    efectoPropio: 'ligereza',
    duracion: 60 * 25,
    recarga: 60 * 24,
  }),
  // El que pidió el personaje con estas palabras: la armadura del fuego, a la
  // Q, lanza una bola de fuego.
  bolaDeFuego: poder('Brasa viva', 'Q: lanza una bola de fuego hacia el ratón.', '#ff8a3a', {
    danoProyectil: 42,
    recarga: 60 * 4,
  }),
};

export const CLASES_FILO = Object.keys(FILOS) as ClaseFilo[];
export const CLASES_PODER = Object.keys(PODERES) as ClasePoder[];

/** El renglón que se lee en la ficha, ya con el nombre de la inscripción. */
export function textoFilo(clase: ClaseFilo): string {
  return `«${FILOS[clase].nombre}» ${FILOS[clase].texto}`;
}

export function textoPoder(clase: ClasePoder): string {
  return `«${PODERES[clase].nombre}» ${PODERES[clase].texto}`;
}

/** Estado de la recarga del poder que se lleve puesto. */
export interface EstadoPoder {
  /** Ticks que faltan para poder volver a usarlo. */
  restante: number;
}

export function crearEstadoPoder(): EstadoPoder {
  return { restante: 0 };
}

/** Un tick de la recarga. */
export function tickPoder(estado: EstadoPoder): void {
  if (estado.restante > 0) estado.restante--;
}

/** ¿Se puede usar ya? */
export function poderListo(estado: EstadoPoder): boolean {
  return estado.restante <= 0;
}

/** Marca el poder como recién usado. */
export function gastarPoder(estado: EstadoPoder, clase: ClasePoder): void {
  estado.restante = PODERES[clase].recarga;
}

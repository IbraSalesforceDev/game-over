/**
 * Sucesos del mundo.
 *
 * Es la respuesta a que el progreso se hacía repetitivo. Hasta aquí el juego
 * era siempre el mismo bucle —picar, fundir, forjar el escalón siguiente, bajar
 * un poco más— y la noche número treinta era exactamente igual que la tercera,
 * solo que con mejor equipo. Nada de lo que pasaba venía de fuera: todo lo
 * decidía el jugador, y por eso a las pocas horas se sabía de memoria.
 *
 * Un suceso es lo contrario: algo que le pasa al mundo, no algo que uno hace.
 * Se avisa, dura un rato y cambia una regla mientras tanto. No hace el juego más
 * difícil de media —hay noches en que no pasa nada— sino menos previsible, que
 * es lo que se estaba pidiendo.
 *
 * Este fichero solo decide **cuándo** y **cuál**. Lo que cada uno hace vive
 * donde corresponda: la aparición sube en el spawner y los meteoritos caen en el
 * generador. Así se puede probar el calendario entero sin mundo, sin bichos y
 * sin canvas.
 */

import { hay, VERSION_ACTUAL } from '../core/versiones';

export type ClaseSuceso = 'lunaDeSangre' | 'lluviaEstrellas' | 'enjambre';

export interface DefSuceso {
  readonly nombre: string;
  /** Lo que se lee cuando empieza. */
  readonly aviso: string;
  /** Lo que se lee cuando termina. */
  readonly despedida: string;
  /** Color del cartel, para distinguirlos de un vistazo. */
  readonly color: string;
  /**
   * Cuánto dura en ticks, o 0 si dura hasta el amanecer.
   *
   * La luna de sangre no lleva reloj a propósito: lo que la termina es que
   * salga el sol, y eso convierte aguantar hasta el amanecer en el objetivo.
   * Con un contador sería una cuenta atrás, que es otra cosa.
   */
  readonly duracion: number;
  /** Peso en el sorteo. Cuanto más alto, más a menudo sale. */
  readonly peso: number;
  /** Solo puede empezar de noche. */
  readonly soloNoche: boolean;
  readonly desde: string;
}

/**
 * Los tres sucesos.
 *
 * Dos son una amenaza y uno es un regalo, y esa mezcla es lo que hace que
 * mereza la pena que salte el aviso en vez de temerlo siempre: si todos fueran
 * ataques, la reacción sería meterse en casa y esperar, que es tan repetitivo
 * como lo que se quería arreglar.
 */
export const SUCESOS: Readonly<Record<ClaseSuceso, DefSuceso>> = {
  lunaDeSangre: {
    nombre: 'Luna de sangre',
    aviso: 'La luna se ha puesto roja.',
    despedida: 'Amanece. La luna vuelve a su sitio.',
    color: '#c2384a',
    duracion: 0,
    peso: 3,
    soloNoche: true,
    desde: '6.7.0',
  },
  lluviaEstrellas: {
    nombre: 'Lluvia de estrellas',
    aviso: 'Están cayendo estrellas.',
    despedida: 'Ha dejado de caer nada.',
    color: '#8fb8e0',
    duracion: 60 * 50,
    peso: 2,
    soloNoche: true,
    desde: '6.7.0',
  },
  enjambre: {
    nombre: 'Enjambre',
    aviso: 'Algo viene hacia aquí, y viene mucho.',
    despedida: 'Se acabó. Han dejado de venir.',
    color: '#c88a3a',
    duracion: 60 * 90,
    peso: 2,
    soloNoche: false,
    desde: '6.7.0',
  },
};

const CLASES = Object.keys(SUCESOS) as ClaseSuceso[];

/**
 * Cada cuánto se tira el dado, en ticks. Cuatro minutos reales.
 *
 * Y la probabilidad de que salga algo en cada tirada. Multiplicadas dan un
 * suceso cada veinte minutos largos de media: lo bastante a menudo como para
 * que una partida no se acabe sin ver ninguno, y lo bastante de tarde en tarde
 * como para que salte el aviso y a uno se le encoja algo.
 */
export const INTERVALO_SORTEO = 60 * 60 * 4;
export const PROBABILIDAD = 0.2;

/** Ticks de calma obligatoria después de uno, para que no se encadenen. */
export const DESCANSO = 60 * 60 * 3;

export interface EstadoSucesos {
  /** El que está en marcha, o null si no hay ninguno. */
  activo: ClaseSuceso | null;
  /** Ticks que le quedan al activo. Ignorado si dura hasta el amanecer. */
  restante: number;
  /** Ticks hasta el siguiente sorteo. */
  espera: number;
  /**
   * El último que salió.
   *
   * Se guarda solo para no repetirlo dos veces seguidas. Con tres sucesos y un
   * sorteo por peso, salir el mismo dos veces es bastante probable, y dos lunas
   * de sangre seguidas se leen como que el juego está roto, no como mala suerte.
   */
  ultimo: ClaseSuceso | null;
}

export function crearSucesos(): EstadoSucesos {
  return { activo: null, restante: 0, espera: INTERVALO_SORTEO, ultimo: null };
}

export interface ContextoSuceso {
  esNoche: boolean;
  /** Versión del mundo. Sin ella, la actual. */
  version?: string;
  /**
   * El jugador está en la superficie.
   *
   * Los tres sucesos pasan arriba, así que empezar uno mientras alguien está a
   * doscientas filas de profundidad sería gastarlo: no vería la luna, no le
   * caería ninguna estrella y el enjambre saldría en un sitio donde de todas
   * formas salen bichos.
   */
  enSuperficie: boolean;
}

export interface CambioSuceso {
  /** El que acaba de empezar, si ha empezado alguno. */
  empieza?: ClaseSuceso;
  /** El que acaba de terminar, si ha terminado alguno. */
  termina?: ClaseSuceso;
}

/**
 * Un tick del calendario. Devuelve qué ha cambiado, o un objeto vacío.
 *
 * No toca el mundo ni los bichos: dice lo que pasa y quien llama lo aplica.
 */
export function tickSucesos(
  estado: EstadoSucesos,
  ctx: ContextoSuceso,
  rng: () => number = Math.random,
): CambioSuceso {
  const version = ctx.version ?? VERSION_ACTUAL;
  if (!hay('sucesos', version)) return {};

  // --- ¿Se termina el que hay? ---
  if (estado.activo !== null) {
    const def = SUCESOS[estado.activo];
    const seAcaba = def.duracion === 0 ? !ctx.esNoche : --estado.restante <= 0;
    if (!seAcaba) return {};
    const termina = estado.activo;
    estado.activo = null;
    estado.restante = 0;
    estado.espera = DESCANSO;
    return { termina };
  }

  // --- ¿Empieza uno nuevo? ---
  if (--estado.espera > 0) return {};
  estado.espera = INTERVALO_SORTEO;
  if (!ctx.enSuperficie) return {};
  if (rng() >= PROBABILIDAD) return {};

  const elegido = sortear(estado, ctx, version, rng);
  if (elegido === null) return {};
  estado.activo = elegido;
  estado.restante = SUCESOS[elegido].duracion;
  estado.ultimo = elegido;
  return { empieza: elegido };
}

/** Saca uno de los que pueden pasar ahora mismo, por peso. */
function sortear(
  estado: EstadoSucesos,
  ctx: ContextoSuceso,
  version: string,
  rng: () => number,
): ClaseSuceso | null {
  const posibles = CLASES.filter((c) => {
    const def = SUCESOS[c];
    if (def.soloNoche && !ctx.esNoche) return false;
    if (!hay('sucesos', version)) return false;
    return true;
  });
  // El de la vez pasada se descarta, pero solo si queda alguno más: con uno
  // solo disponible, prohibirlo sería no tener sucesos nunca.
  const sinRepetir = posibles.filter((c) => c !== estado.ultimo);
  const lista = sinRepetir.length > 0 ? sinRepetir : posibles;
  if (lista.length === 0) return null;

  const total = lista.reduce((t, c) => t + SUCESOS[c].peso, 0);
  let dado = rng() * total;
  for (const c of lista) {
    dado -= SUCESOS[c].peso;
    if (dado < 0) return c;
  }
  return lista[lista.length - 1]!;
}

/** Termina a la fuerza lo que haya. Lo usa el menú de depuración. */
export function cortarSuceso(estado: EstadoSucesos): ClaseSuceso | null {
  const activo = estado.activo;
  estado.activo = null;
  estado.restante = 0;
  estado.espera = DESCANSO;
  return activo;
}

/** Empieza uno a la fuerza. Lo usa el menú de depuración. */
export function forzarSuceso(estado: EstadoSucesos, clase: ClaseSuceso): void {
  estado.activo = clase;
  estado.restante = SUCESOS[clase].duracion;
  estado.ultimo = clase;
}

/** Cuánto multiplica las apariciones el suceso que haya. */
export function ritmoDeApariciones(estado: EstadoSucesos): number {
  if (estado.activo === 'lunaDeSangre') return 3;
  if (estado.activo === 'enjambre') return 4;
  return 1;
}

/** Cuánto multiplica la probabilidad de élite el suceso que haya. */
export function ritmoDeElites(estado: EstadoSucesos): number {
  return estado.activo === 'lunaDeSangre' ? 3 : 1;
}

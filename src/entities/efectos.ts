/**
 * Efectos de estado.
 *
 * Hasta aquí el combate era una resta: tu daño contra su vida, su daño contra
 * tu defensa, y ninguna de las dos cosas cambiaba nunca dentro de una pelea. Lo
 * único que uno podía decidir era pegar o apartarse.
 *
 * Un efecto es un cambio temporal a esa resta, y lo interesante es que va en
 * los dos sentidos: hay efectos que te ponen y efectos que pones. Arder no es
 * daño, es daño *durante un rato*, así que la decisión ya no es aguantar el
 * golpe sino salir del sitio; y beber fuerza antes de bajar a la caverna es
 * gastar algo que no se recupera a cambio de un minuto en el que pegas más.
 * Ninguna de las dos cosas es difícil de programar: lo que aportan es que dos
 * peleas contra el mismo bicho dejen de ser la misma pelea.
 *
 * El módulo es a propósito tonto y sin dependencias: guarda cuántos ticks le
 * quedan a cada efecto y responde a "¿cuánto multiplica esto la velocidad?".
 * Quién los sufre —jugador o bicho— y de dónde salen —lava, poción, flecha de
 * fuego— no es asunto suyo.
 */

export type ClaseEfecto =
  | 'ardiendo'
  | 'veneno'
  | 'congelado'
  | 'regeneracion'
  | 'fuerza'
  | 'pielDePiedra'
  | 'ligereza'
  | 'agallas'
  | 'brio';

export interface DefEfecto {
  readonly nombre: string;
  /** Color del distintivo en pantalla y de las partículas. */
  readonly color: string;
  /** Estorba. Es lo que distingue lo que se cura de lo que se busca. */
  readonly danino: boolean;
  /** Una línea explicando qué hace, para la ficha de la poción. */
  readonly resumen: string;
  /**
   * Ticks entre pinchazos de daño o de cura. 0 = no hace nada por su cuenta.
   *
   * El ritmo se saca del propio contador que va bajando (`restante % cadencia`),
   * así que un efecto no necesita guardar un segundo reloj. Menos estado, menos
   * cosas que sincronizar al guardar la partida.
   */
  readonly cadencia: number;
  /** Vida que quita cada cadencia. Negativo = cura. */
  readonly puntos: number;
  /**
   * Puede matar.
   *
   * El veneno no. Morir por un daño que ya no puedes evitar —el bicho que te
   * envenenó puede estar muerto hace diez segundos— se lee como una injusticia,
   * no como un error propio. Dejarlo a un punto de vida convierte el veneno en
   * lo que tiene que ser: una carrera para curarse, no una sentencia.
   */
  readonly letal: boolean;
  /** Multiplica la velocidad de movimiento. */
  readonly velocidad: number;
  /** Multiplica el impulso del salto. */
  readonly salto: number;
  /** Multiplica el daño cuerpo a cuerpo. */
  readonly dano: number;
  /** Suma a la defensa, como una pieza de armadura más. */
  readonly defensa: number;
  /** Multiplica lo deprisa que se gasta el aire bajo el agua. */
  readonly aire: number;
  /** Multiplica lo deprisa que se pica. */
  readonly minado: number;
  readonly desde: string;
}

function efecto(
  nombre: string,
  color: string,
  danino: boolean,
  resumen: string,
  extra: Partial<DefEfecto> = {},
): DefEfecto {
  return {
    nombre,
    color,
    danino,
    resumen,
    cadencia: 0,
    puntos: 0,
    letal: true,
    velocidad: 1,
    salto: 1,
    dano: 1,
    defensa: 0,
    aire: 1,
    minado: 1,
    desde: '6.9.0',
    ...extra,
  };
}

export const EFECTOS: Readonly<Record<ClaseEfecto, DefEfecto>> = {
  // Los tres que se sufren.
  ardiendo: efecto('ardiendo', '#f07a2a', true, 'Quema cada medio segundo', {
    cadencia: 30,
    puntos: 4,
  }),
  veneno: efecto('envenenado', '#7fbf4a', true, 'Va quitando vida, pero no mata', {
    cadencia: 40,
    puntos: 3,
    letal: false,
  }),
  congelado: efecto('congelado', '#8fd6f0', true, 'Te mueves y saltas peor', {
    velocidad: 0.55,
    salto: 0.85,
  }),
  // Los cuatro que se buscan.
  regeneracion: efecto('regeneración', '#e0538f', false, 'Recupera vida poco a poco', {
    cadencia: 45,
    puntos: -4,
  }),
  fuerza: efecto('fuerza', '#e8b33c', false, 'Pegas un tercio más fuerte', {
    dano: 1.35,
  }),
  pielDePiedra: efecto('piel de piedra', '#9b9b93', false, 'Seis puntos más de defensa', {
    defensa: 6,
  }),
  ligereza: efecto('ligereza', '#a7e8c0', false, 'Corres y saltas más', {
    velocidad: 1.2,
    salto: 1.12,
  }),
  // Los dos de 7.3.0. Los dos existen por lo mismo: había dos ratos del juego
  // en los que lo único que se podía hacer era esperar —bucear y picar un muro
  // de obsidiana— y no había nada que gastar para acortarlos.
  agallas: efecto('agallas', '#6fc4e0', false, 'El aire te dura el triple', {
    aire: 0.33,
    desde: '7.3.0',
  }),
  brio: efecto('brío', '#e8b04a', false, 'Picas la mitad más deprisa', {
    minado: 1.5,
    desde: '7.3.0',
  }),
};

export const CLASES_EFECTO = Object.keys(EFECTOS) as ClaseEfecto[];

/**
 * Los efectos en un orden fijo, para poder mandarlos por la red en un byte.
 *
 * Escrito a mano y no sacado de `Object.keys`, que es lo que hace `CLASES_EFECTO`
 * unas líneas más arriba: para recorrerlos aquí dentro da igual el orden, pero
 * para mandarlos no, porque el número tiene que significar lo mismo en los dos
 * navegadores. Lo nuevo se añade **al final**.
 */
export const ORDEN_EFECTOS: readonly ClaseEfecto[] = [
  'ardiendo',
  'veneno',
  'congelado',
  'regeneracion',
  'fuerza',
  'pielDePiedra',
  'ligereza',
  'agallas',
  'brio',
];

/** El efecto en un número, empezando por 1. Cero no es ninguno. */
export function numeroDeEfecto(clase: ClaseEfecto): number {
  return ORDEN_EFECTOS.indexOf(clase) + 1;
}

/** Devuelve null si el número no es de ninguno: llega de fuera y no se fía. */
export function efectoDeNumero(n: number): ClaseEfecto | null {
  return ORDEN_EFECTOS[n - 1] ?? null;
}

/** Cuánto duran las cosas, en ticks. */
export const DURACION = {
  /** Lo que sigue ardiendo uno después de salir de la lava. */
  lava: 60 * 4,
  /** Lo que dura un efecto bebido. Un minuto: cabe una cueva entera. */
  pocion: 60 * 60,
  /** La regeneración dura menos porque además cura. */
  pocionCorta: 60 * 30,
  /** Lo que congela un ataque de nieve o envenena una araña. */
  ataque: 60 * 5,
} as const;

/** Ticks que le quedan a cada efecto. Los que no están, no están. */
export type Efectos = Partial<Record<ClaseEfecto, number>>;

export function crearEfectos(): Efectos {
  return {};
}

/**
 * Pone un efecto, o alarga el que ya había.
 *
 * Se queda con el más largo de los dos en vez de sumarlos. Sumar convierte
 * cualquier fuente repetida —estar dentro de la lava, una tanda de flechas de
 * fuego— en un efecto de diez minutos, y a partir de ahí el estado deja de ser
 * temporal, que es lo único que lo hacía interesante.
 */
export function aplicarEfecto(ef: Efectos, clase: ClaseEfecto, ticks: number): void {
  if (ticks <= 0) return;
  ef[clase] = Math.max(ef[clase] ?? 0, ticks);
}

export function tieneEfecto(ef: Efectos, clase: ClaseEfecto): boolean {
  return (ef[clase] ?? 0) > 0;
}

export function quitarEfecto(ef: Efectos, clase: ClaseEfecto): void {
  delete ef[clase];
}

/** Quita todo lo malo. Es lo que hace la poción de remedio. */
export function limpiarDaninos(ef: Efectos): ClaseEfecto[] {
  const quitados: ClaseEfecto[] = [];
  for (const clase of CLASES_EFECTO) {
    if (!EFECTOS[clase].danino || !tieneEfecto(ef, clase)) continue;
    quitarEfecto(ef, clase);
    quitados.push(clase);
  }
  return quitados;
}

/** Se van todos. Al morir y al revivir no se arrastra nada. */
export function limpiarEfectos(ef: Efectos): void {
  for (const clase of CLASES_EFECTO) delete ef[clase];
}

export interface TickEfectos {
  /** Daño que puede matar. */
  dano: number;
  /** Daño que deja siempre con al menos un punto de vida. */
  danoSuave: number;
  curacion: number;
  /** Los que se han acabado en este tick, para poder avisar. */
  terminados: ClaseEfecto[];
}

/**
 * Un tick de todos los efectos. Devuelve lo que hay que aplicarle a la vida;
 * no toca la salud directamente para que valga igual con el jugador y con un
 * bicho, que llevan la vida en sitios distintos.
 */
export function tickEfectos(ef: Efectos): TickEfectos {
  const salida: TickEfectos = { dano: 0, danoSuave: 0, curacion: 0, terminados: [] };
  for (const clase of CLASES_EFECTO) {
    const restante = ef[clase];
    if (restante === undefined) continue;
    const def = EFECTOS[clase];
    if (def.cadencia > 0 && restante % def.cadencia === 0) {
      if (def.puntos < 0) salida.curacion += -def.puntos;
      else if (def.letal) salida.dano += def.puntos;
      else salida.danoSuave += def.puntos;
    }
    if (restante <= 1) {
      delete ef[clase];
      salida.terminados.push(clase);
    } else {
      ef[clase] = restante - 1;
    }
  }
  return salida;
}

/** Producto de todos los multiplicadores de velocidad activos. */
export function multiplicadorVelocidad(ef: Efectos): number {
  return producto(ef, (d) => d.velocidad);
}

export function multiplicadorSalto(ef: Efectos): number {
  return producto(ef, (d) => d.salto);
}

/** Cuánto se multiplica el gasto de aire. Menos de uno es que dura más. */
export function multiplicadorAire(ef: Efectos): number {
  return producto(ef, (d) => d.aire);
}

export function multiplicadorMinado(ef: Efectos): number {
  return producto(ef, (d) => d.minado);
}

export function multiplicadorDano(ef: Efectos): number {
  return producto(ef, (d) => d.dano);
}

/** Defensa que suman los efectos, encima de la de la armadura. */
export function defensaExtra(ef: Efectos): number {
  let total = 0;
  for (const clase of CLASES_EFECTO) {
    if (tieneEfecto(ef, clase)) total += EFECTOS[clase].defensa;
  }
  return total;
}

function producto(ef: Efectos, saca: (d: DefEfecto) => number): number {
  let total = 1;
  for (const clase of CLASES_EFECTO) {
    if (tieneEfecto(ef, clase)) total *= saca(EFECTOS[clase]);
  }
  return total;
}

export interface EfectoActivo {
  clase: ClaseEfecto;
  restante: number;
}

/** Lo que está puesto ahora mismo, para pintarlo. Los dañinos primero. */
export function efectosActivos(ef: Efectos): EfectoActivo[] {
  const lista: EfectoActivo[] = [];
  for (const clase of CLASES_EFECTO) {
    const restante = ef[clase];
    if (restante !== undefined && restante > 0) lista.push({ clase, restante });
  }
  lista.sort((a, b) => Number(EFECTOS[b.clase].danino) - Number(EFECTOS[a.clase].danino));
  return lista;
}

/** Segundos que quedan, redondeados hacia arriba, para el distintivo. */
export function segundos(ticks: number): number {
  return Math.ceil(ticks / 60);
}

/**
 * Diez niveles de dificultad, de pacífico a "tú lo has querido".
 *
 * Se elige al crear el mundo y se guarda con él: cambiarla a mitad de partida
 * convertiría la elección en un botón de tramposo, y el sentido de escoger
 * "brutal" es que la primera noche dé miedo de verdad y siga dándolo en la
 * décima.
 *
 * Cada nivel mueve cuatro perillas y ninguna más. La tentación era tocar
 * también la generación —menos mineral arriba, más lava abajo— pero eso mezcla
 * dificultad con mundo: dos partidas con la misma semilla y distinta dificultad
 * deben tener el mismo terreno, o la semilla deja de significar nada.
 *
 *   fuerza  — vida y daño de lo hostil.
 *   aforo   — cuántos hostiles caben alrededor. 0 es no ver ninguno.
 *   hambre  — a qué ritmo baja el estómago.
 *   castigo — daño de caída, lava, ahogo e inanición.
 */

export interface NivelDificultad {
  readonly id: number;
  readonly nombre: string;
  /** Una línea que explica en qué se nota, para el menú. */
  readonly resumen: string;
  readonly fuerza: number;
  readonly aforo: number;
  readonly hambre: number;
  readonly castigo: number;
}

export const DIFICULTADES: readonly NivelDificultad[] = [
  {
    id: 0,
    nombre: 'pacífico',
    resumen: 'Nada te ataca. Solo construir y explorar.',
    fuerza: 0,
    aforo: 0,
    hambre: 0,
    castigo: 0.5,
  },
  {
    id: 1,
    nombre: 'tranquilo',
    resumen: 'Hay bichos, pero apenas molestan.',
    fuerza: 0.4,
    aforo: 0.5,
    hambre: 0.5,
    castigo: 0.6,
  },
  {
    id: 2,
    nombre: 'fácil',
    resumen: 'Se puede aprender sin que te maten por probar.',
    fuerza: 0.65,
    aforo: 0.75,
    hambre: 0.75,
    castigo: 0.8,
  },
  {
    id: 3,
    nombre: 'normal',
    resumen: 'Como está pensado el juego.',
    fuerza: 1,
    aforo: 1,
    hambre: 1,
    castigo: 1,
  },
  {
    id: 4,
    nombre: 'curtido',
    resumen: 'La primera noche ya no es un trámite.',
    fuerza: 1.3,
    aforo: 1.15,
    hambre: 1.15,
    castigo: 1.1,
  },
  {
    id: 5,
    nombre: 'difícil',
    resumen: 'Bajar a la cueva sin armadura es mala idea.',
    fuerza: 1.7,
    aforo: 1.3,
    hambre: 1.3,
    castigo: 1.25,
  },
  {
    id: 6,
    nombre: 'muy difícil',
    resumen: 'Pegan el doble y vienen de tres en tres.',
    fuerza: 2.2,
    aforo: 1.6,
    hambre: 1.5,
    castigo: 1.4,
  },
  {
    id: 7,
    nombre: 'brutal',
    resumen: 'Un descuido cuesta la partida.',
    fuerza: 2.9,
    aforo: 1.9,
    hambre: 1.75,
    castigo: 1.6,
  },
  {
    id: 8,
    nombre: 'infernal',
    resumen: 'Comer y curarse pasa a ser el juego entero.',
    fuerza: 3.8,
    aforo: 2.2,
    hambre: 2,
    castigo: 1.8,
  },
  {
    id: 9,
    nombre: 'tú lo has querido',
    resumen: 'Avisado quedas.',
    fuerza: 5,
    aforo: 2.6,
    hambre: 2.4,
    castigo: 2.2,
  },
];

export const DIFICULTAD_POR_DEFECTO = 3;

/** Nivel por id, con normal como red de seguridad ante un guardado raro. */
export function dificultad(id: number): NivelDificultad {
  return DIFICULTADES[id] ?? DIFICULTADES[DIFICULTAD_POR_DEFECTO]!;
}

/** ¿Este nivel deja aparecer enemigos hostiles? */
export function hayHostiles(d: NivelDificultad): boolean {
  return d.aforo > 0 && d.fuerza > 0;
}

/**
 * ¿En este mundo se pueden pegar dos jugadores?
 *
 * De «normal» en adelante. Se pregunta por la fuerza y no por el id porque la
 * fuerza es lo que significa el nivel: 1 es «lo hostil pega lo que tiene que
 * pegar», y los tres niveles de debajo existen para poder aprender sin que te
 * maten. Un mundo donde el juego te está perdonando no es sitio para duelos.
 *
 * Esto solo dice si el mundo lo permite. Que dos se peguen de verdad pide
 * además que los dos lo hayan encendido: ver `duelo` en `main.ts`. Son dos
 * puertas y hacen falta las dos, porque responden a preguntas distintas —«¿qué
 * clase de mundo es este?» y «¿qué queremos hacer hoy?»— y la primera se
 * contesta al crearlo y ya no se puede cambiar.
 */
export function hayDuelo(d: NivelDificultad): boolean {
  return d.fuerza >= 1;
}

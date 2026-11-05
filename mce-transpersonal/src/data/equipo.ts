/**
 * Equipo de MCE.
 *
 * Las fotos van en public/images/equipo/ (retratos) y se enlazan en `foto`.
 * Si una foto llega con poca resolución, `npm run fotos` lo avisa por consola:
 * mejor pedir el original que ampliarla.
 */

import { betty } from './textos';

export type Miembro = {
  nombre: string;
  rol?: string;
  /** Ruta dentro de /public, p. ej. '/images/equipo/nombre-apellido.jpg' */
  foto?: string;
};

/** Número de disciplinas del equipo (solo la cifra de Inicio; no se nombran en la web). */
export const numeroDisciplinas = 4;

export const equipo = {
  // Texto de presentación del equipo (literal, de la escuela). Si es null, no se muestra.
  presentacion: null as string | null,

  miembros: [
    // La foto de Betty se define una sola vez, en textos.ts → betty.foto.
    { nombre: betty.nombre, rol: betty.rol, foto: betty.foto ?? undefined },
    // TODO: resto del equipo (nombre, rol y foto) cuando llegue la lista.
  ] as Miembro[],
};

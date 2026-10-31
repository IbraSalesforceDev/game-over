import { useSyncExternalStore } from 'react';
import { contacto, legales, menu } from '../data/navegacion';
import { prefiereMenosMovimiento } from './utilidades';

/**
 * Estado compartido de las transiciones:
 * - el nombre de la página de destino (lo muestra la cortina);
 * - cuánto deben esperar las animaciones de entrada de la página
 *   (la primera vez, a que termine la intro; después, a que se abra la cortina).
 */

const nombres: Record<string, string> = Object.fromEntries(
  [...menu, contacto, ...legales].map((e) => [e.ruta, e.nombre]),
);

let destino = '';
const oyentes = new Set<() => void>();

export function fijarDestino(ruta: string) {
  const nombre = nombres[ruta] ?? 'MCE';
  if (nombre === destino) return;
  destino = nombre;
  oyentes.forEach((o) => o());
}

export function useDestino() {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => destino,
  );
}

// ── Intro de la primera visita (una vez por sesión) ─────────────────────
const CLAVE_INTRO = 'mce-intro-vista';

function decidirIntro(): boolean {
  if (typeof window === 'undefined' || prefiereMenosMovimiento()) return false;
  try {
    if (window.sessionStorage.getItem(CLAVE_INTRO)) return false;
    window.sessionStorage.setItem(CLAVE_INTRO, '1');
  } catch {
    /* sin almacenamiento: se muestra igualmente */
  }
  return true;
}

export const hayIntro = decidirIntro();
/** Duración de la intro en segundos. */
export const DURACION_INTRO = 2.6;

let primeraEntrada = true;

/**
 * Retraso (s) que deben sumar las animaciones de entrada de una página.
 * Se consulta una vez al montar cada página.
 */
export function tomarRetrasoEntrada(): number {
  if (primeraEntrada) {
    primeraEntrada = false;
    return hayIntro ? DURACION_INTRO - 0.3 : 0;
  }
  return prefiereMenosMovimiento() ? 0 : 0.55;
}

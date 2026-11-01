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

// ── Formación del logo (primera visita a Inicio, una vez por sesión) ─────
const CLAVE_INTRO = 'mce-intro-vista';

/** ¿La web se ha abierto directamente en Inicio? (vale para rutas normales y con #) */
function abreEnInicio(): boolean {
  const { pathname, hash } = window.location;
  if (hash.startsWith('#/')) return hash === '#/' || hash.startsWith('#/?') || hash.startsWith('#/#');
  return pathname === '/' || pathname.endsWith('/index.html');
}

function decidirIntro(): boolean {
  if (typeof window === 'undefined' || prefiereMenosMovimiento() || !abreEnInicio()) return false;
  try {
    if (window.sessionStorage.getItem(CLAVE_INTRO)) return false;
    window.sessionStorage.setItem(CLAVE_INTRO, '1');
  } catch {
    /* sin almacenamiento: se muestra igualmente */
  }
  return true;
}

/** true: al abrir la web, las partículas forman el logo desde cero. */
export const hayIntro = decidirIntro();
/** Duración de la formación del logo, en segundos. */
export const DURACION_INTRO = 3.6;

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

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

// ── Formación del logo (cada vez que se carga la web en Inicio) ─────

/**
 * ¿La web está en Inicio? Vale para rutas normales y con #.
 * En la versión de un solo archivo las rutas van tras el #, así que el nombre
 * del archivo da igual (MCE-Transpersonal.html, index.html, "… (1).html"):
 * sin ruta tras el # es Inicio.
 */
export function enInicio(): boolean {
  const { pathname, hash } = window.location;
  if (hash.startsWith('#/')) return hash === '#/' || hash.startsWith('#/?') || hash.startsWith('#/#');
  if (import.meta.env.MODE === 'archivo') return true;
  return pathname === '/' || pathname.endsWith('/index.html');
}

function decidirIntro(): boolean {
  if (typeof window === 'undefined' || prefiereMenosMovimiento() || !enInicio()) return false;
  // Se ve cada vez que se abre o se recarga la web en Inicio
  // (no al volver a Inicio navegando dentro de la web).
  return true;
}

/** true: al abrir la web, las partículas forman el logo desde cero. */
export const hayIntro = decidirIntro();

let introPendiente = hayIntro;
/** Devuelve true solo la primera vez (la formación no se repite al volver a Inicio). */
export function tomarIntro(): boolean {
  const v = introPendiente;
  introPendiente = false;
  return v;
}

// Vuelta atrás/adelante del navegador desde otra web: el navegador puede
// restaurar la página tal cual la dejó (bfcache) sin volver a ejecutarla.
// En ese caso se avisa a la portada para que forme el logo otra vez.
let vueltas = 0;
const oyentesVuelta = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted || prefiereMenosMovimiento() || !enInicio()) return;
    introPendiente = true;
    vueltas++;
    oyentesVuelta.forEach((o) => o());
  });
}
/** Cambia cada vez que la página vuelve desde la caché del navegador. */
export function useVueltaDesdeCache() {
  return useSyncExternalStore(
    (o) => {
      oyentesVuelta.add(o);
      return () => oyentesVuelta.delete(o);
    },
    () => vueltas,
  );
}

// Estado "la intro se está formando" (la cabecera se oculta mientras tanto).
let introActiva = false;
const oyentesIntro = new Set<() => void>();
export function fijarIntroActiva(v: boolean) {
  if (introActiva === v) return;
  introActiva = v;
  oyentesIntro.forEach((o) => o());
}
export function useIntroActiva() {
  return useSyncExternalStore(
    (o) => {
      oyentesIntro.add(o);
      return () => oyentesIntro.delete(o);
    },
    () => introActiva,
  );
}
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

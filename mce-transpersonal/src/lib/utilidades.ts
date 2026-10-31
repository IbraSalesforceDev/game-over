import { useEffect } from 'react';
import { escuela } from '../data/escuela';

/** Título de la pestaña por página. */
export function useTitulo(titulo?: string) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${escuela.nombre}` : `${escuela.nombre} · ${escuela.lema}`;
  }, [titulo]);
}

/** "Betty Merino" → "BM" */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter((p) => p.length > 2 || /^[A-ZÁÉÍÓÚÑ]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function prefiereMenosMovimiento(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Desplaza hasta un ancla. Reintenta unos fotogramas por si la página
 * aún se está montando (tras la transición entre rutas).
 */
export function irAlAncla(hash: string, suave = true) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return;
  let intentos = 0;
  const buscar = () => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: suave && !prefiereMenosMovimiento() ? 'smooth' : 'auto', block: 'start' });
      if (el.tabIndex < 0 && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
      return;
    }
    if (intentos++ < 20) requestAnimationFrame(buscar);
  };
  requestAnimationFrame(buscar);
}

export const cx = (...clases: (string | false | null | undefined)[]) => clases.filter(Boolean).join(' ');

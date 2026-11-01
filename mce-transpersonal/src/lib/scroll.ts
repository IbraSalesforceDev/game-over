import Lenis from 'lenis';

const prefiereMenosMovimiento = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Desplazamiento suave de toda la página (Lenis). Con "reducir movimiento"
 * no se activa y la página se desplaza de forma nativa.
 * En pantallas táctiles se mantiene el scroll nativo del sistema.
 */
let lenis: Lenis | null = null;
/** Si se pide bloquear antes de que exista Lenis, se aplica al crearlo. */
let bloqueoPendiente = false;

export function iniciarScroll(): () => void {
  if (prefiereMenosMovimiento() || lenis) return () => {};
  lenis = new Lenis({ autoRaf: true, lerp: 0.085, wheelMultiplier: 0.95, anchors: false });
  if (bloqueoPendiente) lenis.stop();
  return () => {
    lenis?.destroy();
    lenis = null;
  };
}

/** Bloquea el scroll (menús y modales). */
export function detenerScroll() {
  bloqueoPendiente = true;
  lenis?.stop();
}

export function reanudarScroll() {
  bloqueoPendiente = false;
  lenis?.start();
}

/** Desplaza a un elemento o posición, con o sin animación. */
export function irA(destino: Element | number, { inmediato = false, desfase = -96 } = {}) {
  if (lenis) {
    // Lenis ya descuenta el scroll-padding-top del documento: se compensa
    // para que `desfase` signifique lo mismo con y sin desplazamiento suave.
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    lenis.scrollTo(destino as HTMLElement | number, {
      offset: typeof destino === 'number' ? 0 : desfase + padding,
      immediate: inmediato,
      duration: 1.4,
      force: true,
    });
    return;
  }
  if (typeof destino === 'number') {
    window.scrollTo({ top: destino, behavior: inmediato ? 'auto' : 'smooth' });
  } else {
    const y = destino.getBoundingClientRect().top + window.scrollY + desfase;
    window.scrollTo({ top: y, behavior: inmediato || prefiereMenosMovimiento() ? 'auto' : 'smooth' });
  }
}

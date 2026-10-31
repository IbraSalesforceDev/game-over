import { useEffect, useId, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconoCerrar } from './Iconos';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';

/**
 * Ventana modal accesible: bloquea el scroll de fondo, se cierra con Esc o
 * pulsando fuera, mantiene el foco dentro y lo devuelve al cerrar.
 */
export default function Modal({
  abierto,
  alCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const idTitulo = useId();
  const panel = useRef<HTMLDivElement>(null);
  const previo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    previo.current = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detenerScroll();
    requestAnimationFrame(() => panel.current?.focus());

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        alCerrar();
      }
      if (e.key === 'Tab' && panel.current) {
        const focos = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]');
        const primero = focos[0];
        const ultimo = focos[focos.length - 1];
        if (!primero || !ultimo) return;
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel.current)) {
          e.preventDefault();
          ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
          e.preventDefault();
          primero.focus();
        }
      }
    };
    document.addEventListener('keydown', alTeclear, true);
    return () => {
      document.body.style.overflow = overflow;
      reanudarScroll();
      document.removeEventListener('keydown', alTeclear, true);
      previo.current?.focus?.();
    };
  }, [abierto, alCerrar]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-carbon/45 backdrop-blur-[2px]" onClick={alCerrar} />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            tabIndex={-1}
            className="relative flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-marfil shadow-[0_30px_80px_-20px_rgba(46,42,38,0.45)] outline-none sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="filete flex items-center justify-between gap-4 border-b px-6 py-4 sm:px-8">
              <h2 id={idTitulo} className="text-xl sm:text-2xl">
                {titulo}
              </h2>
              <button
                onClick={alCerrar}
                className="-mr-2 rounded-full p-2 text-carbon-suave transition-colors hover:bg-lino hover:text-carbon"
                aria-label="Cerrar ventana"
              >
                <IconoCerrar className="h-6 w-6" />
              </button>
            </div>
            <div data-lenis-prevent className="overflow-y-auto overscroll-contain px-6 pb-10 sm:px-8">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

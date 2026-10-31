import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion';
import { prefiereMenosMovimiento } from '../../lib/utilidades';

/**
 * Cursor acompañante (solo ratón): un aro que sigue al puntero con retardo,
 * crece sobre enlaces y muestra una etiqueta en elementos con `data-cursor`.
 * El cursor del sistema se mantiene visible.
 */
export default function Cursor() {
  const [activo, setActivo] = useState(false);
  const [modo, setModo] = useState<'normal' | 'enlace' | 'texto'>('normal');
  const [etiqueta, setEtiqueta] = useState('');
  const [dentro, setDentro] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 380, damping: 32, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 380, damping: 32, mass: 0.6 });

  useEffect(() => {
    const fino = window.matchMedia('(pointer: fine)').matches;
    if (!fino || prefiereMenosMovimiento()) return;
    setActivo(true);

    const mover = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setDentro(true);
    };
    const sobre = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-cursor], a, button, label, select, input, textarea');
      if (!el) {
        setModo('normal');
        return;
      }
      const texto = el.dataset.cursor;
      if (texto) {
        setEtiqueta(texto);
        setModo('texto');
      } else setModo('enlace');
    };
    const salir = () => setDentro(false);

    window.addEventListener('pointermove', mover, { passive: true });
    window.addEventListener('pointerover', sobre, { passive: true });
    document.documentElement.addEventListener('pointerleave', salir);
    return () => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerover', sobre);
      document.documentElement.removeEventListener('pointerleave', salir);
    };
  }, [x, y]);

  if (!activo) return null;

  const tam = modo === 'texto' ? 92 : modo === 'enlace' ? 54 : 30;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[100] hidden md:block"
      style={{ x: sx, y: sy }}
      animate={{ opacity: dentro ? 1 : 0 }}
    >
      <motion.div
        className="flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border"
        animate={{
          width: tam,
          height: tam,
          backgroundColor: modo === 'texto' ? 'rgba(42,38,34,0.92)' : modo === 'enlace' ? 'rgba(194,154,62,0.14)' : 'rgba(194,154,62,0)',
          borderColor: modo === 'texto' ? 'rgba(42,38,34,0)' : 'rgba(122,90,20,0.55)',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      >
        <AnimatePresence>
          {modo === 'texto' && (
            <motion.span
              key={etiqueta}
              className="text-[0.72rem] font-medium uppercase tracking-[0.14em] text-marfil"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
            >
              {etiqueta}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

import { useEffect, useRef } from 'react';
import { NavLink } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';

import { contacto, menu } from '../../data/navegacion';
import { escuela } from '../../data/escuela';
import { cx } from '../../lib/utilidades';
import { Mancha } from '../anim/Trazo';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';

const enlaces = [...menu, contacto];

/** Menú a pantalla completa para móvil y tableta. */
export default function MenuMovil({ abierto, alCerrar }: { abierto: boolean; alCerrar: () => void }) {
  const lista = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    detenerScroll();
    const t = window.setTimeout(() => lista.current?.querySelector('a')?.focus(), 350);
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = overflow;
      reanudarScroll();
      window.clearTimeout(t);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto, alCerrar]);

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          id="menu-movil"
          data-lenis-prevent
          className="fixed inset-0 z-[49] overflow-y-auto bg-lino lg:hidden"
          initial={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2.75rem)' }}
          animate={{ clipPath: 'circle(150% at calc(100% - 2.5rem) 2.75rem)' }}
          exit={{ clipPath: 'circle(0% at calc(100% - 2.5rem) 2.75rem)', transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1], delay: 0.1 } }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
        >
          <Mancha className="-right-40 top-1/3 h-[30rem] w-[30rem] opacity-60" />
          <nav aria-label="Menú" className="marco relative flex min-h-full flex-col pb-10 pt-28">
            <ul ref={lista} className="flex flex-col">
              {enlaces.map((e, i) => (
                <motion.li
                  key={e.ruta}
                  className="filete border-b first:border-t"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.06, duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                >
                  <NavLink to={e.ruta} end onClick={alCerrar} className="group flex items-baseline gap-5 py-4">
                    {({ isActive }) => (
                      <>
                        <span className="w-6 font-serif text-sm italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
                        <span
                          className={cx(
                            'font-serif text-[clamp(2rem,9vw,3.25rem)] leading-none transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-2',
                            isActive && 'italic',
                          )}
                        >
                          {e.nombre}
                        </span>
                        {isActive && <span className="ml-auto h-2 w-2 self-center rounded-full bg-dorado" aria-hidden />}
                      </>
                    )}
                  </NavLink>
                </motion.li>
              ))}
            </ul>
            <motion.p
              className="mt-auto pt-12 font-serif text-lg italic text-carbon-suave"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.7 } }}
              exit={{ opacity: 0 }}
            >
              {escuela.lema}
            </motion.p>
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

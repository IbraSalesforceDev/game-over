import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DURACION_INTRO, hayIntro } from '../../lib/transicion';
import { detenerScroll, reanudarScroll } from '../../lib/scroll';
import Mecedora from './Mecedora';

const palabras = ['Mente', 'Cuerpo', 'Espíritu'];
const ease = [0.76, 0, 0.24, 1] as const;

/**
 * Intro de la primera visita (una vez por sesión): la mecedora se dibuja,
 * aparecen las tres palabras y el telón sube curvándose.
 * No aparece con "reducir movimiento".
 */
export default function Intro() {
  const [visible, setVisible] = useState(hayIntro);

  useEffect(() => {
    if (!visible) return;
    detenerScroll();
    document.documentElement.style.overflow = 'hidden';
    const t = window.setTimeout(() => setVisible(false), (DURACION_INTRO - 0.85) * 1000);
    return () => {
      window.clearTimeout(t);
      document.documentElement.style.overflow = '';
      reanudarScroll();
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-marfil"
          exit={{
            y: '-101%',
            borderBottomLeftRadius: '50% 20vh',
            borderBottomRightRadius: '50% 20vh',
            transition: { duration: 0.95, ease },
          }}
        >
          <motion.div exit={{ y: -60, opacity: 0, transition: { duration: 0.5 } }} className="flex flex-col items-center">
            <Mecedora className="w-40 text-carbon sm:w-48" mecer={false} />
            <div className="mt-6 flex gap-4 font-serif text-[1.35rem] italic text-carbon-suave sm:gap-6 sm:text-[1.6rem]">
              {palabras.map((p, i) => (
                <span key={p} className="overflow-hidden">
                  <motion.span
                    className="inline-block"
                    initial={{ y: '110%' }}
                    animate={{ y: '0%' }}
                    transition={{ duration: 0.8, delay: 0.55 + i * 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {p}
                    {i < palabras.length - 1 && <span className="ml-4 text-dorado sm:ml-6">·</span>}
                  </motion.span>
                </span>
              ))}
            </div>
            <motion.span
              className="mt-10 block h-px w-40 origin-left bg-dorado"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: DURACION_INTRO - 1.1, ease: 'linear', delay: 0.2 }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

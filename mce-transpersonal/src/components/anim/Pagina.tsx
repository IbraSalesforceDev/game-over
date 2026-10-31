import { useEffect, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTitulo } from '../../lib/utilidades';

/**
 * Envoltorio de cada página. Al salir, una cortina color carbón sube desde
 * abajo y tapa la página; al entrar la nueva, la cortina se retira hacia
 * arriba. Con "reducir movimiento" solo hay un fundido corto.
 */
/** En la primera carga no hay cortina: solo al navegar entre páginas. */
let primeraPagina = true;

export default function Pagina({ titulo, children }: { titulo?: string; children: ReactNode }) {
  useTitulo(titulo);
  const reducido = useReducedMotion();
  const conCortina = !primeraPagina;
  useEffect(() => {
    primeraPagina = false;
  }, []);

  return (
    <motion.main
      id="contenido"
      tabIndex={-1}
      className="relative outline-none"
      initial={{ opacity: conCortina ? 0 : 1 }}
      animate={{ opacity: 1, transition: { duration: reducido ? 0.2 : 0.5, delay: reducido ? 0 : 0.15 } }}
      exit={{ opacity: reducido ? 0 : 1, transition: { duration: reducido ? 0.15 : 0.55 } }}
    >
      {!reducido && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[70] bg-carbon"
          initial={{ scaleY: conCortina ? 1 : 0, originY: 0 }}
          animate={{
            scaleY: 0,
            originY: 0,
            transition: { scaleY: { duration: 0.7, ease: [0.76, 0, 0.24, 1], delay: 0.05 }, originY: { duration: 0 } },
          }}
          exit={{
            scaleY: [0, 1],
            originY: 1,
            transition: { scaleY: { duration: 0.55, ease: [0.76, 0, 0.24, 1] }, originY: { duration: 0 } },
          }}
        >
          <span className="absolute inset-x-0 top-0 h-px bg-dorado/70" />
        </motion.div>
      )}
      {children}
    </motion.main>
  );
}

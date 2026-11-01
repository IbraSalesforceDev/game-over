import { motion } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/**
 * Rótulo de sección: texto pequeño con un punto de color. Al entrar en
 * pantalla, el punto crece y el texto se desliza suavemente.
 * (`numero` se acepta por compatibilidad pero no se muestra.)
 */
export default function Etiqueta({
  children,
  className,
  color = 'bg-dorado',
}: {
  numero?: string;
  children: string;
  className?: string;
  color?: string;
}) {
  return (
    <p className={cx('etiqueta flex items-center gap-3', className)}>
      <motion.span
        aria-hidden
        className={cx('h-2.5 w-2.5 rounded-full', color)}
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
      />
      <motion.span
        initial={{ opacity: 0, x: -8 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </p>
  );
}

import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { cx } from '../../lib/utilidades';
import type { FotoReal } from '../../data/fotos';

/**
 * Foto real con tratamiento editorial: se descubre de abajo arriba al entrar
 * en pantalla, se desplaza levemente con el scroll y lleva pie de foto.
 */
export default function FotoEditorial({
  foto,
  pie,
  className,
  proporcion = 'aspect-[4/5]',
  prioridad = false,
  posicion = 'object-center',
}: {
  foto: FotoReal;
  pie?: string;
  className?: string;
  proporcion?: string;
  prioridad?: boolean;
  posicion?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);

  return (
    <figure ref={ref} className={cx('relative', className)}>
      <motion.div
        className={cx('relative overflow-hidden rounded-[6px] bg-lino', proporcion)}
        initial={reducido ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
        whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      >
        <motion.img
          src={foto.src}
          alt={foto.alt}
          width={foto.ancho}
          height={foto.alto}
          loading={prioridad ? 'eager' : 'lazy'}
          decoding="async"
          style={reducido ? undefined : { y, scale: 1.14 }}
          className={cx('absolute inset-0 h-full w-full object-cover', posicion)}
        />
      </motion.div>
      {pie && (
        <motion.figcaption
          className="mt-3 flex items-baseline gap-3 text-[0.85rem] text-carbon-suave"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <span aria-hidden className="h-px w-6 translate-y-[-0.3em] bg-oro" />
          {pie}
        </motion.figcaption>
      )}
    </figure>
  );
}

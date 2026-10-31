import { motion } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/** Numeración editorial: "01 — La escuela", con un filete que se extiende. */
export default function Etiqueta({ numero, children, className }: { numero?: string; children: string; className?: string }) {
  return (
    <div className={cx('etiqueta flex items-center gap-4', className)}>
      {numero && <span className="font-serif text-[0.95rem] tracking-normal text-dorado-hondo normal-case italic">{numero}</span>}
      <motion.span
        aria-hidden
        className="h-px w-10 origin-left bg-current opacity-40"
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
      <span>{children}</span>
    </div>
  );
}

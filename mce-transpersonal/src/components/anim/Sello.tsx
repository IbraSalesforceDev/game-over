import { useId, type ReactNode } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/** Sello circular con texto que gira despacio (y un poco más al hacer scroll). */
export default function Sello({ texto, className, children }: { texto: string; className?: string; children?: ReactNode }) {
  const id = useId().replace(/:/g, '');
  const reducido = useReducedMotion();
  const { scrollY } = useScroll();
  const giroScroll = useTransform(scrollY, [0, 1500], [0, 140]);

  return (
    <div className={cx('relative', className)} aria-hidden>
      <motion.div style={reducido ? undefined : { rotate: giroScroll }} className="h-full w-full">
        <svg viewBox="0 0 200 200" className={cx('h-full w-full', !reducido && 'animate-[girar_28s_linear_infinite]')}>
          <defs>
            <path id={id} d="M100 100m-78 0a78 78 0 1 1 156 0a78 78 0 1 1-156 0" />
          </defs>
          <text className="fill-current font-sans text-[13.5px] uppercase tracking-[0.32em]">
            <textPath href={`#${id}`}>{texto}</textPath>
          </text>
        </svg>
      </motion.div>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

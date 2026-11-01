import { motion } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/**
 * Trazos dibujados a mano en SVG. Se dibujan solos al entrar en pantalla.
 * Son irregulares a propósito: es lo que les da el aire artesanal.
 */

const dibujo = (retraso: number, duracion = 1.1) => ({
  initial: { pathLength: 0, opacity: 0 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true },
  transition: {
    pathLength: { duration: duracion, ease: [0.65, 0, 0.35, 1] as const, delay: retraso },
    opacity: { duration: 0.01, delay: retraso },
  },
});

/** Subrayado a mano. Colocar dentro de un elemento `relative`. */
export function Subrayado({ className, retraso = 0.6, color = 'text-oro' }: { className?: string; retraso?: number; color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 300 18"
      preserveAspectRatio="none"
      className={cx('pointer-events-none absolute -bottom-[0.12em] left-[-2%] h-[0.32em] w-[104%] overflow-visible', color, className)}
    >
      <motion.path
        d="M3 11.5C48 6.5 92 4.8 146 7.2c40 1.8 78 2.4 106 .6 17-1.1 31-2.5 45-4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        {...dibujo(retraso, 0.9)}
      />
      <motion.path
        d="M28 15.5c46-3.4 98-4.6 152-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        opacity={0.7}
        {...dibujo(retraso + 0.55, 0.6)}
      />
    </svg>
  );
}

/** Círculo a mano alrededor de una palabra. Colocar dentro de un elemento `relative`. */
export function Circulo({ className, retraso = 0.4, color = 'text-terracota' }: { className?: string; retraso?: number; color?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 320 130"
      preserveAspectRatio="none"
      className={cx('pointer-events-none absolute -inset-x-[12%] -inset-y-[22%] h-[144%] w-[124%] overflow-visible', color, className)}
    >
      <motion.path
        d="M196 14C130 4 52 14 22 44 2 64 12 96 64 112c58 18 164 16 214-6 34-15 42-46 14-70C262 10 182 2 112 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        {...dibujo(retraso, 1.4)}
      />
    </svg>
  );
}

/** Pequeña flecha a mano, para enlaces. */
export function FlechaMano({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 40 16" className={cx('h-[0.7em] w-[1.6em] overflow-visible', className)}>
      <path
        d="M2 8.6c9-.8 20-1 33-.4M28.5 2.5c2.3 2.2 4.6 4 7.2 5.6-2.8 1.5-5 3.4-7 5.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Forma orgánica difusa para fondos. Muy sutil. */
export function Mancha({ className, color = 'fill-dorado-claro' }: { className?: string; color?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 600 600" className={cx('pointer-events-none absolute blur-3xl', className)}>
      <path
        className={color}
        d="M421 74c62 36 118 104 112 178-6 76-74 156-150 196-78 40-164 40-226-6C95 396 56 312 70 236 84 158 150 88 226 62c66-22 133-24 195 12Z"
      />
    </svg>
  );
}

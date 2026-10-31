import { useRef, type ReactNode } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { cx } from '../../lib/utilidades';

const envolver = (min: number, max: number, v: number) => {
  const r = max - min;
  return ((((v - min) % r) + r) % r) + min;
};

/**
 * Cinta de texto infinita. Avanza despacio y acelera (o cambia de sentido)
 * según la velocidad del scroll.
 */
export default function Marquesina({
  elementos,
  velocidad = 2.2,
  className,
  separador,
}: {
  elementos: ReactNode[];
  velocidad?: number;
  className?: string;
  separador?: ReactNode;
}) {
  const reducido = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const factor = useTransform(vel, [0, 1000], [0, 4], { clamp: false });
  const x = useTransform(base, (v) => `${envolver(-50, 0, v)}%`);
  const sentido = useRef(-1);

  useAnimationFrame((_, delta) => {
    if (reducido) return;
    let mov = sentido.current * velocidad * (delta / 1000);
    const f = factor.get();
    if (f < 0) sentido.current = 1;
    else if (f > 0) sentido.current = -1;
    mov += sentido.current * Math.abs(mov) * Math.abs(f);
    base.set(base.get() + mov);
  });

  const tira = (
    <div className="flex shrink-0 items-center">
      {elementos.map((e, i) => (
        <span key={i} className="flex items-center">
          <span className="px-6 sm:px-10">{e}</span>
          {separador}
        </span>
      ))}
    </div>
  );

  return (
    <div className={cx('overflow-hidden whitespace-nowrap', className)} aria-hidden>
      <motion.div className="flex w-max" style={{ x }}>
        {tira}
        {tira}
      </motion.div>
    </div>
  );
}

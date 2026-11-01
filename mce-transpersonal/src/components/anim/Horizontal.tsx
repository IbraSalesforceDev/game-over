import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { cx } from '../../lib/utilidades';

/**
 * Sección fijada en la que el scroll vertical desplaza el contenido en
 * horizontal (solo en pantallas grandes y sin "reducir movimiento").
 * En móvil, o con movimiento reducido, el contenido se apila en vertical.
 */
export default function Horizontal({
  cabecera,
  children,
  className,
}: {
  cabecera?: (progreso: MotionValue<number>) => ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const seccion = useRef<HTMLElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const [distancia, setDistancia] = useState(0);
  const [grande, setGrande] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const medir = () => {
      setGrande(mq.matches);
      if (pista.current) setDistancia(Math.max(0, pista.current.scrollWidth - window.innerWidth));
    };
    medir();
    const ro = new ResizeObserver(medir);
    if (pista.current) ro.observe(pista.current);
    mq.addEventListener('change', medir);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      mq.removeEventListener('change', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  const activo = grande && !reducido;
  const { scrollYProgress } = useScroll({ target: seccion, offset: ['start start', 'end end'] });
  const suave = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const x = useTransform(suave, [0, 1], [0, -distancia]);

  return (
    <section
      ref={seccion}
      className={cx('relative', className)}
      style={activo ? { height: `calc(100vh + ${distancia}px)` } : undefined}
    >
      <div className={cx(activo && 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden')}>
        {cabecera?.(suave)}
        <motion.div ref={pista} style={activo ? { x } : undefined} className={cx(activo ? 'flex w-max' : 'flex flex-col')}>
          {children}
        </motion.div>
      </div>
    </section>
  );
}

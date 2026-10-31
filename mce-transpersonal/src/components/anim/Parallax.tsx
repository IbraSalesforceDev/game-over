import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/** Parallax muy leve: el contenido se desplaza unos pocos píxeles al hacer scroll. */
export default function Parallax({ children, distancia = 40, className }: { children: ReactNode; distancia?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [distancia, -distancia]);

  return (
    <div ref={ref} className={className}>
      <motion.div style={reducido ? undefined : { y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

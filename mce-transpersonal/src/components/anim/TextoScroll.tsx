import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { cx } from '../../lib/utilidades';

function Palabra({ texto, progreso, rango }: { texto: string; progreso: MotionValue<number>; rango: [number, number] }) {
  const opacidad = useTransform(progreso, rango, [0.16, 1]);
  const y = useTransform(progreso, rango, [6, 0]);
  return (
    <span className="relative mr-[0.26em] inline-block">
      <motion.span style={{ opacity: opacidad, y }} className="inline-block">
        {texto}
      </motion.span>
    </span>
  );
}

/**
 * Párrafo cuyas palabras se van iluminando a medida que se hace scroll.
 * Para lectores de pantalla el texto es un párrafo normal.
 */
export default function TextoScroll({ texto, className, como: Etiqueta = 'p' }: { texto: string; className?: string; como?: 'p' | 'h2' }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 82%', 'end 42%'] });
  const palabras = texto.split(' ');

  if (reducido) return <Etiqueta className={className}>{texto}</Etiqueta>;

  return (
    <div ref={ref}>
      <Etiqueta className={cx(className)}>
        <span className="sr-only">{texto}</span>
        <span aria-hidden>
          {palabras.map((p, i) => (
            <Palabra key={i} texto={p} progreso={scrollYProgress} rango={[i / palabras.length, (i + 1) / palabras.length]} />
          ))}
        </span>
      </Etiqueta>
    </div>
  );
}

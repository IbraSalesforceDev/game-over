import { useEffect, useRef, useState } from 'react';
import { animate, useInView, useReducedMotion } from 'framer-motion';

/** Número que cuenta desde 0 al entrar en pantalla. Solo para cifras reales. */
export default function Contador({ valor, className }: { valor: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true, margin: '0px 0px -15% 0px' });
  const reducido = useReducedMotion();
  const [n, setN] = useState(reducido ? valor : 0);

  useEffect(() => {
    if (!visto || reducido) return;
    const c = animate(0, valor, { duration: 1.6, ease: [0.22, 1, 0.36, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [visto, valor, reducido]);

  return (
    <span ref={ref} className={className} aria-label={String(valor)}>
      <span aria-hidden>{n}</span>
    </span>
  );
}

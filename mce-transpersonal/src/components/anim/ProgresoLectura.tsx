import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/** Hilo fino arriba del todo que avanza con la lectura de la página. */
export default function ProgresoLectura() {
  const { scrollYProgress } = useScroll();
  const reducido = useReducedMotion();
  const x = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left bg-gradient-to-r from-dorado via-celeste to-dorado"
      style={{ scaleX: reducido ? scrollYProgress : x }}
    />
  );
}

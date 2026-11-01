import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cx, iniciales } from '../../lib/utilidades';
import Foto from './Foto';

// Tonos suaves que contrastan tanto sobre marfil como sobre lino.
const tonos = [
  'from-dorado-claro to-[#f7f1df] text-dorado-hondo',
  'from-mar-claro to-[#eef3f9] text-salvia-honda',
  'from-arena to-lino text-carbon-suave',
  'from-terracota-clara to-marfil text-terracota-honda',
];

/** Tono por posición (si se indica) o estable a partir del nombre. */
function tono(nombre: string, variante?: number) {
  if (variante !== undefined) return tonos[variante % tonos.length];
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tonos[h % tonos.length];
}

/**
 * Retrato de una persona. Con foto real la muestra; sin ella (o si falla),
 * un bloque de color suave con las iniciales, fácil de sustituir.
 * Al entrar en pantalla se descubre con una máscara que sube.
 */
export default function Retrato({
  nombre,
  foto,
  forma = 'arco',
  className,
  sizes,
  prioridad,
  variante,
  revelar = true,
}: {
  nombre: string;
  foto?: string | null;
  forma?: 'arco' | 'circulo' | 'rect';
  className?: string;
  sizes?: string;
  prioridad?: boolean;
  /** Índice para alternar el tono del placeholder en listas. */
  variante?: number;
  /** Animación de máscara al aparecer. */
  revelar?: boolean;
}) {
  const [fallo, setFallo] = useState(false);
  const reducido = useReducedMotion();
  const formas = {
    arco: 'rounded-t-[999px] rounded-b-[8px]',
    circulo: 'rounded-full',
    rect: 'rounded-[8px]',
  };
  const animar = revelar && !reducido;

  return (
    <motion.div
      className={cx('relative overflow-hidden', formas[forma], className)}
      initial={animar ? { clipPath: 'inset(100% 0% 0% 0%)' } : false}
      whileInView={animar ? { clipPath: 'inset(0% 0% 0% 0%)' } : undefined}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 1.3, ease: [0.76, 0, 0.24, 1] }}
    >
      <motion.div
        className="h-full w-full"
        initial={animar ? { scale: 1.25 } : false}
        whileInView={animar ? { scale: 1 } : undefined}
        viewport={{ once: true, margin: '0px 0px -8% 0px' }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
      >
        {foto && !fallo ? (
          <Foto src={foto} alt={`Retrato de ${nombre}`} sizes={sizes} prioridad={prioridad} alFallar={() => setFallo(true)} />
        ) : (
          <div
            role="img"
            aria-label={nombre}
            className={cx(
              'flex h-full w-full items-center justify-center bg-gradient-to-br font-serif [container-type:inline-size]',
              tono(nombre, variante),
            )}
          >
            <span className="text-[clamp(0.9rem,30cqw,5.5rem)] font-light italic tracking-tight" aria-hidden>
              {iniciales(nombre)}
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

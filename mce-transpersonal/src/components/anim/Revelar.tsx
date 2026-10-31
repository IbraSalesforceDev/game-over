import type { ElementType, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';

const suave = [0.22, 1, 0.36, 1] as const;

/** Aparece con un fundido y un desplazamiento corto al entrar en pantalla. */
export function Revelar({
  children,
  className,
  retraso = 0,
  y = 22,
  como = 'div',
}: {
  children: ReactNode;
  className?: string;
  retraso?: number;
  y?: number;
  como?: 'div' | 'section' | 'li' | 'p' | 'span' | 'article' | 'header' | 'figure' | 'aside';
}) {
  const Componente = motion[como] as ElementType;
  return (
    <Componente
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, ease: suave, delay: retraso }}
    >
      {children}
    </Componente>
  );
}

const contenedor: Variants = {
  oculto: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export const hijoEscalonado: Variants = {
  oculto: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: suave } },
};

/** Lista con aparición escalonada. Los hijos deben usar `variants={hijoEscalonado}`. */
export function Escalonado({
  children,
  className,
  como = 'ul',
}: {
  children: ReactNode;
  className?: string;
  como?: 'ul' | 'ol' | 'div' | 'dl';
}) {
  const Componente = motion[como] as ElementType;
  return (
    <Componente
      className={className}
      variants={contenedor}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
    >
      {children}
    </Componente>
  );
}

import type { ElementType, ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useRetrasoPagina } from './Pagina';

const suave = [0.22, 1, 0.36, 1] as const;

/** Aparece con fundido, desplazamiento corto y un leve desenfoque al entrar en pantalla. */
export function Revelar({
  children,
  className,
  retraso = 0,
  y = 34,
  como = 'div',
}: {
  children: ReactNode;
  className?: string;
  retraso?: number;
  y?: number;
  como?: 'div' | 'section' | 'li' | 'p' | 'span' | 'article' | 'header' | 'figure' | 'aside';
}) {
  const { vivo } = useRetrasoPagina();
  const Componente = motion[como] as ElementType;
  return (
    <Componente
      className={className}
      initial={{ opacity: 0, y, filter: 'blur(6px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 1.05, ease: suave, delay: retraso + vivo }}
    >
      {children}
    </Componente>
  );
}

export const hijoEscalonado: Variants = {
  oculto: { opacity: 0, y: 26, filter: 'blur(5px)' },
  visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: suave }, transitionEnd: { filter: 'none' } },
};

/** Lista con aparición escalonada. Los hijos deben usar `variants={hijoEscalonado}`. */
export function Escalonado({
  children,
  className,
  como = 'ul',
  paso = 0.09,
}: {
  children: ReactNode;
  className?: string;
  como?: 'ul' | 'ol' | 'div' | 'dl';
  paso?: number;
}) {
  const { vivo } = useRetrasoPagina();
  const Componente = motion[como] as ElementType;
  return (
    <Componente
      className={className}
      variants={{ oculto: {}, visible: { transition: { staggerChildren: paso, delayChildren: 0.05 + vivo } } }}
      initial="oculto"
      whileInView="visible"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
    >
      {children}
    </Componente>
  );
}

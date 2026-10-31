import { Fragment, type ReactNode } from 'react';
import { motion } from 'framer-motion';

type Segmento = string | { texto: string; cursiva?: boolean; extra?: ReactNode };

/**
 * Titular que aparece palabra a palabra, cada una saliendo de detrás de una
 * máscara. Admite segmentos en cursiva y un adorno (p. ej. un trazo a mano)
 * pegado a un segmento.
 */
export default function Titular({
  segmentos,
  como: Etiqueta = 'h1',
  className,
  alCargar = false,
  retraso = 0,
}: {
  segmentos: Segmento[];
  como?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  /** true: anima al montar (cabeceras). false: al entrar en pantalla. */
  alCargar?: boolean;
  retraso?: number;
}) {
  const texto = segmentos.map((s) => (typeof s === 'string' ? s : s.texto)).join(' ');

  const disparo = alCargar
    ? { initial: 'oculto', animate: 'visible' }
    : { initial: 'oculto', whileInView: 'visible', viewport: { once: true, margin: '0px 0px -10% 0px' } };

  return (
    <Etiqueta className={className} aria-label={texto}>
      <motion.span
        aria-hidden
        className="block"
        {...disparo}
        variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.07, delayChildren: retraso } } }}
      >
        {segmentos.map((seg, s) => {
          const { texto: t, cursiva, extra } = typeof seg === 'string' ? { texto: seg, cursiva: false, extra: null } : seg;
          const palabras = t.split(' ');
          return (
            <span key={s} className={cursiva ? 'relative italic' : 'relative'}>
              {palabras.map((p, i) => (
                  <Fragment key={i}>
                    <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
                      <motion.span
                        className="inline-block will-change-transform"
                        variants={{
                          oculto: { y: '110%', rotate: 2 },
                          visible: { y: '0%', rotate: 0, transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] } },
                        }}
                      >
                        {p}
                      </motion.span>
                    </span>
                    {i < palabras.length - 1 ? ' ' : null}
                  </Fragment>
              ))}
              {extra}
              {s < segmentos.length - 1 ? ' ' : null}
            </span>
          );
        })}
      </motion.span>
    </Etiqueta>
  );
}

import { Fragment, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useRetrasoPagina } from './Pagina';

type Segmento = string | { texto: string; cursiva?: boolean; extra?: ReactNode; clase?: string };

/**
 * Titular que aparece palabra a palabra: cada una sube desde detrás de una
 * máscara, gira un poco y se enfoca. Admite segmentos en cursiva y un adorno
 * (p. ej. un trazo a mano) pegado a un segmento.
 */
export default function Titular({
  segmentos,
  como: Etiqueta = 'h1',
  className,
  alCargar = false,
  retraso = 0,
  lineas = false,
}: {
  segmentos: Segmento[];
  como?: 'h1' | 'h2' | 'h3' | 'p';
  className?: string;
  /** true: anima al montar (cabeceras). false: al entrar en pantalla. */
  alCargar?: boolean;
  retraso?: number;
  /** true: cada segmento en su propia línea. */
  lineas?: boolean;
}) {
  const { inicial, vivo } = useRetrasoPagina();
  const texto = segmentos.map((s) => (typeof s === 'string' ? s : s.texto)).join(' ');
  const espera = retraso + (alCargar ? inicial : vivo);

  const disparo = alCargar
    ? { initial: 'oculto', animate: 'visible' }
    : { initial: 'oculto', whileInView: 'visible', viewport: { once: true, margin: '0px 0px -10% 0px' } };

  return (
    <Etiqueta className={className}>
      <span className="sr-only">{texto}</span>
      <motion.span
        aria-hidden
        className="block"
        {...disparo}
        variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: espera } } }}
      >
        {segmentos.map((seg, s) => {
          const { texto: t, cursiva, extra, clase } =
            typeof seg === 'string' ? { texto: seg, cursiva: false, extra: null, clase: undefined } : seg;
          const palabras = t.split(' ');
          return (
            <span key={s} className={[lineas ? 'block' : 'relative', cursiva && 'italic', clase].filter(Boolean).join(' ')}>
              <span className="relative">
                {palabras.map((p, i) => (
                  <Fragment key={i}>
                    <span className="-mb-[0.14em] inline-block overflow-hidden pb-[0.14em] align-bottom">
                      <motion.span
                        className="inline-block will-change-transform"
                        variants={{
                          oculto: { y: '115%', rotate: 4, filter: 'blur(8px)' },
                          visible: {
                            y: '0%',
                            rotate: 0,
                            filter: 'blur(0px)',
                            transition: { duration: 1.1, ease: [0.22, 1, 0.36, 1] },
                          },
                        }}
                      >
                        {p}
                      </motion.span>
                    </span>
                    {i < palabras.length - 1 ? ' ' : null}
                  </Fragment>
                ))}
                {extra}
              </span>
              {!lineas && s < segmentos.length - 1 ? ' ' : null}
            </span>
          );
        })}
      </motion.span>
    </Etiqueta>
  );
}

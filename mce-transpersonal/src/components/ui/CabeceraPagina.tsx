import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Titular from '../anim/Titular';
import { useRetrasoPagina } from '../anim/Pagina';
import { cx } from '../../lib/utilidades';
import type { FotoReal } from '../../data/fotos';
import FotoEditorial from './FotoEditorial';

type Segmento = Parameters<typeof Titular>[0]['segmentos'][number];

/**
 * Cabecera de las páginas interiores: titular grande que aparece por palabras
 * y, a la derecha, una foto real en arco (el motivo del loto y de la escuela)
 * que se descubre con una máscara y se desplaza levemente con el scroll.
 */
export default function CabeceraPagina({
  etiqueta,
  titulo,
  entradilla,
  lateral,
  foto,
  fondo = 'bg-marfil',
  lineas = true,
}: {
  etiqueta: string;
  titulo: Segmento[];
  entradilla?: ReactNode;
  /** Sustituye a la foto (p. ej. un índice de la página). */
  lateral?: ReactNode;
  foto?: FotoReal;
  fondo?: string;
  momento?: number;
  numero?: string;
  lineas?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { inicial } = useRetrasoPagina();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yTitulo = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const entrar = (d: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: inicial + d, ease: [0.16, 1, 0.3, 1] as const },
  });

  const derecha =
    lateral ??
    (foto ? (
      <FotoEditorial
        foto={foto}
        pie={foto.lugar ? `MCE ${foto.lugar}` : undefined}
        prioridad
        proporcion="aspect-[4/5] sm:aspect-[5/6]"
        className="mx-auto w-full max-w-[22rem] sm:max-w-[24rem] lg:ml-auto lg:mr-0 lg:max-w-[27rem]"
      />
    ) : null);

  return (
    <header ref={ref} className={cx('relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40', fondo)}>
      <div className="marco relative grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
        <motion.div style={reducido ? undefined : { y: yTitulo }} className={cx(derecha ? 'lg:col-span-7' : 'lg:col-span-10')}>
          <motion.div {...entrar(0.05)}>
            <p className="etiqueta flex items-center gap-3">
              <span aria-hidden className="h-px w-6 bg-oro" />
              {etiqueta}
            </p>
          </motion.div>
          <Titular
            segmentos={titulo}
            alCargar
            lineas={lineas}
            retraso={0.1}
            className="mt-6 text-[clamp(3.1rem,7.4vw,6.8rem)] font-light leading-[0.95] tracking-[-0.04em]"
          />
          {entradilla && (
            <motion.div className="mt-8 max-w-xl text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]" {...entrar(0.6)}>
              {entradilla}
            </motion.div>
          )}
        </motion.div>

        {derecha && <div className="lg:col-span-5">{derecha}</div>}
      </div>
    </header>
  );
}

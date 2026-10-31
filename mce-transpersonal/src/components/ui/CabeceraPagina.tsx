import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Titular from '../anim/Titular';
import Ventana from '../anim/Ventana';
import { useRetrasoPagina } from '../anim/Pagina';
import { cx } from '../../lib/utilidades';

type Segmento = Parameters<typeof Titular>[0]['segmentos'][number];

/**
 * Cabecera de las páginas interiores: titular grande que aparece por palabras
 * y, a la derecha, la ventana en arco a una hora del día distinta en cada
 * página (`momento`). Al bajar, la tarde avanza un poco en la ventana.
 */
export default function CabeceraPagina({
  etiqueta,
  titulo,
  entradilla,
  lateral,
  momento = 0.2,
  fondo = 'bg-marfil',
  lineas = true,
}: {
  etiqueta: string;
  titulo: Segmento[];
  entradilla?: ReactNode;
  /** Sustituye a la ventana (p. ej. un índice de la página). */
  lateral?: ReactNode;
  momento?: number;
  fondo?: string;
  numero?: string;
  lineas?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { inicial } = useRetrasoPagina();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const hora = useTransform(scrollYProgress, [0, 1], [momento, Math.min(1, momento + 0.3)]);
  const yTitulo = useTransform(scrollYProgress, [0, 1], [0, -90]);

  const entrar = (d: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: inicial + d, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <header ref={ref} className={cx('relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40', fondo)}>
      <div className="marco relative grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
        <motion.div style={reducido ? undefined : { y: yTitulo }} className="lg:col-span-7">
          <motion.div {...entrar(0.05)}>
            <p className="etiqueta flex items-center gap-3">
              <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-dorado" />
              {etiqueta}
            </p>
          </motion.div>
          <Titular
            segmentos={titulo}
            alCargar
            lineas={lineas}
            retraso={0.1}
            className="mt-6 text-[clamp(2.9rem,7vw,6.4rem)] leading-[0.98] tracking-[-0.03em]"
          />
          {entradilla && (
            <motion.div className="mt-8 max-w-xl text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]" {...entrar(0.6)}>
              {entradilla}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: inicial + 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {lateral ?? <Ventana progreso={hora} className="mx-auto w-full max-w-[17rem] sm:max-w-[20rem] lg:ml-auto lg:mr-0 lg:max-w-[24rem]" />}
        </motion.div>
      </div>
    </header>
  );
}

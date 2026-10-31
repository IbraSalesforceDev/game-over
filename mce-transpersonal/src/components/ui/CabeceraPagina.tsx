import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Titular from '../anim/Titular';
import FondoVivo from '../anim/FondoVivo';
import { useRetrasoPagina } from '../anim/Pagina';
import { cx } from '../../lib/utilidades';

type Segmento = Parameters<typeof Titular>[0]['segmentos'][number];

/**
 * Cabecera de las páginas interiores: etiqueta numerada, titular enorme que
 * aparece por palabras y se desplaza con el scroll, entradilla y un lateral
 * opcional. Fondo con manchas de color en movimiento.
 */
export default function CabeceraPagina({
  etiqueta,
  titulo,
  entradilla,
  lateral,
  numero,
  lineas = true,
}: {
  etiqueta: string;
  titulo: Segmento[];
  entradilla?: ReactNode;
  lateral?: ReactNode;
  numero?: string;
  lineas?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { inicial } = useRetrasoPagina();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yTitulo = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const opacidad = useTransform(scrollYProgress, [0, 0.8], [1, 0.15]);
  const yFondo = useTransform(scrollYProgress, [0, 1], [0, 120]);

  const entrar = (d: number) => ({
    initial: { opacity: 0, y: 18, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
    transition: { duration: 1, delay: inicial + d, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <header ref={ref} className="relative overflow-hidden pb-20 pt-36 sm:pb-28 sm:pt-44 lg:min-h-[78svh] lg:pt-52">
      <motion.div style={reducido ? undefined : { y: yFondo }} className="absolute inset-0">
        <FondoVivo intensidad={0.9} />
      </motion.div>

      <motion.div style={reducido ? undefined : { y: yTitulo, opacity: opacidad }} className="marco relative grid gap-12 lg:grid-cols-12">
        <div className={cx(lateral ? 'lg:col-span-8' : 'lg:col-span-12')}>
          <motion.p className="etiqueta flex items-center gap-4" {...entrar(0.1)}>
            {numero && <span className="font-serif text-[0.95rem] normal-case tracking-normal text-dorado-hondo italic">{numero}</span>}
            <span className="h-px w-10 bg-current opacity-40" />
            {etiqueta}
          </motion.p>
          <Titular
            segmentos={titulo}
            alCargar
            lineas={lineas}
            retraso={0.15}
            className="mt-7 text-[clamp(3.1rem,10vw,8.4rem)] font-[340] leading-[0.95] tracking-[-0.03em]"
          />
          {entradilla && (
            <motion.div className="mt-10 max-w-2xl text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]" {...entrar(0.7)}>
              {entradilla}
            </motion.div>
          )}
        </div>
        {lateral && (
          <motion.div className="lg:col-span-4 lg:self-end" {...entrar(0.9)}>
            {lateral}
          </motion.div>
        )}
      </motion.div>
    </header>
  );
}

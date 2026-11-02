import { useRef, type ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Titular from '../anim/Titular';
import { useRetrasoPagina } from '../anim/Pagina';
import { cx } from '../../lib/utilidades';
import Ondas from '../anim/Ondas';
import type { FotoReal } from '../../data/fotos';

type Segmento = Parameters<typeof Titular>[0]['segmentos'][number];

/**
 * Cabecera de las páginas interiores: titular grande que aparece por palabras
 * y, a la derecha, una foto real (rectangular, en su proporción) que se
 * descubre con una máscara y se desplaza levemente con el scroll.
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
  const yFoto = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const entrar = (d: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: inicial + d, ease: [0.16, 1, 0.3, 1] as const },
  });

  const derecha =
    lateral ??
    (foto ? (
      // Foto real en su propia proporción (sin recortar caras), con esquinas
      // suaves; se descubre de abajo arriba y se mueve muy poco con el scroll.
      <motion.figure
        style={reducido ? { aspectRatio: `${foto.ancho} / ${foto.alto}` } : { aspectRatio: `${foto.ancho} / ${foto.alto}`, y: yFoto }}
        className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-[1.5rem] bg-lino shadow-[0_30px_60px_-40px_rgba(22,33,62,0.55)] lg:ml-auto lg:mr-0 lg:max-w-none"
        initial={reducido ? false : { clipPath: 'inset(100% 0% 0% 0% round 1.5rem)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0% round 1.5rem)' }}
        transition={{ duration: 1.3, delay: inicial + 0.25, ease: [0.76, 0, 0.24, 1] }}
      >
        <img
          src={foto.src}
          alt={foto.alt}
          width={foto.ancho}
          height={foto.alto}
          decoding="async"
          className="acercar-suave absolute inset-0 h-full w-full object-cover"
        />
        {/* velo muy suave abajo para asentar la foto sobre el fondo claro */}
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_65%,rgba(11,18,38,0.18))]" />
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-carbon/10" />
      </motion.figure>
    ) : null);

  return (
    <header ref={ref} className={cx('relative overflow-hidden pb-16 pt-32 sm:pb-24 sm:pt-40', fondo)}>
      <div className="marco relative grid items-end gap-12 lg:grid-cols-12 lg:gap-10">
        <motion.div style={reducido ? undefined : { y: yTitulo }} className={cx(derecha ? 'lg:col-span-7' : 'lg:col-span-10')}>
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
            className="mt-6 text-[clamp(3.1rem,7.6vw,7rem)] font-medium leading-[0.96] tracking-[-0.02em]"
          />
          {entradilla && (
            <motion.div className="mt-8 max-w-xl text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]" {...entrar(0.6)}>
              {entradilla}
            </motion.div>
          )}
        </motion.div>

        {derecha && (
          <div className="relative lg:col-span-5">
            {/* Ondas lentas detrás de la foto: el eco de las vibraciones del logo */}
            <Ondas className="left-1/2 top-1/2 w-[150%] max-w-[44rem] -translate-x-1/2 -translate-y-1/2 lg:left-auto lg:right-[-25%] lg:translate-x-0" color="border-dorado/20" cantidad={4} duracion={12} />
            <div className="relative">{derecha}</div>
          </div>
        )}
      </div>
    </header>
  );
}

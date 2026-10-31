import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import Titular from '../anim/Titular';
import { Mancha } from '../anim/Trazo';
import { cx } from '../../lib/utilidades';

type Segmento = Parameters<typeof Titular>[0]['segmentos'][number];

/** Cabecera de las páginas interiores: etiqueta, titular grande y entradilla. */
export default function CabeceraPagina({
  etiqueta,
  titulo,
  entradilla,
  lateral,
  mancha = 'fill-dorado-claro',
}: {
  etiqueta: string;
  titulo: Segmento[];
  entradilla?: ReactNode;
  lateral?: ReactNode;
  mancha?: string;
}) {
  return (
    <header className="relative overflow-hidden pb-16 pt-36 sm:pb-24 sm:pt-44 lg:pt-52">
      <Mancha className="-right-48 -top-24 h-[34rem] w-[34rem] opacity-50" color={mancha} />
      <div className="marco relative grid gap-10 lg:grid-cols-12">
        <div className={cx(lateral ? 'lg:col-span-8' : 'lg:col-span-11')}>
          <motion.p
            className="etiqueta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {etiqueta}
          </motion.p>
          <Titular
            segmentos={titulo}
            alCargar
            retraso={0.3}
            className="mt-6 text-[clamp(2.9rem,8.5vw,7rem)] leading-[0.98] tracking-[-0.025em]"
          />
          {entradilla && (
            <motion.div
              className="mt-8 max-w-2xl text-[1.12rem] leading-relaxed text-carbon-suave sm:text-[1.2rem]"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              {entradilla}
            </motion.div>
          )}
        </div>
        {lateral && (
          <motion.div
            className="lg:col-span-4 lg:self-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.9 }}
          >
            {lateral}
          </motion.div>
        )}
      </div>
    </header>
  );
}

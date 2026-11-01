import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { cx } from '../../lib/utilidades';
import type { FotoReal } from '../../data/fotos';

export type Entrada = { ruta: string; nombre: string; detalle: string; foto: FotoReal };

/**
 * Índice editorial: filas grandes separadas por filetes. Con ratón, al pasar
 * por una fila aparece su foto flotando junto al cursor; en móvil cada fila
 * lleva su miniatura.
 */
export default function IndiceConImagen({ entradas }: { entradas: Entrada[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const [activa, setActiva] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 28 });
  const sy = useSpring(y, { stiffness: 220, damping: 28 });

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={(e) => {
        if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => setActiva(null)}
    >
      <ul className="filete border-t">
        {entradas.map((e, i) => (
          <motion.li
            key={e.ruta}
            className="filete border-b"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            onPointerEnter={(ev) => ev.pointerType === 'mouse' && setActiva(i)}
          >
            <Link to={e.ruta} className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-7 sm:py-9 md:grid-cols-12">
              <span className="font-serif text-[clamp(2.1rem,4.6vw,4rem)] leading-none tracking-[-0.03em] transition-[transform,color] duration-300 ease-[var(--ease-suave)] group-hover:translate-x-2 group-hover:text-mar md:col-span-5">
                {e.nombre}
              </span>
              <span className="col-span-2 row-start-2 max-w-md text-[0.98rem] leading-relaxed text-carbon-suave md:col-span-5 md:row-start-auto">{e.detalle}</span>
              <span className="row-start-1 flex items-center justify-end gap-4 md:col-span-2 md:col-start-11">
                <span className="h-14 w-20 shrink-0 overflow-hidden rounded-[4px] md:hidden">
                  <img src={e.foto.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </span>
                <span className="hidden h-11 w-11 items-center justify-center rounded-full border border-carbon/15 transition-colors duration-300 group-hover:border-carbon group-hover:bg-carbon group-hover:text-marfil md:flex">
                  <svg aria-hidden viewBox="0 0 20 20" className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-45">
                    <path d="M4 10h11M11 5.5 15.5 10 11 14.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
            </Link>
          </motion.li>
        ))}
      </ul>

      {!reducido && (
        <motion.div aria-hidden className="pointer-events-none absolute left-0 top-0 z-10 hidden md:block" style={{ x: sx, y: sy }}>
          <AnimatePresence>
            {activa !== null && (
              <motion.div
                key="marco"
                className="-translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[6px] shadow-[0_24px_50px_-20px_rgba(15,27,51,0.45)]"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="relative h-[13rem] w-[18rem]">
                  {entradas.map((e, i) => (
                    <img
                      key={e.ruta}
                      src={e.foto.src}
                      alt=""
                      className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-300', activa === i ? 'opacity-100' : 'opacity-0')}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

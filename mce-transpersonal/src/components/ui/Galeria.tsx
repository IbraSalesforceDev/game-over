import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import type { Cartel } from '../../data/carteles';
import { cx } from '../../lib/utilidades';

function Flecha({ izquierda }: { izquierda?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cx('h-5 w-5', izquierda && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  );
}

/** Entrada y salida de cada imagen según el sentido del paso. */
const paso = {
  entra: (d: number) => ({ opacity: 0, x: d * 60 }),
  centro: { opacity: 1, x: 0 },
  sale: (d: number) => ({ opacity: 0, x: d * -60 }),
};

const botonRedondo =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-carbon/20 bg-marfil text-carbon transition-colors duration-200 hover:border-carbon hover:bg-carbon hover:text-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado disabled:pointer-events-none disabled:opacity-30';

/**
 * Contenido de un cartelito: galería de imágenes (flechas, deslizar con el
 * dedo, teclas ← →, indicador de posición y ampliar al pulsar) o un vídeo con
 * portada que se abre en Instagram. Va dentro de <Modal amplio>.
 */
export default function Galeria({ cartel }: { cartel: Cartel }) {
  const [indice, setIndice] = useState(0);
  const [direccion, setDireccion] = useState(1);
  const [ampliada, setAmpliada] = useState(false);
  const total = cartel.imagenes.length;
  const actual = cartel.imagenes[indice];

  const ir = useCallback(
    (paso: 1 | -1) => {
      setIndice((i) => {
        const siguiente = Math.min(total - 1, Math.max(0, i + paso));
        if (siguiente !== i) {
          setDireccion(paso);
          setAmpliada(false);
        }
        return siguiente;
      });
    },
    [total],
  );

  // Teclas ← → mientras el cartelito está abierto.
  useEffect(() => {
    if (total < 2) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') ir(1);
      else if (e.key === 'ArrowLeft') ir(-1);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [ir, total]);

  // Precarga de las imágenes vecinas para que el paso sea fluido.
  useEffect(() => {
    [indice - 1, indice + 1].forEach((i) => {
      const img = cartel.imagenes[i];
      if (img) new Image().src = img.src;
    });
  }, [indice, cartel.imagenes]);

  if (cartel.video) {
    const v = cartel.video;
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 pt-4 sm:pt-6">
        <a
          href={v.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="group/video relative block min-h-0 overflow-hidden rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dorado"
        >
          <img src={v.portada} alt={v.alt} className="max-h-[calc(100svh-15rem)] w-auto max-w-full object-contain sm:max-h-[66vh]" decoding="async" />
          <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-carbon/10 transition-colors duration-300 group-hover/video:bg-carbon/25">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-marfil/90 text-mar shadow-[0_12px_40px_-12px_rgba(11,18,38,0.6)] transition-transform duration-300 group-hover/video:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-8 w-8" fill="currentColor">
                <path d="M7 4.5v15l12.5-7.5z" />
              </svg>
            </span>
          </span>
          <span className="sr-only">{v.boton} (se abre en una pestaña nueva)</span>
        </a>
        <a
          href={v.enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2.5 rounded-full bg-carbon px-6 py-3 text-[0.98rem] text-marfil transition-colors duration-300 hover:bg-mar"
        >
          {v.boton}
          <span className="sr-only">(se abre en una pestaña nueva)</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
        </a>
      </div>
    );
  }

  if (!actual) return null;

  const alSoltar = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) ir(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) ir(-1);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-3 sm:pt-5" aria-roledescription="galería">
      <div
        className={cx(
          'relative h-[calc(100svh-12rem)] min-h-0 flex-1 rounded-xl bg-lino/60 sm:h-[min(70vh,48rem)] sm:flex-none',
          ampliada ? 'overflow-auto' : 'overflow-hidden',
        )}
        data-lenis-prevent
      >
        <AnimatePresence initial={false} custom={direccion} mode="popLayout">
          <motion.div
            key={actual.src}
            custom={direccion}
            className={cx('w-full', ampliada ? 'relative min-h-full' : 'absolute inset-0')}
            variants={paso}
            initial="entra"
            animate="centro"
            exit="sale"
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            drag={total > 1 && !ampliada ? 'x' : false}
            dragSnapToOrigin
            dragElastic={0.25}
            onDragEnd={alSoltar}
          >
            <button
              type="button"
              onClick={() => setAmpliada((a) => !a)}
              aria-label={ampliada ? 'Reducir la imagen' : 'Ampliar la imagen'}
              className={cx('w-full p-2', ampliada ? 'block cursor-zoom-out' : 'flex h-full items-center justify-center cursor-zoom-in')}
            >
              <img
                src={actual.src}
                alt={actual.alt}
                draggable={false}
                decoding="async"
                className={cx('pointer-events-none mx-auto select-none rounded-lg', ampliada ? 'w-[180%] max-w-none sm:w-[150%]' : 'max-h-full max-w-full object-contain')}
              />
            </button>
          </motion.div>
        </AnimatePresence>
      </div>

      {actual.pie && <p className="mt-3 text-center text-[0.95rem] text-carbon-suave">{actual.pie}</p>}

      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-5 sm:mt-5">
          <button type="button" onClick={() => ir(-1)} disabled={indice === 0} aria-label="Imagen anterior" className={botonRedondo}>
            <Flecha izquierda />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5" aria-hidden>
              {cartel.imagenes.map((img, i) => (
                <span key={img.src} className={cx('h-1.5 rounded-full transition-all duration-300', i === indice ? 'w-5 bg-dorado' : 'w-1.5 bg-carbon/25')} />
              ))}
            </div>
            <p className="min-w-[3.2rem] text-center text-sm tabular-nums text-carbon-suave" aria-live="polite">
              <span className="sr-only">Imagen </span>
              {indice + 1}
              <span aria-hidden> / </span>
              <span className="sr-only"> de </span>
              {total}
            </p>
          </div>
          <button type="button" onClick={() => ir(1)} disabled={indice === total - 1} aria-label="Imagen siguiente" className={botonRedondo}>
            <Flecha />
          </button>
        </div>
      )}
    </div>
  );
}

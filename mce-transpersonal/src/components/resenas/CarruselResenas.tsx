import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion } from 'framer-motion';
import { cx } from '../../lib/utilidades';
import type { Resena } from '../../data/resenas';

/**
 * Carrusel de reseñas. Se desplaza:
 * - deslizando con el dedo (scroll nativo con imán en cada tarjeta),
 * - arrastrando con el ratón,
 * - con las flechas ← → del teclado (con el carrusel enfocado) o con los botones.
 */
export default function CarruselResenas({ resenas }: { resenas: Resena[] }) {
  const pista = useRef<HTMLUListElement>(null);
  const arrastre = useRef<{ x: number; scroll: number; movido: boolean } | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [limites, setLimites] = useState({ inicio: true, fin: false });

  const medir = () => {
    const el = pista.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgreso(max > 0 ? el.scrollLeft / max : 0);
    setLimites({ inicio: el.scrollLeft <= 4, fin: el.scrollLeft >= max - 4 });
  };

  useEffect(() => {
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  /** Avanza o retrocede una tarjeta. */
  const mover = (dir: 1 | -1) => {
    const el = pista.current;
    const tarjeta = el?.querySelector('li');
    if (!el || !tarjeta) return;
    const paso = tarjeta.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || '0');
    el.scrollBy({ left: dir * paso, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  const alTeclear = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      mover(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      mover(-1);
    }
  };

  // Arrastre con ratón (en táctil ya se desliza de forma nativa).
  const alBajar = (e: PointerEvent<HTMLUListElement>) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !pista.current) return;
    arrastre.current = { x: e.clientX, scroll: pista.current.scrollLeft, movido: false };
  };
  const alMover = (e: PointerEvent<HTMLUListElement>) => {
    const a = arrastre.current;
    const el = pista.current;
    if (!a || !el) return;
    const dx = e.clientX - a.x;
    if (!a.movido && Math.abs(dx) > 4) {
      a.movido = true;
      setArrastrando(true);
      el.setPointerCapture(e.pointerId);
    }
    if (a.movido) el.scrollLeft = a.scroll - dx;
  };
  const alSoltar = (e: PointerEvent<HTMLUListElement>) => {
    const el = pista.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    arrastre.current = null;
    setArrastrando(false);
  };

  return (
    <div>
      <ul
        ref={pista}
        tabIndex={0}
        role="region"
        aria-roledescription="carrusel"
        aria-label="Reseñas de personas que se han formado con MCE. Usa las flechas izquierda y derecha para moverte."
        onScroll={medir}
        onKeyDown={alTeclear}
        onPointerDown={alBajar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
        onDragStart={(e) => e.preventDefault()}
        className={cx(
          '-mx-4 flex scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 pt-1 [scrollbar-width:none] sm:-mx-8 sm:scroll-px-8 sm:gap-5 sm:px-8 lg:-mx-14 lg:scroll-px-14 lg:px-14 [&::-webkit-scrollbar]:hidden',
          'rounded-[1.25rem] outline-none focus-visible:ring-2 focus-visible:ring-dorado focus-visible:ring-offset-4 focus-visible:ring-offset-lino',
          arrastrando ? 'cursor-grabbing select-none' : 'cursor-grab snap-x snap-mandatory scroll-smooth',
        )}
      >
        {resenas.map((r, i) => (
          <motion.li
            key={r.nombre + i}
            className="w-[84vw] max-w-[25rem] shrink-0 snap-start sm:w-[24rem]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: Math.min(i, 4) * 0.08, ease: [0.16, 1, 0.3, 1] }}
          >
            <figure className="flex h-full flex-col justify-between rounded-[1.5rem] border border-carbon/10 bg-marfil p-7 shadow-[0_24px_50px_-36px_rgba(22,33,62,0.35)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-suave)] hover:-translate-y-1 hover:shadow-[0_30px_60px_-34px_rgba(22,33,62,0.45)] sm:p-8">
              <div>
                <span aria-hidden className="block font-serif text-[3.4rem] leading-[0.6] text-dorado/70">
                  “
                </span>
                <blockquote className="mt-4 text-[1.02rem] leading-[1.75] text-carbon">{r.texto}</blockquote>
              </div>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-carbon/10 pt-5">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dorado-claro font-serif text-[1.2rem] text-dorado-hondo">
                  {r.nombre.trim().charAt(0)}
                </span>
                <span>
                  <span className="block font-medium text-carbon">{r.nombre}</span>
                  {r.sede && <span className="block text-sm text-carbon-suave">{r.sede}</span>}
                </span>
              </figcaption>
            </figure>
          </motion.li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between gap-6">
        <div className="h-[3px] w-full max-w-[14rem] overflow-hidden rounded-full bg-carbon/10" aria-hidden>
          <div className="h-full origin-left rounded-full bg-dorado transition-transform duration-200" style={{ transform: `scaleX(${Math.max(0.08, progreso)})` }} />
        </div>
        <div className="flex gap-3">
          {([-1, 1] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => mover(d)}
              disabled={d === -1 ? limites.inicio : limites.fin}
              aria-label={d === -1 ? 'Reseña anterior' : 'Reseña siguiente'}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-carbon/20 text-carbon transition-colors duration-200 hover:border-carbon hover:bg-carbon hover:text-marfil disabled:pointer-events-none disabled:opacity-35"
            >
              <svg viewBox="0 0 24 24" className={cx('h-5 w-5', d === -1 && 'rotate-180')} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h15M13 6l6 6-6 6" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

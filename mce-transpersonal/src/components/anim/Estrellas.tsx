import { useMemo } from 'react';
import { cx } from '../../lib/utilidades';

/** Generador pseudoaleatorio con semilla: las estrellas salen siempre en el mismo sitio. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Campo de puntos de luz que titilan despacio, para los fondos oscuros
 * (el "espacio" de la portada). Solo CSS.
 */
export default function Estrellas({ cantidad = 40, semilla = 7, className }: { cantidad?: number; semilla?: number; className?: string }) {
  const puntos = useMemo(() => {
    const r = azar(semilla);
    return Array.from({ length: cantidad }, () => ({
      x: r() * 100,
      y: r() * 100,
      t: r() < 0.15 ? 3 : r() < 0.5 ? 2 : 1.5,
      dur: 3 + r() * 5,
      ret: -r() * 8,
    }));
  }, [cantidad, semilla]);

  return (
    <div aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      {puntos.map((p, i) => (
        <span
          key={i}
          className="titilar absolute rounded-full bg-marfil"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.t,
            height: p.t,
            ['--dur' as string]: `${p.dur}s`,
            ['--ret' as string]: `${p.ret}s`,
          }}
        />
      ))}
    </div>
  );
}

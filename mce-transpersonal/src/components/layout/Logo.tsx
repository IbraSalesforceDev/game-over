import { useState } from 'react';
import { escuela } from '../../data/escuela';
import { cx } from '../../lib/utilidades';

/**
 * Logo original de MCE, tal cual: sin filtros, sin invertir y sin recolorear.
 * Mientras el archivo no exista en public/images/, se muestra el nombre en
 * tipografía (no es un logo inventado, solo el texto "MCE").
 */
export default function Logo({ className, claro = false }: { className?: string; claro?: boolean }) {
  const [fallo, setFallo] = useState(false);

  if (!fallo) {
    return (
      <img
        src={escuela.logo}
        alt={`${escuela.nombre}`}
        className={cx('h-11 w-auto sm:h-12', className)}
        onError={() => setFallo(true)}
        decoding="async"
      />
    );
  }

  return (
    <span className={cx('flex items-baseline gap-2 leading-none', className)} aria-label={escuela.nombre}>
      <span className={cx('font-serif text-[1.65rem] font-medium tracking-[0.04em]', claro ? 'text-marfil' : 'text-carbon')}>MCE</span>
      <span className={cx('hidden text-[0.68rem] uppercase tracking-[0.22em] sm:inline', claro ? 'text-marfil/70' : 'text-carbon-suave')}>
        Transpersonal
      </span>
    </span>
  );
}

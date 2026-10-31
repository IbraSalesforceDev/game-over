import { useState } from 'react';
import { cx, iniciales } from '../../lib/utilidades';
import Foto from './Foto';

// Tonos suaves que contrastan tanto sobre marfil como sobre lino.
const tonos = [
  'bg-dorado-claro text-dorado-hondo',
  'bg-salvia-clara text-salvia-honda',
  'bg-terracota-clara text-terracota-honda',
  'bg-arena text-carbon-suave',
];

/** Tono por posición (si se indica) o estable a partir del nombre. */
function tono(nombre: string, variante?: number) {
  if (variante !== undefined) return tonos[variante % tonos.length];
  let h = 0;
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return tonos[h % tonos.length];
}

/**
 * Retrato de una persona. Con foto real la muestra; sin ella (o si falla),
 * un bloque de color suave con las iniciales, fácil de sustituir.
 */
export default function Retrato({
  nombre,
  foto,
  forma = 'arco',
  className,
  sizes,
  prioridad,
  variante,
}: {
  nombre: string;
  foto?: string | null;
  forma?: 'arco' | 'circulo' | 'rect';
  className?: string;
  sizes?: string;
  prioridad?: boolean;
  /** Índice para alternar el tono del placeholder en listas. */
  variante?: number;
}) {
  const [fallo, setFallo] = useState(false);
  const formas = {
    arco: 'rounded-t-[999px] rounded-b-[6px]',
    circulo: 'rounded-full',
    rect: 'rounded-[6px]',
  };

  return (
    <div className={cx('relative overflow-hidden', formas[forma], className)}>
      {foto && !fallo ? (
        <Foto src={foto} alt={`Retrato de ${nombre}`} sizes={sizes} prioridad={prioridad} alFallar={() => setFallo(true)} />
      ) : (
        <div
          role="img"
          aria-label={nombre}
          className={cx('flex h-full w-full items-center justify-center font-serif [container-type:inline-size]', tono(nombre, variante))}
        >
          <span className="text-[clamp(0.9rem,30cqw,5rem)] font-light italic tracking-tight" aria-hidden>
            {iniciales(nombre)}
          </span>
        </div>
      )}
    </div>
  );
}

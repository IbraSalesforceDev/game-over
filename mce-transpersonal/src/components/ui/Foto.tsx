import { useState } from 'react';
import { cx } from '../../lib/utilidades';

type Variante = [ruta: string, ancho: number];
type EntradaFoto = { ancho: number; alto: number; avif: Variante[]; webp: Variante[] };

// Generado por `npm run fotos`. Con glob, si el archivo aún no existe no rompe nada.
const generados = import.meta.glob<Record<string, EntradaFoto>>('../../data/fotos.generated.json', {
  eager: true,
  import: 'default',
});
const manifiesto: Record<string, EntradaFoto> = Object.values(generados)[0] ?? {};

const srcset = (v: Variante[]) => v.map(([ruta, ancho]) => `${ruta} ${ancho}w`).join(', ');

/**
 * Foto real optimizada: usa las versiones AVIF/WebP generadas por
 * `npm run fotos` y, si no existen, el archivo original.
 * Si la foto falla al cargar, llama a `alFallar` (para mostrar el placeholder).
 */
export default function Foto({
  src,
  alt,
  sizes = '(min-width: 1024px) 40vw, 90vw',
  className,
  prioridad = false,
  alFallar,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  prioridad?: boolean;
  alFallar?: () => void;
}) {
  const [cargada, setCargada] = useState(false);
  const datos = manifiesto[src];

  const img = (
    <img
      src={src}
      alt={alt}
      width={datos?.ancho}
      height={datos?.alto}
      loading={prioridad ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={prioridad ? 'high' : undefined}
      onLoad={() => setCargada(true)}
      onError={alFallar}
      className={cx('h-full w-full object-cover transition-opacity duration-700', cargada ? 'opacity-100' : 'opacity-0', className)}
    />
  );

  if (!datos) return img;

  return (
    <picture>
      <source type="image/avif" srcSet={srcset(datos.avif)} sizes={sizes} />
      <source type="image/webp" srcSet={srcset(datos.webp)} sizes={sizes} />
      {img}
    </picture>
  );
}

/** Ancho real de la foto (si se ha procesado), para avisar de baja resolución. */
export function anchoFoto(src: string): number | null {
  return manifiesto[src]?.ancho ?? null;
}

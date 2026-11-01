import { cx } from '../../lib/utilidades';

/**
 * Rótulo de sección: texto pequeño en minúscula normal con un punto de color.
 * (`numero` se acepta por compatibilidad pero no se muestra: solo se numeran
 * las cosas que de verdad son una secuencia.)
 */
export default function Etiqueta({
  children,
  className,
  color = 'bg-dorado',
}: {
  numero?: string;
  children: string;
  className?: string;
  color?: string;
}) {
  return (
    <p className={cx('etiqueta flex items-center gap-3', className)}>
      <span aria-hidden className={cx('h-2.5 w-2.5 rounded-full', color)} />
      {children}
    </p>
  );
}

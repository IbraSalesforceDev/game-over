import { cx } from '../../lib/utilidades';

/**
 * Anillos concéntricos que nacen en el centro y se expanden despacio, como las
 * vibraciones que forman el logo en la portada. Solo CSS: no pesa.
 */
export default function Ondas({ className, color = 'border-celeste/40', cantidad = 4, duracion = 10 }: { className?: string; color?: string; cantidad?: number; duracion?: number }) {
  return (
    <div aria-hidden className={cx('pointer-events-none absolute aspect-square', className)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <span
          key={i}
          className={cx('onda absolute inset-0 rounded-full border', color)}
          style={{ animationDuration: `${duracion}s`, animationDelay: `${(-duracion * i) / cantidad}s` }}
        />
      ))}
    </div>
  );
}

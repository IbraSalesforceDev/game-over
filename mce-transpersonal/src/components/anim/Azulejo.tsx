import { useId } from 'react';
import { cx } from '../../lib/utilidades';

/**
 * Franja de azulejo mediterráneo dibujada en código (guiño a la cerámica de
 * Valencia y Andalucía). Decorativa.
 */
export default function Azulejo({ className, fondo = '#f8f6f1' }: { className?: string; fondo?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg aria-hidden className={cx('block h-12 w-full sm:h-14', className)} preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={`az-${id}`} width="56" height="56" patternUnits="userSpaceOnUse">
          <rect width="56" height="56" fill={fondo} />
          {/* cuartos de círculo en las esquinas: al repetirse forman círculos */}
          <g fill="#e9a23b">
            <path d="M0 0h14a14 14 0 0 1-14 14Z" />
            <path d="M56 0v14A14 14 0 0 1 42 0Z" />
            <path d="M0 56V42a14 14 0 0 1 14 14Z" />
            <path d="M56 56H42a14 14 0 0 1 14-14Z" />
          </g>
          {/* flor central */}
          <g fill="#1e5e78">
            <ellipse cx="28" cy="17" rx="5" ry="9" />
            <ellipse cx="28" cy="39" rx="5" ry="9" />
            <ellipse cx="17" cy="28" rx="9" ry="5" />
            <ellipse cx="39" cy="28" rx="9" ry="5" />
          </g>
          <circle cx="28" cy="28" r="4.5" fill="#c13e55" />
          <path d="M28 0v6M28 50v6M0 28h6M50 28h6" stroke="#1e5e78" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#az-${id})`} />
    </svg>
  );
}

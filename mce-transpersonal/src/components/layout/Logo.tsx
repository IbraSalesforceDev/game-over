import logo from '../../assets/logo.png';
import { escuela } from '../../data/escuela';
import { cx } from '../../lib/utilidades';

/** Logo original de MCE, tal cual: sin filtros, sin invertir y sin recolorear. */
export default function Logo({ className }: { className?: string; claro?: boolean }) {
  return <img src={logo} alt={escuela.nombre} width={557} height={414} className={cx('h-11 w-auto sm:h-12', className)} decoding="async" />;
}

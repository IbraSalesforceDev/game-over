import { cx } from '../../lib/utilidades';

/**
 * Fondo con manchas de color difuminadas que se desplazan muy despacio.
 * Tonos cálidos (dorado, terracota, salvia). Sin movimiento si se pide reducirlo.
 */
export default function FondoVivo({ className, intensidad = 1 }: { className?: string; intensidad?: number }) {
  return (
    <div aria-hidden className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)} style={{ opacity: intensidad }}>
      <div className="deriva-a absolute -left-[12%] top-[-10%] h-[60vmax] w-[60vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(234,215,162,0.85),rgba(234,215,162,0)_65%)]" />
      <div className="deriva-b absolute right-[-18%] top-[18%] h-[52vmax] w-[52vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(240,216,201,0.9),rgba(240,216,201,0)_62%)]" />
      <div className="deriva-c absolute bottom-[-30%] left-[25%] h-[55vmax] w-[55vmax] rounded-full bg-[radial-gradient(circle_at_center,rgba(221,227,211,0.95),rgba(221,227,211,0)_62%)]" />
    </div>
  );
}

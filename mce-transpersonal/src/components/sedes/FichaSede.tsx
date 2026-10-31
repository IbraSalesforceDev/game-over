import { Link } from 'react-router';
import { enlaceTelefono } from '../../data/escuela';
import { nombreComunidad, type Sede } from '../../data/sedes';
import { cx } from '../../lib/utilidades';
import { IconoFacebook, IconoInstagram, IconoTelefono } from '../ui/Iconos';
import Retrato from '../ui/Retrato';

/**
 * Ficha de una sede, separada por filetes finos (sin cajas).
 * `compacta`: versión para Contacto, sin retratos.
 */
export default function FichaSede({ sede, compacta = false }: { sede: Sede; numero?: number; compacta?: boolean }) {
  const tieneRedes = sede.instagram || sede.facebook;

  return (
    <article
      className={cx(
        'group relative grid gap-6 py-8 transition-colors duration-500 md:grid-cols-12 md:gap-8',
        compacta ? 'md:py-7' : 'md:py-10',
      )}
      aria-labelledby={`sede-${sede.id}`}
    >
      {/* fondo que entra al pasar por encima */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -inset-x-4 origin-left scale-x-0 rounded-sm bg-lino/80 transition-transform duration-700 ease-[var(--ease-suave)] group-hover:scale-x-100 sm:-inset-x-6"
      />

      <header className="relative md:col-span-4">
        <h3
          id={`sede-${sede.id}`}
          className={cx(
            'mt-1 transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-1.5',
            compacta ? 'text-[1.7rem]' : 'text-[clamp(1.9rem,3.4vw,2.6rem)]',
          )}
        >
          {sede.nombre}
        </h3>
        <p className="mt-1 text-sm text-carbon-suave">{nombreComunidad(sede.comunidad)}</p>
      </header>

      {!compacta && (
        <div className="relative md:col-span-4">
          {sede.facilitadores.length > 0 && (
            <>
              <p className="etiqueta mb-4">Facilitan</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-4">
                {sede.facilitadores.map((f, i) => (
                  <li key={f.nombre} className="flex items-center gap-3">
                    <Retrato nombre={f.nombre} foto={f.foto} variante={i} forma="circulo" className="h-14 w-14 shrink-0" sizes="56px" />
                    <span className="leading-tight">
                      <span className="block text-[0.98rem]">{f.nombre}</span>
                      {f.rol && <span className="block text-sm text-carbon-suave">{f.rol}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className={cx('relative space-y-4', compacta ? 'md:col-span-8' : 'md:col-span-4')}>
        {sede.telefonos.length > 0 && (
          <ul className={cx('flex flex-col gap-1.5', compacta && 'sm:flex-row sm:flex-wrap sm:gap-x-8')}>
            {sede.telefonos.map((t) => (
              <li key={t}>
                <a href={enlaceTelefono(t)} className="group/tel inline-flex items-center gap-3 text-[1.05rem]">
                  <IconoTelefono className="h-4 w-4 text-dorado-hondo transition-transform duration-300 group-hover/tel:-rotate-12" />
                  <span className="enlace-linea tabular-nums">{t}</span>
                  <span className="sr-only">(llamar a {sede.nombre})</span>
                </a>
              </li>
            ))}
          </ul>
        )}

        {tieneRedes && (
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-carbon-suave">
            {sede.instagram && (
              <li>
                <a href={sede.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-carbon">
                  <IconoInstagram className="h-4 w-4" />
                  <span className="enlace-linea">Instagram</span>
                  <span className="sr-only">de {sede.nombre} (se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
            {sede.facebook && (
              <li>
                <a href={sede.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors hover:text-carbon">
                  <IconoFacebook className="h-4 w-4" />
                  <span className="enlace-linea">Facebook</span>
                  <span className="sr-only">de {sede.nombre} (se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
          </ul>
        )}

        {sede.aviso && (
          <p className="max-w-sm border-l-2 border-terracota/50 pl-4 text-[0.9rem] italic leading-relaxed text-carbon-suave">
            {sede.aviso}
            {sede.telefonos.length === 0 && (
              <>
                {' '}
                <Link to="/contacto#formulario" className="enlace-texto not-italic text-carbon">
                  Escribir a MCE
                </Link>
              </>
            )}
          </p>
        )}
      </div>
    </article>
  );
}

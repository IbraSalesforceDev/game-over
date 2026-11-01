import { Link } from 'react-router';
import { motion } from 'framer-motion';
import { enlaceTelefono } from '../../data/escuela';
import { nombreComunidad, type Sede } from '../../data/sedes';
import { fotosSede } from '../../data/fotos';
import { cx } from '../../lib/utilidades';
import { IconoFacebook, IconoInstagram, IconoTelefono } from '../ui/Iconos';

const unir = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));

/**
 * Ficha de una sede, separada por filetes finos: nombre y facilitadores,
 * foto real de la sede (si la hay) y contacto.
 * `compacta`: versión para Contacto, sin fotos.
 */
export default function FichaSede({ sede, compacta = false }: { sede: Sede; numero?: number; compacta?: boolean }) {
  const tieneRedes = sede.instagram || sede.facebook;
  const foto = compacta ? undefined : fotosSede[sede.id]?.[0];

  return (
    <article className={cx('group relative grid gap-6 py-8 md:grid-cols-12 md:gap-8', compacta ? 'md:py-7' : 'md:py-10')} aria-labelledby={`sede-${sede.id}`}>
      <header className="relative md:col-span-4">
        <h3
          id={`sede-${sede.id}`}
          className={cx('font-medium transition-transform duration-300 ease-[var(--ease-suave)] group-hover:translate-x-1', compacta ? 'text-[1.9rem]' : 'text-[clamp(2.1rem,3.6vw,2.9rem)]')}
        >
          {sede.nombre}
        </h3>
        <p className="mt-1 text-sm text-carbon-suave">{nombreComunidad(sede.comunidad)}</p>
        {!compacta && sede.facilitadores.length > 0 && (
          <p className="mt-5 max-w-xs text-[0.98rem] leading-relaxed text-carbon-suave">
            Facilitan <span className="text-carbon">{unir(sede.facilitadores.map((f) => f.nombre))}</span>
          </p>
        )}
      </header>

      {foto && (
        <figure className="relative md:col-span-4">
          <motion.div
            className="aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-lino"
            initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
            whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
            viewport={{ once: true, margin: '0px 0px -8% 0px' }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          >
            <img
              src={foto.src}
              alt={foto.alt}
              width={foto.ancho}
              height={foto.alto}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-suave)] group-hover:scale-[1.04]"
            />
          </motion.div>
        </figure>
      )}

      <div className={cx('relative space-y-4', compacta ? 'md:col-span-8' : foto ? 'md:col-span-4' : 'md:col-span-8')}>
        {sede.telefonos.length > 0 && (
          <ul className={cx('flex flex-col gap-1.5', compacta && 'sm:flex-row sm:flex-wrap sm:gap-x-8')}>
            {sede.telefonos.map((t) => (
              <li key={t}>
                <a href={enlaceTelefono(t)} className="group/tel inline-flex items-center gap-3 text-[1.08rem]">
                  <IconoTelefono className="h-4 w-4 text-dorado-hondo" />
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
                <a href={sede.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-carbon">
                  <IconoInstagram className="h-4 w-4" />
                  <span className="enlace-linea">Instagram</span>
                  <span className="sr-only">de {sede.nombre} (se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
            {sede.facebook && (
              <li>
                <a href={sede.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 transition-colors duration-200 hover:text-carbon">
                  <IconoFacebook className="h-4 w-4" />
                  <span className="enlace-linea">Facebook</span>
                  <span className="sr-only">de {sede.nombre} (se abre en una pestaña nueva)</span>
                </a>
              </li>
            )}
          </ul>
        )}

        {sede.aviso && (
          <p className="max-w-sm border-l-2 border-dorado/60 pl-4 text-[0.92rem] leading-relaxed text-carbon-suave">
            {sede.aviso}
            {sede.telefonos.length === 0 && (
              <>
                {' '}
                <Link to="/contacto#formulario" className="enlace-texto text-carbon">
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

import { Link } from 'react-router';
import { contacto, legales, menu } from '../../data/navegacion';
import { escuela, enlaceTelefono } from '../../data/escuela';
import { useConsentimiento } from '../../lib/consentimiento';
import { IconoEmail, IconoInstagram, IconoTelefono } from '../ui/Iconos';
import { Revelar } from '../anim/Revelar';
import Logo from './Logo';

/** Pie: logo, navegación, contacto general, Instagram y enlaces legales. Sin dirección. */
export default function Pie() {
  const { abrirPreferencias } = useConsentimiento();
  const anio = new Date().getFullYear();

  return (
    <footer className="relative mt-auto bg-lino">
      <div className="marco pb-10 pt-20 sm:pt-28">
        <Revelar>
          <p className="max-w-4xl font-serif text-[clamp(1.9rem,4.6vw,3.6rem)] font-light leading-[1.12] text-carbon">
            Comprendamos que no estamos solos,
            <span className="italic text-dorado-hondo"> que realmente, todos somos uno.</span>
          </p>
        </Revelar>

        <div className="filete mt-16 grid gap-12 border-t pt-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link to="/" aria-label="Ir al inicio" className="inline-block rounded-sm">
              <Logo />
            </Link>
            <p className="mt-5 max-w-xs text-[0.95rem] leading-relaxed text-carbon-suave">
              {escuela.lema}. Escuela transpersonal fundada por {escuela.fundadora}.
            </p>
          </div>

          <nav aria-label="Pie de página" className="md:col-span-3">
            <h2 className="etiqueta mb-5 !font-sans">Secciones</h2>
            <ul className="space-y-2.5">
              {[...menu, contacto].map((e) => (
                <li key={e.ruta}>
                  <Link to={e.ruta} className="enlace-linea text-[0.98rem]">
                    {e.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-5">
            <h2 className="etiqueta mb-5 !font-sans">Hablemos</h2>
            <ul className="space-y-3 text-[0.98rem]">
              {escuela.telefono && (
                <li>
                  <a href={enlaceTelefono(escuela.telefono)} className="group inline-flex items-center gap-3">
                    <IconoTelefono className="h-[1.1rem] w-[1.1rem] text-dorado-hondo" />
                    <span className="enlace-linea">{escuela.telefono}</span>
                  </a>
                </li>
              )}
              {escuela.email && (
                <li>
                  <a href={`mailto:${escuela.email}`} className="group inline-flex items-center gap-3">
                    <IconoEmail className="h-[1.1rem] w-[1.1rem] text-dorado-hondo" />
                    <span className="enlace-linea">{escuela.email}</span>
                  </a>
                </li>
              )}
              <li>
                <a href={escuela.instagram.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3">
                  <IconoInstagram className="h-[1.1rem] w-[1.1rem] text-dorado-hondo" />
                  <span className="enlace-linea">@{escuela.instagram.usuario}</span>
                  <span className="sr-only">(Instagram, se abre en una pestaña nueva)</span>
                </a>
              </li>
              <li>
                <Link to="/sedes" className="enlace-linea text-carbon-suave">
                  O habla directamente con tu sede
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="filete mt-16 flex flex-col gap-4 border-t pt-6 text-[0.85rem] text-carbon-suave sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {anio} {escuela.nombre}
          </p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legales.map((e) => (
              <li key={e.ruta}>
                <Link to={e.ruta} className="enlace-linea">
                  {e.nombre}
                </Link>
              </li>
            ))}
            <li>
              <button type="button" onClick={abrirPreferencias} className="enlace-linea">
                Preferencias de cookies
              </button>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

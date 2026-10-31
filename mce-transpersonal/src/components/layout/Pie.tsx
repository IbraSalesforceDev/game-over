import { useRef } from 'react';
import { Link } from 'react-router';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';
import { contacto, legales, menu } from '../../data/navegacion';
import { escuela, enlaceTelefono } from '../../data/escuela';
import { useConsentimiento } from '../../lib/consentimiento';
import { IconoEmail, IconoInstagram, IconoTelefono } from '../ui/Iconos';
import { BotonEnlace } from '../ui/Boton';
import Logo from './Logo';

/**
 * Pie oscuro que queda fijo debajo del contenido: al llegar al final de la
 * página, el contenido "se levanta" y lo descubre. Sin dirección postal.
 */
export default function Pie() {
  const { abrirPreferencias } = useConsentimiento();
  const anio = new Date().getFullYear();
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-35%', '0%']);
  const escala = useTransform(scrollYProgress, [0, 1], [0.92, 1]);

  return (
    <footer
      ref={ref}
      className="relative z-0 overflow-hidden bg-carbon text-marfil [@media(min-width:1024px)_and_(min-height:780px)]:sticky [@media(min-width:1024px)_and_(min-height:780px)]:bottom-0"
    >
      <motion.div style={reducido ? undefined : { y, scale: escala }} className="origin-bottom">
        <div className="marco pt-24 lg:pt-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end">
            <p className="font-serif text-[clamp(2rem,4.2vw,3.4rem)] font-light leading-[1.08] lg:col-span-8">
              Comprendamos que no estamos solos,
              <span className="italic text-dorado-claro"> que realmente, todos somos uno.</span>
            </p>
            <div className="lg:col-span-4 lg:justify-self-end">
              <BotonEnlace a="/sedes" variante="claro">
                Habla con tu sede
              </BotonEnlace>
            </div>
          </div>

          <div className="mt-14 grid gap-10 border-t border-marfil/15 pt-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <Link to="/" aria-label="Ir al inicio" className="inline-block rounded-sm">
                {/* El logo se muestra tal cual, sobre una pastilla clara para no alterar sus colores */}
                <span className="inline-flex rounded-full bg-marfil px-5 py-2.5">
                  <Logo />
                </span>
              </Link>
              <p className="mt-6 max-w-xs text-[0.95rem] leading-relaxed text-marfil/65">
                {escuela.lema}. Escuela transpersonal fundada por {escuela.fundadora}.
              </p>
            </div>

            <nav aria-label="Pie de página" className="md:col-span-3">
              <h2 className="etiqueta mb-5 !text-marfil/50">Secciones</h2>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                {[...menu, contacto].map((e) => (
                  <li key={e.ruta}>
                    <Link to={e.ruta} className="group inline-flex items-center gap-2 text-[1rem] text-marfil/85 transition-colors hover:text-marfil">
                      <span className="h-px w-0 bg-dorado transition-all duration-500 ease-[var(--ease-suave)] group-hover:w-4" />
                      {e.nombre}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="md:col-span-5">
              <h2 className="etiqueta mb-5 !text-marfil/50">Hablemos</h2>
              <ul className="space-y-3 text-[1rem]">
                {escuela.telefono && (
                  <li>
                    <a href={enlaceTelefono(escuela.telefono)} className="group inline-flex items-center gap-3">
                      <IconoTelefono className="h-[1.1rem] w-[1.1rem] text-dorado" />
                      <span className="enlace-linea">{escuela.telefono}</span>
                    </a>
                  </li>
                )}
                {escuela.email && (
                  <li>
                    <a href={`mailto:${escuela.email}`} className="group inline-flex items-center gap-3">
                      <IconoEmail className="h-[1.1rem] w-[1.1rem] text-dorado" />
                      <span className="enlace-linea">{escuela.email}</span>
                    </a>
                  </li>
                )}
                <li>
                  <a href={escuela.instagram.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-3">
                    <IconoInstagram className="h-[1.1rem] w-[1.1rem] text-dorado" />
                    <span className="enlace-linea">@{escuela.instagram.usuario}</span>
                    <span className="sr-only">(Instagram, se abre en una pestaña nueva)</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Marca en grande, cortada por abajo */}
        <div aria-hidden className="pointer-events-none mt-10 select-none overflow-hidden">
          <p className="translate-y-[16%] text-center font-serif text-[clamp(7rem,19vw,20rem)] font-light leading-[0.8] tracking-[-0.04em] text-marfil/[0.07]">
            MCE
          </p>
        </div>

        <div className="relative border-t border-marfil/10 bg-carbon">
          <div className="marco flex flex-col gap-4 py-6 text-[0.85rem] text-marfil/55 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {anio} {escuela.nombre}
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {legales.map((e) => (
                <li key={e.ruta}>
                  <Link to={e.ruta} className="enlace-linea hover:text-marfil">
                    {e.nombre}
                  </Link>
                </li>
              ))}
              <li>
                <button type="button" onClick={abrirPreferencias} className="enlace-linea hover:text-marfil">
                  Preferencias de cookies
                </button>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}

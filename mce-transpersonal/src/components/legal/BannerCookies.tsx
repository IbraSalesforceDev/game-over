import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useConsentimiento, type DocumentoLegal } from '../../lib/consentimiento';
import { DURACION_INTRO, hayIntro } from '../../lib/transicion';
import { cx } from '../../lib/utilidades';
import { clasesBoton, RellenoBoton } from '../ui/Boton';
import { IconoCerrar } from '../ui/Iconos';

/**
 * Aviso de la primera visita, abajo. Dos casillas separadas (privacidad y
 * cookies); cada texto abre su política en un modal. "Aceptar y continuar"
 * solo se activa con las dos marcadas.
 */
export default function BannerCookies() {
  const { bannerAbierto, aceptado, aceptar, cerrarBanner, abrirDocumento, documento } = useConsentimiento();
  const [privacidad, setPrivacidad] = useState(false);
  const [cookies, setCookies] = useState(false);
  const id = useId();
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerAbierto) {
      setPrivacidad(Boolean(aceptado));
      setCookies(Boolean(aceptado));
    }
  }, [bannerAbierto, aceptado]);

  const casilla = (doc: DocumentoLegal, marcada: boolean, cambiar: (v: boolean) => void, texto: string) => (
    <div className="flex items-start gap-3">
      <span className="relative mt-[0.2rem] inline-flex h-5 w-5 shrink-0">
        <input
          id={`${id}-${doc}`}
          type="checkbox"
          checked={marcada}
          onChange={(e) => cambiar(e.target.checked)}
          className="peer h-5 w-5 cursor-pointer appearance-none rounded-[4px] border border-carbon/40 bg-marfil transition-colors checked:border-dorado-hondo checked:bg-dorado"
        />
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 h-5 w-5 text-carbon opacity-0 transition-opacity peer-checked:opacity-100">
          <path d="M5 10.5 8.5 14 15 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <label htmlFor={`${id}-${doc}`} className="cursor-pointer text-[0.95rem] leading-snug">
        He leído y acepto la{' '}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            abrirDocumento(doc);
          }}
          className="enlace-texto font-medium"
        >
          {texto}
        </button>
      </label>
    </div>
  );

  const listo = privacidad && cookies;

  return (
    <AnimatePresence>
      {bannerAbierto && (
        <motion.section
          role="region"
          aria-label="Aviso de privacidad y cookies"
          className={cx('fixed inset-x-0 bottom-0 z-[85] p-3 sm:p-5', documento && 'pointer-events-none')}
          onAnimationComplete={(def) => {
            if (def === 'visible' || (typeof def === 'object' && def !== null && 'y' in def && (def as { y: unknown }).y === 0)) {
              caja.current?.focus({ preventScroll: true });
            }
          }}
          initial={{ y: '110%' }}
          animate={{ y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: aceptado ? 0 : hayIntro ? DURACION_INTRO + 0.4 : 0.8 } }}
          exit={{ y: '110%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } }}
        >
          <div ref={caja} tabIndex={-1} className="mx-auto max-w-4xl rounded-2xl outline-none border border-carbon/10 bg-marfil p-5 shadow-[0_24px_70px_-24px_rgba(46,42,38,0.5)] sm:p-7">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl">Antes de seguir</h2>
                <p className="mt-2 max-w-2xl text-[0.95rem] text-carbon-suave">
                  Esta web solo guarda en tu navegador que has aceptado este aviso. No usamos cookies de publicidad ni de seguimiento.
                </p>
              </div>
              {aceptado && (
                <button type="button" onClick={cerrarBanner} aria-label="Cerrar aviso" className="-mr-2 -mt-1 rounded-full p-2 text-carbon-suave hover:bg-lino">
                  <IconoCerrar className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                {casilla('privacidad', privacidad, setPrivacidad, 'política de privacidad')}
                {casilla('cookies', cookies, setCookies, 'política de cookies')}
              </div>
              <button
                type="button"
                onClick={aceptar}
                disabled={!listo}
                className={clasesBoton('principal', cx('shrink-0 justify-center', !listo && '!bg-arena !text-carbon-suave'))}
                aria-describedby={!listo ? `${id}-ayuda` : undefined}
              >
                {listo && <RellenoBoton />}
                <span className="relative transition-colors duration-500 group-hover:text-marfil">Aceptar y continuar</span>
              </button>
            </div>
            {!listo && (
              <p id={`${id}-ayuda`} className="mt-3 text-[0.8rem] text-carbon-suave sm:text-right">
                Marca las dos casillas para continuar.
              </p>
            )}
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

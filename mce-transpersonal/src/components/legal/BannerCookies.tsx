import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useConsentimiento } from '../../lib/consentimiento';
import { useIntroTerminada } from '../../lib/transicion';
import { cx } from '../../lib/utilidades';
import { IconoCerrar } from '../ui/Iconos';

/**
 * Aviso de cookies (RGPD y LSSI). Sale cuando termina la animación de inicio
 * y solo si no hay una elección guardada (o al pulsar «Preferencias de
 * cookies»). Aceptar, Rechazar y Configurar tienen el mismo peso visual.
 * La web solo usa almacenamiento técnico: no hay nada que bloquear.
 */
export default function BannerCookies() {
  const { bannerAbierto, eleccion, elegir, cerrarBanner, abrirDocumento, documento } = useConsentimiento();
  const introTerminada = useIntroTerminada();
  const [configurando, setConfigurando] = useState(false);
  const id = useId();
  const caja = useRef<HTMLDivElement>(null);
  const visible = bannerAbierto && introTerminada;

  useEffect(() => {
    if (visible) setConfigurando(false);
  }, [visible]);

  const boton =
    'inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-carbon bg-marfil px-4 py-2.5 text-[0.95rem] font-medium text-carbon transition-colors duration-200 hover:bg-carbon hover:text-marfil focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dorado sm:flex-none sm:px-6';

  const enlaceDoc = (doc: 'privacidad' | 'cookies', texto: string) => (
    <button type="button" onClick={() => abrirDocumento(doc)} className="enlace-texto font-medium text-carbon">
      {texto}
    </button>
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.section
          role="region"
          aria-labelledby={`${id}-titulo`}
          className={cx('fixed inset-x-0 bottom-0 z-[85] p-3 sm:p-5', documento && 'pointer-events-none')}
          initial={{ y: '110%' }}
          animate={{ y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: eleccion ? 0 : 0.6 } }}
          exit={{ y: '110%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } }}
          onAnimationComplete={(def) => {
            if (typeof def === 'object' && def !== null && 'y' in def && (def as { y: unknown }).y === 0) caja.current?.focus({ preventScroll: true });
          }}
        >
          <div
            ref={caja}
            tabIndex={-1}
            className="mx-auto max-w-4xl rounded-2xl border border-carbon/10 bg-marfil p-5 shadow-[0_24px_70px_-24px_rgba(22,33,62,0.5)] outline-none sm:p-7"
          >
            <div className="flex items-start justify-between gap-6">
              <div>
                <h2 id={`${id}-titulo`} className="font-serif text-xl sm:text-2xl">
                  Cookies
                </h2>
                <p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-carbon-suave">
                  Esta web solo usa almacenamiento técnico, necesario para que funcione y para recordar tu elección. No usamos cookies de
                  analítica ni de publicidad. Más información en la {enlaceDoc('cookies', 'política de cookies')} y en la{' '}
                  {enlaceDoc('privacidad', 'política de privacidad')}.
                </p>
              </div>
              {eleccion && (
                <button type="button" onClick={cerrarBanner} aria-label="Cerrar aviso" className="-mr-2 -mt-1 rounded-full p-2 text-carbon-suave hover:bg-lino">
                  <IconoCerrar className="h-5 w-5" />
                </button>
              )}
            </div>

            {configurando && (
              <div className="filete mt-5 border-t pt-5" id={`${id}-config`}>
                <div className="flex items-start justify-between gap-6 rounded-xl bg-lino px-4 py-4 sm:px-5">
                  <div>
                    <p className="font-medium text-carbon" id={`${id}-tecnicas`}>
                      Técnicas
                    </p>
                    <p className="mt-1 text-[0.9rem] leading-relaxed text-carbon-suave">
                      Necesarias para que la web funcione y recuerde tu elección. No se pueden desactivar.
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-2.5 pt-0.5 text-[0.85rem] text-carbon-suave">
                    Siempre activas
                    <span
                      role="switch"
                      aria-checked="true"
                      aria-disabled="true"
                      aria-labelledby={`${id}-tecnicas`}
                      className="relative inline-flex h-6 w-11 items-center rounded-full bg-mar/70"
                    >
                      <span className="absolute right-1 h-4 w-4 rounded-full bg-marfil" />
                    </span>
                  </span>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5 sm:justify-end sm:gap-3">
              {configurando ? (
                <button type="button" onClick={() => elegir('configurar')} className={boton}>
                  Guardar mi elección
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => elegir('rechazar')} className={boton}>
                    Rechazar
                  </button>
                  <button type="button" onClick={() => setConfigurando(true)} className={boton}>
                    Configurar
                  </button>
                  <button type="button" onClick={() => elegir('aceptar')} className={boton}>
                    Aceptar
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

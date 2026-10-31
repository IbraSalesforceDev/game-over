import { useId, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { escuela } from '../../data/escuela';
import { bloques } from '../../data/formaciones';
import { sedes } from '../../data/sedes';
import { useConsentimiento } from '../../lib/consentimiento';
import { cx } from '../../lib/utilidades';
import { clasesBoton } from '../ui/Boton';
import { FlechaMano } from '../anim/Trazo';

type Estado = 'inicial' | 'enviando' | 'enviado' | 'error' | 'sin-configurar';

const motivos = [
  ...bloques.map((b) => b.titulo),
  'Consulta transpersonal',
  'Contactar con una sede',
  'Otro motivo',
];

/**
 * Formulario de contacto. No hay base de datos: se envía por email a través
 * de Formspree (endpoint en VITE_FORMSPREE_ENDPOINT).
 */
export default function Formulario() {
  const id = useId();
  const { abrirDocumento } = useConsentimiento();
  const [estado, setEstado] = useState<Estado>('inicial');
  const [errores, setErrores] = useState<Record<string, string>>({});

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);

    const nuevos: Record<string, string> = {};
    if (!String(datos.get('nombre') ?? '').trim()) nuevos.nombre = 'Escribe tu nombre.';
    const email = String(datos.get('email') ?? '').trim();
    if (!email) nuevos.email = 'Escribe tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nuevos.email = 'Revisa el correo: parece que falta algo.';
    if (!String(datos.get('mensaje') ?? '').trim()) nuevos.mensaje = 'Cuéntanos brevemente qué necesitas.';
    if (!datos.get('privacidad')) nuevos.privacidad = 'Necesitamos que aceptes la política de privacidad para responderte.';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      const primero = Object.keys(nuevos)[0];
      form.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus();
      return;
    }

    if (!escuela.formulario) {
      setEstado('sin-configurar');
      return;
    }

    setEstado('enviando');
    try {
      const respuesta = await fetch(escuela.formulario, {
        method: 'POST',
        body: datos,
        headers: { Accept: 'application/json' },
      });
      if (!respuesta.ok) throw new Error(String(respuesta.status));
      form.reset();
      setEstado('enviado');
    } catch {
      setEstado('error');
    }
  }

  const campo = 'peer w-full border-0 border-b border-carbon/25 bg-transparent px-0 pb-3 pt-7 text-[1.05rem] text-carbon outline-none transition-colors placeholder:text-transparent focus:border-dorado-hondo focus-visible:outline-none';
  const etiqueta =
    'pointer-events-none absolute left-0 top-7 origin-left text-[1.02rem] text-carbon-suave transition-all duration-300 peer-focus:top-1 peer-focus:scale-[0.8] peer-focus:text-dorado-hondo peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:scale-[0.8]';
  const error = (nombre: string) =>
    errores[nombre] ? (
      <p id={`${id}-${nombre}-error`} className="mt-2 text-sm text-terracota-honda">
        {errores[nombre]}
      </p>
    ) : null;
  const aria = (nombre: string) =>
    errores[nombre] ? { 'aria-invalid': true, 'aria-describedby': `${id}-${nombre}-error` } : {};

  return (
    <div id="formulario" className="relative">
      <AnimatePresence mode="wait">
        {estado === 'enviado' ? (
          <motion.div
            key="ok"
            role="status"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="py-10"
          >
            <p className="font-serif text-[clamp(2rem,4vw,3rem)] leading-tight">
              Mensaje enviado. <span className="italic text-dorado-hondo">Gracias por escribirnos.</span>
            </p>
            <p className="mt-4 max-w-md text-carbon-suave">Te responderemos al correo que nos has indicado.</p>
            <button type="button" onClick={() => setEstado('inicial')} className="enlace-texto mt-8">
              Escribir otro mensaje
            </button>
          </motion.div>
        ) : (
          <motion.form key="form" noValidate onSubmit={enviar} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Campo trampa para bots (Formspree lo descarta si viene relleno) */}
            <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            <input type="hidden" name="_subject" value="Nuevo mensaje desde la web de MCE" />

            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="relative">
                <input id={`${id}-nombre`} name="nombre" autoComplete="name" placeholder="Nombre" className={campo} {...aria('nombre')} />
                <label htmlFor={`${id}-nombre`} className={etiqueta}>
                  Nombre
                </label>
                {error('nombre')}
              </div>
              <div className="relative">
                <input id={`${id}-email`} name="email" type="email" autoComplete="email" placeholder="Correo" className={campo} {...aria('email')} />
                <label htmlFor={`${id}-email`} className={etiqueta}>
                  Correo electrónico
                </label>
                {error('email')}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 sm:gap-8">
              <div className="relative">
                <input id={`${id}-telefono`} name="telefono" type="tel" autoComplete="tel" placeholder="Teléfono" className={campo} />
                <label htmlFor={`${id}-telefono`} className={etiqueta}>
                  Teléfono <span className="text-sm">(opcional)</span>
                </label>
              </div>
              <div className="relative">
                <label htmlFor={`${id}-motivo`} className="absolute left-0 top-1 origin-left scale-[0.8] text-[1.02rem] text-carbon-suave">
                  Motivo
                </label>
                <select id={`${id}-motivo`} name="motivo" defaultValue={motivos[0]} className={cx(campo, 'cursor-pointer appearance-none pr-8')}>
                  {motivos.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <svg aria-hidden viewBox="0 0 12 8" className="pointer-events-none absolute bottom-5 right-1 h-2 w-3 text-carbon-suave">
                  <path d="M1 1.5 6 6l5-4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <label htmlFor={`${id}-sede`} className="absolute left-0 top-1 origin-left scale-[0.8] text-[1.02rem] text-carbon-suave">
                Sede más cercana <span className="text-sm">(opcional)</span>
              </label>
              <select id={`${id}-sede`} name="sede" defaultValue="" className={cx(campo, 'cursor-pointer appearance-none pr-8')}>
                <option value="">Sin preferencia</option>
                {sedes.map((s) => (
                  <option key={s.id}>{s.nombre}</option>
                ))}
              </select>
              <svg aria-hidden viewBox="0 0 12 8" className="pointer-events-none absolute bottom-5 right-1 h-2 w-3 text-carbon-suave">
                <path d="M1 1.5 6 6l5-4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>

            <div className="relative">
              <textarea id={`${id}-mensaje`} name="mensaje" rows={5} placeholder="Mensaje" className={cx(campo, 'resize-y')} {...aria('mensaje')} />
              <label htmlFor={`${id}-mensaje`} className={etiqueta}>
                Mensaje
              </label>
              {error('mensaje')}
            </div>

            <div>
              <div className="flex items-start gap-3">
                <span className="relative mt-[0.2rem] inline-flex h-5 w-5 shrink-0">
                  <input
                    id={`${id}-privacidad`}
                    name="privacidad"
                    type="checkbox"
                    value="Acepta la política de privacidad"
                    required
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded-[4px] border border-carbon/40 bg-marfil transition-colors checked:border-dorado-hondo checked:bg-dorado"
                    {...aria('privacidad')}
                  />
                  <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute inset-0 h-5 w-5 text-carbon opacity-0 transition-opacity peer-checked:opacity-100">
                    <path d="M5 10.5 8.5 14 15 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <label htmlFor={`${id}-privacidad`} className="cursor-pointer text-[0.95rem] leading-snug text-carbon-suave">
                  He leído y acepto la{' '}
                  <button
                    type="button"
                    className="enlace-texto font-medium text-carbon"
                    onClick={(e) => {
                      e.preventDefault();
                      abrirDocumento('privacidad');
                    }}
                  >
                    política de privacidad
                  </button>
                  . Usaremos tus datos solo para responderte.
                </label>
              </div>
              {error('privacidad')}
            </div>

            <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center">
              <button type="submit" disabled={estado === 'enviando'} className={clasesBoton('principal', 'justify-center')}>
                <span>{estado === 'enviando' ? 'Enviando…' : 'Enviar mensaje'}</span>
                <FlechaMano className="transition-transform duration-500 group-hover:translate-x-1.5" />
              </button>
              <div aria-live="polite" className="text-sm">
                {estado === 'error' && (
                  <p className="text-terracota-honda">
                    No se ha podido enviar. Prueba de nuevo en unos minutos o llama a tu sede más cercana.
                  </p>
                )}
                {estado === 'sin-configurar' && (
                  <p className="text-terracota-honda">
                    El formulario todavía no está conectado. Mientras tanto, puedes llamar o escribir directamente a tu sede.
                  </p>
                )}
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}

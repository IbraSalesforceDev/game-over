import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import { bloques, type Bloque, type Formacion } from '../data/formaciones';
import { carteles, type Cartel } from '../data/carteles';
import Modal from '../components/ui/Modal';
import { cx, useEsGrande } from '../lib/utilidades';

const estilosTarjeta = [
  { fondo: 'bg-lino', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-mar-claro', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-amanecer', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-carbon', texto: 'text-marfil', boton: 'principal' as const },
];

/** Abre el cartelito (modal con imagen) de un elemento. */
const AbrirCartel = createContext<(c: Cartel) => void>(() => {});

function IconoImagen({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m3.5 17 5.5-4.5 4 3.5 2.5-2 5 3.5" />
    </svg>
  );
}

/**
 * Nombre de un elemento: si tiene cartel (src/data/carteles.ts), es un botón
 * que lo abre; si no, texto normal.
 */
function NombreConCartel({ id, nombre }: { id: string; nombre: string }) {
  const abrir = useContext(AbrirCartel);
  const cartel = carteles[id];
  if (!cartel) return <>{nombre}</>;
  return (
    <button
      type="button"
      onClick={() => abrir(cartel)}
      aria-haspopup="dialog"
      className="group/cartel inline-flex cursor-pointer items-center gap-3 rounded-md text-left decoration-current/40 underline-offset-[0.18em] hover:underline focus-visible:underline"
    >
      {nombre}
      <IconoImagen className="h-[0.55em] w-[0.55em] shrink-0 opacity-60 transition-[opacity,transform] duration-300 group-hover/cartel:scale-110 group-hover/cartel:opacity-100" />
      <span className="sr-only">(ver cartel)</span>
    </button>
  );
}

/** Detalles de una formación: solo se pintan los campos que tienen datos. */
function Detalles({ f }: { f: Formacion }) {
  if (!f.descripcion && f.detalles.length === 0 && f.contenidos.length === 0) return null;
  return (
    <div className="mt-5 space-y-4 text-[0.98rem] opacity-80">
      {f.descripcion && <p>{f.descripcion}</p>}
      {f.detalles.length > 0 && (
        <dl className="divide-y divide-current/10 border-y border-current/10">
          {f.detalles.map((d) => (
            <div key={d.etiqueta} className="flex justify-between gap-4 py-2">
              <dt>{d.etiqueta}</dt>
              <dd className="text-right">{d.valor}</dd>
            </div>
          ))}
        </dl>
      )}
      {f.contenidos.length > 0 && (
        <ul className="prosa-legal">
          {f.contenidos.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Niveles de Inteligencia Emocional Transpersonal, en escalera ascendente: cada peldaño se dibuja en orden. */
function Escalera({ niveles }: { niveles: Formacion[] }) {
  const n = niveles.length;
  return (
    <div className="relative mt-12">
      <Escalonado como="ol" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {niveles.map((nivel, i) => (
          <motion.li
            key={nivel.id}
            variants={hijoEscalonado}
            className="group relative lg:pr-6"
            style={{ ['--peldano' as string]: `${(n - 1 - i) * 3.4}rem` }}
          >
            <div className="lg:mt-[var(--peldano)]">
              <motion.span
                aria-hidden
                className="mb-5 block h-[2px] origin-left bg-dorado"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.25, ease: [0.65, 0, 0.35, 1] }}
              />
              <span className="font-serif text-sm italic opacity-70">{String(i + 1).padStart(2, '0')}</span>
              <h4 className="mt-1 text-[clamp(2rem,3.2vw,2.9rem)] font-[340] transition-transform duration-500 ease-[var(--ease-suave)] group-hover:-translate-y-1.5">
                <NombreConCartel id={nivel.id} nombre={nivel.nombre} />
              </h4>
              <Detalles f={nivel} />
            </div>
          </motion.li>
        ))}
      </Escalonado>
    </div>
  );
}

function Tarjeta({
  bloque,
  indice,
  total,
  progreso,
}: {
  bloque: Bloque;
  indice: number;
  total: number;
  progreso: MotionValue<number>;
}) {
  const reducido = useReducedMotion();
  // Apilado solo en pantallas grandes y si la tarjeta cabe en la pantalla: si
  // es más alta, la siguiente le taparía el final, así que se desplaza normal.
  const articulo = useRef<HTMLElement>(null);
  const [cabe, setCabe] = useState(true);
  useLayoutEffect(() => {
    const el = articulo.current;
    if (!el) return;
    const medir = () => setCabe(el.offsetHeight <= window.innerHeight - 110);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    window.addEventListener('resize', medir);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);
  const apilar = useEsGrande() && !reducido && cabe;
  const estilo = estilosTarjeta[indice % estilosTarjeta.length]!;
  const objetivo = 1 - (total - indice) * 0.035;
  const escala = useTransform(progreso, [indice / total, 1], [1, objetivo]);
  const esIET = bloque.id === 'inteligencia-emocional-transpersonal';
  const cartelBloque = carteles[bloque.id];
  const abrirCartel = useContext(AbrirCartel);

  return (
    <div
      id={bloque.id}
      className={cx('flex', apilar ? 'sticky h-[100svh] items-center' : 'mb-5')}
      style={apilar ? { top: `calc(5.5rem + ${indice * 1.4}rem)` } : undefined}
    >
      <motion.article
        ref={articulo}
        style={apilar ? { scale: escala } : undefined}
        className={cx(
          'relative w-full origin-top overflow-hidden rounded-[2rem] p-8 shadow-[0_-20px_60px_-40px_rgba(42,38,34,0.5)] sm:p-12 lg:min-h-[72vh] lg:p-16',
          estilo.fondo,
          estilo.texto,
        )}
        aria-labelledby={`t-${bloque.id}`}
      >
        <span aria-hidden className="pointer-events-none absolute -right-16 -top-10 h-[22rem] w-[18rem] rounded-t-[999px] border-[3px] border-current opacity-[0.12] sm:-right-10" />
        <div className="relative flex h-full flex-col">
          <p className="etiqueta !text-current opacity-70">{esIET ? 'Formación por niveles' : 'Formación'}</p>
          <div id={`t-${bloque.id}`} className={cx(cartelBloque && 'relative cursor-pointer')}>
            <Titular como="h2" className="mt-6 max-w-4xl text-[clamp(2.6rem,6.4vw,5.6rem)] font-[330] leading-[0.98] tracking-[-0.025em]" segmentos={[bloque.titulo]} />
            {/* El título entero también abre el cartel (el botón accesible es el de abajo) */}
            {cartelBloque && <button type="button" tabIndex={-1} aria-hidden className="absolute inset-0 cursor-pointer" onClick={() => abrirCartel(cartelBloque)} />}
          </div>
          {cartelBloque && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => abrirCartel(cartelBloque)}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2.5 rounded-full border border-current/25 px-5 py-2.5 text-[0.95rem] transition-colors duration-300 hover:border-current hover:bg-current/[0.06]"
              >
                <IconoImagen className="h-[1.1rem] w-[1.1rem]" />
                Ver el cartel
              </button>
            </div>
          )}
          {bloque.descripcion && <p className="mt-8 max-w-2xl text-[1.1rem] leading-[1.8] opacity-80">{bloque.descripcion}</p>}

          {esIET && <Escalera niveles={bloque.formaciones} />}

          {!esIET && bloque.formaciones.length > 0 && (
            <ul className="mt-10 divide-y divide-current/15 border-y border-current/15">
              {bloque.formaciones.map((f) => (
                <li key={f.id} className="grid gap-4 py-6 md:grid-cols-12">
                  <h3 className="text-[1.8rem] md:col-span-5">
                    <NombreConCartel id={f.id} nombre={f.nombre} />
                  </h3>
                  <div className="md:col-span-7">
                    <Detalles f={f} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-12 lg:mt-auto lg:pt-12">
            <BotonEnlace a="/contacto#formulario" variante={estilo.boton}>
              Pedir información
            </BotonEnlace>
          </div>
        </div>
      </motion.article>
    </div>
  );
}

export default function Formaciones() {
  const pila = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: pila, offset: ['start start', 'end end'] });
  const [cartel, setCartel] = useState<Cartel | null>(null);
  const [ultimo, setUltimo] = useState<Cartel | null>(null);
  const abrir = (c: Cartel) => {
    setUltimo(c);
    setCartel(c);
  };
  // `ultimo` mantiene la imagen mientras el cartel se desvanece al cerrar.
  const cerrar = useCallback(() => setCartel(null), []);

  return (
    <AbrirCartel.Provider value={abrir}>
    <Pagina titulo="Formaciones">
      <CabeceraPagina
        etiqueta="Formaciones"
        titulo={['Formarse para', { texto: 'elevar la consciencia', cursiva: true, clase: 'pl-[6vw]' }]}
        lateral={
          <nav aria-label="En esta página" className="rounded-[1.5rem] border border-carbon/10 bg-lino p-6">
            <p className="etiqueta mb-4">En esta página</p>
            <ol className="filete divide-y divide-carbon/15 border-y">
              {bloques.map((b) => (
                <li key={b.id}>
                  <Link to={`#${b.id}`} className="group flex items-baseline gap-4 py-3 text-[0.98rem]">
                    <span className="enlace-linea">{b.titulo}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        }
      />

      {/* ── Tarjetas apiladas ─────────────────────────────────────────── */}
      <div ref={pila} className="marco relative pb-24">
        {bloques.map((b, i) => (
          <Tarjeta key={b.id} bloque={b} indice={i} total={bloques.length} progreso={scrollYProgress} />
        ))}
      </div>

      {/* ── Miles de personas formadas ───────────────────────────────── */}
      <section className="marco py-28 sm:py-36" aria-label="Personas formadas">
        <Revelar className="grid gap-12 lg:grid-cols-12 lg:items-end">
          <p className="font-serif text-[clamp(2.6rem,6.4vw,5.6rem)] font-[320] leading-[1] tracking-[-0.025em] lg:col-span-8">
            Miles de personas ya se han formado con MCE.
          </p>
          <div className="space-y-6 text-carbon-suave lg:col-span-4">
            <p className="text-[1.05rem]">Fechas, duración y precios de cada formación: pregunta en tu sede.</p>
            <BotonEnlace a="/sedes" variante="secundario">
              Elegir mi sede
            </BotonEnlace>
          </div>
        </Revelar>
      </section>

      {/* Cartelito con la imagen (un único modal para todos los elementos) */}
      <Modal abierto={cartel !== null} alCerrar={cerrar} titulo={(cartel ?? ultimo)?.titulo ?? ''}>
        {(cartel ?? ultimo) && (
          <img
            src={(cartel ?? ultimo)!.imagen}
            alt={(cartel ?? ultimo)!.alt}
            className="mx-auto mt-6 max-h-[68vh] w-auto max-w-full rounded-xl object-contain"
            decoding="async"
          />
        )}
      </Modal>
    </Pagina>
    </AbrirCartel.Provider>
  );
}


import { useRef } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import { bloques, type Bloque, type Formacion } from '../data/formaciones';
import { cx, useEsGrande } from '../lib/utilidades';

const estilosTarjeta = [
  { fondo: 'bg-lino', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-mar-claro', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-amanecer', texto: 'text-carbon', boton: 'principal' as const },
  { fondo: 'bg-carbon', texto: 'text-marfil', boton: 'principal' as const },
];

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
                {nivel.nombre}
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
  // Apilado solo en pantallas grandes: en móvil las tarjetas son más altas que la pantalla.
  const apilar = useEsGrande() && !reducido;
  const estilo = estilosTarjeta[indice % estilosTarjeta.length]!;
  const objetivo = 1 - (total - indice) * 0.035;
  const escala = useTransform(progreso, [indice / total, 1], [1, objetivo]);
  const esIET = bloque.id === 'inteligencia-emocional-transpersonal';

  return (
    <div
      id={bloque.id}
      className={cx('flex', apilar ? 'sticky h-[100svh] items-center' : 'mb-5')}
      style={apilar ? { top: `calc(5.5rem + ${indice * 1.4}rem)` } : undefined}
    >
      <motion.article
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
          <div id={`t-${bloque.id}`}>
            <Titular como="h2" className="mt-6 max-w-4xl text-[clamp(2.6rem,6.4vw,5.6rem)] font-[330] leading-[0.98] tracking-[-0.025em]" segmentos={[bloque.titulo]} />
          </div>
          {bloque.descripcion && <p className="mt-8 max-w-2xl text-[1.1rem] leading-[1.8] opacity-80">{bloque.descripcion}</p>}

          {esIET && <Escalera niveles={bloque.formaciones} />}

          {!esIET && bloque.formaciones.length > 0 && (
            <ul className="mt-10 divide-y divide-current/15 border-y border-current/15">
              {bloque.formaciones.map((f) => (
                <li key={f.id} className="grid gap-4 py-6 md:grid-cols-12">
                  <h3 className="text-[1.8rem] md:col-span-5">{f.nombre}</h3>
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

  return (
    <Pagina titulo="Formaciones">
      <CabeceraPagina
        etiqueta="Formaciones"
        titulo={['Aprender', { texto: 'desde el corazón', cursiva: true, clase: 'pl-[6vw]' }]}
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
    </Pagina>
  );
}

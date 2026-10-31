import { Link } from 'react-router';
import { motion } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Circulo, FlechaMano } from '../components/anim/Trazo';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { bloques, type Bloque, type Formacion } from '../data/formaciones';
import { cx } from '../lib/utilidades';

/** Detalles de una formación: solo se pintan los campos que tienen datos. */
function Detalles({ f }: { f: Formacion }) {
  if (!f.descripcion && f.detalles.length === 0 && f.contenidos.length === 0) return null;
  return (
    <div className="mt-5 space-y-4 text-[0.98rem] text-carbon-suave">
      {f.descripcion && <p>{f.descripcion}</p>}
      {f.detalles.length > 0 && (
        <dl className="filete divide-y divide-carbon/10 border-y">
          {f.detalles.map((d) => (
            <div key={d.etiqueta} className="flex justify-between gap-4 py-2">
              <dt>{d.etiqueta}</dt>
              <dd className="text-right text-carbon">{d.valor}</dd>
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

/** Niveles de Inteligencia Emocional Transpersonal, en escalera ascendente. */
function Escalera({ niveles }: { niveles: Formacion[] }) {
  return (
    <Escalonado como="ol" className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
      {niveles.map((n, i) => (
        <motion.li
          key={n.id}
          variants={hijoEscalonado}
          className="group relative"
          style={{ ['--peldano' as string]: `${(niveles.length - 1 - i) * 3.5}rem` }}
        >
          <div className="lg:mt-[var(--peldano)]">
            <div className="relative h-px w-full overflow-hidden bg-carbon/15">
              <span className="absolute inset-y-0 left-0 w-0 bg-dorado transition-[width] duration-700 ease-[var(--ease-suave)] group-hover:w-full" />
            </div>
            <div className="pb-8 pr-6 pt-6">
              <span className="font-serif text-sm italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
              <h4 className="mt-2 text-[clamp(1.9rem,3vw,2.5rem)] transition-transform duration-500 ease-[var(--ease-suave)] group-hover:-translate-y-1">
                {n.nombre}
              </h4>
              <Detalles f={n} />
            </div>
          </div>
        </motion.li>
      ))}
    </Escalonado>
  );
}

function tieneContenido(b: Bloque) {
  return Boolean(b.descripcion) || b.formaciones.length > 0;
}

function SeccionBloque({ bloque, indice }: { bloque: Bloque; indice: number }) {
  const esIET = bloque.id === 'inteligencia-emocional-transpersonal';
  const par = indice % 2 === 1;

  return (
    <section id={bloque.id} className={cx(' py-20 sm:py-28', par && 'bg-lino')} aria-labelledby={`t-${bloque.id}`}>
      <div className="marco">
        <div className={cx('grid gap-8 lg:grid-cols-12', par && 'lg:[&>*:first-child]:col-start-6')}>
          <div className="lg:col-span-7">
            <Etiqueta numero={String(indice + 1).padStart(2, '0')}>{esIET ? 'Formación por niveles' : 'Formación'}</Etiqueta>
            <Revelar>
              <h2 id={`t-${bloque.id}`} className="mt-8 text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[1.02]">
                {bloque.titulo}
              </h2>
            </Revelar>
            {bloque.descripcion && (
              <Revelar retraso={0.1}>
                <p className="mt-8 max-w-2xl text-[1.1rem] leading-[1.8] text-carbon-suave">{bloque.descripcion}</p>
              </Revelar>
            )}
          </div>
        </div>

        {esIET && <Escalera niveles={bloque.formaciones} />}

        {!esIET && bloque.formaciones.length > 0 && (
          <Escalonado className="filete mt-12 divide-y divide-carbon/15 border-y">
            {bloque.formaciones.map((f) => (
              <motion.li key={f.id} variants={hijoEscalonado} className="grid gap-4 py-8 md:grid-cols-12">
                <h3 className="text-[1.8rem] md:col-span-5">{f.nombre}</h3>
                <div className="md:col-span-7">
                  <Detalles f={f} />
                </div>
              </motion.li>
            ))}
          </Escalonado>
        )}
      </div>
    </section>
  );
}

export default function Formaciones() {
  return (
    <Pagina titulo="Formaciones">
      <CabeceraPagina
        etiqueta="Formaciones"
        titulo={['Aprender', { texto: 'desde el corazón', cursiva: true }]}
        mancha="fill-salvia-clara"
        lateral={
          <nav aria-label="En esta página" className="lg:pl-8">
            <p className="etiqueta mb-4">En esta página</p>
            <ol className="filete divide-y divide-carbon/15 border-y">
              {bloques.map((b, i) => (
                <li key={b.id}>
                  <Link to={`#${b.id}`} className="group flex items-baseline gap-4 py-3 text-[0.98rem]">
                    <span className="font-serif text-xs italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
                    <span className="enlace-linea">{b.titulo}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        }
      />

      {bloques.map((b, i) => (tieneContenido(b) ? <SeccionBloque key={b.id} bloque={b} indice={i} /> : null))}

      {/* Bloques aún sin detalles: lista editorial compacta (se convierten en
          sección propia en cuanto se rellenan sus datos en formaciones.ts). */}
      {bloques.some((b) => !tieneContenido(b)) && (
        <section className="bg-lino py-20 sm:py-28" aria-label="Más formaciones">
          <div className="marco">
            <Escalonado className="filete divide-y divide-carbon/15 border-y">
              {bloques.map((b, i) =>
                tieneContenido(b) ? null : (
                  <motion.li key={b.id} variants={hijoEscalonado} id={b.id}>
                    <Link
                      to="/contacto#formulario"
                      className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-4 py-9 sm:grid-cols-[3.5rem_1fr_auto] sm:py-12"
                    >
                      <span className="font-serif text-sm italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
                      <h2 className="text-[clamp(2rem,4.6vw,3.6rem)] leading-[1.04] transition-transform duration-500 ease-[var(--ease-suave)] group-hover:translate-x-2">
                        {b.titulo}
                      </h2>
                      <span className="col-start-2 inline-flex items-center gap-3 text-[0.95rem] text-carbon-suave transition-colors group-hover:text-carbon sm:col-start-3 sm:self-center">
                        <span className="enlace-linea">Pedir información</span>
                        <FlechaMano className="transition-transform duration-500 group-hover:translate-x-1.5" />
                      </span>
                    </Link>
                  </motion.li>
                ),
              )}
            </Escalonado>
          </div>
        </section>
      )}

      {/* ── Miles de personas formadas ───────────────────────────────── */}
      <section className="marco py-24 sm:py-32" aria-label="Personas formadas">
        <Revelar className="grid gap-10 lg:grid-cols-12 lg:items-end">
          <p className="font-serif text-[clamp(2.4rem,6vw,5rem)] font-light leading-[1.02] tracking-[-0.02em] lg:col-span-8">
            <span className="relative inline-block italic">
              Miles
              <Circulo />
            </span>{' '}
            de personas ya se han formado con MCE.
          </p>
          <div className="space-y-4 text-carbon-suave lg:col-span-4">
            <p>Fechas, duración y precios de cada formación: pregunta en tu sede.</p>
            <Link to="/sedes" className="group inline-flex items-center gap-3 font-medium text-carbon">
              <span className="enlace-linea">Elegir mi sede</span>
              <FlechaMano className="transition-transform duration-500 group-hover:translate-x-1.5" />
            </Link>
          </div>
        </Revelar>
      </section>
    </Pagina>
  );
}

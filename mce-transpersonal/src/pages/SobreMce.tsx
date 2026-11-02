import { motion } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { formados, historia } from '../data/textos';
import { camino, citasBetty, relato } from '../data/sobreMce';
import { fotosGenerales } from '../data/fotos';
import Proposito from '../components/secciones/Proposito';


export default function SobreMce() {
  const [p1, p4, ...resto] = historia.parrafos;

  return (
    <Pagina titulo="Sobre MCE">
      <CabeceraPagina
        etiqueta="Sobre MCE"
        titulo={['Mente, Cuerpo', { texto: 'y Espíritu.', cursiva: true, clase: 'pl-[8vw]' }]}
        foto={fotosGenerales.sala}
      />

      {/* ── Historia ─────────────────────────────────────────────────── */}
      <section className="marco pb-28 sm:pb-36" aria-labelledby="titulo-historia">
        <div className="filete grid gap-14 border-t pt-16 lg:grid-cols-12 lg:gap-8 lg:pt-24">
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-32">
              <Etiqueta numero="01">La historia</Etiqueta>
              <h2 id="titulo-historia" className="sr-only">
                La historia de MCE
              </h2>
            </div>
          </aside>

          <div className="lg:col-span-8 lg:col-start-5">
            <Revelar>
              <p className="font-serif text-[clamp(1.5rem,2.8vw,2.15rem)] font-light leading-[1.45] first-letter:float-left first-letter:mr-4 first-letter:mt-2 first-letter:font-serif first-letter:text-[4.6em] first-letter:leading-[0.78] first-letter:text-dorado-hondo">
                {p1} <span className="text-carbon-suave">Hoy dirige MCE, la Escuela para el Desarrollo Transpersonal.</span>
              </p>
            </Revelar>

            {/* Relato por etapas (información de la web oficial, ver src/data/sobreMce.ts) */}
            <ol className="mt-14 space-y-0">
              {relato.map((r, i) => (
                <motion.li
                  key={r.titulo}
                  className="filete grid gap-3 border-t py-8 sm:grid-cols-[11rem_1fr] sm:gap-8"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.8, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <h3 className="flex items-baseline gap-3 font-serif text-[1.5rem] leading-tight">
                    <span aria-hidden className="text-[0.95rem] italic text-dorado">{String(i + 1).padStart(2, '0')}</span>
                    {r.titulo}
                  </h3>
                  <p className="text-[1.08rem] leading-[1.85] text-carbon-suave">{r.texto}</p>
                </motion.li>
              ))}
              <motion.li
                className="filete border-y py-8"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="font-serif text-[clamp(1.5rem,2.6vw,2rem)] text-dorado-hondo">{formados}</p>
              </motion.li>
            </ol>
          </div>
        </div>

        <Revelar className="mt-24 sm:mt-32">
          <blockquote>
            <p className="max-w-5xl font-serif text-[clamp(2rem,5.2vw,4.4rem)] font-[300] italic leading-[1.08] tracking-[-0.02em]">{citasBetty.viajeros}</p>
            <footer className="mt-6 text-[1rem] text-carbon-suave">Betty Merino, directora de MCE</footer>
          </blockquote>
        </Revelar>
      </section>

      {/* ── El camino en tres etapas (web oficial) ─────────────────────── */}
      <section className="bg-lino py-24 sm:py-32" aria-labelledby="titulo-camino">
        <div className="marco">
          <Etiqueta>El camino</Etiqueta>
          <h2 id="titulo-camino" className="mt-6 max-w-3xl text-[clamp(2.2rem,4.6vw,3.8rem)] leading-[1.04]">
            Un camino en tres etapas
          </h2>
          <Escalonado className="mt-14 grid gap-6 md:grid-cols-3" como="ol" paso={0.14}>
            {camino.map((e, i) => (
              <motion.li
                key={e.titulo}
                variants={hijoEscalonado}
                className="group relative rounded-[1.5rem] border border-carbon/10 bg-marfil p-7 transition-[transform,box-shadow] duration-500 ease-[var(--ease-suave)] hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-34px_rgba(22,33,62,0.4)] sm:p-8"
              >
                <span aria-hidden className="font-serif text-[3.2rem] leading-none text-dorado/80">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-5 font-serif text-[1.75rem] leading-tight">{e.titulo}</h3>
                <p className="mt-4 leading-[1.8] text-carbon-suave">{e.texto}</p>
              </motion.li>
            ))}
          </Escalonado>
        </div>
      </section>

      <Proposito id="proposito-sobre" />

      <section className="marco py-28 sm:py-36" aria-label="La propuesta de MCE">
        <Escalonado className="grid gap-12 md:grid-cols-3" como="div">
          {[p4, ...resto].map((p, i) => (
            <motion.div key={i} variants={hijoEscalonado} className={['border-t-[3px] pt-6', ['border-dorado', 'border-terracota', 'border-mar'][i % 3]].join(' ')}>
              <p className="text-[1.1rem] leading-[1.85] text-carbon-suave">{p}</p>
            </motion.div>
          ))}
        </Escalonado>
      </section>

      {/* ── Betty ────────────────────────────────────────────────────── */}
      <section className="bg-mar-claro py-28 sm:py-36" aria-labelledby="titulo-ir-betty">
        <Revelar className="marco flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="titulo-ir-betty" className="max-w-3xl text-[clamp(2.4rem,5.4vw,4.6rem)] leading-[1.02]">
            El proyecto MCE nace de la mano de{' '}
            <span className="relative inline-block">
              Betty Merino
              <Subrayado />
            </span>
            .
          </h2>
          <BotonEnlace a="/#betty">Conocer a Betty Merino</BotonEnlace>
        </Revelar>
      </section>
    </Pagina>
  );
}

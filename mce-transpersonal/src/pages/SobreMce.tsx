import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import TextoScroll from '../components/anim/TextoScroll';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { historia } from '../data/textos';
import { fotosGenerales } from '../data/fotos';


/** Cita grande que crece levemente al entrar. */
function Cita({ texto }: { texto: string }) {
  const ref = useRef<HTMLQuoteElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const escala = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const x = useTransform(scrollYProgress, [0, 1], ['6%', '0%']);
  return (
    <motion.blockquote ref={ref} style={reducido ? undefined : { scale: escala, x }} className="origin-left">
      <p className="font-serif text-[clamp(2.6rem,7.4vw,7rem)] font-[300] italic leading-[1.02] tracking-[-0.025em]">
        {texto}
      </p>
    </motion.blockquote>
  );
}

export default function SobreMce() {
  const [p1, p2, p3, p4, ...resto] = historia.parrafos;

  return (
    <Pagina titulo="Sobre MCE">
      <CabeceraPagina
        etiqueta="Sobre MCE"
        titulo={['Es hogar.', { texto: 'Es llegar a casa.', cursiva: true, clase: 'pl-[8vw]' }]}
        entradilla={<p>{historia.titulo}</p>}
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
                {p1}
              </p>
            </Revelar>
            <div className="mt-16">
              <TextoScroll texto={p2} className="font-serif text-[clamp(1.5rem,2.8vw,2.15rem)] font-light leading-[1.45] text-carbon" />
            </div>
          </div>
        </div>

        <div className="mt-24 sm:mt-32">
          <Cita texto={p3} />
        </div>
      </section>

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

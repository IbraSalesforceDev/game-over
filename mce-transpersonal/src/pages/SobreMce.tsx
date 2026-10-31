import { motion } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import Mecedora from '../components/anim/Mecedora';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { historia, valores } from '../data/textos';

const tonosValor = ['text-dorado-hondo', 'text-salvia-honda', 'text-terracota-honda', 'text-carbon', 'text-dorado-hondo'];

export default function SobreMce() {
  const [p1, p2, p3, p4, ...resto] = historia.parrafos;

  return (
    <Pagina titulo="Sobre MCE">
      <CabeceraPagina
        etiqueta="Sobre MCE"
        titulo={['Es hogar.', { texto: 'Es llegar a casa.', cursiva: true }]}
        entradilla={<p>{historia.titulo}</p>}
      />

      {/* ── Historia ─────────────────────────────────────────────────── */}
      <section className="marco pb-24 sm:pb-32" aria-labelledby="titulo-historia">
        <div className="filete grid gap-14 border-t pt-14 lg:grid-cols-12 lg:gap-8 lg:pt-20">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <Etiqueta numero="01">La historia</Etiqueta>
              <h2 id="titulo-historia" className="sr-only">
                La historia de MCE
              </h2>
              <Mecedora className="mt-10 hidden w-56 text-carbon/80 lg:block" />
            </div>
          </aside>

          <div className="lg:col-span-7 lg:col-start-6">
            <Revelar>
              <p className="font-serif text-[clamp(1.45rem,2.6vw,1.95rem)] font-light leading-[1.5] first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:font-serif first-letter:text-[4.4em] first-letter:leading-[0.8] first-letter:text-dorado-hondo">
                {p1}
              </p>
            </Revelar>
            <Revelar className="mt-10">
              <p className="text-[1.12rem] leading-[1.85] text-carbon-suave">{p2}</p>
            </Revelar>

            <Revelar className="my-16 sm:my-20">
              <blockquote className="relative border-l-2 border-dorado pl-6 sm:pl-10">
                <p className="font-serif text-[clamp(2rem,4.6vw,3.4rem)] font-light italic leading-[1.12]">
                  {p3}
                </p>
              </blockquote>
            </Revelar>

            <Revelar>
              <p className="text-[1.12rem] leading-[1.85] text-carbon-suave">{p4}</p>
            </Revelar>
            <div className="mt-6 space-y-6">
              {resto.map((p, i) => (
                <Revelar key={i} retraso={0.05 * i}>
                  <p className="text-[1.12rem] leading-[1.85] text-carbon-suave">{p}</p>
                </Revelar>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Valores ──────────────────────────────────────────────────── */}
      <section className="bg-lino py-24 sm:py-32 lg:py-40" aria-labelledby="titulo-valores">
        <div className="marco">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <Etiqueta numero="02">Lo que nos sostiene</Etiqueta>
            <h2 id="titulo-valores" className="sr-only">
              Valores
            </h2>
          </div>
          <Escalonado className="filete mt-12 divide-y divide-carbon/15 border-y" como="ol">
            {valores.map((v, i) => (
              <motion.li
                key={v}
                variants={hijoEscalonado}
                className={`group flex items-baseline gap-6 py-5 sm:py-7 ${i % 2 === 1 ? 'sm:justify-end sm:text-right' : ''}`}
              >
                <span className="w-8 font-serif text-sm italic text-carbon-suave sm:order-none">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className={`font-serif text-[clamp(2.6rem,8vw,6.4rem)] font-light leading-none tracking-[-0.02em] transition-transform duration-700 ease-[var(--ease-suave)] group-hover:italic ${tonosValor[i]}`}
                >
                  {v}
                </span>
              </motion.li>
            ))}
          </Escalonado>
        </div>
      </section>

      {/* ── Betty ────────────────────────────────────────────────────── */}
      <section className="marco py-24 sm:py-32" aria-labelledby="titulo-ir-betty">
        <Revelar className="flex flex-col items-start gap-8 lg:flex-row lg:items-end lg:justify-between">
          <h2 id="titulo-ir-betty" className="max-w-2xl text-[clamp(2.2rem,5vw,3.8rem)]">
            El proyecto MCE nace de la mano de{' '}
            <span className="relative inline-block italic">
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

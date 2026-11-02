import { useRef } from 'react';
import { motion } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import { Revelar } from '../components/anim/Revelar';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import { disciplinas, equipo } from '../data/equipo';
import { sedes } from '../data/sedes';
import { fotosEquipo } from '../data/fotosEquipo';
import { fotosSede, todasLasFotosDeSede, type FotoReal } from '../data/fotos';
import { cx } from '../lib/utilidades';
import { betty } from '../data/textos';

const unir = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));

/** Tira de fotos de las sedes que se puede arrastrar en horizontal. */
function TiraFotos({ fotos }: { fotos: FotoReal[] }) {
  const marco = useRef<HTMLDivElement>(null);
  return (
    <div ref={marco} className="overflow-hidden">
      <motion.ul drag="x" dragConstraints={marco} dragElastic={0.1} className="flex w-max cursor-grab gap-5 px-4 active:cursor-grabbing sm:gap-6 sm:px-8 lg:px-14">
        {fotos.map((f, i) => {
          const pequena = f.ancho < 500;
          return (
            <motion.li
              key={f.src}
              className={cx('group/foto shrink-0 select-none', i % 2 === 1 && 'sm:mt-14')}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, delay: Math.min(i, 5) * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <figure>
                <div
                  className={cx(
                    'overflow-hidden bg-lino transition-[transform,box-shadow] duration-300 ease-[var(--ease-suave)] group-hover/foto:-translate-y-1 group-hover/foto:shadow-[0_20px_40px_-24px_rgba(22,33,62,0.45)]',
                    pequena ? 'h-[14rem] w-[14rem] rounded-t-[999px] rounded-b-[1rem] sm:h-[16rem] sm:w-[16rem]' : 'h-[16rem] w-[22rem] rounded-[1.25rem] sm:h-[20rem] sm:w-[28rem]',
                  )}
                >
                  <img src={f.src} alt={f.alt} width={f.ancho} height={f.alto} loading="lazy" decoding="async" draggable={false} className="pointer-events-none h-full w-full object-cover" />
                </div>
                <figcaption className="mt-3 flex items-center gap-2 text-[0.95rem] text-carbon-suave">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-dorado" />
                  MCE {f.lugar}
                </figcaption>
              </figure>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export default function Equipo() {
  // Mismo orden que el panel de la web oficial (alfabético por sede).
  const porSede = sedes.filter((s) => s.facilitadores.length > 0).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  return (
    <Pagina titulo="Equipo">
      <CabeceraPagina
        etiqueta="Equipo"
        foto={fotosSede.valencia![0]}
        titulo={['Quiénes', { texto: 'acompañan', cursiva: true, clase: 'pl-[10vw]' }]}
        entradilla={<p>{equipo.presentacion ?? `El equipo de MCE reúne cuatro disciplinas: ${unir(disciplinas)}.`}</p>}
      />

      <section className="overflow-hidden bg-lino py-28 sm:py-36" aria-labelledby="titulo-personas">
        <div className="marco flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Revelar>
            <div id="titulo-personas">
              <Titular como="h2" className="max-w-3xl text-[clamp(2.4rem,5vw,4.4rem)] font-medium leading-[1.02]" segmentos={['Las personas de cada sede']} />
            </div>
          </Revelar>
          <p className="flex items-center gap-3 text-sm text-carbon-suave" aria-hidden>
            <span className="h-px w-10 bg-current" /> Arrastra para ver más
          </p>
        </div>
        <div className="mt-14">
          {/* Las fotos de menos de 200 px se quedan fuera hasta tener el original */}
          <TiraFotos fotos={todasLasFotosDeSede.filter((f) => f.ancho >= 200)} />
        </div>

        <div className="marco mt-20 grid gap-10 md:grid-cols-2">
          <Revelar className="grid grid-cols-[7rem_1fr] items-start gap-6 sm:grid-cols-[9rem_1fr]">
            {betty.foto && (
              <img
                src={betty.foto}
                alt="Retrato de Betty Merino"
                width={1064}
                height={1380}
                loading="lazy"
                decoding="async"
                className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[1rem] object-cover object-top"
              />
            )}
            <div>
              <h3 className="text-[1.9rem] font-medium">Fundadora</h3>
              <p className="mt-3 text-[1.08rem] text-carbon-suave">
                <span className="text-carbon">{betty.nombre}</span>, fundadora y directora de MCE.
              </p>
            </div>
          </Revelar>
        </div>

        {/* Facilitadores por sede, como el panel de la web oficial (mismo orden) */}
        <div className="marco mt-20">
          <Revelar>
            <h3 className="text-[1.9rem] font-medium">Facilitadores</h3>
          </Revelar>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {porSede.map((sede, i) => (
              <motion.section
                key={sede.id}
                aria-labelledby={`equipo-${sede.id}`}
                className="rounded-[1.5rem] border border-carbon/10 bg-marfil p-6 transition-shadow duration-300 hover:shadow-[0_24px_50px_-34px_rgba(22,33,62,0.4)] sm:p-7"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                transition={{ duration: 0.8, delay: (i % 3) * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <h4 id={`equipo-${sede.id}`} className="flex items-center gap-3 font-sans text-[0.95rem] font-semibold uppercase tracking-[0.08em] text-mar">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-dorado" />
                  {sede.nombre}
                </h4>
                <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-6">
                  {sede.facilitadores.map((f) => (
                    <li key={f.nombre} className="group/persona flex w-[7.5rem] flex-col items-center text-center">
                      <span className="block h-24 w-24 overflow-hidden rounded-full bg-mar-claro ring-1 ring-carbon/10 transition-transform duration-500 ease-[var(--ease-suave)] group-hover/persona:-translate-y-1 group-hover/persona:scale-[1.04]">
                        {fotosEquipo[f.nombre] && (
                          <img src={fotosEquipo[f.nombre]} alt={`Foto de ${f.nombre}`} width={320} height={320} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="mt-3 text-[1rem] leading-snug text-carbon">{f.nombre}</span>
                    </li>
                  ))}
                </ul>
              </motion.section>
            ))}
          </div>
        </div>
      </section>
    </Pagina>
  );
}

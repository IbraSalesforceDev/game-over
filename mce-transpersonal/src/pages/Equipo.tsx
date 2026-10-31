import { motion } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import Parallax from '../components/anim/Parallax';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import Retrato from '../components/ui/Retrato';
import { disciplinas, equipo } from '../data/equipo';
import { facilitadoresConSedes } from '../data/sedes';
import { cx } from '../lib/utilidades';

const puntos = ['bg-dorado', 'bg-salvia', 'bg-terracota', 'bg-carbon'];

const listaDisciplinas = `${disciplinas.slice(0, -1).join(', ')} y ${disciplinas[disciplinas.length - 1]}`;

export default function Equipo() {
  const facilitadores = facilitadoresConSedes();

  return (
    <Pagina titulo="Equipo">
      <CabeceraPagina
        etiqueta="Equipo"
        titulo={['Quiénes', { texto: 'acompañan', cursiva: true }]}
        mancha="fill-terracota-clara"
        entradilla={
          <p>{equipo.presentacion ?? `El equipo de MCE reúne cuatro disciplinas: ${listaDisciplinas}.`}</p>
        }
      />

      {/* ── Cuatro disciplinas ───────────────────────────────────────── */}
      <section className="marco pb-24 sm:pb-32" aria-labelledby="titulo-disciplinas">
        <Etiqueta numero="01">Disciplinas</Etiqueta>
        <h2 id="titulo-disciplinas" className="sr-only">
          Las cuatro disciplinas del equipo
        </h2>
        <Escalonado className="filete mt-10 grid border-t sm:grid-cols-2" como="ul">
          {disciplinas.map((d, i) => (
            <motion.li
              key={d}
              variants={hijoEscalonado}
              className={cx(
                'filete group relative border-b py-10 sm:py-14',
                i % 2 === 0 ? 'sm:border-r sm:pr-10' : 'sm:pl-10',
              )}
            >
              <span className="flex items-center gap-3 font-serif text-sm italic text-carbon-suave">
                <span className={cx('h-2 w-2 rounded-full transition-transform duration-500 group-hover:scale-150', puntos[i])} aria-hidden />
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mt-4 block font-serif text-[clamp(2.3rem,5.4vw,4.4rem)] font-light leading-none tracking-[-0.02em] transition-transform duration-700 ease-[var(--ease-suave)] group-hover:translate-x-2 group-hover:italic">
                {d}
              </span>
            </motion.li>
          ))}
        </Escalonado>
      </section>

      {/* ── Retratos ─────────────────────────────────────────────────── */}
      <section className="bg-lino py-24 sm:py-32" aria-labelledby="titulo-personas">
        <div className="marco">
          <Etiqueta numero="02">Personas</Etiqueta>
          <h2 id="titulo-personas" className="mt-8 max-w-3xl text-[clamp(2.2rem,4.6vw,3.6rem)]">
            Fundadora y facilitadores <span className="italic">en las sedes</span>
          </h2>

          <ul className="mt-16 grid grid-cols-2 gap-x-5 gap-y-14 sm:gap-x-8 md:grid-cols-3 lg:grid-cols-4">
            {equipo.miembros.map((m, i) => (
              <li key={m.nombre} className={cx(i % 2 === 1 && 'md:mt-16')}>
                <Revelar retraso={0.06 * i}>
                  <Parallax distancia={14}>
                    <Retrato nombre={m.nombre} foto={m.foto} variante={i} forma="arco" className="aspect-[3/4] w-full" sizes="(min-width: 1024px) 22vw, 45vw" />
                  </Parallax>
                  <p className="mt-5 font-serif text-[1.35rem] leading-tight">{m.nombre}</p>
                  {m.rol && <p className="mt-1 text-sm text-carbon-suave">{m.rol}</p>}
                </Revelar>
              </li>
            ))}
            {facilitadores.map(({ facilitador: f, sedes }, j) => {
              const i = equipo.miembros.length + j;
              return (
                <li key={f.nombre} className={cx(i % 2 === 1 && 'md:mt-16')}>
                  <Revelar retraso={0.06 * (i % 4)}>
                    <Parallax distancia={14}>
                      <Retrato nombre={f.nombre} foto={f.foto} variante={i} forma="rect" className="aspect-[3/4] w-full" sizes="(min-width: 1024px) 22vw, 45vw" />
                    </Parallax>
                    <p className="mt-5 font-serif text-[1.35rem] leading-tight">{f.nombre}</p>
                    <p className="mt-1 text-sm text-carbon-suave">{f.rol ?? `Sede de ${sedes.join(' y ')}`}</p>
                  </Revelar>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </Pagina>
  );
}

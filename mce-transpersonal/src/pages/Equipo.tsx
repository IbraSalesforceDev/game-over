import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import Retrato from '../components/ui/Retrato';
import { disciplinas, equipo } from '../data/equipo';
import { facilitadoresConSedes } from '../data/sedes';
import { cx } from '../lib/utilidades';

const coloresDisciplina = ['#ead7a2', '#dde3d3', '#f0d8c9', '#e2d5be'];
const puntos = ['bg-dorado', 'bg-salvia', 'bg-terracota', 'bg-carbon'];
const listaDisciplinas = `${disciplinas.slice(0, -1).join(', ')} y ${disciplinas[disciplinas.length - 1]}`;

/** Lista de disciplinas: al pasar el ratón, una mancha de color sigue al cursor. */
function Disciplinas() {
  const ref = useRef<HTMLDivElement>(null);
  const reducido = useReducedMotion();
  const [activa, setActiva] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 20 });
  const sy = useSpring(y, { stiffness: 150, damping: 20 });

  return (
    <div
      ref={ref}
      className="relative"
      onPointerMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => setActiva(null)}
    >
      {!reducido && (
        <AnimatePresence>
          {activa !== null && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 z-0 h-72 w-72 rounded-full blur-2xl"
              style={{ x: sx, y: sy, translateX: '-50%', translateY: '-50%' }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 0.9, scale: 1, backgroundColor: coloresDisciplina[activa] }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.5 }}
            />
          )}
        </AnimatePresence>
      )}
      <Escalonado className="filete relative z-10 border-t" como="ul">
        {disciplinas.map((d, i) => (
          <motion.li
            key={d}
            variants={hijoEscalonado}
            onPointerEnter={() => setActiva(i)}
            className="filete group flex items-baseline justify-between gap-6 border-b py-8 sm:py-10"
          >
            <span className="flex items-baseline gap-5 sm:gap-10">
              <span className="w-8 font-serif text-sm italic text-carbon-suave">{String(i + 1).padStart(2, '0')}</span>
              <span
                className={cx(
                  'font-serif text-[clamp(2.6rem,7.6vw,7rem)] font-[320] leading-none tracking-[-0.03em] transition-[transform,color] duration-700 ease-[var(--ease-suave)] group-hover:translate-x-4 group-hover:italic',
                )}
              >
                {d}
              </span>
            </span>
            <span className={cx('h-3 w-3 shrink-0 rounded-full transition-transform duration-500 group-hover:scale-[2.2]', puntos[i])} aria-hidden />
          </motion.li>
        ))}
      </Escalonado>
    </div>
  );
}

type Persona = { nombre: string; rol: string; foto?: string; forma: 'arco' | 'rect' };

/** Tira de retratos que se puede arrastrar en horizontal. */
function Tira({ personas }: { personas: Persona[] }) {
  const marco = useRef<HTMLDivElement>(null);
  return (
    <div ref={marco} className="overflow-hidden" data-cursor="Arrastra">
      <motion.ul
        drag="x"
        dragConstraints={marco}
        dragElastic={0.12}
        className="flex w-max cursor-grab gap-6 px-4 active:cursor-grabbing sm:gap-8 sm:px-8 lg:px-14"
      >
        {personas.map((p, i) => (
          <li key={p.nombre} className={cx('w-[15rem] shrink-0 select-none sm:w-[18rem]', i % 2 === 1 && 'mt-12')}>
            <Retrato nombre={p.nombre} foto={p.foto} variante={i} forma={p.forma} className="pointer-events-none aspect-[3/4] w-full" sizes="(min-width: 640px) 18rem, 15rem" />
            <p className="mt-5 font-serif text-[1.45rem] leading-tight">{p.nombre}</p>
            <p className="mt-1 text-sm text-carbon-suave">{p.rol}</p>
          </li>
        ))}
      </motion.ul>
    </div>
  );
}

export default function Equipo() {
  const personas: Persona[] = [
    ...equipo.miembros.map((m) => ({ nombre: m.nombre, rol: m.rol ?? '', foto: m.foto, forma: 'arco' as const })),
    ...facilitadoresConSedes().map(({ facilitador: f, sedes }) => ({
      nombre: f.nombre,
      rol: f.rol ?? `Sede de ${sedes.join(' y ')}`,
      foto: f.foto,
      forma: 'rect' as const,
    })),
  ];

  return (
    <Pagina titulo="Equipo">
      <CabeceraPagina
        etiqueta="Equipo"
        numero="03"
        titulo={['Quiénes', { texto: 'acompañan', cursiva: true, clase: 'pl-[10vw] text-terracota-honda' }]}
        entradilla={<p>{equipo.presentacion ?? `El equipo de MCE reúne cuatro disciplinas: ${listaDisciplinas}.`}</p>}
      />

      <section className="marco pb-28 sm:pb-36" aria-labelledby="titulo-disciplinas">
        <Etiqueta numero="01">Disciplinas</Etiqueta>
        <h2 id="titulo-disciplinas" className="sr-only">
          Las cuatro disciplinas del equipo
        </h2>
        <div className="mt-10">
          <Disciplinas />
        </div>
      </section>

      <section className="overflow-hidden bg-lino py-28 sm:py-36" aria-labelledby="titulo-personas">
        <div className="marco flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Etiqueta numero="02">Personas</Etiqueta>
            <Revelar>
              <h2 id="titulo-personas" className="mt-8 max-w-3xl text-[clamp(2.4rem,5vw,4.4rem)] leading-[1.02]">
                Fundadora y facilitadores <span className="italic text-salvia-honda">en las sedes</span>
              </h2>
            </Revelar>
          </div>
          <p className="flex items-center gap-3 text-sm text-carbon-suave" aria-hidden>
            <span className="h-px w-10 bg-current" /> Desliza para ver más
          </p>
        </div>
        <div className="mt-16">
          <Tira personas={personas} />
        </div>
      </section>
    </Pagina>
  );
}

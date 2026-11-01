import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { disciplinas, equipo } from '../data/equipo';
import { facilitadoresConSedes } from '../data/sedes';
import { fotosSede, todasLasFotosDeSede, type FotoReal } from '../data/fotos';
import { cx } from '../lib/utilidades';

const coloresDisciplina = ['#efe6cc', '#dce6f2', '#e3e8ef', '#e8ecf3'];
const puntos = ['bg-dorado', 'bg-mar', 'bg-salvia', 'bg-terracota'];
const unir = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));

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
              transition={{ duration: 0.3 }}
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
            className="filete group flex items-center justify-between gap-6 border-b py-7 sm:py-9"
          >
            <span className="font-serif text-[clamp(2.6rem,7.4vw,6.6rem)] font-medium leading-none tracking-[-0.02em] transition-transform duration-300 ease-[var(--ease-suave)] group-hover:translate-x-3 group-hover:italic">
              {d}
            </span>
            <span className={cx('h-3 w-3 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-[2]', puntos[i])} aria-hidden />
          </motion.li>
        ))}
      </Escalonado>
    </div>
  );
}

/** Tira de fotos de las sedes que se puede arrastrar en horizontal. */
function TiraFotos({ fotos }: { fotos: FotoReal[] }) {
  const marco = useRef<HTMLDivElement>(null);
  return (
    <div ref={marco} className="overflow-hidden">
      <motion.ul drag="x" dragConstraints={marco} dragElastic={0.1} className="flex w-max cursor-grab gap-5 px-4 active:cursor-grabbing sm:gap-6 sm:px-8 lg:px-14">
        {fotos.map((f, i) => {
          const pequena = f.ancho < 500;
          return (
            <li key={f.src} className={cx('shrink-0 select-none', i % 2 === 1 && 'sm:mt-14')}>
              <figure>
                <div
                  className={cx(
                    'overflow-hidden bg-lino',
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
            </li>
          );
        })}
      </motion.ul>
    </div>
  );
}

export default function Equipo() {
  const facilitadores = facilitadoresConSedes();

  return (
    <Pagina titulo="Equipo">
      <CabeceraPagina
        etiqueta="Equipo"
        foto={fotosSede.valencia![0]}
        titulo={['Quiénes', { texto: 'acompañan', cursiva: true, clase: 'pl-[10vw]' }]}
        entradilla={<p>{equipo.presentacion ?? `El equipo de MCE reúne cuatro disciplinas: ${unir(disciplinas)}.`}</p>}
      />

      <section className="marco pb-28 sm:pb-36" aria-labelledby="titulo-disciplinas">
        <Etiqueta>Disciplinas</Etiqueta>
        <h2 id="titulo-disciplinas" className="sr-only">
          Las cuatro disciplinas del equipo
        </h2>
        <div className="mt-10">
          <Disciplinas />
        </div>
      </section>

      <section className="overflow-hidden bg-lino py-28 sm:py-36" aria-labelledby="titulo-personas">
        <div className="marco flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <Revelar>
            <h2 id="titulo-personas" className="max-w-3xl text-[clamp(2.4rem,5vw,4.4rem)] font-medium leading-[1.02]">
              Las personas de cada sede
            </h2>
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
          <Revelar>
            <h3 className="text-[1.9rem] font-medium">Fundadora</h3>
            <p className="mt-3 text-[1.08rem] text-carbon-suave">
              {equipo.miembros
                .filter((m) => m.rol)
                .map((m) => `${m.nombre}, ${m.rol!.charAt(0).toLowerCase()}${m.rol!.slice(1)}`)
                .join('. ')}
              .
            </p>
          </Revelar>
          <Revelar retraso={0.1}>
            <h3 className="text-[1.9rem] font-medium">Facilitadores</h3>
            <ul className="mt-3 space-y-1.5 text-[1.08rem] text-carbon-suave">
              {facilitadores.map(({ facilitador: f, sedes }) => (
                <li key={f.nombre}>
                  <span className="text-carbon">{f.nombre}</span>, {unir(sedes)}
                </li>
              ))}
            </ul>
          </Revelar>
        </div>
      </section>
    </Pagina>
  );
}

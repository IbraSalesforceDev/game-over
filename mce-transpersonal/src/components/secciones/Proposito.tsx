import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import TextoScroll from '../anim/TextoScroll';
import Ondas from '../anim/Ondas';
import Estrellas from '../anim/Estrellas';
import { Escalonado, hijoEscalonado, Revelar } from '../anim/Revelar';
import Etiqueta from '../ui/Etiqueta';
import { mision } from '../../data/textos';

/**
 * El propósito de MCE: elevar el nivel de consciencia. Fondo de "espacio"
 * (como la portada) con ondas que se expanden despacio y estrellas que
 * titilan; el lema se ilumina palabra a palabra con el scroll.
 */
export default function Proposito({ id = 'proposito' }: { id?: string }) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const yOndas = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const giro = useTransform(scrollYProgress, [0, 1], [-20, 20]);

  return (
    <section ref={ref} id={id} className="relative overflow-hidden bg-bosque py-28 text-marfil sm:py-36 lg:py-44" aria-labelledby={`${id}-titulo`}>
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_70%_35%,rgba(43,87,151,0.40),transparent_70%)]" />
      <Estrellas cantidad={46} semilla={11} />
      <motion.div aria-hidden style={reducido ? undefined : { y: yOndas }} className="absolute -right-[20vmax] top-[5%] h-[80vmax] w-[80vmax] sm:-right-[10vmax] lg:h-[62vmax] lg:w-[62vmax]">
        <Ondas className="inset-0 h-full w-full" color="border-celeste/35" cantidad={5} duracion={12} />
      </motion.div>
      {/* Órbita: un punto de luz que gira lentamente alrededor de las ondas */}
      <motion.div aria-hidden style={reducido ? undefined : { rotate: giro }} className="pointer-events-none absolute -right-[20vmax] top-[5%] h-[80vmax] w-[80vmax] sm:-right-[10vmax] lg:h-[62vmax] lg:w-[62vmax]">
        <div className="absolute inset-[18%] animate-[girar_60s_linear_infinite] rounded-full border border-marfil/[0.06] motion-reduce:animate-none">
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-oro shadow-[0_0_18px_4px_rgba(184,153,74,0.55)]" />
        </div>
      </motion.div>

      <div className="marco relative">
        <Etiqueta color="bg-oro" className="text-marfil/70">
          Propósito
        </Etiqueta>
        <div className="mt-10 max-w-5xl">
          <TextoScroll como="h2" texto={mision.lema} className="font-serif text-[clamp(2.6rem,6.6vw,6rem)] font-medium leading-[1.02] tracking-[-0.02em]" />
          <span id={`${id}-titulo`} className="sr-only">
            Propósito de MCE
          </span>
        </div>
        <Revelar className="mt-10 max-w-2xl" retraso={0.1}>
          <p className="text-[1.15rem] leading-[1.8] text-marfil/75 sm:text-[1.25rem]">{mision.entradilla}</p>
        </Revelar>

        <Escalonado className="mt-20 grid gap-6 md:grid-cols-3 md:gap-8" como="ol" paso={0.14}>
          {mision.pilares.map((p, i) => (
            <motion.li
              key={p.titulo}
              variants={hijoEscalonado}
              className="group relative overflow-hidden rounded-[1.5rem] border border-marfil/10 bg-marfil/[0.03] p-7 transition-[transform,background-color,border-color] duration-500 ease-[var(--ease-suave)] hover:-translate-y-1.5 hover:border-celeste/30 hover:bg-marfil/[0.06] sm:p-8"
            >
              {/* brillo que recorre el borde superior, cada tarjeta a su ritmo */}
              <span aria-hidden className="absolute inset-x-0 top-0 h-px overflow-hidden">
                <span className="recorrer absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-celeste/70 to-transparent" style={{ animationDelay: `${i * 2.3}s` }} />
              </span>
              <span className="flex items-center gap-4">
                <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-celeste/40 font-serif text-[1.3rem] text-celeste transition-colors duration-500 group-hover:bg-celeste group-hover:text-bosque">
                  {i + 1}
                  <span aria-hidden className="absolute inset-0 rounded-full border border-celeste/30 opacity-0 transition-[transform,opacity] duration-700 group-hover:scale-150 group-hover:opacity-100" />
                </span>
                <h3 className="font-serif text-[1.75rem] font-medium leading-tight">{p.titulo}</h3>
              </span>
              <p className="mt-5 leading-[1.75] text-marfil/70">{p.texto}</p>
            </motion.li>
          ))}
        </Escalonado>
      </div>
    </section>
  );
}

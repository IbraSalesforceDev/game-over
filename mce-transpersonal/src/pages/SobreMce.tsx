import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Pagina from '../components/anim/Pagina';
import TextoScroll from '../components/anim/TextoScroll';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { historia, valores } from '../data/textos';
import { fotosGenerales } from '../data/fotos';

const fondosValor = ['#f2f4f7', '#dce6f2', '#efe6cc', '#e3e8ef', '#0b1226'];
const textosValor = ['#16213e', '#16213e', '#16213e', '#16213e', '#fcfcfa'];

/** Los cinco valores: la sección se fija y cada valor ocupa la pantalla al hacer scroll. */
function Valores({ frase }: { frase: string }) {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [indice, setIndice] = useState(0);
  const tramos = valores.map((_, i) => i / (valores.length - 1));
  const fondo = useTransform(scrollYProgress, tramos, fondosValor);
  const color = useTransform(scrollYProgress, tramos, textosValor);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    setIndice(Math.min(valores.length - 1, Math.max(0, Math.round(v * (valores.length - 1)))));
  });

  if (reducido) {
    return (
      <section className="bg-lino py-24" aria-labelledby="titulo-valores">
        <div className="marco">
          <h2 id="titulo-valores" className="etiqueta">
            Valores
          </h2>
          <p className="mt-6 max-w-2xl text-carbon-suave">{frase}</p>
          <ol className="filete mt-10 divide-y divide-carbon/15 border-y">
            {valores.map((v, i) => (
              <li key={v} className="flex items-baseline gap-6 py-6">
                <span className="font-serif text-sm italic text-carbon-suave">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-serif text-[clamp(2.4rem,7vw,5rem)] font-light">{v}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <motion.section ref={ref} style={{ backgroundColor: fondo, color }} className="relative h-[460vh]" aria-labelledby="titulo-valores">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-between overflow-hidden py-24 sm:py-28">
        <div className="marco flex items-start justify-between gap-6">
          <div>
            <p className="etiqueta !text-current opacity-70">
              Lo que nos sostiene
            </p>
            <h2 id="titulo-valores" className="sr-only">
              Valores: {valores.join(', ')}
            </h2>
          </div>
          <p className="font-serif text-lg tabular-nums opacity-70">
            {String(indice + 1).padStart(2, '0')} <span className="opacity-50">/ {String(valores.length).padStart(2, '0')}</span>
          </p>
        </div>

        <div className="marco relative flex flex-1 items-center justify-center" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={valores[indice]}
              className="text-center font-serif text-[clamp(3.6rem,15vw,14rem)] font-[300] leading-none tracking-[-0.04em]"
              initial={{ y: '45%', opacity: 0, filter: 'blur(14px)', rotate: 3 }}
              animate={{ y: '0%', opacity: 1, filter: 'blur(0px)', rotate: 0 }}
              exit={{ y: '-45%', opacity: 0, filter: 'blur(14px)', rotate: -3 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className={indice % 2 ? 'italic' : undefined}>{valores[indice]}</span>
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="marco">
          <div className="flex gap-2" aria-hidden>
            {valores.map((v, i) => (
              <span key={v} className="h-[3px] flex-1 overflow-hidden rounded-full bg-current/15">
                <motion.span
                  className="block h-full origin-left rounded-full bg-current"
                  animate={{ scaleX: i <= indice ? 1 : 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-xl text-[1rem] opacity-75">{frase}</p>
        </div>
      </div>
    </motion.section>
  );
}

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

      <Valores frase={p4} />

      <section className="marco py-28 sm:py-36" aria-label="La propuesta de MCE">
        <Escalonado className="grid gap-12 md:grid-cols-3" como="div">
          {resto.map((p, i) => (
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

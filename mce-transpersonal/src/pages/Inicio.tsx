import { useRef, type ReactNode } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';

import Pagina, { useRetrasoPagina } from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import Mecedora from '../components/anim/Mecedora';
import Parallax from '../components/anim/Parallax';
import FondoVivo from '../components/anim/FondoVivo';
import Marquesina from '../components/anim/Marquesina';
import TextoScroll from '../components/anim/TextoScroll';
import Contador from '../components/anim/Contador';
import Sello from '../components/anim/Sello';
import Horizontal from '../components/anim/Horizontal';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Circulo, FlechaMano, Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import Etiqueta from '../components/ui/Etiqueta';
import Retrato from '../components/ui/Retrato';
import ElegirComunidad from '../components/sedes/ElegirComunidad';

import { escuela } from '../data/escuela';
import { betty, frases, valores } from '../data/textos';
import { disciplinas } from '../data/equipo';
import { bloques } from '../data/formaciones';
import { comunidades, sedes } from '../data/sedes';
import { legales } from '../data/navegacion';
import { useConsentimiento } from '../lib/consentimiento';
import { cx } from '../lib/utilidades';
import { irA } from '../lib/scroll';

const nivelesIET = bloques.find((b) => b.id === 'inteligencia-emocional-transpersonal')?.formaciones.length ?? 0;

/** Cifras calculadas desde los datos reales (nada inventado). */
const cifras = [
  { valor: sedes.length, texto: 'sedes con las que puedes hablar' },
  { valor: comunidades.length, texto: 'comunidades autónomas' },
  { valor: disciplinas.length, texto: 'disciplinas en el equipo' },
  { valor: nivelesIET, texto: 'niveles de Inteligencia Emocional Transpersonal' },
];

const accesos = [
  { ruta: '/sobre-mce', nombre: 'Sobre MCE', detalle: 'La historia de la escuela, la metáfora de la mecedora y sus valores.', fondo: 'bg-lino', texto: 'text-carbon' },
  { ruta: '/formaciones', nombre: 'Formaciones', detalle: bloques.map((b) => b.titulo).join(' · '), fondo: 'bg-salvia-clara', texto: 'text-carbon' },
  { ruta: '/equipo', nombre: 'Equipo', detalle: disciplinas.join(' · '), fondo: 'bg-terracota-clara', texto: 'text-carbon' },
  {
    ruta: '/sedes',
    nombre: 'Sedes',
    detalle: `${sedes.length} sedes en ${comunidades.map((c) => c.nombre).join(', ').replace(/, ([^,]*)$/, ' y $1')}.`,
    fondo: 'bg-dorado-claro',
    texto: 'text-carbon',
  },
  { ruta: '/contacto', nombre: 'Contacto', detalle: 'Escribe a la escuela o habla con la sede más cercana.', fondo: 'bg-bosque', texto: 'text-marfil' },
];

const ease = [0.22, 1, 0.36, 1] as const;

/** Una línea del lema de la portada: palabras que suben y deriva horizontal con el scroll. */
function LineaLema({
  palabras,
  x,
  className,
  extra,
}: {
  palabras: string[];
  x: MotionValue<string>;
  className?: string;
  extra?: ReactNode;
}) {
  const reducido = useReducedMotion();
  return (
    <motion.span style={reducido ? undefined : { x }} className={cx('block whitespace-nowrap', className)}>
      <span className="relative inline-block">
        {palabras.map((p, i) => (
          <span key={i} className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
            <motion.span
              className="inline-block"
              variants={{
                oculto: { y: '110%', rotate: 5, filter: 'blur(10px)' },
                visible: { y: '0%', rotate: 0, filter: 'blur(0px)', transition: { duration: 1.3, ease } },
              }}
            >
              {p}
              {i < palabras.length - 1 ? ' ' : ''}
            </motion.span>
          </span>
        ))}
        {extra}
      </span>
    </motion.span>
  );
}

function Portada() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { inicial } = useRetrasoPagina();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const x1 = useTransform(scrollYProgress, [0, 1], ['0vw', '-14vw']);
  const x2 = useTransform(scrollYProgress, [0, 1], ['0vw', '10vw']);
  const x3 = useTransform(scrollYProgress, [0, 1], ['0vw', '-6vw']);
  const giro = useTransform(scrollYProgress, [0, 1], [0, -10]);
  const yMecedora = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacidad = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const aparecer = (d: number) => ({
    initial: { opacity: 0, y: 20, filter: 'blur(6px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)', transitionEnd: { filter: 'none' } },
    transition: { duration: 1.1, delay: inicial + d, ease },
  });

  return (
    <section ref={ref} className="relative min-h-[100svh] overflow-hidden" aria-labelledby="lema">
      <FondoVivo />
      <motion.div style={reducido ? undefined : { opacity: opacidad }} className="marco relative flex min-h-[100svh] flex-col justify-center pb-16 pt-32 lg:pt-28">
        <motion.p className="etiqueta flex items-center gap-4" {...aparecer(0.1)}>
          <span className="h-px w-10 bg-current opacity-40" />
          Escuela transpersonal · fundada por {escuela.fundadora}
        </motion.p>

        <motion.h1
          id="lema"
          aria-label={escuela.lema}
          className="mt-8 font-serif text-[clamp(3.6rem,13.5vw,12.5rem)] font-[330] leading-[0.9] tracking-[-0.035em]"
          initial="oculto"
          animate="visible"
          variants={{ oculto: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: inicial + 0.2 } } }}
        >
          <span aria-hidden>
            <LineaLema palabras={['Mente,']} x={x1} />
            <LineaLema palabras={['Cuerpo', 'y']} x={x2} className="pl-[11vw]" />
            <LineaLema
              palabras={['Espíritu.']}
              x={x3}
              className="pl-[3vw] italic text-dorado-hondo"
              extra={<Subrayado retraso={inicial + 1.5} />}
            />
          </span>
        </motion.h1>

        <div className="mt-12 grid items-end gap-10 lg:mt-14 lg:grid-cols-12">
          <motion.div className="lg:col-span-5" {...aparecer(1)}>
            <p className="max-w-md font-serif text-[clamp(1.4rem,2.2vw,1.9rem)] font-light italic leading-snug text-carbon">
              Es hogar. Es llegar a casa.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <BotonEnlace a="/sobre-mce">Conocer la escuela</BotonEnlace>
              <BotonEnlace a="/sedes" variante="secundario">
                Ver sedes
              </BotonEnlace>
            </div>
          </motion.div>
        </div>

        {/* Mecedora: se dibuja, se mece y gira un poco con el scroll */}
        <motion.div
          style={reducido ? undefined : { rotate: giro, y: yMecedora }}
          className="pointer-events-none mx-auto mt-12 w-[78%] max-w-[22rem] lg:absolute lg:bottom-[6%] lg:right-[3.5rem] lg:mt-0 lg:w-[34vw] lg:max-w-[33rem]"
        >
          <div className="relative">
            <div className="respirar absolute inset-[6%] rounded-full bg-dorado-claro/60" aria-hidden />
            <Mecedora className="relative w-full p-[7%] text-carbon" />
          </div>
        </motion.div>

        <motion.div
          className="absolute right-[3.5rem] top-[22%] hidden h-32 w-32 text-carbon-suave xl:block"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: inicial + 1.4, ease }}
        >
          <Sello texto="Mente · Cuerpo · Espíritu · MCE · ">
            <span className="h-2 w-2 rounded-full bg-dorado" />
          </Sello>
        </motion.div>

        <motion.button
          type="button"
          onClick={() => {
            const el = document.getElementById('escuela');
            if (el) irA(el, { desfase: 0 });
          }}
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: inicial + 2, duration: 1 }}
          aria-label="Bajar a la siguiente sección"
        >
          <span className="etiqueta !text-[0.65rem]">Bajar</span>
          <span className="relative block h-14 w-px overflow-hidden bg-carbon/15">
            <motion.span
              className="absolute inset-x-0 top-0 h-1/2 bg-carbon/70"
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          </span>
        </motion.button>
      </motion.div>
    </section>
  );
}

function Miles() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const escala = useTransform(scrollYProgress, [0, 1], [0.82, 1]);
  const opacidad = useTransform(scrollYProgress, [0, 0.7], [0.2, 1]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-bosque py-32 text-marfil sm:py-40 lg:py-56" aria-labelledby="titulo-miles">
      <div className="respirar absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(194,154,62,0.22),rgba(194,154,62,0)_60%)]" aria-hidden />
      <motion.div style={reducido ? undefined : { scale: escala, opacity: opacidad }} className="marco relative text-center">
        <p className="etiqueta !text-marfil/55">Formaciones MCE</p>
        <h2 id="titulo-miles" className="mx-auto mt-10 max-w-6xl text-[clamp(2.9rem,8.6vw,8rem)] font-[320] leading-[0.98] tracking-[-0.03em]">
          <span className="relative inline-block italic text-dorado-claro">
            Miles
            <Circulo color="text-dorado" retraso={0.3} />
          </span>{' '}
          de personas ya se han formado con MCE.
        </h2>
        <div className="mt-14 flex justify-center">
          <BotonEnlace a="/formaciones" variante="claro">
            Ver las formaciones
          </BotonEnlace>
        </div>
      </motion.div>
    </section>
  );
}

export default function Inicio() {
  const { abrirPreferencias } = useConsentimiento();

  return (
    <Pagina>
      <Portada />

      {/* ── Valores en cinta ─────────────────────────────────────────── */}
      <div className="filete border-y py-6 sm:py-8">
        <Marquesina
          className="font-serif text-[clamp(2.6rem,7vw,6rem)] font-light leading-none text-carbon"
          elementos={valores.map((v, i) => (
            <span key={v} className={i % 2 ? 'contorno' : 'italic'}>
              {v}
            </span>
          ))}
          separador={<span className="inline-block h-3 w-3 rounded-full bg-dorado" />}
        />
      </div>

      {/* ── 01 · La escuela y la mecedora ───────────────────────────── */}
      <section id="escuela" className="marco py-28 sm:py-36 lg:py-48" aria-labelledby="titulo-escuela">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-32">
              <Etiqueta numero="01">La escuela</Etiqueta>
              <h2 id="titulo-escuela" className="sr-only">
                La metáfora de la mecedora
              </h2>
              <Mecedora className="mt-10 hidden w-44 text-carbon/70 lg:block" />
            </div>
          </div>
          <div className="lg:col-span-9">
            <TextoScroll
              texto={frases.mecedora}
              className="font-serif text-[clamp(1.9rem,4.2vw,3.7rem)] font-light leading-[1.18] tracking-[-0.01em]"
            />
            <div className="mt-20 grid gap-10 text-[1.05rem] leading-[1.85] text-carbon-suave md:grid-cols-3">
              {[frases.encuentro, frases.propuesta, frases.consciencia].map((p, i) => (
                <Revelar key={i} retraso={i * 0.12}>
                  <span className="mb-4 block font-serif text-sm italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
                  <p>{p}</p>
                </Revelar>
              ))}
            </div>
            <Revelar className="mt-14">
              <BotonEnlace a="/sobre-mce" variante="secundario">
                Leer la historia completa
              </BotonEnlace>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ── Cifras reales ───────────────────────────────────────────── */}
      <section className="marco pb-28 sm:pb-36" aria-label="MCE en cifras">
        <Escalonado className="grid grid-cols-2 gap-x-6 gap-y-14 lg:grid-cols-4" como="ul">
          {cifras.map((c) => (
            <motion.li key={c.texto} variants={hijoEscalonado} className="filete border-t pt-6">
              <Contador valor={c.valor} className="block font-serif text-[clamp(4rem,9vw,7.5rem)] font-[300] leading-none tracking-[-0.04em]" />
              <span className="mt-4 block max-w-[14rem] text-[0.98rem] leading-snug text-carbon-suave">{c.texto}</span>
            </motion.li>
          ))}
        </Escalonado>
      </section>

      {/* ── 02 · Betty Merino ───────────────────────────────────────── */}
      <section id="betty" className="relative bg-lino py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-betty">
        <div className="marco grid gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-[19rem] sm:max-w-[24rem] lg:sticky lg:top-28 lg:mx-0 lg:max-w-none">
              <Parallax distancia={30}>
                <Retrato nombre={betty.nombre} foto={betty.foto} forma="arco" className="aspect-[4/5] w-full" sizes="(min-width: 1024px) 36vw, 80vw" />
              </Parallax>
              <Sello texto="Betty Merino · Fundadora de MCE · " className="absolute -bottom-10 -right-6 h-32 w-32 text-carbon sm:h-36 sm:w-36">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dorado font-serif text-lg italic text-carbon">MCE</span>
              </Sello>
            </div>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-16">
            <Etiqueta numero="02">Fundadora</Etiqueta>
            <Titular
              como="h2"
              lineas
              className="mt-8 text-[clamp(3.4rem,8vw,7rem)] font-[330] leading-[0.92] tracking-[-0.03em]"
              segmentos={['Betty', { texto: 'Merino', cursiva: true, clase: 'pl-[12%] text-terracota-honda' }]}
            />
            <div className="mt-12">
              <TextoScroll texto={frases.origen} className="font-serif text-[clamp(1.4rem,2.4vw,1.95rem)] font-light leading-[1.45]" />
            </div>

            <Revelar className="mt-16 rounded-[1.75rem] bg-marfil p-8 shadow-[0_30px_60px_-40px_rgba(42,38,34,0.4)] sm:p-10">
              <p className="etiqueta">Con Betty</p>
              <h3 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)]">Consulta transpersonal</h3>
              {betty.consulta && <p className="mt-4 max-w-xl leading-[1.8] text-carbon-suave">{betty.consulta}</p>}
              <div className="mt-7">
                <BotonEnlace a="/contacto#formulario">Pedir información</BotonEnlace>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      <Miles />

      {/* ── 03 · Recorre la escuela (scroll horizontal) ─────────────── */}
      <Horizontal
        className="py-24 lg:py-0"
        cabecera={(progreso) => (
          <div className="marco mb-10 flex items-end justify-between gap-6 lg:mb-14">
            <div>
              <Etiqueta numero="03">Recorre la escuela</Etiqueta>
              <h2 className="mt-6 text-[clamp(2.4rem,5vw,4.4rem)] leading-none">
                Cinco puertas, <span className="italic">una casa</span>
              </h2>
            </div>
            <div className="hidden w-48 lg:block" aria-hidden>
              <div className="h-px w-full bg-carbon/15">
                <motion.div className="h-px origin-left bg-carbon" style={{ scaleX: progreso }} />
              </div>
            </div>
          </div>
        )}
      >
        <div className="flex flex-col gap-5 px-4 sm:px-8 lg:flex-row lg:gap-6 lg:pl-14 lg:pr-[20vw]">
          {accesos.map((a, i) => (
            <Link
              key={a.ruta}
              to={a.ruta}
              data-cursor="Entrar"
              className={cx(
                'group relative flex min-h-[19rem] flex-col justify-between overflow-hidden rounded-[2rem] p-8 sm:p-10 lg:h-[62vh] lg:min-h-0 lg:w-[38vw] lg:max-w-[34rem] lg:shrink-0',
                a.fondo,
                a.texto,
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-serif text-lg italic opacity-70">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className={cx(
                    'flex h-14 w-14 items-center justify-center rounded-full border transition-all duration-500 ease-[var(--ease-suave)] group-hover:rotate-[-35deg] group-hover:scale-110',
                    a.texto === 'text-marfil' ? 'border-marfil/30 group-hover:bg-marfil group-hover:text-carbon' : 'border-carbon/20 group-hover:bg-carbon group-hover:text-marfil',
                  )}
                >
                  <FlechaMano />
                </span>
              </span>
              <span>
                <span className="block font-serif text-[clamp(2.6rem,5vw,4.6rem)] font-[340] leading-none tracking-[-0.02em] transition-transform duration-700 ease-[var(--ease-suave)] group-hover:-translate-y-2">
                  {a.nombre}
                </span>
                <span className="mt-5 block max-w-sm text-[0.98rem] leading-relaxed opacity-75">{a.detalle}</span>
              </span>
              <span
                aria-hidden
                className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/25 blur-2xl transition-transform duration-1000 ease-[var(--ease-suave)] group-hover:scale-150"
              />
            </Link>
          ))}
        </div>
      </Horizontal>

      {/* ── Elige tu comunidad ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-salvia-honda py-28 sm:py-36" aria-label="Elige tu comunidad autónoma">
        <div className="marco relative">
          <ElegirComunidad oscuro />
        </div>
      </section>

      {/* ── Información legal ───────────────────────────────────────── */}
      <section className="marco py-16" aria-labelledby="titulo-legal">
        <div className="flex flex-col gap-6 rounded-[1.5rem] border border-carbon/12 px-6 py-7 sm:px-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="titulo-legal" className="font-sans text-[0.75rem] font-medium uppercase tracking-[0.18em] text-carbon-suave">
              Información legal
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {legales.map((l) => (
                <li key={l.ruta}>
                  <Link to={l.ruta} className="enlace-texto">
                    {l.nombre}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <button
            type="button"
            onClick={abrirPreferencias}
            className="self-start rounded-full border border-carbon/20 px-5 py-2.5 text-[0.92rem] transition-colors hover:border-carbon hover:bg-carbon hover:text-marfil md:self-auto"
          >
            Cambiar preferencias de cookies
          </button>
        </div>
      </section>
    </Pagina>
  );
}

import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

import Pagina, { useRetrasoPagina } from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import Ventana from '../components/anim/Ventana';
import Azulejo from '../components/anim/Azulejo';
import Parallax from '../components/anim/Parallax';
import Marquesina from '../components/anim/Marquesina';
import TextoScroll from '../components/anim/TextoScroll';
import Contador from '../components/anim/Contador';
import Horizontal from '../components/anim/Horizontal';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { FlechaMano } from '../components/anim/Trazo';
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

const nivelesIET = bloques.find((b) => b.id === 'inteligencia-emocional-transpersonal')?.formaciones.length ?? 0;
const unir = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));

/** Cifras calculadas desde los datos reales (nada inventado). */
const cifras = [
  { valor: sedes.length, texto: 'sedes con las que puedes hablar', fondo: 'bg-dorado', tinta: 'text-carbon' },
  { valor: comunidades.length, texto: 'comunidades autónomas', fondo: 'bg-terracota', tinta: 'text-marfil' },
  { valor: disciplinas.length, texto: 'disciplinas en el equipo', fondo: 'bg-mar', tinta: 'text-marfil' },
  { valor: nivelesIET, texto: 'niveles de Inteligencia Emocional Transpersonal', fondo: 'bg-salvia', tinta: 'text-marfil' },
];

const accesos = [
  { ruta: '/sobre-mce', nombre: 'Sobre MCE', detalle: 'La historia de la escuela, la metáfora de la mecedora y sus valores.', fondo: 'bg-amanecer', texto: 'text-carbon' },
  { ruta: '/formaciones', nombre: 'Formaciones', detalle: unir(bloques.map((b) => b.titulo)) + '.', fondo: 'bg-mar-claro', texto: 'text-carbon' },
  { ruta: '/equipo', nombre: 'Equipo', detalle: `${unir(disciplinas)}.`, fondo: 'bg-salvia-clara', texto: 'text-carbon' },
  { ruta: '/sedes', nombre: 'Sedes', detalle: `${sedes.length} sedes en ${unir(comunidades.map((c) => c.nombre))}.`, fondo: 'bg-dorado-claro', texto: 'text-carbon' },
  { ruta: '/contacto', nombre: 'Contacto', detalle: 'Escribe a la escuela o habla con la sede más cercana.', fondo: 'bg-bosque', texto: 'text-marfil' },
];

const ease = [0.16, 1, 0.3, 1] as const;

/** Portada: la sección se queda fija mientras el sol se pone en la ventana. */
function Portada() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { inicial } = useRetrasoPagina();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const hora = useTransform(scrollYProgress, [0, 1], [0.08, 1]);
  const fondo = useTransform(scrollYProgress, [0, 0.6, 1], ['#f7d9c4', '#f1bfa6', '#e9b39c']);
  const ySol = useTransform(scrollYProgress, [0, 1], [0, -30]);

  const aparecer = (d: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay: inicial + d, ease },
  });

  return (
    <motion.section
      ref={ref}
      style={reducido ? { backgroundColor: '#f7d9c4' } : { backgroundColor: fondo }}
      className={cx('relative', !reducido && 'h-[170svh]')}
      aria-labelledby="lema"
    >
      <div className={cx('overflow-hidden', !reducido && 'sticky top-0 h-[100svh]')}>
        <div className="marco grid h-full items-center gap-10 pb-12 pt-28 lg:grid-cols-12 lg:gap-8 lg:pb-8 lg:pt-24">
          <div className="lg:col-span-6">
            <Titular
              alCargar
              lineas
              retraso={0.15}
              className="text-[clamp(3.2rem,7.6vw,7.6rem)] leading-[0.94] tracking-[-0.035em]"
              segmentos={['Mente,', { texto: 'Cuerpo y', clase: 'whitespace-nowrap pl-[0.5em]' }, 'Espíritu']}
            />
            <motion.p className="mt-8 max-w-md text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]" {...aparecer(0.8)}>
              Escuela transpersonal fundada por {escuela.fundadora}. Es hogar. Es llegar a casa.
            </motion.p>
            <motion.div className="mt-9 flex flex-wrap items-center gap-3" {...aparecer(1)}>
              <BotonEnlace a="/sobre-mce">Conocer la escuela</BotonEnlace>
              <BotonEnlace a="/sedes" variante="secundario">
                Ver sedes
              </BotonEnlace>
            </motion.div>
          </div>

          <motion.div
            className="lg:col-span-6"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: inicial + 0.3, ease }}
          >
            <motion.div style={reducido ? undefined : { y: ySol }}>
              <Ventana progreso={hora} className="mx-auto w-[78%] max-w-[22rem] sm:max-w-[26rem] lg:w-full lg:max-w-[30rem]" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

/** "Miles de personas…": cielo nocturno en el que las estrellas aparecen con el scroll. */
function Miles() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] });
  const estrellas = useMemo(() => {
    let s = 11;
    const azar = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 160 }, (_, i) => ({ x: azar() * 100, y: azar() * 100, r: 0.6 + azar() * 1.8, umbral: (i / 160) * 0.85 }));
  }, []);

  return (
    <motion.section
      ref={ref}
      style={reducido ? undefined : ({ '--p': scrollYProgress } as unknown as React.CSSProperties)}
      className="relative overflow-hidden bg-bosque py-36 text-marfil sm:py-44 lg:py-56"
      aria-labelledby="titulo-miles"
    >
      <svg aria-hidden className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {estrellas.map((e, i) => (
          <circle
            key={i}
            cx={e.x}
            cy={e.y}
            r={e.r / 10}
            fill={i % 9 === 0 ? '#f8dda8' : '#f8f6f1'}
            style={reducido ? { opacity: 0.8 } : { opacity: `clamp(0, calc((var(--p, 1) - ${e.umbral}) * 10), 0.9)` }}
          />
        ))}
      </svg>
      <div className="marco relative text-center">
        <Revelar>
          <h2 id="titulo-miles" className="mx-auto max-w-5xl text-[clamp(2.8rem,7.6vw,7rem)] leading-[1] tracking-[-0.03em]">
            Miles de personas ya se han formado con MCE.
          </h2>
        </Revelar>
        <Revelar className="mt-12 flex justify-center" retraso={0.15}>
          <BotonEnlace a="/formaciones">Ver las formaciones</BotonEnlace>
        </Revelar>
      </div>
    </motion.section>
  );
}

export default function Inicio() {
  const { abrirPreferencias } = useConsentimiento();

  return (
    <Pagina>
      <Portada />
      <Azulejo />

      {/* ── Valores en cinta ─────────────────────────────────────────── */}
      <div className="bg-dorado py-5 sm:py-7">
        <Marquesina
          className="font-serif text-[clamp(2.4rem,6.4vw,5.4rem)] leading-none text-carbon"
          elementos={valores.map((v) => (
            <span key={v}>{v}</span>
          ))}
          separador={<span className="inline-block h-4 w-4 rounded-full bg-terracota" />}
        />
      </div>

      {/* ── La escuela y la mecedora ─────────────────────────────────── */}
      <section id="escuela" className="marco py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-escuela">
        <Etiqueta>La escuela</Etiqueta>
        <h2 id="titulo-escuela" className="sr-only">
          La metáfora de la mecedora
        </h2>
        <div className="mt-10 max-w-5xl">
          <TextoScroll texto={frases.mecedora} className="font-serif text-[clamp(1.9rem,4vw,3.5rem)] leading-[1.18] tracking-[-0.015em]" />
        </div>
        <Escalonado className="mt-20 grid gap-10 md:grid-cols-3" como="div">
          {[
            { p: frases.encuentro, c: 'border-dorado' },
            { p: frases.propuesta, c: 'border-terracota' },
            { p: frases.consciencia, c: 'border-mar' },
          ].map(({ p, c }) => (
            <motion.p key={p} variants={hijoEscalonado} className={cx('border-t-[3px] pt-6 text-[1.06rem] leading-[1.85] text-carbon-suave', c)}>
              {p}
            </motion.p>
          ))}
        </Escalonado>
        <Revelar className="mt-14">
          <BotonEnlace a="/sobre-mce" variante="secundario">
            Leer la historia completa
          </BotonEnlace>
        </Revelar>
      </section>

      {/* ── Cifras reales, en arcos de colores ───────────────────────── */}
      <section className="marco pb-28 sm:pb-36" aria-label="MCE en cifras">
        <Escalonado className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4" como="ul" paso={0.12}>
          {cifras.map((c) => (
            <motion.li key={c.texto} variants={hijoEscalonado}>
              <div className={cx('flex aspect-[4/5] items-end justify-center rounded-t-[999px] rounded-b-[10px] pb-[12%]', c.fondo, c.tinta)}>
                <Contador valor={c.valor} className="font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none" />
              </div>
              <p className="mt-4 max-w-[15rem] text-[1rem] leading-snug text-carbon-suave">{c.texto}</p>
            </motion.li>
          ))}
        </Escalonado>
      </section>

      {/* ── Betty Merino ─────────────────────────────────────────────── */}
      <section id="betty" className="relative bg-mar-claro py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-betty">
        <div className="marco grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="mx-auto max-w-[19rem] sm:max-w-[24rem] lg:sticky lg:top-28 lg:mx-0 lg:max-w-none">
              <Parallax distancia={26}>
                <Retrato nombre={betty.nombre} foto={betty.foto} forma="arco" variante={0} className="aspect-[4/5] w-full" sizes="(min-width: 1024px) 36vw, 80vw" />
              </Parallax>
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-12">
            <Etiqueta color="bg-mar">Fundadora de MCE</Etiqueta>
            <Titular como="h2" className="mt-6 text-[clamp(3.2rem,7.4vw,6.4rem)] leading-[0.95] tracking-[-0.03em]" segmentos={['Betty Merino']} />
            <div className="mt-10">
              <TextoScroll texto={frases.origen} className="font-serif text-[clamp(1.35rem,2.3vw,1.85rem)] leading-[1.45]" />
            </div>
            <Revelar className="mt-14 rounded-[1.5rem] border border-carbon/10 bg-marfil p-8 sm:p-10">
              <h3 className="text-[clamp(1.7rem,2.8vw,2.2rem)]">Consulta transpersonal</h3>
              {betty.consulta && <p className="mt-4 max-w-xl leading-[1.8] text-carbon-suave">{betty.consulta}</p>}
              <p className="mt-3 max-w-md text-carbon-suave">Escríbenos y te contamos cómo pedirla.</p>
              <div className="mt-7">
                <BotonEnlace a="/contacto#formulario">Pedir información</BotonEnlace>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      <Miles />

      {/* ── Recorre la escuela (scroll horizontal) ───────────────────── */}
      <Horizontal
        className="bg-marfil py-24 lg:py-0"
        cabecera={(progreso) => (
          <div className="marco mb-10 flex items-end justify-between gap-6 lg:mb-12">
            <h2 className="text-[clamp(2.4rem,5vw,4.4rem)] leading-none">Cinco puertas, una casa</h2>
            <div className="hidden w-48 lg:block" aria-hidden>
              <div className="h-[3px] w-full rounded-full bg-carbon/10">
                <motion.div className="h-[3px] origin-left rounded-full bg-dorado" style={{ scaleX: progreso }} />
              </div>
            </div>
          </div>
        )}
      >
        <div className="flex flex-col gap-5 px-4 sm:px-8 lg:flex-row lg:gap-6 lg:pl-14 lg:pr-[20vw]">
          {accesos.map((a) => (
            <Link
              key={a.ruta}
              to={a.ruta}
              className={cx(
                'group relative flex min-h-[18rem] flex-col justify-between overflow-hidden rounded-t-[12rem] rounded-b-[1.5rem] p-8 pt-20 sm:p-10 sm:pt-24 lg:h-[64vh] lg:min-h-0 lg:w-[34vw] lg:max-w-[30rem] lg:shrink-0',
                a.fondo,
                a.texto,
              )}
            >
              <span className="block font-serif text-[clamp(2.4rem,4.6vw,4.2rem)] leading-none tracking-[-0.02em] transition-transform duration-300 ease-[var(--ease-suave)] group-hover:-translate-y-1">
                {a.nombre}
              </span>
              <span className="flex items-end justify-between gap-6">
                <span className="max-w-xs text-[1rem] leading-relaxed opacity-80">{a.detalle}</span>
                <span
                  className={cx(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
                    a.texto === 'text-marfil' ? 'bg-marfil/15 group-hover:bg-dorado group-hover:text-carbon' : 'bg-carbon/8 group-hover:bg-carbon group-hover:text-marfil',
                  )}
                >
                  <FlechaMano />
                  <span className="sr-only">Entrar</span>
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Horizontal>

      {/* ── Elige tu comunidad ───────────────────────────────────────── */}
      <section className="relative bg-mar text-marfil" aria-label="Elige tu comunidad autónoma">
        <Azulejo fondo="#f8f6f1" />
        <div className="marco py-24 sm:py-32">
          <ElegirComunidad oscuro />
        </div>
      </section>

      {/* ── Información legal ────────────────────────────────────────── */}
      <section className="marco py-16" aria-labelledby="titulo-legal">
        <div className="flex flex-col gap-6 rounded-[1.25rem] border border-carbon/10 bg-lino px-6 py-7 sm:px-10 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="titulo-legal" className="font-sans text-[1rem] font-semibold">
              Información legal
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
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
            className="self-start rounded-full border border-carbon/20 px-5 py-2.5 text-[0.95rem] transition-colors duration-200 hover:border-carbon hover:bg-carbon hover:text-marfil md:self-auto"
          >
            Cambiar preferencias de cookies
          </button>
        </div>
      </section>
    </Pagina>
  );
}

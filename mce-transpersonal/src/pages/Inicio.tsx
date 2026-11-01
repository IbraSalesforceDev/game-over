import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

import Pagina, { useRetrasoPagina } from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import LogoDibujo from '../components/anim/LogoDibujo';
import TextoScroll from '../components/anim/TextoScroll';
import Contador from '../components/anim/Contador';
import IndiceConImagen from '../components/anim/IndiceConImagen';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { BotonEnlace } from '../components/ui/Boton';
import FotoEditorial from '../components/ui/FotoEditorial';
import ElegirComunidad from '../components/sedes/ElegirComunidad';

import { escuela } from '../data/escuela';
import { betty, frases } from '../data/textos';
import { disciplinas } from '../data/equipo';
import { bloques } from '../data/formaciones';
import { comunidades, sedes } from '../data/sedes';
import { legales } from '../data/navegacion';
import { fotosGenerales, fotosSede } from '../data/fotos';
import { useConsentimiento } from '../lib/consentimiento';
import { DURACION_INTRO, tomarIntro } from '../lib/transicion';

const nivelesIET = bloques.find((b) => b.id === 'inteligencia-emocional-transpersonal')?.formaciones.length ?? 0;
const unir = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));
const ease = [0.16, 1, 0.3, 1] as const;

/** Cifras calculadas desde los datos reales (nada inventado). */
const cifras = [
  { valor: sedes.length, texto: 'sedes con las que puedes hablar' },
  { valor: comunidades.length, texto: 'comunidades autónomas' },
  { valor: disciplinas.length, texto: 'disciplinas en el equipo' },
  { valor: nivelesIET, texto: 'niveles de Inteligencia Emocional Transpersonal' },
];

const indice = [
  { ruta: '/sobre-mce', nombre: 'Sobre MCE', detalle: 'La historia de la escuela, la metáfora de la mecedora y sus valores.', foto: fotosGenerales.sala },
  { ruta: '/formaciones', nombre: 'Formaciones', detalle: `${unir(bloques.map((b) => b.titulo))}.`, foto: fotosSede.valencia![0]! },
  { ruta: '/equipo', nombre: 'Equipo', detalle: `${unir(disciplinas)}.`, foto: fotosGenerales.camisetas },
  { ruta: '/sedes', nombre: 'Sedes', detalle: `${sedes.length} sedes en ${unir(comunidades.map((c) => c.nombre))}.`, foto: fotosSede.granada![0]! },
  { ruta: '/contacto', nombre: 'Contacto', detalle: 'Escribe a la escuela o habla con la sede más cercana.', foto: fotosSede['madrid-mallorca']![0]! },
];

/** Portada: el logo se dibuja trazo a trazo sobre blanco; después aparece el lema. */
function Portada() {
  const [dibujar] = useState(() => tomarIntro());
  const [listo, setListo] = useState(!dibujar);
  const { inicial } = useRetrasoPagina();
  const reducido = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yLogo = useTransform(scrollYProgress, [0, 1], ['0%', '-18%']);
  const opLogo = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const retraso = dibujar ? 0.1 : inicial + 0.3;
  const aparecer = (d: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: listo ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    transition: { duration: 0.9, delay: retraso + d, ease },
  });

  return (
    <section ref={ref} className="relative flex h-[100svh] min-h-[22rem] flex-col overflow-hidden bg-marfil" aria-labelledby="lema">
      {/* aura azul muy suave y ondas finas (las "vibraciones"), quietas con movimiento reducido */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_42%,rgba(220,231,245,0.9),rgba(251,252,253,0)_70%)]" />
      <svg aria-hidden viewBox="0 0 800 800" className="pointer-events-none absolute left-1/2 top-[42%] h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2">
        {[120, 190, 260, 330, 400].map((r, i) => (
          <circle
            key={r}
            cx="400"
            cy="400"
            r={r}
            fill="none"
            stroke="#1e4e8c"
            strokeOpacity={0.09 - i * 0.012}
            strokeWidth="1"
            className={reducido ? undefined : 'respirar'}
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animationDelay: `${i * 0.8}s` }}
          />
        ))}
      </svg>

      <div className="h-24 shrink-0 [@media(max-height:500px)]:h-14" aria-hidden />
      <motion.div style={reducido ? undefined : { y: yLogo, opacity: opLogo }} className="relative flex min-h-0 flex-1 items-center justify-center px-6">
        <LogoDibujo
          dibujar={dibujar}
          duracion={DURACION_INTRO}
          alTerminar={() => setListo(true)}
          className="absolute inset-0 mx-auto h-full w-full max-w-[min(34rem,86vw)]"
        />
      </motion.div>

      <div className="relative shrink-0 px-4 pb-[5svh] pt-6 text-center [@media(max-height:500px)]:pb-3 [@media(max-height:500px)]:pt-1">
        <motion.h1
          id="lema"
          className="font-serif text-[clamp(2.3rem,5.4vw,4.6rem)] font-light leading-none tracking-[-0.03em] text-carbon [@media(max-height:500px)]:text-[1.9rem]"
          {...aparecer(0)}
        >
          {escuela.lema}
        </motion.h1>
        <motion.p className="mt-3 text-[1.02rem] text-carbon-suave sm:text-[1.08rem] [@media(max-height:500px)]:hidden" {...aparecer(0.2)}>
          Escuela transpersonal fundada por {escuela.fundadora}
        </motion.p>
        <motion.div className="mt-7 flex flex-wrap justify-center gap-3 [@media(max-height:500px)]:mt-3" {...aparecer(0.35)}>
          <BotonEnlace a="/sobre-mce">Conocer la escuela</BotonEnlace>
          <BotonEnlace a="/sedes" variante="secundario">
            Ver sedes
          </BotonEnlace>
        </motion.div>
      </div>
    </section>
  );
}

/** "Miles de personas…": sobre la foto real del equipo. */
function Miles() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const escala = useTransform(scrollYProgress, [0, 1], [1.15, 1.02]);
  const foto = fotosGenerales.camisetas;

  return (
    <section ref={ref} className="relative overflow-hidden bg-bosque text-marfil" aria-labelledby="titulo-miles">
      <motion.img
        src={foto.src}
        alt={foto.alt}
        width={foto.ancho}
        height={foto.alto}
        loading="lazy"
        decoding="async"
        style={reducido ? undefined : { y, scale: escala }}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,40,0.35)_0%,rgba(10,20,40,0.45)_50%,rgba(10,20,40,0.92)_100%)]" />
      <div className="marco relative grid min-h-[90svh] items-end gap-10 pb-16 pt-40 sm:pb-20 lg:grid-cols-12">
        <Revelar className="lg:col-span-8">
          <h2 id="titulo-miles" className="font-serif text-[clamp(2.8rem,7vw,6.6rem)] font-light leading-[0.98] tracking-[-0.035em]">
            Miles de personas ya se han formado con MCE.
          </h2>
        </Revelar>
        <Revelar className="lg:col-span-4 lg:justify-self-end" retraso={0.15}>
          <BotonEnlace a="/formaciones" variante="claro">
            Ver las formaciones
          </BotonEnlace>
        </Revelar>
      </div>
    </section>
  );
}

export default function Inicio() {
  const { abrirPreferencias } = useConsentimiento();

  return (
    <Pagina>
      <Portada />

      {/* ── La escuela: composición editorial asimétrica ──────────────── */}
      <section id="escuela" className="marco py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-escuela">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <h2 id="titulo-escuela" className="font-sans text-[0.9rem] font-medium text-carbon-suave">
                La escuela
              </h2>
              <FotoEditorial foto={fotosGenerales.sala} pie="Un grupo de formación de MCE" className="mt-6 max-w-[22rem]" proporcion="aspect-[4/5]" />
            </div>
          </aside>
          <div className="lg:col-span-8">
            <TextoScroll texto={frases.mecedora} className="font-serif text-[clamp(1.9rem,3.8vw,3.3rem)] font-light leading-[1.16] tracking-[-0.02em]" />
            <Escalonado className="mt-20 grid gap-x-10 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" como="div" paso={0.12}>
              {[frases.encuentro, frases.propuesta, frases.consciencia].map((p) => (
                <motion.p key={p} variants={hijoEscalonado} className="filete border-t pt-5 text-[1.02rem] leading-[1.8] text-carbon-suave">
                  {p}
                </motion.p>
              ))}
            </Escalonado>
            <Revelar className="mt-14">
              <BotonEnlace a="/sobre-mce" variante="secundario">
                Leer la historia completa
              </BotonEnlace>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ── Cifras reales: tipografía y filetes ───────────────────────── */}
      <section className="marco pb-28 sm:pb-36" aria-label="MCE en cifras">
        <Escalonado className="filete grid grid-cols-2 border-y lg:grid-cols-4" como="ul" paso={0.1}>
          {cifras.map((c, i) => (
            <motion.li
              key={c.texto}
              variants={hijoEscalonado}
              className={[
                'filete px-1 py-8 sm:px-6 sm:py-10',
                i % 2 === 1 ? 'border-l' : '',
                i > 1 ? 'border-t lg:border-t-0' : '',
                i === 2 ? 'lg:border-l' : '',
              ].join(' ')}
            >
              <Contador valor={c.valor} className="block font-serif text-[clamp(3.6rem,7vw,6rem)] font-light leading-none tracking-[-0.04em] text-carbon" />
              <span className="mt-4 block max-w-[14rem] text-[0.95rem] leading-snug text-carbon-suave">{c.texto}</span>
            </motion.li>
          ))}
        </Escalonado>
      </section>

      {/* ── Betty Merino ──────────────────────────────────────────────── */}
      <section id="betty" className="bg-lino py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-betty">
        <div className="marco grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            {betty.foto && (
              <FotoEditorial
                foto={{ src: betty.foto, alt: 'Retrato de Betty Merino, fundadora de MCE', ancho: 1064, alto: 1380 }}
                pie="Betty Merino, fundadora de MCE"
                className="mx-auto max-w-[24rem] lg:sticky lg:top-28 lg:mx-0 lg:max-w-none"
                proporcion="aspect-[4/5]"
                posicion="object-top"
              />
            )}
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-6">
            <p className="font-sans text-[0.9rem] font-medium text-carbon-suave">Fundadora</p>
            <Titular
              como="h2"
              className="mt-5 text-[clamp(3.2rem,7vw,6.2rem)] font-light leading-[0.95] tracking-[-0.04em]"
              segmentos={['Betty Merino']}
            />
            <div className="mt-10">
              <TextoScroll texto={frases.origen} className="font-serif text-[clamp(1.35rem,2.2vw,1.8rem)] font-light leading-[1.45]" />
            </div>
            <Revelar className="mt-14 border-l-2 border-oro pl-6">
              <h3 className="font-serif text-[clamp(1.6rem,2.6vw,2.1rem)]">Consulta transpersonal</h3>
              {betty.consulta && <p className="mt-3 max-w-xl leading-[1.8] text-carbon-suave">{betty.consulta}</p>}
              <p className="mt-2 max-w-md text-carbon-suave">Escríbenos y te contamos cómo pedirla.</p>
              <div className="mt-6">
                <BotonEnlace a="/contacto#formulario">Pedir información</BotonEnlace>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      <Miles />

      {/* ── Índice de la escuela ──────────────────────────────────────── */}
      <section className="marco py-28 sm:py-36" aria-labelledby="titulo-indice">
        <div className="mb-12 grid gap-6 lg:grid-cols-12">
          <h2 id="titulo-indice" className="font-serif text-[clamp(2.2rem,4.4vw,3.8rem)] font-light leading-none tracking-[-0.03em] lg:col-span-6">
            Recorre la escuela
          </h2>
          <p className="max-w-md self-end text-carbon-suave lg:col-span-5 lg:col-start-8">
            Cada apartado tiene su propia página, con todo lo que necesitas saber.
          </p>
        </div>
        <IndiceConImagen entradas={indice} />
      </section>

      {/* ── Elige tu comunidad ────────────────────────────────────────── */}
      <section className="relative bg-carbon text-marfil" aria-label="Elige tu comunidad autónoma">
        <div className="marco py-24 sm:py-32">
          <ElegirComunidad oscuro />
        </div>
      </section>

      {/* ── Información legal ─────────────────────────────────────────── */}
      <section className="marco py-14" aria-labelledby="titulo-legal">
        <div className="filete flex flex-col gap-6 border-t pt-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="titulo-legal" className="font-sans text-[0.95rem] font-semibold">
              Información legal
            </h2>
            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-[0.95rem]">
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
            className="self-start rounded-full border border-carbon/20 px-5 py-2.5 text-[0.92rem] transition-colors duration-200 hover:border-carbon hover:bg-carbon hover:text-marfil md:self-auto"
          >
            Cambiar preferencias de cookies
          </button>
        </div>
      </section>
    </Pagina>
  );
}

import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

import Pagina, { useRetrasoPagina } from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import LogoParticulas from '../components/anim/LogoParticulas';
import Parallax from '../components/anim/Parallax';
import TextoScroll from '../components/anim/TextoScroll';
import Contador from '../components/anim/Contador';
import Horizontal from '../components/anim/Horizontal';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { BotonEnlace } from '../components/ui/Boton';
import Etiqueta from '../components/ui/Etiqueta';
import Retrato from '../components/ui/Retrato';
import ElegirComunidad from '../components/sedes/ElegirComunidad';
import Puertas, { type Acceso } from '../components/puertas/Puertas';
import Proposito from '../components/secciones/Proposito';
import Ondas from '../components/anim/Ondas';

import { escuela } from '../data/escuela';
import { betty, formados, frases } from '../data/textos';
import { enlaceMasResenas, resenas } from '../data/resenas';
import { citasBetty } from '../data/sobreMce';
import CarruselResenas from '../components/resenas/CarruselResenas';
import { disciplinas } from '../data/equipo';
import { bloques } from '../data/formaciones';
import { comunidades, sedes } from '../data/sedes';
import { legales } from '../data/navegacion';
import { useConsentimiento } from '../lib/consentimiento';
import { cx } from '../lib/utilidades';
import { DURACION_INTRO, tomarIntro, useVueltaDesdeCache } from '../lib/transicion';
import { fotosGenerales } from '../data/fotos';
import logoMce from '../assets/logo.png';

const nivelesIET = bloques.find((b) => b.id === 'inteligencia-emocional-transpersonal')?.formaciones.length ?? 0;
const unir = (l: readonly string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} y ${l[l.length - 1]}` : l.join(''));

/** Cifras calculadas desde los datos reales (nada inventado). */
const cifras = [
  { valor: sedes.length, texto: 'sedes con las que puedes hablar', fondo: 'bg-dorado', tinta: 'text-marfil' },
  { valor: comunidades.length, texto: 'comunidades autónomas', fondo: 'bg-terracota', tinta: 'text-marfil' },
  { valor: disciplinas.length, texto: 'disciplinas en el equipo', fondo: 'bg-mar', tinta: 'text-marfil' },
  { valor: nivelesIET, texto: 'niveles de Inteligencia Emocional Transpersonal', fondo: 'bg-salvia', tinta: 'text-marfil' },
];

const accesos: Acceso[] = [
  { ruta: '/sobre-mce', nombre: 'Sobre MCE', detalle: 'La historia de la escuela y sus valores.', fondo: 'bg-amanecer', texto: 'text-carbon' },
  { ruta: '/formaciones', nombre: 'Formaciones', detalle: unir(bloques.map((b) => b.titulo)) + '.', fondo: 'bg-mar-claro', texto: 'text-carbon' },
  { ruta: '/equipo', nombre: 'Equipo', detalle: `${unir(disciplinas)}.`, fondo: 'bg-salvia-clara', texto: 'text-carbon' },
  { ruta: '/sedes', nombre: 'Sedes', detalle: `${sedes.length} sedes en ${unir(comunidades.map((c) => c.nombre))}.`, fondo: 'bg-dorado-claro', texto: 'text-carbon' },
  { ruta: '/contacto', nombre: 'Contacto', detalle: 'Escribe a la escuela o habla con la sede más cercana.', fondo: 'bg-bosque', texto: 'text-marfil' },
];

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Portada: el espacio. Las partículas vibran y forman el logo; cuando está
 * formado aparece el lema y ya se puede bajar.
 */
function Portada() {
  // La primera vez que se abre Inicio en la sesión, las vibraciones forman el
  // logo; después el logo de partículas sigue respirando.
  const [formar] = useState(() => tomarIntro());
  const [formado, setFormado] = useState(!formar);
  const zonaLogo = useRef<HTMLDivElement>(null);
  const { inicial } = useRetrasoPagina();
  const retraso = formar ? 0.2 : inicial + 0.4;
  const aparecer = (d: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: formado ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 },
    transition: { duration: 1.1, delay: retraso + d, ease },
  });

  return (
    <section className="relative flex h-[100svh] min-h-[22rem] flex-col overflow-hidden bg-bosque text-marfil" aria-labelledby="lema">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_40%,rgba(43,87,151,0.45),transparent_70%),radial-gradient(ellipse_50%_40%_at_15%_85%,rgba(157,189,230,0.12),transparent_70%),radial-gradient(ellipse_40%_35%_at_88%_12%,rgba(220,231,245,0.10),transparent_70%)]"
      />
      <LogoParticulas
        formar={formar}
        duracion={DURACION_INTRO}
        zona={zonaLogo}
        alFormarse={() => setFormado(true)}
        className="absolute inset-0 h-full w-full"
      />

      {/* Hueco del logo: entre la cabecera y el lema */}
      <div className="h-20 shrink-0 sm:h-24 [@media(max-height:500px)]:h-14" aria-hidden />
      <div ref={zonaLogo} className="pointer-events-none min-h-0 flex-1" aria-hidden />

      <div className="pointer-events-none relative shrink-0 px-4 pb-[6svh] pt-4 text-center [@media(max-height:500px)]:pb-4 [@media(max-height:500px)]:pt-1">
        <motion.h1
          id="lema"
          className="font-serif text-[clamp(2.3rem,5.6vw,4.4rem)] font-medium leading-none tracking-[-0.01em] [@media(max-height:500px)]:text-[1.9rem]"
          {...aparecer(0)}
        >
          {escuela.lema}
        </motion.h1>
        <motion.p className="mt-3 text-[1rem] text-marfil/70 sm:text-[1.08rem] [@media(max-height:500px)]:hidden" {...aparecer(0.25)}>
          Escuela transpersonal fundada por {escuela.fundadora}
        </motion.p>
        <motion.div className="pointer-events-auto mt-6 flex flex-wrap justify-center gap-3 [@media(max-height:500px)]:mt-3" {...aparecer(0.45)}>
          <BotonEnlace a="/sobre-mce">Conocer la escuela</BotonEnlace>
          <BotonEnlace a="/sedes" variante="claro">
            Ver sedes
          </BotonEnlace>
        </motion.div>
      </div>
    </section>
  );
}

/** "Miles de personas…": sobre la foto real del equipo, que se desplaza levemente. */
function Miles() {
  const ref = useRef<HTMLElement>(null);
  const reducido = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const escala = useTransform(scrollYProgress, [0, 1], [1.15, 1.02]);
  const foto = fotosGenerales.camisetas;

  return (
    <section ref={ref} className="relative overflow-hidden bg-bosque text-marfil" aria-labelledby="titulo-miles">
      <div className="acercar absolute inset-0">
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
      </div>
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,18,38,0.55)_0%,rgba(11,18,38,0.35)_45%,rgba(11,18,38,0.85)_100%)]" />
      <div className="marco relative flex min-h-[85svh] flex-col items-center justify-end pb-20 pt-40 text-center sm:pb-28">
        <Revelar>
          <h2 id="titulo-miles" className="mx-auto max-w-5xl font-serif text-[clamp(2.8rem,7.4vw,6.8rem)] font-medium leading-[0.98] tracking-[-0.02em] [text-shadow:0_2px_30px_rgba(11,18,38,0.5)]">
            Todos somos uno
          </h2>
        </Revelar>
        <Revelar className="mt-5" retraso={0.15}>
          <p className="font-serif text-[clamp(1.4rem,2.6vw,2.1rem)] italic text-marfil/85 [text-shadow:0_2px_20px_rgba(11,18,38,0.5)]">Todo en equipo</p>
        </Revelar>
      </div>
    </section>
  );
}

/** Debajo de la foto: "Miles de personas…" y las reseñas (desde src/data/resenas.ts). */
function Resenas() {
  return (
    <section className="bg-lino py-24 sm:py-32" aria-labelledby="titulo-resenas">
      <div className="marco">
        <Revelar>
          <h2 id="titulo-resenas" className="max-w-4xl font-serif text-[clamp(2.2rem,4.8vw,4rem)] font-medium leading-[1.02] tracking-[-0.02em]">
            {formados}
          </h2>
        </Revelar>
        <Revelar className="mt-12 sm:mt-14" retraso={0.1}>
          <CarruselResenas resenas={resenas} />
        </Revelar>
        <Revelar className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between" retraso={0.15}>
          <BotonEnlace a="/formaciones">Ver las formaciones</BotonEnlace>
          <a href={enlaceMasResenas} target="_blank" rel="noopener noreferrer" className="enlace-texto text-[0.98rem] text-carbon-suave">
            Ver más reseñas en Facebook
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        </Revelar>
      </div>
    </section>
  );
}

export default function Inicio() {
  const { abrirPreferencias } = useConsentimiento();
  // Si el navegador devuelve la página desde su caché (atrás/adelante), la
  // portada se monta de nuevo para que el logo se vuelva a formar.
  const vuelta = useVueltaDesdeCache();

  return (
    <Pagina>
      <Portada key={vuelta} />

      {/* ── Propósito: elevar el nivel de consciencia ─────────────────── */}
      <Proposito />

      {/* ── La escuela ───────────────────────────────────────────────── */}
      <section id="escuela" className="marco py-28 sm:py-36 lg:py-44" aria-labelledby="titulo-escuela">
        <Etiqueta>La escuela</Etiqueta>
        <h2 id="titulo-escuela" className="sr-only">
          La escuela
        </h2>
        <Escalonado className="mt-10 grid gap-10 md:grid-cols-3" como="div">
          {[
            { p: frases.encuentro, c: 'border-oro' },
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
          {cifras.map((c, i) => (
            <motion.li key={c.texto} variants={hijoEscalonado}>
              <motion.div
                className={cx('flex aspect-[4/5] origin-bottom items-end justify-center rounded-t-[999px] rounded-b-[10px] pb-[12%]', c.fondo, c.tinta)}
                initial={{ scaleY: 0.2, opacity: 0 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                transition={{ duration: 1.1, delay: 0.1 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <Contador valor={c.valor} className="font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none" />
              </motion.div>
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
              {betty.foto ? (
                <Parallax distancia={26}>
                  <Retrato nombre={betty.nombre} foto={betty.foto} forma="arco" variante={0} className="aspect-[4/5] w-full" sizes="(min-width: 1024px) 36vw, 80vw" />
                </Parallax>
              ) : (
                // Mientras no llegue la foto de Betty: el loto de MCE en un arco discreto.
                <Revelar className="mx-auto flex aspect-[4/5] w-full max-w-[15rem] items-center justify-center rounded-t-[999px] rounded-b-[1.25rem] bg-marfil ring-1 ring-carbon/10 sm:max-w-[18rem] lg:mx-0">
                  <img src={logoMce} alt="" width={557} height={414} className="w-[72%]" decoding="async" />
                </Revelar>
              )}
            </div>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-12">
            <Etiqueta color="bg-mar">Fundadora de MCE</Etiqueta>
            <Titular como="h2" className="mt-6 text-[clamp(3.2rem,7.4vw,6.4rem)] leading-[0.95] tracking-[-0.03em]" segmentos={['Betty Merino']} />
            <Revelar className="mt-4">
              <p className="text-[1.05rem] text-carbon-suave">{betty.cargo}</p>
            </Revelar>
            <div className="mt-10">
              <TextoScroll texto={frases.origen} className="font-serif text-[clamp(1.35rem,2.3vw,1.85rem)] leading-[1.45]" />
            </div>
            <Revelar className="mt-10">
              <blockquote className="border-l-2 border-dorado/50 pl-6">
                <p className="font-serif text-[clamp(1.3rem,2.2vw,1.7rem)] italic leading-[1.45] text-carbon">{citasBetty.presente}</p>
                <footer className="mt-3 text-[0.95rem] text-carbon-suave">Betty Merino</footer>
              </blockquote>
            </Revelar>
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
      <Resenas />

      {/* ── Recorre la escuela (scroll horizontal) ───────────────────── */}
      <Horizontal
        className="bg-marfil py-24 lg:py-0"
        cabecera={(progreso) => (
          <div className="marco mb-10 flex items-end justify-between gap-6 lg:mb-12">
            <Titular como="h2" className="text-[clamp(2.4rem,5vw,4.4rem)] leading-none" segmentos={['Cinco puertas, una casa']} />
            <div className="hidden w-48 lg:block" aria-hidden>
              <div className="h-[3px] w-full rounded-full bg-carbon/10">
                <motion.div className="h-[3px] origin-left rounded-full bg-dorado" style={{ scaleX: progreso }} />
              </div>
            </div>
          </div>
        )}
      >
        <Puertas accesos={accesos} />
      </Horizontal>

      {/* ── Elige tu comunidad ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-mar text-marfil" aria-label="Elige tu comunidad autónoma">
        <div
          aria-hidden
          className="deriva-a pointer-events-none absolute -left-[15%] -top-[30%] h-[70vmax] w-[70vmax] rounded-full bg-[radial-gradient(circle,rgba(157,189,230,0.22),rgba(157,189,230,0)_62%)]"
        />
        <Ondas className="-bottom-[30vmax] -right-[20vmax] h-[60vmax] w-[60vmax]" color="border-celeste/25" cantidad={4} duracion={14} />
        <div className="marco relative py-24 sm:py-32">
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

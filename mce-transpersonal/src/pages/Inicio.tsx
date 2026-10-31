import { Link } from 'react-router';
import { motion } from 'framer-motion';

import Pagina from '../components/anim/Pagina';
import Titular from '../components/anim/Titular';
import Mecedora from '../components/anim/Mecedora';
import Parallax from '../components/anim/Parallax';
import { Escalonado, hijoEscalonado, Revelar } from '../components/anim/Revelar';
import { Circulo, FlechaMano, Mancha, Subrayado } from '../components/anim/Trazo';
import { BotonEnlace } from '../components/ui/Boton';
import Etiqueta from '../components/ui/Etiqueta';
import Retrato from '../components/ui/Retrato';
import ElegirComunidad from '../components/sedes/ElegirComunidad';

import { escuela } from '../data/escuela';
import { betty, frases } from '../data/textos';
import { disciplinas } from '../data/equipo';
import { bloques } from '../data/formaciones';
import { comunidades, sedes } from '../data/sedes';
import { legales } from '../data/navegacion';
import { useConsentimiento } from '../lib/consentimiento';

const accesos = [
  { ruta: '/sobre-mce', nombre: 'Sobre MCE', detalle: 'La historia de la escuela y sus valores.' },
  { ruta: '/formaciones', nombre: 'Formaciones', detalle: bloques.map((b) => b.titulo).join(' · ') },
  { ruta: '/equipo', nombre: 'Equipo', detalle: disciplinas.join(' · ') },
  {
    ruta: '/sedes',
    nombre: 'Sedes',
    detalle: `${sedes.length} sedes en ${comunidades.map((c) => c.nombre).join(', ').replace(/, ([^,]*)$/, ' y $1')}.`,
  },
  { ruta: '/contacto', nombre: 'Contacto', detalle: 'Escribe a la escuela o habla con la sede más cercana.' },
];

export default function Inicio() {
  const { abrirPreferencias } = useConsentimiento();

  return (
    <Pagina>
      {/* ── Portada ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-32 sm:pt-40 lg:min-h-[100svh] lg:pt-0">
        <Mancha className="-left-40 top-10 h-[36rem] w-[36rem] opacity-50" />
        <Mancha className="-right-32 bottom-0 h-[28rem] w-[28rem] opacity-40" color="fill-salvia-clara" />

        <div className="marco relative grid items-center gap-12 pb-20 lg:min-h-[100svh] lg:grid-cols-12 lg:gap-6 lg:pb-0 lg:pt-24">
          <div className="lg:col-span-7">
            <motion.p
              className="etiqueta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Escuela transpersonal
            </motion.p>

            <Titular
              alCargar
              retraso={0.25}
              className="mt-6 text-[clamp(3.3rem,10.5vw,8.6rem)] font-[350] leading-[0.94] tracking-[-0.03em]"
              segmentos={[
                'Mente,',
                'Cuerpo y',
                { texto: 'Espíritu.', cursiva: true, extra: <Subrayado retraso={1.3} /> },
              ]}
            />

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mt-10 max-w-md text-[1.15rem] leading-relaxed text-carbon-suave sm:text-[1.25rem]">
                Escuela transpersonal fundada por {escuela.fundadora}.
                <span className="mt-1 block font-serif text-[1.3em] italic text-carbon">Es hogar. Es llegar a casa.</span>
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-4">
                <BotonEnlace a="/sobre-mce">Conocer la escuela</BotonEnlace>
                <BotonEnlace a="/sedes" variante="secundario">
                  Ver sedes
                </BotonEnlace>
              </div>
            </motion.div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-square w-full max-w-[26rem] lg:max-w-none">
              <div className="absolute inset-[8%] rounded-full bg-dorado-claro/50" aria-hidden />
              <Mecedora className="relative h-full w-full p-[6%] text-carbon" />
            </div>
            <motion.p
              aria-hidden
              className="absolute right-[4%] top-[6%] flex items-center gap-2 font-serif text-[1.05rem] italic text-carbon-suave"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1.2, delay: 2.4 }}
            >
              <FlechaMano className="h-4 w-8 rotate-[160deg] text-terracota" />
              la mecedora
            </motion.p>
          </div>
        </div>

        <motion.div
          aria-hidden
          className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.4, duration: 1 }}
        >
          <span className="etiqueta !text-[0.65rem]">Bajar</span>
          <span className="relative block h-12 w-px overflow-hidden bg-carbon/15">
            <motion.span
              className="absolute inset-x-0 top-0 h-1/2 bg-carbon/60"
              animate={{ y: ['-100%', '200%'] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
            />
          </span>
        </motion.div>
      </section>

      {/* ── 01 · La escuela y la mecedora ───────────────────────────── */}
      <section className="marco py-24 sm:py-32 lg:py-44" aria-labelledby="titulo-escuela">
        <Etiqueta numero="01">La escuela</Etiqueta>
        <div className="mt-12 grid gap-14 lg:grid-cols-12 lg:gap-8">
          <Revelar className="lg:col-span-7">
            <h2 id="titulo-escuela" className="text-[clamp(2.1rem,4.6vw,3.9rem)] font-light leading-[1.1]">
              <span className="text-carbon-suave">La metáfora de la mecedora:</span> ahí donde{' '}
              <span className="relative inline-block italic">
                llegas a casa
                <Subrayado />
              </span>
              , donde puedes descansar, donde por fin dejas de sentirte solo.
            </h2>
          </Revelar>
          <div className="space-y-6 text-[1.08rem] leading-[1.8] text-carbon-suave lg:col-span-4 lg:col-start-9 lg:pt-3">
            <Revelar retraso={0.1}>
              <p>{frases.encuentro}</p>
            </Revelar>
            <Revelar retraso={0.2}>
              <p>{frases.propuesta}</p>
            </Revelar>
            <Revelar retraso={0.25}>
              <p>{frases.consciencia}</p>
            </Revelar>
            <Revelar retraso={0.3}>
              <Link to="/sobre-mce" className="group inline-flex items-center gap-3 pt-2 font-medium text-carbon">
                <span className="enlace-linea">Leer la historia completa</span>
                <FlechaMano className="transition-transform duration-500 group-hover:translate-x-1.5" />
              </Link>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ── 02 · Betty Merino ───────────────────────────────────────── */}
      <section id="betty" className="relative bg-lino py-24 sm:py-32 lg:py-40" aria-labelledby="titulo-betty">
        <div className="marco grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Revelar>
              <Parallax distancia={28} className="mx-auto max-w-[17rem] sm:max-w-[22rem] lg:mx-0 lg:max-w-[26rem]">
                <Retrato
                  nombre={betty.nombre}
                  foto={betty.foto}
                  forma="arco"
                  className="aspect-[4/5] w-full"
                  sizes="(min-width: 1024px) 32vw, 90vw"
                />
              </Parallax>
            </Revelar>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 lg:pt-10">
            <Etiqueta numero="02">Fundadora</Etiqueta>
            <Titular
              como="h2"
              className="mt-8 text-[clamp(2.8rem,6.4vw,5.2rem)] leading-[0.98]"
              segmentos={['Betty', { texto: 'Merino', cursiva: true }]}
            />
            <Revelar className="mt-10">
              <p className="font-serif text-[clamp(1.3rem,2.2vw,1.6rem)] font-light leading-[1.5] text-carbon">{frases.origen}</p>
            </Revelar>

            <Revelar className="filete mt-14 border-t pt-8" retraso={0.1}>
              <h3 className="text-[1.6rem]">Consulta transpersonal</h3>
              {betty.consulta && <p className="mt-4 max-w-xl leading-[1.8] text-carbon-suave">{betty.consulta}</p>}
              <div className="mt-6">
                <BotonEnlace a="/contacto#formulario" variante="secundario">
                  Pedir información
                </BotonEnlace>
              </div>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ── Miles de personas ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-carbon py-28 text-marfil sm:py-36 lg:py-48">
        <div className="marco relative">
          <p className="etiqueta !text-marfil/60">Formaciones MCE</p>
          <h2 className="mt-10 max-w-6xl text-[clamp(2.8rem,8vw,7.4rem)] font-light leading-[1] tracking-[-0.025em]">
            <span className="relative inline-block italic text-dorado-claro">
              Miles
              <Circulo color="text-dorado" retraso={0.5} />
            </span>{' '}
            de personas ya se han formado con MCE.
          </h2>
          <Revelar retraso={0.3} className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <span aria-hidden className="h-px w-16 bg-marfil/40" />
            <Link to="/formaciones" className="group inline-flex items-center gap-3 text-[1.05rem]">
              <span className="enlace-linea">Ver las formaciones</span>
              <FlechaMano className="text-dorado transition-transform duration-500 group-hover:translate-x-1.5" />
            </Link>
          </Revelar>
        </div>
      </section>

      {/* ── 03 · Accesos ────────────────────────────────────────────── */}
      <section className="marco py-24 sm:py-32 lg:py-40" aria-labelledby="titulo-accesos">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Etiqueta numero="03">Recorre la escuela</Etiqueta>
            <h2 id="titulo-accesos" className="sr-only">
              Secciones de la web
            </h2>
          </div>
          <Escalonado className="filete divide-y divide-carbon/15 border-y lg:col-span-8">
            {accesos.map((a, i) => (
              <motion.li key={a.ruta} variants={hijoEscalonado}>
                <Link to={a.ruta} className="group relative grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-7 sm:grid-cols-[3.5rem_1fr_auto] sm:py-9">
                  <span className="font-serif text-sm italic text-dorado-hondo">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className="block font-serif text-[clamp(1.9rem,4.4vw,3.3rem)] leading-none transition-[transform,font-style] duration-500 ease-[var(--ease-suave)] group-hover:translate-x-2 group-hover:italic">
                      {a.nombre}
                    </span>
                    <span className="mt-3 block max-w-lg text-[0.95rem] text-carbon-suave">{a.detalle}</span>
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center self-center rounded-full border border-carbon/15 transition-all duration-500 group-hover:border-dorado group-hover:bg-dorado">
                    <FlechaMano className="transition-transform duration-500 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.li>
            ))}
          </Escalonado>
        </div>
      </section>

      {/* ── Elige tu comunidad ──────────────────────────────────────── */}
      <section className="bg-salvia-honda py-24 sm:py-32" aria-label="Elige tu comunidad autónoma">
        <div className="marco">
          <ElegirComunidad oscuro />
        </div>
      </section>

      {/* ── Información legal ───────────────────────────────────────── */}
      <section className="marco py-16" aria-labelledby="titulo-legal">
        <div className="flex flex-col gap-6 rounded-2xl border border-carbon/12 px-6 py-7 sm:px-10 md:flex-row md:items-center md:justify-between">
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

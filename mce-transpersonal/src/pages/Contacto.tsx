import { Link } from 'react-router';
import Pagina from '../components/anim/Pagina';
import { Revelar } from '../components/anim/Revelar';
import { FlechaMano, Subrayado } from '../components/anim/Trazo';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { IconoEmail, IconoInstagram, IconoTelefono } from '../components/ui/Iconos';
import { ListadoSedes } from '../components/sedes/ListadoSedes';
import { escuela, enlaceTelefono } from '../data/escuela';
import { animoContacto } from '../data/textos';
import { fotosSede } from '../data/fotos';

export default function Contacto() {
  return (
    <Pagina titulo="Contacto">
      <CabeceraPagina
        etiqueta="Contacto"
        foto={fotosSede.madrid![0]}
        titulo={['Habla con', { texto: 'tu sede', cursiva: true, clase: 'pl-[10vw]' }]}
        entradilla={<p>Cada sede tiene su teléfono y sus redes. Si prefieres escribir a la escuela, el correo está más abajo.</p>}
      />

      {/* ── Sedes por comunidad ──────────────────────────────────────── */}
      <section className="marco pb-24 sm:pb-32" aria-labelledby="titulo-sedes-contacto">
        <Etiqueta numero="01">Por comunidades y ciudades</Etiqueta>
        <h2 id="titulo-sedes-contacto" className="sr-only">
          Contacto de cada sede
        </h2>
        <ListadoSedes activa={null} compacta />
      </section>

      {/* ── Escribir a MCE: correo e Instagram ───────────────────────── */}
      {/* (Antes había un formulario; ahora se escribe por correo o Instagram.) */}
      <section id="escribir" className="scroll-mt-24 bg-lino py-24 sm:py-32" aria-labelledby="titulo-escribir">
        <div className="marco grid gap-12 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <Etiqueta numero="02">Escribir a MCE</Etiqueta>
            <h2 id="titulo-escribir" className="sr-only">
              Escribir a MCE
            </h2>
            <Revelar className="mt-8">
              <p className="font-serif text-[clamp(1.8rem,3vw,2.4rem)] font-light leading-[1.15]">
                <span className="relative inline-block">
                  {animoContacto.linea1}
                  <Subrayado retraso={0.8} />
                </span>{' '}
                <span className="mt-3 block text-dorado-hondo">{animoContacto.linea2}</span>
              </p>
            </Revelar>
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <Revelar className="rounded-[1.75rem] bg-marfil p-8 shadow-[0_30px_60px_-40px_rgba(42,38,34,0.4)] sm:p-10" retraso={0.15}>
              <ul className="space-y-4 text-[1.05rem]">
                {escuela.email && (
                  <li>
                    <a href={`mailto:${escuela.email}`} className="inline-flex items-center gap-3 break-all">
                      <IconoEmail className="h-5 w-5 shrink-0 text-dorado-hondo" />
                      <span className="enlace-linea">{escuela.email}</span>
                    </a>
                  </li>
                )}
                <li>
                  <a href={escuela.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3">
                    <IconoInstagram className="h-5 w-5 shrink-0 text-dorado-hondo" />
                    <span className="enlace-linea">@{escuela.instagram.usuario}</span>
                    <span className="sr-only">(Instagram, se abre en una pestaña nueva)</span>
                  </a>
                </li>
                {escuela.telefono && (
                  <li>
                    <a href={enlaceTelefono(escuela.telefono)} className="inline-flex items-center gap-3">
                      <IconoTelefono className="h-5 w-5 shrink-0 text-dorado-hondo" />
                      <span className="enlace-linea">{escuela.telefono}</span>
                    </a>
                  </li>
                )}
              </ul>

              <div className="filete mt-8 border-t pt-8">
                <p className="etiqueta">Elige tu comunidad autónoma</p>
                <Link to="/sedes" className="group mt-4 flex items-center justify-between gap-4 text-[1.1rem] font-medium">
                  <span className="enlace-linea">Habla con la sede más cercana</span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dorado text-marfil transition-transform duration-500 group-hover:translate-x-1">
                    <FlechaMano />
                  </span>
                </Link>
              </div>
            </Revelar>
          </div>
        </div>
      </section>
    </Pagina>
  );
}

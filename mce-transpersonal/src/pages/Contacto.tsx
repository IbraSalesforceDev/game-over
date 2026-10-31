import { Link } from 'react-router';
import Pagina from '../components/anim/Pagina';
import { Revelar } from '../components/anim/Revelar';
import { FlechaMano, Subrayado } from '../components/anim/Trazo';
import Formulario from '../components/contacto/Formulario';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import Etiqueta from '../components/ui/Etiqueta';
import { IconoEmail, IconoTelefono } from '../components/ui/Iconos';
import { ListadoSedes } from '../components/sedes/ListadoSedes';
import { escuela, enlaceTelefono } from '../data/escuela';
import { animoContacto } from '../data/textos';

export default function Contacto() {
  return (
    <Pagina titulo="Contacto">
      <CabeceraPagina
        etiqueta="Contacto"
        titulo={['Habla con', { texto: 'tu sede', cursiva: true }]}
        entradilla={<p>Cada sede tiene su teléfono y sus redes. Si prefieres escribir a la escuela, el formulario está más abajo.</p>}
      />

      {/* ── Sedes por comunidad ──────────────────────────────────────── */}
      <section className="marco pb-24 sm:pb-32" aria-labelledby="titulo-sedes-contacto">
        <Etiqueta numero="01">Por comunidades y ciudades</Etiqueta>
        <h2 id="titulo-sedes-contacto" className="sr-only">
          Contacto de cada sede
        </h2>
        <ListadoSedes activa={null} compacta />
      </section>

      {/* ── Formulario + panel lateral ───────────────────────────────── */}
      <section className="bg-lino py-24 sm:py-32" aria-labelledby="titulo-formulario">
        <div className="marco grid gap-16 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Etiqueta numero="02">Escribir a MCE</Etiqueta>
            <h2 id="titulo-formulario" className="mt-8 text-[clamp(2.2rem,4.6vw,3.6rem)]">
              Cuéntanos <span className="italic">qué necesitas</span>
            </h2>
            <div className="mt-10">
              <Formulario />
            </div>
          </div>

          <aside className="lg:col-span-4 lg:col-start-9">
            <div className="lg:sticky lg:top-32">
              <Revelar className="rounded-2xl bg-marfil p-8 sm:p-10">
                <p className="font-serif text-[clamp(1.8rem,3vw,2.4rem)] font-light leading-[1.15]">
                  <span className="relative inline-block">
                    {animoContacto.linea1}
                    <Subrayado retraso={0.8} />
                  </span>{' '}
                  <span className="mt-3 block italic text-dorado-hondo">{animoContacto.linea2}</span>
                </p>

                <div className="filete mt-10 border-t pt-8">
                  <p className="etiqueta">Elige tu comunidad autónoma</p>
                  <Link to="/sedes" className="group mt-4 flex items-center justify-between gap-4 text-[1.1rem] font-medium">
                    <span className="enlace-linea">Habla con la sede más cercana</span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-dorado transition-transform duration-500 group-hover:translate-x-1">
                      <FlechaMano />
                    </span>
                  </Link>
                </div>

                {(escuela.email || escuela.telefono) && (
                  <ul className="filete mt-8 space-y-3 border-t pt-8 text-[0.98rem]">
                    {escuela.telefono && (
                      <li>
                        <a href={enlaceTelefono(escuela.telefono)} className="inline-flex items-center gap-3">
                          <IconoTelefono className="h-4 w-4 text-dorado-hondo" />
                          <span className="enlace-linea">{escuela.telefono}</span>
                        </a>
                      </li>
                    )}
                    {escuela.email && (
                      <li>
                        <a href={`mailto:${escuela.email}`} className="inline-flex items-center gap-3">
                          <IconoEmail className="h-4 w-4 text-dorado-hondo" />
                          <span className="enlace-linea">{escuela.email}</span>
                        </a>
                      </li>
                    )}
                  </ul>
                )}
              </Revelar>
            </div>
          </aside>
        </div>
      </section>
    </Pagina>
  );
}

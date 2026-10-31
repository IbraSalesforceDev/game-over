import Pagina from '../components/anim/Pagina';
import Mecedora from '../components/anim/Mecedora';
import { BotonEnlace } from '../components/ui/Boton';

export default function NoEncontrada() {
  return (
    <Pagina titulo="Página no encontrada">
      <section className="marco grid min-h-[80svh] items-center gap-10 pb-20 pt-36 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="etiqueta">Error 404</p>
          <h1 className="mt-6 text-[clamp(2.8rem,8vw,6rem)] leading-[1]">
            Esta página <span className="italic">no existe.</span>
          </h1>
          <p className="mt-6 max-w-md text-[1.1rem] text-carbon-suave">Puede que el enlace esté mal escrito o que la página haya cambiado de sitio.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <BotonEnlace a="/">Volver al inicio</BotonEnlace>
            <BotonEnlace a="/sedes" variante="secundario">
              Ver sedes
            </BotonEnlace>
          </div>
        </div>
        <Mecedora className="mx-auto w-full max-w-xs text-carbon/70 lg:col-span-4 lg:col-start-9" />
      </section>
    </Pagina>
  );
}

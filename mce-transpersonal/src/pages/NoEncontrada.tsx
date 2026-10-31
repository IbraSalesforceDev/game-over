import Pagina from '../components/anim/Pagina';
import Ventana from '../components/anim/Ventana';
import { BotonEnlace } from '../components/ui/Boton';

export default function NoEncontrada() {
  return (
    <Pagina titulo="Página no encontrada">
      <section className="marco grid min-h-[80svh] items-center gap-10 pb-20 pt-36 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="etiqueta">Página no encontrada</p>
          <h1 className="mt-6 text-[clamp(2.8rem,8vw,6rem)] leading-[1]">
            Esta página no existe.
          </h1>
          <p className="mt-6 max-w-md text-[1.1rem] text-carbon-suave">Puede que el enlace esté mal escrito o que la página haya cambiado de sitio.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <BotonEnlace a="/">Volver al inicio</BotonEnlace>
            <BotonEnlace a="/sedes" variante="secundario">
              Ver sedes
            </BotonEnlace>
          </div>
        </div>
        <Ventana momento={1} className="mx-auto w-full max-w-xs lg:col-span-4 lg:col-start-9" />
      </section>
    </Pagina>
  );
}

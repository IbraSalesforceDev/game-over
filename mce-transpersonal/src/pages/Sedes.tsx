import { useSearchParams } from 'react-router';
import Pagina from '../components/anim/Pagina';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import ElegirComunidad from '../components/sedes/ElegirComunidad';
import { FiltroComunidades, ListadoSedes } from '../components/sedes/ListadoSedes';
import { esComunidad, type ComunidadId } from '../data/sedes';
import { animoContacto } from '../data/textos';
import { irAlAncla } from '../lib/utilidades';

export default function Sedes() {
  const [params, setParams] = useSearchParams();
  const valor = params.get('comunidad');
  const activa = esComunidad(valor) ? valor : null;

  const cambiar = (c: ComunidadId | null) => {
    setParams(c ? { comunidad: c } : {}, { replace: true, preventScrollReset: true });
  };

  return (
    <Pagina titulo="Sedes">
      <CabeceraPagina
        etiqueta="Sedes"
        titulo={[{ texto: animoContacto.linea1, cursiva: false }]}
        entradilla={<p className="font-serif text-[1.5em] italic text-dorado-hondo">{animoContacto.linea2}</p>}
      />

      <section id="listado" className="marco pb-24 sm:pb-32" aria-label="Listado de sedes">
        <div className="filete sticky top-0 z-10 -mx-4 border-b bg-marfil/92 px-4 py-4 backdrop-blur-md sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:border-b-0 lg:bg-transparent lg:px-0 lg:backdrop-blur-none">
          <FiltroComunidades activa={activa} alCambiar={cambiar} />
        </div>
        <ListadoSedes activa={activa} />
      </section>

      <section className="bg-lino py-24 sm:py-32" aria-label="Elige tu comunidad autónoma">
        <div className="marco">
          <ElegirComunidad
            alElegir={(c) => {
              cambiar(c);
              irAlAncla('#listado');
            }}
          />
        </div>
      </section>
    </Pagina>
  );
}

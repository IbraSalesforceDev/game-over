// AVISO: debe revisarlo un gestor o asesor antes de publicar la web

import Pagina from '../components/anim/Pagina';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import TextoAvisoLegal from '../components/legal/TextoAvisoLegal';

export default function AvisoLegal() {
  return (
    <Pagina titulo="Aviso legal">
      <CabeceraPagina etiqueta="Información legal" titulo={['Aviso legal']} />
      <div className="marco pb-24 sm:pb-32">
        <div className="filete max-w-3xl border-t pt-4">
          <TextoAvisoLegal />
        </div>
      </div>
    </Pagina>
  );
}

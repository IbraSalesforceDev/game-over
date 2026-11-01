// AVISO: el texto de esta política es una plantilla. Debe revisarlo un profesional
// antes de publicar la web (ver comentario en components/legal/TextoCookies.tsx).
import Pagina from '../components/anim/Pagina';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import TextoCookies from '../components/legal/TextoCookies';

export default function Cookies() {
  return (
    <Pagina titulo="Política de cookies">
      <CabeceraPagina etiqueta="Información legal" titulo={['Política de cookies']} />
      <div className="marco pb-24 sm:pb-32">
        <div className="filete max-w-3xl border-t pt-4">
          <TextoCookies />
        </div>
      </div>
    </Pagina>
  );
}

// AVISO: el texto de esta política es una plantilla. Debe revisarlo un profesional
// antes de publicar la web (ver comentario en components/legal/TextoPrivacidad.tsx).
import Pagina from '../components/anim/Pagina';
import CabeceraPagina from '../components/ui/CabeceraPagina';
import TextoPrivacidad from '../components/legal/TextoPrivacidad';

export default function Privacidad() {
  return (
    <Pagina titulo="Política de privacidad">
      <CabeceraPagina etiqueta="Información legal" titulo={['Política de', { texto: 'privacidad', cursiva: true }]} />
      <div className="marco pb-24 sm:pb-32">
        <div className="filete max-w-3xl border-t pt-4">
          <TextoPrivacidad />
        </div>
      </div>
    </Pagina>
  );
}

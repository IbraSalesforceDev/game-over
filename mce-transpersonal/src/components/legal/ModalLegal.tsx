import { useConsentimiento } from '../../lib/consentimiento';
import Modal from '../ui/Modal';
import TextoCookies from './TextoCookies';
import TextoPrivacidad from './TextoPrivacidad';

/** Muestra las políticas en un modal, sin salir de la página. */
export default function ModalLegal() {
  const { documento, cerrarDocumento } = useConsentimiento();
  return (
    <Modal
      abierto={documento !== null}
      alCerrar={cerrarDocumento}
      titulo={documento === 'cookies' ? 'Política de cookies' : 'Política de privacidad'}
    >
      {documento === 'cookies' ? <TextoCookies /> : <TextoPrivacidad />}
    </Modal>
  );
}

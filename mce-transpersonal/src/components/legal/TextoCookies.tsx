/*
 * AVISO: esta política es una PLANTILLA y debe revisarla un profesional antes
 * de publicarla. Refleja el estado real de la web al crearla: sin analítica,
 * sin publicidad, sin mapas ni vídeos externos y con las tipografías alojadas
 * en la propia web. Si se añade cualquier servicio de terceros, hay que
 * actualizar este texto y el banner.
 */
import { escuela } from '../../data/escuela';
import { useConsentimiento } from '../../lib/consentimiento';

export default function TextoCookies() {
  const { abrirPreferencias, aceptado } = useConsentimiento();

  return (
    <div className="prosa-legal">
      <p className="!text-sm">Última actualización: {escuela.legal.actualizacion}</p>

      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies y tecnologías parecidas (como el almacenamiento local del navegador) son pequeños archivos o datos que una web guarda
        en tu dispositivo para recordar información entre visitas.
      </p>

      <h2>2. Qué guarda esta web</h2>
      <p>Esta web no usa cookies de analítica, de publicidad ni de seguimiento. Solo guarda un dato técnico:</p>
      <ul>
        <li>
          <strong>mce-consentimiento</strong> (almacenamiento local del navegador): recuerda que has aceptado la política de privacidad y
          la de cookies, para no volver a mostrarte el aviso. Contiene tu elección y la fecha. No se envía a ningún servidor y no caduca
          hasta que borres los datos del navegador o cambies tu elección.
        </li>
      </ul>

      <h2>3. Servicios de terceros</h2>
      <ul>
        <li>
          <strong>Tipografías:</strong> las fuentes de la web (Young Serif y Figtree) están alojadas en el mismo servidor que la web. No se
          descargan de Google Fonts ni de otro proveedor, así que tu navegador no se conecta a terceros por este motivo.
        </li>
        <li>
          <strong>Mapas y vídeos:</strong> la web no incluye mapas ni vídeos de servicios externos.
        </li>
        <li>
          <strong>Redes sociales:</strong> los enlaces a Instagram y Facebook son enlaces normales. Esas redes solo pueden instalar sus
          propias cookies si haces clic y visitas su web, y entonces se aplican sus políticas.
        </li>
        <li>
          <strong>Formulario de contacto:</strong> al enviar el formulario, tus datos viajan a Formspree para hacerlos llegar a la escuela.
          Ese envío no instala cookies en esta web.
        </li>
      </ul>

      <h2>4. Cómo cambiar tu elección</h2>
      <p>
        Puedes volver a abrir el aviso de cookies cuando quieras con el botón «Preferencias de cookies», que está al final de cada página.
        También puedes borrar el dato guardado desde la configuración de tu navegador (en el apartado de privacidad, «borrar datos de
        sitios»).
      </p>
      <p>
        <button type="button" onClick={abrirPreferencias} className="enlace-texto font-medium text-carbon">
          Abrir preferencias de cookies
        </button>
        {aceptado && (
          <span className="block pt-1 text-sm">
            Elección guardada el {new Date(aceptado.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </span>
        )}
      </p>
    </div>
  );
}

/*
 * AVISO: debe revisarlo un gestor o asesor antes de publicar la web. Refleja
 * el estado real de la web: sin analítica, sin publicidad, sin reproductores
 * ni mapas incrustados y con las tipografías e imágenes alojadas en la propia
 * web. Si se añade cualquier servicio de terceros, hay que actualizar este
 * texto y el aviso de cookies (src/components/legal/BannerCookies.tsx).
 */
import { escuela } from '../../data/escuela';
import { useConsentimiento } from '../../lib/consentimiento';

const nombres = { aceptar: 'Aceptar', rechazar: 'Rechazar', configurar: 'Configurar' } as const;

export default function TextoCookies() {
  const { abrirPreferencias, eleccion } = useConsentimiento();

  return (
    <div className="prosa-legal">
      <p className="!text-sm">Última actualización: {escuela.legal.actualizacion}</p>

      <h2>1. Qué son las cookies</h2>
      <p>
        Las cookies y tecnologías parecidas (como el almacenamiento local del navegador) son pequeños archivos o datos que una web guarda
        en tu dispositivo para recordar información entre visitas.
      </p>

      <h2>2. Qué usa esta web</h2>
      <p>Esta web no usa cookies de analítica, de publicidad ni de seguimiento. Solo usa almacenamiento técnico, necesario:</p>
      <ul>
        <li>
          <strong>mce-consentimiento</strong> (almacenamiento local del navegador): recuerda tu elección en el aviso de cookies (aceptar,
          rechazar o configurar) y la fecha, para no volver a mostrarte el aviso. No se envía a ningún servidor y se conserva hasta que
          borres los datos del navegador o cambies tu elección.
        </li>
      </ul>
      <p>
        Al ser técnico y necesario, este almacenamiento no requiere consentimiento (art. 22.2 de la LSSI). Aun así, puedes elegir en el
        aviso; elijas lo que elijas, la web no instala nada más.
      </p>

      <h2>3. Servicios de terceros</h2>
      <ul>
        <li>
          <strong>Tipografías e imágenes:</strong> están alojadas en la propia web. No se descargan de Google Fonts ni de otros
          proveedores.
        </li>
        <li>
          <strong>Vídeos, mapas y música:</strong> la web no incluye reproductores ni mapas incrustados. El vídeo del congreso y la lista de
          Spotify son enlaces normales que se abren en otra pestaña.
        </li>
        <li>
          <strong>Redes sociales y Spotify:</strong> los enlaces a Instagram, Facebook y Spotify solo permiten a esos servicios instalar sus
          propias cookies si haces clic y visitas su web. Entonces se aplican sus políticas.
        </li>
      </ul>

      <h2>4. Cómo cambiar tu elección</h2>
      <p>
        Puedes volver a abrir el aviso de cookies cuando quieras con «Preferencias de cookies», al final de cada página. También puedes
        borrar el dato guardado desde la configuración de tu navegador (en el apartado de privacidad, «borrar datos de sitios»).
      </p>
      <p>
        <button type="button" onClick={abrirPreferencias} className="enlace-texto font-medium text-carbon">
          Abrir preferencias de cookies
        </button>
        {eleccion && (
          <span className="block pt-1 text-sm">
            Tu elección: «{nombres[eleccion.eleccion]}», guardada el{' '}
            {new Date(eleccion.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </span>
        )}
      </p>
    </div>
  );
}

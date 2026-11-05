/*
 * AVISO: texto redactado con la información disponible. Antes de publicar la
 * web debe revisarlo un gestor o asesor (identidad del titular, bases legales
 * y plazos). La web no tiene formulario ni registro: solo se informa del
 * contacto por correo o redes y de los datos técnicos del alojamiento.
 */
import { Link } from 'react-router';
import { escuela } from '../../data/escuela';

export default function TextoPrivacidad() {
  const { legal } = escuela;
  const responsable = legal.denominacion ?? escuela.nombre;
  const email = legal.emailPrivacidad ?? escuela.email;

  return (
    <div className="prosa-legal">
      <p className="!text-sm">Última actualización: {legal.actualizacion}</p>

      <h2>1. Quién es el responsable</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> {responsable}
          {legal.cif && <> (CIF {legal.cif})</>}, titular de la web de {escuela.nombre}.
        </li>
        {email && (
          <li>
            <strong>Correo:</strong> <a className="enlace-texto" href={`mailto:${email}`}>{email}</a>
          </li>
        )}
        <li>
          El resto de datos del titular están en el <Link className="enlace-texto" to="/aviso-legal">aviso legal</Link>.
        </li>
      </ul>

      <h2>2. Qué datos tratamos</h2>
      <p>Esta web no tiene formularios, registro de usuarios ni base de datos. Solo se tratan estos datos:</p>
      <ul>
        <li>
          <strong>Si nos escribes</strong> por correo electrónico o por redes sociales (Instagram o Facebook), los datos que tú nos envíes,
          como tu nombre, tu correo y tu mensaje.
        </li>
        <li>
          <strong>Datos técnicos de la conexión</strong>, como la dirección IP, que registra el servicio donde está alojada la web, por
          seguridad y para que funcione.
        </li>
        <li>
          <strong>Tu elección sobre las cookies</strong>, guardada solo en tu navegador (ver la{' '}
          <Link className="enlace-texto" to="/cookies">política de cookies</Link>).
        </li>
      </ul>
      <p>Te pedimos que no nos envíes datos especialmente protegidos, como los de salud.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Responder a tus mensajes e informarte sobre las formaciones, charlas y eventos por los que preguntes.</li>
        <li>Si preguntas por una sede concreta, hacer llegar tu mensaje a las personas que facilitan en esa sede, que forman parte de MCE.</li>
        <li>Mantener la web segura y en funcionamiento.</li>
      </ul>
      <p>No enviamos publicidad si no la pides, no tomamos decisiones automatizadas y no elaboramos perfiles.</p>

      <h2>4. Base legal</h2>
      <ul>
        <li>
          <strong>Tu consentimiento</strong>, al escribirnos por iniciativa propia (art. 6.1.a del RGPD).
        </li>
        <li>
          <strong>La aplicación de medidas precontractuales</strong>, cuando nos pides información para inscribirte en una formación (art. 6.1.b
          del RGPD).
        </li>
        <li>
          <strong>El interés legítimo</strong> en mantener la web segura, para los datos técnicos de la conexión (art. 6.1.f del RGPD).
        </li>
      </ul>

      <h2>5. Cuánto tiempo los conservamos</h2>
      <p>
        Conservamos tus mensajes el tiempo necesario para atenderte. Después los borramos, salvo que inicies una formación con nosotros o
        una ley obligue a guardarlos más tiempo.
      </p>

      <h2>6. Con quién los compartimos</h2>
      <p>No vendemos ni cedemos tus datos. Solo intervienen estos proveedores, que tratan los datos por cuenta de MCE:</p>
      <ul>
        <li>
          <strong>Correo electrónico:</strong> el correo de la escuela es un servicio de Google (Gmail).
        </li>
        <li>
          <strong>Alojamiento de la web:</strong> el proveedor donde se publica la web, que registra los datos técnicos de la conexión.
        </li>
      </ul>
      <p>
        Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo. En ese caso, las transferencias se amparan en
        las garantías que prevé el RGPD, como el Marco de Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo. Si nos
        escribes por Instagram o Facebook, se aplica además la política de privacidad de esas redes.
      </p>

      <h2>7. Tus derechos</h2>
      <p>Puedes ejercer en cualquier momento tus derechos de:</p>
      <ul>
        <li>Acceso a tus datos.</li>
        <li>Rectificación de los datos inexactos.</li>
        <li>Supresión cuando ya no sean necesarios.</li>
        <li>Oposición y limitación del tratamiento.</li>
        <li>Portabilidad de los datos que nos hayas facilitado.</li>
      </ul>
      {email && (
        <p>
          Para ejercerlos, escríbenos a <a className="enlace-texto" href={`mailto:${email}`}>{email}</a> indicando qué derecho quieres ejercer.
          Puedes retirar tu consentimiento cuando quieras, sin que afecte a lo tratado antes.
        </p>
      )}

      <h2>8. Reclamaciones</h2>
      <p>
        Si consideras que no hemos tratado bien tus datos, puedes presentar una reclamación ante la Agencia Española de Protección de
        Datos (AEPD), en{' '}
        <a className="enlace-texto" href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">
          www.aepd.es
        </a>
        .
      </p>

      <h2>9. Cambios en esta política</h2>
      <p>Si cambiamos esta política, publicaremos aquí la nueva versión con su fecha de actualización.</p>
    </div>
  );
}

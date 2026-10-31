/*
 * AVISO: esta política es una PLANTILLA redactada a partir de la información
 * disponible al crear la web. Antes de publicarla debe revisarla un
 * profesional (abogado o consultor en protección de datos), sobre todo:
 * la identidad del responsable, las bases legales y los plazos de conservación.
 */
import { Link } from 'react-router';
import { escuela } from '../../data/escuela';

export default function TextoPrivacidad() {
  const { legal } = escuela;
  const responsable = legal.denominacion ?? escuela.nombre;
  const emailDerechos = legal.emailPrivacidad ?? escuela.email;

  const viaContacto = emailDerechos ? (
    <>
      escribiendo a <a className="enlace-texto" href={`mailto:${emailDerechos}`}>{emailDerechos}</a>
    </>
  ) : (
    <>
      a través del <Link className="enlace-texto" to="/contacto">formulario de contacto</Link> de esta web
    </>
  );

  return (
    <div className="prosa-legal">
      <p className="!text-sm">Última actualización: {legal.actualizacion}</p>

      <h2>1. Quién es el responsable</h2>
      <ul>
        <li>
          <strong>Responsable:</strong> {responsable}
          {legal.nif && <> (NIF {legal.nif})</>}.
        </li>
        {emailDerechos && (
          <li>
            <strong>Email:</strong> <a className="enlace-texto" href={`mailto:${emailDerechos}`}>{emailDerechos}</a>
          </li>
        )}
        {escuela.telefono && (
          <li>
            <strong>Teléfono:</strong> {escuela.telefono}
          </li>
        )}
      </ul>

      <h2>2. Qué datos recogemos</h2>
      <p>Esta web no tiene registro de usuarios ni base de datos. Solo tratamos los datos que tú nos envías:</p>
      <ul>
        <li>
          <strong>Formulario de contacto:</strong> nombre, correo electrónico, teléfono (opcional), motivo de la consulta y el mensaje que escribas.
        </li>
        <li>
          <strong>Contacto directo con las sedes:</strong> si llamas por teléfono o escribes a una sede por redes sociales, esos datos se tratan fuera de esta web, a través del servicio que elijas.
        </li>
      </ul>
      <p>No recogemos datos especialmente protegidos. Te pedimos que no los incluyas en el mensaje.</p>

      <h2>3. Para qué los usamos</h2>
      <ul>
        <li>Responder a tu consulta e informarte sobre las formaciones, cursos, charlas o consultas por las que preguntes.</li>
        <li>Si tu consulta es sobre una sede concreta, hacérsela llegar a las personas que facilitan en esa sede.</li>
      </ul>
      <p>No enviamos publicidad si no la pides y no tomamos decisiones automatizadas ni elaboramos perfiles.</p>

      <h2>4. Base legal</h2>
      <ul>
        <li>
          <strong>Tu consentimiento</strong>, que das al marcar la casilla de aceptación antes de enviar el formulario (art. 6.1.a del RGPD).
        </li>
        <li>
          <strong>La aplicación de medidas precontractuales</strong> cuando nos pides información para inscribirte en una formación (art. 6.1.b del RGPD).
        </li>
      </ul>
      <p>Puedes retirar tu consentimiento en cualquier momento, sin que afecte a lo tratado antes.</p>

      <h2>5. Cuánto tiempo los conservamos</h2>
      <p>
        Conservamos los mensajes el tiempo necesario para atender tu consulta. Después los borramos, salvo que inicies una formación
        con nosotros o una ley obligue a guardarlos durante más tiempo.
        {/* TODO: si la escuela fija un plazo concreto de conservación, indicarlo aquí. */}
      </p>

      <h2>6. Con quién los compartimos</h2>
      <p>No vendemos ni cedemos tus datos. Para que la web funcione intervienen estos proveedores, que actúan como encargados del tratamiento:</p>
      <ul>
        <li>
          <strong>Envío del formulario:</strong> Formspree (Formspree, Inc., EE. UU.), que recibe el mensaje y lo reenvía al correo de la escuela.
          Las transferencias a EE. UU. se amparan en las garantías previstas en el RGPD (Marco de Privacidad de Datos UE-EE. UU. o
          cláusulas contractuales tipo).
        </li>
        <li>
          <strong>Alojamiento de la web:</strong> el proveedor de hosting donde se publica la web (Vercel o Firebase), que puede registrar
          datos técnicos de la conexión, como la dirección IP, por seguridad.
        </li>
      </ul>
      <p>
        Si preguntas por una sede concreta, tu consulta puede llegar a las personas que facilitan en esa sede, que forman parte de MCE.
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
      <p>Para ejercerlos, contacta con nosotros {viaContacto}, indicando qué derecho quieres ejercer.</p>

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

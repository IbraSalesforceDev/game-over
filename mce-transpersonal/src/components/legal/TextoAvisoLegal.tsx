/*
 * AVISO LEGAL (art. 10 de la LSSI). Debe revisarlo un gestor o asesor antes de
 * publicar la web. Los datos están en src/data/escuela.ts → `legal`.
 * Lo marcado como «pendiente» se ve resaltado en la web hasta completarlo.
 */
import { Link } from 'react-router';
import { escuela } from '../../data/escuela';
import Pendiente from './Pendiente';

export default function TextoAvisoLegal() {
  const { legal } = escuela;
  const email = legal.emailPrivacidad ?? escuela.email;

  return (
    <div className="prosa-legal">
      <p className="!text-sm">Última actualización: {legal.actualizacion}</p>

      <h2>1. Datos del titular</h2>
      <p>En cumplimiento de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI):</p>
      <ul>
        <li>
          <strong>Titular:</strong> {legal.denominacion ?? <Pendiente>pendiente</Pendiente>}
        </li>
        <li>
          <strong>NIF:</strong> {legal.nif ?? <Pendiente>pendiente</Pendiente>}
        </li>
        <li>
          <strong>Domicilio:</strong> {legal.domicilio}
          {legal.domicilioPendiente && (
            <>
              {' '}
              <Pendiente>pendiente de completar: código postal, municipio y provincia</Pendiente>
            </>
          )}
        </li>
        {email && (
          <li>
            <strong>Correo:</strong> <a className="enlace-texto" href={`mailto:${email}`}>{email}</a>
          </li>
        )}
        <li>
          <strong>Nombre comercial:</strong> {escuela.nombre} ({escuela.siglas}, {escuela.lema})
        </li>
      </ul>

      <h2>2. Objeto de la web</h2>
      <p>
        Esta web informa sobre la escuela {escuela.siglas}, sus formaciones, charlas y eventos, su equipo y sus sedes. En ella no se vende
        nada ni se contrata ningún servicio. Navegar por la web implica aceptar este aviso legal.
      </p>

      <h2>3. Información de la web</h2>
      <p>
        La información de la web, como las fechas, horarios y precios de los carteles, es orientativa y puede cambiar. Para confirmarla,
        contacta con la escuela o con tu sede.
      </p>

      <h2>4. Propiedad intelectual</h2>
      <p>
        Los textos, el logo, las fotografías, los carteles y el diseño de esta web pertenecen a {escuela.siglas} o se usan con permiso de sus
        autores. No está permitido reproducirlos, distribuirlos ni modificarlos sin autorización.
      </p>

      <h2>5. Enlaces a otras webs</h2>
      <p>
        La web incluye enlaces a servicios de terceros (Instagram, Facebook y Spotify). {escuela.siglas} no es responsable de su contenido
        ni de sus políticas, que se aplican al visitarlos.
      </p>

      <h2>6. Responsabilidad</h2>
      <p>
        {escuela.siglas} procura que la web funcione bien y que su información sea correcta, pero no puede garantizar que esté libre de
        errores o interrupciones, y no responde de los daños que pudieran derivarse de ellos.
      </p>

      <h2>7. Protección de datos y cookies</h2>
      <p>
        Cómo se tratan los datos personales y qué almacenamiento usa la web se explica en la{' '}
        <Link className="enlace-texto" to="/privacidad">política de privacidad</Link> y en la{' '}
        <Link className="enlace-texto" to="/cookies">política de cookies</Link>.
      </p>

      <h2>8. Legislación aplicable</h2>
      <p>Este aviso legal se rige por la legislación española.</p>
    </div>
  );
}

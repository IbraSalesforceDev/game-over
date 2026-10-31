/**
 * Datos generales de la escuela.
 *
 * Regla: lo que no sepamos con certeza se queda en `null` con un TODO.
 * Los componentes no muestran nada cuando un dato es `null`
 * (nunca se pone texto de relleno en la web).
 *
 * IMPORTANTE: no añadir ninguna dirección postal en ningún sitio.
 */

export const escuela = {
  nombre: 'MCE Transpersonal',
  siglas: 'MCE',
  lema: 'Mente, Cuerpo y Espíritu',
  fundadora: 'Betty Merino',

  /** Logo original. Se muestra tal cual, sin filtros ni recoloreado. */
  // TODO: cambiar la extensión si el archivo que llega no es .png (p. ej. logo.svg).
  logo: '/images/logo.png',

  // TODO: email de contacto de la escuela.
  email: null as string | null,

  // TODO: teléfono general de la escuela (formato "600 000 000").
  telefono: null as string | null,

  instagram: {
    usuario: 'mcetranspersonal',
    url: 'https://www.instagram.com/mcetranspersonal/',
  },

  /** Datos para las políticas legales. Sin domicilio, por decisión de la escuela. */
  legal: {
    // TODO: denominación legal del responsable (nombre de la sociedad o persona física).
    denominacion: null as string | null,
    // TODO: NIF/CIF del responsable, si se quiere publicar.
    nif: null as string | null,
    // TODO: email para ejercer derechos de protección de datos (puede ser el mismo que `email`).
    emailPrivacidad: null as string | null,
    /** Fecha que aparece como "última actualización" en las políticas. */
    actualizacion: '31 de octubre de 2026',
  },

  /**
   * Destino del formulario de contacto (Formspree).
   * Se configura con la variable de entorno VITE_FORMSPREE_ENDPOINT
   * (ver `.env.example` y el README).
   */
  formulario: (import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined)?.trim() || null,
} as const;

/** Convierte "619 217 810" en un enlace tel: válido para España. */
export function enlaceTelefono(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  return `tel:${digitos.startsWith('34') && digitos.length > 9 ? '+' : '+34'}${digitos}`;
}

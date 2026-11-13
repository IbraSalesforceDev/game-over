/**
 * Datos generales de la escuela.
 *
 * Regla: lo que no sepamos con certeza se queda en `null` con un TODO.
 * Los componentes no muestran nada cuando un dato es `null`
 * (nunca se pone texto de relleno en la web).
 *
 * IMPORTANTE: no añadir ninguna dirección postal en ningún sitio. Única
 * excepción, por decisión de la escuela: el domicilio del titular en el aviso legal.
 */

export const escuela = {
  nombre: 'MCE Transpersonal',
  siglas: 'MCE',
  lema: 'Mente, Cuerpo y Espíritu',
  fundadora: 'Betty Merino',

  // El logo original está en src/assets/logo.png (se muestra sin filtros ni recoloreado).
  // TODO: si hay versión vectorial (SVG) o más grande, sustituirlo por ella.

  // Fuente: página de contacto de la web oficial.
  email: 'mcetranspersonal@gmail.com' as string | null,

  // Fuente: página de contacto de la web oficial.
  telefono: '644 473 497' as string | null,

  instagram: {
    usuario: 'mcetranspersonal',
    url: 'https://www.instagram.com/mcetranspersonal/',
  },

  /**
   * Datos del titular para el aviso legal y la política de privacidad.
   * El domicilio solo aparece en el aviso legal (lo exige la LSSI).
   */
  legal: {
    // La titular es la entidad, no una persona física (nombre como en el cartel de Benidorm).
    denominacion: 'Asociación MCE Transpersonal' as string | null,
    denominacionPendiente: false,
    // CIF confirmado por la escuela.
    cif: 'G42812537' as string | null,
    domicilio: 'Calle Asdrúbal, 3, 41089 Montequinto (Sevilla)' as string | null,
    emailPrivacidad: 'mcetranspersonal@gmail.com' as string | null,
    /** Fecha que aparece como "última actualización" en los textos legales. */
    actualizacion: '5 de noviembre de 2026',
  },
} as const;

/** Convierte "619 217 810" en un enlace tel: válido para España. */
export function enlaceTelefono(numero: string): string {
  const digitos = numero.replace(/\D/g, '');
  return `tel:${digitos.startsWith('34') && digitos.length > 9 ? '+' : '+34'}${digitos}`;
}

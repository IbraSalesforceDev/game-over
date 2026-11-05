/**
 * Información sobre MCE sacada de la web oficial (mcetranspersonal.com) y
 * reescrita para esta web, sin añadir datos. En cada bloque se indica de qué
 * página sale, para poder comprobarlo.
 *
 * NO usar aquí nada de lo que la escuela ha pedido retirar (ver historial
 * del proyecto): ni textos eliminados, ni el congreso antiguo, ni sedes o
 * personas retiradas.
 */

/** Relato de la historia de MCE (Sobre MCE), por etapas y sin fechas. */
export const relato: { titulo: string; texto: string }[] = [
  {
    // Fuente: sobre-mce («Somos una Escuela de Desarrollo Personal y Transpersonal…»)
    titulo: 'Una escuela',
    texto:
      'MCE es una escuela de desarrollo personal y transpersonal. Quienes la forman trabajan juntos con un mismo fin: ayudar al despertar y a la elevación de la consciencia, desde sedes en distintas ciudades.',
  },
  {
    // Fuente: sobre-mce («Esta escuela tiene como objetivo acompañar a las personas a reconocerse…»)
    titulo: 'Para qué existe',
    texto:
      'Su objetivo es acompañar a cada persona a reconocerse y a encontrar su propio camino: el que elige ella, no el que le han impuesto. Y, desde ahí, ganar la confianza de saber que sus respuestas ya están dentro.',
  },
  {
    // Fuente: servicios («Hay que desandar lo aprendido…»). Caminos indicados por la escuela.
    titulo: 'Cómo trabaja',
    texto:
      'Para MCE, crecer es desandar lo aprendido desde fuera y encontrar la forma de ir hacia dentro. Por eso propone un proceso pausado y consciente, que empieza con los cursos de Inteligencia Emocional, pudiéndose continuar con Experto en Inteligencia Emocional Transpersonal, Especialista Transpersonal Sistémico, 7H y Monográficos Transpersonales. Las sedes son el lugar donde recibir las herramientas para encontrarse con el propio Ser y retomar el propio camino.',
  },
  {
    // Fuente: sobre-mce («La Escuela está conformada por un equipo interdisciplinario…»)
    titulo: 'Quién la hace posible',
    texto:
      'Un equipo interdisciplinar unido por la vocación de servicio. Cada persona aporta su propio enfoque y esa diferencia hace que el equipo y las formaciones aborden los cambios de una forma holística.',
  },
];

/** Las tres etapas del camino que propone MCE. Fuente: inicio. */
export const camino: { titulo: string; texto: string }[] = [
  {
    titulo: 'Inteligencia Emocional',
    texto:
      'El principio del camino. Aprender a gestionar las emociones es el abecedario con el que la razón aprende a funcionar en armonía con el corazón.',
  },
  {
    titulo: 'Desarrollo Transpersonal',
    texto:
      'Conocer lo que hay dentro para después avanzar hacia fuera: descubrir el propio y auténtico Ser, el equilibrio y el silencio interior.',
  },
  {
    titulo: 'Despertar de la Consciencia',
    texto:
      'Abrir los ojos del alma y descubrir la belleza del Universo del que siempre has formado parte. Es el momento del despertar.',
  },
];

/** Citas de Betty Merino (literales: son citas). Fuentes: inicio y servicios. */
export const citasBetty = {
  presente: '«Si quieres una explicación a tu presente, mira tu pasado. Si quieres saber tu futuro mira a tu presente.»',
  viajeros: '«Somos viajeros del tiempo. Venimos a compartir, aprender, tocar almas, dar amor y transformarnos.»',
} as const;

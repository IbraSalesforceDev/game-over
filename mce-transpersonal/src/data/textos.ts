import bettyFoto from '../assets/fotos/betty-merino.webp';

/**
 * Textos oficiales de MCE. Se usan tal cual, sin reescribir.
 * Fuente: https://mcetranspersonal.com/sobre-mce/
 */

export const historia = {
  titulo: 'Mente, Cuerpo y Espíritu.',
  parrafos: [
    'El proyecto MCE nace de la mano de Betty Merino, con la intención de generar una red que expanda toda la sabiduría transpersonal que en ella habita desde que era sólo una niña.',
    'Pese a que las siglas del proyecto nos inspiren la tríada mente, cuerpo y espíritu, su significado descansa sobre la metáfora de la mecedora; ahí donde llegas a casa, donde puedes descansar, donde por fin dejas de sentirte solo.',
    'Y es que MCE, es eso, es hogar. Es llegar a casa.',
    'Es conexión, compañía, comprensión, compasión y amor.',
    'MCE no es más que la propuesta de que los seres humanos nos encontremos unos a otros, comprendamos que no estamos solos, que realmente, todos somos uno.',
    'Y desde ahí, MCE propone una nueva realidad y forma de comprender la vida, una nueva forma de relacionarnos y mirarnos los unos a los otros.',
    'Para así, aumentar el nivel de consciencia de todos los seres humanos, integrando desde el corazón, que otra forma de vivir es posible.',
  ],
} as const;

export { mision } from './mision';

/** Atajos a frases concretas del texto oficial, para no duplicarlas a mano. */
export const frases = {
  origen: historia.parrafos[0],
  mecedora: historia.parrafos[1],
  hogar: historia.parrafos[2],
  valores: historia.parrafos[3],
  encuentro: historia.parrafos[4],
  propuesta: historia.parrafos[5],
  consciencia: historia.parrafos[6],
  /** Fragmento literal del párrafo de la mecedora. */
  llegarACasa: 'ahí donde llegas a casa, donde puedes descansar, donde por fin dejas de sentirte solo.',
} as const;

export const valores = ['Conexión', 'Compañía', 'Comprensión', 'Compasión', 'Amor'] as const;

/** Mensaje acordado con la escuela. Sin cifra exacta. */
export const formados = 'Miles de personas ya se han formado con MCE.';

/** Mensaje acordado para Sedes y Contacto. */
export const animoContacto = {
  linea1: 'No tengas miedo de hablarles.',
  linea2: 'Estamos esperando vuestro mensaje.',
} as const;

export const betty = {
  nombre: 'Betty Merino',
  rol: 'Fundadora de MCE',
  foto: bettyFoto as string | null,
  // TODO: texto sobre la consulta transpersonal de Betty (qué es, cómo se pide,
  // modalidad). Mientras sea null, solo se muestra el enlace a Contacto.
  consulta: null as string | null,
};

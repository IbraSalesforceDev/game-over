import bettyFoto from '../assets/fotos/betty-merino.webp';

/**
 * Textos oficiales de MCE. Se usan tal cual, sin reescribir.
 * Fuente: https://mcetranspersonal.com/sobre-mce/
 */

export const historia = {
  titulo: 'Mente, Cuerpo y Espíritu.',
  parrafos: [
    // Acordado con la escuela: solo que Betty es la creadora del proyecto.
    'Betty Merino es la creadora del proyecto MCE.',
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
  hogar: historia.parrafos[1],
  valores: historia.parrafos[2],
  encuentro: historia.parrafos[3],
  propuesta: historia.parrafos[4],
  consciencia: historia.parrafos[5],
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

/**
 * RESEÑAS de MCE (carrusel de Inicio, debajo de "Cientos de personas…").
 *
 * Cómo añadir o cambiar reseñas: copia un bloque { … } y pega los datos.
 *   - nombre: como aparece en la reseña.
 *   - texto:  el texto exacto, sin modificarlo (los emojis se conservan).
 *   - sede:   OPCIONAL. Si la reseña no indica sede o formación, no se pone
 *             (y no se muestra nada).
 * Se muestran en este mismo orden.
 */
export type Resena = {
  nombre: string;
  texto: string;
  /** Opcional: sede o formación. */
  sede?: string;
};

export const resenas: Resena[] = [
  {
    nombre: 'M José Romero',
    texto:
      'Eternamente agradecida por la experiencia compartida, la información recibida y la oportunidad de cambiar la mirada. Apertura mental totalmente práctica para aplicar en el día a día.',
  },
  {
    nombre: 'La Ma Ga',
    texto:
      'Gracias a toda la información recibida y puesta en práctica durante y después de las formaciones, miro a la vida y sus circunstancias de una forma más amable y cada día aprendo a vivir con más paz. ❤️',
  },
  {
    nombre: 'Jose Juan Ibañez Poveda',
    texto:
      'Un antes y un después. Acompañamiento, respeto, comprensión......un sinfín de cualidades de todos los miembros de este equipo. Agradecido de poder participar en este espacio. ❤️❤️❤️',
  },
  {
    nombre: 'Yeya Quiroga',
    texto:
      'Tanto q agradecer, tanto vivido, llegué a estos cursos bastante malita emocional y mentalmente, me estaba separando y en medio de un caos... conocí los cursos, sólo puedo dar infinitas gracias por enseñarme una nueva forma de ver la vida, gracias por ser ejemplo de que sí se puede y por ser ese apoyo a tantos niveles, gracias infinitas por tanto',
  },
  {
    nombre: 'M Angeles Gomez Molero',
    texto:
      'Para mí hay un antes y un después en mi vida de hacer los cursos con MCE y aquí quiero seguir creciendo con vosotros. No tengo palabras para agradeceros por tanto ❤️',
  },
  {
    nombre: 'Al Berto Ratso Rivero',
    texto:
      'Toda una experiencia. Solo puedo hablar cosas positivas de todo lo que he aprendido aquí. El resto solo lo descubriréis participando.',
  },
  {
    nombre: 'Michelle Miucha',
    texto:
      'Un antes y después en mi vida, gran regalo 🎁. Ver todo mucho más consciente y con mucho amor ❤️. Gracias gracias gracias por todo lo vivido.',
  },
  {
    nombre: 'Ibez Raquel',
    sede: 'Granada',
    texto:
      'Mi experiencia en la sede de Granada con MCE es una experiencia inexplicable, única, una oportunidad al renacer en vida y una historia que no quiero que terminemos. La escuela te aporta sostén, familia, escucha, apoyo y un cariño incondicional. Gracias siempre ❤️',
  },
  {
    nombre: 'Minerva Sánchez Ripoll',
    texto:
      'Sus formaciones son, sin duda, un aprendizaje profundo. Muy recomendables, siempre te llevas herramientas útiles para aplicar en tu realidad 😊',
  },
];

/** Enlace "Ver más reseñas en Facebook" (se abre en una pestaña nueva). */
export const enlaceMasResenas = 'https://www.facebook.com/MCETranspersonal/reviews';

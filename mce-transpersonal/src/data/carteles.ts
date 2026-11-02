/**
 * CARTELES de Formaciones: imagen que se abre en un cartelito emergente al
 * pulsar cada elemento. La clave es el `id` del elemento en formaciones.ts.
 *
 * Imágenes: carpeta src/assets/carteles/. Ahora son provisionales
 * ("Imagen pendiente"). Para poner la real, sustituye el archivo por el tuyo
 * CON EL MISMO NOMBRE (nivel-1.jpg, vii-congreso-2027.jpg). Si tu imagen es
 * .png o .webp, cambia también la extensión en la línea `import` de abajo.
 *
 * Para las charlas y eventos de "Otras charlas y eventos":
 *   1. añade cada charla en formaciones.ts, dentro de ese bloque, con su id
 *      (p. ej. { id: 'charla-ejemplo', nombre: 'Nombre de la charla', ...vacio });
 *   2. deja su imagen en src/assets/carteles/ e impórtala aquí;
 *   3. añade aquí una entrada con ese mismo id.
 * Cada elemento con cartel se muestra como pulsable automáticamente.
 */
import nivel1 from '../assets/carteles/nivel-1.jpg';
import congreso2027 from '../assets/carteles/vii-congreso-2027.jpg';

export type Cartel = {
  /** Título del cartelito (también lo leen los lectores de pantalla). */
  titulo: string;
  imagen: string;
  /** Descripción de la imagen para quien no puede verla. */
  alt: string;
};

export const carteles: Record<string, Cartel> = {
  // "Nivel 1" de Inteligencia Emocional Transpersonal por niveles
  'iet-nivel-1': {
    titulo: 'Nivel 1 · Inteligencia Emocional Transpersonal',
    imagen: nivel1,
    alt: 'Cartel del Nivel 1 de Inteligencia Emocional Transpersonal (imagen pendiente)',
  },
  // VII Congreso Transpersonal 2027 (todo el bloque)
  'congreso-transpersonal-2027': {
    titulo: 'VII Congreso Transpersonal 2027',
    imagen: congreso2027,
    alt: 'Cartel del VII Congreso Transpersonal 2027 (imagen pendiente)',
  },
  // Charlas y eventos: una entrada por cada una, con el id que tenga en formaciones.ts
  // 'charla-ejemplo': { titulo: 'Nombre de la charla', imagen: charlaEjemplo, alt: 'Cartel de …' },
};

/**
 * Fotos de los facilitadores (las mismas que en mcetranspersonal.com/sobre-mce/,
 * descargadas del original y optimizadas a 320 × 320).
 * Clave: el nombre tal como figura en sedes.ts. Una persona en varias sedes
 * usa siempre la misma foto.
 * (Va aparte de sedes.ts porque vite.config.ts lee sedes.ts y no puede
 * importar imágenes.)
 */
import danielaRusso from '../assets/equipo/daniela-russo.webp';
import vicenteBaldo from '../assets/equipo/vicente-baldo.webp';
import anabelMartinez from '../assets/equipo/anabel-martinez.webp';
import noeliaDominguez from '../assets/equipo/noelia-dominguez.webp';
import silviaDiaz from '../assets/equipo/silvia-diaz.webp';
import danielJesusSalido from '../assets/equipo/daniel-jesus-salido.webp';

export const fotosEquipo: Record<string, string> = {
  'Daniela Russo': danielaRusso,
  'Vicente Baldó': vicenteBaldo,
  'Anabel Martínez': anabelMartinez,
  'Noelia Domínguez': noeliaDominguez,
  'Silvia Díaz': silviaDiaz,
  'Daniel Jesús Salido': danielJesusSalido,
};

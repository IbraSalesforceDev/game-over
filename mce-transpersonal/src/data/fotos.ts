/**
 * Fotos reales de MCE (recortadas de los montajes de cada sede).
 * Se importan desde src/assets para que vayan dentro del archivo único y
 * Vite las optimice en el build normal.
 *
 * Para añadir más: deja el archivo en src/assets/fotos/ e impórtalo aquí.
 * Si llega una foto pequeña (menos de ~800 px de ancho), mejor pedir el original.
 */
import sevillaGrupo from '../assets/fotos/sevilla-grupo.webp';
import sevillaEquipo from '../assets/fotos/sevilla-equipo.webp';
import valenciaGrupo from '../assets/fotos/valencia-grupo.webp';
import valenciaEquipo from '../assets/fotos/valencia-equipo.webp';
import alicanteSurGrupo from '../assets/fotos/alicante-sur-grupo.webp';
import alicanteSurEquipo from '../assets/fotos/alicante-sur-equipo.webp';
import mallorcaGrupo from '../assets/fotos/mallorca-grupo.webp';
import mallorcaEquipo from '../assets/fotos/mallorca-equipo.webp';
import granadaGrupo from '../assets/fotos/granada-grupo.webp';
import granadaEquipo from '../assets/fotos/granada-equipo.webp';
import madridGrupo from '../assets/fotos/madrid-grupo.webp';
import madridEquipo from '../assets/fotos/madrid-equipo.webp';
import benidormGrupo from '../assets/fotos/benidorm-grupo.webp';
import benidormEquipo from '../assets/fotos/benidorm-equipo.webp';
import grupoCamisetas from '../assets/fotos/grupo-camisetas.webp';
import grupoSala from '../assets/fotos/grupo-sala.webp';

export type FotoReal = { src: string; alt: string; ancho: number; alto: number; lugar?: string };

const f = (src: string, alt: string, ancho: number, alto: number, lugar?: string): FotoReal => ({ src, alt, ancho, alto, lugar });

/** Fotos por sede (clave = id de la sede en sedes.ts). La primera es la principal. */
export const fotosSede: Record<string, FotoReal[]> = {
  valencia: [
    f(valenciaGrupo, 'Grupo de formación de MCE Valencia', 916, 684, 'Valencia'),
    f(valenciaEquipo, 'Equipo de MCE Valencia', 538, 362, 'Valencia'),
  ],
  'alicante-sur': [
    f(alicanteSurGrupo, 'Grupo de formación de MCE Alicante Sur', 966, 522, 'Alicante Sur'),
    f(alicanteSurEquipo, 'Equipo de MCE Alicante Sur', 450, 336, 'Alicante Sur'),
  ],
  // TODO: la segunda foto de Benidorm llegó muy pequeña (153 px): pedir el original.
  benidorm: [
    f(benidormGrupo, 'Grupo de formación de MCE Benidorm', 424, 272, 'Benidorm'),
    f(benidormEquipo, 'Equipo de MCE Benidorm', 153, 151, 'Benidorm'),
  ],
  sevilla: [
    f(sevillaGrupo, 'Grupo de formación de MCE Sevilla', 1013, 572, 'Sevilla'),
    f(sevillaEquipo, 'Equipo de MCE Sevilla', 446, 356, 'Sevilla'),
  ],
  granada: [
    f(granadaGrupo, 'Grupo de formación de MCE Granada', 764, 571, 'Granada'),
    f(granadaEquipo, 'Equipo de MCE Granada', 378, 281, 'Granada'),
  ],
  'madrid-mallorca': [
    f(madridGrupo, 'Grupo de formación de MCE Madrid', 880, 656, 'Madrid'),
    f(mallorcaGrupo, 'Grupo de formación de MCE Mallorca', 955, 550, 'Mallorca'),
    f(madridEquipo, 'Equipo de MCE Madrid', 337, 319, 'Madrid'),
    f(mallorcaEquipo, 'Equipo de MCE Mallorca', 442, 401, 'Mallorca'),
  ],
};

/** Fotos generales de la escuela. */
export const fotosGenerales = {
  // Foto grande con las camisetas negras de MCE
  camisetas: f(grupoCamisetas, 'Equipo de MCE con las camisetas negras de la escuela, saludando con los brazos en alto', 960, 720),
  // TODO: confirmar de qué sede es esta foto (llegó sin rótulo).
  sala: f(grupoSala, 'Grupo de MCE en una sala de formación', 1400, 1399),
};

/** Todas las fotos de sede, en orden, para galerías. */
export const todasLasFotosDeSede: FotoReal[] = Object.values(fotosSede).flat();

/**
 * CARTELITOS de Formaciones: galería de imágenes (o un vídeo) que se abre al
 * pulsar un apartado o un elemento. La clave es el `id` del apartado o del
 * elemento en src/data/formaciones.ts.
 *
 * Cómo cambiar las imágenes:
 *   1. Deja la imagen en src/assets/carteles/ (mejor .webp o .jpg, de unos
 *      1000 px de ancho como máximo para que la web no pese).
 *   2. Impórtala abajo con un nombre (`import miCartel from '...'`).
 *   3. Añádela a la lista `imagenes` del apartado: { src: miCartel, alt: '…' }.
 *      - alt: qué se ve en la imagen, para quien no puede verla.
 *      - pie: OPCIONAL, texto corto debajo de la imagen (ahora no se usa).
 *   Para quitar una imagen, borra su línea de la lista (y su import).
 *   Las imágenes se muestran en el orden de la lista.
 *
 * Un apartado o elemento con cartel se muestra como pulsable automáticamente.
 */
import nivel1Madrid from '../assets/carteles/nivel-1-madrid.webp';
import nivel1Granada from '../assets/carteles/nivel-1-granada.webp';
import nivel1Sevilla from '../assets/carteles/nivel-1-sevilla.webp';
import nivel1Benidorm from '../assets/carteles/nivel-1-benidorm.webp';
import nivel1Valencia from '../assets/carteles/nivel-1-valencia.webp';
import expertoSevilla from '../assets/carteles/experto-sevilla.webp';
import expertoBenidorm from '../assets/carteles/experto-benidorm.webp';
import especialista from '../assets/carteles/especialista-sistemico.webp';
// PROVISIONAL: sustituir por el cartel de 7H (mismo nombre o cambiar el import).
import sieteHSevilla from '../assets/carteles/7h-sevilla.webp';
import monograficoSevilla from '../assets/carteles/monografico-sevilla.webp';
import monograficoGranada from '../assets/carteles/monografico-granada.webp';
import monograficoBenidorm from '../assets/carteles/monografico-benidorm.webp';
import otono from '../assets/carteles/otono.webp';
import navidad from '../assets/carteles/navidad.webp';
import talleresBenidorm from '../assets/carteles/talleres-benidorm.webp';
import talleresValencia from '../assets/carteles/talleres-valencia.webp';
import portadaCongreso from '../assets/carteles/congreso-vi-video-portada.webp';

export type Imagen = {
  src: string;
  /** Descripción de la imagen para quien no puede verla. */
  alt: string;
  /** Opcional: texto corto debajo de la imagen. */
  pie?: string;
};

export type Video = {
  /** Imagen de portada (guardada en la web: no se carga nada de Instagram). */
  portada: string;
  alt: string;
  /** Enlace al vídeo; se abre en una pestaña nueva. */
  enlace: string;
  /** Texto del botón que abre el vídeo. */
  boton: string;
};

export type Cartel = {
  /** Título del cartelito (también lo leen los lectores de pantalla). */
  titulo: string;
  imagenes: Imagen[];
  /** En lugar de imágenes, un vídeo con portada y enlace. */
  video?: Video;
};

const cartelDe = (que: string, sede: string) => `Cartel de ${que} en MCE ${sede}`;

export const carteles: Record<string, Cartel> = {
  // ── Niveles de Inteligencia Emocional: solo el Nivel 1 ───────────────
  'iet-nivel-1': {
    titulo: 'Nivel 1 · Inteligencia Emocional Transpersonal',
    imagenes: [
      { src: nivel1Madrid, alt: cartelDe('Nivel 1 de Inteligencia Emocional Transpersonal', 'Madrid') },
      { src: nivel1Granada, alt: cartelDe('Nivel 1 de Inteligencia Emocional Transpersonal', 'Granada') },
      { src: nivel1Sevilla, alt: cartelDe('Nivel 1 de Inteligencia Emocional Transpersonal', 'Sevilla') },
      { src: nivel1Benidorm, alt: cartelDe('Nivel 1 de Inteligencia Emocional Transpersonal', 'Benidorm') },
      { src: nivel1Valencia, alt: cartelDe('Nivel 1 de Inteligencia Emocional Transpersonal', 'Valencia') },
    ],
  },

  // ── Apartados con cartelito (la clave es el id del apartado) ─────────
  'experto-inteligencia-emocional-transpersonal': {
    titulo: 'Experto en Inteligencia Emocional Transpersonal',
    imagenes: [
      { src: expertoSevilla, alt: cartelDe('Experto en Inteligencia Emocional Transpersonal', 'Sevilla') },
      { src: expertoBenidorm, alt: cartelDe('Experto en Inteligencia Emocional Transpersonal', 'Benidorm') },
    ],
  },
  'especialista-transpersonal-sistemico': {
    titulo: 'Especialista Transpersonal Sistémico',
    imagenes: [{ src: especialista, alt: 'Cartel de Especialista Transpersonal Sistémico' }],
  },
  '7h': {
    titulo: '7H',
    imagenes: [{ src: sieteHSevilla, alt: cartelDe('7H, continúa profundizando con 7 herramientas', 'Sevilla') }],
  },
  'monograficos-transpersonales': {
    titulo: 'Monográficos Transpersonales',
    imagenes: [
      { src: monograficoSevilla, alt: cartelDe('Monográfico Transpersonal con Betty Merino', 'Sevilla') },
      { src: monograficoGranada, alt: cartelDe('Monográfico Transpersonal con Betty Merino', 'Granada') },
      { src: monograficoBenidorm, alt: cartelDe('Monográfico Transpersonal con Betty Merino', 'Benidorm') },
    ],
  },

  // ── Otras charlas y eventos: un cartelito por charla o evento ─────────
  'charla-otono': {
    titulo: 'Otoño',
    // El cartel viene cortado por abajo: el teléfono de «Info» va en el pie.
    imagenes: [{ src: otono, alt: cartelDe('las charlas-taller de otoño', 'Sevilla'), pie: 'Info: +34 658 77 65 60' }],
  },
  'charla-navidad': {
    titulo: 'Navidad',
    imagenes: [{ src: navidad, alt: cartelDe('la comida de Navidad', 'Sevilla') }],
  },
  'talleres-y-charlas': {
    titulo: 'Talleres y charlas',
    imagenes: [
      { src: talleresBenidorm, alt: cartelDe('los talleres y charlas de Inteligencia Emocional Transpersonal', 'Benidorm') },
      { src: talleresValencia, alt: cartelDe('los talleres y charlas de Inteligencia Emocional Transpersonal', 'Valencia') },
    ],
  },

  // ── VII Congreso Transpersonal 2027: el vídeo del VI Congreso ─────────
  'congreso-transpersonal-2027': {
    titulo: 'VI Congreso MCE · agosto de 2026',
    imagenes: [],
    video: {
      portada: portadaCongreso,
      alt: 'Foto de grupo de las personas asistentes al VI Congreso MCE',
      enlace: 'https://www.instagram.com/reel/Dc9PR2qobl_/',
      boton: 'Ver el vídeo en Instagram',
    },
  },
};

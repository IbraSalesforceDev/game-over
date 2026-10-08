import { png } from './png';

/**
 * El icono del juego, dibujado por código.
 *
 * Es el mismo dibujo que el favicon de `index.html` —tierra, hierba y una
 * lápida— en una rejilla de 32 × 32, y se escala sin suavizar, como el resto
 * del pixel art. Se genera al compilar y no se guarda en el repositorio: todo
 * el arte del juego sale de código, y el icono no tiene por qué ser la
 * excepción. Si cambia el dibujo, cambia en un solo sitio.
 *
 * El iPhone pide un PNG para la pantalla de inicio (no acepta SVG) y redondea
 * las esquinas por su cuenta, así que aquí el fondo llega hasta el borde.
 */

type Color = readonly [number, number, number];

const FONDO: Color = [0x12, 0x1a, 0x12];

/** Rectángulos en la rejilla de 32, en orden de pintado. */
const CAPAS: readonly { x: number; y: number; w: number; h: number; c: Color }[] = [
  { x: 4, y: 16, w: 24, h: 12, c: [0x6b, 0x4b, 0x2a] }, // tierra
  { x: 4, y: 16, w: 24, h: 3, c: [0x4c, 0x8b, 0x3a] }, // hierba
  { x: 9, y: 6, w: 6, h: 9, c: [0xd8, 0xcf, 0xc0] }, // lápida
];

/** El color de una casilla de la rejilla de 32. */
function colorEn(gx: number, gy: number): Color {
  let c = FONDO;
  for (const r of CAPAS) {
    if (gx >= r.x && gx < r.x + r.w && gy >= r.y && gy < r.y + r.h) c = r.c;
  }
  return c;
}

/** El icono como PNG cuadrado de `lado` píxeles. */
export function pngIcono(lado: number): Buffer {
  const rgb = new Uint8Array(lado * lado * 3);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const c = colorEn(Math.floor((x * 32) / lado), Math.floor((y * 32) / lado));
      const i = (y * lado + x) * 3;
      rgb[i] = c[0];
      rgb[i + 1] = c[1];
      rgb[i + 2] = c[2];
    }
  }
  return png(lado, lado, rgb);
}

/** Los iconos que se publican, por nombre de fichero. */
export const ICONOS: Readonly<Record<string, number>> = {
  // El de la pantalla de inicio del iPhone: 180 es el de los iPhone con
  // pantalla Retina 3×, y los demás lo reducen.
  'apple-touch-icon.png': 180,
  // Los que pide Android para instalar la aplicación.
  'icono-192.png': 192,
  'icono-512.png': 512,
};

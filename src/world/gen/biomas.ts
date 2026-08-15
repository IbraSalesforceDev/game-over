import { ruido1D } from './noise';
import type { Rng } from './rng';

/**
 * Biomas de superficie.
 *
 * Son franjas contiguas de columnas, no ruido salpicado: un desierto tiene que
 * ser un sitio al que se llega andando y del que se sale andando, y con ruido
 * suelto saldrían manchas de arena de treinta tiles en mitad del bosque. El
 * borde sí ondula, para que la frontera no sea una línea recta.
 *
 * El centro del mundo se reserva al bosque porque ahí es donde aparece el
 * jugador: empezar la partida en la lava del desierto o tiritando en la nieve
 * sería empezarla peor.
 */

export const BOSQUE = 0;
export const DESIERTO = 1;
export const NIEVE_B = 2;

export type MapaBiomas = Uint8Array;

/** Mitad del mundo, en fracción, que queda reservada al bosque inicial. */
const RESERVA_CENTRO = 0.16;

export function generarBiomas(ancho: number, semilla: number, rng: Rng): MapaBiomas {
  const mapa = new Uint8Array(ancho);
  const centro = ancho / 2;

  // Uno a cada lado, cara o cruz: así el mundo nunca tiene los dos biomas
  // pegados y siempre hay que cruzar el bosque para ir de uno a otro.
  const desiertoIzquierda = rng.suerte(0.5);
  const bandas = [
    { tipo: DESIERTO, izquierda: desiertoIzquierda },
    { tipo: NIEVE_B, izquierda: !desiertoIzquierda },
  ];

  for (const banda of bandas) {
    const anchoBanda = Math.floor(ancho * rng.rango(0.13, 0.2));
    const margen = Math.floor(ancho * 0.04);
    const libre = centro * (1 - RESERVA_CENTRO * 2) - anchoBanda - margen;
    const desplazamiento = rng.rango(0, Math.max(0, libre));
    const borde = centro * RESERVA_CENTRO * 2 + desplazamiento;
    const inicio = banda.izquierda
      ? Math.floor(centro - borde - anchoBanda)
      : Math.floor(centro + borde);

    for (let tx = 0; tx < anchoBanda; tx++) {
      // El borde se desdibuja con ruido: los últimos tiles de arena se meten
      // entre la hierba y al revés.
      const x = inicio + tx;
      if (x < 2 || x >= ancho - 2) continue;
      const dentro = Math.min(tx, anchoBanda - 1 - tx);
      const ondulacion = (ruido1D(x / 11, semilla + banda.tipo * 131) - 0.5) * 14;
      if (dentro + ondulacion > 0) mapa[x] = banda.tipo;
    }
  }

  return mapa;
}

/**
 * Columnas que quedan hasta el bioma vecino, para cada columna.
 *
 * Sirve para adelgazar el bioma según se acerca a su frontera. Sin eso, la
 * nieve y la arena bajan treinta tiles a plomo y el límite entre biomas se ve
 * como un muro blanco cortado a cuchillo, que es exactamente lo que parecía en
 * las primeras capturas.
 */
export function distanciaAlBorde(mapa: MapaBiomas): Int32Array {
  const n = mapa.length;
  const dist = new Int32Array(n).fill(n);
  // Dos pasadas, una en cada sentido: es la distancia de Manhattan en 1D y sale
  // en tiempo lineal.
  let ultimo = -n;
  for (let x = 0; x < n; x++) {
    if (x > 0 && mapa[x] !== mapa[x - 1]) ultimo = x;
    dist[x] = x - ultimo;
  }
  ultimo = n * 2;
  for (let x = n - 1; x >= 0; x--) {
    if (x < n - 1 && mapa[x] !== mapa[x + 1]) ultimo = x;
    dist[x] = Math.min(dist[x]!, ultimo - x);
  }
  return dist;
}

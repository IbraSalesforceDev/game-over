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
 *
 * Las franjas se reparten en dos lados y se colocan hacia fuera desde el
 * centro. Cada lado lleva las suyas en fila, así que ir del bosque a la selva
 * puede obligar a cruzar el desierto entero: es lo que convierte el mapa en un
 * recorrido y no en un muestrario.
 */

export const BOSQUE = 0;
export const DESIERTO = 1;
export const NIEVE_B = 2;
export const JUNGLA = 3;

export type MapaBiomas = Uint8Array;

/** Mitad del mundo, en fracción, que queda reservada al bosque inicial. */
const RESERVA_CENTRO = 0.16;

export function generarBiomas(ancho: number, semilla: number, rng: Rng): MapaBiomas {
  const mapa = new Uint8Array(ancho);
  const centro = ancho / 2;

  // El desierto y la nieve, uno a cada lado: así el mundo nunca los tiene
  // pegados y siempre hay que cruzar el bosque para ir de uno a otro. La selva
  // cae en el lado que le toque, por detrás del que ya esté ahí.
  const desiertoIzquierda = rng.suerte(0.5);
  const junglaIzquierda = rng.suerte(0.5);
  const lados: Record<'izq' | 'der', number[]> = { izq: [], der: [] };
  lados[desiertoIzquierda ? 'izq' : 'der'].push(DESIERTO);
  lados[desiertoIzquierda ? 'der' : 'izq'].push(NIEVE_B);
  lados[junglaIzquierda ? 'izq' : 'der'].push(JUNGLA);

  for (const [lado, tipos] of Object.entries(lados) as ['izq' | 'der', number[]][]) {
    const izquierda = lado === 'izq';
    // Se avanza hacia fuera: cada franja empieza donde acabó la anterior más un
    // trecho de bosque, para que nunca queden dos biomas pegados.
    let borde = centro * RESERVA_CENTRO * 2;
    for (const tipo of tipos) {
      const anchoBanda = Math.floor(ancho * rng.rango(0.1, 0.16));
      const hueco = Math.floor(ancho * rng.rango(0.02, 0.05));
      borde += hueco;
      const inicio = izquierda
        ? Math.floor(centro - borde - anchoBanda)
        : Math.floor(centro + borde);
      borde += anchoBanda;

      for (let tx = 0; tx < anchoBanda; tx++) {
        // El borde se desdibuja con ruido: los últimos tiles de arena se meten
        // entre la hierba y al revés.
        const x = inicio + tx;
        if (x < 2 || x >= ancho - 2) continue;
        const dentro = Math.min(tx, anchoBanda - 1 - tx);
        const ondulacion = (ruido1D(x / 11, semilla + tipo * 131) - 0.5) * 14;
        if (dentro + ondulacion > 0) mapa[x] = tipo;
      }
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

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

/**
 * Genera las franjas de bioma.
 *
 * `permitidos` dice qué biomas existen en este mundo. Es la puerta por la que
 * entra la versión elegida al crear la partida: un mundo de 2.1.0 tiene
 * desierto y nieve pero no selva, y en vez de tener dos generadores de biomas
 * —uno viejo y uno nuevo, que habría que arreglar dos veces— se le pasa la
 * lista y las franjas que no valgan sencillamente no se colocan.
 */
/**
 * Cuántas franjas de bioma caben por lado según lo ancho que sea el mundo.
 *
 * Hasta 5.0.0 había exactamente una de cada, y eso hacía que el mapa fuera un
 * muestrario: visto un desierto, vistos todos. Con varias por lado —y de
 * tamaños distintos— cruzar el mundo pasa a ser un viaje con etapas, y
 * encontrar una selva grande después de haber visto solo una pequeña significa
 * algo. Un mundo pequeño se queda en dos por lado para no quedar apelmazado.
 */
function franjasPorLado(ancho: number): number {
  return Math.max(2, Math.min(5, Math.round(ancho / 1100)));
}

export function generarBiomas(
  ancho: number,
  semilla: number,
  rng: Rng,
  permitidos: readonly number[] = [DESIERTO, NIEVE_B, JUNGLA],
): MapaBiomas {
  const mapa = new Uint8Array(ancho);
  const centro = ancho / 2;

  // Cada lado recibe su propia baraja de biomas, empezando por uno distinto:
  // así el mundo nunca tiene el desierto y la nieve pegados y siempre hay que
  // cruzar bosque para ir de uno a otro.
  const cuantas = franjasPorLado(ancho);
  const orden = [DESIERTO, NIEVE_B, JUNGLA];
  const primeroIzq = rng.entero(0, 2);
  const lados: Record<'izq' | 'der', number[]> = { izq: [], der: [] };
  for (let i = 0; i < cuantas; i++) {
    lados.izq.push(orden[(primeroIzq + i) % 3]!);
    lados.der.push(orden[(primeroIzq + i + 1) % 3]!);
  }

  for (const [lado, tipos] of Object.entries(lados) as ['izq' | 'der', number[]][]) {
    const izquierda = lado === 'izq';
    // Se avanza hacia fuera: cada franja empieza donde acabó la anterior más un
    // trecho de bosque, para que nunca queden dos biomas pegados.
    let borde = centro * RESERVA_CENTRO * 2;
    for (const tipo of tipos) {
      // El tamaño de cada franja se sortea en un rango ancho a propósito: lo
      // que se busca es que unas sean un paseo y otras una travesía, no que
      // todas midan lo mismo con dos columnas de diferencia.
      // Suelo de cuarenta columnas: por debajo de eso no es un bioma pequeño,
      // es una mancha de arena en mitad del bosque. Lo que se quería con los
      // tamaños variables es que unos sean un paseo y otros una travesía, no
      // que alguno pase desapercibido.
      const pedido = Math.max(40, Math.floor(ancho * rng.rango(0.04, 0.15)));
      const hueco = Math.floor(ancho * rng.rango(0.02, 0.05));
      borde += hueco;
      // Lo que queda hasta el borde del mundo. Se recorta la franja en vez de
      // descartarla: en un mundo estrecho la última cabe a medias, y media
      // franja de desierto es mejor que ninguna.
      const sitio = Math.floor(centro - borde) - 3;
      const anchoBanda = Math.min(pedido, sitio);
      const inicio = izquierda
        ? Math.floor(centro - borde - anchoBanda)
        : Math.floor(centro + borde);
      borde += anchoBanda;
      if (anchoBanda < 30) continue;
      // Se sortea igual aunque la franja no se coloque: así la semilla sigue
      // dando el mismo mundo salvo por lo que falta, en vez de descolocarlo
      // entero por una banda de menos.
      if (!permitidos.includes(tipo)) continue;
      if (inicio < 2 || inicio + anchoBanda >= ancho - 2) continue;

      for (let tx = 0; tx < anchoBanda; tx++) {
        // El borde se desdibuja con ruido: los últimos tiles de arena se meten
        // entre la hierba y al revés.
        const x = inicio + tx;
        if (x < 2 || x >= ancho - 2) continue;
        const dentro = Math.min(tx, anchoBanda - 1 - tx);
        const ondulacion = (ruido1D(x / 11, semilla + tipo * 131 + inicio) - 0.5) * 14;
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

import type { Reloj } from '../engine/time';
import { css as colorCss } from '../engine/time';
import { contexto, hash2, lienzo, mezclar } from './pixel';

/**
 * Fondo lejano: montañas en capas y nubes.
 *
 * Es el añadido que más profundidad da por menos trabajo. Sin él, el cielo es
 * un degradado liso y el mundo parece recortado y pegado encima; con dos
 * cordilleras moviéndose más despacio que el terreno, el ojo entiende de golpe
 * que hay kilómetros por detrás.
 *
 * Cada capa se dibuja una vez en una tira que encaja consigo misma por los
 * extremos, y luego se repite en horizontal. Generarla entera cada frame sería
 * pagar miles de operaciones por algo que no cambia nunca.
 */

/** Ancho de la tira de cada capa. Se repite, así que conviene que sea grande. */
const ANCHO_TIRA = 512;
const ALTO_TIRA = 200;

interface Capa {
  tira: HTMLCanvasElement;
  /** 0 = pegada al fondo del cielo, 1 = se mueve con el mundo. */
  parallax: number;
  /** Color con el que se tiñe, mezclado con el cielo según la hora. */
  color: string;
  /** Altura de la línea del horizonte dentro de la pantalla, en fracción. */
  anclaje: number;
  /** Copia ya teñida y el color con el que se tiñó, para no repetirlo cada frame. */
  tenida: HTMLCanvasElement;
  colorTenido: string;
}

/**
 * Tiñe una silueta blanca del color que se le pida.
 *
 * Va sobre un lienzo aparte y no sobre la pantalla porque `source-in` borra
 * todo lo que no cubra la forma: aplicado directamente sobre la escena, se
 * llevaría por delante el cielo que ya está pintado.
 */
function tenir(destino: HTMLCanvasElement, origen: HTMLCanvasElement, color: string): void {
  const ctx = contexto(destino);
  ctx.clearRect(0, 0, destino.width, destino.height);
  ctx.drawImage(origen, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, destino.width, destino.height);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Perfil de montañas por ruido de valor con varias octavas.
 *
 * El perfil se cierra sobre sí mismo interpolando las últimas columnas con las
 * primeras: si no, al repetir la tira aparece un escalón vertical cada 512
 * píxeles y se ve la costura desde la otra punta del mapa.
 */
function perfil(semilla: number, amplitud: number, escala: number): Float32Array {
  const h = new Float32Array(ANCHO_TIRA);
  for (let x = 0; x < ANCHO_TIRA; x++) {
    let v = 0;
    let amp = 1;
    let frec = escala;
    for (let o = 0; o < 4; o++) {
      const i = Math.floor(x * frec);
      const t = x * frec - i;
      const a = hash2(i, semilla + o * 31);
      const b = hash2(i + 1, semilla + o * 31);
      // Suavizado coseno: con interpolación lineal las crestas salen en pico.
      const s = (1 - Math.cos(t * Math.PI)) / 2;
      v += (a + (b - a) * s) * amp;
      amp *= 0.5;
      frec *= 2;
    }
    h[x] = v * amplitud;
  }
  // Fundido de los últimos 64 píxeles con los primeros para cerrar el bucle.
  const fundido = 64;
  for (let i = 0; i < fundido; i++) {
    const t = i / fundido;
    const x = ANCHO_TIRA - fundido + i;
    h[x] = h[x]! * (1 - t) + h[i]! * t;
  }
  return h;
}

function tiraMontanas(semilla: number, amplitud: number, escala: number): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  const h = perfil(semilla, amplitud, escala);

  // Se pinta en blanco puro y el tinte lo pone el render con `globalAlpha` y
  // una composición: así una misma tira sirve para el amanecer y para la noche.
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < ANCHO_TIRA; x++) {
    const cima = ALTO_TIRA - h[x]!;
    ctx.fillRect(x, cima, 1, ALTO_TIRA - cima);
  }
  // Cresta iluminada: una línea más clara en la cima define la silueta y evita
  // que la cordillera se lea como una mancha.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (let x = 0; x < ANCHO_TIRA; x++) {
    ctx.fillRect(x, ALTO_TIRA - h[x]! - 2, 1, 2);
  }
  return c;
}

/** Nubes: manchas redondeadas repartidas por la tira. */
function tiraNubes(semilla: number): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, 120);
  const ctx = contexto(c);
  ctx.fillStyle = '#ffffff';

  for (let n = 0; n < 9; n++) {
    const cx = hash2(n, semilla) * ANCHO_TIRA;
    const cy = 14 + hash2(n, semilla + 7) * 70;
    const escala = 0.6 + hash2(n, semilla + 13) * 0.9;
    // Cada nube son cuatro o cinco burbujas solapadas: una elipse sola parece
    // un huevo, y el racimo ya se lee como nube.
    for (let b = 0; b < 5; b++) {
      const bx = cx + (hash2(n * 9 + b, semilla + 3) - 0.5) * 60 * escala;
      const by = cy + (hash2(n * 9 + b, semilla + 5) - 0.5) * 14 * escala;
      const rx = (10 + hash2(n * 9 + b, semilla + 11) * 16) * escala;
      const ry = rx * 0.55;
      ctx.globalAlpha = 0.5 + hash2(n * 9 + b, semilla + 17) * 0.35;
      ctx.beginPath();
      ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Y si la nube cae cerca del borde, se repite al otro lado para que la
      // tira encaje consigo misma.
      if (bx < 40 || bx > ANCHO_TIRA - 40) {
        ctx.beginPath();
        ctx.ellipse(bx < 40 ? bx + ANCHO_TIRA : bx - ANCHO_TIRA, by, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = 1;
  return c;
}

/** Biomas que el fondo distingue. Es el mismo nombre que usa el generador. */
export type BiomaFondo = 'bosque' | 'desierto' | 'nieve' | 'jungla';

/**
 * Color y fuerza con la que cada bioma tiñe las cordilleras.
 *
 * Suave a propósito: el fondo no puede competir con el terreno. Lo que se busca
 * es que al entrar en el desierto el horizonte se vuelva cálido sin que nadie
 * sepa decir exactamente qué ha cambiado.
 */
const TINTE_BIOMA: Record<BiomaFondo, readonly [string, number]> = {
  bosque: ['#54708f', 0],
  desierto: ['#c9a163', 0.45],
  nieve: ['#dbe8f5', 0.42],
  jungla: ['#2f6b4a', 0.4],
};

export class Fondo {
  private readonly capas: Capa[];
  private readonly nubes: HTMLCanvasElement;

  constructor() {
    const crear = (
      semilla: number,
      amplitud: number,
      escala: number,
      parallax: number,
      color: string,
      anclaje: number,
    ): Capa => ({
      tira: tiraMontanas(semilla, amplitud, escala),
      parallax,
      color,
      anclaje,
      tenida: lienzo(ANCHO_TIRA, ALTO_TIRA),
      colorTenido: '',
    });
    this.capas = [
      // Cordillera lejana: casi no se mueve y está muy desaturada.
      crear(11, 92, 1 / 190, 0.06, '#7d93b5', 0.5),
      // Colinas de en medio, más oscuras y más rápidas.
      crear(29, 120, 1 / 120, 0.14, '#54708f', 0.62),
    ];
    this.nubes = tiraNubes(53);
  }

  /**
   * Dibuja el fondo sobre el cielo ya pintado.
   *
   * `camX`/`camY` son la posición de la cámara en píxeles de mundo. El
   * desplazamiento vertical va con un factor mucho menor que el horizontal
   * porque, al bajar a una cueva, unas montañas que suben con el jugador se
   * notan enseguida como un truco.
   */
  dibujar(
    ctx: CanvasRenderingContext2D,
    reloj: Reloj,
    camX: number,
    camY: number,
    ancho: number,
    alto: number,
    escala: number,
    ms: number,
    bioma: BiomaFondo = 'bosque',
  ): void {
    const luz = reloj.luzSolar / 255;
    // De noche el fondo casi desaparece: las montañas se funden con el cielo,
    // igual que en la realidad.
    const opacidadBase = 0.25 + luz * 0.55;
    if (opacidadBase < 0.06) return;
    const cielo = colorCss(reloj.colorCielo[1]);

    // --- Nubes ---
    ctx.save();
    ctx.globalAlpha = 0.1 + luz * 0.28;
    const anchoNubes = ANCHO_TIRA * escala;
    // Las nubes van a la deriva por su cuenta, además del parallax: un cielo
    // completamente quieto delata que el mundo está en pausa.
    const desNubes = (((-camX * 0.03 - ms * 0.004) % anchoNubes) + anchoNubes) % anchoNubes;
    const yNubes = Math.round(alto * 0.05 - camY * 0.02 * escala);
    for (let x = desNubes - anchoNubes; x < ancho; x += anchoNubes) {
      ctx.drawImage(this.nubes, Math.round(x), yNubes, anchoNubes, 120 * escala);
    }
    ctx.restore();

    // --- Cordilleras ---
    for (const capa of this.capas) {
      // La bruma de la distancia: cuanto más lejos está la capa, más se mezcla
      // su color con el del cielo. Es niebla atmosférica sin niebla de verdad.
      // Además de la bruma, el tinte del bioma: las montañas del desierto
      // tiran a ocre y las de la nieve a azul pálido. Es lo que hace que se
      // note el cambio de bioma antes de mirar al suelo — y como se aplica al
      // color y no al lienzo, no cuesta un repintado más.
      const [tinte, fuerza] = TINTE_BIOMA[bioma];
      const conBioma = mezclar(capa.color, tinte, fuerza);
      const color = mezclar(conBioma, cielo, 0.42 - capa.parallax);
      if (color !== capa.colorTenido) {
        tenir(capa.tenida, capa.tira, color);
        capa.colorTenido = color;
      }

      const anchoCapa = ANCHO_TIRA * escala;
      const altoCapa = ALTO_TIRA * escala;
      const y = Math.round(alto * capa.anclaje - altoCapa - camY * capa.parallax * 0.25 * escala);
      const des = (((-camX * capa.parallax * escala) % anchoCapa) + anchoCapa) % anchoCapa;

      ctx.save();
      ctx.globalAlpha = opacidadBase;
      for (let x = des - anchoCapa; x < ancho; x += anchoCapa) {
        ctx.drawImage(capa.tenida, Math.round(x), y, anchoCapa, altoCapa);
        // Debajo de la tira el mundo sigue: se rellena con el mismo color hasta
        // el borde inferior para que no aparezca una franja de cielo bajo la
        // cordillera cuando la cámara sube.
        if (y + altoCapa < alto) {
          ctx.fillStyle = color;
          ctx.fillRect(Math.round(x), y + altoCapa - 1, Math.ceil(anchoCapa), alto);
        }
      }
      ctx.restore();
    }
  }
}

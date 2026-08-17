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

// --- Siluetas propias de cada bioma -----------------------------------------
//
// Hasta 5.1.0 el fondo era el mismo en todo el mundo y solo cambiaba de color:
// el desierto tenía las montañas del bosque teñidas de ocre. Y teñir no basta.
// Lo que hace que un sitio se lea como otro sitio es la silueta —una duna no
// tiene la forma de un pico nevado— y por eso ahora cada bioma trae la suya.

/** Una pirámide en la arena. Es lo que dice "desierto" desde el otro lado. */
function tiraDesierto(cerca: boolean): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  // Dunas: mucha escala y poca amplitud. Una duna es una loma larga, y con el
  // ruido de las montañas salían crestas puntiagudas de arena.
  const h = perfil(cerca ? 71 : 37, cerca ? 48 : 34, cerca ? 1 / 260 : 1 / 340);
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < ANCHO_TIRA; x++) {
    ctx.fillRect(x, ALTO_TIRA - h[x]!, 1, h[x]!);
  }
  if (cerca) {
    // La pirámide, en la capa cercana para que se vea grande. Un triángulo con
    // la arista central marcada: sin ella se lee como un montículo.
    const base = 190;
    const altura = 118;
    const cx = 300;
    for (let i = 0; i < altura; i++) {
      const ancho = Math.round((base * (altura - i)) / altura);
      ctx.fillRect(cx - ancho / 2, ALTO_TIRA - 24 - i, ancho, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < altura; i++) {
      const ancho = Math.round((base * (altura - i)) / altura);
      ctx.fillRect(cx - ancho / 2, ALTO_TIRA - 24 - i, ancho / 2, 1);
    }
  }
  return c;
}

/**
 * La selva: una pared de árboles altísimos.
 *
 * Mucho más altos que nada del terreno de verdad, y ese es el punto — el fondo
 * de la selva no es un paisaje lejano, es la sensación de estar dentro de algo
 * que te tapa el cielo.
 */
function tiraJungla(cerca: boolean): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  const cuantos = cerca ? 11 : 17;
  ctx.fillStyle = '#ffffff';
  for (let n = 0; n < cuantos; n++) {
    const x = (n / cuantos) * ANCHO_TIRA + hash2(n, cerca ? 5 : 9) * 22;
    const alto = (cerca ? 150 : 108) + hash2(n, 13) * (cerca ? 44 : 40);
    const grosor = cerca ? 9 : 5;
    ctx.fillRect(Math.round(x), ALTO_TIRA - alto, grosor, alto);
    // Copa: tres bolas solapadas en la punta, y un par de brazos a media
    // altura. Es lo que separa un árbol de un poste.
    const cy = ALTO_TIRA - alto + 14;
    for (const [dx, dy, r] of [
      [0, 0, cerca ? 34 : 24],
      [-20, 12, cerca ? 24 : 17],
      [22, 10, cerca ? 26 : 18],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x + grosor / 2 + dx, cy + dy, r, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Y el sotobosque, para que los troncos no floten sobre el cielo.
  const h = perfil(101, 30, 1 / 90);
  for (let x = 0; x < ANCHO_TIRA; x++) ctx.fillRect(x, ALTO_TIRA - h[x]!, 1, h[x]!);
  return c;
}

/** La nieve: un pico enorme, mucho más alto que las montañas del bosque. */
function tiraNieve(cerca: boolean): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  const h = perfil(cerca ? 61 : 23, cerca ? 96 : 74, cerca ? 1 / 150 : 1 / 210);
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < ANCHO_TIRA; x++) ctx.fillRect(x, ALTO_TIRA - h[x]!, 1, h[x]!);

  // El pico: un triángulo agudo que sobresale por encima de todo lo demás. Va
  // en las dos capas, desplazado, para que se vea uno detrás de otro.
  const cx = cerca ? 150 : 380;
  const altura = cerca ? 196 : 168;
  const base = cerca ? 200 : 170;
  for (let i = 0; i < altura; i++) {
    const ancho = Math.round((base * (altura - i)) / altura);
    ctx.fillRect(cx - ancho / 2, ALTO_TIRA - i, ancho, 1);
  }
  return c;
}

/** El mar: casi todo horizonte, con dos islas pequeñas a lo lejos. */
function tiraMar(cerca: boolean): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  ctx.fillStyle = '#ffffff';
  if (cerca) {
    // La lámina de agua: una franja baja y plana. Lo que hace "mar" es
    // justamente que no hay relieve, y por eso el horizonte se ve tan lejos.
    ctx.fillRect(0, ALTO_TIRA - 26, ANCHO_TIRA, 26);
    for (const [x, ancho, alto] of [
      [120, 78, 22],
      [370, 52, 15],
    ] as const) {
      for (let i = 0; i < alto; i++) {
        const w = Math.round((ancho * (alto - i)) / alto) + 8;
        ctx.fillRect(x - w / 2, ALTO_TIRA - 26 - i, w, 1);
      }
    }
    return c;
  }
  const h = perfil(83, 22, 1 / 300);
  for (let x = 0; x < ANCHO_TIRA; x++) ctx.fillRect(x, ALTO_TIRA - h[x]!, 1, h[x]!);
  return c;
}

/**
 * El fondo del inframundo: agujas de roca recortadas contra el resplandor.
 *
 * Es el único fondo que no representa un horizonte lejano sino un techo y unas
 * columnas, porque ahí abajo no hay horizonte: hay una caverna. La capa de
 * lejos son estalactitas colgando —lo que se ve al mirar arriba— y la de cerca,
 * agujas que suben del suelo. Entre las dos queda la franja de resplandor, que
 * es lo que hace que el sitio se lea como iluminado por debajo y no como una
 * cueva cualquiera pintada de naranja.
 */
function tiraInframundo(cerca: boolean): HTMLCanvasElement {
  const c = lienzo(ANCHO_TIRA, ALTO_TIRA);
  const ctx = contexto(c);
  ctx.fillStyle = '#ffffff';

  // Las dos capas son agujas que suben del suelo: las de cerca altas y
  // separadas, las de lejos bajas y apretadas.
  //
  // El primer intento colgaba estalactitas del techo en la capa lejana, que es
  // lo que de verdad se vería mirando arriba en una caverna. No funcionó, y por
  // una razón del motor y no del dibujo: cada capa rellena con su color todo lo
  // que queda por debajo, para que al subir la cámara no asome una franja de
  // cielo bajo las montañas. Una capa anclada arriba inundaba el cuadro entero
  // de color plano y se comía la de abajo. Se puede pelear con eso o aceptar
  // que este fondo son dos filas de agujas, que a esta escala se lee igual.
  const paso = cerca ? 3 : 2;
  const anchoBase = cerca ? 9 : 5;
  const altoBase = cerca ? 14 : 8;
  const rango = cerca ? 78 : 30;
  let x = 0;
  let n = 0;
  while (x < ANCHO_TIRA) {
    const ancho = anchoBase + ((n * 37) % 23);
    const alto = altoBase + ((n * 61) % rango);
    // Triángulo: cada fila hacia arriba es más estrecha. Un perfil regular se
    // lee como una sierra, así que los anchos y las alturas van saltando.
    for (let i = 0; i < alto; i++) {
      const w = Math.max(1, Math.round((ancho * (alto - i)) / alto));
      ctx.fillRect(x + (ancho - w) / 2, ALTO_TIRA - 1 - i, w, 1);
    }
    x += ancho + paso + ((n * 13) % 11);
    n++;
  }
  return c;
}

/** Biomas que el fondo distingue. Es el mismo nombre que usa el generador. */
export type BiomaFondo = 'bosque' | 'desierto' | 'nieve' | 'jungla' | 'mar' | 'inframundo';

/** Cómo es el fondo de cada bioma: silueta, color, altura y separación. */
interface RecetaFondo {
  /** La silueta de cada capa, de lejos a cerca. */
  tira(cerca: boolean): HTMLCanvasElement;
  /** Color de la capa lejana y de la cercana. */
  colores: readonly [string, string];
  /** Dónde se apoya cada capa, en fracción de pantalla. */
  anclajes: readonly [number, number];
  /**
   * Está bajo tierra: ni nubes, ni sol, ni bruma del cielo.
   *
   * Los cinco fondos de arriba son horizontes y se comportan como tales: se
   * apagan de noche, se tiñen del color del cielo con la distancia y llevan
   * nubes pasando. El del inframundo no es un horizonte sino el fondo de una
   * caverna, y aplicarle esas tres reglas daba tres errores a la vez: nubes
   * bajo tierra, un infierno que se desvanecía al anochecer en la superficie
   * —a doscientas filas de distancia— y unas agujas de roca teñidas de azul
   * celeste.
   */
  subterraneo?: boolean;
}

const RECETAS: Record<BiomaFondo, RecetaFondo> = {
  bosque: {
    tira: (cerca) =>
      cerca ? tiraMontanas(29, 120, 1 / 120) : tiraMontanas(11, 92, 1 / 190),
    colores: ['#7d93b5', '#54708f'],
    anclajes: [0.5, 0.62],
  },
  // El desierto no tira a ocre por un tinte: es ocre porque lo que hay al
  // fondo es arena.
  desierto: {
    tira: tiraDesierto,
    colores: ['#d8b978', '#b58f4e'],
    anclajes: [0.58, 0.68],
  },
  jungla: {
    tira: tiraJungla,
    // Verde de verdad, no un azul teñido de verde: la selva es el bioma que
    // más se pedía que se notara, y se nota por el color tanto como por la
    // forma.
    colores: ['#2e7a4e', '#1c5436'],
    anclajes: [0.52, 0.66],
  },
  nieve: {
    tira: tiraNieve,
    colores: ['#cfe0f0', '#9db8d2'],
    // Más alto que los demás: el pico tiene que salirse por arriba.
    anclajes: [0.44, 0.6],
  },
  // Al revés que los demás: aquí la capa de lejos es *más clara* que la de
  // cerca, porque lo que ilumina está abajo y detrás. Con el orden de siempre
  // el techo salía más brillante que las agujas y todo se leía plano.
  inframundo: {
    tira: tiraInframundo,
    colores: ['#6b2a1c', '#341412'],
    anclajes: [0.72, 0.98],
    subterraneo: true,
  },
  mar: {
    tira: tiraMar,
    colores: ['#6f9ec4', '#3f74a3'],
    anclajes: [0.6, 0.72],
  },
};

export class Fondo {
  /**
   * Las capas de cada bioma, generadas la primera vez que se ven.
   *
   * Cinco biomas por dos capas son diez tiras de 512×200. Hacerlas todas al
   * arrancar sería medio megabyte de lienzos y unos milisegundos de más en una
   * pantalla de carga que ya tiene bastante que hacer, y en una partida entera
   * puede que no se pise ni la mitad de los biomas.
   */
  private readonly porBioma = new Map<BiomaFondo, Capa[]>();
  private readonly nubes: HTMLCanvasElement;

  constructor() {
    this.nubes = tiraNubes(53);
  }

  private capasDe(bioma: BiomaFondo): Capa[] {
    let capas = this.porBioma.get(bioma);
    if (capas) return capas;
    const receta = RECETAS[bioma];
    capas = [false, true].map((cerca, i) => ({
      tira: receta.tira(cerca),
      // La lejana casi no se mueve; la cercana, el doble largo.
      parallax: cerca ? 0.14 : 0.06,
      color: receta.colores[i]!,
      anclaje: receta.anclajes[i]!,
      tenida: lienzo(ANCHO_TIRA, ALTO_TIRA),
      colorTenido: '',
    }));
    this.porBioma.set(bioma, capas);
    return capas;
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
    const bajoTierra = RECETAS[bioma].subterraneo === true;
    const luz = reloj.luzSolar / 255;
    // De noche el fondo casi desaparece: las montañas se funden con el cielo,
    // igual que en la realidad. Bajo tierra no: ahí abajo no llega el sol, y lo
    // que ilumina —la lava— alumbra igual a las tres de la tarde que a las
    // tres de la madrugada.
    const opacidadBase = bajoTierra ? 0.9 : 0.25 + luz * 0.55;
    if (opacidadBase < 0.06) return;
    // Y la bruma se mezcla con el color del propio sitio, no con el del cielo:
    // teñir de azul celeste unas agujas de roca a doscientas filas bajo tierra
    // las dejaba de color pizarra.
    const cielo = bajoTierra ? '#1a0805' : colorCss(reloj.colorCielo[1]);

    // --- Nubes ---
    ctx.save();
    ctx.globalAlpha = 0.1 + luz * 0.28;
    const anchoNubes = ANCHO_TIRA * escala;
    // Las nubes van a la deriva por su cuenta, además del parallax: un cielo
    // completamente quieto delata que el mundo está en pausa.
    const desNubes = (((-camX * 0.03 - ms * 0.004) % anchoNubes) + anchoNubes) % anchoNubes;
    const yNubes = Math.round(alto * 0.05 - camY * 0.02 * escala);
    if (!bajoTierra) {
      for (let x = desNubes - anchoNubes; x < ancho; x += anchoNubes) {
        ctx.drawImage(this.nubes, Math.round(x), yNubes, anchoNubes, 120 * escala);
      }
    }
    ctx.restore();

    // --- El fondo del bioma ---
    for (const capa of this.capasDe(bioma)) {
      // La bruma de la distancia: cuanto más lejos está la capa, más se mezcla
      // su color con el del cielo. Es niebla atmosférica sin niebla de verdad.
      // El color ya viene del bioma: aquí solo se le echa la distancia encima.
      const color = mezclar(capa.color, cielo, 0.42 - capa.parallax);
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

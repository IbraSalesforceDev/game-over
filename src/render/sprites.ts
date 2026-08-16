import {
  bloque,
  contexto,
  contornear,
  elipse,
  lienzo,
  mezclar,
  px,
  tono,
  type Tono,
} from './pixel';

/**
 * Sprites del personaje y de los enemigos, generados por código al arrancar.
 *
 * Se dibujan una sola vez a resolución 1:1 en un atlas fuera de pantalla y de
 * ahí se copian ampliados con el suavizado apagado. Dibujarlos directamente al
 * zoom de la cámara sería repetir decenas de `fillRect` por bicho y por frame, y
 * además las piezas quedarían a medio píxel y el sprite temblaría al moverse.
 *
 * La animación no es un adorno: un cuadrado que se desliza por el suelo se lee
 * como una caja de colisión, y el mismo cuadrado con las piernas moviéndose se
 * lee como alguien andando. El ciclo de paso es lo que más cambia la sensación
 * del juego por línea de código escrita.
 */

/** Lado del que mira el sprite tal y como se dibuja en el atlas. */
export type Pose = 'quieto' | 'andar' | 'saltar' | 'caer' | 'nadar';

/** Frames de cada pose. El ciclo de paso es de ocho para que no se note el bucle. */
const FRAMES: Record<Pose, number> = {
  quieto: 2,
  andar: 8,
  saltar: 1,
  caer: 1,
  nadar: 4,
};

const POSES: Pose[] = ['quieto', 'andar', 'saltar', 'caer', 'nadar'];
const MAX_FRAMES = 8;

/** Tamaño de la celda del atlas del jugador. Mayor que su caja: pelo y brazos. */
export const JUGADOR_W = 26;
export const JUGADOR_H = 46;
/** Desplazamiento del sprite respecto a la esquina de la caja física. */
export const JUGADOR_OFF_X = -3;
export const JUGADOR_OFF_Y = -4;

const PIEL = tono('#e9c9a2', 22, 40);
const PELO = tono('#7a4a24', 26, 30);
const CAMISA = tono('#3f6f9a', 30, 38);
const PANTALON = tono('#39445e', 26, 26);
const BOTA = tono('#5c4028', 24, 22);
const OJO = '#f2f6fb';
const PUPILA = '#1b2430';

/**
 * Un cuerpo humanoide completo, con las extremidades donde le digan.
 *
 * El jugador y el zombi comparten esta función porque comparten esqueleto:
 * cambian los colores, la postura de los brazos y poco más. Tener dos copias
 * habría significado arreglar cada ajuste de proporciones dos veces.
 */
interface Humanoide {
  piel: Tono;
  pelo: Tono;
  camisa: Tono;
  pantalon: Tono;
  bota: Tono;
  /**
   * Zancada de cada pierna: positivo adelanta el pie, negativo lo retrasa.
   *
   * Al adelantarse el pie la pierna también se acorta, porque una pierna
   * extendida en diagonal se ve más corta desde el lado. Es lo que evita que el
   * personaje parezca deslizarse con las piernas rígidas.
   */
  piernaDelantera: number;
  piernaTrasera: number;
  /** Desplazamiento vertical y horizontal de cada brazo. */
  brazoDelantero: [number, number];
  brazoTrasero: [number, number];
  /** Sube o baja todo el torso: es el rebote del paso y la respiración. */
  bob: number;
  /** Ojos cerrados (zombi) o abiertos. */
  mirada: 'normal' | 'muerta';
  /** Melena larga por detrás. */
  melena: boolean;
}

/**
 * Versión "al fondo" de un tono.
 *
 * Es el truco que más hace por la lectura del personaje: el brazo y la pierna
 * de atrás se pintan más oscuros y saturados que los de delante. Sin eso, las
 * cuatro extremidades son del mismo color, se funden con el torso y el sprite
 * parece un muñeco recortado de cartulina; con eso, el ojo separa solo los dos
 * planos y el ciclo de paso se entiende.
 */
function atras(t: Tono): Tono {
  return {
    claro: mezclar(t.claro, '#101826', 0.42),
    base: mezclar(t.base, '#101826', 0.42),
    oscuro: mezclar(t.oscuro, '#101826', 0.42),
  };
}

function dibujarHumanoide(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  h: Humanoide,
): void {
  const y = oy + h.bob;
  const cx = ox + 13;
  const camisaAtras = atras(h.camisa);
  const pantalonAtras = atras(h.pantalon);
  const botaAtras = atras(h.bota);
  const pielAtras = atras(h.piel);

  /** Una pierna completa: muslo, pantorrilla y bota. */
  const pierna = (dx: number, dy: number, delante: boolean): void => {
    const t = delante ? h.pantalon : pantalonAtras;
    const b = delante ? h.bota : botaAtras;
    const px0 = cx + dx;
    // Todo en enteros: con medios píxeles, el bloque y su brillo redondean cada
    // uno por su lado y queda una raya suelta bajo la bota.
    const acorta = Math.round(Math.abs(dy) * 0.5);
    const py = y + 27 + acorta;
    const alto = 11 - acorta;
    bloque(ctx, px0, py, 5, alto, t);
    // La bota se adelanta o se retrasa con la zancada, y siempre acaba a la
    // misma altura: es lo que hace que el paso parezca un paso y no un salto
    // en el sitio.
    bloque(ctx, px0 + dy, py + alto - 1, 6, 4, b);
  };

  /** Un brazo: manga y mano. */
  const brazo = (dx: number, dy: number, delante: boolean): void => {
    const t = delante ? h.camisa : camisaAtras;
    const piel = delante ? h.piel : pielAtras;
    const px0 = cx + dx;
    const py = y + 16 + dy;
    bloque(ctx, px0, py, 4, 9, t);
    // Puño más oscuro: separa la manga de la mano sin dibujar un dedo.
    px(ctx, px0, py + 8, 4, 1, t.oscuro);
    bloque(ctx, px0, py + 9, 4, 4, piel);
  };

  // --- Plano de atrás ---
  const [btY, btX] = h.brazoTrasero;
  brazo(-8 + btX, btY, false);
  pierna(-5, h.piernaTrasera, false);

  // --- Piernas y torso ---
  pierna(0, h.piernaDelantera, true);

  bloque(ctx, cx - 6, y + 14, 13, 14, h.camisa);
  // Costado en sombra: un torso plano de trece píxeles de ancho se ve como un
  // cartel, y esta franja le da la vuelta al pecho.
  px(ctx, cx + 4, y + 15, 3, 12, mezclar(h.camisa.base, h.camisa.oscuro, 0.6));
  // Cuello: dos píxeles de piel en sombra bajo la barbilla. Sin esto la cabeza
  // se apoya directamente en la camisa y parece atornillada.
  px(ctx, cx - 3, y + 13, 6, 2, h.piel.oscuro);
  // Cinturón, con hebilla.
  px(ctx, cx - 6, y + 26, 13, 2, h.pantalon.oscuro);
  px(ctx, cx - 1, y + 26, 3, 2, '#c8a44a');

  // --- Cabeza ---
  bloque(ctx, cx - 7, y + 1, 14, 13, h.piel);
  // Mandíbula algo más estrecha: la cara deja de ser un cuadrado.
  px(ctx, cx - 7, y + 12, 2, 2, 'rgba(0,0,0,0)');
  px(ctx, cx + 5, y + 12, 2, 2, 'rgba(0,0,0,0)');
  ctx.clearRect(cx - 7, y + 12, 2, 2);
  ctx.clearRect(cx + 5, y + 12, 2, 2);
  // Sombra del flequillo sobre la frente.
  px(ctx, cx - 6, y + 6, 12, 1, h.piel.oscuro);
  // Mejilla iluminada del lado que mira.
  px(ctx, cx + 3, y + 8, 2, 3, h.piel.claro);

  if (h.mirada === 'normal') {
    // Dos ojos, el de delante mayor: da la vuelta a la cara sin dibujar nariz.
    px(ctx, cx, y + 7, 4, 4, OJO);
    px(ctx, cx + 2, y + 8, 2, 2, PUPILA);
    px(ctx, cx - 5, y + 7, 3, 4, OJO);
    px(ctx, cx - 4, y + 8, 2, 2, PUPILA);
    // Ceja: una línea sobre cada ojo, y el personaje deja de parecer inerte.
    px(ctx, cx - 1, y + 6, 4, 1, h.pelo.oscuro);
  } else {
    px(ctx, cx, y + 8, 4, 2, '#2b3a24');
    px(ctx, cx - 5, y + 8, 3, 2, '#2b3a24');
    px(ctx, cx - 1, y + 11, 5, 1, '#3a2a1c');
  }

  // --- Pelo, por encima de la cabeza ---
  bloque(ctx, cx - 8, y - 1, 16, 7, h.pelo);
  px(ctx, cx - 8, y + 5, 3, 7, h.pelo.base); // patilla del lado en sombra
  px(ctx, cx + 6, y + 5, 2, 4, h.pelo.base);
  // Flequillo en pico sobre la frente.
  px(ctx, cx + 1, y + 5, 5, 2, h.pelo.base);
  if (h.melena) bloque(ctx, cx - 10, y + 3, 3, 13, h.pelo);
  // Brillo del pelo: sin él la mata se ve como un casco de plástico.
  px(ctx, cx - 5, y, 7, 1, h.pelo.claro);
  px(ctx, cx - 6, y + 1, 3, 1, h.pelo.claro);

  // --- Plano de delante ---
  // El brazo asoma un par de píxeles por fuera del torso: metido del todo se
  // lee como un pliegue de la camisa, no como un brazo.
  const [bdY, bdX] = h.brazoDelantero;
  brazo(5 + bdX, bdY, true);
}

/** Postura del humanoide para una pose y un frame concretos. */
function posturaJugador(pose: Pose, f: number): Partial<Humanoide> {
  switch (pose) {
    case 'andar': {
      // Ciclo de ocho: las piernas van en oposición de fase y los brazos
      // acompañan al contrario, como al andar de verdad.
      const t = (f / FRAMES.andar) * Math.PI * 2;
      const swing = Math.round(Math.sin(t) * 4);
      return {
        piernaDelantera: swing,
        piernaTrasera: -swing,
        // Los brazos van al contrario que su pierna, como al andar de verdad.
        brazoDelantero: [-Math.round(swing * 0.6), Math.round(swing * 0.4)],
        brazoTrasero: [Math.round(swing * 0.6), Math.round(-swing * 0.4)],
        // Dos rebotes por ciclo: uno por cada pisada. El cuerpo sube cuando la
        // zancada está abierta y baja al pasar por el centro.
        bob: Math.abs(swing) > 2 ? 0 : 1,
      };
    }
    case 'saltar':
      // Piernas recogidas y brazos arriba: la silueta dice "subiendo" aunque
      // esté congelada.
      return {
        piernaDelantera: 3,
        piernaTrasera: -2,
        brazoDelantero: [-5, 1],
        brazoTrasero: [-4, -1],
        bob: 0,
      };
    case 'caer':
      return {
        piernaDelantera: -3,
        piernaTrasera: 2,
        brazoDelantero: [-1, 3],
        brazoTrasero: [2, -3],
        bob: 0,
      };
    case 'nadar': {
      // Brazadas alternas y patada de tijera.
      const t = (f / FRAMES.nadar) * Math.PI * 2;
      const brazo = Math.round(Math.sin(t) * 4);
      return {
        piernaDelantera: Math.round(Math.cos(t) * 4),
        piernaTrasera: Math.round(-Math.cos(t) * 4),
        brazoDelantero: [-brazo, 1],
        brazoTrasero: [brazo, -1],
        bob: 0,
      };
    }
    default:
      // Respiración: un píxel arriba y abajo, lentísimo. Un sprite del todo
      // inmóvil parece una imagen pegada en la pantalla.
      return {
        piernaDelantera: 0,
        piernaTrasera: 0,
        brazoDelantero: [0, 0],
        brazoTrasero: [0, 0],
        bob: f === 0 ? 0 : 1,
      };
  }
}

function atlasJugador(): HTMLCanvasElement {
  const c = lienzo(JUGADOR_W * MAX_FRAMES, JUGADOR_H * POSES.length);
  const ctx = contexto(c);

  POSES.forEach((pose, fila) => {
    for (let f = 0; f < FRAMES[pose]; f++) {
      const ox = f * JUGADOR_W;
      const oy = fila * JUGADOR_H;
      dibujarHumanoide(ctx, ox, oy, {
        piel: PIEL,
        pelo: PELO,
        camisa: CAMISA,
        pantalon: PANTALON,
        bota: BOTA,
        mirada: 'normal',
        melena: false,
        piernaDelantera: 0,
        piernaTrasera: 0,
        brazoDelantero: [0, 0],
        brazoTrasero: [0, 0],
        bob: 0,
        ...posturaJugador(pose, f),
      });
      contornear(ctx, ox, oy, JUGADOR_W, JUGADOR_H);
    }
  });

  return c;
}

// --- Enemigos ---------------------------------------------------------------

export type EspecieSprite =
  | 'slime'
  | 'zombi'
  | 'murcielago'
  | 'escarabajo'
  | 'lobo'
  | 'conejo'
  | 'jabali'
  | 'esqueleto'
  | 'serpiente'
  | 'momia'
  | 'gallina'
  | 'guardian';

interface Molde {
  ancho: number;
  alto: number;
  frames: number;
  /** Desplazamiento del sprite respecto a la caja física del enemigo. */
  offX: number;
  offY: number;
  pintar(ctx: CanvasRenderingContext2D, ox: number, oy: number, f: number): void;
}

const GEL = tono('#5aa9d6', 40, 45);
const GEL_NUCLEO = '#9fe3f5';

const MOLDES: Record<EspecieSprite, Molde> = {
  slime: {
    ancho: 28,
    alto: 22,
    frames: 6,
    offX: -3,
    offY: -6,
    pintar(ctx, ox, oy, f) {
      // Aplastarse y estirarse: es lo único que necesita un slime para parecer
      // gelatina en vez de una piedra azul.
      const t = (f / 6) * Math.PI * 2;
      const squash = Math.sin(t) * 1.6;
      const rx = 11 + squash;
      const ry = 7.5 - squash;
      const cx = ox + 14;
      const cy = oy + 21 - ry;

      elipse(ctx, cx, cy, rx, ry, GEL.base);
      elipse(ctx, cx, cy + 1.5, rx - 1, ry - 1.5, GEL.oscuro);
      elipse(ctx, cx, cy - 0.5, rx - 1.5, ry - 1.5, GEL.base);
      // Brillo especular arriba a la izquierda: lo que hace que se lea como
      // algo húmedo y translúcido.
      elipse(ctx, cx - rx * 0.4, cy - ry * 0.45, rx * 0.3, ry * 0.26, GEL.claro);
      // Núcleo: en Terraria los slimes llevan algo dentro, y ese detalle es la
      // mitad de su personalidad.
      elipse(ctx, cx + 1, cy + ry * 0.25, 2.5, 2, GEL_NUCLEO);

      for (const dx of [-4, 3]) {
        px(ctx, cx + dx, cy - 2, 3, 3, '#0f1a22');
        px(ctx, cx + dx, cy - 2, 1, 1, '#ffffff');
      }
      // Boca: una línea corta, sin más.
      px(ctx, cx - 1, cy + 2, 4, 1, '#0f1a22');
    },
  },

  zombi: {
    ancho: JUGADOR_W,
    alto: JUGADOR_H,
    frames: 8,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const t = (f / 8) * Math.PI * 2;
      const swing = Math.round(Math.sin(t) * 3);
      dibujarHumanoide(ctx, ox, oy, {
        piel: tono('#7f9a58', 20, 34),
        pelo: tono('#3c4a2a', 18, 20),
        camisa: tono('#5c5442', 20, 30),
        pantalon: tono('#3a3830', 18, 22),
        bota: tono('#2e2a22', 16, 16),
        mirada: 'muerta',
        melena: false,
        // Los dos brazos por delante y quietos: es la pose que dice "zombi"
        // sin necesidad de escribirlo en ningún sitio.
        brazoDelantero: [-6, 3],
        brazoTrasero: [-5, 4],
        piernaDelantera: swing,
        piernaTrasera: -swing,
        bob: Math.abs(swing) > 2 ? 0 : 1,
      });
    },
  },

  murcielago: {
    ancho: 30,
    alto: 20,
    frames: 4,
    offX: -6,
    offY: -3,
    pintar(ctx, ox, oy, f) {
      const cuerpo = tono('#6b4a6b', 26, 30);
      const ala = tono('#4e364e', 22, 24);
      const cx = ox + 15;
      const cy = oy + 10;
      // Aleteo: las alas suben y bajan y además se acortan al subir, que es lo
      // que da la sensación de que baten y no de que giran.
      const bat = [0, -4, 0, 4][f]!;
      const largo = 9 - Math.abs(bat) * 0.5;

      for (const lado of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const x = cx + lado * (3 + i * (largo / 3));
          const alto = 6 - i * 1.4;
          const y = cy - alto / 2 + (bat * (i + 1)) / 3;
          px(ctx, lado < 0 ? x - largo / 3 : x, y, largo / 3 + 1, alto, ala.base);
        }
        px(ctx, cx + lado * 3 - (lado < 0 ? 3 : 0), cy - 3 + bat / 3, 3, 1, ala.claro);
      }

      elipse(ctx, cx, cy, 5, 4.5, cuerpo.base);
      elipse(ctx, cx - 1, cy - 1, 3.5, 3, cuerpo.claro);
      // Orejas.
      px(ctx, cx - 4, cy - 7, 2, 4, cuerpo.oscuro);
      px(ctx, cx + 2, cy - 7, 2, 4, cuerpo.oscuro);
      for (const dx of [-3, 1]) {
        px(ctx, cx + dx, cy - 2, 2, 2, '#ffd24a');
        px(ctx, cx + dx, cy - 2, 1, 1, '#fff6c8');
      }
      // Colmillos.
      px(ctx, cx - 1, cy + 2, 1, 2, '#f4f1e6');
      px(ctx, cx + 1, cy + 2, 1, 2, '#f4f1e6');
    },
  },

  escarabajo: {
    ancho: 28,
    alto: 22,
    frames: 6,
    offX: -3,
    offY: -6,
    pintar(ctx, ox, oy, f) {
      const caparazon = tono('#b3903f', 30, 40);
      const patas = tono('#5f4a1c', 18, 20);
      const cx = ox + 14;
      const cy = oy + 14;

      // Seis patas en dos grupos alternos: el trípode que usan los insectos de
      // verdad, y sale casi gratis alternando por frame.
      const fase = f % 2 === 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) {
        const dx = -7 + i * 6;
        const alt = i % 2 === 0 ? fase : -fase;
        px(ctx, cx + dx, cy + 4, 2, 4 + alt, patas.base);
        px(ctx, cx + dx - 1, cy + 7 + alt, 3, 1, patas.oscuro);
      }

      elipse(ctx, cx, cy, 10, 6.5, caparazon.base);
      elipse(ctx, cx - 1, cy - 1.5, 8, 4, caparazon.claro);
      // Línea de partición de los élitros y tres bandas: sin ellas el caparazón
      // es un huevo naranja.
      px(ctx, cx, cy - 6, 1, 12, caparazon.oscuro);
      for (const dx of [-6, -2, 2]) px(ctx, cx + dx, cy - 4, 1, 8, caparazon.oscuro);

      // Cabeza y mandíbulas, mirando a la derecha.
      elipse(ctx, cx + 9, cy, 3.5, 3.5, patas.base);
      px(ctx, cx + 11, cy - 3, 3, 1, patas.oscuro);
      px(ctx, cx + 11, cy + 2, 3, 1, patas.oscuro);
      px(ctx, cx + 9, cy - 1, 2, 2, '#ffcf5a');
    },
  },

  conejo: {
    ancho: 22,
    alto: 20,
    frames: 6,
    offX: -3,
    offY: -6,
    pintar(ctx, ox, oy, f) {
      const pelo = tono('#c9b79c', 24, 34);
      const cx = ox + 11;
      const cy = oy + 13;
      // El conejo se recoge y se estira: no anda, da saltos, y el sprite tiene
      // que contarlo aunque la física ya lo haga.
      const t = (f / 6) * Math.PI * 2;
      const salto = Math.sin(t);
      const rx = 6 + salto * 0.8;
      const ry = 4.5 - salto * 0.6;

      // Patas traseras, largas y por detrás.
      px(ctx, cx - 6, cy + 2 - salto, 4, 4, pelo.oscuro);
      px(ctx, cx + 2, cy + 3, 3, 3, pelo.base);

      elipse(ctx, cx, cy, rx, ry, pelo.base);
      elipse(ctx, cx - 1, cy - 1, rx - 2, ry - 1.5, pelo.claro);
      // Cola: una bolita blanca detrás, que es lo que hace que se lea conejo.
      elipse(ctx, cx - rx, cy - 1, 2, 2, '#f4efe6');

      // Cabeza y orejas.
      elipse(ctx, cx + 5, cy - 3, 3.5, 3, pelo.base);
      px(ctx, cx + 3, cy - 10, 2, 6, pelo.base);
      px(ctx, cx + 6, cy - 11, 2, 7, pelo.claro);
      px(ctx, cx + 7, cy - 3, 2, 2, '#3a2a24');
      px(ctx, cx + 8, cy - 1, 1, 1, '#e6a8a8');
    },
  },

  jabali: {
    ancho: 34,
    alto: 26,
    frames: 6,
    offX: -3,
    offY: -6,
    pintar(ctx, ox, oy, f) {
      const pelo = tono('#6b5344', 22, 28);
      const cerda = tono('#3a2c24', 18, 18);
      const cx = ox + 17;
      const cy = oy + 14;
      const t = (f / 6) * Math.PI * 2;
      const paso = Math.round(Math.sin(t) * 2);

      for (const [dx, fase] of [
        [-9, 1],
        [-6, -1],
        [4, -1],
        [7, 1],
      ] as const) {
        const off = paso * fase;
        px(ctx, cx + dx, cy + 5, 3, 6 - Math.abs(off) * 0.5, cerda.base);
        px(ctx, cx + dx - 1, cy + 10 - Math.abs(off) * 0.5, 4, 2, cerda.oscuro);
      }

      elipse(ctx, cx - 1, cy, 12, 7, pelo.base);
      elipse(ctx, cx - 2, cy - 1.5, 9, 4.5, pelo.claro);
      // Crin de cerdas erizadas por el lomo.
      for (let i = -8; i <= 4; i += 2) px(ctx, cx + i, cy - 9, 1, 3, cerda.base);
      // Cabeza baja y hocico, que es la silueta del jabalí.
      elipse(ctx, cx + 10, cy + 1, 5, 5, pelo.base);
      px(ctx, cx + 14, cy + 2, 4, 4, pelo.claro);
      px(ctx, cx + 17, cy + 3, 1, 2, '#2a1f1a');
      // Colmillos hacia arriba.
      px(ctx, cx + 15, cy, 1, 3, '#f0ead8');
      px(ctx, cx + 13, cy - 1, 1, 2, '#f0ead8');
      px(ctx, cx + 11, cy - 2, 2, 2, '#2a1f1a');
      // Rabito.
      px(ctx, cx - 13, cy - 3, 3, 2, pelo.oscuro);
    },
  },

  // Reutiliza el humanoide: cambian los colores y la postura, y encima se le
  // pintan las costillas y las cuencas por delante. Que comparta esqueleto con
  // el jugador es lo que hace que el ciclo de paso ya esté resuelto.
  esqueleto: {
    ancho: JUGADOR_W,
    alto: JUGADOR_H,
    frames: 8,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const t = (f / 8) * Math.PI * 2;
      const swing = Math.round(Math.sin(t) * 4);
      const hueso = tono('#ddd8c4', 16, 40);
      dibujarHumanoide(ctx, ox, oy, {
        piel: hueso,
        pelo: hueso,
        camisa: hueso,
        pantalon: hueso,
        bota: tono('#b9b2a0', 14, 30),
        mirada: 'muerta',
        melena: false,
        brazoDelantero: [-4, 2],
        brazoTrasero: [-3, 3],
        piernaDelantera: swing,
        piernaTrasera: -swing,
        bob: 0,
      });
      // Costillas y cuencas, encima del humanoide ya pintado: son las dos cosas
      // que separan un esqueleto de un hombre pálido.
      const cx = ox + 13;
      for (let i = 0; i < 4; i++) px(ctx, cx - 5, oy + 16 + i * 3, 11, 1, '#8d8877');
      px(ctx, cx - 1, oy + 15, 2, 12, '#a8a292');
      px(ctx, cx, oy + 7, 4, 4, '#14181c');
      px(ctx, cx - 5, oy + 7, 3, 4, '#14181c');
      // Dientes: dos rayas verticales sobre la mandíbula.
      px(ctx, cx - 2, oy + 11, 6, 2, '#f2eddd');
      px(ctx, cx, oy + 11, 1, 2, '#8d8877');
      px(ctx, cx + 2, oy + 11, 1, 2, '#8d8877');
    },
  },

  momia: {
    ancho: JUGADOR_W,
    alto: JUGADOR_H,
    frames: 8,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const t = (f / 8) * Math.PI * 2;
      // Arrastra los pies: la zancada es la mitad que la de los demás, y eso ya
      // se ve como "esta cosa va lenta" sin cambiar nada de la física.
      const swing = Math.round(Math.sin(t) * 2);
      const venda = tono('#cfc3a4', 18, 34);
      dibujarHumanoide(ctx, ox, oy, {
        piel: venda,
        pelo: venda,
        camisa: venda,
        pantalon: venda,
        bota: tono('#a89a7c', 16, 26),
        mirada: 'muerta',
        melena: false,
        // Los dos brazos estirados al frente, la pose de momia de toda la vida.
        brazoDelantero: [-8, 4],
        brazoTrasero: [-7, 5],
        piernaDelantera: swing,
        piernaTrasera: -swing,
        bob: 1,
      });
      // Vendas: rayas en diagonal por el torso y las piernas. Van por encima,
      // en el tono oscuro del propio vendaje, para que se lean como surcos.
      const cx = ox + 13;
      for (let i = 0; i < 5; i++) {
        px(ctx, cx - 6 + (i % 2), oy + 16 + i * 3, 12, 1, venda.oscuro);
      }
      px(ctx, cx - 5, oy + 29, 10, 1, venda.oscuro);
      px(ctx, cx - 5, oy + 34, 10, 1, venda.oscuro);
      // Una tira suelta colgando del brazo: el detalle que la hace momia y no
      // un zombi beige.
      px(ctx, cx + 8, oy + 26, 2, 6, venda.claro);
      // Cuencas vacías, más hundidas que las del esqueleto.
      px(ctx, cx, oy + 7, 4, 3, '#2a2318');
      px(ctx, cx - 5, oy + 7, 3, 3, '#2a2318');
    },
  },

  serpiente: {
    ancho: 32,
    alto: 14,
    frames: 6,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const piel = tono('#b8a04a', 26, 38);
      const banda = tono('#6d5c22', 18, 20);
      const cy = oy + 10;
      const t = (f / 6) * Math.PI * 2;
      // El cuerpo es una onda: cada segmento sube y baja con un desfase, y eso
      // es todo lo que hace falta para que repte en vez de deslizarse.
      for (let i = 0; i < 9; i++) {
        const x = ox + 2 + i * 3;
        const y = cy + Math.round(Math.sin(t + i * 0.8) * 2);
        const alto = i < 6 ? 4 : 3;
        px(ctx, x, y - alto / 2, 3, alto, piel.base);
        px(ctx, x, y - alto / 2, 3, 1, piel.claro);
        if (i % 2 === 0) px(ctx, x, y, 3, 1, banda.base);
      }
      // Cabeza triangular, mirando a la derecha.
      const yc = cy + Math.round(Math.sin(t) * 2);
      px(ctx, ox + 26, yc - 3, 5, 6, piel.base);
      px(ctx, ox + 26, yc - 3, 5, 1, piel.claro);
      px(ctx, ox + 31, yc - 1, 1, 3, piel.oscuro);
      px(ctx, ox + 29, yc - 2, 2, 2, '#e2402c');
      // Lengua bífida, sacada solo en la mitad del ciclo.
      if (f % 3 === 0) {
        px(ctx, ox + 32, yc, 3, 1, '#e2402c');
        px(ctx, ox + 34, yc - 1, 1, 1, '#e2402c');
        px(ctx, ox + 34, yc + 1, 1, 1, '#e2402c');
      }
    },
  },

  gallina: {
    ancho: 20,
    alto: 18,
    frames: 6,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const pluma = tono('#f0ece0', 12, 26);
      const cx = ox + 10;
      const cy = oy + 11;
      const t = (f / 6) * Math.PI * 2;
      const paso = Math.round(Math.sin(t) * 2);

      // Patas finas y amarillas, alternando.
      for (const [dx, fase] of [
        [-2, 1],
        [3, -1],
      ] as const) {
        const off = paso * fase;
        px(ctx, cx + dx, cy + 3, 1, 4 - Math.abs(off) * 0.5, '#d8a02c');
        px(ctx, cx + dx - 1, cy + 6 - Math.abs(off) * 0.5, 3, 1, '#d8a02c');
      }

      elipse(ctx, cx, cy, 6, 5, pluma.base);
      elipse(ctx, cx - 1, cy - 1, 4.5, 3.5, pluma.claro);
      // Ala pegada al costado: un óvalo algo más oscuro rompe la mancha blanca.
      elipse(ctx, cx - 1, cy + 1, 3, 2.2, pluma.oscuro);
      // Cola en abanico, tres plumas hacia atrás y arriba.
      for (let i = 0; i < 3; i++) px(ctx, cx - 8 - i, cy - 2 - i, 3, 2, pluma.base);

      // Cabeza, cresta, pico y barbilla: sin la cresta roja es una paloma.
      elipse(ctx, cx + 5, cy - 5, 3, 3, pluma.base);
      px(ctx, cx + 4, cy - 9, 2, 2, '#d63b3b');
      px(ctx, cx + 6, cy - 10, 2, 2, '#d63b3b');
      px(ctx, cx + 8, cy - 5, 3, 2, '#e8a12c');
      px(ctx, cx + 6, cy - 2, 2, 2, '#d63b3b');
      px(ctx, cx + 6, cy - 6, 1, 1, '#20242a');
    },
  },

  /**
   * El guardián: una máscara flotante con dos hombreras sueltas orbitándola.
   *
   * Que las piezas no se toquen es todo el truco. Un jefe con brazos pegados
   * al cuerpo se lee como un enemigo grande; uno cuyas placas flotan aparte se
   * lee como algo que no debería estar vivo, que es exactamente lo que hace
   * falta a doscientos tiles bajo tierra. El ojo es lo único que no se mueve:
   * es el punto al que mira quien pelea.
   */
  guardian: {
    ancho: 70,
    alto: 70,
    frames: 8,
    offX: -5,
    offY: -5,
    pintar(ctx, ox, oy, f) {
      // Paleta clara a propósito. La pelea ocurre a doscientos tiles bajo
      // tierra, en una sala de ladrillo gris oscuro y con la luz de dos
      // antorchas: con el morado apagado que pedía el personaje, el jefe se
      // fundía con la pared y lo único que se veía era su aura. Un jefe al que
      // hay que adivinar dónde está no es difícil, es injusto.
      const piedra = tono('#9c86d8', 30, 40);
      const oscuro = tono('#5a4890', 24, 28);
      const oro = tono('#f0cc66', 30, 44);
      const cx = ox + 35;
      const cy = oy + 35;
      const t = (f / 8) * Math.PI * 2;
      const flota = Math.round(Math.sin(t) * 3);
      // Las placas orbitan en contrafase: cuando la máscara sube, ellas bajan.
      const orbita = Math.round(Math.cos(t) * 4);

      // Aura: un halo que separa al jefe del ladrillo del fondo. Dos capas,
      // porque una sola con poca opacidad se pierde y con mucha tapa el sprite.
      ctx.globalAlpha = 0.2;
      elipse(ctx, cx, cy + flota, 33, 33, '#a37ef0');
      ctx.globalAlpha = 0.26;
      elipse(ctx, cx, cy + flota, 24, 24, '#c0a0ff');
      ctx.globalAlpha = 1;

      // Las dos hombreras, con su borde dorado.
      for (const lado of [-1, 1]) {
        const px0 = cx + lado * 26 - 5;
        const py0 = cy - 8 + lado * orbita;
        bloque(ctx, px0, py0, 11, 17, oscuro);
        px(ctx, px0, py0, 11, 3, oro.base);
        px(ctx, px0 + (lado < 0 ? 0 : 8), py0 + 3, 3, 14, piedra.claro);
      }

      // Cuerpo: un rombo de piedra con la cara plana hacia delante.
      const by = cy + flota;
      for (let i = -19; i <= 19; i++) {
        const ancho = 20 - Math.abs(i);
        if (ancho <= 0) continue;
        px(ctx, cx - ancho, by + i, ancho * 2, 1, i < 0 ? piedra.claro : piedra.base);
      }
      // Grietas: dos líneas oscuras que rompen la superficie lisa.
      px(ctx, cx - 8, by - 11, 1, 9, oscuro.oscuro);
      px(ctx, cx + 7, by + 3, 1, 11, oscuro.oscuro);
      // Cinturón dorado a media altura.
      px(ctx, cx - 16, by - 1, 32, 3, oro.base);
      px(ctx, cx - 16, by - 1, 32, 1, oro.claro);

      // Cuernos: lo que convierte el rombo en una cabeza.
      for (const lado of [-1, 1]) {
        for (let i = 0; i < 7; i++) {
          px(ctx, cx + lado * (9 + i), by - 12 - i, 2, 2, oscuro.base);
        }
      }

      // El ojo. Late despacio y es lo único brillante del sprite.
      const latido = 4 + Math.abs(Math.sin(t)) * 1.8;
      elipse(ctx, cx, by - 6, 8, 5.5, '#1a1026');
      elipse(ctx, cx, by - 6, latido, latido * 0.7, '#ffd66b');
      elipse(ctx, cx, by - 6, latido * 0.5, latido * 0.4, '#fff6d8');
    },
  },

  lobo: {
    ancho: 32,
    alto: 26,
    frames: 6,
    offX: -3,
    offY: -4,
    pintar(ctx, ox, oy, f) {
      const pelo = tono('#c3d8e8', 22, 46);
      const oscuro = tono('#8fabc2', 20, 40);
      const cx = ox + 16;
      const cy = oy + 13;
      const t = (f / 6) * Math.PI * 2;
      const paso = Math.round(Math.sin(t) * 3);

      // Cuatro patas en diagonal, como corre un cuadrúpedo.
      for (const [dx, fase] of [
        [-8, 1],
        [-5, -1],
        [4, -1],
        [7, 1],
      ] as const) {
        const off = paso * fase;
        px(ctx, cx + dx, cy + 4, 3, 7 - Math.abs(off) * 0.4, oscuro.base);
        px(ctx, cx + dx - 1, cy + 10 - Math.abs(off) * 0.4, 4, 2, oscuro.oscuro);
      }

      // Cola, siempre en alto.
      px(ctx, cx - 13, cy - 5, 5, 3, pelo.base);
      px(ctx, cx - 15, cy - 8, 4, 4, pelo.claro);

      elipse(ctx, cx - 1, cy, 11, 6, pelo.base);
      elipse(ctx, cx - 2, cy - 1.5, 9, 4, pelo.claro);
      // Lomo más oscuro: separa el bicho del fondo nevado, que es su problema.
      px(ctx, cx - 9, cy - 6, 16, 2, oscuro.base);

      // Cabeza, hocico y orejas.
      elipse(ctx, cx + 10, cy - 3, 5, 4.5, pelo.base);
      px(ctx, cx + 13, cy - 2, 6, 4, pelo.claro);
      px(ctx, cx + 18, cy - 1, 2, 2, '#1b2430');
      px(ctx, cx + 7, cy - 10, 3, 5, oscuro.base);
      px(ctx, cx + 12, cy - 10, 3, 5, oscuro.base);
      px(ctx, cx + 11, cy - 4, 3, 2, '#e8f2fa');
      px(ctx, cx + 12, cy - 3, 2, 2, '#3a5a72');
      // Dientes.
      px(ctx, cx + 14, cy + 1, 1, 2, '#ffffff');
      px(ctx, cx + 16, cy + 1, 1, 2, '#ffffff');
    },
  },
};

function atlasEnemigo(molde: Molde): HTMLCanvasElement {
  const c = lienzo(molde.ancho * molde.frames, molde.alto);
  const ctx = contexto(c);
  for (let f = 0; f < molde.frames; f++) {
    const ox = f * molde.ancho;
    molde.pintar(ctx, ox, 0, f);
    contornear(ctx, ox, 0, molde.ancho, molde.alto);
  }
  return c;
}

export interface Sprites {
  /** Pinta al jugador. `mirando` -1 voltea el sprite. */
  jugador(
    ctx: CanvasRenderingContext2D,
    pose: Pose,
    frame: number,
    mirando: 1 | -1,
    sx: number,
    sy: number,
    escala: number,
  ): void;
  enemigo(
    ctx: CanvasRenderingContext2D,
    especie: EspecieSprite,
    frame: number,
    mirando: 1 | -1,
    sx: number,
    sy: number,
    escala: number,
  ): void;
  framesDe(especie: EspecieSprite): number;
  moldeDe(especie: EspecieSprite): { ancho: number; alto: number; offX: number; offY: number };
}

export function crearSprites(): Sprites {
  const jugador = atlasJugador();
  const enemigos = new Map<EspecieSprite, HTMLCanvasElement>();
  for (const especie of Object.keys(MOLDES) as EspecieSprite[]) {
    enemigos.set(especie, atlasEnemigo(MOLDES[especie]));
  }

  /**
   * Copia una celda del atlas, volteándola si hace falta.
   *
   * El volteo se hace con `scale(-1, 1)` sobre el eje del propio sprite en vez
   * de con dos atlas: duplicar el arte para mirar al otro lado sería duplicar
   * también cada retoque futuro.
   */
  function copiar(
    ctx: CanvasRenderingContext2D,
    atlas: HTMLCanvasElement,
    celdaX: number,
    celdaY: number,
    w: number,
    h: number,
    mirando: 1 | -1,
    sx: number,
    sy: number,
    escala: number,
  ): void {
    const dw = w * escala;
    const dh = h * escala;
    if (mirando > 0) {
      ctx.drawImage(atlas, celdaX, celdaY, w, h, sx, sy, dw, dh);
      return;
    }
    ctx.save();
    ctx.translate(sx + dw, sy);
    ctx.scale(-1, 1);
    ctx.drawImage(atlas, celdaX, celdaY, w, h, 0, 0, dw, dh);
    ctx.restore();
  }

  return {
    jugador(ctx, pose, frame, mirando, sx, sy, escala) {
      const fila = POSES.indexOf(pose);
      const f = ((frame % FRAMES[pose]) + FRAMES[pose]) % FRAMES[pose];
      copiar(
        ctx,
        jugador,
        f * JUGADOR_W,
        fila * JUGADOR_H,
        JUGADOR_W,
        JUGADOR_H,
        mirando,
        sx,
        sy,
        escala,
      );
    },
    enemigo(ctx, especie, frame, mirando, sx, sy, escala) {
      const molde = MOLDES[especie];
      const atlas = enemigos.get(especie)!;
      const f = ((frame % molde.frames) + molde.frames) % molde.frames;
      copiar(ctx, atlas, f * molde.ancho, 0, molde.ancho, molde.alto, mirando, sx, sy, escala);
    },
    framesDe: (especie) => MOLDES[especie].frames,
    moldeDe: (especie) => {
      const m = MOLDES[especie];
      return { ancho: m.ancho, alto: m.alto, offX: m.offX, offY: m.offY };
    },
  };
}

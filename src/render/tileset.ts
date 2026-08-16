import { TILE } from '../core/constants';
import { ABAJO, ARRIBA, DERECHA, IZQUIERDA, MASCARAS } from '../world/framing';
import {
  AIRE,
  ANTORCHA,
  ARENISCA,
  BARRO,
  BROTE,
  CACTUS,
  CAMA,
  CANA,
  CULTIVOS,
  OBSIDIANA,
  VIDRIO,
  COBRE,
  CRISTAL_VIDA,
  GRAVA,
  HIERBA_JUNGLA,
  HOJAS_JUNGLA,
  HOJAS_PINO,
  TRONCO_ABEDUL,
  TRONCO_JUNGLA,
  TIERRA_LABRADA,
  HIELO,
  HIERBA,
  HIERRO,
  HOJAS,
  MADERA,
  MESA,
  NIEVE,
  ORO,
  PIEDRA,
  PLATA,
  PLATAFORMA,
  TILES,
  TRONCO,
} from '../world/tiles';

/**
 * Tileset procedural con auto-tiling.
 *
 * No hay ni un PNG en el repo. Al arrancar se generan dos atlas —uno para
 * bloques y otro para paredes— con una fila por cada combinación de tipo de
 * tile y máscara de vecinos, y varias variantes de grano por celda para que el
 * terreno no se vea como una cuadrícula. La variante se elige por hash de la
 * posición: estable entre frames sin guardar nada por tile.
 */

const VARIANTES = 4;
/** Grosor del bisel de los bordes expuestos, en píxeles de tile. */
const BISEL = 2;

export interface Tileset {
  dibujarBloque(
    ctx: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  dibujarPared(
    ctx: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  /** Textura de grietas, 4 etapas de picado. */
  dibujarGrieta(
    ctx: CanvasRenderingContext2D,
    etapa: number,
    sx: number,
    sy: number,
    tam: number,
  ): void;
  /** Variante estable para una posición del mundo. */
  variante(tx: number, ty: number): number;
}

/** Ruido entero determinista: mismo (x,y) → mismo valor, sin estado. */
function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

function rgb(hex: string, delta: number, escala = 1): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v * escala) + delta));
  return [c((n >> 16) & 255), c((n >> 8) & 255), c(n & 255)];
}

function css(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * Familias de textura.
 *
 * Un tile no se distingue de otro por su color medio sino por su grano: la
 * piedra tiene manchas grandes, la tierra motas finas, la madera vetas
 * verticales y el mineral pepitas brillantes sobre roca. Pintarlos todos con el
 * mismo ruido dejaba un mundo que parecía coloreado con rotulador.
 */
type Textura = 'tierra' | 'piedra' | 'madera' | 'hojas' | 'mineral' | 'hielo' | 'nieve';

function texturaDe(id: number): Textura {
  switch (id) {
    case PIEDRA:
    case ARENISCA:
      return 'piedra';
    case MADERA:
    case TRONCO:
    case TRONCO_JUNGLA:
    case TRONCO_ABEDUL:
    case MESA:
      return 'madera';
    // La labrada usa el mismo grano que la tierra; lo que la distingue son los
    // surcos que se le pintan encima.
    case TIERRA_LABRADA:
    case BARRO:
    case HIERBA_JUNGLA:
      return 'tierra';
    // La grava es roca partida: el grano de la piedra le va mejor que el de la
    // tierra, aunque se cave a paladas.
    case GRAVA:
    case OBSIDIANA:
      return 'piedra';
    case HOJAS:
    case HOJAS_JUNGLA:
    case HOJAS_PINO:
    case CACTUS:
      return 'hojas';
    case COBRE:
    case HIERRO:
    case PLATA:
    case ORO:
      return 'mineral';
    case HIELO:
      return 'hielo';
    case NIEVE:
      return 'nieve';
    default:
      return 'tierra';
  }
}

/**
 * Dibuja las VARIANTES texturas base de un tipo de tile en una tira horizontal.
 * El grano se pinta píxel a píxel una sola vez, en la carga.
 */
function pintarBase(
  ctx: CanvasRenderingContext2D,
  id: number,
  color: string,
  escala: number,
  oy: number,
): void {
  const textura = texturaDe(id);
  // El mineral se asienta sobre roca: en Terraria una veta de cobre es piedra
  // con pepitas, no un bloque naranja, y esa diferencia es la que hace que
  // encontrar una veta se vea como encontrar algo.
  const fondo = textura === 'mineral' ? TILES[PIEDRA]!.color : color;

  for (let v = 0; v < VARIANTES; v++) {
    const ox = v * TILE;
    ctx.fillStyle = css(rgb(fondo, 0, escala));
    ctx.fillRect(ox, oy, TILE, TILE);

    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        // Dos escalas de ruido: una gruesa que hace las manchas y una fina que
        // hace el grano. Con una sola, la textura se ve como lluvia.
        const grueso = hash2(Math.floor(px / 4) + v * 53, Math.floor(py / 4) + v * 29);
        const fino = hash2(px + v * 31, py + v * 17);
        let delta: number | null = null;

        switch (textura) {
          case 'piedra':
            if (grueso > 0.62) delta = 13;
            else if (grueso < 0.3) delta = -20;
            if (fino > 0.9) delta = (delta ?? 0) + 12;
            break;
          case 'tierra':
            if (fino > 0.84) delta = 16;
            else if (fino < 0.16) delta = -20;
            else if (grueso < 0.22) delta = -9;
            break;
          case 'madera': {
            // Vetas verticales: columnas enteras algo más claras o más oscuras.
            const veta = hash2(px + v * 91, 0);
            if (veta > 0.72) delta = 12;
            else if (veta < 0.3) delta = -16;
            // Nudos: una mancha redonda de vez en cuando.
            if (fino > 0.95) delta = -26;
            break;
          }
          case 'hojas': {
            // Racimos: manchas redondeadas de tres tonos, y algún hueco por el
            // que se ve el cielo. Una copa opaca parece un cartel verde.
            const c = hash2(Math.floor(px / 3) + v * 17, Math.floor(py / 3) + v * 43);
            if (c > 0.74) delta = 20;
            else if (c < 0.28) delta = -22;
            if (fino > 0.93) delta = 30;
            break;
          }
          case 'mineral': {
            // Pepitas: bolas del color del mineral repartidas por la roca.
            const d = Math.hypot(px - 5 - v * 2, py - 6 - ((v * 3) % 5));
            const d2 = Math.hypot(px - 11 + v, py - 11 + ((v * 2) % 4));
            if (d < 2.9 + fino || d2 < 2.4 + fino * 0.8) {
              // Pepita con brillo marcado: el contraste dentro de la propia
              // pepita es lo que hace que la veta salte a la vista desde el
              // otro extremo de una caverna a media luz.
              ctx.fillStyle = css(rgb(color, fino > 0.62 ? 40 : fino < 0.22 ? -30 : 4, escala));
              ctx.fillRect(ox + px, oy + py, 1, 1);
              continue;
            }
            // Halo oscuro alrededor de la pepita, que la despega de la roca.
            if (d < 3.9 || d2 < 3.4) {
              ctx.fillStyle = css(rgb(fondo, -26, escala));
              ctx.fillRect(ox + px, oy + py, 1, 1);
              continue;
            }
            if (grueso > 0.66) delta = 10;
            else if (grueso < 0.32) delta = -18;
            break;
          }
          case 'hielo':
            // Facetas: bandas diagonales claras, como cristal roto.
            if ((px + py * 2) % 7 === 0) delta = 22;
            else if (grueso < 0.3) delta = -16;
            if (fino > 0.94) delta = 34;
            break;
          case 'nieve':
            // Casi lisa, con algún destello: la nieve es plana y brillante.
            if (fino > 0.93) delta = 14;
            else if (grueso < 0.2) delta = -10;
            break;
        }

        if (delta === null) continue;
        ctx.fillStyle = css(rgb(fondo, delta, escala));
        ctx.fillRect(ox + px, oy + py, 1, 1);
      }
    }
  }
}

/** Bisela los lados que NO conectan: ahí es donde el bloque queda a la vista. */
function pintarBordes(
  ctx: CanvasRenderingContext2D,
  id: number,
  color: string,
  escala: number,
  mascara: number,
  ox: number,
  oy: number,
  variante: number,
): void {
  const claro = css(rgb(color, 30, escala));
  const oscuro = css(rgb(color, -34, escala));

  // Las hojas no tienen aristas: cuando dos lados contiguos quedan al aire, la
  // esquina se recorta en diagonal. Es lo que convierte una copa de tiles
  // cuadrados en una mancha orgánica, y sale solo de la máscara de vecinos.
  if (texturaDe(id) === 'hojas') {
    const esquinas: [number, number, number, number][] = [
      [ARRIBA, IZQUIERDA, 0, 0],
      [ARRIBA, DERECHA, TILE - 1, 0],
      [ABAJO, IZQUIERDA, 0, TILE - 1],
      [ABAJO, DERECHA, TILE - 1, TILE - 1],
    ];
    for (const [ladoA, ladoB, ex, ey] of esquinas) {
      if (mascara & ladoA || mascara & ladoB) continue;
      const dirX = ex === 0 ? 1 : -1;
      const dirY = ey === 0 ? 1 : -1;
      // Escalón de tres píxeles: 3, 2 y 1. Con más, la hoja se ve mordida.
      for (let i = 0; i < 3; i++) {
        ctx.clearRect(ox + ex + dirX * i, oy + ey, 1, (3 - i) * dirY);
        if (dirY < 0) ctx.clearRect(ox + ex + dirX * i, oy + ey - (2 - i), 1, 3 - i);
      }
    }
    // Bordes expuestos: claro arriba —la hoja que da al sol— y oscuro en los
    // otros tres. Sin ese contorno, la copa se funde con el cielo y con la copa
    // de al lado, y el bosque se ve como una mancha verde continua.
    if (!(mascara & ARRIBA)) {
      ctx.fillStyle = claro;
      ctx.fillRect(ox + 3, oy, TILE - 6, 1);
    }
    if (!(mascara & ABAJO)) {
      ctx.fillStyle = oscuro;
      ctx.fillRect(ox + 3, oy + TILE - 1, TILE - 6, 1);
    }
    if (!(mascara & IZQUIERDA)) {
      ctx.fillStyle = oscuro;
      ctx.fillRect(ox, oy + 3, 1, TILE - 6);
    }
    if (!(mascara & DERECHA)) {
      ctx.fillStyle = oscuro;
      ctx.fillRect(ox + TILE - 1, oy + 3, 1, TILE - 6);
    }
    return;
  }

  if (!(mascara & ARRIBA)) {
    ctx.fillStyle = claro;
    ctx.fillRect(ox, oy, TILE, BISEL);
  }
  if (!(mascara & ABAJO)) {
    ctx.fillStyle = oscuro;
    ctx.fillRect(ox, oy + TILE - BISEL, TILE, BISEL);
    // Cornisa: una sombra bajo el saliente. Es lo que hace que un bloque
    // suelto se vea flotando sobre el fondo y no pegado a él.
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ox, oy + TILE - 1, TILE, 1);
  }
  if (!(mascara & IZQUIERDA)) {
    ctx.fillStyle = claro;
    ctx.fillRect(ox, oy, BISEL, TILE);
  }
  if (!(mascara & DERECHA)) {
    ctx.fillStyle = oscuro;
    ctx.fillRect(ox + TILE - BISEL, oy, BISEL, TILE);
  }

  // Flecos del suelo vivo: cuando el borde de arriba está al aire, la hierba y
  // la nieve se recortan en dientes en vez de acabar en una línea recta. Lo que
  // se dibuja no son briznas nuevas sino los huecos entre ellas, porque el
  // sprite no puede salirse de su celda del atlas sin invadir la de al lado.
  if (!(mascara & ARRIBA) && (id === HIERBA || id === NIEVE)) {
    const puntas = css(rgb(color, id === NIEVE ? 26 : 40, escala));
    for (let px = 0; px < TILE; px++) {
      const n = hash2(px * 7 + variante * 13, id * 3);
      const hueco = n < 0.34 ? 2 : n < 0.6 ? 1 : 0;
      if (hueco > 0) ctx.clearRect(ox + px, oy, 1, hueco);
      // Y la punta de cada brizna se queda iluminada.
      ctx.fillStyle = puntas;
      ctx.fillRect(ox + px, oy + hueco, 1, 1);
    }
  }
}

/** Atlas completo: filas de (tipo × máscara), columnas de variantes. */
function crearAtlas(escala: number, alfa: number): HTMLCanvasElement {
  const atlas = lienzo(VARIANTES * TILE, TILES.length * MASCARAS * TILE);
  const ctx = atlas.getContext('2d');
  if (!ctx) throw new Error('No se ha podido crear el contexto del tileset');

  // Las bases se pintan en un lienzo aparte y se copian a cada máscara: pintar
  // el grano 16 veces por tipo sería 100.000 fillRect en el arranque.
  const bases = lienzo(VARIANTES * TILE, TILES.length * TILE);
  const cbase = bases.getContext('2d');
  if (!cbase) throw new Error('No se ha podido crear el contexto de las bases');

  for (let id = 0; id < TILES.length; id++) {
    if (id === AIRE) continue;
    pintarBase(cbase, id, TILES[id]!.color, escala, id * TILE);
  }

  ctx.globalAlpha = alfa;
  for (let id = 0; id < TILES.length; id++) {
    if (id === AIRE) continue;
    const def = TILES[id]!;
    for (let m = 0; m < MASCARAS; m++) {
      const oy = (id * MASCARAS + m) * TILE;
      ctx.drawImage(bases, 0, id * TILE, VARIANTES * TILE, TILE, 0, oy, VARIANTES * TILE, TILE);
      for (let v = 0; v < VARIANTES; v++) {
        pintarBordes(ctx, id, def.color, escala, m, v * TILE, oy, v);
      }
    }
  }
  ctx.globalAlpha = 1;
  return atlas;
}

/**
 * Tiles que no son bloques: se repintan a mano sobre el atlas porque un
 * cuadrado de 16x16 con su color no los representaría en absoluto.
 */
function pintarEspeciales(atlas: HTMLCanvasElement): void {
  const ctx = atlas.getContext('2d');
  if (!ctx) return;

  // Plataformas: solo la franja superior, para que se vea que se atraviesan.
  ctx.clearRect(0, PLATAFORMA * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  const plat = TILES[PLATAFORMA]!;
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (PLATAFORMA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = plat.color;
      ctx.fillRect(ox, oy, TILE, 5);
      ctx.fillStyle = css(rgb(plat.color, 28));
      ctx.fillRect(ox, oy, TILE, 1);
      ctx.fillStyle = css(rgb(plat.color, -40));
      ctx.fillRect(ox, oy + 4, TILE, 1);
    }
  }

  // Cultivos: tallos verticales que crecen y se doran. Cada etapa es más alta
  // y más clara que la anterior, así que de un vistazo se sabe si toca cosechar
  // sin tener que acercarse a mirar.
  for (const cultivo of CULTIVOS) {
    const etapas = cultivo.ultima - cultivo.primera + 1;
    for (let paso = 0; paso < etapas; paso++) {
      const id = cultivo.primera + paso;
      const base = TILES[id]!.color;
      ctx.clearRect(0, id * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
      for (let m = 0; m < MASCARAS; m++) {
        const oy = (id * MASCARAS + m) * TILE;
        for (let v = 0; v < VARIANTES; v++) {
          const ox = v * TILE;
          const alto = 4 + paso * 4;
          // Cuatro tallos por tile, a alturas ligeramente distintas.
          for (let i = 0; i < 4; i++) {
            const x = ox + 2 + i * 4 + (v % 2);
            const h = alto - ((i + v) % 2);
            ctx.fillStyle = base;
            ctx.fillRect(x, oy + TILE - h, 2, h);
            ctx.fillStyle = css(rgb(base, 26));
            ctx.fillRect(x, oy + TILE - h, 1, h);
            // La espiga solo en la última etapa: es la señal de "ya".
            if (paso === etapas - 1) {
              ctx.fillStyle = css(rgb(base, 48));
              ctx.fillRect(x - 1, oy + TILE - h - 2, 4, 3);
            }
          }
        }
      }
    }
  }

  // Cama: colchón claro, manta y un cabecero de madera.
  ctx.clearRect(0, CAMA * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (CAMA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(ox, oy + 12, TILE, 4);
      ctx.fillStyle = '#a8434a';
      ctx.fillRect(ox, oy + 6, TILE, 6);
      ctx.fillStyle = '#c25a60';
      ctx.fillRect(ox, oy + 6, TILE, 1);
      ctx.fillStyle = '#e8e2d4';
      ctx.fillRect(ox + 1, oy + 4, 6, 3);
      ctx.fillStyle = '#8a5f33';
      ctx.fillRect(ox, oy + 2, 2, 12);
      ctx.fillRect(ox + TILE - 2, oy + 8, 2, 6);
    }
  }

  // Brote: dos hojitas sobre un tallo corto.
  ctx.clearRect(0, BROTE * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (BROTE * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = '#6b4a2c';
      ctx.fillRect(ox + 7 + (v % 2), oy + 8, 2, 8);
      ctx.fillStyle = '#4f9a3a';
      ctx.fillRect(ox + 3 + (v % 2), oy + 6, 4, 3);
      ctx.fillRect(ox + 9 + (v % 2), oy + 5, 4, 3);
      ctx.fillStyle = '#68b84a';
      ctx.fillRect(ox + 3 + (v % 2), oy + 6, 4, 1);
      ctx.fillRect(ox + 9 + (v % 2), oy + 5, 4, 1);
    }
  }

  // Vidrio: casi transparente, con un marco fino y un brillo en diagonal. No se
  // deja como bloque macizo porque una ventana tiene que dejar ver que hay algo
  // detrás, aunque el juego no pinte de verdad a través de ella.
  ctx.clearRect(0, VIDRIO * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (VIDRIO * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = 'rgba(188,216,228,0.22)';
      ctx.fillRect(ox, oy, TILE, TILE);
      ctx.fillStyle = 'rgba(216,238,248,0.55)';
      ctx.fillRect(ox, oy, TILE, 1);
      ctx.fillRect(ox, oy, 1, TILE);
      ctx.fillStyle = 'rgba(120,158,176,0.5)';
      ctx.fillRect(ox, oy + TILE - 1, TILE, 1);
      ctx.fillRect(ox + TILE - 1, oy, 1, TILE);
      // Brillo en diagonal, desplazado por variante.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 6; i++) ctx.fillRect(ox + 3 + i + (v % 3), oy + 9 - i, 1, 1);
    }
  }

  // Caña de azúcar: un tallo estrecho con nudos, no un bloque. Con la textura
  // de tierra en verde claro, un cañaveral se veía como un muro de césped
  // flotando en la orilla.
  ctx.clearRect(0, CANA * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (CANA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      // El tallo se desplaza un píxel según la variante: una hilera de cañas
      // perfectamente alineadas se ve como una reja.
      const x = ox + 6 + (v % 3);
      ctx.fillStyle = '#6ea832';
      ctx.fillRect(x, oy, 4, TILE);
      ctx.fillStyle = '#a2d858';
      ctx.fillRect(x, oy, 1, TILE);
      ctx.fillStyle = '#4c7a22';
      ctx.fillRect(x + 3, oy, 1, TILE);
      // Nudos: dos rayas horizontales por tile.
      ctx.fillStyle = '#3d6419';
      ctx.fillRect(x, oy + 4 + (v % 2), 4, 1);
      ctx.fillRect(x, oy + 11, 4, 1);
      // Una hoja saliendo a un lado, alternando.
      ctx.fillStyle = '#88c445';
      const lado = v % 2 === 0 ? x - 3 : x + 4;
      ctx.fillRect(lado, oy + 6, 3, 1);
      ctx.fillRect(lado + (v % 2 === 0 ? 0 : 2), oy + 7, 1, 1);
    }
  }

  // Tierra labrada: surcos horizontales sobre el grano de la tierra. Se pinta
  // encima de la textura ya generada en vez de sustituirla, para que un huerto
  // siga pareciendo tierra y no un bloque nuevo.
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (TIERRA_LABRADA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      for (const fila of [2, 7, 12]) {
        ctx.fillStyle = 'rgba(0,0,0,0.32)';
        ctx.fillRect(ox, oy + fila, TILE, 2);
        ctx.fillStyle = 'rgba(255,235,200,0.10)';
        ctx.fillRect(ox, oy + fila + 2, TILE, 1);
      }
    }
  }

  // Cristal de vida: un rombo que sobresale del suelo, con un núcleo brillante.
  // Se pinta a mano en vez de dejarlo como bloque de tierra porque tiene que
  // reconocerse desde el otro extremo de una galería.
  ctx.clearRect(0, CRISTAL_VIDA * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (CRISTAL_VIDA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      const alto = 11 + (v % 2);
      const base = oy + TILE - 1;
      for (let i = 0; i < alto; i++) {
        // Ancho en punta arriba y abajo, más gordo en el centro del rombo.
        const t = i / (alto - 1);
        const ancho = Math.max(1, Math.round(7 * (1 - Math.abs(t - 0.55) * 2)));
        const x = ox + 8 - Math.ceil(ancho / 2);
        ctx.fillStyle = i < alto * 0.4 ? '#f07fb0' : '#c53d78';
        ctx.fillRect(x, base - i, ancho, 1);
      }
      ctx.fillStyle = '#ffd0e4';
      ctx.fillRect(ox + 6, base - alto + 3, 1, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ox + 8, base - Math.round(alto * 0.55), 1, 2);
      // Esquirlas sueltas a los lados: el cristal parece haber crecido ahí.
      ctx.fillStyle = '#c53d78';
      ctx.fillRect(ox + 3 + (v % 2), base - 3, 2, 4);
      ctx.fillRect(ox + 11, base - 2, 2, 3);
    }
  }

  // Antorcha: un palo y una llama, con la llama algo distinta en cada variante
  // para que una pared de antorchas no se vea calcada.
  ctx.clearRect(0, ANTORCHA * MASCARAS * TILE, atlas.width, MASCARAS * TILE);
  for (let m = 0; m < MASCARAS; m++) {
    const oy = (ANTORCHA * MASCARAS + m) * TILE;
    for (let v = 0; v < VARIANTES; v++) {
      const ox = v * TILE;
      ctx.fillStyle = '#5a4028';
      ctx.fillRect(ox + 7, oy + 7, 2, 8);
      ctx.fillStyle = '#c8761f';
      ctx.fillRect(ox + 6, oy + 3 + (v % 2), 4, 5);
      ctx.fillStyle = '#ffd24a';
      ctx.fillRect(ox + 7, oy + 4 + (v % 2), 2, 3);
      ctx.fillStyle = '#fff2b0';
      ctx.fillRect(ox + 7, oy + 5 + (v % 2), 1, 1);
    }
  }
}

function crearGrietas(): HTMLCanvasElement {
  const etapas = 4;
  const c = lienzo(TILE * etapas, TILE);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('No se ha podido crear el contexto de las grietas');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let e = 0; e < etapas; e++) {
    const ox = e * TILE;
    const densidad = 0.06 + e * 0.07;
    for (let py = 0; py < TILE; py++) {
      for (let px = 0; px < TILE; px++) {
        // Grietas que nacen del centro y se abren hacia fuera.
        const d = Math.abs(px - 8) + Math.abs(py - 8);
        if (hash2(px * 7 + e, py * 13) < densidad * (1 + (16 - d) / 12)) {
          ctx.fillRect(ox + px, py, 1, 1);
        }
      }
    }
  }
  return c;
}

export function crearTileset(): Tileset {
  const bloques = crearAtlas(1, 1);
  pintarEspeciales(bloques);
  // Las paredes son el mismo terreno al 45 % de luz: se leen como fondo sin
  // competir con los bloques del primer plano.
  const paredes = crearAtlas(0.45, 1);
  const grietas = crearGrietas();

  function dibujar(
    atlas: HTMLCanvasElement,
    destino: CanvasRenderingContext2D,
    id: number,
    mascara: number,
    tx: number,
    ty: number,
    sx: number,
    sy: number,
    tam: number,
  ): void {
    if (id === AIRE) return;
    const v = Math.floor(hash2(tx, ty) * VARIANTES) % VARIANTES;
    const alto = id === PLATAFORMA ? 5 : TILE;
    destino.drawImage(
      atlas,
      v * TILE,
      (id * MASCARAS + mascara) * TILE,
      TILE,
      alto,
      sx,
      sy,
      tam,
      (tam * alto) / TILE,
    );
  }

  return {
    dibujarBloque: (ctx, id, m, tx, ty, sx, sy, tam) =>
      dibujar(bloques, ctx, id, m, tx, ty, sx, sy, tam),
    dibujarPared: (ctx, id, m, tx, ty, sx, sy, tam) =>
      dibujar(paredes, ctx, id, m, tx, ty, sx, sy, tam),
    dibujarGrieta(ctx, etapa, sx, sy, tam) {
      const e = Math.min(3, Math.max(0, etapa));
      ctx.drawImage(grietas, e * TILE, 0, TILE, TILE, sx, sy, tam, tam);
    },
    variante: (tx, ty) => Math.floor(hash2(tx, ty) * VARIANTES) % VARIANTES,
  };
}

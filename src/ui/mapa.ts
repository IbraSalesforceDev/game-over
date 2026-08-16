import { AIRE, defTile, esSolido } from '../world/tiles';
import {
  COLOR_ESTRUCTURA,
  MARCA_ESTRUCTURA,
  type Estructura,
} from '../world/estructuras';
import type { Mundo } from '../world/world';

/**
 * El mapa, con la tecla M.
 *
 * Se pinta a un píxel por tile en un lienzo aparte y se escala al hueco de la
 * pantalla. No hay niebla de guerra: el mapa enseña lo que abarca su nivel, y
 * ampliarlo —papel a papel— es lo que descubre más mundo. Recorrer el terreno
 * para revelarlo sería otro juego, y además obligaría a guardar una capa de
 * "visto" del tamaño del mundo en cada partida.
 *
 * El coste está acotado por dos sitios: la región se recorta al alcance del
 * mapa, y si aun así sale enorme —el del mundo entero en un mundo enorme son
 * 4,3 millones de tiles— se muestrea de dos en dos o de tres en tres. Se
 * redibuja al abrir, no en cada frame.
 */

/** Lado máximo del lienzo del mapa, en píxeles. Por encima, se muestrea. */
const LADO_MAXIMO = 1400;

/** Colores del cielo y de la roca de fondo, para lo que no es un bloque. */
const CIELO = [92, 132, 178] as const;
const FONDO = [30, 26, 24] as const;
const AGUA = [46, 106, 180] as const;
const LAVA = [200, 74, 26] as const;

const ESTILO = `
#mapa {
  pointer-events: auto;
  position: fixed; inset: 0; z-index: 82; display: none;
  align-items: center; justify-content: center; flex-direction: column;
  background: rgba(6,9,13,.86); backdrop-filter: blur(3px);
  font: 11px ui-monospace, monospace; color: #c9d4e0;
}
#mapa.visible { display: flex; }
#mapa .marco {
  max-width: 94vw; max-height: 78vh; padding: 8px;
  background: #17130d; border: 1px solid #6a5426; box-shadow: 0 24px 60px rgba(0,0,0,.6);
}
#mapa canvas {
  display: block; max-width: 100%; max-height: calc(78vh - 18px);
  image-rendering: pixelated;
}
#mapa .pie { margin-top: 10px; color: #8b98a8; letter-spacing: .06em; }
#mapa .pie b { color: #e8b64c; font-weight: normal; }
`;

export interface PanelMapa {
  /** Abre o cierra. Al abrir redibuja con el alcance que se le pase. */
  alternar(
    mundo: Mundo,
    tx: number,
    ty: number,
    alcance: number,
    etiqueta: string,
    estructuras?: readonly Estructura[],
  ): void;
  cerrar(): void;
  readonly abierto: boolean;
}

/**
 * Región del mundo que abarca un mapa centrado en el jugador.
 *
 * Se recorta a los bordes: en el extremo del mundo no tiene sentido enseñar
 * medio mapa vacío, así que la ventana se pega al borde en vez de salirse.
 */
export function regionDelMapa(
  mundo: Mundo,
  tx: number,
  ty: number,
  alcance: number,
): { tx0: number; ty0: number; ancho: number; alto: number } {
  if (!Number.isFinite(alcance)) {
    return { tx0: 0, ty0: 0, ancho: mundo.ancho, alto: mundo.alto };
  }
  const r = Math.max(1, Math.floor(alcance));
  const ancho = Math.min(mundo.ancho, r * 2 + 1);
  const alto = Math.min(mundo.alto, r * 2 + 1);
  const tx0 = Math.max(0, Math.min(mundo.ancho - ancho, tx - Math.floor(ancho / 2)));
  const ty0 = Math.max(0, Math.min(mundo.alto - alto, ty - Math.floor(alto / 2)));
  return { tx0, ty0, ancho, alto };
}

/** Cada cuántos tiles se toma una muestra para que el lienzo no se dispare. */
export function pasoDeMuestreo(ancho: number, alto: number): number {
  return Math.max(1, Math.ceil(Math.max(ancho, alto) / LADO_MAXIMO));
}

/** Color de un tile en el mapa, como [r, g, b]. */
function colorDe(mundo: Mundo, tx: number, ty: number): readonly [number, number, number] {
  const liquido = mundo.getLiquido(tx, ty);
  if (liquido > 0) return mundo.esLava(tx, ty) ? LAVA : AGUA;
  const id = mundo.getTile(tx, ty);
  if (id !== AIRE) return rgbDe(defTile(id).color);
  // Aire: si hay pared detrás es una sala excavada, y si no, cielo abierto.
  const pared = mundo.getPared(tx, ty);
  if (pared !== AIRE) {
    const [r, g, b] = rgbDe(defTile(pared).color);
    // La pared va a media luz para que se distinga del bloque macizo: así una
    // casa se lee como hueco y no como un bloque más.
    return [r * 0.45, g * 0.45, b * 0.45];
  }
  return CIELO;
}

const CACHE_RGB = new Map<string, readonly [number, number, number]>();

function rgbDe(hex: string): readonly [number, number, number] {
  const guardado = CACHE_RGB.get(hex);
  if (guardado) return guardado;
  const n = parseInt(hex.slice(1), 16);
  const v = [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
  CACHE_RGB.set(hex, v);
  return v;
}

/**
 * Vuelca la región en un `ImageData`. Separado del DOM para poder probarlo.
 */
export function pintarMapa(
  mundo: Mundo,
  region: { tx0: number; ty0: number; ancho: number; alto: number },
  paso: number,
): ImageData {
  const w = Math.max(1, Math.ceil(region.ancho / paso));
  const h = Math.max(1, Math.ceil(region.alto / paso));
  const img = new ImageData(w, h);
  const d = img.data;
  // Se recorre por columnas, no por filas, para poder llevar un "ya he pasado
  // el techo" por columna: el hueco de una cueva y el aire de la superficie son
  // el mismo tile, y pintarlos igual convierte el subsuelo en una mancha azul.
  for (let x = 0; x < w; x++) {
    const tx = region.tx0 + x * paso;
    let bajoTierra = false;
    for (let y = 0; y < h; y++) {
      const ty = region.ty0 + y * paso;
      const macizo = esSolido(mundo.getTile(tx, ty));
      if (macizo) bajoTierra = true;
      const hueco = !macizo && mundo.getLiquido(tx, ty) === 0;
      const [r, g, b] =
        bajoTierra && hueco && mundo.getPared(tx, ty) === AIRE
          ? FONDO
          : colorDe(mundo, tx, ty);
      const i = (y * w + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
    }
  }
  return img;
}

export function crearMapa(contenedor: HTMLElement): PanelMapa {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'mapa';
  const marco = document.createElement('div');
  marco.className = 'marco';
  const lienzo = document.createElement('canvas');
  const pie = document.createElement('div');
  pie.className = 'pie';
  marco.appendChild(lienzo);
  capa.append(marco, pie);
  contenedor.appendChild(capa);

  capa.addEventListener('click', () => capa.classList.remove('visible'));

  function dibujar(
    mundo: Mundo,
    tx: number,
    ty: number,
    alcance: number,
    estructuras: readonly Estructura[],
  ): void {
    const region = regionDelMapa(mundo, tx, ty, alcance);
    const paso = pasoDeMuestreo(region.ancho, region.alto);
    const img = pintarMapa(mundo, region, paso);
    lienzo.width = img.width;
    lienzo.height = img.height;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(img, 0, 0);

    // La cruz del jugador, encima. Va en rojo porque es el único color que no
    // usa ningún tile: en un mapa de tierra y piedra se encuentra sola. El
    // brazo crece con el lienzo —en el mapa del mundo entero una cruz de cinco
    // píxeles sobre 1400 no se ve— y lleva un contorno oscuro detrás para que
    // se lea igual sobre la roca clara que sobre el cielo.
    const px = Math.floor((tx - region.tx0) / paso);
    const py = Math.floor((ty - region.ty0) / paso);
    const brazo = Math.max(3, Math.round(Math.max(img.width, img.height) / 60));
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(px - brazo, py - 1, brazo * 2 + 1, 3);
    ctx.fillRect(px - 1, py - brazo, 3, brazo * 2 + 1);
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(px - brazo, py, brazo * 2 + 1, 1);
    ctx.fillRect(px, py - brazo, 1, brazo * 2 + 1);

    // Las estructuras, si la brújula las ha revelado. Un rombo con su inicial
    // dentro: a un píxel por tile no cabe un icono, y una letra sí se lee.
    // El rombo no se escala con el lienzo como la cruz del jugador porque
    // puede haber varios y a partir de cierto tamaño se solapan entre ellos.
    for (const e of estructuras) {
      const ex = Math.floor((e.tx - region.tx0) / paso);
      const ey = Math.floor((e.ty - region.ty0) / paso);
      if (ex < -8 || ey < -8 || ex > img.width + 8 || ey > img.height + 8) continue;
      const r = 6;
      ctx.beginPath();
      ctx.moveTo(ex, ey - r);
      ctx.lineTo(ex + r, ey);
      ctx.lineTo(ex, ey + r);
      ctx.lineTo(ex - r, ey);
      ctx.closePath();
      ctx.fillStyle = 'rgba(8,10,14,0.82)';
      ctx.fill();
      ctx.strokeStyle = COLOR_ESTRUCTURA[e.tipo] ?? '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = COLOR_ESTRUCTURA[e.tipo] ?? '#ffffff';
      ctx.font = 'bold 7px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MARCA_ESTRUCTURA[e.tipo] ?? '?', ex, ey + 0.5);
    }
  }

  return {
    alternar(mundo, tx, ty, alcance, etiqueta, estructuras = []) {
      const abriendo = !capa.classList.contains('visible');
      capa.classList.toggle('visible', abriendo);
      if (!abriendo) return;
      dibujar(mundo, tx, ty, alcance, estructuras);
      pie.innerHTML = `<b>${etiqueta}</b> · X ${tx} Y ${ty} · M o clic para cerrar`;
    },
    cerrar: () => capa.classList.remove('visible'),
    get abierto() {
      return capa.classList.contains('visible');
    },
  };
}

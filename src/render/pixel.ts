/**
 * Utilidades para dibujar pixel art por código.
 *
 * Todo el arte del juego se genera al arrancar en lienzos fuera de pantalla y
 * luego se estira con el suavizado apagado. Trabajar a resolución 1:1 y ampliar
 * después es lo que da el aspecto de pixel art de verdad: si se dibujara
 * directamente al zoom de la cámara, las diagonales saldrían con antialias y el
 * personaje parecería un dibujo vectorial pequeño, no un sprite.
 *
 * Cada material se declara con tres tonos —claro, base y oscuro— porque toda la
 * luz del juego viene de arriba a la izquierda. Tener el trío junto evita el
 * error clásico de sombrear cada pieza con un criterio distinto y que el
 * conjunto se vea plano.
 */

export interface Tono {
  readonly claro: string;
  readonly base: string;
  readonly oscuro: string;
}

export function tono(base: string, subir = 26, bajar = 34): Tono {
  return { claro: aclarar(base, subir), base, oscuro: aclarar(base, -bajar) };
}

export function aclarar(hex: string, delta: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.min(255, Math.max(0, v + delta));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => c(v).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function mezclar(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const canal = (desp: number) => {
    const va = (na >> desp) & 255;
    const vb = (nb >> desp) & 255;
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${canal(16)}${canal(8)}${canal(0)}`;
}

export function lienzo(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function contexto(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Este navegador no soporta canvas 2D');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

/** Rectángulo a resolución de píxel. Todo el arte se construye con esto. */
export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Bloque con volumen: base, una luz arriba y a la izquierda, y una sombra abajo
 * y a la derecha. Es la pieza con la que se montan cuerpos y extremidades.
 */
export function bloque(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  t: Tono,
  grosor = 1,
): void {
  px(ctx, x, y, w, h, t.base);
  px(ctx, x, y, w, grosor, t.claro);
  px(ctx, x, y, grosor, h, t.claro);
  px(ctx, x, y + h - grosor, w, grosor, t.oscuro);
  px(ctx, x + w - grosor, y, grosor, h, t.oscuro);
}

/**
 * Elipse rellena a resolución de píxel, fila a fila.
 *
 * Se calcula a mano en vez de usar `ctx.ellipse` porque el arco del canvas sale
 * con antialias y una silueta con bordes difuminados rompe el pixel art en
 * cuanto se amplía cuatro veces.
 */
export function elipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    const dy = (y + 0.5 - cy) / ry;
    if (Math.abs(dy) > 1) continue;
    const ancho = rx * Math.sqrt(1 - dy * dy);
    const x0 = Math.round(cx - ancho);
    const x1 = Math.round(cx + ancho);
    if (x1 > x0) ctx.fillRect(x0, y, x1 - x0, 1);
  }
}

/** Contorno oscuro alrededor de lo ya dibujado, para despegarlo del fondo. */
export function contornear(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = 'rgba(10,12,16,0.75)',
): void {
  const datos = ctx.getImageData(x, y, w, h);
  const opaco = (px2: number, py: number): boolean => {
    if (px2 < 0 || py < 0 || px2 >= w || py >= h) return false;
    return datos.data[(py * w + px2) * 4 + 3]! > 24;
  };
  ctx.fillStyle = color;
  for (let py = 0; py < h; py++) {
    for (let px2 = 0; px2 < w; px2++) {
      if (opaco(px2, py)) continue;
      // Solo los cuatro vecinos ortogonales: con las diagonales el contorno
      // engorda las esquinas y la silueta se emborrona.
      if (
        opaco(px2 - 1, py) ||
        opaco(px2 + 1, py) ||
        opaco(px2, py - 1) ||
        opaco(px2, py + 1)
      ) {
        ctx.fillRect(x + px2, y + py, 1, 1);
      }
    }
  }
}

/** Ruido entero determinista: mismo (x,y) → mismo valor, sin estado. */
export function hash2(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

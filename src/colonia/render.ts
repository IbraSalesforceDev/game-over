/**
 * El dibujo. Vista cenital: el terreno se pinta una vez en una caché de pixel
 * art (16 px por casilla) y se estira sin suavizado; encima van, en vectorial,
 * los objetos, las máquinas, las cintas, los colonos y las criaturas. De noche
 * se oscurece todo menos donde hay luz.
 */
import type { Colono } from './colonos';
import { CRIATURAS, type Criatura, type Nido } from './criaturas';
import { EDIFICIOS, type Edificio, type TipoEdificio } from './edificios';
import { casillaSalida, luzSolar } from './maquinas';
import { Orden, Planta, Suelo, TH, TROZO, TW, Zona } from './mapa';
import type { Mundo } from './mundo';
import { ALTO, ANCHO, DX, DY, type Dir, type ItemId, ITEMS, idx, receta } from './tipos';

type Ctx = CanvasRenderingContext2D;

export interface Camara {
  x: number;
  y: number;
  /** Píxeles por casilla. */
  z: number;
  w: number;
  h: number;
}

export interface Fantasma {
  tipo: TipoEdificio;
  x: number;
  y: number;
  dir: Dir;
  valido: boolean;
}

export interface Vista {
  seleccion: { c: 'colono'; id: number } | { c: 'edificio'; id: number } | { c: 'criatura'; id: number } | { c: 'nido'; id: number } | { c: 'casilla'; i: number } | null;
  fantasma: Fantasma | null;
  rectangulo: { x0: number; y0: number; x1: number; y1: number; color: string } | null;
  contaminacion: boolean;
  tiempo: number;
}

// ------------------------------------------------------------------ caché del terreno

const PX = 16;
let cache: HTMLCanvasElement | null = null;

function hash(i: number, k: number): number {
  let h = (i * 374761393 + k * 668265263) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return (h ^ (h >>> 16)) / 4294967296;
}

const COLOR_SUELO: Record<number, [string, string, string]> = {
  [Suelo.Hierba]: ['#5d7d3c', '#668843', '#557334'],
  [Suelo.Tierra]: ['#7a6340', '#836b46', '#6f5a39'],
  [Suelo.Arena]: ['#c9b27a', '#d2bc84', '#bea871'],
  [Suelo.Agua]: ['#2f5f8a', '#336793', '#2b5880'],
  [Suelo.Roca]: ['#6e6a62', '#77736b', '#66625a'],
};

const COLOR_MINERAL: Record<string, [string, string]> = {
  hierro: ['#8fa3bb', '#5d6e84'],
  cobre: ['#d98a52', '#9a5530'],
  carbon: ['#1c1c1e', '#3a3a3e'],
  piedra: ['#c4bba8', '#8e8574'],
};

function pintarCasilla(ctx: Ctx, w: Mundo, i: number): void {
  const m = w.mapa;
  const x = (i % ANCHO) * PX;
  const y = ((i / ANCHO) | 0) * PX;
  const s = m.suelo[i]!;
  const cols = COLOR_SUELO[s]!;
  ctx.fillStyle = cols[0];
  ctx.fillRect(x, y, PX, PX);
  // Grano.
  for (let k = 0; k < 10; k++) {
    const px = Math.floor(hash(i, k) * PX);
    const py = Math.floor(hash(i, k + 50) * PX);
    ctx.fillStyle = cols[1 + (k % 2)]!;
    ctx.fillRect(x + px, y + py, 2, 1 + (k % 2));
  }
  if (s === Suelo.Hierba && hash(i, 99) < 0.25) {
    ctx.fillStyle = '#7a9a4a';
    ctx.fillRect(x + Math.floor(hash(i, 98) * 13), y + Math.floor(hash(i, 97) * 13), 1, 3);
    ctx.fillRect(x + Math.floor(hash(i, 96) * 13) + 1, y + Math.floor(hash(i, 95) * 13), 1, 2);
  }
  if (s === Suelo.Agua) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(x + Math.floor(hash(i, 3) * 10), y + Math.floor(hash(i, 4) * 14), 5, 1);
  }
  // Orillas: un borde de arena oscura donde el agua toca tierra.
  if (s !== Suelo.Agua) {
    const ix = i % ANCHO;
    const iy = (i / ANCHO) | 0;
    ctx.fillStyle = 'rgba(30,60,90,0.35)';
    if (iy > 0 && m.suelo[i - ANCHO] === Suelo.Agua) ctx.fillRect(x, y, PX, 2);
    if (iy < ALTO - 1 && m.suelo[i + ANCHO] === Suelo.Agua) ctx.fillRect(x, y + PX - 2, PX, 2);
    if (ix > 0 && m.suelo[i - 1] === Suelo.Agua) ctx.fillRect(x, y, 2, PX);
    if (ix < ANCHO - 1 && m.suelo[i + 1] === Suelo.Agua) ctx.fillRect(x + PX - 2, y, 2, PX);
  }
  // Mineral en superficie.
  const min = m.mineralEn(i);
  if (min) {
    const [a, b] = COLOR_MINERAL[min]!;
    const dens = Math.min(1, m.cantidad[i]! / 400);
    const n = 3 + Math.floor(dens * 6);
    for (let k = 0; k < n; k++) {
      const px = 1 + Math.floor(hash(i, k + 200) * (PX - 5));
      const py = 1 + Math.floor(hash(i, k + 300) * (PX - 5));
      const t = 2 + Math.floor(hash(i, k + 400) * 2);
      ctx.fillStyle = b;
      ctx.fillRect(x + px, y + py + 1, t + 1, t);
      ctx.fillStyle = a;
      ctx.fillRect(x + px, y + py, t, t);
    }
  }
  // Roca de montaña: bloque con bisel según los vecinos.
  if (m.muro[i]) {
    ctx.fillStyle = '#4a4741';
    ctx.fillRect(x, y, PX, PX);
    ctx.fillStyle = '#58554e';
    for (let k = 0; k < 6; k++) ctx.fillRect(x + Math.floor(hash(i, k + 500) * 12), y + Math.floor(hash(i, k + 600) * 12), 4, 3);
    const ix = i % ANCHO;
    const iy = (i / ANCHO) | 0;
    const abierto = (dx: number, dy: number) => {
      const nx = ix + dx;
      const ny = iy + dy;
      return nx >= 0 && ny >= 0 && nx < ANCHO && ny < ALTO && !m.muro[idx(nx, ny)];
    };
    ctx.fillStyle = '#7d7970';
    if (abierto(0, -1)) ctx.fillRect(x, y, PX, 3);
    if (abierto(-1, 0)) ctx.fillRect(x, y, 2, PX);
    ctx.fillStyle = '#2e2c28';
    if (abierto(0, 1)) ctx.fillRect(x, y + PX - 4, PX, 4);
    if (abierto(1, 0)) ctx.fillRect(x + PX - 2, y, 2, PX);
  }
}

function asegurarCache(w: Mundo): HTMLCanvasElement {
  if (!cache) {
    cache = document.createElement('canvas');
    cache.width = ANCHO * PX;
    cache.height = ALTO * PX;
    const ctx = cache.getContext('2d')!;
    for (let i = 0; i < ANCHO * ALTO; i++) pintarCasilla(ctx, w, i);
    w.sucias.clear();
  } else if (w.sucias.size) {
    const ctx = cache.getContext('2d')!;
    const vecinos = new Set<number>();
    for (const i of w.sucias) {
      vecinos.add(i);
      for (const d of [-1, 1, -ANCHO, ANCHO]) if (i + d >= 0 && i + d < ANCHO * ALTO) vecinos.add(i + d);
    }
    for (const i of vecinos) pintarCasilla(ctx, w, i);
    w.sucias.clear();
  }
  return cache;
}

export function reiniciarCache(): void {
  cache = null;
}

// ------------------------------------------------------------------ iconos de objetos

const iconos = new Map<ItemId, HTMLCanvasElement>();

export function icono(it: ItemId): HTMLCanvasElement {
  const ya = iconos.get(it);
  if (ya) return ya;
  const cv = document.createElement('canvas');
  cv.width = 32;
  cv.height = 32;
  const c = cv.getContext('2d')!;
  const col = ITEMS[it].color;
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(0,0,0,0.6)';
  const roca = (cx: number, cy: number, r: number, color: string) => {
    c.fillStyle = color;
    c.beginPath();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const rr = r * (0.75 + ((k * 37) % 10) / 30);
      c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
    }
    c.closePath();
    c.fill();
    c.stroke();
  };
  switch (it) {
    case 'madera':
      for (const [x, y] of [
        [6, 18],
        [10, 10],
        [14, 20],
      ] as const) {
        c.fillStyle = '#8a5a2c';
        c.fillRect(x, y, 16, 7);
        c.strokeRect(x, y, 16, 7);
        c.fillStyle = '#d0a060';
        c.beginPath();
        c.arc(x + 16, y + 3.5, 3.5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      break;
    case 'piedra':
    case 'hierro':
    case 'cobre':
    case 'carbon':
      roca(12, 18, 8, col);
      roca(21, 13, 7, col);
      if (it !== 'piedra' && it !== 'carbon') {
        c.fillStyle = it === 'hierro' ? '#d0dceb' : '#ffb27a';
        c.fillRect(10, 15, 3, 3);
        c.fillRect(20, 11, 3, 3);
      }
      break;
    case 'placaHierro':
    case 'placaCobre':
      for (let k = 0; k < 3; k++) {
        c.fillStyle = col;
        c.fillRect(6, 18 - k * 5, 20, 7);
        c.strokeRect(6, 18 - k * 5, 20, 7);
      }
      break;
    case 'engranaje': {
      c.fillStyle = col;
      c.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const r = k % 2 ? 11 : 14;
        c.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
      }
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = '#555';
      c.beginPath();
      c.arc(16, 16, 4, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'circuito':
      c.fillStyle = '#2f7a35';
      c.fillRect(4, 8, 24, 16);
      c.strokeRect(4, 8, 24, 16);
      c.fillStyle = '#c8a040';
      c.fillRect(8, 12, 6, 3);
      c.fillRect(18, 17, 6, 3);
      c.fillStyle = '#222';
      c.fillRect(13, 14, 6, 6);
      break;
    case 'municion':
      c.fillStyle = '#6a6a3a';
      c.fillRect(6, 12, 20, 14);
      c.strokeRect(6, 12, 20, 14);
      c.fillStyle = col;
      for (let k = 0; k < 4; k++) c.fillRect(8 + k * 5, 6, 3, 8);
      break;
    case 'cienciaRoja':
    case 'cienciaVerde':
      c.fillStyle = 'rgba(220,230,240,0.5)';
      c.fillRect(13, 4, 6, 8);
      c.beginPath();
      c.moveTo(13, 11);
      c.lineTo(6, 26);
      c.lineTo(26, 26);
      c.lineTo(19, 11);
      c.closePath();
      c.fillStyle = col;
      c.fill();
      c.stroke();
      break;
    case 'bayas':
      for (const [x, y] of [
        [12, 14],
        [19, 13],
        [15, 20],
        [21, 20],
      ] as const) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(x, y, 4.5, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }
      break;
    case 'patata':
      roca(12, 17, 7, col);
      roca(21, 15, 6, col);
      break;
    case 'comida':
      c.fillStyle = '#e8e0d0';
      c.beginPath();
      c.ellipse(16, 20, 13, 7, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(16, 17, 9, 5, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#8a3a2a';
      c.fillRect(12, 15, 3, 3);
      c.fillStyle = '#4a8a3a';
      c.fillRect(18, 16, 3, 2);
      break;
  }
  iconos.set(it, cv);
  return cv;
}

// ------------------------------------------------------------------ edificios

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function cajaMetal(c: Ctx, w: number, h: number, base: string, borde: string): void {
  c.fillStyle = 'rgba(0,0,0,0.3)';
  rr(c, 0.08, 0.14, w - 0.08, h - 0.08, 0.1);
  c.fill();
  c.fillStyle = base;
  rr(c, 0.04, 0.04, w - 0.08, h - 0.1, 0.1);
  c.fill();
  c.lineWidth = 0.05;
  c.strokeStyle = borde;
  c.stroke();
}

function dibujarEdificio(c: Ctx, w: Mundo, e: Edificio, t: number): void {
  const def = EDIFICIOS[e.tipo];
  c.save();
  c.translate(e.x, e.y);
  if (!e.construido) {
    c.globalAlpha = 0.45;
  }
  switch (e.tipo) {
    case 'muroMadera':
    case 'muroPiedra': {
      const madera = e.tipo === 'muroMadera';
      c.fillStyle = madera ? '#7a5230' : '#8a867c';
      c.fillRect(0, 0, 1, 1);
      c.fillStyle = madera ? '#9a6a3c' : '#a39f94';
      if (madera) for (let k = 0; k < 3; k++) c.fillRect(0.05, 0.06 + k * 0.32, 0.9, 0.24);
      else
        for (let k = 0; k < 3; k++) {
          const off = k % 2 ? 0.25 : 0;
          c.fillRect(0.04 + off, 0.06 + k * 0.32, 0.42, 0.26);
          c.fillRect(0.52 + off - (off ? 0.5 : 0), 0.06 + k * 0.32, 0.42, 0.26);
        }
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(0, 0.88, 1, 0.12);
      break;
    }
    case 'puerta':
      c.fillStyle = '#6a4424';
      c.fillRect(0.05, 0.3, 0.9, 0.4);
      c.fillStyle = '#9a6a3c';
      c.fillRect(0.1, 0.35, 0.8, 0.3);
      c.fillStyle = '#d0b060';
      c.fillRect(0.7, 0.45, 0.08, 0.1);
      break;
    case 'cama':
      c.fillStyle = '#6a4424';
      rr(c, 0.1, 0.02, 0.8, 0.96, 0.08);
      c.fill();
      c.fillStyle = '#e8e4dc';
      rr(c, 0.17, 0.08, 0.66, 0.24, 0.06);
      c.fill();
      c.fillStyle = '#4f6fa8';
      c.fillRect(0.14, 0.38, 0.72, 0.56);
      break;
    case 'lampara':
      c.fillStyle = '#555';
      c.fillRect(0.44, 0.3, 0.12, 0.6);
      c.fillStyle = e.activo ? '#ffe9a0' : '#888';
      c.beginPath();
      c.arc(0.5, 0.3, 0.2, 0, Math.PI * 2);
      c.fill();
      break;
    case 'fogata': {
      c.fillStyle = '#6a6660';
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        c.beginPath();
        c.arc(0.5 + Math.cos(a) * 0.34, 0.5 + Math.sin(a) * 0.34, 0.1, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#5a3a1c';
      c.fillRect(0.3, 0.45, 0.4, 0.1);
      const f = 0.85 + Math.sin(t * 13) * 0.1 + Math.sin(t * 7.3) * 0.05;
      c.fillStyle = '#ff7a20';
      c.beginPath();
      c.ellipse(0.5, 0.45, 0.17 * f, 0.24 * f, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffd060';
      c.beginPath();
      c.ellipse(0.5, 0.5, 0.08 * f, 0.13 * f, 0, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'mesaTrabajo':
    case 'mesaInvestigacion': {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(0.1, 0.18, 1.9, 0.8);
      c.fillStyle = '#8a5a30';
      c.fillRect(0.05, 0.1, 1.9, 0.78);
      c.fillStyle = '#a06c3c';
      c.fillRect(0.1, 0.15, 1.8, 0.68);
      if (e.tipo === 'mesaTrabajo') {
        c.fillStyle = '#9097a1';
        c.fillRect(0.3, 0.3, 0.5, 0.12);
        c.fillStyle = '#5a5a5a';
        c.fillRect(1.2, 0.25, 0.15, 0.45);
        c.fillRect(1.05, 0.25, 0.45, 0.12);
      } else {
        c.drawImage(icono('cienciaRoja'), 0.25, 0.15, 0.6, 0.6);
        c.fillStyle = '#e8e4dc';
        c.fillRect(1.1, 0.3, 0.6, 0.4);
        c.fillStyle = '#555';
        for (let k = 0; k < 3; k++) c.fillRect(1.18, 0.38 + k * 0.1, 0.44, 0.03);
      }
      break;
    }
    case 'horno': {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      rr(c, 0.12, 0.2, 1.84, 1.76, 0.2);
      c.fill();
      c.fillStyle = '#7a756c';
      rr(c, 0.06, 0.06, 1.84, 1.8, 0.2);
      c.fill();
      c.fillStyle = '#8f897f';
      for (let k = 0; k < 6; k++) c.fillRect(0.2 + (k % 3) * 0.55, 0.2 + Math.floor(k / 3) * 0.4, 0.45, 0.3);
      c.fillStyle = '#2a2420';
      rr(c, 0.55, 1.05, 0.9, 0.65, 0.3);
      c.fill();
      if (e.activo) {
        const f = 0.8 + Math.sin(t * 11) * 0.15;
        c.fillStyle = `rgba(255,${120 + Math.floor(f * 60)},40,0.95)`;
        rr(c, 0.65, 1.2, 0.7, 0.45 * f, 0.2);
        c.fill();
      }
      break;
    }
    case 'taladro':
    case 'taladroElectrico': {
      const el = e.tipo === 'taladroElectrico';
      cajaMetal(c, 2, 2, el ? '#4f6d8a' : '#8a7a3a', '#1a1a1a');
      c.fillStyle = el ? '#3a536b' : '#6d5f2c';
      c.fillRect(0.25, 0.25, 1.5, 1.5);
      // Cabezal giratorio.
      c.save();
      c.translate(1, 1);
      c.rotate(e.activo ? t * 6 : 0);
      c.fillStyle = '#b8b8b8';
      for (let k = 0; k < 3; k++) {
        c.rotate((Math.PI * 2) / 3);
        c.fillRect(-0.08, 0, 0.16, 0.55);
      }
      c.fillStyle = '#666';
      c.beginPath();
      c.arc(0, 0, 0.22, 0, Math.PI * 2);
      c.fill();
      c.restore();
      // Flecha de salida.
      const [sx, sy] = casillaSalida(e);
      c.fillStyle = '#ffd040';
      c.save();
      c.translate(sx - e.x + 0.5 - DX[e.dir] * 0.55, sy - e.y + 0.5 - DY[e.dir] * 0.55);
      c.rotate((e.dir * Math.PI) / 2);
      c.beginPath();
      c.moveTo(0.18, 0);
      c.lineTo(-0.1, -0.16);
      c.lineTo(-0.1, 0.16);
      c.closePath();
      c.fill();
      c.restore();
      if (!el && e.activo && Math.sin(t * 5 + e.id) > 0.6) {
        c.fillStyle = 'rgba(80,80,80,0.35)';
        c.beginPath();
        c.arc(1.6, 0.3 - ((t * 0.7 + e.id) % 1) * 0.5, 0.2, 0, Math.PI * 2);
        c.fill();
      }
      break;
    }
    case 'ensambladora': {
      cajaMetal(c, 2, 2, '#8f969e', '#2a2a2a');
      c.fillStyle = '#6d747c';
      c.fillRect(0.2, 0.2, 1.6, 1.6);
      c.save();
      c.translate(1, 1);
      c.rotate(e.activo ? t * 2 : 0);
      c.drawImage(icono('engranaje'), -0.55, -0.55, 1.1, 1.1);
      c.restore();
      const r = e.receta ? receta(e.receta) : undefined;
      if (r) {
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(1.25, 1.25, 0.65, 0.65);
        c.drawImage(icono(r.salida), 1.27, 1.27, 0.6, 0.6);
      }
      break;
    }
    case 'cofre':
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(0.12, 0.2, 0.84, 0.76);
      c.fillStyle = '#8a5a2c';
      c.fillRect(0.08, 0.12, 0.84, 0.76);
      c.fillStyle = '#6a4220';
      c.fillRect(0.08, 0.4, 0.84, 0.08);
      c.fillStyle = '#d0b060';
      c.fillRect(0.44, 0.38, 0.12, 0.16);
      break;
    case 'generador': {
      cajaMetal(c, 2, 2, '#7a6a5a', '#1a1a1a');
      c.fillStyle = '#9a8a76';
      rr(c, 0.2, 0.5, 1.6, 1.2, 0.5);
      c.fill();
      c.fillStyle = '#3a3a3a';
      c.fillRect(1.35, 0.1, 0.35, 0.5);
      if (e.activo) {
        c.fillStyle = 'rgba(230,230,230,0.35)';
        const k = (t * 0.8 + e.id) % 1;
        c.beginPath();
        c.arc(1.52, 0.1 - k * 0.8, 0.15 + k * 0.25, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ff9030';
        c.fillRect(0.5, 1.3, 0.4, 0.2);
      }
      break;
    }
    case 'panelSolar': {
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(0.12, 0.16, 1.84, 1.8);
      c.fillStyle = '#1c2f5a';
      c.fillRect(0.06, 0.06, 1.88, 1.86);
      c.strokeStyle = '#5a7ab8';
      c.lineWidth = 0.04;
      for (let k = 1; k < 4; k++) {
        c.beginPath();
        c.moveTo(0.06 + k * 0.47, 0.06);
        c.lineTo(0.06 + k * 0.47, 1.92);
        c.moveTo(0.06, 0.06 + k * 0.47);
        c.lineTo(1.94, 0.06 + k * 0.47);
        c.stroke();
      }
      c.fillStyle = `rgba(255,255,255,${0.08 + luzSolar(w.tick) * 0.12})`;
      c.fillRect(0.06, 0.06, 0.9, 0.9);
      break;
    }
    case 'torreta':
    case 'torretaLaser': {
      const L = e.tipo === 'torretaLaser';
      const s = L ? 2 : 1;
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.beginPath();
      c.arc(s / 2 + 0.05, s / 2 + 0.08, s * 0.44, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = L ? '#5a5f66' : '#6d6a5a';
      c.beginPath();
      c.arc(s / 2, s / 2, s * 0.44, 0, Math.PI * 2);
      c.fill();
      c.save();
      c.translate(s / 2, s / 2);
      c.rotate(e.apunta);
      c.fillStyle = L ? '#9aa0a8' : '#a09a80';
      rr(c, -s * 0.22, -s * 0.2, s * 0.44, s * 0.4, 0.06);
      c.fill();
      c.fillStyle = '#2a2a2a';
      c.fillRect(0, -0.05 * s, s * 0.5, 0.1 * s);
      if (L) {
        c.fillStyle = '#ff4060';
        c.beginPath();
        c.arc(0, 0, 0.12 * s, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
      if (!L) {
        // Munición restante.
        c.fillStyle = 'rgba(0,0,0,0.6)';
        c.fillRect(0.1, 0.86, 0.8, 0.1);
        c.fillStyle = e.balas > 30 ? '#e0c050' : '#e05040';
        c.fillRect(0.1, 0.86, 0.8 * Math.min(1, e.balas / 200), 0.1);
      }
      break;
    }
    case 'faro': {
      cajaMetal(c, 3, 3, '#5a6370', '#1a1a1a');
      c.fillStyle = '#7d8896';
      c.beginPath();
      c.moveTo(1.5, 0.2);
      c.lineTo(2.5, 2.6);
      c.lineTo(0.5, 2.6);
      c.closePath();
      c.fill();
      const pulso = e.activo ? 0.6 + Math.sin(t * 4) * 0.4 : 0.15;
      c.fillStyle = `rgba(120,220,255,${pulso})`;
      c.beginPath();
      c.arc(1.5, 0.55, 0.32, 0, Math.PI * 2);
      c.fill();
      break;
    }
    case 'cinta':
    case 'insertador':
      break;
  }
  c.restore();
  // Plano a medias: barra de progreso.
  if (!e.construido) {
    const falta = Object.values(e.faltan).reduce((s, v) => s + (v ?? 0), 0);
    const total = Object.values(def.coste).reduce((s, v) => s + (v ?? 0), 0);
    const f = falta > 0 ? 0.5 * (1 - falta / total) : 0.5 + 0.5 * (1 - e.trabajo / def.trabajo);
    c.strokeStyle = '#6ab0ff';
    c.lineWidth = 0.05;
    c.setLineDash([0.15, 0.1]);
    c.strokeRect(e.x + 0.03, e.y + 0.03, def.w - 0.06, def.h - 0.06);
    c.setLineDash([]);
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(e.x + 0.1, e.y + def.h - 0.2, def.w - 0.2, 0.1);
    c.fillStyle = '#6ab0ff';
    c.fillRect(e.x + 0.1, e.y + def.h - 0.2, (def.w - 0.2) * f, 0.1);
  } else if (e.hp < def.hp) {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(e.x + 0.1, e.y - 0.18, def.w - 0.2, 0.1);
    c.fillStyle = e.hp / def.hp > 0.5 ? '#6fd06f' : '#e05040';
    c.fillRect(e.x + 0.1, e.y - 0.18, (def.w - 0.2) * (e.hp / def.hp), 0.1);
  }
  if (e.deconstruir) {
    c.strokeStyle = '#ff5040';
    c.lineWidth = 0.1;
    c.beginPath();
    c.moveTo(e.x + 0.2, e.y + 0.2);
    c.lineTo(e.x + def.w - 0.2, e.y + def.h - 0.2);
    c.moveTo(e.x + def.w - 0.2, e.y + 0.2);
    c.lineTo(e.x + 0.2, e.y + def.h - 0.2);
    c.stroke();
  }
}

function dibujarCinta(c: Ctx, e: Edificio, t: number): void {
  c.save();
  c.translate(e.x + 0.5, e.y + 0.5);
  c.rotate((e.dir * Math.PI) / 2);
  c.globalAlpha = e.construido ? 1 : 0.45;
  c.fillStyle = '#3a3a3e';
  c.fillRect(-0.5, -0.42, 1, 0.84);
  c.fillStyle = '#c9a43a';
  c.fillRect(-0.5, -0.46, 1, 0.08);
  c.fillRect(-0.5, 0.38, 1, 0.08);
  c.strokeStyle = '#55555a';
  c.lineWidth = 0.06;
  const off = e.construido ? (t * 2) % 0.5 : 0;
  for (let k = -1; k < 3; k++) {
    const x = -0.5 + k * 0.5 + off;
    if (x < -0.45 || x > 0.4) continue;
    c.beginPath();
    c.moveTo(x - 0.1, -0.25);
    c.lineTo(x + 0.08, 0);
    c.lineTo(x - 0.1, 0.25);
    c.stroke();
  }
  c.restore();
}

function dibujarObjetosCinta(c: Ctx, e: Edificio): void {
  for (const it of e.cinta) {
    const x = e.x + 0.5 + DX[e.dir] * (it.p - 0.5);
    const y = e.y + 0.5 + DY[e.dir] * (it.p - 0.5);
    c.drawImage(icono(it.item), x - 0.25, y - 0.25, 0.5, 0.5);
  }
}

function dibujarInsertador(c: Ctx, e: Edificio): void {
  c.save();
  c.translate(e.x + 0.5, e.y + 0.5);
  c.globalAlpha = e.construido ? 1 : 0.45;
  c.fillStyle = '#5a5a3a';
  rr(c, -0.22, -0.22, 0.44, 0.44, 0.08);
  c.fill();
  // Brazo: de atrás (fase 0) a delante (fase 1).
  const a = (e.dir * Math.PI) / 2 + Math.PI * (1 - e.fase);
  const hx = Math.cos(a) * 0.42;
  const hy = Math.sin(a) * 0.42;
  c.strokeStyle = '#e0b030';
  c.lineWidth = 0.1;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(hx, hy);
  c.stroke();
  c.fillStyle = '#333';
  c.beginPath();
  c.arc(0, 0, 0.09, 0, Math.PI * 2);
  c.fill();
  if (e.mano) c.drawImage(icono(e.mano), hx - 0.2, hy - 0.2, 0.4, 0.4);
  c.restore();
}

// ------------------------------------------------------------------ seres

function dibujarColono(c: Ctx, k: Colono, sel: boolean): void {
  c.save();
  c.translate(k.x, k.y);
  if (sel) {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 0.05;
    c.beginPath();
    c.arc(0, 0, 0.45, 0, Math.PI * 2);
    c.stroke();
  }
  if (k.reclutado) {
    c.fillStyle = 'rgba(220,60,40,0.35)';
    c.beginPath();
    c.arc(0, 0.05, 0.42, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(0, 0.28, 0.25, 0.1, 0, 0, Math.PI * 2);
  c.fill();
  const bob = Math.abs(Math.sin(k.paso)) * 0.04;
  // Cuerpo.
  c.fillStyle = k.color;
  c.beginPath();
  c.ellipse(0, 0.08 - bob, 0.24, 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.5)';
  c.lineWidth = 0.04;
  c.stroke();
  // Cabeza.
  c.fillStyle = '#e6c29a';
  c.beginPath();
  c.arc(0, -0.2 - bob, 0.17, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = k.pelo;
  c.beginPath();
  c.arc(0, -0.25 - bob, 0.17, Math.PI, Math.PI * 2);
  c.fill();
  // Mira hacia donde trabaja.
  const mx = Math.cos(k.mira) * 0.07;
  c.fillStyle = '#222';
  c.fillRect(-0.06 + mx, -0.2 - bob, 0.03, 0.04);
  c.fillRect(0.04 + mx, -0.2 - bob, 0.03, 0.04);
  if (k.reclutado) {
    c.strokeStyle = '#333';
    c.lineWidth = 0.07;
    c.beginPath();
    c.moveTo(0, 0.05);
    c.lineTo(Math.cos(k.mira) * 0.4, 0.05 + Math.sin(k.mira) * 0.4);
    c.stroke();
  }
  if (k.carga) c.drawImage(icono(k.carga.item), 0.12, -0.05, 0.36, 0.36);
  c.restore();
}

function dibujarCriatura(c: Ctx, k: Criatura): void {
  const inf = CRIATURAS[k.tipo];
  const s = inf.tam;
  c.save();
  c.translate(k.x, k.y);
  c.rotate(k.mira);
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(0.05, 0.08, s * 1.1, s * 0.7, 0, 0, Math.PI * 2);
  c.fill();
  // Patas.
  c.strokeStyle = '#2a1a10';
  c.lineWidth = s * 0.12;
  for (let p = 0; p < 3; p++) {
    for (const lado of [-1, 1]) {
      const fase = Math.sin(k.paso + p * 2 + (lado > 0 ? Math.PI : 0)) * 0.25;
      const px = (p - 1) * s * 0.55;
      c.beginPath();
      c.moveTo(px, 0);
      c.lineTo(px + fase * s, lado * s * 1.05);
      c.stroke();
    }
  }
  c.fillStyle = k.golpe > 0 ? '#ffffff' : inf.color;
  c.beginPath();
  c.ellipse(-s * 0.45, 0, s * 0.6, s * 0.5, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = k.golpe > 0 ? '#ffffff' : shade(inf.color);
  c.beginPath();
  c.ellipse(s * 0.35, 0, s * 0.42, s * 0.38, 0, 0, Math.PI * 2);
  c.fill();
  // Mandíbulas.
  c.strokeStyle = '#1a1008';
  c.lineWidth = s * 0.1;
  c.beginPath();
  c.moveTo(s * 0.7, -s * 0.15);
  c.lineTo(s * 1, -s * 0.25);
  c.moveTo(s * 0.7, s * 0.15);
  c.lineTo(s * 1, s * 0.25);
  c.stroke();
  if (k.tipo === 'escupidor') {
    c.fillStyle = '#c8ff60';
    c.beginPath();
    c.arc(-s * 0.5, 0, s * 0.22, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  if (k.hp < k.hpMax) {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(k.x - 0.3, k.y - s - 0.2, 0.6, 0.07);
    c.fillStyle = '#e05040';
    c.fillRect(k.x - 0.3, k.y - s - 0.2, 0.6 * (k.hp / k.hpMax), 0.07);
  }
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.floor(((n >> 16) & 255) * 0.75);
  const g = Math.floor(((n >> 8) & 255) * 0.75);
  const b = Math.floor((n & 255) * 0.75);
  return `rgb(${r},${g},${b})`;
}

function dibujarNido(c: Ctx, n: Nido, t: number): void {
  c.save();
  c.translate(n.x + 1, n.y + 1);
  const p = 1 + Math.sin(t * 2 + n.id) * 0.04;
  const g = c.createRadialGradient(0, 0, 0.2, 0, 0, 1.3 * p);
  g.addColorStop(0, '#5a2a4a');
  g.addColorStop(0.7, '#3a1a30');
  g.addColorStop(1, 'rgba(40,20,30,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, 1.3 * p, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#8a4a7a';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + n.id;
    c.beginPath();
    c.ellipse(Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.28, 0.22, a, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = '#1a0a14';
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + n.id * 2;
    c.beginPath();
    c.arc(Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0.15, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  if (n.hp < n.hpMax) {
    c.fillStyle = 'rgba(0,0,0,0.6)';
    c.fillRect(n.x + 0.2, n.y - 0.3, 1.6, 0.12);
    c.fillStyle = '#c050c0';
    c.fillRect(n.x + 0.2, n.y - 0.3, 1.6 * (n.hp / n.hpMax), 0.12);
  }
}

function dibujarArbol(c: Ctx, x: number, y: number, i: number, t: number): void {
  const vaiven = Math.sin(t * 1.3 + i) * 0.02;
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath();
  c.ellipse(x + 0.6, y + 0.75, 0.45, 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5a3a1c';
  c.fillRect(x + 0.44, y + 0.45, 0.12, 0.4);
  const v = hash(i, 7);
  const cols = v < 0.5 ? ['#2f5a24', '#3d6e2c', '#4d8236'] : ['#28502a', '#356236', '#447a40'];
  const r = 0.42 + v * 0.12;
  c.fillStyle = cols[0]!;
  c.beginPath();
  c.arc(x + 0.5 + vaiven, y + 0.35, r, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = cols[1]!;
  c.beginPath();
  c.arc(x + 0.42 + vaiven, y + 0.28, r * 0.75, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = cols[2]!;
  c.beginPath();
  c.arc(x + 0.36 + vaiven, y + 0.2, r * 0.4, 0, Math.PI * 2);
  c.fill();
}

// ------------------------------------------------------------------ escena

export function dibujar(ctx: Ctx, w: Mundo, cam: Camara, vista: Vista): void {
  const z = cam.z;
  ctx.fillStyle = '#101418';
  ctx.fillRect(0, 0, cam.w, cam.h);
  const x0 = Math.max(0, Math.floor(cam.x - cam.w / 2 / z) - 1);
  const y0 = Math.max(0, Math.floor(cam.y - cam.h / 2 / z) - 1);
  const x1 = Math.min(ANCHO, Math.ceil(cam.x + cam.w / 2 / z) + 1);
  const y1 = Math.min(ALTO, Math.ceil(cam.y + cam.h / 2 / z) + 2);
  const t = vista.tiempo;

  ctx.save();
  ctx.translate(cam.w / 2 - cam.x * z, cam.h / 2 - cam.y * z);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(asegurarCache(w), 0, 0, ANCHO * PX, ALTO * PX, 0, 0, ANCHO * z, ALTO * z);
  ctx.imageSmoothingEnabled = true;
  ctx.scale(z, z);

  const m = w.mapa;
  // Zonas y órdenes.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = idx(x, y);
      const zo = m.zona[i];
      if (zo === Zona.Almacen) {
        ctx.fillStyle = 'rgba(90,150,230,0.16)';
        ctx.fillRect(x, y, 1, 1);
      } else if (zo === Zona.Cultivo) {
        ctx.fillStyle = 'rgba(110,80,40,0.45)';
        ctx.fillRect(x + 0.04, y + 0.04, 0.92, 0.92);
        ctx.fillStyle = 'rgba(70,50,25,0.5)';
        ctx.fillRect(x + 0.1, y + 0.3, 0.8, 0.08);
        ctx.fillRect(x + 0.1, y + 0.62, 0.8, 0.08);
      }
    }
  }
  // Plantas bajas.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = idx(x, y);
      const p = m.planta[i];
      if (p === Planta.Arbusto) {
        ctx.fillStyle = '#3d6a2c';
        ctx.beginPath();
        ctx.arc(x + 0.5, y + 0.55, 0.32, 0, Math.PI * 2);
        ctx.fill();
        if (m.crece[i]! >= 1) {
          ctx.fillStyle = '#c03a7e';
          for (let k = 0; k < 5; k++) ctx.fillRect(x + 0.25 + hash(i, k) * 0.45, y + 0.3 + hash(i, k + 9) * 0.45, 0.09, 0.09);
        }
      } else if (p === Planta.Patata) {
        const g = m.crece[i]!;
        ctx.fillStyle = g >= 1 ? '#7aa83a' : '#5a8a2a';
        const s = 0.1 + g * 0.25;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(x + 0.3 + k * 0.2, y + 0.5 + (k % 2) * 0.1, s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  // Cintas primero (debajo de todo lo demás), luego objetos sueltos.
  const visibles: Edificio[] = [];
  for (const e of w.edificios.values()) {
    const d = EDIFICIOS[e.tipo];
    if (e.x + d.w < x0 || e.y + d.h < y0 || e.x > x1 || e.y > y1) continue;
    visibles.push(e);
  }
  for (const e of visibles) if (e.tipo === 'cinta') dibujarCinta(ctx, e, t);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const p = m.objetos.get(idx(x, y));
      if (!p) continue;
      ctx.drawImage(icono(p.item), x + 0.12, y + 0.08, 0.76, 0.76);
      if (p.n > 1 && z >= 18) {
        ctx.font = `bold ${0.32}px ui-monospace, monospace`;
        ctx.fillStyle = '#000';
        ctx.fillText(String(p.n), x + 0.06, y + 0.97);
        ctx.fillStyle = '#fff';
        ctx.fillText(String(p.n), x + 0.04, y + 0.95);
      }
    }
  }
  for (const e of visibles) if (e.tipo === 'cinta') dibujarObjetosCinta(ctx, e);
  visibles.sort((a, b) => a.y - b.y);
  for (const e of visibles) {
    if (e.tipo === 'cinta') continue;
    if (e.tipo === 'insertador') dibujarInsertador(ctx, e);
    else dibujarEdificio(ctx, w, e, t);
  }
  // Órdenes de talar / minar / cosechar.
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const o = m.orden[idx(x, y)];
      if (!o) continue;
      ctx.strokeStyle = o === Orden.Talar ? '#ffd040' : o === Orden.Minar ? '#ff9040' : '#60e080';
      ctx.lineWidth = 0.06;
      ctx.strokeRect(x + 0.08, y + 0.08, 0.84, 0.84);
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '0.42px ui-monospace, monospace';
      ctx.fillText(o === Orden.Talar ? 'T' : o === Orden.Minar ? 'M' : 'C', x + 0.08, y + 0.42);
    }
  }
  // Nidos, árboles, criaturas, colonos.
  for (const n of w.nidos) if (n.x + 2 >= x0 && n.x <= x1 && n.y + 2 >= y0 && n.y <= y1) dibujarNido(ctx, n, t);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (m.planta[idx(x, y)] === Planta.Arbol) dibujarArbol(ctx, x, y, idx(x, y), t);
  for (const k of w.criaturas) if (k.x >= x0 - 1 && k.x <= x1 + 1 && k.y >= y0 - 1 && k.y <= y1 + 1) dibujarCriatura(ctx, k);
  const selId = vista.seleccion?.c === 'colono' ? vista.seleccion.id : -1;
  for (const k of w.colonos) {
    if (k.muerto) {
      ctx.fillStyle = '#5a1a1a';
      ctx.fillRect(k.x - 0.3, k.y - 0.1, 0.6, 0.25);
      continue;
    }
    dibujarColono(ctx, k, k.id === selId);
  }
  // Disparos y partículas.
  ctx.lineCap = 'round';
  for (const d of w.disparos) {
    ctx.strokeStyle = d.color;
    ctx.globalAlpha = Math.min(1, d.vida * 10);
    ctx.lineWidth = d.laser ? 0.12 : 0.05;
    ctx.beginPath();
    ctx.moveTo(d.x0, d.y0);
    ctx.lineTo(d.x1, d.y1);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of w.particulas) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.vida * 2);
    ctx.fillRect(p.x - 0.05, p.y - 0.05, 0.1, 0.1);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  dibujarNoche(ctx, w, cam);

  ctx.save();
  ctx.translate(cam.w / 2 - cam.x * z, cam.h / 2 - cam.y * z);
  ctx.scale(z, z);
  if (vista.contaminacion) {
    for (let ty = 0; ty < TH; ty++) {
      for (let tx = 0; tx < TW; tx++) {
        const v = m.contaminacion[ty * TW + tx]!;
        if (v < 1) continue;
        ctx.fillStyle = `rgba(150,60,20,${Math.min(0.55, Math.log10(v) * 0.18)})`;
        ctx.fillRect(tx * TROZO, ty * TROZO, TROZO, TROZO);
      }
    }
  }
  // Fantasma del edificio a colocar.
  const f = vista.fantasma;
  if (f) {
    const def = EDIFICIOS[f.tipo];
    ctx.fillStyle = f.valido ? 'rgba(90,200,120,0.35)' : 'rgba(230,70,60,0.35)';
    ctx.fillRect(f.x, f.y, def.w, def.h);
    ctx.strokeStyle = f.valido ? '#6fe08a' : '#ff6a5a';
    ctx.lineWidth = 0.06;
    ctx.strokeRect(f.x, f.y, def.w, def.h);
    if (def.rotable) {
      const cx = f.x + def.w / 2;
      const cy = f.y + def.h / 2;
      ctx.fillStyle = '#ffffff';
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((f.dir * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0.35, 0);
      ctx.lineTo(-0.15, -0.25);
      ctx.lineTo(-0.15, 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  const r = vista.rectangulo;
  if (r) {
    ctx.strokeStyle = r.color;
    ctx.fillStyle = r.color + '30';
    ctx.lineWidth = 0.06;
    const xa = Math.min(r.x0, r.x1);
    const ya = Math.min(r.y0, r.y1);
    ctx.fillRect(xa, ya, Math.abs(r.x1 - r.x0) + 1, Math.abs(r.y1 - r.y0) + 1);
    ctx.strokeRect(xa, ya, Math.abs(r.x1 - r.x0) + 1, Math.abs(r.y1 - r.y0) + 1);
  }
  // Selección.
  const s = vista.seleccion;
  if (s?.c === 'edificio') {
    const e = w.edificios.get(s.id);
    if (e) {
      const d = EDIFICIOS[e.tipo];
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.06;
      ctx.strokeRect(e.x - 0.05, e.y - 0.05, d.w + 0.1, d.h + 0.1);
    }
  } else if (s?.c === 'casilla') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.05;
    ctx.strokeRect(s.i % ANCHO, (s.i / ANCHO) | 0, 1, 1);
  } else if (s?.c === 'criatura') {
    const k = w.criaturas.find((x) => x.id === s.id);
    if (k) {
      ctx.strokeStyle = '#ff6a5a';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.arc(k.x, k.y, CRIATURAS[k.tipo].tam + 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (s?.c === 'nido') {
    const n = w.nidos.find((x) => x.id === s.id);
    if (n) {
      ctx.strokeStyle = '#ff6a5a';
      ctx.lineWidth = 0.06;
      ctx.strokeRect(n.x - 0.2, n.y - 0.2, 2.4, 2.4);
    }
  }
  // Nombres de los colonos.
  if (z >= 20) {
    ctx.font = '0.3px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (const k of w.colonos) {
      if (k.muerto) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const tw = ctx.measureText(k.nombre).width + 0.16;
      ctx.fillRect(k.x - tw / 2, k.y + 0.36, tw, 0.36);
      ctx.fillStyle = k.reclutado ? '#ffb0a0' : '#ffffff';
      ctx.fillText(k.nombre, k.x, k.y + 0.63);
      if (k.hp < 100) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(k.x - 0.3, k.y - 0.55, 0.6, 0.07);
        ctx.fillStyle = '#e05040';
        ctx.fillRect(k.x - 0.3, k.y - 0.55, 0.6 * (k.hp / 100), 0.07);
      }
    }
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

let capaNoche: HTMLCanvasElement | null = null;

function dibujarNoche(ctx: Ctx, w: Mundo, cam: Camara): void {
  const sol = luzSolar(w.tick);
  const oscuridad = Math.max(0, 0.62 - sol * 0.9);
  if (oscuridad <= 0.01) return;
  if (!capaNoche) capaNoche = document.createElement('canvas');
  const dpr = ctx.getTransform().a;
  const W = Math.ceil(cam.w * dpr);
  const H = Math.ceil(cam.h * dpr);
  if (capaNoche.width !== W || capaNoche.height !== H) {
    capaNoche.width = W;
    capaNoche.height = H;
  }
  const c = capaNoche.getContext('2d')!;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, W, H);
  c.fillStyle = `rgba(8,12,34,${oscuridad})`;
  c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'destination-out';
  const z = cam.z * dpr;
  const ox = (cam.w / 2 - cam.x * cam.z) * dpr;
  const oy = (cam.h / 2 - cam.y * cam.z) * dpr;
  const luz = (x: number, y: number, r: number, f = 1) => {
    const px = ox + x * z;
    const py = oy + y * z;
    const rr2 = r * z;
    if (px < -rr2 || py < -rr2 || px > W + rr2 || py > H + rr2) return;
    const g = c.createRadialGradient(px, py, 0, px, py, rr2);
    g.addColorStop(0, `rgba(0,0,0,${f})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(px - rr2, py - rr2, rr2 * 2, rr2 * 2);
  };
  for (const e of w.edificios.values()) {
    const d = EDIFICIOS[e.tipo];
    if (!e.construido) continue;
    if (e.tipo === 'fogata') luz(e.x + 0.5, e.y + 0.5, 5, 1);
    else if (e.tipo === 'lampara' && e.activo) luz(e.x + 0.5, e.y + 0.5, d.luz ?? 6, 1);
    else if ((e.tipo === 'horno' || e.tipo === 'generador') && e.activo) luz(e.x + 1, e.y + 1, 3, 0.7);
    else if (e.tipo === 'faro' && e.activo) luz(e.x + 1.5, e.y + 1.5, 8, 1);
  }
  for (const k of w.colonos) if (!k.muerto) luz(k.x, k.y, 1.8, 0.5);
  for (const d of w.disparos) luz(d.x1, d.y1, 1.2, 0.8);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(capaNoche, 0, 0);
  ctx.restore();
}

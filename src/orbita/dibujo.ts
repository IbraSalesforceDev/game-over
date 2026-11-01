/**
 * Dibujo de las piezas, en vectorial plano.
 *
 * Todo se dibuja en metros con el lienzo ya escalado: x centrada en el eje de
 * la nave, y hacia abajo desde la punta. Los colores salen de la raza: aluminio
 * blanco con naranja para los humanos, caparazón violeta con brillos turquesa
 * para la Colmena.
 */
import type { Nave, Nodo } from './nave';
import type { InfoRaza, Parte } from './partes';

type Ctx = CanvasRenderingContext2D;
type Colores = InfoRaza['colores'];

function linea(ctx: Ctx, ancho: number): void {
  ctx.lineWidth = ancho;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(10,12,18,0.85)';
}

function metal(ctx: Ctx, x0: number, x1: number, a: string, b: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, b);
  g.addColorStop(0.35, a);
  g.addColorStop(0.6, a);
  g.addColorStop(1, b);
  return g;
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export interface OpcionesParte {
  /** Fracción de combustible, para la franja de nivel. */
  nivel?: number;
  alien: boolean;
  /** Fracción de vida: por debajo de 1 se oscurece. */
  vida?: number;
  /** Espesor de línea en metros (depende del zoom). */
  trazo: number;
}

/** Una pieza de la pila, ocupando [-w/2, w/2] × [y, y + h]. */
export function dibujarParte(ctx: Ctx, p: Parte, y: number, c: Colores, o: OpcionesParte): void {
  const w = p.ancho;
  const h = p.alto;
  const x = -w / 2;
  linea(ctx, o.trazo);
  const casco = metal(ctx, x, x + w, c.casco, c.casco2);
  switch (p.forma) {
    case 'capsula': {
      ctx.beginPath();
      ctx.moveTo(-w * 0.22, y);
      ctx.lineTo(w * 0.22, y);
      ctx.lineTo(w / 2, y + h);
      ctx.lineTo(-w / 2, y + h);
      ctx.closePath();
      ctx.fillStyle = casco;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(-w / 2, y + h * 0.86, w, h * 0.14);
      // Ventanilla.
      ctx.beginPath();
      ctx.arc(0, y + h * 0.45, w * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = c.brillo;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.acento;
      ctx.fillRect(-w * 0.3, y + h * 0.7, w * 0.6, h * 0.06);
      break;
    }
    case 'nucleo': {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.55, y + h * 0.05, w * 0.6, y + h * 0.8, w / 2, y + h);
      ctx.lineTo(-w / 2, y + h);
      ctx.bezierCurveTo(-w * 0.6, y + h * 0.8, -w * 0.55, y + h * 0.05, 0, y);
      ctx.closePath();
      ctx.fillStyle = casco;
      ctx.fill();
      ctx.stroke();
      // El ojo.
      ctx.beginPath();
      ctx.ellipse(0, y + h * 0.5, w * 0.2, h * 0.11, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.acento;
      ctx.shadowColor = c.brillo;
      ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(0, y + h * 0.5, w * 0.05, h * 0.09, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.oscuro;
      ctx.fill();
      break;
    }
    case 'sonda': {
      ctx.beginPath();
      ctx.moveTo(-w * 0.35, y);
      ctx.lineTo(w * 0.35, y);
      ctx.lineTo(w / 2, y + h);
      ctx.lineTo(-w / 2, y + h);
      ctx.closePath();
      ctx.fillStyle = c.oscuro;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.brillo;
      ctx.fillRect(-w * 0.12, y + h * 0.35, w * 0.24, h * 0.3);
      break;
    }
    case 'tanque': {
      ctx.fillStyle = casco;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x, y, w, Math.min(0.12, h * 0.1));
      ctx.fillRect(x, y + h - Math.min(0.12, h * 0.1), w, Math.min(0.12, h * 0.1));
      if (h > 1.5) {
        ctx.fillStyle = c.acento;
        ctx.fillRect(x, y + h * 0.18, w, h * 0.05);
      }
      nivel(ctx, x + w * 0.78, y + h * 0.2, w * 0.08, h * 0.6, o.nivel, c);
      break;
    }
    case 'vejiga': {
      rrect(ctx, x, y, w, h, w * 0.45);
      ctx.fillStyle = casco;
      ctx.fill();
      ctx.stroke();
      // Venas.
      ctx.strokeStyle = c.acento;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = o.trazo * 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        const xx = x + w * (0.25 + i * 0.25);
        ctx.moveTo(xx, y + h * 0.12);
        ctx.bezierCurveTo(xx + w * 0.12, y + h * 0.4, xx - w * 0.12, y + h * 0.6, xx, y + h * 0.88);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      nivel(ctx, x + w * 0.42, y + h * 0.18, w * 0.16, h * 0.64, o.nivel, c);
      break;
    }
    case 'motor':
    case 'motorVacio':
    case 'motorGrande': {
      const cuello = p.forma === 'motorVacio' ? 0.25 : 0.35;
      const campana = p.forma === 'motorVacio' ? 0.62 : 0.4;
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x + w * 0.1, y, w * 0.8, h * (1 - campana));
      ctx.strokeRect(x + w * 0.1, y, w * 0.8, h * (1 - campana));
      ctx.beginPath();
      ctx.moveTo(-w * cuello, y + h * (1 - campana));
      ctx.lineTo(w * cuello, y + h * (1 - campana));
      ctx.lineTo(w * (o.alien ? 0.42 : 0.48), y + h);
      ctx.lineTo(-w * (o.alien ? 0.42 : 0.48), y + h);
      ctx.closePath();
      const gb = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      gb.addColorStop(0, '#2a2d33');
      gb.addColorStop(0.5, o.alien ? '#6a3f86' : '#8b9099');
      gb.addColorStop(1, '#2a2d33');
      ctx.fillStyle = gb;
      ctx.fill();
      ctx.stroke();
      if (o.alien) {
        ctx.fillStyle = c.acento;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-w * 0.3, y + h * 0.15, w * 0.6, h * 0.06);
        ctx.globalAlpha = 1;
      }
      break;
    }
    case 'motorSolido': {
      // Como pieza de la pila: el mismo dibujo que en radial, centrado.
      solido(ctx, -w / 2, y, w, h, c, o);
      break;
    }
    case 'desacoplador': {
      ctx.fillStyle = '#2c2f36';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#e8c547';
      const n = 6;
      for (let i = 0; i < n; i += 2) ctx.fillRect(x + (w / n) * i, y, w / n, h);
      ctx.strokeRect(x, y, w, h);
      break;
    }
    case 'cono': {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(w * 0.5, y + h * 0.35, w / 2, y + h);
      ctx.lineTo(-w / 2, y + h);
      ctx.quadraticCurveTo(-w * 0.5, y + h * 0.35, 0, y);
      ctx.closePath();
      ctx.fillStyle = casco;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.acento;
      ctx.fillRect(-w / 2, y + h * 0.85, w, h * 0.15);
      break;
    }
    case 'paracaidas': {
      ctx.beginPath();
      ctx.moveTo(-w / 2, y + h);
      ctx.quadraticCurveTo(-w / 2, y, 0, y);
      ctx.quadraticCurveTo(w / 2, y, w / 2, y + h);
      ctx.closePath();
      ctx.fillStyle = '#d6532f';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'rueda': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.arc(0, y + h / 2, h * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = c.acento;
      ctx.fill();
      break;
    }
    case 'bodega': {
      ctx.fillStyle = casco;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.strokeStyle = c.oscuro;
      ctx.lineWidth = o.trazo;
      ctx.beginPath();
      ctx.moveTo(0, y + h * 0.1);
      ctx.lineTo(0, y + h * 0.9);
      ctx.stroke();
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.06, h * 0.8);
      ctx.fillRect(x + w * 0.84, y + h * 0.1, w * 0.06, h * 0.8);
      ctx.fillStyle = c.acento;
      ctx.fillRect(x + w * 0.3, y + h * 0.45, w * 0.4, h * 0.1);
      break;
    }
    case 'refineria': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = casco;
      ctx.fillRect(x + w * 0.12, y + h * 0.15, w * 0.3, h * 0.7);
      ctx.fillRect(x + w * 0.58, y + h * 0.15, w * 0.3, h * 0.7);
      ctx.fillStyle = c.acento;
      ctx.fillRect(x + w * 0.42, y + h * 0.4, w * 0.16, h * 0.2);
      break;
    }
    case 'bateria': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#f2d14a';
      ctx.fillRect(x + w * 0.1, y + h * 0.25, w * 0.8, h * 0.5);
      break;
    }
    case 'blindaje': {
      ctx.fillStyle = o.alien ? casco : metal(ctx, x, x + w, '#8e959e', '#5b6169');
      if (o.alien) {
        rrect(ctx, x - 0.05, y, w + 0.1, h, h * 0.4);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = c.oscuro;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(x + (w / 4) * i, y + h * 0.15);
          ctx.lineTo(x + (w / 4) * i - w * 0.05, y + h * 0.85);
          ctx.stroke();
        }
      } else {
        ctx.fillRect(x - 0.05, y, w + 0.1, h);
        ctx.strokeRect(x - 0.05, y, w + 0.1, h);
        ctx.fillStyle = '#3d4249';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(x + w * (0.15 + i * 0.233), y + h / 2, Math.min(0.06, h * 0.1), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'escudo': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.ellipse(0, y + h / 2, w * 0.35, h * 0.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = c.brillo;
      ctx.shadowColor = c.brillo;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    default: {
      // Las radiales montadas en la pila se dibujan como su silueta lateral.
      dibujarRadial(ctx, p, -w / 2, y, 1, c, o);
    }
  }
  if (o.vida !== undefined && o.vida < 0.999) {
    ctx.fillStyle = `rgba(20,0,0,${(1 - o.vida) * 0.55})`;
    ctx.fillRect(x, y, w, h);
  }
}

function nivel(ctx: Ctx, x: number, y: number, w: number, h: number, f: number | undefined, c: Colores): void {
  if (f === undefined) return;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = c.acento;
  ctx.fillRect(x, y + h * (1 - f), w, h * f);
}

function solido(ctx: Ctx, x: number, y: number, w: number, h: number, c: Colores, o: OpcionesParte): void {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.quadraticCurveTo(x + w, y + w * 0.3, x + w, y + w * 0.7);
  ctx.lineTo(x + w, y + h * 0.88);
  ctx.lineTo(x, y + h * 0.88);
  ctx.lineTo(x, y + w * 0.7);
  ctx.quadraticCurveTo(x, y + w * 0.3, x + w / 2, y);
  ctx.closePath();
  ctx.fillStyle = o.alien ? metal(ctx, x, x + w, c.casco, c.oscuro) : metal(ctx, x, x + w, '#f3f1ea', '#b9b6ad');
  ctx.fill();
  ctx.stroke();
  if (!o.alien) {
    ctx.fillStyle = '#c4382a';
    for (let i = 0; i < 3; i++) ctx.fillRect(x, y + h * (0.3 + i * 0.18), w, h * 0.06);
  } else {
    ctx.fillStyle = c.acento;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h * (0.3 + i * 0.14), w * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.88);
  ctx.lineTo(x + w * 0.75, y + h * 0.88);
  ctx.lineTo(x + w * 0.9, y + h);
  ctx.lineTo(x + w * 0.1, y + h);
  ctx.closePath();
  ctx.fillStyle = '#33363c';
  ctx.fill();
  ctx.stroke();
  nivel(ctx, x + w * 0.4, y + h * 0.25, w * 0.2, h * 0.5, o.nivel, c);
}

/**
 * Una pieza radial, con su borde interior en `x` (lado +1: se extiende hacia la
 * derecha; -1: hacia la izquierda, en espejo).
 */
export function dibujarRadial(ctx: Ctx, p: Parte, x: number, y: number, lado: 1 | -1, c: Colores, o: OpcionesParte): void {
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(lado, 1);
  const w = p.ancho;
  const h = p.alto;
  linea(ctx, o.trazo);
  switch (p.forma) {
    case 'aleta': {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + h * 0.75);
      ctx.lineTo(w, y + h);
      ctx.lineTo(0, y + h);
      ctx.closePath();
      ctx.fillStyle = o.alien ? c.casco2 : c.acento;
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'motorSolido':
      solido(ctx, 0, y, w, h, c, o);
      break;
    case 'patas': {
      ctx.strokeStyle = c.oscuro;
      ctx.lineWidth = Math.max(o.trazo * 2, 0.12);
      ctx.beginPath();
      ctx.moveTo(0, y + h * 0.1);
      ctx.lineTo(w * 1.2, y + h * 1.1);
      ctx.moveTo(0, y + h * 0.7);
      ctx.lineTo(w * 0.9, y + h * 0.85);
      ctx.stroke();
      ctx.fillStyle = c.casco2;
      ctx.fillRect(w * 0.8, y + h * 1.05, w * 0.8, 0.12);
      break;
    }
    case 'taladro': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(0, y + h * 0.2, w * 0.5, h * 0.6);
      ctx.strokeRect(0, y + h * 0.2, w * 0.5, h * 0.6);
      ctx.beginPath();
      ctx.moveTo(w * 0.5, y + h * 0.15);
      ctx.lineTo(w, y + h * 0.5);
      ctx.lineTo(w * 0.5, y + h * 0.85);
      ctx.closePath();
      ctx.fillStyle = o.alien ? c.acento : '#c9a24a';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'panel': {
      ctx.fillStyle = c.oscuro;
      ctx.fillRect(0, y + h * 0.45, w * 0.3, h * 0.1);
      ctx.fillStyle = o.alien ? '#2d8f5f' : '#1d3f7a';
      ctx.fillRect(w * 0.3, y, w * 0.7, h);
      ctx.strokeRect(w * 0.3, y, w * 0.7, h);
      ctx.strokeStyle = o.alien ? '#7bffb0' : '#6aa0ff';
      ctx.lineWidth = o.trazo * 0.6;
      for (let i = 1; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(w * 0.3, y + (h / 6) * i);
        ctx.lineTo(w, y + (h / 6) * i);
        ctx.stroke();
      }
      break;
    }
    case 'canon':
    case 'defensaPuntual': {
      ctx.fillStyle = c.oscuro;
      ctx.beginPath();
      ctx.arc(w * 0.4, y + h * 0.5, w * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#9097a1';
      ctx.fillRect(w * 0.3, y - h * 0.05, w * 0.2, h * 0.55);
      ctx.strokeRect(w * 0.3, y - h * 0.05, w * 0.2, h * 0.55);
      break;
    }
    case 'misil': {
      ctx.fillStyle = c.casco2;
      ctx.fillRect(0, y + h * 0.15, w, h * 0.85);
      ctx.strokeRect(0, y + h * 0.15, w, h * 0.85);
      ctx.fillStyle = o.alien ? c.acento : '#d84a3a';
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(w * (0.25 + i * 0.5), y);
        ctx.lineTo(w * (0.43 + i * 0.5), y + h * 0.18);
        ctx.lineTo(w * (0.07 + i * 0.5), y + h * 0.18);
        ctx.closePath();
        ctx.fill();
      }
      break;
    }
    case 'rayo': {
      ctx.fillStyle = c.casco2;
      ctx.beginPath();
      ctx.ellipse(w * 0.45, y + h * 0.55, w * 0.45, h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = c.brillo;
      ctx.shadowColor = c.brillo;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(w * 0.45, y + h * 0.18, w * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      break;
    }
    default: {
      ctx.fillStyle = c.casco2;
      ctx.fillRect(0, y, w, h);
      ctx.strokeRect(0, y, w, h);
    }
  }
  ctx.restore();
}

/**
 * La nave entera en coordenadas locales: (0,0) en el centro de masas, punta
 * hacia -y. `trazo` es el ancho de línea en metros.
 */
export function dibujarNave(ctx: Ctx, n: Nave, trazo: number, opciones: { llama: number; tiempo: number } = { llama: 0, tiempo: 0 }): void {
  const g = n.geometria;
  const c = n.info.colores;
  const alien = n.raza === 'alien';
  const ini = n.inicioEtapa();
  ctx.save();
  ctx.translate(0, -g.ycm);
  // Llamas primero, detrás de todo.
  n.nodos.forEach((x, i) => {
    const y = g.ys[i] ?? 0;
    if (i < ini || !n.encendida) return;
    if (x.parte.empuje) {
      const activa = x.parte.solido ? x.comb > 0 : n.acel > 0 && (n.combustibleEtapa() > 0 || n.combustibleInfinito);
      if (activa) llama(ctx, 0, y + x.parte.alto, x.parte.ancho * 0.85, x.parte.solido ? 1 : n.acel, c, opciones, x.parte.forma === 'motorVacio');
    }
    if (x.radial?.empuje && x.combRadial > 0) {
      const off = x.parte.ancho / 2 + x.radial.ancho / 2;
      const yb = y + x.parte.alto / 2 + x.radial.alto / 2;
      llama(ctx, off, yb, x.radial.ancho * 0.8, 1, c, opciones, false);
      llama(ctx, -off, yb, x.radial.ancho * 0.8, 1, c, opciones, false);
    }
  });
  if (n.paracaidas) dosel(ctx, g, n);
  n.nodos.forEach((x: Nodo, i) => {
    const y = g.ys[i] ?? 0;
    if (x.radial) {
      const yr = y + x.parte.alto / 2 - x.radial.alto / 2;
      const vida = x.hpRadial / (x.radial.hp * 2);
      const op = { alien, trazo, vida, nivel: x.radial.combustible ? x.combRadial / (x.radial.combustible * 2) : undefined };
      dibujarRadial(ctx, x.radial, x.parte.ancho / 2, yr, 1, c, op);
      dibujarRadial(ctx, x.radial, -x.parte.ancho / 2, yr, -1, c, op);
    }
    const capacidad = x.parte.combustible;
    dibujarParte(ctx, x.parte, y, c, { alien, trazo, vida: x.hp / x.parte.hp, nivel: capacidad ? x.comb / capacidad : undefined });
  });
  ctx.restore();
}

function llama(ctx: Ctx, x: number, y: number, w: number, fuerza: number, c: Colores, o: { tiempo: number }, vacio: boolean): void {
  const parpadeo = 0.85 + Math.sin(o.tiempo * 47 + x * 13) * 0.08 + Math.sin(o.tiempo * 31) * 0.07;
  const largo = w * (2.4 + fuerza * 3.5) * parpadeo;
  const ancho = w * (vacio ? 1.2 : 0.9);
  const g = ctx.createLinearGradient(0, y, 0, y + largo);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.15, c.llama);
  g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.35, y);
  ctx.quadraticCurveTo(x - ancho * 0.6, y + largo * 0.4, x, y + largo);
  ctx.quadraticCurveTo(x + ancho * 0.6, y + largo * 0.4, x + w * 0.35, y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function dosel(ctx: Ctx, g: { ys: number[] }, n: Nave): void {
  const i = n.nodos.findIndex((x) => x.parte.paracaidas);
  if (i < 0) return;
  const y = g.ys[i] ?? 0;
  const r = 9;
  ctx.save();
  ctx.strokeStyle = 'rgba(230,230,230,0.7)';
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  for (const s of [-1, -0.5, 0, 0.5, 1]) {
    ctx.moveTo(0, y);
    ctx.lineTo(s * r, y - 11);
  }
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r, y - 11);
  ctx.quadraticCurveTo(0, y - 22, r, y - 11);
  ctx.quadraticCurveTo(0, y - 13, -r, y - 11);
  ctx.fillStyle = '#e0592e';
  ctx.fill();
  ctx.fillStyle = '#f3efe6';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, y - 15.5);
  ctx.quadraticCurveTo(0, y - 20, r * 0.35, y - 15.5);
  ctx.quadraticCurveTo(0, y - 13.5, -r * 0.35, y - 15.5);
  ctx.fill();
  ctx.restore();
}

/** Icono de una pieza para el catálogo del hangar. */
export function iconoParte(p: Parte, info: InfoRaza, lado = 56): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = lado * dpr;
  cv.height = lado * dpr;
  cv.style.width = `${lado}px`;
  cv.style.height = `${lado}px`;
  const ctx = cv.getContext('2d')!;
  const radial = p.montaje === 'radial';
  const ancho = radial ? p.ancho * 1.6 : p.ancho;
  const k = (lado * dpr * 0.8) / Math.max(ancho, p.alto);
  ctx.translate((lado * dpr) / 2, (lado * dpr) / 2);
  ctx.scale(k, k);
  const op = { alien: info.id === 'alien', trazo: 1.2 / k * dpr, nivel: p.combustible ? 1 : undefined };
  if (radial) dibujarRadial(ctx, p, -p.ancho / 2, -p.alto / 2, 1, info.colores, op);
  else dibujarParte(ctx, p, -p.alto / 2, info.colores, op);
  return cv;
}

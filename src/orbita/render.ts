/**
 * El dibujo del vuelo: cielo, estrellas, planetas con relieve, asteroides,
 * estaciones, naves, proyectiles, partículas, el mapa de órbitas y el HUD.
 *
 * Una sola vista con zoom continuo. Cerca del suelo la cámara gira para que el
 * planeta quede abajo; al alejarse se endereza y aparecen las órbitas.
 */
import { dibujarNave } from './dibujo';
import { telemetria } from './fisica';
import { costePaz } from './ia';
import type { Vuelo } from './juego';
import { elementos, puntosConica } from './kepler';
import { MINERALES, masaInventario } from './mercado';
import type { Nave } from './nave';
import { RAZAS } from './partes';
import { hpEstacion, hpMaxEstacion } from './partida';
import {
  ANGULO_BASE,
  CUERPOS,
  type Cuerpo,
  G0,
  densidad,
  dominante,
  natalDe,
  posCuerpo,
  posOrbita,
  relieve,
  velCuerpo,
} from './sistema';
import { type V, angulo, clamp, difAngulo, largo, lerp, resta, rng, unit } from './vec';

type Ctx = CanvasRenderingContext2D;

export interface Camara {
  centro: V;
  /** Píxeles por metro. */
  zoom: number;
  /** La dirección del mundo que queda «arriba» en pantalla es rot + π/2. */
  rot: number;
  w: number;
  h: number;
}

/** Por debajo de este zoom se ve el mapa de órbitas. */
export const ZOOM_MAPA = 0.02;

export function aPantalla(cam: Camara, p: V): V {
  const dx = p.x - cam.centro.x;
  const dy = p.y - cam.centro.y;
  const c = Math.cos(-cam.rot);
  const s = Math.sin(-cam.rot);
  return { x: cam.w / 2 + (dx * c - dy * s) * cam.zoom, y: cam.h / 2 - (dx * s + dy * c) * cam.zoom };
}

export function aMundo(cam: Camara, p: V): V {
  const x = (p.x - cam.w / 2) / cam.zoom;
  const y = -(p.y - cam.h / 2) / cam.zoom;
  const c = Math.cos(cam.rot);
  const s = Math.sin(cam.rot);
  return { x: cam.centro.x + x * c - y * s, y: cam.centro.y + x * s + y * c };
}

const ESTRELLAS = (() => {
  const r = rng(4242);
  const out: { x: number; y: number; b: number; s: number }[] = [];
  for (let i = 0; i < 420; i++) out.push({ x: r(), y: r(), b: 0.3 + r() * 0.7, s: r() < 0.08 ? 1.6 : 1 });
  return out;
})();

function mezcla(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (x: number, sh: number) => (x >> sh) & 255;
  const r = Math.round(lerp(ch(pa, 16), ch(pb, 16), t));
  const g = Math.round(lerp(ch(pa, 8), ch(pb, 8), t));
  const bl = Math.round(lerp(ch(pa, 0), ch(pb, 0), t));
  return `rgb(${r},${g},${bl})`;
}

export function fmtDist(m: number): string {
  if (!isFinite(m)) return '∞';
  const a = Math.abs(m);
  if (a < 1000) return `${m.toFixed(0)} m`;
  if (a < 1e6) return `${(m / 1000).toFixed(a < 1e4 ? 2 : 1)} km`;
  return `${(m / 1e6).toFixed(2)} Mm`;
}

export function fmtTiempo(s: number): string {
  if (!isFinite(s)) return '—';
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${ss}s`;
  return `${m}m ${ss}s`;
}

/** Ajusta la cámara a la nave: centro, giro suave según la altitud. */
export function seguir(cam: Camara, vu: Vuelo, dt: number): void {
  const n = vu.jugador;
  cam.centro = { ...n.pos };
  const c = dominante(n.pos, vu.t);
  const rel = resta(n.pos, posCuerpo(c, vu.t));
  const objetivo = cam.zoom > ZOOM_MAPA * 5 ? angulo(rel) - Math.PI / 2 : 0;
  const d = difAngulo(cam.rot, objetivo);
  cam.rot += d * Math.min(1, dt * 4);
}

// ------------------------------------------------------------ escena

export function dibujar(ctx: Ctx, vu: Vuelo, cam: Camara, tReal: number, opciones: { ayuda: boolean }): void {
  const n = vu.jugador;
  const tel = telemetria(n, vu.t);
  const mapa = cam.zoom < ZOOM_MAPA;

  // Cielo: negro en el espacio, color de la atmósfera cerca del suelo.
  const cc = dominante(cam.centro, vu.t);
  const altCam = largo(resta(cam.centro, posCuerpo(cc, vu.t))) - cc.radio;
  const rho = cc.atm && !mapa ? densidad(cc, altCam) / cc.atm.rho0 : 0;
  const cielo = cc.atm ? mezcla('#04060c', cc.atm.colorBajo, Math.pow(clamp(rho, 0, 1), 0.6)) : '#04060c';
  ctx.fillStyle = cielo;
  ctx.fillRect(0, 0, cam.w, cam.h);

  // Estrellas, giran con la cámara.
  const brillo = 1 - clamp(rho * 2.5, 0, 1);
  if (brillo > 0.02) {
    const L = Math.hypot(cam.w, cam.h);
    const cr = Math.cos(-cam.rot);
    const sr = Math.sin(-cam.rot);
    for (const e of ESTRELLAS) {
      const x = (e.x - 0.5) * L;
      const y = (e.y - 0.5) * L;
      const sx = cam.w / 2 + x * cr - y * sr;
      const sy = cam.h / 2 + x * sr + y * cr;
      if (sx < 0 || sy < 0 || sx > cam.w || sy > cam.h) continue;
      ctx.fillStyle = `rgba(220,230,255,${e.b * brillo})`;
      ctx.fillRect(sx, sy, e.s, e.s);
    }
  }

  if (mapa) dibujarOrbitasCuerpos(ctx, vu, cam);
  for (const c of CUERPOS) dibujarCuerpo(ctx, vu, cam, c, mapa);
  dibujarAsteroides(ctx, vu, cam, mapa);
  dibujarEstaciones(ctx, vu, cam, mapa);
  if (mapa) dibujarTrayectoria(ctx, vu, cam);

  // Partículas.
  ctx.save();
  for (const q of vu.particulas) {
    const p = aPantalla(cam, q.pos);
    if (p.x < -50 || p.y < -50 || p.x > cam.w + 50 || p.y > cam.h + 50) continue;
    const edad = 1 - q.vida / q.max;
    const r = Math.max(0.8, q.tam * (1 + edad * q.crece) * cam.zoom);
    ctx.globalAlpha = clamp(q.vida / q.max, 0, 1) * (q.color === '#555' || q.color === '#9a9aa0' ? 0.35 : 0.9);
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.min(r, 400), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Proyectiles.
  for (const pr of vu.proyectiles) {
    const p = aPantalla(cam, pr.pos);
    if (p.x < -20 || p.y < -20 || p.x > cam.w + 20 || p.y > cam.h + 20) continue;
    const col = RAZAS[pr.raza].colores.llama;
    if (pr.tipo === 'misil') {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      const rel = resta(pr.vel, vu.jugador.vel);
      const u = unit(rel);
      const q = aPantalla(cam, { x: pr.pos.x - u.x * 12 / Math.max(cam.zoom, 0.3), y: pr.pos.y - u.y * 12 / Math.max(cam.zoom, 0.3) });
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  // Naves.
  for (const x of vu.naves) dibujarUnaNave(ctx, vu, cam, x, tReal);

  // Rayos.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const x of vu.naves) {
    for (const r of x.rayos) {
      const a = aPantalla(cam, r.desde);
      const b = aPantalla(cam, r.hasta);
      ctx.strokeStyle = r.color;
      ctx.shadowColor = r.color;
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3 + Math.sin(tReal * 60) * 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  ctx.restore();

  dibujarIndicadores(ctx, vu, cam);
  dibujarHud(ctx, vu, cam, tel, opciones);
}

function dibujarOrbitasCuerpos(ctx: Ctx, vu: Vuelo, cam: Camara): void {
  ctx.save();
  ctx.lineWidth = 1;
  for (const c of CUERPOS) {
    if (!c.orbita) continue;
    const padre = aPantalla(cam, posCuerpo(CUERPOS.find((x) => x.id === c.orbita!.padre)!, vu.t));
    ctx.strokeStyle = c.natal === 'alien' ? 'rgba(180,120,255,0.35)' : 'rgba(160,180,210,0.3)';
    ctx.beginPath();
    ctx.arc(padre.x, padre.y, c.orbita.radio * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
    // Esfera de influencia.
    const p = aPantalla(cam, posCuerpo(c, vu.t));
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(160,180,210,0.15)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, c.soi * cam.zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function dibujarCuerpo(ctx: Ctx, vu: Vuelo, cam: Camara, c: Cuerpo, mapa: boolean): void {
  const centro = posCuerpo(c, vu.t);
  const p = aPantalla(cam, centro);
  const rp = c.radio * cam.zoom;
  const diag = Math.hypot(cam.w, cam.h);
  const dCam = largo(resta(cam.centro, centro));
  // Fuera de pantalla del todo.
  const borde = (c.atm ? c.radio + c.atm.techo : c.radio) * cam.zoom;
  if (Math.hypot(p.x - cam.w / 2, p.y - cam.h / 2) - borde > diag) {
    return;
  }
  // Halo de la atmósfera.
  if (c.atm) {
    const ra = (c.radio + c.atm.techo) * cam.zoom;
    if (ra < 1e6) {
      const g = ctx.createRadialGradient(p.x, p.y, Math.max(0, rp * 0.98), p.x, p.y, ra);
      g.addColorStop(0, c.atm.colorBajo + 'cc');
      g.addColorStop(1, c.atm.colorBajo + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, ra, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const cerca = rp > diag * 3 && dCam - c.radio < (diag / cam.zoom) * 2;
  if (!cerca) {
    const r = Math.max(rp, mapa ? 3 : 1);
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r);
    g.addColorStop(0, c.colorSuelo);
    g.addColorStop(1, c.colorRoca);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    if (mapa) {
      ctx.fillStyle = 'rgba(220,230,245,0.85)';
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(c.nombre, p.x, p.y + r + 14);
    }
    return;
  }
  // Relieve del tramo visible.
  const angCam = angulo(resta(cam.centro, centro));
  const span = Math.min(Math.PI, ((diag / cam.zoom) / c.radio) * 0.9);
  const N = 260;
  for (const capa of [0, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = angCam - span + (2 * span * i) / N;
      const h = c.radio + relieve(c, a) - capa * Math.min(300, 30 / cam.zoom);
      const q = aPantalla(cam, { x: centro.x + Math.cos(a) * h, y: centro.y + Math.sin(a) * h });
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    // Cierra por dentro del planeta.
    const prof = c.radio * 0.6;
    for (const a of [angCam + span, angCam, angCam - span]) {
      const q = aPantalla(cam, { x: centro.x + Math.cos(a) * prof, y: centro.y + Math.sin(a) * prof });
      ctx.lineTo(q.x, q.y);
    }
    ctx.closePath();
    ctx.fillStyle = capa === 0 ? c.colorSuelo : c.colorRoca;
    ctx.fill();
  }
  // Base de lanzamiento en el mundo natal.
  if (c.natal && Math.abs(difAngulo(angCam, ANGULO_BASE)) < span) {
    dibujarBase(ctx, vu, cam, c);
  }
}

function dibujarBase(ctx: Ctx, vu: Vuelo, cam: Camara, c: Cuerpo): void {
  const centro = posCuerpo(c, vu.t);
  const sup = { x: centro.x + Math.cos(ANGULO_BASE) * (c.radio + relieve(c, ANGULO_BASE)), y: centro.y + Math.sin(ANGULO_BASE) * (c.radio + relieve(c, ANGULO_BASE)) };
  const p = aPantalla(cam, sup);
  const k = cam.zoom;
  if (k < 0.05) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 2 - (ANGULO_BASE - cam.rot));
  ctx.scale(k, k);
  const alien = c.natal === 'alien';
  ctx.fillStyle = alien ? '#2a1638' : '#4a4f57';
  ctx.fillRect(-14, -1.2, 28, 1.4);
  ctx.fillStyle = alien ? '#3ff2c0' : '#e8c547';
  for (let i = -12; i < 12; i += 4) ctx.fillRect(i, -1.25, 2, 0.25);
  // Torre.
  ctx.fillStyle = alien ? '#4b2766' : '#9b3b2b';
  ctx.fillRect(-9, -26, 1.6, 25);
  ctx.strokeStyle = alien ? '#6c3a8e' : '#c75b3e';
  ctx.lineWidth = 0.3;
  for (let y = -25; y < -2; y += 3) {
    ctx.beginPath();
    ctx.moveTo(-9, y);
    ctx.lineTo(-7.4, y + 3);
    ctx.moveTo(-7.4, y);
    ctx.lineTo(-9, y + 3);
    ctx.stroke();
  }
  ctx.fillStyle = alien ? '#3ff2c0' : '#ff5a4a';
  ctx.beginPath();
  ctx.arc(-8.2, -26.5, 0.5 + 0.2 * Math.sin(vu.t * 4), 0, Math.PI * 2);
  ctx.fill();
  // Edificios del centro espacial.
  ctx.fillStyle = alien ? '#3a1d52' : '#c9ced6';
  ctx.fillRect(18, -8, 14, 8);
  ctx.fillRect(34, -14, 8, 14);
  ctx.fillStyle = alien ? '#7bffd9' : '#6f9fd6';
  for (let x = 20; x < 31; x += 3) ctx.fillRect(x, -6, 1.5, 1.5);
  ctx.restore();
}

function dibujarAsteroides(ctx: Ctx, vu: Vuelo, cam: Camara, mapa: boolean): void {
  for (const a of vu.asteroides) {
    const pos = posOrbita(a.orbita, vu.t);
    const p = aPantalla(cam, pos);
    const r = a.radio * cam.zoom;
    if (p.x < -r - 20 || p.y < -r - 20 || p.x > cam.w + r + 20 || p.y > cam.h + r + 20) continue;
    const agotado = a.reserva <= 0;
    const col = MINERALES.find((m) => (a.composicion[m.id] ?? 0) >= 0.3)?.color ?? '#888';
    if (r < 2.5) {
      ctx.fillStyle = mapa ? (a.territorio === 'alien' ? '#b47cff' : '#c9b48a') : '#999';
      ctx.globalAlpha = agotado ? 0.3 : 0.8;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      ctx.globalAlpha = 1;
      continue;
    }
    const giro = a.giro * vu.t - cam.rot;
    ctx.beginPath();
    a.forma.forEach((k, i) => {
      const ang = giro + (i / a.forma.length) * Math.PI * 2;
      const x = p.x + Math.cos(ang) * r * k;
      const y = p.y - Math.sin(ang) * r * k;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, r * 0.1, p.x, p.y, r * 1.1);
    g.addColorStop(0, agotado ? '#5a5a5a' : '#8d857a');
    g.addColorStop(1, '#2e2b28');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (r > 8) {
      // Cráteres: sombra abajo, borde claro arriba.
      for (let i = 0; i < 7; i++) {
        const ang = giro + i * 2.39 + a.id;
        const d = r * (0.15 + ((i * 37 + a.id * 11) % 50) / 100);
        const rc = r * (0.05 + ((i * 53 + a.id * 7) % 9) / 100);
        const cx = p.x + Math.cos(ang) * d;
        const cy = p.y - Math.sin(ang) * d;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.arc(cx, cy, rc, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(cx, cy, rc, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
      // Vetas del mineral: pepitas pequeñas que brillan.
      if (!agotado) {
        ctx.fillStyle = col;
        for (let i = 0; i < 26; i++) {
          const ang = giro + i * 1.37 + a.id * 0.3;
          const d = r * (0.1 + ((i * 29 + a.id * 13) % 70) / 100);
          const tam = Math.max(1, r * (0.012 + ((i * 17) % 5) / 400));
          ctx.globalAlpha = 0.55 + ((i * 7) % 4) / 10;
          ctx.fillRect(p.x + Math.cos(ang) * d - tam / 2, p.y - Math.sin(ang) * d - tam / 2, tam, tam);
        }
        ctx.globalAlpha = 1;
      }
    }
    if (r > 6 && cam.zoom > 0.01) {
      ctx.fillStyle = 'rgba(220,230,245,0.7)';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(a.nombre, p.x, p.y + r + 14);
    }
  }
}

function dibujarEstaciones(ctx: Ctx, vu: Vuelo, cam: Camara, mapa: boolean): void {
  for (const e of vu.estaciones) {
    const p = aPantalla(cam, e.pos);
    if (p.x < -400 || p.y < -400 || p.x > cam.w + 400 || p.y > cam.h + 400) continue;
    const hp = hpEstacion(vu.p, e.def.id);
    const max = hpMaxEstacion(vu.p, e.def.id);
    const info = RAZAS[e.def.id];
    const propia = e.def.id === vu.p.raza;
    const k = cam.zoom;
    if (e.def.radio * k < 4) {
      ctx.strokeStyle = propia ? '#7fe08a' : '#ff6a5a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(p.x - 4, p.y - 4, 8, 8);
      ctx.stroke();
      if (mapa) {
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = '11px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(e.def.nombre + (hp <= 0 ? ' (destruida)' : ''), p.x + 7, p.y + 4);
      }
      continue;
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(vu.t * 0.02 - cam.rot);
    ctx.scale(k, k);
    ctx.globalAlpha = hp > 0 ? 1 : 0.35;
    const c = info.colores;
    if (e.def.id === 'alien') {
      // Colmena: anillo orgánico con cámaras hexagonales.
      ctx.strokeStyle = c.casco;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * 42, Math.sin(a) * 42);
        ctx.fillStyle = c.casco2;
        ctx.beginPath();
        for (let j = 0; j < 6; j++) ctx.lineTo(Math.cos((j / 6) * Math.PI * 2) * 10, Math.sin((j / 6) * Math.PI * 2) * 10);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = c.acento;
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = c.casco;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.acento;
      ctx.shadowColor = c.brillo;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else {
      // Puerto: anillo de habitación, eje y paneles solares.
      ctx.strokeStyle = '#d7dbe1';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#8b9099';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 40, Math.sin(a) * 40);
        ctx.stroke();
      }
      ctx.fillStyle = '#1d3f7a';
      ctx.fillRect(-60, -6, 18, 12);
      ctx.fillRect(42, -6, 18, 12);
      ctx.fillRect(-66, -4, 6, 8);
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(-8, -14, 16, 28);
      ctx.fillStyle = c.acento;
      ctx.fillRect(-8, -2, 16, 4);
      ctx.fillStyle = '#9fd3ff';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        ctx.fillRect(Math.cos(a) * 40 - 1.5, Math.sin(a) * 40 - 1.5, 3, 3);
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Barra de vida.
    if (hp < max && hp > 0) barra(ctx, p.x - 40, p.y - e.def.radio * k - 16, 80, 5, hp / max, propia ? '#6fe08a' : '#ff6a5a');
    ctx.fillStyle = propia ? '#a8f0b4' : '#ffb0a6';
    ctx.font = '12px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(e.def.nombre, p.x, p.y + e.def.radio * k + 18);
  }
}

function dibujarUnaNave(ctx: Ctx, vu: Vuelo, cam: Camara, n: Nave, tReal: number): void {
  const p = aPantalla(cam, n.pos);
  const g = n.geometria;
  const tam = g.largo * cam.zoom;
  if (p.x < -tam - 60 || p.y < -tam - 60 || p.x > cam.w + tam + 60 || p.y > cam.h + tam + 60) return;
  const esJ = n === vu.jugador;
  const hostil = n.raza !== vu.p.raza;
  if (tam < 6) {
    if (!n.controlable) {
      ctx.fillStyle = 'rgba(160,160,160,0.6)';
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      return;
    }
    const a = -(n.ang - cam.rot);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(a);
    ctx.fillStyle = esJ ? '#7fd7ff' : hostil ? '#ff5a4a' : '#9fe0a0';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(Math.PI / 2 - (n.ang - cam.rot));
  ctx.scale(cam.zoom, cam.zoom);
  dibujarNave(ctx, n, Math.max(0.03, 1 / cam.zoom), { llama: n.acel, tiempo: tReal });
  if (n.golpe > 0) {
    ctx.fillStyle = `rgba(255,255,255,${n.golpe * 2})`;
    ctx.fillRect(-g.anchoMax / 2, -g.ycm, g.anchoMax, g.largo);
  }
  if (n.escudo > 0) {
    const f = n.escudo / Math.max(1, n.escudoMax());
    ctx.strokeStyle = n.info.colores.brillo;
    ctx.globalAlpha = 0.15 + f * 0.25;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.ellipse(0, g.ycm - g.largo / 2, g.anchoMax * 0.9 + 1, g.largo * 0.65 + 1, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // Marco del enemigo con su vida.
  if (hostil && n.controlable) {
    const r = Math.max(14, tam * 0.6);
    ctx.strokeStyle = '#ff5a4a';
    ctx.lineWidth = 1.5;
    const k = r * 0.35;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(p.x + sx * r, p.y + sy * (r - k));
      ctx.lineTo(p.x + sx * r, p.y + sy * r);
      ctx.lineTo(p.x + sx * (r - k), p.y + sy * r);
      ctx.stroke();
    }
    barra(ctx, p.x - r, p.y - r - 8, r * 2, 4, n.hp() / n.hpMax(), '#ff5a4a');
    if (n.escudoMax() > 0) barra(ctx, p.x - r, p.y - r - 13, r * 2, 3, n.escudo / n.escudoMax(), '#7bffd9');
  }
}

function dibujarTrayectoria(ctx: Ctx, vu: Vuelo, cam: Camara): void {
  const n = vu.jugador;
  if (!n.controlable || n.posado) return;
  const c = dominante(n.pos, vu.t);
  const cp = posCuerpo(c, vu.t);
  const el = elementos(resta(n.pos, cp), resta(n.vel, velCuerpo(c, vu.t)), c.gm);
  const pts = puntosConica(el, c.soi === Infinity ? 4_000_000 : c.soi, 240);
  ctx.save();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  let dentro = false;
  for (const q of pts) {
    const r = largo(q);
    if (r < c.radio) {
      dentro = false;
      continue;
    }
    const s = aPantalla(cam, { x: cp.x + q.x, y: cp.y + q.y });
    if (!dentro) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
    dentro = true;
  }
  ctx.stroke();
  // Apoapsis y periapsis.
  ctx.font = '11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  const marcar = (r: number, ang: number, txt: string) => {
    const s = aPantalla(cam, { x: cp.x + Math.cos(ang) * r, y: cp.y + Math.sin(ang) * r });
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe0b0';
    ctx.fillText(`${txt} ${fmtDist(r - c.radio)}`, s.x + 6, s.y - 6);
  };
  if (el.periapsis > 0 && el.e > 0.002) marcar(el.periapsis, el.argPe, 'Pe');
  if (!el.escapa && el.apoapsis < (c.soi === Infinity ? 4e6 : c.soi) && el.e > 0.002) marcar(el.apoapsis, el.argPe + Math.PI, 'Ap');
  ctx.restore();
}

function dibujarIndicadores(ctx: Ctx, vu: Vuelo, cam: Camara): void {
  // Flechas en el borde hacia los enemigos fuera de pantalla.
  for (const n of vu.naves) {
    if (n.raza === vu.p.raza || !n.controlable) continue;
    const p = aPantalla(cam, n.pos);
    if (p.x > 0 && p.y > 0 && p.x < cam.w && p.y < cam.h) continue;
    const cx = cam.w / 2;
    const cy = cam.h / 2;
    const a = Math.atan2(p.y - cy, p.x - cx);
    const m = 30;
    const x = clamp(cx + Math.cos(a) * cam.w, m, cam.w - m);
    const y = clamp(cy + Math.sin(a) * cam.h, m, cam.h - m);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, 7);
    ctx.lineTo(-6, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#ffb0a6';
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(fmtDist(largo(resta(n.pos, vu.jugador.pos))), x - Math.cos(a) * 22, y - Math.sin(a) * 22 + 4);
  }
  // Retícula de puntería.
  if (vu.jugador.armas().some((m) => !m.parte.arma?.antimisil) && vu.jugador.controlable) {
    const p = aPantalla(cam, vu.apunte);
    ctx.strokeStyle = vu.disparando ? '#ffdd66' : 'rgba(255,221,102,0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
    ctx.moveTo(p.x - 16, p.y);
    ctx.lineTo(p.x - 5, p.y);
    ctx.moveTo(p.x + 5, p.y);
    ctx.lineTo(p.x + 16, p.y);
    ctx.moveTo(p.x, p.y - 16);
    ctx.lineTo(p.x, p.y - 5);
    ctx.moveTo(p.x, p.y + 5);
    ctx.lineTo(p.x, p.y + 16);
    ctx.stroke();
  }
}

function barra(ctx: Ctx, x: number, y: number, w: number, h: number, f: number, col: string): void {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = col;
  ctx.fillRect(x, y, w * clamp(f, 0, 1), h);
}

function panel(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(8,12,20,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(120,150,190,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

// ------------------------------------------------------------ HUD

function dibujarHud(ctx: Ctx, vu: Vuelo, cam: Camara, tel: ReturnType<typeof telemetria>, op: { ayuda: boolean }): void {
  const n = vu.jugador;
  const c = tel.cuerpo;
  const cp = posCuerpo(c, vu.t);
  const relV = tel.velRel;
  const el = elementos(resta(n.pos, cp), relV, c.gm);
  const up = unit(resta(n.pos, cp));
  const vVert = relV.x * up.x + relV.y * up.y;
  const masa = n.masa();
  const empuje = n.empujeMax();
  const twr = empuje / (masa * tel.gravedad);
  // Δv que queda en la etapa activa, con el impulso de sus motores líquidos.
  let ispSum = 0;
  let fSum = 0;
  for (const m of n.motores()) {
    if (m.parte.solido) continue;
    const isp = (m.parte.ispVac ?? 300) * (1 - Math.min(1, tel.presion)) + (m.parte.ispAtm ?? 300) * Math.min(1, tel.presion);
    ispSum += (m.parte.empuje ?? 0) * m.num;
    fSum += ((m.parte.empuje ?? 0) * m.num) / isp;
  }
  const isp = fSum > 0 ? ispSum / fSum : 0;
  const comb = n.combustibleEtapa();
  const dv = isp > 0 && comb > 0 ? isp * G0 * Math.log(masa / (masa - comb)) : 0;

  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // --- Telemetría
  const filas: [string, string][] = [
    ['Cerca de', c.nombre],
    ['Altitud', fmtDist(tel.altitud)],
    ['Velocidad', `${largo(relV).toFixed(1)} m/s`],
    ['Vertical', `${vVert >= 0 ? '+' : ''}${vVert.toFixed(1)} m/s`],
    ['Apoapsis', n.posado ? '—' : el.escapa ? 'escape' : fmtDist(el.apoapsis - c.radio)],
    ['Periapsis', n.posado ? '—' : fmtDist(el.periapsis - c.radio)],
    ['Periodo', n.posado ? '—' : fmtTiempo(el.periodo)],
    ['Masa', `${masa.toFixed(2)} t`],
    ['TWR', empuje > 0 ? twr.toFixed(2) : '—'],
    ['Δv etapa', `${dv.toFixed(0)} m/s`],
  ];
  if (tel.rho > 0) filas.push(['Presión', `${(tel.presion * 100).toFixed(0)} %`]);
  const W = 210;
  panel(ctx, 12, 12, W, 16 + filas.length * 17);
  filas.forEach(([k, v], i) => {
    ctx.fillStyle = '#7f93ab';
    ctx.fillText(k, 22, 32 + i * 17);
    ctx.fillStyle = '#e6edf5';
    ctx.textAlign = 'right';
    ctx.fillText(v, 12 + W - 10, 32 + i * 17);
    ctx.textAlign = 'left';
  });

  // --- Barra superior: tiempo, créditos, diplomacia
  const d = vu.p.diplomacia;
  const est = d.estado === 'guerra' ? 'GUERRA' : d.estado === 'tension' ? `TENSIÓN ${d.tension.toFixed(0)}%` : 'PAZ';
  const col = d.estado === 'guerra' ? '#ff5a4a' : d.estado === 'tension' ? '#ffb347' : '#7fe08a';
  const topW = 460;
  const tx = cam.w / 2 - topW / 2;
  panel(ctx, tx, 10, topW, d.estado === 'guerra' ? 46 : 28);
  ctx.fillStyle = '#e6edf5';
  ctx.fillText(`T+ ${fmtTiempo(vu.t)}`, tx + 10, 29);
  ctx.fillStyle = vu.warp > 1 ? '#ffdd66' : '#7f93ab';
  ctx.fillText(`×${vu.warp}`, tx + 150, 29);
  ctx.fillStyle = '#ffd27a';
  ctx.fillText(`${Math.floor(vu.p.creditos).toLocaleString('es')} cr`, tx + 210, 29);
  ctx.fillStyle = col;
  ctx.textAlign = 'right';
  ctx.fillText(`${RAZAS[vu.enemigo].nombre}: ${est}`, tx + topW - 10, 29);
  ctx.textAlign = 'left';
  if (d.estado === 'guerra') {
    ctx.fillStyle = '#ffb0a6';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(`Fuerza enemiga ${d.fuerza.toFixed(0)} · próxima incursión ~${Math.max(0, d.proxima).toFixed(0)} s · paz: ${costePaz(d).toLocaleString('es')} cr`, tx + 10, 47);
    ctx.font = '12px ui-monospace, Menlo, monospace';
  }

  // --- Barras de estado abajo
  const bw = 300;
  const bx = cam.w / 2 - bw / 2;
  const by = cam.h - 118;
  panel(ctx, bx - 10, by - 12, bw + 20, 112);
  const cap = n.capacidadEtapa();
  const carga = masaInventario(n.carga);
  const capCarga = n.capacidadCarga();
  const barras: [string, number, string, string][] = [
    ['Acelerador', n.acel, '#ffdd66', `${(n.acel * 100).toFixed(0)} %`],
    ['Combustible', cap > 0 ? comb / cap : 0, '#f28c28', `${comb.toFixed(2)} t`],
    ['Energía', n.energiaMax() > 0 ? n.energia / n.energiaMax() : 0, '#f2d14a', `${n.energia.toFixed(0)}`],
    ['Casco', n.hp() / n.hpMax(), '#6fe08a', `${n.hp().toFixed(0)}`],
  ];
  if (n.escudoMax() > 0) barras.push(['Escudo', n.escudo / n.escudoMax(), '#7bffd9', `${n.escudo.toFixed(0)}`]);
  if (capCarga > 0) barras.push(['Bodega', carga / capCarga, '#c9b48a', `${carga.toFixed(2)}/${capCarga.toFixed(1)} t`]);
  const alto = Math.min(16, 96 / barras.length);
  barras.forEach(([k, f, cl, txt], i) => {
    const y = by + i * alto;
    ctx.fillStyle = '#7f93ab';
    ctx.font = '11px ui-monospace, monospace';
    ctx.fillText(k, bx, y + 9);
    barra(ctx, bx + 86, y, bw - 170, 10, f, cl);
    ctx.fillStyle = '#e6edf5';
    ctx.textAlign = 'right';
    ctx.fillText(txt, bx + bw, y + 9);
    ctx.textAlign = 'left';
  });

  // --- Indicadores de modo
  const modos: string[] = [];
  modos.push(n.sas ? 'SAS' : 'sas off');
  if (!n.encendida) modos.push('ESPACIO = encender');
  if (n.paracaidas) modos.push('PARACAÍDAS');
  if (n.taladrando) modos.push(vu.minando ? 'TALADRANDO' : 'taladro listo');
  if (n.refinando) modos.push('REFINANDO');
  if (vu.limiteWarp && vu.warp === 1) modos.push(`warp: ${vu.limiteWarp}`);
  ctx.font = '11px ui-monospace, monospace';
  ctx.fillStyle = '#9fd3ff';
  ctx.textAlign = 'center';
  ctx.fillText(modos.join(' · '), cam.w / 2, by - 18);
  ctx.textAlign = 'left';

  // --- Dial de rumbo (abajo a la izquierda)
  dial(ctx, 80, cam.h - 80, 58, n.ang, angulo(up), largo(relV) > 0.5 ? angulo(relV) : null, n);

  // --- Asteroide cercano
  const ce = vu.cercano;
  if (ce && ce.d < 5000) {
    const a = ce.a;
    const listo = ce.d < n.radio() + 40 && ce.vrel < 8;
    const lineas = [
      `${a.nombre}${a.territorio !== vu.p.raza ? '  (territorio ' + RAZAS[a.territorio ?? 'humana'].nombre + ')' : ''}`,
      `distancia ${fmtDist(Math.max(0, ce.d))} · vel. relativa ${ce.vrel.toFixed(1)} m/s`,
      Object.entries(a.composicion)
        .map(([k, v]) => `${MINERALES.find((m) => m.id === k)?.nombre} ${(v! * 100).toFixed(0)}%`)
        .join(' · '),
      `reserva ${a.reserva.toFixed(1)} / ${a.reservaInicial} t`,
      n.ritmoTaladro() > 0 ? (listo ? '[F] taladrar' : 'acércate a < 40 m y < 8 m/s para taladrar') : 'sin taladro',
    ];
    const pw = 330;
    panel(ctx, cam.w - pw - 12, cam.h - 20 - lineas.length * 16 - 12, pw, lineas.length * 16 + 14);
    lineas.forEach((l, i) => {
      ctx.fillStyle = i === 0 ? '#ffe0b0' : i === lineas.length - 1 ? (listo ? '#7fe08a' : '#7f93ab') : '#c9d4e4';
      ctx.fillText(l, cam.w - pw - 2, cam.h - 20 - lineas.length * 16 + i * 16 + 6);
    });
  }

  // --- Avisos
  let ay = 70;
  for (const a of vu.avisos) {
    ctx.font = '13px ui-monospace, monospace';
    const w = ctx.measureText(a.texto).width + 20;
    ctx.globalAlpha = clamp(a.vida, 0, 1);
    panel(ctx, cam.w - w - 12, ay, w, 24);
    ctx.fillStyle = a.tipo === 'peligro' ? '#ff7a6a' : a.tipo === 'aviso' ? '#ffcf6a' : a.tipo === 'bien' ? '#8ff0a0' : '#c9d4e4';
    ctx.fillText(a.texto, cam.w - w - 2, ay + 16);
    ctx.globalAlpha = 1;
    ay += 30;
  }

  // --- Acoplado / en casa
  if (vu.acoplada || vu.enCasa) {
    const txt = vu.acoplada ? `Acoplada a ${vu.estacion(vu.p.raza).def.nombre} — [E] mercado y servicios · [R] recuperar nave` : `En ${natalDe(vu.p.raza).nombre} — [R] recuperar nave y vender la carga`;
    ctx.font = '13px ui-monospace, monospace';
    const w = ctx.measureText(txt).width + 24;
    panel(ctx, cam.w / 2 - w / 2, by - 50, w, 26);
    ctx.fillStyle = '#8ff0a0';
    ctx.textAlign = 'center';
    ctx.fillText(txt, cam.w / 2, by - 32);
    ctx.textAlign = 'left';
  }

  if (op.ayuda) {
    const ayuda = [
      'Espacio  encender / soltar etapa',
      'W S  acelerador · Z X  a fondo / cortar',
      'A D  girar · T  SAS',
      'Rueda  zoom · M  mapa',
      ', .  acelerar el tiempo',
      'Clic  disparar (apunta el ratón)',
      'F  taladro · G  refinería · P  paracaídas',
      'E  mercado (acoplado) · R  recuperar',
      'Esc  pausa · H  ocultar ayuda',
    ];
    const pw = 300;
    const ph = ayuda.length * 16 + 14;
    panel(ctx, 12, cam.h - 170 - ph, pw, ph);
    ctx.font = '11px ui-monospace, monospace';
    ayuda.forEach((l, i) => {
      ctx.fillStyle = '#9fb0c4';
      ctx.fillText(l, 22, cam.h - 170 - ph + 18 + i * 16);
    });
  }
}

function dial(ctx: Ctx, x: number, y: number, r: number, rumbo: number, arriba: number, prograde: number | null, n: Nave): void {
  ctx.save();
  ctx.translate(x, y);
  // Mitad de arriba cielo, de abajo suelo: el horizonte local.
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, 0);
  ctx.fillStyle = '#2f5d8a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI);
  ctx.fillStyle = '#6b4b2a';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r, 0);
  ctx.lineTo(r, 0);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(120,150,190,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  const marca = (ang: number, color: string, retro = false) => {
    const a = -(ang - arriba) - Math.PI / 2;
    const px = x + Math.cos(a) * r * 0.75;
    const py = y + Math.sin(a) * r * 0.75;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    if (retro) {
      ctx.moveTo(px - 5, py - 5);
      ctx.lineTo(px + 5, py + 5);
      ctx.moveTo(px + 5, py - 5);
      ctx.lineTo(px - 5, py + 5);
    }
    ctx.stroke();
  };
  if (prograde !== null) {
    marca(prograde, '#c6f25a');
    marca(prograde + Math.PI, '#c6f25a', true);
  }
  // La nave.
  const a = -(rumbo - arriba) - Math.PI / 2;
  ctx.strokeStyle = '#ffdd66';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
  ctx.stroke();
  ctx.fillStyle = '#ffdd66';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7f93ab';
  ctx.font = '10px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(n.sas ? 'SAS' : '', x, y + r + 12);
  ctx.textAlign = 'left';
}

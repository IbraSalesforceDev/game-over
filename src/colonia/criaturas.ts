/**
 * Las criaturas y sus nidos.
 *
 * Los nidos absorben la contaminación que llega a su trozo de mapa y la
 * convierten en criaturas. Cuando el grupo es lo bastante grande, sale a
 * destruir lo que contamina. Además, cada pocos días llega una incursión desde
 * el borde del mapa, y los nidos se expanden. La evolución sube con el tiempo,
 * la contaminación y los nidos destruidos, y trae criaturas más duras.
 */
import { campo } from './camino';
import { danarColono } from './colonos';
import { EDIFICIOS, type Edificio, casillas } from './edificios';
import { Suelo } from './mapa';
import type { Mundo } from './mundo';
import { ANCHO, TICKS_DIA, TPS, dentro, idx } from './tipos';

export type TipoCriatura = 'larva' | 'soldado' | 'escupidor' | 'coloso';

export interface InfoCriatura {
  nombre: string;
  hp: number;
  dano: number;
  vel: number;
  alcance: number;
  cd: number;
  coste: number;
  tam: number;
  color: string;
}

export const CRIATURAS: Record<TipoCriatura, InfoCriatura> = {
  larva: { nombre: 'Larva mordedora', hp: 18, dano: 4, vel: 2.6, alcance: 0.9, cd: 0.8, coste: 4, tam: 0.3, color: '#c7a44a' },
  soldado: { nombre: 'Soldado acorazado', hp: 80, dano: 14, vel: 2.4, alcance: 1, cd: 0.8, coste: 20, tam: 0.42, color: '#b0563a' },
  escupidor: { nombre: 'Escupidor de ácido', hp: 45, dano: 9, vel: 2.1, alcance: 5, cd: 1.4, coste: 12, tam: 0.36, color: '#7fb04a' },
  coloso: { nombre: 'Coloso', hp: 380, dano: 32, vel: 1.9, alcance: 1.2, cd: 1, coste: 80, tam: 0.62, color: '#7a3a7a' },
};

export interface Criatura {
  id: number;
  tipo: TipoCriatura;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  nido: number | null;
  modo: 'guardia' | 'ataque';
  objetivo: number | null;
  cd: number;
  golpe: number;
  mira: number;
  paso: number;
  /** Segundos sin avanzar ni morder: si se atasca, acaba dispersándose. */
  atasco?: number;
  ax?: number;
  ay?: number;
}

export interface Nido {
  id: number;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  ira: number;
  grupo: number[];
  desde: number;
  cd: number;
  hpAntes: number;
}

let sigCriatura = 1;
let sigNido = 1;

export function ajustarIdCriaturas(maxCriatura: number, maxNido: number): void {
  sigCriatura = Math.max(sigCriatura, maxCriatura + 1);
  sigNido = Math.max(sigNido, maxNido + 1);
}

export function olvidarCampos(): void {
  campos.clear();
}
const DT = 1 / TPS;
/** Campos de distancia por edificio objetivo. */
const campos = new Map<number, { campo: Float32Array; tick: number }>();

export function crearNido(_w: Mundo, x: number, y: number): Nido {
  return { id: sigNido++, x, y, hp: 400, hpMax: 400, ira: 0, grupo: [], desde: 0, cd: 0, hpAntes: 400 };
}

function elegirTipo(w: Mundo): TipoCriatura {
  const e = w.evolucion;
  const pesos: [TipoCriatura, number][] = [
    ['larva', Math.max(0.05, 1 - e * 1.4)],
    ['soldado', e < 0.2 ? 0 : (e - 0.2) * 2],
    ['escupidor', e < 0.25 ? 0 : (e - 0.25) * 1.5],
    ['coloso', e < 0.5 ? 0 : (e - 0.5) * 3],
  ];
  let total = 0;
  for (const [, p] of pesos) total += p;
  let r = w.azar() * total;
  for (const [t, p] of pesos) {
    r -= p;
    if (r <= 0) return t;
  }
  return 'larva';
}

function nueva(w: Mundo, tipo: TipoCriatura, x: number, y: number, nido: number | null): Criatura {
  const inf = CRIATURAS[tipo];
  const c: Criatura = { id: sigCriatura++, tipo, x, y, hp: inf.hp, hpMax: inf.hp, nido, modo: 'guardia', objetivo: null, cd: 0, golpe: 0, mira: 0, paso: w.azar() * 10 };
  w.criaturas.push(c);
  return c;
}

/** Coste de pisar una casilla para una criatura: los muros cuestan pero se atraviesan a mordiscos. */
function coste(w: Mundo): (i: number) => number {
  return (i: number) => {
    const m = w.mapa;
    if (m.suelo[i] === Suelo.Agua || m.muro[i]) return Infinity;
    const id = m.edif[i];
    if (id) {
      const e = w.edificios.get(id);
      if (e && e.construido && (EDIFICIOS[e.tipo].solido || e.tipo === 'puerta')) return 6;
    }
    return m.planta[i] === 1 ? 2 : 1;
  };
}

function campoHacia(w: Mundo, e: Edificio): Float32Array {
  const c = campos.get(e.id);
  if (c && w.tick - c.tick < TPS * 20) return c.campo;
  const fuentes = casillas(e).map(([x, y]) => idx(x, y));
  const f = campo(fuentes, coste(w));
  campos.set(e.id, { campo: f, tick: w.tick });
  return f;
}

function bloqueaCriatura(w: Mundo, i: number): Edificio | null {
  const id = w.mapa.edif[i];
  if (!id) return null;
  const e = w.edificios.get(id);
  if (!e || !e.construido) return null;
  return EDIFICIOS[e.tipo].solido || e.tipo === 'puerta' ? e : null;
}

function pisable(w: Mundo, x: number, y: number): boolean {
  if (!dentro(x, y)) return false;
  const i = idx(x, y);
  return w.mapa.suelo[i] !== Suelo.Agua && !w.mapa.muro[i] && !bloqueaCriatura(w, i);
}

/** Distancia de un punto a la huella de un edificio. */
function distEdificio(e: Edificio, x: number, y: number): number {
  const d = EDIFICIOS[e.tipo];
  const dx = Math.max(e.x - x, 0, x - (e.x + d.w));
  const dy = Math.max(e.y - y, 0, y - (e.y + d.h));
  return Math.hypot(dx, dy);
}

/** Lo más contaminante (o lo más cercano) de la colonia, visto desde un punto. */
function elegirObjetivo(w: Mundo, x: number, y: number, radio = Infinity): Edificio | null {
  let mejor: Edificio | null = null;
  let mejorP = Infinity;
  for (const e of w.edificios.values()) {
    if (!e.construido || e.tipo === 'cinta') continue;
    const d = distEdificio(e, x, y);
    if (d > radio) continue;
    const contamina = (EDIFICIOS[e.tipo].contamina ?? 0) > 0 ? 0.5 : 1;
    const p = d * contamina;
    if (p < mejorP) {
      mejorP = p;
      mejor = e;
    }
  }
  return mejor;
}

function moverHacia(w: Mundo, c: Criatura, tx: number, ty: number): void {
  const inf = CRIATURAS[c.tipo];
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return;
  const v = Math.min(d, inf.vel * DT);
  const nx = c.x + (dx / d) * v;
  const ny = c.y + (dy / d) * v;
  c.mira = Math.atan2(dy, dx);
  c.paso += v * 4;
  if (pisable(w, Math.floor(nx), Math.floor(ny))) {
    c.x = nx;
    c.y = ny;
  } else if (pisable(w, Math.floor(nx), Math.floor(c.y))) c.x = nx;
  else if (pisable(w, Math.floor(c.x), Math.floor(ny))) c.y = ny;
}

function morder(w: Mundo, c: Criatura, objetivo: { tipo: 'e'; e: Edificio } | { tipo: 'c'; i: number }, tx: number, ty: number): void {
  const inf = CRIATURAS[c.tipo];
  c.atasco = 0;
  c.mira = Math.atan2(ty - c.y, tx - c.x);
  if (c.cd > 0) return;
  c.cd = inf.cd;
  if (c.tipo === 'escupidor') w.disparo(c.x, c.y, tx, ty, '#a8e04a', true);
  if (objetivo.tipo === 'e') {
    const e = objetivo.e;
    e.hp -= inf.dano;
    if (w.azar() < 0.4) w.particula(tx, ty, '#a09070');
    if (e.hp <= 0) w.destruido(e);
  } else {
    const col = w.colonos[objetivo.i];
    if (col) danarColono(w, col, inf.dano);
  }
}

function tickCriatura(w: Mundo, c: Criatura): void {
  const inf = CRIATURAS[c.tipo];
  c.cd -= DT;
  if (c.golpe > 0) c.golpe -= DT;
  if (c.modo === 'ataque' && w.tick % TPS === 0) {
    const movido = Math.hypot(c.x - (c.ax ?? c.x), c.y - (c.ay ?? c.y));
    c.atasco = movido < 0.3 ? (c.atasco ?? 0) + 1 : 0;
    c.ax = c.x;
    c.ay = c.y;
    // Atascada medio minuto sin morder nada: se dispersa.
    if (c.atasco > 30) c.hp = 0;
  }
  // Colonos cerca: a por ellos.
  let colono = -1;
  let dc = c.modo === 'ataque' ? 4 : 2.5;
  w.colonos.forEach((k, i) => {
    if (k.muerto) return;
    const d = Math.hypot(k.x - c.x, k.y - c.y);
    if (d < dc) {
      dc = d;
      colono = i;
    }
  });
  if (colono >= 0) {
    const k = w.colonos[colono]!;
    if (dc <= inf.alcance + 0.3) morder(w, c, { tipo: 'c', i: colono }, k.x, k.y);
    else moverHacia(w, c, k.x, k.y);
    return;
  }

  if (c.modo === 'guardia') {
    const n = w.nidos.find((x) => x.id === c.nido);
    if (!n) {
      c.modo = 'ataque';
      return;
    }
    if (w.azar() < 0.01 || Math.hypot(n.x + 1 - c.x, n.y + 1 - c.y) > 5) {
      const a = w.azar() * Math.PI * 2;
      c.objetivo = idx(Math.floor(n.x + 1 + Math.cos(a) * 3), Math.floor(n.y + 1 + Math.sin(a) * 3));
    }
    if (c.objetivo !== null) moverHacia(w, c, (c.objetivo % ANCHO) + 0.5, ((c.objetivo / ANCHO) | 0) + 0.5);
    return;
  }

  // Ataque: hacia el edificio objetivo siguiendo el campo de distancias.
  let e = c.objetivo !== null ? w.edificios.get(c.objetivo) : undefined;
  if (!e || !e.construido) {
    e = elegirObjetivo(w, c.x, c.y) ?? undefined;
    c.objetivo = e ? e.id : null;
    if (!e) {
      // No queda nada: a por el colono más cercano, o de vuelta al nido.
      const vivo = w.colonos.find((k) => !k.muerto);
      if (vivo) moverHacia(w, c, vivo.x, vivo.y);
      return;
    }
  }
  const dE = distEdificio(e, c.x, c.y);
  const [ex, ey] = [e.x + EDIFICIOS[e.tipo].w / 2, e.y + EDIFICIOS[e.tipo].h / 2];
  if (dE <= inf.alcance) {
    morder(w, c, { tipo: 'e', e }, ex, ey);
    return;
  }
  const f = campoHacia(w, e);
  const cx = Math.floor(c.x);
  const cy = Math.floor(c.y);
  let mejor = -1;
  let md = f[idx(cx, cy)] ?? Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx;
      const ny = cy + dy;
      if (!dentro(nx, ny)) continue;
      const v = f[idx(nx, ny)]!;
      if (v < md) {
        md = v;
        mejor = idx(nx, ny);
      }
    }
  }
  if (mejor < 0) {
    moverHacia(w, c, ex, ey);
    return;
  }
  const muro = bloqueaCriatura(w, mejor);
  if (muro && muro !== e) {
    if (distEdificio(muro, c.x, c.y) <= inf.alcance) morder(w, c, { tipo: 'e', e: muro }, (mejor % ANCHO) + 0.5, ((mejor / ANCHO) | 0) + 0.5);
    else moverHacia(w, c, (mejor % ANCHO) + 0.5, ((mejor / ANCHO) | 0) + 0.5);
    return;
  }
  // Un poco de dispersión para que no vayan en fila india perfecta.
  const jitter = ((c.id * 7919) % 100) / 100 - 0.5;
  moverHacia(w, c, (mejor % ANCHO) + 0.5 + jitter * 0.4, ((mejor / ANCHO) | 0) + 0.5 - jitter * 0.4);
}

function lanzarGrupo(w: Mundo, n: Nido): void {
  const objetivo = elegirObjetivo(w, n.x, n.y);
  for (const id of n.grupo) {
    const c = w.criaturas.find((x) => x.id === id);
    if (!c) continue;
    c.modo = 'ataque';
    c.objetivo = objetivo?.id ?? null;
  }
  if (n.grupo.length && objetivo) w.avisar(`¡Un enjambre de ${n.grupo.length} criaturas sale del nido atraído por la contaminación!`, 'peligro', n.x, n.y);
  n.grupo = [];
}

function incursion(w: Mundo, tamano?: number): void {
  const n = tamano ?? Math.min(30, Math.round(2 + w.dia * 0.6 + w.evolucion * 12));
  const [x, y] = w.bordeAleatorio();
  for (let k = 0; k < n; k++) {
    const c = nueva(w, elegirTipo(w), x + 0.5 + (w.azar() - 0.5) * 3, y + 0.5 + (w.azar() - 0.5) * 3, null);
    c.modo = 'ataque';
  }
  const lado = y <= 2 ? 'el norte' : y >= 90 ? 'el sur' : x <= 2 ? 'el oeste' : 'el este';
  w.avisar(`¡Incursión! ${n} criaturas llegan desde ${lado}.`, 'peligro', x, y);
}

function expandir(w: Mundo): void {
  if (w.nidos.length === 0 || w.nidos.length >= 10) return;
  const base = w.nidos[Math.floor(w.azar() * w.nidos.length)]!;
  for (let k = 0; k < 60; k++) {
    const a = w.azar() * Math.PI * 2;
    const d = 8 + w.azar() * 8;
    const x = Math.floor(base.x + Math.cos(a) * d);
    const y = Math.floor(base.y + Math.sin(a) * d);
    let ok = true;
    for (let j = 0; j < 2 && ok; j++) for (let i = 0; i < 2 && ok; i++) if (!pisable(w, x + i, y + j)) ok = false;
    if (!ok) continue;
    let cerca = false;
    for (const e of w.edificios.values()) if (Math.hypot(e.x - x, e.y - y) < 22) cerca = true;
    if (cerca) continue;
    w.nidos.push(crearNido(w, x, y));
    w.avisar('Las criaturas han levantado un nido nuevo.', 'aviso', x, y);
    return;
  }
}

export function danarNido(w: Mundo, n: Nido, d: number): void {
  n.hp -= d;
  if (w.azar() < 0.3) w.particula(n.x + 1, n.y + 1, '#8a4a8a');
}

export function nidoEn(w: Mundo, x: number, y: number): Nido | null {
  return w.nidos.find((n) => x >= n.x && x < n.x + 2 && y >= n.y && y < n.y + 2) ?? null;
}

export function tickCriaturas(w: Mundo): void {
  for (const c of w.criaturas) tickCriatura(w, c);
  // Muertes.
  const vivas: Criatura[] = [];
  for (const c of w.criaturas) {
    if (c.hp > 0) vivas.push(c);
    else for (let k = 0; k < 6; k++) w.particula(c.x, c.y, CRIATURAS[c.tipo].color);
  }
  w.criaturas = vivas;

  // Los colonos reclutados también disparan a los nidos cercanos.
  if (w.tick % TPS === 0) {
    for (const n of w.nidos) {
      // Absorbe la contaminación de su trozo.
      const t = w.mapa.trozo(n.x, n.y);
      const pol = w.mapa.contaminacion[t] ?? 0;
      if (pol > 0 && !w.admin.pacifico) {
        n.ira += pol;
        w.mapa.contaminacion[t] = 0;
        w.evolucion = Math.min(1, w.evolucion + (1 - w.evolucion) * pol * 9e-6);
      }
      // Cría.
      for (let k = 0; k < 5; k++) {
        const tipo = elegirTipo(w);
        const coste = CRIATURAS[tipo].coste;
        if (n.ira < coste) break;
        n.ira -= coste;
        const c = nueva(w, tipo, n.x + 1 + (w.azar() - 0.5) * 2, n.y + 1 + (w.azar() - 0.5) * 2, n.id);
        if (n.grupo.length === 0) n.desde = w.tick;
        n.grupo.push(c.id);
      }
      n.grupo = n.grupo.filter((id) => w.criaturas.some((c) => c.id === id));
      const tamano = 4 + Math.floor(w.evolucion * 10);
      if (!w.admin.pacifico && (n.grupo.length >= tamano || (n.grupo.length > 0 && w.tick - n.desde > TPS * 150))) lanzarGrupo(w, n);
      // Atacado: salen los guardias y nacen larvas de refresco.
      if (n.hp < n.hpAntes) {
        n.cd--;
        if (n.cd <= 0) {
          n.cd = 8;
          for (let k = 0; k < 2; k++) nueva(w, elegirTipo(w), n.x + 1, n.y + 1, n.id).modo = 'ataque';
        }
        for (const c of w.criaturas) if (c.nido === n.id && c.modo === 'guardia') c.modo = 'ataque';
      }
      n.hpAntes = n.hp;
    }
    const antes = w.nidos.length;
    w.nidos = w.nidos.filter((n) => {
      if (n.hp > 0) return true;
      for (let k = 0; k < 20; k++) w.particula(n.x + 1, n.y + 1, '#8a4a8a');
      w.evolucion = Math.min(1, w.evolucion + (1 - w.evolucion) * 0.02);
      w.avisar('¡Nido destruido!', 'bien', n.x, n.y);
      return false;
    });
    if (antes > 0 && w.nidos.length === 0) w.avisar('No queda ningún nido en el mapa… por ahora.', 'bien');

    // En modo pacífico las incursiones y la expansión se aplazan.
    if (w.tick >= w.proximaIncursion) {
      w.proximaIncursion = w.tick + Math.round(TICKS_DIA * (2.5 + w.azar() * 1.5));
      if (!w.admin.pacifico) incursion(w);
    }
    if (w.tick >= w.proximaExpansion) {
      w.proximaExpansion = w.tick + Math.round(TICKS_DIA * (3 + w.azar() * 2));
      if (!w.admin.pacifico) expandir(w);
    }
  }
}

/** Fuerza una incursión (panel de administración). */
export function forzarIncursion(w: Mundo, tamano?: number): void {
  incursion(w, tamano);
}

/** Saca de golpe a todas las criaturas que esperan en los nidos (panel de administración). */
export function forzarEnjambres(w: Mundo): void {
  for (const n of w.nidos) {
    if (n.grupo.length === 0) for (let k = 0; k < 4; k++) n.grupo.push(nueva(w, elegirTipo(w), n.x + 1, n.y + 1, n.id).id);
    lanzarGrupo(w, n);
  }
}

/** Levanta un nido nuevo en una casilla (panel de administración). */
export function ponerNido(w: Mundo, x: number, y: number): boolean {
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) if (!pisable(w, x + i, y + j)) return false;
  w.nidos.push(crearNido(w, x, y));
  return true;
}

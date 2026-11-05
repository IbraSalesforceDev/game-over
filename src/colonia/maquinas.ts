/**
 * La parte de fábrica: qué acepta cada máquina, cómo se mete y se saca, y el
 * tick de taladros, hornos, ensambladoras, cintas, insertadores, generadores,
 * torretas y el faro.
 */
import { EDIFICIOS, type Edificio, casillas } from './edificios';
import { Suelo } from './mapa';
import type { Mundo } from './mundo';
import { DX, DY, type ItemId, ITEMS, type Receta, TPS, dentro, idx, receta, recetaHorno, TICKS_DIA } from './tipos';

export const DT = 1 / TPS;
const MAX_COMB = 10;
const CAP_COFRE = 16;
const VEL_CINTA = 2;
/** Separación mínima entre objetos en una cinta. */
const HUECO = 0.5;

export function esCombustible(item: ItemId): boolean {
  return (ITEMS[item].combustible ?? 0) > 0;
}

function usaCombustible(e: Edificio): boolean {
  return e.tipo === 'horno' || e.tipo === 'taladro' || e.tipo === 'generador';
}

export function cuantos(c: Partial<Record<ItemId, number>>, i: ItemId): number {
  return c[i] ?? 0;
}

/** Recetas que una estación de colono quiere fabricar ahora mismo. */
export function recetasActivas(w: Mundo, e: Edificio): Receta[] {
  const out: Receta[] = [];
  for (const o of e.ordenes) {
    if (!o.activa) continue;
    const r = receta(o.receta);
    if (!r || (r.tech && !w.investigado(r.tech))) continue;
    if (w.existencias(r.salida) >= o.cantidad) continue;
    out.push(r);
  }
  return out;
}

/** Cuántas unidades de `item` acepta ahora el edificio. */
export function acepta(w: Mundo, e: Edificio, item: ItemId): number {
  if (!e.construido) return 0;
  if (usaCombustible(e) && esCombustible(item)) {
    // El horno no quema el carbón que le sobra si es mineral... el carbón solo es combustible.
    const c = e.combustible;
    if (!c) return MAX_COMB;
    return c.item === item ? Math.max(0, MAX_COMB - c.n) : 0;
  }
  switch (e.tipo) {
    case 'horno': {
      const r = recetaHorno(item);
      if (!r) return 0;
      const actual = Object.keys(e.entrada).find((k) => (e.entrada[k as ItemId] ?? 0) > 0) as ItemId | undefined;
      if (actual && actual !== item) return 0;
      if (e.salida && e.salida.item !== r.salida) return 0;
      return Math.max(0, 20 - cuantos(e.entrada, item));
    }
    case 'ensambladora': {
      const r = e.receta ? receta(e.receta) : undefined;
      const k = r?.entradas[item];
      if (!k) return 0;
      return Math.max(0, k * 3 - cuantos(e.entrada, item));
    }
    case 'fogata':
    case 'mesaTrabajo': {
      let max = 0;
      for (const r of recetasActivas(w, e)) max = Math.max(max, (r.entradas[item] ?? 0) * 2);
      return Math.max(0, max - cuantos(e.entrada, item));
    }
    case 'mesaInvestigacion': {
      const falta = w.cienciaPendiente()[item] ?? 0;
      return Math.max(0, Math.min(10, falta) - cuantos(e.entrada, item));
    }
    case 'torreta':
      return item === 'municion' ? Math.max(0, 20 - Math.ceil(e.balas / 10)) : 0;
    case 'faro':
      return 0;
    case 'cofre': {
      let hueco = 0;
      const pila = ITEMS[item].pila;
      for (const p of e.inv) if (p.item === item) hueco += pila - p.n;
      hueco += (CAP_COFRE - e.inv.length) * pila;
      return hueco;
    }
    default:
      return 0;
  }
}

export function meter(w: Mundo, e: Edificio, item: ItemId, n: number): number {
  const t = Math.min(n, acepta(w, e, item));
  if (t <= 0) return 0;
  if (usaCombustible(e) && esCombustible(item)) {
    if (e.combustible) e.combustible.n += t;
    else e.combustible = { item, n: t };
    return t;
  }
  if (e.tipo === 'torreta') {
    e.balas += t * 10;
    return t;
  }
  if (e.tipo === 'cofre') {
    let resto = t;
    const pila = ITEMS[item].pila;
    for (const p of e.inv) {
      if (p.item !== item || resto <= 0) continue;
      const k = Math.min(pila - p.n, resto);
      p.n += k;
      resto -= k;
    }
    while (resto > 0 && e.inv.length < CAP_COFRE) {
      const k = Math.min(pila, resto);
      e.inv.push({ item, n: k });
      resto -= k;
    }
    return t - resto;
  }
  e.entrada[item] = cuantos(e.entrada, item) + t;
  return t;
}

/** Saca una unidad que cumpla el filtro de la salida del edificio (o del cofre). */
export function sacarUno(e: Edificio, filtro: (i: ItemId) => boolean): ItemId | null {
  if (!e.construido) return null;
  if (e.tipo === 'cofre') {
    for (let k = 0; k < e.inv.length; k++) {
      const p = e.inv[k]!;
      if (!filtro(p.item)) continue;
      p.n--;
      if (p.n <= 0) e.inv.splice(k, 1);
      return p.item;
    }
    return null;
  }
  if (e.salida && e.salida.n > 0 && filtro(e.salida.item)) {
    const it = e.salida.item;
    e.salida.n--;
    if (e.salida.n <= 0) e.salida = null;
    return it;
  }
  return null;
}

export function cantidadEn(e: Edificio, item: ItemId): number {
  if (e.tipo === 'cofre') return e.inv.reduce((s, p) => s + (p.item === item ? p.n : 0), 0);
  return e.salida?.item === item ? e.salida.n : 0;
}

export function sacarDeCofre(e: Edificio, item: ItemId, n: number): number {
  let resto = n;
  for (let k = e.inv.length - 1; k >= 0 && resto > 0; k--) {
    const p = e.inv[k]!;
    if (p.item !== item) continue;
    const t = Math.min(p.n, resto);
    p.n -= t;
    resto -= t;
    if (p.n <= 0) e.inv.splice(k, 1);
  }
  return n - resto;
}

function aniadirSalida(e: Edificio, item: ItemId, n: number): void {
  if (e.salida) e.salida.n += n;
  else e.salida = { item, n };
}

function salidaLibre(e: Edificio, item: ItemId, max = 100): boolean {
  return !e.salida || (e.salida.item === item && e.salida.n < max);
}

/** Quema combustible si hace falta. Devuelve si hay fuego. */
function quemar(e: Edificio, carga = 1): boolean {
  if (e.ardiendo > 0) {
    e.ardiendo -= DT * carga;
    return true;
  }
  const c = e.combustible;
  if (!c || c.n <= 0) return false;
  c.n--;
  e.ardiendo += ITEMS[c.item].combustible ?? 0;
  if (c.n <= 0) e.combustible = null;
  return true;
}

// ------------------------------------------------------------------ cintas

export function cintaLibre(e: Edificio): boolean {
  if (e.tipo !== 'cinta' || !e.construido) return false;
  return e.cinta.length < 2 && e.cinta.every((c) => c.p >= HUECO);
}

export function cintaMeter(e: Edificio, item: ItemId, p = 0): boolean {
  if (!cintaLibre(e)) return false;
  e.cinta.push({ item, p });
  e.cinta.sort((a, b) => b.p - a.p);
  return true;
}

function tickCinta(w: Mundo, e: Edificio): void {
  if (e.cinta.length === 0) return;
  const avance = VEL_CINTA * DT;
  // El de delante primero; los de detrás no le adelantan.
  for (let k = 0; k < e.cinta.length; k++) {
    const c = e.cinta[k]!;
    const tope = k === 0 ? 1 : e.cinta[k - 1]!.p - HUECO;
    c.p = Math.min(tope, c.p + avance);
  }
  const primero = e.cinta[0]!;
  if (primero.p >= 1) {
    const nx = e.x + DX[e.dir];
    const ny = e.y + DY[e.dir];
    const sig = w.edificioEn(nx, ny);
    if (sig && sig.tipo === 'cinta' && sig.construido && cintaLibre(sig) && (sig.dir + 2) % 4 !== e.dir) {
      sig.cinta.push({ item: primero.item, p: 0 });
      sig.cinta.sort((a, b) => b.p - a.p);
      e.cinta.shift();
    }
  }
}

// ------------------------------------------------------------------ salida al frente

/** Casilla de salida de un taladro (delante del lado al que mira). */
export function casillaSalida(e: Edificio): [number, number] {
  switch (e.dir) {
    case 0:
      return [e.x + 2, e.y];
    case 1:
      return [e.x + 1, e.y + 2];
    case 2:
      return [e.x - 1, e.y + 1];
    default:
      return [e.x, e.y - 1];
  }
}

/** Intenta dejar un objeto en una casilla: cinta, máquina o suelo. */
export function dejarEn(w: Mundo, x: number, y: number, item: ItemId, origen?: Edificio): boolean {
  if (!dentro(x, y)) return false;
  const b = w.edificioEn(x, y);
  if (b && b !== origen) {
    if (b.tipo === 'cinta') return cintaMeter(b, item);
    if (!b.construido) return false;
    return meter(w, b, item, 1) > 0;
  }
  if (!w.mapa.transitable(x, y)) return false;
  const i = idx(x, y);
  const p = w.mapa.objetos.get(i);
  if (!p) {
    w.mapa.objetos.set(i, { item, n: 1 });
    return true;
  }
  if (p.item === item && p.n < ITEMS[item].pila) {
    p.n++;
    return true;
  }
  return false;
}

// ------------------------------------------------------------------ insertadores

function origenInsertador(e: Edificio): [number, number] {
  return [e.x - DX[e.dir], e.y - DY[e.dir]];
}

/** Lo que acepta la casilla de destino de un insertador. */
function filtroDestino(w: Mundo, x: number, y: number): (i: ItemId) => boolean {
  const b = w.edificioEn(x, y);
  if (b) {
    if (b.tipo === 'cinta') return () => cintaLibre(b);
    return (i) => acepta(w, b, i) > 0;
  }
  if (!w.mapa.transitable(x, y)) return () => false;
  const p = w.mapa.objetos.get(idx(x, y));
  return (i) => !p || (p.item === i && p.n < ITEMS[i].pila);
}

function cogerDe(w: Mundo, x: number, y: number, filtro: (i: ItemId) => boolean): ItemId | null {
  const b = w.edificioEn(x, y);
  if (b) {
    if (b.tipo === 'cinta') {
      // El que va más adelantado.
      for (let k = 0; k < b.cinta.length; k++) {
        const c = b.cinta[k]!;
        if (filtro(c.item)) {
          b.cinta.splice(k, 1);
          return c.item;
        }
      }
      return null;
    }
    // De los hornos se saca la placa; de los demás, su salida.
    return sacarUno(b, filtro);
  }
  const i = idx(x, y);
  const p = w.mapa.objetos.get(i);
  if (p && filtro(p.item)) {
    w.mapa.quitar(i, 1);
    return p.item;
  }
  return null;
}

function tickInsertador(w: Mundo, e: Edificio, sat: number): void {
  const [ox, oy] = origenInsertador(e);
  const fx = e.x + DX[e.dir];
  const fy = e.y + DY[e.dir];
  const vel = (1 / 0.83) * DT * sat;
  if (!e.mano) {
    // Brazo volviendo atrás.
    if (e.fase > 0) {
      e.fase = Math.max(0, e.fase - vel);
      e.activo = sat > 0;
      return;
    }
    const f = filtroDestino(w, fx, fy);
    const cogido = sat > 0 ? cogerDe(w, ox, oy, f) : null;
    e.mano = cogido;
    e.activo = !!cogido;
    return;
  }
  e.activo = sat > 0;
  if (e.fase < 1) {
    e.fase = Math.min(1, e.fase + vel);
    return;
  }
  if (dejarEn(w, fx, fy, e.mano, e)) e.mano = null;
}

// ------------------------------------------------------------------ producción

function tickTaladro(w: Mundo, e: Edificio, sat: number): void {
  const electrico = e.tipo === 'taladroElectrico';
  e.activo = false;
  if (e.salida) {
    const [sx, sy] = casillaSalida(e);
    if (dejarEn(w, sx, sy, e.salida.item, e)) {
      e.salida.n--;
      if (e.salida.n <= 0) e.salida = null;
    }
    if (e.salida) return;
  }
  // Zona de extracción: el propio 2×2, o 4×4 el eléctrico.
  const r = electrico ? 1 : 0;
  const zona: number[] = [];
  for (let y = e.y - r; y < e.y + 2 + r; y++) for (let x = e.x - r; x < e.x + 2 + r; x++) if (dentro(x, y) && w.mapa.mineral[idx(x, y)]) zona.push(idx(x, y));
  if (zona.length === 0) return;
  if (electrico) {
    if (sat <= 0) return;
  } else if (!quemar(e)) return;
  e.activo = true;
  e.progreso += DT * (electrico ? 0.5 * sat : 0.3);
  if (e.progreso < 1) return;
  e.progreso -= 1;
  const i = zona[e.fase++ % zona.length]!;
  const item = w.mapa.mineralEn(i)!;
  w.mapa.cantidad[i] = Math.max(0, w.mapa.cantidad[i]! - 1);
  if (w.mapa.cantidad[i] === 0) {
    w.mapa.mineral[i] = 0;
    w.terrenoCambiado(i);
  }
  e.salida = { item, n: 1 };
}

function tickHorno(w: Mundo, e: Edificio): void {
  e.activo = false;
  const mineral = Object.keys(e.entrada).find((k) => (e.entrada[k as ItemId] ?? 0) > 0) as ItemId | undefined;
  if (!mineral) {
    e.progreso = 0;
    return;
  }
  const r = recetaHorno(mineral);
  if (!r || !salidaLibre(e, r.salida)) return;
  if (!quemar(e)) return;
  e.activo = true;
  e.progreso += DT / r.tiempo;
  if (e.progreso >= 1) {
    e.progreso = 0;
    e.entrada[mineral] = cuantos(e.entrada, mineral) - 1;
    if (!e.entrada[mineral]) delete e.entrada[mineral];
    aniadirSalida(e, r.salida, r.cantidad);
    w.producido(r.salida, r.cantidad);
  }
}

function tieneIngredientes(e: Edificio, r: Receta): boolean {
  for (const k in r.entradas) if (cuantos(e.entrada, k as ItemId) < (r.entradas[k as ItemId] ?? 0)) return false;
  return true;
}

export function consumirIngredientes(e: Edificio, r: Receta): void {
  for (const k in r.entradas) {
    const it = k as ItemId;
    e.entrada[it] = cuantos(e.entrada, it) - (r.entradas[it] ?? 0);
    if (!e.entrada[it]) delete e.entrada[it];
  }
}

function tickEnsambladora(w: Mundo, e: Edificio, sat: number): void {
  e.activo = false;
  const r = e.receta ? receta(e.receta) : undefined;
  if (!r || sat <= 0 || !tieneIngredientes(e, r) || !salidaLibre(e, r.salida, 20)) return;
  e.activo = true;
  e.progreso += (DT * sat * 0.75) / r.tiempo;
  if (e.progreso >= 1) {
    e.progreso = 0;
    consumirIngredientes(e, r);
    aniadirSalida(e, r.salida, r.cantidad);
    w.producido(r.salida, r.cantidad);
  }
}

// ------------------------------------------------------------------ energía y defensa

/** Luz del sol, 0 de noche y 1 a mediodía. */
export function luzSolar(tick: number): number {
  const h = ((tick % TICKS_DIA) / TICKS_DIA) * 24;
  return Math.max(0, Math.min(1, Math.sin(((h - 6) / 12) * Math.PI) * 1.4));
}

/** ¿Quiere energía este edificio en este tick? */
function quiereEnergia(w: Mundo, e: Edificio): boolean {
  switch (e.tipo) {
    case 'insertador':
      return true;
    case 'taladroElectrico':
      return !e.salida;
    case 'ensambladora': {
      const r = e.receta ? receta(e.receta) : undefined;
      return !!r && tieneIngredientes(e, r);
    }
    case 'lampara':
      return luzSolar(w.tick) < 0.3;
    case 'torretaLaser':
      return true;
    case 'faro':
      return true;
    default:
      return false;
  }
}

export function tickEnergia(w: Mundo): void {
  let demanda = 0;
  let capacidad = 0;
  const generadores: Edificio[] = [];
  const sol = luzSolar(w.tick);
  for (const e of w.edificios.values()) {
    if (!e.construido) continue;
    const d = EDIFICIOS[e.tipo];
    if (d.consumo && quiereEnergia(w, e)) demanda += e.tipo === 'torretaLaser' && !e.activo ? 10 : d.consumo;
    if (e.tipo === 'generador' && (e.ardiendo > 0 || (e.combustible?.n ?? 0) > 0)) {
      capacidad += d.genera ?? 0;
      generadores.push(e);
    }
    if (e.tipo === 'panelSolar') capacidad += (d.genera ?? 0) * sol;
  }
  const sat = demanda <= 0 ? 1 : Math.min(1, capacidad / demanda);
  // Los generadores queman en proporción a la carga.
  const solar = capacidad - generadores.length * 200;
  const cargaGen = generadores.length ? Math.max(0, Math.min(1, (demanda - solar) / (generadores.length * 200))) : 0;
  for (const g of generadores) {
    g.activo = cargaGen > 0.01;
    if (g.activo) {
      quemar(g, cargaGen);
      w.mapa.contaminar(g.x + 1, g.y + 1, (EDIFICIOS.generador.contamina ?? 0) * cargaGen * DT);
    }
  }
  w.energia = { demanda, capacidad, sat };
}

function tickTorreta(w: Mundo, e: Edificio, sat: number): void {
  e.cd -= DT;
  const laser = e.tipo === 'torretaLaser';
  const [cx, cy] = [e.x + (laser ? 1 : 0.5), e.y + (laser ? 1 : 0.5)];
  const alcance = laser ? 13 : 10;
  const obj = w.criaturaCerca(cx, cy, alcance);
  e.activo = !!obj;
  if (!obj) return;
  e.apunta = Math.atan2(obj.y - cy, obj.x - cx);
  if (e.cd > 0) return;
  if (laser) {
    if (sat < 0.3) return;
    e.cd = 0.55 / sat;
    w.danarCriatura(obj, 18);
    w.disparo(cx, cy, obj.x, obj.y, '#ff4060', true);
  } else {
    if (e.balas <= 0) return;
    e.balas--;
    e.cd = 0.25;
    w.danarCriatura(obj, 7);
    w.disparo(cx, cy, obj.x, obj.y, '#ffe08a', false);
  }
}

function tickFaro(w: Mundo, e: Edificio, sat: number): void {
  e.activo = sat >= 0.99;
  if (e.activo) {
    e.encendido += DT;
    if (e.encendido >= TICKS_DIA / TPS && !w.ganado) w.ganar();
  }
}

// ------------------------------------------------------------------ tick general

export function tickMaquinas(w: Mundo): void {
  tickEnergia(w);
  const sat = w.energia.sat;
  for (const e of w.edificios.values()) {
    if (!e.construido) continue;
    switch (e.tipo) {
      case 'cinta':
        tickCinta(w, e);
        break;
      case 'insertador':
        tickInsertador(w, e, sat);
        break;
      case 'taladro':
      case 'taladroElectrico':
        tickTaladro(w, e, sat);
        break;
      case 'horno':
        tickHorno(w, e);
        break;
      case 'ensambladora':
        tickEnsambladora(w, e, sat);
        break;
      case 'torreta':
      case 'torretaLaser':
        tickTorreta(w, e, sat);
        break;
      case 'faro':
        tickFaro(w, e, sat);
        break;
      case 'lampara':
        e.activo = sat > 0.2 && luzSolar(w.tick) < 0.3;
        break;
      default:
        break;
    }
    const c = EDIFICIOS[e.tipo].contamina;
    if (c && e.activo && e.tipo !== 'generador') {
      const [x, y] = [e.x + EDIFICIOS[e.tipo].w / 2, e.y + EDIFICIOS[e.tipo].h / 2];
      w.mapa.contaminar(x, y, c * DT);
      w.contaminacionTotal += c * DT;
    }
  }
}

/** Todas las casillas de un edificio están libres y son edificables. */
export function puedeColocar(w: Mundo, tipo: Edificio['tipo'], x: number, y: number): string | null {
  const def = EDIFICIOS[tipo];
  let conMineral = 0;
  for (const [cx, cy] of casillas({ tipo, x, y })) {
    if (!dentro(cx, cy)) return 'Fuera del mapa';
    const i = idx(cx, cy);
    if (w.mapa.suelo[i] === Suelo.Agua) return 'No se puede construir en el agua';
    if (w.mapa.muro[i]) return 'Hay roca: mínala primero';
    if (w.mapa.planta[i] === 1) return 'Hay un árbol: tálalo primero';
    if (w.mapa.edif[i]) return 'Ya hay algo construido';
    if (w.mapa.mineral[i]) conMineral++;
  }
  if (def.sobreMineral && conMineral === 0) return 'El taladro tiene que ir sobre mineral';
  return null;
}

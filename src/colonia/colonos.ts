/**
 * Los colonos: necesidades (hambre, sueño, ánimo), habilidades, prioridades de
 * trabajo y la máquina de tareas que les hace talar, minar, transportar,
 * construir, abastecer máquinas, cocinar, fabricar e investigar.
 *
 * Cada tarea se reduce a «llega a una casilla que cumpla tal condición y haz
 * algo allí». La búsqueda de trabajo junta en un conjunto todas las casillas
 * desde las que se puede hacer un trabajo y lanza un solo Dijkstra.
 */
import { buscar } from './camino';
import { EDIFICIOS, type Edificio } from './edificios';
import { acepta, cantidadEn, consumirIngredientes, meter, recetasActivas, sacarDeCofre } from './maquinas';
import { Orden, Planta, Suelo, Zona } from './mapa';
import type { Mundo } from './mundo';
import { ANCHO, type ItemId, ITEMS, type Pila, TICKS_DIA, TPS, dentro, idx, receta } from './tipos';

export type Habilidad = 'construccion' | 'mineria' | 'cultivo' | 'cocina' | 'artesania' | 'intelecto' | 'tiro';
export type Trabajo = 'abastecer' | 'construir' | 'cultivar' | 'minar' | 'talar' | 'cocinar' | 'fabricar' | 'investigar' | 'transportar';

export const HABILIDADES: { id: Habilidad; nombre: string }[] = [
  { id: 'construccion', nombre: 'Construcción' },
  { id: 'mineria', nombre: 'Minería' },
  { id: 'cultivo', nombre: 'Cultivo' },
  { id: 'cocina', nombre: 'Cocina' },
  { id: 'artesania', nombre: 'Artesanía' },
  { id: 'intelecto', nombre: 'Intelecto' },
  { id: 'tiro', nombre: 'Tiro' },
];

/** En el orden en que se prueban cuando tienen la misma prioridad. */
export const TRABAJOS: { id: Trabajo; nombre: string; hab: Habilidad }[] = [
  { id: 'abastecer', nombre: 'Abastecer', hab: 'construccion' },
  { id: 'cocinar', nombre: 'Cocinar', hab: 'cocina' },
  { id: 'construir', nombre: 'Construir', hab: 'construccion' },
  { id: 'cultivar', nombre: 'Cultivar', hab: 'cultivo' },
  { id: 'fabricar', nombre: 'Fabricar', hab: 'artesania' },
  { id: 'investigar', nombre: 'Investigar', hab: 'intelecto' },
  { id: 'minar', nombre: 'Minar', hab: 'mineria' },
  { id: 'talar', nombre: 'Talar', hab: 'cultivo' },
  { id: 'transportar', nombre: 'Transportar', hab: 'construccion' },
];

type Fuente = { c: 'suelo'; i: number } | { c: 'cofre'; id: number } | { c: 'maquina'; id: number };
type Destino = { c: 'edificio'; id: number } | { c: 'almacen' };

export type Tarea =
  | { t: 'casilla'; i: number; clase: 'talar' | 'minar' | 'cosechar' | 'plantar'; resto: number; hab: Habilidad }
  | { t: 'recoger'; fuente: Fuente; item: ItemId; n: number; destino: Destino; comer?: boolean }
  | { t: 'entregar'; destino: Destino }
  | { t: 'construir'; id: number }
  | { t: 'desmontar'; id: number; resto: number }
  | { t: 'fabricar'; id: number; receta: string; resto: number; hab: Habilidad }
  | { t: 'investigar'; id: number }
  | { t: 'comer'; resto: number }
  | { t: 'dormir'; cama: number | null }
  | { t: 'ir'; i: number; huir?: boolean }
  | { t: 'deambular'; hasta: number };

export interface Recuerdo {
  texto: string;
  valor: number;
  hasta: number;
}

export interface Colono {
  id: number;
  nombre: string;
  color: string;
  pelo: string;
  x: number;
  y: number;
  camino: number[];
  tarea: Tarea | null;
  carga: Pila | null;
  hp: number;
  hambre: number;
  sueno: number;
  animo: number;
  hab: Record<Habilidad, number>;
  xp: Record<Habilidad, number>;
  prior: Record<Trabajo, number>;
  reclutado: boolean;
  cd: number;
  muerto: boolean;
  estado: string;
  espera: number;
  crisis: number;
  recuerdos: Recuerdo[];
  reservas: string[];
  inalcanzable: Map<string, number>;
  mira: number;
  paso: number;
}

const NOMBRES = ['Aitana', 'Bruno', 'Carmen', 'Darío', 'Elena', 'Fermín', 'Greta', 'Hugo', 'Inés', 'Joaquín', 'Lucía', 'Mateo', 'Nora', 'Óscar', 'Paula', 'Quique', 'Rocío', 'Sergio', 'Tania', 'Unai', 'Vera', 'Xavi', 'Yaiza', 'Zoe'];
const CAMISAS = ['#c0504d', '#4f81bd', '#9bbb59', '#8064a2', '#f79646', '#4bacc6', '#d9a43a', '#6f8f72'];
const PELOS = ['#2b1d14', '#5a3a22', '#c9a46a', '#8a8a8a', '#a0522d', '#1a1a1a'];

let sigColono = 1;

/** Tras cargar una partida, los ids nuevos siguen a partir de los guardados. */
export function ajustarIdColonos(max: number): void {
  sigColono = Math.max(sigColono, max + 1);
}

export function crearColono(w: Mundo, x: number, y: number): Colono {
  const r = w.azar;
  const usados = new Set(w.colonos.map((c) => c.nombre));
  const libres = NOMBRES.filter((n) => !usados.has(n));
  const nombre = libres[Math.floor(r() * libres.length)] ?? `Colono ${sigColono}`;
  const hab = {} as Record<Habilidad, number>;
  const xp = {} as Record<Habilidad, number>;
  for (const h of HABILIDADES) {
    hab[h.id] = Math.floor(r() * 5);
    xp[h.id] = 0;
  }
  // Cada uno destaca en dos cosas.
  for (let k = 0; k < 2; k++) {
    const h = HABILIDADES[Math.floor(r() * HABILIDADES.length)]!.id;
    hab[h] = Math.min(10, hab[h] + 4 + Math.floor(r() * 3));
  }
  const prior = {} as Record<Trabajo, number>;
  for (const t of TRABAJOS) prior[t.id] = 3;
  for (const t of TRABAJOS) if (hab[t.hab] >= 6) prior[t.id] = 2;
  prior.transportar = 3;
  prior.abastecer = 2;
  prior.cocinar = Math.min(prior.cocinar, 2);
  return {
    id: sigColono++,
    nombre,
    color: CAMISAS[Math.floor(r() * CAMISAS.length)]!,
    pelo: PELOS[Math.floor(r() * PELOS.length)]!,
    x: x + 0.5,
    y: y + 0.5,
    camino: [],
    tarea: null,
    carga: null,
    hp: 100,
    hambre: 0.8,
    sueno: 0.9,
    animo: 60,
    hab,
    xp,
    prior,
    reclutado: false,
    cd: 0,
    muerto: false,
    estado: 'Pensando',
    espera: 0,
    crisis: 0,
    recuerdos: [],
    reservas: [],
    inalcanzable: new Map(),
    mira: 0,
    paso: 0,
  };
}

// ------------------------------------------------------------------ utilidades

const DT = 1 / TPS;
const celda = (c: Colono): number => idx(Math.floor(c.x), Math.floor(c.y));

function velocidad(c: Colono): number {
  let v = 3.2;
  if (c.carga) v *= 0.9;
  if (c.hambre < 0.1) v *= 0.8;
  if (c.hp < 40) v *= 0.75;
  return v;
}

function factor(c: Colono, h: Habilidad): number {
  return 0.6 + c.hab[h] * 0.09;
}

function aprender(c: Colono, h: Habilidad, cant: number): void {
  if (c.hab[h] >= 10) return;
  c.xp[h] += cant;
  const meta = 40 * (c.hab[h] + 1);
  if (c.xp[h] >= meta) {
    c.xp[h] -= meta;
    c.hab[h]++;
  }
}

function reservar(w: Mundo, c: Colono, clave: string): boolean {
  const r = w.reservas.get(clave);
  if (r !== undefined && r !== c.id) return false;
  w.reservas.set(clave, c.id);
  if (!c.reservas.includes(clave)) c.reservas.push(clave);
  return true;
}

function libre(w: Mundo, c: Colono, clave: string): boolean {
  const r = w.reservas.get(clave);
  return r === undefined || r === c.id;
}

function soltarReservas(w: Mundo, c: Colono): void {
  for (const k of c.reservas) if (w.reservas.get(k) === c.id) w.reservas.delete(k);
  c.reservas = [];
}

function terminar(w: Mundo, c: Colono): void {
  c.tarea = null;
  c.camino = [];
  soltarReservas(w, c);
}

/** Suelta lo que lleva en el suelo (o en un almacén cercano si cabe). */
function soltarCarga(w: Mundo, c: Colono): void {
  if (!c.carga) return;
  w.mapa.soltar(Math.floor(c.x), Math.floor(c.y), c.carga.item, c.carga.n, ITEMS[c.carga.item].pila);
  c.carga = null;
}

/** Casillas junto a un edificio (o dentro, si no es sólido). */
function junto(w: Mundo, e: Edificio): (i: number) => boolean {
  const d = EDIFICIOS[e.tipo];
  const dentroOk = !d.solido || !e.construido;
  return (i: number) => {
    const x = i % ANCHO;
    const y = (i / ANCHO) | 0;
    const dx = x < e.x ? e.x - x : x >= e.x + d.w ? x - (e.x + d.w - 1) : 0;
    const dy = y < e.y ? e.y - y : y >= e.y + d.h ? y - (e.y + d.h - 1) : 0;
    if (dx === 0 && dy === 0) return dentroOk && w.mapa.edif[i] === e.id && !(e.tipo === 'cinta');
    return dx <= 1 && dy <= 1;
  };
}

function vecinas(i: number): number[] {
  const x = i % ANCHO;
  const y = (i / ANCHO) | 0;
  const out: number[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && dentro(x + dx, y + dy)) out.push(idx(x + dx, y + dy));
  return out;
}

/** ¿Está el colono en una casilla que cumple la meta? Si no, prepara el camino. Devuelve 'llegado', 'andando' o 'imposible'. */
function ir(w: Mundo, c: Colono, meta: (i: number) => boolean, clave: string): 'llegado' | 'andando' | 'imposible' {
  const aqui = celda(c);
  if (meta(aqui) && c.camino.length === 0) return 'llegado';
  if (c.camino.length > 0) {
    const fin = c.camino[c.camino.length - 1]!;
    if (meta(fin)) return 'andando';
  }
  const camino = buscar(aqui, w.pasableColono, meta, { max: 400 });
  if (!camino) {
    c.inalcanzable.set(clave, w.tick + TPS * 15);
    return 'imposible';
  }
  c.camino = camino;
  return camino.length === 0 ? 'llegado' : 'andando';
}

function inalcanzable(w: Mundo, c: Colono, clave: string): boolean {
  const t = c.inalcanzable.get(clave);
  return t !== undefined && t > w.tick;
}

// ------------------------------------------------------------------ demanda de los edificios

interface Demanda {
  e: Edificio;
  items: ItemId[];
  n: number;
  trabajo: Trabajo;
}

const COMBUSTIBLES: ItemId[] = ['carbon', 'madera'];

export function demandas(w: Mundo, e: Edificio): Demanda[] {
  const out: Demanda[] = [];
  if (e.deconstruir) return out;
  if (!e.construido) {
    for (const k in e.faltan) {
      const n = e.faltan[k as ItemId] ?? 0;
      if (n > 0) out.push({ e, items: [k as ItemId], n, trabajo: 'construir' });
    }
    return out;
  }
  const fuel = e.combustible?.n ?? 0;
  switch (e.tipo) {
    case 'horno': {
      const activas = recetasActivas(w, e);
      const tieneMineral = Object.values(e.entrada).some((v) => (v ?? 0) > 0);
      if (fuel < 4 && (tieneMineral || activas.length)) out.push({ e, items: COMBUSTIBLES, n: 8 - fuel, trabajo: 'abastecer' });
      for (const r of activas) {
        const mineral = Object.keys(r.entradas)[0] as ItemId;
        const n = acepta(w, e, mineral);
        if (n >= 5) out.push({ e, items: [mineral], n: Math.min(15, n), trabajo: 'abastecer' });
      }
      break;
    }
    case 'taladro': {
      if (fuel < 4) out.push({ e, items: COMBUSTIBLES, n: 8 - fuel, trabajo: 'abastecer' });
      break;
    }
    case 'generador': {
      if (fuel < 6) out.push({ e, items: COMBUSTIBLES, n: 10 - fuel, trabajo: 'abastecer' });
      break;
    }
    case 'torreta': {
      if (e.balas < 100) out.push({ e, items: ['municion'], n: acepta(w, e, 'municion'), trabajo: 'abastecer' });
      break;
    }
    case 'fogata':
    case 'mesaTrabajo': {
      const trabajo: Trabajo = e.tipo === 'fogata' ? 'cocinar' : 'fabricar';
      for (const r of recetasActivas(w, e)) {
        for (const k in r.entradas) {
          const it = k as ItemId;
          const falta = (r.entradas[it] ?? 0) * 2 - (e.entrada[it] ?? 0);
          if (falta > 0) out.push({ e, items: [it], n: falta, trabajo });
        }
      }
      break;
    }
    case 'mesaInvestigacion': {
      const p = w.cienciaPendiente();
      for (const k in p) {
        const it = k as ItemId;
        const n = acepta(w, e, it);
        if (n > 0) out.push({ e, items: [it], n, trabajo: 'investigar' });
      }
      break;
    }
    default:
      break;
  }
  return out;
}

// ------------------------------------------------------------------ fuentes y almacenes

/** Casillas desde las que se coge `items`: montones en el suelo o junto a cofres que lo tengan. */
function metaFuente(w: Mundo, items: ItemId[], evitarAlmacen = false): { meta: (i: number) => boolean; fuente: (i: number) => Fuente | null } {
  const cofres = new Map<number, number>();
  const maquinas = new Map<number, number>();
  for (const e of w.edificios.values()) {
    if (!e.construido) continue;
    if (e.tipo === 'cofre') {
      if (!items.some((it) => cantidadEn(e, it) > 0)) continue;
      for (const v of vecinas(e.y * ANCHO + e.x)) if (!cofres.has(v)) cofres.set(v, e.id);
    } else if (e.salida && e.salida.n > 0 && items.includes(e.salida.item) && e.tipo !== 'taladro' && e.tipo !== 'taladroElectrico') {
      const meta = junto(w, e);
      for (let y = e.y - 1; y <= e.y + EDIFICIOS[e.tipo].h; y++) for (let x = e.x - 1; x <= e.x + EDIFICIOS[e.tipo].w; x++) if (dentro(x, y) && meta(idx(x, y)) && !maquinas.has(idx(x, y))) maquinas.set(idx(x, y), e.id);
    }
  }
  const suelo = (i: number) => {
    const p = w.mapa.objetos.get(i);
    if (!p || !items.includes(p.item)) return false;
    if (evitarAlmacen && w.mapa.zona[i] === Zona.Almacen) return false;
    // Lo que hay bajo un plano o en una cinta no se toca.
    const id = w.mapa.edif[i];
    if (id && !evitarAlmacen) {
      const e = w.edificios.get(id);
      if (e && !e.construido) return false;
    }
    return true;
  };
  return {
    meta: (i) => suelo(i) || cofres.has(i) || maquinas.has(i),
    fuente: (i) => (suelo(i) ? { c: 'suelo', i } : cofres.has(i) ? { c: 'cofre', id: cofres.get(i)! } : maquinas.has(i) ? { c: 'maquina', id: maquinas.get(i)! } : null),
  };
}

/** Casilla de almacén donde cabe `item`: zona libre, montón igual, o junto a un cofre con sitio. */
function metaAlmacen(w: Mundo, c: Colono, item: ItemId): (i: number) => boolean {
  const cofres = new Set<number>();
  for (const e of w.edificios.values()) {
    if (e.tipo !== 'cofre' || !e.construido || acepta(w, e, item) <= 0) continue;
    for (const v of vecinas(e.y * ANCHO + e.x)) cofres.add(v);
  }
  return (i) => {
    if (cofres.has(i)) return true;
    if (w.mapa.zona[i] !== Zona.Almacen || w.mapa.edif[i]) return false;
    if (!libre(w, c, `s:${i}`)) return false;
    const p = w.mapa.objetos.get(i);
    return !p || (p.item === item && p.n < ITEMS[item].pila);
  };
}

function cofreJunto(w: Mundo, i: number, item: ItemId): Edificio | null {
  for (const v of [i, ...vecinas(i)]) {
    const e = w.edificios.get(w.mapa.edif[v] ?? 0);
    if (e && e.tipo === 'cofre' && e.construido && acepta(w, e, item) > 0) return e;
  }
  return null;
}

function itemDeFuente(w: Mundo, f: Fuente, items: ItemId[]): ItemId | null {
  if (f.c === 'suelo') return w.mapa.objetos.get(f.i)?.item ?? null;
  const e = w.edificios.get(f.id);
  if (!e) return null;
  if (f.c === 'maquina') return e.salida && items.includes(e.salida.item) ? e.salida.item : null;
  return items.find((x) => cantidadEn(e, x) > 0) ?? null;
}

/** Coge de la fuente. Devuelve lo cogido. */
function coger(w: Mundo, c: Colono, f: Fuente, item: ItemId, n: number): number {
  let t = 0;
  if (f.c === 'suelo') {
    const p = w.mapa.objetos.get(f.i);
    if (!p || p.item !== item) return 0;
    t = w.mapa.quitar(f.i, n);
  } else if (f.c === 'cofre') {
    const e = w.edificios.get(f.id);
    if (!e) return 0;
    t = sacarDeCofre(e, item, n);
  } else {
    const e = w.edificios.get(f.id);
    if (!e || !e.salida || e.salida.item !== item) return 0;
    t = Math.min(n, e.salida.n);
    e.salida.n -= t;
    if (e.salida.n <= 0) e.salida = null;
  }
  if (t > 0) {
    if (c.carga && c.carga.item === item) c.carga.n += t;
    else c.carga = { item, n: t };
  }
  return t;
}

// ------------------------------------------------------------------ búsqueda de trabajo

function buscarComida(w: Mundo, c: Colono): boolean {
  const opciones: ItemId[][] = [['comida'], ['bayas', 'patata']];
  for (const items of opciones) {
    if (!items.some((it) => w.existencias(it) > 0)) continue;
    const { meta, fuente } = metaFuente(w, items);
    const camino = buscar(celda(c), w.pasableColono, meta, { max: 300 });
    if (!camino) continue;
    const fin = camino.length ? camino[camino.length - 1]! : celda(c);
    const f = fuente(fin);
    if (!f) continue;
    const it = itemDeFuente(w, f, items);
    if (!it) continue;
    const alimento = ITEMS[it].alimento ?? 0.1;
    const n = Math.max(1, Math.ceil((1 - c.hambre) / alimento - 0.3));
    c.tarea = { t: 'recoger', fuente: f, item: it, n, destino: { c: 'almacen' }, comer: true };
    c.camino = camino;
    return true;
  }
  return false;
}

function buscarCama(w: Mundo, c: Colono): void {
  let mejor: Edificio | null = null;
  let md = Infinity;
  for (const e of w.edificios.values()) {
    if (e.tipo !== 'cama' || !e.construido || !libre(w, c, `cama:${e.id}`)) continue;
    const d = Math.hypot(e.x - c.x, e.y - c.y);
    if (d < md) {
      md = d;
      mejor = e;
    }
  }
  if (mejor && reservar(w, c, `cama:${mejor.id}`)) c.tarea = { t: 'dormir', cama: mejor.id };
  else c.tarea = { t: 'dormir', cama: null };
}

/** Prueba un tipo de trabajo. Devuelve true si ha encontrado tarea. */
function probarTrabajo(w: Mundo, c: Colono, tr: Trabajo): boolean {
  const m = w.mapa;
  const aqui = celda(c);
  switch (tr) {
    case 'talar':
    case 'minar':
    case 'cultivar': {
      // Conjunto de casillas-objetivo; el colono se pone al lado (o encima si es pisable).
      const objetivos = new Map<number, { i: number; clase: 'talar' | 'minar' | 'cosechar' | 'plantar' }>();
      const plantarOk = w.investigado('agricultura');
      for (let i = 0; i < m.orden.length; i++) {
        const o = m.orden[i];
        let clase: 'talar' | 'minar' | 'cosechar' | 'plantar' | null = null;
        if (tr === 'talar' && o === Orden.Talar && m.planta[i] === Planta.Arbol) clase = 'talar';
        else if (tr === 'minar' && o === Orden.Minar && (m.muro[i] || m.mineral[i])) clase = 'minar';
        else if (tr === 'cultivar') {
          if (o === Orden.Cosechar && m.planta[i] === Planta.Arbusto && m.crece[i]! >= 1) clase = 'cosechar';
          else if (m.zona[i] === Zona.Cultivo && m.planta[i] === Planta.Patata && m.crece[i]! >= 1) clase = 'cosechar';
          else if (plantarOk && m.zona[i] === Zona.Cultivo && m.planta[i] === Planta.Nada && !m.edif[i] && !m.objetos.has(i) && (m.suelo[i] === Suelo.Hierba || m.suelo[i] === Suelo.Tierra)) clase = 'plantar';
        }
        if (!clase || !libre(w, c, `c:${i}`) || inalcanzable(w, c, `c:${i}`)) continue;
        const pisable = clase === 'cosechar' || clase === 'plantar' || (clase === 'minar' && !m.muro[i]);
        if (pisable && !objetivos.has(i)) objetivos.set(i, { i, clase });
        for (const v of vecinas(i)) if (!objetivos.has(v)) objetivos.set(v, { i, clase });
      }
      if (objetivos.size === 0) return false;
      const camino = buscar(aqui, w.pasableColono, (i) => objetivos.has(i), { max: 400 });
      if (!camino) return false;
      const fin = camino.length ? camino[camino.length - 1]! : aqui;
      const o = objetivos.get(fin)!;
      if (!reservar(w, c, `c:${o.i}`)) return false;
      const tiempos = { talar: 3, minar: m.muro[o.i] ? 5 : 2, cosechar: 1.5, plantar: 1.2 };
      const hab = o.clase === 'minar' ? 'mineria' : 'cultivo';
      c.tarea = { t: 'casilla', i: o.i, clase: o.clase, resto: tiempos[o.clase], hab };
      c.camino = camino;
      return true;
    }
    case 'transportar': {
      const objetivos = new Set<number>();
      for (const [i, p] of m.objetos) {
        if (m.zona[i] === Zona.Almacen) continue;
        const id = m.edif[i];
        if (id) {
          const e = w.edificios.get(id);
          if (e && !e.construido) {
            // Objetos bajo un plano: hay que quitarlos de en medio.
          } else if (e) continue;
        }
        if (!libre(w, c, `h:${i}`) || inalcanzable(w, c, `h:${i}`)) continue;
        void p;
        objetivos.add(i);
      }
      // Salidas de hornos y ensambladoras que nadie recoge.
      const salidas = new Map<number, Edificio>();
      for (const e of w.edificios.values()) {
        if (!e.construido || !e.salida || e.salida.n < 5 || e.tipo === 'taladro' || e.tipo === 'taladroElectrico') continue;
        if (!libre(w, c, `h:e${e.id}`) || inalcanzable(w, c, `e:${e.id}`)) continue;
        const meta = junto(w, e);
        for (let y = e.y - 1; y <= e.y + EDIFICIOS[e.tipo].h; y++) for (let x = e.x - 1; x <= e.x + EDIFICIOS[e.tipo].w; x++) if (dentro(x, y) && meta(idx(x, y)) && w.pasableColono(idx(x, y))) salidas.set(idx(x, y), e);
      }
      if (objetivos.size === 0 && salidas.size === 0) return false;
      const camino = buscar(aqui, w.pasableColono, (i) => objetivos.has(i) || salidas.has(i), { max: 400 });
      if (!camino) return false;
      const fin = camino.length ? camino[camino.length - 1]! : aqui;
      if (!objetivos.has(fin)) {
        const e = salidas.get(fin)!;
        const it = e.salida!.item;
        if (!buscar(fin, w.pasableColono, metaAlmacen(w, c, it), { max: 400 })) {
          c.inalcanzable.set(`e:${e.id}`, w.tick + TPS * 20);
          return false;
        }
        reservar(w, c, `h:e${e.id}`);
        c.tarea = { t: 'recoger', fuente: { c: 'maquina', id: e.id }, item: it, n: 40, destino: { c: 'almacen' } };
        c.camino = camino;
        return true;
      }
      const p = m.objetos.get(fin);
      if (!p) return false;
      // ¿Hay sitio donde llevarlo?
      const hayAlmacen = buscar(fin, w.pasableColono, metaAlmacen(w, c, p.item), { max: 400 });
      if (!hayAlmacen) {
        c.inalcanzable.set(`h:${fin}`, w.tick + TPS * 20);
        return false;
      }
      if (!reservar(w, c, `h:${fin}`)) return false;
      c.tarea = { t: 'recoger', fuente: { c: 'suelo', i: fin }, item: p.item, n: Math.min(p.n, 40), destino: { c: 'almacen' } };
      c.camino = camino;
      return true;
    }
    default: {
      // Trabajos sobre edificios: entregar lo que piden, o trabajar en ellos.
      const lista = [...w.edificios.values()].sort((a, b) => Math.hypot(a.x - c.x, a.y - c.y) - Math.hypot(b.x - c.x, b.y - c.y));
      for (const e of lista) {
        if (inalcanzable(w, c, `e:${e.id}`)) continue;
        // Trabajo en el sitio.
        if (tr === 'construir' && e.deconstruir && libre(w, c, `e:${e.id}:obra`)) {
          reservar(w, c, `e:${e.id}:obra`);
          c.tarea = { t: 'desmontar', id: e.id, resto: EDIFICIOS[e.tipo].trabajo * 0.5 };
          return true;
        }
        if (tr === 'construir' && !e.construido && Object.keys(e.faltan).length === 0 && libre(w, c, `e:${e.id}:obra`)) {
          reservar(w, c, `e:${e.id}:obra`);
          c.tarea = { t: 'construir', id: e.id };
          return true;
        }
        if ((tr === 'cocinar' && e.tipo === 'fogata') || (tr === 'fabricar' && e.tipo === 'mesaTrabajo')) {
          if (e.construido && libre(w, c, `e:${e.id}:obra`)) {
            const r = recetasActivas(w, e).find((rr) => Object.entries(rr.entradas).every(([k, v]) => (e.entrada[k as ItemId] ?? 0) >= (v ?? 0)));
            if (r) {
              reservar(w, c, `e:${e.id}:obra`);
              c.tarea = { t: 'fabricar', id: e.id, receta: r.id, resto: r.tiempo * 2, hab: tr === 'cocinar' ? 'cocina' : 'artesania' };
              return true;
            }
          }
        }
        if (tr === 'investigar' && e.tipo === 'mesaInvestigacion' && e.construido && w.investigacion.actual && libre(w, c, `e:${e.id}:obra`)) {
          const pend = w.cienciaPendiente();
          const sinCiencia = Object.values(pend).every((v) => !v);
          const conCiencia = Object.keys(pend).every((k) => !pend[k as ItemId] || (e.entrada[k as ItemId] ?? 0) > 0);
          if (sinCiencia || conCiencia) {
            reservar(w, c, `e:${e.id}:obra`);
            c.tarea = { t: 'investigar', id: e.id };
            return true;
          }
        }
        // Entregas.
        for (const d of demandas(w, e)) {
          if (d.trabajo !== tr) continue;
          const disponibles = d.items.filter((it) => w.existencias(it) > 0);
          if (!disponibles.length) continue;
          const clave = `e:${e.id}:${d.items.join('|')}`;
          if (!libre(w, c, clave)) continue;
          const { meta, fuente } = metaFuente(w, disponibles);
          const camino = buscar(aqui, w.pasableColono, meta, { max: 400 });
          if (!camino) continue;
          const fin = camino.length ? camino[camino.length - 1]! : aqui;
          const f = fuente(fin);
          if (!f) continue;
          const item = itemDeFuente(w, f, disponibles);
          if (!item) continue;
          reservar(w, c, clave);
          c.tarea = { t: 'recoger', fuente: f, item, n: Math.min(d.n, 40), destino: { c: 'edificio', id: e.id } };
          c.camino = camino;
          return true;
        }
      }
      return false;
    }
  }
}

function elegirTarea(w: Mundo, c: Colono): void {
  c.estado = 'Pensando';
  if (c.carga) {
    // Lo primero: soltar lo que lleve en un almacén.
    c.tarea = { t: 'entregar', destino: { c: 'almacen' } };
    return;
  }
  const noche = w.hora >= 22 || w.hora < 6;
  if (c.hambre < 0.3 && buscarComida(w, c)) return;
  if (c.sueno < 0.2 || (noche && c.sueno < 0.7)) {
    buscarCama(w, c);
    return;
  }
  if (c.crisis > 0) {
    c.tarea = { t: 'deambular', hasta: w.tick + TPS * 4 };
    return;
  }
  const orden = [...TRABAJOS].filter((t) => c.prior[t.id] > 0).sort((a, b) => c.prior[a.id] - c.prior[b.id]);
  for (const t of orden) if (probarTrabajo(w, c, t.id)) return;
  if (c.hambre < 0.6 && buscarComida(w, c)) return;
  c.tarea = { t: 'deambular', hasta: w.tick + TPS * (2 + w.azar() * 3) };
}

// ------------------------------------------------------------------ ejecutar tareas

function trabajarCasilla(w: Mundo, c: Colono, ta: Extract<Tarea, { t: 'casilla' }>): void {
  const m = w.mapa;
  const i = ta.i;
  // ¿Sigue habiendo algo que hacer?
  const vale =
    (ta.clase === 'talar' && m.planta[i] === Planta.Arbol) ||
    (ta.clase === 'minar' && (m.muro[i] || m.mineral[i])) ||
    (ta.clase === 'cosechar' && (m.planta[i] === Planta.Arbusto || m.planta[i] === Planta.Patata) && m.crece[i]! >= 1) ||
    (ta.clase === 'plantar' && m.planta[i] === Planta.Nada && m.zona[i] === Zona.Cultivo);
  if (!vale) return terminar(w, c);
  const pisable = ta.clase === 'cosechar' || ta.clase === 'plantar' || (ta.clase === 'minar' && !m.muro[i]);
  const tx = i % ANCHO;
  const ty = (i / ANCHO) | 0;
  const meta = (k: number) => (pisable && k === i) || (k !== i && Math.max(Math.abs((k % ANCHO) - tx), Math.abs(((k / ANCHO) | 0) - ty)) <= 1);
  const r = ir(w, c, meta, `c:${i}`);
  if (r === 'imposible') return terminar(w, c);
  if (r === 'andando') {
    c.estado = { talar: 'Va a talar', minar: 'Va a minar', cosechar: 'Va a cosechar', plantar: 'Va a plantar' }[ta.clase];
    return;
  }
  c.mira = Math.atan2(ty + 0.5 - c.y, tx + 0.5 - c.x);
  c.estado = { talar: 'Talando', minar: 'Minando', cosechar: 'Cosechando', plantar: 'Plantando' }[ta.clase];
  ta.resto -= DT * factor(c, ta.hab);
  aprender(c, ta.hab, DT);
  if (w.tick % 6 === 0) w.particula(tx + 0.5, ty + 0.5, ta.clase === 'minar' ? '#8a8a84' : '#5a8a3a');
  if (ta.resto > 0) return;
  switch (ta.clase) {
    case 'talar':
      m.planta[i] = Planta.Nada;
      m.orden[i] = 0;
      m.soltar(tx, ty, 'madera', 6);
      break;
    case 'minar':
      if (m.muro[i]) {
        m.muro[i] = 0;
        m.orden[i] = 0;
        m.soltar(tx, ty, 'piedra', 4);
      } else {
        const it = m.mineralEn(i);
        if (it) {
          const n = Math.min(2, m.cantidad[i]!);
          m.cantidad[i] = m.cantidad[i]! - n;
          if (m.cantidad[i] === 0) {
            m.mineral[i] = 0;
            m.orden[i] = 0;
          }
          m.soltar(tx, ty, it, n);
        }
      }
      break;
    case 'cosechar':
      if (m.planta[i] === Planta.Arbusto) {
        m.crece[i] = 0;
        m.soltar(tx, ty, 'bayas', 5);
      } else {
        m.planta[i] = Planta.Nada;
        m.crece[i] = 0;
        m.soltar(tx, ty, 'patata', 6);
      }
      break;
    case 'plantar':
      m.planta[i] = Planta.Patata;
      m.crece[i] = 0;
      break;
  }
  w.terrenoCambiado(i);
  terminar(w, c);
}

function ejecutar(w: Mundo, c: Colono): void {
  const ta = c.tarea;
  if (!ta) return;
  switch (ta.t) {
    case 'casilla':
      return trabajarCasilla(w, c, ta);
    case 'recoger': {
      const f = ta.fuente;
      if (f.c !== 'suelo' && !w.edificios.get(f.id)) return terminar(w, c);
      const meta = f.c === 'suelo' ? (i: number) => i === f.i : junto(w, w.edificios.get(f.id)!);
      const r = ir(w, c, meta, f.c === 'suelo' ? `h:${f.i}` : `e:${f.id}`);
      if (r === 'imposible') return terminar(w, c);
      if (r === 'andando') {
        c.estado = ta.comer ? 'Va a por comida' : `Va a por ${ITEMS[ta.item].nombre.toLowerCase()}`;
        return;
      }
      const cogido = coger(w, c, f, ta.item, ta.n);
      if (cogido <= 0) return terminar(w, c);
      if (ta.comer) {
        c.tarea = { t: 'comer', resto: 2 };
        return;
      }
      // Sigue con la entrega, manteniendo las reservas.
      c.tarea = { t: 'entregar', destino: ta.destino };
      c.camino = [];
      return;
    }
    case 'entregar': {
      if (!c.carga) return terminar(w, c);
      const d = ta.destino;
      if (d.c === 'edificio') {
        const e = w.edificios.get(d.id);
        if (!e) {
          c.tarea = { t: 'entregar', destino: { c: 'almacen' } };
          return;
        }
        const r = ir(w, c, junto(w, e), `e:${e.id}`);
        if (r === 'imposible') {
          c.tarea = { t: 'entregar', destino: { c: 'almacen' } };
          return;
        }
        if (r === 'andando') {
          c.estado = `Lleva ${ITEMS[c.carga.item].nombre.toLowerCase()}`;
          return;
        }
        let puesto = 0;
        if (!e.construido) {
          const falta = e.faltan[c.carga.item] ?? 0;
          puesto = Math.min(falta, c.carga.n);
          if (puesto > 0) {
            e.faltan[c.carga.item] = falta - puesto;
            if (!e.faltan[c.carga.item]) delete e.faltan[c.carga.item];
          }
        } else puesto = meter(w, e, c.carga.item, c.carga.n);
        c.carga.n -= puesto;
        if (c.carga.n <= 0) {
          c.carga = null;
          return terminar(w, c);
        }
        // Lo que sobra, al almacén.
        soltarReservas(w, c);
        c.tarea = { t: 'entregar', destino: { c: 'almacen' } };
        return;
      }
      // Al almacén: zona o cofre.
      const item = c.carga.item;
      const meta = metaAlmacen(w, c, item);
      const r = ir(w, c, meta, `alm:${item}`);
      if (r === 'imposible') {
        soltarCarga(w, c);
        return terminar(w, c);
      }
      if (r === 'andando') {
        c.estado = `Guarda ${ITEMS[item].nombre.toLowerCase()}`;
        return;
      }
      const aqui = celda(c);
      const cofre = cofreJunto(w, aqui, item);
      if (cofre) {
        c.carga.n -= meter(w, cofre, item, c.carga.n);
      } else {
        const resto = w.mapa.soltar(aqui % ANCHO, (aqui / ANCHO) | 0, item, c.carga.n, ITEMS[item].pila, (x, y) => w.mapa.zona[idx(x, y)] === Zona.Almacen && !w.mapa.edif[idx(x, y)]);
        c.carga.n = resto;
      }
      if (c.carga.n <= 0) c.carga = null;
      c.camino = [];
      if (!c.carga) terminar(w, c);
      return;
    }
    case 'construir':
    case 'desmontar': {
      const e = w.edificios.get(ta.id);
      if (!e || (ta.t === 'construir' && (e.construido || Object.keys(e.faltan).length > 0))) return terminar(w, c);
      const r = ir(w, c, (i) => junto(w, e)(i) && w.mapa.edif[i] !== e.id, `e:${e.id}`);
      if (r === 'imposible') return terminar(w, c);
      if (r === 'andando') {
        c.estado = ta.t === 'construir' ? 'Va a construir' : 'Va a desmontar';
        return;
      }
      c.estado = ta.t === 'construir' ? `Construye ${EDIFICIOS[e.tipo].nombre.toLowerCase()}` : 'Desmontando';
      c.mira = Math.atan2(e.y + 0.5 - c.y, e.x + 0.5 - c.x);
      const avance = DT * factor(c, 'construccion');
      aprender(c, 'construccion', DT);
      if (w.tick % 8 === 0) w.particula(e.x + 0.5, e.y + 0.5, '#d8c8a0');
      if (ta.t === 'desmontar') {
        ta.resto -= avance;
        if (ta.resto <= 0) {
          w.quitar(e, 0.75);
          terminar(w, c);
        }
        return;
      }
      e.trabajo -= avance;
      const def = EDIFICIOS[e.tipo];
      e.hp = Math.max(e.hp, Math.round(def.hp * (1 - Math.max(0, e.trabajo) / def.trabajo)));
      if (e.trabajo <= 0) {
        e.construido = true;
        e.hp = def.hp;
        // Lo que hubiera debajo se aparta.
        if (def.solido) {
          for (let y = e.y; y < e.y + def.h; y++) {
            for (let x = e.x; x < e.x + def.w; x++) {
              const p = w.mapa.objetos.get(idx(x, y));
              if (p) {
                w.mapa.objetos.delete(idx(x, y));
                w.mapa.soltar(x, y, p.item, p.n, ITEMS[p.item].pila, (ax, ay) => !w.mapa.edif[idx(ax, ay)]);
              }
            }
          }
        }
        for (let y = e.y; y < e.y + def.h; y++) for (let x = e.x; x < e.x + def.w; x++) w.terrenoCambiado(idx(x, y));
        terminar(w, c);
      }
      return;
    }
    case 'fabricar': {
      const e = w.edificios.get(ta.id);
      const r = receta(ta.receta);
      if (!e || !r || !Object.entries(r.entradas).every(([k, v]) => (e.entrada[k as ItemId] ?? 0) >= (v ?? 0))) return terminar(w, c);
      const res = ir(w, c, (i) => junto(w, e)(i) && w.mapa.edif[i] !== e.id, `e:${e.id}`);
      if (res === 'imposible') return terminar(w, c);
      if (res === 'andando') {
        c.estado = 'Va a la mesa';
        return;
      }
      c.estado = `${e.tipo === 'fogata' ? 'Cocina' : 'Fabrica'} ${r.nombre.toLowerCase()}`;
      c.mira = Math.atan2(e.y + 0.5 - c.y, e.x + 0.5 - c.x);
      ta.resto -= DT * factor(c, ta.hab);
      aprender(c, ta.hab, DT);
      if (ta.resto > 0) return;
      consumirIngredientes(e, r);
      w.mapa.soltar(e.x, e.y + EDIFICIOS[e.tipo].h, r.salida, r.cantidad, ITEMS[r.salida].pila);
      w.producido(r.salida, r.cantidad);
      terminar(w, c);
      return;
    }
    case 'investigar': {
      const e = w.edificios.get(ta.id);
      if (!e || !w.investigacion.actual) return terminar(w, c);
      const res = ir(w, c, (i) => junto(w, e)(i) && w.mapa.edif[i] !== e.id, `e:${e.id}`);
      if (res === 'imposible') return terminar(w, c);
      if (res === 'andando') {
        c.estado = 'Va a investigar';
        return;
      }
      c.estado = 'Investigando';
      c.mira = Math.atan2(e.y + 0.5 - c.y, e.x + 0.5 - c.x);
      aprender(c, 'intelecto', DT);
      if (!w.investigar(e, DT * factor(c, 'intelecto'))) return terminar(w, c);
      // Cada rato se levanta a hacer otras cosas.
      if (w.tick % (TPS * 20) === 0) terminar(w, c);
      return;
    }
    case 'comer': {
      c.estado = 'Comiendo';
      ta.resto -= DT;
      if (ta.resto > 0) return;
      if (c.carga) {
        const al = ITEMS[c.carga.item].alimento ?? 0;
        c.hambre = Math.min(1, c.hambre + al * c.carga.n);
        recordar(w, c, c.carga.item === 'comida' ? 'Comida caliente' : 'Ha comido crudo', c.carga.item === 'comida' ? 6 : -6, 0.5);
        c.carga = null;
      }
      terminar(w, c);
      return;
    }
    case 'dormir': {
      const cama = ta.cama !== null ? w.edificios.get(ta.cama) : undefined;
      if (cama) {
        const r = ir(w, c, (i) => i === idx(cama.x, cama.y), `cama:${cama.id}`);
        if (r === 'imposible') {
          ta.cama = null;
          return;
        }
        if (r === 'andando') {
          c.estado = 'Va a la cama';
          return;
        }
      }
      c.estado = cama ? 'Durmiendo en la cama' : 'Durmiendo en el suelo';
      c.sueno = Math.min(1, c.sueno + DT / (cama ? 100 : 150));
      c.hp = Math.min(100, c.hp + DT * (cama ? 0.6 : 0.15));
      const noche = w.hora >= 22 || w.hora < 6;
      if (c.sueno >= 1 || (!noche && c.sueno > 0.9)) {
        recordar(w, c, cama ? 'Ha dormido en una cama' : 'Ha dormido en el suelo', cama ? 4 : -8, 1);
        terminar(w, c);
      }
      return;
    }
    case 'ir': {
      const r = ir(w, c, (i) => i === ta.i, `ir:${ta.i}`);
      if (r !== 'andando') {
        if (!c.reclutado || r === 'imposible') terminar(w, c);
        else c.estado = 'En posición';
      } else c.estado = ta.huir ? 'Huyendo' : 'Moviéndose';
      return;
    }
    case 'deambular': {
      c.estado = c.crisis > 0 ? 'Crisis nerviosa' : 'Sin nada que hacer';
      if (w.tick >= ta.hasta) return terminar(w, c);
      if (c.camino.length === 0 && w.azar() < 0.02) {
        const x = Math.floor(c.x + (w.azar() - 0.5) * 8);
        const y = Math.floor(c.y + (w.azar() - 0.5) * 8);
        if (dentro(x, y) && w.pasableColono(idx(x, y))) ir(w, c, (i) => i === idx(x, y), `ir:${idx(x, y)}`);
      }
      return;
    }
  }
}

function recordar(w: Mundo, c: Colono, texto: string, valor: number, dias: number): void {
  c.recuerdos = c.recuerdos.filter((r) => r.texto !== texto);
  c.recuerdos.push({ texto, valor, hasta: w.tick + TICKS_DIA * dias });
}

export function moodTotal(c: Colono, w: Mundo): number {
  let a = 50;
  for (const r of c.recuerdos) if (r.hasta > w.tick) a += r.valor;
  if (c.hambre < 0.1) a -= 20;
  else if (c.hambre < 0.25) a -= 8;
  if (c.sueno < 0.1) a -= 10;
  if (c.hp < 50) a -= 8;
  return Math.max(0, Math.min(100, a));
}

// ------------------------------------------------------------------ movimiento y combate

function mover(w: Mundo, c: Colono): void {
  if (c.camino.length === 0) return;
  const sig = c.camino[0]!;
  if (!w.pasableColono(sig)) {
    c.camino = [];
    return;
  }
  const tx = (sig % ANCHO) + 0.5;
  const ty = ((sig / ANCHO) | 0) + 0.5;
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  const v = velocidad(c) * DT;
  c.mira = Math.atan2(dy, dx);
  c.paso += v * 3;
  if (d <= v) {
    c.x = tx;
    c.y = ty;
    c.camino.shift();
  } else {
    c.x += (dx / d) * v;
    c.y += (dy / d) * v;
  }
}

function combatir(w: Mundo, c: Colono): boolean {
  c.cd -= DT;
  const enemigo = w.criaturaCerca(c.x, c.y, c.reclutado ? 8 : 5);
  if (!enemigo && c.reclutado) {
    // Sin criaturas a tiro, dispara al nido más cercano.
    const nido = w.nidos.find((n) => Math.hypot(n.x + 1 - c.x, n.y + 1 - c.y) < 8);
    if (nido) {
      if (c.cd <= 0) {
        c.cd = 0.9;
        nido.hp -= 9 + c.hab.tiro * 0.8;
        w.disparo(c.x, c.y, nido.x + 1, nido.y + 1, '#fff3b0', false);
        aprender(c, 'tiro', 0.5);
        c.mira = Math.atan2(nido.y + 1 - c.y, nido.x + 1 - c.x);
      }
      c.estado = 'Atacando un nido';
      return c.tarea?.t !== 'ir' || c.camino.length === 0;
    }
  }
  if (!enemigo) return false;
  const disparar = () => {
    if (c.cd > 0) return;
    c.cd = 0.8;
    const acierto = 0.6 + c.hab.tiro * 0.035;
    if (w.azar() < acierto) w.danarCriatura(enemigo, 10 + c.hab.tiro * 0.8);
    w.disparo(c.x, c.y, enemigo.x + (w.azar() - 0.5) * 0.4, enemigo.y + (w.azar() - 0.5) * 0.4, '#fff3b0', false);
    aprender(c, 'tiro', 0.5);
    c.mira = Math.atan2(enemigo.y - c.y, enemigo.x - c.x);
  };
  if (c.reclutado) {
    // Si tiene un enemigo a tiro, se para a disparar.
    disparar();
    c.estado = 'Disparando';
    return c.tarea?.t !== 'ir' || c.camino.length === 0;
  }
  // Sin reclutar: si se le echa encima, se defiende; si no, huye.
  if (Math.hypot(enemigo.x - c.x, enemigo.y - c.y) < 2.6) {
    if (c.tarea?.t !== 'ir') {
      soltarCarga(w, c);
      terminar(w, c);
    }
    disparar();
    c.estado = 'Defendiéndose';
    return true;
  }
  // Sin reclutar: huye.
  if (c.tarea?.t !== 'ir' || !c.tarea.huir) {
    soltarCarga(w, c);
    terminar(w, c);
    const ex = enemigo.x;
    const ey = enemigo.y;
    const meta = (i: number) => Math.hypot((i % ANCHO) + 0.5 - ex, ((i / ANCHO) | 0) + 0.5 - ey) > 12;
    const camino = buscar(celda(c), w.pasableColono, meta, { max: 200 });
    if (camino && camino.length) {
      c.tarea = { t: 'ir', i: camino[camino.length - 1]!, huir: true };
      c.camino = camino;
    }
  }
  return false;
}

export function danarColono(w: Mundo, c: Colono, d: number): void {
  if (c.muerto || w.admin.dios) return;
  c.hp -= d;
  if (w.azar() < 0.5) w.particula(c.x, c.y, '#b02020');
  if (c.hp <= 0) {
    c.muerto = true;
    c.hp = 0;
    soltarCarga(w, c);
    terminar(w, c);
    w.avisar(`${c.nombre} ha muerto.`, 'peligro', c.x, c.y);
    for (const o of w.colonos) if (!o.muerto) recordar(w, o, `Ha muerto ${c.nombre}`, -20, 2);
    if (w.colonos.every((x) => x.muerto)) {
      w.perdido = true;
      w.avisar('No queda nadie. La colonia ha caído.', 'peligro');
    }
  }
}

/** Orden directa a un colono reclutado. */
export function ordenarMover(w: Mundo, c: Colono, x: number, y: number): void {
  if (!dentro(x, y)) return;
  terminar(w, c);
  c.tarea = { t: 'ir', i: idx(x, y) };
}

export function reclutar(w: Mundo, c: Colono, si: boolean): void {
  c.reclutado = si;
  soltarCarga(w, c);
  terminar(w, c);
}

export function tickColonos(w: Mundo): void {
  for (const c of w.colonos) {
    if (c.muerto) continue;
    // Necesidades.
    c.hambre = Math.max(0, c.hambre - DT / (TICKS_DIA / TPS) / 1.1);
    if (c.tarea?.t !== 'dormir') c.sueno = Math.max(0, c.sueno - DT / 330);
    if (c.hambre <= 0 && w.tick % TPS === 0) danarColono(w, c, 0.4);
    if (w.tick % TPS === 0) {
      const objetivo = moodTotal(c, w);
      c.animo += (objetivo - c.animo) * 0.05;
      c.recuerdos = c.recuerdos.filter((r) => r.hasta > w.tick);
      if (c.crisis > 0) c.crisis--;
      else if (c.animo < 15 && w.azar() < 0.01 && !c.reclutado) {
        c.crisis = 40;
        terminar(w, c);
        soltarCarga(w, c);
        w.avisar(`${c.nombre} sufre una crisis nerviosa: no trabajará un rato.`, 'aviso', c.x, c.y);
      }
      if (c.hp < 100 && c.tarea?.t !== 'dormir') c.hp = Math.min(100, c.hp + 0.05);
    }
    const parado = combatir(w, c);
    if (!parado) {
      if (!c.tarea) {
        if (c.reclutado) c.estado = 'Reclutado';
        else if (c.espera > 0) c.espera--;
        else {
          elegirTarea(w, c);
          const nueva = c.tarea as Tarea | null;
          if (!nueva || nueva.t === 'deambular') c.espera = TPS;
        }
      }
      if (c.tarea) ejecutar(w, c);
      mover(w, c);
    }
  }
}

/** El colono en una casilla (para seleccionarlo con el ratón). */
export function colonoEn(w: Mundo, x: number, y: number): Colono | null {
  let mejor: Colono | null = null;
  let md = 0.8;
  for (const c of w.colonos) {
    if (c.muerto) continue;
    const d = Math.hypot(c.x - x, c.y - y);
    if (d < md) {
      md = d;
      mejor = c;
    }
  }
  return mejor;
}


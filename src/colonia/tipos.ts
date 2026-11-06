/**
 * Tipos básicos: direcciones, objetos, recetas y utilidades.
 *
 * El mapa es una rejilla; las coordenadas de pantalla tienen la y hacia abajo,
 * así que «norte» es y - 1.
 */

/** Tamaño del mapa en casillas. Cambia con cada partida (ver `fijarTamano`). */
export let ANCHO = 128;
export let ALTO = 96;

/** Fija el tamaño del mapa antes de crear o cargar un mundo. */
export function fijarTamano(ancho: number, alto: number): void {
  ANCHO = ancho;
  ALTO = alto;
}
/** Ticks de simulación por segundo de juego a velocidad 1. */
export const TPS = 20;
/** Un día dura ocho minutos reales a velocidad 1. */
export const TICKS_DIA = TPS * 60 * 8;

export type Dir = 0 | 1 | 2 | 3;
export const DX = [1, 0, -1, 0] as const;
export const DY = [0, 1, 0, -1] as const;
export const NOMBRE_DIR = ['este', 'sur', 'oeste', 'norte'];

export const idx = (x: number, y: number): number => y * ANCHO + x;
export const dentro = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);

export function rng(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ objetos

export type ItemId =
  | 'madera'
  | 'piedra'
  | 'hierro'
  | 'cobre'
  | 'carbon'
  | 'placaHierro'
  | 'placaCobre'
  | 'engranaje'
  | 'circuito'
  | 'municion'
  | 'cienciaRoja'
  | 'cienciaVerde'
  | 'bayas'
  | 'patata'
  | 'comida';

export interface InfoItem {
  id: ItemId;
  nombre: string;
  color: string;
  /** Segundos de combustible que da una unidad, si arde. */
  combustible?: number;
  /** Cuánta hambre quita (0..1), si se come. */
  alimento?: number;
  pila: number;
}

export const ITEMS: Record<ItemId, InfoItem> = {
  madera: { id: 'madera', nombre: 'Madera', color: '#a0703c', combustible: 8, pila: 50 },
  piedra: { id: 'piedra', nombre: 'Piedra', color: '#9a978f', pila: 50 },
  hierro: { id: 'hierro', nombre: 'Mineral de hierro', color: '#7d8fa6', pila: 50 },
  cobre: { id: 'cobre', nombre: 'Mineral de cobre', color: '#c9774a', pila: 50 },
  carbon: { id: 'carbon', nombre: 'Carbón', color: '#2b2b2e', combustible: 20, pila: 50 },
  placaHierro: { id: 'placaHierro', nombre: 'Placa de hierro', color: '#c8d0da', pila: 100 },
  placaCobre: { id: 'placaCobre', nombre: 'Placa de cobre', color: '#e8955a', pila: 100 },
  engranaje: { id: 'engranaje', nombre: 'Engranaje', color: '#aab4bf', pila: 100 },
  circuito: { id: 'circuito', nombre: 'Circuito', color: '#4caf50', pila: 100 },
  municion: { id: 'municion', nombre: 'Cargador', color: '#e0c050', pila: 100 },
  cienciaRoja: { id: 'cienciaRoja', nombre: 'Paquete de ciencia rojo', color: '#e04848', pila: 100 },
  cienciaVerde: { id: 'cienciaVerde', nombre: 'Paquete de ciencia verde', color: '#48c060', pila: 100 },
  bayas: { id: 'bayas', nombre: 'Bayas', color: '#b03a6e', alimento: 0.12, pila: 50 },
  patata: { id: 'patata', nombre: 'Patatas', color: '#c8a868', alimento: 0.12, pila: 50 },
  comida: { id: 'comida', nombre: 'Comida', color: '#e8b04a', alimento: 0.55, pila: 20 },
};

export const LISTA_ITEMS = Object.keys(ITEMS) as ItemId[];

export interface Pila {
  item: ItemId;
  n: number;
}

export type Coste = Partial<Record<ItemId, number>>;

// ------------------------------------------------------------------ recetas

export type Estacion = 'fogata' | 'mesaTrabajo' | 'horno' | 'ensambladora';

export interface Receta {
  id: string;
  nombre: string;
  entradas: Coste;
  salida: ItemId;
  cantidad: number;
  /** Segundos de trabajo. */
  tiempo: number;
  estaciones: Estacion[];
  /** Investigación que la desbloquea. */
  tech?: string;
}

export const RECETAS: Receta[] = [
  { id: 'comida', nombre: 'Comida', entradas: { bayas: 3 }, salida: 'comida', cantidad: 1, tiempo: 4, estaciones: ['fogata'] },
  { id: 'comidaPatata', nombre: 'Comida (patatas)', entradas: { patata: 3 }, salida: 'comida', cantidad: 1, tiempo: 4, estaciones: ['fogata'] },
  { id: 'placaHierro', nombre: 'Placa de hierro', entradas: { hierro: 1 }, salida: 'placaHierro', cantidad: 1, tiempo: 3.2, estaciones: ['horno'] },
  { id: 'placaCobre', nombre: 'Placa de cobre', entradas: { cobre: 1 }, salida: 'placaCobre', cantidad: 1, tiempo: 3.2, estaciones: ['horno'] },
  { id: 'engranaje', nombre: 'Engranaje', entradas: { placaHierro: 2 }, salida: 'engranaje', cantidad: 1, tiempo: 1, estaciones: ['mesaTrabajo', 'ensambladora'] },
  { id: 'circuito', nombre: 'Circuito', entradas: { placaHierro: 1, placaCobre: 2 }, salida: 'circuito', cantidad: 1, tiempo: 1.5, estaciones: ['mesaTrabajo', 'ensambladora'] },
  { id: 'municion', nombre: 'Cargador', entradas: { placaHierro: 2 }, salida: 'municion', cantidad: 1, tiempo: 1, estaciones: ['mesaTrabajo', 'ensambladora'] },
  { id: 'cienciaRoja', nombre: 'Ciencia roja', entradas: { placaCobre: 1, engranaje: 1 }, salida: 'cienciaRoja', cantidad: 1, tiempo: 5, estaciones: ['mesaTrabajo', 'ensambladora'] },
  { id: 'cienciaVerde', nombre: 'Ciencia verde', entradas: { circuito: 1, engranaje: 1, placaHierro: 1 }, salida: 'cienciaVerde', cantidad: 1, tiempo: 6, estaciones: ['mesaTrabajo', 'ensambladora'], tech: 'logistica' },
];

export function receta(id: string): Receta | undefined {
  return RECETAS.find((r) => r.id === id);
}

/** Receta de horno según el mineral que entra. */
export function recetaHorno(item: ItemId): Receta | undefined {
  return RECETAS.find((r) => r.estaciones.includes('horno') && r.entradas[item]);
}

export function sumarCoste(a: Coste, b: Coste, k = 1): Coste {
  const out: Coste = { ...a };
  for (const i in b) {
    const it = i as ItemId;
    out[it] = (out[it] ?? 0) + (b[it] ?? 0) * k;
  }
  return out;
}

export function textoCoste(c: Coste): string {
  return Object.entries(c)
    .map(([k, v]) => `${v} ${ITEMS[k as ItemId].nombre.toLowerCase()}`)
    .join(', ');
}

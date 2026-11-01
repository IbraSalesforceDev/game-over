/**
 * El mercado de minerales.
 *
 * Cada mineral tiene un precio base y una saturación: lo que vendes hoy hunde
 * el precio de mañana, y la saturación se recupera sola con el tiempo de juego.
 * Encima va una tendencia que deriva al azar cada hora, y la guerra dispara la
 * demanda de lo que sirve para blindar y armar.
 */
import { rng } from './vec';

export type Mineral = 'hierro' | 'niquel' | 'hielo' | 'titanio' | 'platino' | 'xenita' | 'chatarra';

export interface InfoMineral {
  id: Mineral;
  nombre: string;
  color: string;
  /** Créditos por tonelada sin saturar. */
  base: number;
  /** Cuánto sube la saturación por tonelada vendida. */
  sensibilidad: number;
  /** Multiplicador de precio en tiempo de guerra. */
  guerra: number;
  desc: string;
}

export const MINERALES: InfoMineral[] = [
  { id: 'hierro', nombre: 'Hierro', color: '#b06a4a', base: 180, sensibilidad: 0.004, guerra: 1.25, desc: 'Abundante. Paga poco, pero llena la bodega.' },
  { id: 'niquel', nombre: 'Níquel', color: '#9fa7a0', base: 320, sensibilidad: 0.006, guerra: 1.1, desc: 'Aleaciones y baterías.' },
  { id: 'hielo', nombre: 'Hielo', color: '#a8dcf0', base: 140, sensibilidad: 0.005, guerra: 1, desc: 'Agua. Una refinería lo convierte en combustible.' },
  { id: 'titanio', nombre: 'Titanio', color: '#c9d4e8', base: 700, sensibilidad: 0.012, guerra: 1.6, desc: 'Cascos y blindajes. En guerra vale oro.' },
  { id: 'platino', nombre: 'Platino', color: '#e8e2c4', base: 1900, sensibilidad: 0.03, guerra: 1.05, desc: 'Escaso y caro. Satura rápido.' },
  { id: 'xenita', nombre: 'Xenita', color: '#4ff0c8', base: 4200, sensibilidad: 0.05, guerra: 1.3, desc: 'Cristal alienígena. Solo en el Anillo de Xyl.' },
  { id: 'chatarra', nombre: 'Chatarra de guerra', color: '#8a7a6a', base: 450, sensibilidad: 0.01, guerra: 1.2, desc: 'Restos de naves enemigas. Se paga por peso.' },
];

export function infoMineral(m: Mineral): InfoMineral {
  return MINERALES.find((x) => x.id === m)!;
}

export type Inventario = Partial<Record<Mineral, number>>;

export interface Cotizacion {
  saturacion: number;
  tendencia: number;
  historial: number[];
}

export interface EstadoMercado {
  cot: Record<Mineral, Cotizacion>;
  /** Tiempo de juego del último cambio de tendencia. */
  ultimaHora: number;
  /** Ajuste global desde el panel de administración. */
  multiplicador: number;
  /** Ajuste por mineral desde el panel de administración. */
  ajuste: Partial<Record<Mineral, number>>;
  semilla: number;
}

const HORA = 3600;
/** Vida media de la saturación: un día de juego. */
const VIDA_MEDIA = 6 * HORA;

export function crearMercado(): EstadoMercado {
  const cot = {} as Record<Mineral, Cotizacion>;
  for (const m of MINERALES) cot[m.id] = { saturacion: 0, tendencia: 0, historial: [] };
  const mer: EstadoMercado = { cot, ultimaHora: 0, multiplicador: 1, ajuste: {}, semilla: 1 };
  for (const m of MINERALES) mer.cot[m.id].historial.push(precio(mer, m.id, false));
  return mer;
}

export function precio(mer: EstadoMercado, m: Mineral, guerra: boolean): number {
  const info = infoMineral(m);
  const c = mer.cot[m];
  const p =
    info.base *
    (1 - 0.7 * c.saturacion) *
    (1 + c.tendencia) *
    (guerra ? info.guerra : 1) *
    mer.multiplicador *
    (mer.ajuste[m] ?? 1);
  return Math.max(1, Math.round(p));
}

/**
 * Vende `cant` toneladas. El precio baja mientras vendes, así que vender todo
 * de golpe da menos que el precio por cantidad: se integra en pasos.
 */
export function vender(mer: EstadoMercado, m: Mineral, cant: number, guerra: boolean): number {
  const info = infoMineral(m);
  const c = mer.cot[m];
  let total = 0;
  let resto = cant;
  while (resto > 1e-9) {
    const paso = Math.min(0.25, resto);
    total += precio(mer, m, guerra) * paso;
    c.saturacion = Math.min(0.95, c.saturacion + info.sensibilidad * paso * (1 - c.saturacion));
    resto -= paso;
  }
  return Math.round(total);
}

/** Lo que se cobraría por vender `cant` sin vender nada. */
export function cotizarVenta(mer: EstadoMercado, m: Mineral, cant: number, guerra: boolean): number {
  const copia = { ...mer.cot[m] };
  const total = vender(mer, m, cant, guerra);
  mer.cot[m] = copia;
  return total;
}

export function tickMercado(mer: EstadoMercado, tAnterior: number, tAhora: number, guerra: boolean): void {
  const dt = tAhora - tAnterior;
  if (dt <= 0) return;
  const k = Math.pow(0.5, dt / VIDA_MEDIA);
  for (const m of MINERALES) mer.cot[m.id].saturacion *= k;
  // Una deriva por hora de juego; con el tiempo acelerado se pueden juntar muchas.
  let horas = Math.floor(tAhora / HORA) - Math.floor(mer.ultimaHora / HORA);
  if (horas <= 0) return;
  horas = Math.min(horas, 48);
  const r = rng(mer.semilla + Math.floor(tAhora / HORA));
  for (let h = 0; h < horas; h++) {
    for (const m of MINERALES) {
      const c = mer.cot[m.id];
      c.tendencia = Math.max(-0.35, Math.min(0.45, c.tendencia * 0.92 + (r() - 0.5) * 0.08));
      c.historial.push(precio(mer, m.id, guerra));
      if (c.historial.length > 48) c.historial.shift();
    }
  }
  mer.ultimaHora = tAhora;
}

export function masaInventario(inv: Inventario): number {
  let t = 0;
  for (const k in inv) t += inv[k as Mineral] ?? 0;
  return t;
}

export function sumarInventario(destino: Inventario, origen: Inventario): void {
  for (const k in origen) {
    const m = k as Mineral;
    destino[m] = (destino[m] ?? 0) + (origen[m] ?? 0);
  }
}

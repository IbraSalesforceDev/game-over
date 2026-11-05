/**
 * El mapa: suelo, roca, minerales, plantas, objetos sueltos, zonas, órdenes y
 * contaminación. Todo en arrays planos de ANCHO × ALTO.
 */
import { ALTO, ANCHO, type ItemId, type Pila, dentro, idx, rng } from './tipos';

export enum Suelo {
  Hierba = 0,
  Tierra = 1,
  Arena = 2,
  Agua = 3,
  Roca = 4,
}

export enum Planta {
  Nada = 0,
  Arbol = 1,
  Arbusto = 2,
  Patata = 3,
}

export enum Zona {
  Nada = 0,
  Almacen = 1,
  Cultivo = 2,
}

export enum Orden {
  Nada = 0,
  Talar = 1,
  Minar = 2,
  Cosechar = 3,
}

export const MINERALES: ItemId[] = ['hierro', 'cobre', 'carbon', 'piedra'];

/** Lado de un trozo de contaminación, en casillas. */
export const TROZO = 8;
export const TW = Math.ceil(ANCHO / TROZO);
export const TH = Math.ceil(ALTO / TROZO);

export class Mapa {
  suelo = new Uint8Array(ANCHO * ALTO);
  /** Roca de montaña sin excavar. */
  muro = new Uint8Array(ANCHO * ALTO);
  /** Mineral en superficie (0 = nada, 1+ = índice en MINERALES + 1). */
  mineral = new Uint8Array(ANCHO * ALTO);
  cantidad = new Uint16Array(ANCHO * ALTO);
  planta = new Uint8Array(ANCHO * ALTO);
  /** Crecimiento de la planta, 0..1. */
  crece = new Float32Array(ANCHO * ALTO);
  zona = new Uint8Array(ANCHO * ALTO);
  orden = new Uint8Array(ANCHO * ALTO);
  /** Id del edificio que ocupa la casilla (0 = ninguno). */
  edif = new Int32Array(ANCHO * ALTO);
  objetos = new Map<number, Pila>();
  contaminacion = new Float32Array(TW * TH);
  /** Variación visual por casilla. */
  ruido = new Uint8Array(ANCHO * ALTO);

  mineralEn(i: number): ItemId | null {
    const m = this.mineral[i]!;
    return m > 0 ? (MINERALES[m - 1] ?? null) : null;
  }

  /** Se puede pisar (sin contar edificios). */
  transitable(x: number, y: number): boolean {
    if (!dentro(x, y)) return false;
    const i = idx(x, y);
    return this.suelo[i] !== Suelo.Agua && this.muro[i] === 0 && this.planta[i] !== Planta.Arbol;
  }

  objeto(x: number, y: number): Pila | undefined {
    return this.objetos.get(idx(x, y));
  }

  /** Suelta objetos en la casilla o, si no caben, en la libre más cercana. Devuelve lo que no cupo. */
  soltar(x: number, y: number, item: ItemId, n: number, pila = 50, puedeSoltar?: (x: number, y: number) => boolean): number {
    let resto = n;
    for (let r = 0; r < 6 && resto > 0; r++) {
      for (let dy = -r; dy <= r && resto > 0; dy++) {
        for (let dx = -r; dx <= r && resto > 0; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = x + dx;
          const cy = y + dy;
          if (!this.transitable(cx, cy)) continue;
          if (puedeSoltar && !puedeSoltar(cx, cy)) continue;
          const i = idx(cx, cy);
          const p = this.objetos.get(i);
          if (!p) {
            const t = Math.min(pila, resto);
            this.objetos.set(i, { item, n: t });
            resto -= t;
          } else if (p.item === item && p.n < pila) {
            const t = Math.min(pila - p.n, resto);
            p.n += t;
            resto -= t;
          }
        }
      }
    }
    return resto;
  }

  quitar(i: number, n: number): number {
    const p = this.objetos.get(i);
    if (!p) return 0;
    const t = Math.min(n, p.n);
    p.n -= t;
    if (p.n <= 0) this.objetos.delete(i);
    return t;
  }

  trozo(x: number, y: number): number {
    return Math.floor(y / TROZO) * TW + Math.floor(x / TROZO);
  }

  contaminar(x: number, y: number, cant: number): void {
    const t = this.trozo(Math.floor(x), Math.floor(y));
    this.contaminacion[t] = (this.contaminacion[t] ?? 0) + cant;
  }
}

// ------------------------------------------------------------------ generación

function ruidoValor(semilla: number, escala: number): (x: number, y: number) => number {
  const r = rng(semilla);
  const N = 64;
  const tabla = new Float32Array(N * N);
  for (let i = 0; i < tabla.length; i++) tabla[i] = r();
  const v = (x: number, y: number) => tabla[(((y % N) + N) % N) * N + (((x % N) + N) % N)]!;
  const suave = (t: number) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / escala;
    const fy = y / escala;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = suave(fx - x0);
    const ty = suave(fy - y0);
    const a = v(x0, y0) + (v(x0 + 1, y0) - v(x0, y0)) * tx;
    const b = v(x0, y0 + 1) + (v(x0 + 1, y0 + 1) - v(x0, y0 + 1)) * tx;
    return a + (b - a) * ty;
  };
}

export interface Generado {
  mapa: Mapa;
  /** Casilla de llegada de los colonos. */
  inicio: [number, number];
  /** Sitios para los nidos iniciales. */
  nidos: [number, number][];
}

export function generar(semilla: number): Generado {
  const m = new Mapa();
  const r = rng(semilla);
  const alto1 = ruidoValor(semilla + 1, 18);
  const alto2 = ruidoValor(semilla + 2, 7);
  const hum = ruidoValor(semilla + 3, 22);
  const veg = ruidoValor(semilla + 4, 6);
  const cx = ANCHO / 2;
  const cy = ALTO / 2;
  for (let y = 0; y < ALTO; y++) {
    for (let x = 0; x < ANCHO; x++) {
      const i = idx(x, y);
      m.ruido[i] = Math.floor(r() * 256);
      const dc = Math.hypot(x - cx, y - cy);
      // El centro siempre es llano y seco: ahí llegan los colonos.
      const llano = Math.min(1, Math.max(0, (dc - 9) / 10));
      const e = (alto1(x, y) * 0.7 + alto2(x, y) * 0.3 - 0.5) * llano + 0.5;
      const h = hum(x, y);
      if (e < 0.27) m.suelo[i] = Suelo.Agua;
      else if (e < 0.31) m.suelo[i] = Suelo.Arena;
      else if (e > 0.7) {
        m.suelo[i] = Suelo.Roca;
        m.muro[i] = 1;
      } else if (e > 0.64) m.suelo[i] = Suelo.Roca;
      else m.suelo[i] = h > 0.55 ? Suelo.Tierra : Suelo.Hierba;
      if (m.suelo[i] === Suelo.Hierba || m.suelo[i] === Suelo.Tierra) {
        const vv = veg(x, y) * 0.6 + h * 0.4;
        if (dc > 5 && vv > 0.58 && r() < 0.55) m.planta[i] = Planta.Arbol;
        else if (dc > 4 && r() < 0.012) {
          m.planta[i] = Planta.Arbusto;
          m.crece[i] = 1;
        }
      }
    }
  }
  // Manchas de mineral: cerca del inicio unas pocas pequeñas; lejos, grandes.
  const manchas: { tipo: number; x: number; y: number; r: number; cant: number }[] = [];
  const cerca = [1, 2, 3, 4, 1, 3];
  cerca.forEach((tipo, k) => {
    const a = (k / cerca.length) * Math.PI * 2 + r() * 0.6;
    const d = 11 + r() * 8;
    manchas.push({ tipo, x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 2.6 + r() * 1.2, cant: 250 + r() * 200 });
  });
  for (let k = 0; k < 10; k++) {
    manchas.push({ tipo: 1 + (k % 4), x: 8 + r() * (ANCHO - 16), y: 8 + r() * (ALTO - 16), r: 3 + r() * 3, cant: 500 + r() * 900 });
  }
  for (const s of manchas) {
    for (let y = Math.floor(s.y - s.r - 1); y <= s.y + s.r + 1; y++) {
      for (let x = Math.floor(s.x - s.r - 1); x <= s.x + s.r + 1; x++) {
        if (!dentro(x, y)) continue;
        const d = Math.hypot(x - s.x, y - s.y) + (r() - 0.5) * 0.9;
        if (d > s.r) continue;
        const i = idx(x, y);
        if (m.suelo[i] === Suelo.Agua) continue;
        m.muro[i] = 0;
        m.planta[i] = Planta.Nada;
        if (m.suelo[i] === Suelo.Roca) m.suelo[i] = Suelo.Tierra;
        m.mineral[i] = s.tipo;
        m.cantidad[i] = Math.round(s.cant * (1 - (d / s.r) * 0.6));
      }
    }
  }
  // Nidos: lejos del centro, en suelo firme.
  const nidos: [number, number][] = [];
  for (let intento = 0; intento < 400 && nidos.length < 4; intento++) {
    const x = 4 + Math.floor(r() * (ANCHO - 8));
    const y = 4 + Math.floor(r() * (ALTO - 8));
    if (Math.hypot(x - cx, y - cy) < 46) continue;
    if (nidos.some(([a, b]) => Math.hypot(a - x, b - y) < 30)) continue;
    let ok = true;
    for (let j = -1; j <= 2 && ok; j++) for (let i = -1; i <= 2 && ok; i++) if (!dentro(x + i, y + j) || m.suelo[idx(x + i, y + j)] === Suelo.Agua) ok = false;
    if (!ok) continue;
    for (let j = -2; j <= 3; j++) {
      for (let i = -2; i <= 3; i++) {
        if (!dentro(x + i, y + j)) continue;
        const k = idx(x + i, y + j);
        m.muro[k] = 0;
        m.planta[k] = Planta.Nada;
      }
    }
    nidos.push([x, y]);
  }
  return { mapa: m, inicio: [Math.floor(cx), Math.floor(cy)], nidos };
}

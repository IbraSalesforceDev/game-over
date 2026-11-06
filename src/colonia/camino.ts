/**
 * Búsqueda de caminos en la rejilla: Dijkstra con montículo binario, en ocho
 * direcciones y sin cortar esquinas. Sirve igual para «ir a tal casilla» que
 * para «buscar el trabajo más cercano»: la meta es un predicado.
 */
import { ALTO, ANCHO } from './tipos';

let distancia = new Float32Array(0);
let padre = new Int32Array(0);
let sello = new Uint32Array(0);
let generacion = 1;

/** Los búferes se rehacen si cambia el tamaño del mapa. */
function asegurar(): void {
  const n = ANCHO * ALTO;
  if (distancia.length === n) return;
  distancia = new Float32Array(n);
  padre = new Int32Array(n);
  sello = new Uint32Array(n);
  generacion = 1;
}

const VX = [1, -1, 0, 0, 1, 1, -1, -1];
const VY = [0, 0, 1, -1, 1, -1, 1, -1];
const COSTE = [1, 1, 1, 1, Math.SQRT2, Math.SQRT2, Math.SQRT2, Math.SQRT2];

class Monticulo {
  private c: number[] = [];
  private p: number[] = [];
  get vacio(): boolean {
    return this.c.length === 0;
  }
  meter(i: number, prio: number): void {
    const c = this.c;
    const p = this.p;
    c.push(i);
    p.push(prio);
    let k = c.length - 1;
    while (k > 0) {
      const pa = (k - 1) >> 1;
      if (p[pa]! <= prio) break;
      c[k] = c[pa]!;
      p[k] = p[pa]!;
      k = pa;
    }
    c[k] = i;
    p[k] = prio;
  }
  sacar(): number {
    const c = this.c;
    const p = this.p;
    const top = c[0]!;
    const ultC = c.pop()!;
    const ultP = p.pop()!;
    if (c.length > 0) {
      let k = 0;
      const n = c.length;
      for (;;) {
        const a = 2 * k + 1;
        const b = a + 1;
        let m = k;
        let mp = ultP;
        if (a < n && p[a]! < mp) {
          m = a;
          mp = p[a]!;
        }
        if (b < n && p[b]! < mp) m = b;
        if (m === k) break;
        c[k] = c[m]!;
        p[k] = p[m]!;
        k = m;
      }
      c[k] = ultC;
      p[k] = ultP;
    }
    return top;
  }
}

export type Pasable = (i: number) => boolean;

/**
 * Camino desde `inicio` hasta la primera casilla que cumpla `meta`. Devuelve
 * las casillas a recorrer (sin la de inicio) o null. `heuristica` opcional
 * convierte la búsqueda en A*.
 */
export function buscar(inicio: number, pasable: Pasable, meta: (i: number) => boolean, opciones: { max?: number; heuristica?: (i: number) => number } = {}): number[] | null {
  asegurar();
  generacion++;
  const g = generacion;
  const h = opciones.heuristica;
  const max = opciones.max ?? 1e9;
  const abierta = new Monticulo();
  sello[inicio] = g;
  distancia[inicio] = 0;
  padre[inicio] = -1;
  abierta.meter(inicio, h ? h(inicio) : 0);
  const cerrada = new Set<number>();
  while (!abierta.vacio) {
    const i = abierta.sacar();
    if (cerrada.has(i)) continue;
    cerrada.add(i);
    if (meta(i)) {
      const camino: number[] = [];
      let k = i;
      while (k !== inicio) {
        camino.push(k);
        k = padre[k]!;
      }
      return camino.reverse();
    }
    const d = distancia[i]!;
    if (d > max) continue;
    const x = i % ANCHO;
    const y = (i / ANCHO) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + VX[k]!;
      const ny = y + VY[k]!;
      if (nx < 0 || ny < 0 || nx >= ANCHO || ny >= ALTO) continue;
      const j = ny * ANCHO + nx;
      if (!pasable(j)) continue;
      if (k >= 4 && (!pasable(y * ANCHO + nx) || !pasable(ny * ANCHO + x))) continue;
      const nd = d + COSTE[k]!;
      if (sello[j] === g && distancia[j]! <= nd) continue;
      sello[j] = g;
      distancia[j] = nd;
      padre[j] = i;
      abierta.meter(j, nd + (h ? h(j) : 0));
    }
  }
  return null;
}

/** Camino a una casilla concreta (A*). Si `adyacente`, basta con llegar a su lado. */
export function caminoA(inicio: number, destino: number, pasable: Pasable, adyacente = false): number[] | null {
  const dx = destino % ANCHO;
  const dy = (destino / ANCHO) | 0;
  if (inicio === destino && !adyacente) return [];
  const meta = adyacente
    ? (i: number) => Math.max(Math.abs((i % ANCHO) - dx), Math.abs(((i / ANCHO) | 0) - dy)) <= 1 && i !== destino
    : (i: number) => i === destino;
  if (adyacente && meta(inicio)) return [];
  return buscar(inicio, pasable, meta, { heuristica: (i) => Math.max(Math.abs((i % ANCHO) - dx), Math.abs(((i / ANCHO) | 0) - dy)) });
}

/**
 * Campo de distancias desde varias fuentes (el «mapa de olor» que siguen las
 * criaturas). `coste(i)` puede devolver Infinity para lo intransitable.
 */
export function campo(fuentes: number[], coste: (i: number) => number): Float32Array {
  const out = new Float32Array(ANCHO * ALTO).fill(Infinity);
  const abierta = new Monticulo();
  for (const f of fuentes) {
    out[f] = 0;
    abierta.meter(f, 0);
  }
  while (!abierta.vacio) {
    const i = abierta.sacar();
    const d = out[i]!;
    const x = i % ANCHO;
    const y = (i / ANCHO) | 0;
    for (let k = 0; k < 8; k++) {
      const nx = x + VX[k]!;
      const ny = y + VY[k]!;
      if (nx < 0 || ny < 0 || nx >= ANCHO || ny >= ALTO) continue;
      const j = ny * ANCHO + nx;
      const c = coste(j);
      if (!isFinite(c)) continue;
      if (k >= 4 && (!isFinite(coste(y * ANCHO + nx)) || !isFinite(coste(ny * ANCHO + x)))) continue;
      const nd = d + COSTE[k]! * c;
      if (nd < out[j]!) {
        out[j] = nd;
        abierta.meter(j, nd);
      }
    }
  }
  return out;
}

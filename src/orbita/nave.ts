/**
 * Una nave: una pila de piezas de arriba abajo, cada una con un par de piezas
 * radiales opcional a los lados.
 *
 * Las etapas salen solas de los desacopladores: todo lo que queda por debajo
 * del último desacoplador es la etapa activa, y Espacio la suelta. Los motores
 * de la etapa activa beben de los tanques de esa misma etapa.
 *
 * La posición de la nave es la de su centro de masas. A lo largo del eje, `y`
 * se mide en metros desde la punta hacia la cola.
 */
import { type InfoRaza, type Parte, type Raza, RAZAS, costeParte, existeParte, parte } from './partes';
import { type Inventario, masaInventario } from './mercado';
import { type V, v, polar, suma, escala } from './vec';
import { G0 } from './sistema';

export interface PiezaDiseno {
  parte: string;
  radial: string | null;
}

export interface Diseno {
  nombre: string;
  raza: Raza;
  pila: PiezaDiseno[];
}

export interface Nodo {
  parte: Parte;
  radial: Parte | null;
  hp: number;
  /** Vida del par radial (las dos piezas juntas). */
  hpRadial: number;
  comb: number;
  /** Combustible del par radial (los cohetes sólidos laterales). */
  combRadial: number;
  /** Recarga de cada arma radial, izquierda y derecha. */
  cd: [number, number];
}

export interface Geometria {
  /** Coordenada y de la parte de arriba de cada nodo. */
  ys: number[];
  largo: number;
  /** Centro de masas, medido desde la punta. */
  ycm: number;
  anchoMax: number;
  /** Momento de inercia, t·m². */
  inercia: number;
}

let siguienteId = 1;

export function nodoDe(p: PiezaDiseno): Nodo {
  const pa = parte(p.parte);
  const ra = p.radial ? parte(p.radial) : null;
  return {
    parte: pa,
    radial: ra,
    hp: pa.hp,
    hpRadial: ra ? ra.hp * 2 : 0,
    comb: pa.combustible ?? 0,
    combRadial: ra ? (ra.combustible ?? 0) * 2 : 0,
    cd: [0, 0],
  };
}

export function masaNodo(n: Nodo): number {
  let m = n.parte.masa + n.comb;
  if (n.radial) m += n.radial.masa * 2 + n.combRadial;
  return m;
}

export function geometria(nodos: Nodo[]): Geometria {
  const ys: number[] = [];
  let y = 0;
  let anchoMax = 0.5;
  let m = 0;
  let my = 0;
  for (const n of nodos) {
    ys.push(y);
    const mn = masaNodo(n);
    m += mn;
    my += mn * (y + n.parte.alto / 2);
    y += n.parte.alto;
    anchoMax = Math.max(anchoMax, n.parte.ancho + (n.radial ? n.radial.ancho * 2 : 0));
  }
  const ycm = m > 0 ? my / m : y / 2;
  let inercia = 0;
  nodos.forEach((n, i) => {
    const c = (ys[i] ?? 0) + n.parte.alto / 2 - ycm;
    const mn = masaNodo(n);
    inercia += mn * (c * c + (n.parte.alto * n.parte.alto) / 12 + (n.parte.ancho * n.parte.ancho) / 12);
    if (n.radial) {
      const off = n.parte.ancho / 2 + n.radial.ancho / 2;
      inercia += (n.radial.masa * 2 + n.combRadial) * off * off;
    }
  });
  return { ys, largo: y, ycm, anchoMax, inercia: Math.max(0.2, inercia) };
}

export interface Motor {
  parte: Parte;
  nodo: Nodo;
  radial: boolean;
  /** Cuántas piezas iguales: 2 en los pares radiales. */
  num: number;
}

export interface MontajeArma {
  parte: Parte;
  nodo: Nodo;
  indice: number;
  lado: 0 | 1;
}

export class Nave {
  readonly id = siguienteId++;
  nombre: string;
  raza: Raza;
  nodos: Nodo[];
  pos: V = v();
  vel: V = v();
  /** Hacia dónde apunta la punta, en radianes. */
  ang = Math.PI / 2;
  omega = 0;
  /** Acelerador, de 0 a 1. */
  acel = 0;
  /** Mando de giro, de -1 (horario) a 1 (antihorario). */
  giro = 0;
  sas = true;
  encendida = false;
  carga: Inventario = {};
  energia = 0;
  escudo = 0;
  posado: { cuerpo: string; ang: number } | null = null;
  paracaidas = false;
  taladrando = false;
  refinando = false;
  combustibleInfinito = false;
  inmortal = false;
  energiaInfinita = false;
  /** Sin mando no se controla: es chatarra a la deriva. */
  destruida = false;
  motivo = '';
  /** Tiempo de vida para los restos. */
  vida = Infinity;
  /** Disparo de rayo activo este fotograma (para dibujarlo). */
  rayos: { desde: V; hasta: V; color: string }[] = [];
  /** Últimos golpes recibidos, para el parpadeo. */
  golpe = 0;
  private geo: Geometria | null = null;

  constructor(nombre: string, raza: Raza, nodos: Nodo[]) {
    this.nombre = nombre;
    this.raza = raza;
    this.nodos = nodos;
    this.energia = this.energiaMax();
    this.escudo = this.escudoMax();
  }

  static desde(d: Diseno): Nave {
    return new Nave(d.nombre, d.raza, d.pila.filter((p) => existeParte(p.parte)).map(nodoDe));
  }

  get info(): InfoRaza {
    return RAZAS[this.raza];
  }

  invalidar(): void {
    this.geo = null;
  }

  get geometria(): Geometria {
    if (!this.geo) this.geo = geometria(this.nodos);
    return this.geo;
  }

  /** Dirección de la punta. */
  get dir(): V {
    return polar(this.ang);
  }

  /** Punto del eje, a `y` metros de la punta, en el mundo. */
  puntoEje(y: number): V {
    return suma(this.pos, escala(this.dir, this.geometria.ycm - y));
  }

  get controlable(): boolean {
    return !this.destruida && this.nodos.some((n) => n.parte.mando);
  }

  masa(): number {
    let m = masaInventario(this.carga);
    for (const n of this.nodos) m += masaNodo(n);
    return Math.max(0.01, m);
  }

  /** Índice del primer nodo de la etapa activa. */
  inicioEtapa(): number {
    for (let i = this.nodos.length - 1; i >= 0; i--) {
      if (this.nodos[i]!.parte.forma === 'desacoplador') return i + 1;
    }
    return 0;
  }

  /** Combustible líquido de la etapa activa. */
  combustibleEtapa(): number {
    let c = 0;
    for (let i = this.inicioEtapa(); i < this.nodos.length; i++) {
      const n = this.nodos[i]!;
      if (!n.parte.solido) c += n.comb;
    }
    return c;
  }

  capacidadEtapa(): number {
    let c = 0;
    for (let i = this.inicioEtapa(); i < this.nodos.length; i++) {
      const n = this.nodos[i]!;
      if (!n.parte.solido) c += n.parte.combustible ?? 0;
    }
    return c;
  }

  combustibleTotal(): number {
    let c = 0;
    for (const n of this.nodos) c += n.comb + n.combRadial;
    return c;
  }

  motores(): Motor[] {
    const out: Motor[] = [];
    for (let i = this.inicioEtapa(); i < this.nodos.length; i++) {
      const n = this.nodos[i]!;
      if (n.parte.empuje) out.push({ parte: n.parte, nodo: n, radial: false, num: 1 });
      if (n.radial?.empuje) out.push({ parte: n.radial, nodo: n, radial: true, num: 2 });
    }
    return out;
  }

  /**
   * Empuje del fotograma, en kN, y combustible que se gasta en `dt`.
   * `presion` es la atmosférica relativa (1 = nivel del mar de Gaia).
   */
  quemar(dt: number, presion: number): number {
    if (!this.encendida) return 0;
    const p = Math.min(1, presion);
    const motores = this.motores();
    let empuje = 0;
    let consumoLiquido = 0;
    for (const m of motores) {
      const isp = (m.parte.ispVac ?? 300) * (1 - p) + (m.parte.ispAtm ?? 300) * p;
      if (m.parte.solido) {
        const queda = m.radial ? m.nodo.combRadial : m.nodo.comb;
        if (queda <= 0) continue;
        // Un sólido no tiene acelerador: siempre a fondo.
        const f = (m.parte.empuje ?? 0) * m.num;
        const gasto = Math.min(queda, (f / (isp * G0)) * dt);
        if (!this.combustibleInfinito) {
          if (m.radial) m.nodo.combRadial -= gasto;
          else m.nodo.comb -= gasto;
        }
        empuje += f * (gasto / ((f / (isp * G0)) * dt));
      } else {
        const f = (m.parte.empuje ?? 0) * m.num * this.acel;
        empuje += f;
        consumoLiquido += (f / (isp * G0)) * dt;
      }
    }
    if (consumoLiquido > 0) {
      const hay = this.combustibleEtapa();
      if (this.combustibleInfinito) return empuje;
      if (hay <= 1e-9) {
        // Sin combustible líquido solo empujan los sólidos.
        let soloSolidos = 0;
        for (const m of motores) if (m.parte.solido && (m.radial ? m.nodo.combRadial : m.nodo.comb) > 0) soloSolidos += (m.parte.empuje ?? 0) * m.num;
        return Math.min(empuje, soloSolidos);
      }
      const fraccion = Math.min(1, hay / consumoLiquido);
      this.gastarLiquido(consumoLiquido * fraccion);
      // Si no queda para todo el paso, el empuje líquido se recorta en proporción.
      if (fraccion < 1) {
        let liquido = 0;
        for (const m of motores) if (!m.parte.solido) liquido += (m.parte.empuje ?? 0) * m.num * this.acel;
        empuje -= liquido * (1 - fraccion);
      }
    }
    return empuje;
  }

  /** Gasta combustible líquido de la etapa activa, empezando por arriba. */
  gastarLiquido(cant: number): void {
    let resto = cant;
    for (let i = this.inicioEtapa(); i < this.nodos.length && resto > 0; i++) {
      const n = this.nodos[i]!;
      if (n.parte.solido) continue;
      const t = Math.min(n.comb, resto);
      n.comb -= t;
      resto -= t;
    }
  }

  /** Añade combustible líquido a la etapa activa (refinería, repostaje). */
  repostar(cant: number): number {
    let puesto = 0;
    for (let i = this.inicioEtapa(); i < this.nodos.length; i++) {
      const n = this.nodos[i]!;
      if (n.parte.solido || !n.parte.combustible) continue;
      const hueco = n.parte.combustible - n.comb;
      const t = Math.min(hueco, cant - puesto);
      n.comb += t;
      puesto += t;
    }
    return puesto;
  }

  /** Empuje máximo de la etapa activa con el acelerador a fondo, en kN. */
  empujeMax(): number {
    let f = 0;
    for (const m of this.motores()) {
      const queda = m.parte.solido ? (m.radial ? m.nodo.combRadial : m.nodo.comb) : this.combustibleEtapa();
      if (queda > 0 || this.combustibleInfinito) f += (m.parte.empuje ?? 0) * m.num;
    }
    return f;
  }

  hayMotorSolidoArdiendo(): boolean {
    if (!this.encendida) return false;
    return this.motores().some((m) => m.parte.solido && (m.radial ? m.nodo.combRadial : m.nodo.comb) > 0);
  }

  par(rho: number): number {
    let p = 0;
    for (const n of this.nodos) {
      p += n.parte.par ?? 0;
      if (n.radial?.estabilizador) p += n.radial.estabilizador * 2 * Math.min(1, rho * 2);
    }
    return p;
  }

  capacidadCarga(): number {
    let c = 0;
    for (const n of this.nodos) c += n.parte.carga ?? 0;
    return c;
  }

  ritmoTaladro(): number {
    let t = 0;
    for (const n of this.nodos) {
      t += n.parte.taladro ?? 0;
      if (n.radial?.taladro) t += n.radial.taladro * 2;
    }
    return t * RAZAS[this.raza].taladro;
  }

  ritmoRefineria(): number {
    let t = 0;
    for (const n of this.nodos) t += n.parte.refineria ?? 0;
    return t;
  }

  energiaMax(): number {
    let e = 0;
    for (const n of this.nodos) e += n.parte.energia ?? 0;
    return e;
  }

  generacion(): number {
    let g = 0;
    for (const n of this.nodos) {
      g += n.parte.generacion ?? 0;
      if (n.radial?.generacion) g += n.radial.generacion * 2;
    }
    return g;
  }

  escudoMax(): number {
    let e = 0;
    for (const n of this.nodos) e += n.parte.escudo?.max ?? 0;
    return e;
  }

  escudoRegen(): { regen: number; consumo: number } {
    let r = 0;
    let c = 0;
    for (const n of this.nodos) {
      if (n.parte.escudo) {
        r += n.parte.escudo.regen;
        c += n.parte.escudo.consumo;
      }
    }
    return { regen: r, consumo: c };
  }

  tienePatas(): boolean {
    return this.nodos.some((n) => n.radial?.patas);
  }

  areaParacaidas(): number {
    let a = 0;
    for (const n of this.nodos) a += n.parte.paracaidas ?? 0;
    return a;
  }

  aerodinamica(): number {
    let k = 1;
    for (const n of this.nodos) if (n.parte.aerodinamico) k = Math.min(k, n.parte.aerodinamico);
    return k;
  }

  hp(): number {
    let h = 0;
    for (const n of this.nodos) h += n.hp + n.hpRadial;
    return h;
  }

  hpMax(): number {
    let h = 0;
    for (const n of this.nodos) h += n.parte.hp + (n.radial ? n.radial.hp * 2 : 0);
    return h;
  }

  armas(): MontajeArma[] {
    const out: MontajeArma[] = [];
    this.nodos.forEach((n, i) => {
      if (n.radial?.arma) {
        out.push({ parte: n.radial, nodo: n, indice: i, lado: 0 });
        out.push({ parte: n.radial, nodo: n, indice: i, lado: 1 });
      }
      if (n.parte.arma) out.push({ parte: n.parte, nodo: n, indice: i, lado: 0 });
    });
    return out;
  }

  /** Dónde está en el mundo un arma montada. */
  posArma(m: MontajeArma): V {
    const g = this.geometria;
    const n = m.nodo;
    const y = (g.ys[m.indice] ?? 0) + n.parte.alto / 2;
    const base = this.puntoEje(y);
    if (n.radial !== m.parte) return base;
    const off = (n.parte.ancho / 2 + m.parte.ancho / 2) * (m.lado === 0 ? 1 : -1);
    return suma(base, escala(polar(this.ang - Math.PI / 2), off));
  }

  /** Radio aproximado para colisiones. */
  radio(): number {
    const g = this.geometria;
    return Math.max(g.largo / 2, g.anchoMax / 2);
  }

  /** Coste de recuperar lo que queda de la nave. */
  valor(): number {
    let c = 0;
    for (const n of this.nodos) {
      c += costeParte(n.parte, this.raza) * (n.hp / n.parte.hp);
      if (n.radial) c += costeParte(n.radial, this.raza) * 2 * (n.hpRadial / (n.radial.hp * 2));
    }
    return c;
  }

  /**
   * Corta la pila: devuelve una nave nueva con los nodos [desde, hasta) en su
   * sitio del mundo, sin tocar esta.
   */
  fragmento(desde: number, hasta: number): Nave {
    const g = this.geometria;
    const nodos = this.nodos.slice(desde, hasta);
    const f = new Nave(`${this.nombre} (restos)`, this.raza, nodos);
    const yTop = g.ys[desde] ?? 0;
    const top = this.puntoEje(yTop);
    f.ang = this.ang;
    f.omega = this.omega;
    f.vel = { ...this.vel };
    f.pos = suma(top, escala(f.dir, -f.geometria.ycm));
    f.energia = 0;
    f.escudo = 0;
    f.encendida = true;
    f.acel = 0;
    f.vida = 240;
    return f;
  }

  /** Se queda con los nodos [desde, hasta) y recoloca el centro de masas. */
  private quedarse(desde: number, hasta: number): void {
    const g = this.geometria;
    const top = this.puntoEje(g.ys[desde] ?? 0);
    this.nodos = this.nodos.slice(desde, hasta);
    this.invalidar();
    this.pos = suma(top, escala(this.dir, -this.geometria.ycm));
    this.energia = Math.min(this.energia, this.energiaMax());
    this.escudo = Math.min(this.escudo, this.escudoMax());
  }

  /**
   * Espacio. La primera vez enciende los motores; después suelta la etapa de
   * abajo. Devuelve los restos que se separan.
   */
  etapa(): Nave | null {
    if (!this.encendida) {
      this.encendida = true;
      if (this.acel === 0 && this.motores().some((m) => !m.parte.solido)) this.acel = 1;
      return null;
    }
    const k = this.inicioEtapa() - 1;
    if (k < 0) return null;
    const restos = this.fragmento(k, this.nodos.length);
    restos.vel = suma(restos.vel, escala(this.dir, -1.5));
    this.quedarse(0, k);
    return restos;
  }

  /**
   * Recibe daño. Primero el escudo; luego una pieza al azar, con preferencia
   * por el blindaje (pesa diez veces su tamaño). Devuelve los trozos que se desprenden.
   */
  danar(cant: number, azar: () => number): Nave[] {
    if (this.inmortal || this.destruida) return [];
    this.golpe = 0.15;
    if (this.escudo > 0) {
      const abs = Math.min(this.escudo, cant);
      this.escudo -= abs;
      cant -= abs;
      if (cant <= 0) return [];
    }
    // Elegir pieza: el blindaje pesa diez veces más.
    const pesos: { i: number; radial: boolean; w: number }[] = [];
    this.nodos.forEach((n, i) => {
      const area = n.parte.ancho * n.parte.alto;
      pesos.push({ i, radial: false, w: area * (n.parte.blindaje ? 10 : 1) });
      if (n.radial && n.hpRadial > 0) pesos.push({ i, radial: true, w: n.radial.ancho * n.radial.alto * 2 });
    });
    let total = 0;
    for (const p of pesos) total += p.w;
    let r = azar() * total;
    let elegido = pesos[0];
    for (const p of pesos) {
      r -= p.w;
      if (r <= 0) {
        elegido = p;
        break;
      }
    }
    if (!elegido) return [];
    const n = this.nodos[elegido.i]!;
    if (elegido.radial) {
      n.hpRadial -= cant;
      if (n.hpRadial <= 0) {
        n.radial = null;
        n.hpRadial = 0;
        n.combRadial = 0;
        this.invalidar();
      }
      return [];
    }
    n.hp -= cant;
    if (n.hp > 0) return [];
    return this.romper(elegido.i);
  }

  /** La pieza i revienta: lo de debajo se separa. */
  romper(i: number): Nave[] {
    const arriba = [0, i] as const;
    const abajo = [i + 1, this.nodos.length] as const;
    const tieneMando = (a: number, b: number) => this.nodos.slice(a, b).some((n) => n.parte.mando);
    const out: Nave[] = [];
    const mandoArriba = tieneMando(arriba[0], arriba[1]);
    const mandoAbajo = tieneMando(abajo[0], abajo[1]);
    if (!mandoArriba && !mandoAbajo) {
      this.destruida = true;
      this.motivo = this.motivo || 'destruida en combate';
      // Todo lo que queda se suelta como chatarra.
      if (abajo[1] > abajo[0]) out.push(this.fragmento(abajo[0], abajo[1]));
      if (arriba[1] > arriba[0]) out.push(this.fragmento(arriba[0], arriba[1]));
      return out;
    }
    if (mandoArriba) {
      if (abajo[1] > abajo[0]) out.push(this.fragmento(abajo[0], abajo[1]));
      this.quedarse(arriba[0], arriba[1]);
    } else {
      if (arriba[1] > arriba[0]) out.push(this.fragmento(arriba[0], arriba[1]));
      this.quedarse(abajo[0], abajo[1]);
    }
    return out;
  }
}

// --------------------------------------------------------------- estadísticas

export interface InfoEtapa {
  dvVac: number;
  dvAtm: number;
  /** Relación empuje/peso en la superficie del mundo natal. */
  twr: number;
  masaInicial: number;
  tiempo: number;
}

/**
 * Δv por etapa, de la primera en encenderse (la de abajo) a la última. Mezcla
 * los sólidos y los líquidos con un impulso específico ponderado por empuje.
 */
export function etapas(d: Diseno, gSuperficie: number): InfoEtapa[] {
  const nodos = d.pila.filter((p) => existeParte(p.parte)).map(nodoDe);
  const out: InfoEtapa[] = [];
  let resto = nodos;
  while (resto.length > 0) {
    let k = 0;
    for (let i = resto.length - 1; i >= 0; i--) {
      if (resto[i]!.parte.forma === 'desacoplador') {
        k = i + 1;
        break;
      }
    }
    const etapa = resto.slice(k);
    let m0 = 0;
    for (const n of resto) m0 += masaNodo(n);
    let comb = 0;
    let empuje = 0;
    let wAtm = 0;
    let wVac = 0;
    for (const n of etapa) {
      comb += n.comb + n.combRadial;
      for (const [p, num] of [
        [n.parte, 1],
        [n.radial, 2],
      ] as const) {
        if (!p?.empuje) continue;
        const f = p.empuje * num;
        empuje += f;
        wAtm += f / (p.ispAtm ?? 300);
        wVac += f / (p.ispVac ?? 300);
      }
    }
    const m1 = m0 - comb;
    const ispAtm = wAtm > 0 ? empuje / wAtm : 0;
    const ispVac = wVac > 0 ? empuje / wVac : 0;
    const ln = m1 > 0 && m0 > m1 ? Math.log(m0 / m1) : 0;
    const consumo = wVac > 0 ? wVac / G0 : 0;
    out.push({
      dvVac: ispVac * G0 * ln,
      dvAtm: ispAtm * G0 * ln,
      twr: empuje / (m0 * gSuperficie),
      masaInicial: m0,
      tiempo: consumo > 0 ? comb / consumo : 0,
    });
    resto = resto.slice(0, Math.max(0, k - 1));
  }
  return out;
}

export function costeDiseno(d: Diseno): number {
  let c = 0;
  for (const p of d.pila) {
    if (!existeParte(p.parte)) continue;
    c += costeParte(parte(p.parte), d.raza);
    if (p.radial && existeParte(p.radial)) c += costeParte(parte(p.radial), d.raza) * 2;
  }
  return c;
}

/** Problemas que impiden lanzar un diseño. */
export function problemasDiseno(d: Diseno): string[] {
  const out: string[] = [];
  const pila = d.pila.filter((p) => existeParte(p.parte));
  if (pila.length === 0) return ['La nave está vacía.'];
  if (!pila.some((p) => parte(p.parte).mando)) out.push('Falta una pieza de mando (cápsula, núcleo o sonda).');
  const tieneMotor = pila.some((p) => parte(p.parte).empuje || (p.radial && parte(p.radial).empuje));
  if (!tieneMotor) out.push('No hay ningún motor.');
  return out;
}

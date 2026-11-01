/**
 * El sistema: un planeta central, su luna, el mundo alienígena que lo orbita,
 * dos campos de asteroides y dos estaciones.
 *
 * Todo lo que no es una nave va «sobre raíles»: órbitas circulares calculadas
 * a partir del tiempo, sin integrar nada. Así un año de juego no acumula error
 * y avanzar el tiempo a 5000× no cuesta más que a 1×.
 *
 * La escala es de juguete, como en todos los juegos del género: Gaia mide 60 km
 * de radio, pero en la superficie la gravedad es la de verdad, 9,8 m/s².
 */
import { type V, v, polar, suma, rng, largo, resta } from './vec';
import type { Mineral } from './mercado';
import type { Raza } from './partes';

export const G0 = 9.8;

export interface Atmosfera {
  /** Por encima de esta altitud no hay aire. */
  techo: number;
  /** Densidad al nivel del suelo, kg/m³. */
  rho0: number;
  /** Altura de escala: cada tantos metros la densidad cae a 1/e. */
  escala: number;
  colorBajo: string;
  colorAlto: string;
}

export interface OrbitaCircular {
  padre: string;
  radio: number;
  fase: number;
  /** Velocidad angular, rad/s (negativa = sentido horario). */
  omega: number;
}

export interface Cuerpo {
  id: string;
  nombre: string;
  radio: number;
  /** Parámetro gravitatorio GM, m³/s². */
  gm: number;
  atm: Atmosfera | null;
  orbita: OrbitaCircular | null;
  /** Esfera de influencia: dentro, solo manda la gravedad de este cuerpo. */
  soi: number;
  colorSuelo: string;
  colorRoca: string;
  /** Amplitud del relieve en metros. */
  relieve: number;
  semilla: number;
  /** Mundo natal de una raza, si lo es. */
  natal: Raza | null;
}

function gmDe(radio: number, g: number): number {
  return g * radio * radio;
}

const GAIA_R = 60_000;
const GAIA_GM = gmDe(GAIA_R, G0);

function omegaCircular(gmPadre: number, r: number): number {
  return Math.sqrt(gmPadre / (r * r * r));
}

function soiDe(a: number, gm: number, gmPadre: number): number {
  return a * Math.pow(gm / gmPadre, 0.4);
}

const SELENE_A = 620_000;
const SELENE_GM = gmDe(15_000, 1.6);
const XYL_A = 1_500_000;
const XYL_GM = gmDe(30_000, 6.2);

export const CUERPOS: Cuerpo[] = [
  {
    id: 'gaia',
    nombre: 'Gaia',
    radio: GAIA_R,
    gm: GAIA_GM,
    atm: { techo: 22_000, rho0: 1.2, escala: 3_200, colorBajo: '#6fb3ef', colorAlto: '#0b1a3a' },
    orbita: null,
    soi: Infinity,
    colorSuelo: '#4f8f4a',
    colorRoca: '#3b5a37',
    relieve: 900,
    semilla: 11,
    natal: 'humana',
  },
  {
    id: 'selene',
    nombre: 'Selene',
    radio: 15_000,
    gm: SELENE_GM,
    atm: null,
    orbita: { padre: 'gaia', radio: SELENE_A, fase: 2.1, omega: omegaCircular(GAIA_GM, SELENE_A) },
    soi: soiDe(SELENE_A, SELENE_GM, GAIA_GM),
    colorSuelo: '#9b9a95',
    colorRoca: '#6f6e6a',
    relieve: 700,
    semilla: 23,
    natal: null,
  },
  {
    id: 'xyl',
    nombre: 'Xyl',
    radio: 30_000,
    gm: XYL_GM,
    atm: { techo: 14_000, rho0: 0.7, escala: 2_400, colorBajo: '#a46cd6', colorAlto: '#1a0b2e' },
    orbita: { padre: 'gaia', radio: XYL_A, fase: -0.6, omega: omegaCircular(GAIA_GM, XYL_A) },
    soi: soiDe(XYL_A, XYL_GM, GAIA_GM),
    colorSuelo: '#5b2f7a',
    colorRoca: '#3a1d52',
    relieve: 1_200,
    semilla: 37,
    natal: 'alien',
  },
];

export function cuerpo(id: string): Cuerpo {
  const c = CUERPOS.find((x) => x.id === id);
  if (!c) throw new Error(`cuerpo desconocido: ${id}`);
  return c;
}

export const GAIA = cuerpo('gaia');

/** Posición en el marco inercial (centrado en Gaia) de algo en órbita circular. */
export function posOrbita(o: OrbitaCircular, t: number): V {
  const padre = posCuerpo(cuerpo(o.padre), t);
  return suma(padre, polar(o.fase + o.omega * t, o.radio));
}

export function velOrbita(o: OrbitaCircular, t: number): V {
  const padre = velCuerpo(cuerpo(o.padre), t);
  const a = o.fase + o.omega * t;
  const s = o.omega * o.radio;
  return suma(padre, v(-Math.sin(a) * s, Math.cos(a) * s));
}

/** Aceleración (centrípeta) de algo en órbita circular: la necesita la aproximación de cónicas. */
export function acelOrbita(o: OrbitaCircular, t: number): V {
  const a = o.fase + o.omega * t;
  const k = -o.omega * o.omega * o.radio;
  return v(Math.cos(a) * k, Math.sin(a) * k);
}

export function posCuerpo(c: Cuerpo, t: number): V {
  return c.orbita ? posOrbita(c.orbita, t) : v(0, 0);
}

export function velCuerpo(c: Cuerpo, t: number): V {
  return c.orbita ? velOrbita(c.orbita, t) : v(0, 0);
}

export function acelCuerpo(c: Cuerpo, t: number): V {
  return c.orbita ? acelOrbita(c.orbita, t) : v(0, 0);
}

/** El cuerpo cuya gravedad manda en ese punto: el de menor esfera que lo contiene. */
export function dominante(p: V, t: number): Cuerpo {
  let mejor = GAIA;
  for (const c of CUERPOS) {
    if (!c.orbita) continue;
    if (largo(resta(p, posCuerpo(c, t))) < c.soi && c.soi < mejor.soi) mejor = c;
  }
  return mejor;
}

/** Altura del relieve, en metros, en el ángulo dado. Suave cerca de las bases. */
export function relieve(c: Cuerpo, ang: number): number {
  const s = c.semilla;
  let h = 0;
  h += Math.sin(ang * 7 + s) * 0.45;
  h += Math.sin(ang * 19 + s * 1.7) * 0.25;
  h += Math.sin(ang * 53 + s * 2.3) * 0.12;
  h += Math.sin(ang * 131 + s * 3.1) * 0.06;
  h = (h + 0.9) / 1.8;
  // Explanada plana alrededor de la base de lanzamiento.
  const d = Math.abs(((ang - ANGULO_BASE + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  const llano = Math.min(1, Math.max(0, (d - 0.004) / 0.03));
  return c.relieve * h * llano;
}

/** La base de lanzamiento está arriba de cada mundo natal. */
export const ANGULO_BASE = Math.PI / 2;

export function densidad(c: Cuerpo, altitud: number): number {
  if (!c.atm || altitud > c.atm.techo) return 0;
  const bruto = c.atm.rho0 * Math.exp(-Math.max(0, altitud) / c.atm.escala);
  // Se apaga del todo en el techo en lugar de cortarse de golpe.
  const borde = Math.min(1, (c.atm.techo - altitud) / (c.atm.techo * 0.15));
  return bruto * borde;
}

export function presion(c: Cuerpo, altitud: number): number {
  return c.atm ? densidad(c, altitud) / c.atm.rho0 : 0;
}

/** Velocidad de una órbita circular a esa distancia del centro. */
export function vCircular(c: Cuerpo, r: number): number {
  return Math.sqrt(c.gm / r);
}

// ---------------------------------------------------------------- asteroides

export interface Asteroide {
  id: number;
  nombre: string;
  orbita: OrbitaCircular;
  radio: number;
  /** Contorno en unidades del radio, para dibujarlo. */
  forma: number[];
  giro: number;
  /** Fracción de cada mineral en la roca. */
  composicion: Partial<Record<Mineral, number>>;
  /** Toneladas que quedan por extraer. */
  reserva: number;
  reservaInicial: number;
  /** Territorio de una raza: minar aquí molesta a sus dueños. */
  territorio: Raza | null;
}

function crearForma(r: () => number): number[] {
  const n = 28;
  const bruto: number[] = [];
  for (let i = 0; i < n; i++) bruto.push(0.7 + r() * 0.4);
  // Suavizado circular: una roca, no una estrella.
  return bruto.map((_, i) => (bruto[(i + n - 1) % n]! + bruto[i]! * 2 + bruto[(i + 1) % n]!) / 4);
}

export function crearAsteroides(semilla = 98): Asteroide[] {
  const r = rng(semilla);
  const out: Asteroide[] = [];
  const nombres = ['AX', 'BR', 'CT', 'DL', 'EK', 'FN', 'GP', 'HV'];
  // El Cinturón de Escombros, alrededor de Gaia.
  for (let i = 0; i < 44; i++) {
    const radioOrb = 240_000 + r() * 110_000;
    const radio = 120 + r() * r() * 900;
    const tipo = r();
    const comp: Partial<Record<Mineral, number>> =
      tipo < 0.4
        ? { hierro: 0.6, niquel: 0.3, titanio: 0.1 }
        : tipo < 0.7
          ? { hielo: 0.7, hierro: 0.2, niquel: 0.1 }
          : tipo < 0.92
            ? { niquel: 0.4, titanio: 0.4, hierro: 0.2 }
            : { platino: 0.35, titanio: 0.35, niquel: 0.3 };
    const reserva = Math.round(radio * radio * 0.0006 + 20);
    out.push({
      id: i,
      nombre: `${nombres[i % nombres.length]}-${100 + i * 7}`,
      orbita: { padre: 'gaia', radio: radioOrb, fase: r() * Math.PI * 2, omega: omegaCircular(GAIA_GM, radioOrb) },
      radio,
      forma: crearForma(r),
      giro: (r() - 0.5) * 0.05,
      composicion: comp,
      reserva,
      reservaInicial: reserva,
      territorio: 'humana',
    });
  }
  // El Anillo de Xyl: más pobre en roca y rico en xenita.
  for (let i = 0; i < 22; i++) {
    const radioOrb = 85_000 + r() * 40_000;
    const radio = 100 + r() * 500;
    const comp: Partial<Record<Mineral, number>> =
      r() < 0.5 ? { xenita: 0.3, hielo: 0.4, hierro: 0.3 } : { xenita: 0.15, platino: 0.25, titanio: 0.6 };
    const reserva = Math.round(radio * radio * 0.0006 + 15);
    out.push({
      id: 100 + i,
      nombre: `XY-${300 + i * 11}`,
      orbita: { padre: 'xyl', radio: radioOrb, fase: r() * Math.PI * 2, omega: omegaCircular(XYL_GM, radioOrb) },
      radio,
      forma: crearForma(r),
      giro: (r() - 0.5) * 0.06,
      composicion: comp,
      reserva,
      reservaInicial: reserva,
      territorio: 'alien',
    });
  }
  return out;
}

// ---------------------------------------------------------------- estaciones

export interface Estacion {
  id: 'humana' | 'alien';
  nombre: string;
  orbita: OrbitaCircular;
  hpMax: number;
  radio: number;
}

export const ESTACIONES: Estacion[] = [
  {
    id: 'humana',
    nombre: 'Puerto Gaia',
    orbita: { padre: 'gaia', radio: GAIA_R + 140_000, fase: 1.2, omega: omegaCircular(GAIA_GM, GAIA_R + 140_000) },
    hpMax: 4000,
    radio: 60,
  },
  {
    id: 'alien',
    nombre: 'Colmena Orbital',
    orbita: { padre: 'xyl', radio: 30_000 + 45_000, fase: 0.3, omega: omegaCircular(XYL_GM, 75_000) },
    hpMax: 4000,
    radio: 60,
  },
];

export function estacionDe(r: Raza): Estacion {
  return ESTACIONES.find((e) => e.id === r) ?? ESTACIONES[0]!;
}

export function natalDe(r: Raza): Cuerpo {
  return CUERPOS.find((c) => c.natal === r) ?? GAIA;
}

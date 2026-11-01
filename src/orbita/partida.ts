/**
 * La partida: todo lo que sobrevive entre vuelos y se guarda en el navegador.
 */
import { type Diplomacia, crearDiplomacia } from './ia';
import { type EstadoMercado, type Inventario, crearMercado } from './mercado';
import type { Diseno } from './nave';
import type { Raza } from './partes';
import { ESTACIONES } from './sistema';

export interface Partida {
  version: 1;
  raza: Raza;
  creditos: number;
  /** Mineral en el almacén de casa, listo para vender. */
  almacen: Inventario;
  tecnologias: string[];
  mercado: EstadoMercado;
  diplomacia: Diplomacia;
  /** Vida de cada estación. */
  estaciones: Record<string, number>;
  /** Mineral que queda en cada asteroide (por id). */
  reservas: Record<number, number>;
  disenos: Diseno[];
  /** Diseño en el hangar. */
  actual: Diseno;
  /** Tiempo de juego, en segundos. Las órbitas dependen de él. */
  t: number;
  stats: { lanzamientos: number; perdidas: number; toneladas: number; ventas: number; derribos: number };
  /** Ajustes del panel de administración. */
  admin: { dios: boolean; combustible: boolean; warpMax: number };
}

const CLAVE = 'frontera-orbital.partida';

export function disenoInicial(raza: Raza): Diseno {
  if (raza === 'alien') {
    return {
      nombre: 'Recolectora',
      raza,
      pila: [
        { parte: 'paracaidas', radial: null },
        { parte: 'a_simbionte', radial: null },
        { parte: 'a_buche_s', radial: 'a_garra' },
        { parte: 'a_vejiga_m', radial: 'aletas' },
        { parte: 'a_vejiga_s', radial: null },
        { parte: 'a_pulso', radial: null },
      ],
    };
  }
  return {
    nombre: 'Minera Básica',
    raza,
    pila: [
      { parte: 'paracaidas', radial: null },
      { parte: 'h_alondra', radial: null },
      { parte: 'h_bodega_s', radial: 'h_topo' },
      { parte: 'h_t400', radial: 'aletas' },
      { parte: 'h_t400', radial: null },
      { parte: 'h_saltamontes', radial: null },
    ],
  };
}

export function disenosDeEjemplo(raza: Raza): Diseno[] {
  const h = raza === 'humana';
  return [
    disenoInicial(raza),
    {
      nombre: 'Dos etapas',
      raza,
      pila: h
        ? [
            { parte: 'paracaidas', radial: null },
            { parte: 'h_alondra', radial: null },
            { parte: 'h_bodega_s', radial: 'h_topo' },
            { parte: 'h_t400', radial: null },
            { parte: 'h_saltamontes', radial: null },
            { parte: 'desacoplador', radial: null },
            { parte: 'h_t400', radial: 'h_martillo' },
            { parte: 'h_saltamontes', radial: 'aletas' },
          ]
        : [
            { parte: 'paracaidas', radial: null },
            { parte: 'a_simbionte', radial: null },
            { parte: 'a_buche_s', radial: 'a_garra' },
            { parte: 'a_vejiga_m', radial: null },
            { parte: 'a_pulso', radial: null },
            { parte: 'desacoplador', radial: null },
            { parte: 'a_vejiga_m', radial: 'a_racimo' },
            { parte: 'a_pulso', radial: 'aletas' },
          ],
    },
  ];
}

export function nuevaPartida(raza: Raza): Partida {
  const estaciones: Record<string, number> = {};
  for (const e of ESTACIONES) estaciones[e.id] = e.hpMax;
  return {
    version: 1,
    raza,
    creditos: 25_000,
    almacen: {},
    tecnologias: [],
    mercado: crearMercado(),
    diplomacia: crearDiplomacia(),
    estaciones,
    reservas: {},
    disenos: disenosDeEjemplo(raza),
    actual: disenoInicial(raza),
    t: 0,
    stats: { lanzamientos: 0, perdidas: 0, toneladas: 0, ventas: 0, derribos: 0 },
    admin: { dios: false, combustible: false, warpMax: 5000 },
  };
}

export function guardar(p: Partida): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado): se juega igual, sin guardar.
  }
}

export function cargar(): Partida | null {
  try {
    const s = localStorage.getItem(CLAVE);
    if (!s) return null;
    const p = JSON.parse(s) as Partida;
    if (p.version !== 1) return null;
    const base = nuevaPartida(p.raza);
    // Campos añadidos después: se rellenan con los valores por defecto.
    return { ...base, ...p, admin: { ...base.admin, ...p.admin }, stats: { ...base.stats, ...p.stats } };
  } catch {
    return null;
  }
}

export function borrar(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    /* nada */
  }
}

export function hpEstacion(p: Partida, id: string): number {
  return p.estaciones[id] ?? 0;
}

export function hpMaxEstacion(p: Partida, id: string): number {
  const e = ESTACIONES.find((x) => x.id === id);
  const base = e?.hpMax ?? 4000;
  return p.raza === id && p.tecnologias.includes('defensa3') ? base * 2 : base;
}

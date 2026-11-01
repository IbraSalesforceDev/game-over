/** El árbol de tecnología: cada nodo cuesta créditos y desbloquea piezas. */
import { PARTES, type Raza, sirveA } from './partes';

export type Rama = 'propulsion' | 'estructura' | 'mineria' | 'energia' | 'militar' | 'defensa';

export interface NodoTec {
  id: string;
  nombre: string;
  rama: Rama;
  coste: number;
  requiere: string[];
  desc: string;
}

export const RAMAS: { id: Rama; nombre: string }[] = [
  { id: 'propulsion', nombre: 'Propulsión' },
  { id: 'estructura', nombre: 'Estructura' },
  { id: 'mineria', nombre: 'Minería' },
  { id: 'energia', nombre: 'Energía' },
  { id: 'militar', nombre: 'Militar' },
  { id: 'defensa', nombre: 'Defensa' },
];

export const TECNOLOGIAS: NodoTec[] = [
  { id: 'propulsion1', nombre: 'Motores mejorados', rama: 'propulsion', coste: 3000, requiere: [], desc: 'Motores de vacío y de primera etapa.' },
  { id: 'propulsion2', nombre: 'Lanzadores pesados', rama: 'propulsion', coste: 12000, requiere: ['propulsion1', 'estructura1'], desc: 'Tanques de 2,4 m y motores enormes.' },
  { id: 'propulsion3', nombre: 'Propulsión avanzada', rama: 'propulsion', coste: 30000, requiere: ['propulsion2'], desc: 'Motores de rendimiento extremo para viajes largos.' },
  { id: 'estructura1', nombre: 'Estructuras ligeras', rama: 'estructura', coste: 2500, requiere: [], desc: 'Tanques largos, patas, ruedas de reacción y cápsulas grandes.' },
  { id: 'astillero', nombre: 'Astillero orbital', rama: 'estructura', coste: 20000, requiere: ['estructura1'], desc: 'Lanza naves directamente desde tu estación orbital (+15 % de coste).' },
  { id: 'mineria1', nombre: 'Minería industrial', rama: 'mineria', coste: 6000, requiere: [], desc: 'Taladros y bodegas grandes.' },
  { id: 'mineria2', nombre: 'Refinado in situ', rama: 'mineria', coste: 15000, requiere: ['mineria1'], desc: 'Convierte hielo en combustible sin volver a casa.' },
  { id: 'energia1', nombre: 'Electricidad', rama: 'energia', coste: 2000, requiere: [], desc: 'Baterías, paneles y sondas sin tripulación.' },
  { id: 'militar1', nombre: 'Armamento ligero', rama: 'militar', coste: 5000, requiere: [], desc: 'Las primeras armas montadas en naves.' },
  { id: 'militar2', nombre: 'Misiles guiados', rama: 'militar', coste: 14000, requiere: ['militar1', 'energia1'], desc: 'Proyectiles que persiguen al blanco.' },
  { id: 'militar3', nombre: 'Armas pesadas', rama: 'militar', coste: 35000, requiere: ['militar2'], desc: 'Lo que gana guerras.' },
  { id: 'defensa1', nombre: 'Blindaje', rama: 'defensa', coste: 4000, requiere: [], desc: 'Placas que reciben los golpes antes que la nave.' },
  { id: 'defensa2', nombre: 'Escudos', rama: 'defensa', coste: 18000, requiere: ['defensa1', 'energia1'], desc: 'Escudos de energía y defensa antimisil.' },
  { id: 'defensa3', nombre: 'Fortificar la estación', rama: 'defensa', coste: 25000, requiere: ['defensa2'], desc: 'La estación orbital dobla su vida y sus torretas.' },
];

export function nodoTec(id: string): NodoTec | undefined {
  return TECNOLOGIAS.find((n) => n.id === id);
}

export function puedeInvestigar(id: string, hechas: Set<string>): boolean {
  const n = nodoTec(id);
  if (!n || hechas.has(id)) return false;
  return n.requiere.every((r) => hechas.has(r));
}

export function piezasDe(id: string, raza: Raza): string[] {
  return PARTES.filter((p) => p.tech === id && sirveA(p, raza)).map((p) => p.nombre);
}

export function desbloqueada(tech: string, hechas: Set<string>): boolean {
  return tech === 'base' || hechas.has(tech);
}

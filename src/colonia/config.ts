/**
 * Opciones de una partida nueva: dificultad, tamaño del mapa y cómo es el
 * terreno. Se guardan con la partida.
 */
import type { Coste } from './tipos';

export type Dificultad = 'pacifica' | 'facil' | 'normal' | 'dificil' | 'brutal';
export type Tamano = 'pequeno' | 'mediano' | 'grande' | 'enorme';
export type Nivel = 0 | 1 | 2 | 3;

export interface Config {
  semilla: number;
  dificultad: Dificultad;
  tamano: Tamano;
  /** 0 = nada, 1 = poca, 2 = normal, 3 = mucha. */
  agua: Nivel;
  montanas: Nivel;
  bosque: Nivel;
  mineral: Nivel;
  nidos: number;
  colonos: number;
  recursos: 'escasos' | 'normales' | 'abundantes';
}

export interface InfoDificultad {
  nombre: string;
  desc: string;
  /** Multiplica el tamaño de las incursiones. */
  incursion: number;
  /** Multiplica los días entre incursiones. */
  intervalo: number;
  /** Día de la primera incursión. */
  primera: number;
  /** Multiplica la evolución de las criaturas. */
  evolucion: number;
  /** Multiplica la contaminación que convierten en criaturas. */
  cria: number;
  /** Multiplica el daño que hacen las criaturas. */
  dano: number;
  /** Sin ataques de ningún tipo. */
  pacifica?: boolean;
}

export const DIFICULTADES: Record<Dificultad, InfoDificultad> = {
  pacifica: { nombre: 'Pacífica', desc: 'Las criaturas existen pero nunca atacan. Para construir tranquilo.', incursion: 0, intervalo: 1, primera: 999, evolucion: 0.5, cria: 0, dano: 1, pacifica: true },
  facil: { nombre: 'Fácil', desc: 'Incursiones pequeñas y espaciadas. Evolución lenta.', incursion: 0.6, intervalo: 1.5, primera: 6, evolucion: 0.6, cria: 0.6, dano: 0.7 },
  normal: { nombre: 'Normal', desc: 'El equilibrio pensado para el juego.', incursion: 1, intervalo: 1, primera: 4, evolucion: 1, cria: 1, dano: 1 },
  dificil: { nombre: 'Difícil', desc: 'Más criaturas, más a menudo y más fuertes.', incursion: 1.5, intervalo: 0.75, primera: 3, evolucion: 1.5, cria: 1.4, dano: 1.25 },
  brutal: { nombre: 'Brutal', desc: 'El planeta quiere que te vayas. Ya.', incursion: 2.2, intervalo: 0.55, primera: 2, evolucion: 2.2, cria: 2, dano: 1.5 },
};

export const TAMANOS: Record<Tamano, { nombre: string; ancho: number; alto: number }> = {
  pequeno: { nombre: 'Pequeño', ancho: 96, alto: 72 },
  mediano: { nombre: 'Mediano', ancho: 128, alto: 96 },
  grande: { nombre: 'Grande', ancho: 176, alto: 132 },
  enorme: { nombre: 'Enorme', ancho: 240, alto: 180 },
};

export const NIVELES = ['Nada', 'Poco', 'Normal', 'Mucho'] as const;
export const NIVELES_MINERAL = ['Muy pobre', 'Pobre', 'Normal', 'Rico'] as const;

export const RECURSOS_INICIALES: Record<Config['recursos'], { nombre: string; caja: Coste }> = {
  escasos: { nombre: 'Escasos', caja: { madera: 30, comida: 15, piedra: 10, placaHierro: 5 } },
  normales: { nombre: 'Normales', caja: { madera: 80, comida: 30, piedra: 30, placaHierro: 20, engranaje: 6, municion: 10 } },
  abundantes: { nombre: 'Abundantes', caja: { madera: 200, comida: 60, piedra: 100, placaHierro: 80, placaCobre: 40, engranaje: 30, circuito: 10, municion: 40, carbon: 50 } },
};

export function configPorDefecto(semilla = Math.floor(Math.random() * 1e9)): Config {
  return { semilla, dificultad: 'normal', tamano: 'mediano', agua: 2, montanas: 2, bosque: 2, mineral: 2, nidos: 4, colonos: 3, recursos: 'normales' };
}

import { buscarSpawn, generarMundoPasos, TAMANOS, type NombreTamano } from './gen/worldgen';
import { semillaAleatoria } from './gen/rng';
import { crearNivelPruebas } from './testLevel';
import type { Zona } from './testLevel';
import type { Mundo } from './world';

/**
 * Elige y prepara el escenario de la partida.
 *
 * Por defecto se juega en un mundo generado. El laboratorio de físicas de la
 * fase 1 sigue disponible con `?lab=1`: es donde se afinan las constantes de
 * movimiento, y perderlo al llegar la generación habría sido tirar la
 * herramienta más útil que tenemos.
 *
 * Parámetros de URL:
 *   ?lab=1            laboratorio de físicas en vez del mundo generado
 *   ?semilla=LOQUESEA semilla concreta (si no, aleatoria)
 *   ?tam=pequeno      tamaño del mundo (pequeno | mediano)
 *   ?columna=700      empieza en esa columna del mundo, no en el centro
 *
 * `columna` es una herramienta de depuración: buscar a pie el lago o la veta
 * que se quiere mirar cuesta minutos, y con esto se llega en un enlace.
 */

export interface Escenario {
  mundo: Mundo;
  spawnTx: number;
  spawnTy: number;
  zonas: Zona[];
  semilla: string;
  esLaboratorio: boolean;
}

export interface OpcionesEscenario {
  lab: boolean;
  semilla: string;
  tamano: NombreTamano;
  /** Minuto del día con el que empieza un mundo nuevo, o null para el normal. */
  minutos: number | null;
  /** Columna donde aparecer, o null para el centro del mundo. */
  columna: number | null;
}

/** Acepta "22" y "22:30". Devuelve null si no hay nada legible. */
export function leerHora(texto: string | null): number | null {
  if (!texto) return null;
  const m = /^(\d{1,2})(?::(\d{1,2}))?$/.exec(texto.trim());
  if (!m) return null;
  const horas = Number(m[1]);
  const minutos = Number(m[2] ?? 0);
  if (horas > 23 || minutos > 59) return null;
  return horas * 60 + minutos;
}

export function leerOpciones(busqueda: string): OpcionesEscenario {
  const p = new URLSearchParams(busqueda);
  const tam = p.get('tam');
  const columna = Number(p.get('columna'));
  return {
    lab: p.get('lab') === '1',
    semilla: p.get('semilla') || semillaAleatoria(),
    tamano: tam === 'mediano' || tam === 'pequeno' ? tam : 'pequeno',
    minutos: leerHora(p.get('hora')),
    columna: Number.isFinite(columna) && columna > 0 ? Math.floor(columna) : null,
  };
}

export function* prepararEscenario(
  op: OpcionesEscenario,
): Generator<{ pct: number; texto: string }, Escenario, void> {
  if (op.lab) {
    yield { pct: 50, texto: 'Montando el laboratorio…' };
    const nivel = crearNivelPruebas();
    return {
      mundo: nivel.mundo,
      spawnTx: nivel.spawnTx,
      spawnTy: nivel.spawnTy,
      zonas: nivel.zonas,
      semilla: 'laboratorio',
      esLaboratorio: true,
    };
  }

  const tam = TAMANOS[op.tamano];
  const r = yield* generarMundoPasos({
    ancho: tam.ancho,
    alto: tam.alto,
    semilla: op.semilla,
  });

  const [spawnTx, spawnTy] =
    op.columna === null
      ? [r.spawnTx, r.spawnTy]
      : buscarSpawn(r.mundo, r.superficie, Math.min(op.columna, r.mundo.ancho - 5));

  return {
    mundo: r.mundo,
    spawnTx,
    spawnTy,
    zonas: [],
    semilla: r.semilla,
    esLaboratorio: false,
  };
}

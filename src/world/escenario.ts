import { DIFICULTADES, DIFICULTAD_POR_DEFECTO } from '../core/dificultad';
import { hay, indiceVersion, VERSION_ACTUAL } from '../core/versiones';
import { buscarSpawn, generarMundoPasos, TAMANOS, type NombreTamano } from './gen/worldgen';
import { semillaAleatoria } from './gen/rng';
import type { DatosCofre } from './contenedores';
import type { Estructura } from './estructuras';
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
  /** Estructuras que ha levantado el generador. El laboratorio no tiene. */
  estructuras: Estructura[];
  /** Cofres de esas estructuras, con su botín dentro. */
  cofres: DatosCofre[];
}

export interface OpcionesEscenario {
  lab: boolean;
  semilla: string;
  tamano: NombreTamano;
  /** Versión del juego con la que se crea el mundo. */
  version?: string;
  /** Minuto del día con el que empieza un mundo nuevo, o null para el normal. */
  minutos: number | null;
  /** Columna donde aparecer, o null para el centro del mundo. */
  columna: number | null;
}

/**
 * Lo que se lee de la URL.
 *
 * La dificultad va aquí y no en `OpcionesEscenario` a propósito: el terreno no
 * depende de ella. Dos mundos con la misma semilla y distinta dificultad tienen
 * que salir idénticos tile a tile, y tenerla fuera del generador es la forma de
 * que eso no pueda dejar de ser verdad por descuido.
 */
export interface OpcionesArranque extends OpcionesEscenario {
  dificultad: number;
  hardcore: boolean;
}

/** Versión de la URL. Un id que no exista cae en la actual. */
export function leerVersion(texto: string | null): string {
  return texto && indiceVersion(texto) >= 0 ? texto : VERSION_ACTUAL;
}

/** Dificultad de la URL. Fuera de rango o ilegible, la de siempre. */
export function leerDificultad(texto: string | null): number {
  const n = Number(texto);
  if (!texto || !Number.isFinite(n)) return DIFICULTAD_POR_DEFECTO;
  return Math.max(0, Math.min(DIFICULTADES.length - 1, Math.floor(n)));
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

export function leerOpciones(busqueda: string): OpcionesArranque {
  const p = new URLSearchParams(busqueda);
  const tam = p.get('tam');
  const columna = Number(p.get('columna'));
  return {
    lab: p.get('lab') === '1',
    semilla: p.get('semilla') || semillaAleatoria(),
    tamano: tam !== null && tam in TAMANOS ? (tam as NombreTamano) : 'pequeno',
    minutos: leerHora(p.get('hora')),
    columna: Number.isFinite(columna) && columna > 0 ? Math.floor(columna) : null,
    dificultad: leerDificultad(p.get('dif')),
    hardcore: p.get('hardcore') === '1',
    version: leerVersion(p.get('version')),
  };
}

export function* prepararEscenario(
  op: OpcionesEscenario,
): Generator<{ pct: number; texto: string }, Escenario, void> {
  // Antes de 1.3.0 no había generación de mundo: lo que había era el
  // laboratorio de físicas hecho a mano, y sigue estando en el código. Elegir
  // 1.0.0, 1.1.0 o 1.2.0 abre exactamente eso, que es lo más parecido a la
  // verdad que se puede ofrecer sin inventarse un mundo que nunca existió.
  const version = op.version ?? VERSION_ACTUAL;
  if (op.lab || !hay('mundoGenerado', version)) {
    yield { pct: 50, texto: 'Montando el laboratorio…' };
    const nivel = crearNivelPruebas();
    return {
      mundo: nivel.mundo,
      spawnTx: nivel.spawnTx,
      spawnTy: nivel.spawnTy,
      zonas: nivel.zonas,
      semilla: 'laboratorio',
      esLaboratorio: true,
      estructuras: [],
      cofres: [],
    };
  }

  const tam = TAMANOS[op.tamano];
  const r = yield* generarMundoPasos({
    ancho: tam.ancho,
    alto: tam.alto,
    semilla: op.semilla,
    version,
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
    estructuras: r.estructuras,
    cofres: r.cofres,
  };
}

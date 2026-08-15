import { generarMundoPasos, TAMANOS, type NombreTamano } from './gen/worldgen';
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
}

export function leerOpciones(busqueda: string): OpcionesEscenario {
  const p = new URLSearchParams(busqueda);
  const tam = p.get('tam');
  return {
    lab: p.get('lab') === '1',
    semilla: p.get('semilla') || semillaAleatoria(),
    tamano: tam === 'mediano' || tam === 'pequeno' ? tam : 'pequeno',
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

  return {
    mundo: r.mundo,
    spawnTx: r.spawnTx,
    spawnTy: r.spawnTy,
    zonas: [],
    semilla: r.semilla,
    esLaboratorio: false,
  };
}

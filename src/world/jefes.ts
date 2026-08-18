import type { Especie } from '../entities/enemies';
import type { BiomaLocal } from '../entities/spawner';
import {
  IDOLO_CUEVA,
  IDOLO_DESIERTO,
  IDOLO_INFIERNO,
  IDOLO_JUNGLA,
  IDOLO_NIEVE,
  IDOLO_PRADERA,
  TROFEO_CUEVA,
  TROFEO_DESIERTO,
  TROFEO_INFIERNO,
  TROFEO_JUNGLA,
  TROFEO_NIEVE,
  TROFEO_PRADERA,
  RELIQUIA_CUEVA,
  RELIQUIA_DESIERTO,
  RELIQUIA_INFIERNO,
  RELIQUIA_JUNGLA,
  RELIQUIA_NIEVE,
  RELIQUIA_PRADERA,
} from '../items/items';
import type { Inventario } from '../items/inventory';

/**
 * Los jefes de bioma y sus rituales.
 *
 * Hasta 7.0.0 el juego tenía un solo jefe, en un solo sitio, con una sola
 * ofrenda: se jugaba entero hacia la fortaleza y ahí se acababa. Seis jefes
 * repartidos por los seis sitios cambian la forma de la partida, porque ya no
 * hay un final sino seis puertas al mismo nivel, y cada una pide haber estado
 * de verdad en su bioma —no de paso— para juntar lo que pide su ídolo.
 *
 * El ritual es un objeto y no un altar construido. Un altar por bioma habría
 * que generarlo, encontrarlo y protegerlo de que una cueva se lo lleve por
 * delante, y lo que se buscaba no era una búsqueda —de eso ya está la
 * fortaleza— sino una preparación: juntar, fabricar y decidir cuándo estás
 * listo. Además así el ritual viaja contigo y la pelea ocurre donde tú elijas
 * dentro del bioma, que es lo que permite prepararse el terreno antes.
 *
 * Este fichero es solo la tabla y las reglas de "aquí sí / aquí no". Quién
 * pelea y cómo vive en `entities/enemies`, y qué cuesta cada ídolo vive en las
 * recetas: así se puede probar el reparto entero sin mundo y sin canvas.
 */

export type ClaseJefe =
  | 'pradera'
  | 'desierto'
  | 'nieve'
  | 'jungla'
  | 'cueva'
  | 'infierno';

/** Dónde se puede hacer el ritual. */
export interface SitioJefe {
  /** Bioma de superficie exigido, si exige alguno. */
  bioma?: BiomaLocal;
  /** Hay que estar bajo tierra. */
  bajoTierra?: boolean;
  /** Hay que estar en el inframundo. */
  inframundo?: boolean;
}

export interface DefJefe {
  readonly especie: Especie;
  /** El ídolo que lo despierta, y que se gasta al hacerlo. */
  readonly invocador: number;
  /** Lo que deja al morir. */
  readonly trofeo: number;
  /**
   * La reliquia de este bioma, que se forja con su arma.
   *
   * No la suelta el jefe: se forja después. La diferencia importa, porque una
   * reliquia que cayera del jefe convertiría el equipo de bioma en un adorno
   * opcional, y lo que se quería es que para llegar al final haya que haber
   * usado de verdad lo que sueltan los seis.
   */
  readonly reliquia: number;
  readonly sitio: SitioJefe;
  /** Lo que se lee al despertarlo. */
  readonly aviso: string;
  /** Y lo que se lee cuando el sitio no es el suyo. */
  readonly sitioMal: string;
  readonly desde: string;
}

export const JEFES: Readonly<Record<ClaseJefe, DefJefe>> = {
  pradera: {
    especie: 'reyLimo',
    invocador: IDOLO_PRADERA,
    trofeo: TROFEO_PRADERA,
    reliquia: RELIQUIA_PRADERA,
    sitio: { bioma: 'bosque' },
    aviso: 'El suelo tiembla y algo verde se levanta',
    sitioMal: 'El ídolo de la pradera solo funciona en el bosque',
    desde: '7.0.0',
  },
  desierto: {
    especie: 'reinaEscarabajo',
    invocador: IDOLO_DESIERTO,
    trofeo: TROFEO_DESIERTO,
    reliquia: RELIQUIA_DESIERTO,
    sitio: { bioma: 'desierto' },
    aviso: 'La arena se abre y sale zumbando',
    sitioMal: 'El ídolo del desierto solo funciona sobre arena',
    desde: '7.0.0',
  },
  nieve: {
    especie: 'yeti',
    invocador: IDOLO_NIEVE,
    trofeo: TROFEO_NIEVE,
    reliquia: RELIQUIA_NIEVE,
    sitio: { bioma: 'nieve' },
    aviso: 'Algo enorme baja de la ladera',
    sitioMal: 'El ídolo helado solo funciona en la nieve',
    desde: '7.0.0',
  },
  jungla: {
    especie: 'aranaMadre',
    invocador: IDOLO_JUNGLA,
    trofeo: TROFEO_JUNGLA,
    reliquia: RELIQUIA_JUNGLA,
    sitio: { bioma: 'jungla' },
    aviso: 'Las ramas se mueven todas a la vez',
    sitioMal: 'El ídolo de la selva solo funciona en la jungla',
    desde: '7.0.0',
  },
  cueva: {
    especie: 'devorador',
    invocador: IDOLO_CUEVA,
    trofeo: TROFEO_CUEVA,
    reliquia: RELIQUIA_CUEVA,
    // La caverna no es un bioma de superficie: lo que la define es la
    // profundidad, y por eso su regla mira hacia abajo y no hacia los lados.
    sitio: { bajoTierra: true },
    aviso: 'La roca cruje y algo se despereza',
    sitioMal: 'El ídolo de la caverna pide estar bien hondo',
    desde: '7.0.0',
  },
  infierno: {
    especie: 'senorDelFuego',
    invocador: IDOLO_INFIERNO,
    trofeo: TROFEO_INFIERNO,
    reliquia: RELIQUIA_INFIERNO,
    sitio: { inframundo: true },
    aviso: 'La lava hierve y se pone de pie',
    sitioMal: 'El ídolo infernal solo arde en el inframundo',
    desde: '7.0.0',
  },
};

export const CLASES_JEFE = Object.keys(JEFES) as ClaseJefe[];

/** Las seis reliquias, en el orden de la tabla. */
export const RELIQUIAS_BIOMA: readonly number[] = CLASES_JEFE.map((c) => JEFES[c].reliquia);

/**
 * ¿Están las seis en el zurrón?
 *
 * Se piden todas y una de cada, no seis en total: si contara el montón, seis
 * reliquias de la pradera abrirían el final, y entonces el juego sería matar
 * seis veces al jefe más fácil.
 */
export function tieneTodasLasReliquias(inv: Inventario): boolean {
  return RELIQUIAS_BIOMA.every((r) => inv.contar(r) >= 1);
}

/** Las que faltan, para poder decirlo en pantalla. */
export function reliquiasQueFaltan(inv: Inventario): number[] {
  return RELIQUIAS_BIOMA.filter((r) => inv.contar(r) < 1);
}

/**
 * Cobra las seis reliquias. Devuelve false y no toca nada si falta alguna.
 *
 * La misma regla que la ofrenda del altar y por el mismo motivo: cobrar a
 * medias dejaría sin reliquias y sin jefe, que es la peor combinación posible.
 */
export function pagarReliquias(inv: Inventario): boolean {
  if (!tieneTodasLasReliquias(inv)) return false;
  for (const r of RELIQUIAS_BIOMA) {
    let restante = 1;
    for (let i = 0; i < inv.ranuras.length && restante > 0; i++) {
      if (inv.ranuras[i]!.objeto !== r) continue;
      restante -= inv.sacarDe(i, restante);
    }
  }
  return true;
}

/** La especie del jefe de verdad. Vive aquí para no repetir la cadena. */
export const JEFE_FINAL: Especie = 'guardianVerdadero';

/** El jefe al que llama este ídolo, o null si el objeto no llama a nadie. */
export function jefeDeInvocador(objeto: number): DefJefe | null {
  for (const clase of CLASES_JEFE) {
    if (JEFES[clase].invocador === objeto) return JEFES[clase];
  }
  return null;
}

/** La clase de jefe de una especie, o null si esa especie no es de bioma. */
export function claseDeEspecie(especie: Especie): ClaseJefe | null {
  for (const clase of CLASES_JEFE) {
    if (JEFES[clase].especie === especie) return clase;
  }
  return null;
}

/** El trofeo que deja esta especie, o null si no deja ninguno. */
export function trofeoDe(especie: Especie): number | null {
  const clase = claseDeEspecie(especie);
  return clase === null ? null : JEFES[clase].trofeo;
}

export interface DondeEstoy {
  bioma: BiomaLocal;
  bajoTierra: boolean;
  inframundo: boolean;
}

/**
 * ¿Vale este sitio para este ritual?
 *
 * Es la única regla que hace que un ídolo signifique algo. Sin ella se podrían
 * fabricar los seis en casa, invocarlos uno detrás de otro en el mismo prado y
 * el bioma pasaría a ser el sitio del que se saca material, no el sitio donde
 * pasan las cosas.
 *
 * El inframundo cuenta también como bajo tierra —está debajo de todo— así que
 * el ídolo de la caverna sirve ahí abajo. Al revés no: el infernal exige el
 * inframundo, porque su pelea se pensó sobre lagos de lava.
 */
export function sitioCorrecto(def: DefJefe, donde: DondeEstoy): boolean {
  const { sitio } = def;
  if (sitio.inframundo === true && !donde.inframundo) return false;
  if (sitio.bajoTierra === true && !(donde.bajoTierra || donde.inframundo)) return false;
  // Los de superficie exigen su bioma *y* no estar bajo tierra: la cueva que
  // hay debajo del desierto es la caverna, no el desierto.
  if (sitio.bioma !== undefined) {
    if (donde.bajoTierra || donde.inframundo) return false;
    if (donde.bioma !== sitio.bioma) return false;
  }
  return true;
}

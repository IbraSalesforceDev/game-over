/**
 * Que tu personaje responda al instante aunque la verdad esté en otro sitio.
 *
 * En este juego manda el anfitrión. Si el invitado esperase a que le contesten
 * para moverse, andaría con el retraso de la red —80, 150 ms— y en un juego de
 * plataformas eso no es «un poco peor»: es injugable. Saltas y el personaje
 * salta un rato después.
 *
 * La salida es vieja y conocida: **predecir y reconciliar**.
 *
 * 1. El invitado aplica sus propias teclas **en el acto**, sin preguntar, y
 *    guarda lo que ha pulsado en cada tick.
 * 2. Cuando llega una instantánea, trae la posición buena y hasta qué tick le
 *    había hecho caso el anfitrión.
 * 3. El invitado se coloca en la posición buena y **vuelve a aplicar** las
 *    teclas de después. Si nadie le ha empujado, acaba justo donde ya estaba y
 *    no se nota nada. Si algo cambió, aparece la corrección.
 *
 * ## Por qué esto se puede hacer aquí
 *
 * Porque `actualizarFisica` es determinista: los mismos estado, entrada y mundo
 * dan siempre el mismo resultado, y **no llama a `Math.random()` ni una vez**
 * (hay 33 llamadas repartidas por el juego; ninguna cae aquí). Sin eso, volver a
 * aplicar las teclas daría un resultado distinto cada vez y nada de esto
 * funcionaría. Es también la razón de que la fase A vaya antes que los bichos:
 * si esto no sale bien, no sale nada.
 *
 * ## Y por qué la corrección no se ve
 *
 * Corregir de golpe se ve como un tirón. La física se corrige **entera y al
 * instante** —lo que se toca es la verdad, no se negocia— pero se guarda aparte
 * cuánto ha saltado, y el dibujo lo va devolviendo poco a poco. El personaje
 * está donde tiene que estar desde el primer tick; lo único que miente unos
 * frames es dónde se pinta.
 */

import { actualizarFisica, type Ajustes, type Caja, type Entrada } from '../entities/physics';
import type { Mundo } from '../world/world';
import { BANDERA, type EntidadRed } from './protocolo';

/**
 * Todo lo que hace falta para volver a aplicar las teclas desde el sitio bueno.
 *
 * La posición sola **no basta**, y esto no es teoría: medido, repetir sin el
 * estado del salto daba hasta 96 px de desvío —seis tiles— con 200 ms de red.
 * Dos personajes en el mismo punto, uno subiendo y otro cayendo, se separan al
 * tick siguiente.
 */
export interface Autoridad {
  x: number;
  y: number;
  vx: number;
  vy: number;
  enSuelo: boolean;
  saltando: boolean;
  nadaba: boolean;
  mirando: 1 | -1;
  ticksCoyote: number;
  ticksBuffer: number;
  ticksSalto: number;
  yInicioCaida: number;
}

/** De una caja del juego a lo que viaja por el cable. */
export function autoridadDeCaja(caja: Caja): Omit<EntidadRed, 'clase' | 'id' | 'vida' | 'sub' | 'vidaMax'> {
  return {
    x: caja.x,
    y: caja.y,
    vx: caja.vx,
    vy: caja.vy,
    banderas:
      (caja.enSuelo ? BANDERA.EN_SUELO : 0) |
      (caja.saltando ? BANDERA.SALTANDO : 0) |
      (caja.nadaba ? BANDERA.NADABA : 0) |
      (caja.mirando > 0 ? BANDERA.MIRA_DERECHA : 0),
    ticksCoyote: caja.ticksCoyote,
    ticksBuffer: caja.ticksBuffer,
    ticksSalto: caja.ticksSalto,
    yInicioCaida: caja.yInicioCaida,
  };
}

/** Y al revés. */
export function autoridadDeEntidad(e: EntidadRed): Autoridad {
  return {
    x: e.x,
    y: e.y,
    vx: e.vx,
    vy: e.vy,
    enSuelo: (e.banderas & BANDERA.EN_SUELO) !== 0,
    saltando: (e.banderas & BANDERA.SALTANDO) !== 0,
    nadaba: (e.banderas & BANDERA.NADABA) !== 0,
    mirando: (e.banderas & BANDERA.MIRA_DERECHA) !== 0 ? 1 : -1,
    ticksCoyote: e.ticksCoyote,
    ticksBuffer: e.ticksBuffer,
    ticksSalto: e.ticksSalto,
    yInicioCaida: e.yInicioCaida,
  };
}

/** Tres segundos de teclas guardadas. */
export const HISTORIAL_MAXIMO = 180;

/**
 * Por debajo de medio píxel no se corrige nada.
 *
 * Con la física determinista la repetición debería cuadrar exacta, pero dos
 * máquinas distintas pueden dejar una brizna de diferencia en el último decimal.
 * Perseguirla sería corregir sin parar por nada.
 */
export const ERROR_MINIMO = 0.5;

/**
 * Y por encima de esto no se suaviza: se salta y ya.
 *
 * Un error así no es la red afinando, es que ha pasado algo —una reaparición,
 * un teletransporte, una desconexión larga—. Suavizar doscientos píxeles sería
 * ver al personaje deslizarse por el aire como un fantasma.
 */
export const ERROR_TELETRANSPORTE = 200;

/** Cuánto desvío queda en cada tick. Más alto, más suave y más largo. */
export const SUAVIZADO = 0.82;

interface Apunte {
  tick: number;
  entrada: Entrada;
  sumergido: number;
}

export interface Correccion {
  /** Si hubo que mover al personaje. */
  corregido: boolean;
  /** Cuánto se movió, en píxeles. */
  error: number;
  /** Teclas que se han vuelto a aplicar. */
  repetidas: number;
}

export class Prediccion {
  private historial: Apunte[] = [];
  /** Diferencia entre donde se pinta y donde está de verdad. Solo para el ojo. */
  private _desvioX = 0;
  private _desvioY = 0;

  get desvioX(): number {
    return this._desvioX;
  }
  get desvioY(): number {
    return this._desvioY;
  }

  /**
   * Apunta las teclas de un tick, después de haberlas aplicado en local.
   *
   * Se guarda una copia: la entrada del juego se reutiliza de un tick a otro, y
   * guardarla por referencia haría que el historial entero acabara siendo el
   * último tick repetido. Un fallo silencioso de los que cuesta ver.
   */
  registrar(tick: number, entrada: Entrada, sumergido = 0): void {
    this.historial.push({ tick, entrada: { ...entrada }, sumergido });
    if (this.historial.length > HISTORIAL_MAXIMO) {
      this.historial.splice(0, this.historial.length - HISTORIAL_MAXIMO);
    }
  }

  /** Cuántos ticks hay guardados sin confirmar. */
  get pendientes(): number {
    return this.historial.length;
  }

  /**
   * Coloca la verdad del anfitrión y vuelve a aplicar lo de después.
   *
   * `caja` se modifica en el sitio, que es como trabaja el resto de la física.
   */
  reconciliar(
    mundo: Mundo,
    caja: Caja,
    aj: Ajustes,
    autoridad: Autoridad,
    tickConfirmado: number,
  ): Correccion {
    // Lo confirmado ya no hace falta: el anfitrión ya lo tuvo en cuenta.
    this.historial = this.historial.filter((a) => a.tick > tickConfirmado);

    const antesX = caja.x;
    const antesY = caja.y;

    caja.x = autoridad.x;
    caja.y = autoridad.y;
    caja.vx = autoridad.vx;
    caja.vy = autoridad.vy;
    // Y el estado del salto, que es la mitad que falta. Sin esto la repetición
    // arranca en otra fase del salto y el personaje acaba en otro sitio.
    caja.enSuelo = autoridad.enSuelo;
    caja.saltando = autoridad.saltando;
    caja.nadaba = autoridad.nadaba;
    caja.mirando = autoridad.mirando;
    caja.ticksCoyote = autoridad.ticksCoyote;
    caja.ticksBuffer = autoridad.ticksBuffer;
    caja.ticksSalto = autoridad.ticksSalto;
    caja.yInicioCaida = autoridad.yInicioCaida;

    // Y se repite lo que el anfitrión todavía no había visto.
    for (const a of this.historial) {
      actualizarFisica(mundo, caja, a.entrada, aj, a.sumergido);
    }

    const dx = antesX - caja.x;
    const dy = antesY - caja.y;
    const error = Math.hypot(dx, dy);

    if (error < ERROR_MINIMO) {
      // Ni se ha movido: se deja donde estaba para no arrastrar ruido.
      caja.x = antesX;
      caja.y = antesY;
      return { corregido: false, error, repetidas: this.historial.length };
    }

    if (error <= ERROR_TELETRANSPORTE) {
      // El ojo sigue viendo lo de antes y se va acercando solo.
      this._desvioX += dx;
      this._desvioY += dy;
    } else {
      // Demasiado para disimularlo: se aparece y punto.
      this._desvioX = 0;
      this._desvioY = 0;
    }

    return { corregido: true, error, repetidas: this.historial.length };
  }

  /** Un tick de desvío menos. Se llama una vez por tick, corrija o no. */
  avanzarSuavizado(): void {
    this._desvioX *= SUAVIZADO;
    this._desvioY *= SUAVIZADO;
    // Debajo de un dieciseisavo de píxel no se ve y solo da trabajo.
    if (Math.abs(this._desvioX) < 0.0625) this._desvioX = 0;
    if (Math.abs(this._desvioY) < 0.0625) this._desvioY = 0;
  }

  /** Al morir, al reaparecer o al viajar: lo de antes ya no vale. */
  olvidar(): void {
    this.historial = [];
    this._desvioX = 0;
    this._desvioY = 0;
  }
}

/**
 * Los demás jugadores no se predicen: se interpolan.
 *
 * De ellos no tenemos las teclas, así que adivinar hacia dónde van sería
 * inventárselo. Lo que se hace es pintarlos un pelín en el pasado y moverlos
 * entre las dos últimas instantáneas conocidas, que es lo que hace que se vean
 * andar en vez de dar saltos veinte veces por segundo.
 */
export class Interpolador {
  private previa: { x: number; y: number } | null = null;
  private actual: { x: number; y: number } | null = null;
  private t = 0;

  /** Llega una instantánea. */
  meter(x: number, y: number): void {
    this.previa = this.actual ?? { x, y };
    this.actual = { x, y };
    this.t = 0;
  }

  /**
   * Avanza hacia la última conocida. `paso` es cuánto se recorre por tick: con
   * instantáneas a 20 Hz y ticks a 60, un tercio.
   */
  avanzar(paso = 1 / 3): void {
    this.t = Math.min(1, this.t + paso);
  }

  /** Dónde pintarlo ahora. */
  donde(): { x: number; y: number } | null {
    if (!this.actual) return null;
    if (!this.previa) return this.actual;
    return {
      x: this.previa.x + (this.actual.x - this.previa.x) * this.t,
      y: this.previa.y + (this.actual.y - this.previa.y) * this.t,
    };
  }

  olvidar(): void {
    this.previa = null;
    this.actual = null;
    this.t = 0;
  }
}

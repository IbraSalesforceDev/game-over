/**
 * Qué significa un dedo.
 *
 * Con ratón hay dos botones y un puntero que flota: el clic izquierdo pica,
 * golpea o dispara, y el derecho coloca, abre o come. Con el dedo solo hay
 * «tocar», así que alguien tiene que decidir qué botón es cada toque, y quien
 * decide es **lo que llevas en la mano**: con el pico se pica donde tocas, con
 * un bloque se coloca, con la espada se golpea hacia ese lado. Es lo que hace
 * Terraria en el móvil, y se aprende sin explicaciones.
 *
 * La única ambigüedad de verdad son las cosas que se abren —un cofre, una mesa,
 * una cama— cuando lo que llevas en la mano pica. Tocar un cofre con el pico
 * puede querer decir «ábrelo» o «rómpelo», y ahí decide el tiempo: **un toque
 * corto abre y mantener el dedo pica**. Es el mismo gesto que en cualquier
 * móvil separa «abrir» de «hacer algo más».
 *
 * Todo esto va sin navegador y sin relojes de verdad: se le pasa la hora a mano.
 * Así se puede probar entero, y el puntero solo tiene que preguntar.
 */

import {
  defObjeto,
  esAzada,
  esComida,
  esCristal,
  esCubo,
  esInvocador,
  esPocion,
  esSemilla,
} from '../items/items';
import {
  ALTAR,
  ALTAR_BIOMA,
  CAMA,
  COFRE,
  INTERRUPTOR,
  INTERRUPTOR_ENCENDIDO,
  esEstacion,
} from '../world/tiles';

/** El botón que equivale a un toque, o esperar a ver si el dedo se queda. */
export type Gesto = 'izq' | 'der' | 'esperar';

/**
 * Cuánto hay que mantener el dedo para que deje de ser un toque.
 *
 * Por debajo de 200 ms un toque normal ya se pasa de largo; por encima de 300
 * mantener empieza a sentirse lento. 250 es lo que usan casi todos los sistemas
 * para separar un toque de una pulsación larga.
 */
export const ESPERA_TOQUE_MS = 250;

/**
 * Lo mínimo que dura un botón apretado por un toque.
 *
 * El juego mira los botones una vez por tick (16,7 ms). Un toque muy rápido
 * puede empezar y acabar entre dos ticks y no verse nunca; con esto se queda
 * apretado al menos tres, que es lo que hace falta para que un toque con la
 * espada sea siempre un mandoble y un toque con un bloque, siempre un bloque.
 */
export const PULSO_MINIMO_MS = 50;

/** Cosas del mundo que se abren o se accionan, y no se rompen, con un toque. */
function seAbre(tile: number): boolean {
  return (
    tile === COFRE ||
    tile === CAMA ||
    tile === ALTAR ||
    tile === ALTAR_BIOMA ||
    tile === INTERRUPTOR ||
    tile === INTERRUPTOR_ENCENDIDO ||
    esEstacion(tile)
  );
}

/**
 * ¿Este objeto se usa con el clic derecho?
 *
 * Es la misma lista que la cadena de `editar` en `main.ts` responde al botón
 * derecho: lo que se coloca, se siembra, se labra, se bebe, se come o se vacía.
 * El cubo entra aquí aunque también responda al izquierdo porque su derecho va
 * por flancos —una vez por toque— y el izquierdo repite mientras se mantenga:
 * un toque tiene que ser un cubo, no un cubo por tick.
 */
export function seUsaConDerecho(objeto: number): boolean {
  return (
    defObjeto(objeto).tile !== undefined ||
    esSemilla(objeto) ||
    esAzada(objeto) ||
    esCristal(objeto) ||
    esInvocador(objeto) ||
    esPocion(objeto) ||
    esComida(objeto) ||
    esCubo(objeto)
  );
}

/** Qué botón es un toque, según lo que hay en la mano y lo que hay debajo. */
export function gestoDelToque(enMano: number, tileTocado: number): Gesto {
  const derecho = seUsaConDerecho(enMano);
  if (seAbre(tileTocado)) {
    // Con algo que se usa con el derecho no hay duda: el derecho ya abre el
    // cofre antes que colocar nada encima, así que basta con apretarlo.
    return derecho ? 'der' : 'esperar';
  }
  return derecho ? 'der' : 'izq';
}

/**
 * Un dedo sobre el mundo, de que se apoya a que se levanta.
 *
 * No usa temporizadores: se le pregunta qué botones hay apretados *ahora*, con
 * la hora que diga quien pregunta. Es lo que permite probarlo sin esperar de
 * verdad, y lo que evita que un `setTimeout` suelto apriete un botón cuando la
 * partida ya ha acabado.
 */
export class Toque {
  private gesto: Gesto = 'izq';
  private desde = 0;
  private soltadoEn: number | null = null;
  private activo = false;

  /** El dedo se apoya. */
  apoyar(gesto: Gesto, ahora: number): void {
    this.gesto = gesto;
    this.desde = ahora;
    this.soltadoEn = null;
    this.activo = true;
  }

  /** El dedo se levanta. Lo que estuviera apretado sigue el tiempo mínimo. */
  levantar(ahora: number): void {
    if (this.activo && this.soltadoEn === null) this.soltadoEn = ahora;
  }

  /**
   * Se cancela sin acción: el sistema se ha quedado el dedo (una llamada, el
   * centro de control). Nada de pulsos: el jugador no ha decidido nada.
   */
  cancelar(): void {
    this.activo = false;
  }

  /** ¿Hay un dedo apoyado ahora mismo? */
  get apoyado(): boolean {
    return this.activo && this.soltadoEn === null;
  }

  /** Los botones que hay apretados en este momento. */
  botones(ahora: number): { izq: boolean; der: boolean } {
    if (!this.activo) return NADA;
    const suelto = this.soltadoEn;

    if (this.gesto === 'esperar') {
      if (suelto === null) {
        // Sigue apoyado: hasta que pase la espera no es nada; después, pica.
        return ahora - this.desde >= ESPERA_TOQUE_MS ? IZQ : NADA;
      }
      // Se levantó antes de tiempo: era un toque, y un toque abre. El pulso
      // empieza al levantar, que es cuando se ha sabido.
      const fueToque = suelto - this.desde < ESPERA_TOQUE_MS;
      if (fueToque && ahora < suelto + PULSO_MINIMO_MS) return DER;
      // Si se mantuvo, estaba picando, y al levantar se deja de picar.
      this.activo = false;
      return NADA;
    }

    const apretado =
      suelto === null || ahora < Math.max(suelto, this.desde + PULSO_MINIMO_MS);
    if (!apretado) {
      this.activo = false;
      return NADA;
    }
    return this.gesto === 'izq' ? IZQ : DER;
  }
}

const NADA = { izq: false, der: false } as const;
const IZQ = { izq: true, der: false } as const;
const DER = { izq: false, der: true } as const;

/**
 * Hacia dónde empuja el joystick, en las tres direcciones que entiende el juego.
 *
 * El juego es digital —andar o no andar—, así que el joystick también: pasado
 * un margen muerto, cuenta como la tecla. El margen es lo que evita que apoyar
 * el pulgar ya eche a andar al personaje, y abajo pide más recorrido que los
 * lados porque se usa para atravesar plataformas: hacerlo sin querer, al andar
 * con el pulgar un poco caído, es caerse de un puente.
 *
 * `dx` y `dy` son el desplazamiento del pulgar desde el centro, y `radio` el
 * del círculo. Hacia abajo es `dy` positivo, como en la pantalla.
 */
export const MUERTO_LADOS = 0.28;
export const MUERTO_ABAJO = 0.62;

export function direccionJoystick(
  dx: number,
  dy: number,
  radio: number,
): { izq: boolean; der: boolean; abajo: boolean } {
  if (radio <= 0) return { izq: false, der: false, abajo: false };
  const x = dx / radio;
  const y = dy / radio;
  return {
    izq: x <= -MUERTO_LADOS,
    der: x >= MUERTO_LADOS,
    // Abajo de verdad: más hacia abajo que hacia el lado, y con recorrido.
    abajo: y >= MUERTO_ABAJO && y > Math.abs(x),
  };
}

/**
 * Un dedo sobre una ranura de la mochila, o sobre una receta.
 *
 * Con ratón cada cosa tiene su gesto: pasar por encima enseña la ficha, el clic
 * coge o deja, y arrastrar no existe porque no hace falta. Con el dedo todo es
 * «apoyar», así que hay que distinguir por lo que pasa después:
 *
 * - **Levantar enseguida** es un toque: coger, dejar, elegir, fabricar.
 * - **Quedarse quieto** un rato es preguntar qué es eso: sale la ficha, y al
 *   levantar no se hace nada más. Es la única forma de leer una ficha sin
 *   cogerla, que con ratón era pasar por encima.
 * - **Moverse** depende de dónde. En una ranura con algo, es arrastrarlo a otra.
 *   En una lista de recetas, es deslizar la lista, y entonces levantar el dedo
 *   no puede fabricar nada: era la forma de bajar a la receta de abajo.
 *
 * La acción va al levantar y no al apoyar por eso mismo: al apoyar todavía no
 * se sabe cuál de las tres cosas es.
 */
export const LARGA_MS = 450;
export const ARRASTRE_PX = 10;

export type ResultadoPulsacion = 'toque' | 'soltar' | 'nada';

export class PulsacionRanura {
  private fase: 'esperando' | 'larga' | 'arrastre' | 'desplazando' = 'esperando';
  private x0 = 0;
  private y0 = 0;
  private t0 = 0;

  /** `arrastrable`: si moverse es arrastrar (una ranura con algo) o deslizar. */
  constructor(private readonly arrastrable: boolean) {}

  apoyar(x: number, y: number, t: number): void {
    this.fase = 'esperando';
    this.x0 = x;
    this.y0 = y;
    this.t0 = t;
  }

  /** Devuelve `true` justo cuando empieza un arrastre. */
  mover(x: number, y: number): boolean {
    if (this.fase !== 'esperando') return false;
    if (Math.hypot(x - this.x0, y - this.y0) < ARRASTRE_PX) return false;
    this.fase = this.arrastrable ? 'arrastre' : 'desplazando';
    return this.fase === 'arrastre';
  }

  /** Devuelve `true` justo cuando se convierte en pulsación larga. */
  tick(t: number): boolean {
    if (this.fase !== 'esperando' || t - this.t0 < LARGA_MS) return false;
    this.fase = 'larga';
    return true;
  }

  get arrastrando(): boolean {
    return this.fase === 'arrastre';
  }

  levantar(t: number): ResultadoPulsacion {
    // Por si el temporizador no llegó a tiempo: lo que dura lo que una larga
    // es una larga, aunque nadie la haya anunciado.
    this.tick(t);
    if (this.fase === 'esperando') return 'toque';
    if (this.fase === 'arrastre') return 'soltar';
    return 'nada';
  }
}

/**
 * Dos dedos que se separan o se juntan: el zoom.
 *
 * El zoom del juego va por escalones enteros (×1 a ×6), que es lo que mantiene
 * el pixel art nítido, así que el pellizco también: cada vez que la distancia
 * entre los dedos crece o mengua un 30 % respecto a la del último escalón, se
 * sube o se baja uno. Un pellizco largo sube varios, uno corto, uno.
 */
export const PASO_PELLIZCO = 1.3;

export class Pellizco {
  private base = 0;

  empezar(distancia: number): void {
    this.base = distancia;
  }

  /** +1 acercar, −1 alejar, 0 nada todavía. */
  mover(distancia: number): -1 | 0 | 1 {
    if (this.base <= 0) return 0;
    const r = distancia / this.base;
    if (r >= PASO_PELLIZCO) {
      this.base = distancia;
      return 1;
    }
    if (r <= 1 / PASO_PELLIZCO) {
      this.base = distancia;
      return -1;
    }
    return 0;
  }

  terminar(): void {
    this.base = 0;
  }
}

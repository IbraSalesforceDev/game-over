import { TILE } from '../core/constants';
import { alMenos } from '../core/versiones';
import {
  CARNE_CRUDA,
  CRISTAL,
  ESENCIA,
  GEL,
  HUESO,
  LINGOTE_COBALTO,
  LINGOTE_INFERNITA,
  LINGOTE_TITANIO,
  PLUMA,
  RELIQUIA,
} from '../items/items';
import type { Mundo } from '../world/world';
import { moverX, moverY, solapaSolido, type Caja } from './physics';
import { crearSalud, golpear, tickSalud, type Salud } from './salud';

/**
 * Enemigos.
 *
 * Cada uno reutiliza `moverX` y `moverY` de la física del jugador, así que
 * ninguno puede atravesar el terreno y no hay una segunda implementación de
 * colisiones que mantener. Lo único propio de cada especie es cómo decide
 * moverse.
 *
 * El daño es por contacto: no hay proyectiles todavía.
 */

export type Especie =
  | 'slime'
  | 'zombi'
  | 'murcielago'
  | 'escarabajo'
  | 'lobo'
  | 'conejo'
  | 'jabali'
  | 'esqueleto'
  | 'serpiente'
  | 'momia'
  | 'gallina'
  | 'golem'
  | 'espectro'
  | 'arana'
  | 'diablillo'
  | 'guardian';

export interface DefEnemigo {
  readonly nombre: string;
  readonly vida: number;
  readonly dano: number;
  readonly ancho: number;
  readonly alto: number;
  readonly color: string;
  readonly colorOscuro: string;
  /** Ignora la gravedad. */
  readonly vuela: boolean;
  /** Objeto que suelta y cuántos, como máximo. */
  readonly botin: number;
  readonly botinMax: number;
  /**
   * Un segundo objeto, mucho mejor y que casi nunca cae.
   *
   * Existe para poder colgar un lingote de cobalto de un gólem sin que matar
   * gólems sustituya a picar cobalto. Un botín bueno garantizado convierte al
   * bicho en una máquina expendedora: se le busca, se le farmea y el mineral
   * del que era premio deja de valer nada. A una de cada seis veces sigue
   * siendo un motivo para pelear y no una fuente de suministro.
   */
  readonly botinRaro?: number;
  readonly probRaro?: number;
  /** Solo aparece de noche en la superficie. */
  readonly nocturno: boolean;
  /**
   * No ataca: huye. Los animales existen para dar de comer, no para pelear, y
   * un conejo que te muerde por acercarte sería un enemigo con orejas.
   */
  readonly pasivo?: boolean;
  /**
   * Es un jefe: se invoca a mano, no desaparece por olvido y sale en la barra
   * de arriba. No aparece en ninguna lista del generador de apariciones, así
   * que la única forma de verlo es despertarlo.
   */
  readonly jefe?: boolean;
  /** Versión en la que apareció esta especie. */
  readonly desde: string;
}

export const ENEMIGOS: Record<Especie, DefEnemigo> = {
  slime: {
    desde: '2.0.0',
    nombre: 'slime',
    vida: 25,
    dano: 12,
    ancho: 22,
    alto: 16,
    color: '#5aa9d6',
    colorOscuro: '#2d6a8f',
    vuela: false,
    botin: GEL,
    botinMax: 3,
    nocturno: false,
  },
  zombi: {
    desde: '2.0.0',
    nombre: 'zombi',
    vida: 45,
    dano: 18,
    ancho: 20,
    alto: 40,
    color: '#6f8a4a',
    colorOscuro: '#3e5228',
    vuela: false,
    botin: HUESO,
    botinMax: 2,
    nocturno: true,
  },
  murcielago: {
    desde: '2.0.0',
    nombre: 'murciélago',
    vida: 20,
    dano: 10,
    ancho: 18,
    alto: 14,
    color: '#6b4a6b',
    colorOscuro: '#3a273a',
    vuela: true,
    botin: GEL,
    botinMax: 1,
    nocturno: false,
  },
  // Los dos de bioma. Se mueven como los que ya existían —no hay una IA nueva
  // que mantener— pero pegan distinto: el escarabajo es duro y lento de matar,
  // y el lobo hace daño de verdad. Que cada bioma tenga su amenaza es lo que
  // hace que cruzarlos se note.
  escarabajo: {
    desde: '2.1.0',
    nombre: 'escarabajo',
    vida: 40,
    dano: 14,
    ancho: 22,
    alto: 16,
    color: '#b3903f',
    colorOscuro: '#6f5720',
    vuela: false,
    botin: GEL,
    botinMax: 2,
    nocturno: false,
  },
  // --- Animales ---------------------------------------------------------
  // Sueltan comida y no hacen daño. El conejo es rápido y da poco; el jabalí
  // aguanta más y da de comer para un buen rato, pero hay que perseguirlo.
  conejo: {
    desde: '2.3.0',
    nombre: 'conejo',
    vida: 12,
    dano: 0,
    ancho: 16,
    alto: 14,
    color: '#c9b79c',
    colorOscuro: '#8a7a63',
    vuela: false,
    botin: CARNE_CRUDA,
    botinMax: 1,
    nocturno: false,
    pasivo: true,
  },
  jabali: {
    desde: '2.3.0',
    nombre: 'jabalí',
    vida: 38,
    dano: 0,
    ancho: 28,
    alto: 20,
    color: '#6b5344',
    colorOscuro: '#42332a',
    vuela: false,
    botin: CARNE_CRUDA,
    botinMax: 3,
    nocturno: false,
    pasivo: true,
  },
  // --- Los tres de la fase larga -----------------------------------------
  // El esqueleto vive abajo y es el que hace que bajar sin espada decente sea
  // mala idea: pega fuerte y aguanta. Suelta hueso, que es lo que pide el altar.
  esqueleto: {
    desde: '3.0.0',
    nombre: 'esqueleto',
    vida: 55,
    dano: 20,
    ancho: 20,
    alto: 40,
    color: '#ddd8c4',
    colorOscuro: '#8d8877',
    vuela: false,
    botin: HUESO,
    botinMax: 3,
    nocturno: false,
  },
  // La serpiente es baja y rápida: por debajo de la espada si no se apunta al
  // suelo, que es justo la razón de que el mandoble se pueda apuntar.
  serpiente: {
    desde: '3.0.0',
    nombre: 'serpiente',
    vida: 22,
    dano: 16,
    ancho: 26,
    alto: 10,
    color: '#b8a04a',
    colorOscuro: '#6d5c22',
    vuela: false,
    botin: GEL,
    botinMax: 1,
    nocturno: false,
  },
  // La momia es el zombi del desierto: más lenta, más dura, y de día también.
  momia: {
    desde: '3.0.0',
    nombre: 'momia',
    vida: 70,
    dano: 24,
    ancho: 20,
    alto: 40,
    color: '#cfc3a4',
    colorOscuro: '#8a7d62',
    vuela: false,
    botin: HUESO,
    botinMax: 2,
    nocturno: true,
  },
  // La gallina existe por las plumas: sin ellas no hay flechas de verdad, y
  // atarlas a un animal que hay que perseguir es mejor que dejarlas en un cofre.
  gallina: {
    desde: '3.2.0',
    nombre: 'gallina',
    vida: 8,
    dano: 0,
    ancho: 14,
    alto: 14,
    color: '#f0ece0',
    colorOscuro: '#b8ae98',
    vuela: false,
    botin: PLUMA,
    botinMax: 3,
    nocturno: false,
    pasivo: true,
  },
  // --- Los cuatro de la profundidad (5.3.0) ------------------------------
  // Los biomas ganaron setenta y ocho tiles de subsuelo en 5.0.0 y cuevas
  // propias en 5.2.0, pero seguían saliendo los mismos zombis de la superficie:
  // bajar era más oscuro, no más peligroso. Estos cuatro son la otra mitad de
  // esa profundidad. Cada uno vive en un sitio y solo en ese sitio, así que
  // encontrárselos ya dice dónde está uno.

  // El gólem: la piedra del desierto puesta de pie. Es el enemigo más duro que
  // no es un jefe —aguanta como tres esqueletos— pero se arrastra, así que se
  // le puede dejar atrás andando. Lo peligroso es encontrárselo en una cueva de
  // arenisca, donde no hay hacia dónde retroceder.
  golem: {
    desde: '5.3.0',
    nombre: 'gólem de arenisca',
    vida: 150,
    dano: 28,
    ancho: 28,
    alto: 44,
    color: '#c9a35e',
    colorOscuro: '#7a6033',
    vuela: false,
    botin: HUESO,
    botinMax: 3,
    botinRaro: LINGOTE_COBALTO,
    probRaro: 0.18,
    nocturno: false,
  },
  // El espectro: lo contrario del gólem. Poca vida y ninguna resistencia, pero
  // vuela y se lanza en línea recta sin avisar, así que la caverna helada deja
  // de ser un sitio por el que se puede caminar mirando el suelo.
  espectro: {
    desde: '5.3.0',
    nombre: 'espectro de hielo',
    vida: 70,
    dano: 28,
    ancho: 24,
    alto: 30,
    color: '#a8e0f0',
    colorOscuro: '#4a7f95',
    vuela: true,
    botin: GEL,
    botinMax: 3,
    botinRaro: LINGOTE_TITANIO,
    probRaro: 0.14,
    nocturno: false,
  },
  // La araña: rápida y saltarina. La selva ya era incómoda de cruzar por lo
  // apretado del terreno; esto es lo que hace que además haya que mirar arriba.
  arana: {
    desde: '5.3.0',
    nombre: 'araña de la selva',
    vida: 52,
    dano: 24,
    ancho: 26,
    alto: 18,
    color: '#3f7a3a',
    colorOscuro: '#20401e',
    vuela: false,
    botin: GEL,
    botinMax: 4,
    botinRaro: CRISTAL,
    probRaro: 0.1,
    nocturno: false,
  },
  // El diablillo: el habitante del inframundo, que desde 5.0.0 estaba vacío.
  // Un mar de lava sin nada volando encima es un decorado; con esto es un sitio
  // al que se baja preparado.
  diablillo: {
    desde: '5.3.0',
    nombre: 'diablillo',
    vida: 95,
    dano: 32,
    ancho: 22,
    alto: 26,
    color: '#e07040',
    colorOscuro: '#8a2f18',
    vuela: true,
    botin: HUESO,
    botinMax: 2,
    botinRaro: LINGOTE_INFERNITA,
    probRaro: 0.12,
    nocturno: false,
  },
  // El guardián de la fortaleza. Vuela porque un jefe que anda se esquiva
  // subiéndose a un bloque, y la sala del altar tiene doce tiles de alto justo
  // para que pueda usarlos. Aguanta mucho y pega fuerte, pero no de un toque:
  // con armadura de plata quedan cinco o seis errores de margen, que es lo que
  // convierte la pelea en una pelea y no en una tirada de dados.
  guardian: {
    desde: '4.0.0',
    nombre: 'guardián de la fortaleza',
    vida: 900,
    dano: 34,
    ancho: 60,
    alto: 60,
    color: '#a37ef0',
    colorOscuro: '#3a2a58',
    vuela: true,
    botin: ESENCIA,
    botinMax: 1,
    nocturno: false,
    jefe: true,
  },
  lobo: {
    desde: '2.1.0',
    nombre: 'lobo de hielo',
    vida: 50,
    dano: 22,
    ancho: 26,
    alto: 22,
    color: '#c3d8e8',
    colorOscuro: '#6f8ba3',
    vuela: false,
    botin: HUESO,
    botinMax: 2,
    nocturno: true,
  },
};

export interface Enemigo {
  especie: Especie;
  caja: Caja;
  salud: Salud;
  /** Temporizador propio de cada IA. */
  reloj: number;
  /** Ticks que lleva sin que el jugador esté cerca, para desaparecer. */
  olvidado: number;
  vivo: boolean;
  /** Fase del vuelo, solo para los que vuelan. */
  fase: number;
  /**
   * Ticks acumulados para la animación.
   *
   * Va aparte de `reloj` porque ese lo reinicia cada IA cuando le conviene —el
   * slime lo pone a cero en cada salto— y un contador que salta hacia atrás
   * hace que el sprite parpadee entre frames.
   */
  animReloj: number;
  /** Ticks hasta la próxima quemadura de lava. */
  quemadura: number;
  /**
   * Multiplica la vida y el daño de la especie.
   *
   * Existe para que el mismo zombi pueda ser una molestia de mediodía y una
   * amenaza de madrugada sin duplicar la tabla de especies. La dificultad del
   * mundo y la hora entran por aquí.
   */
  fuerza: number;
  /**
   * Es una versión de élite: el mismo bicho, mucho más fuerte y con premio.
   *
   * Va como bandera y no como una especie aparte porque un "zombi de élite"
   * duplicado en la tabla sería un zombi más que mantener, con su sprite, su
   * IA y su entrada de versión, y a la tercera especie con élite tendríamos la
   * tabla del doble de larga diciendo dos veces lo mismo. Aquí lo único que
   * cambia es cuánto aguanta, cuánto pega, qué suelta y que se le ve el aura.
   */
  elite: boolean;
}

const GRAVEDAD = 0.4;
const VEL_TERMINAL = 10;

/**
 * Cuánto multiplica la élite la vida y el daño de su especie.
 *
 * Dos y medio. Es mucho a propósito: un enemigo de élite que se mata igual que
 * el normal solo cambia de color, y lo que se busca es que ver uno de noche
 * cambie la decisión —correr, subirse a algo, gastar flechas— y no solo la
 * paleta. Con armadura de hierro un zombi de élite quita casi la mitad de la
 * vida por toque, así que dos errores seguidos matan.
 */
export const FUERZA_ELITE = 2.5;

/**
 * Con qué probabilidad un hostil nocturno de superficie sale de élite.
 *
 * Una de cada nueve. Es poco: la noche tiene que seguir siendo la noche de
 * siempre, con su ración de zombis normales, y la élite tiene que ser la
 * excepción que hace levantar la vista. Si saliera una de cada tres dejaría de
 * ser un susto para ser el nuevo suelo de dificultad de la noche.
 */
export const PROBABILIDAD_ELITE = 1 / 9;

/** Nombre con el que se anuncia un enemigo concreto, élite incluida. */
export function nombreDe(e: Enemigo): string {
  const n = ENEMIGOS[e.especie].nombre;
  return e.elite ? `${n} de élite` : n;
}

/** Vida a la que el guardián se enfurece, como fracción de su máximo. */
export const MITAD_JEFE = 0.5;
/** Ticks entre embestidas del guardián, tranquilo y enfurecido. */
const CICLO_EMBESTIDA = 190;
const CICLO_EMBESTIDA_FURIOSO = 130;
/** Ticks que dura una embestida antes de volver a flotar. */
const TICKS_EMBESTIDA = 34;

export function crearEnemigo(
  especie: Especie,
  wx: number,
  wy: number,
  fuerza = 1,
  elite = false,
): Enemigo {
  const def = ENEMIGOS[especie];
  // La élite multiplica sobre lo que ya traía: la dificultad y la hora siguen
  // contando. Un zombi de élite en brutal y de madrugada tiene que ser peor que
  // uno de élite en normal, y con la élite como valor fijo no lo sería.
  if (elite) fuerza *= FUERZA_ELITE;
  return {
    especie,
    caja: {
      x: wx,
      y: wy,
      ancho: def.ancho,
      alto: def.alto,
      vx: 0,
      vy: 0,
      enSuelo: false,
      mirando: 1,
      ticksCoyote: 0,
      ticksBuffer: 0,
      ticksSalto: 0,
      saltando: false,
      nadaba: false,
      yInicioCaida: wy,
      ultimaCaida: 0,
    },
    salud: crearSalud(Math.max(1, Math.round(def.vida * fuerza))),
    reloj: Math.floor(Math.random() * 60),
    olvidado: 0,
    vivo: true,
    fase: Math.random() * Math.PI * 2,
    // Desfase inicial al azar: si no, todos los slimes de la pantalla se
    // aplastan a la vez y se ve la maquinaria.
    animReloj: Math.floor(Math.random() * 60),
    quemadura: 1,
    fuerza,
    elite,
  };
}

/** Daño por contacto de este enemigo concreto, ya escalado. */
export function danoDe(e: Enemigo): number {
  const def = ENEMIGOS[e.especie];
  if (def.pasivo || def.dano <= 0) return 0;
  return Math.max(1, Math.round(def.dano * e.fuerza));
}

/** Centro de una caja, que es lo que usan todas las decisiones de la IA. */
export function centro(c: Caja): { x: number; y: number } {
  return { x: c.x + c.ancho / 2, y: c.y + c.alto / 2 };
}

/**
 * Decide el movimiento del tick según la especie. Separado del movimiento en sí
 * para poder probar la intención sin simular colisiones.
 */
export function pensar(e: Enemigo, objetivo: { x: number; y: number }): void {
  const c = e.caja;
  const mio = centro(c);
  const dx = objetivo.x - mio.x;
  const dy = objetivo.y - mio.y;
  const dir = dx < 0 ? -1 : 1;
  e.reloj++;

  switch (e.especie) {
    case 'gallina':
      // Corretea a saltitos cortos y se aleja poco: una gallina que huye como
      // un conejo sería imposible de coger, y coger gallinas es el punto.
      if (c.enSuelo) {
        c.vx *= 0.8;
        if (Math.abs(dx) < 90 && e.reloj > 34) {
          e.reloj = 0;
          c.vy = -3.2;
          c.vx = -dir * 1.5;
          c.mirando = -dir as 1 | -1;
        }
      }
      break;

    case 'conejo':
      // Da saltitos alejándose. Rápido y corto: se le puede alcanzar, pero hay
      // que perseguirlo, no basta con andar hacia él.
      if (c.enSuelo) {
        c.vx *= 0.86;
        const cerca = Math.abs(dx) < 130;
        if (cerca && e.reloj > 26) {
          e.reloj = 0;
          c.vy = -4.6;
          c.vx = -dir * 2.6;
          c.mirando = -dir as 1 | -1;
        }
      }
      break;

    case 'jabali':
      // Trota alejándose sin saltar, y solo cuando el jugador está encima.
      if (Math.abs(dx) < 150) {
        c.vx += (-dir * 1.9 - c.vx) * 0.1;
        c.mirando = -dir as 1 | -1;
      } else {
        c.vx *= 0.9;
      }
      break;

    case 'escarabajo':
      // Anda pegado al suelo, más rápido que un zombi pero sin saltar: un
      // escalón lo detiene, y esa es la forma de quitárselo de encima.
      c.vx += (dir * 1.6 - c.vx) * 0.14;
      c.mirando = dir;
      break;

    case 'lobo': {
      // Corre y salta al acercarse: es el enemigo al que no se le escapa uno
      // andando, y por eso hay que pararlo de frente.
      const deseada = dir * 2.4;
      c.vx += (deseada - c.vx) * 0.18;
      c.mirando = dir;
      if (c.enSuelo && (Math.abs(c.vx) < 0.4 || (Math.abs(dx) < 70 && e.reloj % 70 === 0))) {
        c.vy = -5.6;
      }
      break;
    }

    case 'slime':
      // Salta cada segundo y medio hacia el jugador. En el aire no corrige:
      // un slime es tonto, y esquivarlo tiene que ser posible.
      if (c.enSuelo) {
        c.vx *= 0.8;
        if (e.reloj > 80) {
          e.reloj = 0;
          c.vy = -5.2;
          c.vx = dir * 2.1;
          c.mirando = dir;
        }
      }
      break;

    case 'zombi': {
      // Camina siempre hacia el jugador y salta cuando algo le corta el paso.
      const objetivoVx = dir * 1.15;
      c.vx += (objetivoVx - c.vx) * 0.2;
      c.mirando = dir;
      if (c.enSuelo && Math.abs(c.vx) < 0.35 && Math.abs(dx) > 4) {
        c.vy = -5.4;
      }
      break;
    }

    case 'esqueleto': {
      // Como el zombi pero decidido: anda más rápido y salta antes. La
      // diferencia se nota en que no se le deja atrás corriendo.
      c.vx += (dir * 1.5 - c.vx) * 0.22;
      c.mirando = dir;
      if (c.enSuelo && Math.abs(c.vx) < 0.4 && Math.abs(dx) > 4) c.vy = -5.6;
      break;
    }

    case 'momia': {
      // Lentísima y constante. No salta: se la esquiva sin problema, pero si te
      // acorrala contra una pared del desierto, se acabó.
      c.vx += (dir * 0.8 - c.vx) * 0.12;
      c.mirando = dir;
      break;
    }

    case 'serpiente': {
      // Repta a rachas: acelera un momento y se para, así que su avance es
      // irregular y cuesta calcular cuándo va a llegar.
      const embiste = e.reloj % 90 < 40;
      c.vx += ((embiste ? dir * 2.6 : 0) - c.vx) * 0.16;
      c.mirando = dir;
      // Solo salta si tiene algo justo delante; una serpiente que brinca no es
      // una serpiente.
      if (c.enSuelo && embiste && Math.abs(c.vx) < 0.3 && Math.abs(dx) > 4) c.vy = -3.4;
      break;
    }

    case 'golem': {
      // Se arrastra, y cada cuatro segundos se tira encima. El paso lento es
      // lo que lo hace evitable; el salto es lo que impide quitárselo de
      // encima quedándose a dos tiles pegando espadazos, que es como se
      // resuelve un enemigo lento cualquiera.
      c.vx += (dir * 0.7 - c.vx) * 0.09;
      c.mirando = dir;
      if (c.enSuelo && e.reloj % 240 === 0 && Math.abs(dx) < 140) {
        c.vy = -6.4;
        c.vx = dir * 3.4;
      }
      break;
    }

    case 'espectro': {
      // Deriva y se lanza. Fuera del ataque flota casi quieto, para que se le
      // vea venir; durante el ataque va en línea recta a la posición que tenía
      // el jugador al empezar, sin corregir, así que apartarse funciona.
      e.fase += 0.06;
      const t = e.reloj % 150;
      if (t === 0) {
        const d = Math.hypot(dx, dy) || 1;
        c.vx = (dx / d) * 6.2;
        c.vy = (dy / d) * 6.2;
      } else if (t > 26) {
        c.vx += (dir * 0.9 - c.vx) * 0.05;
        c.vy += (Math.sign(dy) * 0.5 + Math.sin(e.fase) * 1.4 - c.vy) * 0.05;
      }
      c.mirando = dir;
      break;
    }

    case 'arana': {
      // Rápida y con brincos cortos y seguidos. No persigue mejor que un lobo,
      // pero sube desniveles sin frenar, y en la selva el terreno es casi todo
      // desnivel: es el único bicho al que no se le escapa uno hacia arriba.
      c.vx += (dir * 2.9 - c.vx) * 0.2;
      c.mirando = dir;
      if (c.enSuelo && (Math.abs(c.vx) < 0.5 || e.reloj % 44 === 0)) c.vy = -4.8;
      break;
    }

    case 'diablillo': {
      // Ronda por encima y baja en picado. Se coloca unos tiles más arriba que
      // el jugador y desde ahí se deja caer: por eso en el inframundo importa
      // dónde se está parado, y no solo si hay lava debajo.
      e.fase += 0.07;
      const t = e.reloj % 110;
      if (t < 70) {
        // Rondar: acercarse en horizontal y mantenerse cinco tiles por encima.
        c.vx += (dir * 2.2 - c.vx) * 0.07;
        const alturaDeseada = dy + 5 * TILE;
        c.vy += (Math.sign(alturaDeseada) * 1.2 + Math.sin(e.fase) * 0.8 - c.vy) * 0.08;
      } else {
        // Picado: recto hacia el jugador, rápido y sin corregir el rumbo una
        // vez lanzado.
        if (t === 70) {
          const d = Math.hypot(dx, dy) || 1;
          c.vx = (dx / d) * 5.4;
          c.vy = (dy / d) * 5.4;
        }
      }
      c.mirando = dir;
      break;
    }

    case 'guardian': {
      // Dos velocidades y una embestida. En reposo flota hacia el jugador
      // despacio, con un bamboleo que impide predecir su altura exacta; cada
      // pocos segundos toma carrerilla y se lanza en línea recta sin corregir.
      // Esa embestida es toda la dificultad de la pelea: se ve venir, dura
      // poco y se esquiva apartándose, así que castiga quedarse quieto pegando
      // sin castigar el simple hecho de estar cerca.
      const furioso = e.salud.vida < e.salud.vidaMax * MITAD_JEFE;
      e.fase += 0.05;
      const ciclo = furioso ? CICLO_EMBESTIDA_FURIOSO : CICLO_EMBESTIDA;
      const t = e.reloj % ciclo;
      if (t === 0) {
        const d = Math.hypot(dx, dy) || 1;
        const impulso = furioso ? 9.5 : 7.5;
        c.vx = (dx / d) * impulso;
        c.vy = (dy / d) * impulso;
      } else if (t > TICKS_EMBESTIDA) {
        // Fuera de la embestida: acercarse sin prisa y flotar.
        const vel = furioso ? 2.4 : 1.7;
        c.vx += (dir * vel - c.vx) * 0.05;
        const deseada = Math.sign(dy) * 1.1 + Math.sin(e.fase) * 0.9;
        c.vy += (deseada - c.vy) * 0.06;
      }
      c.mirando = dir;
      break;
    }

    case 'murcielago': {
      // Vuelo ondulante: se acerca en horizontal y bambolea en vertical, así
      // que no cae en línea recta y cuesta darle.
      e.fase += 0.09;
      const objetivoVx = dir * 1.7;
      c.vx += (objetivoVx - c.vx) * 0.06;
      const deseadaVy = Math.sign(dy) * 1.1 + Math.sin(e.fase) * 1.3;
      c.vy += (deseadaVy - c.vy) * 0.12;
      c.mirando = dir;
      break;
    }
  }
}

/** Mueve al enemigo resolviendo colisiones contra el terreno. */
export function moverEnemigo(mundo: Mundo, e: Enemigo): void {
  const c = e.caja;
  const def = ENEMIGOS[e.especie];

  if (!def.vuela) {
    c.vy += GRAVEDAD;
    if (c.vy > VEL_TERMINAL) c.vy = VEL_TERMINAL;
  }

  const pasos = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(c.vx), Math.abs(c.vy)) / (TILE - 1)),
  );
  let enSuelo = false;
  for (let i = 0; i < pasos; i++) {
    const xAntes = c.x;
    const apoyado = c.enSuelo || enSuelo;
    if (moverX(mundo, c, c.vx / pasos)) {
      // Los que andan suben un escalón de un tile, igual que el jugador. Sin
      // esto, un slime se queda dando saltitos contra el primer desnivel del
      // terreno hasta que el jugador se aburre y se va: no es un enemigo, es un
      // mueble. Los que vuelan no lo necesitan.
      if (!def.vuela && apoyado && subirEscalon(mundo, c, c.vx / pasos, xAntes)) {
        // Ha subido: se conserva la velocidad y se sigue.
      } else {
        c.vx = 0;
      }
    }
    const r = moverY(mundo, c, c.vy / pasos, false);
    if (r.colision) {
      if (r.suelo) enSuelo = true;
      c.vy = 0;
    }
  }
  c.enSuelo = enSuelo;
}

/**
 * Intenta salvar un escalón de un tile. Devuelve true si ha cabido.
 *
 * Es la misma idea que la del jugador pero escrita aquí porque la del jugador
 * vive detrás de sus ajustes de física, que los enemigos no tienen: se levanta
 * la caja un tile, se comprueba que no se mete en un techo y se reintenta el
 * movimiento horizontal.
 */
function subirEscalon(mundo: Mundo, c: Caja, dx: number, xAntes: number): boolean {
  const xChoque = c.x;
  const yAntes = c.y;

  c.x = xAntes;
  c.y = yAntes - TILE;
  if (solapaSolido(mundo, c) || moverX(mundo, c, dx)) {
    c.x = xChoque;
    c.y = yAntes;
    return false;
  }
  // Encajar sobre el escalón en el mismo tick, para que no quede flotando.
  if (!moverY(mundo, c, TILE / 2, false).colision) moverY(mundo, c, TILE / 2, false);
  return true;
}

/** ¿Se solapan las dos cajas? Es toda la detección de contacto que hace falta. */
export function solapan(a: Caja, b: Caja): boolean {
  return (
    a.x < b.x + b.ancho &&
    a.x + a.ancho > b.x &&
    a.y < b.y + b.alto &&
    a.y + a.alto > b.y
  );
}

/**
 * Daño de lava por tick a un enemigo, y cada cuántos ticks.
 *
 * La lava no mata de un toque a nadie —ni al jugador ni a los bichos— porque
 * una muerte instantánea no es un peligro, es una trampa: no da tiempo a
 * reaccionar y lo único que enseña es a no acercarse nunca. Quemándose se puede
 * salir a tiempo, y a un slime le da para dos segundos de agonía.
 */
export const DANO_LAVA_ENEMIGO = 14;
export const INTERVALO_LAVA_ENEMIGO = 22;

export interface ResultadoEnemigos {
  /** Daño que han hecho al jugador este tick. */
  danoAlJugador: number;
  /** Enemigos que han muerto, con su posición, para soltar el botín. */
  muertos: { especie: Especie; tx: number; ty: number; elite: boolean }[];
}

/**
 * Avanza todos los enemigos un tick: piensan, se mueven, tocan al jugador y se
 * olvidan si nadie los ve.
 */
export function actualizarEnemigos(
  mundo: Mundo,
  enemigos: Enemigo[],
  jugador: Caja,
  saludJugador: { invulnerable: number },
  distanciaOlvido = 90 * TILE,
): ResultadoEnemigos {
  const objetivo = centro(jugador);
  const salida: ResultadoEnemigos = { danoAlJugador: 0, muertos: [] };

  for (const e of enemigos) {
    if (!e.vivo) continue;
    tickSalud(e.salud);

    const mio = centro(e.caja);
    const lejos = Math.hypot(objetivo.x - mio.x, objetivo.y - mio.y) > distanciaOlvido;
    e.olvidado = lejos ? e.olvidado + 1 : 0;
    // Un enemigo al que nadie ve durante diez segundos desaparece: si no, el
    // mundo se llena de bichos vagando por rincones que nadie visitará. El jefe
    // no: se ha invocado a mano y con una ofrenda cara, y perderlo por alejarse
    // a curarse convertiría la pelea en una broma.
    if (e.olvidado > 600 && !ENEMIGOS[e.especie].jefe) {
      e.vivo = false;
      continue;
    }

    pensar(e, objetivo);
    moverEnemigo(mundo, e);

    // La lava quema a todo el mundo. Es lo que hace que una colada sea un
    // accidente del terreno y no un adorno naranja: se puede usar de trampa, y
    // un zombi que te persigue puede acabar dentro.
    if (enLava(mundo, e.caja)) {
      if (--e.quemadura <= 0) {
        e.quemadura = INTERVALO_LAVA_ENEMIGO;
        golpear(
          e.salud,
          e.caja,
          DANO_LAVA_ENEMIGO,
          e.caja.x + e.caja.ancho / 2,
          0,
          false,
        );
      }
    } else {
      e.quemadura = 1;
    }
    // La animación corre con lo que se mueve: un bicho parado no debe seguir
    // dando zancadas en el sitio.
    e.animReloj += ENEMIGOS[e.especie].vuela ? 1 : Math.min(1, Math.abs(e.caja.vx) * 0.6 + 0.12);

    const def = ENEMIGOS[e.especie];
    if (!def.pasivo && solapan(e.caja, jugador) && saludJugador.invulnerable <= 0) {
      salida.danoAlJugador = Math.max(salida.danoAlJugador, danoDe(e));
    }

    if (e.salud.muerto) {
      e.vivo = false;
      salida.muertos.push({
        especie: e.especie,
        tx: Math.floor(mio.x / TILE),
        ty: Math.floor(mio.y / TILE),
        elite: e.elite,
      });
    }
  }

  return salida;
}

/** ¿La mitad de abajo de esta caja está metida en lava? */
function enLava(mundo: Mundo, c: Caja): boolean {
  const tx0 = Math.floor(c.x / TILE);
  const tx1 = Math.floor((c.x + c.ancho - 1) / TILE);
  // Se mira desde la cintura para abajo: rozar la superficie con la cabeza al
  // saltar por encima no debería quemar.
  const ty0 = Math.floor((c.y + c.alto * 0.5) / TILE);
  const ty1 = Math.floor((c.y + c.alto - 1) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (mundo.getLiquido(tx, ty) > 0 && mundo.esLava(tx, ty)) return true;
    }
  }
  return false;
}

/** Aplica daño a un enemigo desde una posición. Devuelve true si ha muerto. */
export function danarEnemigo(e: Enemigo, dano: number, desdeX: number): boolean {
  // Menos invulnerabilidad que el jugador: si no, una espada rápida pega igual
  // que una lenta y la cadencia del arma deja de significar nada.
  golpear(e.salud, e.caja, dano, desdeX, 12);
  // Se marca muerto aquí mismo, no al final del tick. Sin esto, un bicho
  // rematado a espada seguía contando como vivo hasta que `actualizarEnemigos`
  // lo recorría en el mismo tick y volvía a darlo por muerto: quien lo mató ya
  // había repartido su botín, y el segundo pase repartía otro. Soltaba el doble
  // de todo, y con el guardián habría soltado dos espadas.
  if (e.salud.muerto) e.vivo = false;
  return e.salud.muerto;
}

export function botinDe(
  especie: Especie,
  rng: () => number = Math.random,
  elite = false,
): {
  objeto: number;
  cantidad: number;
} {
  const def = ENEMIGOS[especie];
  const base = 1 + Math.floor(rng() * def.botinMax);
  // La élite suelta el doble de lo común. Es la mitad barata del premio: la
  // buena es el botín raro, que la élite se lleva casi siempre.
  return { objeto: def.botin, cantidad: elite ? base * 2 : base };
}

/**
 * El botín raro de un muerto, o null si no toca.
 *
 * La élite lo saca cuatro veces más a menudo que su especie. Ese multiplicador
 * —y no el daño— es lo que hace que valga la pena pelear con una en vez de
 * huir: el gólem normal da un lingote de cobalto una de cada seis veces, el de
 * élite dos de cada tres. Con el tope en 0,9 nunca es seguro, porque un botín
 * garantizado convierte al bicho en una expendedora.
 */
export function botinRaroDe(
  especie: Especie,
  rng: () => number = Math.random,
  elite = false,
): number | null {
  const def = ENEMIGOS[especie];
  if (def.botinRaro === undefined) return null;
  const prob = Math.min(0.9, (def.probRaro ?? 0) * (elite ? 4 : 1));
  return rng() < prob ? def.botinRaro : null;
}

/** ¿Existía esta especie en esta versión del juego? */
export function especieExisteEn(especie: Especie, versionMundo: string): boolean {
  return alMenos(versionMundo, ENEMIGOS[especie].desde);
}

/** ¿Es un jefe? */
export function esJefe(especie: Especie): boolean {
  return ENEMIGOS[especie].jefe === true;
}

/**
 * Con qué voz se queja cada especie.
 *
 * Los animales callan. No es un olvido: el conejo y la gallina están para dar
 * de comer, y un prado en el que todo cacarea sin parar cansa a los dos
 * minutos. Lo que se quiere de las voces es que la cueva suene habitada y que
 * un gruñido a la espalda haga girarse antes de que el zombi llegue.
 */
const VOCES_ESPECIE: Partial<Record<Especie, VozEnemigo>> = {
  zombi: 'gruñido',
  momia: 'gruñido',
  esqueleto: 'huesos',
  murcielago: 'chillido',
  serpiente: 'chillido',
  slime: 'gorgoteo',
  escarabajo: 'gorgoteo',
  lobo: 'aullido',
  guardian: 'rugido',
  // El gólem retumba como el jefe pero sin ser uno: es lo que avisa de que en
  // esta cueva de arenisca hay algo que no se mata a espadazos.
  golem: 'rugido',
  espectro: 'chillido',
  arana: 'chillido',
  diablillo: 'gruñido',
};

export type VozEnemigo =
  | 'gruñido'
  | 'huesos'
  | 'chillido'
  | 'gorgoteo'
  | 'aullido'
  | 'rugido';

/** La voz de una especie, o null si es de las que no hablan. */
export function vozDe(especie: Especie): VozEnemigo | null {
  return VOCES_ESPECIE[especie] ?? null;
}

/**
 * Probabilidad por tick de que un bicho cercano diga algo.
 *
 * Una entre setecientas: sale a una queja cada doce segundos por bicho. Con
 * tres o cuatro alrededor es un ruido de fondo constante pero no continuo, que
 * es justo el punto en el que una cueva da mal rollo sin llegar a molestar.
 */
export const PROBABILIDAD_VOZ = 1 / 700;

/**
 * Con qué probabilidad un hostil suelta la reliquia que pide el altar.
 *
 * Tres de cada cien. Es poco por bicho y mucho por partida: matando lo que uno
 * mata de todas formas, la reliquia cae sola en un rato largo de juego, sin
 * obligar a cazar una especie concreta ni a farmear un sitio. Y como el altar
 * pide una sola, tenerla nunca es el cuello de botella —lo son los cien geles.
 */
export const PROBABILIDAD_RELIQUIA = 0.03;

/**
 * ¿Este muerto suelta reliquia? Solo los hostiles, y nunca los jefes: el jefe
 * ya suelta lo suyo, y darle además la llave de sí mismo no tendría sentido.
 */
export function sueltaReliquia(especie: Especie, rng: () => number = Math.random): boolean {
  const def = ENEMIGOS[especie];
  if (def.pasivo || def.dano <= 0 || def.jefe) return false;
  return rng() < PROBABILIDAD_RELIQUIA;
}

/** El objeto que suelta la reliquia, para que quien la reparta no lo importe. */
export const OBJETO_RELIQUIA = RELIQUIA;

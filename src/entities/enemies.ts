import { TILE } from '../core/constants';
import { CARNE_CRUDA, GEL, HUESO } from '../items/items';
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
  | 'jabali';

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
  /** Solo aparece de noche en la superficie. */
  readonly nocturno: boolean;
  /**
   * No ataca: huye. Los animales existen para dar de comer, no para pelear, y
   * un conejo que te muerde por acercarte sería un enemigo con orejas.
   */
  readonly pasivo?: boolean;
}

export const ENEMIGOS: Record<Especie, DefEnemigo> = {
  slime: {
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
  lobo: {
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
}

const GRAVEDAD = 0.4;
const VEL_TERMINAL = 10;

export function crearEnemigo(especie: Especie, wx: number, wy: number): Enemigo {
  const def = ENEMIGOS[especie];
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
    salud: crearSalud(def.vida),
    reloj: Math.floor(Math.random() * 60),
    olvidado: 0,
    vivo: true,
    fase: Math.random() * Math.PI * 2,
    // Desfase inicial al azar: si no, todos los slimes de la pantalla se
    // aplastan a la vez y se ve la maquinaria.
    animReloj: Math.floor(Math.random() * 60),
  };
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

export interface ResultadoEnemigos {
  /** Daño que han hecho al jugador este tick. */
  danoAlJugador: number;
  /** Enemigos que han muerto, con su posición, para soltar el botín. */
  muertos: { especie: Especie; tx: number; ty: number }[];
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
    // mundo se llena de bichos vagando por rincones que nadie visitará.
    if (e.olvidado > 600) {
      e.vivo = false;
      continue;
    }

    pensar(e, objetivo);
    moverEnemigo(mundo, e);
    // La animación corre con lo que se mueve: un bicho parado no debe seguir
    // dando zancadas en el sitio.
    e.animReloj += ENEMIGOS[e.especie].vuela ? 1 : Math.min(1, Math.abs(e.caja.vx) * 0.6 + 0.12);

    const def = ENEMIGOS[e.especie];
    if (!def.pasivo && solapan(e.caja, jugador) && saludJugador.invulnerable <= 0) {
      salida.danoAlJugador = Math.max(salida.danoAlJugador, def.dano);
    }

    if (e.salud.muerto) {
      e.vivo = false;
      salida.muertos.push({
        especie: e.especie,
        tx: Math.floor(mio.x / TILE),
        ty: Math.floor(mio.y / TILE),
      });
    }
  }

  return salida;
}

/** Aplica daño a un enemigo desde una posición. Devuelve true si ha muerto. */
export function danarEnemigo(e: Enemigo, dano: number, desdeX: number): boolean {
  // Menos invulnerabilidad que el jugador: si no, una espada rápida pega igual
  // que una lenta y la cadencia del arma deja de significar nada.
  golpear(e.salud, e.caja, dano, desdeX, 12);
  return e.salud.muerto;
}

export function botinDe(especie: Especie, rng: () => number = Math.random): {
  objeto: number;
  cantidad: number;
} {
  const def = ENEMIGOS[especie];
  return { objeto: def.botin, cantidad: 1 + Math.floor(rng() * def.botinMax) };
}

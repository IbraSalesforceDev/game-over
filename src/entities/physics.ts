import { TILE } from '../core/constants';
import { agarreTile, esPlataforma, esSolido } from '../world/tiles';
import type { Mundo } from '../world/world';

/**
 * Física de plataformas contra rejilla de tiles.
 *
 * Reglas del sitio:
 *  - Todo se mide en píxeles por tick (1/60 s), como en Terraria. El bucle es de
 *    paso fijo, así que nunca hay que multiplicar por dt aquí.
 *  - La colisión es AABB contra la rejilla, resuelta **por ejes separados**:
 *    primero X, luego Y. Resolver los dos a la vez produce enganchones en las
 *    esquinas y es la fuente clásica de bugs en este tipo de juego.
 *  - El desplazamiento se subdivide para que ningún sub-paso supere un tile:
 *    así el tunneling es imposible por construcción, no por suerte.
 *
 * Este módulo no toca el DOM ni el canvas a propósito: todo es testeable.
 */

export interface Ajustes {
  /** px/tick² */
  gravedad: number;
  /** px/tick, tope de caída */
  velTerminal: number;
  /** px/tick², aceleración al correr en el suelo */
  aceleracion: number;
  /** px/tick, velocidad punta al correr */
  velMaxima: number;
  /** px/tick², frenada al soltar la dirección en el suelo */
  friccion: number;
  /** Factor de aceleración y frenada en el aire (0-1) */
  controlAereo: number;
  /** px/tick, velocidad vertical sostenida mientras dura el salto */
  impulsoSalto: number;
  /** Ticks que se mantiene el impulso si sigues pulsando salto */
  ticksSaltoSostenido: number;
  /** Ticks de gracia para saltar tras salirte de una plataforma */
  coyote: number;
  /** Ticks que se recuerda un salto pulsado en el aire */
  bufferSalto: number;
  /** Tiles que se suben automáticamente al chocar de frente */
  alturaEscalon: number;
}

export const AJUSTES_POR_DEFECTO: Ajustes = {
  gravedad: 0.4,
  velTerminal: 10,
  aceleracion: 0.08,
  velMaxima: 3,
  friccion: 0.2,
  controlAereo: 0.6,
  impulsoSalto: 5.01,
  ticksSaltoSostenido: 15,
  coyote: 6,
  bufferSalto: 6,
  alturaEscalon: 1,
};

/**
 * Cómo se comporta el cuerpo dentro de un líquido.
 *
 * No es un modelo de flotación: es lo justo para que el agua se sienta como
 * agua. Se cae despacio, se avanza con esfuerzo y se sube manteniendo el salto,
 * que es lo que hace que un lago sea un sitio por el que se puede pasar en vez
 * de una trampa mortal.
 */
export const NADO = {
  /** Fracción de la caja dentro del líquido a partir de la cual se nada. */
  umbral: 0.45,
  /** Factores sobre los ajustes de tierra firme. */
  gravedad: 0.34,
  velTerminal: 0.3,
  velMaxima: 0.62,
  aceleracion: 0.55,
  /** px/tick de subida mientras se mantenga el salto. */
  impulso: 1.5,
  /** Rebote al salir del agua con el salto pulsado, en px/tick. */
  salida: 3.4,
};

export interface Entrada {
  izq: boolean;
  der: boolean;
  abajo: boolean;
  /** Salto mantenido (para la altura variable). */
  salto: boolean;
  /** Salto pulsado en este tick (flanco). */
  saltoPulsado: boolean;
}

export const ENTRADA_VACIA: Entrada = {
  izq: false,
  der: false,
  abajo: false,
  salto: false,
  saltoPulsado: false,
};

/** Caja física de una entidad. (x, y) es la esquina superior izquierda. */
export interface Caja {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  vx: number;
  vy: number;
  enSuelo: boolean;
  mirando: 1 | -1;
  ticksCoyote: number;
  ticksBuffer: number;
  ticksSalto: number;
  saltando: boolean;
  /** Estaba nadando en el tick anterior. */
  nadaba: boolean;
  /** Altura desde la que se empezó a caer; la usará el daño por caída. */
  yInicioCaida: number;
  /** Tiles caídos en el último aterrizaje. */
  ultimaCaida: number;
}

export function crearCaja(x: number, y: number, ancho: number, alto: number): Caja {
  return {
    x,
    y,
    ancho,
    alto,
    vx: 0,
    vy: 0,
    enSuelo: false,
    mirando: 1,
    ticksCoyote: 0,
    ticksBuffer: 0,
    ticksSalto: 0,
    saltando: false,
    nadaba: false,
    yInicioCaida: y,
    ultimaCaida: 0,
  };
}

// --- Consultas de la rejilla -------------------------------------------------

/**
 * Margen para calcular el último tile que toca la caja.
 *
 * Tiene que ser infinitesimal, no un píxel: con un margen de 1 px una caja cuyo
 * borde cae a 0,4 px dentro de un bloque consulta la fila anterior y lo
 * atraviesa. Ese fue el bug que se comía las plataformas.
 */
const EPS = 1e-6;

/** Un tile que frena en horizontal. Las plataformas nunca lo hacen. */
function bloqueaLateral(mundo: Mundo, tx: number, ty: number): boolean {
  return esSolido(mundo.getTile(tx, ty));
}

/** ¿La caja está incrustada en algo sólido en su posición actual? */
export function solapaSolido(mundo: Mundo, caja: Caja): boolean {
  const tx0 = Math.floor(caja.x / TILE);
  const tx1 = Math.floor((caja.x + caja.ancho - EPS) / TILE);
  const ty0 = Math.floor(caja.y / TILE);
  const ty1 = Math.floor((caja.y + caja.alto - EPS) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (bloqueaLateral(mundo, tx, ty)) return true;
    }
  }
  return false;
}

/**
 * Desplaza en X y resuelve la colisión. Devuelve true si ha chocado.
 * Requiere |dx| < TILE, garantizado por la subdivisión.
 */
export function moverX(mundo: Mundo, caja: Caja, dx: number): boolean {
  if (dx === 0) return false;
  caja.x += dx;

  const ty0 = Math.floor(caja.y / TILE);
  const ty1 = Math.floor((caja.y + caja.alto - EPS) / TILE);

  if (dx > 0) {
    const tx = Math.floor((caja.x + caja.ancho - EPS) / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (bloqueaLateral(mundo, tx, ty)) {
        caja.x = tx * TILE - caja.ancho;
        return true;
      }
    }
  } else {
    const tx = Math.floor(caja.x / TILE);
    for (let ty = ty0; ty <= ty1; ty++) {
      if (bloqueaLateral(mundo, tx, ty)) {
        caja.x = (tx + 1) * TILE;
        return true;
      }
    }
  }
  return false;
}

export interface ResultadoY {
  /** Ha chocado con algo. */
  colision: boolean;
  /** Ha chocado con el suelo (venía cayendo). */
  suelo: boolean;
}

/**
 * Desplaza en Y y resuelve la colisión.
 *
 * Las plataformas solo frenan si la caja venía cayendo y sus pies estaban por
 * encima del borde superior de la plataforma antes de moverse. Con `atravesar`
 * (abajo + salto) se ignoran del todo.
 */
export function moverY(
  mundo: Mundo,
  caja: Caja,
  dy: number,
  atravesar: boolean,
): ResultadoY {
  if (dy === 0) return { colision: false, suelo: false };

  const baseAnterior = caja.y + caja.alto;
  caja.y += dy;

  const tx0 = Math.floor(caja.x / TILE);
  const tx1 = Math.floor((caja.x + caja.ancho - EPS) / TILE);

  if (dy > 0) {
    const ty = Math.floor((caja.y + caja.alto - EPS) / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      const id = mundo.getTile(tx, ty);
      const frena =
        esSolido(id) ||
        (esPlataforma(id) && !atravesar && baseAnterior <= ty * TILE);
      if (frena) {
        caja.y = ty * TILE - caja.alto;
        return { colision: true, suelo: true };
      }
    }
  } else {
    const ty = Math.floor(caja.y / TILE);
    for (let tx = tx0; tx <= tx1; tx++) {
      if (esSolido(mundo.getTile(tx, ty))) {
        caja.y = (ty + 1) * TILE;
        return { colision: true, suelo: false };
      }
    }
  }
  return { colision: false, suelo: false };
}

/**
 * Agarre del tile que se está pisando. Si hay varios bajo la caja, gana el que
 * menos agarra: pisar medio bloque de hielo ya resbala.
 */
function agarreDebajo(mundo: Mundo, caja: Caja): number {
  const ty = Math.floor((caja.y + caja.alto + 0.5) / TILE);
  const tx0 = Math.floor(caja.x / TILE);
  const tx1 = Math.floor((caja.x + caja.ancho - EPS) / TILE);
  let menor = 1;
  for (let tx = tx0; tx <= tx1; tx++) {
    const id = mundo.getTile(tx, ty);
    if (id === 0) continue;
    menor = Math.min(menor, agarreTile(id));
  }
  return menor;
}

/** ¿Hay suelo justo debajo? Se consulta tras el movimiento vertical. */
function haySueloDebajo(mundo: Mundo, caja: Caja, atravesar: boolean): boolean {
  const base = caja.y + caja.alto;
  const ty = Math.floor(base / TILE);
  // Solo cuenta si los pies están posados en el borde del tile. Con tolerancia,
  // porque tras subir un escalón la posición no es exacta al píxel.
  if (base - ty * TILE > 0.5) return false;
  const tx0 = Math.floor(caja.x / TILE);
  const tx1 = Math.floor((caja.x + caja.ancho - EPS) / TILE);
  for (let tx = tx0; tx <= tx1; tx++) {
    const id = mundo.getTile(tx, ty);
    if (esSolido(id)) return true;
    if (esPlataforma(id) && !atravesar) return true;
  }
  return false;
}

/**
 * Al chocar de frente estando en el suelo, intenta subir el escalón.
 * Devuelve true si la subida se ha aceptado.
 */
function intentarEscalon(
  mundo: Mundo,
  caja: Caja,
  dx: number,
  xAntes: number,
  aj: Ajustes,
): boolean {
  const alturaMax = aj.alturaEscalon * TILE;
  if (alturaMax <= 0) return false;

  const xChoque = caja.x;
  const yAntes = caja.y;

  caja.x = xAntes;
  caja.y = yAntes - alturaMax;

  // Si al levantarnos nos metemos en un techo, no hay escalón que valga.
  if (solapaSolido(mundo, caja)) {
    caja.x = xChoque;
    caja.y = yAntes;
    return false;
  }

  const vuelveAChocar = moverX(mundo, caja, dx);
  if (vuelveAChocar) {
    caja.x = xChoque;
    caja.y = yAntes;
    return false;
  }

  // Encajar sobre el escalón en el mismo tick: si no, la caja se queda flotando
  // hasta que la gravedad la baja y el movimiento parece un saltito.
  const mitad = alturaMax / 2;
  if (!moverY(mundo, caja, mitad, false).colision) {
    moverY(mundo, caja, mitad, false);
  }
  return true;
}

// --- Integración -------------------------------------------------------------

/**
 * Avanza la caja un tick de simulación.
 *
 * `sumergido` es la fracción de la caja que está dentro de un líquido (0-1).
 * Se calcula fuera para que este módulo siga sin saber nada de niveles de agua:
 * aquí solo llega un número.
 */
export function actualizarFisica(
  mundo: Mundo,
  caja: Caja,
  entrada: Entrada,
  aj: Ajustes,
  sumergido = 0,
): void {
  const nadando = sumergido >= NADO.umbral;
  const dir = (entrada.der ? 1 : 0) - (entrada.izq ? 1 : 0);
  if (dir !== 0) caja.mirando = dir > 0 ? 1 : -1;

  // Horizontal: acelerar hacia la punta, o frenar si no se pulsa nada.
  const factor = (caja.enSuelo ? 1 : aj.controlAereo) * (nadando ? NADO.aceleracion : 1);
  const velMaxima = nadando ? aj.velMaxima * NADO.velMaxima : aj.velMaxima;
  if (dir !== 0) {
    caja.vx += dir * aj.aceleracion * factor;
    if (Math.abs(caja.vx) > velMaxima) caja.vx = velMaxima * Math.sign(caja.vx);
  } else {
    // El suelo que se pisa decide cuánto se frena: la arena agarra y el hielo
    // no. Solo cuenta estando apoyado; en el aire no hay nada que agarre.
    const agarre = caja.enSuelo ? agarreDebajo(mundo, caja) : 1;
    const frenada = aj.friccion * factor * agarre;
    if (Math.abs(caja.vx) <= frenada) caja.vx = 0;
    else caja.vx -= frenada * Math.sign(caja.vx);
  }

  // Coyote time y buffer de salto: dos ventanas de gracia que hacen que el
  // control se sienta justo sin cambiar nada del modelo físico.
  if (caja.enSuelo) caja.ticksCoyote = aj.coyote;
  else if (caja.ticksCoyote > 0) caja.ticksCoyote--;

  if (entrada.saltoPulsado) caja.ticksBuffer = aj.bufferSalto;
  else if (caja.ticksBuffer > 0) caja.ticksBuffer--;

  // Abajo + salto atraviesa las plataformas hacia abajo, y por eso mismo ese
  // combo no debe disparar un salto.
  const atravesar = entrada.abajo && entrada.salto;

  // Nadar: mantener salto empuja hacia arriba de forma continua, sin gastar el
  // coyote ni el buffer. Al asomar la cabeza, el último empujón se convierte en
  // un salto de verdad para poder salir a la orilla en vez de quedarse pegado
  // al borde dando brazadas.
  if (nadando) {
    caja.saltando = false;
    caja.ticksSalto = 0;
    if (entrada.salto && !atravesar) caja.vy = -NADO.impulso;
  } else if (caja.nadaba && entrada.salto && caja.vy < 0) {
    caja.vy = -NADO.salida;
  }
  caja.nadaba = nadando;

  if (!nadando && caja.ticksBuffer > 0 && caja.ticksCoyote > 0 && !caja.saltando && !atravesar) {
    caja.saltando = true;
    caja.ticksSalto = aj.ticksSaltoSostenido;
    caja.ticksBuffer = 0;
    caja.ticksCoyote = 0;
    caja.enSuelo = false;
  }

  // Altura variable: mientras se mantenga pulsado y queden ticks, la velocidad
  // de subida se reimpone cada tick. Al soltar, la gravedad hace el resto.
  if (caja.saltando) {
    if (entrada.salto && caja.ticksSalto > 0) {
      caja.vy = -aj.impulsoSalto;
      caja.ticksSalto--;
    } else {
      caja.saltando = false;
      caja.ticksSalto = 0;
    }
  }

  caja.vy += nadando ? aj.gravedad * NADO.gravedad : aj.gravedad;
  const terminal = nadando ? aj.velTerminal * NADO.velTerminal : aj.velTerminal;
  if (caja.vy > terminal) caja.vy = terminal;

  // Registro de caída para el daño de fases futuras.
  if (caja.vy < 0 || caja.enSuelo) caja.yInicioCaida = caja.y;

  // Subdivisión: ningún sub-paso supera un tile menos un píxel.
  const maxPaso = TILE - 1;
  const pasos = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(caja.vx), Math.abs(caja.vy)) / maxPaso),
  );
  const dx = caja.vx / pasos;
  const dy = caja.vy / pasos;

  let enSuelo = false;

  for (let i = 0; i < pasos; i++) {
    const xAntes = caja.x;
    const estabaEnSuelo = caja.enSuelo || enSuelo;

    if (moverX(mundo, caja, dx)) {
      const subido = estabaEnSuelo && intentarEscalon(mundo, caja, dx, xAntes, aj);
      if (!subido) caja.vx = 0;
    }

    const rY = moverY(mundo, caja, dy, atravesar);
    if (rY.colision) {
      if (rY.suelo) {
        enSuelo = true;
        caja.ultimaCaida = Math.max(0, (caja.y - caja.yInicioCaida) / TILE);
      }
      caja.vy = 0;
    }
  }

  // Tras subir un escalón la caja queda flotando un instante: si hay suelo justo
  // debajo lo damos por pisado, para no perder el coyote ni la animación.
  caja.enSuelo = enSuelo || haySueloDebajo(mundo, caja, atravesar);

  if (caja.enSuelo) {
    caja.saltando = false;
    caja.ticksSalto = 0;
    caja.yInicioCaida = caja.y;
  }
}

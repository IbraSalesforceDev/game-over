import type { Entrada } from '../entities/physics';

/**
 * Traduce el teclado a acciones abstractas.
 *
 * El resto del juego no sabe qué teclas existen: solo pregunta por `izq`,
 * `der`, `abajo` y `salto`. Los controles táctiles se enchufan aquí, con
 * `fijar` y `pulsar`, y nadie más se entera.
 */

const MAPA: Record<string, keyof Acciones> = {
  ArrowLeft: 'izq',
  KeyA: 'izq',
  ArrowRight: 'der',
  KeyD: 'der',
  ArrowDown: 'abajo',
  KeyS: 'abajo',
  ArrowUp: 'salto',
  KeyW: 'salto',
  Space: 'salto',
};

interface Acciones {
  izq: boolean;
  der: boolean;
  abajo: boolean;
  salto: boolean;
}

/**
 * ¿La tecla va a un campo en el que se está escribiendo?
 *
 * El juego se maneja con letras y los paneles tienen campos: el mismo teclado
 * sirve para andar y para escribir «madera» en el buscador. Sin esta regla, esa
 * palabra abre el mapa, cambia de capa y echa a andar al jugador.
 *
 * La regla vive aquí, en la capa que traduce las teclas, y no en cada campo. Los
 * campos que había —los dos buscadores y los cuatro números del panel de
 * depuración— se tapaban los oídos uno a uno con `stopPropagation`, y eso tenía
 * dos fallos: cualquier campo nuevo nacía roto hasta que alguien se acordara de
 * repetirlo, y el que sí lo hacía se tragaba **todas** las teclas, también las
 * que no escriben nada. Escribir dos coordenadas en «Ir ahí» dejaba el foco en
 * el campo, y a partir de ahí la M ya no abría el mapa: ni escribía ni servía.
 */
export function escribiendo(destino: EventTarget | null): boolean {
  const el = destino as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    el.isContentEditable === true
  );
}

export interface GestorEntrada {
  /** Estado para el tick actual. */
  estado(): Entrada;
  /** Limpia los flancos. Se llama al final de cada tick de simulación. */
  finTick(): void;
  /** Se dispara con teclas que no son de movimiento (F3, F4...). */
  alPulsar(codigo: string, fn: () => void): void;
  /**
   * ¿Está esa tecla pulsada ahora mismo?
   *
   * Hace falta para los acordes: el menú de depuración se abre con P+F3, y
   * eso no se puede expresar con un atajo de una sola tecla.
   */
  mantenida(codigo: string): boolean;
  /** ¿Está Alt pulsado? */
  readonly alt: boolean;
  /**
   * Aprieta o suelta una acción desde fuera del teclado: el joystick y el botón
   * de saltar de la pantalla táctil.
   *
   * Va en un estado aparte del teclado y se suman los dos. Si compartieran
   * estado, soltar el joystick soltaría también la D que alguien mantiene con
   * un teclado conectado a la tableta.
   */
  fijar(accion: keyof Acciones, apretada: boolean): void;
  /**
   * Dispara el atajo de una tecla como si se hubiera pulsado.
   *
   * Es lo que hacen los botones de la pantalla táctil: «Mochila» pulsa la E.
   * Así cada acción sigue viviendo en un solo sitio —el atajo— y no hay dos
   * copias de «abrir el inventario» que se puedan separar con el tiempo.
   */
  pulsar(codigo: string): void;
  destruir(): void;
}

export function crearEntrada(objetivo: Window = window): GestorEntrada {
  const mantenido: Acciones = { izq: false, der: false, abajo: false, salto: false };
  /** Lo que aprietan los controles de la pantalla. Se suma al teclado. */
  const virtual: Acciones = { izq: false, der: false, abajo: false, salto: false };
  let saltoPulsado = false;
  const atajos = new Map<string, () => void>();
  /** Todas las teclas pulsadas ahora mismo, para poder leer acordes. */
  const pulsadas = new Set<string>();
  let alt = false;

  const salida: Entrada = {
    izq: false,
    der: false,
    abajo: false,
    salto: false,
    saltoPulsado: false,
  };

  function onDown(e: KeyboardEvent): void {
    if (escribiendo(e.target)) return;
    pulsadas.add(e.code);
    alt = e.altKey;
    const atajo = atajos.get(e.code);
    if (atajo) {
      e.preventDefault();
      atajo();
      return;
    }
    const accion = MAPA[e.code];
    if (!accion) return;
    e.preventDefault();
    if (e.repeat) return;
    if (accion === 'salto' && !mantenido.salto) saltoPulsado = true;
    mantenido[accion] = true;
  }

  /**
   * Soltar una tecla se atiende siempre, se esté escribiendo o no.
   *
   * Si se filtrara igual que al pulsar, correr hacia la derecha y hacer clic en
   * un campo dejaría al jugador corriendo para siempre: la D se pulsó con el
   * foco fuera y se soltó con el foco dentro, y ese soltar no llegaría nunca.
   */
  function onUp(e: KeyboardEvent): void {
    pulsadas.delete(e.code);
    alt = e.altKey;
    const accion = MAPA[e.code];
    if (!accion) return;
    if (!escribiendo(e.target)) e.preventDefault();
    mantenido[accion] = false;
  }

  // Al perder el foco se sueltan todas las teclas: si no, el jugador se queda
  // corriendo solo al volver a la pestaña.
  function onBlur(): void {
    mantenido.izq = mantenido.der = mantenido.abajo = mantenido.salto = false;
    virtual.izq = virtual.der = virtual.abajo = virtual.salto = false;
    saltoPulsado = false;
    pulsadas.clear();
    alt = false;
  }

  objetivo.addEventListener('keydown', onDown);
  objetivo.addEventListener('keyup', onUp);
  objetivo.addEventListener('blur', onBlur);

  return {
    estado() {
      salida.izq = mantenido.izq || virtual.izq;
      salida.der = mantenido.der || virtual.der;
      salida.abajo = mantenido.abajo || virtual.abajo;
      salida.salto = mantenido.salto || virtual.salto;
      salida.saltoPulsado = saltoPulsado;
      return salida;
    },
    fijar(accion, apretada) {
      // El flanco del salto, igual que con la tecla: solo cuenta al pasar de
      // suelto a apretado, y solo si no lo estaba ya por el otro lado.
      if (accion === 'salto' && apretada && !virtual.salto && !mantenido.salto) {
        saltoPulsado = true;
      }
      virtual[accion] = apretada;
    },
    pulsar(codigo) {
      atajos.get(codigo)?.();
    },
    finTick() {
      saltoPulsado = false;
    },
    alPulsar(codigo, fn) {
      atajos.set(codigo, fn);
    },
    mantenida: (codigo) => pulsadas.has(codigo),
    get alt() {
      return alt;
    },
    destruir() {
      objetivo.removeEventListener('keydown', onDown);
      objetivo.removeEventListener('keyup', onUp);
      objetivo.removeEventListener('blur', onBlur);
    },
  };
}

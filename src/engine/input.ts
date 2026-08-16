import type { Entrada } from '../entities/physics';

/**
 * Traduce el teclado a acciones abstractas.
 *
 * El resto del juego no sabe qué teclas existen: solo pregunta por `izq`,
 * `der`, `abajo` y `salto`. Cuando lleguen los controles táctiles (fase 11) se
 * enchufan aquí y nadie más se entera.
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
  destruir(): void;
}

export function crearEntrada(objetivo: Window = window): GestorEntrada {
  const mantenido: Acciones = { izq: false, der: false, abajo: false, salto: false };
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

  function onUp(e: KeyboardEvent): void {
    pulsadas.delete(e.code);
    alt = e.altKey;
    const accion = MAPA[e.code];
    if (!accion) return;
    e.preventDefault();
    mantenido[accion] = false;
  }

  // Al perder el foco se sueltan todas las teclas: si no, el jugador se queda
  // corriendo solo al volver a la pestaña.
  function onBlur(): void {
    mantenido.izq = mantenido.der = mantenido.abajo = mantenido.salto = false;
    saltoPulsado = false;
    pulsadas.clear();
    alt = false;
  }

  objetivo.addEventListener('keydown', onDown);
  objetivo.addEventListener('keyup', onUp);
  objetivo.addEventListener('blur', onBlur);

  return {
    estado() {
      salida.izq = mantenido.izq;
      salida.der = mantenido.der;
      salida.abajo = mantenido.abajo;
      salida.salto = mantenido.salto;
      salida.saltoPulsado = saltoPulsado;
      return salida;
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

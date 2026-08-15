import { MAX_TICKS_POR_FRAME, TICK } from '../core/constants';

export interface Bucle {
  arrancar(): void;
  parar(): void;
  /** Milisegundos del último frame, para el overlay de debug. */
  readonly msFrame: number;
  readonly fps: number;
}

/**
 * Bucle de paso fijo con acumulador.
 *
 * La simulación siempre avanza en trozos de 1/60 s pase lo que pase con el
 * framerate real, así que las físicas son idénticas en un portátil a 144 Hz y
 * en un móvil a 30. El render recibe `alpha`, la fracción de tick pendiente,
 * para interpolar posiciones y que el movimiento no se vea a saltos.
 */
export function crearBucle(
  tick: () => void,
  render: (alpha: number) => void,
): Bucle {
  let corriendo = false;
  let ultimo = 0;
  let acumulador = 0;
  let msFrame = 0;
  let fps = 0;
  let contador = 0;
  let ventana = 0;
  let handle = 0;

  function frame(ahora: number): void {
    if (!corriendo) return;
    handle = requestAnimationFrame(frame);

    // Capado a 250 ms: al volver de otra pestaña no intentamos recuperar
    // minutos de simulación de golpe.
    const dt = Math.min((ahora - ultimo) / 1000, 0.25);
    ultimo = ahora;
    acumulador += dt;

    const t0 = performance.now();

    let pasos = 0;
    while (acumulador >= TICK && pasos < MAX_TICKS_POR_FRAME) {
      tick();
      acumulador -= TICK;
      pasos++;
    }
    if (pasos === MAX_TICKS_POR_FRAME) acumulador = 0;

    render(acumulador / TICK);

    msFrame = performance.now() - t0;
    contador++;
    ventana += dt;
    if (ventana >= 0.5) {
      fps = contador / ventana;
      contador = 0;
      ventana = 0;
    }
  }

  return {
    arrancar() {
      if (corriendo) return;
      corriendo = true;
      ultimo = performance.now();
      acumulador = 0;
      handle = requestAnimationFrame(frame);
    },
    parar() {
      corriendo = false;
      cancelAnimationFrame(handle);
    },
    get msFrame() {
      return msFrame;
    },
    get fps() {
      return fps;
    },
  };
}

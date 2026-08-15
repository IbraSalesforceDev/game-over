/**
 * Puntero del ratón en coordenadas de canvas.
 *
 * Devuelve píxeles del buffer del canvas (ya multiplicados por el DPR), que es
 * el espacio en el que trabaja la cámara. Convertir a tiles es cosa de quien lo
 * use, que es el único que conoce la cámara.
 */
export interface Puntero {
  /** Píxeles del canvas. */
  sx: number;
  sy: number;
  izq: boolean;
  der: boolean;
  dentro: boolean;
  /** Vuelta de la rueda desde la última consulta (-1, 0 o 1 acumulado). */
  rueda: number;
  consumirRueda(): number;
  destruir(): void;
}

export function crearPuntero(lienzo: HTMLCanvasElement): Puntero {
  const p: Puntero = {
    sx: 0,
    sy: 0,
    izq: false,
    der: false,
    dentro: false,
    rueda: 0,
    consumirRueda() {
      const r = p.rueda;
      p.rueda = 0;
      return r;
    },
    destruir() {
      lienzo.removeEventListener('pointermove', onMove);
      lienzo.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      lienzo.removeEventListener('pointerleave', onLeave);
      lienzo.removeEventListener('contextmenu', onMenu);
      lienzo.removeEventListener('wheel', onWheel);
    },
  };

  function actualizarPos(e: PointerEvent): void {
    const r = lienzo.getBoundingClientRect();
    // De píxeles CSS a píxeles del buffer del canvas.
    p.sx = ((e.clientX - r.left) / r.width) * lienzo.width;
    p.sy = ((e.clientY - r.top) / r.height) * lienzo.height;
    p.dentro = true;
  }

  function onMove(e: PointerEvent): void {
    actualizarPos(e);
  }

  function onDown(e: PointerEvent): void {
    actualizarPos(e);
    if (e.button === 0) p.izq = true;
    if (e.button === 2) p.der = true;
  }

  // El "up" se escucha en la ventana: si sueltas fuera del canvas, el botón no
  // se queda pegado.
  function onUp(e: PointerEvent): void {
    if (e.button === 0) p.izq = false;
    if (e.button === 2) p.der = false;
  }

  function onLeave(): void {
    p.dentro = false;
    p.izq = false;
    p.der = false;
  }

  function onMenu(e: Event): void {
    e.preventDefault();
  }

  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    p.rueda += Math.sign(e.deltaY);
  }

  lienzo.addEventListener('pointermove', onMove);
  lienzo.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  lienzo.addEventListener('pointerleave', onLeave);
  lienzo.addEventListener('contextmenu', onMenu);
  lienzo.addEventListener('wheel', onWheel, { passive: false });

  return p;
}

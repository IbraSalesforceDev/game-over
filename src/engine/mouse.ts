import { Pellizco, Toque, type Gesto } from './gesto';

/**
 * Puntero del ratón —o del dedo— en coordenadas de canvas.
 *
 * Devuelve píxeles del buffer del canvas (ya multiplicados por el DPR), que es
 * el espacio en el que trabaja la cámara. Convertir a tiles es cosa de quien lo
 * use, que es el único que conoce la cámara.
 *
 * ## El dedo
 *
 * El resto del juego no sabe que existe: sigue preguntando por `izq` y `der`.
 * Lo que cambia es quién los aprieta. Con ratón, los botones del ratón; con el
 * dedo, `decidirToque` —que mira lo que llevas en la mano— dice qué botón es
 * cada toque, y `Toque` (en `gesto.ts`) lleva la cuenta del tiempo: el pulso
 * mínimo para que un toque rápido no se pierda entre dos ticks, y la espera que
 * separa «abre este cofre» de «pícalo».
 */
export interface Puntero {
  /** Píxeles del canvas. */
  sx: number;
  sy: number;
  readonly izq: boolean;
  readonly der: boolean;
  dentro: boolean;
  /** Vuelta de la rueda desde la última consulta (-1, 0 o 1 acumulado). */
  rueda: number;
  consumirRueda(): number;
  /**
   * Qué botón es un toque en ese punto del canvas. Lo pone el juego, que es
   * quien sabe qué hay en la mano y qué hay debajo; sin él, un toque es un
   * clic izquierdo, que es lo que hacía siempre.
   */
  decidirToque: ((sx: number, sy: number) => Gesto) | null;
  /**
   * Dos dedos sobre el mundo se han separado (+1) o juntado (−1) lo bastante
   * para un escalón de zoom. Lo pone el juego, que es quien sabe hacer zoom.
   */
  alPellizcar: ((paso: 1 | -1) => void) | null;
  /**
   * ¿Lo último que apretó un botón fue un dedo? El juego lo usa para apuntar
   * solo al picar (ver `bloqueEnDireccion`): con ratón se pica exactamente
   * donde se apunta, que es lo que se espera de un ratón.
   */
  readonly porDedo: boolean;
  destruir(): void;
}

export function crearPuntero(lienzo: HTMLCanvasElement): Puntero {
  /** Los botones del ratón, tal cual. */
  let ratonIzq = false;
  let ratonDer = false;
  /** El dedo que está sobre el mundo, si lo hay. Los demás no cuentan. */
  let dedo: number | null = null;
  const toque = new Toque();
  /**
   * Todos los dedos que hay sobre el lienzo, con dónde están. Hace falta para
   * el pellizco: con uno se juega, y con dos se hace zoom.
   */
  const dedos = new Map<number, { x: number; y: number }>();
  const pellizco = new Pellizco();
  let pellizcando = false;
  let porDedo = false;

  const distanciaEntreDedos = (): number => {
    const [a, b] = [...dedos.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const p: Puntero = {
    sx: 0,
    sy: 0,
    get izq() {
      return ratonIzq || toque.botones(performance.now()).izq;
    },
    get der() {
      return ratonDer || toque.botones(performance.now()).der;
    },
    dentro: false,
    rueda: 0,
    consumirRueda() {
      const r = p.rueda;
      p.rueda = 0;
      return r;
    },
    decidirToque: null,
    alPellizcar: null,
    get porDedo() {
      return porDedo;
    },
    destruir() {
      lienzo.removeEventListener('pointermove', onMove);
      lienzo.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
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
    if (e.pointerType === 'touch') {
      if (dedos.has(e.pointerId)) dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pellizcando) {
        const paso = pellizco.mover(distanciaEntreDedos());
        if (paso !== 0) p.alPellizcar?.(paso);
        return;
      }
      // Con el dedo solo cuenta el que se apoyó primero sobre el mundo: el del
      // joystick y el del salto van por sus propios botones, pero un tercer
      // dedo que roce el canvas no puede arrastrar el punto de mira.
      if (e.pointerId !== dedo) return;
    }
    actualizarPos(e);
  }

  function onDown(e: PointerEvent): void {
    porDedo = e.pointerType === 'touch';
    if (e.pointerType === 'touch') {
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (dedos.size === 2) {
        // El segundo dedo sobre el mundo convierte el gesto en un pellizco, y
        // lo que iba a hacer el primero se anula: nadie pellizca para picar,
        // y el bloque que tenía debajo no debería romperse por hacer zoom.
        toque.cancelar();
        dedo = null;
        p.dentro = false;
        pellizcando = true;
        pellizco.empezar(distanciaEntreDedos());
        return;
      }
      if (pellizcando || (dedo !== null && toque.apoyado)) return;
      dedo = e.pointerId;
      actualizarPos(e);
      toque.apoyar(p.decidirToque?.(p.sx, p.sy) ?? 'izq', performance.now());
      return;
    }
    actualizarPos(e);
    if (e.button === 0) ratonIzq = true;
    if (e.button === 2) ratonDer = true;
  }

  // El "up" se escucha en la ventana: si sueltas fuera del canvas, el botón no
  // se queda pegado.
  function onUp(e: PointerEvent): void {
    if (e.pointerType === 'touch') {
      dedos.delete(e.pointerId);
      // El pellizco acaba cuando ya no queda ningún dedo: si acabara con el
      // primero que se levanta, el que se queda empezaría a picar sin querer.
      if (pellizcando) {
        if (dedos.size === 0) {
          pellizcando = false;
          pellizco.terminar();
        }
        return;
      }
      // Solo el dedo del mundo. Sin esta comprobación, levantar el pulgar del
      // joystick dejaba de picar con el otro.
      if (e.pointerId !== dedo) return;
      dedo = null;
      toque.levantar(performance.now());
      // Sin ratón no hay a dónde apuntar cuando no hay dedo: el recuadro se
      // apaga. El pulso mínimo sigue corriendo por su cuenta.
      p.dentro = false;
      return;
    }
    if (e.button === 0) ratonIzq = false;
    if (e.button === 2) ratonDer = false;
  }

  /** El sistema se queda el dedo: no se hace nada de lo que iba a hacer. */
  function onCancel(e: PointerEvent): void {
    if (e.pointerType !== 'touch') return;
    dedos.delete(e.pointerId);
    if (pellizcando && dedos.size === 0) {
      pellizcando = false;
      pellizco.terminar();
    }
    if (e.pointerId !== dedo) return;
    dedo = null;
    toque.cancelar();
    p.dentro = false;
  }

  function onLeave(e: PointerEvent): void {
    // Un dedo «sale» del canvas cada vez que se levanta, y eso ya lo atiende
    // `onUp` con su pulso mínimo. Tratarlo aquí soltaría el botón de golpe y
    // un toque rápido no llegaría a hacer nada.
    if (e.pointerType === 'touch') return;
    p.dentro = false;
    ratonIzq = false;
    ratonDer = false;
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
  window.addEventListener('pointercancel', onCancel);
  lienzo.addEventListener('pointerleave', onLeave);
  lienzo.addEventListener('contextmenu', onMenu);
  lienzo.addEventListener('wheel', onWheel, { passive: false });

  return p;
}

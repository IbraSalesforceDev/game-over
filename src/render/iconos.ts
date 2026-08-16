import { ANTORCHA, COFRE, defTile, HORNO, MESA, YUNQUE } from '../world/tiles';
import {
  CUBO,
  CUBO_AGUA,
  CUBO_LAVA,
  defObjeto,
  esArma,
  esColocable,
  esCristal,
  esHerramienta,
  huecoDe,
  type Hueco,
  IDS_OBJETO,
  NADA,
} from '../items/items';
import { bloque, contexto, contornear, elipse, hash2, lienzo, mezclar, px, tono } from './pixel';

/**
 * Iconos de inventario, dibujados por código.
 *
 * Hasta ahora cada objeto se pintaba como un cuadrado de su color, y el
 * resultado era que el pico de cobre, la espada de cobre y el lingote de cobre
 * eran el mismo cuadrado naranja. Un inventario en el que no se distingue una
 * herramienta de un material a golpe de vista obliga a leer el nombre de cada
 * ranura, que es justo lo que un icono existe para evitar.
 *
 * La forma la manda el tipo y el color lo manda el objeto: así una espada nueva
 * no necesita dibujo propio, solo su entrada en el catálogo.
 */

/** Lado del icono en píxeles. Se amplía por CSS al tamaño de la ranura. */
export const LADO_ICONO = 20;

type Dibujo = (ctx: CanvasRenderingContext2D, ox: number, oy: number, color: string) => void;

/** Bloque en perspectiva: cara superior clara y frontal en sombra. */
const bloqueIcono: Dibujo = (ctx, ox, oy, color) => {
  const t = tono(color, 26, 34);
  bloque(ctx, ox + 2, oy + 4, 16, 14, t);
  // Cara de arriba: una franja más clara que insinúa volumen sin dibujar un
  // cubo isométrico, que a veinte píxeles se convierte en papilla.
  px(ctx, ox + 2, oy + 4, 16, 3, t.claro);
  // Grano, para que dos bloques del mismo color no se vean calcados.
  for (let i = 0; i < 14; i++) {
    const x = ox + 3 + Math.floor(hash2(i, 7) * 14);
    const y = oy + 8 + Math.floor(hash2(i, 13) * 9);
    px(ctx, x, y, 1, 1, hash2(i, 3) > 0.5 ? t.claro : t.oscuro);
  }
};

/** Pico: mango en diagonal y cabeza curva. */
const picoIcono: Dibujo = (ctx, ox, oy, color) => {
  const metal = tono(color, 30, 40);
  const mango = tono('#8a5f33', 22, 28);
  // Mango en diagonal, de abajo-izquierda a arriba-derecha.
  for (let i = 0; i < 13; i++) {
    px(ctx, ox + 4 + i, oy + 16 - i, 2, 2, i % 4 === 0 ? mango.oscuro : mango.base);
  }
  // Cabeza: dos puntas que caen desde el extremo del mango.
  px(ctx, ox + 9, oy + 3, 7, 2, metal.claro);
  px(ctx, ox + 6, oy + 4, 4, 2, metal.base);
  px(ctx, ox + 15, oy + 4, 3, 2, metal.base);
  px(ctx, ox + 4, oy + 5, 3, 2, metal.oscuro);
  px(ctx, ox + 16, oy + 5, 2, 3, metal.oscuro);
  px(ctx, ox + 10, oy + 5, 5, 2, metal.base);
};

/** Espada: hoja vertical, guarda y empuñadura. */
const espadaIcono: Dibujo = (ctx, ox, oy, color) => {
  const metal = tono(color, 34, 44);
  const mango = tono('#5a4028', 20, 22);
  // Hoja, con el filo iluminado en el lado izquierdo.
  px(ctx, ox + 9, oy + 2, 4, 11, metal.base);
  px(ctx, ox + 9, oy + 2, 1, 11, metal.claro);
  px(ctx, ox + 12, oy + 3, 1, 10, metal.oscuro);
  px(ctx, ox + 10, oy + 1, 2, 2, metal.claro); // punta
  // Guarda.
  px(ctx, ox + 6, oy + 13, 10, 2, metal.oscuro);
  px(ctx, ox + 6, oy + 13, 10, 1, metal.base);
  // Empuñadura y pomo.
  px(ctx, ox + 10, oy + 15, 3, 4, mango.base);
  px(ctx, ox + 10, oy + 15, 1, 4, mango.claro);
  px(ctx, ox + 9, oy + 18, 5, 2, metal.base);
};

/** Lingote: un trapecio con brillo, apilado sobre su sombra. */
const lingoteIcono: Dibujo = (ctx, ox, oy, color) => {
  const t = tono(color, 34, 40);
  px(ctx, ox + 3, oy + 12, 14, 5, t.oscuro);
  px(ctx, ox + 4, oy + 9, 12, 4, t.base);
  px(ctx, ox + 5, oy + 8, 10, 2, t.claro);
  px(ctx, ox + 6, oy + 8, 5, 1, '#ffffff');
  px(ctx, ox + 3, oy + 16, 14, 1, mezclar(t.oscuro, '#000000', 0.4));
};

/** Material suelto: tres piedrecitas de tamaños distintos. */
const materialIcono: Dibujo = (ctx, ox, oy, color) => {
  const t = tono(color, 28, 36);
  elipse(ctx, ox + 7, oy + 12, 5, 4.5, t.base);
  elipse(ctx, ox + 6, oy + 11, 3, 2.5, t.claro);
  elipse(ctx, ox + 14, oy + 14, 3.5, 3, t.base);
  elipse(ctx, ox + 13.5, oy + 13, 2, 1.5, t.claro);
  elipse(ctx, ox + 12, oy + 7, 3, 2.6, t.oscuro);
};

/** Cubo: recipiente con asa, lleno o vacío. */
const cuboIcono: Dibujo = (ctx, ox, oy, color) => {
  const metal = tono('#9aa4ad', 26, 36);
  const lleno = color !== defObjeto(CUBO).color;
  // Asa por detrás del cuerpo.
  px(ctx, ox + 5, oy + 3, 1, 4, metal.oscuro);
  px(ctx, ox + 14, oy + 3, 1, 4, metal.oscuro);
  px(ctx, ox + 6, oy + 2, 8, 1, metal.oscuro);
  // Cuerpo troncocónico.
  px(ctx, ox + 4, oy + 6, 12, 3, metal.claro);
  px(ctx, ox + 5, oy + 9, 10, 8, metal.base);
  px(ctx, ox + 6, oy + 17, 8, 1, metal.oscuro);
  px(ctx, ox + 5, oy + 9, 1, 8, metal.claro);
  if (lleno) {
    // El líquido asoma por la boca, con su reflejo.
    px(ctx, ox + 6, oy + 7, 8, 2, color);
    px(ctx, ox + 7, oy + 7, 3, 1, mezclar(color, '#ffffff', 0.45));
  }
};

/** Antorcha: palo, llama y resplandor. */
const antorchaIcono: Dibujo = (ctx, ox, oy) => {
  px(ctx, ox + 9, oy + 9, 3, 10, '#5a4028');
  px(ctx, ox + 9, oy + 9, 1, 10, '#7a5a38');
  elipse(ctx, ox + 10.5, oy + 7, 4, 5, 'rgba(232,140,40,0.35)');
  elipse(ctx, ox + 10.5, oy + 7, 2.6, 3.6, '#e07a1c');
  elipse(ctx, ox + 10.5, oy + 7.5, 1.6, 2.4, '#ffc93c');
  px(ctx, ox + 10, oy + 7, 1, 2, '#fff4c0');
};

/** Mueble: se dibuja con la silueta que le toque, más simple que su tile. */
const mueble: Dibujo = (ctx, ox, oy, color) => {
  const t = tono(color, 24, 32);
  bloque(ctx, ox + 2, oy + 6, 16, 11, t);
  px(ctx, ox + 2, oy + 6, 16, 2, t.claro);
  px(ctx, ox + 4, oy + 17, 3, 3, t.oscuro);
  px(ctx, ox + 13, oy + 17, 3, 3, t.oscuro);
};

/**
 * Cristal de vida: un rombo facetado con un corazón dentro.
 *
 * Es el único objeto del catálogo que sube una estadística para siempre, y por
 * eso no puede parecerse a un montoncito de mineral: hay que reconocerlo en la
 * ranura sin leer el nombre.
 */
const cristalIcono: Dibujo = (ctx, ox, oy, color) => {
  const t = tono(color, 34, 40);
  // Rombo por filas: ancho creciente hasta el centro y decreciente después.
  for (let i = 0; i < 9; i++) {
    const w = 3 + i * 2;
    px(ctx, ox + 10 - w / 2, oy + 2 + i, w, 1, i < 3 ? t.claro : t.base);
  }
  for (let i = 0; i < 8; i++) {
    const w = 17 - i * 2;
    px(ctx, ox + 10 - w / 2, oy + 11 + i, w, 1, t.oscuro);
  }
  // Faceta iluminada del lado izquierdo y destello arriba.
  px(ctx, ox + 6, oy + 6, 2, 6, t.claro);
  px(ctx, ox + 9, oy + 3, 2, 2, '#ffffff');
  // Corazón: dos bultos y una punta, en cuatro píxeles.
  px(ctx, ox + 7, oy + 9, 2, 2, '#ffd6e6');
  px(ctx, ox + 11, oy + 9, 2, 2, '#ffd6e6');
  px(ctx, ox + 8, oy + 10, 4, 2, '#ffd6e6');
  px(ctx, ox + 9, oy + 12, 2, 1, '#ffd6e6');
};

/**
 * Armadura: una silueta distinta por hueco.
 *
 * Tres piezas del mismo metal comparten color, así que si compartieran forma
 * serían tres cuadrados idénticos en la mochila. La silueta es lo único que las
 * distingue de un vistazo.
 */
function armaduraIcono(hueco: Hueco): Dibujo {
  return (ctx, ox, oy, color) => {
    const t = tono(color, 28, 36);
    if (hueco === 'cabeza') {
      // Casco: cúpula con visera y una franja de ventilación.
      bloque(ctx, ox + 4, oy + 4, 12, 8, t);
      px(ctx, ox + 4, oy + 4, 12, 2, t.claro);
      px(ctx, ox + 3, oy + 11, 14, 3, t.base);
      px(ctx, ox + 3, oy + 13, 14, 1, t.oscuro);
      // Ranura de los ojos, en negro: es lo que lo hace un casco y no un cuenco.
      px(ctx, ox + 6, oy + 9, 8, 2, '#14181c');
      px(ctx, ox + 9, oy + 4, 2, 8, t.claro);
      return;
    }
    if (hueco === 'torso') {
      // Peto: hombreras anchas y cintura estrecha.
      bloque(ctx, ox + 2, oy + 4, 16, 4, t);
      bloque(ctx, ox + 4, oy + 7, 12, 9, t);
      px(ctx, ox + 4, oy + 7, 12, 1, t.claro);
      px(ctx, ox + 9, oy + 8, 2, 8, t.claro);
      px(ctx, ox + 5, oy + 15, 10, 2, t.oscuro);
      return;
    }
    // Grebas: dos perneras separadas colgando de una cintura.
    bloque(ctx, ox + 4, oy + 3, 12, 4, t);
    px(ctx, ox + 4, oy + 3, 12, 1, t.claro);
    for (const dx of [4, 11]) {
      bloque(ctx, ox + dx, oy + 7, 5, 10, t);
      px(ctx, ox + dx, oy + 16, 5, 1, t.oscuro);
    }
  };
}

const ICONOS_ARMADURA: Record<Hueco, Dibujo> = {
  cabeza: armaduraIcono('cabeza'),
  torso: armaduraIcono('torso'),
  piernas: armaduraIcono('piernas'),
};

/** Elige el dibujo que le toca a cada objeto. */
function dibujoDe(id: number): Dibujo {
  if (id === ANTORCHA) return antorchaIcono;
  if (id === MESA || id === HORNO || id === YUNQUE || id === COFRE) return mueble;
  if (id === CUBO || id === CUBO_AGUA || id === CUBO_LAVA) return cuboIcono;
  if (esCristal(id)) return cristalIcono;
  const hueco = huecoDe(id);
  if (hueco) return ICONOS_ARMADURA[hueco];
  if (esHerramienta(id)) return picoIcono;
  if (esArma(id)) return espadaIcono;
  if (esColocable(id)) return bloqueIcono;
  // Los lingotes son los únicos materiales con forma propia; el resto —gel,
  // hueso, mineral en bruto— son montoncitos.
  const nombre = defObjeto(id).nombre;
  if (nombre.startsWith('lingote')) return lingoteIcono;
  return materialIcono;
}

export interface Iconos {
  /** Vuelca el icono de un objeto en un canvas ya dimensionado. */
  pintarEn(destino: HTMLCanvasElement, objeto: number): void;
  /** El atlas crudo, por si hace falta dibujar sobre otro contexto. */
  dibujar(
    ctx: CanvasRenderingContext2D,
    objeto: number,
    sx: number,
    sy: number,
    lado: number,
  ): void;
}

export function crearIconos(): Iconos {
  // Un atlas de una fila con todos los objetos del catálogo. Se indexa por
  // posición dentro de `IDS_OBJETO` porque los ids tienen huecos.
  const orden = new Map<number, number>();
  IDS_OBJETO.forEach((id, i) => orden.set(id, i));

  const atlas = lienzo(LADO_ICONO * IDS_OBJETO.length, LADO_ICONO);
  const ctx = contexto(atlas);
  IDS_OBJETO.forEach((id, i) => {
    if (id === NADA) return;
    const ox = i * LADO_ICONO;
    const def = defObjeto(id);
    // Los bloques toman el color de su tile, que es el que se ve en el mundo;
    // el resto, el suyo del catálogo.
    const color = def.tile !== undefined ? defTile(def.tile).color : def.color;
    dibujoDe(id)(ctx, ox, 0, color);
    contornear(ctx, ox, 0, LADO_ICONO, LADO_ICONO, 'rgba(8,10,14,0.8)');
  });

  function dibujar(
    destino: CanvasRenderingContext2D,
    objeto: number,
    sx: number,
    sy: number,
    lado: number,
  ): void {
    const i = orden.get(objeto);
    if (i === undefined) return;
    destino.imageSmoothingEnabled = false;
    destino.drawImage(atlas, i * LADO_ICONO, 0, LADO_ICONO, LADO_ICONO, sx, sy, lado, lado);
  }

  return {
    dibujar,
    pintarEn(destino, objeto) {
      const c = destino.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, destino.width, destino.height);
      dibujar(c, objeto, 0, 0, destino.width);
    },
  };
}

import {
  AIRE,
  COBRE,
  HIERBA,
  HIERRO,
  HOJAS,
  ORO,
  PIEDRA,
  PLATA,
  TIERRA,
  TRONCO,
} from '../tiles';
import { Mundo } from '../world';
import { fractal1D, fractal2D, ruido1D } from './noise';
import { crearRngRico, semillaDeTexto, type Rng } from './rng';

/**
 * Generación de mundo.
 *
 * Está escrita como generador que va cediendo el control entre pasos: así la
 * pantalla de carga puede pintar el progreso de verdad en vez de quedarse
 * congelada mientras el hilo trabaja. Los tests agotan el generador de una
 * tacada con `generarMundo`.
 *
 * Todo depende de la semilla y de nada más: dos generaciones con la misma
 * semilla dan mundos idénticos, tile a tile.
 */

export const TAMANOS = {
  pequeno: { ancho: 1400, alto: 450, nombre: 'pequeño' },
  mediano: { ancho: 2100, alto: 600, nombre: 'mediano' },
} as const;

export type NombreTamano = keyof typeof TAMANOS;

export interface OpcionesGen {
  ancho: number;
  alto: number;
  /** Semilla en texto; se convierte a entero. */
  semilla: string;
}

export interface Progreso {
  pct: number;
  texto: string;
}

export interface ResultadoGen {
  mundo: Mundo;
  spawnTx: number;
  spawnTy: number;
  semilla: string;
  /** Altura de la superficie por columna, útil para depurar y para el spawn. */
  superficie: Int32Array;
}

/** Perfil de capas, en fracciones de la altura del mundo. */
function capas(alto: number) {
  const nivelMar = Math.floor(alto * 0.22);
  return {
    nivelMar,
    /** Amplitud del relieve por encima y por debajo del nivel del mar. */
    amplitud: Math.max(8, Math.floor(alto * 0.05)),
    /** Grosor medio de la capa de tierra bajo la hierba. */
    grosorTierra: Math.max(20, Math.floor(alto * 0.075)),
    /** Primera fila que puede tener cuevas, contada desde la superficie. */
    techoCuevas: 22,
    /** A partir de aquí empieza la caverna: piedra y cuevas grandes. */
    caverna: Math.floor(alto * 0.42),
    /** Filas macizas del fondo del mundo. */
    fondo: alto - 8,
  };
}

/** Altura del terreno en una columna. Menor ty = más alto. */
function alturaSuperficie(tx: number, op: OpcionesGen, semilla: number): number {
  const c = capas(op.alto);
  // Dos escalas: colinas amplias y un rizado fino encima.
  const grande = fractal1D(tx / 220, semilla, { octavas: 3, persistencia: 0.55 });
  const fino = ruido1D(tx / 26, semilla + 77);
  const h = c.nivelMar + (grande - 0.5) * 2 * c.amplitud + (fino - 0.5) * 5;
  return Math.round(h);
}

export function* generarMundoPasos(
  op: OpcionesGen,
): Generator<Progreso, ResultadoGen, void> {
  const semilla = semillaDeTexto(op.semilla);
  const rng = crearRngRico(semilla);
  const mundo = new Mundo(op.ancho, op.alto);
  const c = capas(op.alto);

  // --- 1. Relieve y capas -------------------------------------------------
  yield { pct: 5, texto: 'Levantando el relieve…' };
  const superficie = new Int32Array(op.ancho);
  for (let tx = 0; tx < op.ancho; tx++) {
    superficie[tx] = alturaSuperficie(tx, op, semilla);
  }
  rellenarCapas(mundo, superficie, c, semilla);

  // --- 2. Cuevas ----------------------------------------------------------
  yield { pct: 30, texto: 'Excavando cuevas…' };
  const aire = marcarCuevas(mundo, superficie, c, semilla);
  yield { pct: 48, texto: 'Puliendo las cuevas…' };
  suavizarCuevas(mundo, aire, superficie, c);
  aplicarCuevas(mundo, aire);

  yield { pct: 60, texto: 'Abriendo galerías…' };
  cavarGusanos(mundo, superficie, c, rng);

  // --- 3. Minerales -------------------------------------------------------
  yield { pct: 72, texto: 'Sembrando minerales…' };
  sembrarMinerales(mundo, superficie, c, rng);

  // --- 4. Superficie ------------------------------------------------------
  yield { pct: 84, texto: 'Plantando el bosque…' };
  vestirSuperficie(mundo, superficie, rng, semilla);

  // --- 5. Bordes y remate -------------------------------------------------
  yield { pct: 94, texto: 'Cerrando los bordes…' };
  cerrarBordes(mundo);

  const [spawnTx, spawnTy] = buscarSpawn(mundo, superficie);
  yield { pct: 100, texto: 'Mundo listo' };

  return { mundo, spawnTx, spawnTy, semilla: op.semilla, superficie };
}

/** Agota el generador. Para tests y para usos sin pantalla de carga. */
export function generarMundo(op: OpcionesGen): ResultadoGen {
  const it = generarMundoPasos(op);
  let paso = it.next();
  while (!paso.done) paso = it.next();
  return paso.value;
}

// --- Pasos -------------------------------------------------------------------

type Capas = ReturnType<typeof capas>;

function rellenarCapas(
  mundo: Mundo,
  superficie: Int32Array,
  c: Capas,
  semilla: number,
): void {
  const { ancho, alto } = mundo;
  for (let tx = 0; tx < ancho; tx++) {
    const sup = superficie[tx]!;
    // El grosor de tierra varía por columna: si no, la frontera con la piedra
    // sale como una línea recta que canta muchísimo.
    const grosor = c.grosorTierra + Math.round((ruido1D(tx / 40, semilla + 313) - 0.5) * 14);
    const finTierra = sup + Math.max(4, grosor);

    for (let ty = sup; ty < alto; ty++) {
      mundo.setTile(tx, ty, ty === sup ? HIERBA : ty < finTierra ? TIERRA : PIEDRA);
    }

    // Paredes: empiezan un poco por debajo de la superficie, para que al cavar
    // los primeros tiles se siga viendo el cielo y no una pared plantada.
    for (let ty = sup + 4; ty < alto; ty++) {
      mundo.setPared(tx, ty, ty < finTierra ? TIERRA : PIEDRA);
    }
  }
}

/**
 * Marca las celdas candidatas a cueva con ruido fractal.
 *
 * El umbral se relaja con la profundidad: arriba salen grietas finas y abajo,
 * cavernas grandes, que es el gradiente que hace que bajar merezca la pena.
 */
function marcarCuevas(
  mundo: Mundo,
  superficie: Int32Array,
  c: Capas,
  semilla: number,
): Uint8Array {
  const { ancho, alto } = mundo;
  const aire = new Uint8Array(ancho * alto);
  for (let tx = 0; tx < ancho; tx++) {
    const techo = superficie[tx]! + c.techoCuevas;
    for (let ty = techo; ty < c.fondo; ty++) {
      // Dos regímenes. En el subsuelo, umbral alto: solo grietas sueltas, para
      // que los primeros metros de excavación sean tierra maciza y no un
      // queso. En la caverna, umbral bajo y decreciente: salas grandes que se
      // van abriendo con la profundidad.
      let umbral: number;
      if (ty < c.caverna) {
        umbral = 0.74;
      } else {
        const p = (ty - c.caverna) / Math.max(1, c.fondo - c.caverna);
        umbral = 0.62 - p * 0.09;
      }
      const n = fractal2D(tx / 42, ty / 30, semilla + 991, {
        octavas: 3,
        persistencia: 0.5,
      });
      if (n > umbral) aire[ty * ancho + tx] = 1;
    }
  }
  return aire;
}

/**
 * Autómata celular: cada pasada convierte en roca las celdas de aire rodeadas
 * de roca y viceversa. Convierte una nube de ruido en cuevas con paredes
 * limpias y sin píxeles sueltos.
 */
function suavizarCuevas(
  mundo: Mundo,
  aire: Uint8Array,
  superficie: Int32Array,
  c: Capas,
): void {
  const { ancho } = mundo;
  const copia = new Uint8Array(aire.length);
  for (let paso = 0; paso < 3; paso++) {
    copia.set(aire);
    for (let tx = 1; tx < ancho - 1; tx++) {
      const techo = superficie[tx]! + c.techoCuevas;
      for (let ty = techo + 1; ty < c.fondo - 1; ty++) {
        let vecinos = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (copia[(ty + dy) * ancho + (tx + dx)] === 1) vecinos++;
          }
        }
        const i = ty * ancho + tx;
        // Regla 4-5: con 5 o más vecinos de aire la celda se abre; con 3 o
        // menos se cierra. En medio, se queda como está.
        if (vecinos >= 5) aire[i] = 1;
        else if (vecinos <= 3) aire[i] = 0;
      }
    }
  }
}

function aplicarCuevas(mundo: Mundo, aire: Uint8Array): void {
  const { ancho, alto } = mundo;
  for (let ty = 0; ty < alto; ty++) {
    for (let tx = 0; tx < ancho; tx++) {
      if (aire[ty * ancho + tx] === 1) mundo.setTile(tx, ty, AIRE);
    }
  }
}

/**
 * Túneles "gusano": un punto que avanza girando poco a poco y va vaciando un
 * círculo a su paso. El ruido solo no garantiza que las cuevas se conecten;
 * esto sí, y además da los pasillos largos por los que se explora.
 */
function cavarGusanos(
  mundo: Mundo,
  superficie: Int32Array,
  c: Capas,
  rng: Rng,
): void {
  const cuantos = Math.floor(mundo.ancho / 26);
  for (let g = 0; g < cuantos; g++) {
    let tx = rng.rango(4, mundo.ancho - 4);
    // Los gusanos nacen ya en la caverna: son los pasillos que conectan las
    // salas profundas, no galerías que asomen al jardín.
    const techo = Math.max(superficie[Math.floor(tx)]! + c.techoCuevas, c.caverna - 30);
    let ty = rng.rango(techo, c.fondo - 6);
    let angulo = rng.rango(0, Math.PI * 2);
    const pasos = rng.entero(120, 460);
    const radio = rng.rango(1.6, 3.4);

    for (let p = 0; p < pasos; p++) {
      // Giro suave: un cambio grande de ángulo produce garabatos, no túneles.
      angulo += rng.rango(-0.28, 0.28);
      tx += Math.cos(angulo);
      ty += Math.sin(angulo) * 0.65; // aplastado: se cava más a lo ancho
      if (tx < 3 || tx > mundo.ancho - 4 || ty > c.fondo - 3) break;
      const limite = superficie[Math.floor(tx)]! + c.techoCuevas;
      if (ty < limite) {
        // Rebota hacia abajo en vez de asomar a la superficie.
        ty = limite;
        angulo = Math.abs(angulo);
      }
      vaciarCirculo(mundo, tx, ty, radio + rng.rango(-0.4, 0.6));
    }
  }
}

function vaciarCirculo(mundo: Mundo, cx: number, cy: number, radio: number): void {
  const r = Math.max(1, radio);
  const r2 = r * r;
  for (let ty = Math.floor(cy - r); ty <= Math.ceil(cy + r); ty++) {
    for (let tx = Math.floor(cx - r); tx <= Math.ceil(cx + r); tx++) {
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy <= r2) mundo.setTile(tx, ty, AIRE);
    }
  }
}

/** Vetas de mineral, cada una en su franja de profundidad. */
function sembrarMinerales(
  mundo: Mundo,
  superficie: Int32Array,
  c: Capas,
  rng: Rng,
): void {
  const receta = [
    { id: COBRE, desde: 0.06, hasta: 0.55, densidad: 0.055, tamano: [6, 16] },
    { id: HIERRO, desde: 0.18, hasta: 0.75, densidad: 0.04, tamano: [5, 13] },
    { id: PLATA, desde: 0.42, hasta: 0.92, densidad: 0.024, tamano: [4, 11] },
    { id: ORO, desde: 0.62, hasta: 1.0, densidad: 0.014, tamano: [3, 9] },
  ] as const;

  for (const veta of receta) {
    const cuantas = Math.max(2, Math.floor(mundo.ancho * veta.densidad));
    for (let v = 0; v < cuantas; v++) {
      // Buscar un punto que sea piedra de verdad: una veta que nace dentro de
      // una caverna o en la capa de tierra no llega a plantarse, y sin reintento
      // los minerales más raros pueden no salir en todo el mundo.
      let tx0 = -1;
      let ty0 = -1;
      for (let intento = 0; intento < 24; intento++) {
        const cx = rng.entero(3, mundo.ancho - 4);
        const techo = superficie[cx]! + 6;
        const rango = c.fondo - techo;
        const cy = Math.round(techo + rng.rango(veta.desde, veta.hasta) * rango);
        if (cy <= techo || cy >= c.fondo) continue;
        if (mundo.getTile(cx, cy) !== PIEDRA) continue;
        tx0 = cx;
        ty0 = cy;
        break;
      }
      if (tx0 < 0) continue;

      // Paseo aleatorio corto: las vetas salen alargadas, no como pelotas.
      let tx = tx0;
      let ty = ty0;
      const pasos = rng.entero(veta.tamano[0], veta.tamano[1]);
      for (let p = 0; p < pasos; p++) {
        pintarBlob(mundo, tx, ty, rng.rango(0.8, 1.9), veta.id);
        tx += rng.entero(-1, 1);
        ty += rng.entero(-1, 1);
      }
    }
  }
}

/** Sustituye piedra por mineral en un círculo. No toca el aire ni la tierra. */
function pintarBlob(mundo: Mundo, cx: number, cy: number, radio: number, id: number): void {
  const r2 = radio * radio;
  for (let ty = Math.floor(cy - radio); ty <= Math.ceil(cy + radio); ty++) {
    for (let tx = Math.floor(cx - radio); tx <= Math.ceil(cx + radio); tx++) {
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (mundo.getTile(tx, ty) === PIEDRA) mundo.setTile(tx, ty, id);
    }
  }
}

/** Hierba en el techo del terreno y árboles repartidos por el bosque. */
function vestirSuperficie(
  mundo: Mundo,
  superficie: Int32Array,
  rng: Rng,
  semillaArboles: number,
): void {
  const { ancho, alto } = mundo;

  // La hierba va donde hay tierra con aire justo encima: tras las cuevas y los
  // gusanos, la superficie ya no es la que dijo el relieve.
  for (let tx = 0; tx < ancho; tx++) {
    for (let ty = Math.max(0, superficie[tx]! - 6); ty < alto - 1; ty++) {
      const id = mundo.getTile(tx, ty);
      if (id === AIRE) continue;
      if (id === TIERRA && mundo.getTile(tx, ty - 1) === AIRE) {
        mundo.setTile(tx, ty, HIERBA);
      }
      break;
    }
  }

  let ultimoArbol = -99;
  for (let tx = 3; tx < ancho - 3; tx++) {
    if (tx - ultimoArbol < 5) continue;
    // La densidad ondula a lo largo del mundo: así hay bosquecillos cerrados y
    // claros abiertos, en vez de una hilera regular de árboles hasta el
    // horizonte.
    const espesura = ruido1D(tx / 90, semillaArboles);
    if (!rng.suerte(0.015 + espesura * espesura * 0.16)) continue;

    // Buscar el suelo real de esta columna.
    let ty = Math.max(0, superficie[tx]! - 6);
    while (ty < alto && mundo.getTile(tx, ty) === AIRE) ty++;
    if (mundo.getTile(tx, ty) !== HIERBA) continue;
    // Sin sitio para el tronco, no hay árbol.
    if (mundo.getTile(tx, ty - 1) !== AIRE) continue;

    plantarArbol(mundo, tx, ty - 1, rng);
    ultimoArbol = tx;
  }
}

function plantarArbol(mundo: Mundo, tx: number, tyBase: number, rng: Rng): void {
  const altura = rng.entero(5, 11);
  for (let i = 0; i < altura; i++) {
    const ty = tyBase - i;
    if (ty < 2) return;
    if (mundo.getTile(tx, ty) !== AIRE) return;
    mundo.setTile(tx, ty, TRONCO);
  }

  // Copa: un rombo achatado de hojas sobre la punta del tronco.
  const cy = tyBase - altura;
  const radio = rng.entero(2, 3);
  for (let dy = -radio; dy <= radio - 1; dy++) {
    for (let dx = -radio; dx <= radio; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radio + 1) continue;
      const ty = cy + dy;
      if (ty < 1) continue;
      if (mundo.getTile(tx + dx, ty) === AIRE) mundo.setTile(tx + dx, ty, HOJAS);
    }
  }
}

/** Marco de roca: el mundo no se acaba en un agujero por el que caerse. */
function cerrarBordes(mundo: Mundo): void {
  const { ancho, alto } = mundo;
  mundo.rellenar(0, 0, 1, alto - 1, PIEDRA);
  mundo.rellenar(ancho - 2, 0, ancho - 1, alto - 1, PIEDRA);
  mundo.rellenar(0, alto - 3, ancho - 1, alto - 1, PIEDRA);
}

/**
 * Punto de aparición: la primera columna cerca del centro cuyo suelo tenga
 * hueco despejado por encima. Aparecer dentro de un árbol o en el borde de un
 * barranco es la clase de detalle que arruina el primer minuto de partida.
 */
function buscarSpawn(mundo: Mundo, superficie: Int32Array): [number, number] {
  const centro = Math.floor(mundo.ancho / 2);
  for (let d = 0; d < mundo.ancho / 2; d++) {
    for (const tx of [centro + d, centro - d]) {
      if (tx < 4 || tx >= mundo.ancho - 4) continue;
      let ty = Math.max(0, superficie[tx]! - 8);
      while (ty < mundo.alto && mundo.getTile(tx, ty) === AIRE) ty++;
      if (mundo.getTile(tx, ty) !== HIERBA) continue;
      // Cuatro tiles libres sobre la cabeza y a los lados.
      let libre = true;
      for (let dy = 1; dy <= 4 && libre; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (mundo.getTile(tx + dx, ty - dy) !== AIRE) libre = false;
        }
      }
      if (libre) return [tx, ty - 4];
    }
  }
  return [centro, Math.max(1, superficie[centro]! - 4)];
}

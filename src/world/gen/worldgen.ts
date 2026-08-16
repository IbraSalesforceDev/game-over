import {
  AIRE,
  ARENA,
  ARENISCA,
  CACTUS,
  COBRE,
  CRISTAL_VIDA,
  HIELO,
  HIERBA,
  HIERRO,
  HOJAS,
  NIEVE,
  ORO,
  PIEDRA,
  PLATA,
  TIERRA,
  TRONCO,
} from '../tiles';
import { esSolido } from '../tiles';
import { Mundo } from '../world';
import {
  BOSQUE,
  DESIERTO,
  distanciaAlBorde,
  generarBiomas,
  NIEVE_B,
  type MapaBiomas,
} from './biomas';
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
  /** Bioma de cada columna. */
  biomas: MapaBiomas;
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
  const biomas = generarBiomas(op.ancho, semilla, rng);
  const superficie = new Int32Array(op.ancho);
  for (let tx = 0; tx < op.ancho; tx++) {
    superficie[tx] = alturaSuperficie(tx, op, semilla);
  }
  // El desierto es una hondonada y la nieve una meseta: hundir y levantar el
  // relieve por bioma hace que se noten desde lejos, antes de pisarlos.
  suavizarRelievePorBioma(superficie, biomas);
  rellenarCapas(mundo, superficie, biomas, c, semilla);

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
  sembrarCristales(mundo, superficie, c, rng);

  // --- 4. Líquidos --------------------------------------------------------
  //
  // Antes de vestir la superficie: los lagos cambian el relieve al excavarse, y
  // la hierba y los árboles tienen que ver el terreno ya con su orilla.
  yield { pct: 80, texto: 'Llenando lagos y coladas…' };
  llenarLiquidos(mundo, superficie, biomas, c, rng);

  // --- 5. Superficie ------------------------------------------------------
  yield { pct: 88, texto: 'Plantando el bosque…' };
  vestirSuperficie(mundo, superficie, biomas, rng, semilla);

  // --- 6. Bordes y remate -------------------------------------------------
  yield { pct: 94, texto: 'Cerrando los bordes…' };
  cerrarBordes(mundo);

  const [spawnTx, spawnTy] = buscarSpawn(mundo, superficie);
  yield { pct: 100, texto: 'Mundo listo' };

  return { mundo, spawnTx, spawnTy, semilla: op.semilla, superficie, biomas };
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

/**
 * Hunde el desierto y levanta la nieve, con una transición larga a los lados.
 *
 * La transición importa más que el desnivel: un escalón seco entre bioma y
 * bioma se ve como un fallo de generación, y un talud de treinta columnas se ve
 * como una ladera.
 */
function suavizarRelievePorBioma(superficie: Int32Array, biomas: MapaBiomas): void {
  const ancho = superficie.length;
  const TRANSICION = 30;
  const desnivel = new Float32Array(ancho);
  for (let tx = 0; tx < ancho; tx++) {
    const b = biomas[tx]!;
    desnivel[tx] = b === DESIERTO ? 7 : b === NIEVE_B ? -5 : 0;
  }
  // Media móvil: es la forma más barata de convertir un escalón en una rampa.
  const suave = new Float32Array(ancho);
  let suma = 0;
  for (let tx = 0; tx < ancho + TRANSICION; tx++) {
    if (tx < ancho) suma += desnivel[tx]!;
    if (tx >= TRANSICION) suma -= desnivel[tx - TRANSICION]!;
    const centro = tx - Math.floor(TRANSICION / 2);
    if (centro >= 0 && centro < ancho) suave[centro] = suma / TRANSICION;
  }
  for (let tx = 0; tx < ancho; tx++) {
    superficie[tx] = Math.round(superficie[tx]! + suave[tx]!);
  }
}

/** Suelo, subsuelo y roca de cada bioma. */
function materialesDe(bioma: number): { suelo: number; subsuelo: number; roca: number } {
  if (bioma === DESIERTO) return { suelo: ARENA, subsuelo: ARENA, roca: ARENISCA };
  if (bioma === NIEVE_B) return { suelo: NIEVE, subsuelo: NIEVE, roca: PIEDRA };
  return { suelo: HIERBA, subsuelo: TIERRA, roca: PIEDRA };
}

function rellenarCapas(
  mundo: Mundo,
  superficie: Int32Array,
  biomas: MapaBiomas,
  c: Capas,
  semilla: number,
): void {
  const { ancho, alto } = mundo;
  const borde = distanciaAlBorde(biomas);
  /** Columnas que tarda un bioma en alcanzar todo su grosor. */
  const CUNA = 16;
  for (let tx = 0; tx < ancho; tx++) {
    const sup = superficie[tx]!;
    const bioma = biomas[tx]!;
    const mat = materialesDe(bioma);
    // El bioma entra en cuña: en su primera columna es una costra de un tile y
    // va engordando hacia dentro.
    const cuna = bioma === BOSQUE ? 1 : Math.min(1, borde[tx]! / CUNA);
    // El grosor de tierra varía por columna: si no, la frontera con la piedra
    // sale como una línea recta que canta muchísimo.
    const grosor = c.grosorTierra + Math.round((ruido1D(tx / 40, semilla + 313) - 0.5) * 14);
    const finTierra = sup + Math.max(4, grosor);
    // Hasta dónde llega el material del bioma, ya en cuña.
    const finBioma = sup + Math.max(1, Math.round((finTierra - sup) * cuna));
    // La arenisca y el hielo solo llegan hasta donde llega el bioma: por debajo
    // el mundo vuelve a ser el mismo para todos, que es lo que hace que la
    // caverna sea un sitio único y no tres.
    const finRocaBioma =
      finBioma +
      (bioma === BOSQUE
        ? 0
        : Math.round((26 + (ruido1D(tx / 23, semilla + 877) - 0.5) * 20) * cuna));

    for (let ty = sup; ty < alto; ty++) {
      const id =
        ty === sup
          ? mat.suelo
          : ty < finBioma
            ? mat.subsuelo
            : ty < finRocaBioma
              ? mat.roca
              : ty < finTierra
                ? TIERRA
                : PIEDRA;
      mundo.setTile(tx, ty, id);
    }

    // Vetas de hielo en la nieve: es lo que le da textura al bioma sin
    // necesidad de un tile más.
    if (bioma === NIEVE_B) {
      for (let ty = sup + 2; ty < finBioma; ty++) {
        if (fractal2D(tx / 18, ty / 12, semilla + 4441, { octavas: 2, persistencia: 0.5 }) > 0.66) {
          mundo.setTile(tx, ty, HIELO);
        }
      }
    }

    // Paredes: empiezan un poco por debajo de la superficie, para que al cavar
    // los primeros tiles se siga viendo el cielo y no una pared plantada.
    for (let ty = sup + 4; ty < alto; ty++) {
      mundo.setPared(
        tx,
        ty,
        ty < finBioma
          ? mat.subsuelo
          : ty < finRocaBioma
            ? mat.roca
            : ty < finTierra
              ? TIERRA
              : PIEDRA,
      );
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
    // El hierro sube un poco y se hace más frecuente: es la puerta al yunque, y
    // con ella cerrada toda la rama de herramientas buenas queda fuera de
    // alcance por mala suerte de exploración.
    { id: HIERRO, desde: 0.1, hasta: 0.75, densidad: 0.058, tamano: [6, 15] },
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

/**
 * Cristales de vida en el suelo de las cuevas.
 *
 * No van dentro de la roca como el mineral, sino apoyados en el suelo de una
 * caverna: son la recompensa de explorar, no de excavar a ciegas. Y como
 * iluminan, el que esté al fondo de una galería se ve antes de llegar, que es
 * exactamente el anzuelo que se busca.
 *
 * La densidad es baja a propósito —uno cada cien columnas de mundo— porque cada
 * uno vale un corazón permanente y solo hacen falta cinco para llegar al tope.
 */
function sembrarCristales(
  mundo: Mundo,
  superficie: Int32Array,
  c: Capas,
  rng: Rng,
): void {
  const cuantos = Math.max(6, Math.floor(mundo.ancho / 100));
  let puestos = 0;
  // Muchos más intentos que cristales: la mayoría caen en roca maciza.
  for (let intento = 0; intento < cuantos * 260 && puestos < cuantos; intento++) {
    const tx = rng.entero(4, mundo.ancho - 5);
    // Nunca cerca de la superficie: un cristal a la vista desde el spawn se
    // recoge sin haber bajado a ninguna cueva.
    const techo = superficie[tx]! + 30;
    if (techo >= c.fondo - 4) continue;
    const ty = rng.entero(techo, c.fondo - 3);
    if (mundo.getTile(tx, ty) !== AIRE) continue;
    if (mundo.getTile(tx, ty - 1) !== AIRE) continue;
    if (!esSolido(mundo.getTile(tx, ty + 1))) continue;
    // Ni dentro de un charco: se colocan en seco.
    if (mundo.getLiquido(tx, ty) > 0) continue;
    mundo.setTile(tx, ty, CRISTAL_VIDA);
    puestos++;
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

/** Hierba en el techo del terreno y vegetación propia de cada bioma. */
function vestirSuperficie(
  mundo: Mundo,
  superficie: Int32Array,
  biomas: MapaBiomas,
  rng: Rng,
  semillaArboles: number,
): void {
  const { ancho, alto } = mundo;

  // El suelo va donde hay materia con aire justo encima: tras las cuevas y los
  // gusanos, la superficie ya no es la que dijo el relieve.
  for (let tx = 0; tx < ancho; tx++) {
    const suelo = materialesDe(biomas[tx]!).suelo;
    // En el desierto la arena ya es el suelo y no hay nada que cambiar.
    if (suelo === ARENA) continue;
    for (let ty = Math.max(0, superficie[tx]! - 6); ty < alto - 1; ty++) {
      const id = mundo.getTile(tx, ty);
      if (id === AIRE) continue;
      if ((id === TIERRA || id === NIEVE) && mundo.getTile(tx, ty - 1) === AIRE) {
        mundo.setTile(tx, ty, suelo);
      }
      break;
    }
  }

  let ultimaPlanta = -99;
  for (let tx = 3; tx < ancho - 3; tx++) {
    const bioma = biomas[tx]!;
    const separacion = bioma === DESIERTO ? 4 : 5;
    if (tx - ultimaPlanta < separacion) continue;
    // La densidad ondula a lo largo del mundo: así hay bosquecillos cerrados y
    // claros abiertos, en vez de una hilera regular de árboles hasta el
    // horizonte.
    const espesura = ruido1D(tx / 90, semillaArboles);
    const probabilidad =
      bioma === DESIERTO ? 0.07 : 0.015 + espesura * espesura * (bioma === NIEVE_B ? 0.11 : 0.16);
    if (!rng.suerte(probabilidad)) continue;

    // Buscar el suelo real de esta columna.
    let ty = Math.max(0, superficie[tx]! - 6);
    while (ty < alto && mundo.getTile(tx, ty) === AIRE) ty++;
    const base = mundo.getTile(tx, ty);
    if (base !== materialesDe(bioma).suelo) continue;
    // Sin sitio para el tronco, no hay planta.
    if (mundo.getTile(tx, ty - 1) !== AIRE) continue;
    // Y nada de árboles dentro del lago: la orilla es el sitio, no el fondo.
    if (mundo.getLiquido(tx, ty - 1) > 0) continue;

    if (bioma === DESIERTO) plantarCactus(mundo, tx, ty - 1, rng);
    else plantarArbol(mundo, tx, ty - 1, rng);
    ultimaPlanta = tx;
  }
}

/** Un cactus es un tronco sin copa, con algún brazo. */
function plantarCactus(mundo: Mundo, tx: number, tyBase: number, rng: Rng): void {
  const altura = rng.entero(3, 6);
  for (let i = 0; i < altura; i++) {
    const ty = tyBase - i;
    if (ty < 2 || mundo.getTile(tx, ty) !== AIRE) return;
    mundo.setTile(tx, ty, CACTUS);
    // Un brazo a media altura, a un lado o al otro.
    if (i === altura - 2 && rng.suerte(0.5)) {
      const dx = rng.suerte(0.5) ? 1 : -1;
      if (mundo.getTile(tx + dx, ty) === AIRE) mundo.setTile(tx + dx, ty, CACTUS);
      if (mundo.getTile(tx + dx, ty - 1) === AIRE) mundo.setTile(tx + dx, ty - 1, CACTUS);
    }
  }
}

/**
 * Un árbol con raíces, ramas y copa de varios lóbulos.
 *
 * La versión anterior era un palo de un tile con un rombo de hojas encima, y
 * desde lejos el bosque parecía una valla. Lo que hace que se lea como un árbol
 * son tres cosas, por este orden: que la base se ensanche, que la copa tenga
 * más de un bulto, y que salgan ramas a media altura para romper la vertical.
 */
function plantarArbol(mundo: Mundo, tx: number, tyBase: number, rng: Rng): void {
  // La altura la manda la cámara: se ven unos quince tiles de alto, así que un
  // árbol de catorce deja la copa fuera de pantalla y el jugador solo ve un
  // palo. Entre cinco y nueve cabe entero con su copa.
  const altura = rng.entero(5, 9);
  if (tyBase - altura < 4) return;

  for (let i = 0; i < altura; i++) {
    const ty = tyBase - i;
    if (mundo.getTile(tx, ty) !== AIRE) return;
    mundo.setTile(tx, ty, TRONCO);
  }

  // Ramas: una o dos, en la mitad alta y a lados distintos. Siempre de un solo
  // tile y siempre acabadas en hojas: una rama pelada de dos tiles se lee como
  // el brazo de una farola, no como parte de un árbol.
  const ramas = rng.entero(1, 2);
  let ladoAnterior = 0;
  for (let r = 0; r < ramas; r++) {
    const lado = ladoAnterior === 0 ? (rng.suerte(0.5) ? 1 : -1) : -ladoAnterior;
    ladoAnterior = lado;
    const ty = tyBase - rng.entero(Math.floor(altura * 0.55), altura - 2);
    if (mundo.getTile(tx + lado, ty) !== AIRE) continue;
    mundo.setTile(tx + lado, ty, TRONCO);
    // Dos lóbulos por rama: uno pasado el extremo y otro justo encima. Con uno
    // solo, las hojas quedaban al lado de la rama y no sobre ella, y lo que se
    // veía era un muñón pelado saliendo del tronco: un poste de la luz.
    const r = rng.rango(2.1, 2.8);
    lobuloHojas(mundo, tx + lado * 2, ty, r);
    lobuloHojas(mundo, tx + lado, ty - 2, r * 0.8);
  }

  // Copa: tres lóbulos solapados, uno central y dos algo más bajos a los lados.
  const cy = tyBase - altura;
  const radio = rng.rango(2.8, 4.4);
  lobuloHojas(mundo, tx, cy - 1, radio);
  lobuloHojas(mundo, tx - Math.round(radio * 0.75), cy + 1, radio * 0.72);
  lobuloHojas(mundo, tx + Math.round(radio * 0.75), cy + 1, radio * 0.72);
  // Y un remate arriba, para que la silueta no acabe plana.
  lobuloHojas(mundo, tx + (rng.suerte(0.5) ? 1 : -1), cy - 3, radio * 0.55);
}

/** Bola de hojas. No pisa nada que no sea aire. */
function lobuloHojas(mundo: Mundo, cx: number, cy: number, radio: number): void {
  const r2 = radio * radio;
  for (let dy = Math.floor(-radio); dy <= Math.ceil(radio); dy++) {
    for (let dx = Math.floor(-radio); dx <= Math.ceil(radio); dx++) {
      // Se aplasta un poco en vertical: una copa perfectamente redonda se ve
      // como una piruleta.
      if (dx * dx + dy * dy * 1.35 > r2) continue;
      const ty = cy + dy;
      if (ty < 1 || ty >= mundo.alto) continue;
      if (mundo.getTile(cx + dx, ty) === AIRE) mundo.setTile(cx + dx, ty, HOJAS);
    }
  }
}

/**
 * Lagos en superficie, charcas en las cuevas y lava en el fondo.
 *
 * Todo se llena por inundación desde un punto, con un tope de celdas: así el
 * agua toma la forma del hueco que encuentra —que es lo que hace que un lago
 * parezca excavado por el terreno y no pegado encima— y una cueva conectada con
 * media caverna no acaba anegando el mundo entero.
 */
function llenarLiquidos(
  mundo: Mundo,
  superficie: Int32Array,
  biomas: MapaBiomas,
  c: Capas,
  rng: Rng,
): void {
  // --- Lagos de superficie ---
  //
  // Se excavan, no se buscan: el relieve por ruido casi nunca deja una cuenca
  // lo bastante honda como para que quepa un lago, y un mundo entero sin un
  // charco de agua a la vista deja la mitad de la fase escondida bajo tierra.
  const lagos = Math.max(2, Math.floor(mundo.ancho / 170));
  let ultimoLago = -999;
  for (let i = 0; i < lagos; i++) {
    for (let intento = 0; intento < 40; intento++) {
      const tx = rng.entero(24, mundo.ancho - 25);
      // El desierto no tiene lagos: es lo que lo hace desierto.
      if (biomas[tx] === DESIERTO) continue;
      const radio = rng.entero(7, 15);
      if (Math.abs(tx - ultimoLago) < radio * 3) continue;
      // Ni en una ladera ni en un terreno accidentado: el agua se vería colgada
      // del monte, y la orilla quedaría como un escalón de seis tiles.
      if (!terrenoLlano(superficie, tx, radio)) continue;
      excavarLago(mundo, superficie, tx, radio, rng.entero(4, 7));
      ultimoLago = tx;
      break;
    }
  }

  // --- Charcas subterráneas ---
  const charcas = Math.floor(mundo.ancho / 90);
  for (let i = 0; i < charcas; i++) {
    for (let intento = 0; intento < 30; intento++) {
      const tx = rng.entero(6, mundo.ancho - 7);
      const techo = superficie[tx]! + c.techoCuevas + 10;
      const ty = rng.entero(techo, Math.max(techo + 1, c.caverna + 40));
      if (mundo.getTile(tx, ty) !== AIRE) continue;
      if (!esSolido(mundo.getTile(tx, ty + 1))) continue;
      // Tres tiles de calado como mucho: una charca en el suelo de una cueva,
      // no una columna de agua subiendo por la sala.
      if (inundar(mundo, tx, ty, 90, false, ty - 2, ty + 2) > 8) break;
    }
  }

  // --- Lava del fondo ---
  const coladas = Math.floor(mundo.ancho / 70);
  const inicioLava = Math.floor(c.caverna + (c.fondo - c.caverna) * 0.45);
  for (let i = 0; i < coladas; i++) {
    for (let intento = 0; intento < 30; intento++) {
      const tx = rng.entero(6, mundo.ancho - 7);
      const ty = rng.entero(inicioLava, c.fondo - 4);
      if (mundo.getTile(tx, ty) !== AIRE) continue;
      if (!esSolido(mundo.getTile(tx, ty + 1))) continue;
      if (inundar(mundo, tx, ty, 80, true, ty - 3, ty + 2) > 6) break;
    }
  }
}

/** ¿Todo el hueco del lago, y un poco más, cae dentro de dos tiles de desnivel? */
function terrenoLlano(superficie: Int32Array, tx: number, radio: number): boolean {
  const referencia = superficie[tx]!;
  for (let x = tx - radio - 1; x <= tx + radio + 1; x++) {
    if (x < 0 || x >= superficie.length) return false;
    if (Math.abs(superficie[x]! - referencia) > 2) return false;
  }
  return true;
}

/**
 * Excava una cuenca y la llena de agua.
 *
 * Dos decisiones sostienen todo lo demás. La lámina se pone un tile por debajo
 * del punto más bajo del terreno del hueco, así que ninguna columna de la
 * orilla queda por debajo del agua y el lago no se derrama en cuanto arranca la
 * simulación. Y el fondo baja de tile en tile desde la orilla, en vez de caer
 * de golpe: un lago con paredes verticales de seis tiles no se puede vadear, y
 * lo que parecía una charca se convierte en una trampa.
 */
function excavarLago(
  mundo: Mundo,
  superficie: Int32Array,
  tx: number,
  radio: number,
  hondura: number,
): void {
  // Mayor ty es más bajo: el punto más bajo del hueco es el de mayor ty.
  let masBajo = superficie[tx]!;
  for (let x = tx - radio; x <= tx + radio; x++) masBajo = Math.max(masBajo, superficie[x]!);
  const nivel = masBajo + 1;

  // Se rebaja dos columnas más allá del agua: sin ese remate, la orilla —que
  // sí se ha rebajado hasta el nivel del agua— choca contra el terreno intacto
  // de al lado y deja un escalón de varios tiles justo donde se entra al lago.
  const REMATE = 2;

  for (let x = tx - radio - REMATE; x <= tx + radio + REMATE; x++) {
    if (x < 2 || x >= mundo.ancho - 2) continue;
    // Talud de 45°: la hondura crece un tile por columna desde la orilla hasta
    // llegar al fondo plano del centro, y sube igual de rápido al salir.
    const hondo = Math.min(hondura, radio - Math.abs(x - tx));
    const fondo = nivel + hondo;
    if (fondo <= superficie[x]!) continue;

    for (let y = superficie[x]!; y < fondo; y++) {
      mundo.setTile(x, y, AIRE);
      // Sin pared de fondo: un lago abierto enseña el cielo, no un panel de
      // tierra. Y así el sol llega hasta la arena del fondo.
      mundo.setPared(x, y, AIRE);
      if (y >= nivel) mundo.setLiquido(x, y, 255);
    }
    // El suelo real de la columna baja hasta el fondo del lago.
    superficie[x] = fondo;
  }
}

/**
 * Inunda desde una celda hacia abajo y hacia los lados, como haría el agua.
 *
 * Es una inundación con techo: nunca sube por encima de `limiteArriba`, para
 * que un lago de superficie no trepe por la ladera ni se escape por una grieta
 * hacia una cueva de treinta tiles más abajo. `limiteAbajo` hace lo propio por
 * abajo: sin él, una charca que encuentra una grieta se cuela por ella y lo que
 * queda en el mapa es un hilo vertical de un tile de ancho, no una charca.
 */
function inundar(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  maximo: number,
  lava: boolean,
  limiteArriba: number,
  limiteAbajo = Infinity,
): number {
  const pila: number[] = [ty0 * mundo.ancho + tx0];
  const vistos = new Set<number>(pila);
  let puestas = 0;

  while (pila.length > 0 && puestas < maximo) {
    const i = pila.pop()!;
    const tx = i % mundo.ancho;
    const ty = (i / mundo.ancho) | 0;
    if (!mundo.dentro(tx, ty) || ty < limiteArriba || ty > limiteAbajo) continue;
    if (esSolido(mundo.getTile(tx, ty))) continue;
    if (mundo.getLiquido(tx, ty) > 0) continue;

    mundo.setLiquido(tx, ty, 255, lava);
    puestas++;

    // La pila saca lo último que entró, así que el orden va del revés: abajo se
    // apila el último para ser el primero en salir. El líquido busca el fondo
    // antes de extenderse.
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [-1, 0],
      [0, 1],
    ] as const) {
      const j = (ty + dy) * mundo.ancho + (tx + dx);
      if (vistos.has(j)) continue;
      vistos.add(j);
      pila.push(j);
    }
  }
  return puestas;
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
export function buscarSpawn(
  mundo: Mundo,
  superficie: Int32Array,
  desde?: number,
): [number, number] {
  const centro = desde ?? Math.floor(mundo.ancho / 2);
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

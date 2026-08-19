import {
  AIRE,
  ALTAR,
  ALTAR_BIOMA,
  ANTORCHA,
  ARENISCA,
  BARRO,
  COBALTO,
  COFRE,
  esSolido,
  HIELO,
  LADRILLO,
  LADRILLO_INFERNAL,
  MADERA,
  PIEDRA,
  PINCHOS,
  PLATAFORMA,
  TITANIO,
} from '../tiles';
import {
  CABANA,
  CUEVA_DESIERTO,
  CUEVA_NIEVE,
  FORTALEZA,
  FORTALEZA_INFERNAL,
  esSantuario,
  MINA,
  SANTUARIO_CUEVA,
  SANTUARIO_DESIERTO,
  SANTUARIO_INFIERNO,
  SANTUARIO_JUNGLA,
  SANTUARIO_NIEVE,
  SANTUARIO_PRADERA,
  type Estructura,
  type TipoEstructura,
} from '../estructuras';
import { DESIERTO, JUNGLA, NIEVE_B, type MapaBiomas } from './biomas';
import {
  FLECHA,
  FLECHA_HIERRO,
  FLECHA_HUESO,
  GEL,
  HUESO,
  LINGOTE_HIERRO,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  PAPEL,
  PEDERNAL,
  CARNE_ASADA,
  CRISTAL,
  FLECHA_FUEGO,
  LINGOTE_COBALTO,
  LINGOTE_INFERNITA,
  LINGOTE_TITANIO,
} from '../../items/items';
import { hay, VERSION_ACTUAL } from '../../core/versiones';
import { objetoExisteEn } from '../../items/items';
import type { DatosCofre } from '../contenedores';
import type { Mundo } from '../world';
import type { Rng } from './rng';

/**
 * Estructuras del mundo: la fortaleza, las cabañas y las minas abandonadas.
 *
 * Van en un módulo aparte del relieve porque son otra cosa: el terreno se
 * genera con ruido y sale distinto en cada columna, mientras que una sala es un
 * rectángulo puesto a mano. Mezclarlas con las cuevas habría significado que
 * cada retoque del ruido pudiera comerse media fortaleza sin que nadie se
 * enterara.
 *
 * Las tres se construyen igual: se limpia el hueco —tiles, paredes y líquido—,
 * se levanta la caja y se decora. Limpiar el líquido no es opcional: una sala
 * excavada bajo un lago subterráneo se inunda en el primer tick de simulación,
 * y lo que el jugador encuentra al llegar es una piscina.
 */

export interface ResultadoEstructuras {
  estructuras: Estructura[];
  /** Cofres con su botín ya dentro, para que la partida los adopte. */
  cofres: DatosCofre[];
}

/** Sala de la fortaleza, en tiles. */
const SALA_ANCHO = 11;
const SALA_ALTO = 8;
/**
 * Salas de la fortaleza a lo ancho y a lo alto, sin contar la del altar.
 *
 * De 4×3 a 6×4 en 6.3.0. Con doce salas se recorría entera en menos de un
 * minuto y el altar quedaba a tres saltos de la entrada; con veinticuatro hay
 * que buscarlo, que es lo que convierte la fortaleza en un sitio y no en un
 * pasillo con un jefe al final.
 */
const SALAS_X = 6;
const SALAS_Y = 4;
/** Las de antes de 6.3.0, para que un mundo viejo tenga la fortaleza de su época. */
const SALAS_X_VIEJO = 4;
const SALAS_Y_VIEJO = 3;

/** La sala del altar ocupa el ancho entero y va debajo de las demás. */
const ALTAR_ALTO = 13;
const anchoFortaleza = (sx: number): number => sx * SALA_ANCHO + 1;
const altoFortaleza = (sy: number): number => sy * SALA_ALTO + 1 + ALTAR_ALTO;

/**
 * Levanta todas las estructuras del mundo.
 *
 * Se llama con el terreno ya vestido y los líquidos ya puestos: una fortaleza
 * construida antes de los lagos se llenaría de agua, y una cabaña plantada
 * antes de los árboles acabaría con un roble creciéndole dentro del salón.
 */
export function levantarEstructuras(
  mundo: Mundo,
  superficie: Int32Array,
  caverna: number,
  fondo: number,
  rng: Rng,
  biomas?: MapaBiomas,
  /**
   * Cuánto subsuelo tiene este mundo comparado con uno clásico.
   *
   * Solo lo usan las minas y las cuevas de bioma, que viven abajo: en un mundo
   * hondo la cuenta por columnas las dejaría a la mitad por metro cavado. La
   * fortaleza no escala —hay una y solo una, y eso no depende del tamaño— ni
   * las cabañas, que son de la superficie y la superficie no ha crecido.
   */
  escala = 1,
  /** Techo y suelo del inframundo, si este mundo lo tiene. */
  inframundo?: { techo: number; suelo: number },
  /**
   * Versión del mundo. Decide dos cosas que no se pueden dar por hechas.
   *
   * Una: si hay trampas y salas grandes, que llegaron en 6.3.0 — un mundo de
   * 4.0.0 tiene la fortaleza de 4×3 salas que tenía entonces, sin un solo
   * pincho. Y dos, y más importante: qué puede haber dentro de los cofres.
   *
   * Lo segundo se le pasó a la auditoría porque solo mira tiles, y por ahí se
   * coló al ampliar las tablas de botín: la fortaleza pasó a guardar lingotes
   * de cobalto y flechas de hueso, que son de 5.0.0 y de 5.4.0, y esos cofres
   * los abre igual un mundo de 4.0.0. El botín de un cofre no pasa por el
   * filtro de versión al abrirlo —se adopta tal cual del guardado—, así que hay
   * que filtrarlo aquí, al ponerlo.
   */
  version: string = VERSION_ACTUAL,
): ResultadoEstructuras {
  const salida: ResultadoEstructuras = { estructuras: [], cofres: [] };
  const reforzadas = hay('guarnicionEstructuras', version);
  const ctx: Contexto = {
    version,
    reforzadas,
    trampas: hay('trampas', version),
  };

  construirFortaleza(mundo, superficie, caverna, fondo, rng, salida, ctx);

  // Las cuevas de bioma van antes que las cabañas y las minas para que, si dos
  // quisieran el mismo sitio, gane la que da nombre al lugar.
  if (biomas) {
    const cuantas = Math.max(1, Math.floor((mundo.ancho / 700) * escala));
    for (let i = 0; i < cuantas; i++) {
      excavarCuevaDeBioma(mundo, superficie, biomas, rng, salida, DESIERTO, ctx);
      excavarCuevaDeBioma(mundo, superficie, biomas, rng, salida, NIEVE_B, ctx);
    }
  }

  // Una cabaña cada ochocientas columnas y una mina cada quinientas: las
  // suficientes para que la brújula tenga a qué apuntar mientras se busca la
  // fortaleza, y las pocas suficientes para que encontrar una siga siendo un
  // hallazgo y no parte del paisaje.
  const cabanas = Math.max(1, Math.floor(mundo.ancho / 800));
  for (let i = 0; i < cabanas; i++) {
    construirCabana(mundo, superficie, rng, salida, ctx);
  }
  const minas = Math.max(1, Math.floor((mundo.ancho / 500) * escala));
  for (let i = 0; i < minas; i++) {
    construirMina(mundo, superficie, caverna, fondo, rng, salida, ctx);
  }

  // Y las fortalezas del inframundo, si el mundo llega a tener inframundo.
  if (inframundo) {
    const cuantas = Math.max(1, Math.floor(mundo.ancho / 900));
    for (let i = 0; i < cuantas; i++) {
      levantarFortalezaInfernal(mundo, inframundo.techo, inframundo.suelo, rng, salida, ctx);
    }
  }

  // Y los seis santuarios, si este mundo los conoce. Van los últimos porque son
  // los que más sitio piden.
  if (hay('santuarios', version)) {
    levantarSantuarios(mundo, superficie, caverna, fondo, rng, salida, biomas, inframundo);
  }

  // Y la invariante, al final: cada cofre de la lista tiene que ser un cofre en
  // el mundo.
  //
  // Las estructuras se construyen unas después de otras y ninguna mira lo que
  // hay puesto: una galería que pasa a dieciocho tiles de una cueva de bioma le
  // atraviesa la sala y le borra el cofre, porque `limpiar` deja aire y no
  // pregunta. La lista se quedaba entonces con un cofre en una casilla vacía, y
  // la partida lo adoptaba igual: un contenedor invisible con botín dentro que
  // solo existía en el guardado. Es más barato comprobarlo aquí una vez que
  // hacer que las cuatro estructuras se esquiven entre sí.
  salida.cofres = salida.cofres.filter((c) => mundo.getTile(c.tx, c.ty) === COFRE);

  return salida;
}

// --- Utilidades comunes ------------------------------------------------------

/** Vacía un rectángulo: tile, pared y líquido. Los tres o ninguno. */
function limpiar(mundo: Mundo, tx0: number, ty0: number, tx1: number, ty1: number): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      mundo.setTile(tx, ty, AIRE);
      mundo.setPared(tx, ty, AIRE);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

/** Rellena un rectángulo de bloque y pared a la vez. */
function macizar(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
  id: number,
): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      mundo.setTile(tx, ty, id);
      mundo.setPared(tx, ty, id);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

/** Interior de una sala: aire delante, pared detrás. Es lo que la hace sala. */
function ahuecar(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
  pared: number,
): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      mundo.setTile(tx, ty, AIRE);
      mundo.setPared(tx, ty, pared);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

function anotar(
  salida: ResultadoEstructuras,
  tipo: TipoEstructura,
  tx: number,
  ty: number,
): void {
  salida.estructuras.push({ tipo, tx: Math.round(tx), ty: Math.round(ty) });
}

/**
 * Deja un cofre con su botín.
 *
 * El contenido se genera aquí y no al abrirlo porque el cofre es del mundo, y
 * el mundo se guarda entero: un cofre que decide su botín la primera vez que
 * se abre sería un cofre distinto en cada partida cargada del mismo fichero.
 */
function ponerCofre(
  mundo: Mundo,
  salida: ResultadoEstructuras,
  tx: number,
  ty: number,
  botin: readonly (readonly [number, number])[],
): void {
  if (!mundo.dentro(tx, ty)) return;
  mundo.setTile(tx, ty, COFRE);
  mundo.setLiquido(tx, ty, 0);
  salida.cofres.push({
    tx,
    ty,
    ranuras: botin.map(([objeto, cantidad]) => [objeto, cantidad] as [number, number]),
  });
}

/**
 * Siembra pinchos por el suelo de una sala.
 *
 * En grupos de dos o tres y nunca pegados al cofre: una trampa que cobra por
 * abrir el premio es un impuesto, y lo que se busca es castigar el cruzar la
 * sala sin mirar. Tampoco delante de las puertas, para que no haya forma de
 * entrar sin poder evitarlos.
 */
function sembrarPinchos(
  mundo: Mundo,
  tx0: number,
  ty: number,
  tx1: number,
  rng: Rng,
  probabilidad: number,
): void {
  let tx = tx0 + 1;
  while (tx < tx1 - 1) {
    if (rng.suerte(probabilidad)) {
      const largo = rng.entero(2, 3);
      for (let d = 0; d < largo && tx + d < tx1 - 1; d++) {
        const x = tx + d;
        // Solo sobre suelo firme y solo en aire: un pincho flotando en mitad de
        // la sala se lee como un fallo, y uno dentro del cofre lo tapa.
        if (mundo.getTile(x, ty) !== AIRE) continue;
        if (!esSolido(mundo.getTile(x, ty + 1))) continue;
        mundo.setTile(x, ty, PINCHOS);
      }
      tx += largo + rng.entero(3, 6);
    } else {
      tx += rng.entero(2, 4);
    }
  }
}

/** Lo que hace falta saber de la versión del mundo mientras se construye. */
interface Contexto {
  version: string;
  /** Salas grandes y botín bueno: de 6.3.0 en adelante. */
  reforzadas: boolean;
  /** Pinchos por los suelos. */
  trampas: boolean;
}

/**
 * Tira dos o tres premios de una tabla. Cada uno puede salir una sola vez.
 *
 * Se filtra por versión antes de sortear, no después: quitando después, un
 * cofre de un mundo viejo podía salir vacío porque los dos premios que le
 * tocaron eran de una versión posterior.
 */
function sortearBotin(
  rng: Rng,
  tabla: readonly (readonly [number, number, number])[],
  cuantos: number,
  version: string = VERSION_ACTUAL,
): [number, number][] {
  const disponibles = tabla.filter(([objeto]) => objetoExisteEn(objeto, version));
  const salida: [number, number][] = [];
  for (let i = 0; i < cuantos && disponibles.length > 0; i++) {
    const j = rng.entero(0, disponibles.length - 1);
    const [objeto, min, max] = disponibles[j]!;
    disponibles.splice(j, 1);
    salida.push([objeto, rng.entero(min, max)]);
  }
  return salida;
}

// --- La fortaleza ------------------------------------------------------------

/** Lo que puede haber en un cofre de la fortaleza. */
const BOTIN_FORTALEZA: readonly (readonly [number, number, number])[] = [
  [LINGOTE_ORO, 8, 18],
  [LINGOTE_PLATA, 10, 24],
  [LINGOTE_HIERRO, 14, 30],
  [LINGOTE_COBALTO, 4, 10],
  [FLECHA_HUESO, 20, 45],
  [FLECHA, 40, 90],
  [HUESO, 10, 22],
  [GEL, 25, 60],
  [CRISTAL, 1, 2],
  [CARNE_ASADA, 4, 8],
];

/**
 * La fortaleza: tres pisos de salas y, debajo, la sala del altar.
 *
 * Se pone lejos del centro del mundo porque el jugador aparece en el centro, y
 * una fortaleza a treinta columnas del punto de aparición se encuentra el
 * primer día cavando recto hacia abajo. Que haya que ir a buscarla es la mitad
 * de lo que la hace una fortaleza.
 */
function construirFortaleza(
  mundo: Mundo,
  superficie: Int32Array,
  caverna: number,
  fondo: number,
  rng: Rng,
  salida: ResultadoEstructuras,
  ctx: Contexto,
): void {
  const salasX = ctx.reforzadas ? SALAS_X : SALAS_X_VIEJO;
  const salasY = ctx.reforzadas ? SALAS_Y : SALAS_Y_VIEJO;
  const FORTALEZA_ANCHO = anchoFortaleza(salasX);
  const FORTALEZA_ALTO = altoFortaleza(salasY);
  const centro = mundo.ancho / 2;
  // A un lado o al otro, entre el 25 % y el 42 % del ancho desde el centro.
  const lado = rng.suerte(0.5) ? -1 : 1;
  const tx0 = Math.round(
    centro + lado * rng.rango(mundo.ancho * 0.25, mundo.ancho * 0.42) - FORTALEZA_ANCHO / 2,
  );
  const izquierda = Math.max(6, Math.min(mundo.ancho - FORTALEZA_ANCHO - 6, tx0));

  // En vertical: bien dentro de la caverna, pero sin tocar el fondo macizo ni
  // asomar por una ladera. El techo se mide contra la columna más alta del
  // hueco: si no, en una montaña la fortaleza saldría a la superficie.
  let sup = 0;
  for (let tx = izquierda; tx < izquierda + FORTALEZA_ANCHO; tx++) {
    sup = Math.max(sup, superficie[tx] ?? 0);
  }
  const techoMin = Math.max(caverna, sup + 60);
  const techoMax = fondo - FORTALEZA_ALTO - 10;
  if (techoMax <= techoMin) return;
  const arriba = rng.entero(techoMin, techoMax);

  const derecha = izquierda + FORTALEZA_ANCHO - 1;
  const abajo = arriba + FORTALEZA_ALTO - 1;

  // Caja maciza de ladrillo, y dentro se van abriendo las salas. Construir por
  // resta en vez de por suma es lo que garantiza que no quede ni un hueco de
  // roca colado entre dos salas.
  macizar(mundo, izquierda, arriba, derecha, abajo, LADRILLO);

  // --- Los tres pisos de salas ---
  for (let fila = 0; fila < salasY; fila++) {
    for (let col = 0; col < salasX; col++) {
      const sx0 = izquierda + 1 + col * SALA_ANCHO;
      const sy0 = arriba + 1 + fila * SALA_ALTO;
      const sx1 = sx0 + SALA_ANCHO - 2;
      const sy1 = sy0 + SALA_ALTO - 2;
      ahuecar(mundo, sx0, sy0, sx1, sy1, LADRILLO);

      // Puerta a la sala de la derecha, a ras de suelo: dos tiles de alto, que
      // es justo lo que mide el jugador.
      if (col < salasX - 1) {
        limpiarPuerta(mundo, sx1 + 1, sy1 - 1, sx1 + 1, sy1);
      }
      // Y un hueco al piso de abajo, en una columna de la sala, con plataformas
      // para poder subir. Sin ellas la fortaleza se recorre de arriba abajo y
      // ya no se puede volver.
      if (fila < salasY - 1) {
        const hx = sx0 + rng.entero(1, SALA_ANCHO - 4);
        limpiarPuerta(mundo, hx, sy1 + 1, hx + 1, sy1 + 1);
        mundo.setTile(hx, sy1 + 1, PLATAFORMA);
        mundo.setTile(hx + 1, sy1 + 1, PLATAFORMA);
      }

      // Antorchas pegadas al techo, a los dos lados de la sala.
      mundo.setTile(sx0 + 1, sy0 + 1, ANTORCHA);
      mundo.setTile(sx1 - 1, sy0 + 1, ANTORCHA);

      // Un cofre en algo menos de la mitad de las salas. En todas sería un
      // almacén; en una sola, un capricho del generador.
      if (rng.suerte(0.4)) {
        ponerCofre(
          mundo,
          salida,
          sx0 + rng.entero(2, SALA_ANCHO - 4),
          sy1,
          sortearBotin(rng, BOTIN_FORTALEZA, rng.entero(3, 4), ctx.version),
        );
      } else if (ctx.trampas && rng.suerte(0.55)) {
        // Y pinchos en las salas que no tienen cofre. Nunca en las dos cosas: un
        // premio custodiado por una trampa que no se puede esquivar es un
        // impuesto, no un reto.
        sembrarPinchos(mundo, sx0, sy1, sx1, rng, 0.4);
      }
    }
  }

  // --- La sala del altar ---
  const ay0 = arriba + salasY * SALA_ALTO + 1;
  const ay1 = abajo - 1;
  ahuecar(mundo, izquierda + 1, ay0, derecha - 1, ay1, LADRILLO);
  // Bajada desde el último piso, en el centro.
  const cx = Math.round((izquierda + derecha) / 2);
  limpiarPuerta(mundo, cx - 1, ay0 - 1, cx, ay0 - 1);
  mundo.setTile(cx - 1, ay0 - 1, PLATAFORMA);
  mundo.setTile(cx, ay0 - 1, PLATAFORMA);

  // Pedestal de tres tiles con el altar encima. Va en el centro para que el
  // jefe tenga sitio a los dos lados: una sala en la que solo se puede huir
  // hacia un lado no es una sala de jefe, es un pasillo.
  for (let d = -1; d <= 1; d++) mundo.setTile(cx + d, ay1, LADRILLO);
  mundo.setTile(cx, ay1 - 1, ALTAR);
  // Antorchas escoltándolo, para que se vea entrando desde arriba.
  mundo.setTile(cx - 3, ay1 - 1, ANTORCHA);
  mundo.setTile(cx + 3, ay1 - 1, ANTORCHA);
  // Y pinchos por el suelo de la sala, lejos del pedestal: la pelea con el
  // guardián deja de ser un sitio llano donde solo hay que retroceder.
  if (ctx.trampas) {
    sembrarPinchos(mundo, izquierda + 1, ay1, cx - 5, rng, 0.5);
    sembrarPinchos(mundo, cx + 5, ay1, derecha - 1, rng, 0.5);
  }

  anotar(salida, FORTALEZA, cx, ay1 - 1);
}

/** Abre un hueco de paso sin tocar el líquido de alrededor. */
function limpiarPuerta(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
  pared: number = LADRILLO,
): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      mundo.setTile(tx, ty, AIRE);
      mundo.setPared(tx, ty, pared);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

// --- Cuevas de bioma ---------------------------------------------------------

/** Lo que guarda una cueva de arenisca. */
const BOTIN_DESIERTO: readonly (readonly [number, number, number])[] = [
  [COBALTO, 18, 40],
  [LINGOTE_ORO, 10, 22],
  [LINGOTE_COBALTO, 4, 9],
  [FLECHA_FUEGO, 12, 28],
  [FLECHA, 50, 110],
  [HUESO, 12, 26],
  [CRISTAL, 1, 2],
  [CARNE_ASADA, 4, 9],
];

/** Lo que guarda una cueva helada. */
const BOTIN_NIEVE: readonly (readonly [number, number, number])[] = [
  [TITANIO, 14, 34],
  [LINGOTE_PLATA, 12, 28],
  [LINGOTE_TITANIO, 3, 8],
  [FLECHA_HUESO, 15, 34],
  [FLECHA, 50, 110],
  [PEDERNAL, 10, 24],
  [CRISTAL, 1, 2],
  [GEL, 30, 65],
];

/**
 * Una caverna propia del desierto o de la nieve, con su cofre.
 *
 * Es lo que le faltaba a la profundidad que ganaron los biomas en 5.0.0: bajar
 * setenta tiles dentro de un desierto y encontrarse la misma piedra gris de
 * siempre convertía todo ese subsuelo en un pasillo hacia la caverna. Ahora hay
 * algo que buscar ahí, y es justamente donde salen el cobalto y el titanio en
 * cantidad, así que el desierto y la nieve dejan de ser sitios que se cruzan.
 *
 * La sala se cava con varios lóbulos solapados en vez de con un círculo: una
 * caverna redonda se lee como un agujero hecho con un compás, y tres bultos
 * pegados ya parecen una cueva.
 */
function excavarCuevaDeBioma(
  mundo: Mundo,
  superficie: Int32Array,
  biomas: MapaBiomas,
  rng: Rng,
  salida: ResultadoEstructuras,
  bioma: number,
  ctx: Contexto,
): void {
  const desierto = bioma === DESIERTO;
  const forro = desierto ? ARENISCA : HIELO;
  const botin = desierto ? BOTIN_DESIERTO : BOTIN_NIEVE;
  const tipo = desierto ? CUEVA_DESIERTO : CUEVA_NIEVE;

  for (let intento = 0; intento < 400; intento++) {
    const cx = rng.entero(20, mundo.ancho - 21);
    if (biomas[cx] !== bioma) continue;
    // Bien dentro de la franja: pegada al borde, la mitad de la sala caería en
    // el bosque de al lado y dejaría de ser una cueva del desierto.
    if (biomas[cx - 16] !== bioma || biomas[cx + 16] !== bioma) continue;

    // Dentro del subsuelo propio del bioma, que desde 5.0.0 baja setenta y
    // ocho tiles: por debajo ya es la piedra de todo el mundo.
    const cy = superficie[cx]! + rng.entero(34, 68);
    if (cy >= mundo.alto - 20) continue;

    // De 9-14 a 13-20 en 6.3.0: la sala se cruzaba de dos saltos.
    const radio = ctx.reforzadas ? rng.rango(13, 20) : rng.rango(9, 14);

    // Ni un ladrillo cerca: la fortaleza se construye antes y va en esta misma
    // franja de profundidad, así que una cueva puesta encima le abriría un
    // boquete de veinte tiles en una sala. Vale más renunciar a la cueva.
    if (hayLadrillo(mundo, cx, cy, radio + 5)) continue;

    // Ni pegada a otra cueva: dos salas solapadas se leen como una sola sala
    // grande con dos cofres dentro, que es exactamente lo contrario de lo que
    // se buscaba al repartirlas por el mundo.
    let apinada = false;
    for (const otra of salida.estructuras) {
      if (otra.tipo !== CUEVA_DESIERTO && otra.tipo !== CUEVA_NIEVE) continue;
      if (Math.hypot(otra.tx - cx, otra.ty - cy) < 60) apinada = true;
    }
    if (apinada) continue;

    const lobulos: [number, number, number][] = [[0, 0, radio]];
    for (let i = 0; i < 3; i++) {
      lobulos.push([
        rng.rango(-radio, radio),
        rng.rango(-radio * 0.55, radio * 0.55),
        radio * rng.rango(0.5, 0.8),
      ]);
    }

    // Primero el forro y luego el hueco: se pinta una sala maciza del material
    // del bioma un par de tiles más grande, y después se vacía por dentro. Así
    // la pared tiene grosor y no se ve la piedra gris al primer picotazo.
    for (const [dx, dy, r] of lobulos) {
      forrar(mundo, cx + dx, cy + dy, r + 2.5, forro);
    }
    for (const [dx, dy, r] of lobulos) {
      vaciarLobulo(mundo, cx + dx, cy + dy, r);
    }
    // Y se le pone suelo. `forrar` solo cambia lo que ya era sólido, así que
    // una cueva cavada justo encima de una caverna natural se quedaba sin
    // fondo: la sala desaguaba por un agujero al piso de abajo y el cofre,
    // que busca el primer sólido bajando, acababa fuera de la cueva a la que
    // pertenecía. Se cierra columna a columna en vez de con un rectángulo
    // porque el suelo de la sala es curvo y un rectángulo dejaría un escalón.
    // Hasta donde llega el lóbulo por abajo: aplastado 1,7 en vertical, su
    // media altura es el radio partido por raíz de 1,7, o sea 1,3 largo.
    solar(mundo, cx, cy, Math.ceil(radio) + 4, Math.ceil(radio / 1.3) + 3, forro);

    // El cofre, apoyado en el suelo de la sala.
    const sy = suelo(mundo, cx, cy);
    ponerCofre(mundo, salida, cx, sy, sortearBotin(rng, botin, rng.entero(4, 5), ctx.version));
    // Pinchos a los dos lados del cofre, pero no debajo: hay que cruzar la sala
    // para llegar, y eso es lo que cuesta.
    if (ctx.trampas) {
      sembrarPinchos(mundo, cx - Math.round(radio), sy, cx - 4, rng, 0.45);
      sembrarPinchos(mundo, cx + 4, sy, cx + Math.round(radio), rng, 0.45);
    }

    // Y antorchas escoltándolo. No están por decorar: sin una sola fuente de
    // luz la sala es un rectángulo negro idéntico a la roca sin picar, y el
    // cofre —que es todo el motivo de la cueva— solo se encuentra tropezando
    // con él. La misma licencia que se toma la mina: aquí estuvo alguien antes.
    // Cada antorcha busca el suelo de su propia columna: el de la sala es
    // curvo, y darlas todas por buenas a la altura del cofre las dejaría la
    // mitad flotando y la otra mitad enterradas.
    for (const d of [-4, -2, 2, 4]) {
      const ty = suelo(mundo, cx + d, cy);
      if (ty <= cy || ty >= mundo.alto - 2) continue;
      if (!esSolido(mundo.getTile(cx + d, ty + 1))) continue;
      if (mundo.getTile(cx + d, ty) !== AIRE) continue;
      mundo.setTile(cx + d, ty, ANTORCHA);
    }

    anotar(salida, tipo, cx, cy);
    return;
  }
}

/** ¿Hay algo puesto a mano por el generador dentro de este rectángulo? */
function ocupado(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
): boolean {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = mundo.getTile(tx, ty);
      if (t === COFRE || t === LADRILLO || t === ALTAR) return true;
    }
  }
  return false;
}

/**
 * Cierra el fondo de una sala con el material del bioma.
 *
 * `forrar` solo cambia lo que ya era sólido, así que una cueva cavada sobre una
 * caverna natural se quedaba sin fondo: la sala desaguaba al piso de abajo y el
 * cofre, que busca el primer sólido bajando, acababa fuera de la cueva a la que
 * pertenecía. En el peor caso —una sima justo debajo— la sala no tenía suelo en
 * veinte tiles y no se leía como sala, sino como un tramo más de la caverna.
 *
 * Por eso el suelo se pone siempre y a una profundidad acotada: se baja como
 * mucho hasta donde acaba la propia sala, y ahí se cierra caiga lo que caiga.
 * Dos tiles de grosor, porque con uno el primer picotazo del jugador reabre el
 * agujero que se estaba tapando.
 */
function solar(mundo: Mundo, cx: number, cy: number, alcance: number, hondo: number, id: number): void {
  for (let dx = -alcance; dx <= alcance; dx++) {
    const tx = cx + dx;
    if (!mundo.dentro(tx, cy)) continue;
    if (mundo.getTile(tx, cy) !== AIRE) continue;
    let ty = cy;
    const limite = Math.min(mundo.alto - 3, cy + hondo);
    while (ty < limite && mundo.getTile(tx, ty + 1) === AIRE) ty++;
    if (esSolido(mundo.getTile(tx, ty + 1))) continue;
    mundo.setTile(tx, ty + 1, id);
    mundo.setTile(tx, ty + 2, id);
    mundo.setLiquido(tx, ty + 1, 0);
    mundo.setLiquido(tx, ty + 2, 0);
  }
}

/** Primer tile con suelo firme debajo, bajando desde un punto. */
function suelo(mundo: Mundo, tx: number, ty0: number): number {
  let ty = ty0;
  while (ty < mundo.alto - 2 && !esSolido(mundo.getTile(tx, ty + 1))) ty++;
  return ty;
}

/** ¿Hay obra hecha por el generador en este cuadrado? */
function hayLadrillo(mundo: Mundo, cx: number, cy: number, radio: number): boolean {
  const r = Math.ceil(radio);
  for (let ty = cy - r; ty <= cy + r; ty++) {
    for (let tx = cx - r; tx <= cx + r; tx++) {
      if (!mundo.dentro(tx, ty)) continue;
      const t = mundo.getTile(tx, ty);
      if (t === LADRILLO || t === ALTAR) return true;
      if (mundo.getPared(tx, ty) === LADRILLO) return true;
    }
  }
  return false;
}

/** Sustituye por el material del bioma todo lo sólido de un círculo. */
function forrar(mundo: Mundo, cx: number, cy: number, radio: number, id: number): void {
  const r2 = radio * radio;
  for (let ty = Math.floor(cy - radio); ty <= Math.ceil(cy + radio); ty++) {
    for (let tx = Math.floor(cx - radio); tx <= Math.ceil(cx + radio); tx++) {
      const dx = tx - cx;
      const dy = ty - cy;
      if (dx * dx + dy * dy > r2) continue;
      if (!mundo.dentro(tx, ty)) continue;
      if (esSolido(mundo.getTile(tx, ty))) mundo.setTile(tx, ty, id);
      mundo.setPared(tx, ty, id);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

/** Vacía un círculo dejando la pared puesta: el interior de la sala. */
function vaciarLobulo(mundo: Mundo, cx: number, cy: number, radio: number): void {
  const r2 = radio * radio;
  for (let ty = Math.floor(cy - radio); ty <= Math.ceil(cy + radio); ty++) {
    for (let tx = Math.floor(cx - radio); tx <= Math.ceil(cx + radio); tx++) {
      const dx = tx - cx;
      // Aplastada en vertical: una sala más ancha que alta se recorre andando.
      if (dx * dx + (ty - cy) * (ty - cy) * 1.7 > r2) continue;
      if (!mundo.dentro(tx, ty)) continue;
      mundo.setTile(tx, ty, AIRE);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

// --- La fortaleza infernal ---------------------------------------------------

/** Lo que guarda un cofre del inframundo. Lo mejor que hay fuera del jefe. */
const BOTIN_INFERNAL: readonly (readonly [number, number, number])[] = [
  [LINGOTE_INFERNITA, 6, 14],
  [LINGOTE_TITANIO, 8, 18],
  [LINGOTE_COBALTO, 8, 18],
  [FLECHA_FUEGO, 20, 45],
  [CRISTAL, 2, 3],
  [CARNE_ASADA, 6, 12],
  [HUESO, 15, 30],
];

/** Alto y ancho de una sala de la fortaleza infernal, en tiles. */
const SALA_INF_ANCHO = 13;
const SALA_INF_ALTO = 7;

/**
 * Una fortaleza del inframundo: un bloque de salas sobre la repisa.
 *
 * Se apoya en el suelo en vez de colgar en mitad del aire, y no por realismo
 * sino porque es la única forma de que se llegue a ella andando. Una fortaleza
 * flotando sobre el mar de lava solo la visita quien ya tiene con qué volar, y
 * entonces deja de ser el premio de haber bajado hasta aquí.
 *
 * Va abierta por delante —sin puerta ni muro exterior en la cara que da al
 * paso— porque cerrarla obligaría a picar ladrillo infernal, que pide un pico
 * de nivel seis, y ese pico se fabrica justamente con lo que hay dentro. Una
 * cerradura cuya llave está dentro de la caja no es un reto, es un muro.
 */
function levantarFortalezaInfernal(
  mundo: Mundo,
  techo: number,
  suelo: number,
  rng: Rng,
  salida: ResultadoEstructuras,
  ctx: Contexto,
): void {
  // De 2-4 a 3-5 salas en 6.3.0.
  const salas = ctx.reforzadas ? rng.entero(3, 5) : rng.entero(2, 4);
  const ancho = salas * SALA_INF_ANCHO + 1;
  const pisos = rng.entero(2, 3);
  const alto = pisos * SALA_INF_ALTO + 1;

  for (let intento = 0; intento < 300; intento++) {
    const tx = rng.entero(8, mundo.ancho - ancho - 9);

    // Se busca la repisa: el primer suelo firme bajando desde el techo del
    // inframundo, y que además tenga aire encima para que quepa la fortaleza.
    let base = -1;
    for (let ty = techo + 6; ty < suelo - 4; ty++) {
      if (mundo.getTile(tx, ty) !== AIRE) continue;
      if (!esSolido(mundo.getTile(tx, ty + 1))) continue;
      base = ty;
      break;
    }
    if (base < 0 || base - alto <= techo + 2) continue;

    // Ni encima de otra fortaleza. Miden hasta cincuenta y tres columnas, así
    // que dos a dieciocho de distancia no son dos fortalezas: son una sola con
    // las paredes cruzadas por dentro y el doble de cofres apiñados.
    let pegada = false;
    for (const otra of salida.estructuras) {
      if (otra.tipo !== FORTALEZA_INFERNAL) continue;
      if (Math.abs(otra.tx - (tx + ancho / 2)) < ancho + 30) pegada = true;
    }
    if (pegada) continue;

    // Y que la repisa aguante todo el ancho: media fortaleza en voladizo sobre
    // el mar es media fortaleza a la que no se puede entrar.
    let firme = 0;
    for (let d = 0; d < ancho; d++) {
      if (esSolido(mundo.getTile(tx + d, base + 1))) firme++;
    }
    if (firme < ancho * 0.8) continue;
    // Ni encima de la lava, aunque haya suelo: la sala se inundaría al primer
    // tick de simulación y lo que se encuentra al llegar es una piscina.
    let mojado = false;
    for (let d = 0; d < ancho && !mojado; d++) {
      for (let y = base - alto; y <= base + 1; y++) {
        if (mundo.getLiquido(tx + d, y) > 0) mojado = true;
      }
    }
    if (mojado) continue;

    const arriba = base - alto + 1;
    const derecha = tx + ancho - 1;

    // Caja maciza y salas abiertas por resta, igual que la fortaleza de la
    // caverna: construir por suma deja huecos de roca colados entre sala y sala.
    macizar(mundo, tx, arriba, derecha, base, LADRILLO_INFERNAL);
    for (let piso = 0; piso < pisos; piso++) {
      for (let col = 0; col < salas; col++) {
        const sx0 = tx + 1 + col * SALA_INF_ANCHO;
        const sy0 = arriba + 1 + piso * SALA_INF_ALTO;
        const sx1 = sx0 + SALA_INF_ANCHO - 2;
        const sy1 = sy0 + SALA_INF_ALTO - 2;
        ahuecar(mundo, sx0, sy0, sx1, sy1, LADRILLO_INFERNAL);
        // Paso a la sala de al lado, a ras de suelo.
        if (col < salas - 1) limpiarPuerta(mundo, sx1 + 1, sy1 - 1, sx1 + 1, sy1, LADRILLO_INFERNAL);
        // Y hueco al piso de abajo con plataformas para poder volver a subir.
        if (piso < pisos - 1) {
          const hx = sx0 + rng.entero(1, SALA_INF_ANCHO - 4);
          limpiarPuerta(mundo, hx, sy1 + 1, hx + 1, sy1 + 1, LADRILLO_INFERNAL);
          mundo.setTile(hx, sy1 + 1, PLATAFORMA);
          mundo.setTile(hx + 1, sy1 + 1, PLATAFORMA);
        }
        // Un cofre en poco menos de la mitad de las salas, y pinchos en las
        // que no lo tienen.
        if (rng.suerte(0.45)) {
          ponerCofre(
            mundo,
            salida,
            sx0 + rng.entero(2, SALA_INF_ANCHO - 4),
            sy1,
            sortearBotin(rng, BOTIN_INFERNAL, rng.entero(3, 4), ctx.version),
          );
        } else if (ctx.trampas) {
          sembrarPinchos(mundo, sx0, sy1, sx1, rng, 0.5);
        }
      }
    }

    // La entrada: se abre la pared del piso de abajo por los dos lados. El
    // ladrillo infernal pide un pico que se fabrica con lo que hay dentro, así
    // que dejarla cerrada sería una cerradura con la llave dentro de la caja.
    const syAbajo = arriba + 1 + (pisos - 1) * SALA_INF_ALTO;
    for (const x of [tx, derecha]) {
      limpiarPuerta(mundo, x, base - 2, x, base - 1, LADRILLO_INFERNAL);
    }
    void syAbajo;

    anotar(salida, FORTALEZA_INFERNAL, tx + ancho / 2, base - 2);
    return;
  }
}

// --- La cabaña ---------------------------------------------------------------

const BOTIN_CABANA: readonly (readonly [number, number, number])[] = [
  [MADERA, 15, 40],
  [PAPEL, 2, 6],
  [FLECHA, 10, 25],
  [CARNE_ASADA, 1, 3],
  [PEDERNAL, 2, 5],
  [LINGOTE_HIERRO, 2, 5],
];

/**
 * Cabaña abandonada en la superficie: cuatro paredes, un tejado y un cofre.
 *
 * Existe por dos razones. Una, dar algo que encontrar sin bajar a la caverna,
 * para que la brújula sirva desde el primer día. Y dos, que la fortaleza no
 * sea la única cosa construida del mundo: un mundo con una sola estructura
 * hace que esa estructura parezca puesta por error.
 */
function construirCabana(
  mundo: Mundo,
  superficie: Int32Array,
  rng: Rng,
  salida: ResultadoEstructuras,
  ctx: Contexto,
): void {
  const ancho = rng.entero(9, 13);
  const alto = 6;

  for (let intento = 0; intento < 200; intento++) {
    const tx = rng.entero(10, mundo.ancho - ancho - 10);
    // Terreno llano: una cabaña en una ladera queda con medio salón al aire.
    const base = superficie[tx]!;
    let llano = true;
    for (let d = 0; d < ancho && llano; d++) {
      if (Math.abs((superficie[tx + d] ?? base) - base) > 1) llano = false;
    }
    if (!llano) continue;
    // Ni con los pies en el agua.
    if (mundo.getLiquido(tx, base - 1) > 0 || mundo.getLiquido(tx + ancho - 1, base - 1) > 0) {
      continue;
    }

    const suelo = base - 1;
    const techo = suelo - alto + 1;
    // Se despeja también un tile por encima y a los lados: si no, un árbol
    // vecino deja media copa metida dentro de la casa.
    limpiar(mundo, tx - 1, techo - 1, tx + ancho, suelo);

    // Paredes, suelo y tejado de madera. La pared de fondo va en todo el
    // interior: es lo que hace que se lea como una habitación y no como un
    // marco de tablones flotando en el cielo.
    for (let d = 0; d < ancho; d++) {
      mundo.setTile(tx + d, techo, MADERA);
      mundo.setTile(tx + d, suelo, MADERA);
    }
    for (let y = techo; y <= suelo; y++) {
      mundo.setTile(tx, y, MADERA);
      mundo.setTile(tx + ancho - 1, y, MADERA);
      for (let d = 1; d < ancho - 1; d++) mundo.setPared(tx + d, y, MADERA);
    }
    // Puerta: un hueco de dos tiles en una de las paredes cortas.
    const puerta = rng.suerte(0.5) ? tx : tx + ancho - 1;
    mundo.setTile(puerta, suelo - 1, AIRE);
    mundo.setTile(puerta, suelo - 2, AIRE);

    mundo.setTile(tx + 2, techo + 1, ANTORCHA);
    ponerCofre(
      mundo,
      salida,
      tx + ancho - 3,
      suelo - 1,
      sortearBotin(rng, BOTIN_CABANA, rng.entero(2, 3), ctx.version),
    );

    anotar(salida, CABANA, tx + ancho / 2, suelo - 2);
    return;
  }
}

// --- La mina abandonada ------------------------------------------------------

const BOTIN_MINA: readonly (readonly [number, number, number])[] = [
  [LINGOTE_HIERRO, 8, 16],
  [LINGOTE_PLATA, 6, 14],
  [FLECHA_HIERRO, 12, 28],
  [FLECHA, 30, 70],
  [PEDERNAL, 8, 18],
  [GEL, 18, 40],
  [CRISTAL, 1, 2],
  [CARNE_ASADA, 2, 5],
];

/**
 * Mina abandonada: una galería recta con entibado de madera.
 *
 * Es la estructura barata del juego —un pasillo, unos postes y un cofre— y
 * cumple justo lo que tiene que cumplir: al cavar en la caverna, encontrarse
 * de golpe con un túnel de paredes rectas y vigas dice que ahí estuvo alguien
 * antes. Ese es todo el efecto que se busca.
 */
function construirMina(
  mundo: Mundo,
  superficie: Int32Array,
  caverna: number,
  fondo: number,
  rng: Rng,
  salida: ResultadoEstructuras,
  ctx: Contexto,
): void {
  // De 26-46 a 44-78 en 6.3.0: una galería que se recorre en diez segundos no
  // llega a sentirse como una mina abandonada.
  const largo = ctx.reforzadas ? rng.entero(44, 78) : rng.entero(26, 46);
  const alto = 4;

  for (let intento = 0; intento < 120; intento++) {
    const tx = rng.entero(8, Math.max(9, mundo.ancho - largo - 8));
    const techoMin = Math.max(caverna - 30, (superficie[tx] ?? 0) + 40);
    const techoMax = fondo - alto - 8;
    if (techoMax <= techoMin) return;
    const ty = rng.entero(techoMin, techoMax);
    // Que arranque en roca: una galería que nace dentro de una caverna ya
    // abierta no se distingue de la caverna.
    if (!esSolido(mundo.getTile(tx, ty + alto))) continue;
    // Y que no atraviese nada de lo ya construido. La mina se cava la última y
    // `limpiar` deja aire sin preguntar: sin esto, una galería que pasa cerca
    // de una cueva de bioma le borra el cofre y de la fortaleza le abre una
    // pared. Se comprueba el pasillo entero antes de tocar un solo tile.
    if (ocupado(mundo, tx, ty, tx + largo - 1, ty + alto)) continue;

    for (let d = 0; d < largo; d++) {
      const x = tx + d;
      limpiar(mundo, x, ty, x, ty + alto - 1);
      for (let y = ty; y < ty + alto; y++) mundo.setPared(x, y, PIEDRA);
      // Suelo firme: sin esto la galería puede quedar colgada sobre una cueva.
      if (!esSolido(mundo.getTile(x, ty + alto))) mundo.setTile(x, ty + alto, PIEDRA);
      // Entibado cada cinco tiles: una viga cruzando el techo. Solo el techo,
      // nunca el suelo: un poste macizo en mitad de una galería de cuatro
      // tiles la corta en dos, y lo que se quería era decorarla, no cerrarla.
      if (d % 5 === 0 && d > 0 && d < largo - 1) mundo.setTile(x, ty, MADERA);
      else if (d % 11 === 4) mundo.setTile(x, ty, ANTORCHA);
    }

    // Dos cofres en las galerías largas, uno en las cortas.
    const cofres = largo > 60 ? 2 : 1;
    for (let k = 0; k < cofres; k++) {
      ponerCofre(
        mundo,
        salida,
        tx + rng.entero(4 + k * Math.floor(largo / 2), Math.min(largo - 5, (k + 1) * Math.floor(largo / 2))),
        ty + alto - 1,
        sortearBotin(rng, BOTIN_MINA, rng.entero(2, 3), ctx.version),
      );
    }
    // Y pinchos por el suelo: la galería es recta y se cruza corriendo, que es
    // justo lo que una trampa tiene que castigar.
    if (ctx.trampas) sembrarPinchos(mundo, tx + 2, ty + alto - 1, tx + largo - 2, rng, 0.28);

    anotar(salida, MINA, tx + largo / 2, ty + alto - 1);
    return;
  }
}

// --- Los seis santuarios -----------------------------------------------------

/**
 * Un santuario: una explanada con el altar de su jefe en el centro.
 *
 * Es la respuesta a que seis de los siete jefes del juego no tuvieran sitio. El
 * guardián tiene su fortaleza desde el principio; los de bioma se llamaban de
 * pie en cualquier parte y se peleaba donde cayera, muchas veces en una ladera
 * con árboles por medio.
 *
 * La forma es la misma en los seis y solo cambia el material, y eso es
 * deliberado: lo que tiene que reconocerse de lejos es el rito —una plataforma
 * despejada, cuatro columnas y una luz morada en medio—, no seis arquitecturas
 * distintas que habría que aprender una a una. El bioma ya pone el color.
 *
 * Se despeja de verdad, hasta el techo. Un jefe que aparece en un claro con dos
 * robles dentro se queda enganchado en las copas, y la mitad de la pelea es
 * mirar cómo intenta rodear un tronco.
 */
const SANTUARIO_RADIO = 11;
const SANTUARIO_ALTO = 14;

function levantarSantuario(
  mundo: Mundo,
  cx: number,
  cy: number,
  material: number,
  tipo: TipoEstructura,
  salida: ResultadoEstructuras,
): void {
  const tx0 = cx - SANTUARIO_RADIO;
  const tx1 = cx + SANTUARIO_RADIO;
  const suelo = cy;
  const techo = suelo - SANTUARIO_ALTO;

  limpiar(mundo, tx0 - 1, techo, tx1 + 1, suelo);

  // El suelo, macizo y de una pieza: es lo que hace que la pelea pase aquí y no
  // en el agujero que se abre al primer golpe. Y se rellena hacia abajo hasta
  // dar con terreno: en una ladera, una plataforma de tres tiles se quedaría
  // flotando con medio santuario al aire.
  for (let tx = tx0; tx <= tx1; tx++) {
    for (let d = 0; d < 3; d++) mundo.setTile(tx, suelo + d, material);
    for (let d = 3; d < 14 && !esSolido(mundo.getTile(tx, suelo + d)); d++) {
      mundo.setTile(tx, suelo + d, material);
    }
    mundo.setPared(tx, suelo - 1, material);
  }

  // Cuatro columnas, dos a cada lado, con su antorcha arriba. No cierran el
  // recinto —un jefe encerrado con el jugador dentro no es una arena, es una
  // trampa— sino que lo enmarcan.
  for (const dx of [-SANTUARIO_RADIO, -SANTUARIO_RADIO + 4, SANTUARIO_RADIO - 4, SANTUARIO_RADIO]) {
    const tx = cx + dx;
    for (let dy = 1; dy <= 5; dy++) mundo.setTile(tx, suelo - dy, material);
    mundo.setTile(tx, suelo - 6, ANTORCHA);
  }

  // Y el altar, sobre un pedestal de dos tiles para que se vea desde lejos.
  mundo.setTile(cx, suelo - 1, material);
  mundo.setTile(cx, suelo - 2, ALTAR_BIOMA);
  mundo.setLiquido(cx, suelo - 2, 0);

  anotar(salida, tipo, cx, suelo - 2);
}

/**
 * ¿Cabe un santuario aquí sin comerse otra estructura?
 *
 * `holgura` es lo que se le exige de distancia a lo que ya está puesto, y baja
 * en los intentos siguientes. Preferir un santuario a cuarenta tiles de una
 * mina antes que quedarse sin santuario no es una concesión: sin él, el jefe de
 * ese bioma vuelve a no tener sitio, que es justo lo que se venía a arreglar.
 */
function sitioLibre(
  mundo: Mundo,
  salida: ResultadoEstructuras,
  cx: number,
  cy: number,
  holgura: number,
): boolean {
  if (cx - SANTUARIO_RADIO < 5 || cx + SANTUARIO_RADIO >= mundo.ancho - 5) return false;
  if (cy - SANTUARIO_ALTO < 3 || cy + 14 >= mundo.alto - 3) return false;
  // Ni encima de la fortaleza: va antes y una explanada encima le abriría un
  // boquete de veintitrés tiles en una sala.
  if (hayLadrillo(mundo, cx, cy, SANTUARIO_RADIO + 6)) return false;
  for (const otra of salida.estructuras) {
    // Entre santuarios se guarda más: dos explanadas contiguas se leen como una
    // sola con dos altares, y entonces no hay seis sitios sino uno.
    const pide = esSantuario(otra.tipo) ? Math.max(holgura, 70) : holgura;
    if (Math.hypot(otra.tx - cx, otra.ty - cy) < pide) return false;
  }
  return true;
}

/**
 * El de un bioma de superficie.
 *
 * Va en tres pasadas cada vez menos exigentes, y el motivo es que la primera
 * fallaba demasiado: pedir a la vez bioma en los dos extremos, veintitrés
 * columnas llanas y setenta tiles de despeje dejaba sin santuario al desierto o
 * a la nieve en la mitad de las semillas. Un santuario en una ladera aterrazada
 * es peor que uno en un llano; ninguno es mucho peor que los dos.
 */
function santuarioDeSuperficie(
  mundo: Mundo,
  superficie: Int32Array,
  biomas: MapaBiomas | undefined,
  bioma: number | null,
  material: number,
  tipo: TipoEstructura,
  rng: Rng,
  salida: ResultadoEstructuras,
): void {
  const pasadas = [
    { bordes: true, desnivel: 2, holgura: 70 },
    { bordes: false, desnivel: 5, holgura: 45 },
    { bordes: false, desnivel: 99, holgura: 30 },
  ];
  for (const pasada of pasadas) {
    for (let intento = 0; intento < 500; intento++) {
      const cx = rng.entero(20, mundo.ancho - 21);
      // El bioma manda siempre en el centro. En la primera pasada también en los
      // extremos: medio santuario de la nieve plantado en el bosque de al lado
      // no es el santuario de la nieve.
      if (bioma !== null && biomas) {
        if (biomas[cx] !== bioma) continue;
        if (pasada.bordes) {
          if (biomas[cx - SANTUARIO_RADIO] !== bioma) continue;
          if (biomas[cx + SANTUARIO_RADIO] !== bioma) continue;
        }
      }
      const base = superficie[cx]!;
      let llano = true;
      for (let d = -SANTUARIO_RADIO; d <= SANTUARIO_RADIO && llano; d++) {
        if (Math.abs((superficie[cx + d] ?? base) - base) > pasada.desnivel) llano = false;
      }
      if (!llano) continue;
      if (mundo.getLiquido(cx, base - 1) > 0) continue;
      if (!sitioLibre(mundo, salida, cx, base - 1, pasada.holgura)) continue;

      levantarSantuario(mundo, cx, base - 1, material, tipo, salida);
      return;
    }
  }
}

/** El de la caverna y el del inframundo: se busca hueco a una profundidad dada. */
function santuarioHondo(
  mundo: Mundo,
  tyDesde: number,
  tyHasta: number,
  material: number,
  tipo: TipoEstructura,
  rng: Rng,
  salida: ResultadoEstructuras,
): void {
  for (const holgura of [70, 45, 30]) {
    for (let intento = 0; intento < 500; intento++) {
      const cx = rng.entero(20, mundo.ancho - 21);
      const cy = rng.entero(tyDesde, tyHasta);
      if (!sitioLibre(mundo, salida, cx, cy, holgura)) continue;
      levantarSantuario(mundo, cx, cy, material, tipo, salida);
      return;
    }
  }
}

/**
 * Los seis, en el orden de los jefes.
 *
 * Se levantan los últimos, después de la fortaleza, las cuevas, las cabañas y
 * las minas: son los que más sitio piden y los que menos pueden negociarlo, así
 * que es más barato que esquiven ellos a que los esquiven todos los demás.
 */
export function levantarSantuarios(
  mundo: Mundo,
  superficie: Int32Array,
  caverna: number,
  fondo: number,
  rng: Rng,
  salida: ResultadoEstructuras,
  biomas?: MapaBiomas,
  inframundo?: { techo: number; suelo: number },
): void {
  santuarioDeSuperficie(mundo, superficie, biomas, null, PIEDRA, SANTUARIO_PRADERA, rng, salida);
  if (biomas) {
    santuarioDeSuperficie(
      mundo, superficie, biomas, DESIERTO, ARENISCA, SANTUARIO_DESIERTO, rng, salida,
    );
    santuarioDeSuperficie(
      mundo, superficie, biomas, NIEVE_B, HIELO, SANTUARIO_NIEVE, rng, salida,
    );
    santuarioDeSuperficie(
      mundo, superficie, biomas, JUNGLA, BARRO, SANTUARIO_JUNGLA, rng, salida,
    );
  }
  // La caverna: por debajo de donde empiezan las cuevas y por encima del fondo.
  santuarioHondo(
    mundo,
    Math.min(caverna + 40, fondo - 20),
    Math.max(caverna + 41, fondo - 10),
    PIEDRA,
    SANTUARIO_CUEVA,
    rng,
    salida,
  );
  if (inframundo) {
    santuarioHondo(
      mundo,
      inframundo.techo + 10,
      Math.max(inframundo.techo + 11, inframundo.suelo - 6),
      LADRILLO_INFERNAL,
      SANTUARIO_INFIERNO,
      rng,
      salida,
    );
  }
}

import {
  AIRE,
  ALTAR,
  ANTORCHA,
  ARENISCA,
  COBALTO,
  COFRE,
  esSolido,
  HIELO,
  LADRILLO,
  MADERA,
  PIEDRA,
  PLATAFORMA,
  TITANIO,
} from '../tiles';
import {
  CABANA,
  CUEVA_DESIERTO,
  CUEVA_NIEVE,
  FORTALEZA,
  MINA,
  type Estructura,
  type TipoEstructura,
} from '../estructuras';
import { DESIERTO, NIEVE_B, type MapaBiomas } from './biomas';
import {
  FLECHA,
  GEL,
  HUESO,
  LINGOTE_HIERRO,
  LINGOTE_ORO,
  LINGOTE_PLATA,
  PAPEL,
  PEDERNAL,
  CARNE_ASADA,
  CRISTAL,
} from '../../items/items';
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
/** Salas de la fortaleza a lo ancho y a lo alto, sin contar la del altar. */
const SALAS_X = 4;
const SALAS_Y = 3;

const FORTALEZA_ANCHO = SALAS_X * SALA_ANCHO + 1;
/** La sala del altar ocupa el ancho entero y va debajo de las demás. */
const ALTAR_ALTO = 13;
const FORTALEZA_ALTO = SALAS_Y * SALA_ALTO + 1 + ALTAR_ALTO;

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
): ResultadoEstructuras {
  const salida: ResultadoEstructuras = { estructuras: [], cofres: [] };

  construirFortaleza(mundo, superficie, caverna, fondo, rng, salida);

  // Las cuevas de bioma van antes que las cabañas y las minas para que, si dos
  // quisieran el mismo sitio, gane la que da nombre al lugar.
  if (biomas) {
    const cuantas = Math.max(1, Math.floor((mundo.ancho / 700) * escala));
    for (let i = 0; i < cuantas; i++) {
      excavarCuevaDeBioma(mundo, superficie, biomas, rng, salida, DESIERTO);
      excavarCuevaDeBioma(mundo, superficie, biomas, rng, salida, NIEVE_B);
    }
  }

  // Una cabaña cada ochocientas columnas y una mina cada quinientas: las
  // suficientes para que la brújula tenga a qué apuntar mientras se busca la
  // fortaleza, y las pocas suficientes para que encontrar una siga siendo un
  // hallazgo y no parte del paisaje.
  const cabanas = Math.max(1, Math.floor(mundo.ancho / 800));
  for (let i = 0; i < cabanas; i++) {
    construirCabana(mundo, superficie, rng, salida);
  }
  const minas = Math.max(1, Math.floor((mundo.ancho / 500) * escala));
  for (let i = 0; i < minas; i++) {
    construirMina(mundo, superficie, caverna, fondo, rng, salida);
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

/** Tira dos o tres premios de una tabla. Cada uno puede salir una sola vez. */
function sortearBotin(
  rng: Rng,
  tabla: readonly (readonly [number, number, number])[],
  cuantos: number,
): [number, number][] {
  const disponibles = [...tabla];
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
  [LINGOTE_ORO, 3, 8],
  [LINGOTE_PLATA, 4, 12],
  [LINGOTE_HIERRO, 6, 14],
  [FLECHA, 25, 60],
  [HUESO, 4, 9],
  [GEL, 12, 30],
  [CRISTAL, 1, 1],
  [CARNE_ASADA, 2, 4],
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
): void {
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
  for (let fila = 0; fila < SALAS_Y; fila++) {
    for (let col = 0; col < SALAS_X; col++) {
      const sx0 = izquierda + 1 + col * SALA_ANCHO;
      const sy0 = arriba + 1 + fila * SALA_ALTO;
      const sx1 = sx0 + SALA_ANCHO - 2;
      const sy1 = sy0 + SALA_ALTO - 2;
      ahuecar(mundo, sx0, sy0, sx1, sy1, LADRILLO);

      // Puerta a la sala de la derecha, a ras de suelo: dos tiles de alto, que
      // es justo lo que mide el jugador.
      if (col < SALAS_X - 1) {
        limpiarPuerta(mundo, sx1 + 1, sy1 - 1, sx1 + 1, sy1);
      }
      // Y un hueco al piso de abajo, en una columna de la sala, con plataformas
      // para poder subir. Sin ellas la fortaleza se recorre de arriba abajo y
      // ya no se puede volver.
      if (fila < SALAS_Y - 1) {
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
          sortearBotin(rng, BOTIN_FORTALEZA, rng.entero(2, 3)),
        );
      }
    }
  }

  // --- La sala del altar ---
  const ay0 = arriba + SALAS_Y * SALA_ALTO + 1;
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

  anotar(salida, FORTALEZA, cx, ay1 - 1);
}

/** Abre un hueco de paso sin tocar el líquido de alrededor. */
function limpiarPuerta(
  mundo: Mundo,
  tx0: number,
  ty0: number,
  tx1: number,
  ty1: number,
): void {
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      mundo.setTile(tx, ty, AIRE);
      mundo.setPared(tx, ty, LADRILLO);
      mundo.setLiquido(tx, ty, 0);
    }
  }
}

// --- Cuevas de bioma ---------------------------------------------------------

/** Lo que guarda una cueva de arenisca. */
const BOTIN_DESIERTO: readonly (readonly [number, number, number])[] = [
  [COBALTO, 8, 20],
  [LINGOTE_ORO, 5, 12],
  [FLECHA, 30, 70],
  [HUESO, 6, 14],
  [CRISTAL, 1, 1],
  [CARNE_ASADA, 2, 5],
];

/** Lo que guarda una cueva helada. */
const BOTIN_NIEVE: readonly (readonly [number, number, number])[] = [
  [TITANIO, 6, 16],
  [LINGOTE_PLATA, 6, 14],
  [FLECHA, 30, 70],
  [PEDERNAL, 5, 12],
  [CRISTAL, 1, 1],
  [GEL, 15, 32],
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

    const radio = rng.rango(9, 14);

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
    ponerCofre(mundo, salida, cx, sy, sortearBotin(rng, botin, rng.entero(3, 4)));

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
      sortearBotin(rng, BOTIN_CABANA, rng.entero(2, 3)),
    );

    anotar(salida, CABANA, tx + ancho / 2, suelo - 2);
    return;
  }
}

// --- La mina abandonada ------------------------------------------------------

const BOTIN_MINA: readonly (readonly [number, number, number])[] = [
  [LINGOTE_HIERRO, 3, 7],
  [LINGOTE_PLATA, 2, 6],
  [FLECHA, 15, 35],
  [PEDERNAL, 3, 8],
  [GEL, 8, 20],
  [CRISTAL, 1, 1],
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
): void {
  const largo = rng.entero(26, 46);
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

    ponerCofre(
      mundo,
      salida,
      tx + rng.entero(4, largo - 5),
      ty + alto - 1,
      sortearBotin(rng, BOTIN_MINA, rng.entero(1, 3)),
    );

    anotar(salida, MINA, tx + largo / 2, ty + alto - 1);
    return;
  }
}

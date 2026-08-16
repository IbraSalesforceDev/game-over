import { esSolido, OBSIDIANA } from './tiles';

/** Los cuatro vecinos en cruz. En diagonal dos líquidos no se tocan. */
const VECINOS: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];
import { Mundo } from './world';

/**
 * Simulación de líquidos por celdas.
 *
 * Cada celda guarda cuánto líquido tiene (0-255) y de qué tipo. La regla es
 * simple: primero cae, y lo que no cabe abajo se reparte con los lados hasta
 * igualar. Con eso solo, el agua llena huecos, se derrama por los bordes y se
 * queda quieta cuando está nivelada.
 *
 * Lo importante para el rendimiento es que **solo se miran las celdas
 * activas**. Un mundo tiene 630.000 tiles y casi todos están secos y quietos;
 * recorrerlos enteros sesenta veces por segundo sería tirar el presupuesto de
 * frame por algo que no cambia. Cuando una celda se mueve, se marcan ella y sus
 * vecinas para el siguiente paso, y cuando el líquido se estabiliza la lista se
 * vacía sola y la simulación deja de costar nada.
 */

/**
 * Nivel por debajo del cual una celda no se reparte ni se dibuja.
 *
 * Los restos por debajo de este nivel se quedan quietos en vez de seguir
 * repartiéndose: si una gota puede partirse indefinidamente, una sola celda de
 * agua acaba extendida en una lámina invisible de doscientos tiles y el agua
 * desaparece del mundo. Solo se evaporan las gotas que además están aisladas,
 * que son las que ya no van a ser parte de nada.
 */
export const MINIMO = 4;
/** Diferencia por debajo de la cual dos celdas ya se consideran niveladas. */
const TOLERANCIA = 2;
/** Cuánto se mueve como máximo entre dos celdas en un paso. */
const FLUJO_MAX = 96;
/** Celdas procesadas como mucho en un paso, para acotar el peor caso. */
const TOPE_POR_PASO = 6000;

export class SimuladorLiquidos {
  /**
   * Coladas apagadas en el último paso, para que el bucle pueda invalidar el
   * chunk y la luz sin que el simulador sepa nada de render.
   */
  readonly apagados: { tx: number; ty: number }[] = [];
  /** Celdas por revisar en el próximo paso, como índice plano del mundo. */
  private activas = new Set<number>();
  private siguientes = new Set<number>();

  constructor(private readonly mundo: Mundo) {}

  /** Marca una celda y su entorno para revisión. */
  activar(tx: number, ty: number): void {
    const { mundo } = this;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (!mundo.dentro(x, y)) continue;
        this.activas.add(y * mundo.ancho + x);
      }
    }
  }

  /** Añade líquido a una celda y la despierta. */
  verter(tx: number, ty: number, cantidad: number, lava = false): void {
    const actual = this.mundo.getLiquido(tx, ty);
    this.mundo.setLiquido(tx, ty, actual + cantidad, lava || this.mundo.esLava(tx, ty));
    this.activar(tx, ty);
  }

  /** Despierta todas las celdas con líquido. Se usa al cargar un mundo. */
  despertarTodo(): void {
    const { mundo } = this;
    for (let i = 0; i < mundo.liquido.length; i++) {
      if (mundo.liquido[i]! > 0) this.activas.add(i);
    }
  }

  get pendientes(): number {
    return this.activas.size;
  }

  /**
   * Un paso de simulación. Devuelve cuántas celdas han cambiado, que es lo que
   * el render usa para saber si tiene que repintar.
   */
  paso(): number {
    if (this.activas.size === 0) return 0;
    const { mundo } = this;
    const ancho = mundo.ancho;
    let cambios = 0;
    let procesadas = 0;

    this.apagados.length = 0;
    this.siguientes.clear();

    for (const i of this.activas) {
      if (++procesadas > TOPE_POR_PASO) {
        // Lo que no da tiempo a mirar se queda para el paso siguiente en vez de
        // perderse: mejor que el agua tarde un poco más que que se congele.
        this.siguientes.add(i);
        continue;
      }

      const tx = i % ancho;
      const ty = (i / ancho) | 0;
      let nivel = mundo.liquido[i]!;
      if (nivel === 0) continue;

      // Una celda que acaba dentro de un bloque desaparece: es lo que pasa
      // cuando el jugador tapa el agua con tierra.
      if (esSolido(mundo.getTile(tx, ty))) {
        mundo.setLiquido(tx, ty, 0);
        cambios++;
        this.marcarVecinas(tx, ty);
        continue;
      }

      const lava = mundo.esLava(tx, ty);

      // 0. Agua contra lava: obsidiana.
      //
      // Va lo primero del tick porque el resto del paso mueve líquido, y una
      // celda que va a apagarse no debe repartirse antes. Es lo que convierte
      // el cubo de agua en la herramienta para cruzar una colada, y de paso
      // impide el truco de tapar la lava con agua para pasar por encima: lo que
      // queda es un bloque que pide pico de hierro.
      if (this.apagar(tx, ty, lava)) {
        cambios++;
        continue;
      }

      // 1. Caer.
      if (this.puedeFluir(tx, ty + 1)) {
        const abajo = mundo.getLiquido(tx, ty + 1);
        const hueco = 255 - abajo;
        if (hueco > 0 && this.compatible(tx, ty + 1, lava)) {
          const mueve = Math.min(nivel, hueco, FLUJO_MAX);
          if (mueve > 0) {
            mundo.setLiquido(tx, ty + 1, abajo + mueve, lava);
            nivel -= mueve;
            mundo.setLiquido(tx, ty, nivel, lava);
            cambios++;
            this.marcarVecinas(tx, ty);
            this.marcarVecinas(tx, ty + 1);
            if (nivel === 0) continue;
          }
        }
      }

      // 2. Repartir a los lados hasta igualar.
      for (const dx of [-1, 1]) {
        if (nivel <= MINIMO) break;
        const nx = tx + dx;
        if (!this.puedeFluir(nx, ty) || !this.compatible(nx, ty, lava)) continue;
        const vecino = mundo.getLiquido(nx, ty);
        const diferencia = nivel - vecino;
        if (diferencia <= TOLERANCIA) continue;
        // La mitad de la diferencia: repartir del todo hace que el agua oscile
        // de un lado a otro sin parar nunca.
        const mueve = Math.min(Math.floor(diferencia / 2), FLUJO_MAX);
        if (mueve <= 0) continue;
        mundo.setLiquido(nx, ty, vecino + mueve, lava);
        nivel -= mueve;
        mundo.setLiquido(tx, ty, nivel, lava);
        cambios++;
        this.marcarVecinas(tx, ty);
        this.marcarVecinas(nx, ty);
      }

      if (nivel > 0 && nivel <= MINIMO && this.aislada(tx, ty)) {
        // Una gota suelta que ya no toca nada: se evapora. Si tuviera vecinos
        // se quedaría, porque entonces es el borde de una lámina de agua y
        // borrarla iría comiéndose el charco por los lados.
        mundo.setLiquido(tx, ty, 0);
        cambios++;
      }
    }

    const anterior = this.activas;
    this.activas = this.siguientes;
    this.siguientes = anterior;
    this.siguientes.clear();
    return cambios;
  }

  /** ¿La celda no toca ningún otro líquido? */
  private aislada(tx: number, ty: number): boolean {
    const { mundo } = this;
    return (
      mundo.getLiquido(tx - 1, ty) === 0 &&
      mundo.getLiquido(tx + 1, ty) === 0 &&
      mundo.getLiquido(tx, ty - 1) === 0 &&
      mundo.getLiquido(tx, ty + 1) === 0
    );
  }

  private puedeFluir(tx: number, ty: number): boolean {
    const { mundo } = this;
    if (!mundo.dentro(tx, ty)) return false;
    return !esSolido(mundo.getTile(tx, ty));
  }

  /**
   * Si esta celda de lava toca agua (o al revés), las dos se convierten en
   * piedra: obsidiana donde estaba la lava, y el agua se gasta.
   *
   * Solo mira los cuatro vecinos en cruz. En diagonal no: dos coladas que se
   * cruzan de esquina no se tocan de verdad, y con las diagonales incluidas una
   * gota de agua a un tile en diagonal apagaba media cueva.
   */
  private apagar(tx: number, ty: number, lava: boolean): boolean {
    const { mundo } = this;
    for (const [dx, dy] of VECINOS) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (!mundo.dentro(nx, ny)) continue;
      if (mundo.getLiquido(nx, ny) === 0) continue;
      if (mundo.esLava(nx, ny) === lava) continue;

      // La lava es la que se vuelve piedra; el agua simplemente se consume.
      const [lx, ly] = lava ? [tx, ty] : [nx, ny];
      const [ax, ay] = lava ? [nx, ny] : [tx, ty];
      mundo.setLiquido(lx, ly, 0);
      mundo.setLiquido(ax, ay, 0);
      mundo.setTile(lx, ly, OBSIDIANA);
      this.marcarVecinas(tx, ty);
      this.marcarVecinas(nx, ny);
      this.apagados.push({ tx: lx, ty: ly });
      return true;
    }
    return false;
  }

  /** Agua y lava no se mezclan: una celda solo acepta líquido de su tipo. */
  private compatible(tx: number, ty: number, lava: boolean): boolean {
    if (this.mundo.getLiquido(tx, ty) === 0) return true;
    return this.mundo.esLava(tx, ty) === lava;
  }

  private marcarVecinas(tx: number, ty: number): void {
    const { mundo } = this;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx;
        const y = ty + dy;
        if (!mundo.dentro(x, y)) continue;
        this.siguientes.add(y * mundo.ancho + x);
      }
    }
  }
}

/** Rectángulo del mundo, en píxeles. Evita depender del tipo `Caja`. */
export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface Sumersion {
  /** Fracción del rectángulo que está bajo líquido, 0-1. */
  fraccion: number;
  /** Toca lava en alguna parte. */
  lava: boolean;
  /** La cabeza (el tramo superior) está bajo líquido: aquí es donde se ahoga. */
  cabeza: boolean;
}

/**
 * Cuánto de una caja está dentro de líquido.
 *
 * Se mide por área y no por un punto suelto porque de eso dependen la física y
 * el aliento: con un solo punto, rozar la superficie de un lago haría nadar al
 * jugador de golpe, y el medidor de aire parpadearía al saltar dentro del agua.
 */
export function sumersion(mundo: Mundo, caja: Rect, TILE: number): Sumersion {
  const tx0 = Math.floor(caja.x / TILE);
  const tx1 = Math.floor((caja.x + caja.ancho - 1e-6) / TILE);
  const ty0 = Math.floor(caja.y / TILE);
  const ty1 = Math.floor((caja.y + caja.alto - 1e-6) / TILE);
  // La cabeza es el tercio de arriba: es lo que hay que sacar del agua para
  // respirar.
  const yCabeza = caja.y + caja.alto / 3;

  let area = 0;
  let lava = false;
  let cabeza = false;

  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const nivel = mundo.getLiquido(tx, ty);
      if (nivel <= MINIMO) continue;
      // Una celda con líquido encima está llena hasta el techo: si no, entre
      // celda y celda quedaría una franja de "aire" que no existe.
      const lleno = mundo.getLiquido(tx, ty - 1) > MINIMO;
      const altura = lleno ? TILE : (nivel / 255) * TILE;
      const superficie = (ty + 1) * TILE - altura;

      const solapeX =
        Math.min(caja.x + caja.ancho, (tx + 1) * TILE) - Math.max(caja.x, tx * TILE);
      const solapeY =
        Math.min(caja.y + caja.alto, (ty + 1) * TILE) - Math.max(caja.y, superficie);
      if (solapeX <= 0 || solapeY <= 0) continue;

      area += solapeX * solapeY;
      if (mundo.esLava(tx, ty)) lava = true;
      if (yCabeza >= superficie && yCabeza < (ty + 1) * TILE && solapeX > 0) cabeza = true;
    }
  }

  return { fraccion: Math.min(1, area / (caja.ancho * caja.alto)), lava, cabeza };
}

/** Nivel de líquido en un punto del mundo en píxeles, 0-1. */
export function llenadoEn(mundo: Mundo, wx: number, wy: number, TILE: number): number {
  const tx = Math.floor(wx / TILE);
  const ty = Math.floor(wy / TILE);
  const nivel = mundo.getLiquido(tx, ty);
  if (nivel <= MINIMO) return 0;
  // La superficie del líquido está a la altura que marca su nivel: media celda
  // de agua solo moja la mitad de abajo.
  const alturaLiquido = (nivel / 255) * TILE;
  const yEnCelda = wy - ty * TILE;
  return yEnCelda >= TILE - alturaLiquido ? nivel / 255 : 0;
}

/** Suelta el líquido de un tile al romperse su contenedor. */
export function limpiarSiSolido(mundo: Mundo, tx: number, ty: number): void {
  if (esSolido(mundo.getTile(tx, ty)) && mundo.getLiquido(tx, ty) > 0) {
    mundo.setLiquido(tx, ty, 0);
  }
}

import { TILE } from '../core/constants';
import { css, type Reloj } from '../engine/time';
import type { Jugador } from '../entities/player';
import { LUZ_MINIMA, type MotorLuz } from '../world/lighting';
import { TAMANO_DROP, type Drop } from '../entities/drop';
import { ENEMIGOS, type Enemigo } from '../entities/enemies';
import { cajaGolpe, type Golpe } from '../entities/combat';
import { VIDA_CLAVADA, type Flecha } from '../entities/proyectiles';
import { defObjeto, NADA } from '../items/items';
import type { Capa, Picado } from '../world/edit';
import { durezaObjetivo, etapaGrieta } from '../world/edit';
import { MINIMO } from '../world/liquids';
import type { Mundo } from '../world/world';
import type { Zona } from '../world/testLevel';
import { Camara } from './camera';
import { CacheChunks, CHUNK_RENDER } from './chunkCache';
import { CIELO_INFRAMUNDO, Fondo, fondoSubterraneo, type BiomaFondo } from './fondo';
import { crearIconos, type Iconos } from './iconos';
import type { Particulas } from './particles';
import {
  crearSprites,
  JUGADOR_OFF_X,
  JUGADOR_OFF_Y,
  type ClaveArmadura,
  type Pose,
  type Sprites,
} from './sprites';
import { crearTileset, type Tileset } from './tileset';

/**
 * Lo que existía visualmente en la versión del mundo.
 *
 * El render no sabe de versiones ni quiere saber: recibe seis interruptores y
 * ya. Traducir la versión a interruptores se hace una vez, en el arranque, y
 * así este fichero no acaba lleno de comparaciones de cadenas.
 */
export interface EpocaVisual {
  /** Sprites animados. Sin ellos, el personaje y los bichos son cajas. */
  sprites: boolean;
  /** Montañas y nubes del fondo. */
  fondo: boolean;
  /** Sol, luna y estrellas. */
  astros: boolean;
  /** Sombra elíptica bajo lo que está apoyado. */
  sombras: boolean;
  /** El objeto que se lleva, dibujado en la mano. */
  enMano: boolean;
  /** Barra de vida sobre los enemigos heridos. */
  barrasEnemigo: boolean;
}

/** Todo encendido: lo que ve un mundo de la versión actual. */
export const EPOCA_COMPLETA: EpocaVisual = {
  sprites: true,
  fondo: true,
  astros: true,
  sombras: true,
  enMano: true,
  barrasEnemigo: true,
};

/** Lo que el render necesita saber del puntero de construcción. */
export interface Objetivo {
  tx: number;
  ty: number;
  valido: boolean;
  visible: boolean;
  capa: Capa;
}

/**
 * Todo lo que hace falta para pintar un frame.
 *
 * Va agrupado en un objeto y no como once parámetros sueltos porque la lista ya
 * había llegado al punto en que añadir uno obligaba a contar comas para no
 * cruzar dos argumentos del mismo tipo.
 */
export interface Escena {
  mundo: Mundo;
  jugador: Jugador;
  alpha: number;
  zonas: Zona[];
  picado: Picado;
  objetivo: Objetivo;
  motorLuz: MotorLuz;
  reloj: Reloj;
  drops: readonly Drop[];
  enemigos: readonly Enemigo[];
  golpe: Golpe;
  flechas: readonly Flecha[];
  particulas: Particulas;
  /** Fracción del jugador bajo líquido, para elegir la pose de nado. */
  sumergido: number;
  /** Objeto que el jugador lleva en la mano, para dibujárselo. */
  enMano: number;
  /** Armadura puesta: un color por hueco, en el orden de `HUECOS`. */
  armadura: ClaveArmadura;
  /** Qué se puede dibujar en esta versión del mundo. */
  epoca: EpocaVisual;
  /** Bioma donde está el jugador, para teñir las montañas del fondo. */
  bioma: BiomaFondo;
  /**
   * Fila desde la que se mide el desplazamiento vertical del fondo, en píxeles.
   * Cero para los horizontes; el techo del inframundo cuando se está debajo.
   */
  baseFondoY?: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly camara = new Camara();
  readonly cache: CacheChunks;
  private readonly tileset: Tileset;
  private readonly sprites: Sprites;
  private readonly fondo = new Fondo();
  private readonly iconos: Iconos = crearIconos();
  private dpr = 1;
  private lienzoLuz: HTMLCanvasElement | null = null;
  private ctxLuz: CanvasRenderingContext2D | null = null;
  private imgLuz: ImageData | null = null;
  private tinteAnterior = '';
  private gradienteVineta: CanvasGradient | null = null;
  private vinetaW = 0;
  private vinetaH = 0;
  private animPose: Pose = 'quieto';
  private animAvance = 0;
  private ultimoMs = 0;

  /**
   * Ajustes de gráficos, que vienen del panel de opciones.
   *
   * Viven como campos y no como parámetros del constructor porque se cambian
   * en caliente: quien mueve el deslizador del zoom espera ver el efecto
   * mientras lo mueve, no en la siguiente partida.
   */
  /** Zoom elegido a mano, o 0 para el adaptativo de siempre. */
  private zoomFijo = 0;
  /** Tope del devicePixelRatio. Bajarlo es jugar a menos resolución. */
  private topeDpr = 2;
  /** Suelo de luz: cuanto más bajo, más cerrada la oscuridad de las cuevas. */
  private suelo = LUZ_MINIMA;

  constructor(private readonly lienzo: HTMLCanvasElement) {
    const ctx = lienzo.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Este navegador no soporta canvas 2D');
    this.ctx = ctx;
    this.tileset = crearTileset();
    this.sprites = crearSprites();
    this.cache = new CacheChunks(this.tileset);
    this.ultimoMs = performance.now();
    this.redimensionar();
  }

  redimensionar(): void {
    // Capamos el DPR: en pantallas 3x el coste se dispara sin ganancia visible
    // en un juego de pixel art.
    this.dpr = Math.min(window.devicePixelRatio || 1, this.topeDpr);
    const w = Math.floor(this.lienzo.clientWidth * this.dpr);
    const h = Math.floor(this.lienzo.clientHeight * this.dpr);
    if (this.lienzo.width !== w || this.lienzo.height !== h) {
      this.lienzo.width = w;
      this.lienzo.height = h;
    }
    this.ctx.imageSmoothingEnabled = false;
    // Zoom adaptativo: apuntamos a unos 44 tiles de ancho de vista, que es la
    // escala a la que se lee bien el terreno sin marearse.
    this.camara.zoom =
      this.zoomFijo > 0
        ? this.zoomFijo
        : Math.min(4, Math.max(2, Math.round(w / (44 * TILE))));
    this.camara.redimensionar(w, h);
  }

  /**
   * Aplica los ajustes de gráficos y rehace lo que dependa de ellos.
   *
   * El tinte anterior se borra a mano: la imagen de luz solo se recalcula
   * cuando cambia el tinte del reloj, así que sin esto cambiar la oscuridad no
   * se notaría hasta el siguiente amanecer.
   */
  aplicarGraficos(op: { zoom: number; dpr: number; oscuridad: number }): void {
    this.zoomFijo = op.zoom;
    this.topeDpr = op.dpr;
    this.suelo = op.oscuridad;
    this.tinteAnterior = '';
    this.redimensionar();
  }

  get anchoCanvas(): number {
    return this.lienzo.width;
  }

  get altoCanvas(): number {
    return this.lienzo.height;
  }

  get escala(): number {
    return this.dpr;
  }

  /** Bioma en el que está el jugador, para teñir el fondo. Lo pone la escena. */
  private biomaFondo: BiomaFondo = 'bosque';
  /** Altura de referencia del fondo en píxeles. La pone la escena. */
  private baseFondoY = 0;

  private cielo(reloj: Reloj, epoca: EpocaVisual): void {
    const { ctx } = this;
    // Bajo tierra no hay cielo. Sin esto, por los huecos de las cavernas del
    // inframundo se veía el degradado azul del mediodía: un agujero al cielo a
    // doscientas filas de profundidad.
    const bajoTierra = epoca.fondo && fondoSubterraneo(this.biomaFondo);
    const g = ctx.createLinearGradient(0, 0, 0, this.altoCanvas);
    if (bajoTierra) {
      const [alto, medio, bajo] = CIELO_INFRAMUNDO;
      g.addColorStop(0, alto);
      g.addColorStop(0.55, medio);
      g.addColorStop(1, bajo);
    } else {
      const [alto, medio, bajo] = reloj.colorCielo;
      g.addColorStop(0, css(alto));
      g.addColorStop(0.55, css(medio));
      g.addColorStop(1, css(bajo));
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.anchoCanvas, this.altoCanvas);
    // Antes de 1.5.0 el cielo era un degradado y nada más: ni sol, ni luna, ni
    // estrellas, porque no había hora que representar.
    if (epoca.astros && !bajoTierra) {
      this.estrellas(reloj);
      this.astro(reloj);
    }
    // Y hasta 2.2.0 no había nada detrás del terreno: el horizonte era el
    // degradado pelado. Las montañas y las nubes llegaron con el parallax.
    if (!epoca.fondo) return;
    this.fondo.dibujar(
      ctx,
      reloj,
      this.camara.x,
      this.camara.y,
      this.anchoCanvas,
      this.altoCanvas,
      this.dpr,
      performance.now(),
      this.biomaFondo,
      this.baseFondoY,
    );
  }

  /**
   * Sol y luna, recorriendo el cielo según la hora.
   *
   * Se dibujan detrás de las montañas para que salgan y se pongan por detrás
   * del horizonte, que es la mitad de la gracia de tener un ciclo de día.
   */
  private astro(reloj: Reloj): void {
    const { ctx } = this;
    const w = this.anchoCanvas;
    const h = this.altoCanvas;
    const dia = reloj.luzSolar > 90;
    // El arco va de izquierda a derecha a lo largo de su medio ciclo. Se usa el
    // minuto del reloj directamente: el sol sale por un lado y se pone por el
    // otro, sin más matemáticas.
    const t = dia
      ? (reloj.minutos - 4.5 * 60) / (15 * 60)
      : ((reloj.minutos + 24 * 60 - 19.5 * 60) % (24 * 60)) / (9 * 60);
    if (t < -0.05 || t > 1.05) return;

    const x = w * (0.08 + t * 0.84);
    const y = h * 0.66 - Math.sin(Math.max(0, Math.min(1, t)) * Math.PI) * h * 0.55;
    const r = Math.max(10, 16 * this.dpr);

    ctx.save();
    if (dia) {
      // Halo: un degradado radial suave alrededor del disco.
      const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 4.5);
      halo.addColorStop(0, 'rgba(255,238,180,0.55)');
      halo.addColorStop(1, 'rgba(255,238,180,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
      ctx.fillStyle = '#fff4c8';
    } else {
      const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 3.5);
      halo.addColorStop(0, 'rgba(200,220,255,0.35)');
      halo.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = halo;
      ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      ctx.fillStyle = '#e6eefa';
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (!dia) {
      // Cráteres: tres manchas y la luna deja de ser un círculo blanco.
      ctx.fillStyle = 'rgba(150,168,196,0.55)';
      for (const [dx, dy, rr] of [
        [-0.3, -0.2, 0.22],
        [0.25, 0.1, 0.16],
        [-0.05, 0.35, 0.12],
      ] as const) {
        ctx.beginPath();
        ctx.arc(x + dx * r * 2, y + dy * r * 2, rr * r * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /**
   * Estrellas de noche. Su posición depende solo del índice, así que no
   * parpadean ni se mueven con la cámara: son el fondo del firmamento.
   */
  private estrellas(reloj: Reloj): void {
    const opacidad = 1 - reloj.luzSolar / 255;
    if (opacidad <= 0.05) return;
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = Math.min(1, opacidad * 1.2);
    ctx.fillStyle = '#e8eef8';
    const n = 90;
    for (let i = 0; i < n; i++) {
      // Dispersión determinista barata: dos irracionales distintos por eje.
      const x = ((i * 0.7548776662) % 1) * this.anchoCanvas;
      const y = ((i * 0.5698402909) % 1) * this.altoCanvas * 0.6;
      const tam = i % 7 === 0 ? 2 : 1;
      ctx.fillRect(Math.round(x), Math.round(y), tam * this.dpr, tam * this.dpr);
    }
    ctx.restore();
  }

  /**
   * Vuelca la luz como una capa que multiplica la escena.
   *
   * El buffer tiene un píxel por tile y se estira con suavizado: es el truco
   * de siempre y da degradados suaves casi gratis, en vez de un mosaico de
   * cuadrados oscuros. Se repinta solo cuando la luz ha cambiado.
   */
  private luz(motor: MotorLuz, reloj: Reloj, recalculada: boolean, ox: number, oy: number): void {
    const { tx0, ty0, ancho, alto } = motor.ventana;
    if (ancho === 0 || alto === 0) return;

    if (!this.lienzoLuz || this.lienzoLuz.width !== ancho || this.lienzoLuz.height !== alto) {
      this.lienzoLuz = document.createElement('canvas');
      this.lienzoLuz.width = ancho;
      this.lienzoLuz.height = alto;
      this.ctxLuz = this.lienzoLuz.getContext('2d');
      this.imgLuz = this.ctxLuz?.createImageData(ancho, alto) ?? null;
      recalculada = true;
    }
    if (!this.ctxLuz || !this.imgLuz) return;

    const tinte = reloj.tinteLuz;
    if (recalculada || this.tinteAnterior !== tinte.join()) {
      this.tinteAnterior = tinte.join();
      const datos = this.imgLuz.data;
      const buf = motor.buffer;
      // El tinte se normaliza a su canal más alto: si no, el azul de la noche
      // multiplica encima del nivel de luz y oscurece dos veces, dejando el
      // mundo nocturno casi negro. El tinte debe cambiar el color, no el brillo.
      const k = 255 / Math.max(tinte[0], tinte[1], tinte[2], 1);
      const r = tinte[0] * k;
      const g = tinte[1] * k;
      const b = tinte[2] * k;
      for (let i = 0; i < buf.length; i++) {
        // El suelo de luz se aplica aquí y no en el buffer para no ensuciar la
        // propagación: lo que se ilumina es el volcado a pantalla, no el cálculo.
        const l = Math.max(this.suelo, buf[i]!) / 255;
        const j = i * 4;
        datos[j] = r * l;
        datos[j + 1] = g * l;
        datos[j + 2] = b * l;
        datos[j + 3] = 255;
      }
      this.ctxLuz.putImageData(this.imgLuz, 0, 0);
    }

    const { ctx, camara } = this;
    const z = camara.zoom;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'multiply';
    // Medio tile de desplazamiento: así el centro de cada píxel de luz cae en
    // el centro de su tile y el degradado interpola entre centros, no entre
    // esquinas.
    ctx.drawImage(
      this.lienzoLuz,
      ox + Math.round((tx0 * TILE - TILE / 2) * z),
      oy + Math.round((ty0 * TILE - TILE / 2) * z),
      ancho * TILE * z,
      alto * TILE * z,
    );
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  /** Vuelca los lienzos de los chunks visibles. Un drawImage por chunk. */
  private chunks(mundo: Mundo, ox: number, oy: number): void {
    const { ctx, camara } = this;
    const zoom = camara.zoom;
    const ladoPx = CHUNK_RENDER * TILE;
    const cx0 = Math.floor(camara.x / ladoPx);
    const cy0 = Math.floor(camara.y / ladoPx);
    const cx1 = Math.floor((camara.x + camara.ancho) / ladoPx);
    const cy1 = Math.floor((camara.y + camara.alto) / ladoPx);
    const anchoChunks = Math.ceil(mundo.ancho / CHUNK_RENDER);
    const altoChunks = Math.ceil(mundo.alto / CHUNK_RENDER);

    for (let cy = cy0; cy <= cy1; cy++) {
      if (cy < 0 || cy >= altoChunks) continue;
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cx >= anchoChunks) continue;
        const lienzo = this.cache.obtener(mundo, cx, cy);
        ctx.drawImage(
          lienzo,
          ox + cx * ladoPx * zoom,
          oy + cy * ladoPx * zoom,
          ladoPx * zoom,
          ladoPx * zoom,
        );
      }
    }
  }

  /**
   * Elige la pose y avanza el contador de animación.
   *
   * El avance depende de la velocidad real del jugador: con un contador fijo,
   * andar despacio se ve como patinar, porque los pies se mueven a un ritmo que
   * no tiene nada que ver con el que recorre el suelo.
   */
  private animarJugador(j: Jugador, sumergido: number, ms: number): { pose: Pose; frame: number } {
    const dt = Math.min(64, ms - this.ultimoMs) / 16.667;
    this.ultimoMs = ms;

    let pose: Pose;
    let velocidad = 0.14;
    if (sumergido >= 0.45) {
      pose = 'nadar';
      velocidad = 0.11;
    } else if (!j.caja.enSuelo) {
      pose = j.caja.vy < 0 ? 'saltar' : 'caer';
    } else if (Math.abs(j.caja.vx) > 0.25) {
      pose = 'andar';
      velocidad = Math.abs(j.caja.vx) * 0.085;
    } else {
      pose = 'quieto';
      velocidad = 0.022;
    }

    // Al cambiar de pose se arranca en el primer frame: entrar a mitad del
    // ciclo de paso deja al personaje con una pierna estirada de golpe.
    if (pose !== this.animPose) {
      this.animPose = pose;
      this.animAvance = 0;
    }
    this.animAvance += velocidad * dt;
    return { pose, frame: Math.floor(this.animAvance) };
  }

  private jugador(
    j: Jugador,
    alpha: number,
    ox: number,
    oy: number,
    sumergido: number,
    enMano: number,
    armadura: ClaveArmadura,
    epoca: EpocaVisual,
  ): void {
    const { ctx, camara } = this;
    // Interpolación entre el tick anterior y el actual: el movimiento se ve
    // fluido aunque la simulación vaya a 60 fijos.
    const wx = j.xPrev + (j.caja.x - j.xPrev) * alpha;
    const wy = j.yPrev + (j.caja.y - j.yPrev) * alpha;
    const u = camara.zoom;
    const { pose, frame } = this.animarJugador(j, sumergido, performance.now());

    if (epoca.sprites) {
      this.sprites.jugador(
        ctx,
        pose,
        frame,
        j.caja.mirando,
        ox + Math.round((wx + JUGADOR_OFF_X) * u),
        oy + Math.round((wy + JUGADOR_OFF_Y) * u),
        u,
        armadura,
      );
    } else {
      // Antes de 2.2.0 el personaje era exactamente esto: su caja de colisión
      // pintada, con una franja clara arriba para saber hacia dónde miraba. No
      // es un marcador de posición, es como se veía.
      this.caja(
        ox + Math.round(wx * u),
        oy + Math.round(wy * u),
        j.caja.ancho * u,
        j.caja.alto * u,
        '#3f6f9a',
        '#26445f',
        j.caja.mirando,
      );
    }

    // Lo que se lleva en la mano se ve. Es la confirmación visual de que el
    // objeto seleccionado importa: desde que la velocidad de picado depende de
    // la mano, ver el pico ahí es la mitad de la explicación de por qué con la
    // antorcha no se avanza.
    if (enMano === NADA || !epoca.enMano) return;
    const lado = 13;
    // La mano del brazo delantero, en coordenadas de la caja física.
    const manoX = j.caja.mirando > 0 ? wx + 14 : wx + j.caja.ancho - 14 - lado;
    const manoY = wy + 18;
    this.iconos.dibujar(
      ctx,
      enMano,
      ox + Math.round(manoX * u),
      oy + Math.round(manoY * u),
      lado * u,
    );
  }

  /**
   * Una caja de colisión pintada: así se veían el personaje y los bichos antes
   * de que en 2.2.0 llegaran los sprites.
   *
   * No es un cuadrado plano. Lleva la franja clara de arriba, el borde oscuro y
   * la marca del lado hacia el que mira, que es exactamente lo que tenía
   * entonces y lo único que permitía leer hacia dónde iba algo.
   */
  private caja(
    sx: number,
    sy: number,
    ancho: number,
    alto: number,
    color: string,
    oscuro: string,
    mirando: 1 | -1,
  ): void {
    const { ctx } = this;
    const borde = Math.max(1, Math.round(this.camara.zoom / 2));
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy, ancho, alto);
    ctx.fillStyle = oscuro;
    ctx.fillRect(sx, sy + alto - borde * 2, ancho, borde * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(sx, sy, ancho, borde * 2);
    // La marca del lado: un mordisco claro pegado a la cara que mira.
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    const m = Math.max(2, Math.round(ancho * 0.22));
    ctx.fillRect(mirando > 0 ? sx + ancho - m : sx, sy + alto * 0.22, m, m);
    ctx.strokeStyle = 'rgba(6,9,14,0.75)';
    ctx.lineWidth = borde;
    ctx.strokeRect(sx + borde / 2, sy + borde / 2, ancho - borde, alto - borde);
  }

  /** Barra de vida sobre un enemigo herido. */
  private barraEnemigo(e: Enemigo, ox: number, oy: number): void {
    const { ctx, camara } = this;
    const z = camara.zoom;
    const c = e.caja;
    if (e.salud.vida >= e.salud.vidaMax) return;
    const pct = e.salud.vida / e.salud.vidaMax;
    const bx = ox + Math.round(c.x * z);
    const by = oy + Math.round((c.y - 6) * z);
    const bw = c.ancho * z;
    const bh = Math.max(2, Math.round(2 * z));
    ctx.fillStyle = 'rgba(8,10,14,0.7)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = pct > 0.5 ? '#6fbf46' : pct > 0.25 ? '#e0a83a' : '#d94f4f';
    ctx.fillRect(bx, by, bw * pct, bh);
  }

  /**
   * Sombra elíptica bajo una caja apoyada en el suelo.
   *
   * Es el truco más barato que existe para que un personaje parezca posado
   * sobre el terreno en vez de pegado por delante, y cuesta un `ellipse` por
   * bicho visible.
   */
  private sombra(
    x: number,
    y: number,
    ancho: number,
    ox: number,
    oy: number,
    fuerza = 1,
  ): void {
    if (fuerza <= 0.02) return;
    const { ctx, camara } = this;
    const u = camara.zoom;
    ctx.save();
    ctx.globalAlpha = 0.28 * fuerza;
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(
      ox + (x + ancho / 2) * u,
      oy + y * u,
      (ancho / 2) * u * fuerza,
      Math.max(1.5, 2.5 * u * 0.5 * fuerza),
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  /** Grietas del bloque que se está picando ahora mismo. */
  private picado(mundo: Mundo, p: Picado, ox: number, oy: number): void {
    if (p.progreso <= 0 || p.tx < 0) return;
    const u = this.camara.zoom;
    const dureza = durezaObjetivo(mundo, p);
    if (dureza <= 0) return;
    this.tileset.dibujarGrieta(
      this.ctx,
      etapaGrieta(p, dureza),
      ox + p.tx * TILE * u,
      oy + p.ty * TILE * u,
      TILE * u,
    );
  }

  /** Recuadro del tile apuntado: verde si la acción es posible, rojo si no. */
  private objetivo(o: Objetivo, ox: number, oy: number): void {
    if (!o.visible) return;
    const { ctx } = this;
    const u = this.camara.zoom;
    const sx = ox + o.tx * TILE * u;
    const sy = oy + o.ty * TILE * u;
    const lado = TILE * u;

    ctx.fillStyle = o.valido
      ? 'rgba(232, 182, 76, 0.18)'
      : 'rgba(224, 90, 90, 0.16)';
    ctx.fillRect(sx, sy, lado, lado);
    ctx.strokeStyle = o.valido ? '#e8b64c' : '#e05a5a';
    ctx.lineWidth = Math.max(1, Math.round(this.dpr));
    ctx.strokeRect(sx + 0.5, sy + 0.5, lado - 1, lado - 1);

    // En capa de pared, un aspa interior distingue de un vistazo en qué capa
    // vas a actuar.
    if (o.capa === 'pared') {
      ctx.beginPath();
      ctx.moveTo(sx + lado * 0.3, sy + lado * 0.3);
      ctx.lineTo(sx + lado * 0.7, sy + lado * 0.7);
      ctx.moveTo(sx + lado * 0.7, sy + lado * 0.3);
      ctx.lineTo(sx + lado * 0.3, sy + lado * 0.7);
      ctx.stroke();
    }
  }

  /**
   * Agua y lava. Se pintan encima de todo lo que hay dentro del líquido —
   * tiles, objetos, jugador y enemigos— porque un personaje sumergido tiene que
   * verse a través del agua, no delante de ella.
   *
   * Cada celda se dibuja con la altura que marca su nivel, así una celda medio
   * llena deja ver el hueco de arriba y la superficie de una charca queda
   * escalonada en vez de plana. La celda que tiene líquido encima se pinta
   * entera: sin eso, cada fila enseñaría una raya del fondo entre celda y celda.
   */
  private liquidos(mundo: Mundo, ox: number, oy: number, tiempo: number): void {
    const { ctx, camara } = this;
    const z = camara.zoom;
    const { tx0, ty0, tx1, ty1 } = camara.tilesVisibles();
    ctx.save();
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const nivel = mundo.getLiquido(tx, ty);
        if (nivel <= MINIMO) continue;
        const lava = mundo.esLava(tx, ty);
        const lleno = mundo.getLiquido(tx, ty - 1) > MINIMO;
        const fraccion = lleno ? 1 : nivel / 255;
        const alto = Math.max(1, Math.round(TILE * fraccion * z));
        const sx = ox + tx * TILE * z;
        const sy = oy + (ty + 1) * TILE * z - alto;

        // La lava tapa del todo. El 0,88 de antes no se notaba porque detrás
        // siempre había una pared negra, pero en cuanto el inframundo pasó a
        // enseñar su fondo, ese 12 % dejaba ver las agujas de roca *dentro* del
        // lago: unos dientes oscuros flotando en la lava. Y es que la lava no es
        // transparente; el agua sí.
        ctx.globalAlpha = lava ? 1 : 0.62;
        ctx.fillStyle = lava ? '#d84a1b' : '#2f6fb5';
        ctx.fillRect(sx, sy, TILE * z, alto);

        // Una franja más clara en la superficie, ondulando despacio: es lo que
        // hace que el agua parezca líquida y no un rectángulo azul.
        if (!lleno) {
          const onda = Math.sin(tiempo / 340 + tx * 0.6) * 0.5 + 0.5;
          ctx.globalAlpha = lava ? 0.9 : 0.5;
          ctx.fillStyle = lava ? '#ffb347' : '#7fc4f0';
          ctx.fillRect(sx, sy, TILE * z, Math.max(1, Math.round((1 + onda) * z)));
        }
      }
    }
    ctx.restore();
  }

  /** Enemigos. Destellan en blanco el instante que sigue a un golpe. */
  private enemigos(lista: readonly Enemigo[], ox: number, oy: number, epoca: EpocaVisual): void {
    const { ctx, camara } = this;
    const z = camara.zoom;
    for (const e of lista) {
      if (!e.vivo) continue;
      const c = e.caja;
      const molde = this.sprites.moldeDe(e.especie);
      const sx = ox + Math.round((c.x + molde.offX) * z);
      const sy = oy + Math.round((c.y + molde.offY) * z);

      if (c.enSuelo && epoca.sombras) this.sombra(c.x, c.y + c.alto, c.ancho, ox, oy, 0.85);

      const def = ENEMIGOS[e.especie];
      if (!epoca.sprites) {
        // Los colores de cada especie existen desde 2.0.0 justo porque así se
        // dibujaban: una caja de su color con la base en sombra.
        this.caja(
          ox + Math.round(c.x * z),
          oy + Math.round(c.y * z),
          c.ancho * z,
          c.alto * z,
          def.color,
          def.colorOscuro,
          c.mirando,
        );
        if (epoca.barrasEnemigo) this.barraEnemigo(e, ox, oy);
        continue;
      }

      const frame = Math.floor(e.animReloj * 0.35);

      this.sprites.enemigo(ctx, e.especie, frame, c.mirando, sx, sy, z);

      // Destello del impacto: el sprite se repinta en blanco puro encima de sí
      // mismo. Con `source-atop` respeta su silueta, así que no hace falta una
      // segunda versión blanca de cada bicho en el atlas.
      const tocado = e.salud.desdeGolpe < 6;
      if (tocado) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 * (1 - e.salud.desdeGolpe / 6);
        this.sprites.enemigo(ctx, e.especie, frame, c.mirando, sx, sy, z);
        this.sprites.enemigo(ctx, e.especie, frame, c.mirando, sx, sy, z);
        ctx.restore();
      }

      // Barra de vida solo cuando está herido: llenar la pantalla de barras
      // llenas no informa de nada.
      if (epoca.barrasEnemigo && e.salud.vida < e.salud.vidaMax) {
        const pct = e.salud.vida / e.salud.vidaMax;
        const bx = ox + Math.round(c.x * z);
        const by = oy + Math.round(c.y * z) - 6 * z;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(bx - 1, by - 1, c.ancho * z + 2, 3 * z + 2);
        ctx.fillStyle = pct > 0.5 ? '#7bc86c' : pct > 0.25 ? '#e8b64c' : '#e05a5a';
        ctx.fillRect(bx, by, c.ancho * z * pct, 3 * z);
      }
    }
  }

  /** Arco del arma mientras dura el mandoble. */
  private golpe(g: Golpe, jugador: Jugador, ox: number, oy: number): void {
    const caja = cajaGolpe(g, jugador.caja);
    if (!caja) return;
    const { ctx, camara } = this;
    const z = camara.zoom;
    const avance = 1 - g.restante / 8;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.4 * (1 - avance);
    ctx.fillStyle = defObjeto(g.arma).color;
    // El arco se abre a medida que avanza el golpe: da sensación de barrido
    // sin necesidad de sprites de animación. Se abre a lo ancho o a lo alto
    // según por dónde haya salido el mandoble, para que el gesto se lea igual
    // apuntando al lado que apuntando al techo.
    const apertura = 0.35 + 0.65 * avance;
    if (g.sentido === 'lado') {
      const alto = caja.alto * apertura;
      ctx.fillRect(
        ox + Math.round(caja.x * z),
        oy + Math.round((caja.y + (caja.alto - alto) / 2) * z),
        caja.ancho * z,
        alto * z,
      );
    } else {
      const ancho = caja.ancho * apertura;
      ctx.fillRect(
        ox + Math.round((caja.x + (caja.ancho - ancho) / 2) * z),
        oy + Math.round(caja.y * z),
        ancho * z,
        caja.alto * z,
      );
    }
    ctx.restore();
  }

  /**
   * Flechas: un astil de cuatro píxeles con punta, girado hacia donde vuela.
   *
   * Es el único sitio del render donde se rota algo. Rotar pixel art suele
   * quedar sucio, pero una flecha es tan pequeña —y va tan deprisa— que el
   * único detalle que se lee es hacia dónde apunta; dibujarla siempre recta
   * sería peor.
   */
  private flechas(lista: readonly Flecha[], ox: number, oy: number): void {
    if (lista.length === 0) return;
    const { ctx, camara } = this;
    const z = camara.zoom;
    for (const f of lista) {
      if (!f.vivo) continue;
      // Las clavadas parpadean justo antes de irse: avisa de que se van a
      // perder sin tener que mirar un contador.
      if (f.clavada && f.edad > VIDA_CLAVADA - 30 && Math.floor(f.edad / 4) % 2 === 0) {
        continue;
      }
      ctx.save();
      ctx.translate(ox + f.x * z, oy + f.y * z);
      ctx.rotate(f.angulo);
      // El asta va del color de la punta: es lo único que distingue en el aire
      // una flecha de hueso de una de fuego, y saber cuál estás gastando sin
      // abrir el inventario importa cuando las buenas se acaban.
      ctx.fillStyle = f.color;
      ctx.fillRect(-9 * z, -0.5 * z, 10 * z, z);
      ctx.fillStyle = '#d8d2c0';
      ctx.fillRect(-9 * z, -1.5 * z, 3 * z, z);
      ctx.fillRect(-9 * z, 0.5 * z, 3 * z, z);
      ctx.fillStyle = '#8d8d97';
      ctx.fillRect(z, -z, 2 * z, 2 * z);
      ctx.restore();
    }
  }

  /** Objetos por el suelo: un cuadradito del color del objeto, balanceándose. */
  private drops(lista: readonly Drop[], ox: number, oy: number): void {
    if (lista.length === 0) return;
    const { ctx, camara } = this;
    const z = camara.zoom;
    const lado = TAMANO_DROP * z;
    for (const d of lista) {
      if (!d.vivo) continue;
      // El balanceo es puramente visual y va con la edad, así que cada objeto
      // sube y baja con su propia fase.
      const bob = Math.sin(d.edad / 12) * 1.5;
      const sx = ox + Math.round(d.x * z);
      const sy = oy + Math.round((d.y + bob) * z);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(sx + z, sy + z, lado, lado);
      ctx.fillStyle = defObjeto(d.objeto).color;
      ctx.fillRect(sx, sy, lado, lado);
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = Math.max(1, z / 2);
      ctx.strokeRect(sx + 0.5, sy + 0.5, lado - 1, lado - 1);
    }
  }

  /**
   * Rótulos de las zonas del laboratorio, anclados en X al mundo pero fijos en
   * la parte baja de la pantalla: así se leen sin importar a qué altura esté la
   * cámara.
   */
  private zonas(zonas: Zona[], ox: number): void {
    const { ctx, camara } = this;
    const escala = this.dpr;
    ctx.font = `${Math.round(11 * escala)}px ui-monospace, monospace`;
    ctx.textBaseline = 'bottom';
    // Por encima del HUD de construcción, que vive pegado al borde inferior.
    const sy = this.altoCanvas - 106 * escala;
    for (const z of zonas) {
      const sx = ox + z.tx * TILE * camara.zoom;
      if (sx < -260 * escala || sx > this.anchoCanvas) continue;
      const ancho = ctx.measureText(z.etiqueta).width + 10 * escala;
      ctx.fillStyle = 'rgba(13, 17, 23, 0.7)';
      ctx.fillRect(sx, sy - 14 * escala, ancho, 18 * escala);
      ctx.fillStyle = '#e8b64c';
      ctx.fillText(z.etiqueta, sx + 5 * escala, sy);
    }
  }

  dibujar(e: Escena): void {
    const ox = this.camara.origenX();
    const oy = this.camara.origenY();
    const { tx0, ty0, tx1, ty1 } = this.camara.tilesVisibles();
    const recalculada = e.motorLuz.actualizar(tx0, ty0, tx1, ty1, e.reloj.luzSolar);

    this.biomaFondo = e.bioma;
    this.baseFondoY = e.baseFondoY ?? 0;
    this.cielo(e.reloj, e.epoca);
    this.chunks(e.mundo, ox, oy);
    this.picado(e.mundo, e.picado, ox, oy);
    this.drops(e.drops, ox, oy);
    this.flechas(e.flechas, ox, oy);
    this.enemigos(e.enemigos, ox, oy, e.epoca);
    if (e.jugador.caja.enSuelo && e.epoca.sombras) {
      const c = e.jugador.caja;
      this.sombra(c.x, c.y + c.alto, c.ancho, ox, oy);
    }
    this.jugador(e.jugador, e.alpha, ox, oy, e.sumergido, e.enMano, e.armadura, e.epoca);
    this.golpe(e.golpe, e.jugador, ox, oy);
    // Las partículas van delante de los cuerpos pero detrás del agua: los
    // cascotes que caen a un lago tienen que verse a través de él.
    e.particulas.dibujar(this.ctx, ox, oy, this.camara.zoom);
    this.liquidos(e.mundo, ox, oy, performance.now());
    // La luz va después del mundo y del personaje, pero antes de la interfaz:
    // el recuadro del puntero tiene que verse igual dentro de una cueva.
    this.luz(e.motorLuz, e.reloj, recalculada, ox, oy);
    // Las auras de élite van después de la luz y no con los demás enemigos.
    // Dibujadas antes, la pasada de oscuridad las multiplicaba por el negro de
    // la noche y el halo quedaba en una mancha parda: justo en el momento en
    // que más falta hace ver que ese zombi no es un zombi normal.
    this.aurasElite(e.enemigos, ox, oy);
    this.vineta(e.reloj);
    this.objetivo(e.objetivo, ox, oy);
    this.zonas(e.zonas, ox);
  }

  /**
   * El halo de los enemigos de élite.
   *
   * Late en vez de quedarse fijo porque un resplandor constante se confunde
   * con la luz de una antorcha del fondo, y lo que tiene que decir esto es
   * "eso de ahí pega dos veces y media". Se dibuja en modo aditivo y por
   * encima de la oscuridad para que se lea igual de noche cerrada que dentro
   * de una casa alumbrada.
   */
  private aurasElite(lista: readonly Enemigo[], ox: number, oy: number): void {
    const { ctx, camara } = this;
    const z = camara.zoom;
    let abierto = false;
    for (const e of lista) {
      if (!e.vivo || !e.elite) continue;
      if (!abierto) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        abierto = true;
      }
      const c = e.caja;
      const pulso = 0.5 + 0.5 * Math.sin(e.animReloj * 0.09);
      const rx = ox + Math.round((c.x + c.ancho / 2) * z);
      const ry = oy + Math.round((c.y + c.alto / 2) * z);
      const radio = Math.max(c.ancho, c.alto) * z * (0.75 + pulso * 0.15);
      const halo = ctx.createRadialGradient(rx, ry, 0, rx, ry, radio);
      halo.addColorStop(0, `rgba(255,120,90,${0.5 + pulso * 0.2})`);
      halo.addColorStop(0.45, `rgba(230,40,30,${0.3 + pulso * 0.14})`);
      halo.addColorStop(1, 'rgba(200,20,20,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(rx, ry, radio, 0, Math.PI * 2);
      ctx.fill();
    }
    if (abierto) ctx.restore();
  }

  /**
   * Viñeta: un oscurecido suave en los bordes de la pantalla.
   *
   * Concentra la mirada en el centro, que es donde está el personaje, y de paso
   * disimula el corte recto del borde del canvas. Es el retoque más barato que
   * existe para que una escena deje de parecer una captura de un editor.
   */
  private vineta(reloj: Reloj): void {
    const { ctx } = this;
    const w = this.anchoCanvas;
    const h = this.altoCanvas;
    // La viñeta se suma al multiply de la luz, así que de noche oscurecía dos
    // veces y la pantalla se quedaba en negro. Se ata al sol: de día marca los
    // bordes, de noche casi desaparece porque la escena ya está oscura.
    const fuerza = 0.12 + (reloj.luzSolar / 255) * 0.22;
    ctx.save();
    ctx.globalAlpha = fuerza;
    if (!this.gradienteVineta || this.vinetaW !== w || this.vinetaH !== h) {
      const g = ctx.createRadialGradient(
        w / 2,
        h / 2,
        Math.min(w, h) * 0.36,
        w / 2,
        h / 2,
        Math.max(w, h) * 0.72,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      this.gradienteVineta = g;
      this.vinetaW = w;
      this.vinetaH = h;
    }
    ctx.fillStyle = this.gradienteVineta;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

import { TILE } from '../core/constants';
import { css, type Reloj } from '../engine/time';
import type { Jugador } from '../entities/player';
import type { MotorLuz } from '../world/lighting';
import { TAMANO_DROP, type Drop } from '../entities/drop';
import type { Enemigo } from '../entities/enemies';
import { cajaGolpe, type Golpe } from '../entities/combat';
import { defObjeto } from '../items/items';
import type { Capa, Picado } from '../world/edit';
import { durezaObjetivo, etapaGrieta } from '../world/edit';
import { MINIMO } from '../world/liquids';
import type { Mundo } from '../world/world';
import type { Zona } from '../world/testLevel';
import { Camara } from './camera';
import { CacheChunks, CHUNK_RENDER } from './chunkCache';
import { Fondo } from './fondo';
import type { Particulas } from './particles';
import {
  crearSprites,
  JUGADOR_OFF_X,
  JUGADOR_OFF_Y,
  type Pose,
  type Sprites,
} from './sprites';
import { crearTileset, type Tileset } from './tileset';

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
  particulas: Particulas;
  /** Fracción del jugador bajo líquido, para elegir la pose de nado. */
  sumergido: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  readonly camara = new Camara();
  readonly cache: CacheChunks;
  private readonly tileset: Tileset;
  private readonly sprites: Sprites;
  private readonly fondo = new Fondo();
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
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(this.lienzo.clientWidth * this.dpr);
    const h = Math.floor(this.lienzo.clientHeight * this.dpr);
    if (this.lienzo.width !== w || this.lienzo.height !== h) {
      this.lienzo.width = w;
      this.lienzo.height = h;
    }
    this.ctx.imageSmoothingEnabled = false;
    // Zoom adaptativo: apuntamos a unos 44 tiles de ancho de vista, que es la
    // escala a la que se lee bien el terreno sin marearse.
    this.camara.zoom = Math.min(4, Math.max(2, Math.round(w / (44 * TILE))));
    this.camara.redimensionar(w, h);
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

  private cielo(reloj: Reloj): void {
    const { ctx } = this;
    const [alto, medio, bajo] = reloj.colorCielo;
    const g = ctx.createLinearGradient(0, 0, 0, this.altoCanvas);
    g.addColorStop(0, css(alto));
    g.addColorStop(0.55, css(medio));
    g.addColorStop(1, css(bajo));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.anchoCanvas, this.altoCanvas);
    this.estrellas(reloj);
    this.astro(reloj);
    this.fondo.dibujar(
      ctx,
      reloj,
      this.camara.x,
      this.camara.y,
      this.anchoCanvas,
      this.altoCanvas,
      this.dpr,
      performance.now(),
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
        const l = buf[i]! / 255;
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

  private jugador(j: Jugador, alpha: number, ox: number, oy: number, sumergido: number): void {
    const { ctx, camara } = this;
    // Interpolación entre el tick anterior y el actual: el movimiento se ve
    // fluido aunque la simulación vaya a 60 fijos.
    const wx = j.xPrev + (j.caja.x - j.xPrev) * alpha;
    const wy = j.yPrev + (j.caja.y - j.yPrev) * alpha;
    const u = camara.zoom;
    const { pose, frame } = this.animarJugador(j, sumergido, performance.now());

    this.sprites.jugador(
      ctx,
      pose,
      frame,
      j.caja.mirando,
      ox + Math.round((wx + JUGADOR_OFF_X) * u),
      oy + Math.round((wy + JUGADOR_OFF_Y) * u),
      u,
    );
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

        ctx.globalAlpha = lava ? 0.88 : 0.62;
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
  private enemigos(lista: readonly Enemigo[], ox: number, oy: number): void {
    const { ctx, camara } = this;
    const z = camara.zoom;
    for (const e of lista) {
      if (!e.vivo) continue;
      const c = e.caja;
      const molde = this.sprites.moldeDe(e.especie);
      const sx = ox + Math.round((c.x + molde.offX) * z);
      const sy = oy + Math.round((c.y + molde.offY) * z);

      if (c.enSuelo) this.sombra(c.x, c.y + c.alto, c.ancho, ox, oy, 0.85);

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
      if (e.salud.vida < e.salud.vidaMax) {
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
    // sin necesidad de sprites de animación.
    const alto = caja.alto * (0.35 + 0.65 * avance);
    ctx.fillRect(
      ox + Math.round(caja.x * z),
      oy + Math.round((caja.y + (caja.alto - alto) / 2) * z),
      caja.ancho * z,
      alto * z,
    );
    ctx.restore();
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

    this.cielo(e.reloj);
    this.chunks(e.mundo, ox, oy);
    this.picado(e.mundo, e.picado, ox, oy);
    this.drops(e.drops, ox, oy);
    this.enemigos(e.enemigos, ox, oy);
    if (e.jugador.caja.enSuelo) {
      const c = e.jugador.caja;
      this.sombra(c.x, c.y + c.alto, c.ancho, ox, oy);
    }
    this.jugador(e.jugador, e.alpha, ox, oy, e.sumergido);
    this.golpe(e.golpe, e.jugador, ox, oy);
    // Las partículas van delante de los cuerpos pero detrás del agua: los
    // cascotes que caen a un lago tienen que verse a través de él.
    e.particulas.dibujar(this.ctx, ox, oy, this.camara.zoom);
    this.liquidos(e.mundo, ox, oy, performance.now());
    // La luz va después del mundo y del personaje, pero antes de la interfaz:
    // el recuadro del puntero tiene que verse igual dentro de una cueva.
    this.luz(e.motorLuz, e.reloj, recalculada, ox, oy);
    this.vineta(e.reloj);
    this.objetivo(e.objetivo, ox, oy);
    this.zonas(e.zonas, ox);
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

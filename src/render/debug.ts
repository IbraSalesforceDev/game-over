import { CHUNK, TILE } from '../core/constants';
import type { Jugador } from '../entities/player';
import type { Camara } from './camera';

/**
 * Overlay de diagnóstico (F3).
 *
 * Entra ya en la fase 1 y se queda para siempre: sin ver la caja de colisión,
 * los tiles consultados y el estado del salto, afinar la física es adivinar.
 */

export interface EstadoDebug {
  fps: number;
  msFrame: number;
  activo: boolean;
  hitbox: boolean;
  chunks: boolean;
  /** Lienzos de chunk vivos en la caché. */
  chunksVivos: number;
  /** Tile al que apunta el ratón. */
  ratonTx: number;
  ratonTy: number;
  /** Semilla del mundo, para poder repetir la partida. */
  semilla: string;
  /** Segundos desde el último guardado; -1 si la partida no se guarda. */
  segundosDesdeGuardado: number;
  /** Hora del mundo. */
  hora: string;
  /** Nivel de luz bajo el puntero, 0-255. */
  luzRaton: number;
  /** Objetos sueltos por el suelo. */
  drops: number;
  /** Enemigos vivos alrededor. */
  enemigos: number;
}

export function crearEstadoDebug(): EstadoDebug {
  return {
    fps: 0,
    msFrame: 0,
    // Apagado de fábrica. Estuvo encendido mientras el overlay era la única
    // forma de ver qué hacía la física, pero recibir a quien abre el juego con
    // catorce líneas de diagnóstico y la caja de colisión pintada encima del
    // personaje es enseñar el andamio en vez de la casa.
    activo: false,
    hitbox: true,
    chunks: false,
    chunksVivos: 0,
    ratonTx: 0,
    ratonTy: 0,
    semilla: '',
    segundosDesdeGuardado: -1,
    hora: '',
    luzRaton: 0,
    drops: 0,
    enemigos: 0,
  };
}

export function dibujarDebug(
  ctx: CanvasRenderingContext2D,
  cam: Camara,
  j: Jugador,
  est: EstadoDebug,
  dpr: number,
): void {
  if (!est.activo) return;
  const c = j.caja;

  if (est.chunks) {
    ctx.strokeStyle = 'rgba(232, 182, 76, 0.35)';
    ctx.lineWidth = 1;
    const paso = CHUNK * TILE;
    const desdeX = Math.floor(cam.x / paso) * paso;
    for (let wx = desdeX; wx < cam.x + cam.ancho + paso; wx += paso) {
      const sx = Math.round(cam.pintarX(wx)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, ctx.canvas.height);
      ctx.stroke();
    }
    const desdeY = Math.floor(cam.y / paso) * paso;
    for (let wy = desdeY; wy < cam.y + cam.alto + paso; wy += paso) {
      const sy = Math.round(cam.pintarY(wy)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(ctx.canvas.width, sy);
      ctx.stroke();
    }
  }

  if (est.hitbox) {
    // Tiles que la caja está tocando: son exactamente los que consulta la
    // colisión, así que si algo falla se ve aquí.
    // Mismo epsilon que la física, para que el resaltado enseñe exactamente
    // los tiles que consulta la colisión.
    const tx0 = Math.floor(c.x / TILE);
    const tx1 = Math.floor((c.x + c.ancho - 1e-6) / TILE);
    const ty0 = Math.floor(c.y / TILE);
    const ty1 = Math.floor((c.y + c.alto - 1e-6) / TILE);
    ctx.fillStyle = 'rgba(232, 182, 76, 0.16)';
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        ctx.fillRect(
          Math.round(cam.pintarX(tx * TILE)),
          Math.round(cam.pintarY(ty * TILE)),
          TILE * cam.zoom,
          TILE * cam.zoom,
        );
      }
    }

    ctx.strokeStyle = c.enSuelo ? '#5fd68a' : '#e05a5a';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeRect(
      Math.round(cam.pintarX(c.x)) + 0.5,
      Math.round(cam.pintarY(c.y)) + 0.5,
      c.ancho * cam.zoom,
      c.alto * cam.zoom,
    );

    // Vector de velocidad, escalado para que se vea.
    const cx = cam.pintarX(c.x + c.ancho / 2);
    const cy = cam.pintarY(c.y + c.alto / 2);
    ctx.strokeStyle = '#8fd6ff';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + c.vx * cam.zoom * 4, cy + c.vy * cam.zoom * 4);
    ctx.stroke();
  }

  const lineas = [
    `${est.fps.toFixed(0)} fps · ${est.msFrame.toFixed(2)} ms`,
    `pos  ${c.x.toFixed(1)}, ${c.y.toFixed(1)} px`,
    `tile ${Math.floor(c.x / TILE)}, ${Math.floor(c.y / TILE)}`,
    `vel  ${c.vx.toFixed(2)}, ${c.vy.toFixed(2)} px/tick`,
    `suelo ${c.enSuelo ? 'sí' : 'no'} · mirando ${c.mirando > 0 ? '→' : '←'}`,
    `coyote ${c.ticksCoyote} · buffer ${c.ticksBuffer} · salto ${c.ticksSalto}`,
    `última caída ${c.ultimaCaida.toFixed(1)} tiles`,
    `ratón ${est.ratonTx}, ${est.ratonTy} · chunks ${est.chunksVivos}`,
    `semilla ${est.semilla} · ${est.hora}`,
    `luz bajo el puntero ${est.luzRaton} · drops ${est.drops} · enemigos ${est.enemigos}`,
    est.segundosDesdeGuardado < 0
      ? 'sin guardado'
      : `guardado hace ${est.segundosDesdeGuardado} s`,
    `F2 guardar · F3 overlay · F4 constantes · F5 chunks · R reaparecer`,
  ];

  const escala = dpr;
  const alturaLinea = 15 * escala;
  const ancho = 280 * escala;
  ctx.fillStyle = 'rgba(13, 17, 23, 0.78)';
  ctx.fillRect(8 * escala, 8 * escala, ancho, lineas.length * alturaLinea + 12 * escala);
  ctx.font = `${Math.round(11 * escala)}px ui-monospace, monospace`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#d8cfc0';
  lineas.forEach((linea, i) => {
    ctx.fillText(linea, 16 * escala, (16 + i * 15) * escala);
  });
}

import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { crearPuntero } from './engine/mouse';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './entities/physics';
import { actualizarJugador, crearJugador, reaparecer } from './entities/player';
import { crearEstadoDebug, dibujarDebug } from './render/debug';
import { Renderer, type Objetivo } from './render/renderer';
import { TILE } from './core/constants';
import {
  avanzarPicado,
  crearPicado,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  reiniciarPicado,
  type Capa,
} from './world/edit';
import { crearNivelPruebas } from './world/testLevel';
import { crearHud, PALETA } from './ui/hud';
import { crearTuner } from './ui/tuner';

/** Muestra el panel de error con el detalle, en vez de dejar la pantalla negra. */
function mostrarError(e: unknown): void {
  const aviso = document.getElementById('aviso-error');
  const detalle = document.getElementById('detalle-error');
  if (detalle) {
    detalle.textContent = e instanceof Error ? `${e.message}\n\n${e.stack ?? ''}` : String(e);
  }
  if (aviso) aviso.style.display = 'flex';
  document.getElementById('cargador')?.classList.add('oculto');
  console.error(e);
}

function progreso(pct: number, texto: string): void {
  const barra = document.getElementById('barra-relleno');
  const label = document.getElementById('texto-carga');
  if (barra) barra.style.width = `${pct}%`;
  if (label) label.textContent = texto;
}

function arrancar(): void {
  const lienzo = document.getElementById('lienzo');
  if (!(lienzo instanceof HTMLCanvasElement)) throw new Error('Falta el canvas #lienzo');
  const capaUI = document.getElementById('capa-ui');
  if (!capaUI) throw new Error('Falta la capa de interfaz #capa-ui');

  progreso(20, 'Levantando el terreno…');
  const nivel = crearNivelPruebas();
  const mundo = nivel.mundo;

  progreso(55, 'Pintando los tiles…');
  const renderer = new Renderer(lienzo);

  progreso(80, 'Despertando al personaje…');
  const jugador = crearJugador(nivel.spawnTx, nivel.spawnTy);
  renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);

  const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
  const debug = crearEstadoDebug();
  const tuner = crearTuner(capaUI, ajustes);
  const hud = crearHud(capaUI);
  const entrada = crearEntrada();
  const puntero = crearPuntero(lienzo);

  // --- Estado de construcción ---
  const picado = crearPicado();
  let material = 0;
  let capa: Capa = 'bloque';
  const objetivo: Objetivo = { tx: 0, ty: 0, valido: false, visible: false, capa };
  hud.refrescar(material, capa);

  function seleccionar(i: number): void {
    material = ((i % PALETA.length) + PALETA.length) % PALETA.length;
    hud.refrescar(material, capa);
  }

  entrada.alPulsar('F3', () => (debug.activo = !debug.activo));
  entrada.alPulsar('F4', () => tuner.alternar());
  entrada.alPulsar('F5', () => (debug.chunks = !debug.chunks));
  entrada.alPulsar('Tab', () => {
    capa = capa === 'bloque' ? 'pared' : 'bloque';
    reiniciarPicado(picado);
    hud.refrescar(material, capa);
  });
  PALETA.forEach((_, i) => entrada.alPulsar(`Digit${i + 1}`, () => seleccionar(i)));
  entrada.alPulsar('KeyR', () => {
    reaparecer(jugador);
    renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);
  });

  window.addEventListener('resize', () => {
    renderer.redimensionar();
    // El zoom puede haber cambiado, pero los lienzos de chunk son de resolución
    // fija: no hace falta repintarlos.
  });

  /** Un tick de edición: apuntar, picar y colocar. */
  function editar(): void {
    const rueda = puntero.consumirRueda();
    if (rueda !== 0) seleccionar(material + rueda);

    const wx = renderer.camara.aMundoX(puntero.sx);
    const wy = renderer.camara.aMundoY(puntero.sy);
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    objetivo.tx = tx;
    objetivo.ty = ty;
    objetivo.capa = capa;
    objetivo.visible = puntero.dentro;
    debug.ratonTx = tx;
    debug.ratonTy = ty;

    const id = PALETA[material]!;
    // El recuadro anticipa la acción que hará el botón que tengas pulsado; sin
    // pulsar nada, enseña si ahí se puede construir.
    const previo = puntero.izq
      ? puedeMinar(mundo, jugador.caja, tx, ty, capa)
      : capa === 'bloque'
        ? puedeColocarBloque(mundo, jugador.caja, tx, ty, id)
        : puedeColocarPared(mundo, jugador.caja, tx, ty);
    objetivo.valido = previo.ok;

    if (puntero.izq) {
      if (previo.ok) {
        if (avanzarPicado(mundo, picado, tx, ty, capa)) renderer.cache.invalidar(tx, ty);
      } else {
        reiniciarPicado(picado);
      }
    } else if (picado.progreso > 0) {
      reiniciarPicado(picado);
    }

    if (puntero.der && previo.ok) {
      if (capa === 'bloque') mundo.setTile(tx, ty, id);
      else mundo.setPared(tx, ty, id);
      renderer.cache.invalidar(tx, ty);
    }
  }

  const bucle = crearBucle(
    () => {
      editar();
      actualizarJugador(mundo, jugador, entrada.estado(), ajustes);
      entrada.finTick();
      // Red de seguridad: si algo lo saca del mundo, vuelve al spawn.
      if (jugador.caja.y > mundo.alto * TILE + 200) reaparecer(jugador);
    },
    (alpha) => {
      renderer.camara.seguir(
        jugador.caja.x + jugador.caja.ancho / 2,
        jugador.caja.y + jugador.caja.alto / 2,
        mundo.ancho,
        mundo.alto,
      );
      renderer.dibujar(mundo, jugador, alpha, nivel.zonas, picado, objetivo);

      debug.fps = bucle.fps;
      debug.msFrame = bucle.msFrame;
      debug.chunksVivos = renderer.cache.tamano;
      dibujarDebug(renderer.ctx, renderer.camara, jugador, debug, renderer.escala);
    },
  );

  progreso(100, 'Listo');
  bucle.arrancar();
  setTimeout(() => document.getElementById('cargador')?.classList.add('oculto'), 250);
}

try {
  arrancar();
} catch (e) {
  mostrarError(e);
}

window.addEventListener('error', (e) => mostrarError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => mostrarError(e.reason));

import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './entities/physics';
import { actualizarJugador, crearJugador, reaparecer } from './entities/player';
import { crearEstadoDebug, dibujarDebug } from './render/debug';
import { Renderer } from './render/renderer';
import { crearNivelPruebas } from './world/testLevel';
import { crearTuner } from './ui/tuner';

/** Muestra el panel de error con el detalle, en vez de dejar la pantalla negra. */
function mostrarError(e: unknown): void {
  const aviso = document.getElementById('aviso-error');
  const detalle = document.getElementById('detalle-error');
  if (detalle) detalle.textContent = e instanceof Error ? `${e.message}\n\n${e.stack ?? ''}` : String(e);
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

  progreso(55, 'Pintando los tiles…');
  const renderer = new Renderer(lienzo);

  progreso(80, 'Despertando al personaje…');
  const jugador = crearJugador(nivel.spawnTx, nivel.spawnTy);
  renderer.camara.centrar(
    jugador.caja.x,
    jugador.caja.y,
    nivel.mundo.ancho,
    nivel.mundo.alto,
  );

  const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
  const debug = crearEstadoDebug();
  const tuner = crearTuner(capaUI, ajustes);
  const entrada = crearEntrada();

  entrada.alPulsar('F3', () => (debug.activo = !debug.activo));
  entrada.alPulsar('F4', () => tuner.alternar());
  entrada.alPulsar('F5', () => (debug.chunks = !debug.chunks));
  entrada.alPulsar('KeyR', () => {
    reaparecer(jugador);
    renderer.camara.centrar(
      jugador.caja.x,
      jugador.caja.y,
      nivel.mundo.ancho,
      nivel.mundo.alto,
    );
  });

  window.addEventListener('resize', () => renderer.redimensionar());

  const bucle = crearBucle(
    () => {
      actualizarJugador(nivel.mundo, jugador, entrada.estado(), ajustes);
      entrada.finTick();
      // Red de seguridad: si algo lo saca del mundo, vuelve al spawn.
      if (jugador.caja.y > nivel.mundo.alto * 16 + 200) reaparecer(jugador);
    },
    (alpha) => {
      renderer.camara.seguir(
        jugador.caja.x + jugador.caja.ancho / 2,
        jugador.caja.y + jugador.caja.alto / 2,
        nivel.mundo.ancho,
        nivel.mundo.alto,
      );
      renderer.dibujar(nivel.mundo, jugador, alpha, nivel.zonas);

      debug.fps = bucle.fps;
      debug.msFrame = bucle.msFrame;
      dibujarDebug(
        renderer.ctx,
        renderer.camara,
        jugador,
        debug,
        Math.min(window.devicePixelRatio || 1, 2),
      );
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

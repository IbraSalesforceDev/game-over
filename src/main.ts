import { TICK, TILE } from './core/constants';
import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { Reloj } from './engine/time';
import { crearPuntero } from './engine/mouse';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './entities/physics';
import { actualizarJugador, crearJugador, reaparecer } from './entities/player';
import { crearEstadoDebug, dibujarDebug } from './render/debug';
import { Renderer, type Objetivo } from './render/renderer';
import { crearAviso } from './ui/aviso';
import { crearBarra } from './ui/hotbar';
import { mostrarMenu, type Eleccion } from './ui/menu';
import { crearTuner } from './ui/tuner';
import { crearAlmacen, nuevoId, type MetaMundo, type SaveAdapter } from './world/almacen';
import {
  avanzarPicado,
  crearPicado,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  reiniciarPicado,
  type Capa,
} from './world/edit';
import { leerOpciones, prepararEscenario } from './world/escenario';
import { MotorLuz } from './world/lighting';
import { Inventario } from './items/inventory';
import { equipoInicial, mejorPico } from './items/equipo';
import { defObjeto, dropDePared, dropDeTile } from './items/items';
import {
  actualizarDrop,
  fusionarDrops,
  soltar,
  type Drop,
} from './entities/drop';
import {
  desempaquetar,
  empaquetar,
  HORA_POR_DEFECTO,
  VERSION_FORMATO,
  type EstadoPartida,
} from './world/save';
import type { Zona } from './world/testLevel';
import type { Mundo } from './world/world';

/** Cada cuántos milisegundos se guarda solo. */
const INTERVALO_AUTOGUARDADO = 30_000;

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

function ocultarCargador(): void {
  document.getElementById('cargador')?.classList.add('oculto');
}

function mostrarCargador(): void {
  document.getElementById('cargador')?.classList.remove('oculto');
}

/** Cede el hilo para que el navegador pueda repintar la barra de carga. */
function siguienteFrame(): Promise<void> {
  return new Promise((r) => requestAnimationFrame(() => r()));
}

/** Lo que necesita el bucle para empezar, venga de generación o de disco. */
interface Partida {
  mundo: Mundo;
  estado: EstadoPartida;
  zonas: Zona[];
  id: string;
  nombre: string;
  /** El laboratorio de físicas no se guarda: es una herramienta, no una partida. */
  guardable: boolean;
}

/**
 * Genera un mundo cediendo el control entre pasos. Sin esto la pantalla de
 * carga se queda congelada y luego aparece el mundo de golpe: la barra
 * existiría solo de adorno.
 */
async function generar(
  semilla: string,
  tamano: 'pequeno' | 'mediano',
  lab: boolean,
): Promise<{ mundo: Mundo; spawnTx: number; spawnTy: number; zonas: Zona[]; semilla: string }> {
  const it = prepararEscenario({ lab, semilla, tamano, minutos: null });
  let paso = it.next();
  while (!paso.done) {
    progreso(paso.value.pct, paso.value.texto);
    await siguienteFrame();
    paso = it.next();
  }
  return paso.value;
}

function partidaNueva(
  gen: Awaited<ReturnType<typeof generar>>,
  nombre: string,
  guardable: boolean,
  minutos = HORA_POR_DEFECTO,
): Partida {
  return {
    mundo: gen.mundo,
    zonas: gen.zonas,
    id: nuevoId(),
    nombre,
    guardable,
    estado: {
      semilla: gen.semilla,
      jugador: {
        x: gen.spawnTx * TILE,
        y: gen.spawnTy * TILE,
        spawnX: gen.spawnTx * TILE,
        spawnY: gen.spawnTy * TILE,
      },
      creado: Date.now(),
      jugado: 0,
      material: 0,
      capaPared: false,
      minutos,
      inventario: equipoInicial().aDatos(),
    },
  };
}

/** Decide con qué partida se arranca: URL directa, menú, o carga de disco. */
async function elegirPartida(
  capaUI: HTMLElement,
  almacen: SaveAdapter,
  persistente: boolean,
): Promise<Partida> {
  const op = leerOpciones(window.location.search);
  const params = new URLSearchParams(window.location.search);

  // Con ?lab=1 o ?semilla= se entra directo: son enlaces para probar y para
  // compartir un mundo concreto, y pasar por el menú solo estorbaría.
  if (op.lab || params.has('semilla')) {
    const gen = await generar(op.semilla, op.tamano, op.lab);
    return partidaNueva(
      gen,
      op.lab ? 'Laboratorio' : `Semilla ${op.semilla}`,
      !op.lab,
      op.minutos ?? HORA_POR_DEFECTO,
    );
  }

  ocultarCargador();
  const eleccion: Eleccion = await mostrarMenu(capaUI, almacen, persistente);
  mostrarCargador();
  await siguienteFrame();

  if (eleccion.tipo === 'nuevo') {
    const gen = await generar(eleccion.semilla, eleccion.tamano, false);
    return partidaNueva(gen, eleccion.nombre, true, op.minutos ?? HORA_POR_DEFECTO);
  }

  progreso(30, 'Abriendo el mundo…');
  await siguienteFrame();
  const bytes = await almacen.cargar(eleccion.meta.id);
  progreso(70, 'Descomprimiendo…');
  await siguienteFrame();
  const { mundo, estado } = await desempaquetar(bytes);
  return {
    mundo,
    estado,
    zonas: [],
    id: eleccion.meta.id,
    nombre: eleccion.meta.nombre,
    guardable: true,
  };
}

async function arrancar(): Promise<void> {
  const lienzo = document.getElementById('lienzo');
  if (!(lienzo instanceof HTMLCanvasElement)) throw new Error('Falta el canvas #lienzo');
  const capaUI = document.getElementById('capa-ui');
  if (!capaUI) throw new Error('Falta la capa de interfaz #capa-ui');

  const { almacen, persistente } = await crearAlmacen();
  const partida = await elegirPartida(capaUI, almacen, persistente);
  const mundo = partida.mundo;

  progreso(96, 'Pintando los tiles…');
  const renderer = new Renderer(lienzo);

  progreso(97, 'Encendiendo el sol…');
  const reloj = new Reloj(partida.estado.minutos);
  const motorLuz = new MotorLuz(mundo);

  progreso(98, 'Despertando al personaje…');
  const jugador = crearJugador(0, 0);
  jugador.caja.x = partida.estado.jugador.x;
  jugador.caja.y = partida.estado.jugador.y;
  jugador.xPrev = jugador.caja.x;
  jugador.yPrev = jugador.caja.y;
  jugador.spawnX = partida.estado.jugador.spawnX;
  jugador.spawnY = partida.estado.jugador.spawnY;
  renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);

  const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
  const debug = crearEstadoDebug();
  debug.semilla = partida.estado.semilla;
  const tuner = crearTuner(capaUI, ajustes);
  const inventario =
    partida.estado.inventario.length > 0
      ? Inventario.desdeDatos(partida.estado.inventario)
      : equipoInicial();
  const drops: Drop[] = [];
  const aviso = crearAviso(capaUI);
  const entrada = crearEntrada();
  const puntero = crearPuntero(lienzo);

  // --- Estado de construcción ---
  const picado = crearPicado();
  let capa: Capa = partida.estado.capaPared ? 'pared' : 'bloque';
  const objetivo: Objetivo = { tx: 0, ty: 0, valido: false, visible: false, capa };
  const barra = crearBarra(capaUI, inventario, () => reiniciarPicado(picado));
  barra.seleccionar(partida.estado.material);
  barra.refrescar(capa);

  // --- Guardado ---
  const inicioSesion = Date.now();
  const jugadoPrevio = partida.estado.jugado;
  let guardando = false;
  let ultimoGuardado = Date.now();

  async function guardar(motivo: 'auto' | 'manual'): Promise<void> {
    if (!partida.guardable || guardando) return;
    guardando = true;
    try {
      partida.estado.jugador = {
        x: jugador.caja.x,
        y: jugador.caja.y,
        spawnX: jugador.spawnX,
        spawnY: jugador.spawnY,
      };
      partida.estado.jugado = jugadoPrevio + (Date.now() - inicioSesion);
      partida.estado.material = barra.seleccion;
      partida.estado.inventario = inventario.aDatos();
      partida.estado.capaPared = capa === 'pared';
      partida.estado.minutos = reloj.minutos;

      const bytes = await empaquetar(mundo, partida.estado);
      const meta: MetaMundo = {
        id: partida.id,
        nombre: partida.nombre,
        semilla: partida.estado.semilla,
        ancho: mundo.ancho,
        alto: mundo.alto,
        creado: partida.estado.creado,
        modificado: Date.now(),
        jugado: partida.estado.jugado,
        bytes: bytes.length,
        version: VERSION_FORMATO,
      };
      await almacen.guardar(partida.id, meta, bytes);
      ultimoGuardado = Date.now();
      if (motivo === 'manual') aviso.mostrar(`Guardado · ${Math.round(bytes.length / 1024)} KB`);
    } catch (e) {
      console.error('Error al guardar:', e);
      aviso.mostrar('No se ha podido guardar', true);
    } finally {
      guardando = false;
    }
  }

  if (partida.guardable && persistente) {
    window.setInterval(() => void guardar('auto'), INTERVALO_AUTOGUARDADO);
    // Al ocultarse la pestaña, que es lo más cerca de "el jugador se va" que
    // el navegador nos deja detectar de forma fiable.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void guardar('auto');
    });
  }

  entrada.alPulsar('F3', () => (debug.activo = !debug.activo));
  entrada.alPulsar('F4', () => tuner.alternar());
  entrada.alPulsar('F5', () => (debug.chunks = !debug.chunks));
  entrada.alPulsar('F2', () => void guardar('manual'));
  entrada.alPulsar('Tab', () => {
    capa = capa === 'bloque' ? 'pared' : 'bloque';
    reiniciarPicado(picado);
    barra.refrescar(capa);
  });
  entrada.alPulsar('KeyE', () => barra.alternarInventario());
  for (let i = 0; i < 10; i++) {
    entrada.alPulsar(`Digit${(i + 1) % 10}`, () => barra.seleccionar(i));
  }
  entrada.alPulsar('KeyR', () => {
    reaparecer(jugador);
    renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);
  });

  window.addEventListener('resize', () => renderer.redimensionar());

  /** Mueve los objetos del suelo, los recoge y limpia los que ya no están. */
  function actualizarDrops(): void {
    if (drops.length === 0) return;
    const centro = {
      x: jugador.caja.x + jugador.caja.ancho / 2,
      y: jugador.caja.y + jugador.caja.alto / 2,
    };
    let recogidoAlgo = false;
    for (const d of drops) {
      if (!d.vivo) continue;
      if (actualizarDrop(mundo, d, centro, inventario)) recogidoAlgo = true;
    }
    fusionarDrops(drops);
    // Compactar el array solo cuando haga falta: el caso normal es que no
    // muera ninguno y no queremos recrearlo sesenta veces por segundo.
    if (drops.some((d) => !d.vivo)) {
      const vivos = drops.filter((d) => d.vivo);
      drops.length = 0;
      drops.push(...vivos);
    }
    if (recogidoAlgo) barra.refrescar(capa);
  }

  /** Un tick de edición: apuntar, picar y colocar. */
  function editar(): void {
    const rueda = puntero.consumirRueda();
    if (rueda !== 0) barra.desplazar(rueda);

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

    const enMano = barra.objetoActivo();
    const tileEnMano = defObjeto(enMano).tile;
    const potencia = mejorPico(inventario);

    // El recuadro anticipa la acción que hará el botón que tengas pulsado; sin
    // pulsar nada, enseña si ahí se puede construir.
    let previo;
    if (puntero.izq) {
      previo = potencia > 0
        ? puedeMinar(mundo, jugador.caja, tx, ty, capa)
        : { ok: false as const };
    } else if (tileEnMano === undefined) {
      previo = { ok: false as const };
    } else {
      previo =
        capa === 'bloque'
          ? puedeColocarBloque(mundo, jugador.caja, tx, ty, tileEnMano)
          : puedeColocarPared(mundo, jugador.caja, tx, ty);
    }
    objetivo.valido = previo.ok;

    if (puntero.izq) {
      if (previo.ok) {
        // Lo que suelta el tile se calcula antes de romperlo: después ya es aire.
        const soltado =
          capa === 'bloque'
            ? dropDeTile(mundo.getTile(tx, ty))
            : dropDePared(mundo.getPared(tx, ty));
        if (avanzarPicado(mundo, picado, tx, ty, capa, potencia)) {
          renderer.cache.invalidar(tx, ty);
          motorLuz.invalidar(tx);
          soltar(drops, soltado, tx, ty);
        }
      } else {
        reiniciarPicado(picado);
      }
    } else if (picado.progreso > 0) {
      reiniciarPicado(picado);
    }

    if (puntero.der && previo.ok && tileEnMano !== undefined) {
      // Colocar gasta: el inventario es la razón de ser de esta fase.
      if (inventario.sacarDe(barra.seleccion, 1) > 0) {
        if (capa === 'bloque') mundo.setTile(tx, ty, tileEnMano);
        else mundo.setPared(tx, ty, tileEnMano);
        renderer.cache.invalidar(tx, ty);
        motorLuz.invalidar(tx);
        barra.refrescar(capa);
      }
    }
  }

  const bucle = crearBucle(
    () => {
      reloj.avanzar(TICK);
      editar();
      actualizarJugador(mundo, jugador, entrada.estado(), ajustes);
      actualizarDrops();
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
      renderer.dibujar(
        mundo,
        jugador,
        alpha,
        partida.zonas,
        picado,
        objetivo,
        motorLuz,
        reloj,
        drops,
      );

      debug.fps = bucle.fps;
      debug.msFrame = bucle.msFrame;
      debug.chunksVivos = renderer.cache.tamano;
      debug.hora = reloj.hora;
      debug.luzRaton = motorLuz.nivel(debug.ratonTx, debug.ratonTy);
      debug.drops = drops.length;
      debug.segundosDesdeGuardado = partida.guardable
        ? Math.round((Date.now() - ultimoGuardado) / 1000)
        : -1;
      dibujarDebug(renderer.ctx, renderer.camara, jugador, debug, renderer.escala);
    },
  );

  progreso(100, 'Listo');
  bucle.arrancar();
  setTimeout(ocultarCargador, 250);
}

arrancar().catch(mostrarError);

window.addEventListener('error', (e) => mostrarError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => mostrarError(e.reason));

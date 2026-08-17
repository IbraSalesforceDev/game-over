import { TICK, TILE } from './core/constants';
import { dificultad, DIFICULTAD_POR_DEFECTO } from './core/dificultad';
import { hay, VERSION_ACTUAL, type Caracteristica } from './core/versiones';
import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { AMANECER, Reloj } from './engine/time';
import { crearPuntero } from './engine/mouse';
import { crearAudio } from './engine/audio';
import { crearAjustes, type Graficos } from './ui/ajustes';
import { crearAyuda } from './ui/ayuda';
import { crearMapa } from './ui/mapa';
import { crearBrujula } from './ui/brujula';
import { crearPanelJefe } from './ui/jefe';
import { crearPausa } from './ui/pausa';
import { crearDebugMenu, crearTrucos } from './ui/debugmenu';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './entities/physics';
import { actualizarJugador, crearJugador, reaparecer } from './entities/player';
import { crearEstadoDebug, dibujarDebug } from './render/debug';
import { ARMADURA_DESNUDA } from './render/sprites';
import { Renderer, type EpocaVisual, type Objetivo } from './render/renderer';
import type { BiomaFondo } from './render/fondo';
import { crearAviso } from './ui/aviso';
import { crearBarra } from './ui/hotbar';
import { mostrarMenu, type Eleccion } from './ui/menu';
import { crearTuner } from './ui/tuner';
import { crearAlmacen, nuevoId, type MetaMundo, type SaveAdapter } from './world/almacen';
import {
  avanzarPicado,
  crearPicado,
  enAlcance,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  reiniciarPicado,
  type Capa,
} from './world/edit';
import { leerOpciones, prepararEscenario } from './world/escenario';
import { migrarPasos, planMigracion } from './world/migracion';
import { confirmarVersion } from './ui/confirmarversion';
import { faltaParaOfrenda, pagarOfrenda, textoFalta } from './world/altar';
import {
  estructuraMasCercana,
  nombreEstructura,
  type Estructura,
} from './world/estructuras';
import { puedeSembrar, tickCultivos } from './world/cultivo';
import { plantarArbolEn, techoInframundo } from './world/gen/worldgen';
import { MotorLuz } from './world/lighting';
import { Inventario } from './items/inventory';
import { equipoInicial, nivelEnMano, potenciaContra } from './items/equipo';
import {
  cabeEnEquipo,
  coloresEquipo,
  crearEquipo,
  danoTrasArmadura,
  defensaTotal,
} from './items/equipado';
import {
  defObjeto,
  dropDePared,
  dropDeTile,
  filtrarObjeto,
  NADA,
  nombrePicoDeNivel,
  objetoExisteEn,
} from './items/items';
import { estacionesCerca } from './items/recipes';
import { Contenedores, type DatosCofre } from './world/contenedores';
import {
  AIRE,
  ALTAR,
  CAMA,
  COFRE,
  defTile,
  esEstacion,
  HIERBA,
  materialDe,
  TIERRA,
  TIERRA_LABRADA,
} from './world/tiles';
import { Particulas } from './render/particles';
import {
  actualizarDrop,
  crearDrop,
  fusionarDrops,
  soltar,
  type Drop,
} from './entities/drop';
import {
  actualizarEnemigos,
  botinDe,
  botinRaroDe,
  nombreDe,
  crearEnemigo,
  ENEMIGOS,
  esJefe,
  MITAD_JEFE,
  OBJETO_RELIQUIA,
  PROBABILIDAD_VOZ,
  sueltaReliquia,
  vozDe,
  type Enemigo,
} from './entities/enemies';
import {
  crearGolpe,
  lanzarGolpe,
  puedeGolpear,
  resolverGolpe,
  sentidoDeVector,
  tickGolpe,
} from './entities/combat';
import {
  actualizarFlechas,
  anadirFlecha,
  dispararDesde,
  limpiarFlechas,
  type Flecha,
} from './entities/proyectiles';
import {
  ampliarVida,
  crearSalud,
  curar,
  danoDeCaida,
  golpear,
  revivir,
  TEXTO_MOTIVO,
  tickSalud,
  VIDA_MAXIMA,
  VIDA_TOPE,
} from './entities/salud';
import { apagar, crearAliento, reiniciarAliento, tickAliento } from './entities/aliento';
import {
  comer,
  crearHambre,
  HAMBRE_MAXIMA,
  reiniciarHambre,
  tickHambre,
} from './entities/hambre';
import { SimuladorLiquidos, sumersion } from './world/liquids';
import { puedeUsarCubo, usarCubo } from './items/cubo';
import {
  alcanceDeMapa,
  esArco,
  esAzada,
  esBrujula,
  esSemilla,
  siembraDe,
  esComida,
  esCristal,
  esCubo,
  FLECHAS,
  puntaDe,
  ESENCIA,
  ESPADA_GUARDIAN,
  LINGOTE_ORO,
} from './items/items';
import {
  biomaEn,
  intentarAparicion,
  INTERVALO_INTENTO,
  limpiarEnemigos,
} from './entities/spawner';
import { crearPanelVida } from './ui/vida';
import { esArma } from './items/items';
import {
  desempaquetar,
  empaquetar,
  HORA_POR_DEFECTO,
  VERSION_FORMATO,
  type EstadoPartida,
} from './world/save';
import type { NombreTamano } from './world/gen/worldgen';
import type { Zona } from './world/testLevel';
import type { Mundo } from './world/world';

/** Cada cuántos milisegundos se guarda solo. */
const INTERVALO_AUTOGUARDADO = 30_000;

/** Lo que la azada puede convertir en tierra labrada. */
const LABRABLES: readonly number[] = [HIERBA, TIERRA];

/** Columnas a cada lado que se miran para decidir si esto es el mar. */
const RADIO_MAR = 30;

/** Hasta dónde se oye a un bicho quejarse, en píxeles de mundo. */
const RADIO_VOZ = 26 * TILE;

/** Ticks entre tandas de esqueletos mientras el guardián está enfurecido. */
const INTERVALO_ESBIRROS = 420;
/** Enemigos vivos como máximo durante la pelea contra el jefe. */
const TOPE_CON_JEFE = 9;

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
  /** Acaba de cambiar de versión: hay que guardarla en cuanto se pueda. */
  migrada?: boolean;
}

/**
 * Genera un mundo cediendo el control entre pasos. Sin esto la pantalla de
 * carga se queda congelada y luego aparece el mundo de golpe: la barra
 * existiría solo de adorno.
 */
async function generar(
  semilla: string,
  tamano: NombreTamano,
  lab: boolean,
  columna: number | null = null,
  version: string = VERSION_ACTUAL,
): Promise<{
  mundo: Mundo;
  spawnTx: number;
  spawnTy: number;
  zonas: Zona[];
  semilla: string;
  estructuras: Estructura[];
  cofres: DatosCofre[];
}> {
  const it = prepararEscenario({ lab, semilla, tamano, minutos: null, columna, version });
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
  nivel = DIFICULTAD_POR_DEFECTO,
  hardcore = false,
  versionJuego = VERSION_ACTUAL,
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
      equipo: crearEquipo().aDatos(),
      // Los cofres del mundo nuevo son los de sus estructuras, con el botín ya
      // dentro: el generador decide qué hay en cada uno para que dos partidas
      // abiertas del mismo fichero encuentren exactamente lo mismo.
      cofres: gen.cofres,
      vida: VIDA_MAXIMA,
      vidaMax: VIDA_MAXIMA,
      hambre: HAMBRE_MAXIMA,
      dificultad: nivel,
      hardcore,
      hardcoreMuerto: false,
      estructuras: gen.estructuras,
      jefeVencido: false,
      versionJuego,
      // La profundidad se fija al crear el mundo y ya no cambia: acompaña al
      // mundo aunque después se migre a otra versión.
      mundoHondo: hay('mundoHondo', versionJuego),
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
    const gen = await generar(op.semilla, op.tamano, op.lab, op.columna, op.version);
    return partidaNueva(
      gen,
      op.lab ? 'Laboratorio' : `Semilla ${op.semilla}`,
      !op.lab,
      op.minutos ?? HORA_POR_DEFECTO,
      op.dificultad,
      op.hardcore,
      op.version,
    );
  }

  ocultarCargador();
  const eleccion: Eleccion = await mostrarMenu(capaUI, almacen, persistente);
  mostrarCargador();
  await siguienteFrame();

  if (eleccion.tipo === 'nuevo') {
    const gen = await generar(
      eleccion.semilla,
      eleccion.tamano,
      false,
      op.columna,
      eleccion.version,
    );
    return partidaNueva(
      gen,
      eleccion.nombre,
      true,
      op.minutos ?? HORA_POR_DEFECTO,
      eleccion.dificultad,
      eleccion.hardcore,
      eleccion.version,
    );
  }

  progreso(30, 'Abriendo el mundo…');
  await siguienteFrame();
  const bytes = await almacen.cargar(eleccion.meta.id);
  progreso(70, 'Descomprimiendo…');
  await siguienteFrame();
  const { mundo, estado } = await desempaquetar(bytes);

  if (eleccion.tipo === 'migrar') {
    // El plan se calcula con el mundo ya en memoria: las cifras que enseña son
    // las de verdad, no una estimación. Por eso la confirmación llega después
    // de la pantalla de carga y no antes de ella.
    ocultarCargador();
    const plan = planMigracion(mundo, estado, eleccion.destino);
    const adelante = await confirmarVersion(capaUI, plan, eleccion.meta.nombre);
    if (!adelante) {
      // Volver al menú es recargar: el arranque está montado para ejecutarse
      // una vez, y deshacerlo a mano sería inventarse un ciclo de vida.
      window.location.href = window.location.pathname;
      await new Promise(() => {});
    }
    mostrarCargador();
    await siguienteFrame();
    const it = migrarPasos(mundo, estado, eleccion.destino, {
      ancho: mundo.ancho,
      alto: mundo.alto,
    });
    let paso = it.next();
    while (!paso.done) {
      progreso(paso.value.pct, paso.value.texto);
      await siguienteFrame();
      paso = it.next();
    }
    return {
      mundo: paso.value.mundo,
      estado: paso.value.estado,
      zonas: [],
      id: eleccion.meta.id,
      nombre: eleccion.meta.nombre,
      guardable: true,
      migrada: true,
    };
  }

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

  /**
   * Qué existe en este mundo.
   *
   * Se lee una vez de la partida y ya no cambia: la versión es del mundo, como
   * la semilla y la dificultad. Todo lo que este bloque enciende o apaga pasa
   * por aquí, así que buscar `tiene(` es la forma de ver de un vistazo qué se
   * comporta distinto según la versión.
   */
  const versionMundo = partida.estado.versionJuego;
  const tiene = (q: Caracteristica): boolean => hay(q, versionMundo);
  /**
   * Cómo se veía el juego en esta versión.
   *
   * La primera entrega de este bloque se saltó justo esto: un mundo de 1.4.0
   * salía con sprites animados, montañas de fondo y el sol poniéndose, y nada
   * de eso existía hasta 2.2.0. Un mundo viejo con los gráficos de hoy no es
   * una reconstrucción, es el juego de hoy con menos bloques.
   */
  const epoca: EpocaVisual = {
    sprites: tiene('spritesAnimados'),
    fondo: tiene('fondoParallax'),
    astros: tiene('astros'),
    sombras: tiene('sombras'),
    enMano: tiene('objetoEnMano'),
    barrasEnemigo: tiene('combate'),
  };

  const ajustes: Ajustes = { ...AJUSTES_POR_DEFECTO };
  const debug = crearEstadoDebug();
  debug.semilla = partida.estado.semilla;
  const tuner = crearTuner(capaUI, ajustes);
  const inventario =
    partida.estado.inventario.length > 0
      ? Inventario.desdeDatos(partida.estado.inventario)
      // El equipo de salida también pasa por la versión: en 1.6.0 no había
      // espada porque no había con qué pelear, y en 1.4.0 no había ni
      // inventario, así que se empieza con las manos vacías.
      : equipoInicial(partida.estado.versionJuego);
  const drops: Drop[] = [];
  const enemigos: Enemigo[] = [];
  const particulas = new Particulas();
  const cofres = Contenedores.desdeDatos(mundo.ancho, partida.estado.cofres);
  const equipo = crearEquipo();
  // Solo se recupera lo que de verdad puede ir en cada hueco: si un guardado
  // trae basura en la ranura del casco, se descarta en vez de vestirla.
  partida.estado.equipo.forEach(([objeto, cantidad], i) => {
    if (cantidad > 0 && cabeEnEquipo(objeto, i)) equipo.ponerEn(i, objeto, cantidad);
  });
  const salud = crearSalud(
    Math.max(VIDA_MAXIMA, Math.min(VIDA_TOPE, partida.estado.vidaMax || VIDA_MAXIMA)),
  );
  if (partida.estado.vida > 0) salud.vida = Math.min(salud.vidaMax, partida.estado.vida);
  const aliento = crearAliento();
  const hambre = crearHambre(
    partida.estado.hambre > 0 ? partida.estado.hambre : HAMBRE_MAXIMA,
  );
  const golpe = crearGolpe();
  const flechas: Flecha[] = [];
  /**
   * Dificultad del mundo, fijada al crearlo. Se lee una vez y no cambia: no hay
   * ninguna forma de tocarla desde dentro de la partida, ni siquiera desde el
   * menú de depuración, porque para eso están las perillas sueltas de ahí.
   */
  const nivelDif = dificultad(partida.estado.dificultad);
  debug.dificultad = `${nivelDif.id} · ${nivelDif.nombre}`;
  // Al abrir un mundo guardado el líquido está quieto en el array pero la
  // simulación no sabe que existe: hay que despertarlo o el agua se quedaría
  // congelada hasta que alguien la tocase.
  const liquidos = new SimuladorLiquidos(mundo);
  liquidos.despertarTodo();
  const panelVida = crearPanelVida(capaUI, {
    vida: tiene('barraVida'),
    aliento: tiene('barraAliento'),
    hambre: tiene('hambre'),
  });
  panelVida.refrescar(salud);
  panelVida.refrescarAliento(aliento);
  panelVida.refrescarHambre(hambre);
  const aviso = crearAviso(capaUI);
  const audio = crearAudio();
  // Antes de 2.2.0 el juego era mudo. Se apaga en la puerta y no en cada
  // llamada: hay veinte `audio.sonar` repartidos por el bucle.
  if (!tiene('audio')) audio.sonar = () => {};
  particulas.habilitadas = tiene('particulas');

  /**
   * Los gráficos, ya con la versión aplicada.
   *
   * Antes de 1.5.0 no había iluminación: el mundo se veía entero y a plena luz,
   * cuevas incluidas. Se consigue subiendo el suelo de luz al máximo, que es
   * exactamente lo que era entonces —no había buffer de luz que multiplicar.
   */
  const graficosDeLaVersion = (g: Graficos): Graficos =>
    tiene('luz') ? g : { ...g, oscuridad: 255 };

  const opciones = crearAjustes(capaUI, audio, (g) =>
    renderer.aplicarGraficos(graficosDeLaVersion(g)),
  );
  // Los ajustes guardados se aplican al arrancar, no solo al tocarlos: si no,
  // quien eligió jugar a ×2 vería la primera partida a otro zoom cada vez.
  renderer.aplicarGraficos(graficosDeLaVersion(opciones.graficos));
  const ayuda = crearAyuda(capaUI);
  const mapa = crearMapa(capaUI);
  const brujula = crearBrujula(capaUI);
  const panelJefe = crearPanelJefe(capaUI);
  /**
   * El guardián, mientras esté vivo.
   *
   * Se guarda aparte de la lista de enemigos porque hay tres sitios que
   * necesitan preguntar por él —la barra de vida, los esbirros y el altar, que
   * no debe poder invocarlo dos veces— y buscarlo en el array en cada uno sería
   * repetir el mismo recorrido tres veces por tick.
   */
  let jefe: Enemigo | null = null;
  const trucos = crearTrucos();
  const depuracion = crearDebugMenu(capaUI, {
    trucos,
    version: versionMundo,
    darObjeto: (objeto, n) => {
      inventario.anadir(objeto, n);
      barra.refrescar(capa);
    },
    generarCriatura: (especie, elite) => {
      const c = jugador.caja;
      enemigos.push(crearEnemigo(especie, c.x + c.mirando * 60, c.y - 20, 1, elite));
    },
    rellenarVida: () => {
      curar(salud, salud.vidaMax);
      panelVida.refrescar(salud);
    },
    establecerVidaMaxima: (v) => {
      salud.vidaMax = v;
      salud.vida = v;
      panelVida.refrescar(salud);
    },
    vidaMaximaActual: () => salud.vidaMax,
    estructuras: () =>
      partida.estado.estructuras.map((e) => ({
        nombre: nombreEstructura(e.tipo),
        tx: e.tx,
        ty: e.ty,
      })),
    viajarA: (tx, ty) => {
      // Un par de tiles por encima del punto anotado: el centro de la sala del
      // altar es el altar mismo, y aparecer dentro de un mueble es feo.
      jugador.caja.x = tx * TILE;
      jugador.caja.y = (ty - 3) * TILE;
      jugador.caja.vx = 0;
      jugador.caja.vy = 0;
      jugador.xPrev = jugador.caja.x;
      jugador.yPrev = jugador.caja.y;
      renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);
      motorLuz.marcarSucio();
    },
  });
  const pausa = crearPausa(capaUI, {
    // La versión va pegada al nombre: es lo que explica por qué en este mundo
    // no hay selva, y el sitio donde uno lo pregunta es el menú de pausa.
    nombre: `${partida.nombre} · v${versionMundo}`,
    alReanudar: () => {},
    alAbrirControles: () => ayuda.alternar(),
    alAbrirOpciones: () => opciones.alternar(),
    alSalir: async () => {
      await guardar('manual');
      // Recargar es la forma honesta de volver al menú: el arranque entero
      // —almacén, generación, render— está montado para ejecutarse una vez, y
      // desmontarlo a mano sería inventarse un ciclo de vida que nadie más usa.
      window.location.href = window.location.pathname;
    },
  });
  const entrada = crearEntrada();
  const puntero = crearPuntero(lienzo);

  // El navegador no deja sonar nada hasta que el usuario toca algo. En vez de
  // pedirle que pulse un botón, se aprovecha el primer clic o la primera tecla
  // que dé de todas formas para empezar a jugar.
  for (const evento of ['pointerdown', 'keydown'] as const) {
    window.addEventListener(evento, () => audio.despertar(), { once: true });
  }

  // --- Estado de construcción ---
  const picado = crearPicado();
  let capa: Capa = partida.estado.capaPared ? 'pared' : 'bloque';
  const objetivo: Objetivo = { tx: 0, ty: 0, valido: false, visible: false, capa };
  const barra = crearBarra(capaUI, inventario, equipo, {
    version: versionMundo,
    conEquipo: tiene('armadura'),
    conFicha: tiene('fichaObjeto'),
    conIconos: tiene('iconosDibujados'),
    alCambiar: () => reiniciarPicado(picado),
    estaciones: () => estacionesCerca(mundo, jugador.caja),
    alFabricar: () => audio.sonar('craftear'),
    alSoltarAlMundo: (objeto, cantidad) => {
      const tx = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
      const ty = Math.floor((jugador.caja.y + jugador.caja.alto / 2) / TILE);
      for (let i = 0; i < cantidad; i++) drops.push(crearDrop(objeto, 1, tx, ty));
      aviso.mostrar('No cabía: lo has soltado al suelo');
    },
  });
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
      partida.estado.equipo = equipo.aDatos();
      cofres.limpiar();
      partida.estado.cofres = cofres.aDatos();
      partida.estado.vida = salud.vida;
      partida.estado.vidaMax = salud.vidaMax;
      partida.estado.hambre = Math.round(hambre.nivel);
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
        versionJuego: partida.estado.versionJuego,
        hardcore: partida.estado.hardcore,
        caido: partida.estado.hardcoreMuerto,
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

  // F3 son las coordenadas y F6 el volcado completo. El overlay entero era lo
  // primero que veía quien abría el juego, y saber en qué tile estás no debería
  // costar catorce líneas de diagnóstico.
  entrada.alPulsar('F3', () => {
    // P + F3 llama a la puerta de servicio; abrirla pide contraseña. El acorde
    // no lleva Alt porque Alt+D+F3 lo tiene cogido el panel de NVIDIA y Alt+R
    // se pisaba con reaparecer: un atajo secreto que abre el programa de otro
    // no es un atajo secreto, es una tecla rota.
    if (entrada.mantenida('KeyP')) {
      depuracion.alternar();
      return;
    }
    debug.nivel = debug.nivel === 'coordenadas' ? 'nada' : 'coordenadas';
    debug.activo = debug.nivel !== 'nada';
  });
  /**
   * El mapa, con la M.
   *
   * Enseña lo que abarque el mejor mapa que se lleve encima; sin ninguno, solo
   * lo dice. El truco de depuración lo salta y enseña el mundo entero, que es
   * justo lo que hace falta para comprobar la generación sin caminar medio
   * mundo.
   */
  entrada.alPulsar('KeyM', () => {
    if (barra.inventarioAbierto || pausa.abierto) return;
    let mejor = 0;
    for (const r of inventario.ranuras) {
      if (r.cantidad > 0) mejor = Math.max(mejor, alcanceDeMapa(r.objeto));
    }
    const completo = trucos.mapaCompleto;
    if (!tiene('mapas') && !completo) {
      aviso.mostrar(`Los mapas no existen en la versión ${versionMundo}`);
      return;
    }
    if (mejor <= 0 && !completo) {
      aviso.mostrar('No llevas ningún mapa');
      return;
    }
    const alcance = completo ? Infinity : mejor;
    mapa.alternar(
      mundo,
      Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE),
      Math.floor((jugador.caja.y + jugador.caja.alto / 2) / TILE),
      alcance,
      Number.isFinite(alcance) ? `${alcance} tiles alrededor` : 'el mundo entero',
      // Las estructuras solo se marcan llevando brújula. Un mapa que las
      // enseñara siempre convertiría la brújula en un adorno, y un mapa que no
      // las enseñara nunca obligaría a buscar la fortaleza mirando una aguja
      // de veinte píxeles durante media hora.
      llevaBrujula() || trucos.mapaCompleto ? partida.estado.estructuras : [],
    );
  });
  entrada.alPulsar('F6', () => {
    debug.nivel = debug.nivel === 'completo' ? 'nada' : 'completo';
    debug.activo = debug.nivel !== 'nada';
  });
  entrada.alPulsar('F4', () => tuner.alternar());
  // Zoom con las teclas de más y menos, del teclado y del numérico. El zoom es
  // lo único de los ajustes que se quiere cambiar sin dejar de mirar el mundo
  // —acercarse para colocar un bloque, alejarse para ver por dónde sigue el
  // túnel— y abrir un menú para eso rompe justo lo que se estaba haciendo.
  const escalonZoom = (delta: number): void => {
    aviso.mostrar(`Zoom ${opciones.cambiarZoom(delta, renderer.camara.zoom)}`);
  };
  for (const tecla of ['Equal', 'NumpadAdd']) entrada.alPulsar(tecla, () => escalonZoom(1));
  for (const tecla of ['Minus', 'NumpadSubtract']) {
    entrada.alPulsar(tecla, () => escalonZoom(-1));
  }
  entrada.alPulsar('F5', () => (debug.chunks = !debug.chunks));
  entrada.alPulsar('F2', () => void guardar('manual'));
  entrada.alPulsar('Tab', () => {
    capa = capa === 'bloque' ? 'pared' : 'bloque';
    reiniciarPicado(picado);
    barra.refrescar(capa);
  });
  entrada.alPulsar('KeyE', () => barra.alternarInventario());
  // Escape cierra lo que haya abierto y, si no hay nada, abre la pausa. Es el
  // orden que espera cualquiera: primero deshace, y solo al final ofrece salir.
  entrada.alPulsar('Escape', () => {
    if (pausa.abierto) {
      pausa.cerrar();
      return;
    }
    if (mapa.abierto || ayuda.abierto || opciones.abierto || barra.inventarioAbierto) {
      barra.cerrar();
      opciones.cerrar();
      ayuda.cerrar();
      mapa.cerrar();
      return;
    }
    pausa.abrir();
  });
  entrada.alPulsar('KeyH', () => ayuda.alternar());
  for (let i = 0; i < 10; i++) {
    entrada.alPulsar(`Digit${(i + 1) % 10}`, () => barra.seleccionar(i));
  }
  entrada.alPulsar('KeyR', () => {
    reaparecer(jugador);
    renderer.camara.centrar(jugador.caja.x, jugador.caja.y, mundo.ancho, mundo.alto);
  });

  window.addEventListener('resize', () => renderer.redimensionar());

  /**
   * Sacude la cámara, si quien juega no lo ha desactivado.
   *
   * Pasa por aquí y no por la cámara directamente porque la sacudida marea a
   * bastante gente, y un ajuste que solo apaga la mitad de los sitios que
   * sacuden no sirve de nada.
   */
  function sacudir(fuerza: number): void {
    if (opciones.sacudidaActiva) renderer.camara.sacudir(fuerza);
  }

  /**
   * Qué fondo toca pintar.
   *
   * Es el bioma del suelo salvo cuando hay mar alrededor, y entonces manda el
   * mar. Se mira aparte y no dentro de `biomaEn` porque ese decide también qué
   * bichos salen, y el mar no es un bioma de aparición: no hay nada que viva en
   * él. Aquí solo decide qué se ve al fondo.
   */
  function biomaDelFondo(): BiomaFondo {
    const tx = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
    const ty = Math.floor((jugador.caja.y + jugador.caja.alto) / TILE);
    // El inframundo manda sobre todo: bajo la roca infernal no hay bioma de
    // superficie que valga, y el fondo es lo primero que dice que has llegado.
    if (tiene('inframundo') && ty >= techoInframundo(mundo.alto, partida.estado.mundoHondo)) {
      return 'inframundo';
    }
    // Solo en la superficie: bajo tierra el fondo no se ve y contar agua de
    // cuevas pondría el horizonte del mar dentro de una caverna.
    if (ty < (motorLuz.alturaCielo[tx] ?? 0) + 12) {
      let agua = 0;
      for (let d = -RADIO_MAR; d <= RADIO_MAR; d += 3) {
        const x = tx + d;
        const suelo = motorLuz.alturaCielo[x];
        if (suelo === undefined) continue;
        if (mundo.getLiquido(x, suelo) > 0 && !mundo.esLava(x, suelo)) agua++;
      }
      // Un tercio de las columnas de alrededor con agua ya no es un charco.
      if (agua >= Math.floor((RADIO_MAR * 2) / 3 / 3)) return 'mar';
    }
    return biomaEn(mundo, tx, ty);
  }

  /** ¿Se lleva una brújula encima? Es lo que enciende la aguja y el mapa. */
  function llevaBrujula(): boolean {
    if (!tiene('brujula')) return false;
    return inventario.ranuras.some((r) => r.cantidad > 0 && esBrujula(r.objeto));
  }

  /**
   * Refresca la aguja de la brújula.
   *
   * Va en el render y no en el tick porque no cambia nada del mundo: es
   * información, y una aguja que se recalcula sesenta veces por segundo cuesta
   * lo mismo que una que se recalcula treinta y se ve igual.
   */
  function actualizarBrujula(): void {
    if (!llevaBrujula() || partida.estado.estructuras.length === 0) {
      brujula.actualizar(null);
      return;
    }
    const tx = (jugador.caja.x + jugador.caja.ancho / 2) / TILE;
    const ty = (jugador.caja.y + jugador.caja.alto / 2) / TILE;
    const cerca = estructuraMasCercana(partida.estado.estructuras, tx, ty);
    if (!cerca) {
      brujula.actualizar(null);
      return;
    }
    brujula.actualizar({
      nombre: nombreEstructura(cerca.estructura.tipo),
      distancia: Math.round(cerca.distancia),
      angulo: Math.atan2(cerca.estructura.ty - ty, cerca.estructura.tx - tx),
    });
  }

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
    if (recogidoAlgo) {
      barra.refrescar(capa);
      audio.sonar('recoger', 0.9 + Math.random() * 0.3);
    }
  }

  /** Estado del botón derecho en el tick anterior, para detectar el flanco. */
  let derAnterior = false;

  /**
   * Ticks de espera antes de repetir el aviso de "te falta pico".
   *
   * Sin esto el aviso se reescribiría sesenta veces por segundo mientras se
   * mantiene el clic sobre la piedra: se ve igual, pero es tocar el DOM en cada
   * tick por nada.
   */
  let esperaAvisoPico = 0;
  /** Ticks de espera antes de repetir el aviso de objeto fuera de su versión. */
  let esperaAvisoVersion = 0;

  /** Ticks de espera antes de repetir el aviso de "no te quedan flechas". */
  let esperaAvisoFlechas = 0;

  /**
   * La mejor flecha que se lleva encima, o NADA si no hay ninguna.
   *
   * El arco gasta siempre la mejor. Es la regla más simple que se entiende sin
   * explicarla, y evita tener que inventar una ranura de munición aparte con su
   * caja en la interfaz y su campo en el guardado. Quien quiera reservar las de
   * fuego, las deja en un cofre.
   *
   * Se filtra por versión: en un mundo de 4.0.0 las de hueso no existen, y
   * dispararlas porque el jugador las trajera de otra partida sería colar en ese
   * mundo algo que no le pertenece.
   */
  function mejorFlecha(): number {
    for (let i = FLECHAS.length - 1; i >= 0; i--) {
      const f = FLECHAS[i]!;
      if (filtrarObjeto(f, versionMundo) === NADA) continue;
      if (inventario.contar(f) > 0) return f;
    }
    return NADA;
  }

  function avisarSinFlechas(): void {
    if (esperaAvisoFlechas > 0) return;
    esperaAvisoFlechas = 90;
    aviso.mostrar('No te quedan flechas');
  }

  /** Ticks de espera antes de repetir el aviso de dónde se puede sembrar. */
  let esperaAvisoSiembra = 0;

  function avisarSiembra(): void {
    if (esperaAvisoSiembra > 0) return;
    esperaAvisoSiembra = 90;
    aviso.mostrar('Las semillas van sobre tierra labrada');
  }

  function avisarHerramienta(nivelPedido: number): void {
    if (esperaAvisoPico > 0) return;
    esperaAvisoPico = 90;
    aviso.mostrar(`Necesitas ${nombrePicoDeNivel(nivelPedido)} o mejor`);
  }
  /** Ticks hasta el próximo intento de aparición de enemigos. */
  let relojAparicion = 0;
  /** Ticks hasta la próxima tanda de esbirros del guardián. */
  let relojEsbirros = 0;
  /** El rugido de la segunda fase ya ha sonado en esta pelea. */
  let furiaAnunciada = false;

  /**
   * Un enemigo muere: suelta su botín, revienta en partículas y suena.
   *
   * Está aparte porque hay dos formas de matar —el mandoble y la flecha— y
   * duplicar esto era duplicar el botín el día que cambiara la tabla.
   */
  function morir(e: Enemigo): void {
    const { especie, caja } = e;
    const tx = Math.floor((caja.x + caja.ancho / 2) / TILE);
    const ty = Math.floor((caja.y + caja.alto / 2) / TILE);
    repartirBotin(especie, tx, ty, e.elite);
    const grande = esJefe(especie);
    particulas.emitir(caja.x + caja.ancho / 2, caja.y + caja.alto / 2, {
      cantidad: grande ? 90 : 18,
      color: ENEMIGOS[especie].color,
      dispersion: grande ? 5 : 2.6,
      empujeY: -1.2,
      vida: grande ? 70 : 34,
      tam: 3,
    });
    sacudir(grande ? 9 : 2.4);
    audio.sonar(grande ? 'muerte' : 'muerte-bicho', grande ? 0.6 : 0.85 + Math.random() * 0.4);
    if (grande) caerJefe();
  }

  /**
   * El botín de un muerto: el suyo, y con suerte una reliquia.
   *
   * Está aquí porque hay dos caminos hasta la muerte de un bicho —el mandoble
   * y la flecha por un lado, la lava y el resto por otro— y cada uno tenía su
   * propia línea de `crearDrop`. Con dos sitios que reparten botín, el día que
   * cambie la tabla solo se acuerda uno de los dos.
   */
  function repartirBotin(
    especie: Enemigo['especie'],
    tx: number,
    ty: number,
    elite = false,
  ): void {
    /** Suelta algo solo si en esta versión ese algo existía. */
    const soltar = (objeto: number, cantidad: number): void => {
      if (filtrarObjeto(objeto, versionMundo) === NADA) return;
      drops.push(crearDrop(objeto, cantidad, tx, ty));
    };
    const b = botinDe(especie, Math.random, elite);
    soltar(b.objeto, b.cantidad);
    // El botín raro: el lingote de cobalto del gólem, el de titanio del
    // espectro. La élite lo saca cuatro veces más a menudo, y es lo que hace
    // que valga la pena plantarle cara en vez de subirse a un bloque.
    const raro = botinRaroDe(especie, Math.random, elite);
    if (raro !== null) soltar(raro, 1);
    if (sueltaReliquia(especie)) soltar(OBJETO_RELIQUIA, 1);
    // El guardián no suelta reliquia pero sí lo suyo: la espada, la esencia y
    // el oro del que estaba hecho.
    if (esJefe(especie)) {
      soltar(ESPADA_GUARDIAN, 1);
      soltar(ESENCIA, 1);
      soltar(LINGOTE_ORO, 12);
    }
  }

  /** Remate de la caída del jefe: barra fuera, aviso y marca en la partida. */
  function caerJefe(): void {
    jefe = null;
    panelJefe.ocultar();
    const primera = !partida.estado.jefeVencido;
    partida.estado.jefeVencido = true;
    aviso.mostrar(
      primera
        ? 'El guardián ha caído. La fortaleza es tuya.'
        : 'El guardián vuelve a caer.',
    );
    // Guardar en el acto: perder la espada del jefe porque el navegador se
    // cerró antes del autoguardado sería el peor bug posible de este bloque.
    void guardar('auto');
  }

  /**
   * Despierta al guardián sobre el altar.
   *
   * La ofrenda se cobra antes de crear al jefe, y solo si está completa: cobrar
   * y no invocar sería el peor resultado posible de todo el bloque.
   */
  function invocarJefe(tx: number, ty: number): void {
    if (jefe) {
      aviso.mostrar('El guardián ya está despierto', true);
      return;
    }
    const falta = faltaParaOfrenda(inventario);
    if (falta.length > 0) {
      aviso.mostrar(`Al altar le falta: ${textoFalta(falta)}`, true);
      return;
    }
    pagarOfrenda(inventario);
    barra.refrescar(capa);

    // Nace unos tiles por encima del altar, para que no aparezca encajado
    // dentro del pedestal y salga empujado a un lado por la colisión.
    const def = ENEMIGOS.guardian;
    const nuevo = crearEnemigo(
      'guardian',
      tx * TILE + TILE / 2 - def.ancho / 2,
      (ty - 5) * TILE,
      nivelDif.fuerza,
    );
    enemigos.push(nuevo);
    jefe = nuevo;
    furiaAnunciada = false;

    aviso.mostrar('Algo despierta bajo la fortaleza');
    sacudir(9);
    audio.sonar('rugido', 0.75);
    particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
      cantidad: 60,
      color: '#c79bf0',
      dispersion: 4,
      empujeY: -2,
      vida: 60,
      tam: 3,
    });
  }

  /**
   * El jefe, tick a tick: barra de vida y esbirros.
   *
   * Los esqueletos solo salen en la segunda mitad de la pelea. Un jefe que
   * invoca ayuda desde el primer segundo convierte la sala en un caos en el que
   * no se ve al jefe; saliendo a partir de la mitad, son el aviso de que la
   * cosa se ha puesto seria.
   */
  function actualizarJefe(): void {
    if (jefe && !jefe.vivo) jefe = null;
    if (!jefe) {
      panelJefe.ocultar();
      return;
    }
    const furioso = jefe.salud.vida < jefe.salud.vidaMax * MITAD_JEFE;
    panelJefe.mostrar(
      ENEMIGOS.guardian.nombre,
      jefe.salud.vida,
      jefe.salud.vidaMax,
      furioso,
    );
    // El rugido de la segunda fase suena una sola vez, al cruzar la mitad: es
    // el aviso de que a partir de aquí la pelea es otra.
    if (furioso && !furiaAnunciada) {
      furiaAnunciada = true;
      audio.sonar('rugido', 1.15);
      sacudir(6);
      aviso.mostrar('El guardián se enfurece', true);
    }
    if (!furioso) return;
    if (--relojEsbirros > 0) return;
    relojEsbirros = INTERVALO_ESBIRROS;
    // Tope aparte del aforo normal: la sala tiene que seguir siendo transitable.
    if (enemigos.filter((e) => e.vivo).length >= TOPE_CON_JEFE) return;
    for (const lado of [-1, 1]) {
      enemigos.push(
        crearEnemigo(
          'esqueleto',
          jefe.caja.x + lado * 70,
          jefe.caja.y + 40,
          nivelDif.fuerza,
        ),
      );
    }
  }

  /**
   * De vez en cuando, un bicho cercano se queja.
   *
   * Solo los que se ven o casi: el sonido no tiene panorámica ni distancia, así
   * que un gruñido de un zombi a ochenta tiles se oiría igual de fuerte que el
   * del que tienes encima y no significaría nada. Limitándolo a los de cerca,
   * la queja es información: hay algo ahí al lado.
   */
  function vocesDeLosBichos(): void {
    const cx = jugador.caja.x + jugador.caja.ancho / 2;
    const cy = jugador.caja.y + jugador.caja.alto / 2;
    for (const e of enemigos) {
      if (!e.vivo) continue;
      if (Math.random() >= PROBABILIDAD_VOZ) continue;
      const voz = vozDe(e.especie);
      if (!voz) continue;
      const dx = e.caja.x + e.caja.ancho / 2 - cx;
      const dy = e.caja.y + e.caja.alto / 2 - cy;
      if (Math.hypot(dx, dy) > RADIO_VOZ) continue;
      audio.sonar(voz, 0.85 + Math.random() * 0.3);
    }
  }

  /** Lo plantado crece alrededor del jugador; los brotes se hacen árboles. */
  function actualizarCultivos(): void {
    const crecidos = tickCultivos(
      mundo,
      Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE),
      Math.floor((jugador.caja.y + jugador.caja.alto / 2) / TILE),
    );
    for (const c of crecidos) {
      if (c.arbol) plantarArbolEn(mundo, c.tx, c.ty);
      renderer.cache.invalidar(c.tx, c.ty);
      motorLuz.invalidar(c.tx);
    }
  }

  /** Enemigos, golpes y vida: todo lo que puede matar o morir en un tick. */
  function actualizarCombate(): void {
    // La invulnerabilidad de depuración se renueva cada tick: así ninguna
    // fuente de daño —golpe, caída, lava, hambre— la puede saltar.
    if (trucos.invulnerable) salud.invulnerable = 60;
    tickSalud(salud);
    tickGolpe(golpe);

    // El hambre gasta más si se está haciendo algo: correr, saltar o picar.
    const activo =
      Math.abs(jugador.caja.vx) > 0.6 || !jugador.caja.enSuelo || picado.progreso > 0;
    // Antes de 2.3.0 no se comía: la barra ni se mueve ni se enseña.
    if (tiene('hambre')) {
      const rh = tickHambre(hambre, salud, jugador.caja, activo, nivelDif.hambre, nivelDif.castigo);
      if (rh.curado || rh.danado) panelVida.refrescar(salud);
      if (rh.danado) aviso.mostrar('Tienes hambre', true);
      panelVida.refrescarHambre(hambre);
    }

    // El golpe activo alcanza a quien toque, una vez por mandoble.
    const r = resolverGolpe(golpe, jugador.caja, enemigos, trucos.danoMultiplicador);
    for (const tocado of r.tocados) {
      // Chispas en el punto de impacto, hacia donde mira el golpe: es el aviso
      // de que el mandoble ha entrado, que hasta ahora solo decía la barra de
      // vida del bicho.
      particulas.emitir(tocado.caja.x + tocado.caja.ancho / 2, tocado.caja.y + tocado.caja.alto / 2, {
        cantidad: 8,
        color: '#ffe9a8',
        forma: 'chispa',
        dispersion: 2.4,
        empujeX: jugador.caja.mirando * 1.4,
        vida: 14,
        tam: 2,
        gravedad: 0.08,
      });
      sacudir(1.4);
    }
    for (const muerto of r.muertos) morir(muerto);

    // Las flechas van antes que los enemigos: una flecha que mata a un zombi
    // este tick tiene que impedir que ese zombi pegue en el mismo tick.
    const rf = actualizarFlechas(mundo, flechas, enemigos);
    for (const golpeado of rf.impactos) {
      const c = golpeado.enemigo.caja;
      particulas.emitir(c.x + c.ancho / 2, c.y + c.alto / 2, {
        cantidad: 6,
        color: '#e0d8c0',
        dispersion: 1.8,
        vida: 20,
        tam: 2,
      });
      audio.sonar('golpe', 1.2);
      if (golpeado.muerto) morir(golpeado.enemigo);
    }
    // El fogonazo de las flechas de fuego. Va antes que las clavadas para que,
    // si una estalla y otra se clava en el mismo tick, el orden de las
    // partículas sea el mismo que el de los hechos.
    for (const e of rf.estallidos) {
      particulas.emitir(e.x, e.y, {
        cantidad: 26,
        color: '#ff8a3a',
        dispersion: 4.2,
        vida: 26,
        tam: 3,
        gravedad: 0.04,
      });
      particulas.emitir(e.x, e.y, {
        cantidad: 10,
        color: '#ffe08a',
        dispersion: 2.4,
        vida: 16,
        tam: 2,
      });
      audio.sonar('golpe', 0.55);
      sacudir(2.2);
    }
    for (const donde of rf.clavadas) {
      particulas.emitir(donde.x, donde.y, {
        cantidad: 3,
        color: '#b8a882',
        dispersion: 1,
        vida: 14,
        tam: 1,
      });
    }
    if (flechas.length > 0 && relojAparicion % 30 === 0) limpiarFlechas(flechas);

    const res = actualizarEnemigos(mundo, enemigos, jugador.caja, salud);
    if (res.danoAlJugador > 0) {
      // El empujón sale del enemigo más cercano, para que aparte en la
      // dirección correcta.
      let fuenteX = jugador.caja.x;
      let mejor = Infinity;
      for (const e of enemigos) {
        if (!e.vivo) continue;
        const d = Math.abs(e.caja.x - jugador.caja.x);
        if (d < mejor) {
          mejor = d;
          fuenteX = e.caja.x + e.caja.ancho / 2;
        }
      }
      // La armadura descuenta aquí y no dentro de `golpear`: el hambre, la
      // lava y el suelo no son golpes de los que un peto proteja, y meterla
      // en la función común los cubriría a todos sin querer.
      const encaja = danoTrasArmadura(res.danoAlJugador, defensaTotal(equipo));
      if (golpear(salud, jugador.caja, encaja, fuenteX)) {
        panelVida.refrescar(salud);
        particulas.emitir(
          jugador.caja.x + jugador.caja.ancho / 2,
          jugador.caja.y + jugador.caja.alto / 2,
          {
            cantidad: 12,
            color: '#d94f4f',
            dispersion: 2.2,
            empujeY: -1,
            vida: 30,
            tam: 2,
          },
        );
        sacudir(3.4);
        audio.sonar('dano');
      }
    }
    for (const m of res.muertos) {
      repartirBotin(m.especie, m.tx, m.ty, m.elite);
      if (esJefe(m.especie)) caerJefe();
    }

    if (salud.muerto) {
      particulas.emitir(
        jugador.caja.x + jugador.caja.ancho / 2,
        jugador.caja.y + jugador.caja.alto / 2,
        { cantidad: 40, color: '#d94f4f', dispersion: 3.4, vida: 55, tam: 3 },
      );
      sacudir(8);
      audio.sonar('muerte');
      // El motivo se lee antes de revivir: `revivir` lo borra, y si se leyera
      // después la pantalla de muerte diría siempre lo mismo.
      const motivo = TEXTO_MOTIVO[salud.motivo];

      // En hardcore no se reaparece: se acaba. El mundo no se borra —tirar
      // horas de construcción por un despiste sería otra cosa— pero queda
      // cerrado, y lo que se guarda es el momento de la muerte.
      if (partida.estado.hardcore) {
        partida.estado.hardcoreMuerto = true;
        bucle.parar();
        particulas.limpiar();
        panelVida.mostrarMuerte(true, `${motivo} Fin de la partida.`);
        void guardar('manual');
        return;
      }

      reaparecer(jugador);
      revivir(salud);
      reiniciarAliento(aliento);
      reiniciarHambre(hambre);
      panelVida.refrescarHambre(hambre);
      particulas.limpiar();
      panelVida.mostrarMuerte(true, motivo);
      window.setTimeout(() => panelVida.mostrarMuerte(false), 2200);
    }

    vocesDeLosBichos();

    // Va después de repartir muertos y antes de limpiar: así la barra ya sabe
    // que el guardián ha caído en el mismo tick en que cae.
    actualizarJefe();

    limpiarEnemigos(enemigos);

    if (--relojAparicion <= 0) {
      relojAparicion = INTERVALO_INTENTO;
      const txJugador = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
      const tyJugador = Math.floor((jugador.caja.y + jugador.caja.alto) / TILE);
      const salido = intentarAparicion(mundo, enemigos, jugador.caja, {
        esNoche: reloj.esNoche,
        superficieTy: motorLuz.alturaCielo[txJugador] ?? 0,
        bioma: biomaEn(mundo, txJugador, tyJugador),
        luzEn: (tx, ty) => motorLuz.luzEstimada(tx, ty, reloj.luzSolar),
        dif: nivelDif,
        version: versionMundo,
        // Solo si el mundo llegó a tener inframundo: en uno de 4.1.0 esa fila
        // es caverna corriente, y llenarla de diablillos sería meter en una
        // versión vieja algo que entonces no existía.
        inframundoTy: hay('inframundo', versionMundo)
          ? techoInframundo(mundo.alto, hay('mundoHondo', versionMundo))
          : undefined,
      });
      // Un élite se anuncia. Aparece fuera de pantalla como todo lo demás, y
      // enterarse de que ese zombi pegaba dos veces y media cuando ya te ha
      // quitado media vida no es una sorpresa, es una emboscada: el aura solo
      // sirve si da tiempo a mirarla.
      if (salido?.elite) aviso.mostrar(`Se acerca un ${nombreDe(salido)}`, true);
    }

    if (salud.invulnerable > 0 || salud.desdeGolpe < 3) panelVida.refrescar(salud);
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
    // Última red: aunque algo se cuele en el zurrón —un guardado retocado a
    // mano, el menú de depuración sin límite—, no se puede usar en un mundo
    // que no lo conoce. Es una sola comprobación porque colocar, comer, minar
    // y disparar salen todos de aquí.
    if (!objetoExisteEn(enMano, versionMundo)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      derAnterior = puntero.der;
      if ((puntero.izq || puntero.der) && esperaAvisoVersion <= 0) {
        esperaAvisoVersion = 120;
        aviso.mostrar(`${defObjeto(enMano).nombre} no existe en la versión ${versionMundo}`, true);
      }
      return;
    }
    const tileEnMano = defObjeto(enMano).tile;
    // Antes de 3.0.0 cualquier pico rompía cualquier cosa: no había niveles.
    const nivel = tiene('nivelesHerramienta') ? nivelEnMano(enMano) : Infinity;
    // La potencia depende del tile al que se apunta, no solo de la mano: es
    // lo que separa una pala de un pico rápido.
    const tileApuntado = capa === 'bloque' ? mundo.getTile(tx, ty) : mundo.getPared(tx, ty);
    const potencia = potenciaContra(enMano, tileApuntado);

    // Sembrar: clic derecho sobre el hueco que hay encima de tierra labrada.
    if (esSemilla(enMano)) {
      const sitio = enAlcance(jugador.caja, tx, ty) && puedeSembrar(mundo, tx, ty);
      objetivo.valido = sitio;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar) return;
      if (!sitio) {
        avisarSiembra();
        return;
      }
      mundo.setTile(tx, ty, siembraDe(enMano));
      renderer.cache.invalidar(tx, ty);
      inventario.sacarDe(barra.seleccion, 1);
      barra.refrescar(capa);
      audio.sonar('recoger', 1.3);
      return;
    }

    // La azada labra con el clic derecho: no rompe nada, cambia el tile por
    // tierra labrada. Es el sustrato donde se sembrará más adelante.
    if (esAzada(enMano)) {
      const labrable =
        capa === 'bloque' &&
        enAlcance(jugador.caja, tx, ty) &&
        LABRABLES.includes(mundo.getTile(tx, ty)) &&
        mundo.getTile(tx, ty - 1) === AIRE;
      objetivo.valido = labrable;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar || !labrable) return;
      mundo.setTile(tx, ty, TIERRA_LABRADA);
      renderer.cache.invalidar(tx, ty);
      audio.sonar('picar', 0.7);
      particulas.emitir(tx * TILE + 8, ty * TILE + 4, {
        cantidad: 8,
        color: defTile(TIERRA_LABRADA).color,
        dispersion: 1.4,
        empujeY: -0.8,
        vida: 20,
        tam: 2,
      });
      return;
    }

    // El cristal de vida se usa como la comida: clic derecho, donde uno esté.
    if (esCristal(enMano)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar) return;
      if (ampliarVida(salud)) {
        inventario.sacarDe(barra.seleccion, 1);
        barra.refrescar(capa);
        panelVida.refrescar(salud);
        aviso.mostrar(`Vida máxima ${salud.vidaMax}`);
        audio.sonar('recoger', 1.5);
        particulas.emitir(
          jugador.caja.x + jugador.caja.ancho / 2,
          jugador.caja.y + jugador.caja.alto / 2,
          { cantidad: 18, color: '#e0538f', dispersion: 2, empujeY: -1.2, vida: 34, tam: 3 },
        );
      } else {
        aviso.mostrar('Ya tienes toda la vida que se puede tener');
      }
      return;
    }

    // Comer va con el clic derecho, igual que usar cualquier otra cosa. No hace
    // falta apuntar a ningún sitio: se come donde uno esté.
    if (esComida(enMano)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar) return;
      const def = defObjeto(enMano);
      if (comer(hambre, salud, def.saciedad ?? 0, def.curacion ?? 0)) {
        inventario.sacarDe(barra.seleccion, 1);
        barra.refrescar(capa);
        panelVida.refrescar(salud);
        panelVida.refrescarHambre(hambre);
        audio.sonar('recoger', 0.6);
        particulas.emitir(
          jugador.caja.x + jugador.caja.ancho / 2,
          jugador.caja.y + 12,
          { cantidad: 6, color: def.color, dispersion: 1.2, vida: 22, tam: 2 },
        );
      } else {
        aviso.mostrar('Ya estás lleno');
      }
      return;
    }

    // El cubo actúa con el clic derecho, como colocar: el gesto es "poner algo
    // ahí", aunque lo que se ponga sea agua. Y con el izquierdo, recoger.
    if (esCubo(enMano)) {
      const posible =
        enAlcance(jugador.caja, tx, ty) && puedeUsarCubo(mundo, enMano, tx, ty);
      objetivo.valido = posible;
      reiniciarPicado(picado);
      const usar = puntero.izq || (puntero.der && !derAnterior);
      derAnterior = puntero.der;
      if (!usar || !posible) return;
      const r = usarCubo(mundo, liquidos, enMano, tx, ty);
      if (r.tipo !== 'nada') {
        inventario.sacarDe(barra.seleccion, 1);
        // Si la ranura ya no cabe —porque llevaba varios cubos vacíos— el que
        // vuelve va donde quepa, nunca al suelo.
        if (!inventario.ponerEn(barra.seleccion, r.objeto, 1)) inventario.anadir(r.objeto, 1);
        barra.refrescar(capa);
        motorLuz.marcarSucio();
      }
      return;
    }

    // El arco dispara con el clic izquierdo, hacia donde apunte el ratón. Gasta
    // una flecha del inventario; sin flechas no hace nada más que avisar.
    if (esArco(enMano)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      derAnterior = puntero.der;
      if (!puntero.izq || !puedeGolpear(golpe)) return;
      const def = defObjeto(enMano);
      const municion = mejorFlecha();
      if (municion === NADA) {
        avisarSinFlechas();
        return;
      }
      inventario.quitar(municion, 1);
      barra.refrescar(capa);
      // El golpe se reutiliza solo como reloj de cadencia: el arco no tiene
      // caja de barrido, así que la animación se apaga en el acto.
      lanzarGolpe(golpe, enMano, wx < jugador.caja.x ? -1 : 1);
      golpe.restante = 0;
      jugador.caja.mirando = wx < jugador.caja.x ? -1 : 1;
      anadirFlecha(
        flechas,
        dispararDesde(
          jugador.caja,
          wx,
          wy,
          def.velocidad ?? 9,
          (def.dano ?? 0) * trucos.danoMultiplicador,
          puntaDe(municion),
        ),
      );
      audio.sonar('flechazo', 0.92 + Math.random() * 0.2);
      return;
    }

    // Con un arma en la mano el clic izquierdo golpea; con cualquier otra cosa,
    // pica. Es lo que hace que elegir el arma signifique algo.
    if (puntero.izq && esArma(enMano)) {
      // El mandoble sale hacia donde apunta el ratón. Se mide desde el pecho,
      // no desde los pies: apuntando al suelo justo delante, el vector desde
      // los pies casi no baja y el golpe saldría de lado.
      const sentido = sentidoDeVector(
        wx - (jugador.caja.x + jugador.caja.ancho / 2),
        wy - (jugador.caja.y + jugador.caja.alto * 0.4),
      );
      // El silbido solo suena cuando el golpe sale de verdad: `lanzarGolpe`
      // no hace nada si el arma aún está en su cadencia, y un silbido por cada
      // clic mantenido convertiría la espada en una batidora.
      if (puedeGolpear(golpe)) audio.sonar('espadazo', 0.9 + Math.random() * 0.25);
      lanzarGolpe(golpe, enMano, jugador.caja.mirando, sentido);
      reiniciarPicado(picado);
      objetivo.valido = false;
      derAnterior = puntero.der;
      return;
    }

    // El recuadro anticipa la acción que hará el botón que tengas pulsado; sin
    // pulsar nada, enseña si ahí se puede construir.
    let previo;
    if (puntero.izq) {
      previo = puedeMinar(mundo, jugador.caja, tx, ty, capa, nivel);
      // Que el bloque pida más pico del que llevas es el único rechazo que hay
      // que explicar: los demás (fuera de alcance, ahí no hay nada) se leen
      // solos mirando la pantalla, y este no.
      if (previo.motivo === 'herramienta') {
        avisarHerramienta(previo.nivelPedido ?? 1);
      }
    } else if (tileEnMano === undefined) {
      previo = { ok: false as const };
    } else {
      previo =
        capa === 'bloque'
          ? puedeColocarBloque(mundo, jugador.caja, tx, ty, tileEnMano)
          : puedeColocarPared(mundo, jugador.caja, tx, ty);
    }
    objetivo.valido = previo.ok;

    // Romper un cofre lleno haría desaparecer lo que guarda. Se vacía primero.
    if (
      puntero.izq &&
      capa === 'bloque' &&
      mundo.getTile(tx, ty) === COFRE &&
      !cofres.vacio(tx, ty)
    ) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      return;
    }

    if (puntero.izq) {
      if (previo.ok) {
        // Lo que suelta el tile se calcula antes de romperlo: después ya es aire.
        // El filtro de versión va aquí y no dentro de `dropDeTile`: la tabla
        // de drops es del catálogo y no sabe de partidas. En un mundo de
        // 2.1.0 la hierba existe pero las semillas no, así que da tierra.
        const soltado = filtrarObjeto(
          capa === 'bloque'
            ? dropDeTile(mundo.getTile(tx, ty))
            : dropDePared(mundo.getPared(tx, ty)),
          versionMundo,
        );
        // Chispas del pico mientras se pica, no solo al romper: el bloque
        // avisa de que le está pasando algo antes de partirse.
        const colorTile =
          capa === 'bloque'
            ? defTile(mundo.getTile(tx, ty)).color
            : defTile(mundo.getPared(tx, ty)).color;
        // El material lo pone el tile, no la herramienta: picar un tronco con
        // el pico de oro sigue sonando a madera.
        const material = materialDe(capa === 'bloque' ? mundo.getTile(tx, ty) : mundo.getPared(tx, ty));
        // Hasta 4.1.0 todo sonaba igual, con una sola voz para picar y otra
        // para romper.
        const vozPicar = tiene('audioPorMaterial') ? (`picar-${material}` as const) : 'picar';
        const vozRomper = tiene('audioPorMaterial') ? (`romper-${material}` as const) : 'romper';
        if (picado.progreso > 0) audio.sonar(vozPicar, 0.85 + Math.random() * 0.35);
        if (picado.progreso > 0 && Math.random() < 0.35) {
          particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
            cantidad: 1,
            color: colorTile,
            dispersion: 1.2,
            empujeY: -0.7,
            vida: 16,
            tam: 2,
          });
        }
        if (avanzarPicado(mundo, picado, tx, ty, capa, potencia * trucos.velocidadMinado)) {
          renderer.cache.invalidar(tx, ty);
          motorLuz.invalidar(tx);
          // Abrir un hueco es lo que hace que el agua de al lado se mueva.
          liquidos.activar(tx, ty);
          // Área de minado del menú de depuración: el tile del centro ya se ha
          // roto arriba; aquí se barre el resto del cuadrado.
          if (trucos.radioMinado > 1) romperArea(tx, ty, trucos.radioMinado);
          // El bloque revienta en cascotes de su propio color.
          particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
            cantidad: 14,
            color: colorTile,
            dispersion: 2.2,
            vida: 32,
            tam: 3,
          });
          sacudir(0.9);
          audio.sonar(vozRomper, 0.88 + Math.random() * 0.28);
          soltar(drops, soltado, tx, ty);
          if (soltado === COFRE) cofres.borrar(tx, ty);
          const abierto = barra.cofreAbierto;
          if (abierto && abierto.tx === tx && abierto.ty === ty) barra.cerrar();
        }
      } else {
        reiniciarPicado(picado);
      }
    } else if (picado.progreso > 0) {
      reiniciarPicado(picado);
    }

    // Un cofre se abre con el clic derecho: es la acción que espera cualquiera
    // que se ponga delante de uno, y coloca por encima de construir.
    if (puntero.der && !derAnterior && mundo.getTile(tx, ty) === COFRE) {
      const abierto = barra.cofreAbierto;
      if (abierto && abierto.tx === tx && abierto.ty === ty) barra.cerrar();
      else barra.abrirCofre(cofres.obtener(tx, ty), tx, ty);
      derAnterior = puntero.der;
      return;
    }

    // La cama pasa la noche de un tirón. De día no hace nada: dormir para
    // saltarse el día sería saltarse el juego.
    if (puntero.der && !derAnterior && mundo.getTile(tx, ty) === CAMA) {
      derAnterior = puntero.der;
      if (!tiene('camas') || !enAlcance(jugador.caja, tx, ty)) return;
      if (!reloj.esNoche) {
        aviso.mostrar('Solo se duerme de noche');
        return;
      }
      reloj.ir(AMANECER + 10);
      motorLuz.marcarSucio();
      // Al despertar no hay nadie: los bichos de la noche se van con ella.
      for (const e of enemigos) e.vivo = false;
      limpiarEnemigos(enemigos);
      aviso.mostrar('Has dormido hasta el amanecer');
      audio.sonar('recoger', 0.6);
      return;
    }

    // El altar: clic derecho con la ofrenda completa y el guardián despierta.
    // No hace falta llevar nada en la mano —lo que cuenta es lo que hay en el
    // zurrón— porque en el momento de invocarlo lo que uno quiere tener en la
    // mano es la espada, no el hueso.
    if (puntero.der && !derAnterior && mundo.getTile(tx, ty) === ALTAR) {
      derAnterior = puntero.der;
      if (!tiene('jefe') || !enAlcance(jugador.caja, tx, ty)) return;
      invocarJefe(tx, ty);
      return;
    }

    // Y una estación se abre igual, con su lista de recetas en grande. Antes
    // había que acordarse de acercarse y abrir el inventario; hacer clic en la
    // mesa es lo que intenta todo el mundo la primera vez.
    const tileAqui = mundo.getTile(tx, ty);
    if (
      puntero.der &&
      !derAnterior &&
      esEstacion(tileAqui) &&
      enAlcance(jugador.caja, tx, ty)
    ) {
      const abierto = barra.tallerAbierto;
      if (abierto && abierto.tx === tx && abierto.ty === ty) barra.cerrar();
      else barra.abrirTaller(defTile(tileAqui).nombre, tx, ty);
      derAnterior = puntero.der;
      return;
    }
    derAnterior = puntero.der;

    if (puntero.der && previo.ok && tileEnMano !== undefined) {
      // Colocar gasta: el inventario es la razón de ser de esta fase.
      if (inventario.sacarDe(barra.seleccion, 1) > 0) {
        if (capa === 'bloque') mundo.setTile(tx, ty, tileEnMano);
        else mundo.setPared(tx, ty, tileEnMano);
        renderer.cache.invalidar(tx, ty);
        motorLuz.invalidar(tx);
        audio.sonar('colocar', 0.85 + Math.random() * 0.3);
        // Tapar una celda con agua la vacía en el paso siguiente, y el líquido
        // de al lado tiene que enterarse de que ha perdido un camino.
        liquidos.activar(tx, ty);
        barra.refrescar(capa);
      }
    }
  }

  /**
   * Líquidos: un paso de simulación y sus consecuencias sobre el jugador.
   *
   * Devuelve cuánto está sumergido, que es lo que la física necesita para saber
   * si toca nadar. La luz solo se marca sucia cuando hay lava en movimiento:
   * el agua no ilumina, y rehacer la ventana de luz en cada tick de una cascada
   * sería pagar por nada.
   */
  function actualizarLiquidos(): number {
    if (!tiene('liquidos')) return 0;
    const antes = liquidos.pendientes;
    liquidos.paso();
    // Una colada apagada deja obsidiana: hay que repintar el chunk y rehacer la
    // luz, porque donde había lava alumbrando ahora hay un bloque macizo.
    for (const { tx, ty } of liquidos.apagados) {
      renderer.cache.invalidar(tx, ty);
      motorLuz.invalidar(tx);
      particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
        cantidad: 10,
        color: '#d8d8e0',
        forma: 'humo',
        dispersion: 1.2,
        empujeY: -1.4,
        vida: 40,
        tam: 3,
      });
    }
    if (liquidos.apagados.length > 0) {
      motorLuz.marcarSucio();
      audio.sonar('quemar', 0.7);
    }
    const s = sumersion(mundo, jugador.caja, TILE);
    if (s.lava || (antes > 0 && hayLavaCerca())) motorLuz.marcarSucio();

    const r = tickAliento(
      aliento,
      salud,
      jugador.caja,
      s.cabeza && !s.lava,
      s.lava,
      nivelDif.castigo,
    );
    if (s.fraccion > 0 && !s.lava) apagar(aliento);
    if (r.dano) {
      panelVida.refrescar(salud);
      if (r.motivo === 'ahogo') aviso.mostrar('Te estás ahogando', true);
      else if (r.motivo === 'lava') aviso.mostrar('¡Lava!', true);
      audio.sonar(r.motivo === 'ahogo' ? 'chapoteo' : 'quemar');
    }
    panelVida.refrescarAliento(aliento);
    return s.fraccion;
  }

  /** Ticks que llevaba el jugador dentro del agua, para el chapoteo de entrada. */
  let mojadoAntes = false;
  /** Ticks entre pisada y pisada de polvo al correr. */
  let relojPisada = 0;

  /**
   * Polvo, chapoteos y sacudidas que salen de lo que hace el jugador.
   *
   * Va aquí y no dentro de la física porque nada de esto cambia la simulación:
   * son avisos para el ojo. Si mañana hay que quitarlos para depurar, se quita
   * esta función entera y el juego se comporta exactamente igual.
   */
  function efectosDelJugador(enSueloAntes: boolean, sumergido: number): void {
    const c = jugador.caja;
    const pies = { x: c.x + c.ancho / 2, y: c.y + c.alto };

    // El salto suena en el tick en que despega: estaba en el suelo, ya no lo
    // está, y el impulso acaba de empezar.
    if (enSueloAntes && !c.enSuelo && c.saltando) {
      audio.sonar('saltar', 0.95 + Math.random() * 0.15);
    }

    // Daño de caída. Va con el aterrizaje porque es el mismo suceso: el polvo
    // y el golpe salen de la misma altura.
    if (!enSueloAntes && c.enSuelo && tiene('danoCaida')) {
      const dano = Math.round(danoDeCaida(c.ultimaCaida) * nivelDif.castigo);
      if (dano > 0 && golpear(salud, c, dano, c.x + c.ancho / 2, 30, false, 'caida')) {
        panelVida.refrescar(salud);
        aviso.mostrar('¡Golpe al caer!', true);
        audio.sonar('dano', 0.8);
        particulas.emitir(pies.x, pies.y, {
          cantidad: 14,
          color: '#d94f4f',
          dispersion: 1.8,
          empujeY: -1,
          vida: 26,
          tam: 2,
        });
      }
    }

    // Aterrizaje: cuanto más alta la caída, más polvo y más sacude.
    if (!enSueloAntes && c.enSuelo && c.ultimaCaida > 1.5) {
      const fuerza = Math.min(1, c.ultimaCaida / 12);
      particulas.emitir(pies.x, pies.y, {
        cantidad: Math.round(4 + fuerza * 12),
        color: colorDelSuelo(pies.x, pies.y),
        dispersion: 1 + fuerza * 1.6,
        empujeY: -0.6,
        vida: 26,
        tam: 2,
      });
      if (fuerza > 0.4) sacudir(fuerza * 3.2);
      audio.sonar('aterrizar', 0.85 + fuerza * 0.4);
    }

    // Correr levanta polvo, pero solo de vez en cuando: una nube continua
    // convierte al personaje en una locomotora.
    if (c.enSuelo && Math.abs(c.vx) > 1.6 && --relojPisada <= 0) {
      relojPisada = 9;
      particulas.emitir(pies.x - Math.sign(c.vx) * 5, pies.y - 1, {
        cantidad: 2,
        color: colorDelSuelo(pies.x, pies.y),
        dispersion: 0.5,
        empujeX: -Math.sign(c.vx) * 0.5,
        empujeY: -0.5,
        vida: 18,
        tam: 2,
      });
    }

    // Entrar y salir del agua: el chapoteo es lo que convierte el borde del
    // lago en una superficie y no en una línea de color.
    const mojado = sumergido > 0.12;
    if (mojado !== mojadoAntes && Math.abs(c.vy) > 1) {
      audio.sonar('chapoteo');
      particulas.emitir(pies.x, c.y + c.alto * (mojado ? 0.8 : 0.2), {
        cantidad: 10,
        color: '#9fd0f2',
        dispersion: 1.9,
        empujeY: -1.5,
        vida: 24,
        tam: 2,
        gravedad: 0.3,
      });
    }
    mojadoAntes = mojado;

    // Burbujas al bucear: el aviso de que ahí abajo se gasta aire.
    if (sumergido > 0.5 && Math.random() < 0.06) {
      particulas.emitir(c.x + c.ancho * 0.7, c.y + 6, {
        cantidad: 1,
        color: '#cfeaff',
        forma: 'burbuja',
        dispersion: 0.25,
        vida: 60,
        tam: 2,
        gravedad: 0.06,
      });
    }
  }

  /** Color aproximado del bloque que se pisa, para que el polvo sea de su tierra. */
  function colorDelSuelo(wx: number, wy: number): string {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    for (let d = 0; d < 3; d++) {
      const id = mundo.getTile(tx, ty + d);
      if (id !== AIRE) return defTile(id).color;
    }
    return '#8a7360';
  }

  /**
   * Vuelo del menú de depuración: se mueve libre, sin gravedad ni colisiones.
   *
   * Atravesar la roca es justo lo que se quiere de un modo de vuelo de pruebas
   * —bajar a la caverna sin cavar—, así que no se resuelve colisión ninguna.
   */
  function volarUnTick(e: ReturnType<typeof entrada.estado>): void {
    const c = jugador.caja;
    const v = 6;
    jugador.xPrev = c.x;
    jugador.yPrev = c.y;
    c.vx = (e.der ? v : 0) - (e.izq ? v : 0);
    c.vy = (e.abajo ? v : 0) - (e.salto ? v : 0);
    c.x += c.vx;
    c.y += c.vy;
    c.enSuelo = false;
    c.ultimaCaida = 0;
    c.yInicioCaida = c.y;
    if (c.vx !== 0) c.mirando = c.vx > 0 ? 1 : -1;
  }

  /** Rompe un cuadrado de tiles de golpe. Solo lo usa el menú de depuración. */
  function romperArea(tx: number, ty: number, lado: number): void {
    const r = Math.floor(lado / 2);
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const x = tx + dx;
        const y = ty + dy;
        if (!mundo.dentro(x, y) || mundo.getTile(x, y) === AIRE) continue;
        const soltado = dropDeTile(mundo.getTile(x, y));
        mundo.setTile(x, y, AIRE);
        renderer.cache.invalidar(x, y);
        motorLuz.invalidar(x);
        liquidos.activar(x, y);
        soltar(drops, soltado, x, y);
      }
    }
  }

  /** ¿Hay lava en la ventana visible? Solo entonces su movimiento cambia la luz. */
  function hayLavaCerca(): boolean {
    const { tx0, ty0, tx1, ty1 } = renderer.camara.tilesVisibles();
    for (let ty = ty0; ty <= ty1; ty += 2) {
      for (let tx = tx0; tx <= tx1; tx += 2) {
        if (mundo.getLiquido(tx, ty) > 0 && mundo.esLava(tx, ty)) return true;
      }
    }
    return false;
  }

  /** Fracción sumergida del último tick, que el render necesita para la pose. */
  let sumergidoAhora = 0;

  const bucle = crearBucle(
    () => {
      // Antes de 1.5.0 no había ciclo: el sol no se movía de mediodía.
      if (tiene('diaNoche')) reloj.avanzar(TICK);
      if (esperaAvisoPico > 0) esperaAvisoPico--;
      if (esperaAvisoVersion > 0) esperaAvisoVersion--;
      if (esperaAvisoFlechas > 0) esperaAvisoFlechas--;
      if (esperaAvisoSiembra > 0) esperaAvisoSiembra--;
      editar();
      const sumergido = actualizarLiquidos();
      const enSueloAntes = jugador.caja.enSuelo;
      if (trucos.volar) volarUnTick(entrada.estado());
      else actualizarJugador(mundo, jugador, entrada.estado(), ajustes, sumergido);
      efectosDelJugador(enSueloAntes, sumergido);
      sumergidoAhora = sumergido;
      actualizarDrops();
      if (tiene('cultivos')) actualizarCultivos();
      actualizarCombate();
      particulas.actualizar(mundo);
      if (opciones.sacudidaActiva) renderer.camara.tickSacudida();
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
      renderer.dibujar({
        mundo,
        jugador,
        alpha,
        zonas: partida.zonas,
        picado,
        objetivo,
        motorLuz,
        reloj,
        drops,
        enemigos,
        golpe,
      flechas,
        particulas,
        sumergido: sumergidoAhora,
        enMano: barra.objetoActivo(),
        // Hasta 4.1.0 la armadura se llevaba pero no se veía.
        armadura: tiene('armaduraVisible') ? coloresEquipo(equipo) : ARMADURA_DESNUDA,
        epoca,
      bioma: tiene('fondoPorBioma') ? biomaDelFondo() : 'bosque',
      });

      debug.fps = bucle.fps;
      debug.msFrame = bucle.msFrame;
      debug.chunksVivos = renderer.cache.tamano;
      debug.hora = reloj.hora;
      debug.luzRaton = motorLuz.nivel(debug.ratonTx, debug.ratonTy);
      debug.drops = drops.length;
      debug.enemigos = enemigos.length;
      debug.segundosDesdeGuardado = partida.guardable
        ? Math.round((Date.now() - ultimoGuardado) / 1000)
        : -1;
      actualizarBrujula();
      dibujarDebug(renderer.ctx, renderer.camara, jugador, debug, renderer.escala);
    },
  );

  // Un mundo recién migrado se guarda en el acto. Esperar al autoguardado
  // significaría que cerrar la pestaña en los primeros treinta segundos deja
  // el mundo en la versión vieja después de haber confirmado el cambio.
  if (partida.migrada) void guardar('auto');

  progreso(100, 'Listo');
  // Un mundo hardcore en el que ya se murió se abre para mirarlo, no para
  // jugarlo: se pinta un frame y ahí se queda. Sin esto se podría seguir
  // jugando tras la muerte con solo recargar la página, y el modo entero
  // dejaría de significar nada.
  if (partida.estado.hardcoreMuerto) {
    bucle.arrancarUnFrame();
    panelVida.mostrarMuerte(true, 'Aquí se acabó esta partida.');
  } else {
    bucle.arrancar();
  }
  setTimeout(ocultarCargador, 250);
}

arrancar().catch(mostrarError);

window.addEventListener('error', (e) => mostrarError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => mostrarError(e.reason));

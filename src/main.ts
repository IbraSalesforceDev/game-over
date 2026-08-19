import { TICK, TILE } from './core/constants';
import { dificultad, DIFICULTAD_POR_DEFECTO } from './core/dificultad';
import { hay, VERSION_ACTUAL, type Caracteristica } from './core/versiones';
import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { AMANECER, Reloj } from './engine/time';
import { crearPuntero } from './engine/mouse';
import { crearAudio } from './engine/audio';
import {
  aplicarEfecto,
  crearEfectos,
  defensaExtra,
  DURACION,
  EFECTOS,
  limpiarDaninos,
  limpiarEfectos,
  multiplicadorAire,
  multiplicadorDano,
  multiplicadorMinado,
  multiplicadorSalto,
  multiplicadorVelocidad,
  tickEfectos,
} from './entities/efectos';
import { crearPanelEstados } from './ui/estados';
import {
  ATAQUES,
  avanzarDisparos,
  lanzarAtaque,
  limpiarDisparos,
  type Disparo,
} from './entities/ataques';
import {
  JEFE_FINAL,
  jefeDeInvocador,
  jefeDeSantuario,
  pagarReliquias,
  RELIQUIAS_BIOMA,
  reliquiasQueFaltan,
  tieneTodasLasReliquias,
  sitioCorrecto,
  trofeoDe,
  type DefJefe,
  type DondeEstoy,
} from './world/jefes';
import {
  crearEstadoPoder,
  FILOS,
  gastarPoder,
  PODERES,
  poderListo,
  REPRESALIAS,
  tickPoder,
  type ClaseFilo,
} from './items/inscripciones';
import { crearAjustes, type Graficos } from './ui/ajustes';
import { crearAyuda } from './ui/ayuda';
import { crearAcompanados } from './ui/acompanados';
import { crearMapa } from './ui/mapa';
import { crearBrujula } from './ui/brujula';
import { crearPanelJefe } from './ui/jefe';
import { crearPausa } from './ui/pausa';
import {
  crearDebugMenu,
  crearTrucos,
  destinoDeViaje,
  MARGEN_VIAJE,
} from './ui/debugmenu';
import { AJUSTES_POR_DEFECTO, type Ajustes } from './entities/physics';
import { actualizarJugador, crearJugador, reaparecer } from './entities/player';
import { crearEstadoDebug, dibujarDebug } from './render/debug';
import { ARMADURA_DESNUDA } from './render/sprites';
import { Renderer, type EpocaVisual, type Objetivo } from './render/renderer';
import type { BiomaFondo } from './render/fondo';
import { crearAviso } from './ui/aviso';
import { crearBarra } from './ui/hotbar';
import { mostrarMenu, type Eleccion, type Fuente, type FuenteNube } from './ui/menu';
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
  estructuraEn,
  nombreEstructura,
  santuarioDelAltar,
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
  poderPuesto,
  represaliasPuestas,
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
  ALTAR_BIOMA,
  CAMA,
  COFRE,
  defTile,
  esEstacion,
  HIERBA,
  materialDe,
  TIERRA,
  TIERRA_LABRADA,
  danoEnCaja,
  esSolido,
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
  botiquinDe,
  guantesDeElite,
  danarEnemigo,
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
  actualizarExplosivos,
  anadirExplosivo,
  lanzarDesde,
  limpiarExplosivos,
  type Estallido,
  type Explosivo,
} from './entities/explosivos';
import {
  ampliarVida,
  crearSalud,
  curar,
  danoDeCaida,
  golpear,
  revivir,
  TEXTO_MOTIVO,
  TICKS_INVULNERABLE,
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
  CORONA_ROTA,
  ESPADA_VERDADERA,
  esComida,
  filoDe,
  esInvocador,
  esPocion,
  esCristal,
  esCubo,
  FLECHAS,
  puntaDe,
  ESENCIA,
  ESPADA_GUARDIAN,
  LINGOTE_ORO,
  esExplosivo,
  DINAMITA,
} from './items/items';
import {
  biomaEn,
  PROFUNDIDAD_PELIGRO,
  apuntarMuerte,
  avanzarPresion,
  crearPresion,
  intentarAparicion,
  INTERVALO_INTENTO,
  RITMO_ESTRUCTURA,
  limpiarEnemigos,
} from './entities/spawner';
import { accionarInterruptor, resolverCorriente } from './world/corriente';
import {
  cortarSuceso,
  crearSucesos,
  forzarSuceso,
  ritmoDeApariciones,
  ritmoDeElites,
  SUCESOS,
  tickSucesos,
  type ClaseSuceso,
} from './world/sucesos';
import { caerMeteorito, RADIO as RADIO_METEORITO } from './world/meteorito';
import { crearPanelVida } from './ui/vida';
import { esArma } from './items/items';
import {
  desempaquetar,
  HORA_POR_DEFECTO,
  VERSION_FORMATO,
  type EstadoPartida,
} from './world/save';
import { empaquetarFuera } from './world/empaquetador';
import type { SesionRed } from './red/sesion';
import type { CambioTile } from './red/protocolo';
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

/**
 * Ticks entre tandas de esqueletos mientras el guardián está enfurecido.
 *
 * Cinco segundos desde 6.8.0, siete antes. Con el jefe reforzado la segunda
 * fase dura bastante más, y una tanda cada siete segundos se limpiaba en el
 * hueco entre embestidas: los esbirros dejaban de ser presión para ser botín.
 */
const INTERVALO_ESBIRROS = 300;
const INTERVALO_ESBIRROS_ORIGINAL = 420;
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
  /**
   * De dónde salió, y por tanto dónde se guarda.
   *
   * Un mundo o es local o es de la nube, nunca las dos cosas. Sin este dato, un
   * mundo abierto desde la nube se autoguardaría en el navegador y las dos
   * copias empezarían a separarse en silencio.
   */
  fuente?: Fuente;
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
      finalVencido: false,
      versionJuego,
      // La profundidad se fija al crear el mundo y ya no cambia: acompaña al
      // mundo aunque después se migre a otra versión.
      mundoHondo: hay('mundoHondo', versionJuego),
    },
  };
}

/**
 * La nube, montada para el menú.
 *
 * Todo lo de Supabase entra por importaciones dinámicas: quien juegue en local
 * no descarga la librería ni una vez. Y si la nube no está disponible —sin red,
 * o el proyecto pausado— el menú lo enseña y el juego local sigue igual.
 */
function crearFuenteNube(capaUI: HTMLElement, local: SaveAdapter): FuenteNube {
  let almacenNube: SaveAdapter | null = null;

  async function traerAlmacen(): Promise<SaveAdapter> {
    if (!almacenNube) {
      const { AlmacenNube } = await import('./nube/adaptador');
      almacenNube = new AlmacenNube();
    }
    return almacenNube;
  }

  return {
    // Se envuelve para que la carga siga siendo perezosa: pedir el almacén no
    // debe traerse la librería hasta que de verdad se vaya a usar.
    get almacen(): SaveAdapter {
      return {
        listar: async () => (await traerAlmacen()).listar(),
        cargar: async (id) => (await traerAlmacen()).cargar(id),
        guardar: async (id, meta, datos) => (await traerAlmacen()).guardar(id, meta, datos),
        borrar: async (id) => (await traerAlmacen()).borrar(id),
      };
    },

    async quien(): Promise<string | null> {
      const { quienSoy } = await import('./nube/sesion');
      return (await quienSoy())?.correo ?? null;
    },

    async entrar(): Promise<boolean> {
      const [{ pedirEntrada }, sesion] = await Promise.all([
        import('./ui/cuenta'),
        import('./nube/sesion'),
      ]);
      return pedirEntrada(capaUI, {
        entrar: sesion.entrar,
        registrarse: sesion.registrarse,
      });
    },

    async salir(): Promise<void> {
      const { salir } = await import('./nube/sesion');
      await salir();
    },

    /**
     * Llevar un mundo local a la nube. **De ida.**
     *
     * El orden es sagrado: subir, comprobar que está arriba, y solo entonces
     * borrar el local. Al revés, un fallo de red entre los dos pasos se lleva la
     * partida entera. Se prefiere quedarse con dos copias un rato —y borrar la
     * local después— que arriesgarse a quedarse con ninguna.
     */
    async subir(meta: MetaMundo): Promise<void> {
      const bytes = await local.cargar(meta.id);
      const arriba = await traerAlmacen();
      await arriba.guardar(meta.id, meta, bytes);

      // Comprobación de verdad: que aparezca en la lista de allí. Sin esto se
      // estaría borrando el original por fiarse de que no hubo excepción.
      const lista = await arriba.listar();
      if (!lista.some((m) => m.id === meta.id)) {
        throw new Error('El mundo no ha llegado a la nube. No se ha borrado el local.');
      }
      await local.borrar(meta.id);
    },

    async canjear(codigo: string): Promise<void> {
      const { AlmacenNube } = await import('./nube/adaptador');
      await new AlmacenNube().canjear(codigo);
    },

    async invitar(idPartida: string): Promise<string> {
      const { AlmacenNube } = await import('./nube/adaptador');
      return new AlmacenNube().invitar(idPartida);
    },
  };
}

/** Decide con qué partida se arranca: URL directa, menú, o carga de disco. */
async function elegirPartida(
  capaUI: HTMLElement,
  almacen: SaveAdapter,
  persistente: boolean,
  nube: FuenteNube,
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
  const eleccion: Eleccion = await mostrarMenu(capaUI, almacen, persistente, nube);
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
  const tienda = eleccion.fuente === 'nube' ? nube.almacen : almacen;
  const bytes = await tienda.cargar(eleccion.meta.id);
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
      fuente: eleccion.fuente,
    };
  }

  return {
    mundo,
    estado,
    zonas: [],
    id: eleccion.meta.id,
    nombre: eleccion.meta.nombre,
    guardable: true,
    fuente: eleccion.fuente,
  };
}

async function arrancar(): Promise<void> {
  const lienzo = document.getElementById('lienzo');
  if (!(lienzo instanceof HTMLCanvasElement)) throw new Error('Falta el canvas #lienzo');
  const capaUI = document.getElementById('capa-ui');
  if (!capaUI) throw new Error('Falta la capa de interfaz #capa-ui');

  const { almacen, persistente } = await crearAlmacen();
  const nube = crearFuenteNube(capaUI, almacen);
  const partida = await elegirPartida(capaUI, almacen, persistente, nube);
  // Un mundo de la nube se guarda en la nube y uno local en el navegador. Es lo
  // que impide que las dos copias se separen en silencio.
  const tiendaDeLaPartida: SaveAdapter = partida.fuente === 'nube' ? nube.almacen : almacen;

  /**
   * La partida acompañada, si la hay.
   *
   * Solo existe en los mundos de la nube: son los que tienen dueño y lista de
   * invitados, así que son los únicos donde tiene sentido que aparezca alguien.
   */
  let sesionRed: SesionRed | null = null;

  /**
   * Si me toca a mí guardar este mundo.
   *
   * En un mundo de la nube guarda **solo el anfitrión**, y hasta saber quién
   * soy no guarda nadie. El estado de la partida —inventario, cofres, vida, la
   * hora— es de quien juega, pero el fichero es uno solo y compartido: con los
   * dos guardando, el último en hacerlo le metía al otro su mochila y sus
   * cofres en el mundo. Y no se notaba hasta la siguiente vez que se abría.
   *
   * `null` mientras no se sabe. Un mundo local no tiene esta duda.
   */
  let mandoYo: boolean | null = partida.fuente === 'nube' ? null : true;

  /**
   * Un bloque que cambia y tiene que enterarse el otro lado.
   *
   * En el anfitrión el mundo ya está tocado y esto solo lo difunde. En el
   * invitado el mundo también está tocado —se pinta al instante, que esperar a
   * picar se siente fatal— y esto lo pide; si el anfitrión dice que no, su
   * difusión lo devuelve a su sitio.
   */
  function avisarTile(tx: number, ty: number, id: number, pared = false): void {
    sesionRed?.tile({ tx, ty, id, pared });
  }

  /** Aplica aquí un cambio que ha decidido el otro lado. */
  function aplicarTilesDeRed(cambios: readonly CambioTile[]): void {
    for (const c of cambios) {
      if (!mundo.dentro(c.tx, c.ty)) continue;
      if (c.pared) mundo.setPared(c.tx, c.ty, c.id);
      else mundo.setTile(c.tx, c.ty, c.id);
      renderer.cache.invalidar(c.tx, c.ty);
      motorLuz.invalidar(c.tx);
      liquidos.activar(c.tx, c.ty);
      corrienteSucia = true;
    }
  }

  /**
   * Entrar en la partida de la nube con quien esté.
   *
   * No hay un botón de «empezar multijugador» porque no hace falta: **un mundo
   * de la nube ya es de un grupo**, con su dueño y su lista de invitados. Quien
   * lo abre entra donde los demás; el dueño hospeda y el resto se une.
   *
   * Si algo falla —sin red, el anfitrión no está— se dice y se sigue jugando
   * solo. Quedarse sin partida por no poder conectar sería el peor cambio
   * posible respecto a como estaba antes.
   */
  /**
   * Quién manda en este mundo, preguntado aparte de conectar.
   *
   * Va por su cuenta porque de esto depende guardar, y guardar no puede
   * quedarse colgando de que la partida acompañada haya podido montarse. Si no
   * se consigue saber —sin red, sin sesión— no se guarda, y esa es la respuesta
   * prudente: equivocarse aquí no estropea tu partida, estropea la de otro.
   */
  /** La pregunta, una sola vez, la haga quien la haga. */
  let preguntaDeMando: Promise<void> | null = null;

  function averiguarSiMando(): Promise<void> {
    preguntaDeMando ??= (async () => {
      if (partida.fuente !== 'nube') return;
      const forzado = new URLSearchParams(window.location.search).get('red');
      if (forzado === 'invitado' || forzado === 'anfitrion') {
        mandoYo = forzado === 'anfitrion';
        return;
      }
      const { AlmacenNube } = await import('./nube/adaptador');
      for (let intento = 0; intento < 4; intento++) {
        try {
          mandoYo = await new AlmacenNube().soyElAnfitrion(partida.id);
          return;
        } catch {
          // Un tropiezo de red no puede decidir que este mundo es de otro.
          await new Promise((sigue) => window.setTimeout(sigue, 3000));
        }
      }
    })();
    return preguntaDeMando;
  }

  async function conectarConLosDemas(): Promise<void> {
    if (partida.fuente !== 'nube') return;
    try {
      const [{ hospedar, unirse }, sesion] = await Promise.all([
        import('./red/sesion'),
        import('./nube/sesion'),
      ]);
      const cuenta = await sesion.quienSoy();
      if (!cuenta) return;
      const nombre = cuenta.correo.split('@')[0] ?? 'Jugador';
      /**
       * Quién hospeda.
       *
       * Normalmente el dueño del mundo. Pero con `?red=invitado` se fuerza a
       * entrar como invitado, y eso no es un truco de laboratorio: **sin ello
       * no se puede probar en dos pestañas de la misma cuenta**, porque las dos
       * verían que son el dueño, las dos hospedarían y ninguna se uniría.
       */
      await averiguarSiMando();
      // Quien manda es quien hospeda: es la misma pregunta, y hacerla dos veces
      // sería poder contestarla de dos formas. Si no se ha podido averiguar, se
      // entra como invitado, que es lo que no puede romper nada de nadie.
      const soyAnfitrion = mandoYo === true;

      // El panel aparece antes de conectar, no después. Ver «conectando…» es la
      // diferencia entre esperar y pensar que está roto.
      acompanados.empezar(soyAnfitrion ? 'anfitrion' : 'invitado');
      acompanados.estado('conectando');

      const comun = {
        idPartida: partida.id,
        nombre,
        // Los ajustes se fijan al conectar. En la fase A no hay combate, así
        // que las pociones que cambian la velocidad todavía no se sincronizan:
        // está anotado como lo primero de la fase B.
        ajustes: ajustesAhora(),
        mundo,
        alContar: (texto: string) => aviso.mostrar(texto),
        alCambiarTiles: aplicarTilesDeRed,
        alCambiarEstado: (estado: string, motivo?: string) => {
          if (estado === 'conectado') {
            aviso.mostrar('Conectado');
            acompanados.estado('conectado');
          } else if (estado === 'fallo') {
            aviso.mostrar(motivo ?? 'No hay conexión', true);
            acompanados.estado('fallo');
          } else if (estado === 'cerrado') {
            acompanados.estado('solo');
          }
        },
      };

      if (soyAnfitrion) {
        sesionRed = await hospedar({
          ...comun,
          spawnTx: Math.round(jugador.spawnX / TILE),
          spawnTy: Math.round(jugador.spawnY / TILE),
          // El mundo que se manda es el de ahora mismo, no el último guardado:
          // si el anfitrión lleva media hora jugando, la copia del disco está
          // vieja y quien entre vería un mundo que ya no existe.
          bytesDelMundo: () => empaquetarFuera(mundo, partida.estado),
          bichos: () => enemigos,
        });
        // La sala está abierta: a partir de aquí lo que falta es que entre
        // alguien, y eso ya no es un problema de conexión.
        acompanados.estado('solo');
      } else {
        sesionRed = await unirse({
          ...comun,
          versionMundo,
          alLlegarMundo: (bytes) => void adoptarMundoDelAnfitrion(bytes),
        });
      }
    } catch (e) {
      console.warn('No se ha podido entrar en la partida acompañada:', e);
      aviso.mostrar('No se ha podido conectar con los demás', true);
      acompanados.estado('fallo');
    }
  }

  /**
   * Cambiar el mundo por el que manda el anfitrión.
   *
   * Se copian las capas dentro del mundo que ya hay en vez de sustituir el
   * objeto: media docena de sistemas —la luz, la caché de chunks, los
   * líquidos— guardan una referencia a él, y cambiársela debajo los dejaría
   * apuntando a un mundo que ya no se dibuja.
   */
  async function adoptarMundoDelAnfitrion(bytes: Uint8Array): Promise<void> {
    try {
      const { mundo: suyo } = await desempaquetar(bytes);
      if (suyo.ancho !== mundo.ancho || suyo.alto !== mundo.alto) {
        aviso.mostrar('El anfitrión tiene otro mundo distinto', true);
        return;
      }
      mundo.tileId.set(suyo.tileId);
      mundo.wallId.set(suyo.wallId);
      mundo.flags.set(suyo.flags);
      mundo.liquido.set(suyo.liquido);
      renderer.cache.invalidarTodo();
      // La luz no tiene un "todo": se recalcula la altura del cielo columna a
      // columna, que es lo único que guarda por adelantado.
      for (let tx = 0; tx < mundo.ancho; tx++) motorLuz.invalidar(tx);
      corrienteSucia = true;
      aviso.mostrar('Mundo sincronizado con el anfitrión');
    } catch (e) {
      console.warn('No se ha podido leer el mundo del anfitrión:', e);
    }
  }
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
  // El inframundo alumbra solo: se le dice al motor de luz desde dónde, para
  // que el sitio no sea una pantalla apagada en cuanto uno se separa de la roca.
  motorLuz.techoInframundo = hay('inframundo', versionMundo)
    ? techoInframundo(mundo.alto, partida.estado.mundoHondo)
    : -1;
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
  /**
   * Lo que llevas puesto ahora mismo: fuego, veneno, fuerza...
   *
   * No se guarda en la partida a propósito. Un efecto dura como mucho un
   * minuto, y recuperar la partida con doce segundos de quemadura pendientes
   * sería castigar por cerrar el juego; al revés, guardar la fuerza recién
   * bebida convertiría cerrar y abrir en una forma de conservarla eternamente.
   */
  const estados = crearEfectos();
  /**
   * La recarga del poder del peto.
   *
   * Una sola, y no una por poder: solo se puede llevar un peto puesto, así que
   * una recarga por clase serviría para cambiarse de peto y disparar dos
   * poderes seguidos, que es justo lo que la recarga existe para impedir.
   */
  const recargaPoder = crearEstadoPoder();
  const hambre = crearHambre(
    partida.estado.hambre > 0 ? partida.estado.hambre : HAMBRE_MAXIMA,
  );
  const golpe = crearGolpe();
  const flechas: Flecha[] = [];
  const bombas: Explosivo[] = [];
  /**
   * Los proyectiles que lanzan los bichos.
   *
   * Lista aparte de las flechas del jugador aunque las dos cosas vuelen: van en
   * direcciones contrarias —una busca bichos y la otra busca al jugador— y
   * juntarlas obligaría a preguntar de quién es cada una en cada comprobación.
   */
  const tiros: Disparo[] = [];
  /** Y los que lanza el jugador con el poder de su peto. */
  const tirosMios: Disparo[] = [];
  /**
   * Los sucesos del mundo.
   *
   * No se guardan con la partida a propósito. Un suceso es algo que está
   * pasando *ahora*, y guardar "te quedaba media luna de sangre" para
   * devolvértela tres días después al abrir el mundo no reanuda nada: reanuda
   * un susto sin contexto. Al cargar, el calendario empieza de cero.
   */
  const sucesos = crearSucesos();
  /** Ticks hasta el siguiente meteorito, mientras dure la lluvia. */
  let relojMeteorito = 0;
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
  const panelEstados = crearPanelEstados(capaUI, tiene('efectos'));
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
  const acompanados = crearAcompanados(capaUI);
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
  /**
   * Abre o cierra el mapa.
   *
   * Enseña lo que abarque el mejor mapa que se lleve encima; sin ninguno, solo
   * lo dice. El truco de depuración lo salta y enseña el mundo entero, que es
   * justo lo que hace falta para comprobar la generación sin caminar medio
   * mundo.
   *
   * Lo llaman la M y el botón del panel de depuración. Es una función y no dos
   * líneas dentro del atajo porque el truco del mapa completo se enciende en un
   * panel que se maneja con el ratón, y desde allí no había forma de abrirlo.
   */
  function abrirMapa(): void {
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
  }
  const depuracion = crearDebugMenu(capaUI, {
    trucos,
    version: versionMundo,
    darObjeto: (objeto, n) => {
      inventario.anadir(objeto, n);
      barra.refrescar(capa);
    },
    generarCriatura: (especie, elite) => {
      const c = jugador.caja;
      enemigos.push(
        crearEnemigo(especie, c.x + c.mirando * 60, c.y - 20, 1, elite, versionMundo),
      );
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
    vaciarInventario: () => {
      inventario.vaciar();
      barra.refrescar(capa);
    },
    matarCriaturas: () => {
      for (const e of enemigos) e.vivo = false;
      limpiarEnemigos(enemigos);
    },
    cuantasCriaturas: () => enemigos.filter((e) => e.vivo).length,
    horaActual: () => Math.round(reloj.minutos),
    ponerHora: (m) => {
      reloj.ir(m);
      motorLuz.marcarSucio();
    },
    volverAlSpawn: () => reaparecer(jugador),
    abrirMapa,
    sucesos: () =>
      (Object.keys(SUCESOS) as ClaseSuceso[]).map((c) => ({
        clave: c,
        nombre: SUCESOS[c].nombre,
      })),
    sucesoActivo: () => (sucesos.activo ? SUCESOS[sucesos.activo].nombre : null),
    lanzarSuceso: (clave) => {
      const c = clave as ClaseSuceso;
      if (!SUCESOS[c]) return;
      forzarSuceso(sucesos, c);
      aviso.mostrar(SUCESOS[c].aviso, true);
      aviso.fijar(SUCESOS[c].nombre, SUCESOS[c].color);
      relojMeteorito = 0;
    },
    cortarSuceso: () => {
      const cortado = cortarSuceso(sucesos);
      if (cortado) aviso.mostrar(SUCESOS[cortado].despedida);
      aviso.fijar(null);
    },
    informe: () => ({
      semilla: partida.estado.semilla,
      ancho: mundo.ancho,
      alto: mundo.alto,
      tx: Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE),
      ty: Math.floor((jugador.caja.y + jugador.caja.alto) / TILE),
      bioma: biomaDelFondo(),
      fps: bucle.fps,
    }),
    estructuras: () =>
      partida.estado.estructuras.map((e) => ({
        nombre: nombreEstructura(e.tipo),
        tx: e.tx,
        ty: e.ty,
      })),
    viajarA: (tx, ty) => {
      // Dentro del mundo, siempre: la regla vive en el módulo del panel, junto
      // a la de leer las coordenadas, para poder probarla sin montar el DOM.
      const destino = destinoDeViaje(tx, ty, mundo.ancho, mundo.alto);
      jugador.caja.x = destino.tx * TILE;
      jugador.caja.y = (destino.ty - MARGEN_VIAJE) * TILE;
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
    if (mandoYo !== true) {
      // Callado si es el autoguardado: repetirlo cada minuto sería un aviso
      // recordándote que no eres el dueño de la casa.
      if (motivo === 'manual') {
        aviso.mostrar(
          mandoYo === null
            ? 'Todavía no se sabe quién guarda esta partida'
            : 'De guardar se encarga el anfitrión',
        );
      }
      return;
    }
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

      const bytes = await empaquetarFuera(mundo, partida.estado);
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
      await tiendaDeLaPartida.guardar(partida.id, meta, bytes);
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
  entrada.alPulsar('KeyM', abrirMapa);
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
  // La Q: el poder del peto. Va aquí y no en la cadena del ratón porque no
  // apunta a nada del mundo —el poder pasa donde estás— y porque tenerla en el
  // teclado es lo que permite usarla sin dejar de pegar.
  entrada.alPulsar('KeyQ', () => {
    if (pausa.abierto || mapa.abierto || ayuda.abierto || opciones.abierto) return;
    if (barra.inventarioAbierto || depuracion.abierto) return;
    usarPoder();
  });
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
  /**
   * Lo que la zona lleva acumulado: desde cuándo no muere nadie y cuánto lleva
   * el jugador sin moverse de aquí. Es lo que decide si toca soltar algo.
   */
  const presion = crearPresion();
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
    // Matar frena la aparición un rato: el hueco que deja no se rellena al
    // instante. Se apunta aquí porque este es el único camino a la muerte de un
    // bicho, venga del mandoble, de una flecha o de la lava.
    apuntarMuerte(presion, ritmoDeApariciones(sucesos));
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
    if (grande) caerJefe(especie);
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
    // Y el botiquín de la élite: la mitad de las veces devuelve algo de lo que
    // ha costado matarla. Sin esto, pelear con una era gasto puro.
    const botiquin = botiquinDe(elite, versionMundo, Math.random);
    if (botiquin !== null) soltar(botiquin, 1);
    // Y lo suyo: los guantes con lo que hacía esa élite. Una de cada cuatro.
    const guantes = guantesDeElite(especie, elite, versionMundo, Math.random);
    if (guantes !== null) soltar(guantes, 1);
    if (sueltaReliquia(especie)) soltar(OBJETO_RELIQUIA, 1);
    // El guardián no suelta reliquia pero sí lo suyo: la espada, la esencia y
    // el oro del que estaba hecho.
    if (esJefe(especie)) {
      // El guardián de la fortaleza deja lo suyo de siempre; los seis de bioma
      // dejan su trofeo. Se distinguen por si tienen trofeo y no por la especie
      // para que añadir un jefe más no obligue a tocar esto.
      const trofeo = trofeoDe(especie);
      if (especie === JEFE_FINAL) {
        // Lo que hay al final: la mejor arma del juego y su corona. No se
        // fabrica ninguna de las dos, y ese es el premio: un arma que se forja
        // tiene precio y esta tiene requisito.
        // La esencia ya la ha soltado su botín normal, unas líneas más arriba:
        // repetirla aquí daba diez en vez de cinco.
        soltar(ESPADA_VERDADERA, 1);
        soltar(CORONA_ROTA, 1);
        soltar(LINGOTE_ORO, 40);
      } else if (trofeo !== null) {
        // Dos trofeos por jefe: uno se va en el arma y el otro en la reliquia,
        // así que una sola pelea por bioma basta para llegar al final. Con uno
        // solo harían falta doce peleas para seis reliquias, y eso convierte la
        // preparación en recadería.
        soltar(trofeo, 2);
      } else {
        soltar(ESPADA_GUARDIAN, 1);
        soltar(ESENCIA, 1);
        soltar(LINGOTE_ORO, 12);
      }
    }
  }

  /** Remate de la caída del jefe: barra fuera, aviso y marca en la partida. */
  function caerJefe(especie: Enemigo['especie']): void {
    jefe = null;
    panelJefe.ocultar();
    const nombre = ENEMIGOS[especie].nombre;
    // Solo el guardián marca la partida: es el que cierra la fortaleza. Los de
    // bioma no cambian el estado del mundo, dejan un trofeo y ya.
    if (especie === 'guardian') {
      const primera = !partida.estado.jefeVencido;
      partida.estado.jefeVencido = true;
      aviso.mostrar(
        primera ? 'El guardián ha caído. La fortaleza es tuya.' : 'El guardián vuelve a caer.',
      );
    } else if (especie === JEFE_FINAL) {
      // El final de verdad. Se marca en la partida y se cuenta con una pantalla
      // entera: el juego llevaba desde 4.0.0 teniendo un final y despachándolo
      // con un renglón de aviso que se iba a los tres segundos.
      const primera = !partida.estado.finalVencido;
      partida.estado.finalVencido = true;
      const horas = Math.floor(partida.estado.jugado / 3600000);
      const minutos = Math.floor((partida.estado.jugado % 3600000) / 60000);
      panelFinal(
        primera
          ? `Has terminado ${partida.nombre} en ${horas} h ${minutos} min. ` +
              'El mundo sigue ahí: queda todo por construir.'
          : `${nombre} vuelve a caer.`,
      );
    } else {
      aviso.mostrar(`Ha caído: ${nombre}`);
    }
    // Guardar en el acto: perder la espada del jefe porque el navegador se
    // cerró antes del autoguardado sería el peor bug posible de este bloque.
    void guardar('auto');
  }

  /**
   * Dónde está el jugador, para las reglas de los rituales.
   *
   * Se calcula aquí y no en `world/jefes` porque las tres respuestas —bioma,
   * profundidad e inframundo— salen de tres sitios distintos del mundo, y
   * mandarle el mundo entero a una tabla de datos sería darle la vuelta a quién
   * depende de quién.
   */
  function dondeEstoy(): DondeEstoy {
    const c = jugador.caja;
    const tx = Math.floor((c.x + c.ancho / 2) / TILE);
    const ty = Math.floor((c.y + c.alto) / TILE);
    return {
      bioma: biomaEn(mundo, tx, ty),
      bajoTierra: estoyBajoTierra(),
      inframundo: ty >= techoDelInframundo(),
    };
  }

  /** La fila donde empieza el inframundo, o el fondo si en esta versión no hay. */
  function techoDelInframundo(): number {
    return tiene('inframundo')
      ? techoInframundo(mundo.alto, tiene('mundoHondo'))
      : mundo.alto;
  }

  /**
   * ¿Está el jugador bajo tierra?
   *
   * Es la mitad de `dondeEstoy` que se pregunta a menudo —una vez por tick con
   * el mandoble de la caverna en la mano— y por eso va aparte: solo mira dos
   * números y no deduce el bioma recorriendo tiles.
   */
  function estoyBajoTierra(): boolean {
    const c = jugador.caja;
    const tx = Math.floor((c.x + c.ancho / 2) / TILE);
    const ty = Math.floor((c.y + c.alto) / TILE);
    const superficie = motorLuz.alturaCielo[tx] ?? 0;
    return ty > superficie + PROFUNDIDAD_PELIGRO;
  }

  /**
   * El ritual de un jefe de bioma: se gasta el ídolo y sale lo que vive ahí.
   *
   * Las dos comprobaciones —que no haya ya un jefe y que el sitio sea el suyo—
   * van antes de gastar nada. Quemar un ídolo que ha costado doscientas rocas
   * del infierno para que salga el aviso de "aquí no" sería el peor resultado
   * posible de toda la versión.
   */
  function ritualDeBioma(def: DefJefe): void {
    if (jefe) {
      aviso.mostrar('Ya has despertado a algo', true);
      return;
    }
    if (!sitioCorrecto(def, dondeEstoy())) {
      aviso.mostrar(def.sitioMal, true);
      return;
    }
    inventario.sacarDe(barra.seleccion, 1);
    barra.refrescar(capa);

    const d = ENEMIGOS[def.especie];
    const c = jugador.caja;
    // Nace a un lado y por encima, mirando al jugador: encima de la cabeza se
    // solaparía con él y saldría empujado a saber dónde.
    nacerJefeDeBioma(def, c.x + c.mirando * (d.ancho + 40), c.y - d.alto - 16);
  }

  /**
   * El altar de un santuario: el mismo rito, pero en el sitio del jefe.
   *
   * Dos diferencias con el ídolo suelto, y las dos salen de que aquí hay un
   * lugar. Una: no hace falta llevar el ídolo en la mano, basta con tenerlo en
   * el zurrón, igual que en el altar de la fortaleza —lo que uno quiere tener en
   * la mano al despertar a un jefe es la espada—. Y dos: no se pregunta por el
   * bioma, porque el santuario ya está en el suyo; llegar hasta él **es** haber
   * cumplido el requisito.
   */
  function ritualDeSantuario(tx: number, ty: number): void {
    const tipo = santuarioDelAltar(partida.estado.estructuras, tx, ty);
    const def = tipo === null ? null : jefeDeSantuario(tipo);
    if (!def) {
      aviso.mostrar('Este altar no llama a nadie', true);
      return;
    }
    if (jefe) {
      aviso.mostrar('Ya has despertado a algo', true);
      return;
    }
    if (inventario.contar(def.invocador) <= 0) {
      aviso.mostrar(`Al altar le falta ${defObjeto(def.invocador).nombre}`, true);
      return;
    }
    inventario.quitar(def.invocador, 1);
    barra.refrescar(capa);

    const d = ENEMIGOS[def.especie];
    // Sobre el altar y a un lado, para que no nazca dentro del pedestal.
    nacerJefeDeBioma(def, (tx + 2) * TILE, (ty - 1) * TILE - d.alto);
  }

  /** Lo que pasa cuando un jefe de bioma se despierta, venga de donde venga. */
  function nacerJefeDeBioma(def: DefJefe, x: number, y: number): void {
    const d = ENEMIGOS[def.especie];
    const nuevo = crearEnemigo(def.especie, x, y, nivelDif.fuerza, false, versionMundo);
    enemigos.push(nuevo);
    jefe = nuevo;
    furiaAnunciada = false;

    aviso.mostrar(def.aviso, true);
    sacudir(9);
    audio.sonar('rugido', 0.7);
    particulas.emitir(nuevo.caja.x + d.ancho / 2, nuevo.caja.y + d.alto / 2, {
      cantidad: 70,
      color: d.color,
      dispersion: 4.4,
      empujeY: -1.6,
      vida: 60,
      tam: 3,
    });
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
    // Con las seis reliquias encima, el altar despierta a otra cosa. Se mira
    // antes que la ofrenda porque quien las lleva ya ha pasado por aquí: pedirle
    // otra vez cien geles para pelear con el guardián de siempre sería no
    // enterarse de lo que ha hecho.
    if (tiene('jefeFinal') && tieneTodasLasReliquias(inventario)) {
      despertarFinal(tx, ty);
      return;
    }
    // Con alguna reliquia pero no todas, el altar lo dice. Sin esto, quien
    // lleva cinco encima usaba el altar, salía el guardián de siempre y no
    // había forma de enterarse de que faltaba una: la única pista del juego
    // sobre el final estaba en no dar ninguna.
    if (tiene('jefeFinal')) {
      const faltanReliquias = reliquiasQueFaltan(inventario);
      if (faltanReliquias.length < RELIQUIAS_BIOMA.length) {
        aviso.mostrar(
          `Al altar le faltan ${faltanReliquias.length} reliquias para lo otro`,
          true,
        );
      }
    }
    const falta = faltaParaOfrenda(inventario, versionMundo);
    if (falta.length > 0) {
      aviso.mostrar(`Al altar le falta: ${textoFalta(falta)}`, true);
      return;
    }
    pagarOfrenda(inventario, versionMundo);
    barra.refrescar(capa);

    // Nace unos tiles por encima del altar, para que no aparezca encajado
    // dentro del pedestal y salga empujado a un lado por la colisión.
    const def = ENEMIGOS.guardian;
    const nuevo = crearEnemigo(
      'guardian',
      tx * TILE + TILE / 2 - def.ancho / 2,
      (ty - 5) * TILE,
      nivelDif.fuerza,
      false,
      versionMundo,
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
   * La pantalla de final: para el bucle, la enseña y lo reanuda al cerrarla.
   *
   * Parar el juego es lo que la separa de un aviso. Con el mundo corriendo por
   * detrás, el cartel más grande del juego compite con un esqueleto que viene
   * por la izquierda, y lo que se lee es el esqueleto.
   */
  function panelFinal(texto: string): void {
    bucle.parar();
    void guardar('auto');
    audio.sonar('recoger', 0.4);
    panelVida.mostrarFinal(texto, () => bucle.arrancar());
  }

  /**
   * El de verdad: se cobran las seis reliquias y sale lo que había detrás.
   *
   * Nace más arriba que el guardián porque mide noventa y dos píxeles: puesto a
   * la misma altura, la mitad del cuerpo queda dentro del techo de la sala y la
   * colisión lo escupe a un lado en el primer tick.
   */
  function despertarFinal(tx: number, ty: number): void {
    if (!pagarReliquias(inventario)) return;
    barra.refrescar(capa);
    const def = ENEMIGOS[JEFE_FINAL];
    const nuevo = crearEnemigo(
      JEFE_FINAL,
      tx * TILE + TILE / 2 - def.ancho / 2,
      (ty - 8) * TILE,
      nivelDif.fuerza,
      false,
      versionMundo,
    );
    enemigos.push(nuevo);
    jefe = nuevo;
    furiaAnunciada = false;

    aviso.mostrar('Las seis reliquias arden. Algo se levanta debajo.', true);
    sacudir(14);
    audio.sonar('rugido', 0.5);
    particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
      cantidad: 110,
      color: '#d8c0ff',
      dispersion: 5.5,
      empujeY: -2.4,
      vida: 80,
      tam: 4,
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
      ENEMIGOS[jefe.especie].nombre,
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
      aviso.mostrar(`${ENEMIGOS[jefe.especie].nombre}: se enfurece`, true);
    }
    if (!furioso) return;
    // Los esbirros son cosa del guardián: es el que pelea en una sala cerrada
    // con esqueletos alrededor. Un rey limo llamando esqueletos en mitad de un
    // prado no dice nada de la pradera.
    if (jefe.especie !== 'guardian') return;
    if (--relojEsbirros > 0) return;
    relojEsbirros = tiene('guardianReforzado')
      ? INTERVALO_ESBIRROS
      : INTERVALO_ESBIRROS_ORIGINAL;
    // Tope aparte del aforo normal: la sala tiene que seguir siendo transitable.
    if (enemigos.filter((e) => e.vivo).length >= TOPE_CON_JEFE) return;
    for (const lado of [-1, 1]) {
      enemigos.push(
        crearEnemigo(
          'esqueleto',
          jefe.caja.x + lado * 70,
          jefe.caja.y + 40,
          nivelDif.fuerza,
          false,
          versionMundo,
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
      const rh = tickHambre(
        hambre,
        salud,
        jugador.caja,
        activo,
        // Ritmo cero: el hambre deja de bajar sin tener que tocar `tickHambre`.
        trucos.sinHambre ? 0 : nivelDif.hambre,
        nivelDif.castigo,
      );
      if (rh.curado || rh.danado) panelVida.refrescar(salud);
      if (rh.danado) aviso.mostrar('Tienes hambre', true);
      panelVida.refrescarHambre(hambre);
    }

    // El golpe activo alcanza a quien toque, una vez por mandoble.
    // El filo del arma entra en dos sitios: aquí, si multiplica el daño, y en
    // cada bicho tocado, si le pega un efecto o cura al que golpea.
    const filo = tiene('equipoDeJefe') ? filoDe(barra.objetoActivo()) : null;
    // Solo el filo de la caverna mira la profundidad, y se pregunta con la
    // cuenta barata —una resta contra la altura del cielo— y no con
    // `dondeEstoy`, que además deduce el bioma recorriendo tiles: eso corría
    // sesenta veces por segundo por llevar una espada en la mano.
    const hondo = filo !== null && FILOS[filo].bonusHondo !== 1 && estoyBajoTierra();
    const multiplicador =
      trucos.danoMultiplicador *
      multiplicadorDano(estados) *
      (hondo ? FILOS[filo!].bonusHondo : 1);
    const r = resolverGolpe(
      golpe,
      jugador.caja,
      enemigos,
      multiplicador,
      tiene('golpeConVista') ? mundo : null,
    );
    if (filo !== null && r.tocados.length > 0) aplicarFilo(filo, r.tocados, multiplicador);
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

    // Y los explosivos. Van después de las flechas y antes de los enemigos por
    // la misma razón: lo que mata este tick no puede pegar este tick.
    if (bombas.length > 0) {
      for (const est of actualizarExplosivos(mundo, bombas, enemigos, jugador.caja)) {
        reventar(est);
      }
      if (relojAparicion % 30 === 0) limpiarExplosivos(bombas);
    }

    const res = actualizarEnemigos(mundo, enemigos, jugador.caja, salud);
    if (res.disparos.length > 0) {
      tiros.push(...res.disparos);
      audio.sonar('golpe', 1.5);
    }
    actualizarTiros();
    actualizarTirosDelJugador();
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
      const encaja = danoTrasArmadura(
        res.danoAlJugador,
        defensaTotal(equipo) + defensaExtra(estados),
      );
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
        // Y la armadura contesta. Va dentro del golpe que ha entrado de verdad
        // y no en cada tick de contacto: si no, un zombi pegado envenenaría
        // sesenta veces por segundo.
        if (tiene('represalia')) responderAlGolpe(res.agresores);
      }
    }
    for (const m of res.muertos) {
      // Los bichos que se mueren solos —lava, veneno, el suelo— también cuentan
      // para el veto: la zona no se rellena por haberse muerto uno de calor.
      apuntarMuerte(presion, ritmoDeApariciones(sucesos));
      repartirBotin(m.especie, m.tx, m.ty, m.elite);
      if (esJefe(m.especie)) caerJefe(m.especie);
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
      limpiarEfectos(estados);
      // Lo que estuviera volando se apaga. Un proyectil vivo al otro lado del
      // mundo no llega a hacer daño, pero sí sigue costando ticks y sale
      // dibujado si la cámara pasa por ahí.
      tiros.length = 0;
      tirosMios.length = 0;
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

    const txAhora = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
    const tyAhora = Math.floor((jugador.caja.y + jugador.caja.alto) / TILE);
    // La presión corre todos los ticks, se intente aparecer o no: mide tiempo,
    // no intentos.
    avanzarPresion(presion, txAhora, tyAhora);

    if (--relojAparicion <= 0 && !trucos.sinApariciones) {
      const txJugador = txAhora;
      const tyJugador = tyAhora;
      // Dentro de una estructura sale el doble de deprisa. Fuera no se nota
      // nada: la lista de estructuras de un mundo son un par de docenas de
      // puntos y esto se pregunta una vez cada cuarenta ticks.
      const dentro = tiene('guarnicionEstructuras')
        ? estructuraEn(partida.estado.estructuras, txJugador, tyJugador)
        : null;
      const ritmo = (dentro === null ? 1 : RITMO_ESTRUCTURA) * ritmoDeApariciones(sucesos);
      relojAparicion = Math.max(5, Math.round(INTERVALO_INTENTO / ritmo));
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
        estructura: dentro,
        ritmoSuceso: ritmoDeApariciones(sucesos),
        ritmoElite: ritmoDeElites(sucesos),
        presion: tiene('aparicionPorZona') ? presion : undefined,
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
      avisarTile(tx, ty, siembraDe(enMano));
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
      avisarTile(tx, ty, TIERRA_LABRADA);
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

    // El ídolo: clic derecho y sale lo que vive en este bioma. Va antes que
    // todo lo demás porque no apunta a ningún tile —el ritual pasa donde estás
    // tú— y si cayera después de la rama de colocar, tener uno en la mano
    // frente a un hueco intentaría ponerlo como bloque.
    if (esInvocador(enMano)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar) return;
      if (!tiene('jefesDeBioma')) {
        aviso.mostrar(`Los ídolos no existen en la versión ${versionMundo}`, true);
        return;
      }
      const def = jefeDeInvocador(enMano);
      if (def !== null) ritualDeBioma(def);
      return;
    }

    // Beber, como comer: clic derecho y donde uno esté. Va antes que la comida
    // en la cadena por nada en particular —los tipos son excluyentes—, pero sí
    // antes de colocar, porque una poción no es un bloque y apuntar al suelo
    // con ella en la mano no debería poner nada.
    if (esPocion(enMano)) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      const usar = puntero.der && !derAnterior;
      derAnterior = puntero.der;
      if (!usar) return;
      const def = defObjeto(enMano);
      // La de vida no se malgasta estando lleno; las de efecto siempre valen,
      // aunque sea para renovar lo que ya llevas.
      const cura = def.curacion ?? 0;
      if (cura > 0 && salud.vida >= salud.vidaMax) {
        aviso.mostrar('Estás entero: no hace falta');
        return;
      }
      const limpiados = def.limpia === true ? limpiarDaninos(estados) : [];
      if (def.limpia === true && limpiados.length === 0) {
        aviso.mostrar('No te pasa nada que curar');
        return;
      }
      if (cura > 0) {
        curar(salud, cura);
        panelVida.refrescar(salud);
      }
      if (def.efecto !== undefined) {
        aplicarEfecto(estados, def.efecto, def.duracion ?? DURACION.pocion);
        aviso.mostrar(`Notas la ${EFECTOS[def.efecto].nombre}`);
      }
      if (limpiados.length > 0) aviso.mostrar('Se te pasa todo lo malo');
      panelEstados.refrescar(estados);
      inventario.sacarDe(barra.seleccion, 1);
      barra.refrescar(capa);
      audio.sonar('recoger', 1.2);
      particulas.emitir(
        jugador.caja.x + jugador.caja.ancho / 2,
        jugador.caja.y + 12,
        { cantidad: 12, color: def.color, dispersion: 1.6, empujeY: -1.2, vida: 30, tam: 2 },
      );
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

    // Los explosivos se tiran con el clic izquierdo, como el arco, pero gastan
    // el propio objeto en vez de munición aparte: la bomba *es* la munición.
    if (esExplosivo(enMano) && tiene('explosivos')) {
      objetivo.valido = false;
      reiniciarPicado(picado);
      derAnterior = puntero.der;
      if (!puntero.izq || !puedeGolpear(golpe)) return;
      const def = defObjeto(enMano);
      if (inventario.sacarDe(barra.seleccion, 1) <= 0) return;
      barra.refrescar(capa);
      lanzarGolpe(golpe, enMano, wx < jugador.caja.x ? -1 : 1);
      golpe.restante = 0;
      jugador.caja.mirando = wx < jugador.caja.x ? -1 : 1;
      anadirExplosivo(
        bombas,
        lanzarDesde(
          enMano === DINAMITA ? 'dinamita' : 'bomba',
          jugador.caja,
          wx,
          wy,
          def.velocidad ?? 8,
        ),
      );
      audio.sonar('flechazo', 0.7);
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
        if (avanzarPicado(mundo, picado, tx, ty, capa, potencia * trucos.velocidadMinado * multiplicadorMinado(estados))) {
          // Ya está roto: se avisa al otro lado antes que nada, para que el
          // hueco aparezca allí lo antes posible.
          avisarTile(tx, ty, AIRE, capa !== 'bloque');
          renderer.cache.invalidar(tx, ty);
          motorLuz.invalidar(tx);
          corrienteSucia = true;
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

    // Y el altar de un santuario, igual: clic derecho con su ídolo en el zurrón.
    if (puntero.der && !derAnterior && mundo.getTile(tx, ty) === ALTAR_BIOMA) {
      derAnterior = puntero.der;
      if (!enAlcance(jugador.caja, tx, ty)) return;
      ritualDeSantuario(tx, ty);
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

    // Y el interruptor se acciona igual que se abre un cofre: clic derecho
    // encima. Va antes de colocar porque, si no, con cable en la mano el clic
    // derecho pondría un cable sobre el interruptor en vez de darle.
    if (
      puntero.der &&
      !derAnterior &&
      tiene('electricidad') &&
      enAlcance(jugador.caja, tx, ty) &&
      accionarInterruptor(mundo, tx, ty) !== null
    ) {
      renderer.cache.invalidar(tx, ty);
      motorLuz.invalidar(tx);
      corrienteSucia = true;
      audio.sonar('colocar', 1.6);
      derAnterior = puntero.der;
      return;
    }
    derAnterior = puntero.der;

    if (puntero.der && previo.ok && tileEnMano !== undefined) {
      // Colocar gasta: el inventario es la razón de ser de esta fase.
      if (inventario.sacarDe(barra.seleccion, 1) > 0) {
        if (capa === 'bloque') mundo.setTile(tx, ty, tileEnMano);
        else mundo.setPared(tx, ty, tileEnMano);
        avisarTile(tx, ty, tileEnMano, capa !== 'bloque');
        renderer.cache.invalidar(tx, ty);
        motorLuz.invalidar(tx);
        corrienteSucia = true;
        audio.sonar('colocar', 0.85 + Math.random() * 0.3);
        // Tapar una celda con agua la vacía en el paso siguiente, y el líquido
        // de al lado tiene que enterarse de que ha perdido un camino.
        liquidos.activar(tx, ty);
        barra.refrescar(capa);
      }
    }
  }

  /**
   * Si el líquido de este tick era lava.
   *
   * Solo lo usa el daño de caída: el agua amortigua y la lava no, y la fracción
   * sumergida por sí sola no distingue una de otra.
   */
  let enLava = false;

  /**
   * Líquidos: un paso de simulación y sus consecuencias sobre el jugador.
   *
   * Devuelve cuánto está sumergido, que es lo que la física necesita para saber
   * si toca nadar. La luz solo se marca sucia cuando hay lava en movimiento:
   * el agua no ilumina, y rehacer la ventana de luz en cada tick de una cascada
   * sería pagar por nada.
   */
  function actualizarLiquidos(): number {
    if (!tiene('liquidos')) {
      enLava = false;
      return 0;
    }
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
    enLava = s.lava;
    if (s.lava || (antes > 0 && hayLavaCerca())) motorLuz.marcarSucio();

    const r = tickAliento(
      aliento,
      salud,
      jugador.caja,
      s.cabeza && !s.lava,
      s.lava,
      nivelDif.castigo,
      multiplicadorAire(estados),
    );
    if (s.fraccion > 0 && !s.lava) apagar(aliento);
    // Salir de la lava ya no apaga: se sigue ardiendo unos segundos. Es lo que
    // convierte un roce en una carrera hasta el agua, y de paso lo que le da un
    // motivo al remedio más allá de las arañas.
    if (s.lava && tiene('efectos')) aplicarEfecto(estados, 'ardiendo', DURACION.lava);
    if (r.dano) {
      panelVida.refrescar(salud);
      if (r.motivo === 'ahogo') aviso.mostrar('Te estás ahogando', true);
      else if (r.motivo === 'lava') aviso.mostrar('¡Lava!', true);
      audio.sonar(r.motivo === 'ahogo' ? 'chapoteo' : 'quemar');
    }
    panelVida.refrescarAliento(aliento);

    // Trampas: los pinchos de las estructuras. Van aquí y no en la física
    // porque son daño, no colisión —se entra en ellos—, y comparten con la
    // lava la regla de que hacen daño por rato y no por tick: sin espera, una
    // caída sobre pinchos quitaría la vida entera en medio segundo.
    if (relojTrampa > 0) relojTrampa--;
    const pincha = danoEnCaja(
      mundo,
      jugador.caja.x,
      jugador.caja.y,
      jugador.caja.ancho,
      jugador.caja.alto,
      TILE,
    );
    if (pincha > 0 && relojTrampa <= 0) {
      relojTrampa = INTERVALO_TRAMPA;
      const dano = Math.max(1, Math.round(pincha * nivelDif.castigo));
      if (golpear(salud, jugador.caja, dano, jugador.caja.x + jugador.caja.ancho / 2, 18)) {
        panelVida.refrescar(salud);
        aviso.mostrar('¡Pinchos!', true);
        audio.sonar('dano');
        sacudir(2.6);
      }
    }

    return s.fraccion;
  }

  /**
   * Ticks entre pinchazo y pinchazo.
   *
   * Medio segundo. Es el mismo criterio que la lava: una trampa que cobra cada
   * tick mata en medio segundo y no enseña nada, porque no da tiempo a
   * reaccionar. Cobrando cada treinta, quien cae encima se levanta y sale, y
   * quien se queda ahí plantado se lo ha buscado.
   */
  let relojTrampa = 0;
  const INTERVALO_TRAMPA = 30;

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
      // El agua frena el golpe; la lava, que también es líquido, no frena nada.
      const colchon = tiene('caidaAmortiguada') && !enLava ? sumergido : 0;
      const dano = Math.round(danoDeCaida(c.ultimaCaida, colchon) * nivelDif.castigo);
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

  /**
   * Las consecuencias de una explosión.
   *
   * El módulo de explosivos decide *qué* pasa —qué tiles caen, a quién le toca y
   * cuánto— y esto lo aplica: es la misma separación que con las flechas, y es
   * lo que permite probar el radio y el daño en un test sin canvas, sin audio y
   * sin inventario.
   */
  function reventar(est: Estallido): void {
    const grande = est.tipo === 'dinamita';
    for (const { tx, ty, tile } of est.rotos) {
      // Se comprueba otra vez que sigue estando: dos bombas que estallan en el
      // mismo tick pueden apuntar al mismo tile, y soltar el drop dos veces
      // sería duplicar material a base de sincronizar mechas.
      if (mundo.getTile(tx, ty) !== tile) continue;
      mundo.setTile(tx, ty, AIRE);
      avisarTile(tx, ty, AIRE);
      renderer.cache.invalidar(tx, ty);
      motorLuz.invalidar(tx);
      liquidos.activar(tx, ty);
      corrienteSucia = true;
      if (tile === COFRE) cofres.borrar(tx, ty);
      soltar(drops, dropDeTile(tile), tx, ty);
    }
    for (const golpeado of est.impactos) {
      if (golpeado.muerto) morir(golpeado.enemigo);
    }
    if (est.danoJugador > 0) {
      golpear(salud, jugador.caja, est.danoJugador, est.x, TICKS_INVULNERABLE, true, 'fuego');
    }
    particulas.emitir(est.x, est.y, {
      cantidad: grande ? 70 : 34,
      color: '#ff8a3a',
      dispersion: grande ? 7.5 : 4.6,
      vida: 34,
      tam: 3,
      gravedad: 0.03,
    });
    particulas.emitir(est.x, est.y, {
      cantidad: grande ? 40 : 20,
      color: '#4a4a52',
      forma: 'humo',
      dispersion: grande ? 4.4 : 2.8,
      empujeY: -1.2,
      vida: 60,
      tam: 4,
    });
    audio.sonar('romper-piedra', grande ? 0.45 : 0.62);
    sacudir(grande ? 9 : 5);
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
        avisarTile(x, y, AIRE);
        renderer.cache.invalidar(x, y);
        motorLuz.invalidar(x);
        liquidos.activar(x, y);
        soltar(drops, soltado, x, y);
      }
    }
  }

  /**
   * Los proyectiles que ya vuelan: moverlos y cobrar lo que acierten.
   *
   * El daño de un disparo pasa por la armadura igual que un golpe —es un
   * impacto, no una quemadura— pero el efecto que trae, no: llevar peto de
   * infernita no debería impedir que una bola de fuego te prenda, porque
   * entonces el ataque especial dejaría de existir en cuanto uno se equipa.
   */
  function actualizarTiros(): void {
    if (tiros.length === 0) return;
    const r = avanzarDisparos(mundo, tiros, jugador.caja);
    for (const golpe of r.aciertos) {
      const def = ATAQUES[golpe.disparo.clase];
      const encaja = danoTrasArmadura(
        golpe.disparo.dano,
        defensaTotal(equipo) + defensaExtra(estados),
      );
      const entra = golpear(salud, jugador.caja, encaja, golpe.x);
      if (entra) {
        panelVida.refrescar(salud);
        sacudir(2.6);
        audio.sonar('dano', 1.2);
        if (def.efecto !== undefined && tiene('efectos')) {
          aplicarEfecto(estados, def.efecto, def.duracionEfecto);
          panelEstados.refrescar(estados);
        }
      }
      particulas.emitir(golpe.x, golpe.y, {
        cantidad: entra ? 14 : 6,
        color: def.color,
        dispersion: 2.4,
        vida: 24,
        tam: 2,
      });
    }
    for (const choque of r.choques) {
      particulas.emitir(choque.x, choque.y, {
        cantidad: 5,
        color: ATAQUES[choque.disparo.clase].color,
        dispersion: 1.6,
        vida: 16,
        tam: 2,
      });
    }
    limpiarDisparos(tiros);
  }

  /**
   * La armadura contesta al que te ha tocado.
   *
   * Es el equivalente pasivo del filo, pero al revés: el filo sale del arma
   * cuando pegas tú y esto sale de la armadura cuando pegan a ti. Se aplican
   * todas las que se lleven puestas, porque cada pieza contesta lo suyo y dos
   * piezas distintas no se estorban.
   */
  function responderAlGolpe(agresores: readonly Enemigo[]): void {
    const clases = represaliasPuestas(equipo);
    if (clases.length === 0) return;
    for (const clase of clases) {
      const def = REPRESALIAS[clase];
      if (def.efectoPropio !== undefined && tiene('efectos')) {
        aplicarEfecto(estados, def.efectoPropio, def.duracion);
      }
      if (def.curacion > 0) {
        curar(salud, def.curacion);
        panelVida.refrescar(salud);
      }
      for (const e of agresores) {
        if (!e.vivo) continue;
        if (def.efecto !== undefined && tiene('efectos')) {
          aplicarEfecto(e.efectos, def.efecto, def.duracion);
        }
        if (def.dano > 0) {
          const desde = jugador.caja.x + jugador.caja.ancho / 2;
          if (danarEnemigo(e, def.dano, desde)) morir(e);
        }
        particulas.emitir(e.caja.x + e.caja.ancho / 2, e.caja.y + e.caja.alto / 2, {
          cantidad: 6,
          color: def.efecto !== undefined ? EFECTOS[def.efecto].color : '#e8b64c',
          forma: 'chispa',
          dispersion: 1.8,
          vida: 16,
          tam: 2,
        });
      }
    }
  }

  /**
   * Lo que hace el filo del arma en los bichos que acaba de tocar.
   *
   * El golpe doble se resuelve aquí y no dentro de `resolverGolpe` porque es
   * una segunda entrada del mismo mandoble, no un mandoble más: si fuera dentro
   * habría que contarlo también en la lista de tocados y la perforación de las
   * flechas empezaría a comportarse raro.
   */
  function aplicarFilo(
    clase: ClaseFilo,
    tocados: readonly Enemigo[],
    multiplicador: number,
  ): void {
    const def = FILOS[clase];
    for (const e of tocados) {
      if (def.efecto !== undefined) aplicarEfecto(e.efectos, def.efecto, def.duracionEfecto);
      if (def.probDoble > 0 && Math.random() < def.probDoble) {
        // El mismo multiplicador que el golpe del que sale. Sin esto, beber
        // fuerza no servía de nada en el segundo impacto y el arma del
        // desierto era la única del juego a la que no le afectaban las
        // pociones, que es la clase de rareza que nadie llega a explicarse.
        const dano = (defObjeto(barra.objetoActivo()).dano ?? 0) * multiplicador;
        if (danarEnemigo(e, dano, jugador.caja.x)) morir(e);
        particulas.emitir(e.caja.x + e.caja.ancho / 2, e.caja.y + 6, {
          cantidad: 6,
          color: '#ffe9a8',
          forma: 'chispa',
          dispersion: 2,
          vida: 12,
          tam: 2,
        });
      }
    }
    if (def.curacion > 0 && salud.vida < salud.vidaMax) {
      curar(salud, def.curacion * tocados.length);
      panelVida.refrescar(salud);
    }
  }

  /**
   * El poder del peto, con la Q.
   *
   * Las tres comprobaciones —que haya peto con poder, que exista en esta
   * versión y que esté cargado— dicen cada una lo suyo en pantalla en vez de no
   * hacer nada: una tecla que a veces funciona y a veces no, sin decir por qué,
   * se lee como que el juego se ha colgado.
   */
  function usarPoder(): void {
    if (!tiene('equipoDeJefe')) return;
    const clase = poderPuesto(equipo);
    if (clase === null) {
      aviso.mostrar('No llevas nada que hacer con la Q');
      return;
    }
    const def = PODERES[clase];
    if (!poderListo(recargaPoder)) {
      aviso.mostrar(`${def.nombre}: aún se está cargando`);
      return;
    }
    gastarPoder(recargaPoder, clase);
    const c = jugador.caja;
    const cx = c.x + c.ancho / 2;
    const cy = c.y + c.alto / 2;

    if (def.efectoPropio !== undefined) {
      aplicarEfecto(estados, def.efectoPropio, def.duracion);
      panelEstados.refrescar(estados);
    }
    if (def.efectoCercano !== undefined) {
      let alcanzados = 0;
      for (const e of enemigos) {
        if (!e.vivo) continue;
        const d = Math.hypot(e.caja.x + e.caja.ancho / 2 - cx, e.caja.y + e.caja.alto / 2 - cy);
        if (d > def.radio * TILE) continue;
        aplicarEfecto(e.efectos, def.efectoCercano, def.duracion);
        alcanzados++;
      }
      if (alcanzados === 0) aviso.mostrar(`${def.nombre}: no había nada cerca`);
    }
    if (def.danoProyectil > 0) {
      // Sale del jugador hacia donde apunta el ratón, y va en la misma lista
      // que lo que lanzan los bichos... pero hacia el otro lado, así que se
      // maneja aparte: estos los mueve `actualizarTirosDelJugador`.
      const haciaX = renderer.camara.aMundoX(puntero.sx);
      const haciaY = renderer.camara.aMundoY(puntero.sy);
      // La fuerza se pasa como fracción del daño base del ataque, para que el
      // proyectil del poder pegue lo que dice su tabla y no lo que pegaría una
      // bola de fuego de una momia.
      const fuerza = def.danoProyectil / ATAQUES.bolaDeFuego.dano;
      tirosMios.push(...lanzarAtaque('bolaDeFuego', cx, cy, haciaX, haciaY, fuerza));
    }
    particulas.emitir(cx, cy, {
      cantidad: 26,
      color: def.color,
      dispersion: 3.2,
      empujeY: -1,
      vida: 34,
      tam: 3,
    });
    audio.sonar('rugido', 1.6);
    sacudir(3);
  }

  /**
   * Los proyectiles que lanza el jugador con su poder.
   *
   * Van en su propia lista, aparte de los de los bichos, por lo de siempre:
   * buscan cosas distintas. Reutilizan el mismo módulo de ataques porque volar
   * y chocar contra la roca se hace igual en los dos sentidos.
   */
  function actualizarTirosDelJugador(): void {
    if (tirosMios.length === 0) return;
    for (const d of tirosMios) {
      if (!d.vivo) continue;
      const def = ATAQUES[d.clase];
      d.x += d.vx;
      d.y += d.vy;
      d.angulo = Math.atan2(d.vy, d.vx);
      if (++d.edad > 60 * 4) d.vivo = false;
      const tx = Math.floor(d.x / TILE);
      const ty = Math.floor(d.y / TILE);
      if (!mundo.dentro(tx, ty) || esSolido(mundo.getTile(tx, ty))) {
        d.vivo = false;
        particulas.emitir(d.x, d.y, {
          cantidad: 8,
          color: def.color,
          dispersion: 2,
          vida: 20,
          tam: 2,
        });
        continue;
      }
      for (const e of enemigos) {
        if (!e.vivo) continue;
        const c = e.caja;
        if (d.x < c.x || d.x > c.x + c.ancho || d.y < c.y || d.y > c.y + c.alto) continue;
        if (danarEnemigo(e, d.dano, d.x)) morir(e);
        if (def.efecto !== undefined) aplicarEfecto(e.efectos, def.efecto, def.duracionEfecto);
        d.vivo = false;
        particulas.emitir(d.x, d.y, {
          cantidad: 16,
          color: def.color,
          dispersion: 2.8,
          vida: 26,
          tam: 2,
        });
        break;
      }
    }
    limpiarDisparos(tirosMios);
  }

  /**
   * Los ajustes de física, con lo que le hayan hecho los efectos.
   *
   * Se devuelve el objeto de siempre cuando no hay nada puesto, que es casi
   * todo el rato: copiar los once campos sesenta veces por segundo para no
   * cambiar ninguno sería tirar memoria por un caso que no ocurre.
   *
   * Va por aquí y no dentro de la física porque los efectos son una capa de
   * juego y `actualizarFisica` es un motor: mientras no sepa que existen las
   * pociones, se puede seguir probando el salto sin montar media partida.
   */
  function ajustesAhora(): Ajustes {
    const vel = multiplicadorVelocidad(estados);
    const salto = multiplicadorSalto(estados);
    if (vel === 1 && salto === 1) return ajustes;
    return {
      ...ajustes,
      velMaxima: ajustes.velMaxima * vel,
      impulsoSalto: ajustes.impulsoSalto * salto,
    };
  }

  /**
   * Un tick de los efectos del jugador: lo que queman, lo que curan y el cartel
   * cuando se acaba alguno.
   *
   * El daño entra sin invulnerabilidad y sin empujón, igual que en los bichos:
   * arder no es un golpe. Y sin empuje sobre todo, porque un jugador al que la
   * quemadura le arranca el control cada medio segundo no puede salir del sitio
   * donde se está quemando, que es justo lo único que se le pide que haga.
   */
  function actualizarEstados(): void {
    const r = tickEfectos(estados);
    const centroX = jugador.caja.x + jugador.caja.ancho / 2;
    if (r.dano > 0 && !trucos.invulnerable) {
      if (golpear(salud, jugador.caja, r.dano, centroX, 0, false, 'fuego')) {
        panelVida.refrescar(salud);
        particulas.emitir(centroX, jugador.caja.y + 14, {
          cantidad: 3,
          color: '#f07a2a',
          dispersion: 1.2,
          empujeY: -1.4,
          vida: 22,
          tam: 2,
        });
      }
    }
    if (r.danoSuave > 0 && !trucos.invulnerable) {
      // El veneno nunca remata: deja a un punto y ahí se queda.
      const tope = Math.max(0, salud.vida - 1);
      if (tope > 0) {
        golpear(salud, jugador.caja, Math.min(r.danoSuave, tope), centroX, 0, false, 'golpe');
        panelVida.refrescar(salud);
      }
    }
    if (r.curacion > 0 && salud.vida < salud.vidaMax) {
      curar(salud, r.curacion);
      panelVida.refrescar(salud);
    }
    for (const clase of r.terminados) {
      if (!EFECTOS[clase].danino) aviso.mostrar(`Se te ha pasado la ${EFECTOS[clase].nombre}`);
    }
    panelEstados.refrescar(estados);
  }

  /**
   * Los sucesos: sortearlos, anunciarlos y aplicar lo que hagan mientras duran.
   *
   * El módulo decide *cuándo* y *cuál*; esto es todo lo que pasa por eso. Las
   * apariciones se enteran por dos multiplicadores que ya viajan en el contexto,
   * así que aquí solo queda el cartel y la lluvia de meteoritos.
   */
  function actualizarSucesos(): void {
    const tyJugador = Math.floor((jugador.caja.y + jugador.caja.alto) / TILE);
    const txJugador = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
    // "En la superficie" es ver el cielo o andar cerca de donde se ve: los tres
    // sucesos pasan arriba, y empezar uno a doscientas filas de hondo sería
    // gastarlo sin que nadie se entere.
    const enSuperficie = tyJugador < (motorLuz.alturaCielo[txJugador] ?? 0) + 20;
    const cambio = tickSucesos(sucesos, {
      esNoche: reloj.esNoche,
      version: versionMundo,
      enSuperficie,
    });
    if (cambio.empieza) {
      const def = SUCESOS[cambio.empieza];
      aviso.mostrar(def.aviso, true);
      aviso.fijar(def.nombre, def.color);
      audio.sonar('golpe', 0.35);
      sacudir(3);
      relojMeteorito = 0;
    }
    if (cambio.termina) {
      aviso.mostrar(SUCESOS[cambio.termina].despedida);
      aviso.fijar(null);
    }

    // La lluvia: un meteorito cada pocos segundos mientras dure.
    if (sucesos.activo !== 'lluviaEstrellas') return;
    if (--relojMeteorito > 0) return;
    // Uno cada quince segundos: con la lluvia de cincuenta, caen tres. Con uno
    // cada siete caían siete, y siete cráteres en la misma ladera no son una
    // lluvia de estrellas, son un bombardeo.
    relojMeteorito = 60 * 15;
    const impacto = caerMeteorito(mundo, txJugador, motorLuz.alturaCielo);
    if (!impacto) return;
    // Todo lo que ha cambiado el cráter hay que repintarlo y rehacerle la luz,
    // y como la altura del cielo cambia columna por columna, se invalida cada
    // una: es lo que decide si el sitio recibe sol.
    for (let dx = -RADIO_METEORITO - 1; dx <= RADIO_METEORITO + 1; dx++) {
      motorLuz.invalidar(impacto.tx + dx);
      for (let dy = -RADIO_METEORITO - 1; dy <= RADIO_METEORITO + 3; dy++) {
        renderer.cache.invalidar(impacto.tx + dx, impacto.ty + dy);
      }
    }
    liquidos.activar(impacto.tx, impacto.ty);
    corrienteSucia = true;
    audio.sonar('romper-piedra', 0.5);
    sacudir(6);
    aviso.mostrar(`Ha caído una a ${Math.abs(impacto.tx - txJugador)} de aquí`);
  }

  /**
   * La instalación eléctrica: qué bombillas están encendidas ahora mismo.
   *
   * Va marcada como sucia en vez de recalcularse cada tick. Resolver la ventana
   * es un flood fill sobre el cableado, y aunque en una casa cueste nada, en un
   * mundo titánico se pagaría sesenta veces por segundo para no cambiar nada:
   * la corriente solo se mueve cuando alguien toca un tile o cuando la cámara
   * enseña una parte de la instalación que no se veía.
   */
  let corrienteSucia = true;
  let ventanaCorriente = '';

  function actualizarCorriente(): void {
    const { tx0, ty0, tx1, ty1 } = renderer.camara.tilesVisibles();
    // El margen es generoso a propósito: sin él, una bombilla justo al borde se
    // encendería al entrar en cuadro, y verla encenderse delata el truco.
    const M = 24;
    const clave = `${tx0 >> 3},${ty0 >> 3},${tx1 >> 3},${ty1 >> 3}`;
    if (!corrienteSucia && clave === ventanaCorriente) return;
    corrienteSucia = false;
    ventanaCorriente = clave;
    for (const c of resolverCorriente(mundo, tx0 - M, ty0 - M, tx1 + M, ty1 + M)) {
      renderer.cache.invalidar(c.tx, c.ty);
      motorLuz.invalidar(c.tx);
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
      if (tiene('diaNoche') && !trucos.congelarReloj) reloj.avanzar(TICK);
      if (esperaAvisoPico > 0) esperaAvisoPico--;
      if (esperaAvisoVersion > 0) esperaAvisoVersion--;
      if (esperaAvisoFlechas > 0) esperaAvisoFlechas--;
      if (esperaAvisoSiembra > 0) esperaAvisoSiembra--;
      editar();
      const sumergido = actualizarLiquidos();
      const enSueloAntes = jugador.caja.enSuelo;
      if (trucos.volar) volarUnTick(entrada.estado());
      else actualizarJugador(mundo, jugador, entrada.estado(), ajustesAhora(), sumergido);
      efectosDelJugador(enSueloAntes, sumergido);
      // La red va justo detrás de mover al jugador: el invitado manda lo que ha
      // pulsado y cuadra su posición con la que diga el anfitrión.
      sesionRed?.avanzar(jugador.caja, entrada.estado(), sumergido);
      // El panel de la esquina, al día. No repinta si no ha cambiado nada, así
      // que preguntarlo cada tick sale gratis y evita tener que avisarlo desde
      // los cinco sitios en los que alguien entra o se va.
      if (sesionRed) acompanados.compania(sesionRed.otros().map((o) => o.nombre));
      sumergidoAhora = sumergido;
      actualizarDrops();
      if (tiene('cultivos')) actualizarCultivos();
      // El invitado no simula bichos: los suyos son los que le manda el
      // anfitrión. Si los generara también, habría dos poblaciones distintas en
      // el mismo mundo y solo una de las dos podría hacerte daño.
      if (sesionRed?.papel !== 'invitado') actualizarCombate();
      if (tiene('efectos')) actualizarEstados();
      tickPoder(recargaPoder);
      if (tiene('sucesos')) actualizarSucesos();
      if (tiene('electricidad')) actualizarCorriente();
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
      const biomaFondoAhora: BiomaFondo = tiene('fondoPorBioma') ? biomaDelFondo() : 'bosque';
      renderer.dibujar({
        mundo,
        jugador,
        companeros: sesionRed?.otros(),
        // En el anfitrión devuelve null y se usan los suyos de siempre.
        enemigosRed: sesionRed?.bichos() ?? undefined,
        desvioJugador: sesionRed?.desvio(),
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
        explosivos: bombas,
        disparos: [...tiros, ...tirosMios],
        particulas,
        sumergido: sumergidoAhora,
        enMano: barra.objetoActivo(),
        // Hasta 4.1.0 la armadura se llevaba pero no se veía.
        armadura: tiene('armaduraVisible') ? coloresEquipo(equipo) : ARMADURA_DESNUDA,
        epoca,
        bioma: biomaFondoAhora,
        // El fondo del inframundo se mide desde su techo y no desde el cero del
        // mundo: a esa profundidad el parallax vertical sacaba las tiras de la
        // pantalla por arriba. Los horizontes siguen midiéndose desde cero, que
        // es donde está su línea del cielo.
        baseFondoY:
          biomaFondoAhora === 'inframundo' ? motorLuz.techoInframundo * TILE : 0,
      });

      // Los marcadores en vivo del panel de depuración, cuatro veces por
      // segundo: son lectura del DOM y no hace falta ir a sesenta.
      if (depuracion.abierto && bucle.fps > 0 && relojAparicion % 15 === 0) {
        depuracion.refrescarMarcadores();
      }
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

  // Lo último y sin esperarla: conectar tarda y no puede retrasar el primer
  // frame. Si sale, aparecen los demás; si no, se juega solo y se dice.
  // Quién guarda se pregunta siempre, conecte o no la partida acompañada: un
  // mundo de la nube abierto a solas también hay que poder guardarlo.
  void averiguarSiMando();
  void conectarConLosDemas();

  // Al cerrar la pestaña se avisa a los demás, que si no se quedan viendo un
  // muñeco quieto hasta que caduque la conexión.
  window.addEventListener('pagehide', () => void sesionRed?.cerrar());
}

arrancar().catch(mostrarError);

window.addEventListener('error', (e) => mostrarError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => mostrarError(e.reason));

import { TICK, TILE } from './core/constants';
import { crearEntrada } from './engine/input';
import { crearBucle } from './engine/loop';
import { Reloj } from './engine/time';
import { crearPuntero } from './engine/mouse';
import { crearAudio } from './engine/audio';
import { crearAjustes } from './ui/ajustes';
import { crearAyuda } from './ui/ayuda';
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
  enAlcance,
  puedeColocarBloque,
  puedeColocarPared,
  puedeMinar,
  reiniciarPicado,
  type Capa,
} from './world/edit';
import { leerOpciones, prepararEscenario } from './world/escenario';
import { MotorLuz } from './world/lighting';
import { Inventario } from './items/inventory';
import { equipoInicial, potenciaEnMano } from './items/equipo';
import { defObjeto, dropDePared, dropDeTile } from './items/items';
import { estacionesCerca } from './items/recipes';
import { Contenedores } from './world/contenedores';
import { AIRE, COFRE, defTile, esEstacion } from './world/tiles';
import { Particulas } from './render/particles';
import {
  actualizarDrop,
  crearDrop,
  fusionarDrops,
  soltar,
  type Drop,
} from './entities/drop';
import { actualizarEnemigos, botinDe, ENEMIGOS, type Enemigo } from './entities/enemies';
import { crearGolpe, lanzarGolpe, resolverGolpe, tickGolpe } from './entities/combat';
import { crearSalud, golpear, revivir, tickSalud, VIDA_MAXIMA } from './entities/salud';
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
import { esComida, esCubo } from './items/items';
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
  columna: number | null = null,
): Promise<{ mundo: Mundo; spawnTx: number; spawnTy: number; zonas: Zona[]; semilla: string }> {
  const it = prepararEscenario({ lab, semilla, tamano, minutos: null, columna });
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
      cofres: [],
      vida: VIDA_MAXIMA,
      hambre: HAMBRE_MAXIMA,
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
    const gen = await generar(op.semilla, op.tamano, op.lab, op.columna);
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
    const gen = await generar(eleccion.semilla, eleccion.tamano, false, op.columna);
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
  const enemigos: Enemigo[] = [];
  const particulas = new Particulas();
  const cofres = Contenedores.desdeDatos(mundo.ancho, partida.estado.cofres);
  const salud = crearSalud(VIDA_MAXIMA);
  if (partida.estado.vida > 0) salud.vida = Math.min(VIDA_MAXIMA, partida.estado.vida);
  const aliento = crearAliento();
  const hambre = crearHambre(
    partida.estado.hambre > 0 ? partida.estado.hambre : HAMBRE_MAXIMA,
  );
  const golpe = crearGolpe();
  // Al abrir un mundo guardado el líquido está quieto en el array pero la
  // simulación no sabe que existe: hay que despertarlo o el agua se quedaría
  // congelada hasta que alguien la tocase.
  const liquidos = new SimuladorLiquidos(mundo);
  liquidos.despertarTodo();
  const panelVida = crearPanelVida(capaUI);
  panelVida.refrescar(salud);
  panelVida.refrescarAliento(aliento);
  panelVida.refrescarHambre(hambre);
  const aviso = crearAviso(capaUI);
  const audio = crearAudio();
  const opciones = crearAjustes(capaUI, audio);
  const ayuda = crearAyuda(capaUI);
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
  const barra = crearBarra(capaUI, inventario, {
    alCambiar: () => reiniciarPicado(picado),
    estaciones: () => estacionesCerca(mundo, jugador.caja),
    alFabricar: () => audio.sonar('craftear'),
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
      cofres.limpiar();
      partida.estado.cofres = cofres.aDatos();
      partida.estado.vida = salud.vida;
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
  entrada.alPulsar('Escape', () => {
    barra.cerrar();
    opciones.cerrar();
    ayuda.cerrar();
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
  /** Ticks hasta el próximo intento de aparición de enemigos. */
  let relojAparicion = 0;

  /** Enemigos, golpes y vida: todo lo que puede matar o morir en un tick. */
  function actualizarCombate(): void {
    tickSalud(salud);
    tickGolpe(golpe);

    // El hambre gasta más si se está haciendo algo: correr, saltar o picar.
    const activo =
      Math.abs(jugador.caja.vx) > 0.6 || !jugador.caja.enSuelo || picado.progreso > 0;
    const rh = tickHambre(hambre, salud, jugador.caja, activo);
    if (rh.curado || rh.danado) panelVida.refrescar(salud);
    if (rh.danado) aviso.mostrar('Tienes hambre', true);
    panelVida.refrescarHambre(hambre);

    // El golpe activo alcanza a quien toque, una vez por mandoble.
    const r = resolverGolpe(golpe, jugador.caja, enemigos);
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
    for (const muerto of r.muertos) {
      const b = botinDe(muerto.especie);
      const tx = Math.floor((muerto.caja.x + muerto.caja.ancho / 2) / TILE);
      const ty = Math.floor((muerto.caja.y + muerto.caja.alto / 2) / TILE);
      drops.push(crearDrop(b.objeto, b.cantidad, tx, ty));
      particulas.emitir(muerto.caja.x + muerto.caja.ancho / 2, muerto.caja.y + muerto.caja.alto / 2, {
        cantidad: 18,
        color: ENEMIGOS[muerto.especie].color,
        dispersion: 2.6,
        empujeY: -1.2,
        vida: 34,
        tam: 3,
      });
      sacudir(2.4);
      audio.sonar('golpe', 0.7);
    }

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
      if (golpear(salud, jugador.caja, res.danoAlJugador, fuenteX)) {
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
      const b = botinDe(m.especie);
      drops.push(crearDrop(b.objeto, b.cantidad, m.tx, m.ty));
    }

    if (salud.muerto) {
      particulas.emitir(
        jugador.caja.x + jugador.caja.ancho / 2,
        jugador.caja.y + jugador.caja.alto / 2,
        { cantidad: 40, color: '#d94f4f', dispersion: 3.4, vida: 55, tam: 3 },
      );
      sacudir(8);
      audio.sonar('muerte');
      reaparecer(jugador);
      revivir(salud);
      reiniciarAliento(aliento);
      reiniciarHambre(hambre);
      panelVida.refrescarHambre(hambre);
      particulas.limpiar();
      panelVida.mostrarMuerte(true, 'Vuelves al punto de aparición.');
      window.setTimeout(() => panelVida.mostrarMuerte(false), 2200);
    }

    limpiarEnemigos(enemigos);

    if (--relojAparicion <= 0) {
      relojAparicion = INTERVALO_INTENTO;
      const txJugador = Math.floor((jugador.caja.x + jugador.caja.ancho / 2) / TILE);
      const tyJugador = Math.floor((jugador.caja.y + jugador.caja.alto) / TILE);
      intentarAparicion(mundo, enemigos, jugador.caja, {
        esNoche: reloj.esNoche,
        superficieTy: motorLuz.alturaCielo[txJugador] ?? 0,
        bioma: biomaEn(mundo, txJugador, tyJugador),
      });
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
    const tileEnMano = defObjeto(enMano).tile;
    const potencia = potenciaEnMano(enMano);

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

    // Con un arma en la mano el clic izquierdo golpea; con cualquier otra cosa,
    // pica. Es lo que hace que elegir el arma signifique algo.
    if (puntero.izq && esArma(enMano)) {
      lanzarGolpe(golpe, enMano, jugador.caja.mirando);
      reiniciarPicado(picado);
      objetivo.valido = false;
      derAnterior = puntero.der;
      return;
    }

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
        const soltado =
          capa === 'bloque'
            ? dropDeTile(mundo.getTile(tx, ty))
            : dropDePared(mundo.getPared(tx, ty));
        // Chispas del pico mientras se pica, no solo al romper: el bloque
        // avisa de que le está pasando algo antes de partirse.
        const colorTile =
          capa === 'bloque'
            ? defTile(mundo.getTile(tx, ty)).color
            : defTile(mundo.getPared(tx, ty)).color;
        if (picado.progreso > 0) audio.sonar('picar', 0.8 + Math.random() * 0.5);
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
        if (avanzarPicado(mundo, picado, tx, ty, capa, potencia)) {
          renderer.cache.invalidar(tx, ty);
          motorLuz.invalidar(tx);
          // Abrir un hueco es lo que hace que el agua de al lado se mueva.
          liquidos.activar(tx, ty);
          // El bloque revienta en cascotes de su propio color.
          particulas.emitir(tx * TILE + 8, ty * TILE + 8, {
            cantidad: 14,
            color: colorTile,
            dispersion: 2.2,
            vida: 32,
            tam: 3,
          });
          sacudir(0.9);
          audio.sonar('romper', 0.85 + Math.random() * 0.3);
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
    const antes = liquidos.pendientes;
    liquidos.paso();
    const s = sumersion(mundo, jugador.caja, TILE);
    if (s.lava || (antes > 0 && hayLavaCerca())) motorLuz.marcarSucio();

    const r = tickAliento(aliento, salud, jugador.caja, s.cabeza && !s.lava, s.lava);
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
      reloj.avanzar(TICK);
      editar();
      const sumergido = actualizarLiquidos();
      const enSueloAntes = jugador.caja.enSuelo;
      actualizarJugador(mundo, jugador, entrada.estado(), ajustes, sumergido);
      efectosDelJugador(enSueloAntes, sumergido);
      sumergidoAhora = sumergido;
      actualizarDrops();
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
        particulas,
        sumergido: sumergidoAhora,
        enMano: barra.objetoActivo(),
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

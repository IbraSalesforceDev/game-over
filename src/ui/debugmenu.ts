import { defObjeto, IDS_OBJETO, NADA, objetoExisteEn } from '../items/items';
import { VERSION_ACTUAL } from '../core/versiones';
import { crearIconos, LADO_ICONO } from '../render/iconos';
import type { Especie } from '../entities/enemies';
import { ENEMIGOS, especieExisteEn } from '../entities/enemies';

/**
 * Menú de trucos y depuración.
 *
 * No aparece en los controles ni en las opciones a propósito: es una puerta de
 * servicio, no una función del juego. El acorde P+F3 llama a la puerta y una
 * contraseña la abre; sin ella no se ve nada del panel.
 *
 * Conviene decir qué es y qué no es esta contraseña: el juego entero se
 * descarga en el navegador de quien juega, así que la palabra está dentro del
 * bundle y quien sepa mirarlo la encontrará. No protege de nadie decidido — es
 * un pestillo, no una cerradura. Lo que sí hace es que ni un acorde pulsado por
 * casualidad ni alguien curioseando por encima del hombro abran los trucos.
 *
 * Existe porque probar el juego sin él cuesta horas: para ver si el pico de oro
 * pica bien hay que bajar a por oro, y para ver si un jabalí se comporta hay que
 * encontrar uno. Desde aquí se hace en dos clics.
 *
 * Va por pestañas desde 6.6.0. Antes era una columna única de siete secciones y
 * había que hacer scroll dentro del panel para llegar a las estructuras, con lo
 * que la mitad de lo que había aquí no se usaba porque no se veía. Cuatro
 * pestañas caben enteras en pantalla y ninguna necesita scroll.
 */

export interface TrucosDebug {
  /** Multiplica la velocidad de picado. 1 es lo normal. */
  velocidadMinado: number;
  /** Lado del cuadrado que se pica de una vez: 1 = 1x1, 3 = 3x3... */
  radioMinado: number;
  /** Ignora la gravedad y se mueve libremente. */
  volar: boolean;
  /** Multiplica el daño que hace el jugador. */
  danoMultiplicador: number;
  /** Recibe daño o no. */
  invulnerable: boolean;
  /** El mapa enseña el mundo entero sin necesidad de fabricarlo. */
  mapaCompleto: boolean;
  /** Ofrece también lo que no existe en la versión del mundo. */
  sinLimiteVersion: boolean;
  /** El hambre deja de bajar. */
  sinHambre: boolean;
  /** No aparecen criaturas por su cuenta. */
  sinApariciones: boolean;
  /** El reloj se queda quieto a la hora que esté. */
  congelarReloj: boolean;
}

export function crearTrucos(): TrucosDebug {
  return {
    velocidadMinado: 1,
    radioMinado: 1,
    volar: false,
    danoMultiplicador: 1,
    invulnerable: false,
    mapaCompleto: false,
    sinLimiteVersion: false,
    sinHambre: false,
    sinApariciones: false,
    congelarReloj: false,
  };
}

export interface OpcionesDebugMenu {
  trucos: TrucosDebug;
  /**
   * Versión del mundo abierto.
   *
   * El panel es una puerta de servicio, pero no es una puerta a otro juego:
   * por defecto solo ofrece lo que existe en este mundo. Dar un mapa en una
   * partida de 1.4.0 no es hacer trampa, es meter en el mundo algo que no
   * pertenece a él, y ni siquiera para probar sirve de nada. Para eso está el
   * interruptor de "sin límite de versión", que lo dice en voz alta.
   */
  version?: string;
  darObjeto(objeto: number, cantidad: number): void;
  vaciarInventario(): void;
  generarCriatura(especie: Especie, elite: boolean): void;
  matarCriaturas(): void;
  /** Cuántas hay ahora mismo, para el marcador. */
  cuantasCriaturas(): number;
  rellenarVida(): void;
  establecerVidaMaxima(v: number): void;
  vidaMaximaActual(): number;
  /** Minuto del día, 0-1439. */
  horaActual(): number;
  ponerHora(minutos: number): void;
  /**
   * Estructuras del mundo, para poder plantarse en ellas.
   *
   * Probar la fortaleza cavando hasta ella cuesta un cuarto de hora por
   * intento, y la mitad de las veces se pasa de largo. Con esto se llega en un
   * clic, que es exactamente para lo que existe este panel.
   */
  estructuras(): readonly { nombre: string; tx: number; ty: number }[];
  viajarA(tx: number, ty: number): void;
  volverAlSpawn(): void;
  /** Abre el mapa, lo mismo que la M. */
  abrirMapa(): void;
  /**
   * Los sucesos que se pueden lanzar a mano, y cuál está en marcha.
   *
   * Sin esto, probar una luna de sangre es esperar a que salga: un suceso cada
   * veinte minutos de media y uno de cada tres, con lo que ver los tres puede
   * costar una hora larga de reloj.
   */
  sucesos(): readonly { clave: string; nombre: string }[];
  sucesoActivo(): string | null;
  lanzarSuceso(clave: string): void;
  cortarSuceso(): void;
  /** Datos del mundo abierto, para el marcador de la pestaña de mundo. */
  informe(): {
    semilla: string;
    ancho: number;
    alto: number;
    tx: number;
    ty: number;
    bioma: string;
    fps: number;
  };
}

const ESTILO = `
#depuracion {
  pointer-events: auto;
  position: fixed; right: 14px; top: 14px; z-index: 95; width: min(94vw, 340px);
  max-height: 88vh; overflow-y: auto; display: none; padding: 0;
  background: rgba(10,13,18,.97); border: 1px solid #48354f; border-radius: 10px;
  font: 11px ui-monospace, monospace; color: #cfc4d8;
  box-shadow: 0 18px 44px rgba(0,0,0,.6);
}
#depuracion.visible { display: block; }
#depuracion .cabecera {
  display: flex; align-items: baseline; gap: 8px;
  padding: 12px 14px 10px; border-bottom: 1px solid #241c2a;
}
#depuracion h3 {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: #c08fd8; margin: 0; flex: 1;
}
#depuracion .marca { color: #5a4f66; font-size: 9px; }

/* Las pestañas. Es lo que sustituye a la columna de siete secciones: se ve una
   cosa a la vez y entera, sin scroll dentro del panel. */
#depuracion .pestanas { display: flex; border-bottom: 1px solid #241c2a; }
#depuracion .pestanas button {
  flex: 1; padding: 8px 0; cursor: pointer; border: 0; border-bottom: 2px solid transparent;
  background: transparent; color: #7a6a86; font: 10px ui-monospace, monospace;
  letter-spacing: .08em; text-transform: uppercase;
}
#depuracion .pestanas button:hover { color: #cfc4d8; background: #171320; }
#depuracion .pestanas button.activa { color: #c08fd8; border-bottom-color: #c08fd8; }

#depuracion .hoja { display: none; padding: 12px 14px 4px; }
#depuracion .hoja.activa { display: block; }

#depuracion h4 {
  font-size: 9px; letter-spacing: .16em; text-transform: uppercase;
  color: #7a6a86; margin: 14px 0 6px; border-top: 1px solid #241c2a; padding-top: 10px;
}
#depuracion .hoja h4:first-child { border-top: 0; padding-top: 0; margin-top: 0; }
#depuracion .fila { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
#depuracion .fila label { flex: 1; color: #9a8ea6; }
#depuracion select, #depuracion input[type=number], #depuracion input[type=text] {
  background: #171320; color: #cfc4d8; border: 1px solid #38304a; border-radius: 5px;
  padding: 4px 6px; font: 11px ui-monospace, monospace; min-width: 0;
}
#depuracion select { flex: 2; }
#depuracion input[type=number] { width: 66px; }
#depuracion input[type=text] { flex: 1; }
#depuracion input[type=range] { flex: 2; accent-color: #c08fd8; }
#depuracion .valor { width: 46px; text-align: right; color: #7a6a86; }
#depuracion button {
  padding: 5px 9px; cursor: pointer; border-radius: 5px;
  background: #241c2e; border: 1px solid #38304a; color: #cfc4d8;
  font: 11px ui-monospace, monospace;
}
#depuracion button:hover { background: #302640; }
#depuracion .peligro { border-color: #6a3040; color: #e0a09a; }
#depuracion .peligro:hover { background: #3a1c24; }
#depuracion .interruptor { cursor: pointer; padding: 3px 10px; border-radius: 5px;
  border: 1px solid #38304a; background: #171320; color: #7a6a86; min-width: 26px;
  text-align: center; }
#depuracion .interruptor.on { background: #2a3a2a; border-color: #4c8b3a; color: #b8e0a8; }
#depuracion .pie {
  color: #5a4f66; font-size: 9px; line-height: 1.5;
  padding: 10px 14px; border-top: 1px solid #241c2a;
}
/* Recado corto debajo de un control, para decir por qué no ha hecho nada. Se
   queda vacío mientras todo va bien y entonces no ocupa ni una línea. */
#depuracion .nota { color: #c88a3a; font-size: 9px; min-height: 0; }
#depuracion .nota:empty { display: none; }
/* El marcador de la pestaña de mundo: parejas clave-valor en dos columnas. */
#depuracion .datos {
  display: grid; grid-template-columns: auto 1fr; gap: 2px 10px;
  color: #7a6a86; margin-bottom: 8px;
}
#depuracion .datos b { color: #9a8ea6; font-weight: normal; }
#depuracion .datos span { color: #cfc4d8; text-align: right; }
#depuracion .vacio { color: #5a4f66; font-style: italic; padding: 2px 0 6px; }

/* La puerta: una sola línea con un campo. Del panel de detrás no se enseña
   nada —ni los títulos ni los controles— hasta que la contraseña es correcta. */
#depuracion-puerta {
  pointer-events: auto;
  position: fixed; right: 14px; top: 14px; z-index: 96; display: none;
  width: min(94vw, 340px); padding: 14px;
  background: rgba(10,13,18,.97); border: 1px solid #48354f; border-radius: 10px;
  font: 11px ui-monospace, monospace; color: #cfc4d8;
  box-shadow: 0 18px 44px rgba(0,0,0,.6);
}
#depuracion-puerta.visible { display: block; }
#depuracion-puerta h3 {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: #c08fd8; margin-bottom: 10px;
}
#depuracion-puerta input {
  width: 100%; box-sizing: border-box; margin-bottom: 8px;
  background: #171320; color: #cfc4d8; border: 1px solid #38304a; border-radius: 5px;
  padding: 6px 8px; font: 11px ui-monospace, monospace;
}
#depuracion-puerta input.mal { border-color: #7a3040; color: #e0857a; }
#depuracion-puerta button {
  width: 100%; padding: 6px; cursor: pointer; border-radius: 5px;
  background: #241c2e; border: 1px solid #38304a; color: #cfc4d8;
  font: 11px ui-monospace, monospace;
}
#depuracion-puerta button:hover { background: #302640; }
#depuracion-puerta .aviso { color: #5a4f66; font-size: 9px; margin-top: 8px; }
`;

/** Lo que hay que escribir para que la puerta se abra. */
export const CONTRASENA = 'ibrasaysopensesame';

/** ¿Vale esta palabra? Sin distinguir mayúsculas ni espacios de más. */
export function contrasenaCorrecta(texto: string): boolean {
  return texto.trim().toLowerCase() === CONTRASENA;
}

/**
 * Las horas a las que se salta con un clic.
 *
 * Son las cuatro que cambian algo de verdad: dos para ver el mundo y dos para
 * que salgan bichos. Un deslizador de mil cuatrocientos cuarenta minutos también
 * está, pero acertar el amanecer arrastrándolo es imposible.
 */
export const HORAS: readonly { nombre: string; minutos: number }[] = [
  { nombre: 'amanecer', minutos: 6 * 60 },
  { nombre: 'mediodía', minutos: 12 * 60 },
  { nombre: 'ocaso', minutos: 19 * 60 },
  { nombre: 'noche', minutos: 0 },
];

/** Minutos a "hh:mm", con el cero delante. */
export function comoHora(minutos: number): string {
  const m = ((Math.round(minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * ¿Encaja este nombre con lo que se ha escrito en el buscador?
 *
 * Sin acentos y sin mayúsculas, porque nadie escribe "batería improvisada" con
 * la tilde puesta cuando lo que quiere es encontrarla. Con doscientos objetos en
 * la lista, el desplegable dejó de servir para buscar hace tiempo.
 */
export function encaja(nombre: string, filtro: string): boolean {
  if (filtro === '') return true;
  const limpio = (s: string): string =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  return limpio(nombre).includes(limpio(filtro));
}

/**
 * Una coordenada escrita a mano, o null si no hay ninguna que valga.
 *
 * Se mira el texto y no el número, y ahí está todo el asunto: `Number('')` es
 * **cero**, no un error. Con la comprobación hecha sobre el número, pulsar "Ir
 * ahí" con los campos en blanco viajaba a la casilla 0,0 —el borde de arriba a
 * la izquierda del mundo, un cielo sin suelo del que se cae— en vez de no hacer
 * nada. Vacío, en blanco y "hola" significan los tres lo mismo: que todavía no
 * se ha dicho a dónde.
 */
export function coordenadaEscrita(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * El destino de un viaje, recortado para que caiga dentro del mundo.
 *
 * Recortar y no rechazar: quien escribe un número enorme quiere el borde de
 * allí, y devolverle un aviso no le acerca. Fuera del mapa no hay nada que
 * hacer —por la derecha se cae al vacío hasta que la red de seguridad devuelve
 * al spawn, y por arriba se aparece en un cielo sin suelo—, así que el borde es
 * la respuesta más parecida a lo que se pedía.
 *
 * Los tres tiles de margen de arriba son los mismos que el viaje deja siempre
 * por encima del punto anotado, para no nacer metido dentro del altar.
 */
export const MARGEN_VIAJE = 3;

export function destinoDeViaje(
  tx: number,
  ty: number,
  ancho: number,
  alto: number,
): { tx: number; ty: number } {
  return {
    tx: Math.min(Math.max(tx, 1), Math.max(1, ancho - 2)),
    ty: Math.min(Math.max(ty, MARGEN_VIAJE), Math.max(MARGEN_VIAJE, alto - 2)),
  };
}

export interface PanelDebug {
  alternar(): void;
  cerrar(): void;
  readonly abierto: boolean;
  /** ¿Se ha metido ya la contraseña en esta sesión? */
  readonly desbloqueado: boolean;
  /** Refresca los marcadores en vivo. Lo llama el bucle, de vez en cuando. */
  refrescarMarcadores(): void;
}

export function crearDebugMenu(contenedor: HTMLElement, op: OpcionesDebugMenu): PanelDebug {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);
  const iconos = crearIconos();

  const panel = document.createElement('div');
  panel.id = 'depuracion';

  panel.innerHTML = `
    <div class="cabecera">
      <h3>Depuración</h3>
      <span class="marca" id="dbg-version"></span>
    </div>
    <div class="pestanas">
      <button data-hoja="objetos" class="activa">Objetos</button>
      <button data-hoja="jugador">Jugador</button>
      <button data-hoja="bichos">Bichos</button>
      <button data-hoja="mundo">Mundo</button>
    </div>

    <div class="hoja activa" data-hoja="objetos">
      <div class="fila">
        <input id="dbg-buscar" type="text" placeholder="buscar…" autocomplete="off"
          spellcheck="false">
        <span class="valor" id="dbg-cuenta"></span>
      </div>
      <div class="fila">
        <canvas id="dbg-icono" width="${LADO_ICONO}" height="${LADO_ICONO}"
          style="width:24px;height:24px;image-rendering:pixelated"></canvas>
        <select id="dbg-objeto" size="1"></select>
      </div>
      <div class="fila">
        <input id="dbg-cantidad" type="number" min="1" max="999" value="10">
        <button id="dbg-dar" style="flex:1">Dar</button>
        <button id="dbg-pila">Pila</button>
      </div>
      <h4>Catálogo</h4>
      <div class="fila">
        <label>Sin límite de versión</label>
        <span class="interruptor" id="dbg-sinlimite">no</span>
      </div>
      <div class="fila">
        <button id="dbg-vaciar" class="peligro" style="flex:1">Vaciar el inventario</button>
      </div>
    </div>

    <div class="hoja" data-hoja="jugador">
      <div class="fila">
        <label>Volar</label>
        <span class="interruptor" id="dbg-volar">no</span>
      </div>
      <div class="fila">
        <label>Invulnerable</label>
        <span class="interruptor" id="dbg-invuln">no</span>
      </div>
      <div class="fila">
        <label>Sin hambre</label>
        <span class="interruptor" id="dbg-sinhambre">no</span>
      </div>
      <div class="fila">
        <label>Daño</label>
        <input id="dbg-dano" type="range" min="1" max="20" step="1" value="1">
        <span class="valor" id="dbg-dano-val">×1</span>
      </div>
      <div class="fila">
        <label>Vida máxima</label>
        <input id="dbg-vidamax" type="number" min="20" max="2000" step="20">
        <button id="dbg-aplicar-vida">Fijar</button>
      </div>
      <div class="fila">
        <button id="dbg-curar" style="flex:1">Rellenar vida</button>
        <button id="dbg-spawn">Al spawn</button>
      </div>

      <h4>Minado</h4>
      <div class="fila">
        <label>Velocidad</label>
        <input id="dbg-vel" type="range" min="1" max="40" step="1" value="1">
        <span class="valor" id="dbg-vel-val">×1</span>
      </div>
      <div class="fila">
        <label>Área</label>
        <select id="dbg-area">
          <option value="1">1 × 1</option>
          <option value="3">3 × 3</option>
          <option value="5">5 × 5</option>
          <option value="7">7 × 7</option>
          <option value="9">9 × 9</option>
        </select>
      </div>
    </div>

    <div class="hoja" data-hoja="bichos">
      <div class="fila">
        <input id="dbg-buscar-bicho" type="text" placeholder="buscar…" autocomplete="off"
          spellcheck="false">
        <span class="valor" id="dbg-vivos"></span>
      </div>
      <div class="fila">
        <select id="dbg-especie"></select>
      </div>
      <div class="fila">
        <label>De élite</label>
        <span class="interruptor" id="dbg-elite">no</span>
      </div>
      <div class="fila">
        <button id="dbg-generar" style="flex:1">Generar</button>
        <button id="dbg-generar5">×5</button>
      </div>
      <h4>Apariciones</h4>
      <div class="fila">
        <label>Que no salga nada</label>
        <span class="interruptor" id="dbg-sinaparicion">no</span>
      </div>
      <div class="fila">
        <button id="dbg-matar" class="peligro" style="flex:1">Matar a todos</button>
      </div>
    </div>

    <div class="hoja" data-hoja="mundo">
      <div class="datos" id="dbg-datos"></div>

      <h4>Hora</h4>
      <div class="fila">
        <input id="dbg-hora" type="range" min="0" max="1439" step="10" value="720">
        <span class="valor" id="dbg-hora-val">12:00</span>
      </div>
      <div class="fila" id="dbg-horas"></div>
      <div class="fila">
        <label>Reloj parado</label>
        <span class="interruptor" id="dbg-congelar">no</span>
      </div>

      <h4>Sucesos</h4>
      <div class="fila">
        <select id="dbg-suceso"></select>
        <button id="dbg-lanzar">Lanzar</button>
      </div>
      <div class="fila">
        <label>En marcha</label>
        <span class="valor" id="dbg-suceso-activo" style="width:auto">ninguno</span>
        <button id="dbg-cortar">Cortar</button>
      </div>

      <h4>Viajar</h4>
      <div class="fila">
        <select id="dbg-estructura"></select>
        <button id="dbg-viajar">Ir</button>
      </div>
      <div class="fila">
        <input id="dbg-tx" type="number" min="0" step="1" placeholder="x">
        <input id="dbg-ty" type="number" min="0" step="1" placeholder="y">
        <button id="dbg-ir-xy" style="flex:1">Ir ahí</button>
      </div>
      <div class="nota" id="dbg-viaje-nota"></div>
      <div class="fila">
        <label>Mapa del mundo</label>
        <span class="interruptor" id="dbg-mapa">no</span>
      </div>
      <div class="fila">
        <button id="dbg-ver-mapa" style="flex:1">Ver el mapa (M)</button>
      </div>
    </div>

    <div class="pie">P + F3 para abrir y cerrar. No aparece en los controles.</div>
  `;
  contenedor.appendChild(panel);

  const $ = <T extends HTMLElement>(id: string): T => panel.querySelector<T>(`#${id}`)!;
  const selObjeto = $<HTMLSelectElement>('dbg-objeto');
  const iconoObjeto = $<HTMLCanvasElement>('dbg-icono');
  const buscar = $<HTMLInputElement>('dbg-buscar');
  const cuenta = $('dbg-cuenta');
  const cantidad = $<HTMLInputElement>('dbg-cantidad');
  const vel = $<HTMLInputElement>('dbg-vel');
  const velVal = $('dbg-vel-val');
  const area = $<HTMLSelectElement>('dbg-area');
  const dano = $<HTMLInputElement>('dbg-dano');
  const danoVal = $('dbg-dano-val');
  const vidaMax = $<HTMLInputElement>('dbg-vidamax');
  const selEspecie = $<HTMLSelectElement>('dbg-especie');
  const buscarBicho = $<HTMLInputElement>('dbg-buscar-bicho');
  const vivos = $('dbg-vivos');
  const selEstructura = $<HTMLSelectElement>('dbg-estructura');
  const hora = $<HTMLInputElement>('dbg-hora');
  const horaVal = $('dbg-hora-val');
  const datos = $('dbg-datos');
  const selSuceso = $<HTMLSelectElement>('dbg-suceso');
  const sucesoActivo = $('dbg-suceso-activo');
  // Vive aquí y no en `trucos` porque no cambia nada del jugador: es solo con
  // qué bandera nace la próxima criatura que se genere.
  let elite = false;

  // --- Pestañas ------------------------------------------------------------
  const botonesPestana = [...panel.querySelectorAll<HTMLButtonElement>('.pestanas button')];
  const hojas = [...panel.querySelectorAll<HTMLElement>('.hoja')];
  for (const boton of botonesPestana) {
    boton.addEventListener('click', () => {
      const cual = boton.dataset.hoja;
      for (const b of botonesPestana) b.classList.toggle('activa', b === boton);
      for (const h of hojas) h.classList.toggle('activa', h.dataset.hoja === cual);
      if (cual === 'mundo') refrescarMundo();
    });
  }

  /**
   * Un interruptor de sí/no atado a un campo de los trucos.
   *
   * Eran diez copias del mismo bloque de cuatro líneas —cambiar el valor, poner
   * el texto, poner la clase— y en esas diez copias es donde se cuela el día que
   * uno alterna una cosa y pinta otra.
   */
  function interruptor(
    id: string,
    leer: () => boolean,
    escribir: (v: boolean) => void,
    despues?: () => void,
  ): void {
    const el = $(id);
    const pintar = (): void => {
      const v = leer();
      el.textContent = v ? 'sí' : 'no';
      el.classList.toggle('on', v);
    };
    el.addEventListener('click', () => {
      escribir(!leer());
      pintar();
      despues?.();
    });
    pintar();
  }

  /** El recado de debajo del viaje. Cadena vacía = se esconde. */
  function nota(texto: string): void {
    $('dbg-viaje-nota').textContent = texto;
  }

  /**
   * Rellena la lista de destinos.
   *
   * Se rehace cada vez que se abre el panel y no una sola vez al crearlo: el
   * menú se construye durante el arranque, cuando la partida todavía se está
   * montando, y una lista pintada entonces saldría vacía para siempre.
   */
  function refrescarEstructuras(): void {
    const lista = op.estructuras();
    selEstructura.innerHTML = lista
      .map((e, i) => `<option value="${i}">${e.nombre} · ${e.tx}, ${e.ty}</option>`)
      .join('');
    if (lista.length === 0) {
      selEstructura.innerHTML = '<option value="-1">este mundo no tiene</option>';
    }
  }

  /**
   * Rellena las listas de objetos y criaturas con lo que existe en el mundo.
   *
   * Se rehacen al abrir el panel y al tocar el interruptor, no una sola vez al
   * crearlo: cuando el menú se construye la partida todavía se está montando y
   * la versión aún no está decidida.
   */
  function refrescarCatalogos(): void {
    const v = op.version ?? VERSION_ACTUAL;
    const todo = op.trucos.sinLimiteVersion;
    const objetos = IDS_OBJETO.filter(
      (id) => id !== NADA && (todo || objetoExisteEn(id, v)) && encaja(defObjeto(id).nombre, buscar.value),
    );
    const antes = selObjeto.value;
    selObjeto.innerHTML = objetos
      .map((id) => `<option value="${id}">${defObjeto(id).nombre}</option>`)
      .join('');
    if (objetos.includes(Number(antes))) selObjeto.value = antes;
    cuenta.textContent = String(objetos.length);
    pintarIcono();

    const especies = (Object.keys(ENEMIGOS) as Especie[]).filter(
      (e) => (todo || especieExisteEn(e, v)) && encaja(ENEMIGOS[e].nombre, buscarBicho.value),
    );
    const especieAntes = selEspecie.value;
    selEspecie.innerHTML = especies
      .map((e) => `<option value="${e}">${ENEMIGOS[e].nombre}</option>`)
      .join('');
    if (especies.includes(especieAntes as Especie)) selEspecie.value = especieAntes;
  }

  /** El marcador de la pestaña de mundo. */
  function refrescarMundo(): void {
    const i = op.informe();
    datos.innerHTML = [
      ['semilla', i.semilla],
      ['tamaño', `${i.ancho} × ${i.alto}`],
      ['estás en', `${i.tx}, ${i.ty}`],
      ['bioma', i.bioma],
      ['fps', String(Math.round(i.fps))],
    ]
      .map(([k, v]) => `<b>${k}</b><span>${v}</span>`)
      .join('');
    const m = op.horaActual();
    hora.value = String(m);
    horaVal.textContent = comoHora(m);
    sucesoActivo.textContent = op.sucesoActivo() ?? 'ninguno';
    if (selSuceso.options.length === 0) {
      selSuceso.innerHTML = op
        .sucesos()
        .map((s) => `<option value="${s.clave}">${s.nombre}</option>`)
        .join('');
    }
  }

  function pintarIcono(): void {
    const id = Number(selObjeto.value);
    if (Number.isFinite(id) && id > 0) iconos.pintarEn(iconoObjeto, id);
  }
  vidaMax.value = String(op.vidaMaximaActual());
  $('dbg-version').textContent = `v${op.version ?? VERSION_ACTUAL}`;

  // Los cuatro saltos de hora, generados de la tabla.
  $('dbg-horas').innerHTML = HORAS.map(
    (h, i) => `<button data-hora="${i}" style="flex:1">${h.nombre}</button>`,
  ).join('');
  for (const boton of panel.querySelectorAll<HTMLButtonElement>('[data-hora]')) {
    boton.addEventListener('click', () => {
      const h = HORAS[Number(boton.dataset.hora)];
      if (!h) return;
      op.ponerHora(h.minutos);
      refrescarMundo();
    });
  }

  // --- Objetos -------------------------------------------------------------
  selObjeto.addEventListener('change', pintarIcono);
  buscar.addEventListener('input', refrescarCatalogos);
  const dar = (n: number): void => {
    const id = Number(selObjeto.value);
    if (Number.isFinite(id) && id > 0) op.darObjeto(id, n);
  };
  $('dbg-dar').addEventListener('click', () => dar(Math.max(1, Number(cantidad.value) || 1)));
  // "Pila" da lo máximo que cabe en una ranura de ese objeto: para probar el
  // apilado y el desbordamiento, que es donde vive la mitad de los fallos del
  // inventario, pedir 999 de algo que se apila de uno en uno no vale.
  $('dbg-pila').addEventListener('click', () => {
    const id = Number(selObjeto.value);
    if (Number.isFinite(id) && id > 0) op.darObjeto(id, defObjeto(id).maxPila);
  });
  $('dbg-vaciar').addEventListener('click', () => op.vaciarInventario());
  interruptor(
    'dbg-sinlimite',
    () => op.trucos.sinLimiteVersion,
    (v) => (op.trucos.sinLimiteVersion = v),
    refrescarCatalogos,
  );

  // --- Jugador -------------------------------------------------------------
  interruptor('dbg-volar', () => op.trucos.volar, (v) => (op.trucos.volar = v));
  interruptor('dbg-invuln', () => op.trucos.invulnerable, (v) => (op.trucos.invulnerable = v));
  interruptor('dbg-sinhambre', () => op.trucos.sinHambre, (v) => (op.trucos.sinHambre = v));
  interruptor('dbg-mapa', () => op.trucos.mapaCompleto, (v) => (op.trucos.mapaCompleto = v));
  // El interruptor solo enciende una capacidad; abrirlo era cosa de una tecla
  // que nadie ve desde aquí. Con el botón, el truco se usa donde se activa.
  $('dbg-ver-mapa').addEventListener('click', () => op.abrirMapa());
  dano.addEventListener('input', () => {
    op.trucos.danoMultiplicador = Number(dano.value);
    danoVal.textContent = `×${dano.value}`;
  });
  vel.addEventListener('input', () => {
    op.trucos.velocidadMinado = Number(vel.value);
    velVal.textContent = `×${vel.value}`;
  });
  area.addEventListener('change', () => {
    op.trucos.radioMinado = Number(area.value);
  });
  $('dbg-aplicar-vida').addEventListener('click', () => {
    op.establecerVidaMaxima(Math.max(20, Number(vidaMax.value) || 100));
  });
  $('dbg-curar').addEventListener('click', () => op.rellenarVida());
  $('dbg-spawn').addEventListener('click', () => op.volverAlSpawn());

  // --- Bichos --------------------------------------------------------------
  buscarBicho.addEventListener('input', refrescarCatalogos);
  interruptor('dbg-elite', () => elite, (v) => (elite = v));
  interruptor(
    'dbg-sinaparicion',
    () => op.trucos.sinApariciones,
    (v) => (op.trucos.sinApariciones = v),
  );
  const generar = (n: number): void => {
    const especie = selEspecie.value as Especie;
    if (!especie) return;
    for (let i = 0; i < n; i++) op.generarCriatura(especie, elite);
    refrescarMarcadores();
  };
  $('dbg-generar').addEventListener('click', () => generar(1));
  $('dbg-generar5').addEventListener('click', () => generar(5));
  $('dbg-matar').addEventListener('click', () => {
    op.matarCriaturas();
    refrescarMarcadores();
  });

  // --- Mundo ---------------------------------------------------------------
  interruptor('dbg-congelar', () => op.trucos.congelarReloj, (v) => (op.trucos.congelarReloj = v));
  hora.addEventListener('input', () => {
    op.ponerHora(Number(hora.value));
    horaVal.textContent = comoHora(Number(hora.value));
  });
  $('dbg-lanzar').addEventListener('click', () => {
    if (selSuceso.value) op.lanzarSuceso(selSuceso.value);
    refrescarMundo();
  });
  $('dbg-cortar').addEventListener('click', () => {
    op.cortarSuceso();
    refrescarMundo();
  });
  $('dbg-viajar').addEventListener('click', () => {
    const i = Number(selEstructura.value);
    const destino = op.estructuras()[i];
    nota(destino ? '' : 'Este mundo no tiene estructuras a las que ir');
    if (destino) op.viajarA(destino.tx, destino.ty);
  });
  $('dbg-ir-xy').addEventListener('click', () => {
    // Un campo vacío no es un cero. `Number('')` sí lo es, y por eso hasta aquí
    // pulsar "Ir ahí" sin escribir nada te dejaba flotando sobre la esquina de
    // arriba a la izquierda del mundo, que es donde nadie quería ir nunca.
    const tx = coordenadaEscrita($<HTMLInputElement>('dbg-tx').value);
    const ty = coordenadaEscrita($<HTMLInputElement>('dbg-ty').value);
    if (tx === null || ty === null) {
      nota('Escribe las dos coordenadas');
      return;
    }
    nota('');
    op.viajarA(tx, ty);
  });

  /** Los números que cambian solos: cuántos bichos hay y qué hora es. */
  function refrescarMarcadores(): void {
    if (!panel.classList.contains('visible')) return;
    vivos.textContent = String(op.cuantasCriaturas());
    const activa = panel.querySelector<HTMLElement>('.hoja.activa');
    if (activa?.dataset.hoja === 'mundo') refrescarMundo();
  }

  // --- La puerta -----------------------------------------------------------
  const puerta = document.createElement('div');
  puerta.id = 'depuracion-puerta';
  puerta.innerHTML = `
    <h3>Contraseña</h3>
    <input id="dbg-clave" type="password" autocomplete="off" spellcheck="false"
      placeholder="…">
    <button id="dbg-entrar">Entrar</button>
    <div class="aviso">Esc cierra.</div>
  `;
  contenedor.appendChild(puerta);

  const clave = puerta.querySelector<HTMLInputElement>('#dbg-clave')!;
  let desbloqueado = false;

  function cerrarTodo(): void {
    panel.classList.remove('visible');
    puerta.classList.remove('visible');
  }

  function abrirPanel(): void {
    panel.classList.add('visible');
    refrescarEstructuras();
    refrescarCatalogos();
    refrescarMundo();
    refrescarMarcadores();
  }

  function probar(): void {
    if (!contrasenaCorrecta(clave.value)) {
      clave.classList.add('mal');
      clave.value = '';
      clave.placeholder = 'no';
      return;
    }
    // Una vez dentro se queda abierta hasta recargar: pedirla en cada consulta
    // convertiría la herramienta de probar cosas en un trámite.
    desbloqueado = true;
    clave.value = '';
    clave.classList.remove('mal');
    puerta.classList.remove('visible');
    abrirPanel();
  }

  puerta.querySelector('#dbg-entrar')!.addEventListener('click', probar);
  clave.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') probar();
    if (e.key === 'Escape') cerrarTodo();
  });
  clave.addEventListener('input', () => clave.classList.remove('mal'));

  return {
    alternar() {
      if (desbloqueado) {
        if (panel.classList.contains('visible')) panel.classList.remove('visible');
        else abrirPanel();
        return;
      }
      const abriendo = !puerta.classList.contains('visible');
      puerta.classList.toggle('visible', abriendo);
      if (abriendo) {
        clave.placeholder = '…';
        clave.focus();
      }
    },
    cerrar: cerrarTodo,
    get abierto() {
      return panel.classList.contains('visible') || puerta.classList.contains('visible');
    },
    get desbloqueado() {
      return desbloqueado;
    },
    refrescarMarcadores,
  };
}

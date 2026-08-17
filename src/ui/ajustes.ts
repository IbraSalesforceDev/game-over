import type { Audio } from '../engine/audio';

/**
 * Panel de ajustes: volumen y poco más.
 *
 * Lo que hay aquí es lo que un jugador quiere cambiar en los primeros treinta
 * segundos y no puede cambiar de otra forma. Todo lo demás —gravedad, salto,
 * fricción— ya vive en el panel `F4`, que es una herramienta de desarrollo y no
 * tiene por qué mezclarse con esto.
 *
 * Las preferencias van a `localStorage` y no al fichero de la partida: son de
 * quien juega, no del mundo, y sería absurdo que el volumen cambiara al abrir
 * otro mapa.
 */

const CLAVE = 'game-over:ajustes';

interface Preferencias {
  volumen: number;
  silenciado: boolean;
  sacudida: boolean;
  /** Zoom de la cámara: 0 es el adaptativo, 1-6 lo fija a mano. */
  zoom: number;
  /** Índice dentro de `OSCURIDADES`. */
  oscuridad: number;
  /** Índice dentro de `RESOLUCIONES`. */
  resolucion: number;
}

/**
 * Los tres escalones de oscuridad.
 *
 * El número es el suelo de luz: por debajo de él no baja ni el rincón más
 * hondo. Hasta ahora estaba fijo en 34, que resultaba ser bastante generoso —
 * una cueva sin una sola antorcha se veía perfectamente, y la antorcha pasaba
 * a ser decoración. Con 14 hay que llevar luz, y con 4 hay que llevar mucha.
 *
 * El valor de siempre sigue disponible como "suave": bajar la oscuridad de un
 * juego ya empezado sin dejar volver atrás sería cambiarle la partida a quien
 * la tuviera a medias.
 */
export const OSCURIDADES: readonly { nombre: string; suelo: number }[] = [
  { nombre: 'suave', suelo: 34 },
  { nombre: 'oscura', suelo: 14 },
  { nombre: 'boca de lobo', suelo: 4 },
];

/**
 * Resolución de dibujo, como tope del devicePixelRatio.
 *
 * En un portátil justo de fuerza, bajar a "rápida" es la diferencia entre 60 y
 * 30 fotogramas, y en pixel art se nota mucho menos que en un juego 3D: los
 * bordes ya son escalones a propósito.
 */
export const RESOLUCIONES: readonly { nombre: string; dpr: number }[] = [
  { nombre: 'rápida', dpr: 0.75 },
  { nombre: 'normal', dpr: 1 },
  { nombre: 'nítida', dpr: 2 },
];

/**
 * Los escalones de zoom.
 *
 * Iban de ×2 a ×4 y nada más, que es una franja estrecha: ×2 ya era "lo más
 * lejos que se puede mirar" y ×4 "lo más cerca". Ahora hay dos escalones más a
 * cada lado. El ×1 es el mapa táctico —se ven ochenta columnas de golpe, que es
 * con lo que se planea un túnel o se busca la entrada de una cueva— y el ×6 es
 * para mirar de cerca lo que uno está construyendo, o para jugar en una
 * pantalla pequeña sin dejarse los ojos.
 *
 * El automático sigue siendo el de por defecto: acierta en casi todas las
 * pantallas, y quien no toque esto no debería notar que existe.
 */
export const ZOOMS: readonly { valor: number; nombre: string }[] = [
  { valor: 0, nombre: 'automático' },
  { valor: 1, nombre: '×1 · se ve todo' },
  { valor: 2, nombre: '×2' },
  { valor: 3, nombre: '×3' },
  { valor: 4, nombre: '×4' },
  { valor: 5, nombre: '×5' },
  { valor: 6, nombre: '×6 · muy cerca' },
];

const POR_DEFECTO: Preferencias = {
  volumen: 0.55,
  silenciado: false,
  sacudida: true,
  zoom: 0,
  // Por defecto, oscura: es lo que hace que una antorcha valga para algo.
  oscuridad: 1,
  resolucion: 2,
};

function cargar(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...POR_DEFECTO };
    const p = JSON.parse(crudo) as Partial<Preferencias>;
    return {
      volumen: typeof p.volumen === 'number' ? Math.max(0, Math.min(1, p.volumen)) : POR_DEFECTO.volumen,
      silenciado: p.silenciado === true,
      sacudida: p.sacudida !== false,
      zoom: ZOOMS.some((z) => z.valor === p.zoom) ? p.zoom! : POR_DEFECTO.zoom,
      oscuridad: enRango(p.oscuridad, OSCURIDADES.length, POR_DEFECTO.oscuridad),
      resolucion: enRango(p.resolucion, RESOLUCIONES.length, POR_DEFECTO.resolucion),
    };
  } catch {
    // Un localStorage bloqueado no puede tumbar el arranque del juego.
    return { ...POR_DEFECTO };
  }
}

/** Un índice guardado que sigue siendo válido, o el de por defecto. */
function enRango(v: unknown, largo: number, defecto: number): number {
  return typeof v === 'number' && v >= 0 && v < largo ? Math.floor(v) : defecto;
}

function guardar(p: Preferencias): void {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(p));
  } catch {
    /* sin persistencia, pero jugable */
  }
}

const ESTILO = `
#ajustes-boton {
  /* La capa de interfaz no recibe punteros para no robarle el clic al mundo:
     cada control que sí deba responder tiene que reactivarlos por su cuenta. */
  pointer-events: auto;
  position: fixed; left: 14px; bottom: 14px; z-index: 60;
  width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
  background: rgba(13,17,23,.72); border: 1px solid #2b3440; color: #c9d4e0;
  font: 16px/1 ui-monospace, monospace; display: grid; place-items: center;
  transition: background .12s, transform .12s;
}
#ajustes-boton:hover { background: rgba(30,38,48,.9); transform: translateY(-1px); }
#ajustes {
  pointer-events: auto;
  position: fixed; left: 14px; bottom: 56px; z-index: 60; width: 244px;
  background: rgba(13,17,23,.93); border: 1px solid #2b3440; border-radius: 10px;
  padding: 14px; display: none; color: #c9d4e0;
  font: 12px ui-monospace, monospace; backdrop-filter: blur(6px);
  box-shadow: 0 12px 32px rgba(0,0,0,.45);
}
#ajustes.visible { display: block; }
#ajustes h3 {
  margin: 0 0 12px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase;
  color: #e8b64c;
}
#ajustes .fila { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
#ajustes .fila label { flex: 1; }
#ajustes input[type=range] { flex: 1.4; accent-color: #e8b64c; }
#ajustes .valor { width: 34px; text-align: right; color: #8b97a5; }
#ajustes .interruptor {
  cursor: pointer; padding: 3px 10px; border-radius: 6px;
  border: 1px solid #2b3440; background: #171d25; color: #8b97a5;
}
#ajustes .interruptor.on { background: #2a3a2a; border-color: #4c8b3a; color: #b8e0a8; }
#ajustes .pie { color: #6b7684; font-size: 10px; line-height: 1.5; margin-top: 4px; }
#ajustes h3.seccion {
  margin-top: 16px; border-top: 1px solid #222a34; padding-top: 12px; color: #8fb6d6;
}
#ajustes select {
  flex: 1.4; min-width: 0; background: #171d25; color: #c9d4e0;
  border: 1px solid #2b3440; border-radius: 6px; padding: 3px 5px;
  font: 11px ui-monospace, monospace;
}
`;

/** Lo que el render necesita de estos ajustes, ya traducido a números. */
export interface Graficos {
  zoom: number;
  dpr: number;
  oscuridad: number;
}

export interface PanelAjustes {
  alternar(): void;
  cerrar(): void;
  readonly abierto: boolean;
  readonly sacudidaActiva: boolean;
  readonly graficos: Graficos;
  /**
   * Sube o baja un escalón de zoom. Devuelve cómo se llama el que queda.
   *
   * Existe para las teclas `+` y `−`. El zoom es lo único de este panel que se
   * quiere cambiar sin dejar de mirar el mundo —se acerca uno para colocar un
   * bloque y se aleja para ver por dónde sigue el túnel—, y abrir un menú para
   * eso rompe justo lo que se estaba haciendo. Desde el automático, el primer
   * paso salta al escalón que el automático estaba usando, para que no dé un
   * tirón.
   */
  cambiarZoom(delta: number, zoomActual: number): string;
}

export function crearAjustes(
  contenedor: HTMLElement,
  audio: Audio,
  alCambiarGraficos: (g: Graficos) => void = () => {},
): PanelAjustes {
  const prefs = cargar();
  audio.volumen = prefs.volumen;
  audio.silenciado = prefs.silenciado;

  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const boton = document.createElement('button');
  boton.id = 'ajustes-boton';
  boton.textContent = '⚙';
  boton.title = 'Ajustes';

  const panel = document.createElement('div');
  panel.id = 'ajustes';
  panel.innerHTML = `
    <h3>Ajustes</h3>
    <div class="fila">
      <label for="aj-vol">Volumen</label>
      <input id="aj-vol" type="range" min="0" max="100" step="5">
      <span class="valor" id="aj-vol-val"></span>
    </div>
    <div class="fila">
      <label>Sonido</label>
      <span class="interruptor" id="aj-mute"></span>
    </div>
    <div class="fila">
      <label>Sacudida</label>
      <span class="interruptor" id="aj-shake"></span>
    </div>
    <h3 class="seccion">Gráficos</h3>
    <div class="fila">
      <label for="aj-zoom">Zoom</label>
      <select id="aj-zoom">${ZOOMS.map(
        (z) => `<option value="${z.valor}">${z.nombre}</option>`,
      ).join('')}</select>
    </div>
    <div class="fila">
      <label for="aj-osc">Oscuridad</label>
      <select id="aj-osc">${OSCURIDADES.map(
        (o, i) => `<option value="${i}">${o.nombre}</option>`,
      ).join('')}</select>
    </div>
    <div class="fila">
      <label for="aj-res">Resolución</label>
      <select id="aj-res">${RESOLUCIONES.map(
        (r, i) => `<option value="${i}">${r.nombre}</option>`,
      ).join('')}</select>
    </div>
    <div class="pie">El panel de físicas sigue en F4.</div>
  `;

  contenedor.append(boton, panel);

  const rango = panel.querySelector<HTMLInputElement>('#aj-vol')!;
  const valor = panel.querySelector<HTMLElement>('#aj-vol-val')!;
  const mute = panel.querySelector<HTMLElement>('#aj-mute')!;
  const shake = panel.querySelector<HTMLElement>('#aj-shake')!;
  const selZoom = panel.querySelector<HTMLSelectElement>('#aj-zoom')!;
  const selOsc = panel.querySelector<HTMLSelectElement>('#aj-osc')!;
  const selRes = panel.querySelector<HTMLSelectElement>('#aj-res')!;

  function graficos(): Graficos {
    return {
      zoom: prefs.zoom,
      dpr: RESOLUCIONES[prefs.resolucion]!.dpr,
      oscuridad: OSCURIDADES[prefs.oscuridad]!.suelo,
    };
  }

  function pintar(): void {
    rango.value = String(Math.round(prefs.volumen * 100));
    valor.textContent = `${Math.round(prefs.volumen * 100)}%`;
    mute.textContent = prefs.silenciado ? 'apagado' : 'encendido';
    mute.classList.toggle('on', !prefs.silenciado);
    shake.textContent = prefs.sacudida ? 'sí' : 'no';
    shake.classList.toggle('on', prefs.sacudida);
    boton.textContent = prefs.silenciado || prefs.volumen === 0 ? '🔇' : '⚙';
    selZoom.value = String(prefs.zoom);
    selOsc.value = String(prefs.oscuridad);
    selRes.value = String(prefs.resolucion);
  }

  /** Un cambio de gráficos: se guarda, se repinta y se avisa al render. */
  function cambiarGraficos(): void {
    guardar(prefs);
    pintar();
    alCambiarGraficos(graficos());
  }

  selZoom.addEventListener('change', () => {
    prefs.zoom = Number(selZoom.value);
    cambiarGraficos();
  });

  /** Índices de `ZOOMS` que son un zoom fijo, en orden. */
  const escalones = ZOOMS.filter((z) => z.valor > 0);

  function cambiarZoom(delta: number, zoomAuto: number): string {
    // Desde el automático se arranca en el escalón que ya se estaba viendo: si
    // no, pulsar `+` en una pantalla que estaba a ×3 daría un salto a ×2.
    const actual =
      prefs.zoom > 0
        ? escalones.findIndex((z) => z.valor === prefs.zoom)
        : escalones.findIndex((z) => z.valor === zoomAuto);
    const i = Math.max(0, Math.min(escalones.length - 1, (actual < 0 ? 0 : actual) + delta));
    prefs.zoom = escalones[i]!.valor;
    cambiarGraficos();
    return escalones[i]!.nombre;
  }
  selOsc.addEventListener('change', () => {
    prefs.oscuridad = Number(selOsc.value);
    cambiarGraficos();
  });
  selRes.addEventListener('change', () => {
    prefs.resolucion = Number(selRes.value);
    cambiarGraficos();
  });

  rango.addEventListener('input', () => {
    prefs.volumen = Number(rango.value) / 100;
    audio.volumen = prefs.volumen;
    guardar(prefs);
    pintar();
    // Un sonido de muestra al soltar: sin él no hay forma de saber si el nuevo
    // volumen es el que uno quería sin salir a pegarle a algo.
    audio.sonar('recoger');
  });
  mute.addEventListener('click', () => {
    prefs.silenciado = !prefs.silenciado;
    audio.silenciado = prefs.silenciado;
    guardar(prefs);
    pintar();
    if (!prefs.silenciado) audio.sonar('recoger');
  });
  shake.addEventListener('click', () => {
    prefs.sacudida = !prefs.sacudida;
    guardar(prefs);
    pintar();
  });

  boton.addEventListener('click', (e) => {
    e.stopPropagation();
    audio.despertar();
    panel.classList.toggle('visible');
  });

  pintar();

  return {
    alternar: () => panel.classList.toggle('visible'),
    cerrar: () => panel.classList.remove('visible'),
    get abierto() {
      return panel.classList.contains('visible');
    },
    get sacudidaActiva() {
      return prefs.sacudida;
    },
    get graficos() {
      return graficos();
    },
    cambiarZoom,
  };
}

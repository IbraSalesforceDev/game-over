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
}

const POR_DEFECTO: Preferencias = { volumen: 0.55, silenciado: false, sacudida: true };

function cargar(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...POR_DEFECTO };
    const p = JSON.parse(crudo) as Partial<Preferencias>;
    return {
      volumen: typeof p.volumen === 'number' ? Math.max(0, Math.min(1, p.volumen)) : POR_DEFECTO.volumen,
      silenciado: p.silenciado === true,
      sacudida: p.sacudida !== false,
    };
  } catch {
    // Un localStorage bloqueado no puede tumbar el arranque del juego.
    return { ...POR_DEFECTO };
  }
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
  position: fixed; left: 14px; bottom: 14px; z-index: 60;
  width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
  background: rgba(13,17,23,.72); border: 1px solid #2b3440; color: #c9d4e0;
  font: 16px/1 ui-monospace, monospace; display: grid; place-items: center;
  transition: background .12s, transform .12s;
}
#ajustes-boton:hover { background: rgba(30,38,48,.9); transform: translateY(-1px); }
#ajustes {
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
`;

export interface PanelAjustes {
  alternar(): void;
  cerrar(): void;
  readonly abierto: boolean;
  readonly sacudidaActiva: boolean;
}

export function crearAjustes(contenedor: HTMLElement, audio: Audio): PanelAjustes {
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
    <div class="pie">El panel de físicas sigue en F4.</div>
  `;

  contenedor.append(boton, panel);

  const rango = panel.querySelector<HTMLInputElement>('#aj-vol')!;
  const valor = panel.querySelector<HTMLElement>('#aj-vol-val')!;
  const mute = panel.querySelector<HTMLElement>('#aj-mute')!;
  const shake = panel.querySelector<HTMLElement>('#aj-shake')!;

  function pintar(): void {
    rango.value = String(Math.round(prefs.volumen * 100));
    valor.textContent = `${Math.round(prefs.volumen * 100)}%`;
    mute.textContent = prefs.silenciado ? 'apagado' : 'encendido';
    mute.classList.toggle('on', !prefs.silenciado);
    shake.textContent = prefs.sacudida ? 'sí' : 'no';
    shake.classList.toggle('on', prefs.sacudida);
    boton.textContent = prefs.silenciado || prefs.volumen === 0 ? '🔇' : '⚙';
  }

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
  };
}

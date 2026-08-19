import { AJUSTES_POR_DEFECTO, type Ajustes } from '../entities/physics';

/**
 * Panel de constantes de física (F4).
 *
 * Esta es la razón de ser de la fase 1: el "feel" de un Terraria no se acierta
 * leyendo números, se acierta jugando y moviendo sliders. El botón de copiar
 * vuelca el ajuste actual para pegarlo tal cual en AJUSTES_POR_DEFECTO.
 */

interface Campo {
  clave: keyof Ajustes;
  etiqueta: string;
  min: number;
  max: number;
  paso: number;
}

const CAMPOS: Campo[] = [
  { clave: 'gravedad', etiqueta: 'Gravedad', min: 0.05, max: 1.5, paso: 0.01 },
  { clave: 'velTerminal', etiqueta: 'Vel. terminal', min: 2, max: 30, paso: 0.5 },
  { clave: 'aceleracion', etiqueta: 'Aceleración', min: 0.01, max: 0.6, paso: 0.01 },
  { clave: 'velMaxima', etiqueta: 'Vel. máxima', min: 0.5, max: 12, paso: 0.1 },
  { clave: 'friccion', etiqueta: 'Fricción', min: 0.01, max: 1.2, paso: 0.01 },
  { clave: 'controlAereo', etiqueta: 'Control aéreo', min: 0, max: 1, paso: 0.05 },
  { clave: 'impulsoSalto', etiqueta: 'Impulso salto', min: 1, max: 12, paso: 0.01 },
  { clave: 'ticksSaltoSostenido', etiqueta: 'Ticks de salto', min: 0, max: 40, paso: 1 },
  { clave: 'coyote', etiqueta: 'Coyote (ticks)', min: 0, max: 20, paso: 1 },
  { clave: 'bufferSalto', etiqueta: 'Buffer (ticks)', min: 0, max: 20, paso: 1 },
  { clave: 'alturaEscalon', etiqueta: 'Escalón (tiles)', min: 0, max: 3, paso: 0.5 },
];

const ESTILO = `
#panel-ajustes {
  position: fixed; top: 12px; right: 12px; z-index: 50;
  width: 260px; max-height: calc(100vh - 24px); overflow-y: auto;
  padding: 12px; pointer-events: auto;
  background: rgba(13,17,23,0.92); border: 1px solid #2a343f;
  font: 11px ui-monospace, monospace; color: #d8cfc0;
}
#panel-ajustes h2 { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #e8b64c; margin-bottom: 8px; }
#panel-ajustes label { display: block; margin-bottom: 8px; }
#panel-ajustes .fila { display: flex; justify-content: space-between; margin-bottom: 2px; color: #9fb0c0; }
#panel-ajustes input[type=range] { width: 100%; accent-color: #e8b64c; }
#panel-ajustes .botones { display: flex; gap: 6px; margin-top: 4px; }
#panel-ajustes button {
  flex: 1; padding: 5px; cursor: pointer;
  background: #1c242e; color: #d8cfc0; border: 1px solid #38434f;
  font: 11px ui-monospace, monospace;
}
#panel-ajustes button:hover { background: #26313d; }
#panel-ajustes .nota { margin-top: 8px; color: #6d7a8a; line-height: 1.5; }
`;

export interface Tuner {
  alternar(): void;
  readonly visible: boolean;
}

export function crearTuner(contenedor: HTMLElement, ajustes: Ajustes): Tuner {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const panel = document.createElement('div');
  panel.id = 'panel-ajustes';
  panel.style.display = 'none';
  panel.innerHTML = '<h2>Constantes de física</h2>';

  const valores = new Map<keyof Ajustes, HTMLElement>();
  const sliders = new Map<keyof Ajustes, HTMLInputElement>();

  for (const campo of CAMPOS) {
    const label = document.createElement('label');
    const fila = document.createElement('div');
    fila.className = 'fila';
    const nombre = document.createElement('span');
    nombre.textContent = campo.etiqueta;
    const valor = document.createElement('span');
    valor.textContent = String(ajustes[campo.clave]);
    fila.append(nombre, valor);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(campo.min);
    slider.max = String(campo.max);
    slider.step = String(campo.paso);
    slider.value = String(ajustes[campo.clave]);
    slider.addEventListener('input', () => {
      const n = Number(slider.value);
      ajustes[campo.clave] = n;
      valor.textContent = String(n);
    });

    label.append(fila, slider);
    panel.appendChild(label);
    valores.set(campo.clave, valor);
    sliders.set(campo.clave, slider);
  }

  function refrescar(): void {
    for (const campo of CAMPOS) {
      const n = ajustes[campo.clave];
      sliders.get(campo.clave)!.value = String(n);
      valores.get(campo.clave)!.textContent = String(n);
    }
  }

  const botones = document.createElement('div');
  botones.className = 'botones';

  const reiniciar = document.createElement('button');
  reiniciar.textContent = 'Por defecto';
  reiniciar.addEventListener('click', () => {
    Object.assign(ajustes, AJUSTES_POR_DEFECTO);
    refrescar();
  });

  const copiar = document.createElement('button');
  copiar.textContent = 'Copiar';
  copiar.addEventListener('click', () => {
    const texto = JSON.stringify(ajustes, null, 2);
    void navigator.clipboard?.writeText(texto);
    console.info('Ajustes actuales:\n' + texto);
    copiar.textContent = '¡Copiado!';
    setTimeout(() => (copiar.textContent = 'Copiar'), 1200);
  });

  botones.append(reiniciar, copiar);
  panel.appendChild(botones);

  const nota = document.createElement('div');
  nota.className = 'nota';
  nota.textContent =
    'Valores en píxeles por tick (1/60 s). Un tile son 16 px. Copiar vuelca el ajuste a la consola y al portapapeles.';
  panel.appendChild(nota);

  contenedor.appendChild(panel);

  let visible = false;
  return {
    alternar() {
      visible = !visible;
      panel.style.display = visible ? 'block' : 'none';
    },
    get visible() {
      return visible;
    },
  };
}

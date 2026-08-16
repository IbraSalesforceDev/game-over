/**
 * Menú de pausa.
 *
 * Se abre con `Esc` cuando no hay ningún otro panel delante, que es lo que
 * espera cualquiera que venga de otro juego. Hasta ahora `Esc` solo cerraba
 * cosas, y no había ninguna forma de salir de la partida ni de llegar a las
 * opciones sin buscar un botón en una esquina.
 *
 * El juego no se congela por dentro: seguir simulando con el menú abierto haría
 * que un zombi te matara mientras lees. Quien lo abre decide qué hacer con el
 * bucle a través de `alAbrir`/`alCerrar`.
 */

const ESTILO = `
#pausa {
  pointer-events: auto;
  position: fixed; inset: 0; z-index: 85; display: none;
  align-items: center; justify-content: center;
  background: rgba(6,9,13,.78); backdrop-filter: blur(4px);
  font: 12px ui-monospace, monospace; color: #c9d4e0;
}
#pausa.visible { display: flex; }
#pausa .caja {
  width: min(92vw, 340px); padding: 26px 24px; text-align: center;
  background: rgba(13,17,23,.97); border: 1px solid #2b3440; border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0,0,0,.55);
}
#pausa h2 {
  font-size: 13px; letter-spacing: .24em; text-transform: uppercase;
  color: #e8b64c; margin-bottom: 4px;
}
#pausa .mundo { color: #6d7a8a; font-size: 11px; margin-bottom: 22px; }
#pausa button {
  display: block; width: 100%; margin-bottom: 8px; padding: 11px; cursor: pointer;
  background: #1d2530; border: 1px solid #2b3440; border-radius: 7px;
  color: #d8cfc0; font: 11px ui-monospace, monospace; letter-spacing: .1em;
  transition: background .12s, border-color .12s;
}
#pausa button:hover { background: #26303d; border-color: #3d4a58; }
#pausa button.salir { margin-top: 14px; border-color: #4a2a2a; color: #e0a0a0; }
#pausa button.salir:hover { background: #2e1c1c; border-color: #6b3a3a; }
#pausa .pie { color: #4f5b68; font-size: 10px; margin-top: 16px; }
`;

export interface OpcionesPausa {
  /** Nombre del mundo, para que se vea cuál se está dejando. */
  nombre: string;
  alReanudar(): void;
  alAbrirControles(): void;
  alAbrirOpciones(): void;
  /** Guarda y vuelve al menú de mundos. */
  alSalir(): Promise<void> | void;
}

export interface PanelPausa {
  alternar(): void;
  abrir(): void;
  cerrar(): void;
  readonly abierto: boolean;
}

export function crearPausa(contenedor: HTMLElement, op: OpcionesPausa): PanelPausa {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'pausa';
  capa.innerHTML = `
    <div class="caja">
      <h2>Pausa</h2>
      <div class="mundo"></div>
      <button data-accion="reanudar">Seguir jugando</button>
      <button data-accion="controles">Controles</button>
      <button data-accion="opciones">Opciones</button>
      <button class="salir" data-accion="salir">Guardar y salir</button>
      <div class="pie">Esc para volver</div>
    </div>
  `;
  contenedor.appendChild(capa);
  capa.querySelector<HTMLElement>('.mundo')!.textContent = op.nombre;

  const api: PanelPausa = {
    alternar: () => capa.classList.toggle('visible'),
    abrir: () => capa.classList.add('visible'),
    cerrar: () => capa.classList.remove('visible'),
    get abierto() {
      return capa.classList.contains('visible');
    },
  };

  capa.addEventListener('click', (e) => {
    const boton = (e.target as HTMLElement).closest<HTMLElement>('button');
    // Un clic en el fondo también cierra, que es lo que se intenta primero.
    if (!boton) {
      if (e.target === capa) {
        api.cerrar();
        op.alReanudar();
      }
      return;
    }
    switch (boton.dataset.accion) {
      case 'reanudar':
        api.cerrar();
        op.alReanudar();
        break;
      case 'controles':
        api.cerrar();
        op.alAbrirControles();
        break;
      case 'opciones':
        api.cerrar();
        op.alAbrirOpciones();
        break;
      case 'salir':
        boton.textContent = 'Guardando…';
        void Promise.resolve(op.alSalir());
        break;
    }
  });

  return api;
}

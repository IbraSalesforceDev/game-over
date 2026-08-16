import { defObjeto, IDS_OBJETO, NADA } from '../items/items';
import { crearIconos, LADO_ICONO } from '../render/iconos';
import type { Especie } from '../entities/enemies';
import { ENEMIGOS } from '../entities/enemies';

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
}

export function crearTrucos(): TrucosDebug {
  return {
    velocidadMinado: 1,
    radioMinado: 1,
    volar: false,
    danoMultiplicador: 1,
    invulnerable: false,
  };
}

export interface OpcionesDebugMenu {
  trucos: TrucosDebug;
  darObjeto(objeto: number, cantidad: number): void;
  generarCriatura(especie: Especie): void;
  rellenarVida(): void;
  establecerVidaMaxima(v: number): void;
  vidaMaximaActual(): number;
}

const ESTILO = `
#depuracion {
  pointer-events: auto;
  position: fixed; right: 14px; top: 14px; z-index: 95; width: min(94vw, 330px);
  max-height: 88vh; overflow-y: auto; display: none; padding: 14px;
  background: rgba(10,13,18,.97); border: 1px solid #48354f; border-radius: 10px;
  font: 11px ui-monospace, monospace; color: #cfc4d8;
  box-shadow: 0 18px 44px rgba(0,0,0,.6);
}
#depuracion.visible { display: block; }
#depuracion h3 {
  font-size: 10px; letter-spacing: .18em; text-transform: uppercase;
  color: #c08fd8; margin-bottom: 10px;
}
#depuracion h4 {
  font-size: 9px; letter-spacing: .16em; text-transform: uppercase;
  color: #7a6a86; margin: 14px 0 6px; border-top: 1px solid #241c2a; padding-top: 10px;
}
#depuracion h4:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
#depuracion .fila { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
#depuracion .fila label { flex: 1; color: #9a8ea6; }
#depuracion select, #depuracion input[type=number] {
  background: #171320; color: #cfc4d8; border: 1px solid #38304a; border-radius: 5px;
  padding: 4px 6px; font: 11px ui-monospace, monospace; min-width: 0;
}
#depuracion select { flex: 2; }
#depuracion input[type=number] { width: 66px; }
#depuracion input[type=range] { flex: 2; accent-color: #c08fd8; }
#depuracion .valor { width: 40px; text-align: right; color: #7a6a86; }
#depuracion button {
  padding: 5px 9px; cursor: pointer; border-radius: 5px;
  background: #241c2e; border: 1px solid #38304a; color: #cfc4d8;
  font: 11px ui-monospace, monospace;
}
#depuracion button:hover { background: #302640; }
#depuracion .interruptor { cursor: pointer; padding: 3px 10px; border-radius: 5px;
  border: 1px solid #38304a; background: #171320; color: #7a6a86; }
#depuracion .interruptor.on { background: #2a3a2a; border-color: #4c8b3a; color: #b8e0a8; }
#depuracion .pie { color: #5a4f66; font-size: 9px; margin-top: 12px; line-height: 1.5; }

/* La puerta: una sola línea con un campo. Del panel de detrás no se enseña
   nada —ni los títulos ni los controles— hasta que la contraseña es correcta. */
#depuracion-puerta {
  pointer-events: auto;
  position: fixed; right: 14px; top: 14px; z-index: 96; display: none;
  width: min(94vw, 330px); padding: 14px;
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

export interface PanelDebug {
  alternar(): void;
  cerrar(): void;
  readonly abierto: boolean;
  /** ¿Se ha metido ya la contraseña en esta sesión? */
  readonly desbloqueado: boolean;
}

export function crearDebugMenu(contenedor: HTMLElement, op: OpcionesDebugMenu): PanelDebug {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);
  const iconos = crearIconos();

  const panel = document.createElement('div');
  panel.id = 'depuracion';

  const objetos = IDS_OBJETO.filter((id) => id !== NADA);
  const opcionesObjeto = objetos
    .map((id) => `<option value="${id}">${defObjeto(id).nombre}</option>`)
    .join('');
  const especies = Object.keys(ENEMIGOS) as Especie[];
  const opcionesEspecie = especies
    .map((e) => `<option value="${e}">${ENEMIGOS[e].nombre}</option>`)
    .join('');

  panel.innerHTML = `
    <h3>Depuración</h3>

    <h4>Objetos</h4>
    <div class="fila">
      <canvas id="dbg-icono" width="${LADO_ICONO}" height="${LADO_ICONO}"
        style="width:24px;height:24px;image-rendering:pixelated"></canvas>
      <select id="dbg-objeto">${opcionesObjeto}</select>
    </div>
    <div class="fila">
      <input id="dbg-cantidad" type="number" min="1" max="999" value="10">
      <button id="dbg-dar" style="flex:1">Dar</button>
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

    <h4>Jugador</h4>
    <div class="fila">
      <label>Volar</label>
      <span class="interruptor" id="dbg-volar">no</span>
    </div>
    <div class="fila">
      <label>Invulnerable</label>
      <span class="interruptor" id="dbg-invuln">no</span>
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
    </div>

    <h4>Criaturas</h4>
    <div class="fila">
      <select id="dbg-especie">${opcionesEspecie}</select>
      <button id="dbg-generar">Generar</button>
    </div>

    <div class="pie">P + F3 para abrir y cerrar. No aparece en los controles.</div>
  `;
  contenedor.appendChild(panel);

  const $ = <T extends HTMLElement>(id: string): T => panel.querySelector<T>(`#${id}`)!;
  const selObjeto = $<HTMLSelectElement>('dbg-objeto');
  const iconoObjeto = $<HTMLCanvasElement>('dbg-icono');
  const cantidad = $<HTMLInputElement>('dbg-cantidad');
  const vel = $<HTMLInputElement>('dbg-vel');
  const velVal = $('dbg-vel-val');
  const area = $<HTMLSelectElement>('dbg-area');
  const volar = $('dbg-volar');
  const invuln = $('dbg-invuln');
  const dano = $<HTMLInputElement>('dbg-dano');
  const danoVal = $('dbg-dano-val');
  const vidaMax = $<HTMLInputElement>('dbg-vidamax');
  const selEspecie = $<HTMLSelectElement>('dbg-especie');

  function pintarIcono(): void {
    iconos.pintarEn(iconoObjeto, Number(selObjeto.value));
  }
  pintarIcono();
  vidaMax.value = String(op.vidaMaximaActual());

  selObjeto.addEventListener('change', pintarIcono);
  $('dbg-dar').addEventListener('click', () => {
    op.darObjeto(Number(selObjeto.value), Math.max(1, Number(cantidad.value) || 1));
  });
  vel.addEventListener('input', () => {
    op.trucos.velocidadMinado = Number(vel.value);
    velVal.textContent = `×${vel.value}`;
  });
  area.addEventListener('change', () => {
    op.trucos.radioMinado = Number(area.value);
  });
  volar.addEventListener('click', () => {
    op.trucos.volar = !op.trucos.volar;
    volar.textContent = op.trucos.volar ? 'sí' : 'no';
    volar.classList.toggle('on', op.trucos.volar);
  });
  invuln.addEventListener('click', () => {
    op.trucos.invulnerable = !op.trucos.invulnerable;
    invuln.textContent = op.trucos.invulnerable ? 'sí' : 'no';
    invuln.classList.toggle('on', op.trucos.invulnerable);
  });
  dano.addEventListener('input', () => {
    op.trucos.danoMultiplicador = Number(dano.value);
    danoVal.textContent = `×${dano.value}`;
  });
  $('dbg-aplicar-vida').addEventListener('click', () => {
    op.establecerVidaMaxima(Math.max(20, Number(vidaMax.value) || 100));
  });
  $('dbg-curar').addEventListener('click', () => op.rellenarVida());
  $('dbg-generar').addEventListener('click', () => {
    op.generarCriatura(selEspecie.value as Especie);
  });

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
    panel.classList.add('visible');
  }

  puerta.querySelector('#dbg-entrar')!.addEventListener('click', probar);
  clave.addEventListener('keydown', (e) => {
    // El campo se traga las teclas: escribiendo la contraseña no se debe andar
    // ni saltar por el mundo de detrás.
    e.stopPropagation();
    if (e.key === 'Enter') probar();
    if (e.key === 'Escape') cerrarTodo();
  });
  clave.addEventListener('keyup', (e) => e.stopPropagation());
  clave.addEventListener('input', () => clave.classList.remove('mal'));

  return {
    alternar() {
      if (desbloqueado) {
        panel.classList.toggle('visible');
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
  };
}

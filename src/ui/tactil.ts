import type { GestorEntrada } from '../engine/input';
import { direccionJoystick } from '../engine/gesto';

/**
 * Los controles de la pantalla táctil.
 *
 * Solo se ven con la clase `tactil` en el `<html>` (ver `engine/dispositivo.ts`):
 * en escritorio existen igual, escondidos, y así cambiar de modo en los ajustes
 * no obliga a montar ni desmontar nada.
 *
 * ## Dónde va cada cosa, y por qué
 *
 * El móvil se juega en horizontal y con los dos pulgares en las esquinas de
 * abajo, así que lo que se usa todo el rato va ahí y lo demás se aparta:
 *
 * - **Abajo a la izquierda, el joystick.** Aparece donde se apoya el pulgar en
 *   vez de estar fijo: no hay que buscarlo, y cada mano lo pone a su altura.
 * - **Abajo a la derecha, saltar.** Grande, porque se pulsa sin mirar.
 * - **En el borde derecho, tres botones**: mochila abajo —es el que más se
 *   usa, y queda más cerca del pulgar—, «más» y pausa arriba.
 * - **Todo lo demás —mapa, capa, poder, duelo, zoom— dentro de «más».** Son
 *   cosas que se usan de vez en cuando, y cada botón permanente es un trozo de
 *   mundo tapado.
 *
 * El resto de la pantalla es el mundo: tocarlo usa lo que llevas en la mano
 * (ver `engine/gesto.ts`). Eso lo atiende el puntero, no esta capa.
 *
 * Los botones no hacen nada por sí mismos: pulsan el atajo de teclado que ya
 * existe (`entrada.pulsar`). Así «abrir el inventario» sigue viviendo en un solo
 * sitio, y un botón de la pantalla no puede hacer algo distinto de su tecla.
 */

/** Radio del joystick, en píxeles CSS. Lo que recorre el pulgar a tope. */
const RADIO = 46;

const ESTILO = `
/* --- Lo que cambia en modo táctil en el resto de la interfaz --------------
   Está aquí todo junto para que se vea de un vistazo qué es distinto entre
   móvil y escritorio, en vez de repartido por diez ficheros. */
html.tactil #ajustes-boton, html.tactil #ayuda-boton { display: none; }
html.tactil .ranura .tecla { display: none; }
html.tactil #pausa .pie { display: none; }
/* El iPhone en horizontal tiene la isla o la muesca en un lado y las esquinas
   redondeadas: lo pegado al borde queda debajo. Las zonas seguras lo apartan. */
html.tactil #vida, html.tactil #hambre, html.tactil #aliento, html.tactil #aviso {
  right: calc(14px + env(safe-area-inset-right));
}
html.tactil #estados { right: calc(76px + env(safe-area-inset-right)); }
html.tactil #acompanados, html.tactil #suceso {
  left: calc(14px + env(safe-area-inset-left));
}
html.tactil #brujula {
  left: calc(14px + env(safe-area-inset-left)); bottom: auto; top: 42%;
}
html.tactil #ajustes {
  left: calc(14px + env(safe-area-inset-left)); bottom: 12px;
  max-height: calc(100dvh - 24px); overflow-y: auto;
}

/* La mochila. En escritorio va el inventario en el centro, el equipo a su
   izquierda y la fabricación pegada al borde derecho, y en un móvil en
   horizontal eso no cabe: la fabricación tapaba las dos últimas columnas. Aquí
   las ranuras bajan de 42 a 36 px y los tres paneles se colocan en fila desde
   la izquierda —equipo, inventario, fabricación—, que es lo justo para que
   quepan en un iPhone con la isla a un lado. */
html.tactil .rejilla .ranura, html.tactil #equipo .ranura { width: 36px; height: 36px; }
html.tactil .rejilla { grid-template-columns: repeat(10, 36px); padding: 6px; }
html.tactil #equipo {
  right: auto; margin-right: 0; left: calc(8px + env(safe-area-inset-left)); padding: 6px;
}
html.tactil #inventario, html.tactil #cofre {
  left: calc(96px + env(safe-area-inset-left)); transform: none;
}
/* El cofre, encima del inventario y no a 300 px del suelo, que en un móvil en
   horizontal es por encima del borde de la pantalla. */
html.tactil #cofre { bottom: auto; top: 8px; }
/* La fabricación, y también el taller de una estación: en escritorio el
   taller sale grande en el centro, por encima de la mochila, y en un móvil en
   horizontal eso dejaba tres recetas a la vista. Aquí va en la columna de la
   derecha, de arriba abajo, con una receta por fila. */
html.tactil #crafteo, html.tactil #crafteo.taller {
  left: calc(514px + env(safe-area-inset-left)); right: calc(8px + env(safe-area-inset-right));
  transform: none; top: auto; width: auto;
  /* Por encima del botón «Cerrar», que ocupa la esquina de saltar, y por
     debajo de la vida y el hambre, que no se tapan nunca: se puede estar en
     la mochila con un zombi pegando. */
  bottom: 108px; max-height: calc(100dvh - 168px);
}
html.tactil #crafteo.taller .lista { grid-template-columns: 1fr; }
/* Con la mochila abierta, los botones del borde y el de saltar quedan debajo
   de la fabricación. Se apartan, y en el sitio de saltar sale «Cerrar»: el
   pulgar ya sabe dónde está esa esquina. */
html.tactil body:has(#inventario.abierto) #tactil .columna,
html.tactil body:has(#inventario.abierto) #tactil .saltar { display: none; }
html.tactil body:has(#inventario.abierto) #tactil .cerrar { display: grid; }

#tactil { display: none; }
html.tactil #tactil { display: block; }

#tactil .zona {
  pointer-events: auto; touch-action: none;
  position: fixed; left: 0; bottom: 0; z-index: 30;
  width: calc(190px + env(safe-area-inset-left)); height: 56%;
}
#tactil .base, #tactil .mando {
  position: fixed; border-radius: 50%; pointer-events: none;
  transform: translate(-50%, -50%);
}
#tactil .base {
  width: ${RADIO * 2}px; height: ${RADIO * 2}px;
  background: rgba(13,17,23,.28); border: 2px solid rgba(201,212,224,.22);
  transition: opacity .15s;
}
#tactil .mando {
  width: 42px; height: 42px;
  background: rgba(201,212,224,.30); border: 2px solid rgba(201,212,224,.5);
}
/* Sin pulgar, el joystick se queda donde suele estar y casi transparente: es
   el aviso de que ahí hay algo, sin tapar el mundo. */
#tactil.quieto .base { opacity: .55; }
#tactil.quieto .mando { opacity: .4; }

#tactil .boton {
  pointer-events: auto; touch-action: none; position: fixed; z-index: 45;
  display: grid; place-items: center; border-radius: 50%;
  background: rgba(13,17,23,.62); border: 1px solid #3a4553; color: #d8cfc0;
  font: 10px ui-monospace, monospace; letter-spacing: .06em;
  -webkit-tap-highlight-color: transparent;
}
#tactil .boton.apretado { background: rgba(232,182,76,.32); border-color: #e8b64c; }
#tactil .saltar {
  width: 78px; height: 78px; font-size: 11px; letter-spacing: .1em;
  right: calc(22px + env(safe-area-inset-right)); bottom: 22px;
}
#tactil .cerrar {
  display: none; width: 78px; height: 78px; font-size: 11px; letter-spacing: .1em;
  right: calc(22px + env(safe-area-inset-right)); bottom: 22px;
  border-color: #6a5426; color: #e8b64c;
}
#tactil .columna {
  position: fixed; z-index: 45; display: flex; flex-direction: column; gap: 8px;
  right: calc(14px + env(safe-area-inset-right)); top: 50%; transform: translateY(-62%);
}
#tactil .columna .boton { position: static; width: 48px; height: 48px; }

#tactil .mas {
  pointer-events: auto; position: fixed; z-index: 70; display: none;
  right: calc(74px + env(safe-area-inset-right)); top: 50%; transform: translateY(-50%);
  grid-template-columns: repeat(3, 92px); gap: 6px; padding: 10px;
  background: rgba(13,17,23,.94); border: 1px solid #2b3440; border-radius: 12px;
  box-shadow: 0 16px 40px rgba(0,0,0,.5);
}
#tactil .mas.visible { display: grid; }
#tactil .mas button {
  height: 44px; border-radius: 8px; padding: 0 6px;
  background: #1a212b; border: 1px solid #2b3440; color: #d8cfc0;
  font: 10px ui-monospace, monospace; touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
#tactil .mas button:active { background: #26303d; }

#girar {
  display: none; position: fixed; inset: 0; z-index: 95;
  align-items: center; justify-content: center; flex-direction: column; gap: 14px;
  background: #0d1117; color: #c9d4e0; text-align: center; padding: 24px;
  font: 12px ui-monospace, monospace; pointer-events: auto;
}
#girar .icono {
  width: 46px; height: 76px; border: 3px solid #e8b64c; border-radius: 8px;
  animation: girar 2.4s ease-in-out infinite;
}
#girar strong { color: #e8b64c; letter-spacing: .16em; text-transform: uppercase; }
@keyframes girar { 0%, 30% { transform: rotate(0); } 60%, 100% { transform: rotate(-90deg); } }
@media (orientation: portrait) {
  html.tactil #girar { display: flex; }
}
`;

export interface OpcionesTactil {
  entrada: GestorEntrada;
  /** Abrir el panel de ajustes, que no tiene tecla propia. */
  abrirAjustes(): void;
  /** El móvil se ha puesto en vertical (o ha vuelto). El juego decide si pausa. */
  alGirar?(vertical: boolean): void;
}

export interface ControlesTactiles {
  /** Cierra el menú «más», si está abierto. */
  cerrarMas(): void;
  readonly masAbierto: boolean;
}

/** Lo que hay dentro de «más». Cada uno pulsa su tecla, o hace lo suyo. */
const MAS: readonly { texto: string; tecla?: string; ajustes?: true }[] = [
  { texto: 'Mapa', tecla: 'KeyM' },
  { texto: 'Bloque / pared', tecla: 'Tab' },
  { texto: 'Poder', tecla: 'KeyQ' },
  { texto: 'Acercar', tecla: 'Equal' },
  { texto: 'Alejar', tecla: 'Minus' },
  { texto: 'Duelo', tecla: 'KeyG' },
  { texto: 'Controles', tecla: 'KeyH' },
  { texto: 'Ajustes', ajustes: true },
  { texto: 'Al inicio', tecla: 'KeyR' },
];

export function crearTactil(contenedor: HTMLElement, op: OpcionesTactil): ControlesTactiles {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const raiz = document.createElement('div');
  raiz.id = 'tactil';
  raiz.className = 'quieto';

  // --- Joystick ---
  const zona = document.createElement('div');
  zona.className = 'zona';
  const base = document.createElement('div');
  base.className = 'base';
  const mando = document.createElement('div');
  mando.className = 'mando';

  // --- Botones ---
  const saltar = boton('Saltar', 'saltar');
  const cerrar = boton('Cerrar', 'cerrar');
  const columna = document.createElement('div');
  columna.className = 'columna';
  const pausa = boton('Pausa');
  const mas = boton('Más');
  const mochila = boton('Mochila');
  columna.append(pausa, mas, mochila);

  const menuMas = document.createElement('div');
  menuMas.className = 'mas';
  for (const m of MAS) {
    const b = document.createElement('button');
    b.textContent = m.texto;
    b.addEventListener('click', () => {
      menuMas.classList.remove('visible');
      if (m.ajustes) op.abrirAjustes();
      else if (m.tecla) op.entrada.pulsar(m.tecla);
    });
    menuMas.appendChild(b);
  }

  const girar = document.createElement('div');
  girar.id = 'girar';
  girar.innerHTML =
    '<div class="icono"></div><strong>Gira el móvil</strong><div>Se juega en horizontal.</div>';

  raiz.append(zona, base, mando, saltar, cerrar, columna, menuMas);
  contenedor.append(raiz, girar);

  function boton(texto: string, clase = ''): HTMLDivElement {
    const b = document.createElement('div');
    b.className = `boton ${clase}`.trim();
    b.textContent = texto;
    return b;
  }

  // --- El joystick, por dentro ---
  let dedoJoystick: number | null = null;
  let cx = 0;
  let cy = 0;

  /**
   * Donde descansa sin pulgar: abajo a la izquierda, dentro de la zona.
   *
   * Se mide la zona en vez de calcularlo a mano porque su borde izquierdo lleva
   * dentro la zona segura del iPhone, que desde aquí no se puede leer.
   */
  function colocarEnReposo(): void {
    const r = zona.getBoundingClientRect();
    if (r.width === 0) return; // escondida: modo escritorio
    const x = r.right - 156 + RADIO;
    const y = r.bottom - 30 - RADIO;
    poner(base, x, y);
    poner(mando, x, y);
    raiz.classList.add('quieto');
  }

  function poner(el: HTMLElement, x: number, y: number): void {
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  function mover(x: number, y: number): void {
    let dx = x - cx;
    let dy = y - cy;
    const largo = Math.hypot(dx, dy);
    if (largo > RADIO) {
      dx = (dx / largo) * RADIO;
      dy = (dy / largo) * RADIO;
    }
    poner(mando, cx + dx, cy + dy);
    const d = direccionJoystick(dx, dy, RADIO);
    op.entrada.fijar('izq', d.izq);
    op.entrada.fijar('der', d.der);
    op.entrada.fijar('abajo', d.abajo);
  }

  function soltarJoystick(): void {
    dedoJoystick = null;
    op.entrada.fijar('izq', false);
    op.entrada.fijar('der', false);
    op.entrada.fijar('abajo', false);
    colocarEnReposo();
  }

  zona.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (dedoJoystick !== null) return;
    dedoJoystick = e.pointerId;
    zona.setPointerCapture(e.pointerId);
    // El centro va donde cae el pulgar, pero sin que el círculo se salga de la
    // pantalla: un joystick cortado por el borde no deja empujar hacia ese lado.
    cx = Math.max(RADIO + 6, e.clientX);
    cy = Math.min(window.innerHeight - RADIO - 6, e.clientY);
    poner(base, cx, cy);
    raiz.classList.remove('quieto');
    mover(e.clientX, e.clientY);
  });
  zona.addEventListener('pointermove', (e) => {
    if (e.pointerId === dedoJoystick) mover(e.clientX, e.clientY);
  });
  for (const evento of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    zona.addEventListener(evento, (e) => {
      if (e.pointerId === dedoJoystick) soltarJoystick();
    });
  }

  // --- Saltar: mantener salta más alto, igual que la tecla ---
  let dedoSalto: number | null = null;
  saltar.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dedoSalto = e.pointerId;
    saltar.setPointerCapture(e.pointerId);
    saltar.classList.add('apretado');
    op.entrada.fijar('salto', true);
  });
  for (const evento of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    saltar.addEventListener(evento, (e) => {
      if (e.pointerId !== dedoSalto) return;
      dedoSalto = null;
      saltar.classList.remove('apretado');
      op.entrada.fijar('salto', false);
    });
  }

  // --- Los tres botones del borde ---
  // Van con `pointerdown` y no con `click`: el clic llega al levantar el dedo,
  // y un botón de juego que responde tarde se siente roto.
  const pulsarCon = (el: HTMLElement, fn: () => void): void => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  };
  pulsarCon(mochila, () => {
    menuMas.classList.remove('visible');
    op.entrada.pulsar('KeyE');
  });
  pulsarCon(pausa, () => {
    menuMas.classList.remove('visible');
    op.entrada.pulsar('Escape');
  });
  pulsarCon(mas, () => menuMas.classList.toggle('visible'));
  pulsarCon(cerrar, () => op.entrada.pulsar('KeyE'));

  // Tocar fuera del menú «más» lo cierra, que es lo que se intenta primero. Va
  // en la fase de captura y se queda el toque: si llegara al mundo, el mismo
  // dedo que cierra el menú pondría un bloque donde no se quería.
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!menuMas.classList.contains('visible')) return;
      const t = e.target as Node | null;
      if (t && (menuMas.contains(t) || mas.contains(t))) return;
      menuMas.classList.remove('visible');
      e.stopPropagation();
      e.preventDefault();
    },
    true,
  );

  // --- El iPhone y sus gestos ---
  // Safari en iPhone hace zoom pellizcando aunque la página diga que no, por
  // accesibilidad. En un juego, pellizcar es poner dos dedos a la vez, y eso
  // pasa cada vez que se anda y se salta: se anula aquí.
  for (const evento of ['gesturestart', 'gesturechange', 'gestureend'] as const) {
    document.addEventListener(evento, (e) => e.preventDefault(), { passive: false });
  }

  // --- Girar ---
  const vertical = matchMedia('(orientation: portrait)');
  vertical.addEventListener('change', () => {
    if (!document.documentElement.classList.contains('tactil')) return;
    // Al girar, la zona cambia de tamaño: el joystick vuelve a su sitio.
    if (dedoJoystick !== null) soltarJoystick();
    else colocarEnReposo();
    op.alGirar?.(vertical.matches);
  });
  // Cualquier cambio de tamaño de la zona —girar, cambiar a modo táctil desde
  // los ajustes, que la barra de Safari aparezca— lo devuelve a su sitio.
  new ResizeObserver(() => {
    if (dedoJoystick === null) colocarEnReposo();
  }).observe(zona);

  return {
    cerrarMas: () => menuMas.classList.remove('visible'),
    get masAbierto() {
      return menuMas.classList.contains('visible');
    },
  };
}

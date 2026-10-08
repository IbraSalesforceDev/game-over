/**
 * Panel de ayuda con los controles.
 *
 * Hasta ahora los controles solo estaban en el README, que es exactamente el
 * sitio donde no está quien acaba de abrir el juego. Se muestra solo la primera
 * vez que se juega en este navegador y luego queda detrás de la tecla `H`: un
 * panel que hay que cerrar en cada partida estorba desde la segunda.
 */

import type { ModoControl } from '../engine/dispositivo';

const CLAVE_VISTA = 'game-over:ayuda-vista';

interface Grupo {
  titulo: string;
  filas: [string, string][];
}

const GRUPOS: Grupo[] = [
  {
    titulo: 'Moverse',
    filas: [
      ['A D  ←→', 'Andar'],
      ['W ↑ Espacio', 'Saltar — mantener salta más alto'],
      ['S ↓ + salto', 'Bajar por una plataforma'],
      ['Espacio (en agua)', 'Nadar hacia arriba'],
    ],
  },
  {
    titulo: 'Actuar',
    filas: [
      ['Clic izq.', 'Minar · golpear con arma · llenar cubo'],
      ['Clic der.', 'Colocar · abrir cofre · vaciar cubo · comer'],
      ['Ratón', 'Apunta el mandoble: al lado, arriba o abajo'],
      ['Pico', 'Cada bloque pide su nivel: piedra → madera, oro → hierro'],
      ['Cristal de vida', 'Brilla en las cuevas · clic der. sube un corazón'],
      ['Armadura', 'Se pone en los tres huecos de la izquierda del inventario'],
      ['Arco', 'Clic izq. dispara hacia el ratón · gasta una flecha'],
      ['Pala', 'Vuela cavando tierra, arena y nieve · fatal con la piedra'],
      ['Azada', 'Clic der. sobre hierba o tierra: la deja labrada'],
      ['Caña', 'Crece en las orillas · 3 caña → papel · 2 papel → mapa'],
      ['Biomas', 'Cada uno tira de un metal: cobre, hierro, plata y oro'],
      ['Lava', 'Quema a todos · el agua la apaga y deja obsidiana · y sales ardiendo'],
      ['Caldero', 'La cuarta estación · ahí se preparan las pociones'],
      ['Bichos', 'Algunos lanzan cosas · ponerse detrás de algo los para'],
      ['Pociones', 'Clic der. para beber · lo que llevas puesto sale a la derecha'],
      ['Semillas', 'Salen de segar hierba · clic der. sobre tierra labrada'],
      ['Cama', 'Clic der. de noche: se duerme hasta el amanecer'],
      ['Brújula', 'Llevándola, la aguja y el mapa señalan las estructuras'],
      ['Fortaleza', 'De ladrillo, en la caverna · dentro está el altar'],
      ['Altar', 'Clic der. con la ofrenda: despierta al guardián'],
      ['Ídolos', 'Se preparan en el caldero · clic der. en su bioma: sale su jefe'],
      ['Inscripción', 'El equipo de jefe lleva una · se lee pasando el ratón'],
      ['Reliquia', 'La suelta cualquier hostil · es lo que pide el altar'],
      ['Reliquias de bioma', 'Una por jefe, del arma que suelta · las seis abren el final'],
      ['Placas', 'El trofeo de un jefe se cuelga en la pared · alumbra un poco'],
      ['Ratón encima', 'Pásalo por una ranura y sale la ficha del objeto'],
      ['1 – 0 · rueda', 'Elegir ranura'],
      ['Tab', 'Cambiar entre bloque y pared'],
    ],
  },
  {
    titulo: 'Paneles',
    filas: [
      ['E', 'Inventario, equipo y fabricación'],
      ['M', 'Mapa — hace falta llevar uno encima'],
      ['+ −', 'Acercar y alejar la cámara'],
      ['Q', 'El poder del peto de jefe, si llevas uno puesto'],
      ['G', 'Duelo: acompañado y de dificultad normal en adelante'],
      ['H', 'Esta ayuda'],
      ['⚙', 'Ajustes: volumen, zoom, oscuridad y resolución'],
      ['Esc', 'Cerrar paneles · menú de pausa'],
      ['R', 'Volver al punto de aparición'],
      ['F2', 'Guardar ahora'],
      ['F3', 'Coordenadas'],
      ['F6', 'Diagnóstico completo'],
    ],
  },
];

/**
 * Los mismos controles, para el dedo.
 *
 * Es una lista aparte y no la de escritorio con las palabras cambiadas: «clic
 * derecho» no se traduce a nada, porque con el dedo no hay dos botones sino lo
 * que llevas en la mano. Los consejos que no hablan de controles —los biomas,
 * la lava, el altar— están repetidos a propósito, con el verbo cambiado donde
 * hacía falta; separarlos en una tercera lista compartida obligaría a leer tres
 * sitios para entender una ayuda que cabe en una pantalla.
 */
const GRUPOS_TACTIL: Grupo[] = [
  {
    titulo: 'Moverse',
    filas: [
      ['Joystick', 'Andar · apoya el pulgar abajo a la izquierda, donde quieras'],
      ['Saltar', 'Mantener salta más alto · en el agua, nada hacia arriba'],
      ['Abajo + saltar', 'Bajar por una plataforma'],
    ],
  },
  {
    titulo: 'Tocar el mundo',
    filas: [
      ['Lo que llevas', 'Decide qué pasa al tocar: no hay botón izquierdo ni derecho'],
      ['Pico o pala', 'Mantén el dedo para picar · arrástralo para seguir'],
      ['Un bloque', 'Toca donde lo quieras poner'],
      ['Un arma', 'Toca hacia donde golpear: a un lado, arriba o abajo'],
      ['Arco', 'Toca hacia donde disparar · gasta una flecha'],
      ['Comida, poción', 'Toca en cualquier sitio y te la tomas'],
      ['Cubo', 'Toca el agua para llenarlo, y donde quieras vaciarlo'],
      ['Cofre, mesa, cama', 'Un toque abre · mantener el dedo rompe'],
      ['Barra de abajo', 'Toca una ranura para llevar eso en la mano'],
      ['Mochila', 'Toca un objeto para cogerlo y otra ranura para dejarlo'],
      ['Armadura', 'Se pone en los tres huecos de la izquierda de la mochila'],
    ],
  },
  {
    titulo: 'Botones',
    filas: [
      ['Mochila', 'Inventario, equipo y fabricación'],
      ['Más', 'Mapa · bloque o pared · poder · zoom · duelo · ajustes'],
      ['Pausa', 'Menú de pausa · también cierra lo que haya abierto'],
      ['iPhone', 'Compartir → Añadir a pantalla de inicio: se juega sin barras'],
    ],
  },
  {
    titulo: 'Para no perderse',
    filas: [
      ['Pico', 'Cada bloque pide su nivel: piedra → madera, oro → hierro'],
      ['Cristal de vida', 'Brilla en las cuevas · tócalo llevándolo y sube un corazón'],
      ['Pala', 'Vuela cavando tierra, arena y nieve · fatal con la piedra'],
      ['Azada', 'Toca hierba o tierra: la deja labrada'],
      ['Semillas', 'Salen de segar hierba · toca sobre tierra labrada'],
      ['Caña', 'Crece en las orillas · 3 caña → papel · 2 papel → mapa'],
      ['Biomas', 'Cada uno tira de un metal: cobre, hierro, plata y oro'],
      ['Lava', 'Quema a todos · el agua la apaga y deja obsidiana'],
      ['Caldero', 'La cuarta estación · ahí se preparan las pociones'],
      ['Bichos', 'Algunos lanzan cosas · ponerse detrás de algo los para'],
      ['Cama', 'De noche: se duerme hasta el amanecer'],
      ['Brújula', 'Llevándola, la aguja y el mapa señalan las estructuras'],
      ['Fortaleza', 'De ladrillo, en la caverna · dentro está el altar'],
      ['Altar', 'Tócalo con la ofrenda: despierta al guardián'],
      ['Ídolos', 'Se preparan en el caldero · tócalos en su bioma: sale su jefe'],
      ['Reliquia', 'La suelta cualquier hostil · es lo que pide el altar'],
      ['Reliquias de bioma', 'Una por jefe, del arma que suelta · las seis abren el final'],
    ],
  },
];

const ESTILO = `
#ayuda {
  pointer-events: auto;
  position: fixed; inset: 0; z-index: 80; display: none;
  align-items: center; justify-content: center;
  background: rgba(6,9,13,.72); backdrop-filter: blur(3px);
  font: 12px ui-monospace, monospace; color: #c9d4e0;
}
#ayuda.visible { display: flex; }
#ayuda .caja {
  width: min(92vw, 620px); max-height: 86vh; overflow: auto;
  background: rgba(13,17,23,.97); border: 1px solid #2b3440; border-radius: 12px;
  padding: 22px 24px; box-shadow: 0 24px 60px rgba(0,0,0,.55);
}
#ayuda h2 {
  font-size: 13px; letter-spacing: .2em; text-transform: uppercase;
  color: #e8b64c; margin-bottom: 4px;
}
#ayuda .sub { color: #6d7a8a; font-size: 11px; margin-bottom: 18px; }
#ayuda h3 {
  font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  color: #7f8c9b; margin: 16px 0 8px; border-top: 1px solid #1f2731; padding-top: 12px;
}
#ayuda h3:first-of-type { border-top: 0; padding-top: 0; margin-top: 0; }
#ayuda .fila { display: flex; gap: 14px; padding: 3px 0; align-items: baseline; }
#ayuda kbd {
  flex: none; min-width: 132px; color: #e8d9b0;
  font: 11px ui-monospace, monospace;
}
#ayuda .que { color: #94a1b0; }
#ayuda .cerrar {
  margin-top: 20px; width: 100%; padding: 9px; cursor: pointer;
  background: #1d2530; border: 1px solid #2b3440; border-radius: 7px;
  color: #d8cfc0; font: 11px ui-monospace, monospace; letter-spacing: .08em;
}
#ayuda .cerrar:hover { background: #26303d; border-color: #3d4a58; }
#ayuda-boton {
  pointer-events: auto;
  position: fixed; left: 54px; bottom: 14px; z-index: 60;
  width: 34px; height: 34px; border-radius: 8px; cursor: pointer;
  background: rgba(13,17,23,.72); border: 1px solid #2b3440; color: #c9d4e0;
  font: 14px/1 ui-monospace, monospace; display: grid; place-items: center;
  transition: background .12s, transform .12s;
}
#ayuda-boton:hover { background: rgba(30,38,48,.9); transform: translateY(-1px); }
`;

export interface PanelAyuda {
  alternar(): void;
  cerrar(): void;
  readonly abierto: boolean;
}

export function crearAyuda(
  contenedor: HTMLElement,
  modo: () => ModoControl = () => 'escritorio',
): PanelAyuda {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'ayuda';

  const caja = document.createElement('div');
  caja.className = 'caja';

  const h2 = document.createElement('h2');
  h2.textContent = 'Controles';
  const sub = document.createElement('div');
  sub.className = 'sub';
  const lista = document.createElement('div');

  const cerrarBtn = document.createElement('button');
  cerrarBtn.className = 'cerrar';
  cerrarBtn.textContent = 'A jugar';
  caja.append(h2, sub, lista, cerrarBtn);
  capa.appendChild(caja);

  /** El modo con el que se pintó por última vez, para no rehacerlo de balde. */
  let pintadoPara: ModoControl | null = null;

  /**
   * Rellena la lista según se juegue con el dedo o con teclado.
   *
   * Se rehace al abrir y no una sola vez al crear: el modo se puede cambiar en
   * los ajustes a mitad de partida, y una ayuda que sigue hablando de teclas
   * en un móvil es peor que no tener ayuda.
   */
  function pintar(): void {
    const m = modo();
    if (m === pintadoPara) return;
    pintadoPara = m;
    sub.textContent =
      m === 'tactil' ? 'Se vuelve a abrir desde Más → Controles.' : 'Se abre y se cierra con H.';
    lista.textContent = '';
    for (const grupo of m === 'tactil' ? GRUPOS_TACTIL : GRUPOS) {
      const h3 = document.createElement('h3');
      h3.textContent = grupo.titulo;
      lista.appendChild(h3);
      for (const [tecla, que] of grupo.filas) {
        const fila = document.createElement('div');
        fila.className = 'fila';
        const kbd = document.createElement('kbd');
        kbd.textContent = tecla;
        const texto = document.createElement('span');
        texto.className = 'que';
        texto.textContent = que;
        fila.append(kbd, texto);
        lista.appendChild(fila);
      }
    }
  }
  pintar();

  const boton = document.createElement('button');
  boton.id = 'ayuda-boton';
  boton.textContent = '?';
  boton.title = 'Controles (H)';

  contenedor.append(capa, boton);

  const api: PanelAyuda = {
    alternar: () => {
      pintar();
      capa.classList.toggle('visible');
    },
    cerrar: () => capa.classList.remove('visible'),
    get abierto() {
      return capa.classList.contains('visible');
    },
  };

  cerrarBtn.addEventListener('click', () => api.cerrar());
  boton.addEventListener('click', (e) => {
    e.stopPropagation();
    api.alternar();
  });
  // Un clic en el fondo cierra: es lo que todo el mundo intenta primero.
  capa.addEventListener('click', (e) => {
    if (e.target === capa) api.cerrar();
  });

  // La primera partida en este navegador se abre con la ayuda delante.
  try {
    if (!localStorage.getItem(CLAVE_VISTA)) {
      pintar();
      capa.classList.add('visible');
      localStorage.setItem(CLAVE_VISTA, '1');
    }
  } catch {
    /* sin localStorage no se recuerda, pero tampoco se rompe nada */
  }

  return api;
}

/**
 * La brújula en pantalla.
 *
 * Con una brújula en el zurrón aparece abajo a la izquierda una aguja que
 * apunta a la estructura más cercana y dice cuál es y a cuántos tiles está.
 * Sin ella no aparece nada.
 *
 * Es la respuesta al problema que dejaba el bloque anterior: una fortaleza
 * enterrada a doscientos tiles bajo tierra, en un mundo de tres mil columnas,
 * es estadísticamente invisible. Se podía haber resuelto poniendo una entrada
 * en la superficie, pero eso la habría convertido en un edificio con puerta; y
 * se podía haber marcado siempre en el mapa, pero entonces no habría nada que
 * ganar. Un objeto que hay que fabricar, y que además señala las cabañas y las
 * minas, hace de la búsqueda una fase del juego en vez de un accidente.
 */

const ESTILO = `
#brujula {
  pointer-events: none;
  position: fixed; left: 14px; bottom: 56px; z-index: 45; display: none;
  align-items: center; gap: 9px; padding: 7px 11px 7px 8px;
  background: rgba(13,17,23,.74); border: 1px solid #2b3440; border-radius: 9px;
  font: 11px ui-monospace, monospace; color: #c9d4e0;
}
#brujula.visible { display: flex; }
#brujula .esfera {
  width: 26px; height: 26px; border-radius: 50%; flex: none;
  background: radial-gradient(circle at 40% 35%, #2b3546, #161c26);
  border: 1px solid #4a566a; display: grid; place-items: center;
}
#brujula .aguja {
  color: #e8b64c; font-size: 13px; line-height: 1;
  transition: transform .12s linear;
}
#brujula .que { color: #e8d9b0; }
#brujula .lejos { color: #8b98a8; }
`;

export interface AvisoBrujula {
  nombre: string;
  /** Distancia en tiles, ya redondeada por quien la calcula. */
  distancia: number;
  /** Ángulo de pantalla en radianes: 0 es hacia la derecha, crece hacia abajo. */
  angulo: number;
}

export interface PanelBrujula {
  /** Pinta el aviso, o esconde el panel entero si se le pasa null. */
  actualizar(aviso: AvisoBrujula | null): void;
}

export function crearBrujula(contenedor: HTMLElement): PanelBrujula {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'brujula';
  const esfera = document.createElement('div');
  esfera.className = 'esfera';
  const aguja = document.createElement('span');
  aguja.className = 'aguja';
  // Una punta de flecha que en reposo mira a la derecha, que es el 0 del
  // ángulo: así el giro es el ángulo tal cual, sin correcciones que recordar.
  aguja.textContent = '➤';
  esfera.appendChild(aguja);
  const texto = document.createElement('div');
  const que = document.createElement('div');
  que.className = 'que';
  const lejos = document.createElement('div');
  lejos.className = 'lejos';
  texto.append(que, lejos);
  capa.append(esfera, texto);
  contenedor.appendChild(capa);

  /** Lo último pintado, para no tocar el DOM sesenta veces por segundo. */
  let ultimoTexto = '';
  let ultimoGrado = 9999;

  return {
    actualizar(aviso) {
      if (!aviso) {
        capa.classList.remove('visible');
        ultimoTexto = '';
        return;
      }
      capa.classList.add('visible');
      const grados = Math.round((aviso.angulo * 180) / Math.PI);
      if (grados !== ultimoGrado) {
        aguja.style.transform = `rotate(${grados}deg)`;
        ultimoGrado = grados;
      }
      const nuevo = `${aviso.nombre}|${aviso.distancia}`;
      if (nuevo === ultimoTexto) return;
      ultimoTexto = nuevo;
      que.textContent = aviso.nombre;
      lejos.textContent =
        aviso.distancia === 1 ? 'a 1 tile' : `a ${aviso.distancia} tiles`;
    },
  };
}

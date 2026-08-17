/**
 * Avisos efímeros en una esquina: guardado, errores al guardar y poco más.
 * Deliberadamente discreto — no debe tapar el juego ni pedir atención.
 */

const ESTILO = `
#aviso {
  position: fixed; right: 14px; top: 14px; z-index: 60; pointer-events: none;
  padding: 7px 11px; opacity: 0; transition: opacity .25s ease-out;
  background: rgba(13,17,23,.86); border: 1px solid #2a343f;
  font: 11px ui-monospace, monospace; color: #d8cfc0;
}
#aviso.visible { opacity: 1; }
#aviso.error { border-color: #7a3630; color: #e0857a; }

/* El cartel de suceso, debajo del aviso: este no se va solo. Mientras haya una
   luna de sangre encima hay que poder mirar y acordarse de por qué salen tres
   veces más bichos, sin depender de haber leído un aviso de segundo y medio. */
#suceso {
  /* A la izquierda, y no debajo del aviso: en esa esquina se amontonan ya el
     aviso efímero y el panel de depuración, y el cartel que tiene que estar
     visible *todo el rato* es justo el que no puede quedar tapado. */
  position: fixed; left: 14px; top: 14px; z-index: 60; pointer-events: none;
  padding: 5px 10px; display: none;
  background: rgba(13,17,23,.86); border: 1px solid currentColor;
  font: 10px ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase;
}
#suceso.visible { display: block; }
`;

export interface Aviso {
  mostrar(texto: string, error?: boolean): void;
  /**
   * Cartel fijo, para lo que dura. `null` lo quita.
   *
   * Es lo contrario del aviso: el aviso cuenta algo que acaba de pasar y se va
   * solo; esto dice en qué estado está el mundo mientras lo esté.
   */
  fijar(texto: string | null, color?: string): void;
}

export function crearAviso(contenedor: HTMLElement): Aviso {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const el = document.createElement('div');
  el.id = 'aviso';
  contenedor.appendChild(el);

  const fijo = document.createElement('div');
  fijo.id = 'suceso';
  contenedor.appendChild(fijo);

  let temporizador = 0;
  return {
    mostrar(texto, error = false) {
      el.textContent = texto;
      el.classList.toggle('error', error);
      el.classList.add('visible');
      clearTimeout(temporizador);
      temporizador = window.setTimeout(
        () => el.classList.remove('visible'),
        error ? 5000 : 1600,
      );
    },
    fijar(texto, color = '#d8cfc0') {
      fijo.classList.toggle('visible', texto !== null);
      if (texto === null) return;
      fijo.textContent = texto;
      fijo.style.color = color;
    },
  };
}

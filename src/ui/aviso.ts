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
`;

export interface Aviso {
  mostrar(texto: string, error?: boolean): void;
}

export function crearAviso(contenedor: HTMLElement): Aviso {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const el = document.createElement('div');
  el.id = 'aviso';
  contenedor.appendChild(el);

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
  };
}

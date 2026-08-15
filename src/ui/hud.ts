import type { Capa } from '../world/edit';
import { HIERBA, MADERA, PIEDRA, PLATAFORMA, TIERRA, TILES } from '../world/tiles';

/**
 * HUD de construcción: qué material está seleccionado y sobre qué capa se
 * trabaja. Es DOM sobre el canvas, no pintura: el texto se lee nítido en
 * cualquier pantalla y no cuesta un solo milisegundo de frame.
 */

/** Materiales que se pueden colocar, en orden de las teclas 1..6. */
export const PALETA = [TIERRA, HIERBA, PIEDRA, MADERA, PLATAFORMA] as const;

const ESTILO = `
#hud {
  position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
  z-index: 40; display: flex; gap: 10px; align-items: center;
  padding: 8px 10px; pointer-events: none;
  background: rgba(13,17,23,0.82); border: 1px solid #2a343f;
  font: 11px ui-monospace, monospace; color: #d8cfc0;
}
#hud .ranura {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 5px 7px; border: 1px solid transparent; min-width: 54px;
}
#hud .ranura.activa { border-color: #e8b64c; background: rgba(232,182,76,0.12); }
#hud .muestra { width: 22px; height: 22px; border: 1px solid rgba(0,0,0,0.5); }
#hud .nombre { font-size: 9px; letter-spacing: .04em; color: #9fb0c0; }
#hud .ranura.activa .nombre { color: #e8b64c; }
#hud .sep { width: 1px; align-self: stretch; background: #2a343f; }
#hud .capa { display: flex; flex-direction: column; gap: 3px; padding-left: 4px; }
#hud .capa b { color: #e8b64c; font-weight: 600; }
#hud .ayuda { color: #6d7a8a; line-height: 1.5; }
`;

export interface Hud {
  refrescar(indice: number, capa: Capa): void;
}

export function crearHud(contenedor: HTMLElement): Hud {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const hud = document.createElement('div');
  hud.id = 'hud';

  const ranuras: HTMLElement[] = [];
  PALETA.forEach((id, i) => {
    const def = TILES[id]!;
    const r = document.createElement('div');
    r.className = 'ranura';

    const muestra = document.createElement('div');
    muestra.className = 'muestra';
    muestra.style.background = def.color;

    const nombre = document.createElement('div');
    nombre.className = 'nombre';
    nombre.textContent = `${i + 1} ${def.nombre}`;

    r.append(muestra, nombre);
    hud.appendChild(r);
    ranuras.push(r);
  });

  const sep = document.createElement('div');
  sep.className = 'sep';
  hud.appendChild(sep);

  const capaBox = document.createElement('div');
  capaBox.className = 'capa';
  const capaTexto = document.createElement('div');
  const ayuda = document.createElement('div');
  ayuda.className = 'ayuda';
  ayuda.innerHTML =
    'Clic izq. minar · clic der. colocar<br>Rueda cambia material · Tab cambia capa';
  capaBox.append(capaTexto, ayuda);
  hud.appendChild(capaBox);

  contenedor.appendChild(hud);

  return {
    refrescar(indice, capa) {
      ranuras.forEach((r, i) => r.classList.toggle('activa', i === indice));
      capaTexto.innerHTML = `Capa: <b>${capa === 'bloque' ? 'BLOQUE' : 'PARED'}</b>`;
    },
  };
}

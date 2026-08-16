/**
 * La barra del jefe.
 *
 * Va arriba y en el centro, y solo existe mientras el guardián está vivo. No
 * es adorno: una pelea de novecientos puntos de vida sin barra es una pelea a
 * ciegas, en la que no se sabe si se está ganando, y eso convierte cualquier
 * jefe en una esponja. Con la barra, el momento en que cruza la mitad —que es
 * cuando se enfurece— se ve venir.
 */

const ESTILO = `
#jefe {
  pointer-events: none;
  position: fixed; left: 50%; top: 16px; transform: translateX(-50%);
  z-index: 46; display: none; width: min(74vw, 460px); text-align: center;
  font: 11px ui-monospace, monospace; color: #e8d9b0;
}
#jefe.visible { display: block; }
#jefe .nombre { letter-spacing: .14em; text-transform: uppercase; margin-bottom: 4px;
  text-shadow: 0 1px 3px rgba(0,0,0,.85); }
#jefe .carril {
  height: 11px; background: rgba(10,8,16,.82);
  border: 1px solid #5b4a7a; border-radius: 6px; overflow: hidden;
}
#jefe .relleno {
  height: 100%; width: 100%;
  background: linear-gradient(90deg, #6d3fa8, #c07ae8);
  transition: width .12s linear;
}
#jefe.furioso .relleno { background: linear-gradient(90deg, #a83f5a, #e87a7a); }
#jefe .cifra { margin-top: 3px; color: #a9b4c2; text-shadow: 0 1px 3px rgba(0,0,0,.85); }
`;

export interface PanelJefe {
  /** Enseña la barra con la vida que le queda, de 0 a 1. */
  mostrar(nombre: string, vida: number, vidaMax: number, furioso: boolean): void;
  ocultar(): void;
}

export function crearPanelJefe(contenedor: HTMLElement): PanelJefe {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'jefe';
  const nombre = document.createElement('div');
  nombre.className = 'nombre';
  const carril = document.createElement('div');
  carril.className = 'carril';
  const relleno = document.createElement('div');
  relleno.className = 'relleno';
  carril.appendChild(relleno);
  const cifra = document.createElement('div');
  cifra.className = 'cifra';
  capa.append(nombre, carril, cifra);
  contenedor.appendChild(capa);

  let ultimoAncho = -1;

  return {
    mostrar(texto, vida, vidaMax, furioso) {
      capa.classList.add('visible');
      capa.classList.toggle('furioso', furioso);
      if (nombre.textContent !== texto) nombre.textContent = texto;
      const pct = Math.max(0, Math.min(100, Math.round((vida / Math.max(1, vidaMax)) * 100)));
      if (pct !== ultimoAncho) {
        ultimoAncho = pct;
        relleno.style.width = `${pct}%`;
        cifra.textContent = `${Math.max(0, Math.round(vida))} / ${Math.round(vidaMax)}`;
      }
    },
    ocultar() {
      capa.classList.remove('visible');
      ultimoAncho = -1;
    },
  };
}

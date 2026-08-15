import { corazones, type Salud } from '../entities/salud';

/**
 * Corazones y aviso de muerte.
 *
 * Los corazones van arriba a la derecha, lejos del overlay de diagnóstico y de
 * la barra rápida. Se vacían por mitades, que es suficiente resolución para
 * saber si aguantas otro golpe sin tener que leer un número.
 */

const ESTILO = `
#vida {
  position: fixed; right: 14px; top: 14px; z-index: 45; display: flex; gap: 3px;
  pointer-events: none;
}
#vida .corazon {
  width: 20px; height: 18px; position: relative;
  background: #2a1418; border: 1px solid #120a0c;
}
#vida .corazon i {
  position: absolute; left: 0; bottom: 0; width: 100%;
  background: linear-gradient(180deg, #ff6b6b 0%, #c0392b 100%);
  display: block;
}
#muerte {
  position: fixed; inset: 0; z-index: 70; display: none;
  flex-direction: column; align-items: center; justify-content: center; gap: 14px;
  background: rgba(40, 6, 6, .55);
  font: 12px ui-monospace, monospace; color: #e8cfc9; text-align: center;
}
#muerte.visible { display: flex; }
#muerte h2 {
  font-size: clamp(1.8rem, 7vw, 3.2rem); letter-spacing: .18em; text-transform: uppercase;
  color: #ff6b6b; text-shadow: 0 0 24px rgba(255,107,107,.4), 0 3px 0 #000;
}
`;

export interface PanelVida {
  refrescar(s: Salud): void;
  mostrarMuerte(visible: boolean, texto?: string): void;
}

export function crearPanelVida(contenedor: HTMLElement): PanelVida {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const panel = document.createElement('div');
  panel.id = 'vida';

  const muerte = document.createElement('div');
  muerte.id = 'muerte';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Has muerto';
  const detalle = document.createElement('div');
  muerte.append(titulo, detalle);

  contenedor.append(panel, muerte);

  const iconos: HTMLElement[] = [];
  let ultimoTotal = -1;

  return {
    refrescar(s) {
      const { llenos, parcial, total } = corazones(s);
      if (total !== ultimoTotal) {
        panel.innerHTML = '';
        iconos.length = 0;
        for (let i = 0; i < total; i++) {
          const c = document.createElement('div');
          c.className = 'corazon';
          const relleno = document.createElement('i');
          c.appendChild(relleno);
          panel.appendChild(c);
          iconos.push(relleno);
        }
        ultimoTotal = total;
      }
      iconos.forEach((relleno, i) => {
        const pct = i < llenos ? 1 : i === llenos ? parcial : 0;
        relleno.style.height = `${Math.round(pct * 100)}%`;
      });
      // Parpadeo mientras dura la invulnerabilidad: informa de que los golpes
      // no entran sin escribir nada en pantalla.
      panel.style.opacity = s.invulnerable > 0 && s.invulnerable % 10 < 5 ? '0.45' : '1';
    },
    mostrarMuerte(visible, texto = '') {
      muerte.classList.toggle('visible', visible);
      detalle.textContent = texto;
    },
  };
}

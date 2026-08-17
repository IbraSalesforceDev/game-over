import { ALIENTO_MAXIMO, type Aliento } from '../entities/aliento';
import { HAMBRE_MAXIMA, UMBRAL_HAMBRIENTO, UMBRAL_SACIADO, type Hambre } from '../entities/hambre';
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
#hambre {
  position: fixed; right: 14px; top: 38px; z-index: 45; display: flex; gap: 3px;
  pointer-events: none;
}
#hambre .trozo {
  width: 20px; height: 10px; background: #241a12; border: 1px solid #120c08;
  position: relative;
}
#hambre .trozo i {
  position: absolute; left: 0; bottom: 0; width: 100%; display: block;
  background: linear-gradient(180deg, #d9a441 0%, #a86b23 100%);
}
/* Saciado y hambriento se avisan con el color de la barra entera: son las dos
   franjas en las que pasa algo, y un número no se lee de reojo. */
#hambre.saciado .trozo i { background: linear-gradient(180deg, #9bd96b 0%, #4f9330 100%); }
#hambre.vacio .trozo i { background: linear-gradient(180deg, #e0703c 0%, #a3341c 100%); }
#aliento {
  position: fixed; right: 14px; top: 56px; z-index: 45; width: 128px; height: 8px;
  background: #0d1a24; border: 1px solid #071016; display: none; pointer-events: none;
}
#aliento.visible { display: block; }
#aliento i {
  display: block; height: 100%; background: linear-gradient(180deg, #7fc4f0, #2f6fb5);
  transition: width .1s linear;
}
#aliento.ahogo i { background: linear-gradient(180deg, #ff9d6b, #c0392b); }
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
  /** Medidor de hambre, en cinco trozos como los corazones. */
  refrescarHambre(h: Hambre): void;
  /** Medidor de aire. Se esconde solo cuando los pulmones están llenos. */
  refrescarAliento(a: Aliento): void;
  mostrarMuerte(visible: boolean, texto?: string): void;
}

/**
 * Qué medidores existen en esta versión.
 *
 * Los corazones llegaron con el combate en 2.0.0, la burbuja de aire con los
 * líquidos en 2.1.0 y el estómago con el hambre en 2.3.0. Enseñar los tres en
 * un mundo de 1.4.0 sería enseñar tres barras que no miden nada.
 */
export interface MedidoresVisibles {
  vida?: boolean;
  aliento?: boolean;
  hambre?: boolean;
}

export function crearPanelVida(
  contenedor: HTMLElement,
  visibles: MedidoresVisibles = {},
): PanelVida {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const panel = document.createElement('div');
  panel.id = 'vida';

  const hambre = document.createElement('div');
  hambre.id = 'hambre';
  const trozosHambre: HTMLElement[] = [];
  for (let i = 0; i < 5; i++) {
    const t = document.createElement('div');
    t.className = 'trozo';
    const relleno = document.createElement('i');
    t.appendChild(relleno);
    hambre.appendChild(t);
    trozosHambre.push(relleno);
  }

  const aliento = document.createElement('div');
  aliento.id = 'aliento';
  const alientoRelleno = document.createElement('i');
  aliento.appendChild(alientoRelleno);

  const muerte = document.createElement('div');
  muerte.id = 'muerte';
  const titulo = document.createElement('h2');
  titulo.textContent = 'Has muerto';
  const detalle = document.createElement('div');
  muerte.append(titulo, detalle);

  contenedor.append(panel, hambre, aliento, muerte);
  // Se esconden de una vez y para siempre: ninguno de los tres puede aparecer
  // a mitad de partida, porque la versión del mundo no cambia.
  if (visibles.vida === false) panel.style.display = 'none';
  if (visibles.hambre === false) hambre.style.display = 'none';
  if (visibles.aliento === false) aliento.style.display = 'none';

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
    refrescarHambre(h) {
      const pct = h.nivel / HAMBRE_MAXIMA;
      trozosHambre.forEach((relleno, i) => {
        const desde = i / trozosHambre.length;
        const parte = Math.max(0, Math.min(1, (pct - desde) * trozosHambre.length));
        relleno.style.height = `${Math.round(parte * 100)}%`;
      });
      hambre.classList.toggle('saciado', h.nivel >= UMBRAL_SACIADO);
      hambre.classList.toggle('vacio', h.nivel <= UMBRAL_HAMBRIENTO);
    },
    refrescarAliento(a) {
      // Con los pulmones llenos el medidor estorba: solo aparece cuando hay
      // algo que vigilar.
      const visible = a.aire < ALIENTO_MAXIMO;
      aliento.classList.toggle('visible', visible);
      if (!visible) return;
      aliento.classList.toggle('ahogo', a.aire <= 0);
      alientoRelleno.style.width = `${Math.round((a.aire / ALIENTO_MAXIMO) * 100)}%`;
    },
    mostrarMuerte(visible, texto = '') {
      muerte.classList.toggle('visible', visible);
      detalle.textContent = texto;
    },
  };
}

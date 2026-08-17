import { EFECTOS, efectosActivos, segundos, type Efectos } from '../entities/efectos';

/**
 * Los efectos que llevas puestos.
 *
 * Va debajo de los corazones, del estómago y de la burbuja de aire, en la misma
 * columna de la derecha: son todos medidores de "cómo estás", y repartirlos por
 * dos esquinas obligaría a mirar a dos sitios para saber si te queda fuerza.
 *
 * Cada uno es una pastilla con su nombre y los segundos que le quedan. Se
 * pensó en poner solo un icono de color, pero con siete efectos posibles nadie
 * se aprende siete colores: el número es además lo que convierte "tengo fuerza"
 * en la decisión de si da tiempo a bajar otro piso antes de que se acabe.
 */

const ESTILO = `
#estados {
  position: fixed; right: 14px; top: 72px; z-index: 45;
  display: flex; flex-direction: column; align-items: flex-end; gap: 3px;
  pointer-events: none; font: 10px ui-monospace, monospace;
}
#estados .estado {
  display: flex; align-items: center; gap: 5px;
  padding: 2px 6px; border: 1px solid rgba(0,0,0,.55);
  background: rgba(14, 12, 18, .72); color: #e8e2d6;
  border-radius: 2px;
}
#estados .estado b { width: 6px; height: 12px; display: block; }
#estados .estado i { font-style: normal; opacity: .72; }
/* Los últimos cinco segundos parpadean: es el aviso de que toca beber otra
   antes de meterse donde te vas a meter. */
#estados .estado.acaba { animation: estadoAcaba .6s steps(2, end) infinite; }
@keyframes estadoAcaba { 50% { opacity: .38; } }
`;

/** Segundos por debajo de los cuales el distintivo parpadea. */
export const AVISO_FINAL = 5;

export interface PanelEstados {
  refrescar(ef: Efectos): void;
}

export function crearPanelEstados(contenedor: HTMLElement, visible = true): PanelEstados {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const panel = document.createElement('div');
  panel.id = 'estados';
  contenedor.appendChild(panel);
  if (!visible) panel.style.display = 'none';

  // Se recuerda lo pintado para no rehacer el DOM sesenta veces por segundo:
  // los segundos solo cambian una vez por segundo y las pastillas casi nunca.
  let ultimo = '';

  return {
    refrescar(ef) {
      const activos = efectosActivos(ef);
      const firma = activos.map((a) => `${a.clase}:${segundos(a.restante)}`).join('|');
      if (firma === ultimo) return;
      ultimo = firma;

      panel.innerHTML = '';
      for (const { clase, restante } of activos) {
        const def = EFECTOS[clase];
        const s = segundos(restante);
        const fila = document.createElement('div');
        fila.className = s <= AVISO_FINAL ? 'estado acaba' : 'estado';
        const color = document.createElement('b');
        color.style.background = def.color;
        const nombre = document.createElement('span');
        nombre.textContent = def.nombre;
        const cuenta = document.createElement('i');
        cuenta.textContent = `${s} s`;
        fila.append(color, nombre, cuenta);
        panel.appendChild(fila);
      }
    },
  };
}

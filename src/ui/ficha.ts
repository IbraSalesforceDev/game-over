import { defObjeto, descripcionDe, NADA, resumenDe } from '../items/items';
import { defTile } from '../world/tiles';
import type { Iconos } from '../render/iconos';

/**
 * La ficha de un objeto: nombre, números y para qué sirve.
 *
 * Aparece al pasar el ratón por encima de una ranura. Existe porque el
 * catálogo ya tiene ciento veintiocho entradas y hasta ahora lo único que
 * decían de sí mismas era su nombre en el atributo `title` del navegador —que
 * tarda un segundo en salir, sale donde quiere y no puede llevar el icono.
 *
 * Lo que se enseña son tres cosas y en este orden: qué es, cuánto vale y qué
 * hace. Los números van antes que la explicación porque quien mira una espada
 * ya sabe que las espadas cortan; lo que quiere saber es cuánto.
 */

const ESTILO = `
#ficha {
  pointer-events: none;
  position: fixed; z-index: 90; display: none;
  width: 232px; padding: 9px 11px;
  background: rgba(10,13,19,.97); border: 1px solid #3a4554; border-radius: 8px;
  box-shadow: 0 10px 28px rgba(0,0,0,.55);
  font: 11px ui-monospace, monospace; color: #b6c2d0;
}
#ficha.visible { display: block; }
#ficha .cabecera { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
#ficha canvas { width: 24px; height: 24px; image-rendering: pixelated; flex: none; }
#ficha .titulo { color: #e8d9b0; font-size: 12px; }
#ficha .numeros { color: #8fb6d6; margin-bottom: 5px; }
#ficha .que { color: #93a0ae; line-height: 1.45; }
`;

export interface Ficha {
  /** Enseña la ficha de un objeto junto a un elemento de la pantalla. */
  mostrar(objeto: number, ancla: HTMLElement): void;
  ocultar(): void;
}

export function crearFicha(contenedor: HTMLElement, iconos: Iconos): Ficha {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'ficha';
  const cabecera = document.createElement('div');
  cabecera.className = 'cabecera';
  const icono = document.createElement('canvas');
  icono.width = 20;
  icono.height = 20;
  const titulo = document.createElement('div');
  titulo.className = 'titulo';
  cabecera.append(icono, titulo);
  const numeros = document.createElement('div');
  numeros.className = 'numeros';
  const que = document.createElement('div');
  que.className = 'que';
  capa.append(cabecera, numeros, que);
  contenedor.appendChild(capa);

  let ultimo = NADA;

  return {
    mostrar(objeto, ancla) {
      if (objeto === NADA) {
        capa.classList.remove('visible');
        return;
      }
      if (objeto !== ultimo) {
        ultimo = objeto;
        const def = defObjeto(objeto);
        iconos.pintarEn(icono, objeto);
        titulo.textContent = def.nombre;
        const numero = resumenDe(objeto);
        numeros.textContent = numero;
        numeros.style.display = numero ? 'block' : 'none';
        // Los bloques enseñan además su dureza: es lo que decide si hace falta
        // un pico mejor, y hasta ahora solo se descubría fallando al picarlos.
        que.textContent =
          def.tile !== undefined
            ? `${descripcionDe(objeto)} Dureza ${defTile(def.tile).dureza}.`
            : descripcionDe(objeto);
      }
      capa.classList.add('visible');

      // Colocación: encima de la ranura y centrada, y si no cabe arriba, debajo.
      // Se mide después de hacerla visible porque un elemento con `display:
      // none` mide cero y la ficha acabaría siempre pegada al borde.
      const r = ancla.getBoundingClientRect();
      const f = capa.getBoundingClientRect();
      const x = Math.max(6, Math.min(window.innerWidth - f.width - 6, r.left + r.width / 2 - f.width / 2));
      const arriba = r.top - f.height - 8;
      capa.style.left = `${Math.round(x)}px`;
      capa.style.top = `${Math.round(arriba > 6 ? arriba : r.bottom + 8)}px`;
    },
    ocultar() {
      capa.classList.remove('visible');
    },
  };
}

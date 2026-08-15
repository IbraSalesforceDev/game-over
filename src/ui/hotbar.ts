import { estaVacia, RANURAS_BARRA, TOTAL_RANURAS, type Inventario } from '../items/inventory';
import { defObjeto, NADA } from '../items/items';
import type { Capa } from '../world/edit';

/**
 * Barra rápida e inventario.
 *
 * Comparten rejilla: las diez primeras ranuras del inventario *son* la barra.
 * Mover algo de una a otra es mover una ranura, sin trasvases entre
 * contenedores distintos.
 *
 * Para coger y soltar no se usa la API de arrastrar del navegador: se coge la
 * pila con un clic, va pegada al puntero, y se suelta con otro clic. Es lo que
 * hacen los juegos del género y funciona igual con ratón que con dedo.
 */

const ESTILO = `
#barra {
  position: fixed; left: 50%; bottom: 14px; transform: translateX(-50%);
  z-index: 40; display: flex; gap: 4px; padding: 6px;
  background: rgba(13,17,23,.82); border: 1px solid #2a343f;
  font: 11px ui-monospace, monospace; color: #d8cfc0; pointer-events: auto;
}
#barra .info {
  position: absolute; left: 0; right: 0; bottom: 100%; margin-bottom: 6px;
  text-align: center; color: #e8b64c; text-shadow: 0 1px 2px #000;
  pointer-events: none; min-height: 14px;
}
.ranura {
  position: relative; width: 42px; height: 42px; box-sizing: border-box;
  border: 1px solid #38434f; background: #131a22; cursor: pointer;
}
.ranura:hover { border-color: #5a6979; }
.ranura.activa { border-color: #e8b64c; background: rgba(232,182,76,.14); }
.ranura .icono {
  position: absolute; inset: 7px; border: 1px solid rgba(0,0,0,.45);
}
.ranura .icono.herramienta { inset: 9px 15px; border-radius: 1px; }
.ranura .cant {
  position: absolute; right: 2px; bottom: 1px; font-size: 10px;
  color: #fff; text-shadow: 0 1px 2px #000, 0 0 3px #000;
}
.ranura .tecla {
  position: absolute; left: 3px; top: 1px; font-size: 9px; color: #6d7a8a;
}

#inventario {
  position: fixed; left: 50%; bottom: 74px; transform: translateX(-50%);
  z-index: 41; display: none; grid-template-columns: repeat(10, 42px); gap: 4px;
  padding: 8px; background: rgba(13,17,23,.94); border: 1px solid #2a343f;
  pointer-events: auto;
}
#inventario.abierto { display: grid; }
#en-mano {
  position: fixed; z-index: 60; width: 30px; height: 30px; margin: -15px 0 0 -15px;
  pointer-events: none; display: none; border: 1px solid rgba(0,0,0,.5);
  font: 10px ui-monospace, monospace; color: #fff; text-align: right;
}
#en-mano.lleno { display: block; }
#en-mano span { position: absolute; right: 1px; bottom: -2px; text-shadow: 0 1px 2px #000; }
`;

export interface Barra {
  /** Índice de la ranura activa de la barra rápida. */
  readonly seleccion: number;
  seleccionar(i: number): void;
  desplazar(delta: number): void;
  alternarInventario(): void;
  readonly inventarioAbierto: boolean;
  /** Objeto de la ranura activa, o NADA. */
  objetoActivo(): number;
  refrescar(capa: Capa): void;
}

interface RanuraDom {
  raiz: HTMLElement;
  icono: HTMLElement;
  cant: HTMLElement;
}

export function crearBarra(
  contenedor: HTMLElement,
  inventario: Inventario,
  alCambiar: () => void,
): Barra {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  let seleccion = 0;
  let abierto = false;
  /** Pila que el jugador lleva en el puntero mientras reorganiza. */
  const enMano = { objeto: NADA, cantidad: 0 };

  const barra = document.createElement('div');
  barra.id = 'barra';
  const info = document.createElement('div');
  info.className = 'info';
  barra.appendChild(info);

  const panel = document.createElement('div');
  panel.id = 'inventario';

  const cursor = document.createElement('div');
  cursor.id = 'en-mano';
  const cursorCant = document.createElement('span');
  cursor.appendChild(cursorCant);

  const doms: RanuraDom[] = [];

  function crearRanura(indice: number, esBarra: boolean): RanuraDom {
    const raiz = document.createElement('div');
    raiz.className = 'ranura';
    const icono = document.createElement('div');
    icono.className = 'icono';
    const cant = document.createElement('div');
    cant.className = 'cant';
    raiz.append(icono, cant);
    if (esBarra) {
      const tecla = document.createElement('div');
      tecla.className = 'tecla';
      tecla.textContent = String((indice + 1) % 10);
      raiz.appendChild(tecla);
    }

    raiz.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Con el inventario cerrado, la barra solo selecciona.
      if (!abierto && esBarra) {
        seleccionar(indice);
        return;
      }
      const r = inventario.ranuras[indice]!;
      if (enMano.objeto === NADA) {
        if (estaVacia(r)) return;
        enMano.objeto = r.objeto;
        enMano.cantidad = r.cantidad;
        r.objeto = NADA;
        r.cantidad = 0;
      } else if (estaVacia(r)) {
        r.objeto = enMano.objeto;
        r.cantidad = enMano.cantidad;
        enMano.objeto = NADA;
        enMano.cantidad = 0;
      } else if (r.objeto === enMano.objeto) {
        const tope = defObjeto(r.objeto).maxPila;
        const cabe = Math.min(tope - r.cantidad, enMano.cantidad);
        r.cantidad += cabe;
        enMano.cantidad -= cabe;
        if (enMano.cantidad <= 0) enMano.objeto = NADA;
      } else {
        const tmp = { objeto: r.objeto, cantidad: r.cantidad };
        r.objeto = enMano.objeto;
        r.cantidad = enMano.cantidad;
        enMano.objeto = tmp.objeto;
        enMano.cantidad = tmp.cantidad;
      }
      pintar();
      alCambiar();
    });

    return { raiz, icono, cant };
  }

  for (let i = 0; i < TOTAL_RANURAS; i++) {
    const esBarra = i < RANURAS_BARRA;
    const d = crearRanura(i, esBarra);
    doms.push(d);
    (esBarra ? barra : panel).appendChild(d.raiz);
  }

  contenedor.append(barra, panel, cursor);

  document.addEventListener('pointermove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  let capaActual: Capa = 'bloque';

  function pintar(): void {
    for (let i = 0; i < TOTAL_RANURAS; i++) {
      const r = inventario.ranuras[i]!;
      const d = doms[i]!;
      const def = defObjeto(r.objeto);
      const vacia = estaVacia(r);
      d.icono.style.display = vacia ? 'none' : 'block';
      d.icono.style.background = def.color;
      d.icono.className = `icono${def.tipo === 'herramienta' ? ' herramienta' : ''}`;
      d.cant.textContent = !vacia && r.cantidad > 1 ? String(r.cantidad) : '';
      d.raiz.classList.toggle('activa', i === seleccion);
      d.raiz.title = vacia ? '' : `${def.nombre} ×${r.cantidad}`;
    }

    const activa = inventario.ranuras[seleccion]!;
    const nombre = estaVacia(activa) ? '—' : defObjeto(activa.objeto).nombre;
    info.textContent = `${nombre}   ·   capa ${capaActual === 'pared' ? 'PARED' : 'BLOQUE'}`;

    cursor.classList.toggle('lleno', enMano.objeto !== NADA);
    if (enMano.objeto !== NADA) {
      cursor.style.background = defObjeto(enMano.objeto).color;
      cursorCant.textContent = enMano.cantidad > 1 ? String(enMano.cantidad) : '';
    }
  }

  function seleccionar(i: number): void {
    seleccion = ((i % RANURAS_BARRA) + RANURAS_BARRA) % RANURAS_BARRA;
    pintar();
    alCambiar();
  }

  pintar();

  return {
    get seleccion() {
      return seleccion;
    },
    seleccionar,
    desplazar(delta) {
      seleccionar(seleccion + delta);
    },
    alternarInventario() {
      abierto = !abierto;
      panel.classList.toggle('abierto', abierto);
      // Al cerrar con algo en la mano, vuelve al inventario en vez de perderse.
      if (!abierto && enMano.objeto !== NADA) {
        const sobra = inventario.anadir(enMano.objeto, enMano.cantidad);
        enMano.objeto = NADA;
        enMano.cantidad = sobra;
        if (sobra > 0) enMano.objeto = NADA;
      }
      pintar();
    },
    get inventarioAbierto() {
      return abierto;
    },
    objetoActivo() {
      const r = inventario.ranuras[seleccion]!;
      return estaVacia(r) ? NADA : r.objeto;
    },
    refrescar(capa) {
      capaActual = capa;
      pintar();
    },
  };
}

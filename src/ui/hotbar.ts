import { crearIconos, LADO_ICONO } from '../render/iconos';
import { estaVacia, RANURAS_BARRA, TOTAL_RANURAS, type Inventario } from '../items/inventory';
import { defObjeto, NADA } from '../items/items';
import { craftear, recetasVisibles, sePuedeCraftear } from '../items/recipes';
import type { Capa } from '../world/edit';

/**
 * Barra rápida, inventario, cofre abierto y panel de crafteo.
 *
 * Todo vive junto porque comparten la misma mecánica: coger una pila con un
 * clic, llevarla pegada al puntero y soltarla con otro. No se usa la API de
 * arrastrar del navegador; así funciona igual con ratón que con dedo, y mover
 * algo del cofre al inventario es el mismo gesto que moverlo dentro del
 * inventario.
 *
 * Las diez primeras ranuras del inventario *son* la barra rápida, no un
 * contenedor aparte.
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
/* El icono es un canvas de 20x20 estirado; el renderizado pixelado es lo que
   conserva el pixel art al ampliarlo: sin él el navegador lo interpola. */
.ranura .icono { position: absolute; inset: 5px; width: auto; height: auto;
  image-rendering: pixelated; }
.ranura .cant {
  position: absolute; right: 2px; bottom: 1px; font-size: 10px;
  color: #fff; text-shadow: 0 1px 2px #000, 0 0 3px #000;
}
.ranura .tecla { position: absolute; left: 3px; top: 1px; font-size: 9px; color: #6d7a8a; }

.rejilla {
  position: fixed; left: 50%; transform: translateX(-50%); z-index: 41;
  display: none; grid-template-columns: repeat(10, 42px); gap: 4px; padding: 8px;
  background: rgba(13,17,23,.94); border: 1px solid #2a343f; pointer-events: auto;
}
.rejilla.abierto { display: grid; }
#inventario { bottom: 74px; }
#cofre { bottom: 300px; border-color: #6a5426; background: rgba(24,20,14,.96); }
.rejilla .titulo {
  grid-column: 1 / -1; color: #e8b64c; font: 11px ui-monospace, monospace;
  letter-spacing: .12em; text-transform: uppercase;
}

#en-mano {
  position: fixed; z-index: 60; width: 30px; height: 30px; margin: -15px 0 0 -15px;
  pointer-events: none; display: none;
  font: 10px ui-monospace, monospace; color: #fff;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,.6));
}
#en-mano.lleno { display: block; }
#en-mano span { position: absolute; right: 1px; bottom: -2px; text-shadow: 0 1px 2px #000; }

#crafteo {
  position: fixed; right: 14px; bottom: 74px; z-index: 41; display: none;
  width: 250px; max-height: 62vh; overflow-y: auto; padding: 8px;
  background: rgba(13,17,23,.94); border: 1px solid #2a343f;
  font: 11px ui-monospace, monospace; color: #d8cfc0; pointer-events: auto;
}
#crafteo.abierto { display: block; }
#crafteo h3 {
  font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
  color: #8b98a8; margin-bottom: 6px;
}
#crafteo .receta {
  display: flex; align-items: center; gap: 8px; padding: 5px 6px; margin-bottom: 4px;
  border: 1px solid #2a343f; background: #131a22; cursor: pointer;
}
#crafteo .receta:hover { border-color: #5a6979; }
#crafteo .receta.no { opacity: .38; cursor: not-allowed; }
#crafteo .receta .muestra { width: 24px; height: 24px; flex: none; image-rendering: pixelated; }
#crafteo .receta .texto { flex: 1; min-width: 0; }
#crafteo .receta .coste { color: #6d7a8a; font-size: 10px; }
#crafteo .nota { color: #6d7a8a; line-height: 1.5; }

/* Modo taller: el mismo panel, pero abierto en grande y en el centro. Se
   reutiliza en vez de duplicarlo porque la lista de recetas y su lógica de
   "puedo pagarla" ya estaban aquí; lo único que cambia es cuánto sitio ocupa. */
#crafteo.taller {
  right: auto; left: 50%; transform: translateX(-50%);
  bottom: 300px; width: min(94vw, 620px); max-height: 46vh;
  border-color: #6a5426; background: rgba(22,19,13,.96);
}
#crafteo.taller .lista {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(268px, 1fr)); gap: 4px;
}
#crafteo.taller .receta { margin: 0; }
`;

export interface Barra {
  readonly seleccion: number;
  seleccionar(i: number): void;
  desplazar(delta: number): void;
  alternarInventario(): void;
  readonly inventarioAbierto: boolean;
  /** Cofre abierto ahora mismo, o null. */
  readonly cofreAbierto: { tx: number; ty: number } | null;
  abrirCofre(inv: Inventario, tx: number, ty: number): void;
  /** Estación abierta ahora mismo, o null. */
  readonly tallerAbierto: { tx: number; ty: number } | null;
  /** Abre la estación con su lista de recetas en grande. */
  abrirTaller(titulo: string, tx: number, ty: number): void;
  cerrar(): void;
  objetoActivo(): number;
  refrescar(capa?: Capa): void;
}

interface RanuraDom {
  raiz: HTMLElement;
  icono: HTMLCanvasElement;
  cant: HTMLElement;
}

export interface OpcionesBarra {
  /** Se llama cuando el inventario cambia por acción del jugador. */
  alCambiar(): void;
  /** Estaciones de crafteo al alcance, para filtrar las recetas. */
  estaciones(): ReadonlySet<number>;
  /** Aviso sonoro de que una receta ha salido. Opcional: los tests no suenan. */
  alFabricar?(): void;
  /**
   * Suelta al mundo lo que no ha cabido en ningún sitio.
   *
   * Existe porque la alternativa era borrarlo, y borrarlo es lo que hacía que
   * al cerrar el inventario con el cofre abierto y las cuarenta ranuras llenas
   * la pila del puntero desapareciera sin más.
   */
  alSoltarAlMundo?(objeto: number, cantidad: number): void;
}

export function crearBarra(
  contenedor: HTMLElement,
  inventario: Inventario,
  opciones: OpcionesBarra,
): Barra {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);
  const iconos = crearIconos();

  let seleccion = 0;
  let abierto = false;
  let cofre: { inv: Inventario; tx: number; ty: number } | null = null;
  /** Estación abierta a pantalla completa, o null si es el panel pequeño. */
  let taller: { titulo: string; tx: number; ty: number } | null = null;
  let capaActual: Capa = 'bloque';
  /** Pila que el jugador lleva en el puntero mientras reorganiza. */
  const enMano = { objeto: NADA, cantidad: 0 };

  const barra = document.createElement('div');
  barra.id = 'barra';
  const info = document.createElement('div');
  info.className = 'info';
  barra.appendChild(info);

  const panel = document.createElement('div');
  panel.id = 'inventario';
  panel.className = 'rejilla';

  const panelCofre = document.createElement('div');
  panelCofre.id = 'cofre';
  panelCofre.className = 'rejilla';
  const tituloCofre = document.createElement('div');
  tituloCofre.className = 'titulo';
  tituloCofre.textContent = 'Cofre';
  panelCofre.appendChild(tituloCofre);

  const panelCrafteo = document.createElement('div');
  panelCrafteo.id = 'crafteo';

  const cursor = document.createElement('div');
  cursor.id = 'en-mano';
  const lienzoCursor = document.createElement('canvas');
  lienzoCursor.width = LADO_ICONO;
  lienzoCursor.height = LADO_ICONO;
  lienzoCursor.style.cssText = 'width:100%;height:100%;image-rendering:pixelated';
  const cursorCant = document.createElement('span');
  cursor.append(lienzoCursor, cursorCant);

  const domsInv: RanuraDom[] = [];
  const domsCofre: RanuraDom[] = [];

  /**
   * Intercambia, apila o recoge, según lo que haya en la ranura y en la mano.
   * Es la única operación de manipulación que existe.
   */
  function tocarRanura(inv: Inventario, indice: number): void {
    const r = inv.ranuras[indice];
    if (!r) return;
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
    opciones.alCambiar();
  }

  function crearRanura(
    indice: number,
    esBarra: boolean,
    esCofre: boolean,
  ): RanuraDom {
    const raiz = document.createElement('div');
    raiz.className = 'ranura';
    const icono = document.createElement('canvas');
    icono.className = 'icono';
    icono.width = LADO_ICONO;
    icono.height = LADO_ICONO;
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
      // Con los paneles cerrados, la barra solo selecciona.
      if (!abierto && esBarra) {
        seleccionar(indice);
        return;
      }
      const inv = esCofre ? cofre?.inv : inventario;
      if (inv) tocarRanura(inv, indice);
    });

    return { raiz, icono, cant };
  }

  for (let i = 0; i < TOTAL_RANURAS; i++) {
    const esBarra = i < RANURAS_BARRA;
    const d = crearRanura(i, esBarra, false);
    domsInv.push(d);
    (esBarra ? barra : panel).appendChild(d.raiz);
  }

  contenedor.append(barra, panel, panelCofre, panelCrafteo, cursor);

  document.addEventListener('pointermove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  function pintarRanura(d: RanuraDom, inv: Inventario, i: number, activa: boolean): void {
    const r = inv.ranuras[i];
    const vacia = !r || estaVacia(r);
    const def = defObjeto(r?.objeto ?? NADA);
    d.icono.style.display = vacia ? 'none' : 'block';
    if (!vacia) iconos.pintarEn(d.icono, r!.objeto);
    d.cant.textContent = !vacia && r!.cantidad > 1 ? String(r!.cantidad) : '';
    d.raiz.classList.toggle('activa', activa);
    d.raiz.title = vacia ? '' : `${def.nombre} ×${r!.cantidad}`;
  }

  function pintarCrafteo(): void {
    panelCrafteo.innerHTML = '';
    const titulo = document.createElement('h3');
    const estaciones = opciones.estaciones();
    titulo.textContent = taller ? taller.titulo : 'Fabricar';
    panelCrafteo.appendChild(titulo);

    // En modo taller las recetas van en rejilla de dos columnas; en el panel
    // pequeño, una debajo de otra.
    const lista = document.createElement('div');
    lista.className = 'lista';
    panelCrafteo.appendChild(lista);

    const recetas = recetasVisibles(estaciones);
    for (const receta of recetas) {
      const puede = sePuedeCraftear(inventario, receta, estaciones);
      const fila = document.createElement('div');
      fila.className = `receta${puede ? '' : ' no'}`;

      const muestra = document.createElement('canvas');
      muestra.className = 'muestra';
      muestra.width = LADO_ICONO;
      muestra.height = LADO_ICONO;
      iconos.pintarEn(muestra, receta.resultado);

      const texto = document.createElement('div');
      texto.className = 'texto';
      const nombre = document.createElement('div');
      nombre.className = 'nombre';
      const def = defObjeto(receta.resultado);
      nombre.textContent = receta.cantidad > 1 ? `${def.nombre} ×${receta.cantidad}` : def.nombre;
      const coste = document.createElement('div');
      coste.className = 'coste';
      coste.textContent = receta.ingredientes
        .map(([o, n]) => `${n} ${defObjeto(o).nombre}`)
        .join(' + ');
      texto.append(nombre, coste);

      fila.append(muestra, texto);
      if (puede) {
        fila.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (craftear(inventario, receta, opciones.estaciones())) {
            pintar();
            opciones.alCambiar();
            opciones.alFabricar?.();
          }
        });
      }
      lista.appendChild(fila);
    }

    const nota = document.createElement('div');
    nota.className = 'nota';
    nota.textContent = estaciones.size
      ? 'Acércate a otra estación para ver más recetas.'
      : 'Fabrica una mesa de trabajo y colócala cerca para desbloquear más recetas.';
    panelCrafteo.appendChild(nota);
  }

  function pintar(): void {
    for (let i = 0; i < TOTAL_RANURAS; i++) {
      pintarRanura(domsInv[i]!, inventario, i, i === seleccion);
    }
    if (cofre) {
      for (let i = 0; i < domsCofre.length; i++) {
        pintarRanura(domsCofre[i]!, cofre.inv, i, false);
      }
    }

    const activa = inventario.ranuras[seleccion]!;
    const nombre = estaVacia(activa) ? '—' : defObjeto(activa.objeto).nombre;
    info.textContent = `${nombre}   ·   capa ${capaActual === 'pared' ? 'PARED' : 'BLOQUE'}`;

    cursor.classList.toggle('lleno', enMano.objeto !== NADA);
    if (enMano.objeto !== NADA) {
      iconos.pintarEn(lienzoCursor, enMano.objeto);
      cursorCant.textContent = enMano.cantidad > 1 ? String(enMano.cantidad) : '';
    }

    if (abierto) pintarCrafteo();
  }

  function seleccionar(i: number): void {
    seleccion = ((i % RANURAS_BARRA) + RANURAS_BARRA) % RANURAS_BARRA;
    pintar();
    opciones.alCambiar();
  }

  /** Devuelve al inventario lo que quede en la mano. */
  /**
   * Devuelve a su sitio la pila que se lleva en el puntero.
   *
   * El orden importa y no es casual: primero el cofre que está abierto —de
   * donde lo más probable es que venga—, luego el inventario, y lo que aún no
   * quepa se suelta al suelo. Antes iba directo al inventario y lo que no cabía
   * se borraba, que es exactamente el caso que se da al ordenar un cofre yendo
   * cargado: se abre un cofre porque no cabe nada más, así que la rama del
   * "no cabe" no era un caso raro sino el normal.
   */
  function soltarMano(): void {
    if (enMano.objeto === NADA) return;
    let restante = enMano.cantidad;
    if (cofre) restante = cofre.inv.anadir(enMano.objeto, restante);
    if (restante > 0) restante = inventario.anadir(enMano.objeto, restante);
    if (restante > 0) opciones.alSoltarAlMundo?.(enMano.objeto, restante);
    enMano.objeto = NADA;
    enMano.cantidad = 0;
  }

  function abrirPaneles(v: boolean): void {
    abierto = v;
    panel.classList.toggle('abierto', v);
    panelCrafteo.classList.toggle('abierto', v);
    if (!v) {
      soltarMano();
      cerrarCofre();
      taller = null;
    }
    panelCrafteo.classList.toggle('taller', v && taller !== null);
    pintar();
  }

  function cerrarCofre(): void {
    cofre = null;
    panelCofre.classList.remove('abierto');
    for (const d of domsCofre) d.raiz.remove();
    domsCofre.length = 0;
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
      abrirPaneles(!abierto);
    },
    get inventarioAbierto() {
      return abierto;
    },
    get cofreAbierto() {
      return cofre ? { tx: cofre.tx, ty: cofre.ty } : null;
    },
    get tallerAbierto() {
      return taller ? { tx: taller.tx, ty: taller.ty } : null;
    },
    abrirTaller(titulo, tx, ty) {
      taller = { titulo, tx, ty };
      abrirPaneles(true);
    },
    abrirCofre(inv, tx, ty) {
      cerrarCofre();
      cofre = { inv, tx, ty };
      for (let i = 0; i < inv.ranuras.length; i++) {
        const d = crearRanura(i, false, true);
        domsCofre.push(d);
        panelCofre.appendChild(d.raiz);
      }
      panelCofre.classList.add('abierto');
      abrirPaneles(true);
    },
    cerrar() {
      abrirPaneles(false);
    },
    objetoActivo() {
      const r = inventario.ranuras[seleccion]!;
      return estaVacia(r) ? NADA : r.objeto;
    },
    refrescar(capa) {
      if (capa) capaActual = capa;
      pintar();
    },
  };
}

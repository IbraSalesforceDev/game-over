import { crearIconos, LADO_ICONO } from '../render/iconos';
import { crearFicha } from './ficha';
import { estaVacia, RANURAS_BARRA, TOTAL_RANURAS, type Inventario } from '../items/inventory';
import { defObjeto, HUECOS, NADA, type Hueco } from '../items/items';
import { cabeEnEquipo, defensaTotal } from '../items/equipado';
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

/* Equipo: tres ranuras en columna a la izquierda del inventario. Van fuera de
   la rejilla porque no son mochila: mezclarlas con las cuarenta ranuras haría
   que arrastrar una pila de tierra pudiera acabar en la cabeza. */
#equipo {
  /* Anclado por el borde derecho al lado izquierdo de la rejilla (que mide
     472 px, o sea 236 a cada lado del centro), para que no dependa de lo ancho
     que salga el propio panel. */
  position: fixed; right: 50%; margin-right: 242px; bottom: 74px;
  z-index: 41; display: none; padding: 8px; text-align: center;
  background: rgba(13,17,23,.94); border: 1px solid #2a343f; pointer-events: auto;
  font: 11px ui-monospace, monospace; color: #d8cfc0;
}
#equipo.abierto { display: block; }
#equipo .titulo {
  color: #e8b64c; letter-spacing: .12em; text-transform: uppercase;
  font-size: 10px; margin-bottom: 6px;
}
#equipo .ranura { display: block; margin-bottom: 4px; }
#equipo .ranura.hueco::after {
  content: attr(data-hueco); position: absolute; inset: 0;
  display: grid; place-items: center; color: #3f4b58; font-size: 9px;
  letter-spacing: .1em; text-transform: uppercase; pointer-events: none;
}
#equipo .defensa { color: #8fb6d6; font-size: 10px; margin-top: 4px; }

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
  /** Versión del mundo: decide qué recetas se ven. */
  version?: string;
  /** ¿Existe la armadura en esta versión? Si no, el panel de equipo no sale. */
  conEquipo?: boolean;
  /** ¿Existe la ficha de objeto en esta versión? */
  conFicha?: boolean;
}

/** Etiqueta gris que se ve en cada hueco vacío del equipo. */
const ETIQUETA_HUECO: Record<Hueco, string> = {
  cabeza: 'casco',
  torso: 'peto',
  piernas: 'grebas',
  pies: 'botas',
  manos: 'guantes',
};

export function crearBarra(
  contenedor: HTMLElement,
  inventario: Inventario,
  equipo: Inventario,
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

  const panelEquipo = document.createElement('div');
  panelEquipo.id = 'equipo';
  const tituloEquipo = document.createElement('div');
  tituloEquipo.className = 'titulo';
  tituloEquipo.textContent = 'Equipo';
  const textoDefensa = document.createElement('div');
  textoDefensa.className = 'defensa';
  panelEquipo.appendChild(tituloEquipo);

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
  const domsEquipo: RanuraDom[] = [];

  /**
   * Intercambia, apila o recoge, según lo que haya en la ranura y en la mano.
   * Es la única operación de manipulación que existe.
   */
  function tocarRanura(
    inv: Inventario,
    indice: number,
    admite: (objeto: number) => boolean = () => true,
  ): void {
    const r = inv.ranuras[indice];
    if (!r) return;
    // Sacar siempre se puede; meter, solo lo que admita la ranura. Es lo que
    // impide dejar una pila de tierra en el hueco del casco.
    if (enMano.objeto !== NADA && !admite(enMano.objeto)) return;
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

  HUECOS.forEach((hueco, i) => {
    const d = crearRanura(i, false, false);
    d.raiz.classList.add('hueco');
    d.raiz.dataset.hueco = ETIQUETA_HUECO[hueco];
    // El listener que puso `crearRanura` apunta a la mochila; este panel es
    // otra cosa, así que se reemplaza el nodo por un clon sin escuchas.
    const limpio = d.raiz.cloneNode(true) as HTMLElement;
    d.raiz.replaceWith(limpio);
    const dom: RanuraDom = {
      raiz: limpio,
      icono: limpio.querySelector('.icono')!,
      cant: limpio.querySelector('.cant')!,
    };
    limpio.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!abierto) return;
      tocarRanura(equipo, i, (objeto) => cabeEnEquipo(objeto, i));
    });
    domsEquipo.push(dom);
    panelEquipo.appendChild(limpio);
  });
  panelEquipo.appendChild(textoDefensa);

  contenedor.append(barra, panel, panelCofre, panelEquipo, panelCrafteo, cursor);

  document.addEventListener('pointermove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  // --- La ficha del objeto ---
  //
  // Un solo par de escuchas delegadas en toda la interfaz en vez de dos por
  // ranura: hay sesenta ranuras entre mochila, cofre y equipo, y algunas se
  // crean y se destruyen al abrir cofres.
  const ficha = crearFicha(contenedor, iconos);

  function anclaDe(destino: EventTarget | null): HTMLElement | null {
    return destino instanceof HTMLElement ? destino.closest('[data-objeto]') : null;
  }

  if (opciones.conFicha !== false) contenedor.addEventListener('pointerover', (e) => {
    const el = anclaDe(e.target);
    const id = Number(el?.dataset.objeto ?? 0);
    if (el && id > 0) ficha.mostrar(id, el);
    else ficha.ocultar();
  });
  contenedor.addEventListener('pointerout', (e) => {
    if (!anclaDe(e.relatedTarget)) ficha.ocultar();
  });
  // Al coger un objeto la ranura cambia de contenido bajo el ratón, y una
  // ficha que se queda describiendo lo que ya no está confunde más que ayuda.
  contenedor.addEventListener('pointerdown', () => ficha.ocultar());

  function pintarRanura(d: RanuraDom, inv: Inventario, i: number, activa: boolean): void {
    const r = inv.ranuras[i];
    const vacia = !r || estaVacia(r);
    const def = defObjeto(r?.objeto ?? NADA);
    d.icono.style.display = vacia ? 'none' : 'block';
    if (!vacia) iconos.pintarEn(d.icono, r!.objeto);
    d.cant.textContent = !vacia && r!.cantidad > 1 ? String(r!.cantidad) : '';
    d.raiz.classList.toggle('activa', activa);
    // El objeto viaja en el propio nodo: la ficha se pinta con un solo
    // listener delegado en la capa de interfaz, y así funciona igual en la
    // mochila, en el cofre y en el equipo sin repetir escuchas por ranura.
    if (vacia) delete d.raiz.dataset.objeto;
    else d.raiz.dataset.objeto = String(r!.objeto);
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

    const recetas = recetasVisibles(estaciones, opciones.version);
    for (const receta of recetas) {
      const puede = sePuedeCraftear(inventario, receta, estaciones, opciones.version);
      const fila = document.createElement('div');
      fila.className = `receta${puede ? '' : ' no'}`;
      // La ficha también sale sobre las recetas, y ahí es donde más falta
      // hace: es el sitio donde se ven objetos que todavía no se tienen.
      fila.dataset.objeto = String(receta.resultado);

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
          if (craftear(inventario, receta, opciones.estaciones(), opciones.version)) {
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

    for (let i = 0; i < domsEquipo.length; i++) {
      const d = domsEquipo[i]!;
      pintarRanura(d, equipo, i, false);
      // La etiqueta del hueco solo se ve con la ranura vacía.
      d.raiz.classList.toggle('hueco', equipo.ranuras[i]!.cantidad <= 0);
    }
    const defensa = defensaTotal(equipo);
    textoDefensa.textContent = defensa > 0 ? `defensa ${defensa}` : 'sin defensa';

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
    // Antes de 3.0.0 no había armadura: el panel no se abre porque no existe.
    panelEquipo.classList.toggle('abierto', v && opciones.conEquipo !== false);
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

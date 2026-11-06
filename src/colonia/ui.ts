/**
 * La interfaz en DOM: barra superior, tarjetas de colonos, barra de
 * herramientas, inspector, avisos y ventanas (investigación, trabajo, ayuda).
 */
import { type Colono, HABILIDADES, TRABAJOS, moodTotal, reclutar } from './colonos';
import { CRIATURAS } from './criaturas';
import { CATEGORIAS, type Categoria, EDIFICIOS, type Edificio, LISTA_EDIFICIOS, TECNOLOGIAS, type TipoEdificio, tecnologia } from './edificios';
import { luzSolar } from './maquinas';
import { MINERALES } from './mapa';
import type { Mundo } from './mundo';
import { icono } from './render';
import type { Vista } from './render';
import { ANCHO, type Coste, type ItemId, ITEMS, NOMBRE_DIR, RECETAS, TICKS_DIA, receta, textoCoste } from './tipos';

export type Herramienta =
  | { t: 'seleccionar' }
  | { t: 'construir'; tipo: TipoEdificio }
  | { t: 'orden'; orden: 'talar' | 'minar' | 'cosechar' | 'cancelar' | 'desmontar' }
  | { t: 'zona'; zona: 'almacen' | 'cultivo' | 'borrar' };

export interface Controlador {
  mundo(): Mundo;
  vista: Vista;
  herramienta: Herramienta;
  velocidad: number;
  ponerHerramienta(h: Herramienta): void;
  ponerVelocidad(v: number): void;
  centrar(x: number, y: number): void;
  guardar(): void;
  nueva(): void;
  menuPrincipal(): void;
  cargar(): void;
  /** Sustituye la partida en curso (importar). */
  poner(w: Mundo): void;
  refrescarHerramientas(): void;
  abrirAdmin(): void;
}

type Hijo = Node | string | null | undefined | false;
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...hijos: (Hijo | Hijo[])[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') e.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (typeof v === 'boolean') {
      if (v) e.setAttribute(k, '');
    } else if (v !== undefined && v !== null) e.setAttribute(k, String(v));
  }
  for (const h of hijos.flat()) if (h !== null && h !== undefined && h !== false) e.append(typeof h === 'string' ? document.createTextNode(h) : h);
  return e;
}

const urlIconos = new Map<ItemId, string>();
export function img(it: ItemId, tam = 18): HTMLImageElement {
  let u = urlIconos.get(it);
  if (!u) {
    u = icono(it).toDataURL();
    urlIconos.set(it, u);
  }
  return el('img', { src: u, width: tam, height: tam, alt: ITEMS[it].nombre, title: ITEMS[it].nombre, class: 'icono' });
}

function barra(valor: number, color: string, titulo: string): HTMLElement {
  return el('div', { class: 'barra', title: titulo }, el('div', { style: `width:${Math.max(0, Math.min(1, valor)) * 100}%;background:${color}` }));
}

function costeHTML(c: Coste): HTMLElement {
  return el(
    'span',
    { class: 'coste' },
    Object.entries(c).map(([k, v]) => el('span', { class: 'chip' }, img(k as ItemId, 14), String(v))),
  );
}

export function fmtHora(w: Mundo): string {
  const h = w.hora;
  const hh = Math.floor(h);
  const mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ ventanas

let modalesAbiertos = 0;
export const hayModal = (): boolean => modalesAbiertos > 0;

export function modal(titulo: string, ancho = 640): { cuerpo: HTMLElement; cerrar(): void } {
  const capa = el('div', { class: 'capa-modal' });
  const cuerpo = el('div', { class: 'modal-cuerpo' });
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    modalesAbiertos--;
    capa.remove();
    window.removeEventListener('keydown', tecla, true);
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cerrar();
    }
  };
  capa.append(
    el(
      'div',
      { class: 'modal', style: `max-width:${ancho}px`, role: 'dialog', 'aria-label': titulo },
      el('div', { class: 'modal-cabecera' }, el('h2', {}, titulo), el('button', { class: 'icono-boton', 'aria-label': 'Cerrar', title: 'Cerrar (Esc)', onclick: cerrar }, '✕')),
      cuerpo,
    ),
  );
  capa.addEventListener('mousedown', (e) => {
    if (e.target === capa) cerrar();
  });
  document.body.append(capa);
  modalesAbiertos++;
  window.addEventListener('keydown', tecla, true);
  return { cuerpo, cerrar };
}

export function abrirInvestigacion(ctl: Controlador): void {
  const m = modal('Investigación', 760);
  const pintar = () => {
    const w = ctl.mundo();
    m.cuerpo.replaceChildren();
    const actual = w.investigacion.actual ? tecnologia(w.investigacion.actual) : undefined;
    const hayMesa = [...w.edificios.values()].some((e) => e.tipo === 'mesaInvestigacion' && e.construido);
    m.cuerpo.append(
      el(
        'p',
        { class: 'nota' },
        hayMesa ? 'Un colono con «Investigar» activado trabajará en la mesa. Las tecnologías avanzadas gastan paquetes de ciencia, que hay que fabricar y llevar a la mesa.' : '⚠ Construye una mesa de investigación (Producción) para poder investigar.',
      ),
    );
    if (actual) {
      m.cuerpo.append(el('div', { class: 'actual' }, `Investigando: ${actual.nombre}`, barra(w.investigacion.puntos / actual.puntos, '#5aa0e0', 'Progreso')));
    }
    const lista = el('div', { class: 'tecnologias' });
    for (const t of TECNOLOGIAS) {
      const hecha = w.investigado(t.id);
      const puede = !hecha && t.requiere.every((r) => w.investigado(r));
      const desbloquea = LISTA_EDIFICIOS.filter((d) => d.tech === t.id).map((d) => d.nombre);
      const recetas = RECETAS.filter((r) => r.tech === t.id).map((r) => `receta: ${r.nombre.toLowerCase()}`);
      lista.append(
        el(
          'div',
          { class: `tec ${hecha ? 'hecha' : puede ? 'disponible' : 'bloqueada'} ${w.investigacion.actual === t.id ? 'actual' : ''}` },
          el('div', { class: 'tec-nombre' }, t.nombre),
          el('div', { class: 'sub' }, t.desc),
          el('div', { class: 'sub' }, [...desbloquea, ...recetas].join(' · ')),
          el('div', { class: 'tec-coste' }, `${t.puntos} pts`, Object.keys(t.ciencia).length ? costeHTML(t.ciencia) : null),
          !hecha && t.requiere.length ? el('div', { class: 'sub' }, `Requiere: ${t.requiere.map((r) => tecnologia(r)?.nombre).join(', ')}`) : null,
          hecha
            ? el('div', { class: 'ok' }, '✓ Investigada')
            : el(
                'button',
                {
                  class: 'pequeno',
                  disabled: !puede || w.investigacion.actual === t.id,
                  onclick: () => {
                    w.elegirInvestigacion(t.id);
                    pintar();
                  },
                },
                w.investigacion.actual === t.id ? 'En curso' : 'Investigar',
              ),
        ),
      );
    }
    m.cuerpo.append(lista);
  };
  pintar();
}

export function abrirTrabajo(ctl: Controlador): void {
  const m = modal('Prioridades de trabajo', 900);
  const pintar = () => {
    const w = ctl.mundo();
    m.cuerpo.replaceChildren(
      el('p', { class: 'nota' }, 'Clic para cambiar: 1 es lo más urgente, 4 lo menos; vacío = no lo hace. Entre paréntesis, la habilidad.'),
    );
    const tabla = el('table', { class: 'prioridades' });
    tabla.append(el('tr', {}, el('th', {}, ''), TRABAJOS.map((t) => el('th', {}, t.nombre))));
    for (const c of w.colonos.filter((x) => !x.muerto)) {
      tabla.append(
        el(
          'tr',
          {},
          el('th', { class: 'nombre' }, c.nombre),
          TRABAJOS.map((t) => {
            const p = c.prior[t.id];
            return el(
              'td',
              {},
              el(
                'button',
                {
                  class: `prio p${p}`,
                  title: `${t.nombre}: habilidad ${c.hab[t.hab]}`,
                  onclick: () => {
                    c.prior[t.id] = p === 0 ? 1 : p === 4 ? 0 : p + 1;
                    pintar();
                  },
                },
                p ? String(p) : '',
                el('span', { class: 'hab' }, `(${c.hab[t.hab]})`),
              ),
            );
          }),
        ),
      );
    }
    m.cuerpo.append(tabla);
  };
  pintar();
}

export function abrirAyuda(ctl: Controlador): void {
  const m = modal('Cómo se juega', 720);
  m.cuerpo.append(
    el('h3', {}, 'El objetivo'),
    el('p', {}, 'Tus colonos se han estrellado en un planeta hostil. Construye una base, monta una fábrica, investiga y construye el ', el('b', {}, 'Faro de rescate'), '. Mantenlo encendido con energía un día entero y vendrán a por vosotros.'),
    el('h3', {}, 'Las criaturas'),
    el('p', {}, 'Los nidos absorben la contaminación de taladros, hornos y generadores y la convierten en criaturas que vienen a destruir lo que contamina. Cuanto más contaminas, más rápido evolucionan. Además, cada pocos días llega una incursión desde el borde del mapa. Defiéndete con muros y torretas (que hay que llenar de munición), o recluta a los colonos (R) y ataca los nidos.'),
    el('h3', {}, 'Primeros pasos'),
    el(
      'ol',
      {},
      el('li', {}, 'Órdenes → Talar sobre los árboles y Minar sobre las rocas o el mineral.'),
      el('li', {}, 'Construye camas, una fogata (cocina las bayas: márcalas con Cosechar) y una mesa de investigación.'),
      el('li', {}, 'Un horno de piedra funde el mineral: en el inspector, activa «Placa de hierro». Los colonos le llevarán mineral y carbón.'),
      el('li', {}, 'Con placas y engranajes, coloca taladros de combustión sobre el mineral apuntando a un horno: ya tienes una fábrica que funciona sola.'),
      el('li', {}, 'Investiga cintas, electricidad y automatización para encadenar taladros, cintas, insertadores y ensambladoras.'),
    ),
    el('h3', {}, 'Controles'),
    el(
      'table',
      { class: 'controles' },
      [
        ['WASD / flechas / botón central', 'Mover la cámara'],
        ['Rueda', 'Zoom'],
        ['Clic', 'Seleccionar · colocar · arrastrar áreas'],
        ['Clic derecho', 'Cancelar herramienta · mover a un colono reclutado'],
        ['R', 'Girar al construir · reclutar al colono seleccionado'],
        ['Espacio', 'Pausa'],
        ['1 2 3', 'Velocidad'],
        ['P', 'Ver la contaminación'],
        ['Esc', 'Cancelar / deseleccionar'],
        ['F5 / F9', 'Guardar / cargar'],
        ['F10', 'Panel de administración'],
      ].map(([a, b]) => el('tr', {}, el('td', {}, el('kbd', {}, a!)), el('td', {}, b!))),
    ),
    el('div', { class: 'fila' }, el('button', { onclick: () => (m.cerrar(), ctl.guardar()) }, 'Guardar'), el('button', { onclick: () => (m.cerrar(), ctl.cargar()) }, 'Cargar'), el('button', { onclick: () => (m.cerrar(), ctl.abrirAdmin()) }, '⚙ Admin'), el('button', { onclick: () => (m.cerrar(), ctl.menuPrincipal()) }, 'Menú principal'), el('button', { class: 'peligro', onclick: () => (m.cerrar(), ctl.nueva()) }, 'Nueva colonia')),
  );
}

// ------------------------------------------------------------------ interfaz fija

export interface Interfaz {
  actualizar(): void;
  refrescarInspector(): void;
  pintarHerramientas(): void;
}

export function crearInterfaz(ctl: Controlador): Interfaz {
  const arriba = el('header', { class: 'arriba' });
  const colonos = el('aside', { class: 'colonos' });
  const abajo = el('nav', { class: 'abajo' });
  const submenu = el('div', { class: 'submenu' });
  const inspector = el('aside', { class: 'inspector', hidden: true });
  const avisos = el('div', { class: 'avisos' });
  const pista = el('div', { class: 'pista' });
  document.body.append(arriba, colonos, submenu, abajo, inspector, avisos, pista);

  let categoria: Categoria | 'ordenes' | 'zonas' | null = null;

  // ---------------------------------------------------- barra superior
  const reloj = el('div', { class: 'reloj' });
  const velocidades = el('div', { class: 'velocidades' });
  const recursos = el('div', { class: 'recursos' });
  const estado = el('div', { class: 'estado' });
  const botones = el(
    'div',
    { class: 'botones' },
    el('button', { onclick: () => abrirInvestigacion(ctl), title: 'Investigación' }, '🔬 Investigación'),
    el('button', { onclick: () => abrirTrabajo(ctl), title: 'Prioridades de trabajo' }, '📋 Trabajo'),
    el('button', { onclick: () => ctl.abrirAdmin(), title: 'Panel de administración (F10)' }, '⚙ Admin'),
    el('button', { onclick: () => abrirAyuda(ctl), title: 'Ayuda y menú', 'aria-label': 'Ayuda y menú' }, '☰'),
  );
  arriba.append(reloj, velocidades, recursos, estado, botones);
  const botonesVel = (
    [
      [0, '⏸', 'Pausa (Espacio)'],
      [1, '▶', 'Normal (1)'],
      [2, '▶▶', 'Rápido (2)'],
      [3, '▶▶▶', 'Muy rápido (3)'],
    ] as const
  ).map(([v, t, ti]) => el('button', { title: ti, 'aria-label': ti, onclick: () => ctl.ponerVelocidad(v) }, t));
  velocidades.append(...botonesVel);
  const pintarVelocidades = () => {
    botonesVel.forEach((b, v) => b.classList.toggle('activa', ctl.velocidad === v));
  };

  // ---------------------------------------------------- herramientas
  const pintarHerramientas = () => {
    const w = ctl.mundo();
    const h = ctl.herramienta;
    const cats: { id: Categoria | 'ordenes' | 'zonas'; nombre: string }[] = [{ id: 'ordenes', nombre: 'Órdenes' }, { id: 'zonas', nombre: 'Zonas' }, ...CATEGORIAS];
    abajo.replaceChildren(
      ...cats.map((c) =>
        el(
          'button',
          {
            class: categoria === c.id ? 'activa' : '',
            onclick: () => {
              categoria = categoria === c.id ? null : c.id;
              pintarHerramientas();
            },
          },
          c.nombre,
        ),
      ),
    );
    submenu.replaceChildren();
    submenu.hidden = !categoria;
    if (!categoria) return;
    const boton = (txt: string, activa: boolean, f: () => void, titulo = '', deshabilitado = false, extra?: HTMLElement) =>
      el('button', { class: activa ? 'activa' : '', title: titulo, onclick: f, disabled: deshabilitado }, el('span', {}, txt), extra ?? null);
    if (categoria === 'ordenes') {
      const ords: [string, 'talar' | 'minar' | 'cosechar' | 'cancelar' | 'desmontar', string][] = [
        ['🪓 Talar', 'talar', 'Arrastra sobre árboles'],
        ['⛏ Minar', 'minar', 'Arrastra sobre roca o mineral'],
        ['🫐 Cosechar', 'cosechar', 'Arrastra sobre arbustos de bayas'],
        ['🔨 Desmontar', 'desmontar', 'Arrastra sobre edificios para desmontarlos'],
        ['✕ Cancelar', 'cancelar', 'Quita órdenes y planos'],
      ];
      for (const [t, o, ti] of ords) submenu.append(boton(t, h.t === 'orden' && h.orden === o, () => ctl.ponerHerramienta({ t: 'orden', orden: o }), ti));
      return;
    }
    if (categoria === 'zonas') {
      submenu.append(
        boton('📦 Almacén', h.t === 'zona' && h.zona === 'almacen', () => ctl.ponerHerramienta({ t: 'zona', zona: 'almacen' }), 'Donde los colonos guardan las cosas'),
        boton('🥔 Cultivo', h.t === 'zona' && h.zona === 'cultivo', () => ctl.ponerHerramienta({ t: 'zona', zona: 'cultivo' }), w.investigado('agricultura') ? 'Plantarán patatas' : 'Necesita investigar Agricultura', !w.investigado('agricultura')),
        boton('✕ Borrar zona', h.t === 'zona' && h.zona === 'borrar', () => ctl.ponerHerramienta({ t: 'zona', zona: 'borrar' })),
      );
      return;
    }
    for (const d of LISTA_EDIFICIOS.filter((x) => x.cat === categoria)) {
      const ok = w.disponible(d.id);
      submenu.append(
        boton(
          d.nombre,
          h.t === 'construir' && h.tipo === d.id,
          () => ctl.ponerHerramienta({ t: 'construir', tipo: d.id }),
          ok ? `${d.desc}\nCoste: ${textoCoste(d.coste)}` : `🔒 Requiere investigar: ${tecnologia(d.tech ?? '')?.nombre}`,
          !ok,
          ok ? costeHTML(d.coste) : el('span', { class: 'sub' }, `🔒 ${tecnologia(d.tech ?? '')?.nombre}`),
        ),
      );
    }
  };

  // ---------------------------------------------------- inspector

  const accion = (txt: string, f: () => void, clase = '') => el('button', { class: `pequeno ${clase}`, onclick: () => (f(), pintarInspector()) }, txt);

  const lineaItems = (titulo: string, c: Coste) => {
    const ks = Object.keys(c).filter((k) => (c[k as ItemId] ?? 0) > 0);
    if (!ks.length) return null;
    return el('div', { class: 'linea' }, el('span', { class: 'sub' }, titulo), ks.map((k) => el('span', { class: 'chip' }, img(k as ItemId, 14), String(c[k as ItemId]))));
  };

  const inspeccionarEdificio = (w: Mundo, e: Edificio): HTMLElement[] => {
    const d = EDIFICIOS[e.tipo];
    const out: (HTMLElement | null)[] = [el('h3', {}, d.nombre), el('p', { class: 'sub' }, d.desc)];
    if (!e.construido) {
      out.push(el('p', {}, 'Plano. Faltan:'), lineaItems('', e.faltan) ?? el('p', { class: 'sub' }, 'Materiales completos: falta construir.'));
      out.push(el('div', { class: 'fila' }, accion('Cancelar plano', () => w.quitar(e, 0))));
      return out.filter(Boolean) as HTMLElement[];
    }
    out.push(el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Vida'), barra(e.hp / d.hp, '#6fd06f', `${e.hp}/${d.hp}`), `${Math.round(e.hp)}`));
    if (e.combustible || ['horno', 'taladro', 'generador'].includes(e.tipo)) {
      out.push(el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Combustible'), e.combustible ? el('span', { class: 'chip' }, img(e.combustible.item, 14), String(e.combustible.n)) : el('span', { class: 'aviso' }, 'vacío')));
    }
    if (d.consumo) out.push(el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Energía'), `${d.consumo} kW · red al ${Math.round(w.energia.sat * 100)} %`));
    out.push(lineaItems('Entrada', e.entrada));
    if (e.salida) out.push(lineaItems('Salida', { [e.salida.item]: e.salida.n }));
    if (e.progreso > 0) out.push(el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Progreso'), barra(e.progreso, '#e0b040', '')));
    switch (e.tipo) {
      case 'taladro':
      case 'taladroElectrico': {
        let quedan = 0;
        const r = e.tipo === 'taladroElectrico' ? 1 : 0;
        for (let y = e.y - r; y < e.y + 2 + r; y++) for (let x = e.x - r; x < e.x + 2 + r; x++) if (x >= 0 && y >= 0 && x < ANCHO) quedan += w.mapa.cantidad[y * ANCHO + x] ?? 0;
        out.push(el('p', {}, `Mineral bajo el taladro: ${quedan}. Sale hacia el ${NOMBRE_DIR[e.dir]}.`));
        break;
      }
      case 'ensambladora': {
        out.push(el('p', { class: 'sub' }, 'Receta:'));
        out.push(
          el(
            'div',
            { class: 'fila envolver' },
            RECETAS.filter((r) => r.estaciones.includes('ensambladora') && (!r.tech || w.investigado(r.tech))).map((r) =>
              el(
                'button',
                {
                  class: `pequeno ${e.receta === r.id ? 'activa' : ''}`,
                  title: textoCoste(r.entradas),
                  onclick: () => {
                    if (e.receta !== r.id) {
                      // Lo que había dentro de otra receta se devuelve al suelo.
                      for (const k in e.entrada) w.mapa.soltar(e.x, e.y + 2, k as ItemId, e.entrada[k as ItemId] ?? 0, ITEMS[k as ItemId].pila);
                      e.entrada = {};
                      e.progreso = 0;
                    }
                    e.receta = r.id;
                    pintarInspector();
                  },
                },
                img(r.salida, 14),
                r.nombre,
              ),
            ),
          ),
        );
        break;
      }
      case 'cofre':
        out.push(el('p', { class: 'sub' }, `${e.inv.length}/16 pilas`), el('div', { class: 'fila envolver' }, e.inv.map((p) => el('span', { class: 'chip' }, img(p.item, 14), String(p.n)))));
        break;
      case 'torreta':
        out.push(el('p', {}, `Munición: ${e.balas} disparos (${Math.ceil(e.balas / 10)} cargadores).`), el('p', { class: 'sub' }, 'Los colonos con «Abastecer» la llenan; también un insertador.'));
        break;
      case 'mesaInvestigacion': {
        const t = w.investigacion.actual ? tecnologia(w.investigacion.actual) : undefined;
        out.push(t ? el('div', {}, `Investigando ${t.nombre}`, barra(w.investigacion.puntos / t.puntos, '#5aa0e0', '')) : el('p', { class: 'aviso' }, 'No hay investigación elegida.'));
        out.push(el('div', { class: 'fila' }, accion('Elegir investigación', () => abrirInvestigacion(ctl))));
        break;
      }
      case 'generador':
        out.push(el('p', {}, `Red: ${Math.round(w.energia.demanda)} kW de ${Math.round(w.energia.capacidad)} kW disponibles.`));
        break;
      case 'faro':
        out.push(el('p', {}, `Encendido: ${((e.encendido / (TICKS_DIA / 20)) * 100).toFixed(0)} % de un día.`), e.activo ? el('p', { class: 'ok' }, 'Señal enviada…') : el('p', { class: 'aviso' }, 'Necesita 300 kW sin cortes.'));
        break;
      case 'cinta':
        out.push(el('p', {}, `Hacia el ${NOMBRE_DIR[e.dir]}.`), el('div', { class: 'fila' }, e.cinta.map((c) => img(c.item, 16))));
        break;
      case 'insertador':
        out.push(el('p', {}, `Coge del ${NOMBRE_DIR[(e.dir + 2) % 4]} y deja al ${NOMBRE_DIR[e.dir]}.`));
        break;
    }
    if (e.ordenes.length) {
      out.push(el('p', { class: 'sub' }, e.tipo === 'horno' ? 'Los colonos le traen mineral mientras haya menos de:' : 'Fabricar hasta tener en la colonia:'));
      for (const o of e.ordenes) {
        const r = receta(o.receta);
        if (!r || (r.tech && !w.investigado(r.tech))) continue;
        out.push(
          el(
            'div',
            { class: 'orden' },
            accion(o.activa ? '✓' : '○', () => (o.activa = !o.activa), o.activa ? 'activa' : ''),
            el('span', { class: 'orden-nombre' }, img(r.salida, 16), r.nombre),
            el('span', { class: 'sub' }, `${w.existencias(r.salida)}/`),
            accion('−', () => (o.cantidad = Math.max(0, o.cantidad - 5))),
            el('b', {}, String(o.cantidad)),
            accion('+', () => (o.cantidad += 5)),
          ),
        );
      }
    }
    const filas = el('div', { class: 'fila' });
    if (d.rotable) filas.append(accion('↻ Girar', () => (e.dir = ((e.dir + 1) % 4) as Edificio['dir'])));
    filas.append(accion(e.deconstruir ? 'No desmontar' : 'Desmontar', () => (e.deconstruir = !e.deconstruir), 'peligro'));
    out.push(filas);
    return out.filter(Boolean) as HTMLElement[];
  };

  const inspeccionarColono = (w: Mundo, c: Colono): HTMLElement[] => [
    el('h3', {}, c.nombre, c.reclutado ? el('span', { class: 'chip rojo' }, 'reclutado') : null),
    el('p', { class: 'sub' }, c.estado),
    el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Salud'), barra(c.hp / 100, '#e05040', ''), `${Math.round(c.hp)}`),
    el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Hambre'), barra(c.hambre, '#e0a040', ''), `${Math.round(c.hambre * 100)}`),
    el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Sueño'), barra(c.sueno, '#6a8ae0', ''), `${Math.round(c.sueno * 100)}`),
    el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Ánimo'), barra(c.animo / 100, '#60c080', ''), `${Math.round(c.animo)}`),
    c.carga ? el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Lleva'), el('span', { class: 'chip' }, img(c.carga.item, 14), String(c.carga.n))) : el('span'),
    el('div', { class: 'habilidades' }, HABILIDADES.map((h) => el('div', {}, el('span', { class: 'sub' }, h.nombre), el('b', {}, String(c.hab[h.id]))))),
    el('div', { class: 'recuerdos' }, c.recuerdos.filter((r) => r.hasta > w.tick).map((r) => el('div', { class: r.valor > 0 ? 'ok' : 'aviso' }, `${r.valor > 0 ? '+' : ''}${r.valor} ${r.texto}`)), el('div', { class: 'sub' }, `Ánimo objetivo: ${Math.round(moodTotal(c, w))}`)),
    el('div', { class: 'fila' }, accion(c.reclutado ? 'Desreclutar (R)' : 'Reclutar (R)', () => reclutar(w, c, !c.reclutado)), accion('Prioridades', () => abrirTrabajo(ctl))),
  ];

  const pintarInspector = () => {
    const w = ctl.mundo();
    const s = ctl.vista.seleccion;
    let contenido: HTMLElement[] | null = null;
    if (s?.c === 'colono') {
      const c = w.colonos.find((x) => x.id === s.id);
      if (c && !c.muerto) contenido = inspeccionarColono(w, c);
    } else if (s?.c === 'edificio') {
      const e = w.edificios.get(s.id);
      if (e) contenido = inspeccionarEdificio(w, e);
    } else if (s?.c === 'criatura') {
      const k = w.criaturas.find((x) => x.id === s.id);
      if (k) {
        const inf = CRIATURAS[k.tipo];
        contenido = [el('h3', {}, inf.nombre), el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Vida'), barra(k.hp / k.hpMax, '#e05040', ''), `${Math.round(k.hp)}`), el('p', { class: 'sub' }, `Daño ${inf.dano} · alcance ${inf.alcance} · ${k.modo === 'ataque' ? 'atacando' : 'guardando su nido'}`)];
      }
    } else if (s?.c === 'nido') {
      const n = w.nidos.find((x) => x.id === s.id);
      if (n) contenido = [el('h3', {}, 'Nido de criaturas'), el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Vida'), barra(n.hp / n.hpMax, '#c050c0', ''), `${Math.round(n.hp)}`), el('p', { class: 'sub' }, `Contaminación absorbida: ${n.ira.toFixed(0)} · criaturas esperando: ${n.grupo.length}`), el('p', { class: 'sub' }, 'Recluta colonos (R) y acércalos para destruirlo. Cuidado: los guardias saldrán.')];
    } else if (s?.c === 'casilla') {
      const i = s.i;
      const m = w.mapa;
      const min = m.mineralEn(i);
      const p = m.objetos.get(i);
      contenido = [
        el('h3', {}, m.muro[i] ? 'Roca' : ['Hierba', 'Tierra', 'Arena', 'Agua', 'Suelo rocoso'][m.suelo[i]!] ?? 'Suelo'),
        min ? el('p', {}, `${ITEMS[min].nombre}: ${m.cantidad[i]} unidades`) : el('span'),
        p ? el('div', { class: 'linea' }, el('span', { class: 'sub' }, 'Aquí hay'), el('span', { class: 'chip' }, img(p.item, 14), `${p.n} ${ITEMS[p.item].nombre.toLowerCase()}`)) : el('span'),
        m.planta[i] === 2 ? el('p', {}, `Arbusto de bayas ${m.crece[i]! >= 1 ? '(listo para cosechar)' : `(${Math.round(m.crece[i]! * 100)} %)`}`) : el('span'),
        m.planta[i] === 3 ? el('p', {}, `Patatas: ${Math.round(m.crece[i]! * 100)} %`) : el('span'),
      ];
      void MINERALES;
    }
    inspector.hidden = !contenido;
    if (contenido) inspector.replaceChildren(...contenido);
  };

  // ---------------------------------------------------- avisos
  let ultimoAviso = 0;
  const pintarAvisos = () => {
    const w = ctl.mundo();
    const recientes = w.alertas.filter((a) => w.tick - a.tick < TICKS_DIA / 3 && a.tick >= 0).slice(-6);
    const clave = recientes.length ? recientes[recientes.length - 1]!.tick + recientes.length : 0;
    if (clave === ultimoAviso) return;
    ultimoAviso = clave;
    avisos.replaceChildren(
      ...recientes.map((a) =>
        el(
          'div',
          {
            class: `aviso-${a.tipo}`,
            onclick: () => {
              if (a.x !== undefined && a.y !== undefined) ctl.centrar(a.x, a.y);
            },
            title: a.x !== undefined ? 'Clic para ir allí' : '',
          },
          `Día ${Math.floor(a.tick / TICKS_DIA) + 1}: ${a.texto}`,
        ),
      ),
    );
  };

  // ---------------------------------------------------- colonos
  // Las tarjetas se crean una vez por colono y luego solo se actualizan: si se
  // rehicieran en cada fotograma, un clic podría caer entre dos versiones.
  const tarjetas = new Map<number, { boton: HTMLButtonElement; estado: HTMLElement; barras: HTMLElement[] }>();
  let mundoTarjetas: Mundo | null = null;
  const pintarColonos = () => {
    const w = ctl.mundo();
    if (mundoTarjetas !== w) {
      tarjetas.clear();
      colonos.replaceChildren();
      mundoTarjetas = w;
    }
    const sel = ctl.vista.seleccion;
    const vivos = w.colonos.filter((c) => !c.muerto);
    for (const [id, t] of tarjetas) {
      if (!vivos.some((c) => c.id === id)) {
        t.boton.remove();
        tarjetas.delete(id);
      }
    }
    for (const c of vivos) {
      let t = tarjetas.get(c.id);
      if (!t) {
        const estado = el('div', { class: 'tarjeta-estado' });
        const barras = [barra(0, '#e05040', 'Salud'), barra(0, '#e0a040', 'Hambre'), barra(0, '#6a8ae0', 'Sueño'), barra(0, '#60c080', 'Ánimo')];
        const boton = el(
          'button',
          {
            class: 'tarjeta',
            onclick: () => {
              ctl.vista.seleccion = { c: 'colono', id: c.id };
              ctl.centrar(c.x, c.y);
              pintarInspector();
            },
          },
          el('div', { class: 'tarjeta-nombre' }, el('span', { class: 'punto', style: `background:${c.color}` }), c.nombre),
          estado,
          el('div', { class: 'mini' }, barras),
        );
        colonos.append(boton);
        t = { boton, estado, barras };
        tarjetas.set(c.id, t);
      }
      t.boton.classList.toggle('activa', sel?.c === 'colono' && sel.id === c.id);
      t.boton.classList.toggle('reclutado', c.reclutado);
      if (t.estado.textContent !== c.estado) t.estado.textContent = c.estado;
      [c.hp / 100, c.hambre, c.sueno, c.animo / 100].forEach((v, k) => {
        (t!.barras[k]!.firstElementChild as HTMLElement).style.width = `${Math.max(0, Math.min(1, v)) * 100}%`;
      });
    }
  };

  const pintarArriba = () => {
    const w = ctl.mundo();
    const sol = luzSolar(w.tick);
    reloj.textContent = `Día ${w.dia} · ${fmtHora(w)} ${sol > 0.2 ? '☀' : '☾'}`;
    const inv = w.inventario();
    const mostrar: ItemId[] = ['madera', 'piedra', 'carbon', 'hierro', 'cobre', 'placaHierro', 'placaCobre', 'engranaje', 'circuito', 'municion', 'cienciaRoja', 'cienciaVerde', 'comida'];
    recursos.replaceChildren(...mostrar.filter((k) => inv[k] > 0 || ['madera', 'piedra', 'comida', 'placaHierro'].includes(k)).map((k) => el('span', { class: 'chip', title: ITEMS[k].nombre }, img(k, 16), String(inv[k]))));
    const t = w.investigacion.actual ? tecnologia(w.investigacion.actual) : undefined;
    estado.replaceChildren(
      el('span', { class: 'chip', title: 'Energía: demanda / capacidad' }, `⚡ ${Math.round(w.energia.demanda)}/${Math.round(w.energia.capacidad)} kW`),
      el('span', { class: `chip ${w.evolucion > 0.5 ? 'rojo' : ''}`, title: 'Evolución de las criaturas' }, `🧬 ${(w.evolucion * 100).toFixed(1)} %`),
      el('span', { class: 'chip', title: 'Nidos en el mapa' }, `🪲 ${w.nidos.length} nidos`),
      t ? el('span', { class: 'chip', title: 'Investigación' }, `🔬 ${t.nombre} ${Math.floor((w.investigacion.puntos / t.puntos) * 100)} %`) : el('span', { class: 'chip aviso', title: 'Sin investigación' }, '🔬 —'),
    );
  };

  pintarVelocidades();
  pintarHerramientas();
  let n = 0;
  return {
    refrescarInspector: pintarInspector,
    actualizar() {
      n++;
      pintarVelocidades();
      if (n % 3 === 0) {
        pintarArriba();
        pintarColonos();
        pintarAvisos();
      }
      // Con el ratón encima no se repinta: así los botones no se mueven bajo el dedo.
      if (n % 10 === 0 && !inspector.matches(':hover')) pintarInspector();
      const h = ctl.herramienta;
      pista.hidden = h.t === 'seleccionar';
      pista.textContent =
        h.t === 'construir'
          ? `Colocando ${EDIFICIOS[h.tipo].nombre.toLowerCase()} — clic para colocar${EDIFICIOS[h.tipo].rotable ? ', R para girar' : ''}, clic derecho para terminar`
          : h.t === 'orden'
            ? 'Arrastra para marcar un área — clic derecho para terminar'
            : h.t === 'zona'
              ? 'Arrastra para pintar la zona — clic derecho para terminar'
              : '';
    },
    pintarHerramientas,
  };
}

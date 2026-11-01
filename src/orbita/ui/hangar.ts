/**
 * El hangar: catálogo de piezas a la izquierda, la nave en el centro y sus
 * números a la derecha.
 *
 * Un clic en una pieza de pila la inserta debajo de la seleccionada; una radial
 * se monta, por pares, en la pieza seleccionada. Supr quita, ↑ ↓ mueven.
 */
import { dibujarNave, iconoParte } from '../dibujo';
import { costeDiseno, etapas, Nave, problemasDiseno, type Diseno } from '../nave';
import { CATEGORIAS, type Categoria, PARTES, type Parte, RAZAS, costeParte, enemigoDe, esDePila, esRadial, sirveA } from '../partes';
import { hpEstacion } from '../partida';
import { natalDe } from '../sistema';
import { desbloqueada, nodoTec } from '../tecnologia';
import { cr, el, hayModal, toast } from './comun';
import { type Contexto, abrirAdmin, abrirDiplomacia, abrirMercado, abrirTecnologia } from './paneles';

export interface Hangar {
  raiz: HTMLElement;
  refrescar(): void;
  destruir(): void;
}

interface Seleccion {
  i: number;
  radial: boolean;
}

export function crearHangar(cx: Contexto, acciones: { lanzar(desdeEstacion: boolean): void; menu(): void }): Hangar {
  const p = cx.p;
  const info = RAZAS[p.raza];
  let categoria: Categoria = 'mando';
  let sel: Seleccion | null = p.actual.pila.length ? { i: p.actual.pila.length - 1, radial: false } : null;

  const raiz = el('div', { id: 'hangar', class: `raza-${p.raza}` });
  const cabecera = el('header', { class: 'hangar-cabecera' });
  const catalogo = el('aside', { class: 'catalogo' });
  const taller = el('main', { class: 'taller' });
  const ficha = el('aside', { class: 'ficha' });
  raiz.append(cabecera, catalogo, taller, ficha);

  const lienzo = el('canvas', { class: 'vista-nave' });
  const herramientas = el('div', { class: 'herramientas' });
  const nombre = el('input', { class: 'nombre-diseno', type: 'text', maxlength: 32, 'aria-label': 'Nombre del diseño' });
  nombre.value = p.actual.nombre;
  nombre.addEventListener('input', () => {
    p.actual.nombre = nombre.value || 'Sin nombre';
    cx.guardar();
  });
  taller.append(el('div', { class: 'taller-arriba' }, el('label', { class: 'etiqueta' }, 'Diseño', nombre)), lienzo, herramientas);

  const d = (): Diseno => p.actual;

  // ---------------------------------------------------------- acciones de edición

  function insertar(parte: Parte, radial: boolean): void {
    if (!desbloqueada(parte.tech, new Set(p.tecnologias))) return;
    const pila = d().pila;
    if (radial) {
      if (!sel || !pila[sel.i]) {
        toast('Selecciona primero la pieza de la pila donde montar el par lateral.', 'info');
        return;
      }
      pila[sel.i]!.radial = parte.id;
      sel = { i: sel.i, radial: true };
    } else {
      const donde = sel ? sel.i + 1 : pila.length;
      pila.splice(donde, 0, { parte: parte.id, radial: null });
      sel = { i: donde, radial: false };
    }
    cambio();
  }

  function quitar(): void {
    const pila = d().pila;
    if (!sel || !pila[sel.i]) return;
    if (sel.radial && pila[sel.i]!.radial) {
      pila[sel.i]!.radial = null;
      sel = { i: sel.i, radial: false };
    } else {
      pila.splice(sel.i, 1);
      sel = pila.length ? { i: Math.min(sel.i, pila.length - 1), radial: false } : null;
    }
    cambio();
  }

  function mover(dir: number): void {
    const pila = d().pila;
    if (!sel) return;
    const j = sel.i + dir;
    if (j < 0 || j >= pila.length) return;
    const tmp = pila[sel.i]!;
    pila[sel.i] = pila[j]!;
    pila[j] = tmp;
    sel = { i: j, radial: sel.radial };
    cambio();
  }

  function cambio(): void {
    cx.guardar();
    pintarVista();
    pintarFicha();
    pintarHerramientas();
  }

  // ---------------------------------------------------------- cabecera

  function pintarCabecera(): void {
    const dip = p.diplomacia;
    const estado = dip.estado === 'guerra' ? 'GUERRA' : dip.estado === 'tension' ? 'TENSIÓN' : 'PAZ';
    cabecera.replaceChildren(
      el('div', { class: 'marca' }, el('span', { class: 'logo' }, '◢◤'), el('div', {}, el('b', {}, 'Frontera Orbital'), el('div', { class: 'sub' }, `Hangar · ${info.nombre}`))),
      el('div', { class: 'creditos', title: 'Créditos' }, cr(p.creditos)),
      el('div', { class: `estado estado-${dip.estado}`, title: `Relación con ${RAZAS[enemigoDe(p.raza)].nombre}` }, `${RAZAS[enemigoDe(p.raza)].nombre}: ${estado}`),
      el(
        'nav',
        { class: 'fila-botones' },
        el('button', { onclick: () => abrirMercado(cx) }, 'Mercado'),
        el('button', { onclick: () => abrirTecnologia(cx) }, 'Tecnología'),
        el('button', { onclick: () => abrirDiplomacia(cx) }, 'Diplomacia'),
        el('button', { onclick: () => abrirAdmin(cx), title: 'Panel de administración (F10)' }, 'Admin'),
        el('button', { onclick: acciones.menu }, 'Menú'),
      ),
    );
  }

  // ---------------------------------------------------------- catálogo

  function pintarCatalogo(): void {
    const hechas = new Set(p.tecnologias);
    const pestanas = el(
      'div',
      { class: 'pestanas', role: 'tablist' },
      CATEGORIAS.map((c) =>
        el(
          'button',
          {
            role: 'tab',
            class: c.id === categoria ? 'activa' : '',
            'aria-selected': c.id === categoria ? 'true' : 'false',
            onclick: () => {
              categoria = c.id;
              pintarCatalogo();
            },
          },
          c.nombre,
        ),
      ),
    );
    const lista = el('div', { class: 'lista-piezas' });
    for (const parte of PARTES.filter((x) => x.cat === categoria && sirveA(x, p.raza))) {
      const libre = desbloqueada(parte.tech, hechas);
      const datos: string[] = [`${parte.masa} t`];
      if (parte.combustible) datos.push(`${parte.combustible} t comb.`);
      if (parte.empuje) datos.push(`${parte.empuje} kN · Isp ${parte.ispAtm}/${parte.ispVac}`);
      if (parte.carga) datos.push(`carga ${parte.carga} t`);
      if (parte.taladro) datos.push(`${(parte.taladro * 2).toFixed(2)} t/s (par)`);
      if (parte.arma) datos.push(parte.arma.tipo === 'rayo' ? `${parte.arma.dano} daño/s` : `${parte.arma.dano} daño`);
      if (parte.escudo) datos.push(`escudo ${parte.escudo.max}`);
      if (parte.blindaje) datos.push(`${parte.hp} de blindaje`);
      if (parte.energia) datos.push(`${parte.energia} energía`);
      if (parte.generacion) datos.push(`+${parte.generacion}/s`);
      const radialSolo = parte.montaje === 'radial';
      const tarjeta = el(
        'div',
        { class: `pieza ${libre ? '' : 'bloqueada'}`, title: parte.desc },
        iconoParte(parte, info),
        el(
          'div',
          { class: 'pieza-texto' },
          el('div', { class: 'pieza-nombre' }, parte.nombre, radialSolo ? el('span', { class: 'chip' }, 'lateral ×2') : null),
          el('div', { class: 'sub' }, datos.join(' · ')),
          el('div', { class: 'sub' }, libre ? cr(costeParte(parte, p.raza) * (radialSolo ? 2 : 1)) : `🔒 ${nodoTec(parte.tech)?.nombre ?? parte.tech}`),
        ),
      );
      if (libre) {
        const botones = el('div', { class: 'pieza-botones' });
        if (esDePila(parte)) botones.append(el('button', { class: 'pequeno', onclick: () => insertar(parte, false), title: 'Añadir a la pila, debajo de la seleccionada' }, '+ Pila'));
        if (esRadial(parte)) botones.append(el('button', { class: 'pequeno', onclick: () => insertar(parte, true), title: 'Montar un par a los lados de la pieza seleccionada' }, '+ Lateral'));
        tarjeta.append(botones);
        tarjeta.addEventListener('dblclick', () => insertar(parte, !esDePila(parte)));
      }
      lista.append(tarjeta);
    }
    catalogo.replaceChildren(pestanas, lista);
  }

  // ---------------------------------------------------------- vista

  let escalaVista = 20;
  let origenVista = { x: 0, y: 0 };

  function pintarVista(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = lienzo.getBoundingClientRect();
    const w = Math.max(100, r.width);
    const h = Math.max(100, r.height);
    lienzo.width = w * dpr;
    lienzo.height = h * dpr;
    const ctx = lienzo.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fondo: rejilla del hangar.
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, p.raza === 'alien' ? '#1a0f26' : '#121a24');
    g.addColorStop(1, p.raza === 'alien' ? '#0b0612' : '#080c12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,150,190,0.08)';
    ctx.lineWidth = 1;
    for (let x = (w / 2) % 24; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const n = Nave.desde(d());
    if (n.nodos.length === 0) {
      ctx.fillStyle = '#7f93ab';
      ctx.font = '14px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Empieza por una pieza de mando →', w / 2, h / 2 - 10);
      ctx.fillText('(pestaña «Mando» del catálogo)', w / 2, h / 2 + 12);
      return;
    }
    const geo = n.geometria;
    escalaVista = Math.min(46, (h * 0.86) / Math.max(geo.largo, 1), (w * 0.8) / Math.max(geo.anchoMax + 3, 1));
    origenVista = { x: w / 2, y: h / 2 - (geo.largo / 2) * escalaVista };
    ctx.save();
    ctx.translate(origenVista.x, origenVista.y + geo.ycm * escalaVista);
    ctx.scale(escalaVista, escalaVista);
    dibujarNave(ctx, n, 1.2 / escalaVista);
    ctx.restore();
    // Selección.
    if (sel && n.nodos[sel.i]) {
      const x = n.nodos[sel.i]!;
      const y0 = origenVista.y + (geo.ys[sel.i] ?? 0) * escalaVista;
      ctx.strokeStyle = '#ffdd66';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      if (sel.radial && x.radial) {
        const yr = y0 + (x.parte.alto / 2 - x.radial.alto / 2) * escalaVista;
        for (const s of [-1, 1]) {
          const xi = origenVista.x + s * (x.parte.ancho / 2) * escalaVista;
          const xw = x.radial.ancho * escalaVista * s;
          ctx.strokeRect(Math.min(xi, xi + xw) - 3, yr - 3, Math.abs(xw) + 6, x.radial.alto * escalaVista + 6);
        }
      } else {
        const ww = x.parte.ancho * escalaVista;
        ctx.strokeRect(origenVista.x - ww / 2 - 4, y0 - 2, ww + 8, x.parte.alto * escalaVista + 4);
      }
      ctx.setLineDash([]);
    }
    // Etapas: marcas a la izquierda.
    let etapa = 0;
    ctx.font = '11px ui-monospace, monospace';
    ctx.textAlign = 'right';
    for (let i = n.nodos.length - 1; i >= 0; i--) {
      const x = n.nodos[i]!;
      if (x.parte.forma === 'desacoplador') {
        etapa++;
        const y = origenVista.y + (geo.ys[i] ?? 0) * escalaVista;
        ctx.strokeStyle = 'rgba(232,197,71,0.5)';
        ctx.beginPath();
        ctx.moveTo(16, y);
        ctx.lineTo(origenVista.x - geo.anchoMax * escalaVista * 0.7, y);
        ctx.stroke();
        ctx.fillStyle = '#e8c547';
        ctx.textAlign = 'left';
        ctx.fillText(`etapa ${etapa + 1} ↑`, 16, y - 4);
      }
    }
    ctx.fillStyle = '#e8c547';
    ctx.textAlign = 'left';
    ctx.fillText('etapa 1 (despega)', 16, origenVista.y + geo.largo * escalaVista - 4);
  }

  lienzo.addEventListener('mousedown', (e) => {
    const r = lienzo.getBoundingClientRect();
    const mx = (e.clientX - r.left - origenVista.x) / escalaVista;
    const my = (e.clientY - r.top - origenVista.y) / escalaVista;
    const n = Nave.desde(d());
    const geo = n.geometria;
    sel = null;
    n.nodos.forEach((x, i) => {
      const y0 = geo.ys[i] ?? 0;
      if (Math.abs(mx) <= x.parte.ancho / 2 && my >= y0 && my <= y0 + x.parte.alto) sel = { i, radial: false };
      else if (x.radial) {
        const yr = y0 + x.parte.alto / 2 - x.radial.alto / 2;
        const ax = Math.abs(mx) - x.parte.ancho / 2;
        if (ax >= 0 && ax <= x.radial.ancho * 1.3 && my >= yr && my <= yr + x.radial.alto) sel = { i, radial: true };
      }
    });
    pintarVista();
    pintarHerramientas();
  });

  function pintarHerramientas(): void {
    const pila = d().pila;
    const actual = sel ? pila[sel.i] : null;
    herramientas.replaceChildren(
      el('button', { class: 'pequeno', disabled: !sel || sel.i === 0, onclick: () => mover(-1), title: 'Subir (↑)' }, '↑ Subir'),
      el('button', { class: 'pequeno', disabled: !sel || sel.i >= pila.length - 1, onclick: () => mover(1), title: 'Bajar (↓)' }, '↓ Bajar'),
      el('button', { class: 'pequeno', disabled: !actual, onclick: quitar, title: 'Quitar (Supr)' }, sel?.radial && actual?.radial ? 'Quitar laterales' : 'Quitar pieza'),
      el(
        'button',
        {
          class: 'pequeno',
          disabled: pila.length === 0,
          onclick: () => {
            if (!confirm('¿Vaciar la nave?')) return;
            d().pila = [];
            sel = null;
            cambio();
          },
        },
        'Vaciar',
      ),
      el('span', { class: 'sub' }, actual ? `Seleccionada: ${PARTES.find((x) => x.id === (sel?.radial && actual.radial ? actual.radial : actual.parte))?.nombre ?? ''}` : 'Haz clic en una pieza para seleccionarla'),
    );
  }

  // ---------------------------------------------------------- ficha

  function pintarFicha(): void {
    const dis = d();
    const n = Nave.desde(dis);
    const natal = natalDe(p.raza);
    const g = natal.gm / (natal.radio * natal.radio);
    const ets = etapas(dis, g);
    const coste = costeDiseno(dis);
    const problemas = problemasDiseno(dis);
    const dvTotal = ets.reduce((s, e) => s + e.dvVac, 0);
    const armas = n.armas().filter((m) => !m.parte.arma?.antimisil);
    const filas: [string, string][] = [
      ['Coste', cr(coste)],
      ['Masa', `${n.masa().toFixed(2)} t`],
      ['Altura', `${n.geometria.largo.toFixed(1)} m`],
      ['Δv total (vacío)', `${dvTotal.toFixed(0)} m/s`],
      ['TWR al despegar', ets[0] ? ets[0].twr.toFixed(2) : '—'],
      ['Bodega', `${n.capacidadCarga().toFixed(1)} t`],
      ['Taladro', n.ritmoTaladro() > 0 ? `${n.ritmoTaladro().toFixed(2)} t/s` : '—'],
      ['Energía', `${n.energiaMax().toFixed(0)} (+${n.generacion().toFixed(1)}/s)`],
      ['Casco', `${n.hpMax().toFixed(0)}`],
      ['Escudo', n.escudoMax() > 0 ? `${n.escudoMax()}` : '—'],
      ['Armas', armas.length ? `${armas.length}` : '—'],
    ];
    const tablaEtapas = el('table', { class: 'tabla compacta' }, el('tr', {}, el('th', {}, 'Etapa'), el('th', {}, 'Δv vacío'), el('th', {}, 'Δv aire'), el('th', {}, 'TWR'), el('th', {}, 'Quema')));
    ets.forEach((e, i) =>
      tablaEtapas.append(
        el(
          'tr',
          {},
          el('td', {}, String(i + 1)),
          el('td', { class: 'num' }, e.dvVac.toFixed(0)),
          el('td', { class: 'num' }, e.dvAtm.toFixed(0)),
          el('td', { class: `num ${i === 0 && e.twr < 1.1 ? 'baja' : ''}` }, e.twr.toFixed(2)),
          el('td', { class: 'num' }, `${e.tiempo.toFixed(0)} s`),
        ),
      ),
    );
    const astillero = p.tecnologias.includes('astillero') && hpEstacion(p, p.raza) > 0;
    const costeEst = Math.round(coste * 1.15);
    const avisos: string[] = [...problemas];
    if (!problemas.length && ets[0] && ets[0].twr < 1.05) avisos.push(`La primera etapa no despega de ${natal.nombre} (TWR < 1).`);
    if (!problemas.length && !dis.pila.some((x) => x.parte === 'paracaidas')) avisos.push('Sin paracaídas, volver a tierra es muy difícil.');
    if (p.creditos < coste) avisos.push(`Faltan ${cr(coste - p.creditos)}.`);
    ficha.replaceChildren(
      el('h3', {}, 'Nave'),
      el('dl', { class: 'datos' }, filas.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)])),
      el('h3', {}, 'Etapas'),
      tablaEtapas,
      avisos.length ? el('ul', { class: 'avisos' }, avisos.map((a) => el('li', {}, a))) : '',
      el(
        'div',
        { class: 'lanzar' },
        el(
          'button',
          { class: 'primario grande', disabled: problemas.length > 0 || p.creditos < coste, onclick: () => acciones.lanzar(false) },
          `🚀 Lanzar desde ${natal.nombre}`,
          el('div', { class: 'sub' }, cr(coste)),
        ),
        astillero
          ? el(
              'button',
              { class: 'grande', disabled: problemas.length > 0 || p.creditos < costeEst, onclick: () => acciones.lanzar(true) },
              '🛰 Lanzar desde la estación',
              el('div', { class: 'sub' }, cr(costeEst)),
            )
          : el('p', { class: 'sub' }, 'Con «Astillero orbital» podrás lanzar desde tu estación.'),
      ),
      el('h3', {}, 'Diseños guardados'),
      pintarDisenos(),
    );
  }

  function pintarDisenos(): HTMLElement {
    const cont = el('div', { class: 'disenos' });
    cont.append(
      el(
        'button',
        {
          class: 'pequeno',
          onclick: () => {
            const copia: Diseno = JSON.parse(JSON.stringify(d()));
            const i = p.disenos.findIndex((x) => x.nombre === copia.nombre);
            if (i >= 0) p.disenos[i] = copia;
            else p.disenos.push(copia);
            toast(`Diseño «${copia.nombre}» guardado.`, 'bien');
            cambio();
          },
        },
        'Guardar diseño actual',
      ),
    );
    for (const x of p.disenos) {
      cont.append(
        el(
          'div',
          { class: 'diseno' },
          el('span', {}, x.nombre, el('span', { class: 'sub' }, ` · ${cr(costeDiseno(x))}`)),
          el(
            'button',
            {
              class: 'pequeno',
              onclick: () => {
                p.actual = JSON.parse(JSON.stringify(x));
                nombre.value = p.actual.nombre;
                sel = p.actual.pila.length ? { i: 0, radial: false } : null;
                cambio();
              },
            },
            'Cargar',
          ),
          el(
            'button',
            {
              class: 'boton-icono',
              title: 'Borrar diseño',
              'aria-label': `Borrar ${x.nombre}`,
              onclick: () => {
                p.disenos = p.disenos.filter((y) => y !== x);
                cambio();
              },
            },
            '✕',
          ),
        ),
      );
    }
    return cont;
  }

  // ---------------------------------------------------------- teclado

  const tecla = (e: KeyboardEvent) => {
    if (hayModal() || (e.target instanceof HTMLInputElement && e.target.type === 'text')) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      quitar();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      mover(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      mover(1);
    } else if (e.key === 'F10') {
      e.preventDefault();
      abrirAdmin(cx);
    }
  };
  window.addEventListener('keydown', tecla);
  const alRedimensionar = () => pintarVista();
  window.addEventListener('resize', alRedimensionar);

  const refrescar = () => {
    pintarCabecera();
    pintarCatalogo();
    pintarFicha();
    pintarHerramientas();
    requestAnimationFrame(pintarVista);
  };
  refrescar();

  return {
    raiz,
    refrescar,
    destruir() {
      window.removeEventListener('keydown', tecla);
      window.removeEventListener('resize', alRedimensionar);
      raiz.remove();
    },
  };
}

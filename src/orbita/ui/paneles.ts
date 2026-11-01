/** Mercado, tecnología, diplomacia y panel de administración. */
import { costePaz, declararGuerra, firmarPaz } from '../ia';
import type { Vuelo } from '../juego';
import { MINERALES, type Mineral, cotizarVenta, masaInventario, precio, sumarInventario, vender } from '../mercado';
import { RAZAS, enemigoDe } from '../partes';
import { type Partida, borrar, hpEstacion, hpMaxEstacion } from '../partida';
import { ESTACIONES } from '../sistema';
import { RAMAS, TECNOLOGIAS, piezasDe, puedeInvestigar } from '../tecnologia';
import { cr, el, grafica, modal, toast } from './comun';

export interface Contexto {
  p: Partida;
  vuelo: Vuelo | null;
  guardar(): void;
  /** Vuelve a pintar lo que dependa de la partida (créditos, catálogo...). */
  refrescar(): void;
  sonido(e: 'venta' | 'alerta'): void;
  /** Teletransporte del panel de administración. */
  teletransportar?(destino: string): void;
  reiniciar(): void;
}

const guerra = (p: Partida) => p.diplomacia.estado === 'guerra';

// ------------------------------------------------------------ mercado

export function abrirMercado(cx: Contexto): void {
  const m = modal('Mercado de minerales', () => cx.refrescar(), 'ancho');
  const pintar = () => {
    m.cuerpo.replaceChildren();
    const p = cx.p;
    const vu = cx.vuelo;
    const venta = RAZAS[p.raza].venta;
    m.cuerpo.append(
      el(
        'p',
        { class: 'nota' },
        `Créditos: `,
        el('b', {}, cr(p.creditos)),
        ` · Vender hunde el precio; se recupera con el tiempo. ${guerra(p) ? 'En guerra el titanio y la chatarra se pagan más.' : ''}`,
      ),
    );
    if (vu && vu.acoplada) {
      const carga = masaInventario(vu.jugador.carga);
      const s = vu.costeServicio();
      m.cuerpo.append(
        el(
          'div',
          { class: 'fila-botones' },
          el(
            'button',
            {
              disabled: carga <= 0,
              onclick: () => {
                sumarInventario(p.almacen, vu.jugador.carga);
                vu.jugador.carga = {};
                toast(`Descargadas ${carga.toFixed(2)} t al almacén.`, 'bien');
                cx.guardar();
                pintar();
              },
            },
            `Descargar bodega (${carga.toFixed(2)} t)`,
          ),
          el(
            'button',
            {
              disabled: s.combustible + s.reparacion <= 0 || p.creditos < s.combustible + s.reparacion,
              onclick: () => {
                if (vu.repostarYReparar()) toast('Nave repostada y reparada.', 'bien');
                cx.guardar();
                pintar();
              },
            },
            `Repostar y reparar (${cr(s.combustible + s.reparacion)})`,
          ),
        ),
      );
    }
    const tabla = el('table', { class: 'tabla' });
    tabla.append(el('tr', {}, el('th', {}, 'Mineral'), el('th', {}, 'Precio / t'), el('th', {}, 'Últimas horas'), el('th', {}, 'En almacén'), el('th', {}, 'Vender')));
    for (const info of MINERALES) {
      const q = p.almacen[info.id] ?? 0;
      const pr = Math.round(precio(p.mercado, info.id, guerra(p)) * venta);
      const hist = p.mercado.cot[info.id].historial;
      const ant = hist.length > 1 ? hist[hist.length - 2]! : pr;
      const tend = pr > ant * 1.01 ? '▲' : pr < ant * 0.99 ? '▼' : '·';
      const botones = el('div', { class: 'fila-botones' });
      for (const cant of [1, 10, Infinity]) {
        const c = Math.min(cant, q);
        const ingreso = c > 0 ? Math.round(cotizarVenta(p.mercado, info.id, c, guerra(p)) * venta) : 0;
        botones.append(
          el(
            'button',
            {
              class: 'pequeno',
              disabled: c <= 0,
              title: c > 0 ? `Cobrarías ${cr(ingreso)}` : '',
              onclick: () => venderUno(cx, info.id, c, pintar),
            },
            cant === Infinity ? 'Todo' : `${cant} t`,
          ),
        );
      }
      tabla.append(
        el(
          'tr',
          {},
          el('td', {}, el('span', { class: 'punto', style: `background:${info.color}` }), info.nombre, el('div', { class: 'sub' }, info.desc)),
          el('td', { class: 'num' }, `${pr.toLocaleString('es')} `, el('span', { class: tend === '▲' ? 'sube' : tend === '▼' ? 'baja' : '' }, tend)),
          el('td', {}, grafica(hist, info.color)),
          el('td', { class: 'num' }, `${q.toFixed(2)} t`),
          el('td', {}, botones),
        ),
      );
    }
    m.cuerpo.append(tabla);
    const total = MINERALES.reduce((s, i) => s + (p.almacen[i.id] ?? 0), 0);
    m.cuerpo.append(
      el(
        'div',
        { class: 'fila-botones derecha' },
        el(
          'button',
          {
            class: 'primario',
            disabled: total <= 0,
            onclick: () => {
              let suma = 0;
              for (const i of MINERALES) {
                const q = p.almacen[i.id] ?? 0;
                if (q > 0) suma += Math.round(vender(p.mercado, i.id, q, guerra(p)) * venta);
                p.almacen[i.id] = 0;
              }
              p.creditos += suma;
              p.stats.ventas += suma;
              cx.sonido('venta');
              toast(`Vendido todo por ${cr(suma)}.`, 'bien');
              cx.guardar();
              pintar();
            },
          },
          'Vender todo el almacén',
        ),
      ),
    );
  };
  pintar();
}

function venderUno(cx: Contexto, m: Mineral, cant: number, pintar: () => void): void {
  const p = cx.p;
  if (cant <= 0) return;
  const ingreso = Math.round(vender(p.mercado, m, cant, guerra(p)) * RAZAS[p.raza].venta);
  p.almacen[m] = Math.max(0, (p.almacen[m] ?? 0) - cant);
  p.creditos += ingreso;
  p.stats.ventas += ingreso;
  cx.sonido('venta');
  toast(`+${cr(ingreso)}`, 'bien');
  cx.guardar();
  pintar();
}

// ------------------------------------------------------------ tecnología

export function abrirTecnologia(cx: Contexto): void {
  const m = modal('Árbol de tecnología', () => cx.refrescar(), 'ancho');
  const pintar = () => {
    m.cuerpo.replaceChildren();
    const p = cx.p;
    const hechas = new Set(p.tecnologias);
    m.cuerpo.append(el('p', { class: 'nota' }, 'Créditos: ', el('b', {}, cr(p.creditos)), ' · Cada nodo desbloquea piezas de tu raza.'));
    const rejilla = el('div', { class: 'arbol' });
    for (const rama of RAMAS) {
      const col = el('div', { class: 'rama' }, el('h3', {}, rama.nombre));
      for (const n of TECNOLOGIAS.filter((t) => t.rama === rama.id)) {
        const hecha = hechas.has(n.id);
        const puede = puedeInvestigar(n.id, hechas);
        const piezas = piezasDe(n.id, p.raza);
        const req = n.requiere.map((r) => TECNOLOGIAS.find((t) => t.id === r)?.nombre ?? r);
        col.append(
          el(
            'div',
            { class: `nodo ${hecha ? 'hecho' : puede ? 'disponible' : 'bloqueado'}` },
            el('div', { class: 'nodo-titulo' }, n.nombre),
            el('div', { class: 'sub' }, n.desc),
            piezas.length ? el('div', { class: 'sub piezas' }, piezas.join(' · ')) : null,
            req.length && !hecha ? el('div', { class: 'sub' }, `Requiere: ${req.join(', ')}`) : null,
            hecha
              ? el('div', { class: 'insignia' }, '✓ Investigado')
              : el(
                  'button',
                  {
                    class: 'pequeno primario',
                    disabled: !puede || p.creditos < n.coste,
                    onclick: () => {
                      p.creditos -= n.coste;
                      p.tecnologias.push(n.id);
                      // Fortificar la estación también la deja con la vida nueva entera.
                      if (n.id === 'defensa3' && hpEstacion(p, p.raza) > 0) p.estaciones[p.raza] = hpMaxEstacion(p, p.raza);
                      toast(`Investigado: ${n.nombre}`, 'bien');
                      cx.guardar();
                      pintar();
                    },
                  },
                  `Investigar · ${cr(n.coste)}`,
                ),
          ),
        );
      }
      rejilla.append(col);
    }
    m.cuerpo.append(rejilla);
  };
  pintar();
}

// ------------------------------------------------------------ diplomacia

export function abrirDiplomacia(cx: Contexto): void {
  const m = modal('Diplomacia y guerra', () => cx.refrescar());
  const pintar = () => {
    m.cuerpo.replaceChildren();
    const p = cx.p;
    const d = p.diplomacia;
    const enemigo = RAZAS[enemigoDe(p.raza)];
    const estado = d.estado === 'guerra' ? 'En guerra' : d.estado === 'tension' ? 'Tensión' : 'Paz';
    const rendida = d.rendidaHasta > p.t;
    m.cuerpo.append(
      el('p', {}, `Relación con la `, el('b', {}, enemigo.nombre), ` (${enemigo.pueblo}): `, el('b', { class: `estado-${d.estado}` }, estado), rendida ? ' — rendida tras perder su estación' : ''),
      el(
        'div',
        { class: 'medidores' },
        medidor('Tensión', d.tension / 100, '#ffb347', `${d.tension.toFixed(0)} / 100`),
        medidor('Fuerza de su flota', d.fuerza / 100, '#ff5a4a', `${d.fuerza.toFixed(0)} / 100`),
      ),
      el(
        'p',
        { class: 'nota' },
        'La tensión sube al minar en su territorio (el anillo de su mundo) o merodear su estación. A 100 declaran la guerra. En guerra mandan incursiones contra tus naves y tu estación; cada nave derribada les resta fuerza. Destruir su estación los obliga a rendirse.',
      ),
      el('p', { class: 'nota' }, `Derribadas: ${d.derribadas} · Victorias: ${d.victorias}`),
    );
    const acciones = el('div', { class: 'fila-botones' });
    if (d.estado !== 'guerra') {
      acciones.append(
        el(
          'button',
          {
            class: 'peligro',
            onclick: () => {
              declararGuerra(d);
              cx.sonido('alerta');
              toast(`Has declarado la guerra a la ${enemigo.nombre}.`, 'mal');
              cx.guardar();
              pintar();
            },
          },
          'Declarar la guerra',
        ),
      );
    } else {
      const coste = costePaz(d);
      acciones.append(
        el(
          'button',
          {
            disabled: p.creditos < coste,
            onclick: () => {
              p.creditos -= coste;
              firmarPaz(d);
              toast('Tratado de paz firmado.', 'bien');
              cx.guardar();
              pintar();
            },
          },
          `Comprar la paz (${cr(coste)})`,
        ),
      );
    }
    m.cuerpo.append(acciones);

    // Estaciones.
    m.cuerpo.append(el('h3', {}, 'Estaciones'));
    for (const e of ESTACIONES) {
      const hp = hpEstacion(p, e.id);
      const max = hpMaxEstacion(p, e.id);
      const propia = e.id === p.raza;
      const fila = el('div', { class: 'fila-estacion' }, medidor(`${e.nombre} (${propia ? 'tuya' : 'enemiga'})`, hp / max, propia ? '#6fe08a' : '#ff5a4a', hp <= 0 ? 'destruida' : `${hp.toFixed(0)} / ${max}`));
      if (propia && hp < max) {
        const coste = Math.ceil((max - hp) * 6);
        fila.append(
          el(
            'button',
            {
              class: 'pequeno',
              disabled: p.creditos < coste,
              onclick: () => {
                p.creditos -= coste;
                p.estaciones[e.id] = max;
                toast(`${e.nombre} reparada.`, 'bien');
                cx.guardar();
                pintar();
              },
            },
            `${hp <= 0 ? 'Reconstruir' : 'Reparar'} (${cr(coste)})`,
          ),
        );
      }
      m.cuerpo.append(fila);
    }
  };
  pintar();
}

function medidor(nombre: string, f: number, color: string, texto: string): HTMLElement {
  return el(
    'div',
    { class: 'medidor' },
    el('div', { class: 'medidor-nombre' }, nombre, el('span', {}, texto)),
    el('div', { class: 'medidor-barra' }, el('div', { style: `width:${Math.max(0, Math.min(1, f)) * 100}%;background:${color}` })),
  );
}

// ------------------------------------------------------------ administración

export function abrirAdmin(cx: Contexto): void {
  const m = modal('Panel de administración', () => cx.refrescar(), 'ancho');
  const pintar = () => {
    m.cuerpo.replaceChildren();
    const p = cx.p;
    const vu = cx.vuelo;
    const d = p.diplomacia;
    const hecho = (txt: string) => {
      toast(txt, 'info');
      cx.guardar();
      pintar();
    };
    const seccion = (titulo: string, ...hijos: (Node | null)[]) => el('section', { class: 'admin-seccion' }, el('h3', {}, titulo), ...hijos);
    const botones = (...b: HTMLElement[]) => el('div', { class: 'fila-botones' }, ...b);
    const boton = (txt: string, f: () => void, clase = 'pequeno') => el('button', { class: clase, onclick: f }, txt);
    const deslizador = (nombre: string, min: number, max: number, paso: number, valor: number, f: (v: number) => void) => {
      const salida = el('output', {}, String(valor));
      const input = el('input', { type: 'range', min, max, step: paso, value: valor });
      input.addEventListener('input', () => {
        salida.textContent = input.value;
        f(Number(input.value));
      });
      input.addEventListener('change', () => cx.guardar());
      return el('label', { class: 'deslizador' }, el('span', {}, nombre), input, salida);
    };
    const casilla = (nombre: string, valor: boolean, f: (v: boolean) => void) => {
      const input = el('input', { type: 'checkbox' });
      input.checked = valor;
      input.addEventListener('change', () => {
        f(input.checked);
        cx.guardar();
      });
      return el('label', { class: 'casilla' }, input, nombre);
    };

    m.cuerpo.append(
      el('p', { class: 'nota' }, 'Herramientas de máster para probar y ajustar la partida. Todo se guarda en este navegador.'),
      el(
        'div',
        { class: 'admin-rejilla' },
        seccion(
          'Economía',
          el('p', {}, 'Créditos: ', el('b', {}, cr(p.creditos))),
          botones(
            boton('+10 000', () => {
              p.creditos += 10_000;
              hecho('+10 000 cr');
            }),
            boton('+100 000', () => {
              p.creditos += 100_000;
              hecho('+100 000 cr');
            }),
            boton('Poner a 0', () => {
              p.creditos = 0;
              hecho('Créditos a 0');
            }),
          ),
          botones(
            boton('+10 t de cada mineral', () => {
              for (const i of MINERALES) p.almacen[i.id] = (p.almacen[i.id] ?? 0) + 10;
              hecho('Almacén lleno de muestras');
            }),
            boton('Vaciar almacén', () => {
              p.almacen = {};
              hecho('Almacén vacío');
            }),
          ),
          deslizador('Precios ×', 0.25, 4, 0.05, p.mercado.multiplicador, (v) => (p.mercado.multiplicador = v)),
          botones(
            boton('Desaturar el mercado', () => {
              for (const i of MINERALES) {
                p.mercado.cot[i.id].saturacion = 0;
                p.mercado.cot[i.id].tendencia = 0;
              }
              hecho('Precios restablecidos');
            }),
          ),
        ),
        seccion(
          'Tecnología',
          el('p', {}, `${p.tecnologias.length} de ${TECNOLOGIAS.length} investigadas`),
          botones(
            boton('Desbloquear todo', () => {
              p.tecnologias = TECNOLOGIAS.map((t) => t.id);
              if (hpEstacion(p, p.raza) > 0) p.estaciones[p.raza] = hpMaxEstacion(p, p.raza);
              hecho('Toda la tecnología desbloqueada');
            }),
            boton('Bloquear todo', () => {
              p.tecnologias = [];
              hecho('Tecnología reiniciada');
            }),
          ),
        ),
        seccion(
          'Guerra e IA',
          el('p', {}, `Estado: ${d.estado} · tensión ${d.tension.toFixed(0)} · fuerza ${d.fuerza.toFixed(0)}`),
          botones(
            boton('Paz', () => {
              firmarPaz(d);
              d.tension = 0;
              hecho('Paz');
            }),
            boton('Tensión', () => {
              d.estado = 'tension';
              d.tension = 70;
              hecho('Tensión');
            }),
            boton('Guerra', () => {
              declararGuerra(d);
              hecho('Guerra');
            }),
          ),
          deslizador('Fuerza enemiga', 0, 100, 1, Math.round(d.fuerza), (v) => (d.fuerza = v)),
          deslizador('Agresividad', 0, 2, 0.1, d.agresividad, (v) => (d.agresividad = v)),
          vu
            ? botones(
                boton('Incursión ×1', () => {
                  declararGuerra(d);
                  vu.incursion(1, 1);
                  hecho('Incursión lanzada');
                }),
                boton('Incursión ×3 nivel 2', () => {
                  declararGuerra(d);
                  vu.incursion(3, 2);
                  hecho('Incursión lanzada');
                }),
                boton('Acorazados ×2', () => {
                  declararGuerra(d);
                  vu.incursion(2, 3);
                  hecho('Incursión lanzada');
                }),
              )
            : el('p', { class: 'sub' }, 'Las incursiones a mano solo se pueden lanzar en vuelo.'),
          botones(
            boton('Reparar estaciones', () => {
              for (const e of ESTACIONES) p.estaciones[e.id] = hpMaxEstacion(p, e.id);
              hecho('Estaciones reparadas');
            }),
            boton('Dañar estación enemiga 90 %', () => {
              const id = enemigoDe(p.raza);
              p.estaciones[id] = Math.ceil(hpMaxEstacion(p, id) * 0.1);
              hecho('Estación enemiga a punto de caer');
            }),
          ),
        ),
        seccion(
          'Nave y tiempo',
          casilla('Modo dios (sin daño ni choques)', p.admin.dios, (v) => {
            p.admin.dios = v;
            if (vu) vu.jugador.inmortal = v;
          }),
          casilla('Combustible infinito', p.admin.combustible, (v) => {
            p.admin.combustible = v;
            if (vu) vu.jugador.combustibleInfinito = v;
          }),
          deslizador('Tiempo acelerado máx.', 1, 20000, 1, p.admin.warpMax, (v) => (p.admin.warpMax = v)),
          vu
            ? botones(
                boton('Repostar y reparar gratis', () => {
                  for (const x of vu.jugador.nodos) {
                    x.comb = x.parte.combustible ?? 0;
                    x.combRadial = (x.radial?.combustible ?? 0) * 2;
                    x.hp = x.parte.hp;
                    if (x.radial) x.hpRadial = x.radial.hp * 2;
                  }
                  vu.jugador.energia = vu.jugador.energiaMax();
                  vu.jugador.escudo = vu.jugador.escudoMax();
                  hecho('Nave como nueva');
                }),
              )
            : null,
          vu && cx.teletransportar
            ? botones(
                ...[
                  ['Órbita de Gaia', 'gaia'],
                  ['Cinturón', 'cinturon'],
                  ['Estación propia', 'estacion'],
                  ['Órbita de Selene', 'selene'],
                  ['Órbita de Xyl', 'xyl'],
                  ['Anillo de Xyl', 'anillo'],
                ].map(([t, id]) =>
                  boton(t!, () => {
                    cx.teletransportar!(id!);
                    hecho(`Teletransportada: ${t}`);
                  }),
                ),
              )
            : null,
          botones(
            boton('Avanzar 1 día', () => {
              p.t += 24 * 3600;
              hecho('Un día después…');
            }),
          ),
        ),
        seccion(
          'Partida',
          el('p', { class: 'sub' }, `Lanzamientos ${p.stats.lanzamientos} · perdidas ${p.stats.perdidas} · ${p.stats.toneladas.toFixed(1)} t extraídas · ${cr(p.stats.ventas)} vendidos · ${p.stats.derribos} derribos`),
          botones(
            boton('Exportar partida', () => {
              const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
              const a = el('a', { href: URL.createObjectURL(blob), download: 'frontera-orbital.json' });
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }),
            boton('Importar partida', () => {
              const input = el('input', { type: 'file', accept: 'application/json' });
              input.addEventListener('change', async () => {
                const f = input.files?.[0];
                if (!f) return;
                try {
                  const datos = JSON.parse(await f.text()) as Partida;
                  if (datos.version !== 1 || !datos.raza) throw new Error('formato');
                  Object.assign(p, datos);
                  hecho('Partida importada');
                } catch {
                  toast('Ese fichero no es una partida de Frontera Orbital.', 'mal');
                }
              });
              input.click();
            }),
            boton(
              'Borrar partida',
              () => {
                if (!confirm('¿Borrar la partida entera? No se puede deshacer.')) return;
                borrar();
                m.cerrar();
                cx.reiniciar();
              },
              'pequeno peligro',
            ),
          ),
        ),
      ),
    );
  };
  pintar();
}

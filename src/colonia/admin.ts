/**
 * Panel de administración: herramientas de máster para probar y ajustar la
 * partida. Se abre con F10, con el botón «Admin» o desde el menú.
 */
import { crearColono } from './colonos';
import { CRIATURAS, forzarEnjambres, forzarIncursion, ponerNido } from './criaturas';
import { EDIFICIOS, TECNOLOGIAS, casillas } from './edificios';
import { deserializar, serializar, borrarLocal } from './guardado';
import { Zona } from './mapa';
import type { Mundo } from './mundo';
import { ALTO, ANCHO, type ItemId, ITEMS, LISTA_ITEMS, TICKS_DIA, idx } from './tipos';
import { type Controlador, el, img, modal } from './ui';

/** Suelta objetos en el almacén de inicio (y alrededor si no caben). */
function regalar(w: Mundo, item: ItemId, n: number): void {
  const [x, y] = w.inicio;
  const resto = w.mapa.soltar(x, y + 2, item, n, ITEMS[item].pila);
  if (resto > 0) w.mapa.soltar(x, y - 4, item, resto, ITEMS[item].pila);
  for (let j = -1; j <= 5; j++) for (let i = -3; i <= 3; i++) if (w.mapa.objetos.has(idx(x + i, y + j)) && !w.mapa.edif[idx(x + i, y + j)]) w.mapa.zona[idx(x + i, y + j)] = Zona.Almacen;
}

function terminarPlanos(w: Mundo): number {
  let n = 0;
  for (const e of w.edificios.values()) {
    if (e.construido) continue;
    e.construido = true;
    e.faltan = {};
    e.trabajo = 0;
    e.hp = EDIFICIOS[e.tipo].hp;
    for (const [x, y] of casillas(e)) w.terrenoCambiado(idx(x, y));
    n++;
  }
  return n;
}

export function abrirAdmin(ctl: Controlador): void {
  const m = modal('Panel de administración', 980);
  let item: ItemId = 'placaHierro';

  const pintar = () => {
    const w = ctl.mundo();
    const hecho = (txt: string) => {
      w.avisar(`Admin: ${txt}`, 'info');
      pintar();
    };
    const boton = (txt: string, f: () => void, clase = 'pequeno') => el('button', { class: clase, onclick: f }, txt);
    const fila = (...hijos: HTMLElement[]) => el('div', { class: 'fila envolver' }, ...hijos);
    const seccion = (titulo: string, ...hijos: (HTMLElement | null)[]) => el('section', { class: 'admin-seccion' }, el('h3', {}, titulo), ...hijos);
    const casilla = (txt: string, valor: boolean, f: (v: boolean) => void) => {
      const input = el('input', { type: 'checkbox' });
      input.checked = valor;
      input.addEventListener('change', () => {
        f(input.checked);
        w.avisar(`Admin: ${txt} ${input.checked ? 'activado' : 'desactivado'}`, 'info');
      });
      return el('label', { class: 'casilla' }, input, txt);
    };

    // ---------------------------------------------------- recursos
    const selector = el('div', { class: 'selector-items' });
    for (const it of LISTA_ITEMS) {
      selector.append(
        el(
          'button',
          {
            class: `item ${it === item ? 'activa' : ''}`,
            title: ITEMS[it].nombre,
            'aria-label': ITEMS[it].nombre,
            onclick: () => {
              item = it;
              pintar();
            },
          },
          img(it, 22),
        ),
      );
    }

    const vivos = w.colonos.filter((c) => !c.muerto);
    const muertos = w.colonos.filter((c) => c.muerto);
    const t = w.investigacion.actual ? TECNOLOGIAS.find((x) => x.id === w.investigacion.actual) : undefined;

    const evolucion = el('input', { type: 'range', min: 0, max: 100, step: 1, value: Math.round(w.evolucion * 100) });
    const salidaEvo = el('output', {}, `${Math.round(w.evolucion * 100)} %`);
    evolucion.addEventListener('input', () => {
      w.evolucion = Number(evolucion.value) / 100;
      salidaEvo.textContent = `${evolucion.value} %`;
    });

    m.cuerpo.replaceChildren(
      el('p', { class: 'nota' }, 'Herramientas de máster. Los cambios se aplican al momento y se guardan con la partida.'),
      el(
        'div',
        { class: 'admin-rejilla' },
        seccion(
          'Recursos',
          selector,
          el('p', { class: 'sub' }, `${ITEMS[item].nombre}: ${w.existencias(item)} en la colonia`),
          fila(
            ...[10, 100, 1000].map((n) =>
              boton(`+${n}`, () => {
                regalar(w, item, n);
                hecho(`+${n} ${ITEMS[item].nombre.toLowerCase()}`);
              }),
            ),
          ),
          fila(
            boton('+100 de todo', () => {
              for (const it of LISTA_ITEMS) regalar(w, it, 100);
              hecho('+100 de cada objeto');
            }),
            boton(
              'Vaciar el suelo',
              () => {
                w.mapa.objetos.clear();
                hecho('objetos del suelo borrados');
              },
              'pequeno peligro',
            ),
          ),
        ),
        seccion(
          'Investigación',
          el('p', { class: 'sub' }, `${w.investigacion.hechas.length} de ${TECNOLOGIAS.length} investigadas${t ? ` · en curso: ${t.nombre}` : ''}`),
          fila(
            boton('Desbloquear todo', () => {
              w.investigacion = { hechas: TECNOLOGIAS.map((x) => x.id), actual: null, puntos: 0, gastado: {} };
              hecho('toda la tecnología desbloqueada');
              ctl.refrescarHerramientas();
            }),
            boton('Terminar la actual', () => {
              if (!t) return hecho('no hay investigación en curso');
              w.investigacion = { ...w.investigacion, hechas: [...w.investigacion.hechas, t.id], actual: null, puntos: 0, gastado: {} };
              hecho(`${t.nombre} terminada`);
              ctl.refrescarHerramientas();
            }),
            boton(
              'Olvidarlo todo',
              () => {
                w.investigacion = { hechas: [], actual: null, puntos: 0, gastado: {} };
                hecho('investigación reiniciada');
                ctl.refrescarHerramientas();
              },
              'pequeno peligro',
            ),
          ),
        ),
        seccion(
          'Colonos',
          el('p', { class: 'sub' }, `${vivos.length} vivos${muertos.length ? ` · ${muertos.length} muertos` : ''}`),
          casilla('Modo dios (no reciben daño)', w.admin.dios, (v) => (w.admin.dios = v)),
          fila(
            boton('Curar y saciar a todos', () => {
              for (const c of vivos) {
                c.hp = 100;
                c.hambre = 1;
                c.sueno = 1;
                c.animo = 80;
                c.crisis = 0;
              }
              hecho('colonos curados y descansados');
            }),
            boton('Habilidades al máximo', () => {
              for (const c of vivos) for (const k in c.hab) c.hab[k as keyof typeof c.hab] = 10;
              hecho('habilidades a 10');
            }),
          ),
          fila(
            boton('Añadir colono', () => {
              const c = crearColono(w, w.inicio[0], w.inicio[1]);
              w.colonos.push(c);
              hecho(`${c.nombre} se une a la colonia`);
            }),
            muertos.length
              ? boton('Resucitar a los muertos', () => {
                  for (const c of muertos) {
                    c.muerto = false;
                    c.hp = 100;
                    c.hambre = 0.8;
                    c.sueno = 0.8;
                    c.x = w.inicio[0] + 0.5;
                    c.y = w.inicio[1] + 0.5;
                  }
                  w.perdido = false;
                  hecho('los muertos vuelven a la vida');
                })
              : el('span'),
          ),
        ),
        seccion(
          'Construcción y fábrica',
          casilla('Construcción instantánea y gratis', w.admin.gratis, (v) => (w.admin.gratis = v)),
          casilla('Combustible infinito', w.admin.combustible, (v) => (w.admin.combustible = v)),
          casilla('Energía infinita', w.admin.energia, (v) => (w.admin.energia = v)),
          fila(
            boton('Terminar todos los planos', () => hecho(`${terminarPlanos(w)} planos terminados`)),
            boton('Reparar todo', () => {
              for (const e of w.edificios.values()) if (e.construido) e.hp = EDIFICIOS[e.tipo].hp;
              hecho('edificios reparados');
            }),
            boton('Llenar torretas', () => {
              for (const e of w.edificios.values()) if (e.tipo === 'torreta') e.balas = 200;
              hecho('torretas llenas de munición');
            }),
          ),
        ),
        seccion(
          'Criaturas',
          el('p', { class: 'sub' }, `${w.criaturas.length} criaturas · ${w.nidos.length} nidos`),
          casilla('Modo pacífico (sin oleadas, incursiones ni nidos nuevos)', w.admin.pacifico, (v) => (w.admin.pacifico = v)),
          el('label', { class: 'deslizador' }, el('span', {}, 'Evolución'), evolucion, salidaEvo),
          fila(
            ...[5, 15, 30].map((n) =>
              boton(`Incursión de ${n}`, () => {
                forzarIncursion(w, n);
                pintar();
              }),
            ),
            boton('Sacar enjambres', () => {
              forzarEnjambres(w);
              pintar();
            }),
          ),
          fila(
            boton('Matar a todas', () => {
              const n = w.criaturas.length;
              w.criaturas = [];
              hecho(`${n} criaturas eliminadas`);
            }),
            boton('Destruir todos los nidos', () => {
              for (const n of w.nidos) n.hp = 0;
              hecho('nidos destruidos');
            }),
            boton('Nido nuevo', () => {
              for (let k = 0; k < 100; k++) {
                const [x, y] = w.bordeAleatorio();
                const nx = Math.max(2, Math.min(ANCHO - 4, x + (x < 5 ? 3 : -3)));
                const ny = Math.max(2, Math.min(ALTO - 4, y + (y < 5 ? 3 : -3)));
                if (ponerNido(w, nx, ny)) return hecho('nido nuevo en el borde del mapa');
              }
              hecho('no se ha encontrado sitio para el nido');
            }),
            boton('Limpiar contaminación', () => {
              w.mapa.contaminacion.fill(0);
              hecho('contaminación limpiada');
            }),
          ),
          el('p', { class: 'sub' }, Object.values(CRIATURAS).map((c) => `${c.nombre}: ${c.hp} de vida`).join(' · ')),
        ),
        seccion(
          'Tiempo',
          el('p', { class: 'sub' }, `Día ${w.dia}`),
          fila(
            boton('Ir a las 7:00', () => {
              const base = Math.floor(w.tick / TICKS_DIA) * TICKS_DIA;
              const objetivo = base + Math.floor(TICKS_DIA * (7 / 24));
              w.tick = objetivo > w.tick ? objetivo : objetivo + TICKS_DIA;
              hecho('amanece');
            }),
            boton('Ir a las 22:00', () => {
              const base = Math.floor(w.tick / TICKS_DIA) * TICKS_DIA;
              const objetivo = base + Math.floor(TICKS_DIA * (22 / 24));
              w.tick = objetivo > w.tick ? objetivo : objetivo + TICKS_DIA;
              hecho('anochece');
            }),
            boton('Saltar un día', () => {
              w.tick += TICKS_DIA;
              hecho('un día después');
            }),
          ),
          fila(boton(ctl.velocidad === 4 ? 'Turbo ×15 (activo)' : 'Turbo ×15', () => (ctl.ponerVelocidad(4), pintar()), ctl.velocidad === 4 ? 'pequeno activa' : 'pequeno'), el('span', { class: 'sub' }, 'Se quita con 1, 2, 3 o Espacio.')),
        ),
        seccion(
          'Partida',
          fila(
            boton('Exportar', () => {
              const blob = new Blob([serializar(w)], { type: 'application/json' });
              const a = el('a', { href: URL.createObjectURL(blob), download: `colonia-oxido-dia${w.dia}.json` });
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            }),
            boton('Importar', () => {
              const input = el('input', { type: 'file', accept: 'application/json,.json' });
              input.addEventListener('change', async () => {
                const f = input.files?.[0];
                if (!f) return;
                const nuevo = deserializar(await f.text());
                if (!nuevo) return w.avisar('Ese fichero no es una partida de Colonia Óxido.', 'aviso');
                ctl.poner(nuevo);
                nuevo.avisar('Admin: partida importada', 'info');
                m.cerrar();
              });
              input.click();
            }),
            boton(
              'Borrar el guardado',
              () => {
                if (!confirm('¿Borrar la partida guardada en este navegador? La que estás jugando sigue abierta.')) return;
                borrarLocal();
                hecho('guardado borrado');
              },
              'pequeno peligro',
            ),
          ),
          el('p', { class: 'sub' }, `Semilla del mapa: ${w.semilla}`),
        ),
      ),
    );
  };
  pintar();
}

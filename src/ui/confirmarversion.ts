import { NOMBRE_ETAPA, version } from '../core/versiones';
import type { PlanMigracion } from '../world/migracion';

/**
 * La pantalla que enseña lo que va a pasar antes de cambiar de versión.
 *
 * Existe porque bajar un mundo de versión rompe cosas a propósito y eso no se
 * puede hacer a espaldas de quien juega. No dice "puede que pierdas objetos":
 * dice cuántos bloques de qué clase se convierten en qué, y cuántos objetos
 * concretos desaparecen del zurrón. Un aviso sin números no ayuda a decidir, y
 * lo único que consigue es que se acepte sin leer.
 *
 * Se calcula sobre el mundo de verdad, ya cargado, así que llega después de la
 * pantalla de carga y no antes: es el precio de que las cifras sean ciertas.
 */

const ESTILO = `
#migracion {
  position: fixed; inset: 0; z-index: 92; pointer-events: auto; display: none;
  align-items: center; justify-content: center; padding: 24px;
  background: radial-gradient(ellipse at 50% 35%, #1b2430 0%, #0d1117 70%), #0d1117;
  font: 12px ui-monospace, monospace; color: #c9d4e0;
}
#migracion.visible { display: flex; }
#migracion .caja { width: min(560px, 100%); max-height: 100%; overflow-y: auto; }
#migracion h2 {
  font-size: 13px; letter-spacing: .18em; text-transform: uppercase;
  color: #e8b64c; margin-bottom: 6px;
}
#migracion .salto { color: #8b98a8; margin-bottom: 16px; line-height: 1.6; }
#migracion .salto b { color: #d8cfc0; font-weight: normal; }
#migracion h3 {
  font-size: 10px; letter-spacing: .16em; text-transform: uppercase;
  color: #7f8c9b; margin: 16px 0 7px; border-top: 1px solid #1f2731; padding-top: 12px;
}
#migracion ul { margin: 0 0 0 15px; color: #93a0ae; line-height: 1.7; }
#migracion li b { color: #d8cfc0; font-weight: normal; }
#migracion .aviso { color: #b08a4a; line-height: 1.7; }
#migracion .nada { color: #6d7a8a; }
#migracion .botones { display: flex; gap: 10px; margin-top: 22px; }
#migracion button {
  padding: 9px 16px; cursor: pointer; background: #1c242e; color: #d8cfc0;
  border: 1px solid #38434f; font: 11px ui-monospace, monospace;
}
#migracion button:hover { background: #26313d; border-color: #4a5765; }
#migracion button.principal { background: #3a2f16; border-color: #7a6428; color: #e8b64c; }
#migracion button.principal:hover { background: #4a3c1c; }
#migracion .pie { margin-top: 18px; color: #55606d; font-size: 10px; line-height: 1.7; }
`;

/** Enseña el plan y espera. `true` es adelante, `false` es volver al menú. */
export function confirmarVersion(
  contenedor: HTMLElement,
  plan: PlanMigracion,
  nombreMundo: string,
): Promise<boolean> {
  const estilo = document.createElement('style');
  estilo.textContent = ESTILO;
  document.head.appendChild(estilo);

  const capa = document.createElement('div');
  capa.id = 'migracion';
  const caja = document.createElement('div');
  caja.className = 'caja';
  capa.appendChild(caja);

  const a = version(plan.desde);
  const b = version(plan.hasta);
  const lista = (
    titulo: string,
    filas: readonly string[],
    vacio: string,
  ): string =>
    `<h3>${titulo}</h3>` +
    (filas.length > 0
      ? `<ul>${filas.map((f) => `<li>${f}</li>`).join('')}</ul>`
      : `<div class="nada">${vacio}</div>`);

  const numero = (n: number): string => n.toLocaleString('es-ES');

  caja.innerHTML =
    `<h2>${plan.retrocede ? 'Bajar de versión' : 'Subir de versión'}</h2>` +
    `<div class="salto"><b>${nombreMundo}</b> pasa de <b>${a.id} ${a.nombre}</b> ` +
    `a <b>${b.id} ${b.nombre}</b> <span class="nada">(${NOMBRE_ETAPA[b.etapa]})</span>.<br>` +
    'Lo que has construido se conserva, con un margen de terreno alrededor. ' +
    'Lo que nunca tocaste pasa a ser lo que sería en la otra versión.</div>' +
    lista(
      'Bloques que cambian',
      plan.bloques.map(
        (c) =>
          `<b>${numero(c.cuantos)}</b> de ${c.nombre} → ${c.enQue}`,
      ),
      'Ninguno: todos los bloques de este mundo existen en la otra versión.',
    ) +
    lista(
      'Objetos que se pierden',
      plan.objetos.map((o) => `<b>${numero(o.cuantos)}</b> × ${o.nombre}`),
      'Ninguno: todo lo que llevas existe en la otra versión.',
    ) +
    (plan.avisos.length > 0
      ? `<h3>Además</h3><div class="aviso">${plan.avisos.join('<br>')}</div>`
      : '') +
    '<div class="botones">' +
    '<button class="principal" id="mig-si">Cambiar de versión</button>' +
    '<button id="mig-no">Dejarlo como está</button>' +
    '</div>' +
    '<div class="pie">No hay vuelta atrás automática: lo que se pierda al bajar ' +
    'no vuelve al subir. Si te importa el mundo, cópialo antes desde el menú.</div>';

  contenedor.appendChild(capa);
  capa.classList.add('visible');

  return new Promise<boolean>((resolver) => {
    const cerrar = (si: boolean): void => {
      capa.remove();
      estilo.remove();
      resolver(si);
    };
    caja.querySelector('#mig-si')!.addEventListener('click', () => cerrar(true));
    caja.querySelector('#mig-no')!.addEventListener('click', () => cerrar(false));
  });
}

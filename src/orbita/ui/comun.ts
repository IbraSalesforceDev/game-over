/** Utilidades de DOM: crear elementos y abrir ventanas modales. */

type Hijo = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | ((e: Event) => void)> = {},
  ...hijos: (Hijo | Hijo[])[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') e.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (k === 'class') e.className = String(v);
    else if (typeof v === 'boolean') {
      if (v) e.setAttribute(k, '');
    } else e.setAttribute(k, String(v));
  }
  for (const h of hijos.flat()) {
    if (h === null || h === undefined || h === false) continue;
    e.append(typeof h === 'string' ? document.createTextNode(h) : h);
  }
  return e;
}

export function cr(n: number): string {
  return `${Math.round(n).toLocaleString('es')} cr`;
}

export interface Modal {
  cuerpo: HTMLElement;
  cerrar(): void;
}

let abiertos = 0;

export function hayModal(): boolean {
  return abiertos > 0;
}

/** Abre una ventana sobre todo lo demás. Esc o el aspa la cierran. */
export function modal(titulo: string, alCerrar?: () => void, clase = ''): Modal {
  const capa = el('div', { class: 'capa-modal' });
  const cuerpo = el('div', { class: 'modal-cuerpo' });
  let cerrado = false;
  const cerrar = () => {
    if (cerrado) return;
    cerrado = true;
    abiertos--;
    capa.remove();
    window.removeEventListener('keydown', tecla, true);
    alCerrar?.();
  };
  const tecla = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      cerrar();
    }
  };
  const ventana = el(
    'div',
    { class: `modal ${clase}`, role: 'dialog', 'aria-label': titulo },
    el('div', { class: 'modal-cabecera' }, el('h2', {}, titulo), el('button', { class: 'boton-icono', title: 'Cerrar (Esc)', 'aria-label': 'Cerrar', onclick: cerrar }, '✕')),
    cuerpo,
  );
  capa.append(ventana);
  capa.addEventListener('mousedown', (e) => {
    if (e.target === capa) cerrar();
  });
  document.body.append(capa);
  abiertos++;
  window.addEventListener('keydown', tecla, true);
  return { cuerpo, cerrar };
}

export function toast(texto: string, tipo: 'bien' | 'mal' | 'info' = 'info'): void {
  let cont = document.getElementById('toasts');
  if (!cont) {
    cont = el('div', { id: 'toasts' });
    document.body.append(cont);
  }
  const t = el('div', { class: `toast toast-${tipo}` }, texto);
  cont.append(t);
  setTimeout(() => t.classList.add('fuera'), 2600);
  setTimeout(() => t.remove(), 3100);
}

/** Pequeño gráfico de línea con el historial de un precio. */
export function grafica(valores: number[], color: string, w = 120, h = 32): HTMLCanvasElement {
  const cv = el('canvas', { width: w * 2, height: h * 2, class: 'grafica' });
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  const ctx = cv.getContext('2d')!;
  ctx.scale(2, 2);
  if (valores.length < 2) return cv;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const r = max - min || 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  valores.forEach((v, i) => {
    const x = (i / (valores.length - 1)) * (w - 2) + 1;
    const y = h - 2 - ((v - min) / r) * (h - 4);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  return cv;
}

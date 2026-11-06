/**
 * Menú de inicio y pantalla de «Nueva colonia»: dificultad, tamaño del mapa y
 * cómo es el terreno, con una vista previa que se regenera al cambiar algo.
 */
import { type Config, DIFICULTADES, type Dificultad, NIVELES, NIVELES_MINERAL, type Nivel, RECURSOS_INICIALES, TAMANOS, type Tamano, configPorDefecto } from './config';
import { MINERALES, Planta, Suelo, generar } from './mapa';
import { ALTO, ANCHO, fijarTamano } from './tipos';
import { el } from './ui';

const CLAVE_CONFIG = 'colonia-oxido.config';

let abierto: HTMLElement | null = null;
export const menuAbierto = (): boolean => abierto !== null;

function cerrar(): void {
  abierto?.remove();
  abierto = null;
}

function abrir(contenido: HTMLElement): void {
  cerrar();
  abierto = el('div', { class: 'menu-inicio' }, contenido);
  document.body.append(abierto);
}

export function ultimaConfig(): Config {
  try {
    const s = localStorage.getItem(CLAVE_CONFIG);
    if (s) return { ...configPorDefecto(), ...JSON.parse(s), semilla: Math.floor(Math.random() * 1e9) };
  } catch {
    /* nada */
  }
  return configPorDefecto();
}

function recordarConfig(c: Config): void {
  try {
    localStorage.setItem(CLAVE_CONFIG, JSON.stringify(c));
  } catch {
    /* nada */
  }
}

export interface AccionesMenu {
  hayPartida: boolean;
  continuar(): void;
  empezar(c: Config): void;
  importar(): void;
  ayuda(): void;
}

// ------------------------------------------------------------------ pantalla de inicio

export function abrirInicio(a: AccionesMenu): void {
  abrir(
    el(
      'div',
      { class: 'menu-caja' },
      el('h1', {}, 'Colonia', el('br'), 'Óxido'),
      el('p', { class: 'lema' }, 'Colonos · fábricas · criaturas que odian el humo'),
      a.hayPartida ? el('button', { class: 'primario grande', onclick: () => (cerrar(), a.continuar()) }, 'Continuar la partida') : null,
      el('button', { class: a.hayPartida ? 'grande' : 'primario grande', onclick: () => abrirNueva(a) }, 'Nueva colonia'),
      el('button', { class: 'grande', onclick: () => a.importar() }, 'Cargar partida desde archivo'),
      el('button', { class: 'grande', onclick: () => a.ayuda() }, 'Cómo se juega'),
      el('p', { class: 'sub' }, 'Las partidas se guardan solas en este navegador.'),
    ),
  );
}

// ------------------------------------------------------------------ nueva colonia

/** Genera el mapa de una configuración sin tocar el tamaño de la partida en curso. */
function previa(c: Config, lienzo: HTMLCanvasElement): { nidos: number; ancho: number; alto: number } {
  const antes: [number, number] = [ANCHO, ALTO];
  const t = TAMANOS[c.tamano];
  fijarTamano(t.ancho, t.alto);
  try {
    const g = generar(c);
    const m = g.mapa;
    const img = new ImageData(ANCHO, ALTO);
    const COL: Record<number, [number, number, number]> = {
      [Suelo.Hierba]: [93, 125, 60],
      [Suelo.Tierra]: [122, 99, 64],
      [Suelo.Arena]: [201, 178, 122],
      [Suelo.Agua]: [47, 95, 138],
      [Suelo.Roca]: [110, 106, 98],
    };
    const MIN: Record<string, [number, number, number]> = { hierro: [143, 163, 187], cobre: [217, 138, 82], carbon: [30, 30, 32], piedra: [196, 187, 168] };
    for (let i = 0; i < ANCHO * ALTO; i++) {
      let col = COL[m.suelo[i]!]!;
      if (m.muro[i]) col = [70, 67, 61];
      else if (m.mineral[i]) col = MIN[MINERALES[m.mineral[i]! - 1]!]!;
      else if (m.planta[i] === Planta.Arbol) col = [44, 84, 34];
      img.data[i * 4] = col[0];
      img.data[i * 4 + 1] = col[1];
      img.data[i * 4 + 2] = col[2];
      img.data[i * 4 + 3] = 255;
    }
    const tmp = document.createElement('canvas');
    tmp.width = ANCHO;
    tmp.height = ALTO;
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    const ctx = lienzo.getContext('2d')!;
    ctx.fillStyle = '#0c0f13';
    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
    const k = Math.min(lienzo.width / ANCHO, lienzo.height / ALTO);
    const ox = (lienzo.width - ANCHO * k) / 2;
    const oy = (lienzo.height - ALTO * k) / 2;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, ox, oy, ANCHO * k, ALTO * k);
    // Nidos y punto de llegada.
    for (const [x, y] of g.nidos) {
      ctx.fillStyle = '#c050c0';
      ctx.strokeStyle = '#1a0a14';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ox + (x + 1) * k, oy + (y + 1) * k, Math.max(4, k * 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const [sx, sy] = g.inicio;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox + sx * k, oy + sy * k, Math.max(6, k * 3), 0, Math.PI * 2);
    ctx.stroke();
    return { nidos: g.nidos.length, ancho: ANCHO, alto: ALTO };
  } finally {
    fijarTamano(antes[0], antes[1]);
  }
}

export function abrirNueva(a: AccionesMenu, base?: Config): void {
  const c: Config = { ...(base ?? ultimaConfig()) };
  const lienzo = el('canvas', { width: 480, height: 360, class: 'previa', 'aria-label': 'Vista previa del mapa' });
  const resumen = el('p', { class: 'sub' });
  const opciones = el('div', { class: 'opciones' });

  let pendiente = 0;
  const actualizarPrevia = () => {
    cancelAnimationFrame(pendiente);
    pendiente = requestAnimationFrame(() => {
      const r = previa(c, lienzo);
      const pedidos = c.nidos;
      resumen.textContent = `${r.ancho} × ${r.alto} casillas · ${r.nidos} nidos${r.nidos < pedidos ? ` (no caben más de ${r.nidos})` : ''} · ${c.colonos} colonos · semilla ${c.semilla}`;
    });
  };

  const segmentado = <T extends string | number>(titulo: string, valores: { v: T; t: string; titulo?: string }[], actual: () => T, poner: (v: T) => void, nota?: () => string) => {
    const fila = el('div', { class: 'segmentado', role: 'radiogroup', 'aria-label': titulo });
    const texto = el('p', { class: 'sub nota-opcion' });
    const pintar = () => {
      fila.replaceChildren(
        ...valores.map((x) =>
          el(
            'button',
            {
              class: actual() === x.v ? 'activa' : '',
              role: 'radio',
              'aria-checked': actual() === x.v ? 'true' : 'false',
              title: x.titulo ?? '',
              onclick: () => {
                poner(x.v);
                pintar();
                actualizarPrevia();
              },
            },
            x.t,
          ),
        ),
      );
      texto.textContent = nota ? nota() : '';
    };
    pintar();
    return el('div', { class: 'opcion' }, el('div', { class: 'opcion-titulo' }, titulo), fila, nota ? texto : null);
  };

  const deslizador = (titulo: string, min: number, max: number, actual: () => number, poner: (v: number) => void) => {
    const salida = el('output', {}, String(actual()));
    const input = el('input', { type: 'range', min, max, step: 1, value: actual(), 'aria-label': titulo });
    input.addEventListener('input', () => {
      poner(Number(input.value));
      salida.textContent = input.value;
      actualizarPrevia();
    });
    return el('div', { class: 'opcion' }, el('div', { class: 'opcion-titulo' }, titulo), el('div', { class: 'deslizador' }, input, salida));
  };

  const niveles = (titulo: string, nombres: readonly string[], clave: 'agua' | 'montanas' | 'bosque' | 'mineral') =>
    segmentado<Nivel>(
      titulo,
      nombres.map((t, i) => ({ v: i as Nivel, t })),
      () => c[clave],
      (v) => (c[clave] = v),
    );

  const semilla = el('input', { type: 'text', inputmode: 'numeric', value: String(c.semilla), 'aria-label': 'Semilla del mapa', class: 'semilla' });
  semilla.addEventListener('input', () => {
    const t = semilla.value.trim();
    // Cualquier texto vale: se convierte en número.
    let h = 0;
    if (/^\d+$/.test(t)) h = Number(t) % 1e9;
    else for (const ch of t) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0;
    c.semilla = h % 1e9;
    actualizarPrevia();
  });

  const pintarOpciones = () => {
    opciones.replaceChildren(
      segmentado<Dificultad>(
        'Dificultad',
        (Object.keys(DIFICULTADES) as Dificultad[]).map((d) => ({ v: d, t: DIFICULTADES[d].nombre })),
        () => c.dificultad,
        (v) => (c.dificultad = v),
        () => DIFICULTADES[c.dificultad].desc,
      ),
      segmentado<Tamano>(
        'Tamaño del mapa',
        (Object.keys(TAMANOS) as Tamano[]).map((t) => ({ v: t, t: TAMANOS[t].nombre, titulo: `${TAMANOS[t].ancho} × ${TAMANOS[t].alto}` })),
        () => c.tamano,
        (v) => (c.tamano = v),
        () => `${TAMANOS[c.tamano].ancho} × ${TAMANOS[c.tamano].alto} casillas`,
      ),
      niveles('Agua', NIVELES, 'agua'),
      niveles('Montañas', NIVELES, 'montanas'),
      niveles('Bosque', NIVELES, 'bosque'),
      niveles('Mineral', NIVELES_MINERAL, 'mineral'),
      deslizador('Nidos al empezar', 0, 12, () => c.nidos, (v) => (c.nidos = v)),
      deslizador('Colonos', 1, 6, () => c.colonos, (v) => (c.colonos = v)),
      segmentado<Config['recursos']>(
        'Recursos iniciales',
        (Object.keys(RECURSOS_INICIALES) as Config['recursos'][]).map((r) => ({ v: r, t: RECURSOS_INICIALES[r].nombre })),
        () => c.recursos,
        (v) => (c.recursos = v),
      ),
      el(
        'div',
        { class: 'opcion' },
        el('div', { class: 'opcion-titulo' }, 'Semilla'),
        el(
          'div',
          { class: 'fila' },
          semilla,
          el(
            'button',
            {
              title: 'Otra semilla al azar',
              'aria-label': 'Otra semilla al azar',
              onclick: () => {
                c.semilla = Math.floor(Math.random() * 1e9);
                semilla.value = String(c.semilla);
                actualizarPrevia();
              },
            },
            '🎲 Otro mapa',
          ),
        ),
        el('p', { class: 'sub' }, 'La misma semilla con las mismas opciones da siempre el mismo mapa.'),
      ),
    );
  };
  pintarOpciones();

  abrir(
    el(
      'div',
      { class: 'menu-nueva' },
      el('h2', {}, 'Nueva colonia'),
      el(
        'div',
        { class: 'nueva-cuerpo' },
        opciones,
        el(
          'div',
          { class: 'nueva-previa' },
          lienzo,
          resumen,
          el(
            'div',
            { class: 'leyenda' },
            [
              ['#2f5f8a', 'agua'],
              ['#46433d', 'roca'],
              ['#2c5422', 'bosque'],
              ['#8fa3bb', 'hierro'],
              ['#d98a52', 'cobre'],
              ['#1e1e20', 'carbón'],
              ['#c050c0', 'nido'],
              ['#ffffff', 'llegada'],
            ].map(([c2, t]) => el('span', {}, el('i', { style: `background:${c2}` }), t!)),
          ),
        ),
      ),
      el(
        'div',
        { class: 'fila derecha' },
        el('button', { onclick: () => abrirInicio(a) }, 'Volver'),
        el(
          'button',
          {
            onclick: () => {
              const d = configPorDefecto(c.semilla);
              Object.assign(c, d);
              pintarOpciones();
              actualizarPrevia();
            },
          },
          'Opciones normales',
        ),
        el(
          'button',
          {
            class: 'primario',
            onclick: () => {
              recordarConfig(c);
              cerrar();
              a.empezar({ ...c });
            },
          },
          'Empezar',
        ),
      ),
    ),
  );
  actualizarPrevia();
}

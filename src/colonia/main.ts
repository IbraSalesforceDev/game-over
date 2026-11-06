/**
 * Colonia Óxido: arranque, cámara, ratón, teclado y bucle principal.
 */
import { abrirAdmin } from './admin';
import { colonoEn, ordenarMover, reclutar } from './colonos';
import { nidoEn } from './criaturas';
import { EDIFICIOS, type TipoEdificio } from './edificios';
import type { Config } from './config';
import { cargarLocal, deserializar, guardarLocal, hayPartida } from './guardado';
import { type AccionesMenu, abrirInicio, abrirNueva, menuAbierto } from './menu';
import { puedeColocar } from './maquinas';
import { Orden, Planta, Suelo, Zona } from './mapa';
import { Mundo } from './mundo';
import { type Camara, type Vista, dibujar, reiniciarCache } from './render';
import { ALTO, ANCHO, type Dir, TPS, dentro, idx } from './tipos';
import { type Controlador, type Herramienta, abrirAyuda, crearInterfaz, el, hayModal, modal } from './ui';

const lienzo = document.getElementById('lienzo') as HTMLCanvasElement;
const ctx = lienzo.getContext('2d')!;

let mundo: Mundo = cargarLocal() ?? Mundo.nueva();
const cam: Camara = { x: mundo.inicio[0] + 0.5, y: mundo.inicio[1] + 0.5, z: 32, w: 800, h: 600 };
const vista: Vista = { seleccion: null, fantasma: null, rectangulo: null, contaminacion: false, tiempo: 0 };
/** Pausa, ×1, ×3, ×6 y el turbo ×15 del panel de administración. */
const MULT = [0, 1, 3, 6, 15];
let velocidadAntes = 1;
let dir: Dir = 0;
let finMostrado = false;

const ctl: Controlador = {
  mundo: () => mundo,
  vista,
  herramienta: { t: 'seleccionar' },
  velocidad: 1,
  ponerHerramienta(h: Herramienta) {
    ctl.herramienta = h;
    vista.fantasma = null;
    ui.pintarHerramientas();
  },
  ponerVelocidad(v: number) {
    if (v > 0) velocidadAntes = v;
    ctl.velocidad = v;
  },
  centrar(x: number, y: number) {
    cam.x = x;
    cam.y = y;
  },
  guardar() {
    aviso(guardarLocal(mundo) ? 'Partida guardada.' : 'No se ha podido guardar (¿navegador en modo privado?).');
  },
  cargar() {
    const w = cargarLocal();
    if (!w) return aviso('No hay ninguna partida guardada.');
    ponerMundo(w);
    aviso('Partida cargada.');
  },
  poner(w: Mundo) {
    ponerMundo(w);
  },
  refrescarHerramientas() {
    ui.pintarHerramientas();
  },
  abrirAdmin() {
    abrirAdmin(ctl);
  },
  nueva() {
    guardarLocal(mundo);
    abrirNueva(accionesMenu());
  },
  menuPrincipal() {
    guardarLocal(mundo);
    abrirInicio(accionesMenu());
  },
};

const CLAVE_AYUDA = 'colonia-oxido.ayuda-vista';

function accionesMenu(): AccionesMenu {
  return {
    hayPartida: hayPartida(),
    continuar() {
      ctl.ponerVelocidad(1);
    },
    empezar(c: Config) {
      ponerMundo(Mundo.nueva(c));
      guardarLocal(mundo);
      ctl.ponerVelocidad(1);
      // La ayuda sale sola la primera vez.
      try {
        if (!localStorage.getItem(CLAVE_AYUDA)) {
          localStorage.setItem(CLAVE_AYUDA, '1');
          abrirAyuda(ctl);
        }
      } catch {
        abrirAyuda(ctl);
      }
    },
    importar() {
      const input = el('input', { type: 'file', accept: 'application/json,.json' });
      input.addEventListener('change', async () => {
        const f = input.files?.[0];
        if (!f) return;
        const w = deserializar(await f.text());
        if (!w) return alert('Ese fichero no es una partida de Colonia Óxido.');
        ponerMundo(w);
        guardarLocal(w);
        document.querySelector('.menu-inicio')?.remove();
        abrirInicio({ ...accionesMenu(), hayPartida: true });
      });
      input.click();
    },
    ayuda() {
      abrirAyuda(ctl);
    },
  };
}

const ui = crearInterfaz(ctl);

function ponerMundo(w: Mundo): void {
  mundo = w;
  reiniciarCache();
  vista.seleccion = null;
  finMostrado = false;
  cam.x = w.inicio[0] + 0.5;
  cam.y = w.inicio[1] + 0.5;
  ctl.ponerHerramienta({ t: 'seleccionar' });
}

function aviso(texto: string): void {
  mundo.avisar(texto, 'info');
}

// ------------------------------------------------------------------ pantalla

function redimensionar(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cam.w = window.innerWidth;
  cam.h = window.innerHeight;
  lienzo.width = Math.floor(cam.w * dpr);
  lienzo.height = Math.floor(cam.h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', redimensionar);
redimensionar();

function aCasilla(px: number, py: number): [number, number] {
  return [(px - cam.w / 2) / cam.z + cam.x, (py - cam.h / 2) / cam.z + cam.y];
}

// ------------------------------------------------------------------ herramientas

function aplicarArea(h: Herramienta, x0: number, y0: number, x1: number, y1: number): void {
  const w = mundo;
  const m = w.mapa;
  const [xa, xb] = [Math.max(0, Math.min(x0, x1)), Math.min(ANCHO - 1, Math.max(x0, x1))];
  const [ya, yb] = [Math.max(0, Math.min(y0, y1)), Math.min(ALTO - 1, Math.max(y0, y1))];
  let n = 0;
  const vistos = new Set<number>();
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      const i = idx(x, y);
      if (h.t === 'orden') {
        const e = w.edificioEn(x, y);
        switch (h.orden) {
          case 'talar':
            if (m.planta[i] === Planta.Arbol) (m.orden[i] = Orden.Talar), n++;
            break;
          case 'minar':
            if ((m.muro[i] || m.mineral[i]) && !m.edif[i]) (m.orden[i] = Orden.Minar), n++;
            break;
          case 'cosechar':
            if (m.planta[i] === Planta.Arbusto) (m.orden[i] = Orden.Cosechar), n++;
            break;
          case 'cancelar':
            if (m.orden[i]) (m.orden[i] = 0), n++;
            if (e && !vistos.has(e.id)) {
              vistos.add(e.id);
              if (!e.construido) w.quitar(e, 0);
              else e.deconstruir = false;
              n++;
            }
            break;
          case 'desmontar':
            if (e && !vistos.has(e.id)) {
              vistos.add(e.id);
              if (!e.construido) w.quitar(e, 0);
              else e.deconstruir = true;
              n++;
            }
            break;
        }
      } else if (h.t === 'zona') {
        if (h.zona === 'borrar') m.zona[i] = Zona.Nada;
        else if (m.transitable(x, y) && !m.edif[i]) {
          if (h.zona === 'cultivo' && m.suelo[i] !== Suelo.Hierba && m.suelo[i] !== Suelo.Tierra) continue;
          if (h.zona === 'cultivo' && m.mineral[i]) continue;
          m.zona[i] = h.zona === 'almacen' ? Zona.Almacen : Zona.Cultivo;
        }
      }
    }
  }
}

function colocar(tipo: TipoEdificio, x: number, y: number, d: Dir): boolean {
  const r = mundo.colocar(tipo, x, y, d);
  return typeof r !== 'string';
}

function seleccionar(fx: number, fy: number): void {
  const w = mundo;
  const c = colonoEn(w, fx, fy);
  if (c) {
    vista.seleccion = { c: 'colono', id: c.id };
    return;
  }
  const k = w.criaturas.find((x) => Math.hypot(x.x - fx, x.y - fy) < 0.6);
  if (k) {
    vista.seleccion = { c: 'criatura', id: k.id };
    return;
  }
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  const n = nidoEn(w, x, y);
  if (n) {
    vista.seleccion = { c: 'nido', id: n.id };
    return;
  }
  const e = w.edificioEn(x, y);
  if (e) {
    vista.seleccion = { c: 'edificio', id: e.id };
    return;
  }
  vista.seleccion = dentro(x, y) ? { c: 'casilla', i: idx(x, y) } : null;
}

// ------------------------------------------------------------------ ratón

let raton = { x: 0, y: 0 };
let arrastre: { x0: number; y0: number } | null = null;
let ultimoColocado: [number, number] | null = null;
let paneo: { x: number; y: number; cx: number; cy: number } | null = null;

lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
lienzo.addEventListener('pointerdown', (e) => {
  const [fx, fy] = aCasilla(e.clientX, e.clientY);
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  if (e.button === 1) {
    paneo = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y };
    e.preventDefault();
    return;
  }
  if (e.button === 2) {
    const h = ctl.herramienta;
    if (h.t !== 'seleccionar') {
      ctl.ponerHerramienta({ t: 'seleccionar' });
      return;
    }
    const s = vista.seleccion;
    if (s?.c === 'colono') {
      const c = mundo.colonos.find((k) => k.id === s.id);
      if (c?.reclutado) ordenarMover(mundo, c, x, y);
    }
    return;
  }
  lienzo.setPointerCapture(e.pointerId);
  const h = ctl.herramienta;
  if (h.t === 'seleccionar') {
    seleccionar(fx, fy);
    ui.refrescarInspector();
  } else if (h.t === 'construir') {
    const d = EDIFICIOS[h.tipo];
    const ox = x - Math.floor((d.w - 1) / 2);
    const oy = y - Math.floor((d.h - 1) / 2);
    if (colocar(h.tipo, ox, oy, dir)) ultimoColocado = [ox, oy];
    arrastre = { x0: x, y0: y };
  } else {
    arrastre = { x0: x, y0: y };
  }
});

lienzo.addEventListener('pointermove', (e) => {
  raton = { x: e.clientX, y: e.clientY };
  if (paneo) {
    cam.x = paneo.cx - (e.clientX - paneo.x) / cam.z;
    cam.y = paneo.cy - (e.clientY - paneo.y) / cam.z;
    return;
  }
  const h = ctl.herramienta;
  if (!arrastre) return;
  const [fx, fy] = aCasilla(e.clientX, e.clientY);
  const x = Math.floor(fx);
  const y = Math.floor(fy);
  if (h.t === 'construir') {
    const d = EDIFICIOS[h.tipo];
    // Muros y cintas se pintan arrastrando; las cintas giran solas hacia donde vas.
    if (d.w === 1 && d.h === 1 && ultimoColocado && (x !== ultimoColocado[0] || y !== ultimoColocado[1])) {
      const [lx, ly] = ultimoColocado;
      const pasos = Math.max(Math.abs(x - lx), Math.abs(y - ly));
      for (let k = 1; k <= pasos; k++) {
        const px = Math.abs(x - lx) >= Math.abs(y - ly) ? lx + Math.sign(x - lx) * k : lx;
        const py = Math.abs(x - lx) >= Math.abs(y - ly) ? ly : ly + Math.sign(y - ly) * k;
        if (h.tipo === 'cinta') {
          const nd = (px > lx ? 0 : px < lx ? 2 : py > ly ? 1 : 3) as Dir;
          dir = nd;
          const anterior = mundo.edificioEn(ultimoColocado[0], ultimoColocado[1]);
          if (anterior?.tipo === 'cinta') anterior.dir = nd;
        }
        colocar(h.tipo, px, py, dir);
        ultimoColocado = [px, py];
      }
    }
  } else if (h.t !== 'seleccionar') {
    vista.rectangulo = { x0: arrastre.x0, y0: arrastre.y0, x1: x, y1: y, color: h.t === 'zona' ? (h.zona === 'borrar' ? '#ff6a5a' : '#6ab0ff') : h.orden === 'cancelar' || h.orden === 'desmontar' ? '#ff6a5a' : '#ffd040' };
  }
});

lienzo.addEventListener('pointerup', (e) => {
  if (paneo && e.button === 1) {
    paneo = null;
    return;
  }
  const h = ctl.herramienta;
  if (arrastre && (h.t === 'orden' || h.t === 'zona')) {
    const [fx, fy] = aCasilla(e.clientX, e.clientY);
    aplicarArea(h, arrastre.x0, arrastre.y0, Math.floor(fx), Math.floor(fy));
  }
  arrastre = null;
  ultimoColocado = null;
  vista.rectangulo = null;
});

lienzo.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const [fx, fy] = aCasilla(e.clientX, e.clientY);
    const z = Math.min(72, Math.max(8, cam.z * Math.pow(1.0015, -e.deltaY)));
    cam.z = z;
    // Zoom hacia el puntero.
    const [nx, ny] = aCasilla(e.clientX, e.clientY);
    cam.x += fx - nx;
    cam.y += fy - ny;
  },
  { passive: false },
);

// ------------------------------------------------------------------ teclado

const teclas = new Set<string>();
window.addEventListener('keydown', (e) => {
  if (hayModal() || menuAbierto()) return;
  if (e.target instanceof HTMLInputElement) return;
  teclas.add(e.code);
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      ctl.ponerVelocidad(ctl.velocidad === 0 ? velocidadAntes : 0);
      break;
    case 'Digit1':
      ctl.ponerVelocidad(1);
      break;
    case 'Digit2':
      ctl.ponerVelocidad(2);
      break;
    case 'Digit3':
      ctl.ponerVelocidad(3);
      break;
    case 'KeyR': {
      if (ctl.herramienta.t === 'construir') {
        dir = ((dir + 1) % 4) as Dir;
        break;
      }
      const s = vista.seleccion;
      if (s?.c === 'colono') {
        const c = mundo.colonos.find((k) => k.id === s.id);
        if (c) reclutar(mundo, c, !c.reclutado);
        ui.refrescarInspector();
      }
      break;
    }
    case 'KeyP':
      vista.contaminacion = !vista.contaminacion;
      break;
    case 'Escape':
      if (ctl.herramienta.t !== 'seleccionar') ctl.ponerHerramienta({ t: 'seleccionar' });
      else vista.seleccion = null;
      ui.refrescarInspector();
      break;
    case 'Delete': {
      const s = vista.seleccion;
      if (s?.c === 'edificio') {
        const b = mundo.edificios.get(s.id);
        if (b && !b.construido) mundo.quitar(b, 0);
        else if (b) b.deconstruir = !b.deconstruir;
        ui.refrescarInspector();
      }
      break;
    }
    case 'F5':
      e.preventDefault();
      ctl.guardar();
      break;
    case 'F10':
      e.preventDefault();
      abrirAdmin(ctl);
      break;
    case 'F9':
      e.preventDefault();
      ctl.cargar();
      break;
  }
});
window.addEventListener('keyup', (e) => teclas.delete(e.code));
window.addEventListener('blur', () => teclas.clear());

// ------------------------------------------------------------------ bucle

let ultimo = performance.now();
let acumulado = 0;
let guardadoAuto = 0;
let tickPeligro = -1;

function finDePartida(): void {
  if (finMostrado) return;
  finMostrado = true;
  ctl.ponerVelocidad(0);
  const m = modal(mundo.ganado ? '¡Rescatados!' : 'La colonia ha caído', 520);
  m.cuerpo.append(
    el('p', {}, mundo.ganado ? `La nave de rescate aterriza junto al faro el día ${mundo.dia}. Lo habéis conseguido.` : `No queda nadie con vida. Resististeis ${mundo.dia} días.`),
    el('div', { class: 'fila' }, el('button', { class: 'primario', onclick: () => (m.cerrar(), abrirNueva(accionesMenu())) }, 'Nueva colonia')),
  );
}

function bucle(ahora: number): void {
  const dt = Math.min(0.1, (ahora - ultimo) / 1000);
  ultimo = ahora;
  vista.tiempo += dt;
  // Cámara con teclado.
  if (!hayModal() && !menuAbierto()) {
    const v = (900 / cam.z) * dt;
    if (teclas.has('KeyW') || teclas.has('ArrowUp')) cam.y -= v;
    if (teclas.has('KeyS') || teclas.has('ArrowDown')) cam.y += v;
    if (teclas.has('KeyA') || teclas.has('ArrowLeft')) cam.x -= v;
    if (teclas.has('KeyD') || teclas.has('ArrowRight')) cam.x += v;
  }
  cam.x = Math.max(0, Math.min(ANCHO, cam.x));
  cam.y = Math.max(0, Math.min(ALTO, cam.y));
  // Simulación a paso fijo.
  // Con el menú abierto, la partida de fondo no avanza.
  if (!menuAbierto()) acumulado += dt * TPS * MULT[ctl.velocidad]!;
  let pasos = 0;
  while (acumulado >= 1 && pasos < 40) {
    mundo.paso();
    acumulado -= 1;
    pasos++;
  }
  if (pasos >= 40) acumulado = 0;
  if ((mundo.ganado || mundo.perdido) && !finMostrado) finDePartida();
  // Ante un peligro nuevo, el tiempo vuelve a la velocidad normal.
  const ultimaAlerta = mundo.alertas[mundo.alertas.length - 1];
  if (ultimaAlerta && ultimaAlerta.tick !== tickPeligro && ultimaAlerta.tipo === 'peligro') {
    tickPeligro = ultimaAlerta.tick;
    if (ctl.velocidad > 1) ctl.ponerVelocidad(1);
  }
  // Fantasma de construcción.
  const h = ctl.herramienta;
  if (h.t === 'construir') {
    const [fx, fy] = aCasilla(raton.x, raton.y);
    const d = EDIFICIOS[h.tipo];
    const x = Math.floor(fx) - Math.floor((d.w - 1) / 2);
    const y = Math.floor(fy) - Math.floor((d.h - 1) / 2);
    vista.fantasma = { tipo: h.tipo, x, y, dir, valido: !puedeColocar(mundo, h.tipo, x, y) && mundo.disponible(h.tipo) };
  } else vista.fantasma = null;
  dibujar(ctx, mundo, cam, vista);
  ui.actualizar();
  guardadoAuto += dt;
  if (guardadoAuto > 60 && ctl.velocidad > 0) {
    guardadoAuto = 0;
    guardarLocal(mundo);
  }
  requestAnimationFrame(bucle);
}

// Para las pruebas automáticas: ?depurar expone el mundo y la cámara.
if (new URLSearchParams(location.search).has('depurar')) {
  (window as unknown as { colonia: unknown }).colonia = { mundo: () => mundo, cam, vista, ctl };
}

window.addEventListener('beforeunload', () => guardarLocal(mundo));
document.getElementById('cargador')?.remove();
abrirInicio(accionesMenu());
requestAnimationFrame(bucle);

/**
 * Frontera Orbital: arranque, menú, cambio entre hangar y vuelo, y controles.
 */
import { crearAudio } from './audio';
import { Vuelo } from './juego';
import { elementos } from './kepler';
import { costeDiseno } from './nave';
import { RAZAS, type Raza } from './partes';
import { type Partida, cargar, guardar, nuevaPartida } from './partida';
import { type Camara, ZOOM_MAPA, aMundo, aPantalla, dibujar, seguir } from './render';
import { cuerpo, dominante, estacionDe, posCuerpo, posOrbita, velCuerpo, velOrbita } from './sistema';
import { cr, el, hayModal, modal, toast } from './ui/comun';
import { crearHangar, type Hangar } from './ui/hangar';
import { type Contexto, abrirAdmin, abrirMercado } from './ui/paneles';
import { type V, escala, largo, perp, polar, resta, suma, unit } from './vec';

const lienzo = document.getElementById('lienzo') as HTMLCanvasElement;
const ctx = lienzo.getContext('2d')!;
const audio = crearAudio();

let partida: Partida | null = cargar();
let vuelo: Vuelo | null = null;
let hangar: Hangar | null = null;
let pantalla: 'menu' | 'hangar' | 'vuelo' = 'menu';
let ayuda = true;
let pausa = false;
let finMostrado = false;

const cam: Camara = { centro: { x: 0, y: 0 }, zoom: 8, rot: 0, w: 800, h: 600 };
let zoomVuelo = 8;
let mapaCentrado = false;
const raton: V = { x: 0, y: 0 };
const teclas = new Set<string>();

function redimensionar(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cam.w = window.innerWidth;
  cam.h = window.innerHeight;
  lienzo.width = cam.w * dpr;
  lienzo.height = cam.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', redimensionar);
redimensionar();

function contexto(): Contexto {
  return {
    p: partida!,
    vuelo,
    guardar: () => partida && guardar(partida),
    refrescar: () => hangar?.refrescar(),
    sonido: (e) => audio.evento(e),
    teletransportar: teletransportar,
    reiniciar: () => {
      partida = null;
      vuelo = null;
      irAlMenu();
    },
  };
}

// ------------------------------------------------------------ menú

const capaMenu = el('div', { id: 'menu' });
document.body.append(capaMenu);

function irAlMenu(): void {
  hangar?.destruir();
  hangar = null;
  vuelo = null;
  pantalla = 'menu';
  capaMenu.hidden = false;
  capaMenu.replaceChildren(
    el(
      'div',
      { class: 'menu-caja' },
      el('h1', {}, 'Frontera', el('br'), 'Orbital'),
      el('p', { class: 'lema' }, 'Construye cohetes · mina asteroides · comercia · haz la guerra'),
      partida
        ? el(
            'button',
            { class: 'primario grande', onclick: () => irAlHangar() },
            'Continuar partida',
            el('div', { class: 'sub' }, `${RAZAS[partida.raza].nombre} · ${cr(partida.creditos)}`),
          )
        : null,
      el('button', { class: partida ? 'grande' : 'primario grande', onclick: elegirRaza }, 'Nueva partida'),
      el('p', { class: 'sub' }, 'Simulador 2D de cohetes con física orbital. Se guarda solo en este navegador.'),
    ),
  );
}

function elegirRaza(): void {
  if (partida && !confirm('Empezar de cero borra la partida actual. ¿Seguir?')) return;
  const m = modal('Elige tu pueblo', undefined, 'ancho');
  const tarjeta = (r: Raza) => {
    const info = RAZAS[r];
    return el(
      'button',
      {
        class: `tarjeta-raza raza-${r}`,
        onclick: () => {
          partida = nuevaPartida(r);
          guardar(partida);
          m.cerrar();
          irAlHangar();
          toast(`Bienvenida a la ${info.nombre}. Tienes ${cr(partida.creditos)} y un diseño de minera listo para lanzar.`, 'bien');
        },
      },
      el('h3', {}, info.nombre),
      el('div', { class: 'sub' }, info.pueblo),
      el('p', {}, info.desc),
      el('ul', {}, info.ventajas.map((v) => el('li', {}, v))),
    );
  };
  m.cuerpo.append(
    el('p', { class: 'nota' }, 'La otra raza la controla la IA: empezáis en paz, pero no por mucho tiempo.'),
    el('div', { class: 'razas' }, tarjeta('humana'), tarjeta('alien')),
  );
}

// ------------------------------------------------------------ hangar

function irAlHangar(): void {
  if (!partida) return irAlMenu();
  capaMenu.hidden = true;
  hangar?.destruir();
  vuelo = null;
  pantalla = 'hangar';
  pausa = false;
  finMostrado = false;
  document.getElementById('fin')?.remove();
  hangar = crearHangar(contexto(), { lanzar, menu: irAlMenu });
  document.body.append(hangar.raiz);
  hangar.refrescar();
}

function lanzar(desdeEstacion: boolean): void {
  if (!partida) return;
  const coste = Math.round(costeDiseno(partida.actual) * (desdeEstacion ? 1.15 : 1));
  if (partida.creditos < coste) return;
  partida.creditos -= coste;
  partida.stats.lanzamientos++;
  vuelo = new Vuelo(partida, JSON.parse(JSON.stringify(partida.actual)), desdeEstacion);
  guardar(partida);
  hangar?.destruir();
  hangar = null;
  pantalla = 'vuelo';
  cam.zoom = desdeEstacion ? 3 : 8;
  zoomVuelo = cam.zoom;
  mapaCentrado = false;
  cam.rot = 0;
  seguir(cam, vuelo, 10);
  vuelo.avisar(desdeEstacion ? 'Junto a la estación. Espacio enciende los motores.' : 'En la plataforma. Espacio enciende los motores, Z acelera a fondo.', 'info');
  audio.activar();
}

// ------------------------------------------------------------ vuelo

function teletransportar(destino: string): void {
  const vu = vuelo;
  if (!vu) return;
  const n = vu.jugador;
  const t = vu.t;
  n.posado = null;
  n.omega = 0;
  n.acel = 0;
  n.taladrando = false;
  const circular = (id: string, alt: number) => {
    const c = cuerpo(id);
    const r = c.radio + alt;
    const pos = suma(posCuerpo(c, t), polar(Math.PI / 2, r));
    n.pos = pos;
    n.vel = suma(velCuerpo(c, t), polar(Math.PI, Math.sqrt(c.gm / r)));
    n.ang = Math.PI;
  };
  const junto = (centro: V, vel: V, radio: number) => {
    const fuera = unit(perp(vel));
    n.pos = suma(centro, escala(fuera, radio * 0.85 + n.geometria.anchoMax + 12));
    n.vel = { ...vel };
    n.ang = Math.atan2(-fuera.y, -fuera.x);
  };
  const asteroide = (territorio: Raza) => {
    const a = vu.asteroides.filter((x) => x.territorio === territorio && x.reserva > 0)[0] ?? vu.asteroides[0]!;
    junto(posOrbita(a.orbita, t), velOrbita(a.orbita, t), a.radio);
  };
  if (destino === 'gaia') circular('gaia', 90_000);
  else if (destino === 'selene') circular('selene', 20_000);
  else if (destino === 'xyl') circular('xyl', 30_000);
  else if (destino === 'cinturon') asteroide('humana');
  else if (destino === 'anillo') asteroide('alien');
  else if (destino === 'estacion') {
    const e = estacionDe(vu.p.raza);
    junto(posOrbita(e.orbita, t), velOrbita(e.orbita, t), 160);
  }
  n.invalidar();
}

function alternarMapa(): void {
  if (!vuelo) return;
  if (cam.zoom >= ZOOM_MAPA) {
    zoomVuelo = cam.zoom;
    const n = vuelo.jugador;
    const c = dominante(n.pos, vuelo.t);
    const el2 = elementos(resta(n.pos, posCuerpo(c, vuelo.t)), resta(n.vel, velCuerpo(c, vuelo.t)), c.gm);
    const r = Math.min(isFinite(el2.apoapsis) ? el2.apoapsis : c.soi, c.soi === Infinity ? 2_000_000 : c.soi, Math.max(c.radio * 3, largo(resta(n.pos, posCuerpo(c, vuelo.t))) * 1.4));
    cam.zoom = Math.min(ZOOM_MAPA * 0.9, (Math.min(cam.w, cam.h) * 0.42) / r);
    mapaCentrado = true;
  } else {
    cam.zoom = zoomVuelo;
    mapaCentrado = false;
  }
}

function recuperar(): void {
  if (!vuelo || !partida) return;
  const r = vuelo.recuperar();
  if (!r) {
    vuelo.avisar('Solo se puede recuperar posada en tu mundo o acoplada a tu estación.', 'aviso');
    return;
  }
  guardar(partida);
  toast(`Nave recuperada: +${cr(r.reembolso)}${r.carga > 0 ? ` · ${r.carga.toFixed(2)} t de mineral al almacén` : ''}.`, 'bien');
  irAlHangar();
  if (r.carga > 0) abrirMercado(contexto());
}

function abrirPausa(): void {
  if (!vuelo) return;
  pausa = true;
  const m = modal('Pausa', () => (pausa = false));
  m.cuerpo.append(
    el(
      'div',
      { class: 'columna-botones' },
      el('button', { class: 'primario', onclick: () => m.cerrar() }, 'Continuar'),
      el(
        'button',
        {
          onclick: () => {
            m.cerrar();
            abrirAdmin(contexto());
          },
        },
        'Panel de administración',
      ),
      vuelo.acoplada || vuelo.enCasa
        ? el(
            'button',
            {
              onclick: () => {
                m.cerrar();
                recuperar();
              },
            },
            'Recuperar nave y volver al hangar',
          )
        : el(
            'button',
            {
              class: 'peligro',
              onclick: () => {
                if (!confirm('La nave y su carga se pierden. ¿Abandonar el vuelo?')) return;
                partida!.stats.perdidas++;
                guardar(partida!);
                m.cerrar();
                irAlHangar();
              },
            },
            'Abandonar el vuelo (se pierde la nave)',
          ),
      el(
        'label',
        { class: 'deslizador' },
        el('span', {}, 'Volumen'),
        (() => {
          const i = el('input', { type: 'range', min: 0, max: 1, step: 0.05, value: audio.volumen });
          i.addEventListener('input', () => (audio.volumen = Number(i.value)));
          return i;
        })(),
      ),
    ),
  );
}

function mostrarFin(): void {
  if (finMostrado || !vuelo) return;
  finMostrado = true;
  guardar(partida!);
  const caja = el(
    'div',
    { id: 'fin' },
    el(
      'div',
      { class: 'fin-caja' },
      el('h2', {}, 'Nave perdida'),
      el('p', {}, vuelo.jugador.motivo ? `La nave ${vuelo.jugador.motivo}.` : 'La nave ha sido destruida.'),
      el('button', { class: 'primario', onclick: () => irAlHangar() }, 'Volver al hangar'),
    ),
  );
  setTimeout(() => document.body.append(caja), 1200);
}

window.addEventListener('keydown', (e) => {
  audio.activar();
  if (pantalla !== 'vuelo' || !vuelo) return;
  if (hayModal()) return;
  teclas.add(e.code);
  const n = vuelo.jugador;
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      if (!e.repeat) vuelo.etapa();
      break;
    case 'KeyZ':
      n.acel = 1;
      break;
    case 'KeyX':
      n.acel = 0;
      break;
    case 'KeyT':
      n.sas = !n.sas;
      break;
    case 'KeyF':
      n.taladrando = !n.taladrando;
      break;
    case 'KeyG':
      if (n.ritmoRefineria() <= 0) vuelo.avisar('Esta nave no lleva refinería.', 'aviso');
      else n.refinando = !n.refinando;
      break;
    case 'KeyP':
      if (n.areaParacaidas() <= 0) vuelo.avisar('Esta nave no lleva paracaídas.', 'aviso');
      else {
        n.paracaidas = !n.paracaidas;
        vuelo.avisar(n.paracaidas ? 'Paracaídas abierto.' : 'Paracaídas recogido.', 'info');
      }
      break;
    case 'KeyM':
      alternarMapa();
      break;
    case 'Comma':
      vuelo.cambiarWarp(-1);
      break;
    case 'Period':
      vuelo.cambiarWarp(1);
      break;
    case 'KeyR':
      recuperar();
      break;
    case 'KeyE':
      if (vuelo.acoplada) abrirMercado(contexto());
      else vuelo.avisar('El mercado se abre acoplada a tu estación.', 'aviso');
      break;
    case 'KeyH':
      ayuda = !ayuda;
      break;
    case 'Escape':
      abrirPausa();
      break;
    case 'F10':
      e.preventDefault();
      abrirAdmin(contexto());
      break;
  }
});
window.addEventListener('keyup', (e) => teclas.delete(e.code));
window.addEventListener('blur', () => {
  teclas.clear();
  if (vuelo) vuelo.disparando = false;
});

lienzo.addEventListener('mousemove', (e) => {
  raton.x = e.clientX;
  raton.y = e.clientY;
});
lienzo.addEventListener('mousedown', (e) => {
  audio.activar();
  if (vuelo && e.button === 0) vuelo.disparando = true;
});
window.addEventListener('mouseup', () => {
  if (vuelo) vuelo.disparando = false;
});
lienzo.addEventListener('contextmenu', (e) => e.preventDefault());
lienzo.addEventListener(
  'wheel',
  (e) => {
    e.preventDefault();
    const k = Math.pow(1.0015, -e.deltaY);
    cam.zoom = Math.min(40, Math.max(2e-5, cam.zoom * k));
    mapaCentrado = cam.zoom < ZOOM_MAPA && mapaCentrado;
  },
  { passive: false },
);

// ------------------------------------------------------------ bucle

let ultimo = performance.now();
let guardado = 0;

function fondoMenu(t: number): void {
  ctx.fillStyle = '#04060c';
  ctx.fillRect(0, 0, cam.w, cam.h);
  for (let i = 0; i < 260; i++) {
    const x = ((i * 7919) % 1000) / 1000;
    const y = ((i * 104729) % 1000) / 1000;
    ctx.fillStyle = `rgba(220,230,255,${0.3 + ((i * 31) % 70) / 100})`;
    ctx.fillRect(((x * cam.w + t * 4 * (0.3 + (i % 3) * 0.3)) % cam.w), y * cam.h, 1.2, 1.2);
  }
  const r = Math.max(cam.w, cam.h) * 0.9;
  const cx = cam.w * 0.5;
  const cy = cam.h + r * 0.72;
  const halo = ctx.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.08);
  halo.addColorStop(0, 'rgba(111,179,239,0.7)');
  halo.addColorStop(1, 'rgba(111,179,239,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.08, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.6, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#5aa36a');
  g.addColorStop(1, '#203a26');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Xyl a lo lejos.
  const xr = Math.min(cam.w, cam.h) * 0.07;
  const xg = ctx.createRadialGradient(cam.w * 0.8 - xr * 0.3, cam.h * 0.22 - xr * 0.3, 1, cam.w * 0.8, cam.h * 0.22, xr);
  xg.addColorStop(0, '#a46cd6');
  xg.addColorStop(1, '#2a1240');
  ctx.fillStyle = xg;
  ctx.beginPath();
  ctx.arc(cam.w * 0.8, cam.h * 0.22, xr, 0, Math.PI * 2);
  ctx.fill();
}

function bucle(ahora: number): void {
  const dt = Math.min(0.1, (ahora - ultimo) / 1000);
  ultimo = ahora;
  if (pantalla === 'vuelo' && vuelo) {
    const vu = vuelo;
    const n = vu.jugador;
    if (!hayModal() && !pausa) {
      // Controles continuos.
      if (n.controlable) {
        const giro = (teclas.has('KeyA') || teclas.has('ArrowLeft') ? 1 : 0) - (teclas.has('KeyD') || teclas.has('ArrowRight') ? 1 : 0);
        n.giro = giro;
        const sube = teclas.has('KeyW') || teclas.has('ShiftLeft') || teclas.has('ArrowUp');
        const baja = teclas.has('KeyS') || teclas.has('ControlLeft') || teclas.has('ArrowDown');
        if (sube) n.acel = Math.min(1, n.acel + dt * 0.8);
        if (baja) n.acel = Math.max(0, n.acel - dt * 0.8);
      }
      vu.apunte = aMundo(cam, raton);
      vu.paso(dt);
      if (vu.terminado === 'perdida') mostrarFin();
      guardado += dt;
      if (guardado > 10) {
        guardado = 0;
        guardar(vu.p);
      }
    }
    if (mapaCentrado) {
      const c = dominante(n.pos, vu.t);
      cam.centro = posCuerpo(c, vu.t);
      cam.rot += -cam.rot * Math.min(1, dt * 4);
    } else seguir(cam, vu, dt);
    dibujar(ctx, vu, cam, ahora / 1000, { ayuda });
    for (const e of vu.eventos) audio.evento(e);
    vu.eventos = [];
    const motor = n.encendida && !n.destruida ? Math.max(n.hayMotorSolidoArdiendo() ? 1 : 0, n.combustibleEtapa() > 0 || n.combustibleInfinito ? n.acel : 0) * (n.motores().length > 0 ? 1 : 0) : 0;
    audio.motor(vu.warp > 4 ? 0 : motor);
  } else {
    audio.motor(0);
    fondoMenu(ahora / 1000);
  }
  requestAnimationFrame(bucle);
}

window.addEventListener('beforeunload', () => {
  if (partida) guardar(partida);
});

// Para las pruebas automáticas en el navegador: ?depurar expone el vuelo.
if (new URLSearchParams(location.search).has('depurar')) {
  (window as unknown as { orbita: unknown }).orbita = { vuelo: () => vuelo, cam, aPantalla: (p: V) => aPantalla(cam, p) };
}

document.getElementById('cargador')?.remove();
irAlMenu();
requestAnimationFrame(bucle);

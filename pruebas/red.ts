/**
 * Banco de pruebas de la partida acompañada.
 *
 * Monta un anfitrión y un invitado **en la misma página**, con dos
 * `RTCPeerConnection` de verdad y una sala de mentira en memoria. Es
 * exactamente lo que ocurre al abrir dos navegadores, menos la parte de
 * Supabase —que es la única que no se puede probar sin dos cuentas y conexión—.
 *
 * Existe porque el fallo que arregló 7.11.1 no lo podía ver ningún test: los de
 * `partida-en-red` prueban el anfitrión y el invitado contra un enlace de
 * mentira, y el fallo estaba justo en el pegamento de en medio, en cuándo se
 * puede empezar a mandar por un canal de WebRTC. Un enlace de mentira siempre
 * está abierto; uno de verdad, no.
 *
 * No entra en el juego publicado: `vite build` solo empaqueta `index.html`.
 */

import { TILE } from '../src/core/constants';
import { AJUSTES_POR_DEFECTO, crearCaja, type Entrada } from '../src/entities/physics';
import { hospedar, unirse } from '../src/red/sesion';
import type { Recado, Sala } from '../src/red/senal';
import { empaquetar } from '../src/world/save';
import { generarMundo } from '../src/world/gen/worldgen';
import { VERSION_ACTUAL } from '../src/core/versiones';
import { PIEDRA, AIRE } from '../src/world/tiles';

const lista = document.getElementById('resultados')!;
const fallos: string[] = [];

function comprobar(que: string, bien: boolean): void {
  const li = document.createElement('li');
  li.className = bien ? 'bien' : 'mal';
  li.textContent = `${bien ? '✓' : '✗'} ${que}`;
  lista.appendChild(li);
  if (!bien) fallos.push(que);
}

/**
 * Una sala en memoria: reparte a todos menos a quien habla, como la de verdad.
 *
 * Y reparte con retraso, a propósito. Un apretón de manos que solo funcione con
 * entrega inmediata no funciona: por la sala de verdad los recados tardan.
 */
function crearSalaFalsa(): (yo: string) => (id: string, al: (r: Recado) => void) => Promise<Sala> {
  const oyentes = new Map<string, (r: Recado) => void>();
  return (yo: string) => async (_id: string, alRecado: (r: Recado) => void): Promise<Sala> => {
    oyentes.set(yo, alRecado);
    return {
      yo,
      async mandar(recado: Recado): Promise<void> {
        await new Promise((listo) => setTimeout(listo, 5));
        for (const [quien, fn] of oyentes) if (quien !== yo) fn(recado);
      },
      async cerrar(): Promise<void> {
        oyentes.delete(yo);
      },
    };
  };
}

const QUIETO: Entrada = { izq: false, der: false, abajo: false, salto: false, saltoPulsado: false };

async function esperar(ms: number): Promise<void> {
  await new Promise((listo) => setTimeout(listo, ms));
}

/** Espera a que algo se cumpla, o se rinde. Devuelve si se cumplió. */
async function esperarA(que: () => boolean, tope = 20000): Promise<boolean> {
  const hasta = Date.now() + tope;
  while (Date.now() < hasta) {
    if (que()) return true;
    await esperar(50);
  }
  return que();
}

async function main(): Promise<void> {
  const genA = generarMundo({ ancho: 400, alto: 200, semilla: 'BANCO' });
  const genB = generarMundo({ ancho: 400, alto: 200, semilla: 'BANCO' });
  const estado = {
    semilla: 'BANCO',
    jugador: { x: 0, y: 0, spawnX: 0, spawnY: 0 },
    creado: Date.now(),
    jugado: 0,
    material: 0,
    capaPared: false,
    minutos: 600,
    inventario: [] as [number, number][],
    equipo: [] as [number, number][],
    cofres: genA.cofres,
    vida: 100,
    vidaMax: 100,
    hambre: 100,
    dificultad: 3,
    hardcore: false,
    hardcoreMuerto: false,
    estructuras: genA.estructuras,
    jefeVencido: false,
    versionJuego: VERSION_ACTUAL,
    mundoHondo: false,
  };

  const sala = crearSalaFalsa();

  const cajaA = crearCaja(genA.spawnTx * TILE, genA.spawnTy * TILE, 26, 46);
  const cajaB = crearCaja(genB.spawnTx * TILE, genB.spawnTy * TILE, 26, 46);

  let mundoLlegado = 0;
  const tilesEnB: { tx: number; ty: number; id: number }[] = [];
  const tilesEnA: { tx: number; ty: number; id: number }[] = [];

  const anfitrion = await hospedar({
    idPartida: 'partidadeprueba',
    nombre: 'Anfitrión',
    ajustes: AJUSTES_POR_DEFECTO,
    mundo: genA.mundo,
    spawnTx: genA.spawnTx,
    spawnTy: genA.spawnTy,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bytesDelMundo: () => empaquetar(genA.mundo, estado as any),
    bichos: () => [],
    entrarEnSala: sala('anfitrion'),
    alCambiarTiles: (cs) => tilesEnA.push(...cs),
  });

  const invitado = await unirse({
    idPartida: 'partidadeprueba',
    nombre: 'Invitado',
    ajustes: AJUSTES_POR_DEFECTO,
    mundo: genB.mundo,
    versionMundo: VERSION_ACTUAL,
    entrarEnSala: sala('invitado'),
    alLlegarMundo: (bytes) => {
      mundoLlegado = bytes.length;
    },
    alCambiarTiles: (cs) => tilesEnB.push(...cs),
  });

  // El bucle del juego: los dos avanzan a 60 Hz, como en la partida de verdad.
  const reloj = setInterval(() => {
    anfitrion.avanzar(cajaA, QUIETO);
    invitado.avanzar(cajaB, QUIETO);
  }, 16);

  comprobar(
    'el invitado entra: el anfitrión le da un número',
    await esperarA(() => anfitrion.otros().length > 0),
  );
  comprobar('el invitado recibe el mundo entero', await esperarA(() => mundoLlegado > 0));
  comprobar(
    'el invitado ve al anfitrión',
    await esperarA(() => invitado.otros().length > 0, 5000),
  );
  comprobar(
    'el anfitrión ve al invitado por su nombre',
    anfitrion.otros()[0]?.nombre === 'Invitado',
  );

  // Un bloque puesto por el anfitrión tiene que aparecer en el invitado.
  const tx = genA.spawnTx + 3;
  const ty = genA.spawnTy + 4;
  genA.mundo.setTile(tx, ty, PIEDRA);
  anfitrion.tile({ tx, ty, id: PIEDRA, pared: false });
  comprobar(
    'un bloque del anfitrión llega al invitado',
    await esperarA(() => tilesEnB.some((c) => c.tx === tx && c.ty === ty && c.id === PIEDRA), 5000),
  );

  // Y al revés: el invitado lo pide y el anfitrión lo aplica y lo difunde.
  const tx2 = genA.spawnTx - 2;
  const ty2 = genA.spawnTy + 4;
  genA.mundo.setTile(tx2, ty2, PIEDRA);
  genB.mundo.setTile(tx2, ty2, PIEDRA);
  await esperar(100);
  invitado.tile({ tx: tx2, ty: ty2, id: AIRE, pared: false });
  comprobar(
    'un bloque picado por el invitado llega al anfitrión',
    await esperarA(() => genA.mundo.getTile(tx2, ty2) === AIRE, 5000),
  );

  // Y el jugador de enfrente se mueve, que es lo que se ve en pantalla.
  const dondeAntes = invitado.otros()[0]?.x ?? 0;
  cajaA.x += 200;
  comprobar(
    'el invitado ve moverse al anfitrión',
    await esperarA(() => Math.abs((invitado.otros()[0]?.x ?? dondeAntes) - dondeAntes) > 50, 5000),
  );

  clearInterval(reloj);
  await anfitrion.cerrar();
  await invitado.cerrar();

  const resumen = document.createElement('p');
  resumen.className = fallos.length === 0 ? 'bien' : 'mal';
  resumen.textContent = fallos.length === 0 ? 'TODO BIEN' : `FALLAN ${fallos.length}`;
  document.body.appendChild(resumen);
  console.log(fallos.length === 0 ? 'BANCO-OK' : `BANCO-MAL ${fallos.join(' | ')}`);
}

void main().catch((e) => {
  comprobar(`se ha roto: ${String(e)}`, false);
  console.log(`BANCO-MAL ${String(e)}`);
});

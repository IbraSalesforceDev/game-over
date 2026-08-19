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
import { crearDrop, type Drop } from '../src/entities/drop';
import { ESPADA_HIERRO, GEL } from '../src/items/items';
import { TICKS_GOLPE } from '../src/entities/combat';
import { SimuladorLiquidos } from '../src/world/liquids';
import { CUBO_AGUA } from '../src/items/items';

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
  /** La hora que el anfitrión dice tener, y la que le llega al invitado. */
  let horaDelAnfitrion = 615;
  let horaEnElInvitado = -1;
  let golpesRecibidos = 0;
  /** Lo que el anfitrión resuelve de los mandobles del invitado. */
  /** Un apunte por tick barrido; los que empiezan un mandoble van marcados. */
  const mandobles: { arma: number; empieza: boolean }[] = [];
  const recogido: { objeto: number; cantidad: number }[] = [];
  const suelo: Drop[] = [];
  /** El simulador del anfitrión, el único que corre. */
  const agua = new SimuladorLiquidos(genA.mundo);
  agua.anotarCambios(true);
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
    minutos: () => horaDelAnfitrion,
    objetos: () => suelo,
    liquidosCambiados: (tope) => agua.tomarSucias(tope),
    alUsarCubo: (_objeto, tx, ty) => agua.verter(tx, ty, 255),
    alGolpear: (_quien, g) =>
      mandobles.push({ arma: g.arma, empieza: g.restante === TICKS_GOLPE }),
    alPedirObjeto: (quien, idDrop) => {
      const d = suelo.find((x) => x.id === idDrop);
      if (!d) return;
      d.vivo = false;
      suelo.splice(suelo.indexOf(d), 1);
      anfitrion.entregar(quien, d.objeto, d.cantidad);
    },
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
    alDarLaHora: (m) => {
      horaEnElInvitado = m;
    },
    alRecibirGolpe: () => {
      golpesRecibidos++;
    },
    alRecogerObjeto: (objeto, cantidad) => recogido.push({ objeto, cantidad }),
    alCambiarLiquidos: (cs) => {
      for (const c of cs) genB.mundo.setLiquido(c.tx, c.ty, c.nivel, c.lava);
    },
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

  // Y solo uno: repetir el saludo no puede meter a dos.
  comprobar('el invitado entra una sola vez, no dos', anfitrion.otros().length === 1);

  // El reloj del mundo es del anfitrión.
  comprobar(
    'la hora del anfitrión llega al invitado',
    await esperarA(() => horaEnElInvitado === horaDelAnfitrion, 5000),
  );
  horaDelAnfitrion = 1200;
  comprobar(
    'y le sigue cuando cambia',
    await esperarA(() => horaEnElInvitado === 1200, 5000),
  );

  // Y el anfitrión puede cobrarle un golpe.
  const quien = anfitrion.acompanantes()[0]?.id ?? 0;
  comprobar('el anfitrión ve al invitado como blanco de los bichos', quien > 0);
  anfitrion.cobrar(quien, 12, 100);
  comprobar(
    'un golpe de un bicho le llega al invitado',
    await esperarA(() => golpesRecibidos > 0, 5000),
  );

  // El mandoble del invitado lo resuelve el anfitrión, que es quien tiene los
  // bichos. Y con su cadencia: el segundo, seguido, no cuenta.
  const empezados = () => mandobles.filter((m) => m.empieza).length;
  invitado.golpear(ESPADA_HIERRO, 1, 0);
  comprobar(
    'el mandoble del invitado llega al anfitrión',
    await esperarA(() => empezados() === 1, 5000),
  );
  invitado.golpear(ESPADA_HIERRO, 1, 0);
  await esperar(400);
  comprobar('y el siguiente, sin esperar la cadencia, no cuela', empezados() === 1);

  // Un objeto en el suelo del anfitrión tiene que verse en el invitado y poder
  // pedirse.
  suelo.push(crearDrop(GEL, 5, 0, 0));
  comprobar(
    'el invitado ve lo que hay por el suelo',
    await esperarA(() => (invitado.objetos() ?? []).length === 1, 5000),
  );
  const enElSuelo = invitado.objetos()![0]!;
  comprobar('y sabe qué es y cuánto hay', enElSuelo.objeto === GEL && enElSuelo.cantidad === 5);
  invitado.pedirObjeto(enElSuelo.id);
  comprobar(
    'lo pide y el anfitrión se lo da',
    await esperarA(() => recogido.length === 1, 5000),
  );
  comprobar(
    'con lo que era y cuánto era',
    recogido[0]?.objeto === GEL && recogido[0]?.cantidad === 5,
  );
  comprobar(
    'y deja de estar en el suelo',
    await esperarA(() => (invitado.objetos() ?? []).length === 0, 5000),
  );

  // El agua la simula el anfitrión y llega hecha.
  const txAgua = genA.spawnTx + 8;
  const tyAgua = genA.spawnTy - 6;
  agua.verter(txAgua, tyAgua, 255);
  comprobar(
    'el agua del anfitrión aparece en el invitado',
    await esperarA(() => genB.mundo.getLiquido(txAgua, tyAgua) > 0, 5000),
  );

  // Y sigue llegando mientras cae: lo que se comprueba es que no es una foto
  // suelta sino el caudal.
  const antesDeCaer = genB.mundo.getLiquido(txAgua, tyAgua);
  for (let t = 0; t < 120; t++) agua.paso();
  comprobar(
    'y el agua que baja también',
    await esperarA(() => genB.mundo.getLiquido(txAgua, tyAgua) !== antesDeCaer, 5000),
  );

  // El cubo del invitado moja el mundo del anfitrión.
  // Cerca del invitado: el anfitrión comprueba el alcance, como al picar.
  const txCubo = genA.spawnTx - 3;
  const tyCubo = genA.spawnTy - 2;
  invitado.avisarCubo(CUBO_AGUA, txCubo, tyCubo);
  comprobar(
    'un cubo del invitado moja el mundo del anfitrión',
    await esperarA(() => genA.mundo.getLiquido(txCubo, tyCubo) > 0, 5000),
  );

  // Y uno tirado desde lejos, no: el alcance se comprueba donde se decide.
  const lejos = genA.spawnTx + 60;
  invitado.avisarCubo(CUBO_AGUA, lejos, tyCubo);
  await esperar(600);
  comprobar(
    'pero uno tirado a sesenta tiles no moja nada',
    genA.mundo.getLiquido(lejos, tyCubo) === 0,
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

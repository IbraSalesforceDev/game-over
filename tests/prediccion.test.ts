import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import {
  AJUSTES_POR_DEFECTO,
  actualizarFisica,
  crearCaja,
  type Caja,
  type Entrada,
} from '../src/entities/physics';
import { Mundo } from '../src/world/world';
import { PIEDRA } from '../src/world/tiles';
import {
  ERROR_TELETRANSPORTE,
  Interpolador,
  Prediccion,
  SUAVIZADO,
  type Autoridad,
} from '../src/red/prediccion';

/** Lo que el anfitrión manda de una caja: posición **y estado del salto**. */
function autoridadDe(c: Caja): Autoridad {
  return {
    x: c.x,
    y: c.y,
    vx: c.vx,
    vy: c.vy,
    enSuelo: c.enSuelo,
    saltando: c.saltando,
    nadaba: c.nadaba,
    mirando: c.mirando,
    ticksCoyote: c.ticksCoyote,
    ticksBuffer: c.ticksBuffer,
    ticksSalto: c.ticksSalto,
    yInicioCaida: c.yInicioCaida,
  };
}

/** Un suelo llano con un escalón, para que la física tenga algo que hacer. */
function mundoDePruebas(): Mundo {
  const m = new Mundo(200, 60);
  for (let tx = 0; tx < 200; tx++) {
    for (let ty = 40; ty < 60; ty++) m.setTile(tx, ty, PIEDRA);
  }
  for (let ty = 39; ty < 40; ty++) {
    for (let tx = 60; tx < 64; tx++) m.setTile(tx, ty, PIEDRA);
  }
  return m;
}

function jugadorEn(tx: number, ty: number): Caja {
  return crearCaja(tx * TILE, ty * TILE, JUGADOR_ANCHO, JUGADOR_ALTO);
}

const quieto: Entrada = {
  izq: false,
  der: false,
  abajo: false,
  salto: false,
  saltoPulsado: false,
};

/** Una tanda de teclas variada: andar, saltar, soltar, cambiar de sentido. */
function teclasDe(tick: number): Entrada {
  return {
    izq: tick % 97 > 80,
    der: tick % 97 <= 80,
    abajo: false,
    salto: tick % 23 < 6,
    saltoPulsado: tick % 23 === 0,
  };
}

describe('predecir y reconciliar', () => {
  /**
   * **El test que responde a si esto se juega bien.**
   *
   * Se simulan dos máquinas con la misma física: el anfitrión va con retraso
   * —como la red— y el invitado se adelanta prediciendo. Cada pocos ticks llega
   * una instantánea y el invitado se reconcilia.
   *
   * Al final tiene que estar **exactamente** donde estaría jugando solo. Si esto
   * fallara, el multijugador se sentiría como jugar con el personaje resbalando.
   */
  it('un invitado con retraso acaba donde estaría jugando solo', () => {
    const RETRASO = 8; // ticks de ida y vuelta
    const TICKS = 400;

    // 1. La referencia: alguien jugando sin red de por medio.
    const mundoSolo = mundoDePruebas();
    const solo = jugadorEn(10, 38);
    for (let t = 0; t < TICKS; t++) {
      actualizarFisica(mundoSolo, solo, teclasDe(t), AJUSTES_POR_DEFECTO);
    }

    // 2. Lo mismo, pero con anfitrión, invitado y retraso.
    const mundoAnf = mundoDePruebas();
    const mundoInv = mundoDePruebas();
    const anfitrion = jugadorEn(10, 38);
    const invitado = jugadorEn(10, 38);
    const pred = new Prediccion();
    let ultimoTickDelAnfitrion = -1;

    for (let t = 0; t < TICKS; t++) {
      // El invitado aplica sus teclas en el acto y las apunta.
      const teclas = teclasDe(t);
      actualizarFisica(mundoInv, invitado, teclas, AJUSTES_POR_DEFECTO);
      pred.registrar(t, teclas);

      // El anfitrión procesa lo que le llegó hace `RETRASO` ticks.
      const tickQueLlega = t - RETRASO;
      if (tickQueLlega >= 0) {
        actualizarFisica(mundoAnf, anfitrion, teclasDe(tickQueLlega), AJUSTES_POR_DEFECTO);
        ultimoTickDelAnfitrion = tickQueLlega;
      }

      // Cada 3 ticks manda instantánea (20 Hz sobre 60).
      if (t % 3 === 0 && ultimoTickDelAnfitrion >= 0) {
        pred.reconciliar(
          mundoInv,
          invitado,
          AJUSTES_POR_DEFECTO,
          autoridadDe(anfitrion),
          ultimoTickDelAnfitrion,
        );
      }
      pred.avanzarSuavizado();
    }

    expect(invitado.x).toBeCloseTo(solo.x, 6);
    expect(invitado.y).toBeCloseTo(solo.y, 6);
  });

  /** Sin nada que corregir, la corrección no se dispara. */
  it('si nadie empuja, no corrige nada', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const espejo = jugadorEn(10, 38);
    const pred = new Prediccion();

    for (let t = 0; t < 30; t++) {
      actualizarFisica(mundo, caja, teclasDe(t), AJUSTES_POR_DEFECTO);
      pred.registrar(t, teclasDe(t));
      actualizarFisica(mundo, espejo, teclasDe(t), AJUSTES_POR_DEFECTO);
    }

    const r = pred.reconciliar(
      mundo,
      caja,
      AJUSTES_POR_DEFECTO,
      autoridadDe(espejo),
      29,
    );
    expect(r.corregido).toBe(false);
    expect(r.repetidas).toBe(0);
  });

  /**
   * El fallo silencioso que este test existe para impedir.
   *
   * El juego reutiliza el mismo objeto de entrada tick tras tick. Guardarlo por
   * referencia haría que el historial entero fuera el último tick repetido, y
   * la repetición daría un resultado plausible pero equivocado — el peor tipo de
   * error, porque no falla, solo se juega raro.
   */
  it('guarda una copia de las teclas, no el objeto que le pasan', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const pred = new Prediccion();

    // El mismo objeto, cambiado entre ticks, como hace el juego de verdad.
    const entrada: Entrada = { ...quieto, der: true };
    pred.registrar(0, entrada);
    entrada.der = false;
    entrada.izq = true;
    pred.registrar(1, entrada);

    const derecha = jugadorEn(10, 38);
    actualizarFisica(mundo, derecha, { ...quieto, der: true }, AJUSTES_POR_DEFECTO);
    actualizarFisica(mundo, derecha, { ...quieto, izq: true }, AJUSTES_POR_DEFECTO);

    pred.reconciliar(
      mundo,
      caja,
      AJUSTES_POR_DEFECTO,
      autoridadDe(jugadorEn(10, 38)),
      -1,
    );
    expect(caja.x).toBeCloseTo(derecha.x, 6);
  });

  it('el historial no crece sin fin', () => {
    const pred = new Prediccion();
    for (let t = 0; t < 1000; t++) pred.registrar(t, quieto);
    expect(pred.pendientes).toBeLessThanOrEqual(180);
  });

  it('lo ya confirmado se tira', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const pred = new Prediccion();
    for (let t = 0; t < 50; t++) pred.registrar(t, quieto);
    pred.reconciliar(
      mundo,
      caja,
      AJUSTES_POR_DEFECTO,
      autoridadDe(caja),
      39,
    );
    expect(pred.pendientes).toBe(10);
  });
});

describe('que la corrección no se vea', () => {
  it('un empujón pequeño se guarda como desvío y se va solo', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const pred = new Prediccion();
    pred.registrar(0, quieto);

    pred.reconciliar(
      mundo,
      caja,
      AJUSTES_POR_DEFECTO,
      { ...autoridadDe(caja), x: caja.x + 20 },
      -1,
    );
    // La física ya está en su sitio, y lo que miente unos frames es el dibujo.
    expect(Math.abs(pred.desvioX)).toBeGreaterThan(1);

    const alPrincipio = Math.abs(pred.desvioX);
    pred.avanzarSuavizado();
    expect(Math.abs(pred.desvioX)).toBeCloseTo(alPrincipio * SUAVIZADO, 6);

    for (let i = 0; i < 200; i++) pred.avanzarSuavizado();
    expect(pred.desvioX).toBe(0);
  });

  /** Suavizar doscientos píxeles sería ver al personaje volar como un fantasma. */
  it('un salto enorme no se suaviza: se aparece y ya', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const pred = new Prediccion();
    pred.registrar(0, quieto);

    const r = pred.reconciliar(
      mundo,
      caja,
      AJUSTES_POR_DEFECTO,
      { ...autoridadDe(caja), x: caja.x + ERROR_TELETRANSPORTE * 3 },
      -1,
    );
    expect(r.corregido).toBe(true);
    expect(pred.desvioX).toBe(0);
    expect(pred.desvioY).toBe(0);
  });

  it('olvidar deja todo a cero', () => {
    const mundo = mundoDePruebas();
    const caja = jugadorEn(10, 38);
    const pred = new Prediccion();
    pred.registrar(0, quieto);
    pred.reconciliar(mundo, caja, AJUSTES_POR_DEFECTO, { ...autoridadDe(caja), x: caja.x + 30 }, -1);
    pred.olvidar();
    expect(pred.pendientes).toBe(0);
    expect(pred.desvioX).toBe(0);
  });
});

describe('los demás jugadores se interpolan', () => {
  it('va de una instantánea a la siguiente sin saltos', () => {
    const i = new Interpolador();
    i.meter(0, 0);
    i.meter(30, 0);
    expect(i.donde()!.x).toBe(0);
    i.avanzar(0.5);
    expect(i.donde()!.x).toBeCloseTo(15, 6);
    i.avanzar(0.5);
    expect(i.donde()!.x).toBeCloseTo(30, 6);
  });

  it('no se pasa de la última conocida por mucho que avance', () => {
    const i = new Interpolador();
    i.meter(0, 0);
    i.meter(10, 0);
    for (let n = 0; n < 20; n++) i.avanzar(1);
    expect(i.donde()!.x).toBe(10);
  });

  it('sin ninguna instantánea no dice dónde está', () => {
    expect(new Interpolador().donde()).toBeNull();
  });

  it('la primera instantánea se pinta tal cual, sin venir de ningún sitio', () => {
    const i = new Interpolador();
    i.meter(500, 300);
    expect(i.donde()).toEqual({ x: 500, y: 300 });
  });
});

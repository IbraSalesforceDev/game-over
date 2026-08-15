import { describe, expect, it } from 'vitest';
import { JUGADOR_ALTO, JUGADOR_ANCHO, TILE } from '../src/core/constants';
import {
  AJUSTES_POR_DEFECTO,
  actualizarFisica,
  crearCaja,
  ENTRADA_VACIA,
  moverX,
  moverY,
  type Ajustes,
  type Caja,
  type Entrada,
} from '../src/entities/physics';
import { PIEDRA, PLATAFORMA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

function mundoPlano(ancho = 60, alto = 40): Mundo {
  const m = new Mundo(ancho, alto);
  m.rellenar(0, SUELO, ancho - 1, alto - 1, TIERRA);
  return m;
}

function jugadorEn(txPies: number): Caja {
  return crearCaja(
    txPies * TILE,
    SUELO * TILE - JUGADOR_ALTO,
    JUGADOR_ANCHO,
    JUGADOR_ALTO,
  );
}

function entrada(parcial: Partial<Entrada> = {}): Entrada {
  return { ...ENTRADA_VACIA, ...parcial };
}

function ajustes(parcial: Partial<Ajustes> = {}): Ajustes {
  return { ...AJUSTES_POR_DEFECTO, ...parcial };
}

/** Simula n ticks con la misma entrada mantenida. */
function correr(m: Mundo, c: Caja, e: Entrada, n: number, aj = ajustes()): void {
  for (let i = 0; i < n; i++) {
    actualizarFisica(m, c, e, aj);
    // El flanco de salto solo vale para el primer tick.
    e = { ...e, saltoPulsado: false };
  }
}

describe('colisión por ejes', () => {
  it('frena contra una pared por la derecha alineando la caja al tile', () => {
    const m = mundoPlano();
    m.rellenar(10, SUELO - 5, 10, SUELO - 1, PIEDRA);
    const c = jugadorEn(8);
    const chocado = moverX(m, c, 14);
    expect(chocado).toBe(true);
    expect(c.x + c.ancho).toBe(10 * TILE);
  });

  it('quedarse justo pegado a la pared no cuenta como colisión', () => {
    const m = mundoPlano();
    m.rellenar(10, SUELO - 5, 10, SUELO - 1, PIEDRA);
    const c = jugadorEn(8);
    // 12 px dejan el borde derecho exactamente en 160, tocando sin solapar.
    expect(moverX(m, c, 12)).toBe(false);
    expect(c.x + c.ancho).toBe(10 * TILE);
  });

  it('frena contra una pared por la izquierda', () => {
    const m = mundoPlano();
    m.rellenar(5, SUELO - 5, 5, SUELO - 1, PIEDRA);
    const c = jugadorEn(6);
    const chocado = moverX(m, c, -12);
    expect(chocado).toBe(true);
    expect(c.x).toBe(6 * TILE);
  });

  it('el techo detiene la subida y deja la cabeza pegada al bloque', () => {
    const m = mundoPlano();
    m.rellenar(0, SUELO - 6, 59, SUELO - 6, PIEDRA);
    const c = jugadorEn(8);
    c.y = (SUELO - 5) * TILE + 4;
    const r = moverY(m, c, -8, false);
    expect(r.colision).toBe(true);
    expect(r.suelo).toBe(false);
    expect(c.y).toBe((SUELO - 5) * TILE);
  });
});

describe('no hay tunneling', () => {
  it('a velocidad terminal no atraviesa un suelo de un solo tile', () => {
    const m = new Mundo(40, 60);
    m.rellenar(0, 50, 39, 50, PIEDRA);
    const c = jugadorEn(10);
    c.y = 0;
    c.vy = AJUSTES_POR_DEFECTO.velTerminal;
    correr(m, c, entrada(), 200);
    expect(c.enSuelo).toBe(true);
    expect(c.y + c.alto).toBe(50 * TILE);
  });

  it('a velocidad alta en horizontal no atraviesa una pared de un tile', () => {
    const m = mundoPlano(80);
    m.rellenar(30, SUELO - 6, 30, SUELO - 1, PIEDRA);
    const c = jugadorEn(10);
    c.vx = 30;
    correr(m, c, entrada({ der: true }), 30, ajustes({ velMaxima: 30 }));
    expect(c.x + c.ancho).toBeLessThanOrEqual(30 * TILE);
  });
});

describe('subida automática de escalón', () => {
  it('sube un escalón de 1 tile sin saltar', () => {
    const m = mundoPlano();
    m.rellenar(20, SUELO - 1, 40, SUELO - 1, TIERRA);
    const c = jugadorEn(16);
    correr(m, c, entrada({ der: true }), 140);
    expect(c.x).toBeGreaterThan(20 * TILE);
    expect(c.y + c.alto).toBe((SUELO - 1) * TILE);
  });

  it('no sube un escalón de 2 tiles', () => {
    const m = mundoPlano();
    m.rellenar(20, SUELO - 2, 40, SUELO - 1, TIERRA);
    const c = jugadorEn(16);
    correr(m, c, entrada({ der: true }), 140);
    expect(c.x + c.ancho).toBeLessThanOrEqual(20 * TILE);
  });

  it('no trepa un muro alto empujando contra él', () => {
    const m = mundoPlano();
    m.rellenar(20, SUELO - 10, 21, SUELO - 1, PIEDRA);
    const c = jugadorEn(16);
    const yInicial = c.y;
    correr(m, c, entrada({ der: true }), 300);
    expect(c.y).toBe(yInicial);
  });
});

describe('salto', () => {
  it('el salto mantenido llega más alto que el tocado', () => {
    const m = mundoPlano();

    const corto = jugadorEn(10);
    let alturaCorta = 0;
    actualizarFisica(m, corto, entrada({ salto: true, saltoPulsado: true }), ajustes());
    for (let i = 0; i < 90; i++) {
      actualizarFisica(m, corto, entrada(), ajustes());
      alturaCorta = Math.max(alturaCorta, (SUELO * TILE - JUGADOR_ALTO - corto.y) / TILE);
    }

    const largo = jugadorEn(10);
    let alturaLarga = 0;
    const mantenido = entrada({ salto: true, saltoPulsado: true });
    actualizarFisica(m, largo, mantenido, ajustes());
    for (let i = 0; i < 90; i++) {
      actualizarFisica(m, largo, entrada({ salto: true }), ajustes());
      alturaLarga = Math.max(alturaLarga, (SUELO * TILE - JUGADOR_ALTO - largo.y) / TILE);
    }

    expect(alturaLarga).toBeGreaterThan(alturaCorta + 1);
    // Y en ambos casos se vuelve al suelo.
    expect(largo.enSuelo).toBe(true);
  });

  it('el coyote time permite saltar justo después de salirse del borde', () => {
    const m = new Mundo(60, 40);
    m.rellenar(0, SUELO, 20, 39, TIERRA); // el suelo acaba en tx=20
    const c = jugadorEn(19);
    // Asentarse en el suelo y luego andar hasta pasarse del borde. Paramos en
    // el primer tick sin suelo, con la ventana de coyote recién abierta.
    actualizarFisica(m, c, entrada(), ajustes());
    expect(c.enSuelo).toBe(true);
    for (let i = 0; i < 300 && c.enSuelo; i++) {
      actualizarFisica(m, c, entrada({ der: true }), ajustes());
    }
    expect(c.enSuelo).toBe(false);
    expect(c.ticksCoyote).toBeGreaterThan(0);
    const yAntes = c.y;
    actualizarFisica(m, c, entrada({ der: true, salto: true, saltoPulsado: true }), ajustes());
    expect(c.vy).toBeLessThan(0);
    expect(c.y).toBeLessThan(yAntes);
  });

  it('el buffer de salto dispara al aterrizar si se pulsó justo antes', () => {
    const m = mundoPlano();
    const c = jugadorEn(10);
    c.y = (SUELO - 8) * TILE;
    // Caer hasta quedar a un par de ticks del suelo.
    while (!c.enSuelo && c.y + c.alto < SUELO * TILE - 12) {
      actualizarFisica(m, c, entrada(), ajustes());
    }
    expect(c.enSuelo).toBe(false);
    // Pulsar salto en el aire: el buffer debe recordarlo hasta tocar suelo.
    actualizarFisica(m, c, entrada({ salto: true, saltoPulsado: true }), ajustes());
    correr(m, c, entrada({ salto: true }), 4);
    expect(c.vy).toBeLessThan(0);
  });

  it('sin coyote ni buffer no se puede saltar en el aire', () => {
    const m = mundoPlano();
    const aj = ajustes({ coyote: 0, bufferSalto: 0 });
    const c = jugadorEn(10);
    c.y = (SUELO - 8) * TILE;
    correr(m, c, entrada(), 4, aj);
    const vyAntes = c.vy;
    actualizarFisica(m, c, entrada({ salto: true, saltoPulsado: true }), aj);
    expect(c.vy).toBeGreaterThan(vyAntes - 0.001);
  });
});

describe('plataformas de una dirección', () => {
  it('frenan al caer sobre ellas', () => {
    const m = mundoPlano();
    m.rellenar(0, SUELO - 6, 59, SUELO - 6, PLATAFORMA);
    const c = jugadorEn(10);
    c.y = (SUELO - 12) * TILE;
    correr(m, c, entrada(), 60);
    expect(c.enSuelo).toBe(true);
    expect(c.y + c.alto).toBe((SUELO - 6) * TILE);
  });

  it('se atraviesan de abajo arriba', () => {
    const m = mundoPlano();
    m.rellenar(0, SUELO - 4, 59, SUELO - 4, PLATAFORMA);
    const c = jugadorEn(10);
    const yTecho = (SUELO - 4) * TILE;
    correr(m, c, entrada({ salto: true, saltoPulsado: true }), 12);
    // Ha subido por encima del nivel de la plataforma sin que lo frene.
    expect(c.y).toBeLessThan(yTecho);
  });

  it('se bajan con abajo + salto', () => {
    const m = mundoPlano();
    m.rellenar(0, SUELO - 6, 59, SUELO - 6, PLATAFORMA);
    const c = jugadorEn(10);
    c.y = (SUELO - 6) * TILE - JUGADOR_ALTO;
    correr(m, c, entrada(), 2);
    expect(c.enSuelo).toBe(true);
    correr(m, c, entrada({ abajo: true, salto: true, saltoPulsado: true }), 40);
    expect(c.y + c.alto).toBe(SUELO * TILE);
  });
});

describe('huecos estrechos', () => {
  /** Muro macizo con una puerta de `alto` tiles a ras de suelo. */
  function muroConPuerta(alto: number): Mundo {
    const m = mundoPlano();
    m.rellenar(20, SUELO - 12, 21, SUELO - 1, PIEDRA);
    m.rellenar(20, SUELO - alto, 21, SUELO - 1, 0);
    return m;
  }

  it('la caja de 42 px pasa por una puerta de 3 tiles de alto', () => {
    const m = muroConPuerta(3);
    const c = jugadorEn(15);
    correr(m, c, entrada({ der: true }), 200);
    expect(c.x).toBeGreaterThan(22 * TILE);
  });

  it('no pasa por una puerta de 2 tiles de alto', () => {
    const m = muroConPuerta(2);
    const c = jugadorEn(15);
    correr(m, c, entrada({ der: true }), 200);
    expect(c.x + c.ancho).toBeLessThanOrEqual(20 * TILE);
  });

  it('cae por un pozo de 2 tiles de ancho hasta el fondo', () => {
    const m = new Mundo(60, 60);
    m.rellenar(0, SUELO, 59, 59, PIEDRA);
    // Pozo vertical de 2 tiles de ancho y 10 de profundidad.
    m.rellenar(30, SUELO, 31, SUELO + 9, 0);
    const c = jugadorEn(30);
    correr(m, c, entrada(), 120);
    expect(c.enSuelo).toBe(true);
    expect(c.y + c.alto).toBe((SUELO + 10) * TILE);
  });
});

describe('velocidades', () => {
  it('la caída se capa a la velocidad terminal', () => {
    const m = new Mundo(40, 200);
    const c = jugadorEn(10);
    c.y = 0;
    correr(m, c, entrada(), 300);
    expect(c.vy).toBeLessThanOrEqual(AJUSTES_POR_DEFECTO.velTerminal + 0.0001);
  });

  it('correr se capa a la velocidad máxima', () => {
    const m = mundoPlano(400);
    const c = jugadorEn(10);
    correr(m, c, entrada({ der: true }), 400);
    expect(Math.abs(c.vx)).toBeLessThanOrEqual(AJUSTES_POR_DEFECTO.velMaxima + 0.0001);
  });

  it('la fricción para al jugador al soltar la dirección', () => {
    const m = mundoPlano(400);
    const c = jugadorEn(10);
    correr(m, c, entrada({ der: true }), 120);
    expect(c.vx).toBeGreaterThan(0);
    correr(m, c, entrada(), 60);
    expect(c.vx).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import {
  AMANECER,
  ATARDECER,
  LUZ_DIA,
  LUZ_NOCHE,
  MEDIA_MANANA,
  NOCHE,
  Reloj,
} from '../src/engine/time';
import { CAIDA_AIRE, CAIDA_SOLIDO, LUZ_MINIMA, MotorLuz } from '../src/world/lighting';
import { AIRE, ANTORCHA, PIEDRA, TIERRA } from '../src/world/tiles';
import { Mundo } from '../src/world/world';

const SUELO = 20;

/** Mundo con cielo abierto arriba y roca maciza desde la fila SUELO. */
function mundoBase(ancho = 60, alto = 60): Mundo {
  const m = new Mundo(ancho, alto);
  m.rellenar(0, SUELO, ancho - 1, alto - 1, PIEDRA);
  for (let ty = SUELO + 1; ty < alto; ty++) {
    for (let tx = 0; tx < ancho; tx++) m.setPared(tx, ty, PIEDRA);
  }
  return m;
}

/** Prepara el motor con una ventana que cubre todo el mundo de prueba. */
function motorSobre(m: Mundo, luzSolar = LUZ_DIA): MotorLuz {
  const motor = new MotorLuz(m);
  motor.actualizar(0, 0, m.ancho - 1, m.alto - 1, luzSolar);
  return motor;
}

describe('altura del cielo', () => {
  it('marca la primera fila tapada de cada columna', () => {
    const m = mundoBase();
    const motor = new MotorLuz(m);
    expect(motor.alturaCielo[10]).toBe(SUELO);
  });

  it('poner un bloque baja el cielo de esa columna', () => {
    const m = mundoBase();
    const motor = new MotorLuz(m);
    m.setTile(10, 5, PIEDRA);
    motor.invalidar(10);
    expect(motor.alturaCielo[10]).toBe(5);
    expect(motor.alturaCielo[11]).toBe(SUELO);
  });

  it('una pared también tapa el cielo', () => {
    const m = mundoBase();
    const motor = new MotorLuz(m);
    m.setPared(10, 8, TIERRA);
    motor.invalidar(10);
    expect(motor.alturaCielo[10]).toBe(8);
  });

  it('quitar el bloque devuelve el cielo', () => {
    const m = mundoBase();
    const motor = new MotorLuz(m);
    m.setTile(10, 5, PIEDRA);
    motor.invalidar(10);
    m.setTile(10, 5, AIRE);
    motor.invalidar(10);
    expect(motor.alturaCielo[10]).toBe(SUELO);
  });
});

describe('propagación de la luz', () => {
  it('el cielo abierto está a plena luz', () => {
    const motor = motorSobre(mundoBase());
    expect(motor.nivel(30, 5)).toBe(LUZ_DIA);
  });

  it('la luz se apaga al meterse en la roca', () => {
    const motor = motorSobre(mundoBase());
    const superficie = motor.nivel(30, SUELO);
    const unoDentro = motor.nivel(30, SUELO + 1);
    const dosDentro = motor.nivel(30, SUELO + 2);
    expect(superficie).toBeGreaterThan(unoDentro);
    expect(unoDentro).toBeGreaterThan(dosDentro);
  });

  it('a suficiente profundidad se llega al suelo de luz', () => {
    const motor = motorSobre(mundoBase());
    // Ya no es negro absoluto: hay un suelo de luz para que se vea dónde se
    // pisa. Lo que se comprueba es que no llega nada de fuera, no que valga 0.
    expect(motor.nivel(30, SUELO + 12)).toBe(LUZ_MINIMA);
  });

  it('la caída por roca es mayor que por aire', () => {
    expect(CAIDA_SOLIDO).toBeGreaterThan(CAIDA_AIRE);
  });

  it('una cueva deja que la luz entre más lejos que la roca', () => {
    const m = mundoBase();
    // Galería horizontal excavada bajo la superficie.
    m.rellenar(20, SUELO + 2, 40, SUELO + 2, AIRE);
    // Un pozo que la conecta con el exterior.
    m.rellenar(20, SUELO, 20, SUELO + 2, AIRE);
    const motor = motorSobre(m);
    const enGaleria = motor.nivel(26, SUELO + 2);
    const enRoca = motor.nivel(26, SUELO + 3);
    expect(enGaleria).toBeGreaterThan(0);
    expect(enGaleria).toBeGreaterThan(enRoca);
  });

  it('de noche la superficie se oscurece pero no del todo', () => {
    const dia = motorSobre(mundoBase(), LUZ_DIA).nivel(30, SUELO);
    const noche = motorSobre(mundoBase(), LUZ_NOCHE).nivel(30, SUELO);
    expect(noche).toBeLessThan(dia);
    expect(noche).toBeGreaterThan(0);
  });
});

describe('antorchas', () => {
  it('iluminan una cueva a oscuras', () => {
    const m = mundoBase();
    m.rellenar(20, SUELO + 15, 40, SUELO + 18, AIRE);
    const sinAntorcha = motorSobre(m).nivel(30, SUELO + 16);
    expect(sinAntorcha).toBe(LUZ_MINIMA);

    m.setTile(30, SUELO + 16, ANTORCHA);
    const motor = motorSobre(m);
    expect(motor.nivel(30, SUELO + 16)).toBeGreaterThan(200);
  });

  it('su luz decae con la distancia', () => {
    const m = mundoBase();
    m.rellenar(20, SUELO + 15, 45, SUELO + 18, AIRE);
    m.setTile(25, SUELO + 16, ANTORCHA);
    const motor = motorSobre(m);
    const cerca = motor.nivel(27, SUELO + 16);
    const lejos = motor.nivel(33, SUELO + 16);
    expect(cerca).toBeGreaterThan(lejos);
    expect(lejos).toBeGreaterThanOrEqual(LUZ_MINIMA);
  });

  it('no atraviesan una pared de roca gruesa: al otro lado solo queda el mínimo', () => {
    const m = mundoBase();
    m.rellenar(20, SUELO + 15, 24, SUELO + 18, AIRE);
    m.rellenar(35, SUELO + 15, 40, SUELO + 18, AIRE);
    m.setTile(22, SUELO + 16, ANTORCHA);
    const motor = motorSobre(m);
    expect(motor.nivel(38, SUELO + 16)).toBe(LUZ_MINIMA);
  });
});

describe('reloj', () => {
  it('avanza y da la vuelta al día', () => {
    const r = new Reloj(0);
    r.velocidad = 60; // un minuto de juego por segundo... por 60
    r.avanzar(24);
    expect(r.minutos).toBeCloseTo(1440 % 1440, 5);
  });

  it('la hora se formatea con dos dígitos', () => {
    expect(new Reloj(9 * 60 + 5).hora).toBe('09:05');
    expect(new Reloj(23 * 60 + 59).hora).toBe('23:59');
  });

  it('es de día al mediodía y de noche a medianoche', () => {
    expect(new Reloj(12 * 60).esNoche).toBe(false);
    expect(new Reloj(0).esNoche).toBe(true);
    expect(new Reloj(22 * 60).esNoche).toBe(true);
  });

  it('la luz solar es máxima de día y mínima de noche', () => {
    expect(new Reloj(12 * 60).luzSolar).toBe(LUZ_DIA);
    expect(new Reloj(2 * 60).luzSolar).toBe(LUZ_NOCHE);
  });

  it('el amanecer sube la luz de forma continua', () => {
    let anterior = new Reloj(AMANECER).luzSolar;
    for (let m = AMANECER; m <= MEDIA_MANANA; m += 10) {
      const actual = new Reloj(m).luzSolar;
      expect(actual).toBeGreaterThanOrEqual(anterior);
      anterior = actual;
    }
    expect(anterior).toBe(LUZ_DIA);
  });

  it('el ocaso baja la luz de forma continua', () => {
    let anterior = new Reloj(ATARDECER).luzSolar;
    for (let m = ATARDECER; m <= NOCHE; m += 10) {
      const actual = new Reloj(m).luzSolar;
      expect(actual).toBeLessThanOrEqual(anterior);
      anterior = actual;
    }
    expect(anterior).toBe(LUZ_NOCHE);
  });

  it('el color del cielo cambia a lo largo del día', () => {
    const dia = new Reloj(12 * 60).colorCielo;
    const noche = new Reloj(0).colorCielo;
    expect(dia).not.toEqual(noche);
    // La noche es más oscura en las tres bandas.
    for (let i = 0; i < 3; i++) {
      const sumaDia = dia[i]!.reduce((a, b) => a + b, 0);
      const sumaNoche = noche[i]!.reduce((a, b) => a + b, 0);
      expect(sumaNoche).toBeLessThan(sumaDia);
    }
  });

  it('el tinte de la luz vira a azul de noche', () => {
    const noche = new Reloj(2 * 60).tinteLuz;
    expect(noche[2]).toBeGreaterThan(noche[0]);
  });
});

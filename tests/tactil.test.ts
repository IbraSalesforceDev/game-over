import { describe, expect, it } from 'vitest';
import { decidirModo } from '../src/engine/dispositivo';
import {
  direccionJoystick,
  ESPERA_TOQUE_MS,
  gestoDelToque,
  PULSO_MINIMO_MS,
  Toque,
} from '../src/engine/gesto';
import { crearEntrada } from '../src/engine/input';
import {
  ARCO,
  AZADA,
  CUBO,
  defObjeto,
  ESPADA_MADERA,
  PAN,
  PICO_MADERA,
  POCION_VIDA,
  SEMILLAS,
} from '../src/items/items';
import { AIRE, CAMA, COFRE, MESA, PIEDRA, TIERRA } from '../src/world/tiles';

/**
 * Jugar con el dedo.
 *
 * Todo lo que decide qué hace un toque vive en funciones sin navegador, y por
 * eso se puede probar aquí entero: con ratón el juego lleva años funcionando, y
 * lo único nuevo es quién aprieta los botones.
 */

describe('móvil o escritorio', () => {
  const movil = { punteroGrueso: true, sinEncima: true };
  const pc = { punteroGrueso: false, sinEncima: false };

  it('un móvil o una tableta, táctil', () => {
    expect(decidirModo(movil, 'auto')).toBe('tactil');
  });

  it('un ordenador, escritorio', () => {
    expect(decidirModo(pc, 'auto')).toBe('escritorio');
  });

  /**
   * Un portátil con pantalla táctil se puede tocar, pero se juega con ratón:
   * su puntero principal es fino y tiene «encima». Mirar solo si hay pantalla
   * táctil le pondría un joystick a quien tiene un teclado delante.
   */
  it('un portátil con pantalla táctil sigue siendo escritorio', () => {
    expect(decidirModo({ punteroGrueso: false, sinEncima: false }, 'auto')).toBe('escritorio');
    expect(decidirModo({ punteroGrueso: true, sinEncima: false }, 'auto')).toBe('escritorio');
  });

  it('lo que se elige en los ajustes manda sobre lo que se detecta', () => {
    expect(decidirModo(pc, 'tactil')).toBe('tactil');
    expect(decidirModo(movil, 'escritorio')).toBe('escritorio');
  });
});

describe('qué hace un toque', () => {
  it('con el pico, pica', () => {
    expect(gestoDelToque(PICO_MADERA, PIEDRA)).toBe('izq');
  });

  it('con un arma, golpea, y con el arco, dispara', () => {
    expect(gestoDelToque(ESPADA_MADERA, AIRE)).toBe('izq');
    expect(gestoDelToque(ARCO, AIRE)).toBe('izq');
  });

  it('con un bloque, lo coloca', () => {
    expect(defObjeto(TIERRA).tile).toBe(TIERRA);
    expect(gestoDelToque(TIERRA, AIRE)).toBe('der');
  });

  it('comer, beber, sembrar, labrar y el cubo van con el derecho', () => {
    for (const objeto of [PAN, POCION_VIDA, SEMILLAS, AZADA, CUBO]) {
      expect(gestoDelToque(objeto, TIERRA)).toBe('der');
    }
  });

  /**
   * La única ambigüedad: un cofre tocado con algo que pica. Se espera a ver si
   * el dedo se queda; un toque corto abre y mantener rompe.
   */
  it('un cofre, una mesa o una cama con el pico en la mano: hay que esperar', () => {
    for (const tile of [COFRE, MESA, CAMA]) {
      expect(gestoDelToque(PICO_MADERA, tile)).toBe('esperar');
    }
  });

  it('con un bloque en la mano, un cofre se abre sin esperar', () => {
    expect(gestoDelToque(TIERRA, COFRE)).toBe('der');
  });
});

describe('el dedo en el tiempo', () => {
  it('mientras está apoyado, el botón está apretado', () => {
    const t = new Toque();
    t.apoyar('izq', 0);
    expect(t.botones(0).izq).toBe(true);
    expect(t.botones(1000).izq).toBe(true);
  });

  /**
   * El juego mira los botones una vez por tick. Un toque que empieza y acaba
   * entre dos ticks no se vería nunca: con el pulso mínimo se ve al menos tres.
   */
  it('un toque rapidísimo dura al menos el pulso mínimo', () => {
    const t = new Toque();
    t.apoyar('der', 0);
    t.levantar(5);
    expect(t.botones(10).der).toBe(true);
    expect(t.botones(PULSO_MINIMO_MS - 1).der).toBe(true);
    expect(t.botones(PULSO_MINIMO_MS + 1).der).toBe(false);
  });

  it('un toque largo se suelta en cuanto se levanta el dedo', () => {
    const t = new Toque();
    t.apoyar('izq', 0);
    t.levantar(800);
    expect(t.botones(801).izq).toBe(false);
  });

  it('esperando: un toque corto abre', () => {
    const t = new Toque();
    t.apoyar('esperar', 0);
    // Mientras dura la espera no aprieta nada: aún no se sabe qué es.
    expect(t.botones(100)).toEqual({ izq: false, der: false });
    t.levantar(120);
    expect(t.botones(130)).toEqual({ izq: false, der: true });
    expect(t.botones(120 + PULSO_MINIMO_MS + 1)).toEqual({ izq: false, der: false });
  });

  it('esperando: mantener el dedo pica, y al levantarlo deja de picar', () => {
    const t = new Toque();
    t.apoyar('esperar', 0);
    expect(t.botones(ESPERA_TOQUE_MS + 10)).toEqual({ izq: true, der: false });
    t.levantar(900);
    // Levantar después de picar no abre el cofre que se estaba rompiendo.
    expect(t.botones(905)).toEqual({ izq: false, der: false });
  });

  /** Una llamada o el centro de control se quedan el dedo: no se hace nada. */
  it('cancelado, no aprieta nada, ni siquiera el pulso', () => {
    const t = new Toque();
    t.apoyar('der', 0);
    t.cancelar();
    expect(t.botones(1)).toEqual({ izq: false, der: false });
  });
});

describe('el joystick', () => {
  const R = 46;

  it('quieto en el centro, nada', () => {
    expect(direccionJoystick(0, 0, R)).toEqual({ izq: false, der: false, abajo: false });
  });

  /** Apoyar el pulgar no puede echar a andar al personaje. */
  it('un roce dentro del margen muerto no anda', () => {
    expect(direccionJoystick(R * 0.2, 0, R).der).toBe(false);
    expect(direccionJoystick(-R * 0.2, 0, R).izq).toBe(false);
  });

  it('empujando a un lado, anda', () => {
    expect(direccionJoystick(R * 0.6, 0, R)).toEqual({ izq: false, der: true, abajo: false });
    expect(direccionJoystick(-R, 0, R)).toEqual({ izq: true, der: false, abajo: false });
  });

  /**
   * Abajo atraviesa plataformas. Andar con el pulgar un poco caído no puede
   * tirarte de un puente.
   */
  it('andar con el pulgar algo caído no es «abajo»', () => {
    expect(direccionJoystick(R * 0.8, R * 0.4, R).abajo).toBe(false);
  });

  it('abajo de verdad sí', () => {
    expect(direccionJoystick(0, R * 0.9, R).abajo).toBe(true);
  });
});

describe('los controles de la pantalla entran por el teclado', () => {
  /** Un `window` de mentira: apunta los manejadores y nada más. */
  function ventana(): { ventana: Window; disparar(tipo: string, codigo: string): void } {
    const m = new Map<string, (e: unknown) => void>();
    return {
      ventana: {
        addEventListener: (t: string, fn: (e: unknown) => void) => m.set(t, fn),
        removeEventListener: (t: string) => m.delete(t),
      } as unknown as Window,
      disparar: (tipo, codigo) =>
        m.get(tipo)?.({
          code: codigo,
          altKey: false,
          repeat: false,
          target: null,
          preventDefault: () => {},
        }),
    };
  }

  it('el joystick anda como la tecla', () => {
    const v = ventana();
    const e = crearEntrada(v.ventana);
    e.fijar('der', true);
    expect(e.estado().der).toBe(true);
    e.fijar('der', false);
    expect(e.estado().der).toBe(false);
  });

  /**
   * Una tableta con teclado: soltar el joystick no puede soltar la D que se
   * está manteniendo en el teclado.
   */
  it('soltar el joystick no suelta la tecla que se mantiene', () => {
    const v = ventana();
    const e = crearEntrada(v.ventana);
    v.disparar('keydown', 'KeyD');
    e.fijar('der', true);
    e.fijar('der', false);
    expect(e.estado().der).toBe(true);
  });

  it('el botón de saltar da el flanco de salto, una vez', () => {
    const v = ventana();
    const e = crearEntrada(v.ventana);
    e.fijar('salto', true);
    expect(e.estado().saltoPulsado).toBe(true);
    e.finTick();
    // Mantenido: sigue saltando más alto, pero no vuelve a «pulsarse».
    e.fijar('salto', true);
    expect(e.estado()).toMatchObject({ salto: true, saltoPulsado: false });
  });

  it('un botón de la pantalla dispara el mismo atajo que su tecla', () => {
    const v = ventana();
    const e = crearEntrada(v.ventana);
    let abierto = 0;
    e.alPulsar('KeyE', () => abierto++);
    e.pulsar('KeyE');
    v.disparar('keydown', 'KeyE');
    expect(abierto).toBe(2);
  });
});

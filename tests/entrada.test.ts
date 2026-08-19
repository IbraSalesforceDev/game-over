import { describe, expect, it } from 'vitest';
import { crearEntrada, escribiendo } from '../src/engine/input';

/**
 * El teclado es de dos amos.
 *
 * El juego se maneja con letras y los paneles tienen campos donde se escriben
 * letras. Quién se queda cada tecla se decide aquí, en un solo sitio, y esto lo
 * comprueba sin necesidad de un navegador: basta con un objetivo de mentira que
 * guarde los manejadores.
 */

/** Un `window` de mentira: solo sabe apuntar y disparar manejadores. */
function ventanaFalsa(): {
  ventana: Window;
  pulsar(codigo: string, destino?: unknown): void;
  soltar(codigo: string, destino?: unknown): void;
  evitados: number;
} {
  const manejadores = new Map<string, (e: unknown) => void>();
  const cuenta = { evitados: 0 };
  const ventana = {
    addEventListener: (tipo: string, fn: (e: unknown) => void) => manejadores.set(tipo, fn),
    removeEventListener: (tipo: string) => manejadores.delete(tipo),
  } as unknown as Window;
  const disparar = (tipo: string, codigo: string, destino: unknown): void => {
    manejadores.get(tipo)?.({
      code: codigo,
      key: codigo,
      altKey: false,
      repeat: false,
      target: destino,
      preventDefault: () => cuenta.evitados++,
    });
  };
  return {
    ventana,
    pulsar: (codigo, destino = null) => disparar('keydown', codigo, destino),
    soltar: (codigo, destino = null) => disparar('keyup', codigo, destino),
    get evitados() {
      return cuenta.evitados;
    },
  };
}

const CAMPO = { tagName: 'INPUT' };

describe('quién se queda la tecla', () => {
  it('un campo de texto se lleva las letras', () => {
    expect(escribiendo({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(escribiendo({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
    expect(escribiendo({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true);
    expect(escribiendo({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(
      true,
    );
  });

  it('el lienzo y el fondo no', () => {
    expect(escribiendo(null)).toBe(false);
    expect(escribiendo({ tagName: 'CANVAS' } as unknown as EventTarget)).toBe(false);
    expect(escribiendo({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
  });

  /** Escribir «madera» en un buscador no puede echar a andar al personaje. */
  it('escribiendo en un campo no se anda', () => {
    const v = ventanaFalsa();
    const entrada = crearEntrada(v.ventana);
    v.pulsar('KeyD', CAMPO);
    expect(entrada.estado().der).toBe(false);
    v.pulsar('KeyD');
    expect(entrada.estado().der).toBe(true);
  });

  /**
   * El fallo que se arregló: dos coordenadas escritas en «Ir ahí» dejaban el
   * foco dentro del campo, y a partir de ahí la M ni escribía ni abría el mapa.
   * Lo que se comprueba es que el atajo vuelve en cuanto el foco sale.
   */
  it('un atajo no se dispara escribiendo, y sí en cuanto se sale del campo', () => {
    const v = ventanaFalsa();
    const entrada = crearEntrada(v.ventana);
    let veces = 0;
    entrada.alPulsar('KeyM', () => veces++);
    v.pulsar('KeyM', CAMPO);
    expect(veces).toBe(0);
    v.pulsar('KeyM');
    expect(veces).toBe(1);
  });

  /**
   * Soltar se atiende siempre. Si no, correr hacia la derecha y hacer clic en un
   * campo dejaría al jugador corriendo para siempre: la tecla se pulsó fuera y
   * se soltó dentro.
   */
  it('soltar la tecla dentro de un campo también cuenta', () => {
    const v = ventanaFalsa();
    const entrada = crearEntrada(v.ventana);
    v.pulsar('KeyD');
    expect(entrada.estado().der).toBe(true);
    v.soltar('KeyD', CAMPO);
    expect(entrada.estado().der).toBe(false);
  });

  /** Y no se le quita al campo su comportamiento: nada de `preventDefault`. */
  it('escribiendo no se le roba el evento al navegador', () => {
    const v = ventanaFalsa();
    crearEntrada(v.ventana);
    v.pulsar('KeyA', CAMPO);
    v.soltar('KeyA', CAMPO);
    expect(v.evitados).toBe(0);
  });

  it('las teclas de un acorde tampoco se apuntan escribiendo', () => {
    const v = ventanaFalsa();
    const entrada = crearEntrada(v.ventana);
    v.pulsar('KeyP', CAMPO);
    expect(entrada.mantenida('KeyP')).toBe(false);
    v.pulsar('KeyP');
    expect(entrada.mantenida('KeyP')).toBe(true);
  });
});

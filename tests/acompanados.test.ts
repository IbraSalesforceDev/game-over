import { describe, expect, it } from 'vitest';
import { anchoVida, firmaPanel, resumen, textoVacio } from '../src/ui/acompanados';

/**
 * Lo que se lee en la esquina cuando juegas con alguien.
 *
 * Se prueban los textos y no el DOM porque los textos son lo único con reglas,
 * y porque el fallo que trajo este panel fue de los que no se ven: un invitado
 * dentro del mundo al que el anfitrión no había visto nunca, sin una sola línea
 * en pantalla que dijera si estaba conectado, esperando o roto.
 */
describe('el panel de quién está contigo', () => {
  it('dice de qué lado estás', () => {
    expect(resumen('anfitrion', 'solo', 0)).toMatch(/^Anfitrión/);
    expect(resumen('invitado', 'solo', 0)).toMatch(/^Invitado/);
  });

  it('con gente dentro, cuenta cuánta', () => {
    expect(resumen('anfitrion', 'conectado', 1)).toContain('1 contigo');
    expect(resumen('anfitrion', 'conectado', 2)).toContain('2 contigo');
  });

  /**
   * Lo que se ve pesa más que lo que diga un contador: si hay alguien delante,
   * la conexión funciona, diga lo que diga el último cambio de estado.
   */
  it('teniendo a alguien delante no dice que no hay conexión', () => {
    expect(resumen('invitado', 'fallo', 1)).toContain('1 contigo');
    expect(resumen('invitado', 'fallo', 1)).not.toMatch(/sin conexión/);
  });

  it('sin nadie, distingue esperar de estar roto', () => {
    expect(resumen('anfitrion', 'solo', 0)).toMatch(/esperando/);
    expect(resumen('anfitrion', 'conectando', 0)).toMatch(/conectando/);
    expect(resumen('anfitrion', 'fallo', 0)).toMatch(/sin conexión/);
  });

  /** Y el renglón de debajo no le cuenta lo mismo a los dos lados. */
  it('el anfitrión espera y el invitado busca', () => {
    expect(textoVacio('anfitrion', 'solo')).toMatch(/entre alguien/i);
    expect(textoVacio('invitado', 'solo')).toMatch(/anfitrión/i);
    expect(textoVacio('anfitrion', 'fallo')).toMatch(/sala/i);
    expect(textoVacio('invitado', 'fallo')).toMatch(/anfitrión/i);
  });
});

/**
 * La barra de vida del panel de la esquina.
 *
 * Es la única de las dos que se ve siempre: la de encima de la cabeza solo sirve
 * si el compañero está en pantalla, y la mayor parte del tiempo no lo está.
 */
describe('cuánta barra de vida se pinta', () => {
  it('la mitad es la mitad, y los extremos son los extremos', () => {
    expect(anchoVida(50, 100)).toBe(50);
    expect(anchoVida(100, 100)).toBe(100);
    expect(anchoVida(0, 100)).toBe(0);
  });

  /** Sin saber la vida no se pinta barra: mentiría en los dos sentidos. */
  it('sin vida máxima, no se sabe', () => {
    expect(anchoVida(0, 0)).toBe(-1);
    expect(anchoVida(50, 0)).toBe(-1);
  });

  it('una vida imposible no se sale de la barra', () => {
    expect(anchoVida(500, 100)).toBe(100);
    expect(anchoVida(-20, 100)).toBe(0);
  });
});

/**
 * El panel dice quién va armado.
 *
 * Es lo que cierra el círculo del duelo: sin esto, encenderlo y que no pase
 * nada —porque el otro lo tiene apagado— se lee como que está roto.
 *
 * Se prueba por la firma, que es lo que decide si el panel se repinta: lo que
 * no entra en ella no se ve cambiar nunca.
 */
describe('la marca de duelo en el panel', () => {
  const topo = { nombre: 'Topo', vida: 50, vidaMax: 100, duelo: false };

  it('encender el duelo cambia lo que hay que pintar', () => {
    expect(firmaPanel('anfitrion', 'conectado', [topo])).not.toBe(
      firmaPanel('anfitrion', 'conectado', [{ ...topo, duelo: true }]),
    );
  });

  it('y sin tocar nada, no', () => {
    expect(firmaPanel('anfitrion', 'conectado', [topo])).toBe(
      firmaPanel('anfitrion', 'conectado', [{ ...topo }]),
    );
  });

  it('la vida también entra, que para eso está', () => {
    expect(firmaPanel('anfitrion', 'conectado', [topo])).not.toBe(
      firmaPanel('anfitrion', 'conectado', [{ ...topo, vida: 10 }]),
    );
  });
});

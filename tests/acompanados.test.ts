import { describe, expect, it } from 'vitest';
import { resumen, textoVacio } from '../src/ui/acompanados';

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

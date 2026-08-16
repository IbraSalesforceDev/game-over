import { describe, expect, it } from 'vitest';
import { CONTRASENA, contrasenaCorrecta } from '../src/ui/debugmenu';

/**
 * La puerta del menú de trucos.
 *
 * Se comprueba lo único que tiene lógica —la comparación— y no la interfaz. Y
 * conviene tenerlo escrito: esto es un pestillo, no una cerradura. El juego se
 * descarga entero en el navegador, así que la palabra viaja en el bundle y
 * quien sepa mirarlo la encontrará. Sirve para que no se abra por accidente ni
 * por curiosidad ajena, no para resistir a nadie decidido.
 */

describe('contraseña del panel de depuración', () => {
  it('acepta la palabra exacta', () => {
    expect(contrasenaCorrecta(CONTRASENA)).toBe(true);
  });

  it('perdona mayúsculas y espacios de más', () => {
    expect(contrasenaCorrecta('  IbraSaysOpenSesame ')).toBe(true);
  });

  it('rechaza todo lo demás', () => {
    for (const mala of ['', ' ', 'ibrasays', 'ibrasaysopensesamex', 'opensesame']) {
      expect(contrasenaCorrecta(mala)).toBe(false);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  comoHora,
  contrasenaCorrecta,
  CONTRASENA,
  crearTrucos,
  encaja,
  HORAS,
} from '../src/ui/debugmenu';

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

describe('el buscador de las listas', () => {
  it('sin nada escrito, todo encaja', () => {
    expect(encaja('batería improvisada', '')).toBe(true);
  });

  it('busca por trozo, sin importar mayúsculas', () => {
    expect(encaja('Lingote de Cobalto', 'cobal')).toBe(true);
    expect(encaja('lingote de cobalto', 'ORO')).toBe(false);
  });

  it('y sin importar los acentos', () => {
    // Nadie escribe la tilde cuando lo que quiere es encontrar algo deprisa.
    expect(encaja('batería improvisada', 'bateria')).toBe(true);
    expect(encaja('pólvora', 'polvora')).toBe(true);
    expect(encaja('cañón', 'canon')).toBe(true);
  });

  it('busca también por el final del nombre', () => {
    expect(encaja('casco de infernita', 'infernita')).toBe(true);
  });
});

describe('la hora del panel', () => {
  it('se escribe con dos cifras y los dos puntos', () => {
    expect(comoHora(0)).toBe('00:00');
    expect(comoHora(9 * 60 + 5)).toBe('09:05');
    expect(comoHora(23 * 60 + 59)).toBe('23:59');
  });

  it('da la vuelta al día en vez de salirse', () => {
    expect(comoHora(1440)).toBe('00:00');
    expect(comoHora(-60)).toBe('23:00');
  });

  it('los cuatro saltos caen dentro del día y no se repiten', () => {
    const minutos = HORAS.map((h) => h.minutos);
    expect(new Set(minutos).size).toBe(HORAS.length);
    for (const m of minutos) {
      expect(m).toBeGreaterThanOrEqual(0);
      expect(m).toBeLessThan(1440);
    }
  });
});

describe('los trucos nacen todos apagados', () => {
  it('ninguno cambia nada hasta que se toca', () => {
    // Un truco encendido de serie es un juego distinto para todo el mundo: los
    // multiplicadores valen uno y los interruptores están en no.
    const t = crearTrucos();
    expect(t.velocidadMinado).toBe(1);
    expect(t.radioMinado).toBe(1);
    expect(t.danoMultiplicador).toBe(1);
    for (const [nombre, valor] of Object.entries(t)) {
      if (typeof valor === 'boolean') expect(valor, nombre).toBe(false);
    }
  });
});

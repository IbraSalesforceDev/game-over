import { describe, expect, it } from 'vitest';
import {
  comoHora,
  contrasenaCorrecta,
  CONTRASENA,
  coordenadaEscrita,
  crearTrucos,
  destinoDeViaje,
  encaja,
  HORAS,
  MARGEN_VIAJE,
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

describe('el viaje del panel', () => {
  it('un campo vacío no es un cero', () => {
    // El fallo que arregla esto: `Number('')` vale 0, así que pulsar "Ir ahí"
    // sin escribir nada teleportaba a la esquina 0,0 del mundo —cielo sin
    // suelo— en vez de no hacer nada.
    for (const nada of ['', '   ', '\t']) expect(coordenadaEscrita(nada)).toBe(null);
  });

  it('lo que no es un número tampoco', () => {
    for (const mal of ['hola', '--3', 'e', 'NaN', '1,5,7']) {
      expect(coordenadaEscrita(mal), mal).toBe(null);
    }
  });

  it('un número escrito se lee, con espacios y todo', () => {
    expect(coordenadaEscrita('548')).toBe(548);
    expect(coordenadaEscrita('  447 ')).toBe(447);
    expect(coordenadaEscrita('-12')).toBe(-12);
    // Medio tile no existe: la casilla es entera.
    expect(coordenadaEscrita('12.6')).toBe(13);
  });

  it('el cero escrito a mano sí vale: es una casilla como otra', () => {
    expect(coordenadaEscrita('0')).toBe(0);
  });

  it('el destino se recorta al mundo en vez de dejarte fuera', () => {
    expect(destinoDeViaje(9999, 9999, 1400, 675)).toEqual({ tx: 1398, ty: 673 });
    expect(destinoDeViaje(-50, -50, 1400, 675)).toEqual({ tx: 1, ty: MARGEN_VIAJE });
  });

  it('y un destino que ya está dentro no se toca', () => {
    expect(destinoDeViaje(548, 447, 1400, 675)).toEqual({ tx: 548, ty: 447 });
  });

  it('la fila 0 se baja al margen: ahí arriba no hay suelo ninguno', () => {
    expect(destinoDeViaje(0, 0, 1400, 675)).toEqual({ tx: 1, ty: MARGEN_VIAJE });
  });

  it('en un mundo diminuto no se sale por el otro lado', () => {
    const d = destinoDeViaje(500, 500, 2, 2);
    expect(d.tx).toBeGreaterThanOrEqual(1);
    expect(d.ty).toBeGreaterThanOrEqual(MARGEN_VIAJE);
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
